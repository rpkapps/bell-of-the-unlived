/**
 * In-game HUD. `set(state)` is called every frame by the game; it writes only values that changed
 * and uses transforms/opacity for bars and markers (no per-frame innerHTML, no layout reads).
 * `tick(dt)` runs time-based animation: lagging damage chunks, the Unfinished Toll bell swing,
 * slot-name flashes.
 */
import type { HudEnemyBar, HudSlot, HudState } from '../game/types';
import type { ActionId } from '../input/actions';
import { h, fmtNum, roman } from './dom';
import { icon } from './icons';
import type { UICtx } from './screen';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const damp = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));

/** A resource bar with a lagging damage chunk. Width grows with the max value. */
class BarView {
  readonly el: HTMLElement;
  private fill = h('i.fill');
  private lag = h('i.lag');
  private v = -1;
  private lagV = 0;
  private hold = 0;
  private wRem = -1;
  private shownFill = -1;
  private shownLag = -1;

  constructor(cls: string, private centered = false) {
    this.el = h('div', { class: `bar ${cls}` }, centered ? null : this.lag, this.fill);
  }
  /** Set the bar length (rem) for a max value; only writes when it changes. */
  setWidth(rem: number): void {
    const r = Math.round(rem * 10) / 10;
    if (r !== this.wRem) { this.wRem = r; this.el.style.width = `${r}rem`; }
  }
  set(v01: number): void {
    const v = clamp01(v01);
    if (this.v < 0) this.lagV = v;
    if (v < this.v - 1e-4) this.hold = 0.55; // new damage: hold the chunk before draining
    if (v > this.lagV) this.lagV = v;
    this.v = v;
    this.write();
  }
  tick(dt: number): void {
    if (this.lagV > this.v) {
      if (this.hold > 0) this.hold -= dt;
      else this.lagV = Math.max(this.v, this.lagV - dt * 0.55);
      this.write();
    }
  }
  private write(): void {
    if (Math.abs(this.v - this.shownFill) > 0.0005) { this.shownFill = this.v; this.fill.style.transform = `scaleX(${this.v.toFixed(4)})`; }
    if (!this.centered && Math.abs(this.lagV - this.shownLag) > 0.0005) { this.shownLag = this.lagV; this.lag.style.transform = `scaleX(${this.lagV.toFixed(4)})`; }
  }
}

/** One equipment slot in the bottom-left cluster. */
class SlotView {
  readonly el: HTMLElement;
  private ic = h('div', { style: 'width:100%;height:100%' });
  private cnt = h('span.cnt');
  private upg = h('span.upg');
  private key = '';
  name = '';

  constructor(ctx: UICtx, cls: string, label: string, cycleAction: ActionId | null) {
    this.el = h('div', { class: `hslot ${cls}` }, this.ic, this.upg, this.cnt,
      cycleAction ? h('span.cyc', null, ctx.glyph({ action: cycleAction })) : null,
      h('span.slabel', null, label));
  }
  /** Returns true when the item changed (for the name flash). */
  set(s: HudSlot): boolean {
    const key = `${s.icon}|${s.count ?? ''}|${s.upgrade ?? ''}|${s.empty ? 1 : 0}|${s.name}`;
    if (key === this.key) return false;
    const nameChanged = s.name !== this.name && this.key !== '';
    this.key = key;
    this.name = s.name;
    this.ic.innerHTML = icon(s.empty ? 'generic' : s.icon);
    this.el.classList.toggle('empty', !!s.empty);
    this.cnt.textContent = s.count !== undefined && !s.empty ? String(s.count) : '';
    this.upg.textContent = s.upgrade ? `+${s.upgrade}` : '';
    if (nameChanged) {
      this.el.classList.remove('flash');
      void this.el.offsetWidth; // restart animation (only on change, not per frame)
      this.el.classList.add('flash');
    }
    return nameChanged;
  }
}

interface EnemyView { el: HTMLElement; hp: BarView; post: BarView; dmg: HTMLElement; x: number; y: number; vis: boolean; dmgV: number; used: boolean }

const CRIT_LABEL: Record<string, string> = { backstab: 'Backstab', riposte: 'Riposte', guardBreak: 'Guard broken', postureBreak: 'Posture broken' };
const TOLL_WORD = (dir: number, behind: boolean) => (behind ? 'Behind' : dir < -0.25 ? 'Left' : dir > 0.25 ? 'Right' : 'Ahead');

