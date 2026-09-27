/** CONTRACT — persisted settings shape. Defaults live here; UI edits it; systems read it. */
import type { KeyBindings, PadBindings, PadStyle } from '../input/actions';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type HoldToggle = 'hold' | 'toggle';

export interface Settings {
  version: 1;
  graphics: {
    quality: Quality;
    renderScale: number;        // 0.5..1.5
    fov: number;                // vertical degrees 50..90
    brightness: number;         // 0.5..1.5 (exposure multiplier)
    motionBlur: boolean;
    motionBlurStrength: number; // 0..1
    cameraShake: number;        // 0..1
    effectsIntensity: number;   // 0..1 particle/flash intensity
    reduceFlashes: boolean;
    filmGrain: boolean;
    bloom: boolean;
    frameCap: 0 | 30 | 60 | 120 | 144; // 0 = uncapped (vsync)
    showFps: boolean;
  };
  audio: {
    master: number; music: number; sfx: number; ambience: number; voice: number; ui: number; // 0..1
    mono: boolean;
  };
  gameplay: {
    mouseSensitivity: number;   // 0.1..3
    padSensitivity: number;     // 0.1..3
    invertY: boolean;
    invertX: boolean;
    cameraAutoRecenter: boolean;
    showHitboxes: boolean;
    showIFrames: boolean;
    hints: boolean;
  };
  accessibility: {
    subtitles: boolean;
    speakerLabels: boolean;
    soundCaptions: boolean;
    textScale: number;          // 0.8..1.6
    highVisibilityCues: boolean;
    holdToggle: { guard: HoldToggle; sprint: HoldToggle; walk: HoldToggle; chargeHeavy: HoldToggle };
  };
  controls: {
    keyboard: KeyBindings | null; // null = defaults
    gamepad: PadBindings | null;
    padLayout: 'auto' | PadStyle;
    swapSticks: boolean;
  };
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    graphics: {
      quality: 'high', renderScale: 1, fov: 60, brightness: 1, motionBlur: false, motionBlurStrength: 0.5,
      cameraShake: 1, effectsIntensity: 1, reduceFlashes: false, filmGrain: true, bloom: true, frameCap: 0, showFps: false,
    },
    audio: { master: 0.9, music: 0.7, sfx: 0.9, ambience: 0.8, voice: 1, ui: 0.7, mono: false },
    gameplay: {
      mouseSensitivity: 1, padSensitivity: 1, invertY: false, invertX: false, cameraAutoRecenter: true,
      showHitboxes: false, showIFrames: false, hints: true,
    },
    accessibility: {
      subtitles: true, speakerLabels: true, soundCaptions: true, textScale: 1, highVisibilityCues: false,
      holdToggle: { guard: 'hold', sprint: 'hold', walk: 'toggle', chargeHeavy: 'hold' },
    },
    controls: { keyboard: null, gamepad: null, padLayout: 'auto', swapSticks: false },
  };
}

/** Deep-merge loaded settings over defaults so new fields always exist. */
export function mergeSettings(loaded: unknown): Settings {
  const d = defaultSettings() as any;
  const merge = (dst: any, src: any) => {
    if (!src || typeof src !== 'object') return;
    for (const k of Object.keys(dst)) {
      if (!(k in src)) continue;
      if (dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]);
      else if (typeof src[k] === typeof dst[k] || dst[k] === null) dst[k] = src[k];
    }
  };
  merge(d, loaded);
  return d as Settings;
}
