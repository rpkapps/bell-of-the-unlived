/**
 * Music instruments. Each call schedules ONE note/chord at an absolute AudioContext time as its
 * own self-cleaning Voice, routed to a score's dry and wet (music reverb) inputs.
 *
 * Core palette: pad, choir, strings, brass, timpani, taiko, snare, bell, drone, swell.
 * Institution palette:
 *   Army      → taiko / snare / brass through distant() (war drums and horns across a valley)
 *   Academy   → glass() (bowed glass), harmonica() (glass harmonica), glassPluck(), wash() (sea)
 *   Cathedral → choir() canons, organ(), processional taiko
 *   Treasury  → mechanism() (clockwork), dulcimer() (hammered metal strings), low brass
 *   Household → harpsichord() / pluck() through a far lowpass (distant court music), strings
 *   Belfry    → greatBell(), subDrone(), low choir
 *   Ending    → pianoBell() (piano-like bell tones), strings
 */
import type { NoiseBank } from '../engine/noise';
import { perc, rand, sweep, swell, Voice } from '../engine/Voice';
import { bell, SMALL_PARTIALS, CHURCH_PARTIALS } from '../synth/bells';
import { metal } from '../synth/impacts';
import { VOWELS, type Vowel } from '../synth/voices';
import { GLASS } from '../synth/magic';

/** Where a score's notes go. */
export interface MusicOut {
  readonly ctx: BaseAudioContext;
  readonly bank: NoiseBank;
  readonly dry: AudioNode;
  readonly wet: AudioNode;
}

/** Create, build and launch a note voice. `wet` = reverb send (0..1+). */
function note(out: MusicOut, t: number, wet: number, build: (v: Voice) => void, pan = 0): void {
  const v = new Voice(out.ctx, out.bank, t);
  build(v);
  let tail: AudioNode = v.out;
  if (pan !== 0) {
    const p = v.pan(pan);
    v.out.connect(p);
    tail = p;
  }
  tail.connect(out.dry);
  if (wet > 0) {
    const s = v.gain(wet);
    tail.connect(s).connect(out.wet);
  }
  v.launch();
}

/** Amp envelope with attack, sustain until `dur`, release. Returns end time. */
function ar(p: AudioParam, t: number, a: number, peak: number, dur: number, r: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + Math.min(a, dur));
  p.setValueAtTime(peak, t + Math.max(a, dur));
  p.setTargetAtTime(0, t + Math.max(a, dur), r / 6.9);
  return t + Math.max(a, dur) + r;
}

// ---------------------------------------------------------------------------------------------

/** Warm pad: two detuned saws per note (spread L/R) through a breathing lowpass. */
export function pad(out: MusicOut, t: number, freqs: readonly number[], dur: number, vel: number,
  o: { attack?: number; release?: number; cutoff?: number; wet?: number } = {}): void {
  note(out, t, o.wet ?? 0.6, (v) => {
    const cutoff = o.cutoff ?? 900;
    const lp = v.filter('lowpass', cutoff, 0.8);
    lp.frequency.setValueAtTime(cutoff * 0.5, t);
    lp.frequency.linearRampToValueAtTime(cutoff, t + (o.attack ?? 1.5));
    v.lfo(rand(0.08, 0.16), cutoff * 0.25, lp.frequency);
    const L = v.pan(-0.45);
    const R = v.pan(0.45);
    const g = v.gain(0);
    const per = vel * 0.07 / Math.sqrt(freqs.length);
    v.hold(ar(g.gain, t, o.attack ?? 1.5, per, dur, o.release ?? 2.5));
    for (const f of freqs) {
      const a = v.osc('sawtooth', f, t);
      a.detune.value = rand(-9, -5);
      const b = v.osc('sawtooth', f, t);
      b.detune.value = rand(5, 9);
      a.connect(L);
      b.connect(R);
    }
    L.connect(lp);
    R.connect(lp);
    lp.connect(g).connect(v.out);
  });
}

