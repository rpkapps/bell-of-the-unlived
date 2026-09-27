/**
 * Cathedral animation clips (IK keyframes, root space: +Z forward, -X = the character's right).
 * Every attack has a readable windup (≥ 0.5 s for openers; follow-ups are told by the hit before).
 * Positions are authored for the 1.8 m reference and scaled by each rig's height factor K.
 *
 *  pilgrims (staff) · flagellants (scourge) · healer-priests (censer + hand bell) · mourner giants
 *  (funeral bell-maul, grab) · procession bearers (pole) · the cantor · The Procession (reliquary
 *  bearer, processional pole) · Saint Vessaline (crozier; her own and borrowed styles) · the
 *  player's knockdown / held reactions.
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';

const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
const sc = (k: number) => (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
/** Off-hand on the same shaft, `off` metres along the item's +Y from the main grip (negative = below). */
const two = (p: V3, dir: V3, off: number, elbow: V3 = [0.8, -0.4, -0.4]): HandKey => {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  return { p: [p[0] + (dir[0] / l) * off, p[1] + (dir[1] / l) * off, p[2] + (dir[2] / l) * off], dir, elbow };
};
const legs = (tl: number, sl: number, tr = tl, sr = sl) => ({ thighL: [tl, 0, 4] as V3, shinL: [sl, 0, 0] as V3, thighR: [tr, 0, -4] as V3, shinR: [sr, 0, 0] as V3 });
const KNEEL = (k: number): Omit<Key, 't'> => ({
  hipsPos: [0, -0.45 * k, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [18, 0, 0], neck: [10, 0, 0], head: [18, 0, 0],
  footL: [0.14 * k, 0.08, 0.34 * k], footR: [-0.13 * k, 0.12, -0.42 * k], footPitchR: -60,
});
const UPRIGHT = (k: number): Omit<Key, 't'> => ({
  hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  footL: [0.12 * k, 0.08, 0.02], footR: [-0.12 * k, 0.08, -0.03], footPitchR: 0,
});

// ====================================================================== pilgrim (staff), K 0.95
const KP = 0.95, p = sc(KP);
export const PIL_STAFF: HandKey = S(p(-0.25, 0.98, 0.2), [0.03, 0.96, 0.26], { up: [0, -0.26, 0.96], elbow: [-0.6, -0.5, -0.6] });
const PIL: Key = { t: 0, handR: PIL_STAFF, handL: null, chest: [16, 0, 0], spine: [8, 0, 0], neck: [6, 0, 0], head: [-8, 0, 0], hipsPos: [0, -0.06, 0] };
const pil = (t: number): Key => ({ ...PIL, t, ease: 'inout' });
const PIL_KNEEL_HANDS = { upperArmL: [-38, 0, -14] as V3, forearmL: [-104, 0, 0] as V3 };

const pilgrimClips = {
  /** Two-handed overhead bash with the walking staff (0.6 s tell: staff hauled back over the head). */
  cathPilStrike: new Clip('cathPilStrike', [
    pil(0),
    { t: 0.6, ease: 'out', handR: S(p(-0.12, 1.72, -0.05), [0.02, 0.42, -0.9], { elbow: [-0.9, 0.2, -0.2] }), handL: two(p(-0.12, 1.72, -0.05), [0.02, 0.42, -0.9], -0.28), chest: [-12, -4, 0], spine: [-6, 0, 0], head: [4, 0, 0], hipsPos: [0, 0, -0.05] },
    { t: 0.68, ease: 'in', handR: S(p(-0.08, 1.35, 0.5), [0, 0.5, 0.86]), handL: two(p(-0.08, 1.35, 0.5), [0, 0.5, 0.86], -0.28), chest: [12, -2, 0], spine: [6, 0, 0], footL: p(0.13, 0.08, 0.34) },
    { t: 0.76, ease: 'out', handR: S(p(-0.06, 0.72, 0.62), [0, -0.52, 0.85]), handL: two(p(-0.06, 0.72, 0.62), [0, -0.52, 0.85], -0.28), chest: [34, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.18, 0.1], head: [-14, 0, 0] },
    { t: 1.1, handR: S(p(-0.07, 0.74, 0.6), [0, -0.5, 0.86]), handL: two(p(-0.07, 0.74, 0.6), [0, -0.5, 0.86], -0.28), chest: [30, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.17, 0.09] },
    { ...pil(1.55), handL: null },
  ]),
  /** Staff jab (0.55 s tell: staff drawn back to the hip). */
  cathPilJab: new Clip('cathPilJab', [
    pil(0),
    { t: 0.55, ease: 'out', handR: S(p(-0.3, 1.05, -0.28), [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: two(p(-0.3, 1.05, -0.28), [0, 0.05, 1], 0.3), chest: [4, -30, 0], spine: [2, -12, 0], hipsPos: [0, -0.12, -0.06], footR: p(-0.15, 0.08, -0.3) },
    { t: 0.66, ease: 'out', handR: S(p(-0.08, 1.12, 0.66), [0, -0.04, 1], { up: [0, 1, 0] }), handL: two(p(-0.08, 1.12, 0.66), [0, -0.04, 1], 0.3), chest: [14, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.16, 0.12], footL: p(0.13, 0.08, 0.48) },
    { t: 0.95, handR: S(p(-0.08, 1.1, 0.62), [0, -0.05, 1], { up: [0, 1, 0] }), handL: two(p(-0.08, 1.1, 0.62), [0, -0.05, 1], 0.3), chest: [14, 6, 0], hipsPos: [0, -0.15, 0.1] },
    { ...pil(1.35), handL: null },
  ]),
  /** Pleading lunge: the free hand clutches at the Returned (weak shove, 0.6 s tell). */
  cathPilClutch: new Clip('cathPilClutch', [
    pil(0),
    { t: 0.6, ease: 'out', chest: [4, 20, 0], spine: [0, 8, 0], hipsPos: [0, -0.1, -0.08], head: [-10, -10, 0], fk: { upperArmL: [-60, 0, 50], forearmL: [-80, 0, 0] } },
    { t: 0.72, ease: 'out', chest: [22, -6, 0], spine: [10, -2, 0], hipsPos: [0, -0.2, 0.16], head: [-18, 0, 0], footL: p(0.13, 0.08, 0.55), fk: { upperArmL: [-95, 0, -8], forearmL: [-8, 0, 0] } },
    { t: 1.0, chest: [24, -6, 0], hipsPos: [0, -0.2, 0.14], fk: { upperArmL: [-90, 0, -6], forearmL: [-12, 0, 0] } },
    { ...pil(1.4), fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] } },
  ]),
  /** Kneeling before the Roll, hands clasped on the staff (idle loop). */
  cathPilKneel: new Clip('cathPilKneel', [
    { t: 0, ...KNEEL(KP), handR: S(p(-0.06, 0.9, 0.3), [0.05, 0.98, 0.15], { up: [0, -0.15, 1], elbow: [-0.6, -0.6, -0.4] }), handL: null, fk: PIL_KNEEL_HANDS, head: [22, 0, 0] },
    { t: 2.2, head: [26, 4, 0], chest: [20, 0, 0] },
    { t: 4.4, head: [22, 0, 0], chest: [18, 0, 0] },
  ], { loop: true, duration: 4.4 }),
  /** Rising from prayer. */
  cathPilRise: new Clip('cathPilRise', [
    { t: 0, ...KNEEL(KP), handR: S(p(-0.06, 0.9, 0.3), [0.05, 0.98, 0.15]), handL: null, fk: PIL_KNEEL_HANDS },
    { ...UPRIGHT(KP), ...PIL, t: 0.8, ease: 'inout', fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] } },
  ]),
};

