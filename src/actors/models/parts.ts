/**
 * Procedural geometry helpers for characters and weapons.
 *
 * Every function returns an INDEXED BufferGeometry carrying exactly `position`, `normal` and `uv`
 * (UVs are metric where it makes sense: 1 UV unit ≈ 1 m of surface) so any set of parts can be
 * merged per material.
 *
 * The workhorse is `loft`: a stack of (super-)elliptical rings, which covers limbs, torsos,
 * helmets, boots, pauldron lames (partial arcs), bells, pommels… `loftFrame` evaluates the same
 * surface anywhere so rivets, studs, trims and Unlived cracks can be placed exactly on it.
 *
 * Angles: θ = 0 is +Z (the character's front), θ = +90° is +X (the character's LEFT).
 */
import * as THREE from 'three';
import type { Rng } from '../../core/rng';

export type V3 = [number, number, number];
export type G = THREE.BufferGeometry;

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------ basics

/** Normalise any geometry to indexed position/normal/uv, no groups. */
export function norm(g: G): G {
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  g.clearGroups();
  g.morphAttributes = {};
  return g;
}

/** A simple transform: translate · rotate (Euler XYZ radians) · scale. */
export interface Xf { p?: V3; r?: V3; s?: number | V3; }

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export function xfMatrix(t: Xf, out = new THREE.Matrix4()): THREE.Matrix4 {
  const s = t.s === undefined ? _s.set(1, 1, 1) : typeof t.s === 'number' ? _s.setScalar(t.s) : _s.set(t.s[0], t.s[1], t.s[2]);
  _q.setFromEuler(_e.set(t.r?.[0] ?? 0, t.r?.[1] ?? 0, t.r?.[2] ?? 0, 'XYZ'));
  _v.set(t.p?.[0] ?? 0, t.p?.[1] ?? 0, t.p?.[2] ?? 0);
  return out.compose(_v, _q, s);
}

/** Flip triangle winding (needed after a mirroring transform). */
export function flipWinding(g: G): G {
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const b = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, b);
  }
  idx.needsUpdate = true;
  return g;
}

/** Apply a matrix; keeps triangles outward-facing when the matrix mirrors. */
export function applyM(g: G, m: THREE.Matrix4): G {
  g.applyMatrix4(m);
  if (m.determinant() < 0) flipWinding(g);
  return g;
}

/** Transform in place with an Xf. */
export function xf(g: G, t?: Xf): G {
  if (!t) return g;
  return applyM(g, xfMatrix(t, _m));
}

/** Clone + mirror across X (left ↔ right). */
export function mirrorX(g: G): G {
  return applyM(g.clone(), new THREE.Matrix4().makeScale(-1, 1, 1));
}

/** Merge normalised parts into one geometry (all must be norm()'d). */
export function merge(parts: G[]): G {
  const list = parts.filter((p) => p.attributes.position.count > 0).map(norm);
  if (list.length === 0) return norm(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([], 3)));
  if (list.length === 1) return list[0];
  // Manual merge (avoids BufferGeometryUtils attribute checks and keeps everything indexed).
  let nv = 0, ni = 0;
  for (const p of list) { nv += p.attributes.position.count; ni += p.index!.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const p of list) {
    const pa = p.attributes.position, na = p.attributes.normal, ua = p.attributes.uv;
    for (let i = 0; i < pa.count; i++) {
      pos[(ov + i) * 3] = pa.getX(i); pos[(ov + i) * 3 + 1] = pa.getY(i); pos[(ov + i) * 3 + 2] = pa.getZ(i);
      nor[(ov + i) * 3] = na.getX(i); nor[(ov + i) * 3 + 1] = na.getY(i); nor[(ov + i) * 3 + 2] = na.getZ(i);
      uv[(ov + i) * 2] = ua.getX(i); uv[(ov + i) * 2 + 1] = ua.getY(i);
    }
    const ix = p.index!;
    for (let i = 0; i < ix.count; i++) idx[oi + i] = ix.getX(i) + ov;
    ov += pa.count; oi += ix.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  for (const p of list) p.dispose();
  return g;
}

export function triCount(g: G): number {
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3;
}

// ------------------------------------------------------------------------------------ loft

