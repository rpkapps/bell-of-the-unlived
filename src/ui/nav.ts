/**
 * Focus & navigation framework.
 *
 * Any element marked with `navItem()` is focusable inside a screen. Directional events pick the
 * nearest focusable element in that direction (spatial navigation), which gives correct movement
 * in lists, 2D grids and multi-panel layouts without per-screen wiring. Elements may register
 * handlers that claim left/right (sliders, choice lists), confirm and details.
 *
 * Mouse: hovering a nav item focuses it; clicking fires its `click` listener, which is the same
 * code path `confirm` uses (confirm = `el.click()` unless a handler claims it).
 */
import type { UiNavEvent } from '../input/actions';

export interface NavHandlers {
  /** Return true to consume the event (otherwise focus moves spatially). */
  left?(): boolean | void;
  right?(): boolean | void;
  up?(): boolean | void;
  down?(): boolean | void;
  confirm?(): boolean | void;
  details?(): boolean | void;
  /** Called when the element gains focus (keyboard, pad or hover). */
  focus?(): void;
}

const handlers = new WeakMap<HTMLElement, NavHandlers>();

/** Mark an element as focusable, optionally with handlers. */
export function navItem<T extends HTMLElement>(el: T, hnd?: NavHandlers): T {
  el.setAttribute('data-nav', '');
  if (hnd) handlers.set(el, hnd);
  return el;
}

/** Mark an element as the default focus when its screen opens. */
export function navDefault<T extends HTMLElement>(el: T): T {
  el.setAttribute('data-nav-default', '');
  return el;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export class Nav {
  focused: HTMLElement | null = null;
  private lastPointer = { x: -1, y: -1 };

  /**
   * @param scope returns the element whose descendants are navigable (may change, e.g. a modal).
   * @param onFocus called whenever focus changes (screens use it to update detail panels).
   */
  constructor(private scope: () => HTMLElement, private onFocus?: (el: HTMLElement) => void) {}

  /** Wire mouse hover-to-focus on a root element (call once per screen root). */
  bindPointer(root: HTMLElement): void {
    root.addEventListener('pointermove', (e) => {
      // Ignore synthetic moves caused by scrolling under a still pointer.
      if (e.clientX === this.lastPointer.x && e.clientY === this.lastPointer.y) return;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      const t = (e.target as HTMLElement | null)?.closest?.('[data-nav]') as HTMLElement | null;
      if (t && t !== this.focused && this.scope().contains(t) && !t.hasAttribute('disabled')) this.focus(t, false);
    });
  }

  /** All currently visible focusable elements in scope. */
  items(): HTMLElement[] {
    const out: HTMLElement[] = [];
    this.scope().querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
      if (el.hasAttribute('disabled') || el.closest('.hidden')) return;
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
      out.push(el);
    });
    return out;
  }

  focus(el: HTMLElement | null, scroll = true): void {
    if (this.focused === el) return;
    this.focused?.classList.remove('is-focus');
    this.focused = el;
    if (!el) return;
    el.classList.add('is-focus');
    if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    handlers.get(el)?.focus?.();
    this.onFocus?.(el);
  }

  /** Make sure something valid is focused (after a rebuild). Prefers `data-nav-default`. */
  ensure(prefer?: HTMLElement | null): void {
    const scope = this.scope();
    if (prefer && scope.contains(prefer)) return this.focus(prefer);
    if (this.focused && scope.contains(this.focused) && this.focused.isConnected && !this.focused.hasAttribute('disabled')) {
      this.focused.classList.add('is-focus');
      return;
    }
    this.focused = null;
    const def = scope.querySelector<HTMLElement>('[data-nav-default]:not([disabled])');
    this.focus(def ?? this.items()[0] ?? null);
  }

  /** Re-focus an element matching a key after a rebuild (`data-key`). */
  restore(key: string | null | undefined): void {
    if (key) {
      const el = this.scope().querySelector<HTMLElement>(`[data-nav][data-key="${CSS.escape(key)}"]`);
      if (el) { this.focused = null; this.focus(el); return; }
    }
    this.focused = null;
    this.ensure();
  }

  /** Handle one nav event. Returns true when consumed. */
  handle(ev: UiNavEvent): boolean {
    if (!this.focused || !this.focused.isConnected) this.ensure();
    const el = this.focused;
    const hnd = el ? handlers.get(el) : undefined;
    switch (ev) {
      case 'up': case 'down': case 'left': case 'right': {
        if (hnd?.[ev] && hnd[ev]!() !== false) return true;
        return this.move(ev);
      }
      case 'confirm':
        if (!el) return false;
        if (hnd?.confirm && hnd.confirm() !== false) return true;
        el.click();
        return true;
      case 'details':
        if (hnd?.details && hnd.details() !== false) return true;
        return false;
      default:
        return false;
    }
  }

  /** Spatial move: nearest element whose centre lies in the direction, weighting off-axis distance. */
  move(dir: Dir): boolean {
    const cur = this.focused;
    const items = this.items();
    if (!cur) { this.focus(items[0] ?? null); return true; }
    const a = cur.getBoundingClientRect();
    const acx = (a.left + a.right) / 2, acy = (a.top + a.bottom) / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const bcx = (b.left + b.right) / 2, bcy = (b.top + b.bottom) / 2;
      let primary: number, secondary: number;
      if (dir === 'down' || dir === 'up') {
        const d = dir === 'down' ? bcy - acy : acy - bcy;
        if (d <= 2) continue;
        primary = Math.max(0, dir === 'down' ? b.top - a.bottom : a.top - b.bottom);
        secondary = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)); // horizontal gap
        primary += d * 0.05;
      } else {
        const d = dir === 'right' ? bcx - acx : acx - bcx;
        if (d <= 2) continue;
        primary = Math.max(0, dir === 'right' ? b.left - a.right : a.left - b.right);
        secondary = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)); // vertical gap
        secondary += Math.abs(bcy - acy) * 0.15;
        primary += d * 0.05;
      }
      const score = primary + secondary * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (!best) {
      // Vertical lists wrap around when marked `data-nav-wrap`.
      const list = cur.closest<HTMLElement>('[data-nav-wrap]');
      if (list && (dir === 'up' || dir === 'down')) {
        const siblings = items.filter((e) => list.contains(e));
        const target = dir === 'down' ? siblings[0] : siblings[siblings.length - 1];
        if (target && target !== cur) { this.focus(target); return true; }
      }
      return false;
    }
    this.focus(best);
    return true;
  }
}
