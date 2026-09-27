/**
 * Per-actor animation state: locomotion base, one full/partial action clip with crossfade,
 * an optional overlay (guard, aim), and additive reactions (flinch, head look). Everything is
 * driven by `update(dt)` from the fixed simulation step, and `evaluate(lag)` can sample slightly
 * in the past for smooth interpolated rendering.
 */
import type { Rig } from '../Rig';
import { Clip, copyPoseSpec, makePoseSpec } from './Clip';
import { Locomotion, type LocoInput, type Stance } from './locomotion';
import { PoseSolver } from './PoseSolver';
import type { HandKey, PoseSpec, V3 } from './types';
import { TRUNK } from './types';
import type { BoneName } from '../rigDefs';

const lerp3 = (a: V3, b: V3, w: number, o: V3) => {
  o[0] = a[0] + (b[0] - a[0]) * w; o[1] = a[1] + (b[1] - a[1]) * w; o[2] = a[2] + (b[2] - a[2]) * w;
};

function blendHand(a: HandKey | null, b: HandKey | null, w: number, prev: HandKey | null): HandKey | null {
  if (!a || !b) return w < 0.5 ? (a ? { ...a, p: [...a.p] as V3, dir: [...a.dir] as V3 } : null) : (b ? { ...b, p: [...b.p] as V3, dir: [...b.dir] as V3 } : null);
  const o = prev ?? { p: [0, 0, 0], dir: [0, 1, 0] };
  lerp3(a.p, b.p, w, o.p);
  lerp3(a.dir, b.dir, w, o.dir);
  const l = Math.hypot(o.dir[0], o.dir[1], o.dir[2]) || 1;
  o.dir[0] /= l; o.dir[1] /= l; o.dir[2] /= l;
  if (a.up || b.up) {
    const au = a.up ?? b.up!, bu = b.up ?? a.up!;
    o.up = o.up ?? [0, 0, 1];
    lerp3(au, bu, w, o.up);
  } else o.up = undefined;
  if (a.elbow || b.elbow) {
    const ae = a.elbow ?? b.elbow!, be = b.elbow ?? a.elbow!;
    o.elbow = o.elbow ?? [0, 0, 0];
    lerp3(ae, be, w, o.elbow);
  } else o.elbow = undefined;
  o.socket = w < 0.5 ? a.socket : b.socket;
  return o;
}

export function blendSpec(a: PoseSpec, b: PoseSpec, w: number, out: PoseSpec): PoseSpec {
  for (const k of TRUNK) lerp3(a[k], b[k], w, out[k]);
  lerp3(a.hipsPos, b.hipsPos, w, out.hipsPos);
  lerp3(a.footL, b.footL, w, out.footL);
  lerp3(a.footR, b.footR, w, out.footR);
  out.footPitchL = a.footPitchL + (b.footPitchL - a.footPitchL) * w;
  out.footPitchR = a.footPitchR + (b.footPitchR - a.footPitchR) * w;
  const hr = blendHand(a.handR, b.handR, w, out.handR !== a.handR && out.handR !== b.handR ? out.handR : null);
  const hl = blendHand(a.handL, b.handL, w, out.handL !== a.handL && out.handL !== b.handL ? out.handL : null);
  out.handR = hr; out.handL = hl;
  const keys = new Set([...Object.keys(a.fk), ...Object.keys(b.fk)]) as Set<BoneName>;
  const fk: PoseSpec['fk'] = {};
  for (const k of keys) {
    const av = a.fk[k], bv = b.fk[k];
    if (av && bv) { const o: V3 = [0, 0, 0]; lerp3(av, bv, w, o); fk[k] = o; }
    else if (av && w < 0.5) fk[k] = [av[0], av[1], av[2]];
    else if (bv && w >= 0.5) fk[k] = [bv[0], bv[1], bv[2]];
  }
  out.fk = fk;
  return out;
}

export interface PlayOpts { fade?: number; speed?: number; t0?: number }

/**
 * OPTIONAL body-plan extension a Stance may carry (quadrupeds: src/content/beasts). Humanoid
 * stances never set `body`, so nothing below changes their behaviour.
 *  - `gait()`: creates this actor's locomotion, used INSTEAD of the humanoid `loco` (same
 *    update/sample contract; created lazily once per actor and stance body plan).
 *  - `clips`: replacement clips by clip name, for shared moves whose clip id is fixed by the
 *    engine (critical victims, sentry idle…): `play()` substitutes `clips[clip.name]` if present.
 */
export interface GaitLike { update(dt: number, inp: LocoInput): void; sample(stance: Stance, out: PoseSpec): void }
export interface BodyPlan { gait?: () => GaitLike; clips?: Record<string, Clip> }
export type StanceWithBody = Stance & { body?: BodyPlan };

export class Animator {
  readonly loco = new Locomotion();
  readonly solver: PoseSolver;
  stance: Stance = { handR: null, handL: null };

  clip: Clip | null = null;
  clipT = 0;
  clipSpeed = 1;
  /** Freeze factor for hit-stop (0 = frozen). */
  timeScale = 1;

  private from = makePoseSpec();
  private hasFrom = false;
  private fadeT = 0;
  private fadeDur = 0;

  private overlay: { clip: Clip; t: number; w: number; target: number; rate: number } | null = null;

