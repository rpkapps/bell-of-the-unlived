/**
 * The Pilgrim Stair — shared build context, the region's key coordinates ("the plan"), and small
 * builders used by several areas: snow (a custom merged material the kit palette doesn't have),
 * candle fields, gothic windows, pinnacles, statues and name-plaque walls.
 *
 * World axes: X east, Y up, Z south (north is -Z). The Cathedral stands to the NORTH of the entry:
 * from the Pilgrims' Gate (z ≈ +60) Candle Street runs north to the foot of the Pilgrim Stair
 * (z = 14), which climbs 12 m to the parvis (z -22 … -40) before the west front. The nave runs north
 * from the front (z = -42) to the choir screen (z = -96); the choir (keeper's arena) lies beyond.
 * The Name-Ossuary is dug into the hill east of the Stair (y = 4); its Stair of Graves climbs to the
 * Processional Cloister (y = 12) east of the nave.
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import { Kit, type KitShared, candles, cyl, cone, extrudeXY, archPoints, sphere, box } from '../../world/kit';
import type { MaterialId } from '../../render/materialIds';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface AreaCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
  snow: SnowBatch;
}

export function newKit(ctx: AreaCtx, name: string, seed: number, originY = 0): Kit {
  const k = new Kit(name, ctx.shared, seed);
  k.originY = originY;
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);
export const YAW_N = Math.PI, YAW_S = 0, YAW_E = Math.PI / 2, YAW_W = -Math.PI / 2;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)));

/** Key coordinates. */
export const PLAN = {
  gate: { x0: -9, x1: 9, z0: 56, z1: 72, shrineZ: 60 },
  street: { x0: -6, x1: 6, z0: 14, z1: 56 },
  cross: { z0: 30, z1: 38, zc: 34 },
  westLane: { x0: -22, x1: -6 },
  yard: { x0: -36, x1: -22, z0: 22, z1: 46 },
  eastLane: { x0: 6, x1: 22 },
  eastCourt: { x0: 22, x1: 30, z0: 28, z1: 40 },
  plaza: { x0: -16, x1: 16, z0: 14, z1: 24 },
  stair: { x0: -7, x1: 7, flights: [[14, 5, 0, 4], [0, -9, 4, 8], [-13, -22, 8, 12]] as [number, number, number, number][], landings: [[5, 0, 4], [-9, -13, 8]] as [number, number, number][] },
  parvis: { x0: -20, x1: 20, z0: -40, z1: -22, y: 12 },
  chapel: { x0: -32, x1: -20, z0: -36, z1: -24, y: 12, doorZ0: -31.4, doorZ1: -28.6 },
  front: { z0: -42, z1: -40, doorX: 3, doorH: 9.2 },
  towers: { half: 5, zc: -41, xc: 13, top: 58 },
  bell: { x: 0, y: 47, z: -37.2, h: 9.5 },
  // the Name-Ossuary (y = 4)
  passage: { x0: 7, x1: 20, z0: 0.8, z1: 4.4, y: 4 },
  grate: { x0: 12.2, x1: 15.8, zTop: 4.4, zBottom: 14.6 },
  gallery: { x0: 20, x1: 27, z0: -44, z1: 6, y: 4 },
  tabletRoom: { x0: 27, x1: 35, z0: -22, z1: -14 },
  bierRoom: { x0: 27, x1: 34, z0: -40, z1: -32 },
  bellAlcove: { x0: 15.5, x1: 20, z0: -30, z1: -24 },
  soamesAlcove: { x0: 15.5, x1: 20, z0: -12, z1: -6 },
  graveStair: { x0: 20.5, x1: 26.5, zLow: -44, zHigh: -62, yLow: 4, yHigh: 12 },
  ante: { x0: 20, x1: 27, z0: -66, z1: -62, y: 12 },
  // the Processional Cloister (y = 12) — the Procession's arena
  cloister: { x0: 18, x1: 46, z0: -94, z1: -66, walk: 4, c: new THREE.Vector3(32, 12, -80), r: 13 },
  cloisterDoor: { z0: -81.6, z1: -78.4 },
  // the nave and choir (y = 12)
  nave: { x0: -14.5, x1: 14.5, z0: -96, z1: -42, y: 12, colX: 8, cols: [-48, -55, -62, -69, -76, -83, -90] },
  triStair: { x: 12.2, w: 2.2, zLow: -50, zHigh: -68, yHigh: 18 },
  triforium: { x0: 9.6, x1: 14.5, z0: -94, z1: -68, y: 18 },
  screenZ: -96,
  choir: { x0: -14.5, x1: 14.5, z0: -128, z1: -96.5, c: new THREE.Vector3(0, 12, -111), r: 13.5, apseR: 8 },
};

// ------------------------------------------------------------------------------------ snow

