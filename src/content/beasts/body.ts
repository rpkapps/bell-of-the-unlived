/**
 * Quadruped body plan on the humanoid rig.
 *
 * The engine's rig is humanoid; beasts reuse it posed on all fours so collision, hurt capsules,
 * criticals, AI and saving work unchanged:
 *  - trunk (hips → spine → chest) pitched ~100° forward: the chain runs horizontally from the rump
 *    to the withers. In those bones' local frames +Y is the body axis (toward the head), +Z is
 *    the belly (down) and -Z the back, +X stays the beast's LEFT.
 *  - neck bent back up, head pitched down again: the skull's +Y points along the muzzle.
 *  - arms = FORELEGS: the hand IK target is the paw on the ground ahead ("grip" a little above
 *    the ground; the pastern + paw geometry hangs below the wrist), elbows pointing back.
 *  - legs = HIND LEGS: foot IK places the hock; the foot bone, pitched ~80° toes-down, carries the
 *    metatarsus and paw, so the hind leg is digitigrade (stifle forward, hock back).
 *
 * `QuadDims` describe one species/breed (all lengths for rig scale 1, multiplied by `s`), and
 * `qkey()` turns high-level pose parameters (body offsets, paw offsets, flexes) into a full
 * animation Key that drives every channel — used by both the gait and all authored clips.
 */
import * as THREE from 'three';
import type { Ease, HandKey, Key, V3 } from '../../actors/anim/types';
import { BONE_OFFSET } from '../../actors/rigDefs';

export interface QuadDims {
  /** Clip / move id prefix, e.g. 'wh'. */
  id: string;
  s: number; bulk: number; shoulder: number;
  /** Standing height of the hips bone origin (≈ hip joint), metres at s = 1. */
  hipH: number;
  /** Hips origin z in root space at s = 1 (negative: the root sits mid-body). */
  hipsZ: number;
  /** Standing trunk angles (degrees). */
  trunk: { hips: V3; spine: V3; chest: V3; neck: V3; head: V3 };
  /** Paw placement relative to the shoulder (front) / hip (hind) joints, at s = 1. */
  frontOut: number; hindOut: number; frontFwd: number; hindFwd: number;
  /** Front IK grip height above the ground at s = 1 (pastern + paw hang below the wrist). */
  grip: number;
  /** Hind metatarsus (hock → paw centre) length and standing foot pitch (deg, − = toes down). */
  meta: number; metaPitch: number;
  /** Hind paw centre height (s = 1). */
  pawR: number;
}

/** Pose parameters for `qkey` (angles in degrees, lengths in metres at s = 1). */
export interface QP {
  t: number;
  ease?: Ease;
  /** Whole-body offsets (hips origin). */
  x?: number; y?: number; z?: number;
  /** Whole-trunk rotation at the hips: + pitch = nose down, + roll = belly toward its left, + yaw = turn left. */
  pitch?: number; roll?: number; yaw?: number;
  /** Additive trunk-bone deltas (X bend + = down, Y twist, Z bend + = toward its right). */
  spine?: V3; chest?: V3; neck?: V3; head?: V3;
  /** Paw offsets from the standing footprint (fl = front-left = handL, hl = hind-left = footL). */
  fl?: V3; fr?: V3; hl?: V3; hr?: V3;
  /** Front paw flexion (deg, + folds the paw back under the wrist). */
  flFlex?: number; frFlex?: number;
  /** Hind foot pitch deltas (deg, − = paw trails back, + = paw reaches forward). */
  hlPitch?: number; hrPitch?: number;
}

const D2R = Math.PI / 180;
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _v = new THREE.Vector3();

const add3 = (a: V3, b?: V3): V3 => (b ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : [a[0], a[1], a[2]]);

/** Trunk forward kinematics: joint positions in root space for a trunk pose. */
export function trunkFK(d: QuadDims, hipsPos: V3, ang: { hips: V3; spine: V3; chest: V3; neck: V3; head: V3 }) {
  const s = d.s;
  const qOf = (v: V3) => new THREE.Quaternion().setFromEuler(_e.set(v[0] * D2R, v[1] * D2R, v[2] * D2R, 'XYZ'));
  const off = (b: keyof typeof BONE_OFFSET, lateral = 1) => new THREE.Vector3(BONE_OFFSET[b][0] * s * lateral, BONE_OFFSET[b][1] * s, BONE_OFFSET[b][2] * s);
  const hips = new THREE.Vector3(hipsPos[0], BONE_OFFSET.hips[1] * s + hipsPos[1] * s, hipsPos[2]);
  const qh = qOf(ang.hips);
  const qs = qh.clone().multiply(qOf(ang.spine));
  const qc = qs.clone().multiply(qOf(ang.chest));
  const qn = qc.clone().multiply(qOf(ang.neck));
  const spine = hips.clone().add(off('spine').applyQuaternion(qh));
  const chest = spine.clone().add(off('chest').applyQuaternion(qs));
  const neck = chest.clone().add(off('neck').applyQuaternion(qc));
  const head = neck.clone().add(off('head').applyQuaternion(qn));
  const sh = d.shoulder;
  const shoulder = (side: 1 | -1) => chest.clone()
    .add(new THREE.Vector3(BONE_OFFSET.shoulderL[0] * s * sh * side, BONE_OFFSET.shoulderL[1] * s, 0).applyQuaternion(qc))
    .add(new THREE.Vector3(BONE_OFFSET.upperArmL[0] * s * sh * side, BONE_OFFSET.upperArmL[1] * s, 0).applyQuaternion(qc));
  const hip = (side: 1 | -1) => hips.clone().add(new THREE.Vector3(BONE_OFFSET.thighL[0] * s * side, BONE_OFFSET.thighL[1] * s, 0).applyQuaternion(qh));
  return { hips, spine, chest, neck, head, shoulderL: shoulder(1), shoulderR: shoulder(-1), hipL: hip(1), hipR: hip(-1) };
}

