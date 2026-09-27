/**
 * The Lower Bailey (y = 0, x ∈ [−42, 45], z ∈ [−58, −22.5]) and the West Casemate.
 *
 * Inside the Outer Gate: the triumphal Arch of the Nine Winters on the processional way (west),
 * and — twenty paces from it — the lime pit where the same night's dead were laid (east), with a
 * small ossuary cut into the east wall (the Greyford muster roll, a secret). The barbican terrace
 * rises 6 m to the north, reached by the West Stair; sappers throw fire from its hoarding.
 *
 * The West Casemate is a vaulted gallery inside the west wall: from the barbican (landing room
 * and passage at y = 6) a stair tunnel descends to the gallery, which runs south under the curtain
 * to the Postern — barred from inside, it opens onto the Siege Road (shortcut 1).
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  floor, stairs, archway, reliefPanel, bound, bellPost, well, cart, barrel, crate, crateStack, rubble, sconceTorch, slit,
  armourStand, weaponRack, candles, headstone, cyl,
} from '../../world/kit';
import {
  type AreaCtx, type AreaOut, emptyOut, newKit, anchor, yawTo, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, V, box3,
  armyBanner, snowCap, snowDrift, driftLine,
} from './levelCommon';
import { gabion, pikeStand, fireBasket, fallenSoldier, kegs, campClutter, mound, graveMarker } from './levelProps';
import { doorLeaf } from './levelPieces';

export const BAILEY_ZONE = box3(-43.4, -2, -58, 45, 7, -22.5);
export const CASEMATE_ZONES = [box3(-47.6, -2, -84.5, -43.4, 10.5, -19.5), box3(-43.4, 5.5, -83.5, -26, 10.5, -79.5)];
export const OSSUARY_ZONE = box3(42, -2, -55, 48.5, 4, -46);

export function buildBailey(ctx: AreaCtx): AreaOut {
  const k = newKit(ctx, 'bailey', 401);
  const out = emptyOut();
  const B = PLAN.bailey, Y = 0, S = PLAN.baileyStair, Cs = PLAN.casemate;

  // ---------------------------------------------------------------- ground
  k.solid(-47.6, -1, -58.5, 45, 0, -22.4);
  floor(k, 'cobble', -42, -58, 42, -22.5, 0.01, 0.3, false);
  k.bmm('flagstone', -3, 0.012, -30, 3, 0.02, -22.5, { cast: false });
  // the processional way: gate → arch → west stair (flag paving strip)
  {
    const a = V(0, 0, -27), b = V(S.x, 0, S.zLo);
    const L = a.distanceTo(b), yaw = Math.atan2(b.x - a.x, b.z - a.z);
    k.box('flagstone', (a.x + b.x) / 2, 0.018, (a.z + b.z) / 2, 5, 0.012, L, { ry: yaw, cast: false });
  }
  for (let i = 0; i < 14; i++) k.box(i % 3 ? 'mud' : 'water', k.rng.range(-36, 38), 0.022, k.rng.range(-56, -24), k.rng.range(0.8, 2.4), 0.01, k.rng.range(0.6, 1.8), { ry: k.rng.range(0, 3), cast: false });

  // ---------------------------------------------------------------- walls: west (casemate), east, terrace face
  // casemate: outer wall, bailey-side wall with loops, vault above
  k.bmm('stone_wall', -49.2, -1, -58, Cs.x0, 8, -19.5, { col: true });
  k.bmm('stone_wall', -49.2, -1, -92, Cs.x0, 12, -58, { col: true });
  k.bmm('stone_dark', Cs.x0, 8, -62, Cs.x1, 12, -58, { col: true });
  k.bmm('stone_wall', Cs.x1, -1, -58, -42, 8, B.z1, { col: true });
  k.bmm('stone_dark', Cs.x0, 3.6, -62, Cs.x1, 8, B.z1, { col: true });
  k.bmm('flagstone', Cs.x0, -0.02, -62, Cs.x1, 0.01, -19.5, { cast: false });
  k.solid(Cs.x0, -1, -62.1, Cs.x1, 0, -58.4);
  k.solid(Cs.x0, -1, -22.6, Cs.x1, 0, -19.3);
  k.bmm('stone_trim', -42.05, 7.2, -58, -41.8, 7.5, B.z1, { cast: false });
  for (let z = -54; z > -24; z -= 6) {
    slit(k, -41.99, 1.8, z, YAW_E, 0.2, 1.1);
    k.box('stone_trim', -42, 0.2, z, 0.3, 0.4, 1.4, { cast: false });
  }
  rampartTop(k, -49.2, -42, -58, B.z1, 8);
  // postern: the gallery narrows through the curtain; the door opens onto the Siege Road
  const pz0 = PLAN.curtain.z - 1.5, pz1 = PLAN.curtain.z + 1.5;
  k.bmm('stone_wall', Cs.x0, -1, pz0, -46.7, 3.6, pz1, { col: true });
  k.bmm('stone_wall', -44.3, -1, pz0, Cs.x1, 3.6, pz1, { col: true });
  k.bmm('stone_wall', -46.7, 3.0, pz0, -44.3, 3.6, pz1, { col: true });
  k.bmm('stone_trim', -46.9, 0, pz1, -46.6, 3.2, pz1 + 0.12, { cast: false });
  k.bmm('stone_trim', -44.4, 0, pz1, -44.1, 3.2, pz1 + 0.12, { cast: false });
  k.bmm('stone_trim', -46.9, 3.0, pz1, -44.1, 3.3, pz1 + 0.12, { cast: false });
  const postern = doorLeaf(ctx, 'postern', -46.7, 0, pz1 - 0.25, 0, 2.4, 3.0, -1.55, anchor(-45.5, 0, pz0 - 0.8, YAW_S), { iron: true, bar: false });
  out.pieces.postern = postern;
  out.anchors.posternInside = anchor(-45.5, 0, pz0 - 0.8, YAW_S);
  out.anchors.posternOutside = anchor(-45.5, 0, pz1 + 1.4, YAW_N);
  // a barring beam in brackets on the inner side (removed when opened: part of the door leaf's look)
  sconceTorch(k, Cs.x1 - 0.02, 2.2, -24, YAW_W);
  sconceTorch(k, Cs.x1 - 0.02, 2.2, -44, YAW_W);
  k.light(0xff9c50, 5, 9, -44.3, 2.2, -34, 0.9);
  // gallery dressing: racks, bunks, a loop-hole crew's spent bolts
  for (let z = -26; z > -60; z -= 4) k.box('timber_dark', Cs.x0 + 0.2, 3.3, z, 0.25, 0.25, 0.3, { cast: false });
  for (let z = -27; z > -60; z -= 1.2) k.box('timber_dark', (Cs.x0 + Cs.x1) / 2, 3.45, z, 4, 0.18, 0.18, { cast: false });
  crateStack(k, Cs.x0 + 0.6, Y, -30, 0.1, true);
  barrel(k, Cs.x0 + 0.5, Y, -51, 0, true);
  // the alcove (loot nook): a gatewarden's armour stand in a niche in the outer wall
  k.bmm('stone_dark', -49.2, -0.01, -41.2, Cs.x0, 3.2, -38.8, { cast: false });   // back of the niche (visual)
  armourStand(k, -47.0, Y, -40, YAW_E, 'steel_armor', 'cloth_red');
  candles(k, -46.6, Y, -38.9, 4, 0.12);
  out.anchors.casemateAlcove = anchor(-46.2, Y, -40, YAW_W);
  // north end: stair tunnel up to the landing room (y 6), then the passage east to the barbican
  const sx = (Cs.x0 + Cs.x1) / 2;
  stairs(k, 'stone_wall', [sx, Y, -62], [sx, 6, -79], Cs.x1 - Cs.x0, { baseY: -1 });
  for (let i = 0; i < 5; i++) {
    const za = -62 - i * 3.4, zb = za - 3.4, fy = ((-za - 62) / 17) * 6;
    k.bmm('stone_dark', Cs.x0, fy + 3.6, zb, Cs.x1, 12, za, { col: true });
  }
  k.bmm('stone_wall', Cs.x0, -1, -79, Cs.x1, 6, -84, { col: true });
  k.bmm('flagstone', Cs.x0, 5.98, -79, Cs.x1, 6.01, -84, { cast: false });
  k.bmm('stone_dark', Cs.x0, 9.6, -79, Cs.x1, 12, -84, { col: true });
  k.bmm('stone_wall', Cs.x0, -1, -84, Cs.x1, 12, -92, { col: true });
  // passage east (y 6) to the barbican's west door at x = −26
  const pw0 = -83, pw1 = -80;
  k.bmm('stone_wall', Cs.x1, -1, pw0, -26, 6, pw1, { col: true });
  k.bmm('flagstone', Cs.x1, 5.98, pw0, -26, 6.01, pw1, { cast: false });
  k.bmm('stone_dark', Cs.x1, 9.2, pw0, -26, 12, pw1, { col: true });
  k.bmm('stone_wall', Cs.x1, -1, -58, -26, 12, pw1, { col: true });
  k.bmm('stone_wall', Cs.x1, -1, pw0, -26, 12, -92, { col: true });
  sconceTorch(k, -34, 8, pw1 - 0.02, YAW_N);
  k.light(0xff9c50, 4, 8, -34, 8, pw1 - 0.5, 0.9);
  sconceTorch(k, Cs.x0 + 0.02, 8, -81.5, YAW_E);

  // east wall (the ossuary is cut into it)
  const ex0 = 42, ex1 = 45;
  k.bmm('stone_wall', ex0, -1, -58, ex1, 8, -53.5, { col: true });
  k.bmm('stone_wall', ex0, -1, -51.5, ex1, 8, B.z1, { col: true });
  k.bmm('stone_wall', ex0, 2.6, -53.5, ex1, 8, -51.5, { col: true });
  rampartTop(k, ex0, ex1, -58, B.z1, 8);
  // the ossuary: a low vault behind the wall
  k.bmm('stone_dark', ex1, -1, -55, 48.5, 3.4, -54.4, { col: true });
  k.bmm('stone_dark', ex1, -1, -46.6, 48.5, 3.4, -46, { col: true });
  k.bmm('stone_dark', 48, -1, -55, 48.6, 3.4, -46, { col: true });
  k.bmm('stone_dark', ex1, 3.0, -55, 48.6, 3.6, -46, { col: true });
  k.bmm('flagstone', ex0, -0.02, -54.4, 48, 0.01, -46.6, { cast: false });
  k.solid(ex1 - 0.1, -1, -55, 48.6, 0, -46);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) k.add('bone', new THREE.SphereGeometry(0.11, 6, 5), { x: 47.6, y: 0.5 + j * 0.28, z: -53.8 + i * 0.35 }, { cast: false });
  for (let i = 0; i < 10; i++) k.box('bone', 47.5, 0.2 + (i % 3) * 0.1, -50.5 + (i * 0.3), 0.06, 0.06, 0.5, { ry: (i % 2) * 0.3, cast: false });
  candles(k, 46.5, Y, -54, 5, 0.15);
  k.light(0xffb070, 3, 6, 46.5, 1.2, -52, 0.6);
  out.anchors.ossuaryRoll = anchor(47.2, Y + 0.6, -48.5, YAW_W);
  out.anchors.ossuary = anchor(45.8, Y, -48.5, YAW_E);
  kegs(k, 46.4, 0.37, -47.4, 1, false);
  k.box('parchment', 47.2, 0.78, -48.5, 0.3, 0.02, 0.4, { cast: false });

  // terrace face (north, retaining the barbican court at y 6), with buttresses and drains
  k.bmm('stone_wall', -26, -1, -62, 45, 6, -58, { col: true });
  for (const x of [-12, -2, 8, 18, 28, 38]) {
    k.bmm('stone_dark', x - 0.7, -1, -58, x + 0.7, 4.6, -57.2, { col: true });
    k.box('stone_trim', x, 4.75, -57.5, 1.5, 0.3, 1.0, { cast: false });
  }
  for (const x of [-7, 13, 33]) k.add('stone_dark', cyl(0.25, 0.25, 0.8, 8), { x, y: 3.4, z: -57.8, rx: Math.PI / 2 }, { cast: false });
  k.bmm('stone_trim', -26, 5.6, -58.1, 45, 5.95, -57.85, { cast: false });
  armyBanner(ctx, k, -2, 5.6, -57.85, YAW_S, 1.6, 4.0, false);
  armyBanner(ctx, k, 23, 5.6, -57.85, YAW_S, 1.6, 4.0, true);

  // ---------------------------------------------------------------- the West Stair (bailey → barbican)
  stairs(k, 'stone_wall', [S.x, Y, S.zLo], [S.x, 6, S.zHi], S.w, { baseY: -1 });
  {
    const run = S.zLo - S.zHi, rise = 6, L = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    for (const s of [-1, 1]) {
      const xx = S.x + s * (S.w / 2 + 0.2);
      k.box('stone_wall', xx, rise / 2 + 0.45, (S.zLo + S.zHi) / 2, 0.4, 1.1, L, { rx: ang });
      k.box('stone_trim', xx, rise / 2 + 1.02, (S.zLo + S.zHi) / 2, 0.52, 0.12, L, { rx: ang, cast: false });
      k.solidC(xx, rise / 2 + 0.55, (S.zLo + S.zHi) / 2, 0.4, 1.4, L, [ang, 0, 0]);
    }
    k.bmm('stone_wall', S.x - S.w / 2 - 0.4, -1, S.zLo - 0.1, S.x - S.w / 2, 0.9, S.zLo + 0.4, { col: true });
  }
  driftLine(ctx, S.x - S.w / 2 - 1.2, -43, S.x - S.w / 2 - 1.2, -57, 0, 5, 51, 0.7);

  // ---------------------------------------------------------------- the Arch of the Nine Winters (west)
  {
    const ax = -11.5, az = -35.5;
    const yaw = Math.atan2(S.x - 0, S.zLo + 27);
    const top = archway(k, 'stone_trim', ax, Y, az, yaw, 5.2, 5.2, 3.2, 'round', 1.6, 2.2, true);
    k.push(ax, Y, az, yaw);
    // attic with gilded inscription, trophies of arms, reliefs on the pier faces
    k.box('stone_wall', 0, top + 0.6, 0, 9.0, 1.2, 3.4);
    k.box('gold_trim', 0, top + 0.6, 1.72, 6.4, 0.5, 0.03, { cast: false });
    k.box('stone_trim', 0, top + 1.3, 0, 9.4, 0.2, 3.7, { cast: false });
    for (const s of [-1, 1]) {
      k.box('stone_wall', s * 3.4, top + 2.1, 0, 1.2, 1.8, 1.2);
      k.add('bronze', new THREE.SphereGeometry(0.5, 10, 8), { x: s * 3.4, y: top + 3.3, z: 0 }, { cast: false });
      reliefPanel(k, s * 3.42, 0.6, 1.62, 0, 1.3, 3.2);
    }
    k.pop();
    snowCap(ctx, ax - 4.6, az - 1.8, ax + 4.6, az + 1.8, top + 1.4, 0.16);
    armyBanner(ctx, k, ax - 3.2, top - 0.3, az + 1.9, yaw, 1.3, 3.2, false);
    out.anchors.victoryArch = anchor(ax + Math.sin(yaw) * 3.4 + 1.2, Y, az + Math.cos(yaw) * 3.4, yawTo(ax + Math.sin(yaw) * 3.4 + 1.2, az + Math.cos(yaw) * 3.4, ax, az));
    pikeStand(k, -18, Y, -29, 0.3, 6);
    out.anchors.pikeRack = anchor(-18, Y, -30.4, YAW_N);
  }

  // ---------------------------------------------------------------- the lime pit (east): the same night's dead
  {
    const x0 = 12, x1 = 34, z0 = -52, z1 = -31;
    k.bmm('stone_dark', x0 - 0.4, 0, z0 - 0.4, x1 + 0.4, 0.28, z0, { col: true });
    k.bmm('stone_dark', x0 - 0.4, 0, z1, x1 + 0.4, 0.28, z1 + 0.4, { cast: false });
    k.bmm('stone_dark', x0 - 0.4, 0, z0, x0, 0.28, z1, { cast: false });
    k.bmm('stone_dark', x1, 0, z0, x1 + 0.4, 0.28, z1, { col: true });
    k.bmm('plaster', x0, 0.015, z0, x1, 0.03, z1, { cast: false });
    // the shrouded dead in rows (partly snow-covered), stakes with tags
    const r = k.rng;
    for (let row = 0; row < 6; row++) for (let i = 0; i < 9; i++) {
      if (r.chance(0.15)) continue;
      const x = x0 + 1.4 + i * 2.35 + r.range(-0.15, 0.15), z = z0 + 1.8 + row * 3.2 + r.range(-0.2, 0.2);
      k.add('cloth_linen', new THREE.CapsuleGeometry(0.22, 1.35, 3, 8), { x, y: 0.18, z, rx: Math.PI / 2, rz: r.range(-0.1, 0.1) }, { cast: false, variant: (row + i) % 3 });
      if (r.chance(0.35)) snowDrift(ctx, x, 0.05, z, 0.35, 0.9, 0.22, 900 + row * 10 + i);
      if (i % 3 === 0) graveMarker(k, x + 0.9, 0, z - 0.8, YAW_S, 'cross', r.range(-0.2, 0.2));
    }
    cart(k, 36.5, Y, -34, 1.4, false, true);
    for (const [x, z] of [[37, -45], [38, -48]] as const) { k.add('plaster', new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.2, 0.6, 1.0), { x, y: 0, z }, { cast: false }); k.solid(x - 1, 0, z - 0.9, x + 1, 0.5, z + 0.9); }
    k.box('timber', 35.6, 0.7, -41, 0.05, 1.4, 0.05, { rx: 0.3, cast: false });
    out.anchors.limePit = anchor(10.8, Y, -41, YAW_E);
    headstone(k, 10.4, Y, -45.5, YAW_W, 1.2, 0.7, 0.05, 'stone_trim');
  }

  // ---------------------------------------------------------------- bailey dressing
  well(k, -24, Y, -48, 0.3);
  fireBasket(k, -2, Y, -46, 1.1);
  k.light(0xff9c50, 9, 14, -2, 1.9, -46, 0.9);
  campClutter(k, 6, Y, -54, 5);
  campClutter(k, -34, Y, -26.5, 6);
  crate(k, -30, Y, -55.5, 0.3, 0.9, true);
  barrel(k, -28.8, Y, -56, 0, true);
  for (const [x, z] of [[-6, -53], [-5, -54.2], [-35, -40], [-36, -41.2]] as const) gabion(k, x, Y, z);
  fallenSoldier(k, -8, Y, -44, 1.2);
  fallenSoldier(k, 3, Y, -33, -0.6);
  fallenSoldier(k, 20.5, Y, -27, 2.2);
  rubble(k, 23, Y, -25, 1.3, false);
  weaponRack(k, -40.5, Y, -48, YAW_E, 2.4);
  const toll = V(-5, Y, -40);
  bellPost(k, toll.x, Y, toll.z, 0);
  out.tolls.push({ id: 'toll_bailey', pos: toll.clone(), radius: 3.8, options: [
    { id: 'stair', toward: V(S.x, Y, S.zLo) }, { id: 'breach', toward: V(22, Y, -29) }, { id: 'ossuary', toward: V(41, Y, -52.5) },
  ] });
  driftLine(ctx, -41, -24, -41, -57, 0, 12, 61, 0.9);
  driftLine(ctx, 41, -24, 41, -57, 0, 12, 62, 0.9);
  driftLine(ctx, -25, -57, 40, -57, 0, 16, 63, 0.8);
  driftLine(ctx, -40, -24, -10, -24, 0, 8, 64, 0.7);
  snowCap(ctx, -49.2, -58, -42, B.z1, 8.9, 0.12);
  snowCap(ctx, ex0, -58, ex1, B.z1, 8.9, 0.12);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, y: number, z: number, yaw: number, leash = 16, idle: EnemySpawn['idleAnim'] = 'stand'): EnemySpawn => ({ id: 'army_bailey_' + id, kind, anchor: anchor(x, y, z, yaw), leash, idleAnim: idle });
  out.enemies.push(
    E('pike_a', 'pikeman', 4.4, Y, -40, YAW_S, 16),
    E('pike_b', 'pikeman', 6, Y, -40, YAW_S, 16),
    E('pike_c', 'pikeman', 7.6, Y, -40, YAW_S, 16),
    E('knight1', 'siegeKnight', -16, Y, -47, yawTo(-16, -47, 0, -30), 14),
    E('ts1', 'twiceSlain', 19, Y, -36, YAW_W, 14),
    E('ts2', 'twiceSlain', 27, Y, -46, YAW_W, 14),
    E('hound1', 'warHound', 22, Y, -31, YAW_S, 20),
    E('sapper1', 'sapper', -8, 6, -59.2, YAW_S, 4),
    E('sapper2', 'sapper', 10, 6, -59.2, YAW_S, 4),
    E('ts_casemate', 'twiceSlain', -45.5, Y, -48, YAW_S, 12),
  );
  out.triggers.bailey = box3(-40, -1, -40, 40, 5, -23);
  out.triggers.limePit = box3(9, -1, -53, 35, 4, -30);
  return out;
}

/** Crenellated top along a thick wall block (visual only). */
function rampartTop(k: import('../../world/kit').Kit, x0: number, x1: number, z0: number, z1: number, y: number) {
  k.bmm('stone_trim', x0 - 0.1, y - 0.25, z0, x1 + 0.1, y, z1, { cast: false });
  const n = Math.round(Math.abs(z1 - z0) / 1.6);
  for (let i = 0; i < n; i++) {
    const z = z0 + ((z1 - z0) * (i + 0.5)) / n;
    for (const x of [x0 + 0.3, x1 - 0.3]) k.box('stone_wall', x, y + 0.45, z, 0.5, 0.9, 0.9, { cast: false });
  }
}
