/**
 * Belfry bosses.
 *
 * KING ALDREN — one fight, three reigns (phases [0.66, 0.33]; criticals never skip a phase).
 *  1. The Young Conqueror (100 %→66 %): lance-sword; fast, aggressive, readable spacing.
 *     cut (0.46 s tell) → backhand follow-up · long lunge (0.58 s tell, closes 5 m) · twin thrust ·
 *     side-step rising sweep · couched-lance charge (unparryable, 0.7 s tell, long recovery) · backstep.
 *  2. The Sorcerer-King (66 %→33 %): bell sorcery. The arena rings in segments: planting the lance
 *     telegraphs concentric bands of the Crown floor (1.25 s glow) that then detonate in turn
 *     (A: bands 1+3, B: bands 2+4, A again). Expanding bell-wave (roll through it), three homing
 *     knells, a spinning bell-blade; keeps the cut and the lunge.
 *  3. The Ancient King (33 %→0): huge and slow, sustained by borrowed centuries. Bell maul: crush
 *     (1.0 s tell + ground toll), wide sweep, stomp at his feet, a single ring pulse, and the Drain:
 *     he kneels and the Unlived stream into him, restoring health (never above the phase's start)
 *     unless his posture is pressed during the channel. Heavy posture (a long bar; a long opening).
 *
 * THE CONDEMNED BELLKEEPER (optional, secret; phases [0.5]): chain-bell swing, overhead slam,
 * the burning brand (fire, left hand), a close toll; phase 2 lights the brand and hurries.
 */
import * as THREE from 'three';
import type { EnemyDef } from '../../actors/Enemy';
import type { MoveDef, HitSpec } from '../../combat/types';
import type { MoveInstance, Actor } from '../../actors/Actor';
import type { Combatant, DamagePacket } from '../../combat/Combat';
import { registerMoves, MOVES } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { Boss, registerBoss, type BossSpec } from '../bosses';
import type { Services } from '../../game/services';
import { registerDialogue } from '../dialogue';
import { aldrenClips, bellkeeperClips, ALD_LANCE, ALD_MAUL, BK_CHAIN } from './clips';

