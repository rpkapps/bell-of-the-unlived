/**
 * Belfry enemies (in addition to the Ashbridge Unlived: infantry, sentry, shieldBearer, archer).
 *
 *  - bellWarden  Bell-helmed heavy with a bell hammer. Slow, hyper-armoured; its overhead slam rings
 *                the floor (unparryable ground toll), its sweep is parryable, its shove breaks guards.
 *  - keeperEcho  A spectral soldier of one of the five institutions (the keepers' men, rung out of
 *                their own futures). Fast three-cut flurry, a lunge from range, and a flickering
 *                side-step with invulnerability — the Belfry's evasive enemy: wait for the flurry.
 *  - bellRinger  Veiled acolyte with a hand bell. Keeps its distance and rings slow homing knells
 *                (the region spawns them — see Region.stepRegion); bashes when cornered.
 *
 * Tells: windups ≥ 0.5 s; follow-ups (flurry cuts, blink → lunge) are told by what precedes them.
 */
import type { EnemyDef } from '../../actors/Enemy';
import type { MoveDef, HitSpec } from '../../combat/types';
import { registerMoves } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { wardenClips, echoClips, ringerClips, BW_HAMMER, EC_SWORD, BR_BELL } from './clips';

registerClips({ ...wardenClips, ...echoClips, ...ringerClips });

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 2, ...extra });

registerMoves({
  // ---------------------------------------------------------------- Bell-Warden
  bw_slam: M({
    id: 'bw_slam', clip: 'bwSlam', dur: 2.5, tell: 'unparryable',
    hits: [W(1.07, 1.17, 280, 70, { kind: 'strike', unparryable: true, knock: 4 }),
      { start: 1.17, end: 1.27, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 1.6], radius: 2.3 }, dmg: 190, posture: 0, poise: 70, kind: 'strike', unparryable: true, knock: 6, group: 5 }],
    motion: [[1.0, 0], [1.15, 0.5]], track: [1.0, 3], hyper: [0.35, 1.25, 90],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'unparryable_tell' } }, { t: 1.05, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 1.17, e: { type: 'sfx', cue: 'great_bell_toll', volume: 0.45 } }, { t: 1.17, e: { type: 'shake', amount: 0.45 } }, ...tr(1.02, 1.2)],
  }),
  bw_sweep: M({
    id: 'bw_sweep', clip: 'bwSweep', dur: 2.0,
    hits: [W(0.9, 1.02, 240, 60, { kind: 'strike', knock: 4 })],
    motion: [[0.82, 0], [1.0, 0.7]], track: [0.84, 3.5], hyper: [0.4, 1.05, 60],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.88, e: { type: 'sfx', cue: 'swing_huge' } }, ...tr(0.86, 1.05)],
  }),
  bw_shove: M({
    id: 'bw_shove', clip: 'bwShove', dur: 1.5, tell: 'unparryable',
    hits: [{ start: 0.62, end: 0.82, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.05, 0.3], radius: 0.7 }, dmg: 150, posture: 0, poise: 90, kind: 'strike', unparryable: true, guardBreak: true, knock: 6 }],
    motion: [[0.58, -0.1], [0.8, 1.8]], track: [0.6, 4], hyper: [0.3, 0.85, 80],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_grunt' } }],
  }),

  // ---------------------------------------------------------------- Keeper's echo
  ec_flurry: M({
    id: 'ec_flurry', clip: 'ecFlurry', dur: 2.15,
    hits: [W(0.54, 0.66, 120, 25, { group: 0, knock: 1.2 }), W(0.9, 1.02, 120, 25, { group: 1, knock: 1.2 }), W(1.3, 1.42, 140, 30, { kind: 'thrust', group: 2, knock: 2 })],
    motion: [[0.5, 0], [0.64, 0.5], [0.9, 0.6], [1.0, 0.9], [1.28, 0.9], [1.4, 1.6]], track: [1.26, 5],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.52, e: { type: 'sfx', cue: 'swing_light' } }, { t: 0.88, e: { type: 'sfx', cue: 'swing_light' } }, { t: 1.28, e: { type: 'sfx', cue: 'swing_light' } }, ...tr(0.52, 1.44)],
  }),
  ec_blinkL: M({ id: 'ec_blinkL', clip: 'ecBlink', dur: 0.6, iframes: [0.04, 0.38], motionSide: [[0.36, -2.4]], events: [{ t: 0.02, e: { type: 'custom', id: 'blink' } }] }),
  ec_blinkR: M({ id: 'ec_blinkR', clip: 'ecBlink', dur: 0.6, iframes: [0.04, 0.38], motionSide: [[0.36, 2.4]], events: [{ t: 0.02, e: { type: 'custom', id: 'blink' } }] }),
  ec_lunge: M({
    id: 'ec_lunge', clip: 'ecLunge', dur: 1.5,
    hits: [W(0.68, 0.8, 150, 30, { kind: 'thrust', knock: 2 })],
    motion: [[0.62, -0.1], [0.78, 2.4]], track: [0.64, 5],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.66, e: { type: 'sfx', cue: 'swing_light' } }, ...tr(0.66, 0.82)],
  }),

  // ---------------------------------------------------------------- Bell-ringer
  br_cast: M({
    id: 'br_cast', clip: 'brCast', dur: 1.7, track: [0.95, 3],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.95, e: { type: 'custom', id: 'knell' } }],
  }),
  br_bash: M({
    id: 'br_bash', clip: 'brBash', dur: 1.3,
    hits: [{ start: 0.62, end: 0.74, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0.15, 0], radius: 0.3 }, dmg: 110, posture: 0, poise: 30, kind: 'strike', knock: 2 }],
    motion: [[0.55, 0], [0.7, 0.5]], track: [0.58, 4],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.62, e: { type: 'sfx', cue: 'swing_light' } }],
  }),
});

