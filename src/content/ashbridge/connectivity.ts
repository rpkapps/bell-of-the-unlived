/**
 * Automated traversal check for the Ashbridge critical path.
 *
 * A capsule (r 0.35, h 1.8) walks between waypoints at walking speed with gravity, resolved
 * against the real CollisionWorld (static BVH + dynamic pieces) exactly like a character
 * controller would. A leg passes if every waypoint is reached (XZ within 0.45 m, height within
 * 0.6 m) without falling below killY and without getting stuck. Negative checks prove that closed
 * pieces (hatch, raised drawbridge, fog, reveal barrier) really block.
 *
 * Usage (after collision.build()):  runAshbridgeConnectivity(layout, collision)
 */
import * as THREE from 'three';
import type { AshbridgeLayout } from '../../world/levelTypes';
import type { CollisionWorld } from '../../world/Collision';

export interface WalkResult {
  name: string;
  ok: boolean;
  reached: number;
  total: number;
  end: [number, number, number];
  note: string;
  seconds: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Walk a capsule through waypoints. `expectBlocked` inverts success (for negative checks). */
export function walk(world: CollisionWorld, name: string, start: THREE.Vector3, pts: THREE.Vector3[], killY: number, expectBlocked = false): WalkResult {
  const R = 0.35, H = 1.8, speed = 4.2, g = 22, dt = 1 / 60;
  const pos = start.clone();
  let vy = 0, t = 0, reached = 0, note = '';
  // settle on the ground
  for (let i = 0; i < 30; i++) { vy -= g * dt; pos.y += vy * dt; if (world.resolveCapsule(pos, R, H).grounded) vy = 0; }
  let best = Infinity, lastImprove = 0;
  const dir = new THREE.Vector3();
  outer: for (const wp of pts) {
    best = Infinity; lastImprove = t;
    for (;;) {
      dir.set(wp.x - pos.x, 0, wp.z - pos.z);
      const d = dir.length();
      if (d < 0.45) {
        if (Math.abs(pos.y - wp.y) > 0.6) { note = `height mismatch at wp ${reached}: ${pos.y.toFixed(2)} vs ${wp.y}`; break outer; }
        reached++;
        continue outer;
      }
      if (d < best - 0.05) { best = d; lastImprove = t; }
      if (t - lastImprove > 3) { note = `stuck before wp ${reached} (${wp.x},${wp.y},${wp.z}) at ${fmt(pos)}`; break outer; }
      dir.multiplyScalar(Math.min(speed * dt, d) / d);
      pos.add(dir);
      vy -= g * dt;
      pos.y += vy * dt;
      const r = world.resolveCapsule(pos, R, H);
      if (r.grounded && vy < 0) vy = 0;
      t += dt;
      if (pos.y < killY) { note = `fell below killY near ${fmt(pos)}`; break outer; }
      if (t > 600) { note = 'timeout'; break outer; }
    }
  }
  const passed = reached === pts.length;
  return {
    name, ok: expectBlocked ? !passed : passed, reached, total: pts.length,
    end: [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2)],
    note: expectBlocked ? (passed ? 'NOT blocked (expected a block)' : `blocked as expected — ${note}`) : note || 'ok',
    seconds: +t.toFixed(1),
  };
}

const fmt = (p: THREE.Vector3) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;

