/**
 * Architecture pieces: walls with openings, parapets & crenellations, buttresses, towers, floors,
 * columns, stairs (visual steps + ramp collider), arches, vaults and roofs.
 *
 * All functions work in the Kit's current local frame. Colliders are coarse boxes/ramps that
 * match the walkable/blocked space (visual details never intrude into it).
 */
import * as THREE from 'three';
import type { MaterialId } from '../../render/materialIds';
import type { Surface } from '../Collision';
import { Kit, type DrawOpts } from './Kit';
import { wallGeo, openingTop, type Opening, extrudeXY, gablePrism, cyl, cone, pyramid, archPoints, type ArchKind } from './geom';

export interface WallOpts extends DrawOpts {
  openings?: Opening[];
  /** Add colliders (default true). */
  col?: boolean;
  surface?: Surface;
  /** Colliders only (invisible wall). */
  noVis?: boolean;
  /** Collider height override (e.g. taller invisible bound than the visual wall). */
  colH?: number;
}

/**
 * Straight wall along the centre line (x0,z0)→(x1,z1), from y0 up `h`, thickness `t`.
 * Openings are measured from the wall's start point: `u` = distance of the opening centre from
 * the wall MIDPOINT along the wall direction (negative toward the start).
 */
export function wall(kit: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y0: number, h: number, t: number, o: WallOpts = {}) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(-dz, dx);
  const openings = o.openings ?? [];
  kit.push((x0 + x1) / 2, y0, (z0 + z1) / 2, ang);
  if (!o.noVis) kit.add(mat, wallGeo(len, h, t, openings), undefined, o);
  if (o.col ?? true) {
    const surf = o.surface ?? 'stone';
    const H = o.colH ?? h;
    const sorted = openings.slice().sort((a, b) => a.u - b.u);
    let cur = -len / 2;
    for (const op of sorted) {
      const a = op.u - op.w / 2, b = op.u + op.w / 2;
      if (a - cur > 0.01) kit.solid(cur - 0.01, 0, -t / 2, a + 0.01, H, t / 2, surf);
      // lintel from the springing line (arches) or head (flat)
      const lintel = (op.kind ?? 'flat') === 'flat' ? op.sill + op.h : op.sill + op.h;
      if (H - lintel > 0.01) kit.solid(a - 0.01, lintel, -t / 2, b + 0.01, H, t / 2, surf);
      if (op.sill > 0.01) kit.solid(a - 0.01, 0, -t / 2, b + 0.01, op.sill, t / 2, surf);
      cur = b;
    }
    if (len / 2 - cur > 0.01) kit.solid(cur - 0.01, 0, -t / 2, len / 2 + 0.01, H, t / 2, surf);
  }
  kit.pop();
}

/** Invisible collider wall (bounds) along a line, height h from y0. */
export function bound(kit: Kit, x0: number, z0: number, x1: number, z1: number, y0: number, h: number, t = 0.6) {
  wall(kit, 'stone_wall', x0, z0, x1, z1, y0, h, t, { noVis: true });
}

export interface CrenelOpts extends DrawOpts { base?: number; merlonH?: number; merlonW?: number; gapW?: number; col?: boolean; colH?: number; cap?: MaterialId }

