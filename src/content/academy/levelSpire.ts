/**
 * The upper campus: the Spire Yard (third Stillbell, the drawbridge shortcut down to the Hall's
 * gallery), the Unfinished Spire (a pale tower built by a future that was erased, climbed by
 * scaffold stairs), and the Observatory of Lenses on its pinnacle (Keeper Orrow's arena) with the
 * Great Bell's tower behind it. The Observatory floor is made of lens-plates the region drives.
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import {
  floor, parapet, stairs, stillbellShrine, bellPost, crateStack, barrel, cyl, sphere, cone, bound, masonsTools, rubble, ringSector,
  bellGeo, type StillbellShrine, bracketLantern, towerRound, column, mergeSimple,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import {
  type AreaCtx, type Piece, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, scaffold, chain, cliffWall, academyMark,
  lensApparatus, lever, drawbridge, fogGate, glowMat, addMat, box3,
} from './levelCommon';

/** One lens-plate of the Observatory floor. */
export interface LensPlate {
  index: number;
  ring: number;
  /** Centre (world) and angular/radial extent. */
  centre: THREE.Vector3;
  r0: number; r1: number; a0: number; a1: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  /** Warning glyph (a broken ring round a notched diamond): SHAPE, not colour alone. */
  glyph: THREE.Object3D;
  /** Light column shown while the plate burns. */
  column: THREE.Mesh;
  /** Neighbour plates (sharing an edge). */
  neighbours: number[];
}

export interface ObservatoryFloor {
  centre: THREE.Vector3;
  radius: number;
  plates: LensPlate[];
  /** Plate under a world point (or -1). */
  plateAt(p: THREE.Vector3): number;
  /** Visual state per plate: 0 idle, 1 warning (k = 0..1 progress), 2 burning, 3 cooling. */
  setState(i: number, state: 0 | 1 | 2 | 3, k: number, time: number): void;
}

