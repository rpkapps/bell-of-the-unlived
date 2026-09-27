/**
 * Siegeholm props: siege works (mantlets, palisades, chevaux-de-frise, gabions, trebuchets, the
 * bombards), the camp (tents, racks), the dead (grave markers, cairns), and the hall of the last
 * feast (tables set for a victory, tables overturned for a last stand). All work in the Kit's
 * local frame (front = +Z) and add coarse colliders where they block movement.
 */
import * as THREE from 'three';
import { Kit, cyl, cone, sphere, rock, barrel, crate, sack, candles, flameGeo, FLAME_KEY, crenellation, parapet } from '../../world/kit';
import type { MaterialId } from '../../render/materialIds';

/** Wheeled siege mantlet (pavise wall) 2.3 m wide, leaning back, braced; blocks shots (collider). */
export function mantlet(k: Kit, x: number, y: number, z: number, yaw: number, col = true) {
  k.push(x, y, z, yaw);
  const W = 2.3, H = 2.1;
  const n = 7;
  for (let i = 0; i < n; i++) k.box('planks', -W / 2 + (W * (i + 0.5)) / n, H / 2 + 0.25, 0, W / n - 0.03, H, 0.1, { rx: -0.12, variant: i % 3 });
  for (const yy of [0.7, 1.6]) k.box('iron', 0, yy + 0.25, 0.1 - yy * 0.12, W, 0.08, 0.04, { rx: -0.12, cast: false });
  k.box('timber_dark', 0, 0.3, -0.35, W, 0.12, 0.12, { cast: false });
  for (const s of [-1, 1]) {
    k.box('timber_dark', s * 0.8, 0.9, -0.55, 0.1, 1.5, 0.1, { rx: 0.55, cast: false });
    k.add('timber_dark', cyl(0.28, 0.28, 0.12, 10), { x: s * (W / 2 - 0.1), y: 0.28, z: -0.3, rz: Math.PI / 2 }, { cast: false });
  }
  // arrows and bolts stuck in the face
  for (let i = 0; i < 6; i++) k.box('timber_dark', -0.9 + i * 0.37, 0.9 + ((i * 7) % 5) * 0.2, 0.25, 0.02, 0.02, 0.5, { rx: -0.3 + i * 0.05, ry: (i % 3 - 1) * 0.2, cast: false });
  if (col) k.solid(-W / 2, 0, -0.35, W / 2, H + 0.2, 0.2, 'wood');
  k.pop();
}

/** Palisade of sharpened stakes along a line, with rails; collider along the line. */
export function palisade(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h = 2.6, col = true, gapEvery = 0) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  k.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
  const n = Math.round(len / 0.32);
  for (let i = 0; i < n; i++) {
    if (gapEvery && i % gapEvery === gapEvery - 1) continue;
    const xx = -len / 2 + (len * (i + 0.5)) / n;
    const hh = h * (0.88 + ((i * 37) % 11) / 55);
    const lean = (((i * 13) % 7) - 3) * 0.012;
    k.add('timber_dark', cyl(0.13, 0.15, hh, 6), { x: xx, rz: lean }, { cast: true, variant: i % 2 });
    k.add('timber', cone(0.13, 0.4, 6), { x: xx - lean * hh, y: hh, rz: lean }, { cast: false });
  }
  for (const yy of [0.7, h * 0.72]) k.box('timber_dark', 0, yy, -0.16, len, 0.12, 0.1, { cast: false });
  if (col) k.solid(-len / 2, 0, -0.2, len / 2, h, 0.2, 'wood');
  k.pop();
}

/** Cheval-de-frise: a beam with crossed sharpened stakes (blocks), front +Z. */
export function chevalDeFrise(k: Kit, x: number, y: number, z: number, yaw: number, len = 3.4, col = true) {
  k.push(x, y, z, yaw);
  k.add('timber_dark', cyl(0.14, 0.14, len, 6), { y: 0.55, rz: Math.PI / 2 });
  const n = Math.round(len / 0.45);
  for (let i = 0; i < n; i++) {
    const xx = -len / 2 + 0.2 + (i * (len - 0.4)) / (n - 1);
    const a = i % 2 ? 0.8 : -0.8;
    k.add('timber', cyl(0.05, 0.06, 1.8, 5), { x: xx, y: 0.55, rx: a }, { cast: false });
    k.add('iron', cone(0.05, 0.2, 4), { x: xx, y: 0.55 + Math.cos(a) * 0.95, z: -Math.sin(a) * 0.95, rx: a }, { cast: false });
  }
  if (col) k.solid(-len / 2, 0, -0.7, len / 2, 1.2, 0.7, 'wood');
  k.pop();
}

