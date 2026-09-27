/**
 * Beast looks (registerEnemyLook): procedural quadrupeds skinned to the humanoid rig posed on all
 * fours (see body.ts for the bone frames).
 *
 * Authoring frames (reference units, girth scaled by `bulk` at build time):
 *  - HIPS space carries the whole torso: +Y runs rump → chest → neck root, +Z is the belly
 *    (ventral), -Z the back (dorsal), +X the beast's left. Weights blend hips → spine → chest.
 *  - neck: +Y up the neck, +Z throat, -Z nape.   head: +Y along the muzzle, +Z jaw, -Z crown.
 *  - upperArm/forearm/thigh/shin: -Y down the limb, +Z cranial (front).
 *  - hand: pastern + front paw below the wrist (-Y), toes toward +Z.
 *  - foot: metatarsus along +Z (down to the paw), toes toward +Y (forward), hock point at -Y.
 *
 * Looks: 'warHound' (Royal Army: deep-chested mastiff in rusted barding, a caparison with the
 * castle-and-sword, crinet, chamfron, spiked collar), 'huntingHound' (Royal Household: gaunt
 * sighthound, drop ears, collar with a bronze bell, a tattered livery coat with the royal arms),
 * 'carrionStag' (antlered, gaunt, hooved). All Unlived: gold cracks and burning eyes.
 */
import type { Rig } from '../../actors/Rig';
import type { BoneName } from '../../actors/rigDefs';
import { CharBuilder, type BuiltModel, type SkinFn } from '../../actors/models/builder';
import { registerEnemyLook } from '../../actors/models/index';
import { M } from '../../actors/models/gear';
import { ellipsoid, loft, merge, panel, sweep, xf, lerp, smooth, TAU, type G, type Ring, type V3 } from '../../actors/models/parts';
import { Rng } from '../../core/rng';
import type { QuadDims } from './body';
import { CARRION_STAG, HUNTING_HOUND, WAR_HOUND } from './species';

const sm = smooth;

// ------------------------------------------------------------------------------------ skins

/** Torso weights along the hips-space body axis: hips → spine → chest (no neck: it bends away). */
const torsoSkin: SkinFn = (p) => {
  const y = p.y;
  const wHips = 1 - sm(0.02, 0.16, y);
  const wChest = sm(0.22, 0.34, y);
  const wSpine = Math.max(0, 1 - wHips - wChest);
  return [['hips', wHips], ['spine', wSpine], ['chest', wChest]];
};
/** Neck tube: chest at the root, neck in the middle, head at the top. */
const neckSkin: SkinFn = (p) => {
  const wChest = 1 - sm(-0.14, -0.02, p.y);
  const wHead = sm(0.05, 0.16, p.y) * 0.7;
  return [['chest', wChest], ['neck', Math.max(0, 1 - wChest - wHead)], ['head', wHead]];
};
const blend = (bone: BoneName, other: BoneName, y0: number, y1: number, max: number): SkinFn => (p) => {
  const w = sm(y0, y1, p.y) * max; // y0 → y1 ramps toward `other`
  return [[bone, 1 - w], [other, w]];
};

// ------------------------------------------------------------------------------------ anatomy

/** Torso station: body-axis y, half width, extents above (dorsal) and below (ventral) the spine line. */
type Station = [y: number, rx: number, dorsal: number, ventral: number];
const stationRings = (st: Station[], p = 2): Ring[] => st.map(([y, rx, dor, ven]) => ({ y, rx, rz: (dor + ven) / 2, cz: (ven - dor) / 2, p }));

export interface QuadLook {
  dims: QuadDims;
  coat: string; belly: string; skin: string; dark: string;
  torso: Station[];
  /** Gaunt rib ridges on the flanks (0..1). */
  ribs?: number;
  head: 'mastiff' | 'sight' | 'stag';
  ears: 'crop' | 'drop' | 'stag';
  tail: 'hang' | 'sight' | 'stub';
  feet: 'paw' | 'hoof';
  /** Girth multipliers for legs / neck (reference units at bulk 1). */
  leg?: number; neck?: number;
  crack: number;
}

const ringsOf = (a: [number, number, number, number?, number?][]): Ring[] =>
  a.map(([y, rx, rz, cz, back]) => ({ y, rx, rz, cz: cz ?? 0, back: back ?? 1 }));

