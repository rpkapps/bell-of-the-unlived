/**
 * Ashbridge Unlived: definitions and movesets. Every attack lists its gameplay windows here and its
 * animation in src/actors/anim/clips/unlived.ts. Tells: windups ≥ 0.5 s (follow-ups are told by the
 * first hit), readable recovery after each string.
 */
import type { EnemyDef } from '../actors/Enemy';
import type { MoveDef } from '../combat/types';
import { registerMoves } from '../combat/moves';
import { registerClips } from '../actors/anim/clips';
import { unlivedClips, INF_SWORD, SPEAR_REST, TOWER_REST, BOW_REST } from '../actors/anim/clips/unlived';

registerClips(unlivedClips);

const M = (d: MoveDef) => d;
const trail = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];

registerMoves({
  inf_slash: M({ id: 'inf_slash', clip: 'infSlash', dur: 1.45, hits: [{ start: 0.57, end: 0.72, source: 'weaponR', dmg: 150, posture: 0, poise: 30, kind: 'slash', knock: 1.5 }], motion: [[0.5, 0], [0.7, 0.7]], track: [0.52, 4.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.55, e: { type: 'sfx', cue: 'swing_light' } }, ...trail(0.55, 0.74)] }),
  inf_backhand: M({ id: 'inf_backhand', clip: 'infBackhand', dur: 1.3, hits: [{ start: 0.37, end: 0.52, source: 'weaponR', dmg: 140, posture: 0, poise: 30, kind: 'slash', knock: 1.5 }], motion: [[0.3, 0], [0.5, 0.5]], track: [0.34, 4], events: [{ t: 0.35, e: { type: 'sfx', cue: 'swing_light' } }, ...trail(0.35, 0.54)] }),
  inf_thrust: M({ id: 'inf_thrust', clip: 'infThrust', dur: 1.55, hits: [{ start: 0.67, end: 0.8, source: 'weaponR', dmg: 170, posture: 0, poise: 35, kind: 'thrust', knock: 2 }], motion: [[0.62, -0.1], [0.78, 1.4]], track: [0.64, 5], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.65, e: { type: 'sfx', cue: 'swing_light' } }, ...trail(0.64, 0.8)] }),
  inf_overhead: M({ id: 'inf_overhead', clip: 'infOverhead', dur: 1.95, hits: [{ start: 0.94, end: 1.06, source: 'weaponR', dmg: 220, posture: 0, poise: 60, kind: 'strike', knock: 3 }], motion: [[0.9, 0], [1.04, 0.6]], track: [0.85, 4], hyper: [0.5, 1.06, 40], events: [{ t: 0.15, e: { type: 'sfx', cue: 'enemy_grunt' } }, { t: 0.9, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 1.03, e: { type: 'shake', amount: 0.25 } }, ...trail(0.9, 1.07)] }),
  spear_thrust: M({ id: 'spear_thrust', clip: 'spearThrust', dur: 1.4, hits: [{ start: 0.6, end: 0.72, source: 'weaponR', dmg: 150, posture: 0, poise: 30, kind: 'thrust', knock: 2 }], motion: [[0.55, -0.1], [0.7, 1.0]], track: [0.56, 5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.58, e: { type: 'sfx', cue: 'swing_light' } }] }),
  sb_thrust: M({ id: 'sb_thrust', clip: 'sbThrust', dur: 1.35, guard: true, hits: [{ start: 0.6, end: 0.72, source: 'weaponR', dmg: 160, posture: 0, poise: 30, kind: 'thrust', knock: 2 }], motion: [[0.55, 0], [0.7, 0.6]], track: [0.56, 4], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.58, e: { type: 'sfx', cue: 'swing_light' } }] }),
  sb_bash: M({ id: 'sb_bash', clip: 'sbBash', dur: 1.4, tell: 'unparryable', hits: [{ start: 0.64, end: 0.78, source: 'sphere', sphere: { bone: 'handL', offset: [0.1, 0.1, 0], radius: 0.55 }, dmg: 120, posture: 0, poise: 70, kind: 'strike', unparryable: true, knock: 5, guardBreak: true }], motion: [[0.6, -0.2], [0.76, 1.3]], track: [0.58, 4], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_grunt' } }] }),
  sb_guard_walk: M({ id: 'sb_guard_walk', clip: 'sbGuardWalk', dur: 0.5, guard: true }),
  archer_shoot: M({ id: 'archer_shoot', clip: 'bowShoot', dur: 1.6, track: [1.05, 3], events: [{ t: 0.2, e: { type: 'sfx', cue: 'bow_draw' } }, { t: 1.08, e: { type: 'custom', id: 'shoot' } }] }),
  archer_stab: M({ id: 'archer_stab', clip: 'archerStab', dur: 1.1, hits: [{ start: 0.5, end: 0.6, source: 'sphere', sphere: { bone: 'handR', offset: [0, -0.15, 0], radius: 0.18 }, dmg: 100, posture: 0, poise: 20, kind: 'thrust', knock: 1 }], motion: [[0.45, 0], [0.58, 0.6]], track: [0.47, 5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }] }),
  sentry_idle: M({ id: 'sentry_idle', clip: 'sentryIdle', dur: 3.2 }),
});

