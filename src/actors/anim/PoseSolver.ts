/**
 * Applies a PoseSpec to a Rig: FK for the trunk, analytic two-bone IK for arms and legs, and
 * hand orientation so the held item's socket matches the authored direction exactly.
 */
import * as THREE from 'three';
import type { Rig } from '../Rig';
import type { HandKey, PoseSpec, V3 } from './types';
import { BONE_LENGTH, type BoneName } from '../rigDefs';

const D2R = Math.PI / 180;
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _A = new THREE.Vector3();
const _E = new THREE.Vector3();
const _W = new THREE.Vector3();
const _T = new THREE.Vector3();
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _rootQ = new THREE.Quaternion();
const _sockQ = new THREE.Quaternion();
const _handQ = new THREE.Quaternion();

const setEulerDeg = (o: THREE.Object3D, v: V3) => {
  o.quaternion.setFromEuler(_e.set(v[0] * D2R, v[1] * D2R, v[2] * D2R, 'XYZ'));
};

/** Quaternion of an orthonormal basis given the +Y axis and a hint for +Z. */
function basisQuat(yAxis: THREE.Vector3, zHint: THREE.Vector3, out: THREE.Quaternion) {
  _y.copy(yAxis).normalize();
  _z.copy(zHint).addScaledVector(_y, -zHint.dot(_y));
  if (_z.lengthSq() < 1e-8) {
    // hint parallel to y: pick any perpendicular
    _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
    if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0).addScaledVector(_y, -_y.x);
  }
  _z.normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/** Set a bone's local quaternion from a desired world quaternion. */
function setWorldQuat(bone: THREE.Object3D, worldQ: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(_qp);
  bone.quaternion.copy(_qp.invert()).multiply(worldQ);
}

export interface SolverOptions {
  /** Optional per-limb scale (from rig proportions). */
  scale: number;
}

export class PoseSolver {
  private l1Arm: number; private l2Arm: number; private l1Leg: number; private l2Leg: number;
  constructor(private rig: Rig) {
    const s = rig.proportions.height;
    this.l1Arm = BONE_LENGTH.upperArmR! * s;
    this.l2Arm = BONE_LENGTH.forearmR! * s;
    this.l1Leg = BONE_LENGTH.thighR! * s;
    this.l2Leg = BONE_LENGTH.shinR! * s;
  }

  apply(p: PoseSpec) {
    const rig = this.rig;
    const b = rig.bones;
    const s = rig.proportions.height;
    // --- trunk (FK)
    b.hips.position.set(rig.rest.hips.x + p.hipsPos[0], rig.rest.hips.y + p.hipsPos[1] * s, rig.rest.hips.z + p.hipsPos[2]);
    setEulerDeg(b.hips, p.hips);
    setEulerDeg(b.spine, p.spine);
    setEulerDeg(b.chest, p.chest);
    setEulerDeg(b.neck, p.neck);
    setEulerDeg(b.head, p.head);
    for (const k of ['shoulderL', 'shoulderR'] as const) b[k].quaternion.identity();
    rig.root.updateMatrixWorld(true);
    rig.root.getWorldQuaternion(_rootQ);

    // --- legs (IK unless the pose overrides the thigh with FK, e.g. rolls)
    if (p.fk.thighL) this.fkLeg('L', p.fk); else this.leg('L', p.footL, p.footPitchL);
    if (p.fk.thighR) this.fkLeg('R', p.fk); else this.leg('R', p.footR, p.footPitchR);

    // --- arms
    this.arm('R', p.handR, p.fk);
    this.arm('L', p.handL, p.fk);
  }

  private toWorld(v: V3, out: THREE.Vector3) {
    return out.set(v[0], v[1], v[2]).applyMatrix4(this.rig.root.matrixWorld);
  }
  private dirToWorld(v: V3, out: THREE.Vector3) {
    return out.set(v[0], v[1], v[2]).applyQuaternion(_rootQ).normalize();
  }

  private leg(side: 'L' | 'R', foot: V3, pitch: number) {
    const b = this.rig.bones;
    const thigh = side === 'L' ? b.thighL : b.thighR;
    const shin = side === 'L' ? b.shinL : b.shinR;
    const ft = side === 'L' ? b.footL : b.footR;
    thigh.getWorldPosition(_A);
    this.toWorld(foot, _T);
    // Knee points forward and slightly outward.
    const out = side === 'L' ? 0.15 : -0.15;
    this.dirToWorld([out, 0, 1], _pole);
    this.solve(thigh, shin, _A, _T, this.l1Leg, this.l2Leg, _pole, 1);
    // Foot flat to the root, with pitch.
    _q.setFromAxisAngle(_tmp.set(1, 0, 0), -pitch * D2R);
    _q2.copy(_rootQ).multiply(_q);
    shin.updateMatrixWorld(true);
    setWorldQuat(ft, _q2);
  }

