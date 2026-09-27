/**
 * The lower town (y = 0): the Pilgrims' Gate with the entry Stillbell, Candle Street running north
 * between snow-dusted half-timbered houses (candle fields at every threshold), the crossroads with
 * the Pilgrim Roll and the toll-post, the west lane to the Masons' Yard (where names are cut over),
 * the east lane to a pilgrims' shrine court, and the plaza at the foot of the Pilgrim Stair (with
 * the Name-Ossuary's locked grate in the east retaining wall).
 *
 * Walkable space is bounded by explicit collider walls on the facade lines; houses are visual.
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import {
  house, bound, floor, bellPost, barrel, crate, crateStack, sack, cart, bracketLantern, lantern, wall, brazier, stillbellShrine,
  rubble, candles, bench, headstone, masonsTools, type StillbellShrine, type HouseOpts, skylineRing, mountainRing, spireTower, deadTree,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, snowRoof, candleField, plaqueWall, statue, SnowBatch } from './levelCommon';
import type { Kit } from '../../world/kit';

export interface TownBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
}

/** A half-timbered house with snow on its roof, window sills and doorstep. */
export function snowyHouse(k: Kit, snow: SnowBatch, x: number, y: number, z: number, yaw: number, o: HouseOpts & { pitchDeg?: number }) {
  const pitch = ((o.pitchDeg ?? 52 + ((Math.abs(Math.round(x * 13 + z * 7)) % 9))) * Math.PI) / 180;
  const roof = o.roof ?? 'front';
  const info = house(k, x, y, z, yaw, { ...o, roof, pitch });
  const n = o.storeys, jet = o.burned ? (o.jetty ?? 0.4) : (o.jetty ?? 0.45);
  const fTop = (n - 1) * jet, rd = o.d + fTop, rcz = (fTop - o.d) / 2;
  k.push(x, y, z, yaw);
  if (roof === 'front') snowRoof(k, snow, 0, info.eaves, rcz, 0, o.w, rd, pitch);
  else snowRoof(k, snow, 0, info.eaves, rcz, Math.PI / 2, rd, o.w, pitch);
  // drift along the foot of the facade and on the jetty ledges
  snow.drift(k, 0, 0, 0.35, o.w * 0.9, 0.5, 0.05);
  for (let s = 1; s < n; s++) snow.cap(k, -o.w / 2, (o.groundH ?? 3) + (s - 1) * (o.storeyH ?? 2.75) - 0.02, s * jet - 0.02, o.w / 2, s * jet + 0.12, 0.05);
  k.pop();
  return info;
}

