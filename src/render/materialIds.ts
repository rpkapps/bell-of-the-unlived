/**
 * CONTRACT — material identifiers. `getMaterial(id)` (src/render/materials.ts) returns a shared,
 * cached THREE.Material for each. All are PBR (MeshStandardMaterial / MeshPhysicalMaterial) unless
 * noted. Surfaces are weathered by default: edge polish, grime in recesses, soot, moss.
 */
export const MATERIAL_IDS = [
  // architecture
  'stone_wall',      // grey ashlar blocks, mortar lines, soot toward the ground
  'stone_dark',      // older, darker, mossier masonry (foundations, ravine)
  'stone_fresh',     // fresh pale masonry + damp mortar (the barred escape route — must read as NEW)
  'stone_trim',      // carved lighter stone (arches, cornices, reliefs)
  'cobble',          // street cobbles, wet sheen
  'flagstone',       // interior floor slabs
  'plaster',         // off-white wattle plaster, stained
  'timber',          // oak beams, half-timbering
  'timber_dark',     // charred / old beams
  'timber_burnt',    // burned wood with emissive-free char
  'planks',          // floorboards / bridge planks / doors
  'roof_slate',      // dark slate tiles
  'roof_thatch_burnt',
  'dirt', 'mud', 'grass_dead', 'moss', 'rock_cliff', 'rubble',
  // metals
  'iron',            // black iron fittings, rust
  'iron_rusted',
  'steel_armor',     // blackened steel plate, polished edges
  'steel_bright',    // blades
  'bronze',          // funerary bronze (bells, trims)
  'bronze_bell',     // bell bronze with verdigris
  'gold_trim',       // worn gilt
  // organics / cloth
  'leather', 'leather_dark', 'cloth_black', 'cloth_red', 'cloth_blue', 'cloth_linen', 'cloth_brown', 'rope',
  'skin', 'skin_pale', 'hair_dark', 'hair_fair', 'bone', 'parchment', 'wax',
  // special
  'glass', 'water',
  'fire',            // emissive, additive-looking flame body (use with flame meshes)
  'ember_glow',      // emissive orange for coals/braziers/windows
  'window_warm',     // emissive warm window glass
  'bell_light',      // emissive pale gold (Stillbell light, anchors, memory)
  'unlived_crack',   // emissive gold cracks — Unlived bodies and Great Bells
  'fog_veil',        // translucent boss-fog material (animated)
  'heraldry_banner', // banner cloth with the royal arms (double-sided)
  'shield_household',// the Household Shield face texture (royal arms on worn black wood)
] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];
