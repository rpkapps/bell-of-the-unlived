import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIONS } from '../src/input/actions';
import { defaultSettings, type Settings } from '../src/game/settings';
import { defaultKeyBindings, defaultPadBindings } from '../src/input/defaults';
import { bindingLabel, detectPadStyle, keyLabel, padLabel, uiNavLabel } from '../src/input/glyphs';
import {
  applyBindingChange, Input, keyBindingEquals, radialDeadzone, resolveKeyBindings, stickLookCurve,
  STICK_LOOK_SPEED, MOUSE_RAD_PER_PX,
} from '../src/input/Input';

// ------------------------------------------------------------------------------------------------
// Pure helpers
// ------------------------------------------------------------------------------------------------

describe('defaults', () => {
  it('cover every action and match the GDD table', () => {
    const k = defaultKeyBindings(), p = defaultPadBindings();
    for (const a of ACTIONS) { expect(Array.isArray(k[a])).toBe(true); expect(Array.isArray(p[a])).toBe(true); }
    expect(k.light).toEqual([{ code: 'Mouse0' }]);
    expect(k.heavy).toEqual([{ code: 'Mouse0', mod: 'Shift' }]);
    expect(k.parry).toEqual([{ code: 'Mouse2', mod: 'Shift' }]);
    expect(k.lockOn).toEqual([{ code: 'KeyQ' }, { code: 'Mouse1' }]);
    expect(k.cycleLeft).toEqual([{ code: 'Digit4' }, { code: 'ArrowLeft' }]);
    expect(k.walk).toEqual([{ code: 'AltLeft' }]);
    expect(p.light[0]).toEqual({ button: 5 });
    expect(p.heavy[0]).toEqual({ button: 7 });
    expect(p.parry[0]).toEqual({ button: 6 });
    expect(p.cycleRight[0]).toEqual({ button: 15 });
    expect(p.cycleLeft[0]).toEqual({ button: 14 });
    expect(p.journal[0]).toEqual({ button: 8 });
    expect(p.pause[0]).toEqual({ button: 9 });
  });
});

describe('glyph labels', () => {
  it('labels keys and mouse', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Space')).toBe('Space');
    expect(keyLabel('ShiftLeft')).toBe('Shift');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Mouse0')).toBe('LMB');
    expect(keyLabel('Mouse2')).toBe('RMB');
    expect(keyLabel('Mouse1')).toBe('MMB');
    expect(keyLabel('WheelUp')).toBe('Wheel ↑');
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('KeyW', new Map([['KeyW', 'z']]))).toBe('Z');
    expect(bindingLabel({ code: 'Mouse0', mod: 'Shift' }, 'kbm', 'xbox')).toBe('Shift+LMB');
    expect(bindingLabel({ code: 'KeyK', mod: 'Control' }, 'kbm', 'xbox')).toBe('Ctrl+K');
    expect(bindingLabel(undefined, 'kbm', 'xbox')).toBe('—');
  });
  it('labels pad buttons per style', () => {
    expect(padLabel(5, 'xbox')).toBe('RB');
    expect(padLabel(5, 'playstation')).toBe('R1');
    expect(padLabel(0, 'playstation')).toBe('✕');
    expect(padLabel(9, 'playstation')).toBe('Options');
    expect(padLabel(8, 'xbox')).toBe('View');
    expect(padLabel(14, 'xbox')).toBe('D←');
    expect(bindingLabel({ button: 7 }, 'pad', 'playstation')).toBe('R2');
    expect(uiNavLabel('confirm', 'pad', 'playstation')).toBe('✕');
    expect(uiNavLabel('back', 'kbm', 'xbox')).toBe('Esc');
  });
  it('detects PlayStation pads', () => {
    expect(detectPadStyle('054c-0ce6-DualSense Wireless Controller')).toBe('playstation');
    expect(detectPadStyle('Wireless Controller (STANDARD GAMEPAD Vendor: 054c)')).toBe('playstation');
    expect(detectPadStyle('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
  });
});

