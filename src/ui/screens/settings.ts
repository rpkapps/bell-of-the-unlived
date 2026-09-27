/**
 * Settings: Graphics, Audio, Gameplay, Accessibility and Controls (full per-device remapping).
 * Every change is applied live through `UICtx.applySettings` (→ host.applySettings).
 *
 * Settings are always read fresh from the host and modified on a copy, because the Input module
 * writes binding changes straight into the host's settings object.
 */
import type { Settings } from '../../game/settings';
import { ACTIONS, ACTION_LABELS, REQUIRED_ACTIONS, type ActionId, type Device, type KeyBinding, type PadBinding } from '../../input/actions';
import { cloneJson, h } from '../dom';
import { bindLabel, glyphBadge } from '../glyphs';
import { icon } from '../icons';
import { navItem } from '../nav';
import { choiceRow, cycle, header, Screen, sliderRow, tabBar, toggleRow, type UICtx } from '../screen';
import { CaptureScreen } from './confirm';

type Tab = 'graphics' | 'audio' | 'gameplay' | 'accessibility' | 'controls';
const TABS: Tab[] = ['graphics', 'audio', 'gameplay', 'accessibility', 'controls'];
const TAB_DEFS = [
  { id: 'graphics', label: 'Graphics', icon: 'graphics' }, { id: 'audio', label: 'Audio', icon: 'audio' },
  { id: 'gameplay', label: 'Gameplay', icon: 'gameplay' }, { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
  { id: 'controls', label: 'Controls', icon: 'controls' },
];
const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Actions that the pad performs with a stick rather than a button. */
const PAD_STICK: Partial<Record<ActionId, string>> = { moveForward: 'Left stick', moveBack: 'Left stick', moveLeft: 'Left stick', moveRight: 'Left stick' };

export class SettingsScreen extends Screen {
  private help = h('div.help');
  private info = h('div.panel', { style: 'width:30rem;padding:1.4rem 1.6rem;align-self:flex-start' });

  constructor(ctx: UICtx, private tab: Tab = 'graphics') { super(ctx, 'dim'); }

  private get s(): Settings { return this.ctx.host.getSettings(); }
  /** Modify a copy of the current settings and apply it. */
  private mut(fn: (s: Settings) => void): void {
    const s = cloneJson(this.s);
    fn(s);
    this.ctx.applySettings(s);
  }

  render(): void {
    const list = h('div.list', { style: 'width:52rem;padding-right:0.8rem' });
    switch (this.tab) {
      case 'graphics': this.graphics(list); break;
      case 'audio': this.audio(list); break;
      case 'gameplay': this.gameplay(list); break;
      case 'accessibility': this.accessibility(list); break;
      case 'controls': this.controls(list); break;
    }
    list.querySelector('[data-nav]')?.setAttribute('data-nav-default', '');
    const prompts = this.tab === 'controls'
      ? [{ glyph: '← →', label: 'Adjust' }, { nav: 'confirm' as const, label: 'Rebind' }, { nav: 'details' as const, label: 'Clear' }, { nav: 'back' as const, label: 'Back', onClick: () => this.onBack() }]
      : [{ glyph: '← →', label: 'Adjust' }, { nav: 'back' as const, label: 'Back', onClick: () => this.onBack() }];
    this.el.replaceChildren(
      header('Settings', 'Changes apply immediately.'),
      tabBar(this.ctx, TAB_DEFS, this.tab, (id) => this.switchTab(id as Tab)),
      h('div.scr-body', null, list, this.info),
      h('div.scr-foot', null, this.help, this.ctx.prompts(prompts)),
    );
  }

  protected override onFocus(el: HTMLElement): void {
    const help = el.getAttribute('data-help') ?? '';
    this.help.textContent = help;
    const label = el.querySelector('.set-label')?.textContent ?? el.getAttribute('data-title') ?? '';
    this.info.replaceChildren(h('div.panel-title', null, label || TAB_DEFS.find((t) => t.id === this.tab)!.label),
      h('div.rule.plain', { style: 'margin:0.7rem 0' }), h('div', { style: 'font-size:1.12rem;line-height:1.45' }, help || '—'));
  }

  // ---------------------------------------------------------------- tabs

  private graphics(list: HTMLElement): void {
    const g = () => this.s.graphics;
    list.append(
      choiceRow<Settings['graphics']['quality']>({ key: 'quality', label: 'Quality', icon: 'graphics', help: 'Overall detail: shadows, draw distance, effects.',
        options: [{ v: 'low', label: 'Low' }, { v: 'medium', label: 'Medium' }, { v: 'high', label: 'High' }, { v: 'ultra', label: 'Ultra' }],
        get: () => g().quality, set: (v) => this.mut((s) => { s.graphics.quality = v; }) }),
      sliderRow({ key: 'renderScale', label: 'Render scale', help: 'Internal resolution relative to the window. Lower is faster.', min: 0.5, max: 1.5, step: 0.05, fmt: pct,
        get: () => g().renderScale, set: (v) => this.mut((s) => { s.graphics.renderScale = v; }) }),
      sliderRow({ key: 'fov', label: 'Field of view', help: 'Vertical field of view in degrees.', min: 50, max: 90, step: 1, fmt: (v) => `${v}°`,
        get: () => g().fov, set: (v) => this.mut((s) => { s.graphics.fov = v; }) }),
      sliderRow({ key: 'brightness', label: 'Brightness', help: 'Exposure. Set it so the darkest bricks are just visible.', min: 0.5, max: 1.5, step: 0.05, fmt: pct,
        get: () => g().brightness, set: (v) => this.mut((s) => { s.graphics.brightness = v; }) }),
      choiceRow({ key: 'frameCap', label: 'Frame rate limit', help: 'Uncapped follows your display\'s refresh rate.',
        options: [{ v: 0, label: 'Uncapped' }, { v: 30, label: '30' }, { v: 60, label: '60' }, { v: 120, label: '120' }, { v: 144, label: '144' }],
        get: () => g().frameCap, set: (v) => this.mut((s) => { s.graphics.frameCap = v as Settings['graphics']['frameCap']; }) }),
      toggleRow({ key: 'bloom', label: 'Bloom', help: 'Soft glow around bright light.', get: () => g().bloom, set: (v) => this.mut((s) => { s.graphics.bloom = v; }) }),
      toggleRow({ key: 'filmGrain', label: 'Film grain', help: 'Fine grain over the image.', get: () => g().filmGrain, set: (v) => this.mut((s) => { s.graphics.filmGrain = v; }) }),
      toggleRow({ key: 'motionBlur', label: 'Motion blur', help: 'Blur during fast camera motion.', get: () => g().motionBlur, set: (v) => this.mut((s) => { s.graphics.motionBlur = v; }) }),
      sliderRow({ key: 'motionBlurStrength', label: 'Motion blur strength', help: 'How strong motion blur is when enabled.', min: 0, max: 1, step: 0.05, fmt: pct,
        get: () => g().motionBlurStrength, set: (v) => this.mut((s) => { s.graphics.motionBlurStrength = v; }) }),
      sliderRow({ key: 'cameraShake', label: 'Camera shake', help: 'Shake from heavy impacts and the Great Bells. 0% disables it.', min: 0, max: 1, step: 0.05, fmt: pct,
        get: () => g().cameraShake, set: (v) => this.mut((s) => { s.graphics.cameraShake = v; }) }),
      sliderRow({ key: 'effectsIntensity', label: 'Effects intensity', help: 'Particles, sparks and flashes.', min: 0, max: 1, step: 0.05, fmt: pct,
        get: () => g().effectsIntensity, set: (v) => this.mut((s) => { s.graphics.effectsIntensity = v; }) }),
      toggleRow({ key: 'reduceFlashes', label: 'Reduce flashes', help: 'Softens bright full-screen flashes (bell tolls, fire bursts, critical hits).', get: () => g().reduceFlashes, set: (v) => this.mut((s) => { s.graphics.reduceFlashes = v; }) }),
      toggleRow({ key: 'showFps', label: 'Show frame rate', help: 'A small counter in the top-right corner.', get: () => g().showFps, set: (v) => this.mut((s) => { s.graphics.showFps = v; }) }),
    );
  }

  private audio(list: HTMLElement): void {
    const a = () => this.s.audio;
    const vol = (key: 'master' | 'music' | 'sfx' | 'ambience' | 'voice' | 'ui', label: string, help: string, ic: string) =>
      sliderRow({ key, label, help, icon: ic, min: 0, max: 1, step: 0.05, fmt: pct, get: () => a()[key], set: (v) => this.mut((s) => { s.audio[key] = v; }) });
    list.append(
      vol('master', 'Master', 'Overall volume.', 'audio'),
      vol('music', 'Music', 'Score and boss themes.', 'hand_bell'),
      vol('sfx', 'Effects', 'Combat, footsteps, the world.', 'stat_attack'),
      vol('ambience', 'Ambience', 'Wind, fire, distant tolls.', 'map'),
      vol('voice', 'Voice', 'Spoken lines.', 'status'),
      vol('ui', 'Interface', 'Menu sounds.', 'settings'),
      toggleRow({ key: 'mono', label: 'Mono audio', help: 'Mix everything to both ears. Directional cues remain on screen through captions and the Toll indicator.', get: () => a().mono, set: (v) => this.mut((s) => { s.audio.mono = v; }) }),
    );
  }

  private gameplay(list: HTMLElement): void {
    const g = () => this.s.gameplay;
    list.append(
      toggleRow({ key: 'hints', label: 'Tutorial hints', help: 'Short context hints the first time something new happens.', get: () => g().hints, set: (v) => this.mut((s) => { s.gameplay.hints = v; }) }),
      toggleRow({ key: 'recenter', label: 'Camera auto-recenter', help: 'The camera drifts behind you while moving.', get: () => g().cameraAutoRecenter, set: (v) => this.mut((s) => { s.gameplay.cameraAutoRecenter = v; }) }),
      toggleRow({ key: 'showIFrames', label: 'Show i-frames', help: 'A faint bronze outline while a dodge makes you invulnerable.', get: () => g().showIFrames, set: (v) => this.mut((s) => { s.gameplay.showIFrames = v; }) }),
      toggleRow({ key: 'showHitboxes', label: 'Show hitboxes', help: 'Draw weapon sweeps and hurt capsules. For study: this is exactly what the game tests.', get: () => g().showHitboxes, set: (v) => this.mut((s) => { s.gameplay.showHitboxes = v; }) }),
    );
  }

  private accessibility(list: HTMLElement): void {
    const a = () => this.s.accessibility;
    list.append(
      toggleRow({ key: 'subtitles', label: 'Subtitles', help: 'Show spoken lines as text.', icon: 'journal', get: () => a().subtitles, set: (v) => this.mut((s) => { s.accessibility.subtitles = v; }) }),
      toggleRow({ key: 'speakerLabels', label: 'Speaker names', help: 'Name who is speaking before each line.', icon: 'status', get: () => a().speakerLabels, set: (v) => this.mut((s) => { s.accessibility.speakerLabels = v; }) }),
      toggleRow({ key: 'soundCaptions', label: 'Sound captions', help: 'Important sounds as text with direction, e.g. [Attack winding up — left].', icon: 'audio', get: () => a().soundCaptions, set: (v) => this.mut((s) => { s.accessibility.soundCaptions = v; }) }),
      sliderRow({ key: 'textScale', label: 'Text size', help: 'Scales all text and the HUD, from 80% to 160%.', icon: 'journal', min: 0.8, max: 1.6, step: 0.1, fmt: pct,
        get: () => a().textScale, set: (v) => this.mut((s) => { s.accessibility.textScale = v; }) }),
      toggleRow({ key: 'hv', label: 'High-visibility cues', help: 'Thicker outlines and larger lock-on, critical and focus markers.', icon: 'diamond', get: () => a().highVisibilityCues, set: (v) => this.mut((s) => { s.accessibility.highVisibilityCues = v; }) }),
      navItem(h('div.set-row', { 'data-key': 'toll', 'data-help': 'The bell at the top of the screen swings and its line glows toward an unresolved lead at crossroads. It never needs sound.' },
        h('div.set-label', null, h('span.icw', { html: icon('hand_bell') }), 'Unfinished Toll indicator'), h('div.choice', null, h('span.cval', null, 'Always shown')))),
      h('div.section-label', null, 'Hold or toggle'),
      ...this.holdRows(),
    );
  }

  private holdRows(): HTMLElement[] {
    const ht = () => this.s.accessibility.holdToggle;
    const row = (key: 'guard' | 'sprint' | 'walk' | 'chargeHeavy', label: string, help: string) =>
      choiceRow<'hold' | 'toggle'>({ key: `ht:${key}`, label, help, options: [{ v: 'hold', label: 'Hold' }, { v: 'toggle', label: 'Toggle' }],
        get: () => ht()[key], set: (v) => this.mut((s) => { s.accessibility.holdToggle[key] = v; }) });
    return [
      row('guard', 'Guard', 'Hold the button to guard, or press once to raise and again to lower.'),
      row('sprint', 'Sprint', 'Hold dodge to sprint, or press to toggle sprinting.'),
      row('walk', 'Walk', 'Hold or toggle walking.'),
      row('chargeHeavy', 'Charge heavy attack', 'Toggle: press once to begin charging and again to release.'),
    ];
  }

  private controls(list: HTMLElement): void {
    const c = () => this.s.controls;
    const g = () => this.s.gameplay;
    list.append(
      h('div.section-label', { style: 'margin-top:0.2rem' }, 'Controller & camera'),
      choiceRow<Settings['controls']['padLayout']>({ key: 'padLayout', label: 'Controller glyphs', help: 'Button names shown in prompts. Automatic follows the connected controller.',
        options: [{ v: 'auto', label: 'Automatic' }, { v: 'xbox', label: 'Xbox' }, { v: 'playstation', label: 'PlayStation' }],
        get: () => c().padLayout, set: (v) => { this.mut((s) => { s.controls.padLayout = v; }); this.repaintBindings(); } }),
      toggleRow({ key: 'swapSticks', label: 'Swap sticks', help: 'Move with the right stick and look with the left.', get: () => c().swapSticks, set: (v) => this.mut((s) => { s.controls.swapSticks = v; }) }),
      toggleRow({ key: 'invertY', label: 'Invert vertical look', help: 'Push up to look down.', get: () => g().invertY, set: (v) => this.mut((s) => { s.gameplay.invertY = v; }) }),
      toggleRow({ key: 'invertX', label: 'Invert horizontal look', help: 'Push right to look left.', get: () => g().invertX, set: (v) => this.mut((s) => { s.gameplay.invertX = v; }) }),
      sliderRow({ key: 'mouseSens', label: 'Mouse sensitivity', help: 'Camera speed with the mouse.', min: 0.1, max: 3, step: 0.05, fmt: (v) => v.toFixed(2),
        get: () => g().mouseSensitivity, set: (v) => this.mut((s) => { s.gameplay.mouseSensitivity = v; }) }),
      sliderRow({ key: 'padSens', label: 'Stick sensitivity', help: 'Camera speed with the right stick.', min: 0.1, max: 3, step: 0.05, fmt: (v) => v.toFixed(2),
        get: () => g().padSensitivity, set: (v) => this.mut((s) => { s.gameplay.padSensitivity = v; }) }),
      h('div.section-label', null, 'Hold or toggle'),
      ...this.holdRows(),
      h('div.section-label', null, 'Bindings'),
      this.bindingTable(),
      h('div.btn-row', { style: 'justify-content:flex-start;margin:1rem 0 0.6rem' },
        this.resetBtn('kbm', 'Reset keyboard & mouse'), this.resetBtn('pad', 'Reset controller')),
    );
  }

  private table: HTMLElement | null = null;

  private bindingTable(): HTMLElement {
    const t = h('div.bind-table');
    this.table = t;
    this.fillTable();
    return t;
  }

  private fillTable(): void {
    const t = this.table!;
    const input = this.ctx.host.input;
    const kb = input.getKeyBindings();
    const pad = input.getPadBindings();
    t.replaceChildren(h('div.bind-head', null, 'Action'), h('div.bind-head', null, 'Key 1'), h('div.bind-head', null, 'Key 2'), h('div.bind-head', null, 'Controller'));
    for (const a of ACTIONS) {
      const req = REQUIRED_ACTIONS.includes(a);
      t.appendChild(h('div.bind-label', { 'data-row': a }, ACTION_LABELS[a], req ? h('span.faint', { style: 'font-size:0.85rem' }, '  · required') : null));
      for (let slot = 0; slot < 2; slot++) t.appendChild(this.cell(a, 'kbm', slot, kb[a]?.[slot] ?? null));
      const stick = PAD_STICK[a];
      if (stick) t.appendChild(navItem(h('div.cell.unbound', { 'data-key': `b:${a}:pad:0`, 'data-help': 'The controller moves with the left stick.', 'data-title': ACTION_LABELS[a] }, stick)));
      else t.appendChild(this.cell(a, 'pad', 0, pad[a]?.[0] ?? null));
    }
  }

  private cell(a: ActionId, device: Device, slot: number, b: KeyBinding | PadBinding | null): HTMLElement {
    const label = bindLabel(this.ctx.host.input, b, device);
    const el = navItem(h('div', { class: `cell${b ? '' : ' unbound'}`, 'data-key': `b:${a}:${device}:${slot}`, 'data-title': ACTION_LABELS[a],
      'data-help': `${ACTION_LABELS[a]} — ${device === 'kbm' ? `keyboard & mouse, slot ${slot + 1}` : 'controller'}. Confirm to rebind; details to clear. A key already in use is swapped.` },
      b ? glyphBadge(label, device) : '—'), { details: () => { this.clearBinding(a, device, slot); return true; } });
    el.addEventListener('mouseenter', () => this.table?.querySelector(`[data-row="${a}"]`)?.classList.add('bind-row-label-focus'));
    el.addEventListener('mouseleave', () => this.table?.querySelector(`[data-row="${a}"]`)?.classList.remove('bind-row-label-focus'));
    el.addEventListener('click', () => void this.rebind(a, device, slot));
    return el;
  }

  private snapshot(device: Device): string {
    const input = this.ctx.host.input;
    return JSON.stringify(device === 'kbm' ? input.getKeyBindings() : input.getPadBindings());
  }

  /** Persist bindings the Input wrote into the host's settings. */
  private persist(): void { this.ctx.applySettings(cloneJson(this.s)); }

  private async rebind(a: ActionId, device: Device, slot: number): Promise<void> {
    const input = this.ctx.host.input;
    const cap = new CaptureScreen(this.ctx, `${ACTION_LABELS[a]} — ${device === 'kbm' ? `key ${slot + 1}` : 'controller'}`, device);
    this.ctx.push(cap);
    const b = await input.captureBinding(device);
    this.ctx.pop(cap);
    if (!b) return;
    const before = this.snapshot(device);
    if (device === 'kbm' && 'code' in b) input.setKeyBinding(a, slot, b);
    else if (device === 'pad' && 'button' in b) input.setPadBinding(a, slot, b);
    if (this.snapshot(device) === before) {
      const cur = device === 'kbm' ? input.getKeyBindings()[a][slot] : input.getPadBindings()[a][slot];
      if (JSON.stringify(cur) !== JSON.stringify(b)) this.ctx.toast('Pause and Interact must always keep a binding.', 'warning');
    } else this.ctx.sound('ui_confirm');
    this.persist();
    this.repaintBindings(`b:${a}:${device}:${slot}`);
  }

  private clearBinding(a: ActionId, device: Device, slot: number): void {
    const input = this.ctx.host.input;
    const before = this.snapshot(device);
    if (device === 'kbm') input.setKeyBinding(a, slot, null); else input.setPadBinding(a, slot, null);
    if (this.snapshot(device) === before && REQUIRED_ACTIONS.includes(a)) {
      this.ctx.sound('ui_error');
      this.ctx.toast(`${ACTION_LABELS[a]} must keep at least one binding.`, 'warning');
      return;
    }
    this.persist();
    this.repaintBindings(`b:${a}:${device}:${slot}`);
  }

  private resetBtn(device: Device, label: string): HTMLElement {
    const b = navItem(h('button.btn', { 'data-key': `reset:${device}`, 'data-help': 'Restore the default bindings for this device.' }, label));
    b.addEventListener('click', async () => {
      if (!(await this.ctx.confirm('Reset bindings', `${label} to the defaults?`, 'Reset', 'Cancel'))) return;
      this.ctx.host.input.resetBindings(device);
      this.mut((s) => { if (device === 'kbm') s.controls.keyboard = null; else s.controls.gamepad = null; });
      this.repaintBindings();
    });
    return b;
  }

  private repaintBindings(focusKey?: string): void {
    if (!this.table) return;
    const key = focusKey ?? this.nav.focused?.getAttribute('data-key') ?? null;
    this.fillTable();
    if (key?.startsWith('b:')) this.nav.restore(key);
  }

  protected override onTab(d: number): void { this.switchTab(cycle(TABS, this.tab, d)); }

  private switchTab(t: Tab): void {
    if (t === this.tab) return;
    this.tab = t;
    this.table = null;
    this.ctx.sound('ui_tab');
    this.render();
    this.nav.focused = null;
    this.nav.ensure();
  }

}
