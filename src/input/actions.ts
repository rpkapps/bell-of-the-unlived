/**
 * CONTRACT — shared by input, UI and gameplay. Do not change without updating all users.
 *
 * Gameplay actions are sampled per fixed simulation step; UI navigation is a separate per-frame
 * event stream (see `UiNavEvent`).
 */
export const ACTIONS = [
  // gameplay
  'moveForward', 'moveBack', 'moveLeft', 'moveRight', // keyboard-only digital move (pad uses left stick)
  'light', 'heavy', 'guard', 'parry', 'technique',
  'dodge',        // tap = dodge / backstep, hold = sprint
  'interact', 'useItem', 'lockOn', 'walk',
  'cycleSpell', 'cycleItem', 'cycleRight', 'cycleLeft',
  'journal', 'pause',
] as const;
export type ActionId = (typeof ACTIONS)[number];

/** Human-readable names for the remapping screen. */
export const ACTION_LABELS: Record<ActionId, string> = {
  moveForward: 'Move forward', moveBack: 'Move back', moveLeft: 'Move left', moveRight: 'Move right',
  light: 'Light attack / cast', heavy: 'Heavy attack (hold to charge)', guard: 'Guard / aim',
  parry: 'Parry', technique: 'Imprint Technique', dodge: 'Dodge (tap) / Sprint (hold)',
  interact: 'Interact', useItem: 'Use quick item', lockOn: 'Lock on / switch target', walk: 'Walk',
  cycleSpell: 'Cycle spell', cycleItem: 'Cycle quick item', cycleRight: 'Cycle right-hand weapon',
  cycleLeft: 'Cycle left-hand item', journal: 'Journal', pause: 'Pause menu',
};

/** Actions that can never be unbound (so the player can't lock themselves out). */
export const REQUIRED_ACTIONS: ActionId[] = ['pause', 'interact'];

export type Device = 'kbm' | 'pad';
export type PadStyle = 'xbox' | 'playstation';

/**
 * Keyboard/mouse binding. `code` is a KeyboardEvent.code ("KeyW", "Space", "ShiftLeft"...),
 * or a mouse code: "Mouse0" (left), "Mouse1" (middle), "Mouse2" (right), "Mouse3", "Mouse4",
 * "WheelUp", "WheelDown". `mod` requires a held modifier (either side).
 */
export interface KeyBinding { code: string; mod?: 'Shift' | 'Control' | 'Alt' }
/** Gamepad binding: W3C "standard" mapping button index (0..16). Triggers are 6/7. */
export interface PadBinding { button: number }

export type KeyBindings = Record<ActionId, KeyBinding[]>;
export type PadBindings = Record<ActionId, PadBinding[]>;

export type UiNavEvent =
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'back' | 'tabPrev' | 'tabNext'
  | 'pause' | 'journal' | 'details';

/**
 * The input system's public surface (implemented by src/input/Input.ts).
 */
export interface IInput {
  readonly device: Device;
  readonly padStyle: PadStyle;
  readonly padConnected: boolean;
  /** Per rendered frame: poll gamepads, derive UI nav events, look deltas. */
  beginFrame(realDt: number): void;

  // --- simulation-step API (edges accumulate until endStep) ---
  pressed(a: ActionId): boolean;
  released(a: ActionId): boolean;
  down(a: ActionId): boolean;
  /** Seconds the action has been continuously held (0 if not down). */
  heldTime(a: ActionId): number;
  /** Movement intent, x = right, y = forward, magnitude 0..1 (keyboard is 1 unless walk). */
  move(): { x: number; y: number };
  /**
   * Camera look delta to apply THIS FRAME in radians (yaw: +x turns camera right, pitch: +y looks up).
   * Already includes sensitivity, inversion and frame time for sticks. Consumed per frame.
   */
  look(): { x: number; y: number };
  /** Lock-on target switch intent this frame: -1 left, +1 right, 0 none (right-stick flick / mouse flick / wheel). */
  targetSwitch(): number;
  endStep(): void;

  // --- UI ---
  /** Per-frame UI navigation events (with key-repeat), consumed by the caller. */
  consumeUi(): UiNavEvent[];
  /** Release every held input (window blur, pause, disconnect, menu open). */
  releaseAll(): void;

  // --- bindings & prompts ---
  getKeyBindings(): KeyBindings;
  getPadBindings(): PadBindings;
  setKeyBinding(a: ActionId, slot: number, b: KeyBinding | null): void;
  setPadBinding(a: ActionId, slot: number, b: PadBinding | null): void;
  resetBindings(device: Device): void;
  /** Wait for the next key/mouse button (kbm) or pad button (pad). Esc / Start+Back cancels → null. */
  captureBinding(device: Device): Promise<KeyBinding | PadBinding | null>;
  /** Prompt label for the action on the current (or given) device: "LMB", "Shift+LMB", "RB", "R1"... */
  glyph(a: ActionId, device?: Device): string;
  /** Pointer lock for mouse-look during gameplay. */
  setPointerLock(on: boolean): void;

  on(ev: 'device', fn: (d: Device) => void): () => void;
  on(ev: 'padDisconnected' | 'padConnected', fn: () => void): () => void;
}
