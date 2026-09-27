/**
 * The Garden Court (Royal Household) — shared build context, the region's plan (key coordinates)
 * and the garden/palace prop vocabulary (hedges, statues, autumn trees, balustrades, gothic
 * windows, pinnacles, portraits, thrones).
 *
 * World axes: X east, Y up, Z south (north is -Z). yaw = atan2(dx, dz), 0 faces +Z.
 *
 *                               [Terrace of the Great Bell]  YT (keeper arena; frame + bell to the north)
 *                                   ↑ Bell Stair (signet door)
 *   [Throne Room] YU ──────────────┘
 *        ↑
 *   [Antechamber] YU (Stillbell) ── East Loggia YU ── stair ── [Court of Two Claims] y0 (Twin Heirs)
 *        ↑ grand stair                                                 ↑ fog
 *   [Great Hall] YH ── west balcony YU (portcullis winch)          [Orangery] y0 (Stillbell)
 *        ↑ portcullis (shortcut)          ↑ jib door                    ↑
 *   [Palace Terrace] YH          [Gallery of Unreigned Heirs] YU        │
 *        ↑ stair                           ↑ servants' stair           │
 *   [Parterre] y0 ── cross path (toll) ─────────────────────────────── east gate
 *        │  └─ [Mourning Maze] (graves, gazebo)  ── garden door ── [Servants' Passages] y0
 *   [Servants' Yard] y0 (entry Stillbell) ── kitchen door (bolted from inside: shortcut) ── [Kitchen]
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import { Kit, type KitShared } from '../../world/kit';
import { getMaterial, cloneMaterial, getTextureSet } from '../../render/materials';
import type { MaterialId } from '../../render/materialIds';
import { loft, ellipsoid, sweep, cyl as pcyl, merge, xf, type Ring } from '../../actors/models/parts';
import { Rng } from '../../core/rng';

export interface AreaCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
  /** Geometry with region-specific materials (foliage, hedges, glass), merged per material. */
  batch: Batch;
}

export function newKit(ctx: AreaCtx, name: string, seed: number): Kit {
  const k = new Kit(name, ctx.shared, seed);
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);
export const YAW_N = Math.PI, YAW_S = 0, YAW_E = Math.PI / 2, YAW_W = -Math.PI / 2;
export const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)));

/** Floor levels. */
export const Y0 = 0, YH = 2.4, YU = 8.4, YT = 14.4;

/** Key coordinates (see the diagram above). */
export const PLAN = {
  yard: { x0: -38, x1: -10, z0: 52, z1: 76 },
  garden: { x0: -34, x1: 34, z0: 1, z1: 52 },
  avenue: { x0: -3, x1: 3 },
  cross: { z0: 22, z1: 26 },
  maze: { x0: -34, x1: -8, z0: 3, z1: 48 },
  terrace: { x0: -30, x1: 30, z0: -14, z1: -4 },
  facadeZ: -14.75, facadeT: 1.5,
  wing: { x0: -54, x1: -38, z0: -26, z1: 60 },
  kitchen: { x0: -53, x1: -39, z0: 44, z1: 60 },
  corridor: { x0: -47, x1: -44, z0: -6, z1: 44 },
  linen: { x0: -53, x1: -47, z0: 18, z1: 32 },
  pantry: { x0: -44, x1: -39, z0: 8, z1: 16 },
  postern: { x0: -53, x1: -47, z0: 3, z1: 11 },
  sStair: { x: -45.5, zLo: -6, zHi: -20, w: 3 },
  landing: { x0: -47, x1: -38, z0: -24, z1: -20 },
  gallery: { x0: -38, x1: -14, z0: -30, z1: -18 },
  hall: { x0: -12, x1: 12, z0: -44, z1: -15.5 },
  balcony: { x0: -12, x1: -8, z0: -44, z1: -16 },
  gStair: { x0: -3, x1: 3, zLo: -30, zHi: -44 },
  ante: { x0: -12, x1: 12, z0: -58, z1: -44 },
  loggia: { x0: 12, x1: 51, z0: -58, z1: -53 },
  throne: { x0: -14, x1: 14, z0: -86, z1: -58 },
  bStair: { x0: 15, x1: 24, zc: -76, w: 4 },
  bell: { c: new THREE.Vector3(39, YT, -76), r: 11.5, frameZ: -91 },
  orangery: { x0: 36, x1: 58, z0: -6, z1: 34 },
  heirs: { x0: 35, x1: 59, z0: -40, z1: -8, c: new THREE.Vector3(47, Y0, -24), r: 11 },
  hStair: { x0: 45, x1: 49, zLo: -41, zHi: -53 },
};