/** Wicker gabion filled with earth (siege cover). */
export function gabion(k: Kit, x: number, y: number, z: number, r = 0.55, h = 1.3, col = true) {
  k.add('timber', cyl(r, r * 0.96, h, 10), { x, y, z }, { variant: 1 });
  for (let i = 1; i < 5; i++) k.add('rope', cyl(r + 0.015, r + 0.015, 0.05, 10, true), { x, y: y + (h * i) / 5, z }, { cast: false });
  k.add('dirt', cyl(r * 0.94, r * 0.94, 0.1, 10), { x, y: y + h - 0.08, z }, { cast: false });
  if (col) k.solid(x - r, y, z - r, x + r, y + h, z + r, 'wood');
}

/** Ridge tent (w wide, d deep, h high) with poles, guy ropes and an open front flap; front +Z. */
export function tent(k: Kit, x: number, y: number, z: number, yaw: number, w = 3.2, d = 4, h = 2.4, mat: MaterialId = 'cloth_linen', col = true) {
  k.push(x, y, z, yaw);
  const slope = Math.atan2(h, w / 2), L = Math.hypot(h, w / 2);
  for (const s of [-1, 1]) k.box(mat, s * (w / 4), h / 2, 0, 0.04, L, d, { rz: -s * (Math.PI / 2 - slope), variant: 1 });
  // back gable
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  k.add(mat, new THREE.ShapeGeometry(tri), { z: -d / 2 }, { cast: false });
  // front flaps, half open
  for (const s of [-1, 1]) {
    const flap = new THREE.Shape([new THREE.Vector2(0, h), new THREE.Vector2(s * w * 0.12, 0), new THREE.Vector2(s * w / 2, 0)]);
    k.add(mat, new THREE.ShapeGeometry(flap), { z: d / 2 + 0.02 }, { cast: false });
  }
  k.add('timber_dark', cyl(0.04, 0.04, d + 0.4, 5), { y: h, rx: Math.PI / 2 }, { cast: false });
  for (const zz of [-d / 2, d / 2]) k.add('timber_dark', cyl(0.04, 0.05, h + 0.25, 5), { z: zz }, { cast: false });
  for (const s of [-1, 1]) for (const zz of [-d / 2 + 0.3, d / 2 - 0.3]) k.box('rope', s * (w / 2 + 0.5), h * 0.25, zz, 0.02, 0.02, Math.hypot(0.9, h * 0.5), { rz: s * 1.1, cast: false });
  if (col) k.solid(-w / 2, 0, -d / 2, w / 2, h * 0.8, d / 2, 'wood');
  k.pop();
}

/** Trebuchet (counterweight) — intact (arm raised) or broken (arm snapped, lying across). Front +Z. */
export function trebuchet(k: Kit, x: number, y: number, z: number, yaw: number, broken: boolean, col = true) {
  k.push(x, y, z, yaw);
  // base frame
  for (const s of [-1, 1]) k.box('timber_dark', s * 1.3, 0.2, 0, 0.35, 0.4, 7.5);
  for (const zz of [-3.2, 0, 3.2]) k.box('timber_dark', 0, 0.2, zz, 2.9, 0.35, 0.35);
  // A-frames
  for (const s of [-1, 1]) {
    for (const d of [-1, 1]) k.box('timber_dark', s * 1.3, 3.1, d * 1.15, 0.3, 6.6, 0.3, { rx: -d * 0.36 });
    k.box('timber_dark', s * 1.3, 2.4, 0, 0.25, 0.25, 3.2, { cast: false });
  }
  k.add('iron', cyl(0.14, 0.14, 3.2, 8), { y: 6.1, rz: Math.PI / 2 });
  if (!broken) {
    // arm cocked back: long end down behind, counterweight up front
    k.box('timber', 0, 6.1, 0, 0.35, 0.4, 11, { rx: -0.55 });
    k.box('timber_dark', 0, 8.5, 3.9, 2.0, 1.8, 1.6, { cast: true });
    k.box('iron', 0, 7.5, 3.9, 2.05, 0.1, 1.65, { cast: false });
    k.box('rope', 0, 3.5, -4.9, 0.05, 1.8, 0.05, { cast: false });
  } else {
    k.box('timber', 0.3, 3.4, -2.2, 0.35, 0.4, 6.5, { rx: 0.95, rz: 0.2 });
    k.box('timber_burnt', -0.4, 0.4, -5.5, 0.35, 0.4, 4.5, { ry: 0.5, rz: 0.1 });
    k.box('timber_dark', 0.2, 0.9, 3.6, 2.0, 1.8, 1.6, { rz: 0.25, ry: 0.3 });
    k.box('iron', 0.1, 1.8, 3.6, 2.05, 0.1, 1.65, { rz: 0.25, ry: 0.3, cast: false });
  }
  if (col) { k.solid(-1.6, 0, -3.9, 1.6, 2.2, 3.9, 'wood'); k.solid(-1.6, 0, 2.6, 1.6, broken ? 1.8 : 3, 4.6, 'wood'); }
  k.pop();
}

