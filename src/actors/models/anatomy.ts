/**
 * Base anatomy shared by every humanoid look: trunk, limbs, neck, head with face and hair, hands
 * (a closed fist around the weapon socket's grip axis) and feet/boots.
 *
 * Reference numbers (1.80 m rig, root space): hips 0.98, chest 1.28, neck 1.53, head 1.63,
 * shoulder joints (±0.19, 1.46), wrists 0.91, hip joints (±0.10, 0.92), knees 0.48, ankles 0.05.
 * The trunk is authored in HIPS space (y = 0 at 0.98 m) as one continuous surface with smooth
 * spine/chest weights, so bending never opens seams.
 */
import * as THREE from 'three';
import type { BoneName } from '../rigDefs';
import { type CharBuilder, trunkSkin, jointSkin, parentSkin, type SkinFn } from './builder';
import { ellipsoid, loft, sweep, type Ring, type G, type V3, type LoftOpts, merge, xf, rivet, lerp } from './parts';

export type Sex = 'm' | 'f';

/** Linear interpolation of rings at a given y (rings must be sorted by y, any direction). */
export function ringAtY(rings: Ring[], y: number): Ring {
  const r = [...rings].sort((a, b) => a.y - b.y);
  if (y <= r[0].y) return { ...r[0], y };
  if (y >= r[r.length - 1].y) return { ...r[r.length - 1], y };
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i], b = r[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y || 1);
      const L = (x: number | undefined, z: number | undefined, d: number) => lerp(x ?? d, z ?? d, t);
      return {
        y, rx: L(a.rx, b.rx, 0), rz: L(a.rz ?? a.rx, b.rz ?? b.rx, 0), cx: L(a.cx, b.cx, 0), cz: L(a.cz, b.cz, 0),
        p: L(a.p, b.p, 2), front: L(a.front, b.front, 1), back: L(a.back, b.back, 1),
      };
    }
  }
  return { ...r[0], y };
}

/** Sub-range of a ring stack between y0 and y1 (inclusive, interpolated ends), top → bottom. */
export function slice(rings: Ring[], y0: number, y1: number): Ring[] {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  const inner = rings.filter((r) => r.y > lo && r.y < hi);
  return [ringAtY(rings, hi), ...inner.sort((a, b) => b.y - a.y), ringAtY(rings, lo)];
}

/** Grow every ring by `d` metres (and optionally scale). */
export function grow(rings: Ring[], d: number, k = 1): Ring[] {
  return rings.map((r) => ({ ...r, rx: r.rx * k + d, rz: (r.rz ?? r.rx) * k + d }));
}

// ------------------------------------------------------------------------------------ trunk

/** Trunk rings in hips space (crotch → neck base). */
export function trunkRings(sex: Sex, sh = 1): Ring[] {
  const f = sex === 'f';
  const S = (x: number) => x * (0.45 + 0.55 * sh); // shoulder-width factor on the upper chest
  return [
    { y: 0.575, rx: 0.058, rz: 0.056, cz: -0.005 },
    { y: 0.545, rx: S(f ? 0.11 : 0.13), rz: f ? 0.07 : 0.08, cz: -0.01 },
    { y: 0.505, rx: S(f ? 0.155 : 0.182), rz: f ? 0.088 : 0.1, cz: -0.012, p: 2.3 },
    { y: 0.45, rx: S(f ? 0.158 : 0.188), rz: f ? 0.098 : 0.115, cz: -0.008, p: 2.4 },
    { y: 0.39, rx: f ? 0.148 : 0.178, rz: f ? 0.105 : 0.12, cz: 0, p: 2.3, front: f ? 1.25 : 1.05 },
    { y: 0.33, rx: f ? 0.138 : 0.168, rz: f ? 0.1 : 0.115, cz: 0, p: 2.3, front: f ? 1.18 : 1.03 },
    { y: 0.26, rx: f ? 0.125 : 0.158, rz: f ? 0.088 : 0.108, cz: 0.002, p: 2.2 },
    { y: 0.17, rx: f ? 0.112 : 0.148, rz: f ? 0.08 : 0.1, cz: 0.004, p: 2.2 },
    { y: 0.08, rx: f ? 0.118 : 0.148, rz: f ? 0.082 : 0.098, cz: 0.004, p: 2.2 },
    { y: -0.01, rx: f ? 0.16 : 0.158, rz: f ? 0.1 : 0.1, cz: 0, p: 2.3, back: 1.1 },
    { y: -0.08, rx: f ? 0.168 : 0.158, rz: f ? 0.105 : 0.102, cz: -0.004, p: 2.3, back: 1.15 },
    { y: -0.13, rx: f ? 0.145 : 0.14, rz: 0.09, cz: -0.004, back: 1.1 },
    { y: -0.165, rx: 0.08, rz: 0.06, cz: 0 },
  ];
}

