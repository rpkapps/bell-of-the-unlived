/**
 * The Undervaults — the region builder. Assembles the Twofold Market, the Hall of Weights and its
 * banquet balcony, the culvert and Sluice Hall, the Counting Deep, the strongrooms and the Hoard,
 * the Scale Gallery, the Antechamber and Archive, and the Vault Tower (the keeper's arena beneath
 * the Treasury Great Bell). Static geometry is merged per material per area; repeated props are
 * instanced; lights are registered with the renderer's budgeted pool.
 *
 * Anchor conventions: interactables → `pos` where the player stands, `yaw` facing the object;
 * pickups → the item itself; NPC/enemy anchors → feet and facing.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, LevelContext, RegionLayout, Zone } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import { type AreaCtx, P, Y, V } from './levelPlan';
import { buildMarket } from './levelMarket';
import { buildUnder } from './levelUnder';
import { buildVaults } from './levelVaults';
import { buildTower } from './levelTower';
import { chestPiece } from './levelPieces';

export interface TreasuryLayout extends RegionLayout {
  root: THREE.Group;
  /** Ward-coffer plinth anchors in the Vault of Futures (NE, NW, SE, SW order). */
  coffers: Anchor[];
  /** The gilded overlay of the prosperous history (set(1) = gone). */
  overlay: DynamicPiece;
  /** Hanging cage: world position inside it (for Ione) at its current state. */
  cageInside(): THREE.Vector3;
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number; perKit: Record<string, number> };
}

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));

