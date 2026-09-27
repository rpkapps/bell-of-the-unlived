/**
 * The Undervaults — environment presets. The market sits in a warm, hazy dusk (low sun behind the
 * vault tower, gilt light on the prosperous quay, cooler shadow on the famine quay); the vaults are
 * lamp-lit bronze and umber; the Vault of Futures is dark with a shaft of pale gold from the belfry.
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base = (): EnvDef => ({ ...ENVIRONMENTS.ashbridgeDusk });
const under = (): EnvDef => ({ ...ENVIRONMENTS.undercroft });

/** Canal market at dusk: amber horizon, a sun low over the tower, gold haze, light fog so the landmark reads. */
registerEnvironment('treasuryMarket', {
  ...base(),
  zenith: '#35394a', horizon: '#b08a6a', ground: '#3d352e',
  glow: '#f2c089', glowStrength: 1.15, glowPower: 2.6,
  cloudColor: '#3c3a42', cloudLit: '#d6a47a', cloudCover: 0.55, cloudOpacity: 0.8, cloudSpeed: 0.35,
  skyline: 0.9, skylineColor: '#2e2a2c', skylineWindows: 0.9,
  fogColor: '#7a6a5e', fogDensity: 0.0085, fogFalloff: 0.05, fogBase: -3, fogStart: 14,
  sunColor: '#ffcf9a', sunIntensity: 1.9, sunAzimuth: 200, sunElevation: 17,
  rimColor: '#ffd0a0', rimIntensity: 1.0,
  hemiSky: '#a39080', hemiGround: '#3a3029', hemiIntensity: 2.8,
  ambient: '#4a3f38', ambientIntensity: 0.52,
  envIntensity: 1.0,
  exposure: 1.08, contrast: 1.08, saturation: 0.95, shadowTint: '#e8e6ff', highlightTint: '#fff0da', vignette: 0.3,
  bloomStrength: 0.6, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.3, storm: 0,
});

/** Lamp-lit vaults: warm, bronze, short fog. */
registerEnvironment('treasuryVault', {
  ...under(),
  zenith: '#1c1611', horizon: '#46362a', ground: '#16110d',
  glow: '#7a5634', glowStrength: 0.45,
  fogColor: '#241a12', fogDensity: 0.038, fogStart: 5,
  sunColor: '#ffb57a', sunIntensity: 0.16, sunAzimuth: 170, sunElevation: 60,
  rimColor: '#e0a468', rimIntensity: 0.55,
  hemiSky: '#6a5040', hemiGround: '#1a130e', hemiIntensity: 2.4,
  ambient: '#33261b', ambientIntensity: 0.46,
  exposure: 1.3, contrast: 1.06, saturation: 1.0, highlightTint: '#ffeed6', vignette: 0.42,
  bloomStrength: 0.75, bloomThreshold: 0.88,
});

/** The Counting Deep: candlelit desks, colder stone between the lamps. */
registerEnvironment('treasuryDeep', {
  ...under(),
  zenith: '#17140f', horizon: '#3a3027', ground: '#120f0c',
  fogColor: '#1e1812', fogDensity: 0.03, fogStart: 6,
  sunColor: '#ffc080', sunIntensity: 0.12, sunAzimuth: 170, sunElevation: 65,
  rimColor: '#d8a070', rimIntensity: 0.6,
  hemiSky: '#5e4a3c', hemiGround: '#17120e', hemiIntensity: 2.3,
  ambient: '#2e241b', ambientIntensity: 0.44,
  exposure: 1.32, contrast: 1.05, saturation: 0.92, vignette: 0.45,
  bloomStrength: 0.8, bloomThreshold: 0.86,
});

/** Hall of Weights: tall interior, chandeliers, dusk light at the windows. */
registerEnvironment('treasuryHall', {
  ...ENVIRONMENTS.hospiceInterior,
  fogColor: '#2e241b', fogDensity: 0.02,
  sunColor: '#ffcf9a', sunIntensity: 0.45, sunAzimuth: 200, sunElevation: 17,
  hemiSky: '#8a6e52', hemiIntensity: 2.3,
  exposure: 1.2,
});

/** The Hoard: gold everywhere, hot braziers. */
registerEnvironment('treasuryHoard', {
  ...under(),
  zenith: '#1e160c', horizon: '#5a4020', ground: '#1a120a',
  glow: '#b07a30', glowStrength: 0.6,
  fogColor: '#2a1d10', fogDensity: 0.03, fogStart: 6,
  sunColor: '#ffc070', sunIntensity: 0.15, sunAzimuth: 170, sunElevation: 70,
  rimColor: '#ffc080', rimIntensity: 1.2,
  hemiSky: '#7a5a34', hemiGround: '#1c140c', hemiIntensity: 2.5,
  ambient: '#3a2a18', ambientIntensity: 0.5,
  exposure: 1.2, contrast: 1.1, saturation: 1.05, highlightTint: '#fff0d0', vignette: 0.4,
  bloomStrength: 0.85, bloomThreshold: 0.85,
});

/** Archive of Rejected Futures: cold parchment light, candles, a faint gold from the tally of bells. */
registerEnvironment('treasuryArchive', {
  ...under(),
  zenith: '#15161a', horizon: '#34343a', ground: '#101114',
  fogColor: '#1a1a1e', fogDensity: 0.03, fogStart: 5,
  sunColor: '#c8d4e8', sunIntensity: 0.1, sunAzimuth: 170, sunElevation: 70,
  rimColor: '#e8d8b8', rimIntensity: 0.6,
  hemiSky: '#56555c', hemiGround: '#141416', hemiIntensity: 2.2,
  ambient: '#26262c', ambientIntensity: 0.46,
  exposure: 1.28, contrast: 1.06, saturation: 0.82, shadowTint: '#e6ecff', highlightTint: '#fff4e4', vignette: 0.5,
  bloomStrength: 0.7, bloomThreshold: 0.9,
});

/** The Vault of Futures: dark stone, braziers at the coffers, pale gold falling from the belfry. */
registerEnvironment('treasuryArena', {
  ...ENVIRONMENTS.arena,
  zenith: '#2a2830', horizon: '#6e5a4c', ground: '#1e1a18',
  glow: '#f0b070', glowStrength: 0.9,
  skyline: 0, skylineWindows: 0,
  fogColor: '#2c241e', fogDensity: 0.02, fogFalloff: 0.02, fogBase: -3, fogStart: 10,
  sunColor: '#ffd8a0', sunIntensity: 1.1, sunAzimuth: 200, sunElevation: 72,
  rimColor: '#ffcf9c', rimIntensity: 1.6,
  hemiSky: '#6a5a50', hemiGround: '#1c1814', hemiIntensity: 2.0,
  ambient: '#302824', ambientIntensity: 0.5,
  exposure: 1.15, contrast: 1.12, saturation: 0.95, vignette: 0.42,
  bloomStrength: 0.7, bloomThreshold: 0.92,
});