// ====================================================================== flagellant (scourge), K 1.0
export const FLG_REST: HandKey = { p: [-0.26, 0.96, 0.22], dir: [-0.05, -0.96, 0.25], up: [0, 0.25, 0.96], elbow: [-0.7, -0.4, -0.6] };
const FLG: Key = { t: 0, handR: FLG_REST, handL: null, chest: [20, -8, 0], spine: [10, 0, 0], neck: [4, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.1, 0], fk: { upperArmL: [-20, 0, 20], forearmL: [-40, 0, 0] } };
const flg = (t: number): Key => ({ ...FLG, t, ease: 'inout' });
const LASH_HI: HandKey = S([-0.38, 1.66, -0.18], [-0.25, 0.55, -0.8], { elbow: [-0.9, 0.1, -0.2] });
const LASH_MID: HandKey = S([-0.06, 1.3, 0.55], [0.3, 0.35, 0.89]);
const LASH_LO: HandKey = S([0.3, 0.72, 0.38], [0.72, -0.62, 0.3]);
const LASH_BACK_HI: HandKey = S([0.34, 1.2, 0.05], [0.8, 0.45, -0.4], { elbow: [-0.2, -0.8, -0.4] });
const LASH_BACK_MID: HandKey = S([0, 1.25, 0.6], [-0.25, 0.3, 0.92]);
const LASH_BACK_LO: HandKey = S([-0.44, 1.0, 0.3], [-0.9, -0.2, 0.3]);

