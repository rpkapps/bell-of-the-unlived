/**
 * The Suspended Laboratories: glass laboratories hung on chains from an iron gantry over a sea
 * chasm, joined by chain bridges. Lab A (refraction), Lab B (the homunculus nursery, the
 * scholar's cage on its winch), Laboratory No. 9 (optional mid-boss: Aberrant Experiment No. 9)
 * and the scaffold climb up to the Spire Yard.
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import { floor, bound, stairs, papers, candles, shelves, cyl, sphere, crateStack, barrel, bracketLantern } from '../../world/kit';
import { getMaterial } from '../../render/materials';
import {
  type AreaCtx, type Piece, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, scaffold, chain, cliffWall, glassHouse, lensApparatus,
  fogGate, cagePiece, box3,
} from './levelCommon';
import type { Kit } from '../../world/kit';

export interface LabsBuild {
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, Piece>;
  triggers: Record<string, THREE.Box3>;
  lab9: { fogGate: ReturnType<typeof fogGate>; vat: Piece };
}

/** Plank-and-iron deck with side bounds between two points on a straight line (x or z). */
function chainBridge(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, w: number, gantryY: number) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const [sx, sz] = alongX ? [len, w] : [w, len];
  k.bmm('iron', cx - sx / 2, y - 0.35, cz - sz / 2, cx + sx / 2, y - 0.15, cz + sz / 2, { cast: true });
  const n = Math.round(len / 0.36);
  for (let i = 0; i < n; i++) {
    const u = -len / 2 + (len * (i + 0.5)) / n;
    const px = alongX ? cx + u : cx, pz = alongX ? cz : cz + u;
    k.box('planks', px, y - 0.07, pz, alongX ? 0.32 : w, 0.12, alongX ? w : 0.32, { ry: (i % 5 - 2) * 0.006, cast: false });
  }
  k.solid(cx - sx / 2, y - 0.4, cz - sz / 2, cx + sx / 2, y, cz + sz / 2, 'wood');
  // side chains (sagging handrails) with posts, and hangers to the gantry
  for (const s of [-1, 1]) {
    const ox = alongX ? 0 : s * (w / 2), oz = alongX ? s * (w / 2) : 0;
    const a = alongX ? new THREE.Vector3(x0, y + 1.1, cz + oz) : new THREE.Vector3(cx + ox, y + 1.1, z0);
    const b = alongX ? new THREE.Vector3(x1, y + 1.1, cz + oz) : new THREE.Vector3(cx + ox, y + 1.1, z1);
    const m = a.clone().lerp(b, 0.5); m.y -= 0.35;
    chain(k, a, m, 0.2, 0.04); chain(k, m, b, 0.2, 0.04);
    k.box('iron', a.x, y + 0.55, a.z, 0.1, 1.1, 0.1, { cast: false });
    k.box('iron', b.x, y + 0.55, b.z, 0.1, 1.1, 0.1, { cast: false });
    if (alongX) bound(k, x0, cz + oz, x1, cz + oz, y, 1.3, 0.14); else bound(k, cx + ox, z0, cx + ox, z1, y, 1.3, 0.14);
    for (const t of [0.33, 0.66]) {
      const p = a.clone().lerp(b, t);
      chain(k, [p.x, y - 0.2, p.z], [p.x, gantryY, p.z], 0.34, 0.05);
    }
  }
}

