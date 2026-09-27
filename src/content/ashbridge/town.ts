/**
 * Everything around the playable spaces: the town fill (layered half-timbered rooftops), the
 * burned district with smoke columns and embers, chimney smoke, the ground, and the distant
 * backdrop (city silhouettes, spires, a cathedral, a hilltop keep, mountains). Visual only.
 */
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import {
  Kit, house, rubble, fallenBeam, PuffField, type PuffColumn, skylineRing, spireTower, cathedral, farKeep,
  mountainRing, rockFace, deadTree, rockProp,
} from '../../world/kit';
import { type AreaCtx, newKit } from './common';

export interface TownBuild { smoke: PuffField[] }

/** Rectangles that must stay free of fill houses (playable spaces and key buildings). */
const KEEP_OUT: [number, number, number, number][] = [
  [-32, -48, 23, -5],        // lower street, square, alley, yard
  [2, -62, 18, -34],         // the mint
  [-17, -134, 56, -94],      // courtyard, hospice, practice yard
  [-7, -97, 12, -90],        // undercroft stair-house
  [-27, -142, -14, -46],     // ravine
  [-46, -124, -24, -30],     // tower, rim path, cliffs
  [-26, -186, 36, -133],     // gate approach, gatehouse, arena
];
const blocked = (x0: number, z0: number, x1: number, z1: number) =>
  KEEP_OUT.some(([a, b, c, d]) => x0 < c && x1 > a && z0 < d && z1 > b);

/** Lay out rows of houses in a block; each row alternates facing ±Z along an implied lane. */
function fillBlock(k: Kit, rng: Rng, x0: number, z0: number, x1: number, z1: number, y: number, o: { burned?: number; storeys?: [number, number]; detail?: 'high' | 'low' }, chimneys: THREE.Vector3[]) {
  const rowD = 9, lane = 4;
  let z = z0;
  let row = 0;
  while (z + rowD <= z1) {
    let x = x0 + rng.range(0, 2);
    while (x < x1 - 4) {
      const w = rng.range(4.2, 8.2), d = rng.range(6.5, rowD);
      const facingS = row % 2 === 0;
      const zf = facingS ? z + d : z;          // front line
      const hx0 = x, hx1 = x + w, hz0 = z, hz1 = z + d;
      if (!blocked(hx0, hz0, hx1, hz1)) {
        const burned = rng.chance(o.burned ?? 0);
        const [s0, s1] = o.storeys ?? [2, 3];
        const info = house(k, x + w / 2, y, zf, facingS ? 0 : Math.PI, {
          w, d, storeys: rng.int(s0, s1), burned, lit: 0.3, detail: o.detail ?? 'low', seed: rng.int(1, 1e6),
          stoneBase: rng.chance(0.3), roof: rng.chance(0.5) ? 'front' : 'side', shop: rng.chance(0.2),
        });
        if (!burned && rng.chance(0.18)) chimneys.push(new THREE.Vector3(x + w / 2, y + info.ridge + 1, z + d / 2));
        if (burned) {
          rubble(k, x + w / 2 + rng.range(-1, 1), y, zf + (facingS ? 1.2 : -1.2), 1.1, true);
          fallenBeam(k, [x + rng.range(0, w), y + rng.range(3, 6), z + d / 2], [x + rng.range(0, w), y + 0.2, zf + (facingS ? 2 : -2)]);
        }
      }
      x += w + (rng.chance(0.15) ? rng.range(1.5, 3) : 0.05);
    }
    z += rowD + (row % 2 === 0 ? 0.1 : lane);
    row++;
  }
}

