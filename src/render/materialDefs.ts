/**
 * Look definitions for every MaterialId: which procedural generator makes its textures, how the
 * textures are mapped (world triplanar for architecture, derivative-scaled grain-aligned UVs for
 * timber, plain UVs for characters/props), and the weathering it receives.
 *
 * Colours are sRGB hex. Architecture scale = metres per texture tile.
 */
import type { MaterialId } from './materialIds';
import type { GenSpec } from './textures';
import { MASONRY_KINDS as MK } from './texgen/glslMasonry';
import { WOOD_KINDS as WK } from './texgen/glslWood';
import { METAL_KINDS as TK } from './texgen/glslMetal';
import { ORGANIC_KINDS as OK } from './texgen/glslOrganic';
import { GROUND_KINDS as GK, SPECIAL_KINDS as SK } from './texgen/glslGround';

export type Mapping = 'triplanar' | 'uvWorld' | 'uv';

export interface MatDef {
  gen?: GenSpec;
  mapping: Mapping;
  /** Metres per texture tile (triplanar / uvWorld); UV materials use it as UV repeat divisor. */
  scale: number;
  /** [grime toward ground, moss on top faces, vertical streaks, edge wear]; omitted = no extension. */
  weather?: [number, number, number, number];
  /** How much global wetness darkens/glosses the surface (0..1). */
  porosity?: number;
  /** Large-scale colour variation strength (default 1 for architecture). */
  variation?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  envMapIntensity?: number;
  emissive?: { color: string; intensity: number; anim?: [flicker: number, flickerSpeed: number, pulse: number, pulseSpeed: number] };
  transparent?: boolean;
  opacity?: number;
  doubleSided?: boolean;
  alphaTest?: number;
  /** Shader-only materials built by hand in materials.ts. */
  special?: 'fire' | 'fogVeil';
}

const g = (family: GenSpec['family'], kind: number, colors: GenSpec['colors'], p0: GenSpec['p0'], p1: GenSpec['p1'], seed: number,
  size: GenSpec['size'] = 'std', normal = 1, extra: Partial<GenSpec> = {}): GenSpec => ({ family, kind, colors, p0, p1, seed, size, normal, ...extra });

