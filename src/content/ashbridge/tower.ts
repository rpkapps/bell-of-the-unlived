/**
 * The Watchtower (start + Stillbell), its east ledge (drawbridge landing), the rim path down to
 * the Lower Street, and the ravine between the tower and the garrison.
 *
 * Tower: 11 m square centred (-34, -110), walls 1.3 m. Interior is a ring corridor around a solid
 * 4 m core; the stair climbs one full turn (4 flights + 4 corner landings) from the ground floor
 * (y=3, east door) to the roof (y=14), arriving inside a small caphouse at the NW corner.
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import {
  wall, crenellation, parapet, floor, stairs, towerSolid, pyramidRoof, slit, corbels, stringCourse,
  stillbellShrine, rockFace, rockProp, deadTree, sconceTorch, rubble, barrel, crate, fallenBeam,
  type StillbellShrine,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_E } from './common';

export interface TowerBuild {
  playerStart: Anchor;
  shrine: StillbellShrine;
}

export function buildTower(ctx: AreaCtx): TowerBuild {
  const k = newKit(ctx, 'watchtower', 11);
  const T = PLAN.tower;
  const X0 = T.x - T.half, X1 = T.x + T.half, Z0 = T.z - T.half, Z1 = T.z + T.half; // outer
  const t = T.wallT;
  const iX0 = X0 + t, iX1 = X1 - t, iZ0 = Z0 + t, iZ1 = Z1 - t;                    // interior
  const base = -13, topY = T.top;

  // ---------------------------------------------------------------- shell
  const shellH = topY - 0.5 - base;
  wall(k, 'stone_wall', X0, Z0 + t / 2, X1, Z0 + t / 2, base, shellH, t);          // north
  wall(k, 'stone_wall', X0, Z1 - t / 2, X1, Z1 - t / 2, base, shellH, t);          // south
  wall(k, 'stone_wall', X0 + t / 2, iZ0, X0 + t / 2, iZ1, base, shellH, t);        // west
  // east wall with the ledge door (round arch, 2.2 m wide) at y=3; wall runs north→south so
  // u is measured from the midpoint toward +Z; the door is centred on z = -110 → u = 0.
  wall(k, 'stone_wall', X1 - t / 2, iZ0, X1 - t / 2, iZ1, base, shellH, t, {
    openings: [{ u: 0, w: 2.2, sill: T.door - base, h: 2.6, kind: 'round' }],
  });
  // plinth and string courses
  k.bmm('stone_dark', X0 - 0.4, base, Z0 - 0.4, X1 + 0.4, 1.2, Z1 + 0.4, { col: false });
  for (const y of [3.2, 8.4]) stringCourse(k, X0, Z0, X1, Z1, y);
  // door surround
  k.bmm('stone_trim', X1 - 0.05, 3, T.z - 1.45, X1 + 0.12, 6.0, T.z - 1.1, { cast: false });
  k.bmm('stone_trim', X1 - 0.05, 3, T.z + 1.1, X1 + 0.12, 6.0, T.z + 1.45, { cast: false });
  // arrow slits on every face
  for (const y of [5.5, 9.5, 12]) {
    slit(k, T.x - 2.5, y, Z1, 0); slit(k, T.x + 2.5, y + 0.7, Z1, 0);
    slit(k, T.x - 2.5, y + 0.4, Z0, Math.PI); slit(k, T.x + 2, y, Z0, Math.PI);
    slit(k, X0, y, T.z + 2, -Math.PI / 2); slit(k, X0, y + 0.6, T.z - 2.5, -Math.PI / 2);
    if (y > 6) slit(k, X1, y + 0.3, T.z + 3, Math.PI / 2);
  }
  // corbelled top: the roof platform projects 0.8 m beyond the shell
  const cX0 = X0 - 0.8, cX1 = X1 + 0.8, cZ0 = Z0 - 0.8, cZ1 = Z1 + 0.8;
  corbels(k, 'stone_trim', X0, Z0, X1, Z1, topY - 0.5, 0.8, 1.05);

  // ---------------------------------------------------------------- floors, core, stairs
  floor(k, 'flagstone', iX0, iZ0, iX1, iZ1, T.door, 0.5);
  // solid core pier
  const cx0 = T.x - 2, cx1 = T.x + 2, cz0 = T.z - 2, cz1 = T.z + 2;
  k.bmm('stone_wall', cx0, T.door, cz0, cx1, topY - 0.5, cz1, { col: true });
  const W = iX1 - cx1; // 2.2 ring width
  const levels = [T.door, 5.75, 8.5, 11.25, topY];
  // flight 1: north strip, ground, west → east
  stairs(k, 'stone_wall', [cx0, levels[0], (iZ0 + cz0) / 2], [cx1, levels[1], (iZ0 + cz0) / 2], W, { baseY: T.door });
  // NE landing (solid)
  k.bmm('stone_wall', cx1, T.door, iZ0, iX1, levels[1], cz0, { col: true });
  k.bmm('flagstone', cx1, levels[1] - 0.05, iZ0, iX1, levels[1], cz0, { cast: false });
  // flight 2: east strip, floating, north → south
  stairs(k, 'stone_wall', [(cx1 + iX1) / 2, levels[1], cz0], [(cx1 + iX1) / 2, levels[2], cz1], W, { floating: true });
  floor(k, 'stone_wall', cx1, cz1, iX1, iZ1, levels[2], 0.5);                       // SE landing
  // flight 3: south strip, east → west
  stairs(k, 'stone_wall', [cx1, levels[2], (cz1 + iZ1) / 2], [cx0, levels[3], (cz1 + iZ1) / 2], W, { floating: true });
  floor(k, 'stone_wall', iX0, cz1, cx0, iZ1, levels[3], 0.5);                       // SW landing
  // flight 4: west strip, south → north, arriving at the roof in the caphouse
  stairs(k, 'stone_wall', [(iX0 + cx0) / 2, levels[3], cz1], [(iX0 + cx0) / 2, levels[4], cz0], W, { floating: true });
  // landing supports (corbels under floating landings)
  for (const [x, z, y] of [[iX1 - 0.3, iZ1 - 0.3, levels[2]], [iX0 + 0.3, iZ1 - 0.3, levels[3]]] as const) k.box('stone_trim', x, y - 0.9, z, 0.6, 0.9, 0.6, { cast: false });
  sconceTorch(k, iX1 - 0.02, T.door + 2.1, cz1 + 1.2, -Math.PI / 2);
  k.light(0xffa860, 4, 8, iX1 - 0.8, T.door + 2.3, cz1 + 1.2, 0.8);
  barrel(k, iX0 + 0.5, T.door, iZ1 - 0.6); crate(k, iX0 + 0.5, T.door, iZ1 - 1.6, 0.3, 0.7);

  // ---------------------------------------------------------------- roof platform
  // slab with an opening over flight 4 (x ∈ [iX0, cx0-0.2], z ∈ [cz0, cz1])
  const oX1 = cx0 - 0.2;
  const topMat = 'flagstone';
  floor(k, topMat, cX0, cZ0, cX1, cz0, topY, 0.5);          // north band (includes NW landing)
  floor(k, topMat, cX0, cz1, cX1, cZ1, topY, 0.5);          // south band
  floor(k, topMat, oX1, cz0, cX1, cz1, topY, 0.5);          // east of the opening
  floor(k, topMat, cX0, cz0, iX0, cz1, topY, 0.5);          // west of the opening
  // corbel table mass: the ring outside the shell under the projecting platform
  k.bmm('stone_wall', cX0, topY - 1.2, cZ0, cX1, topY - 0.5, Z0, { receive: false });
  k.bmm('stone_wall', cX0, topY - 1.2, Z1, cX1, topY - 0.5, cZ1, { receive: false });
  k.bmm('stone_wall', cX0, topY - 1.2, Z0, X0, topY - 0.5, Z1, { receive: false });
  k.bmm('stone_wall', X1, topY - 1.2, Z0, cX1, topY - 0.5, Z1, { receive: false });
  // crenellated parapet around the roof (colliders to 1.8 m)
  const pt = 0.6;
  crenellation(k, 'stone_wall', cX0, cZ0 + pt / 2, cX1, cZ0 + pt / 2, topY, pt);
  crenellation(k, 'stone_wall', cX0, cZ1 - pt / 2, cX1, cZ1 - pt / 2, topY, pt);
  crenellation(k, 'stone_wall', cX0 + pt / 2, cZ0 + pt, cX0 + pt / 2, cZ1 - pt, topY, pt);
  // east side: crenellations either side of a projecting balcony (the overlook)
  const bz0 = T.z - 3.0, bz1 = T.z + 3.0, bx1 = cX1 + 2.4;
  crenellation(k, 'stone_wall', cX1 - pt / 2, cZ0 + pt, cX1 - pt / 2, bz0, topY, pt);
  crenellation(k, 'stone_wall', cX1 - pt / 2, bz1, cX1 - pt / 2, cZ1 - pt, topY, pt);
  floor(k, 'flagstone', cX1 - pt - 0.05, bz0, bx1, bz1, topY, 0.5);
  k.bmm('stone_wall', cX1, topY - 1.3, bz0, bx1, topY - 0.5, bz1, { receive: false });
  for (let i = 0; i < 4; i++) k.box('stone_trim', cX1 + 0.3 + i * 0.5, topY - 1.3 - (3 - i) * 0.35, T.z, 0.5, 0.35 + (3 - i) * 0.1, bz1 - bz0 - 0.4, { cast: false });
  parapet(k, 'stone_wall', bx1 - 0.2, bz0, bx1 - 0.2, bz1, topY, 0.4, 0.85);
  parapet(k, 'stone_wall', cX1 - pt, bz0 + 0.2, bx1, bz0 + 0.2, topY, 0.4, 1.0);
  parapet(k, 'stone_wall', cX1 - pt, bz1 - 0.2, bx1, bz1 - 0.2, topY, 0.4, 1.0);
  // caphouse over the stair head (NW): walls, east door, pyramid roof
  const hX0 = cX0 + pt, hX1 = cx0 + 0.2, hZ0 = cZ0 + pt, hZ1 = cz1 + 0.6, hH = 3.2, ht = 0.4;
  wall(k, 'stone_wall', hX0 + ht / 2, hZ0, hX0 + ht / 2, hZ1, topY, hH, ht);
  wall(k, 'stone_wall', hX0, hZ0 + ht / 2, hX1, hZ0 + ht / 2, topY, hH, ht);
  wall(k, 'stone_wall', hX0, hZ1 - ht / 2, hX1, hZ1 - ht / 2, topY, hH, ht);
  // east wall runs north→south; door centred on z = cz0 - 1.1 (in front of the NW landing)
  const hMid = (hZ0 + hZ1) / 2;
  wall(k, 'stone_wall', hX1 - ht / 2, hZ0, hX1 - ht / 2, hZ1, topY, hH, ht, { openings: [{ u: (cz0 - 1.1) - hMid, w: 2.0, sill: 0, h: 2.2, kind: 'round' }] });
  k.bmm('stone_trim', hX0 - 0.15, topY + hH, hZ0 - 0.15, hX1 + 0.15, topY + hH + 0.25, hZ1 + 0.15, { cast: false });
  pyramidRoof(k, (hX0 + hX1) / 2, topY + hH + 0.25, (hZ0 + hZ1) / 2, hX1 - hX0 + 0.8, hZ1 - hZ0 + 0.8, 4.2);
  k.bmm('timber_dark', hX0 + 0.01, topY + hH, hZ0, hX1, topY + hH + 0.02, hZ1, { cast: false }); // ceiling
  // a flagpole with a tattered banner on the roof (seen from the town)
  k.box('timber_dark', cX0 + 1.2, topY + 3.5, cZ1 - 1.2, 0.12, 7, 0.12);

  // the Watchtower Stillbell stands on the balcony (north side, facing south) — the concept-art
  // foreground: bell shrine at the parapet, the town and gatehouse beyond
  const shrine = stillbellShrine(k, cX1 + 0.9, topY, T.z - 2.0, 0, 7);
  // weathered roof clutter
  rubble(k, cX0 + 1.4, topY, cZ1 - 2.2, 0.7, false);
  crate(k, hX1 + 0.7, topY, hZ1 + 0.9, 0.2, 0.7);

  // ---------------------------------------------------------------- east ledge & drawbridge landing
  const L = PLAN.ledge;
  floor(k, 'flagstone', L.x0 - 0.2, L.z0, L.x1, L.z1, L.y, 0.5);
  k.bmm('stone_dark', L.x0, -12, L.z0, L.x1, L.y - 0.5, L.z1, { cast: true });
  // ravine-side parapet with a gap (z ∈ [-112.4, -107.6]) onto the drawbridge landing pier
  parapet(k, 'stone_wall', L.x1 - 0.2, L.z0, L.x1 - 0.2, -112.4, L.y, 0.4, 1.0);
  parapet(k, 'stone_wall', L.x1 - 0.2, -107.6, L.x1 - 0.2, L.z1, L.y, 0.4, 1.0);
  // landing pier projecting into the ravine (the lowered deck rests on its end)
  const px1 = -23.95;
  floor(k, 'flagstone', L.x1 - 0.3, -112.4, px1, -107.6, L.y, 0.5);
  k.bmm('stone_dark', L.x1 - 0.3, -12, -112.6, px1, L.y - 0.5, -107.4, { cast: true });
  for (let i = 0; i < 3; i++) k.bmm('stone_trim', px1 - 0.1, L.y - 1.6 - i * 0.9, -112.7 + i * 0.1, px1 + 0.3 - i * 0.1, L.y - 0.8 - i * 0.9, -107.3 - i * 0.1, { cast: false });
  parapet(k, 'stone_wall', L.x1 - 0.4, -112.6, px1 + 0.05, -112.6, L.y, 0.4, 1.0);
  parapet(k, 'stone_wall', L.x1 - 0.4, -107.4, px1 + 0.05, -107.4, L.y, 0.4, 1.0);
  // chain posts at the pier end (the drawbridge piece hangs its warning chain between them)
  for (const z of [-112.55, -107.45]) k.bmm('stone_trim', px1 - 0.35, L.y, z - 0.25, px1 + 0.05, L.y + 1.4, z + 0.25, { col: true });
  // north end: rock shoulder closes the ledge
  k.bmm('rock_cliff', L.x0 - 0.5, L.y - 1, L.z0 - 1.6, L.x1 + 0.3, L.y + 5, L.z0 + 0.05, { col: true });
  rockProp(k, L.x0 + 0.5, L.y + 3, L.z0 - 1, 2.6, 5, 1.2);

  // ---------------------------------------------------------------- outcrop & west cliffs
  // the tower stands on a rock outcrop; the rock falls away into the ravine on the east
  k.bmm('rock_cliff', X0 - 8, -12, Z0 - 10, X0 + 1, T.door - 0.2, Z1 + 6, { cast: true });
  for (let i = 0; i < 9; i++) rockProp(k, X1 + 1 + k.rng.range(-1, 1), -12 + i * 1.6, Z0 + (i * 1.7) % 12, k.rng.range(2, 3.4), 40 + i, 0.9);
  rockFace(k, -33.4, -103, -33.4, -34, 0, 9, 3, -1, 3, 'rock_cliff', 2.2); // the cliff west of the rim path
  rockFace(k, -44, -120, -44, -96, 3, 16, 4, -1, 4);               // behind the tower
  rockFace(k, -38, -122, -24, -122, 3, 12, 5, 1, 3);               // north shoulder
  deadTree(k, -33, 9, -60, 6); deadTree(k, -34, 9, -80, 5); deadTree(k, -41, 16, -104, 7);
  k.bmm('rock_cliff', -46, 0, -104, X0 - 0.2, 3, -96, { col: false });
  // bounds: outside the tower on the outcrop (west/north) nothing is walkable
  k.solid(-46, 3, -122.6, -30.5, 20, -116.2);                       // north shoulder
  k.solid(-33, 0, -104.6, -30.1, 12, -34);                          // west cliff of the rim path

  // ---------------------------------------------------------------- rim path (y 3 → 0)
  const R = PLAN.rim;
  const midX = (R.x0 + R.x1) / 2, wR = R.x1 - R.x0;
  k.ramp([midX, 0, R.zBottom], [midX, 3, R.zTop], wR, 0.6, 'dirt');
  {
    const len = R.zTop - R.zBottom, dy = 3, ang = Math.atan2(dy, Math.abs(len));
    const zc = (R.zTop + R.zBottom) / 2;
    k.box('cobble', midX, 1.5 - 0.3, zc, wR + 0.4, 0.6, Math.abs(len) + 0.2, { rx: ang, cast: false });
    k.box('rock_cliff', midX, -6, zc, wR + 1, 11.4, Math.abs(len), { rx: ang, cast: false });
  }
  // ravine parapet along the path (segmented to follow the slope)
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const za = R.zTop + ((R.zBottom + 2 - R.zTop) * i) / segs, zb = R.zTop + ((R.zBottom + 2 - R.zTop) * (i + 1)) / segs;
    const ya = 3 * (1 - (i + 0.5) / segs) - 0.1;
    parapet(k, i % 3 === 1 ? 'stone_dark' : 'stone_wall', R.x1 - 0.25, za + 0.05, R.x1 - 0.25, zb - 0.05, ya, 0.4, 0.95);
  }
  // a collapsed shed and props along the path
  rubble(k, -29, 1.4, -78, 1.2, true);
  fallenBeam(k, [-29.6, 2.3, -80], [-28.2, 1.3, -76.5]);
  barrel(k, -29.4, 0.5, -60, 0.4, true);

  // ---------------------------------------------------------------- ravine
  const RV = PLAN.ravine;
  k.bmm('stone_dark', RV.x0 - 2, RV.floor - 1, RV.z0, RV.x1 + 2, RV.floor, RV.z1 + 1, { cast: false });
  k.solid(RV.x0 - 2, RV.floor - 1, RV.z0, RV.x1 + 2, RV.floor, RV.z1 + 1);
  k.bmm('water', RV.x0 + 4, RV.floor + 0.05, RV.z0, RV.x0 + 6.5, RV.floor + 0.08, RV.z1, { cast: false });
  for (let i = 0; i < 26; i++) rockProp(k, k.rng.range(RV.x0 + 1, RV.x1 - 1), RV.floor + 0.3, k.rng.range(RV.z0 + 2, RV.z1 - 2), k.rng.range(0.6, 1.8), 200 + i, 0.6);
  // ravine walls
  rockFace(k, RV.x0 - 0.5, RV.z1, RV.x0 - 0.5, -118, RV.floor, -0.5, 21, 1, 2.5);
  rockFace(k, RV.x1 + 0.3, -136, RV.x1 + 0.3, RV.z1, RV.floor, 1.5, 22, 1, 2.5);
  rockFace(k, RV.x0, RV.z1 + 0.5, RV.x1, RV.z1 + 0.5, RV.floor, 0.3, 23, -1, 2.5);
  rockFace(k, RV.x0 - 3, RV.z0, RV.x1 + 3, RV.z0, RV.floor, 8, 24, 1, 3);
  // remains of an older footbridge (never walkable)
  for (const [x, dir] of [[RV.x0, 1], [RV.x1, -1]] as const) {
    for (let i = 0; i < 3; i++) fallenBeam(k, [x, -0.2 - i * 0.02, -72 + i * 0.9], [x + dir * (3.5 - i), -0.8 - i * 0.5, -71.8 + i * 0.9], 0.2, 'timber_dark');
    k.box('timber_dark', x + dir * 0.6, -5.5, -71, 0.3, 11, 0.3, { rz: dir * 0.15 });
  }
  fallenBeam(k, [RV.x0 + 4, RV.floor + 0.3, -70], [RV.x0 + 8, RV.floor + 1.2, -73], 0.3, 'timber_dark');

  // start on the balcony, looking east over the ravine, the raised drawbridge and the town
  // (facing east-north-east: courtyard, hospice and the gatehouse ahead, burned district and town to the right)
  return { playerStart: anchor(cX1 + 1.1, topY, T.z + 0.6, YAW_E + 0.26), shrine };
}

export const TOWER_ZONE = new THREE.Box3(new THREE.Vector3(-41, -3, -118), new THREE.Vector3(-24.5, 24, -100));
