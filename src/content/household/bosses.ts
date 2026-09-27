/**
 * Garden Court bosses.
 *
 * DAME CELWYN ARDENT (keeper, `celwyn`) — the Household's master-at-arms, who trained the Returned.
 *   She READS HIS HABITS: two light cuts in one breath and she is already waiting for the third
 *   ("You still drop your guard after the third cut."); the same attack three times running (twice
 *   from phase 2) and she has it too. Her read is always shown — a square, crosswise stance with a
 *   ring and a glint — and it is always beatable: a DIFFERENT attack into the stance catches her out
 *   (a stumble and heavy posture damage), a pause lets it lapse, a dodge escapes the riposte.
 *   Phase 1 "Master-at-Arms" (100–60 %): cut / backhand, thrust, overhead, pommel (guard break).
 *   Phase 2 "The Lesson" (60–25 %): cloak shed; the Lesson (two cuts and a held third — her guard
 *   drops after it), side-step cut; reads repeats after two.
 *   Phase 3 "The Last Choice" (25–0 %): the Great Bell tolls through her; bell-light toll (unparryable
 *   shockwave, jump-back tell) and the oath charge (unparryable, jagged ring).
 *
 * THE TWIN HEIRS (mid-boss, `heirs`) — Casimir, Heir by Law (Sword of State: sweeps, overhead,
 *   thrust) and Corisande, Heir by Blood (estoc: lunges, flicks, a flurry). They fight the Returned
 *   AND each other's claim: their blows strike the rival too (at half weight) — lure one into the
 *   other's swing. When one falls the other grieves, then fights on ENRAGED (faster recovery,
 *   new strings). One boss bar shows both lives.
 */
import * as THREE from 'three';
import type { EnemyDef } from '../../actors/Enemy';
import type { Actor, MoveInstance } from '../../actors/Actor';
import type { MoveDef } from '../../combat/types';
import type { Services } from '../../game/services';
import type { CueId } from '../../audio/contract';
import { registerMoves, MOVES } from '../../combat/moves';
import { Boss, registerBoss, type BossSpec } from '../bosses';
import { segmentSegmentDistSq } from '../../core/math';
import { Habits, attackCat, type AttackCat } from './enemies';
import { LS_REST, RAP_REST, GS_REST } from './clips';

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const sfx = (t: number, cue: CueId, volume?: number) => ({ t, e: { type: 'sfx' as const, cue, volume } });
const W = (start: number, end: number, dmg: number, poise: number, x: Partial<NonNullable<MoveDef['hits']>[number]> = {}) =>
  ({ start, end, source: 'weaponR' as const, dmg, posture: 0, poise, kind: 'slash' as const, knock: 2, ...x });

// ============================================================================ Dame Celwyn — moves

