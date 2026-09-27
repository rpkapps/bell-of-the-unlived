/**
 * The secret way to the Branding Cell: behind the loose name-plate in the Nameless Nave (F3, west
 * wall) a covered stair clings to the tower's west face and descends to a bridge over the Windward
 * Ledge; the bridge ends in the crag at the Branding Cell, a round rock chamber where the Condemned
 * Bellkeeper still tends the brazier and the brands. Veil at the cell mouth; his confession lies on
 * the anvil at the back once he is at rest.
 */
import * as THREE from 'three';
import type { ArenaLayout, DynamicPiece } from '../../world/levelTypes';
import { floor, stairs, wall, brazier, anvil, rockProp, cyl, rubble } from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import { type BCtx, PLAN, newKit, anchor, parapetWall, fogGate, YAW_E, YAW_W, YAW_N } from './levelCommon';

export interface CellBuild { arena: ArenaLayout }

export function buildCell(ctx: BCtx): CellBuild {
  const k = newKit(ctx, 'cell', 601, 7);
  const cv = PLAN.covered, H = PLAN.H;
  const xm = (cv.x0 + cv.x1) / 2;
  // ---------------------------------------------------------------- the covered stair (west face)
  // landing outside the ossuary door (y 14)
  floor(k, 'flagstone', cv.x0, cv.zTop, -H, cv.zTop + 2.8, cv.y1, 0.5);
  stairs(k, 'stone_wall', [xm, cv.y0, cv.zBottom], [xm, cv.y1, cv.zTop], cv.x1 - cv.x0, { floating: true });
  // platform at the foot of the stair (y 7) and the bridge west into the crag
  floor(k, 'flagstone', cv.x0 - 0.6, -10, -H, cv.zBottom, cv.y0, 0.6);
  const bz0 = PLAN.cell.c.z - 1.6, bz1 = PLAN.cell.c.z + 1.6;
  floor(k, 'flagstone', PLAN.cell.gateX - 0.2, bz0, cv.x0 - 0.6, bz1, cv.y0, 0.6);
  // outer wall of the covered stair: arcades open to the storm, and a lean-to roof
  const run = cv.zTop - cv.zBottom;
  for (let i = 0; i < 4; i++) {
    const z = cv.zBottom + 1.4 + i * (run / 4);
    const yy = cv.y0 + (7 * (z - cv.zBottom)) / run;
    k.box('stone_wall', cv.x0 - 0.2, yy + 1.6, z, 0.4, 3.6, 0.45);
  }
  {
    const len = Math.hypot(run, 7), ang = Math.atan2(7, run);
    k.box('stone_wall', cv.x0 - 0.2, cv.y0 + 3.5 + 0.55, (cv.zTop + cv.zBottom) / 2, 0.4, 1.1, len, { rx: -ang });
    k.box('stone_trim', cv.x0 - 0.2, cv.y0 + 3.5 + 1.15, (cv.zTop + cv.zBottom) / 2, 0.5, 0.12, len, { rx: -ang, cast: false });
    k.box('roof_slate', (cv.x0 + cv.x1) / 2 - 0.3, cv.y0 + 3.5 + 3.8, (cv.zTop + cv.zBottom) / 2, cv.x1 - cv.x0 + 1.2, 0.2, len + 1.5, { rx: -ang, rz: -0.25 });
    for (let i = 0; i < 10; i++) {
      const za = cv.zBottom + (run * i) / 10, zb = cv.zBottom + (run * (i + 1)) / 10;
      const ya = cv.y0 + (7 * i) / 10;
      k.solid(cv.x0 - 0.4, ya, za, cv.x0, ya + 0.7 + 1.4, zb);
    }
  }
  parapetWall(k, cv.x0 - 0.6, cv.zTop, cv.x0 - 0.6, cv.zTop + 2.8, cv.y1, 0.4);
  parapetWall(k, cv.x0, cv.zTop + 2.55, -H, cv.zTop + 2.55, cv.y1, 0.4);
  parapetWall(k, cv.x0 - 0.35, -10, cv.x0 - 0.35, bz0, cv.y0, 0.4);
  parapetWall(k, cv.x0 - 0.6, -9.75, -H, -9.75, cv.y0, 0.4);
  parapetWall(k, cv.x0 - 0.35, bz1, cv.x0 - 0.35, cv.zBottom, cv.y0, 0.4);
  parapetWall(k, PLAN.cell.gateX, bz0 + 0.2, cv.x0 - 0.6, bz0 + 0.2, cv.y0, 0.4);
  parapetWall(k, PLAN.cell.gateX, bz1 - 0.2, cv.x0 - 0.6, bz1 - 0.2, cv.y0, 0.4);
  // corbels and piers carrying it on the tower face
  for (const z of [-9, -3, 3, 8.8]) k.bmm('stone_wall', cv.x0 - 0.3, z > 7 ? 11 : -1, z - 0.4, cv.x0 + 0.5, z > 7 ? 13.5 : 6.4, z + 0.4, { cast: true, col: true });
  k.bmm('stone_dark', PLAN.cell.gateX - 0.2, -2, bz0 + 0.2, cv.x0 - 0.6, 6.4, bz1 - 0.2, { cast: false });
  k.light(0xffa860, 3.5, 7, cv.x1 - 0.4, cv.y1 + 2.4, cv.zTop + 1.4, 0.8);
  k.light(0xff8a50, 3.5, 7, cv.x0 + 0.4, cv.y0 + 2.4, -7, 0.8);

  // ---------------------------------------------------------------- the Branding Cell
  const C = PLAN.cell.c, R = PLAN.cell.r;
  const disc = new THREE.CylinderGeometry(R + 0.8, R + 0.8, 1, 36);
  k.add('flagstone', disc.clone(), { x: C.x, y: C.y - 0.5, z: C.z }, { cast: false });
  k.colGeo(disc, { x: C.x, y: C.y - 0.5, z: C.z }, 'stone');
  k.add('stone_dark', new THREE.CylinderGeometry(R + 0.6, R - 2, 42, 20, 2, true), { x: C.x, y: C.y - 21.5, z: C.z }, { cast: false });
  // rock wall ring with the mouth at the east (toward the bridge)
  const mouth = 0.34;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < mouth) continue; // east = angle 0
    const x = C.x + Math.cos(a) * (R + 0.9), z = C.z + Math.sin(a) * (R + 0.9);
    k.add('rock_cliff', new THREE.IcosahedronGeometry(1.6 + (i % 3) * 0.5, 0), { x, y: C.y + 1.2 + (i % 4) * 0.8, z, s: [1, 2.2, 1] }, { cast: false });
    k.add('stone_dark', new THREE.BoxGeometry(2.4, 7.5, 1.2), { x, y: C.y + 3.2, z, ry: -a + Math.PI / 2 }, { cast: false });
  }
  const ringCol = new THREE.CylinderGeometry(R + 0.35, R + 0.35, 7, 30, 1, true, Math.PI / 2 + mouth, Math.PI * 2 - mouth * 2);
  k.colGeo(ringCol, { x: C.x, y: C.y + 3.5, z: C.z }, 'stone');
  // a low rock dome overhead (visual)
  const dome = new THREE.SphereGeometry(R + 1.6, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  dome.scale(1, 0.55, 1);
  const di = dome.index;
  if (di) { const arr = di.array as Uint16Array | Uint32Array; for (let i = 0; i < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; } }
  dome.computeVertexNormals();
  k.add('rock_cliff', dome, { x: C.x, y: C.y + 5.2, z: C.z }, { cast: false });
  // mouth jambs
  for (const s of [-1, 1]) k.bmm('stone_dark', PLAN.cell.gateX - 1.4, C.y, C.z + s * 1.8 - 0.4, PLAN.cell.gateX + 0.1, C.y + 5.2, C.z + s * 1.8 + 0.4, { col: true });
  k.bmm('stone_trim', PLAN.cell.gateX - 1.5, C.y + 4.6, C.z - 2.3, PLAN.cell.gateX + 0.2, C.y + 5.3, C.z + 2.3, { col: false });
  // the brazier of brands, the rack, the anvil with the confession, chains from the dome
  brazier(k, C.x - 1.5, C.y, C.z + 3.8, true, 1.3);
  for (let i = 0; i < 5; i++) k.add('iron', cyl(0.02, 0.02, 1.4, 5), { x: C.x - 1.5 + (i - 2) * 0.12, y: C.y + 1.1, z: C.z + 3.8, rz: 0.4 + i * 0.05 }, { cast: false });
  anvil(k, C.x - 5.8, C.y, C.z, YAW_E);
  ctx.anchors.confession = anchor(C.x - 4.4, C.y, C.z, YAW_W);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const cx = C.x + Math.cos(a) * 5.2, cz = C.z + Math.sin(a) * 5.2;
    k.add('iron', cyl(0.035, 0.035, 5, 4), { x: cx, y: C.y + 4.2, z: cz }, { cast: false });
    k.add('bronze_bell', new THREE.ConeGeometry(0.25, 0.4, 10, 1, true), { x: cx, y: C.y + 3.9, z: cz }, { cast: false });
  }
  rubble(k, C.x + 3, C.y, C.z - 5.5, 0.6, true);
  rockProp(k, C.x - 4, C.y, C.z + 6, 1.1, 5, 0.5);
  const brazierPiece = cellBrazier(ctx, C.x - 1.5, C.y, C.z + 3.8);
  const fog = fogGate(ctx, 'bellkeeper', PLAN.cell.gateX, C.y, C.z, YAW_W, 3.2, 4.4);

  const arena: ArenaLayout = {
    bossId: 'bellkeeper', center: C.clone(), radius: R,
    fogGate: fog, entry: fog.anchor,
    spawn: anchor(C.x - 2.5, C.y, C.z, YAW_E),
    onDefeat: [brazierPiece],
  };
  void wall; void getMaterial; void YAW_N;
  return { arena };
}

/** The brazier's fire (a registered flame light); set(1) = burnt out when the Bellkeeper rests. */
function cellBrazier(ctx: BCtx, x: number, y: number, z: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'cellBrazier';
  ctx.dynamicRoot.add(root);
  const light = new THREE.PointLight(0xff7a30, 14, 16, 1.8);
  light.position.set(x, y + 1.9, z);
  root.add(light);
  registerLight(light, { flicker: true });
  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), getMaterial('ember_glow'));
  coals.position.set(x, y + 1.15, z);
  root.add(coals);
  const piece: DynamicPiece = {
    object: root,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      light.intensity = 14 * (1 - e) + 1.5 * e;
      light.userData.baseIntensity = light.intensity;
      coals.scale.setScalar(1 - e * 0.6);
    },
  };
  piece.set(0);
  return piece;
}