registerClips({ ...aldrenClips, ...bellkeeperClips });

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, extra: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 2, ...extra });
const sfx = (t: number, cue: Parameters<Services['sfx']>[0], volume?: number) => ({ t, e: { type: 'sfx' as const, cue, volume } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const shake = (t: number, amount: number) => ({ t, e: { type: 'shake' as const, amount } });

// ================================================================== Aldren moves

registerMoves({
  // ---------------------------------------------------------------- phase 1
  ald_cut: M({ id: 'ald_cut', clip: 'aldCut', dur: 1.25, hits: [W(0.53, 0.66, 250, 50)], motion: [[0.46, 0], [0.64, 1.0]], track: [0.48, 5], events: [sfx(0.06, 'enemy_windup'), sfx(0.5, 'swing_heavy'), ...tr(0.5, 0.68)] }),
  ald_cut2: M({ id: 'ald_cut2', clip: 'aldCut2', dur: 1.2, hits: [W(0.36, 0.5, 240, 50)], motion: [[0.28, 0], [0.48, 0.8]], track: [0.32, 5], events: [sfx(0.34, 'swing_heavy'), ...tr(0.34, 0.52)] }),
  ald_lunge: M({ id: 'ald_lunge', clip: 'aldLunge', dur: 1.7, hits: [W(0.68, 0.84, 300, 60, { kind: 'thrust', knock: 3 })], motion: [[0.56, -0.3], [0.8, 4.8]], track: [0.62, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.86)] }),
  ald_twin: M({ id: 'ald_twin', clip: 'aldTwin', dur: 1.75, hits: [W(0.56, 0.66, 180, 35, { kind: 'thrust', group: 0 }), W(0.9, 1.0, 190, 40, { kind: 'thrust', group: 1 })], motion: [[0.5, -0.1], [0.62, 0.8], [0.84, 0.8], [0.96, 1.7]], track: [0.86, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.55, 'swing_light'), sfx(0.88, 'swing_light'), ...tr(0.54, 1.02)] }),
  ald_rising: M({ id: 'ald_rising', clip: 'aldRising', dur: 1.5, hits: [W(0.64, 0.78, 260, 55, { knock: 3 })], motionSide: [[0.4, 1.1]], motion: [[0.56, 0], [0.74, 0.7]], track: [0.6, 5], events: [sfx(0.1, 'enemy_windup'), sfx(0.62, 'swing_heavy'), ...tr(0.62, 0.8)] }),
  ald_charge: M({
    id: 'ald_charge', clip: 'aldCharge', dur: 2.4, tell: 'unparryable',
    hits: [{ start: 0.86, end: 1.6, source: 'weaponR', dmg: 340, posture: 0, poise: 100, kind: 'thrust', unparryable: true, knock: 7 }],
    motion: [[0.7, -0.3], [1.65, 9.5], [1.9, 10]], track: [1.2, 1.6], hyper: [0.5, 1.65, 90],
    events: [sfx(0.1, 'boss_roar'), sfx(0.8, 'swing_huge'), shake(0.9, 0.2), ...tr(0.84, 1.62)],
  }),
  ald_backstep: M({ id: 'ald_backstep', clip: 'aldBackstep', dur: 0.6, motion: [[0.4, -3.0]], iframes: [0.05, 0.25] }),

  // ---------------------------------------------------------------- transition to phase 2
  ald_trans2: M({ id: 'ald_trans2', clip: 'aldTrans2', dur: 3.0, iframes: [0, 2.9], noFlinch: true, events: [sfx(0.55, 'great_bell_toll'), custom(1.2, 'phase'), custom(1.3, 'ringAll'), shake(1.3, 0.5), sfx(2.4, 'swing_heavy')] }),

  // ---------------------------------------------------------------- phase 2
  ald_plant: M({
    id: 'ald_plant', clip: 'aldPlant', dur: 4.3, tell: 'unparryable', noFlinch: true,
    events: [sfx(0.1, 'unparryable_tell'), sfx(0.88, 'great_bell_toll', 0.5), shake(0.9, 0.3), custom(0.95, 'rings:0,2'), custom(1.95, 'rings:1,3'), custom(2.95, 'rings:0,2')],
  }),
  ald_wave: M({
    id: 'ald_wave', clip: 'aldWave', dur: 2.0, tell: 'unparryable',
    hits: [{ start: 0.95, end: 1.05, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 0.6], radius: 1.8 }, dmg: 200, posture: 0, poise: 70, kind: 'magic', unparryable: true, knock: 6 }],
    track: [0.8, 3], hyper: [0.3, 1.1, 80],
    events: [sfx(0.1, 'unparryable_tell'), sfx(0.95, 'great_bell_toll', 0.6), shake(0.95, 0.45), custom(0.95, 'wave')],
  }),
  ald_knell: M({ id: 'ald_knell', clip: 'aldKnell', dur: 2.1, track: [1.2, 3], events: [sfx(0.1, 'enemy_windup'), custom(0.72, 'knell'), custom(0.97, 'knell'), custom(1.22, 'knell')] }),
  ald_spin: M({
    id: 'ald_spin', clip: 'aldSpin', dur: 2.0,
    hits: [W(0.88, 1.22, 280, 65, { kind: 'magic', knock: 4 })],
    motion: [[0.8, 0], [1.1, 0.8]], track: [0.8, 3.5], hyper: [0.4, 1.2, 60],
    events: [sfx(0.1, 'enemy_windup'), sfx(0.86, 'swing_huge'), ...tr(0.86, 1.25)],
  }),

  // ---------------------------------------------------------------- transition to phase 3
  ald_trans3: M({ id: 'ald_trans3', clip: 'aldTrans3', dur: 3.8, iframes: [0, 3.7], noFlinch: true, events: [custom(0.5, 'drainStart'), sfx(0.6, 'great_bell_toll'), custom(2.3, 'phase'), custom(2.35, 'grow'), custom(2.4, 'drainEnd'), sfx(2.5, 'boss_roar'), shake(2.6, 0.6)] }),

  // ---------------------------------------------------------------- phase 3
  ald_crush: M({
    id: 'ald_crush', clip: 'aldCrush', dur: 2.8, tell: 'unparryable',
    hits: [W(1.12, 1.24, 460, 100, { kind: 'strike', unparryable: true, knock: 5 }),
      { start: 1.24, end: 1.34, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.4, 2.0], radius: 3.0 }, dmg: 300, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 7, group: 5 }],
    motion: [[1.0, 0], [1.2, 0.6]], track: [1.02, 2.5], hyper: [0.3, 1.3, 140],
    events: [sfx(0.1, 'unparryable_tell'), sfx(1.08, 'swing_huge'), sfx(1.22, 'great_bell_toll', 0.7), shake(1.22, 0.7), custom(1.24, 'crushFx')],
  }),
  ald_sweep: M({
    id: 'ald_sweep', clip: 'aldSweep', dur: 2.4,
    hits: [W(0.98, 1.16, 400, 90, { kind: 'strike', knock: 5 })],
    motion: [[0.9, 0], [1.12, 0.8]], track: [0.9, 2.5], hyper: [0.3, 1.2, 140],
    events: [sfx(0.1, 'enemy_windup'), sfx(0.96, 'swing_huge'), ...tr(0.96, 1.18)],
  }),
  ald_stomp: M({
    id: 'ald_stomp', clip: 'aldStomp', dur: 1.6, tell: 'unparryable',
    hits: [{ start: 0.7, end: 0.8, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.3, 0.4], radius: 2.4 }, dmg: 280, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 7 }],
    hyper: [0.2, 0.85, 140],
    events: [sfx(0.1, 'enemy_grunt'), sfx(0.7, 'hit_heavy'), shake(0.7, 0.5), custom(0.7, 'crushFx')],
  }),
  ald_plant3: M({
    id: 'ald_plant3', clip: 'aldPlant', dur: 4.3, tell: 'unparryable', noFlinch: true,
    events: [sfx(0.1, 'unparryable_tell'), sfx(0.88, 'great_bell_toll', 0.6), shake(0.9, 0.4), custom(0.95, 'rings:1,3'), custom(2.4, 'rings:0,2')],
  }),
  ald_drain: M({ id: 'ald_drain', clip: 'aldDrain', dur: 4.2, events: [sfx(0.1, 'great_bell_toll', 0.35), custom(0.7, 'drainStart'), custom(3.3, 'drainEnd')] }),
  ald_death: M({ id: 'ald_death', clip: 'aldDeath', dur: 3.2 }),
});

