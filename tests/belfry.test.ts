/**
 * The Belfry of Return: traversal/connectivity of the level (a capsule walks the ascent, the
 * secret way, both shortcuts; closed pieces block), anchor sanity, and the ending logic
 * (availability with 0/3 allies and with/without the Unlived Muster, epilogue length and names).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { walk, type WalkResult } from '../src/content/ashbridge/connectivity';
import { buildBelfry, type BelfryLayout } from '../src/content/belfry/level';
import { endingOptions, epilogueCards, fates, CREDIT_CARDS } from '../src/content/belfry/Region';
import { newWorldState, type WorldState } from '../src/systems/WorldState';
import { MUSTER_REGIONS, registerHospiceGuest } from '../src/game/regions/hub';
import { BOSSES } from '../src/content/bosses';
import { LEADS } from '../src/content/journal';
import '../src/content/belfry/meta';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

let L: BelfryLayout;
let world: CollisionWorld;

beforeAll(() => {
  const scene = new THREE.Scene();
  world = new CollisionWorld();
  L = buildBelfry({ scene, collision: world, quality: 'low', sun: new THREE.DirectionalLight() });
  world.build();
}, 120000);

function report(results: WalkResult[]) {
  const failed = results.filter((r) => !r.ok);
  for (const f of failed) console.log('FAIL', JSON.stringify(f));
  return failed.length;
}

describe('Belfry traversal (capsule walks the ascent; closed pieces block)', () => {
  it('closed pieces block', () => {
    const K = L.killY;
    const P = L.pieces;
    for (const p of Object.values(P)) p.set(0);
    for (const a of L.arenas) a.fogGate.set(0);
    const out = [
      walk(world, 'great door barred', V(0, 0, 18.5), [V(0, 0, 11)], K, true),
      walk(world, 'gallery gate shut', V(18.7, 0, 11.5), [V(18.7, 0, 6.5)], K, true),
      walk(world, 'loose plate shut', V(-11.5, 14, 8), [V(-17, 14, 8)], K, true),
      walk(world, 'Aldren veil', V(7.6, 35, 11.1), [V(7.6, 35, 6)], K, true),
      walk(world, 'Bellkeeper veil', V(-20.5, 7, -7), [V(-25, 7, -7)], K, true),
    ];
    expect(report(out)).toBe(0);
  }, 120000);

  it('the ascent: foot → ledge → postern → five floors → Crown', () => {
    const K = L.killY;
    for (const p of Object.values(L.pieces)) p.set(0);
    for (const a of L.arenas) a.fogGate.set(0);
    const s = L.playerStart.pos;
    const out = [
      walk(world, 'foot → causeway → landing → terrace', s.clone(), [V(2.6, -3, s.z), V(2.6, -3, 60), V(0, -3, 57.5), V(0, -1.5, 45), V(0, -1.5, 39), V(0, 0, 25), V(0, 0, 20)], K),
      walk(world, 'terrace → windward ledge → postern → F1', V(0, 0, 20), [V(-10, 0, 20.5), V(-20, 0, 18), V(-20, 0, 8), V(-15.5, 0, 8), V(-12, 0, 8), V(-8, 0, 6)], K),
      walk(world, 'F1 → east stair → F2', V(-8, 0, 6), [V(0, 0, 10.8), V(12.1, 0, 10.8), V(12.1, 0, 8.7), V(12.1, 7, -3.4), V(12.1, 7, -5.2), V(8, 7, -8.8)], K),
      walk(world, 'F2 → west stair → F3', V(8, 7, -8.8), [V(2, 7, -8.8), V(-8, 7, -8.8), V(-12.1, 7, -10.6), V(-12.1, 7, -8.7), V(-12.1, 14, 3.4), V(-12.1, 14, 5.2), V(-8, 14, 6)], K),
      walk(world, 'F3 → east stair → F4', V(-8, 14, 6), [V(-8, 14, 11), V(12.1, 14, 11), V(12.1, 14, 8.7), V(12.1, 21, -3.4), V(12.1, 21, -5.2), V(6, 21, -8.8)], K),
      walk(world, 'F4 → west stair → F5', V(6, 21, -8.8), [V(-8, 21, -9.6), V(-12.1, 21, -9.6), V(-12.1, 21, -8.7), V(-12.1, 28, 3.4), V(-12.1, 28, 5.2), V(-8, 28, 6)], K),
      walk(world, 'F5 → crown stair → stairhouse', V(-8, 28, 6), [V(-9.5, 28, 12.1), V(-7.1, 28, 12.1), V(4.9, 35, 12.1), V(6.4, 35, 12.1), V(7.6, 35, 11.0)], K),
      walk(world, 'records are reachable', V(-8, 0, 6), [V(-8, 0, 3.2), V(-2, 0, 3.2), V(-2, 0, -2), V(L.anchors.record1.pos.x, 0, L.anchors.record1.pos.z)], K),
      walk(world, 'coffer nook (F4) reachable around the grille', V(6, 21, -8.8), [V(-9.8, 21, -11.5), V(L.anchors.nookF4.pos.x, 21, L.anchors.nookF4.pos.z)], K),
    ];
    expect(report(out)).toBe(0);
  }, 180000);

  it('the Crown arena (veil lifted) and the rope', () => {
    const K = L.killY;
    L.arenas[0].fogGate.set(1);
    const out = [walk(world, 'stairhouse → veil → arena → north edge', V(7.6, 35, 11.0), [V(7.6, 35, 8), V(5, 35, 4), V(0, 35, -5), V(0, 35, -16), V(10, 35, -12), V(10.5, 35, 4)], K)];
    L.pieces.crownBell.set(1);
    out.push(walk(world, 'lowered bell: the rope is reachable', V(5, 35, 4), [V(L.anchors.bellRope.pos.x, 35, L.anchors.bellRope.pos.z)], K));
    L.arenas[0].fogGate.set(0);
    expect(report(out)).toBe(0);
  }, 120000);

  it('shortcuts: the Buttress Gallery gate and the Great Door', () => {
    const K = L.killY;
    L.pieces.galleryGate.set(1);
    L.pieces.greatDoor.set(1);
    const out = [
      walk(world, 'F5 → balcony → gallery (4 flights) → gate', V(8, 28, 10), [
        V(13, 28, 10), V(16.3, 28, 10), V(16.3, 28, 8.7), V(16.3, 21, -11.2), V(18.7, 21, -12.2), V(18.7, 21, -10.9),
        V(18.7, 14, 8.7), V(18.7, 14, 9.8), V(16.3, 14, 9.8), V(16.3, 14, 8.7), V(16.3, 7, -11.2), V(18.7, 7, -12.2), V(18.7, 7, -10.9),
        V(18.7, 0, 7.4), V(18.7, 0, 8.4),
      ], K),
      walk(world, 'gate (open) → east ledge → terrace', V(18.7, 0, 8.4), [V(18.7, 0, 11.5), V(18.7, 0, 20), V(5, 0, 20)], K),
      walk(world, 'terrace → Great Door (open) → F1', V(5, 0, 20), [V(0, 0, 18), V(0, 0, 11), V(0, 0, 5)], K),
    ];
    L.pieces.galleryGate.set(0);
    L.pieces.greatDoor.set(0);
    expect(report(out)).toBe(0);
  }, 180000);

  it('the secret way: loose plate → covered stair → Branding Cell', () => {
    const K = L.killY;
    L.pieces.ossuaryDoor.set(1);
    L.arenas[1].fogGate.set(1);
    const c = L.anchors.confession.pos;
    const out = [
      walk(world, 'F3 → plate door → covered stair → bridge → cell → anvil', V(-8, 14, 8), [
        V(-12.5, 14, 8), V(-16.8, 14, 8), V(-16.8, 14, 6.8), V(-16.8, 7, -4.2), V(-16.8, 7, -7), V(-20, 7, -7), V(-23.5, 7, -7), V(-31, 7, -7), V(c.x, 7, c.z),
      ], K),
      walk(world, 'ledge nook (dead-end view)', V(-20, 0, 18), [V(-20, 0, 1), V(L.anchors.ledgeNook.pos.x, 0, L.anchors.ledgeNook.pos.z)], K),
    ];
    L.pieces.ossuaryDoor.set(0);
    L.arenas[1].fogGate.set(0);
    expect(report(out)).toBe(0);
  }, 120000);

  it('every standing anchor is on walkable ground and not inside geometry', () => {
    for (const p of Object.values(L.pieces)) p.set(0);
    const pts: [string, THREE.Vector3][] = [
      ['playerStart', L.playerStart.pos],
      ...L.stillbells.map((b) => ['stillbell:' + b.id, b.anchor.pos] as [string, THREE.Vector3]),
      ...L.enemies.map((e) => [e.id, e.anchor.pos] as [string, THREE.Vector3]),
      ...L.arenas.flatMap((a) => [['arena:' + a.bossId + ':spawn', a.spawn.pos], ['arena:' + a.bossId + ':entry', a.entry.pos], ['arena:' + a.bossId + ':enterTo', a.fogGate.enterTo.pos]] as [string, THREE.Vector3][]),
      ...['record1', 'record2', 'record3', 'record4', 'record5', 'nookF1', 'nookF2', 'nookF4', 'ledgeNook', 'galleryNook', 'greatDoorIn', 'greatDoorOut', 'galleryLever', 'galleryGateOut', 'ossuaryIn', 'confession', 'statues'].map((n) => [n, L.anchors[n].pos] as [string, THREE.Vector3]),
    ];
    const bad: string[] = [];
    for (const [name, p] of pts) {
      const q = p.clone().add(new THREE.Vector3(0, 0.02, 0));
      const before = q.clone();
      world.resolveCapsule(q, 0.35, 1.8);
      const push = Math.hypot(q.x - before.x, q.z - before.z);
      const g = world.groundAt(p.x, p.y + 0.5, p.z, 2);
      if (push > 0.06) bad.push(`${name} pushed ${push.toFixed(2)} m`);
      else if (!g || Math.abs(g.y - p.y) > 0.35) bad.push(`${name} no ground (${g ? g.y.toFixed(2) : 'none'} vs ${p.y})`);
    }
    if (bad.length) console.log(bad.join('\n'));
    expect(bad).toEqual([]);
  }, 60000);

  it('the region is registered correctly', () => {
    expect(L.stillbells.map((b) => b.id)).toEqual(['belfry.foot', 'belfry.crown']);
    expect(BOSSES.aldren.phases).toEqual([0.66, 0.33]);
    expect(BOSSES.aldren.looks).toEqual(['aldren_young', 'aldren_sorcerer', 'aldren_ancient']);
    expect(BOSSES.bellkeeper).toBeTruthy();
    expect(L.arenas.map((a) => a.bossId)).toEqual(['aldren', 'bellkeeper']);
    expect(L.arenas[0].onDefeat?.length).toBeGreaterThan(0);
    expect(LEADS.belfry.entries.bf_obs_coronation.contradicts).toBe('bf_mem_once');
    expect(L.stats.triangles).toBeLessThan(1_500_000);
  });
});

// ------------------------------------------------------------------ endings

const ws0 = (): WorldState => newWorldState();
function withAllies(n: number, ws = ws0()): WorldState {
  for (let i = 0; i < n; i++) ws.npcs['ally' + i] = 'rescued';
  return ws;
}
function withMuster(ws = ws0()): WorldState {
  for (const r of MUSTER_REGIONS) ws.flags['muster.' + r] = true;
  return ws;
}
const avail = (ws: WorldState) => Object.fromEntries(endingOptions(ws).map((o) => [o.id, o.available]));

describe('Belfry endings (never decided by death count)', () => {
  it('0 allies, no muster: only Break is available, the others explain why', () => {
    const ws = ws0();
    ws.flags.deaths = 400;
    expect(avail(ws)).toEqual({ break: true, inherit: false, shelter: false });
    const o = endingOptions(ws);
    expect(o.find((x) => x.id === 'inherit')!.reason).toMatch(/three allies/);
    expect(o.find((x) => x.id === 'shelter')!.reason).toMatch(/Unlived Muster/);
  });
  it('2 allies is not enough; 3 allies unlocks Inherit', () => {
    expect(avail(withAllies(2)).inherit).toBe(false);
    expect(avail(withAllies(3))).toEqual({ break: true, inherit: true, shelter: false });
  });
  it('the muster in all five regions unlocks Shelter; four is not enough', () => {
    const ws = withMuster();
    expect(avail(ws)).toEqual({ break: true, inherit: false, shelter: true });
    delete ws.flags['muster.' + MUSTER_REGIONS[4]];
    expect(avail(ws).shelter).toBe(false);
    expect(endingOptions(ws).find((x) => x.id === 'shelter')!.reason).toMatch(/4 of 5/);
  });
  it('3 allies and the muster: all three endings', () => {
    expect(avail(withMuster(withAllies(3)))).toEqual({ break: true, inherit: true, shelter: true });
  });
  it('epilogues run 10–16 cards and name who lived and who was lost', () => {
    registerHospiceGuest({ id: 'mira', name: 'Mira Coll', look: 'hesper', idle: null, present: (w) => w.npcs.mira === 'rescued', greet: 'x' });
    registerHospiceGuest({ id: 'tobren', name: 'Tobren Ashe', look: 'oswin', idle: null, present: () => false, greet: 'x' });
    const ws = ws0();
    ws.npcs.oswin = 'rescued';
    ws.npcs.mira = 'rescued';
    ws.npcs.tobren = 'dead';
    ws.flags['boss.bellkeeper'] = true;
    ws.flags['belfry.recordLaid'] = true;
    const f = fates(ws);
    expect(f.lived).toEqual(expect.arrayContaining(['Oswin Marrow', 'Mira Coll', 'Hesper Vail']));
    expect(f.lost).toEqual(['Tobren Ashe']);
    for (const id of ['break', 'inherit', 'shelter'] as const) {
      for (const w of [ws, ws0(), withMuster(withAllies(3))]) {
        const cards = epilogueCards(id, w);
        expect(cards.length).toBeGreaterThanOrEqual(10);
        expect(cards.length).toBeLessThanOrEqual(16);
        expect(cards[cards.length - 1].style).toBe('title');
      }
      const text = epilogueCards(id, ws).map((c) => c.text).join(' ');
      expect(text).toContain('Mira Coll');
      expect(text).toContain('Tobren Ashe');
    }
    expect(CREDIT_CARDS.map((c) => c.text).join(' ')).toMatch(/Bells of the Unlived/i);
    expect(CREDIT_CARDS.map((c) => c.text).join(' ')).toMatch(/MIT/);
  });
});
