/**
 * The Twofold Market (y = 0): a canal market at dusk where a prosperous history and a famine
 * history occupy the same quays. West quay: stone-footed houses with lit windows, gilt stalls,
 * lanterns. East quay: the same stalls standing empty under torn awnings, burned and boarded
 * houses, a bread line on the ghat steps beneath the Hall of Weights' banquet balcony. The canal
 * itself is split at the weir under the seam bridge: flooded and lamp-lit to the south, a dry
 * cracked bed to the north that runs into the culvert under the Hall.
 *
 * Walkable space: quay slabs (explicit colliders) with holes for the ghat stair (east, into the
 * dry canal) and the water steps (west, out of the flooded canal); bridges; the balcony stair.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  Kit, house, floor, wall, stairs, bound, barrel, crate, sack, crateStack, lantern, bracketLantern, candles, table, bench, chair,
  rubble, fallenBeam, laundryLine, strongbox, coins, scales, bucket, torchPost, cyl, sphere, archway, skylineRing, spireTower,
  PuffField, stillbellShrine, bellPost, type StillbellShrine, gableRoof, candelabrum, brazier,
} from '../../world/kit';
import type { MaterialId } from '../../render/materialIds';
import { type AreaCtx, newKit, anchor, P, Y, V, YAW_E, YAW_W, YAW_N, YAW_S } from './levelPlan';
import { portcullis } from './levelPieces';

export interface MarketBuild {
  shrine: StillbellShrine;
  playerStart: Anchor;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
  smoke: PuffField;
  /** Gilded "other history" overlay on the famine quay (fades for good when the Treasury bell falls silent). */
  overlay: DynamicPiece;
  update(time: number): void;
}