/** Resample stations to `n` evenly spaced rings (Catmull-Rom through the stations). */
function torsoRings(st: Station[], n: number): Ring[] {
  const y0 = st[0][0], y1 = st[st.length - 1][0];
  const cr = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const out: Station[] = [];
  for (let i = 0; i <= n; i++) {
    const y = lerp(y0, y1, i / n);
    let k = 0;
    while (k < st.length - 2 && st[k + 1][0] < y) k++;
    const t = (y - st[k][0]) / (st[k + 1][0] - st[k][0]);
    const P = (j: number) => st[Math.max(0, Math.min(st.length - 1, j))];
    const val = (c: 1 | 2 | 3) => Math.max(0.004, cr(P(k - 1)[c], P(k)[c], P(k + 1)[c], P(k + 2)[c], t));
    out.push([y, val(1), val(2), val(3)]);
  }
  return stationRings(out);
}

function torso(b: CharBuilder, L: QuadLook) {
  const N = 30;
  const rings = torsoRings(L.torso, N);
  const y0 = L.torso[0][0], y1 = L.torso[L.torso.length - 1][0];
  const ribs = L.ribs ?? 0;
  // loft() lists rings top → bottom, so v = 0 is the chest front and v = 1 the rump
  const radial = ribs > 0 ? (th: number, v: number) => {
    const y = lerp(y1, y0, v);
    const side = Math.pow(Math.abs(Math.sin(th)), 2) * (Math.cos(th) > -0.2 ? 1 : 0.2);
    const cage = sm(0.14, 0.2, y) * (1 - sm(0.44, 0.52, y));
    return 1 + ribs * 0.045 * side * cage * Math.max(0, Math.cos((y - 0.14) * TAU / 0.065));
  } : undefined;
  b.loft('hips', rings, L.coat, { segs: 22, capTop: true, capBottom: true, radial }, { skin: torsoSkin, crack: 1.4 });
}

function neck(b: CharBuilder, L: QuadLook) {
  const k = L.neck ?? 1;
  const r = ringsOf(L.head === 'stag'
    ? [[-0.2, 0.075 * k, 0.1 * k, 0.02], [-0.05, 0.06 * k, 0.085 * k, 0.015], [0.1, 0.05 * k, 0.07 * k, 0.012], [0.2, 0.045 * k, 0.06 * k, 0.01]]
    : [[-0.2, 0.085 * k, 0.11 * k, 0.03], [-0.06, 0.08 * k, 0.1 * k, 0.02], [0.06, 0.07 * k, 0.085 * k, 0.012], [0.15, 0.06 * k, 0.07 * k, 0.005]]);
  b.loft('neck', r, L.coat, { segs: 16 }, { skin: neckSkin, crack: 1 });
}

