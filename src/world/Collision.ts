/**
 * CONTRACT + IMPLEMENTATION — static and dynamic world collision.
 *
 * Level code adds coarse collider shapes (boxes, ramps, arbitrary geometry). Visual meshes are
 * separate and never collide. After `build()` the static set is baked into a BVH. Dynamic
 * colliders (drawbridge, hatch, doors, fog gates) are individual BVH meshes whose transform and
 * enabled state can change at runtime.
 */
import * as THREE from 'three';
import { MeshBVH, ExtendedTriangle } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3Like = { x: number; y: number; z: number } | [number, number, number];
const toV = (v: Vec3Like, out = new THREE.Vector3()) =>
  Array.isArray(v) ? out.set(v[0], v[1], v[2]) : out.set(v.x, v.y, v.z);

export interface RayHit { point: THREE.Vector3; normal: THREE.Vector3; distance: number; collider: Collider }

/** Surface tags let footsteps and impacts choose sounds. */
export type Surface = 'stone' | 'wood' | 'dirt' | 'metal' | 'water';

export class Collider {
  bvh!: MeshBVH;
  matrix = new THREE.Matrix4();
  inverse = new THREE.Matrix4();
  enabled = true;
  surface: Surface = 'stone';
  /** World-space bounds (kept in sync by `setMatrix`); used to skip far colliders cheaply. */
  readonly worldBox = new THREE.Box3();
  constructor(public id: string, public geometry: THREE.BufferGeometry) {
    geometry.computeBoundingBox();
    this.worldBox.copy(geometry.boundingBox!);
  }
  setMatrix(m: THREE.Matrix4) {
    this.matrix.copy(m); this.inverse.copy(m).invert();
    this.worldBox.copy(this.geometry.boundingBox!).applyMatrix4(m);
  }
  /** Convenience for dynamic colliders driven by a scene object. */
  syncTo(obj: THREE.Object3D) { obj.updateWorldMatrix(true, false); this.setMatrix(obj.matrixWorld); }
}

export interface MoveResult { grounded: boolean; groundNormal: THREE.Vector3; hitWall: boolean; wallNormal: THREE.Vector3; surface: Surface }

/** Contacts whose push direction is at least this vertical are floors (≈ 56° slopes). */
const WALKABLE_NY = 0.55;
/** Highest ledge (above the feet) a capsule climbs without a ramp (kerbs, thresholds, low plinths). */
export const STEP_HEIGHT = 0.32;

const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _capBox = new THREE.Box3();
const _triP = new THREE.Vector3();
const _capP = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _wn = new THREE.Vector3();
const _up = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _ray = new THREE.Ray();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _sweepRes: MoveResult = { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), hitWall: false, wallNormal: new THREE.Vector3(), surface: 'stone' };

/**
 * Where the segment pierces the triangle's interior, or null. `n` receives the unit face normal
 * (winding as authored); returns the signed distances of the segment ends from the face plane.
 */
function segmentPierces(tri: ExtendedTriangle, seg: THREE.Line3, n: THREE.Vector3): [number, number] | null {
  tri.getNormal(n);
  if (n.lengthSq() < 0.5) return null; // degenerate
  const s0 = _t.copy(seg.start).sub(tri.a).dot(n);
  const s1 = _t.copy(seg.end).sub(tri.a).dot(n);
  if ((s0 > 0 && s1 > 0) || (s0 < 0 && s1 < 0) || s0 === s1) return null;
  _t.copy(seg.start).lerp(seg.end, s0 / (s0 - s1));
  return tri.containsPoint(_t) ? [s0, s1] : null;
}

const IDENTITY = new THREE.Matrix4();
const isIdentity = (m: THREE.Matrix4) => { const e = m.elements; return e[0] === 1 && e[5] === 1 && e[10] === 1 && e[12] === 0 && e[13] === 0 && e[14] === 0 && e[1] === 0 && e[2] === 0 && e[4] === 0 && e[6] === 0 && e[8] === 0 && e[9] === 0; };
const _lseg = new THREE.Line3();
const _pool: { tri: ExtendedTriangle; depth: number; surface: Surface }[] = [];
const _order: number[] = [];

/**
 * Push the capsule `seg` (world space) out of one triangle, if it still touches it. Floors lift it
 * straight up, low ledges are stepped onto, anything else pushes it out along the contact normal.
 */
