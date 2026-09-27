/**
 * Impacts — metal, weapons, hits on different materials, swings, footsteps and body movement.
 * Every function varies pitch/filters slightly per play so repeats never machine-gun.
 */
import { perc, pick, rand, sweep, vary, type Voice } from '../engine/Voice';
import type { Surface, Synth } from './types';

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

/** Steel-ish inharmonic partial ratios (free bar / blade modes, stretched). */
const STEEL = [1, 1.52, 2.33, 2.91, 3.7, 4.62, 5.34] as const;

/** Metallic ring: inharmonic sines with individual decays (higher partials shorter). */
export function metal(v: Voice, o: {
  f: number; peak: number; decay: number; at?: number; dest?: AudioNode;
  ratios?: readonly number[]; bright?: number; beat?: number;
}): number {
  const at = o.at ?? v.t;
  const ratios = o.ratios ?? STEEL;
  const nyq = v.ctx.sampleRate * 0.45;
  let end = at;
  ratios.forEach((r, i) => {
    const f = o.f * r * vary(1, 0.01);
    if (f > nyq) return;
    const amp = o.peak * Math.pow(o.bright ?? 0.7, i) * (i === 0 ? 0.8 : 1);
    const d = o.decay * Math.pow(0.78, i) * vary(1, 0.15);
    const g = v.gain(0);
    const e = perc(g.gain, at, 0.001, amp, d);
    v.osc('sine', f, at, e).connect(g).connect(o.dest ?? v.out);
    if (o.beat && i < 3) {
      const tw = v.gain(0.5);
      v.osc('sine', f + o.beat * rand(0.7, 1.3), at, e).connect(tw).connect(g);
    }
    if (e > end) end = e;
  });
  v.hold(end);
  return end;
}

/** Low body thump: sine with a fast downward pitch bend. */
export function thump(v: Voice, f: number, peak: number, d: number, at = v.t, dest?: AudioNode): void {
  v.tone({ freq: f * vary(1, 0.06), bendTo: f * 0.45, bendDur: d * 0.6, peak, d, at, a: 0.002, dest });
}

/** Airy whoosh: pink noise through a swept bandpass with a stereo sweep. */
export function whoosh(v: Voice, o: {
  dur: number; f0: number; f1: number; peak: number; q?: number; at?: number; dest?: AudioNode; panFrom?: number; panTo?: number;
}): number {
  const at = o.at ?? v.t;
  const end = at + o.dur * 1.9; // release (tc = 0.18·dur) has decayed > 60 dB by here
  const src = v.noise('pink', at, end);
  const bp = v.filter('bandpass', o.f0, o.q ?? 1.4);
  const g = v.gain(0);
  const pan = v.pan(o.panFrom ?? -0.25);
  const peakT = at + o.dur * 0.45;
  // Band-limited pink noise is quiet: this makeup keeps `peak` roughly comparable to other layers.
  const peak = o.peak * 3.5;
  bp.frequency.setValueAtTime(o.f0, at);
  bp.frequency.exponentialRampToValueAtTime(o.f1, peakT);
  bp.frequency.exponentialRampToValueAtTime(o.f0 * 0.8, at + o.dur);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak * 0.35, at + o.dur * 0.25);
  g.gain.linearRampToValueAtTime(peak, peakT);
  g.gain.setTargetAtTime(0, peakT, o.dur * 0.18);
  pan.pan.setValueAtTime(o.panFrom ?? -0.25, at);
  pan.pan.linearRampToValueAtTime(o.panTo ?? 0.25, at + o.dur);
  src.connect(bp).connect(g).connect(pan).connect(o.dest ?? v.out);
  v.hold(end);
  return end;
}

/** Scattered tiny noise grains (grit, debris, splinters). */
export function grains(v: Voice, o: { n: number; spread: number; freq: number; q?: number; peak: number; d?: number; at?: number; type?: BiquadFilterType }): void {
  const at = o.at ?? v.t;
  for (let i = 0; i < o.n; i++) {
    v.burst({
      type: o.type ?? 'bandpass', freq: o.freq * vary(1, 0.35), q: o.q ?? 1.5,
      at: at + Math.random() * o.spread, peak: o.peak * rand(0.4, 1), d: (o.d ?? 0.025) * vary(1, 0.4),
    });
  }
}

