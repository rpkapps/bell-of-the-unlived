/**
 * Materials — the public look library.
 *
 *   getMaterial(id)            shared cached material (usable immediately; textures attach at init)
 *   getMaterialVariant(id, k)  tinted, re-seeded variant (k = small integer; 0 = the base material)
 *   initMaterials(renderer)    async GPU generation of every texture set (call once at boot,
 *                              before building levels; ~ms on desktop GPUs)
 *   updateMaterials(time)      per-frame: drives flicker/pulse of emissives, fire, fog veils
 *
 * Architecture materials use world triplanar mapping (no UVs needed) and the shared weathering
 * extension (grime, moss, streaks, edge wear, wetness). Timber/planks use world-scaled,
 * grain-aligned UVs. Characters/props use their UVs with plain PBR (safe to clone).
 */
import * as THREE from 'three';
import type { Quality } from '../game/settings';
import { MATERIAL_IDS, type MaterialId } from './materialIds';
import { MATERIAL_DEFS, type MatDef } from './materialDefs';
import { TextureGenerator, getNoiseTexture, texSize, type TexSet } from './textures';
import { WX_GLOBALS, applyWeathering, cloneWeathered, setWeatherSeed, isWeathered, materialDefines } from './weathering';
import './fog';

const cache = new Map<MaterialId, THREE.Material>();
/** Every material instance per id (base + variants) so textures can be (re)attached. */
const instances = new Map<MaterialId, THREE.Material[]>();
const variantCache = new Map<string, THREE.Material>();
const texSets = new Map<MaterialId, TexSet>();
let quality: Quality = 'high';
let generator: TextureGenerator | null = null;
let initPromise: Promise<void> | null = null;
let generatedAt: Quality | null = null;

/** Uniforms shared by the hand-written shader materials (fire, fog veil). */
const SHARED = {
  uTime: { value: 0 },
  uNoise: { value: null as THREE.Texture | null },
};

// ---------------------------------------------------------------------------------------------
// Special shader materials
// ---------------------------------------------------------------------------------------------
const FIRE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vView;
varying float vSeed;
void main() {
  vUv = uv;
  vec4 local = vec4( position, 1.0 );
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    vSeed = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
  #else
    vSeed = modelMatrix[3].x * 1.7 + modelMatrix[3].z * 2.3;
  #endif
  vec4 mvPosition = modelViewMatrix * local;
  gl_Position = projectionMatrix * mvPosition;
  vNrm = normalize( normalMatrix * normal );
  vView = -mvPosition.xyz;
  #include <fog_vertex>
}
`;
const FIRE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform sampler2D uNoise;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vView;
varying float vSeed;
void main() {
  float y = clamp( vUv.y, 0.0, 1.0 );
  float t = uTime + fract( vSeed ) * 10.0;
  float sx = vUv.x * 3.0 + fract( vSeed * 3.1 );
  // two scrolling noise layers make licking tongues that thin out with height
  float n1 = texture2D( uNoise, vec2( sx * 0.5, y * 0.55 - t * 0.9 ) ).g;
  float n2 = texture2D( uNoise, vec2( sx * 1.1 + 0.37, y * 1.2 - t * 1.7 ) ).b;
  float n = n1 * 0.65 + n2 * 0.35;
  float heat = ( 1.0 - y ) * 1.35 - ( 1.0 - n ) * 1.05 + 0.08;
  heat = clamp( heat, 0.0, 1.0 );
  vec3 col = mix( vec3( 0.75, 0.1, 0.015 ), vec3( 1.0, 0.45, 0.08 ), smoothstep( 0.05, 0.4, heat ) );
  col = mix( col, vec3( 1.0, 0.82, 0.45 ), smoothstep( 0.45, 0.85, heat ) );
  float facing = abs( dot( normalize( vNrm ), normalize( vView ) ) );
  float a = smoothstep( 0.02, 0.3, heat ) * smoothstep( 0.1, 0.6, facing ) * smoothstep( 0.0, 0.06, y );
  vec3 c = col * a * uIntensity * ( 0.35 + 0.9 * heat );
  #if defined( USE_FOG ) && !defined( FOG_EXP2 )
    c *= 1.0 - ( fogFar < 1000.0 ? smoothstep( fogNear, fogFar, vFogDepth ) : heightFogFactor( vFogWorldPos, fogNear, fogFar ) );
  #endif
  gl_FragColor = vec4( c, 1.0 );
}
`;

