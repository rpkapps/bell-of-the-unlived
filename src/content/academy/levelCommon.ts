/**
 * The Suspended Campus — shared build context, the region plan (key coordinates), and reusable
 * pieces: scaffolds, chains, glass houses, lens apparatus, and the dynamic pieces (fog gates,
 * portcullis, levers, the lift, the drawbridge, the scholar's cage, the drafting board).
 *
 * World axes: X east, Y up, Z south (north is -Z). Metres. yaw = atan2(dx, dz), 0 faces +Z.
 * The sea lies to the south at y = -3; every drop off the campus ends in it (killY).
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece } from '../../world/levelTypes';
import { Kit, type KitShared, cyl, sphere, rock } from '../../world/kit';
import { getMaterial } from '../../render/materials';
import type { MaterialId } from '../../render/materialIds';


export interface AreaCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
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
export const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));

/** Key coordinates shared by every area (so seams line up). */
export const PLAN = {
  seaY: -3,
  killY: -1.6,
  // entry: causeway across the surf, landing at the cliff foot
  causeway: { x0: -2.6, x1: 2.6, z0: 31, z1: 64, y: 2 },
  bastion: { x: 0, z: 70, r: 6.5 },
  landing: { x0: -13, x1: 11, z0: 20, z1: 31, y: 2 },
  cliffZ: 19.5,
  seaGate: { x0: -2.5, x1: 2.5, z: 19, h: 5 },
  balcony: { x0: 4, x1: 10, z0: 19.5, z1: 22.6, y: 7 },
  // tidal stair up to the theatre promenade
  tidal: { xLow: -12.5, xHigh: -24, z: 25.5, w: 3, yLow: 2, yHigh: 8 },
  tidalTop: { x0: -34, x1: -24, z0: 22.5, z1: 28.5, y: 8 },
  // the drowned theatre (stage north, tiers rising south)
  theatre: { c: new THREE.Vector3(-36, 2, 4), rStage: 6, tierD: 1.1, tierH: 0.6, tiers: 10, rProm: 20.5, rWall: 21.5, water: 4.4, backZ: -4, xW: -56.5, xE: -15.5, top: 18 },
  tunnel: { x0: -15.5, x1: -6, z0: -3, z1: 0, y: 2, h: 3.6 },
  chamber: { x0: -6, x1: 6, z0: -3, z1: 18, y: 2, ceil: 10 },
  shaft: { x0: -2.5, x1: 2.5, z0: 10.5, z1: 15.5 },
  lift: { x: 0, z: 13, w: 4, d: 4, y0: 2, y1: 18 },
  terrace: { x0: -14, x1: 14, z0: 4, z1: 18.5, y: 18 },
  hall: { x0: -16, x1: 16, z0: -12, z1: 4, y: 18, h: 13, gallery: 24 },
  bridgeW: { z: -9, x0: -34, x1: -16, y: 18, w: 2.6 },
  labA: { x0: -42, x1: -34, z0: -13, z1: -5, y: 18 },
  labB: { x0: -45, x1: -32, z0: -32, z1: -20, y: 18 },
  lab9: { c: new THREE.Vector3(-57, 18, -9), r: 7.5 },
  cage: { dockX: -46.6, outX: -52.6, z: -25.5, y: 18, yOut: 13.5 },
  scaffoldUp: { x: -41.5, z0: -32, z1: -42, w: 3, y0: 18, y1: 24 },
  scaffoldTop: { x0: -44, x1: -34, z0: -46, z1: -42, y: 24 },
  yard: { x0: -34, x1: 14, z0: -50, z1: -18, y: 24 },
  drawbridge: { x: 0, zHinge: -18, len: 6.3, w: 3, y: 24 },
  spire: { x0: -7.5, x1: 7.5, z0: -47.5, z1: -32.5, core: 5, walk: 2.5, y0: 24, y1: 44, flights: 7 },
  arena: { c: new THREE.Vector3(-6.25, 44, -63), r: 12 },
  tower: { x0: -11.25, x1: -1.25, z0: -86, z1: -76, bellY: 84, top: 102 },
};

