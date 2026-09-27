/**
 * Armour & clothing components shared by player looks, enemies and NPCs.
 *
 * All pieces are authored in reference units on the bone they ride (see anatomy.ts for the
 * reference skeleton). Torso layers are authored in HIPS space over `trunkRings` and use the
 * smooth trunk weights; skirts/tabards/robes use `skirtSkin` so they follow the stride.
 * Plates carry bronze trims, rivets and dents; cloth carries tattered hems.
 */
import * as THREE from 'three';
import type { BoneName } from '../rigDefs';
import { type CharBuilder, trunkSkin, skirtSkin, jointSkin, parentSkin, type SkinFn } from './builder';
import {
  ellipsoid, loft, loftFrame, sweep, panel, rivet, scatter, merge, xf, band, extrude, chain, dent,
  type Ring, type G, type V3, type LoftOpts, lerp, smooth, TAU, flipWinding,
} from './parts';
import {
  type Sex, trunkRings, slice, grow, ringAtY, upperArmRings, forearmRings, thighRings, shinRings,
  upperArmSkin, forearmSkin, thighSkin, shinSkin,
} from './anatomy';
import type { ClothCollider } from './cloth';

/** Standard shared material keys. */
export const M = {
  steel: 'steel_armor',
  steelOld: 'iron_rusted',
  iron: 'iron',
  bronze: 'bronze',
  gold: 'gold_trim',
  leather: 'leather',
  leatherDark: 'leather_dark',
  black: 'cloth_black',
  red: 'cloth_red',
  blue: 'cloth_blue',
  linen: 'cloth_linen',
  brown: 'cloth_brown',
  rope: 'rope',
  shadow: 'cloth_black|c=050506|r=1',
  crack: 'unlived_crack',
  mail: 'iron|t=9a9a9a|r=0.6',
  fur: 'hair_dark|t=8c7a64',
  arms: 'gold_trim|a=arms|po',
  armsWorn: 'gold_trim|a=arms2|po',
  army: 'cloth_linen|t=b89a6a|a=army|po',
  emb: 'gold_trim|a=emb|ar=14|po',
} as const;

const sm = smooth;
const angDiff = (a: number, b: number) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
/** Radial bump along θ = centre (keels, ridges). */
export const ridge = (centre: number, amt: number, width = 0.25) => (th: number) => 1 + amt * Math.exp(-((angDiff(th, centre) / width) ** 2));