/** Crenellated parapet along a centre line starting at height y. */
export function crenellation(kit: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, t: number, o: CrenelOpts = {}) {
  const base = o.base ?? 0.95, mh = o.merlonH ?? 0.85, mw = o.merlonW ?? 0.9, gw = o.gapW ?? 0.65;
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  kit.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
  kit.bmm(mat, -len / 2, 0, -t / 2, len / 2, base, t / 2, o);
  // coping band
  kit.bmm(o.cap ?? 'stone_trim', -len / 2 - 0.02, base - 0.12, -t / 2 - 0.06, len / 2 + 0.02, base, t / 2 + 0.06, o);
  const n = Math.max(1, Math.round((len + gw) / (mw + gw)));
  const step = len / n;
  for (let i = 0; i < n; i++) {
    const c = -len / 2 + step * (i + 0.5);
    const w = Math.min(mw, step - 0.1);
    kit.bmm(mat, c - w / 2, base, -t / 2, c + w / 2, base + mh, t / 2, o);
    kit.bmm(o.cap ?? 'stone_trim', c - w / 2 - 0.04, base + mh, -t / 2 - 0.04, c + w / 2 + 0.04, base + mh + 0.1, t / 2 + 0.04, { ...o, cast: false });
  }
  if (o.col ?? true) kit.solid(-len / 2 - 0.02, 0, -t / 2, len / 2 + 0.02, o.colH ?? base + mh, t / 2);
  kit.pop();
}

/** Plain low parapet / railing wall with a coping stone (collider to 1.25 m by default). */
export function parapet(kit: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, t = 0.45, h = 1.0, o: WallOpts = {}) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  kit.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
  if (!o.noVis) {
    kit.bmm(mat, -len / 2, 0, -t / 2, len / 2, h - 0.1, t / 2, o);
    kit.bmm('stone_trim', -len / 2 - 0.02, h - 0.12, -t / 2 - 0.05, len / 2 + 0.02, h, t / 2 + 0.05, o);
  }
  if (o.col ?? true) kit.solid(-len / 2 - 0.02, 0, -t / 2, len / 2 + 0.02, o.colH ?? Math.max(h, 1.25), t / 2, o.surface ?? 'stone');
  kit.pop();
}

/** Stepped buttress against a wall face; local frame at the foot, projecting toward +Z. */
export function buttress(kit: Kit, mat: MaterialId, x: number, y: number, z: number, yaw: number, h: number, depth = 1.2, width = 0.9) {
  kit.push(x, y, z, yaw);
  const h1 = h * 0.55;
  kit.bmm(mat, -width / 2, 0, 0, width / 2, h1, depth);
  kit.add('stone_trim', slopeCap(width + 0.06, 0.5, depth), { y: h1, z: depth / 2 });
  kit.bmm(mat, -width / 2 + 0.08, h1, 0, width / 2 - 0.08, h, depth * 0.55);
  kit.add('stone_trim', slopeCap(width - 0.1, 0.6, depth * 0.55), { y: h, z: depth * 0.275 });
  kit.pop();
}

/** Sloped weathering cap: wedge rising toward -Z (the wall). */
function slopeCap(w: number, h: number, d: number) {
  const g = extrudeXY([[d / 2, 0], [-d / 2, 0], [-d / 2, h]], w);
  g.rotateY(-Math.PI / 2);
  // after rotateY(-90°): shape x → z; wedge now rises toward -Z
  return g;
}

/** Floor slab with the TOP at y, covering a local rectangle. */
export function floor(kit: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, thick = 0.4, surface: Surface | false = 'stone', o: DrawOpts = {}) {
  kit.bmm(mat, x0, y - thick, z0, x1, y, z1, { ...o, cast: o.cast ?? false });
  if (surface) kit.solid(x0 - 0.01, y - thick, z0 - 0.01, x1 + 0.01, y, z1 + 0.01, surface);
}

/** Column with base and capital (round shaft). */
export function column(kit: Kit, mat: MaterialId, x: number, y: number, z: number, h: number, r = 0.35, col = true, trim: MaterialId = 'stone_trim') {
  kit.push(x, y, z);
  kit.box(trim, 0, 0.15, 0, r * 2.6, 0.3, r * 2.6);
  kit.add(mat, cyl(r * 0.92, r, h - 0.7, 10), { y: 0.3 });
  kit.add(trim, cyl(r * 1.25, r * 0.9, 0.25, 10), { y: h - 0.4 });
  kit.box(trim, 0, h - 0.075, 0, r * 2.8, 0.15, r * 2.8);
  if (col) kit.solid(-r, 0, -r, r, h, r);
  kit.pop();
}

