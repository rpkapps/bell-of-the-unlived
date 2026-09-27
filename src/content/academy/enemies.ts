/**
 * Academy Unlived: definitions and movesets.
 *  - glassAcolyte: ranged pressure from balconies — single glass shards (0.95 s tell) and a
 *    three-shard volley (1.3 s tell); a wand stab when cornered. Keeps its distance.
 *  - lensWarden: focuses a beam across a lane — the light line narrows for 1.35 s, locks, and
 *    fires at 1.7 s (the region draws and resolves it); pole sweep and overhead slam up close.
 *  - choirLeader: the ritual choir — while it chants, nearby Unlived are warded (damage ×0.3,
 *    bubbles + threads). Any hit interrupts the ritual for 9 s (a posture break for 14 s).
 *  - echoConstruct: mimics the last Imprint Technique the Returned used (the region swaps its
 *    echo move: lunge / bash / ward / measured; a slow mirror-cut before any technique is seen).
 *  - homunculus: small, fast, weak; comes in swarms (leap bite 0.5 s tell, claw pair).
 *  - suspendedGolem: big and slow — arm swing (1.0 s), overhead slam (1.4 s, unparryable AoE),
 *    chain whirl (1.2 s, unparryable ring).
 * Clips in ./clips.ts; custom move events are handled by the region (AcademyRegion).
 */
import type { EnemyDef } from '../../actors/Enemy';
import type { MoveDef, HitSpec } from '../../combat/types';
import type { BoneName } from '../../actors/rigDefs';
import { registerMoves } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { academyClips, WAND_REST, POLE_HOLD, FORK_REST, ECHO_REST } from './clips';

registerClips(academyClips);

