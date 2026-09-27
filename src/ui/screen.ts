/**
 * Screen base class, the UI context screens talk to, and reusable widgets (tabs, prompts,
 * setting rows). Screens are plain classes that own a root element; UI.ts keeps them in a stack.
 */
import type { ActionId, UiNavEvent } from '../input/actions';
import type { Settings } from '../game/settings';
import type { ToastKind, UIHost } from './contract';
import { h } from './dom';
import type { PromptDef } from './glyphs';
import { icon } from './icons';
import { Nav, navItem } from './nav';

/** UI sound cues (subset of the audio CueId list). */
export type UiCue = 'ui_move' | 'ui_confirm' | 'ui_back' | 'ui_error' | 'ui_open' | 'ui_close' | 'ui_levelup' | 'ui_tab';

/** What screens can ask of the UI. Implemented by UI.ts. */
export interface UICtx {
  readonly host: UIHost;
  settings(): Settings;
  /** Apply a modified copy of the settings (live preview + persistence via host). */
  applySettings(s: Settings): void;
  push(s: Screen): void;
  /** Pop `s` (and anything above it); default: the top screen. */
  pop(s?: Screen): void;
  closeAll(): void;
  confirm(title: string, body: string, yes?: string, no?: string): Promise<boolean>;
  toast(text: string, kind?: ToastKind, icon?: string): void;
  sound(cue: UiCue): void;
  /** A live glyph badge that re-renders when the device or pad style changes. */
  glyph(g: { nav?: UiNavEvent; action?: ActionId; text?: string }): HTMLElement;
  /** A footer prompt bar (live glyphs; clickable when `onClick` is given). */
  prompts(defs: PromptDef[]): HTMLElement;
}

/** Base class for full-screen menus. */
export abstract class Screen {
  readonly el: HTMLElement;
  readonly nav: Nav;
  /** Whether this screen blocks gameplay input. */
  blocking = true;
  /** How the HUD behaves under this screen. */
  hud: 'dim' | 'hidden' | 'visible' = 'dim';
  /** Resolved when the screen is popped (for promise-returning screens). */
  onClosed: (() => void) | null = null;

  constructor(protected ctx: UICtx, cls: string) {
    this.el = h('div', { class: `screen ${cls}` });
    this.nav = new Nav(() => this.navScope(), (el) => this.onFocus(el));
    this.nav.bindPointer(this.el);
  }

  /** Element whose descendants are navigable. */
  navScope(): HTMLElement { return this.el; }
  /** Build (or rebuild) the DOM. */
  abstract render(): void;
  /** Focus changed (update detail panels / help). */
  protected onFocus(_el: HTMLElement): void {}

  /** Called when pushed or revealed again after the screen above closes. */
  show(first: boolean): void {
    if (first) this.render();
    else this.refresh();
    this.nav.ensure();
  }
  /** Rebuild keeping focus (by `data-key`) — used when data may have changed. */
  refresh(): void {
    const key = this.nav.focused?.getAttribute('data-key') ?? null;
    this.render();
    this.nav.restore(key);
  }

  /** Dispatch one nav event. */
  handle(ev: UiNavEvent): void {
    switch (ev) {
      case 'back': this.onBack(); return;
      case 'pause': this.onPause(); return;
      case 'journal': this.onJournal(); return;
      case 'tabPrev': this.onTab(-1); return;
      case 'tabNext': this.onTab(1); return;
      case 'details': if (!this.nav.handle(ev)) this.onDetails(); return;
      case 'confirm': if (this.nav.handle(ev)) this.ctx.sound('ui_confirm'); return;
      default: if (this.nav.handle(ev)) this.ctx.sound('ui_move');
    }
  }
  protected onBack(): void { this.ctx.sound('ui_back'); this.ctx.pop(this); }
  protected onPause(): void { this.onBack(); }
  protected onJournal(): void {}
  protected onTab(_d: number): void {}
  protected onDetails(): void {}
  /** Per frame while on top. */
  update(_dt: number): void {}
  /** Called once when removed from the stack. */
  destroy(): void { this.onClosed?.(); this.onClosed = null; }
}

// ------------------------------------------------------------------ widgets

export interface TabDef { id: string; label: string; icon?: string }

/** Tab strip with LB/RB glyphs at the ends; tabs are clickable. */
export function tabBar(ctx: UICtx, tabs: TabDef[], active: string, select: (id: string) => void): HTMLElement {
  const bar = h('div.tabs');
  bar.appendChild(ctx.glyph({ nav: 'tabPrev' }));
  for (const t of tabs) {
    bar.appendChild(h('div', { class: `tab${t.id === active ? ' active' : ''}`, onclick: () => select(t.id) },
      t.icon ? h('span.icw', { html: icon(t.icon) }) : null, t.label));
  }
  bar.appendChild(ctx.glyph({ nav: 'tabNext' }));
  return bar;
}

/** Cycle index helper for tabs. */
export function cycle<T>(list: readonly T[], cur: T, d: number): T {
  const i = list.indexOf(cur);
  return list[(i + d + list.length) % list.length]!;
}