/** Square pier. */
export function pier(kit: Kit, mat: MaterialId, x: number, y: number, z: number, w: number, h: number, col = true) {
  kit.bmm(mat, x - w / 2, y, z - w / 2, x + w / 2, y + h, z + w / 2, { col });
  kit.bmm('stone_trim', x - w / 2 - 0.08, y + h - 0.25, z - w / 2 - 0.08, x + w / 2 + 0.08, y + h, z + w / 2 + 0.08, { cast: false });
  kit.bmm('stone_trim', x - w / 2 - 0.08, y, z - w / 2 - 0.08, x + w / 2 + 0.08, y + 0.3, z + w / 2 + 0.08, { cast: false });
}

export interface StairOpts extends DrawOpts {
  /** Solid steps down to this local y (default: bottom y). Use for flights on the ground. */
  baseY?: number;
  /** Floating flight (steps + sloped soffit) instead of solid. */
  floating?: boolean;
  riser?: number;
  col?: boolean;
  surface?: Surface;
  /** Side stringer walls (both sides) of this height above the steps. */
  sideWalls?: number;
  sideMat?: MaterialId;
}

/**
 * Straight stair between two walking-surface points (either order). Visual steps plus one ramp
 * collider. Returns step count.
 */
export function stairs(kit: Kit, mat: MaterialId, a: [number, number, number], b: [number, number, number], width: number, o: StairOpts = {}): number {
  const [lo, hi] = a[1] <= b[1] ? [a, b] : [b, a];
  const dx = hi[0] - lo[0], dz = hi[2] - lo[2], dy = hi[1] - lo[1];
  const run = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(dy / (o.riser ?? 0.19)));
  const r = dy / n, d = run / n;
  kit.push(lo[0], lo[1], lo[2], Math.atan2(dx, dz));
  const base = (o.baseY ?? lo[1]) - lo[1];
  for (let i = 0; i < n; i++) {
    const top = (i + 1) * r;
    const bottom = o.floating ? top - r - 0.28 : base;
    kit.bmm(mat, -width / 2, bottom, i * d, width / 2, top, (i + 1) * d + 0.02, { ...o, cast: o.cast ?? true });
  }
  if (o.floating) {
    // sloped soffit under the steps
    const L = Math.hypot(run, dy), ang = Math.atan2(dy, run);
    kit.box(mat, 0, dy / 2 - 0.35, run / 2, width, 0.3, L, { rx: -ang, cast: true });
  }
  if (o.sideWalls) {
    const sm = o.sideMat ?? mat;
    for (const s of [-1, 1]) {
      const L = Math.hypot(run, dy), ang = Math.atan2(dy, run);
      kit.box(sm, s * (width / 2 + 0.15), dy / 2 + o.sideWalls / 2 - 0.2, run / 2, 0.3, o.sideWalls + 0.4, L + 0.2, { rx: -ang });
    }
  }
  kit.pop();
  if (o.col ?? true) kit.ramp(lo, hi, width, 0.5, o.surface ?? 'stone');
  return n;
}

/** Free-standing archway (two piers + arch) across local x, centred at origin, facing +Z. */
export function archway(kit: Kit, mat: MaterialId, x: number, y: number, z: number, yaw: number, span: number, spring: number, depth: number, kind: ArchKind = 'round', pierW = 0.8, extraTop = 0.6, col = true) {
  const W = span + pierW * 2;
  const top = openingTop({ u: 0, w: span, sill: 0, h: spring, kind }) + extraTop;
  kit.push(x, y, z, yaw);
  kit.add(mat, wallGeo(W, top, depth, [{ u: 0, w: span, sill: 0, h: spring, kind }]));
  // voussoir trim ring on both faces
  const ring = archPoints(-span / 2, span / 2, spring, kind);
  const pts: [number, number][] = [[-span / 2, spring], ...ring, [span / 2, spring]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const a = Math.atan2(by - ay, bx - ax);
    for (const s of [-1, 1]) kit.box('stone_trim', (ax + bx) / 2 - Math.sin(a) * 0.15, (ay + by) / 2 + Math.cos(a) * 0.15, s * (depth / 2 + 0.04), L + 0.06, 0.3, 0.1, { rz: a, cast: false });
  }
  if (col) {
    kit.solid(-W / 2, 0, -depth / 2, -span / 2 + 0.01, top, depth / 2);
    kit.solid(span / 2 - 0.01, 0, -depth / 2, W / 2, top, depth / 2);
    kit.solid(-span / 2, spring, -depth / 2, span / 2, top, depth / 2);
  }
  kit.pop();
  return top;
}

