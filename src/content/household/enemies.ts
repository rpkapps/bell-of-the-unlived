/**
 * Garden Court enemies: definitions, movesets and behaviours.
 *
 * Tuned for the last institution (a player around level 60 with a +7 weapon: ~300 AR, ~950 HP):
 * each type takes 5–8 ordinary hits, and hits hard enough that three mistakes end a life.
 *
 *  Elite Retainer (hhRetainer)  — READS LIGHT STRINGS: after two light attacks in one breath it raises
 *    a crosswise parry stance (tell: square pose, blade at face height, a ring and a glint) that turns
 *    the third cut aside and ripostes (0.12 s delay — a quick dodge still escapes). A heavy attack,
 *    a technique or a spell breaks the stance open (guard-broken → critical). Pausing resets the read.
 *  Court Duellist (hhDuellist)  — fast lunges and flicks; the FEINT is its own move with a stamp, a
 *    false half-lunge that stops short, a recoil and a glint before the one real lunge.
 *  Gardener (hhGardener)        — hedge shears: snip, overhead chop (hyper-armour) and a GRAB (hand-icon
 *    tell, unblockable): caught, the victim is held and cut twice.
 *  Masked Courtier (hhCourtier) — caster: gilt bolts, a three-bolt volley, a fan sweep up close; keeps distance.
 *  Succession Ghost (hhGhost)   — a translucent heir that PHASES between its two claims (patrol points):
 *    motes gather at the destination first, it fades (i-frames) and reappears there.
 *  Hunting hounds come from the shared beasts module (kind 'huntingHound').
 */
import * as THREE from 'three';
import type { EnemyDef } from '../../actors/Enemy';
import { Enemy } from '../../actors/Enemy';
import type { Actor, MoveInstance } from '../../actors/Actor';
import type { MoveDef } from '../../combat/types';
import type { HitResult } from '../../combat/Combat';
import { registerMoves, MOVES } from '../../combat/moves';
import type { CueId } from '../../audio/contract';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { householdClips, LS_REST, RAP_REST } from './clips';

registerClips(householdClips);

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, x: Partial<NonNullable<MoveDef['hits']>[number]> = {}) =>
  ({ start, end, source: 'weaponR' as const, dmg, posture: 0, poise, kind: 'slash' as const, knock: 1.6, ...x });
const sfx = (t: number, cue: CueId) => ({ t, e: { type: 'sfx' as const, cue } });

// ============================================================================ moves