// ================================================================================ custom materials

const MATS = new Map<string, THREE.Material>();

/** A tinted clone of a library material (keeps its weathering and, when generated, its textures). */
export function tinted(base: MaterialId, color: THREE.ColorRepresentation, key: string): THREE.Material {
  const k = `${base}|${key}`;
  let m = MATS.get(k);
  if (m) return m;
  m = cloneMaterial(getMaterial(base));
  const s = m as THREE.MeshStandardMaterial;
  if (s.isMeshStandardMaterial) {
    const c = new THREE.Color(color);
    // With textures attached the base colour is white × map; before, it is the generator colour.
    if (getTextureSet(base)) s.color.copy(c); else s.color.copy(c);
    s.userData.variantTint = c;
  }
  m.name = k;
  MATS.set(k, m);
  return m;
}

/** Region materials: foliage uses vertex colours (per-blob autumn variation), hedges tinted moss. */
export function hhMaterial(id: 'foliage' | 'hedge' | 'glass' | 'leafLitter'): THREE.Material {
  let m = MATS.get(id);
  if (m) return m;
  switch (id) {
    case 'foliage': m = new THREE.MeshStandardMaterial({ name: 'hh_foliage', vertexColors: true, roughness: 0.92, metalness: 0, flatShading: false }); break;
    case 'leafLitter': m = new THREE.MeshStandardMaterial({ name: 'hh_leaves', vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }); break;
    case 'hedge': m = tinted('moss', '#c6e3a0', 'hedge'); break;
    case 'glass': {
      const g = new THREE.MeshStandardMaterial({ name: 'hh_glass', color: '#a9b8b4', roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });
      m = g; break;
    }
  }
  MATS.set(id, m!);
  return m!;
}

/** Collects geometry for region materials and merges it into one mesh per material. */
export class Batch {
  private lists = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; order?: number }>();
  add(mat: THREE.Material, g: THREE.BufferGeometry, m?: THREE.Matrix4, cast = true) {
    if (m) g.applyMatrix4(m);
    const key = mat.uuid + (cast ? 'c' : '');
    let l = this.lists.get(key);
    if (!l) this.lists.set(key, (l = { mat, geos: [], cast }));
    l.geos.push(ensureAttrs(g));
  }
  finish(parent: THREE.Object3D): { meshes: number; triangles: number } {
    let meshes = 0, triangles = 0;
    for (const l of this.lists.values()) {
      if (!l.geos.length) continue;
      const g = mergeColored(l.geos);
      g.computeBoundingSphere(); g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, l.mat);
      mesh.castShadow = l.cast;
      mesh.receiveShadow = true;
      mesh.name = 'hh:' + (l.mat.name || 'batch');
      mesh.matrixAutoUpdate = false;
      if ((l.mat as THREE.MeshStandardMaterial).transparent) mesh.renderOrder = 3;
      parent.add(mesh);
      meshes++;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
    this.lists.clear();
    return { meshes, triangles };
  }
}