const flagellantClips = {
  /** Diagonal lash from over the right shoulder (0.52 s tell). */
  cathFlgLash: new Clip('cathFlgLash', [
    flg(0),
    { t: 0.52, ease: 'out', handR: LASH_HI, chest: [-4, -36, 0], spine: [-2, -14, 0], hips: [0, -10, 0], head: [0, 16, 0] },
    { t: 0.62, ease: 'in', handR: LASH_MID, chest: [16, -2, 0], spine: [8, 0, 0], hips: [0, 0, 0], head: [-10, 0, 0], footL: [0.13, 0.08, 0.36] },
    { t: 0.72, ease: 'out', handR: LASH_LO, chest: [28, 30, 0], spine: [12, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.2, 0.1] },
    { t: 1.0, handR: LASH_LO, chest: [26, 26, 0], spine: [12, 12, 0], hipsPos: [0, -0.19, 0.09] },
    flg(1.35),
  ]),
  /** Frenzy: three lashes in one breath — cross, backhand, overhead (told by the first). */
  cathFlgFrenzy: new Clip('cathFlgFrenzy', [
    flg(0),
    { t: 0.5, ease: 'out', handR: LASH_HI, chest: [-4, -36, 0], spine: [-2, -14, 0], hips: [0, -10, 0] },
    { t: 0.58, ease: 'in', handR: LASH_MID, chest: [16, -2, 0], spine: [8, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.34] },
    { t: 0.68, ease: 'out', handR: LASH_LO, chest: [28, 30, 0], spine: [12, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.2, 0.1] },
    { t: 0.86, ease: 'out', handR: LASH_BACK_HI, chest: [10, 34, 0], spine: [4, 14, 0] },
    { t: 0.94, ease: 'in', handR: LASH_BACK_MID, chest: [12, 0, 0], spine: [6, 0, 0], footR: [-0.13, 0.08, 0.3] },
    { t: 1.02, ease: 'out', handR: LASH_BACK_LO, chest: [18, -30, 0], spine: [8, -12, 0], hipsPos: [0, -0.16, 0.08] },
    { t: 1.22, ease: 'out', handR: S([-0.12, 1.95, 0], [0, 0.5, -0.86], { elbow: [-0.9, 0.2, -0.2] }), chest: [-18, -4, 0], spine: [-8, 0, 0], head: [8, 0, 0], hipsPos: [0, 0.02, 0.05] },
    { t: 1.32, ease: 'in', handR: S([-0.06, 1.35, 0.62], [0, 0.4, 0.92]), chest: [14, 0, 0], spine: [8, 0, 0], footL: [0.13, 0.08, 0.5] },
    { t: 1.42, ease: 'out', handR: S([-0.04, 0.55, 0.6], [0, -0.7, 0.72]), chest: [42, 0, 0], spine: [20, 0, 0], hipsPos: [0, -0.28, 0.16], head: [-24, 0, 0] },
    // exposed: panting, bent double
    { t: 1.85, handR: S([-0.05, 0.56, 0.58], [0, -0.72, 0.7]), chest: [40, 0, 0], spine: [20, 0, 0], hipsPos: [0, -0.27, 0.14], head: [-10, 0, 0] },
    flg(2.25),
  ]),
  /** Self-scourging: two lashes across his own back, then a roar with arms thrown wide (buff). */
  cathFlgScourge: new Clip('cathFlgScourge', [
    flg(0),
    { t: 0.3, ease: 'out', handR: S([-0.3, 1.45, 0.25], [0.1, 0.9, 0.2], { elbow: [-0.8, -0.2, 0.2] }), chest: [10, -20, 0], head: [-6, 0, 0] },
    { t: 0.45, ease: 'in', handR: S([0.1, 1.55, -0.05], [0.4, -0.3, -0.85], { elbow: [-0.6, 0.6, 0.3] }), chest: [26, 14, 0], spine: [10, 6, 0], head: [16, 0, 0] },
    { t: 0.75, ease: 'out', handR: S([-0.3, 1.45, 0.25], [0.1, 0.9, 0.2], { elbow: [-0.8, -0.2, 0.2] }), chest: [10, -20, 0], head: [-6, 0, 0] },
    { t: 0.9, ease: 'in', handR: S([0.1, 1.55, -0.05], [0.4, -0.3, -0.85], { elbow: [-0.6, 0.6, 0.3] }), chest: [28, 14, 0], spine: [12, 6, 0], head: [18, 0, 0] },
    { t: 1.3, ease: 'out', handR: S([-0.55, 1.2, 0.05], [-0.8, -0.5, 0.2], { elbow: [-0.6, -0.2, -0.6] }), chest: [-24, 0, 0], spine: [-12, 0, 0], head: [-34, 0, 0], hipsPos: [0, -0.04, -0.04], fk: { upperArmL: [-20, 0, 80], forearmL: [-20, 0, 0] } },
    { t: 1.6, handR: S([-0.55, 1.22, 0.05], [-0.8, -0.5, 0.2]), chest: [-26, 0, 0], head: [-36, 0, 0] },
    flg(2.0),
  ]),
  /** Leaping overhead lash (0.72 s crouch tell), long landing recovery. */
  cathFlgLeap: new Clip('cathFlgLeap', [
    flg(0),
    { t: 0.72, ease: 'out', handR: S([-0.12, 1.95, -0.1], [0, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), chest: [-10, -4, 0], spine: [-4, 0, 0], hipsPos: [0, -0.32, -0.08], footL: [0.14, 0.08, 0.22], footR: [-0.14, 0.08, -0.25], head: [-6, 0, 0] },
    { t: 0.86, ease: 'out', handR: S([-0.1, 2.05, 0.2], [0, 0.6, -0.8], { elbow: [-0.9, 0.2, -0.2] }), chest: [-16, 0, 0], hipsPos: [0, 0.35, 0.05], footL: [0.14, 0.45, 0.1], footR: [-0.14, 0.4, -0.15] },
    { t: 0.97, ease: 'in', handR: S([-0.05, 0.55, 0.65], [0, -0.7, 0.72]), chest: [40, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.34, 0.14], footL: [0.14, 0.08, 0.4], footR: [-0.14, 0.08, -0.2], head: [-22, 0, 0] },
    { t: 1.5, handR: S([-0.05, 0.56, 0.62], [0, -0.7, 0.72]), chest: [38, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.32, 0.12] },
    flg(1.9),
  ]),
};

// ====================================================================== healer-priest (censer R, hand bell L), K 1.06
const KH = 1.06, h = sc(KH);
export const HLR_CENSER: HandKey = S(h(-0.24, 0.96, 0.18), [0, -0.98, 0.18], { up: [0, 0.18, 0.98], elbow: [-0.7, -0.4, -0.6] });
export const HLR_BELL: HandKey = S(h(0.2, 1.02, 0.28), [0.05, -0.95, 0.3], { up: [0, 0.3, 0.95], elbow: [0.7, -0.5, -0.4] });
const HLR: Key = { t: 0, handR: HLR_CENSER, handL: HLR_BELL, chest: [4, 0, 0], spine: [2, 0, 0], head: [4, 0, 0], hipsPos: [0, -0.03, 0] };
const hlr = (t: number): Key => ({ ...HLR, t, ease: 'inout' });
const BELL_HIGH = (sway: number): HandKey => S(h(0.12 + sway, 1.95, 0.22), [0.05 + sway, -0.2, 0.98], { up: [0, 0.98, 0.2], elbow: [0.8, -0.2, -0.3] });

const healerClips = {
  /** Censer swung in a flat arc (0.58 s tell: censer hauled back to the right). */
  cathHlrSwing: new Clip('cathHlrSwing', [
    hlr(0),
    { t: 0.58, ease: 'out', handR: S(h(-0.48, 1.3, -0.2), [-0.8, 0.3, -0.5], { elbow: [-0.9, -0.2, -0.1] }), chest: [4, -44, 0], spine: [2, -18, 0], hips: [0, -12, 0], head: [0, 26, 0] },
    { t: 0.7, ease: 'in', handR: S(h(-0.04, 1.15, 0.62), [0.25, 0.05, 0.97]), chest: [8, -4, 0], spine: [4, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: h(0.13, 0.08, 0.34) },
    { t: 0.8, ease: 'out', handR: S(h(0.42, 1.05, 0.3), [0.92, -0.1, -0.3]), chest: [8, 40, 0], spine: [4, 16, 0], hips: [0, 10, 0], hipsPos: [0, -0.12, 0.06] },
    { t: 1.05, handR: S(h(0.4, 1.02, 0.25), [0.9, -0.2, -0.3]), chest: [8, 36, 0], spine: [4, 14, 0] },
    hlr(1.45),
  ]),
  /** The rite: the bell raised high and rung while the censer swings (heal lands at 1.9 s). */
  cathHlrRite: new Clip('cathHlrRite', [
    hlr(0),
    { t: 0.45, ease: 'out', handL: BELL_HIGH(0), handR: S(h(-0.3, 1.05, 0.3), [-0.3, -0.9, 0.3]), chest: [-12, 0, 0], spine: [-6, 0, 0], head: [-26, 0, 0], hipsPos: [0, -0.02, -0.02] },
    { t: 0.7, handL: BELL_HIGH(0.06), handR: S(h(-0.1, 1.0, 0.35), [0.4, -0.85, 0.3]) },
    { t: 0.95, handL: BELL_HIGH(-0.06), handR: S(h(-0.35, 1.0, 0.25), [-0.4, -0.85, 0.3]) },
    { t: 1.2, handL: BELL_HIGH(0.06), handR: S(h(-0.1, 1.0, 0.35), [0.4, -0.85, 0.3]) },
    { t: 1.45, handL: BELL_HIGH(-0.06), handR: S(h(-0.35, 1.0, 0.25), [-0.4, -0.85, 0.3]), head: [-30, 0, 0] },
    { t: 1.7, ease: 'out', handL: S(h(0.1, 2.05, 0.3), [0.02, 0.1, 0.99], { up: [0, 0.99, -0.1], elbow: [0.8, -0.2, -0.3] }), chest: [-18, 0, 0], spine: [-8, 0, 0] },
    { t: 1.9, ease: 'in', handL: S(h(0.16, 1.5, 0.5), [0.05, -0.6, 0.8], { up: [0, 0.8, 0.6] }), chest: [10, 0, 0], spine: [4, 0, 0], head: [6, 0, 0] },
    { t: 2.1, handL: S(h(0.16, 1.45, 0.48), [0.05, -0.65, 0.76]), chest: [10, 0, 0] },
    hlr(2.5),
  ]),
  /** A hard toll of the hand bell thrust forward: a ring of force that pushes back (0.8 s tell). */
  cathHlrToll: new Clip('cathHlrToll', [
    hlr(0),
    { t: 0.8, ease: 'out', handL: S(h(0.18, 1.35, 0.05), [0.05, 0.3, -0.95], { elbow: [0.9, -0.2, -0.3] }), chest: [-6, 24, 0], spine: [-2, 10, 0], hipsPos: [0, -0.06, -0.06], head: [0, -10, 0] },
    { t: 0.92, ease: 'out', handL: S(h(0.06, 1.35, 0.66), [0, -0.2, 0.98], { up: [0, 0.98, 0.2] }), chest: [14, -8, 0], spine: [6, -2, 0], hipsPos: [0, -0.14, 0.12], footL: h(0.13, 0.08, 0.44) },
    { t: 1.25, handL: S(h(0.06, 1.34, 0.62), [0, -0.25, 0.97]), chest: [12, -6, 0], hipsPos: [0, -0.13, 0.1] },
    hlr(1.65),
  ]),
};

// ====================================================================== mourner giant (bell-maul), K 1.45
const KG = 1.45, g = sc(KG);
export const MG_REST: HandKey = S(g(-0.22, 1.1, 0.22), [-0.1, 0.72, -0.68], { up: [0, -0.68, -0.72], elbow: [-0.9, -0.4, 0.1] });
const MG: Key = { t: 0, handR: MG_REST, handL: null, chest: [14, -6, 0], spine: [8, 0, 0], neck: [10, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.1, 0], fk: { upperArmL: [-10, 0, 18], forearmL: [-30, 0, 0] } };
const mg = (t: number): Key => ({ ...MG, t, ease: 'inout' });
const GRAB_HAND = (x: number, y: number, z: number): HandKey => S(g(x, y, z), [0, 0.2, 1], { up: [1, 0, 0], elbow: [0.9, -0.3, -0.2] });

const giantClips = {
  /** Two-handed overhead slam; the bell tolls on impact (1.05 s tell). */
  cathMgSlam: new Clip('cathMgSlam', [
    mg(0),
    { t: 1.05, ease: 'out', handR: S(g(-0.08, 2.0, -0.1), [0, 0.35, -0.94], { elbow: [-0.9, 0.2, -0.2] }), handL: two(g(-0.08, 2.0, -0.1), [0, 0.35, -0.94], -0.35), chest: [-18, -4, 0], spine: [-10, -2, 0], head: [6, 0, 0], hipsPos: [0, 0.02, -0.08], fk: {} },
    { t: 1.17, ease: 'in', handR: S(g(-0.06, 1.25, 0.7), [0, 0.2, 0.98]), handL: two(g(-0.06, 1.25, 0.7), [0, 0.2, 0.98], -0.35), chest: [16, -2, 0], spine: [8, 0, 0], footL: g(0.15, 0.07, 0.42) },
    { t: 1.26, ease: 'out', handR: S(g(-0.04, 0.45, 0.85), [0, -0.7, 0.72]), handL: two(g(-0.04, 0.45, 0.85), [0, -0.7, 0.72], -0.35), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.3 * KG, 0.12], head: [-20, 0, 0] },
    { t: 2.05, handR: S(g(-0.05, 0.46, 0.82), [0, -0.72, 0.7]), handL: two(g(-0.05, 0.46, 0.82), [0, -0.72, 0.7], -0.35), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.28 * KG, 0.1] },
    { ...mg(2.6), handL: null },
  ]),
  /** Low horizontal sweep right → left (0.9 s tell). */
  cathMgSweep: new Clip('cathMgSweep', [
    mg(0),
    { t: 0.9, ease: 'out', handR: S(g(-0.55, 0.95, -0.2), [-0.8, 0.1, -0.6], { elbow: [-0.9, -0.2, -0.1] }), handL: two(g(-0.55, 0.95, -0.2), [-0.8, 0.1, -0.6], -0.3), chest: [10, -50, 0], spine: [6, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.22, -0.04], head: [0, 30, 0], fk: {} },
    { t: 1.02, ease: 'in', handR: S(g(-0.15, 0.9, 0.72), [0.2, -0.05, 0.98]), handL: two(g(-0.15, 0.9, 0.72), [0.2, -0.05, 0.98], -0.3), chest: [14, -6, 0], spine: [8, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.14, ease: 'out', handR: S(g(0.55, 0.95, 0.2), [0.95, 0.05, -0.3]), handL: two(g(0.55, 0.95, 0.2), [0.95, 0.05, -0.3], -0.3), chest: [12, 46, 0], spine: [6, 18, 0], hips: [0, 12, 0], hipsPos: [0, -0.24, 0.05] },
    { t: 1.55, handR: S(g(0.5, 0.96, 0.15), [0.9, 0.1, -0.4]), handL: two(g(0.5, 0.96, 0.15), [0.9, 0.1, -0.4], -0.3), chest: [10, 40, 0], spine: [6, 16, 0] },
    { ...mg(1.95), handL: null },
  ]),
  /** The grab: the free hand drawn back, then an open-handed lunge (0.95 s tell, hand icon). */
  cathMgGrab: new Clip('cathMgGrab', [
    mg(0),
    { t: 0.95, ease: 'out', handL: GRAB_HAND(0.45, 1.55, -0.25), chest: [-4, 34, 0], spine: [-2, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.12, -0.1], head: [-10, -20, 0], footR: g(-0.16, 0.07, -0.3) },
    { t: 1.08, ease: 'out', handL: GRAB_HAND(0.12, 1.15, 0.9), chest: [30, -10, 0], spine: [14, -4, 0], hips: [0, -6, 0], hipsPos: [0, -0.3, 0.2], head: [-20, 0, 0], footL: g(0.15, 0.07, 0.6) },
    // missed: overbalanced and exposed
    { t: 1.7, handL: GRAB_HAND(0.14, 0.75, 0.85), chest: [40, -10, 0], spine: [18, -4, 0], hipsPos: [0, -0.34, 0.2], head: [-14, 0, 0] },
    { ...mg(2.2), handL: null },
  ]),
  /** Holding the grabbed Returned up, crushing, and hurling him down (1.2 s). */
  cathMgCrush: new Clip('cathMgCrush', [
    { ...MG, t: 0, handL: GRAB_HAND(0.12, 1.15, 0.9), chest: [30, -10, 0], spine: [14, -4, 0], hipsPos: [0, -0.3, 0.2] },
    { t: 0.4, ease: 'out', handL: GRAB_HAND(0.14, 1.72, 0.62), chest: [-8, 0, 0], spine: [-4, 0, 0], hipsPos: [0, -0.06, 0.04], head: [-20, 0, 0] },
    { t: 0.8, handL: GRAB_HAND(0.12, 1.78, 0.58), chest: [-12, 0, 0], head: [-24, 0, 0] },
    { t: 1.2, ease: 'in', handL: GRAB_HAND(0.16, 0.55, 0.95), chest: [44, -4, 0], spine: [20, 0, 0], hipsPos: [0, -0.34, 0.16], head: [-20, 0, 0] },
    { t: 1.6, handL: GRAB_HAND(0.16, 0.6, 0.9), chest: [40, -4, 0], spine: [18, 0, 0], hipsPos: [0, -0.32, 0.14] },
    { ...mg(2.1), handL: null },
  ]),
  /** Stomp: the right foot lifted high, then brought down (0.85 s tell). */
  cathMgStomp: new Clip('cathMgStomp', [
    mg(0),
    { t: 0.85, ease: 'out', footR: g(-0.18, 0.7, 0.35), hipsPos: [0, 0.02, -0.06], chest: [-8, -6, 0], spine: [-4, 0, 0], head: [10, 0, 0], fk: { upperArmL: [-40, 0, 50], forearmL: [-40, 0, 0] } },
    { t: 0.98, ease: 'in', footR: g(-0.16, 0.08, 0.4), hipsPos: [0, -0.28, 0.1], chest: [26, -6, 0], spine: [12, 0, 0], head: [-10, 0, 0] },
    { t: 1.35, footR: g(-0.16, 0.08, 0.4), hipsPos: [0, -0.26, 0.09], chest: [22, -6, 0] },
    mg(1.75),
  ]),
};

// ====================================================================== procession bearer (pole), K 1.1
const KB = 1.1, b = sc(KB);
export const BR_POLE: HandKey = S(b(-0.27, 0.98, 0.14), [-0.03, 0.93, 0.36], { up: [0, -0.36, 0.93] });
const BR: Key = { t: 0, handR: BR_POLE, handL: null, chest: [8, -4, 0], spine: [4, 0, 0], head: [2, 0, 0], hipsPos: [0, -0.05, 0] };
const br = (t: number): Key => ({ ...BR, t, ease: 'inout' });

const bearerClips = {
  /** Wide sweep of the pole (0.75 s tell). */
  cathBrSweep: new Clip('cathBrSweep', [
    br(0),
    { t: 0.75, ease: 'out', handR: S(b(-0.45, 1.2, -0.25), [-0.75, 0.2, -0.62], { elbow: [-0.9, -0.2, -0.1] }), handL: two(b(-0.45, 1.2, -0.25), [-0.75, 0.2, -0.62], -0.45), chest: [6, -46, 0], spine: [4, -18, 0], hips: [0, -12, 0], hipsPos: [0, -0.14, -0.04], head: [0, 26, 0] },
    { t: 0.86, ease: 'in', handR: S(b(-0.12, 1.1, 0.6), [0.3, 0.05, 0.95]), handL: two(b(-0.12, 1.1, 0.6), [0.3, 0.05, 0.95], -0.45), chest: [10, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 0.97, ease: 'out', handR: S(b(0.45, 1.1, 0.25), [0.94, 0.05, -0.3]), handL: two(b(0.45, 1.1, 0.25), [0.94, 0.05, -0.3], -0.45), chest: [10, 44, 0], spine: [6, 16, 0], hips: [0, 10, 0], hipsPos: [0, -0.16, 0.05] },
    { t: 1.3, handR: S(b(0.42, 1.1, 0.2), [0.9, 0.1, -0.4]), handL: two(b(0.42, 1.1, 0.2), [0.9, 0.1, -0.4], -0.45), chest: [8, 40, 0] },
    { ...br(1.7), handL: null },
  ]),
  /** Pole thrust (0.7 s tell). */
  cathBrThrust: new Clip('cathBrThrust', [
    br(0),
    { t: 0.7, ease: 'out', handR: S(b(-0.3, 1.15, -0.3), [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: two(b(-0.3, 1.15, -0.3), [0, 0.05, 1], 0.35), chest: [2, -34, 0], spine: [0, -14, 0], hipsPos: [0, -0.14, -0.06], footR: b(-0.15, 0.08, -0.32) },
    { t: 0.8, ease: 'out', handR: S(b(-0.08, 1.2, 0.7), [0, -0.03, 1], { up: [0, 1, 0] }), handL: two(b(-0.08, 1.2, 0.7), [0, -0.03, 1], 0.35), chest: [12, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.2, 0.12], footL: b(0.14, 0.08, 0.52) },
    { t: 1.1, handR: S(b(-0.08, 1.18, 0.66), [0, -0.05, 1], { up: [0, 1, 0] }), handL: two(b(-0.08, 1.18, 0.66), [0, -0.05, 1], 0.35), chest: [12, 6, 0] },
    { ...br(1.5), handL: null },
  ]),
  /** Shoulder shove (0.6 s tell). */
  cathBrShove: new Clip('cathBrShove', [
    br(0),
    { t: 0.6, ease: 'out', chest: [10, 40, 0], spine: [6, 16, 0], hips: [0, 12, 0], hipsPos: [0, -0.18, -0.06], head: [-10, -30, 0], footR: b(-0.15, 0.08, -0.28) },
    { t: 0.72, ease: 'out', chest: [22, 20, 0], spine: [10, 8, 0], hips: [0, 4, 0], hipsPos: [0, -0.24, 0.2], footL: b(0.14, 0.08, 0.55) },
    { t: 0.95, chest: [20, 18, 0], hipsPos: [0, -0.22, 0.16] },
    br(1.3),
  ]),
};

// ====================================================================== the cantor, K 1.0
export const CTR_STAFF: HandKey = S([-0.25, 0.98, 0.18], [0.03, 0.97, 0.22], { up: [0, -0.22, 0.97], elbow: [-0.6, -0.5, -0.6] });
const CTR: Key = { t: 0, handR: CTR_STAFF, handL: null, chest: [0, 0, 0], head: [-4, 0, 0], fk: { upperArmL: [-40, 0, 30], forearmL: [-70, 0, 0] } };
const ctr = (t: number): Key => ({ ...CTR, t, ease: 'inout' });

const cantorClips = {
  cathCtrStrike: new Clip('cathCtrStrike', [
    ctr(0),
    { t: 0.6, ease: 'out', handR: S([-0.12, 1.75, -0.05], [0.02, 0.42, -0.9], { elbow: [-0.9, 0.2, -0.2] }), chest: [-12, -4, 0], spine: [-6, 0, 0] },
    { t: 0.68, ease: 'in', handR: S([-0.08, 1.35, 0.52], [0, 0.5, 0.86]), chest: [12, -2, 0], footL: [0.13, 0.08, 0.34] },
    { t: 0.76, ease: 'out', handR: S([-0.06, 0.72, 0.62], [0, -0.52, 0.85]), chest: [30, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.16, 0.1] },
    { t: 1.05, handR: S([-0.07, 0.74, 0.6], [0, -0.5, 0.86]), chest: [28, -2, 0] },
    ctr(1.45),
  ]),
  /** The hymn: arms lifted, head back, singing the reliquary awake (pulse at 2.0 s). */
  cathCtrHymn: new Clip('cathCtrHymn', [
    ctr(0),
    { t: 0.5, ease: 'out', handR: S([-0.25, 1.5, 0.2], [0.02, 0.98, 0.1], { elbow: [-0.8, -0.3, 0] }), chest: [-16, 0, 0], spine: [-8, 0, 0], head: [-30, 0, 0], fk: { upperArmL: [-150, 0, 20], forearmL: [-10, 0, 0] } },
    { t: 1.3, head: [-34, 6, 0], chest: [-18, 0, 0] },
    { t: 2.0, ease: 'out', handR: S([-0.25, 1.75, 0.25], [0.02, 0.98, 0.1]), head: [-38, 0, 0], chest: [-20, 0, 0], fk: { upperArmL: [-165, 0, 30], forearmL: [-5, 0, 0] } },
    { t: 2.3, head: [-30, 0, 0] },
    ctr(2.7),
  ]),
};

// ====================================================================== The Procession (reliquary bearer), K 1.35
const KR = 1.35, r = sc(KR);
export const PRC_POLE: HandKey = S(r(-0.27, 1.0, 0.16), [-0.02, 0.96, 0.28], { up: [0, -0.28, 0.96] });
const PRC: Key = { t: 0, handR: PRC_POLE, handL: null, chest: [12, -4, 0], spine: [6, 0, 0], neck: [6, 0, 0], head: [-6, 0, 0], hipsPos: [0, -0.08, 0], fk: { upperArmL: [-20, 0, 16], forearmL: [-50, 0, 0] } };
const prc = (t: number): Key => ({ ...PRC, t, ease: 'inout' });

const processionClips = {
  cathPrcSweep: new Clip('cathPrcSweep', [
    prc(0),
    { t: 0.75, ease: 'out', handR: S(r(-0.45, 1.25, -0.25), [-0.75, 0.25, -0.6], { elbow: [-0.9, -0.2, -0.1] }), handL: two(r(-0.45, 1.25, -0.25), [-0.75, 0.25, -0.6], -0.5), chest: [4, -48, 0], spine: [2, -18, 0], hips: [0, -12, 0], hipsPos: [0, -0.16, -0.05], head: [0, 26, 0], fk: {} },
    { t: 0.87, ease: 'in', handR: S(r(-0.12, 1.1, 0.62), [0.3, 0.02, 0.95]), handL: two(r(-0.12, 1.1, 0.62), [0.3, 0.02, 0.95], -0.5), chest: [12, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 0.98, ease: 'out', handR: S(r(0.45, 1.1, 0.25), [0.94, 0.02, -0.3]), handL: two(r(0.45, 1.1, 0.25), [0.94, 0.02, -0.3], -0.5), chest: [12, 44, 0], spine: [6, 16, 0], hips: [0, 10, 0], hipsPos: [0, -0.2, 0.06] },
    { t: 1.45, handR: S(r(0.42, 1.1, 0.2), [0.9, 0.08, -0.4]), handL: two(r(0.42, 1.1, 0.2), [0.9, 0.08, -0.4], -0.5), chest: [10, 40, 0] },
    { ...prc(1.9), handL: null },
  ]),
  cathPrcThrust: new Clip('cathPrcThrust', [
    prc(0),
    { t: 0.8, ease: 'out', handR: S(r(-0.3, 1.2, -0.32), [0, 0.04, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: two(r(-0.3, 1.2, -0.32), [0, 0.04, 1], 0.4), chest: [2, -36, 0], spine: [0, -14, 0], hipsPos: [0, -0.16, -0.08], footR: r(-0.15, 0.08, -0.34), fk: {} },
    { t: 0.9, ease: 'out', handR: S(r(-0.08, 1.24, 0.72), [0, -0.04, 1], { up: [0, 1, 0] }), handL: two(r(-0.08, 1.24, 0.72), [0, -0.04, 1], 0.4), chest: [14, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.24, 0.14], footL: r(0.14, 0.08, 0.55) },
    { t: 1.35, handR: S(r(-0.08, 1.22, 0.68), [0, -0.05, 1], { up: [0, 1, 0] }), handL: two(r(-0.08, 1.22, 0.68), [0, -0.05, 1], 0.4), chest: [14, 6, 0] },
    { ...prc(1.8), handL: null },
  ]),
  /** Overhead slam, the censer-bell rings the floor (1.0 s tell). */
  cathPrcSlam: new Clip('cathPrcSlam', [
    prc(0),
    { t: 1.0, ease: 'out', handR: S(r(-0.08, 1.98, -0.1), [0, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), handL: two(r(-0.08, 1.98, -0.1), [0, 0.4, -0.92], -0.4), chest: [-18, -4, 0], spine: [-10, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.02, -0.08], fk: {} },
    { t: 1.1, ease: 'in', handR: S(r(-0.06, 1.3, 0.7), [0, 0.3, 0.95]), handL: two(r(-0.06, 1.3, 0.7), [0, 0.3, 0.95], -0.4), chest: [14, -2, 0], spine: [8, 0, 0], footL: r(0.15, 0.08, 0.42) },
    { t: 1.18, ease: 'out', handR: S(r(-0.04, 0.5, 0.85), [0, -0.65, 0.76]), handL: two(r(-0.04, 0.5, 0.85), [0, -0.65, 0.76], -0.4), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.32 * KR, 0.12], head: [-20, 0, 0] },
    { t: 1.9, handR: S(r(-0.05, 0.52, 0.82), [0, -0.66, 0.75]), handL: two(r(-0.05, 0.52, 0.82), [0, -0.66, 0.75], -0.4), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.3 * KR, 0.1] },
    { ...prc(2.3), handL: null },
  ]),
  /** The March: pole raised as a standard (1.0 s tell), then levelled like a lance and carried forward. */
  cathPrcMarch: new Clip('cathPrcMarch', [
    prc(0),
    { t: 0.5, ease: 'out', handR: S(r(-0.2, 1.55, 0.2), [0, 0.99, 0.1], { elbow: [-0.9, -0.2, 0] }), handL: two(r(-0.2, 1.55, 0.2), [0, 0.99, 0.1], -0.35), chest: [-14, 0, 0], spine: [-6, 0, 0], head: [-16, 0, 0], fk: {} },
    { t: 0.95, handR: S(r(-0.2, 1.6, 0.2), [0, 0.99, 0.1]), handL: two(r(-0.2, 1.6, 0.2), [0, 0.99, 0.1], -0.35), chest: [-16, 0, 0] },
    { t: 1.1, ease: 'out', handR: S(r(-0.2, 1.1, 0.35), [0, 0.12, 0.99], { up: [0, 1, 0] }), handL: two(r(-0.2, 1.1, 0.35), [0, 0.12, 0.99], -0.5), chest: [20, 0, 0], spine: [10, 0, 0], hipsPos: [0, -0.18, 0.1], head: [-18, 0, 0] },
    // marching strides (the root motion carries him)
    { t: 1.4, footL: r(0.14, 0.2, 0.3), footR: r(-0.14, 0.08, -0.2), hipsPos: [0, -0.14, 0.1] },
    { t: 1.7, footL: r(0.14, 0.08, -0.2), footR: r(-0.14, 0.2, 0.3), hipsPos: [0, -0.18, 0.1] },
    { t: 2.0, footL: r(0.14, 0.2, 0.3), footR: r(-0.14, 0.08, -0.2), hipsPos: [0, -0.14, 0.1] },
    { t: 2.3, footL: r(0.14, 0.08, -0.2), footR: r(-0.14, 0.2, 0.3), hipsPos: [0, -0.18, 0.1] },
    { t: 2.6, footL: r(0.14, 0.08, 0.1), footR: r(-0.14, 0.08, -0.1), hipsPos: [0, -0.2, 0.08], chest: [26, 0, 0] },
    { t: 3.3, handR: S(r(-0.2, 1.05, 0.35), [0, 0.1, 0.99]), handL: two(r(-0.2, 1.05, 0.35), [0, 0.1, 0.99], -0.5), chest: [24, 0, 0] },
    { ...prc(3.7), handL: null },
  ]),
  /** Phase change: kneels, sets the reliquary's doors open, rises. */
  cathPrcTransition: new Clip('cathPrcTransition', [
    prc(0),
    { t: 0.8, ease: 'out', ...KNEEL(KR), handR: S(r(-0.25, 0.9, 0.35), [0, 0.98, 0.2]), handL: null, fk: { upperArmL: [-60, 0, 30], forearmL: [-60, 0, 0] } },
    { t: 1.8, ...KNEEL(KR), head: [-20, 0, 0], chest: [-6, 0, 0], fk: { upperArmL: [-150, 0, 40], forearmL: [-20, 0, 0] } },
    { ...UPRIGHT(KR), ...PRC, t: 2.6, ease: 'inout' },
  ]),
  cathPrcDeath: new Clip('cathPrcDeath', [
    prc(0),
    { t: 0.7, ease: 'out', ...KNEEL(KR), handR: S(r(-0.2, 1.0, 0.5), [0, 0.95, 0.3]), chest: [26, 0, 0], head: [28, 0, 0] },
    { t: 2.6, ...KNEEL(KR), handR: S(r(-0.2, 0.95, 0.52), [0, 0.95, 0.3]), chest: [40, 0, 0], head: [36, 0, 0] },
  ]),
};

// ====================================================================== Saint Vessaline (crozier), K 1.08
const KV = 1.08, v = sc(KV);
export const VES_CROZIER: HandKey = S(v(-0.25, 1.0, 0.2), [0.03, 0.97, 0.22], { up: [0, -0.22, 0.97], elbow: [-0.6, -0.5, -0.6] });
const VES: Key = { t: 0, handR: VES_CROZIER, handL: null, chest: [-3, 0, 0], spine: [-2, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.02, 0], fk: { upperArmL: [-30, 0, 24], forearmL: [-60, 0, 0] } };
const ves = (t: number): Key => ({ ...VES, t, ease: 'inout' });
const VHI_R: HandKey = S(v(-0.42, 1.62, -0.1), [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] });
const VMID: HandKey = S(v(-0.1, 1.25, 0.58), [0.35, 0.28, 0.9]);
const VLOW_L: HandKey = S(v(0.32, 0.8, 0.42), [0.85, -0.45, 0.28]);
const VHI_L: HandKey = S(v(0.36, 1.12, 0.1), [0.85, 0.3, -0.42], { elbow: [-0.2, -0.8, -0.4] });
const VMID2: HandKey = S(v(0, 1.22, 0.64), [-0.2, 0.3, 0.93]);
const VLOW_R: HandKey = S(v(-0.46, 1.25, 0.3), [-0.92, 0.3, 0.2]);
const vJabBack: HandKey = S(v(-0.3, 1.2, -0.3), [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] });
const vJabOut: HandKey = S(v(-0.06, 1.22, 0.72), [0.02, -0.03, 1], { up: [0, 1, 0] });
const VEIL_HAND = { upperArmL: [-130, 30, -20] as V3, forearmL: [-110, 0, 0] as V3 };

const vessalineClips = {
  /** Two-handed crozier sweep (0.6 s tell). */
  cathVesSweep: new Clip('cathVesSweep', [
    ves(0),
    { t: 0.6, ease: 'out', handR: S(v(-0.46, 1.25, -0.22), [-0.78, 0.2, -0.6], { elbow: [-0.9, -0.2, -0.1] }), handL: two(v(-0.46, 1.25, -0.22), [-0.78, 0.2, -0.6], -0.45), chest: [2, -46, 0], spine: [0, -18, 0], hips: [0, -12, 0], hipsPos: [0, -0.1, -0.04], head: [0, 24, 0], fk: {} },
    { t: 0.71, ease: 'in', handR: S(v(-0.1, 1.15, 0.62), [0.3, 0.05, 0.95]), handL: two(v(-0.1, 1.15, 0.62), [0.3, 0.05, 0.95], -0.45), chest: [8, -4, 0], spine: [4, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 0.82, ease: 'out', handR: S(v(0.45, 1.12, 0.22), [0.94, 0.05, -0.3]), handL: two(v(0.45, 1.12, 0.22), [0.94, 0.05, -0.3], -0.45), chest: [8, 44, 0], spine: [4, 16, 0], hips: [0, 10, 0], hipsPos: [0, -0.12, 0.06] },
    { t: 1.1, handR: S(v(0.42, 1.12, 0.2), [0.9, 0.1, -0.4]), handL: two(v(0.42, 1.12, 0.2), [0.9, 0.1, -0.4], -0.45), chest: [6, 40, 0] },
    { ...ves(1.5), handL: null },
  ]),
  /** Crozier thrust (0.65 s tell). */
  cathVesThrust: new Clip('cathVesThrust', [
    ves(0),
    { t: 0.65, ease: 'out', handR: vJabBack, handL: two(vJabBack.p, vJabBack.dir, 0.3), chest: [2, -34, 0], spine: [0, -14, 0], hipsPos: [0, -0.12, -0.06], footR: v(-0.15, 0.08, -0.3), fk: {} },
    { t: 0.76, ease: 'out', handR: vJabOut, handL: two(vJabOut.p, vJabOut.dir, 0.3), chest: [12, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.18, 0.14], footL: v(0.13, 0.08, 0.55) },
    { t: 1.1, handR: vJabOut, handL: two(vJabOut.p, vJabOut.dir, 0.3), chest: [12, 6, 0] },
    { ...ves(1.5), handL: null },
  ]),
  /** Toll: the crozier raised and struck on the floor; a ring of sound (0.95 s tell). */
  cathVesToll: new Clip('cathVesToll', [
    ves(0),
    { t: 0.95, ease: 'out', handR: S(v(-0.15, 1.95, 0.25), [0, 0.98, 0.15], { elbow: [-0.9, -0.1, 0] }), handL: two(v(-0.15, 1.95, 0.25), [0, 0.98, 0.15], -0.3), chest: [-16, 0, 0], spine: [-8, 0, 0], head: [-20, 0, 0], hipsPos: [0, 0.03, 0], fk: {} },
    { t: 1.05, ease: 'in', handR: S(v(-0.12, 1.1, 0.4), [0, 0.98, 0.15]), handL: two(v(-0.12, 1.1, 0.4), [0, 0.98, 0.15], -0.3), chest: [16, 0, 0], spine: [8, 0, 0], hipsPos: [0, -0.2, 0.04], head: [0, 0, 0] },
    { t: 1.6, handR: S(v(-0.12, 1.12, 0.4), [0, 0.98, 0.15]), handL: two(v(-0.12, 1.12, 0.4), [0, 0.98, 0.15], -0.3), chest: [12, 0, 0], hipsPos: [0, -0.18, 0.04] },
    { ...ves(2.0), handL: null },
  ]),
  /** The veil changes: her hand draws a new face over her own (1.3 s). */
  cathVesSwap: new Clip('cathVesSwap', [
    ves(0),
    { t: 0.45, ease: 'out', fk: VEIL_HAND, head: [-10, 0, 0], chest: [-6, 0, 0] },
    { t: 0.75, fk: { upperArmL: [-120, -20, 30], forearmL: [-100, 0, 0] }, head: [6, 0, 0] },
    ves(1.3),
  ]),

  // ---- borrowed: a pilgrim's flurry (four strikes; the first is the tell)
  cathVesFlurry: new Clip('cathVesFlurry', [
    ves(0),
    { t: 0.5, ease: 'out', handR: VHI_R, chest: [-8, -30, 0], spine: [-4, -12, 0], hips: [0, -8, 0] },
    { t: 0.58, ease: 'in', handR: VMID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: v(0.13, 0.08, 0.3) },
    { t: 0.66, ease: 'out', handR: VLOW_L, chest: [14, 28, 0], spine: [8, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.12, 0.08] },
    { t: 0.78, ease: 'out', handR: VHI_L, chest: [6, 32, 0], spine: [4, 12, 0] },
    { t: 0.85, ease: 'in', handR: VMID2, chest: [4, 0, 0], footR: v(-0.13, 0.08, 0.28) },
    { t: 0.92, ease: 'out', handR: VLOW_R, chest: [-2, -28, 0], spine: [0, -10, 0] },
    { t: 1.04, ease: 'out', handR: vJabBack, chest: [2, -30, 0], hipsPos: [0, -0.1, -0.04] },
    { t: 1.13, ease: 'out', handR: vJabOut, chest: [12, 6, 0], hipsPos: [0, -0.16, 0.12], footL: v(0.13, 0.08, 0.5) },
    { t: 1.33, ease: 'out', handR: S(v(-0.1, 1.98, 0), [0, 0.45, -0.89], { elbow: [-0.9, 0.2, -0.2] }), handL: two(v(-0.1, 1.98, 0), [0, 0.45, -0.89], -0.3), chest: [-16, -4, 0], spine: [-8, 0, 0], fk: {} },
    { t: 1.43, ease: 'in', handR: S(v(-0.06, 1.3, 0.66), [0, 0.35, 0.94]), handL: two(v(-0.06, 1.3, 0.66), [0, 0.35, 0.94], -0.3), chest: [14, 0, 0] },
    { t: 1.52, ease: 'out', handR: S(v(-0.04, 0.55, 0.8), [0, -0.66, 0.75]), handL: two(v(-0.04, 0.55, 0.8), [0, -0.66, 0.75], -0.3), chest: [38, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.26, 0.12] },
    { t: 1.95, handR: S(v(-0.05, 0.56, 0.78), [0, -0.66, 0.75]), handL: two(v(-0.05, 0.56, 0.78), [0, -0.66, 0.75], -0.3), chest: [34, 0, 0], hipsPos: [0, -0.24, 0.1] },
    { ...ves(2.35), handL: null },
  ]),
  // ---- borrowed: a flagellant's frenzy (self-scourge, then three fast lashes)
  cathVesScourge: new Clip('cathVesScourge', [
    ves(0),
    { t: 0.3, ease: 'out', handR: S(v(-0.3, 1.5, 0.25), [0.1, 0.9, 0.2], { elbow: [-0.8, -0.2, 0.2] }), chest: [8, -18, 0] },
    { t: 0.5, ease: 'in', handR: S(v(0.1, 1.6, -0.05), [0.4, -0.3, -0.85], { elbow: [-0.6, 0.6, 0.3] }), chest: [24, 12, 0], spine: [10, 6, 0], head: [16, 0, 0] },
    { t: 0.85, ease: 'out', handR: S(v(-0.5, 1.3, 0.1), [-0.6, 0.6, 0.3]), chest: [-20, 0, 0], head: [-30, 0, 0], fk: { upperArmL: [-30, 0, 80], forearmL: [-20, 0, 0] } },
    ves(1.25),
  ]),
  cathVesFrenzy: new Clip('cathVesFrenzy', [
    ves(0),
    { t: 0.5, ease: 'out', handR: VHI_R, chest: [-8, -34, 0], spine: [-4, -14, 0], hips: [0, -8, 0] },
    { t: 0.56, ease: 'in', handR: VMID, chest: [10, -2, 0], footL: v(0.13, 0.08, 0.34) },
    { t: 0.62, ease: 'out', handR: VLOW_L, chest: [18, 30, 0], spine: [8, 12, 0], hipsPos: [0, -0.14, 0.1] },
    { t: 0.74, ease: 'out', handR: VHI_L, chest: [8, 34, 0] },
    { t: 0.8, ease: 'in', handR: VMID2, chest: [6, 0, 0], footR: v(-0.13, 0.08, 0.3) },
    { t: 0.87, ease: 'out', handR: VLOW_R, chest: [0, -30, 0], hipsPos: [0, -0.12, 0.06] },
    { t: 1.03, ease: 'out', handR: VHI_R, chest: [-8, -32, 0] },
    { t: 1.1, ease: 'in', handR: VMID, chest: [10, -2, 0], footL: v(0.13, 0.08, 0.44) },
    { t: 1.17, ease: 'out', handR: VLOW_L, chest: [20, 30, 0], hipsPos: [0, -0.18, 0.12] },
    { t: 1.5, handR: VLOW_L, chest: [18, 28, 0] },
    ves(1.85),
  ]),
  // ---- borrowed: a mourner's grasp (spectral hand), and the crush when it holds
  cathVesGrasp: new Clip('cathVesGrasp', [
    ves(0),
    { t: 0.9, ease: 'out', handL: S(v(0.4, 1.6, -0.2), [0, 0.2, 1], { up: [1, 0, 0], elbow: [0.9, -0.3, -0.2] }), chest: [-6, 30, 0], spine: [-2, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.06, -0.08], head: [-10, -18, 0], fk: {} },
    { t: 1.02, ease: 'out', handL: S(v(0.12, 1.3, 0.72), [0, 0.2, 1], { up: [1, 0, 0], elbow: [0.9, -0.3, -0.2] }), chest: [22, -8, 0], spine: [10, -4, 0], hips: [0, -4, 0], hipsPos: [0, -0.2, 0.16], head: [-16, 0, 0], footL: v(0.13, 0.08, 0.55) },
    { t: 1.6, handL: S(v(0.12, 1.0, 0.66), [0, 0.2, 1]), chest: [30, -8, 0], hipsPos: [0, -0.24, 0.16] },
    { ...ves(2.0), handL: null },
  ]),
  cathVesCrush: new Clip('cathVesCrush', [
    { ...VES, t: 0, handL: S(v(0.12, 1.3, 0.72), [0, 0.2, 1], { up: [1, 0, 0] }), chest: [22, -8, 0] },
    { t: 0.4, ease: 'out', handL: S(v(0.14, 1.85, 0.5), [0, 0.2, 1], { up: [1, 0, 0] }), chest: [-10, 0, 0], head: [-18, 0, 0] },
    { t: 0.8, handL: S(v(0.12, 1.9, 0.48), [0, 0.2, 1], { up: [1, 0, 0] }), chest: [-12, 0, 0] },
    { t: 1.2, ease: 'in', handL: S(v(0.16, 0.7, 0.8), [0, 0.2, 1], { up: [1, 0, 0] }), chest: [36, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.24, 0.14] },
    { t: 1.6, handL: S(v(0.16, 0.72, 0.78), [0, 0.2, 1]), chest: [32, 0, 0] },
    { ...ves(2.0), handL: null },
  ]),
  // ---- borrowed: Corvane's Measure — the same timings as his, danced with a crozier
  cathVesMeasure: new Clip('cathVesMeasure', [
    ves(0),
    { t: 0.36, ease: 'out', handR: VHI_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0] },
    { t: 0.46, ease: 'in', handR: VMID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: v(0.14, 0.07, 0.3) },
    { t: 0.56, ease: 'out', handR: VLOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.76, ease: 'out', handR: VHI_L, chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.87, ease: 'in', handR: VMID2, chest: [4, 0, 0], spine: [2, 0, 0], footR: v(-0.14, 0.07, 0.3) },
    { t: 0.97, ease: 'out', handR: VLOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 1.2, ease: 'out', handR: vJabBack, chest: [0, -36, 0], spine: [0, -14, 0], hipsPos: [0, -0.14, -0.06] },
    { t: 1.32, ease: 'out', handR: vJabOut, chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.2, 0.12], footL: v(0.14, 0.07, 0.55) },
    { t: 1.8, ease: 'out', handR: S(v(-0.1, 2.02, -0.05), [0.02, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), handL: two(v(-0.1, 2.02, -0.05), [0.02, 0.4, -0.92], -0.3), chest: [-18, -6, 0], spine: [-10, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.02, 0], fk: {} },
    { t: 2.42, handR: S(v(-0.1, 2.06, -0.08), [0.02, 0.36, -0.93], { elbow: [-0.9, 0.2, -0.2] }), handL: two(v(-0.1, 2.06, -0.08), [0.02, 0.36, -0.93], -0.3), chest: [-20, -6, 0], spine: [-11, -2, 0] },
    { t: 2.54, ease: 'in', handR: S(v(-0.06, 1.3, 0.7), [0, 0.3, 0.95]), handL: two(v(-0.06, 1.3, 0.7), [0, 0.3, 0.95], -0.3), chest: [14, -2, 0], spine: [8, 0, 0], footL: v(0.14, 0.07, 0.45) },
    { t: 2.64, ease: 'out', handR: S(v(-0.04, 0.42, 0.85), [0, -0.72, 0.7]), handL: two(v(-0.04, 0.42, 0.85), [0, -0.72, 0.7], -0.3), chest: [42, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.3, 0.12], head: [-22, 0, 0] },
    { t: 3.6, handR: S(v(-0.05, 0.45, 0.82), [0, -0.74, 0.68]), handL: two(v(-0.05, 0.45, 0.82), [0, -0.74, 0.68], -0.3), chest: [38, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.28, 0.1], head: [-6, 0, 0] },
    { ...ves(4.1), handL: null },
  ]),
  // ---- borrowed (only if Wenna was taken): the hymn — three motes of sung names
  cathVesHymn: new Clip('cathVesHymn', [
    ves(0),
    { t: 0.5, ease: 'out', chest: [-14, 0, 0], head: [-24, 0, 0], fk: { upperArmL: [-110, 0, 40], forearmL: [-20, 0, 0] } },
    { t: 0.85, ease: 'out', chest: [6, 0, 0], head: [0, 0, 0], fk: { upperArmL: [-85, 0, 0], forearmL: [-5, 0, 0] } },
    { t: 1.1, fk: { upperArmL: [-85, 0, 0], forearmL: [-5, 0, 0] } },
    ves(1.5),
  ]),
  /** Phase change: arms opened, every veil falls, she rises a little off her feet. */
  cathVesTransition: new Clip('cathVesTransition', [
    ves(0),
    { t: 0.9, ease: 'out', handR: S(v(-0.4, 1.3, 0.1), [-0.2, 0.97, 0.1], { elbow: [-0.9, -0.2, 0] }), chest: [-22, 0, 0], spine: [-10, 0, 0], head: [-34, 0, 0], hipsPos: [0, 0.06, 0], fk: { upperArmL: [-20, 0, 85], forearmL: [-10, 0, 0] } },
    { t: 2.1, chest: [-24, 0, 0], head: [-38, 0, 0], hipsPos: [0, 0.1, 0] },
    ves(2.8),
  ]),
  cathVesDeath: new Clip('cathVesDeath', [
    ves(0),
    { t: 0.8, ease: 'out', ...KNEEL(KV), handR: S(v(-0.3, 0.6, 0.35), [-0.3, -0.2, 0.93]), chest: [10, 0, 0], head: [-20, 0, 0], fk: { upperArmL: [-40, 0, 60], forearmL: [-20, 0, 0] } },
    { t: 2.8, ...KNEEL(KV), handR: S(v(-0.32, 0.4, 0.4), [-0.4, -0.6, 0.7]), chest: [34, 0, 0], head: [30, 0, 0], fk: { upperArmL: [-10, 0, 20], forearmL: [-20, 0, 0] } },
  ]),
};

// ====================================================================== the Returned: knockdown & held
const playerClips = {
  /** Thrown flat on the back by a procession / hurled by a giant, then up on one knee and standing. */
  cathKnockdown: new Clip('cathKnockdown', [
    { t: 0, handR: null, handL: null },
    { t: 0.28, ease: 'out', hipsPos: [0, -0.5, -0.35], hips: [-40, 0, 0], chest: [-20, 0, 0], head: [20, 0, 0], fk: { ...legs(-40, 40), upperArmL: [-40, 0, 60], forearmL: [-30, 0, 0], upperArmR: [-40, 0, -60], forearmR: [-30, 0, 0] } },
    { t: 0.5, ease: 'in', hipsPos: [0, -0.86, -0.4], hips: [-84, 0, 0], spine: [-4, 0, 0], chest: [0, 0, 0], neck: [10, 0, 0], head: [16, 0, 0], fk: { ...legs(-10, 20, -4, 30), upperArmL: [-20, 0, 60], forearmL: [-20, 0, 0], upperArmR: [-10, 0, -50], forearmR: [-30, 0, 0] } },
    { t: 0.95, hipsPos: [0, -0.86, -0.4], hips: [-84, 0, 0], head: [24, 0, 0] },
    { t: 1.35, ease: 'out', ...KNEEL(1), fk: { upperArmL: [-10, 0, 12], forearmL: [-20, 0, 0], upperArmR: [-10, 0, -12], forearmR: [-20, 0, 0] } },
    { t: 1.75, ease: 'inout', ...UPRIGHT(1), chest: [0, 0, 0], fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),
  /** Held up in a giant's (or the Saint's spectral) hand, struggling. */
  cathHeld: new Clip('cathHeld', [
    { t: 0, handR: null, handL: null, hipsPos: [0, 0, 0], chest: [-8, 0, 0], head: [-20, 0, 0], fk: { ...legs(-10, 30, 10, 20), upperArmL: [-140, 0, 20], forearmL: [-30, 0, 0], upperArmR: [-140, 0, -20], forearmR: [-30, 0, 0] } },
    { t: 0.3, chest: [-4, 10, 0], fk: { ...legs(-30, 50, 20, 10), upperArmL: [-150, 0, 10], forearmL: [-50, 0, 0], upperArmR: [-130, 0, -30], forearmR: [-20, 0, 0] } },
    { t: 0.6, chest: [-10, -10, 0], fk: { ...legs(10, 20, -30, 50), upperArmL: [-130, 0, 30], forearmL: [-20, 0, 0], upperArmR: [-150, 0, -10], forearmR: [-50, 0, 0] } },
    { t: 0.9, chest: [-4, 10, 0], fk: { ...legs(-30, 50, 20, 10), upperArmL: [-150, 0, 10], forearmL: [-50, 0, 0], upperArmR: [-130, 0, -30], forearmR: [-20, 0, 0] } },
    { t: 1.2, chest: [-14, 0, 0], head: [-30, 0, 0], fk: { ...legs(0, 10, 0, 10), upperArmL: [-40, 0, 40], forearmL: [-20, 0, 0], upperArmR: [-40, 0, -40], forearmR: [-20, 0, 0] } },
  ], { loop: true, duration: 1.2 }),
};

export const cathedralClips = {
  ...pilgrimClips, ...flagellantClips, ...healerClips, ...giantClips, ...bearerClips, ...cantorClips,
  ...processionClips, ...vessalineClips, ...playerClips,
};
