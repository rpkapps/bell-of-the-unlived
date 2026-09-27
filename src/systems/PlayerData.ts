/**
 * Serializable player progression: attributes, Hours, inventory, equipment, spells, techniques,
 * flask allocation. Pure data + derived-stat helpers (no three.js).
 */
import type { Attributes, EquipSlot, InventoryEntry, ItemDef, LoadClass, OriginId, PlayerSheet, SpellDef } from '../game/types';
import { ORIGINS } from '../content/origins';
import { ITEMS, KIT_COUNTS, TECHNIQUES } from '../content/items';
import { SPELLS } from '../content/spells';
import { attackRating, DODGE, focusFor, hpFor, levelCost, levelOf, loadClass, loadFor, spellPower, staminaFor } from '../combat/stats';

export interface PlayerData {
  origin: OriginId;
  attributes: Attributes;
  hours: number;
  /** item id → { count, upgrade } (weapons/armour have count 1). */
  inventory: Record<string, { count: number; upgrade: number }>;
  equipment: Record<EquipSlot, string | null>;
  activeRight: 0 | 1;
  activeLeft: 0 | 1;
  activeQuick: number;
  activeSpell: number;
  knownSpells: string[];
  /** Unlocked Imprint Techniques. */
  techniques: string[];
  /** Weapon/shield id → imprinted technique id (overrides the item's default). */
  imprints: Record<string, string>;
  flask: { total: number; health: number; focusCharges: number; leftHealth: number; leftFocus: number };
  hp: number; focus: number;
  talismanEffects?: string[];
}

export const EMPTY_EQUIP = (): Record<EquipSlot, string | null> => ({
  right0: null, right1: null, left0: null, left1: null, head: null, body: null, arms: null, legs: null,
  talisman0: null, talisman1: null, quick0: null, quick1: null, quick2: null, quick3: null,
  spell0: null, spell1: null, spell2: null,
});

export function newPlayerData(origin: OriginId): PlayerData {
  const o = ORIGINS.find((x) => x.id === origin) ?? ORIGINS[0];
  const pd: PlayerData = {
    origin: o.id, attributes: { ...o.attributes }, hours: 0, inventory: {}, equipment: EMPTY_EQUIP(),
    activeRight: 0, activeLeft: 0, activeQuick: 0, activeSpell: 0, knownSpells: [], techniques: [], imprints: {},
    flask: { total: 5, health: 3, focusCharges: 2, leftHealth: 3, leftFocus: 2 }, hp: 0, focus: 0,
  };
  if (o.id === 'householdKnight') { pd.flask.health = 4; pd.flask.focusCharges = 1; }
  for (const k of o.kit) {
    if (k.startsWith('spell:')) { pd.knownSpells.push(k.slice(6)); continue; }
    addItem(pd, k, KIT_COUNTS[k] ?? 1);
  }
  // Auto-equip kit.
  for (const k of o.kit) {
    const d = ITEMS[k];
    if (!d) continue;
    if (d.kind === 'armor' && d.armor) pd.equipment[d.armor.slot] = k;
    else if (d.kind === 'weapon' || d.kind === 'catalyst' || d.kind === 'bow') {
      if (!pd.equipment.right0) pd.equipment.right0 = k; else if (!pd.equipment.left0) pd.equipment.left0 = k;
    } else if (d.kind === 'shield') pd.equipment.left0 = k;
  }
  pd.equipment.quick0 = 'recall_flask';
  pd.equipment.quick1 = 'recall_flask_focus';
  if (pd.inventory.throwing_knife) pd.equipment.quick2 = 'throwing_knife';
  pd.knownSpells.forEach((s, i) => { if (i < 3) (pd.equipment as any)['spell' + i] = s; });
  // Techniques default to those carried by the kit's weapons.
  for (const k of o.kit) { const t = ITEMS[k]?.weapon?.technique ?? ITEMS[k]?.shield?.technique; if (t && !pd.techniques.includes(t)) pd.techniques.push(t); }
  refillFlasks(pd);
  const d = derive(pd);
  pd.hp = d.hpMax; pd.focus = d.focusMax;
  return pd;
}

export function addItem(pd: PlayerData, id: string, count = 1) {
  const e = pd.inventory[id];
  if (e) e.count += count; else pd.inventory[id] = { count, upgrade: 0 };
}
export function removeItem(pd: PlayerData, id: string, count = 1): boolean {
  const e = pd.inventory[id];
  if (!e || e.count < count) return false;
  e.count -= count;
  if (e.count <= 0) {
    delete pd.inventory[id];
    for (const s of Object.keys(pd.equipment) as EquipSlot[]) if (pd.equipment[s] === id) pd.equipment[s] = null;
  }
  return true;
}
export function refillFlasks(pd: PlayerData) { pd.flask.leftHealth = pd.flask.health; pd.flask.leftFocus = pd.flask.focusCharges; }

export const item = (id: string | null | undefined): ItemDef | null => (id ? ITEMS[id] ?? null : null);

