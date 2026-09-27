/**
 * Equipment & inventory. Equipment tab: slot grid → candidate list → item detail, with a load /
 * dodge / poise summary. Inventory tab: category chips, item grid, detail.
 */
import { EQUIP_SLOT_LABELS, type EquipSlot, type InventoryEntry, type ItemKind } from '../../game/types';
import { h } from '../dom';
import { icon, itemIcon } from '../icons';
import { navItem } from '../nav';
import { cycle, header, Screen, tabBar, type UICtx } from '../screen';
import { CLASS_LABEL, itemDetail, tile } from './details';

type Tab = 'equipment' | 'inventory';
const TABS: Tab[] = ['equipment', 'inventory'];

const GROUPS: { label: string; slots: EquipSlot[]; placeholder: string[] }[] = [
  { label: 'Arms', slots: ['right0', 'right1', 'left0', 'left1'], placeholder: ['kind_weapon', 'kind_weapon', 'kind_shield', 'kind_shield'] },
  { label: 'Armour', slots: ['head', 'body', 'arms', 'legs'], placeholder: ['helm', 'cuirass', 'gauntlet', 'greaves'] },
  { label: 'Talismans', slots: ['talisman0', 'talisman1'], placeholder: ['kind_talisman', 'kind_talisman'] },
  { label: 'Quick items', slots: ['quick0', 'quick1', 'quick2', 'quick3'], placeholder: ['kind_consumable', 'kind_consumable', 'kind_consumable', 'kind_consumable'] },
];

const FILTERS: { id: string; label: string; icon: string; kinds: ItemKind[] | null }[] = [
  { id: 'all', label: 'All', icon: 'inventory', kinds: null },
  { id: 'weapons', label: 'Weapons', icon: 'kind_weapon', kinds: ['weapon', 'catalyst', 'bow'] },
  { id: 'shields', label: 'Shields', icon: 'kind_shield', kinds: ['shield'] },
  { id: 'armour', label: 'Armour', icon: 'cuirass', kinds: ['armor'] },
  { id: 'talismans', label: 'Talismans', icon: 'kind_talisman', kinds: ['talisman'] },
  { id: 'consumables', label: 'Consumables', icon: 'kind_consumable', kinds: ['consumable', 'ammo'] },
  { id: 'materials', label: 'Materials', icon: 'tempered_scrap', kinds: ['material'] },
  { id: 'lore', label: 'Scrolls & keys', icon: 'kind_key', kinds: ['key', 'spellbook', 'imprint', 'memory'] },
];

export class EquipmentScreen extends Screen {
  private detail = h('div.detail.panel');
  private candBox = h('div.list', { style: 'flex:1' });
  private candTitle = h('div.section-label', { style: 'margin-top:0' });
  private activeSlot: EquipSlot = 'right0';
  private slotsData: Record<EquipSlot, InventoryEntry | null> | null = null;
  private filter = 'all';
  private invGrid = h('div.inv-grid');
  private invItems = new Map<string, InventoryEntry>();

  constructor(ctx: UICtx, private tab: Tab) { super(ctx, 'dim'); }

