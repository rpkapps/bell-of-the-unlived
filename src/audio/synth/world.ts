/** World interaction sounds: doors, gates, levers, chains, the drawbridge, fog, anchors, memories. */
import { rand, swell, vary, type Voice } from '../engine/Voice';
import { bell, SMALL_PARTIALS, tinyBell } from './bells';
import { grains, metal, thump, whoosh } from './impacts';
import { glassPing } from './magic';
import type { Synth } from './types';

/**
 * Stick-slip creak (hinges, boards): a pulse train whose rate jitters, through resonances.
 * `res` are resonant body frequencies; heavier/iron = higher, sharper resonances.
 */
export function creak(v: Voice, o: { dur: number; rate0: number; rate1: number; res: readonly number[]; peak: number; at?: number; q?: number }): void {
  const at = o.at ?? v.t;
  const src = v.osc('sawtooth', o.rate0, at, at + o.dur + 0.05);
  // Jitter the slip rate in small random steps.
  const steps = Math.floor(o.dur / 0.035);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const f = (o.rate0 + (o.rate1 - o.rate0) * k) * rand(0.75, 1.3);
    src.frequency.linearRampToValueAtTime(Math.max(8, f), at + k * o.dur);
  }
  const g = v.gain(0);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(o.peak, at + o.dur * 0.15);
  g.gain.setValueAtTime(o.peak, at + o.dur * 0.7);
  g.gain.linearRampToValueAtTime(0, at + o.dur);
  const sum = v.gain(1);
  for (const r of o.res) {
    const bp = v.filter('bandpass', r * vary(1, 0.05), o.q ?? 10);
    src.connect(bp).connect(sum);
  }
  sum.connect(g).connect(v.out);
  v.hold(at + o.dur + 0.05);
}

/** Many small metallic link ticks. */
export function links(v: Voice, n: number, spread: number, at = v.t, peak = 0.08): void {
  for (let i = 0; i < n; i++) {
    const t = at + Math.pow(Math.random(), 0.8) * spread;
    const f = rand(1500, 4200);
    v.tone({ freq: f, peak: peak * rand(0.4, 1), d: rand(0.03, 0.09), at: t });
    v.tone({ freq: f * 1.53, peak: peak * 0.4 * rand(0.4, 1), d: 0.04, at: t });
  }
}

export const doorOpen: Synth = (v, p) => {
  metal(v, { f: 1500 * p.rate, peak: 0.1, decay: 0.12, ratios: [1, 2.3] }); // latch
  creak(v, { dur: 1.1, rate0: 30, rate1: 55, res: [520, 1250, 2300].map((f) => f * p.rate), peak: 0.35, at: v.t + 0.08 });
  thump(v, 110, 0.2, 0.15, v.t + 1.15);
};

export const gateOpen: Synth = (v, p) => {
  creak(v, { dur: 1.6, rate0: 45, rate1: 80, res: [1150, 2600, 3900].map((f) => f * p.rate), peak: 0.3, q: 14 });
  links(v, 14, 1.4, v.t + 0.1, 0.06);
  v.burst({ color: 'brown', type: 'lowpass', freq: 200, a: 0.3, peak: 0.25, d: 1.5 });
  metal(v, { f: 480 * p.rate, peak: 0.25, decay: 0.8, at: v.t + 1.6, bright: 0.7 });
  thump(v, 80, 0.5, 0.25, v.t + 1.6);
};

export const hatchOpen: Synth = (v, p) => {
  creak(v, { dur: 0.55, rate0: 26, rate1: 40, res: [430, 980].map((f) => f * p.rate), peak: 0.35 });
  thump(v, 95, 0.5, 0.2, v.t + 0.6);
  v.burst({ type: 'bandpass', freq: 380, q: 3, at: v.t + 0.6, peak: 0.4, d: 0.1 });
  grains(v, { n: 5, spread: 0.4, freq: 3500, peak: 0.05, at: v.t + 0.62 }); // dust
};