export interface SpireBuild {
  shrine: StillbellShrine;
  enemies: EnemySpawn[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, Piece>;
  triggers: Record<string, THREE.Box3>;
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
  arena: { fogGate: ReturnType<typeof fogGate>; anchorLens: Piece; floor: ObservatoryFloor };
  greatBell: THREE.Object3D;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildSpire(ctx: AreaCtx): SpireBuild {
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, Piece> = {};
  const triggers: Record<string, THREE.Box3> = {};
  const enemies: EnemySpawn[] = [];

  // ================================================================== the spire yard
  const k = newKit(ctx, 'yard', 601, 24);
  const Yd = PLAN.yard, Y = Yd.y, DB = PLAN.drawbridge, S = PLAN.spire, AR = PLAN.arena;
  floor(k, 'cobble', Yd.x0, Yd.z0, Yd.x1, Yd.z1, Y, 0.6);
  k.bmm('stone_dark', Yd.x0, -4, Yd.z0, Yd.x1, Y - 0.6, Yd.z1, { cast: false });
  parapet(k, 'stone_wall', Yd.x0, Yd.z1, DB.x - DB.w / 2 - 0.2, Yd.z1, Y, 0.5, 1.05);
  parapet(k, 'stone_wall', DB.x + DB.w / 2 + 0.2, Yd.z1, Yd.x1, Yd.z1, Y, 0.5, 1.05);
  parapet(k, 'stone_wall', Yd.x0, Yd.z1, Yd.x0, PLAN.scaffoldTop.z1, Y, 0.5, 1.05);
  parapet(k, 'stone_wall', Yd.x0, PLAN.scaffoldTop.z0, Yd.x0, Yd.z0, Y, 0.5, 1.05);
  // east: the dormitory range (a blind wall with windows); north: the pinnacle's foot
  k.bmm('stone_wall', Yd.x1, Y - 1, Yd.z0, Yd.x1 + 3, Y + 14, Yd.z1, { col: true, cast: true });
  for (let z = Yd.z0 + 3; z < Yd.z1 - 1; z += 4.5) k.box('window_warm', Yd.x1 - 0.02, Y + 8 + ((z * 7) % 3 > 1.5 ? 3.5 : 0), z, 0.05, 1.8, 0.9, { cast: false });
  k.bmm('roof_slate', Yd.x1 - 0.5, Y + 14, Yd.z0, Yd.x1 + 6, Y + 15, Yd.z1, { cast: true });
  bound(k, Yd.x0, Yd.z0, Yd.x1, Yd.z0, Y, 6);
  cliffWall(k, Yd.x0, Yd.z0 - 1.5, -19, Yd.z0 - 1.5, Y - 1, Y + 12, 61, 1, 3);
  cliffWall(k, 7, Yd.z0 - 1.5, Yd.x1 + 3, Yd.z0 - 1.5, Y - 1, Y + 12, 62, 1, 3);
  // the drawbridge (lowered from this side) and its lever
  pieces.drawbridge = drawbridge(ctx, 'gallery', DB.x, DB.y, DB.zHinge, DB.len, DB.w);
  for (const s of [-1, 1]) { k.box('stone_wall', DB.x + s * (DB.w / 2 + 0.5), Y + 2, DB.zHinge - 0.5, 0.8, 4, 0.8, { col: true }); chain(k, [DB.x + s * (DB.w / 2 + 0.3), Y + 3.8, DB.zHinge - 0.5], [DB.x + s * (DB.w / 2 - 0.1), Y + 0.2, DB.zHinge + DB.len * 0.92], 0.3, 0.05); }
  pieces.drawbridgeLever = lever(ctx, k, DB.x + 3.4, Y, DB.zHinge - 1.4, YAW_E);
  anchors.drawbridgeLever = pieces.drawbridgeLever.anchor!;
  // yard dressing: a treadwheel crane, stone blocks cut from a pale stone no quarry has, masons' tools
  k.push(-20, Y, -36, 0.4);
  k.add('timber_dark', new THREE.TorusGeometry(2.2, 0.12, 5, 18), { y: 2.5, x: -0.6, ry: Math.PI / 2 });
  k.add('timber_dark', new THREE.TorusGeometry(2.2, 0.12, 5, 18), { y: 2.5, x: 0.6, ry: Math.PI / 2 });
  for (let i = 0; i < 10; i++) k.box('planks', 0, 2.5 + Math.sin((i / 10) * Math.PI * 2) * 2.2, Math.cos((i / 10) * Math.PI * 2) * 2.2, 1.3, 0.08, 0.5, { rx: (i / 10) * Math.PI * 2, cast: false });
  for (const s of [-1, 1]) k.box('timber_dark', s * 1.0, 2.2, 0, 0.3, 4.4, 0.3);
  k.box('timber_dark', 0, 5.2, -2.5, 0.35, 0.35, 8, { rx: -0.5 });
  k.pop();
  k.solid(-22.5, Y, -38.5, -17.5, Y + 4, -33.5, 'wood');
  for (let i = 0; i < 9; i++) k.box('stone_fresh', -13 + (i % 3) * 1.5, Y + 0.4 + Math.floor(i / 3) * 0.8, -27 + (i % 2) * 0.3, 1.4, 0.78, 1.0, { ry: (i % 4) * 0.05, col: i < 3 });
  masonsTools(k, -9, Y, -22, 0.3);
  crateStack(k, 10, Y, -20.5, 0);
  barrel(k, 11.5, Y, -22.4, 0, true);
  rubble(k, -28, Y, -21, 1.2, false);
  scaffold(k, -30, -40, -24, -30, Y, Y + 8, { bay: 3, lift: 2.6, decks: [Y + 5.2] });
  lensApparatus(k, 6, Y, -30, YAW_W, 0.9, 1.9);
  // the third Stillbell
  const shrine = stillbellShrine(k, 10.8, Y, -26, YAW_W, 7);
  bellPost(k, -10, Y, -25.5, YAW_S);
  bracketLantern(k, Yd.x1 - 0.2, Y + 3.2, -32, YAW_W);
  k.light(0xffc590, 6, 14, Yd.x1 - 1.2, Y + 3, -32, 0.4);
  anchors.spirePlaque = anchor(-8.3, Y, -32.2, YAW_N);
  k.box('stone_trim', -8.3, Y + 0.6, -33.1, 1.6, 1.2, 0.3, { col: true });
  k.box('gold_trim', -8.3, Y + 0.75, -32.93, 1.2, 0.6, 0.02, { cast: false });
  anchors.scrapYard = anchor(-28.5, Y, -48, YAW_N);
  k.box('bronze', -28.5, Y + 0.06, -48.4, 0.3, 0.12, 0.2, { cast: false });
  enemies.push({ id: 'ac_warden_yard', kind: 'lensWarden', anchor: anchor(-14, Y, -44, YAW_S), leash: 13 });
  enemies.push({ id: 'ac_golem_yard', kind: 'suspendedGolem', anchor: anchor(-2, Y, -27, YAW_W), leash: 12 });
  enemies.push({ id: 'ac_choir_yard', kind: 'choirLeader', anchor: anchor(-25, Y, -27, YAW_E), leash: 9 });
  enemies.push({ id: 'ac_echo_yard', kind: 'echoConstruct', anchor: anchor(-21, Y, -24.5, YAW_E), leash: 12 });

  // ================================================================== the unfinished spire
  const sp = newKit(ctx, 'spire', 602, 24);
  const c = S.core, wk = S.walk;
  // core (the pale stone of a future that did not come), gold seams where it meets the old rock
  sp.bmm('stone_fresh', -c, S.y0, S.z0 + wk, c, S.y1, S.z1 - wk, { col: true, cast: true });
  for (let y = S.y0 + 3; y < S.y1; y += 3.2) sp.bmm('stone_trim', -c - 0.06, y, S.z0 + wk - 0.06, c + 0.06, y + 0.2, S.z1 - wk + 0.06, { cast: false });
  for (let i = 0; i < 7; i++) sp.box('unlived_crack', -c + 1 + i * 1.3, S.y0 + 0.5 + (i % 3) * 1.4, S.z1 - wk + 0.02, 0.8, 0.05, 0.02, { rz: (i % 2 ? 0.6 : -0.5), cast: false });
  for (const [x, z, ry] of [[0, S.z1 - wk + 0.02, 0], [0, S.z0 + wk - 0.02, Math.PI], [c + 0.02, (S.z0 + S.z1) / 2, YAW_E], [-c - 0.02, (S.z0 + S.z1) / 2, YAW_W]] as const) {
    for (let y = S.y0 + 5; y < S.y1 - 2; y += 6) sp.box('window_warm', x, y, z, 0.7, 1.8, 0.05, { ry, cast: false });
  }
  const h = (S.y1 - S.y0) / S.flights;
  const cx = (S.x0 + S.x1) / 2 + 0, zc = (S.z0 + S.z1) / 2;
  const off = c + wk / 2; // walkway centre-line distance from the core centre
  const corners: Record<string, [number, number]> = { SW: [-off, zc + off], SE: [off, zc + off], NE: [off, zc - off], NW: [-off, zc - off] };
  const order = ['SW', 'SE', 'NE', 'NW'];
  for (let f = 0; f < S.flights; f++) {
    const from = order[f % 4], to = order[(f + 1) % 4];
    const y0 = S.y0 + h * f, y1 = y0 + h;
    const [ax, az] = corners[from], [bx, bz] = corners[to];
    // flight runs between the two corner landings (stopping wk/2 short of each corner centre)
    const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
    const a: [number, number, number] = [cx + ax + dx * wk / 2, y0, az + dz * wk / 2];
    const b: [number, number, number] = [cx + bx - dx * wk / 2, y1, bz - dz * wk / 2];
    stairs(sp, 'planks', a, b, wk - 0.1, { floating: true, riser: 0.2, surface: 'wood' });
    // outer rail + scaffold posts; the inner side is the core
    const ox = dz !== 0 ? Math.sign(ax) * (wk / 2 + 0.05) : 0, oz = dx !== 0 ? Math.sign(az - zc) * (wk / 2 + 0.05) : 0;
    const run = Math.hypot(b[0] - a[0], b[2] - a[2]), ang = Math.atan2(h, run);
    const mx = (a[0] + b[0]) / 2 + ox, mz = (a[2] + b[2]) / 2 + oz, my = (y0 + y1) / 2;
    const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
    sp.push(mx, my, mz, yaw);
    sp.box('timber', 0, 1.0, 0, 0.1, 0.1, Math.hypot(run, h), { rx: -ang, cast: false });
    sp.solidC(0, 0.7, 0, 0.16, 1.8, Math.hypot(run, h), [-ang, 0, 0], 'wood');
    sp.pop();
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      sp.box('timber', a[0] + (b[0] - a[0]) * t + ox, (y0 + (y1 - y0) * t + S.y0) / 2 + 0.6, a[2] + (b[2] - a[2]) * t + oz, 0.14, y0 + (y1 - y0) * t - S.y0 + 1.2, 0.14, { cast: true });
    }
    // landing at the corner we arrive at
    const [lx, lz] = corners[to];
    floor(sp, 'planks', cx + lx - wk / 2, lz - wk / 2, cx + lx + wk / 2, lz + wk / 2, y1, 0.3, 'wood');
    sp.bmm('timber_dark', cx + lx - wk / 2, y1 - 0.6, lz - wk / 2, cx + lx + wk / 2, y1 - 0.3, lz + wk / 2, { cast: true });
    const sx = Math.sign(lx), sz = Math.sign(lz - zc);
    if (!(f === S.flights - 1)) {
      bound(sp, cx + lx + sx * (wk / 2), lz - wk / 2, cx + lx + sx * (wk / 2), lz + wk / 2, y1, 1.3, 0.14);
      bound(sp, cx + lx - wk / 2, lz + sz * (wk / 2), cx + lx + wk / 2, lz + sz * (wk / 2), y1, 1.3, 0.14);
    }
    sp.box('timber', cx + lx + sx * (wk / 2), y1 + 0.55, lz + sz * (wk / 2), 0.14, 1.1, 0.14, { cast: false });
    sp.box('timber', cx + lx, (y1 + S.y0) / 2 - 0.3, lz + sz * (wk / 2), 0.16, y1 - S.y0 - 0.6, 0.16, { cast: true });
  }
  // the top: an unfinished floor of pale stone, scaffold and a hoist, the bridge to the observatory
  const topY = S.y1;
  floor(sp, 'stone_fresh', -c, S.z0 + wk, c, S.z1 - wk, topY, 0.4);
  const [nwx, nwz] = corners.NW;
  for (const [x0, z0, x1, z1] of [[-c, S.z1 - wk, c, S.z1 - wk], [c, S.z0 + wk, c, S.z1 - wk], [-c, S.z1 - wk, -c, S.z0 + wk + 1], [-c + 1.5, S.z0 + wk, c, S.z0 + wk]] as const) bound(sp, x0, z0, x1, z1, topY, 1.3, 0.2);
  scaffold(sp, -c + 0.3, S.z0 + wk + 0.3, c - 0.3, S.z1 - wk - 0.3, topY, topY + 6.5, { bay: 3.2, lift: 3.2, braces: true });
  sp.bmm('stone_fresh', -c, topY, S.z1 - wk - 1, -c + 3, topY + 2.4, S.z1 - wk, { cast: true });
  sp.bmm('stone_fresh', c - 1, topY, S.z0 + wk, c, topY + 3.2, S.z0 + wk + 4, { cast: true });
  // bridge north from the NW landing to the observatory veil
  const bz0 = nwz - wk / 2, bz1 = AR.c.z + AR.r - 0.2;
  floor(sp, 'stone_wall', AR.c.x - 1.5, bz1, AR.c.x + 1.5, bz0, topY, 0.6);
  sp.bmm('stone_dark', AR.c.x - 1.3, topY - 6, bz1, AR.c.x + 1.3, topY - 0.6, bz0 + 0.2, { cast: true });
  bound(sp, AR.c.x - 1.6, bz0, AR.c.x - 1.6, bz1, topY, 1.3, 0.2);
  bound(sp, AR.c.x + 1.6, bz0, AR.c.x + 1.6, bz1, topY, 1.3, 0.2);
  for (const s of [-1, 1]) parapet(sp, 'stone_wall', AR.c.x + s * 1.65, bz0, AR.c.x + s * 1.65, bz1, topY, 0.3, 1.0, { col: false });
  // west bound of the NW landing (the bridge leaves north)
  bound(sp, cx + nwx - wk / 2, nwz - wk / 2, cx + nwx - wk / 2, nwz + wk / 2, topY, 1.3, 0.14);
  anchors.spireTop = anchor(cx + nwx, topY, nwz, YAW_N);
  anchors.scrapSpire = anchor(corners.NE[0] + cx, S.y0 + h * 2, corners.NE[1], YAW_W);
  enemies.push({ id: 'ac_aco_spire1', kind: 'glassAcolyte', anchor: anchor(cx + corners.NE[0], S.y0 + h * 2, corners.NE[1], YAW_S), leash: 6 });
  enemies.push({ id: 'ac_aco_spire2', kind: 'glassAcolyte', anchor: anchor(cx + corners.SE[0], S.y0 + h * 5, corners.SE[1], YAW_W), leash: 6 });
  enemies.push({ id: 'ac_hom_spire', kind: 'homunculus', anchor: anchor(cx + corners.NW[0], S.y0 + h * 3, corners.NW[1], YAW_S), leash: 8 });

  // ================================================================== the observatory (arena) on its pinnacle
  const o = newKit(ctx, 'observatory', 603, 44);
  const AC = AR.c, R = AR.r, OY = AC.y;
  o.add('stone_dark', cyl(R + 0.6, R + 3, OY + 6, 24, true), { x: AC.x, y: -6, z: AC.z }, { cast: true });
  o.add('stone_wall', cyl(R + 0.8, R + 0.6, 1.2, 36, true), { x: AC.x, y: OY - 1.2, z: AC.z });
  o.colGeo(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 1, 36), { x: AC.x, y: OY - 0.5, z: AC.z });
  o.add('stone_dark', new THREE.CylinderGeometry(R + 0.2, R + 0.2, 0.9, 36), { x: AC.x, y: OY - 0.55, z: AC.z }, { cast: false });
  // parapet ring (entrance gap south) with glass dome ribs rising to an unfinished crown
  const nP = 36;
  for (let i = 0; i < nP; i++) {
    const a0 = (i / nP) * Math.PI * 2, a1 = ((i + 1) / nP) * Math.PI * 2, am = (a0 + a1) / 2;
    if (Math.sin(am) > 0.985) continue; // south gap (toward +z)
    const p0 = [AC.x + Math.cos(a0) * (R + 0.4), AC.z + Math.sin(a0) * (R + 0.4)], p1 = [AC.x + Math.cos(a1) * (R + 0.4), AC.z + Math.sin(a1) * (R + 0.4)];
    parapet(o, 'stone_wall', p0[0], p0[1], p1[0], p1[1], OY, 0.6, 1.1, { colH: 3 });
  }
  const nRib = 12;
  for (let i = 0; i < nRib; i++) {
    const a = (i / nRib) * Math.PI * 2 + Math.PI / nRib;
    const broken = i % 4 === 2;
    const segs = broken ? 3 : 7;
    for (let j = 0; j < segs; j++) {
      const t0 = j / 8, t1 = (j + 1) / 8;
      const r0 = (R + 0.4) * Math.cos(t0 * Math.PI / 2) + 2.5 * Math.sin(t0 * Math.PI / 2), r1 = (R + 0.4) * Math.cos(t1 * Math.PI / 2) + 2.5 * Math.sin(t1 * Math.PI / 2);
      const y0 = OY + 1.1 + 13 * Math.sin(t0 * Math.PI / 2), y1 = OY + 1.1 + 13 * Math.sin(t1 * Math.PI / 2);
      const x0 = AC.x + Math.cos(a) * r0, z0 = AC.z + Math.sin(a) * r0, x1 = AC.x + Math.cos(a) * r1, z1 = AC.z + Math.sin(a) * r1;
      const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()), 'YXZ');
      o.box('stone_trim', (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0.35, L + 0.05, 0.45, { rx: e.x, ry: e.y, rz: e.z, cast: true });
    }
  }
  o.add('stone_trim', new THREE.TorusGeometry(2.6, 0.3, 6, 24), { x: AC.x, y: OY + 13.8, z: AC.z, rx: Math.PI / 2 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; o.box('glass', AC.x + Math.cos(a) * (R - 1.2), OY + 7.5, AC.z + Math.sin(a) * (R - 1.2), 2.4, 3.2, 0.03, { ry: -a + Math.PI / 2, rx: 0.5, cast: false }); }
  // lens stands round the rim (they focus the light that burns the plates)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.52;
    if (Math.sin(a) > 0.8) continue;
    const x = AC.x + Math.cos(a) * (R + 1.8), z = AC.z + Math.sin(a) * (R + 1.8);
    o.add('stone_wall', cyl(0.5, 0.6, 3.2, 8), { x, y: OY, z });
    lensApparatus(o, x, OY + 3.2, z, Math.atan2(AC.x - x, AC.z - z), 0.8, 0.9);
  }
  // entrance arch and the veil
  o.push(AC.x, OY, AC.z + R + 0.4, 0);
  for (const s of [-1, 1]) o.bmm('stone_wall', s * 1.9 - 0.45, 0, -0.5, s * 1.9 + 0.45, 5.4, 0.5, { col: true });
  o.bmm('stone_trim', -2.4, 5.4, -0.55, 2.4, 6.0, 0.55);
  o.pop();
  academyMark(o, AC.x, OY + 6.8, AC.z + R + 1.0, YAW_S, 0.8);
  const fg = fogGate(ctx, 'orrow', AC.x, OY, AC.z + R + 0.4, YAW_N, 3.4, 5.2);
  anchors.orrowEntry = anchor(AC.x, OY, AC.z + R + 3.2, YAW_N);
  anchors.orrowSpawn = anchor(AC.x, OY, AC.z - 5, YAW_S);
  o.light(0xffe0b0, 8, 26, AC.x, OY + 6, AC.z, 0);

  // ---------------------------------------------------------------- the lens floor
  const floorObj = buildLensFloor(ctx, AC, R);

  // ================================================================== the bell tower and the Great Bell
  const tw = newKit(ctx, 'tower', 604, 44);
  const T = PLAN.tower;
  const tx = (T.x0 + T.x1) / 2, tz = (T.z0 + T.z1) / 2, tW = T.x1 - T.x0;
  tw.bmm('stone_wall', T.x0, -6, T.z0, T.x1, T.bellY - 8, T.z1, { cast: true });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) tw.bmm('stone_wall', tx + sx * (tW / 2 - 0.9) - 0.9, T.bellY - 8, tz + sz * (tW / 2 - 0.9) - 0.9, tx + sx * (tW / 2 - 0.9) + 0.9, T.top - 4, tz + sz * (tW / 2 - 0.9) + 0.9, { cast: true });
  for (let y = 30; y < T.bellY - 8; y += 9) tw.bmm('stone_trim', T.x0 - 0.2, y, T.z0 - 0.2, T.x1 + 0.2, y + 0.4, T.z1 + 0.2, { cast: false });
  tw.bmm('stone_trim', T.x0 - 0.4, T.bellY - 8.4, T.z0 - 0.4, T.x1 + 0.4, T.bellY - 7.6, T.z1 + 0.4);
  tw.bmm('stone_wall', T.x0 - 0.3, T.top - 4, T.z0 - 0.3, T.x1 + 0.3, T.top - 2.6, T.z1 + 0.3);
  tw.add('roof_slate', cone(tW * 0.78, 16, 4), { x: tx, y: T.top - 2.6, z: tz, ry: Math.PI / 4 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) towerRound(tw, 'stone_wall', tx + sx * (tW / 2), T.top - 12, tz + sz * (tW / 2), 1.1, 10, 4.5, false, false);
  tw.bmm('timber_dark', T.x0 + 0.5, T.bellY + 0.8, tz - 0.5, T.x1 - 0.5, T.bellY + 1.6, tz + 0.5);
  academyMark(tw, tx, T.bellY - 14, T.z1 + 0.1, YAW_S, 2.2);
  for (let y = 50; y < T.bellY - 12; y += 12) tw.box('window_warm', tx, y, T.z1 + 0.02, 1.2, 3, 0.05, { cast: false });
  const bell = new THREE.Group();
  const bellMesh = new THREE.Mesh(bellGeo(8.5, 28), getMaterial('bronze_bell'));
  bellMesh.castShadow = true;
  bell.add(bellMesh);
  const crackParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    let y = -1.2, r = 3.2, ca = a;
    for (let j = 0; j < 6; j++) {
      const ny = y - 1.1, nr = 3.2 + (-(ny + 1.2) / 7.3) * 2.0, na = ca + Math.sin(i * 3 + j) * 0.12;
      const p0 = new THREE.Vector3(Math.cos(ca) * r * 1.01, y, Math.sin(ca) * r * 1.01), p1 = new THREE.Vector3(Math.cos(na) * nr * 1.01, ny, Math.sin(na) * nr * 1.01);
      const seg = new THREE.BoxGeometry(0.12, p0.distanceTo(p1), 0.12);
      seg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()));
      seg.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
      crackParts.push(seg);
      y = ny; r = nr; ca = na;
    }
  }
  const cracks = new THREE.Mesh(mergeSimple(crackParts), getMaterial('unlived_crack'));
  bell.add(cracks);
  bell.position.set(tx, T.bellY + 0.8, tz);
  ctx.dynamicRoot.add(bell);
  const bellLight = tw.light(0xffc070, 16, 40, tx, T.bellY - 5, tz, 0);

  // the anchor: a great lens-crystal in a bronze cradle, chained up to the bell
  const anchorLens = anchorPiece(ctx, o, new THREE.Vector3(AC.x, OY, AC.z - R + 1.4), new THREE.Vector3(tx, T.bellY - 7.2, tz), cracks, bellLight);

  triggers.observatory = box3(AC.x - R, OY - 1, AC.z - R, AC.x + R, OY + 8, AC.z + R);
  const tollPosts = [{
    id: 'yard', pos: V(-10, Y, -25.5), radius: 6.5,
    options: [{ id: 'spire', toward: V(-6, Y, -33) }, { id: 'drawbridge', toward: V(0, Y, -17) }, { id: 'scaffold', toward: V(-35, Y, -44) }],
  }];
  void sphere; void ringSector; void column; void YAW_E;
  return { shrine, enemies, anchors, pieces, triggers, tollPosts, arena: { fogGate: fg, anchorLens, floor: floorObj }, greatBell: bell };
}

