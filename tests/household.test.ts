import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildHousehold } from '../src/content/household/level';

describe('Garden Court build', () => {
  it('builds', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const sun = new THREE.DirectionalLight();
    const L = buildHousehold({ scene, collision, quality: 'low', sun });
    collision.build();
    console.log(JSON.stringify(L.stats));
    expect(L.stillbells.length).toBe(3);
  }, 120000);
});