/** Walking height of the theatre tiers at (x, z) (stage/orchestra = 2, promenade = 8). */
export function theatreY(x: number, z: number): number {
  const T = PLAN.theatre;
  if (z <= T.c.z) return T.c.y;
  const r = Math.hypot(x - T.c.x, z - T.c.z);
  if (r < T.rStage) return T.c.y;
  const i = Math.floor((r - T.rStage) / T.tierD);
  if (i >= T.tiers) return T.c.y + T.tierH * T.tiers;
  return T.c.y + T.tierH * (i + 1);
}

// ------------------------------------------------------------------------------------ materials

const MATS = new Map<string, THREE.Material>();
/** Emissive standard material (cached by key). */
export function glowMat(key: string, color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation, intensity: number, o: { transparent?: boolean; opacity?: number; metal?: number; rough?: number } = {}): THREE.MeshStandardMaterial {
  let m = MATS.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: o.metal ?? 0.1, roughness: o.rough ?? 0.25, transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: !o.transparent });
    m.name = 'academy:' + key;
    MATS.set(key, m);
  }
  return m;
}
/** Additive unlit material (beams, bubbles, light shafts). */
export function addMat(key: string, color: THREE.ColorRepresentation, opacity: number, side: THREE.Side = THREE.DoubleSide): THREE.MeshBasicMaterial {
  let m = MATS.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side, fog: true });
    m.name = 'academy:' + key;
    MATS.set(key, m);
  }
  return m;
}

// ------------------------------------------------------------------------------------ static helpers

/**
 * Timber scaffold over a rectangle (x0..x1, z0..z1) from y0 to y1: poles on a grid, ledgers,
 * cross braces on the outer faces, and plank decks at the given heights.
 */
export function scaffold(k: Kit, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, o: { bay?: number; lift?: number; decks?: number[]; braces?: boolean; mat?: MaterialId } = {}) {
  const bay = o.bay ?? 3, lift = o.lift ?? 2.2, mat = o.mat ?? 'timber';
  const nx = Math.max(1, Math.round((x1 - x0) / bay)), nz = Math.max(1, Math.round((z1 - z0) / bay));
  const H = y1 - y0;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
    k.box(mat, x, y0 + H / 2, z, 0.16, H, 0.16, { cast: true });
  }
  const nl = Math.max(1, Math.floor(H / lift));
  for (let l = 1; l <= nl; l++) {
    const y = y0 + l * lift;
    if (y > y1 + 0.01) break;
    for (let j = 0; j <= nz; j++) { const z = z0 + ((z1 - z0) * j) / nz; k.box(mat, (x0 + x1) / 2, y, z, x1 - x0 + 0.3, 0.12, 0.12, { cast: false }); }
    for (let i = 0; i <= nx; i++) { const x = x0 + ((x1 - x0) * i) / nx; k.box(mat, x, y - 0.14, (z0 + z1) / 2, 0.12, 0.12, z1 - z0 + 0.3, { cast: false }); }
  }
  if (o.braces ?? true) {
    for (let l = 0; l < nl; l++) {
      const ya = y0 + l * lift, yb = Math.min(y1, ya + lift);
      for (let i = 0; i < nx; i++) {
        const xa = x0 + ((x1 - x0) * i) / nx, xb = x0 + ((x1 - x0) * (i + 1)) / nx;
        for (const z of [z0, z1]) {
          const L = Math.hypot(xb - xa, yb - ya), a = Math.atan2(yb - ya, xb - xa) * ((i + l) % 2 ? 1 : -1);
          k.box(mat, (xa + xb) / 2, (ya + yb) / 2, z, L, 0.09, 0.09, { rz: a, cast: false });
        }
      }
    }
  }
  for (const y of o.decks ?? []) {
    for (let i = 0; i < Math.ceil((x1 - x0) / 0.32); i++) {
      const x = x0 + 0.16 + i * 0.32;
      if (x > x1) break;
      k.box('planks', x, y - 0.04, (z0 + z1) / 2, 0.3, 0.07, z1 - z0 + 0.2, { cast: false, ry: (i % 3 - 1) * 0.01 });
    }
  }
}

