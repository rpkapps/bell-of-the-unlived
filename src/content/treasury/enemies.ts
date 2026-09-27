/**
 * The Undervaults — enemy definitions and movesets (gameplay windows here, poses in ./clips.ts).
 *
 *  - Starving militia (club / fork): weak, desperate, in groups; big lunges with long stumbles.
 *  - Debt collectors: hook sweeps and the GRAB — an unblockable, unparryable reach with the gilt
 *    left hand, told by an open-hand draw-back (0.8 s) and the HUD's hand glyph. A grab that
 *    connects takes Hours; the collector carries them until killed (see Region.ts).
 *  - Clockwork sentries: slow, armoured, weak to magic; a ratcheting 0.7 s wind-up then a full
 *    waist spin; they turn on fixed, deterministic watch patterns (Region.ts).
 *  - Vault guardians: hollow gilt armour kneeling over the treasure until disturbed; slow, heavy.
 *  - Coin-mimics: chests on legs. Tells while disguised: coins askew in the seam, a breathing lid.
 *  - Ledger wardens: arbalests from balconies and pulpits.
 *  - Coin-sentinels: small gilded clockwork summoned by the Treasurer to guard his coffers.
 *  - Ward-coffers: static, breakable; they project Aurel's ward (WardCoffer class below).
 */
import type { EnemyDef } from '../../actors/Enemy';
import { Enemy } from '../../actors/Enemy';
import type { Actor } from '../../actors/Actor';
import type { MoveDef } from '../../combat/types';
import { registerMoves, MOVES } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { treasuryClips, MIL_CLUB, FORK_R, COL_HOOK, CW_R, VG_R, MIM_R, MIM_L, LW_R, LW_L, CS_SPEAR } from './clips';
import type * as THREE from 'three';
import type { CueId } from '../../audio/contract';

registerClips(treasuryClips);

const M = (d: MoveDef) => d;
const trail = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const sfx = (t: number, cue: CueId) => ({ t, e: { type: 'sfx' as const, cue } });