// ====================================================================== the lens floor

function buildLensFloor(ctx: AreaCtx, C: THREE.Vector3, R: number): ObservatoryFloor {
  const root = new THREE.Group();
  root.name = 'lensFloor';
  root.position.copy(C);
  ctx.dynamicRoot.add(root);
  const rings = [{ r0: 0, r1: 3.6, n: 1 }, { r0: 3.6, r1: 7.6, n: 6 }, { r0: 7.6, r1: R + 0.1, n: 12 }];
  const plates: LensPlate[] = [];
  const glyphMat = glowMat('glyph', 0x201810, 0xfff0c8, 3.0, { transparent: true, opacity: 0.95 });
  const colMat = addMat('burnColumn', 0xffe6b0, 0.55);
  const seams: THREE.BufferGeometry[] = [];
  for (const [ri, rg] of rings.entries()) {
    for (let j = 0; j < rg.n; j++) {
      const span = (Math.PI * 2) / rg.n;
      const a0 = j * span + (ri === 2 ? span / 2 : 0), a1 = a0 + span;
      const geo = rg.r0 < 0.01 ? new THREE.CircleGeometry(rg.r1 - 0.06, 24).rotateX(-Math.PI / 2) : ringSector(rg.r0 + 0.05, rg.r1 - 0.05, a0 + 0.012, a1 - 0.012, 0.06, 8).translate(0, 0.03, 0);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8c948f, metalness: 0.35, roughness: 0.18, emissive: new THREE.Color(0xffd79a), emissiveIntensity: 0.05, transparent: false });
      mat.name = 'academy:lensPlate';
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.012;
      mesh.receiveShadow = true;
      root.add(mesh);
      const am = (a0 + a1) / 2, rm = rg.r0 < 0.01 ? 0 : (rg.r0 + rg.r1) / 2;
      const cx = Math.cos(am) * rm, cz = -Math.sin(am) * rm;
      // warning glyph: a broken outer ring and a notched diamond — shape, not colour (one mesh)
      const s = rg.r0 < 0.01 ? 1.3 : Math.min(1.25, (rg.r1 - rg.r0) * 0.42);
      const gparts: THREE.BufferGeometry[] = [];
      for (let q = 0; q < 6; q++) gparts.push(new THREE.RingGeometry(s * 0.82, s, 10, 1, (q / 6) * Math.PI * 2 + 0.12, Math.PI / 3 - 0.24).rotateX(-Math.PI / 2));
      const dia = new THREE.Shape([new THREE.Vector2(0, s * 0.6), new THREE.Vector2(s * 0.42, 0), new THREE.Vector2(0, -s * 0.6), new THREE.Vector2(-s * 0.42, 0)]);
      dia.holes.push(new THREE.Path([new THREE.Vector2(0, s * 0.36), new THREE.Vector2(-s * 0.22, 0), new THREE.Vector2(0, -s * 0.36), new THREE.Vector2(s * 0.22, 0)]));
      gparts.push(new THREE.ShapeGeometry(dia).rotateX(-Math.PI / 2));
      gparts.push(new THREE.PlaneGeometry(s * 0.08, s * 0.5).rotateX(-Math.PI / 2));
      const glyph = new THREE.Mesh(mergeBoxes(gparts), glyphMat);
      glyph.position.set(cx, 0.09, cz);
      glyph.rotation.y = rg.r0 < 0.01 ? 0 : am - Math.PI / 2;
      glyph.visible = false;
      glyph.renderOrder = 4;
      root.add(glyph);
      // light column (extruded plate outline)
      const colGeo = rg.r0 < 0.01 ? new THREE.CylinderGeometry(rg.r1 - 0.1, rg.r1 - 0.1, 14, 24, 1, true).translate(0, 7, 0) : ringSector(rg.r0 + 0.1, rg.r1 - 0.1, a0 + 0.03, a1 - 0.03, 14, 8).translate(0, 14, 0);
      const column = new THREE.Mesh(colGeo, colMat);
      column.visible = false;
      column.renderOrder = 6;
      root.add(column);
      plates.push({ index: plates.length, ring: ri, centre: new THREE.Vector3(C.x + cx, C.y, C.z + cz), r0: rg.r0, r1: rg.r1, a0, a1, mesh, mat, glyph, column, neighbours: [] });
      // seams (bronze lines between plates)
      if (rg.r0 > 0.01) seams.push(new THREE.BoxGeometry(rg.r1 - rg.r0, 0.05, 0.08).translate((rg.r0 + rg.r1) / 2, 0.025, 0).rotateY(a0));
    }
    seams.push(new THREE.TorusGeometry(rg.r1, 0.05, 3, 64).rotateX(Math.PI / 2));
  }
  const seamMesh = new THREE.Mesh(mergeBoxes(seams), getMaterial('bronze'));
  root.add(seamMesh);
  // neighbours: same ring adjacent sectors, and radial overlap with adjacent rings
  const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  for (const p of plates) for (const q of plates) {
    if (p === q) continue;
    if (p.ring === 0 || q.ring === 0) { if (Math.abs(p.ring - q.ring) === 1) p.neighbours.push(q.index); continue; }
    if (p.ring === q.ring) {
      const n = p.ring === 1 ? 6 : 12;
      const di = Math.abs(p.index - q.index);
      const first = p.ring === 1 ? 1 : 7;
      if (di === 1 || di === n - 1) { void first; p.neighbours.push(q.index); }
    } else if (Math.abs(p.ring - q.ring) === 1) {
      const overlap = (x0: number, x1: number, y0: number, y1: number) => {
        for (const sh of [-Math.PI * 2, 0, Math.PI * 2]) if (Math.min(x1, y1 + sh) - Math.max(x0, y0 + sh) > 0.01) return true;
        return false;
      };
      if (overlap(norm(p.a0), norm(p.a0) + (p.a1 - p.a0), norm(q.a0), norm(q.a0) + (q.a1 - q.a0))) p.neighbours.push(q.index);
    }
  }
  const idleCol = new THREE.Color(0xffd79a), warnCol = new THREE.Color(0xffe8c0), burnCol = new THREE.Color(0xfff4e0);
  return {
    centre: C.clone(), radius: R, plates,
    plateAt(p: THREE.Vector3) {
      const dx = p.x - C.x, dz = p.z - C.z, r = Math.hypot(dx, dz);
      if (r > R + 0.2 || Math.abs(p.y - C.y) > 2.5) return -1;
      const a = norm(Math.atan2(-dz, dx));
      for (const pl of plates) {
        if (r < pl.r0 || r >= pl.r1 + (pl.ring === 2 ? 0.3 : 0)) continue;
        if (pl.ring === 0) return pl.index;
        const a0 = norm(pl.a0), a1 = a0 + (pl.a1 - pl.a0);
        if ((a >= a0 && a < a1) || (a + Math.PI * 2 >= a0 && a + Math.PI * 2 < a1)) return pl.index;
      }
      return -1;
    },
    setState(i, state, kk, time) {
      const pl = plates[i];
      if (!pl) return;
      const m = pl.mat;
      if (state === 0) {
        m.emissive.copy(idleCol); m.emissiveIntensity = 0.05; pl.glyph.visible = false; pl.column.visible = false;
      } else if (state === 1) {
        // warning: brightening glow, pulsing faster as it nears, glyph shown and turning
        const pulse = 0.5 + 0.5 * Math.sin(time * (6 + kk * 10));
        m.emissive.copy(warnCol); m.emissiveIntensity = 0.35 + kk * 1.4 + pulse * 0.5;
        pl.glyph.visible = true;
        pl.glyph.scale.setScalar(1.15 - kk * 0.15 + pulse * 0.05);
        pl.column.visible = kk > 0.55;
        pl.column.scale.set(1, 0.08 + kk * 0.2, 1);
        (pl.column.material as THREE.MeshBasicMaterial).opacity = 0.55;
      } else if (state === 2) {
        m.emissive.copy(burnCol); m.emissiveIntensity = 3.2 + Math.sin(time * 30) * 0.4;
        pl.glyph.visible = true;
        pl.column.visible = true;
        pl.column.scale.set(1, 1, 1);
      } else {
        m.emissive.copy(idleCol); m.emissiveIntensity = 0.05 + (1 - kk) * 1.2; pl.glyph.visible = false;
        pl.column.visible = kk < 0.4;
        pl.column.scale.set(1, Math.max(0.01, 1 - kk * 2.5), 1);
      }
    },
  };
}