  render(): void {
    const body = h('div.scr-body');
    const sheet = this.ctx.host.sheet();
    if (this.tab === 'equipment') this.renderEquipment(body); else this.renderInventory(body);

    const lp = sheet.equipLoadMax > 0 ? sheet.equipLoad / sheet.equipLoadMax : 0;
    const summary = h('div.eq-summary', null,
      h('span.stat-inline', null, h('span.icw', { html: icon('stat_load') }), 'Load ', h('b', null, `${sheet.equipLoad.toFixed(1)} / ${sheet.equipLoadMax.toFixed(1)}`),
        h('span.muted', null, ` · ${sheet.loadClass}`), sheet.loadClass === 'overloaded' ? h('span.warn-ic', { html: icon('warning') }) : null),
      h('span.stat-inline', null, h('span.icw', { html: icon('stat_iframes') }), 'Dodge i-frames ', h('b', null, `${sheet.dodgeIFrames[0].toFixed(2)}–${sheet.dodgeIFrames[1].toFixed(2)} s`)),
      h('span.stat-inline', null, h('span.icw', { html: icon('stat_poise') }), 'Poise ', h('b', null, String(sheet.poise))),
      h('span.stat-inline', null, h('span.icw', { html: icon('stat_attack') }), 'Attack ', h('b', null, `${sheet.attackRight} / ${sheet.attackLeft}`)),
      h('div.load-bar', null, h('i', { style: `transform:scaleX(${Math.min(1, lp)})` })));

    this.el.replaceChildren(
      header(this.tab === 'equipment' ? 'Equipment' : 'Inventory', null, summary),
      tabBar(this.ctx, [{ id: 'equipment', label: 'Equipment', icon: 'equipment' }, { id: 'inventory', label: 'Inventory', icon: 'inventory' }], this.tab, (id) => this.switchTab(id as Tab)),
      body,
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts(this.tab === 'equipment'
        ? [{ nav: 'confirm', label: 'Change' }, { nav: 'details', label: 'Remove', onClick: () => this.unequipFocused() }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }]
        : [{ nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  // ---------------------------------------------------------------- equipment tab

  private renderEquipment(body: HTMLElement): void {
    const view = this.ctx.host.equipment();
    this.slotsData = view.slots;
    const col = h('div.eq-slots');
    for (const g of GROUPS) {
      col.appendChild(h('div.section-label', null, g.label));
      const grid = h('div.slot-grid');
      g.slots.forEach((slot, i) => {
        const entry = view.slots[slot];
        const el = navItem(tile(entry, 'slot', g.placeholder[i]), { details: () => { this.equip(slot, null); return true; } });
        el.setAttribute('data-key', `slot:${slot}`);
        el.setAttribute('data-slot', slot);
        el.setAttribute('title', EQUIP_SLOT_LABELS[slot]);
        el.addEventListener('click', () => this.pickFor(slot));
        if (slot === this.activeSlot) el.setAttribute('data-nav-default', '');
        grid.appendChild(el);
      });
      col.appendChild(grid);
    }
    body.append(col, h('div.cand-col', null, this.candTitle, this.candBox), this.detail);
    this.fillCandidates();
  }

  private fillCandidates(): void {
    const slot = this.activeSlot;
    const current = this.slotsData?.[slot] ?? null;
    this.candTitle.textContent = EQUIP_SLOT_LABELS[slot];
    this.candBox.textContent = '';
    const list = this.ctx.host.equipment().candidates(slot);
    if (current) {
      const rm = navItem(h('div.row', { 'data-key': 'cand:__none', 'data-cand': '' }, h('span.icw', { html: icon('close') }), h('div.row-main', null, h('div.row-title', null, 'Remove'), h('div.row-sub', null, 'Leave this slot empty'))));
      rm.addEventListener('click', () => this.equip(slot, null));
      this.candBox.appendChild(rm);
    }
    for (const e of list) {
      const isEq = current?.id === e.id;
      const sub = e.def.weapon ? CLASS_LABEL[e.def.weapon.class] : e.def.armor ? `Poise ${e.def.armor.poise} · Physical ${e.def.armor.physical}` : e.def.kind;
      const row = navItem(h('div', { class: `row${isEq ? ' equipped' : ''}`, 'data-key': `cand:${e.id}`, 'data-cand': e.id },
        h('span.icw', { html: itemIcon(e.def) }),
        h('div.row-main', null, h('div.row-title', null, e.def.name, e.upgrade ? ` +${e.upgrade}` : ''), h('div.row-sub', null, sub)),
        h('span.row-right', null, e.count > 1 ? `×${e.count}` : '', e.def.weight ? `${e.def.weight.toFixed(1)}` : '')));
      row.addEventListener('click', () => this.equip(slot, e.id));
      this.candBox.appendChild(row);
    }
    if (!list.length) this.candBox.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem' }, 'Nothing you carry fits here.'));
  }

  private pickFor(slot: EquipSlot): void {
    this.activeSlot = slot;
    this.fillCandidates();
    const cur = this.slotsData?.[slot];
    const target = (cur && this.candBox.querySelector<HTMLElement>(`[data-cand="${CSS.escape(cur.id)}"]`)) || this.candBox.querySelector<HTMLElement>('[data-nav]');
    if (target) this.nav.focus(target);
  }

  private equip(slot: EquipSlot, id: string | null): void {
    this.ctx.host.equip(slot, id);
    this.ctx.sound('ui_confirm');
    this.activeSlot = slot;
    this.render();
    this.nav.restore(`slot:${slot}`);
  }

  private unequipFocused(): void {
    const slot = this.nav.focused?.getAttribute('data-slot') as EquipSlot | null;
    if (slot) this.equip(slot, null);
  }

  // ---------------------------------------------------------------- inventory tab

  private renderInventory(body: HTMLElement): void {
    const chips = h('div.filter-row');
    for (const f of FILTERS) {
      const c = navItem(h('div', { class: `chip${f.id === this.filter ? ' active' : ''}`, 'data-key': `f:${f.id}` }, h('span.icw', { html: icon(f.icon) }), f.label),
        { focus: () => this.setFilter(f.id, chips) });
      c.addEventListener('click', () => this.setFilter(f.id, chips));
      chips.appendChild(c);
    }
    body.append(h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' }, chips, this.invGrid), this.detail);
    this.fillInventory();
  }

  private setFilter(id: string, chips: HTMLElement): void {
    if (id === this.filter) return;
    this.filter = id;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.getAttribute('data-key') === `f:${id}`));
    this.fillInventory();
  }

  private fillInventory(): void {
    const f = FILTERS.find((x) => x.id === this.filter)!;
    const all = this.ctx.host.inventory();
    const items = f.kinds ? all.filter((e) => f.kinds!.includes(e.def.kind)) : all;
    const equipped = new Set(Object.values(this.ctx.host.equipment().slots).filter(Boolean).map((e) => e!.id));
    this.invGrid.textContent = '';
    this.invItems.clear();
    items.forEach((e, i) => {
      const t = navItem(tile(e, 'tile'));
      t.setAttribute('data-key', `inv:${e.id}`);
      t.setAttribute('title', e.def.name);
      if (equipped.has(e.id)) t.appendChild(h('i.eqm'));
      if (i === 0) t.setAttribute('data-nav-default', '');
      this.invItems.set(`inv:${e.id}`, e);
      this.invGrid.appendChild(t);
    });
    if (!items.length) this.invGrid.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem;grid-column:1/-1' }, 'Nothing of this kind.'));
    this.detail.replaceChildren(h('div.d-empty', null, 'Select an item.'));
  }

  // ---------------------------------------------------------------- shared

  protected override onFocus(el: HTMLElement): void {
    const sheet = this.ctx.host.sheet();
    const slot = el.getAttribute('data-slot') as EquipSlot | null;
    if (slot) {
      if (slot !== this.activeSlot) { this.activeSlot = slot; this.fillCandidates(); }
      this.detail.replaceChildren(itemDetail(this.ctx.host, this.slotsData?.[slot] ?? null, sheet, `${EQUIP_SLOT_LABELS[slot]} is empty.`));
      return;
    }
    const cand = el.getAttribute('data-cand');
    if (cand !== null) {
      const e = cand ? this.ctx.host.equipment().candidates(this.activeSlot).find((x) => x.id === cand) ?? null : null;
      this.detail.replaceChildren(itemDetail(this.ctx.host, e, sheet, 'The slot will be left empty.'));
      return;
    }
    const inv = this.invItems.get(el.getAttribute('data-key') ?? '');
    if (inv) this.detail.replaceChildren(itemDetail(this.ctx.host, inv, sheet));
  }

  protected override onTab(d: number): void { this.switchTab(cycle(TABS, this.tab, d)); }

  private switchTab(t: Tab): void {
    if (t === this.tab) return;
    this.tab = t;
    this.ctx.sound('ui_tab');
    this.render();
    this.nav.focused = null;
    this.nav.ensure();
  }

  protected override onBack(): void {
    // In the candidate list, back returns to the slot first.
    if (this.nav.focused?.hasAttribute('data-cand')) {
      this.ctx.sound('ui_back');
      this.nav.restore(`slot:${this.activeSlot}`);
      return;
    }
    super.onBack();
  }
}
