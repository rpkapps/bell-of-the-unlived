/**
 * Siegeholm environment presets: a snowy siege dusk — cold blue-grey sky and snow light, a low
 * warm sun raking the west faces of the walls (as in the concept art), long fog that still lets
 * the Great Bell over the keep read from the Siege Road; warm torchlit interiors; the gate passage;
 * and the Bell Rampart under the bell's golden light.
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base = ENVIRONMENTS.ashbridgeDusk;
const d = (o: Partial<EnvDef>): EnvDef => ({ ...base, ...o });

const SNOW = d({
  zenith: '#33435a', horizon: '#a2aebc', ground: '#4c5462',
  glow: '#f2c898', glowStrength: 0.95, glowPower: 2.6,
  cloudColor: '#3c4654', cloudLit: '#d2bca6', cloudCover: 0.55, cloudOpacity: 0.82, cloudSpeed: 0.8,
  skyline: 0, skylineColor: '#2c3440', skylineWindows: 0,
  fogColor: '#8c98a8', fogDensity: 0.008, fogFalloff: 0.038, fogBase: 0, fogStart: 14,
  sunColor: '#ffd8ac', sunIntensity: 2.15, sunAzimuth: 262, sunElevation: 17,
  rimColor: '#bcd0e8', rimIntensity: 1.0,
  hemiSky: '#9cb0c8', hemiGround: '#6a6a70', hemiIntensity: 2.5,
  ambient: '#3e4858', ambientIntensity: 0.52,
  envIntensity: 1.0,
  exposure: 1.06, contrast: 1.08, saturation: 0.86, shadowTint: '#dce8ff', highlightTint: '#fff0dc', vignette: 0.3,
  bloomStrength: 0.5, bloomRadius: 0.55, bloomThreshold: 1.0,
  wetness: 0.12, storm: 0,
});

registerEnvironment('armySnow', SNOW);
/** The Siege Road: thinner fog so the Great Bell over the keep reads from the entry. */
registerEnvironment('armyRoad', { ...SNOW, fogDensity: 0.0065, fogFalloff: 0.042, fogStart: 18, glowStrength: 1.05 });
/** The keep yard: the bell's gold light mixes into the dusk. */
registerEnvironment('armyKeep', { ...SNOW, glow: '#f6c07a', glowStrength: 1.2, highlightTint: '#ffe8c8', rimColor: '#e8d0b0', fogColor: '#8a8c9a' });
/** Torchlit interiors (casemate, ossuary). */
registerEnvironment('armyInterior', d({
  ...ENVIRONMENTS.undercroft,
  fogColor: '#221b16', fogDensity: 0.04, fogStart: 5,
  sunColor: '#aebcd4', sunIntensity: 0.3, rimColor: '#e0a070', rimIntensity: 0.55,
  hemiSky: '#5a4a40', hemiGround: '#18130f', hemiIntensity: 2.3, ambient: '#2c2319', ambientIntensity: 0.46,
  exposure: 1.28,
}));
/** The Hall of the Last Feast: candles and fires; cold light through the high windows. */
registerEnvironment('armyHall', d({
  ...ENVIRONMENTS.hospiceInterior,
  fogColor: '#2a211b', fogDensity: 0.022, fogStart: 7,
  sunColor: '#b8c8e0', sunIntensity: 0.8, sunAzimuth: 262, sunElevation: 17,
  rimColor: '#ffc890', rimIntensity: 0.7,
  hemiSky: '#7a6450', hemiGround: '#221810', hemiIntensity: 2.3,
  exposure: 1.15,
}));
/** The Ram-Knight's passage: cold stone, two braziers, strong rim for combat readability. */
registerEnvironment('armyPassage', d({
  ...ENVIRONMENTS.undercroft,
  fogColor: '#2a2a30', fogDensity: 0.02, fogStart: 10,
  sunColor: '#c0cce0', sunIntensity: 0.55, sunAzimuth: 262, sunElevation: 30,
  rimColor: '#ffcf9c', rimIntensity: 1.5,
  hemiSky: '#6a6c7c', hemiGround: '#221e1c', hemiIntensity: 2.4, ambient: '#2e2c34', ambientIntensity: 0.5,
  exposure: 1.22, contrast: 1.1, vignette: 0.4,
}));
/** The Bell Rampart: dusk over the towers, the Great Bell's gold light from above. */
registerEnvironment('armyArena', d({
  ...ENVIRONMENTS.arena,
  zenith: '#26304a', horizon: '#9a8a86', ground: '#3a3a44',
  glow: '#f4b870', glowStrength: 1.35, glowPower: 3,
  fogColor: '#6c6c7c', fogDensity: 0.008, fogFalloff: 0.03, fogBase: 0, fogStart: 16,
  sunColor: '#ffd0a0', sunIntensity: 1.8, sunAzimuth: 262, sunElevation: 15,
  rimColor: '#ffd49c', rimIntensity: 1.7,
  hemiSky: '#8a8aa4', hemiGround: '#4a4440', hemiIntensity: 2.2,
  exposure: 1.02, contrast: 1.12, saturation: 0.92, highlightTint: '#ffe6c8', vignette: 0.36,
  wetness: 0.1, storm: 0,
}));

export const ARMY_ENVIRONMENTS = ['armySnow', 'armyRoad', 'armyKeep', 'armyInterior', 'armyHall', 'armyPassage', 'armyArena'] as const;
