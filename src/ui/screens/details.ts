/**
 * Detail panels shared by equipment, inventory, attunement, imprinting, smith and shop screens.
 * Unmet requirements are shown in red AND with a warning glyph (never colour alone).
 */
import type { InventoryEntry, ItemDef, PlayerSheet, SpellDef, TechniqueDef, WeaponClass } from '../../game/types';
import { SPELLS } from '../../content/spells';
import { TECHNIQUES } from '../../content/items';
import type { UIHost } from '../contract';
import { h } from '../dom';
import { icon, itemIcon } from '../icons';

const KIND_LABEL: Record<string, string> = {
  weapon: 'Weapon', shield: 'Shield', catalyst: 'Catalyst', bow: 'Ranged weapon', armor: 'Armour', talisman: 'Talisman',
  consumable: 'Consumable', material: 'Smithing material', key: 'Key item', spellbook: 'Spell text', imprint: 'Imprint scroll',
  memory: 'Final Memory', ammo: 'Ammunition',
};
export const CLASS_LABEL: Record<WeaponClass | 'shield', string> = {
  straightSword: 'Straight sword', curvedSword: 'Curved sword', greatsword: 'Greatsword', dagger: 'Dagger', estoc: 'Estoc',
  axe: 'Axe', mace: 'Mace', hammer: 'Hammer', flail: 'Flail', spear: 'Spear', halberd: 'Halberd', staff: 'Staff', bell: 'Hand bell',
  censer: 'Censer', bow: 'Bow', crossbow: 'Crossbow', fist: 'Fist', shield: 'Shield',
};
const SLOT_LABEL: Record<string, string> = { head: 'Head', body: 'Body', arms: 'Arms', legs: 'Legs' };
const ATTR_SHORT: Record<string, string> = { strength: 'Str', dexterity: 'Dex', intellect: 'Int', devotion: 'Dev' };

/** Technique by id: from the host's list, else the content table. */
export function techniqueById(host: UIHost, id: string | null | undefined): TechniqueDef | null {
  if (!id) return null;
  return host.techniques().find((t) => t.id === id) ?? TECHNIQUES[id] ?? null;
}
/** Spell by id: from the host's known spells, else the content table. */
export function spellById(host: UIHost, id: string | null | undefined): SpellDef | null {
  if (!id) return null;
  return host.knownSpells().find((s) => s.id === id) ?? SPELLS[id] ?? null;
}

/** Imprinted technique on a weapon/shield (host), falling back to the item's default. */
function imprinted(host: UIHost, def: ItemDef): string | null {
  const own = def.weapon?.technique ?? def.shield?.technique ?? null;
  if (!def.weapon && !def.shield) return null;
  try { return host.imprintOptions(def.id).current ?? own; } catch { return own; }
}

const stat = (iconId: string, label: string, value: string | number, warn = false) => [
  h('span.icw', { html: icon(iconId) }), h('span', null, label),
  h('span.v', { style: warn ? 'color:var(--warn)' : '' }, String(value), warn ? h('span.warn-ic', { html: icon('warning') }) : null),
];

