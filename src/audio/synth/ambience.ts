/**
 * Ambience loops — continuous beds (noise through slowly wandering filters) plus sparse discrete
 * events (crackles, drips, far tolls, hammer strikes) scheduled by the engine's lookahead timer.
 *
 * Exploration ambience is deliberately sparse: wind, distant embers and an occasional far toll.
 */
import type { LoopCueId } from '../contract';
import type { NoiseBank } from '../engine/noise';
import { pick, rand, swell, Voice } from '../engine/Voice';
import { bell, tinyBell } from './bells';
import { metal } from './impacts';
import { formantVoice } from './voices';
import { creak, forgeHammer } from './world';

/** Internal bed layers that are not public LoopCueIds. */
export type InternalLoopId = 'far_tolls' | 'embers_far';
export type AnyLoopId = LoopCueId | InternalLoopId;

/** A running loop. `out` is dry, `wet` carries extra reverb-only signal. */
export interface LoopSynth {
  readonly out: GainNode;
  readonly wet: GainNode;
  /** Schedule discrete events whose start time falls in [from, to). */
  tick(from: number, to: number): void;
  /** Stop all sources at `at` and release the graph afterwards. */
  stop(at: number): void;
}

/** Base: owns a persistent "bed" voice and spawns short event voices. */
abstract class LoopBase implements LoopSynth {
  readonly out: GainNode;
  readonly wet: GainNode;
  protected readonly bed: Voice;
  private stopped = false;
  private readonly events = new Set<Voice>();
  /** Next scheduled time per event stream. */
  protected readonly next: Record<string, number> = {};

  constructor(protected readonly ctx: BaseAudioContext, protected readonly bank: NoiseBank) {
    this.bed = new Voice(ctx, bank, ctx.currentTime);
    this.out = this.bed.gain(1);
    this.wet = this.bed.gain(1);
  }

  tick(from: number, to: number): void {
    if (!this.stopped) this.events_(from, to);
  }

  /** Subclasses schedule events here. */
  protected events_(_from: number, _to: number): void { /* none by default */ }

  /**
   * Run event stream `key`: whenever its next time falls before `to`, call `fire(time)` and
   * schedule the following one `gap()` seconds later. The first one is `first()` after `from`.
   */
  protected stream(key: string, from: number, to: number, first: () => number, gap: () => number, fire: (t: number) => void): void {
    if (this.next[key] === undefined) this.next[key] = from + first();
    while (this.next[key]! < to) {
      const t = Math.max(this.next[key]!, from);
      fire(t);
      this.next[key] = t + gap();
    }
  }

  /** Create a one-shot event voice at `at`, routed to this loop (plus optional extra wet). */
  protected spawn(at: number, build: (v: Voice) => void, wet = 0): void {
    const v = new Voice(this.ctx, this.bank, at);
    build(v);
    v.out.gain.value = 1;
    v.out.connect(this.out);
    if (wet > 0) {
      const g = v.gain(wet);
      v.out.connect(g).connect(this.wet);
    }
    this.events.add(v);
    v.onFinished = () => this.events.delete(v);
    v.launch();
  }

  stop(at: number): void {
    if (this.stopped) return;
    this.stopped = true;
    this.bed.end = at;
    this.bed.launch();
    for (const e of this.events) if (e.end > at) e.kill(Math.max(0.02, at - this.ctx.currentTime));
  }
}

// ---------------------------------------------------------------------------------------------

/** Wind: a body of low air plus a thin whistle, both moved by slow random gusts. */
class Wind extends LoopBase {
  private readonly bodyGain: GainNode;
  private readonly bodyLP: BiquadFilterNode;
  private readonly whistle: BiquadFilterNode;
  private readonly whistleGain: GainNode;
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    this.bodyLP = b.filter('lowpass', 500, 0.6);
    this.bodyGain = b.gain(0.25);
    b.noiseStereo('pink').connect(this.bodyLP).connect(this.bodyGain).connect(this.out);
    const rumble = b.filter('lowpass', 90, 0.7);
    const rg = b.gain(0.5);
    b.noiseStereo('brown').connect(rumble).connect(rg).connect(this.out);
    this.whistle = b.filter('bandpass', 950, 6);
    this.whistleGain = b.gain(0.02);
    const wp = b.pan(0.3);
    b.lfo(0.05, 0.6, wp.pan);
    b.noise('white').connect(this.whistle).connect(this.whistleGain).connect(wp).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('gust', from, to, () => 0.5, () => rand(2.5, 6.5), (t) => {
      const strength = Math.pow(Math.random(), 1.5);
      const tc = rand(0.8, 2.2);
      this.bodyGain.gain.setTargetAtTime(0.14 + strength * 0.3, t, tc);
      this.bodyLP.frequency.setTargetAtTime(300 + strength * 900, t, tc);
      this.whistle.frequency.setTargetAtTime(rand(700, 1600), t, tc * 1.4);
      this.whistleGain.gain.setTargetAtTime(strength > 0.55 ? rand(0.015, 0.045) : rand(0, 0.012), t, tc);
    });
  }
}