/** Merge non-indexed geometries keeping position/normal/uv/color. */
function mergeColored(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  const attrs: [string, number][] = [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]];
  for (const [name, size] of attrs) {
    const arr = new Float32Array(n * size);
    let o = 0;
    for (const g of list) {
      const a = g.attributes[name] as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[(o + i) * size + c] = a.getComponent(i, c);
      o += a.count;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

/** Non-indexed geometry with position/normal/uv/color attributes (so merges are uniform). */
function ensureAttrs(g0: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = g0.index ? g0.toNonIndexed() : g0;
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.color) {
    const c = new Float32Array(n * 3).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

/** Paint a geometry with one colour, jittered per vertex (foliage). */
function paint(g: THREE.BufferGeometry, col: THREE.Color, jitter: number, rng: Rng): THREE.BufferGeometry {
  const gg = g.index ? g.toNonIndexed() : g;
  const n = gg.attributes.position.count;
  const c = new Float32Array(n * 3);
  const p = gg.attributes.position;
  for (let i = 0; i < n; i++) {
    // darker toward the underside / inside of a blob
    const shade = 0.72 + 0.28 * Math.min(1, Math.max(0, p.getY(i) * 0.6 + 0.6)) + (rng.next() - 0.5) * jitter;
    c[i * 3] = col.r * shade; c[i * 3 + 1] = col.g * shade; c[i * 3 + 2] = col.b * shade;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return gg;
}

/** Lumpy sphere (canopy blob / topiary). */
function blob(r: number, rng: Rng, detail = 1, squash = 0.85): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const seed = rng.range(0, 100);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.16 * Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 - seed) + 0.1 * Math.sin(y * 4.3 + seed * 2);
    p.setXYZ(i, x * k, y * k * squash, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export const AUTUMN = ['#b5652a', '#c98a32', '#a8462a', '#d6a23c', '#8e3b22', '#b87838'].map((c) => new THREE.Color(c));

// ================================================================================ garden props

/** Clipped hedge wall between two points (height h, thickness t) with a collider. */
export function hedge(ctx: AreaCtx, k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h: number, t = 0.9, col = true) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const segsL = Math.max(2, Math.round(len / 0.9)), segsH = Math.max(2, Math.round(h / 0.6));
  const g = new THREE.BoxGeometry(len + t * 0.1, h, t, segsL, segsH, 2);
  const p = g.attributes.position;
  const seed = x0 * 1.7 + z0 * 3.1;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.3 + seed) * Math.cos(yy * 3.1 + z * 1.7) * 0.05 + Math.sin(x * 7.1 + yy * 5.3) * 0.025;
    // rounded top edges
    const top = yy > h / 2 - 0.01 ? -0.06 * Math.pow(Math.abs(z) / (t / 2), 3) : 0;
    p.setXYZ(i, x, yy + top + (yy > 0 ? n * 0.6 : 0), z * (1 + n * 2.2));
  }
  g.computeVertexNormals();
  const m = new THREE.Matrix4().makeRotationY(Math.atan2(-dz, dx)).setPosition((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
  ctx.batch.add(hhMaterial('hedge'), g, new THREE.Matrix4().multiplyMatrices(k.m, m));
  if (col) {
    k.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
    k.solid(-len / 2, 0, -t / 2, len / 2, Math.max(h, 1.2), t / 2, 'dirt');
    k.pop();
  }
}

/** Rectangular bed bordered by low hedges, with openings (gaps) listed as [side, u0, u1]. */
export function hedgeBed(ctx: AreaCtx, k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h = 1.05, gaps: ['n' | 's' | 'e' | 'w', number, number][] = []) {
  const side = (s: 'n' | 's' | 'e' | 'w', a: [number, number], b: [number, number]) => {
    const along = s === 'n' || s === 's';
    const lo = along ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]), hi = along ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
    const cuts = gaps.filter((g) => g[0] === s).sort((p, q) => p[1] - q[1]);
    let cur = lo;
    const seg = (u0: number, u1: number) => {
      if (u1 - u0 < 0.3) return;
      if (along) hedge(ctx, k, u0, a[1], u1, a[1], y, h, 0.8); else hedge(ctx, k, a[0], u0, a[0], u1, y, h, 0.8);
    };
    for (const c of cuts) { seg(cur, c[1]); cur = c[2]; }
    seg(cur, hi);
  };
  side('n', [x0, z0], [x1, z0]);
  side('s', [x0, z1], [x1, z1]);
  side('w', [x0, z0], [x0, z1]);
  side('e', [x1, z0], [x1, z1]);
  k.bmm('dirt', x0 + 0.4, y, z0 + 0.4, x1 - 0.4, y + 0.06, z1 - 0.4, { cast: false });
}

/** Topiary: cone or ball on a stem, in a stone planter or on the ground. */
export function topiary(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, kind: 'cone' | 'ball', s = 1) {
  const rng = new Rng(Math.round(x * 13 + z * 7));
  const g = kind === 'cone'
    ? (() => { const c = new THREE.ConeGeometry(0.62 * s, 2.1 * s, 12, 5); const p = c.attributes.position; for (let i = 0; i < p.count; i++) { const f = 1 + 0.06 * Math.sin(p.getY(i) * 9 + p.getX(i) * 5); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } c.computeVertexNormals(); c.translate(0, 1.05 * s + 0.3, 0); return c; })()
    : blob(0.62 * s, rng, 1, 1).translate(0, 0.95 * s, 0);
  ctx.batch.add(hhMaterial('hedge'), g, new THREE.Matrix4().multiplyMatrices(k.m, new THREE.Matrix4().makeTranslation(x, y, z)));
  if (kind === 'ball') k.add('timber_dark', new THREE.CylinderGeometry(0.05, 0.07, 0.5, 5), { x, y: y + 0.25, z }, { cast: false });
  k.add('stone_trim', new THREE.CylinderGeometry(0.5 * s, 0.4 * s, 0.4, 10), { x, y: y + 0.2, z });
  k.solid(x - 0.45 * s, y, z - 0.45 * s, x + 0.45 * s, y + 1.4, z + 0.45 * s);
}

/** Autumn tree: dark trunk with forks and a canopy of coloured blobs. */
export function autumnTree(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, h: number, seed: number, palette = AUTUMN, col = true) {
  const rng = new Rng(seed * 97 + 13);
  const trunkH = h * 0.5;
  k.add('timber_dark', new THREE.CylinderGeometry(0.16 * h / 8, 0.3 * h / 8, trunkH, 7), { x, y: y + trunkH / 2, z });
  // two or three forks
  const nf = rng.int(2, 3);
  for (let i = 0; i < nf; i++) {
    const a = rng.range(0, Math.PI * 2), L = h * rng.range(0.25, 0.35);
    const tilt = rng.range(0.35, 0.6);
    k.add('timber_dark', new THREE.CylinderGeometry(0.06 * h / 8, 0.13 * h / 8, L, 5).translate(0, L / 2, 0), { x, y: y + trunkH * 0.85, z, ry: a, rz: tilt });
  }
  const cy = y + h * 0.66;
  const n = 13 + rng.int(0, 5);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(0, h * 0.24);
    const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, by = cy + rng.range(-h * 0.12, h * 0.16);
    const br = h * rng.range(0.1, 0.16);
    const g = paint(blob(br, rng, 1), palette[rng.int(0, palette.length - 1)], 0.18, rng);
    ctx.batch.add(hhMaterial('foliage'), g, new THREE.Matrix4().multiplyMatrices(k.m, new THREE.Matrix4().makeTranslation(bx, by, bz)));
  }
  if (col) k.solid(x - 0.3, y, z - 0.3, x + 0.3, y + 3, z + 0.3, 'wood');
}