export function buildMarket(ctx: AreaCtx): MarketBuild {
  const k = newKit(ctx, 'market', 301);
  const C = P.canal;
  const enemies: EnemySpawn[] = [];
  const anchors: Record<string, Anchor> = {};

  // ================================================================ ground: quays, canal, bridges
  const quay = (x0: number, z0: number, x1: number, z1: number, mat: MaterialId) => {
    k.solid(x0, -3.6, z0, x1, 0, z1);
    k.bmm(mat, x0, -0.3, z0, x1, 0, z1, { cast: false, uv: 'world' });
  };
  // west quay (prosperous: dressed cobbles) — hole for the water steps
  quay(P.westQuay.x0, P.marketZ.z0, P.westQuay.x1, P.waterSteps.z0, 'cobble');
  quay(P.westQuay.x0, P.waterSteps.z0, P.waterSteps.xTop, P.waterSteps.z1, 'cobble');
  quay(P.westQuay.x0, P.waterSteps.z1, P.westQuay.x1, P.marketZ.z1, 'cobble');
  // east quay (famine: worn flagstones and mud) — hole for the ghat stair
  quay(P.eastQuay.x0, P.ghat.z1, P.eastQuay.x1, P.marketZ.z1, 'flagstone');
  quay(P.ghat.xTop, P.ghat.z0, P.eastQuay.x1, P.ghat.z1, 'flagstone');
  quay(P.eastQuay.x0, P.marketZ.z0, P.eastQuay.x1, P.ghat.z0, 'flagstone');
  for (let i = 0; i < 16; i++) k.bmm('mud', 6 + k.rng.range(0, 11), 0.001, -50 + i * 4 + k.rng.range(0, 2), 7 + k.rng.range(1, 13), 0.012, -48 + i * 4 + k.rng.range(0, 1.5), { cast: false });
  // canal bed (dry to the north of the weir, drowned to the south) and the culvert floor
  k.solid(C.x0, Y.canal - 0.5, P.culvert.z0, C.x1, Y.canal, C.z1);
  k.bmm('mud', C.x0, Y.canal - 0.3, P.weirZ, C.x1, Y.canal, C.z1, { cast: false });
  k.bmm('dirt', C.x0, Y.canal - 0.3, C.z0, C.x1, Y.canal, P.weirZ, { cast: false, uv: 'world' });
  // cracks in the dry bed: dark polygons of shrinkage
  for (let i = 0; i < 70; i++) {
    const x = k.rng.range(C.x0 + 0.3, C.x1 - 0.3), z = k.rng.range(C.z0 + 0.5, P.weirZ - 0.8);
    k.box('stone_dark', x, Y.canal + 0.006, z, k.rng.range(0.6, 1.8), 0.012, 0.035, { ry: k.rng.range(0, Math.PI), cast: false });
  }
  // canal walls (quay faces), coping and mooring rings
  for (const s of [-1, 1]) {
    const x = s * 4;
    k.bmm('stone_dark', x - (s > 0 ? 0 : 0.05), Y.canal, C.z0, x + (s > 0 ? 0.05 : 0), -0.3, C.z1, { cast: false });
    k.bmm('stone_trim', x - 0.35, -0.12, C.z0, x + 0.35, 0.08, C.z1, { cast: false });
    for (let z = C.z0 + 3; z < C.z1 - 1; z += 6) {
      if (s > 0 && z > P.ghat.z0 - 0.5 && z < P.ghat.z1 + 0.5) continue;
      if (s < 0 && z > P.waterSteps.z0 - 0.5 && z < P.waterSteps.z1 + 0.5) continue;
      k.add('iron', new THREE.TorusGeometry(0.16, 0.03, 5, 10), { x: x - s * 0.06, y: -0.7, z, ry: Math.PI / 2 }, { cast: false });
      // tide-marks: a green-black band on the drowned side, bleached stone on the dry side
      k.bmm(z > P.weirZ ? 'moss' : 'stone_fresh', x - s * 0.02 - 0.01, z > P.weirZ ? Y.water - 0.1 : -2.0, z - 3, x - s * 0.02 + 0.01, z > P.weirZ ? Y.water + 0.35 : -1.4, z + 3, { cast: false });
    }
  }
  // water (south of the weir), with lamp reflections from the lit west quay
  k.bmm('water', C.x0, Y.water - 0.02, P.weirZ + 0.6, C.x1, Y.water, C.z1, { cast: false, receive: true });
  // the weir and the sluice gate under the seam bridge
  k.bmm('stone_dark', C.x0, Y.canal, P.weirZ - 0.6, C.x1, -1.8, P.weirZ + 0.6, { col: true });
  k.bmm('stone_trim', C.x0, -1.9, P.weirZ - 0.7, C.x1, -1.75, P.weirZ + 0.7, { cast: false });
  for (let i = 0; i <= 6; i++) k.box('iron', C.x0 + 0.6 + i * 1.13, -1.1, P.weirZ + 0.8, 0.09, 1.6, 0.09, { cast: false });
  k.box('iron', 0, -0.4, P.weirZ + 0.8, 8, 0.14, 0.14, { cast: false });
  k.box('iron', 0, -1.7, P.weirZ + 0.8, 8, 0.12, 0.12, { cast: false });
  // a trickle of water over the weir lip into the dry side
  k.bmm('water', -1.2, -1.82, P.weirZ - 1.2, 1.2, -1.78, P.weirZ - 0.55, { cast: false });
  // water steps (west quay → drowned canal)
  stairs(k, 'stone_wall', [P.waterSteps.xBot, Y.canal, (P.waterSteps.z0 + P.waterSteps.z1) / 2], [P.waterSteps.xTop, 0, (P.waterSteps.z0 + P.waterSteps.z1) / 2], P.waterSteps.z1 - P.waterSteps.z0, { baseY: Y.canal - 0.3 });
  // ghat stair (east quay → dry canal): wide steps where the bread line waits
  const gz = (P.ghat.z0 + P.ghat.z1) / 2;
  stairs(k, 'stone_wall', [P.ghat.xBot, Y.canal, gz], [P.ghat.xTop, 0, gz], P.ghat.z1 - P.ghat.z0, { baseY: Y.canal - 0.3 });
  // low kerb along the ghat hole's southern edge
  k.bmm('stone_trim', P.ghat.xBot, 0, P.ghat.z1, P.ghat.xTop, 0.25, P.ghat.z1 + 0.3, { col: true, cast: false });

  // bridges: deck at quay level, segmental arch faces, parapets
  const bridge = (z0: number, z1: number, name: string) => {
    k.solid(C.x0 - 0.3, -0.55, z0, C.x1 + 0.3, 0, z1);
    k.bmm('cobble', C.x0 - 0.3, -0.25, z0, C.x1 + 0.3, 0, z1, { cast: false, uv: 'world' });
    k.bmm('stone_wall', C.x0, -0.95, z0, C.x1, -0.25, z1);
    for (const zz of [z0, z1]) {
      // arch ring on each face
      for (let i = 0; i < 9; i++) {
        const a0 = Math.PI * (0.12 + (0.76 * i) / 9), a1 = Math.PI * (0.12 + (0.76 * (i + 1)) / 9);
        const R = 4.6, cy = -3.2 - 0.8;
        const x0 = Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
        const L = Math.hypot(x1 - x0, y1 - y0);
        k.box('stone_trim', (x0 + x1) / 2, (y0 + y1) / 2 + 0.2, zz, L + 0.04, 0.4, 0.35, { rz: Math.atan2(y1 - y0, x1 - x0), cast: false });
      }
      // parapet
      k.bmm('stone_wall', C.x0 - 0.3, 0, zz - 0.25, C.x1 + 0.3, 1.0, zz + 0.25, { col: true });
      k.bmm('stone_trim', C.x0 - 0.4, 1.0, zz - 0.32, C.x1 + 0.4, 1.12, zz + 0.32, { cast: false });
    }
    anchors[name] = anchor(0, 0, (z0 + z1) / 2, YAW_N);
  };
  bridge(P.southBridge.z0, P.southBridge.z1, 'southBridge');
  bridge(P.seamBridge.z0, P.seamBridge.z1, 'seamBridge');
  // the sluice wheel on the seam bridge
  k.push(0, 0, P.seamBridge.z1 - 0.1, 0);
  k.box('iron', 0, 1.5, 0.0, 0.18, 1.0, 0.18, { cast: false });
  k.add('iron', new THREE.TorusGeometry(0.62, 0.05, 6, 18), { y: 1.95, z: 0.14 }, { cast: false });
  for (let i = 0; i < 4; i++) k.box('iron', 0, 1.95, 0.14, 0.05, 1.2, 0.05, { rz: (i * Math.PI) / 4, cast: false });
  k.pop();

  // ================================================================ south end: the arcade over the canal
  k.push(0, 0, 16.5, 0);
  archway(k, 'stone_wall', 0, Y.canal, 0, 0, 8, 2.8, 5, 'segmental', 1.4, 0.6, false);
  k.bmm('stone_wall', -22, 0, -2.5, -4.6, 7.5, 2.5);
  k.bmm('stone_wall', 4.6, 0, -2.5, 22, 7.5, 2.5);
  k.bmm('stone_wall', -4.8, 1.2, -2.5, 4.8, 7.5, 2.5);
  for (let i = -3; i <= 3; i++) if (i !== 0) archway(k, 'stone_trim', i * 5.6, 0, 2.55, 0, 3.2, 3.2, 0.2, 'round', 0.6, 0.4, false);
  // houses on top of the arcade (the city continues south)
  for (let i = 0; i < 5; i++) house(k, -16 + i * 8, 7.5, 1.5, YAW_N, { w: 7.4, d: 5, storeys: 2, lit: 0.35, seed: 900 + i, detail: 'low' });
  k.pop();
  bound(k, -21, 13.9, 21, 13.9, 0, 6);
  bound(k, -4, 13.9, 4, 13.9, Y.canal, 4);

  // ================================================================ west quay: the prosperous history
  const houseZ = [9.6, 2.2, -5.2, -12.6, -20, -27.4, -34.8, -42.2, -49.6, -56.2];
  houseZ.forEach((z, i) => {
    house(k, P.westQuay.x0, 0, z, YAW_E, {
      w: 7.2, d: 8, storeys: i % 3 === 1 ? 4 : 3, stoneBase: true, stone: i % 4 === 2, lit: 0.62, shop: i % 2 === 0, sign: i % 3 !== 2,
      chimneys: 1 + (i % 2), seed: 310 + i, roof: i % 2 ? 'front' : 'side',
    });
  });
  bound(k, P.westQuay.x0, P.marketZ.z0, P.westQuay.x0, P.marketZ.z1, 0, 6);
  // bracket lanterns on the house fronts (lit; the prosperous side is lamp-lit)
  for (const z of [6, -8.8, -23.7, -38.5]) bracketLantern(k, P.westQuay.x0 + 0.2, 3.2, z, YAW_E);
  // lamp posts along the canal edge
  const lampPost = (x: number, z: number) => {
    k.add('iron', cyl(0.07, 0.1, 3.4, 8), { x, y: 0, z });
    k.box('iron', x, 3.4, z, 0.08, 0.08, 0.8, { cast: false });
    lantern(k, x, 3.0, z + 0.35);
    k.solid(x - 0.15, 0, z - 0.15, x + 0.15, 3, z + 0.15);
  };
  for (const z of [8, -14, -36]) lampPost(-4.8, z);
  k.light(0xffb468, 7, 11, -4.8, 3.0, 8.35, 0.4);
  k.light(0xffb468, 7, 11, -4.8, 3.0, -13.65, 0.4);
  k.light(0xffb468, 7, 11, -4.8, 3.0, -35.65, 0.4);
  k.light(0xffa860, 5, 9, -19.6, 3.0, -23.7, 0.5);

  // gilt stalls (their twins stand empty across the water)
  const STALL_Z = [-1.5, -17, -41];
  STALL_Z.forEach((z, i) => giltStall(k, -12, z, YAW_E, i));
  // loot: a merchant's strongbox pile (one of them breathes)
  strongbox(k, -15.6, 0, -19.9, 0.2, 1.1);
  strongbox(k, -16.4, 0, -18.7, -0.3, 0.9);
  strongbox(k, -15.9, 0.55, -19.7, 0.5, 0.8, false);
  coins(k, -15.2, 0.02, -18.9, 6);
  anchors.chestMarket = anchor(-14.6, 0, -21.6, 0); // the real chest (piece built by the region builder)
  enemies.push({ id: 'tr_m_mimic1', kind: 'tr_mimic', anchor: anchor(-16.3, 0, -16.2, YAW_E), idleAnim: 'sentryWall', leash: 12 });
  // barrels, crates, a scale-seller's table, laundry between the upper storeys
  crateStack(k, -18.6, 0, 1.5, 0.2);
  barrel(k, -18.9, 0, -6.3, 0, true); barrel(k, -18.2, 0, -7.1, 0.4, true);
  table(k, -17.8, 0, -30.4, YAW_E, 1.6, 0.8, 0.8, true);
  scales(k, -17.8, 0.82, -30.2, 0.3);
  coins(k, -17.6, 0.82, -30.8, 5);
  crate(k, -18.8, 0, -44.4, 0.3, 0.8, true);
  sack(k, -18.4, 0, -43.2, 0.5); sack(k, -18.9, 0, -42.5, 1.2);
  laundryLine(k, [-20, 7, -10.5], [-4.5, 6.2, -10.5], 6);
  // flower boxes and gilt signage on the prosperous side
  for (const z of [4.5, -16.2, -31.2]) k.box('gold_trim', P.westQuay.x0 + 0.08, 4.2, z, 0.06, 0.55, 1.4, { cast: false });

  // ================================================================ east quay: the famine history
  const eastHouse = [
    { burned: false, lit: 0.0 }, { burned: true }, { burned: false, lit: 0.05 }, { burned: true }, { burned: true },
    { burned: false, lit: 0.0 }, { burned: true }, { burned: false, lit: 0.0 },
  ];
  const ez = [9.6, 1.6, -6.4, -14.4, -22.4, -30.4, -38.4, -46.4];
  ez.forEach((z, i) => {
    const h = eastHouse[i];
    house(k, P.eastQuay.x1, 0, z, YAW_W, { w: 7.6, d: 8, storeys: 3, stoneBase: true, burned: !!h.burned, lit: h.lit ?? 0, shop: true, chimneys: 1, seed: 420 + i, roof: i % 2 ? 'side' : 'front' });
  });
  bound(k, P.eastQuay.x1, P.marketZ.z0, P.eastQuay.x1, P.marketZ.z1, 0, 6);
  // boarded windows and doors on the dark houses
  for (const [z, y] of [[9.6, 1.4], [-6.4, 4.2], [-30.4, 1.4], [-30.4, 4.2], [-46.4, 1.4]] as const) {
    for (let j = 0; j < 3; j++) k.box('planks', P.eastQuay.x1 - 0.3, y + j * 0.28 - 0.3, z + k.rng.range(-0.2, 0.2), 0.05, 0.18, 1.5, { rx: k.rng.range(-0.15, 0.15), cast: false });
  }
  // empty stalls (the twins of the gilt ones)
  STALL_Z.forEach((z, i) => emptyStall(k, 12, z, YAW_W, i));
  // collapse and rubble
  rubble(k, 17.5, 0, -14.8, 1.6, true, true);
  fallenBeam(k, [16.4, 0.1, -12.8], [19.2, 2.4, -16.2], 0.24);
  rubble(k, 18.1, 0, -37.2, 1.3, true, true);
  // the woodpile (a woodsman's axe left in it) and the family's hearth
  for (let i = 0; i < 9; i++) k.add('timber_dark', cyl(0.12, 0.12, 1.3, 6), { x: 18.6, y: 0.14 + Math.floor(i / 3) * 0.24, z: -32.4 + (i % 3) * 0.26 - (Math.floor(i / 3) % 2) * 0.13, rx: Math.PI / 2 }, { cast: false });
  k.solid(18.1, 0, -33, 19.3, 0.8, -31.4, 'wood');
  anchors.woodpile = anchor(17.4, 0, -31.7, YAW_E);
  brazier(k, 13.9, 0, -9.2, true, 0.7);
  k.light(0xff8a40, 4.5, 8, 13.9, 1.3, -9.2, 0.9);
  anchors.mother = anchor(15.1, 0, -10.3, -2.1);
  anchors.child = anchor(14.3, 0, -11.2, -1.5);
  anchors.resinDoor = anchor(18.3, 0, 1.6, YAW_E);
  // the muster soldier's corner: a burned doorway, a helmet on a crate
  anchors.musterSoldier = anchor(18.5, 0, -24.8, YAW_W);
  crate(k, 18.6, 0, -24.8, 0, 0.55, true);
  k.add('iron_rusted', sphere(0.17, 8, 5), { x: 18.7, y: 0.1, z: -23.7, s: [1, 0.7, 1] }, { cast: false });
  // bowls and a stake-and-rope queue: the bread line along the hall and down the ghats
  for (let i = 0; i < 8; i++) {
    const x = 7 + i * 1.5, z = -48.7;
    k.add('timber_dark', cyl(0.04, 0.05, 1.0, 6), { x, y: 0, z }, { cast: false });
    if (i < 7) k.add('rope', cyl(0.012, 0.012, 1.5, 4), { x: x + 0.75, y: 0.9, z, rz: Math.PI / 2 }, { cast: false });
  }
  for (let i = 0; i < 9; i++) k.add('planks', cyl(0.13, 0.08, 0.07, 8), { x: 6 + k.rng.range(0, 12), y: 0.01, z: -49.6 + k.rng.range(-0.6, 0.6) }, { cast: false });
  // a tally board: the famine's arithmetic chalked on slate
  k.box('timber_dark', 15.4, 1.4, -59.6, 2.6, 1.8, 0.12);
  k.box('stone_dark', 15.4, 1.45, -59.52, 2.3, 1.5, 0.05, { cast: false });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) k.box('plaster', 14.5 + j * 0.26, 1.9 - i * 0.2, -59.48, 0.02, 0.12, 0.01, { cast: false });
  anchors.tallyBoard = anchor(15.4, 0, -58.2, YAW_N);
  // enemies: the starving militia (in groups), the bread line, a collector on the seam bridge
  enemies.push(
    { id: 'tr_m_mil1', kind: 'tr_militia', anchor: anchor(11.2, 0, -8.6, 2.6), leash: 16 },
    { id: 'tr_m_mil2', kind: 'tr_militiaFork', anchor: anchor(9.6, 0, -11.4, 2.2), leash: 16 },
    { id: 'tr_m_mil3', kind: 'tr_militia', anchor: anchor(12.8, 0, -12.4, 3.0), leash: 16 },
    { id: 'tr_m_col1', kind: 'tr_collector', anchor: anchor(-8, 0, -30.2, YAW_E), patrol: [V(-11, 0, -30.2), V(11, 0, -30.2)], leash: 18 },
    { id: 'tr_m_mil4', kind: 'tr_militia', anchor: anchor(9.4, 0, -47.8, YAW_N), leash: 14 },
    { id: 'tr_m_mil5', kind: 'tr_militiaFork', anchor: anchor(12.6, 0, -47.6, YAW_N), leash: 14 },
    { id: 'tr_m_mil6', kind: 'tr_militia', anchor: anchor(7.2, -1.6, -53.6, YAW_E), leash: 14 },
    { id: 'tr_m_mil7', kind: 'tr_militiaFork', anchor: anchor(1.2, Y.canal, -40.5, YAW_S), leash: 14 },
    { id: 'tr_m_mil8', kind: 'tr_militia', anchor: anchor(-1.4, Y.canal, -44.5, 0.6), leash: 14 },
  );

  // ================================================================ the Hall of Weights: facade, balcony, gate
  const H = P.hall;
  // facade (south face) with the culvert arch and the weigh-gate
  wall(k, 'stone_wall', H.x0, H.z1, H.x1, H.z1, 0, H.eaves, 1.2, {
    openings: [
      { u: (P.weighGate.x0 + P.weighGate.x1) / 2 - (H.x0 + H.x1) / 2, w: P.weighGate.x1 - P.weighGate.x0, sill: 0, h: 3.6, kind: 'round' },
      // tall windows of the banquet hall above the balcony
      ...[-20, -8, 2, 12].map((x) => ({ u: x - (H.x0 + H.x1) / 2, w: 1.6, sill: 6.0, h: 2.4, kind: 'pointed' as const })),
    ],
  });
  for (const x of [-20, -8, 2, 12]) k.box('window_warm', x, 7.8, H.z1 - 0.2, 1.5, 3.6, 0.08, { cast: false });
  // culvert arch below the facade (the dry canal runs under the Hall)
  k.bmm('stone_dark', C.x0 - 0.8, Y.canal, H.z1 - 0.6, C.x0, 0, H.z1 + 0.6, { col: true });
  k.bmm('stone_dark', C.x1, Y.canal, H.z1 - 0.6, C.x1 + 0.8, 0, H.z1 + 0.6, { col: true });
  k.bmm('stone_trim', C.x0 - 0.9, P.culvert.ceil - 0.05, H.z1 - 0.7, C.x1 + 0.9, 0.05, H.z1 + 0.7, { cast: false });
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (i + 0.5) / 7;
    k.box('stone_trim', Math.cos(a) * -3.8, P.culvert.ceil - 0.4 + Math.sin(a) * 0.5, H.z1 + 0.62, 1.2, 0.3, 0.1, { rz: -Math.cos(a) * 0.3, cast: false });
  }
  // string courses, buttresses, a gilded weighing-beam relief over the gate
  k.bmm('stone_trim', H.x0 - 0.2, 4.6, H.z1 - 0.2, H.x1 + 0.2, 4.9, H.z1 + 0.75, { cast: false });
  k.bmm('stone_trim', H.x0 - 0.2, H.eaves - 0.4, H.z1 - 0.2, H.x1 + 0.2, H.eaves, H.z1 + 0.7, { cast: false });
  for (const x of [H.x0, -24, -10, 7, H.x1]) k.bmm('stone_wall', x - 0.7, 0, H.z1, x + 0.7, H.eaves - 0.5, H.z1 + 1.1);
  k.box('gold_trim', -14, 4.3, H.z1 + 0.66, 3.2, 0.1, 0.1, { cast: false });
  k.add('gold_trim', cyl(0.3, 0.45, 0.14, 12), { x: -15.5, y: 3.8, z: H.z1 + 0.66 }, { cast: false });
  k.add('gold_trim', cyl(0.3, 0.45, 0.14, 12), { x: -12.5, y: 3.8, z: H.z1 + 0.66 }, { cast: false });
  // side and back walls + roof (seen from the market and from the tower yard)
  wall(k, 'stone_wall', H.x0, H.z0, H.x0, H.z1, 0, H.eaves, 1.2);
  wall(k, 'stone_wall', H.x1, H.z0, H.x1, H.z1, 0, H.eaves, 1.2);
  wall(k, 'stone_wall', H.x0, H.z0, H.x1, H.z0, 0, H.eaves, 1.2);
  gableRoof(k, (H.x0 + H.x1) / 2, H.eaves, (H.z0 + H.z1) / 2, Math.PI / 2, H.z1 - H.z0 + 1.2, H.x1 - H.x0 + 1.2, { gableMat: 'stone_wall', pitch: 0.55 });
  for (const x of [-18, 0, 14]) k.bmm('stone_dark', x - 0.6, H.eaves + 2, -71, x + 0.6, H.eaves + 7.5, -69.8);
  // the weigh-gate portcullis (opened from inside → shortcut)
  const weighGate = portcullis(ctx, 'tr:weighGate', (P.weighGate.x0 + P.weighGate.x1) / 2, 0, H.z1 - 0.1, 0, 3.8, 3.7, -1.3);

  // balcony: slab, corbels, balustrade (broken at the east end), stair from the west quay
  const B = P.balcony;
  k.solid(B.x0, B.y - 0.4, B.z0, B.x1, B.y, B.z1);
  k.bmm('flagstone', B.x0, B.y - 0.25, B.z0, B.x1, B.y, B.z1, { cast: false });
  k.bmm('stone_wall', B.x0, B.y - 0.7, B.z0, B.x1, B.y - 0.25, B.z1);
  for (let x = B.x0 + 1; x <= B.x1 - 0.5; x += 3.3) {
    k.add('stone_trim', new THREE.CylinderGeometry(0.3, 0.05, 1.3, 6), { x, y: B.y - 1.25, z: B.z1 - 0.35 }, { cast: false });
  }
  // columns under the balcony where it crosses the canal
  for (const x of [C.x0 + 0.6, C.x1 - 0.6]) { k.add('stone_wall', cyl(0.35, 0.4, B.y + 3.2, 10), { x, y: Y.canal, z: B.z1 - 0.6 }); k.solid(x - 0.4, Y.canal, B.z1 - 1, x + 0.4, B.y - 0.4, B.z1 - 0.2); }
  // balustrade: posts and rail; the easternmost bays have fallen (a drop to the east quay)
  for (let x = B.x0 + 2.4; x < B.x1; x += 0.45) {
    if (x > 11.8) break;
    k.add('stone_trim', cyl(0.07, 0.09, 0.85, 6), { x, y: B.y, z: B.z1 - 0.15 }, { cast: false });
  }
  k.bmm('stone_trim', B.x0 + 2.2, B.y + 0.85, B.z1 - 0.3, 12, B.y + 1.0, B.z1, { cast: false });
  k.solid(B.x0 + 2.2, B.y, B.z1 - 0.3, 12, B.y + 1.2, B.z1);
  rubble(k, 14.4, 0, -55.4, 1.0, false, false);
  k.solid(B.x1 - 0.2, B.y, B.z0, B.x1, B.y + 1.2, B.z1);
  const BS = P.balconyStair;
  stairs(k, 'stone_wall', [BS.x, 0, BS.zBot], [BS.x, B.y, BS.zTop], BS.w, { baseY: 0 });
  k.bmm('stone_trim', BS.x + BS.w / 2, 0, BS.zTop, BS.x + BS.w / 2 + 0.2, B.y + 1, BS.zBot, { cast: false });
  k.ramp([BS.x, 0, BS.zBot], [BS.x, B.y, BS.zTop], BS.w);
  wall(k, 'stone_trim', BS.x + BS.w / 2 + 0.1, BS.zBot + 2, BS.x + BS.w / 2 + 0.1, BS.zTop, 0, B.y + 1.1, 0.2, { noVis: true });
  // the banquet: a long table laid with gilt plate while the bread line waits below
  table(k, -6.5, B.y, -58.6, 0, 9, 1.1, 0.82, true, 'timber_dark');
  k.bmm('cloth_red', -11.1, B.y + 0.82, -59.2, -1.9, B.y + 0.85, -58, { cast: false });
  for (let i = 0; i < 8; i++) {
    const x = -10.4 + i * 1.12;
    k.add('gold_trim', cyl(0.17, 0.13, 0.03, 12), { x, y: B.y + 0.86, z: -58.35 }, { cast: false });
    k.add('gold_trim', cyl(0.04, 0.03, 0.2, 8), { x: x + 0.3, y: B.y + 0.86, z: -58.8 }, { cast: false });
    if (i % 2 === 0) chair(k, x, B.y, -59.5, 0);
  }
  k.add('bronze', sphere(0.32, 10, 6), { x: -6.5, y: B.y + 1.0, z: -58.6, s: [1.3, 0.6, 0.9] }, { cast: false });
  candelabrum(k, -9, B.y + 0.85, -58.9, 5);
  candelabrum(k, -4, B.y + 0.85, -58.9, 5);
  k.light(0xffc070, 8, 12, -6.5, B.y + 1.6, -58.4, 0.5);
  anchors.banquet = anchor(-7.8, B.y, -57.3, YAW_N);
  anchors.balconyPurse = anchor(9.8, B.y, -59.2, YAW_N);
  strongbox(k, 10.2, B.y, -59.5, 0, 0.7, false);
  enemies.push(
    { id: 'tr_m_warden1', kind: 'tr_warden', anchor: anchor(6.4, B.y, -58.2, YAW_S), leash: 6 },
    { id: 'tr_m_mil9', kind: 'tr_militia', anchor: anchor(-3.6, B.y, -57.7, 0.3), leash: 10 },
    { id: 'tr_m_mil10', kind: 'tr_militiaFork', anchor: anchor(-11.8, B.y, -57.6, -0.4), leash: 10 },
  );

  // ================================================================ skyline beyond the quays
  const far = newKit(ctx, 'market-far', 333);
  skylineRing(far, 0, -30, 60, 110, -0.2, Math.PI * 1.2, Math.round(80 * ctx.shared.detail), -2, 77, 0.08);
  skylineRing(far, 0, -30, 45, 70, Math.PI * 1.25, Math.PI * 1.75, Math.round(30 * ctx.shared.detail), -2, 78, 0.05);
  spireTower(far, -64, -2, -96, 8, 30, 18);
  spireTower(far, 70, -2, -70, 7, 24, 14, 'stone_wall');
  // east and west rooftops just behind the quay houses (fill the gaps)
  for (let i = 0; i < 9; i++) {
    house(far, -31 - (i % 2) * 3, 0, 10 - i * 8.2, YAW_E, { w: 7.8, d: 7, storeys: 3 + (i % 2), detail: 'far', seed: 700 + i });
    house(far, 31 + (i % 2) * 3, 0, 10 - i * 8.2, YAW_W, { w: 7.8, d: 7, storeys: 3, detail: 'far', burned: i % 2 === 0, seed: 720 + i });
  }

  // ================================================================ entry Stillbell, toll post
  const shrine = stillbellShrine(k, 13.2, 0, 12.1, YAW_N, 7);
  bellPost(k, 5.2, 0, -26.2, YAW_W);
  const tollPost = {
    id: 'tr_seam', pos: V(5.2, 0, -26.2), radius: 7,
    options: [
      { id: 'north', toward: V(8, 0, -52) },
      { id: 'west', toward: V(-18.7, 0, -47) },
      { id: 'south', toward: V(13, 0, 8) },
    ],
  };
  // smoke from the famine hearth and chimneys on the lit side
  const smoke = new PuffField([
    { pos: V(13.9, 1.1, -9.2), height: 7, size0: 0.5, size1: 2.6, count: 10, life: 7, drift: V(1.5, 0, -2), spread: 0.3 },
    { pos: V(-27, 14, -12.6), height: 10, size0: 1.2, size1: 4, count: 8, life: 9, drift: V(3, 0, -2) },
    { pos: V(-27, 14, -34.8), height: 10, size0: 1.2, size1: 4, count: 8, life: 9, drift: V(3, 0, -2) },
    { pos: V(18, 3, -38.4), height: 12, size0: 1.5, size1: 5, count: 8, life: 10, drift: V(2, 0, -3), spread: 2 },
  ], { color: 0x6a6660, opacity: 0.32, baseColor: 0x8a7a6a }, 31);
  ctx.root.add(smoke.mesh);

  // ================================================================ the other history (gilded overlay)
  const overlay = buildOverlay(ctx, STALL_Z);
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = { weighGate };
  anchors.weighGateOut = weighGate.anchor;
  anchors.twinStalls = anchor(-9.9, 0, -17, YAW_W);
  anchors.breadLine = anchor(9.5, 0, -51.2, YAW_N);
  anchors.dryCanal = anchor(2.6, 0, -34.5, YAW_N);

  return {
    shrine,
    playerStart: anchor(12.4, 0, 7.4, YAW_N),
    enemies, anchors, pieces, tollPost, smoke, overlay,
    update(time: number) { (overlay as unknown as { tick: (t: number) => void }).tick(time); },
  };
}

