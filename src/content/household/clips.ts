/**
 * Garden Court animation clips (IK keyframes, root space: +Z forward, −X is the character's right).
 * Every attack opens with a long, readable windup; parry stances are held, square poses with the
 * blade crosswise at face height so they read from across a room.
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';

const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
const sc = (k: number) => (v: V3): V3 => [v[0] * k, v[1] * k, v[2] * k];

// ============================================================================ longsword (retainers, Celwyn, ghosts)

export const LS_REST: HandKey = S([-0.25, 0.97, 0.22], [-0.08, 0.5, 0.86], { up: [0, -0.86, 0.5] });
const LS: Key = { t: 0, handR: LS_REST, handL: null, chest: [4, -8, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0], head: [0, 0, 0] };
const ls = (t: number, k = 1): Key => ({ ...LS, handR: k === 1 ? LS_REST : S(sc(k)(LS_REST.p), LS_REST.dir, { up: LS_REST.up }), t, ease: 'inout' });
const HIGH_R = S([-0.42, 1.62, -0.1], [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] });
const MID = S([-0.1, 1.25, 0.6], [0.35, 0.28, 0.9]);
const LOW_L = S([0.32, 0.78, 0.42], [0.85, -0.45, 0.28]);
const HIGH_L = S([0.36, 1.1, 0.1], [0.85, 0.3, -0.42], { elbow: [-0.2, -0.8, -0.4] });
const MID2 = S([0, 1.22, 0.64], [-0.2, 0.3, 0.93]);
const LOW_R = S([-0.46, 1.25, 0.3], [-0.92, 0.3, 0.2]);
const THR_BACK = S([-0.34, 1.3, -0.3], [0, 0.03, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] });
const THR_OUT = S([-0.05, 1.28, 0.9], [0.02, -0.03, 1], { up: [0, 1, 0] });
const OVER_UP = S([-0.1, 1.95, -0.1], [0.02, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.2] });
const OVER_DOWN = S([-0.05, 0.62, 0.62], [0, -0.6, 0.8]);
/** Half-sword parry stance: blade crosswise at face height, edge out, the off hand on the flat. */
export const PARRY_R = S([-0.24, 1.42, 0.36], [0.94, 0.3, 0.12], { up: [-0.1, 0.05, 1], elbow: [-0.9, -0.4, -0.2] });
const PARRY_L = S([0.24, 1.5, 0.4], [0.2, 0.9, 0.3], { elbow: [0.8, -0.5, -0.2] });
const PARRY_BODY = { chest: [-4, 10, 0] as V3, spine: [-2, 4, 0] as V3, hips: [0, 0, 0] as V3, hipsPos: [0, -0.16, -0.05] as V3, head: [6, -8, 0] as V3, footL: [0.16, 0.08, 0.26] as V3, footR: [-0.16, 0.08, -0.22] as V3 };
const twoHand = (h: HandKey): HandKey => { const d = h.dir, l = Math.hypot(d[0], d[1], d[2]); return { p: [h.p[0] + (d[0] / l) * 0.13, h.p[1] + (d[1] / l) * 0.13, h.p[2] + (d[2] / l) * 0.13], dir: d, elbow: [0.8, -0.4, -0.4] }; };

