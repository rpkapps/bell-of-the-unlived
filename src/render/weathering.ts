/**
 * Shared weathering extension for MeshStandardMaterial / MeshPhysicalMaterial (onBeforeCompile).
 *
 * Adds, per material (all driven by defines + a few uniforms, one shared program per variant):
 *  - mapping:  WX_TRIPLANAR  world-space triplanar albedo/ORM/normal (UDN blend), metres-per-tile
 *              WX_UVWORLD    UVs rescaled to metres from screen-space derivatives, with the grain
 *                            (texture +U) turned to follow the face's longer world extent — so box
 *                            beams, posts and planks get correctly oriented, unstretched wood grain
 *              (default)     ordinary UVs; ORM sampled once
 *  - grime/soot darkening that rises from the ground (object origin or `wxGroundY`, whichever is lower)
 *  - vertical soot/rain streaks on walls
 *  - moss on upward-facing surfaces and in cavities (texture AO)
 *  - edge wear from screen-space curvature (polish on metal, pale chips on stone)
 *  - large-scale colour variation that breaks tiling
 *  - global wetness (darker, glossier; puddles in floor cavities)
 *  - WX_EMISSIVE: emissive mask from ORM.a with flicker / pulse animation (`wxTime`)
 *
 * Material.clone() does not copy onBeforeCompile; use `cloneWeathered()` to keep the extension.
 */
import * as THREE from 'three';
import { getNoiseTexture } from './textures';

/** Uniforms shared by every extended material (update once per frame). */
export const WX_GLOBALS = {
  wxTime: { value: 0 },
  /** 0 = dry … 1 = soaked (environment presets drive this). */
  wxWet: { value: 0 },
  /** Ground reference for grime when an object's origin sits higher (world Y). */
  wxGroundY: { value: 0 },
  wxNoise: { value: null as THREE.Texture | null },
};

export interface WeatherOpts {
  mapping: 'triplanar' | 'uvWorld' | 'uv';
  /** Metres per texture tile (triplanar / uvWorld). */
  scale: number;
  grime: number; moss: number; streaks: number; edge: number;
  porosity: number;
  variation: number;
  seed: number;
  /** [flicker amount, flicker speed, pulse amount, pulse speed] — enables WX_EMISSIVE. */
  emissiveAnim?: [number, number, number, number];
  /** Emissive mask comes from ORM alpha (emissiveMap = orm). */
  emissiveMask?: boolean;
}

interface WxUserData {
  opts: WeatherOpts;
  uniforms: {
    wxParams: { value: THREE.Vector4 };
    wxParams2: { value: THREE.Vector4 };
    wxEmis: { value: THREE.Vector4 };
  };
}

const VERT_PARS = /* glsl */ `
varying vec3 vWxPos;
varying vec3 vWxNrm;
varying vec3 vWxOrigin;
`;

const VERT_MAIN = /* glsl */ `
{
  mat4 wxM = modelMatrix;
  #ifdef USE_INSTANCING
    wxM = wxM * instanceMatrix;
  #endif
  #ifdef USE_BATCHING
    wxM = wxM * batchingMatrix;
  #endif
  vWxPos = ( wxM * vec4( transformed, 1.0 ) ).xyz;
  vec3 wxS2 = vec3( dot( wxM[0].xyz, wxM[0].xyz ), dot( wxM[1].xyz, wxM[1].xyz ), dot( wxM[2].xyz, wxM[2].xyz ) );
  vWxNrm = normalize( mat3( wxM ) * ( objectNormal / max( wxS2, vec3( 1e-8 ) ) ) );
  vWxOrigin = wxM[3].xyz;
}
`;

const FRAG_PARS = /* glsl */ `
uniform sampler2D wxNoise;
uniform float wxTime;
uniform float wxWet;
uniform float wxGroundY;
uniform vec4 wxParams;   // grime, moss, streaks, edge
uniform vec4 wxParams2;  // metres per tile, seed, porosity, variation
uniform vec4 wxEmis;     // flicker, flickerSpeed, pulse, pulseSpeed
varying vec3 vWxPos;
varying vec3 vWxNrm;
varying vec3 vWxOrigin;
`;

