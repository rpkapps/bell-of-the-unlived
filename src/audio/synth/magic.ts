/** Magic & techniques: glass shards, cinders, fire, healing, wards. */
import { perc, pick, rand, swell, vary, type Voice } from '../engine/Voice';
import { bell } from './bells';
import { metal, thump, whoosh } from './impacts';
import type { Synth } from './types';

/** Glass (wine-glass / crystal) mode ratios. */
export const GLASS = [1, 2.32, 4.25, 6.63] as const;

/** One crystalline ping. */
export function glassPing(v: Voice, f: number, peak: number, decay: number, at = v.t, dest?: AudioNode): void {
  metal(v, { f, peak, decay, at, dest, ratios: GLASS, bright: 0.45, beat: 2.5 });
}

/** Bellbronze shard: a crystalline arpeggio riding a rising whoosh. */
export const castShard: Synth = (v, p) => {
  const scale = [1175, 1397, 1568, 1760, 2093];
  const n = 4;
  const start = Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    glassPing(v, scale[(start + i) % scale.length]! * p.rate * vary(1, 0.004), 0.14 - i * 0.015, 0.9, v.t + i * 0.035);
  }
  whoosh(v, { dur: 0.35, f0: 900, f1: 5200, peak: 0.3, q: 1.6, panFrom: -0.2, panTo: 0.3 });
  v.burst({ type: 'highpass', freq: 7000, a: 0.03, peak: 0.05, d: 0.6 });
};

/** Cinder: fire roaring alight. */
export const castCinder: Synth = (v, p) => {
  const t = v.t;
  const src = v.noise('pink', t, t + 1);
  const lp = v.filter('lowpass', 200, 1.2);
  lp.frequency.setValueAtTime(200 * p.rate, t);
  lp.frequency.exponentialRampToValueAtTime(2600 * p.rate, t + 0.12);
  lp.frequency.exponentialRampToValueAtTime(700, t + 0.7);
  const g = v.gain(0);
  v.hold(perc(g.gain, t, 0.035, 0.7, 0.75));
  src.connect(lp).connect(g).connect(v.out);
  thump(v, 62, 0.45, 0.3);
  v.burst({ color: 'crackle', type: 'highpass', freq: 900, at: t + 0.05, a: 0.05, peak: 0.55, d: 0.8 });
};

/** Fire burst: an explosion with a crackling tail. */
export const fireBurst: Synth = (v, p) => {
  const t = v.t;
  thump(v, 62 * p.rate, 1, 1.0);
  v.burst({ color: 'brown', type: 'lowpass', freq: 520, peak: 0.9, d: 1.3 });
  v.burst({ color: 'white', type: 'bandpass', freq: 1500, q: 0.6, peak: 0.55, d: 0.3 });
  v.burst({ color: 'pink', type: 'lowpass', freq: 1800, at: t + 0.05, a: 0.1, peak: 0.35, d: 1.6, sweepTo: 500 });
  v.burst({ color: 'crackle', type: 'bandpass', freq: 2400, q: 0.5, at: t + 0.15, a: 0.3, peak: 0.6, d: 2.2 });
};

/** Healing: a soft rising major chord with a shimmer. */
export const spellHeal: Synth = (v, p) => {
  const notes = [293.7, 370, 440, 587.3, 659.3];
  notes.forEach((f, i) => {
    const g = v.gain(0);
    const at = v.t + i * 0.11;
    v.hold(swell(g.gain, at, 0.28, 0.055, 0.5, 2.2));
    const o = v.osc(i % 2 ? 'sine' : 'triangle', f * p.rate, at);
    o.detune.value = rand(-3, 3);
    o.connect(g).connect(v.out);
  });
  v.burst({ color: 'pink', type: 'bandpass', freq: 2000, q: 2, a: 0.6, peak: 0.05, d: 1.6, sweepTo: 6000, sweepDur: 1.4 });
};

/** Ward raised: a glassy hum swelling around the body. */
export const wardUp: Synth = (v, p) => {
  const t = v.t;
  for (const [f, a] of [[440, 0.06], [660.5, 0.045], [881, 0.035], [1320, 0.02]] as const) {
    const g = v.gain(0);
    v.hold(swell(g.gain, t, 0.3, a, 0.45, 1.3));
    v.osc('sine', f * p.rate, t).connect(g).connect(v.out);
    v.osc('sine', f * p.rate + rand(1, 2.5), t).connect(g);
  }
  const src = v.noise('pink', t);
  const bp = v.filter('bandpass', 2200, 14);
  const g = v.gain(0);
  v.hold(swell(g.gain, t, 0.25, 0.22, 0.4, 1));
  src.connect(bp).connect(g).connect(v.out);
  glassPing(v, 1760 * p.rate, 0.07, 1.2, t + 0.05);
};

/** Imprint technique: a bright "shing", a rising sweep and a low bell accent. */
export const technique: Synth = (v, p) => {
  metal(v, { f: 1600 * p.rate * vary(1, 0.02), peak: 0.2, decay: 0.6, bright: 0.65, beat: 3 });
  whoosh(v, { dur: 0.4, f0: 300, f1: 2600, peak: 0.35, q: 1.3 });
  bell(v, { prime: pick([220, 247]) * p.rate, decay: 2, gain: 0.18, beat: 1, strike: 0.2, maxRatio: 3, at: v.t + 0.05 });
};
