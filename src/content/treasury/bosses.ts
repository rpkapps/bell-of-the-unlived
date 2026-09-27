/**
 * The Undervaults — bosses.
 *
 * MIMIC SOVEREIGN (optional mid-boss, the Hoard): a crowned hoard-chest on legs. Phase 1 (100 %→50 %):
 * lunging bite (0.62 s tell), chain-arm swipe, coin spray (three volleys, ranged), leaping slam
 * (unparryable, 0.9 s crouch). Transition: it heaves and roars, spilling coin. Phase 2 adds the
 * swipe→bite combination and slams more often.
 *
 * TREASURER AUREL MASK (keeper, the Vault of Futures):
 *  Phase 1 "The Ledger Sealed" — four ward-coffers in the corners project a ward on him: damage he
 *    takes is cut to 10 % (4 coffers) … 30 % (1 coffer), he cannot be posture-broken, and the ward
 *    shows as a keyhole-ring overlay, a pale gold rim and beams to each coffer. He summons
 *    coin-sentinels to guard them (the audit — a 1.8 s window). Breaking the last coffer forces the
 *    transition, whatever his health.
 *  Transition "Wards Broken" — he staggers for 3 s clutching his cracking mask (punishable).
 *  Phase 2 "The Debt Called In" (to 30 %) — mask cracked, frantic: a four-stroke frenzy that ends in
 *    a held overhead, an unparryable ledger-chain whip, the levy (grab, takes Hours).
 *  Transition "Unmasked" — he tears the mask away (uninterruptible).
 *  Phase 3 "Written Off" — adds the write-off: a 2 s charge, a keyhole ring marked on the floor
 *    around him, then a burst over the whole ring (step out or roll through it); a long exhaustion
 *    afterwards.
 * Every string ends in a readable recovery; criticals never skip a phase.
 */
import type { EnemyDef, EnemyAttack } from '../../actors/Enemy';
import type { Actor } from '../../actors/Actor';
import type { MoveDef } from '../../combat/types';
import type { DamagePacket } from '../../combat/Combat';
import { registerMoves } from '../../combat/moves';
import { Boss, registerBoss } from '../bosses';
import { SOV_R, SOV_L, AU_ROD } from './clips';
import type { CueId } from '../../audio/contract';
import './enemies';

const M = (d: MoveDef) => d;
const sfx = (t: number, cue: CueId, volume?: number) => ({ t, e: { type: 'sfx' as const, cue, volume } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const shake = (t: number, amount: number) => ({ t, e: { type: 'shake' as const, amount } });
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const R = (start: number, end: number, dmg: number, poise: number, kind: 'slash' | 'thrust' | 'strike' = 'slash', extra: object = {}) => ({ start, end, source: 'weaponR' as const, dmg, posture: 0, poise, kind, knock: 2, ...extra });

// ================================================================== Mimic Sovereign

registerMoves({
  tr_sov_dormant: M({ id: 'tr_sov_dormant', clip: 'trSovDormant', dur: 1e9 }),
  tr_sov_rise: M({ id: 'tr_sov_rise', clip: 'trSovRise', dur: 1.6, iframes: [0, 1.2], noFlinch: true, events: [sfx(0.05, 'chest_open'), sfx(0.4, 'boss_roar'), shake(0.5, 0.3)] }),
  tr_sov_bite: M({ id: 'tr_sov_bite', clip: 'trSovBite', dur: 1.7, hits: [{ start: 0.7, end: 0.8, source: 'sphere', sphere: { bone: 'hips', offset: [0, 0.3, 0.6], radius: 0.85 }, dmg: 360, posture: 0, poise: 80, kind: 'strike', knock: 4 }], motion: [[0.62, -0.15], [0.8, 2.8]], track: [0.66, 4.5], events: [sfx(0.1, 'chest_open'), sfx(0.7, 'swing_huge')] }),
  tr_sov_swipe: M({ id: 'tr_sov_swipe', clip: 'trSovSwipe', dur: 1.6, hits: [{ start: 0.66, end: 0.82, source: 'sphere', sphere: { bone: 'handR', offset: [0, -0.05, 0], radius: 0.6 }, dmg: 300, posture: 0, poise: 70, kind: 'strike', knock: 3.5 }], track: [0.6, 3.5], events: [sfx(0.1, 'chain_rattle'), sfx(0.66, 'swing_heavy')] }),
  tr_sov_slam: M({ id: 'tr_sov_slam', clip: 'trSovSlam', dur: 2.5, tell: 'unparryable', hits: [{ start: 1.3, end: 1.42, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 0.8], radius: 3.2 }, dmg: 380, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 7 }], motion: [[0.9, 0], [1.3, 3.2]], track: [1.0, 3], hyper: [0.5, 1.4, 90], events: [sfx(0.1, 'boss_roar'), sfx(1.3, 'collapse_rumble'), shake(1.32, 0.6), custom(1.32, 'shockwave')] }),
  tr_sov_spit: M({ id: 'tr_sov_spit', clip: 'trSovSpit', dur: 2.2, track: [1.4, 2.5], events: [sfx(0.2, 'chest_open'), custom(0.9, 'coins'), custom(1.23, 'coins'), custom(1.46, 'coins')] }),
  tr_sov_roar: M({ id: 'tr_sov_roar', clip: 'trSovRoar', dur: 2.4, iframes: [0, 2.2], noFlinch: true, events: [sfx(0.3, 'boss_roar'), custom(1.2, 'phase2'), custom(1.2, 'spill'), shake(1.2, 0.4)] }),
  tr_sov_death: M({ id: 'tr_sov_death', clip: 'trSovDeath', dur: 2.4, events: [sfx(0.2, 'boss_roar', 0.7), sfx(1.8, 'chest_open')] }),
});