registerMoves({
  // ---- elite retainer (longsword)
  ret_cut: M({ id: 'ret_cut', clip: 'retCut', dur: 1.35, hits: [W(0.56, 0.72, 330, 40)], motion: [[0.5, 0], [0.7, 0.8]], track: [0.52, 4.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.54, 'swing_heavy'), ...tr(0.54, 0.74)] }),
  ret_back: M({ id: 'ret_back', clip: 'retBack', dur: 1.3, hits: [W(0.4, 0.54, 300, 35)], motion: [[0.32, 0], [0.52, 0.6]], track: [0.36, 4], events: [sfx(0.38, 'swing_light'), ...tr(0.38, 0.56)] }),
  ret_thrust: M({ id: 'ret_thrust', clip: 'retThrust', dur: 1.55, hits: [W(0.68, 0.82, 360, 45, { kind: 'thrust', knock: 2.4 })], motion: [[0.6, -0.15], [0.8, 1.9]], track: [0.62, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.84)] }),
  ret_over: M({ id: 'ret_over', clip: 'retOver', dur: 2.0, hits: [W(0.98, 1.1, 470, 70, { kind: 'strike', knock: 3.2 })], motion: [[0.9, 0], [1.08, 0.7]], track: [0.9, 4], hyper: [0.5, 1.1, 50], events: [sfx(0.15, 'enemy_grunt'), sfx(0.95, 'swing_huge'), { t: 1.07, e: { type: 'shake', amount: 0.3 } }, ...tr(0.95, 1.12)] }),
  ret_pommel: M({ id: 'ret_pommel', clip: 'retPommel', dur: 1.3, hits: [{ start: 0.5, end: 0.62, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0, 0], radius: 0.35 }, dmg: 180, posture: 0, poise: 60, kind: 'strike', guardBreak: true, knock: 3 }], motion: [[0.46, 0], [0.6, 0.9]], track: [0.48, 5], events: [sfx(0.1, 'enemy_grunt')] }),
  ret_stance: M({ id: 'ret_stance', clip: 'retStance', dur: 1.3, parry: [0.12, 1.25], noFlinch: true, fade: 0.05, events: [sfx(0.02, 'parry_attempt'), { t: 0.12, e: { type: 'custom', id: 'glint' } }, { t: 0.7, e: { type: 'custom', id: 'glint' } }] }),
  ret_stance_broken: M({ id: 'ret_stance_broken', clip: 'guardBroken', dur: 1.5, fade: 0.03, vulnerable: 'guardBroken', motion: [[0.4, -0.5]] }),
  ret_riposte: M({ id: 'ret_riposte', clip: 'retRiposte', dur: 1.35, hits: [W(0.56, 0.7, 380, 50, { kind: 'thrust', knock: 2.8 })], motion: [[0.45, -0.1], [0.66, 1.2]], track: [0.5, 8], events: [sfx(0.05, 'enemy_grunt'), sfx(0.54, 'swing_heavy'), ...tr(0.54, 0.72)] }),

  // ---- court duellist (rapier)
  duel_lunge: M({ id: 'duel_lunge', clip: 'duelLunge', dur: 1.4, hits: [W(0.6, 0.74, 300, 35, { kind: 'thrust', knock: 2 })], motion: [[0.52, -0.25], [0.7, 1.9]], track: [0.55, 6], events: [sfx(0.08, 'enemy_windup'), sfx(0.58, 'swing_light'), ...tr(0.58, 0.76)] }),
  duel_flick: M({ id: 'duel_flick', clip: 'duelFlick', dur: 1.65, hits: [W(0.54, 0.64, 240, 25, { group: 0 }), W(0.86, 0.96, 240, 25, { group: 1 })], motion: [[0.48, 0], [0.62, 0.5], [0.95, 0.9]], track: [0.84, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.52, 'swing_light'), sfx(0.84, 'swing_light'), ...tr(0.52, 0.98)] }),
  duel_feint: M({
    id: 'duel_feint', clip: 'duelFeint', dur: 2.2,
    hits: [W(1.38, 1.52, 340, 45, { kind: 'thrust', knock: 2.4 })],
    motion: [[0.36, 0.1], [0.58, 0.55], [0.95, 0.1], [1.3, 0], [1.48, 1.9]], track: [1.35, 6],
    events: [sfx(0.28, 'enemy_grunt'), { t: 0.3, e: { type: 'custom', id: 'stamp' } }, { t: 1.02, e: { type: 'custom', id: 'glint' } }, sfx(1.04, 'enemy_windup'), sfx(1.36, 'swing_light'), ...tr(1.36, 1.54)],
  }),
  duel_backstep: M({ id: 'duel_backstep', clip: 'duelBackstep', dur: 0.6, iframes: [0.04, 0.3], motion: [[0.4, -2.4]] }),

  // ---- gardener (shears)
  gard_snip: M({ id: 'gard_snip', clip: 'gardSnip', dur: 1.5, hits: [W(0.6, 0.76, 340, 45, { knock: 2 })], motion: [[0.56, 0], [0.74, 0.8]], track: [0.58, 4], events: [sfx(0.12, 'enemy_windup'), sfx(0.58, 'swing_heavy'), ...tr(0.58, 0.78)] }),
  gard_chop: M({ id: 'gard_chop', clip: 'gardChop', dur: 2.2, hits: [W(1.02, 1.14, 480, 80, { kind: 'strike', knock: 3.5 })], motion: [[0.95, 0], [1.12, 0.7]], track: [0.95, 3.5], hyper: [0.5, 1.15, 70], events: [sfx(0.15, 'enemy_grunt'), sfx(0.98, 'swing_huge'), { t: 1.12, e: { type: 'shake', amount: 0.35 } }] }),
  gard_grab: M({ id: 'gard_grab', clip: 'gardGrab', dur: 1.9, tell: 'grab', hits: [W(0.76, 0.94, 60, 10, { unblockable: true, unparryable: true, kind: 'slash', knock: 0 })], motion: [[0.72, -0.1], [0.92, 1.5]], track: [0.74, 4], hyper: [0.3, 0.95, 60], events: [sfx(0.1, 'enemy_grunt')] }),
  gard_cut: M({ id: 'gard_cut', clip: 'gardCut', dur: 1.8, noFlinch: true, hyper: [0, 1.8, 200], events: [{ t: 0.6, e: { type: 'custom', id: 'snip' } }, { t: 1.2, e: { type: 'custom', id: 'snip' } }, { t: 1.45, e: { type: 'custom', id: 'release' } }] }),
  hh_held: M({ id: 'hh_held', clip: 'hurtHeavy', dur: 1.55, fade: 0.05, noFlinch: true }),

  // ---- masked courtier (caster)
  court_bolt: M({ id: 'court_bolt', clip: 'courtBolt', dur: 1.6, track: [0.84, 5], events: [{ t: 0.2, e: { type: 'custom', id: 'charge' } }, sfx(0.2, 'technique'), { t: 0.86, e: { type: 'custom', id: 'bolt' } }] }),
  court_volley: M({ id: 'court_volley', clip: 'courtVolley', dur: 2.0, track: [1.2, 4], events: [{ t: 0.3, e: { type: 'custom', id: 'charge' } }, sfx(0.3, 'technique'), { t: 1.2, e: { type: 'custom', id: 'volley' } }] }),
  court_fan: M({ id: 'court_fan', clip: 'courtFan', dur: 1.3, hits: [{ start: 0.58, end: 0.7, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0, 0], radius: 0.9 }, dmg: 140, posture: 0, poise: 70, kind: 'magic', knock: 7 }], track: [0.5, 5], events: [sfx(0.1, 'enemy_windup')] }),

  // ---- succession ghost
  ghost_cut: M({ id: 'ghost_cut', clip: 'retCut', dur: 1.35, hits: [W(0.56, 0.72, 280, 35, { kind: 'magic' })], motion: [[0.5, 0], [0.7, 0.8]], track: [0.52, 4.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.54, 'swing_heavy'), ...tr(0.54, 0.74)] }),
  ghost_thrust: M({ id: 'ghost_thrust', clip: 'retThrust', dur: 1.55, hits: [W(0.68, 0.82, 300, 40, { kind: 'magic', knock: 2 })], motion: [[0.6, -0.15], [0.8, 1.8]], track: [0.62, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.84)] }),
  ghost_fade: M({ id: 'ghost_fade', clip: 'ghostFade', dur: 0.75, iframes: [0, 0.75], noFlinch: true, events: [{ t: 0.0, e: { type: 'custom', id: 'fadeStart' } }, { t: 0.72, e: { type: 'custom', id: 'phase' } }] }),
  ghost_appear: M({ id: 'ghost_appear', clip: 'ghostAppear', dur: 0.6, iframes: [0, 0.35], noFlinch: true }),
});

