import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildCathedralLevel } from '../src/content/cathedral/level';
import { runCathedralConnectivity } from '../src/content/cathedral/levelCheck';

describe('The Pilgrim Stair traversal (capsule walks every route; closed pieces block)', () => {
  it('every walk check passes', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const sun = new THREE.DirectionalLight();
    const L = buildCathedralLevel({ scene, collision, quality: 'low', sun });
    collision.build();
    const results = runCathedralConnectivity(L, collision);
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.log('FAIL', JSON.stringify(f));
    console.log('stats', JSON.stringify({ ...L.stats, perKit: undefined }));
    expect(results.length).toBeGreaterThan(10);
    expect(failed.length).toBe(0);
  }, 180000);

  it('layout contract: three Stillbells with the catalog ids, both arenas, all named anchors and pieces', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const L = buildCathedralLevel({ scene, collision, quality: 'low', sun: new THREE.DirectionalLight() });
    expect(L.stillbells.map((b) => b.id)).toEqual(['cathedral.gate', 'cathedral.ossuary', 'cathedral.nave']);
    expect(L.arenas.map((a) => a.bossId)).toEqual(['procession', 'vessaline']);
    for (const k of ['grate', 'greatDoors', 'cloisterDoor', 'greatBell']) expect(L.pieces[k]).toBeTruthy();
    for (const k of ['roll', 'masonsOrder', 'yardNook', 'censer', 'grateOutside', 'grateInside', 'mercy', 'doorsOutside', 'doorsInside', 'bellView', 'wenna', 'soames', 'tablet', 'funeral', 'graves', 'rolls', 'psalter', 'cantor', 'processionAdd1', 'processionAdd2']) expect(L.anchors[k], k).toBeTruthy();
    const ids = new Set(L.enemies.map((e) => e.id));
    expect(ids.size).toBe(L.enemies.length);
    expect(L.tollPosts.length).toBe(3);
  }, 120000);
});