function longswordClips(pre: string) {
  return {
    /** Diagonal cut, 0.55 s tell. */
    [pre + 'Cut']: new Clip(pre + 'Cut', [
      ls(0),
      { t: 0.5, ease: 'out', handR: HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.02, -0.05], head: [6, 16, 0], fk: { upperArmL: [-50, 0, 40], forearmL: [-40, 0, 0] } },
      { t: 0.6, ease: 'in', handR: MID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: [0.14, 0.07, 0.34] },
      { t: 0.7, ease: 'out', handR: LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
      { t: 1.0, handR: { ...LOW_L, up: [0.2, -0.6, -0.8] }, chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
      ls(1.35),
    ]),
    /** Backhand follow-up (told by the first cut). */
    [pre + 'Back']: new Clip(pre + 'Back', [
      { t: 0, handR: { ...LOW_L, up: [0.2, -0.6, -0.8] }, handL: null, chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
      { t: 0.32, ease: 'out', handR: HIGH_L, chest: [6, 34, 0], spine: [4, 14, 0] },
      { t: 0.42, ease: 'in', handR: MID2, chest: [4, 0, 0], spine: [2, 0, 0], footR: [-0.14, 0.07, 0.3] },
      { t: 0.52, ease: 'out', handR: LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
      { t: 0.9, handR: LOW_R, chest: [-2, -26, 0], spine: [0, -10, 0] },
      ls(1.3),
    ]),
    /** Lunging thrust, 0.65 s tell: blade drawn back level with the eyes. */
    [pre + 'Thrust']: new Clip(pre + 'Thrust', [
      ls(0),
      { t: 0.6, ease: 'out', handR: THR_BACK, handL: S([0.1, 1.3, 0.2], [0, 0.2, 1], { elbow: [0.8, -0.3, -0.3] }), chest: [0, -38, 0], spine: [0, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.16, -0.08], footR: [-0.16, 0.07, -0.36] },
      { t: 0.72, ease: 'out', handR: THR_OUT, handL: null, chest: [12, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.22, 0.14], footL: [0.14, 0.07, 0.6], fk: { upperArmL: [30, 0, 30], forearmL: [-20, 0, 0] } },
      { t: 1.1, handR: THR_OUT, chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
      ls(1.55),
    ]),
    /** Two-handed overhead, 0.9 s tell. */
    [pre + 'Over']: new Clip(pre + 'Over', [
      ls(0),
      { t: 0.85, ease: 'out', handR: OVER_UP, handL: twoHand(OVER_UP), chest: [-16, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.01, -0.05] },
      { t: 0.97, ease: 'in', handR: S([-0.08, 1.5, 0.55], [0, 0.6, 0.8]), handL: twoHand(S([-0.08, 1.5, 0.55], [0, 0.6, 0.8])), chest: [10, -4, 0], spine: [6, 0, 0], footL: [0.13, 0.08, 0.38] },
      { t: 1.07, ease: 'out', handR: OVER_DOWN, handL: twoHand(OVER_DOWN), chest: [32, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.2, 0.1], head: [-14, 0, 0] },
      { t: 1.55, handR: OVER_DOWN, handL: twoHand(OVER_DOWN), chest: [28, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.18, 0.08] },
      ls(2.0),
    ]),
    /** Parry stance (held; the move decides how long). */
    [pre + 'Stance']: new Clip(pre + 'Stance', [
      ls(0),
      { t: 0.14, ease: 'out', handR: PARRY_R, handL: PARRY_L, ...PARRY_BODY },
      { t: 0.7, handR: { ...PARRY_R, p: [-0.23, 1.44, 0.38] }, handL: PARRY_L, ...PARRY_BODY, chest: [-5, 12, 0] },
      { t: 1.3, handR: PARRY_R, handL: PARRY_L, ...PARRY_BODY },
    ], { loop: true, duration: 1.3 }),
    /** The riposte after a successful parry: turn the blade over and drive it in (0.6 s from the parry). */
    [pre + 'Riposte']: new Clip(pre + 'Riposte', [
      { t: 0, handR: PARRY_R, handL: PARRY_L, ...PARRY_BODY },
      { t: 0.45, ease: 'out', handR: THR_BACK, handL: null, chest: [0, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.14, -0.06], footR: [-0.16, 0.07, -0.3] },
      { t: 0.58, ease: 'out', handR: THR_OUT, chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.22, 0.14], footL: [0.14, 0.07, 0.55] },
      { t: 1.0, handR: THR_OUT, chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
      ls(1.35),
    ]),
    /** Pommel strike (guard break), 0.5 s tell. */
    [pre + 'Pommel']: new Clip(pre + 'Pommel', [
      ls(0),
      { t: 0.46, ease: 'out', handR: S([-0.3, 1.35, 0.0], [0, -0.3, -0.95], { elbow: [-0.9, -0.2, -0.3] }), handL: S([-0.18, 1.3, 0.05], [0, -0.3, -0.95]), chest: [-6, -26, 0], spine: [0, -10, 0], hipsPos: [0, -0.1, -0.06] },
      { t: 0.56, ease: 'out', handR: S([-0.05, 1.4, 0.6], [0, -0.4, -0.9]), handL: S([0.08, 1.35, 0.58], [0, -0.4, -0.9]), chest: [14, 12, 0], spine: [8, 4, 0], hipsPos: [0, -0.18, 0.14], footL: [0.14, 0.07, 0.5] },
      { t: 0.95, handR: S([-0.05, 1.38, 0.55], [0, -0.4, -0.9]), handL: null, chest: [10, 10, 0], hipsPos: [0, -0.16, 0.1] },
      ls(1.3),
    ]),
    /** Caught out of the stance (a varied attack landed): blade knocked aside, a stumble. */
    [pre + 'Caught']: new Clip(pre + 'Caught', [
      { t: 0, handR: PARRY_R, handL: PARRY_L, ...PARRY_BODY },
      { t: 0.14, ease: 'out', handR: S([-0.6, 1.1, 0.1], [-0.9, 0.4, 0.1]), handL: null, fk: { upperArmL: [-60, 0, 50], forearmL: [-20, 0, 0] }, chest: [-18, -20, 0], spine: [-8, -6, 0], head: [-12, 0, 0], hipsPos: [0, -0.1, -0.12], footR: [-0.14, 0.1, -0.35] },
      { t: 0.8, handR: S([-0.55, 1.05, 0.15], [-0.85, 0.45, 0.2]), chest: [-12, -14, 0], hipsPos: [0, -0.1, -0.1] },
      ls(1.1),
    ]),
  };
}

// ============================================================================ Celwyn-only (phase 2/3), transitions, death

const cel = {
  /** The Lesson: two quick cuts and a third that waits — her guard drops after it (the habit she knew in him). */
  celLesson: new Clip('celLesson', [
    ls(0),
    { t: 0.45, ease: 'out', handR: HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0] },
    { t: 0.55, ease: 'in', handR: MID, chest: [8, -2, 0], spine: [6, 0, 0], footL: [0.14, 0.07, 0.32] },
    { t: 0.65, ease: 'out', handR: LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.88, ease: 'out', handR: HIGH_L, chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.98, ease: 'in', handR: MID2, chest: [4, 0, 0], footR: [-0.14, 0.07, 0.3] },
    { t: 1.08, ease: 'out', handR: LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    // the third cut: raised and held (long, obvious pause), then brought down
    { t: 1.6, ease: 'out', handR: OVER_UP, handL: twoHand(OVER_UP), chest: [-16, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.0, -0.04] },
    { t: 2.25, handR: { ...OVER_UP, p: [-0.1, 1.98, -0.14] }, handL: twoHand(OVER_UP), chest: [-18, -6, 0], spine: [-9, -2, 0], head: [9, 0, 0] },
    { t: 2.36, ease: 'in', handR: S([-0.08, 1.5, 0.55], [0, 0.6, 0.8]), handL: twoHand(S([-0.08, 1.5, 0.55], [0, 0.6, 0.8])), chest: [10, -4, 0], footL: [0.13, 0.08, 0.4] },
    { t: 2.46, ease: 'out', handR: OVER_DOWN, handL: twoHand(OVER_DOWN), chest: [32, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.22, 0.12], head: [-14, 0, 0] },
    { t: 3.3, handR: OVER_DOWN, handL: null, chest: [30, -2, 0], spine: [15, 0, 0], hipsPos: [0, -0.2, 0.1] },
    ls(3.8),
  ]),
  /** Side-step cut: a quick step left then a rising cut (0.6 s tell). */
  celStepCut: new Clip('celStepCut', [
    ls(0),
    { t: 0.3, ease: 'out', handR: LOW_R, chest: [0, -24, 0], spine: [0, -8, 0], hipsPos: [0.1, -0.1, 0], footL: [0.35, 0.07, 0.05] },
    { t: 0.6, ease: 'out', handR: S([-0.5, 0.7, 0.2], [-0.7, -0.5, 0.4]), chest: [8, -30, 0], spine: [4, -12, 0], hipsPos: [0.05, -0.18, 0] },
    { t: 0.72, ease: 'out', handR: S([0.25, 1.6, 0.45], [0.5, 0.8, 0.3]), chest: [-8, 24, 0], spine: [-4, 10, 0], hipsPos: [0, -0.06, 0.1], footR: [-0.12, 0.07, 0.3] },
    { t: 1.05, handR: S([0.22, 1.55, 0.4], [0.5, 0.8, 0.3]), chest: [-6, 20, 0] },
    ls(1.4),
  ]),
  /** Bell-light toll: sword raised over the head (jump-back tell), driven into the flags. */
  celToll: new Clip('celToll', [
    ls(0),
    { t: 0.5, ease: 'out', hipsPos: [0, 0.05, -0.2], chest: [-14, 0, 0], handR: OVER_UP, handL: twoHand(OVER_UP), footL: [0.14, 0.1, -0.1], footR: [-0.14, 0.1, -0.3] },
    { t: 1.0, handR: S([-0.02, 2.05, -0.05], [0, 1, 0.1], { up: [0, 0, 1] }), handL: twoHand(S([-0.02, 2.05, -0.05], [0, 1, 0.1])), chest: [-18, 0, 0], head: [10, 0, 0], hipsPos: [0, 0.08, -0.15] },
    { t: 1.1, ease: 'in', handR: S([0, 0.55, 0.7], [0, -1, 0.15], { up: [0, 0, 1] }), handL: twoHand(S([0, 0.55, 0.7], [0, -1, 0.15])), chest: [38, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.35, 0.2], footL: [0.14, 0.07, 0.5] },
    { t: 1.7, handR: S([0, 0.55, 0.7], [0, -1, 0.15], { up: [0, 0, 1] }), chest: [34, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.33, 0.18] },
    ls(2.1),
  ]),
  /** Oath charge (unparryable): blade levelled low at the hip, a long rush (0.85 s tell). */
  celOath: new Clip('celOath', [
    ls(0),
    { t: 0.8, ease: 'out', handR: S([-0.3, 1.0, -0.2], [0, 0.1, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] }), handL: S([-0.18, 1.02, -0.08], [0, 0.1, 1]), chest: [14, -20, 0], spine: [8, -8, 0], hipsPos: [0, -0.24, -0.1], footR: [-0.16, 0.07, -0.4] },
    { t: 0.95, ease: 'out', handR: S([-0.08, 1.1, 0.85], [0, 0, 1], { up: [0, 1, 0] }), handL: null, chest: [20, 4, 0], spine: [10, 2, 0], hipsPos: [0, -0.28, 0.1], footL: [0.14, 0.07, 0.6] },
    { t: 1.45, handR: S([-0.08, 1.1, 0.85], [0, 0, 1], { up: [0, 1, 0] }), chest: [18, 4, 0], hipsPos: [0, -0.26, 0.1], footR: [-0.14, 0.07, 0.2] },
    ls(1.9),
  ]),
  /** Phase 2: she unclasps the cloak and lets it fall, then salutes. */
  celTransition2: new Clip('celTransition2', [
    ls(0),
    { t: 0.4, ease: 'out', handR: S([-0.2, 1.0, 0.1], [0, -1, 0.1]), handL: null, fk: { upperArmL: [-150, 0, -30], forearmL: [-80, 0, 0] }, chest: [0, 10, 0], head: [10, 20, 0] },
    { t: 1.2, fk: { upperArmL: [-40, 0, 60], forearmL: [-20, 0, 0] }, chest: [-6, -10, 0], head: [0, -10, 0] },
    { t: 1.7, ease: 'out', handR: S([-0.05, 1.55, 0.25], [0, 1, 0.05], { up: [0, 0, 1] }), handL: null, fk: { upperArmL: [0, 0, 10], forearmL: [-20, 0, 0] }, chest: [0, 0, 0], head: [0, 0, 0] },
    { t: 2.3, handR: S([-0.05, 1.55, 0.25], [0, 1, 0.05], { up: [0, 0, 1] }) },
    ls(2.6),
  ]),
  /** Phase 3: down on one knee, the bell tolls, she rises lit from within. */
  celTransition3: new Clip('celTransition3', [
    ls(0),
    { t: 0.4, ease: 'out', hipsPos: [0, -0.45, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [18, 0, 0], head: [22, 0, 0], footL: [0.14, 0.08, 0.34], footR: [-0.13, 0.12, -0.42], footPitchR: -60, handR: S([-0.12, 0.6, 0.45], [0, -1, 0.05], { up: [0, 0, 1] }), handL: S([0.0, 0.8, 0.42], [0, 1, 0]) },
    { t: 2.0, hipsPos: [0, -0.45, 0], chest: [4, 0, 0], head: [-20, 0, 0] },
    { t: 2.6, ease: 'inout', hipsPos: [0, -0.05, 0], hips: [0, 0, 0], spine: [2, 0, 0], chest: [4, -8, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, handR: LS_REST, handL: null },
    ls(3.2),
  ]),
  /** Death: down on one knee, the sword planted before her, head bowed. Holds. */
  celDeath: new Clip('celDeath', [
    ls(0),
    { t: 0.5, ease: 'out', hipsPos: [0, -0.45, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [12, 0, 0], head: [10, 0, 0], footL: [0.14, 0.08, 0.34], footR: [-0.13, 0.12, -0.42], footPitchR: -60, handR: S([-0.08, 0.85, 0.5], [0, -1, 0.05], { up: [0, 0, 1] }), handL: S([0.02, 0.88, 0.5], [0, -1, 0.05]) },
    { t: 2.2, hipsPos: [0, -0.48, 0], chest: [22, 0, 0], head: [30, 0, 0] },
    { t: 3.0, hipsPos: [0, -0.5, 0], chest: [26, 0, 0], head: [34, 0, 0] },
  ]),
};

// ============================================================================ rapier (duellists, Corisande)

export const RAP_REST: HandKey = S([-0.22, 1.18, 0.34], [0.02, 0.22, 0.97], { up: [0, 1, 0], elbow: [-0.8, -0.4, -0.3] });
const RAP_BODY = { chest: [2, -22, 0] as V3, spine: [0, -10, 0] as V3, hips: [0, -14, 0] as V3, hipsPos: [0, -0.1, 0] as V3, fk: { upperArmL: [-110, 0, 50] as V3, forearmL: [-80, 0, 0] as V3 } };
const rap = (t: number): Key => ({ t, ease: 'inout', handR: RAP_REST, handL: null, ...RAP_BODY, footL: [0.14, 0.08, 0.22], footR: [-0.14, 0.08, -0.2] });
const LUNGE_BACK = S([-0.28, 1.28, 0.02], [0.02, 0.18, 0.98], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] });
const LUNGE_OUT = S([-0.05, 1.22, 1.0], [0.02, -0.05, 1], { up: [0, 1, 0] });

const rapier = {
  /** En garde lunge, 0.55 s tell (the blade draws back and the rear knee bends). */
  duelLunge: new Clip('duelLunge', [
    rap(0),
    { t: 0.52, ease: 'out', handR: LUNGE_BACK, hipsPos: [0, -0.18, -0.12], chest: [-4, -26, 0], footR: [-0.16, 0.08, -0.36] },
    { t: 0.64, ease: 'out', handR: LUNGE_OUT, hipsPos: [0, -0.32, 0.25], chest: [10, -10, 0], spine: [6, -4, 0], footL: [0.14, 0.08, 0.85], fk: { upperArmL: [-40, 0, 60], forearmL: [-10, 0, 0] } },
    { t: 1.0, handR: LUNGE_OUT, hipsPos: [0, -0.3, 0.22], footL: [0.14, 0.08, 0.8] },
    rap(1.4),
  ]),
  /** Two flicking cuts: wrist raised (0.5 s), cut down-left, cut back (told by the first). */
  duelFlick: new Clip('duelFlick', [
    rap(0),
    { t: 0.48, ease: 'out', handR: S([-0.34, 1.62, 0.2], [-0.4, 0.85, -0.3]), chest: [-6, -30, 0], head: [6, 14, 0] },
    { t: 0.6, ease: 'out', handR: S([0.2, 1.0, 0.55], [0.8, -0.4, 0.45]), chest: [8, 10, 0], hipsPos: [0, -0.14, 0.12], footL: [0.14, 0.08, 0.45] },
    { t: 0.8, ease: 'out', handR: S([0.3, 1.5, 0.3], [0.6, 0.75, -0.2]), chest: [0, 20, 0] },
    { t: 0.92, ease: 'out', handR: S([-0.4, 1.1, 0.5], [-0.85, -0.3, 0.4]), chest: [8, -24, 0], hipsPos: [0, -0.16, 0.14] },
    { t: 1.3, handR: S([-0.4, 1.1, 0.5], [-0.85, -0.3, 0.4]), chest: [6, -20, 0] },
    rap(1.65),
  ]),
  /**
   * The feint (a separate move, clearly telegraphed): a loud stamp, a false half-lunge that stops
   * short, a visible recoil and a glint on the point — then the real lunge.
   */
  duelFeint: new Clip('duelFeint', [
    rap(0),
    { t: 0.28, ease: 'out', footL: [0.14, 0.2, 0.3], hipsPos: [0, -0.06, 0] },
    { t: 0.36, ease: 'in', footL: [0.14, 0.08, 0.34], hipsPos: [0, -0.16, 0.05] },
    { t: 0.58, ease: 'out', handR: S([-0.14, 1.22, 0.62], [0.02, 0.05, 1], { up: [0, 1, 0] }), hipsPos: [0, -0.2, 0.1], chest: [4, -16, 0] },
    { t: 0.95, ease: 'inout', handR: LUNGE_BACK, hipsPos: [0, -0.18, -0.14], chest: [-6, -28, 0], footR: [-0.16, 0.08, -0.36] },
    { t: 1.3, handR: { ...LUNGE_BACK, p: [-0.3, 1.3, -0.02] }, hipsPos: [0, -0.2, -0.16] },
    { t: 1.42, ease: 'out', handR: LUNGE_OUT, hipsPos: [0, -0.32, 0.25], chest: [10, -10, 0], spine: [6, -4, 0], footL: [0.14, 0.08, 0.85], fk: { upperArmL: [-40, 0, 60], forearmL: [-10, 0, 0] } },
    { t: 1.8, handR: LUNGE_OUT, hipsPos: [0, -0.3, 0.22] },
    rap(2.2),
  ]),
  /** Quick three-thrust flurry (Corisande): first thrust 0.55 s tell, the rest told by the first. */
  bloodFlurry: new Clip('bloodFlurry', [
    rap(0),
    { t: 0.52, ease: 'out', handR: LUNGE_BACK, hipsPos: [0, -0.16, -0.1], chest: [-4, -26, 0] },
    { t: 0.62, ease: 'out', handR: LUNGE_OUT, hipsPos: [0, -0.24, 0.15], footL: [0.14, 0.08, 0.55] },
    { t: 0.8, ease: 'out', handR: LUNGE_BACK, hipsPos: [0, -0.2, 0.05] },
    { t: 0.9, ease: 'out', handR: { ...LUNGE_OUT, p: [-0.12, 1.4, 1.0] }, hipsPos: [0, -0.26, 0.25], footR: [-0.14, 0.08, 0.35] },
    { t: 1.08, ease: 'out', handR: LUNGE_BACK, hipsPos: [0, -0.2, 0.15] },
    { t: 1.18, ease: 'out', handR: { ...LUNGE_OUT, p: [0.02, 1.0, 1.0] }, hipsPos: [0, -0.3, 0.35], footL: [0.14, 0.08, 0.95] },
    { t: 1.6, handR: { ...LUNGE_OUT, p: [0.02, 1.0, 1.0] }, hipsPos: [0, -0.28, 0.32] },
    rap(2.0),
  ]),
  /** Backstep (evasion). */
  duelBackstep: new Clip('duelBackstep', [
    rap(0),
    { t: 0.2, ease: 'out', hipsPos: [0, -0.02, -0.1], footL: [0.14, 0.14, -0.1], chest: [-8, -22, 0] },
    { t: 0.45, hipsPos: [0, -0.12, 0], footL: [0.14, 0.08, 0.2] },
    rap(0.6),
  ]),
};

// ============================================================================ hedge shears (gardeners)

const SH_REST_R = S([-0.24, 0.98, 0.18], [0.25, 0.55, 0.8], { up: [0, 1, 0] });
const SH_REST_L = S([-0.1, 0.9, 0.12], [0.25, 0.55, 0.8]);
const SH: Key = { t: 0, handR: SH_REST_R, handL: SH_REST_L, chest: [10, -8, 0], spine: [6, 0, 0], hipsPos: [0, -0.08, 0] };
const sh = (t: number): Key => ({ ...SH, t, ease: 'inout' });
const shears = {
  gardSnip: new Clip('gardSnip', [
    sh(0),
    { t: 0.58, ease: 'out', handR: S([-0.5, 1.2, -0.1], [-0.9, 0.2, 0.4], { up: [0, 1, 0] }), handL: S([-0.4, 1.1, 0.0], [-0.9, 0.2, 0.4]), chest: [0, -42, 0], spine: [0, -16, 0], hipsPos: [0, -0.12, -0.05], footR: [-0.16, 0.08, -0.3] },
    { t: 0.7, ease: 'out', handR: S([0.2, 1.15, 0.5], [0.9, 0.1, 0.4], { up: [0, 1, 0] }), handL: S([0.08, 1.1, 0.42], [0.9, 0.1, 0.4]), chest: [8, 30, 0], spine: [4, 12, 0], hipsPos: [0, -0.18, 0.12], footL: [0.14, 0.08, 0.45] },
    { t: 1.1, handR: S([0.25, 1.1, 0.45], [0.9, 0.05, 0.35], { up: [0, 1, 0] }), chest: [6, 26, 0] },
    sh(1.5),
  ]),
  gardChop: new Clip('gardChop', [
    sh(0),
    { t: 0.9, ease: 'out', handR: S([-0.15, 1.9, -0.15], [0, 0.4, -0.9], { up: [1, 0, 0] }), handL: S([-0.02, 1.8, -0.1], [0, 0.4, -0.9]), chest: [-18, -4, 0], spine: [-8, 0, 0], head: [8, 0, 0] },
    { t: 1.02, ease: 'in', handR: S([-0.1, 1.45, 0.5], [0, 0.5, 0.85], { up: [1, 0, 0] }), handL: S([0.02, 1.38, 0.48], [0, 0.5, 0.85]), chest: [10, 0, 0], footL: [0.14, 0.08, 0.4] },
    { t: 1.12, ease: 'out', handR: S([-0.05, 0.6, 0.6], [0, -0.55, 0.83], { up: [1, 0, 0] }), handL: S([0.06, 0.62, 0.52], [0, -0.55, 0.83]), chest: [34, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.22, 0.1] },
    { t: 1.7, handR: S([-0.05, 0.6, 0.6], [0, -0.55, 0.83], { up: [1, 0, 0] }), chest: [30, 0, 0], hipsPos: [0, -0.2, 0.08] },
    sh(2.2),
  ]),
  /** The grab: shears thrown wide open (hand-icon tell, 0.75 s), then a lunge to close them on the victim. */
  gardGrab: new Clip('gardGrab', [
    sh(0),
    { t: 0.72, ease: 'out', handR: S([-0.55, 1.35, 0.1], [-0.6, 0.4, 0.7], { up: [0, 1, 0] }), handL: S([0.45, 1.35, 0.1], [0.6, 0.4, 0.7]), chest: [-10, 0, 0], spine: [-4, 0, 0], hipsPos: [0, -0.06, -0.12], head: [6, 0, 0], footR: [-0.16, 0.08, -0.3] },
    { t: 0.9, ease: 'out', handR: S([-0.2, 1.25, 0.75], [0.1, 0.1, 1], { up: [0, 1, 0] }), handL: S([0.1, 1.25, 0.72], [-0.1, 0.1, 1]), chest: [14, 0, 0], spine: [8, 0, 0], hipsPos: [0, -0.22, 0.25], footL: [0.14, 0.08, 0.7] },
    { t: 1.4, handR: S([-0.18, 1.2, 0.7], [0.1, 0.05, 1], { up: [0, 1, 0] }), chest: [12, 0, 0], hipsPos: [0, -0.2, 0.22] },
    sh(1.9),
  ]),
  /** Holding a caught victim: two slow snips at the chest. */
  gardCut: new Clip('gardCut', [
    { t: 0, handR: S([-0.2, 1.25, 0.72], [0.1, 0.1, 1], { up: [0, 1, 0] }), handL: S([0.1, 1.25, 0.7], [-0.1, 0.1, 1]), chest: [14, 0, 0], hipsPos: [0, -0.2, 0.2] },
    { t: 0.45, ease: 'out', handR: S([-0.45, 1.3, 0.5], [-0.4, 0.2, 0.9], { up: [0, 1, 0] }), handL: S([0.35, 1.3, 0.5], [0.4, 0.2, 0.9]), chest: [8, 0, 0] },
    { t: 0.6, ease: 'in', handR: S([-0.15, 1.28, 0.7], [0.15, 0.1, 1], { up: [0, 1, 0] }), handL: S([0.05, 1.28, 0.68], [-0.15, 0.1, 1]), chest: [16, 0, 0] },
    { t: 1.05, ease: 'out', handR: S([-0.45, 1.3, 0.5], [-0.4, 0.2, 0.9], { up: [0, 1, 0] }), handL: S([0.35, 1.3, 0.5], [0.4, 0.2, 0.9]), chest: [8, 0, 0] },
    { t: 1.2, ease: 'in', handR: S([-0.15, 1.28, 0.7], [0.15, 0.1, 1], { up: [0, 1, 0] }), handL: S([0.05, 1.28, 0.68], [-0.15, 0.1, 1]), chest: [16, 0, 0] },
    sh(1.8),
  ]),
};

// ============================================================================ courtier (caster)

const CT: Key = { t: 0, handR: null, handL: null, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.02, 0], fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-20, 0, -12], forearmR: [-40, 0, 0] } };
const ct = (t: number): Key => ({ ...CT, t, ease: 'inout' });
const courtier = {
  courtIdle: new Clip('courtIdle', [ct(0), { t: 1.5, chest: [2, 4, 0] }, ct(3)], { loop: true, duration: 3 }),
  /** Gilt bolt: the right hand drawn up to the mask (0.8 s tell, the hand glows), flung forward. */
  courtBolt: new Clip('courtBolt', [
    ct(0),
    { t: 0.75, ease: 'out', fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-150, 0, -30], forearmR: [-100, 0, 0] }, chest: [-6, -24, 0], spine: [-2, -10, 0], head: [0, 10, 0], hipsPos: [0, -0.04, -0.06] },
    { t: 0.86, ease: 'out', fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-90, 0, -5], forearmR: [-5, 0, 0] }, chest: [10, 16, 0], spine: [4, 6, 0], hipsPos: [0, -0.1, 0.1], footL: [0.14, 0.08, 0.4] },
    { t: 1.2, fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-85, 0, -5], forearmR: [-10, 0, 0] }, chest: [8, 12, 0] },
    ct(1.6),
  ]),
  /** Volley: both hands raised (1.1 s tell), three bolts flung in a fan. */
  courtVolley: new Clip('courtVolley', [
    ct(0),
    { t: 1.05, ease: 'out', fk: { upperArmL: [-160, 0, 30], forearmL: [-40, 0, 0], upperArmR: [-160, 0, -30], forearmR: [-40, 0, 0] }, chest: [-14, 0, 0], head: [10, 0, 0] },
    { t: 1.2, ease: 'out', fk: { upperArmL: [-90, 0, 20], forearmL: [-10, 0, 0], upperArmR: [-90, 0, -20], forearmR: [-10, 0, 0] }, chest: [8, 0, 0], hipsPos: [0, -0.08, 0.08] },
    { t: 1.6, fk: { upperArmL: [-85, 0, 25], forearmL: [-10, 0, 0], upperArmR: [-85, 0, -25], forearmR: [-10, 0, 0] } },
    ct(2.0),
  ]),
  /** Fan sweep: a turn and a flat-handed sweep that throws the victim back (0.55 s tell). */
  courtFan: new Clip('courtFan', [
    ct(0),
    { t: 0.52, ease: 'out', fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-80, -60, -60], forearmR: [-20, 0, 0] }, chest: [0, -45, 0], spine: [0, -16, 0], hipsPos: [0, -0.1, 0] },
    { t: 0.64, ease: 'out', fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-85, 70, -20], forearmR: [-10, 0, 0] }, chest: [0, 40, 0], spine: [0, 14, 0], hipsPos: [0, -0.1, 0.08] },
    { t: 1.0, fk: { upperArmL: [-30, 0, 20], forearmL: [-80, 0, 0], upperArmR: [-80, 60, -20], forearmR: [-10, 0, 0] }, chest: [0, 34, 0] },
    ct(1.3),
  ]),
};

