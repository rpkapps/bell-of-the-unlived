/**
 * The Old Mint: imposing stone facade on the square, the 8 m entry hall (coin presses, counters,
 * scales), the Counting Room (tables, ledgers, strongboxes), the refugees' escape stair sealed
 * with FRESH masonry, and the service hatch beside it down to the undercroft.
 *
 * Shell: x ∈ [3, 17]; front wall z ∈ [-36, -35] (door at x=10); entry hall z ∈ [-47.5, -36];
 * dividing wall z ∈ [-48.1, -47.5]; counting room z ∈ [-60, -48.1]; north wall z ∈ [-61, -60].
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn, Trigger } from '../../world/levelTypes';
import {
  Kit, wall, floor, stairs, parapet, pier, coinPress, scales, strongbox, coins, ledger, papers, table, desk,
  shelves, brazier, candles, masonsTools, bucket, wallBanner, wallShield, crate, sack, barrel, gablePrism,
  crenellation, bars, cyl, bench, stringCourse,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_E, YAW_S } from './common';

export interface MintBuild {
  countingRoomTrigger: Trigger;
  freshMasonry: Anchor;
  hatch: DynamicPiece & { anchor: Anchor };
  refugeKeyHook: Anchor;
  ordersDesk: Anchor;
  enemies: EnemySpawn[];
}

export function buildMint(ctx: AreaCtx): MintBuild {
  const k = newKit(ctx, 'mint', 31);
  const M = PLAN.mint;
  const x0 = M.x0, x1 = M.x1;
  const zF = M.zFront;           // -35 (front face)
  const zDiv0 = -48.1, zDiv1 = -47.5;
  const zN = -60;                // counting room north interior face
  const hallH = 8, countH = 6, facadeH = 13;

  // ---------------------------------------------------------------- facade (south)
  wall(k, 'stone_wall', x0, zF - 0.5, x1, zF - 0.5, 0, facadeH, 1.0, {
    openings: [
      { u: 0, w: 2.4, sill: 0, h: 3.0, kind: 'round' },
      { u: -4.6, w: 1.1, sill: 4.6, h: 2.2, kind: 'round' }, { u: 4.6, w: 1.1, sill: 4.6, h: 2.2, kind: 'round' },
      { u: -4.6, w: 1.0, sill: 9.0, h: 1.6, kind: 'round' }, { u: 4.6, w: 1.0, sill: 9.0, h: 1.6, kind: 'round' },
    ],
  });
  // rusticated base, pilasters, cornice, pediment with the great bronze coin
  k.bmm('stone_dark', x0 - 0.2, 0, zF - 0.1, x1 + 0.2, 1.4, zF + 0.25, { cast: false });
  for (const px of [3.4, 6.9, 13.1, 16.6]) k.bmm('stone_trim', px - 0.35, 1.4, zF - 0.1, px + 0.35, facadeH - 1.2, zF + 0.28, { cast: false });
  k.bmm('stone_trim', x0 - 0.5, facadeH - 1.2, zF - 0.3, x1 + 0.5, facadeH - 0.6, zF + 0.5, { cast: true });
  k.bmm('stone_trim', x0 - 0.3, 4.1, zF - 0.1, x1 + 0.3, 4.4, zF + 0.3, { cast: false });
  k.add('stone_trim', gablePrism(9, 3.2, 0.9), { x: 10, y: facadeH - 0.6, z: zF - 0.2 });
  k.add('bronze', cyl(1.05, 1.05, 0.16, 24), { x: 10, y: facadeH + 0.6, z: zF + 0.3, rx: Math.PI / 2 }, { cast: false });
  k.add('gold_trim', cyl(0.75, 0.75, 0.05, 24), { x: 10, y: facadeH + 0.6, z: zF + 0.4, rx: Math.PI / 2 }, { cast: false });
  // door surround with keystone and a bronze coin-press relief either side
  k.bmm('stone_trim', 8.3, 0, zF, 8.8, 3.4, zF + 0.3, { cast: false });
  k.bmm('stone_trim', 11.2, 0, zF, 11.7, 3.4, zF + 0.3, { cast: false });
  k.bmm('stone_trim', 9.7, 4.0, zF, 10.3, 4.6, zF + 0.35, { cast: false });
  for (const s of [-1, 1]) k.add('bronze', cyl(0.45, 0.45, 0.08, 16), { x: 10 + s * 2.2, y: 2.6, z: zF + 0.05, rx: Math.PI / 2 }, { cast: false });
  wallBanner(k, 6.9, 10.2, zF + 0.3, 0, 1.2, 3.2);
  wallBanner(k, 13.1, 10.2, zF + 0.3, 0, 1.2, 3.2);
  // open door leaves
  for (const s of [-1, 1]) k.box('planks', 10 + s * 1.5, 1.5, zF - 1.62, 0.1, 3.0, 1.15, { ry: s * 0.15, cast: false, variant: 2 });
  // parapet crown behind the pediment
  crenellation(k, 'stone_wall', x0, zF - 0.5, x1, zF - 0.5, facadeH, 0.9, { base: 0.4, merlonH: 0.9, col: false });

  // ---------------------------------------------------------------- side walls, dividing wall, north wall
  const sideH = 11;
  wall(k, 'stone_wall', x0 + 0.5, zF - 1, x0 + 0.5, -47.5, 0, sideH, 1.0, { openings: [{ u: 0, w: 1.2, sill: 4.2, h: 2.4, kind: 'round' }] });
  wall(k, 'stone_wall', x1 - 0.5, zF - 1, x1 - 0.5, -47.5, 0, sideH, 1.0, { openings: [{ u: 0, w: 1.2, sill: 4.2, h: 2.4, kind: 'round' }] });
  wall(k, 'stone_wall', x0 + 0.5, -47.5, x0 + 0.5, zN - 1, -0.6, 8.6, 1.0);
  wall(k, 'stone_wall', x1 - 0.5, -47.5, x1 - 0.5, zN - 1, -0.6, 8.6, 1.0);
  // window bars in the hall windows
  bars(k, x0 + 0.5, 4.2, -41.75, Math.PI / 2, 1.2, 3.0);
  bars(k, x1 - 0.5, 4.2, -41.75, -Math.PI / 2, 1.2, 3.0);
  // dividing wall (hall ↔ counting room) with a 2.2 m round-arched doorway at x = 10
  wall(k, 'stone_wall', x0 + 1, (zDiv0 + zDiv1) / 2, x1 - 1, (zDiv0 + zDiv1) / 2, 0, hallH, zDiv1 - zDiv0, { openings: [{ u: 0, w: 2.2, sill: 0, h: 2.6, kind: 'round' }] });
  k.bmm('stone_trim', 8.7, 0, zDiv1, 8.95, 3.2, zDiv1 + 0.12, { cast: false });
  k.bmm('stone_trim', 11.05, 0, zDiv1, 11.3, 3.2, zDiv1 + 0.12, { cast: false });
  // north wall: west part, the escape-route arch (down to the old stair), east part
  const E = PLAN.escape;
  wall(k, 'stone_wall', x0, zN - 0.5, E.x0 - 0.8, zN - 0.5, -0.6, 8.6, 1.0);
  wall(k, 'stone_wall', E.x0 - 0.8, zN - 0.5, E.x1 + 0.8, zN - 0.5, -3, 11, 1.0, {
    openings: [{ u: 0, w: E.x1 - E.x0, sill: 0.6, h: 3.5, kind: 'round' }],
  });
  wall(k, 'stone_wall', E.x1 + 0.8, zN - 0.5, x1, zN - 0.5, -0.6, 8.6, 1.0);

  // ---------------------------------------------------------------- roofs & exterior massing
  k.bmm('stone_trim', x0 - 0.2, sideH, zF - 1, x1 + 0.2, sideH + 0.35, -47.5, { cast: true });
  k.add('roof_slate', gablePrism(14.6, 5.2, 12.4), { x: 10, y: sideH + 0.35, z: -41.5 });
  k.bmm('stone_trim', x0 - 0.2, 8, -47.5, x1 + 0.2, 8.3, zN - 1, { cast: true });
  k.add('roof_slate', gablePrism(14.6, 4.6, 13.8), { x: 10, y: 8.3, z: -54.25 });
  for (const s of [-1, 1]) k.bmm('stone_dark', 10 + s * 4.5 - 0.5, 9, -55, 10 + s * 4.5 + 0.5, 14.5, -54); // chimneys
  stringCourse(k, x0, -60.9, x1, -47.5, 6.4, 0.2, 0.1);

  // ---------------------------------------------------------------- entry hall
  floor(k, 'flagstone', x0 + 1, zDiv0, x1 - 1, zF - 1, 0, 0.3, 'stone');
  // ceiling: beams + boards at 8 m
  k.bmm('planks', x0 + 1, hallH, zDiv1, x1 - 1, hallH + 0.15, zF - 1, { cast: false, variant: 1 });
  for (let z = -37.5; z > -47.5; z -= 2.2) k.bmm('timber_dark', x0 + 1, hallH - 0.45, z - 0.2, x1 - 1, hallH, z + 0.2, { cast: false });
  for (const [px, pz] of [[4.35, -41.6], [15.65, -41.6]] as const) pier(k, 'stone_trim', px, 0, pz, 0.7, hallH, false);
  coinPress(k, 6.3, 0, -39.4, YAW_E);
  coinPress(k, 6.3, 0, -44.6, YAW_E);
  // counters along the east wall with scales, coins, ledgers
  for (const cz of [-39, -44.2]) {
    k.bmm('timber_dark', 13.6, 0, cz - 1.9, 14.5, 1.05, cz + 1.9, { col: 'wood' });
    k.bmm('planks', 13.5, 1.05, cz - 2.0, 14.6, 1.12, cz + 2.0, { cast: false });
    scales(k, 14.05, 1.12, cz - 0.9, 0.3);
    coins(k, 14.1, 1.12, cz + 0.6, 6);
    ledger(k, 14.0, 1.12, cz + 1.4, 0.2, true);
  }
  strongbox(k, 15.4, 0, -37.8, -Math.PI / 2, 1, true);
  strongbox(k, 15.4, 0, -46.4, -Math.PI / 2, 0.9, true);
  crate(k, 4.6, 0, -36.8, 0.1, 0.7, true); sack(k, 5.4, 0, -36.7, 0.5); sack(k, 4.7, 0, -46.9, 0.2);
  barrel(k, 5.2, 0, -47.0, 0, true);
  brazier(k, 10, 0, -44.8, true, 1.1);
  k.light(0xff9c50, 9, 14, 10, 1.9, -44.8, 0.9);
  wallBanner(k, 10, 7.2, zDiv1 + 0.02, 0, 1.4, 3.4);
  wallShield(k, 7.4, 5.3, zDiv1 + 0.05, 0, 0.8);
  wallShield(k, 12.6, 5.3, zDiv1 + 0.05, 0, 0.8);
  bench(k, 9.6, 0, -36.8, 0);

  // ---------------------------------------------------------------- counting room floor (two holes)
  const H = PLAN.hatch;
  const fx0 = x0 + 1, fx1 = x1 - 1;
  floor(k, 'flagstone', fx0, H.z1, fx1, zDiv0, 0, 0.4);                  // south band
  floor(k, 'flagstone', fx0, H.z0, H.x0, H.z1, 0, 0.4);                  // west of hatch
  floor(k, 'flagstone', H.x1, H.z0, fx1, H.z1, 0, 0.4);                  // east of hatch
  floor(k, 'flagstone', fx0, E.zTop, fx1, H.z0, 0, 0.4);                  // between hatch and escape
  floor(k, 'flagstone', fx0, zN, E.x0, E.zTop, 0, 0.4);                   // west of escape stair
  floor(k, 'flagstone', E.x1, zN, fx1, E.zTop, 0, 0.4);                   // east of escape stair
  k.bmm('planks', fx0, countH, zN, fx1, countH + 0.15, zDiv0, { cast: false, variant: 1 });
  for (let z = -50; z > -60; z -= 2.4) k.bmm('timber_dark', fx0, countH - 0.4, z - 0.18, fx1, countH, z + 0.18, { cast: false });

  // ---------------------------------------------------------------- the sealed escape route
  stairs(k, 'stone_dark', [(E.x0 + E.x1) / 2, E.yBottom, E.zBottom], [(E.x0 + E.x1) / 2, 0, E.zTop], E.x1 - E.x0, { baseY: E.yBottom - 0.3, surface: 'stone' });
  for (const [a, b] of [[E.x0 - 0.4, E.x0], [E.x1, E.x1 + 0.4]] as const) k.bmm('stone_dark', a, E.yBottom - 0.4, E.zBottom - 0.1, b, -0.01, E.zTop, { col: true });
  k.bmm('stone_dark', E.x0 - 0.4, E.yBottom - 0.6, E.zBottom - 0.5, E.x1 + 0.4, E.yBottom, E.zTop, { col: true });
  // balustrades on the sides of the stairwell (enter from the south only)
  parapet(k, 'stone_trim', E.x0 - 0.2, E.zTop, E.x0 - 0.2, zN, 0, 0.35, 0.9);
  parapet(k, 'stone_trim', E.x1 + 0.2, E.zTop, E.x1 + 0.2, zN, 0, 0.35, 0.9);
  // FRESH masonry filling the arch: pale blocks in running bond over dark damp mortar
  const archSpring = -3 + 0.6 + 3.5, archR = (E.x1 - E.x0) / 2, acx = (E.x0 + E.x1) / 2;
  k.bmm('mud', E.x0, E.yBottom, zN - 0.75, E.x1, archSpring + archR, zN - 0.45, { cast: false });
  k.solid(E.x0 - 0.05, E.yBottom - 0.2, zN - 0.9, E.x1 + 0.05, archSpring + archR, zN - 0.2);            // the new wall blocks the route
  let row = 0;
  for (let y = E.yBottom + 0.02; y < archSpring + archR - 0.1; y += 0.3, row++) {
    const off = row % 2 ? 0.3 : 0;
    for (let x = E.x0 - off; x < E.x1; x += 0.6) {
      const bx0 = Math.max(E.x0 + 0.01, x + 0.02), bx1 = Math.min(E.x1 - 0.01, x + 0.58);
      if (bx1 - bx0 < 0.12) continue;
      const cx = (bx0 + bx1) / 2, cy = y + 0.13;
      if (cy > archSpring && Math.hypot(cx - acx, cy - archSpring) > archR - 0.12) continue;
      k.bmm('stone_fresh', bx0, y, zN - 0.47 - (row % 3) * 0.01, bx1, y + 0.26, zN - 0.2, { cast: false });
    }
  }
  // wet mortar smears and drips on the steps, masons' tools left behind
  for (let i = 0; i < 4; i++) k.box('mud', acx + k.rng.range(-0.9, 0.9), E.yBottom + 0.02, zN + 0.2 + i * 0.15, k.rng.range(0.2, 0.5), 0.02, k.rng.range(0.1, 0.3), { cast: false, ry: k.rng.range(0, 3) });
  masonsTools(k, 5.0, 0, -58.9, 0);
  bucket(k, acx - 0.7, -1.62, -58.4, 'planks', 'mud');
  k.box('stone_fresh', acx + 0.6, -1.9, -59.2, 0.55, 0.28, 0.38, { ry: 0.2, cast: false });
  k.box('timber', acx + 0.2, -0.6, -58.6, 0.25, 0.04, 2.3, { rx: 0.55, cast: false }); // a plank laid on the steps

  // ---------------------------------------------------------------- the service hatch
  const hatchCx = (H.x0 + H.x1) / 2, hatchCz = (H.z0 + H.z1) / 2;
  const B = PLAN.hatch.stairBottomZ;
  stairs(k, 'stone_dark', [hatchCx, -5, B], [hatchCx, 0, H.z1], H.x1 - H.x0, { baseY: -5.2, riser: 0.2 });
  // narrow stair tunnel walls (to the undercroft corridor)
  wall(k, 'stone_dark', H.x0 - 0.2, H.z1 + 0.2, H.x0 - 0.2, B, -5, 5, 0.4);
  wall(k, 'stone_dark', H.x1 + 0.2, H.z1 + 0.2, H.x1 + 0.2, B, -5, 5, 0.4);
  k.bmm('stone_dark', H.x0 - 0.4, -5, H.z1, H.x1 + 0.4, -0.4, H.z1 + 0.4, { col: true });
  // hatch frame (flush iron-bound rim)
  k.bmm('iron', H.x0 - 0.12, -0.06, H.z0 - 0.12, H.x1 + 0.12, 0.015, H.z0, { cast: false });
  k.bmm('iron', H.x0 - 0.12, -0.06, H.z1, H.x1 + 0.12, 0.015, H.z1 + 0.12, { cast: false });
  const hatch = buildHatch(ctx, H.x1 + 0.05, hatchCz, H.x1 - H.x0 + 0.1, H.z1 - H.z0 + 0.1);

  // ---------------------------------------------------------------- counting room furnishings
  // long counting table along the west wall
  table(k, 5.1, 0, -52.3, Math.PI / 2, 4.2, 1.1, 0.85, true);
  for (let i = 0; i < 4; i++) ledger(k, 5.1 + k.rng.range(-0.2, 0.2), 0.85, -50.9 - i * 0.95, k.rng.range(-0.4, 0.4), i % 2 === 0);
  coins(k, 5.2, 0.85, -53.4, 8); scales(k, 5.0, 0.85, -51.6, 0.2);
  candles(k, 5.3, 0.85, -54.0, 3, 0.07);
  shelves(k, 15.7, 0, -50.8, -Math.PI / 2, 2.6, 2.6);
  shelves(k, 4.3, 0, -56.9, Math.PI / 2, 1.8, 2.4);
  strongbox(k, 15.4, 0, -54.0, -Math.PI / 2, 1, true);
  strongbox(k, 15.45, 0, -55.2, -Math.PI / 2, 0.8, true);
  // the ledger hook board (east wall) with the Refuge Key hanging on it
  k.bmm('timber_dark', x1 - 1.08, 1.1, -57.3, x1 - 1.0, 2.0, -56.0, { cast: false });
  for (let i = 0; i < 4; i++) k.box('iron', x1 - 1.14, 1.75, -57.1 + i * 0.3, 0.1, 0.03, 0.03, { cast: false });
  ledger(k, x1 - 1.2, 1.35, -56.6, 0, false);
  k.box('iron', x1 - 1.18, 1.62, -56.2, 0.02, 0.18, 0.05, { cast: false }); // the key
  // Corvane's orders on the desk (NE corner)
  desk(k, 14.6, 0, -58.6, YAW_S, true);
  papers(k, 14.6, 0.8, -58.7, 3);
  k.box('cloth_red', 14.8, 0.815, -58.5, 0.05, 0.01, 0.05, { cast: false }); // wax seal
  candles(k, 15.1, 0.8, -58.9, 2, 0.05);
  k.light(0xffb066, 3.5, 8, 14.6, 1.5, -58.0, 0.5);
  k.light(0xffb066, 2.5, 7, 5.6, 1.6, -53, 0.5);
  crate(k, 7.2, 0, -49.0, 0.2, 0.7, true);
  sack(k, 15.2, 0, -49.0, 0.4);

  const enemies: EnemySpawn[] = [
    { id: 'ash_mint_inf_1', kind: 'infantry', anchor: anchor(8.4, 0, -40.8, YAW_S + 0.3), leash: 12, idleAnim: 'stand' },
    { id: 'ash_mint_inf_2', kind: 'infantry', anchor: anchor(12.2, 0, -45.6, YAW_S - 0.4), leash: 12, idleAnim: 'stand' },
  ];

  return {
    countingRoomTrigger: { id: 'countingRoom', box: new THREE.Box3(new THREE.Vector3(8.4, -0.5, -50.6), new THREE.Vector3(11.6, 3, zDiv0)) },
    freshMasonry: anchor(acx, 0, E.zTop + 0.45, YAW_N),
    hatch,
    refugeKeyHook: anchor(x1 - 1.18, 1.62, -56.2, YAW_E),
    ordersDesk: anchor(14.6, 0.8, -58.7, YAW_N),
    enemies,
  };
}

/**
 * The service hatch: an iron-banded plank trapdoor hinged along its east edge (x = hingeX).
 * t=0: closed & flush (collider blocks the stairwell); t=1: swung up ~100° against its hinge,
 * collider disabled.
 */
