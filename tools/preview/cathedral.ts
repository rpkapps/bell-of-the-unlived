/**
 * The Pilgrim Stair — preview.
 *
 *   /tools/preview/cathedral.html?view=entry        level camera preset (see VIEWS)
 *     &q=low|medium|high   &env=cathedralNave   &open=grate,doors,cloister,bell,fogs   &check=1   &t=3
 *   /tools/preview/cathedral.html?mode=models&clip=cathVesMeasure&ct=0.8&only=vessaline,cath_healer
 *     lineup of the region's looks on real rigs (stance, or a clip sampled at time ct)
 * Exposes window.__ready / __stats / __check for headless screenshots.
 */
import * as THREE from 'three';
import { GameRenderer } from '../../src/render/Renderer';
import { initMaterials } from '../../src/render/materials';
import { defaultSettings, type Quality } from '../../src/game/settings';
import type { EnvironmentPreset } from '../../src/render/contract';
import { CollisionWorld } from '../../src/world/Collision';
import { Rig } from '../../src/actors/Rig';
import { PoseSolver } from '../../src/actors/anim/PoseSolver';
import type { PoseSpec } from '../../src/actors/anim/types';
import { CLIPS } from '../../src/actors/anim/clips/index';
import { models } from '../../src/actors/models/index';
import { ENEMY_DEFS } from '../../src/content/enemies';
import { BOSSES } from '../../src/content/bosses';
import '../../src/content/cathedral/environments';
import '../../src/content/cathedral/enemies';
import '../../src/content/cathedral/bosses';
import { registerCathedralLooks } from '../../src/content/cathedral/models';
import { buildCathedralLevel } from '../../src/content/cathedral/level';
import { runCathedralConnectivity } from '../../src/content/cathedral/levelCheck';

declare global { interface Window { __ready?: boolean; __stats?: unknown; __check?: unknown; __error?: string } }
registerCathedralLooks();

type View = { pos: [number, number, number]; target: [number, number, number]; env?: EnvironmentPreset; fov?: number; open?: string };
const VIEWS: Record<string, View> = {
  entry: { pos: [0, 2.4, 64.5], target: [0, 22, -38], fov: 62 },
  street: { pos: [2, 1.8, 47], target: [0, 12, -30] },
  crossroads: { pos: [4, 1.8, 41], target: [-12, 2, 30] },
  yard: { pos: [-23, 2.6, 39], target: [-32, 1, 26] },
  court: { pos: [8, 1.8, 34], target: [28, 2, 34] },
  stairFoot: { pos: [0, 1.8, 27], target: [0, 12, -20], fov: 65 },
  stair: { pos: [3, 5.7, 3], target: [0, 15, -30], fov: 65 },
  parvis: { pos: [0, 13.8, -21.5], target: [0, 33, -40], fov: 70 },
  parvisSide: { pos: [-15, 13.8, -24], target: [6, 20, -38], fov: 65 },
  chapel: { pos: [-21.2, 13.6, -29.5], target: [-31, 13, -30], env: 'cathedralNave' },
  ossuary: { pos: [21.6, 5.7, 4.5], target: [23.5, 5, -40], env: 'cathedralOssuary' },
  tablet: { pos: [27.6, 5.7, -18], target: [35, 5, -18], env: 'cathedralOssuary' },
  graves: { pos: [23.5, 5.8, -41], target: [23.5, 13, -62], env: 'cathedralOssuary' },
  cloister: { pos: [23.5, 13.8, -68.5], target: [38, 12, -88], env: 'cathedralCloister', open: 'fogs' },
  nave: { pos: [0, 13.8, -44], target: [0, 17, -96], env: 'cathedralNave' },
  naveAisle: { pos: [-11, 13.8, -46], target: [-3, 13, -80], env: 'cathedralNave' },
  triforium: { pos: [12, 19.8, -69], target: [4, 16, -92], env: 'cathedralNave' },
  choir: { pos: [0, 13.8, -98.5], target: [0, 18, -125], env: 'cathedralChoir', open: 'fogs' },
  overview: { pos: [70, 70, 70], target: [0, 10, -30], fov: 55 },
  back: { pos: [-60, 55, -150], target: [0, 10, -20], fov: 55 },
  top: { pos: [0, 260, -20], target: [0, 0, -21], fov: 50 },
};

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'level';
const q = (params.get('q') ?? 'medium') as Quality;