/** Replaces <map_fragment>: sets up mapping, samples albedo and ORM once. */
const FRAG_MAP = /* glsl */ `
vec3 wxGeoN = normalize( vWxNrm ) * ( gl_FrontFacing ? 1.0 : -1.0 );
vec4 wxOrm = vec4( 1.0 );
float wxSeed = wxParams2.y;
#if defined( WX_TRIPLANAR )
  vec3 wxP = vWxPos / wxParams2.x + vec3( wxSeed * 0.371, wxSeed * 0.173, wxSeed * 0.619 );
  vec3 wxBl = pow( abs( wxGeoN ), vec3( 6.0 ) );
  wxBl /= dot( wxBl, vec3( 1.0 ) );
  vec3 wxSg = vec3( wxGeoN.x < 0.0 ? -1.0 : 1.0, wxGeoN.y < 0.0 ? -1.0 : 1.0, wxGeoN.z < 0.0 ? -1.0 : 1.0 );
  // Right-handed tangent frames per projection (T x B = N):
  //  X: T = -sgn.x Z, B = Y   Y: T = X, B = -sgn.y Z   Z: T = sgn.z X, B = Y
  vec2 wxUvX = vec2( -wxP.z * wxSg.x, wxP.y );
  vec2 wxUvY = vec2( wxP.x, -wxP.z * wxSg.y );
  vec2 wxUvZ = vec2( wxP.x * wxSg.z, wxP.y );
  vec3 wxDx = dFdx( wxP ), wxDy = dFdy( wxP );
  vec2 wxGxX = vec2( -wxDx.z * wxSg.x, wxDx.y ), wxGyX = vec2( -wxDy.z * wxSg.x, wxDy.y );
  vec2 wxGxY = vec2( wxDx.x, -wxDx.z * wxSg.y ), wxGyY = vec2( wxDy.x, -wxDy.z * wxSg.y );
  vec2 wxGxZ = vec2( wxDx.x * wxSg.z, wxDx.y ), wxGyZ = vec2( wxDy.x * wxSg.z, wxDy.y );
  #define WX_TRI( tex, outv ) { outv = vec4( 0.0 ); \\
    if ( wxBl.x > 0.004 ) outv += textureGrad( tex, wxUvX, wxGxX, wxGyX ) * wxBl.x; \\
    if ( wxBl.y > 0.004 ) outv += textureGrad( tex, wxUvY, wxGxY, wxGyY ) * wxBl.y; \\
    if ( wxBl.z > 0.004 ) outv += textureGrad( tex, wxUvZ, wxGxZ, wxGyZ ) * wxBl.z; }
  #ifdef USE_MAP
    vec4 wxAlb; WX_TRI( map, wxAlb );
    diffuseColor *= wxAlb;
  #endif
  #ifdef USE_ROUGHNESSMAP
    WX_TRI( roughnessMap, wxOrm );
  #endif
#elif defined( WX_UVWORLD ) && defined( USE_MAP )
  // Metres per unit U/V from screen-space derivatives (exact per triangle for affine UVs).
  vec3 wxdp1 = dFdx( vWxPos ), wxdp2 = dFdy( vWxPos );
  vec2 wxduv1 = dFdx( vMapUv ), wxduv2 = dFdy( vMapUv );
  vec3 wxdp2perp = cross( wxdp2, wxGeoN ), wxdp1perp = cross( wxGeoN, wxdp1 );
  vec3 wxT = wxdp2perp * wxduv1.x + wxdp1perp * wxduv2.x;
  vec3 wxB = wxdp2perp * wxduv1.y + wxdp1perp * wxduv2.y;
  float wxDet = abs( dot( wxdp1, wxdp2perp ) );
  float wxLu = wxDet / max( length( wxT ), 1e-20 );
  float wxLv = wxDet / max( length( wxB ), 1e-20 );
  bool wxSwap = wxLv > wxLu * 1.05;
  vec3 wxOfs = fract( vWxOrigin * vec3( 0.1373, 0.2711, 0.4193 ) + wxSeed * 0.31 );
  vec2 wxUvW = ( wxSwap ? vec2( vMapUv.y * wxLv, vMapUv.x * wxLu ) : vec2( vMapUv.x * wxLu, vMapUv.y * wxLv ) ) / wxParams2.x
             + wxOfs.xy * 3.7 + wxOfs.z;
  vec3 wxTd = normalize( wxT + 1e-20 ), wxBd = normalize( wxB + 1e-20 );
  diffuseColor *= texture2D( map, wxUvW );
  #ifdef USE_ROUGHNESSMAP
    wxOrm = texture2D( roughnessMap, wxUvW );
  #endif
#else
  #ifdef USE_MAP
    diffuseColor *= texture2D( map, vMapUv );
  #endif
  #ifdef USE_ROUGHNESSMAP
    wxOrm = texture2D( roughnessMap, vRoughnessMapUv );
  #endif
#endif
`;

