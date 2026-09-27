/** Catalyst (staff / bell / censer held in the right hand) moveset. */
import { Clip } from '../Clip';
import { STAFF_REST } from './stances';
import type { HandKey, Key } from '../types';

const REST: Key = { t: 0, handR: STAFF_REST, chest: [1, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0], hipsPos: [0, -0.04, 0] };
const rest = (t: number): Key => ({ ...REST, t, ease: 'inout' });
const H = (p: [number, number, number], dir: [number, number, number], x: Partial<HandKey> = {}): HandKey => ({ p, dir, elbow: [-0.7, -0.5, -0.5], ...x });

export const staffClips = {
  /** Quick cast: thrust the staff head toward the target. `cast` event at ~0.28. */
  castQuick: new Clip('castQuick', [
    rest(0),
    { t: 0.2, ease: 'out', handR: H([-0.22, 1.34, 0.3], [0.02, 0.8, 0.6], { up: [0, -0.6, 0.8] }), chest: [-4, -14, 0], spine: [0, -6, 0], fk: { upperArmL: [-30, 0, 30], forearmL: [-50, 0, 0] } },
    { t: 0.3, ease: 'out', handR: H([-0.16, 1.4, 0.56], [0.02, 0.35, 0.94], { up: [0, -0.94, 0.35] }), chest: [8, 6, 0], spine: [4, 2, 0], footL: [0.13, 0.08, 0.2] },
    { t: 0.5, handR: H([-0.17, 1.38, 0.5], [0.02, 0.45, 0.9], { up: [0, -0.9, 0.45] }), chest: [6, 4, 0] },
    rest(0.75),
  ]),
  /** Heavy cast: rear back and hurl (Cinder Bolt, lances). `cast` event at ~0.46. */
  castHeavy: new Clip('castHeavy', [
    rest(0),
    { t: 0.38, ease: 'out', handR: H([-0.36, 1.55, -0.18], [-0.1, 0.92, -0.35], { up: [0, 0.35, 0.93], elbow: [-0.9, -0.2, -0.3] }), chest: [-10, -30, 0], spine: [-4, -12, 0], hips: [0, -8, 0], hipsPos: [0, -0.08, -0.05], footR: [-0.15, 0.08, -0.25], fk: { upperArmL: [-60, 0, 40], forearmL: [-40, 0, 0] } },
    { t: 0.48, ease: 'in', handR: H([-0.14, 1.42, 0.6], [0.02, 0.3, 0.95], { up: [0, -0.95, 0.3] }), chest: [12, 10, 0], spine: [6, 4, 0], hips: [0, 4, 0], hipsPos: [0, -0.14, 0.08], footL: [0.14, 0.08, 0.35] },
    { t: 0.8, handR: H([-0.15, 1.36, 0.55], [0.02, 0.4, 0.92], { up: [0, -0.92, 0.4] }), chest: [10, 8, 0], hipsPos: [0, -0.12, 0.06] },
    rest(1.1),
  ]),
  /** Channel: hold the staff up before you (wards, heals, buffs). `cast` at ~0.5. */
  channel: new Clip('channel', [
    rest(0),
    { t: 0.35, ease: 'out', handR: H([-0.08, 1.28, 0.36], [0.02, 1, 0.05], { up: [0, 0, 1] }), chest: [-4, 6, 0], head: [-6, 0, 0], fk: { upperArmL: [-70, 0, -30], forearmL: [-70, 0, 0], handL: [0, 0, 20] } },
    { t: 0.8, handR: H([-0.08, 1.34, 0.36], [0.02, 1, 0.05], { up: [0, 0, 1] }), chest: [-6, 6, 0], head: [-8, 0, 0] },
    rest(1.15),
  ]),
  /** Guard overlay without a shield: staff held crosswise before the chest, off-hand bracing it. */
  guardStaff: new Clip('guardStaff', [
    { t: 0, handR: H([-0.24, 1.22, 0.32], [0.92, 0.35, 0.1], { up: [0, -0.3, 0.95], elbow: [-0.8, -0.5, -0.2] }), handL: { p: [0.18, 1.28, 0.34], dir: [0.3, 0.9, 0.3], elbow: [0.8, -0.5, -0.2] }, chest: [4, 6, 0], spine: [4, 2, 0], head: [-4, -4, 0] },
  ], { loop: true, duration: 1 }),
  /** Guard overlay with a one-handed weapon and no shield: blade raised across the body. */
  guardBlade: new Clip('guardBlade', [
    { t: 0, handR: { p: [-0.08, 1.2, 0.36], dir: [0.55, 0.75, 0.3], up: [0.5, -0.6, 0.6], elbow: [-0.8, -0.5, -0.2] }, chest: [4, 10, 0], spine: [4, 4, 0], head: [-4, -6, 0] },
  ], { loop: true, duration: 1 }),
  /** Staff bash: flat horizontal sweep. */
  staffLight: new Clip('staffLight', [
    rest(0),
    { t: 0.24, ease: 'out', handR: H([-0.42, 1.2, 0.02], [-0.6, 0.45, 0.65], { elbow: [-0.9, -0.3, -0.2] }), chest: [-2, -30, 0], spine: [0, -12, 0], hips: [0, -8, 0] },
    { t: 0.33, ease: 'in', handR: H([-0.1, 1.15, 0.52], [0.35, 0.25, 0.9]), chest: [4, -2, 0], spine: [2, 0, 0], hips: [0, 0, 0], footL: [0.13, 0.08, 0.22] },
    { t: 0.42, ease: 'out', handR: H([0.3, 1.1, 0.38], [0.92, 0.15, 0.35]), chest: [6, 26, 0], spine: [4, 12, 0], hips: [0, 8, 0] },
    { t: 0.6, handR: H([0.26, 1.1, 0.34], [0.9, 0.25, 0.3]), chest: [6, 22, 0], spine: [4, 10, 0] },
    rest(0.85),
  ]),
  /** Staff heavy: overhead crush. */
  staffHeavy: new Clip('staffHeavy', [
    rest(0),
    { t: 0.4, ease: 'out', handR: H([-0.12, 1.8, -0.06], [0, 0.35, -0.94], { elbow: [-0.9, 0.1, -0.2] }), chest: [-12, -8, 0], spine: [-6, -4, 0] },
    { t: 0.5, ease: 'in', handR: H([-0.08, 1.45, 0.55], [0, 0.6, 0.8]), chest: [8, -4, 0], footL: [0.13, 0.08, 0.34] },
    { t: 0.6, ease: 'out', handR: H([-0.06, 0.78, 0.6], [0, -0.5, 0.86]), chest: [26, -2, 0], spine: [14, 0, 0], hipsPos: [0, -0.16, 0.08] },
    { t: 0.85, handR: H([-0.07, 0.8, 0.56], [0, -0.4, 0.9]), chest: [22, -2, 0], spine: [12, 0, 0], hipsPos: [0, -0.14, 0.06] },
    rest(1.15),
  ]),
};