/** One cross-section ring of a loft. rx/rz are half-extents; p is the super-ellipse exponent. */
export interface Ring {
  y: number;
  rx: number;
  rz?: number;
  /** Centre offset. */
  cx?: number; cz?: number;
  /** Super-ellipse exponent (2 = ellipse, 4 = rounded box). */
  p?: number;
  /** Extra scale of the front (+Z) / back (-Z) half. */
  front?: number; back?: number;
}

export interface LoftOpts {
  /** Radial segments around the full circle (partial arcs use a proportional count). */
  segs?: number;
  /** Arc start / length (radians, θ = 0 is +Z). Defaults to the full ring. */
  phi0?: number;
  phiLen?: number;
  capTop?: boolean;
  capBottom?: boolean;
  /** Radius multiplier as a function of θ and v (0 at first ring, 1 at last). */
  radial?: (theta: number, v: number) => number;
  /** Radial offset added after scaling (metres), e.g. for trims sitting proud of a surface. */
  inflate?: number;
}

const tmpRing: Required<Ring> = { y: 0, rx: 0, rz: 0, cx: 0, cz: 0, p: 2, front: 1, back: 1 };

function fillRing(r: Ring, out: Required<Ring>) {
  out.y = r.y; out.rx = r.rx; out.rz = r.rz ?? r.rx; out.cx = r.cx ?? 0; out.cz = r.cz ?? 0;
  out.p = r.p ?? 2; out.front = r.front ?? 1; out.back = r.back ?? 1;
  return out;
}

/** Point on a ring at angle θ (radial multiplier k, then `inflate` metres outward). */
export function ringPoint(r: Required<Ring>, theta: number, k: number, inflate: number, out: THREE.Vector3) {
  const s = Math.sin(theta), c = Math.cos(theta);
  const e = 2 / r.p;
  const sx = Math.sign(s) * Math.pow(Math.abs(s), e);
  const sz = Math.sign(c) * Math.pow(Math.abs(c), e);
  const rz = r.rz * (c >= 0 ? r.front : r.back);
  let x = sx * r.rx * k, z = sz * rz * k;
  if (inflate) {
    const l = Math.hypot(x, z) || 1;
    x += (x / l) * inflate; z += (z / l) * inflate;
  }
  return out.set(r.cx + x, r.y, r.cz + z);
}

/**
 * Loft through rings (listed top → bottom or bottom → top; order is normalised internally so the
 * surface faces outward). Returns an indexed geometry with smooth normals and metric UVs.
 */
export function loft(ringsIn: Ring[], o: LoftOpts = {}): G {
  const rings = ringsIn[0].y >= ringsIn[ringsIn.length - 1].y ? ringsIn : [...ringsIn].reverse();
  const phi0 = o.phi0 ?? 0;
  const phiLen = o.phiLen ?? TAU;
  const full = phiLen >= TAU - 1e-6;
  const baseSegs = o.segs ?? 16;
  const segs = Math.max(2, Math.round(baseSegs * phiLen / TAU));
  const cols = segs + 1;
  const nr = rings.length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3();
  // metric UVs: u by average perimeter, v by accumulated height
  let perim = 0;
  for (const r of rings) {
    fillRing(r, tmpRing);
    perim += Math.PI * (3 * (tmpRing.rx + tmpRing.rz) - Math.sqrt((3 * tmpRing.rx + tmpRing.rz) * (tmpRing.rx + 3 * tmpRing.rz)));
  }
  perim = (perim / nr) * (phiLen / TAU);
  let vAcc = 0;
  for (let i = 0; i < nr; i++) {
    const r = fillRing(rings[i], tmpRing);
    if (i > 0) {
      const a = rings[i - 1];
      vAcc += Math.hypot(a.y - r.y, (a.rx - r.rx) * 0.7);
    }
    const vn = nr > 1 ? i / (nr - 1) : 0;
    for (let j = 0; j < cols; j++) {
      const th = phi0 + (phiLen * j) / segs;
      const k = o.radial ? o.radial(th, vn) : 1;
      ringPoint(r, th, k, o.inflate ?? 0, p);
      pos.push(p.x, p.y, p.z);
      uv.push((j / segs) * perim, -vAcc);
    }
  }
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const addCap = (ringIdx: number, top: boolean) => {
    const r = fillRing(rings[ringIdx], tmpRing);
    // centre = average of ring points
    let cx = 0, cz = 0;
    for (let j = 0; j < segs; j++) { cx += pos[(ringIdx * cols + j) * 3]; cz += pos[(ringIdx * cols + j) * 3 + 2]; }
    cx /= segs; cz /= segs;
    const ci = pos.length / 3;
    pos.push(cx, r.y, cz);
    uv.push(0, 0);
    // separate rim vertices for a crisp cap edge
    const start = pos.length / 3;
    for (let j = 0; j < cols; j++) {
      const s = (ringIdx * cols + j) * 3;
      pos.push(pos[s], pos[s + 1], pos[s + 2]);
      uv.push(pos[s] - cx, pos[s + 2] - cz);
    }
    for (let j = 0; j < segs; j++) {
      if (top) idx.push(ci, start + j, start + j + 1);
      else idx.push(ci, start + j + 1, start + j);
    }
    if (!full) {
      // close the pie: nothing extra needed (fan already covers the arc)
    }
  };
  const nBody = pos.length / 3;
  if (o.capTop) addCap(0, true);
  if (o.capBottom) addCap(nr - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Weld seam normals of full rings so no shading seam appears.
  if (full) {
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < nr; i++) {
      const a = i * cols, b = i * cols + segs;
      const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
      const l = Math.hypot(x, y, z) || 1;
      n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
    }
  }
  // Cap vertices: flat normals.
  if (o.capTop || o.capBottom) {
    const n = g.attributes.normal as THREE.BufferAttribute;
    let k = nBody;
    if (o.capTop) { for (let j = 0; j <= cols; j++) n.setXYZ(k++, 0, 1, 0); }
    if (o.capBottom) { for (let j = 0; j <= cols; j++) n.setXYZ(k++, 0, -1, 0); }
  }
  return g;
}

