/**
 * Servants' Yard (entry Stillbell), the Parterre (grand avenue, statues, fountain, autumn beds),
 * the Mourning Maze (tall hedges grown over the Elder Claim's graves; gazebo; the Greyford
 * colour), the Palace Terrace and the palace's garden facade with the PORTCULLIS (shortcut).
 *
 * The maze is a seeded perfect maze on a 3.75 m grid (8 × 12 cells) with a few extra openings for
 * loops, a 2×2 gazebo court in the middle and a walled grave corner in the north-west. Its grid is
 * exported so the traversal test can path through it.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  wall, floor, stairs, bellPost, barrel, crate, crateStack, sack, cart, well, laundryLine, bench, headstone, standardBanner,
  brazier, bracketLantern, crenellation, buttress, stillbellShrine, type StillbellShrine, bucket, trough, rubble, archway, cyl,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import {
  type AreaCtx, newKit, anchor, PLAN, Y0, YH, YU, YAW_N, YAW_S, YAW_E, YAW_W, yawTo, box3, hedge, hedgeBed, topiary, autumnTree,
  cypress, leafLitter, statue, balustrade, gothicWindow, pinnacle, hangingBanner, Rng,
} from './levelCommon';

export const MAZE = { x0: -38, z0: 48, cell: 3.75, cols: 8, rows: 12 };
/** Cell centre (c = column west→east, r = row south→north). */
export const mazeCell = (c: number, r: number) => new THREE.Vector3(MAZE.x0 + MAZE.cell * (c + 0.5), Y0, MAZE.z0 - MAZE.cell * (r + 0.5));
export const GARDEN_DOOR_Z = mazeCell(0, 5).z;

export interface MazeGrid {
  /** open[c][r] passage flags: e = wall to the east removed, n = wall to the north removed. */
  e: boolean[][]; n: boolean[][];
}

/** Deterministic maze (DFS) with loops, gazebo court (3..4 × 5..6) and grave corner (0..1 × 10..11). */
export function mazeGrid(): MazeGrid {
  const { cols, rows } = MAZE;
  const e = Array.from({ length: cols }, () => Array(rows).fill(false));
  const n = Array.from({ length: cols }, () => Array(rows).fill(false));
  const seen = Array.from({ length: cols }, () => Array(rows).fill(false));
  const rng = new Rng(4242);
  const stack: [number, number][] = [[3, 0]];
  seen[3][0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const opts: [number, number, 'e' | 'w' | 'n' | 's'][] = [];
    if (c + 1 < cols && !seen[c + 1][r]) opts.push([c + 1, r, 'e']);
    if (c > 0 && !seen[c - 1][r]) opts.push([c - 1, r, 'w']);
    if (r + 1 < rows && !seen[c][r + 1]) opts.push([c, r + 1, 'n']);
    if (r > 0 && !seen[c][r - 1]) opts.push([c, r - 1, 's']);
    if (!opts.length) { stack.pop(); continue; }
    const [nc, nr, d] = opts[Math.floor(rng.next() * opts.length)];
    if (d === 'e') e[c][r] = true; else if (d === 'w') e[nc][nr] = true; else if (d === 'n') n[c][r] = true; else n[nc][nr] = true;
    seen[nc][nr] = true;
    stack.push([nc, nr]);
  }
  // gazebo court: open 2×2
  e[3][5] = e[3][6] = true; n[3][5] = n[4][5] = true;
  // grave corner: open 2×2 in the north-west
  e[0][10] = e[0][11] = true; n[0][10] = n[1][10] = true;
  // a few loops so the maze reads as a garden, not a puzzle
  for (const [c, r, d] of [[1, 2, 'e'], [5, 3, 'n'], [6, 8, 'e'], [2, 7, 'n'], [4, 9, 'e'], [6, 1, 'n'], [1, 5, 'n'], [5, 6, 'e'], [2, 4, 'e']] as [number, number, 'e' | 'n'][]) (d === 'e' ? e : n)[c][r] = true;
  return { e, n };
}

/** BFS path of cell centres from (c0,r0) to (c1,r1) (for tests and patrols). */
export function mazePath(g: MazeGrid, from: [number, number], to: [number, number]): THREE.Vector3[] {
  const { cols, rows } = MAZE;
  const prev = new Map<string, string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const q: [number, number][] = [from];
  prev.set(key(...from), '');
  while (q.length) {
    const [c, r] = q.shift()!;
    if (c === to[0] && r === to[1]) break;
    const nb: [number, number, boolean][] = [
      [c + 1, r, c + 1 < cols && g.e[c][r]], [c - 1, r, c > 0 && g.e[c - 1][r]],
      [c, r + 1, r + 1 < rows && g.n[c][r]], [c, r - 1, r > 0 && g.n[c][r - 1]],
    ];
    for (const [nc, nr, ok] of nb) if (ok && !prev.has(key(nc, nr))) { prev.set(key(nc, nr), key(c, r)); q.push([nc, nr]); }
  }
  const out: THREE.Vector3[] = [];
  let k = key(...to);
  if (!prev.has(k)) return out;
  while (k) { const [c, r] = k.split(',').map(Number); out.unshift(mazeCell(c, r)); k = prev.get(k)!; }
  return out;
}

