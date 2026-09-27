/**
 * Half-timbered house generator.
 *
 * Local frame: origin at the FRONT-centre of the footprint at ground level; the front faces +Z,
 * width runs along X ∈ [-w/2, w/2] and the house extends back to z = -d. Upper storeys jetty out
 * over the street (+Z). Variation comes from the seed: bay rhythm, brace patterns, lit windows,
 * chimneys, shopfronts, signs. `burned` produces a charred shell with a skeletal roof.
 */
import type { MaterialId } from '../../render/materialIds';
import { Rng } from '../../core/rng';
import { Kit } from './Kit';
import { gableRoof } from './architecture';
import { cyl, gablePrism } from './geom';

export interface HouseOpts {
  w: number;
  d: number;
  storeys: number;
  storeyH?: number;
  groundH?: number;
  jetty?: number;
  /** 'front' = gable faces the street (ridge along Z); 'side' = ridge parallel to the street. */
  roof?: 'front' | 'side';
  pitch?: number;
  stoneBase?: boolean;
  /** Whole house in stone (prosperous facade). */
  stone?: boolean;
  burned?: boolean;
  /** Probability that a window is lit (warm emissive). */
  lit?: number;
  shop?: boolean;
  chimneys?: number;
  /** Add a footprint collider (default false: most streets use explicit bounds). */
  col?: boolean;
  /** 'high' (street), 'low' (mid-ground fill), 'far' (distant fill: massing + a few lit windows). */
  detail?: 'high' | 'low' | 'far';
  seed?: number;
  sign?: boolean;
  plaster?: MaterialId;
}

export interface HouseInfo { eaves: number; ridge: number; frontAt: (storey: number) => number }