const M = (d: MoveDef) => d;
const trail = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const sfx = (t: number, cue: 'enemy_windup' | 'swing_light' | 'swing_heavy' | 'swing_huge' | 'enemy_grunt' | 'cast_shard' | 'ward_up' | 'unparryable_tell' | 'great_bell_toll' | 'boss_roar') => ({ t, e: { type: 'sfx' as const, cue } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec => ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 1.5, ...extra });
const S = (start: number, end: number, bone: BoneName | 'root', offset: [number, number, number], radius: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec => ({ start, end, source: 'sphere', sphere: { bone, offset, radius }, dmg, posture: 0, poise, kind: 'strike', knock: 2, ...extra });

registerMoves({
  // ---- glass acolyte
  aco_shard: M({ id: 'aco_shard', clip: 'acoCast', dur: 1.7, track: [0.95, 4], events: [sfx(0.15, 'enemy_windup'), custom(0.2, 'charge'), custom(0.96, 'glassShard'), sfx(0.96, 'cast_shard')] }),
  aco_volley: M({ id: 'aco_volley', clip: 'acoVolley', dur: 2.3, track: [1.3, 3], events: [sfx(0.15, 'enemy_windup'), custom(0.2, 'charge'), custom(1.32, 'glassShardL'), custom(1.47, 'glassShard'), custom(1.62, 'glassShardR'), sfx(1.32, 'cast_shard'), sfx(1.47, 'cast_shard'), sfx(1.62, 'cast_shard')] }),
  aco_stab: M({ id: 'aco_stab', clip: 'acoStab', dur: 1.2, hits: [W(0.56, 0.7, 95, 20, { kind: 'thrust' })], motion: [[0.5, 0], [0.66, 0.6]], track: [0.52, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.55, 'swing_light'), ...trail(0.55, 0.7)] }),
  aco_backstep: M({ id: 'aco_backstep', clip: 'backstep', dur: 0.6, motion: [[0.35, -2.4]], iframes: [0.05, 0.2] }),
  // ---- lens warden
  warden_beam: M({ id: 'warden_beam', clip: 'wardenBeam', dur: 2.6, track: [1.3, 1.5], hyper: [0.4, 1.8, 40], events: [sfx(0.1, 'enemy_windup'), custom(0.08, 'beamAim'), custom(1.35, 'beamLock'), custom(1.7, 'beamFire')] }),
  warden_sweep: M({ id: 'warden_sweep', clip: 'wardenSweep', dur: 1.9, hits: [W(0.88, 1.06, 190, 55, { knock: 3 })], motion: [[0.8, 0], [1.0, 0.6]], track: [0.8, 3.5], events: [sfx(0.12, 'enemy_windup'), sfx(0.86, 'swing_heavy'), ...trail(0.86, 1.08)] }),
  warden_slam: M({ id: 'warden_slam', clip: 'wardenSlam', dur: 2.2, hits: [W(1.0, 1.12, 240, 70, { kind: 'strike', knock: 4 })], motion: [[0.95, 0], [1.1, 0.7]], track: [0.95, 3], hyper: [0.5, 1.12, 50], events: [sfx(0.15, 'enemy_grunt'), sfx(0.98, 'swing_huge'), { t: 1.1, e: { type: 'shake', amount: 0.3 } }, ...trail(0.98, 1.14)] }),
  // ---- ritual choir leader
  choir_chant: M({ id: 'choir_chant', clip: 'choirChant', dur: 3.0, walk: 0, events: [custom(0.1, 'chant')] }),
  choir_strike: M({ id: 'choir_strike', clip: 'choirStrike', dur: 1.5, hits: [W(0.7, 0.82, 130, 40, { kind: 'strike' })], motion: [[0.62, 0], [0.8, 0.5]], track: [0.62, 3.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.68, 'swing_heavy'), ...trail(0.68, 0.84)] }),
  choir_toll: M({ id: 'choir_toll', clip: 'choirToll', dur: 2.2, tell: 'unparryable', hits: [S(1.12, 1.24, 'root', [0, 0.4, 0.6], 2.8, 150, 80, { unparryable: true, knock: 5, kind: 'magic' })], track: [0.9, 2], hyper: [0.4, 1.2, 40], events: [sfx(0.1, 'unparryable_tell'), sfx(1.12, 'great_bell_toll'), { t: 1.12, e: { type: 'shake', amount: 0.35 } }, custom(1.12, 'tollRing')] }),
  // ---- echo construct
  echo_cut: M({ id: 'echo_cut', clip: 'echoCut', dur: 1.4, hits: [W(0.63, 0.78, 160, 35)], motion: [[0.55, 0], [0.75, 0.7]], track: [0.58, 4.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.6, 'swing_light'), ...trail(0.6, 0.8)] }),
  echo_cut2: M({ id: 'echo_cut2', clip: 'echoCut2', dur: 1.2, hits: [W(0.38, 0.52, 150, 35)], motion: [[0.3, 0], [0.5, 0.5]], track: [0.34, 4], events: [sfx(0.36, 'swing_light'), ...trail(0.36, 0.54)] }),
  echo_lunge: M({ id: 'echo_lunge', clip: 'echoLunge', dur: 1.6, hits: [W(0.78, 0.9, 210, 60, { kind: 'thrust', knock: 3 })], motion: [[0.7, -0.1], [0.88, 3.0]], track: [0.72, 5], events: [custom(0.05, 'echo'), sfx(0.1, 'enemy_windup'), sfx(0.76, 'swing_heavy'), ...trail(0.76, 0.9)] }),
  echo_bash: M({ id: 'echo_bash', clip: 'echoBash', dur: 1.5, tell: 'unparryable', hits: [S(0.76, 0.9, 'handL', [0, 0.05, 0], 0.5, 150, 85, { unparryable: true, guardBreak: true, knock: 5 })], motion: [[0.66, -0.2], [0.86, 1.4]], track: [0.66, 4], events: [custom(0.05, 'echo'), sfx(0.1, 'unparryable_tell')] }),
  echo_ward: M({ id: 'echo_ward', clip: 'echoWard', dur: 1.4, events: [custom(0.05, 'echo'), sfx(0.4, 'ward_up'), custom(0.5, 'echoWard')] }),
  echo_measured: M({ id: 'echo_measured', clip: 'echoMeasured', dur: 2.0, hits: [W(0.66, 0.8, 150, 35, { group: 0 }), W(0.96, 1.1, 200, 60, { group: 1, knock: 3 })], motion: [[0.6, 0], [0.8, 1.6], [0.95, 1.8], [1.1, 3.2]], track: [0.62, 4], events: [custom(0.05, 'echo'), sfx(0.1, 'enemy_windup'), sfx(0.64, 'swing_heavy'), sfx(0.94, 'swing_heavy'), ...trail(0.64, 1.12)] }),
  echo_mirror: M({ id: 'echo_mirror', clip: 'echoMirror', dur: 2.0, hits: [W(1.04, 1.16, 210, 60, { kind: 'strike', knock: 3 })], motion: [[1.0, 0], [1.14, 0.6]], track: [0.95, 4], hyper: [0.5, 1.16, 30], events: [custom(0.05, 'echo'), sfx(0.15, 'enemy_grunt'), sfx(1.0, 'swing_huge'), ...trail(1.0, 1.18)] }),
  // ---- homunculus
  hom_bite: M({ id: 'hom_bite', clip: 'homBite', dur: 1.1, hits: [S(0.6, 0.76, 'head', [0, 0.05, 0.1], 0.32, 55, 18, { kind: 'thrust' })], motion: [[0.5, 0], [0.72, 1.7]], track: [0.5, 6], events: [sfx(0.1, 'enemy_windup')] }),
  hom_claw: M({ id: 'hom_claw', clip: 'homClaw', dur: 0.9, hits: [S(0.44, 0.54, 'handR', [0, -0.05, 0], 0.28, 40, 12, { kind: 'slash' })], motion: [[0.38, 0], [0.52, 0.4]], track: [0.4, 6], events: [sfx(0.08, 'enemy_windup')] }),
  hom_claw2: M({ id: 'hom_claw2', clip: 'homClaw2', dur: 0.8, hits: [S(0.28, 0.38, 'handL', [0, -0.05, 0], 0.28, 40, 12, { kind: 'slash' })], motion: [[0.24, 0], [0.36, 0.3]], track: [0.26, 6] }),
  hom_hurt: M({ id: 'hom_hurt', clip: 'homHurt', dur: 0.4, fade: 0.03 }),
  hom_death: M({ id: 'hom_death', clip: 'homDeath', dur: 1.3, fade: 0.05 }),
  // ---- suspended golem
  golem_swing: M({ id: 'golem_swing', clip: 'golemSwing', dur: 2.1, hits: [S(1.1, 1.3, 'handR', [0, -0.1, 0], 0.7, 260, 80, { knock: 5 })], motion: [[1.0, 0], [1.25, 0.6]], track: [1.0, 2.5], hyper: [0.4, 1.3, 120], events: [sfx(0.15, 'enemy_grunt'), sfx(1.08, 'swing_huge')] }),
  golem_slam: M({ id: 'golem_slam', clip: 'golemSlam', dur: 2.7, tell: 'unparryable', hits: [S(1.5, 1.62, 'root', [0, 0.4, 2.0], 2.4, 300, 100, { unparryable: true, knock: 6 })], motion: [[1.35, 0], [1.52, 0.5]], track: [1.3, 2], hyper: [0.3, 1.62, 200], events: [sfx(0.1, 'unparryable_tell'), sfx(1.45, 'swing_huge'), { t: 1.52, e: { type: 'shake', amount: 0.6 } }, custom(1.52, 'slamDust')] }),
  golem_whirl: M({ id: 'golem_whirl', clip: 'golemWhirl', dur: 2.6, tell: 'unparryable', hits: [S(1.25, 1.75, 'root', [0, 1.2, 0], 3.3, 180, 70, { unparryable: true, knock: 5 })], track: [0, 1], hyper: [0.4, 1.8, 200], events: [sfx(0.1, 'unparryable_tell'), sfx(1.25, 'swing_huge'), custom(1.3, 'chainRattle')] }),
  golem_death: M({ id: 'golem_death', clip: 'golemDeath', dur: 2.2, fade: 0.06 }),
});

