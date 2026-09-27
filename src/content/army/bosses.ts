/**
 * Siegeholm's bosses.
 *
 * ODERIC, THE RAM-KNIGHT (mid-boss, the barbican's gate passage). 2600 HP, two phases (50 %).
 *  Phase 1: the charge — head down, the foot scrapes twice (1.05 s tell), then 14 m of armoured
 *  run, unparryable. Dodge aside: if he meets a pier, the gate or the veil instead of you he is
 *  staggered against it (posture broken, 3.4 s, a critical opening) and hurts himself. Also a ram
 *  sweep (0.8 s) that may run on into an overhead slam (1.05 s, shockwave), and a shoulder shove.
 *  Phase 2 ("the helm breaks"): he charges more often and wheels round for a second, shorter-told
 *  charge; sweeps run on into the slam more often.
 *
 * MARSHAL YSOLDE VARR (keeper of the Army's Great Bell, the Bell Rampart). 3400 HP, two phases (55 %).
 *  Phase 1 "The Victory": disciplined halberd forms — thrust (0.62 s), sweep (0.72 s) with a hook
 *  follow-up, overhead chop (0.95 s, hyper-armour) — and the volley: she raises the halberd and the
 *  tower bombards fire on her word (marked blasts around you, ~1.8 s to clear them).
 *  Phase 2 "The Defeat": armour broken, banner burning, desperate and relentless — the fury (cut,
 *  cut, thrust, then an overhead held a breath too long, with a long exposed recovery), a running
 *  lunge, a burning sweep that trails fire, and the volley again.
 */
import * as THREE from 'three';
import type { EnemyDef } from '../../actors/Enemy';
import type { MoveDef } from '../../combat/types';
import type { CollisionWorld } from '../../world/Collision';
import type { MoveInstance } from '../../actors/Actor';
import { registerMoves, MOVES } from '../../combat/moves';
import { Boss, registerBoss, type BossSpec } from '../bosses';
import type { Services } from '../../game/services';
import { OD_REST, OD_REST_L, VARR_REST, VARR_REST_L } from './clips';
import './enemies';

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<NonNullable<MoveDef['hits']>[number]> = {}) =>
  ({ start, end, source: 'weaponR' as const, dmg, posture: 0, poise, kind: 'slash' as const, knock: 2, ...extra });

// ====================================================================== Oderic

const CHARGE_HIT = { source: 'sphere' as const, sphere: { bone: 'chest' as const, offset: [0, 0.1, 0.5] as [number, number, number], radius: 0.95 }, dmg: 320, posture: 0, poise: 130, kind: 'strike' as const, unparryable: true, knock: 9 };
const charge = (id: string, s: number): MoveDef => M({
  id, clip: 'odCharge', dur: 3.2 / s, speed: s, tell: 'unparryable', noFlinch: true,
  hits: [{ start: 1.12 / s, end: 2.45 / s, ...CHARGE_HIT }],
  motion: [[1.05 / s, 0], [1.2 / s, 1.2], [2.4 / s, 14.5], [2.7 / s, 15.3]],
  track: [1.05 / s, 3.5 * s], hyper: [0.2, 2.8 / s, 220],
  events: [
    { t: 0.08, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 0.5 / s, e: { type: 'sfx', cue: 'step', volume: 1.6 } }, { t: 0.9 / s, e: { type: 'sfx', cue: 'step', volume: 1.6 } },
    { t: 1.1 / s, e: { type: 'custom', id: 'chargeStart' } }, { t: 1.3 / s, e: { type: 'shake', amount: 0.2 } }, { t: 2.45 / s, e: { type: 'custom', id: 'chargeEnd' } },
  ],
});