function head(b: CharBuilder, L: QuadLook) {
  const v = b.rng;
  const mat = L.coat;
  if (L.head === 'mastiff') {
    b.add('head', ellipsoid(0.078, 0.085, 0.07, { segs: 16, rows: 9 }), mat, { p: [0, 0.035, -0.012] });
    // broad, blunt muzzle with heavy jowls
    const mz = ringsOf([[0.05, 0.062, 0.058, 0.004], [0.14, 0.058, 0.052, 0.014], [0.21, 0.05, 0.046, 0.02], [0.245, 0.034, 0.032, 0.022]]);
    b.loft('head', mz, mat, { segs: 14, capTop: true }, { crack: 0.6 });
    for (const s of [1, -1]) b.add('head', ellipsoid(0.03, 0.06, 0.04, { segs: 10, rows: 6 }), L.belly, { p: [s * 0.04, 0.16, 0.045] });
    b.add('head', ellipsoid(0.026, 0.018, 0.02, { segs: 10, rows: 5 }), L.dark, { p: [0, 0.248, 0.004] });
  } else if (L.head === 'sight') {
    b.add('head', ellipsoid(0.062, 0.08, 0.058, { segs: 16, rows: 9 }), mat, { p: [0, 0.03, -0.012] });
    // long, narrow muzzle
    const mz = ringsOf([[0.04, 0.05, 0.05, 0.004], [0.14, 0.036, 0.038, 0.012], [0.24, 0.027, 0.03, 0.018], [0.285, 0.018, 0.022, 0.02]]);
    b.loft('head', mz, mat, { segs: 12, capTop: true }, { crack: 0.6 });
    b.add('head', ellipsoid(0.017, 0.013, 0.014, { segs: 8, rows: 5 }), L.dark, { p: [0, 0.287, 0.008] });
  } else {
    b.add('head', ellipsoid(0.06, 0.075, 0.062, { segs: 14, rows: 8 }), mat, { p: [0, 0.02, -0.01] });
    const mz = ringsOf([[0.04, 0.05, 0.055, 0.01], [0.16, 0.04, 0.05, 0.022], [0.26, 0.032, 0.042, 0.03], [0.3, 0.022, 0.03, 0.03]]);
    b.loft('head', mz, mat, { segs: 12, capTop: true }, { crack: 0.8 });
    b.add('head', ellipsoid(0.022, 0.014, 0.02, { segs: 8, rows: 5 }), L.dark, { p: [0, 0.3, 0.02] });
  }
  const muzzleLen = L.head === 'mastiff' ? 0.23 : L.head === 'sight' ? 0.27 : 0.28;
  const jawW = L.head === 'mastiff' ? 0.042 : 0.03;
  // lower jaw hanging a little open (snarl); mouth lining and fangs
  const jaw = ringsOf([[0.03, jawW, 0.028, 0.0], [0.14, jawW * 0.9, 0.022, 0.004], [muzzleLen - 0.02, jawW * 0.6, 0.016, 0.004], [muzzleLen, jawW * 0.35, 0.01, 0.002]]);
  b.add('head', loft(jaw, { segs: 12, capTop: true }), mat, { p: [0, 0, 0.06], r: [0.2, 0, 0] });
  b.add('head', loft(ringsOf([[0.05, jawW * 0.85, 0.02], [muzzleLen - 0.03, jawW * 0.5, 0.012]]), { segs: 8, capTop: true, capBottom: true }), L.skin, { p: [0, 0, 0.045], r: [0.1, 0, 0] });
  if (L.head !== 'stag') {
    const fangs: G[] = [];
    for (const s of [1, -1]) {
      for (const [y, len, up] of [[muzzleLen - 0.035, 0.032, 1], [muzzleLen - 0.045, 0.028, -1], [muzzleLen - 0.075, 0.016, 1], [muzzleLen - 0.1, 0.014, -1]] as const) {
        const x = s * jawW * (up > 0 ? 0.78 : 0.7);
        const z = up > 0 ? 0.05 : 0.062 + y * 0.2;
        fangs.push(xf(loft([{ y: 0, rx: 0.006 }, { y: len, rx: 0.0008 }], { segs: 5, capBottom: true }), { p: [x, y, z], r: [up > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0] }));
      }
    }
    b.add('head', merge(fangs), 'bone|t=d8ccb0');
  }
  // eyes: burning Unlived gold, under a heavy brow
  const eyeZ = L.head === 'mastiff' ? -0.036 : -0.032;
  const eyeX = L.head === 'mastiff' ? 0.05 : L.head === 'sight' ? 0.04 : 0.045;
  for (const s of [1, -1]) {
    b.add('head', ellipsoid(0.012, 0.014, 0.01, { segs: 8, rows: 5 }), M.crack, { p: [s * eyeX, 0.085, eyeZ], r: [0, 0, s * 0.3] });
    b.add('head', sweep([[s * (eyeX - 0.018), 0.07, eyeZ - 0.012], [s * eyeX, 0.086, eyeZ - 0.022], [s * (eyeX + 0.012), 0.1, eyeZ - 0.012]], { r: 0.008, sides: 5, segs: 5 }), mat);
  }
  // ears
  const ear = (s: 1 | -1) => {
    if (L.ears === 'crop') {
      // cropped, upright and swept back: a hard, alert silhouette
      return xf(ellipsoid(0.026, 0.055, 0.009, { segs: 8, rows: 6 }), { p: [s * 0.06, -0.03, -0.115], r: [-1.94, 0, -s * 0.2] });
    }
    if (L.ears === 'drop') {
      // long hound leathers hanging beside the skull
      return xf(ellipsoid(0.008, 0.07, 0.036, { segs: 8, rows: 7 }), { p: [s * 0.08, -0.025, 0.035], r: [1.78, 0, -s * 0.3] });
    }
    return xf(ellipsoid(0.012, 0.075, 0.035, { segs: 8, rows: 6 }), { p: [s * 0.08, -0.02, -0.04], r: [-0.6, 0, s * 1.2] });
  };
  for (const s of [1, -1] as const) b.add('head', ear(s), L.ears === 'drop' ? L.belly : mat);
  if (L.head === 'stag') antlers(b, v);
}

