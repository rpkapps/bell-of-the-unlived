import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildAshbridge } from '../src/content/ashbridge/level';
import { runAshbridgeConnectivity } from '../src/content/ashbridge/connectivity';

describe('Ashbridge traversal (capsule walks the critical path; closed pieces block)', () => {
  it('every walk check passes', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const sun = new THREE.DirectionalLight();
    const layout = buildAshbridge({ scene, collision, quality: 'low', sun });
    collision.build();
    const results = runAshbridgeConnectivity(layout, collision);
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.log('FAIL', JSON.stringify(f));
    expect(results.length).toBeGreaterThan(10);
    expect(failed.length).toBe(0);
  }, 120000);
});