/**
 * Barrel vault shell over a corridor: local frame at the springing-line centre, running along
 * +Z for `len`, inner radius r (span 2r), thickness t. Inner surface faces down/inward.
 */
export function barrelVault(kit: Kit, mat: MaterialId, x: number, y: number, z: number, yaw: number, r: number, len: number, t = 0.4, segs = 10, o: DrawOpts = {}) {
  const outer: [number, number][] = [], inner: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI * i / segs;
    outer.push([Math.cos(a) * (r + t), Math.sin(a) * (r + t)]);
    inner.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const g = extrudeXY([...outer, ...inner.reverse()], len);
  kit.push(x, y, z, yaw);
  kit.add(mat, g, { z: len / 2 }, o);
  // transverse ribs every ~3 m
  const nR = Math.max(1, Math.round(len / 3.2));
  for (let i = 0; i <= nR; i++) {
    const zz = (len * i) / nR;
    const rib: [number, number][] = [];
    const rin: [number, number][] = [];
    for (let k = 0; k <= segs; k++) {
      const a = Math.PI * k / segs;
      rib.push([Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02)]);
      rin.push([Math.cos(a) * (r - 0.18), Math.sin(a) * (r - 0.18)]);
    }
    kit.add('stone_trim', extrudeXY([...rib, ...rin.reverse()], 0.35), { z: Math.min(len - 0.18, Math.max(0.18, zz)) }, { cast: false });
  }
  kit.pop();
}

export interface GableRoofOpts extends DrawOpts {
  pitch?: number;      // radians (default 55°)
  overhang?: number;   // eaves overhang
  endOverhang?: number;
  thick?: number;
  mat?: MaterialId;
  gableMat?: MaterialId | null;  // null = no gable end walls
  ridgeMat?: MaterialId;
  /** Only build a skeleton of rafters (burned roof) with this fraction of slate remaining. */
  burned?: number;
}

/**
 * Gable roof on a w (local X) × d (local Z) footprint, eaves at local y=0, ridge along Z.
 * Returns the ridge height above the eaves.
 */
