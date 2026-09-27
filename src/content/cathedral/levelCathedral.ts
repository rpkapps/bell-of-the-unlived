/**
 * The Cathedral itself (y = 12): the Nave of Hundred Names (arcades on piers, a ribbed vault, candle
 * fields, name-banners, the triforium gallery up a stair in the east aisle, the great doors barred
 * from within), the Processional Cloister east of it (the Procession's arena), and the Choir of the
 * Hundred Names behind the screen (Saint Vessaline's arena) with the Reliquary Bell over the altar.
 * Also the exterior masses seen from the town: aisle walls with flying buttresses, clerestory, roofs.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import { getMaterial } from '../../render/materials';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerLight } from '../../render/lights';
import { stairs, floor, wall, parapet, barrelVault, column, candles, candelabrum, stillbellShrine, brazier, bellPost, lathe, cyl, gableRoof, shedRoof, archPoints, extrudeXY, type Kit, type StillbellShrine } from '../../world/kit';
import { Rng } from '../../core/rng';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, candleField, plaqueWall, statue, lancet, pinnacle, snowRoof } from './levelCommon';
import { wallZ, wallX } from './levelOssuary';

export interface CathedralBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  arenas: ArenaLayout[];
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
  update(dt: number, time: number): void;
}

export function buildCathedral(ctx: AreaCtx): CathedralBuild {
  const N = PLAN.nave, CL = PLAN.cloister, CH = PLAN.choir, TS = PLAN.triStair, TF = PLAN.triforium;
  const y = N.y;
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};
  const snow = ctx.snow;
  const k = newKit(ctx, 'nave', 61, y);
  const ext = newKit(ctx, 'naveExterior', 62, y);

  // ================================================================ the nave
  floor(k, 'flagstone', N.x0, N.z0, N.x1, N.z1, y, 0.6);
  k.bmm('stone_dark', N.x0 - 1, 0, N.z0 - 34, N.x1 + 1, y - 0.6, N.z1, { cast: false });
  // central aisle runner (worn stone) the processions follow
  k.bmm('stone_trim', -1.5, y + 0.004, N.z0, 1.5, y + 0.012, N.z1, { cast: false });
  // arcades on the pier lines: piers between pointed openings, the wall rising to the clerestory
  const bays = N.cols;
  for (const sx of [-1, 1]) {
    const x = sx * N.colX;
    const holes: [number, number, number, number, 'pointed'][] = [];
    const zs = [N.z1, ...bays, N.z0];
    for (let i = 0; i < zs.length - 1; i++) {
      const a = zs[i], b = zs[i + 1];
      const w = Math.abs(a - b) - 1.6;
      if (w > 1) holes.push([(a + b) / 2, w, 0, 7.4, 'pointed']);
    }
    wallZ(k, 'stone_wall', x, N.z1, N.z0, y, 26, 1.2, holes.map(([c, w, s, h, kind]) => [c, w, s, h, kind] as [number, number, number, number, 'pointed']));
    // clerestory windows (gold light) and the triforium band
    for (let i = 0; i < zs.length - 1; i++) {
      const c = (zs[i] + zs[i + 1]) / 2;
      lancet(k, x - sx * 0.62, y + 17.5, c, sx < 0 ? YAW_E : YAW_W, 1.6, 6.4, 'bell_light', 1);
      k.box('stone_trim', x - sx * 0.65, y + 13.6, c, 0.12, 0.3, Math.abs(zs[i] - zs[i + 1]) - 1.8, { cast: false });
    }
    // pier shafts (engaged columns on the nave face)
    for (const z of bays) {
      k.add('stone_trim', cyl(0.32, 0.36, 25.6, 8), { x: x - sx * 0.7, y: y + 0.2, z });
      k.box('stone_trim', x - sx * 0.7, y + 0.15, z, 1.0, 0.3, 1.0, { cast: false });
    }
  }
  // the vault: ribbed barrel over the nave, lower barrels over the aisles
  barrelVault(k, 'stone_wall', 0, y + 26, N.z0, 0, N.colX + 0.2, N.z1 - N.z0, 0.5, 14);
  for (const sx of [-1, 1]) barrelVault(k, 'stone_wall', sx * (N.colX + N.x1) / 2, y + 9.6, N.z0, 0, (N.x1 - N.colX) / 2 + 0.3, N.z1 - N.z0, 0.4, 8);
  // outer walls with lancets
  for (const sx of [-1, 1]) {
    const x = sx * (N.x1 + 0.5);
    const holes: [number, number, number, number][] = [];
    if (sx > 0) holes.push([(PLAN.cloisterDoor.z0 + PLAN.cloisterDoor.z1) / 2, PLAN.cloisterDoor.z1 - PLAN.cloisterDoor.z0, 0, 2.6]);
    wallZ(k, 'stone_wall', x, N.z1, N.z0, y, 16, 1.0, holes);
    for (let i = 0; i < bays.length + 1; i++) {
      const c = i < bays.length ? bays[i] + 3.5 : bays[bays.length - 1] - 3.5;
      if (sx > 0 && Math.abs(c - (PLAN.cloisterDoor.z0 + PLAN.cloisterDoor.z1) / 2) < 3) continue;
      if (sx > 0 && c < TF.z1 && c > TF.z0) continue;
      lancet(k, x - sx * 0.52, y + 4.2, c, sx < 0 ? YAW_E : YAW_W, 1.4, 5.2, 'glass', 1);
    }
  }
  // the west (front) wall's inner face and the great doors
  pieces.greatDoors = buildGreatDoors(ctx);
  anchors.doorsInside = anchor(0, y, PLAN.front.z0 - 1.6, YAW_S);
  anchors.shard = anchor(-12.2, y, -45.4, YAW_W);
  anchors.knellAisle = anchor(-12.4, y, -66, YAW_W);
  k.box('stone_trim', -13.6, y + 0.45, -45.4, 0.9, 0.9, 0.9, { col: true });
  k.box('stone_trim', -13.8, y + 0.45, -66, 0.6, 0.9, 1.4, { col: true });
  pieces.greatDoors.anchor = anchors.doorsInside;
  // name-banners hung from the arcades, candle fields at the piers, candelabra down the aisles
  const bannerMat = new Rng(33);
  for (const sx of [-1, 1]) for (const z of bays) {
    const bx = sx * (N.colX - 1.0);
    k.box('timber_dark', bx, y + 11.5, z, 0.08, 0.08, 1.8, { cast: false });
    k.box(bannerMat.chance(0.5) ? 'cloth_linen' : 'cloth_red', bx, y + 8.6, z, 0.04, 5.8, 1.5, { cast: true });
    for (let l = 0; l < 7; l++) k.box('cloth_black', bx - sx * 0.03, y + 10.6 - l * 0.7, z + bannerMat.range(-0.2, 0.2), 0.01, 0.06, bannerMat.range(0.5, 1.1), { cast: false });
    candleField(k, sx * (N.colX - 1.6), y, z + 1.6, sx < 0 ? YAW_E : YAW_W, 1.0, 1.6, 16);
  }
  for (const sx of [-1, 1]) for (let z = N.z1 - 6; z > N.z0 + 13; z -= 10) if (!(sx > 0 && z < TS.zLow + 1 && z > TS.zHigh - 1)) candelabrum(k, sx * 11.2, y, z, 5);
  k.light(0xffb070, 8, 16, -4, y + 3, -58, 0.4);
  k.light(0xffb070, 8, 16, 4, y + 3, -78, 0.4);
  // the nave Stillbell (west aisle, near the choir screen) and the toll-post
  const shrine = stillbellShrine(k, N.x0 + 1.6, y, -88.5, YAW_E, 7);
  candleField(k, N.x0 + 1.4, y, -85.4, YAW_E, 1.0, 1.8, 18);
  const tollPost = {
    id: 'nave', pos: V(-4.6, y, -84), radius: 7,
    options: [{ id: 'choir', toward: V(0, y, -100) }, { id: 'triforium', toward: V(TS.x, y, TS.zLow + 3) }, { id: 'doors', toward: V(0, y, -44) }, { id: 'cloister', toward: V(17, y, -80) }],
  };
  bellPost(k, tollPost.pos.x, y, tollPost.pos.z, 0.3);

  // ---------------------------------------------------------------- the triforium stair and gallery (east aisle)
  stairs(k, 'stone_trim', [TS.x, y, TS.zLow], [TS.x, TS.yHigh, TS.zHigh], TS.w, { riser: 0.2 });
  const tsRun = Math.abs(TS.zHigh - TS.zLow), tsRise = TS.yHigh - y;
  k.box('stone_wall', TS.x, y + tsRise / 2 - 0.6, (TS.zLow + TS.zHigh) / 2, TS.w, 0.5, Math.hypot(tsRun, tsRise), { rx: Math.atan2(tsRise, tsRun), cast: false });
  // balustrade on the open side of the stair (sloped) — collider as a sloped slab
  const bx = TS.x - TS.w / 2 - 0.15;
  k.box('stone_trim', bx, y + tsRise / 2 + 0.55, (TS.zLow + TS.zHigh) / 2, 0.25, 1.1, Math.hypot(tsRun, tsRise), { rx: Math.atan2(tsRise, tsRun), col: true });
  floor(k, 'planks', TF.x0, TF.z0, TF.x1, TF.z1, TF.y, 0.4);
  for (let z = TF.z1 - 1; z > TF.z0; z -= 3) k.box('stone_trim', TF.x0 + 0.4, TF.y - 0.9, z, 0.8, 1.0, 0.5, { cast: false });
  parapet(k, 'stone_trim', TF.x0 + 0.15, TF.z1 - 2.4, TF.x0 + 0.15, TF.z0, TF.y, 0.3, 1.0);
  parapet(k, 'stone_trim', TF.x0, TF.z0 + 0.15, TF.x1, TF.z0 + 0.15, TF.y, 0.3, 1.0);
  k.bmm('timber_dark', TF.x1 - 1.6, TF.y, TF.z0 + 0.6, TF.x1 - 0.2, TF.y + 2.0, TF.z0 + 3.6, { col: 'wood' });
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) k.add('parchment', cyl(0.05, 0.05, 0.4, 6).rotateZ(Math.PI / 2), { x: TF.x1 - 0.9, y: TF.y + 0.3 + r * 0.45, z: TF.z0 + 0.9 + i * 0.45 }, { cast: false });
  anchors.rolls = anchor(TF.x1 - 2.6, TF.y, TF.z0 + 2.2, YAW_E);
  anchors.psalter = anchor(TF.x0 + 1.6, TF.y, TF.z0 + 2.6, YAW_N);
  k.box('timber_dark', TF.x0 + 1.6, TF.y + 0.5, TF.z0 + 1.6, 0.8, 1.0, 0.6, { col: 'wood' });
  candles(k, TF.x0 + 1.6, TF.y + 1.0, TF.z0 + 1.6, 4, 0.15);
  k.light(0xffb070, 4, 8, TF.x0 + 2, TF.y + 1.8, TF.z0 + 2, 0.4);

  // ---------------------------------------------------------------- the choir screen (fog gate) and the choir
  wallX(k, 'stone_trim', PLAN.screenZ, N.x0, N.x1, y, 8, 1.0, [[0, 6, 0, 5.4]]);
  for (let i = 0; i < 9; i++) statue(k, -9.6 + i * 2.4, y + 8, PLAN.screenZ + 0.4, YAW_S, 0.9);
  k.bmm('stone_trim', N.x0, y + 7.9, PLAN.screenZ - 0.7, N.x1, y + 8.2, PLAN.screenZ + 0.7, { cast: false });
  const choirFog = buildFogGate(ctx, 'choir', 0, y, PLAN.screenZ, 6, 5.4 + 2.7, YAW_N);
  // the choir's walls (continuing the aisles), apse, stalls, altar and the Reliquary Bell
  floor(k, 'flagstone', CH.x0, CH.z0 - 9, CH.x1, CH.z1, y, 0.6);
  k.bmm('stone_dark', CH.x0 - 1, 0, CH.z0 - 9, CH.x1 + 1, y - 0.6, CH.z1, { cast: false });
  wallZ(k, 'stone_wall', CH.x0 - 0.5, CH.z1, CH.z0, y, 24, 1.0);
  wallZ(k, 'stone_wall', CH.x1 + 0.5, CH.z1, CH.z0, y, 24, 1.0);
  const apseN = 10, aR = CH.x1 + 0.5;
  for (let i = 0; i < apseN; i++) {
    const a0 = Math.PI * (i / apseN), a1 = Math.PI * ((i + 1) / apseN);
    const x0 = Math.cos(a0) * aR, z0 = CH.z0 - Math.sin(a0) * aR * 0.62, x1 = Math.cos(a1) * aR, z1 = CH.z0 - Math.sin(a1) * aR * 0.62;
    wall(k, 'stone_wall', x0, z0, x1, z1, y, 24, 1.0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const yaw = Math.atan2(-mx, CH.z0 - 1 - mz);
    if (i > 0 && i < apseN - 1) lancet(k, mx * 0.97, y + 7, mz + (CH.z0 - mz) * 0.03, yaw, 1.5, 7.5, 'bell_light', 1);
  }
  barrelVault(k, 'stone_wall', 0, y + 24, CH.z0, 0, CH.x1 + 0.4, CH.z1 - CH.z0, 0.5, 14);
  // stalls
  for (const sx of [-1, 1]) {
    k.bmm('timber_dark', sx * 13.2, y, -118, sx * 14.4, y + 1.2, -101, { col: 'wood' });
    k.bmm('timber_dark', sx * 13.9, y + 1.2, -118, sx * 14.4, y + 3.2, -101, { cast: false });
    plaqueWall(k, sx * (CH.x1 - 0.1), y + 3.8, -109.5, sx < 0 ? YAW_E : YAW_W, 20, 10, 0.44, 0.3);
  }
  // the altar under the Reliquary Bell
  const alZ = CH.z0 - 2.5;
  k.bmm('stone_trim', -3.2, y, alZ - 1.3, 3.2, y + 0.4, alZ + 1.3, { col: true });
  k.bmm('stone_trim', -2.4, y + 0.4, alZ - 0.8, 2.4, y + 1.3, alZ + 0.8, { col: true });
  k.box('cloth_linen', 0, y + 1.32, alZ, 4.4, 0.04, 1.4, { cast: false });
  k.box('gold_trim', 0, y + 1.34, alZ + 0.5, 4.4, 0.02, 0.2, { cast: false });
  candleField(k, -4.8, y, alZ + 1.4, YAW_S, 2.4, 1.2, 30);
  candleField(k, 4.8, y, alZ + 1.4, YAW_S, 2.4, 1.2, 30);
  for (const sx of [-1, 1]) { brazier(k, sx * 9.5, y, -120.5, true, 1.2); k.light(0xffa860, 10, 18, sx * 9.5, y + 2.4, -120.5, 0.8); }
  const reliquaryBell = buildReliquaryBell(ctx, 0, y + 10.5, alZ);
  // tall candle-stands round the choir and engaged shafts up the walls
  for (let i = 0; i < 8; i++) { const a = Math.PI * (0.12 + (i / 7) * 0.76); candelabrum(k, Math.cos(a) * 12.4, y, CH.c.z - Math.sin(a) * 12.6 + 2, 5); }
  for (const sx of [-1, 1]) for (const z of [-99, -105, -111, -117, -123]) k.add('stone_trim', cyl(0.3, 0.34, 23.6, 8), { x: sx * (CH.x1 - 0.1), y: y + 0.2, z });
  // choir arena
  const choirArena: ArenaLayout = {
    bossId: 'vessaline', center: CH.c.clone(), radius: CH.r,
    fogGate: choirFog,
    entry: anchor(0, y, PLAN.screenZ + 3, YAW_N),
    spawn: anchor(0, y, -117.5, YAW_S),
    onDefeat: [reliquaryBell],
  };

  // ================================================================ exterior: aisle walls, flying buttresses, roofs
  for (const sx of [-1, 1]) {
    const xo = sx * (N.x1 + 1.0);
    for (const z of [N.z1 - 3, ...bays, N.z0 + 3, -100, -110, -120]) {
      ext.push(xo, y, z, sx < 0 ? YAW_W : YAW_E);
      ext.bmm('stone_wall', -0.6, 0, 0, 0.6, 18, 2.2);
      ext.add('stone_trim', new THREE.ConeGeometry(0.8, 3, 4).rotateY(Math.PI / 4), { y: 19.5, z: 1.1 });
      // the flying arch to the clerestory
      ext.box('stone_wall', 0, 23.5, -3.65, 0.6, 0.8, 10.1, { rx: 0.76 });
      ext.pop();
      pinnacle(ext, xo + sx * 1.1, y + 18, z, 1.0);
    }
    // clerestory mass & aisle roof
    ext.bmm('stone_wall', sx * 8.2 - 0.5, y + 16, N.z0, sx * 8.2 + 0.5, y + 34, N.z1);
    shedRoof(ext, sx * 11.9, y + 20, (N.z0 + N.z1) / 2, sx < 0 ? YAW_W : YAW_E, N.z1 - N.z0, 7.6, 3.6);
    snowShed(ext, snow, sx * 11.9, y + 20, (N.z0 + N.z1) / 2, sx < 0 ? YAW_W : YAW_E, N.z1 - N.z0, 7.6, 3.6);
  }
  const nPitch = (55 * Math.PI) / 180;
  gableRoof(ext, 0, y + 34, (N.z0 + N.z1) / 2 - 12, 0, 17.4, N.z1 - N.z0 + 32, { pitch: nPitch, gableMat: 'stone_wall' });
  snowRoof(ext, snow, 0, y + 34, (N.z0 + N.z1) / 2 - 12, 0, 17.4, N.z1 - N.z0 + 32, nPitch, 0.7);
  // crossing spire over the choir screen
  ext.add('stone_wall', cyl(3.6, 3.8, 10, 8), { x: 0, y: y + 44, z: PLAN.screenZ });
  ext.add('roof_slate', new THREE.ConeGeometry(4.0, 22, 8), { x: 0, y: y + 54 + 11, z: PLAN.screenZ });
  ext.add('gold_trim', cyl(0.06, 0.1, 2.6, 5), { x: 0, y: y + 76, z: PLAN.screenZ }, { cast: false });

  // ================================================================ the Processional Cloister (the Procession's arena)
  const c = newKit(ctx, 'cloister', 71, y);
  const cx0 = CL.x0, cx1 = CL.x1, cz0 = CL.z0, cz1 = CL.z1, wlk = CL.walk;
  floor(c, 'flagstone', cx0, cz0, cx1, cz1, y, 0.6);
  c.bmm('stone_dark', cx0, 0, cz0, cx1, y - 0.6, cz1, { cast: false });
  floor(c, 'grass_dead', cx0 + wlk, cz0 + wlk, cx1 - wlk, cz1 - wlk, y + 0.02, 0.05, false);
  snow.add(c, new THREE.BoxGeometry(cx1 - cx0 - 2 * wlk - 1.2, 0.04, cz1 - cz0 - 2 * wlk - 1.2), { x: CL.c.x, y: y + 0.05, z: CL.c.z });
  for (let i = 0; i < 26; i++) snow.drift(c, c.rng.range(cx0 + wlk + 0.5, cx1 - wlk - 0.5), y + 0.02, c.rng.range(cz0 + wlk + 0.5, cz1 - wlk - 0.5), c.rng.range(1.5, 3.5), c.rng.range(1.5, 3.5), c.rng.range(0.05, 0.14), c.rng.range(0, 3));
  // outer walls: west (door to the nave), north, east, south (the veil from the antechamber)
  const doorZ = (PLAN.cloisterDoor.z0 + PLAN.cloisterDoor.z1) / 2, doorW = PLAN.cloisterDoor.z1 - PLAN.cloisterDoor.z0;
  wallZ(c, 'stone_wall', cx0 - 0.5, cz1, cz0, y, 8, 1.0, [[doorZ, doorW, 0, 2.6]]);
  wallX(c, 'stone_wall', cz0 - 0.5, cx0 - 1, cx1 + 1, y, 8, 1.0);
  wallZ(c, 'stone_wall', cx1 + 0.5, cz1, cz0, y, 8, 1.0);
  const fogX = (PLAN.ante.x0 + PLAN.ante.x1) / 2;
  wallX(c, 'stone_wall', cz1 + 0.5, cx0 - 1, cx1 + 1, y, 8, 1.0, [[fogX, 4, 0, 3.6]]);
  for (const [x0, z0, x1, z1] of [[cx0 - 1, cz0 - 1, cx1 + 1, cz0], [cx0 - 1, cz1, cx1 + 1, cz1 + 1], [cx0 - 1, cz0, cx0, cz1], [cx1, cz0, cx1 + 1, cz1]] as const) snow.cap(c, x0, y + 8, z0, x1, z1, 0.12);
  // the passage through the nave's east wall to the cloister door
  c.bmm('stone_dark', N.x1 + 1.0, y, PLAN.cloisterDoor.z0 - 0.6, cx0 - 1.0, y + 4.2, PLAN.cloisterDoor.z0, { col: true });
  c.bmm('stone_dark', N.x1 + 1.0, y, PLAN.cloisterDoor.z1, cx0 - 1.0, y + 4.2, PLAN.cloisterDoor.z1 + 0.6, { col: true });
  c.bmm('stone_dark', N.x1 + 1.0, y + 3.4, PLAN.cloisterDoor.z0 - 0.6, cx0 - 1.0, y + 4.2, PLAN.cloisterDoor.z1 + 0.6, { cast: false });
  floor(c, 'flagstone', N.x1 + 0.4, PLAN.cloisterDoor.z0, cx0, PLAN.cloisterDoor.z1, y, 0.6);
  pieces.cloisterDoor = buildCloisterDoor(ctx, cx0 - 0.5, y, doorZ, doorW);
  // arcades round the garth: columns and pointed arches, lean-to roofs over the walks
  const gx0 = cx0 + wlk, gx1 = cx1 - wlk, gz0 = cz0 + wlk, gz1 = cz1 - wlk;
  const colsAt: [number, number][] = [];
  for (let x = gx0; x <= gx1 + 0.01; x += 4) { colsAt.push([x, gz0]); colsAt.push([x, gz1]); }
  for (let z = gz0 + 4; z < gz1 - 0.01; z += 4) { colsAt.push([gx0, z]); colsAt.push([gx1, z]); }
  for (const [x, z] of colsAt) column(c, 'stone_trim', x, y, z, 3.4, 0.3, true, 'stone_wall');
  const panel: [number, number][] = [[-2, 0], [-1.72, 0], ...archPoints(-1.72, 1.72, 0, 'pointed', 1.5), [1.72, 0], [2, 0], [2, 2.3], [-2, 2.3]];
  for (const [a0, a1, zz, along] of [[gx0, gx1, gz0, 'x'], [gx0, gx1, gz1, 'x'], [gz0, gz1, gx0, 'z'], [gz0, gz1, gx1, 'z']] as const) {
    for (let t = a0; t < a1 - 0.01; t += 4) {
      c.push(along === 'x' ? t + 2 : zz, y + 3.4, along === 'x' ? zz : t + 2, along === 'x' ? 0 : Math.PI / 2);
      c.add('stone_wall', extrudeXY(panel, 0.5), {}, { cast: true });
      c.pop();
    }
  }
  for (const [x, z, yaw, len] of [[(cx0 + cx1) / 2, cz0 + wlk / 2, YAW_S, cx1 - cx0], [(cx0 + cx1) / 2, cz1 - wlk / 2, YAW_N, cx1 - cx0], [cx0 + wlk / 2, (cz0 + cz1) / 2, YAW_E, cz1 - cz0 - 2 * wlk], [cx1 - wlk / 2, (cz0 + cz1) / 2, YAW_W, cz1 - cz0 - 2 * wlk]] as const) {
    shedRoof(c, x, y + 8.2, z, yaw, len, wlk + 0.8, 1.8);
    snowShed(c, snow, x, y + 8.2, z, yaw, len, wlk + 0.8, 1.8);
  }
  snow.cap(c, gx0 - 0.3, y + 6.25, gz0 - 0.3, gx1 + 0.3, gz0 + 0.3, 0.08);
  snow.cap(c, gx0 - 0.3, y + 6.25, gz1 - 0.3, gx1 + 0.3, gz1 + 0.3, 0.08);
  // the cloister's heart: a snow-capped cross over a well of names
  c.add('stone_trim', cyl(1.3, 1.4, 0.9, 12), { x: CL.c.x, y, z: CL.c.z });
  c.solid(CL.c.x - 1.2, y, CL.c.z - 1.2, CL.c.x + 1.2, y + 0.9, CL.c.z + 1.2);
  c.box('stone_wall', CL.c.x, y + 3, CL.c.z, 0.35, 4.4, 0.35, { cast: true });
  c.box('stone_wall', CL.c.x, y + 4.2, CL.c.z, 1.8, 0.35, 0.35, { cast: true });
  snow.cap(c, CL.c.x - 0.9, y + 4.38, CL.c.z - 0.2, CL.c.x + 0.9, CL.c.z + 0.2, 0.06);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; candles(c, CL.c.x + Math.cos(a) * 1.9, y, CL.c.z + Math.sin(a) * 1.9, 5, 0.25); }
  for (const [x, z] of [[cx0 + 1.2, cz0 + 1.2], [cx1 - 1.2, cz1 - 1.2]] as const) { brazier(c, x, y, z, true, 1.0); c.light(0xffa050, 9, 16, x, y + 2.2, z, 0.8); }
  const cloisterFog = buildFogGate(ctx, 'cloister', fogX, y, cz1 + 0.5, 4, 3.6 + 1.8, YAW_N);
  const cloisterArena: ArenaLayout = {
    bossId: 'procession', center: CL.c.clone(), radius: CL.r,
    fogGate: cloisterFog,
    entry: anchor(fogX, y, cz1 + 2.8, YAW_N),
    spawn: anchor(CL.c.x, y, CL.c.z - 5, YAW_S),
    onDefeat: [pieces.cloisterDoor],
  };
  anchors.processionAdd1 = anchor(CL.c.x - 4.5, y, CL.c.z - 3, YAW_S);
  anchors.processionAdd2 = anchor(CL.c.x + 4.5, y, CL.c.z - 3, YAW_S);
  anchors.cantor = anchor(cx1 - 3.2, y, cz0 + 3.2, YAW_W);

  // ================================================================ enemies (nave)
  const E = (id: string, kind: string, x: number, z: number, yaw: number, o: Partial<EnemySpawn> = {}): EnemySpawn => ({ id, kind, anchor: anchor(x, y + 0.05, z, yaw), leash: 16, ...o });
  const enemies: EnemySpawn[] = [
    E('nv_healer1', 'cath_healer', -10.5, -58, YAW_S),
    E('nv_pil1', 'cath_pilgrim', -6, -52, YAW_S),
    E('nv_pil2', 'cath_pilgrim', 6.2, -60, YAW_S),
    E('nv_flag1', 'cath_flagellant', 10.4, -72, YAW_W),
    E('nv_giant', 'cath_mourner', -4.5, -74, YAW_S, { leash: 18 }),
    E('nv_healer2', 'cath_healer', -11, -79, YAW_E),
    E('nv_pil3', 'cath_pilgrim', 5.2, -86, YAW_S),
    E('plead_nv', 'cath_pilgrim', -6.2, -91, YAW_N, { idleAnim: 'kneel', leash: 6 }),
    { id: 'tf_flag', kind: 'cath_flagellant', anchor: anchor(12, TF.y + 0.05, -78, YAW_S), leash: 10 },
  ];

  const bellAnim = reliquaryBell as DynamicPiece & { update?: (t: number) => void };
  return {
    shrine, enemies, anchors, pieces, arenas: [cloisterArena, choirArena], tollPost,
    update(_dt, time) { bellAnim.update?.(time); },
  };
}

// ====================================================================== dynamic pieces

/** Snow slab on a shedRoof() (same frame and slope). */
function snowShed(kit: Kit, snow: AreaCtx['snow'], cx: number, yy: number, cz: number, yaw: number, w: number, d: number, drop: number) {
  kit.push(cx, yy, cz, yaw);
  const L = Math.hypot(d, drop), a = Math.atan2(drop, d);
  snow.add(kit, new THREE.BoxGeometry(w - 0.6, 0.1, L * 0.86), { x: 0, y: -drop / 2 + 0.24, z: 0, rx: a });
  kit.pop();
}

