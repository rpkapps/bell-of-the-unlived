/**
 * Cathedral enemies: definitions and movesets. Gameplay windows live here; animations in ./clips.
 * Region mechanics that need more than a moveset (the healer's rite and heal link, the flagellant's
 * self-harm frenzy, the mourner giant's grab-and-crush, pleading pilgrims) are driven by the
 * region controller (./Region.ts) from the move ids and custom events declared here.
 *
 *   cath_pilgrim   weak, numerous, some kneel pleading before the Roll          HP 120
 *   cath_flagellant self-harming berserker: stronger as its health falls        HP 260
 *   cath_healer    healer-priest: heals allies' health & posture (the rite)    HP 300
 *   cath_mourner   mourner giant: slow, huge, grab (hand icon) + crush         HP 1100
 *   cath_bearer    procession bearer (pole)                                     HP 420
 *   cath_cantor    cantor: sings the reliquary awake (Procession fight)         HP 260
 */
import type { EnemyDef } from '../../actors/Enemy';
import type { HitSpec, MoveDef } from '../../combat/types';
import { registerMoves } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { cathedralClips, PIL_STAFF, FLG_REST, HLR_CENSER, HLR_BELL, MG_REST, BR_POLE, CTR_STAFF } from './clips';

registerClips(cathedralClips);

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 1.5, ...x });
const SPH = (start: number, end: number, bone: NonNullable<HitSpec['sphere']>['bone'], offset: [number, number, number], radius: number, dmg: number, poise: number, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'sphere', sphere: { bone, offset, radius }, dmg, posture: 0, poise, kind: 'strike', knock: 3, ...x });
const sfx = (t: number, cue: 'enemy_windup' | 'enemy_grunt' | 'swing_light' | 'swing_heavy' | 'swing_huge' | 'unparryable_tell' | 'great_bell_toll' | 'spell_heal' | 'ward_up' | 'boss_roar', volume?: number) =>
  ({ t, e: { type: 'sfx' as const, cue, volume } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const shake = (t: number, amount: number) => ({ t, e: { type: 'shake' as const, amount } });

registerMoves({
  // ---------------------------------------------------------------- pilgrim
  cath_pil_strike: M({ id: 'cath_pil_strike', clip: 'cathPilStrike', dur: 1.55, hits: [W(0.66, 0.78, 110, 25, { kind: 'strike' })], motion: [[0.6, 0], [0.76, 0.5]], track: [0.6, 4], events: [sfx(0.1, 'enemy_windup'), sfx(0.64, 'swing_light'), ...tr(0.64, 0.8)] }),
  cath_pil_jab: M({ id: 'cath_pil_jab', clip: 'cathPilJab', dur: 1.35, hits: [W(0.58, 0.68, 90, 20, { kind: 'thrust' })], motion: [[0.55, -0.1], [0.66, 0.8]], track: [0.56, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.57, 'swing_light')] }),
  cath_pil_clutch: M({ id: 'cath_pil_clutch', clip: 'cathPilClutch', dur: 1.4, hits: [SPH(0.66, 0.78, 'handL', [0, -0.05, 0], 0.35, 60, 30, { knock: 3 })], motion: [[0.6, -0.1], [0.74, 1.0]], track: [0.62, 5], events: [sfx(0.1, 'enemy_grunt')] }),
  cath_pil_rise: M({ id: 'cath_pil_rise', clip: 'cathPilRise', dur: 0.8 }),

  // ---------------------------------------------------------------- flagellant
  cath_flg_lash: M({ id: 'cath_flg_lash', clip: 'cathFlgLash', dur: 1.35, hits: [W(0.56, 0.72, 130, 30)], motion: [[0.5, 0], [0.7, 0.8]], track: [0.52, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.55, 'swing_light'), ...tr(0.55, 0.74)] }),
  cath_flg_frenzy: M({
    id: 'cath_flg_frenzy', clip: 'cathFlgFrenzy', dur: 2.25,
    hits: [W(0.54, 0.68, 110, 25, { group: 0 }), W(0.9, 1.02, 110, 25, { group: 1 }), W(1.34, 1.44, 160, 50, { kind: 'strike', knock: 3, group: 2 })],
    motion: [[0.5, 0], [0.68, 0.7], [0.86, 0.7], [1.02, 1.3], [1.2, 1.3], [1.42, 1.9]], track: [1.25, 4],
    events: [sfx(0.1, 'enemy_grunt'), sfx(0.52, 'swing_light'), sfx(0.88, 'swing_light'), sfx(1.3, 'swing_heavy'), ...tr(0.52, 1.46)],
  }),
  cath_flg_scourge: M({ id: 'cath_flg_scourge', clip: 'cathFlgScourge', dur: 2.0, events: [sfx(0.35, 'swing_light'), custom(0.45, 'scourge'), sfx(0.82, 'swing_light'), custom(0.9, 'scourge'), sfx(1.25, 'boss_roar', 0.6), custom(1.3, 'frenzy')] }),
  cath_flg_leap: M({ id: 'cath_flg_leap', clip: 'cathFlgLeap', dur: 1.9, hits: [W(0.92, 1.02, 180, 55, { kind: 'strike', knock: 3 })], motion: [[0.72, 0], [0.97, 3.2]], track: [0.8, 4], hyper: [0.7, 1.0, 40], events: [sfx(0.1, 'enemy_grunt'), sfx(0.9, 'swing_heavy'), shake(1.0, 0.2), ...tr(0.88, 1.04)] }),

  // ---------------------------------------------------------------- healer-priest
  cath_hlr_swing: M({ id: 'cath_hlr_swing', clip: 'cathHlrSwing', dur: 1.45, hits: [W(0.62, 0.8, 120, 30, { kind: 'strike' })], motion: [[0.58, 0], [0.78, 0.5]], track: [0.6, 4], events: [sfx(0.1, 'enemy_windup'), sfx(0.6, 'swing_light')] }),
  cath_hlr_toll: M({ id: 'cath_hlr_toll', clip: 'cathHlrToll', dur: 1.65, tell: 'unparryable', hits: [SPH(0.92, 1.02, 'root', [0, 1.0, 0.7], 2.4, 70, 70, { kind: 'magic', unparryable: true, knock: 6 })], track: [0.85, 4], events: [sfx(0.1, 'unparryable_tell'), sfx(0.92, 'great_bell_toll', 0.35), custom(0.92, 'tollRing')] }),
  /** The rite: 2.5 s, interrupted by any flinch. Heals allies within 12 m at 1.9 s (see Region). */
  cath_hlr_rite: M({ id: 'cath_hlr_rite', clip: 'cathHlrRite', dur: 2.5, events: [sfx(0.2, 'ward_up'), custom(0.2, 'riteStart'), sfx(1.88, 'spell_heal'), custom(1.9, 'rite')] }),

  // ---------------------------------------------------------------- mourner giant
  cath_mg_slam: M({
    id: 'cath_mg_slam', clip: 'cathMgSlam', dur: 2.6,
    hits: [W(1.15, 1.28, 300, 90, { kind: 'strike', knock: 4 }), SPH(1.26, 1.36, 'root', [0, 0.4, 1.9], 2.6, 150, 80, { unparryable: true, knock: 6, group: 5 })],
    motion: [[1.05, 0], [1.26, 0.6]], track: [1.0, 2.5], hyper: [0.5, 1.3, 90],
    events: [sfx(0.15, 'enemy_grunt'), sfx(1.12, 'swing_huge'), sfx(1.27, 'great_bell_toll', 0.4), shake(1.27, 0.5), custom(1.27, 'shockwave'), ...tr(1.12, 1.3)],
  }),
  cath_mg_sweep: M({ id: 'cath_mg_sweep', clip: 'cathMgSweep', dur: 1.95, hits: [W(0.98, 1.14, 240, 80, { kind: 'strike', knock: 5 })], motion: [[0.9, 0], [1.1, 0.5]], track: [0.9, 2.5], hyper: [0.5, 1.15, 80], events: [sfx(0.15, 'enemy_windup'), sfx(0.96, 'swing_huge'), ...tr(0.96, 1.16)] }),
  /** Grab (hand icon): unblockable, unparryable. On contact the region starts cath_mg_crush. */
  cath_mg_grab: M({ id: 'cath_mg_grab', clip: 'cathMgGrab', dur: 2.2, tell: 'grab', hits: [SPH(1.0, 1.14, 'handL', [0, -0.05, 0.08], 0.6, 40, 0, { unblockable: true, unparryable: true, knock: 0 })], motion: [[0.95, -0.2], [1.1, 1.2]], track: [0.98, 3], events: [sfx(0.15, 'enemy_grunt'), sfx(0.98, 'swing_heavy')] }),
  cath_mg_crush: M({ id: 'cath_mg_crush', clip: 'cathMgCrush', dur: 2.1, noFlinch: true, hyper: [0, 2.1, 200], events: [sfx(0.1, 'boss_roar', 0.7), sfx(1.15, 'swing_huge'), custom(1.2, 'crushRelease'), shake(1.22, 0.45)] }),
  cath_mg_stomp: M({ id: 'cath_mg_stomp', clip: 'cathMgStomp', dur: 1.75, tell: 'unparryable', hits: [SPH(0.98, 1.08, 'root', [0, 0.2, 0.6], 2.8, 160, 80, { unparryable: true, knock: 6 })], track: [0.8, 2], hyper: [0.4, 1.1, 80], events: [sfx(0.1, 'unparryable_tell'), shake(0.99, 0.4), custom(0.99, 'shockwave')] }),

  // ---------------------------------------------------------------- procession bearer
  cath_br_sweep: M({ id: 'cath_br_sweep', clip: 'cathBrSweep', dur: 1.7, hits: [W(0.8, 0.97, 160, 45, { kind: 'strike', knock: 3 })], motion: [[0.75, 0], [0.95, 0.5]], track: [0.75, 4], events: [sfx(0.1, 'enemy_windup'), sfx(0.78, 'swing_heavy'), ...tr(0.78, 0.98)] }),
  cath_br_thrust: M({ id: 'cath_br_thrust', clip: 'cathBrThrust', dur: 1.5, hits: [W(0.72, 0.84, 150, 40, { kind: 'thrust', knock: 2.5 })], motion: [[0.7, -0.1], [0.82, 1.1]], track: [0.7, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.7, 'swing_heavy')] }),
  cath_br_shove: M({ id: 'cath_br_shove', clip: 'cathBrShove', dur: 1.3, hits: [SPH(0.62, 0.74, 'chest', [0, 0.05, 0.25], 0.6, 90, 60, { knock: 5 })], motion: [[0.6, -0.1], [0.74, 1.3]], track: [0.6, 5], events: [sfx(0.1, 'enemy_grunt')] }),

  // ---------------------------------------------------------------- cantor
  cath_ctr_strike: M({ id: 'cath_ctr_strike', clip: 'cathCtrStrike', dur: 1.45, hits: [W(0.64, 0.76, 110, 25, { kind: 'strike' })], motion: [[0.6, 0], [0.74, 0.4]], track: [0.6, 4], events: [sfx(0.1, 'enemy_windup'), sfx(0.62, 'swing_light')] }),
  /** The hymn: 2.7 s; at 2.0 s the reliquary pulses (see Region). Interrupted by any flinch. */
  cath_ctr_hymn: M({ id: 'cath_ctr_hymn', clip: 'cathCtrHymn', dur: 2.7, events: [custom(0.3, 'hymnStart'), sfx(1.95, 'great_bell_toll', 0.3), custom(2.0, 'hymn')] }),

  // ---------------------------------------------------------------- the Returned
  cath_knockdown: M({ id: 'cath_knockdown', clip: 'cathKnockdown', dur: 1.75, fade: 0.04, iframes: [0.15, 1.3], motion: [[0.28, -0.9], [0.5, -1.1]], cancel: { dodge: 1.35, free: 1.6 } }),
  cath_held: M({ id: 'cath_held', clip: 'cathHeld', dur: 1.45, fade: 0.06, iframes: [0, 1.45], noFlinch: true }),
});

