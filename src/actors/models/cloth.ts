/**
 * Verlet cloth for cloaks, capes and loose tabard/robe panels.
 *
 * Space choice (documented per the module brief): particles are simulated in WORLD space, so the
 * cloth reacts to the character running, turning and rolling with real inertia. The render mesh is
 * nevertheless a child of `rig.root` (it is created, culled and removed together with the actor
 * and never needs to know the scene): each frame the world-space particles are converted into
 * rig.root-local coordinates with the inverse of `rig.root.matrixWorld` before upload.
 *
 * Per frame (`update(dt)`), after the rig pose and world matrices are current:
 *   1. pin targets (top row, bone-local anchor points) and colliders are read from bone matrices;
 *   2. fixed 120 Hz substeps with an accumulator (max 6 per frame); pins are interpolated between
 *      last frame's and this frame's positions across the substeps so fast motion does not jitter;
 *   3. each substep: verlet integrate (gravity, damping, wind gusts through the surface normal),
 *      then `iterations` passes of distance constraints (structural / shear / bend), long-range
 *      tethers to the pinned row, and sphere/capsule collision push-out;
 *   4. positions → root-local geometry, normals recomputed.
 */
import * as THREE from 'three';
import type { BoneName } from '../rigDefs';
import type { Rig } from '../Rig';
import type { V3 } from './parts';

/** Global wind for all cloth (world space, m/s) — set by weather / environment code. */
export const clothWind = {
  dir: new THREE.Vector3(0.6, 0, -0.4),
  /** Mean speed (m/s). */
  speed: 1.2,
  /** 0..1 how gusty (amplitude of the slow gust envelope). */
  gust: 0.6,
};

/** Set the global cloth wind (direction is normalised; speed in m/s; gust 0..1). */
export function setClothWind(dir: THREE.Vector3, speed: number, gust = 0.6) {
  clothWind.dir.copy(dir).setY(0);
  if (clothWind.dir.lengthSq() < 1e-6) clothWind.dir.set(1, 0, 0);
  clothWind.dir.normalize();
  clothWind.speed = speed;
  clothWind.gust = gust;
}

/** Collision shape in a bone's local frame (reference units): sphere (a) or capsule (a→b). */
export interface ClothCollider { bone: BoneName; a: V3; b?: V3; r: number; }

export interface ClothSpec {
  cols: number;
  rows: number;
  /** Bone whose local frame the rest template is authored in. */
  frame: BoneName;
  /** Rest template: (u across 0..1 from the character's RIGHT to LEFT, v top→bottom 0..1) → frame-local ref coords. */
  rest: (u: number, v: number) => V3;
  /** Bone each pinned particle follows (default: frame). */
  pinBone?: (u: number, row: number) => BoneName;
  /** Number of pinned rows at the top (default 1). */
  pinRows?: number;
  colliders: ClothCollider[];
  /** Material key (see charMaterials) — use '|ds' and '|tat=…' options for double side + tatter. */
  mat: string;
  /** Optional decal (e.g. heraldry) drawn with a second mesh sharing the simulated vertices. */
  decal?: { mat: string; rect: [number, number, number, number] };
  /** Structural stiffness (0..1), bend stiffness, damping per 120 Hz step, gravity scale. */
  stiffness?: number;
  bend?: number;
  damping?: number;
  gravity?: number;
  /** How strongly wind pushes the sheet (0..2). */
  windScale?: number;
  /** Extra distance kept from colliders (cloth thickness), metres. */
  margin?: number;
}

const H = 1 / 120;
const MAX_STEPS = 6;
const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();

/** Context from the character builder: proportions scaling and rest positions. */
export interface ClothContext {
  rig: Rig;
  /** Scale reference bone-local coordinates into the rig's proportions. */
  scaleLocal: (bone: BoneName, p: V3, out: THREE.Vector3) => THREE.Vector3;
  /** Rest position of each bone in root space (scaled). */
  restRoot: Record<BoneName, THREE.Vector3>;
  /** Uniform radius scale for colliders. */
  radiusScale: number;
}