export class Hud {
  readonly el: HTMLElement;
  private dyn: HTMLElement;
  // top-left
  private portrait = h('div.portrait');
  private hp = new BarView('hp');
  private fp = new BarView('fp');
  private st = new BarView('st');
  private statusRow = h('div.statuses');
  private statusKey = '';
  private statusEls: HTMLElement[] = [];
  // toll
  private tollBell = h('div.tl-bell');
  private tollBright: SVGElement | null = null;
  private tollGlowL = h('div.tl-glow.l');
  private tollGlowR = h('div.tl-glow.r');
  private tollArrowL = h('div.tl-arrow.l', null, '◂');
  private tollArrowR = h('div.tl-arrow.r', null, '▸');
  private tollHalo = h('div.tl-halo');
  private tollLabel = h('div.tl-label');
  private toll = { angle: 0, phase: 0, gl: 0, gr: 0, halo: 0, lab: 0, word: '', bright: 0 };
  private tollWritten = { angle: 999, gl: -1, gr: -1, halo: -1, lab: -1, al: -1, ar: -1, bright: -1 };
  // bottom-left
  private quick: SlotView;
  private spell: SlotView;
  private right: SlotView;
  private left: SlotView;
  private flaskHp = h('b');
  private flaskFp = h('b');
  private flaskKey = '';
  private itemName = h('div.hud-itemname');
  private itemNameT = 0;
  // bottom-right
  private hoursVal = h('span.hval');
  private hoursDelta = h('span.hdelta');
  private hours = -1;
  // boss
  private boss = h('div.hud-boss.hidden');
  private bossName = h('span.bn');
  private bossTitle = h('span.bt');
  private bossPhase = h('span.bphase');
  private bossHp = new BarView('hp');
  private bossPost = new BarView('post', true);
  private bossKey = '';
  // markers
  private enemyLayer = h('div');
  private enemies = new Map<number, EnemyView>();
  private lock = h('div.marker.lock.hidden', { html: icon('lock_marker') });
  private crit = h('div.marker.crit.hidden');
  private critLabel = h('span.ck');
  private critKind = '';
  private reticle = h('div.reticle.hidden', { html: '<svg class="ic" viewBox="0 0 64 64"><circle cx="32" cy="32" r="3" class="s"/><path d="M32 6V20M32 44V58M6 32H20M44 32H58"/></svg>' });
  private prompt = h('div.hud-prompt.panel.bare.hidden');
  private promptKey = '';
  private vignette = h('div.vignette');
  private iframe = h('div.iframe-edge');
  private flags = { low: false, ifr: false, ret: false, lock: false, crit: false, boss: false };
  private markerPos = { lx: NaN, ly: NaN, cx: NaN, cy: NaN };
  private state: HudState | null = null;
  private maxKey = '';
  private originId = '';