registerMoves({
  cel_cut: M({ id: 'cel_cut', clip: 'celCut', dur: 1.35, hits: [W(0.56, 0.72, 380, 50)], motion: [[0.5, 0], [0.7, 0.9]], track: [0.52, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.54, 'swing_heavy'), ...tr(0.54, 0.74)] }),
  cel_back: M({ id: 'cel_back', clip: 'celBack', dur: 1.3, hits: [W(0.4, 0.54, 350, 45)], motion: [[0.32, 0], [0.52, 0.7]], track: [0.36, 5], events: [sfx(0.38, 'swing_heavy'), ...tr(0.38, 0.56)] }),
  cel_thrust: M({ id: 'cel_thrust', clip: 'celThrust', dur: 1.5, hits: [W(0.68, 0.82, 420, 55, { kind: 'thrust', knock: 3 })], motion: [[0.6, -0.2], [0.8, 2.4]], track: [0.64, 6], events: [sfx(0.1, 'enemy_windup'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.84)] }),
  cel_over: M({ id: 'cel_over', clip: 'celOver', dur: 2.0, hits: [W(0.98, 1.1, 520, 85, { kind: 'strike', knock: 4 })], motion: [[0.9, 0], [1.08, 0.8]], track: [0.9, 4], hyper: [0.5, 1.1, 80], events: [sfx(0.15, 'enemy_grunt'), sfx(0.95, 'swing_huge'), { t: 1.08, e: { type: 'shake', amount: 0.35 } }, ...tr(0.95, 1.12)] }),
  cel_pommel: M({ id: 'cel_pommel', clip: 'celPommel', dur: 1.3, hits: [{ start: 0.5, end: 0.62, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0, 0], radius: 0.38 }, dmg: 200, posture: 0, poise: 70, kind: 'strike', guardBreak: true, knock: 3 }], motion: [[0.46, 0], [0.6, 1.0]], track: [0.48, 6], events: [sfx(0.08, 'enemy_grunt')] }),
  cel_backstep: M({ id: 'cel_backstep', clip: 'backstep', dur: 0.6, iframes: [0.04, 0.25], motion: [[0.4, -2.6]] }),
  cel_stance: M({ id: 'cel_stance', clip: 'celStance', dur: 1.6, parry: [0.06, 1.55], noFlinch: true, fade: 0.04, events: [sfx(0.01, 'parry_attempt', 1.3), { t: 0.06, e: { type: 'custom', id: 'glint' } }, { t: 0.8, e: { type: 'custom', id: 'glint' } }] }),
  cel_riposte: M({ id: 'cel_riposte', clip: 'celRiposte', dur: 1.35, hits: [W(0.56, 0.7, 440, 60, { kind: 'thrust', knock: 3 })], motion: [[0.45, -0.1], [0.66, 1.3]], track: [0.5, 9], events: [sfx(0.54, 'swing_heavy'), ...tr(0.54, 0.72)] }),
  cel_caught: M({ id: 'cel_caught', clip: 'celCaught', dur: 1.15, fade: 0.03, motion: [[0.3, -0.5]] }),
  cel_lesson: M({
    id: 'cel_lesson', clip: 'celLesson', dur: 3.8,
    hits: [W(0.51, 0.66, 330, 45, { group: 0 }), W(0.93, 1.08, 330, 45, { group: 1 }), W(2.36, 2.48, 560, 90, { kind: 'strike', knock: 4, group: 2 })],
    motion: [[0.44, 0], [0.64, 0.8], [0.86, 0.8], [1.06, 1.4], [2.3, 1.4], [2.46, 2.1]], track: [2.3, 3],
    events: [{ t: 0.02, e: { type: 'custom', id: 'lesson' } }, sfx(0.49, 'swing_heavy'), sfx(0.91, 'swing_heavy'), sfx(1.5, 'enemy_windup'), sfx(2.33, 'swing_huge'), { t: 2.46, e: { type: 'shake', amount: 0.4 } }, ...tr(0.49, 1.1), ...tr(2.33, 2.5)],
  }),
  cel_stepcut: M({ id: 'cel_stepcut', clip: 'celStepCut', dur: 1.4, hits: [W(0.62, 0.74, 400, 55)], motionSide: [[0.3, -1.3]], motion: [[0.6, 0], [0.72, 0.8]], track: [0.62, 7], events: [sfx(0.1, 'enemy_windup'), sfx(0.6, 'swing_heavy'), ...tr(0.6, 0.76)] }),
  cel_toll: M({
    id: 'cel_toll', clip: 'celToll', dur: 2.1, tell: 'unparryable',
    hits: [W(1.06, 1.14, 360, 60, { unparryable: true, kind: 'strike' }), { start: 1.12, end: 1.22, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 1.2], radius: 3.2 }, dmg: 300, posture: 0, poise: 90, kind: 'holy', unparryable: true, knock: 7, group: 5 }],
    motion: [[0.5, -0.8], [1.0, -0.8], [1.1, 0.2]], track: [1.0, 3], hyper: [0.4, 1.25, 120],
    events: [sfx(0.08, 'unparryable_tell'), sfx(1.12, 'great_bell_toll', 0.7), { t: 1.12, e: { type: 'shake', amount: 0.55 } }, { t: 1.12, e: { type: 'custom', id: 'shockwave' } }],
  }),
  cel_oath: M({
    id: 'cel_oath', clip: 'celOath', dur: 1.9, tell: 'unparryable',
    hits: [W(0.84, 1.1, 520, 110, { unparryable: true, kind: 'thrust', knock: 6 })],
    motion: [[0.8, -0.3], [1.1, 5.0]], track: [0.82, 4], hyper: [0.4, 1.15, 120],
    events: [sfx(0.1, 'unparryable_tell'), { t: 0.5, e: { type: 'custom', id: 'oathGlow' } }, sfx(0.82, 'swing_huge'), ...tr(0.82, 1.12)],
  }),
  cel_transition2: M({ id: 'cel_transition2', clip: 'celTransition2', dur: 2.6, iframes: [0, 2.45], noFlinch: true, events: [{ t: 1.2, e: { type: 'custom', id: 'phase' } }, sfx(1.25, 'stillbell_ring')] }),
  cel_transition3: M({ id: 'cel_transition3', clip: 'celTransition3', dur: 3.2, iframes: [0, 3.05], noFlinch: true, events: [sfx(0.9, 'great_bell_toll'), { t: 1.0, e: { type: 'custom', id: 'bellLight' } }, { t: 2.0, e: { type: 'custom', id: 'phase' } }, { t: 2.1, e: { type: 'shake', amount: 0.5 } }] }),
  cel_death: M({ id: 'cel_death', clip: 'celDeath', dur: 3.2 }),
});

