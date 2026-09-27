/**
 * Collision audit (node, no renderer): compares what a region DRAWS with what it COLLIDES, over the
 * area the player can actually reach, and drives a capsule through it looking for tunnelling.
 *
 *  1. Build the level into a scene + CollisionWorld exactly like the game does.
 *  2. Flood-fill the walkable collision surface on a 0.5 m grid from every anchor (Stillbells,
 *     arena entries, NPC spots …): a cell is standable when the capsule fits there, neighbours are
 *     linked by level ground, ramps (continuous slope), steps ≤ 0.32 m or drops (falls), and not
 *     across walls. Done with dynamic pieces closed (t = 0) and again open (t = 1).
 *  3. For every reachable cell:
 *     - `floorGap`   the collision floor ends (a drop) where a visible floor continues at the same
 *                    height → the player walks onto the drawn floor and falls through it;
 *     - `noCollider` visible, solid-looking geometry (anything taller than ~0.5 m, not cloth, rope,
 *                    flames, water …) passes through the standing capsule → the player walks
 *                    through a barrel, table, statue, rail …;
 *     - `invisible`  the capsule stands on a collider with nothing drawn under its feet;
 *     - `killPlane`  reachable floor below the region's killY (or the game's hard −30 m floor).
 *  4. `stressWalk`: a real Actor (Actor.stepPhysics) is walked, sprinted, rolled, lunged, knocked
 *     back and dropped from height at sampled reachable cells; after every step the bottom and top
 *     sphere centres must not have crossed any collider triangle, and a drop must land on the floor
 *     below the drop point.
 */
import * as THREE from 'three';
import { MeshBVH, type ExtendedTriangle } from 'three-mesh-bvh';
import { CollisionWorld, type Collider } from '../src/world/Collision';
import type { LevelContext, DynamicPiece } from '../src/world/levelTypes';
import { Actor, type Team } from '../src/actors/Actor';
import type { MoveDef } from '../src/combat/types';

// ------------------------------------------------------------------------------------ regions

export interface RegionEntry { id: string; load: () => Promise<(ctx: LevelContext) => any> }
export const REGIONS: RegionEntry[] = [
  { id: 'ashbridge', load: async () => (await import('../src/content/ashbridge/level')).buildAshbridge },
  { id: 'army', load: async () => (await import('../src/content/army/level')).buildArmy },
  { id: 'academy', load: async () => (await import('../src/content/academy/level')).buildAcademy },
  { id: 'cathedral', load: async () => (await import('../src/content/cathedral/level')).buildCathedralLevel },
  { id: 'treasury', load: async () => (await import('../src/content/treasury/level')).buildTreasury },
  { id: 'household', load: async () => (await import('../src/content/household/level')).buildHousehold },
  { id: 'belfry', load: async () => (await import('../src/content/belfry/level')).buildBelfry },
];

export interface BuiltRegion {
  id: string;
  scene: THREE.Scene;
  world: CollisionWorld;
  layout: any;
  pieces: DynamicPiece[];
  seeds: THREE.Vector3[];
  killY: number;
}

export async function buildRegion(entry: RegionEntry, quality: 'low' | 'high' = 'low'): Promise<BuiltRegion> {
  const build = await entry.load();
  const scene = new THREE.Scene();
  const world = new CollisionWorld();
  const layout = build({ scene, collision: world, quality, sun: new THREE.DirectionalLight() });
  world.build();
  const pieces: DynamicPiece[] = [];
  const seeds: THREE.Vector3[] = [];
  const seen = new Set<unknown>();
  const crawl = (o: any, depth: number) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 4) return;
    if (o instanceof THREE.Object3D || o instanceof THREE.Box3 || o instanceof THREE.Material || o instanceof THREE.BufferGeometry) return;
    seen.add(o);
    if (o.pos instanceof THREE.Vector3 && typeof o.yaw === 'number') seeds.push(o.pos.clone());
    if (typeof o.set === 'function' && o.object instanceof THREE.Object3D) pieces.push(o as DynamicPiece);
    for (const v of Array.isArray(o) ? o : Object.values(o)) crawl(v, depth + 1);
  };
  crawl(layout, 0);
  return { id: entry.id, scene, world, layout, pieces, seeds, killY: layout.killY };
}

