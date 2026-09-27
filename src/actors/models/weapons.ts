/**
 * Weapons, shields and catalysts.
 *
 * Local frame (contract): grip centre at the origin (where the RIGHT/main hand's fist closes),
 * blade/shaft along +Y, cutting edge toward +Z (blade flats face ±X). Shields: centre of the face
 * at the origin, face normal +Z, top +Y; the fist grip on the back sits where the Rig's shieldL
 * socket puts the left fist: (-0.13, 0, -0.08) in shield space, with an arm strap across the
 * forearm at x ≈ +0.12. Bows: limbs along ±Y, string toward -Z (the archer), back of the bow
 * toward +Z. Crossbow: stock along +Y, prod along ±X, top (bolt groove) toward -Z so it faces up
 * under the pose solver's default "edge down" orientation for horizontal items.
 *
 * `hit` = damaging segment along +Y (radius in metres) used by melee detection; `trail` = trail
 * anchors; `offhandGrip` = where the LEFT hand holds two-handed/long weapons (metres along +Y).
 * Parts are merged per material: 2–7 meshes per weapon. Materials are shared (not per instance).
 */
import * as THREE from 'three';
import type { WeaponModel } from './contract';
import { weaponMaterial } from './charMaterials';
import { getMaterial } from '../../render/materials';
import {
  loft, sweep, ellipsoid, extrude, bendX, box, rivet, scatter, torus, chain, merge, xf, cyl, dent, norm,
  type Ring, type G, type V3, lerp, TAU, triCount,
} from './parts';
import { bellGeom, inside, ridge } from './gear';
import { Rng } from '../../core/rng';

export interface WeaponModelExt extends WeaponModel {
  offhandGrip?: number;
  /** Triangle count (debug / preview). */
  triangles?: number;
}

class WB {
  private parts = new Map<string, G[]>();
  add(key: string, g: G, t?: Parameters<typeof xf>[1]) {
    norm(g);
    if (t) xf(g, t);
    let l = this.parts.get(key);
    if (!l) this.parts.set(key, (l = []));
    l.push(g);
    return this;
  }
  build(name: string): { object: THREE.Group; tris: number } {
    const group = new THREE.Group();
    group.name = `weapon:${name}`;
    let tris = 0;
    for (const [key, list] of this.parts) {
      const g = merge(list);
      g.computeBoundingSphere();
      tris += triCount(g);
      const m = new THREE.Mesh(g, weaponMaterial(key));
      m.name = key;
      m.castShadow = !key.startsWith('bell_light') && !key.startsWith('ember_glow');
      m.receiveShadow = true;
      group.add(m);
    }
    return { object: group, tris };
  }
}

// ------------------------------------------------------------------------------------ parts

interface BladeOpts {
  y0: number; y1: number;
  /** Half-widths (edge direction, Z) at base and near the tip. */
  w0: number; w1: number;
  /** Half-thickness (X) at base and tip. */
  t0: number; t1: number;
  tip?: number;          // tip length
  fuller?: number;       // 0..1 of the blade length (0 = none)
  fullerDepth?: number;
  p?: number;            // cross-section exponent (<2 diamond/lenticular)
  curve?: number;        // sabre curvature: centreline offset in -Z at the tip
  single?: boolean;      // single edge (thick spine toward -Z)
  notches?: Rng;
  segs?: number;
}

/** A blade loft along +Y with lenticular section, optional fuller, curve and notches. */
function blade(o: BladeOpts): G {
  const L = o.y1 - o.y0;
  const tip = o.tip ?? L * 0.14;
  const n = 14;
  const rings: Ring[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = o.y0 + (L - tip) * t;
    rings.push({ y, rx: lerp(o.t0, o.t1, t), rz: lerp(o.w0, o.w1, t), p: o.p ?? 1.5, cz: -(o.curve ?? 0) * Math.pow((y - o.y0) / L, 2) });
  }
  for (let i = 1; i <= 4; i++) {
    const t = i / 4;
    const y = o.y1 - tip + tip * t;
    const k = Math.cos((t * Math.PI) / 2);
    rings.push({ y, rx: o.t1 * (0.3 + 0.7 * k), rz: Math.max(0.0008, o.w1 * k), p: o.p ?? 1.5, cz: -(o.curve ?? 0) * Math.pow((y - o.y0) / L, 2) - (o.single ? o.w1 * (1 - k) * 0.6 : 0) });
  }
  const fl = o.fuller ?? 0, fd = o.fullerDepth ?? 0.45;
  const notch: { y: number; s: number }[] = [];
  if (o.notches) for (let i = 0; i < 6; i++) notch.push({ y: o.notches.range(o.y0 + 0.1, o.y1 - 0.1), s: o.notches.chance(0.5) ? 1 : -1 });
  const g = loft(rings, {
    segs: o.segs ?? 12,
    radial: (th, v) => {
      let k = 1;
      const y = o.y0 + v * L;
      if (fl > 0 && v < fl && v > 0.02) {
        const a = Math.min(Math.abs(angDiff(th, Math.PI / 2)), Math.abs(angDiff(th, -Math.PI / 2)));
        k -= fd * Math.exp(-((a / 0.35) ** 2)) * Math.min(1, (fl - v) * 12);
      }
      if (o.single && Math.cos(th) < 0) k *= 1.0; // spine side kept
      for (const nn of notch) {
        const edge = nn.s > 0 ? Math.abs(angDiff(th, 0)) : Math.abs(angDiff(th, Math.PI));
        if (edge < 0.4 && Math.abs(y - nn.y) < 0.012) k *= 0.8;
      }
      return k;
    },
  });
  if (o.single) {
    // thicken the spine (−Z half): push −Z vertices outward in X
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < -0.004) p.setX(i, p.getX(i) * 1.6);
    g.computeVertexNormals();
  }
  return g;
}

const angDiff = (a: number, b: number) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/** Leather-wrapped grip along Y (oval section: narrower across the flats). */
function grip(y0: number, y1: number, r: number, spiral = true, ring = true): G {
  const rings: Ring[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bulge = 1 + 0.12 * Math.sin(t * Math.PI);
    rings.push({ y: lerp(y0, y1, t), rx: r * 0.88 * bulge, rz: r * bulge });
  }
  const g = loft(rings, { segs: 10, capTop: true, capBottom: true, radial: spiral ? (th, v) => 1 + 0.07 * Math.abs(Math.sin(th * 0.5 + v * (y1 - y0) * 180)) : undefined });
  if (!ring) return g;
  return g;
}

/** Wheel pommel with boss (disc faces ±X). */
function wheelPommel(y: number, r: number, t: number, boss = true): G {
  const g = loft([
    { y: t * 0.5, rx: r * 0.55 }, { y: t * 0.45, rx: r * 0.9 }, { y: t * 0.25, rx: r }, { y: -t * 0.25, rx: r }, { y: -t * 0.45, rx: r * 0.9 }, { y: -t * 0.5, rx: r * 0.55 },
  ], { segs: 16, capTop: true, capBottom: true, radial: (th) => 1 + 0.04 * Math.abs(Math.sin(th * 6)) });
  const parts = [g];
  if (boss) parts.push(xf(ellipsoid(r * 0.45, t * 0.35, r * 0.45, { segs: 10, rows: 5, lat1: Math.PI / 2 }), { p: [0, t * 0.5, 0] }), xf(ellipsoid(r * 0.45, t * 0.35, r * 0.45, { segs: 10, rows: 5, lat1: Math.PI / 2 }), { p: [0, -t * 0.5, 0], r: [Math.PI, 0, 0] }));
  const m = merge(parts);
  m.rotateZ(Math.PI / 2);
  m.translate(0, y, 0);
  return m;
}

/** Crossguard along ±Z, tips curving toward +Y by `curl`. */
function crossguard(y: number, half: number, w: number, h: number, curl = 0.02, droop = 0): G {
  const pts: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = lerp(-1, 1, i / 8);
    pts.push([0, y + curl * Math.pow(Math.abs(t), 2.2) - droop * Math.pow(Math.abs(t), 1.5), t * half]);
  }
  return sweep(pts, { w: (t) => w * (1 - 0.3 * Math.abs(t - 0.5) * 2) + 0.001, h, up: [1, 0, 0], p: 4, sides: 6, segs: 16, caps: true });
}

