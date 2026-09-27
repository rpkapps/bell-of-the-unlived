/**
 * Input system — keyboard, mouse (pointer lock) and W3C "standard" gamepads behind `IInput`.
 *
 * Timing model
 *  - Raw DOM events (keys, mouse, wheel) are handled immediately; gamepads are polled in
 *    `beginFrame`. Both feed the same per-action state.
 *  - `pressed` / `released` edges accumulate until the game calls `endStep()` after a fixed
 *    simulation step, so a tap shorter than a frame — or a frame that runs zero sim steps — is
 *    never lost.
 *  - `look()`, `targetSwitch()` and `consumeUi()` are per rendered frame and consume their value.
 *
 * Modifier bindings ("Shift+LMB")
 *  When a physical key/button goes down, the modifier it is "latched" with is decided once: the
 *  first held modifier (Shift, Control, Alt) that some binding on that same physical code uses,
 *  or none. A binding fires only while its code is held with the matching latch, so LMB (light)
 *  and Shift+LMB (heavy) are mutually exclusive and releasing Shift mid-hold keeps the heavy held.
 *  Modifiers no binding pairs with that code are ignored (Shift+W still moves forward).
 *
 * Integration notes live at the bottom of this file (see "INTEGRATION").
 */
import { ACTIONS, REQUIRED_ACTIONS } from './actions';
import type {
  ActionId, Device, IInput, KeyBinding, KeyBindings, PadBinding, PadBindings, PadStyle, UiNavEvent,
} from './actions';
import type { Settings } from '../game/settings';
import { defaultKeyBindings, defaultPadBindings, PAD, PAD_BUTTON_COUNT, UI_NAV_KEYS, UI_NAV_PAD } from './defaults';
import { bindingLabel, detectPadStyle, UNBOUND_LABEL, type KeyLayout } from './glyphs';

// ---------------------------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------------------------

/** Radial stick dead-zone (the remaining range is rescaled to 0..1). */
export const STICK_DEADZONE = 0.18;
/** Analog trigger (LT/RT) press threshold. */
export const TRIGGER_THRESHOLD = 0.35;
/** Right-stick look speed at full deflection, radians per second (× padSensitivity). */
export const STICK_LOOK_SPEED = 3.2;
/** Right-stick response curve exponent (fine aim near centre, fast at the edge). */
export const STICK_LOOK_EXPONENT = 1.6;
/** Mouse look, radians per pixel (× mouseSensitivity). */
export const MOUSE_RAD_PER_PX = 0.0022;
/** Largest single mouse event accepted for look (guards against pointer-lock spikes). */
const MOUSE_MAX_EVENT_PX = 400;
/** UI key-repeat: delay before the first repeat and the interval between repeats (seconds). */
export const UI_REPEAT_DELAY = 0.38;
export const UI_REPEAT_RATE = 0.09;
/** Stick deflection that counts as a UI direction. */
export const UI_STICK_THRESHOLD = 0.5;
/** Right-stick flick for target switching: re-arm below, fire above (X axis). */
export const FLICK_ARM = 0.3;
export const FLICK_FIRE = 0.7;
/** Mouse flick for target switching (only while pointer-locked). */
export const MOUSE_FLICK_PX = 60;
export const MOUSE_FLICK_WINDOW_MS = 120;
export const MOUSE_FLICK_COOLDOWN_MS = 250;
/** Mouse travel (within 250 ms) that switches prompts to keyboard & mouse. */
const DEVICE_MOUSE_PX = 4;
/** Pad binding capture gives up after this long. */
export const CAPTURE_TIMEOUT_MS = 8000;
/** Wheel: pixels of delta that make one notch, and min spacing between notches (trackpads). */
const WHEEL_NOTCH_PX = 40;
const WHEEL_MIN_INTERVAL_MS = 60;
/** Escape keydown / pointer-lock loss closer together than this are the same pause request. */
const ESC_DEDUPE_MS = 300;

// ---------------------------------------------------------------------------------------------
// Pure helpers (exported for tests and tools)
// ---------------------------------------------------------------------------------------------

type ModKey = NonNullable<KeyBinding['mod']>;
const MODS: readonly ModKey[] = ['Shift', 'Control', 'Alt'];
const N_ACTIONS = ACTIONS.length;
const ACTION_INDEX = Object.fromEntries(ACTIONS.map((a, i) => [a, i])) as Record<ActionId, number>;
const MOUSE_CODES = ['Mouse0', 'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4'] as const;
const DIRS: readonly UiNavEvent[] = ['up', 'down', 'left', 'right'];
/** Keyboard keys per UI direction (same order as DIRS). */
const DIR_KEYS: readonly (readonly string[])[] = [
  ['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS'], ['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'],
];
/** D-pad buttons per UI direction (same order as DIRS). */
const DIR_PAD = [PAD.DPAD_UP, PAD.DPAD_DOWN, PAD.DPAD_LEFT, PAD.DPAD_RIGHT] as const;
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'password', 'number', 'url', 'tel', '']);

/**
 * Radial dead-zone with rescale. Writes the filtered vector into `out` and returns its magnitude
 * (0..1). Inside the dead-zone → (0,0); the edge of the dead-zone maps to 0 so there is no jump.
 */
export function radialDeadzone(x: number, y: number, deadzone: number, out: { x: number; y: number }): number {
  const m = Math.hypot(x, y);
  if (!(m > deadzone)) { out.x = 0; out.y = 0; return 0; }
  const n = Math.min(1, (m - deadzone) / (1 - deadzone));
  const k = n / m;
  out.x = x * k; out.y = y * k;
  return n;
}

/** Stick look response: magnitude 0..1 → speed factor 0..1. */
export function stickLookCurve(magnitude: number): number {
  return magnitude <= 0 ? 0 : Math.pow(Math.min(1, magnitude), STICK_LOOK_EXPONENT);
}

export function keyBindingEquals(a: KeyBinding, b: KeyBinding): boolean {
  return a.code === b.code && (a.mod ?? '') === (b.mod ?? '');
}
export function padBindingEquals(a: PadBinding, b: PadBinding): boolean {
  return a.button === b.button;
}
function copyKey(b: KeyBinding): KeyBinding { return b.mod ? { code: b.code, mod: b.mod } : { code: b.code }; }
function copyPad(b: PadBinding): PadBinding { return { button: b.button }; }

