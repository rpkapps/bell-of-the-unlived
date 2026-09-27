/**
 * Stillbell menu and its sub-screens: level & attributes, Recall Flask split (inline), travel,
 * spell attunement, Imprint Techniques and Final Memory exchange.
 */
import type { InventoryEntry, SpellDef } from '../../game/types';
import { h, fmtNum } from '../dom';
import { icon, itemIcon } from '../icons';
import { navItem } from '../nav';
import { header, menuItem, Screen, type UICtx } from '../screen';
import { AttributesScreen } from './attributes';
import { bigHead, CLASS_LABEL, spellById, spellSummary, techniqueById, techniqueSummary } from './details';
import { EquipmentScreen } from './equipment';
import { JournalScreen } from './journal';

export class StillbellScreen extends Screen {
  private help = h('div.help');
  private flaskVis = h('div.flask-split');
  private flaskVal = h('span.badge');

  constructor(ctx: UICtx) { super(ctx, 'side'); }

  render(): void {
    const c = this.ctx, host = c.host;
    const at = host.atStillbell();
    const sheet = host.sheet();
    const memories = host.pendingMemories();
    const spells = host.attunedSpells();

    const flaskRow = navItem(h('div.menu-item', { 'data-key': 'flask', 'data-help': 'Divide Recall Flask charges between health and focus. ← → to move a charge.' },
      h('span.icw', { html: icon('flask') }), h('span', null, 'Recall Flask'), this.flaskVal), {
      left: () => { this.shiftFlask(-1); return true; },
      right: () => { this.shiftFlask(1); return true; },
      confirm: () => { this.shiftFlask(1); return true; },
    });
    flaskRow.addEventListener('click', () => this.shiftFlask(1));

    const menu = h('div.menu', { 'data-nav-wrap': '' },
      menuItem('Level & Attributes', 'level', () => c.push(new AttributesScreen(c, false)), { key: 'level', help: 'Spend Hours to level, or redistribute every point freely.' }),
      flaskRow,
      menuItem('Travel', 'travel', () => c.push(new TravelScreen(c)), { key: 'travel', help: 'Ring your way to another lit Stillbell.' }),
      menuItem('Attune Spells', 'attune', () => c.push(new AttuneScreen(c)), { key: 'attune', help: 'Choose the spells you carry into three slots.' }),
      menuItem('Imprint Techniques', 'techniques', () => c.push(new ImprintScreen(c)), { key: 'imprint', help: 'Set the Imprint Technique a weapon or shield performs.' }),
      menuItem('Final Memories', 'memories', () => c.push(new MemoriesScreen(c)), { key: 'memories', badge: memories.length ? String(memories.length) : undefined, help: 'Exchange a keeper\'s Final Memory for a reward.' }),
      menuItem('Equipment', 'equipment', () => c.push(new EquipmentScreen(c, 'equipment')), { key: 'equipment', help: 'Arms, armour, talismans and quick items.' }),
      menuItem('Forememory', 'journal', () => c.push(new JournalScreen(c, 'leads')), { key: 'journal', help: 'Reconsider what you remember.' }),
      menuItem('Leave', 'leave', () => this.leave(), { key: 'leave', help: 'Rise from the Stillbell.' }));
    menu.firstElementChild?.setAttribute('data-nav-default', '');

    const kv = h('div.kv');
    const row = (ic: string, k: string, v: string) => kv.append(h('span.k', null, h('span.icw', { html: icon(ic) }), k), h('span.v', null, v));
    row('level', 'Level', String(sheet.level));
    row('hours', 'Hours held', fmtNum(sheet.hours));
    row('hours', 'Next level', fmtNum(sheet.nextLevelCost));
    row('memories', 'Final Memories', String(memories.length));
    const spellIcons = h('div', { style: 'display:flex;gap:0.4rem;margin-top:0.6rem' },
      spells.map((id) => { const sp = spellById(host, id); return h('div.status', { style: 'width:2.4rem;height:2.4rem', html: sp ? icon(sp.icon) : icon('generic'), title: sp?.name ?? 'Empty' }); }));

    this.el.replaceChildren(
      h('div.scr-head', null, h('div.scr-title', null, at?.name ?? 'Stillbell'), h('div.scr-sub', null, 'You rest. The Unlived stir again.')),
      h('div.rule', { style: 'margin-top:0.9rem;width:40rem' }),
      h('div.scr-body', null,
        h('div.side-menu', null, menu),
        h('div.side-info', null,
          h('div.panel', { style: 'padding:1.4rem 1.8rem' },
            h('div', { style: 'display:flex;gap:1rem;align-items:center;margin-bottom:0.9rem' },
              h('div', { style: 'width:3.6rem;height:3.6rem;color:var(--gold-hi)', html: icon('stillbell') }),
              h('div', null, h('div.panel-title', null, 'At rest'), h('div.panel-sub', null, 'Flasks refilled · the Unlived renewed'))),
            kv,
            h('div.section-label', null, 'Recall Flask'), this.flaskVis,
            h('div.section-label', null, 'Attuned spells'), spellIcons))),
      h('div.scr-foot', null, this.help, this.ctx.prompts([{ nav: 'confirm', label: 'Select' }, { nav: 'back', label: 'Leave', onClick: () => this.leave() }])),
    );
    this.paintFlask();
  }