/** Choir: detuned saws with vibrato into three vowel formants; slow vowel morph. */
export function choir(out: MusicOut, t: number, freqs: readonly number[], dur: number, vel: number,
  o: { vowel?: Vowel; to?: Vowel; attack?: number; release?: number; wet?: number; size?: number } = {}): void {
  note(out, t, o.wet ?? 0.9, (v) => {
    const mix = v.gain(1);
    const g = v.gain(0);
    const per = vel * 0.1 / Math.sqrt(freqs.length);
    const end = ar(g.gain, t, o.attack ?? 1.2, per, dur, o.release ?? 2);
    v.hold(end);
    // Two vibrato LFOs shared across the chord (one per ensemble half) keep the node count low
    // while the halves still drift against each other.
    const vib = [v.modulator(rand(4.6, 5.1), rand(8, 12), 'sine', t + 0.3), v.modulator(rand(5.1, 5.6), rand(9, 14), 'sine', t + 0.3)];
    for (const f of freqs) {
      for (let k = 0; k < 2; k++) {
        const s = v.osc('sawtooth', f, t);
        s.detune.value = k ? rand(4, 9) : rand(-9, -4);
        vib[k]!.connect(s.detune);
        s.connect(mix);
      }
    }
    // Breath.
    const br = v.noise('pink', t);
    const bg = v.gain(0.06);
    br.connect(bg).connect(mix);
    const size = o.size ?? 1;
    const A = VOWELS[o.vowel ?? 'o'];
    const B = VOWELS[o.to ?? o.vowel ?? 'o'];
    const sum = v.gain(1);
    [1, 0.5, 0.22].forEach((fg, i) => {
      const bp = v.filter('bandpass', A[i]! * size, [6, 9, 12][i]!);
      if (o.to) {
        bp.frequency.setValueAtTime(A[i]! * size, t);
        bp.frequency.linearRampToValueAtTime(B[i]! * size, t + Math.max(1, dur));
      }
      const fgn = v.gain(fg * 3.2);
      mix.connect(bp).connect(fgn).connect(sum);
    });
    const lp = v.filter('lowpass', 3500, 0.5);
    sum.connect(lp).connect(g).connect(v.out);
  });
}

/** Low strings / cello section: detuned saws, slow bow attack, vibrato. */
export function strings(out: MusicOut, t: number, f: number, dur: number, vel: number,
  o: { attack?: number; release?: number; wet?: number; bright?: number; pan?: number } = {}): void {
  note(out, t, o.wet ?? 0.55, (v) => {
    const lp = v.filter('lowpass', f * 3, 0.7);
    const bright = o.bright ?? 1;
    lp.frequency.setValueAtTime(f * 2, t);
    lp.frequency.linearRampToValueAtTime(Math.min(8000, f * 6 * bright), t + (o.attack ?? 0.4) + 0.2);
    const g = v.gain(0);
    v.hold(ar(g.gain, t, o.attack ?? 0.4, vel * 0.06, dur, o.release ?? 0.9));
    // One vibrato LFO per note (only for notes long enough to hear it).
    const vib = dur > 0.3 ? v.modulator(rand(5.2, 5.9), 7, 'sine', t + 0.35) : null;
    for (const d of [-10, 0, 9]) {
      const s = v.osc('sawtooth', f, t);
      s.detune.value = d + rand(-2, 2);
      vib?.connect(s.detune);
      s.connect(lp);
    }
    lp.connect(g).connect(v.out);
  }, o.pan ?? 0);
}

