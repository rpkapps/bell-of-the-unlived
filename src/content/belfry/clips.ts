/**
 * Belfry animation clips (IK keyframes, root space: +Z forward, −X is the character's right).
 * Every attack has a readable windup; follow-ups start from the pose the first hit ends in.
 *
 *  Aldren (rig ×1.08; the Ancient King is additionally scaled by the boss controller):
 *   phase 1 lance-sword: aldCut → aldCut2, aldLunge, aldTwin, aldRising, aldCharge, aldBackstep
 *   phase 2 bell sorcery: aldPlant (ring tolls), aldWave, aldKnell, aldSpin
 *   phase 3 bell maul:    aldCrush, aldSweep, aldStomp, aldDrain
 *   transitions / death:  aldTrans2, aldTrans3, aldDeath
 *  Bellkeeper (chain flail + brand): bkSwing, bkSlam, bkBrand, bkToll, bkTrans
 *  Bell-Warden (bell hammer, two hands): bwSlam, bwSweep, bwShove
 *  Keeper's echo (sword): ecFlurry, ecBlink, ecLunge
 *  Bell-ringer (hand bell): brCast, brBash
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';

const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
/** Off hand on a two-handed grip `off` metres along −dir from the main hand (mauls, lances). */
const twoHand = (p: V3, dir: V3, off: number): HandKey => {
  const l = Math.hypot(dir[0], dir[1], dir[2]);
  return { p: [p[0] - (dir[0] / l) * off, p[1] - (dir[1] / l) * off, p[2] - (dir[2] / l) * off], dir, elbow: [0.8, -0.4, -0.4] };
};

// ================================================================== Aldren

const K = 1.08;
const v = (x: number, y: number, z: number): V3 => [x * K, y * K, z * K];

/** Lance-sword at rest: blade forward and a little up, point toward the opponent. */
export const ALD_LANCE: HandKey = S(v(-0.26, 1.0, 0.26), [-0.05, 0.3, 0.95], { up: [0, -0.95, 0.3] });
const ALD: Key = { t: 0, handR: ALD_LANCE, handL: null, chest: [4, -10, 0], spine: [2, -2, 0], hips: [0, 0, 0], hipsPos: [0, -0.07, 0], head: [0, 4, 0] };
const ald = (t: number): Key => ({ ...ALD, t, ease: 'inout' });

/** The Ancient King holds the bell maul two-handed, head resting forward and low. */
export const ALD_MAUL: HandKey = S(v(-0.18, 1.02, 0.3), [0.25, 0.55, 0.8], { up: [0, -0.8, 0.55] });
const MAUL_L = (p: V3, dir: V3) => twoHand(p, dir, 0.4);
const ANC: Key = { t: 0, handR: ALD_MAUL, handL: MAUL_L(ALD_MAUL.p, ALD_MAUL.dir), chest: [12, -6, 0], spine: [8, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.1, 0], head: [-6, 0, 0], neck: [6, 0, 0] };
const anc = (t: number): Key => ({ ...ANC, t, ease: 'inout' });