/** Open fire: crackle + low roar + faint hiss. `scale` < 1 = brazier. */
class Fire extends LoopBase {
  private readonly roarGain: GainNode;
  constructor(ctx: BaseAudioContext, bank: NoiseBank, private readonly scale: number, soft: boolean) {
    super(ctx, bank);
    const b = this.bed;
    const hp = b.filter('highpass', soft ? 500 : 700, 0.7);
    const cg = b.gain(soft ? 0.35 : 0.55);
    b.noise(soft ? 'crackleSoft' : 'crackle', undefined, undefined, rand(0.9, 1.1)).connect(hp).connect(cg).connect(this.out);
    const lp = b.filter('lowpass', 320 * (soft ? 1.4 : 1), 0.8);
    this.roarGain = b.gain(0.3 * scale);
    b.noise('brown').connect(lp).connect(this.roarGain).connect(this.out);
    const hiss = b.filter('bandpass', 5200, 0.6);
    const hg = b.gain(0.012 * scale);
    b.noise('white').connect(hiss).connect(hg).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    // Flame "breathing": slow random roar swells.
    this.stream('breath', from, to, () => 0.2, () => rand(1, 3), (t) => {
      this.roarGain.gain.setTargetAtTime(rand(0.15, 0.4) * this.scale, t, rand(0.3, 0.9));
    });
    // Occasional loud pop.
    this.stream('pop', from, to, () => rand(1, 3), () => rand(1.5, 5), (t) => {
      this.spawn(t, (v) => v.burst({ type: 'highpass', freq: rand(1500, 3000), peak: rand(0.15, 0.35) * this.scale, d: 0.02 }));
    });
  }
}

/** Distant embers for outdoor beds: soft crackle far away. */
class EmbersFar extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 1600, 0.7);
    const hp = b.filter('highpass', 350, 0.7);
    const g = b.gain(0.35);
    b.noise('crackleSoft', undefined, undefined, 0.8).connect(hp).connect(lp).connect(g).connect(this.out);
  }
}

/** Interior room tone: low air, faint draughts, rare creaks. */
class Interior extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank, private readonly hospice: boolean) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 170, 0.7);
    const g = b.gain(hospice ? 0.35 : 0.5);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
    const draught = b.filter('bandpass', 520, 1.8);
    const dg = b.gain(0.02);
    b.lfo(0.07, 0.015, dg.gain);
    b.noiseStereo('pink').connect(draught).connect(dg).connect(this.out);
    if (hospice) {
      // Candles: very faint soft crackle.
      const cf = b.filter('highpass', 1200, 0.7);
      const cg = b.gain(0.05);
      b.noise('crackleSoft', undefined, undefined, 1.3).connect(cf).connect(cg).connect(this.out);
    }
  }
  protected override events_(from: number, to: number): void {
    this.stream('creak', from, to, () => rand(5, 14), () => rand(9, 24), (t) => {
      this.spawn(t, (v) => creak(v, { dur: rand(0.4, 0.9), rate0: rand(20, 35), rate1: rand(25, 45), res: [rand(350, 600), rand(900, 1400)], peak: rand(0.03, 0.07) }), 0.4);
    });
    if (this.hospice) {
      // A distant tiny bell, somewhere in the building.
      this.stream('bell', from, to, () => rand(6, 12), () => rand(16, 34), (t) => {
        this.spawn(t, (v) => {
          const lp = v.filter('lowpass', 2500, 0.5);
          lp.connect(v.out);
          bell(v, { prime: pick([880, 987.8, 1174.7, 1318.5]), decay: 3.5, gain: 0.03, beat: 1.2, strike: 0.15, maxRatio: 3, dest: lp });
        }, 1.2);
      });
    }
  }
}

