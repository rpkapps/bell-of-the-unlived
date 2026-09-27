/**
 * Geometry primitives for the architecture & prop kit.
 *
 * Every function returns a fresh THREE.BufferGeometry in a local frame documented per function.
 * UVs are not important for architecture (materials are triplanar/world-mapped); the batcher
 * re-projects world-space UVs anyway. Geometries whose UVs matter (banners, shields) say so.
 */
import * as THREE from 'three';
import { Rng } from '../../core/rng';

export const box = (sx: number, sy: number, sz: number) => new THREE.BoxGeometry(sx, sy, sz);

/** Box spanning explicit min/max corners (local). */
export function boxMinMax(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Vertical cylinder, base at y=0. */
export function cyl(rTop: number, rBot: number, h: number, seg = 12, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
  g.translate(0, h / 2, 0);
  return g;
}

/** Cone, base at y=0, apex at y=h. */
export function cone(r: number, h: number, seg = 12) {
  const g = new THREE.ConeGeometry(r, h, seg, 1, false);
  g.translate(0, h / 2, 0);
  return g;
}

/** Square pyramid (w × d base at y=0, apex at y=h). */
export function pyramid(w: number, d: number, h: number) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1, false);
  g.rotateY(Math.PI / 4);
  g.scale(w, 1, d);
  g.translate(0, h / 2, 0);
  return g;
}

export const sphere = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);

/**
 * Extrude a polygon drawn in the XY plane along +Z by `depth`, then centre it on z=0.
 * `holes` are optional inner polygons.
 */
export function extrudeXY(pts: [number, number][], depth: number, holes: [number, number][][] = []) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Triangular prism: base width w at y=0, apex at (0,h), extruded along Z by d (centred). */
export const gablePrism = (w: number, h: number, d: number) => extrudeXY([[-w / 2, 0], [w / 2, 0], [0, h]], d);

/** Right-angle wedge: rises from y=0 at z=+d/2 to y=h at z=-d/2 (ramp-like), width w. */
export function wedge(w: number, h: number, d: number) {
  const g = extrudeXY([[d / 2, 0], [-d / 2, 0], [-d / 2, h]], w);
  // extruded along Z in XY — rotate so the profile lies in the ZY plane
  g.rotateY(Math.PI / 2);
  return g;
}

export type ArchKind = 'flat' | 'round' | 'pointed' | 'segmental';

/**
 * Points of an opening outline from (x0, ySpring) up and over to (x1, ySpring) (exclusive of the
 * springing points), counter-clockwise when seen from +Z. `rise` is the arch height above spring.
 */
export function archPoints(x0: number, x1: number, ySpring: number, kind: ArchKind, rise?: number, segs = 8): [number, number][] {
  const s = x1 - x0, mid = (x0 + x1) / 2;
  const out: [number, number][] = [];
  if (kind === 'flat') return out;
  if (kind === 'round' || kind === 'segmental') {
    const r = s / 2;
    const k = kind === 'segmental' ? (rise ?? s * 0.25) / r : 1;
    for (let i = 1; i < segs; i++) {
      const a = Math.PI * (1 - i / segs);
      out.push([mid + Math.cos(a) * r, ySpring + Math.sin(a) * r * k]);
    }
    return out;
  }
  // pointed (two arcs); radius chosen from the requested rise (default ~equilateral)
  const R = rise ?? s * 0.87;
  // circle centred at (x0 + r, ySpring) through (x0, ySpring) and apex (mid, ySpring + R): r = (s²/4 + R²)/s
  const r = (s * s / 4 + R * R) / s;
  const half = Math.max(2, Math.floor(segs / 2));
  const aApex = Math.atan2(R, mid - (x0 + r)); // angle of apex from left-arc centre
  for (let i = 1; i <= half; i++) {
    const a = Math.PI + (aApex - Math.PI) * (i / half);
    out.push([x0 + r + Math.cos(a) * r, ySpring + Math.sin(a) * r]);
  }
  for (let i = half - 1; i >= 1; i--) {
    const a = Math.PI + (aApex - Math.PI) * (i / half);
    out.push([x1 - r - Math.cos(a) * r, ySpring + Math.sin(a) * r]);
  }
  return out;
}