export const leverPull: Synth = (v, p) => {
  let t = v.t;
  for (let i = 0; i < 6; i++) {
    metal(v, { f: 2100 * p.rate * vary(1, 0.03), peak: 0.1, decay: 0.05, ratios: [1, 2.7], at: t });
    t += 0.09 - i * 0.008;
  }
  thump(v, 100, 0.55, 0.2, t + 0.05);
  metal(v, { f: 420 * p.rate, peak: 0.2, decay: 0.5, at: t + 0.05 });
};

export const chainRattle: Synth = (v, p) => {
  links(v, 28, 1.2, v.t, 0.09 * p.rate);
  for (let i = 0; i < 4; i++) metal(v, { f: 640 * vary(1, 0.1), peak: 0.1, decay: 0.2, at: v.t + i * 0.3 + rand(0, 0.1) });
};

/** The drawbridge lands: an enormous wooden boom, dust, settling chains. */
export const drawbridgeSlam: Synth = (v, p) => {
  const t = v.t;
  thump(v, 46 * p.rate, 1, 1.3);
  v.burst({ color: 'brown', type: 'lowpass', freq: 320, peak: 0.9, d: 1.6 });
  for (const [f, a, d] of [[92, 0.4, 0.6], [215, 0.3, 0.4], [440, 0.18, 0.25]] as const) v.tone({ freq: f * p.rate, peak: a, d });
  v.burst({ type: 'bandpass', freq: 500, q: 2, peak: 0.6, d: 0.2 });
  grains(v, { n: 10, spread: 1.2, freq: 3000, peak: 0.06, at: t + 0.1 });
  links(v, 16, 1, t + 0.15, 0.05);
};

export const chestOpen: Synth = (v, p) => {
  metal(v, { f: 1700 * p.rate, peak: 0.1, decay: 0.12, ratios: [1, 2.4] });
  creak(v, { dur: 0.6, rate0: 35, rate1: 50, res: [700, 1600].map((f) => f * p.rate), peak: 0.25, at: v.t + 0.1 });
  v.burst({ type: 'bandpass', freq: 420, q: 3, at: v.t + 0.72, peak: 0.3, d: 0.08 });
};

/** Passing through a fog wall: an airy swell and a bell-light hum. */
export const fogEnter: Synth = (v, p) => {
  const t = v.t;
  const src = v.noise('pink', t, t + 1.8);
  const bp = v.filter('bandpass', 350, 1);
  bp.frequency.setValueAtTime(350, t);
  bp.frequency.exponentialRampToValueAtTime(1400, t + 0.6);
  bp.frequency.exponentialRampToValueAtTime(500, t + 1.5);
  const g = v.gain(0);
  v.hold(swell(g.gain, t, 0.5, 0.45, 0.2, 1.0));
  src.connect(bp).connect(g).connect(v.out);
  for (const f of [146.8, 220, 440]) {
    const hg = v.gain(0);
    v.hold(swell(hg.gain, t, 0.5, 0.05, 0.3, 1.4));
    v.osc('sine', f * p.rate, t).connect(hg).connect(v.out);
  }
};

/** The Commander's anchor (bell-standard) shatters: bronze splinters, a deep knell, a rush. */
export const anchorShatter: Synth = (v, p) => {
  const t = v.t;
  v.burst({ type: 'highpass', freq: 1500, peak: 0.8, d: 0.7 });
  thump(v, 60, 1, 0.8);
  for (let i = 0; i < 26; i++) {
    const at = t + Math.pow(Math.random(), 1.6) * 0.9;
    glassPing(v, rand(1800, 7000), rand(0.02, 0.07), rand(0.15, 0.6), at);
  }
  bell(v, { prime: 110 * p.rate, decay: 7, gain: 0.35, beat: 0.8, strike: 0.2, detune: 0.015, drift: 30, at: t + 0.02 });
  whoosh(v, { dur: 1.8, f0: 200, f1: 3000, peak: 0.3, at: t + 0.3, panFrom: -0.5, panTo: 0.5 });
};

