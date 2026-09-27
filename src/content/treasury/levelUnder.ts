/**
 * Beneath the market: the culvert under the Hall of Weights, the Sluice Hall (y −3.2) where the
 * coin-sluice once carried the market's takings down into the vaults, the stair down to the
 * Counting Deep (y −7.8: counting desks, ledger walls, the coin pit and the debtors' cage, the
 * second Stillbell), the stair up into the Hall of Weights (y 0) with its great weighing beam and
 * the weigh-gate lever (shortcut back to the market), and the wall between the Sluice Hall and the
 * Antechamber with the round vault door (opened from the Antechamber side: second shortcut).
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  floor, wall, stairs, coinPress, strongbox, coins, barrel, crate, crateStack, sack, brazier, candles, candelabrum, scales, bench,
  stillbellShrine, bellPost, cyl, sphere, lathe, rubble, type StillbellShrine, lantern,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, P, Y, V, YAW_E, YAW_W, YAW_N, YAW_S } from './levelPlan';
import { roomWalls, slab, segVault, coffered, countingDesk, ledgerWall, railing } from './levelRooms';
import { lever, roundVaultDoor, debtorsCage, winch } from './levelPieces';

export interface UnderBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  cage: DynamicPiece & { inside: () => THREE.Vector3 };
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
}

export function buildUnder(ctx: AreaCtx): UnderBuild {
  const enemies: EnemySpawn[] = [];
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};

  // ================================================================ culvert (under the Hall)
  const cu = newKit(ctx, 'culvert', 401, Y.canal);
  const CV = P.culvert;
  for (const s of [-1, 1]) {
    const x = s > 0 ? CV.x1 : CV.x0;
    cu.bmm('stone_dark', x - (s > 0 ? 0 : 0.8), Y.canal, CV.z0, x + (s > 0 ? 0.8 : 0), 0, CV.z1, { col: true });
  }
  cu.bmm('stone_dark', CV.x0 - 0.8, CV.ceil, CV.z0, CV.x1 + 0.8, 0, CV.z1);
  for (let z = CV.z0 + 2; z < CV.z1; z += 3) cu.bmm('stone_trim', CV.x0, CV.ceil - 0.3, z - 0.25, CV.x1, CV.ceil, z + 0.25, { cast: false });
  // runnel of old coins down the middle, drain grates, a hanging lantern
  for (let i = 0; i < 40; i++) cu.add('gold_trim', cyl(0.025, 0.025, 0.01, 6), { x: cu.rng.range(-0.8, 0.8), y: Y.canal + 0.005, z: cu.rng.range(CV.z0 + 0.5, CV.z1 - 0.5) }, { cast: false });
  for (const z of [-64, -72]) for (let i = 0; i < 6; i++) cu.box('iron', -1.2 + i * 0.48, Y.canal + 0.02, z, 0.06, 0.04, 1.2, { cast: false });
  lantern(cu, 0, -1.2, -70);
  cu.light(0xffa860, 3.2, 9, 0, -1.3, -70, 0.3);
  enemies.push({ id: 'tr_c_mimic', kind: 'tr_mimic', anchor: anchor(2.9, Y.canal, -75.5, YAW_W), idleAnim: 'sentryWall', leash: 10 });
  strongbox(cu, -3.0, Y.canal, -76.4, 0.3, 0.9);
  anchors.culvertPurse = anchor(-2.6, Y.canal, -77.6, YAW_W);

  // ================================================================ Sluice Hall
  const sh = newKit(ctx, 'sluice', 411, Y.canal);
  const S = P.sluice;
  slab(sh, 'flagstone', S.x0, S.z0, S.x1, S.z1, Y.canal);
  roomWalls(sh, 'stone_dark', S.x0, S.z0, S.x1, S.z1, Y.canal, S.ceil - Y.canal + 0.6, 0.8, [
    { side: 's', c: 0, w: CV.x1 - CV.x0, h: CV.ceil - Y.canal },
    { side: 'w', c: (P.sluiceStair.z0 + P.sluiceStair.z1) / 2, w: P.sluiceStair.z1 - P.sluiceStair.z0, h: 3.2, kind: 'round' },
  ], ['n']);
  // three barrel bays running north-south on piers
  for (const x of [-8, 0, 8]) segVault(sh, 'stone_wall', x, S.ceil - 1.6, S.z0, 0, 8, 1.6, S.z1 - S.z0, 0.35);
  for (const x of [-4, 4]) for (let z = S.z0 + 4; z < S.z1 - 1; z += 4) {
    sh.bmm('stone_wall', x - 0.45, Y.canal, z - 0.45, x + 0.45, S.ceil - 1.6, z + 0.45, { col: true });
    sh.bmm('stone_trim', x - 0.55, S.ceil - 1.9, z - 0.55, x + 0.55, S.ceil - 1.6, z + 0.55, { cast: false });
  }
  // the coin-sluice: a grated channel down the middle bay fed by a chute from the market above
  sh.bmm('stone_dark', -1.3, Y.canal - 0.6, S.z0 + 1, 1.3, Y.canal + 0.01, S.z1 - 0.5, { cast: false });
  for (let z = S.z0 + 1.2; z < S.z1 - 0.6; z += 0.3) sh.box('iron', 0, Y.canal + 0.02, z, 2.5, 0.05, 0.06, { cast: false });
  for (let i = 0; i < 60; i++) sh.add('gold_trim', cyl(0.03, 0.03, 0.012, 6), { x: sh.rng.range(-1.1, 1.1), y: Y.canal - 0.45 + sh.rng.range(0, 0.2), z: sh.rng.range(S.z0 + 1.2, S.z1 - 0.8) }, { cast: false });
  // chute from the ceiling (north end) with its sluice gear
  sh.push(0, Y.canal, S.z0 + 1.2, 0);
  sh.box('iron', 0, 3.8, 0, 1.4, 3.2, 1.2);
  sh.box('bronze', 0, 2.1, 0.62, 1.6, 0.2, 0.2, { cast: false });
  for (const [gx, gy, gr] of [[-2.4, 2.2, 1.1], [2.2, 1.6, 0.8], [2.9, 3.0, 0.5]] as const) {
    sh.add('iron', cyl(gr, gr, 0.25, 16), { x: gx, y: gy, z: 0.1, rx: Math.PI / 2 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sh.box('iron', gx + Math.cos(a) * gr, gy + Math.sin(a) * gr, 0.1, 0.14, 0.14, 0.26, { rz: a, cast: false }); }
    sh.add('bronze', cyl(0.14, 0.14, 0.4, 8), { x: gx, y: gy, z: 0.1, rx: Math.PI / 2 }, { cast: false });
  }
  sh.solid(-3.6, 0, -0.8, 3.6, 4.5, 1.0);
  sh.pop();
  // coin presses and the die-hammer rack (the Coinbreaker Hammer)
  coinPress(sh, 8.4, Y.canal, -84.6, YAW_W);
  coinPress(sh, 8.4, Y.canal, -90.2, YAW_W);
  sh.box('timber_dark', 11.6, Y.canal + 1.3, -87.4, 0.2, 1.6, 2.2);
  for (let i = 0; i < 3; i++) sh.box('iron', 11.4, Y.canal + 0.9 + i * 0.45, -87.4, 0.1, 0.06, 2.0, { cast: false });
  anchors.coinbreaker = anchor(10.2, Y.canal, -87.4, YAW_E);
  // the furnace where false coin was melted (warm glow for the hall)
  sh.push(-9.6, Y.canal, -93.2, YAW_E);
  sh.box('stone_dark', 0, 1.1, 0, 2.2, 2.2, 2.6, { col: true });
  sh.box('ember_glow', 0, 0.9, 1.31, 1.3, 0.9, 0.05, { cast: false });
  sh.box('stone_dark', 0, 3.3, 0, 1.2, 2.2, 1.2);
  sh.pop();
  sh.light(0xff7a30, 9, 14, -8.2, Y.canal + 1.2, -93.2, 0.6);
  sh.light(0xffa860, 4.5, 11, 6, Y.canal + 2.4, -82.5, 0.3);
  // scattered crates, sacks of false coin, a real chest (the mimic sits across from it)
  crateStack(sh, -10.4, Y.canal, -82.6, 0.1);
  sack(sh, -9.2, Y.canal, -84.4, 0.5); sack(sh, -8.6, Y.canal, -83.8, 1.4);
  barrel(sh, 10.8, Y.canal, -94.6, 0.3, true); barrel(sh, 10.1, Y.canal, -95.2, 0.9, true);
  strongbox(sh, -10.9, Y.canal, -87.2, YAW_E, 1.0);
  coins(sh, -10.6, Y.canal + 0.5, -87.2, 4);
  enemies.push(
    { id: 'tr_s_mimic', kind: 'tr_mimic', anchor: anchor(10.6, Y.canal, -92.4, YAW_W), idleAnim: 'sentryWall', leash: 10 },
    { id: 'tr_s_sentry', kind: 'tr_sentry', anchor: anchor(0, Y.canal, -88.4, YAW_S), leash: 12 },
    { id: 'tr_s_mil1', kind: 'tr_militia', anchor: anchor(-6.2, Y.canal, -85.4, 0.8), leash: 12 },
    { id: 'tr_s_mil2', kind: 'tr_militiaFork', anchor: anchor(-5.2, Y.canal, -91.6, 1.6), leash: 12 },
    { id: 'tr_s_col', kind: 'tr_collector', anchor: anchor(5.6, Y.canal, -93.2, YAW_S), patrol: [V(5.6, Y.canal, -93.2), V(-2.4, Y.canal, -93.2), V(-2.4, Y.canal, -82.6), V(5.6, Y.canal, -82.6)], leash: 14 },
  );
  bellPost(sh, 2.6, Y.canal, -86.6, YAW_E);

  // wall between the Sluice Hall and the Antechamber: two skins with the round vault door rolling
  // in the slot between them into a recess to the east
  const VD = P.vaultDoor;
  const doorX0 = VD.x - 2.2, doorX1 = VD.x + 2.2, recessX1 = VD.x + 6.8, doorTop = Y.canal + 4.4;
  for (const [z0, z1] of [[VD.z1 - 0.8, VD.z1], [VD.z0, VD.z0 + 0.8]] as const) {
    wall(sh, 'stone_dark', S.x0 - 0.8, (z0 + z1) / 2, P.ante.x1 + 0.8, (z0 + z1) / 2, Y.canal, S.ceil - Y.canal + 0.6, z1 - z0, {
      openings: [{ u: VD.x - (S.x0 - 0.8 + P.ante.x1 + 0.8) / 2, w: doorX1 - doorX0, sill: 0, h: 2.2, kind: 'round' }],
    });
  }
  sh.bmm('stone_dark', S.x0 - 0.8, Y.canal, VD.z0 + 0.8, doorX0, S.ceil + 0.6, VD.z1 - 0.8, { col: true });
  sh.bmm('stone_dark', recessX1, Y.canal, VD.z0 + 0.8, P.ante.x1 + 0.8, S.ceil + 0.6, VD.z1 - 0.8, { col: true });
  sh.bmm('stone_dark', doorX0, doorTop + 0.2, VD.z0 + 0.8, recessX1, S.ceil + 0.6, VD.z1 - 0.8);
  slab(sh, 'flagstone', S.x0 - 0.8, VD.z0, P.ante.x1 + 0.8, VD.z1, Y.canal);
  sh.bmm('iron', doorX0, Y.canal - 0.05, VD.z0 + 0.9, recessX1, Y.canal + 0.03, VD.z1 - 0.9, { cast: false });
  // circular bronze frame on both faces
  for (const zz of [VD.z1 + 0.02, VD.z0 - 0.02]) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = 2.45;
      sh.box('bronze', VD.x + Math.cos(a) * r, Y.canal + 2.2 + Math.sin(a) * r, zz, 0.8, 0.3, 0.12, { rz: a + Math.PI / 2, cast: false });
    }
  }
  const vaultDoor = roundVaultDoor(ctx, 'tr:vaultDoor', VD.x, Y.canal, (VD.z0 + VD.z1) / 2, YAW_N, 2.15, 1.65);
  pieces.vaultDoor = vaultDoor;
  anchors.vaultDoorSealed = anchor(VD.x, Y.canal, VD.z1 + 1.4, YAW_N);

  // ================================================================ stair: Sluice Hall → Counting Deep
  const st = newKit(ctx, 'sluice-stair', 421, Y.deep);
  const SS = P.sluiceStair;
  const sz = (SS.z0 + SS.z1) / 2;
  stairs(st, 'stone_wall', [SS.xTop, Y.canal, sz], [SS.xBot, Y.deep, sz], SS.z1 - SS.z0 - 0.2, { baseY: Y.deep - 0.2 });
  st.solid(SS.xBot - 0.4, Y.deep - 0.6, SS.z0, S.x0, Y.deep, SS.z1);
  for (const zz of [SS.z0 - 0.4, SS.z1 + 0.4]) st.bmm('stone_dark', SS.xBot - 0.5, Y.deep, zz - 0.4, S.x0, Y.canal + 3.4, zz + 0.4, { col: true });
  // stepped ceiling above the flight
  for (let i = 0; i < 4; i++) st.bmm('stone_dark', SS.xTop - (i + 1) * 2.2, Y.canal + 3.2 - i * 1.2, SS.z0 - 0.8, SS.xTop - i * 2.2 + 0.3, Y.canal + 4.2 - i * 1.2, SS.z1 + 0.8);
  st.light(0xffa860, 3, 8, -16.5, Y.deep + 3.8, sz, 0.35);
  lantern(st, -16.5, Y.deep + 3.9, sz);

  // ================================================================ Counting Deep
  const cd = newKit(ctx, 'deep', 431, Y.deep);
  const D = P.deep, PIT = P.pit;
  // floor with the coin pit
  slab(cd, 'flagstone', D.x0, D.z0, PIT.x0, D.z1, Y.deep);
  slab(cd, 'flagstone', PIT.x1, D.z0, D.x1, D.z1, Y.deep);
  slab(cd, 'flagstone', PIT.x0, D.z0, PIT.x1, PIT.z0, Y.deep);
  slab(cd, 'flagstone', PIT.x0, PIT.z1, PIT.x1, D.z1, Y.deep);
  cd.bmm('stone_dark', PIT.x0, Y.deep - 4.6, PIT.z0, PIT.x1, Y.deep - 4.2, PIT.z1, { col: true });
  for (const [x0, z0, x1, z1] of [[PIT.x0 - 0.3, PIT.z0, PIT.x0, PIT.z1], [PIT.x1, PIT.z0, PIT.x1 + 0.3, PIT.z1], [PIT.x0, PIT.z0 - 0.3, PIT.x1, PIT.z0], [PIT.x0, PIT.z1, PIT.x1, PIT.z1 + 0.3]] as const) cd.bmm('stone_dark', x0, Y.deep - 4.6, z0, x1, Y.deep, z1, { cast: false });
  for (let i = 0; i < 26; i++) cd.add('gold_trim', sphere(cd.rng.range(0.25, 0.6), 7, 5), { x: cd.rng.range(PIT.x0 + 0.4, PIT.x1 - 0.4), y: Y.deep - 4.3, z: cd.rng.range(PIT.z0 + 0.4, PIT.z1 - 0.4), s: [1, 0.35, 1] }, { cast: false });
  railing(cd, PIT.x0 - 0.2, PIT.z0 - 0.2, PIT.x1 + 0.2, PIT.z0 - 0.2, Y.deep);
  railing(cd, PIT.x0 - 0.2, PIT.z1 + 0.2, PIT.x1 + 0.2, PIT.z1 + 0.2, Y.deep);
  railing(cd, PIT.x0 - 0.2, PIT.z0 - 0.2, PIT.x0 - 0.2, PIT.z1 + 0.2, Y.deep);
  railing(cd, PIT.x1 + 0.2, PIT.z0 - 0.2, PIT.x1 + 0.2, PIT.z1 + 0.2, Y.deep);
  roomWalls(cd, 'stone_dark', D.x0, D.z0, D.x1, D.z1, Y.deep, D.ceil - Y.deep + 0.5, 0.8, [
    { side: 'e', c: sz, w: SS.z1 - SS.z0, h: 3.4, kind: 'round' },
    { side: 's', c: (P.hallStair.x0 + P.hallStair.x1) / 2, w: P.hallStair.x1 - P.hallStair.x0, h: 3.6, kind: 'round' },
    { side: 'n', c: (P.corridor.x0 + P.corridor.x1) / 2, w: 4, h: 3.8, kind: 'round' },
  ]);
  coffered(cd, D.x0, D.z0, D.x1, D.z1, D.ceil, 3.5);
  // columns
  for (const x of [-40.5, -26.5]) for (const z of [-101, -94, -87]) {
    cd.add('stone_wall', cyl(0.5, 0.55, D.ceil - Y.deep, 10), { x, y: Y.deep, z });
    cd.box('stone_trim', x, Y.deep + 0.2, z, 1.4, 0.4, 1.4, { cast: false });
    cd.box('stone_trim', x, D.ceil - 0.3, z, 1.5, 0.6, 1.5, { cast: false });
    cd.solid(x - 0.55, Y.deep, z - 0.55, x + 0.55, D.ceil, z + 0.55);
  }
  // rows of counting desks (west aisle and east aisle), ledger walls, tally boards
  for (const z of [-102.5, -98.5, -90.5, -86.5]) countingDesk(cd, -43.6, Y.deep, z, YAW_E, z > -95);
  for (const z of [-103.5, -99.5]) countingDesk(cd, -23.8, Y.deep, z, YAW_W, true);
  ledgerWall(cd, D.x0 + 0.05, Y.deep, -94.6, YAW_E, 6, 4.6);
  ledgerWall(cd, -39, Y.deep, D.z0 + 0.05, YAW_S, 6, 4.6);
  ledgerWall(cd, -25.6, Y.deep, D.z0 + 0.05, YAW_S, 5, 4.6);
  for (const x of [-44, -39.5]) cd.box('stone_dark', x, Y.deep + 3.2, D.z1 - 0.1, 3.2, 1.8, 0.08, { cast: false });
  // the collectors' tally desk (the ledger that names the cage's occupant)
  cd.push(-30, Y.deep, -103.4, 0);
  cd.bmm('timber_dark', -1.3, 0, -0.5, 1.3, 0.95, 0.5, { col: true });
  cd.box('cloth_red', 0, 0.97, 0, 2.5, 0.03, 0.9, { cast: false });
  cd.pop();
  scales(cd, -30.8, Y.deep + 0.98, -103.4, 0.3);
  coins(cd, -29.5, Y.deep + 0.98, -103.2, 6);
  candelabrum(cd, -28.8, Y.deep + 0.98, -103.7, 3);
  anchors.collectorsLedger = anchor(-30, Y.deep, -102.2, YAW_N);
  // the debtors' cage over the pit and its winch (padlocked: the Head Collector keeps the key)
  const pc = V((PIT.x0 + PIT.x1) / 2, Y.deep, (PIT.z0 + PIT.z1) / 2);
  cd.bmm('iron', pc.x - 0.3, D.ceil - 0.2, pc.z - 0.3, pc.x + 0.3, D.ceil, pc.z + 0.3, { cast: false });
  const cage = debtorsCage(ctx, 'tr:cage', V(pc.x, D.ceil - 0.2, pc.z), V(pc.x, Y.deep, PIT.z0 - 3.4), Y.deep);
  pieces.cage = cage;
  const cageWinch = winch(ctx, 'tr:cageWinch', PIT.x0 - 2.6, Y.deep, pc.z, YAW_W);
  pieces.cageWinch = cageWinch;
  anchors.cage = anchor(pc.x, Y.deep, PIT.z1 + 1.3, YAW_N);
  anchors.cageLanded = anchor(pc.x, Y.deep, PIT.z0 - 1.3, YAW_N);
  cd.bmm('iron', PIT.x0 - 2.2, D.ceil - 0.1, pc.z - 0.05, pc.x, D.ceil, pc.z + 0.05, { cast: false });
  // the Stillbell of the Counting Deep
  const shrine = stillbellShrine(cd, D.x1 - 0.95, Y.deep, -84.6, YAW_W, 7);
  // lights: candle clusters on the desks + two hanging lamps
  cd.light(0xffb468, 6, 13, -43, Y.deep + 2.2, -94.5, 0.4);
  cd.light(0xffb468, 6, 13, -30, Y.deep + 2.6, -101.5, 0.4);
  cd.light(0xffa860, 5, 12, -33, Y.deep + 4.2, -86.5, 0.3);
  lantern(cd, -33, Y.deep + 4.6, -86.5);
  // enemies: the Head Collector walks the pit, two clockwork sentries turn on their pedestals
  enemies.push(
    { id: 'tr_d_head', kind: 'tr_collectorHead', anchor: anchor(-30.2, Y.deep, -97.8, YAW_W), patrol: [V(-30.2, Y.deep, -97.8), V(-37.8, Y.deep, -97.8), V(-37.8, Y.deep, -90.2), V(-30.2, Y.deep, -90.2)], leash: 16 },
    { id: 'tr_d_sentry1', kind: 'tr_sentry', anchor: anchor(-43.2, Y.deep, -95.2, YAW_E), leash: 12 },
    { id: 'tr_d_sentry2', kind: 'tr_sentry', anchor: anchor(-24, Y.deep, -95.2, YAW_W), leash: 12 },
    { id: 'tr_d_warden', kind: 'tr_warden', anchor: anchor(-33.5, Y.deep, -104.6, YAW_S), leash: 8 },
  );
  bellPost(cd, -30, Y.deep, -84.2, YAW_S);

  // ================================================================ stair: Counting Deep → Hall of Weights
  const hs = newKit(ctx, 'hall-stair', 441, Y.deep);
  const HS = P.hallStair;
  const hx = (HS.x0 + HS.x1) / 2;
  stairs(hs, 'stone_wall', [hx, Y.deep, HS.zBot], [hx, 0, HS.zTop], HS.x1 - HS.x0 - 0.2, { baseY: Y.deep - 0.2 });
  for (const xx of [HS.x0 - 0.4, HS.x1 + 0.4]) hs.bmm('stone_dark', xx - 0.4, Y.deep, HS.zBot, xx + 0.4, 0, HS.zTop, { col: true });
  hs.bmm('stone_dark', HS.x0 - 0.8, Y.deep + 3.8, HS.zBot, HS.x1 + 0.8, Y.deep + 4.6, P.deep.z1 + 1.2);

  // ================================================================ Hall of Weights (interior west wing)
  const hl = newKit(ctx, 'hall', 451, 0);
  const HI = P.hallIn;
  slab(hl, 'flagstone', HS.x1, HI.z0, HI.x1, HI.z1, 0, true, 0.45);
  slab(hl, 'flagstone', HI.x0, HS.zTop, HS.x1, HI.z1, 0, true, 0.45);
  railing(hl, HS.x1 + 0.1, HI.z0, HS.x1 + 0.1, HS.zTop - 0.8, 0);
  wall(hl, 'stone_wall', HI.x1 + 0.5, HI.z0 - 0.2, HI.x1 + 0.5, HI.z1 + 0.2, 0, 12, 1.0);
  coffered(hl, HI.x0, HI.z0, HI.x1 + 0.5, HI.z1, 11.4, 4, 'timber');
  // the great weighing beam: grain against coin
  hl.push(-18, 0, -71, 0);
  hl.bmm('stone_trim', -1.2, 0, -1.2, 1.2, 0.8, 1.2, { col: true });
  hl.add('bronze', cyl(0.3, 0.4, 7.6, 12), { y: 0.8 });
  hl.box('bronze', 0, 8.6, 0, 14, 0.4, 0.5, { rz: -0.06 });
  hl.add('gold_trim', sphere(0.5, 12, 8), { y: 8.6 }, { cast: false });
  for (const [px, py, mat] of [[-6.6, 2.4, 'gold_trim'], [6.6, 1.5, 'planks']] as const) {
    for (const [dx, dz] of [[-0.9, 0], [0.9, 0], [0, 0.9], [0, -0.9]]) hl.box('iron', px + dx * 0.5, (py + 8.6 + px * 0.06) / 2 + 0.3, dz * 0.5, 0.04, 8.6 - py - 0.6, 0.04, { cast: false });
    hl.add(mat === 'gold_trim' ? 'bronze' : 'planks', cyl(1.4, 1.2, 0.25, 16), { x: px, y: py, z: 0 });
  }
  hl.pop();
  // coin chests on the heavy pan, grain sacks on the light one
  for (let i = 0; i < 4; i++) strongbox(hl, -24.9 + (i % 2) * 0.9, 2.65 + Math.floor(i / 2) * 0.5, -71.4 + (i % 2) * 0.3, i * 0.4, 0.8, false);
  for (let i = 0; i < 5; i++) sack(hl, -11.8 + (i % 3) * 0.5, 1.65 + Math.floor(i / 3) * 0.4, -71 + (i % 2) * 0.4, i);
  hl.solid(-26.2, 0, -72.6, -23, 2.6, -69.4);
  hl.solid(-13, 0, -72.6, -9.8, 1.8, -69.4);
  // benches for the weighers, a lectern with the scale-book
  for (const z of [-64.5, -76.5]) bench(hl, -17.5, 0, z, 0, 5);
  hl.push(-10, 0, -76.8, YAW_W);
  hl.bmm('timber_dark', -0.4, 0, -0.3, 0.4, 1.1, 0.3, { col: true });
  hl.box('leather_dark', 0, 1.2, 0, 0.6, 0.06, 0.45, { rx: 0.3, cast: false });
  hl.pop();
  anchors.hallScrap = anchor(-10.8, 0, -75.6, YAW_E);
  // light: two chandeliers
  for (const x of [-23, -13]) {
    hl.add('iron', new THREE.TorusGeometry(1.1, 0.05, 5, 16), { x, y: 6.8, z: -65, rx: Math.PI / 2 }, { cast: false });
    hl.box('iron', x, 9.2, -65, 0.04, 4.6, 0.04, { cast: false });
    candles(hl, x, 6.85, -65, 6, 0.9);
  }
  hl.light(0xffc078, 7, 16, -18, 6, -65, 0.4);
  // the weigh-gate lever (inside, beside the gate)
  const gateLever = lever(ctx, 'tr:weighLever', P.weighGate.x1 + 1.4, 0, P.hall.z1 - 0.62, YAW_N);
  pieces.weighLever = gateLever;
  enemies.push(
    { id: 'tr_h_col', kind: 'tr_collector', anchor: anchor(-16, 0, -66.5, YAW_W), leash: 12 },
    { id: 'tr_h_mil1', kind: 'tr_militiaFork', anchor: anchor(-11.8, 0, -67.4, YAW_N), leash: 10 },
  );

  const tollPosts = [
    { id: 'tr_sluice', pos: V(2.6, Y.canal, -86.6), radius: 7, options: [
      { id: 'west', toward: V(-16, Y.canal, -90) }, { id: 'north', toward: V(VD.x, Y.canal, -97.5) }, { id: 'south', toward: V(0, Y.canal, -70) },
    ] },
    { id: 'tr_deep', pos: V(-30, Y.deep, -84.2), radius: 7, options: [
      { id: 'north', toward: V(-33, Y.deep, -108) }, { id: 'up', toward: V(hx, Y.deep, -81) }, { id: 'east', toward: V(-21, Y.deep, -90) },
    ] },
  ];
  return { shrine, enemies, anchors, pieces, cage, tollPosts };
}

export { rubble, crate, floor, brazier, lathe, YAW_S };
