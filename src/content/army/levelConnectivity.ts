/**
 * Automated traversal check for Siegeholm: a capsule walks the critical path, both looping
 * shortcuts, the optional climbs and the secret nooks against the real CollisionWorld; negative
 * checks prove that closed pieces (postern, eastern portcullis, magazine door, veils, the passage's
 * north gate) block. Also checks that every standing anchor and spawn is on free, walkable ground.
 *
 * Usage (after collision.build()):  runArmyConnectivity(layout, collision)
 */
import * as THREE from 'three';
import type { CollisionWorld } from '../../world/Collision';
import type { RegionLayout } from '../../world/levelTypes';
import { walk, type WalkResult } from '../ashbridge/connectivity';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function runArmyConnectivity(L: RegionLayout, world: CollisionWorld): WalkResult[] {
  const out: WalkResult[] = [];
  const K = L.killY;
  const P = L.pieces;
  const fogO = L.arenas.find((a) => a.bossId === 'oderic')!.fogGate;
  const fogV = L.arenas.find((a) => a.bossId === 'varr')!.fogGate;
  const all = [...Object.values(P), fogO, fogV];
  const reset = () => all.forEach((p) => p.set(0));

  // ------------------------------------------------ negative checks
  reset();
  out.push(walk(world, 'postern closed blocks the casemate exit', V(-45.5, 0, -24), [V(-45.5, 0, -17)], K, true));
  out.push(walk(world, 'postern closed blocks from the road', V(-45.5, 0, -16), [V(-45.5, 0, -25)], K, true));
  out.push(walk(world, 'eastern portcullis closed blocks the lane', V(31, 6, -122), [V(31, 6, -130)], K, true));
  out.push(walk(world, 'eastern portcullis closed blocks from the ward', V(31, 6, -131), [V(31, 6, -120)], K, true));
  out.push(walk(world, 'magazine door (barred) blocks', V(33, 6, -84.2), [V(37.5, 6, -84.2)], K, true));
  out.push(walk(world, 'Oderic\'s veil blocks the passage', V(0, 6, -83), [V(0, 6, -92)], K, true));
  out.push(walk(world, 'Varr\'s veil blocks the rampart', V(0, 24, -209.5), [V(0, 24, -216)], K, true));
  fogO.set(1);
  out.push(walk(world, 'passage north gate (closed) blocks the ward', V(0, 6, -120), [V(0, 6, -130)], K, true));
  reset();

  // ------------------------------------------------ the critical path (veils dissolved, the north gate open)
  fogO.set(1); fogV.set(1); P.odericGate.set(1);
  const s = L.playerStart.pos;
  out.push(walk(world, 'road bell → killing ground → Outer Gate → bailey', s.clone(), [
    V(-8, 0, 41), V(-3, 0, 30), V(-2, 0, 20), V(0, 0, 8), V(0, 0, -2), V(0, 0, -14), V(0, 0, -21), V(0, 0, -27),
  ], K));
  out.push(walk(world, 'bailey → arch → West Stair → barbican', V(0, 0, -27), [
    V(-6, 0, -31), V(-11.5, 0, -35), V(-17, 0, -39), V(-21, 0, -41), V(-21, 6, -58), V(-21, 6, -62), V(-12, 6, -70),
  ], K));
  out.push(walk(world, 'barbican → Stillbell → veil', V(-12, 6, -70), [
    V(L.stillbells[1].anchor.pos.x + 0.4, 6, L.stillbells[1].anchor.pos.z), V(-8, 6, -76), V(0, 6, -83), V(0, 6, -85.6),
  ], K));
  out.push(walk(world, 'the Ram-Knight\'s passage → Upper Ward', V(0, 6, -85.6), [V(0, 6, -92), V(0, 6, -108), V(0, 6, -124), V(0, 6, -128.5), V(0, 6, -140)], K));
  out.push(walk(world, 'Upper Ward → Grand Stair → Keep → Stillbell', V(0, 6, -140), [
    V(0, 6, -154), V(0, 14, -172), V(0, 14, -178), V(-12, 14, -186), V(L.stillbells[2].anchor.pos.x + 0.4, 14, L.stillbells[2].anchor.pos.z),
  ], K));
  out.push(walk(world, 'Keep → rampart stair → veil → Bell Rampart', V(-12, 14, -186), [
    V(0, 14, -189), V(0, 24, -209), V(0, 24, -214), V(0, 24, -228), V(10, 24, -226), V(-10, 24, -226), V(0, 24, -236),
  ], K));

  // ------------------------------------------------ shortcut 1: the West Casemate and the Postern
  P.postern.set(1);
  out.push(walk(world, 'shortcut: barbican → casemate → Postern → Siege Road', V(-20, 6, -81.5), [
    V(-26, 6, -81.5), V(-35, 6, -81.5), V(-45.5, 6, -81.5), V(-45.5, 6, -79.5), V(-45.5, 0, -62), V(-45.5, 0, -45),
    V(-45.5, 0, -30), V(-45.5, 0, -22), V(-45.5, 0, -16.5), V(-38, 0, -12), V(-25, 0, -2), V(-8, 0, 10),
  ], K));
  out.push(walk(world, 'casemate alcove (loot nook)', V(-45.5, 0, -45), [V(-45.5, 0, -40), V(-46.1, 0, -40)], K));
  // ------------------------------------------------ shortcut 2: the Eastern Lane
  P.eastGate.set(1);
  out.push(walk(world, 'shortcut: Upper Ward → winch → Eastern Lane → magazine yard → barbican', V(20, 6, -140), [
    V(P.eastWinch.anchor!.pos.x, 6, P.eastWinch.anchor!.pos.z - 0.2), V(31, 6, -131), V(31, 6, -124), V(31, 6, -108), V(31, 6, -94),
    V(30, 6, -86), V(30, 6, -74), V(26, 6, -70), V(18, 6, -70),
  ], K));
  out.push(walk(world, 'lane alcove (Bellbronze Shard)', V(31, 6, -108), [V(35.3, 6, -108)], K));
  // ------------------------------------------------ the magazine (door open)
  P.magazineDoor.set(1);
  out.push(walk(world, 'magazine yard → orders → magazine interior', V(30, 6, -74), [V(29.4, 6, -64), V(30, 6, -76), V(33, 6, -84.2), V(36.2, 6, -84.2), V(38, 6, -83)], K));
  // ------------------------------------------------ optional climbs and nooks
  out.push(walk(world, 'siege tower gangway → deck → west wall-walk → arbalest post', V(-12.75, 0, 8), [
    V(-12.75, 0, 5.2), V(-12.75, 8, -14.2), V(-13, 8, -16.5), V(-17.5, 8, -16.5), V(-17.5, 8, -19.6), V(-17.5, 8, -21), V(-30, 8, -21), V(-44.2, 8, -21),
  ], K));
  out.push(walk(world, 'west walk → gatehouse corridor → east walk → bombard platform', V(-17.5, 8, -21), [
    V(-8, 8, -21), V(0, 8, -21), V(8, 8, -21), V(10, 8, -21.2), V(10, 8, -25.4),
  ], K));
  out.push(walk(world, 'siege tower ground room (loot nook)', V(-24, 0, -11.4), [V(-21.8, 0, -11.4), V(-18.6, 0, -11.4), V(-18.6, 0, -14.6)], K));
  out.push(walk(world, 'the breach: road → rubble → bailey', V(22, 0, -8), [V(22, 0, -12), V(22, 2.6, -21), V(22, 0, -30), V(20, 0, -34)], K));
  out.push(walk(world, 'bailey → ossuary (secret)', V(30, 0, -54), [V(40.5, 0, -52.5), V(43.8, 0, -52.5), V(45.8, 0, -50.5), V(45.8, 0, -48.5)], K));
  out.push(walk(world, 'road → victory relief → graves', V(0, 0, 30), [V(L.anchors.victoryRelief.pos.x, 0, L.anchors.victoryRelief.pos.z), V(15.8, 0, 26), V(16, 0, 22.5)], K));
  out.push(walk(world, 'ward → Hall of the Last Feast → dais', V(-6, 6, -148), [V(-12, 6, -148), V(-16, 6, -148), V(-20, 6, -148), V(-20, 6, -154), V(-26, 6, -154.6), V(-26, 6, -155.4), V(-26, 6.6, -157.9), V(-33, 6.6, -158.3)], K));
  reset();
  out.push(...spawnSanity(L, world));
  return out;
}

