/**
 * Procedural locomotion: foot trajectories (solved by leg IK), hip bob/sway, trunk lean and arm
 * swing, layered over a weapon-holding "stance". Frame-rate independent; phase advances with the
 * distance actually travelled so feet don't skate.
 */
import type { HandKey, PoseSpec, V3 } from './types';

export interface Stance {
  handR: HandKey | null;
  handL: HandKey | null;
  hips?: V3; spine?: V3; chest?: V3; neck?: V3; head?: V3;
  hipsPos?: V3;
  /** Idle foot placement (root space). */
  footL?: V3; footR?: V3;
}

export interface LocoInput {
  /** Actual horizontal speed (m/s). */
  speed: number;
  /** Movement direction in root space (unit, x/z). */
  dirX: number; dirZ: number;
  sprint: boolean;
  /** 0..1 how "combat ready" (tight guard, lower stance). */
  alert: number;
  /** Yaw rate (rad/s) for banking. */
  turnRate: number;
}

const TAU = Math.PI * 2;

export class Locomotion {
  phase = 0;
  private moveW = 0;     // smoothed 0..1 moving weight
  private speedS = 0;    // smoothed speed
  private dx = 0; private dz = 1;
  private sprintW = 0;
  private bank = 0;
  time = 0;

  update(dt: number, inp: LocoInput) {
    this.time += dt;
    const k = 1 - Math.exp(-12 * dt);
    this.speedS += (inp.speed - this.speedS) * k;
    const moving = inp.speed > 0.15 ? 1 : 0;
    this.moveW += (moving - this.moveW) * (1 - Math.exp(-(moving ? 10 : 7) * dt));
    this.sprintW += ((inp.sprint && inp.speed > 3 ? 1 : 0) - this.sprintW) * (1 - Math.exp(-6 * dt));
    if (inp.speed > 0.1) {
      const kd = 1 - Math.exp(-14 * dt);
      this.dx += (inp.dirX - this.dx) * kd;
      this.dz += (inp.dirZ - this.dz) * kd;
      const l = Math.hypot(this.dx, this.dz) || 1;
      this.dx /= l; this.dz /= l;
    }
    this.bank += (Math.max(-1, Math.min(1, inp.turnRate * 0.25)) - this.bank) * (1 - Math.exp(-6 * dt));
    // Phase: one cycle = two steps. Step length grows with speed.
    const s = this.speedS;
    const stepLen = Math.min(0.42 + s * 0.16, 1.25);
    const freq = s / (2 * stepLen);
    this.phase = (this.phase + freq * dt) % 1;
    this.alert = inp.alert;
  }
  private alert = 0;

  /** Write the locomotion pose (stance + gait) into out. */
  sample(stance: Stance, out: PoseSpec) {
    const w = this.moveW;
    const s = this.speedS;
    const run = Math.min(Math.max((s - 2.2) / 2.5, 0), 1);
    const stepLen = Math.min(0.42 + s * 0.16, 1.25);
    const breathe = Math.sin(this.time * 1.7);
    const ph = this.phase;

    // ---- trunk
    const set = (dst: V3, src: V3 | undefined, ax = 0, ay = 0, az = 0) => {
      dst[0] = (src ? src[0] : 0) + ax; dst[1] = (src ? src[1] : 0) + ay; dst[2] = (src ? src[2] : 0) + az;
    };
    const lean = w * (3 + run * 6 + this.sprintW * 7);
    const sway = Math.sin(ph * TAU) * w;
    set(out.hips, stance.hips, 0, sway * (5 + run * 3), this.bank * 6);
    set(out.spine, stance.spine, lean * 0.5 + breathe * 0.4, -sway * (4 + run * 3), -this.bank * 3);
    set(out.chest, stance.chest, lean * 0.5 + breathe * 0.8, -sway * (3 + run * 2), 0);
    set(out.neck, stance.neck, -lean * 0.4, 0, 0);
    set(out.head, stance.head, -lean * 0.3, sway * 2, this.bank * -2);
    const bob = w * (0.018 + run * 0.03) * (0.5 - 0.5 * Math.cos(ph * TAU * 2));
    const crouch = 0.02 + this.alert * 0.03 + w * (0.02 + run * 0.05);
    out.hipsPos[0] = (stance.hipsPos?.[0] ?? 0);
    out.hipsPos[1] = (stance.hipsPos?.[1] ?? 0) - crouch - bob;
    out.hipsPos[2] = (stance.hipsPos?.[2] ?? 0) + w * run * 0.03;

    // ---- feet
    const idleL = stance.footL ?? [0.12, 0.08, 0.02];
    const idleR = stance.footR ?? [-0.12, 0.08, -0.03];
    this.foot(ph, stepLen, 0.09 + run * 0.1, idleL, 0.11, w, out.footL);
    this.foot((ph + 0.5) % 1, stepLen, 0.09 + run * 0.1, idleR, -0.11, w, out.footR);
    out.footPitchL = w * this.footPitch(ph);
    out.footPitchR = w * this.footPitch((ph + 0.5) % 1);

    // ---- hands
    const swing = Math.sin(ph * TAU) * w * (0.05 + run * 0.08);
    const handBob = -bob * 0.6 + breathe * 0.004;
    out.handR = this.hand(stance.handR, out.handR, swing, handBob);
    out.handL = this.hand(stance.handL, out.handL, -swing, handBob);
    // Free arms swing via FK.
    const armSwing = Math.sin(ph * TAU) * w * (18 + run * 22);
    if (!stance.handR) { out.fk.upperArmR = [armSwing, 0, -8]; out.fk.forearmR = [-15 - run * 50, 0, 0]; }
    if (!stance.handL) { out.fk.upperArmL = [-armSwing, 0, 8]; out.fk.forearmL = [-15 - run * 50, 0, 0]; }
  }

  private footPitch(p: number) {
    // toe-off near end of stance, heel strike at swing end
    if (p > 0.55 && p < 0.7) return -20 * Math.sin(((p - 0.55) / 0.15) * Math.PI);
    if (p > 0.9) return 10 * Math.sin(((p - 0.9) / 0.1) * Math.PI);
    return 0;
  }

  private foot(p: number, stepLen: number, lift: number, idle: V3, lateral: number, w: number, out: V3) {
    const STANCE = 0.6;
    let along: number, up = 0;
    if (p < STANCE) along = 0.5 - p / STANCE;           // +0.5 → -0.5
    else {
      const u = (p - STANCE) / (1 - STANCE);
      const e = u * u * (3 - 2 * u);
      along = -0.5 + e;
      up = Math.sin(u * Math.PI) * lift;
    }
    const gx = lateral + this.dx * along * stepLen;
    const gz = this.dz * along * stepLen;
    out[0] = idle[0] + (gx - idle[0]) * w;
    out[1] = idle[1] + up * w;
    out[2] = idle[2] + (gz - idle[2]) * w;
  }

  private hand(src: HandKey | null, dst: HandKey | null, swing: number, bob: number): HandKey | null {
    if (!src) return null;
    const h = dst ?? { p: [0, 0, 0], dir: [0, 1, 0] };
    h.p[0] = src.p[0]; h.p[1] = src.p[1] + bob; h.p[2] = src.p[2] + swing;
    h.dir[0] = src.dir[0]; h.dir[1] = src.dir[1]; h.dir[2] = src.dir[2];
    h.up = src.up ? [src.up[0], src.up[1], src.up[2]] : undefined;
    h.elbow = src.elbow ? [src.elbow[0], src.elbow[1], src.elbow[2]] : undefined;
    h.socket = src.socket;
    return h;
  }
}
