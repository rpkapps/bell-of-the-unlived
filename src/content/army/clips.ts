/**
 * Siegeholm animation clips (IK keyframes, root space: +Z forward, −X is the character's right).
 * Every attack has a readable windup (≥ 0.5 s unless a follow-up told by the first blow);
 * big attacks hold their raised pose so the tell reads at gameplay distance.
 *
 *  - Pike wall: underarm pike over a pavise; thrust, shield shove.
 *  - Crossbowman: aim (raise and hold), loose, long reload (the punish window); stock bash.
 *  - Sapper: lights a fire pot at the belt, overhand throw; hatchet (infantry clips).
 *  - Siege knight: two-handed greatsword — cleave, sweep, half-sword thrust, shoulder shove.
 *  - Oderic, the Ram-Knight: ram-maul — the charge (head down, scrape, run), sweep, slam, shove,
 *    wall-stagger, roar (phase), death.
 *  - Marshal Ysolde Varr: halberd — thrust, sweep + hook, chop, volley signal, fury chain, lunge,
 *    transition (the Defeat), death.
 */
import { Clip } from '../../actors/anim/Clip';
import type { HandKey, Key, V3 } from '../../actors/anim/types';
import { TOWER_GUARD, INF_SWORD } from '../../actors/anim/clips/unlived';

