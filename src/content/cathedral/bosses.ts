/**
 * Cathedral bosses.
 *
 * THE PROCESSION (mid-boss, group): a giant reliquary-bearer with a processional pole; two bearers
 * and a cantor walk with it (spawned by the region at the veil). While the cantor sings, the
 * reliquary on the bearer's back pulses: it heals the bearer and the bearers and restores their
 * posture. Break the cantor first. Phase 2 (50 %): the reliquary opens and the bearer MARCHES — a
 * long, unparryable, straight-line charge that knocks down.
 *
 * SAINT VESSALINE OF THE HUNDRED NAMES (keeper): she borrows the techniques of absorbed worshippers.
 * Her moveset swaps between styles, each announced by a name-callout subtitle and a change of
 * face-veil: her own crozier forms; a pilgrim's flurry; a flagellant's frenzy (she scourges
 * herself, then hits harder); a mourner giant's grasp (grab: hand icon); Ser Corvane's Measure (his
 * timings, her crozier); and — only if Wenna Hale was absorbed — Wenna's hymn (homing name-motes).
 * Phase 1 (100 %→55 %): own, pilgrim, mourner. Phase 2: all borrowed styles, shorter recoveries.
 */
import * as THREE from 'three';
import type { EnemyDef, EnemyAttack } from '../../actors/Enemy';
import type { HitSpec, MoveDef } from '../../combat/types';
import type { HitResult, DamagePacket } from '../../combat/Combat';
import type { MoveInstance, Actor } from '../../actors/Actor';
import type { Services } from '../../game/services';
import { registerMoves, MOVES } from '../../combat/moves';
import { Boss, registerBoss, type BossSpec } from '../bosses';
import { PRC_POLE, VES_CROZIER } from './clips';
import { VEIL_IDS, type VeilId } from './models';

const M = (d: MoveDef) => d;
const tr = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];
const W = (start: number, end: number, dmg: number, poise: number, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'weaponR', dmg, posture: 0, poise, kind: 'slash', knock: 2, ...x });
const SPH = (start: number, end: number, bone: NonNullable<HitSpec['sphere']>['bone'], offset: [number, number, number], radius: number, dmg: number, poise: number, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'sphere', sphere: { bone, offset, radius }, dmg, posture: 0, poise, kind: 'strike', knock: 4, ...x });
type Cue = 'enemy_windup' | 'enemy_grunt' | 'swing_light' | 'swing_heavy' | 'swing_huge' | 'unparryable_tell' | 'great_bell_toll' | 'boss_roar' | 'ward_up' | 'spell_heal' | 'cast_shard';
const sfx = (t: number, cue: Cue, volume?: number) => ({ t, e: { type: 'sfx' as const, cue, volume } });
const custom = (t: number, id: string) => ({ t, e: { type: 'custom' as const, id } });
const shake = (t: number, amount: number) => ({ t, e: { type: 'shake' as const, amount } });

// ====================================================================== moves

