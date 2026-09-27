/**
 * The tower of rejected futures: the shell (walls with every door and window, buttresses, string
 * courses, the crag plinth), five floors with their stairs, and each floor's fragment of a
 * discarded history. Every stair is a solid masonry flight against a wall (ramp collider), with a
 * parapet on its open side and a balustrade round the stairwell on the floor above.
 *
 *  F1  y 0   Hall of the Victory That Was — triumphal relief, victory banners over rows of coffins.
 *  F2  y 7   The Drowned Lecture Theatre — tiered benches, black water over the pit, lectern slate.
 *  F3  y 14  The Nameless Nave — pews, altar, hundreds of scraped name-plates; one is loose.
 *  F4  y 21  The Empty Vault — open coffers, balanced empty scales, a round vault door ajar.
 *  F5  y 28  The Coronation That Never Happened — dais, empty throne, seven empty chairs.
 */
import * as THREE from 'three';
import type { DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  Kit, wall, floor, stairs, column, buttress, stringCourse, candles, candelabrum, wallBanner, reliefPanel, bench, table,
  shelves, ledger, papers, desk, strongbox, coins, scales, brazier, sconceTorch, crate, barrel, cyl, sphere, cone, bellGeo, lathe,
  rubble, deg, bellPost, archPoints, extrudeXY, planarUV,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import { type BCtx, PLAN, newKit, anchor, slabWithHole, balustrade, YAW_N, YAW_S, YAW_E, YAW_W, box3 } from './levelCommon';

export interface TowerBuild { enemies: EnemySpawn[]; update: (t: number) => void }

const F = PLAN.floors;
const I = PLAN.I;

// ------------------------------------------------------------------ small props

function lectern(k: Kit, x: number, y: number, z: number, yaw: number, open = true) {
  k.push(x, y, z, yaw);
  k.box('timber_dark', 0, 0.05, 0, 0.7, 0.1, 0.6);
  k.box('timber_dark', 0, 0.55, 0, 0.18, 1.0, 0.18);
  k.box('timber_dark', 0, 1.1, 0.05, 0.75, 0.06, 0.5, { rx: -0.45 });
  if (open) {
    k.box('parchment', -0.17, 1.15, 0.07, 0.32, 0.02, 0.42, { rx: -0.45, rz: 0.04, cast: false });
    k.box('parchment', 0.17, 1.15, 0.07, 0.32, 0.02, 0.42, { rx: -0.45, rz: -0.04, cast: false });
  }
  k.solid(-0.4, 0, -0.35, 0.4, 1.2, 0.35);
  k.pop();
}

function coffin(k: Kit, x: number, y: number, z: number, yaw: number, draped: boolean) {
  k.push(x, y, z, yaw);
  k.box('stone_dark', 0, 0.2, 0, 0.9, 0.4, 2.3);
  k.box('timber_dark', 0, 0.62, 0, 0.72, 0.44, 2.05);
  k.box('timber_dark', 0, 0.87, 0, 0.8, 0.06, 2.12);
  if (draped) {
    k.box('cloth_red', 0, 0.91, 0, 0.84, 0.03, 1.6, { cast: false });
    k.box('cloth_red', 0.43, 0.72, 0, 0.02, 0.4, 1.6, { cast: false });
    k.box('cloth_red', -0.43, 0.72, 0, 0.02, 0.4, 1.6, { cast: false });
    k.box('gold_trim', 0, 0.94, 0.3, 0.3, 0.02, 0.4, { cast: false });
  } else k.box('bronze', 0, 0.92, 0.5, 0.28, 0.02, 0.18, { cast: false });
  k.solid(-0.46, 0, -1.16, 0.46, 0.95, 1.16);
  k.pop();
}

function throne(k: Kit, x: number, y: number, z: number, yaw: number) {
  k.push(x, y, z, yaw);
  k.box('stone_trim', 0, 0.25, 0, 1.6, 0.5, 1.3);
  k.box('gold_trim', 0, 0.62, 0.05, 1.3, 0.24, 1.0);
  k.box('cloth_red', 0, 0.76, 0.1, 1.1, 0.06, 0.8, { cast: false });
  k.box('gold_trim', 0, 1.9, -0.45, 1.3, 2.4, 0.22);
  k.add('gold_trim', cone(0.7, 1.1, 4), { y: 3.1, z: -0.45, ry: Math.PI / 4, s: [1, 1, 0.3] });
  k.box('cloth_red', 0, 1.6, -0.32, 0.9, 1.5, 0.04, { cast: false });
  for (const s of [-1, 1]) {
    k.box('gold_trim', s * 0.72, 1.0, 0.05, 0.16, 0.5, 1.0);
    k.add('gold_trim', sphere(0.1, 8, 6), { x: s * 0.72, y: 1.3, z: 0.5 });
    k.add('gold_trim', cone(0.08, 0.7, 6), { x: s * 0.72, y: 3.05, z: -0.45 });
  }
  k.solid(-0.85, 0, -0.6, 0.85, 3.0, 0.7);
  k.pop();
}

function chair(k: Kit, x: number, y: number, z: number, yaw: number) {
  k.push(x, y, z, yaw);
  k.box('timber_dark', 0, 0.45, 0, 0.6, 0.08, 0.55);
  k.box('timber_dark', 0, 1.1, -0.26, 0.6, 1.3, 0.08);
  k.box('cloth_blue', 0, 0.51, 0.02, 0.5, 0.04, 0.45, { cast: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) k.box('timber_dark', sx * 0.26, 0.22, sz * 0.23, 0.06, 0.44, 0.06, { cast: false });
  k.add('gold_trim', sphere(0.05, 6, 4), { y: 1.8, z: -0.26 }, { cast: false });
  k.solid(-0.3, 0, -0.3, 0.3, 1.1, 0.3);
  k.pop();
}

/** Tall iron candle stand with a warm light (registered, budgeted). */
function candleStand(k: Kit, x: number, y: number, z: number, light = true) {
  k.add('iron', cyl(0.04, 0.06, 1.4, 6), { x, y, z });
  k.add('iron', cyl(0.25, 0.25, 0.04, 8), { x, y: y + 1.4, z });
  candles(k, x, y + 1.42, z, 5, 0.14);
  if (light) k.light(0xffb070, 5, 9, x, y + 1.9, z, 0.6);
}

/** An iron ring chandelier hanging from the ceiling, candles round it, a warm light. */
function chandelier(k: Kit, x: number, y: number, z: number, r = 1.6, ceiling = 6.4) {
  k.add('iron', new THREE.TorusGeometry(r, 0.05, 6, 28).rotateX(Math.PI / 2), { x, y, z }, { cast: false });
  k.add('iron', new THREE.TorusGeometry(r * 0.55, 0.04, 6, 20).rotateX(Math.PI / 2), { x, y: y + 0.35, z }, { cast: false });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const len = ceiling - (y - Math.floor(y / 7) * 7);
    k.add('iron', cyl(0.015, 0.015, Math.max(0.5, len), 4), { x: x + Math.cos(a) * r * 0.5, y, z: z + Math.sin(a) * r * 0.5, rz: Math.cos(a) * 0.15, rx: Math.sin(a) * 0.15 }, { cast: false });
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; candles(k, x + Math.cos(a) * r, y + 0.03, z + Math.sin(a) * r, 1, 0.01); }
  k.light(0xffc080, 11, 17, x, y - 0.4, z, 0.4);
}

/** A window mullion + tracery in a wall opening (visual only). */
function mullion(k: Kit, x: number, y: number, z: number, yaw: number, h: number) {
  k.push(x, y, z, yaw);
  k.box('stone_trim', 0, h / 2, 0, 0.14, h, 0.3, { cast: false });
  k.box('stone_trim', 0, h * 0.62, 0, 1.25, 0.1, 0.28, { cast: false });
  k.pop();
}

// ------------------------------------------------------------------ the shell

/**
 * Colliders for a straight wall with passable gaps (u along the wall from its midpoint, y from
 * the ground). The kit's own wall colliders assume openings never share a column; the tower's west
 * wall stacks the postern and the ossuary door, so the shell builds its own.
 */
function wallCollider(k: Kit, x0: number, z0: number, x1: number, z1: number, h: number, t: number, gaps: { u0: number; u1: number; y0: number; y1: number }[]) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  k.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0));
  const cuts = [-len / 2, len / 2, ...gaps.flatMap((g) => [g.u0, g.u1])].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    if (b - a < 0.005) continue;
    const m = (a + b) / 2;
    const open = gaps.filter((g) => m > g.u0 && m < g.u1).sort((p, q) => p.y0 - q.y0);
    let y = 0;
    for (const g of open) { if (g.y0 - y > 0.01) k.solid(a - 0.01, y, -t / 2, b + 0.01, g.y0, t / 2); y = Math.max(y, g.y1); }
    if (h - y > 0.01) k.solid(a - 0.01, y, -t / 2, b + 0.01, h, t / 2);
  }
  k.pop();
}

