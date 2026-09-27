/**
 * Ser Corvane Aldmoor — Bell-Appointed Commander of Ashbridge. Rig height ×1.12, so positions are
 * authored for a 1.8 m reference and scaled by K.
 */
import { Clip } from '../Clip';
import type { HandKey, Key, V3 } from '../types';

const K = 1.12;
const v = (x: number, y: number, z: number): V3 => [x * K, y * K, z * K];
const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });

export const CMD_SWORD: HandKey = S(v(-0.27, 0.95, 0.24), [-0.1, 0.45, 0.89], { up: [0, -0.89, 0.45] });
/** Left hand joins the hilt for two-handed blows (placed just above the right hand along the grip). */
const twoHand = (p: V3, dir: V3): HandKey => {
  const l = Math.hypot(dir[0], dir[1], dir[2]);
  return { p: [p[0] + (dir[0] / l) * 0.12, p[1] + (dir[1] / l) * 0.12, p[2] + (dir[2] / l) * 0.12], dir, elbow: [0.8, -0.4, -0.4] };
};
const STAND: Key = { t: 0, handR: CMD_SWORD, handL: null, chest: [4, -8, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.06, 0], head: [0, 0, 0] };
const stand = (t: number): Key => ({ ...STAND, t, ease: 'inout' });

// Reusable arcs
const HIGH_R: HandKey = S(v(-0.42, 1.62, -0.1), [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] });
const MID: HandKey = S(v(-0.1, 1.25, 0.58), [0.35, 0.28, 0.9]);
const LOW_L: HandKey = S(v(0.32, 0.78, 0.42), [0.85, -0.45, 0.28]);
const HIGH_L: HandKey = S(v(0.36, 1.1, 0.1), [0.85, 0.3, -0.42], { elbow: [-0.2, -0.8, -0.4] });
const MID2: HandKey = S(v(0, 1.22, 0.64), [-0.2, 0.3, 0.93]);
const LOW_R: HandKey = S(v(-0.46, 1.25, 0.3), [-0.92, 0.3, 0.2]);

