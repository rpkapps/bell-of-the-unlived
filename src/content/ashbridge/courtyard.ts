/**
 * Garrison Courtyard (y=3): x ∈ [-13.5, 22], z ∈ [-130, -96]. Curtain walls (3 m thick, walk at
 * y=9 on the north and east sides, reached by a side stair along the east wall), the west gate
 * tower with the DRAWBRIDGE over the ravine to the watchtower ledge and its LEVER, the north gate
 * to the Gate Approach, the east door to the Hospice, a fallen cart with the Bellbronze Shard and
 * the toll post.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Kit, wall, crenellation, parapet, floor, stairs, bellPost, cart, brazier, weaponRack, barrel, crate, crateStack,
  sack, hay, trough, wallBanner, wallShield, shedRoof, armourStand, rubble, cyl, towerSolid, slit, bound,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { type AreaCtx, newKit, anchor, PLAN, yawTo, YAW_W } from './common';

export interface CourtyardBuild {
  drawbridge: DynamicPiece;
  drawbridgeLever: DynamicPiece & { anchor: Anchor };
  bellbronzeShard: Anchor;
  enemies: EnemySpawn[];
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
}

export function buildCourtyard(ctx: AreaCtx): CourtyardBuild {
  const k = newKit(ctx, 'courtyard', 51);
  const C = PLAN.court, Y = C.y, WALK = PLAN.walk;

  // ---------------------------------------------------------------- floor & terrace
  floor(k, 'cobble', C.x0, C.z0, C.x1, C.z1, Y, 0.6);
  k.bmm('flagstone', 1.5, Y + 0.002, C.z0, 6.5, Y + 0.01, C.z1, { cast: false });           // paved axis to the north gate
  k.bmm('flagstone', -12, Y + 0.002, -111.5, 22, Y + 0.01, -108.5, { cast: false });         // west gate ↔ hospice
  k.bmm('stone_dark', -16, -1, -133, 25, Y - 0.6, -94.7, { cast: false, receive: false });  // terrace mass
  for (let i = 0; i < 10; i++) k.box(i % 3 ? 'mud' : 'water', k.rng.range(-10, 20), Y + 0.012, k.rng.range(-128, -98), k.rng.range(0.8, 2.2), 0.01, k.rng.range(0.6, 1.6), { ry: k.rng.range(0, 3), cast: false });

  // ---------------------------------------------------------------- curtain walls
  // north (gate at x = 4, 5 m wide, pointed arch)
  wall(k, 'stone_wall', -16, -131.5, 25, -131.5, 0, WALK, 3, { openings: [{ u: 4 - 4.5, w: 5, sill: Y, h: 3.5, kind: 'pointed', rise: 1.4 }] });
  // east (hospice door at z = -112)
  wall(k, 'stone_wall', 23.5, -133, 23.5, -94.7, 0, WALK, 3, { openings: [{ u: -112 - (-113.85), w: 2.4, sill: Y, h: 3.0, kind: 'round' }] });
  // south (undercroft doorway at x = -3.4), no wall-walk
  wall(k, 'stone_wall', -16, -95.35, 22, -95.35, 0, 8, 1.3, { openings: [{ u: -3.4 - 3, w: 2.4, sill: Y, h: 2.5, kind: 'round' }] });
  crenellation(k, 'stone_wall', -16, -95.35, 22, -95.35, 8, 1.3, { base: 0.3, merlonH: 0.9, col: false });
  // west wall (ravine side) north and south of the gate tower
  wall(k, 'stone_wall', -14.75, -133, -14.75, -115, -12, 22, 2.5);
  wall(k, 'stone_wall', -14.75, -105, -14.75, -94.7, -12, 22, 2.5);
  crenellation(k, 'stone_wall', -15.6, -133, -15.6, -115, 10, 0.8, { col: false });
  crenellation(k, 'stone_wall', -15.6, -105, -15.6, -94.7, 10, 0.8, { col: false });
  k.bmm('stone_trim', -16, 9.7, -133, -13.5, 10, -115, { cast: false });
  k.bmm('stone_trim', -16, 9.7, -105, -13.5, 10, -94.7, { cast: false });
  // gate-arch trims and door surrounds
  k.bmm('stone_trim', 1.2, Y, -130.05, 1.6, 7.4, -129.8, { cast: false });
  k.bmm('stone_trim', 6.4, Y, -130.05, 6.8, 7.4, -129.8, { cast: false });
  k.bmm('stone_trim', 21.8, Y, -113.5, 22.05, 6.4, -113.1, { cast: false });
  k.bmm('stone_trim', 21.8, Y, -110.9, 22.05, 6.4, -110.5, { cast: false });
  // walk surfaces (flag caps) and parapets
  k.bmm('flagstone', -13.5, WALK - 0.02, -133, 25, WALK + 0.005, -130, { cast: false });
  k.bmm('flagstone', 22, WALK - 0.02, -130, 25, WALK + 0.005, -94.7, { cast: false });
  crenellation(k, 'stone_wall', -13.5, -132.7, 25, -132.7, WALK, 0.6);
  crenellation(k, 'stone_wall', 24.7, -132.4, 24.7, -94.7, WALK, 0.6);
  parapet(k, 'stone_wall', -13.5, -130.2, 22.4, -130.2, WALK, 0.4, 1.0);
  parapet(k, 'stone_wall', 22.2, -130.0, 22.2, -110.4, WALK, 0.4, 1.0);
  parapet(k, 'stone_wall', 22.2, -108.0, 22.2, -95.3, WALK, 0.4, 1.0);
  parapet(k, 'stone_wall', 22, -95.0, 24.4, -95.0, WALK, 0.6, 1.2);
  // bartizans (corner turrets) for silhouette
  k.add('stone_wall', cyl(1.6, 1.2, 4.5, 10), { x: 25.2, y: WALK + 0.2, z: -133.2 });
  k.add('roof_slate', cyl(0.001, 2.1, 3.6, 10), { x: 25.2, y: WALK + 4.7, z: -133.2 });
  k.add('stone_wall', cyl(1.6, 1.2, 4.5, 10), { x: -16.2, y: WALK + 1, z: -133.2 });
  k.add('roof_slate', cyl(0.001, 2.1, 3.6, 10), { x: -16.2, y: WALK + 5.5, z: -133.2 });

  // ---------------------------------------------------------------- side stair to the east wall-walk
  const sx = 20.9, sw = 2.2, zLo = -98.4, zHi = -108;
  stairs(k, 'stone_wall', [sx, Y, zLo], [sx, WALK, zHi], sw, { baseY: Y });
  const run = zLo - zHi, rise = WALK - Y, ang = Math.atan2(rise, run);
  for (let i = 0; i < 5; i++) {
    const za = zLo - (run * i) / 5, zb = zLo - (run * (i + 1)) / 5;
    const h = Y + (rise * i) / 5;
    if (h - Y > 0.3) k.solid(sx - sw / 2, Y, zb, sx + sw / 2, h - 0.05, za);
  }
  k.bmm('stone_wall', sx - sw / 2, Y, -110.4, sx + sw / 2 + 0.01, WALK, zHi + 0.01, { col: true });    // top landing
  k.bmm('flagstone', sx - sw / 2, WALK - 0.02, -110.4, sx + sw / 2, WALK + 0.005, zHi, { cast: false });
  // sloped parapet on the stair's open side + landing parapets
  {
    const L = Math.hypot(run, rise);
    k.box('stone_wall', sx - sw / 2 - 0.15, (Y + WALK) / 2 + 0.5, (zLo + zHi) / 2, 0.3, 1.0, L, { rx: ang });
    k.solidC(sx - sw / 2 - 0.15, (Y + WALK) / 2 + 0.55, (zLo + zHi) / 2, 0.3, 1.3, L, [ang, 0, 0]);
  }
  parapet(k, 'stone_wall', sx - sw / 2 - 0.15, zHi + 0.3, sx - sw / 2 - 0.15, -110.4, WALK, 0.3, 1.0);
  parapet(k, 'stone_wall', sx - sw / 2 - 0.3, -110.25, 22.2, -110.25, WALK, 0.3, 1.0);

  // ---------------------------------------------------------------- west gate tower (drawbridge)
  const G = PLAN.westGate;
  const gx0 = G.xOuter, gx1 = G.xInner, gz0 = -115, gz1 = -105;
  // tower body around the passage z ∈ [-112, -108], y ∈ [3, 7.2]
  k.bmm('stone_wall', gx0, -12, gz0, gx1, 18, G.z0, { col: true });
  k.bmm('stone_wall', gx0, -12, G.z1, gx1, 18, gz1, { col: true });
  k.bmm('stone_wall', gx0, -12, G.z0, gx1, Y, G.z1, { col: true });
  wall(k, 'stone_wall', gx0 + 0.6, G.z0, gx0 + 0.6, G.z1, Y, 15, 1.2, { openings: [{ u: 0, w: G.z1 - G.z0, sill: 0, h: 3.0, kind: 'round' }] });
  wall(k, 'stone_wall', gx1 - 0.6, G.z0, gx1 - 0.6, G.z1, Y, 15, 1.2, { openings: [{ u: 0, w: G.z1 - G.z0, sill: 0, h: 3.0, kind: 'round' }] });
  k.bmm('stone_wall', gx0 + 1.2, Y + 5.2, G.z0, gx1 - 1.2, 18, G.z1, { col: true });
  k.bmm('flagstone', gx0, Y - 0.02, G.z0, gx1, Y + 0.005, G.z1, { cast: false });
  k.bmm('timber_dark', gx0 + 1.2, Y + 4.9, G.z0, gx1 - 1.2, Y + 5.2, G.z1, { cast: false });
  // crenellated top, machicolation, slits, a banner toward the courtyard
  k.bmm('stone_trim', gx0 - 0.4, 17.6, gz0 - 0.4, gx1 + 0.4, 18.1, gz1 + 0.4);
  crenellation(k, 'stone_wall', gx0 - 0.1, gz0 - 0.1, gx0 - 0.1, gz1 + 0.1, 18.1, 0.6, { col: false });
  crenellation(k, 'stone_wall', gx1 + 0.1, gz0 - 0.1, gx1 + 0.1, gz1 + 0.1, 18.1, 0.6, { col: false });
  crenellation(k, 'stone_wall', gx0, gz0 - 0.1, gx1, gz0 - 0.1, 18.1, 0.6, { col: false });
  crenellation(k, 'stone_wall', gx0, gz1 + 0.1, gx1, gz1 + 0.1, 18.1, 0.6, { col: false });
  for (const zz of [-113.6, -106.4]) { slit(k, gx0, 10, zz, -Math.PI / 2); slit(k, gx1, 12, zz, Math.PI / 2); }
  wallBanner(k, gx1, 14.5, -110, Math.PI / 2, 1.6, 4.2);
  // raised-bridge recess frame (the deck stands here when raised)
  k.bmm('timber_dark', gx0 - 0.2, Y, G.z0 - 0.3, gx0, Y + 11, G.z0, { cast: false });
  k.bmm('timber_dark', gx0 - 0.2, Y, G.z1, gx0, Y + 11, G.z1 + 0.3, { cast: false });
  // chain holes (iron eyes) where the chains enter the tower
  for (const zz of [G.z0 + 0.1, G.z1 - 0.1]) k.add('iron', new THREE.TorusGeometry(0.22, 0.06, 6, 10), { x: gx0 - 0.05, y: Y + 12, z: zz, ry: Math.PI / 2 }, { cast: false });
  // foundation buttresses down into the ravine
  for (const zz of [-126, -118, -101]) k.bmm('stone_dark', -17.2, -12, zz - 1, -15.8, 1, zz + 1);

  const drawbridge = buildDrawbridge(ctx, gx0, Y, G.z0, G.z1);
  const lever = buildLever(ctx, k, gx1, Y, gz1 - 1.5);

  // ---------------------------------------------------------------- courtyard furnishings
  const tp = new THREE.Vector3(4, Y, -113);
  bellPost(k, tp.x, Y, tp.z, 0);
  // armoury lean-to along the west wall, north of the gate tower
  k.bmm('timber_dark', -13.4, Y, -129.5, -13.2, Y + 3.8, -116.5, { cast: false });
  for (const zz of [-129.3, -125, -120.7, -116.7]) k.box('timber_dark', -10.2, Y + 1.6, zz, 0.22, 3.2, 0.22, { col: 'wood' });
  shedRoof(k, -11.8, Y + 4.3, -123, Math.PI / 2 + Math.PI, 13.6, 4.2, 1.2);
  weaponRack(k, -12.8, Y, -127.2, Math.PI / 2, 2.4);
  weaponRack(k, -12.8, Y, -122.6, Math.PI / 2, 2.4);
  armourStand(k, -12.6, Y, -119.2, Math.PI / 2);
  crateStack(k, -12.2, Y, -117.6, Math.PI / 2);
  // the fallen cart with the Bellbronze Shard
  cart(k, -5.5, Y, -124.5, 0.5, true, true);
  const shardPos = k.wp(-6.9, Y + 0.12, -123.6);
  k.add('bronze_bell', new THREE.TetrahedronGeometry(0.16, 0), { x: shardPos.x, y: shardPos.y, z: shardPos.z, rx: 0.4, rz: 0.9 }, { cast: false });
  k.box('unlived_crack', shardPos.x, shardPos.y + 0.02, shardPos.z, 0.02, 0.02, 0.22, { ry: 0.7, cast: false });
  rubble(k, -3.2, Y, -127.8, 0.9, false);
  // stabling & supplies along the south wall (east part)
  shedRoof(k, 14.5, Y + 3.9, -97.6, 0, 11, 3.4, 1.0);
  for (const xx of [9.2, 14.5, 19.8]) k.box('timber_dark', xx, Y + 1.4, -99.1, 0.2, 2.8, 0.2, { col: 'wood' });
  hay(k, 11, Y, -97.3, 0.1); hay(k, 16.8, Y, -97.4, -0.2);
  trough(k, 13.6, Y, -100.4, 0);
  barrel(k, 9.6, Y, -97.2, 0, true); barrel(k, 10.3, Y, -97.5, 0.4, true); sack(k, 18.4, Y, -97.4, 0.3);
  // west gate area and north gate
  crateStack(k, -9.8, Y, -102.2, 0.3);
  brazier(k, -1.2, Y, -101.5, true, 1.0);
  brazier(k, 11.5, Y, -127.5, true, 1.0);
  k.light(0xff9c50, 9, 14, -1.2, Y + 1.8, -101.5, 0.9);
  k.light(0xff9c50, 9, 14, 11.5, Y + 1.8, -127.5, 0.9);
  wallBanner(k, -1.2, 8.3, -130.05, 0, 1.4, 3.6);
  wallBanner(k, 9.2, 8.3, -130.05, 0, 1.4, 3.6);
  wallShield(k, 4, 8.6, -130.0, 0, 1.0);
  crate(k, 20.6, Y, -122.4, 0.2, 0.9, true); barrel(k, 20.8, Y, -124, 0, true); barrel(k, 20.5, Y, -125, 0.5, true);
  crate(k, -12.6, Y, -97.2, 0.4, 0.8, true);

  // bounds: over the south wall top, and the ravine side of the courtyard wall tops (no walks there)
  bound(k, -16, -95.35, 22, -95.35, 8, 4, 1.3);

  const enemies: EnemySpawn[] = [
    { id: 'ash_court_shield', kind: 'shieldBearer', anchor: anchor(6.2, Y, -116.5, yawTo(6.2, -116.5, -3.4, -96.5)), leash: 18, idleAnim: 'stand' },
    { id: 'ash_court_archer', kind: 'archer', anchor: anchor(19.2, WALK, -131.4, yawTo(19.2, -131.4, 4, -112)), leash: 4, idleAnim: 'stand' },
    { id: 'ash_court_inf_1', kind: 'infantry', anchor: anchor(-8.2, Y, -112.5, yawTo(-8.2, -112.5, -3.4, -96.5)), leash: 16, idleAnim: 'stand' },
  ];

  return {
    drawbridge,
    drawbridgeLever: lever,
    bellbronzeShard: anchor(shardPos.x, shardPos.y, shardPos.z, YAW_W),
    enemies,
    tollPost: {
      id: 'toll_courtyard', pos: tp.clone(), radius: 3.5,
      options: [
        { id: 'hospice', toward: new THREE.Vector3(22, Y, -112) },
        { id: 'gate', toward: new THREE.Vector3(4, Y, -130) },
      ],
    },
  };
}

/**
 * Drawbridge hinged at the gate tower's outer face (x = hingeX, y = floor) spanning the ravine
 * west to the watchtower ledge. t=0 raised (vertical against the tower, underside toward the
 * ravine); t=1 lowered (deck top y = floor + 0.08 from x = -17 to -27.6). The deck collider (with
 * side rails) is enabled only when t > 0.95; two blockers (gate mouth, ledge gap) are enabled
 * otherwise so nobody walks into the ravine through the gap.
 */