/** Etched gilt band on both flats (decal quads). */
function etching(y0: number, y1: number, w: number, xOff: number): G {
  const parts: G[] = [];
  for (const s of [1, -1]) {
    const g = new THREE.PlaneGeometry(w * 2, y1 - y0);
    // unit UVs rotated so the embroidery band runs along the blade
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * 3, u); }
    g.rotateY(s * Math.PI / 2);
    g.translate(s * xOff, (y0 + y1) / 2, 0);
    parts.push(norm(g));
  }
  return merge(parts);
}

/** A round shaft along Y (wood), optionally with metal collars. */
function shaft(y0: number, y1: number, r0: number, r1 = r0, segs = 8): G {
  return loft([{ y: y1, rx: r1 }, { y: lerp(y0, y1, 0.5), rx: (r0 + r1) / 2 * 1.02 }, { y: y0, rx: r0 }], { segs, capTop: true, capBottom: true });
}
function collar(y: number, r: number, h = 0.02): G {
  return loft([{ y: y + h / 2, rx: r * 0.92 }, { y: y + h * 0.3, rx: r }, { y: y - h * 0.3, rx: r }, { y: y - h / 2, rx: r * 0.92 }], { segs: 10, capTop: true, capBottom: true });
}

// ------------------------------------------------------------------------------------ shields

/** Heater outline (x across, y up), centred on the face. */
function heaterOutline(w: number, top: number, bottom: number, n = 18): [number, number][] {
  const pts: [number, number][] = [];
  // right side from top corner down to the point, then left side back up, arched top
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const y = lerp(top - 0.02, bottom, s);
    const x = w * Math.pow(1 - Math.pow(s, 2.4), 0.55);
    pts.push([x, y]);
  }
  for (let i = n - 1; i >= 0; i--) {
    const s = i / n;
    const y = lerp(top - 0.02, bottom, s);
    const x = -w * Math.pow(1 - Math.pow(s, 2.4), 0.55);
    pts.push([x, y]);
  }
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    pts.push([lerp(-w, w, t), top - 0.02 + 0.03 * Math.sin(t * Math.PI)]);
  }
  return pts;
}

function circleOutline(r: number, n = 28): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return pts;
}

interface ShieldOpts {
  outline: [number, number][];
  bend: number;
  thick: number;
  face: string;
  back: string;
  rim: string | null;
  rimW?: number;
  rivets?: string | null;
  decal?: { key: string; x0: number; x1: number; y0: number; y1: number } | null;
  planks?: number;
  /** Remap face UVs 0..1 over the outline (for a painted face texture). */
  unitUV?: boolean;
  boss?: string | null;
  bossR?: number;
  bands?: string | null;
  rng?: Rng;
}

/** Board + rim + rivets + optional decal/boss/bands; back grip, brackets, arm strap and pad. */
function shield(wb: WB, o: ShieldOpts) {
  const board = extrude(o.outline, o.thick, 0.003, 2);
  // face at z = 0 at the centre
  board.translate(0, 0, -o.thick / 2 - 0.003);
  bendX(board, o.bend);
  const box3 = new THREE.Box3().setFromBufferAttribute(board.attributes.position as THREE.BufferAttribute);
  const p = board.attributes.position, uv = board.attributes.uv;
  if (o.unitUV) {
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - box3.min.x) / (box3.max.x - box3.min.x), (p.getY(i) - box3.min.y) / (box3.max.y - box3.min.y));
  }
  if (o.rng) dent(board, o.rng, 0.004, 5, 0.08);
  wb.add(o.face, board);
  // back boards (a thin inner skin in a different material so the back reads as bare planks)
  const backB = extrude(o.outline.map(([x, y]) => [x * 0.97, y * 0.97] as [number, number]), 0.002, 0, 2);
  backB.translate(0, 0, -o.thick - 0.006);
  bendX(backB, o.bend);
  wb.add(o.back, backB);
  const zf = (x: number) => -o.bend * x * x;
  // plank seams on the face
  if (o.planks) {
    const xs = [];
    for (let i = 1; i < o.planks; i++) xs.push(lerp(box3.min.x, box3.max.x, i / o.planks));
    for (const x of xs) {
      const pts: V3[] = [];
      const ys = o.outline.filter(([px]) => Math.abs(px - x) < 0.05).map(([, py]) => py);
      const yTop = Math.max(...ys, box3.max.y - 0.05) - 0.02, yBot = Math.min(...ys, 0) + 0.02;
      for (let i = 0; i <= 6; i++) { const y = lerp(yTop, yBot, i / 6); pts.push([x, y, zf(x) + 0.0006]); }
      wb.add('timber_burnt', sweep(pts, { w: 0.0016, h: 0.0006, up: [1, 0, 0], sides: 4, segs: 6 }));
    }
  }
  // rim: sweep around the outline following the bend
  if (o.rim) {
    const pts: V3[] = o.outline.map(([x, y]) => [x, y, zf(x) - o.thick / 2 - 0.002]);
    const rw = o.rimW ?? 0.012;
    wb.add(o.rim, sweep(pts, { w: o.thick / 2 + 0.006, h: rw, up: [0, 0, 1], p: 4, sides: 8, closed: true, poly: true, segs: pts.length }));
    if (o.rivets) {
      const frames = [];
      const step = Math.max(1, Math.floor(o.outline.length / 22));
      for (let i = 0; i < o.outline.length; i += step) {
        const [x, y] = o.outline[i];
        const l = Math.hypot(x, y) || 1;
        frames.push({ p: new THREE.Vector3(x - (x / l) * rw * 0.5, y - (y / l) * rw * 0.5, zf(x) + 0.005), n: new THREE.Vector3(2 * o.bend * x * 0.3, 0, 1).normalize() });
      }
      wb.add(o.rivets, scatter(() => rivet(0.008, 0.006), frames));
    }
  }
  if (o.bands) {
    for (const y of [box3.max.y * 0.55, box3.min.y * 0.45]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 10; i++) { const x = lerp(box3.min.x + 0.02, box3.max.x - 0.02, i / 10); pts.push([x, y, zf(x) + 0.002]); }
      wb.add(o.bands, sweep(pts, { w: 0.02, h: 0.002, up: [0, 1, 0], sides: 4, p: 6, segs: 12 }));
    }
  }
  if (o.decal) {
    const d = o.decal;
    const g = new THREE.PlaneGeometry(d.x1 - d.x0, d.y1 - d.y0, 8, 8);
    g.translate((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, 0);
    const gp = g.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setZ(i, zf(gp.getX(i)) + 0.0012);
    g.computeVertexNormals();
    wb.add(d.key, g);
  }
  if (o.boss) {
    const r = o.bossR ?? 0.07;
    wb.add(o.boss, loft([{ y: r * 0.75, rx: r * 0.15 }, { y: r * 0.6, rx: r * 0.6 }, { y: r * 0.3, rx: r * 0.85 }, { y: 0.0, rx: r }, { y: -0.005, rx: r * 1.25 }, { y: -0.01, rx: r * 1.25 }], { segs: 16, capBottom: true }), { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.002] });
    const fr = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; fr.push({ p: new THREE.Vector3(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, 0.0), n: new THREE.Vector3(0, 0, 1) }); }
    wb.add(o.boss, scatter(() => rivet(0.006), fr));
  }
  // --- back: vertical fist grip, brackets, strap across the forearm, pad
  const gx = -0.13, gz = -0.08;
  const backZ = (x: number) => zf(x) - o.thick - 0.006;
  wb.add('leather', xf(grip(-0.06, 0.06, 0.016), { p: [gx, 0, gz] }));
  for (const s of [1, -1]) {
    const bz0 = backZ(gx), bz1 = gz;
    wb.add('iron', xf(box(0.034, 0.012, Math.abs(bz0 - bz1) + 0.02), { p: [gx, s * 0.07, (bz0 + bz1) / 2] }));
    wb.add('iron', xf(box(0.05, 0.03, 0.004), { p: [gx, s * 0.075, bz0 - 0.001] }));
    wb.add('iron', xf(rivet(0.006), { p: [gx + 0.015, s * 0.075, bz0 - 0.003], r: [-Math.PI / 2, 0, 0] }));
    wb.add('iron', xf(rivet(0.006), { p: [gx - 0.015, s * 0.075, bz0 - 0.003], r: [-Math.PI / 2, 0, 0] }));
  }
  const sx = 0.12;
  const sb = backZ(sx);
  const strap: V3[] = [[sx, -0.075, sb - 0.002], [sx, -0.07, gz - 0.035], [sx, -0.03, gz - 0.058], [sx, 0.03, gz - 0.058], [sx, 0.07, gz - 0.035], [sx, 0.075, sb - 0.002]];
  wb.add('leather_dark', sweep(strap, { w: 0.022, h: 0.003, up: [1, 0, 0], p: 6, sides: 4, segs: 14 }));
  wb.add('iron', xf(box(0.026, 0.004, 0.018), { p: [sx, 0.045, gz - 0.056] }));
  wb.add('leather_dark', xf(loft([
    { y: 0.1, rx: 0.07, rz: 0.012, p: 4 }, { y: -0.1, rx: 0.07, rz: 0.012, p: 4 },
  ], { segs: 12, capTop: true, capBottom: true }), { p: [0.02, 0, backZ(0.02) - 0.012], r: [0, 0, Math.PI / 2] }));
}

