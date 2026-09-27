/**
 * The Garden Court — region builder. Assembles the Servants' Yard, the Parterre and the Mourning
 * Maze, the palace (servants' passages, gallery, Great Hall, antechamber, throne room), the Orangery
 * with the Court of Two Claims and the East Loggia, and the Terrace of the Great Bell; merges static
 * geometry per material per area, builds the instanced props, sets the sun, and returns the
 * RegionLayout (anchors / pieces / triggers are addressed by name from Region.ts).
 *
 * Anchor conventions: interactables — `pos` where the player stands; pickups — the item itself;
 * NPCs/enemies — feet and facing.
 */
import * as THREE from 'three';
import type { LevelContext, RegionLayout, Zone } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import { Batch, box3, PLAN, Y0, YH, YU, YT, type AreaCtx } from './levelCommon';
import { buildGarden, MAZE } from './levelGarden';
import { buildPalace } from './levelPalace';
import { buildOrangery } from './levelOrangery';
import { buildTerrace } from './levelTerrace';

export interface HouseholdExtras {
  root: THREE.Group;
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number; perKit: Record<string, number> };
  maze: ReturnType<typeof buildGarden>['maze'];
}
export type HouseholdLayout = RegionLayout & HouseholdExtras;

export const HOUSEHOLD_ZONES = (): Zone[] => [
  { id: 'hhBellTerrace', name: 'Terrace of the Great Bell', box: box3(25, YT - 3, -95, 56, YT + 30, -60), ambience: 'arena', music: 'none', environment: 'householdTerrace' },
  { id: 'hhBellStair', name: 'The Bell Stair', box: box3(15, YU - 1, -80, 25, YT + 5, -72), ambience: 'garden', music: 'household', environment: 'householdTerrace' },
  { id: 'hhThrone', name: 'Throne Room of Three Coronations', box: box3(-15, YU - 1, -87, 15, YU + 13, -58), ambience: 'interior', music: 'household', environment: 'householdThrone' },
  { id: 'hhAnte', name: 'Antechamber of Successions', box: box3(-13, YU - 1, -58, 14, YU + 8, -44), ambience: 'interior', music: 'household', environment: 'householdThrone' },
  { id: 'hhLoggia', name: 'The East Loggia', box: box3(14, YU - 1, -58.5, 52, YU + 6, -52.9), ambience: 'garden', music: 'household', environment: 'householdGarden' },
  { id: 'hhHeirsStair', name: 'The East Loggia', box: box3(44, -1, -53, 50, YU + 6, -40), ambience: 'garden', music: 'household', environment: 'householdGarden' },
  { id: 'hhHeirs', name: 'Court of Two Claims', box: box3(35, -1, -40, 59, 12, -6.5), ambience: 'arena', music: 'none', environment: 'householdGarden' },
  { id: 'hhOrangery', name: 'The Orangery', box: box3(36, -1, -6.5, 58, 14, 34), ambience: 'garden', music: 'household', environment: 'householdOrangery' },
  { id: 'hhGallery', name: 'Gallery of Unreigned Heirs', box: box3(-38, YU - 1, -30, -14, YU + 7, -15.5), ambience: 'interior', music: 'household', environment: 'householdThrone' },
  { id: 'hhHall', name: 'Hall of Three Feasts', box: box3(-14, YH - 1, -44, 14, YU + 8, -15.5), ambience: 'interior', music: 'household', environment: 'householdThrone' },
  { id: 'hhKitchen', name: 'Palace Kitchens', box: box3(-54, -1, 36, -38, 6, 60), ambience: 'interior', music: 'household', environment: 'householdPassages' },
  { id: 'hhPassages', name: 'The Servants\' Passages', box: box3(-58, -1, -26, -38, YU + 4, 44), ambience: 'interior', music: 'household', environment: 'householdPassages' },
  { id: 'hhYard', name: 'The Servants\' Yard', box: box3(-38, -2, 52, -10, 14, 76), ambience: 'garden', music: 'household', environment: 'householdGarden' },
  { id: 'hhMaze', name: 'The Mourning Maze', box: box3(MAZE.x0, -2, MAZE.z0 - MAZE.cell * MAZE.rows, MAZE.x0 + MAZE.cell * MAZE.cols, 8, MAZE.z0), ambience: 'garden', music: 'household', environment: 'householdGarden' },
  { id: 'hhTerrace', name: 'The Palace Terrace', box: box3(-38, -2, -15.5, 36, 12, 1), ambience: 'garden', music: 'household', environment: 'householdGarden' },
  { id: 'hhParterre', name: 'The Parterre', box: box3(-38, -2, 1, 36, 14, 53), ambience: 'garden', music: 'household', environment: 'householdGarden' },
];