export const aldrenClips = {
  // ---------------------------------------------------------------- phase 1: the Young Conqueror
  /** Diagonal cut from high right (0.5 s tell). */
  aldCut: new Clip('aldCut', [
    ald(0),
    { t: 0.46, ease: 'out', handR: S(v(-0.44, 1.64, -0.14), [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] }), chest: [-10, -36, 0], spine: [-4, -14, 0], hips: [0, -10, 0], head: [6, 18, 0], fk: { upperArmL: [-40, 0, 40], forearmL: [-40, 0, 0] } },
    { t: 0.55, ease: 'in', handR: S(v(-0.1, 1.28, 0.62), [0.35, 0.28, 0.9]), chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: v(0.14, 0.07, 0.36) },
    { t: 0.65, ease: 'out', handR: S(v(0.34, 0.8, 0.46), [0.85, -0.45, 0.28]), chest: [16, 32, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.15, 0.08] },
    { t: 0.9, handR: S(v(0.3, 0.82, 0.44), [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.14, 0.07] },
    ald(1.25),
  ]),
  /** Backhand follow-up (the first cut is its tell). */
  aldCut2: new Clip('aldCut2', [
    { t: 0, handR: S(v(0.3, 0.82, 0.44), [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), handL: null, chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.14, 0.07] },
    { t: 0.28, ease: 'out', handR: S(v(0.38, 1.12, 0.1), [0.85, 0.3, -0.42], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 36, 0], spine: [4, 14, 0] },
    { t: 0.38, ease: 'in', handR: S(v(0, 1.25, 0.68), [-0.2, 0.3, 0.93]), chest: [4, 0, 0], spine: [2, 0, 0], footR: v(-0.14, 0.07, 0.32) },
    { t: 0.48, ease: 'out', handR: S(v(-0.48, 1.3, 0.3), [-0.92, 0.3, 0.2]), chest: [-2, -32, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.85, handR: S(v(-0.45, 1.28, 0.25), [-0.88, 0.4, 0.1]), chest: [-2, -26, 0], spine: [0, -10, 0] },
    ald(1.2),
  ]),
  /** Long lunge: lance drawn back at the shoulder, then a running thrust (0.62 s tell). */
  aldLunge: new Clip('aldLunge', [
    ald(0),
    { t: 0.58, ease: 'out', handR: S(v(-0.36, 1.4, -0.36), [0, 0.04, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: S(v(0.12, 1.32, 0.24), [0, 0.2, 1], { elbow: [0.8, -0.3, -0.3] }), chest: [0, -40, 0], spine: [0, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.2, -0.1], footR: v(-0.16, 0.07, -0.42), head: [0, 30, 0] },
    { t: 0.72, ease: 'out', handR: S(v(-0.05, 1.32, 0.95), [0.02, -0.02, 1], { up: [0, 1, 0] }), handL: null, chest: [14, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.26, 0.18], footL: v(0.14, 0.07, 0.72), head: [0, 0, 0], fk: { upperArmL: [30, 0, 40], forearmL: [-20, 0, 0] } },
    { t: 1.2, handR: S(v(-0.06, 1.3, 0.9), [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [14, 8, 0], hipsPos: [0, -0.24, 0.16] },
    ald(1.7),
  ]),
  /** Two quick thrusts: the second follows the first by 0.36 s. */
  aldTwin: new Clip('aldTwin', [
    ald(0),
    { t: 0.5, ease: 'out', handR: S(v(-0.32, 1.25, -0.2), [0, 0.06, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.14, -0.06], footR: v(-0.16, 0.07, -0.3) },
    { t: 0.6, ease: 'out', handR: S(v(-0.08, 1.24, 0.82), [0.02, 0, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.18, 0.1], footL: v(0.14, 0.07, 0.45) },
    { t: 0.82, ease: 'out', handR: S(v(-0.28, 1.2, -0.05), [0, 0.06, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [2, -22, 0], spine: [0, -8, 0] },
    { t: 0.94, ease: 'out', handR: S(v(-0.06, 1.2, 0.9), [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [12, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.22, 0.14], footR: v(-0.14, 0.07, 0.5) },
    { t: 1.35, handR: S(v(-0.07, 1.18, 0.86), [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 6, 0], hipsPos: [0, -0.2, 0.12] },
    ald(1.75),
  ]),
  /** Side-step and rising sweep from low left to high right (0.6 s tell: blade dropped low). */
  aldRising: new Clip('aldRising', [
    ald(0),
    { t: 0.56, ease: 'out', handR: S(v(0.3, 0.55, 0.3), [0.7, -0.6, 0.35], { elbow: [-0.2, -0.9, -0.3] }), chest: [18, 34, 0], spine: [10, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.24, 0], footL: v(0.3, 0.07, 0.05), head: [0, -16, 0] },
    { t: 0.66, ease: 'in', handR: S(v(0, 1.05, 0.7), [0.1, 0.6, 0.8]), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.76, ease: 'out', handR: S(v(-0.4, 1.85, 0.2), [-0.5, 0.85, -0.1], { elbow: [-0.9, 0.1, -0.2] }), chest: [-16, -28, 0], spine: [-8, -10, 0], hips: [0, -6, 0], hipsPos: [0, 0, 0.04], head: [-10, 0, 0] },
    { t: 1.1, handR: S(v(-0.38, 1.8, 0.16), [-0.5, 0.85, -0.15]), chest: [-14, -24, 0], spine: [-6, -8, 0] },
    ald(1.5),
  ]),
  /** Couched-lance charge (unparryable): lance levelled under the arm, body low (0.8 s tell). */
  aldCharge: new Clip('aldCharge', [
    ald(0),
    { t: 0.7, ease: 'out', handR: S(v(-0.3, 1.15, -0.25), [0.08, 0.02, 1], { up: [0, 1, 0], elbow: [-0.6, -0.6, -0.4] }), handL: S(v(0.05, 1.12, 0.25), [0.08, 0.02, 1], { elbow: [0.8, -0.4, -0.3] }), chest: [18, -10, 0], spine: [12, -4, 0], hips: [0, -4, 0], hipsPos: [0, -0.24, -0.06], footR: v(-0.16, 0.07, -0.4), head: [-16, 8, 0] },
    { t: 0.9, handR: S(v(-0.3, 1.12, -0.2), [0.08, 0.02, 1], { up: [0, 1, 0], elbow: [-0.6, -0.6, -0.4] }), handL: S(v(0.05, 1.1, 0.3), [0.08, 0.02, 1], { elbow: [0.8, -0.4, -0.3] }), chest: [22, -8, 0], spine: [14, -2, 0], hipsPos: [0, -0.28, 0.1], footL: v(0.14, 0.18, 0.3) },
    { t: 1.15, footL: v(0.14, 0.07, 0.1), footR: v(-0.14, 0.2, 0.25), hipsPos: [0, -0.26, 0.1] },
    { t: 1.45, footL: v(0.14, 0.2, 0.3), footR: v(-0.14, 0.07, -0.1), hipsPos: [0, -0.28, 0.1] },
    { t: 1.75, handR: S(v(-0.28, 1.1, 0.1), [0.1, 0.1, 1], { up: [0, 1, 0] }), handL: null, chest: [10, -6, 0], spine: [6, 0, 0], hipsPos: [0, -0.2, 0.05], footL: v(0.14, 0.07, 0.25), footR: v(-0.14, 0.07, -0.15) },
    ald(2.4),
  ]),
  aldBackstep: new Clip('aldBackstep', [
    ald(0),
    { t: 0.12, ease: 'out', hipsPos: [0, 0.04, -0.06], spine: [-10, 0, 0], footL: v(0.14, 0.25, -0.05), footR: v(-0.14, 0.2, -0.1) },
    { t: 0.36, hipsPos: [0, -0.14, 0], spine: [6, 0, 0], footL: v(0.14, 0.07, 0.05), footR: v(-0.14, 0.07, -0.25) },
    ald(0.6),
  ]),

  // ---------------------------------------------------------------- phase 2: the Sorcerer-King
  /** Transition into phase 2: the lance raised to the Bell of Return; the crown of bells answers. */
  aldTrans2: new Clip('aldTrans2', [
    ald(0),
    { t: 0.6, ease: 'out', handR: S(v(-0.15, 1.95, 0.25), [0, 1, 0.12], { up: [0, 0, 1], elbow: [-0.8, -0.2, 0] }), chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-30, 0, 0], fk: { upperArmL: [-120, 0, 70], forearmL: [-20, 0, 0] } },
    { t: 2.0, handR: S(v(-0.15, 2.0, 0.25), [0, 1, 0.12], { up: [0, 0, 1], elbow: [-0.8, -0.2, 0] }), chest: [-22, 0, 0], spine: [-10, 0, 0], head: [-34, 0, 0], fk: { upperArmL: [-140, 0, 80], forearmL: [-10, 0, 0] } },
    { t: 2.5, ease: 'in', handR: S(v(-0.28, 0.9, 0.45), [-0.1, -0.2, 0.97]), chest: [16, -8, 0], spine: [8, 0, 0], hipsPos: [0, -0.18, 0.05], head: [0, 0, 0], fk: { upperArmL: [10, 0, 20], forearmL: [-20, 0, 0] } },
    ald(3.0),
  ]),
  /** Plants the lance in the floor and rings the arena: kneels, left hand raised (0.9 s tell, then held). */
  aldPlant: new Clip('aldPlant', [
    ald(0),
    { t: 0.5, ease: 'out', handR: S(v(-0.1, 1.9, 0.35), [0, -0.98, 0.12], { up: [0, 0, 1], elbow: [-0.9, 0.2, -0.1] }), chest: [-12, 0, 0], spine: [-6, 0, 0], head: [-14, 0, 0], fk: { upperArmL: [-60, 0, 50], forearmL: [-40, 0, 0] } },
    { t: 0.9, ease: 'in', handR: S(v(-0.1, 1.1, 0.5), [0, -0.98, 0.12], { up: [0, 0, 1] }), chest: [22, 0, 0], spine: [10, 0, 0], hipsPos: [0, -0.42, 0.05], footL: v(0.14, 0.07, 0.36), footR: v(-0.13, 0.12, -0.42), footPitchR: -60, head: [-10, 0, 0] },
    { t: 1.2, handR: S(v(-0.1, 1.05, 0.5), [0, -0.98, 0.12], { up: [0, 0, 1] }), fk: { upperArmL: [-150, 0, 20], forearmL: [-10, 0, 0] }, chest: [6, 0, 0], head: [-24, 0, 0], hipsPos: [0, -0.44, 0.05] },
    { t: 3.4, handR: S(v(-0.1, 1.05, 0.5), [0, -0.98, 0.12], { up: [0, 0, 1] }), fk: { upperArmL: [-155, 0, 25], forearmL: [-5, 0, 0] }, chest: [4, 0, 0], head: [-26, 0, 0], hipsPos: [0, -0.44, 0.05] },
    { t: 3.8, ease: 'inout', handR: S(v(-0.2, 1.2, 0.45), [-0.05, 0.1, 0.99]), chest: [8, -8, 0], spine: [4, 0, 0], hipsPos: [0, -0.2, 0.02], footR: v(-0.13, 0.07, -0.2), footPitchR: 0, head: [0, 0, 0] },
    ald(4.3),
  ]),
  /** Bell-wave: left hand draws the toll up, then strikes the floor (0.85 s tell). */
  aldWave: new Clip('aldWave', [
    ald(0),
    { t: 0.8, ease: 'out', fk: { upperArmL: [-170, 0, 10], forearmL: [-10, 0, 0], handL: [0, 0, 0] }, handR: S(v(-0.32, 1.2, -0.1), [-0.3, 0.6, -0.7]), chest: [-18, 6, 0], spine: [-10, 0, 0], head: [-18, 0, 0], hipsPos: [0, 0.02, -0.04] },
    { t: 0.95, ease: 'in', fk: { upperArmL: [-20, 0, 20], forearmL: [-40, 0, 0] }, chest: [36, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.38, 0.1], footL: v(0.14, 0.07, 0.4), footR: v(-0.14, 0.12, -0.35), footPitchR: -40, head: [-18, 0, 0] },
    { t: 1.5, fk: { upperArmL: [-10, 0, 20], forearmL: [-40, 0, 0] }, chest: [30, 0, 0], spine: [14, 0, 0], hipsPos: [0, -0.36, 0.08] },
    ald(2.0),
  ]),
  /** Knell: the left hand pushes three tolls toward the target (casts at 0.7, 0.95, 1.2). */
  aldKnell: new Clip('aldKnell', [
    ald(0),
    { t: 0.55, ease: 'out', fk: { upperArmL: [-60, 0, 80], forearmL: [-80, 0, 0] }, chest: [-6, 30, 0], spine: [-2, 12, 0], head: [0, -20, 0] },
    { t: 0.72, ease: 'out', fk: { upperArmL: [-90, 0, 0], forearmL: [-10, 0, 0] }, chest: [6, -8, 0], spine: [2, -4, 0], head: [0, 0, 0], footL: v(0.14, 0.07, 0.3) },
    { t: 0.85, fk: { upperArmL: [-70, 0, 40], forearmL: [-60, 0, 0] }, chest: [0, 14, 0] },
    { t: 0.97, fk: { upperArmL: [-95, 0, -5], forearmL: [-10, 0, 0] }, chest: [6, -10, 0] },
    { t: 1.1, fk: { upperArmL: [-70, 0, 40], forearmL: [-60, 0, 0] }, chest: [0, 14, 0] },
    { t: 1.22, fk: { upperArmL: [-95, 0, -5], forearmL: [-10, 0, 0] }, chest: [8, -12, 0] },
    { t: 1.7, fk: { upperArmL: [-60, 0, 10], forearmL: [-20, 0, 0] }, chest: [4, -6, 0] },
    ald(2.1),
  ]),
  /** Spinning bell-blade: winds far back, turns a full circle with the lance out (0.8 s tell). */
  aldSpin: new Clip('aldSpin', [
    ald(0),
    { t: 0.75, ease: 'out', handR: S(v(-0.6, 1.1, -0.25), [-0.9, 0.1, -0.4], { elbow: [-0.9, -0.3, 0] }), chest: [8, -60, 0], spine: [4, -24, 0], hips: [0, -20, 0], hipsPos: [0, -0.22, 0], head: [0, 40, 0], fk: { upperArmL: [-40, 0, 60], forearmL: [-30, 0, 0] } },
    { t: 0.9, ease: 'in', handR: S(v(-0.1, 1.1, 0.75), [0.1, 0.05, 1]), chest: [8, 0, 0], spine: [4, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.05, ease: 'linear', handR: S(v(0.7, 1.1, 0.1), [0.99, 0.05, 0.1]), chest: [8, 50, 0], spine: [4, 20, 0], hips: [0, 16, 0] },
    { t: 1.2, handR: S(v(0.2, 1.1, -0.6), [0.3, 0.05, -0.95]), chest: [8, 70, 0], spine: [4, 26, 0], hips: [0, 24, 0] },
    { t: 1.6, handR: S(v(0.3, 1.0, -0.4), [0.5, -0.2, -0.85]), chest: [6, 60, 0], spine: [4, 22, 0], hips: [0, 20, 0] },
    ald(2.0),
  ]),

  // ---------------------------------------------------------------- phase 3: the Ancient King
  /** Transition into phase 3: he kneels as the Unlived stream into him, then rises immense. */
  aldTrans3: new Clip('aldTrans3', [
    ald(0),
    { t: 0.6, ease: 'out', hipsPos: [0, -0.5, 0], hips: [8, 0, 0], spine: [14, 0, 0], chest: [24, 0, 0], head: [20, 0, 0], footL: v(0.14, 0.07, 0.36), footR: v(-0.13, 0.12, -0.45), footPitchR: -60, handR: S(v(-0.2, 0.7, 0.5), [0, -0.98, 0.15], { up: [0, 0, 1] }), fk: { upperArmL: [-40, 0, 70], forearmL: [-20, 0, 0] } },
    { t: 2.4, hipsPos: [0, -0.52, 0], chest: [10, 0, 0], head: [-30, 0, 0], fk: { upperArmL: [-110, 0, 80], forearmL: [-10, 0, 0] } },
    { ...ANC, t: 3.2, ease: 'inout', hipsPos: [0, -0.02, 0], chest: [-20, 0, 0], head: [-26, 0, 0] },
    anc(3.8),
  ]),
  /** Overhead crush with the bell maul (1.1 s tell). */
  aldCrush: new Clip('aldCrush', [
    anc(0),
    { t: 1.0, ease: 'out', handR: S(v(-0.1, 2.0, -0.15), [0, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.2] }), handL: MAUL_L(v(-0.1, 2.0, -0.15), [0, 0.3, -0.95]), chest: [-22, -4, 0], spine: [-12, -2, 0], head: [12, 0, 0], hipsPos: [0, 0.04, -0.08] },
    { t: 1.12, ease: 'in', handR: S(v(-0.06, 1.3, 0.7), [0, 0.4, 0.92]), handL: MAUL_L(v(-0.06, 1.3, 0.7), [0, 0.4, 0.92]), chest: [16, -2, 0], spine: [8, 0, 0], footL: v(0.14, 0.07, 0.45) },
    { t: 1.22, ease: 'out', handR: S(v(-0.04, 0.55, 0.8), [0, -0.5, 0.86]), handL: MAUL_L(v(-0.04, 0.55, 0.8), [0, -0.5, 0.86]), chest: [44, -2, 0], spine: [22, 0, 0], hipsPos: [0, -0.36, 0.14], head: [-24, 0, 0] },
    { t: 2.1, handR: S(v(-0.05, 0.56, 0.78), [0, -0.52, 0.85]), handL: MAUL_L(v(-0.05, 0.56, 0.78), [0, -0.52, 0.85]), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.34, 0.12] },
    anc(2.8),
  ]),
  /** Wide horizontal sweep, right to left (0.9 s tell). */
  aldSweep: new Clip('aldSweep', [
    anc(0),
    { t: 0.85, ease: 'out', handR: S(v(-0.6, 1.2, -0.3), [-0.85, 0.2, -0.45], { elbow: [-0.9, -0.2, -0.1] }), handL: MAUL_L(v(-0.6, 1.2, -0.3), [-0.85, 0.2, -0.45]), chest: [6, -56, 0], spine: [4, -22, 0], hips: [0, -16, 0], hipsPos: [0, -0.22, -0.04], head: [0, 34, 0] },
    { t: 1.0, ease: 'in', handR: S(v(-0.1, 1.1, 0.8), [0.1, 0.1, 0.99]), handL: MAUL_L(v(-0.1, 1.1, 0.8), [0.1, 0.1, 0.99]), chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.15, ease: 'out', handR: S(v(0.62, 1.15, 0.2), [0.95, 0.1, -0.3]), handL: MAUL_L(v(0.62, 1.15, 0.2), [0.95, 0.1, -0.3]), chest: [10, 50, 0], spine: [6, 20, 0], hips: [0, 14, 0], hipsPos: [0, -0.24, 0.06] },
    { t: 1.8, handR: S(v(0.58, 1.1, 0.15), [0.9, 0.0, -0.4]), handL: MAUL_L(v(0.58, 1.1, 0.15), [0.9, 0.0, -0.4]), chest: [10, 44, 0], spine: [6, 18, 0] },
    anc(2.4),
  ]),
  /** Stomp: punishes standing at his feet (0.62 s tell: knee lifted high). */
  aldStomp: new Clip('aldStomp', [
    anc(0),
    { t: 0.6, ease: 'out', footL: v(0.16, 0.6, 0.25), footPitchL: 10, hipsPos: [0, 0.02, -0.06], chest: [-8, 0, 0], spine: [-4, 0, 0], head: [-10, 0, 0] },
    { t: 0.7, ease: 'in', footL: v(0.16, 0.07, 0.35), footPitchL: 0, hipsPos: [0, -0.26, 0.06], chest: [18, 0, 0], spine: [8, 0, 0] },
    { t: 1.2, hipsPos: [0, -0.24, 0.05], chest: [16, 0, 0] },
    anc(1.6),
  ]),
  /** Drain: kneels, arms thrown wide; the Unlived stream into him (channel, interruptible by posture). */
  aldDrain: new Clip('aldDrain', [
    anc(0),
    { t: 0.7, ease: 'out', handR: null, handL: null, fk: { upperArmL: [-100, 0, 80], forearmL: [-10, 0, 0], upperArmR: [-100, 0, -80], forearmR: [-10, 0, 0] }, chest: [-24, 0, 0], spine: [-10, 0, 0], head: [-36, 0, 0], hipsPos: [0, -0.3, 0], footR: v(-0.14, 0.1, -0.3) },
    { t: 3.3, fk: { upperArmL: [-115, 0, 85], forearmL: [-5, 0, 0], upperArmR: [-115, 0, -85], forearmR: [-5, 0, 0] }, chest: [-28, 0, 0], head: [-40, 0, 0], hipsPos: [0, -0.32, 0] },
    { ...ANC, t: 3.8, ease: 'inout' },
    anc(4.2),
  ]),
  /** Death: kneels, the maul falls; he looks up at the Bell of Return. */
  aldDeath: new Clip('aldDeath', [
    { t: 0 },
    { t: 0.7, ease: 'out', hipsPos: [0, -0.52, 0], hips: [8, 0, 0], spine: [8, 0, 0], chest: [16, 0, 0], head: [-10, 0, 0], footL: v(0.14, 0.07, 0.36), footR: v(-0.13, 0.12, -0.45), footPitchR: -60, handR: null, handL: null, fk: { upperArmL: [-10, 0, 20], forearmL: [-40, 0, 0], upperArmR: [-10, 0, -20], forearmR: [-40, 0, 0] } },
    { t: 2.2, hipsPos: [0, -0.54, 0], chest: [4, 0, 0], head: [-34, 0, 0] },
    { t: 3.2, hipsPos: [0, -0.56, 0], chest: [28, 0, 0], head: [30, 0, 0] },
  ]),
};

// ================================================================== the Condemned Bellkeeper

export const BK_CHAIN: HandKey = S([-0.24, 0.95, 0.2], [-0.2, -0.3, 0.93], { up: [0, 0.93, 0.3] });
const BK: Key = { t: 0, handR: BK_CHAIN, handL: null, chest: [14, -4, 0], spine: [8, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.1, 0], neck: [8, 0, 0], head: [-6, 0, 0], fk: { upperArmL: [-20, 0, 20], forearmL: [-50, 0, 0] } };
const bk = (t: number): Key => ({ ...BK, t, ease: 'inout' });

export const bellkeeperClips = {
  /** Wide swing of the chain-bell, right to left (0.6 s tell). */
  bkSwing: new Clip('bkSwing', [
    bk(0),
    { t: 0.58, ease: 'out', handR: S([-0.55, 1.35, -0.3], [-0.8, 0.5, -0.3], { elbow: [-0.9, 0, -0.2] }), chest: [0, -50, 0], spine: [0, -20, 0], hips: [0, -14, 0], head: [0, 30, 0] },
    { t: 0.7, ease: 'in', handR: S([-0.1, 1.2, 0.6], [0.3, 0.2, 0.93]), chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: [0.14, 0.08, 0.3] },
    { t: 0.82, ease: 'out', handR: S([0.55, 1.1, 0.2], [0.9, -0.1, -0.4]), chest: [12, 44, 0], spine: [6, 18, 0], hips: [0, 12, 0] },
    { t: 1.15, handR: S([0.5, 1.0, 0.15], [0.8, -0.3, -0.5]), chest: [12, 40, 0], spine: [6, 16, 0] },
    bk(1.55),
  ]),
  /** Overhead slam with the chain-bell (0.9 s tell). */
  bkSlam: new Clip('bkSlam', [
    bk(0),
    { t: 0.85, ease: 'out', handR: S([-0.1, 1.95, -0.2], [0, 0.4, -0.9], { elbow: [-0.9, 0.2, -0.2] }), chest: [-18, -6, 0], spine: [-8, 0, 0], head: [10, 0, 0], fk: { upperArmL: [-80, 0, 50], forearmL: [-30, 0, 0] } },
    { t: 0.97, ease: 'in', handR: S([-0.06, 1.3, 0.65], [0, 0.4, 0.92]), chest: [14, -2, 0], footL: [0.14, 0.08, 0.4] },
    { t: 1.07, ease: 'out', handR: S([-0.05, 0.5, 0.75], [0, -0.7, 0.7]), chest: [40, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.3, 0.1], head: [-18, 0, 0] },
    { t: 1.7, handR: S([-0.05, 0.52, 0.72], [0, -0.7, 0.7]), chest: [36, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.28, 0.08] },
    bk(2.2),
  ]),
  /** The brand: a left-handed burning thrust (0.7 s tell, the brand held back and glowing). */
  bkBrand: new Clip('bkBrand', [
    bk(0),
    { t: 0.66, ease: 'out', fk: { upperArmL: [-40, 0, 50], forearmL: [-110, 0, 0] }, chest: [0, 36, 0], spine: [0, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.16, -0.06], footL: [0.16, 0.08, -0.3], head: [0, -24, 0] },
    { t: 0.78, ease: 'out', fk: { upperArmL: [-85, 0, -10], forearmL: [-5, 0, 0] }, chest: [12, -14, 0], spine: [6, -6, 0], hips: [0, -4, 0], hipsPos: [0, -0.22, 0.14], footR: [-0.14, 0.08, 0.5], head: [0, 0, 0] },
    { t: 1.25, fk: { upperArmL: [-80, 0, -8], forearmL: [-10, 0, 0] }, chest: [10, -12, 0], hipsPos: [0, -0.2, 0.12] },
    bk(1.7),
  ]),
  /** Rings the bell at his throat with both fists: a close toll (0.8 s tell). */
  bkToll: new Clip('bkToll', [
    bk(0),
    { t: 0.75, ease: 'out', handR: S([-0.1, 1.55, 0.25], [0, 0.9, 0.3]), fk: { upperArmL: [-80, 0, -20], forearmL: [-100, 0, 0] }, chest: [-20, 0, 0], spine: [-10, 0, 0], head: [-20, 0, 0] },
    { t: 0.85, ease: 'in', handR: S([-0.05, 1.25, 0.35], [0, 0.4, 0.9]), fk: { upperArmL: [-40, 0, -30], forearmL: [-110, 0, 0] }, chest: [20, 0, 0], spine: [10, 0, 0], hipsPos: [0, -0.2, 0.02] },
    { t: 1.4, chest: [16, 0, 0], hipsPos: [0, -0.18, 0.02] },
    bk(1.8),
  ]),
  /** Transition: he thrusts the brand into the brazier of his own chest-bell; it ignites. */
  bkTrans: new Clip('bkTrans', [
    bk(0),
    { t: 0.6, ease: 'out', fk: { upperArmL: [-40, 0, -40], forearmL: [-120, 0, 0] }, chest: [20, 0, 0], spine: [10, 0, 0], head: [20, 0, 0], hipsPos: [0, -0.3, 0] },
    { t: 1.8, fk: { upperArmL: [-150, 0, 30], forearmL: [-10, 0, 0] }, chest: [-26, 0, 0], spine: [-10, 0, 0], head: [-30, 0, 0], hipsPos: [0, -0.04, 0] },
    bk(2.4),
  ]),
};

// ================================================================== Bell-Warden

export const BW_HAMMER: HandKey = S([-0.2, 0.95, 0.28], [0.3, 0.6, 0.74], { up: [0, -0.74, 0.6] });
const BWL = (p: V3, dir: V3) => twoHand(p, dir, 0.3);
const BW: Key = { t: 0, handR: BW_HAMMER, handL: BWL(BW_HAMMER.p, BW_HAMMER.dir), chest: [8, -6, 0], spine: [4, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.08, 0] };
const bw = (t: number): Key => ({ ...BW, t, ease: 'inout' });

export const wardenClips = {
  /** Overhead slam; the bell rings on the floor (1.0 s tell). */
  bwSlam: new Clip('bwSlam', [
    bw(0),
    { t: 0.95, ease: 'out', handR: S([-0.1, 1.95, -0.15], [0, 0.35, -0.94], { elbow: [-0.9, 0.2, -0.2] }), handL: BWL([-0.1, 1.95, -0.15], [0, 0.35, -0.94]), chest: [-20, -4, 0], spine: [-10, -2, 0], head: [10, 0, 0], hipsPos: [0, 0.03, -0.06] },
    { t: 1.07, ease: 'in', handR: S([-0.06, 1.25, 0.65], [0, 0.4, 0.92]), handL: BWL([-0.06, 1.25, 0.65], [0, 0.4, 0.92]), chest: [14, -2, 0], footL: [0.14, 0.08, 0.42] },
    { t: 1.17, ease: 'out', handR: S([-0.04, 0.5, 0.75], [0, -0.55, 0.83]), handL: BWL([-0.04, 0.5, 0.75], [0, -0.55, 0.83]), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.32, 0.12], head: [-20, 0, 0] },
    { t: 1.9, handR: S([-0.05, 0.52, 0.72], [0, -0.55, 0.83]), handL: BWL([-0.05, 0.52, 0.72], [0, -0.55, 0.83]), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.3, 0.1] },
    bw(2.5),
  ]),
  /** Horizontal sweep (0.8 s tell). */
  bwSweep: new Clip('bwSweep', [
    bw(0),
    { t: 0.78, ease: 'out', handR: S([-0.55, 1.2, -0.3], [-0.85, 0.2, -0.45], { elbow: [-0.9, -0.2, -0.1] }), handL: BWL([-0.55, 1.2, -0.3], [-0.85, 0.2, -0.45]), chest: [6, -52, 0], spine: [4, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.18, -0.04], head: [0, 30, 0] },
    { t: 0.9, ease: 'in', handR: S([-0.1, 1.1, 0.75], [0.1, 0.1, 0.99]), handL: BWL([-0.1, 1.1, 0.75], [0.1, 0.1, 0.99]), chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.02, ease: 'out', handR: S([0.58, 1.12, 0.2], [0.95, 0.1, -0.3]), handL: BWL([0.58, 1.12, 0.2], [0.95, 0.1, -0.3]), chest: [10, 46, 0], spine: [6, 18, 0], hips: [0, 12, 0] },
    { t: 1.5, handR: S([0.55, 1.08, 0.15], [0.9, 0.0, -0.4]), handL: BWL([0.55, 1.08, 0.15], [0.9, 0.0, -0.4]), chest: [10, 42, 0], spine: [6, 16, 0] },
    bw(2.0),
  ]),
  /** Shoulder shove, unparryable (0.62 s tell: hammer drawn in, shoulder dropped). */
  bwShove: new Clip('bwShove', [
    bw(0),
    { t: 0.6, ease: 'out', handR: S([-0.25, 1.1, -0.05], [0.1, 0.95, 0.1]), handL: BWL([-0.25, 1.1, -0.05], [0.1, 0.95, 0.1]), chest: [20, 40, 0], spine: [12, 16, 0], hips: [0, 12, 0], hipsPos: [0, -0.2, -0.05], head: [-14, -30, 0] },
    { t: 0.76, handR: S([-0.25, 1.1, 0.05], [0.1, 0.95, 0.1]), handL: BWL([-0.25, 1.1, 0.05], [0.1, 0.95, 0.1]), chest: [24, 44, 0], hipsPos: [0, -0.24, 0.12], footL: [0.14, 0.08, 0.4] },
    { t: 1.1, chest: [18, 36, 0], hipsPos: [0, -0.2, 0.1] },
    bw(1.5),
  ]),
};

// ================================================================== Keeper's echo

export const EC_SWORD: HandKey = S([-0.24, 0.98, 0.26], [-0.1, 0.5, 0.86], { up: [0, -0.86, 0.5] });
const EC: Key = { t: 0, handR: EC_SWORD, handL: null, chest: [6, -12, 0], spine: [4, -4, 0], hips: [0, 0, 0], hipsPos: [0, -0.1, 0], head: [0, 8, 0] };
const ec = (t: number): Key => ({ ...EC, t, ease: 'inout' });

export const echoClips = {
  /** Three quick cuts; the first has a 0.5 s tell, each following cut is told by the one before. */
  ecFlurry: new Clip('ecFlurry', [
    ec(0),
    { t: 0.48, ease: 'out', handR: S([-0.42, 1.55, -0.1], [-0.3, 0.7, -0.64], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -30, 0], spine: [-4, -12, 0], hips: [0, -8, 0] },
    { t: 0.56, ease: 'in', handR: S([-0.1, 1.2, 0.58], [0.35, 0.25, 0.9]), chest: [6, 0, 0], footL: [0.13, 0.08, 0.3] },
    { t: 0.64, ease: 'out', handR: S([0.3, 0.8, 0.4], [0.85, -0.4, 0.3]), chest: [14, 28, 0], spine: [8, 12, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.84, ease: 'out', handR: S([0.34, 1.1, 0.12], [0.85, 0.25, -0.45], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 32, 0] },
    { t: 0.92, ease: 'in', handR: S([0, 1.2, 0.62], [-0.2, 0.3, 0.93]), chest: [4, 0, 0], footR: [-0.14, 0.08, 0.3] },
    { t: 1.0, ease: 'out', handR: S([-0.45, 1.25, 0.3], [-0.92, 0.3, 0.2]), chest: [-2, -30, 0], spine: [0, -12, 0] },
    { t: 1.22, ease: 'out', handR: S([-0.3, 1.25, -0.25], [0, 0.08, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.16, -0.06] },
    { t: 1.32, ease: 'out', handR: S([-0.06, 1.2, 0.82], [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.2, 0.14], footL: [0.14, 0.08, 0.55] },
    { t: 1.75, handR: S([-0.07, 1.18, 0.78], [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.19, 0.12] },
    ec(2.15),
  ]),
  /** Blink: a flickering side-step (invulnerable while it flickers). */
  ecBlink: new Clip('ecBlink', [
    ec(0),
    { t: 0.12, ease: 'out', hipsPos: [0.1, -0.2, 0], chest: [0, -10, -10], footL: [0.3, 0.2, 0], footR: [-0.05, 0.08, 0] },
    { t: 0.4, hipsPos: [0, -0.12, 0], chest: [0, 0, 0], footL: [0.14, 0.08, 0], footR: [-0.14, 0.08, 0] },
    ec(0.6),
  ]),
  /** Lunge from range (0.6 s tell). */
  ecLunge: new Clip('ecLunge', [
    ec(0),
    { t: 0.58, ease: 'out', handR: S([-0.34, 1.15, -0.3], [0, 0.08, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [2, -38, 0], spine: [0, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.18, -0.08], footR: [-0.16, 0.08, -0.35] },
    { t: 0.7, ease: 'out', handR: S([-0.06, 1.2, 0.86], [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.22, 0.16], footL: [0.14, 0.08, 0.6] },
    { t: 1.1, handR: S([-0.06, 1.18, 0.82], [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.2, 0.14] },
    ec(1.5),
  ]),
};

// ================================================================== Bell-ringer

export const BR_BELL: HandKey = S([-0.22, 1.05, 0.28], [0, 1, 0.1], { up: [0, -0.1, 1] });
const BR: Key = { t: 0, handR: BR_BELL, handL: null, chest: [6, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0], head: [8, 0, 0], fk: { upperArmL: [-20, 0, 10], forearmL: [-60, 0, 0] } };
const br = (t: number): Key => ({ ...BR, t, ease: 'inout' });

export const ringerClips = {
  /** Raises the hand bell high and swings it down: a knell leaves it (0.9 s tell, cast at 0.95). */
  brCast: new Clip('brCast', [
    br(0),
    { t: 0.85, ease: 'out', handR: S([-0.2, 2.0, 0.1], [0, 1, -0.2], { up: [0, 0.2, 1], elbow: [-0.9, 0.1, -0.2] }), chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-16, 0, 0] },
    { t: 0.97, ease: 'in', handR: S([-0.1, 1.35, 0.55], [0, 0.4, 0.92]), chest: [12, 0, 0], spine: [6, 0, 0], footL: [0.13, 0.08, 0.25] },
    { t: 1.3, handR: S([-0.1, 1.3, 0.5], [0, 0.5, 0.86]), chest: [10, 0, 0] },
    br(1.7),
  ]),
  /** Bell bash at close range (0.55 s tell). */
  brBash: new Clip('brBash', [
    br(0),
    { t: 0.52, ease: 'out', handR: S([-0.45, 1.4, -0.1], [-0.5, 0.8, -0.3], { elbow: [-0.9, 0, -0.2] }), chest: [-6, -30, 0], spine: [-2, -12, 0] },
    { t: 0.62, ease: 'in', handR: S([-0.05, 1.2, 0.55], [0.3, 0.4, 0.86]), chest: [8, 0, 0], footL: [0.13, 0.08, 0.28] },
    { t: 0.72, ease: 'out', handR: S([0.3, 0.95, 0.35], [0.8, -0.2, 0.5]), chest: [12, 26, 0], spine: [6, 10, 0] },
    { t: 1.0, handR: S([0.28, 0.95, 0.32], [0.8, -0.1, 0.5]), chest: [10, 22, 0] },
    br(1.3),
  ]),
};
