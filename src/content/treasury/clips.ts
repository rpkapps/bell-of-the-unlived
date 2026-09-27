/**
 * The Undervaults — animation clips (IK keyframes, root space: +Z forward, −X = character's right).
 * Every enemy attack has a readable windup (≥ 0.5 s; follow-ups are told by the first blow) and a
 * visible recovery. Bosses are authored at the reference 1.8 m scale and multiplied by their rig
 * height (K) so hands land where the scaled arms reach.
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';

const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
const scaler = (K: number) => (x: number, y: number, z: number): V3 => [x * K, y * K, z * K];
const norm3 = (d: V3): V3 => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
/** Left hand further along a two-handed shaft from the right hand's grip. */
const along = (h: HandKey, dist: number, elbow: V3 = [0.8, -0.4, -0.35]): HandKey => {
  const d = norm3(h.dir);
  return { p: [h.p[0] + d[0] * dist, h.p[1] + d[1] * dist, h.p[2] + d[2] * dist], dir: h.dir, up: h.up, elbow };
};
const two = (h: HandKey, dist: number, extra: Omit<Key, 't' | 'handR' | 'handL'> & { t: number; ease?: Key['ease'] }): Key => ({ ...extra, handR: h, handL: along(h, dist) });

// ================================================================== starving militia (club / fork)

export const MIL_CLUB: HandKey = S([-0.27, 0.86, 0.14], [-0.1, 0.5, 0.86], { up: [0, -0.86, 0.5] });
const MIL_STOOP = { chest: [14, -4, 0] as V3, spine: [8, 0, 0] as V3, head: [-12, 0, 0] as V3, hipsPos: [0, -0.07, 0] as V3 };
const mil = (t: number): Key => ({ t, ease: 'inout', handR: MIL_CLUB, handL: null, ...MIL_STOOP, hips: [0, 0, 0], fk: { upperArmL: [-15, 0, 10], forearmL: [-45, 0, 0] } });
const CLUB_LOW = S([0.05, 0.55, 0.55], [0.05, -0.75, 0.65]);

export const FORK_R: HandKey = S([-0.2, 0.92, 0.02], [0.03, 0.3, 0.95], { up: [0, 1, 0], elbow: [-0.7, -0.5, -0.4] });
const fork = (t: number): Key => ({ t, ease: 'inout', handR: FORK_R, handL: along(FORK_R, 0.45), ...MIL_STOOP });
const forkAt = (p: V3, dir: V3 = [0.02, 0.08, 1]): HandKey => S(p, dir, { up: [0, 1, 0], elbow: [-0.7, -0.4, -0.5] });

// ================================================================== debt collectors

const KC = 1.08;
const vc = scaler(KC);
export const COL_HOOK: HandKey = S(vc(-0.25, 0.92, 0.16), [-0.05, 0.8, 0.6], { up: [0, -0.6, 0.8] });
const COL_LEFT = { upperArmL: [-18, 0, 12] as V3, forearmL: [-55, 0, 0] as V3 };
const col = (t: number): Key => ({ t, ease: 'inout', handR: COL_HOOK, handL: null, chest: [2, -4, 0], spine: [2, 0, 0], head: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0], fk: COL_LEFT });

// ================================================================== clockwork sentries

const KS = 1.05;
const vs = scaler(KS);
export const CW_R: HandKey = S(vs(-0.18, 1.0, 0.1), [0.05, 0.65, 0.76], { up: [0, -0.76, 0.65], elbow: [-0.8, -0.4, -0.3] });
const cw = (t: number): Key => ({ ...two(CW_R, 0.5 * KS, { t, ease: 'inout' }), chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.03, 0] });
/** Glaive held out horizontally at angle θ (deg, toward the character's left from the front). */
const spinAt = (deg: number, h = 1.12): Key['handR'] => {
  const a = (deg * Math.PI) / 180;
  const d: V3 = [Math.sin(a), 0.04, Math.cos(a)];
  return S(vs(Math.sin(a) * 0.32, h, Math.cos(a) * 0.32), d, { up: [0, 1, 0], elbow: [-Math.cos(a) * 0.5 - 0.4, -0.6, Math.sin(a) * 0.5] });
};
const spinKey = (t: number, deg: number, ease: Key['ease'] = 'linear'): Key => {
  const r = spinAt(deg)!;
  return { t, ease, handR: r, handL: along(r, 0.42 * KS, [0.5, -0.6, -0.4]), spine: [0, deg * 0.35, 0], chest: [0, deg * 0.35, 0], hipsPos: [0, -0.14, 0] };
};

// small gilded coin-sentinels (0.8 scale) with a short spear
const KN = 0.8;
const vn = scaler(KN);
export const CS_SPEAR: HandKey = S(vn(-0.24, 0.95, 0.12), [0, 0.2, 0.98], { up: [0, 1, 0], elbow: [-0.6, -0.6, -0.4] });

// ================================================================== vault guardians

const KG = 1.22;
const vg = scaler(KG);
export const VG_R: HandKey = S(vg(-0.15, 0.95, 0.22), [0.35, 0.75, 0.55], { up: [0, -0.6, 0.8], elbow: [-0.8, -0.5, -0.3] });
const vgk = (t: number): Key => ({ ...two(VG_R, 0.42 * KG, { t, ease: 'inout' }), chest: [4, 0, 0], spine: [2, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.05, 0] });
const VG_KNEEL: Omit<Key, 't'> = {
  hipsPos: [0, -0.5 * KG, 0], hips: [8, 0, 0], spine: [12, 0, 0], chest: [16, 0, 0], neck: [12, 0, 0], head: [26, 0, 0],
  footL: vg(0.15, 0.08, 0.36), footR: vg(-0.14, 0.12, -0.42), footPitchR: -60,
  handR: S(vg(-0.04, 1.02, 0.5), [0, -0.96, 0.25], { up: [0, 0.25, 0.96], elbow: [-0.8, -0.3, -0.3] }),
  handL: S(vg(0.02, 1.1, 0.48), [0, -0.96, 0.25], { elbow: [0.8, -0.3, -0.3] }),
};

// ================================================================== coin-mimics

export const MIM_R: HandKey = S([-0.42, 1.18, 0.25], [-0.3, 0.2, 0.9], { elbow: [-0.9, 0.2, -0.3] });
export const MIM_L: HandKey = S([0.42, 1.18, 0.25], [0.3, 0.2, 0.9], { elbow: [0.9, 0.2, -0.3] });
const DISGUISE: Omit<Key, 't'> = {
  hipsPos: [0, -0.58, 0.05], hips: [0, 0, 0], spine: [25, 0, 0], chest: [15, 0, 0], neck: [0, 0, 0],
  footL: [0.14, 0.03, -0.24], footR: [-0.14, 0.03, -0.24], footPitchL: 0, footPitchR: 0,
  handL: S([0.17, 0.66, 0.14], [0, 1, 0], { elbow: [0.5, -0.6, -0.5] }), handR: S([-0.17, 0.66, 0.14], [0, 1, 0], { elbow: [-0.5, -0.6, -0.5] }),
};
const mim = (t: number, head = -8): Key => ({ t, ease: 'inout', handR: MIM_R, handL: MIM_L, head: [head, 0, 0], hipsPos: [0, -0.06, 0], spine: [0, 0, 0], chest: [0, 0, 0] });

