/**
 * Level & attributes (one screen for levelling and free respec, GDD §2/§5.1).
 * Left/right lowers or raises the focused attribute. Any attribute may be lowered to the floor
 * (free respec); raising spends freed points first, then Hours. The host prices the result via
 * `previewAttributes`; derived statistics show current → preview. Read-only outside a Stillbell.
 */
import { ATTRIBUTES, ATTRIBUTE_FLOOR, ATTRIBUTE_HELP, ATTRIBUTE_LABELS, type Attribute, type Attributes, type PlayerSheet } from '../../game/types';
import { cloneJson, h, fmtNum, setChildren } from '../dom';
import { icon } from '../icons';
import { navItem } from '../nav';
import { header, Screen, type UICtx } from '../screen';

const ATTR_MAX = 99;
const LOAD_LABEL: Record<string, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy', overloaded: 'Overloaded' };

type Derived = { icon: string; label: string; get: (s: PlayerSheet) => number | string; better?: 'up' | 'down' };
const DERIVED: Derived[] = [
  { icon: 'stat_hp', label: 'Health', get: (s) => s.hpMax },
  { icon: 'stat_focus', label: 'Focus', get: (s) => s.focusMax },
  { icon: 'stat_stamina', label: 'Stamina', get: (s) => s.staminaMax },
  { icon: 'stat_load', label: 'Equip load', get: (s) => `${s.equipLoad.toFixed(1)} / ${s.equipLoadMax.toFixed(1)}` },
  { icon: 'stat_load', label: 'Load class', get: (s) => LOAD_LABEL[s.loadClass] ?? s.loadClass },
  { icon: 'stat_iframes', label: 'Dodge i-frames', get: (s) => `${s.dodgeIFrames[0].toFixed(2)}–${s.dodgeIFrames[1].toFixed(2)}` },
  { icon: 'stat_poise', label: 'Poise', get: (s) => s.poise },
  { icon: 'stat_attack', label: 'Attack (right)', get: (s) => s.attackRight },
  { icon: 'kind_shield', label: 'Attack (left)', get: (s) => s.attackLeft },
  { icon: 'stat_spell', label: 'Spell power', get: (s) => s.spellPower },
  { icon: 'def_physical', label: 'Physical defence', get: (s) => s.defense.physical },
  { icon: 'def_magic', label: 'Magic defence', get: (s) => s.defense.magic },
  { icon: 'def_fire', label: 'Fire defence', get: (s) => s.defense.fire },
];

export class AttributesScreen extends Screen {
  private base!: Attributes;
  private draft!: Attributes;
  private sheet!: PlayerSheet;
  private rowEls = new Map<Attribute, { cur: HTMLElement; nw: HTMLElement; l: HTMLElement; r: HTMLElement }>();
  private derivedBox = h('div.dgrid');
  private costBox = h('div.cost-box');
  private help = h('div.help');
  private commitBtn: HTMLElement | null = null;
  private levelEl = h('span');

  constructor(ctx: UICtx, private readonly readOnly: boolean) {
    super(ctx, readOnly ? 'dim' : 'side');
    this.el.classList.add('attr-screen');
  }