/** Brass: saws with a filter "blat", a small pitch scoop, firm attack. */
export function brass(out: MusicOut, t: number, f: number, dur: number, vel: number,
  o: { wet?: number; pan?: number; bite?: number } = {}): void {
  note(out, t, o.wet ?? 0.4, (v) => {
    const bite = o.bite ?? 1;
    const lp = v.filter('lowpass', f * 2, 1.2);
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(Math.min(9000, f * (4 + 5 * vel * bite)), t + 0.07);
    lp.frequency.setTargetAtTime(Math.min(7000, f * 3.2), t + 0.08, 0.25);
    const g = v.gain(0);
    v.hold(ar(g.gain, t, 0.035, vel * 0.09, dur, 0.22));
    const vib = dur > 0.4 ? v.modulator(5.3, 5, 'sine', t + 0.25) : null;
    for (const d of [-6, 5]) {
      const s = v.osc('sawtooth', f, t);
      s.detune.setValueAtTime(d - 35, t);
      s.detune.linearRampToValueAtTime(d, t + 0.05);
      vib?.connect(s.detune);
      s.connect(lp);
    }
    lp.connect(g).connect(v.out);
  }, o.pan ?? 0);
}

/** Timpani: pitched membrane modes + mallet noise. */
export function timpani(out: MusicOut, t: number, f: number, vel: number, o: { wet?: number; decay?: number } = {}): void {
  note(out, t, o.wet ?? 0.5, (v) => {
    const d = o.decay ?? 1.6;
    for (const [r, a, dd] of [[1, 1, 1], [1.5, 0.35, 0.6], [1.98, 0.2, 0.4], [2.44, 0.1, 0.3]] as const) {
      const o2 = v.osc('sine', f * r, t);
      o2.frequency.setValueAtTime(f * r * 1.025, t);
      o2.frequency.exponentialRampToValueAtTime(f * r, t + 0.12);
      const g = v.gain(0);
      v.hold(perc(g.gain, t, 0.003, vel * 0.16 * a, d * dd));
      o2.connect(g).connect(v.out);
    }
    v.burst({ color: 'pink', type: 'lowpass', freq: 900, peak: vel * 0.12, d: 0.12 });
  });
}

/** Timpani roll: rapid soft strokes with a dynamic curve (crescendo when vel1 > vel0). */
export function timpaniRoll(out: MusicOut, t: number, f: number, dur: number, vel0: number, vel1: number): void {
  const rate = 1 / 15;
  for (let x = 0; x < dur; x += rate) {
    const k = x / dur;
    timpani(out, t + x + rand(-0.004, 0.004), f, (vel0 + (vel1 - vel0) * k) * rand(0.8, 1) * 0.55, { decay: 0.9 });
  }
}

/** Big low drum (taiko / war drum). */
export function taiko(out: MusicOut, t: number, vel: number, o: { f?: number; wet?: number } = {}): void {
  note(out, t, o.wet ?? 0.35, (v) => {
    const f = o.f ?? 58;
    const s = v.osc('sine', f * 2.2, t);
    sweep(s.frequency, t, f * 2.2, f, 0.12);
    const g = v.gain(0);
    v.hold(perc(g.gain, t, 0.002, vel * 0.32, 0.7));
    s.connect(g).connect(v.out);
    v.burst({ color: 'pink', type: 'lowpass', freq: 1400, peak: vel * 0.16, d: 0.09 });
    v.burst({ type: 'bandpass', freq: 250, q: 1.5, peak: vel * 0.1, d: 0.2 });
  });
}

/** Field snare (martial): tight noise + body. */
export function snare(out: MusicOut, t: number, vel: number, o: { wet?: number; tone?: number } = {}): void {
  note(out, t, o.wet ?? 0.3, (v) => {
    v.burst({ type: 'bandpass', freq: 2200 * (o.tone ?? 1), q: 0.7, peak: vel * 0.2, d: 0.16 });
    v.burst({ type: 'highpass', freq: 5000, peak: vel * 0.07, d: 0.08 });
    v.tone({ freq: 190, bendTo: 160, bendDur: 0.05, peak: vel * 0.1, d: 0.09 });
  });
}

