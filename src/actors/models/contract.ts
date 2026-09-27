/**
 * CONTRACT — character, NPC and weapon model builders (implemented in src/actors/models/*).
 * Builders only create visuals: meshes parented to rig bones/sockets. They never animate bones.
 * All geometry is procedural (no external assets). Materials come from getMaterial().
 */
import type * as THREE from 'three';
import type { Rig } from '../Rig';

/** Armor visual sets. Each armor ItemDef id maps to one of these per slot. */
export type ArmorLook =
  | 'none'          // under-clothes: padded gambeson, trousers, boots
  | 'retainer'      // Household Knight: blackened steel plate with bronze trim, royal tabard, tattered cloak
  | 'court'         // Court Mage: hooded dark robes with gilt embroidery, leather gloves, tall boots
  | 'oath'          // Oathblade: leather coat, straps, light mail
  | 'funeral'       // Funeral Priest: pale funeral vestments over dark mail, veil/helm
  | 'huntsman'      // Royal Huntsman: wide hat, leather jerkin, cape
  | 'condemned'     // Condemned Retainer: rags and chains
  | 'commander'     // Corvane's armour (reward set)
  | 'greyford'      // Unlived Greyford soldier set: obsolete brigandine, old-pattern sallet, faded blue-grey surcoat
  | 'warden'        // Mint Warden: light guard set — padded coat, bronze-studded leather, open bascinet, key ring
  | 'hospice'       // Hospice healer's robes: layered linen and wool, hood, apron, satchel straps (light)
  | 'bellkeeper'    // Condemned bellkeeper vestments: soot-black cassock, bronze bell-chains, iron collar
  | 'gatewarden';   // Gatewarden heavy plate: tall shoulders, visored bascinet, tabard with the army castle-and-sword

export interface CharacterLook {
  head: ArmorLook; body: ArmorLook; arms: ArmorLook; legs: ArmorLook;
  /** Face/hair shown when the head slot is 'none' or open-faced. */
  hair?: 'dark' | 'fair';
  /** The player's cloak (tattered, verlet cloth) — true for most body armours. */
  cloak?: boolean;
}

/** Everything a built character exposes to gameplay. */
export interface CharacterModel {
  /** Meshes that should flash on hit / fade on death (materials may be cloned per character). */
  meshes: THREE.Mesh[];
  /** Visual-only simulation (cloaks, tabards, loose cloth). Call every render frame. */
  updateSecondary(dt: number): void;
  /** Teleports reset cloth to rest (after respawn / warp). */
  resetSecondary(): void;
  /** 0..1 dissolve for death (Unlived crumble into golden motes). */
  setDissolve(t: number): void;
  /** Hit flash intensity 0..1 (brief bright rim). */
  setFlash(t: number): void;
  /** Tints/glow for statuses (e.g. 'ward' = pale gold shimmer, 'iframes' = faint bronze outline). */
  setStatusGlow(kind: 'none' | 'ward' | 'iframes' | 'burn' | 'buff', t: number): void;
  dispose(): void;
}

export type EnemyLook = 'infantry' | 'sentry' | 'shieldBearer' | 'archer' | 'commander' | 'commander2' | 'greyfordSoldier';
export type NpcLook = 'oswin' | 'hesper' | 'brannoc' | 'dummy' | 'bellkeeper' | 'aldren_memory';

/**
 * Weapon/shield/catalyst visual. Local frame: grip centre at origin, blade/shaft along +Y,
 * edge toward +Z (shields: face +Z, top +Y, centre of face at origin).
 * `hit` describes the damaging segment along +Y used by melee hit detection.
 */
export interface WeaponModel {
  object: THREE.Object3D;
  hit: { from: number; to: number; radius: number } | null;
  /** Where spells emerge (catalysts), local coords. */
  castPoint?: THREE.Vector3;
  /** Weapon trail anchor points along +Y (base, tip). */
  trail?: { from: number; to: number };
  /** Two-handed/long weapons: where the LEFT hand grips along +Y (metres from the main grip). */
  offhandGrip?: number;
}

export interface ModelFactory {
  buildCharacter(rig: Rig, look: CharacterLook): CharacterModel;
  buildEnemy(rig: Rig, look: EnemyLook, seed: number): CharacterModel;
  buildNpc(rig: Rig, look: NpcLook): CharacterModel;
  /** Item ids from src/content/items.ts plus enemy-only ids ('enemy_sword', 'enemy_spear', 'tower_shield', 'enemy_bow', 'corvane_sword', 'arrow', 'throwing_knife'). */
  buildWeapon(itemId: string): WeaponModel;
}