/** Flip a geometry inside-out (liners seen from within). */
export function inside(g: G): G {
  flipWinding(g);
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

/** z of the trunk surface (front dir=+1 / back dir=-1) at (x, y), grown by d. */
export function trunkZ(sex: Sex, sh: number, x: number, y: number, dir: 1 | -1, d = 0): number {
  const r = ringAtY(trunkRings(sex, sh), y);
  const rx = r.rx + d;
  const rz = (r.rz ?? r.rx) * (dir > 0 ? (r.front ?? 1) : (r.back ?? 1)) + d;
  const p = r.p ?? 2;
  const q = Math.min(0.999, Math.abs((x - (r.cx ?? 0)) / rx));
  return (r.cz ?? 0) + dir * rz * Math.pow(1 - Math.pow(q, p), 1 / p);
}

/** Skin for torso-length garments: trunk weights above the waist, skirt weights below. */
export const garmentSkin = (skirt: SkinFn = skirtSkin()): SkinFn => (p) => (p.y > 0.02 ? trunkSkin(p) : skirt(p));

// ------------------------------------------------------------------------------------ torso

export interface CuirassOpts {
  mat?: string; trim?: string | null; y0?: number; y1?: number; inflate?: number; keel?: number;
  rivets?: boolean; crack?: number; radial?: LoftOpts['radial']; dents?: number;
}

/** Breast- and backplate (one shell over the trunk) with trims, keel and rivets. */
export function cuirass(b: CharBuilder, sex: Sex, o: CuirassOpts = {}) {
  const mat = o.mat ?? M.steel;
  const inf = o.inflate ?? 0.028;
  const y0 = o.y0 ?? 0.16, y1 = o.y1 ?? 0.53;
  const rings = grow(slice(trunkRings(sex, b.shoulder), y1, y0), inf);
  // slightly flared lower edge
  rings[rings.length - 1] = { ...rings[rings.length - 1], rx: rings[rings.length - 1].rx + 0.01, rz: (rings[rings.length - 1].rz ?? 0) + 0.008 };
  const keel = ridge(0, o.keel ?? 0.07, 0.3);
  const radial = o.radial ? (th: number, v: number) => keel(th) * o.radial!(th, v) : (th: number) => keel(th);
  const lo: LoftOpts = { segs: 22, radial };
  const g = loft(rings, lo);
  if (o.dents) dent(g, b.rng, 0.006, o.dents, 0.06);
  b.add('hips', g, mat, { skin: trunkSkin });
  b.crackOn('hips', rings, lo, { skin: trunkSkin, crack: o.crack ?? 1.5 });
  if (o.trim !== null) {
    const trim = o.trim ?? M.bronze;
    // bottom and neckline trims (proud of the plate)
    const top = rings[0], bot = rings[rings.length - 1];
    b.loft('hips', [{ ...top, y: top.y + 0.004 }, { ...top, y: top.y - 0.018 }], trim, { segs: 22, radial, inflate: 0.004 }, { skin: trunkSkin });
    b.loft('hips', [{ ...bot, y: bot.y + 0.018 }, { ...bot, y: bot.y - 0.004 }], trim, { segs: 22, radial, inflate: 0.004 }, { skin: trunkSkin });
    if (o.rivets !== false) {
      const t0 = 0.25, tl = rings.length - 1.25;
      const rv = merge([
        scatterRow(rings, lo, t0, -1.3, 1.3, 7),
        scatterRow(rings, lo, tl, -1.3, 1.3, 7),
        scatterRow(rings, lo, tl, Math.PI - 1.0, Math.PI + 1.0, 5),
      ]);
      b.add('hips', rv, trim, { skin: trunkSkin });
    }
  }
  return rings;
}

function scatterRow(rings: Ring[], lo: LoftOpts, t: number, a0: number, a1: number, n: number, r = 0.0065): G {
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(loftFrame(rings, lerp(a0, a1, n === 1 ? 0.5 : i / (n - 1)), t, lo, 0.002));
  return scatter(() => rivet(r), frames);
}

/** Gorget: a plate collar around the neck base. */
export function gorget(b: CharBuilder, sex: Sex, o: { mat?: string; trim?: string | null; high?: boolean } = {}) {
  const f = sex === 'f' ? 0.9 : 1;
  const hi = o.high ? 0.05 : 0;
  const rings: Ring[] = [
    { y: 0.63 + hi, rx: 0.07 * f, rz: 0.075 * f, cz: 0.0 },
    { y: 0.585, rx: 0.085 * f, rz: 0.088 * f, cz: -0.004 },
    { y: 0.545, rx: 0.15 * f * (0.45 + 0.55 * b.shoulder), rz: 0.105 * f, cz: -0.01 },
    { y: 0.515, rx: 0.19 * f * (0.45 + 0.55 * b.shoulder), rz: 0.13 * f, cz: -0.01 },
  ];
  b.loft('hips', rings, o.mat ?? M.steel, { segs: 18 }, { skin: trunkSkin });
  if (o.trim !== null) b.loft('hips', [{ ...rings[0], y: rings[0].y + 0.004 }, { ...rings[0], y: rings[0].y - 0.014 }], o.trim ?? M.bronze, { segs: 16, inflate: 0.004 }, { skin: trunkSkin });
}

/** Fauld: overlapping lames below the breastplate (hips space). */
export function fauld(b: CharBuilder, sex: Sex, o: { mat?: string; trim?: string | null; lames?: number; top?: number; crack?: number } = {}) {
  const n = o.lames ?? 3;
  const top = o.top ?? 0.17;
  for (let i = 0; i < n; i++) {
    const y = top - i * 0.055;
    const r = ringAtY(trunkRings(sex, b.shoulder), y - 0.03);
    const R = { rx: r.rx + 0.032 + i * 0.008, rz: (r.rz ?? r.rx) + 0.03 + i * 0.008 };
    const rings: Ring[] = [{ y, rx: R.rx - 0.008, rz: R.rz - 0.008, back: 1.05 }, { y: y - 0.068, rx: R.rx + 0.004, rz: R.rz + 0.004, back: 1.1 }];
    b.loft('hips', rings, o.mat ?? M.steel, { segs: 20 }, { skin: garmentSkin(), crack: o.crack });
    if (o.trim !== null) b.loft('hips', [{ ...rings[1], y: rings[1].y + 0.012 }, { ...rings[1], y: rings[1].y - 0.002 }], o.trim ?? M.bronze, { segs: 20, inflate: 0.003 }, { skin: garmentSkin() });
  }
}

/** Tassets: plates hanging over the front of the thighs. */
export function tassets(b: CharBuilder, o: { mat?: string; trim?: string | null; len?: number; y?: number; lames?: number } = {}) {
  const len = o.len ?? 0.2;
  const y = o.y ?? -0.02;
  const n = o.lames ?? 3;
  for (const side of [1, -1] as const) {
    for (let i = 0; i < n; i++) {
      const yy = y - i * (len / n) * 0.9;
      const g = loft([
        { y: yy, rx: 0.1, rz: 0.1 },
        { y: yy - len / n - 0.012, rx: 0.108, rz: 0.106 },
      ], { segs: 16, phi0: -0.85, phiLen: 1.7 });
      b.add('hips', xf(g, { p: [side * 0.085, 0, 0.05 + i * 0.004] }), o.mat ?? M.steel, { skin: skirtSkin() });
    }
    if (o.trim !== null) {
      const yb = y - (n - 1) * (len / n) * 0.9 - len / n - 0.012;
      const g = loft([{ y: yb + 0.012, rx: 0.111, rz: 0.109 }, { y: yb - 0.001, rx: 0.111, rz: 0.109 }], { segs: 16, phi0: -0.85, phiLen: 1.7 });
      b.add('hips', xf(g, { p: [side * 0.085, 0, 0.05 + (n - 1) * 0.004] }), o.trim ?? M.bronze, { skin: skirtSkin() });
    }
  }
}

/** Mail skirt (hauberk hem) hanging from the waist to mid-thigh, scalloped hem. */
export function mailSkirt(b: CharBuilder, sex: Sex, o: { mat?: string; y0?: number; y1?: number; crack?: number } = {}) {
  const y0 = o.y0 ?? 0.12, y1 = o.y1 ?? -0.3;
  const r0 = ringAtY(trunkRings(sex, b.shoulder), y0);
  const rings: Ring[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const y = lerp(y0, y1, t);
    const base = y > -0.1 ? ringAtY(trunkRings(sex, b.shoulder), y) : { rx: 0.17, rz: 0.12 };
    rings.push({ y, rx: Math.max(base.rx, r0.rx) + 0.014 + t * 0.035, rz: Math.max(base.rz ?? base.rx, 0.1) + 0.014 + t * 0.03, back: 1.08 });
  }
  b.loft('hips', rings, o.mat ?? M.mail, { segs: 22, radial: (th, v) => 1 + (v > 0.9 ? 0.02 * Math.abs(Math.sin(th * 20)) : 0) }, { skin: skirtSkin(), crack: o.crack });
}

export interface TabardOpts {
  mat: string;
  /** y (hips space) of the hem; default just above the knee. */
  hem?: number;
  top?: number;
  /** Half-widths at chest / waist / hem. */
  w?: [number, number, number];
  heraldry?: 'arms' | 'armsWorn' | 'army' | null;
  back?: boolean;
  /** Distance above the trunk surface (armour underneath). */
  over?: number;
  tatter?: number;
  trim?: string | null;
  /** Split into two flaps below the waist (front slit). */
  split?: boolean;
  seed?: number;
}

/** Tabard / surcoat: front (and back) panels lying on the torso and hanging as flaps below. */
export function tabard(b: CharBuilder, sex: Sex, o: TabardOpts) {
  const hem = o.hem ?? -0.42, top = o.top ?? 0.53;
  const [wc, ww, wh] = o.w ?? [0.12, 0.15, 0.17];
  const over = o.over ?? 0.04;
  const sh = b.shoulder;
  const shape = (dir: 1 | -1) => (u: number, v: number): V3 => {
    const y = lerp(top, hem, v);
    const hw = y > 0.1 ? lerp(wc, ww, sm(0.5, 0.1, y)) : lerp(ww, wh, sm(0.1, hem, y));
    const x = (dir > 0 ? u - 0.5 : 0.5 - u) * 2 * hw;
    let z: number;
    if (y > -0.08) z = trunkZ(sex, sh, x, y, dir, over);
    else {
      const z0 = trunkZ(sex, sh, x, -0.08, dir, over);
      z = z0 + dir * (-0.08 - y) * 0.1;
    }
    return [x, y, z];
  };
  const rng = b.rng;
  const skin = garmentSkin(skirtSkin({ spread: 0.07 }));
  const make = (dir: 1 | -1) => {
    if (o.split) {
      const parts: G[] = [];
      for (const half of [0, 1]) {
        const f = shape(dir);
        parts.push(panel((u, v) => {
          // upper part shared, lower part split with a small gap
          const uu = half === 0 ? u * 0.5 : 0.5 + u * 0.5;
          const p = f(uu, v);
          const gap = sm(0.45, 0.6, v) * 0.012 * (half === 0 ? -1 : 1) * dir;
          return [p[0] + gap, p[1], p[2]];
        }, 5, 12, { rng, tatter: o.tatter ?? 0.12 }));
      }
      return merge(parts);
    }
    return panel(shape(dir), 9, 12, { rng, tatter: o.tatter ?? 0.12 });
  };
  b.add('hips', make(1), o.mat, { skin });
  if (o.back !== false) b.add('hips', make(-1), o.mat, { skin });
  if (o.trim) {
    // hem-side edge trims (thin gilt band down each side)
    for (const s of [1, -1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const v = i / 8 * 0.85;
        const p = shape(1)(s > 0 ? 1 : 0, v);
        pts.push([p[0] - s * 0.008, p[1], p[2] + 0.004]);
      }
      b.add('hips', sweep(pts, { w: 0.007, h: 0.002, up: [1, 0, 0], sides: 4, segs: 12 }), o.trim, { skin });
    }
  }
  if (o.heraldry) {
    const key = o.heraldry === 'arms' ? M.arms : o.heraldry === 'armsWorn' ? M.armsWorn : M.army;
    const f = shape(1);
    const ht = o.heraldry === 'army' ? 0.2 : 0.26;
    const yTop = 0.47;
    const vTop = (top - yTop) / (top - hem), vBot = (top - yTop + ht) / (top - hem);
    const hwN = o.heraldry === 'army' ? 0.33 : 0.3;
    b.add('hips', panel((u, v) => {
      const p = f(0.5 + (u - 0.5) * hwN * 2, lerp(vTop, vBot, v));
      return [p[0], p[1], p[2] + 0.003];
    }, 6, 8, { single: true, unitUV: true }), key, { skin });
  }
}

/** Belt with buckle, optional pouches and a hanging strap end. */
export function belt(b: CharBuilder, sex: Sex, o: { y?: number; over?: number; mat?: string; buckle?: string; pouches?: number; height?: number; tilt?: number; strapEnd?: boolean } = {}) {
  const y = o.y ?? 0.1;
  const r = ringAtY(trunkRings(sex, b.shoulder), y);
  const over = o.over ?? 0.03;
  const rx = r.rx + over, rz = (r.rz ?? r.rx) + over;
  const h = o.height ?? 0.04;
  const skin = garmentSkin();
  b.add('hips', band(y, rx, rz, h, 0.008, { segs: 24, cz: r.cz, tilt: o.tilt ?? 0, back: r.back, front: r.front }), o.mat ?? M.leather, { skin });
  const bz = (r.cz ?? 0) + rz * (r.front ?? 1) + 0.006;
  b.add('hips', loft([{ y: y + h * 0.65, rx: 0.028, rz: 0.006, p: 5 }, { y: y - h * 0.65, rx: 0.028, rz: 0.006, p: 5 }], { segs: 12, capTop: true, capBottom: true }), o.buckle ?? M.bronze, { p: [0, (o.tilt ?? 0), bz], skin });
  if (o.strapEnd !== false) {
    b.add('hips', sweep([[0.03, y, bz + 0.004], [0.055, y - 0.04, bz + 0.002], [0.06, y - 0.1, bz - 0.004]], { w: h * 0.4, h: 0.003, up: [0, 0, 1], sides: 4, segs: 5 }), o.mat ?? M.leather, { skin });
  }
  const n = o.pouches ?? 1;
  for (let i = 0; i < n; i++) {
    const a = (i % 2 ? -1 : 1) * (0.9 + 0.35 * Math.floor(i / 2));
    const px = Math.sin(a) * (rx + 0.02), pz = (r.cz ?? 0) + Math.cos(a) * (rz + 0.02);
    b.add('hips', xf(roundBox(0.075, 0.08, 0.035), { p: [px, y - 0.05, pz], r: [0, a, 0] }), M.leatherDark, { skin });
    b.add('hips', xf(roundBox(0.078, 0.03, 0.038), { p: [px, y - 0.02, pz + Math.cos(a) * 0.004], r: [0, a, 0] }), o.mat ?? M.leather, { skin });
  }
}

function roundBox(w: number, h: number, d: number): G {
  return loft([
    { y: h / 2, rx: w / 2 * 0.92, rz: d / 2 * 0.85, p: 4 }, { y: h / 2 - 0.006, rx: w / 2, rz: d / 2, p: 4 },
    { y: -h / 2 + 0.008, rx: w / 2, rz: d / 2, p: 4 }, { y: -h / 2, rx: w / 2 * 0.9, rz: d / 2 * 0.85, p: 4 },
  ], { segs: 12, capTop: true, capBottom: true });
}

/** Diagonal strap across the chest (baldric / satchel strap), hips space. */
export function bandolier(b: CharBuilder, sex: Sex, o: { mat?: string; over?: number; fromLeft?: boolean; width?: number } = {}) {
  const pts: V3[] = [];
  const over = o.over ?? 0.03;
  const s = o.fromLeft === false ? -1 : 1;
  // from the left shoulder, across the chest, to the right hip — and back around
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = lerp(0.52, 0.02, t);
    const x = s * lerp(0.1, -0.15, t);
    pts.push([x, y, trunkZ(sex, b.shoulder, x, y, 1, over)]);
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const y = lerp(0.02, 0.52, t);
    const x = s * lerp(-0.15, 0.1, t);
    pts.push([x, y, trunkZ(sex, b.shoulder, x, y, -1, over)]);
  }
  pts.push([s * 0.13, 0.555, 0.0]);
  pts.push(pts[0]);
  b.add('hips', sweep(pts, { w: o.width ?? 0.022, h: 0.004, sides: 4, p: 8, segs: 44, up: (t) => {
    // up vector ≈ surface normal: out from the trunk centre
    const i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const p = pts[i];
    return [p[0] * 0.3, 0.25, p[2]];
  } }), o.mat ?? M.leather, { skin: trunkSkin });
}

