/**
 * Beast clips, generated per breed from the quadruped pose builder (body.ts). Every attack has a
 * readable tell (lowered head / crouch / rear), a committed strike and a clear recovery; reactions
 * and critical-victim clips are posed for a four-legged body (collapse on the side, not on the face).
 *
 * Timings live in `BT` so moves (defs.ts) and clips can never drift apart.
 */
import * as THREE from 'three';
import { Clip } from '../../actors/anim/Clip';
import type { Key, V3 } from '../../actors/anim/types';
import { footprint, qkey, trunkFK, type QP, type QuadDims } from './body';

/** Beat times (seconds) shared by clips and moves. */
export const BT = {
  bite: { tell: 0.45, snap: 0.53, shut: 0.62, dur: 1.05 },
  bite2: { tell: 0.3, snap: 0.37, dur: 0.9 },
  hamstring: { tell: 0.5, snap: 0.58, dur: 1.1 },
  lunge: { tell: 0.6, launch: 0.72, bite: 0.84, land: 0.96, dur: 1.55 },
  pounce: { tell: 0.8, launch: 0.92, apex: 1.04, land: 1.16, dur: 1.95 },
  maul: { tell: 0.58, strike: 0.68, dur: 1.4 },
  hop: { dur: 0.8 },
  bark: { dur: 1.7 },
  gore: { tell: 0.75, strike: 0.9, dur: 1.7 },
  rear: { tell: 0.95, strike: 1.12, dur: 2.2 },
  flinch: { dur: 0.42 },
  stagger: { dur: 0.85 },
  parried: { dur: 1.55 },
  broken: { dur: 2.5 },
  death: { dur: 2.0 },
};

const D2R = Math.PI / 180;

/** Lying on the right side: trunk rolled, legs stretched out toward the belly (its left). */
function onSide(d: QuadDims, t: number, x: Omit<QP, 't'> = {}, ease?: Key['ease']): Key {
  const s = d.s, bulk = d.bulk;
  const base: QP = {
    t, ease,
    y: 0.16 * bulk + 0.02 - d.hipH, roll: 86, pitch: 90 - d.trunk.hips[0] + 2, z: 0.05,
    spine: [0, 0, -4], chest: [2, 0, -4], neck: [26, 0, 0], head: [-6, 0, 18],
    ...x,
  };
  // paw targets from the rolled trunk: joint + (belly direction × leg reach)
  const k = qkey(d, base);
  const fp = footprint(d);
  const ang = { hips: k.hips!, spine: k.spine!, chest: k.chest!, neck: k.neck!, head: k.head! };
  const J = trunkFK(d, k.hipsPos!, ang);
  const q = (v: V3) => new THREE.Quaternion().setFromEuler(new THREE.Euler(v[0] * D2R, v[1] * D2R, v[2] * D2R, 'XYZ'));
  const qc = q(ang.hips).multiply(q(ang.spine)).multiply(q(ang.chest));
  const belly = new THREE.Vector3(0, 0, 1).applyQuaternion(qc).setY(0).normalize();
  const along = new THREE.Vector3(0, 1, 0).applyQuaternion(qc).setY(0).normalize();
  const paw = (j: THREE.Vector3, reach: number, fwd: number, lift: number, fpv: V3): V3 => {
    const p = j.clone().addScaledVector(belly, reach * s).addScaledVector(along, fwd * s);
    return [(p.x - fpv[0]) / s, Math.max(0, p.y * 0.25 + lift) / s, (p.z - fpv[2]) / s];
  };
  return qkey(d, {
    ...base,
    fl: paw(J.shoulderL, 0.5, 0.12, 0.06, fp.fl), fr: paw(J.shoulderR, 0.52, 0.2, 0.0, fp.fr),
    hl: paw(J.hipL, 0.55, -0.12, 0.06, fp.hl), hr: paw(J.hipR, 0.5, 0.02, 0.0, fp.hr),
    flFlex: 25, frFlex: 15, hlPitch: 40, hrPitch: 50,
  });
}

/** Sunk on the belly, forelegs splayed (posture broken / critical plunge). */
const SUNK = (d: QuadDims): Omit<QP, 't'> => ({
  y: -0.34, pitch: 8, z: 0.02, neck: [30, 0, 0], head: [12, 0, 10],
  fl: [0.06, 0, 0.18], fr: [-0.05, 0, 0.26], flFlex: -25, frFlex: -30,
  hl: [0.05, 0, 0.12], hr: [-0.05, 0, 0.16], hlPitch: 55, hrPitch: 60,
  spine: [4, 0, 0], chest: [4, 0, 0],
  ...(d.id === 'cs' ? { y: -0.4 } : {}),
});