  // additive springs (degrees)
  private flinch = { x: 0, z: 0, vx: 0, vz: 0 };
  /** Head/neck yaw toward a look target (degrees, + = character's left). */
  lookYaw = 0;
  lookPitch = 0;

  private base = makePoseSpec();
  private tmp = makePoseSpec();
  private tmp2 = makePoseSpec();
  readonly out = makePoseSpec();

  constructor(public readonly rig: Rig) {
    this.solver = new PoseSolver(rig);
  }

  /** Body-plan locomotion (see BodyPlan), or null for the humanoid `loco`. */
  private gait: { plan: BodyPlan; g: GaitLike } | null = null;
  private get locomotor(): GaitLike {
    const plan = (this.stance as StanceWithBody).body;
    if (!plan?.gait) return this.loco;
    if (this.gait?.plan !== plan) this.gait = { plan, g: plan.gait() };
    return this.gait.g;
  }

  /** Start a clip; crossfades from the current pose over `fade` seconds. */
  play(clip: Clip, o: PlayOpts = {}) {
    clip = (this.stance as StanceWithBody).body?.clips?.[clip.name] ?? clip;
    copyPoseSpec(this.out, this.from);
    this.hasFrom = true;
    this.fadeT = 0;
    this.fadeDur = o.fade ?? 0.1;
    this.clip = clip;
    this.clipT = o.t0 ?? 0;
    this.clipSpeed = o.speed ?? 1;
  }
  /** Return to locomotion. */
  stop(fade = 0.15) {
    if (!this.clip) return;
    copyPoseSpec(this.out, this.from);
    this.hasFrom = true;
    this.fadeT = 0;
    this.fadeDur = fade;
    this.clip = null;
  }
  /** Upper-body overlay (e.g. guard). target weight 0..1 blended at `rate`/s. */
  setOverlay(clip: Clip | null, target: number, rate = 10) {
    if (!clip) { if (this.overlay) this.overlay.target = 0; return; }
    if (!this.overlay || this.overlay.clip !== clip) this.overlay = { clip, t: 0, w: this.overlay?.clip === clip ? this.overlay.w : 0, target, rate };
    else { this.overlay.target = target; this.overlay.rate = rate; }
  }
  get overlayWeight() { return this.overlay?.w ?? 0; }
  /** Directional flinch impulse. dirX/dirZ = hit direction in root space (from attacker toward us). */
  addFlinch(dirX: number, dirZ: number, strength: number) {
    this.flinch.vx += -dirZ * 260 * strength; // pushed backward → bend back
    this.flinch.vz += dirX * 200 * strength;
  }

  get clipDone() { return !!this.clip && !this.clip.loop && this.clipT >= this.clip.duration; }

  update(dt: number, loco: LocoInput) {
    const sdt = dt * this.timeScale;
    this.locomotor.update(sdt, loco);
    if (this.clip) this.clipT += sdt * this.clipSpeed;
    if (this.hasFrom) { this.fadeT += sdt; if (this.fadeT >= this.fadeDur) this.hasFrom = false; }
    if (this.overlay) {
      const o = this.overlay;
      o.t += sdt;
      o.w += (o.target - o.w) * (1 - Math.exp(-o.rate * sdt));
      if (o.target === 0 && o.w < 0.01) this.overlay = null;
    }
    // critically-damped-ish spring back to 0
    const f = this.flinch;
    const k = 180, c = 22;
    f.vx += (-k * f.x - c * f.vx) * sdt; f.x += f.vx * sdt;
    f.vz += (-k * f.z - c * f.vz) * sdt; f.z += f.vz * sdt;
  }

  /** Evaluate the pose `lag` seconds in the past (0 = now) and apply it to the rig. */
  evaluate(lag = 0) {
    const out = this.out;
    // base: locomotion + stance
    this.locomotor.sample(this.stance, this.base);
    let cur = this.base;
    if (this.clip) {
      copyPoseSpec(this.base, this.tmp);
      const t = Math.max(0, this.clipT - lag * this.clipSpeed * this.timeScale);
      this.clip.sample(Math.min(t, this.clip.duration), this.tmp);
      cur = this.tmp;
    }
    if (this.overlay && this.overlay.w > 0.001) {
      copyPoseSpec(cur, this.tmp2);
      this.overlay.clip.sample(this.overlay.t, this.tmp2);
      blendSpec(cur, this.tmp2, this.overlay.w, this.tmp2);
      cur = this.tmp2;
    }
    if (this.hasFrom) {
      const x = Math.min(Math.max((this.fadeT - lag) / Math.max(this.fadeDur, 1e-4), 0), 1);
      const w = x * x * (3 - 2 * x);
      blendSpec(this.from, cur, w, out);
    } else copyPoseSpec(cur, out);
    // additives
    out.spine[0] += this.flinch.x * 0.5; out.chest[0] += this.flinch.x * 0.5; out.head[0] += this.flinch.x * 0.3;
    out.spine[2] += this.flinch.z * 0.5; out.chest[2] += this.flinch.z * 0.4;
    out.neck[1] += this.lookYaw * 0.4; out.head[1] += this.lookYaw * 0.6;
    out.neck[0] += this.lookPitch * 0.4; out.head[0] += this.lookPitch * 0.6;
    this.solver.apply(out);
  }
}