// ================================================================== Aldren definitions per reign

const ALD_BASE: Omit<EnemyDef, 'attacks' | 'stance' | 'walk' | 'run' | 'recover' | 'aggression' | 'poise' | 'postureMax' | 'postureRegen'> = {
  kind: 'aldren', name: 'King Aldren', look: 'aldren_young', props: { height: 1.08, bulk: 1.1, shoulder: 1.08 },
  radius: 0.55, height: 1.98, hp: 5400, defense: 90,
  absorb: { physical: 0.24, magic: 0.18, fire: 0.12 }, hours: 60000, sight: 50,
  weaponR: 'aldren_lance',
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'ald_death' },
  backstabbable: false, criticalable: true, boss: true,
};

const LANCE_L = null;
const MAUL_LEFT = { ...ALD_MAUL, p: [ALD_MAUL.p[0] - ALD_MAUL.dir[0] * 0.4, ALD_MAUL.p[1] - ALD_MAUL.dir[1] * 0.4, ALD_MAUL.p[2] - ALD_MAUL.dir[2] * 0.4] as [number, number, number], elbow: [0.8, -0.4, -0.4] as [number, number, number], up: undefined };

/** Phase 1 — The Young Conqueror. */
export const ALDREN_YOUNG: EnemyDef = {
  ...ALD_BASE, poise: 70, postureMax: 620, postureRegen: 40, walk: 2.2, run: 5.2,
  stance: { handR: ALD_LANCE, handL: LANCE_L, chest: [4, -10, 0] },
  attacks: [
    { move: 'ald_cut', range: [0, 3.4], weight: 4, follow: [['ald_cut2', 0.55]] },
    { move: 'ald_twin', range: [0.8, 3.8], weight: 3, cooldown: 3 },
    { move: 'ald_lunge', range: [3.2, 9], weight: 3, cooldown: 3.5 },
    { move: 'ald_rising', range: [0, 3.0], weight: 2, cooldown: 4 },
    { move: 'ald_charge', range: [7, 18], angle: 0.35, weight: 2.5, cooldown: 8 },
    { move: 'ald_backstep', range: [0, 1.6], weight: 1.2, cooldown: 5, follow: [['ald_lunge', 0.6]] },
  ],
  recover: [0.55, 1.1], aggression: 0.8,
};

