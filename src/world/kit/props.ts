/**
 * Prop library. Every prop is placed at (x, y, z) with a yaw (its local front is +Z) and draws
 * into the Kit's merged buckets; small repeated bits (candles, flames) go through the shared
 * Instancer. Anything that reads as solid and reaches waist height (≈ 0.45 m) or more adds a coarse
 * collider by default (barrels, crates, furniture, statues, posts, rocks …) so the player never walks
 * through it; pass `col = false` only for props that sit inside another collider (a crate on a
 * stall, a barrel in a stack) or on a moving piece. Low clutter (sacks, buckets, papers, rubble
 * scatter) stays non-solid.
 */
import * as THREE from 'three';
import type { MaterialId } from '../../render/materialIds';
import { Kit } from './Kit';
import { cyl, cone, sphere, lathe, extrudeXY, archPoints, rock, heaterShield, bannerGeo } from './geom';

const HALF_PI = Math.PI / 2;

// ------------------------------------------------------------------ shared instanced parts

export const FLAME_KEY = 'flame';
export const flameGeo = () => {
  const g = lathe([[0.001, 0], [0.05, 0.03], [0.07, 0.09], [0.05, 0.17], [0.02, 0.24], [0.001, 0.28]], 7);
  return g;
};
/** A flame (instanced; animated by the level). Base at local point, scale ~1 = candle-size ×4. */
export function flame(kit: Kit, x: number, y: number, z: number, s = 1) {
  kit.inst(FLAME_KEY, flameGeo, 'fire', { x, y, z, s });
}
const candleGeo = () => cyl(0.022, 0.025, 1, 6);

/** Cluster of n candles of varying heights on a surface at y. */
export function candles(kit: Kit, x: number, y: number, z: number, n = 5, spread = 0.25) {
  for (let i = 0; i < n; i++) {
    const a = kit.rng.range(0, Math.PI * 2), r = Math.sqrt(kit.rng.next()) * spread;
    const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
    const h = kit.rng.range(0.06, 0.26);
    kit.inst('candle', candleGeo, 'wax', { x: cx, y, z: cz, s: [1, h, 1] });
    flame(kit, cx, y + h, cz, 0.28);
  }
  // melted wax puddle
  kit.add('wax', cyl(spread * 0.9, spread, 0.02, 10), { x, y, z }, { cast: false });
}

// ------------------------------------------------------------------ containers

const barrelProfile: [number, number][] = [[0.001, 0], [0.26, 0], [0.3, 0.2], [0.32, 0.45], [0.3, 0.7], [0.26, 0.9], [0.001, 0.9]];
export function barrel(kit: Kit, x: number, y: number, z: number, yaw = 0, col = true, lying = false) {
  kit.push(x, y, z, yaw);
  const t = lying ? { y: 0.3, z: -0.45, rx: HALF_PI } : {};
  kit.add('planks', lathe(barrelProfile, 10), t, { cast: false, variant: 2 });
  for (const hy of [0.15, 0.75]) kit.add('iron', cyl(0.295, 0.295, 0.05, 10, true), lying ? { y: 0.3, z: -0.45 + hy, rx: HALF_PI } : { y: hy }, { cast: false });
  if (col) kit.solid(-0.32, 0, -0.32, 0.32, lying ? 0.62 : 0.9, 0.32, 'wood');
  kit.pop();
}

export function crate(kit: Kit, x: number, y: number, z: number, yaw = 0, s = 0.8, col = s >= 0.45) {
  kit.push(x, y, z, yaw);
  kit.box('planks', 0, s / 2, 0, s, s, s, { cast: false });
  const t = 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber_dark', sx * (s / 2 - t / 2 + 0.01), s / 2, sz * (s / 2 - t / 2 + 0.01), t, s + 0.01, t, { cast: false });
  kit.box('timber_dark', 0, s / 2, s / 2 + 0.01, s * 1.2, 0.07, 0.03, { rz: Math.PI / 4, cast: false });
  if (col) kit.solid(-s / 2, 0, -s / 2, s / 2, s, s / 2, 'wood');
  kit.pop();
}

export function sack(kit: Kit, x: number, y: number, z: number, yaw = 0, s = 1) {
  kit.add('cloth_brown', sphere(0.3 * s, 7, 5), { x, y: y + 0.18 * s, z, ry: yaw, s: [1, 0.6, 0.8] }, { cast: false });
  kit.add('cloth_brown', cone(0.1 * s, 0.18 * s, 6), { x, y: y + 0.3 * s, z, ry: yaw }, { cast: false });
}

export function crateStack(kit: Kit, x: number, y: number, z: number, yaw = 0, col = true) {
  kit.push(x, y, z, yaw);
  crate(kit, 0, 0, 0, 0.1, 0.9, !col);
  crate(kit, 0.95, 0, 0.1, -0.1, 0.8, !col);
  crate(kit, 0.4, 0.9, 0.05, 0.3, 0.7, false);
  barrel(kit, -0.9, 0, 0.3, 0.4, !col);
  sack(kit, 0.5, 0, 0.8, 1);
  if (col) kit.solid(-1.25, 0, -0.5, 1.4, 1.5, 0.75, 'wood');
  kit.pop();
}

// ------------------------------------------------------------------ furniture

