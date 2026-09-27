/** UI sounds: subtle, low, tasteful — wood, bronze and small bells. */
import { vary } from '../engine/Voice';
import { tinyBell } from './bells';
import { metal, thump, whoosh } from './impacts';
import type { Synth } from './types';

/** Soft wooden tick. */
export const uiMove: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.04);
  v.burst({ type: 'bandpass', freq: 1700 * r, q: 3, peak: 0.35, d: 0.02 });
  v.tone({ freq: 880 * r, peak: 0.08, d: 0.025 });
};

/** Tab switch: a slightly brighter tick pair. */
export const uiTab: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.03);
  v.burst({ type: 'bandpass', freq: 2400 * r, q: 3, peak: 0.3, d: 0.018 });
  v.tone({ freq: 1320 * r, peak: 0.07, d: 0.03 });
  v.burst({ type: 'bandpass', freq: 2000 * r, q: 3, peak: 0.18, d: 0.015, at: v.t + 0.045 });
};

/** Confirm: a small bronze click. */
export const uiConfirm: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.02);
  metal(v, { f: 1250 * r, peak: 0.12, decay: 0.22, ratios: [1, 2.41, 3.93], bright: 0.5 });
  v.burst({ type: 'highpass', freq: 3500, peak: 0.18, d: 0.012 });
};

/** Back: lower, falling wooden tick. */
export const uiBack: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.03);
  v.burst({ type: 'bandpass', freq: 950 * r, q: 3, peak: 0.35, d: 0.03 });
  v.tone({ freq: 520 * r, bendTo: 400 * r, bendDur: 0.06, peak: 0.1, d: 0.07 });
};

/** Error: dull buzz-thud. */
export const uiError: Synth = (v, p) => {
  const o = v.osc('square', 92 * p.rate);
  const lp = v.filter('lowpass', 650, 1);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, v.t);
  g.gain.linearRampToValueAtTime(0.1, v.t + 0.008);
  g.gain.setValueAtTime(0.1, v.t + 0.1);
  g.gain.linearRampToValueAtTime(0, v.t + 0.14);
  o.connect(lp).connect(g).connect(v.out);
  thump(v, 90, 0.35, 0.12);
  v.hold(v.t + 0.2);
};

/** Menu open: soft breath + a tiny bell tick. */
export const uiOpen: Synth = (v, p) => {
  whoosh(v, { dur: 0.24, f0: 380, f1: 1500, peak: 0.12, q: 1, panFrom: 0, panTo: 0 });
  tinyBell(v, 880 * p.rate, 0.05, v.t + 0.06, 1.1);
};

/** Menu close: reverse gesture. */
export const uiClose: Synth = (v, p) => {
  whoosh(v, { dur: 0.18, f0: 1300, f1: 450, peak: 0.1, q: 1, panFrom: 0, panTo: 0 });
  v.burst({ type: 'bandpass', freq: 1100 * p.rate, q: 3, peak: 0.18, d: 0.02, at: v.t + 0.1 });
};

/** Level up: a small bell chord (D major, arpeggiated). */
export const uiLevelup: Synth = (v, p) => {
  [587.3, 740, 880, 1174.7].forEach((f, i) => tinyBell(v, f * p.rate, 0.1 - i * 0.012, v.t + i * 0.07, 3));
};