/**
 * Bombard on a timber sledge, barrel along local +Z (muzzle forward). Returns the muzzle world
 * position (for the artillery system) — the barrel's elevation is fixed; aiming is visual only.
 */
export function bombard(k: Kit, x: number, y: number, z: number, yaw: number, col = true): THREE.Vector3 {
  k.push(x, y, z, yaw);
  // sledge
  for (const s of [-1, 1]) k.box('timber_dark', s * 0.55, 0.25, 0, 0.25, 0.5, 3.0);
  for (const zz of [-1.2, 0, 1.2]) k.box('timber_dark', 0, 0.45, zz, 1.4, 0.2, 0.3);
  // barrel (built along +Z): chamber, bands, flared muzzle
  const elev = -0.06;
  k.add('iron', cyl(0.42, 0.46, 1.1, 14), { y: 0.95, z: -0.9, rx: Math.PI / 2 + elev });
  k.add('iron', cyl(0.36, 0.4, 2.2, 14), { y: 0.95, z: 0.6, rx: Math.PI / 2 + elev });
  for (let i = 0; i < 6; i++) k.add('iron_rusted', cyl(0.43 - i * 0.01, 0.43 - i * 0.01, 0.1, 14), { y: 0.95, z: -0.5 + i * 0.4, rx: Math.PI / 2 + elev }, { cast: false });
  k.add('iron', cyl(0.46, 0.4, 0.28, 14, true), { y: 0.95, z: 1.75, rx: Math.PI / 2 + elev }, { cast: false });
  k.add('cloth_black', cyl(0.28, 0.28, 0.05, 12), { y: 0.95, z: 1.88, rx: Math.PI / 2 }, { cast: false });
  // touch-hole and powder ladle, rammer
  k.add('iron', cyl(0.04, 0.04, 0.12, 6), { y: 1.38, z: -1.1 }, { cast: false });
  k.box('timber', 0.8, 0.12, -0.3, 0.06, 0.06, 2.6, { cast: false });
  const muzzle = k.wp(0, 0.95, 1.95);
  if (col) k.solid(-0.75, 0, -1.6, 0.75, 1.35, 1.9, 'metal');
  k.pop();
  return muzzle;
}

/** Pile of iron shot. */
export function shotPile(k: Kit, x: number, y: number, z: number, r = 0.18) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) for (let l = 0; l < 3 - i - j; l++) pts.push([x + (j - (2 - i) / 2 + l * 0.5) * r * 2, y + r + i * r * 1.6, z + (l - (2 - i - j) / 2) * r * 1.7]);
  for (const [px, py, pz] of pts) k.add('iron', sphere(r, 8, 6), { x: px, y: py, z: pz }, { cast: false });
}

/** Powder kegs (n), clustered; the first may be broached. */
export function kegs(k: Kit, x: number, y: number, z: number, n = 4, col = true) {
  for (let i = 0; i < n; i++) {
    const kx = x + (i % 2) * 0.72, kz = z + Math.floor(i / 2) * 0.72;
    k.add('timber', cyl(0.3, 0.3, 0.72, 10), { x: kx, y, z: kz }, { cast: false });
    for (const yy of [0.12, 0.6]) k.add('iron', cyl(0.315, 0.315, 0.05, 10), { x: kx, y: y + yy, z: kz }, { cast: false });
  }
  if (col) k.solid(x - 0.35, y, z - 0.35, x + 0.35 + (n > 1 ? 0.72 : 0), y + 0.75, z + 0.35 + Math.floor((n - 1) / 2) * 0.72, 'wood');
}