/** Interpolated ring at continuous index t ∈ [0, n-1] (rings in the order given). */
function ringAt(rings: Ring[], t: number, out: Required<Ring>) {
  const n = rings.length;
  const i = Math.min(n - 2, Math.max(0, Math.floor(t)));
  const f = Math.min(1, Math.max(0, t - i));
  const a = fillRing(rings[i], { ...tmpRing }), b = fillRing(rings[i + 1], { ...tmpRing });
  out.y = a.y + (b.y - a.y) * f; out.rx = a.rx + (b.rx - a.rx) * f; out.rz = a.rz + (b.rz - a.rz) * f;
  out.cx = a.cx + (b.cx - a.cx) * f; out.cz = a.cz + (b.cz - a.cz) * f; out.p = a.p + (b.p - a.p) * f;
  out.front = a.front + (b.front - a.front) * f; out.back = a.back + (b.back - a.back) * f;
  return out;
}

/** Position + outward normal on a loft surface at angle θ and continuous ring index t. */
export function loftFrame(rings: Ring[], theta: number, t: number, o: LoftOpts = {}, lift = 0) {
  const r0: Required<Ring> = { ...tmpRing };
  const ev = (th: number, tt: number, out: THREE.Vector3) => {
    ringAt(rings, tt, r0);
    const vn = tt / Math.max(1, rings.length - 1);
    const k = o.radial ? o.radial(th, vn) : 1;
    return ringPoint(r0, th, k, o.inflate ?? 0, out);
  };
  const p = ev(theta, t, new THREE.Vector3());
  const pa = ev(theta + 0.01, t, new THREE.Vector3());
  const tt2 = t + (t < rings.length - 1.01 ? 0.01 : -0.01);
  const pb = ev(theta, tt2, new THREE.Vector3());
  const du = pa.sub(p);
  const dv = pb.sub(p);
  if (tt2 < t) dv.negate();
  // rings may be listed bottom→top: orient normal away from the ring centre
  const n = new THREE.Vector3().crossVectors(du, dv).normalize();
  ringAt(rings, t, r0);
  const out = new THREE.Vector3(p.x - r0.cx, 0, p.z - r0.cz);
  if (n.dot(out) < 0) n.negate();
  if (!isFinite(n.x)) n.copy(out.normalize());
  const tangent = du.normalize();
  if (lift) p.addScaledVector(n, lift);
  return { p, n, tangent };
}

// ------------------------------------------------------------------------------------ shapes

