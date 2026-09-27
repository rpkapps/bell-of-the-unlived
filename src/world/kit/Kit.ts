/**
 * Kit — the procedural level-building context.
 *
 * A Kit collects visual geometry per material into buckets and merges each bucket into ONE mesh
 * on `finish()` (few draw calls per area). It keeps a transform stack so builders can work in a
 * local frame (`push(x, y, z, yaw)`), and mirrors the same transforms onto coarse colliders in the
 * shared CollisionWorld. Repeated small props go through the shared `Instancer` (one
 * InstancedMesh per prop type for the whole level). Lights and per-frame updaters are registered
 * on the shared object so the level can budget and animate them.
 *
 * Conventions: X east, Y up, Z south; yaw 0 faces +Z; a builder's local "front" is +Z.
 */
import * as THREE from 'three';
import type { CollisionWorld, Surface } from '../Collision';
import type { MaterialId } from '../../render/materialIds';
import { getMaterial, getMaterialVariant } from '../../render/materials';
import type { Quality } from '../../game/settings';
import { Rng } from '../../core/rng';
import { normalizeGeometry } from './geom';

export interface DrawOpts {
  /** Casts shadows (default true — pass false for small props). */
  cast?: boolean;
  /** Receives shadows (default true). */
  receive?: boolean;
  /** 'world' (default) re-projects box UVs in world metres; 'keep' preserves authored UVs. */
  uv?: 'world' | 'keep';
  /** Material variant index (getMaterialVariant) for visual variety. */
  variant?: number;
}

export interface BoxOpts extends DrawOpts {
  rx?: number; ry?: number; rz?: number;
  /** Also add a matching collider (true = 'stone'). */
  col?: Surface | boolean;
  /** Collider only, no visual. */
  noVis?: boolean;
}

/** Local placement for a geometry (Euler order YXZ: yaw, then pitch, then roll). */
export interface Xform { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number | [number, number, number] }

export type Updater = (dt: number, time: number, camera: THREE.Camera) => void;

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

export function xformMatrix(t: Xform, out = new THREE.Matrix4()): THREE.Matrix4 {
  _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0, 'YXZ');
  _q.setFromEuler(_e);
  const s = t.s ?? 1;
  if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
  return out.compose(_p.set(t.x ?? 0, t.y ?? 0, t.z ?? 0), _q, _s);
}

// ------------------------------------------------------------------------------------ instancer

interface InstBucket { make: () => THREE.BufferGeometry; mat: MaterialId | THREE.Material; mats: THREE.Matrix4[]; cast: boolean; receive: boolean }

/** Collects instance transforms for repeated props across the whole level. */
export class Instancer {
  private buckets = new Map<string, InstBucket>();
  add(key: string, make: () => THREE.BufferGeometry, mat: MaterialId | THREE.Material, m: THREE.Matrix4, cast = false, receive = true) {
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { make, mat, mats: [], cast, receive }));
    b.mats.push(m.clone());
  }
  /** Build one InstancedMesh per key. Returns the created meshes (keyed). */
  build(parent: THREE.Object3D): Map<string, THREE.InstancedMesh> {
    const out = new Map<string, THREE.InstancedMesh>();
    for (const [key, b] of this.buckets) {
      if (!b.mats.length) continue;
      const mat = typeof b.mat === 'string' ? getMaterial(b.mat) : b.mat;
      const im = new THREE.InstancedMesh(b.make(), mat, b.mats.length);
      b.mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = b.cast;
      im.receiveShadow = b.receive;
      im.name = 'inst:' + key;
      im.computeBoundingSphere();
      im.computeBoundingBox();
      parent.add(im);
      out.set(key, im);
    }
    this.buckets.clear();
    return out;
  }
}

// ------------------------------------------------------------------------------------ shared

export interface KitShared {
  quality: Quality;
  /** 0.5 (low) … 1 (ultra): scales optional detail (backdrop density, crowd sizes). */
  detail: number;
  collision: CollisionWorld | null;
  instances: Instancer;
  lights: THREE.PointLight[];
  updaters: Updater[];
}

