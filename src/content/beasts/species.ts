/**
 * Breed dimensions (see body.ts). Lengths are metres at rig scale 1 and scale with `s`.
 */
import type { QuadDims } from './body';

/** Royal Army war hound: a big, deep-chested mastiff in barding. */
export const WAR_HOUND: QuadDims = {
  id: 'wh', s: 1.0, bulk: 1.3, shoulder: 0.62,
  hipH: 0.86, hipsZ: -0.3,
  trunk: { hips: [104, 0, 0], spine: [-2, 0, 0], chest: [-4, 0, 0], neck: [-72, 0, 0], head: [66, 0, 0] },
  frontOut: 0.0, hindOut: 0.02, frontFwd: 0.04, hindFwd: 0.0,
  grip: 0.13, meta: 0.22, metaPitch: -80, pawR: 0.035,
};

/** Royal Household hunting hound: lean, long-legged sighthound. */
export const HUNTING_HOUND: QuadDims = {
  id: 'hh', s: 0.86, bulk: 0.78, shoulder: 0.55,
  hipH: 0.88, hipsZ: -0.3,
  trunk: { hips: [102, 0, 0], spine: [-4, 0, 0], chest: [-4, 0, 0], neck: [-66, 0, 0], head: [62, 0, 0] },
  frontOut: 0.0, hindOut: 0.01, frontFwd: 0.05, hindFwd: 0.0,
  grip: 0.13, meta: 0.24, metaPitch: -80, pawR: 0.03,
};

/** Carrion stag: a gaunt, antlered carrion-eater from the royal chase (heavy variant). */
export const CARRION_STAG: QuadDims = {
  id: 'cs', s: 1.22, bulk: 1.05, shoulder: 0.58,
  hipH: 0.9, hipsZ: -0.32,
  trunk: { hips: [98, 0, 0], spine: [-2, 0, 0], chest: [-8, 0, 0], neck: [-92, 0, 0], head: [80, 0, 0] },
  frontOut: 0.0, hindOut: 0.0, frontFwd: 0.02, hindFwd: 0.02,
  grip: 0.16, meta: 0.3, metaPitch: -84, pawR: 0.03,
};
