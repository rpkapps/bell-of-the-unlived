/**
 * The Siege Road (y = 0, z ∈ [−19.5, 70]) and the Outer Ramparts (walk y = 8).
 *
 * The road runs north between snowy slopes to the Outer Gate. West: the besiegers' camp (tents,
 * a standing trebuchet, a broken one) and the siege tower whose gangway climbs to the west
 * wall-walk. East: the victory monument beside the mass graves of the same night. In front of the
 * gate: the killing ground under the east bombard (mantlets and gabions for cover). The curtain
 * wall is whole in the west and breached in the east — both histories of the siege at once.
 * Stillbell 'army.road' at the camp's edge.
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  floor, stairs, parapet, bound, crenellation, stillbellShrine, bellPost, rubble, rock, cart, crate, crateStack, barrel,
  weaponRack, sconceTorch, rockProp, deadTree, slit, cyl,
} from '../../world/kit';
import {
  type AreaCtx, type AreaOut, emptyOut, newKit, anchor, yawTo, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, box3,
  armyBanner, armyStandard, snowCap, snowDrift, driftLine, terrainPatch, fbm2,
} from './levelCommon';
import {
  mantlet, palisade, chevalDeFrise, gabion, tent, trebuchet, bombard, shotPile, kegs, graveMarker, mound, pikeStand,
  fireBasket, campClutter, boulders, rampart,
} from './levelProps';

export interface RoadBuild extends AreaOut {
  shrine: ReturnType<typeof stillbellShrine>;
  /** Muzzle of the gate bombard (shots leave from just outside the embrasure). */
  bombardMuzzle: THREE.Vector3;
  /** Fuse glow (registered, dark until the fuse is lit). */
  bombardLight: THREE.PointLight;
}

export const ROAD_ZONE = box3(-50, -2, -19.5, 30, 7.4, 72);
export const RAMPART_ZONE = box3(-50, 7.4, -27, 18, 16, -8);

