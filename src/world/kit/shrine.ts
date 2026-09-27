/**
 * The Stillbell shrine: a small stone aedicule (stepped plinth, two piers, back slab, gabled
 * cap) with a bronze bell hanging from an iron bar, candles at its foot, an inscription tablet
 * and a thin gold "brand" crack. The bell is a separate Object3D (pivot at the hanging point) so
 * the game can swing/ring it; a warm PointLight sits in front of the niche.
 */
import * as THREE from 'three';
import type { Anchor } from '../levelTypes';
import { getMaterial } from '../../render/materials';
import { Kit } from './Kit';
import { bellGeo, gablePrism, sphere, cyl } from './geom';
import { candles } from './props';

export interface StillbellShrine { bell: THREE.Object3D; light: THREE.PointLight; anchor: Anchor }

/** Shrine at (x,y,z) with its open front facing local +Z rotated by `yaw`. */
export function stillbellShrine(kit: Kit, x: number, y: number, z: number, yaw: number, lightIntensity = 7): StillbellShrine {
  kit.push(x, y, z, yaw);
  // stepped plinth
  kit.box('stone_dark', 0, 0.08, 0.1, 2.0, 0.16, 1.7);
  kit.box('stone_wall', 0, 0.23, 0.02, 1.75, 0.15, 1.4);
  kit.box('stone_wall', 0, 0.55, -0.05, 1.5, 0.5, 1.05);
  kit.box('stone_trim', 0, 0.83, -0.05, 1.6, 0.08, 1.12, { cast: false });
  // piers + back slab
  for (const s of [-1, 1]) {
    kit.box('stone_wall', s * 0.58, 1.65, -0.05, 0.36, 1.6, 0.95);
    kit.box('stone_trim', s * 0.58, 0.95, -0.05, 0.42, 0.14, 1.0, { cast: false });
  }
  kit.box('stone_dark', 0, 1.65, -0.45, 0.82, 1.6, 0.14);
  // entablature + gable cap
  kit.box('stone_trim', 0, 2.58, -0.05, 1.62, 0.26, 1.06);
  kit.add('stone_trim', gablePrism(1.7, 0.55, 1.12), { y: 2.71, z: -0.05 });
  for (const s of [-1, 1]) kit.box('stone_wall', s * 0.46, 3.0, -0.05, 1.0, 0.1, 1.2, { rz: -s * 0.575, cast: false });
  kit.add('bronze', sphere(0.08, 6, 4), { y: 3.34, z: -0.05 }, { cast: false });
  kit.add('bronze', cyl(0.02, 0.02, 0.35, 4), { y: 3.35, z: -0.05 }, { cast: false });
  kit.box('bronze', 0, 3.58, -0.05, 0.2, 0.03, 0.03, { cast: false });
  // inscription tablet on the right pier's outer face, and a smaller one on the left
  kit.box('stone_trim', 0.78, 1.65, -0.05, 0.06, 1.1, 0.72, { cast: false });
  kit.box('stone_dark', 0.81, 1.65, -0.05, 0.02, 0.9, 0.56, { cast: false });
  // iron hanging bar
  kit.box('iron', 0, 2.38, 0.02, 0.84, 0.06, 0.06, { cast: false });
  // the gold brand crack running down the plinth front
  let cx = 0.05, cy = 0.8;
  for (let i = 0; i < 6; i++) {
    const nx = cx + kit.rng.range(-0.1, 0.1), ny = cy - 0.14;
    const L = Math.hypot(nx - cx, ny - cy), a = Math.atan2(ny - cy, nx - cx);
    kit.box('unlived_crack', (cx + nx) / 2, (cy + ny) / 2, 0.48, L + 0.01, 0.018, 0.01, { rz: a, cast: false });
    cx = nx; cy = ny;
  }
  candles(kit, -0.55, 0.3, 0.5, 5, 0.18);
  candles(kit, 0.6, 0.16, 0.75, 3, 0.12);
  candles(kit, 0.2, 0.8, 0.3, 2, 0.08);
  kit.solid(-1.0, 0, -0.6, 1.0, 3.0, 0.95);

  // the bell (separate object so the game can swing it)
  const bell = new THREE.Group();
  bell.name = 'stillbell';
  const body = new THREE.Mesh(bellGeo(0.55), getMaterial('bronze_bell'));
  body.castShadow = true;
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), getMaterial('iron'));
  clapper.position.y = -0.46;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 5, 8), getMaterial('iron'));
  crown.position.y = 0.03;
  bell.add(body, clapper, crown);
  const pivot = kit.wp(0, 2.35, 0.02);
  bell.position.copy(pivot);
  bell.rotation.y = kit.wyaw(0);
  kit.group.add(bell);

  const light = kit.light(0xffc27a, lightIntensity, 9, 0, 1.7, 0.7, 0.35);
  const anchor: Anchor = { pos: kit.wp(0, 0, 1.75), yaw: kit.wyaw(Math.PI) };
  kit.pop();
  return { bell, light, anchor };
}