export function table(kit: Kit, x: number, y: number, z: number, yaw = 0, w = 1.8, d = 0.9, h = 0.8, col = true, mat: MaterialId = 'planks') {
  kit.push(x, y, z, yaw);
  kit.box(mat, 0, h - 0.04, 0, w, 0.08, d, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber_dark', sx * (w / 2 - 0.1), (h - 0.08) / 2, sz * (d / 2 - 0.1), 0.09, h - 0.08, 0.09, { cast: false });
  kit.box('timber_dark', 0, 0.2, 0, w - 0.2, 0.06, 0.06, { cast: false });
  if (col) kit.solid(-w / 2, 0, -d / 2, w / 2, h, d / 2, 'wood');
  kit.pop();
}

export function bench(kit: Kit, x: number, y: number, z: number, yaw = 0, w = 1.6, col = true) {
  kit.push(x, y, z, yaw);
  kit.box('planks', 0, 0.43, 0, w, 0.06, 0.32, { cast: false });
  for (const s of [-1, 1]) kit.box('timber_dark', s * (w / 2 - 0.15), 0.2, 0, 0.07, 0.4, 0.28, { cast: false });
  if (col) kit.solid(-w / 2, 0, -0.16, w / 2, 0.46, 0.16, 'wood');
  kit.pop();
}

export function chair(kit: Kit, x: number, y: number, z: number, yaw = 0, col = true) {
  kit.push(x, y, z, yaw);
  kit.box('planks', 0, 0.45, 0, 0.45, 0.05, 0.45, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber_dark', sx * 0.19, 0.22, sz * 0.19, 0.05, 0.45, 0.05, { cast: false });
  kit.box('timber_dark', 0, 0.75, -0.2, 0.45, 0.5, 0.05, { cast: false });
  if (col) kit.solid(-0.23, 0, -0.23, 0.23, 1.0, 0.23, 'wood');
  kit.pop();
}

/** Hospice cot: frame + straw mattress + blanket (+ pillow). */
export function cot(kit: Kit, x: number, y: number, z: number, yaw = 0, occupiedLook = false) {
  kit.push(x, y, z, yaw);
  kit.box('timber', 0, 0.35, 0, 0.9, 0.08, 2.0, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber_dark', sx * 0.4, 0.2, sz * 0.93, 0.07, 0.4, 0.07, { cast: false });
  kit.box('cloth_linen', 0, 0.45, 0, 0.82, 0.12, 1.9, { cast: false });
  kit.box('cloth_linen', 0, 0.54, -0.78, 0.55, 0.1, 0.3, { cast: false, variant: 1 });
  kit.box(occupiedLook ? 'cloth_red' : 'cloth_brown', 0, 0.53 + (occupiedLook ? 0.08 : 0), 0.25, 0.86, occupiedLook ? 0.2 : 0.05, 1.2, { cast: false });
  kit.solid(-0.45, 0, -1, 0.45, 0.55, 1, 'wood');
  kit.pop();
}

export function strawBed(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('grass_dead', 0, 0.08, 0, 1.0, 0.16, 2.0, { cast: false });
  kit.box('cloth_brown', 0.05, 0.19, 0.2, 0.8, 0.05, 1.2, { cast: false, ry: 0.08 });
  kit.box('cloth_linen', 0, 0.2, -0.75, 0.5, 0.1, 0.3, { cast: false });
  kit.pop();
}

export function bucket(kit: Kit, x: number, y: number, z: number, mat: MaterialId = 'planks', contents: MaterialId | null = 'water') {
  kit.add(mat, cyl(0.17, 0.14, 0.32, 8), { x, y, z }, { cast: false });
  for (const hy of [0.05, 0.26]) kit.add('iron', cyl(0.165, 0.15, 0.03, 8, true), { x, y: y + hy, z }, { cast: false });
  if (contents) kit.add(contents, cyl(0.15, 0.15, 0.01, 8), { x, y: y + 0.26, z }, { cast: false });
  kit.box('iron', x, y + 0.42, z, 0.34, 0.02, 0.02, { cast: false });
}

export function shelves(kit: Kit, x: number, y: number, z: number, yaw = 0, w = 2, h = 2.2, books = true) {
  kit.push(x, y, z, yaw);
  kit.box('timber_dark', 0, h / 2, -0.2, w, h, 0.04, { cast: false });
  for (const s of [-1, 1]) kit.box('timber_dark', s * w / 2, h / 2, 0, 0.06, h, 0.42, { cast: false });
  const nS = Math.floor(h / 0.5);
  for (let i = 0; i <= nS; i++) {
    const sy = 0.05 + i * 0.5;
    kit.box('planks', 0, sy, 0, w, 0.04, 0.4, { cast: false });
    if (books && i < nS) {
      let bx = -w / 2 + 0.08;
      while (bx < w / 2 - 0.12) {
        const bw = kit.rng.range(0.05, 0.1), bh = kit.rng.range(0.25, 0.4);
        if (kit.rng.chance(0.85)) kit.box(kit.rng.chance(0.5) ? 'leather' : kit.rng.chance(0.5) ? 'leather_dark' : 'cloth_red', bx + bw / 2, sy + 0.02 + bh / 2, 0, bw, bh, 0.3, { cast: false });
        bx += bw + 0.01;
      }
    }
  }
  kit.solid(-w / 2, 0, -0.25, w / 2, h, 0.25, 'wood');
  kit.pop();
}

/** Ledger / book lying on a surface. */
export function ledger(kit: Kit, x: number, y: number, z: number, yaw = 0, open = false) {
  kit.push(x, y, z, yaw);
  if (open) {
    kit.box('leather_dark', 0, 0.01, 0, 0.5, 0.02, 0.35, { cast: false });
    for (const s of [-1, 1]) kit.box('parchment', s * 0.12, 0.03, 0, 0.23, 0.03, 0.32, { rz: -s * 0.06, cast: false });
  } else {
    kit.box('leather', 0, 0.03, 0, 0.26, 0.06, 0.36, { cast: false });
    kit.box('parchment', 0.01, 0.03, 0, 0.25, 0.045, 0.34, { cast: false });
  }
  kit.pop();
}

export function papers(kit: Kit, x: number, y: number, z: number, n = 4) {
  for (let i = 0; i < n; i++) kit.box('parchment', x + kit.rng.range(-0.2, 0.2), y + 0.005 + i * 0.004, z + kit.rng.range(-0.15, 0.15), 0.21, 0.004, 0.3, { ry: kit.rng.range(-0.6, 0.6), cast: false });
}

export function desk(kit: Kit, x: number, y: number, z: number, yaw = 0, col = true) {
  kit.push(x, y, z, yaw);
  table(kit, 0, 0, 0, 0, 1.5, 0.8, 0.8, col, 'planks');
  kit.box('timber_dark', 0, 0.55, -0.3, 1.4, 0.45, 0.1, { cast: false });
  chair(kit, 0, 0, 0.75, Math.PI, col);
  kit.pop();
}

// ------------------------------------------------------------------ light sources

/** Iron wall sconce with a torch; local front (+Z) points away from the wall. */
export function sconceTorch(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('iron', 0, 0, 0.05, 0.16, 0.3, 0.1, { cast: false });
  kit.box('iron', 0, -0.05, 0.22, 0.04, 0.04, 0.35, { cast: false });
  kit.add('iron', cyl(0.07, 0.04, 0.12, 6, true), { y: 0.02, z: 0.38 }, { cast: false });
  kit.add('timber_dark', cyl(0.035, 0.025, 0.5, 5), { y: -0.2, z: 0.38, rx: -0.25 }, { cast: false });
  kit.add('ember_glow', cyl(0.05, 0.04, 0.06, 6), { y: 0.26, z: 0.44 }, { cast: false });
  const w = kit.wp(0, 0.28, 0.45);
  kit.pop();
  kit.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(1.1, 1.3, 1.1).setPosition(w));
}

/** Standing brazier with coals and flame. */
export function brazier(kit: Kit, x: number, y: number, z: number, col = true, s = 1) {
  kit.push(x, y, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.box('iron', Math.cos(a) * 0.28 * s, 0.45 * s, Math.sin(a) * 0.28 * s, 0.05, 0.95 * s, 0.05, { rz: Math.cos(a) * 0.2, rx: -Math.sin(a) * 0.2, cast: false });
  }
  kit.add('iron', lathe([[0.1, 0], [0.3, 0.05], [0.42, 0.25], [0.44, 0.3], [0.001, 0.3]].map(([r, yy]) => [r * s, yy * s]) as [number, number][], 10), { y: 0.85 * s }, { cast: false });
  kit.add('ember_glow', cyl(0.38 * s, 0.38 * s, 0.05, 10), { y: 1.12 * s }, { cast: false });
  kit.pop();
  kit.push(x, y, z);
  const w = kit.wp(0, 1.12 * s, 0);
  kit.pop();
  kit.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(2.2 * s, 2.4 * s, 2.2 * s).setPosition(w));
  if (col) kit.push(x, y, z).solid(-0.4 * s, 0, -0.4 * s, 0.4 * s, 1.15 * s, 0.4 * s, 'metal').pop();
}

/** Hanging lantern (warm core). */
export function lantern(kit: Kit, x: number, y: number, z: number) {
  kit.box('iron', x, y + 0.24, z, 0.22, 0.03, 0.22, { cast: false });
  kit.box('window_warm', x, y, z, 0.16, 0.3, 0.16, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('iron', x + sx * 0.1, y, z + sz * 0.1, 0.025, 0.36, 0.025, { cast: false });
  kit.add('iron', cone(0.16, 0.14, 4), { x, y: y + 0.24, z, ry: Math.PI / 4 }, { cast: false });
}

/** Wall bracket lantern; local front +Z away from the wall. */
export function bracketLantern(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('iron', 0, 0.35, 0.3, 0.04, 0.04, 0.6, { cast: false });
  kit.box('iron', 0, 0.1, 0.1, 0.04, 0.5, 0.04, { rx: 0.8, cast: false });
  lantern(kit, 0, 0.0, 0.55);
  kit.pop();
}

/** Tall iron candelabrum with several candles. */
export function candelabrum(kit: Kit, x: number, y: number, z: number, arms = 5, col = true) {
  kit.push(x, y, z);
  kit.add('iron', cyl(0.25, 0.3, 0.06, 8), {}, { cast: false });
  kit.add('iron', cyl(0.03, 0.04, 1.7, 6), { y: 0.05 }, { cast: false });
  kit.box('iron', 0, 1.65, 0, 0.9, 0.04, 0.04, { cast: false });
  if (col) kit.solid(-0.15, 0, -0.15, 0.15, 1.7, 0.15, 'metal');
  kit.pop();
  for (let i = 0; i < arms; i++) {
    const ox = -0.45 + (0.9 * i) / (arms - 1);
    kit.push(x, y, z);
    const w = kit.wp(ox, 1.67, 0);
    kit.pop();
    kit.shared.instances.add('candle', candleGeo, 'wax', new THREE.Matrix4().makeScale(1.2, 0.22, 1.2).setPosition(w));
    kit.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(0.32, 0.32, 0.32).setPosition(w.x, w.y + 0.22, w.z));
  }
}

// ------------------------------------------------------------------ smithing

export function anvil(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.add('timber_dark', cyl(0.3, 0.34, 0.5, 9), {}, { cast: false });
  kit.box('iron', 0, 0.58, 0, 0.3, 0.16, 0.4, { cast: false });
  kit.box('iron', 0, 0.72, 0, 0.36, 0.14, 0.62, { cast: false });
  kit.add('iron', cone(0.07, 0.3, 6), { y: 0.72, z: 0.45, rx: HALF_PI }, { cast: false });
  kit.box('steel_bright', 0.05, 0.83, -0.1, 0.05, 0.05, 0.5, { ry: 0.3, cast: false }); // a blade blank
  kit.solid(-0.35, 0, -0.4, 0.35, 0.8, 0.4, 'metal');
  kit.pop();
}

/** Forge hearth with hood and chimney; returns local-to-world point of the coals. */
export function forge(kit: Kit, x: number, y: number, z: number, yaw = 0, chimneyTop = 8): THREE.Vector3 {
  kit.push(x, y, z, yaw);
  kit.box('stone_dark', 0, 0.45, 0, 2.0, 0.9, 1.4, { col: true });
  kit.box('stone_trim', 0, 0.93, 0, 2.1, 0.08, 1.5, { cast: false });
  kit.add('ember_glow', cyl(0.5, 0.55, 0.12, 10), { y: 0.95, z: 0.05 }, { cast: false });
  // hood (truncated pyramid) and chimney
  kit.add('stone_dark', lathe([[1.25, 0], [0.5, 1.4], [0.001, 1.4]], 4), { y: 2.0, ry: Math.PI / 4, s: [1.05, 1, 0.8] });
  kit.bmm('stone_dark', -0.5, 3.3, -0.4, 0.5, chimneyTop, 0.4);
  for (const s of [-1, 1]) kit.box('stone_dark', s * 0.85, 1.45, -0.5, 0.3, 1.1, 0.3);
  const coals = kit.wp(0, 1.0, 0.05);
  kit.pop();
  kit.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(3.5, 2.6, 3.5).setPosition(coals));
  return coals;
}