export function setPieces(R: BuiltRegion, t: number) {
  for (const p of R.pieces) { try { p.set(t); } catch { /* pieces that need a game */ } }
  R.scene.updateMatrixWorld(true);
}

// ------------------------------------------------------------------------------------ visuals

/** Materials that never look solid (you walk through them) or are never floors. */
const SOFT = /^(fire|fog_veil|water|glass|ember_glow|bell_light|window_warm|unlived_crack|cloth_\w+|rope|heraldry_banner|shield_household|wax|parchment|grass_dead|moss|hair_\w+|skin\w*)$/;
const NOT_FLOOR = /^(fire|fog_veil|water|glass|ember_glow|bell_light|unlived_crack|heraldry_banner)$/;

export interface VisualIndex { bvh: MeshBVH; geom: THREE.BufferGeometry; names: string[]; mats: string[] }

const matName = (m: THREE.Material | undefined) => (m?.name ?? '').split('#')[0];

export function buildVisualIndex(scene: THREE.Scene): VisualIndex {
  scene.updateMatrixWorld(true);
  const names: string[] = [], mats: string[] = [];
  const pos: number[] = [], src: number[] = [];
  const v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  scene.traverseVisible((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (o as any).isSkinnedMesh) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat || !mat.visible) return;
    if (mat.transparent && mat.opacity < 0.9) return;
    if (!(mat as any).isMeshStandardMaterial && !(mat as any).isMeshLambertMaterial && !(mat as any).isMeshPhongMaterial && !(mat as any).isMeshPhysicalMaterial) return;
    const g = mesh.geometry;
    const P = g.attributes.position as THREE.BufferAttribute | undefined;
    if (!P) return;
    const idx = g.index;
    const id = names.length;
    names.push(mesh.name || mesh.parent?.name || '?');
    mats.push(matName(mat));
    const inst = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const count = inst ? inst.count : 1;
    const n = idx ? idx.count : P.count;
    for (let k = 0; k < count; k++) {
      if (inst) { inst.getMatrixAt(k, im); m.multiplyMatrices(mesh.matrixWorld, im); } else m.copy(mesh.matrixWorld);
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(P, idx ? idx.getX(i) : i).applyMatrix4(m);
        pos.push(v.x, v.y, v.z); src.push(id);
      }
    }
  });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('src', new THREE.Float32BufferAttribute(src, 1));
  const bvh = new MeshBVH(geom);
  return { bvh, geom, names, mats };
}

const _ray = new THREE.Ray();
const _down = new THREE.Vector3(0, -1, 0);
const _tri = new THREE.Triangle();
const _nrm = new THREE.Vector3();

/** Every visual hit straight down through (x, z) between yTop and yBot: y, |normal.y|, source. */
function visualColumn(V: VisualIndex, x: number, z: number, yTop: number, yBot: number) {
  _ray.origin.set(x, yTop, z); _ray.direction.copy(_down);
  const hits = V.bvh.raycast(_ray, THREE.DoubleSide, 0, yTop - yBot) as THREE.Intersection[];
  const srcA = V.geom.attributes.src as THREE.BufferAttribute;
  return hits.map((h) => ({ y: h.point.y, ny: Math.abs(h.face!.normal.y), src: srcA.getX(h.face!.a) }));
}

// ------------------------------------------------------------------------------------ collision columns

interface ColHit { y: number; ny: number; c: Collider }