/** Platform slab with an iron frame and railings (gaps listed as [side, from, to] along that side). */
function platform(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, gaps: ['n' | 's' | 'e' | 'w', number, number][], gantryY: number) {
  floor(k, 'planks', x0, z0, x1, z1, y, 0.35, 'wood');
  k.bmm('iron', x0 - 0.15, y - 0.8, z0 - 0.15, x1 + 0.15, y - 0.35, z1 + 0.15, { cast: true });
  for (let x = x0 + 1; x < x1; x += 2) k.box('iron', x, y - 0.6, (z0 + z1) / 2, 0.16, 0.4, z1 - z0, { cast: false });
  const sides: ['n' | 's' | 'e' | 'w', number, number, number, number][] = [['n', x0, z0, x1, z0], ['s', x0, z1, x1, z1], ['w', x0, z0, x0, z1], ['e', x1, z0, x1, z1]];
  for (const [side, ax, az, bx, bz] of sides) {
    const horiz = side === 'n' || side === 's';
    const lo = horiz ? ax : az, hi = horiz ? bx : bz;
    const cuts = gaps.filter((g) => g[0] === side).map((g) => [g[1], g[2]] as [number, number]).sort((p, q) => p[0] - q[0]);
    let cur = lo;
    const segs: [number, number][] = [];
    for (const [g0, g1] of cuts) { if (g0 - cur > 0.1) segs.push([cur, g0]); cur = g1; }
    if (hi - cur > 0.1) segs.push([cur, hi]);
    for (const [s0, s1] of segs) {
      const p0 = horiz ? [s0, az] : [ax, s0], p1 = horiz ? [s1, az] : [ax, s1];
      const n = Math.max(1, Math.round((s1 - s0) / 0.6));
      for (let i = 0; i <= n; i++) k.box('iron', p0[0] + ((p1[0] - p0[0]) * i) / n, y + 0.5, p0[1] + ((p1[1] - p0[1]) * i) / n, 0.05, 1.0, 0.05, { cast: false });
      k.box('iron', (p0[0] + p1[0]) / 2, y + 1.02, (p0[1] + p1[1]) / 2, Math.abs(p1[0] - p0[0]) + 0.06, 0.06, Math.abs(p1[1] - p0[1]) + 0.06, { cast: false });
      bound(k, p0[0], p0[1], p1[0], p1[1], y, 1.3, 0.14);
    }
  }
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) chain(k, [x, y + 0.2, z], [x + (x < (x0 + x1) / 2 ? 1.5 : -1.5), gantryY, (z0 + z1) / 2], 0.34, 0.06);
}

