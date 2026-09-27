# Third-party license record

Bells of the Unlived ships **no third-party art, animation or audio**. Every model, texture,
animation, sound effect, piece of music and icon is generated procedurally by this project's own
source code (see `src/actors/models`, `src/render/texgen`, `src/actors/anim/clips`, `src/audio`,
`src/ui/icons.ts`). The concept art in `concept-art/` is reference material supplied for the project
and is not shipped in the build.

| Component | Use | Version | License | Commercial use | Source |
|---|---|---|---|---|---|
| three.js | 3D rendering engine | 0.180.0 | MIT | Yes | https://github.com/mrdoob/three.js |
| three-mesh-bvh | Collision / raycast acceleration | 0.9.1 | MIT | Yes | https://github.com/gkjohnson/three-mesh-bvh |
| Cinzel (via @fontsource/cinzel) | UI titles and labels | 5.3.0 | SIL Open Font License 1.1 | Yes (font may not be sold by itself) | https://fonts.google.com/specimen/Cinzel |
| Cormorant Garamond (via @fontsource/cormorant-garamond) | UI body text | 5.3.0 | SIL Open Font License 1.1 | Yes (font may not be sold by itself) | https://fonts.google.com/specimen/Cormorant+Garamond |

Build-time only (not shipped): TypeScript (Apache-2.0), Vite (MIT), Vitest (MIT), playwright-core (Apache-2.0).

## Obligations
* **MIT (three.js, three-mesh-bvh):** include the copyright notice and license text in distributions —
  the build copies `LICENSE` files from `node_modules` into `dist/licenses/` (see `tools/copy-licenses.mjs`).
* **OFL-1.1 (fonts):** the fonts are bundled unmodified with their license; they are not sold separately.

## Procedural asset provenance
| Asset class | Generator |
|---|---|
| Characters, armour, weapons, shields, cloth | `src/actors/models/*` |
| Architecture, props, level geometry | `src/world/kit/*`, `src/content/ashbridge/*` |
| Textures & materials (stone, metal, cloth, heraldry) | `src/render/texgen/*`, `src/render/materials.ts`, `src/render/heraldry.ts` |
| Animation | `src/actors/anim/clips/*` (keyframes + IK authored in code) |
| Sound effects, ambience, music | `src/audio/*` (WebAudio synthesis) |
| Icons | `src/ui/icons.ts` (inline SVG) |