const KM = 1.55;
const vm = scaler(KM);
export const SOV_R: HandKey = S(vm(-0.42, 1.18, 0.25), [-0.3, 0.2, 0.9], { elbow: [-0.9, 0.2, -0.3] });
export const SOV_L: HandKey = S(vm(0.42, 1.18, 0.25), [0.3, 0.2, 0.9], { elbow: [0.9, 0.2, -0.3] });
const sov = (t: number, head = -10): Key => ({ t, ease: 'inout', handR: SOV_R, handL: SOV_L, head: [head, 0, 0], hipsPos: [0, -0.08 * KM, 0], spine: [0, 0, 0], chest: [0, 0, 0] });

// ================================================================== ledger wardens (arbalest)

export const LW_R: HandKey = S([-0.24, 0.98, 0.22], [0.15, 0.35, 0.92], { up: [0, -0.94, 0.34] });
export const LW_L: HandKey = S([-0.08, 1.06, 0.44], [0.15, 0.35, 0.92], { elbow: [0.8, -0.4, -0.3] });
const LW_AIM_R: HandKey = S([-0.12, 1.42, 0.3], [0, 0.02, 1], { up: [0, -1, 0.02], elbow: [-0.9, -0.2, -0.2] });
const LW_AIM_L: HandKey = S([-0.06, 1.42, 0.56], [0, 0.02, 1], { elbow: [0.7, -0.6, -0.2] });
const lw = (t: number): Key => ({ t, ease: 'inout', handR: LW_R, handL: LW_L, chest: [2, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] });

// ================================================================== Treasurer Aurel Mask

const KA = 1.14;
const va = scaler(KA);
export const AU_ROD: HandKey = S(va(-0.25, 1.0, 0.2), [-0.05, 0.9, 0.42], { up: [0, -0.42, 0.9] });
const AU_LEFT = { upperArmL: [-22, 0, 16] as V3, forearmL: [-75, 0, 0] as V3 };
const au = (t: number): Key => ({ t, ease: 'inout', handR: AU_ROD, handL: null, chest: [2, -6, 0], spine: [2, 0, 0], neck: [0, 0, 0], head: [-4, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0], fk: AU_LEFT });
const AU_HIGH_R = S(va(-0.42, 1.7, -0.1), [-0.3, 0.72, -0.62], { elbow: [-0.9, 0, -0.2] });
const AU_MID = S(va(-0.1, 1.28, 0.6), [0.35, 0.28, 0.9]);
const AU_LOW_L = S(va(0.32, 0.8, 0.42), [0.85, -0.45, 0.28]);
const AU_HIGH_L = S(va(0.36, 1.12, 0.1), [0.85, 0.3, -0.42], { elbow: [-0.2, -0.8, -0.4] });
const AU_MID2 = S(va(0, 1.24, 0.64), [-0.2, 0.3, 0.93]);
const AU_LOW_R = S(va(-0.46, 1.28, 0.3), [-0.92, 0.3, 0.2]);
const AU_OVER = S(va(0.0, 2.05, 0.02), [0, 0.95, -0.3], { up: [0, 0.3, 0.95], elbow: [-0.9, 0.2, -0.2] });
const AU_DOWN = S(va(0.0, 1.0, 0.62), [0, -0.9, 0.42], { up: [0, 0.42, 0.9] });