/** Ellipsoid / partial ellipsoid via loft (lat from 0 = top to π = bottom). */
export function ellipsoid(rx: number, ry: number, rz: number, o: { segs?: number; rows?: number; lat0?: number; lat1?: number; phi0?: number; phiLen?: number; radial?: LoftOpts['radial']; p?: number } = {}): G {
  const rows = o.rows ?? 8;
  const lat0 = o.lat0 ?? 0, lat1 = o.lat1 ?? Math.PI;
  const rings: Ring[] = [];
  for (let i = 0; i <= rows; i++) {
    const a = lat0 + ((lat1 - lat0) * i) / rows;
    const s = Math.max(Math.sin(a), 1e-3);
    rings.push({ y: Math.cos(a) * ry, rx: rx * s, rz: rz * s, p: o.p });
  }
  return loft(rings, { segs: o.segs ?? 12, phi0: o.phi0, phiLen: o.phiLen, radial: o.radial });
}

/** Capped cylinder / frustum along Y from y0 to y1. */
export function cyl(r0: number, r1: number, y0: number, y1: number, segs = 10, caps = true): G {
  return loft([{ y: y1, rx: r1 }, { y: y0, rx: r0 }], { segs, capTop: caps, capBottom: caps });
}

/** Box with metric UVs. */
export function box(w: number, h: number, d: number, at?: V3): G {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const su = ax > 0.5 ? d : w, sv = ay > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  if (at) g.translate(at[0], at[1], at[2]);
  return norm(g);
}

/** Rounded box (super-ellipse cross-section, bevelled top/bottom) centred at origin. */
export function rbox(w: number, h: number, d: number, bevel = 0.2, segs = 12): G {
  const hy = h / 2, bx = w / 2, bz = d / 2, e = Math.min(bevel, 0.45);
  return loft([
    { y: hy, rx: bx * (1 - e), rz: bz * (1 - e), p: 4 },
    { y: hy - h * e * 0.3, rx: bx * (1 - e * 0.25), rz: bz * (1 - e * 0.25), p: 4 },
    { y: hy - h * e, rx: bx, rz: bz, p: 4 },
    { y: -hy + h * e, rx: bx, rz: bz, p: 4 },
    { y: -hy + h * e * 0.3, rx: bx * (1 - e * 0.25), rz: bz * (1 - e * 0.25), p: 4 },
    { y: -hy, rx: bx * (1 - e), rz: bz * (1 - e), p: 4 },
  ], { segs, capTop: true, capBottom: true });
}

/** Torus (ring) lying in the XZ plane, radius R, tube r. */
export function torus(R: number, r: number, radial = 6, tubular = 16, arc = TAU): G {
  const g = new THREE.TorusGeometry(R, r, radial, tubular, arc);
  g.rotateX(Math.PI / 2);
  return norm(g);
}

// ------------------------------------------------------------------------------------ sweep

export interface SweepOpts {
  /** Half-width along the "up" axis and half-thickness along the side axis (or radius r). */
  r?: number | ((t: number) => number);
  w?: number | ((t: number) => number);
  h?: number | ((t: number) => number);
  sides?: number;
  /** Super-ellipse exponent of the cross-section (2 = round, 6+ = flat strap). */
  p?: number;
  segs?: number;
  closed?: boolean;
  /** Up hint for the cross-section frame (default +Y, falls back to +X). May vary along t. */
  up?: V3 | ((t: number) => V3);
  caps?: boolean;
  /** Use the control points as-is (polyline) instead of a Catmull-Rom curve. */
  poly?: boolean;
}