/** Warm glowing panes in a wall's window openings (the Belfry is lit from within at night). */
function windowPanes(k: Kit, x0: number, z0: number, x1: number, z1: number, ops: { u: number; w: number; sill: number; h: number; kind?: string }[]) {
  k.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0));
  for (const o of ops) {
    if (o.sill <= 0.01 || o.kind !== 'pointed') continue;
    const xa = o.u - o.w / 2, xb = o.u + o.w / 2, ys = o.sill + o.h;
    const outline: [number, number][] = [[xa, o.sill], [xb, o.sill], [xb, ys], ...archPoints(xa, xb, ys, 'pointed').reverse(), [xa, ys]];
    const pane = extrudeXY(outline, 0.05);
    planarUV(pane, xa, o.sill, o.w, o.h + o.w * 0.87);
    k.add('window_warm', pane, undefined, { cast: false });
  }
  k.pop();
}

function shell(ctx: BCtx) {
  const k = newKit(ctx, 'tower.shell', 301);
  const H = PLAN.H, T = PLAN.T, top = PLAN.roof;
  const c = (H - T / 2);
  const win = (u: number, sill: number, w = 1.3, h = 2.3) => ({ u, sill, w, h, kind: 'pointed' as const });
  const floorsUp = [F[0], F[1], F[2], F[3], F[4]];
  // south: great door + windows
  const southOps = [{ u: 0, w: PLAN.greatDoor.w, sill: 0, h: PLAN.greatDoor.h, kind: 'round' as const }];
  for (const f of floorsUp) for (const u of [-8, 8]) southOps.push(win(u, f + 2.4) as never);
  wall(k, 'stone_wall', -H, c, H, c, 0, top, T, { openings: southOps, col: false });
  wallCollider(k, -H, c, H, c, top, T, [{ u0: -PLAN.greatDoor.w / 2, u1: PLAN.greatDoor.w / 2, y0: 0, y1: PLAN.greatDoor.h + PLAN.greatDoor.w / 2 }]);
  // north: windows; the coronation's great window behind the throne
  const northOps = [] as ReturnType<typeof win>[];
  for (const f of floorsUp) for (const u of [-7, 7]) northOps.push(win(u, f + 2.4));
  northOps.push({ u: 0, sill: F[4] + 2.0, w: 3.6, h: 3.0, kind: 'pointed' });
  wall(k, 'stone_wall', -H, -c, H, -c, 0, top, T, { openings: northOps, col: false });
  wallCollider(k, -H, -c, H, -c, top, T, []);
  // west (u measured along +z): postern, ossuary door (F3), windows
  const westOps = [{ u: PLAN.postern.z, w: PLAN.postern.w, sill: 0, h: PLAN.postern.h, kind: 'round' as const }] as { u: number; w: number; sill: number; h: number; kind?: 'round' | 'pointed' | 'flat' }[];
  westOps.push({ u: PLAN.ossuary.z, w: PLAN.ossuary.w, sill: F[2], h: PLAN.ossuary.h, kind: 'flat' });
  for (const f of floorsUp) { westOps.push(win(-11.5, f + 2.4)); if (f !== F[0] && f !== F[2]) westOps.push(win(11.2, f + 2.4)); }
  wall(k, 'stone_wall', -c, -I, -c, I, 0, top, T, { openings: westOps as never, col: false });
  wallCollider(k, -c, -I, -c, I, top, T, [
    { u0: PLAN.postern.z - PLAN.postern.w / 2, u1: PLAN.postern.z + PLAN.postern.w / 2, y0: 0, y1: PLAN.postern.h + PLAN.postern.w / 2 },
    { u0: PLAN.ossuary.z - PLAN.ossuary.w / 2, u1: PLAN.ossuary.z + PLAN.ossuary.w / 2, y0: F[2], y1: F[2] + PLAN.ossuary.h },
  ]);
  // east: balcony door (F5), windows
  const eastOps = [{ u: PLAN.balcony.z, w: PLAN.balcony.w, sill: F[4], h: PLAN.balcony.h, kind: 'round' as const }] as { u: number; w: number; sill: number; h: number; kind?: 'round' | 'pointed' | 'flat' }[];
  for (const f of floorsUp) { eastOps.push(win(-11.2, f + 2.4)); if (f !== F[4]) eastOps.push(win(11.6, f + 2.4)); }
  wall(k, 'stone_wall', c, -I, c, I, 0, top, T, { openings: eastOps as never, col: false });
  wallCollider(k, c, -I, c, I, top, T, [{ u0: PLAN.balcony.z - PLAN.balcony.w / 2, u1: PLAN.balcony.z + PLAN.balcony.w / 2, y0: F[4], y1: F[4] + PLAN.balcony.h + PLAN.balcony.w / 2 }]);
  // thresholds under the doors cut to the floor
  floor(k, 'flagstone', -PLAN.greatDoor.w / 2 - 0.1, I - 0.05, PLAN.greatDoor.w / 2 + 0.1, H + 0.05, 0, 0.6);
  floor(k, 'flagstone', -H - 0.05, PLAN.postern.z - PLAN.postern.w / 2 - 0.1, -I + 0.05, PLAN.postern.z + PLAN.postern.w / 2 + 0.1, 0, 0.6);
  windowPanes(k, -H, c, H, c, southOps);
  windowPanes(k, -H, -c, H, -c, northOps);
  windowPanes(k, -c, -I, -c, I, westOps);
  windowPanes(k, c, -I, c, I, eastOps);
  // mullions in every window (outer face)
  for (const f of floorsUp) {
    for (const u of [-8, 8]) mullion(k, u, f + 2.4, H - 0.2, 0, 2.3 + 1.1);
    for (const u of [-7, 7]) mullion(k, u, f + 2.4, -H + 0.2, Math.PI, 2.3 + 1.1);
  }
  // string courses at each floor, plinth, corbelled cornice
  for (const f of [F[1], F[2], F[3], F[4]]) stringCourse(k, -H, -H, H, H, f - 0.35, 0.3, 0.18);
  stringCourse(k, -H, -H, H, H, top - 0.6, 0.45, 0.3);
  k.bmm('stone_dark', -H - 0.6, -26, -H - 0.6, H + 0.6, -0.62, H + 0.6, { cast: false });
  k.bmm('stone_trim', -H - 0.7, -0.4, -H - 0.7, H + 0.7, 0.3, -H + 0.2, { cast: false });
  // buttresses: corners (both faces) and mid-faces, stepped
  for (const [x, z, yaw] of [
    [-H, -H, YAW_N], [H, -H, YAW_N], [-H, -H, YAW_W], [-H, H, YAW_W], [H, -H, YAW_E], [H, H, YAW_E], [-H, H, YAW_S], [H, H, YAW_S],
  ] as [number, number, number][]) {
    const off = 0.6;
    const bx = x + (yaw === YAW_W ? 0 : yaw === YAW_E ? 0 : (x < 0 ? off : -off));
    const bz = z + (yaw === YAW_N || yaw === YAW_S ? 0 : (z < 0 ? off : -off));
    buttress(k, 'stone_wall', bx, 0, bz, yaw, top - 3, 1.6, 1.3);
  }
  for (const [x, z, yaw] of [[-5.5, -H, YAW_N], [5.5, -H, YAW_N], [-4.5, H, YAW_S], [4.5, H, YAW_S], [-H, -4, YAW_W], [-H, 2, YAW_W]] as [number, number, number][]) buttress(k, 'stone_wall', x, 0, z, yaw, top - 6, 1.2, 1.0);
  // great door surround: jambs, voussoirs, a tympanum relief of the bells
  k.bmm('stone_trim', -2.6, 0, H - 0.1, -2.2, 4.1, H + 0.35, { cast: false });
  k.bmm('stone_trim', 2.2, 0, H - 0.1, 2.6, 4.1, H + 0.35, { cast: false });
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10);
    const x = Math.cos(a) * 2.45, y = 4.1 + Math.sin(a) * 2.45;
    k.box('stone_trim', x, y, H + 0.12, 0.55, 0.4, 0.5, { rz: a - Math.PI / 2, cast: false });
  }
  for (let i = 0; i < 5; i++) k.add('bronze_bell', bellGeo(0.55, 12), { x: -1.6 + i * 0.8, y: 7.2, z: H + 0.25 }, { cast: false });
  return k;
}

