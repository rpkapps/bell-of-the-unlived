/**
 * Academy bosses.
 *
 * Aberrant Experiment No. 9 (optional mid-boss, Laboratory No. 9): a homunculus grown past its
 * vat. Phase 1: long-arm sweep (0.95 s tell), leap slam (1.0 s crouch, unparryable ring), a
 * three-blow flail (each blow told by the last). Phase 2 (≤ 50 %): the jars on its back burst —
 * an unparryable ring and a spray of glass shards.
 *
 * Keeper Ilsabet Orrow (the Observatory of Lenses). She re-aligns the lens floor: the region turns
 * plates unsafe on a timer — they glow and show a broken-ring glyph for ≥ 1.6 s before they burn.
 *   Phase 1 "The Keeper" (100→62 %): staff strike (+backhand), three glass shards, the lens beam.
 *   Phase 2 "The Glass Blade" (62→28 %): she breaks her lens and fights up close with a glass
 *     blade — cut (+return), lunge, turning cut (unparryable); the floor turns faster.
 *   Phase 3 "The Preserved Hour" (28→0 %): as phase 2 plus the Falling Hour (marked ground, light
 *     falls 1.5 s later) and the beam again; the floor turns fastest and more of it burns.
 * Every string ends in a readable recovery; transitions are uninterruptible and never skipped.
 */