export function buildRoad(ctx: AreaCtx): RoadBuild {
  const k = newKit(ctx, 'road', 301);
  const out = emptyOut();
  const R = PLAN.road, C = PLAN.curtain, G = PLAN.gatehouse, T = PLAN.siegeTower;
  const Y = 0;

  // ---------------------------------------------------------------- ground, road, bounds
  k.solid(-48, -1, -19.5, 29.2, 0, 70);                      // the valley floor (collider)
  floor(k, 'cobble', R.x0, R.z0, R.x1, 68, 0.012, 0.3, false);
  for (const s of [-1, 1]) k.bmm('stone_dark', s > 0 ? R.x1 : R.x0 - 0.35, -0.2, R.z0, s > 0 ? R.x1 + 0.35 : R.x0, 0.06, 68, { cast: false });
  for (let i = 0; i < 18; i++) k.box(i % 3 ? 'mud' : 'water', k.rng.range(-7, 7), 0.016, k.rng.range(-17, 66), k.rng.range(0.8, 2.6), 0.01, k.rng.range(0.5, 1.6), { ry: k.rng.range(0, 3), cast: false });
  // cart ruts
  for (const s of [-1, 1]) k.bmm('mud', s * 2.1 - 0.25, 0.014, -18, s * 2.1 + 0.25, 0.02, 66, { cast: false });
  bound(k, -47.6, -19.5, -47.6, 70, -1, 12);
  bound(k, 29.2, -19.5, 29.2, 70, -1, 12);
  bound(k, -48, 69.5, 29.2, 69.5, -1, 12);
  // valley terrain: snowfields rising into rock slopes west, east and south
  const hf = (x: number, z: number) => {
    let h = Math.abs(x) < 9.6 ? -0.06 : 0.02 + fbm2(x * 0.25, z * 0.25, 7) * 0.12;
    if (x < -46) h = Math.max(h, Math.pow((-46 - x) * 0.95, 1.18) + fbm2(x * 0.12, z * 0.12, 3) * 3);
    if (x > 28) h = Math.max(h, Math.pow((x - 28) * 0.85, 1.18) + fbm2(x * 0.12, z * 0.12, 4) * 3);
    if (z > 67) h = Math.max(h, Math.pow((z - 67) * 0.8, 1.15) + fbm2(x * 0.1, z * 0.1, 5) * 2);
    return h;
  };
  const mud = (x: number, z: number) => (Math.abs(x) < 10.5 ? 1 - Math.max(0, Math.abs(x) - 8.5) / 2 : 0) + (x < -12 && x > -36 && z > 16 && z < 46 ? 0.45 * fbm2(x * 0.4, z * 0.4, 9) : 0);
  terrainPatch(ctx, -80, -19, 60, 95, 1.6, hf, mud);
  for (let i = 0; i < 16; i++) {
    const west = i % 2 === 0;
    const x = west ? k.rng.range(-62, -50) : k.rng.range(31, 44);
    const z = k.rng.range(-15, 80);
    const r = k.rng.range(2, 4.5);
    rockProp(k, x, hf(x, z) - r * 0.3, z, r, 500 + i, 0.8);
    snowDrift(ctx, x, hf(x, z) + r * 0.25, z, r * 0.9, r * 0.8, r * 0.35, 600 + i);
  }
  for (let i = 0; i < 10; i++) { const x = k.rng.range(-70, -52), z = k.rng.range(0, 80); deadTree(k, x, hf(x, z) - 0.3, z, k.rng.range(5, 9), 70 + i); }
  for (let i = 0; i < 8; i++) { const x = k.rng.range(34, 52), z = k.rng.range(-10, 80); deadTree(k, x, hf(x, z) - 0.3, z, k.rng.range(5, 8), 90 + i); }
  driftLine(ctx, R.x0 - 1.6, -17, R.x0 - 1.6, 66, 0, 26, 11, 0.9);
  driftLine(ctx, R.x1 + 1.6, -12, R.x1 + 1.6, 66, 0, 26, 12, 0.9);

  // ---------------------------------------------------------------- Stillbell: the Siege Road
  const shrine = stillbellShrine(k, PLAN.roadBell.x, Y, PLAN.roadBell.z, YAW_S, 7);
  fireBasket(k, PLAN.roadBell.x + 2.2, Y, PLAN.roadBell.z + 0.8, 0.9);
  snowCap(ctx, PLAN.roadBell.x - 1.0, PLAN.roadBell.z - 0.7, PLAN.roadBell.x + 1.0, PLAN.roadBell.z + 0.7, 3.25, 0.08, 0.05);

  // ---------------------------------------------------------------- the besiegers' camp (west)
  tent(k, -26, Y, 34, 0.3, 3.4, 4.4, 2.5, 'cloth_linen');
  tent(k, -19.5, Y, 41, -0.2, 3.0, 4, 2.3, 'cloth_brown');
  tent(k, -32, Y, 23, 0.9, 3.4, 4.2, 2.5, 'cloth_linen');
  tent(k, -37, Y, 36, 0.1, 4, 5, 2.8, 'cloth_red');
  for (const [x, z] of [[-26, 34], [-19.5, 41], [-32, 23], [-37, 36]] as const) snowCap(ctx, x - 0.3, z - 2, x + 0.3, z + 2, 2.3, 0.1, 0.1);
  palisade(k, -11.2, 22, -11.2, 30, Y, 2.4);
  palisade(k, -11.2, 33, -11.2, 39, Y, 2.4);
  palisade(k, -44, 16, -30, 14, Y, 2.8);
  fireBasket(k, -23, Y, 28, 1.1);
  k.light(0xff8a40, 10, 14, -23, 1.8, 28, 0.9);
  pikeStand(k, -15.5, Y, 36, YAW_E);
  weaponRack(k, -29, Y, 29, 0.3, 2.2);
  campClutter(k, -17, Y, 25, 1);
  campClutter(k, -34, Y, 30, 2);
  campClutter(k, -28, Y, 44, 3);
  cart(k, -14, Y, 46, 0.4, false, true);
  trebuchet(k, -38, Y, 50, 0.35, false);
  trebuchet(k, -25, Y, 8, 0.3, true);
  shotPile(k, -30, Y, 12, 0.22);
  shotPile(k, -36, Y, 44, 0.22);
  driftLine(ctx, -44, 16.5, -30, 14.5, 0, 8, 21, 0.7);
  snowCap(ctx, -39, 48, -37, 52, 1.1, 0.1);
  // camp scrap (tempered scrap in the red command tent)
  out.anchors.campScrap = anchor(-37, Y + 0.05, 36.5, YAW_S);
  crate(k, -37.6, Y, 35.2, 0.2, 0.7, true);

  // ---------------------------------------------------------------- victory monument and the mass graves (east)
  const mx = 14, mz = 34;
  k.push(mx, Y, mz, YAW_W);   // front faces the road (−X)
  k.box('stone_dark', 0, 0.3, 0, 4.6, 0.6, 3.0, { col: true });
  k.box('stone_trim', 0, 0.75, 0, 4.0, 0.3, 2.4, { col: true });
  k.box('stone_trim', 0, 3.4, -0.4, 3.6, 5.0, 1.0, { col: true });
  k.box('stone_wall', 0, 6.2, -0.4, 2.2, 0.6, 0.8);
  k.add('stone_trim', new THREE.ConeGeometry(0.9, 5.5, 4), { y: 9.2, z: -0.4, ry: Math.PI / 4 });
  k.add('gold_trim', new THREE.SphereGeometry(0.35, 8, 6), { y: 12.1, z: -0.4 }, { cast: false });
  // relief: a rank of victorious soldiers and the Marshal raised on shields
  for (let i = 0; i < 9; i++) {
    const fx = -1.5 + i * 0.375, fh = i === 4 ? 1.5 : 1.05;
    k.box('stone_wall', fx, 1.3 + fh / 2, 0.14, 0.24, fh, 0.08, { cast: false });
    k.add('stone_wall', new THREE.SphereGeometry(0.11, 6, 4), { x: fx, y: 1.42 + fh, z: 0.14 }, { cast: false });
    k.box('stone_wall', fx + 0.12, 1.4 + fh * 0.8, 0.18, 0.03, fh * 1.3, 0.03, { rz: 0.12, cast: false });
  }
  k.box('stone_wall', 0, 3.2, 0.15, 1.2, 0.12, 0.08, { cast: false });
  k.box('gold_trim', 0, 5.4, 0.12, 3.0, 0.3, 0.02, { cast: false });
  k.pop();
  armyStandard(ctx, k, mx - 0.4, Y, mz - 3.4, YAW_W, 6.5, 1.3, 3.0, false);
  armyStandard(ctx, k, mx - 0.4, Y, mz + 3.4, YAW_W, 6.5, 1.3, 3.0, false);
  snowCap(ctx, mx - 0.9, mz - 2.2, mx + 0.1, mz + 2.2, 5.9, 0.12);
  out.anchors.victoryRelief = anchor(mx - 3.0, Y, mz, YAW_E);
  out.anchors.musterSoldier = anchor(mx - 2.6, Y, mz + 2.2, yawTo(mx - 2.6, mz + 2.2, mx, mz + 1));
  // graves: rows of mounds with markers, from the monument to the eastern slope
  const kinds = ['cross', 'sword', 'shield'] as const;
  let gi = 0;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
    const gx = 17.5 + col * 1.75 + (row % 2) * 0.4, gz = 14 + row * 5.5 + k.rng.range(-0.3, 0.3);
    if (gz > 30 && gz < 38 && gx < 19) continue;
    mound(k, gx, Y, gz, 0, 2.3);
    snowDrift(ctx, gx, Y + 0.05, gz, 0.6, 1.2, 0.3, 700 + gi);
    graveMarker(k, gx, Y, gz - 1.25, YAW_S, kinds[gi % 3], k.rng.range(-0.15, 0.15));
    gi++;
  }
  out.anchors.massGrave = anchor(16, Y, 22.5, YAW_E);
  // a shovel and a lime cart by the pit
  cart(k, 20, Y, 44, 1.3, false, true);
  k.box('timber', 16.4, 0.7, 43, 0.05, 1.4, 0.05, { rx: 0.4, cast: false });

  // ---------------------------------------------------------------- the killing ground (cover under the bombard)
  const cover: [number, number, number][] = [[-4.5, 13, 0.1], [5.5, 7, -0.25], [-2.5, 1, 0.15], [3.5, -5, -0.05], [-6, -11, 0.35]];
  for (const [x, z, yaw] of cover) { mantlet(k, x, Y, z, yaw); snowCap(ctx, x - 1.1, z - 0.1, x + 1.1, z + 0.1, 2.25, 0.08, 0.02); }
  for (const [x, z] of [[6.8, -12.8], [7.9, -12.2], [7.4, -13.8]] as const) gabion(k, x, Y, z);
  cart(k, 0.5, Y, 17.5, 1.9, true, true);
  cart(k, -7, Y, -2, -0.6, true, true);
  chevalDeFrise(k, -7.5, Y, -15.5, 0.1, 3.4);
  chevalDeFrise(k, 7.5, Y, 1.5, -0.2, 3.4);
  // scorch craters marking the lane the bombard covers
  for (const [x, z, r] of [[1.5, 9, 1.4], [-1, -2.5, 1.2], [4.5, -9, 1.5], [-3.5, 5.5, 1.0], [2, 14.5, 1.1]] as const) {
    k.add('timber_burnt', new THREE.CircleGeometry(r, 10).rotateX(-Math.PI / 2), { x, y: 0.02, z }, { cast: false });
    rubble(k, x + r * 0.7, Y, z - r * 0.3, 0.35, true);
  }
  const toll = V(-1.5, Y, 21.5);
  bellPost(k, toll.x, Y, toll.z, 0.2);
  out.tolls.push({ id: 'toll_road', pos: toll.clone(), radius: 3.8, options: [
    { id: 'gate', toward: V(0, Y, -16) }, { id: 'tower', toward: V(-10.6, Y, 7.5) }, { id: 'breach', toward: V(22, Y, -13) },
  ] });

  // ---------------------------------------------------------------- the curtain wall (walk y = 8)
  const cz = C.z, top = C.top;
  // west: whole, with the siege tower's bridge gap in the merlons
  const Cs = PLAN.casemate;
  rampart(k, 'x', cz, -50, Cs.x0, -1, top, C.t, { outer: 1, walk: true });
  rampart(k, 'x', cz, Cs.x0, Cs.x1, 3.6, top, C.t, { outer: 1, walk: true });
  rampart(k, 'x', cz, Cs.x1, G.x0, -1, top, C.t, { outer: 1, walk: true, gaps: [[T.x0 + 0.5, T.x1 - 0.3]] });
  // east of the gatehouse: the bombard's embrasure
  rampart(k, 'x', cz, G.x1, PLAN.breach.x0, -1, top, C.t, { outer: 1, walk: true, gaps: [[11.4, 13.6]], innerGaps: [[8.8, 16.4]] });
  parapet(k, 'stone_wall', PLAN.breach.x0 - 0.3, cz - 1.5, PLAN.breach.x0 - 0.3, cz + 1.5, top, 0.4, 1.0);
  // east of the breach (no walk access: bounded)
  rampart(k, 'x', cz, PLAN.breach.x1, 50, -1, top, C.t, { outer: 1 });
  bound(k, PLAN.breach.x1, cz, 50, cz, top, 3, C.t);
  // buttresses on the outer face
  for (const x of [-38.5, -31, -25, -11, 32, 40]) k.bmm('stone_dark', x - 0.8, -1, cz + 1.5, x + 0.8, 4.5, cz + 2.6, { col: true });
  // snow on the wall and walk edges
  snowCap(ctx, -50, cz + 1.2, G.x0, cz + 1.5, top + 1.8, 0.1);
  snowCap(ctx, PLAN.breach.x1, cz + 1.2, 50, cz + 1.5, top + 1.8, 0.1);
  driftLine(ctx, -46, cz + 2.3, -9, cz + 2.3, 0, 16, 31, 1.0);
  driftLine(ctx, 30, cz + 2.3, 48, cz + 2.3, 0, 7, 32, 1.0);
  driftLine(ctx, -46, cz - 0.8, -9, cz - 0.8, top, 12, 33, 0.35);
  // banners: triumphal on the whole west wall, burned on the breach side
  armyBanner(ctx, k, -30, top - 0.8, cz + 1.55, YAW_S, 1.6, 4.2, false);
  armyBanner(ctx, k, -40, top - 0.8, cz + 1.55, YAW_S, 1.6, 4.2, false);
  armyBanner(ctx, k, 14.5, top - 0.8, cz + 1.55, YAW_S, 1.4, 3.6, true);
  armyBanner(ctx, k, 34, top - 0.8, cz + 1.55, YAW_S, 1.6, 4.0, true);
  // crossbow post at the west end of the walk (arbalest, bolts, the pinning-shot scroll)
  crateStack(k, -46.2, top, cz - 0.6, 0.2, true);
  barrel(k, -45.4, top, cz + 0.3, 0, true);
  out.anchors.arbalest = anchor(-44.4, top, cz - 0.5, YAW_W);
  weaponRack(k, -47.3, top, cz - 0.3, YAW_E, 1.4);

  // ---------------------------------------------------------------- the Outer Gate (gatehouse)
  const gy = top, gTop = G.top, pw = G.passW / 2;
  k.bmm('stone_wall', G.x0, -1, G.z0, -pw, gy, G.z1, { col: true });
  k.bmm('stone_wall', pw, -1, G.z0, G.x1, gy, G.z1, { col: true });
  k.bmm('stone_wall', -pw, 5.6, G.z0, pw, gy, G.z1, { col: true });
  k.bmm('flagstone', -pw, -0.02, G.z0, pw, 0.02, G.z1, { cast: false });
  k.solid(-pw, -1, G.z0 - 0.1, pw, 0, G.z1 + 0.1);
  // pointed arch faces and the half-raised, twisted portcullis
  for (const zz of [G.z1 + 0.05, G.z0 - 0.05]) {
    k.box('stone_trim', -pw - 0.25, 2.8, zz, 0.5, 5.6, 0.25, { cast: false });
    k.box('stone_trim', pw + 0.25, 2.8, zz, 0.5, 5.6, 0.25, { cast: false });
    k.box('stone_trim', -1.6, 5.9, zz, 3.4, 0.5, 0.25, { rz: 0.25, cast: false });
    k.box('stone_trim', 1.6, 5.9, zz, 3.4, 0.5, 0.25, { rz: -0.25, cast: false });
  }
  for (let i = 0; i <= 14; i++) {
    const xx = -pw + 0.2 + i * (G.passW - 0.4) / 14;
    const bent = i > 8 ? (i - 8) * 0.05 : 0;
    k.box('iron', xx, 5.2 - (i > 8 ? (i - 8) * 0.22 : 0), -21.2, 0.07, 1.8, 0.07, { rz: bent, cast: false });
  }
  k.box('iron', 0, 4.4, -21.2, G.passW - 0.2, 0.07, 0.06, { rz: -0.06, cast: false });
  // upper corridor through the gatehouse (walk level): walls around it, roof above
  const cz0 = cz - 1.2, cz1 = cz + 1.2;
  k.bmm('stone_wall', G.x0, gy, G.z0, G.x1, gTop, cz0, { col: true });
  k.bmm('stone_wall', G.x0, gy, cz1, G.x1, gTop, G.z1, { col: true });
  k.bmm('stone_wall', G.x0, gy + 3.2, cz0, G.x1, gTop, cz1, { col: true });
  k.bmm('flagstone', G.x0, gy - 0.02, cz0, G.x1, gy + 0.01, cz1, { cast: false });
  k.bmm('timber_dark', G.x0 + 0.5, gy + 3.0, cz0, G.x1 - 0.5, gy + 3.2, cz1, { cast: false });
  sconceTorch(k, 0, gy + 1.9, cz0 + 0.02, YAW_S);
  for (const xx of [-4.5, 0, 4.5]) slit(k, xx, gy + 1.6, G.z1 + 0.01, YAW_S, 0.22, 1.2);
  // roof crenellations, turrets flanking the gate
  k.bmm('stone_trim', G.x0 - 0.3, gTop - 0.4, G.z0 - 0.3, G.x1 + 0.3, gTop + 0.05, G.z1 + 0.3, { cast: false });
  crenellation(k, 'stone_wall', G.x0, G.z1 - 0.25, G.x1, G.z1 - 0.25, gTop, 0.5, { col: false, base: 0.7, merlonH: 0.9 });
  crenellation(k, 'stone_wall', G.x0, G.z0 + 0.25, G.x1, G.z0 + 0.25, gTop, 0.5, { col: false, base: 0.7, merlonH: 0.9 });
  // corbelled bartizans on the gatehouse's front corners (no footprint: the bombard fires past them)
  for (const s of [-1, 1]) {
    k.add('stone_trim', cyl(1.3, 0.5, 1.6, 12), { x: s * 7.1, y: gTop - 4.6, z: G.z1 + 0.3 });
    k.add('stone_wall', cyl(1.3, 1.3, 5.2, 12), { x: s * 7.1, y: gTop - 3.0, z: G.z1 + 0.3 });
    k.add('roof_slate', new THREE.ConeGeometry(1.7, 3.6, 12), { x: s * 7.1, y: gTop + 4.0, z: G.z1 + 0.3 });
    slit(k, s * 7.1, gTop - 0.5, G.z1 + 1.61, YAW_S, 0.16, 0.9);
  }
  armyBanner(ctx, k, 0, gTop - 1.2, G.z1 + 0.05, YAW_S, 2.2, 5.5, false);
  snowCap(ctx, G.x0 - 0.3, G.z0 - 0.3, G.x1 + 0.3, G.z1 + 0.3, gTop + 0.05, 0.14);
  fireBasket(k, -4.5, Y, G.z1 + 1.8, 1.0);
  fireBasket(k, 4.5, Y, G.z1 + 1.8, 1.0);
  k.light(0xff9c50, 9, 13, -4.5, 1.8, G.z1 + 1.8, 0.9);
  k.light(0xff9c50, 9, 13, 4.5, 1.8, G.z1 + 1.8, 0.9);

  // ---------------------------------------------------------------- the bombard platform (east walk, bailey side)
  const bx0 = 8.6, bx1 = 16.6, bz0 = -27, bz1 = cz - C.t / 2;
  k.bmm('planks', bx0, top - 0.3, bz0, bx1, top + 0.01, bz1, { col: 'wood' });
  for (const [x, z] of [[bx0 + 0.3, bz0 + 0.3], [bx1 - 0.3, bz0 + 0.3], [(bx0 + bx1) / 2, bz0 + 0.3]] as const) {
    k.box('timber_dark', x, (top - 0.3) / 2, z, 0.35, top - 0.3, 0.35, { col: 'wood' });
    k.box('timber_dark', x, top * 0.45, z + 1.6, 0.2, 0.2, 3.4, { rx: 0.95, cast: false });
  }
  for (const [a, b, c2, d] of [[bx0, bz0, bx1, bz0], [bx0, bz0, bx0, bz1], [bx1, bz0, bx1, bz1]] as const) parapet(k, 'timber_dark', a, b, c2, d, top, 0.2, 1.05, { surface: 'wood' });
  const muzzleLocal = bombard(k, 12.5, top, -23.6, YAW_S, true);
  shotPile(k, 10.0, top, -25.8, 0.2);
  kegs(k, 14.7, top + 0.37, -26.2, 2, true);
  void muzzleLocal;
  const bombardMuzzle = V(12.5, top + 1.25, cz + 1.9);
  const bombardLight = k.light(0xff8a40, 0, 9, 12.5, top + 1.5, cz + 1.2, 0);

  // ---------------------------------------------------------------- the breach (east): rubble ramp over the fallen wall
  const Bx0 = PLAN.breach.x0, Bx1 = PLAN.breach.x1, bc = (Bx0 + Bx1) / 2, by = 2.6;
  k.bmm('stone_wall', Bx0, -1, cz - 1.5, Bx0 + 1.6, 5.2, cz + 1.5, { col: true });
  k.bmm('stone_wall', Bx1 - 1.6, -1, cz - 1.5, Bx1, 4.0, cz + 1.5, { col: true });
  for (let i = 0; i < 6; i++) k.box('stone_wall', Bx0 + 0.4 + i * 0.2, 5.2 + i * 0.1, cz + k.rng.range(-1, 1), 0.8, 0.6 + i * 0.1, 0.9, { rz: i * 0.2, ry: i * 0.3 });
  k.ramp([bc, 0, -12.5], [bc, by, cz + 1.0], 6.6, 0.6, 'stone');
  k.solid(Bx0 + 1.6, -1, cz - 1.0, Bx1 - 1.6, by, cz + 1.0);
  k.ramp([bc, by, cz - 1.0], [bc, 0, -29.5], 6.6, 0.6, 'stone');
  const rr = k.rng;
  for (let i = 0; i < 26; i++) {
    const zt = rr.range(-29, -12.5);
    const hgt = zt > cz ? by * (1 - (zt - cz - 1) / (-12.5 - cz - 1)) : by * (1 - (cz - 1 - zt) / (cz - 1 + 29.5));
    k.add(i % 3 ? 'stone_wall' : 'rubble', rock(rr.range(0.5, 1.2), 800 + i, 0.55), { x: rr.range(Bx0 + 1.8, Bx1 - 1.8), y: Math.max(0, Math.min(by, hgt)) - 0.35, z: zt, ry: rr.range(0, 6) });
  }
  bound(k, Bx0 + 1.65, -12.5, Bx0 + 1.65, -29.5, 0, 6, 0.3);
  bound(k, Bx1 - 1.65, -12.5, Bx1 - 1.65, -29.5, 0, 6, 0.3);
  driftLine(ctx, Bx0 + 2, -13, Bx1 - 2, -13, 0, 4, 41, 0.8);
  snowCap(ctx, Bx0, cz - 1.5, Bx0 + 1.6, cz + 1.5, 5.2, 0.12);

  // ---------------------------------------------------------------- the siege tower and its gangway (west)
  const tx0 = T.x0, tx1 = T.x1, tz0 = T.z0, tz1 = T.z1, ty = T.top;
  // frame
  for (const [x, z] of [[tx0, tz0], [tx1, tz0], [tx0, tz1], [tx1, tz1]] as const) k.box('timber_dark', x, 6.3, z, 0.45, 12.6, 0.45, { col: 'wood' });
  for (const yy of [3.5, 8 - 0.35, 12.3]) {
    k.bmm('timber_dark', tx0, yy - 0.15, tz0, tx1, yy + 0.15, tz0 + 0.3, { cast: false });
    k.bmm('timber_dark', tx0, yy - 0.15, tz1 - 0.3, tx1, yy + 0.15, tz1, { cast: false });
  }
  // cladding: west (with a low gap into the ground room), south, east (below the deck)
  const clad = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, gap?: [number, number]) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const L = alongX ? x1 - x0 : z1 - z0, n = Math.round(Math.abs(L) / 0.34);
    for (let i = 0; i < n; i++) {
      const a = (alongX ? x0 : z0) + (L * (i + 0.5)) / n;
      if (gap && a > gap[0] && a < gap[1] && y0 < 1) {
        if (alongX) k.box('planks', a, (3.2 + y1) / 2, z0, 0.32, y1 - 3.2, 0.12, { variant: i % 3 });
        else k.box('planks', x0, (3.2 + y1) / 2, a, 0.12, y1 - 3.2, 0.32, { variant: i % 3 });
        continue;
      }
      if (alongX) k.box('planks', a, (y0 + y1) / 2, z0, 0.32, y1 - y0, 0.12, { variant: i % 3 });
      else k.box('planks', x0, (y0 + y1) / 2, a, 0.12, y1 - y0, 0.32, { variant: i % 3 });
    }
    // hides nailed over the planks
    if (alongX) k.box('leather_dark', (x0 + x1) / 2, (y0 + y1) / 2 + 0.3, z0 + 0.09, Math.abs(L) * 0.7, (y1 - y0) * 0.5, 0.03, { cast: false });
    else k.box('leather_dark', x0 - 0.09, (y0 + y1) / 2 + 0.3, (z0 + z1) / 2, 0.03, (y1 - y0) * 0.5, Math.abs(L) * 0.7, { cast: false });
  };
  clad(tx0, tz0, tx0, tz1, 0, 11.5, [-12.6, -10.2]);
  clad(tx0, tz1, tx1, tz1, 0, 11.5);
  clad(tx1, tz0 + 5, tx1, tz1, 0, ty);
  clad(tx1, tz0, tx1, tz0 + 5, 0, 3.4);
  k.solid(tx0 - 0.1, 0, tz0, tx0 + 0.1, 12, -12.6);
  k.solid(tx0 - 0.1, 0, -10.2, tx0 + 0.1, 12, tz1);
  k.solid(tx0 - 0.1, 3.2, -12.6, tx0 + 0.1, 12, -10.2);
  k.solid(tx0, 0, tz1 - 0.1, tx1, 12, tz1 + 0.1, 'wood');
  k.solid(tx1 - 0.1, 0, tz0 + 5, tx1 + 0.1, ty, tz1, 'wood');
  k.solid(tx1 - 0.1, 0, tz0, tx1 + 0.1, 3.4, tz0 + 5, 'wood');
  k.solid(tx0, 0, tz0 - 0.1, tx1, 3.4, tz0 + 0.1, 'wood');
  k.bmm('planks', tx0, 3.35, tz0, tx1, 3.55, tz1, { col: 'wood' });     // ground-room ceiling / first deck
  // the top deck (y = 8) + the landing east of it where the gangway arrives
  const lx1 = -11.6;
  k.bmm('planks', tx0, ty - 0.3, tz0, tx1, ty + 0.01, tz1, { col: 'wood' });
  k.bmm('planks', tx1, ty - 0.3, tz0, lx1, ty + 0.01, -14, { col: 'wood' });
  k.bmm('planks', tx0 + 0.4, ty - 0.12, cz + C.t / 2 - 0.4, tx1 - 0.2, ty + 0.02, tz0 + 0.05, { col: 'wood' });   // drop-bridge onto the wall
  for (const [a, b, c2, d] of [[tx0, tz0, tx0, tz1], [tx0, tz1, tx1, tz1], [tx1, -14, tx1, tz1], [lx1, tz0, lx1, -14], [tx1, -14, -13.85, -14]] as const) parapet(k, 'timber_dark', a, b, c2, d, ty, 0.18, 1.1, { surface: 'wood' });
  // roof hoarding (partly torn)
  k.bmm('planks', tx0, 12.3, tz0 + 3, tx1, 12.5, tz1, { cast: true });
  k.box('leather_dark', (tx0 + tx1) / 2, 12.6, tz1 - 2, 6.8, 0.05, 3.8, { rx: 0.1, cast: false });
  armyBanner(ctx, k, (tx0 + tx1) / 2, 11.2, tz1 + 0.1, YAW_S, 1.3, 3.2, true);
  // gangway: plank stair on trestles from the road verge up to the landing
  const gx = -12.75;
  stairs(k, 'planks', [gx, Y, 5.5], [gx, ty, -14], 2.1, { floating: true, surface: 'wood' });
  for (let i = 0; i < 5; i++) {
    const z = 3.5 - i * 3.8, h = ((5.5 - z) / 19.5) * ty;
    for (const s of [-1, 1]) k.box('timber_dark', gx + s * 0.95, h / 2, z, 0.18, h, 0.18, { cast: true });
    k.box('timber_dark', gx, h * 0.5, z, 2.0, 0.12, 0.12, { cast: false });
  }
  {
    const run = 19.5, rise = ty, L = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    for (const s of [1, -1]) {
      if (s < 0) continue;
      k.box('timber_dark', gx + s * 1.12, rise / 2 + 1.0, (5.5 - 14) / 2, 0.1, 0.1, L, { rx: ang, cast: false });
      k.solidC(gx + s * 1.12, rise / 2 + 0.7, (5.5 - 14) / 2, 0.2, 1.4, L, [ang, 0, 0], 'wood');
    }
    // west rail only where the gangway is outside the tower
    const L2 = Math.hypot(14.4, 14.4 / run * rise), a2 = ang;
    k.box('timber_dark', gx - 1.12, (14.4 / run * rise) / 2 + 1.0, 5.5 - 7.2, 0.1, 0.1, L2, { rx: a2, cast: false });
    k.solidC(gx - 1.12, (14.4 / run * rise) / 2 + 0.7, 5.5 - 7.2, 0.2, 1.4, L2, [a2, 0, 0], 'wood');
  }
  // the ground room (a loot nook: entered from the west, the slope side)
  out.anchors.towerNook = anchor(-18.6, Y + 0.05, -14.8, YAW_N);
  kegs(k, -20.3, Y + 0.37, -18.2, 2, true);
  crate(k, -15.6, Y, -18, 0.3, 0.8, true);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, y: number, z: number, yaw: number, leash = 16, idle: EnemySpawn['idleAnim'] = 'stand'): EnemySpawn => ({ id: 'army_road_' + id, kind, anchor: anchor(x, y, z, yaw), leash, idleAnim: idle });
  out.enemies.push(
    E('ts1', 'twiceSlain', -18, Y, 31, YAW_E, 18),
    E('ts2', 'twiceSlain', 4.5, Y, 26.5, yawTo(4.5, 26.5, 0, 40), 16),
    E('ts3', 'twiceSlain', 21, Y, 19.5, YAW_N, 14),
    E('hound1', 'warHound', -21.5, Y, 14, YAW_S, 22),
    E('hound2', 'warHound', -18.5, Y, 17.5, 0.4, 22),
    E('pike_a', 'pikeman', -1.6, Y, -10.5, YAW_S, 14),
    E('pike_b', 'pikeman', 0, Y, -10.5, YAW_S, 14),
    E('pike_c', 'pikeman', 1.6, Y, -10.5, YAW_S, 14),
    E('xbow1', 'crossbowman', -37, top, cz - 0.5, YAW_S, 4),
    E('xbow2', 'crossbowman', 8.6, top, cz - 0.6, YAW_S, 3),
    E('xbow3', 'crossbowman', -18.5, ty, -16.5, yawTo(-18.5, -16.5, 0, 0), 4),
    E('crew1', 'cannonCrew', 10.4, top, -24.6, YAW_S, 5),
    E('crew2', 'cannonCrew', 14.6, top, -24.2, YAW_S, 5),
    E('sapper1', 'sapper', -27, top, cz - 0.6, YAW_S, 6),
  );
  out.anchors.bombardAim = anchor(0, 0, 2, YAW_S);

  // ---------------------------------------------------------------- triggers
  out.triggers.roadStart = box3(-16, -1, 36, 4, 5, 52);
  out.triggers.gateLane = box3(-10, -1, -16, 18, 5, 18);
  return { ...out, shrine, bombardMuzzle, bombardLight };
}