// ------------------------------------------------------------------------------------ robes

export interface RobeOpts {
  mat: string;
  y0?: number;      // top (hips space)
  hem?: number;     // bottom
  r0?: [number, number];
  r1?: [number, number];
  /** Opening at the front (radians of the gap, 0 = closed). */
  open?: number;
  tatter?: number;
  trim?: string | null;
  emb?: boolean;
  cols?: number;
  rows?: number;
  seed?: number;
  back?: number;
}

/** A skirt/robe tube from the waist down, tattered hem, optional front opening with trims. */
export function robeSkirt(b: CharBuilder, sex: Sex, o: RobeOpts) {
  const y0 = o.y0 ?? 0.12, hem = o.hem ?? -0.9;
  const rt = ringAtY(trunkRings(sex, b.shoulder), Math.min(0.1, y0));
  const r0 = o.r0 ?? [rt.rx + 0.03, (rt.rz ?? rt.rx) + 0.03];
  const r1 = o.r1 ?? [0.3, 0.26];
  const open = o.open ?? 0;
  const a0 = open / 2, a1 = TAU - open / 2;
  const f = (u: number, v: number): V3 => {
    const th = lerp(a0, a1, u);
    const y = lerp(y0, hem, v);
    // hip-flare then straight fall
    const k = sm(0, 0.35, v) * 0.6 + v * 0.4;
    const rx = lerp(r0[0], r1[0], k), rz = lerp(r0[1], r1[1], k);
    const c = Math.cos(th);
    return [Math.sin(th) * rx, y, c * rz * (c < 0 ? (o.back ?? 1.05) : 1)];
  };
  const skin = skirtSkin({ spread: 0.1, shin: 0.45 });
  b.add('hips', panel(f, o.cols ?? 22, o.rows ?? 12, { rng: b.rng, tatter: o.tatter ?? 0.07, uvScale: [1.4, Math.abs(hem - y0)] }), o.mat, { skin });
  if (o.trim && open > 0) {
    for (const u of [0, 1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 10; i++) { const p = f(u, i / 10 * 0.92); pts.push([p[0] * 1.012, p[1], p[2] * 1.012]); }
      b.add('hips', sweep(pts, { w: 0.016, h: 0.002, up: [Math.sin(lerp(a0, a1, u)), 0, Math.cos(lerp(a0, a1, u))], sides: 4, segs: 14 }), o.emb ? M.emb : o.trim, { skin });
    }
  }
  if (o.trim) {
    // hem trim band just above the tattered edge
    const pts: V3[] = [];
    for (let i = 0; i <= 24; i++) { const p = f(i / 24, 0.8); pts.push([p[0] * 1.012, p[1], p[2] * 1.012]); }
    b.add('hips', sweep(pts, { w: 0.022, h: 0.002, sides: 4, segs: 40, up: [0, 1, 0] }), o.emb ? M.emb : o.trim, { skin });
  }
  return f;
}

/** Wide bell sleeve around the forearm with a tattered cuff (both sides). */
export function bellSleeves(b: CharBuilder, sex: Sex, o: { mat: string; trim?: string | null; flare?: number; len?: number; emb?: boolean }) {
  const k = sex === 'f' ? 0.88 : 1;
  const flare = o.flare ?? 0.11;
  const len = o.len ?? 0.3;
  for (const side of [1, -1] as const) {
    const bone: BoneName = side > 0 ? 'forearmL' : 'forearmR';
    const f = (u: number, v: number): V3 => {
      const th = u * TAU;
      const r = lerp(0.056 * k, flare * k, v * v);
      const c = Math.cos(th);
      // sleeve hangs lower on the inner/back side
      return [Math.sin(th) * r, 0.04 - v * len * (1 + 0.25 * Math.max(0, -c)), c * r * 0.95 - v * 0.02];
    };
    b.add(bone, panel(f, 14, 7, { rng: b.rng, tatter: 0.1 }), o.mat, { skin: forearmSkin(side) });
    if (o.trim) {
      const pts: V3[] = [];
      for (let i = 0; i <= 16; i++) { const p = f(i / 16, 0.78); pts.push([p[0] * 1.02, p[1], p[2] * 1.02]); }
      b.add(bone, sweep(pts, { w: 0.014, h: 0.002, sides: 4, segs: 24, up: [0, 1, 0], closed: false }), o.emb ? M.emb : o.trim, { skin: forearmSkin(side) });
    }
  }
}

/** Short capelet/mantle around the shoulders (chest space), tattered hem. */
export function mantle(b: CharBuilder, sex: Sex, o: { mat: string; len?: number; r0?: number; r1?: number; trim?: string | null; tatter?: number; emb?: boolean; open?: number }) {
  const len = o.len ?? 0.26;
  const r0 = (o.r0 ?? 0.1) * (sex === 'f' ? 0.9 : 1), r1 = (o.r1 ?? 0.27) * (sex === 'f' ? 0.9 : 1) * (0.45 + 0.55 * b.shoulder);
  const open = o.open ?? 0.5;
  const f = (u: number, v: number): V3 => {
    const th = lerp(open / 2, TAU - open / 2, u);
    const r = lerp(r0, r1, Math.sqrt(v));
    const c = Math.cos(th);
    return [Math.sin(th) * r * 1.05, 0.29 - v * len - Math.max(0, c) * v * 0.04, c * r * 0.75 - 0.015];
  };
  const skin: SkinFn = (p) => {
    const side = sm(-0.12, 0.12, p.x);
    const arm = sm(0.14, 0.24, Math.abs(p.x)) * 0.35;
    return [['chest', 1 - arm], [side > 0.5 ? 'upperArmL' : 'upperArmR', arm]];
  };
  b.add('chest', panel(f, 24, 6, { rng: b.rng, tatter: o.tatter ?? 0.14 }), o.mat, { skin });
  if (o.trim) {
    const pts: V3[] = [];
    for (let i = 0; i <= 24; i++) { const p = f(i / 24, 0.82); pts.push([p[0] * 1.015, p[1], p[2] * 1.015]); }
    b.add('chest', sweep(pts, { w: 0.013, h: 0.002, sides: 4, segs: 40, up: [0, 1, 0] }), o.emb ? M.emb : o.trim, { skin });
  }
}

// ------------------------------------------------------------------------------------ shoulders & arms

export interface PauldronOpts {
  mat?: string; trim?: string | null; size?: number; lames?: number; style?: 'round' | 'tall' | 'bell' | 'leather';
  crack?: number; rivets?: boolean;
}