describe('dead-zone and curve', () => {
  it('zeroes inside the dead-zone and rescales outside', () => {
    const o = { x: 0, y: 0 };
    expect(radialDeadzone(0.1, 0.1, 0.18, o)).toBe(0);
    expect(o).toEqual({ x: 0, y: 0 });
    expect(radialDeadzone(1, 0, 0.18, o)).toBeCloseTo(1);
    expect(o.x).toBeCloseTo(1);
    const m = radialDeadzone(0.59, 0, 0.18, o);
    expect(m).toBeCloseTo(0.5, 5);
    expect(stickLookCurve(0.5)).toBeCloseTo(Math.pow(0.5, 1.6));
    expect(stickLookCurve(0)).toBe(0);
  });
});

describe('binding changes', () => {
  const copy = (b: { code: string; mod?: 'Shift' | 'Control' | 'Alt' }) => ({ ...b });
  it('swaps with the action that used the binding', () => {
    const next = applyBindingChange(defaultKeyBindings(), 'technique', 0, { code: 'Space' }, keyBindingEquals, copy)!;
    expect(next.technique).toEqual([{ code: 'Space' }]);
    expect(next.dodge).toEqual([{ code: 'KeyF' }]);
  });
  it('removes the binding from the other action when appending', () => {
    const next = applyBindingChange(defaultKeyBindings(), 'lockOn', 5, { code: 'Space' }, keyBindingEquals, copy)!;
    expect(next.lockOn).toEqual([{ code: 'KeyQ' }, { code: 'Mouse1' }, { code: 'Space' }]);
    expect(next.dodge).toEqual([]);
  });
  it('treats modded and plain bindings as different', () => {
    const next = applyBindingChange(defaultKeyBindings(), 'technique', 0, { code: 'Mouse0', mod: 'Shift' }, keyBindingEquals, copy)!;
    expect(next.light).toEqual([{ code: 'Mouse0' }]);
    expect(next.heavy).toEqual([{ code: 'KeyF' }]);
  });
  it('refuses to leave a required action unbound', () => {
    expect(applyBindingChange(defaultKeyBindings(), 'interact', 0, null, keyBindingEquals, copy)).toBeNull();
    expect(applyBindingChange(defaultKeyBindings(), 'journal', 1, { code: 'KeyE' }, keyBindingEquals, copy)).toBeNull();
  });
  it('resolves stored bindings over defaults and repairs broken ones', () => {
    const stored = { ...defaultKeyBindings(), pause: [], light: [{ code: 'KeyZ' }, { nope: 1 }] } as never;
    const r = resolveKeyBindings(stored);
    expect(r.pause).toEqual([{ code: 'Escape' }]);
    expect(r.light).toEqual([{ code: 'KeyZ' }]);
  });
});

// ------------------------------------------------------------------------------------------------
// Input with a minimal fake DOM
// ------------------------------------------------------------------------------------------------

interface FakeButton { pressed: boolean; value: number; touched: boolean }
interface FakePad { index: number; id: string; connected: boolean; mapping: string; buttons: FakeButton[]; axes: number[]; timestamp: number }

let fakeWin: EventTarget;
let fakeDoc: EventTarget & { pointerLockElement: unknown; visibilityState: string; exitPointerLock(): void };
let canvas: FakeCanvas;
let pads: (FakePad | null)[];
let settings: Settings;
let input: Input;

class FakeCanvas extends EventTarget {
  tagName = 'CANVAS';
  requestPointerLock(): Promise<void> {
    fakeDoc.pointerLockElement = this;
    fakeDoc.dispatchEvent(new Event('pointerlockchange'));
    return Promise.resolve();
  }
}

function makePad(id = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'): FakePad {
  return {
    index: 0, id, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
  };
}
function padBtn(p: FakePad, b: number, down: boolean): void {
  p.buttons[b].pressed = down; p.buttons[b].value = down ? 1 : 0;
}

