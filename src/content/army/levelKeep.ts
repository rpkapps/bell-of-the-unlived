/**
 * The Marshal's Keep (y = 14, x ∈ [−26, 26], z ∈ [−206, −172]) and the Bell Rampart (keeper
 * arena, a round bastion at y = 24 centred (0, 24, −228), radius 15) between the two bell towers.
 *
 * Between the tower tops a stone bridge carries the timber headframe from which the Royal Army's
 * Great Bell hangs — cracked, bleeding golden light — high over the rampart; it is the landmark
 * seen from the Siege Road. Marshal Varr's war-standard (her anchor) stands at the rampart's north
 * edge; bombard balconies on the towers' inner faces answer her call for a volley.
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  floor, stairs, parapet, stillbellShrine, bellPost, crateStack, barrel, sconceTorch, slit, towerSolid, corbels,
  weaponRack, rubble, cyl, ringSector, crenellation,
} from '../../world/kit';
import {
  type AreaCtx, type AreaOut, emptyOut, newKit, anchor, yawTo, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, box3,
  armyBanner, armyStandard, snowCap, driftLine, snowDrift,
} from './levelCommon';
import { fireBasket, kegs, bombard, shotPile, pikeStand } from './levelProps';
import { fogVeil, warStandard, greatBell, type Gate, type Piece } from './levelPieces';

export const KEEP_ZONE = box3(-26, 13, -209, 26, 30, -172);
export const RAMPART_ARENA_ZONE = box3(-16.5, 22, -244, 16.5, 44, -211.5);

export interface KeepBuild extends AreaOut {
  shrine: ReturnType<typeof stillbellShrine>;
  fog: Gate;
  anchorStandard: Piece;
  bell: Piece;
  /** Bombard muzzles on the towers (Varr's volley). */
  volleyMuzzles: THREE.Vector3[];
}

