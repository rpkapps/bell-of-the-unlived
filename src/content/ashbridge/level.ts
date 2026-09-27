/**
 * Ashbridge — the region builder. Assembles every area (watchtower, lower street, old mint,
 * undercroft, garrison courtyard, hospice, gate approach, commander's yard, battlefield, town and
 * backdrop), merges static geometry per material per area, builds the shared instanced props,
 * registers lights, and returns the AshbridgeLayout the game logic needs.
 *
 * The caller owns `collision.build()` (call it once after this returns; the static colliders are
 * all added here, dynamic ones are created by the pieces themselves).
 *
 * Anchor conventions used throughout:
 *  - interactables (stillbells, hatch, chest, lever, refuge door, fog gate, plaques, gear rack):
 *    `pos` = where the player stands (on the floor), `yaw` = facing the object;
 *  - pickups / papers (grimoire, orders, key hook, shard, rosary): `pos` = the item itself;
 *  - NPC/enemy anchors: feet position and facing.
 */
import * as THREE from 'three';
import type { AshbridgeLayout, Anchor, LevelContext, Zone } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import type { AreaCtx } from './common';
import { buildTower, TOWER_ZONE } from './tower';
import { buildStreet, STREET_ZONE } from './street';
import { buildMint, MINT_ZONE, COUNTING_ZONE } from './mint';
import { buildUndercroft, UNDERCROFT_ZONE } from './undercroft';
import { buildCourtyard, COURTYARD_ZONE } from './courtyard';
import { buildHospice, HOSPICE_ZONE } from './hospice';
import { buildApproach, APPROACH_ZONE } from './approach';
import { buildArena, ARENA_ZONE } from './arena';
import { buildTown } from './town';

/** Extra data beyond the contract (debug, secrets, stats). */
export interface AshbridgeExtras {
  /** The level's root group (static + dynamic). */
  root: THREE.Group;
  /** Secret/loot spots not covered by the contract (e.g. the dead-end yard nook). */
  lootNooks: Anchor[];
  /** Build statistics. */
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number };
}