/** A hanging chain from a to b made of alternating links. */
export function chain(k: Kit, a: THREE.Vector3 | [number, number, number], b: THREE.Vector3 | [number, number, number], link = 0.24, thick = 0.05, mat: MaterialId = 'iron') {
  const A = a instanceof THREE.Vector3 ? a : new THREE.Vector3(...a);
  const B = b instanceof THREE.Vector3 ? b : new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const L = d.length();
  const n = Math.max(1, Math.floor(L / link));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  for (let i = 0; i < n; i++) {
    const p = A.clone().addScaledVector(d, (i + 0.5) / n);
    const twist = i % 2 ? Math.PI / 2 : 0;
    k.add(mat, new THREE.TorusGeometry(link * 0.34, thick * 0.5, 3, 6), { x: p.x, y: p.y, z: p.z, rx: e.x, ry: e.y + twist, rz: e.z + Math.PI / 2, s: [1, 1.6, 1] }, { cast: false });
  }
}

/**
 * A glass house (laboratory): iron frame, glass panes on the walls and a pitched glass roof,
 * doorways on the listed sides ('n','s','e','w'). Local frame at the floor centre.
 */
export function glassHouse(k: Kit, cx: number, y: number, cz: number, w: number, d: number, h: number, doors: string[] = [], o: { roof?: number; col?: boolean; frame?: MaterialId } = {}) {
  const fr = o.frame ?? 'iron';
  const roof = o.roof ?? 1.6;
  k.push(cx, y, cz, 0);
  const posts: [number, number][] = [];
  const nx = Math.max(2, Math.round(w / 1.6)), nz = Math.max(2, Math.round(d / 1.6));
  for (let i = 0; i <= nx; i++) { posts.push([-w / 2 + (w * i) / nx, -d / 2]); posts.push([-w / 2 + (w * i) / nx, d / 2]); }
  for (let j = 1; j < nz; j++) { posts.push([-w / 2, -d / 2 + (d * j) / nz]); posts.push([w / 2, -d / 2 + (d * j) / nz]); }
  for (const [x, z] of posts) k.box(fr, x, h / 2, z, 0.1, h, 0.1, { cast: false });
  // sills and eaves
  for (const z of [-d / 2, d / 2]) { k.box(fr, 0, 0.45, z, w, 0.08, 0.12, { cast: false }); k.box(fr, 0, h, z, w + 0.1, 0.12, 0.14, { cast: false }); }
  for (const x of [-w / 2, w / 2]) { k.box(fr, x, 0.45, 0, 0.12, 0.08, d, { cast: false }); k.box(fr, x, h, 0, 0.14, 0.12, d + 0.1, { cast: false }); }
  // panes (the central pane of each door side is left open; colliders follow the panes)
  const col = o.col ?? true;
  const paneRow = (side: string, n: number, span: number, place: (u: number, pw: number) => void, solid: (u0: number, u1: number) => void) => {
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const u = -span / 2 + (span * (i + 0.5)) / n;
      const isDoor = doors.includes(side) && Math.abs(i - mid) < 0.6 + (n % 2 ? 0 : 0.5);
      if (isDoor) continue;
      place(u, span / n);
      if (col) solid(u - span / n / 2, u + span / n / 2);
    }
  };
  for (const [side, z] of [['n', -d / 2], ['s', d / 2]] as const) {
    paneRow(side, nx, w, (u, pw) => {
      k.box('glass', u, h / 2 + 0.2, z, pw - 0.1, h - 0.5, 0.03, { cast: false });
      k.box(fr, u, h * 0.62, z, pw, 0.05, 0.06, { cast: false });
    }, (u0, u1) => k.solid(u0, 0, z - 0.08, u1, h, z + 0.08, 'metal'));
  }
  for (const [side, x] of [['w', -w / 2], ['e', w / 2]] as const) {
    paneRow(side, nz, d, (u, pw) => {
      k.box('glass', x, h / 2 + 0.2, u, 0.03, h - 0.5, pw - 0.1, { cast: false });
      k.box(fr, x, h * 0.62, u, 0.06, 0.05, pw, { cast: false });
    }, (u0, u1) => k.solid(x - 0.08, 0, u0, x + 0.08, h, u1, 'metal'));
  }
  // pitched glass roof along x
  const slope = Math.atan2(roof, d / 2), L = Math.hypot(roof, d / 2);
  for (const s of [-1, 1]) {
    k.box('glass', 0, h + roof / 2, (s * d) / 4, w, 0.03, L, { rx: s * slope, cast: false });
    for (let i = 0; i <= nx; i++) k.box(fr, -w / 2 + (w * i) / nx, h + roof / 2 + 0.04, (s * d) / 4, 0.07, 0.07, L, { rx: s * slope, cast: false });
  }
  k.box(fr, 0, h + roof + 0.03, 0, w + 0.2, 0.1, 0.12, { cast: false });
  k.pop();
}