// ============================================================================ definitions

const HH_ABSORB = { physical: 0.2, magic: 0.12, fire: 0.1 };
export const HOUSEHOLD_ENEMIES: Record<string, EnemyDef> = {
  hhRetainer: {
    kind: 'hhRetainer', name: 'Household Retainer', look: 'hhRetainer', props: { height: 1.04, bulk: 1.08, shoulder: 1.06 }, radius: 0.42, height: 1.9,
    hp: 980, poise: 45, postureMax: 380, postureRegen: 40, defense: 85, absorb: { physical: 0.26, magic: 0.14, fire: 0.1 }, hours: 900, walk: 1.6, run: 4.2, sight: 16,
    weaponR: 'hh_longsword', stance: { handR: LS_REST, handL: null, chest: [4, -8, 0] },
    attacks: [
      { move: 'ret_cut', range: [0, 2.8], weight: 4, follow: [['ret_back', 0.5]] },
      { move: 'ret_thrust', range: [1.8, 4.4], weight: 2.5, cooldown: 3 },
      { move: 'ret_over', range: [0, 2.6], weight: 1.5, cooldown: 6 },
      { move: 'ret_pommel', range: [0, 1.8], weight: 1.2, cooldown: 7 },
    ],
    recover: [0.6, 1.2], aggression: 0.6,
  },
  hhDuellist: {
    kind: 'hhDuellist', name: 'Court Duellist', look: 'hhDuellist', props: { height: 1.02, bulk: 0.88, shoulder: 0.95 }, radius: 0.36, height: 1.84,
    hp: 640, poise: 20, postureMax: 260, postureRegen: 45, defense: 70, absorb: { physical: 0.12, magic: 0.1, fire: 0.05 }, hours: 700, walk: 2.0, run: 5.0, sight: 16,
    weaponR: 'hh_rapier', stance: { handR: RAP_REST, handL: null, chest: [2, -22, 0], spine: [0, -10, 0], hips: [0, -14, 0] },
    attacks: [
      { move: 'duel_lunge', range: [1.6, 4.6], weight: 3, cooldown: 2.5 },
      { move: 'duel_flick', range: [0, 2.4], weight: 3 },
      { move: 'duel_feint', range: [2, 4.8], weight: 1.6, cooldown: 7 },
      { move: 'duel_backstep', range: [0, 1.4], weight: 1.4, cooldown: 3 },
    ],
    recover: [0.5, 1.0], aggression: 0.7,
  },
  hhGardener: {
    kind: 'hhGardener', name: 'Palace Gardener', look: 'hhGardener', props: { height: 1.02, bulk: 1.18, shoulder: 1.1 }, radius: 0.44, height: 1.86,
    hp: 1100, poise: 60, postureMax: 420, postureRegen: 30, defense: 75, absorb: { physical: 0.18, magic: 0.08, fire: 0.0 }, hours: 800, walk: 1.5, run: 3.8, sight: 14,
    weaponR: 'hh_shears', stance: { handR: { p: [-0.24, 0.98, 0.18], dir: [0.25, 0.55, 0.8], up: [0, 1, 0] }, handL: { p: [-0.1, 0.9, 0.12], dir: [0.25, 0.55, 0.8] }, chest: [10, -8, 0], spine: [6, 0, 0] },
    attacks: [
      { move: 'gard_snip', range: [0, 3.0], weight: 3.5 },
      { move: 'gard_chop', range: [0, 2.8], weight: 2, cooldown: 5 },
      { move: 'gard_grab', range: [0, 2.4], weight: 1.6, cooldown: 8 },
    ],
    recover: [0.9, 1.6], aggression: 0.5,
  },
  hhCourtier: {
    kind: 'hhCourtier', name: 'Masked Courtier', look: 'hhCourtier', props: { height: 1.0, bulk: 0.92, shoulder: 0.94 }, radius: 0.36, height: 1.82,
    hp: 520, poise: 10, postureMax: 200, postureRegen: 30, defense: 55, absorb: { physical: 0.05, magic: 0.35, fire: 0.1 }, hours: 750, walk: 1.5, run: 3.5, sight: 22,
    stance: { handR: null, handL: null },
    attacks: [
      { move: 'court_bolt', range: [3, 22], angle: 0.5, weight: 3, cooldown: 1.6 },
      { move: 'court_volley', range: [4, 18], angle: 0.5, weight: 1.5, cooldown: 6 },
      { move: 'court_fan', range: [0, 2.2], weight: 3 },
    ],
    keepDistance: [6, 14], recover: [0.8, 1.4], aggression: 0.65,
  },
  hhGhost: {
    kind: 'hhGhost', name: 'Succession Ghost', look: 'hhGhost', props: { height: 1.02, bulk: 0.95, shoulder: 1 }, radius: 0.38, height: 1.86,
    hp: 560, poise: 15, postureMax: 240, postureRegen: 36, defense: 60, absorb: { physical: 0.3, magic: 0.0, fire: 0.15 }, hours: 650, walk: 1.6, run: 3.6, sight: 14,
    weaponR: 'hh_ceremonial', stance: { handR: LS_REST, handL: null, chest: [4, -8, 0] },
    attacks: [
      { move: 'ghost_cut', range: [0, 2.8], weight: 3 },
      { move: 'ghost_thrust', range: [1.6, 4.2], weight: 2, cooldown: 3 },
    ],
    recover: [0.8, 1.4], aggression: 0.55,
  },
};
registerEnemyDefs(HOUSEHOLD_ENEMIES);

