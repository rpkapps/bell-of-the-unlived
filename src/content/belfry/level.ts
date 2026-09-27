/**
 * The Belfry of Return — the region builder. Assembles the approach (foot, causeway, terrace,
 * ledges, Buttress Gallery, backdrop), the tower of rejected futures (five floors), the secret way
 * to the Branding Cell, and the Bell Crown; merges static geometry per material per kit, builds
 * instanced props, and returns the RegionLayout (+ a few extras the region controller uses).
 *
 * The caller owns `collision.build()`.
 */
import * as THREE from 'three';
import type { LevelContext, RegionLayout, Zone } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import { type BCtx, PLAN, anchor, box3, YAW_N } from './levelCommon';
import { buildOutside } from './levelOutside';
import { buildTower } from './levelTower';
import { buildCrown } from './levelCrown';
import { buildCell } from './levelCell';

export interface BelfryExtras {
  root: THREE.Group;
  /** Telegraph glow meshes for Aldren's ring bands. */
  bands: THREE.Mesh[];
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number };
}
export type BelfryLayout = RegionLayout & BelfryExtras;

export function buildBelfry(ctx: LevelContext): BelfryLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'belfry';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'belfry:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const bc: BCtx = { shared, root, dynamicRoot, kits: [], anchors: {}, pieces: {}, triggers: {} };

  const outside = buildOutside(bc);
  const tower = buildTower(bc);
  const crown = buildCrown(bc);
  const cell = buildCell(bc);

  let triangles = 0, meshes = 0;
  for (const k of bc.kits) {
    k.finish(root);
    triangles += k.triangles;
    meshes += k.group.children.filter((c) => (c as THREE.Mesh).isMesh).length;
  }
  const inst = shared.instances.build(root);
  let instanced = 0;
  inst.forEach((im) => {
    instanced += im.count;
    triangles += ((im.geometry.index ? im.geometry.index.count : im.geometry.attributes.position.count) / 3) * im.count;
  });
  const flames = inst.get(FLAME_KEY);
  const flicker = flames ? flickerFlames(flames) : null;

  // ---------------------------------------------------------------- lighting: a storm-lit key from the north-east
  const sun = ctx.sun;
  sun.target.position.set(0, 10, 0);
  if (!sun.target.parent) ctx.scene.add(sun.target);
  sun.target.updateMatrixWorld();
  let hasHemi = false;
  ctx.scene.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) hasHemi = true; });
  if (!hasHemi) {
    const hemi = new THREE.HemisphereLight(0x7a7e98, 0x201c1a, 0.6);
    hemi.name = 'belfry:hemisphere';
    root.add(hemi);
  }

  // ---------------------------------------------------------------- zones (first match wins → specific first)
  const I = PLAN.I, F = PLAN.floors;
  const zones: Zone[] = [
    { id: 'belfry.cell', name: 'The Branding Cell', box: box3(-41, 4, -18, -21.4, 16, 4), ambience: 'undercroft', music: 'belfry', environment: 'belfryCell' },
    { id: 'belfry.stair', name: 'The Crown Stair', box: box3(-8.4, 34.5, 9.3, 10.8, 41, 15.2), ambience: 'belfry', music: 'belfry', environment: 'belfryChambers' },
    { id: 'belfry.crown', name: 'The Bell Crown', box: box3(-16, 34.5, -20, 16, 80, 15.5), ambience: 'belfry', music: 'belfry', environment: 'belfryCrown' },
    { id: 'belfry.coronation', name: 'The Coronation That Never Happened', box: box3(-I, F[4] - 0.2, -I, I, PLAN.roof - 0.1, I), ambience: 'interior', music: 'belfry', environment: 'belfryChambers' },
    { id: 'belfry.vault', name: 'The Empty Vault', box: box3(-I, F[3] - 0.2, -I, I, F[4] - 0.2, I), ambience: 'vault', music: 'belfry', environment: 'belfryChambers' },
    { id: 'belfry.nave', name: 'The Nameless Nave', box: box3(-I, F[2] - 0.2, -I, I, F[3] - 0.2, I), ambience: 'nave', music: 'belfry', environment: 'belfryChambers' },
    { id: 'belfry.theatre', name: 'The Drowned Lecture Theatre', box: box3(-I, F[1] - 0.2, -I, I, F[2] - 0.2, I), ambience: 'interior', music: 'belfry', environment: 'belfryDrowned' },
    { id: 'belfry.hall', name: 'Hall of the Victory That Was', box: box3(-I, -1, -I, I, F[1] - 0.2, I), ambience: 'interior', music: 'belfry', environment: 'belfryChambers' },
    { id: 'belfry.gallery', name: 'The Buttress Gallery', box: box3(15, 0.8, -14.5, 21, 31, PLAN.ledgeE.z0 - 0.1), ambience: 'belfry', music: 'belfry', environment: 'belfryStorm' },
    { id: 'belfry.ledge', name: 'The Windward Ledge', box: box3(-24, -1, -12, -15, 17, PLAN.terrace.z0 + 3), ambience: 'belfry', music: 'belfry', environment: 'belfryStorm' },
    { id: 'belfry.foot', name: 'Foot of the Belfry', box: box3(-14, -6, 50, 14, 10, 75), ambience: 'belfry', music: 'belfry', environment: 'belfryStorm' },
    { id: 'belfry.causeway', name: 'The Causeway of Petitions', box: box3(-24, -6, 9, 24, 12, 50), ambience: 'belfry', music: 'belfry', environment: 'belfryStorm' },
  ];

  // triggers: the reveal on first arrival, the record's end, the cell's first sight
  bc.triggers.arrival = box3(-11, -4, 56, 11, 2, 72);
  bc.triggers.crownArrive = box3(4.6, 34.5, 9.4, 10.8, 38, 15);
  bc.triggers.cellSight = box3(-21, 6, -9, -15, 9, -5);
  bc.anchors.revealFrom = anchor(0, PLAN.foot.y + 2, 70, YAW_N);

  const stillbells = [
    { id: 'belfry.foot', name: 'Foot of the Belfry', anchor: outside.foot.anchor, bell: outside.foot.bell, light: outside.foot.light },
    { id: 'belfry.crown', name: 'The Bell Crown', anchor: crown.shrine.anchor, bell: crown.shrine.bell, light: crown.shrine.light },
  ];

  const updaters = shared.updaters;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    crown.update(dt, time);
    tower.update(time);
  };

  return {
    playerStart: outside.foot.anchor,
    stillbells,
    enemies: [...outside.enemies, ...tower.enemies],
    zones,
    tollPosts: [...outside.tollPosts, {
      id: 'nave', pos: new THREE.Vector3(-6.5, F[2], 9.5), radius: 6,
      options: [{ id: 'up', toward: new THREE.Vector3(12, F[2], 9) }, { id: 'plate', toward: new THREE.Vector3(-13, F[2], 8) }, { id: 'altar', toward: new THREE.Vector3(0, F[2], -8) }],
    }],
    arenas: [crown.arena, cell.arena],
    anchors: bc.anchors,
    pieces: bc.pieces,
    triggers: bc.triggers,
    killY: PLAN.killY,
    update,
    root,
    bands: crown.bands,
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs: performance.now() - t0 },
  };
}
