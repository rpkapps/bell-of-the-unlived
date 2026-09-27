/**
 * Bells — additive synthesis of inharmonic bell partials.
 *
 * A real (minor-third) church bell has partials at roughly hum 0.5, prime 1, tierce 1.19 (the minor
 * third that gives bells their mournful colour), quint 1.5, nominal 2, then 2.5, 2.66, 3, 4, 5.33…
 * Each partial gets its own exponential decay (low partials ring longest), low partials are
 * doubled with a slightly detuned twin (the "beating" of an imperfectly round casting), and a
 * short filtered-noise strike transient marks the clapper hit.
 */
import { perc, rand, semi, swell, vary, type Voice } from '../engine/Voice';
import type { Synth } from './types';

/** [ratio to prime, amplitude, decay scale]. */
export type BellPartial = readonly [number, number, number];

export const CHURCH_PARTIALS: readonly BellPartial[] = [
  [0.5, 0.5, 1.0], // hum
  [1.0, 0.45, 0.78], // prime
  [1.19, 0.38, 0.62], // tierce (minor third)
  [1.5, 0.2, 0.48], // quint
  [2.0, 0.42, 0.52], // nominal
  [2.5, 0.16, 0.3],
  [2.66, 0.18, 0.28],
  [3.0, 0.11, 0.22],
  [4.0, 0.08, 0.16],
  [5.33, 0.045, 0.11],
  [6.1, 0.025, 0.08],
];

export interface BellSpec {
  /** Frequency of the prime partial (Hz). The nominal sits an octave above. */
  prime: number;
  /** Decay (s) of a partial with decay scale 1 (the hum). */
  decay: number;
  /** Overall peak gain. */
  gain: number;
  partials?: readonly BellPartial[];
  /** Doublet beating in Hz for partials below ratio 3 (0 disables). */
  beat?: number;
  /** Strike transient amount relative to gain (0..1). */
  strike?: number;
  /** Strike centre frequency multiplier of prime (mallet hardness). */
  strikeHardness?: number;
  /** Scale for partials above the nominal (0..1+). */
  brightness?: number;
  /** Random per-partial ratio deviation (0.01 = ±1 %): larger = stranger, "unfinished" bell. */
  detune?: number;
  /** Downward pitch drift in cents across the decay (unsettling Great Bells). */
  drift?: number;
  /** Start time (default voice start). */
  at?: number;
  /** Destination (default voice out). */
  dest?: AudioNode;
  /** Skip partials above this ratio (cheap small bells). */
  maxRatio?: number;
}

/** Build one bell strike. Returns the end time. */
export function bell(v: Voice, s: BellSpec): number {
  const at = s.at ?? v.t;
  const dest = s.dest ?? v.out;
  const partials = s.partials ?? CHURCH_PARTIALS;
  const bright = s.brightness ?? 1;
  const beat = s.beat ?? 0;
  const det = s.detune ?? 0.002;
  const nyq = v.ctx.sampleRate * 0.45;
  let end = at;

  // Shared detune bus: one ConstantSource drives every oscillator's detune for pitch drift.
  let driftSrc: ConstantSourceNode | null = null;
  if (s.drift) {
    driftSrc = v.constant(0, at);
    driftSrc.offset.setValueAtTime(0, at + 0.3);
    driftSrc.offset.linearRampToValueAtTime(-Math.abs(s.drift), at + s.decay);
  }

  for (const [ratio, amp, dScale] of partials) {
    if (s.maxRatio !== undefined && ratio > s.maxRatio) continue;
    const f = s.prime * ratio * vary(1, det);
    if (f > nyq) continue;
    const a = ratio < 1 ? 0.012 : ratio < 2.1 ? 0.004 : 0.0015;
    const peak = s.gain * amp * (ratio > 2.05 ? bright : 1);
    const d = s.decay * dScale * vary(1, 0.08);
    const g = v.gain(0);
    const pEnd = perc(g.gain, at, a, peak, d);
    g.connect(dest);
    const o = v.osc('sine', f, at, pEnd);
    o.connect(g);
    if (driftSrc) driftSrc.connect(o.detune);
    if (beat > 0 && ratio < 3) {
      // Detuned twin: amplitude-matched so the beating is deep and slow.
      const twin = v.osc('sine', f + beat * rand(0.6, 1.4) * Math.sqrt(ratio), at, pEnd);
      const tg = v.gain(0.55);
      twin.connect(tg).connect(g);
      if (driftSrc) driftSrc.connect(twin.detune);
    }
    if (pEnd > end) end = pEnd;
  }

  // Strike: clapper/mallet transient.
  const strike = s.strike ?? 0.3;
  if (strike > 0) {
    v.burst({
      type: 'bandpass', freq: Math.min(nyq, s.prime * (s.strikeHardness ?? 4)), q: 1.2,
      at, peak: s.gain * strike, d: 0.04, dest,
    });
  }
  v.hold(end);
  return end;
}