export function bellows(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('timber_dark', 0, 0.35, 0, 0.8, 0.7, 0.6, { cast: false });
  kit.add('leather_dark', extrudeXY([[-0.7, 0], [0.7, 0], [0.4, 0.4], [-0.4, 0.4]], 0.9), { y: 0.72, rx: 0 }, { cast: false });
  kit.box('planks', 0, 1.14, 0, 1.5, 0.05, 1.0, { rx: 0.05, cast: false });
  kit.box('iron', 0, 0.9, 0.7, 0.08, 0.08, 0.5, { cast: false });
  kit.box('timber_dark', 0, 1.3, -0.7, 0.08, 0.08, 1.2, { rx: 0.3, cast: false });
  kit.solid(-0.75, 0, -0.55, 0.75, 1.1, 0.55, 'wood');
  kit.pop();
}

/** Weapon rack with swords and spears leaning in it. */
export function weaponRack(kit: Kit, x: number, y: number, z: number, yaw = 0, w = 2) {
  kit.push(x, y, z, yaw);
  for (const s of [-1, 1]) kit.box('timber_dark', s * w / 2, 0.9, 0, 0.1, 1.8, 0.1, { cast: false });
  kit.box('timber_dark', 0, 1.5, 0, w, 0.1, 0.1, { cast: false });
  kit.box('timber_dark', 0, 0.3, 0.15, w, 0.08, 0.3, { cast: false });
  const n = Math.round(w / 0.3);
  for (let i = 0; i < n; i++) {
    const px = -w / 2 + 0.2 + (i * (w - 0.4)) / (n - 1);
    if (i % 3 === 2) {
      kit.box('timber', px, 1.2, 0.1, 0.04, 2.4, 0.04, { rx: -0.08, cast: false });
      kit.add('steel_bright', cone(0.04, 0.3, 4), { x: px, y: 2.38, z: 0.0 }, { cast: false });
    } else {
      kit.box('steel_bright', px, 0.85, 0.12, 0.05, 0.9, 0.012, { rx: -0.1, cast: false });
      kit.box('iron', px, 1.33, 0.07, 0.2, 0.03, 0.04, { cast: false });
      kit.box('leather_dark', px, 1.46, 0.06, 0.035, 0.24, 0.035, { cast: false });
    }
  }
  kit.solid(-w / 2 - 0.05, 0, -0.1, w / 2 + 0.05, 1.8, 0.3, 'wood');
  kit.pop();
}

