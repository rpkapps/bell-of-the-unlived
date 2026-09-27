/**
 * Heavy weapons: axe & mace (one-handed haft), greatsword and hammer (two-handed; `_1h` variants
 * are used when the off-hand holds a shield), flail. Gameplay windows: src/combat/movesets.ts.
 */
import { HAFT_REST, GREAT_REST, HAMMER_REST, FLAIL_REST } from '../stances';
import { clip, clip2, H, pair, restOf, type K } from './common';

/** Offhand grips (metres along +Y from the main grip) — mirror WeaponModelExt.offhandGrip. */
export const OFF = { greatsword: -0.2, hammer: -0.16, spear: 0.55, halberd: 0.55, crossbow: 0.25, staff: -0.36 } as const;

// ------------------------------------------------------------------ axe / mace
const haft = restOf({ handR: HAFT_REST, chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const HAFT_CHARGE: K = { t: 0, handR: H([-0.2, 1.78, -0.25], [-0.05, 0.1, -0.99], { up: [0, 0.99, 0.1], elbow: [-0.9, 0.3, 0] }), chest: [-16, -20, 0], spine: [-6, -8, 0], hips: [0, -6, 0], hipsPos: [0, 0, -0.06], footR: [-0.15, 0.08, -0.25] };

// ------------------------------------------------------------------ greatsword (2h)
const gs = restOf({ handR: GREAT_REST, chest: [3, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0] });
const GS_L1_END: K = { t: 0, handR: H([0.24, 0.86, 0.4], [0.8, -0.28, 0.52]), chest: [18, 26, 0], spine: [10, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.16, 0.08] };
const GS_L2_END: K = { t: 0, handR: H([-0.36, 1.16, 0.24], [-0.88, 0.15, -0.44]), chest: [2, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.1, 0.04] };
const GS_CHARGE: K = { t: 0, handR: H([-0.3, 1.5, -0.1], [-0.25, 0.4, -0.88], { up: [-0.3, 0.85, 0.4], elbow: [-0.9, 0, 0] }), chest: [-10, -40, 0], spine: [-4, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.1, -0.06], footR: [-0.16, 0.08, -0.3] };

// ------------------------------------------------------------------ hammer (2h)
const ham = restOf({ handR: HAMMER_REST, chest: [4, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0] });
const HAM_CHARGE: K = { t: 0, handR: H([-0.12, 1.78, -0.06], [0, 0.08, -1], { up: [0, 1, 0.08], elbow: [-0.9, 0.3, -0.1] }), chest: [-18, -8, 0], spine: [-8, -4, 0], hipsPos: [0, 0.01, -0.06], footR: [-0.15, 0.08, -0.28] };

// ------------------------------------------------------------------ flail
const fl = restOf({ handR: FLAIL_REST, chest: [2, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] });

/** Charge whirl: the ball circles over the head (two turns), ending cocked to the right. */
function whirl(t0: number, turns: number, dur: number): K[] {
  const out: K[] = [];
  const n = Math.round(turns * 8);
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI * 0.5 + (i / n) * turns * Math.PI * 2;
    const dx = Math.sin(a), dz = Math.cos(a); // start pointing right (−X), turn toward +X
    out.push({ t: t0 + (i / n) * dur, ease: 'linear', handR: H([-0.12 + dx * 0.06, 1.72, 0.08 + dz * 0.06], [dx * 0.92, 0.3, dz * 0.92], { up: [dz, 0, -dx], elbow: [-0.9, 0.2, -0.2] }), chest: [-6, -10 + 8 * Math.sin(a), 0], head: [-6, 0, 0] });
  }
  return out;
}

export const heavyClips = {
  // ---------------------------------------------------------------- axe / mace
  /** Light 1: diagonal chop, high right → low left. */
  haftLight1: clip('haftLight1', [
    haft(0),
    { t: 0.22, ease: 'out', handR: H([-0.36, 1.62, -0.05], [-0.2, 0.6, -0.78], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -30, 0], spine: [-2, -12, 0], hips: [0, -8, 0] },
    { t: 0.3, ease: 'in', handR: H([-0.12, 1.4, 0.5], [0.25, 0.55, 0.8]), chest: [6, -6, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.3] },
    { t: 0.38, ease: 'out', handR: H([0.18, 0.86, 0.46], [0.6, -0.55, 0.58]), chest: [20, 20, 0], spine: [10, 10, 0], hips: [0, 6, 0], hipsPos: [0, -0.14, 0.06] },
    { t: 0.56, hold: true, handR: H([0.17, 0.86, 0.44], [0.58, -0.5, 0.64]), chest: [18, 18, 0], spine: [9, 9, 0], hipsPos: [0, -0.13, 0.05] },
    haft(0.8),
  ], 0.58),
  /** Light 2: flat backhand, left → right. */
  haftLight2: clip('haftLight2', [
    { t: 0, handR: H([0.17, 0.86, 0.44], [0.58, -0.5, 0.64]), chest: [18, 18, 0], spine: [9, 9, 0], hipsPos: [0, -0.13, 0.05] },
    { t: 0.2, ease: 'out', handR: H([0.3, 1.2, 0.1], [0.75, 0.35, -0.55], { elbow: [-0.2, -0.8, -0.4] }), chest: [4, 32, 0], spine: [2, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.06, 0] },
    { t: 0.29, ease: 'in', handR: H([-0.05, 1.22, 0.56], [-0.1, 0.3, 0.95]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.22] },
    { t: 0.36, ease: 'out', handR: H([-0.45, 1.2, 0.22], [-0.88, 0.25, -0.35]), chest: [0, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.08, 0.03] },
    { t: 0.54, hold: true, handR: H([-0.43, 1.2, 0.2], [-0.86, 0.3, -0.4]), chest: [0, -28, 0], spine: [0, -11, 0] },
    haft(0.78),
  ], 0.58),
  /** Light 3: overhead vertical smash. */
  haftLight3: clip('haftLight3', [
    { t: 0, handR: H([-0.43, 1.2, 0.2], [-0.86, 0.3, -0.4]), chest: [0, -28, 0], spine: [0, -11, 0] },
    { t: 0.3, ease: 'out', handR: H([-0.14, 1.8, -0.05], [0, 0.4, -0.92], { elbow: [-0.9, 0.1, -0.2] }), chest: [-14, -8, 0], spine: [-6, -4, 0], hips: [0, 0, 0], hipsPos: [0, 0.01, -0.03] },
    { t: 0.38, ease: 'in', handR: H([-0.1, 1.5, 0.5], [0, 0.7, 0.7]), chest: [6, -4, 0], spine: [4, 0, 0], footL: [0.13, 0.08, 0.36] },
    { t: 0.46, ease: 'out', handR: H([-0.06, 0.8, 0.6], [0, -0.45, 0.9]), chest: [28, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.18, 0.08], head: [-12, 0, 0] },
    { t: 0.68, hold: true, handR: H([-0.07, 0.82, 0.57], [0, -0.4, 0.92]), chest: [24, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.16, 0.07], head: [-10, 0, 0] },
    haft(0.95),
  ], 0.58),
  haftHeavyCharge: clip('haftHeavyCharge', [
    haft(0),
    { ...HAFT_CHARGE, t: 0.35, ease: 'out' },
    { ...HAFT_CHARGE, t: 0.9, chest: [-18, -22, 0], hipsPos: [0, -0.01, -0.07] },
  ], 0.58),
  haftHeavyRelease: clip('haftHeavyRelease', [
    { ...HAFT_CHARGE, t: 0 },
    { t: 0.1, ease: 'in', handR: H([-0.1, 1.55, 0.45], [0, 0.75, 0.65]), chest: [4, -6, 0], spine: [2, -2, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.42], footR: [-0.14, 0.08, -0.12] },
    { t: 0.2, ease: 'out', handR: H([-0.05, 0.72, 0.62], [0.05, -0.55, 0.84]), chest: [30, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.22, 0.1], head: [-12, 0, 0] },
    { t: 0.5, hold: true, handR: H([-0.06, 0.74, 0.6], [0.05, -0.5, 0.86]), chest: [28, 0, 0], spine: [15, 0, 0], hipsPos: [0, -0.21, 0.09] },
    haft(0.9),
  ], 0.58),

  // ---------------------------------------------------------------- greatsword
  ...pair('greatLight1', [
    gs(0),
    { t: 0.38, ease: 'out', handR: H([-0.3, 1.5, 0.0], [-0.3, 0.62, -0.72], { elbow: [-0.9, -0.1, -0.2] }), chest: [-8, -34, 0], spine: [-2, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.04, -0.04], footR: [-0.15, 0.08, -0.2] },
    { t: 0.47, ease: 'in', handR: H([-0.06, 1.22, 0.5], [0.15, 0.12, 0.98]), chest: [8, -4, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.38] },
    { ...GS_L1_END, t: 0.58, ease: 'out' },
    { ...GS_L1_END, t: 0.8, hold: true },
    gs(1.1),
  ], OFF.greatsword, 1.4),
  ...pair('greatLight2', [
    { ...GS_L1_END, t: 0 },
    { t: 0.32, ease: 'out', handR: H([0.22, 1.1, 0.24], [0.85, 0.2, -0.48], { elbow: [-0.3, -0.8, -0.4] }), chest: [6, 34, 0], spine: [4, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.08, 0] },
    { t: 0.44, ease: 'in', handR: H([0.0, 1.12, 0.54], [-0.05, 0.12, 0.99]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.25] },
    { ...GS_L2_END, t: 0.52, ease: 'out' },
    { ...GS_L2_END, t: 0.74, hold: true },
    gs(1.05),
  ], OFF.greatsword, 1.4),
  ...pair('greatLight3', [
    { ...GS_L2_END, t: 0 },
    { t: 0.42, ease: 'out', handR: H([-0.1, 1.66, 0.0], [0, 0.32, -0.95], { elbow: [-0.9, 0.2, -0.2] }), chest: [-14, -10, 0], spine: [-6, -4, 0], hips: [0, 0, 0], hipsPos: [0, 0.01, -0.04], footR: [-0.14, 0.08, -0.2] },
    { t: 0.52, ease: 'in', handR: H([-0.06, 1.45, 0.5], [0, 0.7, 0.72]), chest: [8, -4, 0], spine: [4, 0, 0], footL: [0.14, 0.08, 0.4] },
    { t: 0.6, ease: 'out', handR: H([-0.04, 0.9, 0.58], [0, -0.28, 0.96]), chest: [30, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.22, 0.12], head: [-14, 0, 0] },
    { t: 0.88, hold: true, handR: H([-0.05, 0.9, 0.56], [0, -0.25, 0.97]), chest: [28, -2, 0], spine: [15, 0, 0], hipsPos: [0, -0.2, 0.1], head: [-12, 0, 0] },
    gs(1.2),
  ], OFF.greatsword, 1.4),
  ...pair('greatHeavyCharge', [
    gs(0),
    { ...GS_CHARGE, t: 0.45, ease: 'out' },
    { ...GS_CHARGE, t: 1.2, chest: [-12, -42, 0], hipsPos: [0, -0.12, -0.07] },
  ], OFF.greatsword, 1.4),
  ...pair('greatHeavyRelease', [
    { ...GS_CHARGE, t: 0 },
    { t: 0.14, ease: 'in', handR: H([-0.08, 1.45, 0.55], [0.2, 0.55, 0.8]), chest: [8, -6, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.15, 0.08, 0.48], footR: [-0.15, 0.08, -0.15] },
    { t: 0.26, ease: 'out', handR: H([0.1, 0.82, 0.56], [0.35, -0.32, 0.88]), chest: [32, 18, 0], spine: [16, 8, 0], hips: [0, 8, 0], hipsPos: [0, -0.24, 0.14] },
    { t: 0.65, hold: true, handR: H([0.09, 0.84, 0.54], [0.33, -0.3, 0.9]), chest: [30, 16, 0], spine: [15, 7, 0], hipsPos: [0, -0.22, 0.12] },
    gs(1.1),
  ], OFF.greatsword, 1.4),

  // ---------------------------------------------------------------- hammer
  ...pair('hammerLight1', [
    ham(0),
    { t: 0.42, ease: 'out', handR: H([-0.28, 1.55, -0.05], [-0.2, 0.5, -0.84], { elbow: [-0.9, 0, -0.2] }), chest: [-10, -32, 0], spine: [-4, -12, 0], hips: [0, -10, 0], footR: [-0.15, 0.08, -0.2] },
    { t: 0.52, ease: 'in', handR: H([-0.08, 1.42, 0.45], [0.1, 0.7, 0.7]), chest: [6, -6, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.4] },
    { t: 0.6, ease: 'out', handR: H([0.02, 0.74, 0.6], [0.1, -0.6, 0.8]), chest: [30, 8, 0], spine: [16, 4, 0], hipsPos: [0, -0.24, 0.12], head: [-12, 0, 0] },
    { t: 0.9, hold: true, handR: H([0.01, 0.76, 0.58], [0.1, -0.58, 0.8]), chest: [28, 8, 0], spine: [15, 4, 0], hipsPos: [0, -0.22, 0.11], head: [-10, 0, 0] },
    ham(1.2),
  ], OFF.hammer, 0.72),
  ...pair('hammerLight2', [
    { t: 0, handR: H([0.01, 0.76, 0.58], [0.1, -0.58, 0.8]), chest: [28, 8, 0], spine: [15, 4, 0], hipsPos: [0, -0.22, 0.11] },
    { t: 0.36, ease: 'out', handR: H([0.25, 1.05, 0.22], [0.85, 0.15, -0.5], { elbow: [-0.3, -0.8, -0.4] }), chest: [6, 32, 0], spine: [4, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.08, 0] },
    { t: 0.46, ease: 'in', handR: H([0.02, 1.1, 0.52], [-0.05, 0.1, 0.99]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.25] },
    { t: 0.56, ease: 'out', handR: H([-0.38, 1.1, 0.2], [-0.9, 0.1, -0.4]), chest: [2, -34, 0], spine: [0, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.12, 0.04] },
    { t: 0.85, hold: true, handR: H([-0.36, 1.12, 0.18], [-0.88, 0.15, -0.44]), chest: [2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.03] },
    ham(1.15),
  ], OFF.hammer, 0.72),
  ...pair('hammerHeavyCharge', [
    ham(0),
    { ...HAM_CHARGE, t: 0.5, ease: 'out' },
    { ...HAM_CHARGE, t: 1.3, chest: [-20, -8, 0], hipsPos: [0, 0, -0.07] },
  ], OFF.hammer, 0.72),
  ...pair('hammerHeavyRelease', [
    { ...HAM_CHARGE, t: 0 },
    { t: 0.14, ease: 'in', handR: H([-0.08, 1.55, 0.45], [0, 0.8, 0.6]), chest: [4, -4, 0], spine: [2, 0, 0], footL: [0.15, 0.08, 0.45], footR: [-0.15, 0.08, -0.15] },
    { t: 0.24, ease: 'out', handR: H([-0.04, 0.7, 0.62], [0, -0.62, 0.78]), chest: [34, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.28, 0.12], head: [-14, 0, 0] },
    { t: 0.8, hold: true, handR: H([-0.05, 0.72, 0.6], [0, -0.6, 0.8]), chest: [32, 0, 0], spine: [17, 0, 0], hipsPos: [0, -0.27, 0.11], head: [-12, 0, 0] },
    ham(1.2),
  ], OFF.hammer, 0.72),

  // ---------------------------------------------------------------- flail
  /** Light 1: overhead diagonal loop. */
  flailLight1: clip('flailLight1', [
    fl(0),
    { t: 0.26, ease: 'out', handR: H([-0.34, 1.5, -0.1], [-0.3, 0.4, -0.87], { elbow: [-0.9, 0, -0.2] }), chest: [-6, -32, 0], spine: [-2, -12, 0], hips: [0, -8, 0] },
    { t: 0.35, ease: 'in', handR: H([-0.12, 1.36, 0.46], [0.12, 0.42, 0.9]), chest: [4, -6, 0], spine: [2, -2, 0], hips: [0, 0, 0] },
    { t: 0.44, ease: 'out', handR: H([0.18, 0.95, 0.5], [0.5, -0.45, 0.74]), chest: [18, 20, 0], spine: [8, 8, 0], hips: [0, 6, 0], hipsPos: [0, -0.14, 0.06], footL: [0.13, 0.08, 0.3] },
    { t: 0.64, handR: H([0.18, 0.95, 0.4], [0.3, -0.9, 0.3], { up: [0.5, 0.35, -0.8] }), chest: [14, 18, 0], spine: [7, 7, 0], hipsPos: [0, -0.12, 0.05] },
    fl(0.9),
  ], 0.72),
  /** Light 2: flat backhand swing. */
  flailLight2: clip('flailLight2', [
    { t: 0, handR: H([0.18, 0.95, 0.4], [0.3, -0.9, 0.3], { up: [0.5, 0.35, -0.8] }), chest: [14, 18, 0], hipsPos: [0, -0.12, 0.05] },
    { t: 0.26, ease: 'out', handR: H([0.32, 1.15, 0.1], [0.8, 0.2, -0.55], { elbow: [-0.2, -0.8, -0.4] }), chest: [4, 32, 0], spine: [2, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.06, 0] },
    { t: 0.36, ease: 'in', handR: H([-0.02, 1.2, 0.5], [-0.1, 0.15, 0.98]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.22] },
    { t: 0.42, ease: 'out', handR: H([-0.44, 1.25, 0.2], [-0.9, 0.2, -0.35]), chest: [0, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0] },
    { t: 0.6, hold: true, handR: H([-0.42, 1.2, 0.16], [-0.8, -0.3, -0.5]), chest: [0, -28, 0], spine: [0, -11, 0] },
    fl(0.88),
  ], 0.72),
  /** Light 3: overhead crash. */
  flailLight3: clip('flailLight3', [
    { t: 0, handR: H([-0.42, 1.2, 0.16], [-0.8, -0.3, -0.5]), chest: [0, -28, 0], spine: [0, -11, 0] },
    { t: 0.32, ease: 'out', handR: H([-0.14, 1.75, -0.1], [0, 0.2, -0.98], { elbow: [-0.9, 0.1, -0.2] }), chest: [-14, -8, 0], spine: [-6, -4, 0], hips: [0, 0, 0] },
    { t: 0.42, ease: 'in', handR: H([-0.1, 1.55, 0.4], [0, 0.9, 0.4]), chest: [6, -4, 0], spine: [4, 0, 0], footL: [0.13, 0.08, 0.36] },
    { t: 0.5, ease: 'out', handR: H([-0.06, 0.9, 0.6], [0, -0.7, 0.7]), chest: [26, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.18, 0.08], head: [-10, 0, 0] },
    { t: 0.72, hold: true, handR: H([-0.07, 0.92, 0.56], [0, -0.85, 0.5]), chest: [22, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.16, 0.07] },
    fl(1.0),
  ], 0.72),
  /** Heavy charge: whirl overhead (two turns), cocked to the right at full charge. */
  flailHeavyCharge: clip('flailHeavyCharge', [
    fl(0),
    ...whirl(0.2, 2, 1.0),
  ], 0.72),
  /** Heavy release: the whirl becomes a crashing overhead slam. */
  flailHeavyRelease: clip('flailHeavyRelease', [
    { t: 0, handR: H([-0.18, 1.72, 0.08], [-0.92, 0.3, 0], { up: [0, 0, 1], elbow: [-0.9, 0.2, -0.2] }), chest: [-6, -18, 0], head: [-6, 0, 0] },
    { t: 0.08, ease: 'in', handR: H([-0.1, 1.7, 0.3], [0, 0.95, 0.3]), chest: [0, -6, 0], head: [0, 0, 0] },
    { t: 0.18, ease: 'out', handR: H([-0.05, 0.9, 0.62], [0, -0.7, 0.7]), chest: [28, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.2, 0.1], footL: [0.14, 0.08, 0.42] },
    { t: 0.5, hold: true, handR: H([-0.06, 0.92, 0.58], [0, -0.85, 0.5]), chest: [24, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.18, 0.08] },
    fl(0.95),
  ], 0.72),

  /** Guard overlay, greatsword / hammer without a shield: weapon raised before the body, both hands. */
  guardGreat: clip2('guardGreat', [
    { t: 0, handR: H([-0.12, 1.12, 0.34], [0.3, 0.9, 0.3], { up: [0.9, -0.3, -0.3], elbow: [-0.8, -0.5, -0.2] }), chest: [4, 10, 0], spine: [4, 4, 0], head: [-4, -6, 0] },
  ], -0.18, 1.3, [0.7, -0.6, -0.2], { loop: true, duration: 1 }),
};
