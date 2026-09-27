/**
 * Smith (temper weapons) and shop (buy for Hours). `showSmith` opens both tabs; `showShop` only Buy.
 * Missing materials or Hours are marked with a warning glyph as well as colour.
 */
import type { ShopEntry, UpgradeOption } from '../contract';
import { ITEMS } from '../../content/items';
import { h, fmtNum, setChildren } from '../dom';
import { icon } from '../icons';
import { navItem } from '../nav';
import { cycle, header, Screen, tabBar, type UICtx } from '../screen';
import { itemDetail } from './details';

type Tab = 'upgrade' | 'buy';

export class SmithScreen extends Screen {
  private detail = h('div.detail.panel');
  private upgrades: UpgradeOption[] = [];
  private stock: ShopEntry[] = [];

  constructor(ctx: UICtx, private npcId: string, private tab: Tab, private readonly tabs: Tab[]) { super(ctx, 'dim'); }

  render(): void {
    const sheet = this.ctx.host.sheet();
    const list = h('div.list', { style: 'width:34rem', 'data-nav-wrap': '' });
    if (this.tab === 'upgrade') {
      this.upgrades = this.ctx.host.upgradeOptions();
      for (const u of this.upgrades) {
        const row = navItem(h('div', { class: `row${u.maxed ? ' locked' : ''}`, 'data-key': `u:${u.itemId}`, 'data-up': u.itemId },
          h('span.icw', { html: icon(u.icon, 'weapon') }),
          h('div.row-main', null, h('div.row-title', null, u.name), h('div.row-sub', null, u.maxed ? 'Fully tempered' : `+${u.from} → +${u.to}`)),
          h('span.row-right', null, u.maxed ? '' : `${fmtNum(u.hours)} h`, !u.maxed && !u.affordable ? h('span.warn-ic', { html: icon('warning') }) : null)));
        row.addEventListener('click', () => void this.temper(u));
        list.appendChild(row);
      }
      if (!this.upgrades.length) list.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem' }, 'You carry nothing that can be tempered.'));
    } else {
      this.stock = this.ctx.host.shop(this.npcId);
      for (const s of this.stock) {
        const afford = sheet.hours >= s.price;
        const out = s.stock !== null && s.stock <= 0;
        const row = navItem(h('div', { class: `row${out ? ' locked' : ''}`, 'data-key': `b:${s.itemId}`, 'data-buy': s.itemId },
          h('span.icw', { html: icon(s.icon, ITEMS[s.itemId]?.kind) }),
          h('div.row-main', null, h('div.row-title', null, s.name), h('div.row-sub', null, s.stock === null ? 'Plenty in stock' : out ? 'Sold out' : `${s.stock} in stock`)),
          h('span.row-right', { style: afford ? '' : 'color:var(--warn)' }, `${fmtNum(s.price)} h`, afford ? null : h('span.warn-ic', { html: icon('warning') }))));
        row.addEventListener('click', () => void this.buy(s));
        list.appendChild(row);
      }
      if (!this.stock.length) list.appendChild(h('div.faint', { style: 'font-style:italic;padding:0.6rem' }, 'Nothing for sale.'));
    }
    list.querySelector('[data-nav]')?.setAttribute('data-nav-default', '');
    setChildren(this.el,
      header(this.tab === 'upgrade' ? 'The Forge' : 'Wares', this.tab === 'upgrade' ? 'Hesper Vail tempers what you carry.' : 'Paid in Hours.',
        h('span.stat-inline', null, h('span.icw', { html: icon('hours') }), 'Hours ', h('b', null, fmtNum(sheet.hours)))),
      this.tabs.length > 1 ? tabBar(this.ctx, [{ id: 'upgrade', label: 'Temper', icon: 'smith' }, { id: 'buy', label: 'Buy', icon: 'shop' }], this.tab, (id) => this.switchTab(id as Tab)) : null,
      h('div.scr-body', null, list, this.detail),
      h('div.scr-foot', null, h('div.help'), this.ctx.prompts([{ nav: 'confirm', label: this.tab === 'upgrade' ? 'Temper' : 'Buy' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  protected override onFocus(el: HTMLElement): void {
    const host = this.ctx.host;
    const up = this.upgrades.find((u) => u.itemId === el.getAttribute('data-up'));
    if (up) {
      const entry = host.inventory().find((e) => e.id === up.itemId) ?? null;
      const mats = h('div.materials', null, up.materials.map((m) => h('div', { class: `mat${m.have < m.need ? ' short' : ''}` },
        h('span.icw', { html: icon(m.id, 'material') }), h('span', null, m.name),
        h('span.mv', null, `${m.have} / ${m.need}`, m.have < m.need ? h('span.warn-ic', { html: icon('warning') }) : null))));
      const hoursShort = host.sheet().hours < up.hours;
      this.detail.replaceChildren(
        itemDetail(host, entry, host.sheet()),
        h('div.section-label', null, up.maxed ? 'Fully tempered' : `Temper to +${up.to}`),
        up.maxed ? h('div.faint', null, 'This weapon can be tempered no further.') : h('div', null,
          h('div.statgrid', null, h('span.icw', { html: icon('stat_attack') }), h('span', null, 'Attack'),
            h('span.v', null, `${up.preview.attack[0]} → `, h('b', { style: 'color:var(--gold-hi)' }, String(up.preview.attack[1]))),
            h('span.icw', { html: icon('hours') }), h('span', null, 'Hours'),
            h('span.v', { style: hoursShort ? 'color:var(--warn)' : '' }, fmtNum(up.hours), hoursShort ? h('span.warn-ic', { html: icon('warning') }) : null)),
          mats));
      return;
    }
    const s = this.stock.find((x) => x.itemId === el.getAttribute('data-buy'));
    if (s) {
      const def = ITEMS[s.itemId];
      const entry = def ? { id: s.itemId, count: 1, upgrade: 0, def } : null;
      this.detail.replaceChildren(entry ? itemDetail(host, entry, host.sheet()) : h('div', null, h('div.d-name', null, s.name), h('div.d-desc', null, s.description)));
    }
  }

  private async temper(u: UpgradeOption): Promise<void> {
    if (u.maxed || !u.affordable) { this.ctx.sound('ui_error'); if (!u.maxed) this.ctx.toast('You lack the materials or Hours.', 'warning'); return; }
    if (!(await this.ctx.confirm('Temper', `Temper ${u.name} to +${u.to} for ${fmtNum(u.hours)} Hours?`, 'Temper', 'Cancel'))) return;
    if (this.ctx.host.upgrade(u.itemId)) { this.ctx.sound('ui_levelup'); this.ctx.toast(`${u.name} tempered to +${u.to}.`, 'item', u.icon); }
    else { this.ctx.sound('ui_error'); this.ctx.toast('The forge would not take it.', 'warning'); }
    this.refresh();
  }

  private async buy(s: ShopEntry): Promise<void> {
    if (s.stock !== null && s.stock <= 0) { this.ctx.sound('ui_error'); return; }
    if (this.ctx.host.sheet().hours < s.price) { this.ctx.sound('ui_error'); this.ctx.toast('Not enough Hours.', 'warning'); return; }
    if (!(await this.ctx.confirm('Buy', `Buy ${s.name} for ${fmtNum(s.price)} Hours?`, 'Buy', 'Cancel'))) return;
    if (this.ctx.host.buy(this.npcId, s.itemId)) { this.ctx.sound('ui_confirm'); this.ctx.toast(s.name, 'item', s.icon); }
    else { this.ctx.sound('ui_error'); this.ctx.toast('The sale fell through.', 'warning'); }
    this.refresh();
  }

  protected override onTab(d: number): void { if (this.tabs.length > 1) this.switchTab(cycle(this.tabs, this.tab, d)); }

  private switchTab(t: Tab): void {
    if (t === this.tab) return;
    this.tab = t;
    this.ctx.sound('ui_tab');
    this.render();
    this.nav.focused = null;
    this.nav.ensure();
  }
}
