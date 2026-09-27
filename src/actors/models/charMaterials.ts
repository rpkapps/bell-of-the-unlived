/**
 * Per-character material library.
 *
 * Every character clones the shared render materials it uses (getMaterial) once, so it can carry
 * per-instance uniforms for hit flash, status rim glow, the Unlived dissolve (noise discard with a
 * glowing gold edge) and the spectral "ghost" look — all injected with onBeforeCompile. The patch
 * chains any onBeforeCompile the render module installed and extends its program cache key, so
 * all characters still share one shader program per base material.
 *
 * Material keys are strings: `<MaterialId>[|option…]`
 *   t=RRGGBB   multiply the base colour (tint; keeps textures)
 *   c=RRGGBB   replace the base colour
 *   ds         double-sided
 *   po         polygon offset (decals lying on another surface)
 *   a=arms|arms2|army|emb|bell|cath   alpha-tested decal mask (see textures.ts); ar=N repeats along U
 *   tat=seed:depth:holes          tattered-hem alpha mask (cloth sims)
 *   r=0.5 / m=0.8                 roughness / metalness override
 *   e=RRGGBB, ei=2                emissive colour and intensity
 */
import * as THREE from 'three';
import { getMaterial, cloneMaterial } from '../../render/materials';
import type { MaterialId } from '../../render/materialIds';
import { armyInsigniaMask, bellMask, cathedralMask, embroideryMask, royalArmsMask, tatterMask } from './textures';

/** Shared uniform block of one character (all its cloned materials reference the same objects). */
export interface FxUniforms {
  uBotuFlash: { value: number };
  uBotuDissolve: { value: number };
  uBotuRim: { value: THREE.Color };
  uBotuPulse: { value: number };
  uBotuTime: { value: number };
  uBotuHeight: { value: number };
  uBotuEdge: { value: THREE.Color };
  uBotuGhostColor: { value: THREE.Color };
  uBotuGhostMin: { value: number };
}

export function makeFxUniforms(height: number): FxUniforms {
  return {
    uBotuFlash: { value: 0 },
    uBotuDissolve: { value: 0 },
    uBotuRim: { value: new THREE.Color(0, 0, 0) },
    uBotuPulse: { value: 0 },
    uBotuTime: { value: 0 },
    uBotuHeight: { value: height },
    uBotuEdge: { value: new THREE.Color(3.2, 2.1, 0.7) },
    uBotuGhostColor: { value: new THREE.Color(0.55, 0.62, 0.7) },
    uBotuGhostMin: { value: 0.12 },
  };
}

