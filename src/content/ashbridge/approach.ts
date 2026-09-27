/**
 * Gate Approach: from the courtyard's north gate (4, 3, -130) a broad stair climbs north under the
 * great gatehouse (gothic arch, heraldic shields and banners, flanking towers with conical slate
 * roofs) to the forecourt at y=8 in front of the Commander's Yard fog gate.
 *
 * Flight A: z -133 → -137 (y 3 → 5.5) · gatehouse passage z -137 → -142 (y 5.5)
 * Flight B: z -142 → -146 (y 5.5 → 8) · forecourt z -146 → -150 (y 8)
 */
import * as THREE from 'three';
import type { EnemySpawn } from '../../world/levelTypes';
import {
  wall, floor, stairs, barrelVault, towerRound, crenellation, wallShield, wallBanner, sconceTorch, corbels,
  bars, rubble, brazier, rockFace, standardBanner, parapet,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, YAW_S } from './common';

export interface ApproachBuild { enemies: EnemySpawn[] }

export function buildApproach(ctx: AreaCtx): ApproachBuild {
  const k = newKit(ctx, 'approach', 71);
  const ax0 = 0, ax1 = 8, cx = 4;

  // ---------------------------------------------------------------- stairs & floors
  stairs(k, 'stone_wall', [cx, 3, -133], [cx, 5.5, -137], ax1 - ax0, { baseY: 3 });
  floor(k, 'flagstone', ax0, -142, ax1, -137, 5.5, 3.0);
  stairs(k, 'stone_wall', [cx, 5.5, -142], [cx, 8, -146], ax1 - ax0, { baseY: 5.5 });
  floor(k, 'flagstone', -1, -150.2, 9, -146, 8, 3.0);
  // a step of fill under the passage floor (the stairs are solid down to their base)
  k.bmm('stone_dark', ax0, 0, -146, ax1, 3, -133, { cast: false, receive: false });

  // ---------------------------------------------------------------- flanking walls
  wall(k, 'stone_wall', ax0 - 0.5, -133, ax0 - 0.5, -137, 0, 11, 1.0);
  wall(k, 'stone_wall', ax1 + 0.5, -133, ax1 + 0.5, -137, 0, 11, 1.0);
  wall(k, 'stone_wall', ax0 - 0.5, -142, ax0 - 0.5, -146, 0, 13, 1.0);
  wall(k, 'stone_wall', ax1 + 0.5, -142, ax1 + 0.5, -146, 0, 13, 1.0);
  wall(k, 'stone_wall', -1.5, -146, -1.5, -150.4, 0, 13, 1.0);
  wall(k, 'stone_wall', 9.5, -146, 9.5, -150.4, 0, 13, 1.0);
  crenellation(k, 'stone_wall', ax0 - 0.5, -133, ax0 - 0.5, -137, 11, 1.0, { col: false });
  crenellation(k, 'stone_wall', ax1 + 0.5, -133, ax1 + 0.5, -137, 11, 1.0, { col: false });
  crenellation(k, 'stone_wall', -1.5, -142, -1.5, -150.4, 13, 1.0, { col: false });
  crenellation(k, 'stone_wall', 9.5, -142, 9.5, -150.4, 13, 1.0, { col: false });
  k.bmm('stone_wall', ax0 - 1, 0, -146.5, ax0, 13, -146, { col: true });
  k.bmm('stone_wall', ax1, 0, -146.5, ax1 + 1, 13, -146, { col: true });

  // ---------------------------------------------------------------- the great gatehouse
  // gatehouse faces sit exactly where the stairs meet the passage floor (no lips)
  const gz0 = -141.5, gz1 = -137.5, gxa = -9, gxb = 17, top = 24;
  const faceS = gz1 + 0.5, faceN = gz0 - 0.5;
  const arch = { u: cx - (gxa + gxb) / 2, w: ax1 - ax0, sill: 5.5, h: 4.4, kind: 'pointed' as const, rise: 5.2 };
  wall(k, 'stone_wall', gxa, gz1, gxb, gz1, 0, top, 1.0, { openings: [arch] });
  wall(k, 'stone_wall', gxa, gz0, gxb, gz0, 0, top, 1.0, { openings: [arch] });
  k.bmm('stone_wall', gxa, 0, gz0 + 0.5, ax0 - 0.5, top, gz1 - 0.5, { col: true });
  k.bmm('stone_wall', ax1 + 0.5, 0, gz0 + 0.5, gxb, top, gz1 - 0.5, { col: true });
  k.bmm('stone_wall', ax0 - 0.5, 15, gz0 + 0.5, ax1 + 0.5, top, gz1 - 0.5, { col: false });
  // passage side walls + vault
  wall(k, 'stone_wall', ax0 - 0.25, gz0 + 0.5, ax0 - 0.25, gz1 - 0.5, 5.5, 4.4, 0.5);
  wall(k, 'stone_wall', ax1 + 0.25, gz0 + 0.5, ax1 + 0.25, gz1 - 0.5, 5.5, 4.4, 0.5);
  barrelVault(k, 'stone_wall', cx, 9.9, gz0 + 0.5, 0, 4, gz1 - gz0 - 1, 0.5, 10);
  // raised portcullis tucked into the arch head
  bars(k, cx, 12.2, faceS - 0.3, 0, 6.8, 2.6, 0.45);
  // archivolts (pointed trims) and a hood mould
  for (const z of [faceS + 0.02, faceN - 0.02]) {
    const s = z > gz0 ? 1 : -1;
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI, a1 = ((i + 1) / 12) * Math.PI;
      const r = 4.6 + 0.4;
      const p0 = pointedPt(cx, 9.9, 4.4, 5.2, a0, r), p1 = pointedPt(cx, 9.9, 4.4, 5.2, a1, r);
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      k.box('stone_trim', (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, z + s * 0.12, L + 0.08, 0.5, 0.3, { rz: ang, cast: false });
    }
  }
  // string courses, machicolations, crenellations
  for (const y of [15.5]) k.bmm('stone_trim', gxa - 0.1, y - 0.25, faceN - 0.15, gxb + 0.1, y, faceS + 0.15, { cast: false });
  corbels(k, 'stone_trim', gxa, faceN, gxb, faceS, top, 0.7, 1.2);
  k.bmm('stone_wall', gxa - 0.7, top, faceN - 0.7, gxb + 0.7, top + 0.6, faceS + 0.7);
  crenellation(k, 'stone_wall', gxa - 0.4, faceS + 0.4, gxb + 0.4, faceS + 0.4, top + 0.6, 0.6, { col: false });
  crenellation(k, 'stone_wall', gxa - 0.4, faceN - 0.4, gxb + 0.4, faceN - 0.4, top + 0.6, 0.6, { col: false });
  // flanking round towers with tall conical slate roofs (the concept-art silhouette)
  towerRound(k, 'stone_wall', gxa - 1.5, 0, (gz0 + gz1) / 2, 4.2, 31, 12);
  towerRound(k, 'stone_wall', gxb + 1.5, 0, (gz0 + gz1) / 2, 4.2, 31, 12);
  for (const x of [gxa - 1.5, gxb + 1.5]) k.bmm('window_warm', x - 0.35, 26, (gz0 + gz1) / 2 + 4.15, x + 0.35, 27.4, (gz0 + gz1) / 2 + 4.3, { cast: false });
  // heraldry: three shields above the arch, great banners either side (both faces)
  for (const [i, sx] of [-3.2, 0, 3.2].entries()) wallShield(k, cx + sx, 18.2 - (i === 1 ? -0.5 : 0), faceS + 0.02, 0, 1.6);
  wallBanner(k, cx - 7.2, 21.5, faceS, 0, 2.2, 7.5);
  wallBanner(k, cx + 7.2, 21.5, faceS, 0, 2.2, 7.5);
  wallBanner(k, cx - 7.2, 21.5, faceN, Math.PI, 2.2, 7.5);
  wallBanner(k, cx + 7.2, 21.5, faceN, Math.PI, 2.2, 7.5);
  wallShield(k, cx, 18.7, faceN - 0.02, Math.PI, 1.6);
  // torches in the passage + one light
  sconceTorch(k, ax0, 7.4, -139.5, Math.PI / 2);
  sconceTorch(k, ax1, 7.4, -139.5, -Math.PI / 2);
  k.light(0xff9c50, 8, 12, cx, 8, -139.5, 1);
  brazier(k, -0.3, 8, -147.6, true, 0.9);
  brazier(k, 8.3, 8, -147.6, true, 0.9);
  k.light(0xffa860, 6, 11, cx, 9.6, -147.8, 0.8);
  standardBanner(k, -0.5, 8, -146.6, 0.4, 4.5, 1.0, 2.2);
  rubble(k, 7.2, 5.5, -141.2, 0.6, false);

  // ---------------------------------------------------------------- surroundings (visual)
  // raised ground west/east of the approach, rocks, a walled terrace up to the arena
  k.bmm('stone_dark', -24, -1, -150, gxa - 5, 5, -133, { cast: false });
  k.bmm('stone_dark', gxb + 5, -1, -150, 34, 5, -133, { cast: false });
  rockFace(k, -24, -150, -14, -134, 5, 10, 81, 1, 3);
  parapet(k, 'stone_wall', gxb + 6, -133.5, 30, -133.5, 5, 0.5, 1.0, { col: false });

  const enemies: EnemySpawn[] = [
    // one holds the gatehouse passage (flat landing, walls either side — no ledges to be knocked off)
    { id: 'ash_gate_inf_1', kind: 'infantry', anchor: anchor(cx + 1.2, 5.5, -139.8, YAW_S), leash: 10, idleAnim: 'stand' },
    // one waits in the forecourt corner beside the fog, joins when the player crests the stair
    { id: 'ash_gate_inf_2', kind: 'infantry', anchor: anchor(6.4, 8, -147.1, YAW_S - 0.5), leash: 9, idleAnim: 'stand' },
  ];
  return { enemies };
}

/** Point on a pointed arch outline (spring at ys, half-span hs, rise R), a ∈ [0, π] left→right, offset radius. */
function pointedPt(cx: number, ys: number, hs: number, R: number, a: number, out: number): [number, number] {
  // approximate by an ellipse through the springing points and apex, pushed outward
  const t = a / Math.PI; // 0 left, 1 right
  const x = cx - hs + 2 * hs * t;
  const e = 1 - Math.abs(2 * t - 1);
  const y = ys + R * Math.sqrt(Math.max(0, e * (2 - e))) * (0.7 + 0.3 * e);
  const nx = (x - cx) / hs, len = Math.hypot(nx, 1);
  return [x + (nx / len) * (out - hs), y + (1 / len) * (out - hs) * 0.4];
}

export const APPROACH_ZONE = new THREE.Box3(new THREE.Vector3(-2, 2, -149.6), new THREE.Vector3(10, 16, -133));
