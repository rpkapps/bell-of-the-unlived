/**
 * Polearms: spear (thrusts) and halberd (sweeps, thrust, chop). Two-handed with the LEFT hand
 * forward on the shaft (offhandGrip +0.55, varied per key so the shaft slides through the lead
 * hand on thrusts); `_1h` variants are used with a shield. Sweeps keep a fixed chest-relative
 * "ready" grip and rotate it with the trunk, which is how a polearm is actually swung.
 */
import { POLE_REST, SHIELD_GUARD } from '../stances';
import { clip, clip2, H, pair, restOf, type K } from './common';
import type { HandKey, V3 } from '../../types';
import { OFF } from './heavy';

const UP: V3 = [0, 1, 0];
const pole = restOf({ handR: POLE_REST, chest: [1, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });
/** Rest key for two-handed polearm clips: lead hand on the shaft at chest height. */
const pole2 = (t: number): K => ({ ...pole(t), off: 0.3 });

const D2R = Math.PI / 180;
const rot = (v: V3, deg: number): V3 => {
  const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
};
/** A grip authored relative to the chest, turned with the whole trunk by `deg` (+ = toward the character's left). */
function turned(t: number, deg: number, grip: { p: V3; dir: V3; up?: V3 }, x: Partial<K> = {}, ease: K['ease'] = 'smooth'): K {
  const h: HandKey = { p: rot(grip.p, deg), dir: rot(grip.dir, deg), ...(grip.up ? { up: rot(grip.up, deg) } : {}) };
  const lc = x.chest?.[0] ?? 4, ls = x.spine?.[0] ?? 4;
  return { ...x, t, ease, handR: h, hips: [0, deg * 0.4, 0], spine: [ls, deg * 0.25, 0], chest: [lc, deg * 0.35, 0] };
}
/** Levelled halberd grip (head at chest height, blade leading to the character's left). */
const SWEEP = { p: [-0.2, 1.04, 0.1] as V3, dir: [0.26, 0.1, 0.96] as V3 };
const SWEEP_LOW = { p: [-0.2, 0.98, 0.12] as V3, dir: [0.26, -0.05, 0.96] as V3 };

// ------------------------------------------------------------------ spear
const SP_CHARGE: K = { t: 0, handR: H([-0.32, 1.12, -0.32], [0.1, 0.06, 0.99], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.7, chest: [-4, -42, 0], spine: [-2, -16, 0], hips: [0, -16, 0], hipsPos: [0, -0.14, -0.08], footL: [0.14, 0.08, 0.22], footR: [-0.16, 0.08, -0.34] };
const spearKeys = {
  spearLight1: [
    pole2(0),
    { t: 0.18, ease: 'out', handR: H([-0.26, 1.02, -0.18], [0.12, 0.1, 0.99], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.62, chest: [0, -38, 0], spine: [0, -14, 0], hips: [0, -14, 0], hipsPos: [0, -0.1, -0.04], footL: [0.14, 0.08, 0.18], footR: [-0.14, 0.08, -0.2] },
    { t: 0.28, ease: 'out', handR: H([-0.08, 1.2, 0.44], [0.04, 0.04, 1], { up: UP }), off: 0.18, chest: [10, -8, 0], spine: [6, -4, 0], hips: [0, -4, 0], hipsPos: [0, -0.16, 0.1], footL: [0.14, 0.08, 0.42] },
    { t: 0.44, handR: H([-0.09, 1.19, 0.42], [0.04, 0.04, 1], { up: UP }), off: 0.2, chest: [10, -8, 0], spine: [6, -4, 0], hipsPos: [0, -0.15, 0.09] },
    pole2(0.72),
  ] as K[],
  spearLight2: [
    { t: 0, handR: H([-0.09, 1.19, 0.42], [0.04, 0.04, 1], { up: UP }), off: 0.2, chest: [10, -8, 0], spine: [6, -4, 0], hipsPos: [0, -0.15, 0.09] },
    { t: 0.16, ease: 'out', handR: H([-0.28, 1.08, -0.14], [0.1, 0.2, 0.97], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.6, chest: [2, -36, 0], spine: [0, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.12, -0.03], footR: [-0.14, 0.08, -0.2] },
    { t: 0.26, ease: 'out', handR: H([-0.1, 1.36, 0.42], [0.04, 0.12, 0.99], { up: UP }), off: 0.18, chest: [6, -6, 0], spine: [4, -2, 0], hips: [0, -2, 0], hipsPos: [0, -0.12, 0.09], footL: [0.14, 0.08, 0.4] },
    { t: 0.42, handR: H([-0.11, 1.34, 0.4], [0.04, 0.12, 0.99], { up: UP }), off: 0.2, chest: [6, -6, 0], hipsPos: [0, -0.12, 0.08] },
    pole2(0.7),
  ] as K[],
  spearLight3: [
    { t: 0, handR: H([-0.11, 1.34, 0.4], [0.04, 0.12, 0.99], { up: UP }), off: 0.2, chest: [6, -6, 0], hipsPos: [0, -0.12, 0.08] },
    { t: 0.26, ease: 'out', handR: H([-0.3, 0.98, -0.25], [0.14, 0.08, 0.99], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.66, chest: [-2, -40, 0], spine: [0, -16, 0], hips: [0, -16, 0], hipsPos: [0, -0.16, -0.06], footR: [-0.16, 0.08, -0.3] },
    { t: 0.38, ease: 'out', handR: H([-0.06, 1.18, 0.52], [0.03, 0, 1], { up: UP }), off: 0.14, chest: [16, -4, 0], spine: [10, 0, 0], hips: [0, -2, 0], hipsPos: [0, -0.26, 0.16], footL: [0.15, 0.08, 0.66], footR: [-0.15, 0.08, -0.2] },
    { t: 0.6, handR: H([-0.07, 1.17, 0.5], [0.03, 0, 1], { up: UP }), off: 0.15, chest: [16, -4, 0], spine: [10, 0, 0], hipsPos: [0, -0.25, 0.15] },
    pole2(0.9),
  ] as K[],
  spearHeavyCharge: [
    pole2(0),
    { ...SP_CHARGE, t: 0.4, ease: 'out' },
    { ...SP_CHARGE, t: 1.1, chest: [-6, -44, 0], hipsPos: [0, -0.16, -0.09] },
  ] as K[],
  spearHeavyRelease: [
    { ...SP_CHARGE, t: 0 },
    { t: 0.1, ease: 'out', handR: H([-0.04, 1.22, 0.54], [0.03, 0.02, 1], { up: UP }), off: 0.12, chest: [16, -6, 0], spine: [10, -2, 0], hips: [0, -2, 0], hipsPos: [0, -0.28, 0.18], footL: [0.15, 0.08, 0.7], footR: [-0.15, 0.08, -0.22] },
    { t: 0.55, handR: H([-0.05, 1.2, 0.52], [0.03, 0.02, 1], { up: UP }), off: 0.13, chest: [16, -6, 0], spine: [10, -2, 0], hipsPos: [0, -0.27, 0.16] },
    pole2(0.95),
  ] as K[],
};

// ------------------------------------------------------------------ halberd
const HAL_CHARGE = turned(0, -120, SWEEP_LOW, { hipsPos: [0, -0.16, -0.02], footR: [-0.18, 0.08, -0.26], footL: [0.14, 0.08, 0.2] });
const halberdKeys = {
  /** Light 1: great horizontal sweep, right → left, the whole trunk turning. */
  halberdLight1: [
    pole2(0),
    turned(0.32, -100, SWEEP, { hipsPos: [0, -0.1, -0.02], footR: [-0.16, 0.08, -0.18] }, 'out'),
    turned(0.44, -10, SWEEP, { hipsPos: [0, -0.14, 0.06], footL: [0.14, 0.08, 0.34] }, 'in'),
    turned(0.52, 55, SWEEP, { hipsPos: [0, -0.14, 0.08] }, 'out'),
    { ...turned(0.74, 50, SWEEP, { hipsPos: [0, -0.13, 0.07] }), hold: true },
    pole2(1.0),
  ] as K[],
  /** Light 2: driving thrust. */
  halberdLight2: [
    { ...turned(0, 50, SWEEP, { hipsPos: [0, -0.13, 0.07] }) },
    { t: 0.2, ease: 'out', handR: H([-0.26, 1.02, -0.18], [0.12, 0.12, 0.98], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.6, chest: [0, -36, 0], spine: [0, -14, 0], hips: [0, -14, 0], hipsPos: [0, -0.1, -0.04], footR: [-0.14, 0.08, -0.2] },
    { t: 0.3, ease: 'out', handR: H([-0.08, 1.2, 0.44], [0.04, 0.06, 1], { up: UP }), off: 0.18, chest: [10, -8, 0], spine: [6, -4, 0], hips: [0, -4, 0], hipsPos: [0, -0.16, 0.1], footL: [0.14, 0.08, 0.44] },
    { t: 0.5, handR: H([-0.09, 1.19, 0.42], [0.04, 0.06, 1], { up: UP }), off: 0.2, chest: [10, -8, 0], spine: [6, -4, 0], hipsPos: [0, -0.15, 0.09] },
    pole2(0.8),
  ] as K[],
  /** Light 3: overhead chop. */
  halberdLight3: [
    { t: 0, handR: H([-0.09, 1.19, 0.42], [0.04, 0.06, 1], { up: UP }), off: 0.2, chest: [10, -8, 0], spine: [6, -4, 0], hipsPos: [0, -0.15, 0.09] },
    { t: 0.4, ease: 'out', handR: H([-0.2, 1.28, 0.08], [-0.1, 0.82, -0.56], { elbow: [-0.8, -0.4, -0.3] }), off: 0.42, chest: [-10, -16, 0], spine: [-4, -6, 0], hips: [0, -6, 0], hipsPos: [0, -0.02, -0.04], footR: [-0.15, 0.08, -0.22] },
    { t: 0.49, ease: 'in', handR: H([-0.16, 1.22, 0.22], [0, 0.85, 0.52]), off: 0.34, chest: [4, -6, 0], spine: [2, -2, 0], hips: [0, -2, 0], footL: [0.14, 0.08, 0.36] },
    { t: 0.56, ease: 'out', handR: H([-0.14, 1.02, 0.26], [0, -0.22, 0.97]), off: 0.3, chest: [26, -4, 0], spine: [14, -2, 0], hips: [0, -2, 0], hipsPos: [0, -0.2, 0.1], head: [-12, 0, 0] },
    { t: 0.8, hold: true, handR: H([-0.15, 1.02, 0.24], [0, -0.2, 0.98]), off: 0.3, chest: [24, -4, 0], spine: [13, -2, 0], hipsPos: [0, -0.19, 0.09], head: [-10, 0, 0] },
    pole2(1.1),
  ] as K[],
  halberdHeavyCharge: [
    pole2(0),
    { ...HAL_CHARGE, t: 0.45, ease: 'out' },
    { ...HAL_CHARGE, t: 1.2, hipsPos: [0, -0.18, -0.03] },
  ] as K[],
  /** Heavy release: full sweep, far wider than the light. */
  halberdHeavyRelease: [
    { ...HAL_CHARGE, t: 0 },
    turned(0.16, -20, SWEEP, { hipsPos: [0, -0.16, 0.06], footL: [0.15, 0.08, 0.42] }, 'in'),
    turned(0.3, 80, SWEEP, { hipsPos: [0, -0.16, 0.1] }, 'out'),
    { ...turned(0.7, 74, SWEEP, { hipsPos: [0, -0.15, 0.09] }), hold: true },
    pole2(1.15),
  ] as K[],
};

export const polearmClips = {
  ...Object.fromEntries(Object.entries(spearKeys).flatMap(([n, k]) => Object.entries(pair(n, k, OFF.spear, 1.65)))),
  ...Object.fromEntries(Object.entries(halberdKeys).flatMap(([n, k]) => Object.entries(pair(n, k, OFF.halberd, 1.6)))),
  /** Spear with a shield: thrust over the raised guard (move keeps `guard`). */
  spearGuardThrust: clip('spearGuardThrust', [
    { t: 0, handR: H([-0.3, 1.05, 0.08], [0.05, 0.08, 1], { up: UP, elbow: [-0.7, -0.5, -0.4] }), handL: SHIELD_GUARD, chest: [4, 10, 0], spine: [4, 4, 0], head: [-4, -6, 0] },
    { t: 0.16, ease: 'out', handR: H([-0.32, 1.1, -0.14], [0.06, 0.08, 1], { up: UP, elbow: [-0.7, -0.5, -0.4] }), chest: [2, 4, 0], hipsPos: [0, -0.06, -0.03] },
    { t: 0.26, ease: 'out', handR: H([-0.2, 1.2, 0.56], [0.03, 0.02, 1], { up: UP }), chest: [8, 14, 0], spine: [6, 4, 0], hipsPos: [0, -0.1, 0.06], footL: [0.13, 0.08, 0.26] },
    { t: 0.42, handR: H([-0.21, 1.19, 0.52], [0.03, 0.02, 1], { up: UP }), chest: [8, 14, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.75, ease: 'inout', handR: H([-0.3, 1.05, 0.08], [0.05, 0.08, 1], { up: UP, elbow: [-0.7, -0.5, -0.4] }), handL: SHIELD_GUARD, chest: [4, 10, 0], spine: [4, 4, 0], hipsPos: [0, -0.05, 0] },
  ], 1.65),
  /** Guard overlay, spear + shield: spear levelled beside the raised shield. */
  guardSpearShield: clip('guardSpearShield', [
    { t: 0, handR: H([-0.3, 1.05, 0.08], [0.05, 0.08, 1], { up: UP, elbow: [-0.7, -0.5, -0.4] }), handL: SHIELD_GUARD, chest: [4, 10, 0], spine: [4, 4, 0], head: [-4, -6, 0] },
  ], 1.65, { loop: true, duration: 1 }),
  /** Guard overlay, spear / halberd without a shield: shaft held across the body. */
  guardPole: clip2('guardPole', [
    { t: 0, handR: H([-0.24, 1.02, 0.3], [0.75, 0.6, 0.25], { up: [0.3, -0.2, 0.93], elbow: [-0.8, -0.5, -0.2] }), chest: [4, 8, 0], spine: [4, 2, 0], head: [-4, -4, 0] },
  ], 0.45, 1.6, [0.7, -0.6, -0.2], { loop: true, duration: 1 }),
};

export { turned, SWEEP };
