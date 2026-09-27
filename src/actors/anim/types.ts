/**
 * Animation authoring types.
 *
 * Poses are authored in the actor's ROOT space (character faces +Z, right side is -X, y=0 ground).
 * Hands are placed with IK by giving the grip position and the held item's orientation, so weapon
 * arcs are exactly what is authored (and exactly what hits — see combat/HitSystem).
 */
import type { BoneName, SocketName } from '../rigDefs';

export type V3 = [number, number, number];
export type Ease = 'linear' | 'in' | 'out' | 'inout' | 'hold' | 'smooth';

/** Where an IK hand should be. */
export interface HandKey {
  /** Grip position (root space, metres). */
  p: V3;
  /** Direction of the held item's +Y (blade/shaft; shield: top edge), root space. */
  dir: V3;
  /** Direction of the held item's +Z (blade edge; shield: face normal), root space. Optional. */
  up?: V3;
  /** Elbow pole direction (root space). Defaults to back-outward-down. */
  elbow?: V3;
  /** Which socket frame `p/dir/up` describe. Defaults to weaponR / weaponL. */
  socket?: SocketName;
}

/** One key. Unspecified channels are interpolated from neighbouring keys that do specify them. */
export interface Key {
  t: number;
  /** Easing used to arrive at this key from the previous key of each channel. */
  ease?: Ease;
  /** Hips translation offset from rest (metres). */
  hipsPos?: V3;
  /** Euler degrees (XYZ) for trunk bones. */
  hips?: V3; spine?: V3; chest?: V3; neck?: V3; head?: V3;
  handR?: HandKey | null;
  handL?: HandKey | null;
  /** Ankle positions in root space. */
  footL?: V3; footR?: V3;
  /** Foot pitch in degrees (+ = toes up). */
  footPitchL?: number; footPitchR?: number;
  /** Direct FK Euler degrees for arm bones when the hand is not IK-driven. */
  fk?: Partial<Record<BoneName, V3>>;
}

/** A fully sampled pose, ready for the solver. */
export interface PoseSpec {
  hipsPos: V3;
  hips: V3; spine: V3; chest: V3; neck: V3; head: V3;
  handR: HandKey | null;
  handL: HandKey | null;
  footL: V3; footR: V3;
  footPitchL: number; footPitchR: number;
  fk: Partial<Record<BoneName, V3>>;
}

export const TRUNK = ['hips', 'spine', 'chest', 'neck', 'head'] as const;