export function buildTreasury(ctx: LevelContext): TreasuryLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'treasury';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'treasury:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = { shared, root, dynamicRoot, kits: [] };

  const market = buildMarket(actx);
  const under = buildUnder(actx);
  const vaults = buildVaults(actx);
  const tower = buildTower(actx);

  // loose chests (real ones; the mimics are enemies)
  const chestMarket = chestPiece(actx, 'tr:chestMarket', market.anchors.chestMarket.pos.x, 0, market.anchors.chestMarket.pos.z - 1.15, 0);

  let triangles = 0, meshes = 0;
  const perKit: Record<string, number> = {};
  for (const k of actx.kits) {
    k.finish(root);
    triangles += k.triangles;
    perKit[k.name] = Math.round(k.triangles);
    meshes += k.group.children.filter((c) => (c as THREE.Mesh).isMesh).length;
  }
  const inst = shared.instances.build(root);
  let instanced = 0;
  inst.forEach((im, key) => {
    const t = ((im.geometry.index ? im.geometry.index.count : im.geometry.attributes.position.count) / 3) * im.count;
    instanced += im.count; triangles += t; perKit['inst:' + key] = Math.round(t);
  });
  const flames = inst.get(FLAME_KEY);
  const flicker = flames ? flickerFlames(flames) : null;

  let hasHemi = false;
  ctx.scene.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) hasHemi = true; });
  if (!hasHemi) { const h = new THREE.HemisphereLight(0x9a8e80, 0x2a2018, 0.6); h.name = 'treasury:hemisphere'; root.add(h); }

  // ---------------------------------------------------------------- zones (first match wins)
  const zones: Zone[] = [
    { id: 'tr_vault', name: 'The Vault of Futures', box: box(P.tower.x0 + 2, Y.canal - 1, P.tower.z0 + 2, P.tower.x1 - 2, 14, P.tower.z1 - 2), ambience: 'vault', music: 'none', environment: 'treasuryArena' },
    { id: 'tr_archive', name: 'Archive of Rejected Futures', box: box(P.archive.x0, Y.canal - 1, P.archive.z0, P.archive.x1, 4, P.archive.z1), ambience: 'vault', music: 'treasury', environment: 'treasuryArchive' },
    { id: 'tr_ante', name: 'Antechamber of Futures', box: box(P.ante.x0, Y.canal - 1, P.ante.z0, P.ante.x1, 4, P.ante.z1), ambience: 'vault', music: 'treasury', environment: 'treasuryVault' },
    { id: 'tr_hoard', name: 'The Hoard', box: box(-44.5, Y.deep - 1, -156, -21.5, 2, -129.3), ambience: 'vault', music: 'none', environment: 'treasuryHoard' },
    { id: 'tr_strong', name: 'The Strongrooms', box: box(-47, Y.deep - 1, -129.3, -19.2, -1, -106.8), ambience: 'vault', music: 'treasury', environment: 'treasuryVault' },
    { id: 'tr_gallery', name: 'The Scale Gallery', box: box(-19.2, Y.deep - 1, -118.5, 2, 1, -100), ambience: 'vault', music: 'treasury', environment: 'treasuryVault' },
    { id: 'tr_deep', name: 'The Counting Deep', box: box(-47, Y.deep - 1, -106.8, -20.2, -1.5, -79.5), ambience: 'vault', music: 'treasury', environment: 'treasuryDeep' },
    { id: 'tr_hall', name: 'Hall of Weights', box: box(-30, -1, -80, -6, 12, -60.6), ambience: 'interior', music: 'treasury', environment: 'treasuryHall' },
    { id: 'tr_sluice', name: 'The Sluice Hall', box: box(-21, Y.canal - 1.6, -99, 19, 5, -79.2), ambience: 'vault', music: 'treasury', environment: 'treasuryVault' },
    { id: 'tr_culvert', name: 'The Dry Culvert', box: box(-5, Y.canal - 1, -80, 5, -0.5, -60.2), ambience: 'undercroft', music: 'treasury', environment: 'treasuryVault' },
    { id: 'tr_balcony', name: 'The Banquet Balcony', box: box(-20.5, P.balcony.y - 1, -60.2, 16.5, P.balcony.y + 5, -56.2), ambience: 'outdoor', music: 'treasury', environment: 'treasuryMarket' },
    { id: 'tr_market', name: 'The Twofold Market', box: box(-21, Y.canal - 1, -60.2, 21, 14, 14), ambience: 'outdoor', music: 'treasury', environment: 'treasuryMarket' },
  ];

  // ---------------------------------------------------------------- triggers
  const triggers: Record<string, THREE.Box3> = {
    marketMemory: box(-4.5, -1, -33, 4.5, 3, -27.5),
    deepMemory: box(-40, Y.deep - 1, -100, -27, Y.deep + 3, -86),
    ledgerRoom: box(P.archive.x0 + 1, Y.canal - 1, P.archive.z0, P.archive.x1, Y.canal + 3, P.archive.z1),
    anteEnter: box(P.ante.x0, Y.canal - 1, P.ante.z0, P.ante.x1, Y.canal + 3, P.ante.z1),
    hoardDoor: box(-35.5, Y.deep - 1, -128, -30.5, Y.deep + 3, -124),
  };

  const anchors: Record<string, Anchor> = { ...market.anchors, ...under.anchors, ...vaults.anchors, ...tower.anchors };
  tower.coffers.forEach((c, i) => { anchors['coffer' + i] = c; });
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = { ...market.pieces, ...under.pieces, ...vaults.pieces, chestMarket, overlay: market.overlay };

  const updaters = shared.updaters;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    market.smoke.update(time);
    market.update(time);
    tower.update(time);
  };

  const buildMs = performance.now() - t0;
  return {
    playerStart: market.playerStart,
    stillbells: [
      { id: 'treasury.market', name: 'Twofold Market', anchor: market.shrine.anchor, bell: market.shrine.bell, light: market.shrine.light },
      { id: 'treasury.counting', name: 'The Counting Deep', anchor: under.shrine.anchor, bell: under.shrine.bell, light: under.shrine.light },
      { id: 'treasury.vault', name: 'Vault of Futures', anchor: vaults.shrine.anchor, bell: vaults.shrine.bell, light: vaults.shrine.light },
    ],
    enemies: [...market.enemies, ...under.enemies, ...vaults.enemies],
    zones,
    tollPosts: [market.tollPost, ...under.tollPosts],
    arenas: [tower.arena, vaults.hoardArena],
    anchors,
    pieces,
    triggers,
    killY: -18,
    update,
    root,
    coffers: tower.coffers,
    overlay: market.overlay,
    cageInside: () => under.cage.inside(),
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs, perKit },
  };
}

export { V };