// ------------------------------------------------------------------ stairs between floors

/** East-lane flight: from (south end, y0) north to the stairwell top at y0+7. */
function stairEast(k: Kit, y0: number) {
  const [x0, x1] = PLAN.laneE, xm = (x0 + x1) / 2;
  stairs(k, 'stone_wall', [xm, y0, PLAN.stairS], [xm, y0 + 7, PLAN.stairN], x1 - x0, { baseY: y0 });
  stairParapet(k, x0 - 0.15, PLAN.stairS, PLAN.stairN, y0);
  stairFill(k, x0, x1, PLAN.stairS, PLAN.stairN, y0);
}
/** West-lane flight: from (north end, y0) south to the stairwell top at y0+7. */
function stairWest(k: Kit, y0: number) {
  const [x0, x1] = PLAN.laneW, xm = (x0 + x1) / 2;
  stairs(k, 'stone_wall', [xm, y0, -PLAN.stairS], [xm, y0 + 7, -PLAN.stairN], x1 - x0, { baseY: y0 });
  stairParapet(k, x1 + 0.15, -PLAN.stairS, -PLAN.stairN, y0);
  stairFill(k, x0, x1, -PLAN.stairS, -PLAN.stairN, y0);
}
/** Colliders filling the void under a solid flight (so nothing walks into the masonry). */
export function stairFill(k: Kit, x0: number, x1: number, zLow: number, zHigh: number, y0: number, rise = 7) {
  const n = 8;
  for (let i = 1; i < n; i++) {
    const za = zLow + ((zHigh - zLow) * i) / n, zb = zLow + ((zHigh - zLow) * (i + 1)) / n;
    k.solid(x0, y0, Math.min(za, zb), x1, y0 + (rise * i) / n - 0.35, Math.max(za, zb));
  }
}