/** Sweep a (super-)elliptical cross-section along a path. Straps, belts, chains, fingers, horns. */
export function sweep(points: V3[], o: SweepOpts = {}): G {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const segs = o.segs ?? Math.max(4, pts.length * 3);
  const sides = o.sides ?? 6;
  const closed = !!o.closed;
  const curve = o.poly ? null : new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  const samp = (t: number, out: THREE.Vector3) => {
    if (curve) return curve.getPointAt(t, out);
    const f = t * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    return out.copy(pts[i]).lerp(pts[i + 1], f - i);
  };
  const val = (v: number | ((t: number) => number) | undefined, t: number, d: number) =>
    v === undefined ? d : typeof v === 'number' ? v : v(t);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3(), Pn = new THREE.Vector3(), T = new THREE.Vector3(), U = new THREE.Vector3(), S = new THREE.Vector3();
  const e = 2 / (o.p ?? 2);
  let len = 0;
  const prev = new THREE.Vector3();
  const nrow = closed ? segs : segs + 1;
  for (let i = 0; i <= segs; i++) {
    const t = closed ? (i % segs) / segs : i / segs;
    samp(Math.min(1, t), P);
    const t2 = Math.min(1, t + 0.002), t1 = Math.max(0, t - 0.002);
    samp(t2, Pn); samp(t1, T); T.subVectors(Pn, T).normalize();
    if (i > 0) len += P.distanceTo(prev);
    prev.copy(P);
    const uh = o.up === undefined ? [0, 1, 0] as V3 : typeof o.up === 'function' ? o.up(t) : o.up;
    U.set(uh[0], uh[1], uh[2]);
    U.addScaledVector(T, -U.dot(T));
    if (U.lengthSq() < 1e-6) { U.set(1, 0, 0).addScaledVector(T, -T.x); }
    U.normalize();
    S.crossVectors(T, U).normalize();
    const r = val(o.r, t, 0.01);
    const w = val(o.w, t, r), h = val(o.h, t, r);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      const cu = Math.sign(ca) * Math.pow(Math.abs(ca), e) * w;
      const cs = Math.sign(sa) * Math.pow(Math.abs(sa), e) * h;
      pos.push(P.x + U.x * cu + S.x * cs, P.y + U.y * cu + S.y * cs, P.z + U.z * cu + S.z * cs);
      uv.push(len, (j / sides) * (w + h) * 2);
    }
    if (closed && i === segs) break;
  }
  const rowsBuilt = closed ? segs + 1 : nrow;
  const cols = sides + 1;
  for (let i = 0; i < rowsBuilt - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // orientation check: normals should point away from the path centre
  const n = g.attributes.normal;
  const pa = g.attributes.position;
  samp(0.5, P);
  const mid = Math.floor(rowsBuilt / 2) * cols;
  let dot = 0;
  for (let j = 0; j < sides; j++) {
    const k = mid + j;
    dot += (pa.getX(k) - P.x) * n.getX(k) + (pa.getY(k) - P.y) * n.getY(k) + (pa.getZ(k) - P.z) * n.getZ(k);
  }
  if (dot < 0) { flipWinding(g); g.computeVertexNormals(); }
  if (o.caps && !closed) {
    const parts: G[] = [g];
    for (const end of [0, 1]) {
      const row = end === 0 ? 0 : rowsBuilt - 1;
      const cp: number[] = [], ci: number[] = [];
      let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < sides; j++) { const k = row * cols + j; cx += pa.getX(k); cy += pa.getY(k); cz += pa.getZ(k); }
      cp.push(cx / sides, cy / sides, cz / sides);
      for (let j = 0; j <= sides; j++) { const k = row * cols + j; cp.push(pa.getX(k), pa.getY(k), pa.getZ(k)); }
      for (let j = 0; j < sides; j++) ci.push(0, j + 1, j + 2);
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.setIndex(ci);
      cg.computeVertexNormals();
      // face away from the path
      samp(end === 0 ? 0 : 1, P); samp(end === 0 ? 0.01 : 0.99, Pn);
      const out = new THREE.Vector3().subVectors(P, Pn);
      if (cg.attributes.normal.getX(0) * out.x + cg.attributes.normal.getY(0) * out.y + cg.attributes.normal.getZ(0) * out.z < 0) {
        flipWinding(cg); cg.computeVertexNormals();
      }
      parts.push(norm(cg));
    }
    return merge(parts);
  }
  return g;
}

/** Horizontal band (belt, trim) following an ellipse around the Y axis. */
export function band(y: number, rx: number, rz: number, height: number, thick: number, o: { segs?: number; cx?: number; cz?: number; front?: number; back?: number; tilt?: number; phi0?: number; phiLen?: number } = {}): G {
  const segs = o.segs ?? 20;
  const full = (o.phiLen ?? TAU) >= TAU - 1e-6;
  const phi0 = o.phi0 ?? 0, phiLen = o.phiLen ?? TAU;
  const pts: V3[] = [];
  const n = full ? segs : segs + 1;
  for (let i = 0; i < n; i++) {
    const a = phi0 + (phiLen * i) / segs;
    const c = Math.cos(a);
    const z = c * rz * (c >= 0 ? (o.front ?? 1) : (o.back ?? 1));
    pts.push([(o.cx ?? 0) + Math.sin(a) * rx, y + (o.tilt ?? 0) * c, (o.cz ?? 0) + z]);
  }
  return sweep(pts, { w: height / 2, h: thick / 2, p: 8, sides: 8, closed: full, segs: segs, up: [0, 1, 0], caps: !full });
}

