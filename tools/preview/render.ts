/**
 * Render preview: `?view=heraldry` (comparison board) | `?view=gallery` (material gallery, default).
 */
import * as THREE from 'three';
import { HERALDRY_KINDS, drawHeraldry, heraldryTexture } from '../../src/render/heraldry';
import { MATERIAL_IDS } from '../../src/render/materialIds';
import { initMaterials, getTextureSet, materialStats } from '../../src/render/materials';
import type { Quality } from '../../src/game/settings';
import { defaultSettings } from '../../src/game/settings';
import { GameRenderer } from '../../src/render/Renderer';
import { Particles } from '../../src/render/Particles';
import { Trails } from '../../src/render/Trails';
import { getMaterial, getMaterialVariant } from '../../src/render/materials';
import { makeFlameLight } from '../../src/render/lights';
import type { EnvironmentPreset, ParticleKind } from '../../src/render/contract';
import type { MaterialId } from '../../src/render/materialIds';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'gallery';
declare global { interface Window { __ready?: boolean; __log?: string[] } }

async function heraldryBoard(): Promise<void> {
  const board = document.getElementById('board')!;
  board.style.display = 'block';
  (document.getElementById('c') as HTMLCanvasElement).style.display = 'none';
  const refs = ['/concept-art/heraldry/royal-arms-user-reference.png', '/concept-art/heraldry/heraldry-system-user-reference.png'];
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;padding:10px;align-items:flex-start;flex-wrap:wrap';
  board.appendChild(row);
  for (const src of refs) {
    const im = new Image(); im.src = src; im.style.height = '360px'; row.appendChild(im);
    await im.decode();
  }
  // our vector charges on a dark field in the same layout as the sheet
  const cv = document.createElement('canvas'); cv.width = 540; cv.height = 360; row.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#1d1b19'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sheet = ['household', 'crown', 'army', 'academy', 'cathedral', 'treasury'] as const;
  sheet.forEach((k, i) => drawHeraldry(ctx, k, 90 + (i % 3) * 180, 90 + Math.floor(i / 3) * 180, 130, '#e6dccb'));
  const cv2 = document.createElement('canvas'); cv2.width = 216; cv2.height = 360; row.appendChild(cv2);
  const c2 = cv2.getContext('2d')!;
  c2.fillStyle = '#23201d'; c2.fillRect(0, 0, 216, 360);
  drawHeraldry(c2, 'royal', 108, 180, 330, '#b8955c');
  // worn textures
  const row2 = document.createElement('div'); row2.style.cssText = row.style.cssText; board.appendChild(row2);
  const specs: [typeof HERALDRY_KINDS[number], string, string, number, number][] = [
    ['royal', '#1b1a18', '#b08a52', 0.8, 1.6], ['royal', '#4a1414', '#c9a45a', 0.4, 2], ['household', '#1c2436', '#c9a45a', 0.5, 1],
    ['army', '#2a2622', '#9a9a90', 0.6, 1], ['cathedral', '#d8cfbd', '#2a2420', 0.3, 1], ['treasury', '#3a2c1c', '#c9a45a', 0.7, 1],
    ['academy', '#20303a', '#d8d0c0', 0.5, 1], ['crown', '#101010', '#d4b06a', 0.9, 1],
  ];
  for (const [k, f, c, w, a] of specs) {
    const t = heraldryTexture(k, { field: f, charge: c, wear: w, size: 256, aspect: a });
    const img = t.image as HTMLCanvasElement | OffscreenCanvas;
    const out = document.createElement('canvas'); out.width = img.width; out.height = img.height;
    out.getContext('2d')!.drawImage(img as CanvasImageSource, 0, 0);
    out.style.height = '300px'; row2.appendChild(out);
  }
  window.__ready = true;
}

