/**
 * The Bell Crown: the tower top where the five Great Bells are rung together.
 *  - the roof (the tower's square top plus a circular platform bulging north over the storm),
 *    concentric trim rings inlaid in the floor (the bands the Sorcerer-King makes ring),
 *  - five silenced Great Bells on gothic frames round the northern edge (Army iron, Academy glass,
 *    Cathedral stone, Treasury gold, Household bronze), each cracked where its keeper fell,
 *  - a colossal pointed arch spanning the arena east–west from which hangs the Bell of Return
 *    (the landmark of the whole region, visible from the Foot); it lowers when Aldren falls,
 *  - the stairhouse on the south edge: the stair from the Coronation arrives here, beside the
 *    `belfry.crown` Stillbell and the veil into the arena.
 */
import * as THREE from 'three';
import type { ArenaLayout, DynamicPiece } from '../../world/levelTypes';
import { Kit, wall, floor, stillbellShrine, towerRound, crenellation, extrudeXY, bellGeo, cyl, cone, sphere, ringSector, archPoints, brazier, lathe, type StillbellShrine } from '../../world/kit';
import type { MaterialId } from '../../render/materialIds';
import { getMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import { type BCtx, PLAN, newKit, anchor, parapetWall, balustrade, fogGate, glowMaterial, YAW_N, YAW_S, YAW_W } from './levelCommon';
import { RING_BANDS } from './bosses';

export interface CrownBuild {
  shrine: StillbellShrine;
  arena: ArenaLayout;
  /** Telegraph glow meshes for the ring bands (index = band). */
  bands: THREE.Mesh[];
  update: (dt: number, time: number) => void;
}

const GREAT_BELLS: { id: string; mat: MaterialId; frame: MaterialId; label: string }[] = [
  { id: 'army', mat: 'iron', frame: 'stone_dark', label: 'Siegeholm' },
  { id: 'academy', mat: 'glass', frame: 'stone_trim', label: 'The Suspended Campus' },
  { id: 'cathedral', mat: 'stone_trim', frame: 'stone_wall', label: 'The Pilgrim Stair' },
  { id: 'treasury', mat: 'gold_trim', frame: 'stone_dark', label: 'The Undervaults' },
  { id: 'household', mat: 'bronze_bell', frame: 'stone_trim', label: 'The Garden Court' },
];

export function buildCrown(ctx: BCtx): CrownBuild {
  const y = PLAN.roof, C = PLAN.crown.c, R = PLAN.crown.r, D = PLAN.crown.disc, H = PLAN.H;
  const k = newKit(ctx, 'crown', 501, y);

  // ---------------------------------------------------------------- the floor
  // circular segment north of the tower wall (z < −H)
  const zCut = -H;
  const aCut = Math.asin((zCut - C.z) / D); // negative
  const pts: [number, number][] = [];
  const a0 = Math.PI - aCut, a1 = 2 * Math.PI + aCut; // from the west crossing to the east crossing via north
  const N = 28;
  for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N; pts.push([C.x + Math.cos(a) * D, C.z + Math.sin(a) * D]); }
  const segShape = extrudeXY(pts.map(([x, z]) => [x, -z] as [number, number]), 1.2);
  // extrudeXY builds in XY with depth along +Z; map to the floor: rotate so shape-y → world −z, depth → down
  segShape.rotateX(-Math.PI / 2);
  segShape.translate(0, -0.6, 0);
  k.add('flagstone', segShape.clone(), { y }, { cast: false });
  k.colGeo(segShape, { y }, 'stone');
  // corbel table under the overhang
  for (let i = 0; i <= 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    k.box('stone_trim', C.x + Math.cos(a) * (D - 0.5), y - 1.9, C.z + Math.sin(a) * (D - 0.5), 0.8, 1.4, 0.8, { ry: -a, cast: false });
  }
  // inlaid trim rings: the bands the arena rings in
  for (const [r0, r1] of RING_BANDS) {
    if (r0 > 0.1) k.add('stone_trim', ringSector(r0 - 0.12, r0 + 0.12, 0, Math.PI * 2 - 0.001, 0.02, 64), { x: C.x, y: y + 0.012, z: C.z }, { cast: false });
    void r1;
  }
  k.add('bronze', ringSector(0, 1.2, 0, Math.PI * 2 - 0.001, 0.03, 32), { x: C.x, y: y + 0.015, z: C.z }, { cast: false });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.box('stone_trim', C.x + Math.cos(a) * 8, y + 0.012, C.z + Math.sin(a) * 8, 3.2, 0.02, 0.12, { ry: -a, cast: false });
  }
  // telegraph glow bands (animated by the region)
  const bands: THREE.Mesh[] = RING_BANDS.map(([r0, r1], i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.05, r0), r1, 72, 1).rotateX(-Math.PI / 2), glowMaterial(0xffc27a, 0));
    m.position.set(C.x, y + 0.04 + i * 0.002, C.z);
    m.renderOrder = 6;
    m.visible = false;
    ctx.dynamicRoot.add(m);
    return m;
  });

  // ---------------------------------------------------------------- parapets
  for (let i = 0; i < N; i++) {
    const aa = a0 + ((a1 - a0) * i) / N, ab = a0 + ((a1 - a0) * (i + 1)) / N;
    const r = D - 0.25;
    parapetWall(k, C.x + Math.cos(aa) * r, C.z + Math.sin(aa) * r, C.x + Math.cos(ab) * r, C.z + Math.sin(ab) * r, y, 0.5);
  }
  const xCut = Math.abs(Math.cos(aCut) * D);
  parapetWall(k, -H + 0.25, -H, -H + 0.25, -6.3, y);
  parapetWall(k, -H + 0.25, -3.7, -H + 0.25, H, y);
  parapetWall(k, H - 0.25, -H, H - 0.25, -6.3, y);
  parapetWall(k, H - 0.25, -3.7, H - 0.25, H, y);
  parapetWall(k, -H, -H + 0.25, -xCut, -H + 0.25, y);
  parapetWall(k, xCut, -H + 0.25, H, -H + 0.25, y);
  parapetWall(k, -H, H - 0.25, PLAN.stairhouse.x0, H - 0.25, y);
  parapetWall(k, PLAN.stairhouse.x1, H - 0.25, H, H - 0.25, y);
  // corner turrets
  for (const [x, z] of [[-H, -H], [H, -H], [-H, H], [H, H]]) towerRound(k, 'stone_wall', x, y - 6, z, 2.0, 10.5, 6.5, true, true);

  // ---------------------------------------------------------------- the five Great Bells, silenced
  GREAT_BELLS.forEach((gb, i) => {
    const a = -Math.PI / 2 + (i - 2) * 0.64;
    const rr = R + 0.3;
    const x = C.x + Math.cos(a) * rr, z = C.z + Math.sin(a) * rr;
    const yaw = Math.atan2(C.x - x, C.z - z);
    k.push(x, y, z, yaw);
    for (const s of [-1, 1]) {
      k.box(gb.frame, s * 1.9, 3.1, 0, 0.7, 6.2, 0.7, { col: true });
      k.box('stone_trim', s * 1.9, 0.2, 0, 0.9, 0.4, 0.9, { cast: false });
    }
    const arch: [number, number][] = [[-2.25, 6.2], [2.25, 6.2], ...archPoints(-2.25, 2.25, 6.2, 'pointed', 2.4).reverse()];
    k.add(gb.frame, extrudeXY(arch, 0.6), { z: -0.3 });
    k.box('timber_dark', 0, 6.0, 0, 3.4, 0.35, 0.45);
    const bell = bellGeo(2.5, 20);
    k.add(gb.mat, bell, { y: 5.9 });
    // the crack of its silencing
    for (let c = 0; c < 5; c++) k.box('unlived_crack', -0.2 + c * 0.1, 4.6 - c * 0.35, 1.2 - c * 0.02, 0.05, 0.5, 0.04, { rz: 0.3 * (c % 2 ? 1 : -1), cast: false });
    k.box('stone_dark', 0, 0.35, 0.5, 1.6, 0.5, 0.12, { cast: false });
    k.box('bronze', 0, 0.35, 0.57, 1.3, 0.3, 0.02, { cast: false });
    k.pop();
  });

  // ---------------------------------------------------------------- the colossal arch and the Bell of Return
  const archH = 44, spring = 18, rise = 16, span = 25.2;
  wall(k, 'stone_wall', -H, C.z, H, C.z, y, archH, 2.4, { openings: [{ u: 0, w: span, sill: 0, h: spring, kind: 'pointed', rise }] });
  // voussoir trim and a crown of pinnacles
  const ring = archPoints(-span / 2, span / 2, spring, 'pointed', rise);
  const rp: [number, number][] = [[-span / 2, spring], ...ring, [span / 2, spring]];
  for (let i = 0; i < rp.length - 1; i++) {
    const [ax, ay] = rp[i], [bx, by] = rp[i + 1];
    const L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    for (const s of [-1, 1]) k.box('stone_trim', (ax + bx) / 2 - Math.sin(ang) * 0.35, y + (ay + by) / 2 + Math.cos(ang) * 0.35, C.z + s * 1.25, L + 0.1, 0.7, 0.2, { rz: ang, cast: false });
  }
  for (const x of [-13.8, -7, 0, 7, 13.8]) {
    const top = y + archH;
    k.add('stone_trim', cone(0.9, 5 + (x === 0 ? 4 : 0), 8), { x, y: top, z: C.z });
    k.add('stone_wall', cyl(0.7, 0.8, 1.2, 8), { x, y: top - 0.4, z: C.z });
  }
  k.box('stone_trim', 0, y + archH - 0.3, C.z, 30.6, 0.6, 2.9, { cast: false });
  for (const s of [-1, 1]) for (let yy = y + 6; yy < y + archH - 4; yy += 7) k.box('stone_trim', s * 13.8, yy, C.z, 2.6, 0.35, 2.7, { cast: false });
  const bellPiece = bellOfReturn(ctx, C.x, y, C.z, y + spring + rise - 1.2);
  ctx.pieces.crownBell = bellPiece;
  ctx.anchors.bellRope = anchor(C.x, y, C.z + 1.2, YAW_N);
  // braziers on the crown (the only warm light up here)
  for (const [x, z] of [[-10.5, 5.5], [10.5, 5.5], [-12, -12], [12, -12]]) {
    brazier(k, x, y, z, true, 1.2);
    k.light(0xff9a50, 10, 16, x, y + 2.2, z, 0.9);
  }

  // ---------------------------------------------------------------- the stairhouse
  const S = PLAN.stairhouse, sh = S.top - y;
  const fz = PLAN.crownFog.z, fx = PLAN.crownFog.x;
  const mid = (S.x0 + S.x1) / 2;
  wall(k, 'stone_wall', S.x0, fz + 0.3, S.x1, fz + 0.3, y, sh, 0.6, { openings: [{ u: fx - mid, w: 3.0, sill: 0, h: 3.0, kind: 'round' }] });
  wall(k, 'stone_wall', S.x0 + 0.3, fz, S.x0 + 0.3, S.z1, y, sh, 0.6);
  wall(k, 'stone_wall', S.x1 - 0.3, fz, S.x1 - 0.3, S.z1, y, sh, 0.6);
  wall(k, 'stone_wall', S.x0, S.z1 - 0.6, S.x1, S.z1 - 0.6, y, sh, 1.2);
  floor(k, 'stone_dark', S.x0 - 0.3, fz - 0.3, S.x1 + 0.3, S.z1 + 0.3, S.top + 0.5, 0.5, false);
  crenellation(k, 'stone_wall', S.x0 - 0.2, fz - 0.1, S.x1 + 0.2, fz - 0.1, S.top + 0.5, 0.45, { col: false });
  balustrade(k, PLAN.crownStairX[0] - 0.5, PLAN.laneS[0] - 0.2, PLAN.crownStairX[1], PLAN.laneS[0] - 0.2, y);
  const shrine = stillbellShrine(k, S.x1 - 1.4, y, 12.4, YAW_W, 7);
  k.light(0xffb070, 4, 7, 5.6, y + 2.6, 13.6, 0.6);
  const fog = fogGate(ctx, 'aldren', fx, y, fz, YAW_N, 3.0, 4.4);

  const arena: ArenaLayout = {
    bossId: 'aldren', center: C.clone(), radius: R,
    fogGate: fog,
    entry: fog.anchor,
    spawn: anchor(C.x, y, C.z - 5.5, YAW_S),
    onDefeat: [bellPiece],
  };
  void sphere; void getMaterial;

  let sway = 0;
  const update = (dt: number, time: number) => {
    sway = time;
    (bellPiece as unknown as { tick(t: number): void }).tick(sway);
    void dt;
  };
  return { shrine, arena, bands, update };
}

