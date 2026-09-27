/**
 * Non-screen overlays: subtitles & sound captions, toasts, context hints, banners, the dialogue
 * panel, cinematic text cards, full-screen fades and the loading indicator.
 */
import type { DialogueChoice, DialogueLine } from '../game/types';
import type { ActionId, UiNavEvent } from '../input/actions';
import type { BannerKind, ToastKind } from './contract';
import { h } from './dom';
import { icon } from './icons';
import { Nav, navItem } from './nav';
import type { UICtx } from './screen';

// ------------------------------------------------------------------ subtitles & captions

type CapDir = 'left' | 'right' | 'ahead' | 'behind' | null | undefined;
const DIR_ARROW: Record<string, string> = { left: '◂', right: '▸', ahead: '▴', behind: '▾' };

interface SubLine { el: HTMLElement; t: number; key: string }

/** Bottom-centre subtitles (barks) and bracketed sound captions with direction arrows. */
export class Subtitles {
  readonly el = h('div.subs');
  private lines: SubLine[] = [];

  /** Show a spoken line. `speaker` null hides the label (setting off). */
  say(speaker: string | null, text: string, duration: number): void {
    const el = h('div.sub-line', null, speaker ? h('span.spk', null, speaker) : null, text);
    this.push(el, Math.max(2, duration), `s|${speaker}|${text}`);
  }

  /** Show a sound caption: "[Bell tolls — left]" with a direction arrow on the matching side. */
  caption(text: string, dir: CapDir): void {
    let body = text.trim();
    if (dir && !body.toLowerCase().includes(dir)) body = body.replace(/\]$/, '') + ` — ${dir}`;
    if (!body.startsWith('[')) body = `[${body}`;
    if (!body.endsWith(']')) body = `${body}]`;
    const arrow = dir ? h('span.dir', null, DIR_ARROW[dir] ?? '') : null;
    const el = h('div.sub-line.cap', null, dir === 'left' ? arrow : null, h('span', null, body), dir && dir !== 'left' ? arrow : null);
    this.push(el, 2.8, `c|${body}`);
  }

  private push(el: HTMLElement, t: number, key: string): void {
    // Refresh an identical line instead of stacking duplicates (repeated captions).
    const dup = this.lines.find((l) => l.key === key);
    if (dup) { dup.t = t; dup.el.classList.remove('fade'); return; }
    this.lines.push({ el, t, key });
    this.el.appendChild(el);
    while (this.lines.length > 3) this.lines.shift()!.el.remove();
  }

  tick(dt: number): void {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i]!;
      l.t -= dt;
      if (l.t <= 0.35 && !l.el.classList.contains('fade')) l.el.classList.add('fade');
      if (l.t <= 0) { l.el.remove(); this.lines.splice(i, 1); }
    }
  }

  clear(): void { this.lines.forEach((l) => l.el.remove()); this.lines = []; }
}

// ------------------------------------------------------------------ toasts

const TOAST_ICON: Record<ToastKind, string> = { item: 'inventory', info: 'diamond', journal: 'remembered', warning: 'warning', hours: 'hours' };
const TOAST_LABEL: Record<ToastKind, string> = { item: 'Acquired', info: 'Notice', journal: 'Forememory', warning: 'Warning', hours: 'Hours' };

export class Toasts {
  readonly el = h('div.toasts');
  private items: { el: HTMLElement; t: number }[] = [];

  show(text: string, kind: ToastKind = 'info', iconId?: string): void {
    const el = h('div', { class: `toast panel bare ${kind}` },
      h('span.icw', { html: icon(iconId ?? TOAST_ICON[kind], kind === 'item' ? 'consumable' : null) }),
      h('span', null, h('span.tk', null, TOAST_LABEL[kind]), text));
    this.el.appendChild(el);
    this.items.push({ el, t: kind === 'warning' ? 6 : 4.5 });
    while (this.items.length > 5) this.items.shift()!.el.remove();
  }

  tick(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]!;
      it.t -= dt;
      if (it.t <= 0.5) it.el.classList.add('out');
      if (it.t <= 0) { it.el.remove(); this.items.splice(i, 1); }
    }
  }
}

// ------------------------------------------------------------------ hints

export class Hints {
  readonly el = h('div');
  private cur: { el: HTMLElement; t: number } | null = null;
  private seen = new Set<string>();

  constructor(private ctx: UICtx) {}

  /** Mark hints as already seen (e.g. restored from a save by the host). */
  markSeen(ids: Iterable<string>): void { for (const id of ids) this.seen.add(id); }
  seenIds(): string[] { return [...this.seen]; }