const LIVING = { physical: 0, magic: 0, fire: 0 };
const ROBED = { physical: 0.05, magic: 0.1, fire: 0 };

registerEnemyDefs({
  cath_pilgrim: {
    kind: 'cath_pilgrim', name: 'Twice-Returned Pilgrim', look: 'cath_pilgrim', props: { height: 0.95, bulk: 0.9, shoulder: 0.92 }, radius: 0.34, height: 1.72,
    hp: 120, poise: 5, postureMax: 90, postureRegen: 22, defense: 40, absorb: LIVING, hours: 45, walk: 1.3, run: 3.4, sight: 11,
    weaponR: 'cath_pilgrim_staff', stance: { handR: PIL_STAFF, handL: null, chest: [16, 0, 0], spine: [8, 0, 0], head: [-8, 0, 0] },
    attacks: [
      { move: 'cath_pil_strike', range: [0, 2.6], weight: 3 },
      { move: 'cath_pil_jab', range: [1.2, 3.2], weight: 2, cooldown: 2 },
      { move: 'cath_pil_clutch', range: [0, 2.2], weight: 1.5, cooldown: 4 },
    ],
    recover: [0.9, 1.7], aggression: 0.45,
  },
  cath_flagellant: {
    kind: 'cath_flagellant', name: 'Flagellant', look: 'cath_flagellant', props: { height: 1.0, bulk: 0.95, shoulder: 1.02 }, radius: 0.37, height: 1.8,
    hp: 260, poise: 25, postureMax: 150, postureRegen: 26, defense: 45, absorb: LIVING, hours: 120, walk: 1.8, run: 4.6, sight: 13,
    weaponR: 'cath_scourge', stance: { handR: FLG_REST, handL: null, chest: [20, -8, 0], spine: [10, 0, 0], head: [-14, 0, 0] },
    attacks: [
      { move: 'cath_flg_lash', range: [0, 2.6], weight: 3 },
      { move: 'cath_flg_frenzy', range: [0, 2.8], weight: 2.5, cooldown: 3 },
      { move: 'cath_flg_leap', range: [2.8, 5.5], weight: 2, cooldown: 5 },
      { move: 'cath_flg_scourge', range: [2.5, 9], angle: 3.2, weight: 1.2, cooldown: 12 },
    ],
    recover: [0.5, 1.1], aggression: 0.8,
  },
  cath_healer: {
    kind: 'cath_healer', name: 'Healer-Priest', look: 'cath_healer', props: { height: 1.06, bulk: 0.95, shoulder: 0.96 }, radius: 0.38, height: 1.9,
    hp: 300, poise: 10, postureMax: 160, postureRegen: 24, defense: 50, absorb: ROBED, hours: 180, walk: 1.5, run: 3.6, sight: 16,
    weaponR: 'pilgrim_censer', weaponL: 'hand_bell', stance: { handR: HLR_CENSER, handL: HLR_BELL, chest: [4, 0, 0] },
    attacks: [
      { move: 'cath_hlr_swing', range: [0, 2.6], weight: 3 },
      { move: 'cath_hlr_toll', range: [0, 3.0], weight: 2, cooldown: 6 },
    ],
    keepDistance: [3.2, 8], recover: [0.9, 1.6], aggression: 0.5,
  },
  cath_mourner: {
    kind: 'cath_mourner', name: 'Mourner Giant', look: 'cath_mourner', props: { height: 1.45, bulk: 1.5, shoulder: 1.3 }, radius: 0.72, height: 2.6,
    hp: 1100, poise: 70, postureMax: 420, postureRegen: 30, defense: 70, absorb: { physical: 0.15, magic: 0.05, fire: 0.05 }, hours: 750, walk: 1.25, run: 2.6, sight: 14,
    weaponR: 'cath_mourner_maul', stance: { handR: MG_REST, handL: null, chest: [14, -6, 0], spine: [8, 0, 0], head: [-10, 0, 0] },
    attacks: [
      { move: 'cath_mg_slam', range: [0, 3.4], weight: 3, cooldown: 4 },
      { move: 'cath_mg_sweep', range: [0, 3.6], weight: 3 },
      { move: 'cath_mg_grab', range: [0.8, 3.3], weight: 2, cooldown: 7 },
      { move: 'cath_mg_stomp', range: [0, 2.2], weight: 2, cooldown: 6 },
    ],
    reactions: { light: 'boss_flinch', heavy: 'boss_flinch' },
    backstabbable: true, recover: [1.0, 1.8], aggression: 0.6,
  },
  cath_bearer: {
    kind: 'cath_bearer', name: 'Procession Bearer', look: 'cath_bearer', props: { height: 1.1, bulk: 1.2, shoulder: 1.1 }, radius: 0.44, height: 1.98,
    hp: 420, poise: 40, postureMax: 220, postureRegen: 28, defense: 60, absorb: ROBED, hours: 200, walk: 1.5, run: 3.6, sight: 18,
    weaponR: 'cath_bearer_pole', stance: { handR: BR_POLE, handL: null, chest: [8, -4, 0] },
    attacks: [
      { move: 'cath_br_sweep', range: [0, 3.6], weight: 3 },
      { move: 'cath_br_thrust', range: [2, 4.6], weight: 2.5, cooldown: 3 },
      { move: 'cath_br_shove', range: [0, 1.8], weight: 1.5, cooldown: 4 },
    ],
    recover: [0.9, 1.6], aggression: 0.55,
  },
  cath_cantor: {
    kind: 'cath_cantor', name: 'Cantor of the Procession', look: 'cath_cantor', props: { height: 1.0, bulk: 0.9, shoulder: 0.94 }, radius: 0.36, height: 1.8,
    hp: 260, poise: 5, postureMax: 120, postureRegen: 22, defense: 40, absorb: ROBED, hours: 300, walk: 1.5, run: 3.8, sight: 30,
    weaponR: 'cath_cantor_staff', weaponL: 'hand_bell', stance: { handR: CTR_STAFF, handL: null },
    attacks: [{ move: 'cath_ctr_strike', range: [0, 2.6], weight: 3 }],
    keepDistance: [5, 12], recover: [0.9, 1.6], aggression: 0.45,
  },
} satisfies Record<string, EnemyDef>);
