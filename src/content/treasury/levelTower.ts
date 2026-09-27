/**
 * The Vault Tower: a massive stone keep (28 × 28 m) rising from the vault yard behind the Hall of
 * Weights, its open belfry holding the Treasury Great Bell — copper-bronze split by golden cracks,
 * clamped by a gilded lock-yoke (the anchor). The landmark is visible up the canal from the entry
 * Stillbell. Inside, the tower is hollow: its floor, 3 m below the market, is the Vault of Futures
 * (Treasurer Aurel Mask's arena), open to the bell 50 m above. Four ward-coffer plinths stand in
 * the corners.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, DynamicPiece } from '../../world/levelTypes';
import { wall, cyl, sphere, crenellation, brazier, buttress, extrudeXY, archPoints, cone, pyramid } from '../../world/kit';
import { type AreaCtx, newKit, anchor, P, Y, V, BELL, YAW_N, YAW_S } from './levelPlan';
import { slab } from './levelRooms';
import { fogGate, greatBell } from './levelPieces';

export interface TowerBuild {
  arena: ArenaLayout;
  coffers: Anchor[];
  anchors: Record<string, Anchor>;
  bell: THREE.Group;
  update(time: number): void;
}

export function buildTower(ctx: AreaCtx): TowerBuild {
  const k = newKit(ctx, 'tower', 601, Y.canal);
  const T = P.tower, t = T.t;
  const C = P.arena.c;
  const top = T.top;
  const midX = (T.x0 + T.x1) / 2, midZ = (T.z0 + T.z1) / 2;

  // ================================================================ the vault yard (a raised court hiding the vaults)
  const yard = newKit(ctx, 'yard', 602, 4.4);
  yard.bmm('flagstone', -48, 3.9, -160, 42, 4.4, P.hall.z0, { cast: false, receive: true });
  // yard walls and a few outbuildings (seen past the hall from the market)
  yard.bmm('stone_wall', -48, 4.4, -161, 42, 10, -159);
  yard.bmm('stone_wall', -49, 4.4, -161, -47, 10, P.hall.z0);
  yard.bmm('stone_wall', 41, 4.4, -161, 43, 10, P.hall.z0);
  for (const [x, z, w, d, h] of [[-38, -150, 10, 8, 9], [34, -148, 9, 10, 8], [-40, -96, 8, 10, 7], [33, -94, 10, 8, 10]] as const) {
    yard.bmm('stone_dark', x - w / 2, 4.4, z - d / 2, x + w / 2, 4.4 + h, z + d / 2);
    yard.add('roof_slate', pyramid(w + 0.8, d + 0.8, 4), { x, y: 4.4 + h, z });
  }

  // ================================================================ tower shaft walls (y −3.2 → 32)
  const fogW = 5, fogH = 5.6;
  const shaftTop = 32;
  // south wall with the veil opening
  wall(k, 'stone_wall', T.x0, T.z1 - t / 2, T.x1, T.z1 - t / 2, Y.canal, shaftTop - Y.canal, t, {
    openings: [{ u: C.x - midX, w: fogW + 0.2, sill: 0, h: fogH - 1.4, kind: 'pointed', rise: 1.4 }],
  });
  wall(k, 'stone_wall', T.x0, T.z0 + t / 2, T.x1, T.z0 + t / 2, Y.canal, shaftTop - Y.canal, t);
  wall(k, 'stone_wall', T.x0 + t / 2, T.z0, T.x0 + t / 2, T.z1, Y.canal, shaftTop - Y.canal, t);
  wall(k, 'stone_wall', T.x1 - t / 2, T.z0, T.x1 - t / 2, T.z1, Y.canal, shaftTop - Y.canal, t);
  // exterior dressing: plinth, string courses, buttresses, the treasury plate on every face
  for (const yy of [4.4, 14, 24, shaftTop - 0.4]) k.bmm('stone_trim', T.x0 - 0.35, yy, T.z0 - 0.35, T.x1 + 0.35, yy + 0.45, T.z1 + 0.35, { cast: false });
  for (const [x, z, yaw] of [[T.x0 + 3, T.z1, YAW_S], [T.x1 - 3, T.z1, YAW_S], [T.x0 + 3, T.z0, YAW_N], [T.x1 - 3, T.z0, YAW_N]] as const) buttress(k, 'stone_wall', x, 4.4, z, yaw, 22, 2.2, 1.6);
  for (const [x, z, yaw] of [[midX, T.z1 + 0.05, 0], [midX, T.z0 - 0.05, Math.PI], [T.x0 - 0.05, midZ, -Math.PI / 2], [T.x1 + 0.05, midZ, Math.PI / 2]] as const) {
    k.push(x, 19, z, yaw);
    k.bmm('bronze', -2.2, -2.8, 0, 2.2, 2.8, 0.35);
    k.bmm('iron', -2.4, -3.0, -0.05, 2.4, -2.6, 0.45, { cast: false });
    k.bmm('iron', -2.4, 2.6, -0.05, 2.4, 3.0, 0.45, { cast: false });
    for (const [cx, cy] of [[-1.9, -2.3], [1.9, -2.3], [-1.9, 2.3], [1.9, 2.3]]) k.add('iron', sphere(0.16, 8, 6), { x: cx, y: cy, z: 0.38 }, { cast: false });
    // keyhole
    k.add('cloth_black', cyl(0.5, 0.5, 0.06, 16), { y: 0.7, z: 0.37, rx: Math.PI / 2 }, { cast: false });
    k.add('cloth_black', extrudeXY([[-0.5, -1.9], [0.5, -1.9], [0.22, 0.6], [-0.22, 0.6]], 0.06), { z: 0.37 }, { cast: false });
    k.pop();
  }
  // tall slit windows glowing with lamplight
  for (let i = 0; i < 3; i++) for (const [x, z, yaw] of [[T.x0 + 6 + i * 8, T.z1 + 0.02, 0], [T.x1 + 0.02, T.z0 + 6 + i * 8, Math.PI / 2]] as const) {
    k.push(x, 26, z, yaw);
    k.box('window_warm', 0, 0, 0, 0.4, 2.6, 0.08, { cast: false });
    k.pop();
  }

  // ================================================================ belfry (y 32 → 54)
  const bf = newKit(ctx, 'belfry', 603, shaftTop);
  const opening = { u: 0, w: 16, sill: 2, h: 8.5, kind: 'pointed' as const, rise: 5.5 };
  wall(bf, 'stone_wall', T.x0, T.z1 - t / 2, T.x1, T.z1 - t / 2, shaftTop, top - shaftTop, t, { openings: [opening], col: false });
  wall(bf, 'stone_wall', T.x0, T.z0 + t / 2, T.x1, T.z0 + t / 2, shaftTop, top - shaftTop, t, { openings: [opening], col: false });
  wall(bf, 'stone_wall', T.x0 + t / 2, T.z0, T.x0 + t / 2, T.z1, shaftTop, top - shaftTop, t, { openings: [opening], col: false });
  wall(bf, 'stone_wall', T.x1 - t / 2, T.z0, T.x1 - t / 2, T.z1, shaftTop, top - shaftTop, t, { openings: [opening], col: false });
  // arch rings on the belfry openings
  for (const [x, z, yaw] of [[midX, T.z1, 0], [midX, T.z0, Math.PI], [T.x0, midZ, -Math.PI / 2], [T.x1, midZ, Math.PI / 2]] as const) {
    bf.push(x, shaftTop, z, yaw);
    const ring = archPoints(-8, 8, opening.sill + opening.h, 'pointed', opening.rise, 10);
    const pts: [number, number][] = [[-8, opening.sill + opening.h], ...ring, [8, opening.sill + opening.h]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      bf.box('stone_trim', (ax + bx) / 2, (ay + by) / 2 + 0.25, 0.1, Math.hypot(bx - ax, by - ay) + 0.1, 0.5, 0.35, { rz: Math.atan2(by - ay, bx - ax), cast: false });
    }
    bf.box('stone_trim', 0, opening.sill - 0.1, 0.1, 16.6, 0.4, 0.5, { cast: false });
    bf.pop();
  }
  // crown: cornice, crenellations, four corner pinnacles with gilt finials
  bf.bmm('stone_trim', T.x0 - 0.6, top, T.z0 - 0.6, T.x1 + 0.6, top + 0.7, T.z1 + 0.6);
  crenellation(bf, 'stone_wall', T.x0 - 0.3, T.z1 + 0.3, T.x1 + 0.3, T.z1 + 0.3, top + 0.7, 0.6, { col: false });
  crenellation(bf, 'stone_wall', T.x0 - 0.3, T.z0 - 0.3, T.x1 + 0.3, T.z0 - 0.3, top + 0.7, 0.6, { col: false });
  crenellation(bf, 'stone_wall', T.x0 - 0.3, T.z0 - 0.3, T.x0 - 0.3, T.z1 + 0.3, top + 0.7, 0.6, { col: false });
  crenellation(bf, 'stone_wall', T.x1 + 0.3, T.z0 - 0.3, T.x1 + 0.3, T.z1 + 0.3, top + 0.7, 0.6, { col: false });
  for (const [x, z] of [[T.x0, T.z0], [T.x1, T.z0], [T.x0, T.z1], [T.x1, T.z1]] as const) {
    bf.bmm('stone_wall', x - 1.8, top, z - 1.8, x + 1.8, top + 5, z + 1.8);
    bf.add('roof_slate', cone(2.4, 7, 8), { x, y: top + 5, z });
    bf.add('gold_trim', sphere(0.4, 8, 6), { x, y: top + 12.2, z }, { cast: false });
  }
  // belfry beams (the bell hangs from the middle pair)
  for (const dz of [-1.2, 1.2]) bf.bmm('timber_dark', T.x0 + t, BELL.y + 1.0, BELL.z + dz - 0.45, T.x1 - t, BELL.y + 2.0, BELL.z + dz + 0.45);
  for (const dx of [-6, 6]) bf.bmm('timber_dark', BELL.x + dx - 0.4, BELL.y + 2.0, T.z0 + t, BELL.x + dx + 0.4, BELL.y + 2.7, T.z1 - t);
  // hanging chains in the shaft, lit from above
  for (const [x, z] of [[1.5, -116], [18.5, -132], [3, -131], [17, -117]] as const) k.add('iron', cyl(0.08, 0.08, 34, 5), { x, y: 8, z }, { cast: false });

  // ================================================================ the Vault of Futures (interior, y −3.2)
  const ak = newKit(ctx, 'vault-arena', 611, Y.canal);
  const IX0 = T.x0 + t, IX1 = T.x1 - t, IZ0 = T.z0 + t, IZ1 = T.z1 - t;
  slab(ak, 'flagstone', IX0, IZ0, IX1, IZ1, Y.canal);
  slab(ak, 'flagstone', C.x - fogW / 2 - 0.1, IZ1, C.x + fogW / 2 + 0.1, T.z1, Y.canal);
  // the ledger wheel inlaid in the floor: bronze rings, twelve spokes, a keyhole at the hub
  for (const [r0, r1, mat] of [[2.0, 2.35, 'bronze'], [7.6, 8.0, 'gold_trim'], [11.2, 11.5, 'bronze']] as const) {
    ak.add(mat, new THREE.RingGeometry(r0, r1, 64).rotateX(-Math.PI / 2), { x: C.x, y: Y.canal + 0.012, z: C.z }, { cast: false });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ak.box('bronze', C.x + Math.sin(a) * 5, Y.canal + 0.01, C.z + Math.cos(a) * 5, 0.14, 0.02, 5.4, { ry: a, cast: false });
  }
  ak.add('bronze', cyl(0.55, 0.55, 0.03, 16), { x: C.x, y: Y.canal + 0.005, z: C.z - 0.35 }, { cast: false });
  ak.add('bronze', extrudeXY([[-0.5, 0], [0.5, 0], [0.22, 1.5], [-0.22, 1.5]], 0.03).rotateX(-Math.PI / 2), { x: C.x, y: Y.canal + 0.02, z: C.z + 0.1 }, { cast: false });
  // blind arcade around the base, a gallery ledge at y ≈ 9 (unreachable) with gilt ledgers
  for (const [x0, z0, x1, z1] of [[IX0, IZ1, IX1, IZ1], [IX0, IZ0, IX1, IZ0], [IX0, IZ0, IX0, IZ1], [IX1, IZ0, IX1, IZ1]] as const) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = 6;
    const yaw = Math.atan2(-(z1 - z0), x1 - x0);
    ak.push((x0 + x1) / 2, Y.canal, (z0 + z1) / 2, yaw);
    const inward = z0 === IZ1 && z1 === IZ1 ? -1 : z0 === IZ0 && z1 === IZ0 ? 1 : x0 === IX0 ? 1 : -1;
    const side = (z0 === z1) ? inward : -inward;
    for (let i = 0; i < n; i++) {
      const cx = -L / 2 + (L * (i + 0.5)) / n;
      if (Math.abs(cx) < 3.2 && z0 === IZ1 && z1 === IZ1) continue; // the veil opening
      const w = L / n - 1.0;
      const pts: [number, number][] = [[cx - w / 2, 0.4], [cx + w / 2, 0.4], [cx + w / 2, 4.2], ...archPoints(cx - w / 2, cx + w / 2, 4.2, 'pointed', w * 0.6).reverse(), [cx - w / 2, 4.2]];
      ak.add('stone_dark', extrudeXY(pts, 0.1), { z: side * 0.05 }, { cast: false });
      ak.add('stone_trim', cyl(0.3, 0.34, 6.2, 8), { x: cx + L / n / 2, y: 0, z: side * 0.28 }, { cast: false });
    }
    ak.bmm('stone_trim', -L / 2, 9.0, side > 0 ? 0 : -1.4, L / 2, 9.5, side > 0 ? 1.4 : 0, { cast: false });
    for (let i = 0; i < 14; i++) ak.box('stone_trim', -L / 2 + 0.8 + (i * (L - 1.6)) / 13, 8.4, side * 0.6, 0.5, 1.2, 1.1, { cast: false });
    ak.pop();
  }
  // coffer plinths in the corners (ward-coffers stand on them; braziers light them)
  const coffers: Anchor[] = [];
  const cofferLights: THREE.PointLight[] = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const x = C.x + sx * 9.4, z = C.z + sz * 9.4;
    ak.add('stone_trim', cyl(1.5, 1.7, 0.3, 16), { x, y: Y.canal, z });
    ak.colGeo(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 12).translate(0, 0.15, 0), { x, y: Y.canal, z });
    ak.add('gold_trim', new THREE.RingGeometry(1.15, 1.3, 24).rotateX(-Math.PI / 2), { x, y: Y.canal + 0.31, z }, { cast: false });
    brazier(ak, x - sx * 0.2 + sx * 2.1, Y.canal, z - sz * 1.2, true, 0.9);
    coffers.push(anchor(x, Y.canal + 0.3, z, Math.atan2(C.x - x, C.z - z)));
  }
  cofferLights.push(ak.light(0xffc070, 7, 13, C.x - 7, Y.canal + 1.8, C.z + 7, 0.7));
  cofferLights.push(ak.light(0xffc070, 7, 13, C.x + 7, Y.canal + 1.8, C.z - 7, 0.7));
  ak.light(0xffe0b0, 5, 30, C.x, Y.canal + 18, C.z, 0);

  // ================================================================ the bell and its anchor
  const gb = greatBell(ctx, BELL.x, BELL.y, BELL.z, BELL.h, Y.canal, P.arena.r);
  // the veil
  const fog = fogGate(ctx, 'tr:fogAurel', C.x, Y.canal, T.z1 - t / 2, YAW_S, fogW, fogH);
  const arena: ArenaLayout = {
    bossId: 'aurelmask', center: C.clone(), radius: P.arena.r, fogGate: fog,
    entry: anchor(C.x, Y.canal, P.ante.z0 + 2.6, YAW_N),
    spawn: anchor(C.x, Y.canal, C.z - 5.5, YAW_S),
    onDefeat: [gb.anchor as DynamicPiece],
  };
  const anchors: Record<string, Anchor> = {
    arenaCentre: anchor(C.x, Y.canal, C.z, YAW_S),
    bellView: anchor(BELL.x, BELL.y - BELL.h * 0.5, BELL.z, 0),
  };
  return {
    arena, coffers, anchors, bell: gb.bell,
    update(_time: number) {},
  };
}

export { V };