// ------------------------------------------------------------------------------------ builders

type Build = () => WeaponModelExt;

function finish(wb: WB, name: string, m: Omit<WeaponModelExt, 'object'>): WeaponModelExt {
  const { object, tris } = wb.build(name);
  return { object, ...m, triangles: tris };
}

const BUILDERS: Record<string, Build> = {
  retainer_sword: () => {
    const wb = new WB();
    wb.add('steel_bright', blade({ y0: 0.1, y1: 0.99, w0: 0.027, w1: 0.019, t0: 0.0045, t1: 0.0028, tip: 0.13, fuller: 0.72, fullerDepth: 0.5 }));
    wb.add('gold_trim|a=emb|po', etching(0.12, 0.25, 0.013, 0.0047));
    wb.add('iron', crossguard(0.093, 0.12, 0.0055, 0.0065, 0.035));
    wb.add('iron', box(0.022, 0.018, 0.042, [0, 0.09, 0]));
    wb.add('leather', grip(-0.1, 0.08, 0.0145));
    wb.add('bronze', collar(0.0, 0.017, 0.016));
    wb.add('bronze', collar(-0.1, 0.0165, 0.012));
    wb.add('bronze', wheelPommel(-0.13, 0.031, 0.026));
    wb.add('bronze', cyl(0.006, 0.004, -0.162, -0.155, 8));
    return finish(wb, 'retainer_sword', { hit: { from: 0.12, to: 0.99, radius: 0.035 }, trail: { from: 0.22, to: 0.99 }, offhandGrip: -0.085 });
  },
  commander_blade: () => {
    const wb = new WB();
    wb.add('steel_armor|t=909098', blade({ y0: 0.11, y1: 1.08, w0: 0.03, w1: 0.02, t0: 0.005, t1: 0.003, tip: 0.14, fuller: 0.7, fullerDepth: 0.55 }));
    wb.add('gold_trim|a=emb|po', etching(0.13, 0.5, 0.008, 0.0045));
    wb.add('bronze', crossguard(0.1, 0.13, 0.007, 0.008, 0.0, 0.03));
    for (const s of [1, -1]) wb.add('bronze', xf(bellGeom(0.035), { p: [0, 0.08, s * 0.132] }));
    wb.add('bronze', box(0.026, 0.02, 0.05, [0, 0.098, 0]));
    wb.add('leather_dark', grip(-0.12, 0.088, 0.015));
    wb.add('bronze', xf(bellGeom(0.06), { p: [0, -0.125, 0], r: [Math.PI, 0, 0] }));
    return finish(wb, 'commander_blade', { hit: { from: 0.13, to: 1.08, radius: 0.04 }, trail: { from: 0.25, to: 1.08 }, offhandGrip: -0.09 });
  },
  corvane_sword: () => {
    const wb = new WB();
    wb.add('steel_armor|t=6a6a72', blade({ y0: 0.14, y1: 1.32, w0: 0.038, w1: 0.026, t0: 0.006, t1: 0.0035, tip: 0.16, fuller: 0.68, fullerDepth: 0.5 }));
    wb.add('gold_trim|a=emb|po', etching(0.16, 0.9, 0.01, 0.0057));
    wb.add('bronze', crossguard(0.125, 0.17, 0.009, 0.01, 0.0, 0.04));
    for (const s of [1, -1]) wb.add('bronze_bell', xf(bellGeom(0.05), { p: [0, 0.1, s * 0.17] }));
    wb.add('bronze', loft([{ y: 0.14, rx: 0.02, rz: 0.045 }, { y: 0.11, rx: 0.018, rz: 0.06 }], { segs: 10, capTop: true, capBottom: true }));
    wb.add('leather_dark', grip(-0.2, 0.11, 0.017));
    wb.add('bronze', collar(-0.045, 0.019, 0.015));
    wb.add('bronze_bell', xf(bellGeom(0.08), { p: [0, -0.2, 0], r: [Math.PI, 0, 0] }));
    return finish(wb, 'corvane_sword', { hit: { from: 0.15, to: 1.32, radius: 0.05 }, trail: { from: 0.3, to: 1.32 }, offhandGrip: -0.13 });
  },
  bellwarden_greatsword: () => {
    const wb = new WB();
    wb.add('steel_bright|t=b0b0b0', blade({ y0: 0.17, y1: 1.5, w0: 0.045, w1: 0.032, t0: 0.007, t1: 0.004, tip: 0.18, fuller: 0.55, fullerDepth: 0.5 }));
    // ricasso with parrying lugs
    wb.add('steel_armor', loft([{ y: 0.34, rx: 0.008, rz: 0.03 }, { y: 0.17, rx: 0.008, rz: 0.03 }], { segs: 8, capTop: true, capBottom: true }));
    for (const s of [1, -1]) wb.add('steel_armor', xf(sweep([[0, 0.33, 0], [0, 0.34, s * 0.04], [0, 0.325, s * 0.055]], { r: 0.006, sides: 6, segs: 5, caps: true })));
    wb.add('iron', crossguard(0.16, 0.22, 0.01, 0.01, 0.04));
    wb.add('iron', box(0.03, 0.03, 0.06, [0, 0.15, 0]));
    wb.add('leather', grip(-0.3, 0.14, 0.017));
    wb.add('bronze', collar(-0.08, 0.019, 0.02));
    wb.add('bronze_bell', xf(bellGeom(0.1), { p: [0, -0.3, 0], r: [Math.PI, 0, 0] }));
    return finish(wb, 'bellwarden_greatsword', { hit: { from: 0.18, to: 1.5, radius: 0.06 }, trail: { from: 0.4, to: 1.5 }, offhandGrip: -0.2 });
  },
  enemy_sword: () => {
    const wb = new WB();
    const rng = new Rng(7);
    wb.add('iron_rusted', blade({ y0: 0.085, y1: 0.86, w0: 0.024, w1: 0.018, t0: 0.004, t1: 0.0028, tip: 0.1, fuller: 0.5, fullerDepth: 0.35, notches: rng }));
    wb.add('iron', crossguard(0.078, 0.095, 0.006, 0.007, 0.0));
    wb.add('leather_dark', grip(-0.07, 0.07, 0.014));
    wb.add('iron', wheelPommel(-0.092, 0.026, 0.022, false));
    return finish(wb, 'enemy_sword', { hit: { from: 0.1, to: 0.86, radius: 0.035 }, trail: { from: 0.2, to: 0.86 } });
  },
  greyford_sabre: () => {
    const wb = new WB();
    wb.add('iron_rusted|t=b0b0b0', blade({ y0: 0.08, y1: 0.86, w0: 0.02, w1: 0.018, t0: 0.004, t1: 0.0025, tip: 0.12, curve: 0.09, single: true, fuller: 0.6, fullerDepth: 0.3 }));
    // stirrup hilt: knuckle bow from the guard to the pommel on the edge side
    wb.add('iron', sweep([[0, 0.075, -0.03], [0, 0.078, 0.045], [0, 0.03, 0.06], [0, -0.05, 0.05], [0, -0.09, 0.012]], { w: 0.004, h: 0.006, up: [1, 0, 0], sides: 6, p: 4, segs: 14, caps: true }));
    wb.add('leather_dark', grip(-0.07, 0.07, 0.014));
    wb.add('iron', loft([{ y: -0.07, rx: 0.016, rz: 0.02 }, { y: -0.09, rx: 0.014, rz: 0.018 }, { y: -0.1, rx: 0.008 }], { segs: 10, capBottom: true }));
    wb.add('unlived_crack', xf(sweep([[0.0045, 0.25, -0.004], [0.0045, 0.3, 0.003], [0.0042, 0.36, -0.002]], { r: 0.0012, sides: 4, segs: 6 })));
    return finish(wb, 'greyford_sabre', { hit: { from: 0.1, to: 0.86, radius: 0.035 }, trail: { from: 0.2, to: 0.86 } });
  },
  parrying_dirk: () => {
    const wb = new WB();
    wb.add('steel_bright', blade({ y0: 0.06, y1: 0.33, w0: 0.019, w1: 0.012, t0: 0.005, t1: 0.003, tip: 0.07, p: 1.2 }));
    wb.add('iron', crossguard(0.055, 0.07, 0.005, 0.005, -0.012));
    wb.add('iron', xf(torus(0.022, 0.0035, 5, 14), { p: [0.024, 0.07, 0], r: [0, 0, Math.PI / 2] }));
    wb.add('leather', grip(-0.05, 0.05, 0.013));
    wb.add('bronze', xf(ellipsoid(0.016, 0.016, 0.016, { segs: 10, rows: 6 }), { p: [0, -0.066, 0] }));
    return finish(wb, 'parrying_dirk', { hit: { from: 0.06, to: 0.33, radius: 0.025 }, trail: { from: 0.1, to: 0.33 } });
  },
  oath_estoc: () => {
    const wb = new WB();
    wb.add('steel_bright', blade({ y0: 0.1, y1: 1.12, w0: 0.012, w1: 0.009, t0: 0.007, t1: 0.004, tip: 0.2, p: 1.15 }));
    wb.add('iron', crossguard(0.092, 0.11, 0.005, 0.006, -0.015));
    wb.add('iron', sweep([[0, 0.09, 0.11], [0, 0.04, 0.085], [0, -0.03, 0.065], [0, -0.09, 0.03], [0, -0.11, 0.0]], { r: 0.004, sides: 6, segs: 12 }));
    wb.add('iron', xf(torus(0.024, 0.0035, 5, 14), { p: [0.026, 0.1, 0], r: [0, 0, Math.PI / 2] }));
    wb.add('leather_dark', grip(-0.1, 0.085, 0.013));
    wb.add('iron', loft([{ y: -0.1, rx: 0.012 }, { y: -0.115, rx: 0.02 }, { y: -0.14, rx: 0.017 }, { y: -0.155, rx: 0.006 }], { segs: 10, capBottom: true }));
    return finish(wb, 'oath_estoc', { hit: { from: 0.12, to: 1.12, radius: 0.022 }, trail: { from: 0.3, to: 1.12 }, offhandGrip: -0.075 });
  },
  mourning_mace: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.13, 0.46, 0.016, 0.018));
    wb.add('leather', grip(-0.1, 0.09, 0.0185));
    wb.add('iron', collar(0.46, 0.022, 0.03));
    wb.add('iron', collar(-0.13, 0.02, 0.02));
    // bell-shaped flanged head
    wb.add('bronze_bell', loft([{ y: 0.66, rx: 0.012 }, { y: 0.63, rx: 0.028 }, { y: 0.56, rx: 0.036 }, { y: 0.5, rx: 0.048 }, { y: 0.475, rx: 0.05 }], { segs: 16, capTop: true, capBottom: true }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const fin = extrude([[0, 0], [0.03, 0.015], [0.034, 0.1], [0.012, 0.16], [0, 0.17]], 0.007, 0.001);
      wb.add('bronze', fin, { p: [Math.sin(a) * 0.028, 0.48, Math.cos(a) * 0.028], r: [0, a - Math.PI / 2, 0] });
    }
    wb.add('bronze', loft([{ y: 0.72, rx: 0.002 }, { y: 0.66, rx: 0.012 }], { segs: 8, capBottom: true }));
    return finish(wb, 'mourning_mace', { hit: { from: 0.44, to: 0.72, radius: 0.08 }, trail: { from: 0.45, to: 0.7 } });
  },
  hand_bell: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.07, 0.07, 0.015, 0.013));
    wb.add('bronze', collar(0.075, 0.016, 0.018));
    wb.add('bronze', xf(ellipsoid(0.017, 0.012, 0.017, { segs: 10, rows: 5 }), { p: [0, -0.078, 0] }));
    const bell = [
      { y: 0.084, rx: 0.014 }, { y: 0.1, rx: 0.028 }, { y: 0.13, rx: 0.034 }, { y: 0.16, rx: 0.042 }, { y: 0.18, rx: 0.054 }, { y: 0.19, rx: 0.058 },
    ];
    wb.add('bronze_bell', loft(bell, { segs: 18, capBottom: true }));
    wb.add('bronze_bell', inside(loft(bell.slice(1).map((r) => ({ ...r, rx: r.rx - 0.004 })), { segs: 18 })));
    wb.add('iron', cyl(0.0025, 0.0025, 0.09, 0.165, 5));
    wb.add('iron', xf(ellipsoid(0.01, 0.012, 0.01, { segs: 8, rows: 5 }), { p: [0, 0.17, 0] }));
    wb.add('gold_trim', loft([{ y: 0.172, rx: 0.049 }, { y: 0.162, rx: 0.045 }], { segs: 18, inflate: 0.002 }));
    return finish(wb, 'hand_bell', { hit: null, castPoint: new THREE.Vector3(0, 0.2, 0), trail: { from: 0.1, to: 0.2 } });
  },
  court_staff: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.62, 1.06, 0.015, 0.018, 8));
    wb.add('leather_dark', grip(-0.11, 0.11, 0.0185));
    for (const y of [-0.13, 0.13, 0.55, 0.98]) wb.add('bronze', collar(y, 0.021, 0.022));
    wb.add('bronze', loft([{ y: -0.6, rx: 0.017 }, { y: -0.66, rx: 0.012 }, { y: -0.68, rx: 0.004 }], { segs: 8, capBottom: true }));
    // spiral carved inlay up the upper shaft
    const sp: V3[] = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; const a = t * TAU * 3; sp.push([Math.sin(a) * 0.0185, lerp(0.15, 0.95, t), Math.cos(a) * 0.0185]); }
    wb.add('gold_trim', sweep(sp, { r: 0.0022, sides: 4, segs: 60 }));
    // head: collar cup, two arms up to an armillary of three rings around a glowing orb, star finial
    wb.add('bronze', loft([{ y: 1.1, rx: 0.03 }, { y: 1.08, rx: 0.034 }, { y: 1.05, rx: 0.02 }, { y: 1.02, rx: 0.02 }], { segs: 12, capTop: true, capBottom: true }));
    const c = 1.22;
    wb.add('bronze', xf(torus(0.1, 0.007, 6, 32), { p: [0, c, 0], r: [Math.PI / 2, 0, 0] }));
    wb.add('bronze', xf(torus(0.085, 0.005, 6, 28), { p: [0, c, 0], r: [Math.PI / 2, Math.PI / 2, 0] }));
    wb.add('gold_trim', xf(torus(0.07, 0.004, 6, 24), { p: [0, c, 0], r: [0.6, 0.4, 0.3] }));
    // degree ticks on the outer ring
    const ticks: G[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      ticks.push(xf(box(0.004, 0.012, 0.004), { p: [0, c + Math.cos(a) * 0.109, Math.sin(a) * 0.109], r: [a, 0, 0] }));
    }
    wb.add('bronze', merge(ticks));
    for (const s of [1, -1]) wb.add('bronze', sweep([[0, 1.1, s * 0.03], [0, 1.13, s * 0.08], [0, c - 0.03, s * 0.1]], { r: 0.005, sides: 6, segs: 8 }));
    wb.add('bell_light', xf(ellipsoid(0.028, 0.028, 0.028, { segs: 12, rows: 8 }), { p: [0, c, 0] }));
    wb.add('bronze', xf(torus(0.03, 0.003, 4, 16), { p: [0, c, 0], r: [0, 0, 0] }));
    const star: [number, number][] = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const r = i % 2 ? 0.012 : 0.034; star.push([Math.sin(a) * r, Math.cos(a) * r]); }
    wb.add('gold_trim', extrude(star, 0.006, 0.001), { p: [0, c + 0.14, 0] });
    wb.add('bronze', cyl(0.004, 0.004, c + 0.1, c + 0.12, 6));
    return finish(wb, 'court_staff', { hit: { from: 0.95, to: 1.36, radius: 0.1 }, castPoint: new THREE.Vector3(0, c, 0), trail: { from: 1.0, to: 1.36 }, offhandGrip: -0.36 });
  },
  mint_seal_staff: () => {
    const wb = new WB();
    wb.add('timber', shaft(-0.62, 1.08, 0.016, 0.018, 8));
    wb.add('leather', grip(-0.11, 0.11, 0.019));
    for (const y of [-0.13, 0.13, 1.0]) wb.add('bronze', collar(y, 0.022, 0.024));
    // fork holding a large coin-die (disc faces ±Z)
    for (const s of [1, -1]) wb.add('bronze', sweep([[0, 1.02, 0], [s * 0.06, 1.1, 0], [s * 0.115, 1.24, 0]], { r: 0.008, sides: 6, segs: 8 }));
    const c = 1.26;
    wb.add('bronze', xf(loft([{ y: 0.022, rx: 0.1 }, { y: 0.018, rx: 0.108 }, { y: -0.018, rx: 0.108 }, { y: -0.022, rx: 0.1 }], { segs: 28, capTop: true, capBottom: true }), { p: [0, c, 0], r: [Math.PI / 2, 0, 0] }));
    // die face relief: raised rim, crown and bell
    for (const s of [1, -1]) {
      wb.add('gold_trim', xf(torus(0.085, 0.004, 4, 28), { p: [0, c, s * 0.022] }), { r: [Math.PI / 2, 0, 0] });
      wb.add('gold_trim', xf(bellGeom(0.07), { p: [0, c + 0.035, s * 0.022], s: [1, 1, 0.3] }));
      const crown: [number, number][] = [[-0.035, 0], [-0.035, 0.02], [-0.02, 0.01], [0, 0.03], [0.02, 0.01], [0.035, 0.02], [0.035, 0]];
      wb.add('gold_trim', extrude(crown, 0.004, 0), { p: [0, c + 0.045, s * 0.024] });
    }
    wb.add('bell_light', xf(ellipsoid(0.012, 0.012, 0.012, { segs: 8, rows: 5 }), { p: [0, c + 0.13, 0] }));
    return finish(wb, 'mint_seal_staff', { hit: { from: 0.98, to: 1.37, radius: 0.11 }, castPoint: new THREE.Vector3(0, c, 0), trail: { from: 1.0, to: 1.37 }, offhandGrip: -0.36 });
  },
  pilgrim_censer: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.07, 0.1, 0.014, 0.013));
    wb.add('bronze', collar(0.105, 0.017, 0.02));
    wb.add('bronze', xf(torus(0.014, 0.003, 4, 10), { p: [0, 0.125, 0], r: [0, 0, Math.PI / 2] }));
    wb.add('bronze', chain([[0, 0.13, 0], [0, 0.26, 0.004], [0, 0.4, 0]], 0.024, 0.003));
    // vessel: lower bowl, pierced lid with gaps showing embers, finial
    const c = 0.49;
    wb.add('bronze', loft([{ y: c - 0.005, rx: 0.052 }, { y: c - 0.03, rx: 0.048 }, { y: c - 0.06, rx: 0.03 }, { y: c - 0.075, rx: 0.012 }], { segs: 16, capBottom: true }));
    wb.add('bronze', loft([{ y: c + 0.075, rx: 0.01 }, { y: c + 0.06, rx: 0.022 }, { y: c + 0.03, rx: 0.044 }, { y: c + 0.012, rx: 0.052 }], { segs: 16, capTop: true, radial: (th, v) => (v > 0.4 && Math.abs(Math.sin(th * 4)) > 0.8 ? 0.5 : 1) }));
    wb.add('ember_glow', xf(ellipsoid(0.042, 0.03, 0.042, { segs: 12, rows: 6 }), { p: [0, c + 0.005, 0] }));
    wb.add('bronze', xf(torus(0.052, 0.004, 4, 20), { p: [0, c - 0.004, 0] }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      wb.add('bronze', chain([[0, 0.4, 0], [Math.sin(a) * 0.05, c - 0.004, Math.cos(a) * 0.05]], 0.018, 0.0025));
    }
    return finish(wb, 'pilgrim_censer', { hit: { from: 0.4, to: 0.58, radius: 0.07 }, castPoint: new THREE.Vector3(0, c, 0), trail: { from: 0.42, to: 0.56 } });
  },
  huntsman_bow: () => bow('huntsman_bow', 0.58, 0.11, 0.07, 'timber_dark', true),
  enemy_bow: () => bow('enemy_bow', 0.75, 0.13, 0.02, 'timber|t=909090', false),
  skinning_knife: () => {
    const wb = new WB();
    wb.add('steel_bright', blade({ y0: 0.05, y1: 0.21, w0: 0.017, w1: 0.016, t0: 0.003, t1: 0.002, tip: 0.07, curve: -0.02, single: true }));
    wb.add('bronze', collar(0.047, 0.015, 0.01));
    wb.add('bone', loft([{ y: 0.045, rx: 0.012, rz: 0.015 }, { y: 0.0, rx: 0.013, rz: 0.017 }, { y: -0.05, rx: 0.012, rz: 0.016 }, { y: -0.062, rx: 0.008 }], { segs: 10, capTop: true, capBottom: true, radial: (th, v) => 1 + 0.06 * Math.sin(v * 30) }));
    return finish(wb, 'skinning_knife', { hit: { from: 0.05, to: 0.21, radius: 0.022 }, trail: { from: 0.07, to: 0.21 } });
  },
  throwing_knife: () => {
    const wb = new WB();
    wb.add('iron', blade({ y0: 0.03, y1: 0.17, w0: 0.013, w1: 0.009, t0: 0.0025, t1: 0.0018, tip: 0.05, p: 1.2 }));
    wb.add('iron', loft([{ y: 0.03, rx: 0.004, rz: 0.012 }, { y: -0.04, rx: 0.004, rz: 0.008 }], { segs: 8, capTop: true, capBottom: true }));
    wb.add('cloth_linen|t=8a7a6a', loft([{ y: 0.025, rx: 0.007, rz: 0.012 }, { y: -0.03, rx: 0.007, rz: 0.01 }], { segs: 8, radial: (th, v) => 1 + 0.1 * Math.abs(Math.sin(v * 25 + th)) }));
    wb.add('iron', xf(torus(0.01, 0.0025, 4, 10), { p: [0, -0.05, 0], r: [0, 0, Math.PI / 2] }));
    return finish(wb, 'throwing_knife', { hit: { from: 0.03, to: 0.17, radius: 0.015 }, trail: { from: 0.05, to: 0.17 } });
  },
  arrow: () => missile('arrow', 0.74, 0.0045, 'timber', 'iron', 'cloth_linen|t=a09888'),
  iron_bolt: () => missile('iron_bolt', 0.36, 0.006, 'timber_dark', 'iron', 'leather'),
  condemned_chain: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.12, 0.15, 0.017, 0.019));
    for (const y of [-0.12, 0.02, 0.15]) wb.add('iron', collar(y, 0.022, 0.018));
    wb.add('rope', loft([{ y: 0.1, rx: 0.02 }, { y: -0.08, rx: 0.02 }], { segs: 10, radial: (th, v) => 1 + 0.1 * Math.abs(Math.sin(v * 30 + th)) }));
    wb.add('iron', xf(torus(0.014, 0.004, 5, 10), { p: [0, 0.172, 0], r: [0, 0, Math.PI / 2] }));
    wb.add('iron', chain([[0, 0.18, 0], [0, 0.36, 0.03], [0, 0.55, 0.02], [0, 0.64, 0]], 0.04, 0.006));
    const ball = ellipsoid(0.06, 0.06, 0.06, { segs: 12, rows: 8 });
    wb.add('iron_rusted', ball, { p: [0, 0.71, 0] });
    const spikes: G[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, e = (i % 2 ? 0.5 : -0.4);
      const d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
      const g = loft([{ y: 0.035, rx: 0.001 }, { y: 0, rx: 0.012 }], { segs: 5, capBottom: true });
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      g.applyQuaternion(q);
      g.translate(d.x * 0.055, 0.71 + d.y * 0.055, d.z * 0.055);
      spikes.push(g);
    }
    spikes.push(loft([{ y: 0.81, rx: 0.001 }, { y: 0.765, rx: 0.012 }], { segs: 5, capBottom: true }));
    wb.add('iron', merge(spikes));
    return finish(wb, 'condemned_chain', { hit: { from: 0.3, to: 0.8, radius: 0.09 }, trail: { from: 0.55, to: 0.8 } });
  },
  enemy_spear: () => spear('enemy_spear', { butt: -0.735, top: 1.36, head: 0.3, mat: 'timber|t=8a8a8a', metal: 'iron_rusted', wings: true }),
  garrison_spear: () => spear('garrison_spear', { butt: -0.77, top: 1.43, head: 0.3, mat: 'timber', metal: 'iron', wings: false, pennant: true }),
  gatewarden_halberd: () => {
    const wb = new WB();
    const butt = -0.7, top = 1.32;
    wb.add('timber_dark', shaft(butt, top, 0.017, 0.018, 8));
    wb.add('leather', grip(-0.1, 0.1, 0.019));
    wb.add('iron', loft([{ y: butt + 0.02, rx: 0.02 }, { y: butt - 0.06, rx: 0.004 }], { segs: 8, capTop: true, capBottom: true }));
    // langets up the shaft
    for (const s of [1, -1]) wb.add('iron', xf(box(0.004, 0.3, 0.012), { p: [s * 0.018, top - 0.13, 0] }));
    // axe blade (edge +Z), back hook (−Z), top spike
    const axe = extrude([[0, -0.08], [0.06, -0.12], [0.16, -0.16], [0.2, -0.05], [0.21, 0.06], [0.17, 0.16], [0.06, 0.09], [0, 0.06]], 0.008, 0.002);
    axe.rotateY(-Math.PI / 2);
    wb.add('steel_armor', axe, { p: [0, top - 0.02, 0.012] });
    const hook = extrude([[0, -0.03], [0.08, -0.012], [0.14, 0.04], [0.07, 0.01], [0, 0.03]], 0.008, 0.001);
    hook.rotateY(Math.PI / 2);
    wb.add('steel_armor', hook, { p: [0, top + 0.01, -0.012] });
    wb.add('steel_armor', loft([{ y: top + 0.36, rx: 0.002, rz: 0.001 }, { y: top + 0.2, rx: 0.012, rz: 0.02, p: 1.4 }, { y: top + 0.06, rx: 0.01, rz: 0.014, p: 1.4 }, { y: top - 0.03, rx: 0.02 }], { segs: 10, capBottom: true }));
    wb.add('bronze', collar(top - 0.04, 0.024, 0.03));
    return finish(wb, 'gatewarden_halberd', { hit: { from: top - 0.18, to: top + 0.36, radius: 0.12 }, trail: { from: top - 0.1, to: top + 0.36 }, offhandGrip: 0.55 });
  },
  coinbreaker_hammer: () => {
    const wb = new WB();
    wb.add('timber_dark', shaft(-0.22, 0.64, 0.017, 0.019, 8));
    wb.add('leather', grip(-0.2, 0.08, 0.02));
    for (const y of [0.35, 0.5]) wb.add('iron', collar(y, 0.022, 0.02));
    const c = 0.7;
    wb.add('iron', xf(box(0.085, 0.085, 0.2), { p: [0, c, -0.01] }));
    wb.add('iron', xf(box(0.095, 0.095, 0.02), { p: [0, c, 0.085] }));
    // die face on +Z with coin relief
    wb.add('bronze', xf(loft([{ y: 0.012, rx: 0.042 }, { y: 0.0, rx: 0.045 }], { segs: 20, capTop: true }), { p: [0, c, 0.095], r: [Math.PI / 2, 0, 0] }));
    wb.add('gold_trim', xf(torus(0.034, 0.003, 4, 20), { p: [0, c, 0.108], r: [Math.PI / 2, 0, 0] }));
    wb.add('gold_trim', xf(bellGeom(0.04), { p: [0, c + 0.02, 0.107], s: [1, 1, 0.25] }));
    // back spike and straps
    wb.add('iron', loft([{ y: 0.07, rx: 0.002 }, { y: 0.0, rx: 0.03, rz: 0.03, p: 4 }], { segs: 8, capBottom: true }), { p: [0, c, -0.11], r: [-Math.PI / 2, 0, 0] });
    for (const s of [1, -1]) wb.add('iron', xf(box(0.004, 0.16, 0.02), { p: [s * 0.022, c - 0.1, 0] }));
    return finish(wb, 'coinbreaker_hammer', { hit: { from: c - 0.12, to: c + 0.1, radius: 0.12 }, trail: { from: c - 0.05, to: c + 0.05 }, offhandGrip: -0.16 });
  },
  woodsman_axe: () => {
    const wb = new WB();
    const pts: V3[] = [[0, -0.16, 0.0], [0, 0.1, -0.01], [0, 0.35, 0.0], [0, 0.6, 0.015]];
    wb.add('timber', sweep(pts, { w: 0.017, h: 0.014, up: [0, 0, 1], sides: 8, segs: 12, caps: true }));
    wb.add('leather', grip(-0.1, 0.08, 0.019));
    const head = extrude([[-0.03, -0.03], [0.05, -0.035], [0.12, -0.1], [0.15, -0.09], [0.15, 0.06], [0.12, 0.07], [0.05, 0.03], [-0.03, 0.035], [-0.06, 0.02], [-0.06, -0.02]], 0.014, 0.003);
    head.rotateY(-Math.PI / 2);
    // thin the bit toward the edge
    const hp = head.attributes.position;
    for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); hp.setX(i, hp.getX(i) * Math.max(0.2, 1 - Math.max(0, z) * 5)); }
    head.computeVertexNormals();
    wb.add('iron', head, { p: [0, 0.52, 0.0] });
    wb.add('steel_bright', xf(box(0.004, 0.14, 0.012), { p: [0, 0.505, 0.148] }));
    return finish(wb, 'woodsman_axe', { hit: { from: 0.42, to: 0.62, radius: 0.1 }, trail: { from: 0.45, to: 0.6 } });
  },
  garrison_arbalest: () => {
    const wb = new WB();
    // stock (top = −Z), trigger grip at origin
    wb.add('timber', loft([
      { y: 0.46, rx: 0.02, rz: 0.022, p: 3 }, { y: 0.2, rx: 0.022, rz: 0.028, p: 3 }, { y: 0.02, rx: 0.02, rz: 0.03, p: 3 }, { y: -0.12, rx: 0.022, rz: 0.04, cz: 0.012, p: 3 }, { y: -0.3, rx: 0.024, rz: 0.05, cz: 0.02, p: 3 },
    ], { segs: 10, capTop: true, capBottom: true }));
    wb.add('iron', xf(box(0.01, 0.2, 0.004), { p: [0, 0.3, -0.024] }));
    // steel prod along ±X
    const prod: V3[] = [];
    for (let i = 0; i <= 10; i++) { const t = lerp(-1, 1, i / 10); prod.push([t * 0.3, 0.42 - Math.abs(t) ** 2 * 0.06, -0.012]); }
    wb.add('steel_armor', sweep(prod, { w: 0.006, h: (t) => 0.012 * (1 - Math.abs(t - 0.5)), up: [0, 1, 0], sides: 6, p: 4, segs: 16 }));
    wb.add('rope', sweep([[0.298, 0.36, -0.012], [0, 0.16, -0.02], [-0.298, 0.36, -0.012]], { r: 0.002, sides: 4, segs: 8, poly: true }));
    wb.add('iron', xf(torus(0.04, 0.005, 4, 14, Math.PI), { p: [0, 0.47, 0], r: [0, 0, 0] }));
    wb.add('iron', xf(box(0.03, 0.03, 0.02), { p: [0, 0.16, -0.028] }));
    wb.add('iron', xf(box(0.006, 0.07, 0.006), { p: [0, -0.02, 0.04], r: [0.3, 0, 0] }));
    // loaded bolt
    wb.add('timber_dark', cyl(0.005, 0.005, 0.17, 0.46, 6), { p: [0, 0, -0.03] });
    wb.add('iron', loft([{ y: 0.5, rx: 0.001 }, { y: 0.46, rx: 0.008, p: 1.3 }], { segs: 4, capBottom: true }), { p: [0, 0, -0.03] });
    return finish(wb, 'garrison_arbalest', { hit: null, castPoint: new THREE.Vector3(0, 0.5, -0.03), trail: undefined, offhandGrip: 0.25 });
  },
  household_shield: () => {
    const wb = new WB();
    const mat = getMaterial('shield_household') as THREE.MeshStandardMaterial;
    const painted = !!mat.map; // the render module's painted face texture (royal arms baked in)
    const outline = heaterOutline(0.27, 0.35, -0.45);
    shield(wb, {
      outline, bend: 0.85, thick: 0.02, face: painted ? 'shield_household' : 'timber_dark|t=6a6a6a', back: 'planks', rim: 'steel_armor', rimW: 0.013,
      rivets: 'iron', planks: painted ? 0 : 5, unitUV: painted,
      decal: painted ? null : { key: 'gold_trim|a=arms|po', x0: -0.16, x1: 0.16, y0: -0.25, y1: 0.28 }, rng: new Rng(3),
    });
    return finish(wb, 'household_shield', { hit: { from: -0.4, to: 0.34, radius: 0.24 }, trail: undefined });
  },
  tower_shield: () => towerShield('tower_shield', false),
  greyford_tower_shield: () => towerShield('greyford_tower_shield', true),
  mint_buckler: () => {
    const wb = new WB();
    const r = 0.17;
    // domed face
    const face = loft([{ y: 0.035, rx: 0.02 }, { y: 0.03, rx: r * 0.5 }, { y: 0.015, rx: r * 0.85 }, { y: 0.0, rx: r }, { y: -0.012, rx: r }], { segs: 24, capTop: true, capBottom: true });
    face.rotateX(Math.PI / 2);
    wb.add('steel_armor', face);
    wb.add('bronze', xf(torus(r, 0.01, 6, 28), { r: [Math.PI / 2, 0, 0], p: [0, 0, -0.003] }));
    wb.add('bronze', xf(loft([{ y: 0.03, rx: 0.01 }, { y: 0.02, rx: 0.035 }, { y: 0.0, rx: 0.045 }], { segs: 14, capTop: true }), { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.03] }));
    const fr = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; fr.push({ p: new THREE.Vector3(Math.cos(a) * (r - 0.018), Math.sin(a) * (r - 0.018), 0.006), n: new THREE.Vector3(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 1).normalize() }); }
    wb.add('bronze', scatter(() => rivet(0.006), fr));
    // back: fist bar over the fist position and a forearm strap
    wb.add('leather', xf(grip(-0.05, 0.05, 0.015), { p: [-0.13, 0, -0.07] }));
    for (const s of [1, -1]) wb.add('iron', xf(box(0.02, 0.01, 0.06), { p: [-0.13, s * 0.055, -0.04] }));
    wb.add('leather_dark', sweep([[0.1, -0.07, -0.015], [0.1, -0.06, -0.12], [0.1, 0.06, -0.12], [0.1, 0.07, -0.015]], { w: 0.018, h: 0.003, up: [1, 0, 0], sides: 4, segs: 10 }));
    return finish(wb, 'mint_buckler', { hit: { from: -0.17, to: 0.17, radius: 0.17 }, trail: undefined });
  },
  pilgrim_roundshield: () => {
    const wb = new WB();
    shield(wb, {
      outline: circleOutline(0.3, 32), bend: 0.5, thick: 0.022, face: 'planks|t=8a8070', back: 'planks', rim: 'iron', rimW: 0.012,
      rivets: 'iron', planks: 5, decal: { key: 'cloth_linen|t=c8b89a|a=cath|po', x0: -0.18, x1: 0.18, y0: -0.18, y1: 0.18 }, boss: 'iron', bossR: 0.065, rng: new Rng(5),
    });
    return finish(wb, 'pilgrim_roundshield', { hit: { from: -0.3, to: 0.3, radius: 0.28 }, trail: undefined });
  },
};