export interface Opening {
  /** Centre along the wall (local x). */
  u: number;
  w: number;
  /** Bottom of the opening (0 = door at floor). */
  sill: number;
  /** Height to the springing line (for arches) or to the lintel (flat). */
  h: number;
  kind?: ArchKind;
  /** Arch rise above spring (pointed/segmental). */
  rise?: number;
}

export function openingTop(o: Opening) {
  const k = o.kind ?? 'flat';
  if (k === 'flat') return o.sill + o.h;
  if (k === 'round') return o.sill + o.h + o.w / 2;
  if (k === 'segmental') return o.sill + o.h + (o.rise ?? o.w * 0.25);
  return o.sill + o.h + (o.rise ?? o.w * 0.87);
}

/**
 * A wall slab with openings: local frame x ∈ [-len/2, len/2], y ∈ [0, height], z ∈ [-t/2, t/2].
 * Openings with sill 0 are cut from the bottom edge; others are holes.
 */
export function wallGeo(len: number, height: number, t: number, openings: Opening[] = [], topProfile?: [number, number][]) {
  const doors = openings.filter((o) => o.sill <= 0.001).sort((a, b) => a.u - b.u);
  const holes = openings.filter((o) => o.sill > 0.001);
  const pts: [number, number][] = [[-len / 2, 0]];
  for (const d of doors) {
    const x0 = d.u - d.w / 2, x1 = d.u + d.w / 2;
    pts.push([x0, 0], [x0, d.h], ...archPoints(x0, x1, d.h, d.kind ?? 'flat', d.rise), [x1, d.h], [x1, 0]);
  }
  pts.push([len / 2, 0]);
  if (topProfile && topProfile.length) {
    pts.push([len / 2, height]);
    for (const p of topProfile) pts.push(p);
    pts.push([-len / 2, height]);
  } else {
    pts.push([len / 2, height], [-len / 2, height]);
  }
  const holePts = holes.map((o) => {
    const x0 = o.u - o.w / 2, x1 = o.u + o.w / 2, ys = o.sill + o.h;
    // holes are wound clockwise
    const top = archPoints(x0, x1, ys, o.kind ?? 'flat', o.rise);
    const ring: [number, number][] = [[x0, o.sill], [x1, o.sill], [x1, ys], ...top.slice().reverse(), [x0, ys]];
    return ring.reverse();
  });
  return extrudeXY(pts, t, holePts);
}