function mergeFlat(list: THREE.BufferGeometry[]) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array as Float32Array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeBoundingSphere();
  return out;
}

/** A boss veil (three layered fog planes + a collider). */
export function buildFogGate(ctx: AreaCtx, name: string, x: number, y: number, z: number, w: number, h: number, yaw: number): DynamicPiece & { anchor: Anchor; enterTo: Anchor } {
  const root = new THREE.Group();
  root.name = 'fog:' + name;
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), mat);
    m.position.set(x, y + h / 2, z + (i - 1) * 0.26);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('cathedral:fog:' + name, [w, h, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + h / 2, z));
  // yaw π (north): stand south of the veil (z + 2.1), step through to z - 2.4
  const north = Math.abs(yaw - YAW_N) < 0.01;
  const piece = {
    object: root, collider: c,
    anchor: anchor(x, y, z + (north ? 2.1 : -2.1), yaw),
    enterTo: anchor(x, y, z + (north ? -2.4 : 2.4), yaw),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      layers.forEach((m, i) => { const kk = Math.max(0.001, 1 - e * (1 + i * 0.15)); m.scale.set(1 + e * 0.15, kk, 1); m.position.y = y + (h / 2) * kk; });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** The great doors: two leaves hinged at the jambs, swinging inward; a bar lifted off. set(1) = open. */
function buildGreatDoors(ctx: AreaCtx): DynamicPiece & { anchor?: Anchor } {
  const F = PLAN.front, y = PLAN.nave.y, w = F.doorX, h = 6.4;
  const root = new THREE.Group();
  root.name = 'greatDoors';
  ctx.dynamicRoot.add(root);
  const wood = getMaterial('planks'), iron = getMaterial('iron');
  const leaves: THREE.Group[] = [];
  const zc = (F.z0 + F.z1) / 2;
  for (const sx of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(sx * w, y, zc);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3).translate(-sx * w / 2, h / 2, 0), wood);
    leaf.castShadow = true;
    g.add(leaf);
    const bands = [1.0, 3.2, 5.4].map((yy) => new THREE.BoxGeometry(w * 0.96, 0.14, 0.36).translate(-sx * w / 2, yy, 0).toNonIndexed());
    bands.push(new THREE.TorusGeometry(0.2, 0.04, 5, 10).translate(-sx * 0.5, 3.0, -0.2).toNonIndexed());
    g.add(new THREE.Mesh(mergeGeometries(bands, false)!, iron));
    root.add(g);
    leaves.push(g);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 2.4, 0.35, 0.3), getMaterial('timber_dark'));
  bar.position.set(0, y + 3.2, zc - 0.35);
  root.add(bar);
  const c = ctx.shared.collision?.addDynamicBox('cathedral:greatDoors', [w * 2, h, 0.6], 'wood');
  c?.setMatrix(new THREE.Matrix4().makeTranslation(0, y + h / 2, zc));
  const piece: DynamicPiece = {
    object: root, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const barT = Math.min(1, e / 0.3), openT = Math.max(0, (e - 0.3) / 0.7);
      bar.position.y = y + 3.2 + barT * 1.2;
      bar.visible = e < 0.99;
      leaves.forEach((g, i) => { g.rotation.y = (i === 0 ? 1 : -1) * -openT * 1.75; });
      if (c) c.enabled = e < 0.4;
    },
  };
  piece.set(0);
  return piece;
}