export const CELWYN: EnemyDef = {
  kind: 'celwyn', name: 'Dame Celwyn Ardent', look: 'celwyn', props: { height: 1.02, bulk: 1.0, shoulder: 1.02 },
  radius: 0.44, height: 1.86, hp: 6200, poise: 80, postureMax: 900, postureRegen: 50, defense: 95,
  absorb: { physical: 0.25, magic: 0.2, fire: 0.15 }, hours: 38000, walk: 2.0, run: 4.8, sight: 40,
  weaponR: 'ardent_longsword', stance: { handR: LS_REST, handL: null, chest: [4, -8, 0] },
  attacks: [
    { move: 'cel_cut', range: [0, 3.0], weight: 4, follow: [['cel_back', 0.55]] },
    { move: 'cel_thrust', range: [2.0, 5.2], weight: 3, cooldown: 3.5 },
    { move: 'cel_over', range: [0, 2.8], weight: 1.5, cooldown: 6 },
    { move: 'cel_pommel', range: [0, 1.8], weight: 1.3, cooldown: 6 },
    { move: 'cel_backstep', range: [0, 1.3], weight: 0.8, cooldown: 5 },
    { move: 'cel_lesson', range: [0, 3.0], weight: 3, cooldown: 8, phase: 2 },
    { move: 'cel_stepcut', range: [0, 3.0], weight: 2.5, cooldown: 4, phase: 2 },
    { move: 'cel_toll', range: [0, 3.6], weight: 2, cooldown: 9, phase: 3 },
    { move: 'cel_oath', range: [4, 12], angle: 0.4, weight: 2.5, cooldown: 7, phase: 3 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'cel_death' },
  backstabbable: false, criticalable: true, recover: [0.55, 1.15], aggression: 0.72, boss: true,
};

/** Dame Celwyn: reads the Returned's habits (see the file comment). */
export class CelwynBoss extends Boss {
  readonly habits = new Habits();
  /** Predicted category (or move id) for the current stance. */
  private predicted: { cat: AttackCat; id: string | null } | null = null;
  private riposteAt = -1;
  private seenHurt: MoveInstance | null = null;
  private stanceCd = 0;
  private lastLine = -99;
  /** Called on reads / catches (region: subtitles, journal). */
  onRead: (kind: 'third' | 'repeat' | 'caught' | 'parried') => void = () => {};

  constructor(spec: BossSpec, svc: Services, seed = 5) { super(spec, svc, seed); }

  override think(dt: number, player: Actor) {
    if (!this.engaged || this.dead) { super.think(dt, player); return; }
    const now = this.svc.time;
    const ev = this.habits.observe(player, now);
    if (this.stanceCd > 0) this.stanceCd -= dt;
    const m = this.move;
    if (m?.def.id === 'cel_stance') {
      const pm = player.move;
      if (pm && pm.def.id === 'hurt_heavy' && pm !== this.seenHurt && pm.t < 0.12 && this.distTo(player) < 4.2) {
        this.seenHurt = pm;
        this.riposteAt = now + 0.12;
        this.svc.fx('sparks', this.chest.clone().add(this.forward.multiplyScalar(0.4)), { count: 30, color: 0xffe2a0 });
        this.onRead('parried');
      } else if (ev && this.predicted && this.riposteAt < 0 && this.distTo(player) < 5 && this.differs(ev.cat, ev.id)) {
        // a different attack into a read stance: caught out
        this.startMove(MOVES.cel_caught, { fade: 0.03 });
        this.posture = Math.min(this.postureMax * 0.98, this.posture + this.postureMax * 0.25);
        this.postureDelay = 2.2;
        this.svc.sfx('stagger', { pos: this.pos });
        this.predicted = null;
        this.onRead('caught');
      }
      if (this.riposteAt >= 0 && now >= this.riposteAt) { this.riposteAt = -1; this.predicted = null; this.faceToward(player.pos.x, player.pos.z, 10); this.startMove(MOVES.cel_riposte); }
      this.wish.set(0, 0, 0);
      return;
    }
    this.riposteAt = -1;
    const free = !m || m.def.id === 'boss_flinch';
    const close = this.distTo(player) < 4 && Math.abs(this.angleTo(player.pos)) < 1.3;
    if (free && close && this.stanceCd <= 0) {
      const pm = player.move;
      // (a) the third cut: two lights in one breath, the second already spent
      if (pm && attackCat(pm.def.id) === 'L' && this.habits.lightStreak >= 2 && pm.t > 0.36) return this.enterStance({ cat: 'L', id: null }, 'third');
      // (b) the same attack again (three times; twice from phase 2), read as it starts
      const need = this.phase >= 2 ? 2 : 3;
      if (ev && ev.cat !== 'C' && this.habits.repeats(now) >= need) return this.enterStance({ cat: ev.cat, id: ev.id }, 'repeat');
    }
    super.think(dt, player);
  }

  private differs(cat: AttackCat, id: string) {
    const p = this.predicted!;
    if (p.id === null) return cat !== 'L' && cat !== 'X';
    return id !== p.id && cat !== 'X';
  }

  private enterStance(pred: { cat: AttackCat; id: string | null }, kind: 'third' | 'repeat') {
    this.predicted = pred;
    this.stanceCd = this.phase >= 2 ? 1.8 : 2.6;
    this.faceToward(this.target?.pos.x ?? this.pos.x, this.target?.pos.z ?? this.pos.z, 10);
    this.startMove(MOVES.cel_stance, { fade: 0.03 });
    this.wish.set(0, 0, 0);
    this.svc.hint('hh_celwynReads');
    const now = this.svc.time;
    if (now - this.lastLine > 10) { this.lastLine = now; this.onRead(kind); }
  }

  protected override onCustom(id: string, mi: MoveInstance) {
    const blade = () => new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld);
    if (id === 'glint') { this.svc.fx('sparks', blade().add(new THREE.Vector3(0, 0.3, 0)), { count: 16, color: 0xfff2c8, speed: 1.4 }); return; }
    if (id === 'lesson') { this.onEvent('lesson', this); return; }
    if (id === 'bellLight') { this.svc.fx('goldMotes', this.chest, { count: 160, speed: 3 }); this.onEvent('bellLight', this); return; }
    if (id === 'oathGlow') { this.svc.fx('bellMotes', blade(), { count: 40, speed: 1 }); return; }
    super.onCustom(id, mi);
  }
}