export const MATERIAL_DEFS: Record<MaterialId, MatDef> = {
  // ------------------------------------------------------------------ architecture (triplanar)
  stone_wall: {
    gen: g('masonry', MK.ashlar, ['#77726a', '#5d5a53', '#48443d', '#8d937b'], [6, 3, 0.008, 1.0], [0.5, 0.25, 0.7, 0], 1, 'hero', 1.1),
    mapping: 'triplanar', scale: 2.4, weather: [0.85, 0.35, 0.5, 0.25], porosity: 0.7,
  },
  stone_dark: {
    gen: g('masonry', MK.ashlar, ['#4c4a44', '#3c3a35', '#2b2925', '#6d7560'], [5, 2, 0.011, 1.5], [0.95, 0.7, 0.9, 0], 2, 'hero', 1.2),
    mapping: 'triplanar', scale: 2.6, weather: [1.0, 0.7, 0.6, 0.2], porosity: 0.8,
  },
  stone_fresh: {
    gen: g('masonry', MK.ashlar, ['#d6ccb6', '#c7bca4', '#2c2925', '#8d937b'], [6, 3, 0.009, 0.12], [0.08, 0, 0, 1], 3, 'hero', 0.9),
    mapping: 'triplanar', scale: 2.4, weather: [0.12, 0, 0.04, 0.05], porosity: 0.5, variation: 0.35,
  },
  stone_trim: {
    gen: g('masonry', MK.ashlar, ['#948f82', '#847f73', '#5a564e', '#8d937b'], [2, 1, 0.006, 0.8], [0.75, 0.15, 0.5, 0], 4, 'std', 1),
    mapping: 'triplanar', scale: 2.0, weather: [0.6, 0.25, 0.55, 0.35], porosity: 0.6,
  },
  cobble: {
    gen: g('masonry', MK.cobble, ['#5f5c57', '#4b4741', '#2a241d', '#000000'], [9, 9, 0.07, 0.8], [0, 0.25, 0, 0], 5, 'hero', 1.3),
    mapping: 'triplanar', scale: 2.0, weather: [0.4, 0.15, 0, 0], porosity: 1,
  },
  flagstone: {
    gen: g('masonry', MK.flagstone, ['#6b665d', '#59544b', '#2d2a26', '#000000'], [3, 2, 0.009, 0.8], [0.8, 0.12, 0.6, 0], 6, 'hero', 1),
    mapping: 'triplanar', scale: 3.0, weather: [0.35, 0.1, 0, 0.1], porosity: 0.8,
  },
  plaster: {
    gen: g('organic', OK.plaster, ['#bcb29e', '#a6977a', '#6b5a44', '#5a4028'], [0.8, 0.6, 0.8, 0.5], [0, 0, 0, 0], 7, 'hero', 0.9),
    mapping: 'triplanar', scale: 2.5, weather: [0.9, 0.2, 0.8, 0], porosity: 0.35,
  },
  timber: {
    gen: g('wood', WK.timber, ['#5f4531', '#3d2b1d', '#6e685f', '#2e2016'], [30, 0.8, 0.35, 0.8], [0.72, 0, 0, 0], 8, 'std', 0.9),
    mapping: 'uvWorld', scale: 1.6, weather: [0.6, 0.2, 0.3, 0.2], porosity: 0.5,
  },
  timber_dark: {
    gen: g('wood', WK.timber, ['#3a2b20', '#231912', '#4e4a44', '#1a120c'], [30, 1.0, 0.55, 0.7], [0.8, 0, 0, 0], 9, 'std', 1),
    mapping: 'uvWorld', scale: 1.6, weather: [0.7, 0.3, 0.3, 0.2], porosity: 0.5,
  },
  timber_burnt: {
    gen: g('wood', WK.burnt, ['#0e0c0b', '#3a2616', '#5a5550', '#000000'], [5, 14, 0.4, 0], [0, 0, 0, 0], 10, 'std', 1.3),
    mapping: 'uvWorld', scale: 1.2, weather: [0.3, 0, 0, 0], porosity: 0.3,
  },
  planks: {
    gen: g('wood', WK.planks, ['#6a4e36', '#46321f', '#6e685f', '#000000'], [5, 0.006, 1, 0.5], [28, 0.35, 0.6, 0.72], 11, 'hero', 1),
    mapping: 'uvWorld', scale: 1.5, weather: [0.5, 0.25, 0.2, 0.2], porosity: 0.6,
  },
  roof_slate: {
    gen: g('masonry', MK.slate, ['#3d4047', '#2e3036', '#000000', '#8a8360'], [8, 5, 0.004, 1], [0, 0.3, 0.4, 0], 12, 'std', 1.2),
    mapping: 'triplanar', scale: 2.4, weather: [0.2, 0.4, 0.3, 0], porosity: 1,
  },
  roof_thatch_burnt: {
    gen: g('wood', WK.thatch, ['#141110', '#6b5534', '#5a5550', '#000000'], [5, 160, 0.6, 0], [0, 0, 0, 0], 13, 'std', 1.2),
    mapping: 'triplanar', scale: 2.5, weather: [0, 0.2, 0, 0], porosity: 0.2,
  },
  dirt: {
    gen: g('ground', GK.dirt, ['#4f4134', '#6e6a62', '#2c241c', '#000000'], [0.7, 0.5, 0.6, 0], [0, 0, 0, 0], 14, 'std', 1),
    mapping: 'triplanar', scale: 3.0, weather: [0, 0, 0, 0], porosity: 0.8,
  },
  mud: {
    gen: g('ground', GK.mud, ['#33291f', '#4a3f33', '#1c1a17', '#000000'], [0.6, 0.6, 0.4, 0], [0, 0, 0, 0], 15, 'std', 1),
    mapping: 'triplanar', scale: 4.0, weather: [0, 0, 0, 0], porosity: 0.3,
  },
  grass_dead: {
    gen: g('ground', GK.grass, ['#8a7650', '#5f6446', '#3e3226', '#6b4f33'], [0.9, 0, 0, 0], [0, 0, 0, 0], 16, 'std', 1),
    mapping: 'triplanar', scale: 2.0, weather: [0, 0, 0, 0], porosity: 0.3,
  },
  moss: {
    gen: g('ground', GK.moss, ['#3c4a22', '#6d7a38', '#1c2410', '#000000'], [14, 0.6, 0, 0], [0, 0, 0, 0], 17, 'std', 1),
    mapping: 'triplanar', scale: 1.5, weather: [0, 0, 0, 0], porosity: 0.4,
  },
  rock_cliff: {
    gen: g('masonry', MK.cliff, ['#56595c', '#46484b', '#000000', '#6b4f36'], [6, 6, 0, 0], [0.6, 0.35, 0, 0], 18, 'hero', 1.3),
    mapping: 'triplanar', scale: 6.0, weather: [0.3, 0.5, 0.4, 0.15], porosity: 0.7,
  },
  rubble: {
    gen: g('masonry', MK.rubble, ['#6a665e', '#55514a', '#5a534a', '#1a1714'], [6, 22, 0.15, 0], [0, 0, 0, 0], 19, 'std', 1.4),
    mapping: 'triplanar', scale: 2.5, weather: [0.3, 0.2, 0, 0.1], porosity: 0.6,
  },
  // ------------------------------------------------------------------ metals (UV)
  iron: {
    gen: g('metal', TK.iron, ['#2f2f31', '#3a2418', '#7a3e1c', '#6a6a6c'], [8, 0.3, 0.5, 0.6], [0, 0, 0, 0], 20, 'std', 0.8),
    mapping: 'uv', scale: 1, weather: [0.3, 0, 0.2, 0.6], porosity: 0.4,
  },
  iron_rusted: {
    gen: g('metal', TK.ironRusted, ['#2a2a2b', '#3c2215', '#8a4a22', '#555555'], [8, 0.9, 0.2, 0.9], [0, 0, 0, 0], 21, 'std', 1.1),
    mapping: 'uv', scale: 1, weather: [0.3, 0, 0.3, 0.3], porosity: 0.4,
  },
  steel_armor: {
    gen: g('metal', TK.steelArmor, ['#222427', '#1e2533', '#8f9296', '#5a3420'], [0.8, 0.25, 0.8, 0.5], [0, 0, 0, 0], 22, 'std', 0.7),
    mapping: 'uv', scale: 1, weather: [0, 0, 0, 0.9],
  },
  steel_bright: {
    gen: g('metal', TK.steelBright, ['#9ea2a6', '#6e6a64', '#c9ccd0', '#6a3e22'], [1, 0.25, 0.8, 0.5], [0, 0, 0, 0], 23, 'std', 0.5),
    mapping: 'uv', scale: 1, weather: [0, 0, 0, 0.5],
  },
  bronze: {
    gen: g('metal', TK.bronze, ['#7a5a32', '#3a2a1a', '#4f7f6c', '#b08c52'], [0.7, 0, 0.7, 0.6], [0, 0, 0, 0], 24, 'std', 0.8),
    mapping: 'uv', scale: 1, weather: [0.3, 0, 0.2, 0.6], porosity: 0.3,
  },
  bronze_bell: {
    gen: g('metal', TK.bell, ['#6e5230', '#33261a', '#4f8a74', '#a8864f'], [0.8, 0.9, 0.8, 0.4], [0, 0, 0, 0], 25, 'hero', 0.8),
    mapping: 'uv', scale: 1, weather: [0.3, 0.1, 0.4, 0.5], porosity: 0.3,
  },
  gold_trim: {
    gen: g('metal', TK.gilt, ['#c9a45a', '#6b3a22', '#2a2016', '#000000'], [0.7, 0.7, 0.6, 0], [0, 0, 0, 0], 26, 'small', 0.7),
    mapping: 'uv', scale: 1, weather: [0.2, 0, 0, 0.6],
  },
  // ------------------------------------------------------------------ organics & cloth (UV)
  leather: { gen: g('organic', OK.leather, ['#5a3a24', '#7a5a40', '#2a1a10', '#000000'], [40, 0.8, 0.6, 0.5], [0, 0, 0, 0], 27, 'std', 0.8), mapping: 'uv', scale: 1 },
  leather_dark: { gen: g('organic', OK.leather, ['#2d1f15', '#4a3a2c', '#120c08', '#000000'], [48, 0.9, 0.5, 0.4], [0, 0, 0, 0], 28, 'std', 0.8), mapping: 'uv', scale: 1 },
  cloth_black: { gen: g('organic', OK.cloth, ['#211f1e', '#3a3634', '#0e0c0a', '#3a2e26'], [96, 1, 0.6, 0.5], [0.25, 0.4, 1, 0], 29, 'std', 0.7), mapping: 'uv', scale: 1 },
  cloth_red: { gen: g('organic', OK.cloth, ['#5c1a18', '#7a3a30', '#2a0e0a', '#6a4a3a'], [96, 1, 0.5, 0.4], [0.2, 0.4, 1, 0], 30, 'std', 0.7), mapping: 'uv', scale: 1 },
  cloth_blue: { gen: g('organic', OK.cloth, ['#1f2b45', '#3e4a5a', '#0e121a', '#5a5040'], [96, 1, 0.5, 0.4], [0.2, 0.3, 1, 0], 31, 'std', 0.7), mapping: 'uv', scale: 1 },
  cloth_linen: { gen: g('organic', OK.cloth, ['#a89e86', '#bdb49c', '#6a5a40', '#7a6a50'], [72, 0, 0.3, 0.4], [0.3, 0.6, 1, 0], 32, 'std', 0.7), mapping: 'uv', scale: 1 },
  cloth_brown: { gen: g('organic', OK.cloth, ['#5a4430', '#7a6448', '#2a1e14', '#3a3024'], [64, 0, 0.4, 0.5], [0.3, 0.5, 1, 0], 33, 'std', 0.7), mapping: 'uv', scale: 1 },
  rope: { gen: g('organic', OK.rope, ['#8a7450', '#b09a70', '#3a3020', '#000000'], [3, 4, 0, 0], [0, 0, 0, 0], 34, 'small', 1.2), mapping: 'uv', scale: 1 },
  skin: { gen: g('organic', OK.skin, ['#b88a6e', '#b86a5a', '#6a6a8a', '#000000'], [1, 0.1, 0.5, 0.3], [0, 0, 0, 0], 35, 'small', 0.35), mapping: 'uv', scale: 1 },
  skin_pale: { gen: g('organic', OK.skin, ['#a8a494', '#9a8a84', '#5a6a7a', '#000000'], [1, 0.6, 0.3, 0.4], [0, 0, 0, 0], 36, 'small', 0.35), mapping: 'uv', scale: 1 },
  hair_dark: { gen: g('organic', OK.hair, ['#1e1612', '#3e2e22', '#000000', '#000000'], [180, 14, 0, 0], [0, 0, 0, 0], 37, 'small', 0.8), mapping: 'uv', scale: 1 },
  hair_fair: { gen: g('organic', OK.hair, ['#8a6a40', '#c8a870', '#000000', '#000000'], [180, 14, 0, 0], [0, 0, 0, 0], 38, 'small', 0.8), mapping: 'uv', scale: 1 },
  bone: { gen: g('organic', OK.bone, ['#cfc3a2', '#8a7450', '#3a3020', '#000000'], [0.7, 0.6, 0.6, 0], [0, 0, 0, 0], 39, 'small', 0.8), mapping: 'uv', scale: 1 },
  parchment: { gen: g('organic', OK.parchment, ['#cdb68a', '#8a6038', '#2a1a10', '#000000'], [18, 0.7, 0.6, 0.9], [0, 0, 0, 0], 40, 'small', 0.4), mapping: 'uv', scale: 1, doubleSided: true },
  wax: { gen: g('organic', OK.wax, ['#e3d6b4', '#d8c48e', '#2a2420', '#000000'], [0.8, 0.3, 0, 0], [0, 0, 0, 0], 41, 'small', 0.6), mapping: 'uv', scale: 1, emissive: { color: '#ffcf8a', intensity: 0.06 } },
  // ------------------------------------------------------------------ special
  glass: {
    gen: g('special', SK.glass, ['#4a5550', '#6a6250', '#000000', '#000000'], [0.6, 0.4, 0.6, 0.3], [0, 0, 0, 0], 42, 'small', 0.4),
    mapping: 'uv', scale: 1, transparent: true, doubleSided: true, envMapIntensity: 1.5,
  },
  water: {
    gen: g('special', SK.water, ['#1a2226', '#000000', '#000000', '#000000'], [1, 0, 0, 0.88], [0, 0, 0, 0], 43, 'std', 0.6),
    mapping: 'triplanar', scale: 6, transparent: true, envMapIntensity: 1.6,
  },
  fire: { mapping: 'uv', scale: 1, special: 'fire' },
  ember_glow: {
    gen: g('metal', TK.ember, ['#141010', '#ff6a20', '#6a6460', '#000000'], [8, 0.6, 0.4, 0], [0, 0, 0, 0], 44, 'small', 1),
    mapping: 'uv', scale: 1, emissive: { color: '#ff5a18', intensity: 4.5, anim: [0.35, 2.2, 0.15, 0.7] },
  },
  window_warm: {
    gen: g('special', SK.window, ['#d89040', '#1c1a18', '#6a3a18', '#000000'], [3, 4, 0.02, 0.55], [0, 0, 0, 0], 45, 'small', 0.6),
    mapping: 'uv', scale: 1, emissive: { color: '#ffa055', intensity: 3.2, anim: [0.12, 1.3, 0, 0] },
  },
  bell_light: {
    gen: g('special', SK.bellLight, ['#ffe8b0', '#000000', '#000000', '#000000'], [0, 0, 0, 0], [0, 0, 0, 0], 46, 'small', 0.3),
    mapping: 'uv', scale: 1, emissive: { color: '#ffd890', intensity: 3.0, anim: [0.05, 0.8, 0.2, 1.1] },
  },
  unlived_crack: {
    gen: g('metal', TK.crack, ['#1f1b17', '#ffc860', '#2e2820', '#000000'], [5, 11, 0.05, 0], [0.3, 0, 0, 0], 47, 'std', 1),
    mapping: 'uv', scale: 1, emissive: { color: '#ffb54a', intensity: 5.0, anim: [0.1, 1.7, 0.35, 1.6] },
  },
  fog_veil: { mapping: 'uv', scale: 1, special: 'fogVeil' },
  heraldry_banner: {
    gen: g('organic', OK.banner, ['#4c1515', '#6a2a24', '#1a0a08', '#c9a45a'], [120, 1, 0.5, 0.3], [0.12, 0.4, 1, 0], 48, 'std', 0.8,
      { aspect: 2, mask: { kind: 'royal', fill: 0.6, cy: 0.44 } }),
    mapping: 'uv', scale: 1, doubleSided: true, alphaTest: 0.5,
  },
  shield_household: {
    gen: g('wood', WK.shield, ['#4a3524', '#161513', '#b08a52', '#8a7a66'], [5, 0.55, 0.5, 0], [0, 0, 0, 0], 49, 'std', 0.9,
      { aspect: 1.6, mask: { kind: 'royal', fill: 0.64, cy: 0.42 } }),
    mapping: 'uv', scale: 1, weather: [0, 0, 0, 0.3],
  },
};