/** Columnar dark cypress (garden edges; the alternate concept's vertical accents). */
export function cypress(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, h: number, seed: number) {
  const rng = new Rng(seed);
  const g = new THREE.CylinderGeometry(0.05, 0.75 * h / 9, h, 10, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const yy = p.getY(i) / h + 0.5;
    const bulge = Math.sin(yy * Math.PI) * 0.35 + 0.75;
    const f = bulge * (1 + 0.08 * Math.sin(yy * 30 + p.getX(i) * 6 + seed));
    p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  g.translate(0, h / 2 + 0.3, 0);
  ctx.batch.add(hhMaterial('foliage'), paint(g, new THREE.Color('#34422a'), 0.2, rng), new THREE.Matrix4().multiplyMatrices(k.m, new THREE.Matrix4().makeTranslation(x, y, z)));
  k.solid(x - 0.4, y, z - 0.4, x + 0.4, y + 3, z + 0.4, 'wood');
}

/** Fallen leaves scattered over a rectangle (flat irregular flecks). */
export function leafLitter(ctx: AreaCtx, k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, n: number, seed: number) {
  const rng = new Rng(seed);
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.07, 0.16);
    const g = new THREE.PlaneGeometry(s, s * 0.7);
    g.rotateX(-Math.PI / 2 + rng.range(-0.2, 0.2));
    g.rotateY(rng.range(0, Math.PI * 2));
    g.translate(rng.range(x0, x1), y + 0.012 + rng.range(0, 0.01), rng.range(z0, z1));
    geos.push(paint(g, AUTUMN[rng.int(0, AUTUMN.length - 1)].clone().multiplyScalar(rng.range(0.7, 1.05)), 0.05, rng));
  }
  if (!geos.length) return;
  ctx.batch.add(hhMaterial('leafLitter'), mergeColored(geos.map(ensureAttrs)), k.m.clone(), false);
}

