/**
 * Voices — formant-synthesised vocalisations (enemies, the Commander, the Returned) and body
 * sounds (heartbeat, breath). A voice is a sawtooth "glottis" (+ breath noise) through three
 * parallel bandpass formant filters whose centre frequencies glide between vowels.
 */
import { perc, rand, sweep, vary, type Voice } from '../engine/Voice';
import { metal, thump, whoosh } from './impacts';
import { bell, SMALL_PARTIALS } from './bells';
import type { Synth } from './types';

/** Formant table (adult male): F1, F2, F3 in Hz. */
export const VOWELS = {
  a: [760, 1150, 2600],
  e: [420, 1750, 2550],
  i: [300, 2150, 2900],
  o: [470, 820, 2600],
  u: [330, 700, 2450],
  uh: [600, 1050, 2450],
} as const;
export type Vowel = keyof typeof VOWELS;

const FORMANT_GAIN = [1, 0.55, 0.28] as const;
const FORMANT_Q = [7, 11, 14] as const;

export interface FormantOpts {
  f0: number;
  f0End?: number;
  dur: number;
  from: Vowel;
  to?: Vowel;
  peak: number;
  /** Breath noise amount (0..1). */
  breath?: number;
  /** Distortion drive (0 = clean). */
  grit?: number;
  /** Number of detuned glottal sources (crowd/monster thickness). */
  voices?: number;
  /** Detune spread in cents between sources. */
  spread?: number;
  /** Formant shift multiplier (<1 = bigger body). */
  size?: number;
  a?: number;
  at?: number;
  dest?: AudioNode;
  vibrato?: number;
}

/** Build a vocal gesture. Returns end time. */
export function formantVoice(v: Voice, o: FormantOpts): number {
  const at = o.at ?? v.t;
  const a = o.a ?? 0.04;
  const end = at + o.dur;
  const size = o.size ?? 1;
  const mix = v.gain(1);
  const n = o.voices ?? 1;
  for (let i = 0; i < n; i++) {
    const src = v.osc('sawtooth', o.f0, at, end + 0.05);
    src.detune.value = n > 1 ? ((i / (n - 1)) * 2 - 1) * (o.spread ?? 12) : rand(-5, 5);
    if (o.f0End !== undefined) {
      src.frequency.setValueAtTime(o.f0, at);
      src.frequency.exponentialRampToValueAtTime(o.f0End, end);
    }
    if (o.vibrato) v.lfo(rand(4.5, 6), o.vibrato, src.detune, 'sine', at);
    const sg = v.gain(1 / Math.sqrt(n));
    src.connect(sg).connect(mix);
  }
  if (o.breath) {
    const b = v.noise('pink', at, end + 0.05);
    const bg = v.gain(o.breath * 2.5);
    b.connect(bg).connect(mix);
  }
  const env = v.gain(0);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(o.peak, at + a);
  env.gain.setValueAtTime(o.peak, at + Math.max(a, o.dur * 0.55));
  env.gain.linearRampToValueAtTime(0, end);
  const from = VOWELS[o.from];
  const to = VOWELS[o.to ?? o.from];
  for (let k = 0; k < 3; k++) {
    const f = v.filter('bandpass', from[k]! * size, FORMANT_Q[k]!);
    if (o.to) sweep(f.frequency, at, from[k]! * size, to[k]! * size, o.dur);
    const g = v.gain(FORMANT_GAIN[k]! * 4);
    mix.connect(f).connect(g).connect(env);
  }
  if (o.grit) {
    const sh = v.shaper(o.grit);
    const post = v.gain(0.7);
    env.connect(sh).connect(post).connect(o.dest ?? v.out);
  } else {
    env.connect(o.dest ?? v.out);
  }
  v.hold(end + 0.05);
  return end;
}

// ---------------------------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------------------------

/** Enemy alerted: a hollow indrawn gasp and a blade drawn. */
export const enemyAlert: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  formantVoice(v, { f0: 105 * r, f0End: 150 * r, dur: 0.45, from: 'uh', to: 'a', peak: 0.3, breath: 0.6, a: 0.06 });
  // Blade scraping from a scabbard.
  const t = v.t + 0.15;
  v.burst({ type: 'bandpass', freq: 2500, q: 8, at: t, a: 0.05, peak: 0.25, d: 0.3, sweepTo: 5200, sweepDur: 0.3 });
  metal(v, { f: 1900 * r, peak: 0.06, decay: 0.4, at: t + 0.3, bright: 0.5 });
};