/** A lens apparatus: tripod of iron legs, bronze ring and a ground glass disc (faces local +Z). */
export function lensApparatus(k: Kit, x: number, y: number, z: number, yaw: number, r = 0.9, hC = 1.7) {
  k.push(x, y, z, yaw);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fx = Math.cos(a) * r * 0.8, fz = Math.sin(a) * r * 0.8;
    const L = Math.hypot(fx, hC, fz);
    k.box('iron', fx / 2, hC / 2, fz / 2, 0.06, L, 0.06, { rx: Math.atan2(fz, hC), rz: -Math.atan2(fx, hC), cast: false });
  }
  k.add('bronze', new THREE.TorusGeometry(r, 0.07, 6, 24), { y: hC, s: [1, 1, 1] });
  k.add('glass', cyl(r * 0.97, r * 0.97, 0.05, 20), { y: hC, rx: Math.PI / 2 }, { cast: false });
  k.add('bronze', sphere(0.12, 8, 6), { y: hC - r - 0.05 }, { cast: false });
  k.box('bronze', 0, hC, 0, r * 2.2, 0.05, 0.05, { cast: false });
  k.pop();
}

/** Bench-and-desk row on a tier (lecture theatre). Local frame faces +Z (the lecturer is at -Z). */
export function lectureDesk(k: Kit, x: number, y: number, z: number, yaw: number, w = 2.2, drowned = false) {
  k.push(x, y, z, yaw);
  const wood: MaterialId = drowned ? 'timber_dark' : 'planks';
  k.box(wood, 0, 0.44, 0.15, w, 0.06, 0.34, { cast: false });
  k.box(wood, 0, 0.78, -0.3, w, 0.05, 0.42, { rx: 0.18, cast: false });
  for (const s of [-1, 1]) {
    k.box(wood, s * (w / 2 - 0.08), 0.4, 0, 0.06, 0.8, 0.9, { cast: false });
  }
  if (!drowned) { k.box('parchment', 0.3, 0.83, -0.3, 0.3, 0.01, 0.22, { rx: 0.18, ry: 0.2, cast: false }); }
  else k.box('moss', -0.2, 0.82, -0.28, w * 0.6, 0.02, 0.3, { rx: 0.18, cast: false });
  k.pop();
}

// ------------------------------------------------------------------------------------ dynamic pieces

export type Piece = DynamicPiece & { anchor?: Anchor };

/** Boss veil: three layered fog planes + collider; `yaw` is the direction into the arena. */
export function fogGate(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, W = 4.6, H = 5): DynamicPiece & { anchor: Anchor; enterTo: Anchor } {
  const root = new THREE.Group();
  root.name = 'fog:' + id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), mat);
    m.position.set(0, H / 2, (i - 1) * 0.28);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('academy:fog:' + id, [W, H, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + H / 2, z));
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const piece = {
    object: root, collider: c,
    anchor: anchor(x - dx * 1.9, y, z - dz * 1.9, yaw),
    enterTo: anchor(x + dx * 2.3, y, z + dz * 2.3, yaw),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      layers.forEach((m, i) => { const kk = Math.max(0.001, 1 - e * (1 + i * 0.15)); m.scale.set(1 + e * 0.15, kk, 1); m.position.y = (H / 2) * kk; });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** Iron portcullis in a gateway (local x across, faces yaw). set(1) = raised (open). */
export function portcullis(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, w: number, h: number): Piece {
  const g = new THREE.Group();
  g.name = 'portcullis:' + id;
  const iron = getMaterial('iron');
  const parts: THREE.BufferGeometry[] = [];
  const n = Math.round(w / 0.32);
  for (let i = 0; i <= n; i++) parts.push(new THREE.BoxGeometry(0.08, h, 0.08).translate(-w / 2 + (w * i) / n, h / 2, 0));
  for (let j = 1; j < 6; j++) parts.push(new THREE.BoxGeometry(w, 0.07, 0.1).translate(0, (h * j) / 6, 0));
  for (let i = 0; i <= n; i++) parts.push(new THREE.ConeGeometry(0.06, 0.22, 4).rotateX(Math.PI).translate(-w / 2 + (w * i) / n, -0.1, 0));
  for (const p of parts) { const m = new THREE.Mesh(p, iron); m.castShadow = true; g.add(m); }
  const holder = new THREE.Group();
  holder.position.set(x, y, z); holder.rotation.y = yaw;
  holder.add(g);
  ctx.dynamicRoot.add(holder);
  const c = ctx.shared.collision?.addDynamicBox('academy:gate:' + id, [w, h, 0.4], 'metal');
  const m4 = new THREE.Matrix4();
  const piece: Piece = {
    object: holder, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      g.position.y = e * (h - 0.4);
      if (c) { c.setMatrix(m4.makeRotationY(yaw).setPosition(x, y + h / 2 + e * (h - 0.4), z)); c.enabled = e < 0.75; }
    },
  };
  piece.set(0);
  return piece;
}