export function buildHousehold(ctx: LevelContext): HouseholdLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'household';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'household:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = { shared, root, dynamicRoot, kits: [], batch: new Batch() };

  const garden = buildGarden(actx);
  const palace = buildPalace(actx);
  const orangery = buildOrangery(actx);
  const terrace = buildTerrace(actx);

  // ---------------------------------------------------------------- merge
  const originY: Record<string, number> = { garden: Y0, wing: Y0, hall: YH, throne: YU, orangery: Y0, heirs: Y0, eastblock: Y0, terrace: YT, backdrop: Y0 };
  let triangles = 0, meshes = 0;
  const perKit: Record<string, number> = {};
  for (const k of actx.kits) {
    k.originY = originY[k.name] ?? 0;
    k.finish(root);
    triangles += k.triangles;
    perKit[k.name] = Math.round(k.triangles);
    meshes += k.group.children.filter((c) => (c as THREE.Mesh).isMesh).length;
  }
  const bs = actx.batch.finish(root);
  triangles += bs.triangles; meshes += bs.meshes; perKit.batch = Math.round(bs.triangles);
  const inst = shared.instances.build(root);
  let instanced = 0;
  inst.forEach((im, key) => {
    const t = ((im.geometry.index ? im.geometry.index.count : im.geometry.attributes.position.count) / 3) * im.count;
    instanced += im.count; triangles += t; perKit['inst:' + key] = Math.round(t);
  });
  const flames = inst.get(FLAME_KEY);
  const flicker = flames ? flickerFlames(flames) : null;

  // ---------------------------------------------------------------- sun: low autumn evening from the south-west (golden haze)
  const sun = ctx.sun;
  sun.target.position.set(4, 0, -12);
  if (!sun.target.parent) ctx.scene.add(sun.target);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(-0.55, 0.42, 0.72).normalize().multiplyScalar(170));
  sun.target.updateMatrixWorld();

  // ---------------------------------------------------------------- layout
  const anchors = { ...garden.anchors, ...palace.anchors, ...orangery.anchors, ...terrace.anchors };
  const pieces = { ...palace.pieces, ...orangery.pieces, portcullis: garden.portcullis };
  const updaters = shared.updaters;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    terrace.update(time);
  };
  const buildMs = performance.now() - t0;
  return {
    playerStart: garden.playerStart,
    stillbells: [
      { id: 'household.gate', name: 'Servants\' Gate', anchor: garden.shrine.anchor, bell: garden.shrine.bell, light: garden.shrine.light },
      { id: 'household.orangery', name: 'The Orangery', anchor: orangery.shrine.anchor, bell: orangery.shrine.bell, light: orangery.shrine.light },
      { id: 'household.throne', name: 'Antechamber of Successions', anchor: palace.shrine.anchor, bell: palace.shrine.bell, light: palace.shrine.light },
    ],
    enemies: [...garden.enemies, ...palace.enemies, ...orangery.enemies],
    zones: HOUSEHOLD_ZONES(),
    tollPosts: [garden.tollPost, palace.tollPost],
    arenas: [orangery.arena, terrace.arena],
    anchors,
    pieces,
    triggers: palace.triggers,
    killY: -12,
    update,
    root,
    maze: garden.maze,
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs, perKit },
  };
}

export { PLAN };