registerBoss({
  id: 'celwyn', def: CELWYN, phases: [0.6, 0.25], transitions: ['cel_transition2', 'cel_transition3'],
  looks: ['celwyn', 'celwyn2', 'celwyn3'], weaponR: 'ardent_longsword', memory: 'memory_celwyn',
  cls: CelwynBoss as unknown as BossSpec['cls'],
});

// ============================================================================ the Twin Heirs — moves

registerMoves({
  law_sweep: M({ id: 'law_sweep', clip: 'lawSweep', dur: 2.1, hits: [W(0.88, 1.08, 420, 70, { knock: 3 })], motion: [[0.8, 0], [1.05, 0.9]], track: [0.84, 4], hyper: [0.5, 1.1, 60], events: [sfx(0.12, 'enemy_windup'), sfx(0.86, 'swing_huge'), ...tr(0.86, 1.1)] }),
  law_over: M({
    id: 'law_over', clip: 'lawOver', dur: 2.5,
    hits: [W(1.12, 1.24, 560, 95, { kind: 'strike', knock: 4 }), { start: 1.22, end: 1.3, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.3, 1.5], radius: 1.8 }, dmg: 260, posture: 0, poise: 60, kind: 'strike', unparryable: true, knock: 5, group: 5 }],
    motion: [[1.05, 0], [1.22, 0.8]], track: [1.05, 3.5], hyper: [0.5, 1.3, 90],
    events: [sfx(0.15, 'enemy_grunt'), sfx(1.1, 'swing_huge'), { t: 1.22, e: { type: 'shake', amount: 0.5 } }, { t: 1.22, e: { type: 'custom', id: 'shockwave' } }, ...tr(1.1, 1.26)],
  }),
  law_thrust: M({ id: 'law_thrust', clip: 'lawThrust', dur: 1.85, hits: [W(0.86, 1.0, 450, 70, { kind: 'thrust', knock: 3 })], motion: [[0.78, -0.2], [0.98, 2.3]], track: [0.8, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.84, 'swing_heavy'), ...tr(0.84, 1.02)] }),
  law_whirl: M({ id: 'law_whirl', clip: 'lawWhirl', dur: 2.9, hits: [W(0.9, 1.1, 380, 60, { group: 0 }), W(1.55, 1.75, 380, 60, { group: 1 })], motion: [[0.8, 0], [1.1, 0.8], [1.75, 1.6]], track: [1.5, 4], hyper: [0.5, 1.8, 70], events: [sfx(0.12, 'boss_roar'), sfx(0.88, 'swing_huge'), sfx(1.53, 'swing_huge'), ...tr(0.88, 1.78)] }),
  blood_lunge: M({ id: 'blood_lunge', clip: 'duelLunge', dur: 1.4, hits: [W(0.6, 0.74, 340, 45, { kind: 'thrust', knock: 2.4 })], motion: [[0.52, -0.25], [0.7, 2.2]], track: [0.55, 6], events: [sfx(0.08, 'enemy_windup'), sfx(0.58, 'swing_light'), ...tr(0.58, 0.76)] }),
  blood_flick: M({ id: 'blood_flick', clip: 'duelFlick', dur: 1.65, hits: [W(0.54, 0.64, 260, 30, { group: 0 }), W(0.86, 0.96, 260, 30, { group: 1 })], motion: [[0.48, 0], [0.62, 0.5], [0.95, 0.9]], track: [0.84, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.52, 'swing_light'), sfx(0.84, 'swing_light'), ...tr(0.52, 0.98)] }),
  blood_backstep: M({ id: 'blood_backstep', clip: 'duelBackstep', dur: 0.6, iframes: [0.04, 0.3], motion: [[0.4, -2.6]] }),
  blood_flurry: M({ id: 'blood_flurry', clip: 'bloodFlurry', dur: 2.0, hits: [W(0.58, 0.68, 250, 30, { kind: 'thrust', group: 0 }), W(0.86, 0.96, 250, 30, { kind: 'thrust', group: 1 }), W(1.14, 1.26, 280, 40, { kind: 'thrust', group: 2 })], motion: [[0.52, -0.15], [0.66, 0.6], [0.95, 1.2], [1.24, 2.0]], track: [1.1, 6], events: [sfx(0.08, 'enemy_windup'), sfx(0.56, 'swing_light'), sfx(0.84, 'swing_light'), sfx(1.12, 'swing_light'), ...tr(0.56, 1.28)] }),
  blood_feint: M({ id: 'blood_feint', clip: 'duelFeint', dur: 2.2, hits: [W(1.38, 1.52, 380, 50, { kind: 'thrust', knock: 2.6 })], motion: [[0.36, 0.1], [0.58, 0.55], [0.95, 0.1], [1.3, 0], [1.48, 2.2]], track: [1.35, 6], events: [sfx(0.28, 'enemy_grunt'), { t: 0.3, e: { type: 'custom', id: 'stamp' } }, { t: 1.02, e: { type: 'custom', id: 'glint' } }, sfx(1.36, 'swing_light'), ...tr(1.36, 1.54)] }),
  heir_grief: M({ id: 'heir_grief', clip: 'heirGrief', dur: 2.5, iframes: [0, 2.2], noFlinch: true, events: [sfx(0.2, 'boss_roar'), { t: 2.0, e: { type: 'custom', id: 'enrage' } }] }),
  heir_death: M({ id: 'heir_death', clip: 'death', dur: 2.2 }),
});

