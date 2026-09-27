/**
 * Outside the tower: the Foot of the Belfry (Stillbell, first vista), the Causeway of Petitions over
 * the chasm (twin monuments of Aldren — conqueror and deposed), the south terrace before the barred
 * Great Door, the Windward Ledge round the west face to the postern (a dead-end with a view hides a
 * Bellbronze Shard), the east ledge, and the Buttress Gallery: four flights down the east face from
 * the Coronation's balcony to an iron gate that opens only from the stair side (shortcut 2).
 * Backdrop: the storm, a mountain ring, and the kingdom far below with its lights.
 */
import * as THREE from 'three';
import type { DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  Kit, floor, stairs, stillbellShrine, bellPost, rockFace, rockProp, deadTree, rubble, brazier, standardBanner, headstone,
  mountainRing, skylineRing, farKeep, cathedral, spireTower, cyl, sphere, cone, mergeSimple, type StillbellShrine,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { type BCtx, PLAN, newKit, anchor, parapetWall, YAW_N, YAW_S, YAW_E, YAW_W } from './levelCommon';

export interface OutsideBuild {
  foot: StillbellShrine;
  enemies: EnemySpawn[];
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
}

/** A statue of Aldren on a plinth: the conqueror (lance raised) or the deposed king (noose, bowed). */
function statue(k: Kit, x: number, y: number, z: number, yaw: number, deposed: boolean) {
  k.push(x, y, z, yaw);
  k.box('stone_dark', 0, 0.6, 0, 2.4, 1.2, 2.4);
  k.box('stone_trim', 0, 1.3, 0, 2.1, 0.2, 2.1, { cast: false });
  k.box('stone_trim', 0, 0.7, 1.22, 1.4, 0.5, 0.05, { cast: false });
  const m = 'stone_trim' as const;
  const bow = deposed ? 0.35 : -0.1;
  k.box(m, 0, 2.4, 0, 0.8, 1.9, 0.5, { rx: bow * 0.5 });
  k.box(m, 0, 3.55, deposed ? 0.18 : 0, 0.4, 0.46, 0.42, { rx: bow });
  for (const s of [-1, 1]) k.box(m, s * 0.24, 1.9, 0, 0.3, 1.2, 0.34);
  if (deposed) {
    for (const s of [-1, 1]) k.box(m, s * 0.5, 2.3, 0.2, 0.2, 1.0, 0.2, { rz: s * 0.2, rx: 0.4 });
    k.add('rope', new THREE.TorusGeometry(0.24, 0.04, 6, 12).rotateX(Math.PI / 2), { y: 3.25, z: 0.12 });
    k.box('timber_dark', 0, 4.6, -0.6, 0.2, 3.2, 0.2);
    k.box('timber_dark', 0, 6.0, -0.1, 0.2, 0.2, 1.2);
    k.box('rope', 0, 4.7, 0.3, 0.04, 2.6, 0.04, { cast: false });
  } else {
    k.box(m, -0.55, 3.3, 0.1, 0.22, 1.1, 0.22, { rz: 0.5 });
    k.box('stone_trim', -1.0, 4.5, 0.1, 0.1, 3.0, 0.1, { rz: 0.2 });
    k.box(m, 0.5, 2.6, 0.3, 0.22, 0.8, 0.22, { rx: -0.6 });
    k.add(m, new THREE.TorusGeometry(0.2, 0.04, 6, 12).rotateX(Math.PI / 2), { y: 3.85 });
  }
  k.solid(-1.2, 0, -1.2, 1.2, 4.5, 1.2);
  k.pop();
}

export function buildOutside(ctx: BCtx): OutsideBuild {
  const enemies: EnemySpawn[] = [];
  const e = (id: string, kind: string, x: number, y: number, z: number, yaw: number, extra: Partial<EnemySpawn> = {}) => enemies.push({ id, kind, anchor: anchor(x, y, z, yaw), leash: 18, ...extra });
  const H = PLAN.H;

  // ================================================================ the foot terrace and the causeway
  const k = newKit(ctx, 'outside.approach', 401, PLAN.foot.y);
  const fy = PLAN.foot.y, cw = PLAN.causeway;
  floor(k, 'flagstone', PLAN.foot.x0, PLAN.foot.z0, PLAN.foot.x1, PLAN.foot.z1, fy, 1.2);
  k.bmm('stone_dark', PLAN.foot.x0 - 0.3, fy - 14, PLAN.foot.z0 - 0.3, PLAN.foot.x1 + 0.3, fy - 1.2, PLAN.foot.z1 + 0.3, { cast: false });
  rockFace(k, PLAN.foot.x0 - 1, PLAN.foot.z1 + 1, PLAN.foot.x1 + 1, PLAN.foot.z1 + 1, fy - 18, fy + 0.4, 71, 1, 3);
  parapetWall(k, PLAN.foot.x0 + 0.25, PLAN.foot.z0, PLAN.foot.x0 + 0.25, PLAN.foot.z1, fy);
  parapetWall(k, PLAN.foot.x1 - 0.25, PLAN.foot.z0, PLAN.foot.x1 - 0.25, PLAN.foot.z1, fy);
  parapetWall(k, PLAN.foot.x0, PLAN.foot.z1 - 0.25, PLAN.foot.x1, PLAN.foot.z1 - 0.25, fy);
  parapetWall(k, PLAN.foot.x0, PLAN.foot.z0 + 0.25, cw.x0 - 0.2, PLAN.foot.z0 + 0.25, fy);
  parapetWall(k, cw.x1 + 0.2, PLAN.foot.z0 + 0.25, PLAN.foot.x1, PLAN.foot.z0 + 0.25, fy);
  // the Stillbell faces the tower: the player rests looking north at the Belfry
  const foot = stillbellShrine(k, 0, fy, 62.2, YAW_S, 8);
  brazier(k, -6.5, fy, 60, true, 1);
  brazier(k, 6.5, fy, 60, true, 1);
  k.light(0xff9a50, 8, 12, -6.5, fy + 2, 60, 0.9);
  k.light(0xff9a50, 8, 12, 6.5, fy + 2, 60, 0.9);
  for (let i = 0; i < 6; i++) headstone(k, -9 + (i % 3) * 1.2, fy, 67.5 + Math.floor(i / 3) * 1.5, YAW_N, 0.9, 0.55, (i % 2 ? 0.1 : -0.08));
  standardBanner(k, -3.2, fy, 57.4, YAW_N, 6, 1.2, 2.6);
  standardBanner(k, 3.2, fy, 57.4, YAW_N, 6, 1.2, 2.6);
  // causeway: two gently rising decks (foot y −3 → landing y −1.5 → terrace y 0) over the chasm,
  // with a level watch landing between them flanked by the twin monuments of Aldren
  const py = -1.5, pz0 = 38, pz1 = 46;
  const deck = (zA: number, yA: number, zB: number, yB: number) => {
    k.ramp([0, yA, zA], [0, yB, zB], cw.x1 - cw.x0, 0.6);
    const len = Math.hypot(zB - zA, yB - yA), slope = Math.atan2(yB - yA, zA - zB);
    const zm = (zA + zB) / 2, ym = (yA + yB) / 2;
    k.box('flagstone', 0, ym - 0.3, zm, cw.x1 - cw.x0, 0.6, len, { rx: slope });
    for (const s of [-1, 1]) {
      const x = s * (cw.x1 + 0.25);
      k.box('stone_wall', x, ym + 0.5, zm, 0.5, 1.2, len, { rx: slope });
      k.box('stone_trim', x, ym + 1.15, zm, 0.62, 0.12, len, { rx: slope, cast: false });
      k.solidC(x, ym + 0.8, zm, 0.5, 1.8, len, [slope, 0, 0]);
    }
  };
  deck(cw.zFoot, fy, pz1, py);
  deck(pz0, py, cw.zTower, 0);
  floor(k, 'flagstone', -9, pz0, 9, pz1, py, 0.8);
  // arches under the decks and the landing
  for (const [z, yTop] of [[29, -0.8], [34, -1.2], [42, py - 0.8], [50, -2.3], [55, -2.8]] as const) {
    k.bmm('stone_dark', -2.6, -38, z - 0.9, 2.6, yTop, z + 0.9, { cast: false });
    k.bmm('stone_trim', -3.0, yTop - 1.2, z - 1.1, 3.0, yTop - 0.9, z + 1.1, { cast: false });
  }
  k.bmm('stone_dark', -9, -38, pz0, 9, py - 0.8, pz1, { cast: false });
  for (const s of [-1, 1]) {
    parapetWall(k, s * 9 - s * 0.25, pz0, s * 9 - s * 0.25, pz1, py);
    parapetWall(k, s * 3.75, pz0 + 0.25, s * 9, pz0 + 0.25, py);
    parapetWall(k, s * 3.75, pz1 - 0.25, s * 9, pz1 - 0.25, py);
  }
  statue(k, -6.3, py, 42, YAW_E, false);
  statue(k, 6.3, py, 42, YAW_W, true);
  ctx.anchors.statues = anchor(0, py, 42, YAW_N);
  // the south terrace before the Great Door, and the ledges round the west and east faces
  floor(k, 'flagstone', PLAN.ledgeW.x0, PLAN.terrace.z0, PLAN.ledgeE.x1, PLAN.terrace.z1, 0, 1.0);
  floor(k, 'flagstone', PLAN.ledgeW.x0, PLAN.ledgeW.z0, PLAN.ledgeW.x1, PLAN.terrace.z0, 0, 1.0);
  floor(k, 'flagstone', PLAN.ledgeE.x0, PLAN.ledgeE.z0, PLAN.ledgeE.x1, PLAN.terrace.z0, 0, 1.0);
  k.bmm('stone_dark', -22, -38, PLAN.terrace.z0, 22, -1.0, PLAN.terrace.z1 + 0.5, { cast: false });
  k.bmm('stone_dark', PLAN.ledgeW.x0, -38, PLAN.ledgeW.z0, -H, -1.0, PLAN.terrace.z0, { cast: false });
  k.bmm('stone_dark', H, -38, PLAN.ledgeE.z0, PLAN.ledgeE.x1, -1.0, PLAN.terrace.z0, { cast: false });
  rockFace(k, -24, PLAN.terrace.z1 + 1.5, -5, PLAN.terrace.z1 + 1.5, -36, -0.4, 73, 1, 3);
  rockFace(k, 5, PLAN.terrace.z1 + 1.5, 24, PLAN.terrace.z1 + 1.5, -36, -0.4, 74, 1, 3);
  rockFace(k, PLAN.ledgeW.x0 - 1.5, -4, PLAN.ledgeW.x0 - 1.5, PLAN.terrace.z1, -36, -0.4, 75, -1, 3);
  rockFace(k, PLAN.ledgeE.x1 + 1.5, 6, PLAN.ledgeE.x1 + 1.5, PLAN.terrace.z1, -36, -0.4, 76, 1, 3);
  // terrace parapets (with the causeway gap), ledge parapets
  parapetWall(k, -22, PLAN.terrace.z1 - 0.25, cw.x0 - 0.2, PLAN.terrace.z1 - 0.25, 0);
  parapetWall(k, cw.x1 + 0.2, PLAN.terrace.z1 - 0.25, 22, PLAN.terrace.z1 - 0.25, 0);
  parapetWall(k, PLAN.ledgeW.x0 + 0.25, PLAN.ledgeW.z0, PLAN.ledgeW.x0 + 0.25, PLAN.terrace.z1, 0);
  parapetWall(k, PLAN.ledgeW.x0, PLAN.ledgeW.z0 + 0.25, -H, PLAN.ledgeW.z0 + 0.25, 0);
  parapetWall(k, PLAN.ledgeE.x1 - 0.25, PLAN.ledgeE.z0, PLAN.ledgeE.x1 - 0.25, PLAN.terrace.z1, 0);
  // the dead-end at the ledge's north end: a view over the chasm, a shard among bones
  ctx.anchors.ledgeNook = anchor(-19.5, 0, -0.8, YAW_N);
  rubble(k, -20.3, 0, 0.4, 0.6, false);
  deadTree(k, -20.2, 0, 3.5, 5, 7);
  rockProp(k, -21, 0, 12, 1.2, 9, 0.6);
  // terrace dressing: braziers either side of the door, banners, a fallen bell
  brazier(k, -5, 0, 17.5, true, 1.1);
  brazier(k, 5, 0, 17.5, true, 1.1);
  k.light(0xff9a50, 9, 13, -5, 2, 17.5, 0.9);
  k.light(0xff9a50, 9, 13, 5, 2, 17.5, 0.9);
  k.add('bronze_bell', new THREE.CylinderGeometry(0.9, 1.3, 1.9, 16, 1, true), { x: 8.8, y: 0.8, z: 22, rz: 1.35, rx: 0.2 });
  k.add('bronze_bell', sphere(0.9, 12, 6), { x: 9.7, y: 0.95, z: 21.8, s: [0.6, 1, 1] }, { cast: false });
  k.solid(7.6, 0, 20.9, 10.4, 1.8, 23.1);
  // toll post at the terrace crossroads: north (the door), west (ledge), south (causeway)
  bellPost(k, -8.5, 0, 19.5, YAW_S);
  // postern: a low arched doorway with a lamp
  k.light(0xffa860, 4, 7, -16.2, 2.6, PLAN.postern.z, 0.8);
  // enemies on the approach
  e('bf_cw_inf1', 'infantry', -1.5, py, 41, YAW_S);
  e('bf_cw_archer', 'archer', 7, py, 44.5, YAW_W);
  e('bf_cw_inf2', 'infantry', 1.2, 0, 20.5, YAW_S);
  e('bf_ledge_echo', 'keeperEcho', -18.2, 0, 14, YAW_S);
  e('bf_ledge_inf', 'infantry', -19.8, 0, 5, YAW_S);
  e('bf_ledgeE_sb', 'shieldBearer', 18.3, 0, 18, YAW_W);

  // ================================================================ the Buttress Gallery (east face)
  const g = newKit(ctx, 'outside.gallery', 411, 0);
  const G = PLAN.gallery, [l1a, l1b] = G.lane1, [l2a, l2b] = G.lane2;
  const m1 = (l1a + l1b) / 2, m2 = (l2a + l2b) / 2;
  // balcony (y 28) outside the Coronation's east door
  floor(g, 'flagstone', H, G.zS, G.outer, 12.8, 28, 0.6);
  g.bmm('stone_trim', H, 26.2, G.zS, G.outer, 27.4, 12.8, { cast: false });
  // flights: G1 lane1 28→21 northward, G2 lane2 21→14 southward, G3 lane1 14→7 northward, G4 lane2 7→0 southward
  stairs(g, 'stone_wall', [m1, 21, G.zN], [m1, 28, G.zS], l1b - l1a, { floating: true });
  stairs(g, 'stone_wall', [m2, 14, G.zS], [m2, 21, G.zN], l2b - l2a, { floating: true });
  stairs(g, 'stone_wall', [m1, 7, G.zN], [m1, 14, G.zS], l1b - l1a, { floating: true });
  stairs(g, 'stone_wall', [m2, 0, G.zBottom], [m2, 7, G.zN], l2b - l2a, { baseY: 0 });
  for (let i = 1; i < 10; i++) { const za = G.zBottom + ((G.zN - G.zBottom) * i) / 10, zb = G.zBottom + ((G.zN - G.zBottom) * (i + 1)) / 10; g.solid(l2a, 0, Math.min(za, zb), l2b, (7 * i) / 10 - 0.3, Math.max(za, zb)); }
  // landings: north at 21 and 7, south at 14; bottom landing at 0 before the gate
  for (const y of [21, 7]) floor(g, 'flagstone', H, -13.6, G.outer, G.zN, y, 0.6);
  floor(g, 'flagstone', H, G.zS, G.outer, 11, 14, 0.6);
  floor(g, 'flagstone', l2a - 0.1, G.zBottom, G.outer, PLAN.ledgeE.z0, 0, 1.0);
  // lane1 plinth under G3 (ground to the north landing at 7), so nothing passes beneath the gallery
  g.bmm('stone_wall', H, 0, -13.6, l1b + 0.1, 6.4, G.zN, { col: true });
  g.bmm('stone_wall', H, 0, G.zN, l1b + 0.05, 7 - 0.02, G.zS - 0.3, { col: true, cast: false });
  g.bmm('stone_wall', H, 0, G.zS - 0.3, l1b + 0.05, 13.4, PLAN.ledgeE.z0 - 0.05, { col: true });
  g.bmm('stone_wall', G.outer - 0.3, 0, PLAN.ledgeE.z0 - 0.3, PLAN.ledgeE.x1, 4.4, PLAN.ledgeE.z0 + 0.1, { col: true });
  // outer parapet (the storm side) and the wall between the lanes
  const flightParapet = (x: number, zA: number, yA: number, zB: number, yB: number) => {
    const len = Math.hypot(zB - zA, yB - yA), ang = Math.atan2(yB - yA, zB - zA);
    g.box('stone_wall', x, (yA + yB) / 2 + 0.55, (zA + zB) / 2, 0.36, 1.1, len, { rx: -ang });
    g.box('stone_trim', x, (yA + yB) / 2 + 1.12, (zA + zB) / 2, 0.44, 0.1, len, { rx: -ang, cast: false });
    const n = 10;
    for (let i = 0; i < n; i++) {
      const za = zA + ((zB - zA) * i) / n, zb = zA + ((zB - zA) * (i + 1)) / n, ya = yA + ((yB - yA) * i) / n;
      g.solid(x - 0.2, Math.min(ya, ya + (yB - yA) / n) - 0.2, Math.min(za, zb), x + 0.2, Math.max(ya, ya + (yB - yA) / n) + 1.4, Math.max(za, zb));
    }
  };
  flightParapet(G.outer, G.zS, 28, G.zN, 21);            // outer, beside G1 (lane1 is inner; lane2 G2 below runs outer)
  flightParapet(G.outer, G.zN, 21, G.zS, 14);
  flightParapet(G.outer, G.zS, 14, G.zN, 7);
  flightParapet(G.outer, G.zN, 7, G.zBottom, 0);
  flightParapet((l1b + l2a) / 2, G.zS, 28, G.zN, 21);    // between lanes along G1 (G2 lower beside it)
  flightParapet((l1b + l2a) / 2, G.zS, 14, G.zN, 7);     // along G3
  flightParapet((l1b + l2a) / 2, G.zN, 21, G.zS, 14);    // along G2
  flightParapet((l1b + l2a) / 2, G.zN, 7, G.zBottom, 0); // along G4
  parapetWall(g, l2a - 0.1, G.zS + 0.2, G.outer, G.zS + 0.2, 28, 0.36); // balcony edge over G2
  for (const [z0, z1, y] of [[-13.6, G.zN, 21], [-13.6, G.zN, 7], [G.zS, 11, 14], [G.zS, 12.8, 28]] as const) {
    parapetWall(g, G.outer, z0, G.outer, z1, y, 0.36);
    parapetWall(g, H, z0 < 0 ? -13.6 : z1, G.outer, z0 < 0 ? -13.6 : z1, y, 0.36);
  }
  // buttress piers carrying the flights
  for (const z of [-12.5, -5, 2.5, 10]) g.bmm('stone_wall', G.outer - 0.5, -2, z - 0.5, G.outer + 0.4, 27.4, z + 0.5, { cast: true });
  // the gate at the bottom (opens from the stair side only)
  ctx.pieces.galleryGate = galleryGate(ctx, m2, 0, PLAN.ledgeE.z0 - 0.2);
  ctx.anchors.galleryLever = anchor(m2, 0, G.zBottom + 0.9, YAW_S);
  ctx.anchors.galleryGateOut = anchor(m2, 0, PLAN.ledgeE.z0 + 1.4, YAW_N);
  ctx.anchors.galleryNook = anchor(18.4, 21, -12.6, YAW_N);
  g.light(0xffa860, 4, 8, H + 0.6, 30.2, 10.5, 0.7);
  g.light(0xffa860, 4, 8, H + 0.6, 16.2, 9.2, 0.7);
  g.light(0xffa860, 4, 8, H + 0.6, 2.4, 8.8, 0.7);
  e('bf_gal_echo', 'keeperEcho', m2, 14.0, 10, YAW_N);
  e('bf_gal_archer', 'archer', 17.8, 21, -12.4, YAW_S);

  // ================================================================ backdrop: storm, mountains, the kingdom below
  const b = newKit(ctx, 'outside.backdrop', 421, -60);
  mountainRing(b, 0, 0, 900, 14, 811, -120);
  skylineRing(b, 0, 120, 160, 420, -Math.PI * 0.95, -Math.PI * 0.05, Math.round(120 * ctx.shared.detail), -70, 812, 0.07);
  skylineRing(b, 0, 0, 260, 520, Math.PI * 0.1, Math.PI * 0.9, Math.round(90 * ctx.shared.detail), -70, 813, 0.05);
  cathedral(b, -140, -70, 260, 0.3, 2.2);
  farKeep(b, 210, -70, 180, 1.6);
  spireTower(b, -60, -70, 190, 8, 40, 26);
  // the crag the Belfry stands on, falling away into the dark
  b.add('rock_cliff', new THREE.CylinderGeometry(34, 70, 70, 14, 3, true), { x: 0, y: -75, z: 5 }, { cast: false, receive: false });
  b.add('rock_cliff', new THREE.CylinderGeometry(18, 40, 60, 12, 2, true), { x: 0, y: -66, z: 64 }, { cast: false, receive: false });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add('rock_cliff', new THREE.IcosahedronGeometry(9 + (i % 4) * 3, 0), { x: Math.cos(a) * 30, y: -30 - (i % 3) * 8, z: 5 + Math.sin(a) * 30 }, { cast: false });
  }

  const tollPosts = [{
    id: 'terrace', pos: new THREE.Vector3(-8.5, 0, 19.5), radius: 7,
    options: [
      { id: 'door', toward: new THREE.Vector3(0, 0, 17) },
      { id: 'ledge', toward: new THREE.Vector3(-18.3, 0, 16) },
      { id: 'causeway', toward: new THREE.Vector3(0, 0, 25) },
    ],
  }];
  void cyl; void cone; void getMaterial; void YAW_E; void YAW_W;
  return { foot, enemies, tollPosts };
}