  private paintFlask(): void {
    const f = this.ctx.host.flask();
    this.flaskVal.textContent = `${f.health} : ${f.focus}`;
    this.flaskVis.replaceChildren(
      h('span.cz', { style: 'font-size:0.8rem;color:var(--hp-hi)' }, `Health ${f.health}`),
      ...Array.from({ length: f.health }, () => h('span.pip', { html: icon('flask_health') })),
      h('span.dmd.on'),
      ...Array.from({ length: f.focus }, () => h('span.pip.fp', { html: icon('flask_focus') })),
      h('span.cz', { style: 'font-size:0.8rem;color:var(--fp-hi)' }, `Focus ${f.focus}`));
  }

  /** Move one charge: +1 → toward focus, −1 → toward health. */
  private shiftFlask(d: number): void {
    const f = this.ctx.host.flask();
    const health = Math.max(0, Math.min(f.total, f.health - d));
    if (health === f.health) { this.ctx.sound('ui_error'); return; }
    this.ctx.host.setFlaskSplit(health);
    this.ctx.sound('ui_move');
    this.paintFlask();
  }

  protected override onFocus(el: HTMLElement): void { this.help.textContent = el.getAttribute('data-help') ?? ''; }
  protected override onBack(): void { this.leave(); }

  private leave(): void {
    this.ctx.sound('ui_close');
    this.ctx.closeAll();
    this.ctx.host.leaveStillbell();
  }
}

// ------------------------------------------------------------------ travel

export class TravelScreen extends Screen {
  constructor(ctx: UICtx) { super(ctx, 'dim'); }

