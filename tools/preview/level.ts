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
 *     &basic=1                                   plain renderer (no post) instead of GameRenderer
 * Exposes window.__ready, window.__stats, window.__check for headless screenshots.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameRenderer } from '../../src/render/Renderer';
import { initMaterials, updateMaterials } from '../../src/render/materials';
import { initLightPool, updateLights, lightBudgetFor } from '../../src/render/lights';
import { defaultSettings, type Quality } from '../../src/game/settings';
import type { EnvironmentPreset } from '../../src/render/contract';
import { CollisionWorld } from '../../src/world/Collision';
import { buildAshbridge } from '../../src/content/ashbridge/level';
import { runAshbridgeConnectivity } from '../../src/content/ashbridge/connectivity';

declare global { interface Window { __ready?: boolean; __stats?: unknown; __check?: unknown; __error?: string } }

type View = { pos: [number, number, number]; target: [number, number, number]; env?: EnvironmentPreset; open?: string; reveal?: number; fov?: number };
const VIEWS: Record<string, View> = {
  overlook: { pos: [-29.5, 16.4, -108.6], target: [12, 6, -119.8], fov: 60 },
  overlookWide: { pos: [-37.5, 17.4, -113], target: [10, 2, -95], fov: 70 },
  shrine: { pos: [-29.8, 15.8, -108.6], target: [-26.8, 15.2, -112] },
  street: { pos: [-27, 1.8, -32.5], target: [10, 2.2, -33] },
  relief: { pos: [-17.6, 1.7, -32.8], target: [-18.2, 2.1, -38.6] },
  alley: { pos: [-12.2, 1.7, -30.5], target: [-14, 1.2, -9] },
  square: { pos: [0.5, 2, -26.5], target: [11, 4, -36] },
  mint: { pos: [10, 1.7, -36.8], target: [10, 2.4, -47.5] },
  counting: { pos: [11.5, 1.7, -49.1], target: [10.5, 0, -59] },
  undercroft: { pos: [13, -3.3, -59], target: [13, -3.9, -80] },
  cell: { pos: [12.6, -3.4, -80.3], target: [7, -4.6, -84] },
  courtyard: { pos: [-2, 4.8, -98], target: [8, 5, -122] },
  drawbridge: { pos: [-28.2, 5.2, -104.2], target: [-15, 3.5, -110.5], open: 'drawbridge,lever' },
  drawbridgeRaised: { pos: [-26.8, 16.2, -108.2], target: [-16, 4, -110] },
  ravine: { pos: [-20.5, 2.5, -50.5], target: [-20.5, -4, -105] },
  towerInside: { pos: [-30.9, 4.7, -106.3], target: [-36.5, 6.5, -113] },
  hospice: { pos: [24.2, 4.8, -106.5], target: [39, 4, -108], env: 'hospiceInterior' },
  forge: { pos: [30.5, 4.8, -113.5], target: [28, 3.6, -123], env: 'hospiceInterior' },
  yard: { pos: [42, 5.2, -101.5], target: [51, 3.2, -117] },
  approach: { pos: [4, 4.9, -131.4], target: [4, 10, -148] },
  gatehouse: { pos: [4, 6.5, -110], target: [4, 16, -138] },
  arena: { pos: [4, 10.5, -150.8], target: [4, 9.5, -178], env: 'arena' },
  fog: { pos: [4, 9.6, -143.5], target: [4, 10, -150] },
  reveal: { pos: [4, 11.8, -155.5], target: [4, -45, -186], env: 'battlefield', reveal: 1, open: 'fog,bell' },
  revealMid: { pos: [4, 11.5, -151.5], target: [4, 4, -166], env: 'arena', reveal: 0.35, open: 'fog,bell' },
  top: { pos: [0, 240, -30], target: [0, 0, -95], fov: 55 },
  back: { pos: [60, 45, -10], target: [-10, 0, -100], fov: 60 },
};

const params = new URLSearchParams(location.search);
const viewName = params.get('view') ?? 'overlook';
const view = VIEWS[viewName] ?? VIEWS.overlook;
const q = (params.get('q') ?? 'medium') as Quality;

/** The subset of the game renderer this preview uses. */
interface PreviewRenderer {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; sun: THREE.DirectionalLight;
  setEnvironment(p: EnvironmentPreset, s?: number): void; setFocus(p: THREE.Vector3): void; setShadowExtent(h: number): void;
  render(dt: number): void; stats(): { drawCalls: number; triangles: number };
}

/** Fallback: plain WebGLRenderer, sky colour, exp fog, the sun with shadows, the light pool. */
function basicRenderer(canvas: HTMLCanvasElement, fov: number): PreviewRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight), 0.1, 2000);
  const sun = new THREE.DirectionalLight(0xb7c6de, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  let ext = 40;
  const setExt = (h: number) => { ext = h; const c = sun.shadow.camera; c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.near = 1; c.far = 500; c.updateProjectionMatrix(); };
  setExt(ext);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x8898ad, 0x3b3530, 0.85);
  scene.add(hemi);
  initLightPool(scene, 12);
  const presets: Record<string, [number, number, number]> = { // fog colour, density, exposure
    ashbridgeDusk: [0x5b6977, 0.0085, 1.0], undercroft: [0x1d1712, 0.035, 1.5], hospiceInterior: [0x2b2119, 0.02, 1.3],
    arena: [0x4d4c5a, 0.007, 1.05], battlefield: [0x9c9178, 0.006, 1.0], title: [0x272b31, 0.01, 1],
  };
  let focus = new THREE.Vector3();
  let time = 0;
  const dir = new THREE.Vector3(0.62, 0.52, -0.58).normalize();
  return {
    renderer, scene, camera, sun,
    setEnvironment(p) { const [c, d, e] = presets[p] ?? presets.ashbridgeDusk; scene.fog = new THREE.FogExp2(c, d); scene.background = new THREE.Color(c); renderer.toneMappingExposure = e; },
    setFocus(p) { focus = p.clone(); },
    setShadowExtent: setExt,
    render(dt) {
      time += dt;
      sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(dir, 200);
      sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
      updateMaterials(time);
      updateLights(time, camera.position);
      renderer.render(scene, camera);
    },
    stats() { return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
  };
}

async function main() {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const settings = defaultSettings();
  settings.graphics.quality = q;
  settings.graphics.filmGrain = false;
  settings.graphics.fov = view.fov ?? 60;
  let r: PreviewRenderer;
  let rendererName = 'GameRenderer';
  try {
    if (params.get('basic') === '1') throw new Error('basic requested');
    r = new GameRenderer(canvas, settings.graphics) as unknown as PreviewRenderer;
  } catch (e) {
    console.warn('GameRenderer unavailable, using the basic preview renderer:', String(e));
    rendererName = 'basic';
    r = basicRenderer(canvas, settings.graphics.fov);
  }
  void lightBudgetFor;
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
  for (let i = 0; i < 2; i++) frame(1 / 30);
  const st = r.stats();
  window.__stats = { view: viewName, renderer: rendererName, ...st, level: layout.stats, programs: r.renderer.info.programs?.length ?? 0 };
  hud.textContent = `${viewName} (${rendererName})  ·  draw calls ${st.drawCalls}  ·  tris ${(st.triangles / 1000).toFixed(0)}k  ·  level tris ${(layout.stats.triangles / 1000).toFixed(0)}k  ·  lights ${layout.stats.lights}  ·  build ${layout.stats.buildMs.toFixed(0)} ms`;
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