/** Add a trunk layer (skin, shirt, gambeson…) between y0 and y1 in hips space. */
export function addTrunk(b: CharBuilder, sex: Sex, mat: string, o: { y0?: number; y1?: number; inflate?: number; radial?: LoftOpts['radial']; segs?: number; capTop?: boolean; capBottom?: boolean; crack?: number } = {}) {
  const rings = grow(slice(trunkRings(sex, b.shoulder), o.y1 ?? 0.575, o.y0 ?? -0.165), o.inflate ?? 0);
  b.loft('hips', rings, mat, { segs: o.segs ?? 20, radial: o.radial, capTop: o.capTop, capBottom: o.capBottom }, { skin: trunkSkin, crack: o.crack });
  return rings;
}

/** Quilted radial modulation (gambesons): horizontal rolls + faint vertical stitch lines. */
export const quilted = (rows = 28, cols = 18, amp = 0.035): LoftOpts['radial'] => (th, v) =>
  1 + amp * (Math.abs(Math.sin(v * Math.PI * rows)) - 0.5) + amp * 0.35 * (Math.abs(Math.sin(th * cols * 0.5)) - 0.5);

// ------------------------------------------------------------------------------------ limbs

export function upperArmRings(sex: Sex): Ring[] {
  const k = sex === 'f' ? 0.86 : 1;
  return [
    { y: 0.03, rx: 0.05 * k, rz: 0.052 * k },
    { y: -0.04, rx: 0.056 * k, rz: 0.054 * k },
    { y: -0.12, rx: 0.05 * k, rz: 0.054 * k, front: 1.08 },
    { y: -0.22, rx: 0.044 * k, rz: 0.045 * k },
    { y: -0.3, rx: 0.042 * k, rz: 0.04 * k },
  ];
}
export function forearmRings(sex: Sex): Ring[] {
  const k = sex === 'f' ? 0.86 : 1;
  return [
    { y: 0.02, rx: 0.041 * k, rz: 0.04 * k },
    { y: -0.05, rx: 0.046 * k, rz: 0.042 * k },
    { y: -0.14, rx: 0.039 * k, rz: 0.035 * k },
    { y: -0.24, rx: 0.031 * k, rz: 0.025 * k },
    { y: -0.275, rx: 0.029 * k, rz: 0.023 * k },
  ];
}
export function thighRings(sex: Sex): Ring[] {
  const k = sex === 'f' ? 0.94 : 1;
  return [
    { y: 0.06, rx: 0.075 * k, rz: 0.08 * k, cx: 0 },
    { y: -0.04, rx: 0.086 * k, rz: 0.088 * k },
    { y: -0.18, rx: 0.074 * k, rz: 0.078 * k, front: 1.05 },
    { y: -0.32, rx: 0.062 * k, rz: 0.064 * k },
    { y: -0.45, rx: 0.052 * k, rz: 0.054 * k },
  ];
}
export function shinRings(sex: Sex): Ring[] {
  const k = sex === 'f' ? 0.9 : 1;
  return [
    { y: 0.03, rx: 0.05 * k, rz: 0.052 * k },
    { y: -0.1, rx: 0.052 * k, rz: 0.056 * k, back: 1.25 },
    { y: -0.22, rx: 0.043 * k, rz: 0.044 * k, back: 1.1 },
    { y: -0.36, rx: 0.034 * k, rz: 0.034 * k },
    { y: -0.43, rx: 0.033 * k, rz: 0.036 * k },
  ];
}

