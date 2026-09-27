/**
 * One-handed blades: curved sword (sabre), dagger, estoc — and bare fists.
 * Gameplay windows live in src/combat/movesets.ts (keep the active keys in sync with `hits`).
 */
import { SABRE_REST, DAGGER_REST, ESTOC_REST } from '../stances';
import { clip, H, restOf, type K } from './common';

// ------------------------------------------------------------------ curved sword (fast, wide arcs)
const sabre = restOf({ handR: SABRE_REST, chest: [2, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const SAB_L1_END: K = { t: 0, handR: H([0.3, 1.1, 0.26], [0.85, -0.05, -0.5]), chest: [6, 26, 0], spine: [4, 10, 0], hips: [0, 6, 0], hipsPos: [0, -0.07, 0.03] };
const SAB_L2_END: K = { t: 0, handR: H([-0.44, 1.42, 0.18], [-0.82, 0.48, -0.3]), chest: [-4, -26, 0], spine: [0, -10, 0], hips: [0, -6, 0] };
const SAB_CHARGE: K = { t: 0, handR: H([-0.36, 0.95, -0.2], [-0.35, -0.25, -0.9], { up: [-0.2, 0.9, -0.2], elbow: [-0.8, -0.5, 0] }), chest: [4, -40, 0], spine: [2, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.12, -0.04], footR: [-0.16, 0.08, -0.25] };

// ------------------------------------------------------------------ dagger (short, 4-hit)
const dag = restOf({ handR: DAGGER_REST, chest: [3, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0] });
const DAG_CHARGE: K = { t: 0, handR: H([-0.3, 0.98, -0.14], [0, 0.1, 1], { up: [0, -1, 0.1], elbow: [-0.8, -0.3, -0.4] }), chest: [8, -30, 0], spine: [4, -10, 0], hips: [0, -8, 0], hipsPos: [0, -0.14, -0.05], footR: [-0.15, 0.08, -0.25] };

// ------------------------------------------------------------------ estoc (thrusts, long reach)
const est = restOf({ handR: ESTOC_REST, chest: [1, -10, 0], spine: [0, 0, 0], hips: [0, -4, 0], hipsPos: [0, -0.05, 0] });
const UP: [number, number, number] = [0, 1, 0];
const EST_CHARGE: K = { t: 0, handR: H([-0.34, 1.5, -0.22], [0.08, -0.12, 0.99], { up: UP, elbow: [-0.9, 0.2, -0.2] }), chest: [-4, -38, 0], spine: [-2, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.1, -0.06], footR: [-0.16, 0.08, -0.3] };

// ------------------------------------------------------------------ fists (IK fists: thumb = +Y, knuckles = edge)
const FIST_R = H([-0.2, 1.28, 0.24], [0.45, 0.8, -0.35], { up: [0, 0.35, 0.94], elbow: [-0.7, -0.6, -0.3] });
const FIST_L = H([0.18, 1.3, 0.3], [-0.45, 0.8, -0.35], { up: [0, 0.35, 0.94], elbow: [0.7, -0.6, -0.3] });
const fist = restOf({ handR: FIST_R, handL: FIST_L, chest: [4, -8, 0], spine: [2, -4, 0], hips: [0, -4, 0], hipsPos: [0, -0.07, 0], head: [2, 8, 0] });

export const bladeClips = {
  // ---------------------------------------------------------------- curved sword
  /** Light 1: flat horizontal cut, right → left. */
  sabreLight1: clip('sabreLight1', [
    sabre(0),
    { t: 0.15, ease: 'out', handR: H([-0.44, 1.28, 0.02], [-0.75, 0.25, -0.6], { elbow: [-0.8, -0.3, -0.3] }), chest: [-2, -32, 0], spine: [0, -12, 0], hips: [0, -8, 0] },
    { t: 0.22, ease: 'in', handR: H([-0.14, 1.22, 0.54], [0.15, 0.12, 0.98]), chest: [4, -4, 0], spine: [2, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.2] },
    { ...SAB_L1_END, t: 0.29, ease: 'out', handR: H([0.34, 1.12, 0.3], [0.88, 0.02, -0.45]), chest: [6, 30, 0] },
    { ...SAB_L1_END, t: 0.42, hold: true },
    sabre(0.64),
  ], 0.86),
  /** Light 2: rising backhand, left → right. */
  sabreLight2: clip('sabreLight2', [
    { ...SAB_L1_END, t: 0 },
    { t: 0.13, ease: 'out', handR: H([0.36, 1.0, 0.16], [0.8, -0.25, -0.55], { elbow: [-0.2, -0.8, -0.4] }), chest: [8, 30, 0], spine: [4, 12, 0], hips: [0, 8, 0] },
    { t: 0.2, ease: 'in', handR: H([-0.04, 1.2, 0.56], [-0.1, 0.3, 0.95]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.2] },
    { ...SAB_L2_END, t: 0.27, ease: 'out', handR: H([-0.46, 1.46, 0.2], [-0.85, 0.45, -0.25]), chest: [-4, -30, 0] },
    { ...SAB_L2_END, t: 0.4, hold: true },
    sabre(0.62),
  ], 0.86),
  /** Light 3: big descending diagonal with a stepping turn. */
  sabreLight3: clip('sabreLight3', [
    { ...SAB_L2_END, t: 0 },
    { t: 0.22, ease: 'out', handR: H([-0.36, 1.62, -0.08], [-0.3, 0.7, -0.65], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -36, 0], spine: [-2, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.04, -0.03] },
    { t: 0.3, ease: 'in', handR: H([-0.1, 1.35, 0.6], [0.3, 0.35, 0.9]), chest: [8, -4, 0], spine: [4, 0, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.38] },
    { t: 0.38, ease: 'out', handR: H([0.34, 0.82, 0.36], [0.85, -0.42, 0.3]), chest: [16, 32, 0], spine: [8, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.56, hold: true, handR: H([0.3, 0.84, 0.34], [0.8, -0.35, 0.45]), chest: [14, 28, 0], spine: [8, 12, 0], hipsPos: [0, -0.12, 0.07] },
    sabre(0.8),
  ], 0.86),
  /** Heavy charge: blade drawn low behind the right hip. */
  sabreHeavyCharge: clip('sabreHeavyCharge', [
    sabre(0),
    { ...SAB_CHARGE, t: 0.3, ease: 'out' },
    { ...SAB_CHARGE, t: 0.9, handR: H([-0.37, 0.93, -0.22], [-0.36, -0.28, -0.89], { up: [-0.2, 0.9, -0.25], elbow: [-0.8, -0.5, 0] }), hipsPos: [0, -0.14, -0.05] },
  ], 0.86),
  /** Heavy release: rising diagonal cut, low right → high left. */
  sabreHeavyRelease: clip('sabreHeavyRelease', [
    { ...SAB_CHARGE, t: 0 },
    { t: 0.1, ease: 'in', handR: H([-0.12, 1.1, 0.6], [0.05, 0.25, 0.97]), chest: [6, -4, 0], spine: [4, 0, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.42], footR: [-0.14, 0.08, -0.1] },
    { t: 0.2, ease: 'out', handR: H([0.32, 1.6, 0.22], [0.6, 0.75, -0.3]), chest: [-6, 30, 0], spine: [-4, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.06, 0.08] },
    { t: 0.45, hold: true, handR: H([0.3, 1.58, 0.2], [0.55, 0.78, -0.3]), chest: [-6, 26, 0], spine: [-4, 10, 0] },
    sabre(0.8),
  ], 0.86),

  // ---------------------------------------------------------------- dagger
  daggerLight1: clip('daggerLight1', [
    dag(0),
    { t: 0.1, ease: 'out', handR: H([-0.4, 1.25, 0.2], [-0.6, 0.2, 0.75], { elbow: [-0.8, -0.4, -0.3] }), chest: [0, -24, 0], spine: [0, -8, 0] },
    { t: 0.16, ease: 'in', handR: H([-0.08, 1.2, 0.58], [0.35, 0.1, 0.93]), chest: [4, 0, 0], spine: [2, 0, 0], footL: [0.13, 0.08, 0.2] },
    { t: 0.22, ease: 'out', handR: H([0.28, 1.18, 0.42], [0.9, 0, 0.4]), chest: [4, 22, 0], spine: [2, 8, 0] },
    { t: 0.32, hold: true, handR: H([0.26, 1.17, 0.4], [0.88, 0, 0.45]), chest: [4, 20, 0] },
    dag(0.48),
  ], 0.22),
  daggerLight2: clip('daggerLight2', [
    { t: 0, handR: H([0.26, 1.17, 0.4], [0.88, 0, 0.45], { up: [0.4, 0, -0.9] }), chest: [4, 20, 0] },
    { t: 0.08, ease: 'out', handR: H([0.28, 1.05, 0.35], [0.85, -0.3, 0.35], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 24, 0], spine: [2, 8, 0] },
    { t: 0.14, ease: 'in', handR: H([-0.05, 1.25, 0.6], [-0.2, 0.25, 0.95]), chest: [4, 0, 0], spine: [0, 0, 0], footR: [-0.13, 0.08, 0.18] },
    { t: 0.2, ease: 'out', handR: H([-0.42, 1.4, 0.3], [-0.85, 0.4, 0.3]), chest: [-2, -24, 0], spine: [0, -8, 0] },
    { t: 0.3, hold: true, handR: H([-0.4, 1.38, 0.28], [-0.82, 0.42, 0.35]), chest: [-2, -22, 0] },
    dag(0.46),
  ], 0.22),
  /** Light 3: straight stab. */
  daggerLight3: clip('daggerLight3', [
    { t: 0, handR: H([-0.4, 1.38, 0.28], [-0.82, 0.42, 0.35]), chest: [-2, -22, 0] },
    { t: 0.1, ease: 'out', handR: H([-0.3, 1.15, -0.05], [0, 0.05, 1], { up: [0, -1, 0.05], elbow: [-0.8, -0.3, -0.4] }), chest: [0, -24, 0], spine: [0, -8, 0], hipsPos: [0, -0.06, -0.03] },
    { t: 0.18, ease: 'out', handR: H([-0.06, 1.22, 0.68], [0.02, 0, 1], { up: [0, -1, 0] }), chest: [8, 6, 0], spine: [4, 2, 0], footL: [0.13, 0.08, 0.3], hipsPos: [0, -0.1, 0.06] },
    { t: 0.3, handR: H([-0.07, 1.2, 0.64], [0.02, 0, 1], { up: [0, -1, 0] }), chest: [8, 6, 0], hipsPos: [0, -0.1, 0.05] },
    dag(0.5),
  ], 0.22),
  /** Light 4: descending diagonal finisher with a long step. */
  daggerLight4: clip('daggerLight4', [
    { t: 0, handR: H([-0.07, 1.2, 0.64], [0.02, 0, 1], { up: [0, -1, 0] }), chest: [8, 6, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.14, ease: 'out', handR: H([-0.3, 1.6, 0.05], [-0.2, 0.8, -0.55], { elbow: [-0.9, 0.1, -0.2] }), chest: [-8, -22, 0], spine: [-2, -8, 0], hipsPos: [0, -0.02, 0] },
    { t: 0.22, ease: 'in', handR: H([-0.1, 1.3, 0.62], [0.2, 0.4, 0.9]), chest: [6, -4, 0], footL: [0.14, 0.08, 0.36] },
    { t: 0.28, ease: 'out', handR: H([0.2, 0.9, 0.52], [0.7, -0.5, 0.5]), chest: [18, 18, 0], spine: [8, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.42, hold: true, handR: H([0.19, 0.9, 0.5], [0.68, -0.45, 0.55]), chest: [16, 16, 0], hipsPos: [0, -0.12, 0.07] },
    dag(0.6),
  ], 0.22),
  daggerHeavyCharge: clip('daggerHeavyCharge', [
    dag(0),
    { ...DAG_CHARGE, t: 0.25, ease: 'out' },
    { ...DAG_CHARGE, t: 0.8, hipsPos: [0, -0.16, -0.06] },
  ], 0.22),
  /** Heavy release: lunging upward gut-stab. */
  daggerHeavyRelease: clip('daggerHeavyRelease', [
    { ...DAG_CHARGE, t: 0 },
    { t: 0.1, ease: 'out', handR: H([-0.05, 1.15, 0.74], [0.02, 0.15, 0.99], { up: [0, -1, 0.15] }), chest: [14, 4, 0], spine: [8, 2, 0], hips: [0, 2, 0], hipsPos: [0, -0.2, 0.12], footL: [0.14, 0.08, 0.5], footR: [-0.15, 0.08, -0.2] },
    { t: 0.36, handR: H([-0.06, 1.16, 0.7], [0.02, 0.15, 0.99], { up: [0, -1, 0.15] }), chest: [14, 4, 0], hipsPos: [0, -0.2, 0.1] },
    dag(0.7),
  ], 0.22),

  // ---------------------------------------------------------------- estoc
  estocLight1: clip('estocLight1', [
    est(0),
    { t: 0.16, ease: 'out', handR: H([-0.3, 1.2, -0.08], [0.04, 0.06, 1], { up: UP, elbow: [-0.8, -0.3, -0.4] }), chest: [0, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.08, -0.04] },
    { t: 0.25, ease: 'out', handR: H([-0.04, 1.3, 0.68], [0.03, 0.02, 1], { up: UP }), chest: [8, 6, 0], spine: [6, 2, 0], hips: [0, 2, 0], hipsPos: [0, -0.14, 0.1], footL: [0.14, 0.08, 0.4] },
    { t: 0.4, handR: H([-0.05, 1.28, 0.64], [0.03, 0.02, 1], { up: UP }), chest: [8, 6, 0], hipsPos: [0, -0.13, 0.08] },
    est(0.66),
  ], 1.1),
  estocLight2: clip('estocLight2', [
    { t: 0, handR: H([-0.05, 1.28, 0.64], [0.03, 0.02, 1], { up: UP }), chest: [8, 6, 0], hipsPos: [0, -0.13, 0.08] },
    { t: 0.14, ease: 'out', handR: H([-0.28, 0.95, 0.0], [0.05, 0.25, 0.97], { up: UP, elbow: [-0.8, -0.5, -0.3] }), chest: [4, -26, 0], spine: [2, -10, 0], hipsPos: [0, -0.12, -0.02] },
    { t: 0.23, ease: 'out', handR: H([-0.05, 1.38, 0.66], [0.02, 0.12, 0.99], { up: UP }), chest: [4, 4, 0], spine: [2, 2, 0], footL: [0.14, 0.08, 0.34], hipsPos: [0, -0.1, 0.08] },
    { t: 0.38, handR: H([-0.06, 1.36, 0.62], [0.02, 0.12, 0.99], { up: UP }), chest: [4, 4, 0], hipsPos: [0, -0.1, 0.07] },
    est(0.64),
  ], 1.1),
  /** Light 3: deep lunge. */
  estocLight3: clip('estocLight3', [
    { t: 0, handR: H([-0.06, 1.36, 0.62], [0.02, 0.12, 0.99], { up: UP }), chest: [4, 4, 0], hipsPos: [0, -0.1, 0.07] },
    { t: 0.26, ease: 'out', handR: H([-0.34, 1.25, -0.2], [0.05, 0, 1], { up: UP, elbow: [-0.8, -0.3, -0.4] }), chest: [-2, -40, 0], spine: [0, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.1, -0.06], footR: [-0.16, 0.08, -0.3] },
    { t: 0.36, ease: 'out', handR: H([-0.02, 1.2, 0.82], [0.02, -0.04, 1], { up: UP }), chest: [14, 8, 0], spine: [10, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.24, 0.14], footL: [0.14, 0.08, 0.62], footR: [-0.14, 0.08, -0.2] },
    { t: 0.56, handR: H([-0.03, 1.19, 0.78], [0.02, -0.04, 1], { up: UP }), chest: [14, 8, 0], spine: [10, 4, 0], hipsPos: [0, -0.23, 0.12] },
    est(0.85),
  ], 1.1),
  estocHeavyCharge: clip('estocHeavyCharge', [
    est(0),
    { ...EST_CHARGE, t: 0.3, ease: 'out' },
    { ...EST_CHARGE, t: 0.9, hipsPos: [0, -0.12, -0.07] },
  ], 1.1),
  estocHeavyRelease: clip('estocHeavyRelease', [
    { ...EST_CHARGE, t: 0 },
    { t: 0.1, ease: 'out', handR: H([-0.02, 1.28, 0.86], [0.02, -0.06, 1], { up: UP }), chest: [14, 10, 0], spine: [10, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.26, 0.16], footL: [0.14, 0.08, 0.66], footR: [-0.15, 0.08, -0.22] },
    { t: 0.5, handR: H([-0.03, 1.26, 0.82], [0.02, -0.06, 1], { up: UP }), chest: [14, 10, 0], hipsPos: [0, -0.25, 0.14] },
    est(0.85),
  ], 1.1),

  // ---------------------------------------------------------------- fists
  /** Light 1: right jab. */
  fistLight1: clip('fistLight1', [
    fist(0),
    { t: 0.07, ease: 'out', handR: H([-0.22, 1.3, 0.18], [0.5, 0.75, -0.4], { up: [0, 0.4, 0.92], elbow: [-0.7, -0.6, -0.3] }), chest: [2, -16, 0] },
    { t: 0.14, ease: 'out', handR: H([-0.08, 1.36, 0.62], [0.95, 0.1, -0.1], { up: [0, 0, 1], elbow: [-0.6, -0.7, -0.3] }), chest: [4, 16, 0], spine: [2, 6, 0], footL: [0.13, 0.08, 0.2] },
    { t: 0.26, handR: H([-0.1, 1.34, 0.58], [0.95, 0.1, -0.1], { up: [0, 0, 1] }), chest: [4, 14, 0] },
    fist(0.45),
  ], 0.1),
  /** Light 2: left straight. */
  fistLight2: clip('fistLight2', [
    fist(0),
    { t: 0.08, ease: 'out', handL: H([0.2, 1.28, 0.16], [-0.5, 0.75, -0.4], { up: [0, 0.4, 0.92], elbow: [0.7, -0.6, -0.3] }), chest: [2, 14, 0] },
    { t: 0.15, ease: 'out', handL: H([0.06, 1.36, 0.64], [-0.95, 0.1, -0.1], { up: [0, 0, 1], elbow: [0.6, -0.7, -0.3] }), chest: [4, -18, 0], spine: [2, -6, 0], footL: [0.13, 0.08, 0.24] },
    { t: 0.27, handL: H([0.08, 1.34, 0.6], [-0.95, 0.1, -0.1], { up: [0, 0, 1] }), chest: [4, -16, 0] },
    fist(0.48),
  ], 0.1),
  /** Light 3: right hook. */
  fistLight3: clip('fistLight3', [
    fist(0),
    { t: 0.12, ease: 'out', handR: H([-0.4, 1.3, 0.12], [0.2, 0.3, -0.93], { up: [-0.3, 0.9, 0.3], elbow: [-0.2, -0.4, -0.9] }), chest: [0, -30, 0], spine: [0, -10, 0], hips: [0, -8, 0] },
    { t: 0.2, ease: 'in', handR: H([-0.12, 1.34, 0.5], [0.2, 0.95, 0.2], { up: [-0.9, 0.1, 0.3], elbow: [-0.2, -0.3, -0.9] }), chest: [4, 8, 0], spine: [2, 4, 0], hips: [0, 2, 0] },
    { t: 0.27, ease: 'out', handR: H([0.16, 1.32, 0.42], [0.3, 0.9, -0.3], { up: [-0.8, 0.1, -0.6], elbow: [-0.2, -0.3, -0.9] }), chest: [6, 30, 0], spine: [4, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.1, 0.04] },
    { t: 0.4, handR: H([0.14, 1.3, 0.4], [0.3, 0.9, -0.3], { up: [-0.8, 0.1, -0.6] }), chest: [6, 26, 0] },
    fist(0.62),
  ], 0.1),
  fistHeavyCharge: clip('fistHeavyCharge', [
    fist(0),
    { t: 0.3, ease: 'out', handR: H([-0.34, 1.5, -0.18], [0.3, 0.7, -0.65], { up: [0, 0.65, 0.76], elbow: [-0.8, 0.1, -0.5] }), chest: [-6, -34, 0], spine: [-2, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, -0.05], footR: [-0.15, 0.08, -0.24] },
    { t: 0.8, handR: H([-0.36, 1.52, -0.2], [0.3, 0.7, -0.65], { up: [0, 0.65, 0.76], elbow: [-0.8, 0.1, -0.5] }), chest: [-8, -36, 0], hipsPos: [0, -0.11, -0.06] },
  ], 0.1),
  /** Heavy release: overhand haymaker. */
  fistHeavyRelease: clip('fistHeavyRelease', [
    { t: 0, handR: H([-0.36, 1.52, -0.2], [0.3, 0.7, -0.65], { up: [0, 0.65, 0.76], elbow: [-0.8, 0.1, -0.5] }), chest: [-8, -36, 0], spine: [-2, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.11, -0.06] },
    { t: 0.12, ease: 'out', handR: H([-0.02, 1.34, 0.62], [0.9, -0.2, -0.3], { up: [0, -0.4, 0.92], elbow: [-0.6, -0.4, -0.6] }), chest: [16, 20, 0], spine: [8, 8, 0], hips: [0, 6, 0], hipsPos: [0, -0.16, 0.1], footL: [0.14, 0.08, 0.4] },
    { t: 0.4, handR: H([-0.03, 1.3, 0.58], [0.9, -0.2, -0.3], { up: [0, -0.4, 0.92] }), chest: [14, 18, 0], hipsPos: [0, -0.15, 0.08] },
    fist(0.8),
  ], 0.1),
  /** Guard overlay: fists raised. */
  guardFist: clip('guardFist', [
    { t: 0, handR: H([-0.14, 1.42, 0.3], [0.5, 0.8, -0.3], { up: [0, 0.3, 0.95], elbow: [-0.6, -0.7, -0.2] }), handL: H([0.12, 1.44, 0.34], [-0.5, 0.8, -0.3], { up: [0, 0.3, 0.95], elbow: [0.6, -0.7, -0.2] }), chest: [6, -6, 0], spine: [4, -2, 0], head: [6, 6, 0] },
  ], 0.1, { loop: true, duration: 1 }),
};