registerMoves({
  // ---------------------------------------------------------------- militia
  tr_mil_flail: M({ id: 'tr_mil_flail', clip: 'trMilFlail', dur: 1.35, hits: [{ start: 0.57, end: 0.72, source: 'weaponR', dmg: 175, posture: 0, poise: 30, kind: 'strike', knock: 1.5 }], motion: [[0.5, 0], [0.7, 0.6]], track: [0.52, 4.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.55, 'swing_light'), ...trail(0.55, 0.74)] }),
  tr_mil_flail2: M({ id: 'tr_mil_flail2', clip: 'trMilFlail2', dur: 1.2, hits: [{ start: 0.36, end: 0.52, source: 'weaponR', dmg: 150, posture: 0, poise: 30, kind: 'strike', knock: 1.5 }], motion: [[0.3, 0], [0.5, 0.4]], track: [0.33, 4], events: [sfx(0.34, 'swing_light'), ...trail(0.34, 0.54)] }),
  tr_mil_lunge: M({ id: 'tr_mil_lunge', clip: 'trMilLunge', dur: 1.9, hits: [{ start: 0.68, end: 0.82, source: 'weaponR', dmg: 205, posture: 0, poise: 45, kind: 'strike', knock: 2.5 }], motion: [[0.6, -0.15], [0.82, 1.8]], track: [0.62, 5], events: [sfx(0.12, 'enemy_grunt'), sfx(0.66, 'swing_heavy'), ...trail(0.66, 0.84)] }),
  tr_fork_jab: M({ id: 'tr_fork_jab', clip: 'trForkJab', dur: 1.3, hits: [{ start: 0.58, end: 0.7, source: 'weaponR', dmg: 160, posture: 0, poise: 30, kind: 'thrust', knock: 2 }], motion: [[0.5, -0.1], [0.66, 0.7]], track: [0.54, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.56, 'swing_light')] }),
  tr_fork_lunge: M({ id: 'tr_fork_lunge', clip: 'trForkLunge', dur: 1.8, hits: [{ start: 0.7, end: 0.84, source: 'weaponR', dmg: 195, posture: 0, poise: 45, kind: 'thrust', knock: 2.5 }], motion: [[0.64, -0.15], [0.8, 1.6]], track: [0.66, 5], events: [sfx(0.12, 'enemy_grunt'), sfx(0.68, 'swing_light')] }),

  // ---------------------------------------------------------------- debt collectors
  tr_col_hook: M({ id: 'tr_col_hook', clip: 'trColHook', dur: 1.5, hits: [{ start: 0.62, end: 0.78, source: 'weaponR', dmg: 240, posture: 0, poise: 40, kind: 'slash', knock: 2 }], motion: [[0.6, 0], [0.76, 0.6]], track: [0.58, 4], events: [sfx(0.08, 'enemy_windup'), sfx(0.6, 'swing_heavy'), ...trail(0.6, 0.8)] }),
  tr_col_hook2: M({ id: 'tr_col_hook2', clip: 'trColHook2', dur: 1.3, hits: [{ start: 0.4, end: 0.52, source: 'weaponR', dmg: 220, posture: 0, poise: 40, kind: 'slash', knock: 2 }], motion: [[0.3, 0], [0.5, 0.5]], track: [0.36, 4], events: [sfx(0.38, 'swing_heavy'), ...trail(0.38, 0.54)] }),
  tr_col_grab: M({
    id: 'tr_col_grab', clip: 'trColGrab', dur: 1.95, tell: 'grab',
    hits: [{ start: 0.84, end: 0.98, source: 'sphere', sphere: { bone: 'handL', offset: [0, -0.08, 0.04], radius: 0.42 }, dmg: 150, posture: 0, poise: 60, kind: 'strike', unparryable: true, unblockable: true, knock: 3 }],
    motion: [[0.8, -0.1], [0.96, 1.5]], track: [0.8, 4], events: [sfx(0.1, 'enemy_grunt'), sfx(0.84, 'swing_heavy')],
  }),

  // ---------------------------------------------------------------- clockwork
  tr_cw_spin: M({ id: 'tr_cw_spin', clip: 'trCwSpin', dur: 2.2, hits: [{ start: 0.78, end: 1.12, source: 'weaponR', dmg: 260, posture: 0, poise: 60, kind: 'slash', knock: 3 }], hyper: [0.4, 1.12, 60], track: [0.6, 4], events: [sfx(0.05, 'enemy_windup'), sfx(0.3, 'chain_rattle'), sfx(0.78, 'swing_heavy'), sfx(0.95, 'swing_heavy'), ...trail(0.76, 1.14)] }),
  tr_cw_thrust: M({ id: 'tr_cw_thrust', clip: 'trCwThrust', dur: 1.5, hits: [{ start: 0.62, end: 0.76, source: 'weaponR', dmg: 230, posture: 0, poise: 45, kind: 'thrust', knock: 2 }], motion: [[0.58, -0.15], [0.74, 0.9]], track: [0.58, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.6, 'swing_heavy'), ...trail(0.6, 0.78)] }),
  tr_cw_watch: M({ id: 'tr_cw_watch', clip: 'trCwWatch', dur: 2.0 }),
  tr_cs_jab: M({ id: 'tr_cs_jab', clip: 'trCsJab', dur: 1.3, hits: [{ start: 0.58, end: 0.7, source: 'weaponR', dmg: 150, posture: 0, poise: 25, kind: 'thrust', knock: 1.5 }], motion: [[0.52, -0.1], [0.68, 0.7]], track: [0.54, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.56, 'swing_light')] }),

  // ---------------------------------------------------------------- vault guardians
  tr_vg_overhead: M({ id: 'tr_vg_overhead', clip: 'trVgOverhead', dur: 2.3, hits: [{ start: 1.06, end: 1.18, source: 'weaponR', dmg: 340, posture: 0, poise: 90, kind: 'strike', knock: 4 }], motion: [[1.0, 0], [1.16, 0.7]], track: [0.95, 3], hyper: [0.5, 1.2, 90], events: [sfx(0.1, 'enemy_grunt'), sfx(1.02, 'swing_huge'), { t: 1.18, e: { type: 'shake', amount: 0.35 } }, sfx(1.18, 'hit_stone'), ...trail(1.02, 1.2)] }),
  tr_vg_sweep: M({ id: 'tr_vg_sweep', clip: 'trVgSweep', dur: 1.9, hits: [{ start: 0.86, end: 1.02, source: 'weaponR', dmg: 300, posture: 0, poise: 70, kind: 'strike', knock: 3.5 }], motion: [[0.8, 0], [1.0, 0.5]], track: [0.8, 3.5], hyper: [0.4, 1.0, 70], events: [sfx(0.1, 'enemy_windup'), sfx(0.84, 'swing_huge'), ...trail(0.84, 1.04)] }),
  tr_vg_stomp: M({ id: 'tr_vg_stomp', clip: 'trVgStomp', dur: 1.8, tell: 'unparryable', hits: [{ start: 0.96, end: 1.06, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.3, 0.3], radius: 2.4 }, dmg: 220, posture: 0, poise: 80, kind: 'strike', unparryable: true, knock: 6 }], hyper: [0.3, 1.1, 90], events: [sfx(0.2, 'enemy_grunt'), { t: 0.98, e: { type: 'shake', amount: 0.4 } }, sfx(0.98, 'hit_stone')] }),
  tr_vg_wake: M({ id: 'tr_vg_wake', clip: 'trVgWake', dur: 1.5, noFlinch: true, events: [sfx(0.2, 'armor_rattle'), sfx(0.7, 'enemy_alert')] }),

  // ---------------------------------------------------------------- coin-mimics
  tr_mim_bite: M({ id: 'tr_mim_bite', clip: 'trMimBite', dur: 1.45, hits: [{ start: 0.62, end: 0.72, source: 'sphere', sphere: { bone: 'hips', offset: [0, 0.3, 0.5], radius: 0.55 }, dmg: 260, posture: 0, poise: 60, kind: 'strike', knock: 3 }], motion: [[0.55, -0.1], [0.72, 1.8]], track: [0.58, 5], events: [sfx(0.1, 'chest_open'), sfx(0.62, 'swing_heavy')] }),
  tr_mim_slam: M({ id: 'tr_mim_slam', clip: 'trMimSlam', dur: 1.65, hits: [{ start: 0.76, end: 0.86, source: 'sphere', sphere: { bone: 'handR', offset: [0, -0.05, 0], radius: 0.36 }, dmg: 240, posture: 0, poise: 60, kind: 'strike', knock: 3, group: 0 }, { start: 0.76, end: 0.86, source: 'sphere', sphere: { bone: 'handL', offset: [0, -0.05, 0], radius: 0.36 }, dmg: 240, posture: 0, poise: 60, kind: 'strike', knock: 3, group: 0 }], track: [0.68, 4], events: [sfx(0.15, 'chain_rattle'), sfx(0.76, 'swing_heavy'), { t: 0.82, e: { type: 'shake', amount: 0.2 } }] }),
  tr_mim_rise: M({ id: 'tr_mim_rise', clip: 'trMimicRise', dur: 1.0, events: [sfx(0.02, 'chest_open'), sfx(0.2, 'enemy_alert')] }),
  tr_mim_death: M({ id: 'tr_mim_death', clip: 'trMimDeath', dur: 1.3, events: [sfx(0.4, 'chest_open')] }),

  // ---------------------------------------------------------------- ledger wardens
  tr_lw_shoot: M({ id: 'tr_lw_shoot', clip: 'trLwShoot', dur: 1.75, track: [1.2, 3], events: [sfx(0.2, 'bow_draw'), { t: 1.25, e: { type: 'custom', id: 'shoot' } }] }),
  tr_lw_bash: M({ id: 'tr_lw_bash', clip: 'trLwBash', dur: 1.2, hits: [{ start: 0.52, end: 0.64, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0.1, 0.2], radius: 0.35 }, dmg: 150, posture: 0, poise: 40, kind: 'strike', knock: 3 }], motion: [[0.48, 0], [0.62, 0.5]], track: [0.5, 4], events: [sfx(0.1, 'enemy_windup')] }),

  // ---------------------------------------------------------------- ward-coffer
  tr_coffer_idle: M({ id: 'tr_coffer_idle', clip: 'trCofferIdle', dur: 1e9 }),
  tr_coffer_break: M({ id: 'tr_coffer_break', clip: 'trCofferIdle', dur: 0.9, iframes: [0, 0.9], events: [sfx(0.02, 'guard_break'), sfx(0.3, 'chest_open')] }),
});