/** Skin for an upper-arm layer: top 40% follows the shoulder, bottom blends into the forearm. */
export const upperArmSkin = (side: 1 | -1): SkinFn => {
  const up: BoneName = side > 0 ? 'upperArmL' : 'upperArmR';
  const sh: BoneName = side > 0 ? 'shoulderL' : 'shoulderR';
  const fo: BoneName = side > 0 ? 'forearmL' : 'forearmR';
  const a = parentSkin(up, sh, 0.03, -0.06, 0.4), c = jointSkin(up, fo, -0.24, -0.31, 0.5);
  return (p) => {
    if (p.y > -0.1) return a(p);
    return c(p);
  };
};
export const forearmSkin = (side: 1 | -1): SkinFn => {
  const fo: BoneName = side > 0 ? 'forearmL' : 'forearmR';
  const up: BoneName = side > 0 ? 'upperArmL' : 'upperArmR';
  return parentSkin(fo, up, 0.03, -0.04, 0.45);
};
export const thighSkin = (side: 1 | -1): SkinFn => {
  const th: BoneName = side > 0 ? 'thighL' : 'thighR';
  const sh: BoneName = side > 0 ? 'shinL' : 'shinR';
  const a = parentSkin(th, 'hips', 0.06, -0.08, 0.5), c = jointSkin(th, sh, -0.38, -0.46, 0.5);
  return (p) => (p.y > -0.15 ? a(p) : c(p));
};
export const shinSkin = (side: 1 | -1): SkinFn => parentSkin(side > 0 ? 'shinL' : 'shinR', side > 0 ? 'thighL' : 'thighR', 0.03, -0.04, 0.45);

/** Arms layer (skin or sleeves). `upper`/`fore` pick segments; inflate grows the rings. */
export function addArms(b: CharBuilder, sex: Sex, mat: string, o: { inflate?: number; upper?: boolean; fore?: boolean; foreY1?: number; radial?: LoftOpts['radial']; crack?: number } = {}) {
  for (const side of [1, -1] as const) {
    const U: BoneName = side > 0 ? 'upperArmL' : 'upperArmR';
    const F: BoneName = side > 0 ? 'forearmL' : 'forearmR';
    if (o.upper !== false) b.loft(U, grow(upperArmRings(sex), o.inflate ?? 0), mat, { segs: 12, radial: o.radial }, { skin: upperArmSkin(side), crack: o.crack });
    if (o.fore !== false) {
      const rr = grow(slice(forearmRings(sex), 0.02, o.foreY1 ?? -0.275), o.inflate ?? 0);
      b.loft(F, rr, mat, { segs: 12, radial: o.radial, capBottom: true }, { skin: forearmSkin(side), crack: o.crack });
    }
  }
}

/** Legs layer (skin, trousers, hose). */
export function addLegs(b: CharBuilder, sex: Sex, mat: string, o: { inflate?: number; thigh?: boolean; shin?: boolean; shinY1?: number; radial?: LoftOpts['radial']; crack?: number } = {}) {
  for (const side of [1, -1] as const) {
    const T: BoneName = side > 0 ? 'thighL' : 'thighR';
    const S: BoneName = side > 0 ? 'shinL' : 'shinR';
    if (o.thigh !== false) b.loft(T, grow(thighRings(sex), o.inflate ?? 0), mat, { segs: 14, radial: o.radial }, { skin: thighSkin(side), crack: o.crack });
    if (o.shin !== false) b.loft(S, grow(slice(shinRings(sex), 0.03, o.shinY1 ?? -0.43), o.inflate ?? 0), mat, { segs: 12, radial: o.radial }, { skin: shinSkin(side), crack: o.crack });
  }
}

/** Deltoid caps bridging trunk and upper arm (always under whatever covers the shoulders). */
export function addShoulders(b: CharBuilder, sex: Sex, mat: string, inflate = 0) {
  const k = sex === 'f' ? 0.85 : 1;
  b.addLR('upperArmL', 'upperArmR', (side) => xf(ellipsoid(0.066 * k + inflate, 0.07 * k + inflate, 0.064 * k + inflate, { segs: 12, rows: 7, lat1: Math.PI * 0.72 }), { p: [side * -0.005, -0.015, 0] }), mat,
    (side) => ({ skin: parentSkin(side > 0 ? 'upperArmL' : 'upperArmR', side > 0 ? 'shoulderL' : 'shoulderR', 0.05, -0.05, 0.5) }));
}

/** Neck (neck-bone space), blending into the chest below and the head above. */
export function addNeck(b: CharBuilder, sex: Sex, mat: string, inflate = 0) {
  const k = sex === 'f' ? 0.85 : 1;
  b.loft('neck', grow([
    { y: 0.13, rx: 0.045 * k, rz: 0.05 * k, cz: 0.005 },
    { y: 0.06, rx: 0.05 * k, rz: 0.052 * k, cz: 0.005 },
    { y: -0.01, rx: 0.058 * k, rz: 0.058 * k },
    { y: -0.05, rx: 0.075 * k, rz: 0.066 * k, cz: -0.005 },
  ], inflate), mat, { segs: 12 }, {
    skin: (p) => {
      const h = Math.min(1, Math.max(0, (p.y - 0.06) / 0.07));
      const c = Math.min(1, Math.max(0, (0.0 - p.y) / 0.05));
      return [['neck', 1 - h * 0.6 - c * 0.6], ['head', h * 0.6], ['chest', c * 0.6]];
    },
  });
}

