/**
 * Environment presets: sky, fog, lights, reflections and grade for each place/time of the game.
 * All colours sRGB hex; the renderer converts to linear and blends numerically between presets.
 */
import * as THREE from 'three';
import type { EnvironmentPreset } from './contract';

export interface EnvDef {
  // sky
  zenith: string; horizon: string; ground: string;
  glow: string; glowStrength: number; glowPower: number;
  cloudColor: string; cloudLit: string; cloudCover: number; cloudOpacity: number; cloudSpeed: number;
  skyline: number; skylineColor: string; skylineWindows: number;
  // fog (height fog; colour also tints the horizon)
  fogColor: string; fogDensity: number; fogFalloff: number; fogBase: number; fogStart: number;
  // key light (shadow caster) — azimuth measured from +Z toward +X (degrees), elevation above horizon
  sunColor: string; sunIntensity: number; sunAzimuth: number; sunElevation: number;
  // camera-relative rim light (readability), hemisphere + ambient fill
  rimColor: string; rimIntensity: number;
  hemiSky: string; hemiGround: string; hemiIntensity: number;
  ambient: string; ambientIntensity: number;
  envIntensity: number;
  // grade
  exposure: number; contrast: number; saturation: number;
  shadowTint: string; highlightTint: string; vignette: number;
  bloomStrength: number; bloomRadius: number; bloomThreshold: number;
  wetness: number;
  /** 0..1 lightning frequency. */
  storm: number;
}