registerMoves({
  // ---- The Procession
  cath_prc_sweep: M({ id: 'cath_prc_sweep', clip: 'cathPrcSweep', dur: 1.9, hits: [W(0.8, 0.98, 230, 60, { kind: 'strike', knock: 3 })], motion: [[0.75, 0], [0.96, 0.6]], track: [0.76, 3.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.78, 'swing_huge'), ...tr(0.78, 1.0)] }),
  cath_prc_thrust: M({ id: 'cath_prc_thrust', clip: 'cathPrcThrust', dur: 1.8, hits: [W(0.84, 0.94, 240, 55, { kind: 'thrust', knock: 3 })], motion: [[0.78, -0.2], [0.92, 1.6]], track: [0.8, 4.5], events: [sfx(0.1, 'enemy_windup'), sfx(0.82, 'swing_heavy'), ...tr(0.82, 0.96)] }),
  cath_prc_slam: M({
    id: 'cath_prc_slam', clip: 'cathPrcSlam', dur: 2.3,
    hits: [W(1.1, 1.2, 270, 80, { kind: 'strike', knock: 4 }), SPH(1.18, 1.28, 'root', [0, 0.4, 1.9], 2.8, 160, 80, { unparryable: true, knock: 6, group: 5 })],
    motion: [[1.0, 0], [1.18, 0.6]], track: [0.95, 3], hyper: [0.5, 1.2, 80],
    events: [sfx(0.12, 'enemy_grunt'), sfx(1.08, 'swing_huge'), sfx(1.18, 'great_bell_toll', 0.5), shake(1.18, 0.5), custom(1.18, 'shockwave'), ...tr(1.08, 1.22)],
  }),
  /** The March (phase 2): 1.0 s tell with the pole raised as a standard, then 10 m of unstoppable procession. */
  cath_prc_march: M({
    id: 'cath_prc_march', clip: 'cathPrcMarch', dur: 3.7, tell: 'unparryable',
    hits: [SPH(1.1, 2.6, 'chest', [0, -0.1, 0.7], 1.15, 220, 100, { unparryable: true, knock: 8 })],
    motion: [[1.0, 0], [2.6, 10]], track: [1.08, 1.5], hyper: [0.4, 2.7, 200],
    events: [sfx(0.1, 'unparryable_tell'), sfx(0.3, 'great_bell_toll', 0.6), sfx(0.95, 'boss_roar'), shake(1.1, 0.3)],
  }),
  cath_prc_transition: M({ id: 'cath_prc_transition', clip: 'cathPrcTransition', dur: 2.6, iframes: [0, 2.4], noFlinch: true, events: [sfx(0.8, 'great_bell_toll'), custom(1.5, 'phase2'), shake(1.5, 0.4)] }),
  cath_prc_death: M({ id: 'cath_prc_death', clip: 'cathPrcDeath', dur: 2.6 }),

  // ---- Saint Vessaline: her own forms
  cath_ves_sweep: M({ id: 'cath_ves_sweep', clip: 'cathVesSweep', dur: 1.5, hits: [W(0.63, 0.82, 220, 50, { kind: 'strike', knock: 3 })], motion: [[0.58, 0], [0.8, 0.6]], track: [0.6, 4], events: [sfx(0.08, 'enemy_windup'), sfx(0.62, 'swing_heavy'), ...tr(0.62, 0.84)] }),
  cath_ves_thrust: M({ id: 'cath_ves_thrust', clip: 'cathVesThrust', dur: 1.5, hits: [W(0.68, 0.8, 230, 50, { kind: 'thrust', knock: 3 })], motion: [[0.6, -0.1], [0.78, 1.6]], track: [0.64, 5], events: [sfx(0.08, 'enemy_windup'), sfx(0.66, 'swing_heavy'), ...tr(0.66, 0.82)] }),
  cath_ves_toll: M({ id: 'cath_ves_toll', clip: 'cathVesToll', dur: 2.0, tell: 'unparryable', hits: [SPH(1.05, 1.15, 'root', [0, 0.6, 0.3], 3.4, 180, 90, { kind: 'magic', unparryable: true, knock: 7 })], track: [0.9, 3], hyper: [0.4, 1.1, 60], events: [sfx(0.1, 'unparryable_tell'), sfx(1.04, 'great_bell_toll', 0.7), shake(1.05, 0.4), custom(1.05, 'ring')] }),
  cath_ves_swap: M({ id: 'cath_ves_swap', clip: 'cathVesSwap', dur: 1.3, noFlinch: true, events: [sfx(0.3, 'ward_up'), custom(0.55, 'veil')] }),
  // ---- borrowed
  cath_ves_flurry: M({
    id: 'cath_ves_flurry', clip: 'cathVesFlurry', dur: 2.35,
    hits: [W(0.52, 0.62, 150, 30, { group: 0 }), W(0.82, 0.9, 140, 30, { group: 1 }), W(1.1, 1.16, 150, 30, { kind: 'thrust', group: 2 }), W(1.46, 1.54, 200, 70, { kind: 'strike', knock: 4, group: 3 })],
    motion: [[0.5, 0], [0.64, 0.5], [0.8, 0.5], [0.9, 0.9], [1.04, 0.8], [1.13, 1.6], [1.43, 1.6], [1.52, 2.0]], track: [1.36, 4],
    events: [sfx(0.1, 'enemy_windup'), sfx(0.5, 'swing_light'), sfx(0.8, 'swing_light'), sfx(1.08, 'swing_light'), sfx(1.44, 'swing_heavy'), ...tr(0.5, 1.56)],
  }),
  cath_ves_scourge: M({ id: 'cath_ves_scourge', clip: 'cathVesScourge', dur: 1.25, events: [sfx(0.45, 'swing_light'), custom(0.5, 'scourge'), sfx(0.85, 'boss_roar', 0.5)] }),
  cath_ves_frenzy: M({
    id: 'cath_ves_frenzy', clip: 'cathVesFrenzy', dur: 1.85,
    hits: [W(0.52, 0.62, 140, 30, { group: 0 }), W(0.78, 0.88, 140, 30, { group: 1 }), W(1.1, 1.2, 170, 45, { knock: 3, group: 2 })],
    motion: [[0.5, 0], [0.62, 0.5], [0.78, 0.5], [0.88, 0.9], [1.1, 1.3]], track: [1.0, 4],
    events: [sfx(0.08, 'enemy_windup'), sfx(0.5, 'swing_light'), sfx(0.76, 'swing_light'), sfx(1.08, 'swing_heavy'), ...tr(0.5, 1.22)],
  }),
  cath_ves_grasp: M({ id: 'cath_ves_grasp', clip: 'cathVesGrasp', dur: 2.0, tell: 'grab', hits: [SPH(0.96, 1.1, 'handL', [0, -0.05, 0.25], 0.95, 40, 0, { unblockable: true, unparryable: true, knock: 0 })], motion: [[0.9, -0.2], [1.04, 1.3]], track: [0.94, 3.5], events: [sfx(0.1, 'enemy_grunt'), custom(0.2, 'handOn'), sfx(0.95, 'swing_heavy'), custom(1.9, 'handOff')] }),
  cath_ves_crush: M({ id: 'cath_ves_crush', clip: 'cathVesCrush', dur: 2.0, noFlinch: true, hyper: [0, 2.0, 200], events: [custom(0.0, 'handOn'), sfx(0.1, 'boss_roar', 0.5), sfx(1.15, 'swing_huge'), custom(1.2, 'crushRelease'), shake(1.22, 0.4), custom(1.9, 'handOff')] }),
  cath_ves_measure: M({
    id: 'cath_ves_measure', clip: 'cathVesMeasure', dur: 4.1,
    hits: [W(0.43, 0.57, 200, 40, { group: 0 }), W(0.84, 0.98, 200, 40, { group: 1 }), W(1.26, 1.36, 230, 50, { kind: 'thrust', group: 2 }), W(2.52, 2.66, 290, 90, { kind: 'strike', knock: 5, group: 3 })],
    motion: [[0.36, 0], [0.56, 0.7], [0.76, 0.7], [0.97, 1.3], [1.2, 1.2], [1.32, 2.6], [2.5, 2.6], [2.62, 3.2]], track: [2.46, 3],
    events: [custom(0.05, 'measure'), sfx(0.4, 'swing_heavy'), sfx(0.82, 'swing_heavy'), sfx(1.24, 'swing_heavy'), sfx(1.5, 'enemy_windup'), sfx(2.5, 'swing_huge'), shake(2.63, 0.45), ...tr(0.4, 1.38), ...tr(2.5, 2.68)],
  }),
  cath_ves_hymn: M({ id: 'cath_ves_hymn', clip: 'cathVesHymn', dur: 1.5, track: [0.85, 5], events: [sfx(0.2, 'enemy_windup'), sfx(0.8, 'cast_shard'), custom(0.85, 'hymn')] }),
  cath_ves_transition: M({ id: 'cath_ves_transition', clip: 'cathVesTransition', dur: 2.8, iframes: [0, 2.6], noFlinch: true, events: [sfx(0.4, 'great_bell_toll'), custom(1.2, 'phase2'), shake(1.2, 0.5)] }),
  cath_ves_death: M({ id: 'cath_ves_death', clip: 'cathVesDeath', dur: 2.8 }),
});