const S = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });
const norm = (d: V3): V3 => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
/** Support hand along the held item's shaft, `off` metres from the grip (negative = toward the butt/pommel). */
const along = (p: V3, dir: V3, off: number, elbow: V3 = [0.8, -0.4, -0.4]): HandKey => { const n = norm(dir); return { p: [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off], dir, elbow }; };
const sc = (k: number) => (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
const KNEEL: Key = {
  t: 0, hipsPos: [0, -0.45, 0], hips: [8, 0, 0], spine: [10, 0, 0], chest: [18, 0, 0], neck: [10, 0, 0], head: [18, 0, 0],
  footL: [0.14, 0.08, 0.34], footR: [-0.13, 0.12, -0.42], footPitchR: -60,
};
const PRONE: Key = {
  t: 0, hipsPos: [0, -0.84, 0.3], hips: [86, 0, 0], spine: [4, 0, 0], chest: [2, 0, 0], neck: [-20, 0, 0], head: [-10, 30, 0],
  handR: null, handL: null, fk: { upperArmL: [-150, 0, 30], forearmL: [-20, 0, 0], upperArmR: [-20, 0, -30], forearmR: [-30, 0, 0] },
};

// ====================================================================== the pike wall

export const PIKE_REST: HandKey = S([-0.34, 1.04, 0.0], [-0.05, 0.1, 1], { up: [0, 1, -0.1], elbow: [-0.8, -0.45, -0.3] });
const PK: Key = { t: 0, handR: PIKE_REST, handL: TOWER_GUARD, chest: [4, 4, 0], spine: [3, 0, 0], hipsPos: [0, -0.06, 0] };
const pk = (t: number): Key => ({ ...PK, t, ease: 'inout' });

// ====================================================================== crossbowman

export const XB_REST: HandKey = S([-0.16, 1.0, 0.24], [0.02, -0.4, 0.92], { up: [0, -0.92, -0.4], elbow: [-0.8, -0.5, -0.2] });
export const XB_REST_L: HandKey = along(XB_REST.p, XB_REST.dir, 0.3, [0.8, -0.5, -0.2]);
const XB: Key = { t: 0, handR: XB_REST, handL: XB_REST_L, chest: [2, -4, 0], spine: [2, 0, 0], hipsPos: [0, -0.04, 0] };
const xb = (t: number): Key => ({ ...XB, t, ease: 'inout' });
const XB_AIM: HandKey = S([-0.1, 1.42, 0.2], [0.02, 0.03, 1], { up: [0, -1, 0.03], elbow: [-0.9, -0.3, -0.3] });

// ====================================================================== siege knight (rig height ×1.12)

const k12 = sc(1.12);
export const SK_REST: HandKey = S(k12(-0.14, 0.98, 0.26), [-0.05, 0.62, 0.78], { up: [0, -0.78, 0.62], elbow: [-0.8, -0.4, -0.3] });
const skL = (h: HandKey) => along(h.p, h.dir, -0.2);
export const SK_REST_L = skL(SK_REST);
const SK: Key = { t: 0, handR: SK_REST, handL: skL(SK_REST), chest: [4, -6, 0], spine: [2, 0, 0], hipsPos: [0, -0.07, 0] };
const sk = (t: number): Key => ({ ...SK, t, ease: 'inout' });
const skh = (p: V3, dir: V3, x: Partial<HandKey> = {}) => { const h = S(p, dir, x); return { handR: h, handL: skL(h) }; };

// ====================================================================== Oderic (rig height ×1.22)

const k22 = sc(1.22);
export const OD_REST: HandKey = S(k22(-0.24, 0.92, 0.06), [0.12, 0.28, 0.95], { up: [0, 0.95, -0.28], elbow: [-0.8, -0.45, -0.3] });
const odL = (h: HandKey) => along(h.p, h.dir, 0.62, [0.8, -0.5, -0.2]);
export const OD_REST_L = odL(OD_REST);
const OD: Key = { t: 0, handR: OD_REST, handL: odL(OD_REST), chest: [8, -4, 0], spine: [4, 0, 0], hipsPos: [0, -0.1, 0], head: [-4, 0, 0] };
const od = (t: number): Key => ({ ...OD, t, ease: 'inout' });
const odh = (p: V3, dir: V3, x: Partial<HandKey> = {}) => { const h = S(p, dir, x); return { handR: h, handL: odL(h) }; };

// ====================================================================== Varr (rig height ×1.06)

const k06 = sc(1.06);
export const VARR_REST: HandKey = S(k06(-0.22, 0.95, 0.02), [0.1, 0.55, 0.83], { up: [0, -0.83, 0.55], elbow: [-0.8, -0.45, -0.3] });
const vL = (h: HandKey) => along(h.p, h.dir, 0.55, [0.8, -0.45, -0.25]);
export const VARR_REST_L = vL(VARR_REST);
const VR: Key = { t: 0, handR: VARR_REST, handL: vL(VARR_REST), chest: [2, -8, 0], spine: [2, 0, 0], hipsPos: [0, -0.05, 0], head: [0, 4, 0] };
const vr = (t: number): Key => ({ ...VR, t, ease: 'inout' });
const vh = (p: V3, dir: V3, x: Partial<HandKey> = {}) => { const h = S(p, dir, x); return { handR: h, handL: vL(h) }; };

export const armyClips = {
  // ---------------------------------------------------------------- pike wall
  pikeStand: new Clip('pikeStand', [PK], { loop: true, duration: 1 }),
  /** Pike thrust: drawn back past the hip (0.55 s tell), driven out along the shield rim. */
  pikeThrust: new Clip('pikeThrust', [
    pk(0),
    { t: 0.55, ease: 'out', handR: S([-0.36, 1.08, -0.4], [-0.03, 0.06, 1], { up: [0, 1, 0], elbow: [-0.8, -0.3, -0.5] }), chest: [0, -16, 0], spine: [0, -6, 0], hipsPos: [0, -0.1, -0.07], footR: [-0.15, 0.08, -0.32] },
    { t: 0.68, ease: 'out', handR: S([-0.28, 1.12, 0.62], [-0.01, 0.02, 1], { up: [0, 1, 0] }), chest: [8, 6, 0], spine: [5, 2, 0], hipsPos: [0, -0.13, 0.1], footL: [0.14, 0.08, 0.46] },
    { t: 0.98, handR: S([-0.29, 1.1, 0.58], [-0.01, 0.03, 1], { up: [0, 1, 0] }), chest: [8, 6, 0], hipsPos: [0, -0.12, 0.08] },
    { ...pk(1.35), footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
  ]),
  /** Shield shove (unparryable): the pavise swung into the face (0.6 s tell). */
  pikeBash: new Clip('pikeBash', [
    pk(0),
    { t: 0.6, ease: 'out', handL: { ...TOWER_GUARD, p: [0.22, 1.08, 0.08] }, chest: [-6, 30, 0], spine: [-2, 12, 0], hipsPos: [0, -0.1, -0.08], footR: [-0.15, 0.08, -0.25] },
    { t: 0.72, ease: 'out', handL: { ...TOWER_GUARD, p: [0.02, 1.15, 0.75] }, chest: [12, -8, 0], spine: [8, -2, 0], hipsPos: [0, -0.16, 0.14], footL: [0.14, 0.08, 0.5] },
    { t: 1.0, handL: { ...TOWER_GUARD, p: [0.04, 1.14, 0.66] }, chest: [10, -6, 0], hipsPos: [0, -0.14, 0.1] },
    { ...pk(1.4), footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
  ]),

  // ---------------------------------------------------------------- crossbowman
  /** Raise and aim (hold), loose, then lower the bow tip-down and crank the windlass (long reload). */
  xbowShoot: new Clip('xbowShoot', [
    xb(0),
    { t: 0.5, ease: 'out', handR: XB_AIM, handL: along(XB_AIM.p, XB_AIM.dir, 0.3, [0.9, -0.4, 0]), chest: [0, -12, 0], spine: [0, -4, 0], head: [6, 8, 0], footR: [-0.16, 0.08, -0.22] },
    { t: 1.12, handR: { ...XB_AIM, p: [-0.1, 1.43, 0.21] }, handL: along([-0.1, 1.43, 0.21], XB_AIM.dir, 0.3, [0.9, -0.4, 0]), chest: [0, -12, 0], head: [6, 8, 0] },
    { t: 1.22, ease: 'out', handR: S([-0.1, 1.46, 0.08], [0.02, 0.14, 0.99], { up: [0, -0.99, 0.14] }), handL: along([-0.1, 1.46, 0.08], [0.02, 0.14, 0.99], 0.3, [0.9, -0.4, 0]), chest: [-6, -12, 0], head: [0, 8, 0] },
    { t: 1.6, ease: 'inout', handR: S([-0.16, 0.86, 0.36], [0, -0.95, 0.3], { up: [0, -0.3, -0.95] }), handL: null, fk: { upperArmL: [-40, 0, 10], forearmL: [-100, 0, 0] }, chest: [18, 0, 0], spine: [8, 0, 0], head: [16, 0, 0], hipsPos: [0, -0.12, 0] },
    { t: 1.95, fk: { upperArmL: [-65, 0, 10], forearmL: [-55, 0, 0] } },
    { t: 2.3, fk: { upperArmL: [-40, 0, 10], forearmL: [-105, 0, 0] } },
    { t: 2.6, fk: { upperArmL: [-65, 0, 10], forearmL: [-55, 0, 0] }, chest: [16, 0, 0] },
    xb(2.95),
  ]),
  /** Stock bash when pressed (0.5 s tell). */
  xbowBash: new Clip('xbowBash', [
    xb(0),
    { t: 0.5, ease: 'out', handR: S([-0.38, 1.3, -0.22], [0.1, 0.5, 0.86], { up: [0, -0.86, 0.5] }), handL: along([-0.38, 1.3, -0.22], [0.1, 0.5, 0.86], 0.3), chest: [-6, -34, 0], spine: [-2, -12, 0], hipsPos: [0, -0.04, -0.08] },
    { t: 0.62, ease: 'out', handR: S([-0.06, 1.34, 0.62], [0.05, 0.5, 0.86], { up: [0, -0.86, 0.5] }), handL: along([-0.06, 1.34, 0.62], [0.05, 0.5, 0.86], 0.3), chest: [12, 10, 0], spine: [6, 4, 0], hipsPos: [0, -0.12, 0.12], footL: [0.14, 0.08, 0.4] },
    { t: 0.8, handR: S([-0.07, 1.32, 0.58], [0.05, 0.5, 0.86], { up: [0, -0.86, 0.5] }), chest: [10, 8, 0] },
    xb(1.1),
  ]),

  // ---------------------------------------------------------------- sapper
  /** Light the pot at the belt, wind the left arm back behind the head (0.9 s tell), throw. */
  sapperThrow: new Clip('sapperThrow', [
    { t: 0, handR: INF_SWORD, handL: null, fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] } },
    { t: 0.35, ease: 'out', fk: { upperArmL: [-20, 0, 28], forearmL: [-95, 0, 0] }, chest: [14, 12, 0], spine: [6, 4, 0], head: [20, 10, 0], hipsPos: [0, -0.12, 0] },
    { t: 0.85, ease: 'out', fk: { upperArmL: [-165, 0, 25], forearmL: [-75, 0, 0] }, chest: [-10, 34, 0], spine: [-4, 14, 0], head: [0, -20, 0], hipsPos: [0, -0.04, -0.08], footL: [0.14, 0.08, 0.3], footR: [-0.14, 0.08, -0.25] },
    { t: 0.97, ease: 'in', fk: { upperArmL: [-80, 0, 8], forearmL: [-10, 0, 0] }, chest: [12, -18, 0], spine: [6, -6, 0], head: [0, 10, 0], hipsPos: [0, -0.1, 0.08] },
    { t: 1.3, fk: { upperArmL: [-40, 0, 10], forearmL: [-20, 0, 0] }, chest: [8, -12, 0] },
    { t: 1.7, ease: 'inout', fk: { upperArmL: [0, 0, 8], forearmL: [-20, 0, 0] }, chest: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.05, 0], footL: [0.12, 0.08, 0.02], footR: [-0.12, 0.08, -0.03] },
  ]),

  // ---------------------------------------------------------------- siege knight
  /** Overhead cleave: the greatsword raised far behind the head (1.0 s tell), hyper-armoured. */
  skCleave: new Clip('skCleave', [
    sk(0),
    { t: 1.0, ease: 'out', ...skh(k12(-0.08, 2.0, -0.18), [0.02, 0.3, -0.95], { elbow: [-0.9, 0.2, -0.2] }), chest: [-18, -4, 0], spine: [-10, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.02, -0.06] },
    { t: 1.12, ease: 'in', ...skh(k12(-0.06, 1.35, 0.72), [0, 0.3, 0.95]), chest: [14, -2, 0], spine: [8, 0, 0], footL: k12(0.14, 0.07, 0.42) },
    { t: 1.22, ease: 'out', ...skh(k12(-0.04, 0.45, 0.95), [0, -0.72, 0.7]), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.3, 0.12], head: [-20, 0, 0] },
    { t: 1.9, ...skh(k12(-0.05, 0.47, 0.92), [0, -0.72, 0.7]), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.28, 0.1] },
    sk(2.35),
  ]),
  /** Wide sweep from the right (0.85 s tell). */
  skSweep: new Clip('skSweep', [
    sk(0),
    { t: 0.85, ease: 'out', ...skh(k12(-0.62, 1.12, -0.25), [-0.85, 0.22, -0.48], { elbow: [-0.9, -0.2, -0.1] }), chest: [6, -55, 0], spine: [4, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.16, -0.04], head: [0, 34, 0] },
    { t: 0.97, ease: 'in', ...skh(k12(-0.12, 1.05, 0.82), [0.12, 0.05, 0.99]), chest: [10, -6, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.1, ease: 'out', ...skh(k12(0.6, 1.0, 0.25), [0.92, 0.0, -0.38]), chest: [10, 50, 0], spine: [6, 20, 0], hips: [0, 12, 0], hipsPos: [0, -0.2, 0.05] },
    { t: 1.5, ...skh(k12(0.56, 1.02, 0.2), [0.9, 0.05, -0.42]), chest: [8, 44, 0], spine: [5, 18, 0] },
    sk(1.95),
  ]),
  /** Half-sword thrust: left hand on the blade, driven at the chest (0.8 s tell). */
  skThrust: new Clip('skThrust', [
    sk(0),
    { t: 0.8, ease: 'out', handR: S(k12(-0.3, 1.28, -0.38), [0, 0.02, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), handL: along(k12(-0.3, 1.28, -0.38), [0, 0.02, 1], 0.5), chest: [0, -30, 0], spine: [0, -12, 0], hips: [0, -10, 0], hipsPos: [0, -0.16, -0.08], footR: k12(-0.16, 0.07, -0.34) },
    { t: 0.92, ease: 'out', handR: S(k12(-0.06, 1.28, 0.86), [0.02, -0.03, 1], { up: [0, 1, 0] }), handL: along(k12(-0.06, 1.28, 0.86), [0.02, -0.03, 1], 0.5), chest: [12, 8, 0], spine: [8, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.22, 0.14], footL: k12(0.14, 0.07, 0.58) },
    { t: 1.3, handR: S(k12(-0.07, 1.26, 0.82), [0.02, -0.05, 1], { up: [0, 1, 0] }), handL: along(k12(-0.07, 1.26, 0.82), [0.02, -0.05, 1], 0.5), chest: [12, 8, 0], hipsPos: [0, -0.2, 0.12] },
    sk(1.75),
  ]),
  /** Shoulder shove (unparryable, breaks guards): 0.6 s tell. */
  skShove: new Clip('skShove', [
    sk(0),
    { t: 0.6, ease: 'out', chest: [10, 38, 0], spine: [8, 16, 0], hips: [0, 12, 0], hipsPos: [0, -0.2, -0.1], head: [-10, -26, 0], footR: k12(-0.15, 0.07, -0.35) },
    { t: 0.74, ease: 'out', chest: [22, 30, 0], spine: [12, 12, 0], hipsPos: [0, -0.24, 0.26], footL: k12(0.14, 0.07, 0.6) },
    { t: 1.0, chest: [18, 26, 0], hipsPos: [0, -0.22, 0.2] },
    sk(1.35),
  ]),

  // ---------------------------------------------------------------- Oderic, the Ram-Knight
  odStand: new Clip('odStand', [OD], { loop: true, duration: 1 }),
  /** The charge: head down, ram levelled, the foot scrapes twice (1.05 s tell), then he runs. */
  odCharge: new Clip('odCharge', [
    od(0),
    { t: 0.45, ease: 'out', ...odh(k22(-0.2, 1.0, -0.12), [0.02, 0.05, 1], { up: [0, 1, 0] }), chest: [30, 0, 0], spine: [16, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.24, -0.08], footR: k22(-0.15, 0.12, -0.42) },
    { t: 0.7, footR: k22(-0.15, 0.08, -0.2), footPitchR: -30 },
    { t: 0.9, footR: k22(-0.15, 0.14, -0.46), footPitchR: 0 },
    { t: 1.05, footR: k22(-0.15, 0.08, -0.36), chest: [34, 0, 0], hipsPos: [0, -0.26, 0.04] },
    { t: 1.25, footL: k22(0.15, 0.25, 0.45), footR: k22(-0.15, 0.1, -0.45), hipsPos: [0, -0.2, 0.12] },
    { t: 1.45, footL: k22(0.15, 0.1, -0.45), footR: k22(-0.15, 0.25, 0.45) },
    { t: 1.65, footL: k22(0.15, 0.25, 0.45), footR: k22(-0.15, 0.1, -0.45) },
    { t: 1.85, footL: k22(0.15, 0.1, -0.45), footR: k22(-0.15, 0.25, 0.45) },
    { t: 2.05, footL: k22(0.15, 0.25, 0.45), footR: k22(-0.15, 0.1, -0.45) },
    { t: 2.25, footL: k22(0.15, 0.1, -0.45), footR: k22(-0.15, 0.25, 0.45) },
    { t: 2.45, footL: k22(0.15, 0.08, 0.55), footR: k22(-0.15, 0.1, -0.3), chest: [28, 0, 0], hipsPos: [0, -0.3, -0.05] },
    { t: 2.8, ...odh(k22(-0.22, 0.95, 0.1), [0.1, 0.2, 0.97], { up: [0, 0.97, -0.2] }), chest: [14, 0, 0], spine: [8, 0, 0], head: [0, 0, 0], hipsPos: [0, -0.2, 0], footL: k22(0.14, 0.08, 0.3), footR: k22(-0.14, 0.08, -0.2) },
    { ...od(3.2), footL: k22(0.12, 0.08, 0.02), footR: k22(-0.12, 0.08, -0.03) },
  ]),
  /** Ram sweep from the right (0.8 s tell). */
  odSwing: new Clip('odSwing', [
    od(0),
    { t: 0.8, ease: 'out', ...odh(k22(-0.6, 1.1, -0.3), [-0.8, 0.25, -0.55], { elbow: [-0.9, -0.2, -0.1] }), chest: [8, -52, 0], spine: [4, -20, 0], hips: [0, -14, 0], hipsPos: [0, -0.18, -0.05], head: [0, 30, 0] },
    { t: 0.94, ease: 'in', ...odh(k22(-0.1, 1.0, 0.8), [0.15, 0.1, 0.98]), chest: [12, -4, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 1.08, ease: 'out', ...odh(k22(0.62, 0.95, 0.2), [0.92, -0.05, -0.38]), chest: [12, 48, 0], spine: [6, 18, 0], hips: [0, 12, 0], hipsPos: [0, -0.22, 0.05] },
    { t: 1.5, ...odh(k22(0.58, 0.96, 0.15), [0.9, 0, -0.42]), chest: [10, 42, 0], spine: [6, 16, 0] },
    od(1.9),
  ]),
  /** Overhead slam into the flags (1.05 s tell): the ground shakes. */
  odSlam: new Clip('odSlam', [
    od(0),
    { t: 1.05, ease: 'out', ...odh(k22(-0.1, 2.1, -0.15), [0.02, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), chest: [-20, -4, 0], spine: [-10, -2, 0], head: [10, 0, 0], hipsPos: [0, 0.03, -0.06] },
    { t: 1.15, ease: 'in', ...odh(k22(-0.06, 1.3, 0.75), [0, 0.3, 0.95]), chest: [16, -2, 0], spine: [8, 0, 0], footL: k22(0.14, 0.07, 0.45) },
    { t: 1.24, ease: 'out', ...odh(k22(-0.04, 0.4, 0.95), [0, -0.75, 0.66]), chest: [42, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.34, 0.12], head: [-22, 0, 0] },
    { t: 1.95, ...odh(k22(-0.05, 0.42, 0.92), [0, -0.74, 0.67]), chest: [38, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.32, 0.1] },
    od(2.4),
  ]),
  /** Shoulder shove (unparryable): 0.6 s tell. */
  odShove: new Clip('odShove', [
    od(0),
    { t: 0.6, ease: 'out', chest: [12, 40, 0], spine: [8, 16, 0], hips: [0, 12, 0], hipsPos: [0, -0.22, -0.1], head: [-10, -26, 0], footR: k22(-0.15, 0.07, -0.35) },
    { t: 0.74, ease: 'out', chest: [24, 30, 0], spine: [12, 12, 0], hipsPos: [0, -0.26, 0.28], footL: k22(0.14, 0.07, 0.62) },
    { t: 1.0, chest: [20, 26, 0], hipsPos: [0, -0.24, 0.2] },
    od(1.4),
  ]),
  /** Staggered against a wall: head snaps back, ram sags, drops to a knee (vulnerable). */
  odStunned: new Clip('odStunned', [
    od(0),
    { t: 0.18, ease: 'out', ...odh(k22(-0.3, 0.7, 0.3), [0.2, -0.5, 0.84]), chest: [-30, 8, 0], spine: [-14, 0, 0], head: [-30, 0, 0], hipsPos: [0, -0.1, -0.18], footR: k22(-0.14, 0.12, -0.4) },
    { ...KNEEL, t: 0.6, ease: 'in', handR: S(k22(-0.3, 0.45, 0.45), [0.1, -0.6, 0.79]), handL: null, fk: { upperArmL: [-20, 0, 20], forearmL: [-40, 0, 0] }, head: [30, 0, 0] } as Key,
    { ...KNEEL, t: 2.9, chest: [22, 0, 0], head: [20, 0, 0] } as Key,
    { ...od(3.4), footL: k22(0.12, 0.08, 0.02), footR: k22(-0.12, 0.08, -0.03), footPitchR: 0, hips: [0, 0, 0], neck: [0, 0, 0] },
  ]),
  /** Phase change: tears the ruined ram-helm's cheek-plates away and roars. */
  odRoar: new Clip('odRoar', [
    od(0),
    { t: 0.5, ease: 'out', handL: null, fk: { upperArmL: [-150, 0, 10], forearmL: [-120, 0, 0] }, chest: [14, 0, 0], head: [30, 0, 0] },
    { t: 1.1, fk: { upperArmL: [-40, 0, 60], forearmL: [-20, 0, 0] }, chest: [-24, 0, 0], spine: [-10, 0, 0], head: [-34, 0, 0], hipsPos: [0, -0.2, 0] },
    { t: 2.4, fk: { upperArmL: [-30, 0, 70], forearmL: [-10, 0, 0] }, chest: [-26, 0, 0], head: [-36, 0, 0] },
    od(3.0),
  ]),
  odDeath: new Clip('odDeath', [
    od(0),
    { ...KNEEL, t: 0.7, ease: 'out', handR: S(k22(-0.2, 0.5, 0.6), [0, -0.9, 0.4]), handL: null, head: [30, 0, 0] } as Key,
    { ...KNEEL, t: 1.6, chest: [30, 0, 0], head: [34, 0, 0] } as Key,
    { ...PRONE, t: 2.3, ease: 'in' } as Key,
    { ...PRONE, t: 2.6, hipsPos: [0, -0.9, 0.34] } as Key,
  ]),

  // ---------------------------------------------------------------- Marshal Ysolde Varr
  varrStand: new Clip('varrStand', [VR], { loop: true, duration: 1 }),
  /** Halberd thrust, drawn back level with the eye (0.62 s tell). */
  varrThrust: new Clip('varrThrust', [
    vr(0),
    { t: 0.62, ease: 'out', ...vh(k06(-0.3, 1.18, -0.38), [0, 0.04, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -32, 0], spine: [0, -12, 0], hips: [0, -12, 0], hipsPos: [0, -0.14, -0.08], footR: k06(-0.15, 0.08, -0.34), head: [0, 18, 0] },
    { t: 0.74, ease: 'out', ...vh(k06(-0.1, 1.2, 0.58), [0.02, -0.02, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], spine: [6, 2, 0], hips: [0, 4, 0], hipsPos: [0, -0.2, 0.14], footL: k06(0.14, 0.08, 0.56), head: [0, 0, 0] },
    { t: 1.1, ...vh(k06(-0.11, 1.18, 0.55), [0.02, -0.04, 1], { up: [0, 1, 0] }), chest: [10, 6, 0], hipsPos: [0, -0.19, 0.12] },
    vr(1.5),
  ]),
  /** Wide sweep from the right (0.72 s tell); the hook back is its follow-up. */
  varrSweep: new Clip('varrSweep', [
    vr(0),
    { t: 0.72, ease: 'out', ...vh(k06(-0.56, 1.28, -0.32), [-0.72, 0.36, -0.6], { elbow: [-0.9, -0.1, -0.1] }), chest: [4, -56, 0], spine: [2, -22, 0], hips: [0, -14, 0], hipsPos: [0, -0.12, -0.04], head: [0, 36, 0] },
    { t: 0.84, ease: 'in', ...vh(k06(-0.14, 1.1, 0.62), [0.22, 0.12, 0.97]), chest: [10, -6, 0], spine: [6, 0, 0], hips: [0, 0, 0], head: [0, 0, 0] },
    { t: 0.96, ease: 'out', ...vh(k06(0.46, 1.0, 0.3), [0.95, -0.05, -0.26]), chest: [10, 50, 0], spine: [6, 20, 0], hips: [0, 12, 0], hipsPos: [0, -0.18, 0.05] },
    { t: 1.3, ...vh(k06(0.44, 1.02, 0.26), [0.93, 0, -0.32]), chest: [8, 44, 0], spine: [5, 18, 0] },
    vr(1.7),
  ]),
  /** The hook: from the end of the sweep, the halberd's hook is hauled back across (told by the sweep). */
  varrHook: new Clip('varrHook', [
    { t: 0, ...vh(k06(0.44, 1.02, 0.26), [0.93, 0, -0.32]), chest: [8, 44, 0], spine: [5, 18, 0], hipsPos: [0, -0.18, 0.05] },
    { t: 0.26, ease: 'out', ...vh(k06(0.2, 1.12, 0.66), [0.5, 0.05, 0.86]), chest: [10, 20, 0], spine: [6, 8, 0] },
    { t: 0.4, ease: 'out', ...vh(k06(-0.52, 1.12, 0.12), [-0.9, 0.1, 0.42]), chest: [4, -40, 0], spine: [2, -16, 0], hips: [0, -10, 0], hipsPos: [0, -0.14, -0.06] },
    { t: 0.85, ...vh(k06(-0.5, 1.12, 0.1), [-0.9, 0.12, 0.4]), chest: [4, -36, 0] },
    vr(1.25),
  ]),
  /** Overhead chop, axe-blade first (0.95 s tell), hyper-armoured. */
  varrChop: new Clip('varrChop', [
    vr(0),
    { t: 0.95, ease: 'out', ...vh(k06(-0.1, 2.02, -0.16), [0.02, 0.36, -0.93], { elbow: [-0.9, 0.2, -0.2] }), chest: [-18, -4, 0], spine: [-10, -2, 0], head: [10, 0, 0], hipsPos: [0, 0.02, -0.06] },
    { t: 1.07, ease: 'in', ...vh(k06(-0.06, 1.32, 0.72), [0, 0.3, 0.95]), chest: [14, -2, 0], spine: [8, 0, 0], footL: k06(0.14, 0.08, 0.44) },
    { t: 1.16, ease: 'out', ...vh(k06(-0.04, 0.48, 0.95), [0, -0.7, 0.72]), chest: [40, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.3, 0.12], head: [-20, 0, 0] },
    { t: 1.6, ...vh(k06(-0.05, 0.5, 0.92), [0, -0.7, 0.72]), chest: [36, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.28, 0.1] },
    vr(2.0),
  ]),
  /** The volley signal: the halberd raised straight up and held (the gunners fire on the Marshal's word). */
  varrVolley: new Clip('varrVolley', [
    vr(0),
    { t: 0.5, ease: 'out', handR: S(k06(-0.16, 1.92, 0.1), [0, 1, 0.08], { up: [0, -0.08, 1], elbow: [-0.8, -0.2, 0] }), handL: null, fk: { upperArmL: [-30, 0, 50], forearmL: [-30, 0, 0] }, chest: [-16, 0, 0], spine: [-8, 0, 0], head: [-24, 0, 0], hipsPos: [0, 0.02, 0] },
    { t: 1.7, handR: S(k06(-0.16, 1.96, 0.1), [0, 1, 0.08], { up: [0, -0.08, 1], elbow: [-0.8, -0.2, 0] }), chest: [-18, 0, 0], head: [-26, 0, 0] },
    { t: 2.0, ease: 'in', handR: S(k06(-0.3, 1.2, 0.5), [0.05, 0.3, 0.95]), chest: [10, -6, 0], head: [0, 0, 0] },
    vr(2.4),
  ]),
  /** The fury (phase 2): cut, cut, thrust — then an overhead held a breath too long, and a long recovery. */
  varrFury: new Clip('varrFury', [
    vr(0),
    { t: 0.36, ease: 'out', ...vh(k06(-0.5, 1.4, -0.2), [-0.6, 0.5, -0.62], { elbow: [-0.9, 0, -0.2] }), chest: [-8, -40, 0], spine: [-2, -16, 0], hips: [0, -10, 0] },
    { t: 0.46, ease: 'in', ...vh(k06(-0.1, 1.2, 0.62), [0.3, 0.2, 0.93]), chest: [8, -2, 0], spine: [6, 0, 0], hips: [0, 0, 0], footL: k06(0.14, 0.08, 0.3) },
    { t: 0.56, ease: 'out', ...vh(k06(0.4, 0.9, 0.36), [0.85, -0.4, 0.3]), chest: [16, 34, 0], spine: [8, 14, 0], hipsPos: [0, -0.14, 0.08] },
    { t: 0.78, ease: 'out', ...vh(k06(0.42, 1.2, 0.1), [0.8, 0.3, -0.5], { elbow: [-0.2, -0.8, -0.4] }), chest: [6, 36, 0], spine: [4, 14, 0] },
    { t: 0.88, ease: 'in', ...vh(k06(0, 1.2, 0.66), [-0.2, 0.3, 0.93]), chest: [4, 0, 0], footR: k06(-0.14, 0.08, 0.3) },
    { t: 0.98, ease: 'out', ...vh(k06(-0.48, 1.25, 0.3), [-0.92, 0.3, 0.2]), chest: [-2, -30, 0], spine: [0, -12, 0], hipsPos: [0, -0.1, 0.05] },
    { t: 1.18, ease: 'out', ...vh(k06(-0.32, 1.25, -0.34), [0, 0.03, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [0, -34, 0], spine: [0, -14, 0], hipsPos: [0, -0.14, -0.06] },
    { t: 1.3, ease: 'out', ...vh(k06(-0.08, 1.22, 0.62), [0.02, -0.03, 1], { up: [0, 1, 0] }), chest: [12, 8, 0], spine: [8, 4, 0], hipsPos: [0, -0.2, 0.12], footL: k06(0.14, 0.08, 0.55) },
    { t: 1.85, ease: 'out', ...vh(k06(-0.1, 2.04, -0.08), [0.02, 0.4, -0.92], { elbow: [-0.9, 0.2, -0.2] }), chest: [-18, -6, 0], spine: [-10, -2, 0], head: [8, 0, 0], hipsPos: [0, 0.02, 0] },
    { t: 2.3, ...vh(k06(-0.1, 2.08, -0.1), [0.02, 0.36, -0.93], { elbow: [-0.9, 0.2, -0.2] }), chest: [-20, -6, 0], spine: [-11, -2, 0], head: [10, 0, 0] },
    { t: 2.42, ease: 'in', ...vh(k06(-0.06, 1.3, 0.7), [0, 0.3, 0.95]), chest: [14, -2, 0], spine: [8, 0, 0], footL: k06(0.14, 0.08, 0.45) },
    { t: 2.52, ease: 'out', ...vh(k06(-0.04, 0.42, 0.95), [0, -0.72, 0.7]), chest: [42, -2, 0], spine: [20, 0, 0], hipsPos: [0, -0.32, 0.12], head: [-22, 0, 0] },
    { t: 3.3, ...vh(k06(-0.05, 0.45, 0.9), [0, -0.74, 0.68]), chest: [38, -2, 0], spine: [18, 0, 0], hipsPos: [0, -0.3, 0.1], head: [-6, 0, 0] },
    vr(3.7),
  ]),
  /** Running lunge (0.8 s crouched tell), the halberd levelled. */
  varrLunge: new Clip('varrLunge', [
    vr(0),
    { t: 0.8, ease: 'out', ...vh(k06(-0.3, 1.0, -0.3), [0, 0.1, 1], { up: [0, 1, 0], elbow: [-0.8, -0.2, -0.5] }), chest: [16, -26, 0], spine: [8, -10, 0], hipsPos: [0, -0.26, -0.1], footR: k06(-0.15, 0.08, -0.42), footL: k06(0.14, 0.08, 0.2), head: [-10, 18, 0] },
    { t: 0.9, footL: k06(0.14, 0.2, 0.5), footR: k06(-0.15, 0.08, -0.3), hipsPos: [0, -0.2, 0.1] },
    { t: 1.0, ease: 'out', ...vh(k06(-0.1, 1.18, 0.62), [0.02, -0.02, 1], { up: [0, 1, 0] }), footL: k06(0.14, 0.08, 0.6), footR: k06(-0.15, 0.2, -0.2), chest: [12, 6, 0], spine: [6, 2, 0], hipsPos: [0, -0.22, 0.16], head: [0, 0, 0] },
    { t: 1.45, ...vh(k06(-0.1, 1.16, 0.6), [0.02, -0.04, 1], { up: [0, 1, 0] }), chest: [12, 6, 0], hipsPos: [0, -0.2, 0.12], footR: k06(-0.15, 0.08, -0.25) },
    vr(1.9),
  ]),
  /** The Defeat: struck to one knee, the banner catches fire, she rises without her pauldron. */
  varrTransition: new Clip('varrTransition', [
    vr(0),
    { t: 0.4, ease: 'out', ...vh(k06(-0.3, 0.7, 0.4), [0.1, -0.7, 0.7]), chest: [-20, 12, 0], spine: [-10, 0, 0], head: [-20, 0, 0], hipsPos: [0, -0.12, -0.16] },
    { ...KNEEL, t: 1.0, ease: 'in', ...vh(k06(-0.2, 0.62, 0.55), [0, -0.95, 0.3], { up: [0, 0, 1] }), head: [26, 0, 0] } as Key,
    { ...KNEEL, t: 2.2, ...vh(k06(-0.2, 0.64, 0.55), [0, -0.95, 0.3], { up: [0, 0, 1] }), chest: [26, 0, 0], head: [34, 0, 0] } as Key,
    { t: 2.8, ease: 'out', ...vh(k06(-0.2, 1.1, 0.3), [0.1, 0.6, 0.8]), hipsPos: [0, -0.06, 0], hips: [0, 0, 0], spine: [-6, 0, 0], chest: [-14, -8, 0], neck: [0, 0, 0], head: [-18, 0, 0], footL: k06(0.12, 0.08, 0.12), footR: k06(-0.12, 0.08, -0.1), footPitchR: 0 },
    vr(3.4),
  ]),
  /** Death: she drives the halberd into the flags and kneels against it. */
  varrDeath: new Clip('varrDeath', [
    vr(0),
    { ...KNEEL, t: 0.7, ease: 'out', handR: S(k06(-0.12, 0.98, 0.55), [0, 1, 0.05], { up: [0, 0, 1] }), handL: S(k06(-0.06, 1.1, 0.55), [0, 1, 0.05], { elbow: [0.8, -0.4, -0.4] }), head: [24, 0, 0] } as Key,
    { ...KNEEL, t: 3.0, handR: S(k06(-0.12, 0.98, 0.55), [0, 1, 0.05], { up: [0, 0, 1] }), handL: S(k06(-0.06, 1.1, 0.55), [0, 1, 0.05], { elbow: [0.8, -0.4, -0.4] }), chest: [32, 0, 0], head: [40, 0, 0] } as Key,
  ]),
};
