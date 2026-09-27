/**
 * Ashbridge Unlived movesets (infantry, sentry spear, shield bearer, archer). Enemy windups are
 * deliberately long and exaggerated: every attack has a readable tell.
 */
import { Clip } from '../Clip';
import type { HandKey, Key } from '../types';

export const INF_SWORD: HandKey = { p: [-0.26, 0.9, 0.2], dir: [-0.15, 0.35, 0.92], up: [0, -0.92, 0.35] };
export const SPEAR_REST: HandKey = { p: [-0.24, 0.95, 0.12], dir: [0, 0.2, 0.98], up: [0, 1, 0], elbow: [-0.6, -0.6, -0.4] };
export const TOWER_REST: HandKey = { socket: 'shieldL', p: [0.18, 1.02, 0.34], dir: [0.02, 1, 0.1], up: [0.25, 0, 0.97], elbow: [0.9, -0.3, -0.2] };
export const TOWER_GUARD: HandKey = { socket: 'shieldL', p: [0.08, 1.12, 0.42], dir: [0, 1, 0.05], up: [0.05, 0, 1], elbow: [0.9, -0.3, -0.2] };
export const BOW_REST: HandKey = { p: [0.22, 1.0, 0.25], dir: [0.1, 0.95, 0.3], up: [0.9, 0, -0.3], elbow: [0.8, -0.5, -0.3] };

const INF: Key = { t: 0, handR: INF_SWORD, handL: null, chest: [4, -6, 0], spine: [2, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.05, 0] };
const inf = (t: number): Key => ({ ...INF, t, ease: 'inout' });
const S = (p: [number, number, number], dir: [number, number, number], x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });

export const unlivedClips = {
  /** Wide diagonal cut: sword hauled high over the right shoulder (0.55 s tell). */
  infSlash: new Clip('infSlash', [
    inf(0),
    { t: 0.5, ease: 'out', handR: S([-0.42, 1.6, -0.12], [-0.3, 0.7, -0.65], { elbow: [-0.9, 0, -0.2] }), chest: [-10, -34, 0], spine: [-4, -14, 0], hips: [0, -10, 0], hipsPos: [0, -0.02, -0.05], head: [6, 18, 0], fk: { upperArmL: [-40, 0, 40], forearmL: [-40, 0, 0] } },
    { t: 0.6, ease: 'in', handR: S([-0.1, 1.25, 0.58], [0.35, 0.25, 0.9]), chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.3] },
    { t: 0.7, ease: 'out', handR: S([0.3, 0.75, 0.42], [0.85, -0.45, 0.28]), chest: [16, 30, 0], spine: [8, 14, 0], hips: [0, 8, 0], hipsPos: [0, -0.14, 0.08], head: [0, 0, 0] },
    { t: 1.05, handR: S([0.25, 0.78, 0.4], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
    inf(1.45),
  ]),
  /** Follow-up backhand (the first cut is its tell). */
  infBackhand: new Clip('infBackhand', [
    { t: 0, handR: S([0.25, 0.78, 0.4], [0.8, -0.4, 0.4], { up: [0.2, -0.6, -0.8] }), handL: null, chest: [14, 26, 0], spine: [8, 12, 0], hipsPos: [0, -0.13, 0.07] },
    { t: 0.3, ease: 'out', handR: S([0.34, 1.05, 0.12], [0.85, 0.25, -0.45], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 34, 0], spine: [4, 14, 0] },
    { t: 0.4, ease: 'in', handR: S([0, 1.22, 0.62], [-0.2, 0.3, 0.93]), chest: [4, 0, 0], spine: [2, 0, 0], footR: [-0.14, 0.08, 0.25] },
    { t: 0.5, ease: 'out', handR: S([-0.45, 1.3, 0.3], [-0.92, 0.3, 0.2]), chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 0.9, handR: S([-0.42, 1.28, 0.25], [-0.88, 0.4, 0.1]), chest: [-2, -26, 0], spine: [0, -10, 0] },
    inf(1.3),
  ]),
  /** Lunging thrust: sword drawn far back at hip height (0.7 s tell). */
  infThrust: new Clip('infThrust', [
    inf(0),
    { t: 0.62, ease: 'out', handR: S([-0.34, 1.08, -0.3], [0, 0.08, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [2, -40, 0], spine: [0, -16, 0], hips: [0, -14, 0], hipsPos: [0, -0.16, -0.08], footR: [-0.16, 0.08, -0.35], fk: { upperArmL: [-50, 0, 30], forearmL: [-50, 0, 0] } },
    { t: 0.74, ease: 'out', handR: S([-0.06, 1.18, 0.84], [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.2, 0.14], footL: [0.14, 0.08, 0.55] },
    { t: 1.1, handR: S([-0.06, 1.16, 0.8], [0.02, -0.05, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], hipsPos: [0, -0.19, 0.12] },
    inf(1.55),
  ]),
  /** Overhead two-handed chop: both hands high above the head (0.9 s tell), heavy. */
  infOverhead: new Clip('infOverhead', [
    inf(0),
    { t: 0.8, ease: 'out', handR: S([-0.1, 1.9, -0.12], [0.02, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.2] }), chest: [-16, -6, 0], spine: [-8, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.01, -0.05], fk: { upperArmL: [-170, 0, -10], forearmL: [-30, 0, 0] } },
    { t: 0.92, ease: 'in', handR: S([-0.08, 1.5, 0.55], [0, 0.6, 0.8]), chest: [10, -4, 0], spine: [6, 0, 0], footL: [0.13, 0.08, 0.38], fk: { upperArmL: [-90, 0, -20], forearmL: [-30, 0, 0] } },
    { t: 1.02, ease: 'out', handR: S([-0.05, 0.62, 0.62], [0, -0.6, 0.8]), chest: [32, -2, 0], spine: [16, 0, 0], hipsPos: [0, -0.2, 0.1], head: [-14, 0, 0], fk: { upperArmL: [-40, 0, 10], forearmL: [-30, 0, 0] } },
    { t: 1.5, handR: S([-0.06, 0.64, 0.6], [0, -0.55, 0.83]), chest: [28, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.18, 0.08] },
    inf(1.95),
  ]),

  // ---- sentry / spear
  spearThrust: new Clip('spearThrust', [
    { t: 0, handR: SPEAR_REST, handL: null },
    { t: 0.55, ease: 'out', handR: S([-0.3, 1.25, -0.35], [0, -0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -36, 0], spine: [0, -14, 0], hipsPos: [0, -0.1, -0.06], footR: [-0.16, 0.08, -0.3], fk: { upperArmL: [-60, 0, 20], forearmL: [-40, 0, 0] } },
    { t: 0.67, ease: 'out', handR: S([-0.05, 1.3, 0.72], [0, -0.03, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.16, 0.12], footL: [0.14, 0.08, 0.5] },
    { t: 1.0, handR: S([-0.06, 1.28, 0.68], [0, -0.04, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], hipsPos: [0, -0.15, 0.1] },
    { t: 1.4, ease: 'inout', handR: SPEAR_REST, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.04, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
  ]),

  // ---- shield bearer (spear over a tower shield)
  sbGuardWalk: new Clip('sbGuardWalk', [
    { t: 0, handL: TOWER_GUARD, handR: S([-0.28, 1.35, -0.05], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.4] }), chest: [4, 6, 0], spine: [4, 2, 0], head: [-4, 0, 0] },
  ], { loop: true, duration: 1 }),
  sbThrust: new Clip('sbThrust', [
    { t: 0, handL: TOWER_GUARD, handR: S([-0.28, 1.35, -0.05], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.4] }) },
    { t: 0.55, ease: 'out', handR: S([-0.3, 1.45, -0.4], [0, -0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.1, -0.5] }), chest: [0, -18, 0], hipsPos: [0, -0.08, -0.05] },
    { t: 0.66, ease: 'out', handR: S([-0.14, 1.45, 0.72], [0.05, -0.08, 1], { up: [0, 1, 0] }), chest: [8, 6, 0], hipsPos: [0, -0.12, 0.08], footL: [0.14, 0.08, 0.4] },
    { t: 0.95, handR: S([-0.15, 1.42, 0.68], [0.05, -0.1, 1], { up: [0, 1, 0] }), chest: [8, 6, 0] },
    { t: 1.35, ease: 'inout', handR: S([-0.28, 1.35, -0.05], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.4] }), chest: [4, 6, 0], hipsPos: [0, -0.04, 0], footL: [0.12, 0.08, 0.02] },
  ]),
  sbBash: new Clip('sbBash', [
    { t: 0, handL: TOWER_GUARD, handR: S([-0.28, 1.35, -0.05], [0, 0.05, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.4] }) },
    { t: 0.6, ease: 'out', handL: { ...TOWER_GUARD, p: [0.2, 1.08, 0.1] }, chest: [-6, 30, 0], spine: [-2, 12, 0], hipsPos: [0, -0.1, -0.08], footR: [-0.15, 0.08, -0.25] },
    { t: 0.72, ease: 'out', handL: { ...TOWER_GUARD, p: [0.02, 1.15, 0.75] }, chest: [12, -8, 0], spine: [8, -2, 0], hipsPos: [0, -0.16, 0.14], footL: [0.14, 0.08, 0.5] },
    { t: 1.0, handL: { ...TOWER_GUARD, p: [0.04, 1.14, 0.66] }, chest: [10, -6, 0], hipsPos: [0, -0.14, 0.1] },
    { t: 1.4, ease: 'inout', handL: TOWER_GUARD, chest: [4, 6, 0], spine: [4, 2, 0], hipsPos: [0, -0.04, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
  ]),

  // ---- archer
  bowShoot: new Clip('bowShoot', [
    { t: 0, handL: BOW_REST, handR: null },
    { t: 0.35, ease: 'out', handL: { p: [0.34, 1.45, 0.5], dir: [0.05, 0.95, -0.1], up: [0.95, 0, 0.1], elbow: [0.8, -0.4, 0] }, handR: null, fk: { upperArmR: [-90, -30, -20], forearmR: [-100, 0, 0] }, chest: [0, 60, 0], spine: [0, 20, 0], head: [0, -60, 0], hips: [0, 10, 0] },
    { t: 1.05, handL: { p: [0.36, 1.46, 0.56], dir: [0.05, 0.95, -0.1], up: [0.95, 0, 0.1], elbow: [0.8, -0.4, 0] }, fk: { upperArmR: [-90, -10, -60], forearmR: [-140, 0, 0] }, chest: [-2, 62, 0], spine: [0, 22, 0], head: [2, -62, 0], hips: [0, 10, 0] },
    { t: 1.12, ease: 'out', fk: { upperArmR: [-70, 0, -70], forearmR: [-60, 0, 0] } },
    { t: 1.6, ease: 'inout', handL: BOW_REST, fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hips: [0, 0, 0] },
  ]),
  archerStab: new Clip('archerStab', [
    { t: 0, handL: BOW_REST, handR: null },
    { t: 0.45, ease: 'out', handR: null, fk: { upperArmR: [-40, 0, -50], forearmR: [-90, 0, 0] }, chest: [0, -30, 0], spine: [0, -10, 0] },
    { t: 0.56, ease: 'out', fk: { upperArmR: [-85, 0, -5], forearmR: [-10, 0, 0] }, chest: [10, 10, 0], spine: [4, 4, 0], hipsPos: [0, -0.1, 0.1], footR: [-0.14, 0.08, 0.3] },
    { t: 1.1, ease: 'inout', fk: { upperArmR: [0, 0, -8], forearmR: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], hipsPos: [0, -0.04, 0], footR: [-0.12, 0.08, -0.03] },
  ]),

  /** Sentry facing the wall, muttering (idle loop). */
  sentryIdle: new Clip('sentryIdle', [
    { t: 0, handR: SPEAR_REST, head: [18, 0, 0], neck: [8, 0, 0], chest: [6, 0, 0] },
    { t: 1.6, head: [22, 8, 0], neck: [10, 0, 0], chest: [8, 0, 0] },
    { t: 3.2, head: [18, 0, 0], neck: [8, 0, 0], chest: [6, 0, 0] },
  ], { loop: true, duration: 3.2 }),
};