// ============================================================================ habit reading (shared by retainers and Dame Celwyn)

export type AttackCat = 'L' | 'H' | 'T' | 'C' | 'X';
export const attackCat = (id: string): AttackCat =>
  /_light/.test(id) ? 'L' : /heavy_(release|charge)/.test(id) ? 'H' : id.startsWith('tech_') ? 'T' : id.startsWith('cast_') || id === 'throw' ? 'C' : 'X';

/** Watches the player's attack starts: the current light string and repeats of the same move. */
export class Habits {
  private last: MoveInstance | null = null;
  /** Recent attack starts, newest last. */
  readonly seq: { id: string; cat: AttackCat; t: number }[] = [];
  /** Lights started in one breath (gap < 1.05 s). */
  lightStreak = 0;
  /** Returns the attack that started this step (if any). */
  observe(p: Actor, now: number): { id: string; cat: AttackCat; t: number } | null {
    const m = p.move;
    if (!m || m === this.last) return null;
    this.last = m;
    const id = m.def.id, cat = attackCat(id);
    if (cat === 'X') return null;
    if (id.includes('heavy_release') && this.seq.length && this.seq[this.seq.length - 1].id.includes('heavy_charge') && now - this.seq[this.seq.length - 1].t < 2) {
      // a charge released: the same attack, keep one entry
      this.seq[this.seq.length - 1] = { id, cat, t: this.seq[this.seq.length - 1].t };
      return null;
    }
    const prev = this.seq[this.seq.length - 1];
    this.lightStreak = cat === 'L' && prev && prev.cat === 'L' && now - prev.t < 1.05 ? this.lightStreak + 1 : cat === 'L' ? 1 : 0;
    const e = { id: id.replace('_release', '_charge'), cat, t: now };
    this.seq.push(e);
    if (this.seq.length > 8) this.seq.shift();
    return e;
  }
  /** How many of the most recent starts are the same move as the newest (1 = no repeat). Resets after a 4 s lull. */
  repeats(now: number): number {
    const n = this.seq.length;
    if (!n || now - this.seq[n - 1].t > 4) return 0;
    let k = 1;
    for (let i = n - 2; i >= 0 && this.seq[i].id === this.seq[n - 1].id && this.seq[i + 1].t - this.seq[i].t < 4; i--) k++;
    return k;
  }
  reset() { this.seq.length = 0; this.lightStreak = 0; this.last = null; }
}