// ------------------------------------------------------------------------------------ head

export interface HeadOpts {
  sex: Sex;
  skin?: string;
  hair?: 'dark' | 'fair' | 'grey' | 'auburn' | 'none';
  style?: 'short' | 'shaggy' | 'long' | 'braid' | 'balding' | 'cropped' | 'none';
  beard?: 'none' | 'stubble' | 'short' | 'full';
  /** Unlived: glowing eyes and cracks on the face. */
  unlived?: boolean;
  /** Soot smudges (smith). */
  soot?: boolean;
  /** Age lines: thinner face, deeper eyes. */
  old?: boolean;
}

export function skullRings(sex: Sex, old = false): Ring[] {
  const f = sex === 'f';
  const j = f ? 0.88 : 1; // jaw width
  const o = old ? 0.96 : 1;
  return [
    { y: 0.205, rx: 0.02, rz: 0.025, cz: 0.005 },
    { y: 0.195, rx: 0.052, rz: 0.062, cz: 0.004 },
    { y: 0.17, rx: 0.073, rz: 0.09, cz: 0.004 },
    { y: 0.13, rx: 0.079, rz: 0.1, cz: 0.006, p: 2.1 },
    { y: 0.085, rx: 0.077, rz: 0.1, cz: 0.008, p: 2.2, front: 0.97 },
    { y: 0.055, rx: 0.073 * o, rz: 0.098, cz: 0.01, p: 2.3, front: 0.95 },
    { y: 0.025, rx: 0.07 * o * (f ? 0.95 : 1), rz: 0.094, cz: 0.012, p: 2.3, front: 0.97 },
    { y: -0.008, rx: 0.062 * j * o, rz: 0.086, cz: 0.016, p: 2.2, back: 0.8 },
    { y: -0.038, rx: 0.05 * j, rz: 0.07, cz: 0.024, back: 0.62 },
    { y: -0.058, rx: 0.03 * j, rz: 0.042, cz: 0.05, back: 0.4 },
    { y: -0.066, rx: 0.012, rz: 0.015, cz: 0.066 },
  ];
}

const HAIR: Record<string, string> = {
  dark: 'hair_dark', fair: 'hair_fair', grey: 'hair_fair|t=b4aea6', auburn: 'hair_dark|t=d08a60', none: 'hair_dark',
};

