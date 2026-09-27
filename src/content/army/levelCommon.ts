/**
 * Siegeholm — shared build context, the region plan (key coordinates), and the region's own
 * surface materials that the shared kit does not provide: snow (drifts, caps, ground), a
 * vertex-coloured terrain for the snowy rock slopes, army heraldry banners (castle and sword),
 * and a camera-wrapped snowfall.
 *
 * World axes: X east, Y up, Z south (north is −Z). yaw = atan2(dx, dz), 0 faces +Z.
 * The player arrives from the south on the Siege Road and climbs north through the Outer Gate,
 * the Lower Bailey, the Barbican, the Ram-Knight's gate passage, the Upper Ward and the Keep, to
 * the Bell Rampart between the two bell towers where the Army's Great Bell hangs.
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import { Kit, type KitShared, xformMatrix, type Xform } from '../../world/kit';
import { normalizeGeometry, bannerGeo } from '../../world/kit/geom';
import { heraldryTexture } from '../../render/heraldry';
import { Rng, hash2 } from '../../core/rng';

// ------------------------------------------------------------------------------------ context

export interface AreaCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
  /** Snow drifts / caps (one merged mesh for the level). */
  snow: GeoBatch;
  /** Army banners: victorious (crisp) and burned (tattered). */
  bannersVictory: GeoBatch;
  bannersBurnt: GeoBatch;
  /** Terrain patches (vertex-coloured). */
  terrain: GeoBatch;
}

/**
 * Static geometry is merged per material into a few large kits ("tiers") rather than one kit per
 * area: fewer, larger meshes keep the draw calls of the long northward views within budget.
 */
const TIER: Record<string, string> = { road: 'south', bailey: 'south', barbican: 'mid', passage: 'mid', ward: 'mid', keep: 'north', backdrop: 'backdrop', farCamp: 'backdrop' };
export function newKit(ctx: AreaCtx, name: string, seed: number): Kit {
  const tier = TIER[name] ?? name;
  const have = ctx.kits.find((k) => k.name === tier);
  if (have) return have;
  const k = new Kit(tier, ctx.shared, seed);
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);
export const YAW_N = Math.PI;
export const YAW_S = 0;
export const YAW_E = Math.PI / 2;
export const YAW_W = -Math.PI / 2;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Key coordinates (the plan every area reads). */
export const PLAN = {
  road: { x0: -9, x1: 9, z0: -19.5, z1: 70, y: 0 },
  roadBell: { x: -11.8, z: 43 },
  curtain: { z: -21, t: 3, top: 8, x0: -50, x1: 50 },           // outer wall (walk at y=8)
  gatehouse: { x0: -7.5, x1: 7.5, z0: -25, z1: -17, top: 15, passW: 6 },
  breach: { x0: 17, x1: 27 },
  siegeTower: { x0: -21, x1: -14.5, z0: -19, z1: -9, top: 8 },
  bailey: { x0: -42, x1: 42, z0: -58, z1: -22.5, y: 0 },
  baileyStair: { x: -21, w: 4.4, zLo: -41.5, zHi: -58 },
  casemate: { x0: -47.5, x1: -43.5, z0: -80, z1: -19.5, y: 0 },
  barbican: { x0: -26, x1: 25, z0: -86, z1: -58, y: 6 },
  magazineYard: { x0: 25, x1: 45, z0: -92, z1: -58 },
  magazine: { x0: 34.5, x1: 44.5, z0: -90.5, z1: -77.5 },
  eastLane: { x0: 28, x1: 34, z0: -126, z1: -92 },
  passage: { x0: -5.5, x1: 5.5, z0: -126, z1: -86, y: 6, vault: 9 },
  ward: { x0: -42, x1: 42, z0: -172, z1: -126, y: 6 },
  hall: { x0: -40, x1: -12, z0: -166, z1: -130 },
  wardStair: { w: 6, zLo: -155, zHi: -172 },
  keep: { x0: -26, x1: 26, z0: -206, z1: -172, y: 14 },
  keepStair: { zLo: -191, zHi: -209, w: 5 },
  arena: { c: new THREE.Vector3(0, 24, -228), r: 15 },
  towers: { x: 21.2, z: -231, half: 5.5, top: 100 },
  bell: { x: 0, z: -231, top: 90, h: 20 },
};

