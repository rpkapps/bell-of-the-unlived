/**
 * Mint Undercroft / Lower Passage (floor y=-5, barrel vault to ~-0.6): from the foot of the hatch
 * stair north along x ∈ [11, 15] to z = -95. Side rooms: sentry alcove (W), clerk's room (E),
 * chest alcove (E), the locked refuge (W, barred door). At the north end a 33° stair climbs west
 * to a landing at y=3 and a doorway into the Garrison Courtyard's south-west corner.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  Kit, wall, floor, stairs, barrelVault, sconceTorch, desk, shelves, papers, ledger, candles, strawBed,
  bucket, barrel, crate, sack, bars, table, chair, rubble, strongbox, cyl,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_E, YAW_W } from './common';

export interface UndercroftBuild {
  grimoire: Anchor;
  chest: DynamicPiece & { anchor: Anchor };
  refugeDoor: DynamicPiece & { anchor: Anchor };
  oswinCell: Anchor;
  rosaryDrop: Anchor;
  enemies: EnemySpawn[];
}

/** Offset `u` of a point along a wall (x0,z0)→(x1,z1), measured from the wall's midpoint. */
const uOn = (x0: number, z0: number, x1: number, z1: number, px: number, pz: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  return ((px - (x0 + x1) / 2) * (x1 - x0) + (pz - (z0 + z1) / 2) * (z1 - z0)) / len;
};