/**
 * Enemy windup — THE readable tell. A rising reverse-swell whoosh, a strained grunt and a rising
 * whistle, all peaking together: unmistakable against everything else.
 */
export const enemyWindup: Synth = (v, p) => {
  const t = v.t;
  const dur = 0.42;
  const r = p.rate * vary(1, 0.03);
  const src = v.noise('pink', t, t + dur + 0.1);
  const bp = v.filter('bandpass', 250, 2.2);
  sweep(bp.frequency, t, 250 * r, 2700 * r, dur);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.1, t + dur * 0.5);
  g.gain.linearRampToValueAtTime(0.5, t + dur);
  g.gain.setTargetAtTime(0, t + dur, 0.03);
  src.connect(bp).connect(g).connect(v.out);
  // Rising whistle: the signature element.
  const w = v.osc('sine', 520 * r, t, t + dur + 0.15);
  sweep(w.frequency, t, 520 * r, 1500 * r, dur);
  const wg = v.gain(0);
  wg.gain.setValueAtTime(0, t);
  wg.gain.linearRampToValueAtTime(0.09, t + dur);
  wg.gain.setTargetAtTime(0, t + dur, 0.03);
  w.connect(wg).connect(v.out);
  formantVoice(v, { f0: 92 * r, f0End: 120 * r, dur: dur + 0.05, from: 'uh', to: 'a', peak: 0.2, breath: 0.35, a: 0.15, at: t + 0.05 });
  v.hold(t + dur + 0.25);
};

/** Unstoppable attack: a jagged, dissonant ring over a distorted growl. */
export const unparryableTell: Synth = (v, p) => {
  const r = p.rate;
  // Tritone pair with fast sour beating = "jagged".
  metal(v, { f: 880 * r, peak: 0.28, decay: 0.9, ratios: [1, 2.02, 3.1], bright: 0.6, beat: 9 });
  metal(v, { f: 1244 * r, peak: 0.24, decay: 0.8, ratios: [1, 2.02, 3.1], bright: 0.6, beat: 11, at: v.t + 0.03 });
  formantVoice(v, { f0: 68 * r, f0End: 82 * r, dur: 0.55, from: 'o', to: 'a', peak: 0.3, grit: 4, voices: 2, spread: 20, a: 0.05, size: 0.85 });
  v.burst({ type: 'highpass', freq: 3000, peak: 0.35, d: 0.04 });
};

export const enemyGrunt: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.1);
  formantVoice(v, { f0: 115 * r, f0End: 92 * r, dur: 0.2 * vary(1, 0.2), from: 'uh', to: 'o', peak: 0.35, breath: 0.3, a: 0.015 });
};

export const enemyPain: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.08);
  formantVoice(v, { f0: 175 * r, f0End: 125 * r, dur: 0.32, from: 'a', to: 'e', peak: 0.38, breath: 0.35, grit: 1.5, a: 0.01 });
};

/** The Commander bellows: huge, distorted, many-throated. */
export const bossRoar: Synth = (v, p) => {
  const r = p.rate;
  formantVoice(v, {
    f0: 72 * r, f0End: 58 * r, dur: 2.0, from: 'a', to: 'o', peak: 0.42, breath: 0.5, grit: 3.5,
    voices: 3, spread: 18, size: 0.82, a: 0.18, vibrato: 12,
  });
  const t = v.t;
  const sub = v.osc('sine', 36 * r, t);
  const sg = v.gain(0);
  sg.gain.setValueAtTime(0, t);
  sg.gain.linearRampToValueAtTime(0.35, t + 0.25);
  sg.gain.setTargetAtTime(0, t + 1.6, 0.15);
  sub.connect(sg).connect(v.out);
  // Rushing air.
  v.burst({ color: 'pink', type: 'lowpass', freq: 1200, a: 0.3, peak: 0.3, d: 1.9, sweepTo: 500 });
  v.hold(t + 2.4);
};

// ---------------------------------------------------------------------------------------------
// The Returned (player)
// ---------------------------------------------------------------------------------------------

