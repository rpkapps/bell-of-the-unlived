/**
 * Voice — a tiny builder for one synthesised sound event.
 *
 * A synth function receives a Voice, creates oscillators / noise / filters through it (so every
 * node is tracked), shapes them with the envelope helpers below and connects its final nodes to
 * `voice.out`. `launch()` then schedules all sources to stop at `voice.end`; when the last source
 * has ended every node is disconnected, so finished sounds never leak graph nodes.
 */
import type { NoiseBank, NoiseColor } from './noise';

// ---------------------------------------------------------------------------------------------
// Small random helpers (audio variation deliberately uses Math.random: never machine-gun identical)
// ---------------------------------------------------------------------------------------------

/** Uniform random in [a, b). */
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
/** x varied by ±pct (0.05 = ±5 %). */
export const vary = (x: number, pct: number): number => x * (1 + (Math.random() * 2 - 1) * pct);
/** Random element. */
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
/** Semitones → frequency ratio. */
export const semi = (n: number): number => Math.pow(2, n / 12);
/** Decibels → linear gain. */
export const db = (d: number): number => Math.pow(10, d / 20);

// ---------------------------------------------------------------------------------------------
// Envelope helpers. All are click-free: they start from 0 and end at (effectively) 0.
// ---------------------------------------------------------------------------------------------

/** ln(1000): time constants per "decay to -60 dB". */
const T60 = 6.9;

/**
 * Percussive envelope: 0 → `peak` linearly in `a` seconds, then exponential decay reaching -60 dB
 * after `d` seconds. Returns the time the envelope is inaudible.
 */
export function perc(p: AudioParam, t: number, a: number, peak: number, d: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + Math.max(0.0005, a));
  p.setTargetAtTime(0, t + a, Math.max(0.001, d / T60));
  return t + a + d;
}

/**
 * Swell envelope: linear attack to `peak`, hold, exponential release (to -60 dB in `r`).
 * Returns end time.
 */
export function swell(p: AudioParam, t: number, a: number, peak: number, hold: number, r: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + Math.max(0.001, a));
  p.setValueAtTime(peak, t + a + hold);
  p.setTargetAtTime(0, t + a + hold, Math.max(0.001, r / T60));
  return t + a + hold + r;
}

/** Exponential sweep of a frequency-like param from `from` to `to` over `dur`. */
export function sweep(p: AudioParam, t: number, from: number, to: number, dur: number): void {
  p.setValueAtTime(Math.max(0.0001, from), t);
  p.exponentialRampToValueAtTime(Math.max(0.0001, to), t + Math.max(0.001, dur));
}

// ---------------------------------------------------------------------------------------------

interface TrackedSource { node: AudioScheduledSourceNode; start: number; stop?: number }

export class Voice {
  /** Voice output (dry). The engine connects this to a panner / bus and the reverb send. */
  readonly out: GainNode;
  /** Latest time any part of this voice is audible. Synths extend it via `hold()`. */
  end: number;
  /** Set by the engine: called once after all nodes are disconnected. */
  onFinished: (() => void) | null = null;
  /** Engine bookkeeping for voice stealing. */
  priority = 1;

  private readonly nodes: AudioNode[] = [];
  private readonly sources: TrackedSource[] = [];
  private pending = 0;
  private launched = false;
  private finished = false;

  constructor(readonly ctx: BaseAudioContext, readonly bank: NoiseBank, readonly t: number) {
    this.out = ctx.createGain();
    this.nodes.push(this.out);
    this.end = t + 0.05;
  }

  /** Track an externally created node so it gets disconnected at the end. */
  track<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  /** Extend the voice lifetime to at least `until`. */
  hold(until: number): void {
    if (until > this.end) this.end = until;
  }