function towerShield(name: string, battered: boolean): WeaponModelExt {
  const wb = new WB();
  const w = 0.31, top = 0.6, bot = -0.66;
  const outline: [number, number][] = [];
  const rng = new Rng(battered ? 11 : 13);
  // rounded-top rectangle, battered: chipped edges
  const add = (x: number, y: number) => outline.push([x + (battered ? rng.range(-0.012, 0.012) : 0), y + (battered ? rng.range(-0.01, 0.01) : 0)]);
  for (let i = 0; i <= 8; i++) add(w, lerp(top - 0.06, bot + 0.06, i / 8));
  add(w - 0.06, bot);
  for (let i = 1; i < 6; i++) add(lerp(w - 0.06, -w + 0.06, i / 6), bot);
  add(-w + 0.06, bot);
  for (let i = 0; i <= 8; i++) add(-w, lerp(bot + 0.06, top - 0.06, i / 8));
  for (let i = 0; i <= 8; i++) { const t = i / 8; add(lerp(-w, w, t) * 0.97, top - 0.06 + Math.sin(t * Math.PI) * 0.06); }
  shield(wb, {
    outline, bend: 0.75, thick: 0.03, face: battered ? 'planks|t=6a6a70' : 'planks|t=5a5048', back: 'planks', rim: 'iron_rusted', rimW: 0.018,
    rivets: 'iron', planks: 6, bands: 'iron_rusted',
    decal: { key: battered ? 'cloth_linen|t=8a9aa8|a=army|po' : 'cloth_red|t=d0a090|a=army|po', x0: -0.2, x1: 0.2, y0: -0.18, y1: 0.22 },
    boss: 'iron_rusted', bossR: 0.07, rng,
  });
  // vertical spine ridge
  const pts: V3[] = [];
  for (let i = 0; i <= 8; i++) pts.push([0, lerp(top - 0.05, bot + 0.04, i / 8), 0.004]);
  wb.add('iron_rusted', sweep(pts, { w: 0.018, h: 0.006, up: [1, 0, 0], sides: 6, p: 4, segs: 10 }));
  if (battered) {
    const cr: V3[] = [[0.12, 0.45, 0.004], [0.08, 0.3, 0.006], [0.1, 0.12, 0.004], [0.05, -0.05, 0.005]];
    wb.add('unlived_crack', sweep(cr.map(([x, y, z]) => [x, y, z - 0.75 * x * x + 0.001] as V3), { w: 0.003, h: 0.0008, up: [0, 0, 1], sides: 4, segs: 10 }));
  }
  return finish(wb, name, { hit: { from: bot + 0.05, to: top, radius: 0.3 }, trail: undefined });
}

