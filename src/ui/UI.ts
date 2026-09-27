/**
 * The DOM UI overlay: implements IUI (called by the game) and UICtx (used by screens).
 *
 * Layers inside the #ui root, bottom to top: HUD · subtitles · notifications (toasts, hints,
 * banners) · screens · dialogue · modal (confirm / rebind) · fade · cinematic · loading · FPS.
 *
 * Input: every frame `update()` drains `IInput.consumeUi()` and routes events to the cinematic,
 * the modal on top, the dialogue, or the top screen, in that priority.
 */
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';

import type { Settings } from '../game/settings';
import type { DialogueChoice, DialogueLine, HudState, OriginId } from '../game/types';
import type { ActionId, UiNavEvent } from '../input/actions';
import type { BannerKind, IUI, ToastKind, UIHost } from './contract';
import { h } from './dom';
import { glyphBadge, glyphText, type PromptDef } from './glyphs';
import { Hud } from './hud';
import { Banners, Cinematic, DialogueView, Fader, Hints, Loading, Subtitles, Toasts } from './overlays';
import type { Screen, UICtx, UiCue } from './screen';
import { CaptureScreen, ConfirmScreen } from './screens/confirm';
import { JournalScreen } from './screens/journal';
import { OriginScreen } from './screens/origin';
import { PauseScreen } from './screens/pause';
import { SmithScreen } from './screens/smith';
import { StillbellScreen } from './screens/stillbell';
import { TitleScreen } from './screens/title';

/**
 * Optional host extensions the UI uses when present (see the contract change requests):
 * UI sounds, persistent "hint seen" flags, and discovered areas for the journal map.
 */
interface HostExtras {
  uiSound?(cue: UiCue): void;
  hintSeen?(id: string): boolean;
  markHintSeen?(id: string): void;
}

type GlyphSpec = { nav?: UiNavEvent; action?: ActionId; text?: string };

export class UI implements IUI, UICtx {
  host!: UIHost;
  private readonly root: HTMLElement;
  private readonly screensLayer = h('div.layer');
  private readonly modalLayer = h('div.layer');
  private readonly notifyLayer = h('div.layer');
  private readonly hudSlot = h('div.layer');
  private readonly fpsEl = h('div.fps.hidden');
  private hudView: Hud | null = null;
  private subs = new Subtitles();
  private toasts = new Toasts();
  private banners = new Banners();
  private hints!: Hints;
  private dialogueView!: DialogueView;
  private cine!: Cinematic;
  private fader = new Fader();
  private loadingView = new Loading();
  private stack: Screen[] = [];
  private hudVisible = true;
  private glyphSpecs = new WeakMap<HTMLElement, GlyphSpec>();
  private visualKey = '';
  private originDirty = true;

  constructor(root: HTMLElement) {
    this.root = root;
    root.classList.add('bu-root');
    root.setAttribute('aria-live', 'polite');
    this.notifyLayer.append(this.toasts.el, this.banners.el);
  }

  // ================================================================== IUI — lifecycle

  init(host: UIHost): void {
    this.host = host;
    this.hints = new Hints(this);
    this.dialogueView = new DialogueView(this);
    this.cine = new Cinematic(this);
    this.hudView = new Hud(this);
    this.hudSlot.appendChild(this.hudView.el);
    this.notifyLayer.appendChild(this.hints.el);
    this.root.replaceChildren(
      this.hudSlot, h('div.layer', null, this.subs.el), this.notifyLayer, this.screensLayer,
      this.dialogueView.el, this.modalLayer, this.fader.el, this.cine.el, h('div.layer', null, this.loadingView.el), this.fpsEl);
    host.input.on('device', () => this.refreshGlyphs());
    this.applyVisuals(host.getSettings());
    this.updateHudMode();
  }

  get blocking(): boolean {
    return this.stack.some((s) => s.blocking) || this.dialogueView.open || this.cine.open;
  }

  update(dt: number): void {
    if (!this.host) return;
    const d = Math.min(0.1, Math.max(0, dt));
    for (const ev of this.host.input.consumeUi()) this.route(ev);
    this.hudView?.tick(d);
    this.subs.tick(d);
    this.toasts.tick(d);
    this.hints.tick(d);
    this.banners.tick(d);
    this.dialogueView.tick(d);
    this.cine.tick(d);
    this.stack[this.stack.length - 1]?.update(d);
    // Settings may be changed by the game too (load, defaults); keep visuals in sync cheaply.
    this.applyVisuals(this.host.getSettings());
  }