export const playerHurt: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  thump(v, 110, 0.55, 0.15);
  v.burst({ color: 'pink', type: 'bandpass', freq: 1100, q: 1.5, peak: 0.3, d: 0.1, sweepTo: 400 });
  formantVoice(v, { f0: 128 * r, f0End: 108 * r, dur: 0.22, from: 'uh', to: 'e', peak: 0.3, breath: 0.4, a: 0.012, at: v.t + 0.01 });
};

/** Death of the Returned: blow, falling groan, a far knell and darkness closing in. */
export const playerDeath: Synth = (v, p) => {
  const r = p.rate;
  thump(v, 80, 0.9, 0.5);
  formantVoice(v, { f0: 118 * r, f0End: 64 * r, dur: 1.3, from: 'a', to: 'u', peak: 0.3, breath: 0.55, a: 0.02, at: v.t + 0.05 });
  bell(v, { prime: 98, decay: 7, gain: 0.3, beat: 0.6, strike: 0.15, brightness: 0.6, detune: 0.01, drift: 20, at: v.t + 0.9 });
  // Darkness: a swelling low wash.
  v.burst({ color: 'brown', type: 'lowpass', freq: 220, at: v.t + 0.4, a: 1.2, peak: 0.45, d: 4 });
};

/** Last Breath: an inhale, a heartbeat, a bright bell breath of life. */
export const lastBreathRecover: Synth = (v, p) => {
  const t = v.t;
  v.burst({ color: 'pink', type: 'bandpass', freq: 600, q: 1.4, a: 0.45, peak: 0.3, d: 0.3, sweepTo: 2200, sweepDur: 0.5 });
  thump(v, 58, 0.7, 0.2, t + 0.55);
  thump(v, 52, 0.5, 0.2, t + 0.72);
  bell(v, { prime: 1174 * p.rate, decay: 2.5, gain: 0.16, beat: 1.5, strike: 0.2, partials: SMALL_PARTIALS, at: t + 0.55 });
};

/** Low health: a lub-dub heartbeat (the game repeats it while low). */
export const lowHealth: Synth = (v) => {
  thump(v, 58, 0.6, 0.2);
  thump(v, 50, 0.42, 0.22, v.t + 0.17);
};

/** Drinking the Recall Flask: glass clink, swallows, a restorative shimmer. */
export const drinkFlask: Synth = (v, p) => {
  const t = v.t;
  metal(v, { f: 2350 * p.rate, peak: 0.08, decay: 0.3, ratios: [1, 2.32, 4.25], bright: 0.5 });
  for (let i = 0; i < 3; i++) {
    const tg = t + 0.25 + i * rand(0.28, 0.34);
    const f = rand(170, 210);
    v.tone({ freq: f, bendTo: f * 1.7, bendDur: 0.08, peak: 0.22, d: 0.11, at: tg, a: 0.01 });
    v.burst({ color: 'pink', type: 'lowpass', freq: 600, at: tg, a: 0.02, peak: 0.15, d: 0.1 });
  }
  // Restorative shimmer: rising, like the stillbell halo but smaller.
  [587, 740, 880, 1175].forEach((f, i) => {
    v.tone({ freq: f * p.rate, a: 0.25, peak: 0.03, d: 1.6, at: t + 1.05 + i * 0.08 });
  });
};

/** Death of an Unlived: a falling groan, armour collapsing, a whisper dissipating. */
export const enemyDeath: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  formantVoice(v, { f0: 125 * r, f0End: 68 * r, dur: 1.1, from: 'o', to: 'u', peak: 0.3, breath: 0.5, a: 0.03 });
  const t = v.t + 0.55;
  thump(v, 90, 0.6, 0.25, t);
  metal(v, { f: 780 * vary(1, 0.1), peak: 0.12, decay: 0.35, at: t });
  for (let i = 0; i < 6; i++) {
    v.tone({ freq: rand(2400, 5000), peak: rand(0.02, 0.05), d: 0.05, at: t + Math.random() * 0.25 });
  }
  // The Unlived dissipates: a high whisper thinning away.
  v.burst({ color: 'pink', type: 'bandpass', freq: 3000, q: 2, at: v.t + 0.3, a: 0.4, peak: 0.08, d: 1.6, sweepTo: 7000, sweepDur: 1.6 });
  whoosh(v, { dur: 0.9, f0: 400, f1: 1600, peak: 0.08, at: v.t + 0.5, panFrom: 0, panTo: 0 });
};