/** Inner parapet along a flight (visual + collider), rising with the steps. */
function stairParapet(k: Kit, x: number, zLow: number, zHigh: number, y0: number) {
  const run = Math.abs(zHigh - zLow), ang = Math.atan2(7, run);
  const len = Math.hypot(run, 7);
  const zm = (zLow + zHigh) / 2, dir = Math.sign(zHigh - zLow);
  // tilted coping + wall face under it
  k.box('stone_trim', x, y0 + 3.5 + 1.0, zm, 0.34, 0.14, len, { rx: dir > 0 ? -ang : ang, cast: false });
  k.box('stone_wall', x, y0 + 3.5 + 0.45, zm, 0.3, 1.0, len, { rx: dir > 0 ? -ang : ang });
  const n = 8;
  for (let i = 0; i < n; i++) {
    const f0 = i / n, f1 = (i + 1) / n;
    const za = zLow + (zHigh - zLow) * f0, zb = zLow + (zHigh - zLow) * f1;
    const ya = y0 + 7 * f0;
    k.solid(x - 0.2, ya, Math.min(za, zb), x + 0.2, ya + 7 / n + 1.3, Math.max(za, zb));
  }
  // the lane is a solid mass on the wall side: dress its open face
  k.box('stone_dark', x + (x > 0 ? 1.6 : -1.6) * 0, y0 + 0.05, zm, 0.04, 0.1, run, { cast: false });
}

// ------------------------------------------------------------------ the floors