export function rightId(pd: PlayerData) { return pd.equipment[pd.activeRight ? 'right1' : 'right0'] ?? (pd.equipment[pd.activeRight ? 'right0' : 'right1']); }
export function leftId(pd: PlayerData) { return pd.equipment[pd.activeLeft ? 'left1' : 'left0'] ?? (pd.equipment[pd.activeLeft ? 'left0' : 'left1']); }
export function quickIds(pd: PlayerData) { return (['quick0', 'quick1', 'quick2', 'quick3'] as EquipSlot[]).map((s) => pd.equipment[s]).filter((x): x is string => !!x); }
export function spellIds(pd: PlayerData) { return (['spell0', 'spell1', 'spell2'] as EquipSlot[]).map((s) => pd.equipment[s]).filter((x): x is string => !!x); }
export function activeSpell(pd: PlayerData): SpellDef | null {
  const ids = spellIds(pd);
  if (!ids.length) return null;
  return SPELLS[ids[pd.activeSpell % ids.length]] ?? null;
}
export function activeQuick(pd: PlayerData): string | null {
  const ids = quickIds(pd);
  return ids.length ? ids[pd.activeQuick % ids.length] : null;
}
export function techniqueFor(pd: PlayerData, itemId: string | null) {
  if (!itemId) return null;
  const d = ITEMS[itemId];
  const id = pd.imprints[itemId] ?? d?.weapon?.technique ?? d?.shield?.technique;
  return id ? TECHNIQUES[id] ?? null : null;
}

export interface Derived {
  hpMax: number; focusMax: number; staminaMax: number;
  equipLoad: number; equipLoadMax: number; loadClass: LoadClass;
  poise: number;
  absorb: { physical: number; magic: number; fire: number };
  defense: number;
  level: number;
}

export function derive(pd: PlayerData): Derived {
  const a = pd.attributes;
  let load = 0, poise = 0, ph = 0, mg = 0, fi = 0;
  for (const [slot, id] of Object.entries(pd.equipment)) {
    const d = item(id);
    if (!d) continue;
    if (slot.startsWith('quick') || slot.startsWith('spell')) continue;
    load += d.weight ?? 0;
    if (d.armor) { poise += d.armor.poise; ph += d.armor.physical; mg += d.armor.magic; fi += d.armor.fire; }
  }
  const max = loadFor(a.endurance);
  const lvl = levelOf(a);
  return {
    hpMax: hpFor(a.vigor), focusMax: focusFor(a.mind), staminaMax: staminaFor(a.endurance) * (hasTalisman(pd, 'staminaMax') ? 1.1 : 1),
    equipLoad: Math.round(load * 10) / 10, equipLoadMax: max, loadClass: loadClass(load, max),
    poise,
    absorb: { physical: Math.min(0.7, ph / 100), magic: Math.min(0.7, mg / 100 + a.intellect * 0.004), fire: Math.min(0.7, fi / 100) },
    defense: 40 + lvl * 1.2 + a.vigor * 0.4 + a.endurance * 0.3,
    level: lvl,
  };
}

export function hasTalisman(pd: PlayerData, effectPrefix: string) {
  return [pd.equipment.talisman0, pd.equipment.talisman1].some((t) => item(t)?.talisman?.effect.startsWith(effectPrefix));
}

export function sheet(pd: PlayerData): PlayerSheet {
  const d = derive(pd);
  const r = item(rightId(pd)), l = item(leftId(pd));
  const ar = (x: ItemDef | null, id: string | null) => (x?.weapon ? Math.round(attackRating(x, pd.inventory[id!]?.upgrade ?? 0, pd.attributes).total) : 0);
  const catalyst = [r, l].find((x) => x?.weapon?.casts);
  const catId = catalyst === r ? rightId(pd) : leftId(pd);
  return {
    level: d.level, hours: pd.hours, nextLevelCost: levelCost(d.level), attributes: { ...pd.attributes },
    hpMax: d.hpMax, focusMax: d.focusMax, staminaMax: Math.round(d.staminaMax),
    equipLoad: d.equipLoad, equipLoadMax: d.equipLoadMax, loadClass: d.loadClass,
    dodgeIFrames: DODGE[d.loadClass].iframes, poise: d.poise,
    defense: { physical: Math.round(d.defense + d.absorb.physical * 100), magic: Math.round(d.defense * 0.8 + d.absorb.magic * 100), fire: Math.round(d.defense * 0.8 + d.absorb.fire * 100) },
    attackRight: ar(r, rightId(pd)), attackLeft: ar(l, leftId(pd)),
    spellPower: catalyst ? Math.round(100 * spellPower(catalyst, pd.inventory[catId!]?.upgrade ?? 0, pd.attributes, catalyst.weapon!.casts!)) : 0,
    originId: pd.origin,
  };
}

export function inventoryEntries(pd: PlayerData, filter?: (d: ItemDef) => boolean): InventoryEntry[] {
  const out: InventoryEntry[] = [];
  for (const [id, e] of Object.entries(pd.inventory)) {
    const def = ITEMS[id];
    if (!def || (filter && !filter(def))) continue;
    out.push({ id, count: e.count, upgrade: e.upgrade, def });
  }
  return out;
}