/** Extra layer describing the surface under an impact (footfalls, landings, heavy hits). */
export function surfaceLayer(v: Voice, s: Surface, amt: number, at = v.t): void {
  switch (s) {
    case 'stone':
      v.burst({ type: 'highpass', freq: 2200 * vary(1, 0.2), at, peak: 0.28 * amt, d: 0.025 });
      grains(v, { n: 3, spread: 0.04, freq: 4200, peak: 0.07 * amt, at });
      break;
    case 'wood':
      v.burst({ type: 'bandpass', freq: 420 * vary(1, 0.15), q: 4, at, peak: 0.55 * amt, d: 0.09 });
      v.tone({ freq: 210 * vary(1, 0.1), peak: 0.12 * amt, d: 0.12, at });
      break;
    case 'dirt':
      v.burst({ color: 'pink', type: 'lowpass', freq: 800 * vary(1, 0.2), at, peak: 0.35 * amt, d: 0.09 });
      grains(v, { n: 3, spread: 0.06, freq: 1600, q: 1, peak: 0.08 * amt, at });
      break;
    case 'metal':
      metal(v, { f: 620 * vary(1, 0.08), peak: 0.1 * amt, decay: 0.3, at, ratios: [1, 2.31, 3.87, 5.1] });
      v.burst({ type: 'bandpass', freq: 2600, q: 2, at, peak: 0.15 * amt, d: 0.03 });
      break;
    case 'water': {
      v.burst({ color: 'white', type: 'bandpass', freq: 1800, q: 1.2, at, peak: 0.3 * amt, d: 0.22, sweepTo: 450, sweepDur: 0.2 });
      v.burst({ color: 'pink', type: 'lowpass', freq: 500, at: at + 0.02, a: 0.02, peak: 0.25 * amt, d: 0.25 });
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const t = at + 0.03 + Math.random() * 0.15;
        const f = rand(500, 900);
        v.tone({ freq: f, bendTo: f * rand(1.8, 2.6), bendDur: 0.03, peak: 0.05 * amt, d: 0.04, at: t });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------------------------

/** Footstep, per surface. */
export const step: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.08);
  thump(v, 105 * r, p.surface === 'water' ? 0.1 : 0.32, 0.07);
  surfaceLayer(v, p.surface, 0.8);
  if (p.surface === 'wood' && Math.random() < 0.15) {
    // Occasional board creak.
    const t = v.t + 0.02;
    const o = v.osc('sawtooth', rand(70, 110), t, t + 0.25);
    const f = v.filter('bandpass', rand(700, 1100), 9);
    const g = v.gain(0);
    v.hold(perc(g.gain, t, 0.05, 0.05, 0.2));
    o.frequency.linearRampToValueAtTime(rand(60, 130), t + 0.2);
    o.connect(f).connect(g).connect(v.out);
  }
};

/** A tiny jingle of mail and plates. */
export const armorRattle: Synth = (v, p) => {
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const t = v.t + Math.random() * 0.18;
    const f = rand(2400, 5200) * p.rate;
    v.tone({ freq: f, peak: rand(0.03, 0.07), d: rand(0.03, 0.08), at: t });
    v.tone({ freq: f * 1.47, peak: rand(0.015, 0.04), d: rand(0.02, 0.05), at: t });
    v.burst({ type: 'highpass', freq: 5000, at: t, peak: 0.04, d: 0.012 });
  }
};

/** Cloth rustle: grains of airy noise. */
export const clothRustle: Synth = (v, p) => {
  const n = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    v.burst({
      color: 'pink', type: 'bandpass', freq: rand(1800, 3800) * p.rate, q: 0.9,
      at: v.t + i * rand(0.03, 0.05), a: 0.015, peak: rand(0.2, 0.36), d: rand(0.05, 0.1),
    });
  }
};

/** Dodge roll: cloth swish, body thump on the ground, a little armour. */
export const roll: Synth = (v, p) => {
  whoosh(v, { dur: 0.32, f0: 500 * p.rate, f1: 1400 * p.rate, peak: 0.28, q: 0.9 });
  const t = v.t + 0.2;
  thump(v, 90 * p.rate, 0.45, 0.14, t);
  surfaceLayer(v, p.surface, 0.8, t);
  armorRattle(v, p);
};

/** Landing from a fall. */
export const land: Synth = (v, p) => {
  thump(v, 85 * p.rate, 0.75, 0.25);
  v.burst({ color: 'brown', type: 'lowpass', freq: 500, peak: 0.5, d: 0.2 });
  surfaceLayer(v, p.surface, 1.2);
  armorRattle(v, p);
};

// ---------------------------------------------------------------------------------------------
// Swings & charges
// ---------------------------------------------------------------------------------------------

