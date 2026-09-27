/**
 * Environment presets for the Suspended Campus: a stormy sea-cliff dusk (cold slate sky, pale
 * break in the clouds over the sea, heavy low spray-fog), the cool glass-hall interiors, the
 * drowned theatre's green-grey half-light, and the Observatory at the top of the spire.
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base: EnvDef = ENVIRONMENTS.ashbridgeDusk;

/** Outdoors: storm over the sea at dusk. Low sun behind the clouds to the south-west. */
registerEnvironment('academyStorm', {
  ...base,
  zenith: '#27303b', horizon: '#8894a0', ground: '#2c343c',
  glow: '#dfe4e6', glowStrength: 0.9, glowPower: 2.1,
  cloudColor: '#262c34', cloudLit: '#9aa6b2', cloudCover: 0.78, cloudOpacity: 0.95, cloudSpeed: 1.6,
  skyline: 0, skylineColor: '#232a32', skylineWindows: 0,
  fogColor: '#66747f', fogDensity: 0.013, fogFalloff: 0.035, fogBase: -4, fogStart: 10,
  sunColor: '#c4d0dc', sunIntensity: 1.8, sunAzimuth: 200, sunElevation: 26,
  rimColor: '#b4c6d8', rimIntensity: 1.0,
  hemiSky: '#8a9aac', hemiGround: '#343a40', hemiIntensity: 3.0,
  ambient: '#3c4652', ambientIntensity: 0.56,
  exposure: 1.12, contrast: 1.1, saturation: 0.82, shadowTint: '#e2ecff', highlightTint: '#f6f4ee', vignette: 0.34,
  bloomStrength: 0.55, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.75, storm: 0.35,
});

/** Glass halls: cool daylight through glass, pale lens glints, short fog. */
registerEnvironment('academyGlassHall', {
  ...base,
  zenith: '#2e3640', horizon: '#6a7682', ground: '#23282e',
  glow: '#c8d6e0', glowStrength: 0.5, glowPower: 2,
  cloudColor: '#2a3038', cloudLit: '#8a96a2', cloudCover: 0.7, cloudOpacity: 0.9, cloudSpeed: 1.2,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#4a5560', fogDensity: 0.022, fogFalloff: 0.0, fogBase: 0, fogStart: 8,
  sunColor: '#d0dae6', sunIntensity: 1.2, sunAzimuth: 200, sunElevation: 32,
  rimColor: '#c0d0e0', rimIntensity: 0.9,
  hemiSky: '#8494a6', hemiGround: '#2a2e34', hemiIntensity: 2.7,
  ambient: '#3a4450', ambientIntensity: 0.58,
  exposure: 1.15, contrast: 1.06, saturation: 0.86, shadowTint: '#e6eeff', highlightTint: '#f4f6ff', vignette: 0.36,
  bloomStrength: 0.65, bloomRadius: 0.6, bloomThreshold: 0.9,
  wetness: 0.2, storm: 0,
});

/** The drowned theatre: green-grey sea light on one half, dry lamplight on the other. */
registerEnvironment('academyDrowned', {
  ...base,
  zenith: '#26302f', horizon: '#6c7a76', ground: '#24292a',
  glow: '#c4d4cc', glowStrength: 0.6, glowPower: 2.2,
  cloudColor: '#252b2c', cloudLit: '#8a9894', cloudCover: 0.82, cloudOpacity: 0.95, cloudSpeed: 1.4,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#51605c', fogDensity: 0.02, fogFalloff: 0.03, fogBase: 0, fogStart: 7,
  sunColor: '#bccdc8', sunIntensity: 1.4, sunAzimuth: 205, sunElevation: 30,
  rimColor: '#b0c8c0', rimIntensity: 0.95,
  hemiSky: '#809a94', hemiGround: '#2c302e', hemiIntensity: 2.8,
  ambient: '#374440', ambientIntensity: 0.56,
  exposure: 1.12, contrast: 1.08, saturation: 0.84, shadowTint: '#e2f2ee', highlightTint: '#f4f6ee', vignette: 0.38,
  bloomStrength: 0.55, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.85, storm: 0.2,
});

/** Tunnels and the lift well: dark rock, lantern key. */
registerEnvironment('academyTunnel', {
  ...ENVIRONMENTS.undercroft,
  fogColor: '#1a1e22', fogDensity: 0.04, hemiSky: '#4e5660', hemiGround: '#141618', ambient: '#262c32',
  sunColor: '#a8b8c8', sunIntensity: 0.25, rimColor: '#a0b8c8', exposure: 1.32, wetness: 0.6,
});

/** The Observatory: the storm breaking over the top of the cliff; strong rim for the duel. */
registerEnvironment('academyObservatory', {
  ...base,
  zenith: '#20262f', horizon: '#8a8e96', ground: '#262a30',
  glow: '#f2e0bc', glowStrength: 1.2, glowPower: 2.6,
  cloudColor: '#1f242b', cloudLit: '#b8b0a4', cloudCover: 0.7, cloudOpacity: 0.95, cloudSpeed: 2.2,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#58606a', fogDensity: 0.009, fogFalloff: 0.05, fogBase: 0, fogStart: 16,
  sunColor: '#d6d0c8', sunIntensity: 1.6, sunAzimuth: 215, sunElevation: 22,
  rimColor: '#ffe0b4', rimIntensity: 1.6,
  hemiSky: '#7c8494', hemiGround: '#2a2a2e', hemiIntensity: 2.3,
  ambient: '#363c48', ambientIntensity: 0.5,
  exposure: 1.02, contrast: 1.12, saturation: 0.86, shadowTint: '#e4ecff', highlightTint: '#fff2de', vignette: 0.38,
  bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.9,
  wetness: 0.55, storm: 0.6,
});
