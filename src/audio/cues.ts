/**
 * Cue table: CueId → synth + mix routing. `gain` values are trims from the offline level check
 * (tools/preview/audio.html → "Level check") so cues sit in a consistent loudness hierarchy:
 *   combat-critical (parry, guard break, posture break, crit) ≈ -3…-5 dBFS peak
 *   hits / blocks / tells                                 ≈ -6…-9 dBFS
 *   bells: Great Bell ≈ -4, Stillbell ≈ -9, Unfinished Toll ≈ -16
 *   swings, magic, world                                   ≈ -9…-14
 *   footsteps, cloth, armour                               ≈ -20…-26
 *   UI                                                     ≈ -20…-26 (levelup ≈ -15)
 */
import type { CueId } from './contract';
import type { BusId } from './engine/Mixer';
import * as B from './synth/bells';
import * as I from './synth/impacts';
import * as M from './synth/magic';
import * as U from './synth/ui';
import * as V from './synth/voices';
import * as W from './synth/world';
import type { Synth } from './synth/types';

export interface CueDef {
  synth: Synth;
  bus: BusId;
  /** Output trim (linear). */
  gain: number;
  /** Reverb send (linear, relative to dry). */
  wet: number;
  /** Voice-stealing priority: 0 trivial … 3 must be heard. */
  priority: number;
  /** Music duck: [depth dB, hold s]. Combat cues cut through the score. */
  duck?: readonly [number, number];
  /** 3D distance model overrides. */
  ref?: number;
  rolloff?: number;
  /** For 2D plays, pick a random side (caption direction follows). */
  randomPan?: boolean;
}

const c = (synth: Synth, bus: BusId, gain: number, wet: number, priority: number, extra: Partial<CueDef> = {}): CueDef =>
  ({ synth, bus, gain, wet, priority, ...extra });

/** Standard combat duck: ~6 dB. */
const DUCK: readonly [number, number] = [6, 0.35];
const DUCK_BIG: readonly [number, number] = [6, 0.9];
const DUCK_SMALL: readonly [number, number] = [3, 0.2];

