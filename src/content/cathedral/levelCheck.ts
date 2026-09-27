/**
 * Automated traversal check for the Pilgrim Stair: a capsule walks the critical path and the side
 * routes against the real collision world (see src/content/ashbridge/connectivity.ts for `walk`).
 * Negative checks prove that closed pieces (the grate, the great doors, both veils, the cloister
 * door) really block.
 */
import * as THREE from 'three';
import type { CollisionWorld } from '../../world/Collision';
import { walk, type WalkResult } from '../ashbridge/connectivity';
import type { CathedralLayout } from './level';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function runCathedralConnectivity(L: CathedralLayout, world: CollisionWorld): WalkResult[] {
  const out: WalkResult[] = [];
  const K = L.killY;
  const [cloister, choir] = L.arenas;
  const all = [L.pieces.grate, L.pieces.greatDoors, L.pieces.cloisterDoor, cloister.fogGate, choir.fogGate];
  const reset = () => all.forEach((p) => p.set(0));

  // ------------------------------------------------ closed pieces block
  reset();
  out.push(walk(world, 'ossuary grate (closed) blocks the shortcut', V(14, 0, 16.5), [V(14, 0, 11.8)], K, true));
  out.push(walk(world, 'great doors (barred) block the nave', V(0, 12, -37.4), [V(0, 12, -45)], K, true));
  out.push(walk(world, 'cloister veil blocks', V(23.5, 12, -63.4), [V(23.5, 12, -69)], K, true));
  out.push(walk(world, 'cloister door (closed) blocks the nave', V(12.5, 12, -80), [V(19.6, 12, -80)], K, true));
  out.push(walk(world, 'choir veil blocks', V(0, 12, -93.4), [V(0, 12, -99)], K, true));

  // ------------------------------------------------ the routes
  const s = L.playerStart.pos;
  out.push(walk(world, 'gate → Candle Street → the Stair\'s foot', s.clone(), [
    V(3.4, 0, s.z - 0.2), V(3.2, 0, 55), V(-1.5, 0, 50), V(0, 0, 40), V(0, 0, 30), V(0, 0, 22), V(0, 0, 15),
  ], K));
  out.push(walk(world, 'crossroads → west lane → Masons\' Yard → nook', V(0, 0, 34), [
    V(-12, 0, 34), V(-22, 0, 34), V(-29, 0, 34), V(-31.4, 0, 30), V(-31.4, 0, 23.3), V(-34.2, 0, 23.1),
  ], K));
  out.push(walk(world, 'crossroads → east lane → shrine court', V(0, 0, 34), [V(15, 0, 34), V(25, 0, 34), L.anchors.censer.pos.clone()], K));
  out.push(walk(world, 'the Pilgrim Stair → parvis → chapel', V(0, 0, 15), [
    V(0, 4, 4.4), V(0, 4, 0.6), V(0, 8, -9.4), V(0, 8, -12.6), V(0, 12, -22.6), V(-3, 12, -33), V(-14, 12, -30), V(-21.5, 12, -30), L.anchors.wenna.pos.clone().add(V(1.2, 0, 0)),
  ], K));
  out.push(walk(world, 'first landing → ossuary → alcoves, tablet, bier → Stair of Graves → antechamber', V(0, 4, 2.6), [
    V(6.5, 4, 2.6), V(12, 4, 2.6), V(19.5, 4, 2.6), V(21.5, 4, 1), V(21.5, 4, -9), L.anchors.soames.pos.clone().add(V(0.8, 0, 0)), V(21.5, 4, -9),
    V(21.5, 4, -18), V(28, 4, -18), L.anchors.tablet.pos.clone(), V(21.5, 4, -18), V(21.5, 4, -27), L.stillbells[1].anchor.pos.clone(), V(21.5, 4, -27),
    V(21.5, 4, -36), L.anchors.funeral.pos.clone(), V(21.5, 4, -36), V(23.5, 4, -42.5), V(23.5, 8, -53), V(23.5, 12, -61.5), V(23.5, 12, -63.6),
  ], K));
  reset();
  L.pieces.grate.set(1);
  out.push(walk(world, 'grate open: passage → grate stair → the Stair\'s foot', V(14, 4, 2.6), [V(14, 4, 5.4), V(14, 0, 12.4), V(14, 0, 17)], K));
  cloister.fogGate.set(1);
  L.pieces.cloisterDoor.set(1);
  out.push(walk(world, 'cloister (veil down) → round the garth → door → nave', V(23.5, 12, -63.6), [
    V(23.5, 12, -68.5), V(24.2, 12, -75), V(36, 12, -75), V(40, 12, -88), V(28, 12, -88), V(20.5, 12, -80), V(12.5, 12, -80), V(4, 12, -80),
  ], K));
  L.pieces.greatDoors.set(1);
  out.push(walk(world, 'nave → great doors (open) → parvis', V(4, 12, -80), [V(0, 12, -60), V(0, 12, -44), V(0, 12, -38), V(0, 12, -30)], K));
  out.push(walk(world, 'nave → Stillbell', V(0, 12, -60), [V(-6, 12, -80), L.stillbells[2].anchor.pos.clone()], K));
  out.push(walk(world, 'nave → triforium stair → gallery → the rolls', V(12.2, 12, -46), [
    V(12.2, 12, -50.4), V(12.2, 18, -67.6), V(12.2, 18, -72), V(12, 18, -88), L.anchors.rolls.pos.clone(),
  ], K));
  choir.fogGate.set(1);
  out.push(walk(world, 'choir (veil down) → arena → altar', V(0, 12, -93.4), [V(0, 12, -99), V(0, 12, -111), V(7, 12, -118)], K));
  reset();
  return out;
}
