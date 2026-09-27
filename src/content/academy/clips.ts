/**
 * Academy animation clips (IK keyframes, root space: +Z forward, -X = the character's right).
 * Every attack has a readable windup: the hand/tool is hauled to an extreme and held before the
 * strike. Small (homunculus) and huge (golem, Experiment No. 9) bodies use clips authored on the
 * 1.8 m reference and scaled with `scaled()` (hand/foot targets and hip offsets in metres).
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';

const H = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
const mul = (v: V3, s: number): V3 => [v[0] * s, v[1] * s, v[2] * s];

/** Scale a clip's metric targets for a body of height factor s. */
function scaled(keys: Key[], s: number): Key[] {
  return keys.map((k) => {
    const o: Key = { ...k };
    if (k.handR) o.handR = { ...k.handR, p: mul(k.handR.p, s) };
    if (k.handL) o.handL = { ...k.handL, p: mul(k.handL.p, s) };
    if (k.footL) o.footL = mul(k.footL, s);
    if (k.footR) o.footR = mul(k.footR, s);
    if (k.hipsPos) o.hipsPos = [k.hipsPos[0] * s, k.hipsPos[1], k.hipsPos[2] * s];
    return o;
  });
}

// ---------------------------------------------------------------------------------- holds

export const WAND_REST: HandKey = { p: [-0.25, 0.95, 0.2], dir: [-0.05, 0.4, 0.92], up: [0, -0.92, 0.4] };
export const POLE_HOLD: HandKey = { p: [-0.26, 1.0, 0.18], dir: [-0.02, 0.96, 0.28], up: [0, -0.28, 0.96], elbow: [-0.7, -0.5, -0.5] };
export const FORK_REST: HandKey = { p: [-0.26, 0.98, 0.16], dir: [0.05, 0.97, 0.2], up: [0, -0.2, 1], elbow: [-0.6, -0.5, -0.6] };
export const ECHO_REST: HandKey = { p: [-0.27, 0.96, 0.24], dir: [-0.08, 0.55, 0.83], up: [0, -0.83, 0.55] };
export const STAFF_HOLD: HandKey = { p: [-0.25, 0.98, 0.18], dir: [0.04, 0.97, 0.22], up: [0, -0.22, 0.97], elbow: [-0.6, -0.5, -0.6] };
export const BLADE_REST: HandKey = { p: [-0.25, 0.92, 0.22], dir: [-0.12, 0.3, 0.95], up: [0, -0.95, 0.3] };

const FREE_ARMS = { upperArmL: [4, 0, 9] as V3, forearmL: [-18, 0, 0] as V3, upperArmR: [4, 0, -9] as V3, forearmR: [-18, 0, 0] as V3 };

// ---------------------------------------------------------------------------------- glass acolyte

const aco = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: WAND_REST, handL: null, chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0], head: [0, 0, 0] });

const acolyte = {
  /** Single shard: wand raised high beside the head, glowing (0.95 s tell), then flicked forward. */
  acoCast: new Clip('acoCast', [
    aco(0),
    { t: 0.5, ease: 'out', handR: H([-0.3, 1.62, -0.05], [0.1, 0.9, -0.4], { up: [0, 0.4, 0.9] }), handL: null, fk: { upperArmL: [-80, 0, 12], forearmL: [-25, 0, 0] }, chest: [-8, -14, 0], spine: [-3, -6, 0], head: [-6, 8, 0] },
    { t: 0.9, handR: H([-0.3, 1.68, -0.1], [0.12, 0.88, -0.45], { up: [0, 0.45, 0.88] }), chest: [-10, -16, 0], spine: [-4, -7, 0] },
    { t: 1.0, ease: 'out', handR: H([-0.12, 1.42, 0.56], [0.05, 0.12, 1], { up: [0, 1, -0.12] }), chest: [10, 8, 0], spine: [5, 3, 0], head: [0, 0, 0], footL: [0.13, 0.08, 0.25], fk: { upperArmL: [-20, 0, 25], forearmL: [-30, 0, 0] } },
    { t: 1.3, handR: H([-0.13, 1.4, 0.52], [0.05, 0.18, 0.98], { up: [0, 0.98, -0.18] }), chest: [8, 6, 0] },
    aco(1.7),
  ]),
  /** Three shards: both hands up (1.3 s tell), then three flicks. */
  acoVolley: new Clip('acoVolley', [
    aco(0),
    { t: 0.6, ease: 'out', handR: H([-0.28, 1.72, 0.05], [0.05, 0.95, -0.2], { up: [0, 0.2, 0.95] }), fk: { upperArmL: [-160, 0, -10], forearmL: [-20, 0, 0] }, chest: [-14, 0, 0], spine: [-6, 0, 0], head: [-12, 0, 0] },
    { t: 1.25, handR: H([-0.28, 1.76, 0.02], [0.05, 0.95, -0.25], { up: [0, 0.25, 0.95] }), chest: [-16, 0, 0] },
    { t: 1.32, ease: 'out', handR: H([-0.2, 1.45, 0.55], [-0.2, 0.1, 1], { up: [0, 1, 0] }), chest: [8, 10, 0], footL: [0.13, 0.08, 0.22] },
    { t: 1.47, ease: 'out', handR: H([-0.1, 1.5, 0.56], [0.05, 0.15, 1], { up: [0, 1, 0] }), chest: [8, 0, 0] },
    { t: 1.62, ease: 'out', handR: H([0.02, 1.45, 0.55], [0.25, 0.1, 1], { up: [0, 1, 0] }), chest: [8, -10, 0] },
    { t: 1.9, handR: H([0, 1.42, 0.5], [0.2, 0.2, 0.95], { up: [0, 1, 0] }), chest: [6, -6, 0], fk: { upperArmL: [-30, 0, 20], forearmL: [-30, 0, 0] } },
    aco(2.3),
  ]),
  /** Wand stab when cornered (0.55 s tell). */
  acoStab: new Clip('acoStab', [
    aco(0),
    { t: 0.5, ease: 'out', handR: H([-0.34, 1.12, -0.2], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -30, 0], spine: [0, -10, 0], hipsPos: [0, -0.08, -0.05], footR: [-0.15, 0.08, -0.25] },
    { t: 0.62, ease: 'out', handR: H([-0.08, 1.22, 0.64], [0, 0, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [5, 2, 0], hipsPos: [0, -0.12, 0.1], footL: [0.13, 0.08, 0.35] },
    { t: 0.9, handR: H([-0.08, 1.2, 0.6], [0, -0.05, 1], { up: [0, 1, 0] }), chest: [10, 6, 0] },
    aco(1.2),
  ]),
};

// ---------------------------------------------------------------------------------- lens warden

const war = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: POLE_HOLD, handL: null, chest: [2, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0], head: [0, 0, 0] });
const LEVEL_R = H([-0.2, 1.3, 0.08], [0.04, 0.04, 1], { up: [0, 1, 0], elbow: [-0.8, -0.4, -0.3] });
const LEVEL_L = H([-0.12, 1.32, 0.46], [0.04, 0.04, 1], { up: [0, 1, 0], elbow: [0.8, -0.6, 0] });