/** Layered pauldrons: a dome over the shoulder and lames falling over the upper arm. */
export function pauldrons(b: CharBuilder, o: PauldronOpts = {}) {
  const mat = o.mat ?? M.steel;
  const trim = o.trim === undefined ? M.bronze : o.trim;
  const k = o.size ?? 1;
  const n = o.lames ?? 3;
  for (const side of [1, -1] as const) {
    const up: BoneName = side > 0 ? 'upperArmL' : 'upperArmR';
    const sh: BoneName = side > 0 ? 'shoulderL' : 'shoulderR';
    const skinDome = parentSkin(up, sh, 0.1, -0.02, 0.55);
    const skinLame = parentSkin(up, sh, 0.02, -0.12, 0.35);
    const centre = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    const tall = o.style === 'tall' ? 1.35 : 1;
    // dome
    const domeR = 0.1 * k;
    const dome = ellipsoid(domeR, 0.085 * k * tall, 0.1 * k, { segs: 16, rows: 7, lat1: Math.PI * 0.55, radial: ridge(centre, o.style === 'tall' ? 0.12 : 0.05, 0.5) });
    b.add(up, xf(dome, { p: [side * 0.012, 0.03, 0], r: [0, 0, -side * 0.3] }), mat, { skin: skinDome });
    if (o.style === 'tall') {
      // raised haute-piece guarding the neck
      b.add(up, xf(loft([{ y: 0.07, rx: 0.075, rz: 0.012 }, { y: 0.0, rx: 0.085, rz: 0.012 }], { segs: 10, capTop: true }), { p: [side * -0.035, 0.12, 0], r: [0, 0, -side * 0.35] }), mat, { skin: skinDome });
      if (trim) b.add(up, xf(loft([{ y: 0.075, rx: 0.077, rz: 0.015 }, { y: 0.064, rx: 0.077, rz: 0.015 }], { segs: 10 }), { p: [side * -0.035, 0.12, 0], r: [0, 0, -side * 0.35] }), trim, { skin: skinDome });
    }
    // lames
    for (let i = 0; i < n; i++) {
      const yT = -0.005 - i * 0.042 * k;
      const R = (0.098 + i * 0.006) * k;
      const flare = o.style === 'bell' ? 0.02 + i * 0.008 : 0.008;
      const rings: Ring[] = [{ y: yT, rx: R, rz: R * 0.98, cx: side * 0.012 }, { y: yT - 0.05 * k, rx: R + flare, rz: R * 0.98 + flare, cx: side * 0.014 }];
      const lo: LoftOpts = { segs: 18, phi0: centre - 1.45, phiLen: 2.9 };
      b.loft(up, rings, mat, lo, { skin: skinLame, crack: o.crack });
      if (trim) b.loft(up, [{ ...rings[1], y: rings[1].y + 0.01 }, { ...rings[1], y: rings[1].y - 0.002 }], trim, { ...lo, inflate: 0.003 }, { skin: skinLame });
    }
    if (trim && o.rivets !== false) {
      const frames = [];
      for (let i = 0; i < 5; i++) {
        const a = centre + lerp(-1.1, 1.1, i / 4);
        frames.push({ p: new THREE.Vector3(Math.sin(a) * 0.095 * k + side * 0.012, 0.03 - 0.012, Math.cos(a) * 0.095 * k), n: new THREE.Vector3(Math.sin(a), 0.5, Math.cos(a)).normalize() });
      }
      b.add(up, scatter(() => rivet(0.007), frames), trim, { skin: skinDome });
    }
  }
}

export interface ArmPlateOpts { mat?: string; trim?: string | null; rerebrace?: boolean; couter?: boolean; vambrace?: boolean; wing?: boolean; crack?: number; }

/** Rerebraces, couters (with fan wings) and vambraces. */
export function armPlates(b: CharBuilder, sex: Sex, o: ArmPlateOpts = {}) {
  const mat = o.mat ?? M.steel;
  const trim = o.trim === undefined ? M.bronze : o.trim;
  for (const side of [1, -1] as const) {
    const U: BoneName = side > 0 ? 'upperArmL' : 'upperArmR';
    const F: BoneName = side > 0 ? 'forearmL' : 'forearmR';
    if (o.rerebrace !== false) {
      const r = grow(slice(upperArmRings(sex), -0.07, -0.22), 0.016);
      b.loft(U, r, mat, { segs: 14, radial: ridge(side > 0 ? Math.PI / 2 : -Math.PI / 2, 0.06, 0.6) }, { skin: upperArmSkin(side), crack: o.crack });
      if (trim) b.loft(U, [{ ...r[r.length - 1], y: r[r.length - 1].y + 0.01 }, { ...r[r.length - 1], y: r[r.length - 1].y - 0.003 }], trim, { segs: 14, inflate: 0.003 }, { skin: upperArmSkin(side) });
    }
    if (o.couter !== false) {
      const sk = jointSkin(F, U, 0.06, -0.06, 0);
      const elbowSkin: SkinFn = () => [[U, 0.5], [F, 0.5]];
      void sk;
      b.add(F, xf(ellipsoid(0.056, 0.06, 0.052, { segs: 14, rows: 7, lat1: Math.PI * 0.62 }), { p: [0, 0.0, -0.012], r: [-Math.PI / 2 - 0.2, 0, 0] }), mat, { skin: elbowSkin });
      if (o.wing !== false) {
        b.add(F, xf(ellipsoid(0.01, 0.05, 0.046, { segs: 12, rows: 6, radial: (th) => 1 + 0.2 * Math.abs(Math.sin(th * 3)) }), { p: [side * 0.052, 0.0, -0.01] }), mat, { skin: elbowSkin });
        if (trim) b.add(F, xf(rivet(0.009), { p: [side * 0.061, 0.0, -0.01], r: [0, 0, -side * Math.PI / 2] }), trim, { skin: elbowSkin });
      }
    }
    if (o.vambrace !== false) {
      const r = grow(slice(forearmRings(sex), -0.045, -0.235), 0.014);
      r[r.length - 1] = { ...r[r.length - 1], rx: r[r.length - 1].rx + 0.006, rz: (r[r.length - 1].rz ?? 0) + 0.006 };
      b.loft(F, r, mat, { segs: 14, radial: ridge(side > 0 ? Math.PI / 2 : -Math.PI / 2, 0.08, 0.35) }, { skin: forearmSkin(side), crack: o.crack });
      if (trim) {
        b.loft(F, [{ ...r[0], y: r[0].y + 0.003 }, { ...r[0], y: r[0].y - 0.01 }], trim, { segs: 14, inflate: 0.003 }, { skin: forearmSkin(side) });
      }
    }
  }
}

export interface LegPlateOpts { mat?: string; trim?: string | null; cuisse?: boolean; poleyn?: boolean; greave?: boolean; crack?: number; }

/** Cuisses (front thigh plates), poleyns (knee cops with wings) and greaves. */
export function legPlates(b: CharBuilder, sex: Sex, o: LegPlateOpts = {}) {
  const mat = o.mat ?? M.steel;
  const trim = o.trim === undefined ? M.bronze : o.trim;
  for (const side of [1, -1] as const) {
    const T: BoneName = side > 0 ? 'thighL' : 'thighR';
    const S: BoneName = side > 0 ? 'shinL' : 'shinR';
    if (o.cuisse !== false) {
      const r = grow(slice(thighRings(sex), -0.05, -0.37), 0.02);
      const lo: LoftOpts = { segs: 16, phi0: -1.75, phiLen: 3.5, radial: ridge(0, 0.06, 0.4) };
      b.loft(T, r, mat, lo, { skin: thighSkin(side), crack: o.crack });
      if (trim) b.loft(T, [{ ...r[0], y: r[0].y + 0.003 }, { ...r[0], y: r[0].y - 0.012 }], trim, { ...lo, inflate: 0.003 }, { skin: thighSkin(side) });
    }
    if (o.poleyn !== false) {
      const knee: SkinFn = () => [[T, 0.45], [S, 0.55]];
      b.add(S, xf(ellipsoid(0.058, 0.062, 0.05, { segs: 14, rows: 7, lat1: Math.PI * 0.6 }), { p: [0, 0.01, 0.025], r: [Math.PI / 2, 0, 0] }), mat, { skin: knee });
      b.add(S, xf(ellipsoid(0.01, 0.045, 0.042, { segs: 12, rows: 6 }), { p: [side * 0.058, 0.005, 0.01] }), mat, { skin: knee });
      if (trim) b.add(S, xf(rivet(0.009), { p: [0, 0.01, 0.078], r: [Math.PI / 2, 0, 0] }), trim, { skin: knee });
    }
    if (o.greave !== false) {
      const r = grow(slice(shinRings(sex), -0.06, -0.37), 0.014);
      b.loft(S, r, mat, { segs: 14, radial: ridge(0, 0.1, 0.35) }, { skin: shinSkin(side), crack: o.crack });
      if (trim) b.loft(S, [{ ...r[0], y: r[0].y + 0.003 }, { ...r[0], y: r[0].y - 0.01 }], trim, { segs: 14, inflate: 0.003 }, { skin: shinSkin(side) });
    }
  }
}

