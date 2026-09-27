/**
 * Procedural texture generation.
 *
 * Every material texture set is generated on the GPU (render-to-texture, WebGL2 MRT):
 *   1. a family "generator" program writes linear albedo+alpha and height/roughness/metal/emissive
 *      into a half-float scratch target (seamless: all noise is periodic over the tile);
 *   2. a "finalize" program derives a tangent-space normal map from the height (Sobel), a cavity
 *      AO from local height, and writes three RGBA8 textures with mipmaps:
 *        map   (sRGB)  rgb albedo, a alpha
 *        normalMap     rgb tangent normal (OpenGL +Y), a height
 *        orm           r AO, g roughness, b metalness, a emissive mask
 *      `orm` plugs straight into three's aoMap/roughnessMap/metalnessMap (they read r/g/b).
 * Six programs are compiled in total (one per family + finalize); a full set of ~50 materials
 * costs a few milliseconds of GPU time on desktop hardware. Results are cached per material.
 *
 * `getNoiseTexture()` is a small CPU-generated tileable noise (DataTexture, no renderer needed)
 * shared by the runtime shaders (weathering, sky, fire, particles).
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Quality } from '../game/settings';
import type { HeraldryKind } from './heraldrySvg';
import { heraldryMaskCanvas } from './heraldry';
import { GLSL_COMMON, GLSL_GEN_HEADER, GLSL_FULLSCREEN_VERT } from './texgen/glslCommon';
import { GLSL_MASONRY } from './texgen/glslMasonry';
import { GLSL_WOOD } from './texgen/glslWood';
import { GLSL_METAL } from './texgen/glslMetal';
import { GLSL_ORGANIC } from './texgen/glslOrganic';
import { GLSL_GROUND, GLSL_SPECIAL } from './texgen/glslGround';

export type TexFamily = 'masonry' | 'wood' | 'metal' | 'organic' | 'ground' | 'special';
/** Size class: 'hero' surfaces get the most pixels (large, close architecture). */
export type TexSizeClass = 'hero' | 'std' | 'small';

export interface GenSpec {
  family: TexFamily;
  kind: number;
  /** Four sRGB colours (CSS hex), meaning defined per generator. */
  colors: [string, string, string, string];
  p0?: [number, number, number, number];
  p1?: [number, number, number, number];
  seed: number;
  size: TexSizeClass;
  /** Normal strength (1 = default). */
  normal: number;
  /** Cavity-AO strength (default 2). */
  ao?: number;
  /** Height / width of the texture (non-tiling decals such as banners). Default 1. */
  aspect?: number;
  /** Heraldic charge mask fed to the generator (banner, shield). */
  mask?: { kind: HeraldryKind; fill: number; cy: number };
}

export interface TexSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  orm: THREE.Texture;
  width: number;
  height: number;
  /** Owning render target (kept alive; dispose() frees GPU memory). */
  target: THREE.WebGLRenderTarget;
}

const FAMILY_SRC: Record<TexFamily, string> = {
  masonry: GLSL_MASONRY, wood: GLSL_WOOD, metal: GLSL_METAL, organic: GLSL_ORGANIC, ground: GLSL_GROUND, special: GLSL_SPECIAL,
};