/** Battlefield: vast distant murmur of massed voices, wind, far horns and shouts. */
class Battlefield extends LoopBase {
  private readonly formants: BiquadFilterNode[] = [];
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const src = b.noiseStereo('pink');
    const sum = b.gain(0.5);
    for (const [f, q, g] of [[520, 4, 1], [1250, 6, 0.5], [2500, 8, 0.25]] as const) {
      const bp = b.filter('bandpass', f, q);
      const gg = b.gain(g);
      src.connect(bp).connect(gg).connect(sum);
      this.formants.push(bp);
    }
    const lp = b.filter('lowpass', 1800, 0.5);
    sum.connect(lp).connect(this.out);
    const rum = b.filter('lowpass', 110, 0.7);
    const rg = b.gain(0.45);
    b.noiseStereo('brown').connect(rum).connect(rg).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('murmur', from, to, () => 0.1, () => rand(1.5, 4), (t) => {
      const vowel = pick([[520, 1250], [450, 850], [700, 1150], [380, 1900]] as const);
      this.formants[0]!.frequency.setTargetAtTime(vowel[0], t, 1.2);
      this.formants[1]!.frequency.setTargetAtTime(vowel[1], t, 1.2);
    });
    this.stream('horn', from, to, () => rand(8, 16), () => rand(22, 45), (t) => {
      this.spawn(t, (v) => {
        const f = pick([110, 123.5, 146.8]);
        const lp = v.filter('lowpass', 600, 0.7);
        const g = v.gain(0);
        v.hold(swell(g.gain, t, 0.9, 0.05, rand(1, 2), 1.5));
        for (const d of [-8, 0, 7]) {
          const o = v.osc('sawtooth', f, t);
          o.detune.value = d;
          o.connect(lp);
        }
        lp.connect(g).connect(v.out);
      }, 1.5);
    });
    this.stream('shout', from, to, () => rand(15, 30), () => rand(25, 60), (t) => {
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 900, 0.5);
        lp.connect(v.out);
        formantVoice(v, { f0: rand(120, 150), f0End: rand(100, 120), dur: 1.4, from: 'a', to: 'o', peak: 0.02, voices: 5, spread: 40, breath: 0.4, a: 0.3, dest: lp, at: t });
      }, 1.5);
    });
    this.stream('clank', from, to, () => rand(3, 8), () => rand(4, 12), (t) => {
      this.spawn(t, (v) => metal(v, { f: rand(700, 1400), peak: 0.012, decay: 0.4, at: t }), 1.5);
    });
  }
}

/** Undercroft: low hum, damp air and drips echoing. */
class Undercroft extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    for (const [f, a] of [[55, 0.05], [82.6, 0.02], [110.3, 0.012]] as const) {
      const g = b.gain(a);
      b.osc('sine', f).connect(g).connect(this.out);
      b.osc('sine', f + rand(0.15, 0.4)).connect(g);
    }
    const lp = b.filter('lowpass', 260, 0.7);
    const g = b.gain(0.3);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('drip', from, to, () => rand(0.3, 1.5), () => rand(0.7, 4.2), (t) => {
      this.spawn(t, (v) => {
        const f = rand(900, 2300);
        const pan = v.pan(rand(-0.8, 0.8));
        pan.connect(v.out);
        v.tone({ freq: f, bendTo: f * rand(1.5, 2.1), bendDur: 0.025, peak: rand(0.03, 0.08), d: 0.07, at: t, dest: pan });
        if (Math.random() < 0.3) v.tone({ freq: f * 1.1, bendTo: f * 2, bendDur: 0.02, peak: 0.02, d: 0.05, at: t + rand(0.12, 0.3), dest: pan });
      }, 1.4);
    });
  }
}

/** Stillbell hum: faint shimmer of the bell's partials breathing, with the odd sparkle. */
class StillbellHum extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const prime = 587.3;
    [[0.5, 0.02], [1, 0.03], [1.19, 0.018], [2, 0.022], [2.66, 0.01]].forEach(([r, a], i) => {
      const g = b.gain(a! * 0.6);
      b.lfo(rand(0.12, 0.35), a! * 0.4, g.gain, 'sine');
      b.osc('sine', prime * r!).connect(g).connect(this.out);
      if (i < 3) b.osc('sine', prime * r! + rand(0.3, 0.9)).connect(g);
    });
  }
  protected override events_(from: number, to: number): void {
    this.stream('spark', from, to, () => rand(2, 5), () => rand(5, 12), (t) => {
      this.spawn(t, (v) => tinyBell(v, pick([2349, 2637, 2960]), 0.012, t, 1.5), 0.8);
    });
  }
}