export function house(kit: Kit, x: number, y: number, z: number, yaw: number, o: HouseOpts): HouseInfo {
  const rng = new Rng(o.seed ?? Math.floor(x * 73 + z * 131 + 7));
  if (o.detail === 'far') return farHouse(kit, rng, x, y, z, yaw, o);
  const hi = (o.detail ?? 'high') === 'high';
  const w = o.w, d = o.d, n = o.storeys;
  const gh = o.groundH ?? 3.0, sh = o.storeyH ?? 2.75;
  const jet = o.burned ? (o.jetty ?? 0.4) : (o.jetty ?? 0.45);
  const lit = o.burned ? 0 : (o.lit ?? 0.35);
  const plaster: MaterialId = o.plaster ?? 'plaster';
  const frameMat: MaterialId = o.burned ? 'timber_burnt' : rng.chance(0.3) ? 'timber' : 'timber_dark';
  const front = (k: number) => k * jet;
  kit.push(x, y, z, yaw);

  let y0 = 0;
  const heights: number[] = [];
  for (let k = 0; k < n; k++) heights.push(k === 0 ? gh : sh);
  const collapsedFrom = o.burned ? Math.max(1, n - 1) : n; // burned: top storey is a skeleton

  for (let k = 0; k < n; k++) {
    const h = heights[k];
    const f = front(k);
    const stoneStorey = !!(o.stone || (k === 0 && o.stoneBase));
    const wallMat: MaterialId = stoneStorey ? (o.burned ? 'stone_dark' : 'stone_wall') : o.burned ? 'timber_dark' : plaster;
    const skeleton = k >= collapsedFrom;
    if (!skeleton) {
      kit.bmm(wallMat, -w / 2, y0, -d, w / 2, y0 + h, f);
    } else {
      // charred floor + broken back wall stub
      kit.bmm('timber_burnt', -w / 2, y0 - 0.1, -d, w / 2, y0 + 0.12, f);
      kit.bmm('stone_dark', -w / 2, y0, -d, w / 2, y0 + h * rng.range(0.3, 0.7), -d + 0.4);
    }
    // Stone storeys: quoins + string course; timber storeys: framing
    if (stoneStorey && !skeleton) {
      kit.bmm('stone_trim', -w / 2 - 0.08, y0 + h - 0.22, -d - 0.02, w / 2 + 0.08, y0 + h, f + 0.1, { cast: false });
      if (hi) for (let q = 0; q < Math.floor(h / 0.6); q++) {
        const qy = y0 + q * 0.6 + 0.3, long = q % 2 === 0;
        for (const s of [-1, 1]) kit.box('stone_trim', s * (w / 2 - (long ? 0.3 : 0.2)), qy, f + 0.03, long ? 0.62 : 0.42, 0.5, 0.08, { cast: false });
      }
    } else {
      frameFace(kit, rng, -w / 2, w / 2, y0, h, f, 'front', frameMat, hi, skeleton, k);
      if (hi) {
        frameSide(kit, rng, -d, f, y0, h, -w / 2, -1, frameMat, hi, skeleton);
        frameSide(kit, rng, -d, f, y0, h, w / 2, 1, frameMat, hi, skeleton);
      }
    }
    // jetty: bressumer + joist ends
    if (k > 0) {
      kit.bmm(frameMat, -w / 2 - 0.02, y0 - 0.22, f - 0.12, w / 2 + 0.02, y0 + 0.05, f + 0.06, { cast: false });
      if (hi) for (let jx = -w / 2 + 0.25; jx < w / 2; jx += 0.5) kit.box(frameMat, jx, y0 - 0.32, f - jet / 2 - 0.02, 0.14, 0.14, jet + 0.02, { cast: false });
    }
    // windows
    if (!skeleton) {
      const bays = Math.max(1, Math.round(w / 1.7));
      const bw = w / bays;
      for (let b = 0; b < bays; b++) {
        const cx = -w / 2 + bw * (b + 0.5);
        if (k === 0) {
          // ground floor: door in one bay, shop window/others
          if (b === Math.floor(bays / 2) - (bays > 2 && rng.chance(0.5) ? 1 : 0)) { if (hi) door(kit, cx, 0, f, o.burned ?? false); else kit.box(o.burned ? 'timber_burnt' : 'planks', cx, 1.05, f + 0.02, 1.1, 2.1, 0.08, { cast: false }); }
          else if (o.shop && !o.burned && hi) shopWindow(kit, rng, cx, f, Math.min(bw - 0.4, 1.8), lit);
          else if (rng.chance(0.6)) (hi ? window_ : windowLow)(kit, rng, cx, y0 + 1.1, f, 0.8, 1.1, lit * 0.8, o.burned ?? false, stoneStorey);
        } else if (rng.chance(o.burned ? 0.8 : 0.85)) {
          (hi ? window_ : windowLow)(kit, rng, cx, y0 + 0.95, f, Math.min(bw - 0.5, 1.0), 1.15, lit, o.burned ?? false, stoneStorey);
        }
      }
      // a side window or two
      if (hi && k > 0) for (const s of [-1, 1]) if (rng.chance(0.4)) sideWindow(kit, rng, s * w / 2, y0 + 1.0, -d * rng.range(0.3, 0.6), s, lit);
    }
    y0 += h;
  }
  const eaves = y0;
  // roof
  const fTop = front(n - 1);
  const rd = d + fTop;
  const rcz = (fTop - d) / 2;
  const roof = o.roof ?? (rng.chance(0.55) ? 'front' : 'side');
  let ridge = eaves;
  const burnFrac = o.burned ? rng.range(0.0, 0.35) : undefined;
  const pitch = o.pitch ?? ((50 + rng.range(0, 10)) * Math.PI) / 180;
  if (roof === 'front') {
    ridge += gableRoof(kit, 0, eaves, rcz, 0, w, rd, { pitch, burned: burnFrac, gableMat: o.burned ? null : o.stone ? 'stone_wall' : plaster, mat: 'roof_slate', variant: rng.int(0, 1) });
    if (!o.burned && !o.stone) gableTimbers(kit, w, (w / 2) * Math.tan(pitch), eaves, fTop + 0.14, frameMat, hi, rng, lit);
  } else {
    ridge += gableRoof(kit, 0, eaves, rcz, Math.PI / 2, rd, w, { pitch, burned: burnFrac, gableMat: o.burned ? null : o.stone ? 'stone_wall' : plaster, mat: 'roof_slate', variant: rng.int(0, 1) });
    // dormer-like gablet on long roofs
    if (hi && !o.burned && w > 6 && rng.chance(0.5)) {
      const gw = 1.4, gy = eaves + 0.6;
      kit.bmm(plaster, -gw / 2, gy - 0.6, fTop - 1.2, gw / 2, gy + 1.2, fTop - 0.2);
      window_(kit, rng, 0, gy + 0.1, fTop - 0.2, 0.7, 0.8, lit, false, false);
      gableRoof(kit, 0, gy + 1.2, fTop - 0.8, 0, gw, 1.6, { pitch: (55 * Math.PI) / 180, overhang: 0.15, endOverhang: 0.1, gableMat: plaster });
    }
  }
  // chimneys
  const nCh = o.chimneys ?? (rng.chance(0.75) ? 1 : 2);
  for (let c = 0; c < nCh; c++) {
    const cx = (c === 0 ? 1 : -1) * rng.range(0.15, 0.35) * w;
    const cz = rcz - rng.range(0.05, 0.3) * rd;
    const top = ridge + rng.range(0.4, 1.2);
    const cm: MaterialId = o.burned ? 'stone_dark' : rng.chance(0.5) ? 'stone_wall' : 'stone_dark';
    kit.bmm(cm, cx - 0.4, eaves - 1, cz - 0.35, cx + 0.4, top, cz + 0.35);
    kit.bmm('stone_trim', cx - 0.48, top, cz - 0.43, cx + 0.48, top + 0.15, cz + 0.43, { cast: false });
    if (hi) for (const px of [-0.16, 0.16]) kit.add('stone_dark', cyl(0.1, 0.12, 0.4, 6), { x: cx + px, y: top + 0.15, z: cz }, { cast: false });
  }
  // hanging sign
  if (o.sign && !o.burned) {
    const sx = w / 2 - 0.3, sy = gh + 0.2;
    kit.box('iron', sx, sy + 0.4, front(1) + 0.55, 0.05, 0.05, 1.1, { cast: false });
    kit.box('planks', sx, sy - 0.05, front(1) + 0.8, 0.06, 0.6, 0.7, { cast: false });
  }
  if (o.col) kit.solid(-w / 2, 0, -d, w / 2, eaves, 0);
  kit.pop();
  return { eaves, ridge, frontAt: front };
}