export function buildKeep(ctx: AreaCtx): KeepBuild {
  const k = newKit(ctx, 'keep', 801);
  const out = emptyOut();
  const K = PLAN.keep, Y = K.y, St = PLAN.keepStair, A = PLAN.arena, Tw = PLAN.towers, Bl = PLAN.bell;
  const Ay = A.c.y;

  // ---------------------------------------------------------------- the keep yard
  k.solid(K.x0, -1, K.z0, K.x1, Y, K.z1);
  floor(k, 'flagstone', K.x0, K.z0, K.x1, K.z1, Y + 0.01, 0.3, false);
  k.bmm('stone_wall', K.x0 - 3, -1, K.z0 - 6, K.x0, Y + 9, K.z1 - 4, { col: true });
  k.bmm('stone_wall', K.x1, -1, K.z0 - 6, K.x1 + 3, Y + 9, K.z1 - 4, { col: true });
  k.bmm('stone_wall', K.x0 - 3, -1, K.z1 - 4, K.x0, Y + 9, K.z1, { col: true });
  k.bmm('stone_wall', K.x1, -1, K.z1 - 4, K.x1 + 3, Y + 9, K.z1, { col: true });
  for (const x of [K.x0 - 1.5, K.x1 + 1.5]) crenellation(k, 'stone_wall', x, K.z0 - 6, x, K.z1, Y + 9, 3, { col: false, base: 0.4, merlonH: 1.0 });
  // the terrace edge over the ward: a parapet with crenels (crossbowmen shoot down into the ward)
  crenellation(k, 'stone_wall', K.x0, K.z1 + 0.25, -St.w / 2 - 0.2 - 0.9, K.z1 + 0.25, Y, 0.5, { base: 0.95, merlonH: 0.8, colH: 1.6 });
  crenellation(k, 'stone_wall', St.w / 2 + 0.2 + 0.9, K.z1 + 0.25, K.x1, K.z1 + 0.25, Y, 0.5, { base: 0.95, merlonH: 0.8, colH: 1.6 });
  for (const s of [-1, 1]) k.bmm('stone_wall', s * 3.9 - 0.4, Y, K.z1 - 0.3, s * 3.9 + 0.4, Y + 2.2, K.z1 + 0.5, { col: true });
  // north: the rampart bastion's base (a curtain between the towers) with the stair up
  k.bmm('stone_wall', K.x0, -1, K.z0 - 6, -St.w / 2 - 0.5, Ay, K.z0, { col: true });
  k.bmm('stone_wall', St.w / 2 + 0.5, -1, K.z0 - 6, K.x1, Ay, K.z0, { col: true });
  // the Marshal's Keep (east): a tall donjon, not entered
  towerSolid(k, 'stone_wall', 19, Y, -189, 12, 20, 30, 'crenel', 0, true);
  corbels(k, 'stone_wall', 13, -199, 25, -179, Y + 27.5, 0.8, 1.2);
  for (let yy = Y + 6; yy < Y + 27; yy += 6) for (const z of [-196, -189, -182]) slit(k, 12.99, yy, z, YAW_W, 0.28, 1.6);
  k.bmm('timber_dark', 12.9, Y, -191.2, 13.05, Y + 3.6, -188.8, { cast: false });
  k.bmm('stone_trim', 12.8, Y, -191.6, 13.1, Y + 4.0, -191.2, { cast: false });
  k.bmm('stone_trim', 12.8, Y, -188.8, 13.1, Y + 4.0, -188.4, { cast: false });
  armyBanner(ctx, k, 12.95, Y + 16, -189, YAW_W, 2.6, 8, false);
  snowCap(ctx, 13, -199, 25, -179, Y + 30, 0.18);
  // west: barracks lean-to and the Stillbell
  const shrine = stillbellShrine(k, -21.5, Y, -186, YAW_E, 7);
  snowCap(ctx, -22.5, -186.8, -20.5, -185.2, Y + 3.25, 0.08);
  k.bmm('timber_dark', K.x0 + 0.2, Y, -200, K.x0 + 0.4, Y + 3.4, -192, { cast: false });
  for (const z of [-199.8, -196, -192.2]) k.box('timber_dark', -21.5, Y + 1.5, z, 0.2, 3.0, 0.2, { col: 'wood' });
  k.box('planks', -23.8, Y + 3.3, -196, 5, 0.12, 8.2, { rz: 0.2 });
  weaponRack(k, K.x0 + 0.6, Y, -197.5, YAW_E, 2.4);
  crateStack(k, -24.5, Y, -193, 0.2, true);
  pikeStand(k, -8, Y, -174.2, YAW_N, 6);
  kegs(k, 8.5, Y + 0.37, -203.5, 2, true);
  barrel(k, 10.5, Y, -203.2, 0, true);
  fireBasket(k, -8, Y, -199, 1.1);
  fireBasket(k, 8, Y, -178, 1.1);
  k.light(0xff9c50, 9, 14, -8, Y + 1.9, -199, 0.9);
  armyStandard(ctx, k, -4.6, Y, -190.2, YAW_S, 7, 1.2, 3, false);
  armyStandard(ctx, k, 4.6, Y, -190.2, YAW_S, 7, 1.2, 3, true);
  out.anchors.keepScrap = anchor(-24, Y, -181, YAW_W);
  crateStack(k, -25, Y, -179.4, 0.1, true);
  const toll = V(-8, Y, -186);
  bellPost(k, toll.x, Y, toll.z, 0);
  out.tolls.push({ id: 'toll_keep', pos: toll.clone(), radius: 3.5, options: [
    { id: 'rampart', toward: V(0, Y, St.zLo) }, { id: 'ward', toward: V(0, Y, K.z1) }, { id: 'bell', toward: V(-21.5, Y, -186) },
  ] });
  driftLine(ctx, K.x0 + 0.8, -174, K.x0 + 0.8, -204, Y, 9, 101, 0.8);
  driftLine(ctx, K.x1 - 0.8, -174, K.x1 - 0.8, -176, Y, 2, 102, 0.8);
  driftLine(ctx, -24, K.z0 + 0.7, -4, K.z0 + 0.7, Y, 6, 103, 0.7);
  driftLine(ctx, 4, K.z0 + 0.7, 12, K.z0 + 0.7, Y, 3, 104, 0.7);

  // ---------------------------------------------------------------- the stair to the Bell Rampart
  stairs(k, 'stone_wall', [0, Y, St.zLo], [0, Ay, St.zHi], St.w, { baseY: Y - 1 });
  {
    const run = St.zLo - St.zHi, rise = Ay - Y, Ls = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    for (const s of [-1, 1]) {
      const xx = s * (St.w / 2 + 0.25);
      k.box('stone_wall', xx, Y + rise / 2 + 0.5, (St.zLo + St.zHi) / 2, 0.5, 1.2, Ls, { rx: ang });
      k.box('stone_trim', xx, Y + rise / 2 + 1.12, (St.zLo + St.zHi) / 2, 0.62, 0.12, Ls, { rx: ang, cast: false });
      k.solidC(xx, Y + rise / 2 + 0.55, (St.zLo + St.zHi) / 2, 0.5, 1.4, Ls, [ang, 0, 0]);
    }
  }
  // landing at the top (the veil)
  const lz0 = St.zHi, lz1 = A.c.z + A.r + 0.4;
  k.bmm('stone_wall', -St.w / 2 - 0.5, -1, lz1, St.w / 2 + 0.5, Ay, lz0, { col: true });
  k.bmm('flagstone', -St.w / 2, Ay - 0.01, lz1, St.w / 2, Ay + 0.012, lz0, { cast: false });
  for (const s of [-1, 1]) parapet(k, 'stone_wall', s * (St.w / 2 + 0.25), lz0, s * (St.w / 2 + 0.25), lz1, Ay, 0.5, 1.1);
  const fog = fogVeil(ctx, 'varr', 0, Ay, lz1 + 0.8, YAW_N, St.w - 0.2, 5.6);
  out.anchors.varrEntry = anchor(0, Ay, lz0 - 0.9, YAW_N);

  // ---------------------------------------------------------------- the Bell Rampart (arena)
  const C = A.c, R = A.r, rOut = R + 1.1;
  const disc = new THREE.CylinderGeometry(rOut, rOut, 1, 48);
  k.add('flagstone', disc.clone(), { x: C.x, y: Ay - 0.5, z: C.z }, { cast: false });
  k.colGeo(disc, { x: C.x, y: Ay - 0.5, z: C.z });
  k.add('stone_trim', ringSector(R - 1.0, R - 0.55, 0, Math.PI * 2 - 0.001, 0.02, 48), { x: C.x, y: Ay + 0.012, z: C.z }, { cast: false });
  k.add('stone_trim', ringSector(5.4, 5.8, 0, Math.PI * 2 - 0.001, 0.02, 32), { x: C.x, y: Ay + 0.012, z: C.z }, { cast: false });
  // compass of the siege: eight bronze inlays pointing at the gates the army held
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box('bronze', C.x + Math.cos(a) * 3.2, Ay + 0.02, C.z - Math.sin(a) * 3.2, 2.2, 0.015, 0.14, { ry: a, cast: false });
  }
  // the bastion below (seen from the keep yard and the road)
  k.add('stone_wall', cyl(rOut + 0.2, rOut + 1.6, Ay + 1, 40, true), { x: C.x, y: -1, z: C.z }, { receive: false });
  k.add('stone_trim', cyl(rOut + 0.5, rOut + 0.3, 0.6, 40, true), { x: C.x, y: Ay - 0.6, z: C.z }, { cast: false });
  // parapet ring (gap at the south for the landing, and where the towers meet the rim)
  const gapS = Math.asin((St.w / 2 + 0.6) / (R + 0.6));
  const segN = 30;
  for (let i = 0; i < segN; i++) {
    const a0 = -Math.PI / 2 + gapS + ((Math.PI * 2 - 2 * gapS) * i) / segN;
    const a1 = -Math.PI / 2 + gapS + ((Math.PI * 2 - 2 * gapS) * (i + 1)) / segN;
    const x0 = C.x + Math.cos(a0) * (R + 0.6), z0 = C.z - Math.sin(a0) * (R + 0.6);
    const x1 = C.x + Math.cos(a1) * (R + 0.6), z1 = C.z - Math.sin(a1) * (R + 0.6);
    parapet(k, 'stone_wall', x0, z0, x1, z1, Ay, 0.6, 1.25);
  }
  // hmm: parapet angles measured with z = −sin(a): a = −π/2 points south (+Z) — the landing side
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    snowDrift(ctx, C.x + Math.cos(a) * (R - 0.2), Ay, C.z - Math.sin(a) * (R - 0.2), 1.3, 0.7, 0.3, 1100 + i, -a);
  }
  // braziers at east and west (two lights)
  fireBasket(k, C.x - 12.5, Ay, C.z + 3, 1.2);
  fireBasket(k, C.x + 12.5, Ay, C.z + 3, 1.2);
  k.light(0xff9c50, 12, 18, C.x - 12.5, Ay + 2, C.z + 3, 0.9);
  k.light(0xff9c50, 12, 18, C.x + 12.5, Ay + 2, C.z + 3, 0.9);
  const anchorStandard = warStandard(ctx, k, C.x, Ay, C.z - R + 2.4);
  armyStandard(ctx, k, C.x - 4.5, Ay, C.z - R + 2.6, YAW_S, 6, 1.1, 2.8, false);
  armyStandard(ctx, k, C.x + 4.5, Ay, C.z - R + 2.6, YAW_S, 6, 1.1, 2.8, true);

  // ---------------------------------------------------------------- the two bell towers, the bridge and the headframe
  const volleyMuzzles: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    const tx = s * Tw.x, h = Tw.half;
    k.bmm('stone_wall', tx - h, -1, Tw.z - h, tx + h, Tw.top, Tw.z + h, { col: true });
    for (let yy = 8; yy < Tw.top - 4; yy += 9) k.bmm('stone_trim', tx - h - 0.15, yy, Tw.z - h - 0.15, tx + h + 0.15, yy + 0.35, Tw.z + h + 0.15, { cast: false });
    for (const [bx, bz] of [[tx - h, Tw.z - h], [tx + h, Tw.z - h], [tx - h, Tw.z + h], [tx + h, Tw.z + h]] as const) k.bmm('stone_dark', bx - 0.9, -1, bz - 0.9, bx + 0.9, Tw.top - 12, bz + 0.9, { col: false });
    for (let yy = 30; yy < Tw.top - 8; yy += 10) for (const dz of [-2.4, 0, 2.4]) {
      k.box('stone_dark', tx - s * (h + 0.02), yy, Tw.z + dz, 0.05, 2.4, 0.9, { cast: false });
      k.box('window_warm', tx + s * (h + 0.02), yy + 3, Tw.z + dz, 0.05, 1.6, 0.6, { cast: false });
    }
    corbels(k, 'stone_wall', tx - h, Tw.z - h, tx + h, Tw.z + h, Tw.top - 1.2, 0.9, 1.3);
    k.bmm('stone_trim', tx - h - 0.9, Tw.top - 0.4, Tw.z - h - 0.9, tx + h + 0.9, Tw.top, Tw.z + h + 0.9, { cast: false });
    for (const [x0, z0, x1, z1] of [[tx - h - 0.6, Tw.z - h - 0.6, tx + h + 0.6, Tw.z - h - 0.6], [tx - h - 0.6, Tw.z + h + 0.6, tx + h + 0.6, Tw.z + h + 0.6], [tx - h - 0.6, Tw.z - h - 0.6, tx - h - 0.6, Tw.z + h + 0.6], [tx + h + 0.6, Tw.z - h - 0.6, tx + h + 0.6, Tw.z + h + 0.6]] as const) crenellation(k, 'stone_wall', x0, z0, x1, z1, Tw.top, 0.6, { col: false, base: 0.6, merlonH: 1.2 });
    k.add('roof_slate', new THREE.ConeGeometry(4.2, 12, 4), { x: tx, y: Tw.top + 6, z: Tw.z, ry: Math.PI / 4 });
    k.add('iron', cyl(0.06, 0.1, 3, 5), { x: tx, y: Tw.top + 12, z: Tw.z }, { cast: false });
    snowCap(ctx, tx - h - 0.9, Tw.z - h - 0.9, tx + h + 0.9, Tw.z + h + 0.9, Tw.top, 0.2);
    armyBanner(ctx, k, tx - s * (h + 0.05), 70, Tw.z, s > 0 ? YAW_W : YAW_E, 3.2, 12, s > 0);
    // bombard balcony on the inner face (volley)
    const by = Ay + 9;
    k.bmm('planks', tx - s * (h + 2.6), by - 0.3, Tw.z - 3.2, tx - s * h, by, Tw.z + 3.2, { col: false });
    for (const dz of [-3, 3]) k.box('timber_dark', tx - s * (h + 1.3), by - 1.4, Tw.z + dz, 0.2, 0.2, 2.6, { rz: s * 0.7, cast: false });
    parapet(k, 'timber_dark', tx - s * (h + 2.6), Tw.z - 3.2, tx - s * (h + 2.6), Tw.z + 3.2, by, 0.2, 1.0, { col: false });
    const m1 = bombard(k, tx - s * (h + 1.3), by, Tw.z + 1.2, s > 0 ? -Math.PI / 2 - 0.2 : Math.PI / 2 + 0.2, false);
    const m2 = bombard(k, tx - s * (h + 1.3), by, Tw.z - 1.8, s > 0 ? -Math.PI / 2 + 0.2 : Math.PI / 2 - 0.2, false);
    volleyMuzzles.push(m1, m2);
    shotPile(k, tx - s * (h + 0.7), by, Tw.z + 2.8, 0.16);
  }
  // stone bridge between the tower tops
  const bz = Tw.z, bTop = Bl.top + 7, bBot = Bl.top + 1.2;
  k.bmm('stone_wall', -Tw.x + Tw.half, bBot + 2.2, bz - 3.4, Tw.x - Tw.half, bTop, bz + 3.4, { col: false });
  const archSpan = 2 * (Tw.x - Tw.half);
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, x = -archSpan / 2 + t * archSpan;
    const dy = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * 2.2;
    k.bmm('stone_wall', x - archSpan / 34, bBot + dy, bz - 3.4, x + archSpan / 34, bBot + 2.25, bz + 3.4, { cast: true });
  }
  crenellation(k, 'stone_wall', -Tw.x + Tw.half, bz + 3.2, Tw.x - Tw.half, bz + 3.2, bTop, 0.5, { col: false });
  crenellation(k, 'stone_wall', -Tw.x + Tw.half, bz - 3.2, Tw.x - Tw.half, bz - 3.2, bTop, 0.5, { col: false });
  snowCap(ctx, -Tw.x + Tw.half, bz - 3.4, Tw.x - Tw.half, bz + 3.4, bTop, 0.2);
  // timber headframe under the bridge: A-frames and the yoke beam the bell hangs from
  for (const s of [-1, 1]) {
    k.box('timber_dark', s * 4.6, bBot - 1.4, Bl.z, 0.7, 4.2, 0.7, { rz: s * 0.35 });
    k.box('iron', s * 4.6, bBot - 2.4, Bl.z, 0.78, 0.2, 0.78, { rz: s * 0.35, cast: false });
    for (const dz of [-2.4, 2.4]) k.box('timber_dark', s * 7.5, bBot - 0.7, Bl.z + dz, 0.45, 3.2, 0.45, { rz: s * 0.9, cast: false });
  }
  k.box('timber_dark', 0, Bl.top + 0.5, Bl.z, 11, 0.9, 1.1);
  k.box('iron', 0, Bl.top + 0.05, Bl.z, 11.2, 0.15, 1.2, { cast: false });
  for (const s of [-1, 1]) k.add('iron', cyl(0.12, 0.12, 3, 6), { x: s * 1.4, y: Bl.top - 1.2, z: Bl.z }, { cast: false });
  const bell = greatBell(ctx, Bl.x, Bl.top, Bl.z, Bl.h);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, y: number, z: number, yaw: number, leash = 16, idle: EnemySpawn['idleAnim'] = 'stand'): EnemySpawn => ({ id: 'army_keep_' + id, kind, anchor: anchor(x, y, z, yaw), leash, idleAnim: idle });
  out.enemies.push(
    E('knight1', 'siegeKnight', 2, Y, -184, YAW_S, 14),
    E('xbow1', 'crossbowman', -14, Y, -173.6, YAW_S, 5),
    E('xbow2', 'crossbowman', 15.5, Y, -173.6, YAW_S, 5),
    E('ts1', 'twiceSlain', 11, Y, -193, yawTo(11, -193, 0, -186), 14),
    E('hound1', 'warHound', -14, Y, -202, YAW_E, 18),
  );
  out.anchors.varrSpawn = anchor(C.x, Ay, C.z - 6, YAW_S);
  void YAW_E; void rubble; void sconceTorch;
  return { ...out, shrine, fog, anchorStandard, bell, volleyMuzzles };
}