function makeFire(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    name: 'fire',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uIntensity: { value: 2.2 } }]),
    vertexShader: FIRE_VERT,
    fragmentShader: FIRE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
  m.uniforms.uTime = SHARED.uTime;
  m.uniforms.uNoise = SHARED.uNoise;
  return m;
}

const VEIL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWp;
varying vec3 vNrm;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 local = vec4( position, 1.0 );
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
  #endif
  vec4 wp = modelMatrix * local;
  vWp = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vNrm = normalize( normalMatrix * normal );
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;
const VEIL_FRAG = /* glsl */ `
uniform float uTime;
uniform sampler2D uNoise;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWp;
varying vec3 vNrm;
varying vec3 vView;
void main() {
  float t = uTime;
  vec2 p = vec2( vUv.x * 1.6, vUv.y );
  // domain-warped swirls drifting upward
  vec2 w = vec2( texture2D( uNoise, p * 0.22 + vec2( t * 0.012, -t * 0.03 ) ).r, texture2D( uNoise, p * 0.22 + vec2( 0.5 - t * 0.01, t * 0.02 ) ).r );
  float s1 = texture2D( uNoise, p * 0.3 + ( w - 0.5 ) * 0.9 + vec2( 0.0, -t * 0.06 ) ).r;
  float s2 = texture2D( uNoise, p * 0.7 + ( w - 0.5 ) * 1.2 + vec2( t * 0.02, -t * 0.11 ) ).g;
  float swirl = smoothstep( 0.2, 0.9, s1 * 0.7 + s2 * 0.4 );
  float edge = smoothstep( 0.0, 0.14, vUv.x ) * smoothstep( 1.0, 0.86, vUv.x ) * smoothstep( 1.0, 0.72, vUv.y );
  float base = smoothstep( 0.0, 0.08, vUv.y );
  float facing = abs( dot( normalize( vNrm ), normalize( vView ) ) );
  float streaks = texture2D( uNoise, vec2( vUv.x * 3.0 + w.x * 0.2, vUv.y * 0.12 - t * 0.12 ) ).a;
  float a = uOpacity * edge * base * ( 0.12 + 0.88 * swirl * swirl ) * ( 0.7 + 0.3 * facing ) * ( 0.75 + 0.5 * streaks );
  vec3 c = uColor * ( 0.6 + 0.8 * swirl + 0.5 * smoothstep( 0.65, 0.95, streaks ) );
  gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
}
`;

function makeFogVeil(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    name: 'fog_veil',
    uniforms: { uColor: { value: new THREE.Color('#ffe2b0').multiplyScalar(1.15) }, uOpacity: { value: 0.5 } },
    vertexShader: VEIL_VERT,
    fragmentShader: VEIL_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  m.uniforms.uTime = SHARED.uTime;
  m.uniforms.uNoise = SHARED.uNoise;
  return m;
}

// ---------------------------------------------------------------------------------------------
// PBR materials
// ---------------------------------------------------------------------------------------------
const FAMILY_METAL: Record<string, number> = { metal: 1 };

function needsExtension(d: MatDef): boolean {
  return d.mapping !== 'uv' || !!d.weather || !!d.emissive?.anim || !!(d.gen && d.emissive && hasEmissiveMask(d));
}
function hasEmissiveMask(d: MatDef): boolean {
  return !!d.gen && (d.gen.family === 'metal' && (d.gen.kind === 7 || d.gen.kind === 8) || d.gen.family === 'special' && (d.gen.kind === 2 || d.gen.kind === 3));
}

