import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildArmy } from '../src/content/army/level';
import { runArmyConnectivity } from '../src/content/army/levelConnectivity';
import { regionInfo } from '../src/game/regions/catalog';

describe('Siegeholm traversal (capsule walks the critical path, shortcuts, nooks; closed pieces block)', () => {
  it('every walk check passes', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const sun = new THREE.DirectionalLight();
    const layout = buildArmy({ scene, collision, quality: 'low', sun });
    collision.build();
    const results = runArmyConnectivity(layout, collision);
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.log('FAIL', JSON.stringify(f));
    for (const r of results.filter((x) => x.ok)) console.log('ok  ', r.name, r.seconds + 's');
    console.log('stats', JSON.stringify({ ...layout.stats, perKit: undefined }));
    expect(results.length).toBeGreaterThan(20);
    expect(failed.length).toBe(0);
  }, 240000);

  it('layout matches the catalog and the region contract', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const layout = buildArmy({ scene, collision, quality: 'low', sun: new THREE.DirectionalLight() });
    const info = regionInfo('army')!;
    expect(layout.stillbells.map((b) => b.id)).toEqual(info.bells.map((b) => b.id));
    expect(layout.playerStart.pos.distanceTo(layout.stillbells[0].anchor.pos)).toBeLessThan(0.01);
    expect(layout.arenas.map((a) => a.bossId).sort()).toEqual(['oderic', 'varr']);
    const varr = layout.arenas.find((a) => a.bossId === 'varr')!;
    expect(varr.onDefeat?.length).toBeGreaterThanOrEqual(2);
    const ids = layout.enemies.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = new Set(layout.enemies.map((e) => e.kind));
    for (const k of ['pikeman', 'crossbowman', 'sapper', 'siegeKnight', 'twiceSlain', 'warHound', 'cannonCrew']) expect(kinds.has(k)).toBe(true);
    expect(layout.tollPosts.length).toBeGreaterThanOrEqual(3);
    for (const p of ['postern', 'eastGate', 'eastWinch', 'magazineDoor', 'magazine', 'odericGate', 'varrStandard', 'greatBell']) expect(layout.pieces[p], p).toBeTruthy();
    // pieces are idempotent at both ends
    for (const p of Object.values(layout.pieces)) { p.set(1); p.set(0); p.set(1); p.set(0); }
  }, 120000);
});
