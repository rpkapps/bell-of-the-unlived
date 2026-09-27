/**
 * Siegeholm — the region builder. Assembles every area (Siege Road & Outer Ramparts, Lower Bailey
 * & West Casemate, Barbican & Eastern Magazine & Eastern Lane, the Ram-Knight's Passage, Upper
 * Ward & Hall of the Last Feast, Marshal's Keep & the Bell Rampart, backdrop), merges static
 * geometry per material per area, builds the shared instanced props, the region's own snow,
 * terrain and banner meshes, and returns the RegionLayout.
 *
 * Critical path (south → north): Siege Road (Stillbell 'army.road') → Outer Gate (or the breach)
 * → Lower Bailey → West Stair → Barbican (Stillbell 'army.barbican') → veil → Ram-Knight Oderic's
 * gate passage → Upper Ward → Grand Stair → Marshal's Keep (Stillbell 'army.keep') → veil → the Bell
 * Rampart (Marshal Ysolde Varr). Shortcuts: the Postern (casemate → road) and the Eastern Lane
 * portcullis (upper ward → magazine yard/barbican).
 *
 * The caller owns `collision.build()`.
 */
import * as THREE from 'three';
import type { LevelContext, RegionLayout, Zone, ArenaLayout } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import {
  type AreaCtx, GeoBatch, snowMaterial, terrainMaterial, bannerMaterial, SnowFall, PLAN,
} from './levelCommon';
import { buildRoad, ROAD_ZONE, RAMPART_ZONE } from './levelRoad';
import { buildBailey, BAILEY_ZONE, CASEMATE_ZONES, OSSUARY_ZONE } from './levelBailey';
import { buildBarbican, BARBICAN_ZONE, MAGAZINE_ZONE, LANE_ZONE } from './levelBarbican';
import { buildPassage, PASSAGE_ZONE } from './levelPassage';
import { buildWard, WARD_ZONE, HALL_ZONE } from './levelWard';
import { buildKeep, KEEP_ZONE, RAMPART_ARENA_ZONE } from './levelKeep';
import { buildBackdrop } from './levelBackdrop';

export interface ArmyExtras {
  root: THREE.Group;
  /** Gate bombard muzzle (the artillery sightline over the killing ground). */
  bombardMuzzle: THREE.Vector3;
  bombardLight: THREE.PointLight;
  /** Tower bombards used by Marshal Varr's volley. */
  volleyMuzzles: THREE.Vector3[];
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number; perKit: Record<string, number> };
}
export type ArmyLayout = RegionLayout & ArmyExtras;

