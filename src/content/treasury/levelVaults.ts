/**
 * The Undervaults proper (y −7.8 and −3.2): the strongroom corridor with the treasure room (vault
 * guardians kneel over the gilt; one of the chests breathes) and the wardens' room (lockers, the
 * Greyford pay-roll); the Hoard (Mimic Sovereign's round vault, the Bellbronze Shard behind its
 * grate); the Scale Gallery across the tally chute (a counterweight lowers the bridge); the stair
 * up to the Antechamber of the Vault of Futures (third Stillbell) and the Archive of Rejected
 * Futures, where the Treasury's ledgers of futures refused are kept.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  stairs, strongbox, coins, barrel, crate, sack, brazier, candles, candelabrum, cyl, sphere, stillbellShrine, type StillbellShrine,
  lantern, weaponRack, armourStand, rubble,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, P, Y, V, YAW_E, YAW_W, YAW_N, YAW_S } from './levelPlan';
import { roomWalls, slab, segVault, coffered, ledgerWall, railing, countingDesk } from './levelRooms';
import { fogGate, portcullis, scaleBridge, lever, chestPiece } from './levelPieces';

export interface VaultsBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  hoardArena: ArenaLayout;
}

export function buildVaults(ctx: AreaCtx): VaultsBuild {
  const enemies: EnemySpawn[] = [];
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};

  // ================================================================ strongroom corridor
  const k = newKit(ctx, 'strongrooms', 501, Y.deep);
  const CO = P.corridor, S1 = P.sr1, S2 = P.sr2;
  slab(k, 'flagstone', CO.x0, CO.z0, CO.x1, CO.z1, Y.deep);
  roomWalls(k, 'stone_dark', CO.x0, CO.z0, CO.x1, CO.z1, Y.deep, 6.2, 0.8, [
    { side: 'w', c: -116, w: 3, h: 3.2, kind: 'round' },
    { side: 'e', c: -116, w: 3, h: 3.2, kind: 'round' },
    { side: 'n', c: -33, w: 3.6, h: 3.4, kind: 'round' },
  ], ['s']);
  segVault(k, 'stone_wall', -33, Y.deep + 3.4, CO.z0, 0, 6, 1.8, CO.z1 - CO.z0, 0.35);
  for (const z of [-124, -118, -112]) for (const s of [-1, 1]) {
    k.bmm('stone_wall', -33 + s * 2.55 - 0.45, Y.deep, z - 0.45, -33 + s * 2.55 + 0.45, Y.deep + 3.5, z + 0.45, { col: true });
  }
  k.light(0xffa860, 4.5, 11, -33, Y.deep + 3.8, -118, 0.35);
  lantern(k, -33, Y.deep + 4.1, -118);
  // sentry turning in the corridor
  enemies.push({ id: 'tr_v_sentry1', kind: 'tr_sentry', anchor: anchor(-33, Y.deep, -120.8, YAW_S), leash: 10 });

  // ---------------------------------------------------------------- SR1: the treasure room
  slab(k, 'flagstone', S1.x0, S1.z0, S1.x1, S1.z1, Y.deep);
  roomWalls(k, 'stone_dark', S1.x0, S1.z0, S1.x1, S1.z1, Y.deep, 5.4, 0.8, [], ['e']);
  coffered(k, S1.x0, S1.z0, S1.x1, S1.z1, Y.deep + 4.8, 3, 'timber');
  // gilt on shelves and heaps, ingot stacks, plate
  for (const z of [-121.2, -110.8]) {
    k.bmm('timber_dark', S1.x0 + 0.5, Y.deep, z - 0.4, S1.x1 - 0.8, Y.deep + 0.9, z + 0.4, { col: true });
    for (let i = 0; i < 10; i++) k.box('gold_trim', S1.x0 + 1 + i * 0.8, Y.deep + 1.0, z + k.rng.range(-0.2, 0.2), 0.5, 0.14, 0.24, { ry: k.rng.range(-0.3, 0.3), cast: false });
    for (let i = 0; i < 6; i++) k.add('gold_trim', cyl(0.16, 0.12, 0.03, 12), { x: S1.x0 + 1.4 + i * 1.2, y: Y.deep + 1.2, z, rx: 1.3 }, { cast: false });
  }
  for (let i = 0; i < 18; i++) k.add('gold_trim', sphere(k.rng.range(0.3, 0.7), 7, 5), { x: k.rng.range(S1.x0 + 0.8, S1.x0 + 3), y: Y.deep, z: k.rng.range(S1.z0 + 2.5, S1.z1 - 2.5), s: [1, 0.4, 1] }, { cast: false });
  k.solid(S1.x0, Y.deep, S1.z0 + 2.2, S1.x0 + 2.8, Y.deep + 0.4, S1.z1 - 2.2);
  // dais with two chests: a real one (gilded) and a mimic
  k.bmm('stone_trim', S1.x0 + 3.2, Y.deep, -118.4, S1.x0 + 5.8, Y.deep + 0.24, -113.6, { col: true });
  const treasureChest = chestPiece(ctx, 'tr:treasureChest', S1.x0 + 4.6, Y.deep + 0.24, -114.9, YAW_E, true);
  pieces.treasureChest = treasureChest;
  enemies.push({ id: 'tr_v_mimic1', kind: 'tr_mimic', anchor: anchor(S1.x0 + 4.6, Y.deep + 0.24, -117.2, YAW_E), idleAnim: 'sentryWall', leash: 8 });
  // two vault guardians kneel before the dais
  enemies.push(
    { id: 'tr_v_guard1', kind: 'tr_guardian', anchor: anchor(-38.6, Y.deep, -112.8, 2.6), idleAnim: 'sentryWall', leash: 12 },
    { id: 'tr_v_guard2', kind: 'tr_guardian', anchor: anchor(-38.6, Y.deep, -119.2, 0.55), idleAnim: 'sentryWall', leash: 12 },
  );
  anchors.treasureScroll = anchor(S1.x0 + 1.6, Y.deep + 0.4, -116, YAW_W);
  k.light(0xffc070, 5, 10, -41.6, Y.deep + 3.2, -116, 0.3);

  // ---------------------------------------------------------------- SR2: the wardens' room
  slab(k, 'flagstone', S2.x0, S2.z0, S2.x1, S2.z1, Y.deep);
  roomWalls(k, 'stone_dark', S2.x0, S2.z0, S2.x1, S2.z1, Y.deep, 5.4, 0.8, [
    { side: 'e', c: (P.gallery.z0 + P.gallery.z1) / 2, w: P.gallery.z1 - P.gallery.z0, h: 3.2, kind: 'round' },
  ], ['w']);
  coffered(k, S2.x0, S2.z0, S2.x1, S2.z1, Y.deep + 4.8, 3);
  // lockers along the north wall (the warden set), a weapon rack, an armour stand
  for (let i = 0; i < 6; i++) {
    const x = S2.x0 + 1.0 + i * 1.3;
    k.bmm('iron', x - 0.55, Y.deep, S2.z0 + 0.05, x + 0.55, Y.deep + 2.2, S2.z0 + 0.75, { col: true });
    k.box('bronze', x + 0.3, Y.deep + 1.2, S2.z0 + 0.78, 0.08, 0.2, 0.04, { cast: false });
    k.box('stone_dark', x, Y.deep + 1.6, S2.z0 + 0.77, 0.7, 0.1, 0.02, { cast: false });
  }
  anchors.wardenLockers = anchor(S2.x0 + 3.6, Y.deep, S2.z0 + 1.9, YAW_N);
  weaponRack(k, S2.x1 - 0.4, Y.deep, -120.4, YAW_W, 2);
  armourStand(k, S2.x0 + 1.2, Y.deep, S2.z1 - 1.2, YAW_E, 'iron_rusted', 'cloth_brown');
  // an old iron coffer stencilled with the Greyford muster's river (the pay-roll)
  strongbox(k, S2.x1 - 1.4, Y.deep, S2.z1 - 1.0, YAW_N, 1.2);
  anchors.payroll = anchor(S2.x1 - 1.4, Y.deep, S2.z1 - 2.4, YAW_S);
  countingDesk(k, -25, Y.deep, -113.2, YAW_S, true);
  anchors.srScrap = anchor(-25, Y.deep, -111.6, YAW_N);
  k.light(0xffa860, 4, 10, -24.6, Y.deep + 3.2, -116, 0.4);
  enemies.push(
    { id: 'tr_v_col', kind: 'tr_collector', anchor: anchor(-23, Y.deep, -118.8, YAW_W), leash: 10 },
    { id: 'tr_v_mimic2', kind: 'tr_mimic', anchor: anchor(-27.6, Y.deep, -119.7, YAW_S), idleAnim: 'sentryWall', leash: 8 },
  );

  // ================================================================ the Hoard (Mimic Sovereign)
  const hk = newKit(ctx, 'hoard', 511, Y.deep);
  const HC = P.hoard.c, HR = P.hoard.r;
  // passage from the corridor's north door
  slab(hk, 'flagstone', -35, HC.z + HR - 0.5, -31, CO.z0, Y.deep);
  for (const x of [-35.8, -30.2]) hk.bmm('stone_dark', x - 0.4, Y.deep, HC.z + HR - 0.6, x + 0.4, Y.deep + 5, CO.z0 - 0.8, { col: true });
  hk.bmm('stone_dark', -36.2, Y.deep + 4.2, HC.z + HR - 0.6, -29.8, Y.deep + 5, CO.z0 - 0.8);
  // round floor
  const disc = new THREE.CylinderGeometry(HR + 0.6, HR + 0.6, 0.4, 40);
  hk.add('flagstone', disc.clone(), { x: HC.x, y: Y.deep - 0.2, z: HC.z }, { cast: false });
  hk.colGeo(disc, { x: HC.x, y: Y.deep - 0.2, z: HC.z });
  hk.add('gold_trim', new THREE.RingGeometry(3.2, 3.6, 40).rotateX(-Math.PI / 2), { x: HC.x, y: Y.deep + 0.01, z: HC.z }, { cast: false });
  // ring wall (segments; south gap for the passage, north gap for the grate)
  const segN = 26;
  for (let i = 0; i < segN; i++) {
    const a0 = (i / segN) * Math.PI * 2, a1 = ((i + 1) / segN) * Math.PI * 2, am = (a0 + a1) / 2;
    const dirS = Math.cos(am), dirN = -Math.cos(am); // z-direction components
    void dirS; void dirN;
    const cx = HC.x + Math.sin(am) * (HR + 0.6), cz = HC.z + Math.cos(am) * (HR + 0.6);
    const southGap = Math.cos(am) > 0.985, northGap = Math.cos(am) < -0.985;
    if (southGap || northGap) continue;
    const chord = 2 * (HR + 0.6) * Math.sin((a1 - a0) / 2) + 0.2;
    hk.push(cx, Y.deep, cz, am);
    hk.bmm('stone_dark', -chord / 2, 0, -0.6, chord / 2, 6.5, 0.6);
    hk.solid(-chord / 2, 0, -0.6, chord / 2, 8, 0.6);
    hk.bmm('gold_trim', -chord / 2, 4.2, -0.72, chord / 2, 4.35, -0.6, { cast: false });
    hk.pop();
  }
  // domed ceiling (stepped rings)
  for (let i = 0; i < 5; i++) {
    const r = HR + 0.8 - i * 2.2;
    hk.add('stone_dark', cyl(r, r + 0.4, 0.8, 32, true), { x: HC.x, y: Y.deep + 6.5 + i * 0.8, z: HC.z });
  }
  hk.add('stone_dark', cyl(2.6, 2.6, 0.5, 20), { x: HC.x, y: Y.deep + 10.5, z: HC.z });
  // heaps of coin against the wall (low colliders), toppled chests, a throne of strongboxes
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    if (Math.abs(Math.cos(a)) > 0.9) continue;
    const r = HR - 1.2;
    hk.add('gold_trim', sphere(hk.rng.range(1.0, 1.7), 9, 6), { x: HC.x + Math.sin(a) * r, y: Y.deep - 0.2, z: HC.z + Math.cos(a) * r, s: [1, 0.36, 1] }, { cast: false });
  }
  for (let i = 0; i < 7; i++) {
    const a = hk.rng.range(0, Math.PI * 2), r = hk.rng.range(5, HR - 2.5);
    if (Math.cos(a) > 0.7) continue;
    strongbox(hk, HC.x + Math.sin(a) * r, Y.deep, HC.z + Math.cos(a) * r, hk.rng.range(0, 3), hk.rng.range(0.7, 1.1), false);
  }
  for (const [dx, dz] of [[-7, 0], [7, 0], [0, 7], [-5, -5], [5, -5]]) brazier(hk, HC.x + dx, Y.deep, HC.z + dz, true, 1.1);
  hk.light(0xffc070, 9, 16, HC.x - 7, Y.deep + 2, HC.z, 0.8);
  hk.light(0xffc070, 9, 16, HC.x + 7, Y.deep + 2, HC.z, 0.8);
  // the alcove behind the grate: the Bellbronze Shard, a buckler, a purse
  const AL = { x0: HC.x - 2, x1: HC.x + 2, z0: HC.z - HR - 4.2, z1: HC.z - HR - 0.2 };
  slab(hk, 'flagstone', AL.x0, AL.z0, AL.x1, AL.z1 + 0.8, Y.deep);
  roomWalls(hk, 'stone_dark', AL.x0, AL.z0, AL.x1, AL.z1, Y.deep, 4.2, 0.6, [], ['s']);
  hk.bmm('stone_dark', AL.x0 - 0.6, Y.deep + 3.6, AL.z0, AL.x1 + 0.6, Y.deep + 4.2, AL.z1 + 0.6);
  hk.bmm('stone_trim', HC.x - 0.6, Y.deep, AL.z0 + 0.3, HC.x + 0.6, Y.deep + 1.0, AL.z0 + 1.1, { col: true });
  anchors.hoardShard = anchor(HC.x, Y.deep, AL.z0 + 2.2, YAW_N);
  anchors.hoardBuckler = anchor(HC.x + 1.3, Y.deep, AL.z0 + 1.8, YAW_E);
  anchors.hoardPurse = anchor(HC.x - 1.3, Y.deep, AL.z0 + 1.8, YAW_W);
  const hoardGrate = portcullis(ctx, 'tr:hoardGrate', HC.x, Y.deep, AL.z1 + 0.35, 0, 4.2, 3.6, 1.4, 'gold_trim');
  pieces.hoardGrate = hoardGrate;
  const hoardFog = fogGate(ctx, 'tr:fogHoard', -33, Y.deep, HC.z + HR + 1.6, YAW_S, 3.8, 4.4);
  const hoardArena: ArenaLayout = {
    bossId: 'mimicsovereign', center: HC.clone(), radius: HR, fogGate: hoardFog,
    entry: anchor(-33, Y.deep, CO.z0 + 1.6, YAW_N),
    spawn: anchor(HC.x, Y.deep, HC.z - 4, YAW_S),
    onDefeat: [hoardGrate],
  };

  // ================================================================ Scale Gallery and the tally chute
  const gk = newKit(ctx, 'gallery', 521, Y.deep);
  const G = P.gallery, CH = P.chute;
  const gz = (G.z0 + G.z1) / 2;
  slab(gk, 'flagstone', G.x0, G.z0, CH.x0, G.z1, Y.deep);
  slab(gk, 'flagstone', CH.x1, G.z0, G.x1, G.z1, Y.deep);
  // gallery walls with the chute opening wide to both sides
  for (const [x0, x1] of [[G.x0, CH.x0], [CH.x1, P.galleryStair.x0]] as const) {
    gk.bmm('stone_dark', x0, Y.deep, G.z0 - 0.8, x1, Y.deep + 4.6, G.z0, { col: true });
  }
  gk.bmm('stone_dark', G.x0, Y.deep, G.z1, CH.x0, Y.deep + 4.6, G.z1 + 0.8, { col: true });
  gk.bmm('stone_dark', CH.x1, Y.deep, G.z1, P.galleryStair.x0, Y.deep + 4.6, G.z1 + 0.8, { col: true });
  gk.bmm('stone_dark', P.galleryStair.x1, Y.deep, G.z0 - 0.8, P.galleryStair.x1 + 0.8, Y.canal + 3.2, P.galleryStair.zTop, { col: true });
  gk.bmm('stone_dark', P.galleryStair.x0, Y.deep, G.z0 - 0.8, P.galleryStair.x1 + 0.8, Y.deep + 4.6, G.z0, { col: true });
  gk.bmm('stone_dark', G.x0, Y.deep + 4.2, G.z0 - 0.8, P.galleryStair.x1 + 0.8, Y.deep + 4.8, G.z1 + 0.8);
  // the chute: a square shaft dropping out of sight, coins glinting far below
  gk.bmm('stone_dark', CH.x0 - 0.6, -24, G.z0 - 1.4, CH.x0, Y.deep - 0.4, G.z1 + 1.4, { col: true });
  gk.bmm('stone_dark', CH.x1, -24, G.z0 - 1.4, CH.x1 + 0.6, Y.deep - 0.4, G.z1 + 1.4, { col: true });
  gk.bmm('stone_dark', CH.x0 - 0.6, -24, G.z0 - 1.4, CH.x1 + 0.6, Y.deep + 4.6, G.z0 - 0.8, { col: true });
  gk.bmm('stone_dark', CH.x0 - 0.6, -24, G.z1 + 0.8, CH.x1 + 0.6, Y.deep + 4.6, G.z1 + 1.4, { col: true });
  // invisible rails along the bridge edges (the gap beside the deck is not a trap)
  gk.solid(CH.x0, Y.deep, G.z0 - 0.1, CH.x1, Y.deep + 1.2, G.z0 + 0.05);
  gk.solid(CH.x0, Y.deep, G.z1 - 0.05, CH.x1, Y.deep + 1.2, G.z1 + 0.1);
  for (let i = 0; i < 16; i++) gk.add('gold_trim', cyl(0.05, 0.05, 0.02, 6), { x: gk.rng.range(CH.x0 + 0.3, CH.x1 - 0.3), y: -19 + gk.rng.range(0, 0.1), z: gk.rng.range(G.z0, G.z1) }, { cast: false });
  gk.bmm('stone_dark', CH.x0, -19.6, G.z0 - 0.8, CH.x1, -19.2, G.z1 + 0.8);
  gk.bmm('iron', CH.x1 - 0.3, Y.deep + 4.4, G.z0 - 1.2, CH.x1 + 0.3, Y.deep + 4.7, G.z1 + 1.2, { cast: false });
  const bridge = scaleBridge(ctx, 'tr:scaleBridge', CH.x0, CH.x1, Y.deep, gz, G.z1 - G.z0 - 0.2);
  pieces.scaleBridge = bridge;
  const bridgeLever = lever(ctx, 'tr:scaleLever', CH.x0 - 1.6, Y.deep, G.z0 + 0.12, YAW_S);
  pieces.scaleLever = bridgeLever;
  gk.light(0xffa860, 3.6, 10, CH.x0 - 1.6, Y.deep + 3.0, gz, 0.3);
  // the stair up to the landing (south leg) and the landing east to the Antechamber
  const GS = P.galleryStair, LD = P.landing;
  const sx = (GS.x0 + GS.x1) / 2;
  stairs(gk, 'stone_wall', [sx, Y.deep, GS.zBot], [sx, Y.canal, GS.zTop], GS.x1 - GS.x0 - 0.2, { baseY: Y.deep - 0.2 });
  gk.solid(GS.x0, Y.deep - 0.4, G.z0, GS.x1, Y.deep, GS.zBot);
  gk.bmm('flagstone', GS.x0, Y.deep - 0.3, G.z0, GS.x1, Y.deep, GS.zBot, { cast: false });
  gk.bmm('stone_dark', GS.x0 - 0.8, Y.deep, GS.zBot, GS.x0, Y.canal + 3.2, LD.z0, { col: true });
  slab(gk, 'flagstone', LD.x0, LD.z0, LD.x1, LD.z1, Y.canal);
  gk.bmm('stone_dark', LD.x0 - 0.8, Y.canal, LD.z0, LD.x0, Y.canal + 3.6, LD.z1 + 0.8, { col: true });
  gk.bmm('stone_dark', LD.x0, Y.canal, LD.z1, LD.x1, Y.canal + 3.6, LD.z1 + 0.8, { col: true });
  gk.bmm('stone_dark', GS.x1, Y.canal, LD.z0 - 0.8, LD.x1, Y.canal + 3.6, LD.z0, { col: true });
  gk.bmm('stone_dark', LD.x0 - 0.8, Y.canal + 3.2, GS.zBot, LD.x1, Y.canal + 3.8, LD.z1 + 0.8);
  gk.light(0xffa860, 3.2, 9, -3.5, Y.canal + 2.6, -103, 0.3);
  lantern(gk, -3.5, Y.canal + 2.8, -103);
  enemies.push(
    { id: 'tr_g_sentry', kind: 'tr_sentry', anchor: anchor(-7.8, Y.deep, -115.2, YAW_W), leash: 8 },
    { id: 'tr_g_guard', kind: 'tr_guardian', anchor: anchor(0.2, Y.canal, -103, YAW_W), idleAnim: 'sentryWall', leash: 10 },
  );

  // ================================================================ Antechamber of the Vault of Futures
  const ak = newKit(ctx, 'ante', 531, Y.canal);
  const A = P.ante;
  slab(ak, 'flagstone', A.x0, A.z0, A.x1, A.z1, Y.canal);
  roomWalls(ak, 'stone_dark', A.x0, A.z0, A.x1, A.z1, Y.canal, A.ceil - Y.canal + 0.6, 0.8, [
    { side: 'w', c: (LD.z0 + LD.z1) / 2, w: LD.z1 - LD.z0, h: 3.2, kind: 'round' },
    { side: 'e', c: -103.5, w: 3, h: 3.2, kind: 'pointed' },
  ], ['n', 's']);
  coffered(ak, A.x0, A.z0, A.x1, A.z1, A.ceil, 3.2, 'timber_dark');
  // a wall of debts: bronze plaques of names on the west half of the north face (tower wall)
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) ak.box('bronze', A.x1 - 4.6 + i * 0.95, Y.canal + 1.4 + j * 0.9, A.z0 + 0.06, 0.7, 0.55, 0.06, { cast: false });
  anchors.wallOfDebts = anchor(A.x1 - 2.7, Y.canal, A.z0 + 1.7, YAW_N);
  // statues of treasurers flanking the veil (masked, holding ledgers)
  for (const s of [-1, 1]) {
    const x = 10 + s * 4.2;
    ak.bmm('stone_trim', x - 0.7, Y.canal, A.z0 + 0.2, x + 0.7, Y.canal + 0.8, A.z0 + 1.6, { col: true });
    ak.add('stone_wall', cyl(0.38, 0.5, 2.4, 8), { x, y: Y.canal + 0.8, z: A.z0 + 0.9 });
    ak.add('gold_trim', sphere(0.28, 10, 8), { x, y: Y.canal + 3.45, z: A.z0 + 0.9, s: [0.9, 1.15, 0.8] }, { cast: false });
    ak.box('leather_dark', x, Y.canal + 2.3, A.z0 + 1.3, 0.6, 0.8, 0.12, { rx: 0.3, cast: false });
  }
  brazier(ak, 6.2, Y.canal, -106.2, true, 0.9);
  brazier(ak, 13.8, Y.canal, -106.2, true, 0.9);
  ak.light(0xffb070, 6, 12, 10, Y.canal + 1.6, -106, 0.7);
  const shrine = stillbellShrine(ak, 3.6, Y.canal, A.z0 + 0.95, YAW_S, 7);

  // ================================================================ the Archive of Rejected Futures
  const rk = newKit(ctx, 'archive', 541, Y.canal);
  const AR = P.archive;
  slab(rk, 'flagstone', AR.x0 + 0.8, AR.z0, AR.x1, AR.z1, Y.canal);
  slab(rk, 'flagstone', A.x1, -105, AR.x0 + 0.8, -102, Y.canal);
  roomWalls(rk, 'stone_dark', AR.x0 + 0.8, AR.z0, AR.x1, AR.z1, Y.canal, 7.2, 0.8, [], ['w']);
  coffered(rk, AR.x0 + 0.8, AR.z0, AR.x1, AR.z1, Y.canal + 6.4, 2.8, 'timber_dark');
  ledgerWall(rk, AR.x1 - 0.05, Y.canal, -103.5, YAW_W, 10, 4.4);
  ledgerWall(rk, 24.4, Y.canal, AR.z0 + 0.05, YAW_S, 10, 6);
  ledgerWall(rk, 24.4, Y.canal, AR.z1 - 0.05, YAW_N, 10, 6);
  // the Ledger of Rejected Futures: a great book on a bronze lectern, pages held by chains
  rk.push(25.2, Y.canal, -103.5, YAW_W);
  rk.bmm('stone_trim', -1.4, 0, -1.0, 1.4, 0.35, 1.0, { col: true });
  rk.add('bronze', cyl(0.25, 0.4, 1.2, 10), { y: 0.35 });
  rk.box('bronze', 0, 1.6, 0.05, 1.8, 0.1, 1.2, { rx: 0.35 });
  rk.box('leather_dark', 0, 1.72, 0.05, 1.7, 0.08, 1.12, { rx: 0.35, cast: false });
  for (const s of [-1, 1]) rk.box('parchment', s * 0.42, 1.79, 0.06, 0.8, 0.05, 1.0, { rx: 0.35, rz: -s * 0.05, cast: false });
  for (const s of [-1, 1]) rk.box('iron', s * 0.95, 1.2, -0.1, 0.03, 1.1, 0.03, { rz: s * 0.2, cast: false });
  rk.pop();
  candelabrum(rk, 25.2, Y.canal, -101.6, 5);
  candelabrum(rk, 25.2, Y.canal, -105.4, 5);
  rk.light(0xffd6a0, 6, 12, 24.6, Y.canal + 2.4, -103.5, 0.3);
  // tally of rings: dozens of small bell marks cut in the east wall above the shelves
  for (let i = 0; i < 48; i++) {
    const row = Math.floor(i / 12), col = i % 12;
    rk.add('unlived_crack', cyl(0.06, 0.1, 0.12, 8), { x: AR.x1 - 0.08, y: Y.canal + 4.9 + row * 0.28, z: -108 + col * 0.8, rz: Math.PI / 2 }, { cast: false });
  }
  anchors.ledger = anchor(23.4, Y.canal, -103.5, YAW_E);
  anchors.archiveScrap = anchor(20.6, Y.canal, -107.6, YAW_N);
  strongbox(rk, 20.6, Y.canal, -108.4, 0, 0.8);

  // ================================================================ misc pickups
  anchors.corridorResin = anchor(-35.2, Y.deep, -108.4, YAW_W);
  crate(k, -35.4, Y.deep, -107.2, 0.3, 0.6, true);
  sack(k, -30.8, Y.deep, -125.8, 0.4);
  barrel(k, -30.9, Y.deep, -124.6, 0, true);

  return { shrine, enemies, anchors, pieces, hoardArena };
}

export { rubble, coins, railing, YAW_N };