const BW_L = { ...BW_HAMMER, p: [BW_HAMMER.p[0] - BW_HAMMER.dir[0] * 0.3, BW_HAMMER.p[1] - BW_HAMMER.dir[1] * 0.3, BW_HAMMER.p[2] - BW_HAMMER.dir[2] * 0.3] as [number, number, number], elbow: [0.8, -0.4, -0.4] as [number, number, number], up: undefined };

export const BELFRY_ENEMIES: Record<string, EnemyDef> = {
  bellWarden: {
    kind: 'bellWarden', name: 'Bell-Warden', look: 'bellWarden', props: { height: 1.12, bulk: 1.3, shoulder: 1.15 }, radius: 0.55, height: 2.05,
    hp: 640, poise: 70, postureMax: 360, postureRegen: 34, defense: 82, absorb: { physical: 0.26, magic: 0.1, fire: 0.08 }, hours: 480, walk: 1.3, run: 3.0, sight: 14,
    weaponR: 'warden_bellhammer', stance: { handR: BW_HAMMER, handL: BW_L, chest: [8, -6, 0] },
    attacks: [
      { move: 'bw_sweep', range: [0, 3.4], weight: 3, follow: [['bw_slam', 0.25]] },
      { move: 'bw_slam', range: [0, 3.2], weight: 2, cooldown: 6 },
      { move: 'bw_shove', range: [0, 2.0], weight: 1.5, cooldown: 5 },
    ],
    recover: [1.0, 1.8], aggression: 0.5,
  },
  keeperEcho: {
    kind: 'keeperEcho', name: 'Keeper\'s Echo', look: 'keeperEcho', props: { height: 1.02, bulk: 0.95, shoulder: 1 }, radius: 0.38, height: 1.84,
    hp: 270, poise: 22, postureMax: 170, postureRegen: 30, defense: 58, absorb: { physical: 0.14, magic: 0.0, fire: 0.05 }, hours: 190, walk: 1.9, run: 4.6, sight: 16,
    weaponR: 'enemy_sword', stance: { handR: EC_SWORD, handL: null, chest: [6, -12, 0] },
    attacks: [
      { move: 'ec_flurry', range: [0, 2.8], weight: 3 },
      { move: 'ec_lunge', range: [2.4, 5.5], weight: 2.5, cooldown: 3 },
      { move: 'ec_blinkL', range: [0, 2.6], weight: 0.8, cooldown: 4, follow: [['ec_lunge', 0.5]] },
      { move: 'ec_blinkR', range: [0, 2.6], weight: 0.8, cooldown: 4, follow: [['ec_lunge', 0.5]] },
    ],
    recover: [0.7, 1.3], aggression: 0.65,
  },
  bellRinger: {
    kind: 'bellRinger', name: 'Bell-Ringer', look: 'bellRinger', props: { height: 1.08, bulk: 0.9, shoulder: 0.95 }, radius: 0.36, height: 1.94,
    hp: 180, poise: 10, postureMax: 120, postureRegen: 24, defense: 45, absorb: { physical: 0.05, magic: 0.25, fire: 0.0 }, hours: 170, walk: 1.5, run: 3.4, sight: 20,
    weaponR: 'hand_bell', stance: { handR: BR_BELL, handL: null, chest: [6, 0, 0] },
    attacks: [
      { move: 'br_cast', range: [3.5, 20], angle: 0.6, weight: 3, cooldown: 2.6 },
      { move: 'br_bash', range: [0, 2.2], weight: 2 },
    ],
    keepDistance: [5, 12], recover: [0.9, 1.6], aggression: 0.6,
  },
};
registerEnemyDefs(BELFRY_ENEMIES);