// ================================================================================ statues

let STATUE_GEO: THREE.BufferGeometry[] | null = null;
/** Robed figures in three poses: 0 = heir with sword point-down, 1 = mourner with veil, 2 = crowned claimant with orb. */
function statueGeos(): THREE.BufferGeometry[] {
  if (STATUE_GEO) return STATUE_GEO;
  const make = (v: number) => {
    const parts: THREE.BufferGeometry[] = [];
    // robe
    const robe: Ring[] = [
      { y: 0, rx: 0.34, rz: 0.3 }, { y: 0.3, rx: 0.31, rz: 0.27 }, { y: 0.8, rx: 0.25, rz: 0.2 }, { y: 1.05, rx: 0.2, rz: 0.15 },
      { y: 1.3, rx: 0.23, rz: 0.15 }, { y: 1.48, rx: 0.24, rz: 0.14 }, { y: 1.56, rx: 0.12, rz: 0.1 }, { y: 1.6, rx: 0.06, rz: 0.06 },
    ];
    parts.push(loft(robe, { segs: 16, capBottom: true, capTop: true, radial: (th, t) => 1 + 0.045 * Math.sin(th * 9 + t * 2) * (1 - t) }));
    // head
    parts.push(xf(ellipsoid(0.1, 0.125, 0.11, { segs: 12, rows: 8 }), { p: [0, 1.72, 0.01] }));
    if (v === 1) parts.push(xf(loft([{ y: 0.12, rx: 0.13, rz: 0.13 }, { y: -0.05, rx: 0.16, rz: 0.15 }, { y: -0.3, rx: 0.2, rz: 0.17 }], { segs: 12, phi0: 0.9, phiLen: Math.PI * 2 - 1.8 }), { p: [0, 1.74, -0.01] }));
    if (v !== 1) {
      // crown
      const cr: THREE.BufferGeometry[] = [pcyl(0.105, 0.11, 1.8, 1.86, 10, false)];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cr.push(xf(new THREE.ConeGeometry(0.02, 0.07, 4), { p: [Math.sin(a) * 0.105, 1.89, Math.cos(a) * 0.105] })); }
      parts.push(merge(cr));
    }
    // arms
    if (v === 0) {
      // both hands on a sword pommel, point down in front
      for (const s of [1, -1]) parts.push(sweep([[s * 0.22, 1.42, 0], [s * 0.2, 1.15, 0.12], [s * 0.05, 1.0, 0.24]], { r: 0.05, sides: 6, segs: 6 }));
      parts.push(xf(new THREE.BoxGeometry(0.06, 1.0, 0.012), { p: [0, 0.48, 0.28] }));
      parts.push(xf(new THREE.BoxGeometry(0.32, 0.04, 0.05), { p: [0, 0.98, 0.27] }));
      parts.push(xf(ellipsoid(0.035, 0.035, 0.035, { segs: 8, rows: 5 }), { p: [0, 1.08, 0.26] }));
    } else if (v === 1) {
      // hands clasped at the chest, head bowed
      for (const s of [1, -1]) parts.push(sweep([[s * 0.22, 1.42, 0], [s * 0.19, 1.2, 0.1], [s * 0.03, 1.28, 0.17]], { r: 0.05, sides: 6, segs: 6 }));
    } else {
      // orb raised in the left hand, sceptre in the right
      parts.push(sweep([[0.22, 1.42, 0], [0.3, 1.22, 0.1], [0.22, 1.35, 0.3]], { r: 0.05, sides: 6, segs: 6 }));
      parts.push(xf(ellipsoid(0.08, 0.08, 0.08, { segs: 10, rows: 6 }), { p: [0.22, 1.45, 0.32] }));
      parts.push(sweep([[-0.22, 1.42, 0], [-0.3, 1.15, 0.08], [-0.26, 1.02, 0.2]], { r: 0.05, sides: 6, segs: 6 }));
      parts.push(xf(pcyl(0.018, 0.018, 0, 1.2, 6), { p: [-0.26, 0.55, 0.2] }));
    }
    const g = merge(parts);
    return g;
  };
  STATUE_GEO = [make(0), make(1), make(2)];
  return STATUE_GEO;
}