/** Snare roll with crescendo. */
export function snareRoll(out: MusicOut, t: number, dur: number, vel0: number, vel1: number, rate = 1 / 20): void {
  for (let x = 0; x < dur; x += rate) {
    const k = x / dur;
    snare(out, t + x + rand(-0.003, 0.003), (vel0 + (vel1 - vel0) * k) * rand(0.7, 1) * 0.6);
  }
}

/** Tuned bell (music): additive bell voice. */
export function mbell(out: MusicOut, t: number, prime: number, vel: number,
  o: { decay?: number; wet?: number; church?: boolean; pan?: number; far?: boolean } = {}): void {
  note(out, t, o.wet ?? 0.8, (v) => {
    let dest: AudioNode = v.out;
    if (o.far) {
      const lp = v.filter('lowpass', 1400, 0.5);
      lp.connect(v.out);
      dest = lp;
    }
    bell(v, {
      prime, decay: o.decay ?? 5, gain: vel * 0.2, beat: 1, strike: 0.15, strikeHardness: 3,
      partials: o.church ? CHURCH_PARTIALS : SMALL_PARTIALS, brightness: 0.7, dest,
    });
  }, o.pan ?? 0);
}

/** Sustained drone: sine + soft triangle an octave up, slow swell. */
export function drone(out: MusicOut, t: number, f: number, dur: number, vel: number, o: { attack?: number; release?: number; wet?: number } = {}): void {
  note(out, t, o.wet ?? 0.4, (v) => {
    const g = v.gain(0);
    v.hold(ar(g.gain, t, o.attack ?? 3, vel * 0.12, dur, o.release ?? 3));
    v.osc('sine', f, t).connect(g);
    const tr = v.osc('triangle', f * 2, t);
    tr.detune.value = rand(-4, 4);
    const tg = v.gain(0.25);
    tr.connect(tg).connect(g);
    g.connect(v.out);
  });
}

/** Reverse-style swell: filtered noise + a tone rising into a downbeat (then cut). */
export function riser(out: MusicOut, t: number, dur: number, vel: number, f = 0): void {
  note(out, t, 0.8, (v) => {
    const src = v.noise('pink', t, t + dur + 0.3);
    const bp = v.filter('bandpass', 300, 0.9);
    sweep(bp.frequency, t, 300, 3500, dur);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.15, t + dur);
    g.gain.setTargetAtTime(0, t + dur, 0.03);
    src.connect(bp).connect(g).connect(v.out);
    if (f > 0) {
      const o = v.osc('sawtooth', f, t, t + dur + 0.3);
      const lp = v.filter('lowpass', 400, 1);
      sweep(lp.frequency, t, 300, 2500, dur);
      const og = v.gain(0);
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(vel * 0.04, t + dur);
      og.gain.setTargetAtTime(0, t + dur, 0.03);
      o.connect(lp).connect(og).connect(v.out);
    }
    v.hold(t + dur + 0.35);
  });
}

// ---- Institution palette (later regions) ------------------------------------------------------

/** Academy: bowed glass — slow-attack glass partials, left hanging (unresolved). */
export function glass(out: MusicOut, t: number, f: number, dur: number, vel: number): void {
  note(out, t, 0.9, (v) => {
    GLASS.forEach((r, i) => {
      const g = v.gain(0);
      v.hold(ar(g.gain, t, 0.6 + i * 0.1, vel * 0.05 / (i + 1), dur, 2));
      v.osc('sine', f * r, t).connect(g).connect(v.out);
      v.osc('sine', f * r + rand(0.5, 1.5), t).connect(g);
    });
  });
}

/** Treasury: clockwork — a tick with a tiny metallic ring (sequence it in strict rhythm). */
export function mechanism(out: MusicOut, t: number, vel: number, pitch = 1): void {
  note(out, t, 0.2, (v) => {
    v.burst({ type: 'bandpass', freq: 3500 * pitch, q: 5, peak: vel * 0.9, d: 0.02 });
    v.tone({ freq: 1900 * pitch, peak: vel * 0.15, d: 0.06 });
    v.tone({ freq: 2870 * pitch, peak: vel * 0.09, d: 0.04 });
  });
}

