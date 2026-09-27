/**
 * Hospice of the Quiet Hour (y=3): x ∈ [25, 41], z ∈ [-125, -99], entered from the courtyard's
 * east wall at z=-112. A tall nave with cots and curtains, the Hospice Stillbell on a dais at the
 * east end, Hesper's forge in the north-west lean-to, a storeroom, the alternate-gear rack, and a
 * walled practice yard (x ∈ [41, 55]) with 3 straw dummies and 7 instruction plaques.
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import {
  wall, floor, gableRoof, shedRoof, cot, table, bench, candles, candelabrum, forge, anvil, bellows, weaponRack,
  armourStand, barrel, crate, sack, shelves, trainingDummy, plaque, stillbellShrine, bucket, trough, wallBanner,
  crenellation, buttress, cyl, rubble, hay, type StillbellShrine,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, YAW_N, YAW_S, YAW_W } from './common';

export interface HospiceBuild {
  shrine: StillbellShrine;
  oswinHospice: Anchor;
  hesper: Anchor;
  forge: Anchor;
  gearRack: Anchor;
  practicePlaques: { topic: string; anchor: Anchor }[];
  practiceDummies: Anchor[];
}

export function buildHospice(ctx: AreaCtx): HospiceBuild {
  const k = newKit(ctx, 'hospice', 61);
  const Y = 3;
  const x0 = 25, x1 = 41, z0 = -125, z1 = -99;
  const nZ0 = -116, nZ1 = -100;      // nave interior (z)
  const ix1 = 40;                    // interior east face
  const naveH = 9;

  // ---------------------------------------------------------------- floor
  floor(k, 'flagstone', x0 - 0.1, z0 + 1, ix1, z1 - 1, Y, 0.6);
  k.bmm('stone_dark', x0, -1, z0, x1, Y - 0.6, z1, { cast: false, receive: false });

  // ---------------------------------------------------------------- outer walls
  // south wall with three tall lancet windows (warm glass)
  const lancets = [28.5, 32.5, 36.5];
  wall(k, 'stone_wall', x0, z1 - 0.5, x1, z1 - 0.5, 0, Y + naveH, 1.0, {
    openings: lancets.map((x) => ({ u: x - 33, w: 1.2, sill: Y + 2.2, h: 3.4, kind: 'pointed' as const, rise: 1.2 })),
  });
  for (const x of lancets) {
    k.box('window_warm', x, Y + 2.2 + 2.3, z1 - 0.45, 1.2, 4.6, 0.05, { cast: false });
    k.box('timber_dark', x, Y + 2.2 + 2.3, z1 - 0.4, 0.06, 4.6, 0.06, { cast: false });
  }
  // east wall with the yard door (z ∈ [-115.4, -113.2]) and a rose window above the dais
  wall(k, 'stone_wall', x1 - 0.5, z0, x1 - 0.5, z1, 0, Y + naveH, 1.0, {
    openings: [
      { u: -114.3 - (-112), w: 2.2, sill: Y, h: 2.6, kind: 'round' },
      { u: -108 - (-112), w: 1.6, sill: Y + 5.4, h: 0.9, kind: 'round' },
    ],
  });
  k.add('window_warm', cyl(0.78, 0.78, 0.05, 14), { x: x1 - 0.45, y: Y + 6.3 + 0.1, z: -108, rz: Math.PI / 2 }, { cast: false });
  // north wall (lean-to height)
  wall(k, 'stone_wall', x0, z0 + 0.5, x1, z0 + 0.5, 0, Y + 4.5, 1.0);
  // nave north wall: forge arch (x 27–32) and store doorway (x 36–38)
  wall(k, 'stone_wall', x0, nZ0 - 0.6, ix1, nZ0 - 0.6, Y, naveH, 1.2, {
    openings: [{ u: 29.5 - 32.5, w: 5, sill: 0, h: 3.2, kind: 'segmental', rise: 0.9 }, { u: 37 - 32.5, w: 2, sill: 0, h: 2.5, kind: 'round' }],
  });
  // partition between forge and store
  wall(k, 'stone_wall', 34.2, z0 + 1, 34.2, nZ0 - 1.2, Y, 4.5, 0.4);
  // buttresses on the south face
  for (const x of [26.5, 30.5, 34.5, 38.5]) buttress(k, 'stone_wall', x, 0, z1, 0, Y + 7, 1.3, 0.9);
  // gable roof over the nave (ridge along X), lean-to roofs north
  gableRoof(k, 33, Y + naveH, (nZ0 - 1.2 + z1) / 2, Math.PI / 2, z1 - (nZ0 - 1.2), x1 - x0 + 0.4, { pitch: (48 * Math.PI) / 180, gableMat: 'stone_wall', overhang: 0.6, endOverhang: 0.3 });
  shedRoof(k, 33, Y + 7, (z0 + nZ0 - 1.2) / 2, Math.PI, x1 - x0 + 0.6, nZ0 - 1.2 - z0 + 1.4, 2.4);
  k.bmm('timber_dark', x0 + 0.01, Y + 4.5, z0 + 1, ix1, Y + 4.7, nZ0 - 1.2, { cast: false }); // lean-to ceiling
  // bell-cote on the west gable apex (seen from the tower)
  const apexY = Y + naveH + ((z1 - (nZ0 - 1.2)) / 2) * Math.tan((48 * Math.PI) / 180);
  k.bmm('stone_wall', x0 - 0.2, apexY - 1.4, -108.9, x0 + 0.8, apexY + 1.8, -107.3);
  k.add('bronze_bell', cyl(0.12, 0.34, 0.55, 10), { x: x0 + 0.3, y: apexY + 0.2, z: -108.1 }, { cast: false });
  k.add('roof_slate', cyl(0.001, 1.2, 1.2, 4), { x: x0 + 0.3, y: apexY + 1.8, z: -108.1, ry: Math.PI / 4 });
  // roof trusses inside the nave
  for (let x = 27; x < 40; x += 3) {
    k.box('timber_dark', x, Y + naveH - 0.3, (nZ0 + nZ1) / 2, 0.3, 0.35, nZ1 - nZ0 + 1.4, { cast: false });
    k.box('timber_dark', x, Y + naveH + 3, (nZ0 + nZ1) / 2, 0.22, 6, 0.22, { cast: false });
  }
  // chimney from the forge
  k.bmm('stone_trim', 27.2, Y + 12.5, -123.4, 28.4, Y + 12.7, -122.4, { cast: false });

  // ---------------------------------------------------------------- nave furnishings
  const curtainX: number[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = 26.5 + i * 1.9;
    cot(k, cx, Y, -101.25, 0, i === 1 || i === 4);
    curtainX.push(cx + 0.95);
  }
  for (const cx of curtainX.slice(0, 5)) {
    k.box('cloth_linen', cx, Y + 1.4, -101.1, 0.03, 1.9, 1.9, { cast: false, variant: 1 });
    k.box('iron', cx, Y + 2.4, -101.1, 0.03, 0.03, 2.0, { cast: false });
  }
  cot(k, 26.5, Y, -105.4, Math.PI / 2, false);
  cot(k, 26.5, Y, -107.4, Math.PI / 2, true);
  table(k, 32, Y, -108, Math.PI / 2, 3.2, 1.0, 0.8, true);
  candles(k, 32, Y + 0.8, -107.2, 4, 0.15);
  bucket(k, 31.9, Y + 0.8, -108.8, 'planks', 'water');
  bench(k, 30.9, Y, -108, Math.PI / 2, 2.6);
  bench(k, 33.1, Y, -108, -Math.PI / 2, 2.6);
  // dais and the Hospice Stillbell (east end)
  k.bmm('stone_trim', 37.2, Y, -111.2, ix1, Y + 0.28, -104.8, { col: true });
  k.bmm('stone_wall', 37.3, Y + 0.28, -111.1, ix1, Y + 0.3, -104.9, { cast: false });
  const shrine = stillbellShrine(k, 38.8, Y + 0.3, -108, YAW_W, 8);
  shrine.anchor.pos.y = Y; // the resting spot is on the nave floor in front of the dais
  candelabrum(k, 37.6, Y + 0.3, -110.6, 5);
  candelabrum(k, 37.6, Y + 0.3, -105.4, 5);
  wallBanner(k, 39.95, Y + 7.4, -104.5, YAW_W, 1.2, 3.2);
  wallBanner(k, 39.95, Y + 7.4, -111.5, YAW_W, 1.2, 3.2);
  k.light(0xffc27a, 5, 12, 32, Y + 2.2, -107.5, 0.4);

  // ---------------------------------------------------------------- forge lean-to (Hesper)
  const coals = forge(k, 27.8, Y, -122.9, YAW_S, 12.5);
  anvil(k, 30.4, Y, -121.0, 0.4);
  bellows(k, 25.95, Y, -121.4, Math.PI / 2);
  weaponRack(k, 33.7, Y, -120.6, YAW_W, 2.4);
  trough(k, 31.8, Y, -123.5, 0);
  barrel(k, 33.3, Y, -123.6, 0, true);
  k.light(0xff7a30, 10, 12, coals.x, coals.y + 0.6, coals.z + 0.8, 1);
  for (let i = 0; i < 5; i++) k.box('ember_glow', 27.8 + k.rng.range(-0.8, 0.8), Y + 0.01, -121.6 + k.rng.range(-0.4, 0.4), 0.05, 0.02, 0.05, { cast: false });

  // ---------------------------------------------------------------- storeroom & gear rack
  shelves(k, 39.7, Y, -120.6, YAW_W, 3, 2.4);
  crate(k, 35.3, Y, -123.2, 0.2, 0.9, true); crate(k, 36.3, Y, -123.4, 0.5, 0.7, true); sack(k, 37.6, Y, -123.4, 0.4);
  barrel(k, 35.0, Y, -121.6, 0, true);
  // the rack with the other origin's starting gear (in the nave, north wall between the openings)
  weaponRack(k, 33.3, Y, -115.6, YAW_S, 1.6);
  armourStand(k, 35.2, Y, -115.3, YAW_S, 'steel_armor', 'cloth_blue');
  armourStand(k, 32.35, Y, -115.3, YAW_S, 'leather', 'cloth_red');

  // ---------------------------------------------------------------- practice yard (x ∈ [41, 55])
  const yx0 = 41, yx1 = 55, yz0 = -124, yz1 = -100;
  floor(k, 'dirt', yx0 - 0.1, yz0, yx1, yz1, Y, 0.6);
  k.bmm('stone_dark', yx0, -1, yz0 - 0.4, yx1 + 0.4, Y - 0.6, yz1 + 0.4, { cast: false, receive: false });
  wall(k, 'stone_wall', yx0, yz0 - 0.2, yx1 + 0.4, yz0 - 0.2, Y, 2.4, 0.4, { colH: 3.5 });
  wall(k, 'stone_wall', yx1 + 0.2, yz0, yx1 + 0.2, yz1, Y, 2.4, 0.4, { colH: 3.5 });
  wall(k, 'stone_wall', yx0, yz1 + 0.2, yx1 + 0.4, yz1 + 0.2, Y, 2.4, 0.4, { colH: 3.5 });
  crenellation(k, 'stone_wall', yx0, yz0 - 0.2, yx1 + 0.4, yz0 - 0.2, Y + 2.4, 0.4, { base: 0.1, merlonH: 0.6, col: false });
  crenellation(k, 'stone_wall', yx1 + 0.2, yz0, yx1 + 0.2, yz1, Y + 2.4, 0.4, { base: 0.1, merlonH: 0.6, col: false });
  crenellation(k, 'stone_wall', yx0, yz1 + 0.2, yx1 + 0.4, yz1 + 0.2, Y + 2.4, 0.4, { base: 0.1, merlonH: 0.6, col: false });
  // terrace retaining wall below the yard (seen from the town)
  k.bmm('stone_wall', yx0, -2, yz1 + 0.4, yx1 + 0.6, Y, yz1 + 0.9, { cast: false });
  k.bmm('stone_wall', yx1 + 0.4, -2, yz0 - 0.4, yx1 + 0.9, Y, yz1 + 0.9, { cast: false });
  const dummies = [anchor(46.5, Y, -105.5, YAW_W), anchor(50.2, Y, -112, YAW_W), anchor(46.5, Y, -118.5, YAW_W)];
  for (const d of dummies) trainingDummy(k, d.pos.x, Y, d.pos.z, d.yaw);
  hay(k, 42.3, Y, -122.8, 0.3); rubble(k, 53.4, Y, -122.6, 0.6, false);
  const plaqueSpots: [string, number, number, number][] = [
    ['guard', 44, yz1 - 0.6, Math.PI],
    ['parry', 48.5, yz1 - 0.6, Math.PI],
    ['backstab', 53, yz1 - 0.6, Math.PI],
    ['guardBreak', yx1 - 0.6, -106, -Math.PI / 2],
    ['postureBreak', yx1 - 0.6, -112, -Math.PI / 2],
    ['dodge', yx1 - 0.6, -118, -Math.PI / 2],
    ['forememory', 48.5, yz0 + 0.6, 0],
  ];
  const practicePlaques = plaqueSpots.map(([topic, x, z, yaw]) => {
    plaque(k, x, Y, z, yaw);
    // player stands 1.4 m in front of the board, facing it
    return { topic, anchor: anchor(x + Math.sin(yaw) * 1.4, Y, z + Math.cos(yaw) * 1.4, yaw + Math.PI) };
  });

  return {
    shrine,
    oswinHospice: anchor(30.3, Y, -103.3, YAW_S),
    hesper: anchor(30.4, Y, -119.4, YAW_S),
    forge: anchor(coals.x, Y, -121.2, YAW_N),
    gearRack: anchor(33.3, Y, -114.2, YAW_N),
    practicePlaques,
    practiceDummies: dummies,
  };
}

export const HOSPICE_ZONE = new THREE.Box3(new THREE.Vector3(22.1, 2, -125), new THREE.Vector3(55.5, 24, -99));