/** Armour stand (cross + cuirass silhouette + helm). */
export function armourStand(kit: Kit, x: number, y: number, z: number, yaw = 0, mat: MaterialId = 'steel_armor', cloak: MaterialId | null = 'cloth_black', col = true) {
  kit.push(x, y, z, yaw);
  kit.box('timber_dark', 0, 0.05, 0, 0.5, 0.1, 0.5, { cast: false });
  kit.box('timber_dark', 0, 0.8, 0, 0.07, 1.5, 0.07, { cast: false });
  kit.box('timber_dark', 0, 1.42, 0, 0.8, 0.07, 0.07, { cast: false });
  kit.add(mat, lathe([[0.2, 0], [0.23, 0.2], [0.26, 0.45], [0.22, 0.55], [0.08, 0.6]], 8), { y: 0.92, s: [1, 1, 0.7] }, { cast: false });
  kit.add(mat, sphere(0.14, 8, 6), { y: 1.68 }, { cast: false });
  if (cloak) kit.box(cloak, 0, 1.0, -0.14, 0.6, 0.9, 0.04, { rx: 0.08, cast: false });
  if (col) kit.solid(-0.3, 0, -0.28, 0.3, 1.8, 0.28, 'metal');
  kit.pop();
}

// ------------------------------------------------------------------ mint

/** Screw coin press (balancier): timber frame, iron screw, bronze-weighted fly bar. */
export function coinPress(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('stone_dark', 0, 0.3, 0, 1.6, 0.6, 1.2, { col: true });
  kit.box('bronze', 0, 0.66, 0, 0.5, 0.12, 0.5, { cast: false });
  for (const s of [-1, 1]) kit.box('iron', s * 0.55, 1.5, 0, 0.22, 1.8, 0.4);
  kit.box('iron', 0, 2.45, 0, 1.4, 0.35, 0.45);
  kit.add('bronze', cyl(0.24, 0.24, 0.3, 10), { y: 2.3 }, { cast: false });
  kit.add('iron', cyl(0.09, 0.09, 1.4, 8), { y: 1.2 }, { cast: false });
  // fly bar with bronze balls
  kit.box('iron', 0, 2.85, 0, 3.0, 0.09, 0.09, { ry: 0.5, cast: true });
  for (const s of [-1, 1]) kit.add('bronze', sphere(0.2, 8, 6), { x: s * 1.5 * Math.cos(0.5), y: 2.85, z: -s * 1.5 * Math.sin(0.5) }, { cast: false });
  kit.add('iron', cyl(0.06, 0.06, 0.4, 6), { y: 2.62 }, { cast: false });
  // coin motif roundel
  kit.add('bronze', cyl(0.3, 0.3, 0.05, 16), { y: 1.6, z: 0.23, rx: HALF_PI }, { cast: false });
  kit.solid(-0.8, 0, -0.6, 0.8, 3.0, 0.6, 'metal');
  kit.pop();
}

/** Balance scales on a surface. */
export function scales(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.add('bronze', cyl(0.08, 0.1, 0.03, 8), {}, { cast: false });
  kit.add('bronze', cyl(0.012, 0.015, 0.45, 5), { y: 0.03 }, { cast: false });
  kit.box('bronze', 0, 0.47, 0, 0.5, 0.015, 0.015, { rz: 0.06, cast: false });
  for (const s of [-1, 1]) {
    kit.add('bronze', cyl(0.09, 0.06, 0.03, 8), { x: s * 0.24, y: 0.2 - s * 0.015 }, { cast: false });
    kit.box('iron', s * 0.24, 0.34 - s * 0.01, 0, 0.004, 0.26, 0.004, { cast: false });
  }
  kit.pop();
}