export const treasuryClips = {
  // ---------------------------------------------------------------- militia: club
  /** Wild overhead chop: club hauled far back over the head (0.55 s tell). */
  trMilFlail: new Clip('trMilFlail', [
    mil(0),
    { t: 0.5, ease: 'out', handR: S([-0.2, 1.72, -0.18], [-0.1, 0.25, -0.96], { elbow: [-0.9, 0.3, -0.2] }), chest: [-12, -20, 0], spine: [-4, -8, 0], hipsPos: [0, -0.02, -0.05], head: [0, 10, 0], fk: { upperArmL: [-40, 0, 30], forearmL: [-60, 0, 0] } },
    { t: 0.6, ease: 'in', handR: S([-0.08, 1.35, 0.55], [0, 0.55, 0.83]), chest: [10, -2, 0], spine: [6, 0, 0], footL: [0.13, 0.08, 0.34] },
    { t: 0.7, ease: 'out', handR: CLUB_LOW, chest: [34, 6, 0], spine: [16, 0, 0], hipsPos: [0, -0.2, 0.1], head: [-20, 0, 0] },
    { t: 1.0, handR: CLUB_LOW, chest: [32, 6, 0], spine: [15, 0, 0], hipsPos: [0, -0.19, 0.09] },
    mil(1.35),
  ]),
  /** Follow-up upward backhand (the chop is its tell). */
  trMilFlail2: new Clip('trMilFlail2', [
    { t: 0, handR: CLUB_LOW, handL: null, chest: [32, 6, 0], spine: [15, 0, 0], hipsPos: [0, -0.19, 0.09], head: [-18, 0, 0] },
    { t: 0.3, ease: 'out', handR: S([-0.36, 0.72, 0.12], [-0.8, 0.2, 0.5]), chest: [20, -26, 0], spine: [10, -10, 0] },
    { t: 0.42, ease: 'in', handR: S([0, 1.2, 0.6], [0.5, 0.6, 0.62]), chest: [6, 0, 0], spine: [4, 0, 0], footR: [-0.13, 0.08, 0.28] },
    { t: 0.52, ease: 'out', handR: S([0.36, 1.5, 0.22], [0.85, 0.5, -0.1]), chest: [-6, 30, 0], spine: [-2, 12, 0], hipsPos: [0, -0.06, 0.04] },
    { t: 0.85, handR: S([0.34, 1.46, 0.2], [0.8, 0.55, -0.1]), chest: [-4, 26, 0], spine: [-2, 10, 0] },
    mil(1.2),
  ]),
  /** Desperate diving swing: crouch, throw the whole body forward, stumble (long punish). */
  trMilLunge: new Clip('trMilLunge', [
    mil(0),
    { t: 0.62, ease: 'out', handR: S([-0.32, 1.3, -0.35], [-0.2, 0.6, -0.75], { elbow: [-0.9, 0.1, -0.3] }), chest: [4, -30, 0], spine: [10, -10, 0], hipsPos: [0, -0.28, -0.12], footR: [-0.15, 0.08, -0.36], head: [-20, 0, 0] },
    { t: 0.72, ease: 'in', handR: S([-0.05, 1.05, 0.72], [0, 0.3, 0.95]), chest: [24, 0, 0], spine: [14, 0, 0], hipsPos: [0, -0.24, 0.2], footL: [0.14, 0.08, 0.6] },
    { t: 0.82, ease: 'out', handR: S([0.08, 0.45, 0.7], [0.1, -0.8, 0.6]), chest: [44, 10, 0], spine: [22, 0, 0], hipsPos: [0, -0.4, 0.24], head: [-30, 0, 0] },
    { t: 1.3, handR: S([0.1, 0.42, 0.66], [0.1, -0.8, 0.6]), chest: [42, 10, 0], spine: [22, 0, 0], hipsPos: [0, -0.42, 0.22] },
    mil(1.9),
  ]),
  // ---------------------------------------------------------------- militia: fork
  trForkJab: new Clip('trForkJab', [
    fork(0),
    { t: 0.5, ease: 'out', handR: forkAt([-0.26, 1.0, -0.3]), handL: forkAt([-0.12, 1.08, 0.12]), chest: [6, -28, 0], spine: [4, -10, 0], hipsPos: [0, -0.14, -0.08], footR: [-0.15, 0.08, -0.3] },
    { t: 0.62, ease: 'out', handR: forkAt([-0.1, 1.05, 0.55]), handL: forkAt([0.0, 1.1, 0.96]), chest: [16, 6, 0], spine: [8, 2, 0], hipsPos: [0, -0.18, 0.12], footL: [0.14, 0.08, 0.5] },
    { t: 0.95, handR: forkAt([-0.1, 1.04, 0.52]), handL: forkAt([0.0, 1.08, 0.92]), chest: [16, 6, 0], hipsPos: [0, -0.17, 0.1] },
    fork(1.3),
  ]),
  trForkLunge: new Clip('trForkLunge', [
    fork(0),
    { t: 0.65, ease: 'out', handR: forkAt([-0.3, 0.95, -0.42]), handL: forkAt([-0.16, 1.02, 0.02]), chest: [10, -34, 0], spine: [8, -12, 0], hipsPos: [0, -0.26, -0.12], footR: [-0.16, 0.08, -0.4], head: [-16, 0, 0] },
    { t: 0.76, ease: 'out', handR: forkAt([-0.08, 0.98, 0.68]), handL: forkAt([0.02, 1.02, 1.1], [0.02, -0.02, 1]), chest: [28, 6, 0], spine: [16, 2, 0], hipsPos: [0, -0.3, 0.2], footL: [0.14, 0.08, 0.66] },
    { t: 1.2, handR: forkAt([-0.08, 0.92, 0.64], [0.02, -0.1, 1]), handL: forkAt([0.02, 0.96, 1.04], [0.02, -0.1, 1]), chest: [30, 6, 0], spine: [16, 2, 0], hipsPos: [0, -0.32, 0.2] },
    fork(1.8),
  ]),

  // ---------------------------------------------------------------- debt collectors
  /** Hook sweep, right to left: the gaff drawn back over the right shoulder (0.6 s). */
  trColHook: new Clip('trColHook', [
    col(0),
    { t: 0.6, ease: 'out', handR: S(vc(-0.45, 1.5, -0.25), [-0.55, 0.35, -0.75], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -36, 0], spine: [-2, -14, 0], hips: [0, -10, 0], head: [4, 20, 0], hipsPos: [0, -0.06, -0.05] },
    { t: 0.68, ease: 'in', handR: S(vc(-0.05, 1.25, 0.66), [0.3, 0.1, 0.95]), chest: [6, -2, 0], spine: [4, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: vc(0.13, 0.07, 0.34) },
    { t: 0.78, ease: 'out', handR: S(vc(0.45, 1.1, 0.25), [0.9, -0.05, -0.2]), chest: [12, 32, 0], spine: [6, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.12, 0.08] },
    { t: 1.1, handR: S(vc(0.43, 1.1, 0.24), [0.88, -0.02, -0.2]), chest: [10, 28, 0], spine: [6, 12, 0], hipsPos: [0, -0.11, 0.07] },
    col(1.5),
  ]),
  /** Return sweep (follow-up of the hook). */
  trColHook2: new Clip('trColHook2', [
    { t: 0, handR: S(vc(0.43, 1.1, 0.24), [0.88, -0.02, -0.2]), handL: null, chest: [10, 28, 0], spine: [6, 12, 0], hipsPos: [0, -0.11, 0.07], fk: COL_LEFT },
    { t: 0.3, ease: 'out', handR: S(vc(0.4, 1.35, -0.05), [0.8, 0.4, -0.45]), chest: [2, 36, 0], spine: [0, 14, 0] },
    { t: 0.4, ease: 'in', handR: S(vc(0, 1.22, 0.66), [-0.2, 0.2, 0.95]), chest: [4, 0, 0], spine: [2, 0, 0], footR: vc(-0.13, 0.07, 0.3) },
    { t: 0.52, ease: 'out', handR: S(vc(-0.5, 1.15, 0.2), [-0.95, 0.1, -0.1]), chest: [4, -32, 0], spine: [2, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.9, handR: S(vc(-0.48, 1.15, 0.2), [-0.9, 0.15, -0.1]), chest: [4, -28, 0], spine: [2, -10, 0] },
    col(1.3),
  ]),
  /**
   * The grab (unblockable): the gilt left hand drawn back open beside the hip (0.8 s — the open-hand
   * tell), then a lunging reach; a whiff leaves him over-extended for almost a second.
   */
  trColGrab: new Clip('trColGrab', [
    col(0),
    { t: 0.8, ease: 'out', handL: S(vc(0.34, 1.12, -0.28), [0, 1, 0.15], { elbow: [0.8, -0.2, -0.5] }), handR: S(vc(-0.36, 1.0, 0.0), [-0.4, 0.8, -0.2]), chest: [-4, 30, 0], spine: [0, 12, 0], hipsPos: [0, -0.1, -0.1], head: [0, -10, 0], fk: {} },
    { t: 0.88, ease: 'out', handL: S(vc(0.08, 1.3, 0.98), [0, 0.3, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [16, -10, 0], spine: [8, -4, 0], hipsPos: [0, -0.18, 0.18], head: [-6, 0, 0], footL: vc(0.13, 0.07, 0.58) },
    { t: 1.0, handL: S(vc(0.08, 1.26, 0.92), [0, 0.1, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [18, -10, 0], spine: [9, -4, 0], hipsPos: [0, -0.2, 0.18] },
    { t: 1.45, handL: S(vc(0.1, 1.2, 0.86), [0, 0.0, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [18, -8, 0], spine: [9, -4, 0], hipsPos: [0, -0.2, 0.16] },
    col(1.95),
  ]),

  // ---------------------------------------------------------------- clockwork sentries
  /** The spin: the waist winds right with a ratchet (0.7 s tell), then one full clockwork turn. */
  trCwSpin: new Clip('trCwSpin', [
    cw(0),
    spinKey(0.35, -60, 'out'),
    spinKey(0.7, -125, 'out'),
    spinKey(0.8, -45),
    spinKey(0.88, 45),
    spinKey(0.96, 135),
    spinKey(1.04, 225),
    spinKey(1.12, 280, 'out'),
    spinKey(1.6, 280),
    cw(2.2),
  ]),
  trCwThrust: new Clip('trCwThrust', [
    cw(0),
    { ...two(S(vs(-0.26, 1.1, -0.38), [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] }), 0.5 * KS, { t: 0.6, ease: 'out' }), chest: [0, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, -0.08], footR: vs(-0.16, 0.08, -0.34) },
    { ...two(S(vs(-0.1, 1.12, 0.55), [0, 0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] }), 0.5 * KS, { t: 0.72, ease: 'out' }), chest: [10, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.16, 0.12], footL: vs(0.14, 0.08, 0.52) },
    { ...two(S(vs(-0.1, 1.1, 0.52), [0, 0.0, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] }), 0.5 * KS, { t: 1.05 }), chest: [10, 6, 0], hipsPos: [0, -0.15, 0.1] },
    cw(1.5),
  ]),
  /** A small clockwork head-tick while standing watch (loop). */
  trCwWatch: new Clip('trCwWatch', [
    { ...cw(0), head: [0, -8, 0] },
    { ...cw(0.5), head: [0, -8, 0], ease: 'hold' },
    { ...cw(0.55), head: [0, 8, 0], ease: 'out' },
    { ...cw(1.5), head: [0, 8, 0], ease: 'hold' },
    { ...cw(1.55), head: [0, -8, 0], ease: 'out' },
  ], { loop: true, duration: 2.0 }),
  trCsJab: new Clip('trCsJab', [
    { t: 0, handR: CS_SPEAR, handL: null },
    { t: 0.55, ease: 'out', handR: S(vn(-0.3, 1.2, -0.35), [0, -0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -34, 0], spine: [0, -12, 0], hipsPos: [0, -0.08, -0.05], footR: vn(-0.16, 0.08, -0.3), fk: { upperArmL: [-50, 0, 20], forearmL: [-40, 0, 0] } },
    { t: 0.66, ease: 'out', handR: S(vn(-0.05, 1.25, 0.72), [0, -0.03, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.13, 0.1], footL: vn(0.14, 0.08, 0.5) },
    { t: 0.95, handR: S(vn(-0.06, 1.24, 0.68), [0, -0.04, 1], { up: [0, 1, 0] }), chest: [10, 6, 0] },
    { t: 1.3, ease: 'inout', handR: CS_SPEAR, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.03, 0], footL: vn(0.12, 0.08, 0.02), footR: vn(-0.12, 0.08, -0.03) },
  ]),

  // ---------------------------------------------------------------- vault guardians
  /** Dormant: kneeling over the maul's head (loop, a slow breath of light). */
  trVgDormant: new Clip('trVgDormant', [
    { t: 0, ...VG_KNEEL },
    { t: 2.2, ...VG_KNEEL, head: [22, 0, 0], chest: [14, 0, 0] },
    { t: 4.4, ...VG_KNEEL },
  ], { loop: true, duration: 4.4 }),
  /** Overhead slam (1.0 s tell: the maul rises over the helm), shock at impact. */
  trVgOverhead: new Clip('trVgOverhead', [
    vgk(0),
    { ...two(S(vg(-0.05, 1.95, -0.12), [0, 0.35, -0.94], { up: [0, 0.94, 0.35], elbow: [-0.9, 0.2, -0.2] }), 0.42 * KG, { t: 1.0, ease: 'out' }), chest: [-18, 0, 0], spine: [-8, 0, 0], hipsPos: [0, 0.02, -0.06], head: [-6, 0, 0] },
    { ...two(S(vg(0, 1.55, 0.5), [0, 0.4, 0.92], { up: [0, -0.92, 0.4] }), 0.42 * KG, { t: 1.1, ease: 'in' }), chest: [8, 0, 0], spine: [4, 0, 0], footL: vg(0.14, 0.08, 0.36) },
    { ...two(S(vg(0, 0.72, 0.62), [0, -0.55, 0.83], { up: [0, -0.83, -0.55] }), 0.42 * KG, { t: 1.18, ease: 'out' }), chest: [34, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.24, 0.1], head: [-12, 0, 0] },
    { ...two(S(vg(0, 0.72, 0.6), [0, -0.55, 0.83], { up: [0, -0.83, -0.55] }), 0.42 * KG, { t: 1.75 }), chest: [32, 0, 0], spine: [15, 0, 0], hipsPos: [0, -0.23, 0.09] },
    vgk(2.3),
  ]),
  /** Horizontal sweep right → left (0.8 s tell). */
  trVgSweep: new Clip('trVgSweep', [
    vgk(0),
    { ...two(S(vg(-0.5, 1.25, -0.3), [-0.8, 0.2, -0.55], { up: [0, 1, 0], elbow: [-0.9, 0.1, -0.2] }), 0.42 * KG, { t: 0.8, ease: 'out' }), chest: [-4, -40, 0], spine: [-2, -16, 0], hips: [0, -10, 0], hipsPos: [0, -0.1, -0.06] },
    { ...two(S(vg(0, 1.15, 0.62), [0.2, 0.05, 0.98], { up: [0, 1, 0] }), 0.42 * KG, { t: 0.92, ease: 'in' }), chest: [6, 0, 0], spine: [2, 0, 0], hips: [0, 0, 0], footL: vg(0.14, 0.08, 0.36) },
    { ...two(S(vg(0.5, 1.1, 0.25), [0.9, 0.0, -0.4], { up: [0, 1, 0] }), 0.42 * KG, { t: 1.02, ease: 'out' }), chest: [8, 38, 0], spine: [4, 16, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.06] },
    { ...two(S(vg(0.48, 1.08, 0.24), [0.9, 0.0, -0.4], { up: [0, 1, 0] }), 0.42 * KG, { t: 1.45 }), chest: [8, 34, 0], spine: [4, 14, 0] },
    vgk(1.9),
  ]),
  /** Stomp (unparryable): the right knee rises high (0.9 s), the floor jumps around him. */
  trVgStomp: new Clip('trVgStomp', [
    vgk(0),
    { ...vgk(0.9), ease: 'out', footR: vg(-0.14, 0.62, 0.18), footPitchR: 10, hipsPos: [0, 0.06, -0.04], chest: [-10, 0, 0], spine: [-6, 0, 0], head: [-10, 0, 0] },
    { ...vgk(0.98), ease: 'in', footR: vg(-0.14, 0.08, 0.2), footPitchR: 0, hipsPos: [0, -0.16, 0.04], chest: [18, 0, 0], spine: [10, 0, 0] },
    { ...vgk(1.35), footR: vg(-0.14, 0.08, 0.2), hipsPos: [0, -0.15, 0.03], chest: [16, 0, 0], spine: [9, 0, 0] },
    vgk(1.8),
  ]),
  /** Waking: rising from the kneel, maul lifted (no hits). */
  trVgWake: new Clip('trVgWake', [
    { t: 0, ...VG_KNEEL },
    { t: 0.7, ease: 'out', ...VG_KNEEL, head: [-20, 0, 0], neck: [-8, 0, 0], chest: [-6, 0, 0], hipsPos: [0, -0.3 * KG, 0] },
    vgk(1.5),
  ]),

  // ---------------------------------------------------------------- coin-mimics
  /** Disguise: squatting flat as a chest, the lid breathing ever so slightly (loop). */
  trMimicDisguise: new Clip('trMimicDisguise', [
    { t: 0, ...DISGUISE, head: [-2, 0, 0] },
    { t: 1.7, ...DISGUISE, head: [-9, 0, 0], hipsPos: [0, -0.575, 0.05] },
    { t: 3.4, ...DISGUISE, head: [-2, 0, 0] },
  ], { loop: true, duration: 3.4 }),
  /** Unfolding: the lid bursts open, legs and chains spring out (no hits; 1.0 s). */
  trMimicRise: new Clip('trMimicRise', [
    { t: 0, ...DISGUISE, head: [-4, 0, 0] },
    { t: 0.25, ease: 'out', head: [-80, 0, 0], hipsPos: [0, -0.34, 0], spine: [-8, 0, 0], chest: [-6, 0, 0], handL: S([0.72, 1.3, 0.25], [1, 0.3, 0]), handR: S([-0.72, 1.3, 0.25], [-1, 0.3, 0]), footL: [0.18, 0.08, 0.02], footR: [-0.18, 0.08, 0.0] },
    { t: 0.6, head: [-45, 0, 0], hipsPos: [0, -0.08, 0], spine: [0, 0, 0], chest: [0, 0, 0] },
    mim(1.0),
  ]),
  /** Lunging bite: crouch back with the lid gaping (0.55 s), spring, snap shut. */
  trMimBite: new Clip('trMimBite', [
    mim(0),
    { t: 0.55, ease: 'out', head: [-80, 0, 0], hipsPos: [0, -0.28, -0.14], spine: [-10, 0, 0], chest: [-6, 0, 0], handL: S([0.55, 1.1, -0.2], [0.8, 0.2, -0.5]), handR: S([-0.55, 1.1, -0.2], [-0.8, 0.2, -0.5]), footL: [0.14, 0.08, -0.12], footR: [-0.14, 0.08, -0.16] },
    { t: 0.64, ease: 'out', head: [-80, 0, 0], hipsPos: [0, -0.06, 0.26], spine: [20, 0, 0], chest: [8, 0, 0], footL: [0.14, 0.08, 0.4] },
    { t: 0.7, ease: 'in', head: [0, 0, 0] },
    { t: 1.05, head: [-6, 0, 0], hipsPos: [0, -0.14, 0.16], spine: [16, 0, 0] },
    mim(1.45),
  ]),
  /** Both chain-arms raised high (0.7 s), then slammed down in front. */
  trMimSlam: new Clip('trMimSlam', [
    mim(0),
    { t: 0.7, ease: 'out', handR: S([-0.3, 2.05, 0.05], [0, 1, 0.1]), handL: S([0.3, 2.05, 0.05], [0, 1, 0.1]), head: [-50, 0, 0], hipsPos: [0, 0.02, -0.06], spine: [-12, 0, 0] },
    { t: 0.8, ease: 'in', handR: S([-0.25, 0.35, 0.8], [0, -0.7, 0.7]), handL: S([0.25, 0.35, 0.8], [0, -0.7, 0.7]), head: [-10, 0, 0], hipsPos: [0, -0.2, 0.1], spine: [26, 0, 0] },
    { t: 1.2, handR: S([-0.25, 0.3, 0.78], [0, -0.7, 0.7]), handL: S([0.25, 0.3, 0.78], [0, -0.7, 0.7]), hipsPos: [0, -0.2, 0.1], spine: [24, 0, 0] },
    mim(1.65),
  ]),
  /** Death: folds back into a chest and falls still. */
  trMimDeath: new Clip('trMimDeath', [
    mim(0, -30),
    { t: 0.5, ease: 'out', ...DISGUISE, head: [-60, 0, 0], hipsPos: [0, -0.5, 0.05] },
    { t: 1.2, ...DISGUISE, head: [-20, 0, 0], hipsPos: [0, -0.6, 0.05] },
  ]),

  // ---------------------------------------------------------------- the Mimic Sovereign
  trSovRise: new Clip('trSovRise', [
    { t: 0, ...DISGUISE, hipsPos: vm(0, -0.58, 0.05), footL: vm(0.14, 0.03, -0.24), footR: vm(-0.14, 0.03, -0.24), handL: S(vm(0.17, 0.66, 0.14), [0, 1, 0]), handR: S(vm(-0.17, 0.66, 0.14), [0, 1, 0]), head: [-4, 0, 0] },
    { t: 0.5, ease: 'out', head: [-85, 0, 0], hipsPos: vm(0, -0.34, 0), handL: S(vm(0.75, 1.35, 0.25), [1, 0.3, 0]), handR: S(vm(-0.75, 1.35, 0.25), [-1, 0.3, 0]), footL: vm(0.2, 0.08, 0.02), footR: vm(-0.2, 0.08, 0) },
    { t: 1.1, head: [-60, 0, 0], hipsPos: vm(0, -0.06, 0), spine: [-10, 0, 0] },
    sov(1.6),
  ]),
  trSovBite: new Clip('trSovBite', [
    sov(0),
    { t: 0.62, ease: 'out', head: [-85, 0, 0], hipsPos: vm(0, -0.3, -0.16), spine: [-10, 0, 0], handL: S(vm(0.58, 1.1, -0.22), [0.8, 0.2, -0.5]), handR: S(vm(-0.58, 1.1, -0.22), [-0.8, 0.2, -0.5]), footL: vm(0.15, 0.08, -0.14), footR: vm(-0.15, 0.08, -0.18) },
    { t: 0.72, ease: 'out', head: [-85, 0, 0], hipsPos: vm(0, -0.06, 0.28), spine: [22, 0, 0], footL: vm(0.15, 0.08, 0.42) },
    { t: 0.78, ease: 'in', head: [0, 0, 0] },
    { t: 1.2, head: [-6, 0, 0], hipsPos: vm(0, -0.15, 0.18), spine: [18, 0, 0] },
    sov(1.7),
  ]),
  /** One chain-arm sweeping from right to left (0.6 s). */
  trSovSwipe: new Clip('trSovSwipe', [
    sov(0),
    { t: 0.6, ease: 'out', handR: S(vm(-0.85, 1.4, -0.35), [-0.8, 0.3, -0.5]), spine: [0, -30, 0], chest: [0, -20, 0], head: [-30, 0, 0], hipsPos: vm(0, -0.1, -0.05) },
    { t: 0.7, ease: 'in', handR: S(vm(-0.1, 1.0, 0.95), [0, 0, 1]), spine: [4, 0, 0], chest: [0, 0, 0] },
    { t: 0.8, ease: 'out', handR: S(vm(0.85, 0.95, 0.35), [0.9, -0.1, -0.3]), spine: [6, 30, 0], chest: [0, 18, 0], hipsPos: vm(0, -0.12, 0.08) },
    { t: 1.2, handR: S(vm(0.8, 0.95, 0.3), [0.9, -0.1, -0.3]), spine: [6, 26, 0] },
    sov(1.6),
  ]),
  /** Leaping slam (unparryable): a deep crouch (0.9 s), airborne, a crash that shakes the hoard. */
  trSovSlam: new Clip('trSovSlam', [
    sov(0),
    { t: 0.9, ease: 'out', hipsPos: vm(0, -0.42, -0.06), head: [-40, 0, 0], handR: S(vm(-0.5, 0.7, 0.1), [-0.4, -0.5, 0.7]), handL: S(vm(0.5, 0.7, 0.1), [0.4, -0.5, 0.7]), footL: vm(0.2, 0.08, 0.1), footR: vm(-0.2, 0.08, 0.1) },
    { t: 1.15, ease: 'out', hipsPos: vm(0, 0.55, 0.1), head: [-70, 0, 0], handR: S(vm(-0.4, 2.0, 0.1), [0, 1, 0]), handL: S(vm(0.4, 2.0, 0.1), [0, 1, 0]), footL: vm(0.16, 0.5, 0), footR: vm(-0.16, 0.5, 0) },
    { t: 1.32, ease: 'in', hipsPos: vm(0, -0.34, 0.1), head: [0, 0, 0], handR: S(vm(-0.5, 0.3, 0.7), [0, -0.8, 0.6]), handL: S(vm(0.5, 0.3, 0.7), [0, -0.8, 0.6]), footL: vm(0.2, 0.08, 0.1), footR: vm(-0.2, 0.08, 0.1) },
    { t: 1.9, hipsPos: vm(0, -0.32, 0.08), head: [-6, 0, 0] },
    sov(2.5),
  ]),
  /** Coin spray: rears back, lid wide, retches three volleys of coin (0.8 s). */
  trSovSpit: new Clip('trSovSpit', [
    sov(0),
    { t: 0.8, ease: 'out', head: [-80, 0, 0], hipsPos: vm(0, -0.12, -0.12), spine: [-16, 0, 0], chest: [-10, 0, 0] },
    { t: 0.9, head: [-70, 0, 0], spine: [8, 0, 0], hipsPos: vm(0, -0.16, 0.05) },
    { t: 1.13, head: [-82, 0, 0], spine: [-8, 0, 0] },
    { t: 1.23, head: [-70, 0, 0], spine: [8, 0, 0] },
    { t: 1.36, head: [-82, 0, 0], spine: [-8, 0, 0] },
    { t: 1.46, head: [-70, 0, 0], spine: [8, 0, 0] },
    sov(2.2),
  ]),
  /** Phase change: it heaves, spilling coin, and roars (uninterruptible). */
  trSovRoar: new Clip('trSovRoar', [
    sov(0),
    { t: 0.6, ease: 'out', head: [-90, 0, 0], hipsPos: vm(0, 0.05, -0.1), spine: [-20, 0, 0], handL: S(vm(0.85, 1.6, 0.1), [1, 0.5, 0]), handR: S(vm(-0.85, 1.6, 0.1), [-1, 0.5, 0]) },
    { t: 1.8, head: [-85, 0, 0], spine: [-18, 0, 0], hipsPos: vm(0, 0.04, -0.1) },
    sov(2.4),
  ]),
  trSovDeath: new Clip('trSovDeath', [
    sov(0, -40),
    { t: 0.8, ease: 'out', hipsPos: vm(0, -0.4, 0), head: [-80, 0, 0], spine: [-10, 0, 0] },
    { t: 2.0, ...DISGUISE, hipsPos: vm(0, -0.6, 0.05), footL: vm(0.14, 0.03, -0.24), footR: vm(-0.14, 0.03, -0.24), handL: S(vm(0.17, 0.66, 0.14), [0, 1, 0]), handR: S(vm(-0.17, 0.66, 0.14), [0, 1, 0]), head: [-30, 0, 0] },
  ]),

  // ---------------------------------------------------------------- ledger wardens
  /** Raise the arbalest to the cheek and hold (bowstring caption), loose, lower. */
  trLwShoot: new Clip('trLwShoot', [
    lw(0),
    { t: 0.45, ease: 'out', handR: LW_AIM_R, handL: LW_AIM_L, chest: [0, -12, 0], spine: [0, -4, 0], head: [4, 10, 0], hipsPos: [0, -0.08, -0.03], footR: [-0.15, 0.08, -0.25] },
    { t: 1.2, handR: LW_AIM_R, handL: LW_AIM_L, chest: [0, -12, 0], head: [4, 10, 0] },
    { t: 1.28, ease: 'out', handR: S([-0.12, 1.5, 0.22], [0, 0.25, 0.97], { up: [0, -0.97, 0.25] }), handL: S([-0.06, 1.52, 0.46], [0, 0.25, 0.97]), chest: [-6, -12, 0] },
    lw(1.75),
  ]),
  /** Stock bash when cornered (0.5 s). */
  trLwBash: new Clip('trLwBash', [
    lw(0),
    { t: 0.5, ease: 'out', handR: S([-0.3, 1.2, -0.1], [0.3, 0.8, 0.5], { up: [0, -0.5, 0.86] }), handL: S([-0.1, 1.35, 0.1], [0.3, 0.8, 0.5]), chest: [-6, -30, 0], spine: [-2, -10, 0], hipsPos: [0, -0.06, -0.06] },
    { t: 0.6, ease: 'out', handR: S([-0.05, 1.25, 0.6], [0, 0.9, 0.4], { up: [0, -0.4, 0.9] }), handL: S([0.02, 1.4, 0.72], [0, 0.9, 0.4]), chest: [12, 10, 0], spine: [6, 4, 0], hipsPos: [0, -0.12, 0.1], footL: [0.14, 0.08, 0.42] },
    { t: 0.85, handR: S([-0.05, 1.22, 0.56], [0, 0.9, 0.4], { up: [0, -0.4, 0.9] }), handL: S([0.02, 1.37, 0.68], [0, 0.9, 0.4]), chest: [12, 10, 0] },
    lw(1.2),
  ]),

  // ---------------------------------------------------------------- the Sovereign's disguise
  trSovDormant: new Clip('trSovDormant', [
    { t: 0, ...DISGUISE, hipsPos: vm(0, -0.58, 0.05), footL: vm(0.14, 0.03, -0.24), footR: vm(-0.14, 0.03, -0.24), handL: S(vm(0.17, 0.66, 0.14), [0, 1, 0]), handR: S(vm(-0.17, 0.66, 0.14), [0, 1, 0]), head: [-2, 0, 0] },
    { t: 2.2, ...DISGUISE, hipsPos: vm(0, -0.575, 0.05), footL: vm(0.14, 0.03, -0.24), footR: vm(-0.14, 0.03, -0.24), handL: S(vm(0.17, 0.66, 0.14), [0, 1, 0]), handR: S(vm(-0.17, 0.66, 0.14), [0, 1, 0]), head: [-10, 0, 0] },
    { t: 4.4, ...DISGUISE, hipsPos: vm(0, -0.58, 0.05), footL: vm(0.14, 0.03, -0.24), footR: vm(-0.14, 0.03, -0.24), handL: S(vm(0.17, 0.66, 0.14), [0, 1, 0]), handR: S(vm(-0.17, 0.66, 0.14), [0, 1, 0]), head: [-2, 0, 0] },
  ], { loop: true, duration: 4.4 }),

  // ---------------------------------------------------------------- ward-coffer
  trCofferIdle: new Clip('trCofferIdle', [
    { t: 0, hipsPos: [0, 0, 0], hips: [0, 0, 0], handR: null, handL: null },
    { t: 1.2, hipsPos: [0, 0.015, 0], hips: [0, 4, 0] },
    { t: 2.4, hipsPos: [0, 0, 0], hips: [0, 0, 0] },
  ], { loop: true, duration: 2.4 }),

  // ---------------------------------------------------------------- Treasurer Aurel Mask
  /** Two strokes of the tally-rod: a diagonal cut (0.55 s tell) and a backhand told by the first. */
  trAuTally: new Clip('trAuTally', [
    au(0),
    { t: 0.5, ease: 'out', handR: AU_HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0], head: [4, 16, 0], fk: { upperArmL: [-50, 0, 40], forearmL: [-40, 0, 0] } },
    { t: 0.6, ease: 'in', handR: AU_MID, chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], footL: va(0.14, 0.07, 0.34) },
    { t: 0.7, ease: 'out', handR: AU_LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.92, ease: 'out', handR: AU_HIGH_L, chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 1.02, ease: 'in', handR: AU_MID2, chest: [4, 0, 0], spine: [2, 0, 0], footR: va(-0.14, 0.07, 0.3) },
    { t: 1.12, ease: 'out', handR: AU_LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 1.4, handR: AU_LOW_R, chest: [-2, -26, 0], spine: [0, -10, 0] },
    au(1.8),
  ]),
  /** The seal-stamp (unparryable): rod raised two-handed over the mask (1.0 s), driven into the floor. */
  trAuStamp: new Clip('trAuStamp', [
    au(0),
    { t: 1.0, ease: 'out', handR: AU_OVER, handL: along(AU_OVER, 0.16), chest: [-16, 0, 0], spine: [-8, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.03, -0.06], fk: {} },
    { t: 1.06, ease: 'in', handR: S(va(0, 1.55, 0.5), [0, 0.3, 0.95]), handL: along(S(va(0, 1.55, 0.5), [0, 0.3, 0.95]), 0.16), chest: [6, 0, 0], footL: va(0.14, 0.07, 0.36) },
    { t: 1.12, ease: 'out', handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [32, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.26, 0.1], head: [-10, 0, 0] },
    { t: 1.7, handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [30, 0, 0], spine: [15, 0, 0], hipsPos: [0, -0.25, 0.09] },
    au(2.2),
  ]),
  /** The audit: left hand raised palm-up; coin-sentinels answer (no hits: a window). */
  trAuAudit: new Clip('trAuAudit', [
    au(0),
    { t: 0.7, ease: 'out', handL: S(va(0.3, 1.95, 0.3), [0, 1, 0.1], { elbow: [0.9, -0.2, -0.2] }), chest: [-10, 10, 0], spine: [-6, 4, 0], head: [-26, 10, 0], fk: {} },
    { t: 1.3, handL: S(va(0.32, 2.0, 0.32), [0, 1, 0.1], { elbow: [0.9, -0.2, -0.2] }), head: [-28, 10, 0] },
    au(1.9),
  ]),
  /** Coin volley flung from the left hand (0.7 s draw-back). */
  trAuCoins: new Clip('trAuCoins', [
    au(0),
    { t: 0.7, ease: 'out', handL: S(va(0.45, 1.15, -0.35), [0.3, 0.6, -0.7], { elbow: [0.8, -0.3, -0.4] }), chest: [0, 30, 0], spine: [0, 12, 0], hipsPos: [0, -0.06, -0.06], fk: {} },
    { t: 0.8, ease: 'out', handL: S(va(0.05, 1.35, 0.7), [0, 0.3, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [8, -18, 0], spine: [4, -8, 0], hipsPos: [0, -0.1, 0.08], footL: va(0.14, 0.07, 0.4) },
    { t: 1.1, handL: S(va(0.05, 1.3, 0.66), [0, 0.2, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [8, -16, 0] },
    au(1.55),
  ]),
  /** The levy (grab): the open left hand (0.85 s), then a lunging reach — a whiff leaves him open. */
  trAuLevy: new Clip('trAuLevy', [
    au(0),
    { t: 0.85, ease: 'out', handL: S(va(0.36, 1.12, -0.3), [0, 1, 0.15], { elbow: [0.8, -0.2, -0.5] }), handR: S(va(-0.36, 1.0, 0.0), [-0.4, 0.8, -0.2]), chest: [-4, 32, 0], spine: [0, 12, 0], hipsPos: [0, -0.1, -0.1], head: [0, -10, 0], fk: {} },
    { t: 0.94, ease: 'out', handL: S(va(0.08, 1.3, 1.0), [0, 0.3, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [16, -10, 0], spine: [8, -4, 0], hipsPos: [0, -0.18, 0.18], footL: va(0.13, 0.07, 0.6) },
    { t: 1.5, handL: S(va(0.1, 1.2, 0.9), [0, 0, 1], { elbow: [0.6, -0.6, -0.3] }), chest: [18, -8, 0], spine: [9, -4, 0], hipsPos: [0, -0.2, 0.16] },
    au(2.05),
  ]),
  /** Phase 2 frenzy: slash, backhand, thrust — then a held overhead (the tell) before the drop. */
  trAuFrenzy: new Clip('trAuFrenzy', [
    au(0),
    { t: 0.4, ease: 'out', handR: AU_HIGH_R, chest: [-10, -34, 0], spine: [-4, -14, 0], fk: {} },
    { t: 0.46, ease: 'in', handR: AU_MID, chest: [8, -2, 0], spine: [6, 0, 0] },
    { t: 0.54, ease: 'out', handR: AU_LOW_L, chest: [16, 30, 0], spine: [8, 14, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.76, ease: 'out', handR: AU_HIGH_L, chest: [6, 34, 0] },
    { t: 0.82, ease: 'in', handR: AU_MID2, chest: [4, 0, 0] },
    { t: 0.9, ease: 'out', handR: AU_LOW_R, chest: [-2, -30, 0], spine: [0, -12, 0] },
    { t: 1.1, ease: 'out', handR: S(va(-0.34, 1.35, -0.3), [0, 0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -38, 0], spine: [0, -16, 0], hipsPos: [0, -0.16, -0.08] },
    { t: 1.2, ease: 'out', handR: S(va(-0.05, 1.3, 0.9), [0.02, -0.03, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.22, 0.14], footL: va(0.14, 0.07, 0.6) },
    { t: 1.5, ease: 'out', handR: AU_OVER, handL: along(AU_OVER, 0.16), chest: [-18, 0, 0], spine: [-8, 0, 0], head: [-16, 0, 0], hipsPos: [0, 0.02, -0.04] },
    { t: 1.95, handR: AU_OVER, handL: along(AU_OVER, 0.16), chest: [-19, 0, 0], spine: [-8, 0, 0], head: [-16, 0, 0] },
    { t: 2.02, ease: 'in', handR: S(va(0, 1.5, 0.52), [0, 0.3, 0.95]), handL: along(S(va(0, 1.5, 0.52), [0, 0.3, 0.95]), 0.16), chest: [6, 0, 0] },
    { t: 2.1, ease: 'out', handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [34, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.28, 0.12] },
    { t: 2.8, handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [32, 0, 0], spine: [15, 0, 0], hipsPos: [0, -0.27, 0.11] },
    au(3.3),
  ]),
  /** Ledger-chain whip (unparryable): crouch and wind the chained ledger (0.85 s), one full turn. */
  trAuWhip: new Clip('trAuWhip', [
    au(0),
    { t: 0.85, ease: 'out', hipsPos: [0, -0.22, 0], chest: [10, 50, 0], spine: [6, 20, 0], handL: S(va(0.55, 0.9, -0.4), [0.6, -0.2, -0.7], { elbow: [0.9, 0, -0.3] }), fk: {} },
    { t: 0.93, handL: S(va(0.1, 1.0, 0.75), [0, 0, 1]), chest: [8, 0, 0], spine: [4, 0, 0] },
    { t: 1.01, handL: S(va(-0.7, 1.0, 0.1), [-1, 0, 0]), chest: [8, -50, 0], spine: [4, -20, 0] },
    { t: 1.09, handL: S(va(-0.2, 1.0, -0.6), [0, 0, -1]), chest: [8, -80, 0], spine: [4, -30, 0] },
    { t: 1.5, handL: S(va(0.3, 1.0, -0.3), [0.5, 0, -0.8]), chest: [6, -60, 0], spine: [4, -24, 0], hipsPos: [0, -0.18, 0] },
    au(1.95),
  ]),
  /** Phase 3: the write-off. He raises the rod and names the Returned a debt (2.0 s charge); the ring bursts. */
  trAuWriteoff: new Clip('trAuWriteoff', [
    au(0),
    { t: 0.5, ease: 'out', handR: AU_OVER, handL: S(va(0.6, 1.7, 0.2), [0.8, 0.6, 0], { elbow: [0.9, -0.1, -0.2] }), chest: [-14, 0, 0], spine: [-8, 0, 0], head: [-20, 0, 0], hipsPos: [0, 0.04, 0], fk: {} },
    { t: 1.9, handR: AU_OVER, handL: S(va(0.62, 1.75, 0.22), [0.8, 0.6, 0], { elbow: [0.9, -0.1, -0.2] }), chest: [-18, 0, 0], spine: [-10, 0, 0], head: [-24, 0, 0], hipsPos: [0, 0.06, 0] },
    { t: 2.05, ease: 'out', handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [34, 0, 0], spine: [16, 0, 0], hipsPos: [0, -0.3, 0.1] },
    { t: 3.0, handR: AU_DOWN, handL: along(AU_DOWN, -0.16), chest: [36, 0, 0], spine: [18, 0, 0], hipsPos: [0, -0.34, 0.1], head: [10, 0, 0] },
    au(3.5),
  ]),
  /** Wards broken: he staggers, clutching the cracking mask (uninterruptible, punishable). */
  trAuWardbreak: new Clip('trAuWardbreak', [
    au(0),
    { t: 0.3, ease: 'out', chest: [-22, 10, 0], spine: [-10, 0, 0], head: [-24, 14, 0], hipsPos: [0, -0.08, -0.12], footR: va(-0.14, 0.08, -0.35), handL: S(va(0.12, 1.62, 0.2), [0, 0.3, 0.95], { elbow: [0.8, -0.4, -0.2] }), fk: {} },
    { t: 1.4, chest: [26, -6, 0], spine: [14, 0, 0], head: [30, -10, 0], hipsPos: [0, -0.34, 0.02], handL: S(va(0.08, 1.35, 0.3), [0, 0.3, 0.95], { elbow: [0.8, -0.4, -0.2] }) },
    { t: 2.4, chest: [18, 0, 0], spine: [10, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.22, 0.02] },
    au(3.0),
  ]),
  /** Phase 3: he tears the mask away and hangs it at his belt. */
  trAuUnmask: new Clip('trAuUnmask', [
    au(0),
    { t: 0.6, ease: 'out', handL: S(va(0.06, 1.66, 0.22), [0, 0.2, 1], { elbow: [0.8, -0.4, -0.2] }), head: [10, 0, 0], chest: [8, 0, 0], fk: {} },
    { t: 1.1, ease: 'out', handL: S(va(0.62, 1.4, 0.2), [0.9, 0.2, 0.2], { elbow: [0.9, -0.2, -0.2] }), head: [-20, -24, 0], chest: [-12, 16, 0], spine: [-6, 6, 0] },
    { t: 1.7, handL: S(va(0.2, 0.95, 0.2), [0, -1, 0.2], { elbow: [0.9, -0.3, -0.2] }), head: [-6, 0, 0], chest: [0, 0, 0], spine: [0, 0, 0] },
    au(2.6),
  ]),
  trAuDeath: new Clip('trAuDeath', [
    au(0),
    { t: 0.6, ease: 'out', chest: [-18, 12, 0], head: [-30, 10, 0], hipsPos: [0, -0.1, -0.08], handR: S(va(-0.4, 0.7, 0.2), [-0.5, -0.7, 0.4]) },
    { t: 1.5, hipsPos: [0, -0.56 * KA, 0.05], hips: [10, 0, 0], spine: [14, 0, 0], chest: [22, 0, 0], head: [30, 0, 0], footL: va(0.15, 0.08, 0.36), footR: va(-0.14, 0.12, -0.42), footPitchR: -60, handR: S(va(-0.3, 0.3, 0.4), [-0.3, -0.9, 0.2]), handL: null, fk: { upperArmL: [-10, 0, 20], forearmL: [-30, 0, 0] } },
    { t: 3.0, hipsPos: [0, -0.84 * KA, 0.5], hips: [80, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], head: [-10, 30, 0] },
  ]),

  // ---------------------------------------------------------------- NPC idles
  /** Ione in the hanging cage: crouched, one hand on the bars (loop). */
  trCaged: new Clip('trCaged', [
    { t: 0, hipsPos: [0, -0.6, -0.05], hips: [-6, 0, 0], spine: [20, 0, 0], chest: [10, 0, 0], head: [6, 0, 0], footL: [0.16, 0.08, 0.28], footR: [-0.16, 0.08, 0.3], handL: S([0.22, 0.9, 0.62], [0, 1, 0], { elbow: [0.8, -0.5, -0.2] }), handR: null, fk: { upperArmR: [-30, 0, -8], forearmR: [-80, 0, 0] } },
    { t: 3, head: [-8, 10, 0], spine: [16, 0, 0] },
    { t: 6, head: [6, 0, 0], spine: [20, 0, 0] },
  ], { loop: true, duration: 6 }),
  /** Ione at the Hospice: holding her ledger close (loop). */
  trClerk: new Clip('trClerk', [
    { t: 0, handR: null, handL: null, head: [6, 0, 0], fk: { upperArmL: [-30, 0, -8], forearmL: [-100, 0, 0], upperArmR: [-26, 0, 14], forearmR: [-96, 0, 0] } },
    { t: 2.5, head: [10, -10, 0] },
    { t: 5, head: [6, 0, 0] },
  ], { loop: true, duration: 5 }),
  /** The mother on the flagstones, arms around her knees (loop). */
  trHuddle: new Clip('trHuddle', [
    { t: 0, hipsPos: [0, -0.8, 0], hips: [-20, 0, 0], spine: [26, 0, 0], chest: [16, 0, 0], head: [16, 0, 0], footL: [0.12, 0.06, 0.42], footR: [-0.12, 0.06, 0.44], handL: null, handR: null, fk: { upperArmL: [-60, 0, -10], forearmL: [-70, 0, 0], upperArmR: [-60, 0, 10], forearmR: [-70, 0, 0] } },
    { t: 3, head: [22, -8, 0], spine: [28, 0, 0] },
    { t: 6, head: [16, 0, 0], spine: [26, 0, 0] },
  ], { loop: true, duration: 6 }),
};