export function isKeyBinding(b: unknown): b is KeyBinding {
  if (!b || typeof b !== 'object') return false;
  const k = b as { code?: unknown; mod?: unknown };
  return typeof k.code === 'string' && k.code.length > 0 &&
    (k.mod === undefined || (typeof k.mod === 'string' && (MODS as readonly string[]).includes(k.mod)));
}
export function isPadBinding(b: unknown): b is PadBinding {
  if (!b || typeof b !== 'object') return false;
  const p = (b as { button?: unknown }).button;
  return typeof p === 'number' && Number.isInteger(p) && p >= 0 && p < 32;
}

/**
 * Effective bindings: stored lists where present and valid, defaults otherwise (e.g. an action
 * added after the save was written). A required action whose stored list is empty falls back to
 * its defaults. Always returns fresh arrays/objects.
 */
function resolveBindings<B>(
  stored: Partial<Record<ActionId, unknown>> | null | undefined,
  defaults: Record<ActionId, B[]>,
  valid: (b: unknown) => b is B,
  copy: (b: B) => B,
): Record<ActionId, B[]> {
  const out = {} as Record<ActionId, B[]>;
  for (const a of ACTIONS) {
    const list = stored ? stored[a] : undefined;
    if (Array.isArray(list)) {
      const v = list.filter(valid).map(copy);
      out[a] = v.length === 0 && REQUIRED_ACTIONS.includes(a) ? defaults[a] : v;
    } else {
      out[a] = defaults[a];
    }
  }
  return out;
}
export function resolveKeyBindings(stored: KeyBindings | null | undefined): KeyBindings {
  return resolveBindings<KeyBinding>(stored, defaultKeyBindings(), isKeyBinding, copyKey);
}
export function resolvePadBindings(stored: PadBindings | null | undefined): PadBindings {
  return resolveBindings<PadBinding>(stored, defaultPadBindings(), isPadBinding, copyPad);
}

/**
 * Apply one remap and return the new full binding set, or `null` if refused.
 *
 *  - `b === null` clears `slot` of `a`.
 *  - A `slot` past the end appends.
 *  - If `b` is already used elsewhere (another action, or another slot of `a`), that other use is
 *    replaced by `a`'s previous binding in `slot` (a swap) or, if `a` had none there, removed.
 *  - Refused if any REQUIRED action would end up with no binding.
 */
export function applyBindingChange<B>(
  current: Record<ActionId, B[]>,
  a: ActionId,
  slot: number,
  b: B | null,
  eq: (x: B, y: B) => boolean,
  copy: (x: B) => B,
): Record<ActionId, B[]> | null {
  const work = {} as Record<ActionId, (B | null)[]>;
  for (const k of ACTIONS) work[k] = current[k].map(copy);
  const own = work[a];
  const idx = Math.max(0, Math.floor(Number.isFinite(slot) ? slot : 0));
  const old = idx < own.length ? own[idx] : null;

  if (b === null) {
    if (idx < own.length) own[idx] = null;
  } else if (!(old && eq(old, b))) {
    const target = Math.min(idx, own.length);
    own[target] = copy(b);
    for (const k of ACTIONS) {
      const list = work[k];
      for (let j = 0; j < list.length; j++) {
        if (k === a && j === target) continue;
        const x = list[j];
        if (x && eq(x, b)) list[j] = old ? copy(old) : null;
      }
    }
  }

  const out = {} as Record<ActionId, B[]>;
  for (const k of ACTIONS) out[k] = work[k].filter((x): x is NonNullable<typeof x> => x !== null) as B[];
  for (const r of REQUIRED_ACTIONS) if (out[r].length === 0) return null;
  return out;
}

/** True for focused elements that take typed text (input handling steps aside for them). */
function isTextEntry(t: EventTarget | null): boolean {
  const el = t as { tagName?: unknown; isContentEditable?: unknown; type?: unknown } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable === true) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  return TEXT_INPUT_TYPES.has(typeof el.type === 'string' ? el.type.toLowerCase() : 'text');
}

function isModifierCode(code: string): boolean {
  return code === 'ShiftLeft' || code === 'ShiftRight' || code === 'ControlLeft' ||
    code === 'ControlRight' || code === 'AltLeft' || code === 'AltRight';
}