  show(id: string, text: string, actions: ActionId[] = []): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.cur?.el.remove();
    const el = h('div.hint.panel', null,
      h('div.hk', null, h('span.icw', { html: icon('practice') }), 'Practice'),
      h('div.ht', null, text),
      actions.length ? h('div.hg', null, actions.map((a) => h('span', null, this.ctx.glyph({ action: a })))) : null);
    this.el.appendChild(el);
    this.cur = { el, t: 9 };
    return true;
  }

  tick(dt: number): void {
    if (!this.cur) return;
    this.cur.t -= dt;
    if (this.cur.t <= 0.5) this.cur.el.classList.add('out');
    if (this.cur.t <= 0) { this.cur.el.remove(); this.cur = null; }
  }
}

// ------------------------------------------------------------------ banners

const BANNER_TIME: Record<BannerKind, number> = { death: 5, bossDefeated: 5, stillbellLit: 3.6, memory: 4.2, area: 3.4, regionComplete: 6 };

/** Default banner titles (used when the game passes an empty title). */
export const BANNER_DEFAULTS: Record<BannerKind, string> = {
  death: 'THE BELL RECALLS YOU', bossDefeated: 'ANCHOR SHATTERED', stillbellLit: 'STILLBELL KINDLED',
  memory: 'FINAL MEMORY', area: '', regionComplete: 'ASHBRIDGE REMEMBERED',
};

export class Banners {
  readonly el = h('div');
  private cur: { el: HTMLElement; t: number } | null = null;

  show(kind: BannerKind, title: string, subtitle?: string): void {
    this.cur?.el.remove();
    const el = h('div', { class: `banner ${kind}` },
      h('div.rule.center.brule'),
      h('div.bt', null, (title || BANNER_DEFAULTS[kind]).toUpperCase()),
      subtitle ? h('div.bs', null, subtitle) : null,
      h('div.rule.center.brule'));
    this.el.appendChild(el);
    this.cur = { el, t: BANNER_TIME[kind] };
  }

  tick(dt: number): void {
    if (!this.cur) return;
    this.cur.t -= dt;
    if (this.cur.t <= 1.2) this.cur.el.classList.add('out');
    if (this.cur.t <= 0) { this.cur.el.remove(); this.cur = null; }
  }

  clear(): void { this.cur?.el.remove(); this.cur = null; }
}

// ------------------------------------------------------------------ dialogue

/** Conversation panel: speaker tab, typed text (skippable), choice list. Blocking while open. */
export class DialogueView {
  readonly el = h('div.layer');
  private panel: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private lines: DialogueLine[] = [];
  private choices: DialogueChoice[] = [];
  private i = 0;
  private shown = 0;
  private full = '';
  private nav: Nav | null = null;
  private resolve: ((id: string | null) => void) | null = null;
  private choosing = false;

  constructor(private ctx: UICtx) {}

  get open(): boolean { return this.resolve !== null; }

  start(lines: DialogueLine[], choices?: DialogueChoice[]): Promise<string | null> {
    this.finish(null);
    this.lines = lines.length ? lines : [{ speaker: '', text: '' }];
    this.choices = choices ?? [];
    this.i = 0;
    return new Promise((res) => {
      this.resolve = res;
      this.showLine();
    });
  }

  private showLine(): void {
    const line = this.lines[this.i]!;
    const showSpeaker = this.ctx.settings().accessibility.speakerLabels && !!line.speaker;
    this.textEl = h('div.dtext');
    this.full = line.text;
    this.shown = 0;
    this.choosing = false;
    this.panel?.remove();
    this.panel = h('div.dlg.panel', { onclick: (e: Event) => { if (!(e.target as HTMLElement).closest('[data-nav]')) this.advance(); } },
      showSpeaker ? h('div.dspk', null, line.speaker) : null,
      this.textEl,
      h('div.dchoices'),
      this.ctx.prompts([{ nav: 'confirm', label: 'Continue', onClick: () => this.advance() }]));
    this.el.appendChild(this.panel);
    this.paintText();
  }

  private paintText(): void {
    if (!this.textEl) return;
    const done = this.shown >= this.full.length;
    this.textEl.textContent = done ? this.full : this.full.slice(0, Math.floor(this.shown));
    if (done && !this.choosing && (this.i < this.lines.length - 1 || !this.choices.length)) this.textEl.appendChild(h('span.dmore'));
  }

  private showChoices(): void {
    if (!this.panel) return;
    this.choosing = true;
    const box = this.panel.querySelector('.dchoices') as HTMLElement;
    this.nav = new Nav(() => box);
    this.nav.bindPointer(box);
    this.choices.forEach((c, k) => {
      const row = navItem(h('div.row', c.disabled ? { 'data-key': c.id, class: 'dis' } : { 'data-key': c.id }, h('span.dmd'), h('span.row-main', null, c.text), c.disabled ? h('span.row-sub', null, c.disabled) : null));
      row.addEventListener('click', () => { this.ctx.sound('ui_confirm'); this.finish(c.id); });
      if (k === 0) row.setAttribute('data-nav-default', '');
      box.appendChild(row);
    });
    const prompts = this.panel.querySelector('.prompts');
    prompts?.replaceWith(this.ctx.prompts([{ nav: 'confirm', label: 'Choose' }]));
    this.paintText();
    this.nav.ensure();
  }