export function buildUndercroft(ctx: AreaCtx): UndercroftBuild {
  const k = newKit(ctx, 'undercroft', 41);
  const U = PLAN.under;
  const y = U.y, spring = y + 2.4, t = 0.6;
  const zS = -57.35, zN = U.zN; // corridor ends (south wall centre / north interior face)
  const wx = U.x0 - t / 2, ex = U.x1 + t / 2;

  // ---------------------------------------------------------------- corridor
  floor(k, 'flagstone', U.x0 - t, zN - t, U.x1 + t, zS, y, 0.5);
  const doorH = 2.4;
  const west = { x0: wx, z0: zS, x1: wx, z1: zN - t };
  const east = { x0: ex, z0: zS, x1: ex, z1: zN - t };
  wall(k, 'stone_wall', west.x0, west.z0, west.x1, west.z1, y, 2.4, t, {
    openings: [
      { u: uOn(west.x0, west.z0, west.x1, west.z1, wx, -66), w: 4, sill: 0, h: doorH },
      { u: uOn(west.x0, west.z0, west.x1, west.z1, wx, -82), w: 1.8, sill: 0, h: doorH },
      { u: uOn(west.x0, west.z0, west.x1, west.z1, wx, PLAN.upStair.zc), w: PLAN.upStair.w, sill: 0, h: doorH },
    ],
  });
  wall(k, 'stone_wall', east.x0, east.z0, east.x1, east.z1, y, 2.4, t, {
    openings: [
      { u: uOn(east.x0, east.z0, east.x1, east.z1, ex, -72.5), w: 2, sill: 0, h: doorH },
      { u: uOn(east.x0, east.z0, east.x1, east.z1, ex, -81), w: 2.4, sill: 0, h: doorH },
    ],
  });
  // south end wall with the hatch-stair opening; north end wall
  wall(k, 'stone_wall', U.x0 - t, zS, U.x1 + t, zS, y, 4.4, 0.4, { openings: [{ u: 0, w: PLAN.hatch.x1 - PLAN.hatch.x0, sill: 0, h: 3.6 }] });
  wall(k, 'stone_wall', U.x0 - t, zN - t / 2, U.x1 + t, zN - t / 2, y, 4.4, t);
  // vault (spring at y+2.4, radius 2 → crown y+4.4 = -0.6) with ribs; ceiling collider
  barrelVault(k, 'stone_wall', (U.x0 + U.x1) / 2, spring, zN - 0.05, 0, (U.x1 - U.x0) / 2, zS - zN + 0.1, 0.4, 10);
  k.solid(U.x0 - t, -0.6, zN - t, U.x1 + t, -0.2, zS);
  // lintels over wall openings above spring are part of the vault; add chamfered trims
  // drainage channel & damp
  k.bmm('stone_dark', 12.8, y + 0.001, zN, 13.2, y + 0.01, zS, { cast: false });
  for (let i = 0; i < 7; i++) k.box('water', 13 + k.rng.range(-1.2, 1.2), y + 0.012, k.rng.range(-92, -60), k.rng.range(0.5, 1.4), 0.01, k.rng.range(0.4, 1.0), { cast: false });

  // torches (4) in sconces along the corridor
  const torches: [number, number, number][] = [[U.x0, -61.5, YAW_E], [U.x1, -69.5, YAW_W], [U.x0, -76.5, YAW_E], [U.x1, -88, YAW_W]];
  for (const [x, z, yaw] of torches) {
    sconceTorch(k, x, y + 1.9, z, yaw);
    k.light(0xff9a4a, 7, 11, x + Math.sin(yaw) * 0.6, y + 2.2, z, 1);
  }

  // ---------------------------------------------------------------- sentry alcove (west, z ≈ -66)
  const sa = { x0: 6, x1: U.x0 - t, z0: -68.2, z1: -63.8 };
  room(k, sa.x0, sa.z0, sa.x1, sa.z1, y, 2.8, 'W');
  crate(k, 6.6, y, -63.9 - 0.5, 0.2, 0.7, true); barrel(k, 9.6, y, -67.7, 0, true);
  rubble(k, 7.0, y, -67.5, 0.5, false);

  // ---------------------------------------------------------------- clerk's room (east, z ≈ -72.5)
  const cr = { x0: U.x1 + t, x1: 20.6, z0: -75.6, z1: -69.4 };
  room(k, cr.x0, cr.z0, cr.x1, cr.z1, y, 2.8, 'E');
  desk(k, 19.4, y, -72.5, -Math.PI / 2, true);
  papers(k, 19.5, y + 0.8, -72.9, 4);
  ledger(k, 19.4, y + 0.8, -72.2, 0.3, true);   // the Cinder Bolt grimoire, open on the desk
  candles(k, 19.6, y + 0.8, -73.3, 2, 0.05);
  shelves(k, 18.2, y, -75.2, 0, 2.2, 2.4);
  shelves(k, 18.2, y, -69.8, Math.PI, 2.2, 2.4);
  strongbox(k, 16.6, y, -75.0, 0, 0.7, true);
  k.light(0xffb066, 3, 7, 19.0, y + 1.5, -72.5, 0.5);

  // ---------------------------------------------------------------- chest alcove (east, z ≈ -81)
  const ca = { x0: U.x1 + t, x1: 19, z0: -82.6, z1: -79.4 };
  room(k, ca.x0, ca.z0, ca.x1, ca.z1, y, 2.6, 'E');
  const chest = buildChest(ctx, k, 18.2, y, -81, -Math.PI / 2);
  sack(k, 17.8, y, -79.8, 0.4); barrel(k, 18.4, y, -82.2, 0.2);

  // ---------------------------------------------------------------- the locked refuge (west, z ≈ -82)
  const rf = { x0: 5.6, x1: U.x0 - t, z0: -87, z1: -78.6 };
  room(k, rf.x0, rf.z0, rf.x1, rf.z1, y, 2.8, 'W');
  strawBed(k, 6.6, y, -85.3, 0);
  bucket(k, 9.6, y, -86.3, 'planks', 'water');
  candles(k, 6.3, y, -79.4, 3, 0.08);
  table(k, 9.2, y, -79.4, 0, 1.0, 0.6, 0.7, true);
  chair(k, 8.4, y, -80.3, 0.4);
  k.box('bone', 7.2, y + 0.02, -86.4, 0.3, 0.03, 0.05, { ry: 0.6, cast: false });
  k.light(0xffb066, 2.2, 6, 6.6, y + 0.9, -80.2, 0.6);
  const refugeDoor = buildRefugeDoor(ctx, k, wx, -82.9, -81.1, y);

  // ---------------------------------------------------------------- north end: stair up to the courtyard
  const S = PLAN.upStair;
  const z0 = S.zc - S.w / 2, z1 = S.zc + S.w / 2;
  stairs(k, 'stone_wall', [U.x0 - t - 0.05, y, S.zc], [S.xHigh, PLAN.court.y, S.zc], S.w, { baseY: y });
  // tunnel walls (north below the courtyard level, south all the way up), sloped ceiling
  wall(k, 'stone_wall', S.landX0 - 0.4, z0 - 0.2, U.x0 - t, z0 - 0.2, y, 8, 0.4);
  wall(k, 'stone_wall', S.landX0 - 0.4, z1 + 0.2, U.x0 - t, z1 + 0.2, y, 12, 0.4);
  {
    const run = U.x0 - t - S.xHigh, rise = PLAN.court.y - y, L = Math.hypot(run, rise), a = Math.atan2(rise, run);
    k.box('stone_wall', (U.x0 - t + S.xHigh) / 2, (y + PLAN.court.y) / 2 + 3.3, S.zc, L + 0.6, 0.4, S.w + 1.2, { rz: -a });
  }
  // landing at y=3 (extends under the courtyard doorway) and its stair-house
  floor(k, 'flagstone', S.landX0, -96.3, S.xHigh + 0.05, z1, PLAN.court.y, 0.5);
  wall(k, 'stone_wall', S.landX0 - 0.2, z0 - 0.4, S.landX0 - 0.2, z1 + 0.4, y, 12, 0.4);
  k.bmm('stone_wall', S.landX0 - 0.4, PLAN.court.y + 3.6, z0 - 0.4, S.xHigh + 1.2, PLAN.court.y + 4.0, z1 + 0.4);
  k.bmm('roof_slate', S.landX0 - 0.7, PLAN.court.y + 4.0, z0 - 0.7, S.xHigh + 1.5, PLAN.court.y + 4.2, z1 + 0.7);
  sconceTorch(k, S.landX0 + 0.05, PLAN.court.y + 1.9, S.zc, YAW_E);
  // stones from above the stair-house to ground outside (visual massing)
  k.bmm('stone_dark', S.landX0 - 0.6, -0.5, z1 + 0.4, U.x0 - t, 0.6, z1 + 1.2, { cast: false });

  // ---------------------------------------------------------------- enemies
  const enemies: EnemySpawn[] = [
    // the lone sentry faces the alcove's west wall, muttering: approach from behind (east)
    { id: 'ash_under_sentry', kind: 'sentry', anchor: anchor(6.85, y, -66, YAW_W), leash: 10, idleAnim: 'sentryWall' },
    {
      id: 'ash_under_inf_1', kind: 'infantry', anchor: anchor(13, y, -84, Math.PI), leash: 14, idleAnim: 'stand',
      patrol: [new THREE.Vector3(13, y, -91.5), new THREE.Vector3(13, y, -74)],
    },
  ];

  return {
    grimoire: anchor(19.4, y + 0.8, -72.2, YAW_E),
    chest,
    refugeDoor,
    oswinCell: anchor(6.3, y, -82.4, YAW_E),
    rosaryDrop: anchor(8.7, y + 0.01, -82.3, YAW_E),
    enemies,
  };
}

