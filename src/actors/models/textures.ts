/**
 * Small procedural masks used by the character models (no DOM needed — plain DataTextures, so
 * they also build under node tests):
 *  - royal arms (crown / bar / arch with bell / base bar) worn and chipped, for tabards & shields
 *  - the obsolete army insignia (castle and sword) for Unlived surcoats and the Gatewarden
 *  - tattered hem masks for simulated cloaks (alphaTest)
 *  - a gilt embroidery band (repeating along U) for robe trims
 * All masks are RGBA with the value replicated to every channel (three reads alphaMap.g).
 * Textures are cached and shared; never dispose them from a model.
 */
import * as THREE from 'three';
import { hash2 } from '../../core/rng';

const cache = new Map<string, THREE.DataTexture>();

function make(key: string, w: number, h: number, fn: (x: number, y: number) => number, o: { repeatU?: boolean; aa?: number } = {}) {
  let t = cache.get(key);
  if (t) return t;
  const data = new Uint8Array(w * h * 4);
  const aa = o.aa ?? 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let sy = 0; sy < aa; sy++) for (let sx = 0; sx < aa; sx++) s += fn((x + (sx + 0.5) / aa) / w, (y + (sy + 0.5) / aa) / h);
      const v = Math.round((s / (aa * aa)) * 255);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = v;
    }
  }
  t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = o.repeatU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  t.name = key;
  cache.set(key, t);
  return t;
}

/** Smooth value noise in [0,1]. */
export function vnoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(x: number, y: number, seed = 0, oct = 4): number {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f, seed + i * 17) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// ------------------------------------------------------------------ shape helpers (px space)