  /** Route a nav event: cinematic → modal → dialogue → top screen. */
  private route(ev: UiNavEvent): void {
    if (this.cine.open) { this.cine.handle(ev); return; }
    const top = this.stack[this.stack.length - 1];
    if (top && this.isModal(top)) { top.handle(ev); return; }
    if (this.dialogueView.open) { this.dialogueView.handle(ev); return; }
    top?.handle(ev);
  }

  // ================================================================== screens

  showTitle(): void {
    this.closeAll();
    this.push(new TitleScreen(this));
  }

  showOriginSelect(): Promise<OriginId | null> { return this.originSelect(); }

  originSelect(): Promise<OriginId | null> {
    return new Promise((res) => this.push(new OriginScreen(this, res)));
  }

  showPause(): void { if (!this.stack.some((s) => s instanceof PauseScreen)) this.push(new PauseScreen(this)); }
  showStillbell(): void { this.closeAll(); this.push(new StillbellScreen(this)); }
  showJournal(): void { if (!this.stack.some((s) => s instanceof JournalScreen)) this.push(new JournalScreen(this, 'leads')); }
  showSmith(npcId: string): void { this.push(new SmithScreen(this, npcId, 'upgrade', ['upgrade', 'buy'])); }
  showShop(npcId: string): void { this.push(new SmithScreen(this, npcId, 'buy', ['buy'])); }
  showPractice(topicId?: string): void { this.push(new JournalScreen(this, 'practice', topicId)); }

  closeAll(): void {
    while (this.stack.length) this.removeTop();
    this.originDirty = true;
    this.updateHudMode();
  }

  confirm(title: string, body: string, yes = 'Yes', no = 'No'): Promise<boolean> {
    return new Promise((res) => this.push(new ConfirmScreen(this, title, body, yes, no, res)));
  }

  push(s: Screen): void {
    if (!this.blocking && s.blocking) { this.host.input.releaseAll(); this.host.input.setPointerLock(false); }
    const modal = this.isModal(s);
    if (!modal) for (const o of this.stack) if (!this.isModal(o)) o.el.classList.add('hidden');
    (modal ? this.modalLayer : this.screensLayer).appendChild(s.el);
    this.stack.push(s);
    s.show(true);
    if (!modal) this.sound('ui_open');
    this.updateHudMode();
  }

  pop(s?: Screen): void {
    const target = s ?? this.stack[this.stack.length - 1];
    if (!target) return;
    const i = this.stack.indexOf(target);
    if (i < 0) return;
    while (this.stack.length > i) this.removeTop();
    const top = this.stack[this.stack.length - 1];
    if (top) {
      top.el.classList.remove('hidden');
      // A modal being revealed keeps its DOM; the non-modal beneath it is revealed with it.
      for (let k = this.stack.length - 1; k >= 0; k--) { const o = this.stack[k]!; if (!this.isModal(o)) { o.el.classList.remove('hidden'); break; } }
      top.show(false);
    }
    this.updateHudMode();
  }

  private removeTop(): void {
    const s = this.stack.pop();
    if (!s) return;
    s.el.remove();
    s.destroy();
  }

  private isModal(s: Screen): boolean { return s instanceof ConfirmScreen || s instanceof CaptureScreen; }

  private updateHudMode(): void {
    if (!this.hudView) return;
    const hidden = !this.hudVisible || this.stack.some((s) => s.hud === 'hidden');
    const dim = !hidden && this.stack.some((s) => !this.isModal(s) && s.hud === 'dim');
    this.hudView.el.classList.toggle('off', hidden);
    this.hudView.el.classList.toggle('under-menu', dim);
  }

  // ================================================================== overlays

  setHudVisible(v: boolean): void {
    this.hudVisible = v;
    if (v) this.originDirty = true;
    this.updateHudMode();
  }

  hud(state: HudState): void {
    if (!this.hudView) return;
    if (this.originDirty) {
      this.originDirty = false;
      try { this.hudView.setOrigin(this.host.sheet().originId); } catch { this.hudView.setOrigin(null); }
    }
    this.hudView.set(state);
  }