// ---------------------------------------------------------------------------------------------
// Cue synths
// ---------------------------------------------------------------------------------------------

/** Stillbell prime: D5 → nominal ≈ 1175 Hz. Small, warm, funerary. */
const STILL_PRIME = 587.3;

/** A Stillbell rings (lit, touched): intimate, warm, long soft tail. */
export const stillbellRing: Synth = (v, p) => {
  const prime = STILL_PRIME * p.rate * vary(1, 0.006);
  bell(v, { prime, decay: 7.5, gain: 0.34, beat: 0.9, strike: 0.18, strikeHardness: 2.5, brightness: 0.6 });
  // A second, softer strike — the bell swinging back — gives it an intimate, human touch.
  bell(v, { prime, decay: 5, gain: 0.12, beat: 0.9, strike: 0.08, strikeHardness: 2.5, brightness: 0.4, at: v.t + rand(0.9, 1.15), maxRatio: 3 });
};

/** Resting at a Stillbell: the bell plus a restorative warm halo chord that blooms and settles. */
export const stillbellRest: Synth = (v, p) => {
  const prime = STILL_PRIME * p.rate;
  bell(v, { prime, decay: 8, gain: 0.3, beat: 0.7, strike: 0.15, strikeHardness: 2.5, brightness: 0.5 });
  // Halo: D major added-ninth, soft sines + triangles, blooming then fading.
  const t = v.t + 0.15;
  const halo = [146.8, 220, 293.7, 370, 440, 659.3];
  halo.forEach((f, i) => {
    const g = v.gain(0);
    v.hold(swell(g.gain, t + i * 0.12, 1.4, 0.035, 1.2, 4.5));
    const o = v.osc(i % 2 ? 'triangle' : 'sine', f * p.rate);
    o.detune.value = rand(-4, 4);
    o.connect(g).connect(v.out);
  });
  // Rising shimmer: a gentle filtered-noise breath.
  v.burst({ color: 'pink', type: 'bandpass', freq: 1800, q: 2, at: t, a: 1.2, peak: 0.03, d: 2.5, sweepTo: 4200, sweepDur: 2 });
};

/** Faint single tick of a tiny bell (hospice ambience, levelup). */
export function tinyBell(v: Voice, prime: number, gain: number, at = v.t, decay = 3): number {
  return bell(v, { prime, decay, gain, beat: 1.3, strike: 0.2, strikeHardness: 3, brightness: 0.7, at, maxRatio: 4.1 });
}

/**
 * Great Bell toll: immense and unsettling. Hum ~55–66 Hz, prime an octave up, detuned partials,
 * slow deep beating, sub-bass bloom, downward drift, and a distant roar of moving air.
 */
export const greatBellToll: Synth = (v, p) => {
  const hum = rand(56, 64) * p.rate;
  const prime = hum * 2;
  bell(v, {
    prime, decay: 17, gain: 0.3, beat: 0.45, strike: 0.25, strikeHardness: 9, brightness: 0.85,
    detune: 0.012, drift: 14,
  });
  const t = v.t;
  // Sub bloom: an octave below the hum, felt more than heard.
  const sub = v.osc('sine', hum * 0.5, t);
  const sg = v.gain(0);
  v.hold(swell(sg.gain, t, 0.12, 0.28, 0.6, 7));
  sub.connect(sg).connect(v.out);
  // Clapper impact: dark thump + iron clank.
  v.burst({ color: 'brown', type: 'lowpass', freq: 400, q: 0.7, peak: 0.9, d: 0.35 });
  v.burst({ type: 'bandpass', freq: 1100, q: 4, peak: 0.12, d: 0.25 });
  // Distant roar: air shoved by the bell mouth, slowly breathing.
  const roar = v.noise('brown', t);
  const rf = v.filter('lowpass', 260, 0.8);
  const rg = v.gain(0);
  v.hold(swell(rg.gain, t + 0.05, 0.6, 0.35, 1.5, 9));
  v.lfo(0.23, 90, rf.frequency);
  roar.connect(rf).connect(rg).connect(v.out);
  // A dissonant upper partial (ratio ≈ 2.83) creeping in late: wrongness.
  const wrong = v.gain(0);
  v.hold(swell(wrong.gain, t + 1.5, 3, 0.02, 1, 6));
  v.osc('sine', prime * 2.83, t + 1.5).connect(wrong).connect(v.out);
};