type P = [number, number];
function inPoly(x: number, y: number, poly: P[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/**
 * Royal arms in the reference's pixel space (424 × 706, y down): five-pointed crown, bar,
 * round arch with a bell inside, base bar. Matches concept-art/heraldry/royal-arms-user-reference.
 */
function royalArms(x: number, y: number): boolean {
  // crown band + points
  if (inRect(x, y, 108, 196, 338, 240)) return true;
  if (inPoly(x, y, [[178, 200], [222, 28], [266, 200]])) return true;
  if (inPoly(x, y, [[112, 200], [142, 92], [186, 200]])) return true;
  if (inPoly(x, y, [[258, 200], [302, 92], [334, 200]])) return true;
  if (inPoly(x, y, [[100, 200], [70, 108], [136, 200]])) return true;
  if (inPoly(x, y, [[310, 200], [378, 104], [346, 200]])) return true;
  if (inCircle(x, y, 222, 26, 9)) return true;
  // bar
  if (inRect(x, y, 112, 256, 334, 300)) return true;
  // arch (∩) with small feet
  const cx = 230, cy = 452;
  const d = Math.hypot(x - cx, y - cy);
  if (y <= cy && d <= 136 && d >= 90) return true;
  if (y > cy && y <= 532 && ((x >= 94 && x <= 140) || (x >= 320 && x <= 366))) return true;
  if (inRect(x, y, 84, 520, 150, 534) || inRect(x, y, 310, 520, 376, 534)) return true;
  // bell
  if (y >= 380 && y <= 524) {
    const t = (y - 380) / 144;
    const hw = 22 + 30 * t + 30 * Math.pow(t, 3.2);
    if (Math.abs(x - 225) <= hw) return true;
  }
  if (inCircle(x, y, 225, 374, 12)) return true;
  // base bar
  if (inRect(x, y, 76, 560, 372, 606)) return true;
  return false;
}

/** Obsolete army insignia: two towers and a gate with an upright sword (256 × 256, y down). */
function armyInsignia(x: number, y: number): boolean {
  const crenel = (x0: number, x1: number, top: number) => {
    const w = (x1 - x0) / 5;
    for (let i = 0; i < 5; i += 2) if (inRect(x, y, x0 + i * w, top - 16, x0 + (i + 1) * w, top)) return true;
    return false;
  };
  const sword = inRect(x, y, 122, 92, 134, 206) || inRect(x, y, 104, 180, 152, 190) || inCircle(x, y, 128, 216, 7) ||
    inPoly(x, y, [[122, 92], [128, 70], [134, 92]]);
  const gateHole = inRect(x, y, 104, 120, 152, 236) || (inCircle(x, y, 128, 120, 24) && y < 120);
  if (sword) return true;
  // towers
  if (inRect(x, y, 30, 60, 92, 236) && !inRect(x, y, 54, 100, 66, 130)) return true;
  if (inRect(x, y, 164, 60, 226, 236) && !inRect(x, y, 190, 100, 202, 130)) return true;
  if (crenel(26, 96, 60) || crenel(160, 230, 60)) return true;
  // gate block
  if (inRect(x, y, 88, 96, 168, 236) && !gateHole) return true;
  if (crenel(90, 166, 96)) return true;
  return false;
}

/** Wear: chips and scratches removing paint (1 = paint kept). */
function wear(u: number, v: number, seed: number, amount: number): number {
  const n = fbm(u * 9, v * 9, seed, 4);
  const chips = fbm(u * 38, v * 38, seed + 5, 2);
  const scratch = Math.abs(Math.sin((u * 0.8 + v * 1.9) * 90 + fbm(u * 4, v * 4, seed + 9) * 8));
  let keep = n * 0.7 + chips * 0.5 - amount;
  if (scratch > 0.985) keep -= 0.4;
  return keep > 0.18 ? 1 : 0;
}

/** Royal arms alpha mask (128 × 214). amount: 0 fresh … 0.4 heavily chipped. */
export function royalArmsMask(amount = 0.22): THREE.DataTexture {
  return make(`arms:${amount}`, 128, 214, (u, v) => {
    const x = u * 424, y = (1 - v) * 706;
    // small inset so borders stay transparent
    return royalArms(x, y) ? wear(u, v, 3, amount) : 0;
  });
}

/** Army castle-and-sword insignia mask (128 × 128). */
export function armyInsigniaMask(amount = 0.3): THREE.DataTexture {
  return make(`army:${amount}`, 128, 128, (u, v) => (armyInsignia(u * 256, (1 - v) * 256) ? wear(u, v, 11, amount) : 0));
}

/**
 * Tattered hem mask for a cloak (uv.y = 0 is the hem). Ragged teeth with random depth, a few
 * rips running up from the hem and scattered moth holes in the lower half.
 */
export function tatterMask(seed = 1, depth = 0.16, holes = 6): THREE.DataTexture {
  const W = 128, H = 128;
  const cut: number[] = [];
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const teeth = Math.abs(((u * 13 + hash2(Math.floor(u * 13), 0, seed) * 0.8) % 1) - 0.5) * 2;
    cut.push(depth * (0.25 + 0.5 * fbm(u * 7, 0.5, seed) + 0.45 * teeth * hash2(Math.floor(u * 13), 3, seed)));
  }
  const rips: { u: number; h: number; w: number }[] = [];
  for (let i = 0; i < 4; i++) rips.push({ u: hash2(i, 7, seed), h: depth + hash2(i, 9, seed) * 0.28, w: 0.006 + hash2(i, 5, seed) * 0.012 });
  const hl: { u: number; v: number; r: number }[] = [];
  for (let i = 0; i < holes; i++) hl.push({ u: 0.08 + hash2(i, 13, seed) * 0.84, v: depth + 0.03 + hash2(i, 17, seed) * 0.35, r: 0.012 + hash2(i, 19, seed) * 0.03 });
  const t = make(`tatter:${seed}:${depth}:${holes}`, W, H, (u, v) => {
    const x = Math.min(W - 1, Math.floor(u * W));
    const edge = cut[x] + (fbm(u * 40, v * 40, seed) - 0.5) * 0.03;
    if (v < edge) return 0;
    for (const r of rips) {
      const wob = (fbm(v * 20, r.u * 10, seed) - 0.5) * 0.02;
      if (v < r.h && Math.abs(u - r.u + wob) < r.w * (1 - (v / r.h) * 0.8)) return 0;
    }
    for (const h of hl) {
      const d = Math.hypot((u - h.u) * 1.3, v - h.v) + (fbm(u * 60, v * 60, seed) - 0.5) * 0.012;
      if (d < h.r) return 0;
    }
    return 1;
  });
  // cloth sims carry a 0..1 'uv1' set for this mask (their main 'uv' is metric)
  t.channel = 1;
  return t;
}

/** Gilt embroidery band (repeats along U): border lines, lozenge chain and pearl dots. */
export function embroideryMask(): THREE.DataTexture {
  return make('embroidery', 64, 32, (u, v) => {
    if (v < 0.1 || v > 0.9) return 1;
    if ((v > 0.16 && v < 0.2) || (v > 0.8 && v < 0.84)) return 1;
    const du = Math.abs(u - 0.5) * 2, dv = Math.abs(v - 0.5) * 2 / 0.55;
    const d = du + dv;
    if (d < 1 && d > 0.72) return 1;
    if (Math.hypot(u - 0.5, (v - 0.5) * 0.5) < 0.07) return 1;
    if (Math.hypot(u, (v - 0.5) * 0.5) < 0.05 || Math.hypot(u - 1, (v - 0.5) * 0.5) < 0.05) return 1;
    return 0;
  }, { repeatU: true, aa: 3 });
}

/** A bell glyph mask (for small bell sigils / chest emblems), 64 × 64. */
export function bellMask(): THREE.DataTexture {
  return make('bell', 64, 64, (u, v) => {
    const x = u * 64, y = (1 - v) * 64;
    if (inCircle(x, y, 32, 12, 4)) return 1;
    if (y >= 15 && y <= 50) {
      const t = (y - 15) / 35;
      const hw = 7 + 8 * t + 9 * Math.pow(t, 3);
      if (Math.abs(x - 32) <= hw) return 1;
    }
    if (inCircle(x, y, 32, 55, 4)) return 1;
    return 0;
  });
}

/** Cathedral mark: a gothic pointed arch on posts with a bell inside (128 × 128). */
export function cathedralMask(amount = 0.28): THREE.DataTexture {
  return make(`cathedral:${amount}`, 128, 128, (u, v) => {
    const x = u * 256, y = (1 - v) * 256;
    // lintel + posts
    let on = inRect(x, y, 40, 40, 216, 58) || inRect(x, y, 52, 58, 84, 226) || inRect(x, y, 172, 58, 204, 226) || inRect(x, y, 40, 222, 96, 236) || inRect(x, y, 160, 222, 216, 236);
    // pointed arch ring between the posts (two circle arcs meeting at the apex)
    const inArch = (r: number) => {
      const a = Math.hypot(x - 172, y - 150) <= r && x <= 128;
      const b = Math.hypot(x - 84, y - 150) <= r && x > 128;
      return (a || b) && y <= 150;
    };
    if (inArch(88) && !inArch(72)) on = true;
    if (y > 150 && y < 226 && ((x >= 84 && x <= 100) || (x >= 156 && x <= 172))) on = true;
    // bell
    if (y >= 132 && y <= 200) {
      const t = (y - 132) / 68;
      if (Math.abs(x - 128) <= 10 + 12 * t + 14 * t * t * t) on = true;
    }
    if (inCircle(x, y, 128, 126, 7) || inCircle(x, y, 128, 208, 6)) on = true;
    return on ? wear(u, v, 21, amount) : 0;
  });
}