/** Household: plucked court string (lute/harp), heard distantly. */
export function pluck(out: MusicOut, t: number, f: number, vel: number, o: { far?: boolean } = {}): void {
  note(out, t, 0.6, (v) => {
    const lp = v.filter('lowpass', f * 8, 0.7);
    sweep(lp.frequency, t, Math.min(9000, f * 10), f * 1.5, 0.6);
    const g = v.gain(0);
    v.hold(perc(g.gain, t, 0.003, vel * 0.12, 1.4));
    v.osc('sawtooth', f, t).connect(lp);
    const tri = v.osc('triangle', f * 2, t);
    const tg = v.gain(0.3);
    tri.connect(tg).connect(lp);
    let tail: AudioNode = g;
    lp.connect(g);
    if (o.far) {
      const far = v.filter('lowpass', 1600, 0.5);
      g.connect(far);
      tail = far;
    }
    tail.connect(v.out);
  });
}

// ---- Phase 2 instruments ---------------------------------------------------------------------

/** A far-away MusicOut: `lp` is its (automatable) air-absorption filter; `fade()` scales it. */
export interface FarOut extends MusicOut {
  readonly lp: BiquadFilterNode;
  fade(level: number, t: number, tc: number): void;
}

/**
 * A far-away sub-output: one shared lowpass (air absorption) on the dry path and a boosted,
 * slightly darker reverb send — everything played through it sounds across a valley.
 * The nodes are persistent for the score's life (a handful per score, not per note).
 */
export function distant(out: MusicOut, cutoff: number, wetMul = 1.6, dryMul = 1): FarOut {
  const ctx = out.ctx;
  const g = (v: number) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  lp.Q.value = 0.5;
  const dry = g(dryMul);
  // Far sounds reach the reverb through their dry path too (they have little direct sound).
  const bleed = g(wetMul * 0.5);
  lp.connect(dry).connect(out.dry);
  lp.connect(bleed).connect(out.wet);
  const wlp = ctx.createBiquadFilter();
  wlp.type = 'lowpass';
  wlp.frequency.value = cutoff * 1.4;
  wlp.Q.value = 0.5;
  const wet = g(wetMul);
  wlp.connect(wet).connect(out.wet);
  return {
    ctx, bank: out.bank, dry: lp, wet: wlp, lp,
    fade(level: number, t: number, tc: number) {
      dry.gain.setTargetAtTime(dryMul * level, t, tc);
      bleed.gain.setTargetAtTime(wetMul * 0.5 * level, t, tc);
      wet.gain.setTargetAtTime(wetMul * level, t, tc);
    },
  };
}

/**
 * Glass harmonica: near-pure sine with faint 2nd/3rd partials, a rubbed-rim tremolo and a soft
 * attack. `bend` (cents) lets the tone sag at its release — an unresolved, suspended sound.
 */
export function harmonica(out: MusicOut, t: number, f: number, dur: number, vel: number,
  o: { wet?: number; pan?: number; bend?: number; attack?: number; release?: number } = {}): void {
  note(out, t, o.wet ?? 1, (v) => {
    const g = v.gain(0);
    const end = ar(g.gain, t, o.attack ?? 0.14, vel * 0.15, dur, o.release ?? 2.2);
    v.hold(end);
    const trem = v.gain(1);
    v.lfo(rand(4.2, 5.6), 0.13, trem.gain, 'sine', t);
    for (const [r, a] of [[1, 1], [2.003, 0.1], [3.01, 0.035]] as const) {
      const osc = v.osc('sine', f * r, t);
      const pg = v.gain(a);
      if (o.bend) {
        osc.detune.setValueAtTime(0, t + dur);
        osc.detune.linearRampToValueAtTime(-o.bend, t + dur + (o.release ?? 2.2));
      }
      osc.connect(pg).connect(trem);
    }
    trem.connect(g).connect(v.out);
  }, o.pan ?? 0);
}