type Mods = Partial<{ shiftKey: boolean; ctrlKey: boolean; altKey: boolean }>;
function key(type: 'keydown' | 'keyup', code: string, mods: Mods = {}, repeat = false): Event {
  const e = Object.assign(new Event(type, { cancelable: true }), {
    code, repeat, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...mods,
  });
  fakeWin.dispatchEvent(e);
  return e;
}
function mouse(type: 'mousedown' | 'mouseup' | 'mousemove', button: number, mods: Mods & { movementX?: number; movementY?: number } = {}, target: unknown = canvas): Event {
  const e = Object.assign(new Event(type, { cancelable: true }), {
    button, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, movementX: 0, movementY: 0, ...mods,
  });
  Object.defineProperty(e, 'target', { value: target });
  fakeWin.dispatchEvent(e);
  return e;
}
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  fakeWin = new EventTarget();
  fakeDoc = Object.assign(new EventTarget(), {
    pointerLockElement: null as unknown,
    visibilityState: 'visible',
    exitPointerLock() { fakeDoc.pointerLockElement = null; fakeDoc.dispatchEvent(new Event('pointerlockchange')); },
  });
  pads = [];
  vi.stubGlobal('window', fakeWin);
  vi.stubGlobal('document', fakeDoc);
  vi.stubGlobal('navigator', { getGamepads: () => pads });
  settings = defaultSettings();
  canvas = new FakeCanvas();
  input = new Input(canvas as unknown as HTMLElement, () => settings);
});
afterEach(() => {
  input.dispose();
  vi.unstubAllGlobals();
});

describe('Input: keyboard & mouse', () => {
  it('keeps LMB and Shift+LMB mutually exclusive', () => {
    mouse('mousedown', 0);
    expect(input.pressed('light')).toBe(true);
    expect(input.down('heavy')).toBe(false);
    mouse('mouseup', 0);
    input.endStep();

    key('keydown', 'ShiftLeft', { shiftKey: true });
    mouse('mousedown', 0, { shiftKey: true });
    expect(input.pressed('heavy')).toBe(true);
    expect(input.down('light')).toBe(false);
    // Releasing Shift mid-hold keeps the heavy held (latched at press time).
    key('keyup', 'ShiftLeft');
    expect(input.down('heavy')).toBe(true);
    expect(input.down('light')).toBe(false);
    mouse('mouseup', 0);
    expect(input.released('heavy')).toBe(true);
  });

  it('lets unrelated modifiers through (Shift+W still moves)', () => {
    key('keydown', 'ShiftLeft', { shiftKey: true });
    key('keydown', 'KeyW', { shiftKey: true });
    expect(input.down('moveForward')).toBe(true);
    expect(input.move()).toEqual({ x: 0, y: 1 });
  });

  it('keeps edges until endStep, across frames with zero steps', () => {
    key('keydown', 'Space');
    key('keyup', 'Space');      // tap shorter than a frame
    input.beginFrame(1 / 240);  // frame with no sim step
    input.beginFrame(1 / 240);
    expect(input.pressed('dodge')).toBe(true);
    expect(input.released('dodge')).toBe(true);
    expect(input.down('dodge')).toBe(false);
    input.endStep();
    expect(input.pressed('dodge')).toBe(false);
  });

  it('ignores OS key repeat and counts heldTime', () => {
    key('keydown', 'KeyE');
    input.endStep();
    key('keydown', 'KeyE', {}, true);
    expect(input.pressed('interact')).toBe(false);
    input.beginFrame(0.1); input.beginFrame(0.1);
    expect(input.heldTime('interact')).toBeCloseTo(0.2);
    key('keyup', 'KeyE');
    expect(input.heldTime('interact')).toBe(0);
  });

  it('normalizes diagonal keyboard movement', () => {
    key('keydown', 'KeyW'); key('keydown', 'KeyD');
    const m = input.move();
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
    expect(m.x).toBeGreaterThan(0);
  });

  it('ignores clicks on the DOM UI and uses the first canvas click to re-lock', () => {
    mouse('mousedown', 0, {}, { tagName: 'BUTTON' });
    expect(input.down('light')).toBe(false);
    settings.controls.keyboard = null;
    input.setPointerLock(true);
    expect(input.pointerLocked).toBe(true);
    fakeDoc.exitPointerLock(); // lost (e.g. alt-tab) → wantLock remains
    mouse('mousedown', 0);
    expect(input.down('light')).toBe(false);
    expect(input.pointerLocked).toBe(true);
  });

  it('turns mouse motion into look only while locked', () => {
    mouse('mousemove', 0, { movementX: 100, movementY: 0 });
    input.beginFrame(1 / 60);
    expect(input.look().x).toBe(0);
    input.setPointerLock(true);
    mouse('mousemove', 0, { movementX: 10, movementY: -10 });
    input.beginFrame(1 / 60);
    const l = input.look();
    expect(l.x).toBeCloseTo(10 * MOUSE_RAD_PER_PX);
    expect(l.y).toBeCloseTo(10 * MOUSE_RAD_PER_PX); // mouse up = look up
    expect(input.look()).toEqual({ x: 0, y: 0 });
    // Unconsumed look does not carry over into the next frame.
    mouse('mousemove', 0, { movementX: 50, movementY: 0 });
    input.beginFrame(1 / 60);
    input.beginFrame(1 / 60);
    expect(input.look().x).toBe(0);
    settings.gameplay.invertY = true;
    mouse('mousemove', 0, { movementX: 0, movementY: -10 });
    input.beginFrame(1 / 60);
    expect(input.look().y).toBeCloseTo(-10 * MOUSE_RAD_PER_PX);
  });

  it('pulses pause once when pointer lock is lost during play, deduping a late Esc', () => {
    input.setPointerLock(true);
    fakeDoc.pointerLockElement = null;
    fakeDoc.dispatchEvent(new Event('pointerlockchange'));
    input.beginFrame(1 / 60);
    expect(input.pressed('pause')).toBe(true);
    input.endStep();
    key('keydown', 'Escape');
    expect(input.pressed('pause')).toBe(false);
  });

  it('emits UI events with key repeat and clears them on releaseAll', () => {
    key('keydown', 'ArrowDown');
    input.beginFrame(0.01);
    expect(input.consumeUi()).toEqual(['down']);
    let repeats = 0;
    for (let i = 0; i < 59; i++) { input.beginFrame(0.01); repeats += input.consumeUi().length; }
    expect(repeats).toBe(3); // 0.38, 0.47, 0.56
    key('keyup', 'ArrowDown');

    key('keydown', 'Escape');
    key('keydown', 'Tab', { shiftKey: true });
    key('keydown', 'KeyE');
    input.beginFrame(0.01);
    expect(input.consumeUi()).toEqual(['back', 'tabPrev', 'confirm']);
    key('keydown', 'Enter');
    input.releaseAll();
    input.beginFrame(0.01);
    expect(input.consumeUi()).toEqual([]);
  });

  it('prevents default only for keys the game uses', () => {
    expect(key('keydown', 'Space').defaultPrevented).toBe(true);
    expect(key('keydown', 'F5').defaultPrevented).toBe(false);
    expect(key('keydown', 'KeyR', { ctrlKey: true }).defaultPrevented).toBe(false); // Ctrl+R reload
  });

  it('persists remaps into settings', () => {
    input.setKeyBinding('technique', 0, { code: 'Space' });
    expect(settings.controls.keyboard?.technique).toEqual([{ code: 'Space' }]);
    expect(settings.controls.keyboard?.dodge).toEqual([{ code: 'KeyF' }]);
    expect(input.glyph('dodge', 'kbm')).toBe('F');
    input.setKeyBinding('interact', 0, null); // refused
    expect(input.getKeyBindings().interact).toEqual([{ code: 'KeyE' }]);
    input.resetBindings('kbm');
    expect(settings.controls.keyboard).toBeNull();
    expect(input.glyph('heavy', 'kbm')).toBe('Shift+LMB');
  });
});

