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

export const STANCES: Record<string, Stance> = {
  swordShield: { handR: SWORD_REST, handL: SHIELD_REST, chest: [2, -4, 0] },
  sword: { handR: SWORD_REST, handL: null, chest: [2, -4, 0] },
  staff: { handR: STAFF_REST, handL: null, chest: [1, 0, 0] },
  staffDirk: { handR: STAFF_REST, handL: DIRK_REST, chest: [1, 0, 0] },
  unarmed: { handR: null, handL: null },
};