/** Iron-banded strongbox. */
export function strongbox(kit: Kit, x: number, y: number, z: number, yaw = 0, s = 1, col = true) {
  kit.push(x, y, z, yaw);
  kit.box('timber_dark', 0, 0.25 * s, 0, 0.8 * s, 0.5 * s, 0.5 * s, { cast: false });
  for (const bx of [-0.28, 0, 0.28]) kit.box('iron', bx * s, 0.25 * s, 0, 0.06 * s, 0.52 * s, 0.52 * s, { cast: false });
  kit.box('iron', 0, 0.3 * s, 0.26 * s, 0.12 * s, 0.14 * s, 0.03, { cast: false });
  if (col) kit.solid(-0.42 * s, 0, -0.27 * s, 0.42 * s, 0.5 * s, 0.27 * s, 'metal');
  kit.pop();
}

/** Stacks of coins on a table. */
export function coins(kit: Kit, x: number, y: number, z: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const h = kit.rng.range(0.01, 0.08);
    kit.add('gold_trim', cyl(0.025, 0.025, h, 8), { x: x + kit.rng.range(-0.2, 0.2), y, z: z + kit.rng.range(-0.15, 0.15) }, { cast: false });
  }
}

// ------------------------------------------------------------------ street

export function cart(kit: Kit, x: number, y: number, z: number, yaw = 0, fallen = false, col = true) {
  kit.push(x, y, z, yaw);
  if (fallen) kit.push(0.0, 0.0, 0, 0).pushMatrix(new THREE.Matrix4().makeRotationZ(1.25).setPosition(0.3, 0.2, 0));
  kit.box('planks', 0, 0.8, 0, 1.4, 0.1, 2.4, { cast: true });
  for (const s of [-1, 1]) kit.box('planks', s * 0.68, 1.05, 0, 0.06, 0.45, 2.4, { cast: false, variant: 1 });
  kit.box('planks', 0, 1.05, -1.18, 1.4, 0.45, 0.06, { cast: false, variant: 1 });
  kit.box('timber_dark', 0, 0.65, 0, 0.12, 0.12, 2.5, { cast: false });
  // wheels
  for (const s of [-1, 1]) {
    if (fallen && s === 1) continue;
    kit.add('timber_dark', cyl(0.55, 0.55, 0.08, 12), { x: s * 0.8, y: 0.55, z: 0.1, rz: HALF_PI }, { cast: false });
    kit.add('iron', cyl(0.56, 0.56, 0.09, 12, true), { x: s * 0.8, y: 0.55, z: 0.1, rz: HALF_PI }, { cast: false });
  }
  kit.box('iron', 0, 0.55, 0.1, 1.7, 0.06, 0.06, { cast: false });
  // shafts
  for (const s of [-1, 1]) kit.box('timber_dark', s * 0.45, fallen ? 0.8 : 0.35, 1.9, 0.08, 0.08, 1.8, { rx: fallen ? 0 : 0.3, cast: false });
  if (fallen) kit.pop().pop();
  if (fallen) {
    // loose wheel and spilled sacks/crates
    kit.add('timber_dark', cyl(0.55, 0.55, 0.08, 12), { x: 1.9, y: 0.05, z: 0.9, rz: 0.05 }, { cast: false });
    sack(kit, -1.3, 0, 0.4, 0.3); sack(kit, -1.1, 0, -0.5, 1.2); crate(kit, -1.5, 0, 1.3, 0.5, 0.6, col);
    if (col) kit.solid(-0.9, 0, -1.3, 1.4, 1.5, 1.3, 'wood');
  } else if (col) kit.solid(-0.9, 0, -1.3, 0.9, 1.3, 2.8, 'wood');
  kit.pop();
}

export function well(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.add('stone_wall', cyl(1.1, 1.15, 0.9, 14), {});
  kit.add('stone_trim', cyl(1.2, 1.2, 0.12, 14, true), { y: 0.9 });
  kit.add('water', cyl(0.9, 0.9, 0.01, 12), { y: 0.5 }, { cast: false });
  for (const s of [-1, 1]) kit.box('timber_dark', s * 1.0, 1.6, 0, 0.14, 1.5, 0.14);
  kit.add('timber', cyl(0.08, 0.08, 2.1, 6), { y: 2.1, rz: HALF_PI }, { cast: false });
  kit.box('roof_slate', 0.0, 2.8, 0.45, 2.6, 0.08, 1.1, { rx: -0.6 });
  kit.box('roof_slate', 0.0, 2.8, -0.45, 2.6, 0.08, 1.1, { rx: 0.6 });
  kit.box('rope', 0, 1.6, 0, 0.03, 1.0, 0.03, { cast: false });
  bucket(kit, 0, 1.0, 0, 'planks', null);
  kit.solid(-1.2, 0, -1.2, 1.2, 1.2, 1.2);
  kit.pop();
}

export function marketStall(kit: Kit, x: number, y: number, z: number, yaw = 0, cloth: MaterialId = 'cloth_red', col = true) {
  kit.push(x, y, z, yaw);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber_dark', sx * 1.2, sz > 0 ? 1.0 : 1.2, sz * 0.7, 0.1, sz > 0 ? 2.0 : 2.4, 0.1, { cast: false });
  kit.box('planks', 0, 0.9, 0.1, 2.4, 0.08, 1.2, { cast: false });
  kit.box(cloth, 0, 2.2, 0, 2.7, 0.04, 1.8, { rx: 0.18 });
  kit.box(cloth, 0, 1.95, 0.9, 2.7, 0.45, 0.03, { cast: false });
  crate(kit, -0.6, 0.94, 0.1, 0.2, 0.4, false); sack(kit, 0.5, 0.94, 0.2, 0.2, 0.7); barrel(kit, 1.5, 0, 0.6, 0.3, col);
  if (col) kit.solid(-1.3, 0, -0.8, 1.3, 1.2, 0.8, 'wood');
  kit.pop();
}