/** Floor lever (iron post with a handle). `anchor` is where the player stands. set(1) = pulled. */
export function lever(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, yaw: number): Piece {
  k.push(x, y, z, yaw);
  k.box('stone_dark', 0, 0.2, 0, 0.7, 0.4, 0.5, { col: 'metal' });
  k.box('iron', 0, 0.55, 0, 0.36, 0.3, 0.3, { cast: false });
  const pivot = k.wp(0, 0.65, 0);
  const wyaw = k.wyaw(0);
  k.pop();
  const g = new THREE.Group();
  g.position.copy(pivot); g.rotation.y = wyaw;
  const arm = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6).translate(0, 0.5, 0), getMaterial('iron'));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6).translate(0, 1.0, 0), getMaterial('bronze'));
  shaft.castShadow = true;
  arm.add(shaft, knob);
  g.add(arm);
  ctx.dynamicRoot.add(g);
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const piece: Piece = {
    object: g,
    anchor: anchor(x + dx * 0.95, y, z + dz * 0.95, yaw + Math.PI),
    set(t: number) { arm.rotation.x = 0.7 - Math.min(1, Math.max(0, t)) * 1.4; },
  };
  piece.set(0);
  return piece;
}

/**
 * Cage lift: timber deck with an iron frame and a lever post, riding between y0 (t=0) and y1
 * (t=1). The deck collider follows it. `anchor` = the lever on the deck (at the current height is
 * computed by the region).
 */
export function liftPiece(ctx: AreaCtx, id: string, x: number, z: number, w: number, d: number, y0: number, y1: number): Piece & { y(t: number): number } {
  const g = new THREE.Group();
  g.name = 'lift:' + id;
  const add = (geo: THREE.BufferGeometry, mat: MaterialId, cast = true) => { const m = new THREE.Mesh(geo, getMaterial(mat)); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(w, 0.3, d).translate(0, -0.15, 0), 'planks');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.14, 2.6, 0.14).translate(sx * (w / 2 - 0.07), 1.3, sz * (d / 2 - 0.07)), 'iron');
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(w, 0.1, 0.1).translate(0, 2.6, sz * (d / 2 - 0.07)), 'iron');
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.1, d).translate(sx * (w / 2 - 0.07), 2.6, 0), 'iron');
  // railings on east and west, open north/south
  for (const sx of [-1, 1]) for (const yy of [0.5, 1.0]) add(new THREE.BoxGeometry(0.06, 0.06, d).translate(sx * (w / 2 - 0.07), yy, 0), 'iron', false);
  add(new THREE.BoxGeometry(0.9, 0.1, 0.9).translate(0, 2.75, 0), 'bronze');
  // lever post on the deck (east side)
  add(new THREE.BoxGeometry(0.3, 1.0, 0.3).translate(w / 2 - 0.45, 0.5, 0), 'timber_dark');
  const handle = add(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6).translate(0, 0.4, 0), 'iron');
  handle.position.set(w / 2 - 0.45, 1.0, 0); handle.rotation.z = 0.5;
  ctx.dynamicRoot.add(g);
  // colliders: deck (+ side rails as low walls)
  const col = ctx.shared.collision;
  const deck = col?.addDynamicBox('academy:lift:' + id, [w, 0.3, d], 'wood');
  const rails = [-1, 1].map((sx) => col?.addDynamicBox(`academy:liftRail:${id}:${sx}`, [0.12, 1.2, d], 'metal'));
  const m4 = new THREE.Matrix4();
  const Y = (t: number) => y0 + (y1 - y0) * Math.min(1, Math.max(0, t));
  const piece = {
    object: g, collider: deck,
    y: Y,
    set(t: number) {
      const yy = Y(t);
      g.position.set(x, yy, z);
      deck?.setMatrix(m4.makeTranslation(x, yy - 0.15, z));
      rails.forEach((r, i) => r?.setMatrix(m4.makeTranslation(x + (i ? 1 : -1) * (w / 2 - 0.07), yy + 0.6, z)));
    },
  };
  piece.set(0);
  return piece;
}