// ------------------------------------------------------------------------------------ batches

/** Collects transformed geometries (non-indexed, position/normal/uv[/color]) and merges them once. */
export class GeoBatch {
  private parts: THREE.BufferGeometry[] = [];
  constructor(readonly name: string, readonly colors = false) {}
  add(g: THREE.BufferGeometry, t?: Xform | THREE.Matrix4, worldUV = true) {
    const m = t ? (t instanceof THREE.Matrix4 ? t : xformMatrix(t)) : null;
    const hasColor = !!g.attributes.color;
    const colorAttr = hasColor ? (g.index ? g.toNonIndexed() : g).attributes.color : null;
    const n = normalizeGeometry(g);
    if (m) n.applyMatrix4(m);
    if (worldUV) boxUV(n, 0.35);
    if (this.colors) {
      if (colorAttr && colorAttr.count === n.attributes.position.count) n.setAttribute('color', colorAttr.clone());
      else {
        const c = new Float32Array(n.attributes.position.count * 3).fill(1);
        n.setAttribute('color', new THREE.BufferAttribute(c, 3));
      }
    }
    this.parts.push(n);
  }
  get count() { return this.parts.length; }
  build(mat: THREE.Material, parent: THREE.Object3D, cast = false, receive = true): THREE.Mesh | null {
    if (!this.parts.length) return null;
    const g = mergeParts(this.parts, this.colors);
    this.parts = [];
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'army:' + this.name;
    mesh.castShadow = cast; mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
    return mesh;
  }
}

function mergeParts(list: THREE.BufferGeometry[], colors: boolean): THREE.BufferGeometry {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = colors ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    if (col) col.set(g.attributes.color.array as Float32Array, o * 3);
    o += c;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/** World box-projected UVs by dominant normal axis. */
function boxUV(g: THREE.BufferGeometry, s: number) {
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) * s, p.getZ(i) * s);
    else if (ax >= az) uv.setXY(i, p.getZ(i) * s, p.getY(i) * s);
    else uv.setXY(i, p.getX(i) * s, p.getY(i) * s);
  }
  uv.needsUpdate = true;
}

// ------------------------------------------------------------------------------------ materials

let SNOW_TEX: THREE.DataTexture | null = null;
/** Soft grey-white noise (compacted snow, wind ripples, faint dirt) — tiling, sRGB. */
function snowTexture(): THREE.DataTexture {
  if (SNOW_TEX) return SNOW_TEX;
  const S = 128;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0, a = 0.5, f = 1 / 16;
    for (let o = 0; o < 4; o++) { v += a * smoothNoise(x * f, y * f, S * f, 17 + o); a *= 0.5; f *= 2; }
    const ripple = Math.sin((x + v * 18) * 0.35) * 0.03;
    const k = 0.86 + (v - 0.5) * 0.22 + ripple;
    const i = (y * S + x) * 4;
    data[i] = Math.round(255 * Math.min(1, k * 0.97));
    data[i + 1] = Math.round(255 * Math.min(1, k * 0.985));
    data[i + 2] = Math.round(255 * Math.min(1, k));
    data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  SNOW_TEX = t;
  return t;
}
function smoothNoise(x: number, y: number, period: number, seed: number) {
  const P = Math.max(1, Math.round(period));
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a: number, b: number) => hash2(((a % P) + P) % P, ((b % P) + P) % P, seed);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