function bow(name: string, half: number, draw: number, recurve: number, mat: string, fancy: boolean): WeaponModelExt {
  const wb = new WB();
  const limb = (s: 1 | -1) => {
    const pts: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = s * (0.07 + (half - 0.07) * t);
      let z = -draw * Math.pow(t, 1.7);
      if (t > 0.82) z += recurve * Math.pow((t - 0.82) / 0.18, 2);
      pts.push([0, y, z]);
    }
    return pts;
  };
  const tipZ = (s: 1 | -1) => limb(s)[10];
  for (const s of [1, -1] as const) {
    wb.add(mat, sweep(limb(s), { w: (t) => lerp(0.016, 0.006, t), h: (t) => lerp(0.011, 0.005, t), up: [1, 0, 0], sides: 8, segs: 14, caps: true }));
    if (fancy) wb.add('bone', xf(loft([{ y: 0.025, rx: 0.002 }, { y: 0.0, rx: 0.007 }], { segs: 6, capBottom: true }), { p: tipZ(s), r: [s > 0 ? 0 : Math.PI, 0, 0] }));
  }
  // riser
  wb.add(mat, loft([{ y: 0.09, rx: 0.016, rz: 0.012 }, { y: 0.0, rx: 0.017, rz: 0.018, cz: 0.004 }, { y: -0.09, rx: 0.016, rz: 0.012 }], { segs: 10 }));
  wb.add('leather', grip(-0.055, 0.055, 0.019));
  if (fancy) { wb.add('bronze', collar(0.065, 0.02, 0.012)); wb.add('bronze', collar(-0.065, 0.02, 0.012)); }
  const a = tipZ(1), b = tipZ(-1);
  wb.add('cloth_linen|t=d0c8b0', sweep([[0, a[1] - 0.01, a[2] - 0.004], [0, b[1] + 0.01, b[2] - 0.004]], { r: 0.0015, sides: 4, segs: 2, poly: true }));
  return finish(wb, name, { hit: null, trail: undefined });
}