/**
 * A small side room with walls on three sides (open side toward the corridor: 'W' room opens
 * east, 'E' room opens west — the corridor wall provides the doorway), floor and flat ceiling.
 */
function room(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h: number, side: 'W' | 'E') {
  const t = 0.4;
  floor(k, 'flagstone', x0 - t, z0 - t, x1, z1 + t, y, 0.5);
  if (side === 'W') wall(k, 'stone_wall', x0 - t / 2, z0 - t, x0 - t / 2, z1 + t, y, h + 0.4, t);
  else wall(k, 'stone_wall', x1 + t / 2, z0 - t, x1 + t / 2, z1 + t, y, h + 0.4, t);
  wall(k, 'stone_wall', x0 - t, z0 - t / 2, x1 + t, z0 - t / 2, y, h + 0.4, t);
  wall(k, 'stone_wall', x0 - t, z1 + t / 2, x1 + t, z1 + t / 2, y, h + 0.4, t);
  k.bmm('stone_wall', x0 - t, y + h, z0 - t, x1 + t, y + h + 0.4, z1 + t, { col: true });
  for (let z = z0 + 0.8; z < z1; z += 1.6) k.bmm('timber_dark', x0, y + h - 0.25, z - 0.12, x1, y + h, z + 0.12, { cast: false });
}