/** Statue on a tall plinth (plinth carries a small gilt plaque). */
export function statue(k: Kit, x: number, y: number, z: number, yaw: number, variant: number, plinthH = 1.6, scale = 1.25) {
  k.push(x, y, z, yaw);
  k.box('stone_dark', 0, 0.12, 0, 1.3, 0.24, 1.3);
  k.box('stone_trim', 0, plinthH / 2, 0, 1.0, plinthH - 0.3, 1.0);
  k.box('stone_trim', 0, plinthH - 0.08, 0, 1.18, 0.16, 1.18);
  k.box('gold_trim', 0, plinthH * 0.55, 0.505, 0.5, 0.3, 0.02, { cast: false });
  k.add('stone_trim', statueGeos()[variant % 3].clone(), { y: plinthH, s: scale });
  k.solid(-0.6, 0, -0.6, 0.6, plinthH + 2.4, 0.6);
  k.pop();
}

// ================================================================================ architecture details

/** Balustrade (rail + turned balusters) along a line at floor height y; collider to 1.2 m. */
export function balustrade(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h = 1.0, col = true) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  if (len < 0.1) return;
  k.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
  k.box('stone_trim', 0, 0.09, 0, len, 0.18, 0.4);
  k.box('stone_trim', 0, h - 0.07, 0, len + 0.04, 0.14, 0.36);
  const n = Math.max(2, Math.floor(len / 0.34));
  for (let i = 0; i < n; i++) {
    const u = -len / 2 + (len * (i + 0.5)) / n;
    k.inst('hh_baluster', balusterGeo, 'stone_trim', { x: u, y: 0.18, z: 0, s: [1, (h - 0.32) / 0.7, 1] }, false);
  }
  // posts every ~4 m
  const np = Math.max(1, Math.round(len / 4));
  for (let i = 0; i <= np; i++) k.box('stone_trim', -len / 2 + (len * i) / np, h / 2, 0, 0.34, h + 0.05, 0.42);
  if (col) k.solid(-len / 2, 0, -0.2, len / 2, 1.25, 0.2);
  k.pop();
}
const balusterGeo = () => {
  const pts: [number, number][] = [[0.001, 0], [0.07, 0], [0.07, 0.05], [0.045, 0.1], [0.075, 0.3], [0.04, 0.5], [0.05, 0.6], [0.075, 0.65], [0.075, 0.7], [0.001, 0.7]];
  return new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 8);
};

