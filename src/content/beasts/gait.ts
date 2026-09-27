/**
 * Quadruped locomotion (plugged into the Animator through the stance's `body.gait`).
 *
 * Four independent footfalls with per-gait phase offsets, blended by speed:
 *   walk   (lateral sequence LH → LF → RH → RF, duty 0.62)
 *   trot   (diagonal pairs, slightly split so it still reads four-beat, duty 0.42)
 *   gallop (rotary LH → RH → RF → LF, duty 0.3, spine flexion, body rock)
 * Planted paws stay still in the world (phase advances with distance travelled), turning on the
 * spot steps the paws round the body, and standing still pants, shifts weight and now and then
 * drops the nose to sniff the ground. Front paws drive hand IK, hind paws the hock (foot IK).
 */
import type { GaitLike } from '../../actors/anim/Animator';
import type { LocoInput, Stance } from '../../actors/anim/locomotion';
import type { HandKey, PoseSpec, V3 } from '../../actors/anim/types';
import { footprint, frontPaw, hindAnkle, type QuadDims } from './body';

const TAU = Math.PI * 2;
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Legs in order: LH (footL), LF (handL), RH (footR), RF (handR)
const OFF_WALK = [0, 0.25, 0.5, 0.75];
const OFF_TROT = [0, 0.56, 0.5, 1.06];
const OFF_GALLOP = [0, 0.52, 0.1, 1.42];
const NO_FK: PoseSpec['fk'] = {};

export class QuadGait implements GaitLike {
  phase = 0;
  time = 0;
  private moveW = 0;
  private speedS = 0;
  private dx = 0; private dz = 1;
  private turnS = 0;
  /** 0 = walk, 1 = trot, 2 = gallop (continuous). */
  private g = 0;
  private bank = 0;
  private readonly hand: { L: HandKey; R: HandKey } = { L: { p: [0, 0, 0], dir: [0, 0, 1] }, R: { p: [0, 0, 0], dir: [0, 0, 1] } };
  private readonly tmp: V3 = [0, 0, 0];
  private readonly seed: number;

  constructor(readonly d: QuadDims) { this.seed = Math.random() * 20; }

  update(dt: number, inp: LocoInput) {
    if (dt <= 0) return;
    this.time += dt;
    const s = this.d.s;
    this.speedS += (inp.speed - this.speedS) * (1 - Math.exp(-10 * dt));
    this.turnS += (inp.turnRate - this.turnS) * (1 - Math.exp(-8 * dt));
    const turning = Math.abs(this.turnS) > 0.8;
    const moving = inp.speed > 0.15 || turning ? 1 : 0;
    this.moveW += (moving - this.moveW) * (1 - Math.exp(-(moving ? 9 : 6) * dt));
    if (inp.speed > 0.1) {
      const kd = 1 - Math.exp(-12 * dt);
      this.dx += (inp.dirX - this.dx) * kd; this.dz += (inp.dirZ - this.dz) * kd;
      const l = Math.hypot(this.dx, this.dz) || 1; this.dx /= l; this.dz /= l;
    }
    const v = this.speedS / s;
    const gT = sm(1.7, 2.6, v) + sm(4.6, 5.8, v);
    this.g += (gT - this.g) * (1 - Math.exp(-5 * dt));
    this.bank += (Math.max(-1, Math.min(1, inp.turnRate * 0.2)) - this.bank) * (1 - Math.exp(-5 * dt));
    const { freq } = this.stride();
    this.phase = (this.phase + freq * dt) % 1;
  }

  /** Stride length (m), frequency (Hz), duty factor and the swept distance of a planted paw. */
  private stride() {
    const s = this.d.s;
    const vTurn = Math.abs(this.turnS) * 0.5 * s;
    const v = Math.max(this.speedS, vTurn);
    const L = Math.min(s * (0.55 + 0.2 * v / s), s * 2.1);
    const g = this.g;
    const duty = g < 1 ? lerp(0.62, 0.42, g) : lerp(0.42, 0.3, g - 1);
    return { L, freq: v / L, duty, sweep: L * duty * (this.speedS / Math.max(v, 1e-3)), turnSweep: Math.min(0.4, Math.abs(this.turnS) * duty / Math.max(v / L, 0.5)) * Math.sign(this.turnS) };
  }

