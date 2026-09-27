/**
 * Model factory: procedural character, enemy, NPC and weapon visuals (no external assets).
 *
 * Integration:
 *  - Weapons: `const w = models.buildWeapon(id); rig.sockets.weaponR.add(w.object)` (shields go on
 *    `rig.sockets.shieldL`, catalysts/dirks/bows on `weaponL`). `w.hit` is the damaging segment
 *    along the model's +Y, `w.trail` the trail anchors, `w.castPoint` the spell origin, and
 *    `w.offhandGrip` where the left hand holds two-handed/long weapons.
 *  - Characters: the returned meshes are SkinnedMeshes under `rig.root` bound to the rig's bones
 *    (one per material), plus world-simulated cloth meshes also under `rig.root`.
 *  - Each render frame: pose the rig → update world matrices → `model.updateSecondary(dt)` (it
 *    refreshes rig.root's world matrices itself to be safe) → render. After teleports/respawns
 *    call `resetSecondary()`.
 *  - Wind for all cloth: `setClothWind(dir, speed, gust)`.
 */
import type { ModelFactory, CharacterModel } from './contract';
import { CharBuilder, type BuiltModel } from './builder';
import { buildLook, type CharacterLookExt } from './character';
import { buildEnemy } from './enemies';
import { buildNpc } from './npcs';
import { buildWeapon, WEAPON_IDS, type WeaponModelExt } from './weapons';

export { setClothWind, clothWind } from './cloth';
export type { CharacterLookExt, BuiltModel, WeaponModelExt };
export { WEAPON_IDS };

/**
 * Extension points for later regions: register builders for new enemy/NPC looks and weapons.
 * Builders receive a CharBuilder (same toolkit the built-in looks use) or build their own model.
 */
export type LookBuilder = (rig: import('../Rig').Rig, seed: number) => CharacterModel;
const EXTRA_ENEMY: Record<string, LookBuilder> = {};
const EXTRA_NPC: Record<string, LookBuilder> = {};
const EXTRA_WEAPON: Record<string, () => WeaponModelExt> = {};
export function registerEnemyLook(look: string, build: LookBuilder) { EXTRA_ENEMY[look] = build; }
export function registerNpcLook(look: string, build: LookBuilder) { EXTRA_NPC[look] = build; }
export function registerWeaponModel(id: string, build: () => WeaponModelExt) { EXTRA_WEAPON[id] = build; }
export { CharBuilder };

export const models: ModelFactory = {
  buildCharacter(rig, look): CharacterModel {
    const b = new CharBuilder(rig, 'player', 1);
    buildLook(b, look as CharacterLookExt);
    return b.build();
  },
  buildEnemy(rig, look, seed): CharacterModel {
    const x = EXTRA_ENEMY[look as string];
    return x ? x(rig, seed) : buildEnemy(rig, look, seed);
  },
  buildNpc(rig, look): CharacterModel {
    const x = EXTRA_NPC[look as string];
    return x ? x(rig, 1) : buildNpc(rig, look);
  },
  buildWeapon(itemId: string): WeaponModelExt {
    const x = EXTRA_WEAPON[itemId];
    return x ? x() : buildWeapon(itemId);
  },
};

export default models;