/** Phase 2 — The Sorcerer-King. */
export const ALDREN_SORCERER: EnemyDef = {
  ...ALD_BASE, look: 'aldren_sorcerer', poise: 80, postureMax: 700, postureRegen: 44, walk: 1.8, run: 3.8,
  stance: { handR: ALD_LANCE, handL: LANCE_L, chest: [4, -10, 0] },
  attacks: [
    { move: 'ald_plant', range: [0, 30], angle: 3.2, weight: 2.5, cooldown: 11 },
    { move: 'ald_wave', range: [0, 7], weight: 2, cooldown: 7 },
    { move: 'ald_knell', range: [4, 24], angle: 0.8, weight: 2.5, cooldown: 5 },
    { move: 'ald_spin', range: [0, 3.4], weight: 2.2, cooldown: 4 },
    { move: 'ald_cut', range: [0, 3.2], weight: 2, follow: [['ald_cut2', 0.4]] },
    { move: 'ald_lunge', range: [3.5, 8], weight: 1.5, cooldown: 6 },
  ],
  recover: [0.75, 1.35], aggression: 0.7,
};

/** Phase 3 — The Ancient King. */
export const ALDREN_ANCIENT: EnemyDef = {
  ...ALD_BASE, look: 'aldren_ancient', weaponR: 'aldren_maul', poise: 110, postureMax: 1100, postureRegen: 55, walk: 1.25, run: 2.6,
  stance: { handR: ALD_MAUL, handL: MAUL_LEFT, chest: [12, -6, 0], spine: [8, 0, 0], neck: [6, 0, 0], head: [-6, 0, 0] },
  attacks: [
    { move: 'ald_crush', range: [0, 4.2], weight: 3, cooldown: 4.5 },
    { move: 'ald_sweep', range: [0, 4.6], weight: 3, follow: [['ald_stomp', 0.2]] },
    { move: 'ald_stomp', range: [0, 2.3], weight: 2, cooldown: 4 },
    { move: 'ald_plant3', range: [0, 30], angle: 3.2, weight: 1.2, cooldown: 13 },
    { move: 'ald_drain', range: [0, 30], angle: 3.2, weight: 1.6, cooldown: 15 },
  ],
  recover: [1.2, 2.0], aggression: 0.6,
};

export const ALDREN_PHASES = [ALDREN_YOUNG, ALDREN_SORCERER, ALDREN_ANCIENT];

// ================================================================== Aldren's bespoke mechanics

/** Concentric ring bands of the Crown floor (radii from the arena centre). */
export const RING_BANDS: [number, number][] = [[0, 3.2], [3.2, 6.4], [6.4, 9.7], [9.7, 13.2]];
export const RING_WARN = 1.25;