/** Tall gothic window on a facade (local frame: facade plane z=0, facing +Z): recessed dark glass, tracery, gilt hood. */
export function gothicWindow(k: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number, lit = false, gilt = true) {
  k.push(x, y, z, yaw);
  const rise = w * 0.55;
  // recessed pane
  k.box(lit ? 'window_warm' : 'stone_dark', 0, h / 2, -0.08, w, h, 0.05, { cast: false });
  const arch = new THREE.Shape();
  arch.moveTo(-w / 2, 0); arch.lineTo(w / 2, 0); arch.lineTo(w / 2, h - rise);
  arch.quadraticCurveTo(w / 2, h, 0, h + rise * 0.15); arch.quadraticCurveTo(-w / 2, h, -w / 2, h - rise); arch.closePath();
  const pane = new THREE.ShapeGeometry(arch, 6);
  k.add(lit ? 'window_warm' : 'iron', pane, { z: -0.05 }, { cast: false });
  // frame & mullions
  for (const s of [-1, 1]) k.box('stone_trim', s * (w / 2 + 0.09), (h - rise) / 2, 0.02, 0.18, h - rise, 0.22);
  k.box('stone_trim', 0, 0.06, 0.04, w + 0.4, 0.12, 0.3);
  k.box('stone_trim', 0, (h - rise) / 2 + 0.1, 0.0, 0.09, h - rise - 0.1, 0.1, { cast: false });
  k.box('stone_trim', 0, (h - rise) * 0.62, 0.0, w, 0.08, 0.1, { cast: false });
  // pointed hood mould
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    for (const s of [-1, 1]) {
      const a0 = (i / segs) * Math.PI / 2, a1 = ((i + 1) / segs) * Math.PI / 2;
      const p0 = [s * (w / 2 + 0.09) * Math.cos(a0), (h - rise) + (rise + 0.2) * Math.sin(a0)], p1 = [s * (w / 2 + 0.09) * Math.cos(a1), (h - rise) + (rise + 0.2) * Math.sin(a1)];
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      k.box(gilt && i >= segs - 2 ? 'gold_trim' : 'stone_trim', (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0.03, L + 0.05, 0.16, 0.2, { rz: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), cast: false });
    }
  }
  // rosette in the head
  k.add(gilt ? 'gold_trim' : 'stone_trim', new THREE.TorusGeometry(w * 0.16, 0.035, 5, 14), { y: h - rise * 0.35, z: 0.0 }, { cast: false });
  k.pop();
}

/** Gothic pinnacle with crockets (for facade buttresses and gables). */
export function pinnacle(k: Kit, x: number, y: number, z: number, h: number, w = 0.7, gilt = false) {
  k.push(x, y, z);
  k.box('stone_wall', 0, h * 0.2, 0, w, h * 0.4, w);
  k.box('stone_trim', 0, h * 0.4, 0, w + 0.12, 0.14, w + 0.12);
  k.add('stone_trim', new THREE.ConeGeometry(w * 0.62, h * 0.6, 4).rotateY(Math.PI / 4), { y: h * 0.7 });
  for (let i = 0; i < 4; i++) {
    const t = 0.15 + i * 0.2;
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
      const r = w * 0.62 * (1 - t) * 0.9;
      k.add('stone_trim', new THREE.ConeGeometry(0.06, 0.18, 4), { x: Math.cos(a) * r, y: h * 0.4 + h * 0.6 * t, z: Math.sin(a) * r, rz: 0.6 * Math.cos(a), rx: -0.6 * Math.sin(a) }, { cast: false });
    }
  }
  k.add(gilt ? 'gold_trim' : 'stone_trim', new THREE.SphereGeometry(0.1, 6, 4), { y: h + 0.02 }, { cast: false });
  if (gilt) k.add('gold_trim', new THREE.ConeGeometry(0.04, 0.5, 4), { y: h + 0.3 }, { cast: false });
  k.pop();
}

