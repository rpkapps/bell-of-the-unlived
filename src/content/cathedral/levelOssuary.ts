/**
 * The Name-Ossuary (y = 4), dug into the east bank of the Stair: a vaulted passage from the first
 * landing, a long gallery walled with skulls and name-tablets, side rooms (the Unclaimed Names where
 * Wenna's tablet waits; a priest's bier), alcoves for the Stillbell and for Private Soames, the
 * grate stair down to the Stair's foot (a shortcut, opened from inside), and the Stair of Graves
 * climbing north to the cloister.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import { getMaterial } from '../../render/materials';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stairs, floor, wall, barrelVault, candles, stillbellShrine, sphere, cyl, type Kit, type StillbellShrine, type Opening } from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, plaqueWall, candleField } from './levelCommon';

export interface OssuaryBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
}

type Hole = [centre: number, w: number, sill: number, h: number, kind?: Opening['kind']];

/** Wall along Z at x (from z0 to z1), with openings given by their centre z. */
export function wallZ(k: Kit, mat: Parameters<typeof wall>[1], x: number, z0: number, z1: number, y: number, h: number, t: number, holes: Hole[] = [], col = true) {
  const mid = (z0 + z1) / 2, dir = Math.sign(z1 - z0);
  wall(k, mat, x, z0, x, z1, y, h, t, { col, openings: holes.map(([c, w, sill, hh, kind]) => ({ u: (c - mid) * dir, w, sill, h: hh, kind: kind ?? 'pointed', rise: w * 0.45 })) });
}
/** Wall along X at z (from x0 to x1), with openings given by their centre x. */
export function wallX(k: Kit, mat: Parameters<typeof wall>[1], z: number, x0: number, x1: number, y: number, h: number, t: number, holes: Hole[] = [], col = true) {
  const mid = (x0 + x1) / 2, dir = Math.sign(x1 - x0);
  wall(k, mat, x0, z, x1, z, y, h, t, { col, openings: holes.map(([c, w, sill, hh, kind]) => ({ u: (c - mid) * dir, w, sill, h: hh, kind: kind ?? 'pointed', rise: w * 0.45 })) });
}

const skullGeo = () => sphere(0.11, 7, 5).scale(1, 0.9, 1.15);
const boneGeo = () => cyl(0.025, 0.03, 0.42, 5).rotateZ(Math.PI / 2);

/** A recessed bone-niche wall section: shelves packed with skulls and long bones (instanced). */
function boneShelves(k: Kit, x: number, y: number, z: number, yaw: number, w: number, rows: number) {
  k.push(x, y, z, yaw);
  for (let r = 0; r < rows; r++) {
    const yy = 0.5 + r * 0.55;
    k.box('stone_dark', 0, yy - 0.05, 0.12, w, 0.08, 0.36, { cast: false });
    const n = Math.floor(w / 0.24);
    for (let i = 0; i < n; i++) {
      const xx = -w / 2 + 0.14 + i * 0.24 + k.rng.range(-0.03, 0.03);
      if (k.rng.chance(0.6)) k.inst('skull', skullGeo, 'bone', { x: xx, y: yy + 0.1, z: 0.14, ry: k.rng.range(-0.4, 0.4) });
      else k.inst('bone', boneGeo, 'bone', { x: xx, y: yy + 0.03, z: 0.12, ry: k.rng.range(-0.2, 0.2) });
    }
  }
  k.pop();
}