/** Studded leather bracers on the forearms. */
export function bracers(b: CharBuilder, sex: Sex, o: { mat?: string; studs?: string | null; y0?: number; y1?: number } = {}) {
  for (const side of [1, -1] as const) {
    const F: BoneName = side > 0 ? 'forearmL' : 'forearmR';
    const r = grow(slice(forearmRings(sex), o.y0 ?? -0.07, o.y1 ?? -0.245), 0.01);
    const lo: LoftOpts = { segs: 12 };
    b.loft(F, r, o.mat ?? M.leather, lo, { skin: forearmSkin(side) });
    // straps
    for (const t of [0.3, 0.75]) {
      const rr = ringAtY(r, lerp(r[0].y, r[r.length - 1].y, t));
      b.loft(F, [{ ...rr, y: rr.y + 0.008 }, { ...rr, y: rr.y - 0.008 }], M.leatherDark, { segs: 12, inflate: 0.004 }, { skin: forearmSkin(side) });
    }
    if (o.studs) {
      const frames = [];
      for (let i = 0; i < 6; i++) frames.push(loftFrame(r, (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (i % 2 ? 0.35 : -0.35), 0.5 + Math.floor(i / 2) * 0.9, lo, 0.001));
      b.add(F, scatter(() => rivet(0.006), frames), o.studs, { skin: forearmSkin(side) });
    }
  }
}

// ------------------------------------------------------------------------------------ headgear

/** Dark liner inside helmets/hoods (seen through slits and openings). */
function liner(b: CharBuilder, r = 0.095, eyes: boolean) {
  b.add('head', inside(ellipsoid(r, r * 1.05, r * 1.12, { segs: 12, rows: 7 })), M.shadow, { p: [0, 0.07, 0.01] });
  if (eyes) {
    for (const s of [1, -1]) b.add('head', xf(ellipsoid(0.011, 0.006, 0.004, { segs: 6, rows: 4 }), { p: [s * 0.03, 0.076, 0.105] }), M.crack);
  }
}

export interface HelmOpts { mat?: string; trim?: string | null; crack?: number; eyes?: boolean; dents?: number; }

/** Great helm (Household Knight): sugarloaf with keel, eye slit, breaths, bronze cross and trims. */
export function greatHelm(b: CharBuilder, o: HelmOpts & { crest?: boolean; slitY?: number } = {}) {
  const mat = o.mat ?? M.steel;
  const trim = o.trim === undefined ? M.bronze : o.trim;
  const sY = o.slitY ?? 0.078;
  const all: Ring[] = [
    { y: 0.245, rx: 0.018, rz: 0.02, cz: 0.012 },
    { y: 0.232, rx: 0.062, rz: 0.07, cz: 0.012 },
    { y: 0.2, rx: 0.098, rz: 0.112, cz: 0.012 },
    { y: 0.15, rx: 0.108, rz: 0.124, cz: 0.014 },
    { y: 0.1, rx: 0.11, rz: 0.128, cz: 0.016 },
    { y: 0.03, rx: 0.109, rz: 0.128, cz: 0.018 },
    { y: -0.04, rx: 0.106, rz: 0.124, cz: 0.016 },
    { y: -0.09, rx: 0.11, rz: 0.126, cz: 0.01 },
    { y: -0.105, rx: 0.114, rz: 0.13, cz: 0.008 },
  ];
  const radial = ridge(0, 0.08, 0.3);
  const top = slice(all, 0.245, sY + 0.011), mid = slice(all, sY + 0.011, sY - 0.011), bot = slice(all, sY - 0.011, -0.105);
  const lo: LoftOpts = { segs: 22, radial, capTop: true };
  const gTop = loft(top, lo), gBot = loft(bot, { segs: 22, radial });
  if (o.dents) { dent(gTop, b.rng, 0.005, o.dents, 0.05); dent(gBot, b.rng, 0.005, o.dents, 0.05); }
  b.add('head', gTop, mat);
  b.add('head', gBot, mat);
  b.add('head', loft(mid, { segs: 22, radial, phi0: 1.15, phiLen: TAU - 2.3 }), mat);
  b.crackOn('head', top, lo);
  liner(b, 0.098, !!o.eyes);
  if (trim) {
    // brow band above the slit, rim at the bottom, vertical cross strap on the face
    const brow = slice(all, sY + 0.032, sY + 0.013);
    b.add('head', loft(brow, { segs: 22, radial, inflate: 0.004 }), trim);
    const rim = slice(all, -0.085, -0.105);
    b.add('head', loft(rim, { segs: 22, radial, inflate: 0.004 }), trim);
    for (const [y0, y1] of [[0.235, sY + 0.012], [sY - 0.012, -0.1]] as const) {
      const pts: V3[] = [];
      for (let i = 0; i <= 6; i++) {
        const y = lerp(y0, y1, i / 6);
        const t = (all.findIndex((r) => r.y < y) - 1) + 0.0;
        const r = ringAtY(all, y);
        void t;
        pts.push([0, y, (r.cz ?? 0) + (r.rz ?? r.rx) * radial(0) + 0.004]);
      }
      b.add('head', sweep(pts, { w: 0.013, h: 0.003, up: [1, 0, 0], sides: 4, p: 6, segs: 8 }), trim);
    }
    // rivets along the brow band
    const rf = [];
    for (let i = 0; i < 8; i++) {
      const a = lerp(0.35, TAU - 0.35, i / 7);
      const r = ringAtY(all, sY + 0.022);
      rf.push({ p: new THREE.Vector3(Math.sin(a) * (r.rx + 0.006), sY + 0.022, (r.cz ?? 0) + Math.cos(a) * ((r.rz ?? r.rx) + 0.006) * radial(a)), n: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)) });
    }
    b.add('head', scatter(() => rivet(0.0065), rf), trim);
  }
  // breaths: dark holes on the lower right cheek
  const holes = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const a = -0.35 - j * 0.16;
    const y = 0.02 - i * 0.03;
    const r = ringAtY(all, y);
    holes.push({ p: new THREE.Vector3(Math.sin(a) * (r.rx + 0.0005), y, (r.cz ?? 0) + Math.cos(a) * (r.rz ?? r.rx) * radial(a) + 0.0005), n: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)) });
  }
  b.add('head', scatter(() => loft([{ y: 0.001, rx: 0.0045 }, { y: 0, rx: 0.0045 }], { segs: 6, capTop: true }), holes), M.shadow);
  if (o.crest) crest(b, trim ?? M.bronze, 0.245);
}

/** Tall fin crest along the helm's midline with a bell finial (Corvane). */
export function crest(b: CharBuilder, mat: string, y0: number) {
  const outline: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const z = lerp(0.12, -0.16, t);
    const h = 0.04 + 0.1 * Math.sin(t * Math.PI) * (1 - 0.3 * t) + (i % 2 ? 0.012 : 0);
    outline.push([z, h]);
  }
  outline.push([-0.15, -0.02], [0.11, -0.02]);
  const g = extrude(outline, 0.012, 0.002);
  g.rotateY(-Math.PI / 2);
  b.add('head', xf(g, { p: [0, y0 - 0.03, 0.012] }), mat);
}

/** Kettle helm: bowl + sloping brim (infantry). */
export function kettleHelm(b: CharBuilder, o: HelmOpts & { brim?: number } = {}) {
  const mat = o.mat ?? M.steelOld;
  const bowl: Ring[] = [
    { y: 0.235, rx: 0.02 }, { y: 0.225, rx: 0.06, rz: 0.066 }, { y: 0.19, rx: 0.092, rz: 0.1 },
    { y: 0.13, rx: 0.1, rz: 0.11, cz: 0.005 }, { y: 0.085, rx: 0.102, rz: 0.112, cz: 0.006 },
  ];
  const lo: LoftOpts = { segs: 20, capTop: true, radial: ridge(0, 0.03, 0.2) };
  const g = loft(bowl, lo);
  if (o.dents) dent(g, b.rng, 0.006, o.dents, 0.05);
  b.add('head', g, mat);
  b.crackOn('head', bowl, lo);
  const w = o.brim ?? 0.075;
  const brim = loft([
    { y: 0.088, rx: 0.1, rz: 0.11, cz: 0.006 }, { y: 0.075, rx: 0.1 + w * 0.5, rz: 0.11 + w * 0.5, cz: 0.006 },
    { y: 0.05, rx: 0.1 + w, rz: 0.11 + w, cz: 0.006 }, { y: 0.043, rx: 0.1 + w + 0.004, rz: 0.11 + w + 0.004, cz: 0.006 },
  ], { segs: 22, radial: (th) => 1 + 0.03 * Math.sin(th * 5 + 1) });
  b.add('head', brim, mat);
  b.add('head', inside(loft([{ y: 0.088, rx: 0.098, rz: 0.108, cz: 0.006 }, { y: 0.05, rx: 0.098 + w, rz: 0.108 + w, cz: 0.006 }], { segs: 22 })), M.shadow);
  // comb ridge
  b.add('head', sweep([[0, 0.13, 0.11], [0, 0.23, 0.02], [0, 0.2, -0.08], [0, 0.12, -0.11]], { w: 0.004, h: 0.006, up: [1, 0, 0], sides: 4, segs: 10 }), mat);
  if (o.trim) b.add('head', loft([{ y: 0.1, rx: 0.103, rz: 0.113, cz: 0.006 }, { y: 0.087, rx: 0.103, rz: 0.113, cz: 0.006 }], { segs: 20 }), o.trim);
}