export function buildTown(ctx: AreaCtx): TownBuild {
  const k = newKit(ctx, 'town', 31, 0);
  const snow = ctx.snow;
  const G = PLAN.gate, S = PLAN.street, X = PLAN.cross, P = PLAN.plaza, Y = PLAN.yard;
  const anchors: Record<string, Anchor> = {};

  // ---------------------------------------------------------------- ground (one collider slab)
  k.solid(-40, -1, 12, 34, 0, 76);
  floor(k, 'cobble', G.x0, G.z0, G.x1, G.z1, 0, 0.3, false);
  floor(k, 'cobble', S.x0, S.z0, S.x1, S.z1, 0, 0.3, false);
  floor(k, 'cobble', PLAN.westLane.x0, X.z0, PLAN.westLane.x1, X.z1, 0, 0.3, false);
  floor(k, 'cobble', PLAN.eastLane.x0, X.z0, PLAN.eastLane.x1, X.z1, 0, 0.3, false);
  floor(k, 'flagstone', PLAN.eastCourt.x0, PLAN.eastCourt.z0, PLAN.eastCourt.x1, PLAN.eastCourt.z1, 0, 0.3, false);
  floor(k, 'mud', Y.x0, Y.z0, Y.x1, Y.z1, 0, 0.3, false);
  floor(k, 'flagstone', P.x0, P.z0, P.x1, P.z1, 0, 0.3, false);
  // gutter down the middle of the street, wet
  k.bmm('stone_dark', -0.3, 0.004, S.z0, 0.3, 0.012, G.z1, { cast: false });
  for (let i = 0; i < 16; i++) {
    const x = k.rng.range(-5, 5), z = k.rng.range(16, 70);
    k.box('water', x, 0.012, z, k.rng.range(0.8, 2.2), 0.01, k.rng.range(0.6, 1.6), { ry: k.rng.range(0, 3), cast: false });
  }
  // snow: drifts along both kerbs, heaped in corners, trodden clear down the middle
  for (let z = S.z0 + 1; z < G.z1 - 1; z += 2.2) {
    for (const sx of [-1, 1]) {
      const edge = z > G.z0 ? G.x1 : S.x1;
      if (z > X.z0 && z < X.z1) continue;
      snow.drift(k, sx * (edge - 0.9 - k.rng.range(0, 0.5)), 0, z, k.rng.range(1.2, 2.2), k.rng.range(1.4, 2.4), k.rng.range(0.04, 0.09), k.rng.range(-0.3, 0.3));
    }
  }
  for (let i = 0; i < 18; i++) snow.drift(k, k.rng.range(Y.x0 + 1, Y.x1 - 1), 0, k.rng.range(Y.z0 + 1, Y.z1 - 1), k.rng.range(1, 2.5), k.rng.range(1, 2.5), k.rng.range(0.04, 0.12), k.rng.range(0, 3));
  for (let i = 0; i < 10; i++) snow.drift(k, k.rng.range(P.x0 + 1, P.x1 - 1), 0, k.rng.range(P.z0 + 1, P.z1 - 1), k.rng.range(1, 2.4), k.rng.range(1, 2.4), k.rng.range(0.03, 0.07), k.rng.range(0, 3));

  // ---------------------------------------------------------------- the Pilgrims' Gate (south)
  // gatehouse: two squat towers and a closed portcullis behind the arrival point
  for (const sx of [-1, 1]) {
    k.bmm('stone_wall', sx * 5.5 - 2.5, 0, G.z1, sx * 5.5 + 2.5, 11, G.z1 + 5);
    k.bmm('stone_trim', sx * 5.5 - 2.8, 10.6, G.z1 - 0.3, sx * 5.5 + 2.8, 11.2, G.z1 + 5.3, { cast: false });
    snow.cap(k, sx * 5.5 - 2.8, 11.2, G.z1 - 0.3, sx * 5.5 + 2.8, G.z1 + 5.3, 0.12);
  }
  k.bmm('stone_wall', -3, 6, G.z1, 3, 11, G.z1 + 5);
  k.box('iron', 0, 3, G.z1 + 0.6, 6, 6, 0.12, { cast: true });
  for (let i = 0; i < 9; i++) k.box('iron', -2.8 + i * 0.7, 3, G.z1 + 0.5, 0.1, 6, 0.1, { cast: false });
  k.solid(-9, 0, G.z1, 9, 8, G.z1 + 1.2);
  // gate plaza houses (face inward)
  snowyHouse(k, snow, G.x0, 0, 60, YAW_E, { w: 5.8, d: 8, storeys: 3, roof: 'side', seed: 401, lit: 0.55 });
  snowyHouse(k, snow, G.x0, 0, 66.2, YAW_E, { w: 5.6, d: 8, storeys: 2, roof: 'front', seed: 402, lit: 0.5, shop: true });
  snowyHouse(k, snow, G.x1, 0, 59.6, YAW_W, { w: 5.2, d: 8, storeys: 3, roof: 'front', seed: 403, lit: 0.55, sign: true });
  snowyHouse(k, snow, G.x1, 0, 65.6, YAW_W, { w: 6.2, d: 8, storeys: 2, roof: 'side', seed: 404, lit: 0.45 });
  bound(k, G.x0, G.z0, G.x0, G.z1, 0, 6);
  bound(k, G.x1, G.z0, G.x1, G.z1, 0, 6);
  // the entry Stillbell (in the street, facing south: the Cathedral rises behind it)
  const shrine = stillbellShrine(k, 0, 0, G.shrineZ, YAW_S, 7);
  candleField(k, -2.2, 0, G.shrineZ + 0.2, YAW_S, 1.6, 1.0, 16);
  candleField(k, 2.2, 0, G.shrineZ + 0.2, YAW_S, 1.6, 1.0, 16);
  snow.drift(k, -3.6, 0, 62, 1.8, 2.6, 0.08);

  // ---------------------------------------------------------------- Candle Street houses
  const west: [number, number, number, HouseOpts['roof'], number][] = [[53.1, 5.8, 3, 'front', 411], [47.3, 5.8, 3, 'side', 412], [41.6, 5.6, 2, 'front', 413], [27, 6, 3, 'front', 414]];
  const east: [number, number, number, HouseOpts['roof'], number][] = [[53.2, 5.6, 2, 'side', 421], [47.5, 5.8, 3, 'front', 422], [41.6, 6.2, 3, 'side', 423], [27, 6, 2, 'front', 424]];
  for (const [z, w, n, roof, seed] of west) snowyHouse(k, snow, S.x0, 0, z, YAW_E, { w, d: 8, storeys: n, roof, seed, lit: 0.55, shop: seed % 2 === 0, sign: seed % 3 === 0 });
  for (const [z, w, n, roof, seed] of east) snowyHouse(k, snow, S.x1, 0, z, YAW_W, { w, d: 8, storeys: n, roof, seed, lit: 0.5, stoneBase: seed % 2 === 1 });
  // candle fields at thresholds (the candle street of the concept)
  for (const [x, z] of [[-4.9, 52.4], [-4.9, 44], [4.9, 50], [4.9, 42.5], [-4.9, 26], [4.9, 28.5]] as const) candleField(k, x, 0, z, x < 0 ? YAW_E : YAW_W, 1.8, 1.0, 18);
  for (const [x, z] of [[-5.2, 55.2], [5.2, 45.8], [-5.2, 39.2], [5.3, 24.8]] as const) candles(k, x, 0, z, 7, 0.35);
  bracketLantern(k, S.x0 + 0.1, 3.1, 49.5, YAW_E);
  bracketLantern(k, S.x1 - 0.1, 3.1, 44.2, YAW_W);
  k.light(0xffb466, 6, 12, -4.8, 3.0, 49.5, 0.35);
  k.light(0xffb466, 5, 11, 4.8, 3.0, 44.2, 0.35);
  // furniture
  cart(k, 4.3, 0, 51, 0.1, false);
  barrel(k, -5.1, 0, 46.2, 0, true); barrel(k, -4.6, 0, 45.6, 1, true);
  crateStack(k, 4.8, 0, 38.6, 0.3);
  sack(k, -5, 0, 28.8, 0.4); crate(k, -4.8, 0, 29.6, 0.2, 0.7, true);
  bench(k, 5.1, 0, 25.8, YAW_W);
  // street collider walls (facades), with the lane mouths open
  bound(k, S.x0, G.z0, S.x0, X.z1, 0, 6); bound(k, S.x0, X.z0, S.x0, P.z1, 0, 6);
  bound(k, S.x1, G.z0, S.x1, X.z1, 0, 6); bound(k, S.x1, X.z0, S.x1, P.z1, 0, 6);
  bound(k, G.x0, G.z0, S.x0, G.z0, 0, 6); bound(k, S.x1, G.z0, G.x1, G.z0, 0, 6);

  // ---------------------------------------------------------------- the crossroads: the Pilgrim Roll and the toll-post
  // the Roll: a stone screen at the mouth of the west lane, its names chiselled out and recut
  k.bmm('stone_wall', -14.8, 0, X.z0 - 0.1, -7.2, 4.2, X.z0 + 0.6, { col: true });
  k.bmm('stone_trim', -15.1, 4.1, X.z0 - 0.3, -6.9, 4.5, X.z0 + 0.8, { cast: false });
  snow.cap(k, -15.1, 4.5, X.z0 - 0.3, -6.9, X.z0 + 0.8, 0.1);
  plaqueWall(k, -11, 0.9, X.z0 + 0.6, YAW_S, 11, 7, 0.52, 0.34);
  candleField(k, -11, 0, X.z0 + 1.4, YAW_S, 3.2, 0.9, 24);
  anchors.roll = anchor(-11, 0, X.z0 + 2.4, YAW_N);
  bellPost(k, 4.7, 0, 38.8, 0.2);

  // ---------------------------------------------------------------- the west lane & the Masons' Yard
  snowyHouse(k, snow, -18, 0, X.z1, YAW_N, { w: 5, d: 7, storeys: 2, roof: 'side', seed: 431, lit: 0.4 });
  snowyHouse(k, snow, -18.5, 0, X.z0 - 0.8, YAW_S, { w: 6, d: 7, storeys: 3, roof: 'front', seed: 432, lit: 0.45 });
  bound(k, S.x0, X.z0 - 0.1, Y.x1, X.z0 - 0.1, 0, 6);
  bound(k, S.x0, X.z1, Y.x1, X.z1, 0, 6);
  // the yard: low walls, the cutting shed, stacks of blank and scarred tablets, a crane
  wall(k, 'stone_dark', Y.x0, Y.z0, Y.x1, Y.z0, 0, 3.2, 0.6);
  wall(k, 'stone_dark', Y.x0, Y.z1, Y.x1, Y.z1, 0, 3.2, 0.6);
  wall(k, 'stone_dark', Y.x0, Y.z0, Y.x0, Y.z1, 0, 3.2, 0.6);
  wall(k, 'stone_dark', Y.x1, Y.z0, Y.x1, X.z0, 0, 3.2, 0.6);
  wall(k, 'stone_dark', Y.x1, X.z1, Y.x1, Y.z1, 0, 3.2, 0.6);
  for (const [x0, z0, x1, z1] of [[Y.x0, Y.z0, Y.x1, Y.z0], [Y.x0, Y.z1, Y.x1, Y.z1], [Y.x0, Y.z0, Y.x0, Y.z1]] as const) snow.cap(k, Math.min(x0, x1) - 0.3, 3.2, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, Math.max(z0, z1) + 0.3, 0.08);
  // shed along the west wall
  for (let z = Y.z0 + 2; z <= Y.z1 - 2; z += 4) k.box('timber_dark', Y.x0 + 3.6, 1.6, z, 0.25, 3.2, 0.25, { col: 'wood' });
  k.box('roof_slate', Y.x0 + 1.9, 3.5, (Y.z0 + Y.z1) / 2, 4.2, 0.16, Y.z1 - Y.z0 - 1, { rz: -0.35 });
  snow.add(k, new THREE.BoxGeometry(3.8, 0.1, Y.z1 - Y.z0 - 1.2), { x: Y.x0 + 1.9, y: 3.66, z: (Y.z0 + Y.z1) / 2, rz: -0.35 });
  for (let i = 0; i < 6; i++) {
    const z = Y.z0 + 3 + i * 3.4;
    k.box(i % 2 ? 'stone_fresh' : 'stone_trim', Y.x0 + 1.6, 0.45, z, 1.2, 0.9, 0.5 + (i % 3) * 0.2, { ry: 0.1 * i, col: true });
    masonsTools(k, Y.x0 + 2.4, 0.9, z + 0.4, 0.3 * i);
  }
  // stacks of name-tablets: cut, scarred, recut
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4 + (i % 3); j++) k.box(j % 3 === 0 ? 'stone_dark' : j % 3 === 1 ? 'stone_fresh' : 'stone_trim', -30 + i * 1.3, 0.09 + j * 0.13, 25 + (i % 2) * 0.4, 1.0, 0.12, 0.6, { ry: k.rng.range(-0.15, 0.15), cast: false });
  k.solid(-30.7, 0, 24.6, -24.2, 0.8, 26.2);
  plaqueWall(k, -29, 0.8, Y.z1 - 0.35, YAW_N, 9, 5, 0.52, 0.34);
  // the masons' order on a trestle (inspect) and the crane over a half-lifted slab
  k.box('planks', -25.5, 0.8, 42.5, 2.0, 0.08, 0.9, { col: 'wood' });
  for (const sx of [-0.8, 0.8]) k.box('timber_dark', -25.5 + sx, 0.4, 42.5, 0.1, 0.8, 0.8, { cast: false });
  k.box('parchment', -25.4, 0.85, 42.5, 0.6, 0.01, 0.4, { ry: 0.2, cast: false });
  anchors.masonsOrder = anchor(-25.5, 0, 41.2, YAW_N);
  k.box('timber_dark', -24.2, 3.5, 30, 0.3, 7, 0.3, { col: 'wood' });
  k.box('timber_dark', -26.5, 6.8, 30, 4.8, 0.25, 0.25, { rz: 0.1 });
  k.box('rope', -28.6, 4.4, 30, 0.04, 4.6, 0.04, { cast: false });
  k.box('stone_fresh', -28.6, 1.6, 30, 1.6, 0.2, 1.0, { rx: 0.2, cast: true });
  brazier(k, -27.5, 0, 36.6, true, 0.9);
  k.light(0xff8a40, 7, 11, -27.5, 1.4, 36.6, 0.9);
  // the loot nook: behind the tablet stacks in the NW corner
  anchors.yardNook = anchor(Y.x0 + 1.2, 0, Y.z0 + 1.2, YAW_N);
  crate(k, Y.x0 + 0.9, 0, Y.z0 + 2.4, 0.3, 0.8, true);
  deadTree(k, -33.5, 0, 43.5, 5, 7);

  // ---------------------------------------------------------------- the east lane & the shrine court
  snowyHouse(k, snow, 14, 0, X.z1, YAW_N, { w: 6, d: 7, storeys: 2, roof: 'front', seed: 441, lit: 0.45 });
  snowyHouse(k, snow, 13.5, 0, X.z0 - 0.8, YAW_S, { w: 6, d: 7, storeys: 3, roof: 'side', seed: 442, lit: 0.5 });
  bound(k, S.x1, X.z0 - 0.1, PLAN.eastCourt.x0, X.z0 - 0.1, 0, 6);
  bound(k, S.x1, X.z1, PLAN.eastCourt.x0, X.z1, 0, 6);
  const C = PLAN.eastCourt;
  wall(k, 'stone_wall', C.x0, C.z0, C.x1, C.z0, 0, 4, 0.6);
  wall(k, 'stone_wall', C.x0, C.z1, C.x1, C.z1, 0, 4, 0.6);
  wall(k, 'stone_wall', C.x1, C.z0, C.x1, C.z1, 0, 4, 0.6);
  wall(k, 'stone_wall', C.x0, C.z0, C.x0, X.z0, 0, 4, 0.6);
  wall(k, 'stone_wall', C.x0, X.z1, C.x0, C.z1, 0, 4, 0.6);
  for (const [x0, z0, x1, z1] of [[C.x0, C.z0, C.x1, C.z0], [C.x0, C.z1, C.x1, C.z1], [C.x1, C.z0, C.x1, C.z1]] as const) snow.cap(k, Math.min(x0, x1) - 0.3, 4, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, Math.max(z0, z1) + 0.3, 0.1);
  statue(k, C.x1 - 1.2, 1.2, 34, YAW_W, 1.3);
  k.box('stone_trim', C.x1 - 1.1, 0.6, 34, 1.2, 1.2, 1.6, { col: true });
  candleField(k, C.x1 - 2.6, 0, 34, YAW_W, 3.0, 1.2, 30);
  for (let i = 0; i < 4; i++) headstone(k, C.x0 + 1.5 + i * 1.6, 0, C.z0 + 0.8, YAW_S, k.rng.range(0.8, 1.1), 0.6, k.rng.range(-0.1, 0.1));
  anchors.censer = anchor(C.x1 - 2.2, 0, 31.2, YAW_E);
  lantern(k, C.x1 - 1.5, 3.3, 36.6);

  // ---------------------------------------------------------------- the plaza at the foot of the Stair
  snowyHouse(k, snow, P.x0, 0, 19.2, YAW_E, { w: 8.6, d: 8, storeys: 3, roof: 'side', seed: 451, lit: 0.55, sign: true });
  snowyHouse(k, snow, P.x1, 0, 19.2, YAW_W, { w: 8.6, d: 8, storeys: 3, roof: 'side', seed: 452, lit: 0.5, stoneBase: true });
  bound(k, P.x0, P.z0, P.x0, P.z1, 0, 6);
  bound(k, P.x1, P.z0, P.x1, P.z1, 0, 6);
  bound(k, P.x0, P.z1, S.x0, P.z1, 0, 6);
  bound(k, S.x1, P.z1, P.x1, P.z1, 0, 6);
  anchors.grateOutside = anchor((PLAN.grate.x0 + PLAN.grate.x1) / 2, 0, P.z0 + 1.6, YAW_N);
  candleField(k, -10, 0, P.z0 + 1.3, YAW_S, 3.6, 1.4, 30);
  candleField(k, 10.2, 0, P.z0 + 1.3, YAW_S, 2.0, 1.2, 18);
  candles(k, PLAN.grate.x0 - 0.8, 0, P.z0 + 0.8, 6, 0.3);

  // ---------------------------------------------------------------- backdrop: the city climbing the hill, snowy peaks
  const back = newKit(ctx, 'backdrop', 37, 0);
  skylineRing(back, 0, 20, 95, 180, -0.4, Math.PI * 0.25, 34, 0, 71, 0.08);
  skylineRing(back, 0, 20, 95, 180, Math.PI * 0.75, Math.PI * 1.4, 34, 0, 72, 0.08);
  skylineRing(back, 0, -80, 75, 170, Math.PI * 0.15, Math.PI * 0.85, 30, 12, 73, 0.12);
  spireTower(back, -60, 8, -110, 7, 30, 26);
  spireTower(back, 70, 6, -90, 6, 26, 22);
  spireTower(back, -95, 0, 30, 6, 22, 18);
  mountainRing(back, 0, -40, 1100, 12, 74, -30);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, z: number, yaw: number, o: Partial<EnemySpawn> = {}): EnemySpawn => ({ id, kind, anchor: anchor(x, 0, z, yaw), leash: 16, ...o });
  const enemies: EnemySpawn[] = [
    E('plead_gate', 'cath_pilgrim', -3.6, 57.4, YAW_N, { idleAnim: 'kneel' }),
    E('st_pil1', 'cath_pilgrim', 2.5, 48, YAW_S),
    E('st_pil2', 'cath_pilgrim', -2.2, 44.5, YAW_S, { patrol: [V(-2.2, 0, 44.5), V(-2.5, 0, 52), V(2.5, 0, 52)] }),
    E('st_healer', 'cath_healer', 0.5, 40.4, YAW_S),
    E('st_pil3', 'cath_pilgrim', 3.4, 41.5, YAW_S),
    E('st_flag', 'cath_flagellant', -2.5, 27.5, YAW_S),
    E('yard_pil1', 'cath_pilgrim', -27, 32.5, YAW_E),
    E('yard_pil2', 'cath_pilgrim', -31.5, 40.5, YAW_S),
    E('yard_flag', 'cath_flagellant', -29.2, 27.6, YAW_E),
    E('court_healer', 'cath_healer', 26.5, 36.6, YAW_W),
    E('court_pil', 'cath_pilgrim', 24.5, 31.2, YAW_W),
    E('plead_plaza1', 'cath_pilgrim', -9.2, 16.6, YAW_N, { idleAnim: 'kneel' }),
    E('plead_plaza2', 'cath_pilgrim', -11.6, 16.9, YAW_N, { idleAnim: 'kneel' }),
    E('plaza_flag', 'cath_flagellant', 8.5, 18.5, YAW_S),
  ];

  const tollPost = {
    id: 'crossroads', pos: V(4.7, 0, 38.8), radius: 7,
    options: [{ id: 'stair', toward: V(0, 0, 14) }, { id: 'yard', toward: V(-24, 0, X.zc) }, { id: 'court', toward: V(24, 0, X.zc) }, { id: 'gate', toward: V(0, 0, 60) }],
  };

  rubble(k, -24.8, 0, 44.6, 0.7, false);

  return { shrine, enemies, anchors, tollPost };
}