export const MIMIC_SOVEREIGN: EnemyDef = {
  kind: 'mimicSovereign', name: 'The Mimic Sovereign', look: 'mimicSovereign', props: { height: 1.55, bulk: 1.35, shoulder: 1.2 },
  radius: 0.95, height: 2.3, hp: 3800, poise: 90, postureMax: 700, postureRegen: 40, defense: 80,
  absorb: { physical: 0.2, magic: 0.1, fire: 0.0 }, hours: 4200, walk: 1.8, run: 4.8, sight: 30,
  stance: { handR: SOV_R, handL: SOV_L, head: [-10, 0, 0] },
  attacks: [
    { move: 'tr_sov_bite', range: [0, 5.2], weight: 4, cooldown: 2 },
    { move: 'tr_sov_swipe', range: [0, 4.2], weight: 3 },
    { move: 'tr_sov_slam', range: [3, 10], angle: 0.5, weight: 2.5, cooldown: 7 },
    { move: 'tr_sov_spit', range: [5, 16], angle: 0.4, weight: 2, cooldown: 8 },
    { move: 'tr_sov_swipe', range: [0, 4.2], weight: 3, follow: [['tr_sov_bite', 0.9]], phase: 2 },
    { move: 'tr_sov_slam', range: [2, 10], angle: 0.5, weight: 2, cooldown: 5, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'tr_sov_death' },
  backstabbable: false, criticalable: true, recover: [0.8, 1.5], aggression: 0.65, boss: true,
};
registerBoss({ id: 'mimicsovereign', def: MIMIC_SOVEREIGN, phases: [0.5], transitions: ['tr_sov_roar'], looks: ['mimicSovereign'], music: 'mimicsovereign' });

// ================================================================== Treasurer Aurel Mask

registerMoves({
  tr_au_tally: M({ id: 'tr_au_tally', clip: 'trAuTally', dur: 1.8, hits: [R(0.57, 0.7, 250, 45, 'slash', { group: 0 }), R(0.99, 1.12, 240, 45, 'slash', { group: 1 })], motion: [[0.5, 0], [0.68, 0.8], [0.92, 0.8], [1.1, 1.4]], track: [0.95, 3.8], events: [sfx(0.08, 'enemy_windup'), sfx(0.55, 'swing_heavy'), sfx(0.97, 'swing_heavy'), ...tr(0.55, 1.14)] }),
  tr_au_stamp: M({
    id: 'tr_au_stamp', clip: 'trAuStamp', dur: 2.2, tell: 'unparryable',
    hits: [R(1.05, 1.12, 240, 60, 'strike', { unparryable: true }), { start: 1.12, end: 1.22, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 1.3], radius: 2.5 }, dmg: 200, posture: 0, poise: 80, kind: 'strike', unparryable: true, knock: 6, group: 5 }],
    motion: [[1.0, 0], [1.1, 0.5]], track: [0.95, 3], hyper: [0.5, 1.2, 80],
    events: [sfx(1.1, 'great_bell_toll', 0.5), shake(1.12, 0.5), custom(1.12, 'shockwave')],
  }),
  tr_au_audit: M({ id: 'tr_au_audit', clip: 'trAuAudit', dur: 1.9, events: [sfx(0.2, 'stillbell_ring', 0.6), custom(0.9, 'summon')] }),
  tr_au_coins: M({ id: 'tr_au_coins', clip: 'trAuCoins', dur: 1.55, track: [0.74, 4], events: [sfx(0.1, 'enemy_windup'), custom(0.78, 'coins'), sfx(0.78, 'throw')] }),
  tr_au_levy: M({
    id: 'tr_au_levy', clip: 'trAuLevy', dur: 2.05, tell: 'grab',
    hits: [{ start: 0.88, end: 1.02, source: 'sphere', sphere: { bone: 'handL', offset: [0, -0.08, 0.04], radius: 0.46 }, dmg: 180, posture: 0, poise: 70, kind: 'strike', unparryable: true, unblockable: true, knock: 3 }],
    motion: [[0.85, -0.1], [1.0, 1.7]], track: [0.84, 4], events: [sfx(0.1, 'enemy_grunt'), sfx(0.88, 'swing_heavy')],
  }),
  tr_au_frenzy: M({
    id: 'tr_au_frenzy', clip: 'trAuFrenzy', dur: 3.3,
    hits: [R(0.44, 0.56, 220, 40, 'slash', { group: 0 }), R(0.8, 0.92, 220, 40, 'slash', { group: 1 }), R(1.18, 1.28, 240, 50, 'thrust', { group: 2, knock: 3 }), R(2.02, 2.14, 300, 90, 'strike', { group: 3, knock: 5 })],
    motion: [[0.36, 0], [0.54, 0.7], [0.76, 0.7], [0.92, 1.3], [1.1, 1.2], [1.22, 2.4], [2.0, 2.4], [2.12, 3.0]], track: [1.95, 3],
    events: [sfx(0.05, 'enemy_windup'), sfx(0.42, 'swing_heavy'), sfx(0.78, 'swing_heavy'), sfx(1.16, 'swing_heavy'), sfx(1.55, 'enemy_windup'), sfx(2.0, 'swing_huge'), shake(2.12, 0.45), ...tr(0.42, 1.3), ...tr(2.0, 2.16)],
  }),
  tr_au_whip: M({
    id: 'tr_au_whip', clip: 'trAuWhip', dur: 1.95, tell: 'unparryable',
    hits: [{ start: 0.9, end: 1.1, source: 'sphere', sphere: { bone: 'root', offset: [0, 1.0, 0], radius: 2.9 }, dmg: 230, posture: 0, poise: 70, kind: 'strike', unparryable: true, knock: 5 }],
    hyper: [0.4, 1.1, 70], events: [sfx(0.2, 'chain_rattle'), sfx(0.9, 'swing_huge')],
  }),
  tr_au_writeoff: M({
    id: 'tr_au_writeoff', clip: 'trAuWriteoff', dur: 3.5, tell: 'unparryable',
    hits: [{ start: 2.02, end: 2.16, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.6, 0], radius: 5.6 }, dmg: 420, posture: 0, poise: 120, kind: 'magic', unparryable: true, unblockable: true, knock: 8 }],
    hyper: [0, 2.1, 120], events: [custom(0.1, 'writeoffMark'), sfx(0.2, 'great_bell_toll', 0.35), sfx(1.2, 'unparryable_tell'), custom(2.02, 'writeoff'), sfx(2.02, 'great_bell_toll'), shake(2.04, 0.7)],
  }),
  tr_au_wardbreak: M({ id: 'tr_au_wardbreak', clip: 'trAuWardbreak', dur: 3.0, noFlinch: true, events: [sfx(0.05, 'guard_break'), sfx(0.3, 'boss_roar', 0.6), custom(1.4, 'phase2')] }),
  tr_au_unmask: M({ id: 'tr_au_unmask', clip: 'trAuUnmask', dur: 2.6, iframes: [0, 2.4], noFlinch: true, events: [sfx(0.6, 'boss_roar'), custom(1.2, 'phase3'), sfx(1.2, 'great_bell_toll', 0.6), shake(1.2, 0.35)] }),
  tr_au_death: M({ id: 'tr_au_death', clip: 'trAuDeath', dur: 3.0 }),
});