function antlers(b: CharBuilder, v: Rng) {
  const parts: G[] = [];
  for (const s of [1, -1]) {
    // main beam sweeping up (-Z), back (-Y) and out, with tines forward
    const beam: V3[] = [[s * 0.035, -0.0, -0.06], [s * 0.1, -0.03, -0.2], [s * 0.2, -0.1, -0.36], [s * 0.25, -0.05, -0.52], [s * 0.22, 0.02, -0.64]];
    parts.push(sweep(beam, { r: (t) => lerp(0.018, 0.006, t), sides: 6, segs: 14 }));
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.2 + v.range(-0.03, 0.03);
      const k = Math.min(3, Math.floor(t * 4));
      const a = beam[k], c = beam[k + 1], f = t * 4 - k;
      const p: V3 = [lerp(a[0], c[0], f), lerp(a[1], c[1], f), lerp(a[2], c[2], f)];
      const len = 0.1 + v.range(0, 0.06) - i * 0.01;
      parts.push(sweep([p, [p[0] + s * 0.01, p[1] + len * 0.8, p[2] - len * 0.4], [p[0] + s * 0.015, p[1] + len * 1.1, p[2] - len * 0.9]], { r: (tt) => lerp(0.009, 0.003, tt), sides: 5, segs: 6 }));
    }
  }
  b.add('head', merge(parts), 'bone|t=9a8a70');
  // shreds of velvet / carrion hanging from the tines
  b.add('head', sweep([[0.12, -0.05, -0.28], [0.13, -0.02, -0.2], [0.125, 0.0, -0.12]], { w: 0.012, h: 0.002, up: [1, 0, 0], sides: 4, segs: 6 }), 'skin|t=6a4a40');
}

function tail(b: CharBuilder, L: QuadLook) {
  const skin: SkinFn = () => [['hips', 1]];
  let pts: V3[], r0: number, r1: number;
  if (L.tail === 'hang') { pts = [[0, -0.22, -0.03], [0, -0.3, 0.02], [0, -0.35, 0.14], [0, -0.35, 0.27], [0, -0.31, 0.36]]; r0 = 0.03; r1 = 0.012; }
  else if (L.tail === 'sight') { pts = [[0, -0.22, -0.04], [0, -0.32, 0.03], [0, -0.38, 0.18], [0, -0.4, 0.34], [0, -0.46, 0.42], [0, -0.53, 0.38]]; r0 = 0.02; r1 = 0.006; }
  else { pts = [[0, -0.22, -0.05], [0, -0.28, -0.1], [0, -0.3, -0.12]]; r0 = 0.03; r1 = 0.02; }
  b.add('hips', sweep(pts, { r: (t) => lerp(r0, r1, t), sides: 7, segs: 12, caps: true }), L.coat, { skin });
}

/**
 * A rigid limb segment with rounded ends (skinned 100 % to its bone: blending across a joint that is
 * bent ~90° from the rest pose smears badly with linear skinning, so joints are hidden by overlap).
 */
function seg(y0: number, y1: number, r0: [number, number], r1: [number, number], o: { backTop?: number; backEnd?: number; cz?: number } = {}): Ring[] {
  const out: Ring[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const end = 0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 5)));
    const rx = lerp(r0[0], r1[0], t) * end, rz = lerp(r0[1], r1[1], t) * end;
    const back = 1 + (o.backTop ?? 0) * Math.sin(Math.min(1, t * 2.2) * Math.PI) * (t < 0.5 ? 1 : 0.4) + (o.backEnd ?? 0) * sm(0.7, 0.92, t) * (1 - sm(0.97, 1, t));
    out.push({ y: lerp(y0, y1, t), rx, rz, cz: (o.cz ?? 0) * Math.sin(t * Math.PI), back });
  }
  return out;
}

