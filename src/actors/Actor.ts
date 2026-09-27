/**
 * Base class for every combatant (player, Unlived, bosses, spirit allies) and animated NPCs.
 * Owns physical state, resources, the current move, animation and hurt volumes.
 */
import * as THREE from 'three';
import { Rig } from './Rig';
import { Animator } from './anim/Animator';
import type { Stance } from './anim/locomotion';
import { CLIPS } from './anim/clips';
import type { CharacterModel, WeaponModel } from './models/contract';
import type { RigProportions } from './rigDefs';
import type { CollisionWorld, MoveResult, Surface } from '../world/Collision';
import type { MoveDef, MoveEvent, Vulnerable } from '../combat/types';
import { angleDiff, approachAngle, wrapAngle, yawOf } from '../core/math';

export type Team = 'player' | 'unlived' | 'neutral';

export interface HurtVolume { a: THREE.Vector3; b: THREE.Vector3; r: number; part: 'body' | 'head' | 'limb' }

export interface MoveInstance {
  def: MoveDef;
  t: number;
  /** Targets already hit, per hit group. */
  hitLog: Map<number, Set<number>>;
  /** Charge level for charged attacks (0..1). */
  charge: number;
  /** Arbitrary per-move data (e.g. spell id, critical victim). */
  data: Record<string, unknown>;
  lastMotion: number;
  lastSide: number;
}

let NEXT_ID = 1;

const _hurtScale = new THREE.Vector3();
const _mv = new THREE.Vector3();
const _ext = new THREE.Vector3();
const _shoveRes: MoveResult = { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), hitWall: false, wallNormal: new THREE.Vector3(), surface: 'stone' };
/** External position changes shorter than this are swept; longer ones are teleports. */
const MAX_SHOVE = 2.5;

export abstract class Actor {
  readonly id = NEXT_ID++;
  abstract readonly team: Team;
  name = '';

  // ---- physical
  readonly pos = new THREE.Vector3();
  readonly prevPos = new THREE.Vector3();
  yaw = 0;
  prevYaw = 0;
  vy = 0;
  /** Horizontal velocity actually applied last step. */
  readonly vel = new THREE.Vector3();
  /** Desired horizontal velocity from the controller (free state). */
  readonly wish = new THREE.Vector3();
  readonly knock = new THREE.Vector3();
  radius = 0.36;
  height = 1.8;
  mass = 1;
  grounded = true;
  groundSurface: Surface = 'stone';
  fallStartY = 0;
  private moveRes: MoveResult | undefined;
  /** Where the last physics step left the actor: shoves applied between steps are swept from here. */
  private readonly physPos = new THREE.Vector3();
  private physValid = false;

  // ---- resources
  hp = 100; hpMax = 100;
  stamina = 100; staminaMax = 100; staminaDelay = 0; staminaRegen = 45;
  focus = 0; focusMax = 0;
  posture = 0; postureMax = 100; postureDelay = 0; postureRegen = 22;
  poise = 0; poiseDamage = 0; poiseTimer = 0;
  /** Extra poise from the current move's hyper-armour. */
  get poiseNow() { const h = this.move?.def.hyper; return this.poise + (h && this.move!.t >= h[0] && this.move!.t <= h[1] ? h[2] : 0); }

  // ---- combat state
  move: MoveInstance | null = null;
  dead = false;
  /** Seconds of hit-stop remaining (animation & move time frozen). */
  hitstop = 0;
  guarding = false;
  /** Guard facing tolerance (radians from forward). */
  guardArc = Math.PI * 0.42;
  /** Unaware (for backstabs & sneak attacks). */
  aware = true;
  /** Can this actor be backstabbed / critted at all (bosses: riposte/posture crits only). */
  backstabbable = true;
  criticalable = true;
  /** Set by moves with `vulnerable`. */
  get vulnerable(): Vulnerable | null { return this.move?.def.vulnerable ?? null; }
  get invulnerable() { const f = this.move?.def.iframes; return !!f && this.move!.t >= f[0] && this.move!.t <= f[1]; }
  get parrying() { const p = this.move?.def.parry; return !!p && this.move!.t >= p[0] && this.move!.t <= p[1]; }
  /** Temporary buffs: id → seconds remaining. */
  readonly buffs = new Map<string, number>();

  // ---- visuals
  readonly rig: Rig;
  readonly anim: Animator;
  model: CharacterModel | null = null;
  weaponR: { id: string; model: WeaponModel } | null = null;
  weaponL: { id: string; model: WeaponModel } | null = null;
  shield: { id: string; model: WeaponModel } | null = null;
  flash = 0;
  /** Damage number accumulation for enemy bars. */
  recentDamage = 0; recentDamageT = 0;