// ============================================================================ behaviours (applied to spawned enemies)

/** Retainer: reads light strings and answers with a parry stance and a riposte. */
export class RetainerAI extends Enemy {
  private get st() { return ((this as unknown as { _hh?: { habits: Habits; riposteAt: number; seenHurt: MoveInstance | null; stanceCd: number } })._hh ??= { habits: new Habits(), riposteAt: -1, seenHurt: null, stanceCd: 0 }); }
  override think(dt: number, player: Actor) {
    const st = this.st, now = this.svc.time;
    if (this.aware && !this.dead) st.habits.observe(player, now);
    if (st.stanceCd > 0) st.stanceCd -= dt;
    const m = this.move;
    if (m && m.def.id === 'ret_stance' && !this.dead) {
      // a heavy, a technique or a spell breaks the stance open
      const pm = player.move, cat = pm ? attackCat(pm.def.id) : 'X';
      if (pm && (cat === 'H' || cat === 'T' || cat === 'C') && this.distTo(player) < 4.5 && st.riposteAt < 0) {
        this.startMove(MOVES.ret_stance_broken, { fade: 0.03 });
        this.svc.sfx('guard_break', { pos: this.pos });
        this.svc.hint('hh_parryStance');
      } else if (pm && pm.def.id === 'hurt_heavy' && pm !== st.seenHurt && pm.t < 0.12 && this.distTo(player) < 4) {
        // the cut was turned aside: answer it
        st.seenHurt = pm;
        st.riposteAt = now + 0.12;
        this.svc.fx('sparks', this.chest.clone().add(this.forward.multiplyScalar(0.4)), { count: 26, color: 0xffe2a0 });
      }
      if (st.riposteAt >= 0 && now >= st.riposteAt) { st.riposteAt = -1; this.faceToward(player.pos.x, player.pos.z, 10); this.startMove(MOVES.ret_riposte); }
      this.wish.set(0, 0, 0);
      return;
    }
    st.riposteAt = -1;
    // read the third cut: two lights in one breath, the second's blow already spent
    const pm = player.move;
    if (this.aware && !this.dead && st.stanceCd <= 0 && pm && attackCat(pm.def.id) === 'L' && st.habits.lightStreak >= 2 && pm.t > 0.36 && this.distTo(player) < 3.6
      && Math.abs(this.angleTo(player.pos)) < 1.2 && (!m || m.def.id === 'hurt_light' || m.def.id === 'guard_hit')) {
      st.stanceCd = 2.2;
      this.faceToward(player.pos.x, player.pos.z, 10);
      this.startMove(MOVES.ret_stance, { fade: 0.04 });
      this.svc.hint('hh_parryStance');
      this.wish.set(0, 0, 0);
      return;
    }
    super.think(dt, player);
  }
  protected override onCustom(id: string, m: MoveInstance) {
    if (id === 'glint') { this.svc.fx('sparks', new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld).add(new THREE.Vector3(0, 0.25, 0)), { count: 12, color: 0xfff0c0, speed: 1.5 }); return; }
    super.onCustom(id, m);
  }
}