/** Front timber framing for one storey on the plane z = f. */
function frameFace(kit: Kit, rng: Rng, x0: number, x1: number, y0: number, h: number, f: number, _side: 'front', mat: MaterialId, hi: boolean, skeleton: boolean, k: number) {
  const z = f + 0.04;
  const w = x1 - x0;
  const nPost = Math.max(2, Math.round(w / (hi ? 0.85 : 1.6)));
  const T = 0.08;
  // sole + head plates
  kit.bmm(mat, x0 - 0.02, y0, z - T, x1 + 0.02, y0 + 0.18, z + T, { cast: false });
  kit.bmm(mat, x0 - 0.02, y0 + h - 0.18, z - T, x1 + 0.02, y0 + h, z + T, { cast: false });
  if (hi) kit.bmm(mat, x0, y0 + 0.85, z - T, x1, y0 + 0.97, z + T, { cast: false });
  const pattern = rng.int(0, 3);
  for (let i = 0; i <= nPost; i++) {
    const px = x0 + (w * i) / nPost;
    if (skeleton && rng.chance(0.35)) continue;
    const ph = skeleton ? h * rng.range(0.4, 1) : h;
    kit.box(mat, Math.min(x1 - 0.09, Math.max(x0 + 0.09, px)), y0 + ph / 2, z, 0.18, ph, T * 2, { cast: skeleton });
  }
  if (!hi || k === 0) return;
  // braces in some panels (lower half: below the sill rail)
  for (let i = 0; i < nPost; i++) {
    const ax = x0 + (w * i) / nPost, bx = x0 + (w * (i + 1)) / nPost;
    const bw = bx - ax;
    if (skeleton && rng.chance(0.5)) continue;
    if (pattern === 0 && i % 2 === 0) {
      // X in the lower panel
      const L = Math.hypot(bw, 0.7), a = Math.atan2(0.7, bw);
      kit.box(mat, (ax + bx) / 2, y0 + 0.52, z, L, 0.12, T * 2, { rz: a, cast: false });
      kit.box(mat, (ax + bx) / 2, y0 + 0.52, z, L, 0.12, T * 2, { rz: -a, cast: false });
    } else if (pattern === 1 && (i === 0 || i === nPost - 1)) {
      // long corner braces
      const H = h - 0.4, L = Math.hypot(bw, H), a = Math.atan2(H, bw) * (i === 0 ? 1 : -1);
      kit.box(mat, (ax + bx) / 2, y0 + h / 2, z, L, 0.14, T * 2, { rz: a, cast: false });
    } else if (pattern === 2 && i % 2 === 1) {
      // chevrons
      const L = Math.hypot(bw / 2, 0.7), a = Math.atan2(0.7, bw / 2);
      kit.box(mat, ax + bw / 4, y0 + 0.52, z, L, 0.12, T * 2, { rz: a, cast: false });
      kit.box(mat, bx - bw / 4, y0 + 0.52, z, L, 0.12, T * 2, { rz: -a, cast: false });
    } else if (pattern === 3 && i % 3 === 0) {
      // curved-ish ogee: two short braces into the head plate
      const L = Math.hypot(bw / 2, 0.8), a = Math.atan2(0.8, bw / 2);
      kit.box(mat, ax + bw / 4, y0 + h - 0.55, z, L, 0.12, T * 2, { rz: -a, cast: false });
      kit.box(mat, bx - bw / 4, y0 + h - 0.55, z, L, 0.12, T * 2, { rz: a, cast: false });
    }
  }
}