export interface GardenBuild {
  shrine: StillbellShrine;
  playerStart: Anchor;
  portcullis: DynamicPiece & { anchor: Anchor };
  enemies: EnemySpawn[];
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
  anchors: Record<string, Anchor>;
  maze: MazeGrid;
}

export function buildGarden(ctx: AreaCtx): GardenBuild {
  const k = newKit(ctx, 'garden', 71);
  const anchors: Record<string, Anchor> = {};
  const enemies: EnemySpawn[] = [];
  const Y = PLAN.yard, G = PLAN.garden, T = PLAN.terrace;

  // ================================================================ ground
  floor(k, 'cobble', Y.x0, Y.z0, Y.x1, Y.z1, Y0, 0.6);
  floor(k, 'grass_dead', -38, -15.5, 36, 53, Y0, 0.6, 'dirt');
  k.bmm('stone_dark', -60, -3, -30, 62, -0.6, 80, { cast: false });
  // gravel walks (flagstone avenue, dirt cross path)
  k.bmm('flagstone', PLAN.avenue.x0, Y0 + 0.004, 1, PLAN.avenue.x1, Y0 + 0.03, 53, { cast: false, uv: 'world' });
  for (const s of [-1, 1]) k.bmm('stone_trim', s * 3.15 - 0.15, Y0, 1, s * 3.15 + 0.15, Y0 + 0.08, 53, { cast: false });
  k.bmm('dirt', -8, Y0 + 0.003, PLAN.cross.z0, 36, Y0 + 0.02, PLAN.cross.z1, { cast: false });
  k.bmm('dirt', -24, Y0 + 0.003, 48, -20, Y0 + 0.02, 53, { cast: false });   // yard arch → maze south mouth
  k.bmm('dirt', -20, Y0 + 0.003, 48.8, 3, Y0 + 0.02, 52, { cast: false });   // south walk to the avenue
  k.bmm('dirt', -38, Y0 + 0.003, -4, 36, Y0 + 0.02, 2.2, { cast: false });    // walk under the terrace

  // ================================================================ servants' yard
  // walls: south, east, west (south of the wing), north (with the arch into the garden)
  wall(k, 'stone_wall', Y.x0, Y.z1, Y.x1, Y.z1, Y0, 5, 1.0);
  wall(k, 'stone_wall', Y.x1, Y.z0 - 1, Y.x1, Y.z1, Y0, 5, 1.0);
  wall(k, 'stone_wall', Y.x0, 60, Y.x0, Y.z1, Y0, 5, 1.0);
  wall(k, 'stone_wall', Y.x0, Y.z0, Y.x1, Y.z0, Y0, 5, 1.2, { openings: [{ u: -22 - (Y.x0 + Y.x1) / 2, w: 3.6, sill: 0, h: 3.2, kind: 'pointed', rise: 1.2 }] });
  crenellation(k, 'stone_wall', Y.x0, Y.z1, Y.x1, Y.z1, 5, 1.0, { base: 0.2, merlonH: 0.6, col: false });
  k.bmm('stone_trim', Y.x0, 4.9, Y.z0 - 0.7, Y.x1, 5.15, Y.z0 + 0.7, { cast: false });
  // the servants' gate itself (barred; the way the Returned came in)
  k.bmm('planks', -25.5, Y0, Y.z1 - 0.62, -22.5, 3.4, Y.z1 - 0.52);
  for (let i = 0; i < 5; i++) k.bmm('iron', -25.4 + i * 0.7, Y0, Y.z1 - 0.66, -25.3 + i * 0.7, 3.4, Y.z1 - 0.62, { cast: false });
  k.bmm('timber_dark', -25.8, 1.4, Y.z1 - 0.75, -22.2, 1.6, Y.z1 - 0.62, { cast: false });
  // outbuildings: a lean-to wash house along the east wall and a wood store
  k.bmm('timber', -13.5, Y0, 64, -10.6, 2.8, 64.3, { col: true });
  k.bmm('timber', -13.5, Y0, 71.7, -10.6, 2.8, 72, { col: true });
  k.box('roof_slate', -12.2, 3.1, 68, 3.6, 0.12, 9, { rz: -0.3 });
  for (let i = 0; i < 4; i++) k.box('timber_dark', -13.4, 1.4, 64.4 + i * 2.4, 0.2, 2.8, 0.2);
  trough(k, -12.3, Y0, 67, YAW_W);
  bucket(k, -13, Y0, 69.4);
  bucket(k, -12.4, Y0, 70.1, 'planks', null);
  k.solid(-13.5, 0, 64, -10.5, 2.4, 72);
  well(k, -18, Y0, 70);
  cart(k, -31, Y0, 57.5, 0.4, false);
  crateStack(k, -35.8, Y0, 72.5, 0.2);
  barrel(k, -36.2, Y0, 69.8, 0, true); barrel(k, -35.4, Y0, 68.9, 0.5, true);
  sack(k, -34.8, Y0, 71.4, 0.3); sack(k, -34.5, Y0, 72.3, 1.2);
  crate(k, -14.5, Y0, 55.5, 0.3, 0.9, true);
  laundryLine(k, [-30, 3.1, 64], [-16, 3.1, 64], 7);
  laundryLine(k, [-28, 3.0, 60], [-17, 3.0, 61], 5);
  for (const [x, z] of [[-30, 64], [-16, 64], [-28, 60], [-17, 61]]) k.add('timber_dark', cyl(0.07, 0.08, 3.2, 6), { x, y: 0, z }, { cast: true });
  // woodpile
  for (let i = 0; i < 18; i++) k.add('timber_burnt', cyl(0.12, 0.12, 1.1, 6), { x: -21.2 + (i % 6) * 0.26, y: 0.13 + Math.floor(i / 6) * 0.23, z: 74.8, rz: Math.PI / 2, ry: Math.PI / 2 }, { cast: false });
  k.solid(-22.5, 0, 74.2, -19.6, 0.8, 75.4, 'wood');
  bracketLantern(k, -24, 3.2, Y.z0 + 0.62, YAW_S);
  k.light(0xffb870, 3.2, 10, -24, 3.1, Y.z0 + 1.2, 0.5);
  leafLitter(ctx, k, Y.x0 + 1, Y.z0 + 1, Y.x1 - 1, Y.z1 - 1, Y0, 260, 11);
  autumnTree(ctx, k, -33.5, Y0, 64.5, 8.5, 3);
  // Stillbell: Servants' Gate (shrine facing north; the player rests facing south, then turns to the view)
  const shrine = stillbellShrine(k, -26, Y0, 72.6, YAW_N);
  const playerStart = anchor(-24.5, Y0, 66, yawTo(-24.5, 66, 20, -90));
  // Greyford muster soldier's corner (the colour he asks for is in the maze's grave corner)
  anchors.musterSoldier = anchor(-35.4, Y0, 55.2, yawTo(-35.4, 55.2, -26, 62));
  bench(k, -35.6, Y0, 53.6, YAW_E);
  anchors.yardScrap = anchor(-31, Y0 + 0.9, 57.5, 0);
  enemies.push({ id: 'hh_yard_gardener', kind: 'hhGardener', anchor: anchor(-15.2, Y0, 58.8, YAW_E), leash: 16 });

  // ================================================================ garden walls
  wall(k, 'stone_wall', Y.x1, 53, 35.5, 53, Y0, 4.4, 1.0);
  wall(k, 'stone_wall', 35.5, 34, 35.5, 53, Y0, 4.4, 1.0);
  crenellation(k, 'stone_wall', Y.x1, 53, 35.5, 53, 4.4, 1.0, { base: 0.2, merlonH: 0.6, col: false });
  crenellation(k, 'stone_wall', 35.5, 34, 35.5, 53, 4.4, 1.0, { base: 0.2, merlonH: 0.6, col: false });
  for (let x = -6; x < 34; x += 8) buttress(k, 'stone_wall', x, Y0, 52.5, YAW_N, 3.8, 0.7, 0.8);

  // ================================================================ the avenue
  // low hedges both sides (gaps at the cross path)
  for (const s of [-1, 1]) {
    hedge(ctx, k, s * 3.9, 2.5, s * 3.9, PLAN.cross.z0 - 0.3, Y0, 1.05, 0.8);
    hedge(ctx, k, s * 3.9, PLAN.cross.z1 + 0.3, s * 3.9, 48.2, Y0, 1.05, 0.8);
  }
  // statues of heirs on plinths facing the avenue; banners behind them
  const st: [number, number, number][] = [[-5.6, 44, 0], [5.6, 44, 2], [-5.6, 33, 1], [5.6, 33, 0], [-5.6, 15, 2], [5.6, 15, 1], [-5.6, 6, 0], [5.6, 6, 2]];
  for (const [x, z, v] of st) statue(k, x, Y0, z, x < 0 ? YAW_E : YAW_W, v);
  for (const [x, z] of [[-7, 39], [7, 39], [-7, 10.5], [7, 10.5]]) standardBanner(k, x, Y0, z, x < 0 ? YAW_E : YAW_W, 6.2, 1.2, 2.8);
  for (const z of [44, 33, 15, 6]) for (const s of [-1, 1]) topiary(ctx, k, s * 2.4, Y0, z + 4.8, 'ball', 0.55);
  leafLitter(ctx, k, -3, 1, 3, 53, Y0 + 0.03, 420, 21);
  // toll post at the crossing
  bellPost(k, -2.3, Y0, 21.2, YAW_S);
  const tollPost = {
    id: 'hh_cross', pos: new THREE.Vector3(0, Y0, 24), radius: 8,
    options: [
      { id: 'maze', toward: new THREE.Vector3(-12, Y0, 24) },
      { id: 'orangery', toward: new THREE.Vector3(36, Y0, 24) },
      { id: 'palace', toward: new THREE.Vector3(0, YH, -6) },
    ],
  };

  // ================================================================ east parterre
  const beds: [number, number, number, number][] = [[7, 29, 19, 41], [22, 29, 33, 41], [7, 44, 19, 51], [22, 44, 33, 51], [7, 3, 19, 11], [22, 3, 33, 11], [7, 13.5, 19, 20.5], [22, 13.5, 33, 20.5]];
  beds.forEach(([x0, z0, x1, z1], i) => {
    hedgeBed(ctx, k, x0, z0, x1, z1, Y0, 1.0, [[z0 > 24 ? 'n' : 's', (x0 + x1) / 2 - 1.1, (x0 + x1) / 2 + 1.1]]);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (i % 2 === 0) topiary(ctx, k, cx, Y0, cz, 'cone', 0.9); else statue(k, cx, Y0, cz, yawTo(cx, cz, 0, 24), i % 3, 1.3, 1.1);
    for (const [dx, dz] of [[-3, -2], [3, 2], [-3, 2], [3, -2]]) if (Math.abs(dx) < (x1 - x0) / 2 - 1) topiary(ctx, k, cx + dx, Y0, cz + dz, 'ball', 0.45);
  });
  // fountain on the cross path
  const F = { x: 20.5, z: 24 };
  k.bmm('flagstone', F.x - 5.5, Y0 + 0.004, F.z - 5.5, F.x + 5.5, Y0 + 0.03, F.z + 5.5, { cast: false });
  k.add('stone_trim', cyl(3.2, 3.3, 0.7, 20), { x: F.x, y: Y0, z: F.z });
  k.add('water', cyl(2.9, 2.9, 0.05, 20), { x: F.x, y: Y0 + 0.55, z: F.z }, { cast: false });
  k.add('stone_trim', cyl(0.45, 0.6, 1.6, 10), { x: F.x, y: Y0, z: F.z });
  k.add('stone_trim', cyl(1.2, 0.3, 0.35, 14), { x: F.x, y: Y0 + 1.6, z: F.z });
  statue(k, F.x, Y0 + 1.6, F.z, YAW_W, 2, 0.4, 1.0);
  k.solid(F.x - 3.1, Y0, F.z - 3.1, F.x + 3.1, Y0 + 0.75, F.z + 3.1);
  k.solid(F.x - 2.2, Y0, F.z - 2.2, F.x + 2.2, Y0 + 1.4, F.z + 2.2);
  // trees along the south and east walls, cypresses at corners
  for (const [x, z, h, s] of [[10, 49.8, 9, 1], [26, 49.5, 8, 2], [33, 44, 9.5, 3], [32.6, 31, 8.5, 4], [32.8, 15.5, 9, 5], [10.5, 26.8, 7.5, 7], [30.8, 5, 8, 8], [-4.8, 50.2, 7.5, 9]] as [number, number, number, number][]) autumnTree(ctx, k, x, Y0, z, h, s);
  for (const [x, z] of [[33.2, 51], [6.2, 51], [33.2, 2.5], [6.2, 2.5]]) cypress(ctx, k, x, Y0, z, 9, x * 3 + z);
  leafLitter(ctx, k, 4.5, 1, 35, 52.5, Y0, 900, 31);
  leafLitter(ctx, k, -8, 22, 35, 26, Y0 + 0.02, 260, 32);
  // garden benches
  bench(k, 12.6, Y0, 27.2, YAW_S); bench(k, 28.4, Y0, 20.8, YAW_N);
  // braziers at the terrace stair
  brazier(k, -5.3, Y0, 2.4, true, 1.1);
  brazier(k, 5.3, Y0, 2.4, true, 1.1);
  k.light(0xffa860, 4.5, 12, 0, 2.2, 2.2, 0.6);

  // ================================================================ the Mourning Maze
  const maze = mazeGrid();
  const M = MAZE, H = 2.7;
  const mx = (c: number) => M.x0 + c * M.cell, mz = (r: number) => M.z0 - r * M.cell;
  // outer boundary (with the south mouth at column 3, the east mouth at row 6, west door at row 5)
  const outer: [number, number, number, number, boolean][] = [];
  for (let c = 0; c < M.cols; c++) {
    if (c !== 3) outer.push([mx(c), mz(0), mx(c + 1), mz(0), true]);
    outer.push([mx(c), mz(M.rows), mx(c + 1), mz(M.rows), true]);
  }
  for (let r = 0; r < M.rows; r++) {
    if (r !== 6) outer.push([mx(M.cols), mz(r), mx(M.cols), mz(r + 1), true]);
    // west side: the wing wall stands at x = -38 (built with the palace), no hedge needed
  }
  for (const [a, b, c, d] of outer) hedge(ctx, k, a, b, c, d, Y0, H, 0.9);
  for (let c = 0; c < M.cols; c++) for (let r = 0; r < M.rows; r++) {
    if (c + 1 < M.cols && !maze.e[c][r]) hedge(ctx, k, mx(c + 1), mz(r), mx(c + 1), mz(r + 1), Y0, H, 0.85);
    if (r + 1 < M.rows && !maze.n[c][r]) hedge(ctx, k, mx(c), mz(r + 1), mx(c + 1), mz(r + 1), Y0, H, 0.85);
  }
  k.bmm('dirt', M.x0, Y0 + 0.002, mz(M.rows), mx(M.cols), Y0 + 0.018, M.z0, { cast: false });
  leafLitter(ctx, k, M.x0, mz(M.rows), mx(M.cols), M.z0, Y0 + 0.02, 700, 41);
  // graves of the Elder Claim scattered in dead ends and along the walks
  const graveRng = new Rng(77);
  const dead: [number, number][] = [];
  for (let c = 0; c < M.cols; c++) for (let r = 0; r < M.rows; r++) {
    const exits = (c + 1 < M.cols && maze.e[c][r] ? 1 : 0) + (c > 0 && maze.e[c - 1][r] ? 1 : 0) + (r + 1 < M.rows && maze.n[c][r] ? 1 : 0) + (r > 0 && maze.n[c][r - 1] ? 1 : 0);
    if (exits === 1 && !(c <= 1 && r >= 10)) dead.push([c, r]);
  }
  for (const [c, r] of dead) {
    const p = mazeCell(c, r);
    headstone(k, p.x + graveRng.range(-0.6, 0.6), Y0, p.z + graveRng.range(-0.6, 0.6), graveRng.range(-0.4, 0.4), graveRng.range(0.8, 1.2), 0.6, graveRng.range(-0.15, 0.15), 'stone_dark');
    k.bmm('mud', p.x - 0.5, Y0 + 0.02, p.z - 0.2, p.x + 0.5, Y0 + 0.08, p.z + 1.4, { cast: false });
  }
  // gazebo court (3..4 × 5..6): open pavilion with a stone table (Vow Parry imprint)
  const gz = mazeCell(3.5, 5.5);
  k.bmm('flagstone', gz.x - 3.3, Y0 + 0.004, gz.z - 3.3, gz.x + 3.3, Y0 + 0.2, gz.z + 3.3, { cast: false });
  k.solid(gz.x - 3.3, Y0, gz.z - 3.3, gz.x + 3.3, Y0 + 0.2, gz.z + 3.3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = gz.x + Math.cos(a) * 2.4, pz = gz.z + Math.sin(a) * 2.4;
    k.add('stone_trim', cyl(0.14, 0.16, 3.2, 8), { x: px, y: Y0 + 0.2, z: pz });
    k.solid(px - 0.16, Y0, pz - 0.16, px + 0.16, Y0 + 3.4, pz + 0.16);
  }
  k.add('roof_slate', new THREE.ConeGeometry(3.1, 1.7, 6), { x: gz.x, y: Y0 + 4.25, z: gz.z });
  k.add('stone_trim', cyl(2.8, 2.8, 0.25, 6), { x: gz.x, y: Y0 + 3.3, z: gz.z });
  k.add('gold_trim', new THREE.SphereGeometry(0.18, 8, 6), { x: gz.x, y: Y0 + 5.15, z: gz.z }, { cast: false });
  k.add('stone_trim', cyl(0.55, 0.3, 0.9, 10), { x: gz.x, y: Y0 + 0.2, z: gz.z });
  k.solid(gz.x - 0.55, Y0, gz.z - 0.55, gz.x + 0.55, Y0 + 1.1, gz.z + 0.55);
  anchors.gazeboTable = anchor(gz.x, Y0 + 1.15, gz.z + 0.9, YAW_N);
  // grave corner (0..1 × 10..11): the Elder Claim's broken mausoleum, the Oath set, the Greyford colour
  const gc = mazeCell(0.5, 10.5);
  k.bmm('stone_dark', gc.x - 1.8, Y0, gc.z - 3.4, gc.x + 1.8, Y0 + 2.6, gc.z - 2.3);
  k.bmm('stone_trim', gc.x - 2, Y0 + 2.6, gc.z - 3.5, gc.x + 2, Y0 + 2.9, gc.z - 2.1);
  k.solid(gc.x - 1.8, Y0, gc.z - 3.5, gc.x + 1.8, Y0 + 2.9, gc.z - 2.2);
  k.add('stone_trim', new THREE.BoxGeometry(2.2, 0.6, 1.0), { x: gc.x, y: Y0 + 0.3, z: gc.z - 1.4 });
  k.solid(gc.x - 1.1, Y0, gc.z - 1.9, gc.x + 1.1, Y0 + 0.6, gc.z - 0.9);
  k.add('stone_trim', new THREE.BoxGeometry(1.1, 0.25, 1.6), { x: gc.x + 1.4, y: Y0 + 0.2, z: gc.z + 1.2, ry: 0.4, rz: 0.2 }, { cast: false });
  for (let i = 0; i < 5; i++) headstone(k, gc.x - 2 + i * 1.0, Y0, gc.z + 2.3 - (i % 2) * 0.6, graveRng.range(-0.3, 0.3), 0.9 + (i % 3) * 0.2, 0.55, graveRng.range(-0.2, 0.2));
  rubble(k, gc.x + 1.6, Y0, gc.z - 1.8, 0.9, false);
  anchors.oathSet = anchor(gc.x, Y0 + 0.62, gc.z - 1.3, YAW_N);
  anchors.greyfordColour = anchor(gc.x - 1.4, Y0 + 0.1, gc.z + 0.2, YAW_N);
  anchors.mazeGraves = anchor(mazeCell(0, 11).x + 0.5, Y0, mazeCell(0, 11).z + 1.4, YAW_N);
  // a weeping autumn tree grown through the grave corner (landmark inside the maze)
  autumnTree(ctx, k, gc.x + 1.9, Y0, gc.z + 0.6, 7.5, 23, [AUTUMN_RED, AUTUMN_DARK]);
  // maze enemies: hounds (from the shared beasts module), a gardener, a succession ghost between two graves
  const hp = (c: number, r: number, yaw: number) => { const p = mazeCell(c, r); return anchor(p.x, Y0, p.z, yaw); };
  enemies.push({ id: 'hh_maze_hound1', kind: 'huntingHound', anchor: hp(2, 2, YAW_S), leash: 18 });
  enemies.push({ id: 'hh_maze_hound2', kind: 'huntingHound', anchor: hp(5, 4, YAW_E), leash: 18 });
  enemies.push({ id: 'hh_maze_hound3', kind: 'huntingHound', anchor: hp(6, 9, YAW_S), leash: 18 });
  enemies.push({ id: 'hh_maze_gardener', kind: 'hhGardener', anchor: hp(1, 7, YAW_S), leash: 14 });
  {
    const a = mazeCell(3, 8), b = mazeCell(5, 10);
    enemies.push({ id: 'hh_maze_ghost', kind: 'hhGhost', anchor: anchor(a.x, Y0, a.z, YAW_S), patrol: [a, b], leash: 20 });
  }

  // ================================================================ palace terrace (YH) and stair
  const tz0 = T.z0, tz1 = T.z1;
  k.bmm('stone_wall', T.x0, Y0 - 0.6, tz0, T.x1, YH, tz1, { col: true });
  k.bmm('flagstone', T.x0, YH - 0.02, tz0, T.x1, YH + 0.01, tz1, { cast: false, uv: 'world' });
  k.bmm('stone_trim', T.x0 - 0.1, YH - 0.35, tz1 - 0.1, T.x1 + 0.1, YH - 0.05, tz1 + 0.2, { cast: false });
  stairs(k, 'stone_trim', [0, Y0, 1.6], [0, YH, tz1], 8, { baseY: Y0 });
  balustrade(k, T.x0, tz1 - 0.2, -4.2, tz1 - 0.2, YH);
  balustrade(k, 4.2, tz1 - 0.2, T.x1, tz1 - 0.2, YH);
  balustrade(k, T.x0 + 0.2, tz1, T.x0 + 0.2, tz0 + 0.8, YH);
  balustrade(k, T.x1 - 0.2, tz1, T.x1 - 0.2, tz0 + 0.8, YH);
  for (const s of [-1, 1]) { k.box('stone_trim', s * 4.4, YH + 0.6, tz1 - 0.3, 0.7, 1.2, 0.7); k.add('stone_trim', new THREE.SphereGeometry(0.35, 10, 8), { x: s * 4.4, y: YH + 1.55, z: tz1 - 0.3 }); }
  for (const x of [-22, -12, 12, 22]) topiary(ctx, k, x, YH, -6, 'cone', 0.8);
  for (const x of [-26, 26]) statue(k, x, YH, -9, YAW_S, x < 0 ? 1 : 2, 1.2, 1.15);
  leafLitter(ctx, k, T.x0, tz0, T.x1, tz1, YH, 380, 51);
  // ground-level strips east & west of the terrace
  enemies.push({ id: 'hh_terrace_duellist', kind: 'hhDuellist', anchor: anchor(1.5, YH, -8.5, YAW_S), leash: 16 });
  enemies.push({ id: 'hh_terrace_courtier', kind: 'hhCourtier', anchor: anchor(18, YH, -10, YAW_S), leash: 14 });
  enemies.push({ id: 'hh_avenue_retainer', kind: 'hhRetainer', anchor: anchor(0, Y0, 36, YAW_S), patrol: [new THREE.Vector3(0, Y0, 45), new THREE.Vector3(0, Y0, 8)], leash: 22 });
  enemies.push({ id: 'hh_bed_gardener1', kind: 'hhGardener', anchor: anchor(20, Y0, 42.5, YAW_W), patrol: [new THREE.Vector3(9, Y0, 42.5), new THREE.Vector3(31, Y0, 42.5)], leash: 16 });
  enemies.push({ id: 'hh_bed_gardener2', kind: 'hhGardener', anchor: anchor(20.5, Y0, 12.2, YAW_E), leash: 16 });

  // ================================================================ garden facade of the palace
  const FZ = PLAN.facadeZ, FT = PLAN.facadeT, FTop = 17;
  wall(k, 'stone_wall', -38, FZ, 35.5, FZ, Y0, FTop, FT, {
    openings: [{ u: 0 - (-38 + 35.5) / 2, w: 6, sill: YH, h: 5.2, kind: 'pointed', rise: 2.4 }],
  });
  // plinth course, string courses in gilt and stone, the parapet with pinnacles
  k.bmm('stone_dark', -38, Y0, FZ + FT / 2, 35.5, YH + 0.6, FZ + FT / 2 + 0.3, { cast: false });
  k.bmm('gold_trim', -38, YU - 0.2, FZ + FT / 2, 35.5, YU, FZ + FT / 2 + 0.22, { cast: false });
  k.bmm('stone_trim', -38, FTop - 0.4, FZ - FT / 2 - 0.2, 35.5, FTop, FZ + FT / 2 + 0.3, { cast: false });
  crenellation(k, 'stone_wall', -38, FZ, 35.5, FZ, FTop, FT, { base: 0.5, merlonH: 0.8, merlonW: 0.6, gapW: 0.6, col: false });
  // buttress bays with pinnacles; tall gothic windows between (upper floor), smaller below
  const bays = [-34, -26, -18, -10, 10, 18, 26];
  for (const x of bays) {
    buttress(k, 'stone_wall', x, Y0, FZ + FT / 2, YAW_S, FTop - 1.5, 1.3, 1.0);
    pinnacle(k, x, FTop - 0.4, FZ + FT / 2 + 0.4, 4.2, 0.7, x % 4 === 2);
  }
  for (let i = 0; i < bays.length - 1; i++) {
    const cx = (bays[i] + bays[i + 1]) / 2;
    if (Math.abs(cx) < 6) continue;
    gothicWindow(k, cx, YU + 1.2, FZ + FT / 2 + 0.02, YAW_S, 2.4, 5.0, i === 1 || i === 4);
    gothicWindow(k, cx, YH + 1.2, FZ + FT / 2 + 0.02, YAW_S, 1.6, 2.6, false, false);
  }
  // the central bay: portcullis gate, gilt arms, rose window and a gable with the household mark
  for (const s of [-1, 1]) {
    k.bmm('stone_trim', s * 3.0 - 0.7, YH, FZ + FT / 2, s * 3.0 + 0.7, FTop + 5, FZ + FT / 2 + 0.8);
    pinnacle(k, s * 3.0, FTop + 5, FZ + FT / 2 + 0.4, 5.5, 0.9, true);
  }
  k.add('stone_wall', new THREE.BufferGeometry().copy(gableGeo(5.4, 6.5, 1.2)), { x: 0, y: FTop, z: FZ + 0.2 });
  k.add('stone_dark', new THREE.CircleGeometry(1.75, 24), { x: 0, y: YU + 4.6, z: FZ + FT / 2 + 0.03 }, { cast: false });
  k.add('gold_trim', new THREE.TorusGeometry(1.8, 0.14, 6, 28), { x: 0, y: YU + 4.6, z: FZ + FT / 2 + 0.08 }, { cast: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add('stone_trim', new THREE.TorusGeometry(0.42, 0.06, 5, 14), { x: Math.cos(a) * 1.12, y: YU + 4.6 + Math.sin(a) * 1.12, z: FZ + FT / 2 + 0.07 }, { cast: false });
    k.add('window_warm', new THREE.CircleGeometry(0.36, 10), { x: Math.cos(a) * 1.12, y: YU + 4.6 + Math.sin(a) * 1.12, z: FZ + FT / 2 + 0.045 }, { cast: false });
  }
  k.add('gold_trim', new THREE.TorusGeometry(0.5, 0.08, 5, 16), { x: 0, y: YU + 4.6, z: FZ + FT / 2 + 0.08 }, { cast: false });
  k.add('window_warm', new THREE.CircleGeometry(0.45, 12), { x: 0, y: YU + 4.6, z: FZ + FT / 2 + 0.045 }, { cast: false });
  // household mark over the gate: arch, crown, bell (gilt)
  const mk = (x: number, y: number) => {
    k.add('gold_trim', new THREE.TorusGeometry(0.9, 0.11, 6, 18, Math.PI), { x, y, z: FZ + FT / 2 + 0.12 }, { cast: false });
    for (const s of [-1, 1]) k.box('gold_trim', x + s * 0.9, y - 0.5, FZ + FT / 2 + 0.12, 0.22, 1.0, 0.1, { cast: false });
    k.add('gold_trim', cyl(0.24, 0.42, 0.55, 12), { x, y: y - 0.62, z: FZ + FT / 2 + 0.2 }, { cast: false });
    k.add('gold_trim', cyl(0.4, 0.36, 0.14, 12, true), { x, y: y + 0.95, z: FZ + FT / 2 + 0.2 }, { cast: false });
    for (let i = 0; i < 5; i++) k.add('gold_trim', new THREE.ConeGeometry(0.06, 0.24, 4), { x: x - 0.32 + i * 0.16, y: y + 1.2, z: FZ + FT / 2 + 0.2 }, { cast: false });
  };
  mk(0, YH + 9.2);
  // lanterns and banners on the facade
  for (const x of [-14, 14]) hangingBanner(k, x, YU + 6.8, FZ + FT / 2 + 0.02, YAW_S, 1.6, 6.2);
  for (const s of [-1, 1]) bracketLantern(k, s * 4.4, YH + 3.4, FZ + FT / 2, YAW_S);
  k.light(0xffc080, 3.4, 11, 0, YH + 3.5, FZ + 2.4, 0.4);
  // corner towers
  for (const [x, r] of [[-38.5, 3.2], [35.8, 2.8]] as [number, number][]) {
    k.add('stone_wall', cyl(r, r + 0.2, FTop + 6, 14), { x, y: Y0, z: FZ });
    k.add('roof_slate', new THREE.ConeGeometry(r + 0.6, 9, 14), { x, y: FTop + 10.5, z: FZ });
    k.add('gold_trim', cyl(0.05, 0.05, 1.6, 4), { x, y: FTop + 15, z: FZ }, { cast: false });
    k.solid(x - r, Y0, FZ - r, x + r, FTop + 6, FZ + r);
  }

  // ================================================================ portcullis (shortcut: winch on the hall balcony)
  const portcullis = buildPortcullis(ctx, 0, YH, FZ);

  // ================================================================ inspectables, pickups
  anchors.avenueStatue = anchor(-4.2, Y0, 33, YAW_W);      // statues of heirs: three claimants on one avenue
  anchors.fountain = anchor(F.x - 4, Y0, F.z, YAW_E);
  anchors.parterreScrap = anchor(28.4, Y0 + 0.5, 20.2, 0);  // on the bench
  // trees near the maze mouth for silhouette
  autumnTree(ctx, k, -10, Y0, 50.4, 8, 12);

  return { shrine, playerStart, portcullis, enemies, tollPost, anchors, maze };
}

const AUTUMN_RED = new THREE.Color('#8f2e1c');
const AUTUMN_DARK = new THREE.Color('#6e2a18');

function gableGeo(w: number, h: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

/** Iron portcullis in the facade gate. set(1) = raised into the wall (walkable). */
function buildPortcullis(ctx: AreaCtx, x: number, y: number, z: number): DynamicPiece & { anchor: Anchor } {
  const root = new THREE.Group();
  root.name = 'portcullis';
  ctx.dynamicRoot.add(root);
  const iron = getMaterial('iron');
  const W = 6, H = 7.6;
  const grid = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= 8; i++) geos.push(new THREE.BoxGeometry(0.1, H, 0.12).translate(-W / 2 + (W * i) / 8, H / 2, 0));
  for (let j = 0; j < 8; j++) geos.push(new THREE.BoxGeometry(W, 0.09, 0.1).translate(0, 0.45 + j * 0.95, 0));
  for (let i = 0; i <= 8; i++) geos.push(new THREE.ConeGeometry(0.08, 0.3, 4).rotateX(Math.PI).translate(-W / 2 + (W * i) / 8, -0.1, 0));
  for (const g of geos) { const m = new THREE.Mesh(g, iron); m.castShadow = true; grid.add(m); }
  grid.position.set(x, y, z);
  root.add(grid);
  const c = ctx.shared.collision?.addDynamicBox('household:portcullis', [W, H, 0.6], 'metal');
  const piece = {
    object: root,
    collider: c,
    anchor: anchor(x, y, z + 2.2, YAW_N),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      grid.position.y = y + e * 6.2;
      c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + H / 2 + e * 6.2, z));
      if (c) c.enabled = e < 0.6;
    },
  };
  piece.set(0);
  return piece;
}
