/**
 * The Barbican (y = 6): the court behind the terrace (x ∈ [−26, 25], z ∈ [−86, −58]), the
 * Eastern Magazine yard beyond an arch (x ∈ [25, 45]) and the Eastern Lane running north to the
 * Upper Ward behind a portcullis raised by a winch on the ward side (shortcut 2).
 *
 * The court holds the Stillbell 'army.barbican', the sappers' hoarding over the bailey, and the
 * veil of the Ram-Knight's gate passage in the north gatehouse. The magazine — squat, bomb-proof,
 * barred from the outside — is where the Remembered lead happens: the powder-master Rook Tallis is
 * locked in with the powder and a laid fuse, guarded by living defenders.
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  floor, parapet, archway, stillbellShrine, bellPost, crate, crateStack, barrel, sconceTorch, slit, desk, papers,
  ledger, towerSolid, corbels, weaponRack, rubble, cyl, bench, table,
} from '../../world/kit';
import {
  type AreaCtx, type AreaOut, emptyOut, newKit, anchor, yawTo, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, box3,
  armyBanner, armyStandard, snowCap, driftLine,
} from './levelCommon';
import { fireBasket, kegs, shotPile, gabion, bombard, tent, campClutter, pikeStand } from './levelProps';
import { doorLeaf, fogVeil, magazineState, portcullis, winch, type Gate, type Piece } from './levelPieces';

export const BARBICAN_ZONE = box3(-26, 5, -86, 25.2, 14, -58);
export const MAGAZINE_ZONE = box3(25.2, 5, -92, 45, 14, -58);
export const LANE_ZONE = box3(28, 5, -126, 37.5, 16, -92);

export interface BarbicanBuild extends AreaOut {
  shrine: ReturnType<typeof stillbellShrine>;
  fog: Gate;
}

export function buildBarbican(ctx: AreaCtx): BarbicanBuild {
  const k = newKit(ctx, 'barbican', 501);
  const out = emptyOut();
  const Bb = PLAN.barbican, Y = Bb.y, My = PLAN.magazineYard, Mg = PLAN.magazine, L = PLAN.eastLane;

  // ---------------------------------------------------------------- floors
  k.solid(Bb.x0, -1, Bb.z0, Bb.x1, Y, -62);
  k.solid(My.x0, -1, My.z0, My.x1, Y, -62);
  k.solid(L.x0, -1, L.z0, L.x1, Y, My.z0);
  floor(k, 'flagstone', Bb.x0, Bb.z0, Bb.x1, Bb.z1, Y + 0.01, 0.3, false);
  floor(k, 'cobble', My.x0, My.z0, My.x1, My.z1, Y + 0.01, 0.3, false);
  floor(k, 'cobble', L.x0, L.z0, L.x1, My.z0, Y + 0.01, 0.3, false);
  for (let i = 0; i < 10; i++) k.box(i % 2 ? 'mud' : 'water', k.rng.range(-22, 42), Y + 0.02, k.rng.range(-84, -61), k.rng.range(0.7, 2), 0.01, k.rng.range(0.5, 1.4), { ry: k.rng.range(0, 3), cast: false });

  // ---------------------------------------------------------------- south edge: stone parapet + the sappers' hoarding over the bailey
  const Sx = PLAN.baileyStair.x, Sw = PLAN.baileyStair.w / 2 + 0.45;
  parapet(k, 'stone_wall', Bb.x0, -58.25, Sx - Sw, -58.25, Y, 0.5, 1.0);
  parapet(k, 'stone_wall', Sx + Sw, -58.25, -13, -58.25, Y, 0.5, 1.0);
  parapet(k, 'stone_wall', 14, -58.25, 42, -58.25, Y, 0.5, 1.0);
  parapet(k, 'timber_dark', -13, -58.25, 14, -58.25, Y, 0.3, 1.15, { surface: 'wood' });
  for (let x = -12.5; x <= 13.5; x += 3) {
    k.box('timber_dark', x, Y + 1.6, -58.3, 0.2, 3.2, 0.2, { cast: false });
    k.box('timber_dark', x, Y + 1.5, -57.2, 0.15, 0.15, 2.4, { rx: 0.8, cast: false });
  }
  k.bmm('planks', -13, Y + 3.1, -60.2, 14, Y + 3.25, -57.6, { cast: true, rx: 0 });
  k.box('leather_dark', 0.5, Y + 3.35, -59, 27, 0.04, 2.4, { cast: false });
  kegs(k, -3, Y + 0.37, -60.8, 2, true);
  kegs(k, 7, Y + 0.37, -60.8, 2, true);
  shotPile(k, 1.5, Y, -61, 0.14);
  // east of the magazine yard: parapet over the slope
  parapet(k, 'stone_wall', 44.8, -58, 44.8, -92, Y, 0.5, 1.0);
  k.bmm('stone_wall', 45, -1, -95, 48, Y + 5, -58, { col: true });

  // ---------------------------------------------------------------- the north gatehouse (the Ram-Knight's passage)
  const P = PLAN.passage, gz0 = -90, gz1 = Bb.z0, gTop = 18;
  k.bmm('stone_wall', Bb.x0, -1, gz0, P.x0, gTop, gz1, { col: true });
  k.bmm('stone_wall', P.x1, -1, gz0, My.x0, gTop, gz1, { col: true });
  k.bmm('stone_wall', P.x0, Y + 7.2, gz0, P.x1, gTop, gz1, { col: true });
  k.solid(P.x0, -1, gz0 - 0.1, P.x1, Y, gz1 + 0.1);
  k.bmm('flagstone', P.x0, Y - 0.02, gz0, P.x1, Y + 0.01, gz1, { cast: false });
  // pointed arch surround, machicolations, the army arms in relief (castle and sword)
  for (const s of [-1, 1]) {
    k.box('stone_trim', s * (P.x1 + 0.35), Y + 3.6, gz1 + 0.2, 0.7, 7.2, 0.4, { cast: false });
    k.box('stone_trim', s * 2.9, Y + 7.9, gz1 + 0.2, 6.2, 0.6, 0.4, { rz: -s * 0.3, cast: false });
  }
  corbels(k, 'stone_wall', P.x0 - 3, gz1 - 0.2, P.x1 + 3, gz1 + 0.8, Y + 11.5, 0.9, 1.2);
  k.push(0, Y + 13.6, gz1 + 0.05, 0);
  k.box('stone_dark', 0, 0, 0.05, 4.6, 3.6, 0.1, { cast: false });
  for (const s of [-1, 1]) { k.box('stone_trim', s * 1.55, -0.2, 0.2, 0.9, 2.4, 0.2, { cast: false }); k.box('stone_trim', s * 1.55, 1.15, 0.2, 1.1, 0.3, 0.2, { cast: false }); }
  k.box('stone_trim', 0, -0.3, 0.2, 1.8, 1.6, 0.2, { cast: false });
  k.box('stone_trim', 0, 0.75, 0.2, 2.0, 0.3, 0.2, { cast: false });
  k.box('gold_trim', 0, -0.4, 0.32, 0.12, 2.2, 0.05, { cast: false });
  k.box('gold_trim', 0, 0.3, 0.32, 0.8, 0.1, 0.05, { cast: false });
  k.pop();
  for (const s of [-1, 1]) towerSolid(k, 'stone_wall', s * 12.5, Y, gz0 - 1.5, 6, 6, gTop + 4, 'crenel', 0, true);
  armyBanner(ctx, k, -8.8, Y + 10.5, gz1 + 0.05, YAW_S, 1.8, 5.2, false);
  armyBanner(ctx, k, 8.8, Y + 10.5, gz1 + 0.05, YAW_S, 1.8, 5.2, false);
  snowCap(ctx, Bb.x0, gz0, My.x0, gz1, gTop, 0.16);
  for (const zz of [-1, 1]) slit(k, zz * 18, Y + 8, gz1 + 0.01, YAW_S);
  const fog = fogVeil(ctx, 'oderic', 0, Y, gz1 - 1.2, YAW_N, P.x1 - P.x0 - 0.2, 7.0);
  out.anchors.odericEntry = anchor(0, Y, gz1 + 3.2, YAW_N);
  fireBasket(k, -4.6, Y, gz1 + 2.2, 1.0);
  fireBasket(k, 4.6, Y, gz1 + 2.2, 1.0);
  k.light(0xff9c50, 9, 14, 0, Y + 2, gz1 + 2.4, 0.9);

  // ---------------------------------------------------------------- the court: Stillbell, garrison stores
  const shrine = stillbellShrine(k, -21.5, Y, -69, YAW_E, 7);
  snowCap(ctx, -22.5, -69.8, -20.5, -68.2, Y + 3.25, 0.08);
  tent(k, -18, Y, -78, 0.25, 3.6, 4.6, 2.6, 'cloth_red');
  tent(k, 17, Y, -80, -0.3, 3.2, 4.2, 2.4, 'cloth_linen');
  pikeStand(k, -15, Y, -63.5, YAW_S, 7);
  weaponRack(k, 20, Y, -63, YAW_N, 2.4);
  campClutter(k, 12, Y, -64, 7);
  campClutter(k, -10, Y, -83.5, 8);
  crateStack(k, 21.5, Y, -73, 0.1, true);
  // a bombard whose barrel burst (one history's victory gun; the other's)
  bombard(k, 7, Y, -66, 2.4, true);
  rubble(k, 8.5, Y, -64.6, 0.7, true);
  for (const [x, z] of [[-6, -64], [-7.1, -64.4]] as const) gabion(k, x, Y, z);
  armyStandard(ctx, k, -3, Y, -70, YAW_S, 7, 1.4, 3.2, false);
  armyStandard(ctx, k, 3, Y, -70, YAW_S, 7, 1.4, 3.2, true);
  fireBasket(k, -12, Y, -72, 1.0);
  const toll = V(6, Y, -76);
  bellPost(k, toll.x, Y, toll.z, 0);
  out.tolls.push({ id: 'toll_barbican', pos: toll.clone(), radius: 3.8, options: [
    { id: 'passage', toward: V(0, Y, -86) }, { id: 'magazine', toward: V(26, Y, -70) }, { id: 'casemate', toward: V(-26, Y, -81.5) },
  ] });
  driftLine(ctx, Bb.x0 + 0.8, -63, Bb.x0 + 0.8, -85, Y, 8, 71, 0.7);
  driftLine(ctx, -22, gz1 + 0.9, 22, gz1 + 0.9, Y, 12, 72, 0.7);
  // the casemate door (west, into the bastion)
  k.bmm('stone_trim', -26.05, Y, -83.3, -25.8, Y + 3.4, -83, { cast: false });
  k.bmm('stone_trim', -26.05, Y, -80, -25.8, Y + 3.4, -79.7, { cast: false });
  k.bmm('stone_trim', -26.05, Y + 3.1, -83.3, -25.8, Y + 3.4, -79.7, { cast: false });
  sconceTorch(k, -25.98, Y + 2.3, -78.8, YAW_E);

  // ---------------------------------------------------------------- the dividing wall and arch to the magazine yard
  const dx = 25.1;
  k.bmm('stone_wall', dx - 0.9, -1, -92, dx + 0.9, Y + 6, -73, { col: true });
  k.bmm('stone_wall', dx - 0.9, -1, -67, dx + 0.9, Y + 6, -62, { col: true });
  archway(k, 'stone_wall', dx, Y, -70, YAW_E, 5.6, 4.2, 1.9, 'pointed', 0.4, 1.4, true);
  armyBanner(ctx, k, dx - 1.0, Y + 5.4, -70, YAW_W, 1.4, 3.4, true);
  snowCap(ctx, dx - 0.9, -86, dx + 0.9, -62, Y + 6, 0.12);

  // ---------------------------------------------------------------- the Eastern Magazine
  const mx0 = Mg.x0, mx1 = Mg.x1, mz0 = Mg.z0, mz1 = Mg.z1, t = 1.1, wy = Y + 3;
  const doorZ0 = -85.2, doorZ1 = -83.2;
  k.bmm('stone_dark', mx0, Y, mz0, mx1, wy, mz0 + t, { col: true });
  k.bmm('stone_dark', mx0, Y, mz1 - t, mx1, wy, mz1, { col: true });
  k.bmm('stone_dark', mx1 - t, Y, mz0, mx1, wy, mz1, { col: true });
  k.bmm('stone_dark', mx0, Y, mz0, mx0 + t, wy, doorZ0, { col: true });
  k.bmm('stone_dark', mx0, Y, doorZ1, mx0 + t, wy, mz1, { col: true });
  k.bmm('stone_dark', mx0, Y + 2.6, doorZ0, mx0 + t, wy, doorZ1, { col: true });
  for (const [x, z] of [[mx0, mz0], [mx1, mz0], [mx0, mz1], [mx1, mz1]] as const) k.bmm('stone_wall', x - 0.8, Y, z - 0.8, x + 0.8, Y + 5.6, z + 0.8, { col: true });
  k.bmm('flagstone', mx0 + t, Y + 0.012, mz0 + t, mx1 - t, Y + 0.02, mz1 - t, { cast: false });
  k.box('stone_trim', mx0 - 0.08, Y + 2.75, (doorZ0 + doorZ1) / 2, 0.2, 0.3, 2.6, { cast: false });
  // warning mark painted by the door
  k.box('cloth_red', mx0 - 0.02, Y + 1.8, doorZ0 - 0.9, 0.02, 0.8, 0.8, { cast: false });
  const door = doorLeaf(ctx, 'magazine', mx0 + 0.3, Y, doorZ1, Math.PI / 2, 2.0, 2.6, -1.5, anchor(mx0 - 1.3, Y, (doorZ0 + doorZ1) / 2, YAW_E), { iron: true, bar: true, barSide: -1 });
  const blown = magazineState(ctx, mx0, Y, mz0, mx1, mz1, door);
  out.pieces.magazineDoor = door;
  out.pieces.magazine = blown;
  out.anchors.magazineDoor = anchor(mx0 - 1.3, Y, (doorZ0 + doorZ1) / 2, YAW_E);
  out.anchors.tallisCell = anchor(mx0 + 2.9, Y, (doorZ0 + doorZ1) / 2 - 0.4, YAW_W);
  out.anchors.magazineInside = anchor(mx0 + 1.9, Y, (doorZ0 + doorZ1) / 2, YAW_E);
  out.anchors.magazineBlast = anchor((mx0 + mx1) / 2, Y + 2, (mz0 + mz1) / 2, 0);
  // the guard post: lean-to with the orders desk (the order is in a hand that is not the Marshal's)
  k.bmm('timber_dark', 26.2, Y, -65.8, 26.4, Y + 3, -60.2, { cast: false });
  for (const z of [-65.6, -60.4]) k.box('timber_dark', 30.4, Y + 1.4, z, 0.2, 2.8, 0.2, { col: 'wood' });
  k.box('planks', 28.3, Y + 3.1, -63, 4.6, 0.12, 6.2, { rz: 0.18 });
  desk(k, 28.2, Y, -63.8, YAW_E, true);
  papers(k, 28.4, Y + 0.8, -63.9, 4);
  ledger(k, 28.3, Y + 0.8, -63.2, 0.3, true);
  bench(k, 29.6, Y, -61.2, 0);
  out.anchors.orders = anchor(29.4, Y, -63.8, YAW_W);
  fireBasket(k, 31.5, Y, -66.5, 0.9);
  k.light(0xff9c50, 7, 11, 31.5, Y + 1.7, -66.5, 0.9);
  crateStack(k, 42.5, Y, -61.5, 0.2, true);
  barrel(k, 41, Y, -61, 0, true);
  barrel(k, 43.5, Y, -73.5, 0.3, true);
  kegs(k, 36, Y + 0.37, -61.8, 4, true);
  table(k, 38.5, Y, -69, 0.2, 1.6, 0.8, 0.8, true);
  driftLine(ctx, 44, -60, 44, -91, Y, 10, 81, 0.7);
  out.triggers.magazineYard = box3(26.2, Y - 1, -92, 45, Y + 5, -60.5);

  // ---------------------------------------------------------------- the Eastern Lane (to the Upper Ward) and its portcullis
  const lTop = Y + 12;
  k.bmm('stone_wall', My.x0, -1, L.z0, L.x0, lTop, My.z0, { col: true });
  k.bmm('stone_wall', L.x1, -1, L.z0, 45, lTop, -110.5, { col: true });
  k.bmm('stone_wall', L.x1, -1, -105.5, 45, lTop, My.z0, { col: true });
  k.bmm('stone_wall', 37.2, -1, -110.5, 45, lTop, -105.5, { col: true });
  k.bmm('stone_wall', L.x1, Y + 3.2, -110.5, 37.2, lTop, -105.5, { col: true });
  k.solid(L.x1, -1, -110.5, 37.2, Y, -105.5);
  k.bmm('flagstone', L.x1, Y + 0.01, -110.5, 37.2, Y + 0.02, -105.5, { cast: false });
  // the north end of the magazine yard (wall with the lane opening)
  k.bmm('stone_wall', My.x0 + 1, -1, -95, L.x0, lTop, My.z0, { col: true });
  k.bmm('stone_wall', L.x1, -1, -95, 45, lTop, My.z0, { col: true });
  k.bmm('stone_trim', L.x0 - 0.2, Y + 4.2, My.z0 - 0.2, L.x1 + 0.2, Y + 4.6, My.z0 + 0.3, { cast: false });
  k.bmm('stone_wall', L.x0, Y + 4.6, -95, L.x1, lTop, My.z0, { col: true });
  for (let z = -96; z > -124; z -= 5) { sconceTorch(k, L.x0 + 0.02, Y + 2.4, z, YAW_E); }
  k.light(0xff9c50, 6, 12, L.x0 + 0.4, Y + 2.4, -114, 0.9);
  for (let z = -98; z > -124; z -= 3.2) k.box('timber_dark', (L.x0 + L.x1) / 2, lTop - 0.6, z, L.x1 - L.x0, 0.25, 0.25, { cast: false });
  crate(k, L.x0 + 0.6, Y, -99, 0.1, 0.8, true);
  barrel(k, L.x1 - 0.5, Y, -116, 0, true);
  out.anchors.laneShard = anchor(36.3, Y + 0.1, -108, YAW_W);
  out.anchors.laneAlcove = anchor(35.3, Y, -108, YAW_E);
  candles(k, 36.6, Y, -109.6);
  const gate = portcullis(ctx, 'eastGate', (L.x0 + L.x1) / 2, Y, L.z0 + 0.6, 0, L.x1 - L.x0, 5.2);
  k.bmm('stone_wall', L.x0, Y + 5.2, L.z0, L.x1, lTop, L.z0 + 1.2, { col: true });
  out.pieces.eastGate = gate;
  out.anchors.eastGateLane = anchor((L.x0 + L.x1) / 2, Y, L.z0 + 2.6, YAW_N);
  snowCap(ctx, My.x0, L.z0, 45, My.z0, lTop, 0.14);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, y: number, z: number, yaw: number, leash = 16, idle: EnemySpawn['idleAnim'] = 'stand', patrol?: THREE.Vector3[]): EnemySpawn => ({ id: 'army_barb_' + id, kind, anchor: anchor(x, y, z, yaw), leash, idleAnim: idle, patrol });
  out.enemies.push(
    E('knight1', 'siegeKnight', 5, Y, -79, YAW_S, 14),
    E('ts1', 'twiceSlain', 14, Y, -71, yawTo(14, -71, 0, -62), 14),
    E('xbow1', 'crossbowman', -9, Y, -84.5, YAW_S, 10),
    E('guard1', 'magazineGuard', 31, Y, -81, YAW_W, 12),
    E('guard2', 'magazineGuard', 33, Y, -70, YAW_W, 12, 'stand', [V(31, Y, -66), V(31, Y, -89), V(31, Y, -72), V(41, Y, -70)]),
    E('hound1', 'warHound', 31, Y, -110, YAW_S, 18),
  );
  return { ...out, shrine, fog };
}

function candles(k: import('../../world/kit').Kit, x: number, y: number, z: number) {
  for (let i = 0; i < 4; i++) k.add('wax', cyl(0.03, 0.03, 0.18 + i * 0.05, 6), { x: x + (i % 2) * 0.12, y, z: z + Math.floor(i / 2) * 0.12 }, { cast: false });
}

export type { Piece };