/** A rope line between two local points with laundry cloths hanging. */
export function laundryLine(kit: Kit, a: [number, number, number], b: [number, number, number], n = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const len = A.distanceTo(B);
  const d = B.clone().sub(A).normalize();
  const yaw = Math.atan2(d.x, d.z), pitch = -Math.asin(d.y);
  kit.add('rope', cyl(0.012, 0.012, len, 4), { x: mid.x, y: mid.y - 0.1, z: mid.z, ry: yaw, rx: HALF_PI + pitch }, { cast: false });
  const mats: MaterialId[] = ['cloth_linen', 'cloth_brown', 'cloth_linen', 'cloth_blue', 'cloth_red'];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.7) / (n + 0.4);
    const p = A.clone().lerp(B, t);
    const sag = Math.sin(t * Math.PI) * 0.25;
    const w = kit.rng.range(0.4, 0.9), h = kit.rng.range(0.5, 1.0);
    kit.box(kit.rng.pick(mats), p.x, p.y - 0.12 - sag - h / 2, p.z, w, h, 0.02, { ry: yaw + HALF_PI, cast: true });
  }
}

/** Dead tree: trunk plus recursive branches. */
export function deadTree(kit: Kit, x: number, y: number, z: number, h = 6, seed = 1) {
  const rng = kit.rng;
  void seed;
  const branch = (m: THREE.Matrix4, len: number, r: number, depth: number) => {
    const g = cyl(r * 0.6, r, len, 5);
    kit.add('timber_dark', g, m.clone(), { cast: true });
    if (depth <= 0) return;
    const nb = depth > 2 ? 2 : rng.int(1, 3);
    for (let i = 0; i < nb; i++) {
      const child = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, len * rng.range(0.6, 1), 0))
        .multiply(new THREE.Matrix4().makeRotationY(rng.range(0, Math.PI * 2)))
        .multiply(new THREE.Matrix4().makeRotationZ(rng.range(0.35, 0.9)));
      branch(child, len * rng.range(0.5, 0.75), r * 0.6, depth - 1);
    }
  };
  kit.push(x, y, z, rng.range(0, 6));
  branch(new THREE.Matrix4().makeRotationZ(rng.range(-0.12, 0.12)), h * 0.5, h * 0.045, 3);
  const tr = Math.max(0.12, h * 0.045);
  kit.solid(-tr, 0, -tr, tr, h * 0.45, tr, 'wood');
  kit.pop();
}

/**
 * Rock. Collides with its own (low-poly) shape unless `col` is false; by default only rocks that
 * rise more than ~0.3 m above their base point are solid (pebbles stay walk-through).
 */
export function rockProp(kit: Kit, x: number, y: number, z: number, r: number, seed: number, sy = 0.7, mat: MaterialId = 'rock_cliff', col = r * sy > 0.3) {
  kit.add(mat, rock(r, seed, sy), { x, y, z, ry: seed * 1.3 });
  if (col) kit.colGeo(rock(r, seed, sy), { x, y, z, ry: seed * 1.3 });
}

/** Pile of broken masonry and charred timber. */
export function rubble(kit: Kit, x: number, y: number, z: number, r = 1.5, burnt = true, col = false) {
  const n = Math.round(6 + r * 6);
  for (let i = 0; i < n; i++) {
    const a = kit.rng.range(0, Math.PI * 2), d = Math.sqrt(kit.rng.next()) * r;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    const s = kit.rng.range(0.15, 0.45) * (1 - d / r * 0.5);
    if (kit.rng.chance(0.6)) kit.box(kit.rng.chance(0.5) ? 'stone_wall' : 'rubble', px, y + s * 0.3, pz, s * 1.4, s * 0.8, s, { ry: kit.rng.range(0, 3), rx: kit.rng.range(-0.3, 0.3), cast: false });
    else kit.add('rubble', rock(s, i * 17 + Math.floor(x * 3), 0.6, 0), { x: px, y: y + s * 0.2, z: pz }, { cast: false });
  }
  kit.add('rubble', rock(r * 0.7, Math.floor(x * 7 + z), 0.35), { x, y: y - r * 0.05, z }, { cast: false });
  if (burnt) for (let i = 0; i < 3; i++) kit.box('timber_burnt', x + kit.rng.range(-r, r) * 0.6, y + 0.25, z + kit.rng.range(-r, r) * 0.6, 0.18, 0.18, kit.rng.range(1, 2.5), { ry: kit.rng.range(0, 3), rx: kit.rng.range(-0.3, 0.3), cast: false });
  if (col) kit.solid(x - r * 0.6, y, z - r * 0.6, x + r * 0.6, y + r * 0.45, z + r * 0.6);
}

/** Fallen (charred) beam between two local points. */
export function fallenBeam(kit: Kit, a: [number, number, number], b: [number, number, number], s = 0.25, mat: MaterialId = 'timber_burnt') {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const mid = A.clone().add(B).multiplyScalar(0.5), len = A.distanceTo(B);
  const d = B.clone().sub(A).normalize();
  kit.box(mat, mid.x, mid.y, mid.z, s, s, len, { ry: Math.atan2(d.x, d.z), rx: -Math.asin(d.y), cast: true });
}

// ------------------------------------------------------------------ graves & memorials

/** Headstone with rounded or pointed top; front +Z. */
export function headstone(kit: Kit, x: number, y: number, z: number, yaw = 0, h = 1.0, w = 0.6, tilt = 0, mat: MaterialId = 'stone_dark') {
  const top = archPoints(-w / 2, w / 2, h - w / 2, kit.rng.chance(0.5) ? 'round' : 'pointed', w * 0.45, 6);
  // archPoints run left→right over the top; walking the outline CCW we go right→left
  const outline: [number, number][] = [[-w / 2, 0], [w / 2, 0], [w / 2, h - w / 2], ...top.slice().reverse(), [-w / 2, h - w / 2]];
  kit.push(x, y, z, yaw);
  kit.add(mat, extrudeXY(outline, 0.14), { rx: tilt, rz: tilt * 0.5 }, { cast: false });
  if (h >= 0.45) kit.solidC(0, h / 2, 0, w, h, 0.2, [tilt, 0, tilt * 0.5]);
  kit.box('stone_trim', 0, 0.02, 0.7, w + 0.2, 0.1, 1.6, { cast: false });
  kit.box('grass_dead', 0, 0.03, 0.7, w, 0.08, 1.4, { cast: false });
  kit.pop();
}