/** Short struck glass (glass marimba / celesta-like): GLASS modes, quick decay. */
export function glassPluck(out: MusicOut, t: number, f: number, vel: number,
  o: { wet?: number; pan?: number; decay?: number; lite?: boolean } = {}): void {
  note(out, t, o.wet ?? 0.8, (v) => {
    // `lite` (fast ostinati): three modes, no beating twins — less than half the oscillators.
    metal(v, { f, peak: vel * 0.09, decay: o.decay ?? 1.1, at: t, ratios: o.lite ? GLASS.slice(0, 3) : GLASS, bright: 0.35, beat: o.lite ? 0 : 1.8 });
  }, o.pan ?? 0);
}

/**
 * Organ-like pad: additive "stops" (8', 4', 2 2/3', 2') shared across the chord, split L/R with a
 * slight chorus, slow swell-box attack. `pedal` adds a 16' an octave below the lowest note.
 */
export function organ(out: MusicOut, t: number, freqs: readonly number[], dur: number, vel: number,
  o: { attack?: number; release?: number; wet?: number; bright?: number; pedal?: boolean } = {}): void {
  note(out, t, o.wet ?? 0.9, (v) => {
    const g = v.gain(0);
    v.hold(ar(g.gain, t, o.attack ?? 0.8, vel * 0.075 / Math.sqrt(freqs.length), dur, o.release ?? 1.6));
    const lp = v.filter('lowpass', 2600 * (o.bright ?? 1), 0.5);
    const L = v.pan(-0.35);
    const R = v.pan(0.35);
    const stops: Array<[number, number, OscillatorType, StereoPannerNode]> = [
      [1, 1, 'sine', L], [2, 0.5, 'sine', R], [3, 0.16, 'triangle', L], [4, 0.14, 'sine', R],
    ];
    const bus = stops.map(([, a, , p]) => { const sg = v.gain(a); sg.connect(p); return sg; });
    for (const f of freqs) {
      stops.forEach(([r, , type], i) => {
        const osc = v.osc(type, f * r, t);
        osc.detune.value = rand(-3, 3);
        osc.connect(bus[i]!);
      });
    }
    if (o.pedal && freqs.length) {
      const pg = v.gain(0.7);
      v.osc('sine', Math.min(...freqs) / 2, t).connect(pg).connect(L);
      pg.connect(R);
    }
    L.connect(lp);
    R.connect(lp);
    lp.connect(g).connect(v.out);
  });
}

/**
 * Harpsichord: bright plucked saw (8') + an octave square (4'), a closing filter, a jack click.
 * `detune` (cents) ages the instrument (the court music decays).
 */
export function harpsichord(out: MusicOut, t: number, f: number, vel: number,
  o: { wet?: number; pan?: number; detune?: number; decay?: number; four?: boolean } = {}): void {
  note(out, t, o.wet ?? 0.5, (v) => {
    const d = o.decay ?? Math.max(0.9, Math.min(3, 2.6 - Math.log2(f / 110) * 0.45));
    const lp = v.filter('lowpass', Math.min(9000, f * 12), 0.6);
    sweep(lp.frequency, t, Math.min(12000, f * 18), Math.max(400, f * 2.5), d * 0.7);
    const hp = v.filter('highpass', f * 0.7, 0.5);
    const g = v.gain(0);
    v.hold(perc(g.gain, t, 0.002, vel * 0.11, d));
    const a = v.osc('sawtooth', f, t);
    a.detune.value = o.detune ?? 0;
    a.connect(lp);
    if (o.four ?? true) {
      const b = v.osc('square', f * 2, t);
      b.detune.value = (o.detune ?? 0) + rand(2, 6);
      const bg = v.gain(0.22);
      b.connect(bg).connect(lp);
    }
    lp.connect(hp).connect(g).connect(v.out);
    v.burst({ type: 'highpass', freq: 3200, peak: vel * 0.02, d: 0.012, at: t });
  }, o.pan ?? 0);
}

