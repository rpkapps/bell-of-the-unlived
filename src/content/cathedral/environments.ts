/**
 * Cathedral environment presets: the cold snow-light over the Pilgrim Stair, the candle-lit nave,
 * the Name-Ossuary beneath the parvis, and the choir where the Saint keeps her hundred names.
 * Each copies a base preset and overrides what differs (see src/render/environments.ts).
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base = (id: string): EnvDef => ({ ...ENVIRONMENTS[id] });

/**
 * Snow-light over the Stair: a high pale overcast, cold blue-grey haze that swallows the spires,
 * a low white sun from the south-west raking the steps, warm windows and candles as accents.
 */
registerEnvironment('cathedralStair', {
  ...base('ashbridgeDusk'),
  zenith: '#5d6b7c', horizon: '#b4bec8', ground: '#59616a',
  glow: '#f2ece0', glowStrength: 0.9, glowPower: 2.2,
  cloudColor: '#6c7784', cloudLit: '#d2d8de', cloudCover: 0.78, cloudOpacity: 0.9, cloudSpeed: 0.35,
  skyline: 0.9, skylineColor: '#5a6572', skylineWindows: 0.6,
  fogColor: '#8e9aa7', fogDensity: 0.0125, fogFalloff: 0.03, fogBase: 0, fogStart: 14,
  sunColor: '#e6ecf4', sunIntensity: 1.9, sunAzimuth: 200, sunElevation: 26,
  rimColor: '#c6d4e6', rimIntensity: 1.0,
  hemiSky: '#a9b6c6', hemiGround: '#5a544c', hemiIntensity: 3.0,
  ambient: '#56606e', ambientIntensity: 0.6,
  envIntensity: 1.05,
  exposure: 1.02, contrast: 1.08, saturation: 0.82, shadowTint: '#dfe9ff', highlightTint: '#fff6ea', vignette: 0.3,
  bloomStrength: 0.55, bloomRadius: 0.55, bloomThreshold: 0.95,
  wetness: 0.55, storm: 0,
});

/** Inside the nave: warm candle-field key, cold shafts from the clerestory, smoky depth. */
registerEnvironment('cathedralNave', {
  ...base('hospiceInterior'),
  zenith: '#241d18', horizon: '#5d4a38', ground: '#1a140f',
  glow: '#c0925c', glowStrength: 0.55, glowPower: 2,
  fogColor: '#3a2e25', fogDensity: 0.02, fogFalloff: 0.012, fogBase: 12, fogStart: 7,
  sunColor: '#c9d6ec', sunIntensity: 0.8, sunAzimuth: 160, sunElevation: 52,
  rimColor: '#ffcf94', rimIntensity: 0.7,
  hemiSky: '#8a6c50', hemiGround: '#231910', hemiIntensity: 2.3,
  ambient: '#3e2f22', ambientIntensity: 0.5,
  exposure: 1.2, contrast: 1.06, saturation: 0.95, shadowTint: '#eef0ff', highlightTint: '#ffe6c2', vignette: 0.42,
  bloomStrength: 0.8, bloomRadius: 0.62, bloomThreshold: 0.9,
});

/** The Name-Ossuary: low, close, bone-yellow candle haze. */
registerEnvironment('cathedralOssuary', {
  ...base('undercroft'),
  zenith: '#1b1611', horizon: '#403224', ground: '#14100c',
  glow: '#8a6a40', glowStrength: 0.45,
  fogColor: '#2a2118', fogDensity: 0.038, fogStart: 5,
  sunColor: '#ffc690', sunIntensity: 0.2,
  rimColor: '#e0b070', rimIntensity: 0.55,
  hemiSky: '#6a5238', hemiGround: '#1a130d', hemiIntensity: 2.4,
  ambient: '#33271b', ambientIntensity: 0.5,
  exposure: 1.32, saturation: 0.9, highlightTint: '#fff0d4', vignette: 0.48,
  bloomStrength: 0.75,
});

/** The processional cloister: open to the snowing sky, colder and brighter than the Stair. */
registerEnvironment('cathedralCloister', {
  ...base('arena'),
  zenith: '#56657a', horizon: '#aab4c0', ground: '#4f565e',
  glow: '#f4e6cc', glowStrength: 1.0, glowPower: 2.4,
  cloudColor: '#646f7c', cloudLit: '#d8dde2', cloudCover: 0.8, cloudOpacity: 0.9, cloudSpeed: 0.4,
  fogColor: '#8793a0', fogDensity: 0.01, fogFalloff: 0.04, fogStart: 12,
  sunColor: '#e8eef6', sunIntensity: 1.7, sunAzimuth: 215, sunElevation: 30,
  rimColor: '#ffe0b0', rimIntensity: 1.5,
  hemiSky: '#a4b0c0', hemiGround: '#4a443c', hemiIntensity: 2.6,
  ambient: '#505a66', ambientIntensity: 0.55,
  saturation: 0.85, wetness: 0.5,
});

/** The choir: gilt and cold gold, strong rim for combat readability against dark stone. */
registerEnvironment('cathedralChoir', {
  ...base('arena'),
  zenith: '#1e1a18', horizon: '#6a5840', ground: '#191512',
  glow: '#f0c070', glowStrength: 0.9, glowPower: 2.2,
  cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#3c3024', fogDensity: 0.016, fogFalloff: 0.01, fogBase: 12, fogStart: 9,
  sunColor: '#e8e0d0', sunIntensity: 1.0, sunAzimuth: 180, sunElevation: 58,
  rimColor: '#ffd49a', rimIntensity: 1.6,
  hemiSky: '#8a7254', hemiGround: '#221a12', hemiIntensity: 2.3,
  ambient: '#3c3024', ambientIntensity: 0.5,
  exposure: 1.12, contrast: 1.1, saturation: 0.95, shadowTint: '#eceeff', highlightTint: '#ffecc8', vignette: 0.4,
  bloomStrength: 0.8, bloomRadius: 0.6, bloomThreshold: 0.9,
  wetness: 0, storm: 0,
});