/** Every collision hit straight down through (x, z), top first (raw face normals, any winding). */
function collisionColumn(W: CollisionWorld, x: number, z: number, yTop: number, yBot: number): ColHit[] {
  const out: ColHit[] = [];
  const o = new THREE.Vector3(), d = new THREE.Vector3(), p = new THREE.Vector3();
  for (const c of W.colliders) {
    if (!c.enabled) continue;
    const b = c.worldBox;
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.max.y < yBot || b.min.y > yTop) continue;
    _ray.origin.copy(o.set(x, yTop, z).applyMatrix4(c.inverse));
    _ray.direction.copy(d.set(0, -1, 0).transformDirection(c.inverse));
    const hits = c.bvh.raycast(_ray, THREE.DoubleSide) as THREE.Intersection[];
    for (const h of hits) {
      p.copy(h.point).applyMatrix4(c.matrix);
      if (p.y < yBot || p.y > yTop) continue;
      const ny = Math.abs(_nrm.copy(h.face!.normal).transformDirection(c.matrix).y);
      out.push({ y: p.y, ny, c });
    }
  }
  out.sort((a, b) => b.y - a.y);
  return out;
}

// ------------------------------------------------------------------------------------ audit

export type IssueKind = 'floorGap' | 'noCollider' | 'invisible' | 'killPlane';
export interface Issue { kind: IssueKind; at: [number, number, number]; what: string; cells: number }
export interface AuditResult { region: string; reachable: number; issues: Issue[]; ms: number; bounds: THREE.Box3 }

const G = 0.5;         // grid (m)
const R = 0.35;        // audit capsule radius (player 0.36)
const H = 1.8;
const HEAD = 1.75;     // headroom needed above a floor
const STEP = 0.33;     // climbable ledge without a ramp
const RAMP = 0.75;     // max rise per cell on a continuous slope (≈ 56°)

interface Cell { x: number; z: number; floors: number[] }

export interface AuditOpts {
  /** Extra seeds (world points) for regions whose anchors don't cover everything. */
  seeds?: THREE.Vector3[];
  maxCells?: number;
}

export function auditRegion(R0: BuiltRegion, opts: AuditOpts = {}): AuditResult {
  const t0 = Date.now();
  const issues = new Map<string, Issue>();
  const bounds = new THREE.Box3();
  let reachableTotal = 0;
  for (const state of [0, 1]) {
    setPieces(R0, state);
    const V = buildVisualIndex(R0.scene);
    const { reach, cells } = floodFill(R0, opts, state);
    reachableTotal = Math.max(reachableTotal, reach.length);
    for (const n of reach) bounds.expandByPoint(new THREE.Vector3(n.x, n.y, n.z));
    checkCells(R0, V, reach, cells, issues);
  }
  setPieces(R0, 0);
  const list = [...issues.values()].sort((a, b) => b.cells - a.cells);
  return { region: R0.id, reachable: reachableTotal, issues: list, ms: Date.now() - t0, bounds };
}

interface Node { ix: number; iz: number; x: number; z: number; y: number; drops: [number, number, string][]; parent: Node | null }