/**
 * Drawbridge hinged at (x, y, zHinge) on the north side, dropping toward +Z (south) when
 * lowered. Raised (t=0): upright against the yard edge. Lowered (t=1): a deck spanning `len`.
 */
export function drawbridge(ctx: AreaCtx, id: string, x: number, y: number, zHinge: number, len: number, w: number): Piece {
  const hinge = new THREE.Group();
  hinge.position.set(x, y, zHinge);
  const deckG = new THREE.Group();
  hinge.add(deckG);
  const planks = getMaterial('planks'), iron = getMaterial('iron');
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, len).translate(0, -0.15, len / 2), planks);
  deck.castShadow = true; deck.receiveShadow = true;
  deckG.add(deck);
  for (const sx of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, len).translate(sx * (w / 2 - 0.08), -0.2, len / 2), iron);
    deckG.add(beam);
  }
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.1).translate(0, 0.02, 0.6 + i * (len - 1.2) / 3), iron); deckG.add(b); }
  ctx.dynamicRoot.add(hinge);
  const c = ctx.shared.collision?.addDynamicBox('academy:bridge:' + id, [w, 0.4, len], 'wood');
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3();
  const piece: Piece = {
    object: hinge, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const ang = -(1 - e) * (Math.PI / 2) * 0.98; // raised = -90° about X (deck points up)
      deckG.rotation.x = ang;
      q.setFromEuler(new THREE.Euler(ang, 0, 0));
      p.set(0, -0.2, len / 2).applyQuaternion(q).add(hinge.position);
      if (c) { c.setMatrix(m4.compose(p, q, new THREE.Vector3(1, 1, 1))); c.enabled = true; }
    },
  };
  piece.set(0);
  return piece;
}

/**
 * The scholar's cage: an iron birdcage hung from a gantry on a chain. t=0: swung out over the
 * drop (low); t=1: winched in against the platform edge. The chain stretches from the gantry.
 */
export function cagePiece(ctx: AreaCtx, id: string, gantry: THREE.Vector3, out: THREE.Vector3, dock: THREE.Vector3): Piece & { pos(t: number): THREE.Vector3; door: THREE.Object3D } {
  const g = new THREE.Group();
  g.name = 'cage:' + id;
  const iron = getMaterial('iron'), wood = getMaterial('planks');
  const R = 1.05, H = 2.5;
  const floorM = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.16, 12), wood);
  floorM.position.y = 0.08; g.add(floorM);
  const barsG: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue; // door gap on +X (dock side)
    barsG.push(new THREE.CylinderGeometry(0.025, 0.025, H, 4).translate(Math.cos(a) * R, H / 2, Math.sin(a) * R));
  }
  for (const b of barsG) { const m = new THREE.Mesh(b, iron); g.add(m); }
  for (const yy of [0.2, H * 0.55, H]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 4, 18).rotateX(Math.PI / 2), iron); ring.position.y = yy; g.add(ring); }
  const dome = new THREE.Mesh(new THREE.ConeGeometry(R * 1.05, 0.9, 12, 1, true), iron);
  dome.position.y = H + 0.45; g.add(dome);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 4, 8), iron);
  hook.position.y = H + 1.0; g.add(hook);
  // door on the +X side (swings open when the scholar leaves)
  const door = new THREE.Group();
  door.position.set(R * Math.cos(-0.35), 0, R * Math.sin(-0.35));
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, H, 4).translate(0, H / 2, 0.2 * (i + 0.5)), iron); door.add(b); }
  const dbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.7).translate(0, H * 0.55, 0.35), iron); door.add(dbar);
  g.add(door);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  // chain as a stretched cylinder
  const chainM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).translate(0, 0.5, 0), iron);
  const root = new THREE.Group();
  root.add(g, chainM);
  ctx.dynamicRoot.add(root);
  const col = ctx.shared.collision?.addDynamicBox('academy:cage:' + id, [R * 2, H, R * 2], 'metal');
  const pos = (t: number) => {
    const e = Math.min(1, Math.max(0, t));
    const s = e * e * (3 - 2 * e);
    return out.clone().lerp(dock, s).setY(out.y + (dock.y - out.y) * s + Math.sin(e * Math.PI) * 0.8);
  };
  const up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4();
  const piece = {
    object: root, collider: col, door,
    pos,
    set(t: number) {
      const p = pos(t);
      g.position.copy(p);
      g.rotation.z = Math.sin(t * 9) * 0.04 * (1 - t);
      const top = p.clone().setY(p.y + H + 1.0);
      const d = gantry.clone().sub(top);
      chainM.position.copy(top);
      chainM.scale.set(1, d.length(), 1);
      chainM.quaternion.setFromUnitVectors(up, d.normalize());
      col?.setMatrix(m4.makeTranslation(p.x, p.y + H / 2, p.z));
    },
  };
  piece.set(0);
  return piece;
}

