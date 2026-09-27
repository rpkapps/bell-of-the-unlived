/**
 * CONTRACT — shared gameplay data types (items, stats, journal, HUD, origins).
 * Implemented by gameplay systems; read by UI.
 */

// ------------------------------------------------------------------ attributes & stats

export const ATTRIBUTES = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intellect', 'devotion'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Attributes = Record<Attribute, number>;
export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  vigor: 'Vigor', mind: 'Mind', endurance: 'Endurance', strength: 'Strength',
  dexterity: 'Dexterity', intellect: 'Intellect', devotion: 'Devotion',
};
export const ATTRIBUTE_HELP: Record<Attribute, string> = {
  vigor: 'Raises maximum health.',
  mind: 'Raises maximum focus, spent on spells and Imprint Techniques.',
  endurance: 'Raises stamina and equipment load.',
  strength: 'Wields heavy weapons and raises strength scaling and guard stability.',
  dexterity: 'Wields fast weapons and bows; raises dexterity scaling.',
  intellect: 'Powers sorceries and raises magic defence.',
  devotion: 'Powers bell rites and healing.',
};
/** Respec can lower any attribute to this floor, whatever the origin. */
export const ATTRIBUTE_FLOOR = 6;

export type LoadClass = 'light' | 'medium' | 'heavy' | 'overloaded';

/** Everything the character screen shows. */
export interface PlayerSheet {
  level: number;
  hours: number;
  nextLevelCost: number;
  attributes: Attributes;
  hpMax: number; focusMax: number; staminaMax: number;
  equipLoad: number; equipLoadMax: number; loadClass: LoadClass;
  /** Dodge i-frame window in seconds for the current load class, e.g. [0.06, 0.38]. */
  dodgeIFrames: [number, number];
  poise: number;
  defense: { physical: number; magic: number; fire: number };
  attackRight: number; attackLeft: number; spellPower: number;
  originId: OriginId;
}

// ------------------------------------------------------------------ items

export type ItemKind =
  | 'weapon' | 'shield' | 'catalyst' | 'bow' | 'armor' | 'talisman'
  | 'consumable' | 'material' | 'key' | 'spellbook' | 'memory' | 'ammo';

export type WeaponClass = 'straightSword' | 'dagger' | 'estoc' | 'mace' | 'flail' | 'staff' | 'bell' | 'bow' | 'fist';
export type ArmorSlot = 'head' | 'body' | 'arms' | 'legs';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | '-';

/** Icon ids are drawn procedurally by the UI (SVG). Unknown ids fall back to a generic icon by kind. */
export type IconId = string;

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  icon: IconId;
  description: string;
  lore?: string;
  weight?: number;
  /** Max stack (consumables/materials). */
  stack?: number;
  weapon?: {
    class: WeaponClass;
    damage: { physical: number; magic: number; fire: number };
    scaling: Partial<Record<'strength' | 'dexterity' | 'intellect' | 'devotion', Grade>>;
    requirements: Partial<Record<'strength' | 'dexterity' | 'intellect' | 'devotion', number>>;
    criticalMult: number;
    postureMult: number;
    technique?: string; // TechniqueDef id
    /** Catalysts: which spell school they cast. */
    casts?: 'sorcery' | 'rite';
    maxUpgrade: number;
  };
  shield?: { physicalGuard: number; magicGuard: number; stability: number; technique?: string };
  armor?: { slot: ArmorSlot; physical: number; magic: number; fire: number; poise: number };
  talisman?: { effect: string };
  consumable?: { effect: string; value?: number };
  spellbook?: { spell: string };
  memory?: { boss: string };
  /** Selling/buying price in Hours (smith shop). */
  price?: number;
}

export interface SpellDef {
  id: string; name: string; icon: IconId; school: 'sorcery' | 'rite';
  focus: number; stamina: number; description: string;
  requirements: Partial<Record<'intellect' | 'devotion', number>>;
}
export interface TechniqueDef { id: string; name: string; icon: IconId; focus: number; stamina: number; description: string }

