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

describe('Cathedral looks and weapons build cleanly (no NaN vertices)', () => {
  it('every look and weapon', async () => {
    const { models } = await import('../src/actors/models/index');
    const { Rig } = await import('../src/actors/Rig');
    const { registerCathedralLooks } = await import('../src/content/cathedral/models');
    registerCathedralLooks();
    const bad: string[] = [];
    const scan = (name: string, root: THREE.Object3D) => root.traverse((o) => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g) return;
      for (const att of ['position', 'normal'] as const) {
        const a = g.attributes[att];
        if (!a) continue;
        for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) { bad.push(`${name}:${o.name}:${att}`); return; }
      }
    });
    for (const look of ['cath_pilgrim', 'cath_flagellant', 'cath_healer', 'cath_mourner', 'cath_bearer', 'cath_cantor', 'cath_procession', 'cath_procession2', 'vessaline', 'vessaline2']) {
      const rig = new Rig({ height: 1.2, bulk: 1.2, shoulder: 1.1 });
      models.buildEnemy(rig, look, 3);
      scan(look, rig.root);
    }
    for (const npc of ['wenna', 'cath_soames']) { const rig = new Rig(); models.buildNpc(rig, npc); scan(npc, rig.root); }
    for (const w of ['cath_pilgrim_staff', 'cath_scourge', 'cath_mourner_maul', 'cath_bearer_pole', 'cath_procession_pole', 'cath_cantor_staff', 'crozier_of_names']) scan(w, models.buildWeapon(w).object);
    expect(bad).toEqual([]);
  }, 120000);
});