// ------------------------------------------------------------------ stalls

/** A merchant's stall laid with gilt goods under a red awning, lantern hung from the ridge. */
function giltStall(k: Kit, x: number, z: number, yaw: number, i: number) {
  k.push(x, 0, z, yaw);
  stallFrame(k, i % 2 ? 'cloth_blue' : 'cloth_red', false);
  // goods: gold plate, cups, bread loaves, a bolt of cloth, a strongbox
  for (let j = 0; j < 5; j++) k.add('gold_trim', cyl(0.14, 0.11, 0.03, 12), { x: -0.9 + j * 0.45, y: 0.96, z: 0.35 }, { cast: false });
  for (let j = 0; j < 4; j++) k.add('gold_trim', cyl(0.05, 0.035, 0.16, 8), { x: -0.8 + j * 0.5, y: 0.96, z: -0.05 }, { cast: false });
  for (let j = 0; j < 4; j++) k.add('bone', sphere(0.12, 8, 5), { x: 0.9 - j * 0.24, y: 1.02, z: -0.3, s: [1.4, 0.8, 0.9] }, { cast: false });
  k.add('cloth_red', cyl(0.14, 0.14, 1.1, 10), { x: -0.5, y: 1.08, z: -0.35, rz: Math.PI / 2 }, { cast: false });
  strongbox(k, 1.55, 0, 0.6, 0.3, 0.7, false);
  coins(k, 0.3, 0.96, 0.1, 5);
  lantern(k, 0, 2.05, 0.95);
  k.pop();
}