  sample(_stance: Stance, out: PoseSpec) {
    const d = this.d, s = d.s, T = d.trunk;
    const fp = footprint(d);
    const w = this.moveW;
    const g = this.g;
    const run = sm(0.6, 1.6, g), gal = sm(1.2, 2, g);
    const { duty, sweep, turnSweep } = this.stride();
    const ph = this.phase;
    const offs = [0, 1, 2, 3].map((i) => g < 1 ? lerp(OFF_WALK[i], OFF_TROT[i], g) : lerp(OFF_TROT[i], OFF_GALLOP[i], g - 1));
    const lift = s * lerp(0.07, 0.13, run);
    const idle = 1 - w;

    // ---- idle life: pant, weight shift, occasional sniff
    const t = this.time + this.seed;
    const pant = Math.sin(t * 2.6 * TAU) * idle;
    const cyc = t % 11;
    const sniff = sm(6.2, 7.0, cyc) * (1 - sm(9.2, 10.0, cyc)) * idle;
    const sniffSway = Math.sin(t * 1.7) * sniff;
    const shift = Math.sin(t * 0.37) * idle;

    // ---- trunk
    const rock = Math.sin((ph - 0.15) * TAU) * gal;          // gallop: gather / extend
    const bob2 = Math.cos(ph * TAU * 2);                     // two bumps per cycle (walk/trot)
    const pitch = w * (2 + run * 3) + rock * 7 * w;
    out.hips[0] = T.hips[0] + pitch;
    out.hips[1] = T.hips[1] + this.bank * 7 * w + Math.sin(ph * TAU) * (1 - run) * 3 * w;
    out.hips[2] = T.hips[2] + Math.sin(ph * TAU) * 3 * w * (1 - gal) + shift * 2;
    out.spine[0] = T.spine[0] - rock * 9 * w + pant * 0.3;
    out.spine[1] = T.spine[1] - this.bank * 3 * w;
    out.spine[2] = T.spine[2] - Math.sin(ph * TAU) * 2 * w * (1 - gal);
    out.chest[0] = T.chest[0] + rock * 5 * w + pant * 0.9;
    out.chest[1] = T.chest[1]; out.chest[2] = T.chest[2];
    // the head stays level against the body's rocking
    out.neck[0] = T.neck[0] - pitch * 0.5 + w * run * 10 + sniff * 26;
    out.neck[1] = T.neck[1];
    out.neck[2] = T.neck[2] + sniffSway * 8 - this.bank * 6 * w;
    out.head[0] = T.head[0] - pitch * 0.4 - w * run * 6 + sniff * 18 + pant * 1.6 + Math.sin(ph * TAU * 2) * 2 * w * (1 - run);
    out.head[1] = T.head[1];
    out.head[2] = T.head[2] + sniffSway * 14;
    const bob = w * (lerp(0.008, 0.022, run) * bob2 + rock * 0.03);
    out.hipsPos[0] = fp.hipsPos[0] + shift * 0.012 * s;
    out.hipsPos[1] = fp.hipsPos[1] - bob / s - w * run * 0.035 + pant * 0.002;
    out.hipsPos[2] = fp.hipsPos[2] + w * run * 0.03 * s;

    // ---- paws
    const legs: [V3, number][] = [[fp.hl, 0], [fp.fl, 1], [fp.hr, 2], [fp.fr, 3]];
    for (const [base, i] of legs) {
      const u = ((ph - offs[i]) % 1 + 1) % 1;
      let along: number, up = 0, e = 0;
      if (u < duty) along = 0.5 - u / duty;
      else { e = (u - duty) / (1 - duty); const k = e * e * (3 - 2 * e); along = -0.5 + k; up = Math.sin(e * Math.PI) * lift; }
      const front = i === 1 || i === 3;
      const tx = base[2], tz = -base[0]; // tangent for turning on the spot
      const gx = base[0] + w * along * (this.dx * sweep + tx * turnSweep);
      const gz = base[2] + w * along * (this.dz * sweep + tz * turnSweep) + (front ? 0.02 : -0.01) * s * w * run;
      const gy = up * w * (front ? 1 : 0.85);
      this.tmp[0] = gx; this.tmp[1] = gy; this.tmp[2] = gz;
      const swing = e > 0 ? Math.sin(e * Math.PI) : 0;
      if (front) {
        const side = i === 1 ? 1 : -1;
        const h = frontPaw(d, this.tmp, w * (swing * lerp(70, 110, run) - (u < duty ? sm(duty * 0.7, duty, u) * 15 : 0)), side, side > 0 ? this.hand.L : this.hand.R);
        if (side > 0) out.handL = h; else out.handR = h;
      } else {
        const pitch = d.metaPitch - w * swing * lerp(25, 45, run) + w * (u < duty ? (0.5 - u / duty) * 10 : 0);
        if (i === 0) { out.footPitchL = pitch; hindAnkle(d, this.tmp, pitch, out.footL); }
        else { out.footPitchR = pitch; hindAnkle(d, this.tmp, pitch, out.footR); }
      }
    }
    out.fk = NO_FK;
  }
}