const HEIR_BASE = { backstabbable: false, criticalable: true, boss: true, reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'heir_death' } } as const;
export const HEIR_LAW: EnemyDef = {
  ...HEIR_BASE,
  kind: 'heirLaw', name: 'Casimir, Heir by Law', look: 'heirLaw', props: { height: 1.1, bulk: 1.12, shoulder: 1.1 },
  radius: 0.5, height: 2.0, hp: 3400, poise: 70, postureMax: 700, postureRegen: 40, defense: 90,
  absorb: { physical: 0.25, magic: 0.15, fire: 0.1 }, hours: 24000, walk: 1.7, run: 4.2, sight: 40,
  weaponR: 'hh_sword_of_state', stance: { handR: GS_REST, handL: { p: [GS_REST.p[0] + 0.02, GS_REST.p[1] + 0.1, GS_REST.p[2] + 0.09], dir: GS_REST.dir, elbow: [0.8, -0.4, -0.4] }, chest: [4, -10, 0] },
  attacks: [
    { move: 'law_sweep', range: [0, 3.6], weight: 3 },
    { move: 'law_over', range: [0, 3.2], weight: 2, cooldown: 5 },
    { move: 'law_thrust', range: [2, 5.6], weight: 2.5, cooldown: 3 },
    { move: 'law_whirl', range: [0, 3.6], weight: 3, cooldown: 6, phase: 2 },
  ],
  recover: [0.8, 1.5], aggression: 0.6,
};
export const HEIR_BLOOD: EnemyDef = {
  ...HEIR_BASE,
  kind: 'heirBlood', name: 'Corisande, Heir by Blood', look: 'heirBlood', props: { height: 1.0, bulk: 0.92, shoulder: 0.96 },
  radius: 0.38, height: 1.84, hp: 2600, poise: 35, postureMax: 520, postureRegen: 45, defense: 80,
  absorb: { physical: 0.16, magic: 0.18, fire: 0.1 }, hours: 0, walk: 2.1, run: 5.2, sight: 40,
  weaponR: 'hh_heir_estoc', stance: { handR: RAP_REST, handL: null, chest: [2, -22, 0], spine: [0, -10, 0], hips: [0, -14, 0] },
  attacks: [
    { move: 'blood_lunge', range: [1.6, 4.8], weight: 3, cooldown: 2 },
    { move: 'blood_flick', range: [0, 2.4], weight: 2.5 },
    { move: 'blood_backstep', range: [0, 1.4], weight: 1.5, cooldown: 3 },
    { move: 'blood_flurry', range: [0, 3.0], weight: 3, cooldown: 4, phase: 2 },
    { move: 'blood_feint', range: [2, 5], weight: 1.5, cooldown: 6, phase: 2 },
  ],
  recover: [0.6, 1.2], aggression: 0.7,
};
const enraged = (d: EnemyDef): EnemyDef => ({ ...d, recover: [d.recover[0] * 0.45, d.recover[1] * 0.5], aggression: Math.min(0.92, d.aggression + 0.2), walk: d.walk * 1.15, run: d.run * 1.12, poise: d.poise + 20 });

