/**
 * Room-building helpers for the Undervaults: rectangular rooms with doorways on any side (walls
 * placed OUTSIDE the given interior rectangle so the inner faces sit on its edges), segmental and
 * barrel vault shells, coffered ceilings with bronze studs, wall sconces and counting furniture.
 */
import * as THREE from 'three';
import type { MaterialId } from '../../render/materialIds';
import { Kit, wall, extrudeXY, archPoints, type ArchKind, cyl, ledger, papers, candles, chair, sconceTorch } from '../../world/kit';

export interface Door { side: 'n' | 's' | 'e' | 'w'; c: number; w: number; h: number; kind?: ArchKind; sill?: number }

/** Four walls around an interior rectangle (inner faces on its edges) with openings. */
export function roomWalls(k: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, h: number, t: number, doors: Door[] = [], skip: ('n' | 's' | 'e' | 'w')[] = []) {
  const op = (side: Door['side'], mid: number) => doors.filter((d) => d.side === side).map((d) => ({ u: d.c - mid, w: d.w, sill: d.sill ?? 0, h: d.h, kind: d.kind ?? 'flat' }));
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  if (!skip.includes('n')) wall(k, mat, x0 - t, z0 - t / 2, x1 + t, z0 - t / 2, y, h, t, { openings: op('n', mx) });
  if (!skip.includes('s')) wall(k, mat, x0 - t, z1 + t / 2, x1 + t, z1 + t / 2, y, h, t, { openings: op('s', mx) });
  if (!skip.includes('w')) wall(k, mat, x0 - t / 2, z0, x0 - t / 2, z1, y, h, t, { openings: op('w', mz) });
  if (!skip.includes('e')) wall(k, mat, x1 + t / 2, z0, x1 + t / 2, z1, y, h, t, { openings: op('e', mz) });
  // thresholds: floor through the wall thickness under every doorway
  for (const d of doors) {
    if (skip.includes(d.side) || (d.sill ?? 0) > 0.01) continue;
    const a = d.c - d.w / 2, b = d.c + d.w / 2;
    if (d.side === 'n') k.bmm('flagstone', a, y - 0.4, z0 - t - 0.02, b, y, z0 + 0.02, { col: true, cast: false });
    if (d.side === 's') k.bmm('flagstone', a, y - 0.4, z1 - 0.02, b, y, z1 + t + 0.02, { col: true, cast: false });
    if (d.side === 'w') k.bmm('flagstone', x0 - t - 0.02, y - 0.4, a, x0 + 0.02, y, b, { col: true, cast: false });
    if (d.side === 'e') k.bmm('flagstone', x1 - 0.02, y - 0.4, a, x1 + t + 0.02, y, b, { col: true, cast: false });
  }
}

/** Flat floor slab (visual + collider) with the top at y. */
export function slab(k: Kit, mat: MaterialId, x0: number, z0: number, x1: number, z1: number, y: number, col = true, thick = 0.4) {
  k.bmm(mat, x0, y - Math.min(thick, 0.3), z0, x1, y, z1, { cast: false, uv: 'world' });
  if (col) k.solid(x0, y - thick, z0, x1, y, z1);
}

/**
 * Segmental vault shell spanning `span` across (local X) and running `len` along local Z, springing
 * at local y=0 with the given rise; the frame is placed by (x, y, z, yaw). Transverse ribs every ~3 m.
 */
export function segVault(k: Kit, mat: MaterialId, x: number, y: number, z: number, yaw: number, span: number, rise: number, len: number, t = 0.35, ribs = true) {
  const half = span / 2;
  const R = (half * half + rise * rise) / (2 * rise);
  const cy = rise - R;
  const a0 = Math.asin(half / R);
  const n = 12;
  const outer: [number, number][] = [], inner: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = -a0 + (2 * a0 * i) / n;
    inner.push([Math.sin(a) * R, cy + Math.cos(a) * R]);
    outer.push([Math.sin(a) * (R + t), cy + Math.cos(a) * (R + t)]);
  }
  k.push(x, y, z, yaw);
  k.add(mat, extrudeXY([...outer, ...inner.slice().reverse()], len), { z: len / 2 }, { cast: true });
  if (ribs) {
    const nr = Math.max(1, Math.round(len / 3.2));
    for (let i = 0; i <= nr; i++) {
      const rib: [number, number][] = [], rin: [number, number][] = [];
      for (let j = 0; j <= n; j++) {
        const a = -a0 + (2 * a0 * j) / n;
        rib.push([Math.sin(a) * (R + 0.01), cy + Math.cos(a) * (R + 0.01)]);
        rin.push([Math.sin(a) * (R - 0.2), cy + Math.cos(a) * (R - 0.2)]);
      }
      k.add('stone_trim', extrudeXY([...rib, ...rin.reverse()], 0.32), { z: Math.min(len - 0.16, Math.max(0.16, (len * i) / nr)) }, { cast: false });
    }
  }
  k.pop();
}