export const swingLight: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  whoosh(v, { dur: 0.19 * vary(1, 0.1), f0: 900 * r, f1: 3300 * r, peak: 0.45, q: 1.6, panFrom: -0.35, panTo: 0.35 });
  // Faint blade sing.
  v.tone({ freq: rand(2600, 3400) * r, a: 0.06, peak: 0.012, d: 0.12 });
};

export const swingHeavy: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.05);
  whoosh(v, { dur: 0.36, f0: 380 * r, f1: 1500 * r, peak: 0.55, q: 1.1, panFrom: -0.45, panTo: 0.45 });
  whoosh(v, { dur: 0.32, f0: 160 * r, f1: 420 * r, peak: 0.3, q: 0.8 });
};

export const swingHuge: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.04);
  whoosh(v, { dur: 0.62, f0: 150 * r, f1: 700 * r, peak: 0.6, q: 0.9, panFrom: -0.6, panTo: 0.6 });
  whoosh(v, { dur: 0.55, f0: 70 * r, f1: 220 * r, peak: 0.45, q: 0.7 });
  // Air displacement sub.
  const g = v.gain(0);
  const t = v.t + 0.2;
  v.hold(perc(g.gain, t, 0.12, 0.25, 0.4));
  v.osc('sine', 48 * r, t).connect(g).connect(v.out);
};

/** Heavy attack being charged: rising tension (~1.1 s). */
export const chargeHeavy: Synth = (v, p) => {
  const t = v.t;
  const dur = 1.1;
  const src = v.noise('pink', t, t + dur + 0.3);
  const bp = v.filter('bandpass', 300, 2.5);
  sweep(bp.frequency, t, 300 * p.rate, 1700 * p.rate, dur);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + dur);
  g.gain.setTargetAtTime(0, t + dur, 0.05);
  src.connect(bp).connect(g).connect(v.out);
  const o = v.osc('sawtooth', 55 * p.rate, t, t + dur + 0.3);
  sweep(o.frequency, t, 55 * p.rate, 82 * p.rate, dur);
  const lp = v.filter('lowpass', 300, 1);
  const og = v.gain(0);
  og.gain.setValueAtTime(0, t);
  og.gain.linearRampToValueAtTime(0.1, t + dur);
  og.gain.setTargetAtTime(0, t + dur, 0.05);
  o.connect(lp).connect(og).connect(v.out);
  v.hold(t + dur + 0.3);
};

/** Charge at full: a clean bright "ting". */
export const chargeFull: Synth = (v, p) => {
  metal(v, { f: 1760 * p.rate, peak: 0.28, decay: 0.9, ratios: [1, 2.02, 2.76, 4.1], bright: 0.5, beat: 4 });
  v.burst({ type: 'highpass', freq: 5000, peak: 0.12, d: 0.03 });
};

// ---------------------------------------------------------------------------------------------
// Hits
// ---------------------------------------------------------------------------------------------

export const hitFlesh: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.08);
  v.burst({ type: 'highpass', freq: 2800 * r, peak: 0.35, d: 0.05 }); // the slice
  thump(v, 125 * r, 0.7, 0.14);
  // Wet squelch: bandpass closing downward.
  v.burst({ color: 'pink', type: 'bandpass', freq: 1300 * r, q: 2.2, peak: 0.55, d: 0.16, sweepTo: 380 * r, sweepDur: 0.12 });
};

export const hitArmor: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.07);
  metal(v, { f: 1050 * r, peak: 0.38, decay: 0.38, bright: 0.75 });
  v.burst({ type: 'bandpass', freq: 3200 * r, q: 1.4, peak: 0.55, d: 0.06 });
  thump(v, 140 * r, 0.45, 0.1);
};

export const hitWood: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.08);
  for (const [f, a, d] of [[175, 0.3, 0.2], [415, 0.22, 0.14], [890, 0.12, 0.08]] as const) {
    v.tone({ freq: f * r * vary(1, 0.05), peak: a, d });
  }
  v.burst({ type: 'bandpass', freq: 650 * r, q: 3, peak: 0.6, d: 0.09 });
  grains(v, { n: 4, spread: 0.05, freq: 3000, peak: 0.12 }); // splinters
};

export const hitStone: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.08);
  thump(v, 75 * r, 0.6, 0.18);
  grains(v, { n: 6, spread: 0.07, freq: 2400 * r, q: 0.8, peak: 0.35, d: 0.02, type: 'highpass' });
  v.burst({ color: 'brown', type: 'lowpass', freq: 900, peak: 0.45, d: 0.15 });
};

