/**
 * The Orangery (glasshouse on a stone base, iron walkway along the east wall, Stillbell), the
 * COURT OF TWO CLAIMS (Twin Heirs arena; its north gate opens when they fall), the stair hall up
 * to the EAST LOGGIA (YU) which rejoins the Antechamber — the eastern half of the region's loop —
 * plus the palace's east block and the privy garden the loggia overlooks.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import {
  wall, floor, stairs, stillbellShrine, type StillbellShrine, cyl, bench, crate, barrel, sack, bucket, shedRoof,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import {
  type AreaCtx, newKit, anchor, PLAN, Y0, YU, YAW_N, YAW_S, YAW_E, YAW_W, hhMaterial, hedge, topiary, autumnTree, leafLitter,
  statue, balustrade, gothicWindow, pinnacle, hangingBanner, Rng,
} from './levelCommon';

export interface OrangeryBuild {
  shrine: StillbellShrine;
  arena: ArenaLayout;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  anchors: Record<string, Anchor>;
  enemies: EnemySpawn[];
}

export function buildOrangery(ctx: AreaCtx): OrangeryBuild {
  const k = newKit(ctx, 'orangery', 113);
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};
  const enemies: EnemySpawn[] = [];
  const O = PLAN.orangery, GH = 7.2;
  const glass = hhMaterial('glass');

  // ================================================================ orangery shell
  floor(k, 'flagstone', O.x0, O.z0, O.x1, O.z1, Y0, 0.5);
  // stone base walls with the glass above; openings: west door (from the parterre), north door (the heirs)
  const base = 1.3;
  wall(k, 'stone_trim', O.x0, O.z0, O.x0, O.z1, Y0, base, 0.8, { openings: [{ u: 24 - (O.z0 + O.z1) / 2, w: 3.2, sill: 0, h: base + 0.1 }], col: false });
  wall(k, 'stone_trim', O.x1, O.z0, O.x1, O.z1, Y0, base, 0.8, { col: false });
  wall(k, 'stone_trim', O.x0, O.z1, O.x1, O.z1, Y0, base, 0.8, { col: false });
  wall(k, 'stone_wall', O.x0, O.z0, O.x1, O.z0, Y0, GH + 1.5, 1.0, { openings: [{ u: 47 - (O.x0 + O.x1) / 2, w: 3.2, sill: 0, h: 3.4, kind: 'round' }] });
  // colliders for the glass walls (full height; west door gap)
  const solid = (x0: number, z0: number, x1: number, z1: number) => k.solid(x0, Y0, z0, x1, GH, z1);
  solid(O.x0 - 0.4, O.z0, O.x0 + 0.4, 22.4); solid(O.x0 - 0.4, 25.6, O.x0 + 0.4, O.z1);
  solid(O.x1 - 0.4, O.z0, O.x1 + 0.4, O.z1);
  solid(O.x0, O.z1 - 0.4, O.x1, O.z1 + 0.4);
  // door frame (west)
  for (const z of [22.3, 25.7]) k.bmm('iron', O.x0 - 0.2, base, z - 0.1, O.x0 + 0.2, 4.2, z + 0.1);
  k.bmm('iron', O.x0 - 0.2, 4.1, 22.2, O.x0 + 0.2, 4.3, 25.8);
  // glass panes + iron mullions on the three glass sides, a glass barrel roof with iron ribs
  const panes: THREE.BufferGeometry[] = [];
  const addPane = (g: THREE.BufferGeometry) => panes.push(g);
  const side = (x0: number, z0: number, x1: number, z1: number, gap?: [number, number]) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.6);
    const ang = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const mx = x0 + (x1 - x0) * (u0 + u1) / 2, mz = z0 + (z1 - z0) * (u0 + u1) / 2;
      const along = gap ? (Math.abs(x1 - x0) > 0.1 ? mx : mz) : 0;
      if (gap && along > gap[0] && along < gap[1]) continue;
      const p = new THREE.PlaneGeometry(len / n - 0.08, GH - base - 0.1);
      p.rotateY(ang); p.translate(mx, base + (GH - base) / 2, mz);
      addPane(p);
      k.box('iron', x0 + (x1 - x0) * u0, (base + GH) / 2, z0 + (z1 - z0) * u0, 0.09, GH - base, 0.09, { cast: false });
    }
    k.box('iron', (x0 + x1) / 2, GH, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.1, 0.12, Math.abs(z1 - z0) + 0.1, { cast: false });
    k.box('iron', (x0 + x1) / 2, base + 2.4, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.06, 0.06, Math.abs(z1 - z0) + 0.06, { cast: false });
  };
  side(O.x0, O.z0, O.x0, O.z1, [22, 26]);
  side(O.x1, O.z0, O.x1, O.z1);
  side(O.x0, O.z1, O.x1, O.z1);
  // barrel roof along z: glass panes on iron ribs
  const R = (O.x1 - O.x0) / 2, cx = (O.x0 + O.x1) / 2, segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs;
    const p0 = [cx + Math.cos(a0) * R, GH + Math.sin(a0) * R * 0.55], p1 = [cx + Math.cos(a1) * R, GH + Math.sin(a1) * R * 0.55];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const g = new THREE.PlaneGeometry(L, O.z1 - O.z0);
    g.rotateX(-Math.PI / 2);
    g.rotateZ(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
    g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (O.z0 + O.z1) / 2);
    addPane(g);
  }
  for (let z = O.z0 + 0.5; z <= O.z1; z += 2.5) {
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs;
      const p0 = [cx + Math.cos(a0) * R, GH + Math.sin(a0) * R * 0.55], p1 = [cx + Math.cos(a1) * R, GH + Math.sin(a1) * R * 0.55];
      k.box('iron', (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 0.03, z, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.05, 0.1, 0.1, { rz: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), cast: false });
    }
  }
  k.box('iron', cx, GH + R * 0.55 + 0.1, (O.z0 + O.z1) / 2, 0.2, 0.2, O.z1 - O.z0, { cast: false });
  k.add('gold_trim', new THREE.ConeGeometry(0.25, 1.4, 6), { x: cx, y: GH + R * 0.55 + 0.9, z: O.z1 - 1 }, { cast: false });
  k.add('gold_trim', new THREE.ConeGeometry(0.25, 1.4, 6), { x: cx, y: GH + R * 0.55 + 0.9, z: O.z0 + 1 }, { cast: false });
  for (const g of panes) ctx.batch.add(glass, g, undefined, false);

  // ---------------------------------------------------------------- the orange trees in tubs, planters and the aisle
  k.bmm('stone_trim', 45.2, Y0, O.z0, 48.8, Y0 + 0.03, O.z1, { cast: false });
  const rng = new Rng(55);
  const orange = new THREE.Color('#d88a2a'), leaf = new THREE.Color('#3f5a2c');
  for (const x of [40.4, 52.2]) for (let z = O.z0 + 4; z < 20; z += 4.5) {
    k.add('timber_dark', cyl(0.62, 0.5, 0.8, 10), { x, y: Y0, z });
    k.add('iron', cyl(0.64, 0.64, 0.06, 10, true), { x, y: 0.55, z }, { cast: false });
    k.add('timber_dark', cyl(0.07, 0.09, 1.5, 6), { x, y: 0.8, z }, { cast: false });
    // canopy: dark green blob speckled with fruit (vertex colours)
    const g = new THREE.IcosahedronGeometry(1.05, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 1 + 0.12 * Math.sin(p.getX(i) * 4 + x) * Math.cos(p.getZ(i) * 3 + z); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.85, p.getZ(i) * f); }
    g.computeVertexNormals();
    const ng = g.index ? g.toNonIndexed() : g;
    const cols = new Float32Array(ng.attributes.position.count * 3);
    for (let i = 0; i < ng.attributes.position.count; i += 3) {
      const c = rng.chance(0.14) ? orange : leaf;
      const s = rng.range(0.75, 1.05);
      for (let j = 0; j < 3; j++) { cols[(i + j) * 3] = c.r * s; cols[(i + j) * 3 + 1] = c.g * s; cols[(i + j) * 3 + 2] = c.b * s; }
    }
    ng.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    ctx.batch.add(hhMaterial('foliage'), ng, new THREE.Matrix4().makeTranslation(x, 2.9, z));
    k.solid(x - 0.62, Y0, z - 0.62, x + 0.62, 1.5, z + 0.62, 'wood');
  }
  // long stone planters with dead topiary under the walkway
  for (let z = O.z0 + 3; z < O.z1 - 8; z += 9) { k.bmm('stone_trim', 42.2, Y0, z, 43.8, 0.9, z + 6, { col: true }); topiary(ctx, k, 43, 0.9, z + 1.6, 'ball', 0.5); topiary(ctx, k, 43, 0.9, z + 4.4, 'ball', 0.5); }
  // gardener's corner
  crate(k, 38, Y0, 8, 0.4, 0.8, true); sack(k, 38.4, Y0, 9.3, 0.2); bucket(k, 37.8, Y0, 10.2, 'planks', 'water');
  barrel(k, 37.9, Y0, 5.6, 0, true);
  bench(k, 49.8, Y0, 23.8, YAW_W);
  leafLitter(ctx, k, O.x0 + 0.5, O.z0 + 0.5, O.x1 - 0.5, O.z1 - 0.5, Y0, 380, 61);
  k.light(0xffcf90, 3.2, 14, 47, 4.6, 12, 0.3);
  k.light(0xffcf90, 3.2, 14, 47, 4.6, -1, 0.3);

  // ---------------------------------------------------------------- iron walkway along the east wall (verticality; the shard; a caster's perch)
  const WY = 3.6, wx0 = 54.4, wx1 = O.x1 - 0.5;
  stairs(k, 'iron', [44.2, Y0, 32.3], [wx0, WY, 32.3], 2.2, { floating: true });
  floor(k, 'planks', wx0, O.z0 + 1, wx1, O.z1 - 0.6, WY, 0.25, 'metal');
  for (let z = O.z0 + 2; z < O.z1 - 1; z += 4) { k.box('iron', wx0 + 0.2, WY / 2, z, 0.16, WY, 0.16, { cast: false }); k.solid(wx0 + 0.1, Y0, z - 0.1, wx0 + 0.3, WY, z + 0.1, 'metal'); }
  // railings
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    k.box('iron', (x0 + x1) / 2, WY + 1.0, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.05, 0.06, Math.abs(z1 - z0) + 0.05, { cast: false });
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.5));
    for (let i = 0; i <= n; i++) k.box('iron', x0 + (x1 - x0) * i / n, WY + 0.5, z0 + (z1 - z0) * i / n, 0.035, 1.0, 0.035, { cast: false });
    k.solid(Math.min(x0, x1) - 0.08, WY, Math.min(z0, z1) - 0.08, Math.max(x0, x1) + 0.08, WY + 1.25, Math.max(z0, z1) + 0.08, 'metal');
  };
  rail(wx0, O.z0 + 1, wx0, 30.9);
  rail(wx0, O.z0 + 1, wx1, O.z0 + 1);
  anchors.orangeryShard = anchor(56.4, WY + 0.05, O.z0 + 2.2, 0);
  // Stillbell: the Orangery (inside the west door)
  const shrine = stillbellShrine(k, 38.4, Y0, 30.6, YAW_E);
  enemies.push({ id: 'hh_orangery_courtier1', kind: 'hhCourtier', anchor: anchor(56, WY, 9, YAW_W), leash: 10 });
  enemies.push({ id: 'hh_orangery_courtier2', kind: 'hhCourtier', anchor: anchor(47, Y0, -1.5, YAW_S), leash: 12 });
  enemies.push({ id: 'hh_orangery_gardener', kind: 'hhGardener', anchor: anchor(46.5, Y0, 12, YAW_S), patrol: [new THREE.Vector3(47, Y0, 18), new THREE.Vector3(47, Y0, 3)], leash: 16 });
  enemies.push({ id: 'hh_orangery_duellist', kind: 'hhDuellist', anchor: anchor(44.5, Y0, 3.5, YAW_S), leash: 14 });
  anchors.orangeryBeam = anchor(47, Y0, 17, YAW_N);   // the beam he was hanged from, in the remembered future

  // ================================================================ court of two claims (Twin Heirs)
  const c = newKit(ctx, 'heirs', 127);
  const HC = PLAN.heirs, cz0 = HC.z0, cz1 = O.z0 - 0.5;
  floor(c, 'flagstone', HC.x0, cz0, HC.x1, cz1, Y0, 0.5);
  c.add('stone_trim', cyl(4.6, 4.6, 0.03, 32), { x: HC.c.x, y: Y0 + 0.001, z: HC.c.z }, { cast: false });
  c.add('flagstone', cyl(4.2, 4.2, 0.035, 32), { x: HC.c.x, y: Y0 + 0.001, z: HC.c.z }, { cast: false });
  // a split compass rose: half red, half blue (two claims on one floor)
  c.add('cloth_red', new THREE.CylinderGeometry(3.6, 3.6, 0.01, 24, 1, false, 0, Math.PI).translate(0, 0.04, 0), { x: HC.c.x, y: Y0, z: HC.c.z }, { cast: false });
  c.add('cloth_blue', new THREE.CylinderGeometry(3.6, 3.6, 0.01, 24, 1, false, Math.PI, Math.PI).translate(0, 0.04, 0), { x: HC.c.x, y: Y0, z: HC.c.z }, { cast: false });
  wall(c, 'stone_wall', HC.x0, cz0, HC.x0, cz1, Y0, 7, 1.0);
  wall(c, 'stone_wall', HC.x1, cz0, HC.x1, cz1, Y0, 7, 1.0);
  wall(c, 'stone_wall', HC.x0, cz0, HC.x1, cz0, Y0, 7, 1.0, { openings: [{ u: 47 - (HC.x0 + HC.x1) / 2, w: 4, sill: 0, h: 3.6, kind: 'pointed', rise: 1.6 }] });
  for (const [x0, z0, x1, z1] of [[HC.x0, cz0, HC.x0, cz1], [HC.x1, cz0, HC.x1, cz1], [HC.x0, cz0, HC.x1, cz0]] as [number, number, number, number][]) {
    c.bmm('stone_trim', Math.min(x0, x1) - 0.6, 7, Math.min(z0, z1) - 0.6, Math.max(x0, x1) + 0.6, 7.3, Math.max(z0, z1) + 0.6, { cast: false });
  }
  for (const z of [-12, -24, -36]) for (const x of [HC.x0 + 0.5, HC.x1 - 0.5]) pinnacle(c, x, 7.3, z, 3.2, 0.6, false);
  // the two claimants' statues against the side walls, their banners above them
  statue(c, HC.x0 + 1.4, Y0, HC.c.z, YAW_E, 0, 1.8, 1.4);
  statue(c, HC.x1 - 1.4, Y0, HC.c.z, YAW_W, 2, 1.8, 1.4);
  hangingBanner(c, HC.x0 + 0.52, 6.4, HC.c.z, YAW_E, 1.6, 3.8, 'cloth_red');
  hangingBanner(c, HC.x1 - 0.52, 6.4, HC.c.z, YAW_W, 1.6, 3.8, 'cloth_blue');
  for (const [x, z] of [[HC.x0 + 1.6, cz1 - 1.8], [HC.x1 - 1.6, cz1 - 1.8], [HC.x0 + 1.6, cz0 + 1.8], [HC.x1 - 1.6, cz0 + 1.8]]) autumnTree(ctx, c, x, Y0, z, 7, Math.round(x * 3 + z), undefined, true);
  leafLitter(ctx, c, HC.x0 + 0.5, cz0 + 0.5, HC.x1 - 0.5, cz1 - 0.5, Y0, 420, 71);
  c.light(0xffc890, 2.4, 14, HC.c.x, 4.5, HC.c.z, 0.2);
  // fog gate at the orangery's north door; north gate (opens when the heirs fall)
  const fog = fogGate(ctx, 'heirs', 47, Y0, O.z0, 'z', 3.4, 4.8);
  const gate = ironGate(ctx, 47, Y0, cz0, 4, 4.6);
  pieces.heirsGate = gate;
  const arena: ArenaLayout = {
    bossId: 'heirs', center: HC.c.clone(), radius: HC.r,
    fogGate: { ...fog, anchor: anchor(47, Y0, O.z0 + 2.2, YAW_N), enterTo: anchor(47, Y0, O.z0 - 3.2, YAW_N) },
    entry: anchor(47, Y0, O.z0 + 3.2, YAW_N),
    spawn: anchor(44.6, Y0, -31, YAW_S),
    onDefeat: [gate],
  };
  anchors.heirYounger = anchor(49.4, Y0, -31, YAW_S);

  // ================================================================ stair hall → east loggia (YU)
  const HS = PLAN.hStair, LG = PLAN.loggia;
  floor(c, 'flagstone', HS.x0 - 0.5, HS.zHi, HS.x1 + 0.5, cz0, Y0, 0.4);
  stairs(c, 'stone_trim', [47, Y0, HS.zLo], [47, YU, HS.zHi], HS.x1 - HS.x0, { baseY: Y0 });
  wall(c, 'stone_wall', HS.x0 - 0.3, HS.zHi, HS.x0 - 0.3, cz0, Y0, YU + 4.5, 0.6);
  wall(c, 'stone_wall', HS.x1 + 0.3, HS.zHi, HS.x1 + 0.3, cz0, Y0, YU + 4.5, 0.6);
  shedRoof(c, 47, YU + 4.5, (HS.zHi + cz0) / 2, 0, HS.x1 - HS.x0 + 1.6, cz0 - HS.zHi + 1, 1.2);
  c.light(0xffc27a, 2.0, 8, 47, 4.6, -46, 0.5);
  // loggia: floor on a solid mass, arcade + balustrade to the south, blind wall to the north, lean-to roof
  c.bmm('stone_dark', LG.x0 + 2, Y0, LG.z0, HS.x0 - 0.6, YU - 0.02, LG.z1, { col: true });
  c.bmm('stone_dark', HS.x0 - 0.6, Y0, LG.z0, LG.x1, YU - 0.02, HS.zHi, { col: true });
  floor(c, 'flagstone', LG.x0 + 2, LG.z0, LG.x1, LG.z1, YU, 0.2);
  c.bmm('cloth_red', LG.x0 + 2, YU + 0.005, -56.2, LG.x1 - 1, YU + 0.02, -54.8, { cast: false });
  wall(c, 'stone_wall', LG.x0 + 2, LG.z0 - 0.3, LG.x1 + 0.3, LG.z0 - 0.3, Y0, YU + 5, 0.6);
  wall(c, 'stone_wall', LG.x1 + 0.3, LG.z0, LG.x1 + 0.3, HS.zHi + 0.1, Y0, YU + 5, 0.6);
  for (let x = LG.x0 + 4; x < HS.x0 - 1; x += 4) {
    c.add('stone_trim', cyl(0.24, 0.26, 4.4, 10), { x, y: YU, z: LG.z1 - 0.35 });
    c.solid(x - 0.26, YU, LG.z1 - 0.6, x + 0.26, YU + 4.4, LG.z1 - 0.1);
    gothicWindow(c, x + 2, YU + 1.1, LG.z0 - 0.02, YAW_S, 1.3, 2.6, false, true);
  }
  balustrade(c, LG.x0 + 2, LG.z1 - 0.3, HS.x0 - 0.7, LG.z1 - 0.3, YU);
  c.box('stone_trim', (LG.x0 + HS.x0) / 2 + 1, YU + 4.6, LG.z1 - 0.35, HS.x0 - LG.x0 - 2, 0.5, 0.7);
  shedRoof(c, (LG.x0 + LG.x1) / 2 + 1, YU + 4.85, (LG.z0 + LG.z1) / 2, YAW_N, LG.x1 - LG.x0, LG.z1 - LG.z0 + 1.2, 1.4);
  for (const x of [20, 34]) { hangingBanner(c, x, YU + 4.2, LG.z0 + 0.05, YAW_S, 1.1, 3, 'heraldry_banner'); }
  c.light(0xffc890, 2.2, 10, 30, YU + 2.6, -55.5, 0.4);
  enemies.push({ id: 'hh_loggia_retainer', kind: 'hhRetainer', anchor: anchor(33, YU, -55.6, YAW_E), leash: 14 });
  anchors.loggiaView = anchor(24, YU, -54, YAW_S);

  // ================================================================ palace east block and the privy garden below the loggia
  const e = newKit(ctx, 'eastblock', 131);
  e.bmm('stone_wall', 14, Y0, -40, 35.5, 16.4, -15.5, { col: true });
  e.bmm('stone_trim', 13.8, 16.4, -40.2, 35.7, 16.8, -15.3, { cast: false });
  for (let z = -37; z < -17; z += 5) { gothicWindow(e, 35.52, YU, z, YAW_E, 1.6, 4, z === -27, true); gothicWindow(e, 35.52, 2.2, z, YAW_E, 1.2, 2.4, false, false); }
  for (let x = 17; x < 34; x += 5) gothicWindow(e, x, YU, -40.02, YAW_N, 1.6, 4, x === 27, true);
  for (const x of [14.5, 25, 35]) pinnacle(e, x, 16.8, -40, 4, 0.8, x === 25);
  // privy garden (seen from the loggia, not reachable)
  floor(e, 'grass_dead', 14, -53, HS.x0 - 0.6, -40, Y0, 0.3, 'dirt');
  hedge(ctx, e, 18, -50.5, 40, -50.5, Y0, 1.0, 0.7);
  hedge(ctx, e, 18, -43, 40, -43, Y0, 1.0, 0.7);
  topiary(ctx, e, 22, Y0, -46.8, 'cone', 1);
  topiary(ctx, e, 36, Y0, -46.8, 'cone', 1);
  statue(e, 29, Y0, -46.8, YAW_N, 1, 1.4, 1.2);
  autumnTree(ctx, e, 16.5, Y0, -51.5, 9, 99);
  leafLitter(ctx, e, 14, -53, 44, -40, Y0, 300, 81);

  return { shrine, arena, pieces, anchors, enemies };
}

// ================================================================ pieces

/** A boss fog gate (three veils + blocking collider) across an opening centred at (x, z). axis 'z' = veil faces ±Z. */
export function fogGate(ctx: AreaCtx, id: string, x: number, y: number, z: number, axis: 'x' | 'z', W: number, H: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'fog:' + id;
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), mat);
    if (axis === 'x') { m.rotation.y = Math.PI / 2; m.position.set(x + (i - 1) * 0.28, y + H / 2, z); }
    else m.position.set(x, y + H / 2, z + (i - 1) * 0.28);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('household:fog:' + id, axis === 'x' ? [0.7, H, W] : [W, H, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + H / 2, z));
  const piece: DynamicPiece = {
    object: root, collider: c,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      layers.forEach((m, i) => { const k = Math.max(0.001, 1 - e * (1 + i * 0.15)); m.scale.set(1 + e * 0.15, k, 1); m.position.y = y + (H / 2) * k; });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** Iron grille gate that rises into its arch. set(1) = open. */
function ironGate(ctx: AreaCtx, x: number, y: number, z: number, W: number, H: number): DynamicPiece & { anchor: Anchor } {
  const root = new THREE.Group();
  root.name = 'heirsGate';
  ctx.dynamicRoot.add(root);
  const iron = getMaterial('iron'), gilt = getMaterial('gold_trim');
  const grid = new THREE.Group();
  for (let i = 0; i <= 7; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.08).translate(-W / 2 + (W * i) / 7, H / 2, 0), iron); m.castShadow = true; grid.add(m); }
  for (const yy of [0.5, H * 0.5, H - 0.3]) grid.add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, 0.1).translate(0, yy, 0), iron));
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 16), gilt);
  crest.position.set(0, H * 0.72, 0.06);
  grid.add(crest);
  grid.position.set(x, y, z);
  root.add(grid);
  const c = ctx.shared.collision?.addDynamicBox('household:heirsGate', [W, H, 0.5], 'metal');
  const piece = {
    object: root, collider: c, anchor: anchor(x, y, z + 1.6, YAW_N),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      grid.position.y = y + e * (H - 0.2);
      c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + H / 2 + e * (H - 0.2), z));
      if (c) c.enabled = e < 0.6;
    },
  };
  piece.set(0);
  return piece;
}
