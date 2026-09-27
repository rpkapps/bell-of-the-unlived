/**
 * Music instruments. Each call schedules ONE note/chord at an absolute AudioContext time as its
 * own self-cleaning Voice, routed to a score's dry and wet (music reverb) inputs.
 *
 * Core palette (used now): pad, choir, strings, brass, timpani, taiko, snare, bell, drone, swell.
 * Institution palette (for later regions — ready to use):
 *   Army      → taiko / snare / brass (martial percussion)
 *   Academy   → glass() (bowed glass, unresolved tones)
 *   Cathedral → choir() with several vowel layers
 *   Treasury  → mechanism() (clockwork ticks, ratchets in rhythm)
 *   Household → pluck() (distant court lute/harp) through a far lowpass
 */
import type { NoiseBank } from '../engine/noise';
import { perc, rand, sweep, Voice } from '../engine/Voice';
import { bell, SMALL_PARTIALS, CHURCH_PARTIALS } from '../synth/bells';
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
    for (const f of freqs) {
      for (let k = 0; k < 2; k++) {
        const s = v.osc('sawtooth', f, t);
        s.detune.value = k ? rand(4, 9) : rand(-9, -4);
        v.lfo(rand(4.6, 5.6), rand(8, 14), s.detune, 'sine', t + 0.3);
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
    for (const d of [-10, 0, 9]) {
      const s = v.osc('sawtooth', f, t);
      s.detune.value = d + rand(-2, 2);
      v.lfo(rand(5.2, 5.9), 7, s.detune, 'sine', t + 0.35);
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
    for (const d of [-6, 5]) {
      const s = v.osc('sawtooth', f, t);
      s.detune.setValueAtTime(d - 35, t);
      s.detune.linearRampToValueAtTime(d, t + 0.05);
      v.lfo(5.3, 5, s.detune, 'sine', t + 0.25);
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
    const src = v.noise('pink', t, t + dur + 0.1);
    const bp = v.filter('bandpass', 300, 0.9);
    sweep(bp.frequency, t, 300, 3500, dur);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.15, t + dur);
    g.gain.setTargetAtTime(0, t + dur, 0.03);
    src.connect(bp).connect(g).connect(v.out);
    if (f > 0) {
      const o = v.osc('sawtooth', f, t, t + dur + 0.1);
      const lp = v.filter('lowpass', 400, 1);
      sweep(lp.frequency, t, 300, 2500, dur);
      const og = v.gain(0);
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(vel * 0.04, t + dur);
      og.gain.setTargetAtTime(0, t + dur, 0.03);
      o.connect(lp).connect(og).connect(v.out);
    }
    v.hold(t + dur + 0.2);
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
    v.burst({ type: 'bandpass', freq: 3500 * pitch, q: 5, peak: vel * 0.3, d: 0.02 });
    v.tone({ freq: 1900 * pitch, peak: vel * 0.05, d: 0.06 });
    v.tone({ freq: 2870 * pitch, peak: vel * 0.03, d: 0.04 });
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