/** Old-pattern sallet with eye slit and long tail (Greyford). */
export function sallet(b: CharBuilder, o: HelmOpts & { visor?: boolean } = {}) {
  const mat = o.mat ?? M.steelOld;
  const all: Ring[] = [
    { y: 0.235, rx: 0.02, cz: -0.01 }, { y: 0.225, rx: 0.065, rz: 0.075, cz: -0.012 }, { y: 0.19, rx: 0.098, rz: 0.115, cz: -0.012 },
    { y: 0.13, rx: 0.106, rz: 0.125, cz: -0.006 }, { y: 0.07, rx: 0.108, rz: 0.126, cz: -0.004, back: 1.1 },
    { y: 0.02, rx: 0.11, rz: 0.126, cz: -0.004, back: 1.3 }, { y: -0.02, rx: 0.115, rz: 0.13, cz: -0.004, back: 1.55 },
  ];
  const lo: LoftOpts = { segs: 22, capTop: true, radial: ridge(0, 0.03, 0.25) };
  const upper = slice(all, 0.235, 0.09);
  const g = loft(upper, lo);
  if (o.dents) dent(g, b.rng, 0.006, o.dents, 0.05);
  b.add('head', g, mat);
  b.crackOn('head', upper, lo);
  // slit band only at the back/sides; below the slit a visor lip in front, tail at the back
  b.add('head', loft(slice(all, 0.09, 0.066), { segs: 22, phi0: 1.1, phiLen: TAU - 2.2 }), mat);
  if (o.visor !== false) b.add('head', loft(slice(all, 0.066, 0.035), { segs: 22 }), mat);
  b.add('head', loft(slice(all, o.visor !== false ? 0.035 : 0.066, -0.02), { segs: 18, phi0: 1.2, phiLen: TAU - 2.4 }), mat);
  liner(b, 0.098, !!o.eyes);
  // central comb
  b.add('head', sweep([[0, 0.17, 0.1], [0, 0.238, 0.0], [0, 0.2, -0.1], [0, 0.08, -0.15]], { w: 0.003, h: 0.007, up: [1, 0, 0], sides: 4, segs: 10 }), mat);
  if (o.trim) b.add('head', loft(slice(all, 0.1, 0.09), { segs: 22, inflate: 0.003 }), o.trim);
}

/** Bevor: chin/neck plate for sallets (neck bone). */
export function bevor(b: CharBuilder, o: { mat?: string } = {}) {
  b.add('neck', loft([
    { y: 0.16, rx: 0.075, rz: 0.1, cz: 0.02 }, { y: 0.08, rx: 0.085, rz: 0.1, cz: 0.02 }, { y: -0.02, rx: 0.12, rz: 0.12, cz: 0.0 },
  ], { segs: 16, phi0: -1.8, phiLen: 3.6 }), o.mat ?? M.steelOld, { skin: (p) => [['neck', 0.5], ['chest', 0.5 - Math.max(0, p.y) * 2], ['head', Math.max(0, p.y) * 2]] });
}

/** Bascinet: pointed skull, open face or snouted visor (hounskull) with slits; mail aventail. */
export function bascinet(b: CharBuilder, o: HelmOpts & { visor?: boolean; aventail?: string | null } = {}) {
  const mat = o.mat ?? M.steel;
  const rings: Ring[] = [
    { y: 0.29, rx: 0.008, cz: -0.02 }, { y: 0.25, rx: 0.05, rz: 0.058, cz: -0.02 }, { y: 0.2, rx: 0.088, rz: 0.1, cz: -0.012 },
    { y: 0.13, rx: 0.1, rz: 0.118, cz: -0.004 }, { y: 0.06, rx: 0.102, rz: 0.12, cz: -0.002 }, { y: -0.02, rx: 0.098, rz: 0.114, cz: -0.004 },
    { y: -0.07, rx: 0.1, rz: 0.116, cz: -0.006 },
  ];
  const lo: LoftOpts = { segs: 20, capTop: true };
  // open face: skull cap full to the brow, then sides/back only
  const capR = slice(rings, 0.29, 0.1);
  const g = loft(capR, lo);
  if (o.dents) dent(g, b.rng, 0.005, o.dents, 0.05);
  b.add('head', g, mat);
  b.crackOn('head', capR, lo);
  b.add('head', loft(slice(rings, 0.1, -0.07), { segs: 20, phi0: 0.95, phiLen: TAU - 1.9 }), mat);
  if (o.trim) b.add('head', loft(slice(rings, 0.112, 0.098), { segs: 20, inflate: 0.003 }), o.trim);
  if (o.visor) {
    // hounskull snout: a pointed cone forward with eye slits and breaths
    const v: Ring[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      v.push({ y: lerp(0.0, 0.14, t), rx: 0.095 * Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.5 + 0.005, rz: 0.03, cz: 0 });
    }
    const snout = loft([
      { y: 0.105, rx: 0.098, rz: 0.1, cz: 0.02 }, { y: 0.085, rx: 0.098, rz: 0.13, cz: 0.02, front: 1.05 },
      { y: 0.06, rx: 0.09, rz: 0.16, cz: 0.02, front: 1.25 }, { y: 0.02, rx: 0.08, rz: 0.15, cz: 0.02, front: 1.2 },
      { y: -0.03, rx: 0.08, rz: 0.12, cz: 0.02 }, { y: -0.065, rx: 0.09, rz: 0.11, cz: 0.015 },
    ], { segs: 16, phi0: -1.45, phiLen: 2.9, radial: ridge(0, 0.35, 0.28) });
    void v;
    b.add('head', snout, mat);
    liner(b, 0.095, !!o.eyes);
    // eye slits: thin dark strips across the snout's upper flank
    for (const s of [1, -1]) {
      b.add('head', sweep([[s * 0.015, 0.078, 0.188], [s * 0.05, 0.08, 0.15], [s * 0.078, 0.082, 0.1]], { w: 0.004, h: 0.003, up: [0, 1, 0], sides: 4, segs: 6 }), o.eyes ? M.crack : M.shadow);
    }
    const holes = [];
    for (let i = 0; i < 6; i++) {
      const a = (i % 2 ? 1 : -1) * (0.25 + Math.floor(i / 2) * 0.12);
      holes.push({ p: new THREE.Vector3(Math.sin(a) * 0.07, 0.02 - Math.floor(i / 2) * 0.02, 0.02 + Math.cos(a) * 0.135), n: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)) });
    }
    b.add('head', scatter(() => loft([{ y: 0.001, rx: 0.004 }, { y: 0, rx: 0.004 }], { segs: 6, capTop: true }), holes), M.shadow);
    // visor pivots
    for (const s of [1, -1]) b.add('head', xf(rivet(0.012), { p: [s * 0.103, 0.1, 0.0], r: [0, 0, -s * Math.PI / 2] }), o.trim ?? mat);
  }
  if (o.aventail !== null) {
    b.add('neck', loft([
      { y: 0.08, rx: 0.1, rz: 0.115, cz: 0.0 }, { y: 0.0, rx: 0.11, rz: 0.12 }, { y: -0.05, rx: 0.17, rz: 0.15, cz: -0.01 },
      { y: -0.09, rx: 0.2 * (0.45 + 0.55 * b.shoulder), rz: 0.16, cz: -0.015 },
    ], { segs: 20, radial: (th, v) => 1 + (v > 0.85 ? 0.03 * Math.abs(Math.sin(th * 16)) : 0) }), o.aventail ?? M.mail, {
      skin: (p) => { const c = Math.min(1, Math.max(0, (0.05 - p.y) / 0.12)); return [['neck', 1 - c], ['chest', c]]; },
    });
  }
}

/** Conical helm with a nasal bar over a mail coif (sentry). */
export function nasalHelm(b: CharBuilder, o: HelmOpts & { coif?: string | null } = {}) {
  const mat = o.mat ?? M.steelOld;
  const r: Ring[] = [{ y: 0.3, rx: 0.006 }, { y: 0.25, rx: 0.052, rz: 0.058 }, { y: 0.18, rx: 0.092, rz: 0.104, cz: 0.004 }, { y: 0.1, rx: 0.1, rz: 0.114, cz: 0.006 }, { y: 0.085, rx: 0.102, rz: 0.116, cz: 0.006 }];
  const g = loft(r, { segs: 18, capTop: true, radial: ridge(0, 0.02, 0.3) });
  if (o.dents) dent(g, b.rng, 0.006, o.dents, 0.05);
  b.add('head', g, mat);
  b.crackOn('head', r, { segs: 18 });
  b.add('head', loft([{ y: 0.1, rx: 0.104, rz: 0.118, cz: 0.006 }, { y: 0.082, rx: 0.106, rz: 0.12, cz: 0.006 }], { segs: 18 }), o.trim ?? mat);
  b.add('head', sweep([[0, 0.1, 0.124], [0, 0.06, 0.128], [0, 0.02, 0.125]], { w: 0.011, h: 0.004, up: [1, 0, 0], sides: 4, p: 6, segs: 4, caps: true }), o.trim ?? mat);
  if (o.coif !== null) {
    // mail coif framing the face, falling onto the shoulders
    b.add('head', loft([
      { y: 0.095, rx: 0.098, rz: 0.112, cz: 0.004 }, { y: 0.0, rx: 0.098, rz: 0.114, cz: 0.004 }, { y: -0.08, rx: 0.09, rz: 0.11 },
    ], { segs: 18, phi0: 0.75, phiLen: TAU - 1.5 }), o.coif ?? M.mail);
    b.add('neck', loft([{ y: 0.04, rx: 0.095, rz: 0.11, cz: 0.01 }, { y: -0.04, rx: 0.15, rz: 0.14 }, { y: -0.08, rx: 0.19 * (0.45 + 0.55 * b.shoulder), rz: 0.15, cz: -0.01 }], { segs: 18 }), o.coif ?? M.mail, {
      skin: (p) => { const c = Math.min(1, Math.max(0, (0.04 - p.y) / 0.1)); return [['neck', 1 - c], ['chest', c]]; },
    });
    b.add('head', inside(ellipsoid(0.09, 0.1, 0.1, { segs: 10, rows: 6 })), M.shadow, { p: [0, 0.04, 0.0] });
  }
}