/** Every standing anchor and spawn must be on free, walkable ground. */
export function spawnSanity(L: RegionLayout, world: CollisionWorld): WalkResult[] {
  const standing = ['posternInside', 'posternOutside', 'victoryRelief', 'musterSoldier', 'massGrave', 'victoryArch', 'pikeRack', 'limePit', 'ossuary',
    'casemateAlcove', 'odericEntry', 'magazineDoor', 'tallisCell', 'magazineInside', 'orders', 'laneAlcove', 'eastGateLane', 'odericSpawn', 'odericExit',
    'highTable', 'hallRack', 'hallArmour', 'feastInspect', 'lastStand', 'eastGateWard', 'varrEntry', 'varrSpawn', 'keepScrap', 'towerNook', 'wardScrap'];
  const pts: [string, THREE.Vector3, number][] = [
    ['playerStart', L.playerStart.pos, 0.35],
    ...L.stillbells.map((b) => ['stillbell:' + b.id, b.anchor.pos, 0.35] as [string, THREE.Vector3, number]),
    ...L.enemies.map((e) => [e.id, e.anchor.pos, e.kind === 'siegeKnight' ? 0.5 : e.kind === 'warHound' ? 0.45 : 0.38] as [string, THREE.Vector3, number]),
    ...L.arenas.flatMap((a) => [['arena.entry:' + a.bossId, a.entry.pos, 0.35], ['arena.spawn:' + a.bossId, a.spawn.pos, 0.7], ['fog.enterTo:' + a.bossId, a.fogGate.enterTo.pos, 0.35], ['fog.anchor:' + a.bossId, a.fogGate.anchor.pos, 0.35]] as [string, THREE.Vector3, number][]),
    ...standing.filter((n) => L.anchors[n]).map((n) => [n, L.anchors[n].pos, 0.35] as [string, THREE.Vector3, number]),
    ...Object.entries(L.pieces).filter(([, p]) => p.anchor).map(([n, p]) => ['piece:' + n, p.anchor!.pos, 0.35] as [string, THREE.Vector3, number]),
    ...L.tollPosts.flatMap((t) => t.options.map((o) => [`toll:${t.id}:${o.id}`, o.toward, 0.35] as [string, THREE.Vector3, number])),
  ];
  const missing = standing.filter((n) => !L.anchors[n]);
  const bad: string[] = missing.map((n) => `missing anchor ${n}`);
  for (const [name, p, r] of pts) {
    const q = p.clone().add(new THREE.Vector3(0, 0.02, 0));
    const before = q.clone();
    world.resolveCapsule(q, r, 1.8);
    const push = Math.hypot(q.x - before.x, q.z - before.z);
    const g = world.groundAt(p.x, p.y + 0.5, p.z, 2);
    if (push > 0.05) bad.push(`${name} pushed ${push.toFixed(2)} m`);
    else if (!g || Math.abs(g.y - p.y) > 0.35) bad.push(`${name} no ground (${g ? g.y.toFixed(2) : 'none'} vs ${p.y})`);
  }
  return [{ name: `spawn/anchor sanity (${pts.length} points)`, ok: bad.length === 0, reached: pts.length - bad.length, total: pts.length, end: [0, 0, 0], note: bad.join('; ') || 'ok', seconds: 0 }];
}