/** The same stall in the famine history: torn awning, bare boards, one bowl. */
function emptyStall(k: Kit, x: number, z: number, yaw: number, i: number) {
  k.push(x, 0, z, yaw);
  stallFrame(k, 'cloth_brown', true);
  k.add('planks', cyl(0.13, 0.08, 0.07, 8), { x: 0.3 * (i - 1), y: 0.96, z: 0.2 }, { cast: false });
  if (i === 1) { k.box('planks', 0.8, 0.45, 0.2, 1.1, 0.08, 1.1, { rz: 0.35, cast: false }); }
  bucket(k, 1.5, 0, 0.6, 'planks', null);
  k.pop();
}

function stallFrame(k: Kit, cloth: MaterialId, torn: boolean) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('timber_dark', sx * 1.2, sz > 0 ? 1.0 : 1.2, sz * 0.7, 0.1, sz > 0 ? 2.0 : 2.4, 0.1, { cast: false });
  k.box('planks', 0, 0.9, 0.1, 2.4, 0.08, 1.2, { cast: false });
  if (!torn) {
    k.box(cloth, 0, 2.2, 0, 2.7, 0.04, 1.8, { rx: 0.18 });
    k.box(cloth, 0, 1.95, 0.9, 2.7, 0.45, 0.03, { cast: false });
  } else {
    // ribbons of a rotted awning, sagging
    for (let j = 0; j < 5; j++) k.box(cloth, -1.1 + j * 0.55, 2.1 - (j % 2) * 0.25, 0.1, 0.35, 0.03, 1.4 - (j % 3) * 0.35, { rx: 0.3 + (j % 2) * 0.3, rz: (j - 2) * 0.05 });
    k.box(cloth, 0.4, 1.7, 0.9, 0.6, 0.9, 0.03, { rz: 0.2, cast: false });
  }
  k.solid(-1.3, 0, -0.8, 1.3, 1.2, 0.8, 'wood');
}