export interface BandHazard { band: number; t: number; fired: boolean }
export interface WaveHazard { origin: THREE.Vector3; r: number; hit: Set<number>; t: number }

const RING_HIT: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 260, posture: 0, poise: 70, kind: 'magic', unparryable: true, knock: 4 };
const RING_HIT3: HitSpec = { ...RING_HIT, dmg: 320, poise: 90 };
const WAVE_HIT: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 240, posture: 0, poise: 70, kind: 'magic', unparryable: true, knock: 5 };
const HAZARD_MOVE: MoveDef = { id: 'ald_hazard', clip: '', dur: 0 };

export class AldrenBoss extends Boss {
  /** Arena centre (set by the region): ring bands are concentric around it. */
  readonly arenaCenter = new THREE.Vector3();
  readonly bands: BandHazard[] = [];
  readonly waves: WaveHazard[] = [];
  /** The Drain channel (phase 3): health restored while it runs unless posture is pressed. */
  drain = { active: false, t: 0, posture0: 0, healed: 0, broken: false };
  /** Visual scale of the rig (the Ancient King is immense). */
  scale = 1;
  private scaleTarget = 1;
  /** Region hooks for visuals. */
  onRingsLit: (bands: number[]) => void = () => {};
  onRingFired: (band: number) => void = () => {};
  onDrain: (on: boolean, broken: boolean) => void = () => {};
  onCrush: (pos: THREE.Vector3) => void = () => {};

  constructor(spec: BossSpec, svc: Services, seed: number) {
    super(spec, svc, seed);
    this.applyReign();
  }

  /** Swap the AI definition to the current reign (movesets, speeds, posture). */
  private applyReign() {
    const want = ALDREN_PHASES[Math.min(this.phase, 3) - 1];
    if (this.def === want) return;
    this.def = want;
    this.setStance(want.stance);
    this.postureMax = want.postureMax;
    this.postureRegen = want.postureRegen;
    this.poise = want.poise;
  }

  override think(dt: number, player: Actor) {
    this.applyReign();
    this.stepHazards(dt);
    if (Math.abs(this.scale - this.scaleTarget) > 1e-3) {
      this.scale += (this.scaleTarget - this.scale) * Math.min(1, dt * 2.2);
      if (Math.abs(this.scale - this.scaleTarget) < 0.002) this.scale = this.scaleTarget;
      this.object.scale.setScalar(this.scale);
      this.radius = 0.55 * this.scale;
      this.height = 1.98 * this.scale;
    }
    super.think(dt, player);
  }

  override resetAt(pos: THREE.Vector3, yaw: number) {
    super.resetAt(pos, yaw);
    this.bands.length = 0; this.waves.length = 0;
    this.drain.active = false;
  }

  /** Targets for hazards: the player and spirit allies. */
  private victims(): Combatant[] {
    return this.svc.actors().filter((a) => a.team !== 'unlived' && !a.dead) as unknown as Combatant[];
  }

  private hazardHit(tgt: Combatant, spec: HitSpec, point: THREE.Vector3) {
    const packet: DamagePacket = { physical: 0, magic: spec.dmg, fire: 0 };
    this.svc.combat.resolveWith(this as unknown as Combatant, tgt, spec, HAZARD_MOVE, point, packet, 0);
  }