/** Side framing (plane x = xs, facing sign s) from z0 (back) to z1 (front). */
function frameSide(kit: Kit, rng: Rng, z0: number, z1: number, y0: number, h: number, xs: number, s: number, mat: MaterialId, hi: boolean, skeleton: boolean) {
  const x = xs + s * 0.04;
  const len = z1 - z0;
  const nPost = Math.max(2, Math.round(len / (hi ? 1.3 : 2.5)));
  kit.bmm(mat, x - 0.08, y0, z0, x + 0.08, y0 + 0.18, z1, { cast: false });
  kit.bmm(mat, x - 0.08, y0 + h - 0.18, z0, x + 0.08, y0 + h, z1, { cast: false });
  for (let i = 0; i <= nPost; i++) {
    if (skeleton && rng.chance(0.4)) continue;
    const pz = Math.min(z1 - 0.09, Math.max(z0 + 0.09, z0 + (len * i) / nPost));
    kit.box(mat, x, y0 + h / 2, pz, 0.16, h, 0.18, { cast: skeleton });
  }
  if (hi && !skeleton && rng.chance(0.6)) {
    const L = Math.hypot(len / nPost, h - 0.4), a = Math.atan2(h - 0.4, len / nPost);
    kit.box(mat, x, y0 + h / 2, z0 + len / nPost / 2, 0.16, 0.14, L, { rx: a, cast: false });
  }
}