export function beastClips(d: QuadDims): Record<string, Clip> {
  const id = d.id;
  const q = (t: number, p: Omit<QP, 't'> = {}, ease?: Key['ease']) => qkey(d, { ...p, t, ease });
  const C = (name: string, keys: Key[], o?: { loop?: boolean; duration?: number }) => new Clip(`${id}_${name}`, keys, o);
  const B = BT;

  const clips: Clip[] = [
    // ---------------------------------------------------------------- attacks
    /** Snap bite: head drops and draws back (0.45 s tell), lunge-snap, clamp, a savage shake. */
    C('bite', [
      q(0),
      q(B.bite.tell, { y: -0.07, z: -0.07, pitch: 6, neck: [24, 0, 0], head: [6, 0, 0], hl: [0, 0, 0.04], hr: [0, 0, 0.04], spine: [3, 0, 0] }, 'out'),
      q(B.bite.snap, { y: -0.02, z: 0.2, pitch: -3, neck: [-12, 0, 0], head: [-14, 0, 0], fr: [0, 0, 0.14], hlPitch: -15, hrPitch: -15 }, 'in'),
      q(B.bite.shut, { y: -0.04, z: 0.22, pitch: 0, neck: [-4, 0, 0], head: [8, 0, 0], fr: [0, 0, 0.14] }, 'out'),
      q(0.74, { y: -0.05, z: 0.18, neck: [0, 0, -12], head: [8, 0, -22], fr: [0, 0, 0.14] }),
      q(0.84, { y: -0.05, z: 0.16, neck: [0, 0, 10], head: [6, 0, 18], fr: [0, 0, 0.14] }),
      q(B.bite.dur, {}, 'inout'),
    ]),
    /** Follow-up: a sideways snap from where the first bite left the head. */
    C('bite2', [
      q(0, { y: -0.03, z: 0.05, neck: [6, 0, -14], head: [4, 0, -20] }),
      q(B.bite2.tell, { y: -0.06, z: -0.02, neck: [14, 0, -22], head: [4, 0, -28], yaw: 8 }, 'out'),
      q(B.bite2.snap, { y: -0.03, z: 0.2, neck: [-8, 0, 10], head: [-6, 0, 14], yaw: -6, fl: [0, 0, 0.12] }, 'in'),
      q(0.5, { y: -0.04, z: 0.18, neck: [0, 0, 6], head: [8, 0, 8], fl: [0, 0, 0.12] }),
      q(B.bite2.dur, {}, 'inout'),
    ]),
    /** Hamstring bite: nose to the ground and sideways, then a low slashing snap at the legs. */
    C('hamstring', [
      q(0),
      q(B.hamstring.tell, { y: -0.12, z: -0.05, pitch: 10, neck: [40, 0, 14], head: [16, 0, 22], yaw: 10, hl: [0, 0, 0.06], hr: [0, 0, 0.06] }, 'out'),
      q(B.hamstring.snap, { y: -0.14, z: 0.24, pitch: 12, neck: [34, 0, -18], head: [10, 0, -24], yaw: -12, fl: [0, 0, 0.16], hlPitch: -20, hrPitch: -20 }, 'in'),
      q(0.72, { y: -0.12, z: 0.22, pitch: 10, neck: [30, 0, -10], head: [12, 0, -14], yaw: -10, fl: [0, 0, 0.16] }),
      q(B.hamstring.dur, {}, 'inout'),
    ]),
    /** Lunge bite: a low crouch with the hind legs gathered (0.6 s), a flat leap, jaws first. */
    C('lunge', [
      q(0),
      q(B.lunge.tell, { y: -0.17, z: -0.1, pitch: 5, neck: [20, 0, 0], head: [4, 0, 0], hl: [0, 0, 0.12], hr: [0, 0, 0.12], fl: [0, 0, 0.04], fr: [0, 0, 0.04], hlPitch: 20, hrPitch: 20, spine: [6, 0, 0] }, 'out'),
      q(B.lunge.launch, { y: 0.06, z: 0.22, pitch: -9, neck: [-12, 0, 0], head: [-8, 0, 0], fl: [0, 0.24, 0.3], fr: [0, 0.2, 0.36], flFlex: 70, frFlex: 60, hl: [0, 0.02, -0.18], hr: [0, 0.05, -0.2], hlPitch: -30, hrPitch: -34, spine: [-8, 0, 0] }, 'in'),
      q(B.lunge.bite, { y: 0.03, z: 0.3, pitch: 2, neck: [-10, 0, 0], head: [-4, 0, 0], fl: [0, 0.12, 0.42], fr: [0, 0.1, 0.44], flFlex: 10, frFlex: 5, hl: [0, 0.12, -0.08], hr: [0, 0.1, -0.1], hlPitch: -20, hrPitch: -20 }),
      q(B.lunge.land, { y: -0.1, z: 0.12, pitch: 6, neck: [4, 0, 0], head: [8, 0, 0], fl: [0, 0, 0.14], fr: [0, 0, 0.18], hl: [0, 0, -0.02], hr: [0, 0, 0.0] }, 'in'),
      q(1.15, { y: -0.06, z: 0.06, neck: [6, 0, -10], head: [6, 0, -14], fl: [0, 0, 0.1], fr: [0, 0, 0.12] }),
      q(B.lunge.dur, {}, 'inout'),
    ]),
    /** Pounce (unparryable): rump-wiggle in a deep crouch, a high arcing leap that lands forepaws-first. */
    C('pounce', [
      q(0),
      q(0.3, { y: 0.02, neck: [-14, 0, 0], head: [-8, 0, 0] }, 'out'),
      q(0.52, { y: -0.16, z: -0.08, pitch: 6, yaw: 6, neck: [18, 0, 0], head: [2, 0, 0], hl: [0, 0, 0.12], hr: [0, 0, 0.12], hlPitch: 25, hrPitch: 25 }),
      q(0.66, { y: -0.2, z: -0.1, pitch: 7, yaw: -6, neck: [20, 0, 0], head: [0, 0, 0], hl: [0, 0, 0.14], hr: [0, 0, 0.14], hlPitch: 30, hrPitch: 30 }),
      q(B.pounce.tell, { y: -0.22, z: -0.12, pitch: 7, yaw: 0, neck: [22, 0, 0], head: [-2, 0, 0], hl: [0, 0, 0.15], hr: [0, 0, 0.15], fl: [0, 0, 0.04], fr: [0, 0, 0.04], hlPitch: 32, hrPitch: 32, spine: [8, 0, 0] }, 'out'),
      q(B.pounce.launch, { y: 0.34, z: 0.2, pitch: -26, neck: [-6, 0, 0], head: [8, 0, 0], fl: [0, 0.5, 0.34], fr: [0, 0.46, 0.4], flFlex: 40, frFlex: 36, hl: [0, 0.08, -0.22], hr: [0, 0.1, -0.24], hlPitch: -35, hrPitch: -38, spine: [-10, 0, 0] }, 'in'),
      q(B.pounce.apex, { y: 0.26, z: 0.26, pitch: 6, neck: [-16, 0, 0], head: [-4, 0, 0], fl: [0.06, 0.3, 0.56], fr: [-0.06, 0.28, 0.58], flFlex: -10, frFlex: -10, hl: [0, 0.2, -0.05], hr: [0, 0.2, -0.06] }),
      q(B.pounce.land, { y: -0.14, z: 0.22, pitch: 10, neck: [8, 0, 0], head: [10, 0, 0], fl: [0.08, 0, 0.44], fr: [-0.08, 0, 0.46], flFlex: -20, frFlex: -20, hl: [0, 0, 0.16], hr: [0, 0, 0.18], hlPitch: 20, hrPitch: 20 }, 'in'),
      q(1.45, { y: -0.16, z: 0.2, pitch: 10, neck: [10, 0, -8], head: [12, 0, -10], fl: [0.08, 0, 0.44], fr: [-0.08, 0, 0.46], flFlex: -20, frFlex: -20, hl: [0, 0, 0.16], hr: [0, 0, 0.18], hlPitch: 20, hrPitch: 20 }),
      q(B.pounce.dur, {}, 'inout'),
    ]),
    /** Rearing forepaw rake (parryable: the claws are the "blade"). */
    C('maul', [
      q(0),
      q(B.maul.tell, { y: 0.12, z: -0.06, pitch: -36, neck: [-6, 0, 0], head: [30, 0, 0], fr: [0, 0.52, 0.14], fl: [0, 0.26, 0.08], frFlex: 70, flFlex: 50, hl: [0, 0, 0.1], hr: [0, 0, 0.1], hlPitch: 15, hrPitch: 15, spine: [-6, 0, 0] }, 'out'),
      q(B.maul.strike, { y: -0.02, z: 0.26, pitch: 4, neck: [4, 0, 0], head: [6, 0, 0], fr: [0, 0.04, 0.52], fl: [0, 0.02, 0.3], frFlex: -15, flFlex: -5, hl: [0, 0, 0.02], hr: [0, 0, 0.02] }, 'in'),
      q(0.9, { y: -0.06, z: 0.22, pitch: 6, neck: [6, 0, 0], head: [8, 0, 0], fr: [0, 0, 0.5], fl: [0, 0, 0.3], frFlex: -10 }),
      q(B.maul.dur, {}, 'inout'),
    ]),
    /** Retreat hop with a shake of the head and hackles (shake-off). */
    C('hop', [
      q(0),
      q(0.12, { y: -0.1, z: 0.04, pitch: -4, neck: [-6, 0, 0], hl: [0, 0, 0.06], hr: [0, 0, 0.06], fl: [0, 0, 0.02], fr: [0, 0, 0.02] }, 'out'),
      q(0.3, { y: 0.1, z: -0.04, pitch: -8, neck: [-10, 0, 0], head: [-6, 0, 0], fl: [0, 0.2, 0.1], fr: [0, 0.18, 0.12], flFlex: 60, frFlex: 60, hl: [0, 0.08, 0.02], hr: [0, 0.08, 0.0], hlPitch: -20, hrPitch: -20 }, 'out'),
      q(0.46, { y: -0.08, pitch: 2, neck: [0, 0, 0], fl: [0, 0, -0.04], fr: [0, 0, -0.02], hl: [0, 0, -0.02], hr: [0, 0, 0] }, 'in'),
      q(0.56, { y: -0.04, spine: [0, 12, 0], chest: [0, -14, 0], neck: [0, 0, 14], head: [0, 0, 22] }),
      q(0.66, { y: -0.04, spine: [0, -12, 0], chest: [0, 14, 0], neck: [0, 0, -14], head: [0, 0, -22] }),
      q(B.hop.dur, {}, 'inout'),
    ]),
    /** Bark / bay: head thrown up, three bays (the alert). */
    C('bark', [
      q(0),
      q(0.35, { y: 0.03, pitch: -6, neck: [-30, 0, 0], head: [-28, 0, 0], fl: [0, 0, 0.04] }, 'out'),
      q(0.48, { y: 0.0, pitch: -3, neck: [-22, 0, 0], head: [-4, 0, 0] }, 'out'),
      q(0.7, { y: 0.03, pitch: -6, neck: [-32, 0, 0], head: [-30, 0, 0] }),
      q(0.8, { y: 0.0, pitch: -3, neck: [-22, 0, 0], head: [-6, 0, 0] }, 'out'),
      q(1.0, { y: 0.03, pitch: -6, neck: [-32, 0, 4], head: [-30, 0, 6] }),
      q(1.1, { y: 0.0, pitch: -3, neck: [-22, 0, 0], head: [-6, 0, 0] }, 'out'),
      q(B.bark.dur, {}, 'inout'),
    ]),

    // ---------------------------------------------------------------- reactions
    C('flinch', [
      q(0),
      q(0.07, { z: -0.07, y: -0.03, pitch: -4, neck: [-14, 0, 6], head: [-10, 0, 10], spine: [-6, 0, 0] }, 'out'),
      q(B.flinch.dur, {}, 'inout'),
    ]),
    C('stagger', [
      q(0),
      q(0.1, { z: -0.14, y: -0.06, pitch: -8, roll: 8, neck: [-20, 0, 12], head: [-14, 0, 16], fr: [0.02, 0.12, -0.12], frFlex: 50, spine: [-8, 0, 4] }, 'out'),
      q(0.42, { z: -0.1, y: -0.12, pitch: 6, roll: -6, neck: [16, 0, -6], head: [8, 0, -8], fr: [0.02, 0, -0.16], fl: [0, 0, -0.06], hl: [0, 0, 0.06], hr: [0, 0, 0.08] }),
      q(B.stagger.dur, {}, 'inout'),
    ]),
    /** Parried: reared back, forelegs flailing, throat open (vulnerable). */
    C('parried', [
      q(0),
      q(0.14, { y: 0.1, z: -0.16, pitch: -30, neck: [-20, 0, 14], head: [-24, 0, 20], fl: [0, 0.32, 0.02], fr: [0, 0.22, -0.02], flFlex: 70, frFlex: 50, hl: [0, 0, 0.08], hr: [0, 0, 0.1], hlPitch: 15, hrPitch: 15, spine: [-8, 0, 0] }, 'out'),
      q(0.5, { y: 0.06, z: -0.18, pitch: -24, neck: [-14, 0, 18], head: [-18, 0, 22], fl: [0, 0.18, -0.02], fr: [0, 0.3, 0.04], flFlex: 40, frFlex: 70, hl: [0, 0, 0.08], hr: [0, 0, 0.1], hlPitch: 15, hrPitch: 15 }),
      q(1.25, { y: 0.02, z: -0.14, pitch: -16, neck: [-10, 0, 12], head: [-12, 0, 14], fl: [0, 0.06, -0.04], fr: [0, 0.1, 0.0], flFlex: 20, frFlex: 30, hl: [0, 0, 0.06], hr: [0, 0, 0.08] }),
      q(B.parried.dur, {}, 'inout'),
    ]),
    /** Posture broken: forelegs buckle, sunk on the belly, head down (vulnerable). */
    C('broken', [
      q(0),
      q(0.3, SUNK(d), 'out'),
      q(2.05, { ...SUNK(d), neck: [34, 0, 0], head: [16, 0, 14] }),
      q(B.broken.dur, {}, 'inout'),
    ]),
    /** Death: legs buckle, the body rolls onto its side and stretches out. */
    C('death', [
      q(0),
      q(0.3, { y: -0.12, pitch: 10, z: -0.02, neck: [26, 0, 0], head: [14, 0, 0], fl: [0, 0, -0.04], fr: [0, 0, -0.02], flFlex: 30, frFlex: 20 }, 'out'),
      q(0.7, { y: -0.34, pitch: 4, roll: 30, neck: [30, 0, 0], head: [10, 0, 10], fl: [0.12, 0.05, 0.04], fr: [0.08, 0, 0.04], hl: [0.1, 0, 0.04], hr: [0.06, 0, 0.04], flFlex: 30, frFlex: 30, hlPitch: 30, hrPitch: 30 }, 'in'),
      onSide(d, 1.02, {}, 'in'),
      onSide(d, 1.2, { neck: [22, 0, 0], head: [-2, 0, 14] }),
      onSide(d, B.death.dur),
    ]),

    // ---------------------------------------------------------------- critical victims (overrides)
    /** Backstab victim: the blade drives into the back — the hind end drops and the back arches, it rolls over and (if alive) scrambles up. */
    C('victimBack', [
      q(0),
      q(0.4, { y: -0.1, pitch: -5, spine: [-9, 0, 0], chest: [-4, 0, 0], neck: [-22, 0, 0], head: [-20, 0, 0], hl: [0, 0, 0.1], hr: [0, 0, 0.12], hlPitch: 35, hrPitch: 35, fl: [0, 0, 0.06] }, 'out'),
      q(0.95, { y: -0.18, pitch: -8, spine: [-10, 0, 0], chest: [-4, 0, 0], neck: [-20, 0, 6], head: [-18, 0, 8], hl: [0, 0, 0.14], hr: [0, 0, 0.16], hlPitch: 50, hrPitch: 50, fl: [0, 0, 0.06] }),
      onSide(d, 1.5, {}, 'in'),
      onSide(d, 2.4),
      q(3.0, { ...SUNK(d), neck: [10, 0, 0], head: [0, 0, 0] }, 'out'),
      q(3.5, {}, 'inout'),
    ]),
    /** Riposte victim: impaled through the chest while reared up, thrown down on its side, rise. */
    C('victimFront', [
      q(0, { y: 0.04, z: -0.14, pitch: -18, neck: [-12, 0, 12], head: [-14, 0, 14] }),
      q(0.42, { y: 0.08, z: -0.1, pitch: -26, neck: [10, 0, 0], head: [22, 0, 0], fl: [0, 0.28, 0.06], fr: [0, 0.26, 0.04], flFlex: 70, frFlex: 70, hl: [0, 0, 0.08], hr: [0, 0, 0.08], spine: [6, 0, 0] }, 'out'),
      q(0.9, { y: 0.02, z: -0.16, pitch: -20, neck: [16, 0, 0], head: [26, 0, 0], fl: [0, 0.16, 0.0], fr: [0, 0.14, 0.0], flFlex: 80, frFlex: 80, hl: [0, 0, 0.06], hr: [0, 0, 0.06] }),
      onSide(d, 1.35, {}, 'in'),
      onSide(d, 2.4),
      q(3.0, { ...SUNK(d), neck: [10, 0, 0], head: [0, 0, 0] }, 'out'),
      q(3.5, {}, 'inout'),
    ]),
    /** Posture-break plunge victim: pinned where it sank, rolls onto its side, rises. */
    C('victimDown', [
      q(0, SUNK(d)),
      q(0.5, { ...SUNK(d), y: -0.3, spine: [-10, 0, 0], neck: [10, 0, 0], head: [-10, 0, 0] }, 'out'),
      onSide(d, 1.1, {}, 'in'),
      onSide(d, 2.2),
      q(2.8, { ...SUNK(d), neck: [10, 0, 0], head: [0, 0, 0] }, 'out'),
      q(3.3, {}, 'inout'),
    ]),
    /** Resting (replaces the sentry's idle): lying down, nose on the forepaws, slow breaths. */
    C('rest', [
      q(0, { ...SUNK(d), y: -0.38, neck: [40, 0, 0], head: [14, 0, 6] }),
      q(1.6, { ...SUNK(d), y: -0.37, neck: [38, 0, 0], head: [12, 0, 8], chest: [2, 0, 0] }),
      q(3.2, { ...SUNK(d), y: -0.38, neck: [40, 0, 0], head: [14, 0, 6] }),
    ], { loop: true, duration: 3.2 }),
  ];
  if (id === 'cs') clips.push(...stagClips(d));
  return Object.fromEntries(clips.map((c) => [c.name, c]));
}