/** Full item detail panel contents. */
export function itemDetail(host: UIHost, entry: InventoryEntry | null, sheet: PlayerSheet | null, emptyText = 'Nothing equipped.'): HTMLElement {
  if (!entry) return h('div.d-empty', null, emptyText);
  const def = entry.def;
  const wrap = h('div');
  const sub = def.weapon ? CLASS_LABEL[def.weapon.class] : def.armor ? `Armour · ${SLOT_LABEL[def.armor.slot]}` : KIND_LABEL[def.kind] ?? def.kind;
  wrap.appendChild(h('div.d-head', null,
    h('div.d-icon', { html: itemIcon(def) }),
    h('div', null,
      h('div.d-name', null, def.name, entry.upgrade ? ` +${entry.upgrade}` : ''),
      h('div.d-kind', null, sub, entry.count > 1 ? ` · held ${entry.count}${def.stack ? ` / ${def.stack}` : ''}` : ''))));
  wrap.appendChild(h('div.rule.plain', { style: 'margin:0.9rem 0' }));

  const rows: HTMLElement[] = [];
  const unmet: string[] = [];
  if (def.weapon) {
    const w = def.weapon;
    const grid = h('div.statgrid');
    grid.append(...stat('stat_attack', 'Physical', w.damage.physical));
    if (w.damage.magic) grid.append(...stat('def_magic', 'Magic', w.damage.magic));
    if (w.damage.fire) grid.append(...stat('def_fire', 'Fire', w.damage.fire));
    grid.append(...stat('practice', 'Critical', `×${w.criticalMult.toFixed(1)}`));
    grid.append(...stat('stat_poise', 'Posture damage', `×${w.postureMult.toFixed(1)}`));
    if (w.casts) grid.append(...stat('stat_spell', 'Casts', w.casts === 'sorcery' ? 'Sorceries' : 'Rites'));
    grid.append(...stat('smith', 'Tempering', `+${entry.upgrade} / +${w.maxUpgrade}`));
    rows.push(grid);
    // scaling & requirements side by side per attribute
    const keys = ['strength', 'dexterity', 'intellect', 'devotion'] as const;
    const grades = h('div.grades');
    for (const k of keys) {
      const g = w.scaling[k];
      const req = w.requirements[k];
      if (!g && !req) continue;
      const have = sheet?.attributes[k] ?? 99;
      const bad = req !== undefined && have < req;
      if (bad) unmet.push(`${ATTR_SHORT[k]} ${req}`);
      grades.appendChild(h('div', { class: `grade${bad ? ' unmet' : ''}` },
        h('span.gk', null, ATTR_SHORT[k]),
        h('span.gv', null, g ?? '–'),
        h('span.gk', null, req ? `req ${req}` : '—', bad ? h('span.warn-ic', { html: icon('warning') }) : null)));
    }
    rows.push(h('div.section-label', null, 'Scaling · Requirements'), grades);
  }
  if (def.shield) {
    const s = def.shield;
    const grid = h('div.statgrid');
    grid.append(...stat('def_physical', 'Physical guard', `${Math.round(s.physicalGuard * (s.physicalGuard <= 1 ? 100 : 1))}%`));
    grid.append(...stat('def_magic', 'Magic guard', `${Math.round(s.magicGuard * (s.magicGuard <= 1 ? 100 : 1))}%`));
    grid.append(...stat('stat_poise', 'Guard stability', `${Math.round(s.stability * (s.stability <= 1 ? 100 : 1))}`));
    rows.push(grid);
  }
  if (def.armor) {
    const a = def.armor;
    const grid = h('div.statgrid');
    grid.append(...stat('def_physical', 'Physical', a.physical), ...stat('def_magic', 'Magic', a.magic), ...stat('def_fire', 'Fire', a.fire), ...stat('stat_poise', 'Poise', a.poise));
    rows.push(grid);
  }
  if (def.weapon || def.shield) {
    const t = techniqueById(host, imprinted(host, def));
    rows.push(h('div.section-label', null, 'Imprinted technique'));
    rows.push(t
      ? h('div.row', { style: 'background:none' }, h('span.icw', { html: icon(t.icon) }),
        h('div.row-main', null, h('div.row-title', null, t.name), h('div.row-sub', null, `${t.focus} focus · ${t.stamina} stamina`)))
      : h('div.faint', { style: 'font-style:italic' }, 'None imprinted.'));
  }
  // talisman/consumable effects are engine codes; their descriptions state the effect in words.
  if (def.spellbook) {
    const sp = spellById(host, def.spellbook.spell);
    if (sp) rows.push(h('div.section-label', null, 'Teaches'), spellSummary(sp, sheet));
  }
  if (def.imprint) {
    const t = techniqueById(host, def.imprint.technique);
    if (t) rows.push(h('div.section-label', null, 'Imprints'), techniqueSummary(t));
  }
  if (def.weight !== undefined && def.weight > 0) {
    const g = h('div.statgrid', { style: 'margin-top:0.5rem' });
    g.append(...stat('stat_load', 'Weight', def.weight.toFixed(1)));
    rows.push(g);
  }
  if (def.price) {
    const g = h('div.statgrid');
    g.append(...stat('hours', 'Value', `${def.price} Hours`));
    rows.push(g);
  }
  wrap.append(...rows);
  if (unmet.length) wrap.appendChild(h('div.unmet-note', null, h('span.icw', { html: icon('warning') }), `Requirements not met (${unmet.join(', ')}): reduced damage and no technique.`));
  wrap.appendChild(h('div.d-desc', { style: 'margin-top:0.9rem' }, def.description));
  if (def.lore) wrap.appendChild(h('div.d-lore', null, def.lore));
  return wrap;
}

/** Compact spell block: costs, school, requirements (with unmet glyph), description. */
export function spellSummary(sp: SpellDef, sheet: PlayerSheet | null): HTMLElement {
  const grid = h('div.statgrid');
  grid.append(...stat('stat_spell', 'School', sp.school === 'sorcery' ? 'Sorcery' : 'Bell rite'));
  grid.append(...stat('stat_focus', 'Focus', sp.focus));
  grid.append(...stat('stat_stamina', 'Stamina', sp.stamina));
  grid.append(...stat('attune', 'Slots', sp.slots ?? 1));
  for (const [k, v] of Object.entries(sp.requirements)) {
    const have = sheet?.attributes[k as 'intellect' | 'devotion'] ?? 99;
    grid.append(...stat(k, `Requires ${k === 'intellect' ? 'Intellect' : 'Devotion'}`, v ?? 0, have < (v ?? 0)));
  }
  return h('div', null, grid, h('div.d-desc', { style: 'margin-top:0.6rem' }, sp.description), sp.source ? h('div.d-lore', null, `Source: ${sp.source}`) : null);
}

/** Compact technique block: costs, compatible classes, description. */
export function techniqueSummary(t: TechniqueDef): HTMLElement {
  const grid = h('div.statgrid');
  grid.append(...stat('stat_focus', 'Focus', t.focus));
  grid.append(...stat('stat_stamina', 'Stamina', t.stamina));
  return h('div', null, grid,
    h('div.d-desc', { style: 'margin-top:0.6rem' }, t.description),
    t.compatible?.length ? h('div.d-lore', null, `Imprints onto: ${t.compatible.map((c) => CLASS_LABEL[c] ?? c).join(', ')}`) : null,
    t.source ? h('div.d-lore', null, `Source: ${t.source}`) : null);
}

/** Detail panel header for a spell or technique (big icon + name). */
export function bigHead(iconId: string, name: string, sub: string): HTMLElement {
  return h('div', null,
    h('div.d-head', null, h('div.d-icon', { html: icon(iconId) }), h('div', null, h('div.d-name', null, name), h('div.d-kind', null, sub))),
    h('div.rule.plain', { style: 'margin:0.9rem 0' }));
}

/** Slot/inventory tile (icon + count + upgrade). */
export function tile(entry: InventoryEntry | null, cls: 'slot' | 'tile', placeholder = 'generic'): HTMLElement {
  const el = h('div', { class: `${cls}${entry ? '' : ' empty'}`, html: entry ? itemIcon(entry.def) : icon(placeholder) });
  if (entry?.upgrade) el.appendChild(h('span.upg', null, `+${entry.upgrade}`));
  if (entry && entry.count > 1) el.appendChild(h('span.cnt', null, String(entry.count)));
  return el;
}
