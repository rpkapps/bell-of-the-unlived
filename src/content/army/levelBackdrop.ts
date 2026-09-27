/**
 * Siegeholm's surroundings (visual only): the mountain notch the fortress fills (snowy rock slopes
 * east and west of the walls), the inner fortress rising beyond the Bell Rampart (towers, hall
 * roofs, a second curtain), the besiegers' far camp and lines, a mountain ring, smoke from the
 * burning siege works and the ever-falling snow.
 */
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { PuffField, type PuffColumn, mountainRing, spireTower, towerSolid, rockProp, deadTree, farKeep, crenellation, cyl } from '../../world/kit';
import { type AreaCtx, newKit, terrainPatch, fbm2, snowCap, snowDrift, PLAN } from './levelCommon';
import { tent, trebuchet, palisade } from './levelProps';

export interface BackdropBuild { smoke: PuffField[] }

export function buildBackdrop(ctx: AreaCtx): BackdropBuild {
  const d = ctx.shared.detail;
  const rng = new Rng(9090);
  const k = newKit(ctx, 'backdrop', 901);

  // ---------------------------------------------------------------- the notch: slopes along the fortress flanks
  const west = (x: number, z: number) => Math.max(0, Math.pow(Math.max(0, -49 - x) * 1.1, 1.15)) + fbm2(x * 0.08, z * 0.08, 21) * 5 + (x < -52 ? 4 : 0);
  const east = (x: number, z: number) => Math.max(0, Math.pow(Math.max(0, x - 48) * 1.1, 1.15)) + fbm2(x * 0.08, z * 0.08, 22) * 5 + (x > 51 ? 4 : 0);
  terrainPatch(ctx, -150, -300, -48, -19, 4, (x, z) => west(x, z) - 1);
  terrainPatch(ctx, 45, -300, 150, -19, 4, (x, z) => east(x, z) - 1);
  // north: the ground behind the keep climbs to the ridge
  terrainPatch(ctx, -48, -330, 45, -244, 5, (x, z) => Math.pow(Math.max(0, -250 - z) * 0.7, 1.12) + fbm2(x * 0.06, z * 0.06, 23) * 6 - 2);
  // the south horizon beyond the road
  terrainPatch(ctx, -150, 95, 150, 260, 6, (x, z) => Math.pow(Math.max(0, z - 95) * 0.5, 1.1) + fbm2(x * 0.05, z * 0.05, 24) * 8 + 10);
  terrainPatch(ctx, -150, -19, -80, 95, 5, (x, z) => 40 + fbm2(x * 0.05, z * 0.05, 25) * 14 + (-80 - x) * 0.3);
  terrainPatch(ctx, 60, -19, 150, 95, 5, (x, z) => 35 + fbm2(x * 0.05, z * 0.05, 26) * 14 + (x - 60) * 0.3);
  for (let i = 0; i < Math.round(28 * d); i++) {
    const w = i % 2 === 0;
    const x = w ? rng.range(-110, -56) : rng.range(54, 110), z = rng.range(-280, 40);
    const y = (w ? west(x, z) : east(x, z)) - 1;
    const r = rng.range(3, 8);
    rockProp(k, x, y - r * 0.3, z, r, 1200 + i, 0.8);
    snowDrift(ctx, x, y + r * 0.3, z, r * 0.9, r * 0.8, r * 0.3, 1300 + i);
  }
  for (let i = 0; i < Math.round(22 * d); i++) {
    const w = i % 2 === 0;
    const x = w ? rng.range(-90, -56) : rng.range(54, 90), z = rng.range(-240, 30);
    deadTree(k, x, (w ? west(x, z) : east(x, z)) - 1.3, z, rng.range(6, 11), 400 + i);
  }

  // ---------------------------------------------------------------- the inner fortress beyond the rampart
  const o = { cast: false } as const;
  const tall: [number, number, number, number, number][] = [
    [-34, -262, 7, 58, 16], [34, -258, 7, 64, 18], [-12, -282, 9, 74, 20], [16, -290, 8, 68, 18], [-48, -236, 6, 44, 12], [50, -232, 6, 48, 12],
    [0, -306, 11, 84, 24], [-28, -312, 7, 60, 16], [30, -318, 7, 56, 14],
  ];
  for (const [x, z, w, h, sp] of tall) spireTower(k, x, 0, z, w, h, sp, rng.chance(0.5) ? 'stone_wall' : 'stone_dark');
  // great hall roofs and a second curtain (crenellated) across the notch
  k.bmm('stone_wall', -46, -1, -252, 46, 34, -248, o);
  crenellation(k, 'stone_wall', -46, -249.8, 46, -249.8, 34, 0.8, { col: false, base: 0.6, merlonH: 1.4, merlonW: 1.3, gapW: 1.0 });
  snowCap(ctx, -46, -252, 46, -248, 34, 0.25);
  for (const [x, z, w, dd, h] of [[-20, -266, 16, 30, 30], [22, -272, 18, 26, 34], [0, -292, 24, 20, 40]] as const) {
    k.bmm('stone_dark', x - w / 2, -1, z - dd / 2, x + w / 2, h, z + dd / 2, o);
    k.add('roof_slate', new THREE.CylinderGeometry(0.01, w * 0.62, h * 0.4, 4, 1).rotateY(Math.PI / 4).scale(1, 1, dd / w), { x, y: h + h * 0.2, z }, o);
    snowCap(ctx, x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, h, 0.25);
  }
  for (let i = 0; i < 6; i++) towerSolid(k, 'stone_dark', -40 + i * 16, 0, -330 - (i % 2) * 10, 8, 8, 60 + (i % 3) * 12, i % 2 ? 'cone' : 'crenel', 12, false);
  farKeep(k, -160, 40, -420, 1.6);
  farKeep(k, 180, 30, -380, 1.3);
  // flank towers along the east and west curtains (silhouette over the slopes)
  for (const [x, z] of [[-52, -60], [-52, -130], [-50, -200], [50, -80], [50, -150], [49, -205]] as const) {
    k.add('stone_wall', cyl(4, 4.4, 30, 14), { x, y: -2, z }, o);
    k.add('roof_slate', new THREE.ConeGeometry(4.8, 11, 14), { x, y: 28, z }, o);
  }
  // long curtain walls on the flanks (the fortress's outer circuit on the slopes)
  k.bmm('stone_wall', -53, -1, -250, -49.2, 16, -92, o);
  k.bmm('stone_wall', 48, -1, -250, 51, 16, -95, o);
  crenellation(k, 'stone_wall', -51, -250, -51, -92, 16, 3.6, { col: false, base: 0.5, merlonH: 1.2 });
  crenellation(k, 'stone_wall', 49.5, -250, 49.5, -95, 16, 3, { col: false, base: 0.5, merlonH: 1.2 });
  snowCap(ctx, -53, -250, -49.2, -92, 17.5, 0.2);
  snowCap(ctx, 48, -250, 51, -95, 17.5, 0.2);
  // filler masses between the areas (seen from the ramparts)
  k.bmm('stone_dark', -46, -1, -126, -9.3, 14, -92, o);
  k.bmm('stone_dark', 9.2, -1, -124, 24.5, 16, -92, o);
  k.bmm('stone_dark', -45, -1, -210, -26.5, 20, -174, o);
  k.bmm('stone_dark', 26.5, -1, -212, 46, 20, -172, o);

  // ---------------------------------------------------------------- the besiegers' far lines (south, behind the road)
  const camp = newKit(ctx, 'farCamp', 902);
  for (let i = 0; i < Math.round(26 * d); i++) {
    const x = rng.range(-70, 70), z = rng.range(100, 170);
    const y = Math.pow(Math.max(0, z - 95) * 0.5, 1.1) + 10 + fbm2(x * 0.05, z * 0.05, 24) * 8 - 0.4;
    tent(camp, x, y, z, rng.range(0, 3), rng.range(3, 5), rng.range(4, 6), rng.range(2.4, 3.2), rng.chance(0.3) ? 'cloth_red' : 'cloth_linen', false);
  }
  for (let i = 0; i < 4; i++) {
    const x = -50 + i * 32, z = 110 + (i % 2) * 20;
    trebuchet(camp, x, Math.pow(Math.max(0, z - 95) * 0.5, 1.1) + 10 + fbm2(x * 0.05, z * 0.05, 24) * 8 - 0.3, z, rng.range(-0.3, 0.3) + Math.PI, i % 2 === 0, false);
  }
  palisade(camp, -80, 96, 80, 96, 10, 3, false, 9);
  mountainRing(camp, 0, -120, 820, Math.round(18 * d) + 6, 31, -30);

  // ---------------------------------------------------------------- smoke: burning siege works, the breach, the keep
  const cols: PuffColumn[] = [];
  for (const [x, y, z, h] of [[22, 0, -22, 30], [-25, 0, 8, 22], [40, 6, -84, 26], [-30, 30, -300, 60], [34, 30, -270, 55], [-60, 20, 120, 50], [50, 25, 140, 45]] as const) {
    cols.push({ pos: new THREE.Vector3(x, y, z), height: h, size0: 3, size1: 14, count: Math.round(14 * d), life: 22, drift: new THREE.Vector3(14, 0, -8), spread: 3 });
  }
  const smoke = new PuffField(cols, { color: 0x3a3a40, baseColor: 0x6a5040, opacity: 0.5 }, 51);
  ctx.root.add(smoke.mesh);
  // a thin ground haze over the killing ground and the bailey (cold breath of the snow)
  const haze: PuffColumn[] = [];
  for (let i = 0; i < Math.round(10 * d); i++) haze.push({ pos: new THREE.Vector3(rng.range(-30, 30), 0.3, rng.range(-50, 30)), height: 2, size0: 6, size1: 12, count: 3, life: 18, drift: new THREE.Vector3(6, 0, 0), spread: 4 });
  const mist = new PuffField(haze, { color: 0xc8d0da, opacity: 0.12 }, 52);
  ctx.root.add(mist.mesh);
  void PLAN;
  return { smoke: [smoke, mist] };
}