export const hitHeavy: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.05);
  thump(v, 70 * r, 1, 0.6);
  v.burst({ color: 'brown', type: 'lowpass', freq: 550, peak: 0.7, d: 0.45 });
  v.burst({ type: 'bandpass', freq: 1800, q: 0.8, peak: 0.4, d: 0.08 });
  metal(v, { f: 520 * r, peak: 0.12, decay: 0.5, bright: 0.6 });
  grains(v, { n: 5, spread: 0.25, freq: 2500, peak: 0.1, at: v.t + 0.05 });
  surfaceLayer(v, p.surface, 0.8);
};

// ---------------------------------------------------------------------------------------------
// Guard, parry, criticals
// ---------------------------------------------------------------------------------------------

/** Blocked hit: duller thud with a short ring. */
export const guardBlock: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  thump(v, 150 * r, 0.75, 0.16);
  v.burst({ color: 'brown', type: 'lowpass', freq: 1400, peak: 0.55, d: 0.12 });
  metal(v, { f: 640 * r, peak: 0.2, decay: 0.45, bright: 0.55, beat: 3 });
  v.burst({ type: 'bandpass', freq: 2200, q: 1.2, peak: 0.25, d: 0.04 });
};

/** Parry attempt: a sharp flick of steel — no contact yet. */
export const parryAttempt: Synth = (v, p) => {
  whoosh(v, { dur: 0.13, f0: 1400 * p.rate, f1: 4200 * p.rate, peak: 0.3, q: 1.8, panFrom: 0.2, panTo: -0.2 });
  v.tone({ freq: 2450 * p.rate * vary(1, 0.03), peak: 0.05, d: 0.08 });
};

/**
 * Parry success — must feel great and be unmistakable: a hard transient, a bright steel clang,
 * a beating high shimmer that rings for seconds, and a low body so it has weight.
 */
export const parrySuccess: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.015);
  const t = v.t;
  v.burst({ type: 'highpass', freq: 2500, peak: 0.4, d: 0.03 }); // contact
  thump(v, 190 * r, 0.3, 0.12);
  // Bright clang.
  metal(v, { f: 1380 * r, peak: 0.34, decay: 1.4, ratios: [1, 1.47, 2.09, 2.56, 3.14, 3.9, 4.7], bright: 0.78, beat: 3.5 });
  // Long shimmer: a beating pair high up, plus a gently rising sparkle.
  for (const [f, a, d] of [[2760, 0.13, 2.8], [4140, 0.07, 2.2], [5520, 0.04, 1.6]] as const) {
    const g = v.gain(0);
    const e = perc(g.gain, t, 0.004, a, d);
    v.osc('sine', f * r, t, e).connect(g).connect(v.out);
    v.osc('sine', f * r + rand(3, 6), t, e).connect(g);
    v.hold(e);
  }
  v.burst({ type: 'bandpass', freq: 6000, q: 3, at: t + 0.02, a: 0.08, peak: 0.07, d: 1.3, sweepTo: 9500, sweepDur: 1.2 });
};

/** Guard broken: splintering crack + low thump + snapped-steel ring. */
export const guardBreak: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.04);
  v.burst({ type: 'highpass', freq: 1400, peak: 0.95, d: 0.09 }); // crack
  grains(v, { n: 5, spread: 0.06, freq: 2600, q: 1.2, peak: 0.45, d: 0.03 });
  thump(v, 82 * r, 1, 0.55);
  v.burst({ color: 'brown', type: 'lowpass', freq: 380, peak: 0.8, d: 0.45 });
  metal(v, { f: 415 * r, peak: 0.22, decay: 0.7, bright: 0.8, beat: 7 }); // sour, snapped ring
};

/** Critical stab: wet thud + a blade scraped free. */
export const criticalStab: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.04);
  const t = v.t;
  thump(v, 105 * r, 1, 0.35);
  v.burst({ color: 'pink', type: 'bandpass', freq: 1500 * r, q: 2.5, peak: 0.75, d: 0.28, sweepTo: 280, sweepDur: 0.25 });
  // Metal scrape: narrow resonant noise sweeping up, with a sliding inharmonic pair.
  const ts = t + 0.18;
  const src = v.noise('white', ts, ts + 0.85);
  const bp = v.filter('bandpass', 2300, 9);
  sweep(bp.frequency, ts, 2300 * r, 5200 * r, 0.45);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, ts);
  g.gain.linearRampToValueAtTime(0.4, ts + 0.08);
  g.gain.setTargetAtTime(0, ts + 0.35, 0.06);
  src.connect(bp).connect(g).connect(v.out);
  for (const f of [1900, 2870]) {
    const o = v.osc('sine', f * r, ts, ts + 0.7);
    sweep(o.frequency, ts, f * r, f * r * 1.35, 0.45);
    const og = v.gain(0);
    v.hold(perc(og.gain, ts, 0.05, 0.05, 0.5));
    o.connect(og).connect(v.out);
  }
};