// ====================================================================== shared boss base

/** Boss with a hook for hits it lands (grabs, knockdowns are resolved by the region). */
export class CathBoss extends Boss {
  onDealt: (r: HitResult, b: CathBoss) => void = () => {};
  override onDealtHit(r: HitResult) { this.onDealt(r, this); }
}

// ====================================================================== The Procession

export const PROCESSION_DEF: EnemyDef = {
  kind: 'cath_procession', name: 'The Procession', look: 'cath_procession', props: { height: 1.35, bulk: 1.4, shoulder: 1.25 },
  radius: 0.68, height: 2.45, hp: 2600, poise: 80, postureMax: 520, postureRegen: 36, defense: 70,
  absorb: { physical: 0.2, magic: 0.1, fire: 0.05 }, hours: 4500, walk: 1.4, run: 3.2, sight: 40,
  weaponR: 'cath_procession_pole', stance: { handR: PRC_POLE, handL: null, chest: [12, -4, 0], spine: [6, 0, 0], head: [-6, 0, 0] },
  attacks: [
    { move: 'cath_prc_sweep', range: [0, 4.2], weight: 4 },
    { move: 'cath_prc_thrust', range: [2.6, 7], weight: 3, cooldown: 3 },
    { move: 'cath_prc_slam', range: [0, 3.6], weight: 2.5, cooldown: 6 },
    { move: 'cath_prc_march', range: [4.5, 18], angle: 0.5, weight: 3, cooldown: 8, phase: 2 },
  ],
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'cath_prc_death' },
  backstabbable: false, criticalable: true, recover: [0.9, 1.6], aggression: 0.62, boss: true,
};

