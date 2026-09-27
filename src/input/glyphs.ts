/**
 * Human-readable labels for bindings (prompts and the remapping screen). Pure functions only —
 * safe to import anywhere, including tests.
 */
import type { Device, KeyBinding, PadBinding, PadStyle, UiNavEvent } from './actions';
import { UI_NAV_PRIMARY_KEY, UI_NAV_PRIMARY_PAD } from './defaults';

/** Label shown when an action has no binding on a device. */
export const UNBOUND_LABEL = '—';

/** Physical-key layout labels (e.g. from `navigator.keyboard.getLayoutMap()`), code → character. */
export type KeyLayout = ReadonlyMap<string, string>;

const KEY_NAMES: Readonly<Record<string, string>> = {
  Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'Mouse4', Mouse4: 'Mouse5',
  WheelUp: 'Wheel ↑', WheelDown: 'Wheel ↓',
  Space: 'Space', Escape: 'Esc', Enter: 'Enter', NumpadEnter: 'Num Enter', Tab: 'Tab',
  Backspace: 'Backspace', CapsLock: 'Caps',
  ShiftLeft: 'Shift', ShiftRight: 'R Shift', ControlLeft: 'Ctrl', ControlRight: 'R Ctrl',
  AltLeft: 'Alt', AltRight: 'R Alt', MetaLeft: 'Meta', MetaRight: 'R Meta', ContextMenu: 'Menu',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  IntlBackslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
  NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .', NumLock: 'NumLk', ScrollLock: 'ScrLk', Pause: 'Pause', PrintScreen: 'PrtSc',
};

/** Codes whose printed character depends on the keyboard layout (worth asking the layout map). */
function isLayoutDependent(code: string): boolean {
  return code.startsWith('Key') || code.startsWith('Digit') || code === 'Minus' || code === 'Equal' ||
    code === 'BracketLeft' || code === 'BracketRight' || code === 'Backslash' || code === 'IntlBackslash' ||
    code === 'Semicolon' || code === 'Quote' || code === 'Backquote' || code === 'Comma' ||
    code === 'Period' || code === 'Slash';
}

/**
 * Short label for a KeyboardEvent.code or mouse code: "W", "Space", "Shift", "Esc", "↑", "LMB",
 * "Wheel ↑", "Num 5". With a layout map (Chromium), letter/digit/punctuation keys show the user's
 * actual layout (e.g. "Z" for KeyW on AZERTY).
 */
export function keyLabel(code: string, layout?: KeyLayout | null): string {
  if (layout && isLayoutDependent(code)) {
    const ch = layout.get(code);
    if (ch && ch.trim()) return ch.toUpperCase();
  }
  const named = KEY_NAMES[code];
  if (named) return named;
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}

/** Label for a modifier requirement. */
export function modLabel(mod: NonNullable<KeyBinding['mod']>): string {
  return mod === 'Control' ? 'Ctrl' : mod;
}

const PAD_NAMES: Readonly<Record<PadStyle, readonly string[]>> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D↑', 'D↓', 'D←', 'D→', 'Guide', 'Touchpad'],
  playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'PS', 'Touchpad'],
};

/** Label for a W3C standard-mapping pad button in the given style ("RB" / "R1", "A" / "✕"). */
export function padLabel(button: number, style: PadStyle): string {
  return PAD_NAMES[style][button] ?? `Btn ${button}`;
}

/** Label for a single binding ("Shift+LMB", "Q", "RT", "R2"); `UNBOUND_LABEL` for none. */
export function bindingLabel(
  binding: KeyBinding | PadBinding | null | undefined,
  device: Device,
  style: PadStyle,
  layout?: KeyLayout | null,
): string {
  if (!binding) return UNBOUND_LABEL;
  const key = 'code' in binding ? binding : null;
  const pad = 'button' in binding ? binding : null;
  if (key && (device === 'kbm' || !pad)) {
    const k = keyLabel(key.code, layout);
    return key.mod ? `${modLabel(key.mod)}+${k}` : k;
  }
  return pad ? padLabel(pad.button, style) : UNBOUND_LABEL;
}

/**
 * Detect pad glyph style from a Gamepad.id. Sony vendor id 054c or PlayStation-ish names →
 * 'playstation'; everything else (XInput, generic) → 'xbox'.
 */
export function detectPadStyle(id: string): PadStyle {
  return /054c|dualshock|dualsense|playstation|wireless controller/i.test(id) ? 'playstation' : 'xbox';
}

/**
 * Label for the fixed UI navigation events (see `UI_NAV_KEYS` / `UI_NAV_PAD` in defaults.ts):
 * kbm "Enter", "Esc", "Q", "R"…; pad "A"/"✕", "B"/"○", "LB"/"L1"…
 */
export function uiNavLabel(ev: UiNavEvent, device: Device, style: PadStyle, layout?: KeyLayout | null): string {
  if (device === 'pad') return padLabel(UI_NAV_PRIMARY_PAD[ev], style);
  return keyLabel(UI_NAV_PRIMARY_KEY[ev], layout);
}
