/**
 * Clips shared by every humanoid: dodges, flask, reactions, vulnerable poses, death, critical
 * victims, interactions. Hands are left free (null → FK) where the held item doesn't matter.
 */
import { Clip } from '../Clip';
import type { Key, V3 } from '../types';

const tuckArms = { upperArmL: [-40, 0, 10] as V3, forearmL: [-90, 0, 0] as V3, upperArmR: [-40, 0, -10] as V3, forearmR: [-90, 0, 0] as V3 };
const legs = (tl: number, sl: number, tr = tl, sr = sl) => ({ thighL: [tl, 0, 4] as V3, shinL: [sl, 0, 0] as V3, thighR: [tr, 0, -4] as V3, shinR: [sr, 0, 0] as V3 });

/** Lying face-down (end of death / knockdown). */
const PRONE: Omit<Key, 't'> = {
  hipsPos: [0, -0.84, 0.3], hips: [86, 0, 0], spine: [4, 0, 0], chest: [2, 0, 0], neck: [-20, 0, 0], head: [-10, 30, 0],
  handR: null, handL: null, fk: { ...legs(-4, 8, 6, 20), upperArmL: [-150, 0, 30], forearmL: [-20, 0, 0], upperArmR: [-20, 0, -30], forearmR: [-30, 0, 0] },
};
const KNEEL: Omit<Key, 't'> = {
  hipsPos: [0, -0.45, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [18, 0, 0], neck: [10, 0, 0], head: [18, 0, 0],
  footL: [0.14, 0.08, 0.34], footR: [-0.13, 0.12, -0.42], footPitchR: -60, handL: null, handR: null,
  fk: { upperArmL: [-10, 0, 12], forearmL: [-20, 0, 0], upperArmR: [-10, 0, -12], forearmR: [-20, 0, 0] },
};

export const genericClips = {
  /** Forward roll (FK legs & arms tucked). Duration is scaled by the load class. */
  roll: new Clip('roll', [
    { t: 0, hipsPos: [0, -0.12, 0.05], hips: [25, 0, 0], spine: [15, 0, 0], chest: [15, 0, 0], head: [20, 0, 0], handR: null, handL: null, fk: { ...legs(-50, 70), ...tuckArms } },
    { t: 0.12, hipsPos: [0, -0.38, 0.12], hips: [105, 0, 0], spine: [25, 0, 0], chest: [20, 0, 0], head: [30, 0, 0], fk: { ...legs(-115, 135), ...tuckArms } },
    { t: 0.26, hipsPos: [0, -0.5, 0.05], hips: [205, 0, 0], fk: { ...legs(-120, 140), ...tuckArms } },
    { t: 0.4, hipsPos: [0, -0.42, 0], hips: [295, 0, 0], spine: [20, 0, 0], fk: { ...legs(-100, 120), ...tuckArms } },
    { t: 0.52, hipsPos: [0, -0.22, 0], hips: [345, 0, 0], spine: [15, 0, 0], chest: [10, 0, 0], head: [5, 0, 0], fk: { ...legs(-55, 80), ...tuckArms } },
    { t: 0.66, hipsPos: [0, -0.08, 0], hips: [360, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], head: [0, 0, 0], fk: { ...legs(-18, 26), upperArmL: [-10, 0, 8], forearmL: [-30, 0, 0], upperArmR: [-10, 0, -8], forearmR: [-30, 0, 0] } },
  ]),

  /** Backstep hop. */
  backstep: new Clip('backstep', [
    { t: 0, hipsPos: [0, -0.06, 0], spine: [-4, 0, 0] },
    { t: 0.1, ease: 'out', hipsPos: [0, 0.02, -0.05], spine: [-10, 0, 0], chest: [-6, 0, 0], footL: [0.13, 0.2, -0.05], footR: [-0.13, 0.18, -0.1] },
    { t: 0.26, hipsPos: [0, -0.1, -0.02], spine: [4, 0, 0], chest: [2, 0, 0], footL: [0.13, 0.08, 0.05], footR: [-0.13, 0.08, -0.2] },
    { t: 0.45, hipsPos: [0, -0.04, 0], spine: [0, 0, 0], chest: [0, 0, 0] },
  ]),

  /** Drink the Recall Flask with the left hand (upper body; legs keep walking). */
  drink: new Clip('drink', [
    { t: 0, handL: null, fk: { upperArmL: [5, 0, 8], forearmL: [-20, 0, 0] } },
    { t: 0.3, ease: 'out', handL: null, fk: { upperArmL: [-65, 0, -18], forearmL: [-125, 0, 0], handL: [0, 0, 20] }, head: [-6, 0, 0] },
    { t: 0.42, fk: { upperArmL: [-80, 0, -20], forearmL: [-130, 0, 0], handL: [0, 0, 40] }, head: [-22, 0, 0], neck: [-8, 0, 0] },
    { t: 0.72, fk: { upperArmL: [-78, 0, -20], forearmL: [-130, 0, 0], handL: [0, 0, 40] }, head: [-22, 0, 0], neck: [-8, 0, 0] },
    { t: 1.0, ease: 'inout', fk: { upperArmL: [5, 0, 8], forearmL: [-20, 0, 0], handL: [0, 0, 0] }, head: [0, 0, 0], neck: [0, 0, 0] },
  ]),

  hurtLight: new Clip('hurtLight', [
    { t: 0 },
    { t: 0.07, ease: 'out', chest: [-14, 6, 0], spine: [-6, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.06, -0.03] },
    { t: 0.42, ease: 'inout', chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  hurtHeavy: new Clip('hurtHeavy', [
    { t: 0 },
    { t: 0.1, ease: 'out', chest: [-26, 10, 0], spine: [-12, 0, 0], head: [-20, 0, 0], hipsPos: [0, -0.1, -0.08], footR: [-0.13, 0.12, -0.25] },
    { t: 0.45, chest: [12, 0, 0], spine: [8, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.16, -0.04], footR: [-0.13, 0.08, -0.35] },
    { t: 0.85, ease: 'inout', chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  /** Guard broken: shield/off-arm thrown up and wide, stumbling back (vulnerable). */
  guardBroken: new Clip('guardBroken', [
    { t: 0 },
    { t: 0.12, ease: 'out', handL: null, fk: { upperArmL: [-150, 0, 40], forearmL: [-30, 0, 0], upperArmR: [-40, 0, -50], forearmR: [-30, 0, 0] }, handR: null, chest: [-24, -10, 0], spine: [-10, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.06, -0.1], footL: [0.14, 0.12, -0.2] },
    { t: 1.0, fk: { upperArmL: [-130, 0, 35], forearmL: [-35, 0, 0], upperArmR: [-30, 0, -45], forearmR: [-30, 0, 0] }, chest: [-18, -8, 0], spine: [-8, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.08, -0.08], footL: [0.14, 0.08, -0.3] },
    { t: 1.4, ease: 'inout', fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  /** Parried: reeling, arms thrown wide, chest open (vulnerable). */
  parried: new Clip('parried', [
    { t: 0 },
    { t: 0.12, ease: 'out', handR: null, handL: null, fk: { upperArmR: [-120, 0, -60], forearmR: [-20, 0, 0], upperArmL: [-60, 0, 60], forearmL: [-20, 0, 0] }, chest: [-28, 0, 0], spine: [-12, 0, 0], head: [-22, 0, 0], hipsPos: [0, -0.02, -0.12], footR: [-0.13, 0.1, -0.3] },
    { t: 1.3, fk: { upperArmR: [-100, 0, -55], forearmR: [-25, 0, 0], upperArmL: [-50, 0, 55], forearmL: [-25, 0, 0] }, chest: [-22, 0, 0], spine: [-10, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.06, -0.1] },
    { t: 1.7, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0], upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  /** Posture broken: dropped to one knee (vulnerable). */
  postureBroken: new Clip('postureBroken', [
    { t: 0 },
    { t: 0.3, ease: 'out', ...KNEEL },
    { t: 2.1, ...KNEEL, chest: [14, 0, 0], head: [10, 0, 0] },
    { t: 2.6, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),

  death: new Clip('death', [
    { t: 0 },
    { t: 0.35, ease: 'out', ...KNEEL, head: [30, 0, 0] },
    { t: 0.6, ...KNEEL, chest: [30, 0, 0], head: [30, 0, 0] },
    { t: 1.1, ease: 'in', ...PRONE },
    { t: 1.3, ...PRONE, hipsPos: [0, -0.86, 0.32] },
  ]),

  /** Victim of a backstab: jolt, arch, drop face-down, then rise (if alive) from ~2.4 s. */
  victimBack: new Clip('victimBack', [
    { t: 0, handR: null, handL: null },
    { t: 0.4, ease: 'out', chest: [-28, 0, 0], spine: [-14, 0, 0], head: [-30, 0, 0], hipsPos: [0, 0.02, 0.05], fk: { upperArmL: [-40, 0, 40], forearmL: [-40, 0, 0], upperArmR: [-40, 0, -40], forearmR: [-40, 0, 0] } },
    { t: 0.95, chest: [-30, 0, 0], spine: [-16, 0, 0], head: [-30, 0, 0] },
    { t: 1.5, ease: 'in', ...PRONE },
    { t: 2.4, ...PRONE },
    { t: 3.0, ease: 'out', ...KNEEL },
    { t: 3.5, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),

  /** Victim of a frontal critical: doubled over the blade, thrown back, rise. */
  victimFront: new Clip('victimFront', [
    { t: 0, handR: null, handL: null },
    { t: 0.42, ease: 'out', chest: [32, 0, 0], spine: [16, 0, 0], head: [20, 0, 0], hipsPos: [0, -0.1, 0], fk: { upperArmL: [-50, 0, -10], forearmL: [-60, 0, 0], upperArmR: [-50, 0, 10], forearmR: [-60, 0, 0] } },
    { t: 0.9, chest: [36, 0, 0], spine: [18, 0, 0], head: [24, 0, 0], hipsPos: [0, -0.16, -0.05] },
    { t: 1.35, ease: 'in', hipsPos: [0, -0.86, -0.3], hips: [-84, 0, 0], spine: [-4, 0, 0], chest: [0, 0, 0], neck: [10, 0, 0], head: [10, 20, 0], fk: { ...legs(-10, 20, -4, 30), upperArmL: [-20, 0, 60], forearmL: [-20, 0, 0], upperArmR: [-10, 0, -50], forearmR: [-30, 0, 0] } },
    { t: 2.4, hipsPos: [0, -0.86, -0.3], hips: [-84, 0, 0] },
    { t: 3.0, ease: 'out', ...KNEEL },
    { t: 3.5, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),

  /** Victim of a plunge while kneeling. */
  victimDown: new Clip('victimDown', [
    { t: 0, ...KNEEL },
    { t: 0.55, ...KNEEL, chest: [30, 0, 0], head: [34, 0, 0] },
    { t: 1.1, ease: 'in', ...PRONE },
    { t: 2.2, ...PRONE },
    { t: 2.8, ease: 'out', ...KNEEL },
    { t: 3.3, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),

  /** Reach and use (hatch ring, lever, door, pickup). */
  interact: new Clip('interact', [
    { t: 0 },
    { t: 0.3, ease: 'out', handR: null, fk: { upperArmR: [-55, 0, -10], forearmR: [-30, 0, 0] }, chest: [22, 0, 0], spine: [14, 0, 0], hipsPos: [0, -0.2, 0.04] },
    { t: 0.55, fk: { upperArmR: [-20, 0, -10], forearmR: [-60, 0, 0] }, chest: [10, 0, 0], spine: [4, 0, 0], hipsPos: [0, -0.12, 0] },
    { t: 0.9, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  pickup: new Clip('pickup', [
    { t: 0 },
    { t: 0.35, ease: 'out', handR: null, fk: { upperArmR: [-40, 0, -6], forearmR: [-15, 0, 0] }, chest: [30, 0, 0], spine: [22, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.35, 0], footL: [0.14, 0.08, 0.2] },
    { t: 0.6, chest: [26, 0, 0], spine: [20, 0, 0], hipsPos: [0, -0.33, 0] },
    { t: 1.0, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0], footL: [0.12, 0.08, 0.02] },
  ]),

  /** Heave a lever down with both hands. */
  lever: new Clip('lever', [
    { t: 0 },
    { t: 0.4, ease: 'out', handR: null, handL: null, fk: { upperArmR: [-150, 0, 5], forearmR: [-20, 0, 0], upperArmL: [-150, 0, -5], forearmL: [-20, 0, 0] }, chest: [-6, 0, 0], hipsPos: [0, -0.02, 0] },
    { t: 0.9, ease: 'in', fk: { upperArmR: [-50, 0, 5], forearmR: [-40, 0, 0], upperArmL: [-50, 0, -5], forearmL: [-40, 0, 0] }, chest: [26, 0, 0], spine: [12, 0, 0], hipsPos: [0, -0.22, 0] },
    { t: 1.4, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0], upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.04, 0] },
  ]),

  /** Kneel at a Stillbell (loops while resting). */
  rest: new Clip('rest', [
    { t: 0, ...KNEEL, chest: [10, 0, 0], head: [16, 0, 0], fk: { upperArmL: [-30, 0, -10], forearmL: [-60, 0, 0], upperArmR: [-30, 0, 10], forearmR: [-60, 0, 0] } },
  ], { loop: true, duration: 2 }),
  /** Rise from the Stillbell. */
  rise: new Clip('rise', [
    { t: 0, ...KNEEL, chest: [10, 0, 0], head: [16, 0, 0], fk: { upperArmL: [-30, 0, -10], forearmL: [-60, 0, 0], upperArmR: [-30, 0, 10], forearmR: [-60, 0, 0] } },
    { t: 0.8, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),
  /** Re-forming at a Stillbell after death: rising from prone. */
  reform: new Clip('reform', [
    { ...PRONE, t: 0 },
    { t: 0.9, ease: 'out', ...KNEEL },
    { t: 1.6, ease: 'inout', hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03], footPitchR: 0, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0], upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] } },
  ]),
  /** Throw a knife (right arm, overhand). */
  throw: new Clip('throw', [
    { t: 0 },
    { t: 0.2, ease: 'out', handR: null, fk: { upperArmR: [-150, 0, -30], forearmR: [-60, 0, 0] }, chest: [-4, -24, 0] },
    { t: 0.3, ease: 'in', fk: { upperArmR: [-70, 0, -8], forearmR: [-10, 0, 0] }, chest: [8, 12, 0] },
    { t: 0.62, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0] },
  ]),
};