/** Carrion stag extras: antler gore and a rearing stomp (unparryable). */
function stagClips(d: QuadDims): Clip[] {
  const q = (t: number, p: Omit<QP, 't'> = {}, ease?: Key['ease']) => qkey(d, { ...p, t, ease });
  const C = (name: string, keys: Key[]) => new Clip(`${d.id}_${name}`, keys);
  const B = BT;
  return [
    /** Gore: antlers lowered and swung back (0.75 s), a charging hook upward. */
    C('gore', [
      q(0),
      q(B.gore.tell, { y: -0.1, z: -0.1, pitch: 8, neck: [40, 0, -10], head: [30, 0, -16], hl: [0, 0, 0.08], hr: [0, 0, 0.08], hlPitch: 15, hrPitch: 15 }, 'out'),
      q(B.gore.strike, { y: -0.04, z: 0.26, pitch: 2, neck: [10, 0, 12], head: [-20, 0, 18], fl: [0, 0, 0.2], hlPitch: -20, hrPitch: -20 }, 'in'),
      q(1.1, { y: 0.0, z: 0.22, neck: [0, 0, 8], head: [-26, 0, 10], fl: [0, 0, 0.2] }),
      q(B.gore.dur, {}, 'inout'),
    ]),
    /** Rear and stomp (unparryable): up on the hind legs, forehooves crashing down. */
    C('rear', [
      q(0),
      q(B.rear.tell, { y: 0.34, z: -0.2, pitch: -52, neck: [-6, 0, 0], head: [20, 0, 0], fl: [0, 0.7, 0.1], fr: [0, 0.62, 0.14], flFlex: 90, frFlex: 80, hl: [0, 0, 0.14], hr: [0, 0, 0.16], hlPitch: 20, hrPitch: 20, spine: [-10, 0, 0] }, 'out'),
      q(B.rear.strike, { y: -0.08, z: 0.3, pitch: 8, neck: [16, 0, 0], head: [10, 0, 0], fl: [0.04, 0, 0.5], fr: [-0.04, 0, 0.52], flFlex: -10, frFlex: -10, hl: [0, 0, 0.08], hr: [0, 0, 0.08] }, 'in'),
      q(1.5, { y: -0.06, z: 0.26, pitch: 6, neck: [18, 0, 0], head: [12, 0, 0], fl: [0.04, 0, 0.5], fr: [-0.04, 0, 0.52] }),
      q(B.rear.dur, {}, 'inout'),
    ]),
  ];
}