function legs(b: CharBuilder, L: QuadLook) {
  const d = L.dims;
  const g = L.leg ?? 1;
  const hoof = L.feet === 'hoof';
  for (const s of [1, -1] as const) {
    const sd = s > 0 ? 'L' : 'R';
    const ua = `upperArm${sd}` as BoneName, fa = `forearm${sd}` as BoneName, hd = `hand${sd}` as BoneName;
    const th = `thigh${sd}` as BoneName, sh = `shin${sd}` as BoneName, ft = `foot${sd}` as BoneName;
    // ---- foreleg: shoulder mass merging into the chest → forearm → pastern → paw
    b.loft(ua, seg(0.06, -0.32, [0.058 * g, 0.085 * g], [0.034 * g, 0.04 * g], { backEnd: 0.35, cz: -0.008 }), L.coat, { segs: 12, capTop: true, capBottom: true }, { crack: 0.8 });
    b.loft(fa, seg(0.03, -0.28, [0.034 * g, 0.04 * g], [0.022 * g, 0.025 * g]), L.coat, { segs: 10, capTop: true, capBottom: true }, { crack: 0.6 });
    const bottom = -(0.07 + d.grip);
    if (!hoof) {
      b.add(hd, loft(ringsOf([[0.02, 0.023 * g, 0.025 * g], [bottom + 0.06, 0.02 * g, 0.022 * g, 0.012], [bottom + 0.035, 0.024 * g, 0.03 * g, 0.022]]), { segs: 10, capTop: true }), L.coat);
      frontPawGeom(b, hd, bottom, L);
    } else {
      b.add(hd, loft(ringsOf([[0.02, 0.022 * g, 0.024 * g], [bottom + 0.1, 0.017 * g, 0.018 * g, 0.004], [bottom + 0.05, 0.024 * g, 0.026 * g, 0.012]]), { segs: 10, capTop: true }), L.coat);
      b.add(hd, loft(ringsOf([[bottom + 0.055, 0.026, 0.03, 0.016], [bottom, 0.032, 0.042, 0.024]]), { segs: 10, capBottom: true }), L.dark);
    }
    // ---- hind leg: heavy haunch → gaskin → hock/metatarsus → paw
    b.loft(th, seg(0.08, -0.47, [0.08 * g, 0.12 * g], [0.036 * g, 0.042 * g], { backTop: 0.4, cz: -0.025 }), L.coat, { segs: 12, capTop: true, capBottom: true }, { crack: 1 });
    b.loft(sh, seg(0.04, -0.46, [0.045 * g, 0.056 * g], [0.021 * g, 0.025 * g], { backTop: 0.35, cz: -0.01 }), L.coat, { segs: 10, capTop: true, capBottom: true }, { crack: 0.6 });
    const fs = b.boneScale(ft);
    const gz = fs.z / b.s;
    const len = d.meta / gz;
    // metatarsus (authored along +Y, turned to +Z) with the point of the hock behind
    b.add(ft, xf(loft(ringsOf([[-0.02, 0.022 * g, 0.03 * g, -0.006], [len * 0.5, 0.019 * g, 0.022 * g], [len - 0.02, 0.02 * g, 0.022 * g]]), { segs: 10 }), { r: [Math.PI / 2, 0, 0] }), L.coat, { skin: blend(ft, sh, 0.0, -0.02, 0.0) });
    b.add(ft, ellipsoid(0.018 * g, 0.02, 0.024, { segs: 8, rows: 5 }), L.coat, { p: [0, -0.022, 0.0] });
    if (!hoof) hindPawGeom(b, ft, len, L);
    else b.add(ft, xf(loft(ringsOf([[0, 0.026, 0.03], [0.05, 0.032, 0.04, 0.012]]), { segs: 10, capTop: true }), { p: [0, 0.012, len - 0.02], r: [Math.PI / 2, 0, 0] }), L.dark);
  }
}

/** Front paw in the hand frame: pad down (-Y), toes forward (+Z), dark claws. */
function frontPawGeom(b: CharBuilder, bone: BoneName, bottom: number, L: QuadLook) {
  const toes: G[] = [], claws: G[] = [];
  const y = bottom + 0.022;
  b.add(bone, ellipsoid(0.034, 0.022, 0.036, { segs: 10, rows: 6 }), L.coat, { p: [0, y + 0.004, 0.012] });
  for (const [x, z, r] of [[-0.024, 0.036, 0.013], [-0.008, 0.046, 0.014], [0.008, 0.046, 0.014], [0.024, 0.036, 0.013]] as const) {
    toes.push(xf(ellipsoid(r, r * 0.95, r * 1.2, { segs: 7, rows: 4 }), { p: [x, y - 0.002, z] }));
    claws.push(xf(loft([{ y: 0, rx: 0.004 }, { y: 0.018, rx: 0.0008 }], { segs: 4, capBottom: true }), { p: [x, y - 0.004, z + r * 1.1], r: [Math.PI / 2 + 0.5, 0, 0] }));
  }
  b.add(bone, merge(toes), L.coat);
  b.add(bone, merge(claws), L.dark);
}

/** Hind paw in the foot frame: at the end of the metatarsus (+Z = down), toes along +Y. */
function hindPawGeom(b: CharBuilder, bone: BoneName, len: number, L: QuadLook) {
  const toes: G[] = [], claws: G[] = [];
  const z = len;
  b.add(bone, ellipsoid(0.032, 0.036, 0.022, { segs: 10, rows: 6 }), L.coat, { p: [0, 0.012, z - 0.002] });
  for (const [x, y, r] of [[-0.022, 0.034, 0.012], [-0.007, 0.042, 0.013], [0.007, 0.042, 0.013], [0.022, 0.034, 0.012]] as const) {
    toes.push(xf(ellipsoid(r, r * 1.2, r * 0.95, { segs: 7, rows: 4 }), { p: [x, y, z + 0.004] }));
    claws.push(xf(loft([{ y: 0, rx: 0.0038 }, { y: 0.016, rx: 0.0008 }], { segs: 4, capBottom: true }), { p: [x, y + r * 1.1, z + 0.008], r: [0.5, 0, 0] }));
  }
  b.add(bone, merge(toes), L.coat);
  b.add(bone, merge(claws), L.dark);
}