export function floodFill(R0: BuiltRegion, opts: AuditOpts, _state: number) {
  const W = R0.world;
  const cells = new Map<string, Cell>();
  const fitCache = new Map<string, boolean>();
  const probe = new THREE.Vector3();
  const column = (ix: number, iz: number): Cell => {
    const key = ix + ',' + iz;
    let c = cells.get(key);
    if (c) return c;
    const x = ix * G, z = iz * G;
    const hits = collisionColumn(W, x, z, 400, -400);
    const floors: number[] = [];
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      if (h.ny < 0.5) continue;
      // headroom: nothing collides within HEAD above this surface
      let ok = true;
      for (let j = i - 1; j >= 0; j--) { const d = hits[j].y - h.y; if (d > 0.02 && d < HEAD) { ok = false; break; } if (d >= HEAD) break; }
      if (ok && (floors.length === 0 || Math.abs(floors[floors.length - 1] - h.y) > 0.05)) floors.push(h.y);
    }
    c = { x, z, floors };
    cells.set(key, c);
    return c;
  };
  const fits = (x: number, y: number, z: number) => {
    const key = `${x},${z},${y.toFixed(2)}`;
    let f = fitCache.get(key);
    if (f !== undefined) return f;
    probe.set(x, y + 0.02, z);
    W.resolveCapsule(probe, R, H);
    f = Math.hypot(probe.x - x, probe.z - z) < 0.08 && Math.abs(probe.y - y) < 0.3;
    fitCache.set(key, f);
    return f;
  };
  /** Highest collision surface at (x,z) at or below `yMax` (any collider, standable or not). */
  const surfaceBelow = (x: number, z: number, yMax: number) => {
    const hits = collisionColumn(W, x, z, yMax, yMax - 200);
    for (const h of hits) if (h.ny >= 0.5) return h.y;
    return -Infinity;
  };
  const blocked = (x0: number, z0: number, x1: number, z1: number, y: number) => {
    const d = new THREE.Vector3(x1 - x0, 0, z1 - z0); const len = d.length(); d.divideScalar(len);
    for (const hy of [0.5, 1.0, 1.5]) if (W.raycast(new THREE.Vector3(x0, y + hy, z0), d, len)) return true;
    return false;
  };
  const nodes = new Map<string, Node>();
  const queue: Node[] = [];
  const visit = (ix: number, iz: number, y: number, parent: Node | null = null) => {
    const key = `${ix},${iz},${Math.round(y * 10)}`;
    if (nodes.has(key)) return;
    const n: Node = { ix, iz, x: ix * G, z: iz * G, y, drops: [], parent };
    nodes.set(key, n);
    queue.push(n);
  };
  for (const s of [...R0.seeds, ...(opts.seeds ?? [])]) {
    const ix = Math.round(s.x / G), iz = Math.round(s.z / G);
    // the seed's own column, else a neighbour (anchors often stand beside a wall)
    let done = false;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = column(ix + dx, iz + dz);
      const f = c.floors.find((y) => Math.abs(y - s.y) < 1.2);
      if (f !== undefined && fits(c.x, f, c.z)) { visit(ix + dx, iz + dz, f); done = true; break; }
    }
    void done;
  }
  const max = opts.maxCells ?? 400000;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length && nodes.size < max) {
    const n = queue.pop()!;
    for (const [dx, dz] of DIRS) {
      const c = column(n.ix + dx, n.iz + dz);
      // where the capsule ends up stepping into that column: the highest surface it can climb to
      const top = surfaceBelow(c.x, c.z, n.y + RAMP + 0.01);
      if (top === -Infinity) { n.drops.push([c.x, c.z, 'void']); continue; }
      const rise = top - n.y;
      if (rise > STEP) {
        // only a continuous slope climbs more than a step
        const mid = surfaceBelow(n.x + dx * G / 2, n.z + dz * G / 2, n.y + RAMP);
        if (!(Math.abs(mid - (n.y + top) / 2) < 0.12)) continue;
      }
      if (blocked(n.x, n.z, c.x, c.z, Math.max(n.y, top))) continue;
      if (rise < -0.45) n.drops.push([c.x, c.z, 'drop']);
      const f = c.floors.find((y) => Math.abs(y - top) < 0.06);
      if (f === undefined || !fits(c.x, f, c.z)) continue;
      visit(n.ix + dx, n.iz + dz, f, n);
    }
  }
  return { reach: [...nodes.values()], cells };
}

const JITTER = [[0.07, 0.03], [0.17, -0.13], [-0.14, 0.16], [-0.11, -0.17], [0.16, 0.12]];
const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();