export const commanderClips = {
  /** Diagonal cut (0.55 s tell). */
  cmdSlash: new Clip('cmdSlash', [
    stand(0),
    { t: 0.48, ease: 'out', handR: HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0], head: [6, 16, 0], fk: { upperArmL: [-50, 0, 40], forearmL: [-40, 0, 0] } },
    { t: 0.58, ease: 'in', handR: MID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: v(0.14, 0.07, 0.34) },
    { t: 0.68, ease: 'out', handR: LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.95, handR: { ...LOW_L, up: [0.2, -0.6, -0.8] }, chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
    stand(1.3),
  ]),
  /** Two-cut chain in one breath. */
  cmdChain: new Clip('cmdChain', [
    stand(0),
    { t: 0.44, ease: 'out', handR: HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0] },
    { t: 0.54, ease: 'in', handR: MID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: v(0.14, 0.07, 0.32) },
    { t: 0.64, ease: 'out', handR: LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.86, ease: 'out', handR: HIGH_L, chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.97, ease: 'in', handR: MID2, chest: [4, 0, 0], spine: [2, 0, 0], footR: v(-0.14, 0.07, 0.3) },
    { t: 1.08, ease: 'out', handR: LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 1.4, handR: LOW_R, chest: [-2, -26, 0], spine: [0, -10, 0] },
    stand(1.8),
  ]),
  /** Lunging thrust (parryable), 0.7 s tell: blade drawn back level with the eyes. */
  cmdThrust: new Clip('cmdThrust', [
    stand(0),
    { t: 0.62, ease: 'out', handR: S(v(-0.34, 1.35, -0.32), [0, 0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: S(v(0.1, 1.3, 0.2), [0, 0.2, 1], { elbow: [0.8, -0.3, -0.3] }), chest: [0, -38, 0], spine: [0, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.16, -0.08], footR: v(-0.16, 0.07, -0.36) },
    { t: 0.74, ease: 'out', handR: S(v(-0.05, 1.3, 0.9), [0.02, -0.03, 1], { up: [0, 1, 0] }), handL: null, chest: [12, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.22, 0.14], footL: v(0.14, 0.07, 0.6), fk: { upperArmL: [30, 0, 30], forearmL: [-20, 0, 0] } },
    { t: 1.15, handR: S(v(-0.06, 1.28, 0.86), [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
    stand(1.6),
  ]),
  /** Shoulder charge (unparryable): drops the shoulder, sword trailing low (0.75 s tell). */
  cmdCharge: new Clip('cmdCharge', [
    stand(0),
    { t: 0.7, ease: 'out', handR: S(v(-0.4, 0.8, -0.3), [-0.3, -0.2, -0.93]), chest: [22, 40, 0], spine: [14, 16, 0], hips: [0, 14, 0], hipsPos: [0, -0.2, -0.05], head: [-18, -30, 0], fk: { upperArmL: [-20, 0, -30], forearmL: [-70, 0, 0] } },
    { t: 0.85, handR: S(v(-0.4, 0.82, -0.25), [-0.3, -0.2, -0.93]), chest: [26, 44, 0], spine: [16, 18, 0], hipsPos: [0, -0.24, 0.1] },
    { t: 1.05, handR: S(v(-0.4, 0.84, -0.2), [-0.3, -0.2, -0.93]), chest: [24, 40, 0], hipsPos: [0, -0.22, 0.1] },
    stand(1.6),
  ]),
  /** Toll slam: two-handed overhead into the ground, shockwave (unparryable), 1.0 s tell. */
  cmdToll: new Clip('cmdToll', [
    stand(0),
    { t: 0.9, ease: 'out', handR: S(v(-0.08, 2.0, -0.1), [0, 0.35, -0.94], { elbow: [-0.9, 0.2, -0.2] }), handL: twoHand(v(-0.08, 2.0, -0.1), [0, 0.35, -0.94]), chest: [-18, -4, 0], spine: [-10, -2, 0], head: [10, 0, 0], hipsPos: [0, 0.02, -0.06] },
    { t: 1.02, ease: 'in', handR: S(v(-0.06, 1.2, 0.7), [0, 0.2, 0.98]), handL: twoHand(v(-0.06, 1.2, 0.7), [0, 0.2, 0.98]), chest: [16, -2, 0], spine: [8, 0, 0], footL: v(0.14, 0.07, 0.42) },
    { t: 1.1, ease: 'out', handR: S(v(-0.04, 0.45, 0.85), [0, -0.7, 0.72]), handL: twoHand(v(-0.04, 0.45, 0.85), [0, -0.7, 0.72]), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.3, 0.12], head: [-20, 0, 0] },
    { t: 1.6, handR: S(v(-0.05, 0.46, 0.82), [0, -0.72, 0.7]), handL: twoHand(v(-0.05, 0.46, 0.82), [0, -0.72, 0.7]), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.28, 0.1] },
    { ...stand(2.0), handL: null },
  ]),
  cmdBackstep: new Clip('cmdBackstep', [
    stand(0),
    { t: 0.12, ease: 'out', hipsPos: [0, 0.04, -0.06], spine: [-10, 0, 0], footL: v(0.14, 0.25, -0.05), footR: v(-0.14, 0.2, -0.1) },
    { t: 0.36, hipsPos: [0, -0.14, 0], spine: [6, 0, 0], footL: v(0.14, 0.07, 0.05), footR: v(-0.14, 0.07, -0.25) },
    stand(0.6),
  ]),

  // ---------------------------------------------------------------- phase 2
  /** Phase transition: the anchor-bell rings; he raises the blade to it and sheds the cloak. */
  cmdTransition: new Clip('cmdTransition', [
    stand(0),
    { t: 0.6, ease: 'out', handR: S(v(-0.15, 1.9, 0.2), [0, 1, 0.1], { up: [0, 0, 1], elbow: [-0.8, -0.2, 0] }), chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-26, 0, 0], fk: { upperArmL: [-20, 0, 60], forearmL: [-30, 0, 0] } },
    { t: 1.8, handR: S(v(-0.15, 1.95, 0.2), [0, 1, 0.1], { up: [0, 0, 1], elbow: [-0.8, -0.2, 0] }), chest: [-20, 0, 0], spine: [-10, 0, 0], head: [-30, 0, 0] },
    { t: 2.3, ease: 'in', handR: S(v(-0.3, 0.7, 0.5), [-0.2, -0.4, 0.9]), chest: [20, -10, 0], spine: [10, 0, 0], hipsPos: [0, -0.2, 0.05], head: [0, 0, 0], fk: { upperArmL: [10, 0, 20], forearmL: [-20, 0, 0] } },
    stand(2.8),
  ]),
  /**
   * The Measure: two diagonal cuts, a thrust, then a rising overhead held a heartbeat too long,
   * with a long exposed recovery.
   */
  cmdMeasure: new Clip('cmdMeasure', [
    stand(0),
    { t: 0.36, ease: 'out', handR: HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0] },
    { t: 0.46, ease: 'in', handR: MID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: v(0.14, 0.07, 0.3) },
    { t: 0.56, ease: 'out', handR: LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.76, ease: 'out', handR: HIGH_L, chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.87, ease: 'in', handR: MID2, chest: [4, 0, 0], spine: [2, 0, 0], footR: v(-0.14, 0.07, 0.3) },
    { t: 0.97, ease: 'out', handR: LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 1.2, ease: 'out', handR: S(v(-0.34, 1.3, -0.3), [0, 0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -36, 0], spine: [0, -14, 0], hipsPos: [0, -0.14, -0.06] },
    { t: 1.32, ease: 'out', handR: S(v(-0.05, 1.28, 0.9), [0.02, -0.03, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.2, 0.12], footL: v(0.14, 0.07, 0.55) },
    // the rising overhead, held too long
    { t: 1.8, ease: 'out', handR: S(v(-0.1, 2.02, -0.05), [0.02, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), handL: twoHand(v(-0.1, 2.02, -0.05), [0.02, 0.4, -0.92]), chest: [-18, -6, 0], spine: [-10, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.02, 0] },
    { t: 2.42, handR: S(v(-0.1, 2.06, -0.08), [0.02, 0.36, -0.93], { elbow: [-0.9, 0.2, -0.2] }), handL: twoHand(v(-0.1, 2.06, -0.08), [0.02, 0.36, -0.93]), chest: [-20, -6, 0], spine: [-11, -2, 0], head: [10, 0, 0] },
    { t: 2.54, ease: 'in', handR: S(v(-0.06, 1.3, 0.7), [0, 0.3, 0.95]), handL: twoHand(v(-0.06, 1.3, 0.7), [0, 0.3, 0.95]), chest: [14, -2, 0], spine: [8, 0, 0], footL: v(0.14, 0.07, 0.45) },
    { t: 2.64, ease: 'out', handR: S(v(-0.04, 0.42, 0.85), [0, -0.72, 0.7]), handL: twoHand(v(-0.04, 0.42, 0.85), [0, -0.72, 0.7]), chest: [42, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.32, 0.12], head: [-22, 0, 0] },
    // exposed: blade buried, catching his breath
    { t: 3.6, handR: S(v(-0.05, 0.45, 0.82), [0, -0.74, 0.68]), handL: twoHand(v(-0.05, 0.45, 0.82), [0, -0.74, 0.68]), chest: [38, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.3, 0.1], head: [-6, 0, 0] },
    { ...stand(4.1), handL: null },
  ]),
  /** Bell-fire sweep: a low horizontal sweep that trails fire (0.8 s tell). */
  cmdFireSweep: new Clip('cmdFireSweep', [
    stand(0),
    { t: 0.72, ease: 'out', handR: S(v(-0.55, 0.9, -0.2), [-0.8, 0.1, -0.6], { elbow: [-0.9, -0.2, -0.1] }), chest: [10, -50, 0], spine: [6, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.2, -0.04], head: [0, 30, 0], fk: { upperArmL: [-40, 0, 50], forearmL: [-30, 0, 0] } },
    { t: 0.84, ease: 'in', handR: S(v(-0.15, 0.85, 0.7), [0.2, -0.05, 0.98]), chest: [14, -6, 0], spine: [8, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 0.98, ease: 'out', handR: S(v(0.55, 0.9, 0.2), [0.95, 0.05, -0.3]), chest: [12, 46, 0], spine: [6, 18, 0], hips: [0, 12, 0], hipsPos: [0, -0.22, 0.05] },
    { t: 1.3, handR: S(v(0.5, 0.92, 0.15), [0.9, 0.1, -0.4]), chest: [10, 40, 0], spine: [6, 16, 0] },
    stand(1.7),
  ]),
  /** Delayed overhead: raised quickly, held (1.4 s total tell), then brought down. One move, not a feint-cancel. */
  cmdDelayed: new Clip('cmdDelayed', [
    stand(0),
    { t: 0.5, ease: 'out', handR: S(v(-0.12, 1.95, 0.05), [0, 0.6, -0.8], { elbow: [-0.9, 0.2, -0.2] }), chest: [-14, -6, 0], spine: [-6, -2, 0], head: [6, 0, 0], fk: { upperArmL: [-60, 0, 50], forearmL: [-30, 0, 0] } },
    { t: 1.3, handR: S(v(-0.12, 2.0, 0.0), [0, 0.5, -0.86], { elbow: [-0.9, 0.2, -0.2] }), chest: [-16, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0] },
    { t: 1.42, ease: 'in', handR: S(v(-0.08, 1.4, 0.65), [0, 0.45, 0.89]), chest: [12, -4, 0], spine: [6, 0, 0], footL: v(0.14, 0.07, 0.4) },
    { t: 1.52, ease: 'out', handR: S(v(-0.05, 0.55, 0.72), [0, -0.62, 0.78]), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.25, 0.1], head: [-16, 0, 0] },
    { t: 1.95, handR: S(v(-0.06, 0.57, 0.7), [0, -0.6, 0.8]), chest: [32, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.23, 0.09] },
    stand(2.4),
  ]),
  /** Death: drops to his knees, blade planted, then slumps against it. */
  cmdDeath: new Clip('cmdDeath', [
    stand(0),
    { t: 0.6, ease: 'out', hipsPos: [0, -0.5, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [22, 0, 0], head: [24, 0, 0], footL: v(0.14, 0.07, 0.36), footR: v(-0.13, 0.12, -0.45), footPitchR: -60, handR: S(v(-0.15, 0.95, 0.55), [0, -0.98, 0.15], { up: [0, 0, 1] }), handL: twoHand(v(-0.15, 0.95, 0.55), [0, -0.98, 0.15]) },
    { t: 2.5, hipsPos: [0, -0.52, 0], chest: [34, 0, 0], head: [38, 0, 0] },
  ]),
};