/** Flat sheet of every generated texture set: albedo | normal | ORM (+ emissive in ORM alpha). */
async function textureSheet(): Promise<void> {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(innerWidth, innerHeight, false);
  const q = (params.get('q') ?? 'medium') as Quality;
  const t0 = performance.now();
  await initMaterials(renderer, q);
  const ms = performance.now() - t0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202020');
  const ids = MATERIAL_IDS.filter((id) => getTextureSet(id));
  const channel = params.get('ch') ?? 'map';
  const cols = 10, rows = Math.ceil(ids.length / cols);
  const cam = new THREE.OrthographicCamera(0, cols, 0, -rows, -1, 1);
  const aspect = innerWidth / innerHeight;
  cam.right = Math.max(cols, rows * aspect); cam.bottom = -Math.max(rows, cols / aspect); cam.updateProjectionMatrix();
  ids.forEach((id, i) => {
    const ts = getTextureSet(id)!;
    const tex = channel === 'normal' ? ts.normalMap : channel === 'orm' ? ts.orm : ts.map;
    const mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: tex }, mode: { value: channel === 'emis' ? 1 : channel === 'height' ? 2 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D t; uniform int mode; varying vec2 vUv; void main(){ vec4 c = texture2D(t, vUv);
        vec3 o = mode == 1 ? vec3(c.a) : mode == 2 ? vec3(c.a) : c.rgb; gl_FragColor = vec4(o, 1.0);
        #include <colorspace_fragment>
      }`,
    });
    if (channel === 'emis') mat.uniforms.t.value = ts.orm;
    if (channel === 'height') mat.uniforms.t.value = ts.normalMap;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), mat);
    mesh.position.set((i % cols) + 0.5, -Math.floor(i / cols) - 0.5, 0);
    scene.add(mesh);
  });
  renderer.render(scene, cam);
  const st = materialStats();
  document.getElementById('hud')!.textContent = `${channel}  q=${q}  gen ${ms.toFixed(0)} ms  sets ${st.textureSets}  ~${st.approxMB.toFixed(0)} MB\n` +
    ids.map((id, i) => `${i}:${id}`).join('  ');
  (document.getElementById('hud') as HTMLElement).style.cssText += ';bottom:6px;top:auto;white-space:normal;font-size:11px;max-width:98vw';
  window.__ready = true;
}

// ------------------------------------------------------------------------------------------------
// Gallery: every material on walls / slabs / spheres / props under an environment preset.
// ------------------------------------------------------------------------------------------------
function label(text: string, pos: THREE.Vector3, scene: THREE.Scene, size = 0.32): void {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d')!;
  x.font = '600 34px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 8, 512, 48);
  x.fillStyle = '#e8dcc0'; x.fillText(text, 256, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, fog: false, toneMapped: false }));
  sp.scale.set(size * 8, size, 1); sp.position.copy(pos); sp.renderOrder = 50;
  scene.add(sp);
}

function bellGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const prof = [[0.0, 1.25], [0.18, 1.24], [0.34, 1.18], [0.42, 1.0], [0.44, 0.7], [0.5, 0.4], [0.62, 0.15], [0.7, 0.04], [0.72, 0.0], [0.64, 0.02], [0.56, 0.12], [0.45, 0.38], [0.38, 0.7], [0.36, 1.0], [0.3, 1.14], [0.0, 1.16]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 48);
}

const SHOTS: Record<string, { pos: [number, number, number]; target: [number, number, number]; fov?: number }> = {
  overview: { pos: [6, 7.5, 17], target: [6, 1.2, 0] },
  walls: { pos: [4.5, 2.2, 7.2], target: [4.5, 1.6, 0] },
  walls2: { pos: [13.5, 2.2, 7.2], target: [13.5, 1.6, 0] },
  fresh: { pos: [2.2, 1.7, 3.2], target: [2.2, 1.5, 0] },
  floors: { pos: [7.5, 4.5, 11.5], target: [7.5, 0, 5] },
  timber: { pos: [21.5, 2.6, 6.5], target: [21.5, 1.8, 0] },
  metals: { pos: [7.5, 2.4, 14.5], target: [7.5, 1, 10] },
  organics: { pos: [7.5, 2.4, 19.5], target: [7.5, 1, 15] },
  heraldry: { pos: [-5.5, 2.0, 11.5], target: [-5.5, 1.6, 8] },
  fx: { pos: [-5.5, 2.4, 20], target: [-5.5, 1.2, 15] },
  sky: { pos: [6, 3, 20], target: [6, 12, -40], fov: 70 },
};

async function gallery(): Promise<void> {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const g = defaultSettings().graphics;
  g.quality = (params.get('q') ?? 'medium') as Quality;
  g.filmGrain = params.get('grain') !== '0';
  g.motionBlur = params.get('mb') === '1';
  const R = new GameRenderer(canvas, g);
  const t0 = performance.now();
  await initMaterials(R.renderer, g.quality);
  const genMs = performance.now() - t0;
  const env = (params.get('env') ?? 'ashbridgeDusk') as EnvironmentPreset;
  R.setEnvironment(env, 0);
  const scene = R.scene;
  const M = (id: MaterialId) => getMaterial(id);
  const add = (geo: THREE.BufferGeometry, id: MaterialId | THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(geo, typeof id === 'string' ? M(id) : id);
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  // ground: cobble street
  const ground = add(new THREE.BoxGeometry(80, 0.2, 60), 'cobble', 6, -0.1, 8);
  ground.castShadow = false;

  // --- row 0: architecture walls (z = 0)
  const walls: MaterialId[] = ['stone_fresh', 'stone_wall', 'stone_dark', 'stone_trim', 'plaster', 'rock_cliff', 'roof_slate', 'rubble'];
  walls.forEach((id, i) => {
    const x = i * 3 + 0.8;
    add(new THREE.BoxGeometry(2.8, 3.2, 0.6), id, x, 1.6, 0);
    label(id, new THREE.Vector3(x, 3.5, 0.4), scene);
  });
  // variants of stone_wall beside it on top (k = 1, 2)
  add(new THREE.BoxGeometry(2.8, 0.8, 0.7), getMaterialVariant('stone_wall', 1), 3.8, 3.6, 0);
  add(new THREE.BoxGeometry(2.8, 0.8, 0.7), getMaterialVariant('stone_wall', 2), 0.8, 3.6, 0);

  // --- timber frame house front (x ~ 21.5): plaster infill, oak posts/beams, planks, slate roof
  add(new THREE.BoxGeometry(5, 3.4, 0.3), 'plaster', 21.5, 1.7, -0.1);
  for (const px of [19.15, 21.5, 23.85]) add(new THREE.BoxGeometry(0.28, 3.4, 0.36), 'timber', px, 1.7, 0.08);
  add(new THREE.BoxGeometry(5.2, 0.3, 0.4), 'timber_dark', 21.5, 3.45, 0.08);
  add(new THREE.BoxGeometry(5.0, 0.26, 0.36), 'timber', 21.5, 1.2, 0.1);
  const brace = add(new THREE.BoxGeometry(0.2, 2.4, 0.3), 'timber', 20.3, 2.3, 0.12); brace.rotation.z = 0.7;
  const roof = add(new THREE.BoxGeometry(5.6, 0.2, 3), 'roof_slate', 21.5, 4.2, -0.7); roof.rotation.x = -0.6;
  add(new THREE.BoxGeometry(3, 0.12, 2.2), 'planks', 21.5, 0.06, 2.0);
  add(new THREE.BoxGeometry(1.2, 2.2, 0.12), 'planks', 21.5, 1.1, 0.12).rotation.y = 0;
  add(new THREE.CylinderGeometry(0.18, 0.2, 2.2, 12), 'timber_burnt', 25.6, 1.1, 0.6);
  add(new THREE.BoxGeometry(2, 0.3, 0.3), 'timber_burnt', 26.5, 0.15, 1.2);
  const thatch = add(new THREE.BoxGeometry(2.5, 0.25, 2), 'roof_thatch_burnt', 26.8, 2.2, -0.2); thatch.rotation.x = -0.5;
  label('timber / planks / slate', new THREE.Vector3(21.5, 5.2, 0.4), scene);

  // --- floors (z = 5)
  const floors: MaterialId[] = ['cobble', 'flagstone', 'dirt', 'mud', 'grass_dead', 'moss', 'water', 'rubble'];
  floors.forEach((id, i) => {
    const x = i * 2.2 - 0.5;
    add(new THREE.BoxGeometry(2.0, 0.06, 2.4), id, x, 0.03 + (id === 'water' ? 0.02 : 0), 5);
    label(id, new THREE.Vector3(x, 0.45, 6.3), scene, 0.22);
  });

  // --- metals (z = 10)
  const metals: MaterialId[] = ['iron', 'iron_rusted', 'steel_armor', 'steel_bright', 'bronze', 'gold_trim', 'unlived_crack', 'ember_glow'];
  metals.forEach((id, i) => {
    const x = i * 2.1;
    add(new THREE.SphereGeometry(0.6, 48, 24), id, x, 0.75, 10);
    add(new THREE.BoxGeometry(0.9, 0.3, 0.9), 'stone_trim', x, 0.15 - 0.0, 10).castShadow = false;
    label(id, new THREE.Vector3(x, 1.7, 10), scene, 0.22);
  });
  const bell = add(bellGeometry(), 'bronze_bell', 17.2, 0.35, 10);
  bell.scale.setScalar(1.3);
  label('bronze_bell', new THREE.Vector3(17.2, 2.2, 10), scene, 0.22);
  const bellU = add(bellGeometry(), 'unlived_crack', 19.8, 0.35, 10); bellU.scale.setScalar(1.3);
  // armour-like plates & a blade
  add(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 24, 1, true), 'steel_armor', 15, 1.2, 12.2).material = M('steel_armor');
  const blade = add(new THREE.BoxGeometry(0.06, 1.2, 0.012), 'steel_bright', 16, 1.1, 12.2); blade.rotation.z = 0.2;

  // --- organics (z = 15)
  const orgs: MaterialId[] = ['leather', 'leather_dark', 'cloth_black', 'cloth_red', 'cloth_blue', 'cloth_linen', 'cloth_brown', 'skin', 'skin_pale', 'hair_dark', 'hair_fair', 'bone'];
  orgs.forEach((id, i) => {
    const x = i * 1.35 - 0.5;
    add(new THREE.SphereGeometry(0.5, 40, 20), id, x, 0.6, 15);
    label(id, new THREE.Vector3(x, 1.35, 15), scene, 0.17);
  });
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 16, 1), 'rope', 16, 1.2, 15).rotation.z = Math.PI / 2;
  add(new THREE.PlaneGeometry(0.8, 1.1), 'parchment', 3, 0.9, 16.4).rotation.x = -0.4;
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 16), 'wax', 5, 0.2, 16.4);
  const flame = add(new THREE.ConeGeometry(0.035, 0.14, 12, 1, true), 'fire', 5, 0.47, 16.4); flame.castShadow = false;
  const candle = makeFlameLight(0xffb060, 1.5, 4); candle.position.set(5, 0.6, 16.4); scene.add(candle);
  add(new THREE.PlaneGeometry(1, 1.3), 'glass', 7, 0.8, 16.4);
  add(new THREE.PlaneGeometry(1, 1.3), 'window_warm', 9, 0.8, 16.4);
  add(new THREE.SphereGeometry(0.4, 32, 16), 'bell_light', 11, 0.5, 16.4);

  // --- heraldry (x = -5.5, z = 8)
  const banner = add(new THREE.PlaneGeometry(1.2, 2.4, 8, 16), 'heraldry_banner', -7, 2.2, 8);
  const bp = banner.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) bp.setZ(i, Math.sin(bp.getY(i) * 2.2 + bp.getX(i) * 3) * 0.06);
  banner.geometry.computeVertexNormals();
  add(new THREE.CylinderGeometry(0.03, 0.03, 1.5), 'iron', -7, 3.45, 8).rotation.z = Math.PI / 2;
  const shield = add(new THREE.PlaneGeometry(1.0, 1.6), 'shield_household', -5.2, 1.5, 8.05);
  void shield;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshStandardMaterial({ map: heraldryTexture('household', { field: '#1c2436', charge: '#c9a45a', wear: 0.5, size: 512 }), roughness: 0.8 }));
  board.position.set(-3.2, 1.5, 8.05); scene.add(board);
  add(new THREE.BoxGeometry(6.5, 3.6, 0.2), 'stone_dark', -5.2, 1.8, 7.85);
  label('heraldry', new THREE.Vector3(-5.2, 3.9, 8.2), scene);

  // --- fx corner (x = -5.5, z = 15): brazier, fog veil, particles, trail
  add(new THREE.CylinderGeometry(0.45, 0.3, 0.5, 16), 'iron', -7.5, 0.5, 15);
  add(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16), 'ember_glow', -7.5, 0.76, 15);
  const fireMesh = add(new THREE.ConeGeometry(0.35, 1.1, 16, 1, true), 'fire', -7.5, 1.3, 15); fireMesh.castShadow = false;
  const brazierLight = makeFlameLight(0xff9a48, 12, 10); brazierLight.position.set(-7.5, 1.6, 15); scene.add(brazierLight);
  const veil = add(new THREE.PlaneGeometry(3, 3.2), 'fog_veil', -4, 1.6, 13.5); veil.castShadow = false;
  const particles = new Particles(scene);
  const trails = new Trails(scene);
  const trail = trails.create(0xffe0b0, 0.75);
  trail.setActive(true);
  const swordBase = new THREE.Vector3(), swordTip = new THREE.Vector3();

  // debug: strip parts of the weathering extension (?nowx=WX_WEATHER,WX_TRIPLANAR)
  const strip = (params.get('nowx') ?? '').split(',').filter(Boolean);
  if (strip.length) scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    const d = m && (m as unknown as { defines?: Record<string, string> }).defines;
    if (d) { for (const k of strip) delete d[k]; m!.needsUpdate = true; }
  });
  const shot = SHOTS[params.get('shot') ?? 'overview'] ?? SHOTS.overview;
  R.camera.position.set(...shot.pos);
  R.camera.lookAt(new THREE.Vector3(...shot.target));
  if (shot.fov) { R.camera.fov = shot.fov; R.camera.updateProjectionMatrix(); }
  R.setFocus(new THREE.Vector3(...shot.target));
  R.resize();

  const hud = document.getElementById('hud')!;
  let t = 0;
  const frames = Number(params.get('frames') ?? 4);
  const emitKinds: [ParticleKind, THREE.Vector3][] = [
    ['sparks', new THREE.Vector3(-4, 1.2, 16.5)], ['goldMotes', new THREE.Vector3(-2.5, 1.0, 16)], ['fireBurst', new THREE.Vector3(-6, 1.5, 17)],
    ['healMotes', new THREE.Vector3(-3.5, 0.2, 17.5)], ['dust', new THREE.Vector3(-2, 0.05, 17.5)], ['shatter', new THREE.Vector3(-5, 1.6, 16)],
    ['rubble', new THREE.Vector3(-8.5, 2.2, 17)], ['bellMotes', new THREE.Vector3(-3, 1, 14.5)], ['blood', new THREE.Vector3(-6.5, 1.2, 16)],
  ];
  const hoursTarget = new THREE.Vector3(-3, 1.4, 18.5);
  const dt = 1 / 30;
  const warm = Number(params.get('warm') ?? 0.5);
  // simulate a little so particles/trail are mid-flight in the shot
  const simulate = (sec: number) => {
    for (let s = 0; s < sec; s += dt) {
      t += dt;
      if (Math.abs((t % 1.2) - 0.1) < dt / 2) emitKinds.forEach(([k, p]) => particles.emit(k, p, k === 'sparks' ? { dir: new THREE.Vector3(0.3, 1, 0.4) } : {}));
      if (Math.abs((t % 1.5) - 0.2) < dt / 2) particles.emit('hoursStream', new THREE.Vector3(-6.5, 0.2, 18.5), { target: hoursTarget });
      const a = Math.sin(t * 5) * 1.4;
      swordBase.set(-5.5 + Math.cos(a) * 0.3, 1.4, 18 + Math.sin(a) * 0.3);
      swordTip.set(-5.5 + Math.cos(a) * 1.4, 1.2 + Math.sin(t * 5) * 0.2, 18 + Math.sin(a) * 1.4);
      trail.push(swordBase, swordTip);
      trail.update(dt);
      particles.update(dt, R.camera);
    }
  };
  simulate(warm);
  for (let i = 0; i < frames; i++) { simulate(dt); R.render(dt); }
  const st = R.stats();
  hud.textContent = `${env}  q=${g.quality}  textures ${genMs.toFixed(0)} ms  calls ${st.drawCalls}  tris ${st.triangles}`;
  window.__ready = true;
  if (params.get('live') === '1') {
    let last = performance.now();
    const loop = () => { const now = performance.now(); const d = (now - last) / 1000; last = now; simulate(d); R.render(d); requestAnimationFrame(loop); };
    loop();
  }
}

if (view === 'heraldry') void heraldryBoard();
else if (view === 'gallery') void gallery();
else if (view === 'textures') void textureSheet();