export const ENVIRONMENTS: Record<EnvironmentPreset, EnvDef> = {
  // Ashbridge at dusk: pale overcast glow low on the horizon, cold blue-grey fog, distant spires,
  // warm windows and fires (point lights / emissives) against a cool moonlit key.
  ashbridgeDusk: {
    zenith: '#34404f', horizon: '#8b97a3', ground: '#39424c',
    glow: '#e2dccd', glowStrength: 0.9, glowPower: 2.2,
    cloudColor: '#343d48', cloudLit: '#9ba5b0', cloudCover: 0.6, cloudOpacity: 0.85, cloudSpeed: 0.5,
    skyline: 1, skylineColor: '#232b35', skylineWindows: 1,
    fogColor: '#5b6977', fogDensity: 0.016, fogFalloff: 0.045, fogBase: 0, fogStart: 7,
    sunColor: '#b7c6de', sunIntensity: 1.7, sunAzimuth: 215, sunElevation: 34,
    rimColor: '#a8bbd4', rimIntensity: 0.9,
    hemiSky: '#8898ad', hemiGround: '#3b3530', hemiIntensity: 0.85,
    ambient: '#3c4452', ambientIntensity: 0.18,
    envIntensity: 0.85,
    exposure: 1.0, contrast: 1.08, saturation: 0.9, shadowTint: '#e6f0ff', highlightTint: '#fff3e2', vignette: 0.32,
    bloomStrength: 0.5, bloomRadius: 0.55, bloomThreshold: 1.0,
    wetness: 0.55, storm: 0,
  },
  // Undercroft: dark, warm torch key, short fog.
  undercroft: {
    zenith: '#0c0a09', horizon: '#1d1813', ground: '#0b0908',
    glow: '#4a3220', glowStrength: 0.25, glowPower: 2,
    cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
    skyline: 0, skylineColor: '#000000', skylineWindows: 0,
    fogColor: '#1d1712', fogDensity: 0.045, fogFalloff: 0.0, fogBase: 0, fogStart: 4,
    sunColor: '#ffb070', sunIntensity: 0.22, sunAzimuth: 160, sunElevation: 55,
    rimColor: '#d09060', rimIntensity: 0.45,
    hemiSky: '#57443a', hemiGround: '#171210', hemiIntensity: 0.55,
    ambient: '#2c2219', ambientIntensity: 0.14,
    envIntensity: 0.4,
    exposure: 1.3, contrast: 1.05, saturation: 0.95, shadowTint: '#f0e8ff', highlightTint: '#fff0dc', vignette: 0.45,
    bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.9,
    wetness: 0.3, storm: 0,
  },
  // Hospice: warm candlelight interior, cool light through the windows.
  hospiceInterior: {
    zenith: '#17120e', horizon: '#3b2d22', ground: '#120d0a',
    glow: '#7a5a3a', glowStrength: 0.35, glowPower: 2,
    cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
    skyline: 0, skylineColor: '#000000', skylineWindows: 0,
    fogColor: '#2b2119', fogDensity: 0.025, fogFalloff: 0.0, fogBase: 0, fogStart: 5,
    sunColor: '#c8d4e8', sunIntensity: 0.55, sunAzimuth: 200, sunElevation: 38,
    rimColor: '#ffc890', rimIntensity: 0.5,
    hemiSky: '#8a6a4e', hemiGround: '#20160f', hemiIntensity: 0.65,
    ambient: '#3a2a1e', ambientIntensity: 0.16,
    envIntensity: 0.55,
    exposure: 1.18, contrast: 1.03, saturation: 1.0, shadowTint: '#f2eeff', highlightTint: '#ffe9cc', vignette: 0.4,
    bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.95,
    wetness: 0, storm: 0,
  },
  // Boss arena at dusk: low orange sun on the horizon, strong rim for combat readability.
  arena: {
    zenith: '#232839', horizon: '#80706b', ground: '#2c2a2e',
    glow: '#f0a868', glowStrength: 1.3, glowPower: 3,
    cloudColor: '#2c2a34', cloudLit: '#d49c74', cloudCover: 0.5, cloudOpacity: 0.85, cloudSpeed: 0.7,
    skyline: 0.9, skylineColor: '#1d1f28', skylineWindows: 0.4,
    fogColor: '#4d4c5a', fogDensity: 0.011, fogFalloff: 0.06, fogBase: 0, fogStart: 12,
    sunColor: '#cdbcc9', sunIntensity: 1.5, sunAzimuth: 250, sunElevation: 20,
    rimColor: '#ffcf9c', rimIntensity: 1.7,
    hemiSky: '#7a7890', hemiGround: '#2a2426', hemiIntensity: 0.8,
    ambient: '#383444', ambientIntensity: 0.16,
    envIntensity: 0.9,
    exposure: 1.0, contrast: 1.1, saturation: 0.95, shadowTint: '#e4ecff', highlightTint: '#ffeedd', vignette: 0.38,
    bloomStrength: 0.6, bloomRadius: 0.55, bloomThreshold: 1.0,
    wetness: 0.2, storm: 0,
  },
  // Battlefield memory: vast, eerie golden-grey haze.
  battlefield: {
    zenith: '#5e5c55', horizon: '#b3a585', ground: '#5d5646',
    glow: '#ecd6a2', glowStrength: 1.3, glowPower: 1.8,
    cloudColor: '#6a6452', cloudLit: '#cabb92', cloudCover: 0.72, cloudOpacity: 0.8, cloudSpeed: 0.35,
    skyline: 0.75, skylineColor: '#5a5446', skylineWindows: 0,
    fogColor: '#9c9178', fogDensity: 0.012, fogFalloff: 0.015, fogBase: 0, fogStart: 8,
    sunColor: '#e8d4a2', sunIntensity: 1.25, sunAzimuth: 120, sunElevation: 22,
    rimColor: '#ecca90', rimIntensity: 0.95,
    hemiSky: '#b3a784', hemiGround: '#3b3529', hemiIntensity: 0.95,
    ambient: '#4e4838', ambientIntensity: 0.18,
    envIntensity: 1.0,
    exposure: 0.95, contrast: 1.02, saturation: 0.78, shadowTint: '#f4f0ea', highlightTint: '#fff2d6', vignette: 0.36,
    bloomStrength: 0.5, bloomRadius: 0.6, bloomThreshold: 1.0,
    wetness: 0, storm: 0,
  },
  // Title: dramatic storm over the kingdom.
  title: {
    zenith: '#0f1115', horizon: '#3b3f47', ground: '#16181c',
    glow: '#8e9aac', glowStrength: 0.8, glowPower: 2.5,
    cloudColor: '#15171b', cloudLit: '#6d737d', cloudCover: 0.85, cloudOpacity: 1, cloudSpeed: 2.0,
    skyline: 1, skylineColor: '#111317', skylineWindows: 0.6,
    fogColor: '#272b31', fogDensity: 0.02, fogFalloff: 0.04, fogBase: 0, fogStart: 10,
    sunColor: '#9ca9c2', sunIntensity: 1.1, sunAzimuth: 30, sunElevation: 35,
    rimColor: '#aebbd2', rimIntensity: 1.2,
    hemiSky: '#4c5462', hemiGround: '#16161a', hemiIntensity: 0.6,
    ambient: '#262a32', ambientIntensity: 0.14,
    envIntensity: 0.7,
    exposure: 1.05, contrast: 1.15, saturation: 0.8, shadowTint: '#e2eaff', highlightTint: '#fff4e6', vignette: 0.5,
    bloomStrength: 0.65, bloomRadius: 0.6, bloomThreshold: 1.0,
    wetness: 0.7, storm: 1,
  },
};

