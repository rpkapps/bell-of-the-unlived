/**
 * The Suspended Campus — traversal/connectivity. A capsule (r 0.35, h 1.8) walks the critical path
 * leg by leg against the real CollisionWorld; closed pieces (Sea Gate, raised drawbridge, veils)
 * must block, open ones must pass; the lift is tested at both ends; Stillbells, pickups and
 * NPC anchors stand on walkable ground. The lens floor's safety rule is checked on its graph.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { buildAcademy, type AcademyLayout } from '../src/content/academy/level';
import { walk, type WalkResult } from '../src/content/ashbridge/connectivity';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function build(): { L: AcademyLayout; world: CollisionWorld } {
  const scene = new THREE.Scene();
  const world = new CollisionWorld();
  const L = buildAcademy({ scene, collision: world, quality: 'low', sun: new THREE.DirectionalLight() });
  world.build();
  return { L, world };
}

function run(L: AcademyLayout, world: CollisionWorld): WalkResult[] {
  const out: WalkResult[] = [];
  const K = L.killY;
  const P = L.pieces;
  const fog = (id: string) => L.arenas.find((a) => a.bossId === id)!.fogGate;
  const reset = () => { for (const p of Object.values(P)) p.set(0); for (const a of L.arenas) a.fogGate.set(0); };
  reset();

  // ------------------------------------------------ negative checks (closed pieces block)
  out.push(walk(world, 'sea gate closed blocks the landing', V(0, 2, 23), [V(0, 2, 17), V(0, 2, 12)], K, true));
  out.push(walk(world, 'raised drawbridge: gallery door leads nowhere', V(0, 24, -10.5), [V(0, 24, -13.5), V(0, 24, -20)], K, true));
  out.push(walk(world, 'Orrow veil blocks the observatory', V(-6.25, 44, -47.5), [V(-6.25, 44, -54), V(-6.25, 44, -60)], K, true));
  out.push(walk(world, 'No. 9 veil blocks the laboratory', V(-45, 18, -9), [V(-52, 18, -9), V(-57, 18, -9)], K, true));
  out.push(walk(world, 'lift down: the terrace shaft is railed (no fall from the side)', V(4, 18, 13), [V(0, 18, 13)], K, true));

  // ------------------------------------------------ the critical path
  out.push(walk(world, 'causeway: arrival → landing', V(0, 2, 68), [V(0, 2, 50), V(0, 2, 33), V(-4, 2, 27)], K));
  out.push(walk(world, 'tidal stair → theatre promenade', V(-9, 2, 25.5), [V(-12.5, 2, 25.5), V(-24, 8, 25.5), V(-28.5, 8, 25), V(-30, 8, 22.3), V(-34, 8, 21.5), V(-36, 8, 21.4)], K));
  out.push(walk(world, 'theatre: down the south aisle to the stage', V(-36, 8, 21.6), [V(-36, 8, 20.6), V(-36, 2, 9.4), V(-36, 2, 3), V(-30, 2, -1.5)], K));
  out.push(walk(world, 'theatre: south-west aisle', V(-36, 2, 5), [V(-36 - 0.707 * 5.2, 2, 4 + 0.707 * 5.2), V(-36 - 0.707 * 16.4, 8, 4 + 0.707 * 16.4)], K));
  out.push(walk(world, 'theatre: south-east aisle', V(-36, 2, 5), [V(-36 + 0.707 * 5.2, 2, 4 + 0.707 * 5.2), V(-36 + 0.707 * 16.4, 8, 4 + 0.707 * 16.4)], K));
  out.push(walk(world, 'stage → prompters\' passage → lift well', V(-24, 2, -1.5), [V(-16, 2, -1.5), V(-8, 2, -1.5), V(-3, 2, 2), V(0, 2, 8), V(0, 2, 13)], K));
  out.push(walk(world, 'prompters\' niche (secret)', V(-54, 2, -1.8), [V(-57, 2, -1.8), V(-59.5, 2, -1.2)], K));
  P.seaGate.set(1);
  out.push(walk(world, 'sea gate open: chamber ⇄ landing (shortcut)', V(0, 2, 15), [V(0, 2, 19), V(0, 2, 23), V(3, 2, 26)], K));
  P.seaGate.set(0);
  // lift at the bottom: board it; at the top: step off onto the terrace
  out.push(walk(world, 'lift (down): step on from the chamber', V(0, 2, 8), [V(0, 2, 12.5)], K));
  P.lift.set(1);
  out.push(walk(world, 'lift (up): off onto the terrace → hall', V(0, 18.05, 13), [V(0, 18, 9.5), V(0, 18, 6), V(0, 18, 2), V(2.4, 18, 0), V(2.4, 18, -3.5)], K));
  out.push(walk(world, 'hall → west door → chain bridge → lab A', V(-6, 18, -7.6), [V(-13, 18, -8.2), V(-15, 18, -9), V(-20, 18, -9), V(-33, 18, -9), V(-38, 18, -9)], K));
  out.push(walk(world, 'lab A → bridge → lab B → north strip', V(-38, 18, -9), [V(-38, 18, -12), V(-38, 18, -16.5), V(-38, 18, -21), V(-38, 18, -26), V(-38, 18, -30.8), V(-41.5, 18, -31)], K));
  out.push(walk(world, 'scaffold climb → spire yard', V(-41.5, 18, -31), [V(-41.5, 18, -32.3), V(-41.5, 24, -42), V(-40, 24, -44), V(-30, 24, -44), V(-10, 24, -34)], K));
  out.push(walk(world, 'yard → spire foot (SW corner)', V(-10, 24, -30), [V(-6.25, 24, -33.2), V(-5, 24, -33.75)], K));
  const S = { y0: 24, h: 20 / 7 };
  const C: Record<string, [number, number]> = { SW: [-6.25, -33.75], SE: [6.25, -33.75], NE: [6.25, -46.25], NW: [-6.25, -46.25] };
  const order = ['SW', 'SE', 'NE', 'NW'];
  const pts: THREE.Vector3[] = [];
  for (let f = 0; f < 7; f++) {
    const [bx, bz] = C[order[(f + 1) % 4]];
    const [ax, az] = C[order[f % 4]];
    const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
    const y1 = S.y0 + S.h * (f + 1);
    pts.push(V(bx - dx * 1.4, y1, bz - dz * 1.4), V(bx, y1, bz));
  }
  out.push(walk(world, 'the unfinished spire: seven flights to the top', V(-5.2, 24, -33.75), pts, K));
  out.push(walk(world, 'spire top → bridge → the veil', V(-6.25, 44, -46.25), [V(-6.25, 44, -48.5)], K));
  fog('orrow').set(1);
  out.push(walk(world, 'veil gone: into the observatory', V(-6.25, 44, -48.5), [V(-6.25, 44, -53), V(-6.25, 44, -63), V(0, 44, -68), V(-12, 44, -60)], K));
  fog('orrow').set(0);
  // shortcuts: the gallery drawbridge
  out.push(walk(world, 'hall → gallery stair → gallery', V(13, 18, 2.5), [V(13, 18, 0.9), V(13, 24, -9.2), V(13, 24, -10.3), V(0, 24, -10.5)], K));
  P.drawbridge.set(1);
  out.push(walk(world, 'drawbridge lowered: gallery ⇄ spire yard (shortcut)', V(0, 24, -10.5), [V(0, 24, -12.2), V(0, 24, -15), V(0, 24, -19), V(0, 24, -22)], K));
  P.drawbridge.set(0);
  out.push(walk(world, 'archive alcove (the register)', V(-6, 24, -10.5), [V(-13.8, 24, -9.6)], K));
  // optional: laboratory No. 9
  out.push(walk(world, 'lab A → bridge → No. 9 veil', V(-39, 18, -9), [V(-42.5, 18, -9), V(-46.5, 18, -9)], K));
  fog('experiment9').set(1);
  out.push(walk(world, 'No. 9 veil gone: into the laboratory', V(-46.5, 18, -9), [V(-51, 18, -9), V(-57, 18, -9), V(-59, 18, -6)], K));
  fog('experiment9').set(0);
  // secrets and side places
  out.push(walk(world, 'tidal rocks (Bellbronze Shard)', V(6, 2, 30.3), [V(10.9, 2, 30.3), V(15.4, 0.3, 30.3), V(19, 0.3, 29.8)], K));
  out.push(walk(world, 'acolytes\' balcony stair', V(9.35, 2, 30.4), [V(9.35, 2, 29.4), V(9.35, 7, 22.8), V(6, 7, 21)], K));
  out.push(walk(world, 'cage winch and the dock (lab B west door)', V(-38, 18, -25.5), [V(-43, 18, -25.5), V(-44.2, 18, -25.5)], K));
  out.push(walk(world, 'terrace: round the shaft', V(0, 18, 6), [V(-9, 18, 12), V(-4, 18, 9), V(4, 18, 9), V(8, 18, 12)], K));
  return out;
}

describe('Academy traversal (capsule walks the critical path; closed pieces block)', () => {
  const { L, world } = build();

  it('every walk check passes', () => {
    const results = run(L, world);
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.log('FAIL', JSON.stringify(f));
    expect(results.length).toBeGreaterThan(25);
    expect(failed.length).toBe(0);
  }, 180000);

  it('Stillbells, NPCs and pickups stand on walkable ground', () => {
    const bad: string[] = [];
    const onGround = (name: string, p: THREE.Vector3) => {
      const g = world.groundAt(p.x, p.y + 1.2, p.z, 3);
      if (!g || Math.abs(g.y - p.y) > 0.45) bad.push(`${name} @ ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} ground=${g?.y.toFixed(2)}`);
    };
    for (const b of L.stillbells) onGround('bell:' + b.id, b.anchor.pos);
    for (const [k, a] of Object.entries(L.anchors)) if (!['arrival', 'shard', 'liftLow', 'liftHigh', 'cageDocked'].includes(k)) onGround(k, a.pos);
    for (const e of L.enemies) onGround('enemy:' + e.id, e.anchor.pos);
    for (const a of L.arenas) { onGround('arena-entry:' + a.bossId, a.entry.pos); onGround('arena-spawn:' + a.bossId, a.spawn.pos); onGround('fog:' + a.bossId, a.fogGate.anchor.pos); }
    for (const b of bad) console.log('NOT ON GROUND', b);
    expect(bad).toEqual([]);
  });

  it('the lens floor: plates cover the disc and form one connected graph', () => {
    const f = L.lensFloor;
    expect(f.plates.length).toBe(19);
    // every plate is reachable from the centre through neighbours
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) { const c = stack.pop()!; for (const n of f.plates[c].neighbours) if (!seen.has(n)) { seen.add(n); stack.push(n); } }
    expect(seen.size).toBe(19);
    // sample points on the floor map to a plate
    let miss = 0;
    for (let i = 0; i < 400; i++) {
      const r = Math.sqrt(Math.random()) * (f.radius - 0.2), a = Math.random() * Math.PI * 2;
      if (f.plateAt(V(f.centre.x + Math.cos(a) * r, f.centre.y, f.centre.z + Math.sin(a) * r)) < 0) miss++;
    }
    expect(miss).toBe(0);
  });

  it('three Stillbells with the catalog ids, two arenas, two looping shortcuts, a lift', () => {
    expect(L.stillbells.map((b) => b.id)).toEqual(['academy.causeway', 'academy.lenshall', 'academy.spire']);
    expect(L.arenas.map((a) => a.bossId).sort()).toEqual(['experiment9', 'orrow']);
    for (const k of ['seaGate', 'seaGateLever', 'drawbridge', 'drawbridgeLever', 'lift', 'cage', 'wickBoard']) expect(L.pieces[k], k).toBeTruthy();
    expect(L.enemies.length).toBeGreaterThanOrEqual(24);
    expect(new Set(L.enemies.map((e) => e.kind)).size).toBe(6);
    expect(L.tollPosts.length).toBeGreaterThanOrEqual(3);
  });
});