function quadruped(b: CharBuilder, L: QuadLook) {
  b.cracks = L.crack;
  torso(b, L);
  neck(b, L);
  head(b, L);
  tail(b, L);
  legs(b, L);
}

// ------------------------------------------------------------------------------------ gear

/** A flank panel on the torso surface (hips space): u along the body (y0→y1), v down the side. */
function flank(L: QuadLook, s: 1 | -1, y0: number, y1: number, v0: number, v1: number, over: number, droop = 0) {
  const rings = stationRings(L.torso);
  return (u: number, v: number): V3 => {
    const y = lerp(y0, y1, u);
    // interpolate the station ring at y
    let i = 0;
    while (i < rings.length - 2 && rings[i + 1].y < y) i++;
    const a = rings[i], c = rings[i + 1];
    const f = Math.min(1, Math.max(0, (y - a.y) / (c.y - a.y)));
    const rx = lerp(a.rx, c.rx, f), rz = lerp(a.rz!, c.rz!, f), cz = lerp(a.cz!, c.cz!, f);
    // θ from the spine (π, dorsal) down the flank toward the belly
    const th = Math.PI - s * lerp(v0, v1, v) * Math.PI;
    let x = Math.sin(th) * (rx + over), z = cz + Math.cos(th) * (rz + over);
    // below the widest point the cloth hangs straight down instead of hugging the belly
    if (v > 0.5 && droop > 0) { const k = (v - 0.5) * 2; x = lerp(x, s * (rx + over), k * droop); z += k * k * droop * 0.03; }
    return [x, y, z];
  };
}