/** Grave marker: 'cross' (two planks), 'sword' (a sword in the ground with a helmet), 'shield' (a propped shield). */
export function graveMarker(k: Kit, x: number, y: number, z: number, yaw: number, kind: 'cross' | 'sword' | 'shield', tilt = 0) {
  k.push(x, y, z, yaw);
  if (kind === 'cross') {
    k.box('timber_dark', 0, 0.55, 0, 0.1, 1.1, 0.07, { rz: tilt, cast: false });
    k.box('timber_dark', 0, 0.85, 0.02, 0.55, 0.08, 0.06, { rz: tilt, cast: false });
  } else if (kind === 'sword') {
    k.box('iron_rusted', 0, 0.45, 0, 0.05, 0.9, 0.012, { rz: tilt, cast: false });
    k.box('iron', 0, 0.92, 0, 0.3, 0.04, 0.04, { rz: tilt, cast: false });
    k.add('iron_rusted', sphere(0.14, 8, 5), { y: 1.04, rx: 0.3 }, { cast: false });
  } else {
    k.box('timber_dark', 0, 0.4, 0.05, 0.55, 0.75, 0.06, { rx: -0.3, cast: false });
    k.box('cloth_red', 0, 0.42, 0.09, 0.2, 0.5, 0.01, { rx: -0.3, cast: false });
  }
  k.pop();
}

/** A burial mound (long earth-and-snow ridge) — earth part only; the caller adds snow. */
export function mound(k: Kit, x: number, y: number, z: number, yaw: number, len = 2.2) {
  k.push(x, y, z, yaw);
  k.add('dirt', sphere(1, 10, 5).scale(0.55, 0.32, len / 2), {}, { cast: false });
  k.pop();
}

/** Weapon stand with pikes/halberds leaning (siege camp). */
export function pikeStand(k: Kit, x: number, y: number, z: number, yaw: number, n = 6) {
  k.push(x, y, z, yaw);
  k.box('timber_dark', 0, 1.5, 0, 2.4, 0.1, 0.1, { cast: false });
  for (const s of [-1, 1]) k.box('timber_dark', s * 1.15, 0.75, 0, 0.1, 1.5, 0.1, { cast: false });
  for (let i = 0; i < n; i++) {
    const xx = -1 + (i * 2) / (n - 1);
    k.add('timber', cyl(0.025, 0.025, 4.2, 5), { x: xx, y: 0, z: -0.2, rx: -0.12 }, { cast: false });
    k.add('iron', cone(0.04, 0.35, 4), { x: xx, y: 4.15, z: -0.7, rx: -0.12 }, { cast: false });
  }
  k.pop();
}

/** Brazier with a burning fire (flame instance, no light — the caller budgets lights). */
export function fireBasket(k: Kit, x: number, y: number, z: number, s = 1) {
  k.add('iron', cyl(0.05, 0.05, 1.0 * s, 5), { x, y, z }, { cast: false });
  k.add('iron', cyl(0.35 * s, 0.18 * s, 0.35 * s, 8, true), { x, y: y + 1.0 * s, z }, { cast: false });
  k.add('ember_glow', cyl(0.3 * s, 0.3 * s, 0.08, 8), { x, y: y + 1.25 * s, z }, { cast: false });
  k.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(1.6 * s, 2 * s, 1.6 * s).setPosition(k.wp(x, y + 1.3 * s, z)));
}

// ------------------------------------------------------------------------------------ the feast & the last stand