registerMoves({
  od_charge: charge('od_charge', 1),
  od_charge_p2: charge('od_charge_p2', 1.12),
  od_charge_turn: charge('od_charge_turn', 1.45),
  od_swing: M({ id: 'od_swing', clip: 'odSwing', dur: 1.9, hits: [W(0.86, 1.08, 260, 70, { knock: 3 })], motion: [[0.8, 0], [1.05, 0.8]], track: [0.8, 3], hyper: [0.3, 1.08, 60], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.84, e: { type: 'sfx', cue: 'swing_huge' } }, ...tr(0.84, 1.1)] }),
  od_swing2: M({ id: 'od_swing2', clip: 'odSwing', dur: 1.9, hits: [W(0.86, 1.08, 260, 70, { knock: 3 })], motion: [[0.8, 0], [1.05, 0.8]], track: [0.8, 3], hyper: [0.3, 1.08, 60], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.84, e: { type: 'sfx', cue: 'swing_huge' } }, ...tr(0.84, 1.1)] }),
  od_slam: M({
    id: 'od_slam', clip: 'odSlam', dur: 2.4, tell: 'unparryable',
    hits: [W(1.1, 1.2, 300, 90, { kind: 'strike', knock: 5, unparryable: true }), { start: 1.2, end: 1.3, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 1.9], radius: 2.6 }, dmg: 190, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 6, group: 5 }],
    motion: [[1.0, 0], [1.2, 0.6]], track: [1.0, 3], hyper: [0.4, 1.3, 90],
    events: [{ t: 0.1, e: { type: 'sfx', cue: 'unparryable_tell' } }, { t: 1.12, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 1.2, e: { type: 'sfx', cue: 'hit_heavy' } }, { t: 1.2, e: { type: 'shake', amount: 0.6 } }, { t: 1.2, e: { type: 'custom', id: 'shockwave' } }, ...tr(1.08, 1.22)],
  }),
  od_shove: M({ id: 'od_shove', clip: 'odShove', dur: 1.4, tell: 'unparryable', hits: [{ start: 0.66, end: 0.82, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.1, 0.35], radius: 0.85 }, dmg: 170, posture: 0, poise: 110, kind: 'strike', unparryable: true, guardBreak: true, knock: 7 }], motion: [[0.6, -0.1], [0.8, 1.4]], track: [0.6, 4], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_grunt' } }] }),
  od_stunned: M({ id: 'od_stunned', clip: 'odStunned', dur: 3.4, fade: 0.03, vulnerable: 'postureBroken', noFlinch: true, motion: [[0.2, -0.8]] }),
  od_roar: M({ id: 'od_roar', clip: 'odRoar', dur: 3.0, iframes: [0, 2.8], noFlinch: true, events: [{ t: 1.0, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 1.1, e: { type: 'custom', id: 'phase' } }, { t: 1.1, e: { type: 'shake', amount: 0.5 } }] }),
  od_death: M({ id: 'od_death', clip: 'odDeath', dur: 2.8 }),
});

export const ODERIC: EnemyDef = {
  kind: 'oderic', name: 'Oderic, the Ram-Knight', look: 'oderic', props: { height: 1.22, bulk: 1.45, shoulder: 1.22 }, radius: 0.72, height: 2.25,
  hp: 2600, poise: 90, postureMax: 520, postureRegen: 30, defense: 80, absorb: { physical: 0.28, magic: 0.1, fire: 0.1 }, hours: 5200,
  walk: 1.7, run: 3.6, sight: 40, weaponR: 'oderic_ram', stance: { handR: OD_REST, handL: OD_REST_L, chest: [8, -4, 0] },
  attacks: [
    { move: 'od_charge', range: [5, 32], angle: 0.35, weight: 4, cooldown: 6 },
    { move: 'od_swing', range: [0, 3.8], weight: 3.5, follow: [['od_slam', 0.3]] },
    { move: 'od_slam', range: [0, 3.4], weight: 2.5, cooldown: 5 },
    { move: 'od_shove', range: [0, 2.0], weight: 2, cooldown: 5 },
    { move: 'od_charge_p2', range: [4, 32], angle: 0.4, weight: 4, cooldown: 4.5, phase: 2, follow: [['od_charge_turn', 0.55]] },
    { move: 'od_swing2', range: [0, 3.8], weight: 3, phase: 2, follow: [['od_slam', 0.7]] },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'od_death' },
  backstabbable: false, criticalable: true, recover: [0.9, 1.6], aggression: 0.65, boss: true,
};

/** Oderic: a charge that meets stone instead of flesh staggers him. */
export class OdericBoss extends Boss {
  private blocked = 0;
  private charging = false;
  /** Where he last struck a wall (for effects). */
  readonly wallPoint = new THREE.Vector3();
  constructor(spec: BossSpec, svc: Services, seed: number) { super(spec, svc, seed); this.mass = 4; }