export class Cloth {
  readonly mesh: THREE.Mesh;
  readonly decalMesh: THREE.Mesh | null = null;
  private readonly n: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly pos: Float32Array;
  private readonly prev: Float32Array;
  private readonly invMass: Float32Array;
  private readonly restLocal: THREE.Vector3[] = [];
  private readonly frameBone: THREE.Object3D;
  private readonly pins: { i: number; bone: THREE.Object3D; local: THREE.Vector3; prev: THREE.Vector3; now: THREE.Vector3 }[] = [];
  private readonly consA: Uint16Array;
  private readonly consB: Uint16Array;
  private readonly consL: Float32Array;
  private readonly consK: Float32Array;
  private readonly tether: Int32Array;
  private readonly tetherL: Float32Array;
  private readonly cols3: { bone: THREE.Object3D; a: THREE.Vector3; b: THREE.Vector3 | null; r: number; wa: THREE.Vector3; wb: THREE.Vector3 }[] = [];
  private readonly nrm: Float32Array;
  private acc = 0;
  private time = Math.random() * 100;
  private primed = false;
  private readonly damping: number;
  private readonly gravity: number;
  private readonly windScale: number;
  private readonly margin: number;
  private readonly iterations = 3;

  constructor(private readonly spec: ClothSpec, private readonly ctx: ClothContext, material: THREE.Material, decalMaterial?: THREE.Material) {
    const { cols, rows } = spec;
    this.cols = cols; this.rows = rows;
    const n = (this.n = cols * rows);
    this.pos = new Float32Array(n * 3);
    this.prev = new Float32Array(n * 3);
    this.nrm = new Float32Array(n * 3);
    this.invMass = new Float32Array(n).fill(1);
    this.damping = spec.damping ?? 0.988;
    this.gravity = spec.gravity ?? 1;
    this.windScale = spec.windScale ?? 1;
    this.margin = spec.margin ?? 0.012;
    const rig = ctx.rig;
    this.frameBone = rig.bones[spec.frame];
    const pinRows = spec.pinRows ?? 1;

    // rest template (frame-local, scaled)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1), v = r / (rows - 1);
        const p = ctx.scaleLocal(spec.frame, spec.rest(u, v), new THREE.Vector3());
        this.restLocal.push(p);
        if (r < pinRows) {
          const i = r * cols + c;
          this.invMass[i] = 0;
          const bn = spec.pinBone ? spec.pinBone(u, r) : spec.frame;
          // express the template point in the pin bone's local frame (rest pose: translation only)
          const local = p.clone().add(ctx.restRoot[spec.frame]).sub(ctx.restRoot[bn]);
          this.pins.push({ i, bone: rig.bones[bn], local, prev: new THREE.Vector3(), now: new THREE.Vector3() });
        }
      }
    }

    // constraints: structural, shear, bend (skip-one)
    const A: number[] = [], B: number[] = [], K: number[] = [];
    const st = spec.stiffness ?? 1, bd = spec.bend ?? 0.25;
    const idx = (r: number, c: number) => r * cols + c;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) { A.push(idx(r, c)); B.push(idx(r, c + 1)); K.push(st * 0.9); }
        if (r + 1 < rows) { A.push(idx(r, c)); B.push(idx(r + 1, c)); K.push(st); }
        if (r + 1 < rows && c + 1 < cols) {
          A.push(idx(r, c)); B.push(idx(r + 1, c + 1)); K.push(st * 0.5);
          A.push(idx(r, c + 1)); B.push(idx(r + 1, c)); K.push(st * 0.5);
        }
        if (c + 2 < cols) { A.push(idx(r, c)); B.push(idx(r, c + 2)); K.push(bd); }
        if (r + 2 < rows) { A.push(idx(r, c)); B.push(idx(r + 2, c)); K.push(bd); }
      }
    }
    this.consA = Uint16Array.from(A);
    this.consB = Uint16Array.from(B);
    this.consK = Float32Array.from(K);
    this.consL = new Float32Array(A.length);
    for (let k = 0; k < A.length; k++) this.consL[k] = this.restLocal[A[k]].distanceTo(this.restLocal[B[k]]);
    // tethers: every free particle stays within (rest path length × 1.04) of its column's last pinned particle
    this.tether = new Int32Array(n).fill(-1);
    this.tetherL = new Float32Array(n);
    for (let c = 0; c < cols; c++) {
      let len = 0;
      for (let r = pinRows; r < rows; r++) {
        len += this.restLocal[idx(r, c)].distanceTo(this.restLocal[idx(r - 1, c)]);
        this.tether[idx(r, c)] = idx(pinRows - 1, c);
        this.tetherL[idx(r, c)] = len * 1.04;
      }
    }
    // colliders
    for (const col of spec.colliders) {
      const a = ctx.scaleLocal(col.bone, col.a, new THREE.Vector3());
      const b = col.b ? ctx.scaleLocal(col.bone, col.b, new THREE.Vector3()) : null;
      this.cols3.push({ bone: rig.bones[col.bone], a, b, r: col.r * ctx.radiusScale, wa: new THREE.Vector3(), wb: new THREE.Vector3() });
    }

    // geometry (root-local positions written every frame)
    const geo = new THREE.BufferGeometry();
    const gp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const p = this.restLocal[i].clone().add(ctx.restRoot[spec.frame]);
      gp[i * 3] = p.x; gp[i * 3 + 1] = p.y; gp[i * 3 + 2] = p.z;
    }
    const uv = new Float32Array(n * 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      uv[i * 2] = c / (cols - 1);
      uv[i * 2 + 1] = 1 - r / (rows - 1); // hem at uv.y = 0 (tatter masks cut from there)
    }
    const index: number[] = [];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = idx(r, c), b = idx(r, c + 1), cc = idx(r + 1, c), d = idx(r + 1, c + 1);
      index.push(a, cc, b, b, cc, d);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(gp, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    // Front faces must point away from the body (so one-sided decals sit on the outside).
    const mid = idx(Math.floor(rows / 2), Math.floor(cols / 2));
    const nm = geo.attributes.normal;
    const out = new THREE.Vector3(gp[mid * 3], 0, gp[mid * 3 + 2]).sub(new THREE.Vector3(ctx.restRoot[spec.frame].x, 0, ctx.restRoot[spec.frame].z));
    if (nm.getX(mid) * out.x + nm.getZ(mid) * out.z < 0) {
      const ix = geo.index!;
      for (let t = 0; t < ix.count; t += 3) { const b = ix.getX(t + 1); ix.setX(t + 1, ix.getX(t + 2)); ix.setX(t + 2, b); }
      geo.computeVertexNormals();
    }
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.name = 'cloth';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    rig.root.add(this.mesh);

    if (spec.decal && decalMaterial) {
      const [u0, v0, u1, v1] = spec.decal.rect;
      const duv = new Float32Array(n * 2);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = idx(r, c);
        const u = c / (cols - 1), v = r / (rows - 1);
        duv[i * 2] = 1 - (u - u0) / (u1 - u0);
        duv[i * 2 + 1] = 1 - (v - v0) / (v1 - v0);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', geo.attributes.position);
      dg.setAttribute('normal', geo.attributes.normal);
      dg.setAttribute('uv', new THREE.BufferAttribute(duv, 2));
      dg.setIndex(geo.index);
      this.decalMesh = new THREE.Mesh(dg, decalMaterial);
      this.decalMesh.name = 'cloth-decal';
      this.decalMesh.receiveShadow = true;
      rig.root.add(this.decalMesh);
    }
  }

  /** Snap every particle to the rest template around the current pose. */
  reset() {
    this.frameBone.updateWorldMatrix(true, false);
    for (let i = 0; i < this.n; i++) {
      _v.copy(this.restLocal[i]).applyMatrix4(this.frameBone.matrixWorld);
      this.pos[i * 3] = this.prev[i * 3] = _v.x;
      this.pos[i * 3 + 1] = this.prev[i * 3 + 1] = _v.y;
      this.pos[i * 3 + 2] = this.prev[i * 3 + 2] = _v.z;
    }
    for (const p of this.pins) {
      p.now.copy(p.local).applyMatrix4(p.bone.matrixWorld);
      p.prev.copy(p.now);
    }
    this.acc = 0;
    this.primed = true;
    this.upload();
  }

  /** Advance the simulation (bone world matrices must be current). */
  update(dt: number) {
    if (!this.primed) { this.reset(); return; }
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.time += dt;
    for (const p of this.pins) { p.prev.copy(p.now); p.now.copy(p.local).applyMatrix4(p.bone.matrixWorld); }
    for (const c of this.cols3) {
      c.wa.copy(c.a).applyMatrix4(c.bone.matrixWorld);
      if (c.b) c.wb.copy(c.b).applyMatrix4(c.bone.matrixWorld);
    }
    this.acc += dt;
    let steps = Math.floor(this.acc / H);
    if (steps > MAX_STEPS) { steps = MAX_STEPS; this.acc = 0; } else this.acc -= steps * H;
    if (steps > 0) {
      this.computeNormals();
      for (let s = 0; s < steps; s++) this.step((s + 1) / steps);
    } else {
      // keep pins glued even without a step
      for (const p of this.pins) this.setP(p.i, p.now);
    }
    this.upload();
  }

  private setP(i: number, v: THREE.Vector3) {
    this.pos[i * 3] = v.x; this.pos[i * 3 + 1] = v.y; this.pos[i * 3 + 2] = v.z;
    this.prev[i * 3] = v.x; this.prev[i * 3 + 1] = v.y; this.prev[i * 3 + 2] = v.z;
  }

  private computeNormals() {
    const { cols, rows, pos, nrm } = this;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const l = r * cols + Math.max(0, c - 1), rr = r * cols + Math.min(cols - 1, c + 1);
      const u = Math.max(0, r - 1) * cols + c, d = Math.min(rows - 1, r + 1) * cols + c;
      _a.set(pos[rr * 3] - pos[l * 3], pos[rr * 3 + 1] - pos[l * 3 + 1], pos[rr * 3 + 2] - pos[l * 3 + 2]);
      _b.set(pos[d * 3] - pos[u * 3], pos[d * 3 + 1] - pos[u * 3 + 1], pos[d * 3 + 2] - pos[u * 3 + 2]);
      _v.crossVectors(_a, _b).normalize();
      nrm[i * 3] = _v.x; nrm[i * 3 + 1] = _v.y; nrm[i * 3 + 2] = _v.z;
    }
  }

  private step(alpha: number) {
    const { pos, prev, invMass, n } = this;
    // wind: mean + slow gust envelope + flutter
    const t = this.time;
    const gust = 1 + clothWind.gust * (0.6 * Math.sin(t * 0.9) * Math.sin(t * 0.31 + 1.7) + 0.4 * Math.sin(t * 2.3 + 0.4));
    const ws = clothWind.speed * Math.max(0, gust) * this.windScale;
    const wx = clothWind.dir.x * ws, wy = 0, wz = clothWind.dir.z * ws;
    const g = -9.81 * this.gravity * H * H;
    const damp = this.damping;
    const nrm = this.nrm;
    for (let i = 0; i < n; i++) {
      if (invMass[i] === 0) continue;
      const k = i * 3;
      const x = pos[k], y = pos[k + 1], z = pos[k + 2];
      const vx = (x - prev[k]) * damp, vy = (y - prev[k + 1]) * damp, vz = (z - prev[k + 2]) * damp;
      // wind pressure through the normal, relative to the particle velocity
      const rx = wx - vx / H, ry = wy - vy / H, rz = wz - vz / H;
      const pn = (rx * nrm[k] + ry * nrm[k + 1] + rz * nrm[k + 2]) * 0.35;
      const flutter = Math.sin(t * 7 + i * 0.7) * 0.15 * ws;
      prev[k] = x; prev[k + 1] = y; prev[k + 2] = z;
      pos[k] = x + vx + (nrm[k] * pn + wx * 0.05) * H * H + nrm[k] * flutter * H * H;
      pos[k + 1] = y + vy + g + nrm[k + 1] * pn * H * H;
      pos[k + 2] = z + vz + (nrm[k + 2] * pn + wz * 0.05) * H * H + nrm[k + 2] * flutter * H * H;
    }
    for (const p of this.pins) {
      _v.copy(p.prev).lerp(p.now, alpha);
      this.setP(p.i, _v);
    }
    const { consA, consB, consL, consK, tether, tetherL } = this;
    for (let it = 0; it < this.iterations; it++) {
      for (let c = 0; c < consA.length; c++) {
        const a = consA[c], b = consB[c];
        const wa = invMass[a], wb = invMass[b];
        const w = wa + wb;
        if (w === 0) continue;
        const ka = a * 3, kb = b * 3;
        const dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        let diff = (d - consL[c]) / d;
        // cloth barely stretches but compresses (bends) freely
        if (diff < 0) diff *= 0.35;
        const s = (diff * consK[c]) / w;
        pos[ka] += dx * s * wa; pos[ka + 1] += dy * s * wa; pos[ka + 2] += dz * s * wa;
        pos[kb] -= dx * s * wb; pos[kb + 1] -= dy * s * wb; pos[kb + 2] -= dz * s * wb;
      }
      // long-range tethers
      for (let i = 0; i < n; i++) {
        const tt = tether[i];
        if (tt < 0) continue;
        const k = i * 3, kt = tt * 3;
        const dx = pos[k] - pos[kt], dy = pos[k + 1] - pos[kt + 1], dz = pos[k + 2] - pos[kt + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > tetherL[i]) {
          const s = tetherL[i] / d;
          pos[k] = pos[kt] + dx * s; pos[k + 1] = pos[kt + 1] + dy * s; pos[k + 2] = pos[kt + 2] + dz * s;
        }
      }
      this.collide();
    }
  }

  private collide() {
    const { pos, invMass, n } = this;
    const m = this.margin;
    for (const c of this.cols3) {
      const r = c.r + m;
      const ax = c.wa.x, ay = c.wa.y, az = c.wa.z;
      let bx = ax, by = ay, bz = az;
      if (c.b) { bx = c.wb.x; by = c.wb.y; bz = c.wb.z; }
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const ab2 = abx * abx + aby * aby + abz * abz;
      for (let i = 0; i < n; i++) {
        if (invMass[i] === 0) continue;
        const k = i * 3;
        let px = pos[k] - ax, py = pos[k + 1] - ay, pz = pos[k + 2] - az;
        let t = 0;
        if (ab2 > 1e-9) t = Math.min(1, Math.max(0, (px * abx + py * aby + pz * abz) / ab2));
        px -= abx * t; py -= aby * t; pz -= abz * t;
        const d2 = px * px + py * py + pz * pz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-6;
          const s = (r - d) / d;
          pos[k] += px * s; pos[k + 1] += py * s; pos[k + 2] += pz * s;
        }
      }
    }
  }

  private upload() {
    const rig = this.ctx.rig;
    _inv.copy(rig.root.matrixWorld).invert();
    const attr = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const e = _inv.elements;
    const { pos, n } = this;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      arr[i * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
      arr[i * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      arr[i * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    attr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
    if (this.decalMesh) this.decalMesh.geometry.boundingSphere = this.mesh.geometry.boundingSphere;
    void _m;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    if (this.decalMesh) {
      this.decalMesh.removeFromParent();
      // position/normal/index are shared with the main geometry
      this.decalMesh.geometry.deleteAttribute('uv');
    }
  }
}