function applyContact(tri: ExtendedTriangle, surface: Surface, seg: THREE.Line3, r: number, step: number, res: MoveResult): boolean {
  let depth: number, faceWalkable = false, contactH = Infinity;
  const pierce = segmentPierces(tri, seg, _n);
  if (pierce) {
    // oriented face normal toward the side holding most of the capsule
    let [s0, s1] = pierce;
    if (Math.abs(s1) > Math.abs(s0) ? s1 < 0 : s0 < 0) { _n.negate(); s0 = -s0; s1 = -s1; }
    _dir.copy(_n);
    depth = r - Math.min(s0, s1);
  } else {
    const dist = tri.closestPointToSegment(seg, _triP, _capP);
    if (dist >= r) return false;
    depth = r - dist;
    if (dist > 1e-9) _dir.copy(_capP).sub(_triP).divideScalar(dist);
    else { _dir.copy(_n); if (_dir.y < 0) _dir.negate(); }
    const fy = Math.abs(_n.y);
    faceWalkable = fy > WALKABLE_NY || fy < 0.2;
    contactH = _triP.y - seg.start.y + r; // contact height above the feet
  }
  const ny = _dir.y;
  if (ny > WALKABLE_NY) {
    // floor: pure vertical lift so the capsule does not slide down slopes
    seg.start.y += depth / ny; seg.end.y += depth / ny;
    res.grounded = true; res.surface = surface; res.groundNormal.copy(_dir);
  } else if (faceWalkable && contactH <= step && ny > -0.2) {
    // a low ledge edge: rise until the bottom sphere rests on it
    const dv = contactH - r;
    const dh2 = Math.max(0, _t.copy(seg.start).sub(_triP).lengthSq() - dv * dv);
    const lift = dv + Math.sqrt(Math.max(0, r * r - dh2));
    if (lift <= 1e-6) return false;
    seg.start.y += lift; seg.end.y += lift;
    res.grounded = true; res.surface = surface; res.groundNormal.set(0, 1, 0);
  } else {
    seg.start.addScaledVector(_dir, depth); seg.end.addScaledVector(_dir, depth);
    if (ny >= -0.5 && _dir.x * _dir.x + _dir.z * _dir.z > 1e-8) {
      res.hitWall = true; res.wallNormal.set(_dir.x, 0, _dir.z).normalize();
    }
  }
  return true;
}

export class CollisionWorld {
  private staticParts: THREE.BufferGeometry[] = [];
  private staticSurfaces: { geom: THREE.BufferGeometry; surface: Surface }[] = [];
  readonly colliders: Collider[] = [];
  private built = false;
  /** Debug mesh of all static colliders (hidden by default). */
  debugMesh: THREE.Object3D | null = null;

  // ------------------------------------------------------------------ building (static)

