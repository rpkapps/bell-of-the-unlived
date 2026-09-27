/**
 * The Pilgrim Stair — the region builder. Assembles the lower town, the Stair and the west front,
 * the Name-Ossuary, the Cathedral (nave, cloister, choir), the processions and the snow; merges
 * static geometry per material per area; builds the instanced props; returns a RegionLayout plus
 * the region's extras (processions, the Great Bell, stats).
 *
 * The caller owns `collision.build()`.
 *
 * Route: Pilgrims' Gate (Stillbell) → Candle Street → crossroads (toll; Masons' Yard west, shrine court
 * east) → foot of the Stair (the ossuary grate: shortcut 1, opened from inside) → first landing (toll;
 * the ossuary door) → parvis (giant; the Chapel of Rewritten Names; the barred great doors) … or the
 * Name-Ossuary (Stillbell; Wenna's tablet; Soames) → Stair of Graves → the Processional Cloister (the
 * Procession) → the nave (Stillbell; toll; the triforium; the great doors: shortcut 2) → the choir
 * (Saint Vessaline).
 */
import * as THREE from 'three';
import type { LevelContext, RegionLayout, Zone, Anchor } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames } from '../../world/kit';
import { type AreaCtx, PLAN, SnowBatch, box3, V } from './levelCommon';
import { buildTown } from './levelTown';
import { buildStair, type GreatBell } from './levelStair';
import { buildOssuary } from './levelOssuary';
import { buildCathedral } from './levelCathedral';
import { buildProcession, buildSnowfall, type Procession } from './levelProcession';

export interface CathedralLayout extends RegionLayout {
  processions: Procession[];
  greatBell: GreatBell;
  root: THREE.Group;
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number; perKit: Record<string, number> };
}

/** Roofed places (no falling snow). */
const INDOOR = [
  box3(-15.6, 11, -138, 15.6, 60, -41.8),        // nave + choir
  box3(6.8, -1, -66.2, 36, 11.6, 14.8),          // the ossuary, its passage and the grate stair
  box3(19.4, 11, -66.2, 27.6, 18, -61.6),        // the antechamber
  box3(-32.4, 11, -36.4, -19.6, 20, -23.6),      // the chapel
];