/**
 * The Bell of Return: a colossal cracked bell hung from the arch apex. set(t): 0 = hung high over
 * the arena (mouth ~23 m above the floor); 1 = lowered on its chains, mouth 6 m above the floor,
 * the bell-rope hanging to the centre of the Crown (where the final decision is made).
 */
function bellOfReturn(ctx: BCtx, x: number, floorY: number, z: number, apexY: number): DynamicPiece & { tick(t: number): void } {
  const root = new THREE.Group();
  root.name = 'bellOfReturn';
  ctx.dynamicRoot.add(root);
  const Hb = 10.5;
  const hangHigh = apexY - 1.0, hangLow = floorY + 6 + Hb;
  const bell = new THREE.Group();
  // outer bronze and a dark, rough inner surface (seen from below, the mouth must read as a void)
  const r = Hb * 0.62;
  const prof: [number, number][] = [
    [r * 0.94, -Hb], [r * 1.0, -Hb * 0.97], [r * 0.93, -Hb * 0.9], [r * 0.78, -Hb * 0.72], [r * 0.64, -Hb * 0.5],
    [r * 0.58, -Hb * 0.3], [r * 0.55, -Hb * 0.16], [r * 0.46, -Hb * 0.07], [r * 0.25, -Hb * 0.02], [0.001, 0],
  ];
  const innerProf: [number, number][] = [[0.001, -Hb * 0.1], [r * 0.4, -Hb * 0.2], [r * 0.5, -Hb * 0.5], [r * 0.7, -Hb * 0.8], [r * 0.9, -Hb * 0.985]];
  const body = new THREE.Mesh(lathe(prof, 40), getMaterial('bronze_bell'));
  const innerBody = new THREE.Mesh(lathe(innerProf.slice().reverse(), 40), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.95, metalness: 0.2 }));
  body.castShadow = true; body.receiveShadow = true;
  bell.add(body, innerBody);
  // gold light bleeding from the great crack and from inside the mouth
  const crackMat = getMaterial('unlived_crack');
  let cx = 1.2, cy = -1.2;
  for (let i = 0; i < 14; i++) {
    const nx = cx + (Math.sin(i * 2.3) * 0.45), ny = cy - 0.68;
    const r = Hb * 0.62 * (0.55 + 0.45 * Math.min(1, -ny / Hb)) + 0.05;
    const L = Math.hypot(nx - cx, ny - cy);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.12, L + 0.05, 0.08), crackMat);
    const px = (cx + nx) / 2;
    seg.position.set(px, (cy + ny) / 2, Math.sqrt(Math.max(0.1, r * r - px * px)));
    seg.rotation.z = Math.atan2(nx - cx, -(ny - cy)) * -1;
    bell.add(seg);
    cx = nx; cy = ny;
  }
  const inner = new THREE.Mesh(new THREE.ConeGeometry(Hb * 0.5, Hb * 0.7, 32, 1, true).rotateX(Math.PI), glowMaterial(0xffb060, 0.08));
  inner.position.y = -Hb * 0.62;
  bell.add(inner);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10), getMaterial('iron'));
  clapper.position.y = -Hb * 0.86;
  bell.add(clapper);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.6), getMaterial('iron'));
  yoke.position.y = 0.4;
  bell.add(yoke);
  root.add(bell);
  // chains from the apex to the yoke (scaled with the drop)
  const chainMat = getMaterial('iron');
  const chains: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6), chainMat);
    chains.push(c);
    c.position.x = x + s * 1.1;
    root.add(c);
  }
  // the bell-rope, hanging from the clapper to the floor once lowered
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), getMaterial('rope'));
  root.add(rope);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), getMaterial('cloth_red'));
  root.add(tassel);
  const light = new THREE.PointLight(0xffc88a, 0, 26, 1.6);
  root.add(light);
  registerLight(light);
  let t0 = 0, cur = 0;
  const place = () => {
    const hang = hangHigh + (hangLow - hangHigh) * cur;
    const swing = Math.sin(t0 * 0.35) * 0.012 * (1 - cur);
    bell.position.set(x, hang, z);
    bell.rotation.z = swing;
    for (const c of chains) {
      const len = Math.max(0.1, apexY - (hang + 1.0));
      c.scale.y = len;
      c.position.set(c.position.x, hang + 1.0 + len / 2, z);
    }
    const mouthY = hang - Hb * 0.86;
    const ropeLen = Math.max(0.1, mouthY - (floorY + 0.35));
    rope.scale.y = ropeLen;
    rope.position.set(x, floorY + 0.35 + ropeLen / 2, z);
    rope.visible = cur > 0.85;
    tassel.position.set(x, floorY + 0.35, z);
    tassel.visible = rope.visible;
    light.position.set(x, hang - Hb - 3.5, z);
    light.intensity = 1.5 + cur * 5;
  };
  const piece = {
    object: root,
    set(t: number) { cur = Math.min(1, Math.max(0, t)); place(); },
    tick(time: number) { t0 = time; place(); },
  };
  piece.set(0);
  return piece;
}

export { YAW_S };