function checkCells(R0: BuiltRegion, V: VisualIndex, reach: Node[], _cells: Map<string, Cell>, issues: Map<string, Issue>) {
  const srcA = V.geom.attributes.src as THREE.BufferAttribute;
  const idx = V.geom.index!;
  const add = (kind: IssueKind, x: number, y: number, z: number, what: string) => {
    const key = `${kind}|${what}|${Math.round(x / 3)},${Math.round(y / 3)},${Math.round(z / 3)}`;
    const i = issues.get(key);
    if (i) i.cells++;
    else issues.set(key, { kind, at: [+x.toFixed(1), +y.toFixed(2), +z.toFixed(1)], what, cells: 1 });
  };
  const hardFloor = -29.5;
  for (const n of reach) {
    if (n.y < R0.killY + 0.5 || n.y < hardFloor) add('killPlane', n.x, n.y, n.z, `floor at ${n.y.toFixed(1)} (killY ${R0.killY})`);
    // ---- solid-looking geometry inside the standing capsule (waist height and up)
    _seg.start.set(n.x, n.y + 0.62, n.z); _seg.end.set(n.x, n.y + 1.5, n.z);
    _box.makeEmpty().expandByPoint(_seg.start).expandByPoint(_seg.end); _box.min.addScalar(-0.1); _box.max.addScalar(0.1);
    let hitSrc = -1;
    V.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(_box),
      intersectsTriangle: (tri: ExtendedTriangle, ti: number) => {
        const s = srcA.getX(idx.getX(ti * 3));
        if (SOFT.test(V.mats[s])) return false;
        if (tri.closestPointToSegment(_seg, _p1, _p2) < 0.1) { hitSrc = s; return true; }
        return false;
      },
    });
    if (hitSrc >= 0) add('noCollider', n.x, n.y, n.z, `${V.names[hitSrc]}`);
    // ---- nothing drawn under the feet
    // (five jittered rays: plank gaps and pie-slice seams line up with a regular grid)
    let drawn = false;
    for (const [ox, oz] of JITTER) {
      if (visualColumn(V, n.x + ox, n.z + oz, n.y + 0.3, n.y - 0.7).some((h) => !NOT_FLOOR.test(V.mats[h.src]))) { drawn = true; break; }
    }
    if (!drawn) add('invisible', n.x, n.y, n.z, 'collider floor with nothing drawn');
    // ---- collision drops away where the drawn floor carries on
    for (const [x, z, why] of n.drops) {
      let hits = 0, src = -1;
      for (const [ox, oz] of JITTER) {
        const v = visualColumn(V, x + ox, z + oz, n.y + 0.2, n.y - 0.25).find((h) => h.ny > 0.7 && !NOT_FLOOR.test(V.mats[h.src]));
        if (v) { hits++; src = v.src; }
      }
      if (hits >= 4) add('floorGap', x, n.y, z, `${V.names[src]} (${why})`);
    }
  }
}

// ------------------------------------------------------------------------------------ stress walk

class Dummy extends Actor { readonly team: Team = 'player'; }

export interface StressFailure { what: string; start: [number, number, number]; at: [number, number, number] }

/**
 * Drives a real Actor through the physics step at `samples` reachable cells: walks, sprints, rolls,
 * lunges and knock-back in 8 directions, then drops from 3, 12 and 40 m. Fails when a sphere centre
 * crosses a collider triangle between two steps, or a drop does not end on the floor below it.
 */
