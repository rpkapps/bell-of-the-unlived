/**
 * Breed dimensions (see body.ts). Lengths are metres at rig scale 1 and scale with `s`.
 */
import type { QuadDims } from './body';

/** Royal Army war hound: a big, deep-chested mastiff in barding. */
export const WAR_HOUND: QuadDims = {
  id: 'wh', s: 1.0, bulk: 1.3, shoulder: 0.62,
  hipH: 0.82, hipsZ: -0.3,
  trunk: { hips: [106, 0, 0], spine: [-2, 0, 0], chest: [-6, 0, 0], neck: [-84, 0, 0], head: [76, 0, 0] },
  frontOut: 0.0, hindOut: 0.02, frontFwd: 0.04, hindFwd: 0.0,
  grip: 0.19, meta: 0.22, metaPitch: -80, pawR: 0.035,
};

/** Royal Household hunting hound: lean, long-legged sighthound. */
export const HUNTING_HOUND: QuadDims = {
  id: 'hh', s: 0.86, bulk: 0.92, shoulder: 0.55,
  hipH: 0.84, hipsZ: -0.3,
  trunk: { hips: [105, 0, 0], spine: [-4, 0, 0], chest: [-4, 0, 0], neck: [-70, 0, 0], head: [64, 0, 0] },
  frontOut: 0.0, hindOut: 0.01, frontFwd: 0.05, hindFwd: 0.0,
  grip: 0.2, meta: 0.24, metaPitch: -80, pawR: 0.03,
};

/** Carrion stag: a gaunt, antlered carrion-eater from the royal chase (heavy variant). */
export const CARRION_STAG: QuadDims = {
  id: 'cs', s: 1.22, bulk: 1.05, shoulder: 0.58,
  hipH: 0.9, hipsZ: -0.32,
  trunk: { hips: [100, 0, 0], spine: [-6, 0, 0], chest: [-24, 0, 0], neck: [-70, 0, 0], head: [82, 0, 0] },
  frontOut: 0.0, hindOut: 0.0, frontFwd: 0.02, hindFwd: 0.02,
  grip: 0.35, meta: 0.3, metaPitch: -84, pawR: 0.03,
};
