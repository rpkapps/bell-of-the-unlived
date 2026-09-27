/**
 * Imprint Technique clips (Phase 2). Two-handed variants come from `pair()` (the `_1h` twin is
 * used when a shield occupies the left hand). Windows & effects: src/combat/movesets.ts.
 */
import { GREAT_REST, HAFT_REST, POLE_REST, ESTOC_REST } from '../stances';
import { clip, H, pair, restOf, type K } from './common';
import type { V3 } from '../../types';
import { OFF } from './heavy';
import { turned, SWEEP } from './polearms';

const UP: V3 = [0, 1, 0];
const great = restOf({ handR: GREAT_REST, chest: [3, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0] });
const haft = restOf({ handR: HAFT_REST, chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const pole = (t: number): K => ({ t, ease: 'inout', handR: POLE_REST, off: 0.3, chest: [1, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });

const LOW_GUARD: K = { t: 0, handR: H([-0.18, 1.02, 0.38], [0.1, 0.3, 0.95], { up: UP, elbow: [-0.7, -0.6, -0.3] }), chest: [10, -16, 0], spine: [6, -6, 0], hips: [0, -10, 0], hipsPos: [0, -0.16, -0.04], footR: [-0.16, 0.08, -0.24], footL: [0.15, 0.08, 0.22], head: [-8, 10, 0] };
const BUCKLER_LOW = { socket: 'shieldL' as const, p: [0.14, 1.08, 0.38] as V3, dir: [0.05, 1, 0.1] as V3, up: [0.2, 0, 1] as V3, elbow: [0.9, -0.3, -0.2] as V3 };
const KNELL_UP: K = { t: 0, handR: H([-0.24, 1.7, -0.2], [-0.1, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.1] }), chest: [-14, -24, 0], spine: [-6, -10, 0], hips: [0, -8, 0], hipsPos: [0, -0.06, -0.06], footR: [-0.15, 0.08, -0.26] };

const breaker: K[] = [
  great(0),
  { t: 0.3, ease: 'out', handR: H([-0.26, 1.45, -0.08], [-0.15, 0.5, -0.85], { elbow: [-0.9, 0, -0.2] }), chest: [-4, -18, 0], spine: [4, -6, 0], hips: [0, -4, 0], hipsPos: [0, -0.24, -0.04], footL: [0.14, 0.08, 0.12], footR: [-0.14, 0.08, -0.12] },
  { t: 0.55, ease: 'out', handR: H([-0.12, 1.95, -0.05], [0, 0.25, -0.97], { elbow: [-0.9, 0.2, -0.2] }), chest: [-16, -6, 0], spine: [-6, -2, 0], hips: [0, 0, 0], head: [-6, 0, 0], hipsPos: [0, 0.32, 0.08], footL: [0.14, 0.5, 0.22], footR: [-0.14, 0.42, -0.05] },
  { t: 0.72, ease: 'in', handR: H([-0.08, 1.62, 0.48], [0, 0.8, 0.6]), chest: [4, -4, 0], spine: [2, 0, 0], head: [0, 0, 0], hipsPos: [0, 0.12, 0.18], footL: [0.14, 0.3, 0.35], footR: [-0.14, 0.25, 0.05] },
  { t: 0.8, ease: 'out', handR: H([-0.04, 0.66, 0.66], [0, -0.42, 0.91]), chest: [36, 0, 0], spine: [18, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.36, 0.18], footL: [0.15, 0.08, 0.45], footR: [-0.15, 0.08, -0.15] },
  { t: 1.2, hold: true, handR: H([-0.05, 0.68, 0.64], [0, -0.4, 0.92]), chest: [32, 0, 0], spine: [16, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.32, 0.16] },
  great(1.6),
];

const measuredGreat: K[] = [
  great(0),
  { t: 0.22, ease: 'out', handR: H([-0.3, 1.5, 0.0], [-0.3, 0.62, -0.72], { elbow: [-0.9, -0.1, -0.2] }), chest: [-4, -34, 0], spine: [2, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.16, 0], footR: [-0.15, 0.08, -0.3] },
  { t: 0.3, ease: 'in', handR: H([-0.06, 1.28, 0.48], [0.3, 0.4, 0.87]), chest: [8, -4, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.4] },
  { t: 0.38, ease: 'out', handR: H([0.24, 0.86, 0.4], [0.8, -0.28, 0.52]), chest: [18, 26, 0], spine: [10, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.16, 0.08] },
  { t: 0.56, ease: 'out', handR: H([0.22, 1.1, 0.24], [0.85, 0.2, -0.48], { elbow: [-0.3, -0.8, -0.4] }), chest: [6, 34, 0], spine: [4, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.1, 0] },
  { t: 0.64, ease: 'in', handR: H([0.0, 1.12, 0.54], [-0.05, 0.12, 0.99]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.3] },
  { t: 0.72, ease: 'out', handR: H([-0.36, 1.16, 0.24], [-0.88, 0.15, -0.44]), chest: [2, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.12, 0.05] },
  { t: 0.95, hold: true, handR: H([-0.35, 1.17, 0.23], [-0.86, 0.2, -0.46]), chest: [2, -28, 0], spine: [0, -11, 0], hipsPos: [0, -0.1, 0.04] },
  great(1.2),
];

const sweepPole: K[] = [
  pole(0),
  turned(0.3, -100, SWEEP, { hipsPos: [0, -0.18, -0.02], footR: [-0.17, 0.08, -0.2], footL: [0.15, 0.08, 0.2] }, 'out'),
  turned(0.45, -10, SWEEP, { hipsPos: [0, -0.2, 0.04] }, 'in'),
  turned(0.52, 20, SWEEP, { hipsPos: [0, -0.2, 0.04] }, 'out'),
  turned(0.92, 24, SWEEP, { hipsPos: [0, -0.2, 0.04] }),
  { ...turned(1.05, 45, SWEEP, { hipsPos: [0, -0.16, 0.06] }, 'out'), hold: true },
  pole(1.4),
];
const sweepGreat: K[] = [
  great(0),
  { t: 0.3, ease: 'out', handR: H([-0.34, 1.12, 0.02], [-0.85, 0.1, -0.5], { elbow: [-0.8, -0.5, -0.2] }), chest: [-2, -40, 0], spine: [0, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.16, 0], footR: [-0.17, 0.08, -0.2], footL: [0.15, 0.08, 0.2] },
  { t: 0.45, ease: 'in', handR: H([-0.1, 1.1, 0.5], [-0.1, 0.05, 0.99]), chest: [4, -4, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.2, 0.04] },
  { t: 0.52, ease: 'out', handR: H([0.08, 1.1, 0.46], [0.5, 0.05, 0.86]), chest: [4, 16, 0], spine: [2, 6, 0], hips: [0, 4, 0] },
  { t: 0.92, handR: H([0.1, 1.1, 0.45], [0.52, 0.05, 0.85]), chest: [4, 18, 0], spine: [2, 6, 0], hips: [0, 4, 0] },
  { t: 1.05, ease: 'out', hold: true, handR: H([0.32, 1.1, 0.22], [0.85, 0.05, -0.5]), chest: [4, 30, 0], spine: [2, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.05] },
  great(1.4),
];

const knellCharge: K[] = [haft(0), { ...KNELL_UP, t: 0.4, ease: 'out' }, { ...KNELL_UP, t: 1.3, chest: [-16, -26, 0], hipsPos: [0, -0.08, -0.07] }];
const knellStrike: K[] = [
  { ...KNELL_UP, t: 0 },
  { t: 0.1, ease: 'in', handR: H([-0.1, 1.5, 0.45], [0, 0.8, 0.6]), chest: [4, -6, 0], spine: [2, -2, 0], hips: [0, 0, 0], footL: [0.15, 0.08, 0.42], footR: [-0.15, 0.08, -0.14] },
  { t: 0.2, ease: 'out', handR: H([-0.04, 0.7, 0.62], [0, -0.6, 0.8]), chest: [32, 0, 0], spine: [16, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.26, 0.12] },
  { t: 0.6, hold: true, handR: H([-0.05, 0.72, 0.6], [0, -0.58, 0.8]), chest: [30, 0, 0], spine: [15, 0, 0], head: [-12, 0, 0], hipsPos: [0, -0.24, 0.11] },
  haft(1.1),
];

const charge: K[] = [
  pole(0),
  { t: 0.15, ease: 'out', handR: H([-0.24, 1.08, -0.06], [0.1, 0.08, 0.99], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.55, chest: [6, -30, 0], spine: [4, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, 0] },
  { t: 0.9, handR: H([-0.24, 1.08, -0.06], [0.1, 0.08, 0.99], { up: UP, elbow: [-0.7, -0.5, -0.4] }), off: 0.55, chest: [8, -30, 0], spine: [4, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.12, 0] },
  { t: 1.02, ease: 'out', handR: H([-0.06, 1.24, 0.46], [0.03, 0.04, 1], { up: UP }), off: 0.16, chest: [14, -6, 0], spine: [8, -2, 0], hips: [0, -2, 0], hipsPos: [0, -0.18, 0.12] },
  { t: 1.25, handR: H([-0.07, 1.23, 0.44], [0.03, 0.04, 1], { up: UP }), off: 0.17, chest: [14, -6, 0], spine: [8, -2, 0], hipsPos: [0, -0.17, 0.11] },
  pole(1.5),
];

const pursuit: K[] = [
  { t: 0, handR: ESTOC_REST, off: 0.3, chest: [1, -10, 0], spine: [0, 0, 0], hips: [0, -4, 0], hipsPos: [0, -0.05, 0] },
  { t: 0.14, ease: 'out', handR: H([-0.28, 1.15, -0.1], [0.08, 0.08, 0.99], { up: UP, elbow: [-0.7, -0.4, -0.4] }), off: 0.6, chest: [0, -34, 0], spine: [0, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, -0.03] },
  { t: 0.22, ease: 'out', handR: H([-0.07, 1.25, 0.56], [0.03, 0.02, 1], { up: UP }), off: 0.18, chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.16, 0.1], footL: [0.14, 0.08, 0.4] },
  { t: 0.36, ease: 'inout', handR: H([-0.27, 1.2, -0.05], [0.08, 0.1, 0.99], { up: UP, elbow: [-0.7, -0.4, -0.4] }), off: 0.6, chest: [0, -30, 0], spine: [0, -10, 0], hips: [0, -8, 0], hipsPos: [0, -0.12, 0], footL: [0.14, 0.08, 0.15] },
  { t: 0.46, ease: 'out', handR: H([-0.06, 1.32, 0.56], [0.03, 0.08, 1], { up: UP }), off: 0.18, chest: [8, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.14, 0.1], footL: [0.14, 0.08, 0.42] },
  { t: 0.62, ease: 'inout', handR: H([-0.3, 1.18, -0.15], [0.08, 0.06, 0.99], { up: UP, elbow: [-0.7, -0.4, -0.4] }), off: 0.64, chest: [-2, -38, 0], spine: [0, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.14, -0.04], footR: [-0.16, 0.08, -0.28], footL: [0.14, 0.08, 0.15] },
  { t: 0.76, ease: 'out', handR: H([-0.04, 1.22, 0.62], [0.02, 0, 1], { up: UP }), off: 0.14, chest: [16, -4, 0], spine: [10, 0, 0], hips: [0, -2, 0], hipsPos: [0, -0.26, 0.16], footL: [0.15, 0.08, 0.66], footR: [-0.15, 0.08, -0.2] },
  { t: 1.0, handR: H([-0.05, 1.21, 0.6], [0.02, 0, 1], { up: UP }), off: 0.15, chest: [16, -4, 0], spine: [10, 0, 0], hipsPos: [0, -0.25, 0.15] },
  { t: 1.3, ease: 'inout', handR: ESTOC_REST, off: 0.3, chest: [1, -10, 0], spine: [0, 0, 0], hips: [0, -4, 0], hipsPos: [0, -0.05, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
];

const parryGreat: K[] = [
  great(0),
  { t: 0.07, ease: 'out', handR: H([-0.12, 1.28, 0.4], [0.35, 0.9, 0.2], { up: [0.7, -0.3, 0.6], elbow: [-0.8, -0.5, -0.2] }), chest: [2, 12, 0], spine: [2, 4, 0] },
  { t: 0.3, handR: H([0.0, 1.3, 0.36], [0.55, 0.8, 0.2], { up: [0.7, -0.5, 0.5], elbow: [-0.8, -0.5, -0.2] }), chest: [0, 18, 0], spine: [0, 6, 0] },
  great(0.7),
];
const parryPole: K[] = [
  pole(0),
  { t: 0.07, ease: 'out', handR: H([-0.22, 1.1, 0.2], [0.55, 0.8, 0.2], { up: [0.7, -0.5, 0.4], elbow: [-0.8, -0.5, -0.2] }), off: 0.4, chest: [2, 10, 0], spine: [2, 4, 0] },
  { t: 0.3, handR: H([-0.16, 1.12, 0.2], [0.7, 0.68, 0.2], { up: [0.6, -0.7, 0.4], elbow: [-0.8, -0.5, -0.2] }), off: 0.4, chest: [0, 16, 0], spine: [0, 6, 0] },
  pole(0.7),
];

export const techniqueClips = {
  /** Riposte Stance (held): a low, patient guard. */
  riposteStance: clip('riposteStance', [
    { ...LOW_GUARD, t: 0.2, ease: 'out' },
    { ...LOW_GUARD, t: 1.1, hipsPos: [0, -0.17, -0.04] },
    { ...LOW_GUARD, t: 2.2 },
  ], 0.6),
  riposteStanceShield: clip('riposteStanceShield', [
    { ...LOW_GUARD, t: 0.2, ease: 'out', handL: BUCKLER_LOW },
    { ...LOW_GUARD, t: 1.1, handL: BUCKLER_LOW, hipsPos: [0, -0.17, -0.04] },
    { ...LOW_GUARD, t: 2.2, handL: BUCKLER_LOW },
  ], 0.6),
  /** Leaving the stance without a counter. */
  riposteRelease: clip('riposteRelease', [
    { ...LOW_GUARD, t: 0 },
    { t: 0.35, ease: 'inout', chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0], head: [0, 0, 0], footR: [-0.12, 0.08, -0.03], footL: [0.12, 0.08, 0.02] },
  ], 0.6),

  /** Bell Breaker: crouch, leap, crushing overhead landing (impact 0.8). */
  ...pair('bellBreaker', breaker, -0.18, 1.3),
  /** Measured Cut with a greatsword: two cuts on a gliding dash. */
  ...pair('measuredCutGreat', measuredGreat, OFF.greatsword, 1.4),
  /** Rending Sweep (polearm): wind up, then the body turns a full circle (root spin) with the blade out. */
  ...pair('rendingSweep', sweepPole, OFF.halberd, 1.6),
  ...pair('rendingSweepGreat', sweepGreat, OFF.greatsword, 1.4),

  /** Greyford Flourish: three quick slashes in a rising line. */
  greyfordFlourish: clip('greyfordFlourish', [
    { t: 0.12, ease: 'out', handR: H([-0.42, 0.95, 0.15], [-0.7, -0.3, 0.65], { elbow: [-0.8, -0.4, -0.3] }), chest: [4, -26, 0], spine: [2, -10, 0], hips: [0, -6, 0], hipsPos: [0, -0.1, 0] },
    { t: 0.18, ease: 'in', handR: H([-0.1, 1.0, 0.56], [0.2, -0.1, 0.97]), chest: [6, -4, 0], spine: [2, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.24] },
    { t: 0.26, ease: 'out', handR: H([0.32, 1.0, 0.36], [0.85, -0.1, 0.5]), chest: [6, 24, 0], spine: [2, 10, 0], hips: [0, 6, 0] },
    { t: 0.34, ease: 'out', handR: H([0.36, 1.2, 0.25], [0.8, 0.2, -0.55], { elbow: [-0.2, -0.8, -0.4] }), chest: [4, 28, 0] },
    { t: 0.4, ease: 'in', handR: H([0.0, 1.25, 0.58], [-0.1, 0.25, 0.96]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.2] },
    { t: 0.46, ease: 'out', handR: H([-0.42, 1.3, 0.25], [-0.85, 0.3, -0.3]), chest: [0, -26, 0], spine: [0, -10, 0], hips: [0, -6, 0] },
    { t: 0.54, ease: 'out', handR: H([-0.45, 1.2, 0.05], [-0.7, 0.1, -0.7], { elbow: [-0.8, -0.4, -0.3] }), chest: [2, -30, 0] },
    { t: 0.61, ease: 'in', handR: H([-0.1, 1.4, 0.58], [0.2, 0.5, 0.85]), chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.36] },
    { t: 0.68, ease: 'out', handR: H([0.3, 1.75, 0.2], [0.5, 0.85, -0.2]), chest: [-8, 24, 0], spine: [-4, 10, 0], hips: [0, 6, 0], hipsPos: [0, -0.04, 0.06] },
    { t: 0.85, hold: true, handR: H([0.28, 1.72, 0.18], [0.45, 0.87, -0.2]), chest: [-6, 22, 0], spine: [-3, 9, 0] },
  ], 0.86),

  /** Grave Knell: gather (held), then a tolling crush (impact 0.2). */
  ...pair('knellCharge', knellCharge, OFF.hammer, 0.7),
  ...pair('knellStrike', knellStrike, OFF.hammer, 0.7),

  /** Unbroken Links: arm out, chain level; the root turns two full circles. */
  chainWhirl: clip('chainWhirl', [
    { t: 0.25, ease: 'out', handR: H([-0.36, 1.35, 0.22], [-0.92, 0.15, 0.35], { up: [0.35, 0, 0.94], elbow: [-0.9, -0.2, -0.2] }), chest: [0, -20, 0], spine: [0, -8, 0], hipsPos: [0, -0.1, 0], head: [0, 10, 0] },
    { t: 0.8, handR: H([-0.37, 1.38, 0.24], [-0.92, 0.2, 0.33], { up: [0.35, 0, 0.94], elbow: [-0.9, -0.2, -0.2] }), chest: [4, -16, 0], hipsPos: [0, -0.12, 0] },
    { t: 1.35, handR: H([-0.36, 1.35, 0.22], [-0.92, 0.15, 0.35], { up: [0.35, 0, 0.94], elbow: [-0.9, -0.2, -0.2] }), chest: [0, -20, 0], hipsPos: [0, -0.1, 0] },
    { t: 1.5, ease: 'out', handR: H([0.3, 1.1, 0.3], [0.8, -0.4, 0.4]), chest: [10, 20, 0], spine: [4, 8, 0], hipsPos: [0, -0.1, 0.04], head: [0, 0, 0] },
    { t: 1.8, hold: true, handR: H([0.26, 1.05, 0.3], [0.5, -0.8, 0.3]), chest: [8, 16, 0], spine: [3, 6, 0] },
  ], 0.72),

  /** Impaling Charge: point levelled, run (legs from locomotion), drive it home at 1.02. */
  ...pair('impalingCharge', charge, OFF.spear, 1.65),

  /** Ember Edge: the off hand draws resin along the weapon. */
  emberEdge: clip('emberEdge', [
    { t: 0.25, ease: 'out', handR: H([-0.16, 1.18, 0.34], [0.95, 0.12, 0.2], { up: UP, elbow: [-0.7, -0.6, -0.3] }), handL: H([-0.02, 1.22, 0.42], [0, 0.3, 1], { up: [0, 1, -0.3], elbow: [0.7, -0.6, -0.3] }), chest: [6, -6, 0], head: [10, 0, 0] },
    { t: 0.8, handR: H([-0.16, 1.18, 0.34], [0.95, 0.12, 0.2], { up: UP, elbow: [-0.7, -0.6, -0.3] }), handL: H([0.36, 1.27, 0.44], [0, 0.3, 1], { up: [0, 1, -0.3], elbow: [0.7, -0.6, -0.3] }), chest: [6, 4, 0], head: [10, 10, 0] },
    { t: 1.0, handR: H([-0.2, 1.2, 0.3], [0.6, 0.6, 0.5], { up: UP }), handL: H([0.3, 1.1, 0.3], [0, 0.3, 1], { up: [0, 1, -0.3], elbow: [0.7, -0.6, -0.3] }), chest: [2, 0, 0], head: [0, 0, 0] },
    { t: 1.2, handL: null, chest: [2, -4, 0] },
  ], 0.9),

  /** Vow Parry: turn the blow with the blade itself. */
  vowParry: clip('vowParry', [
    { t: 0.06, ease: 'out', handR: H([-0.12, 1.32, 0.42], [0.55, 0.78, 0.3], { up: [0.6, -0.6, 0.5], elbow: [-0.8, -0.5, -0.2] }), chest: [2, 14, 0], spine: [2, 6, 0] },
    { t: 0.4, handR: H([0.02, 1.3, 0.38], [0.7, 0.65, 0.3], { up: [0.5, -0.7, 0.5], elbow: [-0.8, -0.5, -0.2] }), chest: [0, 20, 0], spine: [0, 8, 0] },
  ], 0.9),
  /** Two-handed weapon parries (greatsword / hammer; polearms). */
  ...pair('parryGreat', parryGreat, -0.18, 1.3),
  ...pair('parryPole', parryPole, OFF.spear, 1.6),

  /** Vow's Pursuit: three advancing thrusts; the last pierces a guard. */
  ...pair('vowPursuit', pursuit, OFF.spear, 1.1),
};