/** Face and hair on the head bone (and a hair fall skinned down to the chest for long styles). */
export function addHead(b: CharBuilder, o: HeadOpts) {
  const skin = o.skin ?? 'skin';
  const f = o.sex === 'f';
  const rings = skullRings(o.sex, o.old);
  b.loft('head', rings, skin, { segs: 18, capTop: true }, { crack: o.unlived ? 0.8 : 0 });
  const hm = HAIR[o.hair ?? 'dark'];
  // nose
  b.add('head', sweep([[0, 0.078, 0.093], [0, 0.05, 0.107], [0, 0.03, 0.116], [0, 0.021, 0.108]], {
    w: (t) => lerp(0.007, f ? 0.012 : 0.015, t), h: (t) => lerp(0.004, 0.011, Math.sin(t * Math.PI * 0.8)), up: [1, 0, 0], sides: 6, segs: 6, caps: true,
  }), skin);
  // brow ridge + cheekbones
  b.add('head', sweep([[-0.055, 0.075, 0.078], [-0.025, 0.08, 0.094], [0, 0.077, 0.097], [0.025, 0.08, 0.094], [0.055, 0.075, 0.078]], { r: f ? 0.006 : 0.009, sides: 6, segs: 10 }), skin);
  for (const s of [1, -1]) {
    b.add('head', xf(ellipsoid(0.02, 0.012, 0.014, { segs: 8, rows: 5 }), { p: [s * 0.048, 0.035, 0.078] }), skin);
    // ears
    b.add('head', xf(ellipsoid(0.01, 0.028, 0.018, { segs: 8, rows: 5 }), { p: [s * 0.076, 0.05, -0.002], r: [0, s * 0.25, 0] }), skin);
    // eyes (glowing for the Unlived)
    b.add('head', xf(ellipsoid(0.0125, 0.0095, 0.009, { segs: 8, rows: 5 }), { p: [s * 0.03, 0.055, 0.084] }), o.unlived ? 'unlived_crack' : 'hair_dark|c=18110d|r=0.25');
    // brows
    b.add('head', sweep([[s * 0.012, 0.072, 0.098], [s * 0.03, 0.076, 0.096], [s * 0.05, 0.072, 0.086]], { w: f ? 0.0025 : 0.0042, h: 0.0022, up: [0, 1, 0], sides: 4, segs: 4 }), hm);
  }
  // mouth / lips
  b.add('head', xf(ellipsoid(f ? 0.021 : 0.022, f ? 0.0065 : 0.005, 0.008, { segs: 10, rows: 5 }), { p: [0, 0.003, 0.094] }), f ? 'skin|t=c98b84' : 'skin|t=b88a80');
  // chin
  b.add('head', xf(ellipsoid(f ? 0.018 : 0.024, 0.016, 0.014, { segs: 8, rows: 5 }), { p: [0, -0.04, 0.08] }), skin);
  if (o.soot) {
    b.add('head', xf(ellipsoid(0.02, 0.012, 0.004, { segs: 8, rows: 4 }), { p: [0.045, 0.03, 0.081], r: [0, 0.6, 0.3] }), 'cloth_black|t=5a5048|r=1');
  }
  if (o.unlived) {
    // faint gold seam across the cheek
    b.add('head', sweep([[-0.06, 0.07, 0.07], [-0.045, 0.04, 0.085], [-0.04, 0.0, 0.08], [-0.03, -0.03, 0.075]], { r: 0.0025, sides: 4, segs: 8 }), 'unlived_crack');
  }
  // beard
  const beard = o.beard ?? 'none';
  if (beard !== 'none') {
    const th = beard === 'stubble' ? 0.002 : beard === 'short' ? 0.008 : 0.018;
    const br = slice(rings, 0.04, -0.066).map((r) => ({ ...r, rx: r.rx + th, rz: (r.rz ?? r.rx) + th }));
    b.loft('head', br, beard === 'stubble' ? hm + '|t=a09080' : hm, { segs: 16, phi0: -1.9, phiLen: 3.8, radial: beard === 'full' ? (t, v) => 1 + v * 0.18 : undefined }, {});
    if (beard !== 'stubble') {
      b.add('head', sweep([[-0.028, 0.017, 0.105], [0, 0.021, 0.112], [0.028, 0.017, 0.105]], { r: 0.006, sides: 5, segs: 6 }), hm); // moustache
    }
  }
  addHair(b, o, rings, hm);
}