// ============================================================================ ghost phasing, page, greatsword (Casimir)

const ghost = {
  ghostFade: new Clip('ghostFade', [ls(0), { t: 0.6, ease: 'in', hipsPos: [0, -0.3, 0], chest: [20, 0, 0], head: [20, 0, 0], handR: S([-0.2, 0.7, 0.3], [0, -1, 0.2]) }]),
  ghostAppear: new Clip('ghostAppear', [
    { t: 0, hipsPos: [0, -0.3, 0], chest: [20, 0, 0], head: [20, 0, 0], handR: S([-0.2, 0.7, 0.3], [0, -1, 0.2]), handL: null },
    { t: 0.5, ease: 'out', hipsPos: [0, -0.05, 0], chest: [4, -8, 0], head: [0, 0, 0], handR: LS_REST },
  ]),
};

const npc = {
  /** The page kneeling, hands bound in front, head bowed (idle loop). */
  hhKneel: new Clip('hhKneel', [
    { t: 0, hipsPos: [0, -0.45, 0], hips: [6, 0, 0], spine: [12, 0, 0], chest: [16, 0, 0], neck: [10, 0, 0], head: [22, 0, 0], footL: [0.14, 0.08, 0.3], footR: [-0.13, 0.12, -0.42], footPitchR: -60, handL: null, handR: null, fk: { upperArmL: [-35, 0, 18], forearmL: [-80, 0, 0], upperArmR: [-35, 0, -18], forearmR: [-80, 0, 0] } },
    { t: 2.2, head: [26, -8, 0], chest: [18, 0, 0] },
    { t: 4.4, head: [22, 0, 0], chest: [16, 0, 0] },
  ], { loop: true, duration: 4.4 }),
  /** Standing, arms folded tight (after he is freed). */
  hhStand: new Clip('hhStand', [
    { t: 0, handR: null, handL: null, head: [6, 0, 0], chest: [4, 0, 0], fk: { upperArmL: [-30, 0, -20], forearmL: [-100, 0, 0], upperArmR: [-30, 0, 20], forearmR: [-100, 0, 0] } },
  ], { loop: true, duration: 1 }),
};