/** Jittered low-poly rock (flat shaded look), roughly radius r, squashed by `sy`. */
export function rock(r: number, seed: number, sy = 0.7, detail = 1) {
  const rng = new Rng(seed);
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position as THREE.BufferAttribute;
  // Deterministic displacement per unique vertex position so shared vertices stay welded.
  const cache = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let k = cache.get(key);
    if (k === undefined) { k = 0.75 + rng.next() * 0.45; cache.set(key, k); }
    p.setXYZ(i, x * k, y * k * sy, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Lathe from a [radius, y] profile (bottom to top). */
export function lathe(profile: [number, number][], seg = 16) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
}

/** A bronze bell of height h; mouth at y=-h, crown (hanging point) at y=0. */
export function bellGeo(h: number, seg = 18) {
  const r = h * 0.62;
  const prof: [number, number][] = [
    [r * 0.94, -h], [r * 1.0, -h * 0.97], [r * 0.93, -h * 0.9], [r * 0.78, -h * 0.72], [r * 0.64, -h * 0.5],
    [r * 0.58, -h * 0.3], [r * 0.55, -h * 0.16], [r * 0.46, -h * 0.07], [r * 0.25, -h * 0.02], [0.001, 0],
  ];
  // inner surface so the mouth reads hollow
  const inner: [number, number][] = [[0.001, -h * 0.1], [r * 0.4, -h * 0.2], [r * 0.5, -h * 0.5], [r * 0.7, -h * 0.8], [r * 0.86, -h * 0.97]];
  const outer = lathe(prof, seg);
  // reversing the profile flips the winding so the inner surface faces the axis (hollow mouth)
  const inn = lathe(inner.slice().reverse(), seg);
  return mergeSimple([outer, inn]);
}

/** Heater shield outline (w × h), extruded by t; front face +Z. UVs are 0..1 over the face. */
export function heaterShield(w: number, h: number, t: number) {
  const pts: [number, number][] = [];
  pts.push([-w / 2, h * 0.5], [w / 2, h * 0.5]);
  for (let i = 1; i <= 6; i++) {
    const a = i / 6;
    pts.push([w / 2 * Math.cos(a * Math.PI / 2) ** 0.8, h * 0.5 - h * Math.sin(a * Math.PI / 2) * 1.0]);
  }
  for (let i = 5; i >= 1; i--) {
    const a = i / 6;
    pts.push([-w / 2 * Math.cos(a * Math.PI / 2) ** 0.8, h * 0.5 - h * Math.sin(a * Math.PI / 2) * 1.0]);
  }
  const shape = new THREE.Shape(pts.reverse().map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  planarUV(g, -w / 2, -h / 2, w, h);
  return g;
}

/** Overwrite UVs with an XY planar projection normalised to the given rectangle. */
export function planarUV(g: THREE.BufferGeometry, x0: number, y0: number, w: number, h: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - x0) / w; uv[i * 2 + 1] = (p.getY(i) - y0) / h; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Hanging banner: plane w × h hanging DOWN from y=0, with a swallow-tail notch. UVs 0..1. */
export function bannerGeo(w: number, h: number, segY = 6, tail = true) {
  const g = new THREE.PlaneGeometry(w, h, 2, segY);
  g.translate(0, -h / 2, 0);
  if (tail) {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), x = p.getX(i);
      if (y < -h + 0.001 && Math.abs(x) < 0.001) p.setY(i, -h * 0.84);
    }
  }
  return g;
}

/** Ring sector (flat, in XZ plane, top at y=0, thickness t below). Angles in radians around +Y from +X toward -Z? (standard: x = cos a, z = -sin a). */
export function ringSector(r0: number, r1: number, a0: number, a1: number, t: number, segs = 4) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segs; i++) { const a = a0 + (a1 - a0) * i / segs; pts.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
  for (let i = segs; i >= 0; i--) { const a = a0 + (a1 - a0) * i / segs; pts.push([Math.cos(a) * Math.max(r0, 0.0001), Math.sin(a) * Math.max(r0, 0.0001)]); }
  const g = extrudeXY(r0 < 0.001 ? pts.slice(0, segs + 2) : pts, t);
  // XY plane → XZ plane (y up): rotate -90° about X so +Y(shape) → -Z(world)
  g.rotateX(-Math.PI / 2);
  g.translate(0, -t / 2, 0);
  return g;
}

/** Merge geometries after normalising attributes (position/normal/uv, non-indexed). */
export function mergeSimple(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = list.map(normalizeGeometry);
  let count = 0;
  for (const g of norm) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of norm) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** Non-indexed geometry with exactly position/normal/uv (Float32). */
export function normalizeGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let n = g.index ? g.toNonIndexed() : g;
  if (!n.attributes.normal) n.computeVertexNormals();
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k);
  n.morphAttributes = {};
  n.clearGroups();
  // Some generators produce non-float32 or interleaved arrays; ensure plain Float32 attributes.
  for (const k of ['position', 'normal', 'uv']) {
    const a = n.attributes[k] as THREE.BufferAttribute;
    if (!(a.array instanceof Float32Array) || (a as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute) {
      const arr = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
      n.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    }
  }
  if (n === g) n = g.clone();
  return n;
}