function buildHatch(ctx: AreaCtx, hingeX: number, cz: number, w: number, len: number): DynamicPiece & { anchor: Anchor } {
  const pivot = new THREE.Group();
  pivot.name = 'hatch';
  pivot.position.set(hingeX, 0.0, cz);
  ctx.dynamicRoot.add(pivot);
  const leaf = new Kit('hatchLeaf', ctx.shared, 7);
  leaf.bmm('planks', -w, 0.0, -len / 2, 0, 0.08, len / 2, { variant: 2 });
  for (let i = 0; i < 5; i++) leaf.bmm('timber_dark', -w + 0.02, 0.079, -len / 2 + 0.1 + i * (len - 0.2) / 4 - 0.01, -0.02, 0.082, -len / 2 + 0.1 + i * (len - 0.2) / 4 + 0.01, { cast: false });
  for (const bz of [-len / 2 + 0.35, 0, len / 2 - 0.35]) leaf.bmm('iron', -w, 0.08, bz - 0.06, 0, 0.1, bz + 0.06, { cast: false });
  for (const bz of [-len / 2 + 0.35, len / 2 - 0.35]) leaf.add('iron', cyl(0.06, 0.06, 0.2, 8), { x: 0, y: 0.05, z: bz, rx: Math.PI / 2 }, { cast: false });
  leaf.add('iron_rusted', new THREE.TorusGeometry(0.12, 0.02, 6, 12), { x: -w * 0.55, y: 0.11, z: 0, rx: Math.PI / 2 }, { cast: false });
  leaf.bmm('iron_rusted', -w * 0.55 - 0.05, 0.08, -0.03, -w * 0.55 + 0.05, 0.12, 0.03, { cast: false });
  leaf.finish(pivot);
  const col = ctx.shared.collision?.addDynamicBox('ashbridge:hatch', [w, 0.4, len], 'wood');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(hingeX - w / 2, -0.12, cz));
  const piece: DynamicPiece & { anchor: Anchor } = {
    object: pivot,
    collider: col,
    anchor: anchor(hingeX - w / 2, 0, PLAN.hatch.z1 + 0.75, YAW_N),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const ease = e * e * (3 - 2 * e);
      pivot.rotation.z = -ease * (100 * Math.PI) / 180;
      if (col) col.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

export const MINT_ZONE = new THREE.Box3(new THREE.Vector3(3, -0.5, -48.1), new THREE.Vector3(17, 10, -35));
export const COUNTING_ZONE = new THREE.Box3(new THREE.Vector3(3, -3, -61), new THREE.Vector3(17, 7, -48.1));
