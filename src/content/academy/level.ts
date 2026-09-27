/**
 * The Suspended Campus — the region builder. Assembles the lower campus (causeway, landing,
 * tidal stair, drowned theatre, passage, lift well), the terrace and the Hall of Lenses, the
 * suspended laboratories, the spire yard, the unfinished spire and the observatory, then the sea,
 * surf and the distant coast. Returns the RegionLayout (+ extras used by the controller).
 *
 * Route (critical path, loops):
 *   Causeway ☼ → Landing ─(Sea Gate: opened from inside)─┐
 *            └→ Tidal Stair → Drowned Theatre → Prompters' Passage → Lift Well ┘
 *   Lift Well ⇅ lift ⇅ Lens Terrace → Hall of Lenses ☼ → Chain Bridge → Suspended Labs (A, B,
 *   No. 9 optional) → scaffold → Spire Yard ☼ ─(drawbridge, lowered from the yard)→ Hall gallery
 *   Spire Yard → Unfinished Spire (7 flights) → Observatory (Keeper Orrow) · Great Bell tower.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, LevelContext, RegionLayout, Zone } from '../../world/levelTypes';
import { createKitShared, FLAME_KEY, flickerFlames, PuffField, type PuffColumn, mountain, spireTower, towerRound, cone, cyl } from '../../world/kit';
import { getMaterial } from '../../render/materials';
import { type AreaCtx, PLAN, anchor, box3, newKit, cliffWall, YAW_S, YAW_E } from './levelCommon';
import { buildLower } from './levelLower';
import { buildHall } from './levelHall';
import { buildLabs } from './levelLabs';
import { buildSpire, type ObservatoryFloor } from './levelSpire';

export interface AcademyLayout extends RegionLayout {
  root: THREE.Group;
  lensFloor: ObservatoryFloor;
  greatBell: THREE.Object3D;
  /** Lift travel (region animates the rider). */
  lift: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };
  stats: { triangles: number; meshes: number; instanced: number; lights: number; buildMs: number; perKit: Record<string, number> };
}