export interface HoodOpts { mat: string; lining?: string; trim?: string | null; emb?: boolean; depth?: number; tip?: number; open?: number; tatter?: boolean; }

/** Deep hood with a shadowed interior, rim trim and a point at the back. */
export function hood(b: CharBuilder, o: HoodOpts) {
  const d = o.depth ?? 1.2;
  const tip = o.tip ?? 0.06;
  const open = o.open ?? 0.9;
  const all: Ring[] = [
    { y: 0.29 + tip * 0.3, rx: 0.012, cz: -0.07 - tip },
    { y: 0.265, rx: 0.07, rz: 0.08, cz: -0.035 - tip * 0.3 },
    { y: 0.215, rx: 0.108, rz: 0.13, cz: -0.004, front: d },
    { y: 0.14, rx: 0.118, rz: 0.14, cz: 0.012, front: d },
    { y: 0.04, rx: 0.12, rz: 0.142, cz: 0.014, front: d },
    { y: -0.05, rx: 0.13, rz: 0.14, cz: 0.004, front: d * 0.95 },
    { y: -0.12, rx: 0.16, rz: 0.15, cz: -0.01 },
  ];
  const skin: SkinFn = (p) => {
    const c = Math.min(1, Math.max(0, (-0.02 - p.y) / 0.1));
    return [['head', 1 - c], ['neck', c * 0.4], ['chest', c * 0.6]];
  };
  const topR = slice(all, all[0].y, 0.215), lowR = slice(all, 0.215, -0.12);
  const fold = (th: number, v: number) => 1 + 0.025 * Math.sin(th * 5 + v * 4);
  b.add('head', loft(topR, { segs: 20, radial: fold }), o.mat, { skin });
  b.add('head', loft(lowR, { segs: 20, phi0: open, phiLen: TAU - open * 2, radial: fold }), o.mat, { skin });
  // lining (inside faces) — deep shadow around the face
  const lin = o.lining ?? M.shadow;
  b.add('head', inside(loft(grow(topR, -0.006), { segs: 16 })), lin, { skin });
  b.add('head', inside(loft(grow(lowR, -0.006), { segs: 16, phi0: open, phiLen: TAU - open * 2 })), lin, { skin });
  // the face recess: a dark veil just in front of the face keeps it in shadow at a distance
  if (o.trim !== null) {
    // rim roll around the opening
    const pts: V3[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let y: number, a: number;
      if (t < 0.4) { y = lerp(-0.1, 0.215, t / 0.4); a = open; }
      else if (t < 0.6) { y = 0.215 + Math.sin(((t - 0.4) / 0.2) * Math.PI) * 0.012; a = lerp(open, -open, (t - 0.4) / 0.2); }
      else { y = lerp(0.215, -0.1, (t - 0.6) / 0.4); a = -open; }
      const r = ringAtY(all, y);
      const rz = (r.rz ?? r.rx) * (Math.cos(a) > 0 ? (r.front ?? 1) : 1);
      pts.push([Math.sin(a) * (r.rx + 0.004), y, (r.cz ?? 0) + Math.cos(a) * (rz + 0.004)]);
    }
    b.add('head', sweep(pts, { r: 0.011, sides: 6, segs: 24 }), o.mat, { skin });
    if (o.trim) b.add('head', sweep(pts.map(([x, y, z]) => [x * 1.06, y, z * 1.04 + 0.004] as V3), { w: 0.009, h: 0.002, sides: 4, segs: 24, up: (t) => [0, 0, 1] as V3 }), o.emb ? M.emb : o.trim, { skin });
  }
}

/** Wide-brimmed hunting hat with a feather. */
export function wideHat(b: CharBuilder, o: { mat?: string; band?: string; feather?: string } = {}) {
  const mat = o.mat ?? M.leatherDark;
  b.add('head', loft([
    { y: 0.29, rx: 0.06, rz: 0.07, cz: -0.005 }, { y: 0.27, rx: 0.085, rz: 0.098 }, { y: 0.2, rx: 0.098, rz: 0.11 }, { y: 0.14, rx: 0.103, rz: 0.116, cz: 0.004 },
  ], { segs: 18, capTop: true, radial: ridge(0, -0.06, 0.4) }), mat);
  const brim = loft([
    { y: 0.145, rx: 0.1, rz: 0.114, cz: 0.004 }, { y: 0.14, rx: 0.16, rz: 0.17, cz: 0.01 }, { y: 0.128, rx: 0.215, rz: 0.22, cz: 0.012 },
  ], { segs: 26, radial: (th) => 1 + 0.06 * Math.cos(th * 2) });
  // turn up the left side
  const p = brim.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (x > 0.1) p.setY(i, p.getY(i) + (x - 0.1) * 0.9);
    const z = p.getZ(i);
    if (z > 0.14) p.setY(i, p.getY(i) - (z - 0.14) * 0.3);
  }
  brim.computeVertexNormals();
  b.add('head', brim, mat);
  b.add('head', inside(loft([{ y: 0.14, rx: 0.1, rz: 0.114, cz: 0.004 }, { y: 0.133, rx: 0.2, rz: 0.21, cz: 0.012 }], { segs: 20 })), M.shadow);
  b.add('head', loft([{ y: 0.175, rx: 0.1, rz: 0.113, cz: 0.002 }, { y: 0.15, rx: 0.103, rz: 0.116, cz: 0.004 }], { segs: 18, inflate: 0.003 }), o.band ?? M.red);
  // feather: shaft + vane
  const fpts: V3[] = [[0.09, 0.17, -0.02], [0.13, 0.23, -0.07], [0.15, 0.3, -0.14], [0.14, 0.35, -0.2]];
  b.add('head', sweep(fpts, { r: 0.002, sides: 4, segs: 8 }), o.feather ?? M.linen);
  b.add('head', panel((u, v) => {
    const t = 0.15 + u * 0.85;
    const i = Math.min(2, Math.floor(t * 3));
    const f = t * 3 - i;
    const a = fpts[i], c = fpts[i + 1];
    const w = Math.sin(t * Math.PI) * 0.028 * (v - 0.5) * 2;
    return [lerp(a[0], c[0], f) + w * 0.3, lerp(a[1], c[1], f) + w * 0.4, lerp(a[2], c[2], f) + w];
  }, 8, 2, { thick: 0.001 }), o.feather ?? 'cloth_linen|t=d8d0c0');
}

/** Hanging veil (funeral): a pale cloth falling from the helm/hood over the face and shoulders. */
export function veil(b: CharBuilder, o: { mat?: string; face?: boolean; y?: number; r?: number } = {}) {
  const mat = o.mat ?? 'cloth_linen|t=d0c8b8';
  const y = o.y ?? 0.16, r = o.r ?? 0.125;
  const f = (u: number, v: number): V3 => {
    const th = lerp(o.face ? -Math.PI : 0.9, o.face ? Math.PI : TAU - 0.9, u);
    const rr = lerp(r, r + 0.07, v);
    return [Math.sin(th) * rr, y - v * 0.32, Math.cos(th) * rr * 1.1 + 0.01];
  };
  b.add('head', panel(f, 20, 5, { rng: b.rng, tatter: 0.18 }), mat, {
    skin: (p) => { const c = Math.min(1, Math.max(0, (0.0 - p.y) / 0.12)); return [['head', 1 - c], ['chest', c]]; },
  });
}

// ------------------------------------------------------------------------------------ chains & props

/** Loose chains draped on the body (bone-local points). */
export function drapeChain(b: CharBuilder, bone: BoneName, pts: V3[], mat = M.iron, link = 0.03, skin?: SkinFn) {
  b.add(bone, chain(pts, link, link * 0.16), mat, skin ? { skin } : undefined);
}

/** Shackle ring around a limb. */
export function shackle(b: CharBuilder, bone: BoneName, y: number, r: number, mat = M.iron) {
  b.loft(bone, [{ y: y + 0.022, rx: r, rz: r * 0.95 }, { y: y - 0.022, rx: r, rz: r * 0.95 }], mat, { segs: 12, inflate: 0.004 });
  b.add(bone, xf(rivet(0.008), { p: [0, y, r + 0.004], r: [Math.PI / 2, 0, 0] }), mat);
}