/**
 * Ansel Wick's drafting board: an easel with a large sheet. State 0 shows the striking-engine of
 * a great bell (the future he builds for Aldren); state 1 the storm-bell for the sea wall.
 */
export function draftingBoard(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, yaw: number): Piece {
  k.push(x, y, z, yaw);
  for (const s of [-1, 1]) k.box('timber_dark', s * 0.9, 1.1, -0.2, 0.08, 2.2, 0.08, { rx: -0.2, cast: false });
  k.box('timber_dark', 0, 1.0, 0.3, 0.08, 2.0, 0.08, { rx: 0.35, cast: false });
  k.box('planks', 0, 1.45, -0.08, 2.0, 1.4, 0.05, { rx: -0.2, cast: false });
  k.box('parchment', 0, 1.45, -0.04, 1.84, 1.24, 0.01, { rx: -0.2, cast: false });
  const base = k.wp(0, 1.45, -0.02);
  const wy = k.wyaw(0);
  k.pop();
  const ink = new THREE.MeshBasicMaterial({ color: 0x2a2018 });
  const mk = (lines: [number, number, number, number][], circles: [number, number, number][]) => {
    const grp = new THREE.Group();
    const parts: THREE.BufferGeometry[] = [];
    for (const [x0, y0, x1, y1] of lines) {
      const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
      parts.push(new THREE.PlaneGeometry(L, 0.014).rotateZ(a).translate((x0 + x1) / 2, (y0 + y1) / 2, 0));
    }
    for (const [cx, cy, r] of circles) parts.push(new THREE.RingGeometry(r - 0.007, r + 0.007, 24).translate(cx, cy, 0));
    for (const p of parts) grp.add(new THREE.Mesh(p, ink));
    return grp;
  };
  // the striking-engine: a great bell, yoke, cams and a long lever arm
  const engine = mk([
    [-0.5, 0.35, 0.5, 0.35], [-0.45, 0.35, -0.45, -0.5], [0.45, 0.35, 0.45, -0.5], [-0.3, 0.2, -0.36, -0.3], [0.3, 0.2, 0.36, -0.3], [-0.36, -0.3, 0.36, -0.3],
    [0.45, 0.1, 0.85, -0.45], [0.85, -0.45, 0.7, -0.52], [-0.8, 0.5, 0.8, 0.5], [0, 0.35, 0, 0.5],
  ], [[0, 0.1, 0.08], [0.45, 0.1, 0.1], [-0.6, -0.2, 0.12], [-0.6, -0.2, 0.05]]);
  // the storm-bell: a small bell on a sea wall, a float on a chain in the swell
  const storm = mk([
    [-0.8, -0.3, 0.8, -0.3], [-0.2, -0.3, -0.2, 0.3], [0.2, -0.3, 0.2, 0.3], [-0.25, 0.3, 0.25, 0.3], [-0.1, 0.25, -0.14, 0.05], [0.1, 0.25, 0.14, 0.05], [-0.14, 0.05, 0.14, 0.05],
    [0.2, -0.1, 0.55, -0.45], [-0.8, -0.5, -0.5, -0.45], [-0.5, -0.45, -0.2, -0.52], [-0.2, -0.52, 0.1, -0.46], [0.1, -0.46, 0.45, -0.52], [0.45, -0.52, 0.8, -0.47],
  ], [[0.58, -0.48, 0.06], [0, 0.4, 0.05]]);
  const holder = new THREE.Group();
  holder.position.copy(base); holder.rotation.set(0, wy, 0);
  const tilt = new THREE.Group(); tilt.rotation.x = -0.2; tilt.position.z = 0.02;
  tilt.add(engine, storm);
  holder.add(tilt);
  ctx.dynamicRoot.add(holder);
  const piece: Piece = { object: holder, set(t: number) { engine.visible = t < 0.5; storm.visible = t >= 0.5; } };
  piece.set(0);
  return piece;
}