const FINALIZE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tA;
uniform sampler2D tB;
uniform vec2 uTexel;
uniform vec2 uNormalK;
uniform float uAoStrength;
uniform float uAoRadius;
in vec2 vUv;
layout(location = 0) out vec4 oAlb;
layout(location = 1) out vec4 oNrm;
layout(location = 2) out vec4 oOrm;
float H(vec2 o) { return texture(tB, vUv + o * uTexel).r; }
void main() {
  vec4 a = texture(tA, vUv);
  vec4 b = texture(tB, vUv);
  float tl = H(vec2(-1.0, 1.0)), t = H(vec2(0.0, 1.0)), tr = H(vec2(1.0, 1.0));
  float l = H(vec2(-1.0, 0.0)), r = H(vec2(1.0, 0.0));
  float bl = H(vec2(-1.0, -1.0)), bb = H(vec2(0.0, -1.0)), br = H(vec2(1.0, -1.0));
  float dx = ((tr + 2.0 * r + br) - (tl + 2.0 * l + bl)) * 0.125;
  float dy = ((tl + 2.0 * t + tr) - (bl + 2.0 * bb + br)) * 0.125;
  vec3 n = normalize(vec3(-dx * uNormalK.x, -dy * uNormalK.y, 1.0));
  float avg = 0.0;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.7853982 + 0.3;
    avg += H(vec2(cos(ang), sin(ang)) * uAoRadius);
  }
  avg *= 0.125;
  float ao = clamp(1.0 - max(avg - b.r, 0.0) * uAoStrength, 0.0, 1.0);
  oAlb = vec4(a.rgb, a.a);
  oNrm = vec4(n * 0.5 + 0.5, b.r);
  oOrm = vec4(ao, b.g, b.b, b.a);
}
`;

/** Pixel size for a size class at a quality level. */
export function texSize(q: Quality, cls: TexSizeClass): number {
  const table: Record<Quality, Record<TexSizeClass, number>> = {
    low: { hero: 256, std: 256, small: 128 },
    medium: { hero: 512, std: 512, small: 256 },
    high: { hero: 1024, std: 512, small: 512 },
    ultra: { hero: 1024, std: 1024, small: 512 },
  };
  return table[q][cls];
}

const _white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
_white.needsUpdate = true;

/** GPU texture generator bound to one renderer. */
export class TextureGenerator {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;
  private readonly programs = new Map<TexFamily, THREE.RawShaderMaterial>();
  private readonly finalize: THREE.RawShaderMaterial;
  private readonly scratch = new Map<string, THREE.WebGLRenderTarget>();
  private readonly anisotropy: number;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(g);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.finalize = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: GLSL_FULLSCREEN_VERT,
      fragmentShader: FINALIZE_FRAG,
      uniforms: {
        tA: { value: null }, tB: { value: null }, uTexel: { value: new THREE.Vector2() },
        uNormalK: { value: new THREE.Vector2() }, uAoStrength: { value: 2 }, uAoRadius: { value: 4 },
      },
      depthTest: false, depthWrite: false,
    });
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  private program(f: TexFamily): THREE.RawShaderMaterial {
    let m = this.programs.get(f);
    if (!m) {
      m = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: GLSL_FULLSCREEN_VERT,
        fragmentShader: GLSL_COMMON + GLSL_GEN_HEADER + FAMILY_SRC[f],
        uniforms: {
          uKind: { value: 0 }, uSeed: { value: 0 },
          uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() },
          uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() },
          uP0: { value: new THREE.Vector4() }, uP1: { value: new THREE.Vector4() },
          uMask: { value: _white }, uHasMask: { value: 0 }, uAspect: { value: 1 },
        },
        depthTest: false, depthWrite: false,
      });
      m.name = `texgen:${f}`;
      this.programs.set(f, m);
    }
    return m;
  }

  private scratchTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const key = `${w}x${h}`;
    let rt = this.scratch.get(key);
    if (!rt) {
      rt = new THREE.WebGLRenderTarget(w, h, {
        count: 2, type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false,
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      });
      this.scratch.set(key, rt);
    }
    return rt;
  }

  /** Generate one texture set (synchronous GPU work). */
  generate(spec: GenSpec, baseSize: number, name: string): TexSet {
    const w = baseSize, h = Math.round(baseSize * (spec.aspect ?? 1));
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    r.autoClear = false;

    // --- pass 1: generator → scratch
    const prog = this.program(spec.family);
    const u = prog.uniforms;
    u.uKind.value = spec.kind;
    u.uSeed.value = spec.seed;
    (u.uC0.value as THREE.Color).set(spec.colors[0]);
    (u.uC1.value as THREE.Color).set(spec.colors[1]);
    (u.uC2.value as THREE.Color).set(spec.colors[2]);
    (u.uC3.value as THREE.Color).set(spec.colors[3]);
    (u.uP0.value as THREE.Vector4).fromArray(spec.p0 ?? [0, 0, 0, 0]);
    (u.uP1.value as THREE.Vector4).fromArray(spec.p1 ?? [0, 0, 0, 0]);
    u.uAspect.value = spec.aspect ?? 1;
    let maskTex: THREE.CanvasTexture | null = null;
    if (spec.mask) {
      const mc = heraldryMaskCanvas(spec.mask.kind, Math.min(1024, w), Math.min(1024, w) * (spec.aspect ?? 1), spec.mask.fill, spec.mask.cy);
      maskTex = new THREE.CanvasTexture(mc as HTMLCanvasElement);
      maskTex.colorSpace = THREE.NoColorSpace;
      u.uMask.value = maskTex;
      u.uHasMask.value = 1;
    } else {
      u.uMask.value = _white;
      u.uHasMask.value = 0;
    }
    const scratch = this.scratchTarget(w, h);
    this.quad.material = prog;
    r.setRenderTarget(scratch);
    r.render(this.scene, this.camera);

    // --- pass 2: finalize → RGBA8 MRT with mipmaps
    const target = new THREE.WebGLRenderTarget(w, h, {
      count: 3, depthBuffer: false, generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, anisotropy: this.anisotropy,
    });
    const [map, normalMap, orm] = target.textures;
    map.colorSpace = THREE.SRGBColorSpace;
    map.name = `${name}:map`; normalMap.name = `${name}:normal`; orm.name = `${name}:orm`;
    const fu = this.finalize.uniforms;
    fu.tA.value = scratch.textures[0];
    fu.tB.value = scratch.textures[1];
    (fu.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    // Normal strength is expressed per 512 px of texture so every resolution looks alike.
    const k = spec.normal * 0.028;
    (fu.uNormalK.value as THREE.Vector2).set(k * w, k * h);
    fu.uAoStrength.value = spec.ao ?? 2;
    fu.uAoRadius.value = 3 * (w / 512);
    this.quad.material = this.finalize;
    r.setRenderTarget(target);
    r.render(this.scene, this.camera);

    r.setRenderTarget(prevTarget);
    r.autoClear = prevAutoClear;
    if (maskTex) maskTex.dispose();
    return { map, normalMap, orm, width: w, height: h, target };
  }

  dispose(): void {
    this.programs.forEach((m) => m.dispose());
    this.finalize.dispose();
    this.scratch.forEach((t) => t.dispose());
    this.quad.geometry.dispose();
  }
}

// ---------------------------------------------------------------------------------------------
// CPU tileable noise (for runtime shaders). 256² RGBA8:
//   r = low-frequency fBm (4 cells), g = mid fBm (16), b = high fBm (64),
//   a = vertical streaks (fine across X, long along Y).
// ---------------------------------------------------------------------------------------------
let noiseTex: THREE.DataTexture | null = null;

function valueLayer(N: number, px: number, py: number, rng: Rng, out: Float32Array, amp: number): void {
  const lat = new Float32Array(px * py);
  for (let i = 0; i < lat.length; i++) lat[i] = rng.next();
  for (let y = 0; y < N; y++) {
    const fy = (y / N) * py, iy = Math.floor(fy), ty = fy - iy;
    const sy = ty * ty * (3 - 2 * ty);
    const y0 = (iy % py) * px, y1 = ((iy + 1) % py) * px;
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * px, ix = Math.floor(fx), tx = fx - ix;
      const sx = tx * tx * (3 - 2 * tx);
      const x0 = ix % px, x1 = (ix + 1) % px;
      const a = lat[y0 + x0], b = lat[y0 + x1], c = lat[y1 + x0], d = lat[y1 + x1];
      out[y * N + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
    }
  }
}

function fbmChannel(N: number, px: number, py: number, oct: number, seed: number): Float32Array {
  const out = new Float32Array(N * N);
  const rng = new Rng(seed);
  let amp = 0.5;
  for (let o = 0; o < oct; o++) {
    valueLayer(N, px << o, py << o, rng, out, amp);
    amp *= 0.5;
  }
  // normalise to [0,1]
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < out.length; i++) { lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); }
  const k = 1 / Math.max(1e-6, hi - lo);
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) * k;
  return out;
}

/** Shared tileable RGBA noise texture (256², mipmapped, repeat). Safe to call before the renderer exists. */
export function getNoiseTexture(): THREE.DataTexture {
  if (noiseTex) return noiseTex;
  const N = 256;
  const r = fbmChannel(N, 4, 4, 5, 11), g = fbmChannel(N, 16, 16, 4, 23), b = fbmChannel(N, 64, 64, 2, 37);
  const a = fbmChannel(N, 32, 2, 3, 51);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = r[i] * 255; data[i * 4 + 1] = g[i] * 255; data[i * 4 + 2] = b[i] * 255; data[i * 4 + 3] = a[i] * 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  t.name = 'render:noise';
  t.needsUpdate = true;
  noiseTex = t;
  return t;
}