// ------------------------------------------------------------------------------------ details

/** Low-poly dome rivet/stud, base on origin, pointing +Y. */
export function rivet(r = 0.008, h = r * 0.7, segs = 6): G {
  return loft([{ y: h, rx: r * 0.15 }, { y: h * 0.75, rx: r * 0.7 }, { y: 0, rx: r }], { segs, capBottom: false });
}

/** Place copies of a +Y-oriented detail at points with normals. */
export function scatter(factory: () => G, frames: { p: THREE.Vector3; n: THREE.Vector3; tangent?: THREE.Vector3 }[], scale = 1): G {
  const out: G[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(scale, scale, scale);
  for (const f of frames) {
    const g = factory();
    q.setFromUnitVectors(up, f.n);
    m.compose(f.p, q, s);
    g.applyMatrix4(m);
    out.push(g);
  }
  return merge(out);
}

/** Rivets along a loft ring (continuous ring index t) between two angles. */
export function rivetRow(rings: Ring[], o: LoftOpts, t: number, a0: number, a1: number, count: number, r = 0.007): G {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const a = count === 1 ? (a0 + a1) / 2 : a0 + ((a1 - a0) * i) / (count - 1);
    frames.push(loftFrame(rings, a, t, o, -0.001));
  }
  return scatter(() => rivet(r), frames);
}

/**
 * Glowing crack ribbons on a loft surface (Unlived gold light). Random walks in (θ, t) space,
 * occasionally branching; ribbons sit 1.5 mm proud of the surface.
 */
export function cracks(rings: Ring[], o: LoftOpts, rng: Rng, count: number, opts: { width?: number; steps?: number; a0?: number; a1?: number } = {}): G {
  const out: G[] = [];
  const width = opts.width ?? 0.006;
  const n = rings.length - 1;
  const a0 = opts.a0 ?? 0, a1 = opts.a1 ?? TAU;
  const walk = (th: number, t: number, steps: number, w: number, depth: number) => {
    const pts: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    let dth = rng.range(-0.35, 0.35), dt = rng.range(0.12, 0.3) * (rng.chance(0.5) ? 1 : -1);
    for (let i = 0; i < steps; i++) {
      const f = loftFrame(rings, th, Math.min(n, Math.max(0, t)), o, 0.0015);
      pts.push(f);
      th += dth * 0.35 + rng.range(-0.12, 0.12);
      t += dt * 0.35 + rng.range(-0.05, 0.05);
      dth += rng.range(-0.2, 0.2);
      if (t < 0 || t > n) break;
      if (depth < 1 && rng.chance(0.18)) walk(th, t, Math.max(2, Math.floor(steps * 0.5)), w * 0.6, depth + 1);
    }
    if (pts.length < 2) return;
    const pos: number[] = [], idx: number[] = [];
    const side = new THREE.Vector3(), dir = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
      dir.subVectors(b, a).normalize();
      side.crossVectors(dir, pts[i].n).normalize();
      const k = w * (1 - Math.abs(i / (pts.length - 1) - 0.4) * 1.1) * rng.range(0.6, 1.3);
      const kk = Math.max(0.0008, k);
      pos.push(pts[i].p.x + side.x * kk, pts[i].p.y + side.y * kk, pts[i].p.z + side.z * kk);
      pos.push(pts[i].p.x - side.x * kk, pts[i].p.y - side.y * kk, pts[i].p.z - side.z * kk);
      if (i > 0) { const q = (i - 1) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // make sure ribbon faces outward
    const nn = g.attributes.normal;
    if (nn.getX(0) * pts[0].n.x + nn.getY(0) * pts[0].n.y + nn.getZ(0) * pts[0].n.z < 0) { flipWinding(g); g.computeVertexNormals(); }
    out.push(norm(g));
  };
  for (let c = 0; c < count; c++) {
    walk(rng.range(a0, a1), rng.range(0.2, n - 0.2), opts.steps ?? rng.int(5, 9), width, 0);
  }
  return merge(out);
}

/**
 * A cloth panel from a parametric surface f(u, v) (u across 0..1, v down 0..1). The hem is
 * tattered: every column gets its own length (ragged teeth, deep notches), and the panel is made
 * double-sided by duplicating the sheet with reversed winding, `thick` metres behind.
 */
export function panel(f: (u: number, v: number) => V3, cols: number, rows: number, o: { rng?: Rng; tatter?: number; teeth?: number; thick?: number; single?: boolean; uvScale?: [number, number] } = {}): G {
  const tat = o.tatter ?? 0;
  const lens: number[] = [];
  for (let j = 0; j <= cols; j++) {
    let l = 1;
    if (tat > 0 && o.rng) {
      const teeth = j % 2 === 0 ? 1 : 0;
      l = 1 - tat * (0.25 + 0.75 * o.rng.next()) * (0.55 + 0.45 * teeth);
      if (o.rng.chance(0.12)) l -= tat * 0.9; // deep rip
    }
    lens.push(Math.max(0.3, l));
  }
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const su = o.uvScale?.[0] ?? 1, sv = o.uvScale?.[1] ?? 1;
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const u = j / cols;
      // rows compress toward each column's own hem
      const v = (i / rows) * lens[j];
      const p = f(u, v);
      pos.push(p[0], p[1], p[2]);
      uv.push(u * su, -v * sv);
    }
  }
  const c1 = cols + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * c1 + j, b = a + 1, c = a + c1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (o.single) return g;
  // back sheet
  const nv = pos.length / 3;
  const n = g.attributes.normal;
  const th = o.thick ?? 0.004;
  const pos2 = pos.slice(), uv2 = uv.slice(), idx2 = idx.slice();
  for (let k = 0; k < nv; k++) {
    pos2.push(pos[k * 3] - n.getX(k) * th, pos[k * 3 + 1] - n.getY(k) * th, pos[k * 3 + 2] - n.getZ(k) * th);
    uv2.push(uv[k * 2], uv[k * 2 + 1]);
  }
  for (let t = 0; t < idx.length; t += 3) idx2.push(idx[t] + nv, idx[t + 2] + nv, idx[t + 1] + nv);
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
  g2.setAttribute('uv', new THREE.Float32BufferAttribute(uv2, 2));
  g2.setIndex(idx2);
  g2.computeVertexNormals();
  g.dispose();
  return g2;
}

