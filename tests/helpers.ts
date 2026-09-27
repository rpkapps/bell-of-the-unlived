import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { Combat } from '../src/combat/Combat';
import type { Services } from '../src/game/services';
import { defaultSettings } from '../src/game/settings';
import type { Actor } from '../src/actors/Actor';

export function flatWorld() {
  const w = new CollisionWorld();
  w.addBox([0, -0.5, 0], [100, 1, 100]);
  w.build();
  return w;
}

export function mockServices(world: CollisionWorld, actors: () => Actor[]): Services & { log: string[]; t: number } {
  const combat = new Combat();
  const s = {
    world, combat, settings: defaultSettings(), t: 0, log: [] as string[],
    get time() { return s.t; },
    sfx(c: string) { s.log.push('sfx:' + c); },
    fx() {}, shake() {}, spawnProjectile() {}, actors, hint(id: string) { s.log.push('hint:' + id); }, trail() {},
  };
  return s as any;
}
export { THREE };
