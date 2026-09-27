/**
 * Boss definitions. Corvane: phase 1 "The Appointed Commander" (100 %→55 %), phase 2 "The Measure".
 * Every string ends in a readable recovery window; criticals never skip a phase.
 */
import * as THREE from 'three';
import type { EnemyDef } from '../actors/Enemy';
import { Enemy } from '../actors/Enemy';
import type { MoveDef } from '../combat/types';
import type { MoveInstance } from '../actors/Actor';
import { registerMoves, MOVES } from '../combat/moves';
import type { Actor } from '../actors/Actor';
import { registerClips } from '../actors/anim/clips';
import { commanderClips, CMD_SWORD } from '../actors/anim/clips/commander';
import type { Services } from '../game/services';

registerClips(commanderClips);
const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<MoveDef['hits'] extends (infer H)[] | undefined ? H : never> = {}) =>
  ({ start, end, source: 'weaponR' as const, dmg, posture: 0, poise, kind: 'slash' as const, knock: 2, ...extra });

registerMoves({
  cmd_slash: M({ id: 'cmd_slash', clip: 'cmdSlash', dur: 1.3, hits: [W(0.55, 0.7, 260, 45)], motion: [[0.48, 0], [0.68, 0.9]], track: [0.5, 4], events: [{ t: 0.08, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.52, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.52, 0.72)] }),
  cmd_chain: M({ id: 'cmd_chain', clip: 'cmdChain', dur: 1.8, hits: [W(0.51, 0.66, 240, 40, { group: 0 }), W(0.94, 1.1, 250, 40, { group: 1 })], motion: [[0.44, 0], [0.64, 0.8], [0.86, 0.8], [1.08, 1.5]], track: [0.9, 3.5], events: [{ t: 0.08, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.5, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.93, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.5, 1.12)] }),
  cmd_thrust: M({ id: 'cmd_thrust', clip: 'cmdThrust', dur: 1.6, hits: [W(0.7, 0.84, 290, 50, { kind: 'thrust', knock: 3 })], motion: [[0.62, -0.2], [0.8, 2.4]], track: [0.66, 5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.68, e: { type: 'sfx', cue: 'swing_heavy' } }, ...tr(0.68, 0.86)] }),
  cmd_charge: M({ id: 'cmd_charge', clip: 'cmdCharge', dur: 1.6, tell: 'unparryable', hits: [{ start: 0.76, end: 1.02, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.1, 0.25], radius: 0.7 }, dmg: 240, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 7 }], motion: [[0.72, -0.2], [1.02, 4.2]], track: [0.74, 4], hyper: [0.4, 1.05, 80], events: [{ t: 0.1, e: { type: 'sfx', cue: 'boss_roar' } }, { t: 0.95, e: { type: 'shake', amount: 0.3 } }] }),
  cmd_toll: M({ id: 'cmd_toll', clip: 'cmdToll', dur: 2.0, tell: 'unparryable', hits: [W(1.02, 1.1, 200, 50, { unparryable: true }), { start: 1.1, end: 1.2, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 1.4], radius: 2.6 }, dmg: 180, posture: 0, poise: 80, kind: 'strike', unparryable: true, knock: 6, group: 5 }], motion: [[0.9, 0], [1.08, 0.5]], track: [0.95, 3], hyper: [0.5, 1.2, 80], events: [{ t: 0.1, e: { type: 'sfx', cue: 'unparryable_tell' } }, { t: 1.1, e: { type: 'sfx', cue: 'great_bell_toll', volume: 0.6 } }, { t: 1.1, e: { type: 'shake', amount: 0.5 } }, { t: 1.1, e: { type: 'custom', id: 'shockwave' } }] }),
  cmd_backstep: M({ id: 'cmd_backstep', clip: 'cmdBackstep', dur: 0.6, motion: [[0.4, -2.6]] }),
  cmd_transition: M({ id: 'cmd_transition', clip: 'cmdTransition', dur: 2.8, iframes: [0, 2.6], noFlinch: true, events: [{ t: 0.55, e: { type: 'custom', id: 'phase2' } }, { t: 0.6, e: { type: 'sfx', cue: 'great_bell_toll' } }, { t: 2.3, e: { type: 'shake', amount: 0.4 } }] }),
  cmd_measure: M({
    id: 'cmd_measure', clip: 'cmdMeasure', dur: 4.1,
    hits: [W(0.43, 0.57, 240, 40, { group: 0 }), W(0.84, 0.98, 240, 40, { group: 1 }), W(1.26, 1.36, 270, 50, { kind: 'thrust', group: 2 }), W(2.52, 2.66, 340, 90, { kind: 'strike', knock: 5, group: 3 })],
    motion: [[0.36, 0], [0.56, 0.7], [0.76, 0.7], [0.97, 1.3], [1.2, 1.2], [1.32, 2.6], [2.5, 2.6], [2.62, 3.2]], track: [2.46, 3],
    events: [{ t: 0.05, e: { type: 'custom', id: 'measure' } }, { t: 0.4, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 0.82, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 1.24, e: { type: 'sfx', cue: 'swing_heavy' } }, { t: 1.5, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 2.5, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 2.63, e: { type: 'shake', amount: 0.45 } }, ...tr(0.4, 1.38), ...tr(2.5, 2.68)],
  }),
  cmd_firesweep: M({ id: 'cmd_firesweep', clip: 'cmdFireSweep', dur: 1.7, hits: [W(0.8, 1.0, 230, 55, { kind: 'fire' })], motion: [[0.72, 0], [0.98, 0.8]], track: [0.75, 4], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.4, e: { type: 'custom', id: 'ignite' } }, { t: 0.78, e: { type: 'sfx', cue: 'cast_cinder' } }, { t: 0.9, e: { type: 'custom', id: 'fireTrail' } }] }),
  cmd_delayed: M({ id: 'cmd_delayed', clip: 'cmdDelayed', dur: 2.4, hits: [W(1.44, 1.56, 320, 70, { kind: 'strike', knock: 4 })], motion: [[1.3, 0], [1.5, 0.8]], track: [1.36, 4], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_grunt' } }, { t: 1.4, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 1.52, e: { type: 'shake', amount: 0.35 } }, ...tr(1.4, 1.58)] }),
  cmd_death: M({ id: 'cmd_death', clip: 'cmdDeath', dur: 2.6 }),
});