/** The ground gives way: a long rolling rumble with cracking debris. */
export const collapseRumble: Synth = (v, p) => {
  const t = v.t;
  const src = v.noise('brown', t, t + 5.5);
  const lp = v.filter('lowpass', 150 * p.rate, 1);
  const g = v.gain(0);
  v.hold(swell(g.gain, t, 0.5, 0.8, 2.5, 2.2));
  const am = v.gain(0.7);
  v.lfo(rand(3, 5), 0.3, am.gain);
  src.connect(lp).connect(am).connect(g).connect(v.out);
  thump(v, 50, 0.9, 0.9);
  for (let i = 0; i < 8; i++) {
    const at = t + rand(0.1, 3.5);
    v.burst({ type: 'highpass', freq: 1200, at, peak: rand(0.1, 0.35), d: 0.05 });
    thump(v, rand(60, 110), rand(0.2, 0.5), 0.2, at);
  }
  grains(v, { n: 20, spread: 4, freq: 2500, peak: 0.08 });
};

/** A memory surfaces: a reversed swell snapping off, then a far bell. */
export const memoryTrigger: Synth = (v, p) => {
  const t = v.t;
  const rise = 1.3;
  v.burst({ color: 'pink', type: 'bandpass', freq: 600, q: 0.9, a: rise, peak: 0.28, d: 0.06, sweepTo: 3000, sweepDur: rise });
  for (const f of [587.3, 880, 1318.5]) {
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + rise);
    g.gain.setTargetAtTime(0, t + rise, 0.02);
    v.osc('sine', f * p.rate, t, t + rise + 0.2).connect(g).connect(v.out);
  }
  bell(v, { prime: 587.3 * p.rate, decay: 5, gain: 0.16, beat: 1.1, strike: 0.2, partials: SMALL_PARTIALS, at: t + rise + 0.05 });
  v.hold(t + rise + 5.5);
};

/** Journal updated: a page turned, a quill scratch, a tiny bell. */
export const journalUpdate: Synth = (v, p) => {
  const t = v.t;
  v.burst({ color: 'pink', type: 'bandpass', freq: 2500, q: 0.8, a: 0.05, peak: 0.18, d: 0.18, sweepTo: 4500, sweepDur: 0.15 });
  grains(v, { n: 5, spread: 0.2, freq: 5000, q: 3, peak: 0.05, at: t + 0.22 });
  tinyBell(v, 1174.7 * p.rate, 0.05, t + 0.35, 2);
};

/** Touching masonry: gritty brush and a knock that sounds hollow behind. */
export const masonryTouch: Synth = (v, p) => {
  grains(v, { n: 8, spread: 0.3, freq: 2200, q: 0.8, peak: 0.1, d: 0.04 });
  const t = v.t + 0.3;
  v.burst({ type: 'bandpass', freq: 280 * p.rate, q: 7, at: t, peak: 0.55, d: 0.3 });
  thump(v, 120, 0.3, 0.12, t);
};

/** Hammer on anvil. */
export const forgeHammer: Synth = (v, p) => {
  metal(v, { f: 1480 * p.rate * vary(1, 0.02), peak: 0.3, decay: 1.2, ratios: [1, 2.13, 2.94, 4.21, 5.47], bright: 0.6, beat: 2 });
  v.burst({ type: 'highpass', freq: 3000, peak: 0.45, d: 0.02 });
  thump(v, 140, 0.4, 0.1);
};

/** Pick up an item: rustle + tiny bright ding. */
export const pickup: Synth = (v, p) => {
  v.burst({ color: 'pink', type: 'bandpass', freq: 2600, q: 0.9, a: 0.02, peak: 0.12, d: 0.1 });
  tinyBell(v, 1568 * p.rate, 0.06, v.t + 0.05, 1.3);
};

/** Hours gained (currency): soft clockwork ticks and a gentle chime cascade. */
export const hoursGain: Synth = (v, p) => {
  const t = v.t;
  for (let i = 0; i < 3; i++) {
    v.burst({ type: 'bandpass', freq: 3200, q: 4, at: t + i * 0.07, peak: 0.12, d: 0.015 });
  }
  [1318.5, 1760, 2349].forEach((f, i) => glassPing(v, f * p.rate, 0.05, 1.2, t + 0.2 + i * 0.06));
};