/** Front window: frame, pane (lit or dark), mullion cross, sill, optional shutters. */
export function window_(kit: Kit, rng: Rng, cx: number, sillY: number, f: number, w: number, h: number, litP: number, burned: boolean, stone: boolean) {
  const z = f + 0.02;
  const lit = rng.chance(litP);
  const pane: MaterialId = burned ? 'timber_burnt' : lit ? 'window_warm' : 'glass';
  kit.box(pane, cx, sillY + h / 2, z - 0.01, w, h, 0.04, { cast: false });
  const fm: MaterialId = burned ? 'timber_burnt' : stone ? 'stone_trim' : 'timber_dark';
  const t = stone ? 0.16 : 0.1;
  kit.box(fm, cx, sillY - t / 2, z + 0.05, w + t * 2 + 0.1, t, 0.14, { cast: false });
  kit.box(fm, cx, sillY + h + t / 2, z + 0.05, w + t * 2, t, 0.12, { cast: false });
  kit.box(fm, cx - w / 2 - t / 2, sillY + h / 2, z + 0.05, t, h, 0.12, { cast: false });
  kit.box(fm, cx + w / 2 + t / 2, sillY + h / 2, z + 0.05, t, h, 0.12, { cast: false });
  if (!burned) {
    kit.box('timber_dark', cx, sillY + h * 0.55, z + 0.03, w, 0.05, 0.05, { cast: false });
    kit.box('timber_dark', cx, sillY + h / 2, z + 0.03, 0.05, h, 0.05, { cast: false });
    if (!lit && rng.chance(0.35)) {
      // open shutters
      for (const s of [-1, 1]) kit.box('planks', cx + s * (w / 2 + t + w / 4 + 0.02), sillY + h / 2, z + 0.06, w / 2, h, 0.05, { cast: false, variant: 1 });
    }
  }
}