function build(id: MaterialId): THREE.Material {
  const d = MATERIAL_DEFS[id];
  if (!SHARED.uNoise.value) SHARED.uNoise.value = getNoiseTexture();
  if (d.special === 'fire') return makeFire();
  if (d.special === 'fogVeil') return makeFogVeil();

  const m = new THREE.MeshStandardMaterial({ name: id });
  // Until textures exist: a flat stand-in from the generator's base colour.
  m.color.set(d.gen ? d.gen.colors[0] : '#808080');
  m.roughness = 0.85;
  m.metalness = d.gen ? FAMILY_METAL[d.gen.family] ?? 0 : 0;
  if (id === 'iron' || id === 'iron_rusted' || id === 'gold_trim' || id === 'bronze' || id === 'bronze_bell' || id.startsWith('steel')) m.metalness = 0.9;
  if (d.doubleSided) m.side = THREE.DoubleSide;
  if (d.transparent) { m.transparent = true; m.depthWrite = false; }
  if (d.opacity !== undefined) m.opacity = d.opacity;
  if (d.alphaTest !== undefined) m.alphaTest = d.alphaTest;
  if (d.envMapIntensity !== undefined) m.envMapIntensity = d.envMapIntensity;
  if (d.normalScale !== undefined) m.normalScale.setScalar(d.normalScale);
  if (d.emissive) { m.emissive.set(d.emissive.color); m.emissiveIntensity = d.emissive.intensity; }
  if (id === 'shield_household' || id === 'heraldry_banner') m.shadowSide = THREE.DoubleSide;
  if (needsExtension(d)) {
    applyWeathering(m, {
      mapping: d.mapping, scale: d.scale,
      grime: d.weather?.[0] ?? 0, moss: d.weather?.[1] ?? 0, streaks: d.weather?.[2] ?? 0, edge: d.weather?.[3] ?? 0,
      porosity: d.porosity ?? 0,
      variation: d.variation ?? (d.mapping === 'triplanar' || d.mapping === 'uvWorld' ? 1 : 0),
      seed: (d.gen?.seed ?? 0) * 0.618,
      emissiveAnim: d.emissive?.anim,
    });
    if (id === 'water') materialDefines(m).WX_WATER = '';
  }
  const ts = texSets.get(id);
  if (ts) attach(m, ts, d);
  return m;
}

function attach(m: THREE.Material, ts: TexSet, d: MatDef): void {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.isMeshStandardMaterial) return;
  const tint = (s.userData.variantTint as THREE.Color | undefined) ?? null;
  s.map = ts.map;
  s.normalMap = ts.normalMap;
  s.roughnessMap = ts.orm;
  s.metalnessMap = ts.orm;
  s.aoMap = ts.orm;
  s.aoMapIntensity = 1;
  if (d.emissive && hasEmissiveMask(d)) s.emissiveMap = ts.orm;
  s.color.set(d.color ?? '#ffffff');
  if (tint) s.color.multiply(tint);
  s.roughness = d.roughness ?? 1;
  s.metalness = d.metalness ?? 1;
  s.needsUpdate = true;
}

function track(id: MaterialId, m: THREE.Material): void {
  let list = instances.get(id);
  if (!list) { list = []; instances.set(id, list); }
  list.push(m);
}

/** Shared, cached material for an id. Safe before `initMaterials` (textures attach later). */
export function getMaterial(id: MaterialId): THREE.Material {
  let m = cache.get(id);
  if (!m) {
    m = build(id);
    cache.set(id, m);
    track(id, m);
  }
  return m;
}

/**
 * A deterministic variant of a material: slightly shifted hue/value and a different weathering
 * seed (colour variation, triplanar offset). `k = 0` returns the base material. Cached per (id, k).
 */