/** Hammered dulcimer / metal pluck: a detuned course of strings, a metallic overtone, a hammer tick. */
export function dulcimer(out: MusicOut, t: number, f: number, vel: number,
  o: { wet?: number; pan?: number; decay?: number; lite?: boolean } = {}): void {
  note(out, t, o.wet ?? 0.5, (v) => {
    if (o.lite) {
      // Fast ostinati: the string course and hammer only (3 sources instead of 6).
      const d = o.decay ?? 0.6;
      const g = v.gain(0);
      v.hold(perc(g.gain, t, 0.002, vel * 0.09, d));
      for (const det of [-5, 4]) {
        const s1 = v.osc('triangle', f, t);
        s1.detune.value = det;
        s1.connect(g);
      }
      g.connect(v.out);
      v.burst({ type: 'bandpass', freq: Math.min(9000, f * 6), q: 2, peak: vel * 0.05, d: 0.02, at: t });
      return;
    }
    const d = o.decay ?? 2;
    const g = v.gain(0);
    v.hold(perc(g.gain, t, 0.002, vel * 0.07, d));
    const lp = v.filter('lowpass', Math.min(9000, f * 7), 0.7);
    sweep(lp.frequency, t, Math.min(11000, f * 10), f * 2.5, d * 0.5);
    for (const det of [-5, 4]) {
      const s1 = v.osc('triangle', f, t);
      s1.detune.value = det + rand(-1, 1);
      s1.connect(lp);
    }
    const sq = v.osc('sawtooth', f, t);
    const sqg = v.gain(0.25);
    sq.connect(sqg).connect(lp);
    lp.connect(g).connect(v.out);
    // Metallic ring (slightly inharmonic, short).
    const m = v.gain(0);
    v.hold(perc(m.gain, t, 0.001, vel * 0.02, d * 0.35));
    v.osc('sine', f * 3.02, t, t + d * 0.4).connect(m).connect(v.out);
    v.burst({ type: 'bandpass', freq: Math.min(9000, f * 6), q: 2, peak: vel * 0.04, d: 0.02, at: t });
  }, o.pan ?? 0);
}

/**
 * Piano-like bell: slightly stretched harmonic partials with pitch-dependent decay, a unison-string
 * beat on the fundamental, a soft bell partial and a felt-hammer thump.
 */
export function pianoBell(out: MusicOut, t: number, f: number, vel: number, o: { wet?: number; pan?: number; decay?: number } = {}): void {
  note(out, t, o.wet ?? 0.8, (v) => {
    const d = o.decay ?? Math.max(2.5, Math.min(7, 6 - Math.log2(f / 220) * 1.3));
    const B = 0.0004;
    [1, 0.42, 0.2, 0.1, 0.05].forEach((a, i) => {
      const n = i + 1;
      const fr = f * n * Math.sqrt(1 + B * n * n);
      if (fr > v.ctx.sampleRate * 0.45) return;
      const g = v.gain(0);
      const e = perc(g.gain, t, 0.003, vel * 0.08 * a, d / (1 + 0.7 * i));
      v.osc('sine', fr, t, e).connect(g).connect(v.out);
      if (i === 0) {
        const tw = v.gain(0.45);
        v.osc('sine', fr + rand(0.25, 0.6), t, e).connect(tw).connect(g);
      }
      v.hold(e);
    });
    const bg = v.gain(0);
    v.hold(perc(bg.gain, t, 0.002, vel * 0.012, d * 0.3));
    v.osc('sine', f * 2.76, t, t + d * 0.35).connect(bg).connect(v.out);
    v.burst({ color: 'pink', type: 'lowpass', freq: 900, peak: vel * 0.03, d: 0.03, at: t });
  }, o.pan ?? 0);
}

/**
 * Great Bell (music): immense, detuned church-bell partials with slow beating, a downward drift
 * and a sub bloom an octave under the hum.
 */
