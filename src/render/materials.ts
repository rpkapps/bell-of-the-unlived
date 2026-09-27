/**
 * TEMPORARY STUB — replaced by the render/materials owner. Keeps the public API stable:
 *   getMaterial(id)            shared cached material
 *   getMaterialVariant(id, k)  a tinted/offset variant (k = small integer) for visual variety
 *   initMaterials(renderer)    async pre-generation of textures (call once at boot)
 */
import * as THREE from 'three';
import type { MaterialId } from './materialIds';

const cache = new Map<string, THREE.Material>();
const COLORS: Partial<Record<MaterialId, number>> = {
  stone_wall: 0x6b6862, stone_dark: 0x46443f, stone_fresh: 0xb8b0a0, stone_trim: 0x8a857a, cobble: 0x55524c,
  flagstone: 0x5f5a52, plaster: 0xb5aa94, timber: 0x4a3524, timber_dark: 0x2c2118, timber_burnt: 0x1a1512,
  planks: 0x5a4330, roof_slate: 0x2e3036, dirt: 0x4a3f33, mud: 0x3a3128, rock_cliff: 0x4f4c48, iron: 0x2a2a2c,
  steel_armor: 0x3a3b3e, steel_bright: 0x9a9ca0, bronze: 0x8a6a3a, bronze_bell: 0x7a6038, gold_trim: 0xb08a4a,
  leather: 0x4a3222, leather_dark: 0x2a1d14, cloth_black: 0x1c1a1a, cloth_red: 0x4a1616, cloth_blue: 0x1c2436,
  cloth_linen: 0x9a917e, skin: 0xb08870, fire: 0xff8030, ember_glow: 0xff6a20, window_warm: 0xffb060,
  bell_light: 0xffe0a0, unlived_crack: 0xffc060,
};
const EMISSIVE = new Set<MaterialId>(['fire', 'ember_glow', 'window_warm', 'bell_light', 'unlived_crack']);

export function getMaterial(id: MaterialId): THREE.Material {
  let m = cache.get(id);
  if (!m) {
    const c = COLORS[id] ?? 0x777777;
    m = EMISSIVE.has(id)
      ? new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 })
      : new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: id.includes('steel') || id.includes('iron') || id.includes('bronze') ? 0.7 : 0 });
    m.name = id;
    cache.set(id, m);
  }
  return m;
}
export function getMaterialVariant(id: MaterialId, _k: number): THREE.Material { return getMaterial(id); }
export async function initMaterials(_renderer: THREE.WebGLRenderer): Promise<void> {}