/** Fog wall hum: low detuned drone with an airy hiss. */
class FogHum extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 300, 2);
    b.lfo(0.09, 120, lp.frequency);
    const g = b.gain(0.08);
    for (const d of [-14, 0, 11]) {
      const o = b.osc('sawtooth', 73.4);
      o.detune.value = d;
      o.connect(lp);
    }
    lp.connect(g).connect(this.out);
    const s = b.gain(0.03);
    b.osc('sine', 146.8).connect(s).connect(this.out);
    const hiss = b.filter('bandpass', 2600, 3);
    const hg = b.gain(0.03);
    b.lfo(0.13, 0.025, hg.gain);
    b.noise('pink').connect(hiss).connect(hg).connect(this.out);
  }
}

/** Forge: fire, working bellows and a hammer every few seconds. */
class Forge extends Fire {
  private readonly bellowsBed: GainNode;
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank, 1, false);
    const b = this.bed;
    const bp = b.filter('bandpass', 700, 0.8);
    this.bellowsBed = b.gain(0);
    b.noise('pink').connect(bp).connect(this.bellowsBed).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    super.events_(from, to);
    this.stream('hammer', from, to, () => rand(0.5, 2), () => rand(3, 6), (t) => {
      const n = 2 + Math.floor(Math.random() * 3);
      const gap = rand(0.45, 0.6);
      for (let i = 0; i < n; i++) {
        this.spawn(t + i * gap, (v) => forgeHammer(v, { rate: rand(0.97, 1.03), surface: 'metal', pan: 0 }), 0.6);
      }
    });
    this.stream('bellows', from, to, () => rand(2, 4), () => rand(5, 9), (t) => {
      const p = this.bellowsBed.gain;
      p.setTargetAtTime(0.16, t, 0.25);
      p.setTargetAtTime(0, t + 0.9, 0.35);
    });
  }
}

/** Occasional far tolls (outdoor exploration). */
class FarTolls extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('toll', from, to, () => rand(18, 35), () => rand(45, 100), (t) => {
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 1100, 0.5);
        lp.connect(v.out);
        bell(v, { prime: rand(140, 175), decay: 9, gain: 0.05, beat: 0.6, strike: 0.1, detune: 0.01, drift: 10, dest: lp });
      }, 2);
    });
  }
}

/** Factory for every loop id. */
export function createLoop(id: AnyLoopId, ctx: BaseAudioContext, bank: NoiseBank): LoopSynth {
  switch (id) {
    case 'amb_wind': return new Wind(ctx, bank);
    case 'amb_fire': return new Fire(ctx, bank, 1, false);
    case 'brazier': return new Fire(ctx, bank, 0.55, true);
    case 'amb_interior': return new Interior(ctx, bank, false);
    case 'amb_hospice': return new Interior(ctx, bank, true);
    case 'amb_battlefield': return new Battlefield(ctx, bank);
    case 'amb_undercroft': return new Undercroft(ctx, bank);
    case 'stillbell_hum': return new StillbellHum(ctx, bank);
    case 'fog_hum': return new FogHum(ctx, bank);
    case 'forge': return new Forge(ctx, bank);
    case 'far_tolls': return new FarTolls(ctx, bank);
    case 'embers_far': return new EmbersFar(ctx, bank);
  }
}

/** Per-loop defaults: output trim, reverb send, and 3D distance behaviour. */
export const LOOP_DEFS: Record<AnyLoopId, { gain: number; wet: number; ref: number; rolloff: number }> = {
  amb_wind: { gain: 0.34, wet: 0.05, ref: 8, rolloff: 1 },
  amb_fire: { gain: 0.72, wet: 0.15, ref: 2, rolloff: 1.2 },
  brazier: { gain: 1, wet: 0.2, ref: 1.5, rolloff: 1.2 },
  amb_interior: { gain: 0.22, wet: 0.1, ref: 6, rolloff: 1 },
  amb_hospice: { gain: 0.28, wet: 0.1, ref: 6, rolloff: 1 },
  amb_battlefield: { gain: 0.39, wet: 0.25, ref: 20, rolloff: 1 },
  amb_undercroft: { gain: 0.3, wet: 0.2, ref: 6, rolloff: 1 },
  stillbell_hum: { gain: 0.7, wet: 0.35, ref: 1.5, rolloff: 1.3 },
  fog_hum: { gain: 0.45, wet: 0.2, ref: 3, rolloff: 1.2 },
  forge: { gain: 0.48, wet: 0.2, ref: 3, rolloff: 1.2 },
  far_tolls: { gain: 1, wet: 0, ref: 10, rolloff: 1 },
  embers_far: { gain: 1, wet: 0.2, ref: 6, rolloff: 1 },
};
