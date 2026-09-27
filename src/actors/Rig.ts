/**
 * Humanoid rig: a hierarchy of Object3D "bones" (see rigDefs.ts for conventions). Model builders
 * attach meshes to bones; the animation system writes bone rotations; combat reads socket
 * transforms (so hitboxes follow exactly what is drawn).
 */
import * as THREE from 'three';
import { BONES, BONE_OFFSET, BONE_PARENT, type BoneName, type RigProportions, type SocketName } from './rigDefs';

export class Rig {
  readonly root = new THREE.Group();
  /** Offsets the whole body (bob, crouch) without moving the actor's root. */
  readonly body = new THREE.Group();
  readonly bones = {} as Record<BoneName, THREE.Object3D>;
  readonly sockets = {} as Record<SocketName, THREE.Object3D>;
  readonly rest = {} as Record<BoneName, THREE.Vector3>;

  constructor(public readonly proportions: RigProportions = { height: 1, bulk: 1, shoulder: 1 }) {
    this.root.name = 'rig';
    this.root.add(this.body);
    const s = proportions.height;
    for (const b of BONES) {
      const o = new THREE.Object3D();
      o.name = b;
      const off = BONE_OFFSET[b];
      let x = off[0] * s;
      if (b === 'upperArmL' || b === 'upperArmR' || b === 'shoulderL' || b === 'shoulderR') x *= proportions.shoulder;
      o.position.set(x, off[1] * s, off[2] * s);
      this.rest[b] = o.position.clone();
      this.bones[b] = o;
    }
    for (const b of BONES) {
      const p = BONE_PARENT[b];
      (p === 'root' ? this.body : this.bones[p]).add(this.bones[b]);
    }
    const mk = (name: SocketName, parent: THREE.Object3D) => {
      const o = new THREE.Object3D();
      o.name = name;
      parent.add(o);
      this.sockets[name] = o;
      return o;
    };
    // Weapon sockets: at the fist, rotated so weapon +Y points forward (+Z of the hand frame)
    // and the edge (+Z of weapon) faces down the arm's swing plane.
    const wr = mk('weaponR', this.bones.handR);
    wr.position.set(0, -0.07 * s, 0.01);
    wr.rotation.set(Math.PI / 2, 0, 0);
    const wl = mk('weaponL', this.bones.handL);
    wl.position.set(0, -0.07 * s, 0.01);
    wl.rotation.set(Math.PI / 2, 0, 0);
    // Shield (child of handL): gripped by a vertical handle in the left fist, strapped across the forearm.
    // With the arm hanging: shield top (+Y) points forward (+Z), face (+Z) points outward (+X).
    // Raising the forearm forward and twisting it -90° about its long axis brings the face forward.
    const sl = mk('shieldL', this.bones.handL);
    sl.position.set(0.08 * s, 0.06 * s, 0);
    sl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    const cl = mk('cloak', this.bones.chest);
    cl.position.set(0, 0.2 * s, -0.12 * s * proportions.bulk);
    const bk = mk('back', this.bones.chest);
    bk.position.set(0, 0.1 * s, -0.16 * s * proportions.bulk);
  }

  /** Reset all bones to rest rotation. */
  resetPose() {
    for (const b of BONES) this.bones[b].quaternion.identity();
    for (const b of BONES) this.bones[b].position.copy(this.rest[b]);
    this.body.position.set(0, 0, 0);
    this.body.quaternion.identity();
  }

  /** World position of a point in a socket's/bone's local frame. */
  worldPoint(obj: THREE.Object3D, local: THREE.Vector3, out: THREE.Vector3) {
    return out.copy(local).applyMatrix4(obj.matrixWorld);
  }
}