/** Collects snow geometry (world space) and merges it into one mesh with a cold, rough white. */
export class SnowBatch {
  private parts: THREE.BufferGeometry[] = [];
  private static mat: THREE.MeshStandardMaterial | null = null;
  static material() {
    return (SnowBatch.mat ??= new THREE.MeshStandardMaterial({ color: 0xd2d9e2, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 }));
  }
  /** Add geometry in the kit's current local frame (optional extra local transform). */
  add(kit: Kit, g: THREE.BufferGeometry, t?: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: [number, number, number] }) {
    const m = new THREE.Matrix4();
    if (t) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0, 'YXZ'));
      m.compose(new THREE.Vector3(t.x ?? 0, t.y ?? 0, t.z ?? 0), q, new THREE.Vector3(...(t.s ?? [1, 1, 1])));
    }
    const geo = (g.index ? g.toNonIndexed() : g).applyMatrix4(kit.m.clone().multiply(m));
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    this.parts.push(geo);
  }
  /** A drift: a soft low slab (bevelled box) — local frame of the kit. */
  drift(kit: Kit, x: number, y: number, z: number, w: number, d: number, h = 0.06, yaw = 0) {
    // a soft, low mound: a squashed hemisphere-ish lathe, flattened into an ellipse
    this.add(kit, SnowBatch.mound(), { x, y: y + 0.005, z, ry: yaw, s: [w / 2, h, d / 2] });
  }
  private static moundGeo: THREE.BufferGeometry | null = null;
  static mound() {
    if (!SnowBatch.moundGeo) {
      const pts = [new THREE.Vector2(0.0001, 1), new THREE.Vector2(0.35, 0.94), new THREE.Vector2(0.62, 0.72), new THREE.Vector2(0.84, 0.4), new THREE.Vector2(1, 0)];
      SnowBatch.moundGeo = new THREE.LatheGeometry(pts, 9);
    }
    return SnowBatch.moundGeo.clone();
  }
  /** A thin cap on top of a ledge/parapet/cornice between local corners. */
  cap(kit: Kit, x0: number, y: number, z0: number, x1: number, z1: number, h = 0.07) {
    this.add(kit, new THREE.BoxGeometry(Math.abs(x1 - x0), h, Math.abs(z1 - z0)), { x: (x0 + x1) / 2, y: y + h / 2, z: (z0 + z1) / 2 });
  }
  build(parent: THREE.Object3D, name: string): THREE.Mesh | null {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    if (!g) return null;
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, SnowBatch.material());
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }
}

/** Snow caps on a gable roof built with house()/gableRoof() conventions (local frame = the roof's). */
export function snowRoof(kit: Kit, snow: SnowBatch, cx: number, y: number, cz: number, yaw: number, w: number, d: number, pitch: number, cover = 0.82) {
  const oh = 0.45, eoh = 0.35, th = 0.18, ts = 0.1;
  const rise = (w / 2) * Math.tan(pitch);
  const L = (w / 2 + oh) / Math.cos(pitch);
  const D = d + eoh * 2;
  kit.push(cx, y, cz, yaw);
  for (const s of [-1, 1]) {
    const ex = s * (w / 2 + oh), ey = -oh * Math.tan(pitch);
    const mx = ex / 2, my = (ey + rise) / 2;
    const nx = s * Math.sin(pitch), ny = Math.cos(pitch);
    const tx = -s * Math.cos(pitch), ty = Math.sin(pitch); // toward the ridge
    const Ls = L * cover, shift = (L - Ls) / 2;
    snow.add(kit, new THREE.BoxGeometry(Ls, ts, D - 0.1), { x: mx + nx * (th + ts / 2 - 0.02) + tx * shift, y: my + ny * (th + ts / 2 - 0.02) + ty * shift, z: 0, rz: -s * pitch });
  }
  snow.add(kit, new THREE.BoxGeometry(0.5, 0.14, D - 0.1), { x: 0, y: rise + 0.14, z: 0 });
  kit.pop();
}

// ------------------------------------------------------------------------------------ gothic details

/** Pointed lancet window recess (dark glass, trim surround) on a wall face; local front +Z. */
export function lancet(kit: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number, glass: MaterialId = 'window_warm', mullions = 1) {
  kit.push(x, y, z, yaw);
  const spring = h - w * 0.8;
  const outline: [number, number][] = [[-w / 2, 0], [w / 2, 0], [w / 2, spring], ...archPoints(-w / 2, w / 2, spring, 'pointed', w * 0.8).reverse(), [-w / 2, spring]];
  kit.add(glass, extrudeXY(outline, 0.05), { z: 0.01 }, { cast: false });
  const trim: [number, number][] = [[-w / 2 - 0.18, -0.12], [w / 2 + 0.18, -0.12], [w / 2 + 0.18, spring], ...archPoints(-w / 2 - 0.18, w / 2 + 0.18, spring, 'pointed', (w + 0.36) * 0.8).reverse(), [-w / 2 - 0.18, spring]];
  const hole: [number, number][] = outline.slice().reverse();
  kit.add('stone_trim', extrudeXY(trim, 0.12, [hole]), { z: 0.0 }, { cast: false });
  for (let i = 1; i <= mullions; i++) {
    const mx = -w / 2 + (w * i) / (mullions + 1);
    kit.box('stone_trim', mx, spring / 2, 0.06, 0.09, spring, 0.08, { cast: false });
  }
  kit.pop();
}