interface ModFlags { shiftKey: boolean; ctrlKey: boolean; altKey: boolean }
function modFlag(e: ModFlags, m: ModKey): boolean {
  return m === 'Shift' ? e.shiftKey : m === 'Control' ? e.ctrlKey : e.altKey;
}
/** First held modifier (Shift > Control > Alt), used when capturing a binding. */
function firstHeldMod(e: ModFlags): ModKey | undefined {
  for (const m of MODS) if (modFlag(e, m)) return m;
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------------------

type InputEventName = 'device' | 'padConnected' | 'padDisconnected';
type Listener = (d: Device) => void;

interface CaptureState {
  device: Device;
  resolve: (b: KeyBinding | PadBinding | null) => void;
  /** False until the event that started the capture has finished dispatching. */
  armed: boolean;
  /** kbm: a modifier pressed alone (bound on release if nothing else is pressed). */
  modCandidate: string | null;
  /** pad: Menu or View held, waiting to see whether the other joins (= cancel). */
  padPending: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/** Scratch vector for dead-zone maths (no per-frame allocation). */
const DZ = { x: 0, y: 0 };

export class Input implements IInput {
  /**
   * When pointer lock is lost while the game wants it (browser Esc, alt-tab), emit a one-shot
   * `pause` press on the next frame so the game can open its pause menu. Set false to disable.
   */
  pauseOnLockLoss = true;

  private readonly win: Window;
  private readonly doc: Document;
  private readonly nav: Navigator;
  private readonly disposers: (() => void)[] = [];
  private readonly listeners = new Map<InputEventName, Set<Listener>>();

  private _device: Device = 'kbm';
  private detectedStyle: PadStyle = 'xbox';
  private layout: KeyLayout | null = null;

  // --- compiled bindings -------------------------------------------------------------------
  private kbSrc: KeyBindings | null | undefined = undefined;
  private padSrc: PadBindings | null | undefined = undefined;
  private keyBinds: KeyBindings = defaultKeyBindings();
  private padBinds: PadBindings = defaultPadBindings();
  /** Per action: binding codes and their required latch ('' = no modifier). */
  private kbCodes: string[][] = [];
  private kbLatch: string[][] = [];
  private padButtons: number[][] = [];
  /** Physical code → modifiers some binding pairs with it (in MODS order). */
  private modsFor = new Map<string, ModKey[]>();
  private boundCodes = new Set<string>();
  private ctrlCodes = new Set<string>();

  // --- keyboard / mouse raw state ------------------------------------------------------------
  /** Held physical codes (keys + mouse buttons) → latched modifier ('' = none). */
  private readonly held = new Map<string, string>();
  private locked = false;
  private wantLock = false;
  /** Consecutive failed lock requests; after a few, canvas clicks stop being swallowed. */
  private lockErrors = 0;
  private moveWinStart = 0;
  private moveWinPx = 0;
  private flickStart = 0;
  private flickPx = 0;
  private flickCooldownUntil = 0;
  private wheelAcc = 0;
  private wheelLast = 0;
  private wheelEmitAt = 0;
  private pendingPausePulse = false;
  private suppressEscUntil = 0;
  private lastEscAt = -1e9;
  private swallowClickUntil = 0;

  // --- action state ----------------------------------------------------------------------------
  private readonly kbDown = new Uint8Array(N_ACTIONS);
  private readonly padDown = new Uint8Array(N_ACTIONS);
  private readonly isDown = new Uint8Array(N_ACTIONS);
  private readonly pressedF = new Uint8Array(N_ACTIONS);
  private readonly releasedF = new Uint8Array(N_ACTIONS);
  private readonly heldT = new Float64Array(N_ACTIONS);

  // --- gamepad ---------------------------------------------------------------------------------
  private padIndex = -1;
  private padId = '';
  private readonly padRaw = new Uint8Array(PAD_BUTTON_COUNT);
  private readonly padEff = new Uint8Array(PAD_BUTTON_COUNT);
  private readonly padEffPrev = new Uint8Array(PAD_BUTTON_COUNT);
  /** Buttons held through a releaseAll(): ignored until physically released once. */
  private readonly padIgnore = new Uint8Array(PAD_BUTTON_COUNT);
  private moveX = 0;
  private moveY = 0;
  private moveBlocked = false;
  private flickArmed = false;
  private stickDir = -1;

  // --- per-frame outputs -----------------------------------------------------------------------
  // Mouse events accumulate into the *pending* values; beginFrame moves them into the frame values
  // (dropping anything the camera did not consume last frame) and adds the sticks.
  private lookPX = 0;
  private lookPY = 0;
  private tsPending = 0;
  private lookX = 0;
  private lookY = 0;
  private tsAcc = 0;

  // --- UI navigation ---------------------------------------------------------------------------
  private uiPending: UiNavEvent[] = [];
  private uiFrame: UiNavEvent[] = [];
  private readonly dirActive = new Uint8Array(4);
  private readonly dirBlocked = new Uint8Array(4);
  private readonly dirJust = new Uint8Array(4);
  private readonly padDirHeld = new Uint8Array(4);
  private readonly dirT = new Float64Array(4);
  private readonly dirNext = new Float64Array(4);

  private capture: CaptureState | null = null;

  constructor(private readonly target: HTMLElement, private readonly getSettings: () => Settings) {
    this.win = window;
    this.doc = document;
    this.nav = navigator;
    this.refreshBindings(true);

    const w = this.win, d = this.doc;
    const add = <E extends Event>(
      tgt: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions,
    ): void => {
      const l = fn as unknown as EventListener;
      tgt.addEventListener(type, l, opts);
      this.disposers.push(() => tgt.removeEventListener(type, l, opts));
    };
    const cap: AddEventListenerOptions = { capture: true };
    add<KeyboardEvent>(w, 'keydown', this.onKeyDown, cap);
    add<KeyboardEvent>(w, 'keyup', this.onKeyUp, cap);
    add<MouseEvent>(w, 'mousedown', this.onMouseDown, cap);
    add<MouseEvent>(w, 'mouseup', this.onMouseUp, cap);
    add<MouseEvent>(w, 'mousemove', this.onMouseMove, cap);
    add<WheelEvent>(w, 'wheel', this.onWheel, { capture: true, passive: false });
    add<MouseEvent>(w, 'click', this.onClick, cap);
    add<MouseEvent>(w, 'auxclick', this.onClick, cap);
    add<MouseEvent>(w, 'contextmenu', this.onContextMenu, cap);
    add<Event>(w, 'blur', this.onBlur);
    add<Event>(w, 'focus', this.onFocus);
    add<GamepadEvent>(w, 'gamepadconnected', this.onPadConnected);
    add<GamepadEvent>(w, 'gamepaddisconnected', this.onPadDisconnected);
    add<Event>(d, 'visibilitychange', this.onVisibility);
    add<Event>(d, 'pointerlockchange', this.onPointerLockChange);
    add<Event>(d, 'pointerlockerror', this.onPointerLockError);
    this.fetchLayout();
  }

  /** Remove every listener and release pointer lock (HMR / teardown). */
  dispose(): void {
    if (this.capture) this.finishCapture(null);
    for (const off of this.disposers.splice(0)) off();
    this.setPointerLock(false);
    this.listeners.clear();
  }

  // =============================================================================================
  // IInput — state
  // =============================================================================================

  get device(): Device { return this._device; }

  get padStyle(): PadStyle {
    const pref = this.getSettings().controls.padLayout;
    return pref === 'xbox' || pref === 'playstation' ? pref : this.detectedStyle;
  }

  get padConnected(): boolean {
    const pads = this.readPads();
    if (!pads) return false;
    for (let i = 0; i < pads.length; i++) { const p = pads[i]; if (p && p.connected) return true; }
    return false;
  }

  /** Whether the canvas currently holds pointer lock. */
  get pointerLocked(): boolean { return this.locked; }

  // =============================================================================================
  // IInput — per frame
  // =============================================================================================

  beginFrame(realDt: number): void {
    const dt = realDt > 0 && Number.isFinite(realDt) ? Math.min(realDt, 0.25) : 0;
    const s = this.getSettings();
    this.refreshBindings(false);

    // UI events that arrived from DOM events since the last frame become this frame's events;
    // anything the UI did not consume last frame is dropped (bounded queue).
    const t = this.uiFrame;
    this.uiFrame = this.uiPending;
    this.uiPending = t;
    this.uiPending.length = 0;

    this.lookX = this.lookPX; this.lookY = this.lookPY; this.tsAcc = this.tsPending;
    this.lookPX = 0; this.lookPY = 0; this.tsPending = 0;

    for (let i = 0; i < N_ACTIONS; i++) if (this.isDown[i]) this.heldT[i] += dt;

    if (this.pendingPausePulse && !this.capture) {
      this.pendingPausePulse = false;
      this.pulse(ACTION_INDEX.pause);
    }

    this.pollPads(s, dt);
    if (!this.capture) this.updateUiDirs(dt);
  }

  pressed(a: ActionId): boolean { return this.pressedF[ACTION_INDEX[a]] === 1; }
  released(a: ActionId): boolean { return this.releasedF[ACTION_INDEX[a]] === 1; }
  down(a: ActionId): boolean { return this.isDown[ACTION_INDEX[a]] === 1; }
  heldTime(a: ActionId): number { const i = ACTION_INDEX[a]; return this.isDown[i] ? this.heldT[i] : 0; }

  move(): { x: number; y: number } {
    const d = this.isDown, I = ACTION_INDEX;
    let kx = d[I.moveRight] - d[I.moveLeft];
    let ky = d[I.moveForward] - d[I.moveBack];
    if (kx !== 0 && ky !== 0) { kx *= Math.SQRT1_2; ky *= Math.SQRT1_2; }
    let x = kx + this.moveX, y = ky + this.moveY;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  look(): { x: number; y: number } {
    const r = { x: this.lookX, y: this.lookY };
    this.lookX = 0; this.lookY = 0;
    return r;
  }

  targetSwitch(): number {
    const v = this.tsAcc;
    this.tsAcc = 0;
    return v > 0 ? 1 : v < 0 ? -1 : 0;
  }

  endStep(): void {
    this.pressedF.fill(0);
    this.releasedF.fill(0);
  }

  consumeUi(): UiNavEvent[] {
    if (this.uiFrame.length === 0) return [];
    const out = this.uiFrame.slice();
    this.uiFrame.length = 0;
    return out;
  }

  releaseAll(): void {
    this.held.clear();
    this.kbDown.fill(0);
    this.padDown.fill(0);
    this.isDown.fill(0);
    this.pressedF.fill(0);
    this.releasedF.fill(0);
    this.heldT.fill(0);
    // Pad buttons still physically held are ignored until released once.
    this.padIgnore.set(this.padRaw);
    this.padEff.fill(0);
    this.padEffPrev.fill(0);
    this.moveX = 0; this.moveY = 0;
    this.moveBlocked = true;     // left stick must return to centre before it moves again
    this.flickArmed = false;     // right stick must return to centre before the next flick
    this.lookX = 0; this.lookY = 0; this.tsAcc = 0;
    this.lookPX = 0; this.lookPY = 0; this.tsPending = 0;
    this.flickPx = 0; this.wheelAcc = 0;
    this.uiPending.length = 0;
    this.uiFrame.length = 0;
    for (let d = 0; d < 4; d++) {
      this.dirBlocked[d] = this.padDirHeld[d];
      this.dirActive[d] = 0;
      this.dirJust[d] = 0;
    }
    // Pick up any in-place edits of settings.controls on the next frame.
    this.kbSrc = undefined;
    this.padSrc = undefined;
  }

  // =============================================================================================
  // IInput — bindings & prompts
  // =============================================================================================

  getKeyBindings(): KeyBindings {
    this.refreshBindings(false);
    return resolveKeyBindings(this.keyBinds);
  }

  getPadBindings(): PadBindings {
    this.refreshBindings(false);
    return resolvePadBindings(this.padBinds);
  }

  setKeyBinding(a: ActionId, slot: number, b: KeyBinding | null): void {
    if (!(a in ACTION_INDEX) || (b !== null && !isKeyBinding(b))) return;
    this.refreshBindings(false);
    const next = applyBindingChange(this.keyBinds, a, slot, b, keyBindingEquals, copyKey);
    if (!next) return;
    this.getSettings().controls.keyboard = next;
    this.refreshBindings(true);
  }

  setPadBinding(a: ActionId, slot: number, b: PadBinding | null): void {
    if (!(a in ACTION_INDEX) || (b !== null && !isPadBinding(b))) return;
    this.refreshBindings(false);
    const next = applyBindingChange(this.padBinds, a, slot, b, padBindingEquals, copyPad);
    if (!next) return;
    this.getSettings().controls.gamepad = next;
    this.refreshBindings(true);
  }

  resetBindings(device: Device): void {
    const c = this.getSettings().controls;
    if (device === 'kbm') c.keyboard = null; else c.gamepad = null;
    this.refreshBindings(true);
  }

  captureBinding(device: Device): Promise<KeyBinding | PadBinding | null> {
    if (this.capture) this.finishCapture(null);
    this.releaseAll();
    return new Promise((resolve) => {
      const cap: CaptureState = { device, resolve, armed: false, modCandidate: null, padPending: -1, timer: null };
      this.capture = cap;
      // Arm after the current event (e.g. the click/Enter that opened the prompt) has dispatched.
      setTimeout(() => { if (this.capture === cap) cap.armed = true; }, 0);
      if (device === 'pad') {
        cap.timer = setTimeout(() => { if (this.capture === cap) this.finishCapture(null); }, CAPTURE_TIMEOUT_MS);
      }
    });
  }

  /** True while `captureBinding` is waiting (normal action/UI processing is suspended). */
  get capturing(): boolean { return this.capture !== null; }

  glyph(a: ActionId, device?: Device): string {
    this.refreshBindings(false);
    const d = device ?? this._device;
    const first = d === 'kbm' ? this.keyBinds[a]?.[0] : this.padBinds[a]?.[0];
    return first ? bindingLabel(first, d, this.padStyle, this.layout) : UNBOUND_LABEL;
  }

  /** The keyboard layout map (Chromium), for callers using `keyLabel`/`bindingLabel` directly. */
  get keyboardLayout(): KeyLayout | null { return this.layout; }

  setPointerLock(on: boolean): void {
    this.wantLock = on;
    if (on) {
      if (!this.locked) this.requestLock();
    } else if (this.doc.pointerLockElement === this.target) {
      try { this.doc.exitPointerLock(); } catch { /* ignore */ }
    }
  }

  on(ev: 'device', fn: (d: Device) => void): () => void;
  on(ev: 'padDisconnected' | 'padConnected', fn: () => void): () => void;
  on(ev: InputEventName, fn: Listener): () => void {
    let set = this.listeners.get(ev);
    if (!set) this.listeners.set(ev, (set = new Set()));
    set.add(fn);
    return () => { set.delete(fn); };
  }

  // =============================================================================================
  // Internals — bindings
  // =============================================================================================

  /** Recompile bindings when the settings object's binding lists changed identity (or forced). */
  private refreshBindings(force: boolean): void {
    const c = this.getSettings().controls;
    let kbChanged = false;
    if (force || c.keyboard !== this.kbSrc) {
      this.kbSrc = c.keyboard;
      this.compileKeys(resolveKeyBindings(c.keyboard));
      kbChanged = true;
    }
    if (force || c.gamepad !== this.padSrc) {
      this.padSrc = c.gamepad;
      this.padBinds = resolvePadBindings(c.gamepad);
      this.padButtons = ACTIONS.map((a) => this.padBinds[a].map((b) => b.button));
    }
    if (kbChanged && !this.capture) this.refreshKb();
  }

  private compileKeys(kb: KeyBindings): void {
    this.keyBinds = kb;
    this.kbCodes = ACTIONS.map((a) => kb[a].map((b) => b.code));
    this.kbLatch = ACTIONS.map((a) => kb[a].map((b) => b.mod ?? ''));
    const mods = new Map<string, Set<ModKey>>();
    this.boundCodes.clear();
    this.ctrlCodes.clear();
    for (const a of ACTIONS) {
      for (const b of kb[a]) {
        this.boundCodes.add(b.code);
        if (!b.mod) continue;
        if (b.mod === 'Control') this.ctrlCodes.add(b.code);
        let s = mods.get(b.code);
        if (!s) mods.set(b.code, (s = new Set()));
        s.add(b.mod);
      }
    }
    this.modsFor.clear();
    for (const [code, s] of mods) this.modsFor.set(code, MODS.filter((m) => s.has(m)));
  }

  /** Which modifier a physical code is latched with at the moment it goes down. */
  private latch(code: string, e: ModFlags): string {
    const mods = this.modsFor.get(code);
    if (mods) for (const m of mods) if (modFlag(e, m)) return m;
    return '';
  }

  // =============================================================================================
  // Internals — action state
  // =============================================================================================

  /** Recompute keyboard/mouse action state from held codes. */
  private refreshKb(): void {
    for (let i = 0; i < N_ACTIONS; i++) {
      const codes = this.kbCodes[i], latch = this.kbLatch[i];
      let d = 0;
      for (let j = 0; j < codes.length; j++) {
        if (this.held.get(codes[j]) === latch[j]) { d = 1; break; }
      }
      this.kbDown[i] = d;
      this.sync(i);
    }
  }

  /** Merge device states into the action and record edges. */
  private sync(i: number): void {
    const nd = this.kbDown[i] | this.padDown[i];
    const od = this.isDown[i];
    if (nd && !od) { this.pressedF[i] = 1; this.heldT[i] = 0; }
    else if (!nd && od) { this.releasedF[i] = 1; this.heldT[i] = 0; }
    this.isDown[i] = nd;
  }

  /** Momentary press (wheel, synthetic pause): pressed + released in the same step. */
  private pulse(i: number): void {
    if (this.isDown[i]) return;
    this.pressedF[i] = 1;
    this.releasedF[i] = 1;
  }

  private markDevice(d: Device): void {
    if (this._device === d) return;
    this._device = d;
    this.emit('device');
  }

  private emit(ev: InputEventName): void {
    const set = this.listeners.get(ev);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(this._device); } catch (err) { console.error('[input] listener failed', err); }
    }
  }

  /** Drop modifiers the event says are no longer held (missed keyup, e.g. after alt-tab). */
  private syncMods(e: ModFlags): boolean {
    let changed = false;
    for (const m of MODS) {
      if (modFlag(e, m)) continue;
      if (this.held.delete(m + 'Left')) changed = true;
      if (this.held.delete(m + 'Right')) changed = true;
    }
    return changed;
  }

  // =============================================================================================
  // Internals — DOM events
  // =============================================================================================

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (!code) return;
    if (this.capture) { this.captureKeyDown(e); return; }
    if (isTextEntry(e.target)) return;
    if (this.shouldPreventKey(e)) e.preventDefault();
    if (e.repeat) return; // OS auto-repeat: we track held state and do our own UI repeat

    const now = performance.now();
    if (code === 'Escape') {
      if (now < this.suppressEscUntil) return; // pointer-lock loss already produced this pause
      this.lastEscAt = now;
    }
    this.markDevice('kbm');
    this.syncMods(e);
    this.held.set(code, this.latch(code, e));
    this.refreshKb();

    let ev = UI_NAV_KEYS[code];
    if (ev) {
      if (code === 'Tab' && e.shiftKey) ev = 'tabPrev';
      this.uiPending.push(ev);
      const di = DIRS.indexOf(ev);
      if (di >= 0) this.dirJust[di] = 1;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const code = e.code;
    if (!code) return;
    if (this.capture) { this.captureKeyUp(e); return; }
    let changed = this.held.delete(code);
    if (this.syncMods(e)) changed = true;
    if (changed) this.refreshKb();
    if (!isTextEntry(e.target) && this.boundCodes.has(code)) e.preventDefault(); // e.g. Alt → menu bar
  };

  /** Block browser defaults for keys the game uses; leave F5/F11/F12, Ctrl shortcuts etc. alone. */
  private shouldPreventKey(e: KeyboardEvent): boolean {
    const code = e.code;
    if (e.metaKey) return false;
    if (e.ctrlKey && !this.ctrlCodes.has(code) && !code.startsWith('Control')) return false;
    return this.boundCodes.has(code) || code in UI_NAV_KEYS;
  }

  private readonly onMouseDown = (e: MouseEvent): void => {
    const b = e.button;
    if (b < 0 || b > 4) return;
    const code = MOUSE_CODES[b];
    if (this.capture) {
      const cap = this.capture;
      if (cap.armed && cap.device === 'kbm') {
        e.preventDefault();
        e.stopPropagation();
        this.swallowClickUntil = performance.now() + 1500;
        this.finishCapture(this.withMod(code, e));
      }
      return;
    }
    this.markDevice('kbm');
    const onCanvas = e.target === this.target || this.locked;
    if (!onCanvas) return; // clicks on the DOM UI never drive gameplay
    e.preventDefault();    // middle-click autoscroll, focus changes
    if (this.wantLock && !this.locked) {
      this.requestLock();
      // This click only re-locks — unless locking keeps failing (e.g. iframe without the
      // pointer-lock permission), in which case play on without mouse-look.
      if (this.lockErrors < 3) return;
    }
    this.syncMods(e);
    this.held.set(code, this.latch(code, e));
    this.refreshKb();
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    const b = e.button;
    if (b < 0 || b > 4) return;
    if (this.held.delete(MOUSE_CODES[b])) this.refreshKb();
    // Back/forward mouse buttons navigate on mouseup in some browsers.
    if ((b === 3 || b === 4) && (e.target === this.target || this.locked)) e.preventDefault();
  };

  private readonly onClick = (e: MouseEvent): void => {
    if (performance.now() < this.swallowClickUntil) {
      // The click that completed a binding capture must not also press a UI button.
      e.preventDefault();
      e.stopPropagation();
      this.swallowClickUntil = 0;
    }
  };

  private readonly onContextMenu = (e: MouseEvent): void => {
    if (e.target === this.target || this.locked || this.capture || performance.now() < this.swallowClickUntil) {
      e.preventDefault();
    }
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    let mx = e.movementX || 0, my = e.movementY || 0;
    const now = performance.now();
    if (now - this.moveWinStart > 250) { this.moveWinStart = now; this.moveWinPx = 0; }
    this.moveWinPx += Math.abs(mx) + Math.abs(my);
    if (this.moveWinPx > DEVICE_MOUSE_PX) this.markDevice('kbm');
    if (!this.locked || this.capture) return;

    mx = Math.max(-MOUSE_MAX_EVENT_PX, Math.min(MOUSE_MAX_EVENT_PX, mx));
    my = Math.max(-MOUSE_MAX_EVENT_PX, Math.min(MOUSE_MAX_EVENT_PX, my));
    const g = this.getSettings().gameplay;
    const k = MOUSE_RAD_PER_PX * g.mouseSensitivity;
    this.lookPX += mx * k * (g.invertX ? -1 : 1);
    this.lookPY += -my * k * (g.invertY ? -1 : 1);

    // Flick: > MOUSE_FLICK_PX horizontally within MOUSE_FLICK_WINDOW_MS, then a cooldown.
    if (now - this.flickStart > MOUSE_FLICK_WINDOW_MS) { this.flickStart = now; this.flickPx = 0; }
    this.flickPx += mx;
    if (Math.abs(this.flickPx) > MOUSE_FLICK_PX && now >= this.flickCooldownUntil) {
      this.tsPending += this.flickPx > 0 ? 1 : -1;
      this.flickCooldownUntil = now + MOUSE_FLICK_COOLDOWN_MS;
      this.flickPx = 0;
      this.flickStart = now;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    const cap = this.capture;
    const capturingKbm = !!cap && cap.armed && cap.device === 'kbm';
    if (!capturingKbm && !(e.target === this.target || this.locked)) return; // let UI lists scroll
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= 800;
    if (!dy) return;
    const now = performance.now();
    if (now - this.wheelLast > 200 || Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
    this.wheelLast = now;
    this.wheelAcc += dy;
    if (Math.abs(this.wheelAcc) < WHEEL_NOTCH_PX || now - this.wheelEmitAt < WHEEL_MIN_INTERVAL_MS) return;
    this.wheelAcc = 0;
    this.wheelEmitAt = now;
    const code = dy < 0 ? 'WheelUp' : 'WheelDown';
    if (cap) { if (capturingKbm) this.finishCapture(this.withMod(code, e)); return; }
    this.markDevice('kbm');

    const latch = this.latch(code, e);
    let bound = false;
    for (let i = 0; i < N_ACTIONS; i++) {
      const codes = this.kbCodes[i], l = this.kbLatch[i];
      for (let j = 0; j < codes.length; j++) {
        if (codes[j] === code && l[j] === latch) { this.pulse(i); bound = true; break; }
      }
    }
    if (!bound) this.tsPending += dy < 0 ? -1 : 1; // unbound wheel = lock-on target switch
  };

  private readonly onBlur = (): void => { this.releaseAll(); };
  private readonly onFocus = (): void => { this.fetchLayout(); };
  private readonly onVisibility = (): void => {
    if (this.doc.visibilityState === 'hidden') this.releaseAll();
  };

  private readonly onPointerLockChange = (): void => {
    const was = this.locked;
    this.locked = this.doc.pointerLockElement === this.target;
    if (this.locked) this.lockErrors = 0;
    if (was && !this.locked) {
      this.lookPX = 0; this.lookPY = 0;
      const now = performance.now();
      if (this.wantLock && this.pauseOnLockLoss && !this.capture && now - this.lastEscAt > ESC_DEDUPE_MS) {
        this.pendingPausePulse = true;
        this.suppressEscUntil = now + ESC_DEDUPE_MS; // a late Esc keydown is the same request
      }
    }
  };

  private readonly onPointerLockError = (): void => {
    // Usually "not in a user gesture" or the post-exit cooldown; the next canvas click retries.
    this.locked = false;
    this.lockErrors++;
  };

  private readonly onPadConnected = (): void => { this.emit('padConnected'); };

  private readonly onPadDisconnected = (e: GamepadEvent): void => {
    const idx = e.gamepad ? e.gamepad.index : -1;
    if (idx !== this.padIndex) return; // some other, unused pad
    this.padIndex = -1;
    this.padRaw.fill(0);
    this.releaseAll();
    this.padIgnore.fill(0);
    if (this.capture && this.capture.device === 'pad') this.finishCapture(null);
    this.emit('padDisconnected');
  };

  private requestLock(): void {
    try {
      const r: unknown = this.target.requestPointerLock();
      if (r && typeof (r as Promise<void>).catch === 'function') {
        (r as Promise<void>).catch(() => { /* pointerlockerror also fires; retry on next click */ });
      }
    } catch { this.lockErrors++; /* retry on next canvas click */ }
  }

  private fetchLayout(): void {
    const kb = (this.nav as unknown as { keyboard?: { getLayoutMap?: () => Promise<KeyLayout> } }).keyboard;
    if (!kb || typeof kb.getLayoutMap !== 'function') return;
    try {
      kb.getLayoutMap().then((m) => { this.layout = m; }, () => { /* unsupported / not allowed */ });
    } catch { /* ignore */ }
  }

  private withMod(code: string, e: ModFlags): KeyBinding {
    const mod = firstHeldMod(e);
    return mod ? { code, mod } : { code };
  }

  // =============================================================================================
  // Internals — gamepad polling
  // =============================================================================================

  private readPads(): readonly (Gamepad | null)[] | null {
    if (typeof this.nav.getGamepads !== 'function') return null;
    try { return this.nav.getGamepads(); } catch { return null; }
  }

  private pollPads(s: Settings, dt: number): void {
    const pads = this.readPads();
    // Active pad: the current one while it is in use, else whichever pad shows activity, else the
    // first connected pad.
    let active: Gamepad | null = null, first: Gamepad | null = null, other: Gamepad | null = null;
    if (pads) {
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (!p || !p.connected) continue;
        if (!first) first = p;
        if (p.index === this.padIndex) active = p;
        else if (!other && padHasActivity(p)) other = p;
      }
    }
    if (other && (!active || !padHasActivity(active))) active = other;
    if (!active) active = first;
    this.padIndex = active ? active.index : -1;

    const raw = this.padRaw, eff = this.padEff, prev = this.padEffPrev, ign = this.padIgnore;
    let lx = 0, ly = 0, rx = 0, ry = 0;
    if (active) {
      if (active.id !== this.padId) { this.padId = active.id; this.detectedStyle = detectPadStyle(active.id); }
      const btns = active.buttons;
      for (let b = 0; b < PAD_BUTTON_COUNT; b++) {
        const bt = btns[b];
        let v = 0;
        if (bt) {
          if (b === PAD.LT || b === PAD.RT) v = Math.max(bt.value, bt.pressed ? 1 : 0) >= TRIGGER_THRESHOLD ? 1 : 0;
          else v = bt.pressed || bt.value > 0.5 ? 1 : 0;
        }
        raw[b] = v;
      }
      const ax = active.axes;
      lx = ax[0] ?? 0; ly = ax[1] ?? 0; rx = ax[2] ?? 0; ry = ax[3] ?? 0;
      if (s.controls.swapSticks) { const tx = lx, ty = ly; lx = rx; ly = ry; rx = tx; ry = ty; }
    } else {
      raw.fill(0);
    }

    let anyRise = false;
    for (let b = 0; b < PAD_BUTTON_COUNT; b++) {
      if (!raw[b]) ign[b] = 0;
      prev[b] = eff[b];
      eff[b] = raw[b] && !ign[b] ? 1 : 0;
      if (eff[b] && !prev[b]) anyRise = true;
    }

    // Movement stick.
    const moveMag = radialDeadzone(lx, ly, STICK_DEADZONE, DZ);
    let mx = DZ.x, my = -DZ.y;
    if (this.moveBlocked) {
      if (moveMag === 0) this.moveBlocked = false; else { mx = 0; my = 0; }
    }
    this.moveX = mx; this.moveY = my;

    // Look stick.
    const lookMag = radialDeadzone(rx, ry, STICK_DEADZONE, DZ);
    if (anyRise || moveMag > 0 || lookMag > 0) this.markDevice('pad');

    // UI directions from the movement stick (dominant axis) and the D-pad.
    const ax = Math.abs(lx), ay = Math.abs(ly);
    this.stickDir = Math.max(ax, ay) < UI_STICK_THRESHOLD ? -1
      : ax > ay ? (lx < 0 ? 2 : 3) : (ly < 0 ? 0 : 1);
    for (let d = 0; d < 4; d++) this.padDirHeld[d] = eff[DIR_PAD[d]] || this.stickDir === d ? 1 : 0;

    if (this.capture) { this.capturePad(); return; }

    if (lookMag > 0) {
      const g = s.gameplay;
      const k = (stickLookCurve(lookMag) / lookMag) * STICK_LOOK_SPEED * g.padSensitivity * Math.min(dt, 0.1);
      this.lookX += DZ.x * k * (g.invertX ? -1 : 1);
      this.lookY += -DZ.y * k * (g.invertY ? -1 : 1);
    }

    // Right-stick flick → target switch (one per flick; re-arms near centre).
    if (Math.abs(rx) < FLICK_ARM) this.flickArmed = true;
    else if (this.flickArmed && rx >= FLICK_FIRE) { this.tsAcc += 1; this.flickArmed = false; }
    else if (this.flickArmed && rx <= -FLICK_FIRE) { this.tsAcc -= 1; this.flickArmed = false; }

    // Actions.
    for (let i = 0; i < N_ACTIONS; i++) {
      const list = this.padButtons[i];
      let d = 0;
      for (let j = 0; j < list.length; j++) if (eff[list[j]]) { d = 1; break; }
      if (d !== this.padDown[i]) { this.padDown[i] = d; this.sync(i); }
    }

    // UI buttons (directions are handled by updateUiDirs for repeat).
    for (let b = 0; b < PAD_BUTTON_COUNT; b++) {
      if (!eff[b] || prev[b]) continue;
      const ev = UI_NAV_PAD[b];
      if (ev && DIRS.indexOf(ev) < 0) this.uiFrame.push(ev);
    }
  }

  /** Directional UI events with key-repeat, from arrows/WASD, D-pad and the movement stick. */
  private updateUiDirs(dt: number): void {
    for (let d = 0; d < 4; d++) {
      const keys = DIR_KEYS[d];
      const active = this.held.has(keys[0]) || this.held.has(keys[1]) || this.padDirHeld[d] === 1;
      if (this.dirBlocked[d]) {
        if (!active) this.dirBlocked[d] = 0;
        this.dirActive[d] = 0;
        this.dirJust[d] = 0;
        continue;
      }
      if (active) {
        if (!this.dirActive[d]) {
          if (!this.dirJust[d]) this.uiFrame.push(DIRS[d]); // key events already emitted theirs
          this.dirT[d] = 0;
          this.dirNext[d] = UI_REPEAT_DELAY;
        } else {
          this.dirT[d] += dt;
          if (this.dirT[d] >= this.dirNext[d]) {
            this.uiFrame.push(DIRS[d]);
            this.dirNext[d] += UI_REPEAT_RATE;
            if (this.dirNext[d] <= this.dirT[d]) this.dirNext[d] = this.dirT[d] + UI_REPEAT_RATE; // hitch: no burst
          }
        }
      }
      this.dirActive[d] = active ? 1 : 0;
      this.dirJust[d] = 0;
    }
  }

  // =============================================================================================
  // Internals — binding capture
  // =============================================================================================

  private captureKeyDown(e: KeyboardEvent): void {
    const cap = this.capture!;
    e.preventDefault();
    e.stopPropagation();
    if (!cap.armed || e.repeat) return;
    const code = e.code;
    if (code === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.altKey) { this.finishCapture(null); return; }
    if (cap.device !== 'kbm') return; // pad capture: only Escape (cancel) matters on the keyboard
    if (isModifierCode(code)) { if (!cap.modCandidate) cap.modCandidate = code; return; }
    this.finishCapture(this.withMod(code, e));
  }

  private captureKeyUp(e: KeyboardEvent): void {
    const cap = this.capture!;
    e.preventDefault();
    // A modifier pressed and released on its own binds the modifier itself (e.g. Walk = Alt).
    if (cap.armed && cap.device === 'kbm' && cap.modCandidate === e.code) this.finishCapture({ code: e.code });
  }

  private capturePad(): void {
    const cap = this.capture!;
    if (!cap.armed || cap.device !== 'pad') return;
    const raw = this.padRaw, eff = this.padEff, prev = this.padEffPrev;
    if (cap.padPending >= 0) {
      const other = cap.padPending === PAD.VIEW ? PAD.MENU : PAD.VIEW;
      if (raw[other]) this.finishCapture(null);
      else if (!raw[cap.padPending]) this.finishCapture({ button: cap.padPending });
      return;
    }
    for (let b = 0; b < PAD_BUTTON_COUNT; b++) {
      if (!eff[b] || prev[b]) continue;
      if (b === PAD.MENU || b === PAD.VIEW) {
        const other = b === PAD.VIEW ? PAD.MENU : PAD.VIEW;
        if (raw[other]) this.finishCapture(null);
        else cap.padPending = b; // decide on release: alone = bind, with the other = cancel
        return;
      }
      this.finishCapture({ button: b });
      return;
    }
  }

  private finishCapture(result: KeyBinding | PadBinding | null): void {
    const cap = this.capture;
    if (!cap) return;
    if (cap.timer) clearTimeout(cap.timer);
    this.capture = null;
    this.releaseAll(); // the captured pad button stays ignored until released
    cap.resolve(result);
  }
}

/** Any button or stick activity on a pad (used to follow the pad the player is holding). */
function padHasActivity(p: Gamepad): boolean {
  const btns = p.buttons;
  for (let b = 0; b < btns.length; b++) {
    const bt = btns[b];
    if (bt && (bt.pressed || bt.value > 0.5)) return true;
  }
  const ax = p.axes;
  for (let i = 0; i < ax.length && i < 4; i++) if (Math.abs(ax[i]) > 0.5) return true;
  return false;
}

/*
 * INTEGRATION
 *  - Per rendered frame: input.beginFrame(realDt) BEFORE the simulation steps (LoopHooks.frameStart);
 *    after each fixed step call input.endStep(). Edges survive frames that run zero steps.
 *  - Camera: call look() and targetSwitch() once per frame after beginFrame (they consume; values
 *    not consumed in a frame are dropped at the next beginFrame, so a paused camera never jumps).
 *  - UI: call consumeUi() once per frame while a screen is open (unconsumed events are dropped
 *    at the next beginFrame).
 *  - Call releaseAll() on every transition into AND out of a menu/dialogue/pause (not every frame):
 *    it clears held/edge state and the pending UI events, so the Esc/Menu/E that opened a screen
 *    does not also act inside it, and the B/Esc that closed it does not dodge/pause in play.
 *    Pad buttons still held are ignored until released; the left stick must re-centre.
 *  - releaseAll() emits no `released` edges: gameplay holding state (charge, guard) should also
 *    end when down() turns false.
 *  - setPointerLock(true) when gameplay has control, false BEFORE a DOM screen opens. If lock is
 *    lost while wanted (browser Esc, alt-tab) a one-shot `pause` press is delivered next frame
 *    (`pauseOnLockLoss`), deduped against the Escape keydown itself.
 */