export function runAshbridgeConnectivity(L: AshbridgeLayout, world: CollisionWorld): WalkResult[] {
  const out: WalkResult[] = [];
  const K = L.killY;
  const all = [L.hatch, L.drawbridge, L.drawbridgeLever, L.fogGate, L.refugeDoor, L.chest, L.battlefieldReveal, L.anchorBell];
  const reset = () => all.forEach((p) => p.set(0));

  // ------------------------------------------------ negative checks (closed pieces block)
  reset();
  out.push(walk(world, 'hatch closed blocks the stair', V(13, 0, -51.2), [V(13, 0, -52.6), V(13, -5, -58.5)], K, true));
  out.push(walk(world, 'raised drawbridge blocks the west gate', V(-10.5, 3, -110), [V(-16.4, 3, -110), V(-22, 3, -110)], K, true));
  out.push(walk(world, 'raised drawbridge: ledge gap is blocked', V(-27.3, 3, -106), [V(-27.3, 3, -110), V(-21, 3, -110)], K, true));
  out.push(walk(world, 'fog gate blocks the arena', V(4, 8, -147.2), [V(4, 8, -152)], K, true));
  out.push(walk(world, 'locked refuge door blocks', V(12.2, -5, -82), [V(8.5, -5, -82)], K, true));
  out.push(walk(world, 'fresh masonry blocks the escape route', V(8.9, 0, -55.6), [V(8.9, -2.3, -59.4), V(8.9, -2.4, -62)], K, true));

  // ------------------------------------------------ the critical path (hatch open, drawbridge lowered)
  reset();
  L.hatch.set(1);
  L.drawbridge.set(1);
  L.refugeDoor.set(1);
  const s = L.playerStart.pos;
  out.push(walk(world, 'tower top → tower door (spiral stair)', s.clone(), [
    V(-29.5, 14, -110), V(-33, 14, -113.1), V(-35.2, 14, -113.1), V(-37.1, 14, -113.1), V(-37.1, 14, -112.4),
    V(-37.1, 11.25, -107.4), V(-37.1, 11.25, -106.9), V(-30.9, 8.5, -106.9),
    V(-30.9, 5.75, -112.3), V(-30.9, 5.75, -113.1), V(-35.7, 3, -113.1), V(-37.1, 3, -113.1),
    V(-37.1, 3, -106.9), V(-30.9, 3, -106.9), V(-30.9, 3, -110), V(-27.4, 3, -110),
  ], K));
  out.push(walk(world, 'ledge → rim path → lower street → square', V(-27.4, 3, -110), [
    V(-27.4, 3, -105), V(-28, 1.5, -76), V(-28, 0, -45), V(-28, 0, -38), V(-20, 0, -34.5), V(-14, 0, -30.5),
    V(-8, 0, -30.5), V(2, 0, -32), V(10, 0, -33),
  ], K));
  out.push(walk(world, 'alley → yard → loot nook', V(-12, 0, -31), [V(-12.2, 0, -26), V(-12.2, 0, -19), V(-13, 0, -12), V(-16.3, 0, -9.3), V(-16.3, 0, -7.6)], K));
  out.push(walk(world, 'square → mint hall → counting room → hatch → undercroft', V(10, 0, -33), [
    V(10, 0, -37.5), V(10, 0, -42.5), V(8.6, 0, -45.5), V(10, 0, -47.8), V(10, 0, -50.5), V(13, 0, -51.3),
    V(13, 0, -52.6), V(13, -5, -58.4), V(13, -5, -66),
  ], K));
  out.push(walk(world, 'undercroft side rooms (sentry alcove, clerk, chest, refuge)', V(13, -5, -66), [
    V(9, -5, -66), V(13, -5, -66), V(13, -5, -72.5), V(17.8, -5, -72.5), V(13, -5, -72.5), V(13, -5, -81),
    V(16.9, -5, -81), V(13, -5, -81), V(13, -5, -82), V(9.5, -5, -82), V(7.5, -5, -83.5), V(9.5, -5, -82), V(13, -5, -82),
  ], K));
  out.push(walk(world, 'undercroft → stair → courtyard', V(13, -5, -82), [
    V(13, -5, -93.5), V(10.8, -5, -93.5), V(-2.4, 3, -93.5), V(-3.4, 3, -93.5), V(-3.4, 3, -97.2), V(-4, 3, -104),
  ], K));
  out.push(walk(world, 'courtyard → lever → west gate → drawbridge → tower ledge', V(-4, 3, -104), [
    V(-10.6, 3, -106.4), V(-11, 3, -110), V(-16.5, 3, -110), V(-22, 3.08, -110), V(-25, 3, -110), V(-27.3, 3, -110), V(-27.3, 3, -106), V(-29.3, 3, -110),
  ], K));
  out.push(walk(world, 'courtyard → hospice → stillbell → practice yard', V(4, 3, -110), [
    V(18, 3, -112), V(23.5, 3, -112), V(27, 3, -112), V(35, 3, -112), V(L.stillbells[1].anchor.pos.x, 3, -108), V(38.5, 3, -114.3),
    V(42, 3, -114.3), V(48, 3, -109), V(52, 3, -102.2), V(48, 3, -122),
  ], K));
  out.push(walk(world, 'hospice → forge → gear rack', V(30, 3, -112), [V(29.5, 3, -115), V(29.5, 3, -118.5), V(30, 3, -115), V(33.3, 3, -114.2)], K));
  out.push(walk(world, 'courtyard → east stair → wall-walk (archer post)', V(18, 3, -100), [
    V(20.9, 3, -97.8), V(20.9, 9, -108.3), V(21, 9, -109.3), V(23.4, 9, -109.3), V(23.4, 9, -131.3), V(19, 9, -131.4), V(0, 9, -131.4),
  ], K));
  L.fogGate.set(1);
  out.push(walk(world, 'courtyard → gate approach → fog (dissolved) → arena', V(4, 3, -118), [
    V(4, 3, -128.5), V(4, 3, -132.5), V(4, 5.5, -139.5), V(4, 8, -146.6), V(4, 8, -149.5), V(4, 8, -152.5),
    V(4, 8, -166), V(4, 8, -177.5), V(16, 8, -166), V(-8, 8, -166),
  ], K));
  // after the reveal: the ring barrier keeps the player out of the hole
  L.battlefieldReveal.set(1);
  out.push(walk(world, 'reveal: barrier keeps the player out of the hole', V(4, 8, -152), [V(4, 8, -166)], K, true));
  out.push(walk(world, 'reveal: rim stays walkable (to Brannoc)', V(4, 8, -152), [V(L.brannoc.pos.x, 8, L.brannoc.pos.z + 0.3), V(11, 8, -159), V(13.5, 8, -166), V(11, 8, -173), V(4, 8, -176)], K));
  reset();
  return out;
}