  constructor(private ctx: UICtx) {
    this.quick = new SlotView(ctx, 'big', 'Item', 'cycleItem');
    this.spell = new SlotView(ctx, '', 'Spell', 'cycleSpell');
    this.left = new SlotView(ctx, '', 'Left', 'cycleLeft');
    this.right = new SlotView(ctx, '', 'Right', 'cycleRight');

    this.lock.innerHTML = `<svg class="ic" viewBox="0 0 64 64"><path d="M32 8L56 32L32 56L8 32Z"/><path d="M32 22L42 32L32 42L22 32Z" class="s"/></svg>`;
    this.crit.innerHTML = `<svg class="ic" viewBox="0 0 64 64">
      <g class="ring"><circle cx="32" cy="32" r="26"/></g>
      <g class="core"><path d="M32 6L58 32L32 58L6 32Z" class="f"/><path d="M32 6L58 32L32 58L6 32Z"/>
      <path d="M32 20L38 32L32 44L26 32Z" class="cut"/><path d="M32 20L38 32L32 44L26 32Z"/>
      <path d="M32 6V14M32 50V58M6 32H14M50 32H58" class="hl"/></g></svg>`;
    this.crit.appendChild(this.critLabel);

    this.tollBell.innerHTML = `<svg viewBox="0 0 40 50" class="ic">
      <path d="M20 0V5" class="t"/><circle cx="20" cy="6.5" r="2"/>
      <defs><linearGradient id="tlb" x1="0" x2="1"><stop offset="0" stop-color="#2a1f14"/><stop offset=".45" stop-color="#6b5232"/><stop offset="1" stop-color="#1c150e"/></linearGradient></defs>
      <path d="M6 40L8 34C10 26 11 18 12 13Q20 6 28 13C29 18 30 26 32 34L34 40Z" style="fill:url(#tlb)"/>
      <path d="M6 40L8 34C10 26 11 18 12 13Q20 6 28 13C29 18 30 26 32 34L34 40Z"/>
      <path d="M9 36H31" class="t"/><circle cx="20" cy="44" r="2.4" class="s"/>
      <g class="tb" style="opacity:0"><path d="M6 40L8 34C10 26 11 18 12 13Q20 6 28 13C29 18 30 26 32 34L34 40Z" style="fill:#ffd894;fill-opacity:.55;stroke:#ffe3ad"/></g></svg>`;
    this.tollBright = this.tollBell.querySelector('.tb');

    const tl = h('div.hud-tl', null, this.portrait,
      h('div', null, h('div.bars', null, this.hp.el, this.fp.el, this.st.el), this.statusRow));
    const tollEl = h('div.toll', { title: 'The Unfinished Toll' },
      h('div.tl-line'), this.tollGlowL, this.tollGlowR, h('div.tl-cap.l'), h('div.tl-cap.r'), this.tollArrowL, this.tollArrowR,
      this.tollHalo, h('div.tl-mount'), this.tollBell, this.tollLabel);
    const bl = h('div.hud-bl', null, this.itemName, this.quick.el,
      h('div.hud-flasks', null, h('span.hp', null, h('span.icw', { html: icon('stat_hp') }), this.flaskHp),
        h('span.fp', null, h('span.icw', { html: icon('stat_focus') }), this.flaskFp)),
      this.spell.el, this.left.el, this.right.el);
    const br = h('div.hud-br', null, this.hoursDelta, this.hoursVal, h('div.hglyph', { html: icon('hours') }));
    this.bossPost.el.classList.add('post');
    this.boss.append(h('div.bname', null, this.bossName, this.bossTitle, this.bossPhase), this.bossHp.el, this.bossPost.el);
    this.dyn = h('div.hud-dyn', null, this.enemyLayer, this.lock, this.crit, this.reticle);
    this.el = h('div.layer.hud', null, this.vignette, this.iframe, this.dyn, tl, tollEl, bl, br, this.boss, this.prompt);
  }

  /** Refresh the portrait glyph (origin heraldry). */
  setOrigin(originId: string | null): void {
    const id = originId ?? '';
    if (id === this.originId) return;
    this.originId = id;
    this.portrait.innerHTML = icon(id ? `origin_${id}` : 'arms_royal');
  }

  /** Re-render glyph-dependent bits (interaction prompt) after a device change. */
  refreshGlyphs(): void { this.promptKey = ''; if (this.state) this.set(this.state); }