import type { EnemyDef, EnemyAttack } from '../../actors/Enemy';
import type { MoveDef, HitSpec } from '../../combat/types';
import type { BoneName } from '../../actors/rigDefs';
import { registerMoves } from '../../combat/moves';
import { registerBoss } from '../bosses';
import { STAFF_HOLD } from './clips';
import './enemies';

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const sfx = (t: number, cue: 'enemy_windup' | 'swing_light' | 'swing_heavy' | 'swing_huge' | 'enemy_grunt' | 'cast_shard' | 'unparryable_tell' | 'great_bell_toll' | 'boss_roar' | 'anchor_shatter', volume?: number) => ({ t, e: { type: 'sfx' as const, cue, volume } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const shake = (t: number, amount: number) => ({ t, e: { type: 'shake' as const, amount } });
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec => ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 2, ...extra });
const S = (start: number, end: number, bone: BoneName | 'root', offset: [number, number, number], radius: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec => ({ start, end, source: 'sphere', sphere: { bone, offset, radius }, dmg, posture: 0, poise, kind: 'strike', knock: 3, ...extra });

registerMoves({
  // ---------------------------------------------------------------- Experiment No. 9
  x9_sweep: M({ id: 'x9_sweep', clip: 'x9Sweep', dur: 1.9, hits: [S(0.98, 1.2, 'handR', [0, -0.15, 0], 0.8, 240, 70, { knock: 4, kind: 'slash' })], motion: [[0.85, 0], [1.15, 0.8]], track: [0.9, 3], hyper: [0.3, 1.2, 60], events: [sfx(0.12, 'enemy_grunt'), sfx(0.95, 'swing_huge')] }),
  x9_leap: M({ id: 'x9_leap', clip: 'x9Leap', dur: 2.5, tell: 'unparryable', hits: [S(1.45, 1.58, 'root', [0, 0.4, 0.8], 2.9, 280, 95, { unparryable: true, knock: 6 })], motion: [[0.95, 0], [1.45, 6.0]], track: [1.0, 3], hyper: [0.4, 1.6, 120], events: [sfx(0.1, 'unparryable_tell'), sfx(1.2, 'swing_huge'), shake(1.45, 0.6), custom(1.45, 'slamDust')] }),
  x9_flail: M({
    id: 'x9_flail', clip: 'x9Flail', dur: 2.6,
    hits: [S(0.76, 0.9, 'handR', [0, -0.15, 0], 0.7, 150, 45, { group: 0, kind: 'slash' }), S(1.06, 1.2, 'handL', [0, -0.15, 0], 0.7, 150, 45, { group: 1, kind: 'slash' }), S(1.56, 1.7, 'root', [0, 0.5, 1.4], 1.7, 220, 80, { group: 2, knock: 5 })],
    motion: [[0.65, 0], [0.85, 0.7], [1.1, 1.3], [1.6, 2.1]], track: [1.4, 3], hyper: [0.3, 1.7, 60],
    events: [sfx(0.1, 'enemy_windup'), sfx(0.74, 'swing_heavy'), sfx(1.04, 'swing_heavy'), sfx(1.5, 'swing_huge'), shake(1.6, 0.4)],
  }),
  x9_burst: M({ id: 'x9_burst', clip: 'x9Burst', dur: 2.5, tell: 'unparryable', hits: [S(1.45, 1.6, 'root', [0, 1.0, 0], 3.3, 170, 80, { unparryable: true, knock: 6, kind: 'magic' })], hyper: [0.3, 1.6, 150], events: [sfx(0.1, 'unparryable_tell'), custom(1.46, 'burst'), shake(1.46, 0.5)] }),
  x9_roar: M({ id: 'x9_roar', clip: 'x9Roar', dur: 3.0, iframes: [0, 2.8], noFlinch: true, events: [sfx(0.7, 'boss_roar'), custom(0.9, 'burst'), custom(1.0, 'phase'), shake(0.9, 0.5)] }),
  x9_death: M({ id: 'x9_death', clip: 'x9Death', dur: 2.6, fade: 0.06 }),

  // ---------------------------------------------------------------- Keeper Orrow
  orrow_strike: M({ id: 'orrow_strike', clip: 'orrowStrike', dur: 1.4, hits: [W(0.6, 0.74, 170, 40, { kind: 'strike' })], motion: [[0.52, 0], [0.72, 0.8]], track: [0.54, 4.5], events: [sfx(0.08, 'enemy_windup'), sfx(0.58, 'swing_heavy'), ...tr(0.58, 0.76)] }),
  orrow_strike2: M({ id: 'orrow_strike2', clip: 'orrowStrike2', dur: 1.2, hits: [W(0.38, 0.52, 160, 40, { kind: 'strike' })], motion: [[0.3, 0], [0.5, 0.6]], track: [0.34, 4], events: [sfx(0.36, 'swing_heavy'), ...tr(0.36, 0.54)] }),
  orrow_shards: M({ id: 'orrow_shards', clip: 'orrowShards', dur: 1.8, track: [0.9, 3.5], events: [sfx(0.1, 'enemy_windup'), custom(0.12, 'charge'), custom(0.96, 'orrowShards'), sfx(0.96, 'cast_shard')] }),
  orrow_beam: M({ id: 'orrow_beam', clip: 'orrowBeam', dur: 2.6, track: [1.3, 1.6], hyper: [0.4, 1.8, 50], events: [sfx(0.1, 'enemy_windup'), custom(0.08, 'beamAim'), custom(1.35, 'beamLock'), custom(1.7, 'beamFire')] }),
  orrow_realign: M({ id: 'orrow_realign', clip: 'orrowRealign', dur: 1.7, hyper: [0, 1.4, 40], events: [custom(0.1, 'realignStart'), sfx(1.04, 'great_bell_toll', 0.45), custom(1.05, 'realign'), shake(1.05, 0.25)] }),
  orrow_step: M({ id: 'orrow_step', clip: 'backstep', dur: 0.6, motion: [[0.35, -2.8]], iframes: [0.04, 0.24] }),
  orrow_shatter: M({ id: 'orrow_shatter', clip: 'orrowShatter', dur: 3.2, iframes: [0, 3.0], noFlinch: true, events: [custom(1.2, 'shatterLens'), sfx(1.2, 'anchor_shatter', 0.5), shake(1.2, 0.4), custom(1.6, 'phase')] }),
  orrow_cut: M({ id: 'orrow_cut', clip: 'orrowCut', dur: 1.3, hits: [W(0.54, 0.68, 185, 40)], motion: [[0.46, 0], [0.66, 0.9]], track: [0.48, 5], events: [sfx(0.06, 'enemy_windup'), sfx(0.52, 'swing_light'), ...tr(0.52, 0.7)] }),
  orrow_cut2: M({ id: 'orrow_cut2', clip: 'orrowCut2', dur: 1.1, hits: [W(0.36, 0.5, 175, 40)], motion: [[0.28, 0], [0.48, 0.7]], track: [0.32, 5], events: [sfx(0.34, 'swing_light'), ...tr(0.34, 0.52)] }),
  orrow_lunge: M({ id: 'orrow_lunge', clip: 'orrowLunge', dur: 1.6, hits: [W(0.74, 0.86, 230, 60, { kind: 'thrust', knock: 3 })], motion: [[0.66, -0.2], [0.84, 3.6]], track: [0.68, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.72, 'swing_heavy'), ...tr(0.72, 0.88)] }),
  orrow_spin: M({ id: 'orrow_spin', clip: 'orrowSpin', dur: 2.0, tell: 'unparryable', hits: [S(1.0, 1.34, 'root', [0, 1.0, 0], 2.5, 200, 70, { unparryable: true, knock: 4, kind: 'slash' })], track: [0.8, 3], hyper: [0.4, 1.35, 60], events: [sfx(0.1, 'unparryable_tell'), sfx(0.98, 'swing_huge'), ...tr(0.98, 1.36)] }),
  orrow_preserve: M({ id: 'orrow_preserve', clip: 'orrowPreserve', dur: 2.8, iframes: [0, 2.6], noFlinch: true, events: [sfx(0.8, 'great_bell_toll', 0.7), custom(1.2, 'preserve'), custom(1.9, 'phase'), shake(1.9, 0.4)] }),
  orrow_hour: M({ id: 'orrow_hour', clip: 'orrowHour', dur: 2.0, track: [0.6, 3], events: [sfx(0.1, 'enemy_windup'), custom(0.62, 'hourMark')] }),
});