export function createKitShared(quality: Quality, collision: CollisionWorld | null): KitShared {
  const detail = quality === 'low' ? 0.5 : quality === 'medium' ? 0.75 : quality === 'high' ? 0.9 : 1;
  return { quality, detail, collision, instances: new Instancer(), lights: [], updaters: [] };
}

// ------------------------------------------------------------------------------------ kit

interface Bucket { mat: MaterialId; variant?: number; cast: boolean; receive: boolean; geoms: THREE.BufferGeometry[] }

export class Kit {
  /** Holds the merged meshes and any extra objects (lights, dynamic pieces) the builder adds. */
  readonly group = new THREE.Group();
  readonly rng: Rng;
  private buckets = new Map<string, Bucket>();
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  /** Triangle count of merged geometry (for budgeting/debug). */
  triangles = 0;

  constructor(public readonly name: string, public readonly shared: KitShared, seed = 1) {
    this.rng = new Rng(seed);
    this.group.name = 'kit:' + name;
  }

  get col(): CollisionWorld | null { return this.shared.collision; }
  /** Current local→world matrix. */
  get m(): THREE.Matrix4 { return this.stack[this.stack.length - 1]; }

  // ---------------------------------------------------------------- transform stack
  push(x = 0, y = 0, z = 0, yaw = 0): this {
    const l = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
    this.stack.push(this.m.clone().multiply(l));
    return this;
  }
  pushMatrix(local: THREE.Matrix4): this { this.stack.push(this.m.clone().multiply(local)); return this; }
  pop(): this { if (this.stack.length > 1) this.stack.pop(); return this; }
  /** Run `fn` in a local frame. */
  at<T>(x: number, y: number, z: number, yaw: number, fn: () => T): T {
    this.push(x, y, z, yaw);
    try { return fn(); } finally { this.pop(); }
  }
  /** Local point → world. */
  wp(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 { return out.set(x, y, z).applyMatrix4(this.m); }
  /** Local yaw → world yaw (assumes the stack only contains yaw rotations). */
  wyaw(yaw: number): number {
    const d = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).transformDirection(this.m);
    return Math.atan2(d.x, d.z);
  }