/** Iron gate at the bottom of the Buttress Gallery: bars rise into the lintel (set(1) = open). */
function galleryGate(ctx: BCtx, x: number, y: number, z: number): DynamicPiece & { anchor: ReturnType<typeof anchor> } {
  const root = new THREE.Group();
  root.name = 'galleryGate';
  ctx.dynamicRoot.add(root);
  const iron = getMaterial('iron');
  const W = PLAN.gallery.lane2[1] - PLAN.gallery.lane2[0] + 0.3, Hh = 3.2;
  const bars = new THREE.Group();
  const barGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) barGeos.push(new THREE.CylinderGeometry(0.03, 0.03, Hh, 6).translate(-W / 2 + 0.1 + (i * (W - 0.2)) / 10, Hh / 2, 0));
  for (const hy of [0.3, 1.6, 2.9]) barGeos.push(new THREE.BoxGeometry(W, 0.08, 0.08).translate(0, hy, 0));
  bars.add(new THREE.Mesh(mergeSimple(barGeos), iron));
  bars.position.set(x, y, z);
  root.add(bars);
  // arch frame (static look, but part of this piece so it reads with the gate)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.6, 0.6), getMaterial('stone_trim'));
  frame.position.set(x, y + Hh + 0.3, z);
  root.add(frame);
  const col = ctx.shared.collision?.addDynamicBox('belfry:galleryGate', [W, Hh, 0.3], 'metal');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + Hh / 2, z));
  const piece = {
    object: root, collider: col, anchor: anchor(x, y, z - 1.2, YAW_S),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      bars.position.y = y + e * (Hh - 0.25);
      if (col) col.enabled = e < 0.7;
    },
  };
  piece.set(0);
  return piece;
}
