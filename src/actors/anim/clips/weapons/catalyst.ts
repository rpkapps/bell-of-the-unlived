/**
 * Catalyst archetype casts (staff / hand bell / censer in the right hand) and the catalysts'
 * melee heavies. `cast` events are placed by the moves in src/combat/movesets.ts.
 */
import { STAFF_REST, FLAIL_REST } from '../stances';
import { clip, clip2, H as HK, restOf, type K } from './common';
import type { HandKey, V3 } from '../../types';
import { OFF } from './heavy';

const H = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => HK(p, dir, { elbow: [-0.7, -0.5, -0.5], ...x });
const st = restOf({ handR: STAFF_REST, chest: [1, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0], head: [0, 0, 0], neck: [0, 0, 0] });
const LEFT_OPEN = { upperArmL: [-30, 0, 30] as V3, forearmL: [-50, 0, 0] as V3 };
const LEFT_REST = { upperArmL: [4, 0, 7] as V3, forearmL: [-14, 0, 0] as V3 };
const CAT_OVER: K = { t: 0, handR: H([-0.12, 1.8, -0.06], [0, 0.35, -0.94], { elbow: [-0.9, 0.1, -0.2] }), chest: [-12, -8, 0], spine: [-6, -4, 0] };
const cen = restOf({ handR: FLAIL_REST, chest: [2, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const CEN_BACK: K = { t: 0, handR: H([-0.36, 0.98, -0.16], [-0.3, -0.6, -0.74], { up: [0.2, -0.75, 0.6], elbow: [-0.8, -0.4, 0] }), chest: [2, -34, 0], spine: [0, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, -0.04], footR: [-0.15, 0.08, -0.24] };

export const catalystClips = {
  /** Shard Volley: the head sweeps right → left through three releases (0.3 / 0.36 / 0.42). */
  castVolley: clip('castVolley', [
    st(0),
    { t: 0.2, ease: 'out', handR: H([-0.34, 1.3, 0.28], [-0.45, 0.35, 0.82], { up: [0, -0.9, 0.4] }), chest: [-2, -22, 0], spine: [0, -8, 0], fk: LEFT_OPEN },
    { t: 0.3, handR: H([-0.28, 1.36, 0.48], [-0.3, 0.3, 0.9], { up: [0, -0.95, 0.3] }), chest: [2, -12, 0], footL: [0.13, 0.08, 0.2] },
    { t: 0.36, handR: H([-0.16, 1.38, 0.54], [0, 0.3, 0.95], { up: [0, -0.95, 0.3] }), chest: [4, 0, 0] },
    { t: 0.42, handR: H([-0.02, 1.36, 0.5], [0.3, 0.3, 0.9], { up: [0, -0.95, 0.3] }), chest: [4, 14, 0], spine: [2, 6, 0] },
    { t: 0.6, handR: H([-0.03, 1.34, 0.48], [0.3, 0.35, 0.88], { up: [0, -0.94, 0.35] }), chest: [4, 12, 0] },
    { ...st(0.9), fk: LEFT_REST },
  ]),
  /** Bellglass Lance: both hands level the staff and gather, then drive it forward (cast 0.72). */
  castLance: clip2('castLance', [
    { ...st(0), off: 0.3 },
    { t: 0.45, ease: 'out', handR: H([-0.3, 1.22, -0.12], [0.1, 0.12, 0.99], { up: [0, 1, 0], elbow: [-0.8, -0.4, -0.4] }), off: 0.34, chest: [-4, -32, 0], spine: [-2, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, -0.05], footR: [-0.16, 0.08, -0.28] },
    { t: 0.64, handR: H([-0.31, 1.23, -0.14], [0.1, 0.12, 0.99], { up: [0, 1, 0], elbow: [-0.8, -0.4, -0.4] }), off: 0.34, chest: [-6, -34, 0], spine: [-2, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.12, -0.06] },
    { t: 0.72, ease: 'out', handR: H([-0.08, 1.34, 0.42], [0.03, 0.04, 1], { up: [0, 1, 0] }), off: 0.2, chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.16, 0.1], footL: [0.14, 0.08, 0.42] },
    { t: 0.95, handR: H([-0.09, 1.33, 0.4], [0.03, 0.04, 1], { up: [0, 1, 0] }), off: 0.2, chest: [10, -4, 0], spine: [6, 0, 0], hipsPos: [0, -0.15, 0.09] },
    { ...st(1.3), off: 0.3 },
  ], 0.3, 1.3),
  /** Falling Hour: raise the catalyst to the sky, then point it down at the marked ground (cast 0.66). */
  castSky: clip('castSky', [
    st(0),
    { t: 0.4, ease: 'out', handR: H([-0.14, 1.72, 0.14], [0.04, 0.97, 0.25], { up: [0, -0.25, 0.97], elbow: [-0.9, 0, -0.3] }), chest: [-10, 0, 0], neck: [-8, 0, 0], head: [-22, 0, 0], fk: LEFT_OPEN },
    { t: 0.66, ease: 'in', handR: H([-0.12, 1.32, 0.52], [0.02, -0.3, 0.95], { up: [0, -0.95, -0.3] }), chest: [12, 0, 0], neck: [4, 0, 0], head: [8, 0, 0], footL: [0.13, 0.08, 0.24] },
    { t: 0.9, handR: H([-0.12, 1.3, 0.5], [0.02, -0.3, 0.95], { up: [0, -0.95, -0.3] }), chest: [12, 0, 0], head: [8, 0, 0] },
    { ...st(1.2), fk: LEFT_REST },
  ]),
  /** Toll of Warding: raise high and stamp the catalyst down (shockwave at 0.56). */
  castToll: clip('castToll', [
    st(0),
    { t: 0.36, ease: 'out', handR: H([-0.12, 1.62, 0.24], [0.02, 0.98, 0.2], { up: [0, -0.2, 0.98], elbow: [-0.9, 0, -0.3] }), chest: [-8, -6, 0], head: [-10, 0, 0], hipsPos: [0, 0.01, 0], fk: LEFT_OPEN },
    { t: 0.56, ease: 'in', handR: H([-0.14, 0.88, 0.36], [0.02, 0.98, 0.2], { up: [0, -0.2, 0.98] }), chest: [20, 0, 0], spine: [10, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.24, 0.04], footL: [0.15, 0.08, 0.26], footR: [-0.15, 0.08, -0.12] },
    { t: 0.85, handR: H([-0.14, 0.9, 0.34], [0.02, 0.98, 0.2], { up: [0, -0.2, 0.98] }), chest: [18, 0, 0], spine: [9, 0, 0], hipsPos: [0, -0.22, 0.03] },
    { ...st(1.2), fk: LEFT_REST },
  ]),
  /** Knell of Rest: swing the bell forward to send the note (cast 0.34). */
  castRing: clip('castRing', [
    st(0),
    { t: 0.18, ease: 'out', handR: H([-0.36, 1.1, -0.05], [-0.2, 0.7, -0.68], { elbow: [-0.9, -0.2, -0.2] }), chest: [-4, -20, 0], spine: [0, -8, 0] },
    { t: 0.34, ease: 'out', handR: H([-0.14, 1.36, 0.5], [0.05, 0.6, 0.8]), chest: [6, 8, 0], spine: [4, 2, 0], footL: [0.13, 0.08, 0.22] },
    { t: 0.52, handR: H([-0.14, 1.34, 0.48], [0.05, 0.65, 0.76], { up: [0, -0.76, 0.65] }), chest: [6, 6, 0] },
    st(0.8),
  ]),
  /** Ember Blessing & weapon buffs: catalyst upright, the free hand drawn up along it (cast 0.62). */
  castBless: clip('castBless', [
    st(0),
    { t: 0.3, ease: 'out', handR: H([-0.12, 1.22, 0.34], [0.02, 1, 0.1], { up: [0, -0.1, 1] }), chest: [4, 8, 0], head: [6, 0, 0], fk: { upperArmL: [-55, 0, -30], forearmL: [-75, 0, 0], handL: [0, 0, 20] } },
    { t: 0.62, handR: H([-0.12, 1.26, 0.34], [0.02, 1, 0.1], { up: [0, -0.1, 1] }), chest: [-4, 8, 0], head: [-10, 0, 0], fk: { upperArmL: [-120, 0, -24], forearmL: [-40, 0, 0], handL: [0, 0, 20] } },
    { t: 0.85, handR: H([-0.12, 1.25, 0.34], [0.02, 1, 0.1], { up: [0, -0.1, 1] }), chest: [-2, 6, 0], head: [-6, 0, 0], fk: { upperArmL: [-100, 0, -10], forearmL: [-30, 0, 0], handL: [0, 0, 0] } },
    { ...st(1.1), fk: { ...LEFT_REST, handL: [0, 0, 0] } },
  ]),

  // ---------------------------------------------------------------- catalyst melee
  /** Staff heavy, split so the release strikes at the hit window (the old single clip struck late). */
  catHeavyCharge: clip('catHeavyCharge', [
    st(0),
    { ...CAT_OVER, t: 0.4, ease: 'out' },
    { ...CAT_OVER, t: 0.9, chest: [-14, -8, 0] },
  ], 1.3),
  catHeavyRelease: clip('catHeavyRelease', [
    { ...CAT_OVER, t: 0 },
    { t: 0.1, ease: 'in', handR: H([-0.08, 1.45, 0.55], [0, 0.6, 0.8]), chest: [8, -4, 0], spine: [4, 0, 0], footL: [0.13, 0.08, 0.34] },
    { t: 0.2, ease: 'out', handR: H([-0.06, 0.78, 0.6], [0, -0.5, 0.86]), chest: [26, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.16, 0.08] },
    { t: 0.45, hold: true, handR: H([-0.07, 0.8, 0.56], [0, -0.4, 0.9]), chest: [22, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.14, 0.06] },
    st(0.75),
  ], 1.3),
  /** Hand bell: a short overhand knock with the bell's lip. */
  bellBash: clip('bellBash', [
    { t: 0, handR: H([-0.2, 1.62, 0.0], [0, 0.5, -0.86], { elbow: [-0.9, 0.1, -0.2] }), chest: [-8, -12, 0], spine: [-2, -4, 0] },
    { t: 0.1, ease: 'in', handR: H([-0.12, 1.42, 0.42], [0, 0.7, 0.7]), chest: [4, -4, 0], footL: [0.13, 0.08, 0.26] },
    { t: 0.18, ease: 'out', handR: H([-0.08, 1.05, 0.55], [0, -0.3, 0.95]), chest: [18, 0, 0], spine: [8, 0, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.4, hold: true, handR: H([-0.09, 1.06, 0.52], [0, -0.25, 0.97]), chest: [16, 0, 0], hipsPos: [0, -0.09, 0.04] },
    st(0.7),
  ], 0.2),
  bellRaise: clip('bellRaise', [
    st(0),
    { t: 0.3, ease: 'out', handR: H([-0.2, 1.62, 0.0], [0, 0.5, -0.86], { elbow: [-0.9, 0.1, -0.2] }), chest: [-8, -12, 0], spine: [-2, -4, 0] },
    { t: 0.8, handR: H([-0.21, 1.64, -0.01], [0, 0.5, -0.86], { elbow: [-0.9, 0.1, -0.2] }), chest: [-9, -12, 0], spine: [-2, -4, 0] },
  ], 0.2),
  /** Censer: drawn back low, then an underhand arc trailing embers. */
  censerCharge: clip('censerCharge', [
    cen(0),
    { ...CEN_BACK, t: 0.35, ease: 'out' },
    { ...CEN_BACK, t: 1.0, hipsPos: [0, -0.12, -0.05] },
  ], 0.55),
  censerSwing: clip('censerSwing', [
    { ...CEN_BACK, t: 0 },
    { t: 0.1, ease: 'in', handR: H([-0.12, 1.02, 0.5], [0.1, -0.25, 0.96]), chest: [4, -4, 0], spine: [2, 0, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.34] },
    { t: 0.2, ease: 'out', handR: H([0.22, 1.55, 0.32], [0.45, 0.8, 0.4]), chest: [-4, 26, 0], spine: [-2, 10, 0], hips: [0, 6, 0], hipsPos: [0, -0.06, 0.06] },
    { t: 0.45, hold: true, handR: H([0.2, 1.5, 0.3], [0.4, 0.6, 0.7]), chest: [-2, 22, 0], spine: [-2, 8, 0] },
    cen(0.85),
  ], 0.55),
};

export const STAFF_OFF = OFF.staff;
