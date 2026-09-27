/**
 * Phase 2 one-shot cues that are not (yet) in the contract's CueId list. They are played through
 * `Audio.playExtra(id, opts)` with the same routing, 3D, captions and voice stealing as `play()`.
 */
import { rand, swell, vary } from '../engine/Voice';
import { grains, metal, thump } from './impacts';
import { glassPing } from './magic';
import { formantVoice } from './voices';
import type { Synth } from './types';

/** Siege cannon: a hard crack, a chest-deep boom, rolling rumble and a late valley echo. */
export const cannonFire: Synth = (v, p) => {
  const t = v.t;
  const r = p.rate;
  v.burst({ type: 'highpass', freq: 1800, peak: 0.7, d: 0.07 });
  v.burst({ type: 'bandpass', freq: 900 * r, q: 0.8, peak: 0.5, d: 0.18 });
  thump(v, 62 * r, 1, 0.9);
  v.burst({ color: 'brown', type: 'lowpass', freq: 500, a: 0.004, peak: 0.9, d: 1.4 });
  // Rolling rumble.
  const src = v.noise('brown', t + 0.05);
  const lp = v.filter('lowpass', 260, 0.7);
  const g = v.gain(0);
  v.hold(swell(g.gain, t + 0.05, 0.15, 0.45, 0.3, 3.2));
  v.lfo(0.9, 90, lp.frequency, 'sine', t);
  src.connect(lp).connect(g).connect(v.out);
  // Echo off the far wall of the valley.
  const e = t + rand(0.55, 0.8);
  const elp = v.filter('lowpass', 450, 0.6);
  elp.connect(v.out);
  thump(v, 55 * r, 0.25, 0.8, e, elp);
  v.burst({ color: 'brown', type: 'lowpass', freq: 400, at: e, a: 0.03, peak: 0.22, d: 1.2, dest: elp });
};

/** Glass shattering: a crack, a spray of crystalline shards, tinkling fragments settling. */
export const glassShatter: Synth = (v, p) => {
  const t = v.t;
  const r = p.rate;
  v.burst({ type: 'highpass', freq: 3000, peak: 0.6, d: 0.05 });
  v.burst({ type: 'bandpass', freq: 5200, q: 1.2, peak: 0.35, d: 0.25, sweepTo: 3000 });
  thump(v, 180 * r, 0.25, 0.12);
  for (let i = 0; i < 9; i++) glassPing(v, rand(1800, 6200) * r, rand(0.03, 0.08), rand(0.3, 0.9), t + Math.pow(Math.random(), 1.6) * 0.35);
  // Fragments landing and skittering.
  grains(v, { n: 16, spread: 0.9, freq: 6500, q: 3, peak: 0.08, d: 0.015, at: t + 0.15 });
  for (let i = 0; i < 5; i++) glassPing(v, rand(3500, 7000) * r, rand(0.01, 0.025), 0.25, t + 0.4 + Math.random() * 0.8);
};

/** Ritual choir swelling (interruptible chant): voices gathering into a dissonant chord. */
export const choirSwell: Synth = (v, p) => {
  const t = v.t;
  const r = p.rate;
  const chord = [146.8, 174.6, 207.7, 293.7]; // D F Ab D: diminished, unresolved
  chord.forEach((f, i) => {
    formantVoice(v, {
      f0: f * r, dur: 2.6, from: i % 2 ? 'o' : 'u', to: 'a', peak: 0.1, voices: 3, spread: 16, breath: 0.3,
      a: 1.6 + i * 0.12, at: t + i * 0.1, vibrato: 10, size: i === 3 ? 1.05 : 0.95,
    });
  });
  v.burst({ color: 'pink', type: 'bandpass', freq: 2400, q: 1.5, at: t + 0.4, a: 1.8, peak: 0.05, d: 1.2 });
  v.hold(t + 3);
};

/** Clockwork winding: a ratchet accelerating, a spring whirr, a heavy escapement clunk. */
export const clockwork: Synth = (v, p) => {
  const t = v.t;
  const r = p.rate;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const at = t + (1 - Math.pow(1 - k, 1.8)) * 0.7;
    metal(v, { f: 2600 * r * vary(1, 0.03), peak: 0.07, decay: 0.05, ratios: [1, 2.7], at });
    v.burst({ type: 'bandpass', freq: 3800 * r, q: 5, at, peak: 0.12, d: 0.012 });
  }
  // Spring whirr.
  const w = v.osc('sawtooth', 70 * r, t + 0.65, t + 1.3);
  w.frequency.setValueAtTime(70 * r, t + 0.65);
  w.frequency.exponentialRampToValueAtTime(40 * r, t + 1.25);
  const bp = v.filter('bandpass', 1700, 6);
  const g = v.gain(0);
  swell(g.gain, t + 0.65, 0.05, 0.08, 0.35, 0.2);
  w.connect(bp).connect(g).connect(v.out);
  // Escapement clunk.
  thump(v, 110 * r, 0.4, 0.2, t + 1.3);
  metal(v, { f: 520 * r, peak: 0.16, decay: 0.5, at: t + 1.3, bright: 0.6 });
};

/** War / hunting hound: two gruff barks from a big chest. */
export const houndBark: Synth = (v, p) => {
  const t = v.t;
  const r = p.rate * vary(1, 0.05);
  for (const [k, dt] of [[1, 0], [0.85, rand(0.22, 0.3)]] as const) {
    formantVoice(v, { f0: 290 * r * k, f0End: 190 * r * k, dur: 0.16, from: 'a', to: 'uh', peak: 0.45, breath: 0.5, grit: 2.2, voices: 2, spread: 25, a: 0.008, at: t + dt, size: 1.25 });
    v.burst({ color: 'pink', type: 'bandpass', freq: 1200, q: 1, at: t + dt, peak: 0.18, d: 0.08 });
    thump(v, 120 * r, 0.2, 0.08, t + dt);
  }
};