export function buildTown(ctx: AreaCtx): TownBuild {
  const rng = new Rng(4242);
  const d = ctx.shared.detail;
  const chimneys: THREE.Vector3[] = [];

  // ---------------------------------------------------------------- ground
  const g = newKit(ctx, 'ground', 90);
  // (the ravine x ∈ [-26, -15], z ∈ [-141, -47] must stay open)
  g.bmm('mud', -14, -0.6, -96, 200, -0.04, 110, { cast: false });
  g.bmm('mud', -30, -0.6, -47, -14, -0.04, 110, { cast: false });
  g.bmm('dirt', -14, -0.6, -300, 200, 2.9, -134, { cast: false });
  g.bmm('dirt', -60, -0.6, -300, -14, 2.9, -141, { cast: false });
  g.bmm('grass_dead', -300, -8, -500, -44, 6, 300, { cast: false });
  g.finish(ctx.root);

  // ---------------------------------------------------------------- town fill (mid-ground, low detail)
  const near = newKit(ctx, 'townNear', 91);
  fillBlock(near, rng, -14, -92, 2, -48, 0, {}, chimneys);                  // between street and courtyard (west)
  fillBlock(near, rng, 18, -94, 62, -48, 0, { burned: 0.75 }, chimneys);    // the burned district (east of the mint)
  fillBlock(near, rng, 24, -46, 62, -4, 0, {}, chimneys);                   // east of the square
  fillBlock(near, rng, -32, -4, 62, 34, 0, { storeys: [2, 3] }, chimneys);  // south of the street
  near.finish(ctx.root);
  const far = newKit(ctx, 'townFar', 92);
  fillBlock(far, rng, 58, -170, 130, -96, 0, { storeys: [2, 4] }, chimneys);
  fillBlock(far, rng, 64, -94, 140, 40, 0, { storeys: [2, 4] }, chimneys);
  fillBlock(far, rng, -30, 36, 140, 90, 0, { storeys: [2, 3] }, chimneys);
  fillBlock(far, rng, -20, -250, 60, -190, 3, { storeys: [2, 3] }, chimneys);
  // a few taller civic buildings/towers in the mid-ground
  spireTower(far, 88, 0, -60, 6, 22, 16);
  spireTower(far, 70, 0, -128, 5, 18, 12, 'stone_wall');
  spireTower(far, 40, 0, 22, 5.5, 20, 14);
  spireTower(far, 110, 0, 10, 7, 26, 20, 'stone_wall');
  spireTower(far, 30, 3, -212, 6, 24, 18);
  far.finish(ctx.root);

  // ---------------------------------------------------------------- backdrop
  const bd = newKit(ctx, 'backdrop', 93);
  skylineRing(bd, 10, -80, 150, 360, -Math.PI * 0.62, Math.PI * 0.72, Math.round(320 * d), 0, 7);
  skylineRing(bd, 10, -80, 180, 320, Math.PI * 0.72, Math.PI * 0.95, Math.round(50 * d), 8, 8);
  cathedral(bd, 235, 0, -30, -Math.PI / 2, 1.2);
  cathedral(bd, 150, 0, -300, -Math.PI / 4, 0.9);
  farKeep(bd, 330, 30, -330, 1.3);
  farKeep(bd, -60, 60, -420, 1.0);
  for (let i = 0; i < Math.round(18 * d); i++) {
    const a = rng.range(-1.9, 1.9), r = rng.range(160, 380);
    spireTower(bd, 10 + Math.cos(a) * r, 0, -80 - Math.sin(a) * r, rng.range(5, 8), rng.range(18, 34), rng.range(12, 26), rng.chance(0.5) ? 'stone_wall' : 'stone_dark');
  }
  mountainRing(bd, 0, -100, 900, Math.round(22 * d) + 6, 11, -40);
  // western heights beyond the watchtower: high rock and dead trees
  rockFace(bd, -60, -200, -60, 20, 0, 34, 95, -1, 8, 'rock_cliff', 7);
  rockFace(bd, -90, -260, -90, 60, 10, 60, 96, -1, 10, 'stone_dark', 9);
  for (let i = 0; i < 12; i++) deadTree(bd, rng.range(-58, -48), rng.range(20, 30), rng.range(-180, 0), rng.range(5, 9));
  for (let i = 0; i < 20; i++) rockProp(bd, rng.range(-56, -40), rng.range(6, 16), rng.range(-160, -20), rng.range(3, 7), 400 + i, 0.8);
  bd.finish(ctx.root);

  // ---------------------------------------------------------------- burned district fire glow + smoke
  const fire = newKit(ctx, 'burnedGlow', 94);
  for (let i = 0; i < 16; i++) fire.box('ember_glow', rng.range(22, 58), 0.1, rng.range(-90, -52), rng.range(0.4, 1.2), 0.1, rng.range(0.4, 1.0), { ry: rng.range(0, 3), cast: false });
  fire.light(0xff6a28, 30, 30, 38, 4, -72, 1);
  fire.finish(ctx.root);
  const burnCols: PuffColumn[] = [];
  for (const [x, z, h] of [[28, -64, 45], [44, -80, 60], [52, -58, 38], [34, -88, 50]] as const) {
    burnCols.push({ pos: new THREE.Vector3(x, 4, z), height: h, size0: 4, size1: 16, count: Math.round(16 * d), life: 20, drift: new THREE.Vector3(18, 0, -10), spread: 4 });
  }
  const burnSmoke = new PuffField(burnCols, { color: 0x34302e, baseColor: 0x8a5a38, opacity: 0.6 }, 13);
  ctx.root.add(burnSmoke.mesh);
  // thin chimney smoke across the town
  const chimCols: PuffColumn[] = chimneys.slice(0, Math.round(26 * d)).map((p) => ({ pos: p, height: 14, size0: 0.8, size1: 5, count: 6, life: 12, drift: new THREE.Vector3(6, 0, -3), spread: 0.3 }));
  const chimSmoke = new PuffField(chimCols, { color: 0x6c6c70, opacity: 0.35 }, 17);
  ctx.root.add(chimSmoke.mesh);

  return { smoke: [burnSmoke, chimSmoke] };
}