function warHoundGear(b: CharBuilder, L: QuadLook, v: Rng) {
  const steel = M.steelOld;
  const cloth = v.pick(['cloth_red|t=8a6a64', 'cloth_red|t=7a5a58', 'cloth_brown|t=8a7a66']);
  // caparison over the back: one tattered sheet across the spine, hanging down both flanks
  const cap = (u: number, vv: number): V3 => {
    const s: 1 | -1 = u < 0.5 ? 1 : -1;
    const across = Math.abs(u - 0.5) * 2; // 0 at the spine → 1 at the hem
    return flank(L, s, -0.1, 0.36, 0, 0.5, 0.035, 1)(vv, across);
  };
  b.add('hips', panel((u, vv) => cap(u, vv), 16, 10, { rng: b.rng, tatter: 0 }), cloth, { skin: torsoSkin });
  // tattered hems hanging below each side
  for (const s of [1, -1] as const) {
    const f = flank(L, s, -0.1, 0.36, 0.5, 0.5, 0.035, 1);
    b.add('hips', panel((u, vv) => { const p = f(u, 0); return [p[0] + s * vv * 0.02, p[1], p[2] + vv * 0.2]; }, 10, 4, { rng: b.rng, tatter: 0.45 }), cloth, { skin: torsoSkin });
    // the old army castle-and-sword on each flank
    const fi = flank(L, s, 0.02, 0.24, 0.2, 0.48, 0.056, 0);
    b.add('hips', panel((u, vv) => fi(s > 0 ? 1 - u : u, vv), 6, 6, { unitUV: true }), M.army, { skin: torsoSkin });
  }
  // peytral: a plate collar round the chest front and brisket, rivets, and a boss
  const pey = ringsOf([[0.44, 0.15, 0.22, 0.05], [0.54, 0.145, 0.21, 0.05], [0.6, 0.12, 0.18, 0.05], [0.66, 0.08, 0.12, 0.03]]).map((r) => ({ ...r, rx: r.rx + 0.018, rz: r.rz! + 0.018 }));
  b.loft('hips', pey, steel, { segs: 18, phi0: -2.0, phiLen: 4.0 }, { skin: torsoSkin, crack: 1.5 });
  b.add('hips', xf(loft([{ y: 0.03, rx: 0.002 }, { y: 0.0, rx: 0.04 }, { y: -0.01, rx: 0.04 }], { segs: 10, capBottom: true }), { p: [0, 0.66, 0.08], r: [0.5, 0, 0] }), M.iron, { skin: torsoSkin });
  // crinet: lames down the nape of the neck
  for (let i = 0; i < 3; i++) {
    const y = -0.1 + i * 0.075;
    b.loft('neck', ringsOf([[y + 0.05, 0.09 - i * 0.006, 0.115 - i * 0.008, 0.02], [y - 0.02, 0.095 - i * 0.006, 0.12 - i * 0.008, 0.02]]), steel, { segs: 14, phi0: Math.PI - 1.35, phiLen: 2.7 }, { skin: neckSkin, crack: 1.2 });
  }
  // spiked collar
  const collar = ringsOf([[0.1, 0.075, 0.09, 0.008], [0.06, 0.078, 0.093, 0.01]]);
  b.add('neck', loft(collar, { segs: 16 }), M.leatherDark, { skin: neckSkin });
  const spikes: G[] = [];
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * TAU;
    const x = Math.sin(th) * 0.08, z = 0.009 + Math.cos(th) * 0.095;
    spikes.push(xf(xf(loft([{ y: 0, rx: 0.009 }, { y: 0.035, rx: 0.001 }], { segs: 5, capBottom: true }), { r: [Math.PI / 2, 0, 0] }), { p: [x, 0.08, z], r: [0, th, 0] }));
  }
  b.add('neck', merge(spikes), M.iron, { skin: neckSkin });
  // chamfron: a riveted face plate over brow and muzzle, with a short spike
  const ch = ringsOf([[-0.02, 0.07, 0.07, -0.01], [0.08, 0.066, 0.066, 0.0], [0.17, 0.058, 0.058, 0.012], [0.215, 0.05, 0.05, 0.018]]).map((r) => ({ ...r, rx: r.rx + 0.006, rz: r.rz! + 0.006 }));
  b.loft('head', ch, steel, { segs: 14, phi0: Math.PI - 1.0, phiLen: 2.0 }, { crack: 1 });
  b.add('head', xf(loft([{ y: 0, rx: 0.012 }, { y: 0.07, rx: 0.002 }], { segs: 6, capBottom: true }), { p: [0, 0.02, -0.075], r: [-1.05, 0, 0] }), M.iron);
  // girth strap under the belly holding the caparison
  const girth: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const th = Math.PI * 0.5 + (i / 10) * Math.PI;
    girth.push([Math.sin(th) * 0.14, 0.24, 0.04 - Math.cos(th) * 0.19]);
  }
  b.add('hips', sweep(girth, { w: 0.018, h: 0.004, up: [0, 1, 0], sides: 4, segs: 14 }), M.leatherDark, { skin: torsoSkin });
}

function huntingHoundGear(b: CharBuilder, L: QuadLook, v: Rng) {
  const livery = v.pick(['cloth_black|t=8a8480', 'cloth_blue|t=6a7280']);
  // short livery coat over the back, badly torn
  for (const s of [1, -1] as const) {
    const f = flank(L, s, 0.0, 0.42, 0, 0.62, 0.035, 0.6);
    b.add('hips', panel((u, vv) => f(u, vv), 10, 7, { rng: b.rng, tatter: 0.42 }), livery, { skin: torsoSkin });
    // the royal arms, worn and chipped, on the shoulder of the coat
    const fa = flank(L, s, 0.26, 0.4, 0.2, 0.44, 0.042, 0);
    b.add('hips', panel((u, vv) => fa(s > 0 ? 1 - u : u, vv), 5, 6, { unitUV: true }), M.armsWorn, { skin: torsoSkin });
  }
  // gilt trim along the spine seam
  const seam: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = lerp(0.0, 0.42, i / 8);
    const p = flank(L, 1, y, y, 0, 0, 0.04, 0)(0, 0);
    seam.push([0, y, p[2]]);
  }
  b.add('hips', sweep(seam, { w: 0.012, h: 0.003, up: [1, 0, 0], sides: 4, segs: 12 }), M.gold, { skin: torsoSkin });
  // collar with a small bronze bell (the Household's hounds were belled)
  b.add('neck', loft(ringsOf([[0.06, 0.066, 0.078, 0.006], [0.025, 0.068, 0.08, 0.007]]), { segs: 16 }), M.leather, { skin: neckSkin });
  b.add('neck', loft(ringsOf([[0.065, 0.068, 0.08, 0.006], [0.058, 0.069, 0.081, 0.006]]), { segs: 16 }), M.gold, { skin: neckSkin });
  const bell = merge([
    xf(loft([{ y: 0.025, rx: 0.004 }, { y: 0.02, rx: 0.012 }, { y: 0.0, rx: 0.018 }, { y: -0.006, rx: 0.02 }], { segs: 10, capTop: true }), {}),
    xf(ellipsoid(0.005, 0.005, 0.005, { segs: 6, rows: 4 }), { p: [0, -0.008, 0] }),
  ]);
  b.add('neck', bell, 'bronze_bell', { p: [0, 0.03, 0.105], r: [-0.4, 0, 0], skin: neckSkin });
}