/** Numeric (linear) form used for blending. */
export interface EnvState {
  zenith: THREE.Color; horizon: THREE.Color; ground: THREE.Color; glow: THREE.Color;
  glowStrength: number; glowPower: number;
  cloudColor: THREE.Color; cloudLit: THREE.Color; cloudCover: number; cloudOpacity: number; cloudSpeed: number;
  skyline: number; skylineColor: THREE.Color; skylineWindows: number;
  fogColor: THREE.Color; fogDensity: number; fogFalloff: number; fogBase: number; fogStart: number;
  sunColor: THREE.Color; sunIntensity: number; sunDir: THREE.Vector3;
  rimColor: THREE.Color; rimIntensity: number;
  hemiSky: THREE.Color; hemiGround: THREE.Color; hemiIntensity: number;
  ambient: THREE.Color; ambientIntensity: number;
  envIntensity: number;
  exposure: number; contrast: number; saturation: number;
  shadowTint: THREE.Color; highlightTint: THREE.Color; vignette: number;
  bloomStrength: number; bloomRadius: number; bloomThreshold: number;
  wetness: number; storm: number;
}

/** Direction the light TRAVELS (from the sun toward the scene). */
export function sunDirection(azimuthDeg: number, elevationDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg), el = THREE.MathUtils.degToRad(elevationDeg);
  // position of the sun on the unit sphere; light travels the opposite way
  out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).negate();
  return out;
}

export function envStateFrom(d: EnvDef): EnvState {
  const c = (h: string) => new THREE.Color(h);
  return {
    zenith: c(d.zenith), horizon: c(d.horizon), ground: c(d.ground), glow: c(d.glow),
    glowStrength: d.glowStrength, glowPower: d.glowPower,
    cloudColor: c(d.cloudColor), cloudLit: c(d.cloudLit), cloudCover: d.cloudCover, cloudOpacity: d.cloudOpacity, cloudSpeed: d.cloudSpeed,
    skyline: d.skyline, skylineColor: c(d.skylineColor), skylineWindows: d.skylineWindows,
    fogColor: c(d.fogColor), fogDensity: d.fogDensity, fogFalloff: d.fogFalloff, fogBase: d.fogBase, fogStart: d.fogStart,
    sunColor: c(d.sunColor), sunIntensity: d.sunIntensity, sunDir: sunDirection(d.sunAzimuth, d.sunElevation),
    rimColor: c(d.rimColor), rimIntensity: d.rimIntensity,
    hemiSky: c(d.hemiSky), hemiGround: c(d.hemiGround), hemiIntensity: d.hemiIntensity,
    ambient: c(d.ambient), ambientIntensity: d.ambientIntensity,
    envIntensity: d.envIntensity,
    exposure: d.exposure, contrast: d.contrast, saturation: d.saturation,
    shadowTint: c(d.shadowTint), highlightTint: c(d.highlightTint), vignette: d.vignette,
    bloomStrength: d.bloomStrength, bloomRadius: d.bloomRadius, bloomThreshold: d.bloomThreshold,
    wetness: d.wetness, storm: d.storm,
  };
}

export function cloneEnv(s: EnvState): EnvState {
  const o = { ...s } as EnvState;
  for (const k of Object.keys(s) as (keyof EnvState)[]) {
    const v = s[k] as unknown;
    if (v instanceof THREE.Color || v instanceof THREE.Vector3) (o as unknown as Record<string, unknown>)[k] = v.clone();
  }
  return o;
}

/** out = lerp(a, b, t) for every field (sun direction slerped via normalised lerp). */
export function lerpEnv(out: EnvState, a: EnvState, b: EnvState, t: number): EnvState {
  const o = out as unknown as Record<string, unknown>;
  const A = a as unknown as Record<string, unknown>, B = b as unknown as Record<string, unknown>;
  for (const k of Object.keys(A)) {
    const va = A[k], vb = B[k];
    if (typeof va === 'number') o[k] = va + ((vb as number) - va) * t;
    else if (va instanceof THREE.Color) (o[k] as THREE.Color).copy(va).lerp(vb as THREE.Color, t);
    else if (va instanceof THREE.Vector3) (o[k] as THREE.Vector3).copy(va).lerp(vb as THREE.Vector3, t).normalize();
  }
  return out;
}