export class ProcessionBoss extends CathBoss {}

registerBoss({
  id: 'procession', def: PROCESSION_DEF, phases: [0.5], transitions: ['cath_prc_transition'],
  looks: ['cath_procession', 'cath_procession2'], weaponR: 'cath_procession_pole', cls: ProcessionBoss,
});

// ====================================================================== Saint Vessaline

const OWN: EnemyAttack[] = [
  { move: 'cath_ves_sweep', range: [0, 3.6], weight: 4 },
  { move: 'cath_ves_thrust', range: [2.2, 5.6], weight: 3, cooldown: 3 },
  { move: 'cath_ves_toll', range: [0, 3.2], weight: 1.5, cooldown: 8 },
];
const STYLE_ATTACKS: Record<VeilId, EnemyAttack[]> = {
  own: OWN,
  pilgrim: [{ move: 'cath_ves_flurry', range: [0, 3.4], weight: 5, cooldown: 4 }, { move: 'cath_ves_thrust', range: [2.2, 5.6], weight: 2, cooldown: 3 }, { move: 'cath_ves_sweep', range: [0, 3.6], weight: 1.5 }],
  flagellant: [{ move: 'cath_ves_scourge', range: [0, 9], angle: 3.2, weight: 3, cooldown: 14 }, { move: 'cath_ves_frenzy', range: [0, 3.3], weight: 5, cooldown: 2 }, { move: 'cath_ves_sweep', range: [0, 3.6], weight: 1 }],
  mourner: [{ move: 'cath_ves_grasp', range: [0.5, 3.8], weight: 4, cooldown: 5 }, { move: 'cath_ves_toll', range: [0, 3.2], weight: 2, cooldown: 7 }, { move: 'cath_ves_sweep', range: [0, 3.6], weight: 2 }],
  measure: [{ move: 'cath_ves_measure', range: [0, 3.4], weight: 5, cooldown: 7 }, { move: 'cath_ves_thrust', range: [2.2, 5.6], weight: 2, cooldown: 3 }, { move: 'cath_ves_sweep', range: [0, 3.6], weight: 2 }],
  hymn: [{ move: 'cath_ves_hymn', range: [3, 18], angle: 0.8, weight: 4, cooldown: 3.5 }, { move: 'cath_ves_sweep', range: [0, 3.6], weight: 3 }, { move: 'cath_ves_thrust', range: [2.2, 5.6], weight: 2, cooldown: 3 }],
};

/** The name callouts (subtitles) for each borrowed style. */
export const STYLE_CALLOUTS: Record<VeilId, string> = {
  own: '— My own hands, then. —',
  pilgrim: '— The flurry of Ada Wren, who climbed the Stair nine times. —',
  flagellant: '— The frenzy of Brother Tobias, who bled for every sin but his own. —',
  mourner: '— The grasp of Orla the Mourner, who carried the coffins no one claimed. —',
  measure: '— The Measure of Ser Corvane Aldmoor. You forgot him the moment he fell. I did not. —',
  hymn: '— The hymn of Wenna Hale, who led the road north. —',
};

export const VESSALINE_DEF: EnemyDef = {
  kind: 'vessaline', name: 'Saint Vessaline of the Hundred Names', look: 'vessaline', props: { height: 1.08, bulk: 0.85, shoulder: 0.9 },
  radius: 0.45, height: 1.95, hp: 3400, poise: 60, postureMax: 540, postureRegen: 38, defense: 65,
  absorb: { physical: 0.12, magic: 0.2, fire: 0.08 }, hours: 9000, walk: 1.8, run: 4.4, sight: 40,
  weaponR: 'crozier_of_names', stance: { handR: VES_CROZIER, handL: null, chest: [-3, 0, 0], head: [6, 0, 0] },
  attacks: OWN,
  reactions: { light: 'boss_flinch', heavy: 'boss_flinch', death: 'cath_ves_death' },
  backstabbable: false, criticalable: true, recover: [0.8, 1.4], aggression: 0.66, boss: true,
};