const UNLIVED = { physical: 0.1, magic: 0.05, fire: 0.0 };

registerEnemyDefs({
  tr_militia: {
    kind: 'tr_militia', name: 'Starving Militiaman', look: 'tr_militia', props: { height: 0.97, bulk: 0.82, shoulder: 0.95 }, radius: 0.34, height: 1.72,
    hp: 260, poise: 12, postureMax: 150, postureRegen: 24, defense: 45, absorb: UNLIVED, hours: 180, walk: 1.8, run: 4.4, sight: 12,
    weaponR: 'militia_club', stance: { handR: MIL_CLUB, handL: null, chest: [14, -4, 0], spine: [8, 0, 0], head: [-12, 0, 0] },
    attacks: [
      { move: 'tr_mil_flail', range: [0, 2.4], weight: 4, follow: [['tr_mil_flail2', 0.5]] },
      { move: 'tr_mil_lunge', range: [1.8, 4.2], weight: 2, cooldown: 4 },
    ],
    recover: [0.9, 1.6], aggression: 0.75,
  },
  tr_militiaFork: {
    kind: 'tr_militiaFork', name: 'Starving Militiaman', look: 'tr_militia', props: { height: 0.99, bulk: 0.8, shoulder: 0.95 }, radius: 0.34, height: 1.74,
    hp: 250, poise: 12, postureMax: 150, postureRegen: 24, defense: 45, absorb: UNLIVED, hours: 180, walk: 1.8, run: 4.3, sight: 12,
    weaponR: 'militia_fork', stance: { handR: FORK_R, handL: { p: [-0.186, 1.055, 0.4475], dir: FORK_R.dir, elbow: [0.8, -0.4, -0.35] }, chest: [14, -4, 0], spine: [8, 0, 0], head: [-12, 0, 0] },
    attacks: [
      { move: 'tr_fork_jab', range: [0.8, 3.4], weight: 3, follow: [['tr_fork_jab', 0.3]] },
      { move: 'tr_fork_lunge', range: [2.2, 4.6], weight: 2, cooldown: 4 },
    ],
    recover: [0.9, 1.6], aggression: 0.7,
  },
  tr_collector: {
    kind: 'tr_collector', name: 'Debt Collector', look: 'tr_collector', props: { height: 1.08, bulk: 0.95, shoulder: 1.0 }, radius: 0.38, height: 1.95,
    hp: 520, poise: 30, postureMax: 240, postureRegen: 28, defense: 70, absorb: { physical: 0.12, magic: 0.05, fire: 0.0 }, hours: 520, walk: 1.6, run: 3.9, sight: 14,
    weaponR: 'collector_hook', stance: { handR: COL_HOOK, handL: null, chest: [2, -4, 0] },
    attacks: [
      { move: 'tr_col_hook', range: [0, 3.2], weight: 4, follow: [['tr_col_hook2', 0.4]] },
      { move: 'tr_col_grab', range: [0, 2.8], weight: 2.2, cooldown: 6 },
    ],
    recover: [0.8, 1.4], aggression: 0.6,
  },
  tr_collectorHead: {
    kind: 'tr_collectorHead', name: 'Head Collector', look: 'tr_collectorHead', props: { height: 1.12, bulk: 1.05, shoulder: 1.05 }, radius: 0.4, height: 2.0,
    hp: 820, poise: 40, postureMax: 320, postureRegen: 30, defense: 75, absorb: { physical: 0.14, magic: 0.05, fire: 0.0 }, hours: 1400, walk: 1.6, run: 4.0, sight: 15,
    weaponR: 'collector_hook', stance: { handR: COL_HOOK, handL: null, chest: [2, -4, 0] },
    attacks: [
      { move: 'tr_col_hook', range: [0, 3.2], weight: 4, follow: [['tr_col_hook2', 0.6]] },
      { move: 'tr_col_grab', range: [0, 2.8], weight: 2.5, cooldown: 5 },
    ],
    recover: [0.7, 1.3], aggression: 0.65,
  },
  tr_sentry: {
    kind: 'tr_sentry', name: 'Clockwork Sentry', look: 'tr_sentry', props: { height: 1.05, bulk: 1.1, shoulder: 1.05 }, radius: 0.42, height: 1.9,
    hp: 560, poise: 55, postureMax: 300, postureRegen: 30, defense: 85, absorb: { physical: 0.3, magic: 0.0, fire: 0.1 }, hours: 460, walk: 1.3, run: 2.9, sight: 10,
    weaponR: 'tally_glaive', stance: { handR: CW_R, handL: { p: [CW_R.p[0] + 0.02, CW_R.p[1] + 0.34, CW_R.p[2] + 0.4], dir: CW_R.dir, elbow: [0.8, -0.4, -0.35] } },
    attacks: [
      { move: 'tr_cw_spin', range: [0, 2.6], weight: 3, cooldown: 5 },
      { move: 'tr_cw_thrust', range: [1.2, 3.8], weight: 3 },
    ],
    reactions: { light: 'boss_flinch' },
    recover: [1.0, 1.8], aggression: 0.5,
  },
  tr_coinSentinel: {
    kind: 'tr_coinSentinel', name: 'Coin-Sentinel', look: 'tr_coinSentinel', props: { height: 0.8, bulk: 0.95, shoulder: 1.0 }, radius: 0.32, height: 1.45,
    hp: 240, poise: 20, postureMax: 140, postureRegen: 26, defense: 70, absorb: { physical: 0.25, magic: 0.0, fire: 0.1 }, hours: 0, walk: 1.6, run: 3.6, sight: 30,
    weaponR: 'enemy_spear', stance: { handR: CS_SPEAR, handL: null },
    attacks: [{ move: 'tr_cs_jab', range: [0.6, 2.9], weight: 3 }],
    recover: [0.9, 1.6], aggression: 0.6,
  },
  tr_guardian: {
    kind: 'tr_guardian', name: 'Vault Guardian', look: 'tr_guardian', props: { height: 1.22, bulk: 1.3, shoulder: 1.2 }, radius: 0.55, height: 2.2,
    hp: 1100, poise: 80, postureMax: 480, postureRegen: 34, defense: 90, absorb: { physical: 0.3, magic: 0.05, fire: 0.15 }, hours: 1150, walk: 1.25, run: 2.7, sight: 9,
    weaponR: 'guardian_maul', stance: { handR: VG_R, handL: { p: [VG_R.p[0] + 0.2, VG_R.p[1] + 0.44, VG_R.p[2] + 0.28], dir: VG_R.dir, elbow: [0.8, -0.4, -0.35] }, chest: [4, 0, 0] },
    attacks: [
      { move: 'tr_vg_overhead', range: [0, 3.4], weight: 3, cooldown: 3 },
      { move: 'tr_vg_sweep', range: [0, 3.2], weight: 3 },
      { move: 'tr_vg_stomp', range: [0, 2.2], weight: 1.5, cooldown: 8 },
    ],
    reactions: { light: 'boss_flinch', heavy: 'boss_flinch' },
    backstabbable: true, recover: [1.0, 1.8], aggression: 0.55,
  },
  tr_mimic: {
    kind: 'tr_mimic', name: 'Coin-Mimic', look: 'tr_mimic', props: { height: 1.0, bulk: 1.0, shoulder: 1.0 }, radius: 0.5, height: 1.6,
    hp: 600, poise: 40, postureMax: 260, postureRegen: 28, defense: 70, absorb: { physical: 0.15, magic: 0.05, fire: 0.0 }, hours: 900, walk: 1.7, run: 4.6, sight: 2.6,
    stance: { handR: MIM_R, handL: MIM_L, head: [-8, 0, 0] },
    attacks: [
      { move: 'tr_mim_bite', range: [0, 3.4], weight: 3, cooldown: 2 },
      { move: 'tr_mim_slam', range: [0, 2.2], weight: 2 },
    ],
    reactions: { death: 'tr_mim_death' },
    recover: [0.7, 1.3], aggression: 0.7,
  },
  tr_warden: {
    kind: 'tr_warden', name: 'Ledger Warden', look: 'tr_warden', props: { height: 1.0, bulk: 0.95, shoulder: 1.0 }, radius: 0.36, height: 1.8,
    hp: 300, poise: 12, postureMax: 180, postureRegen: 24, defense: 60, absorb: UNLIVED, hours: 380, walk: 1.6, run: 3.6, sight: 22,
    weaponR: 'garrison_arbalest', stance: { handR: LW_R, handL: LW_L },
    attacks: [
      { move: 'tr_lw_shoot', range: [3.5, 24], angle: 0.5, weight: 3, cooldown: 1.6 },
      { move: 'tr_lw_bash', range: [0, 2.2], weight: 2 },
    ],
    keepDistance: [5, 14], recover: [0.8, 1.6], aggression: 0.65,
  },
  tr_coffer: {
    kind: 'tr_coffer', name: 'Ward-Coffer', look: 'tr_coffer', props: { height: 1.0, bulk: 1.8, shoulder: 1.0 }, radius: 0.55, height: 1.2,
    hp: 480, poise: 9999, postureMax: 99999, postureRegen: 0, defense: 50, absorb: { physical: 0, magic: 0, fire: 0 }, hours: 0, walk: 0, run: 0, sight: 0,
    stance: { handR: null, handL: null }, attacks: [],
    reactions: { death: 'tr_coffer_break' }, backstabbable: false, criticalable: false,
    recover: [1, 1], aggression: 0,
  },
});