function addHair(b: CharBuilder, o: HeadOpts, rings: Ring[], hm: string) {
  const style = o.style ?? 'short';
  if (style === 'none' || o.hair === 'none') return;
  const rng = b.rng;
  const shag = (amp: number, freq: number) => (th: number, v: number) => 1 + amp * Math.abs(Math.sin(th * freq + v * 3)) * v;
  if (style === 'balding') {
    // ring of hair around back and sides
    b.loft('head', grow(slice(rings, 0.13, 0.03), 0.008), hm, { segs: 16, phi0: 1.1, phiLen: TAU_ - 2.2, radial: shag(0.05, 9) });
    return;
  }
  const top = style === 'cropped' ? 0.005 : 0.011;
  // cap over the crown
  b.loft('head', grow(slice(rings, 0.205, 0.11), top), hm, { segs: 18, capTop: true, radial: style === 'shaggy' ? shag(0.08, 7) : undefined });
  // back & sides down to the nape (front left open for the face)
  const low = style === 'long' || style === 'braid' ? -0.02 : style === 'cropped' ? 0.03 : 0.0;
  b.loft('head', grow(slice(rings, 0.115, low), top * 0.9), hm, { segs: 18, phi0: 0.95, phiLen: TAU_ - 1.9, radial: style === 'shaggy' ? shag(0.12, 11) : undefined });
  // fringe / locks framing the face
  if (style === 'shaggy' || style === 'long' || style === 'short') {
    const n = style === 'short' ? 4 : 7;
    for (let i = 0; i < n; i++) {
      const a = lerp(-0.7, 0.7, i / (n - 1)) + rng.range(-0.08, 0.08);
      const len = style === 'long' ? rng.range(0.05, 0.08) : rng.range(0.035, 0.06);
      const x = Math.sin(a) * 0.085, z = Math.cos(a) * 0.098;
      b.add('head', sweep([[x * 0.9, 0.17, z * 0.85], [x * 1.05, 0.125, z * 1.02], [x * 1.08, 0.125 - len, z * 1.0]], {
        w: (t) => 0.012 * (1 - t * 0.7), h: 0.004, up: [Math.cos(a), 0, -Math.sin(a)], sides: 4, segs: 5,
      }), hm);
    }
  }
  if (style === 'long') {
    // hair fall down the back, weighted from the head into the chest so it follows turning
    const fall: Ring[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      fall.push({ y: 0.1 - t * 0.36, rx: lerp(0.085, 0.07, t), rz: lerp(0.03, 0.018, t), cz: lerp(-0.07, -0.1 - 0.03 * t, t), p: 2.2 });
    }
    b.loft('head', fall, hm, { segs: 14, capBottom: true, radial: (th, v) => 1 + 0.12 * Math.abs(Math.sin(th * 7)) * v }, {
      skin: (p) => { const w = Math.min(1, Math.max(0, (0.02 - p.y) / 0.25)); return [['head', 1 - w], ['chest', w]]; },
    });
    // side locks falling over the shoulders
    for (const s of [1, -1]) {
      b.add('head', sweep([[s * 0.07, 0.1, 0.03], [s * 0.085, 0.02, 0.02], [s * 0.09, -0.08, 0.0], [s * 0.1, -0.16, -0.01]], {
        w: (t) => 0.018 * (1 - t * 0.5), h: 0.008, up: [0, 0, 1], sides: 5, segs: 7,
      }), hm, { skin: (p) => { const w = Math.min(1, Math.max(0, (0.02 - p.y) / 0.18)); return [['head', 1 - w], ['chest', w]]; } });
    }
  }
  if (style === 'braid') {
    // tied back, thick braid down the spine (skinned head → chest)
    b.add('head', xf(ellipsoid(0.03, 0.028, 0.026, { segs: 10, rows: 6 }), { p: [0, 0.06, -0.1] }), hm);
    const links: G[] = [];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const r = lerp(0.022, 0.012, t);
      links.push(xf(ellipsoid(r, r * 1.35, r * 0.9, { segs: 8, rows: 5 }), { p: [(i % 2 ? 1 : -1) * 0.006, 0.03 - i * 0.034, -0.105 - t * 0.02], r: [0, 0, (i % 2 ? 1 : -1) * 0.5] }));
    }
    links.push(xf(ellipsoid(0.014, 0.012, 0.014, { segs: 8, rows: 4 }), { p: [0, 0.03 - 9 * 0.034, -0.125] }));
    b.add('head', merge(links), hm, { skin: (p) => { const w = Math.min(1, Math.max(0, (0.04 - p.y) / 0.2)); return [['head', 1 - w], ['chest', w]]; } });
    // leather tie
    b.add('head', xf(loft([{ y: 0.006, rx: 0.016 }, { y: -0.006, rx: 0.016 }], { segs: 8 }), { p: [0, 0.01 - 9 * 0.034 + 0.04, -0.124] }), 'leather', {
      skin: () => [['chest', 1]],
    });
  }
}
const TAU_ = Math.PI * 2;

// ------------------------------------------------------------------------------------ hands

export type HandStyle = 'bare' | 'glove' | 'gauntlet' | 'wrapped';

/**
 * A fist closed around the weapon socket's grip axis (hand-local: axis along +Z through
 * (0, -0.07, 0.01)). The back of the hand faces outward (side = +1 left → +X). Knuckles/index are
 * toward +Z so the grip exits forward between thumb and index, like holding a sword.
 */