export function buildArmy(ctx: LevelContext): ArmyLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'army';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'army:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = {
    shared, root, dynamicRoot, kits: [],
    snow: new GeoBatch('snow'), bannersVictory: new GeoBatch('bannersVictory'), bannersBurnt: new GeoBatch('bannersBurnt'),
    terrain: new GeoBatch('terrain', true),
  };

  // ---------------------------------------------------------------- areas
  const road = buildRoad(actx);
  const bailey = buildBailey(actx);
  const barb = buildBarbican(actx);
  const passage = buildPassage(actx);
  const ward = buildWard(actx);
  const keep = buildKeep(actx);
  const back = buildBackdrop(actx);

  const originY: Record<string, number> = { road: 0, bailey: 0, barbican: 6, passage: 6, ward: 6, keep: 14, backdrop: 0 };
  let triangles = 0, meshes = 0;
  const perKit: Record<string, number> = {};
  for (const k of actx.kits) {
    k.originY = originY[k.name] ?? 0;
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
  // region materials
  for (const [b, m, cast] of [[actx.snow, snowMaterial(), false], [actx.terrain, terrainMaterial(), false], [actx.bannersVictory, bannerMaterial('victory'), true], [actx.bannersBurnt, bannerMaterial('burnt'), true]] as const) {
    const mesh = b.build(m, root, cast, true);
    if (mesh) { meshes++; const t = mesh.geometry.attributes.position.count / 3; triangles += t; perKit['army:' + b.name] = Math.round(t); }
  }
  const snowfall = new SnowFall(ctx.quality === 'low' ? 1400 : ctx.quality === 'medium' ? 2400 : 3600);
  root.add(snowfall.points);

  // hemisphere fill only if the renderer doesn't provide one
  let hasHemi = false;
  ctx.scene.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) hasHemi = true; });
  if (!hasHemi) { const hemi = new THREE.HemisphereLight(0x9aa6b8, 0x2c2a28, 0.6); hemi.name = 'army:hemisphere'; root.add(hemi); }

  // ---------------------------------------------------------------- zones (first match wins → specific first)
  const zones: Zone[] = [
    { id: 'bellRampart', name: 'The Bell Rampart', box: RAMPART_ARENA_ZONE, ambience: 'arena', music: 'none', environment: 'armyArena' },
    { id: 'ramKnightPassage', name: 'The Ram-Knight\'s Passage', box: PASSAGE_ZONE, ambience: 'arena', music: 'none', environment: 'armyPassage' },
    { id: 'feastHall', name: 'Hall of the Last Feast', box: HALL_ZONE, ambience: 'interior', music: 'army', environment: 'armyHall' },
    { id: 'ossuary', name: 'The Lime Ossuary', box: OSSUARY_ZONE, ambience: 'interior', music: 'army', environment: 'armyInterior' },
    ...CASEMATE_ZONES.map((box): Zone => ({ id: 'casemate', name: 'The West Casemate', box, ambience: 'interior', music: 'army', environment: 'armyInterior' })),
    { id: 'eastLane', name: 'The Eastern Lane', box: LANE_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'magazine', name: 'The Eastern Magazine', box: MAGAZINE_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'barbican', name: 'Barbican of Two Victories', box: BARBICAN_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'keep', name: 'The Marshal\'s Keep', box: KEEP_ZONE, ambience: 'snow', music: 'army', environment: 'armyKeep' },
    { id: 'upperWard', name: 'The Upper Ward', box: WARD_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'outerRamparts', name: 'The Outer Ramparts', box: RAMPART_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'lowerBailey', name: 'The Lower Bailey', box: BAILEY_ZONE, ambience: 'snow', music: 'army', environment: 'armySnow' },
    { id: 'siegeRoad', name: 'The Siege Road', box: ROAD_ZONE, ambience: 'snow', music: 'army', environment: 'armyRoad' },
  ];

  // ---------------------------------------------------------------- arenas
  const arenas: ArenaLayout[] = [
    {
      bossId: 'oderic', center: passage.center.clone(), radius: passage.radius, fogGate: barb.fog,
      entry: barb.anchors.odericEntry, spawn: passage.anchors.odericSpawn, onDefeat: [passage.gate],
    },
    {
      bossId: 'varr', center: PLAN.arena.c.clone(), radius: PLAN.arena.r, fogGate: keep.fog,
      entry: keep.anchors.varrEntry, spawn: keep.anchors.varrSpawn, onDefeat: [keep.anchorStandard, keep.bell],
    },
  ];

  const areas = [road, bailey, barb, passage, ward, keep];
  const anchors = Object.assign({}, ...areas.map((a) => a.anchors));
  const pieces = Object.assign({}, ...areas.map((a) => a.pieces), { odericGate: passage.gate, varrStandard: keep.anchorStandard, greatBell: keep.bell });
  const triggers = Object.assign({}, ...areas.map((a) => a.triggers));

  // ---------------------------------------------------------------- per-frame animation
  const updaters = shared.updaters;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    for (const p of back.smoke) p.update(time);
    snowfall.update(time, camera);
  };

  const buildMs = performance.now() - t0;
  return {
    playerStart: road.shrine.anchor,
    stillbells: [
      { id: 'army.road', name: 'The Siege Road', anchor: road.shrine.anchor, bell: road.shrine.bell, light: road.shrine.light },
      { id: 'army.barbican', name: 'Barbican of Two Victories', anchor: barb.shrine.anchor, bell: barb.shrine.bell, light: barb.shrine.light },
      { id: 'army.keep', name: 'Marshal\'s Keep', anchor: keep.shrine.anchor, bell: keep.shrine.bell, light: keep.shrine.light },
    ],
    enemies: areas.flatMap((a) => a.enemies),
    zones,
    tollPosts: areas.flatMap((a) => a.tolls),
    arenas,
    anchors,
    pieces,
    triggers,
    killY: -12,
    update,
    root,
    bombardMuzzle: road.bombardMuzzle,
    bombardLight: road.bombardLight,
    volleyMuzzles: keep.volleyMuzzles,
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs, perKit },
  };
}