/**
 * A ward-coffer: an immobile, breakable Combatant. It never turns, flinches or attacks; it is
 * always "aware" so its health bar shows while it is being broken.
 */
export class WardCoffer extends Enemy {
  constructor(def: EnemyDef, svc: ConstructorParameters<typeof Enemy>[1], seed: number) {
    super(def, svc, seed);
    this.mass = 1000;
    this.backstabbable = false;
    this.criticalable = false;
  }
  override think(_dt: number, _player: Actor) {
    this.wish.set(0, 0, 0);
    this.guarding = false;
    this.aware = !this.dead;
    if (!this.move && !this.dead) this.startMove(MOVES.tr_coffer_idle, { fade: 0 });
  }
  override react(kind: Parameters<Enemy['react']>[0], from: THREE.Vector3) {
    if (this.dead || this.move?.def.id === 'tr_coffer_break') return;
    if (kind === 'death') {
      this.hp = 0;
      this.startMove(MOVES.tr_coffer_break, { fade: 0 });
      this.svc.sfx('enemy_death', { pos: this.pos });
      return;
    }
    this.svc.sfx('hit_wood', { pos: this.pos });
    void from;
  }
  override resetAt(pos: THREE.Vector3, yaw: number) { super.resetAt(pos, yaw); this.startMove(MOVES.tr_coffer_idle, { fade: 0 }); }
}