/** Duellist: the feint's stamp throws dust; the real lunge glints first. */
export class DuellistAI extends Enemy {
  protected override onCustom(id: string, m: MoveInstance) {
    if (id === 'stamp') { this.svc.fx('dust', this.pos.clone(), { count: 30, speed: 2 }); this.svc.sfx('land', { pos: this.pos, volume: 1.4 }); return; }
    if (id === 'glint') { this.svc.fx('sparks', new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld).addScaledVector(this.forward, 0.9), { count: 16, color: 0xfff0c0, speed: 1.2 }); this.svc.sfx('parry_attempt', { pos: this.pos, volume: 0.6 }); return; }
    super.onCustom(id, m);
  }
}

/** Gardener: a grab that connects holds the victim and cuts twice. */
export class GardenerAI extends Enemy {
  private get victim(): Actor | null { return (this as unknown as { _victim?: Actor | null })._victim ?? null; }
  private set victim(v: Actor | null) { (this as unknown as { _victim?: Actor | null })._victim = v; }
  override onDealtHit(r: HitResult) {
    if (r.move.id !== 'gard_grab' || r.outcome !== 'hit' || r.target.dead) return;
    const v = r.target;
    this.victim = v;
    // hold: the victim is pinned in front of the shears for the cut
    v.startMove(MOVES.hh_held, { fade: 0.04 });
    v.knock.set(0, 0, 0);
    const f = this.forward;
    v.teleport(new THREE.Vector3(this.pos.x + f.x * 1.05, v.pos.y, this.pos.z + f.z * 1.05), this.yaw + Math.PI);
    this.startMove(MOVES.gard_cut, { fade: 0.05 });
  }
  protected override onCustom(id: string, m: MoveInstance) {
    const v = this.victim;
    if (id === 'snip' && v && !v.dead && v.move?.def.id === 'hh_held') {
      const c = v as unknown as { defend(p: { physical: number; magic: number; fire: number }, k: string): number };
      const dmg = c.defend({ physical: 260, magic: 0, fire: 0 }, 'slash');
      v.hp = Math.max(0, v.hp - dmg);
      v.flash = 1;
      this.svc.sfx('hit_flesh', { pos: v.pos });
      this.svc.fx('blood', v.chest, { count: 18 });
      this.svc.shake(0.25);
      if (v.hp <= 0) (v as unknown as { react(k: 'death', f: THREE.Vector3): void }).react('death', this.pos);
      return;
    }
    if (id === 'release') { if (v && v.move?.def.id === 'hh_held') { v.endMove(); v.knock.copy(this.forward.multiplyScalar(4)); } this.victim = null; return; }
    super.onCustom(id, m);
  }
  override react(kind: Parameters<Enemy['react']>[0], from: THREE.Vector3) {
    // staggered mid-cut: the victim is released
    if (kind !== 'light' && this.victim) { const v = this.victim; if (v.move?.def.id === 'hh_held') v.endMove(); this.victim = null; }
    super.react(kind, from);
  }
}