/** One of the Twin Heirs: its blows strike the rival too; when the rival falls it grieves and enrages. */
export class HeirBoss extends Boss {
  rival: HeirBoss | null = null;
  enraged = false;
  /** Region hook: the rival was struck by this heir's blow. */
  onRivalHit: (by: HeirBoss) => void = () => {};
  private readonly _a = new THREE.Vector3();
  private readonly _b = new THREE.Vector3();

  constructor(spec: BossSpec, svc: Services, seed = 5) { super(spec, svc, seed); }

  override think(dt: number, player: Actor) {
    super.think(dt, player);
    const r = this.rival, m = this.move;
    if (!r || r.dead || this.dead || !this.engaged || !m?.def.hits || this.distTo(r) > 5) return;
    m.def.hits.forEach((h, hi) => {
      if (h.source !== 'weaponR' || m.t < h.start || m.t > h.end) return;
      const rad = this.weaponSegment('R', this._a, this._b);
      if (rad === null) return;
      const group = h.group ?? hi;
      let log = m.hitLog.get(group);
      if (!log) m.hitLog.set(group, (log = new Set()));
      if (log.has(r.id)) return;
      for (const hv of r.hurt) {
        const d2 = segmentSegmentDistSq(this._a, this._b, hv.a, hv.b);
        if (d2 < (rad + hv.r) ** 2) {
          log.add(r.id);
          this.svc.combat.resolve(this, r, { ...h, dmg: h.dmg * 0.5 }, m.def, 'R', hv.a.clone().lerp(hv.b, 0.5));
          this.onRivalHit(this);
          break;
        }
      }
    });
  }