export const AUREL: EnemyDef = {
  kind: 'aurelmask', name: 'Treasurer Aurel Mask', look: 'aurelmask', props: { height: 1.14, bulk: 0.9, shoulder: 1.05 },
  radius: 0.5, height: 2.05, hp: 4400, poise: 70, postureMax: 560, postureRegen: 36, defense: 80,
  absorb: { physical: 0.18, magic: 0.15, fire: 0.1 }, hours: 12000, walk: 1.9, run: 4.4, sight: 40,
  weaponR: 'aurel_rod', stance: { handR: AU_ROD, handL: null, chest: [2, -6, 0] },
  attacks: [
    { move: 'tr_au_tally', range: [0, 3.4], weight: 4, cooldown: 1.5 },
    { move: 'tr_au_stamp', range: [0, 3.6], weight: 2, cooldown: 8 },
    { move: 'tr_au_coins', range: [5, 14], angle: 0.45, weight: 2.5, cooldown: 6 },
    { move: 'tr_au_audit', range: [4, 20], weight: 1.6, cooldown: 20 },
    { move: 'tr_au_levy', range: [0, 2.9], weight: 1.8, cooldown: 10 },
    { move: 'tr_au_frenzy', range: [0, 3.4], weight: 3.5, cooldown: 7, phase: 2 },
    { move: 'tr_au_whip', range: [0, 3.0], weight: 2, cooldown: 8, phase: 2 },
    { move: 'tr_au_writeoff', range: [0, 12], weight: 2.2, cooldown: 14, phase: 3 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'tr_au_death' },
  backstabbable: false, criticalable: true, recover: [0.6, 1.3], aggression: 0.7, boss: true,
};

/** Ward multiplier by coffers still standing (index = coffers). */
export const WARD_MULT = [1, 0.3, 0.2, 0.15, 0.1];

/**
 * Aurel with the ward-coffer mechanic. The region keeps `coffers` up to date. While any coffer
 * stands (phase 1): damage is multiplied by WARD_MULT, posture is capped and criticals are off, his
 * health cannot fall below half, and the HP threshold cannot start the transition — only the last
 * coffer breaking does.
 */
export class AurelBoss extends Boss {
  coffers = 4;
  /** Called (throttled by the region) when a blow lands on the ward. */
  onWardedHit: () => void = () => {};
  get warded() { return this.phase === 1 && this.coffers > 0; }
  get wardMul() { return this.warded ? WARD_MULT[Math.min(4, this.coffers)] : 1; }
  override get threshold(): number {
    if (this.phase === 1) return this.warded ? 0 : this.hp + 1;
    return super.threshold;
  }
  override think(dt: number, player: Actor) {
    if (this.warded) {
      if (this.hp < this.hpMax * 0.5) this.hp = this.hpMax * 0.5;
      if (this.posture > this.postureMax * 0.6) this.posture = this.postureMax * 0.6;
    }
    this.criticalable = !this.warded;
    super.think(dt, player);
  }
  override defend(p: DamagePacket): number {
    const d = super.defend(p);
    if (!this.warded) return d;
    this.onWardedHit();
    return Math.max(1, Math.round(d * this.wardMul));
  }
  protected override doAttack(id: string, a?: EnemyAttack) {
    // no audit once the coffers are gone: he throws coin instead
    if (id === 'tr_au_audit' && !this.warded) return super.doAttack('tr_au_coins');
    super.doAttack(id, a);
  }
}

registerBoss({
  id: 'aurelmask', def: AUREL, phases: [0.999, 0.3], transitions: ['tr_au_wardbreak', 'tr_au_unmask'],
  looks: ['aurelmask', 'aurelmask2', 'aurelmask3'], weaponR: 'aurel_rod', memory: 'memory_aurelmask', cls: AurelBoss, music: 'aurelmask',
});