/**
 * Cliff face along (x0,z0)→(x1,z1) from y0 to y1: a backing slab BEHIND the line plus jittered
 * rocks whose centres sit behind the line so they bulge out at most ~0.35 r. `side` = +1 bulges
 * toward the line direction's left normal (for a west→east line that is +Z, south). Visual only.
 */
export function cliffWall(k: Kit, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, seed: number, side = 1, rMax = 3.2, mat: MaterialId = 'rock_cliff') {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  const nx = -dz * side, nz = dx * side;
  const H = y1 - y0;
  k.push((x0 + x1) / 2 - nx * 1.6, y0, (z0 + z1) / 2 - nz * 1.6, Math.atan2(-dz, dx));
  k.bmm(mat === 'rock_cliff' ? 'stone_dark' : mat, -len / 2, 0, -1.4, len / 2, H, 1.4, { cast: true });
  k.pop();
  const n = Math.max(2, Math.round(len / (rMax * 0.95)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
    const r = k.rng.range(rMax * 0.6, rMax);
    const layers = Math.max(1, Math.round(H / (r * 1.25)));
    for (let j = 0; j < layers; j++) {
      const rr = r * k.rng.range(0.8, 1.15);
      const yy = y0 + (H * (j + 0.5)) / layers + k.rng.range(-0.4, 0.4);
      const back = rr * k.rng.range(0.62, 0.85);
      k.add(mat, rock(rr, seed * 97 + i * 13 + j, k.rng.range(0.85, 1.35), 1), { x: px - nx * back, y: yy, z: pz - nz * back, ry: k.rng.range(0, 6) }, { cast: true });
    }
  }
}

/** The Academy mark carved in stone: a diamond with a slit eye. Faces local +Z. */
export function academyMark(k: Kit, x: number, y: number, z: number, yaw: number, s = 1, mat: MaterialId = 'stone_trim', eyeMat: MaterialId = 'bell_light') {
  k.push(x, y, z, yaw);
  const d = 0.9 * s;
  for (const [cx, cy, a] of [[d / 2, d / 2, -Math.PI / 4], [-d / 2, d / 2, Math.PI / 4], [-d / 2, -d / 2, -Math.PI / 4], [d / 2, -d / 2, Math.PI / 4]] as const) {
    k.box(mat, cx, cy, 0, d * 1.414 + 0.12 * s, 0.14 * s, 0.1 * s, { rz: a, cast: false });
  }
  // eye: two shallow arcs and a vertical slit pupil
  for (const sy of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const a0 = -0.9 + (1.8 * i) / 6, a1 = -0.9 + (1.8 * (i + 1)) / 6;
      const R = 0.55 * s;
      const p0 = [Math.sin(a0) * R, sy * (Math.cos(a0) * R - R * 0.62)], p1 = [Math.sin(a1) * R, sy * (Math.cos(a1) * R - R * 0.62)];
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      k.box(mat, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0.02, L + 0.02, 0.06 * s, 0.08 * s, { rz: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), cast: false });
    }
  }
  k.box(eyeMat, 0, 0, 0.05, 0.06 * s, 0.34 * s, 0.04, { cast: false });
  k.pop();
}