export function buildLabs(ctx: AreaCtx): LabsBuild {
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, Piece> = {};
  const triggers: Record<string, THREE.Box3> = {};
  const enemies: EnemySpawn[] = [];
  const k = newKit(ctx, 'labs', 501, 18);
  const GY = 34;
  const BW = PLAN.bridgeW, A = PLAN.labA, B = PLAN.labB, L9 = PLAN.lab9;

  // ================================================================== gantry (iron trusses over the chasm)
  const truss = (x0: number, z0: number, x1: number, z1: number) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const dy of [0, 2.4]) k.box('iron_rusted', cx, GY + dy, cz, alongX ? len : 0.35, 0.35, alongX ? 0.35 : len, { cast: true });
    const n = Math.round(len / 2.4);
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (len * (i + 0.5)) / n;
      const a = Math.atan2(2.4, len / n) * (i % 2 ? 1 : -1);
      k.box('iron_rusted', alongX ? cx + u : cx, GY + 1.2, alongX ? cz : cz + u, alongX ? Math.hypot(len / n, 2.4) : 0.16, 0.16, alongX ? 0.16 : Math.hypot(len / n, 2.4), alongX ? { rz: a, cast: false } : { rx: a, cast: false });
      k.box('iron_rusted', alongX ? cx + u - len / n / 2 : cx, GY + 1.2, alongX ? cz : cz + u - len / n / 2, 0.14, 2.4, 0.14, { cast: false });
    }
  };
  truss(-70, BW.z, -16, BW.z);
  truss(-70, B.z0 + 6, -30, B.z0 + 6);
  truss(-38, -46, -38, 2);
  truss(-57, -46, -57, 2);
  for (const [x, z] of [[-30, B.z0 + 6], [-16, BW.z]] as const) k.bmm('stone_dark', x - 1, -5, z - 1, x + 1, GY + 2.6, z + 1, { cast: true });

  // ================================================================== chasm walls
  cliffWall(k, -70, -48, -70, -2, -4, 30, 51, -1, 3.6);
  cliffWall(k, -70, -48.5, -33, -48.5, -4, 26, 52, 1, 3.6);
  cliffWall(k, -33.4, -46, -33.4, -18.6, -4, 23.6, 53, 1, 3);
  cliffWall(k, -33.4, -18.6, 16.5, -18.6, -4, 23.6, 54, 1, 3);
  cliffWall(k, -70, -5.4, -57.6, -5.4, -4, 19, 55, -1, 3);
  cliffWall(k, -57.6, -5.4, -16.6, -5.4, -4, 1.5, 56, -1, 2.4);

  // ================================================================== the chain bridge from the hall
  chainBridge(k, BW.x0, BW.z, BW.x1 + 0.6, BW.z, BW.y, BW.w, GY);
  enemies.push({ id: 'ac_hom_bridge1', kind: 'homunculus', anchor: anchor(-25, BW.y, BW.z, YAW_E), leash: 12 });
  enemies.push({ id: 'ac_hom_bridge2', kind: 'homunculus', anchor: anchor(-28.5, BW.y, BW.z + 0.5, YAW_E), leash: 12 });

  // ================================================================== lab A (refraction)
  const ax = (A.x0 + A.x1) / 2, az = (A.z0 + A.z1) / 2;
  platform(k, A.x0, A.z0, A.x1, A.z1, A.y, [['e', BW.z - 1.3, BW.z + 1.3], ['w', az - 1.1, az + 1.1], ['n', ax - 1.3, ax + 1.3]], GY);
  glassHouse(k, ax, A.y, az, 6.6, 6.6, 3.6, ['e', 'w', 'n'], { col: true });
  lensApparatus(k, ax - 1.5, A.y, az + 1.6, YAW_E, 0.6, 1.5);
  lensApparatus(k, ax + 1.5, A.y, az + 1.6, YAW_W, 0.6, 1.5);
  k.bmm('timber_dark', ax - 2.6, A.y + 0.85, az - 2.6, ax + 0.4, A.y + 0.95, az - 1.8, { col: 'wood' });
  papers(k, ax - 1.5, A.y + 0.95, az - 2.2, 4);
  for (let i = 0; i < 5; i++) k.add('glass', sphere(0.12 + (i % 2) * 0.06, 8, 6), { x: ax - 2.3 + i * 0.5, y: A.y + 1.1, z: az - 2.2 }, { cast: false });
  anchors.wardScroll = anchor(ax - 2.2, A.y, az - 1.2, YAW_N);
  // Wick's second notebook, left open on a stool by the east door
  k.box('timber_dark', A.x1 - 1.2, A.y + 0.35, az + 2.1, 0.45, 0.7, 0.45, { col: 'wood' });
  k.box('parchment', A.x1 - 1.2, A.y + 0.72, az + 2.1, 0.38, 0.03, 0.28, { ry: 0.3, cast: false });
  anchors.wickNotesB = anchor(A.x1 - 1.2, A.y, az + 1.2, YAW_S);
  enemies.push({ id: 'ac_echo_labA', kind: 'echoConstruct', anchor: anchor(ax, A.y, az, YAW_E), leash: 9 });

  // ================================================================== lab A → lab B bridge, lab B (the nursery)
  chainBridge(k, ax, A.z0, ax, B.z1, A.y, 2.6, GY);
  const bx = (B.x0 + B.x1) / 2 + 0.5, bz = (B.z0 + B.z1) / 2 + 0.5;
  const C = PLAN.cage;
  platform(k, B.x0, B.z0, B.x1, B.z1, B.y, [['s', ax - 1.3, ax + 1.3], ['w', C.z - 1.1, C.z + 1.1], ['n', -43, -40]], GY);
  glassHouse(k, bx, B.y, bz, 9, 8, 4.4, ['s', 'w', 'n'], { col: true });
  // growth vats: glass cylinders with pale shapes inside
  for (const [x, z] of [[bx - 3, bz - 2.6], [bx - 1, bz - 2.6], [bx + 1, bz - 2.6], [bx + 3, bz - 2.6]] as const) {
    k.add('iron', cyl(0.62, 0.62, 0.3, 14), { x, y: B.y, z });
    k.add('glass', cyl(0.55, 0.55, 1.8, 14, true), { x, y: B.y + 0.3, z }, { cast: false });
    k.add('iron', cyl(0.62, 0.58, 0.25, 14), { x, y: B.y + 2.1, z });
    k.add('wax', sphere(0.2, 8, 6), { x: x + 0.05, y: B.y + 1.0, z }, { cast: false });
    k.solid(x - 0.6, B.y, z - 0.6, x + 0.6, B.y + 2.3, z + 0.6, 'metal');
  }
  shelves(k, bx + 3.4, B.y, bz + 3.2, YAW_N, 1.8, 2.2, true);
  crateStack(k, bx - 3.4, B.y, bz + 3, 0.2);
  // the winch for the cage (west edge)
  const wz = C.z - 3.0;
  k.box('timber_dark', B.x0 + 0.5, B.y + 0.5, wz, 0.3, 1.0, 0.3, { col: 'wood' });
  k.box('timber_dark', B.x0 + 2.2, B.y + 0.5, wz, 0.3, 1.0, 0.3, { col: 'wood' });
  k.add('timber_dark', cyl(0.3, 0.3, 1.5, 10), { x: B.x0 + 1.35, y: B.y + 0.9, z: wz, rz: Math.PI / 2 });
  k.solid(B.x0 + 0.5, B.y, wz - 0.3, B.x0 + 2.2, B.y + 1.2, wz + 0.3, 'wood');
  for (let i = 0; i < 4; i++) k.box('iron', B.x0 + 2.4, B.y + 0.9, wz, 0.06, 0.9, 0.08, { rx: (i * Math.PI) / 4, cast: false });
  anchors.winch = anchor(B.x0 + 1.35, B.y, wz + 1.0, YAW_N);
  // the cage gantry arm above the dock
  const gantryPt = new THREE.Vector3(C.outX + 2.5, B.y + 12.5, C.z);
  k.box('iron_rusted', (B.x0 + gantryPt.x) / 2, gantryPt.y + 0.3, C.z, B.x0 - gantryPt.x + 3, 0.4, 0.4);
  k.box('iron_rusted', B.x0 + 0.5, (B.y + gantryPt.y) / 2, C.z + 1.6, 0.35, gantryPt.y - B.y, 0.35, { col: true });
  k.box('iron_rusted', B.x0 + 0.5, gantryPt.y + 0.3, C.z + 0.8, 0.3, 0.3, 1.6);
  const cage = cagePiece(ctx, 'wick', gantryPt, new THREE.Vector3(C.outX, C.yOut, C.z), new THREE.Vector3(C.dockX, C.y - 0.1, C.z));
  pieces.cage = cage;
  anchors.cageDocked = anchor(B.x0 + 0.6, B.y, C.z, YAW_W);
  anchors.cageSpeak = anchor(B.x0 + 0.9, B.y, C.z, YAW_W);
  enemies.push({ id: 'ac_golem_labB', kind: 'suspendedGolem', anchor: anchor(bx, B.y, bz + 0.5, YAW_S), leash: 10 });
  enemies.push({ id: 'ac_hom_labB1', kind: 'homunculus', anchor: anchor(bx - 2, B.y, bz - 1, YAW_S), leash: 11 });
  enemies.push({ id: 'ac_hom_labB2', kind: 'homunculus', anchor: anchor(bx + 2.5, B.y, bz - 0.5, YAW_S), leash: 11 });
  enemies.push({ id: 'ac_hom_labB3', kind: 'homunculus', anchor: anchor(B.x0 + 2, B.y, B.z0 + 1.2, YAW_E), leash: 11 });
  anchors.scrapLabB = anchor(bx + 3.4, B.y, bz + 2.2, YAW_N);
  bracketLantern(k, bx - 4.4, B.y + 2.6, bz, YAW_E);
  k.light(0xd8e8c0, 5, 12, bx, B.y + 3, bz, 0.2);

  // ================================================================== scaffold climb to the spire yard
  const SU = PLAN.scaffoldUp, ST = PLAN.scaffoldTop;
  scaffold(k, SU.x - 2.9, SU.z1 - 1, SU.x + 2.9, SU.z0 - 0.3, -3, SU.y0 - 0.5, { bay: 5.8, lift: 2.6, decks: [] });
  for (const sx of [-1, 1]) for (const z of [SU.z1, (SU.z0 + SU.z1) / 2, SU.z0]) k.box('timber', SU.x + sx * 1.8, (SU.y0 + ST.y) / 2 - 0.2, z, 0.16, ST.y - SU.y0 + 1.2, 0.16, { cast: true });
  stairs(k, 'planks', [SU.x, SU.y0, SU.z0], [SU.x, SU.y1, SU.z1], SU.w, { floating: true, riser: 0.22, surface: 'wood' });
  const run = SU.z0 - SU.z1, rise = SU.y1 - SU.y0, sl = Math.atan2(rise, run), Ls = Math.hypot(run, rise);
  for (const s of [-1, 1]) {
    k.box('timber', SU.x + s * (SU.w / 2 + 0.1), (SU.y0 + SU.y1) / 2 + 1.0, (SU.z0 + SU.z1) / 2, 0.1, 0.1, Ls, { rx: sl, cast: false });
    k.solidC(SU.x + s * (SU.w / 2 + 0.1), (SU.y0 + SU.y1) / 2 + 0.6, (SU.z0 + SU.z1) / 2, 0.14, 1.8, Ls, [sl, 0, 0], 'wood');
  }
  floor(k, 'planks', ST.x0, ST.z0, ST.x1, ST.z1, ST.y, 0.35, 'wood');
  k.bmm('iron', ST.x0, ST.y - 0.7, ST.z0, ST.x1, ST.y - 0.35, ST.z1, { cast: true });
  bound(k, ST.x0, ST.z0, ST.x1, ST.z0, ST.y, 1.3, 0.14);
  bound(k, ST.x0, ST.z0, ST.x0, ST.z1, ST.y, 1.3, 0.14);
  bound(k, ST.x0, ST.z1, SU.x - SU.w / 2 - 0.2, ST.z1, ST.y, 1.3, 0.14);
  bound(k, SU.x + SU.w / 2 + 0.2, ST.z1, ST.x1, ST.z1, ST.y, 1.3, 0.14);
  for (let x = ST.x0 + 0.3; x < ST.x1; x += 0.6) k.box('timber', x, ST.y + 0.55, ST.z0, 0.06, 1.1, 0.06, { cast: false });
  enemies.push({ id: 'ac_aco_scaffold', kind: 'glassAcolyte', anchor: anchor(-37.5, ST.y, -44.2, YAW_S), leash: 9 });

  // ================================================================== laboratory No. 9 (mid-boss arena)
  const Lc = L9.c;
  chainBridge(k, A.x0, BW.z, Lc.x + L9.r - 0.3, BW.z, A.y, 2.4, GY);
  const disc = new THREE.CylinderGeometry(L9.r, L9.r, 0.6, 28);
  k.add('planks', disc.clone(), { x: Lc.x, y: Lc.y - 0.3, z: Lc.z }, { cast: false });
  k.colGeo(disc, { x: Lc.x, y: Lc.y - 0.3, z: Lc.z }, 'wood');
  k.add('iron', new THREE.CylinderGeometry(L9.r + 0.2, L9.r - 1, 1.4, 28, 1, true), { x: Lc.x, y: Lc.y - 1.3, z: Lc.z }, { cast: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box('iron', Lc.x + Math.cos(a) * L9.r * 0.5, Lc.y - 0.62, Lc.z + Math.sin(a) * L9.r * 0.5, L9.r, 0.14, 0.2, { ry: -a, cast: false });
  }
  // rim railing (gap east) and dome ribs
  const nR = 30;
  for (let i = 0; i < nR; i++) {
    const a0 = (i / nR) * Math.PI * 2, a1 = ((i + 1) / nR) * Math.PI * 2, am = (a0 + a1) / 2;
    if (Math.cos(am) > 0.97) continue;
    const p0 = [Lc.x + Math.cos(a0) * (L9.r - 0.1), Lc.z + Math.sin(a0) * (L9.r - 0.1)], p1 = [Lc.x + Math.cos(a1) * (L9.r - 0.1), Lc.z + Math.sin(a1) * (L9.r - 0.1)];
    k.box('iron', p0[0], Lc.y + 0.55, p0[1], 0.06, 1.1, 0.06, { cast: false });
    bound(k, p0[0], p0[1], p1[0], p1[1], Lc.y, 1.6, 0.2);
  }
  k.add('iron', new THREE.TorusGeometry(L9.r - 0.1, 0.04, 4, 40), { x: Lc.x, y: Lc.y + 1.1, z: Lc.z, rx: Math.PI / 2 }, { cast: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    if (i === 3) continue; // a fallen rib
    for (let j = 0; j < 6; j++) {
      const t0 = j / 6, t1 = (j + 1) / 6;
      const r0 = L9.r * Math.cos(t0 * Math.PI / 2), r1 = L9.r * Math.cos(t1 * Math.PI / 2);
      const y0 = Lc.y + 9 * Math.sin(t0 * Math.PI / 2), y1 = Lc.y + 9 * Math.sin(t1 * Math.PI / 2);
      const x0 = Lc.x + Math.cos(a) * r0, z0 = Lc.z + Math.sin(a) * r0, x1 = Lc.x + Math.cos(a) * r1, z1 = Lc.z + Math.sin(a) * r1;
      const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()), 'YXZ');
      k.box('iron', (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0.16, L, 0.16, { rx: e.x, ry: e.y, rz: e.z, cast: true });
      if (j < 3 && (i + j) % 3 === 0) k.box('glass', (x0 + x1) / 2 + Math.sin(a) * 0.9, (y0 + y1) / 2, (z0 + z1) / 2 - Math.cos(a) * 0.9, 0.02, L, 1.9, { ry: -a, cast: false });
    }
  }
  chain(k, [Lc.x, Lc.y + 9, Lc.z], [Lc.x, GY, Lc.z], 0.4, 0.08);
  // the broken vat the experiment climbed out of (north side)
  k.add('iron', cyl(1.5, 1.6, 0.5, 18), { x: Lc.x - 2, y: Lc.y, z: Lc.z - 4.2 });
  k.solid(Lc.x - 3.5, Lc.y, Lc.z - 5.7, Lc.x - 0.5, Lc.y + 0.5, Lc.z - 2.7, 'metal');
  const vat = vatPiece(ctx, new THREE.Vector3(Lc.x - 2, Lc.y + 0.5, Lc.z - 4.2));
  k.box('wax', Lc.x - 1.4, Lc.y + 0.55, Lc.z - 4.5, 0.8, 0.1, 0.5, { cast: false });
  k.light(0xc8f0e0, 6, 16, Lc.x, Lc.y + 4, Lc.z, 0.3);
  const fg = fogGate(ctx, 'experiment9', Lc.x + L9.r + 0.7, Lc.y, Lc.z, YAW_W, 2.6, 3.4);
  anchors.lab9Entry = anchor(Lc.x + L9.r + 2.6, Lc.y, Lc.z, YAW_W);
  anchors.lab9Spawn = anchor(Lc.x - 2.5, Lc.y, Lc.z, YAW_E);
  anchors.lab9Reward = anchor(Lc.x - 2, Lc.y, Lc.z - 2.3, YAW_N);
  triggers.labs = box3(-46, 16, -33, -31, 24, -4);
  void YAW_S; void YAW_N; void barrel; void candles; void getMaterial;
  return { enemies, anchors, pieces, triggers, lab9: { fogGate: fg, vat } };
}