export function gableRoof(kit: Kit, cx: number, y: number, cz: number, yaw: number, w: number, d: number, o: GableRoofOpts = {}): number {
  const p = o.pitch ?? 55 * Math.PI / 180;
  const oh = o.overhang ?? 0.45, eoh = o.endOverhang ?? 0.35, th = o.thick ?? 0.18;
  const rise = (w / 2) * Math.tan(p);
  const mat = o.mat ?? 'roof_slate';
  kit.push(cx, y, cz, yaw);
  const L = (w / 2 + oh) / Math.cos(p);
  const D = d + eoh * 2;
  for (const s of [-1, 1]) {
    // slope from eave (s*(w/2+oh), -oh*tan p) to ridge (0, rise)
    const ex = s * (w / 2 + oh), ey = -oh * Math.tan(p);
    const mx = ex / 2, my = (ey + rise) / 2;
    // offset outward by half the thickness so the underside lies on the rafter line
    const ox = s * Math.sin(p) * th / 2, oy = Math.cos(p) * th / 2;
    if (o.burned === undefined) {
      kit.box(mat, mx + ox, my + oy, 0, L, th, D, { ...o, rz: -s * p });
    } else {
      // charred rafters (some missing, some snapped short) + a partial slate slab
      const nRaf = Math.max(3, Math.round(D / 0.9));
      for (let i = 0; i <= nRaf; i++) {
        if (kit.rng.chance(0.25)) continue;
        const zz = -D / 2 + (D * i) / nRaf;
        const cut = kit.rng.range(0.45, 1);
        kit.box('timber_burnt', ex + (0 - ex) * cut / 2 + ox, ey + (rise - ey) * cut / 2, zz, L * cut, 0.16, 0.14, { rz: -s * p, cast: true });
      }
      if (o.burned > 0) {
        const f = o.burned;
        kit.box(mat, mx + ox, my + oy, -D / 2 + (D * f) / 2, L, th, D * f, { ...o, rz: -s * p });
      }
    }
  }
  // ridge
  if (o.burned === undefined) kit.box(o.ridgeMat ?? 'timber_dark', 0, rise + 0.05, 0, 0.3, 0.22, D + 0.02, { cast: false });
  else kit.box('timber_burnt', 0, rise - 0.1, 0, 0.22, 0.22, D * 0.7, { cast: true });
  // gable end walls
  if (o.gableMat !== null) {
    const gm = o.gableMat ?? 'plaster';
    for (const s of [-1, 1]) kit.add(gm, gablePrism(w, rise, 0.25), { z: s * (d / 2 - 0.125) });
  }
  kit.pop();
  return rise;
}

/** Square tower (solid, for silhouettes/gatehouses), foot centre (x,y0,z). */
export function towerSolid(kit: Kit, mat: MaterialId, x: number, y0: number, z: number, w: number, d: number, h: number, roof: 'cone' | 'pyramid' | 'crenel' | 'none' = 'pyramid', roofH = w * 1.4, col = false) {
  kit.bmm(mat, x - w / 2, y0, z - d / 2, x + w / 2, y0 + h, z + d / 2, { col });
  // string courses
  for (let yy = y0 + 4; yy < y0 + h - 1; yy += 5.5) kit.bmm('stone_trim', x - w / 2 - 0.1, yy, z - d / 2 - 0.1, x + w / 2 + 0.1, yy + 0.25, z + d / 2 + 0.1, { cast: false });
  if (roof === 'crenel') {
    const t = 0.6, y = y0 + h;
    kit.bmm('stone_trim', x - w / 2 - 0.35, y - 0.6, z - d / 2 - 0.35, x + w / 2 + 0.35, y, z + d / 2 + 0.35);
    crenellation(kit, mat, x - w / 2, z - d / 2 - 0.05, x + w / 2, z - d / 2 - 0.05, y, t, { col: false });
    crenellation(kit, mat, x - w / 2, z + d / 2 + 0.05, x + w / 2, z + d / 2 + 0.05, y, t, { col: false });
    crenellation(kit, mat, x - w / 2 - 0.05, z - d / 2, x - w / 2 - 0.05, z + d / 2, y, t, { col: false });
    crenellation(kit, mat, x + w / 2 + 0.05, z - d / 2, x + w / 2 + 0.05, z + d / 2, y, t, { col: false });
  } else if (roof !== 'none') {
    const y = y0 + h;
    kit.bmm('stone_trim', x - w / 2 - 0.3, y - 0.5, z - d / 2 - 0.3, x + w / 2 + 0.3, y, z + d / 2 + 0.3);
    if (roof === 'pyramid') kit.add('roof_slate', pyramid(w + 0.9, d + 0.9, roofH), { x, y, z });
    else kit.add('roof_slate', cone(Math.max(w, d) * 0.72, roofH, 12), { x, y, z });
    kit.add('iron', cyl(0.04, 0.06, 1.6, 5), { x, y: y + roofH - 0.1, z }, { cast: false });
  }
}