const FRAG_ROUGH = /* glsl */ `
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  roughnessFactor *= wxOrm.g;
#endif
`;
const FRAG_METAL = /* glsl */ `
float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
  metalnessFactor *= wxOrm.b;
#endif
`;

/** Replaces <normal_fragment_maps>. */
const FRAG_NORMAL = /* glsl */ `
#if defined( USE_NORMALMAP_TANGENTSPACE ) && defined( WX_TRIPLANAR ) && defined( WX_WATER )
  {
    // two ripple layers drifting across each other (water is flat: top projection only)
    vec2 w1 = wxUvY + vec2( wxTime * 0.021, wxTime * 0.013 );
    vec2 w2 = wxUvY * 0.63 + vec2( -wxTime * 0.017, wxTime * 0.024 );
    vec2 t = ( texture2D( normalMap, w1 ).xy + texture2D( normalMap, w2 ).xy - 1.0 ) * normalScale;
    vec3 wxWN = normalize( wxGeoN + vec3( t.x, 0.0, -wxSg.y * t.y ) );
    normal = normalize( ( viewMatrix * vec4( wxWN, 0.0 ) ).xyz );
  }
#elif defined( USE_NORMALMAP_TANGENTSPACE ) && defined( WX_TRIPLANAR )
  {
    vec3 wxPert = vec3( 0.0 );
    if ( wxBl.x > 0.004 ) { vec2 t = ( textureGrad( normalMap, wxUvX, wxGxX, wxGyX ).xy * 2.0 - 1.0 ) * normalScale;
      wxPert += ( vec3( 0.0, 0.0, -wxSg.x ) * t.x + vec3( 0.0, 1.0, 0.0 ) * t.y ) * wxBl.x; }
    if ( wxBl.y > 0.004 ) { vec2 t = ( textureGrad( normalMap, wxUvY, wxGxY, wxGyY ).xy * 2.0 - 1.0 ) * normalScale;
      wxPert += ( vec3( 1.0, 0.0, 0.0 ) * t.x + vec3( 0.0, 0.0, -wxSg.y ) * t.y ) * wxBl.y; }
    if ( wxBl.z > 0.004 ) { vec2 t = ( textureGrad( normalMap, wxUvZ, wxGxZ, wxGyZ ).xy * 2.0 - 1.0 ) * normalScale;
      wxPert += ( vec3( wxSg.z, 0.0, 0.0 ) * t.x + vec3( 0.0, 1.0, 0.0 ) * t.y ) * wxBl.z; }
    vec3 wxWN = normalize( wxGeoN + wxPert );
    normal = normalize( ( viewMatrix * vec4( wxWN, 0.0 ) ).xyz );
  }
#elif defined( USE_NORMALMAP_TANGENTSPACE ) && defined( WX_UVWORLD ) && defined( USE_MAP )
  {
    vec2 t = ( texture2D( normalMap, wxUvW ).xy * 2.0 - 1.0 ) * normalScale;
    vec3 wxPert = wxSwap ? ( wxBd * t.x + wxTd * t.y ) : ( wxTd * t.x + wxBd * t.y );
    vec3 wxWN = normalize( wxGeoN + wxPert );
    normal = normalize( ( viewMatrix * vec4( wxWN, 0.0 ) ).xyz );
  }
#elif defined( USE_NORMALMAP_TANGENTSPACE )
  vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
  mapN.xy *= normalScale;
  normal = normalize( tbn * mapN );
#endif

// ---------------------------------------------------------------- weathering
#ifdef WX_WEATHER
{
  vec3 wN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  float up = wxGeoN.y;
  vec2 wxWallDir = normalize( vec2( wxGeoN.z, -wxGeoN.x ) + vec2( 1e-4, 0.0 ) );
  vec2 wallUv = vec2( dot( vWxPos.xz, wxWallDir ), vWxPos.y );
  vec2 macroUv = abs( up ) > 0.7 ? vWxPos.xz : wallUv;
  vec4 mA = texture2D( wxNoise, macroUv * 0.043 + wxSeed * 0.37 );
  vec4 mB = texture2D( wxNoise, macroUv * 0.19 + wxSeed * 0.71 );
  // large-scale variation (breaks tiling)
  float var = ( mA.r - 0.5 ) * wxParams2.w;
  diffuseColor.rgb *= 1.0 + var * 0.55;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.06, 1.0, 0.9 ), clamp( mA.g - 0.45, 0.0, 0.5 ) * wxParams2.w );
  // grime / soot rising from the ground
  float wxBase = min( vWxOrigin.y, wxGroundY );
  float hAbove = max( vWxPos.y - wxBase, 0.0 );
  float grime = wxParams.x * exp( -hAbove / 1.5 ) * ( 0.5 + 0.9 * mB.g ) * ( 1.0 - 0.6 * max( up, 0.0 ) );
  grime = clamp( grime, 0.0, 0.8 );
  diffuseColor.rgb *= 1.0 - grime * 0.72;
  roughnessFactor = mix( roughnessFactor, 1.0, grime * 0.3 );
  // vertical streaks (soot, rain runs) on walls
  float vert = 1.0 - abs( up );
  float streakN = texture2D( wxNoise, vec2( wallUv.x * 0.22, wallUv.y * 0.03 ) + wxSeed ).a;
  float streak = smoothstep( 0.5, 0.9, streakN ) * wxParams.z * vert * ( 0.3 + mA.b ) * smoothstep( 0.35, 0.65, mA.g );
  diffuseColor.rgb *= 1.0 - streak * 0.42;
  // moss: up-facing and in cavities
  float cav = 1.0 - wxOrm.r;
  float mossM = wxParams.y * smoothstep( 0.5, 0.85, max( wN.y, 0.0 ) * 0.7 + cav * 0.7 + ( mB.r - 0.5 ) * 1.0 + grime * 0.25 );
  vec3 mossC = mix( vec3( 0.026, 0.038, 0.011 ), vec3( 0.062, 0.078, 0.026 ), mB.b );
  diffuseColor.rgb = mix( diffuseColor.rgb, mossC, mossM );
  roughnessFactor = mix( roughnessFactor, 0.96, mossM );
  metalnessFactor *= 1.0 - mossM;
  // edge wear from curvature of the geometric normal
  float curv = clamp( length( fwidth( wxGeoN ) ) / max( length( fwidth( vWxPos ) ), 1e-4 ) * 0.06, 0.0, 1.0 );
  float edge = wxParams.w * smoothstep( 0.15, 0.7, curv ) * ( 0.5 + mB.g );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ( 1.3 + 0.9 * metalnessFactor ) + 0.012, edge * 0.6 );
  roughnessFactor = mix( roughnessFactor, roughnessFactor * 0.55, edge * metalnessFactor );
  // wetness (global), puddles in floor cavities
  float wetK = wxWet * wxParams2.z;
  float wet = wetK * ( 0.45 + 0.55 * max( wN.y, 0.0 ) ) * smoothstep( 0.2, 0.6, mB.g + 0.35 * max( up, 0.0 ) );
  float pud = wetK * smoothstep( 0.85, 0.95, up ) * smoothstep( 0.45, 0.65, cav + ( 0.5 - mA.b ) * 0.6 );
  wet = max( wet, pud );
  diffuseColor.rgb *= 1.0 - 0.42 * wet * ( 1.0 - metalnessFactor );
  roughnessFactor = mix( roughnessFactor, 0.07, wet * 0.85 );
  normal = normalize( mix( normal, nonPerturbedNormal, pud ) );
}
#endif
`;