/** Stone memorial relief panel with raised figures (soldiers, banners); front +Z. */
export function reliefPanel(kit: Kit, x: number, y: number, z: number, yaw: number, w = 3.6, h = 2.0) {
  kit.push(x, y, z, yaw);
  kit.box('stone_trim', 0, h / 2, 0, w + 0.5, h + 0.5, 0.25, { col: true });
  kit.box('stone_trim', 0, h + 0.35, 0.12, w + 0.8, 0.22, 0.2, { cast: false });
  kit.box('stone_trim', 0, -0.2, 0.12, w + 0.8, 0.2, 0.2, { cast: false });
  // raised figures: a rank of soldiers with spears, a mounted captain, a banner
  const nF = 7;
  for (let i = 0; i < nF; i++) {
    const fx = -w / 2 + 0.35 + (i * (w - 0.7)) / (nF - 1);
    const fh = 1.0 + (i === 3 ? 0.35 : 0);
    kit.box('stone_wall', fx, 0.25 + fh / 2, 0.16, 0.24, fh, 0.08, { cast: false });
    kit.add('stone_wall', sphere(0.11, 6, 4), { x: fx, y: 0.36 + fh, z: 0.16 }, { cast: false });
    kit.box('stone_wall', fx + 0.14, 0.3 + fh * 0.75, 0.2, 0.03, fh * 1.4, 0.03, { rz: 0.15, cast: false });
  }
  kit.box('stone_wall', 0.5, 1.5, 0.18, 0.6, 0.4, 0.05, { cast: false }); // banner cloth
  kit.box('stone_wall', 0.2, 1.3, 0.18, 0.03, 1.0, 0.03, { cast: false });
  // inscription band
  kit.box('stone_wall', 0, h - 0.15, 0.14, w - 0.3, 0.22, 0.04, { cast: false });
  kit.pop();
}

// ------------------------------------------------------------------ heraldry

/** Household shield (royal arms texture) hung on a wall; front +Z. UVs preserved. */
export function wallShield(kit: Kit, x: number, y: number, z: number, yaw = 0, s = 1) {
  kit.push(x, y, z, yaw);
  kit.add('shield_household', heaterShield(1.0 * s, 1.3 * s, 0.08 * s), { z: 0.06 }, { uv: 'keep', cast: false });
  kit.box('iron', 0, 0.7 * s, 0.02, 0.1, 0.12, 0.05, { cast: false });
  kit.pop();
}

/** Heraldic banner hanging from a wall-mounted pole; front +Z. UVs preserved. */
export function wallBanner(kit: Kit, x: number, y: number, z: number, yaw = 0, w = 1.4, h = 3.6): THREE.Vector3 {
  kit.push(x, y, z, yaw);
  kit.add('timber_dark', cyl(0.05, 0.05, w + 0.4, 6), { y: 0, z: 0.25, rz: HALF_PI }, { cast: false });
  for (const s of [-1, 1]) kit.box('iron', s * (w / 2 + 0.1), -0.05, 0.12, 0.05, 0.05, 0.28, { cast: false });
  kit.add('heraldry_banner', bannerGeo(w, h), { y: -0.04, z: 0.27 }, { uv: 'keep', cast: true });
  const p = kit.wp(0, 0, 0.27);
  kit.pop();
  return p;
}

/** Banner on a free-standing pole (standard). */
export function standardBanner(kit: Kit, x: number, y: number, z: number, yaw = 0, h = 5, w = 1.2, bh = 2.4) {
  kit.push(x, y, z, yaw);
  kit.add('timber_dark', cyl(0.06, 0.08, h, 6), {}, { cast: true });
  kit.solid(-0.1, 0, -0.1, 0.1, h, 0.1, 'wood');
  kit.box('timber_dark', 0, h - 0.3, 0, w + 0.2, 0.08, 0.08, { cast: false });
  kit.add('gold_trim', cone(0.08, 0.35, 6), { y: h }, { cast: false });
  kit.add('heraldry_banner', bannerGeo(w, bh), { y: h - 0.32, z: 0.05 }, { uv: 'keep' });
  kit.pop();
}

// ------------------------------------------------------------------ bell-posts

/** Iron bell-post (the Unfinished Toll marker): stone plinth, iron shaft, small caged bell. */
export function bellPost(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('stone_dark', 0, 0.2, 0, 1.1, 0.4, 1.1);
  kit.box('stone_trim', 0, 0.55, 0, 0.8, 0.3, 0.8);
  kit.add('iron', cyl(0.14, 0.2, 2.3, 8), { y: 0.7 });
  for (const ry of [1.0, 1.9, 2.6]) kit.add('iron', cyl(0.22, 0.22, 0.08, 8), { y: ry }, { cast: false });
  kit.add('iron', lathe([[0.18, 0], [0.34, 0.12], [0.3, 0.2], [0.001, 0.22]], 8), { y: 3.0 });
  // cage for the small bell
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box('iron', Math.cos(a) * 0.24, 3.55, Math.sin(a) * 0.24, 0.04, 0.8, 0.04, { cast: false });
  }
  kit.add('iron', cone(0.36, 0.4, 8), { y: 3.95 }, { cast: false });
  kit.add('iron', sphere(0.07, 6, 4), { y: 4.4 }, { cast: false });
  kit.add('bronze_bell', (() => { const g = lathe([[0.2, -0.36], [0.17, -0.3], [0.14, -0.15], [0.12, -0.05], [0.001, 0]], 12); return g; })(), { y: 3.85 }, { cast: false });
  kit.solid(-0.55, 0, -0.55, 0.55, 3.2, 0.55, 'metal');
  kit.pop();
}

// ------------------------------------------------------------------ training

export function trainingDummy(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.add('timber_dark', cyl(0.07, 0.08, 1.9, 6), {});
  kit.box('timber_dark', 0, 1.35, 0, 1.1, 0.08, 0.08, { cast: false });
  kit.add('grass_dead', cyl(0.24, 0.2, 0.75, 8), { y: 0.8 }, { cast: true });
  kit.add('cloth_brown', sphere(0.17, 8, 6), { y: 1.8 }, { cast: false });
  for (const hy of [0.95, 1.35]) kit.add('rope', cyl(0.245, 0.245, 0.04, 8, true), { y: hy }, { cast: false });
  kit.box('leather', 0, 1.1, 0.12, 0.42, 0.5, 0.06, { cast: false });
  kit.box('stone_dark', 0, 0.1, 0, 0.6, 0.2, 0.6, { cast: false });
  kit.solid(-0.28, 0, -0.28, 0.28, 1.9, 0.28, 'wood');
  kit.pop();
}