  gain(value = 0): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return this.track(g);
  }

  filter(type: BiquadFilterType, freq: number, q = 0.707, gainDb = 0): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = Math.min(freq, this.ctx.sampleRate * 0.45);
    f.Q.value = q;
    f.gain.value = gainDb;
    return this.track(f);
  }

  pan(value: number): StereoPannerNode {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, value));
    return this.track(p);
  }

  /** Soft-clip distortion. */
  shaper(drive: number): WaveShaperNode {
    const w = this.ctx.createWaveShaper();
    w.curve = this.bank.curve(drive);
    w.oversample = '2x';
    return this.track(w);
  }

  delay(time: number, max = 1): DelayNode {
    const d = this.ctx.createDelay(max);
    d.delayTime.value = time;
    return this.track(d);
  }

  /** Oscillator started at `start` (default voice start); stops at `stop` or voice end. */
  osc(type: OscillatorType, freq: number, start = this.t, stop?: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    this.addSource(o, start, stop);
    return o;
  }

  /** Looping noise source with a random read offset (so repeats never sound identical). */
  noise(color: NoiseColor = 'white', start = this.t, stop?: number, rate = 1): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.bank.get(color);
    s.loop = true;
    s.playbackRate.value = rate;
    this.addSource(s, start, stop, Math.random() * (s.buffer.duration - 0.1));
    return s;
  }

  /** Looping stereo noise bed (decorrelated channels) — for ambience. */
  noiseStereo(color: NoiseColor = 'pink', start = this.t, stop?: number, rate = 1): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.bank.getStereo(color);
    s.loop = true;
    s.playbackRate.value = rate;
    this.addSource(s, start, stop, Math.random() * (s.buffer.duration - 0.1));
    return s;
  }

  /** Constant source (useful as a modulation offset). */
  constant(value: number, start = this.t, stop?: number): ConstantSourceNode {
    const c = this.ctx.createConstantSource();
    c.offset.value = value;
    this.addSource(c, start, stop);
    return c;
  }

  /** Unconnected modulator (oscillator → depth gain); connect the result to any number of params. */
  modulator(freq: number, depth: number, type: OscillatorType = 'sine', start = this.t): GainNode {
    const o = this.osc(type, freq, start);
    const g = this.gain(depth);
    o.connect(g);
    return g;
  }

  /** LFO: oscillator → depth gain → target param. Returns the depth gain for further automation. */
  lfo(freq: number, depth: number, target: AudioParam, type: OscillatorType = 'sine', start = this.t): GainNode {
    const g = this.modulator(freq, depth, type, start);
    g.connect(target);
    return g;
  }

  /**
   * Convenience: a noise burst through a filter with a percussive envelope, connected to `dest`
   * (default `out`). Returns the end time.
   */
  burst(opts: {
    color?: NoiseColor; type?: BiquadFilterType; freq: number; q?: number; at?: number;
    a?: number; peak: number; d: number; dest?: AudioNode; rate?: number;
    sweepTo?: number; sweepDur?: number;
  }): number {
    const at = opts.at ?? this.t;
    const a = opts.a ?? 0.001;
    const src = this.noise(opts.color ?? 'white', at, at + a + opts.d + 0.02, opts.rate ?? 1);
    const f = this.filter(opts.type ?? 'bandpass', opts.freq, opts.q ?? 1);
    if (opts.sweepTo !== undefined) sweep(f.frequency, at, opts.freq, opts.sweepTo, opts.sweepDur ?? opts.d);
    const g = this.gain(0);
    const end = perc(g.gain, at, a, opts.peak, opts.d);
    src.connect(f).connect(g).connect(opts.dest ?? this.out);
    this.hold(end);
    return end;
  }

  /**
   * Convenience: a sine/other partial with a percussive envelope. Returns the oscillator (so the
   * caller can bend its pitch) — the end time is folded into `end`.
   */
  tone(opts: {
    type?: OscillatorType; freq: number; at?: number; a?: number; peak: number; d: number;
    dest?: AudioNode; bendTo?: number; bendDur?: number; detune?: number;
  }): OscillatorNode {
    const at = opts.at ?? this.t;
    const a = opts.a ?? 0.002;
    const o = this.osc(opts.type ?? 'sine', opts.freq, at, at + a + opts.d + 0.02);
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.bendTo !== undefined) sweep(o.frequency, at, opts.freq, opts.bendTo, opts.bendDur ?? opts.d);
    const g = this.gain(0);
    this.hold(perc(g.gain, at, a, opts.peak, opts.d));
    o.connect(g).connect(opts.dest ?? this.out);
    return o;
  }

  private addSource(node: AudioScheduledSourceNode, start: number, stop?: number, offset?: number): void {
    this.track(node);
    const s = Math.max(start, 0);
    if (node instanceof AudioBufferSourceNode) node.start(s, offset ?? 0);
    else node.start(s);
    this.sources.push({ node, start: s, stop });
    if (this.launched) this.armSource(this.sources[this.sources.length - 1]!);
  }

  private armSource(src: TrackedSource): void {
    const stopAt = Math.max(src.start + 0.005, src.stop ?? this.end) + 0.02;
    this.pending++;
    src.node.onended = () => {
      this.pending--;
      if (this.pending <= 0) this.cleanup();
    };
    src.node.stop(stopAt);
  }

  /** Schedule all stops; after this the voice cleans itself up. */
  launch(): void {
    if (this.launched) return;
    this.launched = true;
    if (this.sources.length === 0) {
      this.cleanup();
      return;
    }
    for (const s of this.sources) this.armSource(s);
  }

  /** Fade out and stop early (voice stealing / loop stop). Click-free. */
  kill(fade = 0.04): void {
    if (this.finished) return;
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
    const stopAt = now + fade + 0.01;
    if (!this.launched) this.launch();
    for (const s of this.sources) {
      if ((s.stop ?? this.end) > stopAt) {
        try { s.node.stop(Math.max(stopAt, s.start + 0.005)); } catch { /* already stopped */ }
      }
    }
    this.end = Math.min(this.end, stopAt);
  }

  get isFinished(): boolean { return this.finished; }

  private cleanup(): void {
    if (this.finished) return;
    this.finished = true;
    for (const n of this.nodes) {
      try { n.disconnect(); } catch { /* ignore */ }
    }
    this.nodes.length = 0;
    this.sources.length = 0;
    this.onFinished?.();
  }
}