  /** Axis-aligned or rotated box. `rot` is Euler XYZ radians. */
  addBox(center: Vec3Like, size: Vec3Like, rot?: Vec3Like, surface: Surface = 'stone') {
    const s = toV(size);
    const g = new THREE.BoxGeometry(s.x, s.y, s.z);
    const r = rot ? toV(rot, _a) : _a.set(0, 0, 0);
    _m.compose(toV(center, _b), _q.setFromEuler(_e.set(r.x, r.y, r.z)), _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    this.pushStatic(g, surface);
  }

  /**
   * A walkable slab from `bottom` to `top` (both are points on the walking surface centre line),
   * `width` wide. Use for stairs (the visual steps sit on top) and ramps.
   */
  addRamp(bottom: Vec3Like, top: Vec3Like, width: number, thickness = 0.4, surface: Surface = 'stone') {
    const p0 = toV(bottom, new THREE.Vector3());
    const p1 = toV(top, new THREE.Vector3());
    const d = p1.clone().sub(p0);
    const len = d.length();
    const g = new THREE.BoxGeometry(width, thickness, len);
    g.translate(0, -thickness / 2, 0);
    const yaw = Math.atan2(d.x, d.z);
    const pitch = -Math.asin(d.y / len);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    _m.compose(mid, _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ')), _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    this.pushStatic(g, surface);
  }

  /** Arbitrary static triangles (e.g. terrain). Geometry is cloned and transformed. */
  addGeometry(geom: THREE.BufferGeometry, matrix?: THREE.Matrix4, surface: Surface = 'stone') {
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    if (matrix) g.applyMatrix4(matrix);
    this.pushStatic(g, surface);
  }

  private pushStatic(g: THREE.BufferGeometry, surface: Surface) {
    if (this.built) throw new Error('CollisionWorld: static geometry added after build()');
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (k !== 'position') ng.deleteAttribute(k);
    this.staticSurfaces.push({ geom: ng, surface });
  }

  // ------------------------------------------------------------------ dynamic

  /** Dynamic box collider; move it with `setMatrix`/`syncTo`, toggle with `enabled`. */
  addDynamicBox(id: string, size: Vec3Like, surface: Surface = 'wood'): Collider {
    const s = toV(size);
    const g = new THREE.BoxGeometry(s.x, s.y, s.z);
    return this.addDynamicGeometry(id, g, surface);
  }
  addDynamicGeometry(id: string, geom: THREE.BufferGeometry, surface: Surface = 'wood'): Collider {
    const c = new Collider(id, geom);
    c.bvh = new MeshBVH(geom);
    c.surface = surface;
    this.colliders.push(c);
    return c;
  }
  get(id: string) { return this.colliders.find((c) => c.id === id); }

  /** Bake static geometry. Call once after the level is built. */
  build() {
    // One BVH per surface type so queries can report the surface.
    const bySurface = new Map<Surface, THREE.BufferGeometry[]>();
    for (const p of this.staticSurfaces) {
      let arr = bySurface.get(p.surface);
      if (!arr) bySurface.set(p.surface, (arr = []));
      arr.push(p.geom);
    }
    const debugGroup = new THREE.Group();
    for (const [surface, geoms] of bySurface) {
      const merged = mergeGeometries(geoms, false);
      if (!merged) continue;
      const c = new Collider('static:' + surface, merged);
      c.surface = surface;
      c.bvh = new MeshBVH(merged);
      this.colliders.unshift(c);
      const dm = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: 0x33ff88, wireframe: true, transparent: true, opacity: 0.25 }));
      debugGroup.add(dm);
    }
    debugGroup.visible = false;
    this.debugMesh = debugGroup;
    this.staticSurfaces = [];
    this.staticParts = [];
    this.built = true;
  }

  // ------------------------------------------------------------------ queries

  /** Nearest hit along a ray (world space), or null. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, ignore?: Collider): RayHit | null {
    let best: RayHit | null = null;
    for (const c of this.colliders) {
      if (!c.enabled || c === ignore) continue;
      // cheap reject: the ray never reaches this collider's bounds within range
      if (!c.worldBox.containsPoint(origin)) {
        _ray.origin.copy(origin); _ray.direction.copy(dir);
        if (!_ray.intersectBox(c.worldBox, _t)) continue;
        const bd = _t.distanceTo(origin);
        if (bd > maxDist || (best && bd >= best.distance)) continue;
      }
      _ray.origin.copy(origin).applyMatrix4(c.inverse);
      _ray.direction.copy(dir).transformDirection(c.inverse);
      const hit = c.bvh.raycastFirst(_ray, THREE.DoubleSide);
      if (!hit) continue;
      const wp = hit.point.clone().applyMatrix4(c.matrix);
      const dist = wp.distanceTo(origin);
      if (dist > maxDist || (best && dist >= best.distance)) continue;
      const n = hit.face ? hit.face.normal.clone().transformDirection(c.matrix) : new THREE.Vector3(0, 1, 0);
      if (n.dot(dir) > 0) n.negate();
      best = { point: wp, normal: n, distance: dist, collider: c };
    }
    return best;
  }

  /** True if the straight segment a→b is unobstructed. */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    _dir.copy(b).sub(a);
    const len = _dir.length();
    if (len < 1e-4) return true;
    _dir.divideScalar(len);
    return !this.raycast(a, _dir, len - 0.05);
  }

  /** Ground height below a point (searching down `maxDown`), or null. */
  groundAt(x: number, y: number, z: number, maxDown = 50): { y: number; normal: THREE.Vector3; surface: Surface } | null {
    const hit = this.raycast(new THREE.Vector3(x, y, z), new THREE.Vector3(0, -1, 0), maxDown);
    return hit ? { y: hit.point.y, normal: hit.normal, surface: hit.collider.surface } : null;
  }

  /**
   * Resolve a vertical capsule (feet at `pos`, radius r, total height h) against the world,
   * modifying `pos` in place. Call after integrating velocity; moves longer than ~r/2 per call must
   * go through `sweepCapsule` (a single resolve can only undo penetrations shallower than r).
   *
   * Every touching triangle is handled on its own:
   *  - floors (push direction ≥ ~56° up) lift the capsule straight up (no sliding down slopes);
   *  - a ledge below STEP_HEIGHT above the feet (kerb, plinth, stair nosing) is stepped onto;
   *  - anything else pushes the capsule out along the contact normal (walls, ceilings).
   * A triangle that pierces the capsule's axis (a thin floor the feet sank through, a slab the
   * capsule was placed into) pushes out along its face normal toward the side holding most of the
   * capsule, so the capsule is never shoved through to the far side.
   */
  resolveCapsule(pos: THREE.Vector3, r: number, h: number, out?: MoveResult): MoveResult {
    const res: MoveResult = out ?? { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), hitWall: false, wallNormal: new THREE.Vector3(), surface: 'stone' };
    res.grounded = false; res.hitWall = false; res.groundNormal.set(0, 1, 0); res.wallNormal.set(0, 0, 0);
    const seg = _seg;
    seg.start.set(pos.x, pos.y + r, pos.z);
    seg.end.set(pos.x, pos.y + h - r, pos.z);
    const step = Math.min(STEP_HEIGHT, r * 0.85);
    for (let iter = 0; iter < 6; iter++) {
      // 1. gather every triangle touching the capsule (world space), from every collider
      const n = this.gatherContacts(seg, r);
      if (!n) break;
      // 2. resolve the deepest first, re-testing the rest against the moved capsule: a shallow
      //    edge contact that the deep face contact already cures is then skipped instead of
      //    shoving the capsule sideways (which pins it against box corners)
      _order.length = 0;
      for (let i = 0; i < n; i++) _order.push(i);
      _order.sort((a, b) => _pool[b].depth - _pool[a].depth);
      let moved = false;
      for (const i of _order) if (applyContact(_pool[i].tri, _pool[i].surface, seg, r, step, res)) moved = true;
      if (!moved) break;
    }
    pos.set(seg.start.x, seg.start.y - r, seg.start.z);
    return res;
  }

  /** Copies every triangle within r of the capsule axis (or piercing it) into `_pool`, in world space. */
  private gatherContacts(seg: THREE.Line3, r: number): number {
    let n = 0;
    _capBox.makeEmpty().expandByPoint(seg.start).expandByPoint(seg.end);
    _capBox.min.addScalar(-r); _capBox.max.addScalar(r);
    for (const c of this.colliders) {
      if (!c.enabled || !_capBox.intersectsBox(c.worldBox)) continue;
      const ident = c.matrix === IDENTITY || isIdentity(c.matrix);
      _lseg.start.copy(seg.start); _lseg.end.copy(seg.end);
      if (!ident) { _lseg.start.applyMatrix4(c.inverse); _lseg.end.applyMatrix4(c.inverse); }
      _box.makeEmpty().expandByPoint(_lseg.start).expandByPoint(_lseg.end);
      _box.min.addScalar(-r); _box.max.addScalar(r);
      c.bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(_box),
        intersectsTriangle: (tri: ExtendedTriangle) => {
          let depth: number;
          const pierce = segmentPierces(tri, _lseg, _n);
          if (pierce) depth = r + Math.min(Math.abs(pierce[0]), Math.abs(pierce[1]));
          else {
            const dist = tri.closestPointToSegment(_lseg, _triP, _capP);
            if (dist >= r) return false;
            depth = r - dist;
          }
          if (n >= _pool.length) _pool.push({ tri: new ExtendedTriangle(), depth: 0, surface: 'stone' });
          const e = _pool[n++];
          e.tri.a.copy(tri.a); e.tri.b.copy(tri.b); e.tri.c.copy(tri.c);
          if (!ident) { e.tri.a.applyMatrix4(c.matrix); e.tri.b.applyMatrix4(c.matrix); e.tri.c.applyMatrix4(c.matrix); }
          e.tri.needsUpdate = true;
          e.depth = depth; e.surface = c.surface;
          return false;
        },
      });
    }
    return n;
  }

  /**
   * Move a capsule by `delta` and resolve it, in sub-steps short enough (≤ r/2) that no single
   * resolve can start deeper than half a radius inside anything: fast falls, lunges, knock-back and
   * shoves can never tunnel through floors or thin walls. `pos` is updated in place. The result
   * describes the final sub-step (plus any wall touched on the way).
   */
  sweepCapsule(pos: THREE.Vector3, delta: THREE.Vector3, r: number, h: number, out?: MoveResult): MoveResult {
    const res: MoveResult = out ?? { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), hitWall: false, wallNormal: new THREE.Vector3(), surface: 'stone' };
    const len = delta.length();
    const n = Math.max(1, Math.ceil(len / Math.max(0.02, r * 0.5)));
    const dx = delta.x / n, dy = delta.y / n, dz = delta.z / n;
    let wall = false;
    const wallN = _s.set(0, 0, 0);
    for (let i = 0; i < n; i++) {
      pos.x += dx; pos.y += dy; pos.z += dz;
      this.resolveCapsule(pos, r, h, res);
      if (res.hitWall) { wall = true; wallN.copy(res.wallNormal); }
    }
    res.hitWall = wall; if (wall) res.wallNormal.copy(wallN);
    return res;
  }
}