export function fist(side: 1 | -1, style: HandStyle): { g: G; mat: 'main' | 'cuff' }[] {
  const s = side;
  const out: { g: G; mat: 'main' | 'cuff' }[] = [];
  const gz = 0.01;
  const steel = style === 'gauntlet';
  const fr = steel ? 0.011 : 0.0092;
  // back of the hand / palm block
  const palm = loft([
    { y: 0.012, rx: 0.018, rz: 0.036, cx: s * 0.022, cz: gz },
    { y: -0.03, rx: 0.017, rz: 0.043, cx: s * 0.026, cz: gz, p: 3 },
    { y: -0.075, rx: 0.016, rz: 0.045, cx: s * 0.026, cz: gz, p: 3 },
    { y: -0.092, rx: 0.012, rz: 0.042, cx: s * 0.022, cz: gz, p: 3 },
  ], { segs: 12, capBottom: true });
  out.push({ g: palm, mat: 'main' });
  // four curled fingers around the grip axis
  const zs = [0.03, 0.011, -0.008, -0.026];
  const rs = [1, 1.02, 0.95, 0.82];
  for (let i = 0; i < 4; i++) {
    const z = gz + zs[i];
    const r = fr * rs[i];
    const pts: V3[] = [
      [s * 0.03, -0.086, z], [s * 0.016, -0.1, z], [s * -0.006, -0.1, z], [s * -0.024, -0.084, z], [s * -0.026, -0.062, z], [s * -0.014, -0.05, z],
    ];
    out.push({ g: sweep(pts, { r, sides: steel ? 4 : 6, segs: 7, caps: true, p: steel ? 3 : 2, up: [0, 0, 1] }), mat: 'main' });
  }
  // thumb over the front of the grip
  out.push({
    g: sweep([[s * 0.022, -0.02, gz + 0.036], [s * 0.012, -0.044, gz + 0.05], [s * -0.008, -0.058, gz + 0.052], [s * -0.022, -0.066, gz + 0.042]], { r: fr * 1.1, sides: 6, segs: 6, caps: true }),
    mat: 'main',
  });
  if (steel) {
    // knuckle plate and cuff flare
    out.push({ g: loft([{ y: -0.02, rx: 0.02, rz: 0.048, cx: s * 0.03, cz: gz }, { y: -0.08, rx: 0.018, rz: 0.05, cx: s * 0.03, cz: gz }], { segs: 12, phi0: s > 0 ? 0.3 : Math.PI + 0.3, phiLen: Math.PI - 0.6 }), mat: 'main' });
    out.push({ g: loft([{ y: 0.075, rx: 0.056, rz: 0.052 }, { y: 0.03, rx: 0.047, rz: 0.044 }, { y: -0.005, rx: 0.036, rz: 0.04, cx: s * 0.01 }], { segs: 12 }), mat: 'cuff' });
    out.push({ g: xf(rivet(0.006), { p: [s * 0.05, -0.05, gz], r: [0, 0, -s * Math.PI / 2] }), mat: 'cuff' });
  } else if (style === 'glove') {
    out.push({ g: loft([{ y: 0.06, rx: 0.045, rz: 0.042 }, { y: 0.02, rx: 0.038, rz: 0.036 }, { y: -0.005, rx: 0.033, rz: 0.036, cx: s * 0.01 }], { segs: 12 }), mat: 'cuff' });
  } else if (style === 'wrapped') {
    out.push({ g: loft([{ y: 0.03, rx: 0.036, rz: 0.032 }, { y: -0.04, rx: 0.03, rz: 0.044, cx: s * 0.02 }], { segs: 10 }), mat: 'cuff' });
  }
  return out;
}

/** Both fists. `mat` for fingers/palm, `cuff` for cuffs/wraps. */
export function addHands(b: CharBuilder, style: HandStyle, mat: string, cuff = mat) {
  for (const side of [1, -1] as const) {
    const bone: BoneName = side > 0 ? 'handL' : 'handR';
    const fore: BoneName = side > 0 ? 'forearmL' : 'forearmR';
    for (const p of fist(side, style)) {
      b.add(bone, p.g, p.mat === 'main' ? mat : cuff, { skin: parentSkin(bone, fore, 0.02, -0.01, 0.35) });
    }
  }
}

// ------------------------------------------------------------------------------------ feet

/** Foot rings along +Z (heel → toe), built as a Y-loft then rotated so +Y → +Z. */
function footShape(width: number, height: number, len = 1, toeUp = 0): G {
  // [z, halfWidth, halfHeight, centreY]
  const P: [number, number, number, number][] = [
    [-0.078, 0.02, 0.022, -0.028],
    [-0.066, 0.036, 0.04, -0.012],
    [-0.035, 0.041, 0.052, -0.001],
    [0.01, 0.043, 0.05, -0.002],
    [0.07, 0.048, 0.034, -0.017],
    [0.125, 0.047, 0.027, -0.023 + toeUp * 0.3],
    [0.165, 0.037, 0.022, -0.027 + toeUp * 0.6],
    [0.186, 0.018, 0.014, -0.033 + toeUp],
  ];
  const rings: Ring[] = P.map(([z, w, h, cy]) => {
    const hh = h * height;
    const bottom = (cy + 0.05) / hh; // bottom half reaches the sole (y = -0.05)
    return { y: z * len, rx: w * width, rz: hh, cz: -cy, p: 2.6, front: Math.max(0.2, bottom) };
  });
  const g = loft(rings, { segs: 14, capTop: true, capBottom: true });
  g.rotateX(Math.PI / 2);
  return g;
}

export type FootStyle = 'boot' | 'tallboot' | 'sabaton' | 'sandal' | 'bare' | 'wrap';