async function level(r: GameRenderer) {
  const viewName = params.get('view') ?? 'entry';
  const view = VIEWS[viewName] ?? VIEWS.entry;
  const world = new CollisionWorld();
  const L = buildCathedralLevel({ scene: r.scene, collision: world, quality: q, sun: r.sun });
  world.build();
  const pieces: Record<string, { set(t: number): void }[]> = {
    grate: [L.pieces.grate], doors: [L.pieces.greatDoors], cloister: [L.pieces.cloisterDoor], bell: [L.pieces.greatBell],
    fogs: L.arenas.map((a) => a.fogGate), reliquary: L.arenas[1].onDefeat ?? [],
  };
  if (params.get('check') === '1') {
    const res = runCathedralConnectivity(L, world);
    window.__check = res;
    const el = document.getElementById('check')!;
    el.style.display = 'block';
    el.textContent = res.map((x) => `${x.ok ? 'PASS' : 'FAIL'}  ${x.name}  [${x.reached}/${x.total}] ${x.seconds}s  ${x.note}`).join('\n');
  }
  for (const o of (params.get('open') ?? view.open ?? '').split(',').filter(Boolean)) for (const p of pieces[o] ?? []) p.set(1);
  r.setEnvironment((params.get('env') as EnvironmentPreset | null) ?? view.env ?? 'cathedralStair', 0);
  const cam = r.camera;
  cam.fov = view.fov ?? 60; cam.updateProjectionMatrix();
  cam.position.set(...view.pos);
  const target = new THREE.Vector3(...view.target);
  cam.lookAt(target);
  const wide = viewName === 'top' || viewName === 'back' || viewName === 'overview';
  r.setFocus(wide ? target : new THREE.Vector3().lerpVectors(cam.position, target, 0.2));
  if (wide) r.setShadowExtent(140);
  let time = Number(params.get('t') ?? 3);
  for (const p of L.processions) for (let i = 0; i < 60 * time; i++) p.step(1 / 60);
  const frame = (dt: number) => { time += dt; L.update(dt, time, cam); r.render(dt); };
  for (let i = 0; i < 3; i++) frame(1 / 30);
  const st = r.stats();
  window.__stats = { view: viewName, ...st, level: { ...L.stats, perKit: undefined }, perKit: L.stats.perKit };
  document.getElementById('hud')!.textContent = `${viewName} · draw calls ${st.drawCalls} · tris ${(st.triangles / 1000).toFixed(0)}k · level tris ${(L.stats.triangles / 1000).toFixed(0)}k · lights ${L.stats.lights} · build ${L.stats.buildMs.toFixed(0)} ms`;
}

function lineup(r: GameRenderer) {
  const scene = r.scene;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.95 }));
  ground.receiveShadow = true;
  scene.add(ground);
  r.setEnvironment((params.get('env') as EnvironmentPreset | null) ?? 'cathedralCloister', 0);
  const bosses = Object.values(BOSSES).filter((b) => ['procession', 'vessaline'].includes(b.id));
  const defs = [...['cath_pilgrim', 'cath_flagellant', 'cath_healer', 'cath_mourner', 'cath_bearer', 'cath_cantor'].map((k) => ({ id: k, def: ENEMY_DEFS[k], look: ENEMY_DEFS[k].look as string })),
    ...bosses.flatMap((b) => (b.looks ?? [b.def.look]).map((l) => ({ id: b.id + ':' + l, def: b.def, look: l as string })))];
  const only = (params.get('only') ?? '').split(',').filter(Boolean);
  const list = only.length ? defs.filter((d) => only.some((o) => d.id.startsWith(o) || d.look === o)) : defs;
  const clip = params.get('clip') ? CLIPS[params.get('clip')!] : null;
  const ct = Number(params.get('ct') ?? 0.5);
  const stats: Record<string, unknown> = {};
  const n = list.length;
  list.forEach((d, i) => {
    const rig = new Rig(d.def.props);
    const m = models.buildEnemy(rig, d.look, i + 3);
    for (const [slot, id] of [['weaponR', d.def.weaponR], ['weaponL', d.def.weaponL], ['shieldL', d.def.shield]] as const) if (id) rig.sockets[slot].add(models.buildWeapon(id).object);
    rig.root.position.set((i - (n - 1) / 2) * 1.9, 0, 0);
    scene.add(rig.root);
    const pose: PoseSpec = {
      hipsPos: [0, -0.04, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: (d.def.stance.chest ?? [0, 0, 0]) as [number, number, number], neck: [0, 0, 0], head: (d.def.stance.head ?? [0, 0, 0]) as [number, number, number],
      handR: d.def.stance.handR, handL: d.def.stance.handL, footL: [0.12, 0.08, 0.04], footR: [-0.12, 0.08, -0.04], footPitchL: 0, footPitchR: 0,
      fk: { upperArmL: [0, 0, 12], forearmL: [-20, 0, 0], upperArmR: [0, 0, -12], forearmR: [-20, 0, 0] },
    };
    if (clip) clip.sample(ct, pose);
    new PoseSolver(rig).apply(pose);
    rig.root.updateMatrixWorld(true);
    m.updateSecondary(0.016);
    stats[d.id] = (m as unknown as { info: unknown }).info;
  });
  const cam = r.camera;
  const dist = Number(params.get('dist') ?? Math.max(5, n * 1.3));
  const yaw = Number(params.get('angle') ?? 0) * Math.PI / 180;
  cam.fov = 40; cam.updateProjectionMatrix();
  cam.position.set(Math.sin(yaw) * dist, 1.6, Math.cos(yaw) * dist);
  cam.lookAt(0, 1.1, 0);
  r.setFocus(new THREE.Vector3(0, 1, 0));
  r.setShadowExtent(12);
  for (let i = 0; i < 3; i++) r.render(1 / 30);
  window.__stats = stats;
  document.getElementById('hud')!.textContent = Object.entries(stats).map(([k, v]) => `${k}  ${JSON.stringify(v)}`).join('\n');
}

async function main() {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const settings = defaultSettings();
  settings.graphics.quality = q;
  settings.graphics.filmGrain = false;
  const r = new GameRenderer(canvas, settings.graphics);
  await initMaterials(r.renderer, q);
  if (mode === 'models') lineup(r); else await level(r);
  window.__ready = true;
}
main().catch((e) => { window.__error = String(e?.stack ?? e); console.error(e); });