const VERT_HEAD = /* glsl */ `
varying vec3 vBotuPos;
`;
const FRAG_HEAD = /* glsl */ `
varying vec3 vBotuPos;
uniform float uBotuFlash;
uniform float uBotuDissolve;
uniform vec3 uBotuRim;
uniform float uBotuPulse;
uniform float uBotuTime;
uniform float uBotuHeight;
uniform vec3 uBotuEdge;
uniform vec3 uBotuGhostColor;
uniform float uBotuGhostMin;
float botuHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float botuNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(botuHash(i), botuHash(i + vec3(1,0,0)), f.x), mix(botuHash(i + vec3(0,1,0)), botuHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(botuHash(i + vec3(0,0,1)), botuHash(i + vec3(1,0,1)), f.x), mix(botuHash(i + vec3(0,1,1)), botuHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;
const FRAG_DISSOLVE = /* glsl */ `
float botuEdge = 0.0;
if (uBotuDissolve > 0.0) {
  float bn = botuNoise(vBotuPos * 9.0) * 0.6 + botuNoise(vBotuPos * 27.0) * 0.4;
  float bh = clamp(vBotuPos.y / uBotuHeight, 0.0, 1.0);
  // crumbles from the head down, broken up by noise
  float bf = bn * 0.62 + (1.0 - bh) * 0.38;
  float bt = uBotuDissolve * 1.12 - 0.04;
  if (bf < bt) discard;
  botuEdge = 1.0 - smoothstep(0.0, 0.07, bf - bt);
}
`;
const FRAG_EMISSIVE = /* glsl */ `
{
  vec3 bV = normalize(vViewPosition);
  float bF = 1.0 - abs(dot(normalize(normal), bV));
  float bR = bF * bF;
  totalEmissiveRadiance += uBotuFlash * vec3(1.0, 0.88, 0.7) * (0.3 + 2.2 * bR);
  float bP = uBotuPulse > 0.0 ? 0.75 + 0.25 * sin(uBotuTime * uBotuPulse + vBotuPos.y * 14.0) : 1.0;
  totalEmissiveRadiance += uBotuRim * (bR * 1.8 + 0.06) * bP;
  totalEmissiveRadiance += uBotuEdge * botuEdge;
#ifdef BOTU_GHOST
  diffuseColor.a *= mix(uBotuGhostMin, 1.0, bR * bR);
  totalEmissiveRadiance += uBotuGhostColor * (0.1 + bR * 1.6) * (0.85 + 0.15 * sin(uBotuTime * 2.0 + vBotuPos.y * 9.0));
#endif
}
`;

/** Install the FX patch on a (cloned) material. Safe on materials without the expected chunks. */
export function patchFx(mat: THREE.Material, U: FxUniforms, ghost: boolean) {
  const prev = mat.onBeforeCompile;
  // The default cache key is onBeforeCompile.toString(): capture it BEFORE replacing the hook so
  // different base patches never collide; custom key functions are chained live.
  const prevFn = mat.customProgramCacheKey;
  const prevStr = mat.customProgramCacheKey();
  const prevKey = prevFn === THREE.Material.prototype.customProgramCacheKey ? () => prevStr : () => prevFn.call(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    const fs = shader.fragmentShader;
    // Anchors the render module's weathering patch leaves intact (it rewrites emissivemap/aomap).
    if (!fs.includes('#include <lights_fragment_begin>') || !fs.includes('#include <clipping_planes_fragment>')) return;
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBotuPos = position;');
    shader.fragmentShader = (ghost ? '#define BOTU_GHOST\n' : '') + fs
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_DISSOLVE)
      .replace('#include <lights_fragment_begin>', FRAG_EMISSIVE + '\n#include <lights_fragment_begin>');
  };
  mat.customProgramCacheKey = () => prevKey() + (ghost ? '|botu-ghost' : '|botu');
  if (ghost) {
    mat.transparent = true;
    mat.depthWrite = true;
  }
}

function alphaFor(name: string, rep: number): THREE.Texture | null {
  let t: THREE.Texture | null = null;
  switch (name) {
    case 'arms': t = royalArmsMask(0.22); break;
    case 'arms2': t = royalArmsMask(0.34); break;
    case 'army': t = armyInsigniaMask(0.32); break;
    case 'emb': t = embroideryMask(); break;
    case 'bell': t = bellMask(); break;
    case 'cath': t = cathedralMask(); break;
  }
  if (t && rep !== 1) {
    // own transform per repeat count (the base texture stays shared)
    const c = t.clone();
    c.repeat.set(rep, 1);
    c.wrapS = THREE.RepeatWrapping;
    c.needsUpdate = true;
    return c;
  }
  return t;
}

/** Create a (non-patched) material from a key. Also used by weapons (shared, cached). */
export function materialFromKey(key: string): THREE.Material {
  const [id, ...opts] = key.split('|');
  const base = getMaterial(id as MaterialId);
  // cloneMaterial keeps the render module's weathering extension (plain clone() drops it)
  const m = cloneMaterial(base);
  m.name = key;
  const std = m as THREE.MeshStandardMaterial;
  let alphaName = '', rep = 1;
  for (const o of opts) {
    const [k, v] = o.split('=');
    switch (k) {
      case 't': if (std.color) std.color.multiply(new THREE.Color(parseInt(v, 16))); break;
      case 'c': if (std.color) std.color.set(parseInt(v, 16)); break;
      case 'ds': m.side = THREE.DoubleSide; break;
      case 'po': m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; break;
      case 'a': alphaName = v; break;
      case 'ar': rep = parseFloat(v); break;
      case 'tat': {
        const [s, d, h] = v.split(':').map(Number);
        std.alphaMap = tatterMask(s, d, h);
        m.alphaTest = 0.5;
        break;
      }
      case 'r': if ('roughness' in std) std.roughness = parseFloat(v); break;
      case 'm': if ('metalness' in std) std.metalness = parseFloat(v); break;
      case 'e': if (std.emissive) std.emissive.set(parseInt(v, 16)); break;
      case 'ei': if ('emissiveIntensity' in std) std.emissiveIntensity = parseFloat(v); break;
    }
  }
  if (alphaName) {
    const t = alphaFor(alphaName, rep);
    if (t) { std.alphaMap = t; m.alphaTest = 0.5; }
  }
  if (m.alphaTest > 0) m.needsUpdate = true;
  return m;
}

/** Per-character library: one patched clone per key. */
export class MatLib {
  private readonly map = new Map<string, THREE.Material>();
  constructor(readonly U: FxUniforms, readonly ghost: boolean) {}
  get(key: string): THREE.Material {
    let m = this.map.get(key);
    if (!m) {
      m = materialFromKey(key);
      patchFx(m, this.U, this.ghost);
      this.map.set(key, m);
    }
    return m;
  }
  all(): THREE.Material[] { return [...this.map.values()]; }
  dispose() {
    for (const m of this.map.values()) {
      const a = (m as THREE.MeshStandardMaterial).alphaMap;
      // repeat clones are ours; masks from the texture cache are shared
      if (a && a.name && a.repeat.x !== 1) a.dispose();
      m.dispose();
    }
    this.map.clear();
  }
}

/** Shared (unpatched) materials for weapons, cached by key. */
const weaponCache = new Map<string, THREE.Material>();
export function weaponMaterial(key: string): THREE.Material {
  let m = weaponCache.get(key);
  if (!m) {
    m = key.includes('|') ? materialFromKey(key) : getMaterial(key as MaterialId);
    weaponCache.set(key, m);
  }
  return m;
}