/** Round tower with conical roof; foot centre (x,y0,z). */
export function towerRound(kit: Kit, mat: MaterialId, x: number, y0: number, z: number, r: number, h: number, roofH = r * 3, col = false, slits = true) {
  kit.add(mat, cyl(r, r * 1.04, h, 16), { x, y: y0, z });
  kit.add('stone_trim', cyl(r + 0.25, r + 0.1, 0.5, 16), { x, y: y0 + h - 0.5, z });
  kit.add('roof_slate', cone(r + 0.6, roofH, 16), { x, y: y0 + h, z });
  kit.add('iron', cyl(0.04, 0.06, 1.4, 5), { x, y: y0 + h + roofH - 0.1, z }, { cast: false });
  if (slits) {
    for (let yy = y0 + 3; yy < y0 + h - 2; yy += 4.2) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + yy;
        kit.box('timber_dark', x + Math.sin(a) * (r + 0.01), yy, z + Math.cos(a) * (r + 0.01), 0.14, 1.1, 0.14, { ry: a, cast: false });
      }
    }
  }
  if (col) kit.solid(x - r * 0.85, y0, z - r * 0.85, x + r * 0.85, y0 + h, z + r * 0.85);
}

/** Pyramid roof helper (caphouses, lean-tos). */
export function pyramidRoof(kit: Kit, x: number, y: number, z: number, w: number, d: number, h: number, mat: MaterialId = 'roof_slate') {
  kit.add(mat, pyramid(w, d, h), { x, y, z });
}

/** Lean-to (shed) roof: slopes down toward +Z (local), high edge at z=-d/2. */
export function shedRoof(kit: Kit, cx: number, y: number, cz: number, yaw: number, w: number, d: number, drop: number, mat: MaterialId = 'roof_slate') {
  kit.push(cx, y, cz, yaw);
  const L = Math.hypot(d, drop), a = Math.atan2(drop, d);
  kit.box(mat, 0, -drop / 2 + 0.1, 0, w, 0.16, L, { rx: a });
  kit.pop();
}

/** Arrow slit / dark window recess decal on a wall face (local frame: face normal +Z). */
export function slit(kit: Kit, x: number, y: number, z: number, yaw: number, w = 0.18, h = 1.1) {
  kit.push(x, y, z, yaw);
  kit.box('timber_dark', 0, 0, 0.02, w, h, 0.06, { cast: false });
  kit.box('stone_trim', 0, h / 2 + 0.06, 0.04, w + 0.3, 0.12, 0.1, { cast: false });
  kit.box('stone_trim', 0, -h / 2 - 0.06, 0.04, w + 0.3, 0.12, 0.1, { cast: false });
  kit.pop();
}

/** Machicolation corbel band around a rectangle (visual) at height y. */
export function corbels(kit: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, out = 0.8, spacing = 1.1) {
  const edges: [number, number, number, number][] = [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  for (const [ax, az, bx, bz] of edges) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / spacing));
    const nx = (bz - az) / len, nz = -(bx - ax) / len; // outward normal for clockwise-in-XZ… sign fixed below
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const sgn = (mx - cx) * nx + (mz - cz) * nz > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = ax + (bx - ax) * t + nx * sgn * out / 2, pz = az + (bz - az) * t + nz * sgn * out / 2;
      kit.box(mat, px, y - 0.55, pz, Math.abs(nx) > 0.5 ? out : 0.35, 0.9, Math.abs(nx) > 0.5 ? 0.35 : out, { cast: false });
    }
  }
}

/** Utility: thin trim band (string course) around a rectangle at height y. */
export function stringCourse(kit: Kit, x0: number, z0: number, x1: number, z1: number, y: number, h = 0.25, out = 0.12, mat: MaterialId = 'stone_trim') {
  kit.bmm(mat, x0 - out, y, z0 - out, x1 + out, y + h, z1 + out, { cast: false });
}

export const deg = (d: number) => (d * Math.PI) / 180;