/** A chain of alternating torus links along a polyline. */
export function chain(points: V3[], link = 0.035, wire = 0.0055): G {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const L = curve.getLength();
  const n = Math.max(1, Math.floor(L / (link * 0.78)));
  const out: G[] = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    const g = new THREE.TorusGeometry(link * 0.5, wire, 4, 8);
    g.scale(0.72, 1.25, 1); // oval link, long axis along Y
    q.setFromUnitVectors(up, T);
    q2.setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0);
    q.multiply(q2);
    m.compose(P, q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    out.push(norm(g));
  }
  return merge(out);
}

/** 2D-outline extrusion (XY shape, thickness along Z centred), metric UVs. */
export function extrude(outline: [number, number][], depth: number, bevel = 0, curveSegs = 1): G {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: curveSegs, steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  return norm(g);
}

/** Bend a geometry around the Y axis: z -= k·x² (convex shields, curved plates). */
export function bendX(g: G, k: number): G {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - k * p.getX(i) * p.getX(i));
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Push vertices by a noise-ish function (dents, wobble) along their normals. */
export function dent(g: G, rng: Rng, amount: number, count = 4, radius = 0.05): G {
  const p = g.attributes.position, n = g.attributes.normal;
  const centres: THREE.Vector3[] = [];
  const box3 = new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute);
  for (let i = 0; i < count; i++) {
    centres.push(new THREE.Vector3(rng.range(box3.min.x, box3.max.x), rng.range(box3.min.y, box3.max.y), rng.range(box3.min.z, box3.max.z)));
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    let d = 0;
    for (const c of centres) {
      const q = v.distanceTo(c) / radius;
      if (q < 1) d += (1 - q * q) * (1 - q * q);
    }
    if (d > 0) p.setXYZ(i, v.x - n.getX(i) * d * amount, v.y - n.getY(i) * d * amount, v.z - n.getZ(i) * d * amount);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Profile helper: sample a smooth radius profile r(y) into rings between y0 and y1. */
export function profile(y0: number, y1: number, n: number, rx: (t: number) => number, rz?: (t: number) => number, extra?: (t: number) => Partial<Ring>): Ring[] {
  const out: Ring[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ y: y0 + (y1 - y0) * t, rx: rx(t), rz: rz ? rz(t) : rx(t), ...(extra ? extra(t) : {}) });
  }
  return out;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
