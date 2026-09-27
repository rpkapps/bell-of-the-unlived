/**
 * Bows and crossbows (held in the RIGHT hand, as the equipment slot and the weaponR socket
 * dictate): the bow arm is the right, the LEFT hand nocks and draws to the jaw. The crossbow is
 * shouldered on the right, the left hand under the stock (offhandGrip +0.25). Release / reload
 * moments are the `custom` events in src/combat/movesets.ts.
 */
import { BOW_REST, XBOW_REST } from '../stances';
import { clip, clip2, H, restOf, type K } from './common';
import type { HandKey, V3 } from '../../types';
import { OFF } from './heavy';

// ------------------------------------------------------------------ bow
/** Trunk turned so the bow shoulder leads toward the target; head kept on the target. */
const TURN = { hips: [0, 28, 0] as V3, spine: [2, 18, 0] as V3, chest: [2, 22, 0] as V3, neck: [0, -26, 0] as V3, head: [2, -40, 0] as V3 };
const BOW_UP: HandKey = H([-0.06, 1.43, 0.7], [0.12, 0.99, 0.0], { up: [0, 0, 1], elbow: [-0.7, -0.7, 0] });
const NOCK: HandKey = H([-0.03, 1.4, 0.58], [0, 1, 0.1], { up: [0, 0, 1], elbow: [0.6, -0.5, -0.6] });
const ANCHOR: HandKey = H([-0.02, 1.52, 0.14], [0, 1, 0.1], { up: [0, 0, 1], elbow: [0.5, 0.35, -0.8] });
const ANCHOR_DEEP: HandKey = H([0.0, 1.53, 0.06], [0, 1, 0.1], { up: [0, 0, 1], elbow: [0.5, 0.35, -0.8] });
const LOOSED: HandKey = H([0.08, 1.56, -0.04], [0.2, 0.9, -0.3], { up: [0, 0.3, 0.95], elbow: [0.5, 0.35, -0.8] });
const QUIVER: HandKey = H([0.14, 1.2, -0.12], [0, 1, 0], { up: [0, 0, 1], elbow: [0.7, -0.4, -0.5] });
const bow = restOf({ handR: BOW_REST, handL: null, hips: [0, 0, 0], spine: [0, 0, 0], chest: [1, -2, 0], neck: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const DRAWN: K = { t: 0, handR: BOW_UP, handL: ANCHOR, ...TURN, hipsPos: [0, -0.06, 0], footL: [0.16, 0.08, 0.1], footR: [-0.12, 0.08, -0.12] };

// ------------------------------------------------------------------ crossbow
const XB_AIM: HandKey = H([-0.14, 1.42, 0.3], [0.02, 0.02, 1], { up: [0, -1, 0.02], elbow: [-0.9, -0.3, -0.2] });
const XB_TURN = { chest: [2, -18, 0] as V3, spine: [0, -8, 0] as V3, hips: [0, -6, 0] as V3, head: [6, 10, -8] as V3, neck: [0, 6, 0] as V3 };
const XB_LOW: HandKey = H([-0.2, 1.0, 0.3], [0.1, -0.55, 0.83], { up: [0, -0.83, -0.55], elbow: [-0.8, -0.4, -0.4] });
const along = (h: HandKey, d: number, lift = 0): V3 => {
  const l = Math.hypot(h.dir[0], h.dir[1], h.dir[2]);
  return [h.p[0] + (h.dir[0] / l) * d, h.p[1] + (h.dir[1] / l) * d + lift, h.p[2] + (h.dir[2] / l) * d];
};
const LH = (p: V3, x: Partial<HandKey> = {}): HandKey => H(p, [0, 0.6, 0.8], { up: [0, -0.8, 0.6], elbow: [0.6, -0.7, -0.3], ...x });
const XB_LEFT_REST = LH([-0.08, 0.98, 0.36]);
const xb = restOf({ handR: XBOW_REST, handL: XB_LEFT_REST, chest: [2, -4, 0], spine: [0, 0, 0], hips: [0, 0, 0], head: [0, 0, 0], neck: [0, 0, 0], hipsPos: [0, -0.04, 0] });
const XB_AIMED: K = { t: 0, handR: XB_AIM, ...XB_TURN, hipsPos: [0, -0.07, 0], footL: [0.14, 0.08, 0.16], footR: [-0.13, 0.08, -0.14] };
/** Lower, cock, fetch a bolt, lay it in the groove, return (starts at t0). */
const reload = (t0: number): K[] => [
  { t: t0, ease: 'out', handR: XB_LOW, handL: LH(along(XB_LOW, 0.42, 0.03)), chest: [14, -10, 0], spine: [8, -4, 0], hips: [0, -4, 0], head: [16, 0, 0], neck: [6, 0, 0], hipsPos: [0, -0.1, 0] },
  { t: t0 + 0.25, ease: 'inout', handR: XB_LOW, handL: LH(along(XB_LOW, 0.12, 0.04)), chest: [16, -12, 0], spine: [8, -4, 0], hipsPos: [0, -0.12, -0.02] },
  { t: t0 + 0.5, ease: 'inout', handR: XB_LOW, handL: LH([0.14, 0.96, 0.06], { dir: [0, -1, 0.2] }), chest: [12, -4, 0], head: [12, 10, 0] },
  { t: t0 + 0.7, ease: 'inout', handR: XB_LOW, handL: LH(along(XB_LOW, 0.3, 0.05)), chest: [14, -10, 0], head: [16, 0, 0] },
];

export const rangedClips = {
  // ---------------------------------------------------------------- bow
  /** Shot from the hip: raise, nock, draw, loose at 0.42. */
  bowShoot: clip('bowShoot', [
    bow(0),
    { t: 0.14, ease: 'out', handR: BOW_UP, handL: NOCK, ...TURN, hipsPos: [0, -0.05, 0] },
    { ...DRAWN, t: 0.38, ease: 'inout' },
    { ...DRAWN, t: 0.42 },
    { ...DRAWN, t: 0.48, ease: 'out', handL: LOOSED },
    { ...DRAWN, t: 0.62, handL: LOOSED },
    bow(0.9),
  ], 0.6),
  /** Shot while aiming (from the held draw): loose at 0.05, nock again and redraw. */
  bowShootAimed: clip('bowShootAimed', [
    { ...DRAWN, t: 0 },
    { ...DRAWN, t: 0.05 },
    { ...DRAWN, t: 0.12, ease: 'out', handL: LOOSED },
    { ...DRAWN, t: 0.24, handL: QUIVER },
    { ...DRAWN, t: 0.36, handL: NOCK },
    { ...DRAWN, t: 0.55, ease: 'inout' },
  ], 0.6),
  /** Heavy: a long, deep draw (held). */
  bowDrawCharge: clip('bowDrawCharge', [
    bow(0),
    { t: 0.16, ease: 'out', handR: BOW_UP, handL: NOCK, ...TURN, hipsPos: [0, -0.05, 0] },
    { ...DRAWN, t: 0.6, ease: 'inout', handL: ANCHOR_DEEP },
    { ...DRAWN, t: 1.4, handL: ANCHOR_DEEP, hipsPos: [0, -0.07, 0] },
  ], 0.6),
  bowRelease: clip('bowRelease', [
    { ...DRAWN, t: 0, handL: ANCHOR_DEEP },
    { ...DRAWN, t: 0.08, ease: 'out', handL: LOOSED },
    { ...DRAWN, t: 0.3, handL: LOOSED },
    bow(0.62),
  ], 0.6),
  /** Aim overlay: holding at full draw. */
  bowAim: clip('bowAim', [{ ...DRAWN, t: 0 }], 0.6, { loop: true, duration: 1 }),
  /** Stilled Breath: draw, settle, breathe out. */
  stilledBreath: clip('stilledBreath', [
    bow(0),
    { t: 0.18, ease: 'out', handR: BOW_UP, handL: NOCK, ...TURN },
    { ...DRAWN, t: 0.55, ease: 'inout', handL: ANCHOR_DEEP },
    { ...DRAWN, t: 0.9, handL: ANCHOR_DEEP, head: [8, -40, 0], hipsPos: [0, -0.09, 0] },
    { ...DRAWN, t: 1.1, handL: ANCHOR_DEEP, head: [2, -40, 0], hipsPos: [0, -0.07, 0] },
    { ...DRAWN, t: 1.3, handL: ANCHOR },
  ], 0.6),

  // ---------------------------------------------------------------- crossbow
  /** Shoulder, loose at 0.14, recoil, then the full reload (bolt seated at ~1.3). */
  xbowShoot: clip2('xbowShoot', [
    xb(0),
    { ...XB_AIMED, t: 0.11, ease: 'out' },
    { ...XB_AIMED, t: 0.14 },
    { ...XB_AIMED, t: 0.2, ease: 'out', handR: H([-0.15, 1.47, 0.22], [0.02, 0.25, 0.97], { up: [0, -0.97, 0.25], elbow: [-0.9, -0.3, -0.2] }), chest: [-4, -18, 0], hipsPos: [0, -0.05, -0.03] },
    ...reload(0.45),
    xb(1.6),
  ], OFF.crossbow, 0.5, [0.2, -0.9, 0.1]),
  /** Reload only (a shot was cancelled before the bolt was seated). */
  xbowReload: clip2('xbowReload', [
    xb(0),
    ...reload(0.2),
    xb(1.25),
  ], OFF.crossbow, 0.5, [0.2, -0.9, 0.1]),
  /** Heavy: braced aim, held. */
  xbowBrace: clip2('xbowBrace', [
    xb(0),
    { ...XB_AIMED, t: 0.2, ease: 'out' },
    { ...XB_AIMED, t: 1.2, hipsPos: [0, -0.12, 0], chest: [4, -20, 0] },
  ], OFF.crossbow, 0.5, [0.2, -0.9, 0.1]),
  xbowBraceRelease: clip2('xbowBraceRelease', [
    { ...XB_AIMED, t: 0, hipsPos: [0, -0.12, 0], chest: [4, -20, 0] },
    { ...XB_AIMED, t: 0.1, ease: 'out', handR: H([-0.15, 1.48, 0.2], [0.02, 0.28, 0.96], { up: [0, -0.96, 0.28], elbow: [-0.9, -0.3, -0.2] }), chest: [-6, -18, 0], hipsPos: [0, -0.08, -0.05] },
    ...reload(0.35),
    xb(1.5),
  ], OFF.crossbow, 0.5, [0.2, -0.9, 0.1]),
  /** Aim overlay: shouldered. */
  xbowAim: clip2('xbowAim', [{ ...XB_AIMED, t: 0 }], OFF.crossbow, 0.5, [0.2, -0.9, 0.1], { loop: true, duration: 1 }),
  /** Stilled Breath with a crossbow. */
  stilledBreathX: clip2('stilledBreathX', [
    xb(0),
    { ...XB_AIMED, t: 0.2, ease: 'out' },
    { ...XB_AIMED, t: 0.9, head: [12, 10, -8], hipsPos: [0, -0.1, 0] },
    { ...XB_AIMED, t: 1.3 },
  ], OFF.crossbow, 0.5, [0.2, -0.9, 0.1]),
};