describe('Input: gamepad', () => {
  let pad: FakePad;
  beforeEach(() => { pad = makePad(); pads = [pad]; });

  it('maps buttons, switches device and styles', () => {
    const devices: string[] = [];
    input.on('device', (d) => devices.push(d));
    padBtn(pad, 5, true);
    input.beginFrame(1 / 60);
    expect(input.pressed('light')).toBe(true);
    expect(input.device).toBe('pad');
    expect(devices).toEqual(['pad']);
    expect(input.glyph('heavy')).toBe('RT');
    settings.controls.padLayout = 'playstation';
    expect(input.glyph('heavy')).toBe('R2');
    key('keydown', 'KeyW');
    expect(input.device).toBe('kbm');
  });

  it('uses a 0.35 trigger threshold', () => {
    pad.buttons[7].value = 0.3;
    input.beginFrame(1 / 60);
    expect(input.down('heavy')).toBe(false);
    pad.buttons[7].value = 0.4;
    input.beginFrame(1 / 60);
    expect(input.down('heavy')).toBe(true);
  });

  it('ignores buttons held through releaseAll until released once', () => {
    padBtn(pad, 1, true);
    input.beginFrame(1 / 60);
    input.endStep();
    input.releaseAll();
    input.beginFrame(1 / 60);
    expect(input.down('dodge')).toBe(false);
    expect(input.pressed('dodge')).toBe(false);
    expect(input.consumeUi()).toEqual([]);
    padBtn(pad, 1, false);
    input.beginFrame(1 / 60);
    padBtn(pad, 1, true);
    input.beginFrame(1 / 60);
    expect(input.pressed('dodge')).toBe(true);
    expect(input.consumeUi()).toEqual(['back']);
  });

  it('moves with the left stick and looks with the right stick', () => {
    pad.axes = [0, -1, 1, 0];
    input.beginFrame(0.1);
    const m = input.move();
    expect(m.y).toBeCloseTo(1);
    expect(input.look().x).toBeCloseTo(STICK_LOOK_SPEED * 0.1);
    settings.controls.swapSticks = true;
    input.beginFrame(0.1);
    expect(input.move().x).toBeCloseTo(1);
  });

  it('switches target once per right-stick flick', () => {
    input.beginFrame(1 / 60);
    pad.axes[2] = 0.8;
    input.beginFrame(1 / 60);
    expect(input.targetSwitch()).toBe(1);
    input.beginFrame(1 / 60);
    expect(input.targetSwitch()).toBe(0);
    pad.axes[2] = 0; input.beginFrame(1 / 60);
    pad.axes[2] = -0.9; input.beginFrame(1 / 60);
    expect(input.targetSwitch()).toBe(-1);
  });

  it('releases everything and notifies on disconnect of the active pad', () => {
    let disconnected = 0;
    input.on('padDisconnected', () => { disconnected++; });
    padBtn(pad, 4, true);
    input.beginFrame(1 / 60);
    expect(input.down('guard')).toBe(true);
    pads = [];
    fakeWin.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: pad }));
    expect(input.down('guard')).toBe(false);
    expect(disconnected).toBe(1);
    expect(input.padConnected).toBe(false);
  });

  it('D-pad drives UI navigation', () => {
    padBtn(pad, 13, true);
    padBtn(pad, 0, true);
    input.beginFrame(1 / 60);
    expect(input.consumeUi()).toEqual(['confirm', 'down']);
  });
});