/** Treasure chest; the lid is a dynamic pivot (set(1) = open). Body collider is static. */
function buildChest(ctx: AreaCtx, k: Kit, x: number, y: number, z: number, yaw: number): DynamicPiece & { anchor: Anchor } {
  k.push(x, y, z, yaw);
  k.bmm('timber_dark', -0.5, 0, -0.3, 0.5, 0.5, 0.3, { cast: false });
  for (const bx of [-0.38, 0, 0.38]) k.bmm('iron', bx - 0.04, 0, -0.31, bx + 0.04, 0.51, 0.31, { cast: false });
  k.solid(-0.52, 0, -0.32, 0.52, 0.62, 0.32, 'wood');
  const hinge = k.wp(0, 0.5, -0.3);
  const worldYaw = k.wyaw(0);
  const anc = anchor(...k.wp(0, 0, 1.25).toArray() as [number, number, number], k.wyaw(Math.PI));
  k.pop();
  const pivot = new THREE.Group();
  pivot.name = 'chestLid';
  pivot.position.copy(hinge);
  pivot.rotation.y = worldYaw;
  ctx.dynamicRoot.add(pivot);
  const lid = new Kit('chestLid', ctx.shared, 3);
  lid.add('timber_dark', cyl(0.3, 0.3, 1.0, 10), { y: 0, z: 0.3, rz: Math.PI / 2, s: [1, 1, 1] }, { cast: false });
  for (const bx of [-0.38, 0, 0.38]) lid.add('iron', cyl(0.31, 0.31, 0.08, 10), { x: bx, z: 0.3, rz: Math.PI / 2 }, { cast: false });
  lid.bmm('gold_trim', -0.06, -0.12, 0.58, 0.06, 0.02, 0.63, { cast: false });
  lid.finish(pivot);
  // the half-cylinder look: hide the lower half inside the body by squashing
  pivot.children[0].scale.set(1, 0.55, 1);
  const piece: DynamicPiece & { anchor: Anchor } = {
    object: pivot,
    anchor: anc,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      pivot.rotation.set(-e * 1.9, worldYaw, 0, 'YXZ');
    },
  };
  piece.set(0);
  return piece;
}

/** Barred iron cell door in the corridor's west wall between zA (north) and zB (south). */
function buildRefugeDoor(ctx: AreaCtx, k: Kit, x: number, zA: number, zB: number, y: number): DynamicPiece & { anchor: Anchor } {
  const w = zB - zA, h = 2.35;
  // frame
  k.bmm('iron', x - 0.35, y, zA - 0.12, x + 0.35, y + h + 0.1, zA, { cast: false });
  k.bmm('iron', x - 0.35, y, zB, x + 0.35, y + h + 0.1, zB + 0.12, { cast: false });
  const pivot = new THREE.Group();
  pivot.name = 'refugeDoor';
  pivot.position.set(x - 0.1, y, zA);
  ctx.dynamicRoot.add(pivot);
  const leaf = new Kit('refugeDoorLeaf', ctx.shared, 5);
  bars(leaf, 0, 0.02, w / 2, Math.PI / 2, w - 0.04, h - 0.04, 0.2);
  leaf.bmm('iron', -0.05, 1.0, w - 0.25, 0.05, 1.3, w - 0.05, { cast: false });   // lock box
  leaf.bmm('iron_rusted', -0.06, 0.02, 0.02, 0.06, 0.12, w - 0.02, { cast: false });
  leaf.finish(pivot);
  const col = ctx.shared.collision?.addDynamicBox('ashbridge:refugeDoor', [0.3, h, w], 'metal');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + h / 2, (zA + zB) / 2));
  const piece: DynamicPiece & { anchor: Anchor } = {
    object: pivot,
    collider: col,
    anchor: anchor(x + 1.3, y, (zA + zB) / 2, YAW_W),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      pivot.rotation.y = -e * (95 * Math.PI) / 180;
      if (col) col.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

export const UNDERCROFT_ZONE = new THREE.Box3(new THREE.Vector3(-6, -6, -96), new THREE.Vector3(21, -0.8, -51.5));
