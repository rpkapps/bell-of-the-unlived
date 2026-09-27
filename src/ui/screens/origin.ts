/**
 * Origin selection: six heraldic cards (unavailable ones read "Chronicle unwritten"), with a detail
 * panel showing the description, starting attributes and kit for the focused origin.
 */
import { ATTRIBUTES, ATTRIBUTE_LABELS, type OriginDef, type OriginId } from '../../game/types';
import { ITEMS } from '../../content/items';
import { SPELLS } from '../../content/spells';
import { h } from '../dom';
import { icon, itemIcon } from '../icons';
import { navItem } from '../nav';
import { header, Screen, type UICtx } from '../screen';

/** Pretty name for an unknown id ("retainer_sword" → "Retainer Sword"). */
const pretty = (id: string) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export class OriginScreen extends Screen {
  override hud = 'hidden' as const;
  private detail = h('div.origin-detail.panel');
  private origins: OriginDef[] = [];
  private resolve: (id: OriginId | null) => void;

  constructor(ctx: UICtx, resolve: (id: OriginId | null) => void) {
    super(ctx, 'opaque');
    this.resolve = resolve;
    this.onClosed = () => this.resolve(null);
  }

  render(): void {
    this.origins = this.ctx.host.origins();
    const cards = h('div.origin-cards');
    let first = true;
    for (const o of this.origins) {
      const card = navItem(h('div', { class: `card${o.available ? '' : ' unavailable'}`, 'data-key': o.id },
        h('div.crest', { html: icon(`origin_${o.id}`) }),
        h('div.cname', null, o.name),
        h('div.cmotto', null, o.available ? o.motto : '…'),
        o.available ? null : h('div.unwritten', null, h('span.icw', { html: icon('lock') }), 'Chronicle unwritten')));
      if (o.available && first) { card.setAttribute('data-nav-default', ''); first = false; }
      card.addEventListener('click', () => void this.choose(o));
      cards.appendChild(card);
    }
    this.el.replaceChildren(
      header('The Returned', 'Who were you, in the life the Bells erased?'),
      h('div', { style: 'margin-top:2rem' }, cards),
      this.detail,
      h('div.scr-foot', null, h('div.help', null, 'The origin sets only your starting attributes and equipment. Every build remains open.'),
        this.ctx.prompts([{ nav: 'confirm', label: 'Choose' }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }

  protected override onFocus(el: HTMLElement): void {
    const o = this.origins.find((x) => x.id === el.getAttribute('data-key'));
    if (o) this.showDetail(o);
  }

  private showDetail(o: OriginDef): void {
    const level = ATTRIBUTES.reduce((s, a) => s + o.attributes[a], 0) - 70 + 1;
    const attrs = h('div.attr-grid');
    for (const a of ATTRIBUTES) {
      const v = o.attributes[a];
      attrs.append(h('span.icw', { html: icon(a) }), h('span', null, ATTRIBUTE_LABELS[a]), h('span.v', null, String(v)),
        h('div.bar', null, h('i', { style: `transform:scaleX(${Math.min(1, v / 20)})` })));
    }
    const kit = h('div.kit-list');
    const seen = new Set<string>();
    for (const k of o.kit) {
      if (k.startsWith('spell:')) {
        const sp = SPELLS[k.slice(6)];
        kit.appendChild(h('div.kit', null, h('div.slot-mini', { html: icon(sp?.icon ?? k.slice(6), 'spellbook') }), h('span', null, sp?.name ?? pretty(k.slice(6)), h('span.faint', null, '  · spell'))));
        continue;
      }
      const def = ITEMS[k];
      // collapse an armour set to one line
      if (def?.armor && def.armorSet) {
        if (seen.has(def.armorSet)) continue;
        seen.add(def.armorSet);
        kit.appendChild(h('div.kit', null, h('div.slot-mini', { html: itemIcon(def) }), h('span', null, `${pretty(def.armorSet)} armour`, h('span.faint', null, '  · four pieces'))));
        continue;
      }
      kit.appendChild(h('div.kit', null, h('div.slot-mini', { html: def ? itemIcon(def) : icon(k) }), h('span', null, def?.name ?? pretty(k))));
    }
    this.detail.replaceChildren(
      h('div', null,
        h('div', { style: 'display:flex;gap:1rem;align-items:center' },
          h('div', { style: 'width:3.2rem;height:3.2rem;color:var(--gold-hi)', html: icon(`origin_${o.id}`) }),
          h('div', null, h('div.panel-title', { style: 'font-size:1.3rem' }, o.name), h('div.panel-sub', null, o.motto))),
        h('div.rule.plain', { style: 'margin:1rem 0' }),
        h('div.desc', null, o.available ? o.description : 'This chronicle is not yet written. Another life, another oath — for another time.'),
        h('div.small-caps', { style: 'margin-top:1.2rem' }, `Starting level ${level}`)),
      h('div', null, h('div.section-label', { style: 'margin-top:0' }, 'Attributes'), attrs),
      h('div', null, h('div.section-label', { style: 'margin-top:0' }, 'Equipment'), kit),
    );
    this.detail.style.opacity = o.available ? '1' : '0.6';
  }

  private async choose(o: OriginDef): Promise<void> {
    if (!o.available) { this.ctx.sound('ui_error'); this.ctx.toast('That chronicle is unwritten. Choose another origin.', 'info', 'lock'); return; }
    const ok = await this.ctx.confirm(`Begin as ${o.name}?`, `${o.motto}\nYour attributes can be redistributed freely at any Stillbell.`, 'Begin', 'Back');
    if (!ok) return;
    this.onClosed = null;
    this.resolve(o.id);
    this.ctx.pop(this);
  }
}
