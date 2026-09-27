/**
 * Input glyphs for prompts. Gameplay actions use `IInput.glyph()`; UI navigation uses the table
 * below so every screen shows consistent labels for the current device and pad style.
 */
import type { ActionId, Device, IInput, KeyBinding, PadBinding, PadStyle, UiNavEvent } from '../input/actions';
import type { Settings } from '../game/settings';
import { h } from './dom';

/** UI navigation glyphs per device / pad style. Keyboard labels match GDD §3 menu rules. */
export const NAV_GLYPHS: Record<'kbm' | PadStyle, Record<UiNavEvent, string>> = {
  kbm: {
    up: '↑', down: '↓', left: '←', right: '→', confirm: 'Enter', back: 'Esc',
    tabPrev: 'Q', tabNext: 'E', pause: 'Esc', journal: 'J', details: 'Tab',
  },
  xbox: {
    up: 'D↑', down: 'D↓', left: 'D←', right: 'D→', confirm: 'A', back: 'B',
    tabPrev: 'LB', tabNext: 'RB', pause: 'Menu', journal: 'View', details: 'Y',
  },
  playstation: {
    up: 'D↑', down: 'D↓', left: 'D←', right: 'D→', confirm: '✕', back: '○',
    tabPrev: 'L1', tabNext: 'R1', pause: 'Options', journal: 'Touchpad', details: '△',
  },
};

/** W3C standard-mapping button names. */
const PAD_BUTTONS: Record<PadStyle, string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D↑', 'D↓', 'D←', 'D→', 'Guide'],
  playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'PS'],
};

/** Human label for a pad binding. */
export function padLabel(b: PadBinding | null | undefined, style: PadStyle): string {
  if (!b) return '—';
  return PAD_BUTTONS[style][b.button] ?? `Button ${b.button}`;
}

const KEY_NAMES: Record<string, string> = {
  Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
  WheelUp: 'Wheel ↑', WheelDown: 'Wheel ↓',
  Space: 'Space', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace',
  ShiftLeft: 'L Shift', ShiftRight: 'R Shift', ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl',
  AltLeft: 'L Alt', AltRight: 'R Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  CapsLock: 'Caps', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
};

/** Human label for a keyboard/mouse binding ("Shift+LMB", "F", "L Alt"). */
export function keyLabel(b: KeyBinding | null | undefined): string {
  if (!b) return '—';
  let k = KEY_NAMES[b.code];
  if (!k) {
    if (b.code.startsWith('Key')) k = b.code.slice(3);
    else if (b.code.startsWith('Digit')) k = b.code.slice(5);
    else if (b.code.startsWith('Numpad')) k = 'Num ' + b.code.slice(6);
    else k = b.code;
  }
  return b.mod ? `${b.mod === 'Control' ? 'Ctrl' : b.mod}+${k}` : k;
}

/** Which pad style glyphs to use: the settings override, else what the input detected. */
export function effectivePadStyle(input: IInput, settings: Settings | null): PadStyle {
  const pref = settings?.controls.padLayout ?? 'auto';
  return pref === 'auto' ? input.padStyle : pref;
}

/**
 * Render a glyph label as a badge. Face buttons get a round badge, shoulders/triggers and keys
 * a keycap. Multi-part labels ("Shift+LMB") render as separate caps joined by a thin plus.
 */
export function glyphBadge(label: string, device: Device): HTMLElement {
  const wrap = h('span.glyph-group');
  const parts = label.split('+').filter(Boolean);
  parts.forEach((p, i) => {
    if (i > 0) wrap.appendChild(h('span.glyph-plus', null, '+'));
    const round = device === 'pad' && /^(A|B|X|Y|✕|○|□|△)$/.test(p);
    const mouse = /^(LMB|RMB|MMB)$/.test(p);
    const cls = round ? 'glyph glyph-round' : mouse ? 'glyph glyph-mouse' : 'glyph glyph-key';
    const el = h('span', { class: cls }, p);
    if (p === '○' || p === '□' || p === '△' || p === '✕') el.classList.add('glyph-ps');
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

/** Resolve a prompt's glyph text for the current device. */
export function promptGlyph(p: PromptDef, input: IInput, settings: Settings | null): string {
  if (p.glyph) return p.glyph;
  if (p.action) return input.glyph(p.action);
  if (p.nav) {
    const table = input.device === 'kbm' ? NAV_GLYPHS.kbm : NAV_GLYPHS[effectivePadStyle(input, settings)];
    return table[p.nav];
  }
  return '';
}