/** Portrait in a gilt frame on a wall (local +Z faces the room). `sitter` picks the painted figure's colours. */
export function portrait(k: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number, sitter: number, veiled = false) {
  k.push(x, y, z, yaw);
  k.box('gold_trim', 0, 0, 0.05, w + 0.3, h + 0.3, 0.1);
  k.box('timber_dark', 0, 0, 0.1, w, h, 0.02, { cast: false });
  const robes: MaterialId[] = ['cloth_red', 'cloth_blue', 'cloth_black', 'cloth_linen'];
  if (!veiled) {
    // a painted sitter: robe mass, pale face, a crown or circlet in gilt
    k.box(robes[sitter % robes.length], 0, -h * 0.18, 0.115, w * 0.62, h * 0.62, 0.01, { cast: false });
    k.box('skin_pale', 0, h * 0.2, 0.116, w * 0.18, h * 0.18, 0.01, { cast: false });
    k.box('hair_dark', 0, h * 0.3, 0.117, w * 0.22, h * 0.06, 0.01, { cast: false });
    k.box('gold_trim', 0, h * 0.345, 0.118, w * 0.2, h * 0.035, 0.01, { cast: false });
  } else {
    // a mourning cloth hung over the canvas
    k.box('cloth_black', 0, 0.02, 0.14, w + 0.2, h + 0.1, 0.03, { cast: false });
  }
  k.box('gold_trim', 0, -h / 2 - 0.3, 0.1, w * 0.5, 0.12, 0.04, { cast: false });
  k.pop();
}

/** A throne on a dais step (local +Z faces the hall). */
export function throne(k: Kit, x: number, y: number, z: number, yaw: number, cloth: MaterialId, height = 3.2) {
  k.push(x, y, z, yaw);
  k.box('stone_trim', 0, 0.25, 0, 1.6, 0.5, 1.4);
  k.box('timber_dark', 0, 0.75, 0.05, 1.2, 0.5, 1.0);
  k.box(cloth, 0, 1.02, 0.1, 1.05, 0.06, 0.85, { cast: false });
  k.box('timber_dark', 0, 0.5 + height / 2, -0.45, 1.2, height, 0.2);
  k.box(cloth, 0, 0.6 + height / 2, -0.33, 0.9, height - 0.5, 0.04, { cast: false });
  for (const s of [-1, 1]) {
    k.box('timber_dark', s * 0.62, 1.2, 0.05, 0.16, 0.9, 1.0);
    k.box('gold_trim', s * 0.62, 1.67, 0.45, 0.2, 0.12, 0.2, { cast: false });
    k.add('gold_trim', new THREE.ConeGeometry(0.1, 0.5, 4), { x: s * 0.55, y: 0.5 + height + 0.25, z: -0.45 }, { cast: false });
  }
  k.add('gold_trim', new THREE.TorusGeometry(0.28, 0.05, 5, 16), { y: 0.5 + height - 0.3, z: -0.32 }, { cast: false });
  k.solid(-0.8, 0, -0.6, 0.8, 0.5 + height, 0.7);
  k.pop();
}

/** Tall heraldic banner hanging from a wall bracket (Household mark: arch, crown, bell). */
export function hangingBanner(k: Kit, x: number, y: number, z: number, yaw: number, w = 1.3, h = 4, mat: MaterialId = 'heraldry_banner') {
  k.push(x, y, z, yaw);
  k.box('iron', 0, 0, 0.18, w + 0.3, 0.06, 0.06, { cast: false });
  k.add(mat, bannerShape(w, h), { z: 0.2 }, { cast: false });
  k.box('gold_trim', 0, -0.05, 0.22, w + 0.1, 0.12, 0.02, { cast: false });
  k.pop();
}
function bannerShape(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, -h); s.lineTo(0, -h + w * 0.45); s.lineTo(-w / 2, -h); s.closePath();
  const g = new THREE.ShapeGeometry(s, 1);
  // planar UVs 0..1 so the arms texture sits on the cloth
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, 1 + p.getY(i) / h);
  return g;
}

/** A candle-lit sconce/candelabra stand is in the kit; this is a wall candle shelf (instanced flames). */
export { Rng };