/** Screen header: title, subtitle, optional right-side content, then a hairline rule. */
export function header(title: string, sub?: string | null, right?: HTMLElement | null): HTMLElement {
  return h('div', null,
    h('div.scr-head', null, h('div.scr-title', null, title), sub ? h('div.scr-sub', null, sub) : null,
      right ? h('div.scr-head-right', null, right) : null),
    h('div.rule', { style: 'margin-top:0.9rem' }));
}

/** Footer: help text (updated by screens) + prompts. */
export function footer(ctx: UICtx, defs: PromptDef[], help?: HTMLElement): HTMLElement {
  return h('div', null, h('div.rule.plain', { style: 'margin:0.4rem 0 0.8rem' }),
    h('div.scr-foot', null, help ?? h('div.help'), ctx.prompts(defs)));
}

/** Standard back/select prompts. */
export const P_SELECT: PromptDef = { nav: 'confirm', label: 'Select' };
export const P_BACK: PromptDef = { nav: 'back', label: 'Back' };

// ------------------------------------------------------------------ setting rows

interface RowBase { label: string; icon?: string; help?: string; key: string }

/** Slider row: left/right step, mouse click/drag on the track. */
export function sliderRow(o: RowBase & { min: number; max: number; step: number; get: () => number; set: (v: number) => void; fmt?: (v: number) => string }): HTMLElement {
  const fill = h('i.fill');
  const thumb = h('i.thumb');
  const val = h('span.val');
  const track = h('div.track', null, fill, thumb);
  const paint = () => {
    const v = o.get();
    const t = (v - o.min) / (o.max - o.min);
    fill.style.transform = `scaleX(${Math.max(0, Math.min(1, t))})`;
    thumb.style.left = `${Math.max(0, Math.min(1, t)) * 100}%`;
    val.textContent = o.fmt ? o.fmt(v) : String(Math.round(v * 100) / 100);
  };
  const setV = (v: number) => {
    const q = Math.round((Math.max(o.min, Math.min(o.max, v)) - o.min) / o.step) * o.step + o.min;
    const r = Math.round(q * 1000) / 1000;
    if (r !== o.get()) { o.set(r); paint(); }
  };
  const fromPointer = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    setV(o.min + ((e.clientX - r.left) / r.width) * (o.max - o.min));
  };
  track.addEventListener('pointerdown', (e) => {
    fromPointer(e);
    track.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => fromPointer(ev);
    const up = () => { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
  });
  const row = h('div.set-row', { 'data-key': o.key, 'data-help': o.help ?? '' },
    h('div.set-label', null, o.icon ? h('span.icw', { html: icon(o.icon) }) : null, o.label),
    h('div.slider', null, track, val));
  paint();
  return navItem(row, {
    left: () => { setV(o.get() - o.step); return true; },
    right: () => { setV(o.get() + o.step); return true; },
    confirm: () => true,
  });
}

/** Choice row: ‹ value › cycling through options (toggles are two-option choices). */
export function choiceRow<T>(o: RowBase & { options: { v: T; label: string }[]; get: () => T; set: (v: T) => void }): HTMLElement {
  const cval = h('span.cval');
  const pips = h('div.pips');
  const paint = () => {
    const cur = o.get();
    const opt = o.options.find((x) => x.v === cur) ?? o.options[0]!;
    cval.textContent = opt.label;
    pips.innerHTML = o.options.length > 2 ? o.options.map((x) => `<i class="${x.v === cur ? 'on' : ''}"></i>`).join('') : '';
  };
  const step = (d: number) => {
    const i = o.options.findIndex((x) => x.v === o.get());
    const n = o.options[(i + d + o.options.length) % o.options.length]!;
    o.set(n.v);
    paint();
  };
  const row = h('div.set-row', { 'data-key': o.key, 'data-help': o.help ?? '' },
    h('div.set-label', null, o.icon ? h('span.icw', { html: icon(o.icon) }) : null, o.label),
    h('div', null,
      h('div.choice', null,
        h('span.arrow', { onclick: (e: Event) => { e.stopPropagation(); step(-1); } }, '‹'), cval,
        h('span.arrow', { onclick: (e: Event) => { e.stopPropagation(); step(1); } }, '›')),
      pips));
  row.addEventListener('click', () => step(1));
  paint();
  return navItem(row, {
    left: () => { step(-1); return true; },
    right: () => { step(1); return true; },
  });
}

/** On/Off toggle row. */
export function toggleRow(o: RowBase & { get: () => boolean; set: (v: boolean) => void; on?: string; off?: string }): HTMLElement {
  return choiceRow<boolean>({ ...o, options: [{ v: false, label: o.off ?? 'Off' }, { v: true, label: o.on ?? 'On' }] });
}

/** A menu list item (title/pause/stillbell). */
export function menuItem(label: string, iconId: string | null, onClick: () => void, opts: { key?: string; badge?: string; disabled?: boolean; sub?: string; help?: string } = {}): HTMLElement {
  const el = h('div.menu-item', { 'data-key': opts.key ?? label, 'data-help': opts.help ?? '', disabled: opts.disabled ? true : null },
    iconId ? h('span.icw', { html: icon(iconId) }) : null,
    h('span', null, label, opts.sub ? h('span.sub', null, opts.sub) : null),
    opts.badge ? h('span.badge', null, opts.badge) : null);
  el.addEventListener('click', () => { if (!opts.disabled) onClick(); });
  return navItem(el);
}