export function buildTower(ctx: BCtx): TowerBuild {
  const enemies: EnemySpawn[] = [];
  const e = (id: string, kind: string, x: number, y: number, z: number, yaw: number, extra: Partial<EnemySpawn> = {}) => enemies.push({ id, kind, anchor: anchor(x, y, z, yaw), leash: 16, ...extra });
  const holeE: [number, number, number, number] = [PLAN.laneE[0] - 0.2, PLAN.stairN, I, PLAN.stairS + 1.0];
  const holeW: [number, number, number, number] = [-I, -PLAN.stairS - 1.0, PLAN.laneW[1] + 0.2, -PLAN.stairN];
  shell(ctx);

  // ================================================================ F1 — Hall of the Victory That Was
  {
    const y = F[0];
    const k = newKit(ctx, 'tower.f1', 311, y);
    floor(k, 'flagstone', -I, -I, I, I, y, 0.6);
    k.box('cloth_red', 0, y + 0.02, 0, 3.0, 0.02, 24, { cast: false }); // processional carpet
    stairEast(k, y);
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) column(k, 'stone_wall', x, y, z, 6.4, 0.55);
    chandelier(k, 0, y + 4.6, 0, 1.8); chandelier(k, 0, y + 4.8, -8.5, 1.2);
    // triumphal relief on the north wall, twin reliefs of the same victory
    reliefPanel(k, -4.5, y + 2.2, -I + 0.15, 0, 5.2, 2.6);
    reliefPanel(k, 4.5, y + 2.2, -I + 0.15, 0, 5.2, 2.6);
    for (const x of [-10, 10]) wallBanner(k, x, y + 5.8, -I + 0.1, 0, 1.6, 4.2);
    for (const z of [-9, -2, 5]) { wallBanner(k, -I + 0.1, y + 5.8, z, YAW_E, 1.4, 3.8); }
    // rows of draped coffins under the victory banners (they all died on the day of the triumph)
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) coffin(k, -10.5 + i * 2.1, y, -8 + row * 4.2, 0, (row + i) % 3 !== 0);
    for (let i = 0; i < 3; i++) coffin(k, 3.5 + i * 2.1, y, -9.5, 0, true);
    lectern(k, 0, y, -10.4, 0);
    ctx.anchors.record1 = anchor(0, y, -9.2, YAW_N);
    for (const [x, z] of [[-2.2, -10.4], [2.2, -10.4], [-8, 11], [8, 11], [-12, -12], [11.5, -1]]) candleStand(k, x, y, z, Math.abs(z) > 5 || x === -2.2);
    brazier(k, -3, y, 9.5, true, 0.9);
    k.light(0xff9a50, 7, 12, -3, y + 1.8, 9.5, 0.8);
    rubble(k, 10, y, 11.5, 0.8, false);
    crate(k, -12.3, y, 11.8, 0.3, 0.8, true);
    barrel(k, -12.6, y, 10.6, 0, true);
    // loot nook behind the last row of coffins
    ctx.anchors.nookF1 = anchor(-12.6, y, -12.4, YAW_N);
    papers(k, -12.5, y + 0.02, -12.8, 3);
    // the great door (barred from within; a persistent shortcut back to the foot)
    ctx.pieces.greatDoor = greatDoor(ctx, 0, y, PLAN.H - PLAN.T / 2);
    ctx.anchors.greatDoorIn = anchor(0, y, 11.8, YAW_S);
    ctx.anchors.greatDoorOut = anchor(0, y, 17.2, YAW_N);
    ctx.anchors.posternIn = anchor(-12.4, y, PLAN.postern.z, YAW_E);
    e('bf_f1_inf1', 'infantry', -5.5, y, 2.5, YAW_W, { patrol: [new THREE.Vector3(-5.5, y, 2.5), new THREE.Vector3(-5.5, y, -11.5)] });
    e('bf_f1_inf2', 'infantry', 7.5, y, -6, YAW_W);
    e('bf_f1_shield', 'shieldBearer', 1.5, y, -7.2, YAW_S);
    e('bf_f1_echo', 'keeperEcho', 8.5, y, 8.5, YAW_W);
  }

  // ================================================================ F2 — The Drowned Lecture Theatre
  {
    const y = F[1];
    const k = newKit(ctx, 'tower.f2', 321, y);
    slabWithHole(k, 'planks', y, holeE);
    balustrade(k, holeE[0], holeE[1], holeE[0], holeE[3], y);
    balustrade(k, holeE[0], holeE[3], I, holeE[3], y);
    stairWest(k, y);
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) column(k, 'stone_wall', x, y, z, 6.4, 0.5);
    chandelier(k, 0, y + 4.6, 0, 1.8); chandelier(k, 0, y + 4.8, -8.5, 1.2);
    // tiered benches rising toward the south in arcs around the lectern (not walkable: benches block)
    const lc = new THREE.Vector3(0, y, -10.6);
    for (let row = 0; row < 4; row++) {
      const r = 6 + row * 2.2;
      const n = 6 + row * 2;
      for (let i = 0; i < n; i++) {
        const a = deg(35) + (deg(110) * i) / (n - 1);
        const x = lc.x + Math.cos(a) * r, z = lc.z + Math.sin(a) * r;
        if (x > 9.6 || x < -9.6 || z > 12.5) continue;
        k.push(x, y, z, Math.atan2(lc.x - x, lc.z - z));
        k.box('timber_dark', 0, 0.2 + row * 0.12, 0, 1.6, 0.4 + row * 0.24, 0.5);
        k.box('planks', 0, 0.44 + row * 0.24, -0.35, 1.6, 0.06, 0.5, { cast: false });
        k.solid(-0.8, 0, -0.6, 0.8, 0.5 + row * 0.24, 0.25);
        k.pop();
      }
    }
    // the drowned pit: black still water over the lowest tier and the lecture floor
    const water = new THREE.Mesh(new THREE.CircleGeometry(7.2, 40, deg(20), deg(140)).rotateX(-Math.PI / 2), getMaterial('water'));
    water.position.set(lc.x, y + 0.14, lc.z);
    water.receiveShadow = true;
    k.group.add(water);
    for (let i = 0; i < 7; i++) papers(k, -4 + i * 1.3, y + 0.16, -6 + (i % 3) * 1.4, 2);
    lectern(k, lc.x, y, lc.z + 0.6, 0);
    // the lecturer's slate on an easel
    k.box('timber_dark', 3.2, y + 1.1, -11.4, 0.1, 2.2, 0.1, { rz: 0.1 });
    k.box('timber_dark', 4.8, y + 1.1, -11.4, 0.1, 2.2, 0.1, { rz: -0.1 });
    k.box('stone_dark', 4.0, y + 1.6, -11.3, 1.9, 1.2, 0.06);
    k.box('unlived_crack', 4.0, y + 1.55, -11.26, 1.6, 0.02, 0.01, { rz: 0.2, cast: false });
    ctx.anchors.record2 = anchor(4.0, y, -10.0, YAW_N);
    shelves(k, -12.9, y, -10, YAW_E, 3, 3.4);
    shelves(k, -12.9, y, 6, YAW_E, 3, 3.4);
    shelves(k, 12.9, y, -9.5, YAW_W, 3, 3.4);
    desk(k, -9, y, -12, 0);
    ledger(k, -9, y + 0.82, -12, 0, true);
    ctx.anchors.nookF2 = anchor(-9, y, -10.9, YAW_N);
    for (const [x, z] of [[-3, -12.5], [3, -12.5], [-11, 11], [9, 11]]) candleStand(k, x, y, z);
    // glass lenses hanging from the ceiling, a relic of the Academy's experiments
    for (let i = 0; i < 5; i++) k.add('glass', sphere(0.35, 10, 8), { x: -6 + i * 3, y: y + 5.2 - (i % 2) * 0.5, z: -3 }, { cast: false });
    e('bf_f2_ringer1', 'bellRinger', -6.5, y, 9.5, YAW_N);
    e('bf_f2_ringer2', 'bellRinger', 6.5, y, 9.5, YAW_N);
    e('bf_f2_echo', 'keeperEcho', 0, y, -5, YAW_E);
    e('bf_f2_inf', 'infantry', -11.2, y, 7, YAW_S);
  }

  // ================================================================ F3 — The Nameless Nave
  {
    const y = F[2];
    const k = newKit(ctx, 'tower.f3', 331, y);
    slabWithHole(k, 'flagstone', y, holeW);
    balustrade(k, holeW[2], holeW[1], holeW[2], holeW[3], y);
    balustrade(k, -I, holeW[1], holeW[2], holeW[1], y);
    stairEast(k, y);
    for (const [x, z] of [[-5, -8], [5, -8], [-5, 0], [5, 0], [-5, 8], [5, 8]]) column(k, 'stone_wall', x, y, z, 6.4, 0.45);
    chandelier(k, 0, y + 4.6, 0, 1.8); chandelier(k, 0, y + 4.8, -8.5, 1.2);
    // pews in two blocks with a central aisle
    for (let r = 0; r < 6; r++) for (const s of [-1, 1]) {
      const z = -5 + r * 2.1;
      bench(k, s * 3.2, y, z, 0, 3.4);
      k.box('timber_dark', s * 3.2, y + 0.9, z + 0.3, 3.4, 0.8, 0.08);
      k.solid(s * 3.2 - 1.75, y, z - 0.35, s * 3.2 + 1.75, y + 1.0, z + 0.4);
    }
    // altar and its register
    k.bmm('stone_trim', -3, y, -12.6, 3, y + 0.3, -9.6, { col: true });
    k.bmm('stone_wall', -1.6, y + 0.3, -12, 1.6, y + 1.2, -10.8, { col: true });
    k.box('cloth_linen', 0, y + 1.22, -11.4, 3.3, 0.03, 1.3, { cast: false });
    ledger(k, 0, y + 1.24, -11.3, 0, true);
    candelabrum(k, -1.3, y + 1.22, -11.6, 5);
    candelabrum(k, 1.3, y + 1.22, -11.6, 5);
    k.light(0xffb870, 8, 12, 0, y + 2.2, -10.8, 0.5);
    ctx.anchors.record3 = anchor(0, y + 0.3, -9.4, YAW_N);
    // hundreds of bronze name-plates on the walls, every one scraped blank (instanced)
    const plate = () => new THREE.BoxGeometry(0.42, 0.24, 0.03);
    for (const side of [0, 1, 2, 3]) {
      for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) {
        const u = -12.5 + i * 1.0, h = y + 1.2 + row * 0.5;
        if (side === 3 && Math.abs(u - PLAN.ossuary.z) < 1.3 && h < y + PLAN.ossuary.h + 0.2) continue; // the loose plate's door
        if ((side === 1 || side === 3) && u > -9.8 && u < 3.6 && side === 3) continue; // behind the west stair
        if (side === 1 && u > -3.6 && u < 9.2) continue; // behind the east stair
        const t = [
          { x: u, z: -I + 0.02, yaw: 0 }, { x: I - 0.02, z: u, yaw: YAW_W }, { x: u, z: I - 0.02, yaw: Math.PI }, { x: -I + 0.02, z: u, yaw: YAW_E },
        ][side];
        if (side === 2 && Math.abs(u) < 3) continue;
        k.inst('bf_plate', plate, 'bronze', { x: t.x, y: h, z: t.z, ry: t.yaw }, false);
      }
    }
    // the loose plate that bears a name: a panel of plates that swings back (secret to the Branding Cell)
    ctx.pieces.ossuaryDoor = ossuaryDoor(ctx, -PLAN.H + PLAN.T / 2, y, PLAN.ossuary.z);
    ctx.anchors.ossuaryIn = anchor(-I + 1.3, y, PLAN.ossuary.z, YAW_W);
    for (const [x, z] of [[-11, 12], [11, 12], [-11, -12], [11, -12]]) candleStand(k, x, y, z);
    bellPost(k, -6.5, y, 9.5, YAW_S);
    e('bf_f3_warden', 'bellWarden', 0, y, -2.5, YAW_S);
    e('bf_f3_inf', 'infantry', -8, y, -8, YAW_E, { patrol: [new THREE.Vector3(-8, y, -8), new THREE.Vector3(-8, y, 10)] });
    e('bf_f3_ringer', 'bellRinger', 7.5, y, -11, YAW_S);
    e('bf_f3_echo', 'keeperEcho', 8.5, y, 5.5, YAW_W);
  }

  // ================================================================ F4 — The Empty Vault
  {
    const y = F[3];
    const k = newKit(ctx, 'tower.f4', 341, y);
    slabWithHole(k, 'flagstone', y, holeE);
    balustrade(k, holeE[0], holeE[1], holeE[0], holeE[3], y);
    balustrade(k, holeE[0], holeE[3], I, holeE[3], y);
    stairWest(k, y);
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) column(k, 'stone_dark', x, y, z, 6.4, 0.6);
    chandelier(k, 0, y + 4.6, 0, 1.8); chandelier(k, 0, y + 4.8, -8.5, 1.2);
    // the round vault door, standing open against the north wall
    k.push(3.5, y, -12.8, 0);
    k.add('iron', cyl(2.2, 2.2, 0.5, 28).rotateX(Math.PI / 2), { y: 2.4, x: -3.2, z: 0.6, ry: 1.2 });
    k.add('bronze', cyl(0.5, 0.5, 0.2, 16).rotateX(Math.PI / 2), { y: 2.4, x: -3.0, z: 1.0, ry: 1.2 }, { cast: false });
    k.bmm('stone_trim', -2.8, 0, -0.6, 2.8, 5.2, 0.4, { col: true });
    k.bmm('stone_dark', -2.0, 0.2, 0.4, 2.0, 4.6, 0.45, { cast: false });
    k.pop();
    // open, empty coffers along the walls; balanced scales weighing nothing
    for (let i = 0; i < 6; i++) strongbox(k, -11.5 + i * 2.2, y, 12.6, Math.PI, 1.2, true);
    for (let i = 0; i < 4; i++) strongbox(k, 12.6, y, -12 + i * 2.2, YAW_W, 1.1, true);
    scales(k, 0, y + 0.85, 0, 0);
    table(k, 0, y, 0, 0, 2.2, 1.1, 0.85, true, 'timber_dark');
    coins(k, -0.8, y + 0.86, 0.2, 3);
    desk(k, -6.5, y, -11.8, 0);
    ledger(k, -6.5, y + 0.82, -11.8, 0, true);
    ctx.anchors.record4 = anchor(-6.5, y, -10.6, YAW_N);
    // grille-fronted coffer niche (NW): the loot is behind the bars, reached around the side
    k.bmm('iron', -I, y, -10.3, -10.6, y + 2.6, -10.2, { col: true });
    strongbox(k, -12.5, y, -12.5, YAW_E, 1.2, true);
    ctx.anchors.nookF4 = anchor(-11.3, y, -12.4, YAW_W);
    for (const [x, z] of [[-3, -12], [8, -12], [-11, 3], [3, 11], [11, 6]]) candleStand(k, x, y, z);
    e('bf_f4_warden', 'bellWarden', -2, y, 3.5, YAW_E);
    e('bf_f4_echo1', 'keeperEcho', 6.5, y, -8.5, YAW_S);
    e('bf_f4_echo2', 'keeperEcho', -8.5, y, 7.5, YAW_E);
    e('bf_f4_sentry', 'sentry', -12.4, y, 6.5, YAW_W, { idleAnim: 'sentryWall' });
  }

  // ================================================================ F5 — The Coronation That Never Happened
  let throneRecord: DynamicPiece | null = null;
  {
    const y = F[4];
    const k = newKit(ctx, 'tower.f5', 351, y);
    slabWithHole(k, 'flagstone', y, holeW);
    balustrade(k, holeW[2], holeW[1], holeW[2], holeW[3], y);
    balustrade(k, -I, holeW[1], holeW[2], holeW[1], y);
    // F5 → Crown: along the south wall, eastward
    const [sx0, sx1] = PLAN.crownStairX, [lz0, lz1] = PLAN.laneS, zm = (lz0 + lz1) / 2;
    stairs(k, 'stone_wall', [sx0, y, zm], [sx1, y + 7, zm], lz1 - lz0, { baseY: y });
    for (let i = 1; i < 8; i++) { const xa = sx0 + ((sx1 - sx0) * i) / 8; k.solid(xa, y, lz0, xa + (sx1 - sx0) / 8, y + (7 * i) / 8 - 0.35, lz1); }
    {
      // inner parapet (north side of the flight)
      const run = sx1 - sx0, ang = Math.atan2(7, run), len = Math.hypot(run, 7), xm = (sx0 + sx1) / 2;
      k.box('stone_wall', xm, y + 3.5 + 0.45, lz0 - 0.15, len, 1.0, 0.3, { rz: ang });
      k.box('stone_trim', xm, y + 3.5 + 1.0, lz0 - 0.15, len, 0.14, 0.34, { rz: ang, cast: false });
      for (let i = 0; i < 8; i++) { const xa = sx0 + (run * i) / 8; k.solid(xa, y + (7 * i) / 8, lz0 - 0.35, xa + run / 8, y + (7 * (i + 1)) / 8 + 1.3, lz0 + 0.05); }
    }
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 4], [6, 4]]) column(k, 'stone_trim', x, y, z, 6.4, 0.5);
    chandelier(k, 0, y + 4.6, 0, 1.8); chandelier(k, 0, y + 4.8, -8.5, 1.2);
    // dais and throne; carpet; seven empty chairs of the council facing it
    k.bmm('stone_trim', -4, y, -I, 4, y + 0.2, -9.2, { col: true });
    k.bmm('stone_trim', -3.2, y + 0.2, -I, 3.2, y + 0.4, -10.2, { col: true });
    k.box('cloth_red', 0, y + 0.41, -11.6, 2.4, 0.02, 2.6, { cast: false });
    throne(k, 0, y + 0.4, -12.3, 0);
    k.add('gold_trim', new THREE.TorusGeometry(0.16, 0.035, 6, 16).rotateX(Math.PI / 2), { x: 1.6, y: y + 1.12, z: -11 }, { cast: false });
    k.box('cloth_red', 1.6, y + 0.98, -11, 0.5, 0.1, 0.5);
    k.add('stone_trim', cyl(0.18, 0.22, 0.58, 8), { x: 1.6, y: y + 0.4, z: -11 });
    k.box('cloth_red', 0, y + 0.02, 0, 2.4, 0.02, 20, { cast: false });
    for (let i = 0; i < 7; i++) {
      const a = deg(-60) + (deg(120) * i) / 6;
      const x = Math.sin(a) * 6.5, z = -6.5 + Math.cos(a) * 3.2;
      chair(k, x, y, z, Math.atan2(0 - x, -12 - z));
    }
    for (const x of [-9, 9]) wallBanner(k, x, y + 5.9, -I + 0.1, 0, 1.8, 4.8);
    wallBanner(k, I - 0.1, y + 5.9, -4, YAW_W, 1.5, 4.2);
    wallBanner(k, -I + 0.1, y + 5.9, 8, YAW_E, 1.5, 4.2);
    for (const [x, z] of [[-3.5, -9.6], [3.5, -9.6], [-11, 11], [11, 11], [11, -3]]) candleStand(k, x, y, z);
    ctx.anchors.record5 = anchor(0, y, -8.6, YAW_N);
    throneRecord = throneRecordPiece(ctx, 0, y + 0.4, -12.3);
    ctx.pieces.throneRecord = throneRecord;
    // the seven councillors' places (spectral NPCs appear here once the record is laid)
    for (let i = 0; i < 7; i++) {
      const a = deg(-60) + (deg(120) * i) / 6;
      const x = Math.sin(a) * 6.5, z = -6.5 + Math.cos(a) * 3.2;
      ctx.anchors['council' + i] = anchor(x + Math.sin(Math.atan2(-x, -12 - z)) * 0.6, y, z + Math.cos(Math.atan2(-x, -12 - z)) * 0.6, Math.atan2(-x, -12 - z));
    }
    ctx.anchors.balconyIn = anchor(I - 1.2, y, PLAN.balcony.z, YAW_E);
    e('bf_f5_echo1', 'keeperEcho', -4, y, -7.8, YAW_S);
    e('bf_f5_echo2', 'keeperEcho', 4, y, -7.8, YAW_S);
    e('bf_f5_ringer', 'bellRinger', 0, y, 3.5, YAW_W);
    e('bf_f5_shield', 'shieldBearer', -7, y, 8.5, YAW_S);
  }

  // ================================================================ roof slab (top of the tower)
  {
    const k = newKit(ctx, 'tower.roof', 361, PLAN.roof);
    const y = PLAN.roof;
    const [sx0, sx1] = PLAN.crownStairX;
    slabWithHole(k, 'flagstone', y, [sx0 - 0.5, PLAN.laneS[0] - 0.2, sx1, I]);
  }

  // triggers: memories on arriving at each floor (the region plays them once)
  ctx.triggers.f1 = box3(-I, 0, -I, I, 5, I);
  ctx.triggers.f2 = box3(-I, 7, -I, I, 12, I);
  ctx.triggers.f3 = box3(-I, 14, -I, I, 19, I);
  ctx.triggers.f4 = box3(-I, 21, -I, I, 26, I);
  ctx.triggers.f5 = box3(-I, 28, -I, I, 33, I);

  return { enemies, update: () => {} };
}