export function buildOssuary(ctx: AreaCtx): OssuaryBuild {
  const k = newKit(ctx, 'ossuary', 51, 4);
  const P = PLAN.passage, G = PLAN.gallery, GR = PLAN.grate, TR = PLAN.tabletRoom, BR = PLAN.bierRoom, BA = PLAN.bellAlcove, SA = PLAN.soamesAlcove, GS = PLAN.graveStair, AN = PLAN.ante;
  const y = G.y;
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};
  const H = 3.4; // wall height to the vault springing

  // ---------------------------------------------------------------- the passage from the first landing
  floor(k, 'flagstone', P.x0 - 0.8, P.z0, G.x0, P.z1, y, 0.5);
  wallX(k, 'stone_dark', P.z0 - 0.3, P.x0 + 0.6, G.x0, y, H, 0.6);
  wallX(k, 'stone_dark', P.z1 + 0.3, P.x0 + 0.6, G.x0, y, H, 0.6, [[(GR.x0 + GR.x1) / 2, GR.x1 - GR.x0, 0, 2.6]]);
  barrelVault(k, 'stone_dark', P.x0 + 0.2, y + H, (P.z0 + P.z1) / 2, Math.PI / 2, (P.z1 - P.z0) / 2 + 0.3, G.x0 - P.x0 - 0.2, 0.4, 8);
  for (let x = P.x0 + 2; x < G.x0 - 1; x += 3.2) boneShelves(k, x, y, P.z0, YAW_S, 2.4, 4);
  candles(k, 10.5, y, P.z0 + 0.5, 5, 0.25);
  anchors.scrapPassage = anchor(9.4, y, P.z1 - 0.6, YAW_S);
  k.light(0xffa860, 5, 9, 10.5, y + 2.2, (P.z0 + P.z1) / 2, 0.4);

  // ---------------------------------------------------------------- the grate stair down to the Stair's foot
  const gx = (GR.x0 + GR.x1) / 2, gw = GR.x1 - GR.x0;
  stairs(k, 'stone_dark', [gx, y, P.z1 + 0.3], [gx, 0, 12.0], gw, { riser: 0.2 });
  wallZ(k, 'stone_dark', GR.x0 - 0.3, P.z1 + 0.3, 13.5, 0, 7.2, 0.6);
  wallZ(k, 'stone_dark', GR.x1 + 0.3, P.z1 + 0.3, 13.5, 0, 7.2, 0.6);
  // sloped ceiling
  const run = 12 - (P.z1 + 0.3), rise = y;
  k.box('stone_dark', gx, y / 2 + 3.4, (P.z1 + 0.3 + 12) / 2, gw + 0.6, 0.4, Math.hypot(run, rise) + 0.6, { rx: Math.atan2(rise, run), cast: false });
  k.bmm('stone_dark', GR.x0 - 0.6, 3.0, 11.6, GR.x1 + 0.6, 3.6, 13.6, { cast: false });
  boneShelves(k, GR.x0, 0.6, 9.5, YAW_E, 2.4, 3);
  pieces.grate = buildGrate(ctx, gx, 0, 13.4, gw);
  anchors.grateInside = anchor(gx, 0, 12.2, YAW_S);
  pieces.grate.anchor = anchors.grateInside;

  // ---------------------------------------------------------------- the gallery
  floor(k, 'flagstone', G.x0, G.z0, G.x1, G.z1, y, 0.5);
  k.solid(G.x0 - 5, y - 1.5, G.z0 - 1, G.x1 + 9, y - 0.5, G.z1 + 1);
  wallZ(k, 'stone_dark', G.x0 - 0.3, G.z1, G.z0, y, H, 0.6, [[(P.z0 + P.z1) / 2, P.z1 - P.z0, 0, 2.6], [(SA.z0 + SA.z1) / 2, SA.z1 - SA.z0 - 0.4, 0, 2.7], [(BA.z0 + BA.z1) / 2, BA.z1 - BA.z0 - 0.4, 0, 2.7]]);
  wallZ(k, 'stone_dark', G.x1 + 0.3, G.z1, G.z0, y, H, 0.6, [[(TR.z0 + TR.z1) / 2, 3.2, 0, 2.7], [(BR.z0 + BR.z1) / 2, 3.2, 0, 2.7]]);
  wallX(k, 'stone_dark', G.z1 + 0.3, G.x0 - 0.6, G.x1 + 0.6, y, H + 3.6, 0.6);
  wallX(k, 'stone_dark', G.z0 - 0.3, G.x0 - 0.6, G.x1 + 0.6, y, H + 3.6, 0.6, [[(GS.x0 + GS.x1) / 2, GS.x1 - GS.x0, 0, 2.9]]);
  barrelVault(k, 'stone_wall', (G.x0 + G.x1) / 2, y + H, (G.z0 + G.z1) / 2 - (G.z1 - G.z0) / 2, 0, (G.x1 - G.x0) / 2 + 0.3, G.z1 - G.z0, 0.45, 10);
  // bone shelves and name-tablets down both walls, between the openings
  for (let z = G.z1 - 2; z > G.z0 + 2; z -= 2.8) {
    const nearW = [[P.z0, P.z1], [SA.z0, SA.z1], [BA.z0, BA.z1]].some(([a, b]) => z > a - 1.6 && z < b + 1.6);
    const nearE = [[TR.z0, TR.z1], [BR.z0, BR.z1]].some(([a, b]) => z > a - 1.6 && z < b + 1.6);
    if (!nearW) { boneShelves(k, G.x0, y, z, YAW_E, 2.2, 5); }
    if (!nearE) { if (Math.round(z) % 2) boneShelves(k, G.x1, y, z, YAW_W, 2.2, 5); else plaqueWall(k, G.x1, y + 0.7, z, YAW_W, 4, 6, 0.44, 0.3); }
  }
  for (const z of [-2, -14, -26, -38]) { candles(k, (G.x0 + G.x1) / 2 + 2.6, y, z, 6, 0.3); candles(k, G.x0 + 0.6, y, z - 3, 4, 0.2); }
  k.light(0xffa050, 6, 12, 23.5, y + 2.6, -6, 0.4);
  k.light(0xffa050, 6, 12, 23.5, y + 2.6, -34, 0.4);
  // central stone biers with shrouded dead down the gallery
  for (const z of [-10, -20, -30]) {
    k.box('stone_trim', 23.5, y + 0.4, z, 1.1, 0.8, 2.2, { col: true });
    k.box('cloth_linen', 23.5, y + 0.92, z, 0.6, 0.24, 1.8, { cast: false });
    k.add('cloth_linen', sphere(0.16, 8, 6), { x: 23.5, y: y + 1.0, z: z - 0.8 }, { cast: false });
  }

  // ---------------------------------------------------------------- the bell alcove (Stillbell) and Soames' alcove
  for (const A of [BA, SA]) {
    floor(k, 'flagstone', A.x0, A.z0, G.x0, A.z1, y, 0.5);
    wallX(k, 'stone_dark', A.z0 - 0.3, A.x0 - 0.3, G.x0 - 0.3, y, H + 1, 0.6);
    wallX(k, 'stone_dark', A.z1 + 0.3, A.x0 - 0.3, G.x0 - 0.3, y, H + 1, 0.6);
    wallZ(k, 'stone_dark', A.x0 - 0.3, A.z1, A.z0, y, H + 1, 0.6);
    k.bmm('stone_dark', A.x0 - 0.6, y + H + 1, A.z0 - 0.6, G.x0, y + H + 1.5, A.z1 + 0.6, { cast: false });
  }
  const shrine = stillbellShrine(k, BA.x0 + 1.0, y, (BA.z0 + BA.z1) / 2, YAW_E, 6);
  boneShelves(k, BA.x0, y, BA.z0 + 1.0, YAW_E, 1.3, 5);
  boneShelves(k, BA.x0, y, BA.z1 - 1.0, YAW_E, 1.3, 5);
  anchors.soames = anchor(SA.x0 + 1.6, y, (SA.z0 + SA.z1) / 2, YAW_E);
  plaqueWall(k, SA.x0, y + 0.8, (SA.z0 + SA.z1) / 2, YAW_E, 7, 7, 0.44, 0.3);
  candles(k, SA.x0 + 0.8, y, SA.z0 + 0.8, 5, 0.2);

  // ---------------------------------------------------------------- the Unclaimed Names (Wenna's tablet)
  for (const R of [TR, BR]) {
    floor(k, 'flagstone', G.x1, R.z0, R.x1, R.z1, y, 0.5);
    wallX(k, 'stone_dark', R.z0 - 0.3, G.x1 + 0.3, R.x1 + 0.3, y, H + 1, 0.6);
    wallX(k, 'stone_dark', R.z1 + 0.3, G.x1 + 0.3, R.x1 + 0.3, y, H + 1, 0.6);
    wallZ(k, 'stone_dark', R.x1 + 0.3, R.z1, R.z0, y, H + 1, 0.6);
    barrelVault(k, 'stone_dark', G.x1, y + H + 1, (R.z0 + R.z1) / 2, Math.PI / 2, (R.z1 - R.z0) / 2 + 0.3, R.x1 - G.x1, 0.4, 8);
  }
  // shelves of tablets HELD FOR THE SAINT
  for (const z of [TR.z0 + 0.35, TR.z1 - 0.35]) {
    k.push((G.x1 + TR.x1) / 2 + 0.6, y, z, z < -18 ? YAW_S : YAW_N);
    for (let r = 0; r < 5; r++) {
      k.box('timber_dark', 0, 0.45 + r * 0.55, 0.2, 6, 0.06, 0.4, { cast: false });
      for (let i = 0; i < 18; i++) k.box(k.rng.chance(0.5) ? 'stone_dark' : 'stone_fresh', -2.8 + i * 0.32, 0.62 + r * 0.55, 0.22, 0.05, 0.28, 0.3, { ry: k.rng.range(-0.1, 0.1), cast: false });
      k.box('parchment', 2.6, 0.38 + r * 0.55, 0.41, 0.2, 0.08, 0.01, { cast: false });
    }
    k.pop();
  }
  plaqueWall(k, TR.x1, y + 0.8, (TR.z0 + TR.z1) / 2, YAW_W, 11, 7, 0.44, 0.3);
  // the lectern with the tablet that reads WENNA HALE
  k.box('timber_dark', TR.x1 - 2.4, y + 0.55, (TR.z0 + TR.z1) / 2, 0.5, 1.1, 0.5, { col: 'wood' });
  k.box('stone_fresh', TR.x1 - 2.4, y + 1.15, (TR.z0 + TR.z1) / 2, 0.42, 0.06, 0.3, { rz: 0.25, cast: false });
  candleField(k, TR.x1 - 1.2, y, (TR.z0 + TR.z1) / 2 + 2.2, YAW_W, 1.0, 1.6, 16);
  anchors.tablet = anchor(TR.x1 - 3.4, y, (TR.z0 + TR.z1) / 2, YAW_E);
  anchors.tabletWall = anchor(G.x1 + 1.6, y, TR.z0 + 1.5, YAW_S);
  k.light(0xffb070, 5, 9, TR.x1 - 2.4, y + 2.2, (TR.z0 + TR.z1) / 2, 0.4);
  // the priest's bier: funeral vestments laid out for a burial that never came
  k.box('stone_trim', (G.x1 + BR.x1) / 2 + 1, y + 0.45, (BR.z0 + BR.z1) / 2, 1.4, 0.9, 2.6, { col: true });
  k.box('cloth_linen', (G.x1 + BR.x1) / 2 + 1, y + 0.95, (BR.z0 + BR.z1) / 2, 0.9, 0.1, 2.0, { cast: false });
  k.box('gold_trim', (G.x1 + BR.x1) / 2 + 1, y + 1.01, (BR.z0 + BR.z1) / 2, 0.14, 0.02, 1.9, { cast: false });
  anchors.funeral = anchor((G.x1 + BR.x1) / 2 - 0.2, y, (BR.z0 + BR.z1) / 2, YAW_E);
  for (const z of [BR.z0 + 0.6, BR.z1 - 0.6]) boneShelves(k, (G.x1 + BR.x1) / 2 + 0.5, y, z, z < (BR.z0 + BR.z1) / 2 ? YAW_S : YAW_N, 5.6, 5);
  candles(k, BR.x1 - 0.8, y, (BR.z0 + BR.z1) / 2, 8, 0.4);

  // ---------------------------------------------------------------- the Stair of Graves (y 4 → 12)
  const gsx = (GS.x0 + GS.x1) / 2, gsw = GS.x1 - GS.x0;
  stairs(k, 'stone_dark', [gsx, GS.yLow, GS.zLow - 0.2], [gsx, GS.yHigh, GS.zHigh], gsw, { riser: 0.2 });
  // grave-slab treads: pale slabs with a worn central strip
  const n = Math.round((GS.yHigh - GS.yLow) / 0.2);
  for (let i = 0; i < n; i += 2) {
    const zz = GS.zLow + ((GS.zHigh - GS.zLow) * (i + 0.5)) / n, yy = GS.yLow + ((GS.yHigh - GS.yLow) * (i + 1)) / n;
    k.box('stone_trim', gsx - 1.6, yy + 0.005, zz, 1.4, 0.02, 0.6, { cast: false });
    k.box('stone_trim', gsx + 1.6, yy + 0.005, zz, 1.4, 0.02, 0.6, { cast: false });
  }
  wallZ(k, 'stone_dark', GS.x0 - 0.3, GS.zLow, GS.zHigh - 4.2, GS.yLow, GS.yHigh - GS.yLow + 4, 0.6);
  wallZ(k, 'stone_dark', GS.x1 + 0.3, GS.zLow, GS.zHigh - 4.2, GS.yLow, GS.yHigh - GS.yLow + 4, 0.6);
  const srun = Math.abs(GS.zHigh - GS.zLow), srise = GS.yHigh - GS.yLow;
  k.box('stone_dark', gsx, (GS.yLow + GS.yHigh) / 2 + 4.0, (GS.zLow + GS.zHigh) / 2, gsw + 0.6, 0.5, Math.hypot(srun, srise) + 1, { rx: Math.atan2(srise, srun), cast: false });
  for (let i = 0; i < 4; i++) {
    const z = GS.zLow - 3 - i * 4, yy = GS.yLow + ((GS.zLow - z) / srun) * srise;
    candles(k, GS.x0 + 0.3, yy + 0.02, z, 3, 0.12);
    plaqueWall(k, GS.x1, yy + 1.2, z - 1.5, YAW_W, 3, 3, 0.44, 0.3);
  }
  anchors.graves = anchor(gsx, GS.yLow, GS.zLow + 1.5, YAW_N);
  k.light(0xffa860, 5, 10, gsx, GS.yLow + 6, (GS.zLow + GS.zHigh) / 2, 0.4);
  // the antechamber at the top (the cloister's veil is at its north side)
  floor(k, 'flagstone', AN.x0, AN.z0, AN.x1, AN.z1, AN.y, 0.5);
  wallZ(k, 'stone_wall', AN.x0 - 0.3, AN.z1, AN.z0, AN.y, 5, 0.6);
  wallZ(k, 'stone_wall', AN.x1 + 0.3, AN.z1, AN.z0, AN.y, 5, 0.6);
  k.bmm('stone_dark', AN.x0 - 0.6, AN.y + 5, AN.z0 - 0.3, AN.x1 + 0.6, AN.y + 5.6, AN.z1 + 0.3, { cast: false });
  candles(k, AN.x0 + 0.6, AN.y, AN.z0 + 0.8, 5, 0.2);
  candles(k, AN.x1 - 0.6, AN.y, AN.z0 + 0.8, 5, 0.2);

  // ---------------------------------------------------------------- enemies
  const E = (id: string, kind: string, x: number, yy: number, z: number, yaw: number, o: Partial<EnemySpawn> = {}): EnemySpawn => ({ id, kind, anchor: anchor(x, yy + 0.05, z, yaw), leash: 14, ...o });
  const sy = (z: number) => GS.yLow + ((GS.zLow - z) / srun) * srise;
  const enemies: EnemySpawn[] = [
    E('os_flag1', 'cath_flagellant', 17, y, 2.6, YAW_W),
    E('os_pil1', 'cath_pilgrim', 24.5, y, -3.5, YAW_S),
    E('os_pil2', 'cath_pilgrim', 21.6, y, -17, YAW_S, { patrol: [new THREE.Vector3(21.6, y, -17), new THREE.Vector3(21.6, y, -4), new THREE.Vector3(25.5, y, -4), new THREE.Vector3(25.5, y, -17)] }),
    E('os_healer', 'cath_healer', 25.2, y, -15.5, YAW_S),
    E('os_pil3', 'cath_pilgrim', 25.4, y, -32, YAW_S),
    E('os_flag2', 'cath_flagellant', 21.8, y, -37, YAW_S),
    E('os_giant', 'cath_mourner', 23.5, y, -41, YAW_S, { leash: 12 }),
    E('plead_os', 'cath_pilgrim', TR.x1 - 1.4, y, TR.z0 + 1.2, YAW_W, { idleAnim: 'kneel', leash: 6 }),
    E('os_bier_healer', 'cath_healer', BR.x1 - 1.6, y, BR.z1 - 1.2, YAW_W),
    E('gs_pil1', 'cath_pilgrim', gsx + 1, sy(-50), -50, YAW_S),
    E('gs_pil2', 'cath_pilgrim', gsx - 1.2, sy(-56), -56, YAW_S),
  ];
  return { shrine, enemies, anchors, pieces };
}

/** The ossuary grate: an iron portcullis that rises into the wall. set(1) = open. */
function buildGrate(ctx: AreaCtx, x: number, y: number, z: number, w: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'ossuaryGrate';
  ctx.dynamicRoot.add(root);
  const bars: THREE.BufferGeometry[] = [];
  const h = 3.4;
  for (let i = 0; i <= 8; i++) bars.push(new THREE.BoxGeometry(0.07, h, 0.07).translate(-w / 2 + (w * i) / 8, h / 2, 0));
  for (const yy of [0.4, 1.4, 2.4, 3.2]) bars.push(new THREE.BoxGeometry(w, 0.07, 0.08).translate(0, yy, 0));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(bars.map((x) => x.toNonIndexed()), false)!, getMaterial('iron')));
  g.position.set(x, y, z);
  root.add(g);
  const c = ctx.shared.collision?.addDynamicBox('cathedral:grate', [w, h, 0.5], 'metal');
  const piece: DynamicPiece = {
    object: root, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      g.position.y = y + e * 3.2;
      if (c) { c.setMatrix(new THREE.Matrix4().makeTranslation(x, y + h / 2, z)); c.enabled = e < 0.5; }
    },
  };
  piece.set(0);
  return piece;
}