export interface InventoryEntry { id: string; count: number; upgrade: number; def: ItemDef }

export type EquipSlot =
  | 'right0' | 'right1' | 'left0' | 'left1'
  | 'head' | 'body' | 'arms' | 'legs'
  | 'talisman0' | 'talisman1'
  | 'quick0' | 'quick1' | 'quick2' | 'quick3'
  | 'spell0' | 'spell1' | 'spell2';

export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  right0: 'Right hand 1', right1: 'Right hand 2', left0: 'Left hand 1', left1: 'Left hand 2',
  head: 'Head', body: 'Body', arms: 'Arms', legs: 'Legs', talisman0: 'Talisman 1', talisman1: 'Talisman 2',
  quick0: 'Quick item 1', quick1: 'Quick item 2', quick2: 'Quick item 3', quick3: 'Quick item 4',
  spell0: 'Spell 1', spell1: 'Spell 2', spell2: 'Spell 3',
};

// ------------------------------------------------------------------ origins

export type OriginId = 'householdKnight' | 'courtMage' | 'oathblade' | 'funeralPriest' | 'royalHuntsman' | 'condemnedRetainer';
export interface OriginDef {
  id: OriginId; name: string; motto: string; description: string;
  attributes: Attributes; kit: string[]; available: boolean;
}

// ------------------------------------------------------------------ journal (Forememory)

export type JournalCategory = 'remembered' | 'observed' | 'confirmed';
export interface JournalEntry {
  id: string;
  category: JournalCategory;
  text: string;
  /** Play time (seconds) when recorded. */
  time: number;
  /** A remembered entry contradicted by present evidence stays visible with this note. */
  contradictedBy?: string;
  /** A confirmed change that records a loss (e.g. a person taken). */
  loss?: boolean;
}
export interface JournalLead {
  id: string;
  title: string;
  region: string;
  status: 'open' | 'resolved' | 'lost';
  entries: JournalEntry[];
}

// ------------------------------------------------------------------ dialogue

export interface DialogueLine { speaker: string; text: string; /** seconds, for auto-advancing barks */ duration?: number }
export interface DialogueChoice { text: string; id: string }

// ------------------------------------------------------------------ HUD (written every frame by the game)

export interface HudSlot { name: string; icon: IconId; count?: number; upgrade?: number; cost?: number; empty?: boolean }
export interface HudEnemyBar { id: number; x: number; y: number; hp01: number; posture01: number; damage?: number; visible: boolean }

export interface HudState {
  hp: number; hpMax: number;
  stamina: number; staminaMax: number;
  focus: number; focusMax: number;
  hours: number;
  right: HudSlot; left: HudSlot; quick: HudSlot; spell: HudSlot;
  flask: { health: number; focus: number };
  /** Unfinished Toll: shown at crossroads. dir in [-1,1] = screen-relative left/right, 0 = ahead; behind = |dir|>0.9 with `behind`. */
  toll: { active: boolean; dir: number; behind: boolean; intensity: number };
  /** Screen-space lock-on marker (pixels). */
  lock: { visible: boolean; x: number; y: number };
  enemyBars: HudEnemyBar[];
  boss: { name: string; title: string; hp01: number; posture01: number; phase: number } | null;
  /** Critical marker when an eligible target is in range. */
  critical: { visible: boolean; x: number; y: number; kind: 'backstab' | 'riposte' | 'guardBreak' | 'postureBreak' | null };
  reticle: boolean;
  prompt: { text: string; action: import('../input/actions').ActionId } | null;
  statuses: { id: string; icon: IconId; label: string; remaining01: number }[];
  /** Brief bronze edge flash while dodge i-frames are active (only when the setting is on). */
  iframes: boolean;
  lowHealth: boolean;
}