/** Coffered ceiling: a slab at y (underside) with a grid of deep beams and bronze bosses. */
export function coffered(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, cell = 3, beamMat: MaterialId = 'timber_dark') {
  k.bmm('stone_dark', x0, y, z0, x1, y + 0.5, z1);
  for (let x = x0 + cell; x < x1 - 0.1; x += cell) k.bmm(beamMat, x - 0.18, y - 0.45, z0, x + 0.18, y, z1, { cast: false });
  for (let z = z0 + cell; z < z1 - 0.1; z += cell) k.bmm(beamMat, x0, y - 0.35, z - 0.15, x1, y, z + 0.15, { cast: false });
  for (let x = x0 + cell; x < x1 - 0.1; x += cell) for (let z = z0 + cell; z < z1 - 0.1; z += cell) {
    k.add('bronze', cyl(0.16, 0.2, 0.12, 8), { x, y: y - 0.57, z }, { cast: false });
  }
}

/** A clerk's counting desk: slanted top, ledgers, papers, candles and a stool. */
export function countingDesk(k: Kit, x: number, y: number, z: number, yaw: number, lit = true, col = true) {
  k.push(x, y, z, yaw);
  k.bmm('timber_dark', -0.85, 0, -0.4, 0.85, 0.72, 0.4, { cast: false });
  k.box('planks', 0, 0.86, 0.02, 1.8, 0.06, 0.86, { rx: 0.18, cast: false });
  k.box('timber_dark', 0, 1.05, -0.36, 1.8, 0.3, 0.1, { cast: false });
  k.pop();
  k.push(x, y, z, yaw);
  ledger(k, -0.4, 0.92, 0.05, 0.1, true);
  papers(k, 0.4, 0.9, 0.0, 3);
  if (lit) candles(k, 0.72, 1.2, -0.3, 2, 0.06);
  chair(k, 0, 0, 0.75, Math.PI);
  if (col) k.solid(-0.9, 0, -0.45, 0.9, 1.1, 0.45, 'wood');
  k.pop();
}

/** Wall of pigeon-holed ledger shelves (local front +Z). */
export function ledgerWall(k: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number) {
  k.push(x, y, z, yaw);
  k.bmm('timber_dark', -w / 2, 0, -0.4, w / 2, h, -0.3);
  const cols = Math.max(2, Math.round(w / 0.55)), rows = Math.max(2, Math.round(h / 0.45));
  for (let i = 0; i <= cols; i++) k.box('timber_dark', -w / 2 + (i * w) / cols, h / 2, -0.12, 0.05, h, 0.4, { cast: false });
  for (let j = 0; j <= rows; j++) k.box('timber_dark', 0, (j * h) / rows, -0.12, w, 0.05, 0.4, { cast: false });
  const mats: MaterialId[] = ['leather', 'leather_dark', 'parchment', 'cloth_red', 'leather'];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (k.rng.chance(0.18)) continue;
    const cx = -w / 2 + ((i + 0.5) * w) / cols, cy = ((j + 0.1) * h) / rows;
    const n = 2 + k.rng.int(0, 3);
    for (let b = 0; b < n; b++) k.box(k.rng.pick(mats), cx - 0.15 + b * 0.09, cy + 0.15, -0.1, 0.07, 0.3 + k.rng.range(-0.04, 0.06), 0.3, { rz: k.rng.range(-0.08, 0.08), cast: false });
  }
  k.pop();
}

/** Iron railing (visual posts + rail) along a line with a 1.1 m collider. */
export function railing(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, col = true) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    k.box('iron', x0 + (x1 - x0) * t, y + 0.5, z0 + (z1 - z0) * t, 0.05, 1.0, 0.05, { cast: false });
  }
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  k.box('iron', (x0 + x1) / 2, y + 1.02, (z0 + z1) / 2, 0.07, 0.07, L, { ry: yaw, cast: false });
  k.box('iron', (x0 + x1) / 2, y + 0.5, (z0 + z1) / 2, 0.04, 0.04, L, { ry: yaw, cast: false });
  if (col) k.solidC((x0 + x1) / 2, y + 0.6, (z0 + z1) / 2, 0.2, 1.2, L, [0, yaw, 0]);
}

/** Wall sconce at a point on a wall (front = direction the torch leans). */
export function sconce(k: Kit, x: number, y: number, z: number, yaw: number) { sconceTorch(k, x, y, z, yaw); }

/** Stepped, arched niche (for statues/tally boards) cut visually into a wall face. */
export function niche(k: Kit, x: number, y: number, z: number, yaw: number, w: number, h: number, kind: ArchKind = 'round') {
  k.push(x, y, z, yaw);
  const pts: [number, number][] = [[-w / 2, 0], [w / 2, 0], [w / 2, h], ...archPoints(-w / 2, w / 2, h, kind).reverse(), [-w / 2, h]];
  k.add('stone_dark', extrudeXY(pts, 0.06), { z: 0.03 }, { cast: false });
  k.pop();
}

export const DEG = Math.PI / 180;
export { THREE };