  // ---------------------------------------------------------------- visuals
  /** Add a geometry (consumed) at an optional local transform. */
  add(mat: MaterialId, g: THREE.BufferGeometry, t?: Xform | THREE.Matrix4, o: DrawOpts = {}): this {
    const local = t ? (t instanceof THREE.Matrix4 ? t : xformMatrix(t)) : null;
    const world = local ? this.m.clone().multiply(local) : this.m;
    const n = normalizeGeometry(g);
    n.applyMatrix4(world);
    if ((o.uv ?? 'world') === 'world') worldUV(n);
    const cast = o.cast ?? true, receive = o.receive ?? true;
    const key = `${mat}|${o.variant ?? ''}|${cast ? 1 : 0}${receive ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { mat, variant: o.variant, cast, receive, geoms: [] }));
    b.geoms.push(n);
    return this;
  }

  /** Box centred at (cx,cy,cz) with size (sx,sy,sz), optional rotation and collider. */
  box(mat: MaterialId, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, o: BoxOpts = {}): this {
    if (!o.noVis) this.add(mat, new THREE.BoxGeometry(sx, sy, sz), { x: cx, y: cy, z: cz, rx: o.rx, ry: o.ry, rz: o.rz }, o);
    if (o.col) this.solidC(cx, cy, cz, sx, sy, sz, [o.rx ?? 0, o.ry ?? 0, o.rz ?? 0], o.col === true ? 'stone' : o.col);
    return this;
  }
  /** Axis-aligned (in the local frame) box between two corners. */
  bmm(mat: MaterialId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, o: BoxOpts = {}): this {
    return this.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), o);
  }

  // ---------------------------------------------------------------- colliders
  /** Collider box between local corners. */
  solid(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, surface: Surface = 'stone'): this {
    return this.solidC((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), undefined, surface);
  }
  /** Collider box by centre/size with local Euler rotation (YXZ). */
  solidC(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rot?: [number, number, number], surface: Surface = 'stone'): this {
    const col = this.col;
    if (!col) return this;
    const local = xformMatrix({ x: cx, y: cy, z: cz, rx: rot?.[0], ry: rot?.[1], rz: rot?.[2] });
    const world = this.m.clone().multiply(local);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    world.decompose(p, q, s);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    col.addBox(p, [sx * s.x, sy * s.y, sz * s.z], [e.x, e.y, e.z], surface);
    return this;
  }
  /** Walkable ramp collider between two local surface points (stairs: visual steps + this). */
  ramp(bottom: [number, number, number], top: [number, number, number], width: number, thickness = 0.4, surface: Surface = 'stone'): this {
    const col = this.col;
    if (!col) return this;
    col.addRamp(this.wp(...bottom), this.wp(...top), width, thickness, surface);
    return this;
  }
  /** Arbitrary collider geometry in the local frame. */
  colGeo(g: THREE.BufferGeometry, t?: Xform, surface: Surface = 'stone'): this {
    const col = this.col;
    if (!col) return this;
    const world = t ? this.m.clone().multiply(xformMatrix(t)) : this.m.clone();
    col.addGeometry(g, world, surface);
    return this;
  }

  // ---------------------------------------------------------------- instancing, lights, updates
  /** Instance of a shared prop geometry at a local transform. */
  inst(key: string, make: () => THREE.BufferGeometry, mat: MaterialId | THREE.Material, t: Xform, cast = false): this {
    this.shared.instances.add(key, make, mat, this.m.clone().multiply(xformMatrix(t)), cast);
    return this;
  }

  /**
   * Warm point light at a local point. `flicker` (0..1) adds a torch/candle flicker.
   * Lights are budgeted by the level (shared.lights); they never cast shadows.
   */
  light(color: THREE.ColorRepresentation, intensity: number, distance: number, x: number, y: number, z: number, flicker = 0): THREE.PointLight {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.castShadow = false;
    l.position.copy(this.wp(x, y, z));
    l.name = `${this.name}:light${this.shared.lights.length}`;
    this.group.add(l);
    this.shared.lights.push(l);
    if (flicker > 0) {
      const base = intensity, ph = this.shared.lights.length * 1.7;
      this.shared.updaters.push((_dt, t) => {
        const n = Math.sin(t * 7.3 + ph) * 0.5 + Math.sin(t * 13.1 + ph * 2.1) * 0.3 + Math.sin(t * 23.7 + ph * 0.7) * 0.2;
        l.intensity = base * (1 + n * 0.22 * flicker);
      });
    }
    return l;
  }
  onUpdate(fn: Updater): this { this.shared.updaters.push(fn); return this; }

  // ---------------------------------------------------------------- finish
  /** Merge buckets into meshes, attach to `parent`, return the group. */
  finish(parent: THREE.Object3D): THREE.Group {
    for (const b of this.buckets.values()) {
      const merged = concat(b.geoms);
      if (!merged) continue;
      const mat = b.variant !== undefined ? getMaterialVariant(b.mat, b.variant) : getMaterial(b.mat);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}:${b.mat}${b.variant !== undefined ? '#' + b.variant : ''}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      this.triangles += merged.attributes.position.count / 3;
      this.group.add(mesh);
    }
    this.buckets.clear();
    parent.add(this.group);
    return this.group;
  }
}

/** Concatenate normalised non-indexed geometries (position/normal/uv). */
function concat(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!list.length) return null;
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/** Box-project UVs from world position by dominant normal axis (0.5 UV per metre). */
export function worldUV(g: THREE.BufferGeometry, scale = 0.5) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}

/** Reusable scratch matrix for callers. */
export const scratchMatrix = _m;
