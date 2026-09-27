/**
 * Data-driven Unlived enemy: perception, approach/strafe/retreat, weighted attack selection with
 * cooldowns and combos, guarding, leashing, reactions, criticals-as-victim, death & rewards.
 */
import * as THREE from 'three';
import { Actor, type MoveInstance, type Team } from './Actor';
import type { Combatant, DamagePacket, HitResult } from '../combat/Combat';
import type { HitSpec, MoveDef, MoveEvent } from '../combat/types';
import { MOVES } from '../combat/moves';
import { applyDefense } from '../combat/stats';
import type { Services } from '../game/services';
import type { Stance } from './anim/locomotion';
import type { RigProportions } from './rigDefs';
import type { EnemyLook } from './models/contract';
import type { EnemyKind } from '../world/levelTypes';
import { angleDiff, approachAngle, yawOf } from '../core/math';
import { Rng } from '../core/rng';
import { CLIPS } from './anim/clips';

export interface EnemyAttack {
  move: string;
  /** Distance band (metres, centre to centre) in which this attack is chosen. */
  range: [number, number];
  /** Max |angle| to target (radians) to start it. */
  angle?: number;
  weight: number;
  cooldown?: number;
  /** Follow-up chances: [moveId, probability]. */
  follow?: [string, number][];
  /** Boss phase restriction. */
  phase?: number;
}

export interface EnemyDef {
  kind: EnemyKind | string;
  name: string;
  look: EnemyLook;
  props: RigProportions;
  radius: number;
  height: number;
  hp: number;
  poise: number;
  postureMax: number;
  postureRegen: number;
  defense: number;
  absorb: { physical: number; magic: number; fire: number };
  hours: number;
  walk: number; run: number;
  sight: number;
  weaponR?: string; weaponL?: string; shield?: string;
  stance: Stance;
  attacks: EnemyAttack[];
  /** Move ids used for reactions (defaults to the shared humanoid ones). */
  reactions?: Partial<Record<'light' | 'heavy' | 'guardHit' | 'guardBreak' | 'parried' | 'postureBreak' | 'death', string>>;
  guard?: { physical: number; magic: number; stability: number; stamina: number; chance: number };
  /** Ranged units keep this distance band. */
  keepDistance?: [number, number];
  backstabbable?: boolean;
  criticalable?: boolean;
  /** Seconds of pause after an attack chain (player's window). */
  recover: [number, number];
  aggression: number; // 0..1 how eagerly it attacks when in range
  boss?: boolean;
  /** Never moves or attacks; refills health (practice dummies). */
  passive?: boolean;
}

type AiState = 'idle' | 'patrol' | 'alert' | 'engage' | 'return';

export class Enemy extends Actor implements Combatant {
  readonly team: Team = 'unlived';
  ai: AiState = 'idle';
  target: Actor | null = null;
  readonly home = new THREE.Vector3();
  homeYaw = 0;
  leash = 18;
  patrol: THREE.Vector3[] | null = null;
  private patrolI = 0;
  private attackCd = 0;
  private readonly cds = new Map<string, number>();
  private strafeDir = 1;
  private strafeT = 0;
  private recoverT = 0;
  private pendingFollow: string | null = null;
  protected rng: Rng;
  idleAnim: 'stand' | 'sentryWall' | 'sit' | 'kneel' = 'stand';
  spawnId = '';
  /** Called when this enemy dies (rewards, persistence). */
  onKilled: (e: Enemy) => void = () => {};
  deathT = -1;
  phase = 1;

  constructor(public def: EnemyDef, protected svc: Services, seed = 1) {
    super(def.props);
    this.rng = new Rng(seed);
    this.name = def.name;
    this.radius = def.radius; this.height = def.height;
    this.hpMax = this.hp = def.hp;
    this.poise = def.poise;
    this.postureMax = def.postureMax; this.postureRegen = def.postureRegen;
    this.staminaMax = this.stamina = def.guard?.stamina ?? 100;
    this.staminaRegen = 30;
    this.backstabbable = def.backstabbable ?? true;
    this.criticalable = def.criticalable ?? true;
    this.aware = false;
    this.setStance(def.stance);
  }

  get isBoss() { return !!this.def.boss; }

  resetAt(pos: THREE.Vector3, yaw: number) {
    this.dead = false; this.deathT = -1;
    this.hp = this.hpMax; this.posture = 0; this.stamina = this.staminaMax;
    this.move = null; this.anim.stop(0);
    this.ai = this.patrol ? 'patrol' : 'idle';
    this.target = null; this.aware = false;
    this.teleport(pos, yaw);
    this.model?.setDissolve(0);
    this.object.visible = true;
  }

  // ------------------------------------------------------------------ AI (per sim step)

