/**
 * Player and shared move definitions: exact gameplay windows (seconds) for each clip.
 * Enemy/boss movesets live with their AI definitions and register through `registerMoves`.
 */
import type { MoveDef } from './types';

const M = (d: MoveDef) => d;

export const MOVES: Record<string, MoveDef> = {
  // ------------------------------------------------------------------ sword (straightSword / curvedSword / estoc default)
  sword_light1: M({
    id: 'sword_light1', clip: 'light1', dur: 0.8, stamina: 14,
    hits: [{ start: 0.27, end: 0.43, source: 'weaponR', dmg: 1.0, posture: 1.0, poise: 22, kind: 'slash', knock: 1.2 }],
    motion: [[0.2, 0], [0.4, 0.45], [0.6, 0.5]], track: [0.26, 7],
    cancel: { chain: 0.44, dodge: 0.48, free: 0.66 }, next: 'sword_light2',
    events: [{ t: 0.25, e: { type: 'sfx', cue: 'swing_light' } }, { t: 0.26, e: { type: 'trail', on: true } }, { t: 0.46, e: { type: 'trail', on: false } }],
  }),
  sword_light2: M({
    id: 'sword_light2', clip: 'light2', dur: 0.76, stamina: 14,
    hits: [{ start: 0.23, end: 0.39, source: 'weaponR', dmg: 1.0, posture: 1.0, poise: 22, kind: 'slash', knock: 1.2 }],
    motion: [[0.18, 0], [0.36, 0.4], [0.5, 0.45]], track: [0.22, 7],
    cancel: { chain: 0.4, dodge: 0.44, free: 0.62 }, next: 'sword_light3',
    events: [{ t: 0.21, e: { type: 'sfx', cue: 'swing_light' } }, { t: 0.22, e: { type: 'trail', on: true } }, { t: 0.42, e: { type: 'trail', on: false } }],
  }),
  sword_light3: M({
    id: 'sword_light3', clip: 'light3', dur: 0.95, stamina: 17,
    hits: [{ start: 0.35, end: 0.5, source: 'weaponR', dmg: 1.2, posture: 1.4, poise: 32, kind: 'slash', knock: 2 }],
    motion: [[0.3, 0], [0.46, 0.6], [0.6, 0.7]], track: [0.32, 6],
    cancel: { chain: 0.58, dodge: 0.56, free: 0.8 }, next: 'sword_light1',
    events: [{ t: 0.32, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.33, e: { type: 'trail', on: true } }, { t: 0.52, e: { type: 'trail', on: false } }],
  }),
  /** Held while charging; the controller releases into sword_heavy_release. */
  sword_heavy_charge: M({
    id: 'sword_heavy_charge', clip: 'heavyCharge', dur: 1.25, stamina: 0, track: [1.25, 5], hyper: [0.2, 1.25, 25],
    events: [{ t: 0.05, e: { type: 'sfx', cue: 'charge_heavy' } }],
  }),
  sword_heavy_release: M({
    id: 'sword_heavy_release', clip: 'heavyRelease', dur: 0.9, stamina: 24,
    hits: [{ start: 0.05, end: 0.22, source: 'weaponR', dmg: 1.45, posture: 2.0, poise: 48, kind: 'slash', knock: 3 }],
    motion: [[0.04, 0], [0.2, 0.75], [0.35, 0.85]], hyper: [0, 0.22, 20],
    cancel: { dodge: 0.52, free: 0.72 },
    events: [{ t: 0.02, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 0.02, e: { type: 'trail', on: true } }, { t: 0.25, e: { type: 'trail', on: false } }, { t: 0.18, e: { type: 'shake', amount: 0.15 } }],
  }),

  // ------------------------------------------------------------------ staff / catalyst
  staff_light: M({
    id: 'staff_light', clip: 'staffLight', dur: 0.82, stamina: 13,
    hits: [{ start: 0.28, end: 0.44, source: 'weaponR', dmg: 1.0, posture: 0.9, poise: 18, kind: 'strike', knock: 1.2 }],
    motion: [[0.2, 0], [0.4, 0.35]], track: [0.26, 7], cancel: { chain: 0.46, dodge: 0.5, free: 0.66 }, next: 'staff_light',
    events: [{ t: 0.25, e: { type: 'sfx', cue: 'swing_light' } }],
  }),
  staff_heavy_charge: M({ id: 'staff_heavy_charge', clip: 'staffHeavy', dur: 0.42, speed: 1, stamina: 0, track: [0.42, 5], events: [{ t: 0.05, e: { type: 'sfx', cue: 'charge_heavy' } }] }),
  staff_heavy_release: M({
    id: 'staff_heavy_release', clip: 'staffHeavy', dur: 0.75, stamina: 22,
    hits: [{ start: 0.08, end: 0.22, source: 'weaponR', dmg: 1.4, posture: 1.9, poise: 40, kind: 'strike', knock: 2.5 }],
    motion: [[0.05, 0], [0.2, 0.5]], cancel: { dodge: 0.45, free: 0.6 },
    events: [{ t: 0.02, e: { type: 'sfx', cue: 'swing_heavy' } }],
  }),
  cast_quick: M({ id: 'cast_quick', clip: 'castQuick', dur: 0.72, track: [0.3, 9], walk: 0.25, cancel: { chain: 0.45, dodge: 0.42, free: 0.58 }, events: [{ t: 0.3, e: { type: 'cast' } }] }),
  cast_heavy: M({ id: 'cast_heavy', clip: 'castHeavy', dur: 1.05, track: [0.46, 6], cancel: { chain: 0.75, dodge: 0.66, free: 0.85 }, events: [{ t: 0.46, e: { type: 'cast' } }] }),
  cast_channel: M({ id: 'cast_channel', clip: 'channel', dur: 1.1, walk: 0.2, cancel: { dodge: 0.7, free: 0.9 }, events: [{ t: 0.5, e: { type: 'cast' } }] }),

  // ------------------------------------------------------------------ techniques
  tech_lunge: M({
    id: 'tech_lunge', clip: 'lunge', dur: 1.0, stamina: 20, focus: 18,
    hits: [{ start: 0.34, end: 0.5, source: 'weaponR', dmg: 1.55, posture: 2.4, poise: 40, kind: 'thrust', knock: 2.5 }],
    motion: [[0.3, 0], [0.45, 2.1], [0.6, 2.3]], track: [0.3, 8], hyper: [0.25, 0.5, 30],
    cancel: { dodge: 0.66, free: 0.82 },
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'technique' } }, { t: 0.32, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.33, e: { type: 'trail', on: true } }, { t: 0.52, e: { type: 'trail', on: false } }],
  }),
  tech_bash: M({
    id: 'tech_bash', clip: 'bash', dur: 0.95, stamina: 18, focus: 12,
    hits: [{ start: 0.28, end: 0.42, source: 'sphere', sphere: { bone: 'handL', offset: [0.1, 0, 0], radius: 0.42 }, dmg: 0.5, posture: 3.2, poise: 60, kind: 'strike', guardBreak: true, knock: 4 }],
    motion: [[0.25, 0], [0.4, 0.8]], track: [0.25, 8], guard: true, hyper: [0.2, 0.45, 30],
    cancel: { dodge: 0.62, free: 0.78 },
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'technique' } }, { t: 0.3, e: { type: 'sfx', cue: 'swing_heavy' } }],
  }),
  tech_measured: M({
    id: 'tech_measured', clip: 'measuredCut', dur: 1.2, stamina: 22, focus: 20,
    hits: [
      { start: 0.28, end: 0.4, source: 'weaponR', dmg: 1.15, posture: 1.6, poise: 30, kind: 'slash', knock: 1.5, group: 0 },
      { start: 0.62, end: 0.74, source: 'weaponR', dmg: 1.25, posture: 1.8, poise: 35, kind: 'slash', knock: 2, group: 1 },
    ],
    motion: [[0.1, 0], [0.32, 2.2], [0.6, 2.4], [0.72, 3.0]], track: [0.6, 6], hyper: [0.2, 0.75, 25],
    cancel: { dodge: 0.85, free: 1.0 },
    events: [{ t: 0.05, e: { type: 'sfx', cue: 'technique' } }, { t: 0.26, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.6, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.26, e: { type: 'trail', on: true } }, { t: 0.76, e: { type: 'trail', on: false } }],
  }),
  tech_ward: M({ id: 'tech_ward', clip: 'channel', dur: 1.0, stamina: 10, focus: 22, walk: 0.2, cancel: { dodge: 0.7, free: 0.85 }, events: [{ t: 0.45, e: { type: 'technique' } }, { t: 0.4, e: { type: 'sfx', cue: 'ward_up' } }] }),

  // ------------------------------------------------------------------ defence & movement
  parry_shield: M({ id: 'parry_shield', clip: 'parryShield', dur: 0.72, stamina: 12, parry: [0.08, 0.3], cancel: { free: 0.62 }, events: [{ t: 0.05, e: { type: 'sfx', cue: 'parry_attempt' } }] }),
  parry_hand: M({ id: 'parry_hand', clip: 'parryHand', dur: 0.72, stamina: 12, parry: [0.08, 0.28], cancel: { free: 0.62 }, events: [{ t: 0.05, e: { type: 'sfx', cue: 'parry_attempt' } }] }),
  guard_hit: M({ id: 'guard_hit', clip: 'guardHit', dur: 0.32, guard: true, fade: 0.03, cancel: { dodge: 0.18, free: 0.26 } }),
  backstep: M({ id: 'backstep', clip: 'backstep', dur: 0.46, stamina: 10, iframes: [0.05, 0.2], motion: [[0.3, -1.6], [0.46, -1.7]], cancel: { chain: 0.34, free: 0.4 } }),
  // roll: duration/iframes/distance filled from the load class at runtime (see Player)
  roll: M({ id: 'roll', clip: 'roll', dur: 0.72, stamina: 16, iframes: [0.06, 0.38], motion: [[0.5, 3.1], [0.72, 3.25]], cancel: { chain: 0.52, free: 0.6 }, fade: 0.04 }),
  drink: M({ id: 'drink', clip: 'drink', dur: 1.0, walk: 0.35, cancel: { free: 0.9 }, events: [{ t: 0.4, e: { type: 'drink' } }, { t: 0.35, e: { type: 'sfx', cue: 'drink_flask' } }] }),
  throw: M({ id: 'throw', clip: 'throw', dur: 0.62, stamina: 8, track: [0.25, 10], walk: 0.3, cancel: { dodge: 0.36, free: 0.46 }, events: [{ t: 0.28, e: { type: 'throw' } }] }),

  // ------------------------------------------------------------------ reactions (shared humanoid)
  hurt_light: M({ id: 'hurt_light', clip: 'hurtLight', dur: 0.4, fade: 0.03, cancel: { dodge: 0.28, free: 0.36 } }),
  hurt_heavy: M({ id: 'hurt_heavy', clip: 'hurtHeavy', dur: 0.85, fade: 0.03, motion: [[0.3, -0.7]], cancel: { dodge: 0.6, free: 0.78 } }),
  guard_broken: M({ id: 'guard_broken', clip: 'guardBroken', dur: 1.35, fade: 0.03, vulnerable: 'guardBroken', motion: [[0.4, -0.5]] }),
  guard_broken_player: M({ id: 'guard_broken_player', clip: 'guardBroken', dur: 1.1, speed: 1.25, fade: 0.03, motion: [[0.4, -0.5]] }),
  parried: M({ id: 'parried', clip: 'parried', dur: 1.55, fade: 0.03, vulnerable: 'parried', motion: [[0.3, -0.4]] }),
  posture_broken: M({ id: 'posture_broken', clip: 'postureBroken', dur: 2.5, fade: 0.05, vulnerable: 'postureBroken' }),
  death: M({ id: 'death', clip: 'death', dur: 2.0, fade: 0.05 }),
  reform: M({ id: 'reform', clip: 'reform', dur: 1.6, fade: 0 }),
  rest: M({ id: 'rest', clip: 'rest', dur: 9999, fade: 0.3 }),
  rise: M({ id: 'rise', clip: 'rise', dur: 0.8 }),
  interact: M({ id: 'interact', clip: 'interact', dur: 0.9, cancel: { free: 0.75 } }),
  pickup: M({ id: 'pickup', clip: 'pickup', dur: 1.0, cancel: { free: 0.85 } }),
  lever: M({ id: 'lever', clip: 'lever', dur: 1.4 }),

  // ------------------------------------------------------------------ criticals (attacker / victim pairs)
  crit_back: M({ id: 'crit_back', clip: 'critBack', dur: 1.5, iframes: [0, 1.3], events: [{ t: 0.38, e: { type: 'critHit', mult: 1 } }, { t: 0.36, e: { type: 'sfx', cue: 'critical_stab' } }] }),
  crit_front: M({ id: 'crit_front', clip: 'critFront', dur: 1.4, iframes: [0, 1.2], events: [{ t: 0.38, e: { type: 'critHit', mult: 1 } }, { t: 0.36, e: { type: 'sfx', cue: 'critical_stab' } }] }),
  crit_down: M({ id: 'crit_down', clip: 'critDown', dur: 1.6, iframes: [0, 1.35], events: [{ t: 0.5, e: { type: 'critHit', mult: 1 } }, { t: 0.48, e: { type: 'sfx', cue: 'critical_stab' } }] }),
  victim_back: M({ id: 'victim_back', clip: 'victimBack', dur: 3.5, fade: 0.02, noFlinch: true }),
  victim_front: M({ id: 'victim_front', clip: 'victimFront', dur: 3.5, fade: 0.02, noFlinch: true }),
  victim_down: M({ id: 'victim_down', clip: 'victimDown', dur: 3.3, fade: 0.02, noFlinch: true }),
};

export function registerMoves(m: Record<string, MoveDef>) { Object.assign(MOVES, m); }