let SNOW_MAT: THREE.MeshStandardMaterial | null = null;
export function snowMaterial(): THREE.MeshStandardMaterial {
  if (!SNOW_MAT) {
    SNOW_MAT = new THREE.MeshStandardMaterial({ color: 0xd4dbe4, map: snowTexture(), roughness: 0.82, metalness: 0, envMapIntensity: 0.6 });
    SNOW_MAT.name = 'army:snow';
  }
  return SNOW_MAT;
}
let TERRAIN_MAT: THREE.MeshStandardMaterial | null = null;
export function terrainMaterial(): THREE.MeshStandardMaterial {
  if (!TERRAIN_MAT) {
    TERRAIN_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowTexture(), vertexColors: true, roughness: 0.88, metalness: 0, envMapIntensity: 0.5 });
    TERRAIN_MAT.name = 'army:terrain';
  }
  return TERRAIN_MAT;
}

const BANNER_MATS: Record<string, THREE.MeshStandardMaterial> = {};
/** Army heraldry (castle with a sword) on red wool: 'victory' = gilded and whole, 'burnt' = scorched and faded. */
export function bannerMaterial(kind: 'victory' | 'burnt'): THREE.MeshStandardMaterial {
  let m = BANNER_MATS[kind];
  if (m) return m;
  let map: THREE.Texture | null = null;
  try {
    map = kind === 'victory'
      ? heraldryTexture('army', { field: '#6e1d18', charge: '#d9b870', wear: 0.25, aspect: 2.4, seed: 5, size: 256, fill: 0.5 })
      : heraldryTexture('army', { field: '#2e1e1a', charge: '#8a7a62', wear: 0.95, aspect: 2.4, seed: 9, size: 256, fill: 0.5 });
  } catch { map = null; } // headless tests: no canvas
  m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : kind === 'victory' ? 0x6e1d18 : 0x2e1e1a, map, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  m.name = 'army:banner:' + kind;
  BANNER_MATS[kind] = m;
  return m;
}

/** A hanging army banner (pole + cloth) into the kit and banner batch; front faces local +Z. */
export function armyBanner(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, yaw: number, w = 1.4, h = 3.6, burnt = false) {
  k.push(x, y, z, yaw);
  k.box('timber_dark', 0, 0, 0.25, w + 0.4, 0.1, 0.1, { cast: false });
  for (const s of [-1, 1]) k.box('iron', s * (w / 2 + 0.1), -0.05, 0.12, 0.05, 0.05, 0.28, { cast: false });
  const g = bannerGeo(w, h, 6, true);
  if (burnt) {
    // ragged, scorched hem: pull the lower vertices up irregularly
    const p = g.attributes.position as THREE.BufferAttribute;
    const rng = new Rng(Math.round(x * 13 + z * 7));
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -h * 0.6) p.setY(i, p.getY(i) + rng.range(0, h * 0.35));
  }
  const m = k.m.clone().multiply(xformMatrix({ y: -0.04, z: 0.27, rx: 0.03 }));
  (burnt ? ctx.bannersBurnt : ctx.bannersVictory).add(g, m, false);
  k.pop();
}

/** A free-standing standard (pole + crossbar + banner). */
export function armyStandard(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, yaw: number, h = 6, w = 1.2, bh = 2.6, burnt = false) {
  k.push(x, y, z, yaw);
  k.box('timber_dark', 0, h / 2, 0, 0.14, h, 0.14);
  k.box('timber_dark', 0, h - 0.3, 0, w + 0.2, 0.08, 0.08, { cast: false });
  k.box('gold_trim', 0, h + 0.15, 0, 0.1, 0.3, 0.1, { cast: false, ry: 0.78 });
  const g = bannerGeo(w, bh, 6, true);
  if (burnt) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const rng = new Rng(Math.round(x * 11 + z * 5));
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -bh * 0.5) p.setY(i, p.getY(i) + rng.range(0, bh * 0.3));
  }
  (burnt ? ctx.bannersBurnt : ctx.bannersVictory).add(g, k.m.clone().multiply(xformMatrix({ y: h - 0.32, z: 0.06 })), false);
  k.pop();
}

// ------------------------------------------------------------------------------------ snow helpers