const UNLIVED = { physical: 0.1, magic: 0.05, fire: 0.0 };

export const ACADEMY_ENEMIES: Record<string, EnemyDef> = {
  glassAcolyte: {
    kind: 'glassAcolyte', name: 'Glass Acolyte', look: 'glassAcolyte', props: { height: 0.98, bulk: 0.88, shoulder: 0.92 }, radius: 0.34, height: 1.75,
    hp: 170, poise: 10, postureMax: 110, postureRegen: 24, defense: 50, absorb: { physical: 0.05, magic: 0.25, fire: 0 }, hours: 95, walk: 1.6, run: 3.8, sight: 22,
    weaponR: 'acolyte_wand', stance: { handR: WAND_REST, handL: null, chest: [2, -4, 0] },
    attacks: [
      { move: 'aco_shard', range: [4, 24], angle: 0.45, weight: 4, cooldown: 1.6 },
      { move: 'aco_volley', range: [5, 20], angle: 0.4, weight: 1.5, cooldown: 7 },
      { move: 'aco_stab', range: [0, 2.1], weight: 3 },
      { move: 'aco_backstep', range: [0, 2.4], weight: 1.2, cooldown: 4 },
    ],
    keepDistance: [6, 16], recover: [0.7, 1.4], aggression: 0.6,
  },
  lensWarden: {
    kind: 'lensWarden', name: 'Lens Warden', look: 'lensWarden', props: { height: 1.12, bulk: 1.1, shoulder: 1.08 }, radius: 0.46, height: 2.0,
    hp: 430, poise: 45, postureMax: 260, postureRegen: 30, defense: 75, absorb: { physical: 0.2, magic: 0.3, fire: 0.05 }, hours: 230, walk: 1.3, run: 3.0, sight: 24,
    weaponR: 'warden_lens_pole', stance: { handR: POLE_HOLD, handL: null, chest: [2, 0, 0] },
    attacks: [
      { move: 'warden_beam', range: [4, 26], angle: 0.5, weight: 3, cooldown: 5 },
      { move: 'warden_sweep', range: [0, 3.3], weight: 3 },
      { move: 'warden_slam', range: [0, 2.9], weight: 1.5, cooldown: 5 },
    ],
    backstabbable: true, recover: [1.0, 1.8], aggression: 0.5,
  },
  choirLeader: {
    kind: 'choirLeader', name: 'Ritual Choir', look: 'choirLeader', props: { height: 1.02, bulk: 0.95, shoulder: 0.95 }, radius: 0.4, height: 1.85,
    hp: 260, poise: 4, postureMax: 120, postureRegen: 22, defense: 50, absorb: { physical: 0.05, magic: 0.3, fire: 0 }, hours: 190, walk: 1.2, run: 3.2, sight: 18,
    weaponR: 'choir_fork', stance: { handR: FORK_REST, handL: null, chest: [3, 0, 0] },
    attacks: [
      { move: 'choir_chant', range: [3.2, 30], angle: 3.2, weight: 5 },
      { move: 'choir_strike', range: [0, 2.5], weight: 3 },
      { move: 'choir_toll', range: [0, 3.0], angle: 3.2, weight: 2, cooldown: 7 },
    ],
    keepDistance: [4, 9], recover: [0.9, 1.6], aggression: 0.7,
  },
  echoConstruct: {
    kind: 'echoConstruct', name: 'Echo Construct', look: 'echoConstruct', props: { height: 1.03, bulk: 0.95, shoulder: 1.02 }, radius: 0.38, height: 1.85,
    hp: 340, poise: 30, postureMax: 200, postureRegen: 28, defense: 65, absorb: { physical: 0.15, magic: 0.15, fire: 0.05 }, hours: 210, walk: 1.8, run: 4.2, sight: 16,
    weaponR: 'echo_blade', stance: { handR: ECHO_REST, handL: null, chest: [2, -6, 0] },
    attacks: [
      { move: 'echo_cut', range: [0, 2.6], weight: 3, follow: [['echo_cut2', 0.45]] },
      { move: 'echo_mirror', range: [0, 2.6], weight: 2, cooldown: 5 },
    ],
    backstabbable: true, recover: [0.8, 1.5], aggression: 0.6,
  },
  homunculus: {
    kind: 'homunculus', name: 'Homunculus', look: 'homunculus', props: { height: 0.56, bulk: 1.15, shoulder: 0.9 }, radius: 0.26, height: 1.0,
    hp: 70, poise: 0, postureMax: 60, postureRegen: 30, defense: 30, absorb: { physical: 0, magic: 0, fire: -0.1 }, hours: 28, walk: 2.2, run: 5.4, sight: 12,
    stance: { handR: null, handL: null, chest: [22, 0, 0], spine: [12, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.1, 0] },
    attacks: [
      { move: 'hom_bite', range: [1.0, 3.2], weight: 3, cooldown: 2 },
      { move: 'hom_claw', range: [0, 1.3], weight: 3, follow: [['hom_claw2', 0.5]] },
    ],
    reactions: { light: 'hom_hurt', heavy: 'hom_hurt', death: 'hom_death' },
    recover: [0.5, 1.1], aggression: 0.8,
  },
  suspendedGolem: {
    kind: 'suspendedGolem', name: 'Suspended Golem', look: 'suspendedGolem', props: { height: 1.45, bulk: 1.45, shoulder: 1.2 }, radius: 0.72, height: 2.6,
    hp: 900, poise: 90, postureMax: 480, postureRegen: 36, defense: 90, absorb: { physical: 0.3, magic: 0.1, fire: 0.2 }, hours: 650, walk: 1.0, run: 2.2, sight: 14,
    stance: { handR: null, handL: null, chest: [14, 0, 0], spine: [6, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.08, 0] },
    attacks: [
      { move: 'golem_swing', range: [0, 3.6], weight: 3 },
      { move: 'golem_slam', range: [0.5, 4.0], weight: 2, cooldown: 7 },
      { move: 'golem_whirl', range: [0, 3.4], angle: 3.2, weight: 1.5, cooldown: 9 },
    ],
    reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'golem_death' },
    backstabbable: false, recover: [1.2, 2.0], aggression: 0.55,
  },
};

registerEnemyDefs(ACADEMY_ENEMIES);

/** Echo moves by the Returned's last Imprint Technique move (the player's `tech_*` moves). */
export const ECHO_FOR: Record<string, { move: string; range: [number, number]; cooldown: number }> = {
  tech_lunge: { move: 'echo_lunge', range: [1.8, 5.2], cooldown: 4 },
  tech_bash: { move: 'echo_bash', range: [0, 2.3], cooldown: 5 },
  tech_ward: { move: 'echo_ward', range: [0, 12], cooldown: 9 },
  tech_measured: { move: 'echo_measured', range: [0.5, 4.2], cooldown: 5 },
};