export function stressWalk(R0: BuiltRegion, cells: { x: number; y: number; z: number }[], samples = 120, seed = 7): { runs: number; failures: StressFailure[] } {
  const W = R0.world;
  const a = new Dummy();
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const failures: StressFailure[] = [];
  const pick = cells.length <= samples ? cells : Array.from({ length: samples }, () => cells[Math.floor(rnd() * cells.length)]);
  const lunge = { id: 'audit_lunge', clip: '', dur: 0.4, motion: [[0.05, 0], [0.3, 5.8], [0.4, 6]] } as unknown as MoveDef;
  const roll = { id: 'audit_roll', clip: '', dur: 0.72, motion: [[0.5, 3.1], [0.72, 3.25]] } as unknown as MoveDef;
  const dir = new THREE.Vector3(), prevB = new THREE.Vector3(), prevT = new THREE.Vector3(), nb = new THREE.Vector3(), nt = new THREE.Vector3();
  const crossed = (from: THREE.Vector3, to: THREE.Vector3) => {
    dir.copy(to).sub(from);
    const len = dir.length();
    if (len < 1e-6) return false;
    return !!W.raycast(from, dir.divideScalar(len), len);
  };
  let runs = 0;
  const f3 = (v: THREE.Vector3): [number, number, number] => [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
  const stepAndCheck = (label: string, start: THREE.Vector3): boolean => {
    prevB.set(a.pos.x, a.pos.y + a.radius, a.pos.z); prevT.set(a.pos.x, a.pos.y + a.height - a.radius, a.pos.z);
    a.stepPhysics(1 / 60, W, null, null);
    nb.set(a.pos.x, a.pos.y + a.radius, a.pos.z); nt.set(a.pos.x, a.pos.y + a.height - a.radius, a.pos.z);
    if (crossed(prevB, nb) || crossed(prevT, nt)) { failures.push({ what: label + ': tunnelled through a collider', start: f3(start), at: f3(a.pos) }); return false; }
    return true;
  };
  for (const c of pick) {
    const start = new THREE.Vector3(c.x, c.y, c.z);
    for (let k = 0; k < 8; k++) {
      const yaw = (k / 8) * Math.PI * 2 + rnd() * 0.5;
      for (const mode of ['walk', 'sprint', 'roll', 'lunge', 'knock'] as const) {
        runs++;
        a.teleport(start, yaw);
        a.grounded = true; a.move = null;
        const f = a.forward;
        let ok = true;
        const steps = mode === 'walk' || mode === 'sprint' ? 60 : 45;
        if (mode === 'roll') a.startMove(roll);
        if (mode === 'lunge') a.startMove(lunge);
        if (mode === 'knock') a.knock.copy(f).multiplyScalar(14);
        for (let i = 0; i < steps && ok; i++) {
          if (mode === 'walk') a.wish.copy(f).multiplyScalar(4.2);
          else if (mode === 'sprint') a.wish.copy(f).multiplyScalar(6.6);
          else a.wish.set(0, 0, 0);
          ok = stepAndCheck(mode, start);
          if (a.pos.y < R0.killY) break;
        }
        a.move = null;
      }
    }
    // drops from height onto this cell (only where the column above is open)
    for (const hgt of [3, 12, 40]) {
      const above = W.raycast(new THREE.Vector3(c.x, c.y + 0.3, c.z), new THREE.Vector3(0, 1, 0), hgt + 2);
      if (above) continue;
      runs++;
      const top = new THREE.Vector3(c.x, c.y + hgt, c.z);
      a.teleport(top, 0);
      a.grounded = false; a.move = null; a.wish.set(0, 0, 0);
      let ok = true;
      for (let i = 0; i < 240 && ok; i++) { ok = stepAndCheck(`drop ${hgt} m`, start); if (a.grounded && i > 5 && Math.abs(a.vy) < 3) break; }
      if (ok && a.pos.y < c.y - 0.3) failures.push({ what: `drop ${hgt} m: ended below the floor it fell onto (${a.pos.y.toFixed(2)} < ${c.y.toFixed(2)})`, start: f3(start), at: f3(a.pos) });
    }
  }
  return { runs, failures };
}

export function formatIssues(r: AuditResult, limit = 40): string {
  const lines = [`${r.region}: ${r.reachable} reachable cells, ${r.issues.length} issue clusters (${(r.ms / 1000).toFixed(1)} s)`];
  for (const i of r.issues.slice(0, limit)) lines.push(`  ${i.kind.padEnd(10)} ${String(i.cells).padStart(4)} cells at (${i.at.join(', ')})  ${i.what}`);
  return lines.join('\n');
}
