/**
 * The lower campus: the Sea Causeway (entry Stillbell, surf on both sides), the landing at the
 * cliff foot with the Sea Gate (shortcut, opened from inside), the acolytes' balcony, the tidal
 * rocks (secret), the Tidal Stair, the Drowned Theatre (half flooded by a sea that isn't there any
 * more, half dry and lamplit), the Prompters' Passage and the Lift Well with the scaffold lift.
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import {
  floor, parapet, wall, stairs, stillbellShrine, bellPost, bracketLantern, candelabrum, crateStack, barrel, rockProp,
  rubble, fallenBeam, shelves, desk, papers, candles, ledger, lantern, cyl, extrudeXY, ringSector, archway, barrelVault, bound,
  column, type StillbellShrine, sconceTorch,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import {
  type AreaCtx, type Piece, newKit, anchor, PLAN, theatreY, YAW_N, YAW_S, YAW_E, YAW_W, scaffold, chain, cliffWall, academyMark,
  lectureDesk, lensApparatus, portcullis, lever, liftPiece, box3,
} from './levelCommon';

export interface LowerBuild {
  shrine: StillbellShrine;
  playerStart: Anchor;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, Piece>;
  triggers: Record<string, THREE.Box3>;
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
  water: THREE.Mesh[];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildLower(ctx: AreaCtx): LowerBuild {
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, Piece> = {};
  const triggers: Record<string, THREE.Box3> = {};
  const enemies: EnemySpawn[] = [];
  const water: THREE.Mesh[] = [];

  // ================================================================== causeway & bastion
  const k = newKit(ctx, 'causeway', 301, 2);
  const C = PLAN.causeway, B = PLAN.bastion;
  floor(k, 'cobble', C.x0, C.z0, C.x1, C.z1, C.y, 0.5);
  // the causeway body standing in the surf, with cutwaters
  k.bmm('stone_dark', C.x0 - 0.3, -6, C.z0, C.x1 + 0.3, C.y - 0.5, C.z1, { cast: true });
  for (let z = C.z0 + 3; z < C.z1; z += 6) {
    for (const s of [-1, 1]) {
      k.add('stone_dark', extrudeXY([[0, -1.1], [1.4, 0], [0, 1.1]], 7.5), { x: s * (C.x1 + 0.3), y: -2.2, z, ry: s > 0 ? 0 : Math.PI, rx: -Math.PI / 2 }, { cast: true });
    }
    k.box('stone_trim', 0, C.y - 0.35, z, C.x1 * 2 + 1.0, 0.25, 0.6, { cast: false });
  }
  for (const s of [-1, 1]) parapet(k, 'stone_wall', s * (C.x1 + 0.2), C.z0, s * (C.x1 + 0.2), C.z1, C.y, 0.45, 1.05);
  // lanterns on iron posts every ~11 m
  for (let z = C.z0 + 5; z < C.z1; z += 11) {
    for (const s of [-1, 1]) {
      const x = s * (C.x1 + 0.2);
      k.add('iron', cyl(0.05, 0.07, 2.4, 6), { x, y: C.y + 1.0, z });
      k.box('iron', x - s * 0.25, C.y + 3.35, z, 0.5, 0.05, 0.05, { cast: false });
      lantern(k, x - s * 0.45, C.y + 3.3, z);
    }
  }
  k.light(0xffc590, 5, 12, 0, C.y + 3.2, C.z0 + 16, 0.4);
  // bastion (the entry): an octagon over the surf
  const oct = new THREE.CylinderGeometry(B.r, B.r + 0.3, 1, 8);
  k.add('flagstone', oct.clone().scale(1, 0.5, 1), { x: B.x, y: C.y - 0.25, z: B.z, ry: Math.PI / 8 }, { cast: false });
  k.colGeo(oct.clone().scale(1, 0.5, 1), { x: B.x, y: C.y - 0.25, z: B.z, ry: Math.PI / 8 });
  k.add('stone_dark', new THREE.CylinderGeometry(B.r + 0.3, B.r + 1.4, 8, 8, 1, true), { x: B.x, y: -2.5, z: B.z, ry: Math.PI / 8 }, { cast: true });
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI / 8 + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4;
    const p0 = [B.x + Math.cos(a0) * (B.r - 0.2), B.z + Math.sin(a0) * (B.r - 0.2)], p1 = [B.x + Math.cos(a1) * (B.r - 0.2), B.z + Math.sin(a1) * (B.r - 0.2)];
    const mid = (a0 + a1) / 2;
    if (Math.sin(mid) < -0.9) continue; // north: the causeway leaves here
    parapet(k, 'stone_wall', p0[0], p0[1], p1[0], p1[1], C.y, 0.5, 1.05);
  }
  const shrine = stillbellShrine(k, B.x, C.y, B.z + 3.2, YAW_N, 7);
  academyMark(k, B.x, C.y + 4.4, B.z + 3.75, YAW_N, 0.8);
  bellPost(k, B.x + 3.6, C.y, B.z + 1.8, YAW_N);
  // a drowned bench and a mooring bollard
  k.add('iron', cyl(0.18, 0.24, 0.8, 8), { x: -4.2, y: C.y, z: B.z - 2.4 });
  k.box('timber_dark', 3.8, C.y + 0.25, B.z - 3.0, 1.6, 0.1, 0.5, { cast: false });
  anchors.arrival = anchor(B.x, C.y, B.z - 1.6, YAW_N);

  // ================================================================== landing, cliff, sea gate
  const l = newKit(ctx, 'landing', 302, 2);
  const L = PLAN.landing, G = PLAN.seaGate, CZ = PLAN.cliffZ;
  floor(l, 'flagstone', L.x0, L.z0, L.x1, L.z1, L.y, 0.5);
  l.bmm('stone_dark', L.x0, -6, L.z0, L.x1, L.y - 0.5, L.z1, { cast: true });
  // south parapets (gap for the causeway), west (gap for the tidal stair), east (gaps for the balcony stair and the rocks)
  parapet(l, 'stone_wall', L.x0, L.z1, C.x0 - 0.2, L.z1, L.y);
  parapet(l, 'stone_wall', C.x1 + 0.2, L.z1, L.x1, L.z1, L.y);
  parapet(l, 'stone_wall', L.x0, L.z0 + 0.5, L.x0, 23.6, L.y);
  parapet(l, 'stone_wall', L.x0, 27.4, L.x0, L.z1, L.y);
  parapet(l, 'stone_wall', L.x1, L.z0 + 0.2, L.x1, 29.5, L.y);
  // the cliff face behind the landing, with the sea gate passage
  cliffWall(l, -15, CZ + 0.4, -8.8, CZ + 0.4, -4, 19, 11, 1, 2.2);
  cliffWall(l, 8.8, CZ + 0.4, 44, CZ + 0.4, -4, 19, 12, 1, 2.4);
  // the sea-gate bastion: a masonry face in the cliff with the gate passage
  wall(l, 'stone_wall', -8.8, CZ + 0.1, 8.8, CZ + 0.1, -4, 23, 1.6, { openings: [{ u: 0, w: G.x1 - G.x0, sill: L.y + 4, h: G.h, kind: 'flat' }] });
  for (const sx of [-1, 1]) l.bmm('stone_trim', sx * 8.8 - 0.6, -4, CZ - 0.8, sx * 8.8 + 0.6, 19.5, CZ + 1.3, { cast: true });
  l.bmm('stone_trim', -8.8, 17.4, CZ + 0.8, 8.8, 18.0, CZ + 1.2, { cast: false });
  l.solid(-14.5, -6, CZ - 0.2, -8.8, 40, CZ + 0.6);
  l.solid(8.8, -6, CZ - 0.2, 44, 40, CZ + 0.6);
  archway(l, 'stone_wall', 0, L.y, CZ + 1.3, 0, G.x1 - G.x0 + 0.2, G.h - 1.3, 0.8, 'pointed', 1.1, 0.9, false);
  academyMark(l, 0, L.y + G.h + 2.3, CZ + 1.75, YAW_S, 1.0);
  pieces.seaGate = portcullis(ctx, 'seaGate', 0, L.y, CZ - 0.1, 0, G.x1 - G.x0 + 0.1, G.h + 0.6);
  floor(l, 'flagstone', G.x0 - 0.1, CZ - 2.2, G.x1 + 0.1, L.z0 + 0.2, L.y, 0.5);
  // landing dressing: a toll post, crates, nets and a beached skiff
  bellPost(l, 6.5, L.y, 25.5, YAW_W);
  crateStack(l, -9.5, L.y, 21.6, 0.3);
  barrel(l, -7.8, L.y, 21.2, 0, true);
  barrel(l, 8.8, L.y, 21.2, 0.4, true);
  for (let i = 0; i < 5; i++) l.box('rope', -10 + i * 0.35, L.y + 0.9, 20.1, 0.05, 1.6, 0.05, { rz: 0.1 * (i - 2), cast: false });
  bracketLantern(l, -3.8, L.y + 3.2, CZ + 1.0, YAW_S);
  bracketLantern(l, 3.8, L.y + 3.2, CZ + 1.0, YAW_S);
  l.light(0xffc890, 6, 13, 0, L.y + 3.0, CZ + 2.2, 0.35);
  // the acolytes' balcony on the cliff with its stair
  const Bl = PLAN.balcony;
  floor(l, 'flagstone', Bl.x0, Bl.z0, Bl.x1, Bl.z1, Bl.y, 0.5);
  for (let x = Bl.x0 + 0.6; x < Bl.x1; x += 1.8) l.add('stone_trim', extrudeXY([[0, 0], [0.9, 0], [0, -1.6]], 0.5), { x, y: Bl.y - 0.4, z: Bl.z1 - 0.9, ry: -Math.PI / 2 }, { cast: true });
  parapet(l, 'stone_wall', Bl.x0, Bl.z1, 8.3, Bl.z1, Bl.y);
  parapet(l, 'stone_wall', Bl.x0, Bl.z0, Bl.x0, Bl.z1, Bl.y);
  parapet(l, 'stone_wall', Bl.x1, Bl.z0, Bl.x1, Bl.z1 - 0.1, Bl.y, 0.45, 1.05);
  stairs(l, 'stone_wall', [9.35, L.y, 29.6], [9.35, Bl.y, Bl.z1], 1.7, { sideWalls: 0 });
  wall(l, 'stone_wall', 10.4, 29.6, 10.4, Bl.z1, L.y, 5.9, 0.4, { col: true });
  lensApparatus(l, 6.2, Bl.y, Bl.z0 + 0.9, YAW_S, 0.55, 1.4);
  enemies.push({ id: 'ac_aco_balcony', kind: 'glassAcolyte', anchor: anchor(7.2, Bl.y, 21.6, YAW_S), leash: 10 });
  enemies.push({ id: 'ac_hom_l1', kind: 'homunculus', anchor: anchor(-3, L.y, 26.5, YAW_S), leash: 16 });
  enemies.push({ id: 'ac_hom_l2', kind: 'homunculus', anchor: anchor(0.5, L.y, 23.5, YAW_S), leash: 16 });
  enemies.push({ id: 'ac_hom_l3', kind: 'homunculus', anchor: anchor(3.4, L.y, 27.8, YAW_S), leash: 16 });
  // secret: stair down to the tidal rocks (Bellbronze Shard)
  stairs(l, 'stone_dark', [10.9, L.y, 30.3], [15.4, 0.3, 30.3], 1.3);
  l.bmm('rock_cliff', 15, -5, 25.2, 21.5, 0.3, 32, { col: true, cast: true });
  for (const [x, z, r] of [[15.5, 25.3, 1.6], [21.6, 26.5, 2.0], [21.2, 31.5, 1.7], [17.5, 32.3, 1.5], [19, 25, 1.3]] as const) rockProp(l, x, -0.8, z, r, Math.round(x * z), 0.7);
  anchors.shard = anchor(19.6, 0.3, 30.2, YAW_E);
  l.box('bronze', 19.6, 0.36, 30.2, 0.24, 0.08, 0.14, { ry: 0.6, cast: false });
  triggers.arrival = box3(-4, 1, 60, 4, 6, 72);

  // ================================================================== tidal stair
  const t = newKit(ctx, 'tidal', 303, 2);
  const T = PLAN.tidal, TT = PLAN.tidalTop;
  stairs(t, 'stone_wall', [T.xLow, T.yLow, T.z], [T.xHigh, T.yHigh, T.z], T.w, { baseY: -5 });
  t.ramp([T.xLow, T.yLow + 1.1, T.z + T.w / 2 + 0.25], [T.xHigh, T.yHigh + 1.1, T.z + T.w / 2 + 0.25], 0.45, 1.6);
  // sloped parapet visuals
  const run = T.xLow - T.xHigh, rise = T.yHigh - T.yLow, sl = Math.atan2(rise, run);
  t.box('stone_wall', (T.xLow + T.xHigh) / 2, (T.yLow + T.yHigh) / 2 + 0.5, T.z + T.w / 2 + 0.25, Math.hypot(run, rise), 1.0, 0.45, { rz: -sl });
  t.box('stone_trim', (T.xLow + T.xHigh) / 2, (T.yLow + T.yHigh) / 2 + 1.02, T.z + T.w / 2 + 0.25, Math.hypot(run, rise), 0.12, 0.55, { rz: -sl, cast: false });
  cliffWall(t, T.xHigh - 1, T.z - T.w / 2 - 0.8, T.xLow + 0.5, T.z - T.w / 2 - 0.8, -2, 18, 21, 1, 2.2);
  t.solid(T.xHigh - 1, -2, T.z - T.w / 2 - 1.6, T.xLow + 0.5, 30, T.z - T.w / 2 - 0.1);
  t.bmm('stone_dark', T.xHigh, -5, T.z + T.w / 2 + 0.5, T.xLow, T.yLow - 0.5, T.z + T.w / 2 + 1.2);
  floor(t, 'flagstone', TT.x0, TT.z0, TT.x1, TT.z1, TT.y, 0.5);
  t.bmm('stone_dark', TT.x0, -5, TT.z0 + 1.5, TT.x1, TT.y - 0.5, TT.z1, { cast: true });
  parapet(t, 'stone_wall', TT.x0, TT.z1, TT.x1, TT.z1, TT.y);
  parapet(t, 'stone_wall', TT.x1, T.z + T.w / 2 + 0.2, TT.x1, TT.z1, TT.y);
  parapet(t, 'stone_wall', TT.x0, 25.2, TT.x0, TT.z1, TT.y);
  bound(t, TT.x1, TT.z0 - 0.3, TT.x1, T.z - T.w / 2 - 0.1, TT.y, 3);
  for (let i = 0; i < 3; i++) scaffold(t, -21 + i * 2.8, 27.6, -19.2 + i * 2.8, 29.2, -3, 4.6 + i * 1.4, { bay: 1.8, lift: 2.1, braces: true });
  bracketLantern(t, -18, 6.6, T.z - T.w / 2 - 0.2, YAW_S);
  enemies.push({ id: 'ac_aco_tidal', kind: 'glassAcolyte', anchor: anchor(-30.5, TT.y, 26.6, YAW_E), leash: 12 });
  enemies.push({ id: 'ac_hom_tidal', kind: 'homunculus', anchor: anchor(-27, TT.y, 24.2, YAW_E), leash: 14 });

  // ================================================================== the drowned theatre
  buildTheatre(ctx, anchors, pieces, triggers, enemies, water);

  // ================================================================== prompters' passage (tunnel)
  const u = newKit(ctx, 'tunnel', 304, 2);
  const TU = PLAN.tunnel;
  floor(u, 'flagstone', TU.x0 - 0.6, TU.z0, TU.x1 + 0.6, TU.z1, TU.y, 0.4);
  wall(u, 'stone_dark', TU.x0 - 0.5, TU.z0 - 0.3, TU.x1 + 0.5, TU.z0 - 0.3, TU.y, 2.2, 0.6);
  wall(u, 'stone_dark', TU.x0 - 0.5, TU.z1 + 0.3, TU.x1 + 0.5, TU.z1 + 0.3, TU.y, 2.2, 0.6);
  barrelVault(u, 'stone_dark', (TU.x0 + TU.x1) / 2 + 0.1 - (TU.x1 - TU.x0) / 2 - 0.5, TU.y + 2.2, (TU.z0 + TU.z1) / 2, Math.PI / 2, (TU.z1 - TU.z0) / 2 + 0.3, TU.x1 - TU.x0 + 1, 0.4, 8);
  u.solid(TU.x0 - 0.5, TU.y + 3.3, TU.z0 - 0.6, TU.x1 + 0.5, TU.y + 4.4, TU.z1 + 0.6);
  for (let x = TU.x0 + 1.5; x < TU.x1; x += 3.4) { u.box('timber_dark', x, TU.y + 1.2, TU.z0 + 0.05, 0.2, 2.4, 0.2, { cast: false }); u.box('timber_dark', x, TU.y + 1.2, TU.z1 - 0.05, 0.2, 2.4, 0.2, { cast: false }); }
  sconceTorch(u, -11, TU.y + 1.8, TU.z0 + 0.1, YAW_S);
  u.light(0xffa860, 5, 9, -11, TU.y + 2.0, TU.z0 + 0.6, 0.8);
  for (let i = 0; i < 7; i++) papers(u, TU.x0 + 1 + i * 1.3, TU.y, (TU.z0 + TU.z1) / 2 + Math.sin(i * 2.3) * 0.8, 2);
  crateStack(u, -8.2, TU.y, TU.z1 - 0.7, 0);
  anchors.scrapTunnel = anchor(-13.6, TU.y, TU.z1 - 0.6, YAW_N);
  u.box('iron_rusted', -13.6, TU.y + 0.08, TU.z1 - 0.6, 0.4, 0.16, 0.3, { cast: false });
  enemies.push({ id: 'ac_warden_tunnel', kind: 'lensWarden', anchor: anchor(-7.3, TU.y, -1.5, YAW_W), leash: 10 });

  // ================================================================== lift well chamber, lift, sea gate lever
  const w = newKit(ctx, 'liftwell', 305, 2);
  const CH = PLAN.chamber, SH = PLAN.shaft, LF = PLAN.lift;
  floor(w, 'flagstone', CH.x0, CH.z0, CH.x1, CH.z1, CH.y, 0.5);
  wall(w, 'stone_dark', CH.x0 - 0.4, CH.z0 - 0.4, CH.x1 + 0.4, CH.z0 - 0.4, CH.y, CH.ceil - CH.y, 0.8);
  wall(w, 'stone_dark', CH.x0 - 0.4, CH.z0, CH.x0 - 0.4, CH.z1, CH.y, CH.ceil - CH.y, 0.8, { openings: [{ u: -(CH.z1 - CH.z0) / 2 + 1.5, w: 3.0, sill: 0, h: 3.2, kind: 'round' }] });
  wall(w, 'stone_dark', CH.x1 + 0.4, CH.z0, CH.x1 + 0.4, CH.z1, CH.y, CH.ceil - CH.y, 0.8);
  wall(w, 'stone_dark', CH.x0 - 0.4, CH.z1 + 0.4, CH.x1 + 0.4, CH.z1 + 0.4, CH.y, CH.ceil - CH.y, 0.8, { openings: [{ u: 0, w: G.x1 - G.x0, sill: 0, h: G.h, kind: 'flat' }] });
  // ceiling (with the shaft hole) and the shaft walls up to the terrace
  w.bmm('stone_dark', CH.x0 - 0.4, CH.ceil, CH.z0 - 0.4, CH.x1 + 0.4, CH.ceil + 0.8, SH.z0, { col: true });
  w.bmm('stone_dark', CH.x0 - 0.4, CH.ceil, SH.z1, CH.x1 + 0.4, CH.ceil + 0.8, CH.z1 + 0.4, { col: true });
  w.bmm('stone_dark', CH.x0 - 0.4, CH.ceil, SH.z0, SH.x0, CH.ceil + 0.8, SH.z1, { col: true });
  w.bmm('stone_dark', SH.x1, CH.ceil, SH.z0, CH.x1 + 0.4, CH.ceil + 0.8, SH.z1, { col: true });
  for (const [x0, z0, x1, z1] of [[SH.x0 - 0.5, SH.z0 - 0.5, SH.x1 + 0.5, SH.z0], [SH.x0 - 0.5, SH.z1, SH.x1 + 0.5, SH.z1 + 0.5], [SH.x0 - 0.5, SH.z0, SH.x0, SH.z1], [SH.x1, SH.z0, SH.x1 + 0.5, SH.z1]] as const) {
    w.bmm('stone_dark', x0, CH.ceil + 0.8, z0, x1, PLAN.terrace.y - 0.4, z1, { col: true });
  }
  // lift machinery: guide posts, pulley chains, a great winding wheel and counterweights
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.box('timber_dark', LF.x + sx * (LF.w / 2 + 0.2), (CH.y + PLAN.terrace.y + 4) / 2, LF.z + sz * (LF.d / 2 + 0.2), 0.3, PLAN.terrace.y + 4 - CH.y, 0.3, { cast: true });
  for (const sx of [-1, 1]) chain(w, [LF.x + sx * 1.6, PLAN.terrace.y + 3.6, LF.z], [LF.x + sx * 1.6, CH.y + 2.7, LF.z], 0.26, 0.05);
  w.add('iron', new THREE.TorusGeometry(1.6, 0.14, 6, 20), { x: 4.7, y: CH.y + 2.4, z: 7, ry: Math.PI / 2 });
  for (let i = 0; i < 6; i++) w.box('iron', 4.7, CH.y + 2.4, 7, 0.1, 3.1, 0.12, { rx: (i * Math.PI) / 6, cast: false });
  w.box('timber_dark', 4.7, CH.y + 1.1, 7, 0.6, 2.2, 0.5, { col: true });
  for (let i = 0; i < 3; i++) w.box('iron_rusted', -4.6, CH.y + 0.5 + i * 1.05, 4 + (i % 2) * 0.2, 1.2, 1.0, 1.2, { col: i === 0 });
  crateStack(w, 4.5, CH.y, 2.2, 0.5);
  barrel(w, -4.8, CH.y, 16.5, 0, true);
  bracketLantern(w, -5.6, CH.y + 3.0, 8, YAW_E);
  bracketLantern(w, 5.6, CH.y + 3.0, 14, YAW_W);
  w.light(0xffb070, 6, 14, 0, CH.y + 3.6, 6, 0.6);
  w.light(0xffb070, 4, 10, 0, CH.y + 3.2, 16.5, 0.6);
  pieces.lift = liftPiece(ctx, 'well', LF.x, LF.z, LF.w, LF.d, LF.y0, LF.y1);
  pieces.seaGateLever = lever(ctx, w, 3.9, CH.y, 16.6, YAW_E);
  pieces.liftCallLow = lever(ctx, w, -3.6, CH.y, 8.8, YAW_W);
  anchors.liftCallLow = pieces.liftCallLow.anchor!;
  anchors.seaGateLever = pieces.seaGateLever.anchor!;
  anchors.liftLow = anchor(LF.x, LF.y0, LF.z, YAW_N);
  anchors.courtGloves = anchor(-4.4, CH.y, -1.6, YAW_N);
  w.box('leather_dark', -4.4, CH.y + 0.06, -1.6, 0.35, 0.1, 0.25, { cast: false });

  const tollPosts = [{
    id: 'landing', pos: V(6.5, L.y, 25.5), radius: 7,
    options: [{ id: 'seaGate', toward: V(0, L.y, 15) }, { id: 'tidalStair', toward: V(-14, L.y, 25.5) }, { id: 'causeway', toward: V(0, L.y, 50) }],
  }];

  return { shrine, playerStart: anchor(B.x, C.y, B.z - 1.4, YAW_N), enemies, anchors, pieces, triggers, tollPosts, water };
}

// ====================================================================== the drowned theatre

function buildTheatre(ctx: AreaCtx, anchors: Record<string, Anchor>, pieces: Record<string, Piece>, triggers: Record<string, THREE.Box3>, enemies: EnemySpawn[], water: THREE.Mesh[]) {
  void pieces;
  const k = newKit(ctx, 'theatre', 310, 2);
  const T = PLAN.theatre, C = T.c;
  const Y = C.y;
  const topY = Y + T.tierH * T.tiers;
  // stage (the whole back strip) and orchestra
  floor(k, 'flagstone', T.xW, T.backZ, T.xE, C.z, Y, 0.5);
  k.add('flagstone', ringSector(0, T.rStage, Math.PI, Math.PI * 2 - 0.0001, 0.5, 16), { x: C.x, y: Y, z: C.z }, { cast: false });
  k.colGeo(ringSector(0, T.rStage, Math.PI, Math.PI * 2 - 0.0001, 0.5, 16), { x: C.x, y: Y, z: C.z });
  k.bmm('stone_dark', T.xW, -5, T.backZ, T.xE, Y - 0.5, C.z + T.rWall, { cast: false });
  // tiers with three aisle gaps (south-west, south, south-east)
  const aisles = [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
  const AW = 1.9;
  for (let i = 0; i < T.tiers; i++) {
    const r0 = T.rStage + T.tierD * i, r1 = r0 + T.tierD;
    const y = Y + T.tierH * (i + 1);
    const half = (AW / 2) / r0;
    let a = Math.PI;
    const segs: [number, number][] = [];
    for (const ac of aisles) { segs.push([a, ac - half]); a = ac + half; }
    segs.push([a, Math.PI * 2 - 0.0001]);
    for (const [a0, a1] of segs) {
      const n = Math.max(2, Math.round((a1 - a0) * r1 / 1.6));
      const g = ringSector(r0, r1, a0, a1, y - Y + 0.01, n);
      k.add('stone_wall', g.clone(), { x: C.x, y, z: C.z }, { cast: false });
      k.colGeo(g, { x: C.x, y, z: C.z });
      // trim nosing on the riser
      k.add('stone_trim', ringSector(r0 - 0.02, r0 + 0.12, a0, a1, 0.08, n), { x: C.x, y: y + 0.005, z: C.z }, { cast: false });
    }
  }
  for (const ac of aisles) {
    const dx = Math.cos(ac), dz = -Math.sin(ac);
    stairs(k, 'stone_trim', [C.x + dx * (T.rStage - 0.2), Y, C.z + dz * (T.rStage - 0.2)], [C.x + dx * (T.rStage + T.tierD * T.tiers + 0.2), topY, C.z + dz * (T.rStage + T.tierD * T.tiers + 0.2)], AW - 0.1, { riser: 0.2 });
  }
  // promenade ring and outer wall (opening toward the tidal stair)
  const rP0 = T.rStage + T.tierD * T.tiers;
  const prom = ringSector(rP0, T.rProm, Math.PI, Math.PI * 2 - 0.0001, topY - Y + 0.01, 40);
  k.add('flagstone', prom.clone(), { x: C.x, y: topY, z: C.z }, { cast: false });
  k.colGeo(prom, { x: C.x, y: topY, z: C.z });
  const gap0 = 2 * Math.PI - (83 * Math.PI) / 180, gap1 = 2 * Math.PI - (61 * Math.PI) / 180;
  const nSeg = 26;
  for (let i = 0; i < nSeg; i++) {
    const a0 = Math.PI + (Math.PI * i) / nSeg, a1 = Math.PI + (Math.PI * (i + 1)) / nSeg;
    const am = (a0 + a1) / 2;
    const rm = (T.rProm + T.rWall) / 2;
    const chord = 2 * T.rWall * Math.sin((a1 - a0) / 2) + 0.3;
    const x = C.x + Math.cos(am) * rm, z = C.z - Math.sin(am) * rm;
    const yaw = Math.atan2(C.x - x, C.z - z);
    const inGap = am > gap0 && am < gap1;
    const drowned = Math.cos(am) > 0; // east half
    k.push(x, 0, z, yaw);
    // substructure into the surf
    k.bmm('stone_dark', -chord / 2, -5, -0.5, chord / 2, topY, 0.9, { cast: true });
    if (!inGap) {
      k.bmm(drowned ? 'stone_dark' : 'stone_wall', -chord / 2, topY, -0.5, chord / 2, T.top, 0.5, { cast: true });
      k.solid(-chord / 2, topY, -0.5, chord / 2, T.top + 6, 0.5);
      // tall windows over the sea (every other bay), glass broken on the drowned side
      if (i % 2 === 0) {
        k.box('stone_dark', 0, topY + 7.2, 0.52, chord * 0.42, 5.2, 0.05, { cast: false });
        k.box(drowned ? 'moss' : 'glass', 0, topY + 7.2, 0.5, chord * 0.36, 4.8, 0.03, { cast: false });
      }
      k.bmm('stone_trim', -chord / 2 - 0.02, T.top - 0.3, -0.6, chord / 2 + 0.02, T.top, 0.6, { cast: false });
      if (i % 3 === 1) k.bmm('stone_wall', -0.45, -5, -1.6, 0.45, T.top - 2, -0.5, { cast: true }); // buttress outside
    }
    k.pop();
  }
  // straight side walls east & west of the stage, the back wall (skene)
  wall(k, 'stone_wall', T.xW, T.backZ, T.xW, C.z, Y, T.top - Y, 1.0, { openings: [{ u: -1.8, w: 2.2, sill: 0, h: 2.6, kind: 'round' }] });
  wall(k, 'stone_dark', T.xE, T.backZ, T.xE, C.z, Y, T.top - Y, 1.0, { openings: [{ u: -(C.z - T.backZ) / 2 + 2.5, w: 3.0, sill: 0, h: 3.2, kind: 'round' }] });
  wall(k, 'stone_wall', T.xW - 0.5, T.backZ - 0.5, T.xE + 0.5, T.backZ - 0.5, Y, T.top - Y + 0.5, 1.0);
  // the skene facade: columns and niches; the west half painted and dry, the east encrusted
  for (let x = T.xW + 2.5; x < T.xE; x += 4) {
    const dry = x < C.x;
    column(k, dry ? 'stone_trim' : 'stone_dark', x, Y, T.backZ + 0.6, 7.5, 0.4, true);
    if (!dry) for (let j = 0; j < 5; j++) rockProp(k, x + Math.sin(j * 3.1) * 0.5, Y + j * 0.9, T.backZ + 0.8, 0.28, j * 7 + Math.round(x), 0.8, 'rock_cliff');
  }
  k.bmm('stone_trim', T.xW, Y + 7.5, T.backZ, T.xE, Y + 8.2, T.backZ + 1.2, { cast: true });
  // fresco of the heavens (dry) — painted panels in plaster with gilt stars
  for (let x = T.xW + 4.5; x < C.x - 1; x += 4) {
    k.box('plaster', x, Y + 4.5, T.backZ + 0.02, 3.2, 4.8, 0.05, { cast: false });
    k.box('cloth_blue', x, Y + 5, T.backZ + 0.05, 2.8, 3.6, 0.02, { cast: false });
    for (let s = 0; s < 6; s++) k.box('gold_trim', x - 1.1 + ((s * 0.73) % 2.2), Y + 3.6 + ((s * 1.37) % 3), T.backZ + 0.07, 0.1, 0.1, 0.02, { rz: 0.78, cast: false });
  }
  // tide line and weed on the drowned half
  k.bmm('moss', C.x, Y, T.backZ + 0.01, T.xE, Y + 9.6, T.backZ + 0.04, { cast: false });
  for (let x = C.x + 1; x < T.xE; x += 1.3) k.box('moss', x, Y + 8.2 - (x % 1.7), T.backZ + 0.2, 0.18, 2.2 + (x % 1.1), 0.05, { cast: false });
  // roof over the dry half; broken beams over the drowned half
  const roofY = T.top + 0.2;
  const rq = ringSector(0, T.rWall + 0.4, Math.PI, Math.PI * 1.5, 0.5, 18);
  k.add('roof_slate', rq, { x: C.x, y: roofY + 0.5, z: C.z }, { cast: true });
  k.bmm('roof_slate', T.xW - 0.5, roofY, T.backZ - 1, C.x, roofY + 0.5, C.z, { cast: true });
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (Math.PI * 0.5 * i) / 8;
    const x1 = C.x + Math.cos(a) * T.rWall, z1 = C.z - Math.sin(a) * T.rWall;
    const L = T.rWall, yaw = Math.atan2(x1 - C.x, z1 - C.z);
    k.box('timber_dark', (C.x + x1) / 2, roofY - 0.2, (C.z + z1) / 2, 0.35, 0.45, L, { ry: yaw, cast: false });
  }
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 1.55 + i * 0.07;
    const r = 6 + i * 2.2;
    fallenBeam(k, [C.x + Math.cos(a) * r, roofY - 0.2, C.z - Math.sin(a) * r], [C.x + Math.cos(a + 0.2) * (r + 3), roofY - 3.5 - (i % 3) * 1.4, C.z - Math.sin(a + 0.2) * (r + 3)], 0.22, 'timber_dark');
  }
  // lecture desks on the dry tiers; drowned desks, rocks and weed on the wet side
  for (let i = 0; i < T.tiers; i += 1) {
    const r = T.rStage + T.tierD * (i + 0.5);
    const y = Y + T.tierH * (i + 1);
    const n = Math.floor((Math.PI * r) / 2.8);
    for (let j = 0; j < n; j++) {
      const a = Math.PI + (Math.PI * (j + 0.5)) / n;
      if (aisles.some((ac) => Math.abs(a - ac) * r < 1.9)) continue;
      const x = C.x + Math.cos(a) * r, z = C.z - Math.sin(a) * r;
      const facing = Math.atan2(C.x - x, C.z - z);
      const drowned = x > C.x;
      if (drowned && (i + j) % 2 === 0) continue;
      lectureDesk(k, x, y, z, facing + Math.PI, 2.0, drowned);
    }
  }
  for (let j = 0; j < 22; j++) {
    const a = Math.PI * 1.52 + (j * 0.61) % (Math.PI * 0.46);
    const r = 5 + ((j * 3.7) % 12);
    rockProp(k, C.x + Math.cos(a) * r, theatreY(C.x + Math.cos(a) * r, C.z - Math.sin(a) * r) - 0.1, C.z - Math.sin(a) * r, 0.25 + (j % 3) * 0.12, j * 13, 0.55, 'rock_cliff');
  }
  // a beached skiff in the orchestra, half in the standing water
  k.push(C.x + 9.5, Y, C.z - 1.6, 1.35);
  k.add('timber_dark', extrudeXY([[-0.9, 0.2], [0.9, 0.2], [0.6, -0.4], [-0.6, -0.4]], 3.4), { y: 0.4, rz: 0.2 }, { cast: true });
  k.box('planks', 0, 0.55, 0, 1.4, 0.05, 2.6, { rz: 0.2, cast: false });
  k.pop();
  k.solid(C.x + 7.7, Y, C.z - 2.8, C.x + 11.3, Y + 1.0, C.z - 0.4, 'wood');
  // the stage: a great lens on a stand, the lecturer's podium, chalkboards (one ruined)
  lensApparatus(k, C.x, Y, C.z - 2.4, YAW_S, 1.3, 2.4);
  desk(k, C.x - 3.5, Y, C.z - 1.2, YAW_S);
  papers(k, C.x - 3.5, Y + 0.8, C.z - 1.2, 5);
  candelabrum(k, C.x - 5.0, Y, C.z - 1.8, 5);
  k.box('timber_dark', C.x - 9, Y + 3.2, T.backZ + 0.9, 6, 3, 0.1, { cast: false });
  k.box('stone_dark', C.x - 9, Y + 3.2, T.backZ + 0.96, 5.6, 2.6, 0.02, { cast: false });
  for (let s = 0; s < 8; s++) k.box('parchment', C.x - 11.3 + s * 0.6, Y + 3.2 + Math.sin(s * 1.7) * 0.8, T.backZ + 0.99, 0.4, 0.02, 0.01, { rz: s * 0.4, cast: false });
  k.box('timber_dark', C.x + 9, Y + 2.6, T.backZ + 0.9, 6, 3, 0.1, { rz: 0.12, cast: false });
  shelves(k, T.xW + 1.4, Y, T.backZ + 1.1, YAW_S, 2.4, 3, true);
  shelves(k, T.xW + 4.2, Y, T.backZ + 1.1, YAW_S, 2.4, 3, true);
  // lights: warm candle-light on the dry side, a cold sea-lantern on the wet side
  candelabrum(k, C.x - 12, topY, C.z + 17.5, 5);
  k.light(0xffc27a, 8, 16, C.x - 8, Y + 3.2, C.z + 3, 0.5);
  k.light(0xffc27a, 6, 14, C.x - 12, topY + 2, C.z + 15, 0.5);
  k.light(0x9fc8d0, 7, 18, C.x + 9, Y + 5, C.z + 4, 0);
  // prompters' niche (secret) behind the west door
  floor(k, 'flagstone', T.xW - 4.5, T.backZ + 0.5, T.xW - 0.5, C.z - 0.5, Y, 0.4);
  wall(k, 'stone_dark', T.xW - 4.6, T.backZ + 0.4, T.xW - 0.5, T.backZ + 0.4, Y, 3.2, 0.4);
  wall(k, 'stone_dark', T.xW - 4.6, C.z - 0.4, T.xW - 0.5, C.z - 0.4, Y, 3.2, 0.4);
  wall(k, 'stone_dark', T.xW - 4.6, T.backZ + 0.4, T.xW - 4.6, C.z - 0.4, Y, 3.2, 0.4);
  k.bmm('stone_dark', T.xW - 4.8, Y + 3.2, T.backZ + 0.2, T.xW - 0.4, Y + 3.6, C.z - 0.2, { col: true });
  desk(k, T.xW - 3.3, Y, T.backZ + 1.4, YAW_S);
  ledger(k, T.xW - 3.3, Y + 0.8, T.backZ + 1.4, 0, true);
  candles(k, T.xW - 2.6, Y + 0.8, T.backZ + 1.3, 3, 0.1);
  anchors.prompterScroll = anchor(T.xW - 3.3, Y, T.backZ + 2.5, YAW_N);
  // the standing water: a sheet of sea with a hard vertical edge down the middle of the theatre
  const WY = T.water;
  const rW = T.rStage + T.tierD * 2;
  const pts: [number, number][] = [[C.x, -T.backZ], [T.xE, -T.backZ], [T.xE, -C.z], [C.x + rW, -C.z]];
  for (let i = 1; i <= 12; i++) { const a = (Math.PI / 2) * (i / 12); pts.push([C.x + Math.cos(a) * rW, -(C.z + Math.sin(a) * rW)]); }
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const wg = new THREE.ShapeGeometry(shape, 1);
  wg.rotateX(-Math.PI / 2);
  const wm = getMaterial('water');
  const top = new THREE.Mesh(wg, wm);
  top.position.y = WY;
  top.renderOrder = 3;
  ctx.root.add(top);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(C.z + rW - T.backZ, WY - Y + 0.1).rotateY(-Math.PI / 2), wm);
  face.position.set(C.x - 0.01, (WY + Y) / 2 - 0.05, (T.backZ + C.z + rW) / 2);
  face.renderOrder = 3;
  ctx.root.add(face);
  water.push(top, face);
  // Corporal Fenn's seat (dry tiers) and the muster lead
  const fx = C.x - 9.5, fz = C.z + 12.6;
  anchors.fenn = anchor(fx, theatreY(fx, fz), fz, Math.atan2(C.x - fx, C.z - fz));
  anchors.courtHood = anchor(C.x - 13.5, theatreY(C.x - 13.5, C.z + 7.2), C.z + 7.2, YAW_N);
  k.box('cloth_blue', C.x - 13.5, theatreY(C.x - 13.5, C.z + 7.2) + 0.05, C.z + 7.2, 0.45, 0.1, 0.35, { cast: false });
  anchors.drownedDesks = anchor(C.x + 7, theatreY(C.x + 7, C.z + 5.5), C.z + 5.5, YAW_N);
  triggers.theatre = box3(T.xW, 0, T.backZ, T.xE, 12, C.z + T.rProm);
  // enemies
  enemies.push({ id: 'ac_warden_stage', kind: 'lensWarden', anchor: anchor(C.x + 1.5, Y, C.z - 1.5, YAW_S), leash: 14 });
  enemies.push({ id: 'ac_choir_theatre', kind: 'choirLeader', anchor: anchor(C.x - 9, Y, C.z - 1.5, YAW_S), leash: 10 });
  enemies.push({ id: 'ac_aco_theatre_w', kind: 'glassAcolyte', anchor: anchor(C.x - 12, theatreY(C.x - 12, C.z + 9.5), C.z + 9.5, YAW_N), leash: 12 });
  enemies.push({ id: 'ac_aco_theatre_e', kind: 'glassAcolyte', anchor: anchor(C.x + 12, theatreY(C.x + 12, C.z + 9), C.z + 9, YAW_N), leash: 12 });
  enemies.push({ id: 'ac_echo_theatre', kind: 'echoConstruct', anchor: anchor(C.x - 1.5, Y, C.z + 3.2, YAW_S), leash: 14 });
  enemies.push({ id: 'ac_hom_theatre1', kind: 'homunculus', anchor: anchor(C.x + 4.6, Y, C.z + 0.8, YAW_W), leash: 14 });
  enemies.push({ id: 'ac_hom_theatre2', kind: 'homunculus', anchor: anchor(C.x + 13, Y, C.z - 1.2, YAW_W), leash: 14 });
  void YAW_E;
}
