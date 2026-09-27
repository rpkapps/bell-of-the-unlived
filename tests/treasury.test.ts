/**
 * The Undervaults: traversal/connectivity. A capsule walks the critical path and the loops with the
 * real collision world (static BVH + dynamic pieces); negative checks prove that closed pieces
 * (weigh-gate, round vault door, raised scale bridge, hoard grate, veils) really block.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildTreasury } from '../src/content/treasury/level';
import { walk, type WalkResult } from '../src/content/ashbridge/connectivity';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe('Undervaults traversal (critical path, loops, closed pieces block)', () => {
  it('every walk check passes', () => {
    const scene = new THREE.Scene();
    const collision = new CollisionWorld();
    const sun = new THREE.DirectionalLight();
    const L = buildTreasury({ scene, collision, quality: 'low', sun });
    collision.build();
    const K = L.killY;
    const pc = L.pieces;
    const all = Object.values(pc);
    const arenas = L.arenas;
    const reset = () => { all.forEach((p) => p.set(0)); arenas.forEach((a) => { a.fogGate.set(0); a.onDefeat?.forEach((p) => p.set(0)); }); };
    const out: WalkResult[] = [];

    // ---------------------------------------------------- closed pieces block
    reset();
    out.push(walk(collision, 'weigh-gate closed blocks the hall door', V(-14, 0, -63), [V(-14, 0, -57.5)], K, true));
    out.push(walk(collision, 'round vault door closed blocks', V(8, -3.2, -93.5), [V(8, -3.2, -101.5)], K, true));
    out.push(walk(collision, 'raised scale bridge: the chute swallows', V(-17.8, -7.8, -115), [V(-9.5, -7.8, -115)], K, true));
    out.push(walk(collision, 'hoard grate closed blocks the alcove', V(-33, -7.8, -147), [V(-33, -7.8, -153.2)], K, true));
    out.push(walk(collision, 'Aurel veil blocks', V(10, -3.2, -107.6), [V(10, -3.2, -115)], K, true));
    out.push(walk(collision, 'Hoard veil blocks', V(-33, -7.8, -126.6), [V(-33, -7.8, -133)], K, true));

    // ---------------------------------------------------- the critical path
    reset();
    pc.scaleBridge.set(1);
    const s = L.playerStart.pos;
    out.push(walk(collision, 'entry → east quay → ghat → dry canal', s.clone(), [
      V(10, 0, 2), V(8.5, 0, -20), V(8.5, 0, -44), V(14, 0, -47), V(14, 0, -54), V(11.2, 0, -54), V(4.4, -3.2, -54), V(0, -3.2, -56),
    ], K));
    out.push(walk(collision, 'dry canal → culvert → Sluice Hall', V(0, -3.2, -56), [V(0, -3.2, -66), V(0, -3.2, -78), V(0, -3.2, -82), V(-6, -3.2, -90), V(-11, -3.2, -90)], K));
    out.push(walk(collision, 'Sluice Hall → stair → Counting Deep Stillbell', V(-11, -3.2, -90), [V(-16.5, -5.5, -90), V(-22.5, -7.8, -90), V(-23.6, -7.8, -85)], K));
    out.push(walk(collision, 'Counting Deep → around the pit → corridor', V(-23.6, -7.8, -85), [V(-30, -7.8, -89.6), V(-38.4, -7.8, -89.6), V(-38.4, -7.8, -99), V(-33, -7.8, -104.5), V(-33, -7.8, -108), V(-33, -7.8, -116)], K));
    out.push(walk(collision, 'corridor → treasure room → back', V(-33, -7.8, -116), [V(-36.4, -7.8, -116), V(-39.4, -7.8, -116), V(-36.4, -7.8, -116), V(-33, -7.8, -116)], K));
    out.push(walk(collision, 'corridor → wardens room → gallery → bridge → stair → landing', V(-33, -7.8, -116), [
      V(-29.6, -7.8, -116), V(-25, -7.8, -116), V(-19.6, -7.8, -115), V(-16.8, -7.8, -115), V(-13.5, -7.8, -115), V(-10.2, -7.8, -115),
      V(-7, -7.8, -115), V(-7, -7.8, -113.2), V(-7, -5.5, -109), V(-7, -3.2, -104.4), V(-3, -3.2, -103), V(1.2, -3.2, -103),
    ], K));
    out.push(walk(collision, 'landing → Antechamber Stillbell → archive ledger', V(1.2, -3.2, -103), [V(3.6, -3.2, -107.2), V(10, -3.2, -104), V(17.5, -3.2, -103.5), V(21, -3.2, -103.5), V(23.4, -3.2, -103.5)], K));
    // ---------------------------------------------------- loops (shortcuts open)
    pc.vaultDoor.set(1);
    out.push(walk(collision, 'LOOP: Antechamber → round vault door → Sluice Hall', V(4.9, -3.2, -100.4), [V(8, -3.2, -100.4), V(8, -3.2, -97.5), V(8, -3.2, -94.6), V(3, -3.2, -90)], K));
    pc.weighGate.set(1);
    out.push(walk(collision, 'LOOP: Counting Deep → hall stair → Hall → weigh-gate → market', V(-27.5, -7.8, -84), [
      V(-27.5, -7.8, -82.4), V(-27.5, -4, -76.4), V(-27.5, 0, -69), V(-20, 0, -64.5), V(-10.6, 0, -62), V(-14, 0, -62), V(-14, 0, -57.5), V(-12, 0, -44), V(-9, 0, -30.2), V(6, 0, -30.2),
    ], K));
    // ---------------------------------------------------- side areas
    out.push(walk(collision, 'west quay → balcony stair → banquet → east end', V(-17, 0, -44), [V(-18.7, 0, -46.4), V(-18.7, 5, -57.6), V(-12, 5, -57.4), V(0, 5, -57.3), V(11, 5, -57.3)], K));
    out.push(walk(collision, 'west quay → water steps → drowned canal → back', V(-12, 0, 4), [V(-10.6, 0, 4), V(-4.4, -3.2, 4), V(-1, -3.2, 2), V(-4.4, -3.2, 4), V(-10.6, 0, 4)], K));
    arenas.forEach((a) => a.fogGate.set(1));
    out.push(walk(collision, 'corridor → Hoard (veil gone) → centre', V(-33, -7.8, -120), [V(-33, -7.8, -127), V(-33, -7.8, -132), V(-30, -7.8, -138), V(-33, -7.8, -146)], K));
    pc.hoardGrate.set(1);
    out.push(walk(collision, 'Hoard → alcove (grate raised)', V(-33, -7.8, -146), [V(-33, -7.8, -150.5), V(-33, -7.8, -153)], K));
    out.push(walk(collision, 'Antechamber → Vault of Futures (veil gone) → arena', V(10, -3.2, -107.6), [V(10, -3.2, -113.5), V(10, -3.2, -120), V(4, -3.2, -124), V(16, -3.2, -128)], K));

    const failed = out.filter((r) => !r.ok);
    for (const r of out) console.log(r.ok ? 'ok  ' : 'FAIL', r.name, r.note, JSON.stringify(r.end));
    console.log('stats', JSON.stringify({ tris: L.stats.triangles, meshes: L.stats.meshes, inst: L.stats.instanced, lights: L.stats.lights, ms: Math.round(L.stats.buildMs) }));
    expect(out.length).toBeGreaterThan(15);
    expect(failed.length).toBe(0);
  }, 240000);
});