/** Stagger: a heavy lurch — armour clatter, scuffed feet. */
export const stagger: Synth = (v, p) => {
  thump(v, 95 * p.rate, 0.55, 0.2);
  armorRattle(v, p);
  v.burst({ color: 'pink', type: 'bandpass', freq: 900, q: 1, at: v.t + 0.05, a: 0.03, peak: 0.25, d: 0.25, sweepTo: 500 });
  metal(v, { f: 720 * p.rate * vary(1, 0.1), peak: 0.1, decay: 0.3 });
};

// ---------------------------------------------------------------------------------------------
// Ranged
// ---------------------------------------------------------------------------------------------

export const throwCue: Synth = (v, p) => {
  whoosh(v, { dur: 0.22, f0: 700 * p.rate, f1: 2400 * p.rate, peak: 0.35, q: 1.5, panFrom: 0, panTo: 0.3 });
  clothRustle(v, p);
};

/** Bowstring drawn: creaking limbs and a tightening string (readable tell from archers). */
export const bowDraw: Synth = (v, p) => {
  const t = v.t;
  const dur = 0.75;
  // Creak: slow pulse train through a narrow resonance = stick-slip wood creak.
  const pulse = v.osc('sawtooth', 38, t, t + dur + 0.3);
  pulse.frequency.linearRampToValueAtTime(70, t + dur);
  const bp = v.filter('bandpass', 1100 * p.rate, 7);
  sweep(bp.frequency, t, 900 * p.rate, 1500 * p.rate, dur);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.28, t + 0.1);
  g.gain.linearRampToValueAtTime(0.35, t + dur);
  g.gain.setTargetAtTime(0, t + dur, 0.04);
  pulse.connect(bp).connect(g).connect(v.out);
  // String tension tone rising.
  const s = v.osc('triangle', 180 * p.rate, t, t + dur + 0.3);
  sweep(s.frequency, t, 180 * p.rate, 240 * p.rate, dur);
  const sg = v.gain(0);
  sg.gain.setValueAtTime(0, t);
  sg.gain.linearRampToValueAtTime(0.03, t + dur);
  sg.gain.setTargetAtTime(0, t + dur, 0.04);
  s.connect(sg).connect(v.out);
  v.hold(t + dur + 0.35);
};

export const bowRelease: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.04);
  const o = v.osc('sawtooth', 98 * r);
  const lp = v.filter('lowpass', 3000, 2);
  sweep(lp.frequency, v.t, 3200, 250, 0.3);
  const g = v.gain(0);
  v.hold(perc(g.gain, v.t, 0.001, 0.3, 0.35));
  o.connect(lp).connect(g).connect(v.out);
  v.tone({ freq: 196 * r, peak: 0.12, d: 0.4 });
  v.burst({ type: 'highpass', freq: 3000, peak: 0.3, d: 0.02 });
  whoosh(v, { dur: 0.2, f0: 1500, f1: 4000, peak: 0.2, q: 2, at: v.t + 0.02, panFrom: 0, panTo: 0 });
};

export const arrowHit: Synth = (v, p) => {
  const r = p.rate * vary(1, 0.06);
  v.burst({ type: 'bandpass', freq: 520 * r, q: 2, peak: 0.55, d: 0.07 });
  thump(v, 160 * r, 0.35, 0.09);
  // Shaft quiver: a buzzing tone with fast tremolo.
  const o = v.osc('triangle', 210 * r, v.t + 0.01);
  const g = v.gain(0);
  v.hold(perc(g.gain, v.t + 0.01, 0.005, 0.12, 0.35));
  const trem = v.gain(0.5);
  v.lfo(34, 0.5, trem.gain);
  o.connect(trem).connect(g).connect(v.out);
  if (p.surface !== 'stone') surfaceLayer(v, p.surface, 0.5);
};

/** Pick a surface at random for variety tests. */
export const randomSurface = (): Surface => pick(['stone', 'wood', 'dirt', 'metal', 'water'] as const);