/** Feast table set for the victory: cloth, platters, goblets, candles, a roast; front +Z = along its length. */
export function feastTable(k: Kit, x: number, y: number, z: number, yaw: number, len = 6, col = true) {
  k.push(x, y, z, yaw);
  k.box('planks', 0, 0.78, 0, 1.2, 0.08, len);
  for (const zz of [-len / 2 + 0.3, len / 2 - 0.3]) for (const s of [-1, 1]) k.box('timber_dark', s * 0.45, 0.38, zz, 0.1, 0.76, 0.1, { cast: false });
  k.box('cloth_red', 0, 0.83, 0, 0.7, 0.012, len - 0.2, { cast: false });
  k.box('gold_trim', 0, 0.84, 0, 0.72, 0.004, 0.08, { cast: false });
  const n = Math.round(len / 0.9);
  for (let i = 0; i < n; i++) {
    const zz = -len / 2 + 0.45 + i * 0.9;
    for (const s of [-1, 1]) {
      k.add('bronze', cyl(0.14, 0.12, 0.03, 10), { x: s * 0.38, y: 0.83, z: zz }, { cast: false });
      k.add('gold_trim', cyl(0.035, 0.025, 0.14, 6), { x: s * 0.2, y: 0.83, z: zz + 0.2 }, { cast: false });
    }
    if (i % 3 === 1) candles(k, 0, 0.83, zz, 3, 0.08);
  }
  k.add('bronze', cyl(0.3, 0.25, 0.05, 12), { y: 0.83, z: 0.4 }, { cast: false });
  k.add('leather', sphere(0.22, 8, 6).scale(1.3, 0.8, 1), { y: 0.98, z: 0.4 }, { cast: false });
  // benches
  for (const s of [-1, 1]) {
    k.box('planks', s * 1.0, 0.45, 0, 0.35, 0.07, len - 0.4, { cast: false });
    for (const zz of [-len / 2 + 0.5, len / 2 - 0.5]) k.box('timber_dark', s * 1.0, 0.22, zz, 0.08, 0.44, 0.08, { cast: false });
  }
  if (col) k.solid(-0.62, 0, -len / 2, 0.62, 0.86, len / 2, 'wood');
  k.pop();
}

/** The same table overturned as a barricade, spilled platters, bolts in the boards. Front +Z = the side facing the enemy. */
export function barricadeTable(k: Kit, x: number, y: number, z: number, yaw: number, len = 4, col = true) {
  k.push(x, y, z, yaw);
  k.box('planks', 0, 0.6, 0, len, 1.2, 0.08, { rx: -0.08 });
  for (const s of [-1, 1]) k.box('timber_dark', s * (len / 2 - 0.3), 0.62, -0.4, 0.1, 0.1, 0.76, { cast: false });
  for (let i = 0; i < 7; i++) k.box('timber_dark', -len / 2 + 0.4 + i * (len - 0.8) / 6, 0.5 + (i % 3) * 0.22, 0.2, 0.02, 0.02, 0.45, { rx: -0.25, ry: ((i % 3) - 1) * 0.3, cast: false });
  k.add('bronze', cyl(0.14, 0.12, 0.03, 10), { x: 0.4, y: 0.02, z: -0.7, rx: 0.2 }, { cast: false });
  k.add('gold_trim', cyl(0.035, 0.025, 0.14, 6), { x: -0.5, y: 0.04, z: -0.6, rz: Math.PI / 2 }, { cast: false });
  k.box('cloth_red', 0.2, 0.01, -0.9, 1.0, 0.01, 0.6, { ry: 0.4, cast: false });
  if (col) k.solid(-len / 2, 0, -0.25, len / 2, 1.25, 0.25, 'wood');
  k.pop();
}

/** A fallen defender (armour and a torn surcoat on the ground) — the dead of the last stand. */
export function fallenSoldier(k: Kit, x: number, y: number, z: number, yaw: number) {
  k.push(x, y, z, yaw);
  k.add('steel_armor', sphere(0.2, 8, 6).scale(1.1, 0.6, 1.4), { y: 0.14 }, { cast: false });
  k.box('cloth_red', 0, 0.06, 0.45, 0.45, 0.04, 0.6, { cast: false, variant: 1 });
  k.add('steel_armor', sphere(0.12, 8, 6), { y: 0.1, z: -0.45 }, { cast: false });
  for (const s of [-1, 1]) k.box('leather_dark', s * 0.13, 0.07, 0.95, 0.12, 0.1, 0.6, { ry: s * 0.15, cast: false });
  k.box('iron_rusted', 0.6, 0.02, -0.1, 0.04, 0.012, 0.9, { ry: 0.8, cast: false });
  k.pop();
}