  private stepHazards(dt: number) {
    // ring bands: glow for RING_WARN seconds, then detonate once, then fade
    for (const h of this.bands) {
      h.t += dt;
      if (!h.fired && h.t >= RING_WARN) {
        h.fired = true;
        this.onRingFired(h.band);
        this.svc.sfx('great_bell_toll', { pos: this.arenaCenter, volume: 0.45, rate: 1.2 + h.band * 0.15 });
        this.svc.shake(0.25);
        const [r0, r1] = RING_BANDS[h.band];
        for (const v of this.victims()) {
          const d = Math.hypot(v.pos.x - this.arenaCenter.x, v.pos.z - this.arenaCenter.z);
          if (d >= r0 - 0.25 && d <= r1 + 0.25 && Math.abs(v.pos.y - this.arenaCenter.y) < 2.5) this.hazardHit(v, this.phase >= 3 ? RING_HIT3 : RING_HIT, v.chest);
        }
      }
    }
    for (let i = this.bands.length - 1; i >= 0; i--) if (this.bands[i].t > RING_WARN + 0.8) this.bands.splice(i, 1);
    // expanding waves: a ring 0.9 m thick travelling outward at 9 m/s
    for (const w of this.waves) {
      w.t += dt;
      w.r += 9 * dt;
      for (const v of this.victims()) {
        if (w.hit.has(v.id)) continue;
        const d = Math.hypot(v.pos.x - w.origin.x, v.pos.z - w.origin.z);
        if (d <= w.r + 0.3 && d >= w.r - 0.9 && Math.abs(v.pos.y - w.origin.y) < 2) { w.hit.add(v.id); this.hazardHit(v, WAVE_HIT, v.chest); }
      }
    }
    for (let i = this.waves.length - 1; i >= 0; i--) if (this.waves[i].r > 18) this.waves.splice(i, 1);
    // the Drain
    const dr = this.drain;
    if (dr.active) {
      dr.t += dt;
      const channel = this.move?.def.id === 'ald_drain' || this.move?.def.id === 'ald_trans3';
      if (!channel || this.dead) { this.endDrain(!this.dead && this.move?.def.id !== 'ald_drain'); return; }
      if (this.posture - dr.posture0 > this.postureMax * 0.28) {
        // pressed hard enough: the stream breaks, he reels
        this.endDrain(true);
        this.posture = Math.min(this.postureMax, this.posture + this.postureMax * 0.15);
        this.startMove(MOVES.boss_flinch);
        this.svc.sfx('posture_break', { pos: this.pos });
        return;
      }
      if (this.move?.def.id === 'ald_drain') {
        const cap = this.hpMax * (this.spec.phases[1] ?? 0.33);
        const heal = this.hpMax * 0.012 * dt;
        if (this.hp < cap) { this.hp = Math.min(cap, this.hp + heal); dr.healed += heal; }
      }
    }
  }

  private endDrain(broken: boolean) {
    if (!this.drain.active) return;
    this.drain.active = false;
    this.drain.broken = broken;
    this.onDrain(false, broken);
  }

  protected override onCustom(id: string, m: MoveInstance) {
    if (id.startsWith('rings:')) {
      const list = id.slice(6).split(',').map((s) => parseInt(s, 10)).filter((n) => n >= 0 && n < RING_BANDS.length);
      for (const b of list) this.bands.push({ band: b, t: 0, fired: false });
      this.onRingsLit(list);
      return;
    }
    switch (id) {
      case 'ringAll': this.onRingsLit([0, 1, 2, 3].map((b) => -1 - b)); return; // visual only (negative = harmless flash)
      case 'wave': this.waves.push({ origin: this.pos.clone(), r: 0.6, hit: new Set(), t: 0 }); return;
      case 'knell': {
        const tgt = this.target ?? this.svc.actors().find((a) => a.team === 'player');
        if (!tgt) return;
        const origin = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handL.matrixWorld);
        const dir = tgt.chest.clone().sub(origin).normalize();
        this.svc.spawnProjectile({
          kind: 'knell', owner: this as unknown as Combatant, pos: origin, vel: dir.multiplyScalar(9.5), radius: 0.28, life: 4.5,
          packet: { physical: 0, magic: 170, fire: 0 }, posture: 20, poise: 35, damageKind: 'magic',
          homing: { target: tgt as unknown as Combatant, rate: 1.1 }, unparryable: true,
        });
        this.svc.sfx('cast_shard', { pos: origin, rate: 0.6 });
        return;
      }
      case 'grow': this.scaleTarget = 1.32; return;
      case 'drainStart':
        this.drain = { active: true, t: 0, posture0: this.posture, healed: 0, broken: false };
        this.onDrain(true, false);
        return;
      case 'drainEnd': this.endDrain(false); return;
      case 'crushFx': this.onCrush(new THREE.Vector3(0, 0, 2.0).applyMatrix4(this.rig.root.matrixWorld)); return;
      default:
        super.onCustom(id, m);
        if (id.startsWith('phase')) this.applyReign();
    }
  }
}