  private fkLeg(side: 'L' | 'R', fk: PoseSpec['fk']) {
    const b = this.rig.bones;
    setEulerDeg(side === 'L' ? b.thighL : b.thighR, fk[side === 'L' ? 'thighL' : 'thighR']!);
    setEulerDeg(side === 'L' ? b.shinL : b.shinR, fk[side === 'L' ? 'shinL' : 'shinR'] ?? [0, 0, 0]);
    setEulerDeg(side === 'L' ? b.footL : b.footR, fk[side === 'L' ? 'footL' : 'footR'] ?? [0, 0, 0]);
  }

  private arm(side: 'L' | 'R', hand: HandKey | null, fk: PoseSpec['fk']) {
    const b = this.rig.bones;
    const upper = side === 'L' ? b.upperArmL : b.upperArmR;
    const fore = side === 'L' ? b.forearmL : b.forearmR;
    const hd = side === 'L' ? b.handL : b.handR;
    const names: [BoneName, BoneName, BoneName] = side === 'L' ? ['upperArmL', 'forearmL', 'handL'] : ['upperArmR', 'forearmR', 'handR'];
    if (!hand) {
      // Free arm: relaxed FK, optionally overridden.
      const sgn = side === 'L' ? 1 : -1;
      setEulerDeg(upper, fk[names[0]] ?? [4, 0, 7 * sgn]);
      setEulerDeg(fore, fk[names[1]] ?? [-14, 0, 0]);
      setEulerDeg(hd, fk[names[2]] ?? [0, 0, 0]);
      return;
    }
    const socket = this.rig.sockets[hand.socket ?? (side === 'L' ? 'weaponL' : 'weaponR')];
    // Desired socket world orientation.
    this.dirToWorld(hand.dir, _u);
    if (hand.up) this.dirToWorld(hand.up, _v);
    else {
      // Default edge/face: toward "down" for mostly-horizontal items, else forward.
      if (Math.abs(hand.dir[1]) < 0.8) _v.set(0, -1, 0); else this.dirToWorld([0, 0, 1], _v);
    }
    basisQuat(_u, _v, _sockQ);
    // Socket may be nested (hand → socket). Compute hand world quat = sockQ * inverse(socketLocalQ).
    _q.copy(socket.quaternion).invert();
    _handQ.copy(_sockQ).multiply(_q);
    // Hand origin target = grip - handQ * socketLocalPos
    this.toWorld(hand.p, _T);
    _tmp.copy(socket.position).applyQuaternion(_handQ);
    _T.sub(_tmp);
    upper.getWorldPosition(_A);
    const sgn = side === 'L' ? 1 : -1;
    if (hand.elbow) this.dirToWorld(hand.elbow, _pole);
    else this.dirToWorld([0.55 * sgn, -0.45, -0.55], _pole);
    // Arm IK: bone's +Z faces away from the elbow pole.
    this.solve(upper, fore, _A, _T, this.l1Arm, this.l2Arm, _pole, -1);
    fore.updateMatrixWorld(true);
    // Hand: local = foreWorld^-1 * handQ; move the twist about the forearm axis into the forearm.
    fore.getWorldQuaternion(_qp);
    const local = _q2.copy(_qp).invert().multiply(_handQ);
    // twist about Y
    const tw = _q.set(0, local.y, 0, local.w);
    const len = Math.hypot(tw.y, tw.w);
    if (len > 1e-6) {
      tw.y /= len; tw.w /= len;
      fore.quaternion.multiply(tw);
      fore.updateMatrixWorld(true);
      fore.getWorldQuaternion(_qp);
      hd.quaternion.copy(_qp.invert().multiply(_handQ));
    } else hd.quaternion.copy(local);
  }

  /**
   * Two-bone IK. Places `upper` and `lower` so the chain from A reaches T, bending toward the pole.
   * zSign: +1 → bone local +Z points toward the pole side (legs: knee forward), -1 → away (arms).
   */
  private solve(upper: THREE.Object3D, lower: THREE.Object3D, A: THREE.Vector3, T: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3, zSign: number) {
    _u.copy(T).sub(A);
    let d = _u.length();
    if (d < 1e-5) { _u.set(0, -1, 0); d = 1e-5; } else _u.divideScalar(d);
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
    const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    _v.copy(pole).addScaledVector(_u, -pole.dot(_u));
    if (_v.lengthSq() < 1e-8) _v.set(0, 0, 1).addScaledVector(_u, -_u.z);
    _v.normalize();
    _E.copy(A).addScaledVector(_u, l1 * cosA).addScaledVector(_v, l1 * sinA);
    _W.copy(A).addScaledVector(_u, d);
    // upper: local +Y = -(E - A)
    _tmp.copy(A).sub(_E); // = -(E-A)
    _z.copy(_v).multiplyScalar(zSign);
    basisQuat(_tmp, _z, _q);
    setWorldQuat(upper, _q);
    upper.updateMatrixWorld(true);
    _tmp.copy(_E).sub(_W); // = -(W-E)
    _z.copy(_v).multiplyScalar(zSign);
    basisQuat(_tmp, _z, _q);
    setWorldQuat(lower, _q);
    lower.updateMatrixWorld(true);
  }
}