function sideWindow(kit: Kit, rng: Rng, xs: number, sillY: number, z: number, s: number, litP: number) {
  kit.push(xs, 0, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
  window_(kit, rng, 0, sillY, 0, 0.7, 1.0, litP, false, false);
  kit.pop();
}

/** Plank door with frame and iron straps on the plane z = f. */
export function door(kit: Kit, cx: number, y: number, f: number, burned = false, w = 1.1, h = 2.1) {
  const z = f + 0.02;
  kit.box(burned ? 'timber_burnt' : 'planks', cx, y + h / 2, z - 0.02, w, h, 0.08, { cast: false });
  const fm: MaterialId = burned ? 'timber_burnt' : 'timber_dark';
  kit.box(fm, cx - w / 2 - 0.08, y + h / 2 + 0.05, z + 0.04, 0.16, h + 0.1, 0.14, { cast: false });
  kit.box(fm, cx + w / 2 + 0.08, y + h / 2 + 0.05, z + 0.04, 0.16, h + 0.1, 0.14, { cast: false });
  kit.box(fm, cx, y + h + 0.1, z + 0.04, w + 0.32, 0.2, 0.16, { cast: false });
  if (!burned) for (const yy of [0.4, h - 0.45]) kit.box('iron', cx - 0.1, y + yy, z + 0.03, w * 0.8, 0.07, 0.03, { cast: false });
}

/** Shopfront: wide window with stall board and an awning. */
function shopWindow(kit: Kit, rng: Rng, cx: number, f: number, w: number, litP: number) {
  const z = f;
  const lit = rng.chance(Math.min(1, litP * 1.8));
  kit.box(lit ? 'window_warm' : 'glass', cx, 1.55, z + 0.01, w, 1.3, 0.04, { cast: false });
  for (let i = 0; i <= 3; i++) kit.box('timber_dark', cx - w / 2 + (w * i) / 3, 1.55, z + 0.04, 0.08, 1.3, 0.06, { cast: false });
  kit.box('timber_dark', cx, 0.85, z + 0.2, w + 0.3, 0.1, 0.45, { cast: false });
  kit.box('timber_dark', cx, 2.28, z + 0.05, w + 0.3, 0.14, 0.14, { cast: false });
  // awning
  const L = 1.1, a = 0.35;
  kit.box(rng.chance(0.5) ? 'cloth_brown' : 'planks', cx, 2.45 - Math.sin(a) * L / 2, z + Math.cos(a) * L / 2, w + 0.4, 0.05, L, { rx: a, cast: false });
}

/** Timber pattern on a front gable triangle (collar, king post, braces) + attic window. */
function gableTimbers(kit: Kit, w: number, rise: number, y: number, z: number, mat: MaterialId, hi: boolean, rng: Rng, litP: number) {
  kit.box(mat, 0, y + rise * 0.45, z, w * 0.55 * 1.0, 0.16, 0.12, { cast: false });
  kit.box(mat, 0, y + rise * 0.5, z, 0.16, rise * 0.95, 0.12, { cast: false });
  if (hi) {
    const L = Math.hypot(w * 0.25, rise * 0.45), a = Math.atan2(rise * 0.45, w * 0.25);
    kit.box(mat, -w * 0.14, y + rise * 0.22, z, L, 0.13, 0.12, { rz: a, cast: false });
    kit.box(mat, w * 0.14, y + rise * 0.22, z, L, 0.13, 0.12, { rz: -a, cast: false });
    if (rise > 2.6) window_(kit, rng, 0, y + rise * 0.52, z - 0.06, 0.5, 0.7, litP * 0.7, false, false);
  }
  // barge boards along the rakes
  const Lr = Math.hypot(w / 2 + 0.4, rise + 0.4 * Math.tan(Math.atan2(rise, w / 2)));
  const ar = Math.atan2(rise, w / 2);
  for (const s of [-1, 1]) kit.box(mat, s * (w / 4 + 0.1), y + rise / 2 - 0.12, z + 0.25, Lr, 0.22, 0.08, { rz: -s * ar, cast: false });
}

/** Mid-ground window: pane + one dark surround (2 boxes). */
function windowLow(kit: Kit, rng: Rng, cx: number, sillY: number, f: number, w: number, h: number, litP: number, burned: boolean, stone: boolean) {
  const lit = rng.chance(litP);
  kit.box(stone ? 'stone_trim' : burned ? 'timber_burnt' : 'timber_dark', cx, sillY + h / 2, f + 0.01, w + 0.24, h + 0.24, 0.06, { cast: false });
  kit.box(burned ? 'timber_burnt' : lit ? 'window_warm' : 'glass', cx, sillY + h / 2, f + 0.05, w, h, 0.03, { cast: false });
}

/** Distant fill house: one mass, a gable prism roof, a chimney and a few lit windows (~70 tris). */
function farHouse(kit: Kit, rng: Rng, x: number, y: number, z: number, yaw: number, o: HouseOpts): HouseInfo {
  const w = o.w, d = o.d;
  const h = (o.groundH ?? 3.0) + (o.storeys - 1) * (o.storeyH ?? 2.75);
  kit.push(x, y, z, yaw);
  const wall: MaterialId = o.burned ? 'timber_dark' : rng.chance(0.5) ? (o.plaster ?? 'plaster') : rng.chance(0.5) ? 'stone_wall' : 'timber_dark';
  kit.bmm(wall, -w / 2, 0, -d, w / 2, h, 0, { cast: true });
  const pitch = ((50 + rng.range(0, 10)) * Math.PI) / 180;
  const front = (o.roof ?? 'front') === 'front';
  const span = front ? w : d, len = front ? d : w;
  const rise = (span / 2) * Math.tan(pitch);
  if (!o.burned || rng.chance(0.4)) {
    kit.add('roof_slate', gablePrism(span + 0.6, rise, len + 0.5), { y: h, z: -d / 2, ry: front ? 0 : Math.PI / 2 }, { cast: true });
  } else {
    for (let i = 0; i < 4; i++) kit.box('timber_burnt', rng.range(-w / 3, w / 3), h + rise * 0.4, -d / 2, 0.16, rise, 0.16, { rz: rng.range(-0.6, 0.6), cast: true });
  }
  if (rng.chance(0.7)) kit.bmm('stone_dark', w * 0.15, h - 0.5, -d * 0.4, w * 0.15 + 0.7, h + rise + 0.6, -d * 0.4 + 0.6, { cast: false });
  const nWin = Math.max(1, Math.floor(w / 1.8)) * o.storeys;
  const litP = o.burned ? 0 : (o.lit ?? 0.3);
  for (let i = 0; i < nWin; i++) {
    const col = i % Math.max(1, Math.floor(w / 1.8)), row = Math.floor(i / Math.max(1, Math.floor(w / 1.8)));
    const lit = rng.chance(litP);
    kit.box(lit ? 'window_warm' : 'timber_dark', -w / 2 + 0.9 + col * 1.8, 1.4 + row * 2.75, 0.03, 0.7, 1.0, 0.05, { cast: false, receive: false });
  }
  kit.pop();
  return { eaves: h, ridge: h + rise, frontAt: () => 0 };
}