const UNLIVED_ABSORB = { physical: 0.1, magic: 0.05, fire: 0.0 };

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  infantry: {
    kind: 'infantry', name: 'Unlived Infantry', look: 'infantry', props: { height: 1, bulk: 1, shoulder: 1 }, radius: 0.38, height: 1.8,
    hp: 230, poise: 20, postureMax: 160, postureRegen: 26, defense: 60, absorb: UNLIVED_ABSORB, hours: 60, walk: 1.6, run: 4.0, sight: 13,
    weaponR: 'enemy_sword', stance: { handR: INF_SWORD, handL: null, chest: [4, -6, 0] },
    attacks: [
      { move: 'inf_slash', range: [0, 2.6], weight: 4, follow: [['inf_backhand', 0.45]] },
      { move: 'inf_thrust', range: [1.6, 3.8], weight: 2, cooldown: 3 },
      { move: 'inf_overhead', range: [0, 2.4], weight: 1.2, cooldown: 5 },
    ],
    recover: [0.7, 1.4], aggression: 0.55,
  },
  sentry: {
    kind: 'sentry', name: 'Unlived Sentry', look: 'sentry', props: { height: 1, bulk: 0.95, shoulder: 1 }, radius: 0.37, height: 1.8,
    hp: 200, poise: 15, postureMax: 140, postureRegen: 26, defense: 55, absorb: UNLIVED_ABSORB, hours: 55, walk: 1.6, run: 3.8, sight: 9,
    weaponR: 'enemy_spear', stance: { handR: SPEAR_REST, handL: null },
    attacks: [{ move: 'spear_thrust', range: [0.8, 3.4], weight: 3 }],
    recover: [0.8, 1.5], aggression: 0.5,
  },
  shieldBearer: {
    kind: 'shieldBearer', name: 'Unlived Shield Bearer', look: 'shieldBearer', props: { height: 1.04, bulk: 1.15, shoulder: 1.08 }, radius: 0.45, height: 1.88,
    hp: 360, poise: 45, postureMax: 220, postureRegen: 30, defense: 75, absorb: { physical: 0.2, magic: 0.05, fire: 0.05 }, hours: 150, walk: 1.4, run: 3.2, sight: 12,
    weaponR: 'enemy_spear', shield: 'tower_shield', stance: { handR: { p: [-0.28, 1.35, -0.05], dir: [0, 0.05, 1], up: [0, 1, 0], elbow: [-0.8, -0.3, -0.4] }, handL: TOWER_REST, chest: [4, 6, 0] },
    attacks: [
      { move: 'sb_thrust', range: [0.8, 3.2], weight: 3 },
      { move: 'sb_bash', range: [0, 2.2], weight: 1.5, cooldown: 4 },
    ],
    guard: { physical: 100, magic: 60, stability: 70, stamina: 110, chance: 1 },
    recover: [0.8, 1.6], aggression: 0.45,
  },
  archer: {
    kind: 'archer', name: 'Unlived Archer', look: 'archer', props: { height: 0.98, bulk: 0.9, shoulder: 0.95 }, radius: 0.35, height: 1.76,
    hp: 150, poise: 8, postureMax: 110, postureRegen: 24, defense: 45, absorb: UNLIVED_ABSORB, hours: 70, walk: 1.7, run: 3.8, sight: 24,
    weaponL: 'enemy_bow', stance: { handR: null, handL: BOW_REST },
    attacks: [
      { move: 'archer_shoot', range: [3.5, 26], angle: 0.5, weight: 3, cooldown: 1.2 },
      { move: 'archer_stab', range: [0, 2.2], weight: 2 },
    ],
    keepDistance: [5, 16], recover: [0.8, 1.6], aggression: 0.65,
  },
};