  render(): void {
    this.sheet = this.ctx.host.sheet();
    this.base = cloneJson(this.sheet.attributes);
    this.draft = cloneJson(this.base);
    this.rowEls.clear();
    const rows = h('div.attr-rows', { 'data-nav-wrap': '' });
    for (const a of ATTRIBUTES) {
      const cur = h('span.cur'), nw = h('span.new');
      const l = h('span.arr', { onclick: (e: Event) => { e.stopPropagation(); this.step(a, -1); } }, '‹');
      const r = h('span.arr', { onclick: (e: Event) => { e.stopPropagation(); this.step(a, 1); } }, '›');
      const row = h('div.attr-row', { 'data-key': a, 'data-help': ATTRIBUTE_HELP[a] },
        h('span.icw', { html: icon(a) }), h('span.name', null, ATTRIBUTE_LABELS[a]), cur, l, nw, r);
      this.rowEls.set(a, { cur, nw, l, r });
      rows.appendChild(this.readOnly ? navItem(row) : navItem(row, {
        left: () => { this.step(a, -1); return true; },
        right: () => { this.step(a, 1); return true; },
        confirm: () => { this.commit(); return true; },
      }));
    }
    rows.firstElementChild?.setAttribute('data-nav-default', '');

    const buttons = h('div.btn-row', { style: 'justify-content:flex-start;margin-top:1.2rem' });
    if (!this.readOnly) {
      this.commitBtn = navItem(h('button.btn.primary', { 'data-key': 'commit' }, h('span.icw', { html: icon('check') }), 'Commit'));
      this.commitBtn.addEventListener('click', () => this.commit());
      const reset = navItem(h('button.btn', { 'data-key': 'reset' }, 'Reset'));
      reset.addEventListener('click', () => { this.draft = cloneJson(this.base); this.paint(); });
      buttons.append(this.commitBtn, reset);
    }

    const at = this.ctx.host.atStillbell();
    this.el.replaceChildren(
      header(this.readOnly ? 'Status' : 'Attributes', this.readOnly ? 'Attributes can be changed at any Stillbell.' : `${at?.name ?? 'Stillbell'} · level freely, and redistribute every point at no cost`,
        h('span', null, h('span.stat-inline', null, h('span.icw', { html: icon('level') }), 'Level ', this.levelEl), '    ',
          h('span.stat-inline', null, h('span.icw', { html: icon('hours') }), 'Hours ', h('b', null, fmtNum(this.sheet.hours))))),
      h('div.scr-body', null,
        h('div', null, rows, this.readOnly ? null : this.costBox, buttons),
        h('div.derived.panel', null, h('div.panel-title', null, 'Derived statistics'), h('div.rule.plain', { style: 'margin:0.7rem 0 0.9rem' }), this.derivedBox)),
      h('div.scr-foot', null, this.help, this.ctx.prompts(this.readOnly
        ? [{ nav: 'back', label: 'Back', onClick: () => this.onBack() }]
        : [{ glyph: '← →', label: 'Lower / Raise' }, { nav: 'confirm', label: 'Commit', onClick: () => this.commit() }, { nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
    this.paint();
  }

  /** Keep the draft when a confirm dialog above closes. */
  protected override reveal(): void { this.paint(); }

  protected override onFocus(el: HTMLElement): void { this.help.textContent = el.getAttribute('data-help') || ''; }

  private step(a: Attribute, d: number): void {
    if (this.readOnly) return;
    const v = this.draft[a] + d;
    if (v < ATTRIBUTE_FLOOR || v > ATTR_MAX) { this.ctx.sound('ui_error'); return; }
    this.draft[a] = v;
    this.ctx.sound('ui_move');
    this.paint();
  }

  private changed(): boolean { return ATTRIBUTES.some((a) => this.draft[a] !== this.base[a]); }

  /** Update values, derived stats and cost without rebuilding rows. */
  private paint(): void {
    const pv = this.readOnly ? { sheet: this.sheet, hoursCost: 0, valid: true } : this.ctx.host.previewAttributes(this.draft);
    for (const a of ATTRIBUTES) {
      const r = this.rowEls.get(a)!;
      const b = this.base[a], n = this.draft[a];
      r.cur.textContent = String(b);
      r.nw.textContent = String(n);
      r.nw.className = `new${n > b ? ' up' : n < b ? ' down' : ''}`;
      r.nw.innerHTML = `${n}${n > b ? '<span class="delta-mark">▲</span>' : n < b ? '<span class="delta-mark">▼</span>' : ''}`;
      r.l.classList.toggle('off', this.readOnly || n <= ATTRIBUTE_FLOOR);
      r.r.classList.toggle('off', this.readOnly || n >= ATTR_MAX);
    }
    const lvA = this.sheet.level, lvB = pv.sheet.level;
    this.levelEl.innerHTML = lvB !== lvA ? `<b>${lvA}</b> → <b style="color:var(--gold-hi)">${lvB}</b>` : `<b>${lvA}</b>`;

    // derived: current → preview; arrows mark better (▲) / worse (▼) — shape, not colour alone
    this.derivedBox.textContent = '';
    for (const d of DERIVED) {
      const a = d.get(this.sheet), b = d.get(pv.sheet);
      const num = typeof a === 'number' && typeof b === 'number';
      const cls = num ? (b > a ? ' up' : b < a ? ' down' : '') : a !== b ? ' up' : '';
      this.derivedBox.append(h('span.icw', { html: icon(d.icon) }), h('span', null, d.label),
        h('span.a', null, String(a)), h('span.to', null, a !== b ? '→' : ''),
        h('span', { class: `b${cls}`, html: `${b}${cls === ' up' && num ? '<span class="delta-mark">▲</span>' : cls === ' down' ? '<span class="delta-mark">▼</span>' : ''}` }));
    }

    if (this.readOnly) return;
    let freed = 0, spent = 0;
    for (const a of ATTRIBUTES) { const dlt = this.draft[a] - this.base[a]; if (dlt < 0) freed -= dlt; else spent += dlt; }
    const spare = freed - spent;
    const after = this.sheet.hours - pv.hoursCost;
    const line = (k: string, v: string, strong = false) => h('div', { style: 'display:flex;justify-content:space-between;font-size:1.08rem' },
      h('span.muted', null, k), h('span.cz', { style: `font-size:0.92rem;${strong ? 'color:var(--gold-hi)' : ''}` }, v));
    setChildren(this.costBox,
      line('Points freed by respec', String(freed)),
      line(spare >= 0 ? 'Points still to assign' : 'Levels bought with Hours', String(Math.abs(spare)), spare > 0),
      line('Hours cost', fmtNum(pv.hoursCost), pv.hoursCost > 0),
      line('Hours after', fmtNum(after)),
      !pv.valid && this.changed() ? h('div.reason', null, h('span.icw', { html: icon('warning') }), pv.reason ?? 'Not possible.') : null,
    );
    if (this.commitBtn) {
      const ok = pv.valid && this.changed();
      this.commitBtn.toggleAttribute('disabled', !ok);
    }
  }

  private async commit(): Promise<void> {
    if (this.readOnly || !this.changed()) return;
    const pv = this.ctx.host.previewAttributes(this.draft);
    if (!pv.valid) { this.ctx.sound('ui_error'); this.ctx.toast(pv.reason ?? 'Those attributes cannot be set.', 'warning'); return; }
    const body = pv.hoursCost > 0
      ? `Set these attributes for ${fmtNum(pv.hoursCost)} Hours? Level ${this.sheet.level} → ${pv.sheet.level}.`
      : `Redistribute your attributes? This costs nothing and can be changed again at any Stillbell.`;
    if (!(await this.ctx.confirm('Commit attributes', body, 'Commit', 'Cancel'))) return;
    if (this.ctx.host.commitAttributes(this.draft)) {
      this.ctx.sound('ui_levelup');
      this.ctx.toast(pv.sheet.level > this.sheet.level ? `Level ${pv.sheet.level}` : 'Attributes redistributed', 'info', 'level');
      this.refresh();
    } else {
      this.ctx.sound('ui_error');
      this.ctx.toast('The Stillbell does not answer. Nothing was changed.', 'warning');
    }
  }

  protected override async onBack(): Promise<void> {
    if (!this.readOnly && this.changed()) {
      if (!(await this.ctx.confirm('Discard changes?', 'Your attribute changes have not been committed.', 'Discard', 'Keep editing'))) return;
    }
    this.ctx.sound('ui_back');
    this.ctx.pop(this);
  }
}