/** Courtier: gilt bolts from the raised hand. */
export class CourtierAI extends Enemy {
  protected override onCustom(id: string, m: MoveInstance) {
    const hand = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handR.matrixWorld);
    if (id === 'charge') { this.svc.fx('bellMotes', hand, { count: 22, speed: 0.6 }); return; }
    if ((id === 'bolt' || id === 'volley') && this.target) {
      const shots = id === 'volley' ? [-0.22, 0, 0.22] : [0];
      for (const a of shots) {
        const aim = this.target.chest.clone().addScaledVector(this.target.vel, 0.25);
        const dir = aim.sub(hand).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
        this.svc.spawnProjectile({ kind: 'shard', owner: this, pos: hand.clone(), vel: dir.multiplyScalar(id === 'volley' ? 17 : 21), gravity: 0, radius: 0.12, life: 2.6, packet: { physical: 0, magic: id === 'volley' ? 160 : 220, fire: 0 }, posture: 20, poise: 30, damageKind: 'magic' });
      }
      this.svc.sfx('cast_shard', { pos: this.pos });
      return;
    }
    super.onCustom(id, m);
  }
}

/** Succession ghost: phases between its two claims (the spawn's patrol points). */
export class GhostAI extends Enemy {
  private get gs() { return ((this as unknown as { _gh?: { pts: THREE.Vector3[]; i: number; t: number } })._gh ??= { pts: [], i: 0, t: 3 + this.rng.next() * 3 }); }
  /** Take over the patrol as the two phase points (called once after spawning). */
  claimPoints() { if (this.patrol && this.patrol.length >= 2) { this.gs.pts = this.patrol.map((p) => p.clone()); this.patrol = null; this.ai = 'idle'; } }
  override think(dt: number, player: Actor) {
    const g = this.gs;
    if (!this.dead && g.pts.length >= 2 && !this.move) {
      g.t -= dt;
      if (g.t <= 0) { g.t = (this.aware ? 5 : 7) + this.rng.next() * 3; this.startMove(MOVES.ghost_fade, { fade: 0.05 }); this.wish.set(0, 0, 0); return; }
    }
    super.think(dt, player);
  }
  protected override onCustom(id: string, m: MoveInstance) {
    const g = this.gs;
    const next = g.pts.length >= 2 ? g.pts[(g.i + 1) % g.pts.length] : null;
    if (id === 'fadeStart' && next) {
      // motes gather where it will reappear (the tell), and rise where it stands
      this.svc.fx('bellMotes', next.clone().add(new THREE.Vector3(0, 1, 0)), { count: 50, speed: 0.8 });
      this.svc.fx('goldMotes', this.chest, { count: 30, speed: 1.2 });
      return;
    }
    if (id === 'phase' && next) {
      g.i = (g.i + 1) % g.pts.length;
      const t = this.target;
      const yaw = t ? Math.atan2(t.pos.x - next.x, t.pos.z - next.z) : this.yaw;
      this.teleport(next.clone(), yaw);
      this.home.copy(next);
      this.startMove(MOVES.ghost_appear, { fade: 0.02 });
      this.svc.fx('goldMotes', this.chest, { count: 40, speed: 1.5 });
      return;
    }
    super.onCustom(id, m);
  }
  override resetAt(pos: THREE.Vector3, yaw: number) {
    super.resetAt(pos, yaw);
    const g = (this as unknown as { _gh?: { i: number; t: number } })._gh;
    if (g) { g.i = 0; g.t = 3; }
  }
}

const BEHAVIOURS: Record<string, { prototype: object }> = {
  hhRetainer: RetainerAI, hhDuellist: DuellistAI, hhGardener: GardenerAI, hhCourtier: CourtierAI, hhGhost: GhostAI,
};

/**
 * Give a spawned enemy its Garden Court behaviour (the game spawns plain Enemies; these subclasses
 * add no constructor state, so re-prototyping an instance is safe).
 */
export function applyHouseholdBehaviour(e: Enemy) {
  const cls = BEHAVIOURS[e.def.kind];
  if (!cls || Object.getPrototypeOf(e) === cls.prototype) return;
  Object.setPrototypeOf(e, cls.prototype);
  if (e instanceof GhostAI) e.claimPoints();
}