  // ---- per-step hit tracing
  readonly prevSeg = { R: { a: new THREE.Vector3(), b: new THREE.Vector3(), valid: false }, L: { a: new THREE.Vector3(), b: new THREE.Vector3(), valid: false }, S: { a: new THREE.Vector3(), b: new THREE.Vector3(), valid: false } };
  readonly hurt: HurtVolume[] = [];

  constructor(props?: RigProportions) {
    this.rig = new Rig(props);
    this.anim = new Animator(this.rig);
    for (let i = 0; i < 9; i++) this.hurt.push({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.1, part: 'body' });
  }

  get object() { return this.rig.root; }
  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get alive() { return !this.dead; }
  get chest() { return new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.72, this.pos.z); }

  setStance(s: Stance) { this.anim.stance = s; }

  teleport(p: THREE.Vector3, yaw: number) {
    this.pos.copy(p); this.prevPos.copy(p);
    this.yaw = yaw; this.prevYaw = yaw;
    this.vel.set(0, 0, 0); this.vy = 0; this.knock.set(0, 0, 0);
    this.fallStartY = p.y;
    this.physPos.copy(p); this.physValid = true;
    this.syncRoot(0);
    this.model?.resetSecondary();
  }

  // ------------------------------------------------------------------ moves

  startMove(def: MoveDef, opts: { charge?: number; data?: Record<string, unknown>; fade?: number } = {}) {
    this.move = { def, t: 0, hitLog: new Map(), charge: opts.charge ?? 0, data: opts.data ?? {}, lastMotion: 0, lastSide: 0 };
    const clip = CLIPS[def.clip];
    if (clip) this.anim.play(clip, { fade: opts.fade ?? def.fade ?? 0.08, speed: def.speed ?? 1 });
    this.prevSeg.R.valid = this.prevSeg.L.valid = this.prevSeg.S.valid = false;
    if (def.stamina) this.spendStamina(def.stamina);
    if (def.focus) this.focus = Math.max(0, this.focus - def.focus);
  }

  endMove() {
    this.move = null;
    this.anim.stop(0.18);
  }

  /** Called for each event whose time passes this step. */
  protected onMoveEvent(_e: MoveEvent, _m: MoveInstance): void {}
  /** Called when a move finishes naturally. */
  protected onMoveEnd(_m: MoveInstance): void {}

  spendStamina(n: number) {
    this.stamina -= n;
    if (this.stamina < -20) this.stamina = -20;
    this.staminaDelay = 0.55;
  }

  /** Is the move past its cancel time for `kind`? */
  canCancel(kind: 'chain' | 'dodge' | 'free'): boolean {
    const m = this.move;
    if (!m) return true;
    const c = m.def.cancel?.[kind];
    return c !== undefined && m.t >= c;
  }

  faceToward(x: number, z: number, maxStep: number) {
    const target = yawOf(x - this.pos.x, z - this.pos.z);
    this.yaw = approachAngle(this.yaw, target, maxStep);
  }
  /** Signed angle from our forward to the direction of a point. */
  angleTo(p: THREE.Vector3) { return angleDiff(this.yaw, yawOf(p.x - this.pos.x, p.z - this.pos.z)); }
  distTo(o: Actor | THREE.Vector3) { const p = o instanceof Actor ? o.pos : o; return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }

  // ------------------------------------------------------------------ simulation

  /**
   * Advance one fixed step: timers, move time/events/root motion, movement + collision.
   * Controllers set `wish` and may start moves before this is called.
   */
  stepPhysics(dt: number, world: CollisionWorld, trackTarget: THREE.Vector3 | null, trackYaw: number | null) {
    // Shoves applied since the last step (actor separation, grabs, critical alignment, lifts) are
    // swept through the world too, so they cannot push anyone through a wall or floor. Longer jumps
    // are deliberate relocations and are taken as they are.
    if (this.physValid) {
      _ext.copy(this.pos).sub(this.physPos);
      const d = _ext.length();
      if (d > 1e-6 && d < MAX_SHOVE) {
        this.pos.copy(this.physPos);
        world.sweepCapsule(this.pos, _ext, this.radius, this.height, _shoveRes);
      }
    }
    this.prevPos.copy(this.pos);
    this.prevYaw = this.yaw;
    const frozen = this.hitstop > 0;
    if (frozen) this.hitstop = Math.max(0, this.hitstop - dt);
    const mdt = frozen ? 0 : dt;
    this.anim.timeScale = frozen ? 0 : 1;

    // resources
    if (this.staminaDelay > 0) this.staminaDelay -= dt;
    else if (this.stamina < this.staminaMax) {
      const rate = this.staminaRegen * (this.guarding ? 0.6 : 1) * (this.buffs.has('staminaRegen') ? 1.5 : 1);
      this.stamina = Math.min(this.staminaMax, this.stamina + rate * dt);
    }
    if (this.postureDelay > 0) this.postureDelay -= dt;
    else if (this.posture > 0 && !this.vulnerable) this.posture = Math.max(0, this.posture - this.postureRegen * dt);
    if (this.poiseTimer > 0) { this.poiseTimer -= dt; if (this.poiseTimer <= 0) this.poiseDamage = 0; }
    for (const [k, v] of this.buffs) { if (v - dt <= 0) this.buffs.delete(k); else this.buffs.set(k, v - dt); }
    if (this.recentDamageT > 0) { this.recentDamageT -= dt; if (this.recentDamageT <= 0) this.recentDamage = 0; }
    this.flash = Math.max(0, this.flash - dt * 6);

    // move progression
    let hv = new THREE.Vector3();
    const m = this.move;
    if (m) {
      const t0 = m.t;
      m.t += mdt;
      const d = m.def;
      if (d.events) for (const ev of d.events) if (ev.t > t0 && ev.t <= m.t || (t0 === 0 && ev.t === 0 && mdt > 0)) this.onMoveEvent(ev.e, m);
      // tracking
      if (d.track && m.t <= d.track[0] && mdt > 0) {
        if (trackTarget) this.faceToward(trackTarget.x, trackTarget.z, d.track[1] * dt);
        else if (trackYaw !== null) this.yaw = approachAngle(this.yaw, trackYaw, d.track[1] * dt);
      }
      // root motion
      const fwd = d.motion ? sampleCurve(d.motion, m.t) : 0;
      const side = d.motionSide ? sampleCurve(d.motionSide, m.t) : 0;
      if (mdt > 0) {
        const df = fwd - m.lastMotion, ds = side - m.lastSide;
        m.lastMotion = fwd; m.lastSide = side;
        const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
        // right = (-cos, 0, sin)... character right is -X in local → world right = (-c, 0, s)
        hv.set((s * df - c * ds) / dt, 0, (c * df + s * ds) / dt);
      }
      if (d.walk !== undefined && d.walk > 0) hv.addScaledVector(this.wish, d.walk);
      // The dead keep their final pose (death / critical-victim clips hold their last key).
      if (m.t >= d.dur) { this.move = null; this.onMoveEnd(m); if (!this.move && !this.dead) this.anim.stop(0.2); }
    } else {
      hv.copy(this.wish);
    }
    // accelerate toward target horizontal velocity
    const accel = m ? 1000 : 26;
    const dvx = hv.x - this.vel.x, dvz = hv.z - this.vel.z;
    const dl = Math.hypot(dvx, dvz), maxDv = accel * dt;
    if (dl > maxDv) { this.vel.x += (dvx / dl) * maxDv; this.vel.z += (dvz / dl) * maxDv; } else { this.vel.x = hv.x; this.vel.z = hv.z; }
    // knockback decays
    this.knock.multiplyScalar(Math.exp(-7 * dt));
    // gravity
    this.vy = this.grounded ? -2 : Math.max(this.vy - 22 * dt, -40);
    const wasGrounded = this.grounded;
    // Swept in sub-steps of at most half a radius: falls at terminal speed (0.67 m/step), lunges
    // (up to ~0.4 m/step) and knock-back never tunnel through thin floors, ramps or walls.
    _mv.set((this.vel.x + this.knock.x) * dt, this.vy * dt, (this.vel.z + this.knock.z) * dt);
    this.moveRes = world.sweepCapsule(this.pos, _mv, this.radius, this.height, this.moveRes);
    this.grounded = this.moveRes.grounded;
    if (!this.grounded && wasGrounded && this.vy <= 0) {
      // snap down small steps/slopes
      const g = world.groundAt(this.pos.x, this.pos.y + 0.3, this.pos.z, 0.75);
      if (g && g.normal.y > 0.55) { this.pos.y = g.y; this.grounded = true; this.moveRes.surface = g.surface; }
    }
    this.physPos.copy(this.pos); this.physValid = true;
    if (this.grounded) {
      this.groundSurface = this.moveRes.surface;
      if (!wasGrounded) this.onLand(this.fallStartY - this.pos.y);
      this.fallStartY = this.pos.y;
    } else if (wasGrounded) this.fallStartY = this.pos.y;
    else this.fallStartY = Math.max(this.fallStartY, this.pos.y);
  }

  protected onLand(_fall: number): void {}

  /** Animation update (sim time) + pose evaluation for hit tracing. */
  stepAnimation(dt: number) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const s = Math.sin(-this.yaw), c = Math.cos(-this.yaw);
    // world vel → root space
    const lx = sp > 0.01 ? (this.vel.x * c + this.vel.z * s) / sp : 0;
    const lz = sp > 0.01 ? (-this.vel.x * s + this.vel.z * c) / sp : 1;
    const turn = wrapAngle(this.yaw - this.prevYaw) / dt;
    this.anim.update(dt, { speed: this.move && !this.move.def.walk ? sp * 0.6 : sp, dirX: lx, dirZ: lz, sprint: sp > 5, alert: this.guarding ? 1 : 0.3, turnRate: turn });
    this.syncRoot(1);
    this.anim.evaluate(0);
    this.rig.root.updateMatrixWorld(true);
    this.updateHurt();
  }

  /** Place the rig root from interpolated state (alpha: 0 = prev step, 1 = current). */
  syncRoot(alpha: number) {
    const r = this.rig.root;
    r.position.lerpVectors(this.prevPos, this.pos, alpha);
    r.rotation.set(0, this.prevYaw + angleDiff(this.prevYaw, this.yaw) * alpha, 0);
  }

  /** Render-time pose: interpolate root and re-evaluate slightly in the past. */
  renderPose(alpha: number, dtStep: number, realDt: number) {
    this.syncRoot(alpha);
    this.anim.evaluate((1 - alpha) * dtStep);
    this.rig.root.updateMatrixWorld(true);
    if (this.model) {
      this.model.setFlash(this.flash);
      this.model.updateSecondary(realDt);
    }
  }

  private updateHurt() {
    const b = this.rig.bones;
    // radii follow the rig's world scale (scaled bosses such as the Ancient King)
    const s = this.rig.proportions.height * this.rig.root.getWorldScale(_hurtScale).x, k = this.rig.proportions.bulk;
    let i = 0;
    const cap = (a: THREE.Object3D, bb: THREE.Object3D | null, r: number, part: HurtVolume['part'], off = 0) => {
      const h = this.hurt[i++];
      a.getWorldPosition(h.a);
      if (bb) bb.getWorldPosition(h.b); else { h.b.copy(h.a); h.b.y += off; }
      h.r = r; h.part = part;
    };
    cap(b.hips, b.neck, 0.2 * s * k, 'body');
    cap(b.head, null, 0.13 * s, 'head', 0.16 * s);
    cap(b.upperArmL, b.handL, 0.07 * s * k, 'limb');
    cap(b.upperArmR, b.handR, 0.07 * s * k, 'limb');
    cap(b.thighL, b.footL, 0.085 * s * k, 'limb');
    cap(b.thighR, b.footR, 0.085 * s * k, 'limb');
    cap(b.spine, b.chest, 0.22 * s * k, 'body');
    this.hurt.length = i;
  }

  /** World-space damaging segment for a weapon slot (after stepAnimation). */
  weaponSegment(slot: 'R' | 'L' | 'S', a: THREE.Vector3, b: THREE.Vector3): number | null {
    const w = slot === 'R' ? this.weaponR : slot === 'L' ? this.weaponL : this.shield;
    const sock = slot === 'R' ? this.rig.sockets.weaponR : slot === 'L' ? this.rig.sockets.weaponL : this.rig.sockets.shieldL;
    if (!w || !w.model.hit) {
      if (slot === 'S') { // shield bash without a model: use hand
        sock.getWorldPosition(a); b.copy(a); return 0.3;
      }
      // fists
      sock.getWorldPosition(a); b.copy(a); return 0.12;
    }
    a.set(0, w.model.hit.from, 0).applyMatrix4(sock.matrixWorld);
    b.set(0, w.model.hit.to, 0).applyMatrix4(sock.matrixWorld);
    return w.model.hit.radius;
  }
}

export function sampleCurve(c: [number, number][], t: number): number {
  if (t <= c[0][0]) return c[0][1] * (c[0][0] > 0 ? t / c[0][0] : 1);
  for (let i = 1; i < c.length; i++) {
    if (t <= c[i][0]) {
      const [t0, v0] = c[i - 1], [t1, v1] = c[i];
      return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
    }
  }
  return c[c.length - 1][1];
}
