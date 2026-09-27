/**
 * Input glyphs for prompts. Gameplay actions use `IInput.glyph()`; UI navigation events and the
 * remap screen use the input module's label helpers (`uiNavLabel`, `bindingLabel`) so prompts
 * always match the real keys/buttons for the current device and pad style.
 */
import type { ActionId, Device, IInput, KeyBinding, PadBinding, UiNavEvent } from '../input/actions';
import { bindingLabel, uiNavLabel, type KeyLayout } from '../input/glyphs';
import { h } from './dom';

/** Keyboard layout map if the concrete Input exposes one (Chromium `getLayoutMap`). */
function layoutOf(input: IInput): KeyLayout | null {
  return (input as IInput & { keyboardLayout?: KeyLayout | null }).keyboardLayout ?? null;
}

/** Label for a UI navigation event on the current device. */
export function navLabel(input: IInput, ev: UiNavEvent): string {
  return uiNavLabel(ev, input.device, input.padStyle, layoutOf(input));
}

/** Label for a stored binding on the remap screen. */
export function bindLabel(input: IInput, b: KeyBinding | PadBinding | null | undefined, device: Device): string {
  return bindingLabel(b, device, input.padStyle, layoutOf(input));
}

/**
 * Render a glyph label as a badge. Face buttons get a round badge, shoulders/triggers and keys
 * a keycap. Multi-part labels ("Shift+LMB") render as separate caps joined by a thin plus.
 */
export function glyphBadge(label: string, device: Device): HTMLElement {
  const wrap = h('span.glyph-group');
  const parts = label === '+' ? ['+'] : label.split('+').filter(Boolean);
  parts.forEach((p, i) => {
    if (i > 0) wrap.appendChild(h('span.glyph-plus', null, '+'));
    const round = device === 'pad' && /^(A|B|X|Y|✕|○|□|△)$/.test(p);
    const mouse = /^(LMB|RMB|MMB)$/.test(p);
    const el = h('span', { class: round ? 'glyph glyph-round' : mouse ? 'glyph glyph-mouse' : 'glyph glyph-key' }, p);
    if (/^(✕|○|□|△)$/.test(p)) el.classList.add('glyph-ps');
    wrap.appendChild(el);
  });
  return wrap;
}

/** A prompt definition shown in a screen's footer. */
export interface PromptDef {
  /** A UI navigation glyph… */
  nav?: UiNavEvent;
  /** …or a gameplay action glyph. */
  action?: ActionId;
  /** Literal glyph override (e.g. "↑↓"). */
  glyph?: string;
  label: string;
  /** Optional click handler so mouse users can use the prompt too. */
  onClick?: () => void;
}

/** Resolve a glyph spec to label text for the current device. */
export function glyphText(input: IInput, g: { nav?: UiNavEvent; action?: ActionId; text?: string }): string {
  if (g.text) return g.text;
  if (g.action) return input.glyph(g.action);
  if (g.nav) return navLabel(input, g.nav);
  return '';
}
