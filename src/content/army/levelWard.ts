/**
 * The Upper Ward (y = 6, x ∈ [−42, 42], z ∈ [−172, −126]) and the Hall of the Last Feast.
 *
 * North of the Ram-Knight's passage. The Hall (west) is set for the feast of the victory — long
 * tables, candles, goblets, gilded banners — and at the same time barricaded for the last stand:
 * tables overturned at the door, bolts in the boards, the dead where they fell, burnt banners over
 * the dais. The ward itself holds the winch that raises the Eastern Lane's portcullis (shortcut 2)
 * and the Grand Stair up to the Marshal's Keep (y = 14).
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  floor, wall, stairs, gableRoof, bellPost, well, cart, barrel, crate, crateStack, anvil, forge, sconceTorch,
  armourStand, weaponRack, candelabrum, hay, trough, shedRoof, rubble, column, slit,
} from '../../world/kit';
import {
  type AreaCtx, type AreaOut, emptyOut, newKit, anchor, yawTo, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, box3,
  armyBanner, armyStandard, snowCap, driftLine,
} from './levelCommon';
import { feastTable, barricadeTable, fallenSoldier, fireBasket, kegs, campClutter, pikeStand, gabion } from './levelProps';
import { winch } from './levelPieces';

export const WARD_ZONE = box3(-42, 5, -172, 42, 16, -126);
export const HALL_ZONE = box3(-38, 5, -164, -14, 18, -132);

export function buildWard(ctx: AreaCtx): AreaOut {
  const k = newKit(ctx, 'ward', 701);
  const out = emptyOut();
  const W = PLAN.ward, Y = W.y, H = PLAN.hall, St = PLAN.wardStair;

  // ---------------------------------------------------------------- ground and enclosing walls
  k.solid(W.x0, -1, W.z0, W.x1, Y, W.z1);
  floor(k, 'cobble', W.x0, W.z0, W.x1, W.z1, Y + 0.01, 0.3, false);
  for (let i = 0; i < 12; i++) k.box(i % 2 ? 'mud' : 'water', k.rng.range(-10, 40), Y + 0.02, k.rng.range(-168, -130), k.rng.range(0.8, 2.2), 0.01, k.rng.range(0.6, 1.6), { ry: k.rng.range(0, 3), cast: false });
  const top = Y + 10;
  // south wall (between the passage and the lane), east wall, west wall
  k.bmm('stone_wall', W.x0 - 3, -1, W.z1 - 3, -9.1, top, W.z1, { col: true });
  k.bmm('stone_wall', 9.1, -1, W.z1 - 3, PLAN.eastLane.x0, top, W.z1, { col: true });
  k.bmm('stone_wall', PLAN.eastLane.x1, -1, W.z1 - 3, W.x1 + 3, top, W.z1, { col: true });
  k.bmm('stone_wall', -9.1, Y + 12, W.z1 - 3, 9.1, top + 2, W.z1, { col: true });
  k.bmm('stone_wall', W.x1, -1, W.z0, W.x1 + 3, top, W.z1 - 3, { col: true });
  k.bmm('stone_wall', W.x0 - 3, -1, W.z0, W.x0, top, W.z1 - 3, { col: true });
  for (const [x0, x1] of [[W.x0 - 3, -9.1], [9.1, W.x1 + 3]] as const) {
    k.bmm('stone_trim', x0, top - 0.3, W.z1 - 3.1, x1, top, W.z1 + 0.1, { cast: false });
    snowCap(ctx, x0, W.z1 - 3, x1, W.z1, top, 0.14);
  }
  snowCap(ctx, W.x1, W.z0, W.x1 + 3, W.z1 - 3, top, 0.14);
  // the passage's north mouth frame
  for (const s of [-1, 1]) k.bmm('stone_trim', s * 5.5 - 0.4, Y, W.z1 - 0.2, s * 5.5 + 0.4, Y + 7.6, W.z1 + 0.2, { cast: false });
  armyBanner(ctx, k, 0, Y + 11.4, W.z1 - 0.02, YAW_N, 2.4, 4.4, false);

  // ---------------------------------------------------------------- the Hall of the Last Feast
  const hx0 = H.x0, hx1 = H.x1, hz0 = H.z0, hz1 = H.z1, ht = 1.2, hTop = Y + 11;
  const doorZ = -148, doorW = 4.4;
  wall(k, 'stone_wall', hx0, hz1, hx1, hz1, Y, hTop - Y, ht, { openings: [{ u: 0, w: 3.4, sill: 3.2, h: 4.2, kind: 'pointed' }, { u: -7, w: 2.2, sill: 3.6, h: 3.6, kind: 'pointed' }, { u: 7, w: 2.2, sill: 3.6, h: 3.6, kind: 'pointed' }] });
  wall(k, 'stone_wall', hx0, hz0, hx1, hz0, Y, hTop - Y, ht, { openings: [{ u: 0, w: 4.2, sill: 4, h: 5, kind: 'pointed' }] });
  wall(k, 'stone_wall', hx0, hz0, hx0, hz1, Y, hTop - Y, ht, { openings: [-10, -3, 4, 11].map((u) => ({ u, w: 1.8, sill: 4.2, h: 3.4, kind: 'pointed' as const })) });
  wall(k, 'stone_wall', hx1, hz0, hx1, hz1, Y, hTop - Y, ht, { openings: [{ u: doorZ - (hz0 + hz1) / 2, w: doorW, sill: 0, h: 5.2, kind: 'pointed' }, { u: -11, w: 1.8, sill: 4.2, h: 3.4, kind: 'pointed' }, { u: 11, w: 1.8, sill: 4.2, h: 3.4, kind: 'pointed' }] });
  gableRoof(k, (hx0 + hx1) / 2, hTop, (hz0 + hz1) / 2, 0, hx1 - hx0 + 1.6, hz1 - hz0 + 1.6, { pitch: 0.75 });
  floor(k, 'flagstone', hx0 + 0.6, hz0 + 0.6, hx1 - 0.6, hz1 - 0.6, Y + 0.02, 0.1, false);
  for (let z = hz0 + 3; z < hz1 - 2; z += 5) {
    for (const x of [hx0 + 1.2, hx1 - 1.2]) column(k, 'stone_wall', x, Y, z, 8, 0.4, false);
    k.box('timber_dark', (hx0 + hx1) / 2, hTop - 0.3, z, hx1 - hx0, 0.4, 0.4, { cast: false });
  }
  // the dais (north) with the high table, the Marshal's empty chair
  const dz1 = hz0 + 6.5;
  k.bmm('stone_trim', hx0 + 0.6, Y, hz0 + 0.6, hx1 - 0.6, Y + 0.6, dz1, { col: true });
  stairs(k, 'stone_trim', [(hx0 + hx1) / 2, Y, dz1 + 1.6], [(hx0 + hx1) / 2, Y + 0.6, dz1], 6, { baseY: Y });
  feastTable(k, (hx0 + hx1) / 2, Y + 0.6, hz0 + 3.6, YAW_E, 8, true);
  k.box('timber_dark', (hx0 + hx1) / 2, Y + 1.8, hz0 + 1.6, 1.2, 2.4, 0.2);
  k.box('cloth_red', (hx0 + hx1) / 2, Y + 1.4, hz0 + 1.78, 0.9, 1.4, 0.02, { cast: false });
  out.anchors.highTable = anchor((hx0 + hx1) / 2 + 1.5, Y + 0.6, hz0 + 5.2, YAW_N);
  weaponRack(k, hx0 + 1.4, Y + 0.6, hz0 + 3.6, YAW_E, 2.4);
  out.anchors.hallRack = anchor(hx0 + 2.9, Y + 0.6, hz0 + 3.6, YAW_W);
  armourStand(k, hx1 - 1.6, Y + 0.6, hz0 + 3.0, YAW_W, 'steel_armor', 'cloth_red');
  out.anchors.hallArmour = anchor(hx1 - 3.0, Y + 0.6, hz0 + 3.0, YAW_E);
  // the long tables set for the victory (south half) ...
  feastTable(k, -30, Y, -144, YAW_S, 16, true);
  feastTable(k, -22, Y, -144, YAW_S, 16, true);
  candelabrum(k, -26, Y, -150, 7);
  candelabrum(k, -26, Y, -138, 7);
  k.light(0xffb070, 8, 14, -26, Y + 2.2, -150, 0.6);
  k.light(0xffb070, 8, 14, -26, Y + 2.2, -138, 0.6);
  // ... and the last stand at the door: overturned tables, the dead, bolts everywhere
  barricadeTable(k, hx1 - 3.2, Y, doorZ - 3.4, YAW_E, 3.2, true);
  barricadeTable(k, hx1 - 3.4, Y, doorZ + 3.6, YAW_E + 0.3, 3.2, true);
  barricadeTable(k, -18.5, Y, -158, 0.5, 4, true);
  for (const [x, z, yaw] of [[-17.2, -150.5, 1.2], [-19, -143, -0.4], [-25.5, -155, 2.1], [-33.5, -151.5, 0.8], [-20.5, -158, -1.9]] as const) fallenSoldier(k, x, Y, z, yaw);
  // banners: gilded over the tables, burned over the dais
  for (const z of [-137, -143, -149]) { armyBanner(ctx, k, hx0 + 0.62, Y + 8.4, z, YAW_E, 1.6, 4.4, false); armyBanner(ctx, k, hx1 - 0.62, Y + 8.4, z, YAW_W, 1.6, 4.4, false); }
  for (const z of [-157, -161]) { armyBanner(ctx, k, hx0 + 0.62, Y + 8.4, z, YAW_E, 1.6, 4.4, true); armyBanner(ctx, k, hx1 - 0.62, Y + 8.4, z, YAW_W, 1.6, 4.4, true); }
  armyBanner(ctx, k, (hx0 + hx1) / 2, Y + 10, hz0 + 0.62, YAW_S, 3.2, 6, true);
  for (let i = 0; i < 12; i++) k.box('timber_dark', hx1 - 0.66, Y + 1 + (i % 4) * 0.6, doorZ - 5 + i * 0.85, 0.5, 0.02, 0.02, { ry: 0.2 * ((i % 3) - 1), cast: false });
  sconceTorch(k, hx1 + 0.62, Y + 3, doorZ - doorW / 2 - 0.8, YAW_E);
  sconceTorch(k, hx1 + 0.62, Y + 3, doorZ + doorW / 2 + 0.8, YAW_E);
  out.triggers.feastHall = box3(hx0 + 1, Y - 1, hz0 + 1, hx1 - 1, Y + 5, hz1 - 1);
  out.anchors.feastInspect = anchor(-26, Y, -146, YAW_W);
  out.anchors.lastStand = anchor(hx1 - 2.2, Y, doorZ, YAW_E);

  // ---------------------------------------------------------------- the ward: stables, smithy, stores, the winch
  shedRoof(k, 30, Y + 4, -167, 0, 22, 5, 1.2);
  for (const x of [20, 25, 30, 35, 40]) k.box('timber_dark', x, Y + 1.8, -164.8, 0.22, 3.6, 0.22, { col: 'wood' });
  hay(k, 23, Y, -168, 0.2); hay(k, 34, Y, -168.5, -0.1); trough(k, 28.5, Y, -165.8, 0);
  const fp = forge(k, 38.5, Y, -150, YAW_W, Y + 7);
  void fp;
  anvil(k, 36.2, Y, -150.5, 0.3);
  k.light(0xff7a30, 9, 12, 37.8, Y + 1.2, -150, 1);
  weaponRack(k, 40.8, Y, -144, YAW_W, 2.4);
  crateStack(k, 40.5, Y, -158, 0.2, true);
  kegs(k, 38.5, Y + 0.37, -160.5, 4, true);
  cart(k, 16, Y, -159, 0.5, true, true);
  well(k, -4, Y, -140, 0);
  campClutter(k, 18, Y, -131, 9);
  campClutter(k, -8, Y, -131.5, 10);
  pikeStand(k, 22, Y, -130.5, YAW_S, 5);
  for (const [x, z] of [[12, -138], [13.1, -138.6]] as const) gabion(k, x, Y, z);
  fireBasket(k, 6, Y, -134, 1.1);
  armyStandard(ctx, k, -8, Y, -166, YAW_S, 7.5, 1.4, 3.4, false);
  armyStandard(ctx, k, 8, Y, -166, YAW_S, 7.5, 1.4, 3.4, true);
  // the winch for the Eastern Lane's portcullis (on the ward side)
  const L = PLAN.eastLane;
  out.pieces.eastWinch = winch(ctx, k, 'eastGate', L.x1 + 2.4, Y, W.z1 - 3.6, YAW_N, anchor(L.x1 + 2.4, Y, W.z1 - 5.4, YAW_S));
  k.add('rope', new THREE.CylinderGeometry(0.03, 0.03, 4.2, 4), { x: L.x1 + 1.2, y: Y + 3, z: W.z1 - 2.2, rz: 1.0 }, { cast: false });
  out.anchors.eastGateWard = anchor((L.x0 + L.x1) / 2, Y, W.z1 - 2.2, YAW_S);
  // a fallen bellwarden at the foot of the stair, his greatsword under him
  fallenSoldier(k, -6.2, Y, -152.5, 0.9);
  k.box('steel_bright', -5.2, Y + 0.05, -151.8, 0.08, 0.02, 1.5, { ry: 0.6, cast: false });
  out.anchors.bellwardenSword = anchor(-5.2, Y + 0.05, -151.8, YAW_N);
  out.anchors.wardScrap = anchor(40.2, Y, -156.5, YAW_E);
  const toll = V(8, Y, -142);
  bellPost(k, toll.x, Y, toll.z, 0);
  out.tolls.push({ id: 'toll_ward', pos: toll.clone(), radius: 3.8, options: [
    { id: 'hall', toward: V(hx1, Y, doorZ) }, { id: 'stair', toward: V(0, Y, St.zLo) }, { id: 'lane', toward: V(31, Y, -127) },
  ] });
  driftLine(ctx, 41, -128, 41, -170, Y, 12, 91, 0.8);
  driftLine(ctx, -11, -128, 26, -128, Y, 10, 92, 0.7);
  driftLine(ctx, -12.4, -132, -12.4, -164, Y, 10, 93, 0.6);

  // ---------------------------------------------------------------- the keep terrace face and the Grand Stair
  const kz = PLAN.keep.z1;
  k.bmm('stone_wall', W.x0 - 3, -1, kz - 4, -St.w / 2, PLAN.keep.y, kz, { col: true });
  k.bmm('stone_wall', St.w / 2, -1, kz - 4, W.x1 + 3, PLAN.keep.y, kz, { col: true });
  for (const x of [-34, -24, -14, 14, 24, 34]) {
    k.bmm('stone_dark', x - 0.8, Y, kz, x + 0.8, PLAN.keep.y - 1.5, kz + 1.1, { col: true });
    k.box('stone_trim', x, PLAN.keep.y - 1.35, kz + 0.5, 1.8, 0.3, 1.3, { cast: false });
  }
  k.bmm('stone_trim', W.x0 - 3, PLAN.keep.y - 0.5, kz - 0.1, W.x1 + 3, PLAN.keep.y - 0.2, kz + 0.15, { cast: false });
  for (const x of [-28, -19, 19, 28]) slit(k, x, PLAN.keep.y - 3, kz + 0.01, YAW_S);
  stairs(k, 'stone_wall', [0, Y, St.zLo], [0, PLAN.keep.y, St.zHi], St.w, { baseY: Y - 1 });
  {
    const run = St.zLo - St.zHi, rise = PLAN.keep.y - Y, Ls = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    for (const s of [-1, 1]) {
      const xx = s * (St.w / 2 + 0.25);
      k.box('stone_wall', xx, Y + rise / 2 + 0.5, (St.zLo + St.zHi) / 2, 0.5, 1.2, Ls, { rx: ang });
      k.box('stone_trim', xx, Y + rise / 2 + 1.12, (St.zLo + St.zHi) / 2, 0.62, 0.12, Ls, { rx: ang, cast: false });
      k.solidC(xx, Y + rise / 2 + 0.55, (St.zLo + St.zHi) / 2, 0.5, 1.4, Ls, [ang, 0, 0]);
      k.bmm('stone_wall', xx - 0.25, Y - 1, St.zLo - 0.1, xx + 0.25, Y + 1.2, St.zLo + 0.5, { col: true });
      armyStandard(ctx, k, xx + s * 0.8, Y, St.zLo + 0.8, YAW_S, 6, 1.1, 2.6, s > 0);
    }
  }
  driftLine(ctx, -40, kz + 1.4, -5, kz + 1.4, Y, 10, 94, 0.8);
  driftLine(ctx, 5, kz + 1.4, 40, kz + 1.4, Y, 10, 95, 0.8);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, y: number, z: number, yaw: number, leash = 16, idle: EnemySpawn['idleAnim'] = 'stand'): EnemySpawn => ({ id: 'army_ward_' + id, kind, anchor: anchor(x, y, z, yaw), leash, idleAnim: idle });
  out.enemies.push(
    E('pike_a', 'pikeman', 8.4, Y, -150, YAW_S, 16),
    E('pike_b', 'pikeman', 10, Y, -150, YAW_S, 16),
    E('pike_c', 'pikeman', 11.6, Y, -150, YAW_S, 16),
    E('hall_ts1', 'twiceSlain', -28.6, Y, -140, YAW_E, 12),
    E('hall_ts2', 'twiceSlain', -23.4, Y, -147, YAW_W, 12),
    E('hall_ts3', 'twiceSlain', -28.6, Y, -150, YAW_E, 12),
    E('hall_knight', 'siegeKnight', -26, Y + 0.6, -159, YAW_S, 10),
    E('sapper1', 'sapper', 24, Y, -160, YAW_S, 8),
    E('hound1', 'warHound', 30, Y, -140, YAW_W, 20),
    E('ts1', 'twiceSlain', -6, Y, -136, yawTo(-6, -136, 0, -126), 14),
  );
  void YAW_E; void YAW_W;
  return out;
}