  think(dt: number, player: Actor) {
    this.guarding = false;
    if (this.dead) { this.wish.set(0, 0, 0); return; }
    // Killed by a critical: stay down once the body hits the ground (no get-up).
    const vm = this.move;
    if (vm && vm.def.id.startsWith('victim_') && this.hp <= 0 && vm.t > 1.7) {
      this.anim.clipSpeed = 0;
      this.finishDeath(false);
      this.wish.set(0, 0, 0);
      return;
    }
    if (this.def.passive) {
      this.wish.set(0, 0, 0);
      this.aware = false; this.target = null;
      if (this.recentDamageT <= 0 && this.hp < this.hpMax) this.hp = this.hpMax;
      if (this.hp < this.hpMax * 0.2) this.hp = this.hpMax;
      return;
    }
    for (const [k, v] of this.cds) if (v > 0) this.cds.set(k, v - dt);
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.recoverT > 0) this.recoverT -= dt;

    const d = this.distTo(player);
    // ---- perception
    if (!this.aware && !player.dead) {
      const ang = Math.abs(this.angleTo(player.pos));
      const sprintNoise = (player as any).sprinting && d < 7;
      const seen = d < this.def.sight && (ang < 1.1 || d < 2.2) && this.svc.world.lineOfSight(this.chest, player.chest);
      if (seen || sprintNoise || (d < 4 && this.idleAnim !== 'sentryWall' && ang < 2)) this.becomeAware(player);
    }
    if (this.aware && player.dead) { this.aware = false; this.ai = 'return'; this.target = null; }
    if (this.aware && this.home.distanceTo(this.pos) > this.leash && !this.isBoss) { this.aware = false; this.ai = 'return'; this.target = null; }

    if (this.move) { this.wish.set(0, 0, 0); return; }

    // ---- follow-up combos
    if (this.pendingFollow && this.target) {
      const id = this.pendingFollow; this.pendingFollow = null;
      this.doAttack(id);
      return;
    }

    if (!this.aware || !this.target) {
      this.idleBehaviour(dt);
      return;
    }
    const t = this.target;
    const ang = this.angleTo(t.pos);
    const face = (rate: number) => this.faceToward(t.pos.x, t.pos.z, rate * dt);