// ------------------------------------------------------------------ overlay

/**
 * The prosperous history bleeding through on the famine quay: translucent gold ghosts of the gilt
 * goods over the empty stalls and of a banquet over the bread line. They breathe in and out of
 * phase with the stall that is really there. set(1) = gone (the Treasury bell is silent).
 */
function buildOverlay(ctx: AreaCtx, stallZ: number[]): DynamicPiece & { tick(t: number): void } {
  const root = new THREE.Group();
  root.name = 'tr:historyOverlay';
  ctx.dynamicRoot.add(root);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.renderOrder = 6; root.add(m); };
  for (const z of stallZ) {
    // awning and goods where the empty stall stands (x = 12, facing west)
    add(new THREE.BoxGeometry(1.8, 0.04, 2.7).rotateZ(-0.18), 12, 2.2, z);
    for (let j = 0; j < 5; j++) add(new THREE.CylinderGeometry(0.14, 0.11, 0.03, 10), 11.65, 0.97, z + 0.9 - j * 0.45);
    for (let j = 0; j < 4; j++) add(new THREE.CylinderGeometry(0.05, 0.035, 0.16, 8), 12.05, 1.04, z + 0.8 - j * 0.5);
  }
  // a ghost of the banquet laid over the bread line
  add(new THREE.BoxGeometry(6, 0.06, 1.0), 10.5, 0.8, -49.6);
  for (let j = 0; j < 7; j++) add(new THREE.CylinderGeometry(0.16, 0.12, 0.03, 10), 7.8 + j * 0.9, 0.84, -49.6);
  let gone = 0;
  const piece = {
    object: root,
    set(t: number) { gone = Math.min(1, Math.max(0, t)); root.visible = gone < 0.999; mat.opacity = 0.1 * (1 - gone); },
    tick(time: number) {
      if (!root.visible) return;
      const breath = 0.5 + 0.5 * Math.sin(time * 0.55) * Math.sin(time * 0.21 + 1.3);
      mat.opacity = (0.02 + 0.14 * breath * breath) * (1 - gone);
    },
  };
  piece.set(0);
  return piece;
}
