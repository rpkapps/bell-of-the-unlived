/**
 * Render preview: `?view=heraldry` (comparison board) | `?view=gallery` (material gallery, default).
 */
import * as THREE from 'three';
import { HERALDRY_KINDS, drawHeraldry, heraldryTexture } from '../../src/render/heraldry';
import { MATERIAL_IDS } from '../../src/render/materialIds';
import { initMaterials, getTextureSet, materialStats } from '../../src/render/materials';
import type { Quality } from '../../src/game/settings';

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

if (view === 'heraldry') void heraldryBoard();
else if (view === 'textures') void textureSheet();