/** Snow cap on a horizontal surface (top at y), slightly rounded, overhanging `over`. */
export function snowCap(ctx: AreaCtx, x0: number, z0: number, x1: number, z1: number, y: number, thick = 0.14, over = 0.05) {
  const w = Math.abs(x1 - x0) + over * 2, d = Math.abs(z1 - z0) + over * 2;
  const g = new THREE.BoxGeometry(w, thick, d, Math.max(1, Math.round(w / 1.5)), 1, Math.max(1, Math.round(d / 1.5)));
  // rounded shoulders: pull the top edge vertices in and down a little
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    if (py > 0) {
      const ex = Math.abs(px) > w / 2 - 0.01, ez = Math.abs(pz) > d / 2 - 0.01;
      if (ex || ez) p.setY(i, py - thick * 0.45);
      else p.setY(i, py + Math.sin(px * 1.7 + pz * 0.9) * thick * 0.18);
    }
  }
  g.computeVertexNormals();
  ctx.snow.add(g, { x: (x0 + x1) / 2, y: y + thick / 2 - 0.02, z: (z0 + z1) / 2 });
}

/** Rotated snow cap (local frame via kit matrix). */
export function snowCapK(ctx: AreaCtx, k: Kit, cx: number, y: number, cz: number, w: number, d: number, thick = 0.14) {
  const g = new THREE.BoxGeometry(w, thick, d, Math.max(1, Math.round(w / 1.5)), 1, Math.max(1, Math.round(d / 1.5)));
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && (Math.abs(p.getX(i)) > w / 2 - 0.01 || Math.abs(p.getZ(i)) > d / 2 - 0.01)) p.setY(i, p.getY(i) - thick * 0.45);
  g.computeVertexNormals();
  ctx.snow.add(g, k.m.clone().multiply(xformMatrix({ x: cx, y: y + thick / 2 - 0.02, z: cz })));
}

/** A soft snow drift mound (squashed jittered sphere) at (x, y, z). */
export function snowDrift(ctx: AreaCtx, x: number, y: number, z: number, rx: number, rz: number, h: number, seed: number, ry = 0) {
  const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const rng = new Rng(seed);
  const a = rng.range(0, 6), b = rng.range(0, 6);
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const k = 1 + 0.12 * Math.sin(px * 3 + a) * Math.cos(pz * 2.6 + b);
    p.setXYZ(i, px * rx * k, py * h * k, pz * rz * k);
  }
  g.computeVertexNormals();
  ctx.snow.add(g, { x, y: y - 0.02, z, ry });
}

/** Scatter of small drifts along a line (wall bases, road shoulders). */
export function driftLine(ctx: AreaCtx, x0: number, z0: number, x1: number, z1: number, y: number, n: number, seed: number, size = 1) {
  const rng = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const t = (i + rng.range(0.1, 0.9)) / n;
    snowDrift(ctx, x0 + (x1 - x0) * t + rng.range(-0.3, 0.3), y, z0 + (z1 - z0) * t + rng.range(-0.3, 0.3), rng.range(0.8, 2.0) * size, rng.range(0.6, 1.4) * size, rng.range(0.18, 0.45) * size, seed * 31 + i, rng.range(0, 3));
  }
}

// ------------------------------------------------------------------------------------ terrain

const SNOW_C = new THREE.Color('#d0d7e0'), ROCK_C = new THREE.Color('#34332f'), MUD_C = new THREE.Color('#4a4038');

/**
 * Displaced terrain patch over [x0,x1]×[z0,z1] with cell size `cell`; `hf(x,z)` gives the height.
 * Colour: snow on gentle slopes, dark rock on steep faces, mud where `mud(x,z)` > 0.
 */