export const CUE_DEFS: Record<CueId, CueDef> = {
  // ---- UI ----
  ui_move: c(U.uiMove, 'ui', 1.14, 0.05, 1),
  ui_confirm: c(U.uiConfirm, 'ui', 0.563, 0.12, 1),
  ui_back: c(U.uiBack, 'ui', 0.712, 0.05, 1),
  ui_error: c(U.uiError, 'ui', 0.206, 0.05, 1),
  ui_open: c(U.uiOpen, 'ui', 0.673, 0.15, 1),
  ui_close: c(U.uiClose, 'ui', 1.23, 0.1, 1),
  ui_levelup: c(U.uiLevelup, 'ui', 0.802, 0.3, 2),
  ui_tab: c(U.uiTab, 'ui', 1.27, 0.05, 1),

  // ---- player movement ----
  step: c(I.step, 'sfx', 0.378, 0.06, 0, { ref: 1.5 }),
  roll: c(I.roll, 'sfx', 0.368, 0.08, 1),
  land: c(I.land, 'sfx', 0.308, 0.1, 1),
  armor_rattle: c(I.armorRattle, 'sfx', 1.18, 0.06, 0, { ref: 1.5 }),
  cloth_rustle: c(I.clothRustle, 'sfx', 0.969, 0.04, 0, { ref: 1.5 }),

  // ---- melee ----
  swing_light: c(I.swingLight, 'sfx', 1.18, 0.08, 1),
  swing_heavy: c(I.swingHeavy, 'sfx', 0.828, 0.1, 1),
  swing_huge: c(I.swingHuge, 'sfx', 0.708, 0.12, 2),
  charge_heavy: c(I.chargeHeavy, 'sfx', 1.03, 0.1, 1),
  charge_full: c(I.chargeFull, 'combat', 0.566, 0.2, 2, { duck: DUCK_SMALL }),
  hit_flesh: c(I.hitFlesh, 'combat', 0.756, 0.12, 2, { duck: DUCK_SMALL }),
  hit_armor: c(I.hitArmor, 'combat', 0.587, 0.15, 2, { duck: DUCK_SMALL }),
  hit_wood: c(I.hitWood, 'combat', 1.16, 0.12, 2, { duck: DUCK_SMALL }),
  hit_stone: c(I.hitStone, 'combat', 0.643, 0.12, 2, { duck: DUCK_SMALL }),
  hit_heavy: c(I.hitHeavy, 'combat', 0.477, 0.15, 2, { duck: DUCK }),
  guard_block: c(I.guardBlock, 'combat', 0.705, 0.15, 2, { duck: DUCK }),
  guard_break: c(I.guardBreak, 'combat', 0.425, 0.2, 3, { duck: DUCK_BIG }),
  parry_attempt: c(I.parryAttempt, 'sfx', 1.81, 0.08, 1),
  parry_success: c(I.parrySuccess, 'combat', 0.447, 0.35, 3, { duck: DUCK_BIG }),
  posture_break: c(B.postureBreak, 'combat', 0.523, 0.3, 3, { duck: DUCK_BIG }),
  critical_ready: c(B.criticalReady, 'combat', 0.922, 0.3, 3, { duck: DUCK }),
  critical_stab: c(I.criticalStab, 'combat', 0.673, 0.2, 3, { duck: DUCK_BIG }),
  stagger: c(I.stagger, 'combat', 0.643, 0.1, 2, { duck: DUCK_SMALL }),

  // ---- magic & tools ----
  cast_shard: c(M.castShard, 'sfx', 0.902, 0.3, 2),
  cast_cinder: c(M.castCinder, 'sfx', 0.819, 0.15, 2),
  fire_burst: c(M.fireBurst, 'combat', 0.511, 0.2, 2, { duck: DUCK, ref: 3 }),
  spell_heal: c(M.spellHeal, 'sfx', 1.19, 0.4, 2),
  ward_up: c(M.wardUp, 'sfx', 1, 0.3, 2),
  technique: c(M.technique, 'sfx', 0.837, 0.2, 2),
  throw: c(I.throwCue, 'sfx', 1.2, 0.08, 1),
  bow_draw: c(I.bowDraw, 'sfx', 2.96, 0.08, 3, { ref: 3 }),
  bow_release: c(I.bowRelease, 'sfx', 1.08, 0.1, 2, { ref: 3 }),
  arrow_hit: c(I.arrowHit, 'combat', 1.3, 0.12, 2, { duck: DUCK_SMALL }),

  // ---- enemies ----
  enemy_alert: c(V.enemyAlert, 'voice', 0.989, 0.2, 3, { ref: 3 }),
  enemy_windup: c(V.enemyWindup, 'combat', 2.45, 0.12, 3, { duck: DUCK, ref: 3 }),
  enemy_grunt: c(V.enemyGrunt, 'voice', 0.756, 0.12, 1, { ref: 3 }),
  enemy_pain: c(V.enemyPain, 'voice', 0.541, 0.12, 1, { ref: 3 }),
  enemy_death: c(V.enemyDeath, 'voice', 0.471, 0.25, 2, { ref: 3 }),
  unparryable_tell: c(V.unparryableTell, 'combat', 0.861, 0.2, 3, { duck: DUCK_BIG, ref: 4 }),
  boss_roar: c(V.bossRoar, 'voice', 0.725, 0.35, 3, { duck: DUCK_BIG, ref: 8 }),

  // ---- player state ----
  player_hurt: c(V.playerHurt, 'combat', 0.764, 0.1, 3, { duck: DUCK_SMALL }),
  player_death: c(V.playerDeath, 'sfx', 0.543, 0.4, 3, { duck: [10, 3] }),
  drink_flask: c(V.drinkFlask, 'sfx', 1.06, 0.15, 2),
  hours_gain: c(W.hoursGain, 'ui', 0.847, 0.25, 1),
  pickup: c(W.pickup, 'sfx', 1.06, 0.2, 1),
  last_breath_recover: c(V.lastBreathRecover, 'sfx', 0.537, 0.3, 3, { duck: DUCK }),
  low_health: c(V.lowHealth, 'sfx', 0.535, 0.02, 3),

  // ---- world ----
  stillbell_ring: c(B.stillbellRing, 'sfx', 0.519, 0.6, 3, { ref: 4, rolloff: 1 }),
  stillbell_rest: c(B.stillbellRest, 'sfx', 0.525, 0.6, 3),
  great_bell_toll: c(B.greatBellToll, 'sfx', 0.951, 0.7, 3, { ref: 80, rolloff: 0.6, duck: [4, 3] }),
  unfinished_toll: c(B.unfinishedToll, 'sfx', 0.371, 1.2, 3, { ref: 40, rolloff: 0.6, randomPan: true }),
  door_open: c(W.doorOpen, 'sfx', 1.15, 0.2, 1, { ref: 3 }),
  gate_open: c(W.gateOpen, 'sfx', 0.472, 0.25, 2, { ref: 4 }),
  hatch_open: c(W.hatchOpen, 'sfx', 0.517, 0.2, 1, { ref: 3 }),
  lever_pull: c(W.leverPull, 'sfx', 0.455, 0.2, 1, { ref: 3 }),
  chain_rattle: c(W.chainRattle, 'sfx', 1.36, 0.2, 1, { ref: 3 }),
  drawbridge_slam: c(W.drawbridgeSlam, 'sfx', 0.49, 0.4, 3, { ref: 12, rolloff: 0.8, duck: DUCK }),
  chest_open: c(W.chestOpen, 'sfx', 2.21, 0.15, 1),
  fog_enter: c(W.fogEnter, 'sfx', 1.09, 0.3, 2),
  anchor_shatter: c(W.anchorShatter, 'sfx', 0.473, 0.5, 3, { ref: 15, duck: [8, 2] }),
  collapse_rumble: c(W.collapseRumble, 'sfx', 0.624, 0.3, 3, { ref: 20, duck: [4, 3] }),
  memory_trigger: c(W.memoryTrigger, 'sfx', 0.871, 0.5, 2),
  journal_update: c(W.journalUpdate, 'ui', 0.764, 0.2, 1),
  masonry_touch: c(W.masonryTouch, 'sfx', 0.681, 0.2, 1),
  forge_hammer: c(W.forgeHammer, 'sfx', 0.42, 0.3, 1, { ref: 3 }),
};