export function buildCathedralLevel(ctx: LevelContext): CathedralLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'cathedral';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'cathedral:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = { shared, root, dynamicRoot, kits: [], snow: new SnowBatch() };

  const town = buildTown(actx);
  const stair = buildStair(actx);
  const oss = buildOssuary(actx);
  const cath = buildCathedral(actx);
  const processions = [
    buildProcession(actx, 'street', [V(26, 0, PLAN.cross.zc), V(-30, 0, PLAN.cross.zc)], 1.1, 11),
    buildProcession(actx, 'stair', [V(0, 0, 21), V(0, 0, 14), V(0, 4, 5), V(0, 4, 0), V(0, 8, -9), V(0, 8, -13), V(0, 12, -22), V(0, 12, -26)], 0.85, 12),
    buildProcession(actx, 'nave', [V(0, 12, -45.5), V(0, 12, -92)], 0.95, 13),
  ];

  // ---------------------------------------------------------------- merge
  let triangles = 0, meshes = 0;
  const perKit: Record<string, number> = {};
  for (const k of actx.kits) {
    k.finish(root);
    triangles += k.triangles;
    perKit[k.name] = Math.round(k.triangles);
    meshes += k.group.children.filter((c) => (c as THREE.Mesh).isMesh).length;
  }
  const snowMesh = actx.snow.build(root, 'cathedral:snow');
  if (snowMesh) { const t = snowMesh.geometry.attributes.position.count / 3; triangles += t; perKit.snow = Math.round(t); meshes++; }
  const inst = shared.instances.build(root);
  let instanced = 0;
  inst.forEach((im, key) => {
    const t = ((im.geometry.index ? im.geometry.index.count : im.geometry.attributes.position.count) / 3) * im.count;
    instanced += im.count; triangles += t; perKit['inst:' + key] = Math.round(t);
  });
  const flames = inst.get(FLAME_KEY);
  const flicker = flames ? flickerFlames(flames) : null;
  const snowfall = buildSnowfall(root, ctx.quality === 'low' ? 700 : ctx.quality === 'medium' ? 1200 : 1800, (p) => INDOOR.some((b) => b.containsPoint(p)));

  // ---------------------------------------------------------------- the sun: low, from the south-west, over the Stair
  const sun = ctx.sun;
  sun.target.position.set(0, 6, -20);
  if (!sun.target.parent) ctx.scene.add(sun.target);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(-0.42, 0.44, 0.79).normalize().multiplyScalar(160));
  sun.target.updateMatrixWorld();

  // ---------------------------------------------------------------- zones (first match wins → specific first)
  const Y = PLAN.nave.y;
  const zones: Zone[] = [
    { id: 'choir', name: 'Choir of the Hundred Names', box: box3(-15.6, Y - 2, -138, 15.6, Y + 30, -96.4), ambience: 'arena', music: 'none', environment: 'cathedralChoir' },
    { id: 'cloister', name: 'The Processional Cloister', box: box3(16, Y - 2, -95, 47, Y + 20, -65.8), ambience: 'arena', music: 'none', environment: 'cathedralCloister' },
    { id: 'triforium', name: 'The Triforium', box: box3(9.4, PLAN.triforium.y - 0.5, -95, 15.6, PLAN.triforium.y + 4, -67.5), ambience: 'nave', music: 'cathedral', environment: 'cathedralNave' },
    { id: 'nave', name: 'Nave of Hundred Names', box: box3(-15.6, Y - 2, -96.4, 17.6, Y + 36, -41.8), ambience: 'nave', music: 'cathedral', environment: 'cathedralNave' },
    { id: 'graveStair', name: 'The Stair of Graves', box: box3(19.4, 3, -66.2, 27.6, 18, -44.2), ambience: 'undercroft', music: 'cathedral', environment: 'cathedralOssuary' },
    { id: 'ossuary', name: 'The Name-Ossuary', box: box3(7, -1, -44.2, 36, 11, 14.2), ambience: 'undercroft', music: 'cathedral', environment: 'cathedralOssuary' },
    { id: 'chapelNames', name: 'Chapel of Rewritten Names', box: box3(-32.4, 11, -36.4, -19.8, 20, -23.6), ambience: 'interior', music: 'cathedral', environment: 'cathedralNave' },
    { id: 'parvis', name: 'The Parvis', box: box3(-20.5, 11, -41.8, 20.5, 60, -21.6), ambience: 'outdoor', music: 'cathedral', environment: 'cathedralStair' },
    { id: 'pilgrimStair', name: 'The Pilgrim Stair', box: box3(-7.6, -1, -21.6, 7.6, 16, 13.9), ambience: 'outdoor', music: 'cathedral', environment: 'cathedralStair' },
    { id: 'masonsYard', name: 'The Masons\' Yard', box: box3(-37, -1, 21, -14.5, 12, 47), ambience: 'outdoor', music: 'cathedral', environment: 'cathedralStair' },
    { id: 'candleStreet', name: 'Candle Street', box: box3(-22, -1, 13.9, 31, 12, 56), ambience: 'outdoor', music: 'cathedral', environment: 'cathedralStair' },
    { id: 'cathGate', name: 'Pilgrims\' Gate', box: box3(-9.5, -1, 56, 9.5, 12, 73), ambience: 'outdoor', music: 'cathedral', environment: 'cathedralStair' },
  ];

  // ---------------------------------------------------------------- triggers
  const triggers: Record<string, THREE.Box3> = {
    arrival: box3(-6, -1, 44, 6, 4, 57),
    procession: box3(-6, -1, 36, 6, 4, 44),
    stairFoot: box3(-16, -1, 14, 16, 4, 22),
    chapel: box3(-31.5, 11, -35.5, -20.4, 16, -24.5),
    parvis: box3(-19, 11, -34, 19, 16, -22),
    ossuary: box3(19.6, 3, -8, 27.4, 8, 6),
    naveEnter: box3(-14.5, 11, -60, 17.5, 20, -42),
    choirView: box3(-8, 11, -95.5, 8, 18, -86),
  };

  // ---------------------------------------------------------------- anchors & pieces
  const anchors: Record<string, Anchor> = { ...town.anchors, ...stair.anchors, ...oss.anchors, ...cath.anchors };
  // the Saint's fall silences the Great Bell over the portal (with her Reliquary Bell)
  cath.arenas[1].onDefeat!.push(stair.greatBell);
  const pieces = { ...stair.pieces, ...oss.pieces, ...cath.pieces };

  // ---------------------------------------------------------------- visibility by where the camera is ("portal-light")
  const kitGroup = (n: string) => actx.kits.find((k) => k.name === n)?.group;
  const G = {
    town: kitGroup('town'), backdrop: kitGroup('backdrop'), stair: kitGroup('stair'), ossuary: kitGroup('ossuary'),
    nave: kitGroup('nave'), naveExterior: kitGroup('naveExterior'), cloister: kitGroup('cloister'),
  };
  const ossInst = [inst.get('skull'), inst.get('bone')];
  const reliquary = dynamicRoot.getObjectByName('reliquaryBell');
  const NAVE_BOX = box3(-15.8, 10, -140, 17.8, 60, -41.6), OSS_BOX = box3(6.6, -2, -66.4, 36.2, 11.7, 14.8), ANTE_BOX = box3(19.2, 11, -66.4, 27.8, 18, -61.4), CLOISTER_BOX = box3(15.8, 10, -95.2, 47.2, 40, -65.6);
  const cam = new THREE.Vector3();
  const setVis = (v: Partial<Record<keyof typeof G, boolean>>, inside: 'out' | 'oss' | 'nave' | 'cloister') => {
    for (const k of Object.keys(G) as (keyof typeof G)[]) { const g = G[k]; if (g) g.visible = v[k] ?? false; }
    for (const im of ossInst) if (im) im.visible = inside === 'oss';
    if (reliquary) reliquary.visible = inside === 'nave';
    processions[0].group.visible = processions[1].group.visible = v.town ?? false;
    processions[2].group.visible = inside === 'nave';
    stair.greatBell.object.visible = v.stair ?? false;
  };
  const visibility = (camera: THREE.Camera) => {
    camera.getWorldPosition(cam);
    if (OSS_BOX.containsPoint(cam) || ANTE_BOX.containsPoint(cam)) {
      const nearOut = cam.x < 12.5 || cam.z > 7;
      setVis({ ossuary: true, town: nearOut, stair: nearOut, cloister: cam.y > 9.5 }, 'oss');
    } else if (NAVE_BOX.containsPoint(cam)) {
      const front = cam.z > -64;
      setVis({ nave: true, stair: front, town: front, backdrop: front, cloister: cam.x > 5 }, 'nave');
    } else if (CLOISTER_BOX.containsPoint(cam)) {
      setVis({ cloister: true, naveExterior: true, backdrop: true, nave: cam.x < 22 }, 'cloister');
    } else {
      const byDoors = cam.z < -30 && cam.y > 10 && Math.abs(cam.x) < 10;
      setVis({ town: true, backdrop: true, stair: true, naveExterior: true, cloister: true, nave: byDoors }, byDoors ? 'nave' : 'out');
    }
  };

  const update = (dt: number, time: number, camera: THREE.Camera) => {
    visibility(camera);
    for (const u of shared.updaters) u(dt, time, camera);
    flicker?.(time);
    for (const p of processions) p.animate(time);
    stair.greatBell.update(time);
    cath.update(dt, time);
    snowfall.update(Math.min(dt, 0.1), camera);
  };

  const buildMs = performance.now() - t0;
  return {
    playerStart: town.shrine.anchor,
    stillbells: [
      { id: 'cathedral.gate', name: 'Pilgrims\' Gate', anchor: town.shrine.anchor, bell: town.shrine.bell, light: town.shrine.light },
      { id: 'cathedral.ossuary', name: 'The Name-Ossuary', anchor: oss.shrine.anchor, bell: oss.shrine.bell, light: oss.shrine.light },
      { id: 'cathedral.nave', name: 'Nave of Hundred Names', anchor: cath.shrine.anchor, bell: cath.shrine.bell, light: cath.shrine.light },
    ],
    enemies: [...town.enemies, ...stair.enemies, ...oss.enemies, ...cath.enemies],
    zones,
    tollPosts: [town.tollPost, stair.tollPost, cath.tollPost],
    arenas: cath.arenas,
    anchors, pieces, triggers,
    killY: -12,
    update,
    processions, greatBell: stair.greatBell, root,
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length + 2, buildMs, perKit },
  };
}