  /** Confirm: finish typing, next line, or show choices / close. */
  private advance(): void {
    if (this.choosing) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.paintText(); return; }
    if (this.i < this.lines.length - 1) { this.i++; this.showLine(); return; }
    if (this.choices.length) { this.showChoices(); return; }
    this.finish(null);
  }

  handle(ev: UiNavEvent): void {
    if (this.choosing && this.nav) {
      if (ev === 'confirm' || ev === 'up' || ev === 'down') { this.nav.handle(ev); if (ev !== 'confirm') this.ctx.sound('ui_move'); }
      return;
    }
    if (ev === 'confirm') this.advance();
    else if (ev === 'back' && this.shown < this.full.length) { this.shown = this.full.length; this.paintText(); }
  }

  tick(dt: number): void {
    if (!this.open || this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + dt * 72);
    this.paintText();
  }

  finish(id: string | null): void {
    const r = this.resolve;
    this.resolve = null;
    this.panel?.remove();
    this.panel = null;
    this.nav = null;
    r?.(id);
  }
}

// ------------------------------------------------------------------ cinematic cards

type Card = { text: string; speaker?: string; duration: number; style?: 'memory' | 'plain' | 'title' };

/** Letterbox + centred text cards. Confirm skips a card, Back skips the sequence. */
export class Cinematic {
  readonly el = h('div.layer');
  private root: HTMLElement | null = null;
  private cards: Card[] = [];
  private i = 0;
  private t = 0;
  private cardEl: HTMLElement | null = null;
  private resolve: (() => void) | null = null;
  private phase: 'in' | 'hold' | 'out' = 'in';

  constructor(private ctx: UICtx) {}
  get open(): boolean { return this.resolve !== null; }

  play(cards: Card[]): Promise<void> {
    this.stop();
    this.cards = cards;
    this.i = -1;
    this.root = h('div.cine', { onclick: () => this.next() },
      h('div.lb.t'), h('div.lb.b'),
      this.ctx.prompts([{ nav: 'confirm', label: 'Next', onClick: () => this.next() }, { nav: 'back', label: 'Skip', onClick: () => this.stop() }]));
    this.el.appendChild(this.root);
    return new Promise((res) => { this.resolve = res; this.next(); });
  }

  private next(): void {
    if (!this.root) return;
    this.cardEl?.classList.remove('on');
    const old = this.cardEl;
    if (old) setTimeout(() => old.remove(), 1000);
    this.i++;
    if (this.i >= this.cards.length) { setTimeout(() => this.stop(), 700); this.cardEl = null; return; }
    const c = this.cards[this.i]!;
    const el = h('div', { class: `card-text ${c.style ?? 'plain'}` },
      c.style === 'memory' ? h('div.cbell', { html: icon('hand_bell') }) : null,
      h('div.ct', null, c.text),
      c.speaker ? h('div.cs', null, `— ${c.speaker}`) : null);
    this.root.appendChild(el);
    void el.offsetWidth;
    el.classList.add('on');
    this.cardEl = el;
    this.t = 0;
    this.phase = 'in';
  }

  handle(ev: UiNavEvent): void {
    if (ev === 'confirm') this.next();
    else if (ev === 'back' || ev === 'pause') this.stop();
  }

  tick(dt: number): void {
    if (!this.root || !this.cardEl) return;
    this.t += dt;
    const c = this.cards[this.i];
    if (c && this.t >= c.duration + 1) this.next();
  }

  stop(): void {
    this.root?.remove();
    this.root = null;
    this.cardEl = null;
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }
}

// ------------------------------------------------------------------ fade & loading

export class Fader {
  readonly el = h('div.fade');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: (() => void) | null = null;
  value = 0;

  to(v: 0 | 1, duration: number, color = '#000'): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; this.pending?.(); this.pending = null; }
    this.el.style.background = color;
    this.el.style.transitionDuration = `${Math.max(0, duration)}s`;
    this.el.style.pointerEvents = v ? 'auto' : 'none';
    void this.el.offsetWidth;
    this.el.style.opacity = String(v);
    this.value = v;
    return new Promise((res) => {
      this.pending = res;
      this.timer = setTimeout(() => { this.timer = null; this.pending = null; res(); }, Math.max(0, duration) * 1000 + 20);
    });
  }
}

export class Loading {
  readonly el = h('div.loading.hidden');
  private label = h('div.ll');
  private bar = h('i');
  private barWrap = h('div.lbar', null, this.bar);

  constructor() {
    this.el.append(h('div.lbell', { html: icon('hand_bell') }), h('div', null, this.label, this.barWrap));
  }

  set(progress: number | null, label?: string): void {
    if (progress === null) { this.el.classList.add('hidden'); return; }
    this.el.classList.remove('hidden');
    this.label.textContent = label ?? 'Remembering';
    this.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  }
}