// ================================================================== the Condemned Bellkeeper

registerMoves({
  bk_swing: M({ id: 'bk_swing', clip: 'bkSwing', dur: 1.55, hits: [W(0.68, 0.86, 210, 45, { kind: 'strike', knock: 3 })], motion: [[0.6, 0], [0.8, 0.6]], track: [0.62, 4.5], events: [sfx(0.08, 'chain_rattle'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.88)] }),
  bk_slam: M({
    id: 'bk_slam', clip: 'bkSlam', dur: 2.2,
    hits: [W(0.97, 1.09, 250, 60, { kind: 'strike', knock: 3 }), { start: 1.08, end: 1.16, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.3, 1.2], radius: 1.8 }, dmg: 150, posture: 0, poise: 50, kind: 'strike', unparryable: true, knock: 5, group: 5 }],
    motion: [[0.9, 0], [1.05, 0.6]], track: [0.9, 3.5], hyper: [0.4, 1.1, 60],
    events: [sfx(0.08, 'chain_rattle'), sfx(0.95, 'swing_huge'), sfx(1.08, 'great_bell_toll', 0.35), shake(1.08, 0.35)],
  }),
  bk_brand: M({
    id: 'bk_brand', clip: 'bkBrand', dur: 1.7,
    hits: [{ start: 0.74, end: 0.86, source: 'sphere', sphere: { bone: 'handL', offset: [0, -0.1, 0.05], radius: 0.35 }, dmg: 230, posture: 0, poise: 45, kind: 'fire', knock: 3 }],
    motion: [[0.66, -0.2], [0.82, 1.4]], track: [0.7, 5],
    events: [sfx(0.1, 'enemy_windup'), custom(0.2, 'brandGlow'), sfx(0.74, 'fire_burst', 0.6)],
  }),
  bk_toll: M({
    id: 'bk_toll', clip: 'bkToll', dur: 1.8, tell: 'unparryable',
    hits: [{ start: 0.86, end: 0.96, source: 'sphere', sphere: { bone: 'root', offset: [0, 0.8, 0.2], radius: 2.8 }, dmg: 170, posture: 0, poise: 70, kind: 'magic', unparryable: true, knock: 6 }],
    hyper: [0.3, 1.0, 70],
    events: [sfx(0.1, 'unparryable_tell'), sfx(0.86, 'great_bell_toll', 0.6), shake(0.86, 0.35)],
  }),
  bk_trans: M({ id: 'bk_trans', clip: 'bkTrans', dur: 2.4, iframes: [0, 2.3], noFlinch: true, events: [sfx(0.5, 'fire_burst'), custom(0.9, 'phase'), custom(0.95, 'brandGlow'), shake(1.0, 0.3)] }),
});

