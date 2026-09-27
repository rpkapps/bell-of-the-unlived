/** Simple capsule mannequin for testing animation before real models exist. */
import * as THREE from 'three';
import type { Rig } from './Rig';
import { BONE_LENGTH, type BoneName } from './rigDefs';

export function buildMannequin(rig: Rig, color = 0x8899aa) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const add = (bone: BoneName, len: number, r: number, dir = -1) => {
    const g = new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.01), 4, 8);
    g.translate(0, (dir * len) / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    rig.bones[bone].add(m);
  };
  const s = rig.proportions.height;
  add('spine', 0.2 * s, 0.13, 1); add('chest', 0.25 * s, 0.16, 1); add('neck', 0.1 * s, 0.05, 1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat); head.position.y = 0.11; rig.bones.head.add(head);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), new THREE.MeshStandardMaterial({ color: 0xaa3333 })); nose.position.set(0, 0.1, 0.11); rig.bones.head.add(nose);
  for (const sd of ['L', 'R'] as const) {
    add(`upperArm${sd}` as BoneName, BONE_LENGTH.upperArmR! * s, 0.055);
    add(`forearm${sd}` as BoneName, BONE_LENGTH.forearmR! * s, 0.045);
    add(`hand${sd}` as BoneName, 0.09, 0.04);
    add(`thigh${sd}` as BoneName, BONE_LENGTH.thighR! * s, 0.08);
    add(`shin${sd}` as BoneName, BONE_LENGTH.shinR! * s, 0.06);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.24), mat); foot.position.set(0, -0.03, 0.07); rig.bones[`foot${sd}` as BoneName].add(foot);
  }
  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), mat); hip.position.y = -0.02; rig.bones.hips.add(hip);
}

export function debugSword(len = 0.95) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, len, 0.05), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 }));
  blade.position.y = 0.12 + len / 2; g.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.014, len, 0.01), new THREE.MeshStandardMaterial({ color: 0xff4444 }));
  edge.position.set(0, 0.12 + len / 2, 0.03); g.add(edge);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.24), new THREE.MeshStandardMaterial({ color: 0x886633 }));
  guard.position.y = 0.1; g.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2), new THREE.MeshStandardMaterial({ color: 0x442211 }));
  g.add(grip);
  return g;
}
export function debugShield() {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.04), new THREE.MeshStandardMaterial({ color: 0x333344 }));
  face.position.z = 0.06; g.add(face);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.01), new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
  mark.position.set(0, 0.1, 0.085); g.add(mark);
  return g;
}