const FRAG_EMISSIVE = /* glsl */ `
#ifdef USE_EMISSIVEMAP
  totalEmissiveRadiance *= texture2D( emissiveMap, vEmissiveMapUv ).a;
#endif
#ifdef WX_EMISSIVE
{
  float t = wxTime;
  vec3 p = vWxPos;
  float fl = texture2D( wxNoise, vec2( t * wxEmis.y * 0.061 + wxSeed * 0.13, t * wxEmis.y * 0.017 + dot( p, vec3( 0.021, 0.013, 0.017 ) ) ) ).g;
  float spatial = texture2D( wxNoise, vec2( dot( p.xz, vec2( 0.31, 0.27 ) ) + t * 0.02, p.y * 0.23 - t * 0.05 ) ).r;
  float pulse = sin( t * wxEmis.w + dot( p, vec3( 0.9, 1.4, 0.7 ) ) + spatial * 3.0 );
  totalEmissiveRadiance *= max( 0.0, 1.0 + wxEmis.x * ( fl - 0.5 ) * 2.4 + wxEmis.z * pulse );
}
#endif
`;

const FRAG_AO = /* glsl */ `
#ifdef USE_AOMAP
  float ambientOcclusion = ( wxOrm.r - 1.0 ) * aoMapIntensity + 1.0;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_CLEARCOAT )
    clearcoatSpecularIndirect *= ambientOcclusion;
  #endif
  #if defined( USE_SHEEN )
    sheenSpecularIndirect *= ambientOcclusion;
  #endif
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
  #endif
#endif
`;