/** A small bronze bell (lathe), mouth down, hanging point at the origin. */
export function bellGeom(h = 0.06): G {
  const k = h / 0.06;
  return merge([
    loft([
      { y: 0.0, rx: 0.004 * k }, { y: -0.004 * k, rx: 0.008 * k }, { y: -0.008 * k, rx: 0.014 * k }, { y: -0.025 * k, rx: 0.018 * k },
      { y: -0.045 * k, rx: 0.024 * k }, { y: -0.055 * k, rx: 0.031 * k }, { y: -0.06 * k, rx: 0.033 * k },
    ], { segs: 12, capTop: true }),
    inside(loft([{ y: -0.015 * k, rx: 0.012 * k }, { y: -0.06 * k, rx: 0.029 * k }], { segs: 12, capTop: true })),
    xf(ellipsoid(0.007 * k, 0.007 * k, 0.007 * k, { segs: 6, rows: 4 }), { p: [0, -0.055 * k, 0] }),
  ]);
}

/** Rosary / prayer beads: a loop of beads with a pendant (bone-local). */
export function beads(b: CharBuilder, bone: BoneName, centre: V3, r: number, drop: number, mat: string, pendant: string, skin?: SkinFn) {
  const parts: G[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    parts.push(xf(ellipsoid(0.0065, 0.0065, 0.0065, { segs: 6, rows: 4 }), { p: [centre[0] + Math.sin(a) * r * 0.6, centre[1] - (1 - Math.cos(a)) * drop * 0.5, centre[2] + Math.cos(a) * r * 0.2 + 0.005] }));
  }
  b.add(bone, merge(parts), mat, skin ? { skin } : undefined);
  b.add(bone, xf(bellGeom(0.03), { p: [centre[0], centre[1] - drop - 0.01, centre[2] + 0.01] }), pendant, skin ? { skin } : undefined);
}

// ------------------------------------------------------------------------------------ cloaks

export type CloakStyle = 'long' | 'mantle' | 'cape' | 'heavy' | 'rag' | 'shroud';

/** Standard body colliders for cloth (reference units, bone-local), padded for armour. */
export function bodyColliders(pad = 0): ClothCollider[] {
  return [
    { bone: 'chest', a: [0, 0.08, 0.0], r: 0.15 + pad },
    { bone: 'chest', a: [-0.13, 0.17, -0.01], b: [0.13, 0.17, -0.01], r: 0.075 + pad },
    { bone: 'spine', a: [0, 0.08, 0.0], r: 0.14 + pad },
    { bone: 'hips', a: [-0.06, -0.05, -0.01], b: [0.06, -0.05, -0.01], r: 0.135 + pad },
    { bone: 'thighL', a: [0, -0.02, 0], b: [0, -0.42, 0], r: 0.085 + pad * 0.6 },
    { bone: 'thighR', a: [0, -0.02, 0], b: [0, -0.42, 0], r: 0.085 + pad * 0.6 },
    { bone: 'shinL', a: [0, 0.0, 0], b: [0, -0.38, 0], r: 0.06 + pad * 0.5 },
    { bone: 'shinR', a: [0, 0.0, 0], b: [0, -0.38, 0], r: 0.06 + pad * 0.5 },
    { bone: 'upperArmL', a: [0, 0, 0], b: [0, -0.26, 0], r: 0.058 + pad * 0.6 },
    { bone: 'upperArmR', a: [0, 0, 0], b: [0, -0.26, 0], r: 0.058 + pad * 0.6 },
  ];
}

/**
 * Add a simulated cloak hanging from the shoulders (chest space).
 * `pad` widens colliders and the rest shape for armour underneath.
 */
export function cloak(b: CharBuilder, style: CloakStyle, o: { mat?: string; pad?: number; seed?: number; heraldry?: boolean; fur?: boolean } = {}) {
  const pad = o.pad ?? 0;
  const presets: Record<CloakStyle, { len: number; w0: number; w1: number; a0: number; a1: number; cols: number; rows: number; tat: number; holes: number; mat: string }> = {
    long: { len: 1.22, w0: 0.19, w1: 0.36, a0: 1.25, a1: 1.3, cols: 11, rows: 16, tat: 0.16, holes: 7, mat: M.black },
    mantle: { len: 1.12, w0: 0.2, w1: 0.38, a0: 1.45, a1: 1.45, cols: 12, rows: 15, tat: 0.12, holes: 4, mat: M.blue },
    cape: { len: 0.62, w0: 0.19, w1: 0.32, a0: 1.3, a1: 1.35, cols: 11, rows: 10, tat: 0.2, holes: 3, mat: M.brown },
    heavy: { len: 1.3, w0: 0.22, w1: 0.42, a0: 1.35, a1: 1.4, cols: 12, rows: 16, tat: 0.12, holes: 4, mat: M.red },
    rag: { len: 0.7, w0: 0.18, w1: 0.3, a0: 1.2, a1: 1.1, cols: 9, rows: 10, tat: 0.3, holes: 9, mat: 'cloth_brown|t=8a8070' },
    shroud: { len: 1.2, w0: 0.19, w1: 0.34, a0: 1.3, a1: 1.3, cols: 11, rows: 15, tat: 0.22, holes: 8, mat: M.black },
  };
  const P = presets[style];
  const seed = o.seed ?? b.rng.int(1, 999);
  const matKey = `${o.mat ?? P.mat}|ds|tat=${seed % 16}:${P.tat}:${P.holes}`;
  const top = 0.23;
  const rest = (u: number, v: number): V3 => {
    const R = lerp(P.w0 + pad, P.w1 + pad, Math.pow(v, 0.7));
    const a = lerp(-1, 1, u) * lerp(P.a0, P.a1, v);
    const zk = lerp(0.55, 0.62, v);
    const y = top - v * P.len;
    return [Math.sin(a) * R * 1.05, y, -Math.cos(a) * R * zk - 0.05 - pad * 0.6 - v * 0.04];
  };
  b.addCloth({
    cols: P.cols, rows: P.rows, frame: 'chest', rest, pinRows: 2,
    colliders: bodyColliders(pad),
    mat: matKey,
    decal: o.heraldry ? { mat: 'gold_trim|a=arms2|po', rect: [0.3, 0.12, 0.7, 0.44] } : undefined,
    stiffness: 1, bend: style === 'heavy' ? 0.45 : 0.25, damping: style === 'heavy' ? 0.982 : 0.986,
    windScale: style === 'heavy' ? 0.6 : 1,
  });
  // clasp + collar roll where the cloth is pinned
  const clasp = style === 'rag' ? M.rope : M.bronze;
  b.add('chest', sweep(
    Array.from({ length: 11 }, (_, i) => rest(i / 10, 0.02)).map(([x, y, z]) => [x * 1.02, y + 0.012, z * 1.02] as V3),
    { r: style === 'rag' ? 0.012 : 0.016, sides: 6, segs: 16 }), o.mat ?? P.mat);
  if (style !== 'rag' && style !== 'shroud') {
    for (const s of [1, -1]) {
      const p = rest(s > 0 ? 0.96 : 0.04, 0.0);
      b.add('chest', xf(loft([{ y: 0.004, rx: 0.02 }, { y: -0.004, rx: 0.024 }], { segs: 10, capTop: true }), { p: [p[0] * 0.97, p[1] + 0.005, p[2] + 0.02], r: [Math.PI / 2 - 0.4, 0, 0] }), clasp);
    }
    // chain between the clasps across the chest
    const l = rest(0.96, 0), r = rest(0.04, 0);
    drapeChain(b, 'chest', [[l[0] * 0.97, l[1], l[2] + 0.03], [0, 0.18, 0.14 + pad], [r[0] * 0.97, r[1], r[2] + 0.03]], M.bronze, 0.022);
  }
  if (o.fur) {
    const fur = (th: number, v: number) => 1 + 0.16 * Math.abs(Math.sin(th * 19 + v * 5)) * Math.abs(Math.sin(th * 7));
    b.add('chest', loft([
      { y: 0.33, rx: 0.11, rz: 0.1, cz: -0.02 }, { y: 0.3, rx: 0.19 + pad, rz: 0.15 + pad, cz: -0.03 },
      { y: 0.23, rx: 0.25 + pad, rz: 0.18 + pad, cz: -0.04 }, { y: 0.17, rx: 0.24 + pad, rz: 0.17 + pad, cz: -0.05 },
    ], { segs: 28, radial: fur, phi0: 0.55, phiLen: TAU - 1.1 }), M.fur, {
      skin: (p) => { const s = p.x > 0 ? 'shoulderL' : 'shoulderR'; const k = Math.min(0.4, Math.max(0, (Math.abs(p.x) - 0.1) * 3)); return [['chest', 1 - k], [s, k]]; },
    });
  }
}

export { sm, angDiff, lerp };
export type { SkinFn };