export const CORVANE: EnemyDef = {
  kind: 'commander', name: 'Ser Corvane Aldmoor', look: 'commander', props: { height: 1.12, bulk: 1.25, shoulder: 1.12 },
  radius: 0.6, height: 2.05, hp: 2700, poise: 70, postureMax: 520, postureRegen: 34, defense: 90,
  absorb: { physical: 0.22, magic: 0.1, fire: 0.05 }, hours: 3200, walk: 1.9, run: 4.2, sight: 40,
  weaponR: 'corvane_sword', stance: { handR: CMD_SWORD, handL: null, chest: [4, -8, 0] },
  attacks: [
    { move: 'cmd_slash', range: [0, 3.2], weight: 4, follow: [['cmd_slash', 0.2]] },
    { move: 'cmd_chain', range: [0, 3.4], weight: 3, cooldown: 3 },
    { move: 'cmd_thrust', range: [2.4, 6], weight: 3, cooldown: 4 },
    { move: 'cmd_charge', range: [4, 11], angle: 0.4, weight: 2.5, cooldown: 7 },
    { move: 'cmd_toll', range: [0, 3.5], weight: 1.5, cooldown: 9 },
    { move: 'cmd_backstep', range: [0, 1.4], weight: 1, cooldown: 5 },
    { move: 'cmd_measure', range: [0, 3.2], weight: 3.5, cooldown: 9, phase: 2 },
    { move: 'cmd_firesweep', range: [0, 3.4], weight: 2.5, cooldown: 6, phase: 2 },
    { move: 'cmd_delayed', range: [0, 3.2], weight: 2, cooldown: 7, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'cmd_death' },
  backstabbable: false, criticalable: true,
  recover: [0.6, 1.3], aggression: 0.7, boss: true,
};

registerMoves({ boss_flinch: M({ id: 'boss_flinch', clip: 'hurtLight', dur: 0.35, fade: 0.03 }) });

const PHASE2_AT = 0.55;

/** Boss with phases. Phase transitions can't be skipped by damage or criticals. */
export class Boss extends Enemy {
  onPhase: (phase: number) => void = () => {};
  onMeasure: () => void = () => {};
  onShockwave: (pos: THREE.Vector3) => void = () => {};
  onFireTrail: (from: THREE.Vector3, to: THREE.Vector3) => void = () => {};
  private transitioned = false;
  engaged = false;

  constructor(def: EnemyDef, svc: Services, seed = 3) { super(def, svc, seed); }

  get threshold() { return this.hpMax * PHASE2_AT; }

  capCriticalDamage(dmg: number) { return this.phase === 1 ? Math.min(dmg, Math.max(0, this.hp - this.threshold)) : dmg; }

  override think(dt: number, player: Actor) {
    if (!this.engaged) { this.wish.set(0, 0, 0); return; }
    if (this.phase === 1 && !this.dead && this.hp <= this.threshold && !this.transitioned) {
      this.hp = Math.max(this.hp, this.threshold);
      if (!this.move || !this.move.def.id.startsWith('victim')) { this.transitioned = true; this.startMove(MOVES.cmd_transition); this.svc.trail(this, false); }
    }
    super.think(dt, player);
  }

  /** Clamp damage during phase 1 so the phase can never be skipped. */
  clampPhase() {
    if (this.phase === 1 && this.hp < this.threshold) { this.hp = this.threshold; if (this.dead) this.dead = false; }
  }

  override react(kind: Parameters<Enemy['react']>[0], from: THREE.Vector3) {
    if (kind === 'death' && this.phase === 1) { this.clampPhase(); return; }
    // Bosses flinch only from heavy hits and not during windups (poise already handles most).
    super.react(kind, from);
  }

  protected override onCustom(id: string, m: MoveInstance) {
    switch (id) {
      case 'phase2':
        this.phase = 2;
        this.posture = 0;
        this.poise = 85;
        this.onPhase(2);
        break;
      case 'measure': this.onMeasure(); break;
      case 'shockwave': this.onShockwave(new THREE.Vector3(0, 0, 1.4 * 1.12).applyMatrix4(this.rig.root.matrixWorld)); break;
      case 'ignite': this.svc.fx('embers', new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld), { count: 30 }); break;
      case 'fireTrail': {
        const a = new THREE.Vector3(-1.5, 0, 1.2).applyMatrix4(this.rig.root.matrixWorld), b = new THREE.Vector3(1.5, 0, 1.2).applyMatrix4(this.rig.root.matrixWorld);
        this.onFireTrail(a, b);
        break;
      }
      default: super.onCustom(id, m);
    }
  }

}