/** Instruction plaque: wooden board on two posts; board front +Z. */
export function plaque(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  for (const s of [-1, 1]) kit.box('timber_dark', s * 0.45, 0.65, 0, 0.09, 1.3, 0.09, { cast: false });
  kit.box('planks', 0, 1.15, 0.05, 1.05, 0.65, 0.06, { rx: -0.12, cast: false });
  kit.box('parchment', 0, 1.15, 0.09, 0.85, 0.48, 0.01, { rx: -0.12, cast: false });
  kit.box('timber_dark', 0, 1.5, 0.05, 1.15, 0.07, 0.1, { cast: false });
  kit.solid(-0.55, 0, -0.1, 0.55, 1.5, 0.15, 'wood');
  kit.pop();
}

// ------------------------------------------------------------------ misc

export function trough(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('planks', 0, 0.3, 0, 2.0, 0.6, 0.7, { col: 'wood' });
  kit.box('water', 0, 0.52, 0, 1.85, 0.02, 0.55, { cast: false });
  kit.pop();
}

export function hay(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('grass_dead', 0, 0.3, 0, 1.2, 0.6, 0.8, { cast: false });
  kit.box('grass_dead', 0.2, 0.85, 0.05, 1.1, 0.5, 0.75, { ry: 0.3, cast: false });
  kit.solid(-0.6, 0, -0.45, 0.6, 1.1, 0.45, 'dirt');
  kit.pop();
}

/** Masons' leftovers: mortar trough, bucket, trowel, pick, stacked fresh blocks, trestle plank. */
export function masonsTools(kit: Kit, x: number, y: number, z: number, yaw = 0) {
  kit.push(x, y, z, yaw);
  kit.box('planks', 0, 0.12, 0, 1.2, 0.24, 0.6, { cast: false });
  kit.box('mud', 0, 0.23, 0, 1.08, 0.03, 0.5, { cast: false });
  kit.box('iron', 0.2, 0.26, 0.1, 0.22, 0.01, 0.12, { ry: 0.4, rz: 0.2, cast: false });
  kit.box('timber', 0.34, 0.3, 0.14, 0.03, 0.03, 0.14, { ry: 0.4, cast: false });
  bucket(kit, -0.9, 0, 0.3, 'planks', 'mud');
  for (let i = 0; i < 5; i++) kit.box('stone_fresh', 1.2 + (i % 3) * 0.02, 0.15 + Math.floor(i / 2) * 0.3, -0.1 + (i % 2) * 0.42, 0.55, 0.28, 0.38, { ry: (i % 3) * 0.05, cast: false });
  kit.box('timber', -0.4, 0.05, -0.55, 0.05, 0.05, 1.0, { ry: 1.2, cast: false });
  kit.box('iron', -0.8, 0.06, -0.72, 0.4, 0.05, 0.05, { ry: 1.2, cast: false });
  kit.solid(-0.65, 0, -0.35, 1.5, 0.6, 0.35, 'wood');
  kit.pop();
}

/** Iron barred grille (window bars) spanning w × h on a plane; front +Z. */
export function bars(kit: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number, spacing = 0.16) {
  kit.push(x, y, z, yaw);
  const n = Math.max(2, Math.round(w / spacing));
  for (let i = 0; i <= n; i++) kit.box('iron', -w / 2 + (w * i) / n, h / 2, 0, 0.04, h, 0.04, { cast: false });
  for (const yy of [0.1, h / 2, h - 0.1]) kit.box('iron', 0, yy, 0, w, 0.05, 0.05, { cast: false });
  kit.pop();
}

/** Simple standing torch post for exteriors. */
export function torchPost(kit: Kit, x: number, y: number, z: number) {
  kit.add('timber_dark', cyl(0.05, 0.07, 2.0, 5), { x, y, z });
  kit.solid(x - 0.09, y, z - 0.09, x + 0.09, y + 2.0, z + 0.09, 'wood');
  kit.add('iron', cyl(0.12, 0.06, 0.18, 6, true), { x, y: y + 2.0, z }, { cast: false });
  kit.shared.instances.add(FLAME_KEY, flameGeo, 'fire', new THREE.Matrix4().makeScale(1.5, 1.8, 1.5).setPosition(kit.wp(x, y + 2.1, z)));
}



/**
 * Rough rock face along a line from (x0,z0) to (x1,z1): a backing slab plus overlapping jittered
 * rocks, from yBase up to roughly yTop. `side` = which side (±1, relative to the line direction's
 * left normal) the rocks bulge toward. The backing slab and every rock collide with their own shape
 * (pass `col = false` for far scenery), so nothing drawn here can be walked into.
 */
export function rockFace(kit: Kit, x0: number, z0: number, x1: number, z1: number, yBase: number, yTop: number, seed: number, side = 1, thick = 2, mat: MaterialId = 'rock_cliff', rMax = 2.8, col = true) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  const nx = -dz * side, nz = dx * side; // left normal × side
  const H = yTop - yBase;
  // backing slab
  kit.push((x0 + x1) / 2 - nx * thick / 2, yBase, (z0 + z1) / 2 - nz * thick / 2, Math.atan2(-dz, dx));
  kit.bmm(mat, -len / 2, 0, -thick / 2, len / 2, H * 0.92, thick / 2, { cast: true, col });
  kit.pop();
  const n = Math.max(2, Math.round(len / Math.max(2.6, rMax * 1.1)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
    const r = kit.rng.range(Math.min(1.6, rMax * 0.7), rMax);
    const layers = Math.max(1, Math.round(H / (r * 1.3)));
    for (let k = 0; k < layers; k++) {
      const yy = yBase + (H * (k + 0.5)) / layers + kit.rng.range(-0.5, 0.5);
      const out = kit.rng.range(-0.2, 0.5);
      const g = rock(r, seed * 97 + i * 13 + k, kit.rng.range(0.8, 1.3), 1), t = { x: px + nx * out, y: yy, z: pz + nz * out, ry: kit.rng.range(0, 6) };
      if (col) kit.colGeo(g, t);
      kit.add(mat, g, t, { cast: true });
    }
  }
}
