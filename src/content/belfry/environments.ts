/**
 * Belfry environment presets.
 *  - belfryStorm:    the tower exterior — black storm, bruised violet-grey clouds, lightning, cold rim.
 *  - belfryChambers: gilded bell chambers inside the tower — warm candle gold against cold stone.
 *  - belfryDrowned:  the drowned lecture theatre — greener, wetter, stiller.
 *  - belfryCrown:    the Bell Crown under an eerie sky — a pale bronze glow behind the Great Bell.
 *  - belfryCell:     the Branding Cell — ember-lit rock, short smoky fog.
 *  - belfryAfter:    the Crown after Aldren falls — the storm thins, grey dawn light.
 */
import { ENVIRONMENTS, registerEnvironment, type EnvDef } from '../../render/environments';

const base = (): EnvDef => ({ ...ENVIRONMENTS.ashbridgeDusk });

registerEnvironment('belfryStorm', {
  ...base(),
  zenith: '#0d0f16', horizon: '#3a3a4a', ground: '#12131a',
  glow: '#8f8aa8', glowStrength: 0.7, glowPower: 2.6,
  cloudColor: '#14151c', cloudLit: '#6a6680', cloudCover: 0.88, cloudOpacity: 1, cloudSpeed: 2.4,
  skyline: 0.9, skylineColor: '#0e0f14', skylineWindows: 0.7,
  fogColor: '#2c2e3a', fogDensity: 0.012, fogFalloff: 0.03, fogBase: -20, fogStart: 14,
  sunColor: '#b4bede', sunIntensity: 1.6, sunAzimuth: 20, sunElevation: 32,
  rimColor: '#b8c4e4', rimIntensity: 1.3,
  hemiSky: '#6a6e88', hemiGround: '#221e1c', hemiIntensity: 2.6,
  ambient: '#30323f', ambientIntensity: 0.6,
  envIntensity: 0.8,
  exposure: 1.12, contrast: 1.14, saturation: 0.82, shadowTint: '#e0e6ff', highlightTint: '#fff2e2', vignette: 0.44,
  bloomStrength: 0.6, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.8, storm: 0.85,
});

registerEnvironment('belfryChambers', {
  ...base(),
  zenith: '#1d1812', horizon: '#4a3a28', ground: '#15110c',
  glow: '#b08850', glowStrength: 0.5, glowPower: 2,
  cloudColor: '#000000', cloudLit: '#000000', cloudCover: 0, cloudOpacity: 0, cloudSpeed: 0,
  skyline: 0, skylineColor: '#000000', skylineWindows: 0,
  fogColor: '#2a2118', fogDensity: 0.02, fogFalloff: 0.0, fogBase: 0, fogStart: 9,
  sunColor: '#b8c2e0', sunIntensity: 0.6, sunAzimuth: 20, sunElevation: 40,
  rimColor: '#ffcf92', rimIntensity: 0.9,
  hemiSky: '#a88460', hemiGround: '#2a1e14', hemiIntensity: 3.4,
  ambient: '#4a3826', ambientIntensity: 0.75,
  envIntensity: 1.1,
  exposure: 1.38, contrast: 1.07, saturation: 0.98, shadowTint: '#eee8ff', highlightTint: '#ffe8c6', vignette: 0.42,
  bloomStrength: 0.75, bloomRadius: 0.62, bloomThreshold: 0.9,
  wetness: 0.1, storm: 0,
});

registerEnvironment('belfryDrowned', {
  ...ENVIRONMENTS.belfryChambers,
  zenith: '#10171a', horizon: '#2c3a3a', ground: '#0e1414',
  glow: '#7aa098', glowStrength: 0.4,
  fogColor: '#1b2626', fogDensity: 0.03, fogStart: 6,
  hemiSky: '#56706a', hemiGround: '#101614', hemiIntensity: 2.2,
  ambient: '#22302e', ambientIntensity: 0.5,
  rimColor: '#bfe0d8', rimIntensity: 0.9,
  saturation: 0.85, highlightTint: '#f0fff6', wetness: 0.9,
});

registerEnvironment('belfryCrown', {
  ...base(),
  zenith: '#15131c', horizon: '#6e6150', ground: '#1e1a18',
  glow: '#e0b878', glowStrength: 1.45, glowPower: 2.2,
  cloudColor: '#1d1a22', cloudLit: '#b69468', cloudCover: 0.78, cloudOpacity: 0.95, cloudSpeed: 1.6,
  skyline: 0.6, skylineColor: '#121015', skylineWindows: 0.5,
  fogColor: '#3c3530', fogDensity: 0.008, fogFalloff: 0.035, fogBase: 0, fogStart: 16,
  sunColor: '#e6cfae', sunIntensity: 1.6, sunAzimuth: 330, sunElevation: 26,
  rimColor: '#ffd9a6', rimIntensity: 1.8,
  hemiSky: '#7c6e62', hemiGround: '#2a221e', hemiIntensity: 2.1,
  ambient: '#3a3230', ambientIntensity: 0.5,
  envIntensity: 0.9,
  exposure: 1.05, contrast: 1.12, saturation: 0.9, shadowTint: '#e8eaff', highlightTint: '#ffeed6', vignette: 0.42,
  bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.95,
  wetness: 0.4, storm: 0.35,
});

registerEnvironment('belfryCell', {
  ...ENVIRONMENTS.undercroft,
  zenith: '#1a100c', horizon: '#46261a', ground: '#140c09',
  glow: '#a0502a', glowStrength: 0.5,
  fogColor: '#231510', fogDensity: 0.04, fogStart: 5,
  sunColor: '#ff9a60', sunIntensity: 0.3,
  rimColor: '#ff9a60', rimIntensity: 0.7,
  hemiSky: '#6a3c28', hemiGround: '#140c08', hemiIntensity: 2.2,
  ambient: '#321c14', ambientIntensity: 0.45,
  bloomStrength: 0.8, bloomThreshold: 0.85,
});

registerEnvironment('belfryAfter', {
  ...ENVIRONMENTS.belfryCrown,
  zenith: '#3a4252', horizon: '#b8aa94', ground: '#3a3632',
  glow: '#f4e2c0', glowStrength: 1.2, glowPower: 1.8,
  cloudColor: '#4a4a52', cloudLit: '#e2cfae', cloudCover: 0.55, cloudSpeed: 0.6,
  fogColor: '#8a8478', fogDensity: 0.006,
  sunColor: '#f2e2c4', sunIntensity: 1.7, sunAzimuth: 110, sunElevation: 14,
  hemiSky: '#a8a4a0', hemiIntensity: 2.4,
  saturation: 0.8, storm: 0,
});