function buildDrawbridge(ctx: AreaCtx, hingeX: number, y: number, z0: number, z1: number): DynamicPiece {
  const L = 10.6, W = z1 - z0, T = 0.3, top = 0.08;
  const root = new THREE.Group();
  root.name = 'drawbridge';
  ctx.dynamicRoot.add(root);
  const pivot = new THREE.Group();
  pivot.position.set(hingeX, y + top, (z0 + z1) / 2);
  root.add(pivot);
  const deck = new Kit('drawbridgeDeck', ctx.shared, 9);
  // planks run along the span; cross beams underneath; iron straps; low side rails
  const nP = 16;
  for (let i = 0; i < nP; i++) {
    const zz = -W / 2 + (W * (i + 0.5)) / nP;
    deck.bmm('planks', -L, -0.1, zz - W / nP / 2 + 0.012, 0, 0, zz + W / nP / 2 - 0.012, { variant: i % 3 });
  }
  for (let i = 0; i < 7; i++) deck.bmm('timber_dark', -0.4 - i * 1.65 - 0.2, -T, -W / 2, -0.4 - i * 1.65 + 0.2, -0.1, W / 2);
  for (const zz of [-W / 2 + 0.25, W / 2 - 0.25]) deck.bmm('timber_dark', -L, -T - 0.05, zz - 0.15, 0, -0.1, zz + 0.15);
  for (const xx of [-0.6, -L / 2, -L + 0.6]) deck.bmm('iron', xx - 0.06, 0, -W / 2, xx + 0.06, 0.012, W / 2, { cast: false });
  for (const s of [-1, 1]) {
    const zz = s * (W / 2 - 0.06);
    deck.bmm('timber_dark', -L + 0.1, 0.85, zz - 0.06, -0.1, 0.97, zz + 0.06, { cast: false });
    for (let i = 0; i < 6; i++) deck.bmm('timber_dark', -0.3 - i * 2, 0, zz - 0.06, -0.18 - i * 2, 0.95, zz + 0.06, { cast: false });
  }
  deck.bmm('iron', -L, -0.2, -W / 2, -L + 0.12, 0.02, W / 2, { cast: false });
  deck.finish(pivot);
  // chains: from the tower eyes to the deck's far corners (updated in set())
  const chainMat = getMaterial('iron');
  const chains: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new THREE.Mesh(cyl(0.045, 0.045, 1, 5).translate(0, -0.5, 0), chainMat);
    c.castShadow = true;
    root.add(c);
    chains.push(c);
  }
  // ledge-gap warning chain (visible while raised)
  const gap = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Mesh(cyl(0.035, 0.035, 2.3, 5), chainMat);
    g.rotation.x = Math.PI / 2 + (i ? -0.18 : 0.18);
    g.position.set(-26.1, y + 0.95 - 0.1, (z0 + z1) / 2 + (i ? 1.12 : -1.12));
    gap.add(g);
  }
  root.add(gap);
  // colliders
  const col = ctx.shared.collision;
  let deckCol: import('../../world/Collision').Collider | undefined;
  let blockGate: import('../../world/Collision').Collider | undefined;
  let blockLedge: import('../../world/Collision').Collider | undefined;
  if (col) {
    const parts = [
      new THREE.BoxGeometry(L, T, W).translate(-L / 2, -T / 2, 0),
      new THREE.BoxGeometry(L, 1.3, 0.2).translate(-L / 2, 0.65, -W / 2 + 0.1),
      new THREE.BoxGeometry(L, 1.3, 0.2).translate(-L / 2, 0.65, W / 2 - 0.1),
    ].map((g) => g.toNonIndexed());
    for (const g of parts) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); }
    deckCol = col.addDynamicGeometry('ashbridge:drawbridge', mergeGeometries(parts, false), 'wood');
    blockGate = col.addDynamicBox('ashbridge:drawbridgeGateBlock', [0.6, 5, W + 0.4], 'wood');
    blockGate.setMatrix(new THREE.Matrix4().makeTranslation(hingeX - 0.1, y + 2.5, (z0 + z1) / 2));
    blockLedge = col.addDynamicBox('ashbridge:drawbridgeLedgeBlock', [0.5, 1.4, W + 0.6], 'stone');
    blockLedge.setMatrix(new THREE.Matrix4().makeTranslation(-26.1, y + 0.7, (z0 + z1) / 2));
  }
  const eyes = [new THREE.Vector3(hingeX - 0.05, y + 12, z0 + 0.1), new THREE.Vector3(hingeX - 0.05, y + 12, z1 - 0.1)];
  const tip = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const piece: DynamicPiece = {
    object: root,
    collider: deckCol,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const ease = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      pivot.rotation.z = -(Math.PI / 2) * (1 - ease);
      pivot.updateMatrixWorld(true);
      for (let i = 0; i < 2; i++) {
        tip.set(-L + 0.3, 0.1, i ? W / 2 - 0.1 : -W / 2 + 0.1).applyMatrix4(pivot.matrixWorld);
        const a = eyes[i];
        const d = tip.clone().sub(a);
        const len = d.length();
        const c = chains[i];
        c.position.copy(a);
        c.scale.set(1, len, 1);
        c.quaternion.setFromUnitVectors(up.clone().negate(), d.normalize());
      }
      const lowered = e > 0.95;
      gap.visible = !lowered;
      if (deckCol) { deckCol.enabled = lowered; deckCol.syncTo(pivot); }
      if (blockGate) blockGate.enabled = !lowered;
      if (blockLedge) blockLedge.enabled = !lowered;
    },
  };
  piece.set(0);
  return piece;
}