// ------------------------------------------------------------------ dynamic pieces

/** The Great Door: two oak leaves barred from within. set(1) = bar lifted, leaves swung inward. */
function greatDoor(ctx: BCtx, x: number, y: number, z: number): DynamicPiece & { anchor: ReturnType<typeof anchor> } {
  const root = new THREE.Group();
  root.name = 'greatDoor';
  ctx.dynamicRoot.add(root);
  const wood = getMaterial('planks'), iron = getMaterial('iron');
  const W = PLAN.greatDoor.w, Hh = PLAN.greatDoor.h;
  const leaves: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(x + s * W / 2, y, z - 0.2);
    const shape = new THREE.Shape();
    const w = W / 2;
    // leaf outline in hinge space: from the hinge (x=0) toward the middle (x = -s*w), round top
    shape.moveTo(0, 0); shape.lineTo(-s * w, 0); shape.lineTo(-s * w, Hh + w);
    for (let i = 7; i >= 0; i--) { const xc = s * w * (1 - i / 8); shape.lineTo(xc - s * w, Hh + Math.sqrt(Math.max(0, w * w - xc * xc))); }
    shape.lineTo(0, Hh);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
    g.translate(0, 0, -0.11);
    const leaf = new THREE.Mesh(g, wood);
    leaf.castShadow = true;
    hinge.add(leaf);
    for (const hy of [0.8, 2.2, 3.6]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.12, 0.26), iron);
      band.position.set(-s * w * 0.48, hy, 0);
      hinge.add(band);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 12), iron);
    ring.position.set(-s * (w - 0.35), 1.6, -0.14);
    hinge.add(ring);
    root.add(hinge);
    leaves.push(hinge);
  }
  // the bar across the inside, in iron brackets
  const bar = new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 0.28, 0.26), getMaterial('timber_dark'));
  bar.position.set(x, y + 1.7, z - 0.52);
  bar.castShadow = true;
  root.add(bar);
  for (const s of [-1, 1]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.4), iron);
    br.position.set(x + s * (W / 2 + 0.25), y + 1.7, z - 0.45);
    root.add(br);
  }
  const col = ctx.shared.collision?.addDynamicBox('belfry:greatDoor', [W, 6.4, 0.5], 'wood');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + 3.2, z));
  const piece = {
    object: root, collider: col, anchor: anchor(x, y, z - 2.6, YAW_S),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const barT = Math.min(1, e / 0.3), swing = Math.max(0, (e - 0.3) / 0.7);
      bar.position.y = y + 1.7 + barT * 1.2;
      bar.visible = barT < 0.999;
      leaves.forEach((h, i) => { h.rotation.y = (i === 0 ? -1 : 1) * swing * 1.45; });
      if (col) col.enabled = e < 0.6;
    },
  };
  piece.set(0);
  return piece;
}