export function getMaterialVariant(id: MaterialId, k: number): THREE.Material {
  const kk = Math.trunc(k);
  if (kk === 0) return getMaterial(id);
  const key = `${id}#${kk}`;
  let v = variantCache.get(key);
  if (v) return v;
  const base = getMaterial(id);
  const d = MATERIAL_DEFS[id];
  if (d.special) { variantCache.set(key, base); return base; }
  v = cloneWeathered(base);
  v.name = `${id}#${kk}`;
  // hash k → small HSL shift
  const h = Math.sin(kk * 12.9898 + 78.233) * 43758.5453;
  const r1 = h - Math.floor(h), r2 = (h * 7.13) - Math.floor(h * 7.13), r3 = (h * 3.71) - Math.floor(h * 3.71);
  const tint = new THREE.Color(1, 1, 1);
  const hsl = { h: 0, s: 0, l: 0 };
  const std = v as THREE.MeshStandardMaterial;
  if (std.isMeshStandardMaterial) {
    tint.setHSL(0.08 + (r1 - 0.5) * 0.06, 0.12 + r2 * 0.1, 0.5);
    tint.getHSL(hsl);
    // Normalise so the tint only nudges (luminance ~1 ± 8 %).
    const lum = 0.2126 * tint.r + 0.7152 * tint.g + 0.0722 * tint.b;
    tint.multiplyScalar((0.92 + r3 * 0.16) / Math.max(1e-3, lum));
    tint.lerp(new THREE.Color(1, 1, 1), 0.6);
    std.userData.variantTint = tint;
    std.color.multiply(tint);
    if (isWeathered(std)) setWeatherSeed(std, (d.gen?.seed ?? 0) * 0.618 + kk * 7.31);
  }
  variantCache.set(key, v);
  track(id, v);
  return v;
}

/** Clone any material returned here, keeping the weathering extension. */
export function cloneMaterial<T extends THREE.Material>(m: T): T {
  return cloneWeathered(m);
}

/** Texture quality used by the next `initMaterials` (the renderer sets it from settings). */
export function setMaterialQuality(q: Quality): void { quality = q; }

/**
 * Generate every texture set on the GPU and attach them to all materials created so far (and any
 * created later). Idempotent; resolves when done. Optional `q` overrides the stored quality.
 */
export function initMaterials(renderer: THREE.WebGLRenderer, q?: Quality): Promise<void> {
  if (q) quality = q;
  if (initPromise && generatedAt === quality) return initPromise;
  initPromise = generateAll(renderer);
  return initPromise;
}

async function generateAll(renderer: THREE.WebGLRenderer): Promise<void> {
  const q = quality;
  if (!generator) generator = new TextureGenerator(renderer);
  if (!SHARED.uNoise.value) SHARED.uNoise.value = getNoiseTexture();
  WX_GLOBALS.wxNoise.value = getNoiseTexture();
  const old = new Map(texSets);
  const t0 = performance.now();
  let n = 0;
  for (const id of MATERIAL_IDS) {
    const d = MATERIAL_DEFS[id];
    if (!d.gen) continue;
    const ts = generator.generate(d.gen, texSize(q, d.gen.size), id);
    texSets.set(id, ts);
    for (const m of instances.get(id) ?? []) attach(m, ts, d);
    // Yield occasionally so a loading screen can animate.
    if (++n % 12 === 0) await new Promise<void>((r) => setTimeout(r, 0));
  }
  old.forEach((ts) => ts.target.dispose());
  generatedAt = q;
  lastGenMs = performance.now() - t0;
}
let lastGenMs = 0;

/** Timing and memory of the last generation (for the debug overlay). */
export function materialStats(): { generationMs: number; textureSets: number; approxMB: number; quality: Quality | null } {
  let bytes = 0;
  texSets.forEach((t) => { bytes += t.width * t.height * 4 * 3 * 1.33; });
  return { generationMs: lastGenMs, textureSets: texSets.size, approxMB: bytes / (1024 * 1024), quality: generatedAt };
}

/** Raw generated textures of a material (for custom shaders / debug views). */
export function getTextureSet(id: MaterialId): TexSet | undefined { return texSets.get(id); }

/** Per-frame animation clock (seconds). Idempotent within a frame. */
export function updateMaterials(time: number): void {
  WX_GLOBALS.wxTime.value = time;
  SHARED.uTime.value = time;
  const fire = cache.get('fire') as THREE.ShaderMaterial | undefined;
  if (fire) fire.uniforms.uIntensity.value = 2.2 + 0.3 * Math.sin(time * 9.1) * Math.sin(time * 3.7 + 1.3);
}

/** Global wetness 0..1 (environment presets set this; rain could raise it). */
export function setWetness(w: number): void { WX_GLOBALS.wxWet.value = Math.max(0, Math.min(1, w)); }
/** World-Y ground reference for grime on objects whose origin sits above the ground. */
export function setGroundLevel(y: number): void { WX_GLOBALS.wxGroundY.value = y; }