/** The cloister's iron-bound door to the nave; opens (swings into the passage) when the Procession falls. */
function buildCloisterDoor(ctx: AreaCtx, x: number, y: number, z: number, w: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'cloisterDoor';
  ctx.dynamicRoot.add(root);
  const hinge = new THREE.Group();
  hinge.position.set(x, y, z - w / 2);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, w).translate(0, 1.3, w / 2), getMaterial('planks'));
  leaf.castShadow = true;
  hinge.add(leaf);
  for (const yy of [0.5, 1.3, 2.1]) hinge.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, w * 0.95).translate(0, yy, w / 2), getMaterial('iron')));
  root.add(hinge);
  const c = ctx.shared.collision?.addDynamicBox('cathedral:cloisterDoor', [0.6, 2.8, w], 'wood');
  c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + 1.4, z));
  const piece: DynamicPiece = {
    object: root, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      hinge.rotation.y = e * 1.6;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/**
 * The Reliquary Bell over the altar — the Saint's anchor to the Great Bell. Hung on chains in a gilt
 * cage wrapped with name-ribbons; glows at its seams. set(1) = shattered (fragments fall onto the
 * altar steps, the cage twists, the ribbons fall slack).
 */
function buildReliquaryBell(ctx: AreaCtx, x: number, hangY: number, z: number): DynamicPiece & { update(t: number): void } {
  const root = new THREE.Group();
  root.name = 'reliquaryBell';
  ctx.dynamicRoot.add(root);
  const H = 4.2, R = H * 0.46;
  const prof = [[R, -H], [R * 1.03, -H * 0.97], [R * 0.93, -H * 0.9], [R * 0.78, -H * 0.72], [R * 0.64, -H * 0.5], [R * 0.58, -H * 0.3], [R * 0.55, -H * 0.16], [R * 0.44, -H * 0.07], [R * 0.24, -H * 0.02], [0.001, 0]].map(([a, b]) => new THREE.Vector2(a, b));
  const frags: { g: THREE.Group; phi: number }[] = [];
  const glow = getMaterial('unlived_crack');
  for (let i = 0; i < 6; i++) {
    const phi0 = (i / 6) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(x, hangY, z);
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 5, phi0, Math.PI / 3), getMaterial('bronze_bell'));
    m.castShadow = true;
    g.add(m);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, H * 0.85, 0.05), glow);
    seam.position.set(Math.sin(phi0) * R * 0.8, -H * 0.5, Math.cos(phi0) * R * 0.8);
    g.add(seam);
    root.add(g);
    frags.push({ g, phi: phi0 + Math.PI / 6 });
  }
  const cage = new THREE.Group();
  cage.position.set(x, hangY, z);
  const cageParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cageParts.push(new THREE.BoxGeometry(0.06, H * 1.05, 0.06).rotateX(Math.cos(a) * 0.12).rotateZ(-Math.sin(a) * 0.12).translate(Math.sin(a) * R * 1.12, -H * 0.5, Math.cos(a) * R * 1.12).toNonIndexed());
  }
  cageParts.push(new THREE.TorusGeometry(R * 1.14, 0.05, 5, 24).rotateX(Math.PI / 2).translate(0, -H, 0).toNonIndexed());
  cage.add(new THREE.Mesh(mergeGeometries(cageParts, false)!, getMaterial('gold_trim')));
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(R * 0.75, 0.12, 4, 24).rotateX(Math.PI / 2 - 0.2).translate(0, -H * 0.45, 0), getMaterial('cloth_linen'));
  cage.add(ribbon);
  root.add(cage);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 14, 5).translate(0, 7, 0), getMaterial('iron'));
  chain.position.set(x, hangY, z);
  root.add(chain);
  const light = new THREE.PointLight(0xffd080, 12, 16, 1.8);
  light.position.set(x, hangY - H * 0.7, z + 1.4);
  light.userData.baseIntensity = 12;
  root.add(light);
  registerLight(light, { flicker: false });
  const ground = PLAN.nave.y + 1.4;
  const q = new THREE.Quaternion(), axis = new THREE.Vector3();
  let state = 0;
  const piece = {
    object: root,
    set(t: number) {
      state = Math.min(1, Math.max(0, t));
      const u = Math.min(1, Math.max(0, (state - 0.2) / 0.8));
      for (const f of frags) {
        const fall = Math.min(1, (u * 1.6) ** 2);
        const dx = Math.sin(f.phi), dz = Math.cos(f.phi);
        f.g.position.set(x + dx * u * 1.8, hangY - (hangY - ground) * fall, z + dz * u * 1.8);
        axis.set(dz, 0, -dx);
        q.setFromAxisAngle(axis, u * 1.7);
        f.g.quaternion.copy(q);
        if (state > 0 && state < 0.2) f.g.position.x += Math.sin(state * 200 + f.phi * 3) * 0.02;
      }
      cage.rotation.z = u * 0.5;
      cage.position.y = hangY - u * 1.2;
      light.intensity = 12 * (1 - Math.min(1, state * 2));
      light.userData.baseIntensity = light.intensity;
    },
    update(time: number) {
      if (state > 0) return;
      cage.rotation.y = time * 0.08;
      for (const f of frags) f.g.rotation.y = Math.sin(time * 0.4) * 0.03;
    },
  };
  piece.set(0);
  return piece;
}