  set(s: HudState): void {
    this.state = s;
    // bar lengths grow with max values (write only when a max changes)
    const mk = `${s.hpMax}|${s.focusMax}|${s.staminaMax}`;
    if (mk !== this.maxKey) {
      this.maxKey = mk;
      this.hp.setWidth(Math.min(38, Math.max(9, s.hpMax * 0.022)));
      this.fp.setWidth(Math.min(30, Math.max(5, s.focusMax * 0.075)));
      this.st.setWidth(Math.min(28, Math.max(6, s.staminaMax * 0.1)));
    }
    this.hp.set(s.hpMax > 0 ? s.hp / s.hpMax : 0);
    this.fp.set(s.focusMax > 0 ? s.focus / s.focusMax : 0);
    this.st.set(s.staminaMax > 0 ? s.stamina / s.staminaMax : 0);

    // statuses: rebuild only when the set changes; remaining time via transform
    const sk = s.statuses.map((x) => x.id).join('|');
    if (sk !== this.statusKey) {
      this.statusKey = sk;
      this.statusRow.textContent = '';
      this.statusEls = s.statuses.map((st) => {
        const rem = h('i.rem');
        this.statusRow.appendChild(h('div.status', { title: st.label, html: icon(st.icon, 'status') }, rem));
        return rem;
      });
    }
    s.statuses.forEach((st, i) => { const el = this.statusEls[i]; if (el) el.style.transform = `scaleX(${clamp01(st.remaining01).toFixed(3)})`; });

    // equipment slots
    for (const [view, slot] of [[this.quick, s.quick], [this.spell, s.spell], [this.left, s.left], [this.right, s.right]] as const) {
      if (view.set(slot) && !slot.empty) { this.itemName.textContent = slot.name; this.itemName.classList.add('on'); this.itemNameT = 2.2; }
    }
    const fk = `${s.flask.health}|${s.flask.focus}`;
    if (fk !== this.flaskKey) { this.flaskKey = fk; this.flaskHp.textContent = String(s.flask.health); this.flaskFp.textContent = String(s.flask.focus); }

    // hours with a rising delta on gain
    if (s.hours !== this.hours) {
      if (this.hours >= 0 && s.hours > this.hours) {
        this.hoursDelta.textContent = `+${fmtNum(s.hours - this.hours)}`;
        this.hoursDelta.classList.remove('on');
        void this.hoursDelta.offsetWidth;
        this.hoursDelta.classList.add('on');
      }
      this.hours = s.hours;
      this.hoursVal.textContent = fmtNum(s.hours);
    }

    // boss
    const hasBoss = !!s.boss;
    if (hasBoss !== this.flags.boss) { this.flags.boss = hasBoss; this.boss.classList.toggle('hidden', !hasBoss); }
    if (s.boss) {
      const bk = `${s.boss.name}|${s.boss.title}|${s.boss.phase}`;
      if (bk !== this.bossKey) {
        this.bossKey = bk;
        this.bossName.textContent = s.boss.name;
        this.bossTitle.textContent = s.boss.title;
        const total = Math.max(2, s.boss.phase);
        this.bossPhase.innerHTML = `Phase ${roman(s.boss.phase)} ` + Array.from({ length: total }, (_, i) => `<i class="${i < s.boss!.phase ? 'on' : ''}"></i>`).join('');
      }
      this.bossHp.set(s.boss.hp01);
      this.bossPost.set(s.boss.posture01);
      this.bossPost.el.classList.toggle('hot', s.boss.posture01 > 0.8);
    }

    // enemies (pooled)
    this.setEnemies(s.enemyBars);

    // lock-on and critical markers (transform only)
    if (s.lock.visible !== this.flags.lock) { this.flags.lock = s.lock.visible; this.lock.classList.toggle('hidden', !s.lock.visible); }
    if (s.lock.visible && (s.lock.x !== this.markerPos.lx || s.lock.y !== this.markerPos.ly)) {
      this.markerPos.lx = s.lock.x; this.markerPos.ly = s.lock.y;
      this.lock.style.transform = `translate3d(${s.lock.x.toFixed(1)}px,${s.lock.y.toFixed(1)}px,0)`;
    }
    if (s.critical.visible !== this.flags.crit) { this.flags.crit = s.critical.visible; this.crit.classList.toggle('hidden', !s.critical.visible); }
    if (s.critical.visible) {
      if (s.critical.x !== this.markerPos.cx || s.critical.y !== this.markerPos.cy) {
        this.markerPos.cx = s.critical.x; this.markerPos.cy = s.critical.y;
        this.crit.style.transform = `translate3d(${s.critical.x.toFixed(1)}px,${s.critical.y.toFixed(1)}px,0)`;
      }
      const k = s.critical.kind ?? '';
      if (k !== this.critKind) { this.critKind = k; this.critLabel.textContent = CRIT_LABEL[k] ?? 'Opening'; }
    }
    if (s.reticle !== this.flags.ret) { this.flags.ret = s.reticle; this.reticle.classList.toggle('hidden', !s.reticle); }
    if (s.lowHealth !== this.flags.low) { this.flags.low = s.lowHealth; this.vignette.classList.toggle('on', s.lowHealth); }
    if (s.iframes !== this.flags.ifr) { this.flags.ifr = s.iframes; this.iframe.classList.toggle('on', s.iframes); }

    // interaction prompt
    const pk = s.prompt ? `${s.prompt.action}|${s.prompt.text}|${this.ctx.host.input.device}` : '';
    if (pk !== this.promptKey) {
      this.promptKey = pk;
      this.prompt.textContent = '';
      if (s.prompt) this.prompt.append(this.ctx.glyph({ action: s.prompt.action }), h('span', null, s.prompt.text));
      this.prompt.classList.toggle('hidden', !s.prompt);
    }
  }