describe('Input: binding capture', () => {
  it('captures a key with a held modifier', async () => {
    const p = input.captureBinding('kbm');
    await tick();
    key('keydown', 'ShiftLeft', { shiftKey: true });
    key('keydown', 'KeyG', { shiftKey: true });
    expect(await p).toEqual({ code: 'KeyG', mod: 'Shift' });
  });

  it('captures a lone modifier on release, a mouse button, and cancels on Escape', async () => {
    let p = input.captureBinding('kbm');
    await tick();
    key('keydown', 'AltLeft', { altKey: true });
    key('keyup', 'AltLeft');
    expect(await p).toEqual({ code: 'AltLeft' });

    p = input.captureBinding('kbm');
    await tick();
    mouse('mousedown', 3, {}, { tagName: 'DIV' });
    expect(await p).toEqual({ code: 'Mouse3' });

    p = input.captureBinding('kbm');
    await tick();
    key('keydown', 'Escape');
    expect(await p).toBeNull();
  });

  it('suppresses gameplay while capturing and ignores the triggering event', async () => {
    const p = input.captureBinding('kbm');
    key('keydown', 'KeyX'); // same task as the call: not captured
    await tick();
    key('keydown', 'KeyK');
    expect(await p).toEqual({ code: 'KeyK' });
    expect(input.down('moveForward')).toBe(false);
  });

  it('captures pad buttons; Menu+View cancels', async () => {
    const pad = makePad();
    pads = [pad];
    let p = input.captureBinding('pad');
    await tick();
    padBtn(pad, 3, true);
    input.beginFrame(1 / 60);
    expect(await p).toEqual({ button: 3 });
    padBtn(pad, 3, false);
    input.beginFrame(1 / 60);

    p = input.captureBinding('pad');
    await tick();
    padBtn(pad, 9, true);
    input.beginFrame(1 / 60);
    padBtn(pad, 8, true);
    input.beginFrame(1 / 60);
    expect(await p).toBeNull();
    // Buttons used to cancel stay ignored afterwards.
    input.beginFrame(1 / 60);
    expect(input.pressed('pause')).toBe(false);
  });
});