export const BELLKEEPER: EnemyDef = {
  kind: 'bellkeeper', name: 'The Condemned Bellkeeper', look: 'bellkeeperBoss', props: { height: 1.04, bulk: 1.05, shoulder: 1.02 },
  radius: 0.5, height: 1.9, hp: 3000, poise: 55, postureMax: 480, postureRegen: 34, defense: 76,
  absorb: { physical: 0.18, magic: 0.2, fire: 0.3 }, hours: 18000, walk: 1.6, run: 3.8, sight: 40,
  weaponR: 'condemned_chain', stance: { handR: BK_CHAIN, handL: null, chest: [14, -4, 0], spine: [8, 0, 0], neck: [8, 0, 0], head: [-6, 0, 0] },
  attacks: [
    { move: 'bk_swing', range: [0, 3.4], weight: 4, follow: [['bk_brand', 0.3]] },
    { move: 'bk_slam', range: [0, 3.2], weight: 2.5, cooldown: 4 },
    { move: 'bk_brand', range: [0.8, 3.2], weight: 2, cooldown: 3 },
    { move: 'bk_toll', range: [0, 2.8], weight: 1.5, cooldown: 7 },
    { move: 'bk_brand', range: [0.8, 3.2], weight: 2.5, cooldown: 2, phase: 2 },
    { move: 'bk_toll', range: [0, 3.4], weight: 1.5, cooldown: 5, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch' },
  backstabbable: false, criticalable: true,
  recover: [0.7, 1.4], aggression: 0.65, boss: true,
};

registerBoss({
  id: 'aldren', def: ALDREN_YOUNG, phases: [0.66, 0.33], transitions: ['ald_trans2', 'ald_trans3'],
  looks: ['aldren_young', 'aldren_sorcerer', 'aldren_ancient'], weaponR: 'aldren_lance', memory: 'memory_aldren', cls: AldrenBoss,
});
registerBoss({
  id: 'bellkeeper', def: BELLKEEPER, phases: [0.5], transitions: ['bk_trans'],
  looks: ['bellkeeperBoss'], weaponR: 'condemned_chain', memory: 'memory_bellkeeper',
});

// ================================================================== convictions (boss lines)

const ALDREN = 'King Aldren';
const KEEPER = 'The Condemned Bellkeeper';
registerDialogue({
  aldren_intro: [
    { speaker: ALDREN, text: 'You climbed my record. Then you know what each ringing cost, and what each one bought.', duration: 5 },
    { speaker: ALDREN, text: 'Every life I spent went to a better kingdom. I will not apologise to the dead for their children.', duration: 5.5 },
  ],
  aldren_intro_record: [
    { speaker: ALDREN, text: 'You laid the Council on my throne. Seven clerks and a century of quiet. Is that what you would have kept?', duration: 5.5 },
    { speaker: ALDREN, text: 'Every life I spent went to a better kingdom. I will not apologise to the dead for their children.', duration: 5.5 },
  ],
  aldren_phase2: [
    { speaker: ALDREN, text: 'I was twenty when I first rang them. I learned to listen. Every future has a note, retainer. Hear yours.', duration: 5.5 },
  ],
  aldren_phase3: [
    { speaker: ALDREN, text: 'Come, all of you. You were never lost. You were lent. I am calling in the debt.', duration: 5 },
    { speaker: ALDREN, text: 'Forty-one kingdoms rest on these shoulders. What rests on yours?', duration: 4.5 },
  ],
  aldren_death: [
    { speaker: ALDREN, text: 'So. A hand steadier than mine.', duration: 4 },
    { speaker: ALDREN, text: 'The Bell is lowered. The Covenant waits for whoever holds it. Choose better than I did, if you can.', duration: 6 },
  ],
  bellkeeper_intro: [
    { speaker: KEEPER, text: 'Another one, climbing down to me. They always come back to see who burned them.', duration: 5 },
    { speaker: KEEPER, text: 'I would not ring. So I was made to mark the ones who would remember. Show me you still do.', duration: 5.5 },
  ],
  bellkeeper_phase2: [
    { speaker: KEEPER, text: 'Every one of them forgot. Every one. Hold still, and I will press harder this time.', duration: 5 },
  ],
  bellkeeper_death: [
    { speaker: KEEPER, text: 'You… remember the stair. The smoke. My hand.', duration: 4 },
    { speaker: KEEPER, text: 'Then it held. Take the book. Someone must.', duration: 4 },
  ],
});