  dialogue(lines: DialogueLine[], choices?: DialogueChoice[]): Promise<string | null> {
    this.host.input.releaseAll();
    this.host.input.setPointerLock(false);
    return this.dialogueView.start(lines, choices);
  }

  subtitle(line: DialogueLine): void {
    const a = this.settings().accessibility;
    if (!a.subtitles) return;
    this.subs.say(a.speakerLabels && line.speaker ? line.speaker : null, line.text, line.duration ?? Math.max(2.5, line.text.length * 0.065));
  }

  caption(text: string, dir?: 'left' | 'right' | 'ahead' | 'behind' | null): void {
    if (!this.settings().accessibility.soundCaptions) return;
    this.subs.caption(text, dir ?? null);
  }

  toast(text: string, kind: ToastKind = 'info', iconId?: string): void { this.toasts.show(text, kind, iconId); }

  banner(kind: BannerKind, title: string, subtitle?: string): void { this.banners.show(kind, title, subtitle); }

  hint(id: string, text: string, actions?: ActionId[]): void {
    if (!this.settings().gameplay.hints) return;
    const ex = this.host as UIHost & HostExtras;
    if (ex.hintSeen?.(id)) return;
    if (this.hints.show(id, text, actions)) ex.markHintSeen?.(id);
  }

  fade(to: 0 | 1, duration: number, color?: string): Promise<void> { return this.fader.to(to, duration, color); }

  cinematic(cards: { text: string; speaker?: string; duration: number; style?: 'memory' | 'plain' | 'title' }[]): Promise<void> {
    this.host.input.releaseAll();
    return this.cine.play(cards);
  }

  loading(progress: number | null, label?: string): void { this.loadingView.set(progress, label); }

  fps(v: number | null): void {
    if (v === null) { this.fpsEl.classList.add('hidden'); return; }
    this.fpsEl.classList.remove('hidden');
    const t = `${Math.round(v)} FPS`;
    if (this.fpsEl.textContent !== t) this.fpsEl.textContent = t;
  }

  // ================================================================== UICtx

  settings(): Settings { return this.host.getSettings(); }

  applySettings(s: Settings): void {
    this.host.applySettings(s);
    this.applyVisuals(s);
  }

  /** Text scale → root font-size; high-visibility cues → thicker outlines/markers. */
  private applyVisuals(s: Settings): void {
    const key = `${s.accessibility.textScale}|${s.accessibility.highVisibilityCues}|${s.controls.padLayout}`;
    if (key === this.visualKey) return;
    const padChanged = this.visualKey !== '' && this.visualKey.split('|')[2] !== s.controls.padLayout;
    this.visualKey = key;
    document.documentElement.style.setProperty('--ui-scale', String(s.accessibility.textScale));
    this.root.classList.toggle('hv', s.accessibility.highVisibilityCues);
    if (padChanged) this.refreshGlyphs();
  }

  sound(cue: UiCue): void { (this.host as UIHost & HostExtras | undefined)?.uiSound?.(cue); }

  glyph(g: GlyphSpec): HTMLElement {
    const el = h('span.live-glyph');
    this.glyphSpecs.set(el, g);
    this.paintGlyph(el, g);
    return el;
  }

  private paintGlyph(el: HTMLElement, g: GlyphSpec): void {
    const input = this.host.input;
    el.replaceChildren(glyphBadge(glyphText(input, g), g.text ? 'kbm' : input.device));
  }

  prompts(defs: PromptDef[]): HTMLElement {
    return h('div.prompts', null, defs.map((p) => {
      const el = h('span.prompt', null, this.glyph({ nav: p.nav, action: p.action, text: p.glyph }), h('span', null, p.label));
      if (p.onClick) el.addEventListener('click', (e) => { e.stopPropagation(); p.onClick!(); });
      return el;
    }));
  }

  /** Re-render every live glyph (device or pad style changed). */
  private refreshGlyphs(): void {
    this.root.querySelectorAll<HTMLElement>('.live-glyph').forEach((el) => {
      const g = this.glyphSpecs.get(el);
      if (g) this.paintGlyph(el, g);
    });
    this.hudView?.refreshGlyphs();
  }
}