const warden = {
  /** The beam: the lens pole lowered like a lance and braced (1.7 s tell; the light line narrows). */
  wardenBeam: new Clip('wardenBeam', [
    war(0),
    { t: 0.45, ease: 'out', handR: LEVEL_R, handL: LEVEL_L, chest: [6, -8, 0], spine: [2, -4, 0], hipsPos: [0, -0.1, -0.02], footR: [-0.14, 0.08, -0.3], footL: [0.14, 0.08, 0.22], head: [4, 6, 0] },
    { t: 1.35, handR: { ...LEVEL_R, p: [-0.2, 1.28, 0.04] }, handL: LEVEL_L, chest: [10, -10, 0], spine: [4, -4, 0], hipsPos: [0, -0.16, -0.04] },
    { t: 1.72, ease: 'out', handR: { ...LEVEL_R, p: [-0.2, 1.32, -0.1] }, handL: { ...LEVEL_L, p: [-0.12, 1.36, 0.3] }, chest: [-8, -8, 0], spine: [-4, -2, 0], hipsPos: [0, -0.1, -0.12] },
    { t: 2.2, handR: LEVEL_R, handL: LEVEL_L, chest: [2, -6, 0], hipsPos: [0, -0.08, -0.06] },
    war(2.6),
  ]),
  /** Wide sweep with the pole (0.8 s tell). */
  wardenSweep: new Clip('wardenSweep', [
    war(0),
    { t: 0.75, ease: 'out', handR: H([-0.42, 1.25, -0.22], [-0.65, 0.25, -0.72], { up: [0, 1, 0], elbow: [-0.7, -0.6, -0.2] }), chest: [-4, -38, 0], spine: [-2, -16, 0], hips: [0, -10, 0], hipsPos: [0, -0.08, -0.04], footR: [-0.16, 0.08, -0.28] },
    { t: 0.9, ease: 'in', handR: H([-0.12, 1.2, 0.5], [0.3, 0.1, 0.95], { up: [0, 1, 0] }), chest: [4, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0] },
    { t: 1.02, ease: 'out', handR: H([0.3, 1.15, 0.28], [0.9, 0.05, -0.4], { up: [0, 1, 0] }), chest: [10, 36, 0], spine: [6, 14, 0], hips: [0, 10, 0], hipsPos: [0, -0.14, 0.08], footL: [0.15, 0.08, 0.3] },
    { t: 1.5, handR: H([0.28, 1.12, 0.24], [0.88, 0.0, -0.45], { up: [0, 1, 0] }), chest: [8, 32, 0], spine: [5, 12, 0] },
    war(1.9),
  ]),
  /** Overhead slam (1.0 s tell). */
  wardenSlam: new Clip('wardenSlam', [
    war(0),
    { t: 0.95, ease: 'out', handR: H([-0.12, 1.88, -0.1], [0, 0.45, -0.89], { up: [0, 0.89, 0.45], elbow: [-0.9, 0.2, -0.2] }), fk: { upperArmL: [-160, 0, -20], forearmL: [-30, 0, 0] }, chest: [-14, -4, 0], spine: [-6, 0, 0], head: [6, 0, 0], hipsPos: [0, 0.01, -0.06] },
    { t: 1.08, ease: 'in', handR: H([-0.1, 1.05, 0.55], [0, -0.55, 0.84], { up: [0, 0.84, 0.55] }), fk: { upperArmL: [-60, 0, 10], forearmL: [-30, 0, 0] }, chest: [30, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.22, 0.12], footL: [0.14, 0.08, 0.42], head: [-14, 0, 0] },
    { t: 1.6, handR: H([-0.1, 1.02, 0.55], [0, -0.58, 0.82], { up: [0, 0.82, 0.58] }), chest: [26, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.2, 0.1] },
    war(2.2),
  ]),
};

// ---------------------------------------------------------------------------------- ritual choir

const choirR = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: FORK_REST, handL: null, chest: [3, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0], head: [4, 0, 0] });
const CHANT_R = H([-0.1, 1.58, 0.32], [0.02, 1, 0.06], { up: [0, -0.06, 1], elbow: [-0.7, -0.5, -0.4] });

const choir = {
  /** The chant (loop): the fork held high before the face, the free hand open; the ward pulses with it. */
  choirChant: new Clip('choirChant', [
    { t: 0, handR: CHANT_R, handL: null, fk: { upperArmL: [-120, 0, 30], forearmL: [-30, 0, 0], handL: [0, 0, -20] }, chest: [-8, 4, 2], spine: [-3, 0, 0], head: [-16, 0, 0], hipsPos: [0, -0.04, 0] },
    { t: 1.5, handR: { ...CHANT_R, p: [-0.1, 1.62, 0.3] }, fk: { upperArmL: [-130, 0, 36], forearmL: [-20, 0, 0], handL: [0, 0, -30] }, chest: [-10, -4, -2], spine: [-4, 0, 0], head: [-20, 4, 0], hipsPos: [0, -0.02, 0] },
  ], { loop: true, duration: 3 }),
  /** Fork strike (0.65 s tell). */
  choirStrike: new Clip('choirStrike', [
    choirR(0),
    { t: 0.62, ease: 'out', handR: H([-0.26, 1.78, -0.14], [0, 0.6, -0.8], { up: [0, 0.8, 0.6], elbow: [-0.9, 0.1, -0.2] }), chest: [-14, -10, 0], spine: [-6, -4, 0], head: [4, 0, 0] },
    { t: 0.76, ease: 'in', handR: H([-0.12, 1.08, 0.56], [0, -0.3, 0.95], { up: [0, 0.95, 0.3] }), chest: [24, 4, 0], spine: [10, 2, 0], hipsPos: [0, -0.16, 0.1], footL: [0.13, 0.08, 0.32] },
    { t: 1.1, handR: H([-0.12, 1.06, 0.54], [0, -0.35, 0.93], { up: [0, 0.93, 0.35] }), chest: [22, 4, 0] },
    choirR(1.5),
  ]),
  /** The toll: fork raised two-handed and driven into the floor — a ringing shockwave (1.1 s tell). */
  choirToll: new Clip('choirToll', [
    choirR(0),
    { t: 0.95, ease: 'out', handR: H([-0.08, 1.95, 0.08], [0, 1, 0.05], { up: [0, 0, 1], elbow: [-0.8, 0.2, -0.3] }), fk: { upperArmL: [-170, 0, -5], forearmL: [-30, 0, 0] }, chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-18, 0, 0], hipsPos: [0, 0.02, 0] },
    { t: 1.12, ease: 'in', handR: H([-0.08, 0.95, 0.45], [0, -1, 0.1], { up: [0, 0.1, 1] }), fk: { upperArmL: [-70, 0, -10], forearmL: [-40, 0, 0] }, chest: [30, 0, 0], spine: [14, 0, 0], hipsPos: [0, -0.28, 0.08], head: [-10, 0, 0], footL: [0.15, 0.08, 0.28] },
    { t: 1.7, handR: H([-0.08, 0.98, 0.45], [0, -1, 0.12], { up: [0, 0.12, 1] }), chest: [26, 0, 0], spine: [12, 0, 0], hipsPos: [0, -0.24, 0.06] },
    choirR(2.2),
  ]),
};