function missile(name: string, len: number, r: number, wood: string, head: string, fletch: string): WeaponModelExt {
  const wb = new WB();
  // origin just ahead of the nock (where the drawing fingers pinch), head toward +Y
  wb.add(wood, cyl(r, r, -0.02, len - 0.04, 6));
  wb.add(head, loft([{ y: len + 0.03, rx: 0.0008 }, { y: len - 0.01, rx: r * 1.8, p: 1.3 }, { y: len - 0.035, rx: r * 1.1 }], { segs: 4, capBottom: true }));
  wb.add('bone', cyl(r * 1.1, r * 1.1, -0.03, -0.018, 6));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const vane = extrude([[0, 0], [0.012, 0.02], [0.012, 0.11], [0, 0.13]], 0.001, 0);
    vane.rotateY(Math.PI / 2);
    wb.add(fletch, vane, { p: [0, 0.0, 0], r: [0, a, 0] });
  }
  return finish(wb, name, { hit: { from: len - 0.1, to: len + 0.03, radius: 0.015 }, trail: { from: 0.0, to: len } });
}

function spear(name: string, o: { butt: number; top: number; head: number; mat: string; metal: string; wings: boolean; pennant?: boolean }): WeaponModelExt {
  const wb = new WB();
  wb.add(o.mat, shaft(o.butt, o.top, 0.015, 0.016, 8));
  wb.add('leather', grip(-0.1, 0.1, 0.018));
  wb.add(o.metal, loft([{ y: o.butt + 0.05, rx: 0.018 }, { y: o.butt - 0.02, rx: 0.014 }, { y: o.butt - 0.07, rx: 0.003 }], { segs: 8, capTop: true, capBottom: true }));
  // socket + leaf head (edges along ±Z)
  wb.add(o.metal, loft([{ y: o.top + 0.06, rx: 0.012 }, { y: o.top - 0.08, rx: 0.019 }], { segs: 8, capBottom: true }));
  const h0 = o.top + 0.05;
  const leaf: Ring[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    leaf.push({ y: h0 + o.head * t, rx: lerp(0.01, 0.002, t), rz: Math.max(0.001, 0.038 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - t * 0.2)), p: 1.3 });
  }
  wb.add(o.metal, loft(leaf, { segs: 10, capTop: true }));
  if (o.wings) for (const s of [1, -1]) wb.add(o.metal, xf(loft([{ y: 0.004, rx: 0.004, rz: 0.004 }, { y: -0.004, rx: 0.004, rz: 0.004 }], { segs: 4 }), { s: [1, 1, 12], p: [0, o.top - 0.03, s * 0.03] }));
  wb.add('rope', loft([{ y: o.top - 0.08, rx: 0.018 }, { y: o.top - 0.13, rx: 0.018 }], { segs: 8, radial: (th, v) => 1 + 0.1 * Math.abs(Math.sin(v * 12 + th)) }));
  if (o.pennant) {
    const g = new THREE.PlaneGeometry(0.22, 0.1, 6, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.11; p.setZ(i, Math.sin(x * 25) * 0.015); p.setY(i, p.getY(i) * (1 - x * 2.5)); p.setX(i, x); }
    g.computeVertexNormals();
    g.rotateY(Math.PI / 2);
    wb.add('cloth_red|t=a08080|ds', g, { p: [0, o.top - 0.16, -0.01] });
  }
  return finish(wb, name, { hit: { from: o.top - 0.05, to: o.top + 0.05 + o.head, radius: 0.05 }, trail: { from: o.top - 0.2, to: o.top + 0.05 + o.head }, offhandGrip: 0.55 });
}

