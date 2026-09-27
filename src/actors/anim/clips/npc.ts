/** NPC idle loops. */
import { Clip } from '../Clip';

export const npcClips = {
  /** Seated on a cot / straw, hands on knees (Oswin in the cell, tending the sick). */
  sit: new Clip('sit', [
    { t: 0, hipsPos: [0, -0.5, -0.1], hips: [-6, 0, 0], spine: [16, 0, 0], chest: [10, 0, 0], head: [16, 0, 0], footL: [0.15, 0.08, 0.4], footR: [-0.15, 0.08, 0.42], handL: null, handR: null, fk: { upperArmL: [-30, 0, 5], forearmL: [-50, 0, 0], upperArmR: [-30, 0, -5], forearmR: [-50, 0, 0] } },
    { t: 2.5, spine: [18, 0, 0], chest: [12, 0, 0], head: [20, -6, 0] },
    { t: 5, spine: [16, 0, 0], chest: [10, 0, 0], head: [16, 0, 0] },
  ], { loop: true, duration: 5 }),
  /** Hesper at the anvil: hammer raised and brought down. */
  forge: new Clip('forge', [
    { t: 0, handR: null, handL: null, chest: [18, -10, 0], spine: [10, 0, 0], head: [14, 0, 0], fk: { upperArmR: [-40, 0, -10], forearmR: [-40, 0, 0], upperArmL: [-45, 0, 12], forearmL: [-50, 0, 0] } },
    { t: 0.55, ease: 'out', fk: { upperArmR: [-150, 0, -15], forearmR: [-60, 0, 0], upperArmL: [-45, 0, 12], forearmL: [-50, 0, 0] }, chest: [6, -14, 0] },
    { t: 0.72, ease: 'in', fk: { upperArmR: [-50, 0, -10], forearmR: [-30, 0, 0], upperArmL: [-45, 0, 12], forearmL: [-50, 0, 0] }, chest: [20, -8, 0] },
    { t: 1.6, fk: { upperArmR: [-40, 0, -10], forearmR: [-40, 0, 0], upperArmL: [-45, 0, 12], forearmL: [-50, 0, 0] }, chest: [18, -10, 0] },
  ], { loop: true, duration: 1.6 }),
  /** Standing idle with folded hands (Oswin at the hospice). */
  standPray: new Clip('standPray', [
    { t: 0, handR: null, handL: null, head: [10, 0, 0], fk: { upperArmL: [-25, 0, -18], forearmL: [-95, 0, 0], upperArmR: [-25, 0, 18], forearmR: [-95, 0, 0] } },
  ], { loop: true, duration: 1 }),
  /** Straw dummy: rigid. */
  rigid: new Clip('rigid', [
    { t: 0, handR: null, handL: null, fk: { upperArmL: [0, 0, 80], forearmL: [0, 0, 0], upperArmR: [0, 0, -80], forearmR: [0, 0, 0] } },
  ], { loop: true, duration: 1 }),
};