/** Gothic pinnacle (square shaft + spirelet + finial). */
export function pinnacle(kit: Kit, x: number, y: number, z: number, s = 1, mat: MaterialId = 'stone_wall') {
  kit.box(mat, x, y + 1.2 * s, z, 0.7 * s, 2.4 * s, 0.7 * s);
  kit.add('stone_trim', cone(0.5 * s, 2.2 * s, 4), { x, y: y + 2.4 * s, z, ry: Math.PI / 4 }, { cast: true });
  kit.add('stone_trim', sphere(0.12 * s, 6, 4), { x, y: y + 4.6 * s, z }, { cast: false });
}

/** A robed stone saint on a corbel (facade galleries, the choir). Local front +Z. */
export function statue(kit: Kit, x: number, y: number, z: number, yaw: number, s = 1, mat: MaterialId = 'stone_trim') {
  kit.push(x, y, z, yaw);
  kit.box('stone_trim', 0, -0.15 * s, 0.1 * s, 0.8 * s, 0.3 * s, 0.7 * s, { cast: false });
  kit.add(mat, cyl(0.2 * s, 0.34 * s, 1.5 * s, 8), {});
  kit.add(mat, cyl(0.17 * s, 0.2 * s, 0.35 * s, 8), { y: 1.5 * s });
  kit.add(mat, sphere(0.14 * s, 8, 6), { y: 1.98 * s });
  kit.add(mat, cone(0.2 * s, 0.35 * s, 8), { y: 1.9 * s, z: -0.03 * s }, { cast: false });
  kit.box(mat, 0.12 * s, 1.25 * s, 0.18 * s, 0.1 * s, 0.4 * s, 0.1 * s, { rx: -0.6, cast: false });
  kit.pop();
}

/**
 * A wall of name-plaques on a face (local front +Z): rows of small stone tablets, many chiselled
 * out (rough dark scars), some recut over the scar in fresh pale stone. Returns nothing; visual only.
 */
export function plaqueWall(kit: Kit, x: number, y: number, z: number, yaw: number, cols: number, rows: number, pw = 0.5, ph = 0.32) {
  kit.push(x, y, z, yaw);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = (c - (cols - 1) / 2) * (pw + 0.08), py = r * (ph + 0.08);
    const roll = kit.rng.next();
    const mat: MaterialId = roll < 0.35 ? 'stone_dark' : roll < 0.55 ? 'stone_fresh' : 'stone_trim';
    kit.box(mat, px, py, 0.03, pw, ph, 0.06, { cast: false });
    if (roll < 0.35) kit.box('rubble', px, py, 0.065, pw * 0.8, ph * 0.5, 0.01, { cast: false });
    else for (let l = 0; l < 2; l++) kit.box('stone_dark', px, py + 0.06 - l * 0.1, 0.064, pw * (0.7 - l * 0.2), 0.03, 0.006, { cast: false });
  }
  kit.pop();
}

/** A field of candles on stepped wax-crusted ledges (instanced candles + flames). */
export function candleField(kit: Kit, x: number, y: number, z: number, yaw: number, w: number, d: number, n: number) {
  kit.push(x, y, z, yaw);
  kit.box('stone_dark', 0, 0.1, 0, w, 0.2, d, { cast: false });
  kit.box('wax', 0, 0.205, 0, w * 0.96, 0.01, d * 0.96, { cast: false });
  kit.box('stone_dark', 0, 0.32, -d * 0.25, w, 0.24, d * 0.5, { cast: false });
  const per = Math.max(1, Math.round(n / 6));
  for (let i = 0; i < 6; i++) {
    const back = i >= 3;
    candles(kit, (i % 3 - 1) * w * 0.32, back ? 0.44 : 0.2, back ? -d * 0.28 : d * 0.2, per, Math.min(w, d) * 0.22);
  }
  kit.pop();
}

/** Iron-bound wooden door leaf pivoting on a hinge; built as a separate Object3D (dynamic). */
export function doorLeaf(w: number, h: number, t = 0.14, arched = true): THREE.BufferGeometry {
  const pts: [number, number][] = arched
    ? [[0, 0], [w, 0], [w, h - w * 0.6], ...archPoints(-w, w, h - w * 0.6, 'pointed', w * 0.6 * 1.6).filter(([px]) => px >= 0).map(([px, py]) => [px, py] as [number, number]).reverse(), [0, h]]
    : [[0, 0], [w, 0], [w, h], [0, h]];
  const g = extrudeXY(pts, t);
  g.translate(0, 0, -t / 2);
  return g;
}

export const flat = (g: THREE.BufferGeometry[]) => mergeGeometries(g.map((x) => (x.index ? x.toNonIndexed() : x)), false)!;
export { box };