  render(): void {
    const dests = this.ctx.host.destinations();
    const list = h('div.list', { style: 'width:40rem', 'data-nav-wrap': '' });
    const regions = [...new Set(dests.map((d) => d.region))];
    for (const r of regions) {
      list.appendChild(h('div.section-label', null, r));
      for (const d of dests.filter((x) => x.region === r)) {
        const row = navItem(h('div', { class: `row${d.unlocked ? '' : ' locked'}`, 'data-key': d.id, disabled: d.unlocked ? null : true },
          h('span.icw', { html: icon(d.unlocked ? 'stillbell' : 'lock') }),
          h('div.row-main', null, h('div.row-title', null, d.unlocked ? d.name : 'Unlit Stillbell'), h('div.row-sub', null, d.unlocked ? r : 'Find and ring it to travel here.')),
          h('span.row-right', null, d.current ? 'You are here' : '')));
        if (d.current) row.setAttribute('data-nav-default', '');
        row.addEventListener('click', () => void this.go(d.id, d.name, d.current, d.unlocked));
        list.appendChild(row);
      }
    }
    this.el.replaceChildren(
      header('Travel', 'Every lit Stillbell answers every other.'),
      h('div.scr-body', null, list, h('div', { style: 'flex:1' })),
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts([{ nav: 'confirm', label: 'Travel' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  private async go(id: string, name: string, current: boolean, unlocked: boolean): Promise<void> {
    if (!unlocked || current) { this.ctx.sound('ui_error'); return; }
    if (!(await this.ctx.confirm('Travel', `Travel to ${name}?`, 'Travel', 'Stay'))) return;
    this.ctx.closeAll();
    this.ctx.host.travel(id);
  }
}

// ------------------------------------------------------------------ spell attunement

export class AttuneScreen extends Screen {
  private detail = h('div.detail.panel');
  private activeSlot = 0;

  constructor(ctx: UICtx) { super(ctx, 'dim'); }

  render(): void {
    const host = this.ctx.host;
    const attuned = host.attunedSpells();
    const known = host.knownSpells();
    const sheet = host.sheet();
    // Resolve slot occupancy: a two-slot spell also fills the next slot.
    const occ: { spell: SpellDef | null; cont: boolean }[] = [];
    for (let i = 0; i < 3; i++) {
      if (occ[i]) continue;
      const sp = spellById(host, attuned[i] ?? null);
      occ[i] = { spell: sp, cont: false };
      if (sp && (sp.slots ?? 1) >= 2 && i < 2 && (attuned[i + 1] == null || attuned[i + 1] === sp.id)) occ[i + 1] = { spell: sp, cont: true };
    }
    const slots = h('div.slot-grid', { style: 'grid-template-columns:repeat(3,5.6rem);gap:0.8rem' });
    occ.forEach((o, i) => {
      const el = navItem(h('div', { class: `slot${o.spell ? '' : ' empty'}`, style: `width:5.6rem;height:5.6rem;${o.cont ? 'opacity:.55' : ''}`, 'data-key': `slot:${i}`, 'data-slot': String(i), html: icon(o.spell?.icon ?? 'attune') }),
        { details: () => { this.attune(i, null); return true; } });
      el.appendChild(h('span.upg', null, ['I', 'II', 'III'][i]!));
      if (o.cont) el.appendChild(h('span.cnt', null, '⟵'));
      el.addEventListener('click', () => this.pick(i));
      if (i === this.activeSlot) el.setAttribute('data-nav-default', '');
      slots.appendChild(el);
    });

    const list = h('div.list', { style: 'flex:1' });
    const none = navItem(h('div.row', { 'data-key': 'sp:__none', 'data-spell': '' }, h('span.icw', { html: icon('close') }), h('div.row-main', null, h('div.row-title', null, 'Empty slot'))));
    none.addEventListener('click', () => this.attune(this.activeSlot, null));
    list.appendChild(none);
    for (const sp of known) {
      const unmet = Object.entries(sp.requirements).some(([k, v]) => sheet.attributes[k as 'intellect' | 'devotion'] < (v ?? 0));
      const isOn = attuned.includes(sp.id);
      const row = navItem(h('div', { class: `row${isOn ? ' equipped' : ''}`, 'data-key': `sp:${sp.id}`, 'data-spell': sp.id },
        h('span.icw', { html: icon(sp.icon) }),
        h('div.row-main', null, h('div.row-title', null, sp.name, unmet ? h('span.warn-ic', { html: icon('warning') }) : null),
          h('div.row-sub', null, `${sp.school === 'sorcery' ? 'Sorcery' : 'Bell rite'} · ${sp.focus} focus${(sp.slots ?? 1) > 1 ? ' · two slots' : ''}`)),
        h('span.row-right', null)));
      row.addEventListener('click', () => this.attune(this.activeSlot, sp.id));
      list.appendChild(row);
    }
    if (!known.length) list.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem' }, 'You know no spells yet. Grimoires and teachers can change that.'));

    this.el.replaceChildren(
      header('Attune Spells', 'Spells are cast with a catalyst in hand: staffs for sorceries, bells and censers for rites.'),
      h('div.scr-body', null,
        h('div', { style: 'width:22rem' }, h('div.section-label', { style: 'margin-top:0' }, 'Spell slots'), slots),
        h('div.cand-col', null, h('div.section-label', { style: 'margin-top:0' }, 'Known spells'), list),
        this.detail),
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts([{ nav: 'confirm', label: 'Attune' }, { nav: 'details', label: 'Clear slot' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  private pick(i: number): void {
    this.activeSlot = i;
    const cur = this.ctx.host.attunedSpells()[i];
    const t = (cur && this.el.querySelector<HTMLElement>(`[data-spell="${CSS.escape(cur)}"]`)) || this.el.querySelector<HTMLElement>('[data-spell]');
    if (t) this.nav.focus(t);
  }

  private attune(slot: number, id: string | null): void {
    const sp = spellById(this.ctx.host, id);
    if (sp && (sp.slots ?? 1) + slot > 3) {
      this.ctx.sound('ui_error');
      this.ctx.toast(`${sp.name} needs two slots. Attune it in slot I or II.`, 'warning');
      return;
    }
    this.ctx.host.attuneSpell(slot, id);
    this.ctx.sound('ui_confirm');
    this.activeSlot = slot;
    this.render();
    this.nav.restore(`slot:${slot}`);
  }

  protected override onFocus(el: HTMLElement): void {
    const host = this.ctx.host;
    const slot = el.getAttribute('data-slot');
    const spId = slot !== null ? host.attunedSpells()[Number(slot)] ?? null : el.getAttribute('data-spell');
    if (slot !== null) this.activeSlot = Number(slot);
    const sp = spellById(host, spId || null);
    this.detail.replaceChildren(sp ? h('div', null, bigHead(sp.icon, sp.name, sp.school === 'sorcery' ? 'Sorcery' : 'Bell rite'), spellSummary(sp, host.sheet())) : h('div.d-empty', null, 'An empty slot.'));
  }

  protected override onBack(): void {
    if (this.nav.focused?.hasAttribute('data-spell')) { this.ctx.sound('ui_back'); this.nav.restore(`slot:${this.activeSlot}`); return; }
    super.onBack();
  }
}

// ------------------------------------------------------------------ imprint techniques

export class ImprintScreen extends Screen {
  private detail = h('div.detail.panel');
  private techBox = h('div.list', { style: 'flex:1' });
  private techTitle = h('div.section-label', { style: 'margin-top:0' });
  private activeItem: InventoryEntry | null = null;
  private items: InventoryEntry[] = [];

  constructor(ctx: UICtx) { super(ctx, 'dim'); }

  render(): void {
    const host = this.ctx.host;
    this.items = host.inventory().filter((e) => e.def.weapon || e.def.shield);
    const list = h('div.list', { style: 'width:24rem' });
    this.items.forEach((e, i) => {
      const cur = techniqueById(host, this.currentOf(e));
      const row = navItem(h('div.row', { 'data-key': `it:${e.id}`, 'data-item': e.id },
        h('span.icw', { html: itemIcon(e.def) }),
        h('div.row-main', null, h('div.row-title', null, e.def.name, e.upgrade ? ` +${e.upgrade}` : ''),
          h('div.row-sub', null, cur ? cur.name : 'No technique'))));
      row.addEventListener('click', () => this.pickItem(e));
      if ((this.activeItem ? this.activeItem.id === e.id : i === 0)) row.setAttribute('data-nav-default', '');
      list.appendChild(row);
    });
    if (!this.activeItem) this.activeItem = this.items[0] ?? null;
    this.el.replaceChildren(
      header('Imprint Techniques', 'A weapon remembers one technique at a time. Any unlocked technique can be imprinted again later.'),
      h('div.scr-body', null,
        h('div', { style: 'display:flex;flex-direction:column;min-height:0' }, h('div.section-label', { style: 'margin-top:0' }, 'Arms & shields'), list),
        h('div.cand-col', null, this.techTitle, this.techBox),
        this.detail),
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts([{ nav: 'confirm', label: 'Imprint' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
    this.fillTechniques();
  }

  private currentOf(e: InventoryEntry): string | null {
    try { return this.ctx.host.imprintOptions(e.id).current; } catch { return e.def.weapon?.technique ?? e.def.shield?.technique ?? null; }
  }

  private fillTechniques(): void {
    const e = this.activeItem;
    this.techBox.textContent = '';
    if (!e) { this.techTitle.textContent = 'Techniques'; return; }
    const cls = e.def.weapon ? CLASS_LABEL[e.def.weapon.class] : 'Shield';
    this.techTitle.textContent = `Compatible · ${cls}`;
    const { current, options } = this.ctx.host.imprintOptions(e.id);
    for (const t of options) {
      const row = navItem(h('div', { class: `row${t.id === current ? ' equipped' : ''}`, 'data-key': `tq:${t.id}`, 'data-tech': t.id },
        h('span.icw', { html: icon(t.icon) }),
        h('div.row-main', null, h('div.row-title', null, t.name), h('div.row-sub', null, `${t.focus} focus · ${t.stamina} stamina`)),
        h('span.row-right')));
      row.addEventListener('click', () => void this.imprint(e, t.id, t.name));
      this.techBox.appendChild(row);
    }
    if (!options.length) this.techBox.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem' }, 'No unlocked technique suits this. Imprint scrolls and Final Memories unlock more.'));
  }

  private pickItem(e: InventoryEntry): void {
    this.activeItem = e;
    this.fillTechniques();
    const t = this.techBox.querySelector<HTMLElement>('.row.equipped') ?? this.techBox.querySelector<HTMLElement>('[data-nav]');
    if (t) this.nav.focus(t);
  }

  private async imprint(e: InventoryEntry, techId: string, name: string): Promise<void> {
    if (this.currentOf(e) === techId) { this.ctx.sound('ui_error'); return; }
    if (!(await this.ctx.confirm('Imprint Technique', `Imprint ${name} onto ${e.def.name}?`, 'Imprint', 'Cancel'))) return;
    if (this.ctx.host.imprint(e.id, techId)) {
      this.ctx.toast(`${e.def.name} now carries ${name}.`, 'info', techniqueById(this.ctx.host, techId)?.icon);
      this.refresh();
      this.nav.restore(`it:${e.id}`);
    } else {
      this.ctx.sound('ui_error');
      this.ctx.toast('That technique cannot be imprinted here.', 'warning');
    }
  }

  protected override onFocus(el: HTMLElement): void {
    const host = this.ctx.host;
    const itemId = el.getAttribute('data-item');
    if (itemId) {
      const e = this.items.find((x) => x.id === itemId) ?? null;
      if (e && e !== this.activeItem) { this.activeItem = e; this.fillTechniques(); }
      const t = e ? techniqueById(host, this.currentOf(e)) : null;
      this.detail.replaceChildren(t ? h('div', null, bigHead(t.icon, t.name, `Imprinted on ${e!.def.name}`), techniqueSummary(t)) : h('div.d-empty', null, 'No technique imprinted.'));
      return;
    }
    const t = techniqueById(host, el.getAttribute('data-tech'));
    if (t) this.detail.replaceChildren(h('div', null, bigHead(t.icon, t.name, 'Imprint Technique'), techniqueSummary(t)));
  }

  protected override onBack(): void {
    if (this.nav.focused?.hasAttribute('data-tech') && this.activeItem) { this.ctx.sound('ui_back'); this.nav.restore(`it:${this.activeItem.id}`); return; }
    super.onBack();
  }
}

// ------------------------------------------------------------------ final memories

const REWARD_KIND: Record<string, string> = { weapon: 'Weapon', technique: 'Imprint Technique', spell: 'Spell', hours: 'Hours', item: 'Item' };

export class MemoriesScreen extends Screen {
  constructor(ctx: UICtx) { super(ctx, 'dim'); }

  render(): void {
    const mems = this.ctx.host.pendingMemories();
    const body = h('div', { style: 'flex:1;overflow-y:auto;margin-top:1.4rem;padding:0.4rem' });
    if (!mems.length) body.appendChild(h('div.panel', { style: 'padding:2rem;text-align:center;font-style:italic;color:var(--text-dim);font-size:1.2rem;max-width:40rem;margin:4rem auto' },
      'You hold no Final Memory. When a keeper falls, what they last saw comes to you.'));
    for (const m of mems) {
      const cards = h('div.reward-cards');
      for (const r of m.rewards) {
        const card = navItem(h('div.reward', { 'data-key': `${m.id}:${r.id}` },
          h('div.ricon', { html: icon(r.icon, r.kind === 'hours' ? null : r.kind) }),
          h('div.rkind', null, REWARD_KIND[r.kind] ?? r.kind),
          h('div.rname', null, r.name),
          h('div.rdesc', null, r.description)));
        card.addEventListener('click', () => void this.exchange(m.id, m.bossName, r.id, r.name, r.icon));
        cards.appendChild(card);
      }
      body.appendChild(h('div.mem-group', null,
        h('div.section-label', null, h('span.icw', { html: icon('memories'), style: 'width:1.4rem;height:1.4rem' }), `Final Memory of ${m.bossName}`),
        h('div.faint', { style: 'font-style:italic;margin:0 0 0.8rem 0.3rem;font-size:1.05rem' }, 'Choose one. The others are lost with the memory.'),
        cards));
    }
    this.el.replaceChildren(
      header('Final Memories', 'What a fallen keeper last saw, given shape by the Stillbell.'),
      body,
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts([{ nav: 'confirm', label: 'Exchange' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  private async exchange(memId: string, boss: string, rewardId: string, name: string, iconId: string): Promise<void> {
    if (!(await this.ctx.confirm('Exchange Final Memory', `Exchange the Final Memory of ${boss} for ${name}?\nThe other rewards will be lost. This cannot be undone.`, 'Exchange', 'Not yet'))) return;
    if (this.ctx.host.exchangeMemory(memId, rewardId)) {
      this.ctx.sound('ui_levelup');
      this.ctx.toast(`${name} received.`, 'item', iconId);
      this.refresh();
    } else {
      this.ctx.sound('ui_error');
      this.ctx.toast('The memory will not give that shape.', 'warning');
    }
  }
}