  protected override onCustom(id: string, m: MoveInstance) {
    if (id === 'chargeStart') { this.charging = true; this.blocked = 0; return; }
    if (id === 'chargeEnd') { this.charging = false; return; }
    super.onCustom(id, m);
  }

  override stepPhysics(dt: number, world: CollisionWorld, tt: THREE.Vector3 | null, ty: number | null) {
    super.stepPhysics(dt, world, tt, ty);
    const m = this.move;
    if (!this.charging || !m || !m.def.id.startsWith('od_charge')) { this.blocked = 0; if (!m || !m.def.id.startsWith('od_charge')) this.charging = false; return; }
    const moved = Math.hypot(this.pos.x - this.prevPos.x, this.pos.z - this.prevPos.z);
    const want = Math.hypot(this.vel.x, this.vel.z) * dt;
    if (want > 0.04 && moved < want * 0.4) this.blocked++; else this.blocked = 0;
    if (this.blocked >= 2) {
      const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.0, this.pos.z);
      const hit = world.raycast(from, this.forward, this.radius + 1.4);
      if (hit) this.wallStagger(hit.point);
      else this.blocked = 0;
    }
  }

  private wallStagger(p: THREE.Vector3) {
    this.charging = false;
    this.blocked = 0;
    this.wallPoint.copy(p);
    this.svc.trail(this, false);
    const self = this.capCriticalDamage(Math.round(this.hpMax * 0.06));
    this.hp = Math.max(1, this.hp - self);
    this.posture = this.postureMax;
    this.startMove(MOVES.od_stunned, { fade: 0.03 });
    this.svc.sfx('hit_heavy', { pos: p, rate: 0.7 });
    this.svc.sfx('posture_break', { pos: this.pos });
    this.svc.sfx('collapse_rumble', { pos: p, volume: 0.6 });
    this.svc.shake(0.7);
    this.svc.fx('dust', p, { count: 90, speed: 5 });
    this.svc.fx('rubble', p, { count: 40 });
    this.svc.fx('sparks', p, { count: 30 });
    this.svc.hint('armyRamWall');
    this.onEvent('wallHit', this);
  }
}

registerBoss({ id: 'oderic', def: ODERIC, phases: [0.5], transitions: ['od_roar'], looks: ['oderic', 'oderic2'], weaponR: 'oderic_ram', cls: OdericBoss });

// ====================================================================== Marshal Ysolde Varr

