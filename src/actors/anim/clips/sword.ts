/**
 * Straight sword (+ shield / off-hand) player moveset. Root space: +Z forward, -X = right.
 * Gameplay windows for these clips live in src/combat/moves.ts — keep them in sync.
 */
import { Clip } from '../Clip';
import { SHIELD_GUARD, SHIELD_REST, SWORD_REST, SWORD_GUARDING } from './stances';
import type { HandKey, Key } from '../types';

const REST: Key = { t: 0, handR: SWORD_REST, handL: SHIELD_REST, chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] };
const rest = (t: number, ease: Key['ease'] = 'inout'): Key => ({ ...REST, t, ease });
const S = (p: [number, number, number], dir: [number, number, number], extra: Partial<HandKey> = {}): HandKey => ({ p, dir, ...extra });

export const swordClips = {
  /** Guard overlay (upper body only). */
  guard: new Clip('guard', [
    { t: 0, handL: SHIELD_GUARD, handR: SWORD_GUARDING, chest: [4, 10, 0], spine: [4, 4, 0], head: [-4, -6, 0] },
  ], { loop: true, duration: 1 }),

  /** Blocked hit while guarding: shield driven back into the body. */
  guardHit: new Clip('guardHit', [
    { t: 0, handL: SHIELD_GUARD, handR: SWORD_GUARDING, chest: [4, 10, 0], spine: [4, 4, 0], hipsPos: [0, -0.05, 0] },
    { t: 0.07, ease: 'out', handL: { ...SHIELD_GUARD, p: [0.12, 1.24, 0.24] }, chest: [-8, 12, 0], spine: [-4, 4, 0], hipsPos: [0, -0.09, -0.04] },
    { t: 0.4, handL: SHIELD_GUARD, handR: SWORD_GUARDING, chest: [4, 10, 0], spine: [4, 4, 0], hipsPos: [0, -0.05, 0] },
  ]),

  /** Light 1: diagonal cut from high right to low left. */
  light1: new Clip('light1', [
    rest(0),
    { t: 0.24, ease: 'out', handR: S([-0.4, 1.5, -0.02], [-0.35, 0.8, -0.45], { elbow: [-0.8, -0.2, -0.3] }), chest: [-4, -28, 0], spine: [0, -12, 0], hips: [0, -8, 0], handL: SHIELD_REST },
    { t: 0.33, ease: 'in', handR: S([-0.12, 1.28, 0.5], [0.3, 0.3, 0.9]), chest: [6, -4, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.22] },
    { t: 0.42, ease: 'out', handR: S([0.28, 0.82, 0.38], [0.85, -0.4, 0.3]), chest: [12, 26, 0], spine: [8, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.62, handR: S([0.18, 0.84, 0.34], [0.8, -0.25, 0.45], { up: [0.2, -0.6, -0.8] }), chest: [10, 22, 0], spine: [6, 10, 0], hipsPos: [0, -0.08, 0.03] },
    rest(0.85),
  ]),

  /** Light 2: rising backhand from low left to high right. */
  light2: new Clip('light2', [
    { t: 0, handR: S([0.18, 0.84, 0.34], [0.8, -0.25, 0.45], { up: [0.2, -0.6, -0.8] }), handL: SHIELD_REST, chest: [10, 22, 0], spine: [6, 10, 0], hipsPos: [0, -0.08, 0.03] },
    { t: 0.2, ease: 'out', handR: S([0.3, 1.0, 0.18], [0.85, 0.2, -0.4], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 30, 0], spine: [4, 14, 0], hips: [0, 10, 0] },
    { t: 0.3, ease: 'in', handR: S([-0.02, 1.2, 0.58], [-0.15, 0.35, 0.92]), chest: [4, 2, 0], spine: [2, 0, 0], hips: [0, 0, 0], footR: [-0.14, 0.08, 0.2] },
    { t: 0.38, ease: 'out', handR: S([-0.42, 1.35, 0.28], [-0.9, 0.35, 0.2]), chest: [-2, -28, 0], spine: [0, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.08, 0.04] },
    { t: 0.55, handR: S([-0.4, 1.32, 0.22], [-0.85, 0.45, 0.1]), chest: [-2, -24, 0], spine: [0, -10, 0] },
    rest(0.8),
  ]),

  /** Light 3: overhead vertical chop with a step. */
  light3: new Clip('light3', [
    { t: 0, handR: S([-0.4, 1.32, 0.22], [-0.85, 0.45, 0.1]), handL: SHIELD_REST, chest: [-2, -24, 0], spine: [0, -10, 0] },
    { t: 0.3, ease: 'out', handR: S([-0.12, 1.78, -0.08], [0.05, 0.35, -0.93], { elbow: [-0.9, 0.1, -0.2] }), chest: [-12, -8, 0], spine: [-6, -4, 0], hipsPos: [0, 0, -0.03], head: [4, 0, 0] },
    { t: 0.38, ease: 'in', handR: S([-0.08, 1.5, 0.52], [0.02, 0.65, 0.76]), chest: [8, -4, 0], spine: [6, 0, 0], footL: [0.13, 0.08, 0.35] },
    { t: 0.48, ease: 'out', handR: S([-0.06, 0.72, 0.58], [0.02, -0.55, 0.83]), chest: [26, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.16, 0.08], head: [-12, 0, 0] },
    { t: 0.7, handR: S([-0.08, 0.74, 0.55], [0.02, -0.45, 0.88]), chest: [22, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.14, 0.06] },
    rest(0.98),
  ]),

  /** Heavy: charge (held). The move holds the last key while charging. */
  heavyCharge: new Clip('heavyCharge', [
    rest(0),
    { t: 0.35, ease: 'out', handR: S([-0.32, 1.62, -0.22], [-0.15, 0.45, -0.88], { elbow: [-0.9, 0, -0.1] }), chest: [-8, -34, 0], spine: [-2, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.07, -0.05], footR: [-0.15, 0.08, -0.22] },
    { t: 0.8, handR: S([-0.34, 1.66, -0.26], [-0.12, 0.4, -0.9], { elbow: [-0.9, 0, -0.1] }), chest: [-10, -38, 0], spine: [-3, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.09, -0.06] },
  ]),

  /** Heavy release: big diagonal cleave. */
  heavyRelease: new Clip('heavyRelease', [
    { t: 0, handR: S([-0.34, 1.66, -0.26], [-0.12, 0.4, -0.9], { elbow: [-0.9, 0, -0.1] }), handL: SHIELD_REST, chest: [-10, -38, 0], spine: [-3, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.09, -0.06], footR: [-0.15, 0.08, -0.22] },
    { t: 0.1, ease: 'in', handR: S([-0.12, 1.4, 0.6], [0.2, 0.45, 0.87]), chest: [6, -6, 0], spine: [4, -2, 0], hips: [0, 0, 0], footL: [0.14, 0.08, 0.38] },
    { t: 0.2, ease: 'out', handR: S([0.22, 0.58, 0.55], [0.5, -0.62, 0.6]), chest: [28, 24, 0], spine: [14, 10, 0], hips: [0, 10, 0], hipsPos: [0, -0.18, 0.1], footR: [-0.13, 0.08, -0.1] },
    { t: 0.5, handR: S([0.2, 0.6, 0.5], [0.5, -0.55, 0.65]), chest: [24, 22, 0], spine: [12, 8, 0], hipsPos: [0, -0.16, 0.08] },
    rest(0.9),
  ]),

  /** Parry with the shield: an outward flick that catches the blow. */
  parryShield: new Clip('parryShield', [
    rest(0),
    { t: 0.08, ease: 'out', handL: { socket: 'shieldL', p: [0.32, 1.18, 0.5], dir: [0.1, 0.95, 0.2], up: [0.5, 0, 0.87], elbow: [0.9, -0.3, -0.1] }, chest: [2, 14, 0], spine: [2, 6, 0] },
    { t: 0.24, handL: { socket: 'shieldL', p: [0.48, 1.12, 0.42], dir: [0.2, 0.95, 0.1], up: [0.95, 0, 0.3], elbow: [0.9, -0.3, -0.1] }, chest: [0, 20, 0], spine: [0, 8, 0] },
    rest(0.62),
  ]),

  /** Parry with a dirk / bare off-hand. */
  parryHand: new Clip('parryHand', [
    { t: 0, handL: null, chest: [2, -4, 0] },
    { t: 0.08, ease: 'out', handL: { p: [0.3, 1.25, 0.48], dir: [0.3, 0.7, 0.65], up: [0.8, -0.3, -0.5], elbow: [0.9, -0.4, -0.2] }, chest: [2, 16, 0], spine: [2, 6, 0] },
    { t: 0.24, handL: { p: [0.5, 1.2, 0.32], dir: [0.7, 0.6, 0.35], up: [0.5, -0.5, -0.7], elbow: [0.9, -0.4, -0.2] }, chest: [0, 22, 0], spine: [0, 8, 0] },
    { t: 0.62, handL: null, chest: [2, -4, 0], spine: [0, 0, 0] },
  ]),

  /** Bulwark Toll: shield bash with a step. */
  bash: new Clip('bash', [
    rest(0),
    { t: 0.24, ease: 'out', handL: { socket: 'shieldL', p: [0.18, 1.12, 0.12], dir: [0, 1, 0.1], up: [0.3, 0, 0.95], elbow: [0.9, -0.2, -0.3] }, chest: [-4, 26, 0], spine: [-2, 10, 0], hipsPos: [0, -0.08, -0.04] },
    { t: 0.34, ease: 'out', handL: { socket: 'shieldL', p: [0.04, 1.2, 0.68], dir: [0, 1, 0.05], up: [0, 0, 1], elbow: [0.9, -0.2, -0.3] }, chest: [10, -6, 0], spine: [8, -2, 0], hipsPos: [0, -0.14, 0.1], footL: [0.13, 0.08, 0.42] },
    { t: 0.55, handL: { socket: 'shieldL', p: [0.06, 1.18, 0.6], dir: [0, 1, 0.05], up: [0, 0, 1], elbow: [0.9, -0.2, -0.3] }, chest: [8, -4, 0], hipsPos: [0, -0.12, 0.08] },
    rest(0.95),
  ]),

  /** Oathbound Lunge: a stepping thrust. */
  lunge: new Clip('lunge', [
    rest(0),
    { t: 0.3, ease: 'out', handR: S([-0.3, 1.22, -0.2], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -36, 0], spine: [0, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.12, -0.06], footR: [-0.16, 0.08, -0.3] },
    { t: 0.4, ease: 'out', handR: S([-0.04, 1.26, 0.82], [0.03, -0.02, 1], { up: [0, 1, 0] }), chest: [10, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.2, 0.12], footL: [0.14, 0.08, 0.55] },
    { t: 0.62, handR: S([-0.05, 1.24, 0.78], [0.03, -0.05, 1], { up: [0, 1, 0] }), chest: [10, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.18, 0.1] },
    rest(1.0),
  ]),

  /** Sword critical from behind: drive the blade into the back. */
  critBack: new Clip('critBack', [
    rest(0),
    { t: 0.28, ease: 'out', handR: S([-0.28, 1.45, -0.1], [0, -0.1, 1], { up: [0, 1, 0] }), chest: [-6, -24, 0], spine: [0, -10, 0] },
    { t: 0.38, ease: 'in', handR: S([-0.06, 1.2, 0.55], [0.05, -0.25, 0.97], { up: [0, 1, 0] }), chest: [14, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.1, 0.06], footL: [0.13, 0.08, 0.3] },
    { t: 0.9, handR: S([-0.06, 1.12, 0.5], [0.05, -0.4, 0.92], { up: [0, 1, 0] }), chest: [18, 6, 0], spine: [10, 2, 0], hipsPos: [0, -0.14, 0.06] },
    { t: 1.15, ease: 'out', handR: S([-0.2, 1.25, 0.2], [-0.2, 0.3, 0.93]), chest: [0, -10, 0], hipsPos: [0, -0.06, 0] },
    rest(1.5),
  ]),

  /** Sword critical from the front (riposte / broken guard): gut thrust and wrench. */
  critFront: new Clip('critFront', [
    rest(0),
    { t: 0.26, ease: 'out', handR: S([-0.3, 1.18, -0.15], [0, 0.05, 1], { up: [0, 1, 0] }), chest: [0, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.08, -0.04] },
    { t: 0.38, ease: 'in', handR: S([-0.05, 1.15, 0.6], [0.02, 0.02, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.14, 0.1], footL: [0.13, 0.08, 0.36] },
    { t: 0.8, handR: S([-0.05, 1.3, 0.55], [0.02, 0.4, 0.92], { up: [0, 1, 0] }), chest: [4, 4, 0], spine: [2, 2, 0], hipsPos: [0, -0.1, 0.08] },
    { t: 1.05, ease: 'out', handR: S([-0.25, 1.2, 0.2], [-0.2, 0.4, 0.9]), chest: [0, -8, 0], hipsPos: [0, -0.05, 0] },
    rest(1.4),
  ]),

  /** Plunging critical on a kneeling (posture-broken) foe. */
  critDown: new Clip('critDown', [
    rest(0),
    { t: 0.35, ease: 'out', handR: S([-0.1, 1.72, 0.2], [0, -0.3, 0.95], { up: [0, 1, 0], elbow: [-0.9, 0.2, -0.2] }), chest: [-10, -8, 0], spine: [-4, -2, 0] },
    { t: 0.5, ease: 'in', handR: S([-0.05, 0.95, 0.55], [0, -0.85, 0.5], { up: [0, 0.5, 0.85] }), chest: [28, 0, 0], spine: [14, 0, 0], hipsPos: [0, -0.22, 0.08], footL: [0.13, 0.08, 0.32] },
    { t: 1.0, handR: S([-0.05, 0.9, 0.52], [0, -0.9, 0.4], { up: [0, 0.4, 0.9] }), chest: [30, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.24, 0.08] },
    { t: 1.25, ease: 'out', handR: S([-0.2, 1.25, 0.25], [-0.2, 0.4, 0.9]), chest: [4, -6, 0], hipsPos: [0, -0.06, 0] },
    rest(1.6),
  ]),
};