/** Standing footprint (ground points, root space) and derived constants for a breed. */
export interface Footprint { fl: V3; fr: V3; hl: V3; hr: V3; hipsPos: V3 }

const FOOTPRINTS = new WeakMap<QuadDims, Footprint>();
export function footprint(d: QuadDims): Footprint {
  let f = FOOTPRINTS.get(d);
  if (f) return f;
  const s = d.s;
  const hipsPos: V3 = [0, (d.hipH * s - BONE_OFFSET.hips[1] * s) / s, d.hipsZ * s];
  const j = trunkFK(d, hipsPos, d.trunk);
  const fp = (p: THREE.Vector3, out: number, fwd: number, side: 1 | -1): V3 => [p.x + out * s * side, 0, p.z + fwd * s];
  f = { hipsPos, fl: fp(j.shoulderL, d.frontOut, d.frontFwd, 1), fr: fp(j.shoulderR, d.frontOut, d.frontFwd, -1), hl: fp(j.hipL, d.hindOut, d.hindFwd, 1), hr: fp(j.hipR, d.hindOut, d.hindFwd, -1) };
  FOOTPRINTS.set(d, f);
  return f;
}

/** Front paw IK key: grip above the ground point, toes forward, flexed back by `flex` degrees. */
export function frontPaw(d: QuadDims, ground: V3, flex: number, side: 1 | -1, out?: HandKey): HandKey {
  const f = flex * D2R, c = Math.cos(f), sn = Math.sin(f);
  const h = out ?? { p: [0, 0, 0], dir: [0, 0, 1] };
  h.p[0] = ground[0]; h.p[1] = ground[1] + d.grip * d.s; h.p[2] = ground[2];
  h.dir[0] = 0; h.dir[1] = -sn; h.dir[2] = c;
  h.up = h.up ?? [0, 0, 0];
  h.up[0] = 0; h.up[1] = -c; h.up[2] = -sn;
  h.elbow = h.elbow ?? [0, 0, 0];
  h.elbow[0] = 0.25 * side; h.elbow[1] = -0.15; h.elbow[2] = -1;
  h.socket = undefined;
  return h;
}

/** Hind ankle (hock) position for a paw ground point and foot pitch (deg). */
export function hindAnkle(d: QuadDims, ground: V3, pitch: number, out: V3 = [0, 0, 0]): V3 {
  const th = -pitch * D2R, m = d.meta * d.s;
  out[0] = ground[0];
  out[1] = ground[1] + d.pawR * d.s + m * Math.sin(th);
  out[2] = ground[2] - m * Math.cos(th);
  return out;
}

/** Build a full animation key (every channel) from quadruped pose parameters. */
export function qkey(d: QuadDims, p: QP): Key {
  const s = d.s;
  const f = footprint(d);
  const T = d.trunk;
  const hipsPos: V3 = [f.hipsPos[0] + (p.x ?? 0) * s, f.hipsPos[1] + (p.y ?? 0), f.hipsPos[2] + (p.z ?? 0) * s];
  const hips: V3 = [T.hips[0] + (p.pitch ?? 0), T.hips[1] + (p.roll ?? 0), T.hips[2] - (p.yaw ?? 0)];
  const pawG = (base: V3, dv?: V3): V3 => (dv ? [base[0] + dv[0] * s, base[1] + dv[1] * s, base[2] + dv[2] * s] : [...base] as V3);
  const k: Key = {
    t: p.t, ease: p.ease,
    hipsPos, hips,
    spine: add3(T.spine, p.spine), chest: add3(T.chest, p.chest), neck: add3(T.neck, p.neck), head: add3(T.head, p.head),
    handL: frontPaw(d, pawG(f.fl, p.fl), p.flFlex ?? 0, 1),
    handR: frontPaw(d, pawG(f.fr, p.fr), p.frFlex ?? 0, -1),
    footPitchL: d.metaPitch + (p.hlPitch ?? 0),
    footPitchR: d.metaPitch + (p.hrPitch ?? 0),
  };
  k.footL = hindAnkle(d, pawG(f.hl, p.hl), k.footPitchL!);
  k.footR = hindAnkle(d, pawG(f.hr, p.hr), k.footPitchR!);
  return k;
}

/** Tiny helper for clip authoring: `Q(d)(t, {...})`. */
export const Qb = (d: QuadDims) => (t: number, p: Omit<QP, 't'> = {}, ease?: Ease): Key => qkey(d, { ...p, t, ease: ease ?? p.ease });

void _q; void _v;
