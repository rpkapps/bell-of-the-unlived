/**
 * Holding stances (idle/locomotion hand placements) per weapon archetype.
 * Root space: +Z forward, -X = character's right, y up. Shoulders ≈ (±0.19, 1.44, 0).
 */
import type { Stance } from '../locomotion';
import type { HandKey } from '../types';

export const SHIELD_REST: HandKey = { socket: 'shieldL', p: [0.27, 0.98, 0.24], dir: [0.1, 0.92, 0.35], up: [0.45, -0.1, 0.88] };
export const SHIELD_GUARD: HandKey = { socket: 'shieldL', p: [0.1, 1.2, 0.36], dir: [0.02, 1, 0.08], up: [0.12, 0, 1], elbow: [0.9, -0.3, -0.2] };

export const SWORD_REST: HandKey = { p: [-0.25, 0.93, 0.22], dir: [-0.05, 0.5, 0.86], up: [0, -0.86, 0.5] };
export const SWORD_GUARDING: HandKey = { p: [-0.27, 1.02, 0.16], dir: [-0.1, 0.75, 0.62], up: [0, -0.6, 0.75] };

export const STAFF_REST: HandKey = { p: [-0.26, 0.98, 0.16], dir: [0.05, 0.97, 0.2], up: [0, -0.2, 1], elbow: [-0.6, -0.5, -0.6] };
export const DIRK_REST: HandKey = { p: [0.24, 0.95, 0.2], dir: [0, 0.3, 1], up: [0, -1, 0.3] };

// ---- Phase 2 arsenal holds (right hand; two-handed weapons are carried one-handed while
// moving — locomotion swings the two hands apart — and taken in both hands by guard/attack clips).
export const SABRE_REST: HandKey = { p: [-0.26, 0.9, 0.2], dir: [-0.12, 0.38, 0.92], up: [0, -0.92, 0.38] };
export const DAGGER_REST: HandKey = { p: [-0.25, 0.92, 0.2], dir: [-0.05, 0.3, 0.95], up: [0, -0.95, 0.3] };
export const ESTOC_REST: HandKey = { p: [-0.24, 0.98, 0.24], dir: [0.02, 0.28, 0.96], up: [0, 0.96, -0.28] };
export const HAFT_REST: HandKey = { p: [-0.26, 0.9, 0.16], dir: [-0.08, 0.72, 0.69], up: [0, -0.69, 0.72] };
export const FLAIL_REST: HandKey = { p: [-0.26, 0.98, 0.24], dir: [-0.05, -0.97, 0.22], up: [0, 0.22, 0.97], elbow: [-0.7, -0.4, -0.6] };
/** Greatsword / hammer resting on the right shoulder, blade/head behind. */
export const GREAT_REST: HandKey = { p: [-0.24, 1.2, 0.24], dir: [-0.06, 0.74, -0.67], up: [-0.99, -0.05, 0.03], elbow: [-0.9, -0.4, 0.1] };
export const HAMMER_REST: HandKey = { p: [-0.25, 1.18, 0.24], dir: [-0.06, 0.76, -0.65], up: [0, -0.65, -0.76], elbow: [-0.9, -0.4, 0.1] };
/** Spear / halberd held upright at the side, head leaning forward. */
export const POLE_REST: HandKey = { p: [-0.27, 0.98, 0.14], dir: [-0.03, 0.93, 0.36], up: [0, -0.36, 0.93] };
export const BOW_REST: HandKey = { p: [-0.28, 1.0, 0.16], dir: [0.05, 0.9, 0.42], up: [0, -0.42, 0.9], elbow: [-0.6, -0.5, -0.6] };
export const XBOW_REST: HandKey = { p: [-0.23, 0.98, 0.24], dir: [0.04, -0.2, 0.98], up: [0, -0.98, -0.2] };

export const STANCES: Record<string, Stance> = {
  swordShield: { handR: SWORD_REST, handL: SHIELD_REST, chest: [2, -4, 0] },
  sword: { handR: SWORD_REST, handL: null, chest: [2, -4, 0] },
  staff: { handR: STAFF_REST, handL: null, chest: [1, 0, 0] },
  staffDirk: { handR: STAFF_REST, handL: DIRK_REST, chest: [1, 0, 0] },
  unarmed: { handR: null, handL: null },
  sabre: { handR: SABRE_REST, handL: null, chest: [2, -6, 0] },
  dagger: { handR: DAGGER_REST, handL: null, chest: [3, -6, 0] },
  estoc: { handR: ESTOC_REST, handL: null, chest: [1, -10, 0], hips: [0, -4, 0] },
  haft: { handR: HAFT_REST, handL: null, chest: [2, -4, 0] },
  flail: { handR: FLAIL_REST, handL: null, chest: [2, -6, 0] },
  greatsword: { handR: GREAT_REST, handL: null, chest: [3, -6, 0] },
  hammer: { handR: HAMMER_REST, handL: null, chest: [4, -6, 0] },
  pole: { handR: POLE_REST, handL: null, chest: [1, -4, 0] },
  bow: { handR: BOW_REST, handL: null, chest: [1, -2, 0] },
  crossbow: { handR: XBOW_REST, handL: null, chest: [2, -4, 0] },
  fist: { handR: null, handL: null, chest: [4, -4, 0] },
};