// ---------------------------------------------------------------- definitions

export const EXPERIMENT9: EnemyDef = {
  kind: 'experiment9', name: 'Aberrant Experiment No. 9', look: 'experiment9', props: { height: 1.55, bulk: 1.55, shoulder: 1.25 }, radius: 0.8, height: 2.8,
  hp: 2400, poise: 70, postureMax: 600, postureRegen: 36, defense: 70, absorb: { physical: 0.1, magic: 0.15, fire: -0.1 }, hours: 3600, walk: 1.4, run: 4.6, sight: 30,
  stance: { handR: null, handL: null, chest: [26, 10, 6], spine: [10, 4, 0], head: [-20, -10, 10], hipsPos: [0, -0.12, 0] },
  attacks: [
    { move: 'x9_sweep', range: [0, 4.0], weight: 4 },
    { move: 'x9_leap', range: [4, 12], angle: 0.5, weight: 2.5, cooldown: 6 },
    { move: 'x9_flail', range: [0, 3.4], weight: 2, cooldown: 6 },
    { move: 'x9_burst', range: [0, 3.8], angle: 3.2, weight: 2.5, cooldown: 9, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'x9_death' },
  backstabbable: false, criticalable: true, recover: [0.8, 1.6], aggression: 0.65, boss: true,
};

const O_P1: EnemyAttack[] = [
  { move: 'orrow_strike', range: [0, 3.0], weight: 4, follow: [['orrow_strike2', 0.4]] },
  { move: 'orrow_shards', range: [4, 22], angle: 0.5, weight: 3, cooldown: 4 },
  { move: 'orrow_beam', range: [5, 24], angle: 0.5, weight: 2, cooldown: 8 },
  { move: 'orrow_step', range: [0, 1.6], weight: 1, cooldown: 5 },
];
const O_P2: EnemyAttack[] = [
  { move: 'orrow_cut', range: [0, 3.0], weight: 4, follow: [['orrow_cut2', 0.5]] },
  { move: 'orrow_lunge', range: [2.5, 6.5], angle: 0.45, weight: 3, cooldown: 4 },
  { move: 'orrow_spin', range: [0, 2.8], angle: 3.2, weight: 2, cooldown: 7 },
  { move: 'orrow_shards', range: [5, 20], angle: 0.5, weight: 2, cooldown: 7 },
  { move: 'orrow_step', range: [0, 1.6], weight: 1, cooldown: 5 },
];
const O_P3: EnemyAttack[] = [
  ...O_P2,
  { move: 'orrow_hour', range: [0, 30], angle: 3.2, weight: 2, cooldown: 8 },
  { move: 'orrow_beam', range: [5, 24], angle: 0.5, weight: 1.5, cooldown: 10 },
];
/** Orrow's moveset per phase (the region swaps `def.attacks` on each phase change). */
export const ORROW_ATTACKS: Record<number, EnemyAttack[]> = { 1: O_P1, 2: O_P2, 3: O_P3 };

export const ORROW: EnemyDef = {
  kind: 'orrow', name: 'Keeper Ilsabet Orrow', look: 'orrow', props: { height: 0.98, bulk: 0.88, shoulder: 0.9 }, radius: 0.4, height: 1.78,
  hp: 2900, poise: 55, postureMax: 520, postureRegen: 32, defense: 72, absorb: { physical: 0.15, magic: 0.35, fire: 0.1 }, hours: 6500, walk: 1.7, run: 4.4, sight: 40,
  weaponR: 'keepers_lens_staff', stance: { handR: STAFF_HOLD, handL: null, chest: [0, 0, 0], head: [2, 0, 0] },
  attacks: O_P1,
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch' },
  backstabbable: false, criticalable: true, recover: [0.7, 1.4], aggression: 0.65, boss: true,
};

registerBoss({ id: 'experiment9', def: EXPERIMENT9, phases: [0.5], transitions: ['x9_roar'], looks: ['experiment9'] });
registerBoss({ id: 'orrow', def: ORROW, phases: [0.62, 0.28], transitions: ['orrow_shatter', 'orrow_preserve'], looks: ['orrow', 'orrow2', 'orrow3'], weaponR: 'keepers_lens_staff', memory: 'memory_orrow' });
