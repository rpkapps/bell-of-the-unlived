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
  constructor(public id: string, public geometry: THREE.BufferGeometry) {}
  setMatrix(m: THREE.Matrix4) { this.matrix.copy(m); this.inverse.copy(m).invert(); }
  /** Convenience for dynamic colliders driven by a scene object. */
  syncTo(obj: THREE.Object3D) { obj.updateWorldMatrix(true, false); this.setMatrix(obj.matrixWorld); }
}

export interface MoveResult { grounded: boolean; groundNormal: THREE.Vector3; hitWall: boolean; wallNormal: THREE.Vector3; surface: Surface }

const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triP = new THREE.Vector3();
const _capP = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _ray = new THREE.Ray();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

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
   * modifying `pos` in place. Call after integrating velocity.
   */
  resolveCapsule(pos: THREE.Vector3, r: number, h: number, out?: MoveResult): MoveResult {
    const res: MoveResult = out ?? { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), hitWall: false, wallNormal: new THREE.Vector3(), surface: 'stone' };
    res.grounded = false; res.hitWall = false; res.groundNormal.set(0, 1, 0); res.wallNormal.set(0, 0, 0);
    const start = _a.set(pos.x, pos.y + r, pos.z);
    const end = _b.set(pos.x, pos.y + h - r, pos.z);
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.colliders) {
        if (!c.enabled) continue;
        _seg.start.copy(start).applyMatrix4(c.inverse);
        _seg.end.copy(end).applyMatrix4(c.inverse);
        _box.makeEmpty().expandByPoint(_seg.start).expandByPoint(_seg.end);
        _box.min.addScalar(-r); _box.max.addScalar(r);
        const before = _seg.start.clone();
        c.bvh.shapecast({
          intersectsBounds: (box) => box.intersectsBox(_box),
          intersectsTriangle: (tri: ExtendedTriangle) => {
            const dist = tri.closestPointToSegment(_seg, _triP, _capP);
            if (dist < r) {
              const depth = r - dist;
              _dir.copy(_capP).sub(_triP);
              if (_dir.lengthSq() < 1e-10) tri.getNormal(_dir); else _dir.normalize();
              _seg.start.addScaledVector(_dir, depth);
              _seg.end.addScaledVector(_dir, depth);
            }
            return false;
          },
        });
        const delta = _seg.start.clone().sub(before);
        if (delta.lengthSq() > 1e-12) {
          moved = true;
          // back to world space
          _seg.start.applyMatrix4(c.matrix);
          _seg.end.applyMatrix4(c.matrix);
          const wd = _seg.start.clone().sub(start);
          const len = wd.length();
          const n = wd.clone().divideScalar(len || 1);
          if (n.y > 0.55) {
            // Walkable: convert the push into a pure vertical lift so we don't slide down slopes.
            res.grounded = true;
            res.groundNormal.copy(n);
            res.surface = c.surface;
            const lift = len / Math.max(n.y, 0.55);
            start.y += Math.min(lift, len * 2); end.y = start.y + (h - 2 * r);
            if (n.y < 0.999) { start.y = start.y; }
          } else {
            if (n.y < -0.5) { /* ceiling */ }
            else { res.hitWall = true; res.wallNormal.copy(n).setY(0).normalize(); }
            start.copy(_seg.start); end.copy(_seg.end);
          }
        }
      }
      if (!moved) break;
    }
    pos.set(start.x, start.y - r, start.z);
    return res;
  }
}