function replaceChunk(src: string, name: string, code: string): string {
  const inc = `#include <${name}>`;
  if (!src.includes(inc)) throw new Error(`weathering: chunk ${name} not found`);
  return src.replace(inc, code);
}

/** The shared onBeforeCompile (one function object → one program-cache key for all variants). */
function wxOnBeforeCompile(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms): void {
  const ud = this.userData.wx as WxUserData;
  if (!WX_GLOBALS.wxNoise.value) WX_GLOBALS.wxNoise.value = getNoiseTexture();
  Object.assign(shader.uniforms, WX_GLOBALS, ud.uniforms);
  let v = shader.vertexShader;
  v = v.replace('#include <common>', `#include <common>\n${VERT_PARS}`);
  v = replaceChunk(v, 'worldpos_vertex', `#include <worldpos_vertex>\n${VERT_MAIN}`);
  shader.vertexShader = v;
  let f = shader.fragmentShader;
  f = f.replace('#include <common>', `#include <common>\n${FRAG_PARS}`);
  f = replaceChunk(f, 'map_fragment', FRAG_MAP);
  f = replaceChunk(f, 'roughnessmap_fragment', FRAG_ROUGH);
  f = replaceChunk(f, 'metalnessmap_fragment', FRAG_METAL);
  f = replaceChunk(f, 'normal_fragment_maps', FRAG_NORMAL);
  f = replaceChunk(f, 'emissivemap_fragment', FRAG_EMISSIVE);
  f = replaceChunk(f, 'aomap_fragment', FRAG_AO);
  shader.fragmentShader = f;
}

/** Install the extension on a standard/physical material. */
/** Built-in materials carry `defines` at runtime (e.g. STANDARD) even though the typings omit it. */
export function materialDefines(m: THREE.Material): Record<string, string> {
  const md = m as unknown as { defines?: Record<string, string> };
  if (!md.defines) md.defines = {};
  return md.defines;
}

export function applyWeathering(mat: THREE.MeshStandardMaterial, o: WeatherOpts): void {
  const defines: Record<string, string> = { ...materialDefines(mat) };
  delete defines.WX_TRIPLANAR; delete defines.WX_UVWORLD; delete defines.WX_WEATHER; delete defines.WX_EMISSIVE;
  if (o.mapping === 'triplanar') defines.WX_TRIPLANAR = '';
  if (o.mapping === 'uvWorld') defines.WX_UVWORLD = '';
  const weathered = o.grime + o.moss + o.streaks + o.edge + o.porosity + o.variation > 0;
  if (weathered) defines.WX_WEATHER = '';
  if (o.emissiveAnim) defines.WX_EMISSIVE = '';
  (mat as unknown as { defines: Record<string, string> }).defines = defines;
  const ud: WxUserData = {
    opts: o,
    uniforms: {
      wxParams: { value: new THREE.Vector4(o.grime, o.moss, o.streaks, o.edge) },
      wxParams2: { value: new THREE.Vector4(o.scale, o.seed, o.porosity, o.variation) },
      wxEmis: { value: new THREE.Vector4(...(o.emissiveAnim ?? [0, 0, 0, 0])) },
    },
  };
  mat.userData.wx = ud;
  mat.onBeforeCompile = wxOnBeforeCompile;
  mat.customProgramCacheKey = () => 'wx2';
  mat.needsUpdate = true;
}

/** True when a material carries the extension. */
export function isWeathered(m: THREE.Material): boolean {
  return !!(m.userData && m.userData.wx);
}

/** Clone a material and keep its weathering extension (Material.clone() drops onBeforeCompile). */
export function cloneWeathered<T extends THREE.Material>(m: T): T {
  const c = m.clone() as T;
  const ud = m.userData.wx as WxUserData | undefined;
  if (ud && (c as unknown as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    applyWeathering(c as unknown as THREE.MeshStandardMaterial, { ...ud.opts });
  }
  return c;
}

/** Change the per-material seed (used by variants to decorrelate tiling and colour variation). */
export function setWeatherSeed(m: THREE.Material, seed: number): void {
  const ud = m.userData.wx as WxUserData | undefined;
  if (ud) { ud.opts.seed = seed; ud.uniforms.wxParams2.value.y = seed; }
}