export function buildAshbridge(ctx: LevelContext): AshbridgeLayout & AshbridgeExtras {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'ashbridge';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'ashbridge:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = { shared, root, dynamicRoot, kits: [] };

  // ---------------------------------------------------------------- areas
  const tower = buildTower(actx);
  const street = buildStreet(actx);
  const mint = buildMint(actx);
  const under = buildUndercroft(actx);
  const court = buildCourtyard(actx);
  const hospice = buildHospice(actx);
  const approach = buildApproach(actx);
  const arena = buildArena(actx);
  const town = buildTown(actx);

  // merged meshes (grime origin per area floor level)
  const originY: Record<string, number> = { watchtower: 3, undercroft: -5, courtyard: 3, hospice: 3, approach: 3, arena: 8 };
  let triangles = 0, meshes = 0;
  for (const k of actx.kits) {
    k.originY = originY[k.name] ?? 0;
    k.finish(root);
    triangles += k.triangles;
    meshes += k.group.children.filter((c) => (c as THREE.Mesh).isMesh).length;
  }
  const inst = shared.instances.build(root);
  let instanced = 0;
  inst.forEach((im) => { instanced += im.count; triangles += (im.geometry.index ? im.geometry.index.count : im.geometry.attributes.position.count) / 3 * im.count; });
  const flames = inst.get(FLAME_KEY);
  const flicker = flames ? flickerFlames(flames) : null;

  // ---------------------------------------------------------------- lighting
  // Moonlit dusk key from the east-north-east, low: the town is backlit from the overlook.
  const sun = ctx.sun;
  sun.target.position.set(0, 0, -100);
  if (!sun.target.parent) ctx.scene.add(sun.target);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(0.62, 0.52, -0.58).normalize().multiplyScalar(160));
  sun.target.updateMatrixWorld();
  // A hemisphere fill only if the renderer doesn't already provide one.
  let hasHemi = false;
  ctx.scene.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) hasHemi = true; });
  if (!hasHemi) {
    const hemi = new THREE.HemisphereLight(0x8d9bb4, 0x2c251e, 0.6);
    hemi.name = 'ashbridge:hemisphere';
    root.add(hemi);
  }

  // ---------------------------------------------------------------- zones (first match wins → specific first)
  const zones: Zone[] = [
    { id: 'countingRoom', name: 'Counting Room', box: COUNTING_ZONE, ambience: 'interior', music: 'ashbridge' },
    { id: 'oldMint', name: 'The Old Mint', box: MINT_ZONE, ambience: 'interior', music: 'ashbridge' },
    { id: 'undercroft', name: 'Mint Undercroft', box: UNDERCROFT_ZONE, ambience: 'undercroft', music: 'ashbridge' },
    { id: 'hospice', name: 'Hospice of the Quiet Hour', box: HOSPICE_ZONE, ambience: 'hospice', music: 'hospice' },
    { id: 'watchtower', name: 'The Watchtower', box: TOWER_ZONE, ambience: 'outdoor', music: 'ashbridge' },
    { id: 'courtyard', name: 'Garrison Courtyard', box: COURTYARD_ZONE, ambience: 'outdoor', music: 'ashbridge' },
    { id: 'gateApproach', name: 'Gate Approach', box: APPROACH_ZONE, ambience: 'outdoor', music: 'ashbridge' },
    { id: 'commandersYard', name: "Commander's Yard", box: ARENA_ZONE, ambience: 'arena', music: 'none' },
    { id: 'lowerStreet', name: 'Lower Street', box: STREET_ZONE, ambience: 'outdoor', music: 'ashbridge' },
  ];

  // ---------------------------------------------------------------- per-frame animation
  const puffs = [street.smoke, ...town.smoke];
  const updaters = shared.updaters;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    for (const p of puffs) p.update(time);
    if (arena.battlefield.group.visible) arena.battlefield.update(time);
  };

  const buildMs = performance.now() - t0;
  return {
    playerStart: tower.playerStart,
    stillbells: [
      { id: 'watchtower', name: 'The Watchtower', anchor: tower.shrine.anchor, bell: tower.shrine.bell, light: tower.shrine.light },
      { id: 'hospice', name: 'Hospice of the Quiet Hour', anchor: hospice.shrine.anchor, bell: hospice.shrine.bell, light: hospice.shrine.light },
    ],
    enemies: [...street.enemies, ...mint.enemies, ...under.enemies, ...court.enemies, ...approach.enemies, ...arena.enemies],
    zones,
    tollPosts: [street.tollPost, court.tollPost],

    countingRoomTrigger: mint.countingRoomTrigger,
    freshMasonry: mint.freshMasonry,
    hatch: mint.hatch,
    refugeKeyHook: mint.refugeKeyHook,
    ordersDesk: mint.ordersDesk,
    grimoire: under.grimoire,
    chest: under.chest,
    refugeDoor: under.refugeDoor,
    oswinCell: under.oswinCell,
    rosaryDrop: under.rosaryDrop,

    greyfordRelief: street.greyfordRelief,

    drawbridge: court.drawbridge,
    drawbridgeLever: court.drawbridgeLever,
    bellbronzeShard: court.bellbronzeShard,

    oswinHospice: hospice.oswinHospice,
    hesper: hospice.hesper,
    forge: hospice.forge,
    gearRack: hospice.gearRack,
    practicePlaques: hospice.practicePlaques,
    practiceDummies: hospice.practiceDummies,

    fogGate: arena.fogGate,
    arenaCenter: arena.arenaCenter,
    arenaRadius: arena.arenaRadius,
    arenaEntry: arena.arenaEntry,
    anchorBell: arena.anchorBell,
    battlefieldReveal: arena.battlefieldReveal,
    brannoc: arena.brannoc,

    killY: -8,
    update,

    root,
    lootNooks: [street.lootNook],
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs },
  };
}