/** Glass vat panes around the experiment's tank: t=1 → they burst outward and fall. */
function vatPiece(ctx: AreaCtx, base: THREE.Vector3): Piece {
  const g = new THREE.Group();
  const glass = getMaterial('glass');
  const panes: { m: THREE.Mesh; a: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 3.2, 3, 1, true, a, Math.PI / 4), glass);
    m.position.copy(base).add(new THREE.Vector3(0, 1.6, 0));
    g.add(m);
    panes.push({ m, a: a + Math.PI / 8 });
  }
  const col = ctx.shared.collision?.addDynamicBox('academy:vat', [2.8, 3.2, 2.8], 'metal');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(base.x, base.y + 1.6, base.z));
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.1, 5, 20).rotateX(Math.PI / 2), getMaterial('iron'));
  crown.position.copy(base).add(new THREE.Vector3(0, 3.2, 0));
  g.add(crown);
  ctx.dynamicRoot.add(g);
  const piece: Piece = {
    object: g, collider: col,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      if (col) col.enabled = e < 0.4;
      for (const p of panes) {
        const dx = Math.sin(p.a), dz = Math.cos(p.a);
        p.m.position.set(base.x + dx * e * 2.2, base.y + 1.6 - e * e * 1.4, base.z + dz * e * 2.2);
        p.m.rotation.set(e * 1.2 * dz, 0, -e * 1.2 * dx);
        p.m.visible = e < 0.98;
      }
      crown.position.y = base.y + 3.2 - e * 2.6;
      crown.rotation.z = e * 0.6;
    },
  };
  piece.set(0);
  return piece;
}