// ---------------------------------------------------------------------------------- echo construct

const ech = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: ECHO_REST, handL: null, chest: [2, -6, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0], head: [0, 0, 0], fk: FREE_ARMS });

const echo = {
  echoCut: new Clip('echoCut', [
    ech(0),
    { t: 0.55, ease: 'out', handR: H([-0.4, 1.62, -0.1], [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] }), chest: [-10, -32, 0], spine: [-4, -12, 0], hips: [0, -8, 0], head: [6, 16, 0] },
    { t: 0.65, ease: 'in', handR: H([-0.1, 1.25, 0.6], [0.35, 0.25, 0.9]), chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.3] },
    { t: 0.75, ease: 'out', handR: H([0.3, 0.78, 0.42], [0.85, -0.45, 0.28]), chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08], head: [0, 0, 0] },
    { t: 1.05, handR: H([0.26, 0.8, 0.4], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
    ech(1.4),
  ]),
  echoCut2: new Clip('echoCut2', [
    { t: 0, handR: H([0.26, 0.8, 0.4], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
    { t: 0.3, ease: 'out', handR: H([0.34, 1.08, 0.12], [0.85, 0.25, -0.45], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.4, ease: 'in', handR: H([0, 1.22, 0.62], [-0.2, 0.3, 0.93]), chest: [4, 0, 0], footR: [-0.14, 0.08, 0.25] },
    { t: 0.5, ease: 'out', handR: H([-0.45, 1.3, 0.3], [-0.92, 0.3, 0.2]), chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.85, handR: H([-0.42, 1.28, 0.25], [-0.88, 0.4, 0.1]), chest: [-2, -26, 0] },
    ech(1.2),
  ]),
  /** Mirror of Oathbound Lunge: blade drawn back low, then a driving step-thrust (0.75 s tell). */
  echoLunge: new Clip('echoLunge', [
    ech(0),
    { t: 0.7, ease: 'out', handR: H([-0.32, 1.02, -0.32], [0, 0.06, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [4, -42, 0], spine: [0, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.2, -0.1], footR: [-0.16, 0.08, -0.38] },
    { t: 0.84, ease: 'out', handR: H([-0.04, 1.2, 0.88], [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [14, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.24, 0.16], footL: [0.14, 0.08, 0.6] },
    { t: 1.2, handR: H([-0.05, 1.18, 0.84], [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
    ech(1.6),
  ]),
  /** Mirror of Bulwark Toll: the glass forearm-plate driven forward (0.7 s tell). */
  echoBash: new Clip('echoBash', [
    ech(0),
    { t: 0.66, ease: 'out', fk: { upperArmL: [-70, 0, -45], forearmL: [-110, 0, 0], upperArmR: [4, 0, -9], forearmR: [-18, 0, 0] }, chest: [-4, 32, 0], spine: [-2, 12, 0], hipsPos: [0, -0.1, -0.08], footR: [-0.15, 0.08, -0.28] },
    { t: 0.78, ease: 'out', fk: { upperArmL: [-88, 0, 18], forearmL: [-12, 0, 0], upperArmR: [4, 0, -9], forearmR: [-18, 0, 0] }, chest: [10, -12, 0], spine: [6, -4, 0], hipsPos: [0, -0.16, 0.16], footL: [0.14, 0.08, 0.5] },
    { t: 1.1, fk: { upperArmL: [-84, 0, 16], forearmL: [-14, 0, 0], upperArmR: [4, 0, -9], forearmR: [-18, 0, 0] }, chest: [8, -10, 0], hipsPos: [0, -0.14, 0.12] },
    ech(1.5),
  ]),
  /** Mirror of Bellglass Ward: blade raised upright before the face; a glass ward rings up. */
  echoWard: new Clip('echoWard', [
    ech(0),
    { t: 0.45, ease: 'out', handR: H([-0.06, 1.3, 0.34], [0.02, 1, 0.05], { up: [0, 0, 1] }), fk: { upperArmL: [-60, 0, -35], forearmL: [-80, 0, 0], handL: [0, 0, 20] }, chest: [-6, 4, 0], head: [-8, 0, 0] },
    { t: 1.0, handR: H([-0.06, 1.34, 0.34], [0.02, 1, 0.05], { up: [0, 0, 1] }), chest: [-8, 4, 0] },
    ech(1.4),
  ]),
  /** Mirror of Measured Cut: a dash with two cuts, the second heavier (0.65 s tell). */
  echoMeasured: new Clip('echoMeasured', [
    ech(0),
    { t: 0.6, ease: 'out', handR: H([-0.42, 1.5, -0.1], [-0.4, 0.6, -0.7], { elbow: [-0.9, 0, -0.2] }), chest: [-6, -34, 0], spine: [-2, -14, 0], hips: [0, -8, 0], hipsPos: [0, -0.12, -0.04], footR: [-0.15, 0.08, -0.3] },
    { t: 0.72, ease: 'out', handR: H([0.28, 0.95, 0.5], [0.9, -0.2, 0.35]), chest: [12, 28, 0], spine: [6, 12, 0], hips: [0, 8, 0], hipsPos: [0, -0.16, 0.12], footL: [0.14, 0.08, 0.4] },
    { t: 0.9, ease: 'out', handR: H([0.36, 1.42, 0.1], [0.7, 0.6, -0.35], { elbow: [-0.2, -0.6, -0.6] }), chest: [0, 34, 0], spine: [0, 14, 0] },
    { t: 1.02, ease: 'in', handR: H([-0.35, 0.88, 0.5], [-0.85, -0.35, 0.4]), chest: [18, -28, 0], spine: [8, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.2, 0.18], footR: [-0.14, 0.08, 0.45] },
    { t: 1.5, handR: H([-0.34, 0.9, 0.46], [-0.82, -0.35, 0.45]), chest: [16, -26, 0], hipsPos: [0, -0.18, 0.14] },
    ech(2.0),
  ]),
  /** With no technique to copy, it raises its mirror-blade high and waits (1.0 s tell), then falls. */
  echoMirror: new Clip('echoMirror', [
    ech(0),
    { t: 0.9, ease: 'out', handR: H([-0.1, 1.9, -0.12], [0.02, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.2] }), fk: { upperArmL: [-170, 0, -10], forearmL: [-30, 0, 0] }, chest: [-16, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.01, -0.05] },
    { t: 1.02, ease: 'in', handR: H([-0.08, 1.5, 0.55], [0, 0.6, 0.8]), chest: [10, -4, 0], footL: [0.13, 0.08, 0.38], fk: { upperArmL: [-90, 0, -20], forearmL: [-30, 0, 0] } },
    { t: 1.12, ease: 'out', handR: H([-0.05, 0.62, 0.62], [0, -0.6, 0.8]), chest: [32, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.2, 0.1], head: [-14, 0, 0], fk: { upperArmL: [-40, 0, 10], forearmL: [-30, 0, 0] } },
    { t: 1.6, handR: H([-0.06, 0.64, 0.6], [0, -0.55, 0.83]), chest: [28, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.18, 0.08] },
    ech(2.0),
  ]),
};

// ---------------------------------------------------------------------------------- homunculus (s = 0.56)

export const HOM_S = 0.56;
const hom = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: null, handL: null, chest: [22, 0, 0], spine: [12, 0, 0], neck: [-20, 0, 0], head: [-18, 0, 0], hips: [6, 0, 0], hipsPos: [0, -0.1, 0], fk: { upperArmL: [-30, 0, 20], forearmL: [-60, 0, 0], upperArmR: [-30, 0, -20], forearmR: [-60, 0, 0] } });
const homunculus = {
  homBite: new Clip('homBite', scaled([
    hom(0),
    { t: 0.48, ease: 'out', hipsPos: [0, -0.32, -0.08], chest: [40, 0, 0], spine: [20, 0, 0], head: [-30, 0, 0], footL: [0.14, 0.08, 0.12], footR: [-0.14, 0.08, 0.08], fk: { upperArmL: [30, 0, 30], forearmL: [-40, 0, 0], upperArmR: [30, 0, -30], forearmR: [-40, 0, 0] } },
    { t: 0.62, ease: 'out', hipsPos: [0, 0.06, 0.2], chest: [8, 0, 0], spine: [4, 0, 0], head: [-6, 0, 0], footL: [0.12, 0.3, -0.25], footR: [-0.12, 0.26, -0.3], fk: { upperArmL: [-130, 0, 25], forearmL: [-10, 0, 0], upperArmR: [-130, 0, -25], forearmR: [-10, 0, 0] } },
    { t: 0.78, ease: 'in', hipsPos: [0, -0.2, 0.05], chest: [34, 0, 0], spine: [14, 0, 0], head: [-20, 0, 0], footL: [0.14, 0.08, 0.1], footR: [-0.14, 0.08, -0.1] },
    hom(1.1),
  ], HOM_S)),
  homClaw: new Clip('homClaw', scaled([
    hom(0),
    { t: 0.38, ease: 'out', chest: [10, -30, 0], spine: [6, -10, 0], fk: { upperArmR: [-160, 0, -40], forearmR: [-30, 0, 0], upperArmL: [-30, 0, 20], forearmL: [-60, 0, 0] } },
    { t: 0.5, ease: 'in', chest: [34, 20, 0], spine: [14, 8, 0], hipsPos: [0, -0.14, 0.06], fk: { upperArmR: [-40, 0, 20], forearmR: [-10, 0, 0], upperArmL: [-30, 0, 20], forearmL: [-60, 0, 0] } },
    hom(0.9),
  ], HOM_S)),
  homClaw2: new Clip('homClaw2', scaled([
    { t: 0, chest: [34, 20, 0], spine: [14, 8, 0], hipsPos: [0, -0.14, 0.06], fk: { upperArmR: [-40, 0, 20], forearmR: [-10, 0, 0], upperArmL: [-30, 0, 20], forearmL: [-60, 0, 0] } },
    { t: 0.25, ease: 'out', chest: [12, 26, 0], fk: { upperArmL: [-160, 0, 40], forearmL: [-30, 0, 0], upperArmR: [-30, 0, -20], forearmR: [-60, 0, 0] } },
    { t: 0.36, ease: 'in', chest: [34, -20, 0], spine: [14, -8, 0], fk: { upperArmL: [-40, 0, -20], forearmL: [-10, 0, 0], upperArmR: [-30, 0, -20], forearmR: [-60, 0, 0] } },
    hom(0.8),
  ], HOM_S)),
  homHurt: new Clip('homHurt', [{ t: 0 }, { t: 0.08, ease: 'out', chest: [-20, 10, 0], head: [-20, 0, 0], hipsPos: [0, -0.04, -0.02] }, { t: 0.4, chest: [22, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.1, 0] }]),
  homDeath: new Clip('homDeath', scaled([
    { t: 0 },
    { t: 0.3, ease: 'out', hipsPos: [0, -0.3, -0.1], chest: [-30, 0, 20], head: [-30, 0, 0], fk: { upperArmL: [-90, 0, 60], forearmL: [-10, 0, 0], upperArmR: [-90, 0, -60], forearmR: [-10, 0, 0] } },
    { t: 0.8, ease: 'in', hipsPos: [0, -0.9, -0.2], hips: [-80, 0, 20], chest: [-10, 0, 10], head: [-20, 30, 0], footL: [0.2, 0.3, 0.3], footR: [-0.2, 0.2, 0.4] },
  ], HOM_S)),
};

// ---------------------------------------------------------------------------------- golem (s = 1.45)

export const GOLEM_S = 1.45;
const gol = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: null, handL: null, chest: [14, 0, 0], spine: [6, 0, 0], head: [-10, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.08, 0], fk: { upperArmL: [8, 0, 16], forearmL: [-24, 0, 0], upperArmR: [8, 0, -16], forearmR: [-24, 0, 0] } });
const golem = {
  golemSwing: new Clip('golemSwing', scaled([
    gol(0),
    { t: 1.0, ease: 'out', chest: [0, -40, 0], spine: [-2, -16, 0], hips: [0, -12, 0], hipsPos: [0, -0.12, -0.05], footR: [-0.16, 0.08, -0.3], fk: { upperArmR: [40, 0, -80], forearmR: [-50, 0, 0], upperArmL: [-40, 0, 30], forearmL: [-30, 0, 0] } },
    { t: 1.12, ease: 'in', chest: [8, 0, 0], spine: [4, 0, 0], hips: [0, 0, 0], fk: { upperArmR: [-70, 0, -40], forearmR: [-20, 0, 0], upperArmL: [-10, 0, 20], forearmL: [-30, 0, 0] } },
    { t: 1.28, ease: 'out', chest: [12, 40, 0], spine: [6, 16, 0], hips: [0, 10, 0], hipsPos: [0, -0.16, 0.1], footL: [0.15, 0.08, 0.3], fk: { upperArmR: [-95, 0, 40], forearmR: [-8, 0, 0], upperArmL: [20, 0, 30], forearmL: [-30, 0, 0] } },
    { t: 1.7, chest: [12, 36, 0], spine: [6, 14, 0], fk: { upperArmR: [-90, 0, 38], forearmR: [-10, 0, 0], upperArmL: [20, 0, 30], forearmL: [-30, 0, 0] } },
    gol(2.1),
  ], GOLEM_S)),
  golemSlam: new Clip('golemSlam', scaled([
    gol(0),
    { t: 1.35, ease: 'out', chest: [-20, 0, 0], spine: [-10, 0, 0], head: [10, 0, 0], hipsPos: [0, 0.02, -0.08], fk: { upperArmL: [-172, 0, 18], forearmL: [-40, 0, 0], upperArmR: [-172, 0, -18], forearmR: [-40, 0, 0] } },
    { t: 1.52, ease: 'in', chest: [48, 0, 0], spine: [20, 0, 0], head: [-20, 0, 0], hipsPos: [0, -0.42, 0.22], footL: [0.16, 0.08, 0.4], fk: { upperArmL: [-70, 0, 6], forearmL: [-8, 0, 0], upperArmR: [-70, 0, -6], forearmR: [-8, 0, 0] } },
    { t: 2.1, chest: [44, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.38, 0.18], fk: { upperArmL: [-68, 0, 6], forearmL: [-10, 0, 0], upperArmR: [-68, 0, -6], forearmR: [-10, 0, 0] } },
    gol(2.7),
  ], GOLEM_S)),
  /** The chains whirl: arms flung out and the body turns a full circle (1.2 s tell). */
  golemWhirl: new Clip('golemWhirl', scaled([
    gol(0),
    { t: 1.15, ease: 'out', chest: [4, -60, 0], spine: [0, -24, 0], hips: [0, -20, 0], hipsPos: [0, -0.16, 0], fk: { upperArmL: [-10, 0, 85], forearmL: [-10, 0, 0], upperArmR: [-10, 0, -85], forearmR: [-10, 0, 0] } },
    { t: 1.35, ease: 'linear', hips: [0, 100, 0], chest: [4, -20, 0] },
    { t: 1.55, ease: 'linear', hips: [0, 220, 0] },
    { t: 1.75, ease: 'out', hips: [0, 340, 0], chest: [4, 0, 0] },
    { t: 2.2, hips: [0, 360, 0], chest: [10, 0, 0], fk: { upperArmL: [0, 0, 30], forearmL: [-20, 0, 0], upperArmR: [0, 0, -30], forearmR: [-20, 0, 0] } },
    { t: 2.6, ease: 'inout', hips: [0, 360, 0], chest: [14, 0, 0], spine: [6, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.08, 0], fk: { upperArmL: [8, 0, 16], forearmL: [-24, 0, 0], upperArmR: [8, 0, -16], forearmR: [-24, 0, 0] } },
  ], GOLEM_S)),
  golemDeath: new Clip('golemDeath', scaled([
    { t: 0 },
    { t: 0.6, ease: 'out', hipsPos: [0, -0.4, 0], chest: [30, 0, 0], head: [20, 0, 0], footL: [0.14, 0.08, 0.3], footR: [-0.14, 0.12, -0.3] },
    { t: 1.4, ease: 'in', hipsPos: [0, -0.86, 0.35], hips: [80, 0, 0], chest: [10, 0, 0], head: [-10, 20, 0], fk: { upperArmL: [-150, 0, 30], forearmL: [-20, 0, 0], upperArmR: [-20, 0, -30], forearmR: [-30, 0, 0] } },
  ], GOLEM_S)),
};

// ---------------------------------------------------------------------------------- experiment No. 9 (s = 1.55)

export const X9_S = 1.55;
const x9r = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: null, handL: null, chest: [26, 10, 6], spine: [10, 4, 0], neck: [-14, 0, 0], head: [-20, -10, 10], hips: [4, 0, 0], hipsPos: [0, -0.12, 0], fk: { upperArmL: [-10, 0, 24], forearmL: [-50, 0, 0], upperArmR: [20, 0, -12], forearmR: [-10, 0, 0] } });
const x9 = {
  x9Sweep: new Clip('x9Sweep', scaled([
    x9r(0),
    { t: 0.85, ease: 'out', chest: [8, -46, 0], spine: [2, -18, 0], hips: [0, -12, 0], hipsPos: [0, -0.16, -0.06], footR: [-0.16, 0.08, -0.3], fk: { upperArmR: [50, 0, -90], forearmR: [-30, 0, 0], upperArmL: [-40, 0, 30], forearmL: [-40, 0, 0] } },
    { t: 1.0, ease: 'in', chest: [16, 0, 0], hips: [0, 0, 0], fk: { upperArmR: [-60, 0, -60], forearmR: [-5, 0, 0], upperArmL: [-10, 0, 24], forearmL: [-50, 0, 0] } },
    { t: 1.15, ease: 'out', chest: [20, 46, 0], spine: [8, 18, 0], hips: [0, 12, 0], hipsPos: [0, -0.2, 0.12], footL: [0.15, 0.08, 0.3], fk: { upperArmR: [-95, 0, 50], forearmR: [-5, 0, 0], upperArmL: [10, 0, 30], forearmL: [-40, 0, 0] } },
    { t: 1.5, chest: [20, 40, 0], fk: { upperArmR: [-85, 0, 45], forearmR: [-10, 0, 0], upperArmL: [10, 0, 30], forearmL: [-40, 0, 0] } },
    x9r(1.9),
  ], X9_S)),
  /** Leap: a deep crouch (1.0 s tell), airborne, a crushing landing. */
  x9Leap: new Clip('x9Leap', scaled([
    x9r(0),
    { t: 0.95, ease: 'out', hipsPos: [0, -0.42, -0.1], chest: [46, 0, 0], spine: [20, 0, 0], head: [-34, 0, 0], footL: [0.18, 0.08, 0.15], footR: [-0.18, 0.08, 0.05], fk: { upperArmL: [40, 0, 30], forearmL: [-30, 0, 0], upperArmR: [40, 0, -30], forearmR: [-30, 0, 0] } },
    { t: 1.2, ease: 'out', hipsPos: [0, 0.35, 0.1], chest: [-10, 0, 0], spine: [-6, 0, 0], head: [0, 0, 0], footL: [0.14, 0.5, -0.2], footR: [-0.14, 0.44, -0.3], fk: { upperArmL: [-170, 0, 30], forearmL: [-20, 0, 0], upperArmR: [-170, 0, -30], forearmR: [-20, 0, 0] } },
    { t: 1.45, ease: 'in', hipsPos: [0, -0.5, 0.2], chest: [50, 0, 0], spine: [22, 0, 0], head: [-20, 0, 0], footL: [0.2, 0.08, 0.3], footR: [-0.2, 0.08, -0.1], fk: { upperArmL: [-60, 0, 10], forearmL: [-5, 0, 0], upperArmR: [-60, 0, -10], forearmR: [-5, 0, 0] } },
    { t: 2.0, hipsPos: [0, -0.44, 0.16], chest: [46, 0, 0], spine: [20, 0, 0] },
    x9r(2.5),
  ], X9_S)),
  /** Flailing: right, left, then both arms overhead — each blow told by the one before (0.7 s tell). */
  x9Flail: new Clip('x9Flail', scaled([
    x9r(0),
    { t: 0.65, ease: 'out', chest: [10, -36, 0], hipsPos: [0, -0.12, -0.04], fk: { upperArmR: [30, 0, -100], forearmR: [-40, 0, 0], upperArmL: [-10, 0, 24], forearmL: [-50, 0, 0] } },
    { t: 0.8, ease: 'out', chest: [22, 30, 0], hipsPos: [0, -0.16, 0.1], footL: [0.15, 0.08, 0.25], fk: { upperArmR: [-90, 0, 40], forearmR: [-10, 0, 0], upperArmL: [30, 0, 90], forearmL: [-40, 0, 0] } },
    { t: 1.1, ease: 'out', chest: [22, -30, 0], hipsPos: [0, -0.16, 0.16], footR: [-0.15, 0.08, 0.3], fk: { upperArmL: [-90, 0, -40], forearmL: [-10, 0, 0], upperArmR: [0, 0, -40], forearmR: [-30, 0, 0] } },
    { t: 1.45, ease: 'out', chest: [-16, 0, 0], hipsPos: [0, 0, 0.1], fk: { upperArmL: [-170, 0, 20], forearmL: [-30, 0, 0], upperArmR: [-170, 0, -20], forearmR: [-30, 0, 0] } },
    { t: 1.6, ease: 'in', chest: [48, 0, 0], spine: [20, 0, 0], hipsPos: [0, -0.4, 0.3], footL: [0.16, 0.08, 0.5], fk: { upperArmL: [-60, 0, 6], forearmL: [-6, 0, 0], upperArmR: [-60, 0, -6], forearmR: [-6, 0, 0] } },
    { t: 2.1, chest: [44, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.36, 0.26] },
    x9r(2.6),
  ], X9_S)),
  /** The jars burst: it hugs itself and swells (1.4 s tell), then flings its arms wide. */
  x9Burst: new Clip('x9Burst', scaled([
    x9r(0),
    { t: 1.3, ease: 'out', chest: [44, 0, 0], spine: [20, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.3, 0], fk: { upperArmL: [-60, 0, -50], forearmL: [-110, 0, 0], upperArmR: [-60, 0, 50], forearmR: [-110, 0, 0] } },
    { t: 1.45, ease: 'out', chest: [-30, 0, 0], spine: [-14, 0, 0], head: [-30, 0, 0], hipsPos: [0, 0, -0.05], fk: { upperArmL: [-60, 0, 110], forearmL: [-10, 0, 0], upperArmR: [-60, 0, -110], forearmR: [-10, 0, 0] } },
    { t: 2.0, chest: [-20, 0, 0], head: [-20, 0, 0] },
    x9r(2.5),
  ], X9_S)),
  x9Roar: new Clip('x9Roar', scaled([
    x9r(0),
    { t: 0.8, ease: 'out', chest: [-30, 0, 0], spine: [-14, 0, 0], head: [-36, 0, 0], hipsPos: [0, 0.02, -0.1], fk: { upperArmL: [-120, 0, 70], forearmL: [-30, 0, 0], upperArmR: [-120, 0, -70], forearmR: [-30, 0, 0] } },
    { t: 2.2, chest: [-34, 0, 4], head: [-40, 10, 0] },
    x9r(3.0),
  ], X9_S)),
  x9Death: new Clip('x9Death', scaled([
    { t: 0 },
    { t: 0.8, ease: 'out', hipsPos: [0, -0.45, 0], chest: [30, 0, 10], head: [20, 0, 0], footL: [0.14, 0.08, 0.3], footR: [-0.14, 0.12, -0.3] },
    { t: 1.8, ease: 'in', hipsPos: [0, -0.88, 0.3], hips: [84, 0, 10], chest: [6, 0, 0], head: [-16, 30, 0], fk: { upperArmL: [-150, 0, 40], forearmL: [-20, 0, 0], upperArmR: [-30, 0, -40], forearmR: [-30, 0, 0] } },
  ], X9_S)),
};

// ---------------------------------------------------------------------------------- Keeper Orrow

const orS = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: STAFF_HOLD, handL: null, chest: [0, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.03, 0], head: [2, 0, 0], fk: { upperArmL: [-30, 0, -25], forearmL: [-80, 0, 0], handL: [0, 0, 0] } });
const orB = (t: number, ease: Key['ease'] = 'inout'): Key => ({ t, ease, handR: BLADE_REST, handL: null, chest: [2, -8, 0], spine: [0, -2, 0], hips: [0, -4, 0], hipsPos: [0, -0.06, 0], head: [0, 6, 0], fk: { upperArmL: [-10, 0, 20], forearmL: [-40, 0, 0], handL: [0, 0, 0] } });
const BEAM_R = H([-0.18, 1.34, 0.22], [0.03, 0.08, 1], { up: [0, 1, 0], elbow: [-0.8, -0.4, -0.3] });
const BEAM_L = H([-0.1, 1.36, 0.56], [0.03, 0.08, 1], { up: [0, 1, 0], elbow: [0.8, -0.6, 0] });

