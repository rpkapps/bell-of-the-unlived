/**
 * The Pilgrim Stair (y 0 → 12): three flights and two landings climbing a canyon between two high
 * banks of old town (houses stand on their tops), then the parvis before the Cathedral's west front:
 * twin towers with spires, the great portal (barred from within), a gallery of saints and — hung in
 * a colossal pointed arch above the portal — the cracked Great Bell glowing through its fissures.
 * The Chapel of Rewritten Names opens off the parvis to the west.
 *
 * The east bank is hollow: the Name-Ossuary runs inside it (door on the first landing; the grate in
 * its south face at the Stair's foot).
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import { getMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import { stairs, floor, wall, parapet, bound, candles, bellPost, lantern, reliefPanel, cone, cyl, lathe, archPoints, extrudeXY, gablePrism, gableRoof, type Kit } from '../../world/kit';
import { Rng } from '../../core/rng';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, candleField, plaqueWall, statue, lancet, pinnacle, snowRoof } from './levelCommon';
import { snowyHouse } from './levelTown';

export interface StairBuild {
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
  greatBell: GreatBell;
}

export interface GreatBell extends DynamicPiece { update(time: number): void }

export function buildStair(ctx: AreaCtx): StairBuild {
  const k = newKit(ctx, 'stair', 41, 4);
  const snow = ctx.snow;
  const T = PLAN.stair, PV = PLAN.parvis, CH = PLAN.chapel;
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};

  // ---------------------------------------------------------------- the flights and landings
  for (const [z0, z1, y0, y1] of T.flights) {
    stairs(k, 'stone_trim', [0, y0, z0], [0, y1, z1], T.x1 - T.x0, { riser: 0.2 });
    // trodden middle, snow heaped at the ends of every step
    const n = Math.round((y1 - y0) / 0.2);
    for (let i = 0; i < n; i++) {
      const zz = z0 + ((z1 - z0) * (i + 0.5)) / n, yy = y0 + ((y1 - y0) * (i + 1)) / n;
      for (const sx of [-1, 1]) snow.add(k, new THREE.BoxGeometry(k.rng.range(0.8, 1.8), 0.05, Math.abs(z1 - z0) / n * 0.9), { x: sx * (T.x1 - 0.7), y: yy + 0.02, z: zz });
    }
  }
  for (const [z0, z1, y] of T.landings) {
    floor(k, 'flagstone', T.x0, z1, T.x1, z0, y, 0.5);
    k.bmm('stone_dark', T.x0, 0, z1, T.x1, y - 0.5, z0, { cast: false });
    snow.drift(k, -6, y, (z0 + z1) / 2, 1.6, 3, 0.07);
    snow.drift(k, 6.2, y, (z0 + z1) / 2 - 0.8, 1.2, 2, 0.06);
  }
  // candle fields and statues at the landings; the toll-post on the first
  candleField(k, -5.6, 4, 3.8, YAW_E, 1.2, 2.6, 26);
  candleField(k, 5.6, 8, -12, YAW_W, 1.2, 2.6, 26);
  candleField(k, -5.6, 8, -10.4, YAW_E, 1.2, 2.6, 20);
  bellPost(k, -4.8, 4, 1.2, 0.3);
  anchors.shieldNook = anchor(-6.2, 8, -12.4, YAW_W);
  k.box('timber_dark', -6.9, 8.3, -12.4, 0.2, 0.6, 1.0, { cast: false });
  lantern(k, 0, 7.2, 2.5);
  k.light(0xffb870, 6, 12, 0, 6.8, 2.5, 0.3);
  k.light(0xffa860, 5, 10, 0, 10.4, -11, 0.4);

  // ---------------------------------------------------------------- the banks (canyon walls), hollow on the east
  const bankTop = 12;
  const zN = -22, zS = PLAN.plaza.z0;
  // west bank face (x = -7.6) with niches of names and buttresses
  wall(k, 'stone_wall', -8, zS, -8, zN, 0, bankTop, 0.8);
  for (let z = zS - 4; z > zN + 1; z -= 6) {
    k.bmm('stone_dark', -7.6, 0, z - 0.5, -7.1, bankTop - 1.2, z + 0.5, { cast: true });
    const gy = z > 5 ? 0 : z > -9 ? 4 : 8;
    plaqueWall(k, -7.55, gy + 1.4, z - 3, YAW_E, 4, 4, 0.5, 0.32);
  }
  // east bank face (x = 7.6) with the ossuary door at the first landing (y 4)
  const P = PLAN.passage;
  const eMid = (zS + zN) / 2, doorZ = (P.z0 + P.z1) / 2;
  wall(k, 'stone_wall', 8, zS, 8, zN, 0, bankTop, 0.8, { openings: [{ u: -(doorZ - eMid), w: P.z1 - P.z0, sill: P.y, h: 2.6, kind: 'pointed', rise: 1.3 }] });
  // the door's surround: jambs, a hood-mould, a carved skull-and-bell over it
  k.bmm('stone_trim', 7.1, P.y, P.z0 - 0.4, 7.6, P.y + 2.7, P.z0, { cast: false });
  k.bmm('stone_trim', 7.1, P.y, P.z1, 7.6, P.y + 2.7, P.z1 + 0.4, { cast: false });
  k.bmm('stone_trim', 7.0, P.y + 4.1, P.z0 - 0.6, 7.6, P.y + 4.4, P.z1 + 0.6, { cast: false });
  k.add('bone', new THREE.SphereGeometry(0.28, 8, 6), { x: 7.25, y: P.y + 4.9, z: doorZ }, { cast: false });
  k.add('bronze_bell', lathe([[0.3, -0.5], [0.25, -0.4], [0.2, -0.2], [0.17, -0.05], [0.001, 0]], 10), { x: 7.25, y: P.y + 4.6, z: doorZ }, { cast: false });
  for (let z = zS - 4; z > zN + 1; z -= 6) if (Math.abs(z - doorZ) > 2.5) k.bmm('stone_dark', 7.1, 0, z - 0.5, 7.6, bankTop - 1.2, z + 0.5, { cast: true });
  // south faces at the plaza (the grate opens in the east one)
  wall(k, 'stone_dark', -34, zS, -7.6, zS, 0, bankTop, 1.0);
  const G = PLAN.grate, gMid = (7.6 + 34) / 2;
  wall(k, 'stone_dark', 7.6, zS, 34, zS, 0, bankTop, 1.0, { openings: [{ u: (G.x0 + G.x1) / 2 - gMid, w: G.x1 - G.x0, sill: 0, h: 2.7, kind: 'pointed', rise: 1.0 }] });
  k.bmm('stone_trim', G.x0 - 0.35, 0, zS + 0.5, G.x0, 3.2, zS + 0.8, { cast: false });
  k.bmm('stone_trim', G.x1, 0, zS + 0.5, G.x1 + 0.35, 3.2, zS + 0.8, { cast: false });
  // bank tops (snowed-over paving) with parapets along the canyon, houses standing on them
  for (const [x0, x1] of [[-34, -7.6], [7.6, 34]] as const) {
    k.bmm('stone_dark', x0, bankTop - 0.6, zN, x1, bankTop, zS, { cast: false });
    snow.cap(k, x0, bankTop, zN, x1, zS, 0.1);
    const px = x0 < 0 ? x1 - 0.25 : x0 + 0.25;
    parapet(k, 'stone_wall', px, zS, px, zN, bankTop, 0.5, 1.1, { col: false });
    snow.cap(k, px - 0.3, bankTop + 1.1, zN, px + 0.3, zS, 0.08);
  }
  for (let i = 0; i < 4; i++) {
    const z = 10 - i * 8.2;
    snowyHouse(k, snow, -9.2, bankTop, z, YAW_E, { w: 7.2, d: 8, storeys: 2 + (i % 2), roof: i % 2 ? 'front' : 'side', seed: 480 + i, lit: 0.55, detail: 'low' });
    snowyHouse(k, snow, 9.2, bankTop, z + 1.5, YAW_W, { w: 7.2, d: 8, storeys: 3 - (i % 2), roof: i % 2 ? 'side' : 'front', seed: 490 + i, lit: 0.5, detail: 'low' });
  }
  // colliders on the canyon rim (never reachable, but keep the walk honest)
  bound(k, -7.6, zS, -7.6, zN, 0, 16, 0.4);
  bound(k, 7.6, zS, 7.6, doorZ + (P.z1 - P.z0) / 2, 0, 16, 0.4);
  bound(k, 7.6, doorZ - (P.z1 - P.z0) / 2, 7.6, zN, 0, 16, 0.4);

  // ---------------------------------------------------------------- the parvis (y 12)
  floor(k, 'flagstone', PV.x0, PV.z0 - 0.5, PV.x1, PV.z1, PV.y, 0.6);
  k.bmm('stone_dark', PV.x0, 0, PV.z0, PV.x1, PV.y - 0.6, PV.z1, { cast: false });
  for (let i = 0; i < 22; i++) snow.drift(k, k.rng.range(PV.x0 + 1, PV.x1 - 1), PV.y, k.rng.range(PV.z0 + 2, PV.z1 - 1), k.rng.range(1.2, 3), k.rng.range(1.2, 3), k.rng.range(0.03, 0.1), k.rng.range(0, 3));
  // balustrade along the top of the Stair's banks (the parvis' south edge beyond the Stair)
  for (const [x0, x1] of [[PV.x0, -7.6], [7.6, PV.x1]] as const) {
    parapet(k, 'stone_wall', x0, zN - 0.25, x1, zN - 0.25, PV.y, 0.5, 1.1);
    snow.cap(k, x0, PV.y + 1.1, zN - 0.5, x1, zN, 0.08);
  }
  // east: the precinct wall of the cloister, a barred processional gate, the relief of the Saint's Mercy
  wall(k, 'stone_wall', PV.x1 + 0.4, PV.z1, PV.x1 + 0.4, PV.z0, PV.y, 7, 0.8);
  k.bmm('timber_dark', PV.x1 - 0.1, PV.y, -27.5, PV.x1 + 0.1, PV.y + 3.8, -24.5, { cast: false });
  for (let i = 0; i < 5; i++) k.box('iron', PV.x1 - 0.15, PV.y + 1.9, -27.2 + i * 0.6, 0.06, 3.8, 0.06, { cast: false });
  reliefPanel(k, PV.x1 - 0.1, PV.y + 1.2, -33, YAW_W, 4.2, 2.4);
  anchors.mercy = anchor(PV.x1 - 1.8, PV.y, -33, YAW_E);
  snow.cap(k, PV.x1, PV.y + 7, PV.z0, PV.x1 + 0.8, PV.z1, 0.1);
  statue(k, -6, PV.y + 0.6, -29, YAW_S, 1.5);
  statue(k, 6, PV.y + 0.6, -29, YAW_S, 1.5);
  for (const sx of [-6, 6]) k.bmm('stone_trim', sx - 0.7, PV.y, -29.7, sx + 0.7, PV.y + 0.6, -28.3, { col: true });
  candleField(k, -4.4, PV.y, -38.4, YAW_S, 2.4, 1.2, 28);
  candleField(k, 4.4, PV.y, -38.4, YAW_S, 2.4, 1.2, 28);
  anchors.doorsOutside = anchor(0, PV.y, -37.9, YAW_N);
  anchors.bellView = anchor(0, PV.y, -29.5, YAW_N);

  // ---------------------------------------------------------------- the Chapel of Rewritten Names
  const cy = CH.y;
  floor(k, 'flagstone', CH.x0, CH.z0, CH.x1, CH.z1, cy, 0.6);
  wall(k, 'stone_wall', CH.x1, CH.z1, CH.x1, CH.z0, cy, 7, 0.7, { openings: [{ u: -(((CH.doorZ0 + CH.doorZ1) / 2) - (CH.z0 + CH.z1) / 2), w: CH.doorZ1 - CH.doorZ0, sill: 0, h: 2.8, kind: 'pointed', rise: 1.2 }] });
  wall(k, 'stone_wall', CH.x0, CH.z1, CH.x0, CH.z0, cy, 7, 0.7);
  wall(k, 'stone_wall', CH.x0, CH.z1, CH.x1, CH.z1, cy, 7, 0.7);
  wall(k, 'stone_wall', CH.x0, CH.z0, CH.x1, CH.z0, cy, 7, 0.7);
  const chPitch = (52 * Math.PI) / 180;
  gableRoof(k, (CH.x0 + CH.x1) / 2, cy + 7, (CH.z0 + CH.z1) / 2, 0, CH.x1 - CH.x0 + 0.4, CH.z1 - CH.z0 + 0.4, { pitch: chPitch, gableMat: 'stone_wall' });
  snowRoof(k, snow, (CH.x0 + CH.x1) / 2, cy + 7, (CH.z0 + CH.z1) / 2, 0, CH.x1 - CH.x0 + 0.4, CH.z1 - CH.z0 + 0.4, chPitch);
  k.bmm('timber_dark', CH.x0, cy + 6.8, CH.z0, CH.x1, cy + 7.0, CH.z1, { cast: false });
  // the wall of rewritten names (west), the kneeling mats, the reading lectern
  plaqueWall(k, CH.x0 + 0.4, cy + 0.9, -30, YAW_E, 14, 12, 0.5, 0.32);
  plaqueWall(k, -26, cy + 1.1, CH.z0 + 0.4, YAW_S, 8, 9, 0.5, 0.32);
  for (const [x, z] of [[-29, -30], [-26.8, -26.8], [-27.2, -33.4], [-29.5, -26.5]] as const) k.box('cloth_red', x, cy + 0.02, z, 0.7, 0.04, 1.0, { cast: false });
  candleField(k, CH.x0 + 1.2, cy, -27, YAW_E, 1.0, 3.6, 30);
  candleField(k, CH.x0 + 1.2, cy, -33.2, YAW_E, 1.0, 3.6, 30);
  k.box('timber_dark', -23.2, cy + 0.6, -34.6, 0.5, 1.2, 0.5, { col: 'wood' });
  k.box('parchment', -23.2, cy + 1.25, -34.6, 0.6, 0.02, 0.5, { rx: -0.3, cast: false });
  k.light(0xffb070, 7, 11, -28.5, cy + 2.2, -30, 0.5);
  lancet(k, CH.x0 + 0.36, cy + 3, -26.2, YAW_E, 1.0, 3.2, 'window_warm');
  lancet(k, CH.x0 + 0.36, cy + 3, -33.8, YAW_E, 1.0, 3.2, 'window_warm');
  anchors.wenna = anchor(-29, cy, -30, YAW_W);
  anchors.lectern = anchor(-23.2, cy, -33.6, YAW_N);
  anchors.wennaMat = anchor(-28.4, cy, -30, YAW_W);
  // parvis west bounds either side of the chapel
  bound(k, PV.x0, PV.z1, PV.x0, CH.z1, PV.y, 5);
  bound(k, PV.x0, CH.z0, PV.x0, PV.z0, PV.y, 5);
  k.bmm('stone_wall', PV.x0 - 0.5, PV.y, CH.z0 - 4.2, PV.x0, PV.y + 5, CH.z0, { col: true });

  // ---------------------------------------------------------------- the west front
  const F = PLAN.front, TW = PLAN.towers;
  const fy = PV.y;
  // the central front: portal below, a gallery of saints, the great bell-arch above
  // (two stacked walls: the wall collider expects side-by-side openings)
  wall(k, 'stone_wall', -TW.xc + TW.half, (F.z0 + F.z1) / 2, TW.xc - TW.half, (F.z0 + F.z1) / 2, fy, 19, 2.2, {
    openings: [{ u: 0, w: F.doorX * 2, sill: 0, h: 6.4, kind: 'pointed', rise: 3.0 }],
  });
  wall(k, 'stone_wall', -TW.xc + TW.half, (F.z0 + F.z1) / 2, TW.xc - TW.half, (F.z0 + F.z1) / 2, fy + 19, 21, 2.2, {
    openings: [{ u: 0, w: 12.4, sill: 0, h: 10, kind: 'pointed', rise: 9.5 }],
  });
  floor(k, 'flagstone', -F.doorX - 0.2, F.z0 - 0.4, F.doorX + 0.2, F.z1 + 0.2, fy, 0.6); // the threshold
  // archivolts: nested pointed rings stepping back into the portal
  for (let i = 0; i < 4; i++) {
    const w = F.doorX * 2 + 0.7 + i * 0.9, sp = 6.4, rise = 3.2 + i * 0.4, wi = w - 0.9;
    const outer: [number, number][] = [[-w / 2, 0], [w / 2, 0], [w / 2, sp], ...archPoints(-w / 2, w / 2, sp, 'pointed', rise).reverse(), [-w / 2, sp]];
    const inner: [number, number][] = [[-wi / 2, 0.01], [wi / 2, 0.01], [wi / 2, sp], ...archPoints(-wi / 2, wi / 2, sp, 'pointed', rise - 0.45).reverse(), [-wi / 2, sp]];
    k.push(0, fy, F.z1 + 0.2 + (3 - i) * 0.3, 0);
    k.add('stone_trim', extrudeXY(outer, 0.3, [inner.slice().reverse()]), {}, { cast: i === 3 });
    k.pop();
  }
  // tympanum: the Saint gathering the dying (a band of little figures)
  k.bmm('stone_trim', -F.doorX, fy + 6.4, F.z0 - 0.2, F.doorX, fy + 6.8, F.z1 - 0.3, { cast: false });
  for (let i = 0; i < 9; i++) statue(k, -2.6 + i * 0.65, fy + 6.9, F.z1 - 0.6, YAW_S, 0.55);
  // a wimperg (pointed gable) over the portal, crocketed, with pinnacles either side
  k.push(0, fy + 9.4, F.z1 + 1.35, 0);
  k.add('stone_trim', gablePrism(8.6, 5.6, 0.5));
  k.add('stone_wall', gablePrism(7.2, 4.6, 0.3), { z: -0.2 });
  for (let i = 1; i < 6; i++) for (const sx of [-1, 1]) k.add('stone_trim', cone(0.14, 0.4, 5), { x: sx * (4.3 - i * 0.72), y: i * 0.94 + 0.1, z: 0.1, rz: sx * 0.6 }, { cast: false });
  k.pop();
  pinnacle(k, 0, fy + 15, F.z1 + 1.35, 0.8);
  for (const sx of [-1, 1]) { k.bmm('stone_trim', sx * 4.6 - 0.35, fy, F.z1 - 0.1, sx * 4.6 + 0.35, fy + 11, F.z1 + 1.4); pinnacle(k, sx * 4.6, fy + 11, F.z1 + 0.65, 0.9); }
  // tall blind arcading across the central front, either side of the bell-arch
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) lancet(k, sx * (6.9 - i * 0.2), fy + 20 + i * 9, F.z1 + 0.02, YAW_S, 0.9, 7.5, 'stone_dark', 0);
  // jamb saints either side of the portal
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) statue(k, sx * (F.doorX + 1.0 + i * 0.9), fy + 2.2, F.z1 + 0.25 + (2 - i) * 0.25, YAW_S, 1.2);
  // gallery of saints across the front (y ≈ fy + 14)
  k.bmm('stone_trim', -8, fy + 13.6, F.z1, 8, fy + 14.1, F.z1 + 1.1);
  snow.cap(k, -8, fy + 14.1, F.z1, 8, F.z1 + 1.1, 0.06);
  for (let i = 0; i < 9; i++) statue(k, -6.4 + i * 1.6, fy + 14.1, F.z1 + 0.45, YAW_S, 1.15);
  for (let i = 0; i < 8; i++) k.box('stone_wall', -5.6 + i * 1.6, fy + 16.6, F.z1 + 0.25, 0.2, 5, 0.3, { cast: false });
  // gable over the bell-arch with a rose of blind tracery
  k.push(0, fy + 40, (F.z0 + F.z1) / 2, 0);
  k.add('stone_wall', gablePrism(16, 9, 2.2));
  k.pop();
  k.add('stone_trim', new THREE.TorusGeometry(2.2, 0.25, 6, 24), { x: 0, y: fy + 43.4, z: F.z1 + 0.1 }, { cast: false });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.box('stone_trim', Math.cos(a) * 1.1, fy + 43.4 + Math.sin(a) * 1.1, F.z1 + 0.1, 2.2, 0.16, 0.14, { rz: a, cast: false }); }
  pinnacle(k, 0, fy + 49, (F.z0 + F.z1) / 2, 1.4);
  // the towers (solid masses with buttresses, lancets, a belfry stage and spires)
  for (const sx of [-1, 1]) {
    const x = sx * TW.xc, z = TW.zc, h = TW.top - fy;
    k.bmm('stone_wall', x - TW.half, fy, z - TW.half, x + TW.half, TW.top, z + TW.half, { col: true });
    for (let yy = fy + 8; yy < TW.top - 2; yy += 9) k.bmm('stone_trim', x - TW.half - 0.15, yy, z - TW.half - 0.15, x + TW.half + 0.15, yy + 0.35, z + TW.half + 0.15, { cast: false });
    for (const [bx, bz, yaw] of [[x - TW.half, z + TW.half, YAW_S], [x + TW.half, z + TW.half, YAW_S], [x + sx * TW.half, z, sx > 0 ? YAW_E : YAW_W]] as const) {
      k.push(bx, fy, bz, yaw);
      k.bmm('stone_wall', -0.7, 0, 0, 0.7, h * 0.75, 1.5);
      k.bmm('stone_wall', -0.55, h * 0.75, 0, 0.55, h * 0.92, 0.9);
      k.pop();
    }
    for (let i = 0; i < 3; i++) lancet(k, x, fy + 18 + i * 11, z + TW.half + 0.02, YAW_S, 1.6, 6, i === 2 ? 'window_warm' : 'glass', 1);
    // blind arcading beside the windows, on the front and the outer face
    for (let i = 0; i < 4; i++) {
      for (const dx of [-2.9, 2.9]) lancet(k, x + dx, fy + 9 + i * 10, z + TW.half + 0.02, YAW_S, 0.9, 6.4, 'stone_dark', 0);
      for (const dz of [-2.4, 0, 2.4]) lancet(k, x + sx * (TW.half + 0.02), fy + 9 + i * 10, z + dz, sx > 0 ? YAW_E : YAW_W, 0.9, 6.4, i === 2 && dz === 0 ? 'window_warm' : 'stone_dark', 0);
    }
    // corner buttresses at the back corners too, stepping in
    for (const [bx, bz, yaw] of [[x - TW.half, z - TW.half, YAW_N], [x + TW.half, z - TW.half, YAW_N]] as const) {
      k.push(bx, fy, bz, yaw);
      k.bmm('stone_wall', -0.7, 0, 0, 0.7, h * 0.7, 1.3);
      k.pop();
    }
    // belfry: tall louvred openings, then the spire
    const by = TW.top;
    k.bmm('stone_trim', x - TW.half - 0.4, by, z - TW.half - 0.4, x + TW.half + 0.4, by + 0.6, z + TW.half + 0.4, { cast: false });
    snow.cap(k, x - TW.half - 0.4, by + 0.6, z - TW.half - 0.4, x + TW.half + 0.4, z + TW.half + 0.4, 0.14);
    k.add('stone_wall', cyl(TW.half * 0.95, TW.half * 1.05, 7, 8), { x, y: by + 0.6, z, ry: Math.PI / 8 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; k.box('timber_dark', x + Math.sin(a) * TW.half * 0.98, by + 4.2, z + Math.cos(a) * TW.half * 0.98, 1.2, 4.6, 0.2, { ry: a, cast: false }); }
    k.add('roof_slate', cone(TW.half * 1.05, 24, 8), { x, y: by + 7.6, z, ry: Math.PI / 8 });
    k.add('gold_trim', cyl(0.06, 0.1, 2.6, 5), { x, y: by + 31.4, z }, { cast: false });
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pinnacle(k, x + px * TW.half, by + 0.6, z + pz * TW.half, 1.3);
    // snow streaks on the spire
    snow.add(k, cone(TW.half * 1.07, 9, 8), { x, y: by + 7.6, z, ry: Math.PI / 8 });
  }
  // the bell-arch's frame: great timber headstock beams across the opening
  k.bmm('timber_dark', -6.8, fy + 36.4, F.z1 + 0.2, 6.8, fy + 37.4, F.z0 - 0.2);
  for (const sx of [-1, 1]) k.box('timber_dark', sx * 5.2, fy + 33.6, (F.z0 + F.z1) / 2, 0.8, 6, 0.8, { rz: sx * 0.3 });
  // nave roofline seen over the front (the nave builder does the long walls)
  k.bmm('stone_wall', -8, fy + 30, F.z0 - 2, 8, fy + 40, F.z0);

  const greatBell = buildGreatBell(ctx, k);
  pieces.greatBell = greatBell;

  // ---------------------------------------------------------------- enemies
  const sy = (z: number) => { for (const [z0, z1, y0, y1] of T.flights) if (z <= z0 && z >= z1) return y0 + ((z0 - z) / (z0 - z1)) * (y1 - y0); for (const [z0, z1, y] of T.landings) if (z <= z0 && z >= z1) return y; return PV.y; };
  const E = (id: string, kind: string, x: number, z: number, yaw: number, o: Partial<EnemySpawn> = {}): EnemySpawn => ({ id, kind, anchor: anchor(x, sy(z) + 0.05, z, yaw), leash: 14, ...o });
  const enemies: EnemySpawn[] = [
    E('sf_pil1', 'cath_pilgrim', -3, 9.5, YAW_S),
    E('sf_pil2', 'cath_pilgrim', 3.6, 7.6, YAW_S),
    E('l1_healer', 'cath_healer', 3.4, 2.2, YAW_S),
    E('l1_pil', 'cath_pilgrim', -2.6, 1.6, YAW_S),
    E('sf2_pil1', 'cath_pilgrim', 1.4, -3.5, YAW_S),
    E('sf2_pil2', 'cath_pilgrim', -4.4, -6, YAW_S),
    E('l2_flag', 'cath_flagellant', 0.6, -11, YAW_S),
    E('sf3_pil', 'cath_pilgrim', 3, -17, YAW_S),
    { id: 'pv_giant', kind: 'cath_mourner', anchor: anchor(0, PV.y, -31.5, YAW_S), leash: 20 },
    { id: 'pv_healer', kind: 'cath_healer', anchor: anchor(-10, PV.y, -35, YAW_S), leash: 18 },
    { id: 'pv_pil1', kind: 'cath_pilgrim', anchor: anchor(9, PV.y, -25.5, YAW_W), leash: 14 },
    { id: 'pv_pil2', kind: 'cath_pilgrim', anchor: anchor(13, PV.y, -36, YAW_S), leash: 14 },
    { id: 'plead_ch1', kind: 'cath_pilgrim', anchor: anchor(-26.8, CH.y, -26.8, YAW_W), idleAnim: 'kneel', leash: 8 },
    { id: 'plead_ch2', kind: 'cath_pilgrim', anchor: anchor(-27.2, CH.y, -33.4, YAW_W), idleAnim: 'kneel', leash: 8 },
  ];

  const tollPost = {
    id: 'landing', pos: V(-4.8, 4, 1.2), radius: 7,
    options: [{ id: 'up', toward: V(0, 12, -24) }, { id: 'ossuary', toward: V(14, 4, 2.6) }, { id: 'down', toward: V(0, 0, 18) }],
  };
  candles(k, 6.6, 4, 5.4, 5, 0.3);
  return { enemies, anchors, pieces, tollPost, greatBell };
}

/**
 * The Great Bell of the Cathedral: a colossal bronze bell hung in the arch above the portal, split by
 * a web of fissures that glow like a hearth. set(0) = alive (gold fissures, glow light, a slow sway);
 * set(1) = silenced (the fissures dark, the light out, the bell still).
 */