  /** The rival has fallen: grieve, then fight on enraged (phase 2 strings, faster recovery). */
  enrage() {
    if (this.enraged || this.dead) return;
    this.enraged = true;
    this.def = enraged(this.def);
    this.poise = this.def.poise;
    this.move = null;
    this.startMove(MOVES.heir_grief, { fade: 0.08 });
  }

  protected override onCustom(id: string, mi: MoveInstance) {
    if (id === 'enrage') { this.phase = 2; this.posture = 0; this.onEvent('enraged', this); return; }
    if (id === 'stamp') { this.svc.fx('dust', this.pos.clone(), { count: 30, speed: 2 }); this.svc.sfx('land', { pos: this.pos, volume: 1.4 }); return; }
    if (id === 'glint') { this.svc.fx('sparks', new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld).addScaledVector(this.forward, 0.9), { count: 16, color: 0xfff0c0, speed: 1.2 }); return; }
    super.onCustom(id, mi);
  }
}

registerBoss({ id: 'heirs', def: HEIR_LAW, phases: [], looks: ['heirLaw', 'heirLaw2'], weaponR: 'hh_sword_of_state', cls: HeirBoss as unknown as BossSpec['cls'], music: 'heirs' });
registerBoss({ id: 'heirs_blood', def: HEIR_BLOOD, phases: [], looks: ['heirBlood', 'heirBlood2'], weaponR: 'hh_heir_estoc', cls: HeirBoss as unknown as BossSpec['cls'], music: 'heirs' });
