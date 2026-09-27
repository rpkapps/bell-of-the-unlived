/**
 * Garden Court environment presets: an autumn evening with a low golden sun and warm haze in the
 * gardens; candle-lit servants' passages; the gilded state rooms; the bell terrace above the haze.
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base = ENVIRONMENTS.ashbridgeDusk;
const env = (o: Partial<EnvDef>): EnvDef => ({ ...base, ...o });

/** Autumn dusk, golden haze: the sun low in the south-west gilds the facade and the leaves. */
export const HOUSEHOLD_GARDEN = env({
  zenith: '#39414f', horizon: '#c7a57a', ground: '#4a4035',
  glow: '#ffd6a0', glowStrength: 1.15, glowPower: 2.1,
  cloudColor: '#4d4852', cloudLit: '#f2c38d', cloudCover: 0.48, cloudOpacity: 0.8, cloudSpeed: 0.35,
  skyline: 0.85, skylineColor: '#3b3a43', skylineWindows: 0.5,
  fogColor: '#b09676', fogDensity: 0.0075, fogFalloff: 0.03, fogBase: 0, fogStart: 22,
  sunColor: '#ffc47e', sunIntensity: 2.3, sunAzimuth: 305, sunElevation: 17,
  rimColor: '#ffdcae', rimIntensity: 1.0,
  hemiSky: '#b6a58d', hemiGround: '#3f3427', hemiIntensity: 2.7,
  ambient: '#4a4036', ambientIntensity: 0.5,
  envIntensity: 1.0,
  exposure: 1.06, contrast: 1.07, saturation: 1.04, shadowTint: '#dfe5ff', highlightTint: '#fff0d6', vignette: 0.3,
  bloomStrength: 0.55, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.12, storm: 0,
});

registerEnvironment('householdGarden', HOUSEHOLD_GARDEN);

/** Under the orangery glass: the same evening, softer and warmer, less fog. */
registerEnvironment('householdOrangery', env({
  ...HOUSEHOLD_GARDEN,
  fogDensity: 0.008, fogStart: 20, fogColor: '#b89c78',
  sunIntensity: 1.9, hemiIntensity: 2.9, ambientIntensity: 0.56, exposure: 1.1, saturation: 1.06,
}));

/** Servants' passages: narrow, low, candle-lit; warm near, black far. */
registerEnvironment('householdPassages', env({
  zenith: '#1b1510', horizon: '#3d2d1f', ground: '#15100c',
  glow: '#7a5634', glowStrength: 0.35, glowPower: 2,
  cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#231a13', fogDensity: 0.04, fogFalloff: 0, fogBase: 0, fogStart: 5,
  sunColor: '#ffb676', sunIntensity: 0.28, sunAzimuth: 305, sunElevation: 40,
  rimColor: '#ffc088', rimIntensity: 0.55,
  hemiSky: '#6a5040', hemiGround: '#1a130e', hemiIntensity: 2.3,
  ambient: '#2e2419', ambientIntensity: 0.45,
  envIntensity: 0.9,
  exposure: 1.32, contrast: 1.05, saturation: 0.98, shadowTint: '#efe6ff', highlightTint: '#ffeacc', vignette: 0.46,
  bloomStrength: 0.75, bloomRadius: 0.6, bloomThreshold: 0.9,
  wetness: 0, storm: 0,
}));

/** State rooms: gilt and candlelight with the evening falling through tall windows. */
registerEnvironment('householdThrone', env({
  zenith: '#2b2520', horizon: '#6a543c', ground: '#1f1913',
  glow: '#b58a58', glowStrength: 0.5, glowPower: 2,
  cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#3a2e23', fogDensity: 0.018, fogFalloff: 0, fogBase: 0, fogStart: 8,
  sunColor: '#ffcf96', sunIntensity: 0.85, sunAzimuth: 305, sunElevation: 22,
  rimColor: '#ffd4a0', rimIntensity: 0.7,
  hemiSky: '#9a8266', hemiGround: '#231b14', hemiIntensity: 2.6,
  ambient: '#43362a', ambientIntensity: 0.52,
  envIntensity: 1.0,
  exposure: 1.2, contrast: 1.05, saturation: 1.0, shadowTint: '#eee8ff', highlightTint: '#ffecd0', vignette: 0.4,
  bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.92,
  wetness: 0, storm: 0,
}));

/** The bell terrace: above the haze, the sun on the horizon, the bell's gold burning. */
registerEnvironment('householdTerrace', env({
  ...HOUSEHOLD_GARDEN,
  horizon: '#d9a870', glow: '#ffcf8a', glowStrength: 1.5, glowPower: 2.6,
  fogColor: '#b8946c', fogDensity: 0.009, fogFalloff: 0.05, fogBase: -6, fogStart: 24,
  sunIntensity: 2.1, sunElevation: 11, rimIntensity: 1.5, rimColor: '#ffd29a',
  contrast: 1.1, vignette: 0.36, bloomStrength: 0.62,
}));