function buildGreatBell(ctx: AreaCtx, k: Kit): GreatBell {
  const B = PLAN.bell;
  const root = new THREE.Group();
  root.name = 'greatBell';
  ctx.dynamicRoot.add(root);
  const pivot = new THREE.Group();
  pivot.position.set(B.x, B.y + 1.2, B.z);
  root.add(pivot);
  const H = B.h, R = H * 0.42;
  const prof: [number, number][] = [[R * 1.0, -H], [R * 1.03, -H * 0.975], [R * 0.95, -H * 0.9], [R * 0.8, -H * 0.72], [R * 0.66, -H * 0.5], [R * 0.6, -H * 0.3], [R * 0.57, -H * 0.16], [R * 0.47, -H * 0.07], [R * 0.26, -H * 0.02], [0.001, 0]];
  const body = new THREE.Mesh(lathe(prof, 36), getMaterial('bronze_bell'));
  body.castShadow = true;
  pivot.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, 0.12, 6, 36).rotateX(Math.PI / 2).translate(0, -H * 0.99, 0), getMaterial('bronze'));
  pivot.add(lip);
  for (const yy of [-H * 0.25, -H * 0.6]) pivot.add(new THREE.Mesh(new THREE.TorusGeometry(radiusAt(prof, yy) + 0.02, 0.08, 5, 36).rotateX(Math.PI / 2).translate(0, yy, 0), getMaterial('gold_trim')));
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.2).translate(0, 0.4, 0), getMaterial('timber_dark'));
  pivot.add(yoke);
  // fissures: random walks down the surface, in two materials (lit / dark) toggled by state
  const rng = new Rng(9090);
  const lit: THREE.BufferGeometry[] = [];
  const crack = (a0: number, y0: number, steps: number, wMax: number, depth: number) => {
    let a = a0, y = y0;
    for (let s = 0; s < steps; s++) {
      const a2 = a + rng.range(-0.16, 0.16), y2 = y - rng.range(0.3, 0.8);
      if (y2 < -H * 0.985) break;
      const r1 = radiusAt(prof, y) + 0.03, r2 = radiusAt(prof, y2) + 0.03;
      const p1 = new THREE.Vector3(Math.sin(a) * r1, y, Math.cos(a) * r1), p2 = new THREE.Vector3(Math.sin(a2) * r2, y2, Math.cos(a2) * r2);
      const len = p1.distanceTo(p2), w = rng.range(wMax * 0.45, wMax) * (1 - s / (steps + 2));
      const m = new THREE.Matrix4().lookAt(p1, p2, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
      lit.push(new THREE.BoxGeometry(w, 0.08, len + 0.06).applyMatrix4(m).translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2));
      if (depth > 0 && rng.chance(0.28)) crack(a2 + rng.range(-0.5, 0.5), y2, Math.max(2, Math.floor(steps / 2)), wMax * 0.6, depth - 1);
      a = a2; y = y2;
    }
  };
  for (let c = 0; c < 15; c++) crack((c / 15) * Math.PI * 2 + rng.range(-0.15, 0.15), -rng.range(H * 0.1, H * 0.4), 11, 0.16, 1);
  const crackGeo = mergeList(lit);
  const cracksLit = new THREE.Mesh(crackGeo, getMaterial('unlived_crack'));
  const cracksDark = new THREE.Mesh(crackGeo, getMaterial('stone_dark'));
  cracksDark.visible = false;
  pivot.add(cracksLit, cracksDark);
  // the inner glow (seen through the mouth from the parvis)
  // the hearth inside: an ember-lit inner shell, seen up through the mouth and through the fissures
  const glow = new THREE.Mesh(new THREE.CircleGeometry(R * 0.55, 20).rotateX(Math.PI / 2).translate(0, -H * 0.55, 0), getMaterial('ember_glow'));
  pivot.add(glow);
  // chains to the arch
  for (const sx of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 5).translate(0, 2.1, 0), getMaterial('iron'));
    ch.position.set(B.x + sx * 1.2, B.y + 1.4, B.z);
    ch.rotation.z = -sx * 0.25;
    root.add(ch);
  }
  const light = new THREE.PointLight(0xffc070, 30, 45, 1.6);
  light.position.set(B.x, B.y - H * 0.6, B.z + R + 2);
  light.castShadow = false;
  light.userData.baseIntensity = 30;
  root.add(light);
  registerLight(light, { flicker: false });
  void k;
  let state = 0;
  const piece: GreatBell = {
    object: root,
    set(t: number) {
      state = Math.min(1, Math.max(0, t));
      cracksLit.visible = state < 0.5;
      cracksDark.visible = state >= 0.5;
      glow.visible = state < 0.5;
      light.intensity = 30 * (1 - state);
      light.userData.baseIntensity = light.intensity;
    },
    update(time: number) {
      const alive = 1 - state;
      pivot.rotation.z = Math.sin(time * 0.35) * 0.012 * alive;
      pivot.rotation.x = Math.sin(time * 0.27 + 1) * 0.008 * alive;
      if (alive > 0.5) light.intensity = (26 + Math.sin(time * 1.7) * 3 + Math.sin(time * 4.3) * 1.5) * alive;
    },
  };
  piece.set(0);
  return piece;
}

function radiusAt(prof: [number, number][], y: number) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    if ((y <= y1 && y >= y0) || (y >= y1 && y <= y0)) { const t = (y - y0) / (y1 - y0 || 1); return r0 + (r1 - r0) * t; }
  }
  return prof[prof.length - 1][0];
}

function mergeList(list: THREE.BufferGeometry[]) {
  let n = 0;
  for (const g of list) n += (g.index ? g.index.count : g.attributes.position.count);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