/** The panel of name-plates around the loose plate: it sinks into the floor (set(1) = open). */
function ossuaryDoor(ctx: BCtx, x: number, y: number, z: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'ossuaryDoor';
  ctx.dynamicRoot.add(root);
  const w = PLAN.ossuary.w, h = PLAN.ossuary.h;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(PLAN.T * 0.8, h, w), getMaterial('stone_wall'));
  slab.castShadow = true;
  const plates = new THREE.Group();
  const bronze = getMaterial('bronze');
  for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.42), bronze);
    p.position.set(PLAN.T * 0.4 + 0.02, -h / 2 + 0.5 + r * 0.5, -0.5 + i * 0.5);
    plates.add(p);
  }
  // the one plate that still bears a name glows faintly
  const named = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.44), getMaterial('bell_light'));
  named.position.set(PLAN.T * 0.4 + 0.03, -h / 2 + 1.0, 0);
  plates.add(named);
  const g = new THREE.Group();
  g.add(slab, plates);
  g.position.set(x, y + h / 2, z);
  root.add(g);
  const col = ctx.shared.collision?.addDynamicBox('belfry:ossuaryDoor', [PLAN.T, h, w], 'stone');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + h / 2, z));
  const piece: DynamicPiece = {
    object: root, collider: col,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      g.position.y = y + h / 2 - e * (h + 0.05);
      g.visible = e < 0.999;
      if (col) col.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** The full record laid on the throne; the council's candles lit (set(1)). */
function throneRecordPiece(ctx: BCtx, x: number, y: number, z: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'throneRecord';
  ctx.dynamicRoot.add(root);
  const book = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.46), getMaterial('bronze'));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.42), getMaterial('parchment'));
  pages.position.y = 0.06;
  book.add(cover, pages);
  book.position.set(x, y + 0.42, z + 0.15);
  book.rotation.y = 0.2;
  root.add(book);
  const glow = new THREE.PointLight(0xffe0a8, 0, 7, 2);
  glow.position.set(x, y + 1.4, z + 0.8);
  root.add(glow);
  registerLight(glow);
  const candleMat = getMaterial('bell_light');
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), candleMat);
    m.position.set(x + Math.cos(a) * 2.8, y - 0.35 + 0.08, z + 2.6 + Math.sin(a) * 1.4);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), getMaterial('wax'));
    stick.position.set(m.position.x, m.position.y - 0.2, m.position.z);
    root.add(m, stick);
    flames.push(m);
  }
  const piece: DynamicPiece = {
    object: root,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      book.visible = e > 0.01;
      glow.intensity = 6 * e;
      flames.forEach((f, i) => { f.visible = e > i / 14; });
    },
  };
  piece.set(0);
  return piece;
}