export function greatBell(out: MusicOut, t: number, prime: number, vel: number,
  o: { wet?: number; pan?: number; decay?: number; drift?: number; far?: boolean } = {}): void {
  note(out, t, o.wet ?? 1.2, (v) => {
    let dest: AudioNode = v.out;
    if (o.far) {
      const lp = v.filter('lowpass', 900, 0.5);
      lp.connect(v.out);
      dest = lp;
    }
    bell(v, {
      prime, decay: o.decay ?? 14, gain: vel * 0.2, beat: 0.45, strike: 0.2, strikeHardness: 7, brightness: 0.7,
      detune: 0.012, drift: o.drift ?? 12, partials: CHURCH_PARTIALS, dest,
    });
    const sg = v.gain(0);
    v.hold(swell(sg.gain, t, 0.15, vel * 0.11, 0.5, 6));
    v.osc('sine', prime * 0.25, t).connect(sg).connect(dest);
  }, o.pan ?? 0);
}

/** Sub drone: a sine with a slowly beating twin and a soft octave — felt more than heard. */
export function subDrone(out: MusicOut, t: number, f: number, dur: number, vel: number,
  o: { attack?: number; release?: number; wet?: number; beat?: number } = {}): void {
  note(out, t, o.wet ?? 0.2, (v) => {
    const g = v.gain(0);
    v.hold(ar(g.gain, t, o.attack ?? 4, vel * 0.16, dur, o.release ?? 5));
    v.osc('sine', f, t).connect(g);
    const tw = v.gain(0.7);
    v.osc('sine', f + (o.beat ?? 0.33), t).connect(tw).connect(g);
    const oc = v.gain(0.18);
    v.osc('triangle', f * 2, t).connect(oc).connect(g);
    g.connect(v.out);
  });
}

/** Sea wash: a wave of filtered noise rising and receding, with a foam hiss at the break. */
export function wash(out: MusicOut, t: number, dur: number, vel: number, o: { pan?: number; cutoff?: number; wet?: number } = {}): void {
  note(out, t, o.wet ?? 0.7, (v) => {
    const c = o.cutoff ?? 1200;
    const rise = dur * 0.42;
    const src = v.noise('pink', t);
    const lp = v.filter('lowpass', c * 0.3, 0.6);
    lp.frequency.setValueAtTime(c * 0.3, t);
    lp.frequency.exponentialRampToValueAtTime(c, t + rise);
    lp.frequency.exponentialRampToValueAtTime(c * 0.25, t + dur);
    const g = v.gain(0);
    v.hold(swell(g.gain, t, rise, vel * 0.22, 0.2, dur - rise));
    src.connect(lp).connect(g).connect(v.out);
    v.burst({ type: 'bandpass', freq: 3000, q: 0.7, at: t + rise * 0.9, a: 0.3, peak: vel * 0.03, d: dur * 0.5 });
  }, o.pan ?? 0);
}

/** A gear ratchet: `n` clockwork ticks accelerating (or decelerating) over `dur`. */
export function ratchet(out: MusicOut, t: number, n: number, dur: number, vel: number, pitch = 1.2, accel = true): void {
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1);
    const x = accel ? 1 - Math.pow(1 - k, 1.7) : Math.pow(k, 1.7);
    mechanism(out, t + x * dur, vel * rand(0.7, 1), pitch * rand(0.97, 1.03));
  }
}

/** Heavy metal strike (anvil / vault plate) for the treasury's percussion. */
export function clang(out: MusicOut, t: number, f: number, vel: number, o: { wet?: number; pan?: number } = {}): void {
  note(out, t, o.wet ?? 0.5, (v) => {
    metal(v, { f, peak: vel * 0.12, decay: 0.9, at: t, bright: 0.75 });
    v.burst({ type: 'bandpass', freq: f * 3, q: 1.5, peak: vel * 0.08, d: 0.04, at: t });
  }, o.pan ?? 0);
}