export function buildAcademy(ctx: LevelContext): AcademyLayout {
  const t0 = performance.now();
  const shared = createKitShared(ctx.quality, ctx.collision);
  const root = new THREE.Group();
  root.name = 'academy';
  const dynamicRoot = new THREE.Group();
  dynamicRoot.name = 'academy:dynamic';
  root.add(dynamicRoot);
  ctx.scene.add(root);
  const actx: AreaCtx = { shared, root, dynamicRoot, kits: [] };

  const lower = buildLower(actx);
  const hall = buildHall(actx);
  const labs = buildLabs(actx);
  const spire = buildSpire(actx);
  buildBackdrop(actx);

  // merged meshes
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

  // ---------------------------------------------------------------- the sea and the surf
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), getMaterial('water'));
  sea.position.set(0, PLAN.seaY, 300);
  sea.renderOrder = 2;
  sea.receiveShadow = false;
  root.add(sea);
  const cols: PuffColumn[] = [];
  const rnd = mulberry(77);
  const surfAt = (x: number, z: number, n = 3, h = 7) => cols.push({ pos: new THREE.Vector3(x, PLAN.seaY + 0.5, z), height: h, size0: 2.2, size1: 7, count: n, life: 5 + rnd() * 3, drift: new THREE.Vector3(-2 - rnd() * 3, 0, -3 - rnd() * 2), spread: 4 });
  for (let x = -60; x <= 60; x += 7) surfAt(x + rnd() * 3, PLAN.cliffZ + 2.5 + rnd() * 2, shared.detail > 0.7 ? 3 : 2, 8);
  for (let z = 30; z <= 70; z += 8) { surfAt(-4.5, z + rnd() * 3, 2, 5); surfAt(4.5, z + rnd() * 3, 2, 5); }
  for (const [x, z] of [[18, 28], [22, 31], [-50, 26], [-40, 29], [-58, 16], [-72, -10], [-72, -30], [30, 24], [44, 22]] as const) surfAt(x, z, 3, 9);
  const surf = new PuffField(cols, { color: 0xdfe8ec, opacity: 0.26 }, 5);
  root.add(surf.mesh);
  const chasmMist = new PuffField([
    { pos: new THREE.Vector3(-50, -2, -20), height: 16, size0: 8, size1: 18, count: 8, life: 14, drift: new THREE.Vector3(3, 0, 2), spread: 20 },
    { pos: new THREE.Vector3(-8, -2, -15), height: 14, size0: 6, size1: 14, count: 5, life: 12, drift: new THREE.Vector3(2, 0, 1), spread: 16 },
  ], { color: 0xc8d2d8, opacity: 0.2 }, 9);
  root.add(chasmMist.mesh);

  // ---------------------------------------------------------------- lighting (storm light from the sea, south-west)
  const sun = ctx.sun;
  sun.target.position.set(-10, 10, -20);
  if (!sun.target.parent) ctx.scene.add(sun.target);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(-0.42, 0.45, 0.78).normalize().multiplyScalar(170));
  sun.target.updateMatrixWorld();
  let hasHemi = false;
  ctx.scene.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) hasHemi = true; });
  if (!hasHemi) { const hemi = new THREE.HemisphereLight(0x8d9bb4, 0x2c251e, 0.6); hemi.name = 'academy:hemisphere'; root.add(hemi); }

  // ---------------------------------------------------------------- zones (first match wins)
  const L9 = PLAN.lab9.c, AC = PLAN.arena.c;
  const zones: Zone[] = [
    { id: 'academy.lab9', name: 'Laboratory No. 9', box: box3(L9.x - 9, 14, L9.z - 9, L9.x + 7.6, 30, L9.z + 9), ambience: 'arena', music: 'academy', environment: 'academyGlassHall' },
    { id: 'academy.observatory', name: 'The Observatory of Lenses', box: box3(AC.x - 14, 40, AC.z - 14, AC.x + 14, 62, AC.z + 12.6), ambience: 'arena', music: 'academy', environment: 'academyObservatory' },
    { id: 'academy.spire', name: 'The Unfinished Spire', box: box3(-9, 26, -51, 9, 50, -31), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
    { id: 'academy.spireYard', name: 'Spire Yard', box: box3(-45, 21, -52, 17, 40, -17), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
    { id: 'academy.labs', name: 'The Suspended Laboratories', box: box3(-50, 14, -34, -31, 30, -4), ambience: 'interior', music: 'academy', environment: 'academyGlassHall' },
    { id: 'academy.bridge', name: 'Chain Bridge', box: box3(-34, 14, -12, -15.9, 26, -6), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
    { id: 'academy.hall', name: 'Hall of Lenses', box: box3(-16, 16, -12.5, 16, 34, 3.6), ambience: 'interior', music: 'academy', environment: 'academyGlassHall' },
    { id: 'academy.terrace', name: 'Lens Terrace', box: box3(-15, 16, 3.6, 15, 30, 19), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
    { id: 'academy.liftWell', name: 'Lift Well', box: box3(-6.2, 0, -3.5, 6.2, 16, 18.4), ambience: 'interior', music: 'academy', environment: 'academyTunnel' },
    { id: 'academy.tunnel', name: 'Prompters\' Passage', box: box3(-15.4, 0, -4, -6.2, 7, 1), ambience: 'interior', music: 'academy', environment: 'academyTunnel' },
    { id: 'academy.theatre', name: 'The Drowned Theatre', box: box3(-61, 0, -5, -15.4, 20, 25), ambience: 'interior', music: 'academy', environment: 'academyDrowned' },
    { id: 'academy.tidalStair', name: 'Tidal Stair', box: box3(-34, 0, 21, -12, 13, 30), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
    { id: 'academy.causeway', name: 'Sea Causeway', box: box3(-20, -3, 19, 30, 16, 80), ambience: 'sea', music: 'academy', environment: 'academyStorm' },
  ];

  // ---------------------------------------------------------------- arenas
  const arenas: ArenaLayout[] = [
    {
      bossId: 'experiment9', center: L9.clone(), radius: PLAN.lab9.r, fogGate: labs.lab9.fogGate,
      entry: labs.anchors.lab9Entry, spawn: labs.anchors.lab9Spawn, onDefeat: [labs.lab9.vat],
    },
    {
      bossId: 'orrow', center: AC.clone(), radius: PLAN.arena.r, fogGate: spire.arena.fogGate,
      entry: spire.anchors.orrowEntry, spawn: spire.anchors.orrowSpawn, onDefeat: [spire.arena.anchorLens],
    },
  ];

  const anchors: Record<string, Anchor> = { ...lower.anchors, ...hall.anchors, ...labs.anchors, ...spire.anchors };
  const pieces = { ...lower.pieces, ...hall.pieces, ...labs.pieces, ...spire.pieces };
  const triggers = { ...lower.triggers, ...hall.triggers, ...labs.triggers, ...spire.triggers };

  // ---------------------------------------------------------------- per-frame animation
  const updaters = shared.updaters;
  const bell = spire.greatBell;
  const update = (dt: number, time: number, camera: THREE.Camera) => {
    for (const u of updaters) u(dt, time, camera);
    flicker?.(time);
    surf.update(time);
    chasmMist.update(time);
    bell.rotation.z = Math.sin(time * 0.37) * 0.012;
  };

  const LF = PLAN.lift;
  const buildMs = performance.now() - t0;
  return {
    playerStart: lower.playerStart,
    stillbells: [
      { id: 'academy.causeway', name: 'Sea Causeway', anchor: lower.shrine.anchor, bell: lower.shrine.bell, light: lower.shrine.light },
      { id: 'academy.lenshall', name: 'Hall of Lenses', anchor: hall.shrine.anchor, bell: hall.shrine.bell, light: hall.shrine.light },
      { id: 'academy.spire', name: 'The Unfinished Spire', anchor: spire.shrine.anchor, bell: spire.shrine.bell, light: spire.shrine.light },
    ],
    enemies: [...lower.enemies, ...hall.enemies, ...labs.enemies, ...spire.enemies],
    zones,
    tollPosts: [...lower.tollPosts, ...hall.tollPosts, ...spire.tollPosts],
    arenas,
    anchors, pieces, triggers,
    killY: PLAN.killY,
    update,
    root,
    lensFloor: spire.arena.floor,
    greatBell: bell,
    lift: { x0: LF.x - LF.w / 2, x1: LF.x + LF.w / 2, z0: LF.z - LF.d / 2, z1: LF.z + LF.d / 2, y0: LF.y0, y1: LF.y1 },
    stats: { triangles: Math.round(triangles), meshes, instanced, lights: shared.lights.length, buildMs, perKit },
  };
}

// ====================================================================== backdrop

function buildBackdrop(ctx: AreaCtx) {
  const k = newKit(ctx, 'backdrop', 901, 0);
  const o = { cast: false, receive: false };
  // the upper campus east of the yard: towers, halls with steep roofs, a few lit windows
  k.bmm('rock_cliff', 16.5, -4, -70, 90, 17.6, 19, o);
  cliffWall(k, 16.5, 19.4, 90, 19.4, -4, 18, 91, 1, 4);
  for (const [x, z, w, d, hh] of [[26, 4, 10, 16, 16], [40, -8, 14, 10, 22], [30, -30, 12, 14, 26], [52, -24, 10, 18, 18], [24, -50, 14, 10, 34], [46, -52, 12, 12, 28]] as const) {
    k.bmm('stone_wall', x - w / 2, 17, z - d / 2, x + w / 2, 18 + hh, z + d / 2, o);
    k.add('roof_slate', cone(Math.max(w, d) * 0.72, hh * 0.45, 4), { x, y: 18 + hh, z, ry: Math.PI / 4 }, o);
    for (let i = 0; i < 3; i++) k.box('window_warm', x - w / 2 + 2 + i * 3, 18 + hh * 0.6, z + d / 2 + 0.03, 0.8, 1.6, 0.05, o);
  }
  towerRound(k, 'stone_wall', 36, 17, 10, 3, 30, 12, false, true);
  towerRound(k, 'stone_wall', 58, 17, -6, 2.6, 36, 11, false, true);
  spireTower(k, 22, 24, -62, 7, 44, 22, 'stone_wall');
  spireTower(k, 40, 17, -40, 6, 38, 18, 'stone_dark');
  // the pale unfinished halls behind the tower (the erased future), scaffolds on them
  for (const [x, z, hh] of [[-26, -70, 38], [-40, -64, 30], [12, -80, 46]] as const) {
    k.bmm('stone_fresh', x - 5, 20, z - 5, x + 5, 20 + hh, z + 5, o);
    for (let y = 22; y < 20 + hh; y += 3) k.box('timber', x + 5.4, y, z, 0.12, 0.12, 10.6, o);
    for (let i = -1; i <= 1; i++) k.box('timber', x + 5.4, 20 + hh / 2, z + i * 5, 0.16, hh, 0.16, o);
  }
  k.bmm('rock_cliff', -80, -4, -130, 60, 22, -49, o);
  // headlands east and west, a storm-bell tower on the western point (what Wick would build)
  for (const [x, z, r, h, s] of [[-150, 40, 60, 70, 3], [-190, -40, 90, 110, 4], [140, 30, 70, 60, 5], [190, -60, 100, 120, 6], [-60, -180, 160, 150, 7], [80, -200, 170, 170, 8]] as const) mountain(k, x, -8, z, r, h, s);
  k.add('rock_cliff', cyl(9, 16, 22, 10), { x: -118, y: -6, z: 58 }, o);
  k.add('stone_wall', cyl(2.4, 2.8, 24, 12), { x: -118, y: 14, z: 58 }, o);
  k.add('roof_slate', cone(3.2, 6, 12), { x: -118, y: 38, z: 58 }, o);
  k.box('window_warm', -118, 34, 60.5, 1.2, 2.2, 0.1, o);
  // sea stacks
  for (const [x, z, r, h] of [[34, 60, 4, 12], [-26, 74, 5, 9], [60, 95, 7, 16], [-70, 90, 6, 14], [16, 120, 5, 10]] as const) k.add('rock_cliff', cone(r, h, 7), { x, y: PLAN.seaY - 2, z }, o);
  void anchor; void YAW_S; void YAW_E;
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