/** Drawbridge lever on the gate tower's inner face; t=0 up, t=1 pulled down. */
function buildLever(ctx: AreaCtx, k: Kit, wallX: number, y: number, z: number): DynamicPiece & { anchor: Anchor } {
  // mechanism housing (static)
  k.bmm('iron', wallX, y, z - 0.45, wallX + 0.35, y + 1.1, z + 0.45, { col: 'metal' });
  k.bmm('timber_dark', wallX, y + 1.1, z - 0.55, wallX + 0.45, y + 1.3, z + 0.55, { cast: false });
  k.add('iron', new THREE.TorusGeometry(0.35, 0.05, 6, 12), { x: wallX + 0.36, y: y + 1.9, z, ry: Math.PI / 2 }, { cast: false });
  k.bmm('iron', wallX, y + 1.3, z - 0.1, wallX + 0.2, y + 2.4, z + 0.1, { cast: false });
  const pivot = new THREE.Group();
  pivot.name = 'drawbridgeLever';
  pivot.position.set(wallX + 0.5, y + 1.25, z);
  ctx.dynamicRoot.add(pivot);
  const arm = new Kit('leverArm', ctx.shared, 4);
  arm.add('iron', cyl(0.05, 0.06, 1.1, 6), {}, { cast: true });
  arm.add('leather_dark', cyl(0.07, 0.07, 0.3, 6), { y: 0.85 }, { cast: false });
  arm.add('iron', cyl(0.12, 0.12, 0.2, 8), { rz: Math.PI / 2 }, { cast: false });
  arm.finish(pivot);
  const piece: DynamicPiece & { anchor: Anchor } = {
    object: pivot,
    anchor: anchor(wallX + 1.3, y, z, YAW_W),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      pivot.rotation.x = 0.45 + e * 2.25;
    },
  };
  piece.set(0);
  return piece;
}

export const COURTYARD_ZONE = new THREE.Box3(new THREE.Vector3(-17, 2, -133.5), new THREE.Vector3(25, 16, -94.7));
export { towerSolid };
