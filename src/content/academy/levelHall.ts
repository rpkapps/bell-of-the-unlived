/**
 * The Lens Terrace (the lift's head over the sea) and the Hall of Lenses: a long glass-roofed hall
 * on the promontory — lens apparatus, hanging lenses, lecture tables, the second Stillbell, the
 * north gallery with the archive (the Register of Unmade Names) and the door to the drawbridge,
 * Ansel Wick's lectern and drafting board (two states of the same notes).
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import {
  floor, parapet, wall, stairs, stillbellShrine, bellPost, candelabrum, shelves, desk, papers, candles, ledger, cyl, sphere,
  column, towerRound, bracketLantern, bound, type StillbellShrine, crateStack, barrel, gablePrism,
} from '../../world/kit';
import {
  type AreaCtx, type Piece, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, scaffold, chain, cliffWall, academyMark,
  lensApparatus, lever, draftingBoard, box3,
} from './levelCommon';

export interface HallBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, Piece>;
  triggers: Record<string, THREE.Box3>;
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildHall(ctx: AreaCtx): HallBuild {
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, Piece> = {};
  const triggers: Record<string, THREE.Box3> = {};
  const enemies: EnemySpawn[] = [];

  // ================================================================== terrace
  const t = newKit(ctx, 'terrace', 401, 18);
  const TE = PLAN.terrace, SH = PLAN.shaft, Y = TE.y;
  floor(t, 'flagstone', TE.x0, TE.z0, TE.x1, SH.z0, Y, 0.6);
  floor(t, 'flagstone', TE.x0, SH.z1, TE.x1, TE.z1, Y, 0.6);
  floor(t, 'flagstone', TE.x0, SH.z0, SH.x0, SH.z1, Y, 0.6);
  floor(t, 'flagstone', SH.x1, SH.z0, TE.x1, SH.z1, Y, 0.6);
  parapet(t, 'stone_wall', TE.x0, TE.z1, TE.x1, TE.z1, Y, 0.5, 1.05);
  parapet(t, 'stone_wall', TE.x0, TE.z0, TE.x0, TE.z1, Y, 0.5, 1.05);
  parapet(t, 'stone_wall', TE.x1, TE.z0, TE.x1, TE.z1, Y, 0.5, 1.05);
  // iron railing round the shaft (open on the north side, where the lift is boarded)
  for (const [x0, z0, x1, z1] of [[SH.x0, SH.z0, SH.x0, SH.z1], [SH.x1, SH.z0, SH.x1, SH.z1], [SH.x0, SH.z1, SH.x1, SH.z1]] as const) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(len / 0.5);
    for (let i = 0; i <= n; i++) t.box('iron', x0 + ((x1 - x0) * i) / n, Y + 0.55, z0 + ((z1 - z0) * i) / n, 0.05, 1.1, 0.05, { cast: false });
    t.box('iron', (x0 + x1) / 2, Y + 1.1, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.08, 0.07, Math.abs(z1 - z0) + 0.08, { cast: false });
    bound(t, x0, z0, x1, z1, Y, 1.25, 0.12);
  }
  // the lift head: a timber gantry with the pulley wheel
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.box('timber_dark', sx * 2.9, Y + 2.2, 13 + sz * 2.9, 0.3, 4.4, 0.3, { col: true });
  for (const sz of [-1, 1]) t.box('timber_dark', 0, Y + 4.4, 13 + sz * 2.9, 6.1, 0.35, 0.35);
  t.box('timber_dark', 0, Y + 4.7, 13, 0.4, 0.4, 6.1);
  t.add('iron', new THREE.TorusGeometry(1.0, 0.12, 6, 18), { y: Y + 3.9, z: 13, x: 0, ry: Math.PI / 2 });
  for (let i = 0; i < 4; i++) t.box('iron', 0, Y + 3.9, 13, 0.08, 2.0, 0.1, { rx: (i * Math.PI) / 4, cast: false });
  pieces.liftCallHigh = lever(ctx, t, 4.2, Y, 9.2, YAW_E);
  anchors.liftCallHigh = pieces.liftCallHigh.anchor!;
  anchors.liftHigh = anchor(0, Y, 13, YAW_S);
  // the great sea-telescope and benches
  lensApparatus(t, -8.5, Y, 15.5, YAW_S, 1.1, 2.1);
  t.add('bronze', cyl(0.35, 0.45, 5.2, 12), { x: 8.8, y: Y + 3.0, z: 14.8, rx: 1.15 });
  t.box('iron', 8.8, Y + 1.3, 14, 0.2, 2.6, 0.2, { col: true });
  for (const x of [-11, -5, 5, 11]) { t.box('stone_trim', x, Y + 0.45, 17.4, 2.2, 0.12, 0.6, { cast: false }); t.box('stone_dark', x, Y + 0.2, 17.4, 1.8, 0.4, 0.4, { cast: false }); }
  anchors.knives = anchor(11.2, Y, 17.2, YAW_S);
  t.box('leather', 11.2, Y + 0.52, 17.4, 0.35, 0.06, 0.2, { cast: false });
  crateStack(t, -12.2, Y, 5.4, 0);
  barrel(t, 12.5, Y, 5.6, 0, true);
  // scaffolds hanging down the cliff below the terrace (seen from the causeway)
  scaffold(t, 5, 19.8, 26, 21.4, -3, 17.6, { bay: 3, lift: 2.4, decks: [5.2, 12.4] });
  scaffold(t, -13, 19.8, -5, 21.2, 8, 17.6, { bay: 2.7, lift: 2.4, decks: [12.8] });
  chain(t, [10, 18.2, 19.6], [13, 7, 21.2], 0.3, 0.06);
  chain(t, [20, 18.2, 19.6], [18, 4, 21.2], 0.3, 0.06);
  enemies.push({ id: 'ac_aco_terrace', kind: 'glassAcolyte', anchor: anchor(-10, Y, 12.5, YAW_E), leash: 12 });
  enemies.push({ id: 'ac_hom_terrace1', kind: 'homunculus', anchor: anchor(7, Y, 8, YAW_S), leash: 14 });
  enemies.push({ id: 'ac_hom_terrace2', kind: 'homunculus', anchor: anchor(9.5, Y, 6.5, YAW_S), leash: 14 });

  // ================================================================== the hall
  const h = newKit(ctx, 'hall', 402, 18);
  const H = PLAN.hall, HY = H.y, TOP = HY + H.h, GY = H.gallery;
  floor(h, 'flagstone', H.x0, H.z0, H.x1, H.z1, HY, 0.6);
  // south facade (doors to the terrace), north wall (gallery door), west (bridge door), east
  const tall = { sill: 2.2, h: 6.2, kind: 'pointed' as const, w: 2.4 };
  wall(h, 'stone_wall', H.x0 - 0.5, H.z1, H.x1 + 0.5, H.z1, HY, H.h, 1.0, { openings: [{ u: 0, w: 4, sill: 0, h: 4.2, kind: 'pointed' }, { ...tall, u: -6 }, { ...tall, u: 6 }, { ...tall, u: -11.5 }, { ...tall, u: 11.5 }] });
  wall(h, 'stone_wall', H.x0 - 0.5, H.z0, H.x1 + 0.5, H.z0, HY, H.h, 1.0, { openings: [{ u: 0, w: 3, sill: GY - HY, h: 3.3, kind: 'round' }, { u: -9, w: 2, sill: 9, h: 2.4, kind: 'round' }, { u: 9, w: 2, sill: 9, h: 2.4, kind: 'round' }] });
  wall(h, 'stone_wall', H.x0, H.z0, H.x0, H.z1, HY, H.h, 1.0, { openings: [{ u: -5, w: 3, sill: 0, h: 3.6, kind: 'round' }, { ...tall, u: 3.5 }] });
  wall(h, 'stone_wall', H.x1, H.z0, H.x1, H.z1, HY, H.h, 1.0, { openings: [{ ...tall, u: -4 }, { ...tall, u: 3.5 }] });
  for (const [x0, z0, x1, z1] of [[H.x0 - 0.5, H.z1, H.x1 + 0.5, H.z1], [H.x0 - 0.5, H.z0, H.x1 + 0.5, H.z0]] as const) {
    h.bmm('stone_trim', x0, TOP - 0.4, z0 - 0.6, x1, TOP, z1 + 0.6, { cast: true });
  }
  for (const u of [-6, 6, -11.5, 11.5]) h.box('glass', u, HY + 2.2 + 3.1, H.z1, 2.3, 6.2, 0.04, { cast: false });
  for (const u of [-4, 3.5]) h.box('glass', H.x1, HY + 5.3, -4 + u, 0.04, 6.2, 2.3, { cast: false });
  // buttresses on the south face
  for (const x of [-14, -8.7, -3.2, 3.2, 8.7, 14]) h.bmm('stone_wall', x - 0.45, HY, H.z1 + 0.5, x + 0.45, TOP - 1.5, H.z1 + 1.6, { col: true });
  // corner towers (the silhouette from the causeway)
  for (const [x, z, y0] of [[H.x0 - 1.2, H.z1 + 1.2, HY - 1], [H.x1 + 1.2, H.z1 + 1.2, HY - 1], [H.x0 - 1.4, H.z0 - 1.4, -4], [H.x1 + 1.4, H.z0 - 1.4, -4]] as const) towerRound(h, 'stone_wall', x, y0, z, 2.2, HY + H.h + 9 - y0, 7.5, true, true);
  academyMark(h, 0, HY + 7.8, H.z1 + 0.55, YAW_S, 1.4);
  // glass roof: iron ribs and panes, ridge along x
  const RISE = 5.5, half = (H.z1 - H.z0) / 2 + 0.6, zc = (H.z0 + H.z1) / 2;
  const slope = Math.atan2(RISE, half), L = Math.hypot(RISE, half);
  for (const s of [-1, 1]) {
    h.box('glass', 0, TOP + RISE / 2, zc + (s * half) / 2, H.x1 - H.x0 + 1, 0.04, L, { rx: s * slope, cast: false });
    for (let x = H.x0; x <= H.x1 + 0.01; x += 2) h.box('iron', x, TOP + RISE / 2 + 0.05, zc + (s * half) / 2, 0.1, 0.14, L, { rx: s * slope, cast: false });
    for (let j = 1; j < 4; j++) h.box('iron', 0, TOP + (RISE * j) / 4 + 0.05, zc + s * half * (1 - j / 4), H.x1 - H.x0 + 1, 0.08, 0.08, { cast: false });
  }
  h.box('iron', 0, TOP + RISE + 0.05, zc, H.x1 - H.x0 + 1.2, 0.2, 0.2);
  for (const x of [H.x0, H.x1]) h.add('stone_wall', gablePrism(2 * half, RISE, 1.0), { x, y: TOP, z: zc, ry: Math.PI / 2 });
  // gallery on the north side (y = 24) on columns, with its balustrade
  floor(h, 'planks', H.x0, H.z0, H.x1, -9, GY, 0.4, 'wood');
  h.bmm('timber_dark', H.x0, GY - 0.8, -9.25, H.x1, GY - 0.4, -8.95, { cast: true });
  for (const x of [-12, -6, 0, 6]) column(h, 'stone_trim', x, HY, -9.1, GY - HY - 0.8, 0.32, true);
  for (let x = H.x0 + 0.4; x < 11.6; x += 0.45) h.box('timber', x, GY + 0.5, -9.05, 0.07, 0.9, 0.07, { cast: false });
  h.box('timber_dark', (H.x0 + 11.6) / 2, GY + 1.0, -9.05, 11.6 - H.x0, 0.1, 0.16, { cast: false });
  bound(h, H.x0, -9.05, 11.6, -9.05, GY, 1.2, 0.2);
  bound(h, 14.4, -9.05, H.x1, -9.05, GY, 1.2, 0.2);
  // the gallery stair along the east wall
  stairs(h, 'stone_trim', [13, HY, 0.8], [13, GY, -9.05], 2.2, { riser: 0.2 });
  const sLen = Math.hypot(9.85, GY - HY), sAng = Math.atan2(GY - HY, 9.85);
  h.box('timber_dark', 11.85, (HY + GY) / 2 + 0.95, -4.12, 0.12, 0.12, sLen, { rx: sAng, cast: false });
  h.solidC(11.8, (HY + GY) / 2 + 0.6, -4.12, 0.14, 1.6, sLen, [sAng, 0, 0]);
  // shelves under the gallery, hanging lenses, lecture tables and instruments
  for (let x = H.x0 + 1.5; x < H.x1 - 3; x += 2.6) if (Math.abs(x) > 1.6) shelves(h, x, HY, H.z0 + 0.8, YAW_S, 2.4, 4.4, true);
  for (const x of [-8, 0, 8]) {
    h.add('glass', cyl(1.6, 1.6, 0.08, 24), { x, y: HY + 8.5, z: -2.5, rx: Math.PI / 2, rz: 0.2 }, { cast: false });
    h.add('bronze', new THREE.TorusGeometry(1.62, 0.08, 6, 24), { x, y: HY + 8.5, z: -2.5, rx: 0.2 });
    chain(h, [x - 1.2, TOP + 3, -2.5], [x - 1.4, HY + 9.4, -2.5], 0.3, 0.05);
    chain(h, [x + 1.2, TOP + 3, -2.5], [x + 1.4, HY + 9.4, -2.5], 0.3, 0.05);
  }
  for (const [x, z] of [[-7, 0.5], [7, 0.5], [-7, -4.8], [7, -4.8]] as const) {
    h.bmm('timber_dark', x - 2.4, HY + 0.8, z - 0.7, x + 2.4, HY + 0.9, z + 0.7, { col: 'wood' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) h.box('timber_dark', x + sx * 2.2, HY + 0.4, z + sz * 0.55, 0.12, 0.8, 0.12, { cast: false });
    papers(h, x - 1, HY + 0.9, z, 4);
    candles(h, x + 1.6, HY + 0.9, z - 0.3, 3, 0.12);
    h.add('bronze', new THREE.TorusGeometry(0.3, 0.02, 4, 16), { x: x + 0.6, y: HY + 1.25, z, ry: 0.6 }, { cast: false });
    h.add('glass', sphere(0.18, 10, 8), { x: x - 1.8, y: HY + 1.1, z: z + 0.2 }, { cast: false });
  }
  // the focus: three lenses aimed at a glass orb on a plinth in the hall's heart
  h.bmm('stone_trim', -0.8, HY, -2.3, 0.8, HY + 1.1, -0.7, { col: true });
  h.add('glass', sphere(0.5, 16, 12), { x: 0, y: HY + 1.65, z: -1.5 }, { cast: false });
  for (const a of [0.3, 2.4, 4.4]) lensApparatus(h, Math.cos(a) * 3.2, HY, -1.5 + Math.sin(a) * 3.2, Math.atan2(-Math.cos(a), -Math.sin(a)), 0.6, 1.6);
  // Stillbell (west end)
  const shrine = stillbellShrine(h, H.x0 + 2.6, HY, 0.8, YAW_E, 7);
  // Wick's lectern (notebook in its first state) and his drafting board
  h.box('timber_dark', -2.4, HY + 0.55, -6.6, 0.5, 1.1, 0.5, { col: 'wood' });
  h.box('timber_dark', -2.4, HY + 1.15, -6.6, 0.8, 0.08, 0.6, { rx: -0.35, cast: false });
  ledger(h, -2.4, HY + 1.22, -6.6, 0, true);
  anchors.wickNotesA = anchor(-2.4, HY, -5.6, YAW_N);
  pieces.wickBoard = draftingBoard(ctx, h, 2.6, HY, -6.4, YAW_S);
  h.solid(1.5, HY, -7.0, 3.7, HY + 2.2, -6.0, 'wood');
  // archive alcove at the gallery's west end: the Register of Unmade Names
  shelves(h, H.x0 + 1.2, GY, H.z0 + 0.8, YAW_S, 2.2, 3, true);
  shelves(h, H.x0 + 3.6, GY, H.z0 + 0.8, YAW_S, 2.2, 3, true);
  desk(h, H.x0 + 2.2, GY, -10.2, YAW_S);
  ledger(h, H.x0 + 2.2, GY + 0.8, -10.2, 0.3, true);
  candles(h, H.x0 + 3.0, GY + 0.8, -10.3, 3, 0.1);
  anchors.register = anchor(H.x0 + 2.2, GY, -9.4, YAW_N);
  anchors.sealStaff = anchor(8.6, HY, -8.0, YAW_N);
  desk(h, 8.6, HY, -8.9, YAW_S);
  h.box('bronze', 8.6, HY + 0.86, -8.9, 1.3, 0.05, 0.06, { ry: 0.2, cast: false });
  // lights: warm candelabra on the tables, the cool focus light, a lantern in the archive
  candelabrum(h, -11.5, HY, -6, 5);
  candelabrum(h, 11.2, HY, 1.6, 5);
  h.light(0xffc27a, 7, 15, -11.5, HY + 2, -6, 0.4);
  h.light(0xcfe6ff, 7, 16, 0, HY + 3.2, -1.5, 0);
  h.light(0xffc27a, 5, 12, 9, HY + 2.2, 0.8, 0.4);
  bracketLantern(h, H.x0 + 0.7, GY + 2.3, -10.4, YAW_E);
  h.light(0xffc27a, 4, 9, H.x0 + 2.5, GY + 2.2, -10.4, 0.4);
  bellPost(h, -6, HY, 1.8, YAW_N);
  // the promontory under the hall and terrace: cliff faces down to the sea
  cliffWall(h, H.x0 - 0.6, H.z0 - 0.5, H.x0 - 0.6, 3.8, -4, HY - 0.2, 31, 1, 3);
  cliffWall(h, H.x1 + 0.6, H.z0 - 1.0, H.x0 - 0.6, H.z0 - 1.0, -4, HY - 0.2, 32, 1, 3);
  h.bmm('stone_dark', H.x0 - 0.5, -4, H.z0 - 0.5, H.x1 + 0.5, HY - 0.6, TE.z1, { cast: false });
  triggers.hall = box3(H.x0, HY - 1, H.z0, H.x1, HY + 6, H.z1);
  // enemies
  enemies.push({ id: 'ac_choir_hall', kind: 'choirLeader', anchor: anchor(9.5, HY, -3, YAW_W), leash: 9 });
  enemies.push({ id: 'ac_echo_hall', kind: 'echoConstruct', anchor: anchor(4.5, HY, -3.5, YAW_S), leash: 13 });
  enemies.push({ id: 'ac_warden_hall', kind: 'lensWarden', anchor: anchor(-6.5, HY, -7.5, YAW_E), leash: 12 });
  enemies.push({ id: 'ac_aco_gallery1', kind: 'glassAcolyte', anchor: anchor(-7, GY, -10.6, YAW_S), leash: 9 });
  enemies.push({ id: 'ac_aco_gallery2', kind: 'glassAcolyte', anchor: anchor(5, GY, -10.6, YAW_S), leash: 9 });

  const tollPosts = [{
    id: 'hall', pos: V(-6, HY, 1.8), radius: 6,
    options: [{ id: 'bridge', toward: V(-17, HY, -9) }, { id: 'terrace', toward: V(0, HY, 9) }, { id: 'gallery', toward: V(13, HY, 0) }],
  }];
  void YAW_W; void YAW_N;
  return { shrine, enemies, anchors, pieces, triggers, tollPosts };
}
