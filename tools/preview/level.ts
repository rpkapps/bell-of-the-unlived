/**
 * Ashbridge level preview.
 *
 *   /tools/preview/level.html?view=overlook      camera preset (see VIEWS below)
 *     &q=low|medium|high|ultra                   render quality (default medium)
 *     &debug=1                                   show collider wireframes (collision.debugMesh)
 *     &open=hatch,drawbridge,fog,refuge,chest,lever,bell   set dynamic pieces to 1
 *     &reveal=0.5                                battlefield reveal t
 *     &env=arena                                 override the environment preset
 *     &check=1                                   run the connectivity walk and print results
 *     &free=1                                    orbit controls (interactive)
 * Exposes window.__ready, window.__stats, window.__check for headless screenshots.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameRenderer } from '../../src/render/Renderer';
import { initMaterials } from '../../src/render/materials';
import { defaultSettings, type Quality } from '../../src/game/settings';
import type { EnvironmentPreset } from '../../src/render/contract';
import { CollisionWorld } from '../../src/world/Collision';
import { buildAshbridge } from '../../src/content/ashbridge/level';
import { runAshbridgeConnectivity } from '../../src/content/ashbridge/connectivity';

declare global { interface Window { __ready?: boolean; __stats?: unknown; __check?: unknown; __error?: string } }

type View = { pos: [number, number, number]; target: [number, number, number]; env?: EnvironmentPreset; open?: string; reveal?: number; fov?: number };
const VIEWS: Record<string, View> = {
  overlook: { pos: [-35.4, 16.6, -109.6], target: [0, 5, -106], fov: 62 },
  overlookWide: { pos: [-37.5, 17.4, -113], target: [10, 2, -95], fov: 70 },
  shrine: { pos: [-33.2, 15.6, -111.4], target: [-29.5, 15.2, -114.4] },
  street: { pos: [-27, 1.8, -32.5], target: [10, 2.2, -33] },
  relief: { pos: [-17.6, 1.7, -32.8], target: [-18.2, 2.1, -38.6] },
  alley: { pos: [-12.2, 1.7, -30.5], target: [-14, 1.2, -9] },
  square: { pos: [0.5, 2, -26.5], target: [11, 4, -36] },
  mint: { pos: [10, 1.7, -36.8], target: [10, 2.4, -47.5] },
  counting: { pos: [11.5, 1.7, -49.1], target: [10.5, 0, -59] },
  undercroft: { pos: [13, -3.3, -59], target: [13, -3.9, -80] },
  cell: { pos: [12.6, -3.4, -80.3], target: [7, -4.6, -84] },
  courtyard: { pos: [-2, 4.8, -98], target: [8, 5, -122] },
  drawbridge: { pos: [-9.5, 6.5, -101], target: [-22, 4, -111], open: 'drawbridge,lever' },
  ravine: { pos: [-20, 7, -44], target: [-20, -6, -110] },
  hospice: { pos: [24.2, 4.8, -106.5], target: [39, 4, -108], env: 'hospiceInterior' },
  forge: { pos: [30.5, 4.8, -113.5], target: [28, 3.6, -123], env: 'hospiceInterior' },
  yard: { pos: [42, 5.2, -101.5], target: [51, 3.2, -117] },
  approach: { pos: [4, 5.2, -125], target: [4, 12, -145] },
  gatehouse: { pos: [4, 6.5, -110], target: [4, 16, -138] },
  arena: { pos: [4, 10.5, -150.8], target: [4, 9.5, -178], env: 'arena' },
  fog: { pos: [4, 9.6, -143.5], target: [4, 10, -150] },
  reveal: { pos: [4, 12.8, -155.2], target: [4, -30, -172], env: 'battlefield', reveal: 1, open: 'fog,bell' },
  revealMid: { pos: [4, 11.5, -151.5], target: [4, 4, -166], env: 'arena', reveal: 0.35, open: 'fog,bell' },
  top: { pos: [0, 240, -30], target: [0, 0, -95], fov: 55 },
  back: { pos: [60, 45, -10], target: [-10, 0, -100], fov: 60 },
};

const params = new URLSearchParams(location.search);
const viewName = params.get('view') ?? 'overlook';
const view = VIEWS[viewName] ?? VIEWS.overlook;
const q = (params.get('q') ?? 'medium') as Quality;

async function main() {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const settings = defaultSettings();
  settings.graphics.quality = q;
  settings.graphics.filmGrain = false;
  settings.graphics.fov = view.fov ?? 60;
  const r = new GameRenderer(canvas, settings.graphics);
  await initMaterials(r.renderer, q);
  const world = new CollisionWorld();
  const layout = buildAshbridge({ scene: r.scene, collision: world, quality: q, sun: r.sun });
  world.build();
  if (world.debugMesh) { r.scene.add(world.debugMesh); world.debugMesh.visible = params.get('debug') === '1'; }

  // dynamic states
  const pieces: Record<string, { set(t: number): void }> = {
    hatch: layout.hatch, drawbridge: layout.drawbridge, lever: layout.drawbridgeLever, fog: layout.fogGate,
    refuge: layout.refugeDoor, chest: layout.chest, bell: layout.anchorBell,
  };
  const open = (params.get('open') ?? view.open ?? '').split(',').filter(Boolean);
  for (const o of open) pieces[o]?.set(1);
  const reveal = params.has('reveal') ? Number(params.get('reveal')) : view.reveal ?? 0;
  layout.battlefieldReveal.set(reveal);

  // connectivity check (before the view's states matter; it resets pieces afterwards)
  if (params.get('check') === '1') {
    const res = runAshbridgeConnectivity(layout, world);
    window.__check = res;
    const el = document.getElementById('check')!;
    el.style.display = 'block';
    el.textContent = res.map((x) => `${x.ok ? 'PASS' : 'FAIL'}  ${x.name}  [${x.reached}/${x.total}] ${x.seconds}s  ${x.note}`).join('\n');
    for (const o of open) pieces[o]?.set(1);
    layout.battlefieldReveal.set(reveal);
  }

  const env = (params.get('env') as EnvironmentPreset | null) ?? view.env ?? 'ashbridgeDusk';
  r.setEnvironment(env, 0);
  const cam = r.camera;
  cam.position.set(...view.pos);
  const target = new THREE.Vector3(...view.target);
  cam.lookAt(target);
  const focus = new THREE.Vector3().lerpVectors(cam.position, target, 0.25);
  r.setFocus(viewName === 'top' || viewName === 'back' ? target : focus);
  if (viewName === 'top' || viewName === 'back') r.setShadowExtent(120);
  let controls: OrbitControls | null = null;
  if (params.get('free') === '1') { controls = new OrbitControls(cam, canvas); controls.target.copy(target); controls.update(); }

  const hud = document.getElementById('hud')!;
  let time = Number(params.get('t') ?? 3);
  const frame = (dt: number) => {
    time += dt;
    layout.update(dt, time, cam);
    if (controls) { controls.update(); r.setFocus(controls.target); }
    r.render(dt);
  };
  for (let i = 0; i < 3; i++) frame(1 / 30);
  const st = r.stats();
  window.__stats = { view: viewName, ...st, level: layout.stats, programs: r.renderer.info.programs?.length ?? 0 };
  hud.textContent = `${viewName}  ·  draw calls ${st.drawCalls}  ·  tris ${(st.triangles / 1000).toFixed(0)}k  ·  level tris ${(layout.stats.triangles / 1000).toFixed(0)}k  ·  lights ${layout.stats.lights}  ·  build ${layout.stats.buildMs.toFixed(0)} ms`;
  window.__ready = true;
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    frame(Math.min(0.1, (now - last) / 1000));
    last = now;
    if (controls) requestAnimationFrame(loop);
  };
  if (controls) requestAnimationFrame(loop);
}

main().catch((e) => { window.__error = String(e?.stack ?? e); console.error(e); });
