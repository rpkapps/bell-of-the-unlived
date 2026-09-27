/**
 * Lower Street (y=0): west plaza at the foot of the rim path, the street east to the square in
 * front of the Old Mint, the crossroads bell-post with a side alley south to a dead-end yard
 * (loot nook), the stone guildhall with the Greyford relief and its graves, and a burned timber
 * house crashed into the stone facade.
 *
 * Walkable space is bounded by explicit collider walls on the facade lines (houses are visual).
 */
import * as THREE from 'three';
import type { Anchor, EnemySpawn } from '../../world/levelTypes';
import {
  house, bound, floor, bellPost, reliefPanel, headstone, rubble, fallenBeam, barrel, crate, crateStack, sack,
  cart, well, marketStall, laundryLine, bracketLantern, wall, deadTree, PuffField, lantern, bucket, candles,
  bench, strongbox,
} from '../../world/kit';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_W } from './common';

export interface StreetBuild {
  greyfordRelief: Anchor;
  lootNook: Anchor;
  enemies: EnemySpawn[];
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
  smoke: PuffField;
}

export function buildStreet(ctx: AreaCtx): StreetBuild {
  const k = newKit(ctx, 'street', 21);
  const S = PLAN.street, Q = PLAN.square;

  // ---------------------------------------------------------------- ground
  // one collider slab under the whole lower town; visuals per surface
  k.solid(-32, -1, -47, 23, 0, -5);
  floor(k, 'cobble', -30.2, -46, -25.8, S.z0, 0, 0.3, false);            // foot of the rim path
  floor(k, 'cobble', -30.2, S.z0, Q.x0, S.z1, 0, 0.3, false);            // street
  floor(k, 'cobble', -22, -38.6, -13.5, S.z0, 0, 0.3, false);            // grave strip
  floor(k, 'cobble', Q.x0, Q.z0 - 2, Q.x1, Q.z1, 0, 0.3, false);         // square
  floor(k, 'mud', -14.2, S.z1, -10.3, -17.8, 0, 0.3, false);             // alley
  floor(k, 'mud', -18.2, -18.2, -5.8, -7.8, 0, 0.3, false);              // yard
  // gutter + puddles (thin, flush)
  k.bmm('stone_dark', -30, 0.004, -33.2, Q.x0, 0.012, -32.8, { cast: false });
  for (let i = 0; i < 14; i++) {
    const x = k.rng.range(-29, 18), z = x < 0 ? k.rng.range(-36, -30) : k.rng.range(-34, -25);
    k.box('water', x, 0.012, z, k.rng.range(0.8, 2.4), 0.01, k.rng.range(0.6, 1.6), { ry: k.rng.range(0, 3), cast: false, receive: true });
  }
  // kerbs along facades
  k.bmm('stone_trim', -24, 0, S.z0 - 0.3, -22, 0.12, S.z0, { cast: false });
  k.bmm('stone_trim', -13.5, 0, S.z0 - 0.3, Q.x0, 0.12, S.z0, { cast: false });

  // ---------------------------------------------------------------- north side houses
  house(k, -23.9, 0, S.z0, 0, { w: 3.9, d: 9, storeys: 3, roof: 'front', seed: 101, lit: 0.5, sign: true });
  // N2: the prosperous stone guildhall (facade set back to z = -38.5 for the grave strip)
  const gh = house(k, -17.75, 0, -38.5, 0, { w: 8.5, d: 9.5, storeys: 3, stone: true, roof: 'side', seed: 102, lit: 0.55, groundH: 3.6, storeyH: 3.1, jetty: 0, chimneys: 2 });
  // pilasters and a cornice make it read as civic/prosperous
  for (const px of [-21.8, -19.2, -16.3, -13.7]) k.bmm('stone_trim', px - 0.25, 0, -38.5, px + 0.25, gh.eaves, -38.25, { cast: false });
  k.bmm('stone_trim', -22.2, gh.eaves - 0.1, -38.8, -13.3, gh.eaves + 0.35, -38.05, { cast: false });
  reliefPanel(k, -18.2, 1.3, -38.4, 0, 3.6, 2.0);
  // the graves in front of the relief (older than the victory it celebrates)
  for (let i = 0; i < 5; i++) headstone(k, -21 + i * 1.45, 0, -38.15, 0, k.rng.range(0.8, 1.1), 0.58, k.rng.range(-0.08, 0.08));
  candles(k, -18.9, 0.1, -37.2, 3, 0.1);
  // N3: burned timber house crashed through the guildhall's east end
  house(k, -9.6, 0, S.z0, 0, { w: 8.2, d: 9, storeys: 3, burned: true, roof: 'side', seed: 103, stoneBase: true });
  k.bmm('stone_dark', -14.2, 3.4, -46, -13.2, 7.2, -38.4, { cast: true });                     // broken party wall
  fallenBeam(k, [-8.5, 7.8, -40], [-15.5, 2.2, -38.9], 0.32);
  fallenBeam(k, [-6.5, 6.5, -39.5], [-11.2, 0.3, -37.4], 0.26);
  fallenBeam(k, [-12.8, 4.8, -41], [-12.2, 0.2, -37.6], 0.22);
  rubble(k, -11.5, 0, -37.8, 1.2, true, false);
  rubble(k, -7.2, 0, -37.9, 0.8, true, false);
  // embers in the ruin (visual only; one light)
  for (let i = 0; i < 6; i++) k.box('ember_glow', k.rng.range(-12.5, -6.5), 0.08, k.rng.range(-42, -38.2), k.rng.range(0.2, 0.6), 0.06, k.rng.range(0.2, 0.5), { ry: k.rng.range(0, 3), cast: false });
  k.light(0xff7a30, 6, 9, -9.5, 1.2, -39.5, 1);
  house(k, -1, 0, S.z0, 0, { w: 7.9, d: 8, storeys: 2, roof: 'front', seed: 104, lit: 0.6, shop: true, sign: true });

  // ---------------------------------------------------------------- south side houses (face north)
  house(k, -27.5, 0, S.z1, Math.PI, { w: 6.8, d: 8, storeys: 3, roof: 'side', seed: 111, lit: 0.45, stoneBase: true });
  house(k, -21.5, 0, S.z1, Math.PI, { w: 5, d: 8, storeys: 2, roof: 'front', seed: 112, lit: 0.5, shop: true });
  house(k, -16.5, 0, S.z1, Math.PI, { w: 4.9, d: 8, storeys: 3, roof: 'front', seed: 113, lit: 0.4 });
  house(k, -7.4, 0, S.z1, Math.PI, { w: 6.1, d: 8, storeys: 3, roof: 'side', seed: 114, lit: 0.35, sign: true });
  house(k, -2.2, 0, S.z1, Math.PI, { w: 4.3, d: 5.5, storeys: 2, roof: 'front', seed: 115, lit: 0.5 });

  // ---------------------------------------------------------------- square
  // east side (face west) and south side (face north)
  house(k, Q.x1, 0, -30.2, -Math.PI / 2, { w: 9.5, d: 8, storeys: 3, roof: 'side', seed: 121, lit: 0.5, sign: true });
  house(k, Q.x1, 0, -21, -Math.PI / 2, { w: 6, d: 8, storeys: 2, roof: 'front', seed: 122, lit: 0.4 });
  house(k, 2.4, 0, Q.z1, Math.PI, { w: 4.8, d: 7, storeys: 3, roof: 'front', seed: 123, lit: 0.5, shop: true });
  house(k, 8.2, 0, Q.z1, Math.PI, { w: 6.6, d: 7, storeys: 2, roof: 'side', seed: 124, lit: 0.45 });
  house(k, 14.8, 0, Q.z1, Math.PI, { w: 6.4, d: 7, storeys: 3, roof: 'front', seed: 125, lit: 0.55, stoneBase: true });
  // east of the mint, facing the square
  house(k, 19.5, 0, Q.z0, 0, { w: 5, d: 9, storeys: 3, roof: 'front', seed: 126, lit: 0.5 });
  well(k, 13.8, 0, -27.8, 0.3);
  marketStall(k, 5.2, 0, -25.6, Math.PI, 'cloth_red');
  marketStall(k, 17.7, 0, -26.5, -Math.PI / 2, 'cloth_blue');
  crateStack(k, 18.5, 0, -33.4, -0.4);
  barrel(k, 1.0, 0, -34.2, 0, true); barrel(k, 1.8, 0, -34.4, 0.5, true);
  bench(k, 10.5, 0, -24.6, Math.PI);
  lantern(k, 10, 3.4, -34.7);
  k.light(0xffb466, 6, 12, 10, 3.2, -33.8, 0.3);

  // ---------------------------------------------------------------- street furniture
  bellPost(k, PLAN.crossroads.x, 0, PLAN.crossroads.z, 0.2);
  cart(k, -26.8, 0, -31.2, 1.35, false);
  crateStack(k, -28.8, 0, -35.6, 0.2);
  barrel(k, -23.2, 0, -36.2, 0, true); barrel(k, -22.6, 0, -35.8, 1, true);
  sack(k, -2.5, 0, -36.2, 0.4); crate(k, -3.3, 0, -36.4, 0.2, 0.7, true);
  barrel(k, -5.2, 0, -29.8, 0.3, true); crate(k, -6.1, 0, -29.7, 0.6, 0.8, true);
  bracketLantern(k, -23.1, 3.2, S.z0 + 0.1, 0);
  bracketLantern(k, -5.2, 3.0, S.z1 - 0.1, Math.PI);
  bracketLantern(k, -17.8, 3.4, S.z1 - 0.1, Math.PI);
  deadTree(k, -29.5, 0, -42, 4.5);

  // ---------------------------------------------------------------- alley & yard
  laundryLine(k, [-14.1, 4.2, -26.5], [-10.4, 4.5, -26.0], 4);
  laundryLine(k, [-14.1, 4.6, -22.5], [-10.4, 4.3, -23.3], 3);
  wall(k, 'stone_dark', -14.35, -21, -14.35, -18, 0, 2.8, 0.5);                     // alley garden walls
  wall(k, 'stone_dark', -10.15, -21, -10.15, -18, 0, 2.8, 0.5);
  // yard walls (south wall has the loot nook recess at x ∈ [-17.3, -15.3])
  wall(k, 'stone_dark', -18.2, -18.2, -14.35, -18.2, 0, 3.2, 0.5);
  wall(k, 'stone_dark', -10.15, -18.2, -5.8, -18.2, 0, 3.2, 0.5);
  wall(k, 'stone_dark', -18.45, -18.4, -18.45, -7.6, 0, 3.2, 0.5);
  wall(k, 'stone_dark', -5.55, -18.4, -5.55, -7.6, 0, 3.2, 0.5);
  wall(k, 'stone_dark', -18.6, -7.8, -17.3, -7.8, 0, 3.2, 0.5);
  wall(k, 'stone_dark', -15.3, -7.8, -5.4, -7.8, 0, 3.2, 0.5);
  // nook: a vaulted recess with an old lock-box and a slumped bedroll
  wall(k, 'stone_dark', -17.3, -6.0, -15.3, -6.0, 0, 2.6, 0.4);
  wall(k, 'stone_dark', -17.5, -7.8, -17.5, -6.2, 0, 2.6, 0.4);
  wall(k, 'stone_dark', -15.1, -7.8, -15.1, -6.2, 0, 2.6, 0.4);
  k.bmm('stone_dark', -17.7, 2.3, -7.9, -14.9, 2.7, -5.8);
  floor(k, 'flagstone', -17.3, -7.8, -15.3, -6.2, 0.02, 0.1, false);
  strongbox(k, -16.3, 0, -6.7, Math.PI, 0.8, true);
  candles(k, -17.0, 0, -6.6, 2, 0.08);
  // backs of houses around the yard, a shed, clutter
  house(k, -12, 0, -7.6, Math.PI, { w: 6.2, d: 6, storeys: 2, roof: 'side', seed: 131, lit: 0.3, detail: 'low' });
  house(k, -21.5, 0, -12.5, Math.PI / 2, { w: 7, d: 5, storeys: 2, roof: 'front', seed: 132, lit: 0.3, detail: 'low' });
  house(k, -2.6, 0, -12.5, -Math.PI / 2, { w: 7, d: 5, storeys: 2, roof: 'side', seed: 133, lit: 0.3, detail: 'low' });
  cart(k, -8.2, 0, -12.5, 0.4, true, true);
  rubble(k, -16.5, 0, -15.8, 1.0, false, false);
  barrel(k, -6.6, 0, -17.3, 0, true); crate(k, -7.3, 0, -9.0, 0.3, 0.8, true); bucket(k, -13, 0, -9, 'planks');
  hayOrSacks(k);

  // ---------------------------------------------------------------- bounds (walkable envelope)
  const H = 6;
  bound(k, -30.3, -46.5, -30.3, -28.6, 0, H);                       // west cliff/plaza edge
  bound(k, -30.6, -28.8, -24.0, -28.8, 0, H);                       // S1 facade (plaza south)
  bound(k, -24.0, -28.8, -14.35, -28.8, 0, H);                      // S2 facades
  bound(k, -10.15, -28.8, Q.x0 + 0.2, -28.8, 0, H);                 // S3/S4 facades
  bound(k, Q.x0 - 0.1, -28.8, Q.x0 - 0.1, Q.z1 + 0.2, 0, H);        // S4 east face on the square
  bound(k, Q.x0 - 0.3, Q.z1 + 0.3, Q.x1 + 0.3, Q.z1 + 0.3, 0, H);   // square south facades
  bound(k, Q.x1 + 0.3, Q.z1 + 0.3, Q.x1 + 0.3, -35.6, 0, H);         // square east facades
  bound(k, 16.9, Q.z0 - 0.3, Q.x1 + 0.3, Q.z0 - 0.3, 0, H);          // east house front
  bound(k, -0.1, S.z0 - 0.3, 3.1, S.z0 - 0.3, 0, H);                 // N4 front
  bound(k, 2.8, S.z0 - 0.3, 2.8, Q.z0 - 0.2, 0, H);                  // notch between N4 and mint
  bound(k, -13.5, S.z0 - 0.3, -0.1, S.z0 - 0.3, 0, H);               // N3 front (burned)
  bound(k, -13.6, S.z0 - 0.2, -13.6, -38.8, 0, H);                   // grave strip east
  bound(k, -22.2, -38.8, -13.4, -38.8, 0, H);                        // guildhall facade
  bound(k, -22.1, -38.8, -22.1, S.z0 - 0.2, 0, H);                   // grave strip west
  bound(k, -25.85, S.z0 - 0.3, -22, S.z0 - 0.3, 0, H);               // N1 front
  bound(k, -25.6, -47.2, -25.6, S.z0 - 0.2, 0, H);                   // N1 west face (rim path east side)
  bound(k, -14.35, -29.1, -14.35, -18, 0, H);                       // alley sides (house flanks)
  bound(k, -10.15, -29.1, -10.15, -18, 0, H);
  // yard/alley outer bound (belt-and-braces behind the visual walls)
  bound(k, -18.8, -19, -18.8, -5.4, 0, H);
  bound(k, -5.2, -19, -5.2, -7.0, 0, H);
  bound(k, -18.8, -5.6, -5.2, -5.6, 0, H);

  // smoke rising from the burned house
  const smoke = new PuffField([
    { pos: new THREE.Vector3(-9.5, 6, -41.5), height: 26, size0: 2.5, size1: 9, count: 14, life: 16, drift: new THREE.Vector3(6, 0, -3), spread: 3 },
  ], { color: 0x3d3a38, baseColor: 0x6a4a36, opacity: 0.55 }, 5);
  ctx.root.add(smoke.mesh);

  // ---------------------------------------------------------------- enemies
  const enemies: EnemySpawn[] = [
    // the lone first infantry: stands by the relief, looking west up the street toward the player
    { id: 'ash_street_inf_1', kind: 'infantry', anchor: anchor(-19.5, 0, -33.2, YAW_W), leash: 16, idleAnim: 'stand' },
    // the pair in the square: one on a short patrol toward the street mouth, one by the well
    {
      id: 'ash_street_inf_2', kind: 'infantry', anchor: anchor(6.5, 0, -29.5, YAW_W), leash: 16, idleAnim: 'stand',
      patrol: [new THREE.Vector3(6.5, 0, -29.5), new THREE.Vector3(-2.5, 0, -32.8), new THREE.Vector3(-6, 0, -33.4), new THREE.Vector3(-2.5, 0, -32.8)],
    },
    { id: 'ash_street_inf_3', kind: 'infantry', anchor: anchor(10.5, 0, -31, YAW_W + 0.4), leash: 16, idleAnim: 'stand' },
  ];

  const c = PLAN.crossroads;
  return {
    greyfordRelief: anchor(-18.2, 0, -35.9, YAW_N),
    lootNook: anchor(-16.3, 0, -8.6, 0),
    enemies,
    tollPost: {
      id: 'toll_street', pos: c.clone(), radius: 3.2,
      options: [
        { id: 'mint', toward: new THREE.Vector3(10, 0, -32) },
        { id: 'alley', toward: new THREE.Vector3(-12.2, 0, -13) },
        { id: 'tower', toward: new THREE.Vector3(-28, 0, -44) },
      ],
    },
    smoke,
  };
}

function hayOrSacks(k: ReturnType<typeof newKit>) {
  sack(k, -17.4, 0, -17.2, 0.2); sack(k, -16.8, 0, -17.4, 1.1); sack(k, -17.6, 0, -16.6, 2.2);
}

export const STREET_ZONE = new THREE.Box3(new THREE.Vector3(-31, -2, -47), new THREE.Vector3(21, 12, -5));