export function terrainPatch(ctx: AreaCtx, x0: number, z0: number, x1: number, z1: number, cell: number, hf: (x: number, z: number) => number, mud?: (x: number, z: number) => number) {
  const nx = Math.max(1, Math.round((x1 - x0) / cell)), nz = Math.max(1, Math.round((z1 - z0) / cell));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, hf(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const steep = THREE.MathUtils.smoothstep(n.getY(i), 0.7, 0.9);
    const noise = hash2(Math.floor(x * 1.3), Math.floor(z * 1.3), 3) * 0.12;
    c.copy(ROCK_C).lerp(SNOW_C, Math.min(1, steep + noise * (steep > 0.3 ? 1 : 0)));
    if (steep < 0.95) {
      // cliff faces: strata bands and snow caught in gullies and ledges, so slopes never read flat
      const y = p.getY(i), rockK = 1 - steep;
      const band = 0.8 + 0.34 * (0.5 + 0.5 * Math.sin(y * 0.62 + fbm2(x * 0.045, z * 0.045, 7) * 7));
      const streak = THREE.MathUtils.smoothstep(fbm2(x * 0.11 + y * 0.05, z * 0.11 - y * 0.07, 11), 0.5, 0.66);
      c.multiplyScalar(1 + (band - 1) * rockK);
      c.lerp(SNOW_C, streak * 0.75 * rockK);
    }
    const m = mud ? Math.max(0, Math.min(1, mud(x, z))) : 0;
    if (m > 0) c.lerp(MUD_C, m * 0.85);
    c.multiplyScalar(0.94 + noise * 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  ctx.terrain.add(g, undefined, true);
}

/** Smooth value noise in world metres (for terrain height fields). */
export function fbm2(x: number, z: number, seed: number, oct = 3) {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < oct; o++) { v += a * vnoise(x * f, z * f, seed + o * 17); a *= 0.5; f *= 2.03; }
  return v;
}
function vnoise(x: number, z: number, seed: number) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const h = (a: number, b: number) => hash2(a, b, seed);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}

// ------------------------------------------------------------------------------------ snowfall

const SNOW_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform vec3 uWind;
  uniform float uSize;
  attribute vec4 aSeed;
  varying float vAlpha;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position + uWind * uTime * aSeed.w;
    p.x += sin(uTime * (0.6 + aSeed.x) + aSeed.y * 6.28) * 0.6;
    p.z += cos(uTime * (0.5 + aSeed.z) + aSeed.x * 6.28) * 0.5;
    p = mod(p - uCam + uBox * 0.5, uBox) + uCam - uBox * 0.5;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float d = -mvPosition.z;
    gl_PointSize = uSize * (0.6 + aSeed.y) * 300.0 / max(d, 0.5);
    vAlpha = smoothstep(0.5, 2.5, d) * (1.0 - smoothstep(uBox.x * 0.35, uBox.x * 0.5, d));
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const SNOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.1, length(c)) * vAlpha * 0.85;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Falling snow in a box that wraps around the camera (world-space parallax, one draw call). */
export class SnowFall {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor(count: number, box = new THREE.Vector3(44, 26, 44), seed = 5) {
    const rng = new Rng(seed);
    const pos = new Float32Array(count * 3), sd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng.range(0, box.x); pos[i * 3 + 1] = rng.range(0, box.y); pos[i * 3 + 2] = rng.range(0, box.z);
      sd[i * 4] = rng.next(); sd[i * 4 + 1] = rng.next(); sd[i * 4 + 2] = rng.next(); sd[i * 4 + 3] = rng.range(0.7, 1.3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: box.clone() },
        uWind: { value: new THREE.Vector3(1.1, -1.35, 0.5) }, uSize: { value: 0.05 }, uColor: { value: new THREE.Color(0xe8eef6) },
      }]),
      vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false, fog: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.name = 'army:snowfall';
    this.points.renderOrder = 5;
  }
  update(time: number, camera: THREE.Camera) {
    this.mat.uniforms.uTime.value = time;
    (this.mat.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
  }
}

// ------------------------------------------------------------------------------------ area output

export interface TollPost { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }
/** What each area builder contributes to the RegionLayout. */
export interface AreaOut {
  enemies: import('../../world/levelTypes').EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, import('./levelPieces').Piece>;
  triggers: Record<string, THREE.Box3>;
  tolls: TollPost[];
}
export const emptyOut = (): AreaOut => ({ enemies: [], anchors: {}, pieces: {}, triggers: {}, tolls: [] });
export const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)));