const K = 1.1; // Casimir's rig height
const v = (x: number, y: number, z: number): V3 => [x * K, y * K, z * K];
export const GS_REST: HandKey = S(v(-0.22, 1.05, 0.25), [0.05, 0.75, 0.66], { up: [0, -0.66, 0.75] });
const GS_L = (h: HandKey): HandKey => twoHand(h);
const GS: Key = { t: 0, handR: GS_REST, handL: GS_L(GS_REST), chest: [4, -10, 0], spine: [2, 0, 0], hipsPos: [0, -0.06, 0] };
const gs = (t: number): Key => ({ ...GS, t, ease: 'inout' });
const great = {
  /** Wide sweep (0.8 s tell: sword hauled back over the right hip). */
  lawSweep: new Clip('lawSweep', [
    gs(0),
    { t: 0.78, ease: 'out', handR: S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5]), handL: GS_L(S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5])), chest: [0, -50, 0], spine: [0, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.14, -0.05], footR: v(-0.18, 0.08, -0.3) },
    { t: 0.92, ease: 'out', handR: S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86]), handL: GS_L(S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86])), chest: [6, 0, 0], spine: [4, 0, 0], hips: [0, 0, 0], footL: v(0.15, 0.08, 0.4) },
    { t: 1.06, ease: 'out', handR: S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5]), handL: GS_L(S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5])), chest: [4, 50, 0], spine: [2, 20, 0], hips: [0, 14, 0], hipsPos: [0, -0.18, 0.1] },
    { t: 1.6, handR: S(v(0.55, 1.05, 0.1), [0.85, -0.1, -0.5]), chest: [4, 44, 0] },
    gs(2.1),
  ]),
  /** Decree: a two-handed overhead (1.0 s tell) that cracks the flags. */
  lawOver: new Clip('lawOver', [
    gs(0),
    { t: 1.0, ease: 'out', handR: S(v(-0.1, 2.0, -0.1), [0.02, 0.3, -0.95]), handL: GS_L(S(v(-0.1, 2.0, -0.1), [0.02, 0.3, -0.95])), chest: [-18, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0] },
    { t: 1.12, ease: 'in', handR: S(v(-0.08, 1.5, 0.6), [0, 0.6, 0.8]), handL: GS_L(S(v(-0.08, 1.5, 0.6), [0, 0.6, 0.8])), chest: [10, -4, 0], footL: v(0.14, 0.08, 0.42) },
    { t: 1.22, ease: 'out', handR: S(v(-0.05, 0.55, 0.7), [0, -0.5, 0.86]), handL: GS_L(S(v(-0.05, 0.55, 0.7), [0, -0.5, 0.86])), chest: [34, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.26, 0.12], head: [-14, 0, 0] },
    { t: 1.9, handR: S(v(-0.05, 0.55, 0.7), [0, -0.5, 0.86]), chest: [30, -2, 0], hipsPos: [0, -0.24, 0.1] },
    gs(2.5),
  ]),
  /** Thrust (0.8 s tell). */
  lawThrust: new Clip('lawThrust', [
    gs(0),
    { t: 0.78, ease: 'out', handR: S(v(-0.3, 1.25, -0.35), [0, 0.03, 1], { up: [0, 1, 0] }), handL: GS_L(S(v(-0.3, 1.25, -0.35), [0, 0.03, 1])), chest: [0, -34, 0], spine: [0, -14, 0], hipsPos: [0, -0.16, -0.1], footR: v(-0.16, 0.08, -0.36) },
    { t: 0.9, ease: 'out', handR: S(v(-0.06, 1.2, 0.95), [0.02, -0.03, 1], { up: [0, 1, 0] }), handL: GS_L(S(v(-0.06, 1.2, 0.95), [0.02, -0.03, 1])), chest: [12, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.24, 0.16], footL: v(0.14, 0.08, 0.62) },
    { t: 1.35, handR: S(v(-0.06, 1.2, 0.95), [0.02, -0.03, 1], { up: [0, 1, 0] }), chest: [12, 6, 0], hipsPos: [0, -0.22, 0.14] },
    gs(1.85),
  ]),
  /** Enraged: two full sweeps turning on the heel (the first told like lawSweep). */
  lawWhirl: new Clip('lawWhirl', [
    gs(0),
    { t: 0.8, ease: 'out', handR: S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5]), handL: GS_L(S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5])), chest: [0, -50, 0], spine: [0, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.14, -0.05] },
    { t: 0.95, ease: 'out', handR: S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86]), handL: GS_L(S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86])), chest: [6, 0, 0], hips: [0, 0, 0] },
    { t: 1.1, ease: 'out', handR: S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5]), handL: GS_L(S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5])), chest: [4, 50, 0], spine: [2, 20, 0], hips: [0, 14, 0] },
    { t: 1.45, ease: 'inout', handR: S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5]), handL: GS_L(S(v(-0.55, 1.2, -0.3), [-0.8, 0.3, -0.5])), chest: [0, -50, 0], spine: [0, -20, 0], hips: [0, -14, 0] },
    { t: 1.6, ease: 'out', handR: S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86]), handL: GS_L(S(v(0.1, 1.15, 0.7), [0.5, 0.05, 0.86])), chest: [6, 0, 0], hips: [0, 0, 0] },
    { t: 1.75, ease: 'out', handR: S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5]), handL: GS_L(S(v(0.6, 1.1, 0.1), [0.85, 0.0, -0.5])), chest: [4, 50, 0], spine: [2, 20, 0], hips: [0, 14, 0] },
    { t: 2.4, handR: S(v(0.55, 1.05, 0.1), [0.85, -0.1, -0.5]), chest: [4, 44, 0] },
    gs(2.9),
  ]),
  /** Grief (enrage transition): the survivor kneels by the fallen claim, then rises. */
  heirGrief: new Clip('heirGrief', [
    gs(0),
    { t: 0.5, ease: 'out', hipsPos: [0, -0.45, 0], chest: [20, 0, 0], head: [24, 0, 0], footL: [0.14, 0.08, 0.3], footR: [-0.13, 0.12, -0.42], footPitchR: -60, handR: S([-0.15, 0.55, 0.45], [0, -1, 0.1]), handL: null },
    { t: 1.6, hipsPos: [0, -0.45, 0], chest: [-10, 0, 0], head: [-24, 0, 0] },
    { t: 2.2, ease: 'inout', hipsPos: [0, -0.06, 0], chest: [4, -10, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0 },
    gs(2.5),
  ]),
};

export const householdClips: Record<string, Clip> = {
  ...longswordClips('ret'),
  ...longswordClips('cel'),
  ...cel, ...rapier, ...shears, ...courtier, ...ghost, ...npc, ...great,
};