/**
 * The Unfinished Toll: a thin, far, slightly out-of-tune bell, heard from one direction.
 * Its partials are wrong (tierce too sharp, quint flat), fast sour beating, no hum.
 */
export const unfinishedToll: Synth = (v, p) => {
  const prime = 311 * p.rate * vary(1, 0.01);
  const pan = v.pan(p.pan);
  const hp = v.filter('highpass', 380, 0.7);
  const lp = v.filter('lowpass', 2600, 0.5); // air absorption: it is far away
  hp.connect(lp).connect(pan).connect(v.out);
  // Slow pan drift, as if the sound is carried by wind.
  pan.pan.setValueAtTime(p.pan, v.t);
  pan.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, p.pan * 1.15)), v.t + 6);
  bell(v, {
    prime, decay: 9, gain: 0.5, beat: 2.7, strike: 0.12, brightness: 0.6, detune: 0.02, drift: 25,
    partials: [[1, 0.45, 0.8], [1.23, 0.4, 0.7], [1.46, 0.2, 0.5], [2.04, 0.35, 0.55], [2.61, 0.15, 0.3], [3.1, 0.08, 0.2]],
    dest: hp,
  });
  // The toll is cut off: a second, weaker strike that dies too soon.
  bell(v, { prime: prime * semi(-0.4), decay: 2.5, gain: 0.16, beat: 3.1, strike: 0.08, dest: hp, at: v.t + 2.4, maxRatio: 2.1 });
};

/** Posture break: a heavy bell-like knell over a body blow. */
export const postureBreak: Synth = (v, p) => {
  const prime = 196 * p.rate * vary(1, 0.02);
  bell(v, { prime, decay: 3.2, gain: 0.55, beat: 1.8, strike: 0.5, strikeHardness: 6, brightness: 0.8, detune: 0.006 });
  v.tone({ freq: 95 * p.rate, bendTo: 42, bendDur: 0.25, peak: 0.9, d: 0.45 });
  v.burst({ color: 'brown', type: 'lowpass', freq: 700, peak: 0.8, d: 0.25 });
  v.burst({ type: 'highpass', freq: 3000, peak: 0.35, d: 0.05 });
};

/** Critical opening: bright chime pair (a rising fifth) — "now!" */
export const criticalReady: Synth = (v, p) => {
  const f = 1320 * p.rate;
  bell(v, { prime: f, decay: 1.6, gain: 0.32, beat: 2, strike: 0.35, strikeHardness: 3, maxRatio: 4.1, partials: SMALL_PARTIALS });
  bell(v, { prime: f * 1.5, decay: 1.8, gain: 0.3, beat: 2, strike: 0.3, strikeHardness: 3, maxRatio: 4.1, partials: SMALL_PARTIALS, at: v.t + 0.085 });
  v.burst({ type: 'bandpass', freq: 5000, q: 0.8, a: 0.05, peak: 0.06, d: 0.35, sweepTo: 9000 });
};

/** Hand-bell partial set (brighter, cleaner: used for chimes and music bells). */
export const SMALL_PARTIALS: readonly BellPartial[] = [
  [0.5, 0.22, 1.0],
  [1.0, 0.5, 0.8],
  [1.2, 0.25, 0.6],
  [1.5, 0.12, 0.45],
  [2.0, 0.4, 0.55],
  [2.76, 0.14, 0.3],
  [3.9, 0.07, 0.18],
];