// ------------------------------------------------------------------------------------ looks

const WAR_TORSO: Station[] = [
  [-0.26, 0.035, 0.04, 0.02], [-0.21, 0.085, 0.095, 0.07], [-0.13, 0.115, 0.12, 0.105], [-0.03, 0.12, 0.12, 0.115],
  [0.07, 0.1, 0.105, 0.09], [0.17, 0.108, 0.12, 0.14], [0.29, 0.125, 0.145, 0.215], [0.4, 0.13, 0.155, 0.235],
  [0.5, 0.124, 0.15, 0.22], [0.58, 0.1, 0.12, 0.17], [0.64, 0.062, 0.07, 0.1], [0.67, 0.02, 0.03, 0.03],
];
const SIGHT_TORSO: Station[] = [
  [-0.26, 0.03, 0.035, 0.02], [-0.21, 0.075, 0.09, 0.06], [-0.13, 0.1, 0.115, 0.09], [-0.03, 0.1, 0.115, 0.085],
  [0.07, 0.085, 0.1, 0.06], [0.17, 0.1, 0.115, 0.14], [0.29, 0.12, 0.135, 0.25], [0.4, 0.125, 0.145, 0.28],
  [0.5, 0.118, 0.14, 0.24], [0.58, 0.09, 0.11, 0.16], [0.64, 0.055, 0.065, 0.09], [0.67, 0.02, 0.03, 0.03],
];
const STAG_TORSO: Station[] = [
  [-0.3, 0.035, 0.05, 0.02], [-0.24, 0.1, 0.12, 0.08], [-0.14, 0.13, 0.14, 0.12], [-0.03, 0.13, 0.13, 0.13],
  [0.08, 0.12, 0.12, 0.13], [0.18, 0.13, 0.13, 0.17], [0.3, 0.14, 0.15, 0.2], [0.4, 0.14, 0.16, 0.21],
  [0.5, 0.13, 0.16, 0.19], [0.58, 0.1, 0.13, 0.15], [0.64, 0.06, 0.08, 0.09], [0.67, 0.02, 0.03, 0.03],
];

export const LOOKS: Record<string, QuadLook> = {
  warHound: {
    dims: WAR_HOUND, coat: 'hair_fair|t=6a5e56|r=0.9', belly: 'hair_fair|t=8a7c70|r=0.9', skin: 'skin|t=6a3a34', dark: 'leather_dark|c=1a1614',
    torso: WAR_TORSO, head: 'mastiff', ears: 'crop', tail: 'hang', feet: 'paw', leg: 1.2, neck: 1.1, crack: 0.9, ribs: 0.3,
  },
  huntingHound: {
    dims: HUNTING_HOUND, coat: 'skin_pale|t=8a8680|r=0.95', belly: 'skin_pale|t=a09c96|r=0.95', skin: 'skin|t=6a3a34', dark: 'leather_dark|c=1a1614',
    torso: SIGHT_TORSO, head: 'sight', ears: 'drop', tail: 'sight', feet: 'paw', leg: 1.1, neck: 1.0, crack: 0.75, ribs: 1,
  },
  carrionStag: {
    dims: CARRION_STAG, coat: 'skin_pale|t=8a7866|r=0.95', belly: 'skin_pale|t=a09482|r=0.95', skin: 'skin|t=6a3a34', dark: 'leather_dark|c=1a1614',
    torso: STAG_TORSO, head: 'stag', ears: 'stag', tail: 'stub', feet: 'hoof', leg: 0.8, neck: 1.0, crack: 1.1, ribs: 1,
  },
};

export function buildBeast(rig: Rig, look: string, seed: number): BuiltModel {
  const L = LOOKS[look];
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 29);
  const v = new Rng(seed * 104729 + 11);
  quadruped(b, L);
  if (look === 'warHound') warHoundGear(b, L, v);
  else if (look === 'huntingHound') huntingHoundGear(b, L, v);
  return b.build();
}

for (const look of Object.keys(LOOKS)) registerEnemyLook(look, (rig, seed) => buildBeast(rig, look, seed));