// ------------------------------------------------------------------------------------ entry

const warned = new Set<string>();
const ALIASES: [RegExp, string][] = [
  [/greatsword|claymore/, 'bellwarden_greatsword'], [/halberd|glaive|poleaxe/, 'gatewarden_halberd'], [/spear|pike/, 'garrison_spear'],
  [/sabre|saber|scimitar/, 'greyford_sabre'], [/estoc|rapier/, 'oath_estoc'], [/dirk|dagger|knife/, 'parrying_dirk'],
  [/hammer|maul/, 'coinbreaker_hammer'], [/axe/, 'woodsman_axe'], [/mace|club/, 'mourning_mace'], [/flail|chain/, 'condemned_chain'],
  [/crossbow|arbalest/, 'garrison_arbalest'], [/bow/, 'huntsman_bow'], [/bolt/, 'iron_bolt'], [/arrow/, 'arrow'],
  [/censer/, 'pilgrim_censer'], [/bell/, 'hand_bell'], [/staff|rod|wand/, 'court_staff'], [/buckler/, 'mint_buckler'],
  [/tower/, 'tower_shield'], [/shield/, 'household_shield'], [/sword|blade/, 'retainer_sword'],
];

export const WEAPON_IDS = Object.keys(BUILDERS);

/** Build a weapon/shield/catalyst model by item id (unknown ids fall back by name, with a warning). */
export function buildWeapon(itemId: string): WeaponModelExt {
  let b = BUILDERS[itemId];
  if (!b) {
    const alias = ALIASES.find(([re]) => re.test(itemId));
    const fallback = alias ? alias[1] : 'retainer_sword';
    if (!warned.has(itemId)) { warned.add(itemId); console.warn(`[models] no weapon model for '${itemId}', using '${fallback}'`); }
    b = BUILDERS[fallback];
  }
  return b();
}