/** Loose clutter: sacks, barrels, crates around a point (camp dressing). */
export function campClutter(k: Kit, x: number, y: number, z: number, seed: number) {
  const r = (i: number) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  barrel(k, x + r(1) * 1.2, y, z + r(2) * 1.2, r(3) * 3, true);
  crate(k, x - 0.9 + r(4) * 0.4, y, z + 0.4, r(5) * 2, 0.7 + r(6) * 0.2, true);
  sack(k, x + 0.5, y, z - 0.8, r(7) * 3);
  if (r(8) > 0.5) sack(k, x + 0.9, y, z - 0.5, r(9) * 3);
}

/** Scatter a few rocks (snow added by caller). */
export function boulders(k: Kit, x: number, y: number, z: number, n: number, r: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    k.add('rock_cliff', rock(r * (0.6 + ((i * 7 + seed) % 5) / 8), seed * 13 + i, 0.7), { x: x + Math.cos(a) * r * 1.4, y: y + r * 0.2, z: z + Math.sin(a) * r * 1.4, ry: a });
  }
}

// ------------------------------------------------------------------------------------ ramparts


/**
 * Axis-aligned rampart wall (solid, collider) from yBase to `top`, thickness t, along x (dir 'x')
 * or z (dir 'z') between a0..a1 at the fixed coordinate c. `outer` = which side (+1/−1 of the fixed
 * axis) carries the crenellation; the other edge gets a low parapet when `walk` is set.
 * `gaps` = [a, b] spans with no merlons (embrasures, breaches, bridges).
 */
export function rampart(k: Kit, dir: 'x' | 'z', c: number, a0: number, a1: number, yBase: number, top: number, t: number, o: { outer: 1 | -1; walk?: boolean; gaps?: [number, number][]; innerGaps?: [number, number][]; mat?: MaterialId; parapetInner?: boolean; merlonH?: number } = { outer: 1 }) {
  const mat = o.mat ?? 'stone_wall';
  const h0 = c - t / 2, h1 = c + t / 2;
  if (dir === 'x') k.bmm(mat, a0, yBase, h0, a1, top, h1, { col: true });
  else k.bmm(mat, h0, yBase, a0, h1, top, a1, { col: true });
  // walk cap
  if (dir === 'x') k.bmm('flagstone', a0, top - 0.02, h0, a1, top + 0.01, h1, { cast: false });
  else k.bmm('flagstone', h0, top - 0.02, a0, h1, top + 0.01, a1, { cast: false });
  // string course a metre below the top on both faces
  if (dir === 'x') k.bmm('stone_trim', a0, top - 1.3, h0 - 0.1, a1, top - 1.05, h1 + 0.1, { cast: false });
  else k.bmm('stone_trim', h0 - 0.1, top - 1.3, a0, h1 + 0.1, top - 1.05, a1, { cast: false });
  const oc = c + o.outer * (t / 2 - 0.25), ic = c - o.outer * (t / 2 - 0.25);
  const spans: [number, number][] = [];
  let cur = Math.min(a0, a1);
  const gaps = (o.gaps ?? []).slice().sort((p, q) => p[0] - q[0]);
  for (const [g0, g1] of gaps) { if (g0 > cur + 0.3) spans.push([cur, g0]); cur = Math.max(cur, g1); }
  if (Math.max(a0, a1) > cur + 0.3) spans.push([cur, Math.max(a0, a1)]);
  for (const [s0, s1] of spans) {
    if (dir === 'x') crenellation(k, mat, s0, oc, s1, oc, top, 0.5, { base: 0.9, merlonH: o.merlonH ?? 0.9, col: true, colH: 1.6 });
    else crenellation(k, mat, oc, s0, oc, s1, top, 0.5, { base: 0.9, merlonH: o.merlonH ?? 0.9, col: true, colH: 1.6 });
  }
  if (o.walk && (o.parapetInner ?? true)) {
    const ig = (o.innerGaps ?? []).slice().sort((p, q) => p[0] - q[0]);
    let c0 = Math.min(a0, a1);
    const runs: [number, number][] = [];
    for (const [g0, g1] of ig) { if (g0 > c0 + 0.2) runs.push([c0, g0]); c0 = Math.max(c0, g1); }
    if (Math.max(a0, a1) > c0 + 0.2) runs.push([c0, Math.max(a0, a1)]);
    for (const [r0, r1] of runs) {
      if (dir === 'x') parapet(k, mat, r0, ic, r1, ic, top, 0.5, 0.95);
      else parapet(k, mat, ic, r0, ic, r1, top, 0.5, 0.95);
    }
  }
}