  private setEnemies(bars: HudEnemyBar[]): void {
    for (const v of this.enemies.values()) v.used = false;
    for (const b of bars) {
      let v = this.enemies.get(b.id);
      if (!v) {
        const hp = new BarView('hp'), post = new BarView('post', true), dmg = h('span.dmg');
        const el = h('div.ebar', null, hp.el, post.el, dmg);
        this.enemyLayer.appendChild(el);
        v = { el, hp, post, dmg, x: NaN, y: NaN, vis: true, dmgV: -1, used: true };
        this.enemies.set(b.id, v);
      }
      v.used = true;
      if (b.visible !== v.vis) { v.vis = b.visible; v.el.classList.toggle('hidden', !b.visible); }
      if (!b.visible) continue;
      if (b.x !== v.x || b.y !== v.y) { v.x = b.x; v.y = b.y; v.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0)`; }
      v.hp.set(b.hp01);
      v.post.set(b.posture01);
      const d = b.damage ?? 0;
      if (d !== v.dmgV) { v.dmgV = d; v.dmg.textContent = d > 0 ? String(Math.round(d)) : ''; }
    }
    for (const [id, v] of this.enemies) if (!v.used) { v.el.remove(); this.enemies.delete(id); }
  }

  /** Time-based animation. */
  tick(dt: number): void {
    this.hp.tick(dt); this.fp.tick(dt); this.st.tick(dt); this.bossHp.tick(dt);
    for (const v of this.enemies.values()) v.hp.tick(dt);
    if (this.itemNameT > 0) { this.itemNameT -= dt; if (this.itemNameT <= 0) this.itemName.classList.remove('on'); }
    this.tickToll(dt);
  }

  /**
   * Unfinished Toll: the bell leans and swings toward the lead's direction, the hairline glows on
   * that side, an arrow and a word label appear — readable without sound.
   */
  private tickToll(dt: number): void {
    const s = this.state?.toll;
    const t = this.toll;
    const active = !!s?.active;
    const inten = active ? clamp01(s!.intensity) : 0;
    const dir = active ? Math.max(-1, Math.min(1, s!.dir)) : 0;
    const behind = active && !!s!.behind;
    const lean = behind ? 0 : dir * 24;
    const amp = active ? (behind ? 20 : 7) + 9 * inten : 1.5;
    t.phase += dt * (active ? 5.2 : 2.2);
    t.angle = damp(t.angle, lean, 4, dt);
    const swing = Math.sin(t.phase);
    const angle = t.angle + swing * amp;
    // glow follows direction; "behind" lights both ends alternately with the swing
    const gl = behind ? inten * (0.45 + 0.35 * Math.max(0, -swing)) : clamp01(-dir * 1.6) * inten;
    const gr = behind ? inten * (0.45 + 0.35 * Math.max(0, swing)) : clamp01(dir * 1.6) * inten;
    t.gl = damp(t.gl, gl, 8, dt);
    t.gr = damp(t.gr, gr, 8, dt);
    const ahead = active && !behind && Math.abs(dir) <= 0.25;
    t.halo = damp(t.halo, active ? (0.35 + 0.65 * inten) * (0.75 + 0.25 * Math.abs(swing)) : 0, 6, dt);
    t.bright = damp(t.bright, active ? 0.3 + 0.7 * inten : 0, 5, dt);
    t.lab = damp(t.lab, active ? 0.6 + 0.4 * inten : 0, 5, dt);
    if (active) {
      const word = TOLL_WORD(dir, behind);
      if (word !== t.word) { t.word = word; this.tollLabel.textContent = `The Toll · ${word}${ahead ? ' ▴' : behind ? ' ▾' : ''}`; }
    }
    const w = this.tollWritten;
    if (Math.abs(angle - w.angle) > 0.05) { w.angle = angle; this.tollBell.style.transform = `rotate(${angle.toFixed(2)}deg)`; }
    const setOp = (el: HTMLElement | SVGElement, key: 'gl' | 'gr' | 'halo' | 'lab' | 'al' | 'ar' | 'bright', v: number) => {
      if (Math.abs(v - w[key]) > 0.01) { w[key] = v; el.style.opacity = v.toFixed(3); }
    };
    setOp(this.tollGlowL, 'gl', t.gl);
    setOp(this.tollGlowR, 'gr', t.gr);
    setOp(this.tollHalo, 'halo', t.halo);
    setOp(this.tollLabel, 'lab', t.lab);
    setOp(this.tollArrowL, 'al', active && (behind || dir < -0.25) ? t.gl / Math.max(0.01, inten) * 0.9 : 0);
    setOp(this.tollArrowR, 'ar', active && (behind || dir > 0.25) ? t.gr / Math.max(0.01, inten) * 0.9 : 0);
    if (this.tollBright) setOp(this.tollBright, 'bright', t.bright);
  }
}