/** Feet, soles and boot shafts (shaft on the shin). */
export function addFeet(b: CharBuilder, sex: Sex, style: FootStyle, mat = 'leather_dark', shaftMat = mat) {
  const f = sex === 'f' ? 0.9 : 1;
  for (const side of [1, -1] as const) {
    const foot: BoneName = side > 0 ? 'footL' : 'footR';
    const shin: BoneName = side > 0 ? 'shinL' : 'shinR';
    if (style === 'bare' || style === 'sandal') {
      b.add(foot, footShape(0.92 * f, 0.9, f), style === 'bare' ? 'skin|t=8a7060' : 'skin');
      if (style === 'sandal') {
        b.add(foot, xf(loft([{ y: -0.04, rx: 0.052 * f, rz: 0.11 * f, cz: 0.05 }, { y: -0.052, rx: 0.052 * f, rz: 0.11 * f, cz: 0.05 }], { segs: 12, capBottom: true, capTop: true }), {}), 'leather');
        b.add(foot, xf(loft([{ y: 0.01, rx: 0.046 * f, rz: 0.05 }, { y: -0.01, rx: 0.046 * f, rz: 0.052 }], { segs: 10 }), { p: [0, 0, 0.005] }), 'leather');
      }
      continue;
    }
    if (style === 'wrap') {
      b.add(foot, footShape(1.0 * f, 0.95, f), 'cloth_linen|t=8a8070');
      b.loft(shin, [{ y: -0.2, rx: 0.042 * f, rz: 0.044 }, { y: -0.43, rx: 0.038 * f, rz: 0.04 }], 'cloth_linen|t=8a8070', { segs: 10, radial: (th, v) => 1 + 0.06 * Math.abs(Math.sin(v * 30 + th)) });
      continue;
    }
    const steel = style === 'sabaton';
    b.add(foot, footShape(1.08 * f, 1.08, f * (steel ? 1.04 : 1)), mat);
    // sole + heel
    b.add(foot, xf(loft([{ y: 0.0, rx: 0.05 * f, rz: 0.12 * f, p: 2.6 }, { y: -0.014, rx: 0.051 * f, rz: 0.121 * f, p: 2.6 }], { segs: 14, capBottom: true, capTop: true }), { p: [0, -0.044, 0.055 * f] }), 'leather_dark|t=6a6060');
    b.add(foot, xf(loft([{ y: 0.0, rx: 0.036, rz: 0.03, p: 3 }, { y: -0.02, rx: 0.036, rz: 0.03, p: 3 }], { segs: 10, capBottom: true }), { p: [0, -0.038, -0.05] }), 'leather_dark|t=6a6060');
    if (steel) {
      // lames over the instep
      for (let i = 0; i < 4; i++) {
        const z = 0.0 + i * 0.035;
        b.add(foot, xf(loft([{ y: 0.012, rx: 0.052 * f, rz: 0.048 }, { y: -0.012, rx: 0.053 * f, rz: 0.046 }], { segs: 12, phi0: -Math.PI / 2 - 0.1, phiLen: Math.PI + 0.2 }), { p: [0, -0.012 - i * 0.006, z], r: [Math.PI / 2 - 0.35, 0, 0], s: [1, 1, 1 - i * 0.12] }), shaftMat);
      }
    }
    // shaft
    const top = style === 'tallboot' ? -0.02 : steel ? -0.12 : -0.2;
    const sr = slice(shinRings(sex), top, -0.43).map((r) => ({ ...r, rx: r.rx + 0.009, rz: (r.rz ?? r.rx) + 0.01 }));
    sr[sr.length - 1] = { ...sr[sr.length - 1], rx: 0.047 * f, rz: 0.052, cz: 0.004 };
    b.loft(shin, sr, mat, { segs: 12 });
    // folded cuff
    const cr = ringAtY(shinRings(sex), top);
    b.loft(shin, [{ y: top + 0.03, rx: cr.rx + 0.018, rz: (cr.rz ?? cr.rx) + 0.02 }, { y: top - 0.035, rx: cr.rx + 0.013, rz: (cr.rz ?? cr.rx) + 0.015 }], mat, { segs: 12, radial: (th) => 1 + 0.04 * Math.sin(th * 3) });
    // ankle strap + buckle
    b.loft(shin, [{ y: -0.375, rx: 0.049 * f, rz: 0.054 }, { y: -0.395, rx: 0.049 * f, rz: 0.054 }], 'leather', { segs: 12 });
    b.add(shin, xf(new THREE.BoxGeometry(0.004, 0.02, 0.016), { p: [side * 0.05 * f, -0.385, 0.01] }), 'bronze');
  }
}

export { lerp };