registerMoves({
  varr_thrust: M({ id: 'varr_thrust', clip: 'varrThrust', dur: 1.5, hits: [W(0.66, 0.8, 240, 50, { kind: 'thrust', knock: 2.5 })], motion: [[0.6, -0.1], [0.78, 1.0]], track: [0.62, 4.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.64, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.64, 0.82)] }),
  varr_sweep: M({ id: 'varr_sweep', clip: 'varrSweep', dur: 1.7, hits: [W(0.78, 0.98, 250, 55, { knock: 3 })], motion: [[0.72, 0], [0.95, 0.6]], track: [0.72, 3.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.76, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.76, 1.0)] }),
  varr_hook: M({ id: 'varr_hook', clip: 'varrHook', dur: 1.25, hits: [W(0.28, 0.42, 200, 45)], motion: [[0.25, 0], [0.42, -0.3]], track: [0.26, 3], events: [{ t: 0.26, e: { type: 'sfx', cue: 'swing_light' } }, ...tr(0.26, 0.44)] }),
  varr_chop: M({ id: 'varr_chop', clip: 'varrChop', dur: 2.0, hits: [W(1.02, 1.18, 300, 80, { kind: 'strike', knock: 4 })], motion: [[0.95, 0], [1.15, 0.7]], track: [0.95, 3], hyper: [0.35, 1.18, 70], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_grunt' } }, { t: 1.0, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 1.16, e: { type: 'shake', amount: 0.35 } }, ...tr(1.0, 1.2)] }),
  varr_volley: M({ id: 'varr_volley', clip: 'varrVolley', dur: 2.4, events: [{ t: 0.2, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 1.0, e: { type: 'custom', id: 'volley' } }, { t: 1.05, e: { type: 'sfx', cue: 'great_bell_toll', volume: 0.45 } }] }),
  varr_backstep: M({ id: 'varr_backstep', clip: 'cmdBackstep', dur: 0.6, motion: [[0.4, -2.6]], iframes: [0.05, 0.3] }),
  varr_fury: M({
    id: 'varr_fury', clip: 'varrFury', dur: 3.7,
    hits: [W(0.42, 0.56, 200, 40, { group: 0 }), W(0.84, 0.98, 200, 40, { group: 1 }), W(1.24, 1.36, 230, 50, { kind: 'thrust', group: 2 }), W(2.44, 2.58, 300, 90, { kind: 'strike', knock: 5, group: 3 })],
    motion: [[0.36, 0], [0.56, 0.7], [0.76, 0.7], [0.97, 1.2], [1.18, 1.1], [1.3, 2.2], [2.42, 2.2], [2.55, 2.8]], track: [2.3, 3],
    events: [{ t: 0.05, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 0.4, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.82, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 1.22, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 1.5, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 2.42, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 2.55, e: { type: 'shake', amount: 0.45 } }, ...tr(0.4, 1.38), ...tr(2.42, 2.6)],
  }),
  varr_lunge: M({ id: 'varr_lunge', clip: 'varrLunge', dur: 1.9, hits: [W(0.9, 1.02, 260, 60, { kind: 'thrust', knock: 4 })], motion: [[0.8, 0], [1.0, 4.6], [1.2, 4.9]], track: [0.8, 5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.86, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.86, 1.04)] }),
  varr_burning: M({ id: 'varr_burning', clip: 'varrSweep', dur: 1.7, hits: [W(0.78, 0.98, 250, 55, { kind: 'fire', knock: 3 })], motion: [[0.72, 0], [0.95, 0.6]], track: [0.72, 3.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.3, e: { type: 'custom', id: 'ignite' } }, { t: 0.75, e: { type: 'sfx', cue: 'cast_cinder' } }, { t: 0.9, e: { type: 'custom', id: 'fireTrail' } }, ...tr(0.76, 1.0)] }),
  varr_transition: M({ id: 'varr_transition', clip: 'varrTransition', dur: 3.4, iframes: [0, 3.2], noFlinch: true, events: [{ t: 0.3, e: { type: 'sfx', cue: 'posture_break' } }, { t: 1.2, e: { type: 'sfx', cue: 'great_bell_toll' } }, { t: 1.3, e: { type: 'custom', id: 'phase' } }, { t: 1.3, e: { type: 'custom', id: 'banner' } }, { t: 2.7, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 2.8, e: { type: 'shake', amount: 0.4 } }] }),
  varr_death: M({ id: 'varr_death', clip: 'varrDeath', dur: 3.2 }),
});

export const VARR: EnemyDef = {
  kind: 'varr', name: 'Marshal Ysolde Varr', look: 'varr', props: { height: 1.06, bulk: 1.02, shoulder: 1.02 }, radius: 0.55, height: 1.95,
  hp: 3400, poise: 75, postureMax: 560, postureRegen: 34, defense: 80, absorb: { physical: 0.25, magic: 0.12, fire: 0.12 }, hours: 9000,
  walk: 1.9, run: 4.4, sight: 40, weaponR: 'varr_halberd', stance: { handR: VARR_REST, handL: VARR_REST_L, chest: [2, -8, 0] },
  attacks: [
    { move: 'varr_thrust', range: [1.8, 4.8], weight: 3, cooldown: 2.5 },
    { move: 'varr_sweep', range: [0, 4.0], weight: 3.5, follow: [['varr_hook', 0.45]] },
    { move: 'varr_chop', range: [0, 3.8], weight: 2, cooldown: 5 },
    { move: 'varr_volley', range: [3, 24], weight: 2.5, cooldown: 14 },
    { move: 'varr_backstep', range: [0, 1.6], weight: 1, cooldown: 5 },
    { move: 'varr_fury', range: [0, 3.8], weight: 3.5, cooldown: 8, phase: 2 },
    { move: 'varr_lunge', range: [4, 9], angle: 0.4, weight: 3, cooldown: 5, phase: 2 },
    { move: 'varr_burning', range: [0, 4.0], weight: 2.5, cooldown: 6, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'varr_death' },
  backstabbable: false, criticalable: true, recover: [0.7, 1.3], aggression: 0.72, boss: true,
};

registerBoss({ id: 'varr', def: VARR, phases: [0.55], transitions: ['varr_transition'], looks: ['varr', 'varr2'], weaponR: 'varr_halberd', memory: 'memory_varr' });
