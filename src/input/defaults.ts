/**
 * Default bindings (GDD §3) and the fixed UI-navigation key maps.
 *
 * Gameplay bindings are remappable and persisted in `settings.controls`; `null` there means "use
 * these defaults". UI navigation keys are fixed (menus must always be reachable), see
 * `UI_NAV_KEYS` / `UI_NAV_PAD` below.
 */
import type { KeyBindings, PadBindings, UiNavEvent } from './actions';

/** W3C "standard" gamepad mapping button indices. */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  VIEW: 8, MENU: 9, LS: 10, RS: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
  HOME: 16,
  /** DualShock 4 / DualSense touchpad click (Chromium exposes it as an extra button). */
  TOUCHPAD: 17,
} as const;

/** Number of pad buttons the input system tracks (standard 0..16 + touchpad). */
export const PAD_BUTTON_COUNT = 18;

/** Keyboard & mouse defaults — exactly the GDD §3 table. */
export function defaultKeyBindings(): KeyBindings {
  return {
    moveForward: [{ code: 'KeyW' }],
    moveBack: [{ code: 'KeyS' }],
    moveLeft: [{ code: 'KeyA' }],
    moveRight: [{ code: 'KeyD' }],
    light: [{ code: 'Mouse0' }],
    heavy: [{ code: 'Mouse0', mod: 'Shift' }],
    guard: [{ code: 'Mouse2' }],
    parry: [{ code: 'Mouse2', mod: 'Shift' }],
    technique: [{ code: 'KeyF' }],
    dodge: [{ code: 'Space' }],
    interact: [{ code: 'KeyE' }],
    useItem: [{ code: 'KeyR' }],
    lockOn: [{ code: 'KeyQ' }, { code: 'Mouse1' }],
    walk: [{ code: 'AltLeft' }],
    cycleSpell: [{ code: 'Digit1' }, { code: 'ArrowUp' }],
    cycleItem: [{ code: 'Digit2' }, { code: 'ArrowDown' }],
    cycleRight: [{ code: 'Digit3' }, { code: 'ArrowRight' }],
    cycleLeft: [{ code: 'Digit4' }, { code: 'ArrowLeft' }],
    journal: [{ code: 'KeyJ' }],
    pause: [{ code: 'Escape' }],
  };
}

/**
 * Controller defaults — exactly the GDD §3 table. Movement uses the left stick, so the digital
 * move actions are unbound on the pad. Journal also accepts the PlayStation touchpad click (GDD:
 * "View / Touchpad"); on Xbox pads button 17 simply never exists.
 */
export function defaultPadBindings(): PadBindings {
  return {
    moveForward: [], moveBack: [], moveLeft: [], moveRight: [],
    light: [{ button: PAD.RB }],
    heavy: [{ button: PAD.RT }],
    guard: [{ button: PAD.LB }],
    parry: [{ button: PAD.LT }],
    technique: [{ button: PAD.Y }],
    dodge: [{ button: PAD.B }],
    interact: [{ button: PAD.A }],
    useItem: [{ button: PAD.X }],
    lockOn: [{ button: PAD.RS }],
    walk: [{ button: PAD.LS }],
    cycleSpell: [{ button: PAD.DPAD_UP }],
    cycleItem: [{ button: PAD.DPAD_DOWN }],
    cycleRight: [{ button: PAD.DPAD_RIGHT }],
    cycleLeft: [{ button: PAD.DPAD_LEFT }],
    journal: [{ button: PAD.VIEW }, { button: PAD.TOUCHPAD }],
    pause: [{ button: PAD.MENU }],
  };
}

/**
 * Fixed keyboard map for UI navigation (not remappable, so menus are always reachable).
 *
 *  - directions: arrow keys and WASD
 *  - confirm:    Enter, Numpad Enter, Space, E   (E is "Interact · confirm" in GDD §3, so it
 *                advances dialogue the same way it starts it)
 *  - back:       Escape, Backspace               (Escape emits 'back' only — never 'pause'; the
 *                game uses the gameplay `pause` action during play)
 *  - tabPrev:    Q, PageUp, [ , Shift+Tab
 *  - tabNext:    R, PageDown, ]                  (GDD lists "Q/E" for tabs but E must confirm; R is
 *                the key right of E so Q/R bracket the W-E pair)
 *  - details:    Tab, X
 *  - journal:    J
 *
 * Shift+Tab is special-cased in Input (→ tabPrev instead of details).
 */
export const UI_NAV_KEYS: Readonly<Record<string, UiNavEvent>> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', KeyE: 'confirm',
  Escape: 'back', Backspace: 'back',
  KeyQ: 'tabPrev', PageUp: 'tabPrev', BracketLeft: 'tabPrev',
  KeyR: 'tabNext', PageDown: 'tabNext', BracketRight: 'tabNext',
  Tab: 'details', KeyX: 'details',
  KeyJ: 'journal',
};

/** Primary keyboard label source for each UI nav event (first entry is shown in prompts). */
/** (`pause` is labelled Esc: on keyboard, Escape closes the pause menu via 'back'.) */
export const UI_NAV_PRIMARY_KEY: Readonly<Record<UiNavEvent, string>> = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  confirm: 'Enter', back: 'Escape', tabPrev: 'KeyQ', tabNext: 'KeyR',
  details: 'Tab', journal: 'KeyJ', pause: 'Escape',
};

/**
 * Fixed controller map for UI navigation (button presses only; directions come from the D-pad
 * and the movement stick, handled in Input). A confirm, B back, LB/RB tabs, Y details,
 * Menu pause, View / touchpad journal.
 */
export const UI_NAV_PAD: Readonly<Partial<Record<number, UiNavEvent>>> = {
  [PAD.A]: 'confirm',
  [PAD.B]: 'back',
  [PAD.LB]: 'tabPrev',
  [PAD.RB]: 'tabNext',
  [PAD.Y]: 'details',
  [PAD.MENU]: 'pause',
  [PAD.VIEW]: 'journal',
  [PAD.TOUCHPAD]: 'journal',
  [PAD.DPAD_UP]: 'up',
  [PAD.DPAD_DOWN]: 'down',
  [PAD.DPAD_LEFT]: 'left',
  [PAD.DPAD_RIGHT]: 'right',
};

/** Primary pad button for each UI nav event (for prompt glyphs). */
export const UI_NAV_PRIMARY_PAD: Readonly<Record<UiNavEvent, number>> = {
  up: PAD.DPAD_UP, down: PAD.DPAD_DOWN, left: PAD.DPAD_LEFT, right: PAD.DPAD_RIGHT,
  confirm: PAD.A, back: PAD.B, tabPrev: PAD.LB, tabNext: PAD.RB,
  details: PAD.Y, pause: PAD.MENU, journal: PAD.VIEW,
};