function mergeBoxes(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/** The Academy's anchor: a faceted lens-crystal in a bronze cradle, chained to the Great Bell. set(1) = shattered. */
function anchorPiece(ctx: AreaCtx, k: ReturnType<typeof newKit>, base: THREE.Vector3, bellMouth: THREE.Vector3, bellCracks: THREE.Object3D, bellLight: THREE.PointLight): Piece {
  // cradle (static)
  k.add('stone_trim', cyl(1.6, 1.9, 0.8, 8), { x: base.x, y: base.y, z: base.z });
  k.solid(base.x - 1.6, base.y, base.z - 1.6, base.x + 1.6, base.y + 0.8, base.z + 1.6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.box('bronze', base.x + Math.cos(a) * 1.1, base.y + 2.2, base.z + Math.sin(a) * 1.1, 0.18, 3.2, 0.18, { rx: Math.sin(a) * 0.25, rz: -Math.cos(a) * 0.25 });
  }
  const root = new THREE.Group();
  root.name = 'academyAnchor';
  ctx.dynamicRoot.add(root);
  const crystalMat = glowMat('anchorCrystal', 0xc8d8e0, 0xffd89a, 1.4, { metal: 0.1, rough: 0.08 });
  const frags: { m: THREE.Mesh; dir: THREE.Vector3; spin: THREE.Vector3 }[] = [];
  const cc = base.clone().add(new THREE.Vector3(0, 2.9, 0));
  for (let i = 0; i < 7; i++) {
    const g = new THREE.OctahedronGeometry(i === 0 ? 1.1 : 0.55, 0);
    g.scale(i === 0 ? 0.8 : 0.5, i === 0 ? 1.8 : 1.3, i === 0 ? 0.8 : 0.5);
    const m = new THREE.Mesh(g, crystalMat);
    const a = (i / 6) * Math.PI * 2;
    const off = i === 0 ? new THREE.Vector3() : new THREE.Vector3(Math.cos(a) * 0.75, -0.4 + (i % 2) * 0.5, Math.sin(a) * 0.75);
    m.position.copy(cc).add(off);
    m.rotation.set(off.z * 0.5, a, -off.x * 0.5);
    m.castShadow = true;
    root.add(m);
    frags.push({ m, dir: off.lengthSq() ? off.clone().normalize() : new THREE.Vector3(0, 1, 0), spin: new THREE.Vector3(Math.sin(i * 7) * 3, Math.cos(i * 5) * 3, Math.sin(i * 3) * 3) });
  }
  const homes = frags.map((f) => ({ p: f.m.position.clone(), r: f.m.rotation.clone() }));
  // chains from the cradle up to the bell (drop when the anchor breaks)
  const chainMat = getMaterial('iron');
  const chains: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const from = cc.clone().add(new THREE.Vector3(s * 0.9, 0.8, 0));
    const to = bellMouth.clone().add(new THREE.Vector3(s * 2.5, 0, 0));
    const d = to.clone().sub(from);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 5).translate(0, 0.5, 0), chainMat);
    m.position.copy(from);
    m.scale.set(1, d.length(), 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    root.add(m);
    chains.push(m);
  }
  const glow = registerLight(new THREE.PointLight(0xffd89a, 6, 14, 2));
  glow.position.copy(cc);
  root.add(glow);
  const baseLight = bellLight.intensity;
  const piece: Piece = {
    object: root,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const u = Math.max(0, (e - 0.2) / 0.8);
      frags.forEach((f, i) => {
        const h = homes[i];
        f.m.position.copy(h.p).addScaledVector(f.dir, u * 3.2);
        f.m.position.y = h.p.y + u * 1.2 - u * u * 3.4;
        f.m.rotation.set(h.r.x + f.spin.x * u, h.r.y + f.spin.y * u, h.r.z + f.spin.z * u);
        if (e > 0 && e < 0.2) f.m.position.x += Math.sin(e * 200 + i) * 0.03;
        f.m.visible = u < 0.95;
      });
      crystalMat.emissiveIntensity = 1.4 * (1 - u);
      glow.intensity = 6 * (1 - u);
      for (const c of chains) c.visible = u < 0.15;
      bellCracks.visible = u < 0.5;
      bellLight.intensity = baseLight * (1 - u * 0.85);
    },
  };
  piece.set(0);
  return piece;
}