const orrow = {
  /** Staff strike across the body (0.55 s tell) — a follow-up backhand may come, told by the first. */
  orrowStrike: new Clip('orrowStrike', [
    orS(0),
    { t: 0.52, ease: 'out', handR: H([-0.36, 1.5, -0.2], [-0.3, 0.62, -0.72], { up: [0, 0.72, 0.62], elbow: [-0.9, 0, -0.2] }), chest: [-8, -30, 0], spine: [-3, -12, 0], hips: [0, -8, 0], head: [4, 14, 0] },
    { t: 0.66, ease: 'in', handR: H([0.14, 1.2, 0.52], [0.8, 0.2, 0.55], { up: [0, 1, 0] }), chest: [10, 26, 0], spine: [6, 10, 0], hips: [0, 8, 0], hipsPos: [0, -0.1, 0.08], footL: [0.12, 0.08, 0.3] },
    { t: 1.0, handR: H([0.16, 1.18, 0.48], [0.82, 0.15, 0.55], { up: [0, 1, 0] }), chest: [8, 24, 0] },
    orS(1.4),
  ]),
  orrowStrike2: new Clip('orrowStrike2', [
    { t: 0, handR: H([0.16, 1.18, 0.48], [0.82, 0.15, 0.55], { up: [0, 1, 0] }), chest: [8, 24, 0], spine: [6, 10, 0], hipsPos: [0, -0.1, 0.08] },
    { t: 0.32, ease: 'out', handR: H([0.3, 1.45, 0.05], [0.7, 0.6, -0.4], { up: [0, 1, 0] }), chest: [0, 32, 0], spine: [0, 12, 0] },
    { t: 0.44, ease: 'in', handR: H([-0.36, 1.15, 0.45], [-0.85, 0.1, 0.5], { up: [0, 1, 0] }), chest: [12, -28, 0], spine: [6, -10, 0], hipsPos: [0, -0.12, 0.1], footR: [-0.12, 0.08, 0.3] },
    { t: 0.8, handR: H([-0.35, 1.14, 0.42], [-0.85, 0.05, 0.5], { up: [0, 1, 0] }), chest: [10, -26, 0] },
    orS(1.2),
  ]),
  /** Glass shards: the lens-head levelled at the Returned, three shards loosed (0.9 s tell). */
  orrowShards: new Clip('orrowShards', [
    orS(0),
    { t: 0.55, ease: 'out', handR: H([-0.2, 1.42, 0.36], [0.02, 0.55, 0.84], { up: [0, 0.84, -0.55] }), fk: { upperArmL: [-90, 0, -30], forearmL: [-30, 0, 0], handL: [0, 0, 20] }, chest: [-6, -10, 0], spine: [-2, -4, 0], head: [-4, 6, 0], footR: [-0.12, 0.08, -0.22] },
    { t: 0.9, handR: H([-0.2, 1.44, 0.3], [0.02, 0.6, 0.8], { up: [0, 0.8, -0.6] }), chest: [-8, -12, 0] },
    { t: 1.0, ease: 'out', handR: H([-0.16, 1.4, 0.5], [0.02, 0.4, 0.92], { up: [0, 0.92, -0.4] }), chest: [6, 4, 0], footL: [0.12, 0.08, 0.22] },
    { t: 1.4, handR: H([-0.17, 1.38, 0.46], [0.02, 0.45, 0.9], { up: [0, 0.9, -0.45] }), chest: [4, 2, 0] },
    orS(1.8),
  ]),
  /** The beam: the staff levelled like a lance and steadied with the free hand (1.7 s tell). */
  orrowBeam: new Clip('orrowBeam', [
    orS(0),
    { t: 0.45, ease: 'out', handR: BEAM_R, handL: BEAM_L, chest: [4, -6, 0], spine: [2, -2, 0], hipsPos: [0, -0.1, -0.02], footR: [-0.13, 0.08, -0.28], footL: [0.13, 0.08, 0.2], head: [4, 4, 0] },
    { t: 1.35, handR: { ...BEAM_R, p: [-0.18, 1.32, 0.18] }, handL: BEAM_L, chest: [8, -8, 0], hipsPos: [0, -0.14, -0.04] },
    { t: 1.72, ease: 'out', handR: { ...BEAM_R, p: [-0.18, 1.36, 0.02] }, handL: { ...BEAM_L, p: [-0.1, 1.38, 0.4] }, chest: [-8, -6, 0], hipsPos: [0, -0.08, -0.12] },
    { t: 2.2, handR: BEAM_R, handL: BEAM_L, chest: [2, -4, 0] },
    orS(2.6),
  ]),
  /** Re-alignment: the staff raised overhead, then its heel struck on the floor; the lenses turn. */
  orrowRealign: new Clip('orrowRealign', [
    orS(0),
    { t: 0.6, ease: 'out', handR: H([-0.14, 1.88, 0.06], [0, 1, 0.04], { up: [0, -0.04, 1], elbow: [-0.8, 0.2, -0.3] }), fk: { upperArmL: [-150, 0, -30], forearmL: [-20, 0, 0], handL: [0, 0, -20] }, chest: [-14, 0, 0], spine: [-6, 0, 0], head: [-16, 0, 0] },
    { t: 0.95, handR: H([-0.14, 1.92, 0.06], [0, 1, 0.04], { up: [0, -0.04, 1] }), chest: [-16, 0, 0] },
    { t: 1.05, ease: 'in', handR: H([-0.16, 1.0, 0.34], [0, 1, 0.1], { up: [0, -0.1, 1] }), fk: { upperArmL: [-40, 0, -20], forearmL: [-60, 0, 0] }, chest: [16, 0, 0], spine: [6, 0, 0], hipsPos: [0, -0.18, 0.04], head: [4, 0, 0] },
    { t: 1.35, handR: H([-0.16, 1.0, 0.34], [0, 1, 0.1], { up: [0, -0.1, 1] }), chest: [12, 0, 0], hipsPos: [0, -0.14, 0.02] },
    orS(1.7),
  ]),
  /** Transition I: she breaks the lens of her staff on the floor and draws a blade of its glass. */
  orrowShatter: new Clip('orrowShatter', [
    orS(0),
    { t: 0.7, ease: 'out', handR: H([-0.12, 1.9, 0.12], [0, 0.9, 0.4], { up: [0, -0.4, 0.9] }), fk: { upperArmL: [-160, 0, -20], forearmL: [-20, 0, 0] }, chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-14, 0, 0] },
    { t: 1.2, ease: 'in', handR: H([-0.1, 0.72, 0.55], [0, -0.85, 0.5], { up: [0, 0.5, 0.85] }), fk: { upperArmL: [-60, 0, -10], forearmL: [-40, 0, 0] }, chest: [40, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.3, 0.1], footL: [0.14, 0.08, 0.3], head: [-10, 0, 0] },
    { t: 1.8, handR: H([0.14, 0.95, 0.2], [-0.2, -0.6, 0.75], { up: [0, 0.75, 0.6] }), chest: [20, 20, 0], spine: [8, 8, 0], hipsPos: [0, -0.2, 0.05] },
    { t: 2.5, ease: 'out', handR: H([-0.4, 1.25, 0.3], [-0.7, 0.55, 0.45]), chest: [0, -24, 0], spine: [0, -8, 0], hipsPos: [0, -0.08, 0], head: [0, 10, 0] },
    orB(3.2),
  ]),
  orrowCut: new Clip('orrowCut', [
    orB(0),
    { t: 0.46, ease: 'out', handR: H([-0.38, 1.58, -0.08], [-0.35, 0.7, -0.62], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -30, 0], spine: [-4, -12, 0], hips: [0, -10, 0], head: [6, 16, 0] },
    { t: 0.56, ease: 'in', handR: H([-0.1, 1.24, 0.56], [0.35, 0.25, 0.9]), chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: [0.12, 0.08, 0.3] },
    { t: 0.66, ease: 'out', handR: H([0.28, 0.8, 0.4], [0.85, -0.45, 0.28]), chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.12, 0.08] },
    { t: 0.95, handR: H([0.26, 0.82, 0.38], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.12, 0.07] },
    orB(1.3),
  ]),
  orrowCut2: new Clip('orrowCut2', [
    { t: 0, handR: H([0.26, 0.82, 0.38], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.12, 0.07] },
    { t: 0.28, ease: 'out', handR: H([0.34, 1.1, 0.1], [0.85, 0.25, -0.45], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.38, ease: 'in', handR: H([0, 1.22, 0.6], [-0.2, 0.3, 0.93]), chest: [4, 0, 0], footR: [-0.13, 0.08, 0.25] },
    { t: 0.48, ease: 'out', handR: H([-0.44, 1.3, 0.3], [-0.92, 0.3, 0.2]), chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.06] },
    { t: 0.8, handR: H([-0.42, 1.28, 0.26], [-0.88, 0.4, 0.1]), chest: [-2, -26, 0] },
    orB(1.1),
  ]),
  orrowLunge: new Clip('orrowLunge', [
    orB(0),
    { t: 0.66, ease: 'out', handR: H([-0.3, 1.1, -0.3], [0, 0.06, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), fk: { upperArmL: [-60, 0, 40], forearmL: [-20, 0, 0] }, chest: [2, -40, 0], spine: [0, -14, 0], hips: [0, -12, 0], hipsPos: [0, -0.16, -0.1], footR: [-0.14, 0.08, -0.36] },
    { t: 0.78, ease: 'out', handR: H([-0.04, 1.24, 0.82], [0.02, -0.02, 1], { up: [0, 1, 0] }), fk: { upperArmL: [30, 0, 50], forearmL: [-10, 0, 0] }, chest: [14, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.22, 0.16], footL: [0.13, 0.08, 0.6] },
    { t: 1.15, handR: H([-0.05, 1.22, 0.78], [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
    orB(1.6),
  ]),
  /** A turning cut through a full circle (0.9 s tell, unparryable ring marker). */
  orrowSpin: new Clip('orrowSpin', [
    orB(0),
    { t: 0.85, ease: 'out', handR: H([0.3, 1.2, -0.2], [0.8, 0.2, -0.55]), chest: [4, 50, 0], spine: [2, 20, 0], hips: [0, 16, 0], hipsPos: [0, -0.14, 0], fk: { upperArmL: [-30, 0, 60], forearmL: [-20, 0, 0] } },
    { t: 1.0, ease: 'linear', handR: H([-0.6, 1.1, 0.2], [-0.95, 0, 0.3]), hips: [0, -90, 0], chest: [4, -20, 0] },
    { t: 1.15, ease: 'linear', hips: [0, -200, 0] },
    { t: 1.32, ease: 'out', hips: [0, -330, 0], chest: [8, -30, 0] },
    { t: 1.6, hips: [0, -360, 0], chest: [8, -26, 0], handR: H([-0.5, 1.05, 0.3], [-0.9, -0.2, 0.35]) },
    { t: 2.0, ease: 'inout', hips: [0, -360, 0], handR: BLADE_REST, chest: [2, -8, 0], spine: [0, -2, 0], hipsPos: [0, -0.06, 0] },
  ]),
  /** Transition II: she kneels, lays her palm on the lenses, and rises preserved (the Preserved Hour). */
  orrowPreserve: new Clip('orrowPreserve', [
    orB(0),
    { t: 0.8, ease: 'out', hipsPos: [0, -0.45, 0], hips: [8, 0, 0], spine: [12, 0, 0], chest: [24, 0, 0], head: [20, 0, 0], footL: [0.14, 0.08, 0.34], footR: [-0.13, 0.12, -0.42], footPitchR: -60, fk: { upperArmL: [-60, 0, 10], forearmL: [-20, 0, 0] } },
    { t: 1.9, hipsPos: [0, -0.45, 0], chest: [30, 0, 0], head: [10, 0, 0] },
    { t: 2.5, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [-4, 0, 0], chest: [-10, 0, 0], head: [-12, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [-100, 0, 40], forearmL: [-20, 0, 0] } },
    orB(2.8),
  ]),
  /** The Falling Hour: blade raised to the sky, marking the ground where the light will fall. */
  orrowHour: new Clip('orrowHour', [
    orB(0),
    { t: 0.6, ease: 'out', handR: H([-0.1, 1.92, 0.1], [0, 1, 0.05], { up: [0, 0, 1], elbow: [-0.8, 0.2, -0.3] }), fk: { upperArmL: [-80, 0, 40], forearmL: [-30, 0, 0] }, chest: [-16, 0, 0], spine: [-6, 0, 0], head: [-24, 0, 0] },
    { t: 1.4, handR: H([-0.1, 1.94, 0.1], [0, 1, 0.05], { up: [0, 0, 1] }), chest: [-18, 0, 0], head: [-26, 0, 0] },
    orB(2.0),
  ]),
};

export const academyClips = { ...acolyte, ...warden, ...choir, ...echo, ...homunculus, ...golem, ...x9, ...orrow };
