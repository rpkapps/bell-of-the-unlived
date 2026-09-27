// Camera controls follow the input: look right turns the view right, look up tilts it up.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../src/game/CameraRig';
import { CollisionWorld } from '../src/world/Collision';

function rig() {
  const world = new CollisionWorld();
  world.build();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500);
  const r = new CameraRig(cam, world);
  const player = { object: new THREE.Object3D(), pos: new THREE.Vector3(), yaw: 0, aiming: false } as any;
  r.snapBehind(player);
  r.update(1 / 60, player, { x: 0, y: 0 }, false);
  return { r, cam, player };
}
const fwd = (c: THREE.Camera) => c.getWorldDirection(new THREE.Vector3());

describe('camera look direction', () => {
  it('look right (x > 0) turns the view toward screen-right', () => {
    const { r, cam, player } = rig();
    const f0 = fwd(cam), right = new THREE.Vector3().crossVectors(f0, cam.up).normalize();
    r.update(1 / 60, player, { x: 0.3, y: 0 }, false);
    expect(fwd(cam).dot(right)).toBeGreaterThan(0.1);
  });
  it('look up (y > 0) tilts the view upward', () => {
    const { r, cam, player } = rig();
    const y0 = fwd(cam).y;
    r.update(1 / 60, player, { x: 0, y: 0.3 }, false);
    expect(fwd(cam).y).toBeGreaterThan(y0 + 0.05);
  });
});