export class VessalineBoss extends CathBoss {
  style: VeilId = 'own';
  private pending: VeilId | null = null;
  private styleT = 9;
  private order = 0;
  frenzyT = 0;
  /** Wenna Hale was absorbed: the hymn is one of her styles. */
  hymn = false;
  private readonly defs = {} as Record<VeilId, EnemyDef>;

  constructor(spec: BossSpec, svc: Services, seed = 3) {
    super(spec, svc, seed);
    for (const id of VEIL_IDS) this.defs[id] = { ...spec.def, attacks: STYLE_ATTACKS[id] };
  }

  /** Styles available in the current phase, in the order she cycles them. */
  private cycle(): VeilId[] {
    if (this.phase <= 1) return ['pilgrim', 'own', 'mourner', 'own'];
    const c: VeilId[] = ['flagellant', 'measure', 'mourner', 'pilgrim'];
    if (this.hymn) c.splice(2, 0, 'hymn');
    return c;
  }

  override think(dt: number, player: Actor) {
    if (this.engaged && !this.dead) {
      this.styleT -= dt;
      if (this.frenzyT > 0) { this.frenzyT -= dt; this.model?.setStatusGlow('buff', Math.min(1, this.frenzyT)); if (this.frenzyT <= 0) this.model?.setStatusGlow('none', 0); }
      if (!this.move && this.styleT <= 0 && this.hp > this.threshold + 1) {
        const c = this.cycle();
        let next = c[this.order++ % c.length];
        if (next === this.style) next = c[this.order++ % c.length];
        this.pending = next;
        this.styleT = this.phase <= 1 ? 13 : 11;
        this.startMove(MOVES.cath_ves_swap);
      }
    }
    super.think(dt, player);
    // phase 2 recovers faster
    if (this.phase > 1 && this.def.recover[0] > 0.6) for (const d of Object.values(this.defs)) d.recover = [0.55, 1.0];
  }

  /** Apply a style immediately (veil, moveset); the region shows the callout. */
  setStyle(id: VeilId) {
    this.style = id;
    this.def = this.defs[id];
    for (const v of VEIL_IDS) { const m = this.rig.bones.head.getObjectByName('vess:veil:' + v); if (m) m.visible = v === id; }
    this.onEvent('style:' + id, this);
  }

  /** Called by the region after a phase look rebuild: next swap comes quickly. */
  afterPhase() {
    this.styleT = 2.5;
    this.order = 0;
    this.setStyle('own');
  }

  override attackPacket(spec: HitSpec): DamagePacket {
    const p = super.attackPacket(spec);
    if (this.frenzyT > 0) { p.physical *= 1.25; p.magic *= 1.25; p.fire *= 1.25; }
    return p;
  }

  protected override onCustom(id: string, m: MoveInstance) {
    switch (id) {
      case 'veil': if (this.pending) { this.setStyle(this.pending); this.pending = null; } break;
      case 'scourge': {
        const cut = Math.round(this.hpMax * 0.025);
        this.hp = Math.max(this.threshold + 1, this.hp - cut);
        this.frenzyT = 12;
        this.svc.fx('goldMotes', this.chest, { count: 40 });
        this.onEvent('scourge', this);
        break;
      }
      case 'hymn': {
        const t = this.target;
        if (!t) break;
        const from = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handL.matrixWorld);
        for (let i = -1; i <= 1; i++) {
          const dir = t.chest.clone().sub(from).normalize();
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.35);
          this.svc.spawnProjectile({
            kind: 'knell', owner: this, pos: from.clone(), vel: dir.multiplyScalar(10), radius: 0.22, life: 3.2,
            packet: { physical: 0, magic: 120, fire: 0 }, posture: 20, poise: 25, damageKind: 'magic',
            homing: { target: t as never, rate: 1.4 },
          });
        }
        this.onEvent('hymn', this);
        break;
      }
      default: super.onCustom(id, m);
    }
  }
}

registerBoss({
  id: 'vessaline', def: VESSALINE_DEF, phases: [0.55], transitions: ['cath_ves_transition'],
  looks: ['vessaline', 'vessaline2'], weaponR: 'crozier_of_names', memory: 'memory_vessaline', cls: VessalineBoss,
});