    // ranged spacing
    const keep = this.def.keepDistance;
    // ---- attack selection
    if (this.attackCd <= 0 && this.recoverT <= 0 && !t.dead) {
      const opts = this.def.attacks.filter((a) => d >= a.range[0] && d <= a.range[1] && Math.abs(ang) <= (a.angle ?? 0.6) && (this.cds.get(a.move) ?? 0) <= 0 && (!a.phase || a.phase <= this.phase));
      if (opts.length && this.rng.next() < this.def.aggression + (d < 2 ? 0.2 : 0)) {
        let w = opts.reduce((s, a) => s + a.weight, 0) * this.rng.next();
        for (const a of opts) { w -= a.weight; if (w <= 0) { this.doAttack(a.move, a); return; } }
      }
      this.attackCd = 0.25 + this.rng.next() * 0.35;
    }
    // ---- movement
    const g = this.def.guard;
    if (g && d < 7 && this.stamina > 10) this.guarding = true;
    const speedMul = this.guarding ? 0.75 : 1;
    let mvx = 0, mvz = 0, sp = 0;
    const dirx = (t.pos.x - this.pos.x) / Math.max(d, 1e-3), dirz = (t.pos.z - this.pos.z) / Math.max(d, 1e-3);
    const bestReach = Math.max(...this.def.attacks.map((a) => a.range[1]));
    if (keep && d < keep[0]) { mvx = -dirx; mvz = -dirz; sp = this.def.walk; }
    else if (keep && d <= keep[1]) { this.strafe(dt, dirx, dirz); face(6); return; }
    else if (d > bestReach * 0.8 || this.recoverT <= 0 && d > 2.2) {
      mvx = dirx; mvz = dirz; sp = d > 6 && !this.guarding ? this.def.run : this.def.walk;
    }
    else { this.strafe(dt, dirx, dirz); face(6); return; }
    // avoid walking off ledges
    if (sp > 0 && !this.groundAhead(mvx, mvz)) sp = 0;
    this.wish.set(mvx * sp * speedMul, 0, mvz * sp * speedMul);
    face(this.isBoss ? 5 : 7);
  }

  private strafe(dt: number, dirx: number, dirz: number) {
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeDir = this.rng.next() < 0.5 ? -1 : 1; this.strafeT = 1 + this.rng.next() * 1.8; }
    // perpendicular (circling)
    const sx = -dirz * this.strafeDir, sz = dirx * this.strafeDir;
    const sp = this.def.walk * 0.7;
    if (this.groundAhead(sx, sz)) this.wish.set(sx * sp, 0, sz * sp); else { this.strafeDir *= -1; this.wish.set(0, 0, 0); }
  }

  private groundAhead(x: number, z: number) {
    const g = this.svc.world.groundAt(this.pos.x + x * 0.9, this.pos.y + 0.8, this.pos.z + z * 0.9, 2.2);
    return !!g;
  }

  private idleBehaviour(dt: number) {
    if (this.ai === 'return') {
      const d = this.pos.distanceTo(this.home);
      if (d < 0.6) { this.ai = this.patrol ? 'patrol' : 'idle'; this.wish.set(0, 0, 0); this.hp = this.hpMax; return; }
      const dx = (this.home.x - this.pos.x) / d, dz = (this.home.z - this.pos.z) / d;
      this.wish.set(dx * this.def.walk, 0, dz * this.def.walk);
      this.yaw = approachAngle(this.yaw, yawOf(dx, dz), 6 * dt);
      return;
    }
    if (this.patrol && this.patrol.length) {
      const p = this.patrol[this.patrolI % this.patrol.length];
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d < 0.5) { this.patrolI++; this.wish.set(0, 0, 0); return; }
      const dx = (p.x - this.pos.x) / d, dz = (p.z - this.pos.z) / d;
      this.wish.set(dx * this.def.walk * 0.6, 0, dz * this.def.walk * 0.6);
      this.yaw = approachAngle(this.yaw, yawOf(dx, dz), 3 * dt);
      return;
    }
    this.wish.set(0, 0, 0);
    this.yaw = approachAngle(this.yaw, this.homeYaw, 2 * dt);
  }

  becomeAware(player: Actor) {
    if (this.aware) return;
    this.aware = true; this.target = player; this.ai = 'engage';
    if (this.move?.def.id === 'sentry_idle_loop') this.endMove();
    this.attackCd = 0.4 + this.rng.next() * 0.5;
    this.svc.sfx('enemy_alert', { pos: this.pos });
  }

  protected doAttack(id: string, a?: EnemyAttack) {
    const mv = MOVES[id];
    if (!mv) return;
    this.startMove(mv);
    if (a?.cooldown) this.cds.set(id, a.cooldown);
    const follow = (a ?? this.def.attacks.find((x) => x.move === id))?.follow;
    this.pendingFollow = null;
    if (follow) for (const [f, p] of follow) if (this.rng.next() < p) { this.pendingFollow = f; break; }
    if (mv.tell === 'unparryable') this.svc.sfx('unparryable_tell', { pos: this.pos });
  }

  protected override onMoveEnd(m: MoveInstance) {
    const d = m.def;
    if (d.hits && !this.pendingFollow) {
      const [a, b] = this.def.recover;
      this.recoverT = a + this.rng.next() * (b - a);
    }
    if (d.id.startsWith('victim_') && this.hp <= 0) this.finishDeath(false);
    if (d.id === 'death' || d.id === (this.def.reactions?.death ?? 'death')) this.finishDeath(true);
  }

  protected override onMoveEvent(e: MoveEvent, m: MoveInstance) {
    switch (e.type) {
      case 'sfx': this.svc.sfx(e.cue, { pos: this.pos, volume: e.volume }); break;
      case 'trail': this.svc.trail(this, e.on); break;
      case 'shake': this.svc.shake(e.amount * 0.6); break;
      case 'custom': this.onCustom(e.id, m); break;
      default: break;
    }
    // victims of criticals that die fall and stay down
    if (m.def.id.startsWith('victim_') && this.hp <= 0 && m.t > 1.6) this.finishDeath(false);
  }

  /** Hook for subclass/archetype-specific events (e.g. archers loosing arrows). */
  protected onCustom(id: string, _m: MoveInstance) {
    if (id === 'shoot' && this.target) {
      const origin = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handL.matrixWorld);
      const aimAt = this.target.chest.clone();
      // lead the target slightly
      aimAt.addScaledVector(this.target.vel, Math.min(0.35, origin.distanceTo(aimAt) / 26));
      const dir = aimAt.sub(origin).normalize();
      dir.y += 0.02;
      this.svc.spawnProjectile({ kind: 'arrow', owner: this, pos: origin, vel: dir.multiplyScalar(26), gravity: 2, radius: 0.07, life: 3, packet: { physical: 70, magic: 0, fire: 0 }, posture: 10, poise: 20, damageKind: 'thrust' });
      this.svc.sfx('bow_release', { pos: this.pos });
    }
  }

  // ------------------------------------------------------------------ criticals

  beginCriticalVictim(kind: string, _by: Actor) {
    this.pendingFollow = null;
    this.svc.trail(this, false);
    this.startMove(MOVES[kind === 'backstab' ? 'victim_back' : kind === 'postureBreak' ? 'victim_down' : 'victim_front'], { fade: 0.03 });
    this.aware = true;
  }

  private finishDeath(fromDeathAnim: boolean) {
    if (this.deathT >= 0) return;
    this.dead = true;
    this.deathT = 0;
    this.guarding = false;
    this.onKilled(this);
    void fromDeathAnim;
  }

  /** Visual death: dissolve after lying still a moment. */
  updateDeath(dt: number) {
    if (this.deathT < 0) return;
    this.deathT += dt;
    const t = Math.min(1, Math.max(0, (this.deathT - 0.6) / 1.6));
    this.model?.setDissolve(t);
    if (t >= 1) this.object.visible = false;
  }

  // ------------------------------------------------------------------ Combatant

  attackPacket(spec: HitSpec): DamagePacket {
    const v = spec.dmg;
    return spec.kind === 'fire' ? { physical: v * 0.3, magic: 0, fire: v * 0.7 } : spec.kind === 'magic' ? { physical: 0, magic: v, fire: 0 } : { physical: v, magic: 0, fire: 0 };
  }
  postureDamage(spec: HitSpec): number { return spec.posture; }
  defend(p: DamagePacket): number {
    const a = this.def.absorb;
    let dmg = 0;
    if (p.physical > 0) dmg += applyDefense(p.physical, this.def.defense, a.physical);
    if (p.magic > 0) dmg += applyDefense(p.magic, this.def.defense, a.magic);
    if (p.fire > 0) dmg += applyDefense(p.fire, this.def.defense, a.fire);
    return Math.round(dmg);
  }
  guardInfo() { const g = this.def.guard; return g ? { physical: g.physical, magic: g.magic, stability: g.stability } : null; }

  react(kind: 'light' | 'heavy' | 'guardHit' | 'guardBreak' | 'parried' | 'postureBreak' | 'death', from: THREE.Vector3) {
    if (this.dead) return;
    const r = this.def.reactions ?? {};
    this.pendingFollow = null;
    this.svc.trail(this, false);
    if (!this.aware && this.target === null) {
      // struck while unaware: the player is the target now
      const pl = this.svc.actors().find((a) => a.team === 'player');
      if (pl) this.becomeAware(pl);
    }
    const dir = new THREE.Vector3(this.pos.x - from.x, 0, this.pos.z - from.z).normalize();
    const face = () => { this.yaw = yawOf(-dir.x, -dir.z); };
    switch (kind) {
      case 'death':
        this.hp = 0;
        face();
        this.startMove(MOVES[r.death ?? 'death'], { fade: 0.05 });
        this.svc.sfx('enemy_death', { pos: this.pos });
        return;
      case 'light': if (!this.move?.def.noFlinch) { this.startMove(MOVES[r.light ?? 'hurt_light']); } this.svc.sfx('enemy_pain', { pos: this.pos }); break;
      case 'heavy': face(); this.startMove(MOVES[r.heavy ?? 'hurt_heavy']); this.svc.sfx('enemy_pain', { pos: this.pos }); break;
      case 'guardHit': if (!this.move) this.startMove(MOVES[r.guardHit ?? 'guard_hit']); break;
      case 'guardBreak': face(); this.startMove(MOVES[r.guardBreak ?? 'guard_broken']); this.svc.sfx('guard_break', { pos: this.pos }); this.svc.hint('guardbreak'); break;
      case 'parried': this.startMove(MOVES[r.parried ?? 'parried']); this.svc.sfx('parry_success', { pos: this.pos }); break;
      case 'postureBreak': face(); this.startMove(MOVES[r.postureBreak ?? 'posture_broken']); this.svc.sfx('posture_break', { pos: this.pos }); this.svc.hint('postureBreak'); break;
    }
    // A hit interrupts recovery windows so the enemy doesn't instantly counter.
    this.attackCd = Math.max(this.attackCd, 0.35);
  }
  onDealtHit(_r: HitResult) {}
  get telegraph(): 'none' | 'unparryable' | 'grab' { const m = this.move; return m?.def.tell && m.def.hits && m.t < (m.def.hits[0].end) ? m.def.tell : 'none'; }
  /** True while the current attack is winding up (for readable tells). */
  get windingUp() { const m = this.move; return !!m?.def.hits && m.t < m.def.hits[0].start; }
  static hasClip(id: string) { return !!CLIPS[id]; }
  angleToPlayer(p: Actor) { return angleDiff(this.yaw, yawOf(p.pos.x - this.pos.x, p.pos.z - this.pos.z)); }
}
