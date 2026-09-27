/**
 * Ambience loops — continuous beds (noise through slowly wandering filters) plus sparse discrete
 * events (crackles, drips, far tolls, hammer strikes) scheduled by the engine's lookahead timer.
 *
 * Exploration ambience is deliberately sparse: wind, distant embers and an occasional far toll.
 * Region beds (Phase 2) are at the end of the file.
 */
import type { LoopCueId } from '../contract';
import type { NoiseBank } from '../engine/noise';
import { pick, rand, swell, Voice } from '../engine/Voice';
import { bell, CHURCH_PARTIALS, tinyBell } from './bells';
import { metal, thump } from './impacts';
import { formantVoice } from './voices';
import { creak, forgeHammer, links } from './world';

/** Internal bed layers that are not public LoopCueIds. */
export type InternalLoopId = 'far_tolls' | 'embers_far'
  // Phase 2 region beds
  | 'snow_wind' | 'siege_timber' | 'surf' | 'gulls' | 'nave_tone' | 'chant_far' | 'vault_tone' | 'machinery'
  | 'leaves' | 'fountain' | 'birds' | 'court_far' | 'bell_hum' | 'high_wind';
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

/** Wind character (defaults = the Ashbridge exploration wind). */
interface WindOpts {
  body?: number; rumble?: number; whistle?: number; bright?: number;
  /** Fine broadband hiss riding the gusts (snow). */
  hiss?: number;
  /** Granular ice ticks riding the gusts (snow). */
  ice?: number;
  gustMin?: number; gustMax?: number;
}

/** Wind: a body of low air plus a thin whistle, both moved by slow random gusts. */
class Wind extends LoopBase {
  private readonly bodyGain: GainNode;
  private readonly bodyLP: BiquadFilterNode;
  private readonly whistle: BiquadFilterNode;
  private readonly whistleGain: GainNode;
  private readonly hissGain: GainNode | null = null;
  private readonly iceGain: GainNode | null = null;
  constructor(ctx: BaseAudioContext, bank: NoiseBank, private readonly o: WindOpts = {}) {
    super(ctx, bank);
    const b = this.bed;
    this.bodyLP = b.filter('lowpass', 500, 0.6);
    this.bodyGain = b.gain(0.25 * (o.body ?? 1));
    b.noiseStereo('pink').connect(this.bodyLP).connect(this.bodyGain).connect(this.out);
    const rumble = b.filter('lowpass', 90, 0.7);
    const rg = b.gain(0.5 * (o.rumble ?? 1));
    b.noiseStereo('brown').connect(rumble).connect(rg).connect(this.out);
    this.whistle = b.filter('bandpass', 950, 6);
    this.whistleGain = b.gain(0.02 * (o.whistle ?? 1));
    const wp = b.pan(0.3);
    b.lfo(0.05, 0.6, wp.pan);
    b.noise('white').connect(this.whistle).connect(this.whistleGain).connect(wp).connect(this.out);
    if (o.hiss) {
      const hp = b.filter('highpass', 5500, 0.7);
      this.hissGain = b.gain(o.hiss * 0.3);
      b.noiseStereo('white').connect(hp).connect(this.hissGain).connect(this.out);
    }
    if (o.ice) {
      // Wind-driven ice crystals: a dense soft crackle, very high, brightened.
      const hp = b.filter('highpass', 4800, 0.8);
      this.iceGain = b.gain(o.ice * 0.3);
      b.noise('crackleSoft', undefined, undefined, 1.7).connect(hp).connect(this.iceGain).connect(this.out);
    }
  }
  protected override events_(from: number, to: number): void {
    const o = this.o;
    this.stream('gust', from, to, () => 0.5, () => rand(o.gustMin ?? 2.5, o.gustMax ?? 6.5), (t) => {
      const strength = Math.pow(Math.random(), 1.5);
      const tc = rand(0.8, 2.2);
      const bright = o.bright ?? 1;
      this.bodyGain.gain.setTargetAtTime((0.14 + strength * 0.3) * (o.body ?? 1), t, tc);
      this.bodyLP.frequency.setTargetAtTime((300 + strength * 900) * bright, t, tc);
      this.whistle.frequency.setTargetAtTime(rand(700, 1600) * bright, t, tc * 1.4);
      this.whistleGain.gain.setTargetAtTime((strength > 0.55 ? rand(0.015, 0.045) : rand(0, 0.012)) * (o.whistle ?? 1), t, tc);
      this.hissGain?.gain.setTargetAtTime((o.hiss ?? 0) * (0.15 + strength * 0.85), t, tc * 0.7);
      this.iceGain?.gain.setTargetAtTime((o.ice ?? 0) * (0.1 + strength * 0.9), t, tc * 0.6);
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
    case 'snow_wind': return new Wind(ctx, bank, { body: 1.05, whistle: 1.4, bright: 1.15, hiss: 0.02, ice: 0.25 });
    case 'high_wind': return new Wind(ctx, bank, { body: 1.2, rumble: 0.45, whistle: 2.4, bright: 1.3, hiss: 0.008, gustMin: 1.8, gustMax: 5 });
    case 'siege_timber': return new SiegeTimber(ctx, bank);
    case 'surf': return new Surf(ctx, bank);
    case 'gulls': return new Gulls(ctx, bank);
    case 'nave_tone': return new NaveTone(ctx, bank);
    case 'chant_far': return new ChantFar(ctx, bank);
    case 'vault_tone': return new VaultTone(ctx, bank);
    case 'machinery': return new Machinery(ctx, bank);
    case 'leaves': return new Leaves(ctx, bank);
    case 'fountain': return new Fountain(ctx, bank);
    case 'birds': return new Birds(ctx, bank);
    case 'court_far': return new CourtFar(ctx, bank);
    case 'bell_hum': return new BellHum(ctx, bank);
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
  snow_wind: { gain: 0.34, wet: 0.05, ref: 8, rolloff: 1 },
  high_wind: { gain: 0.3, wet: 0.08, ref: 8, rolloff: 1 },
  siege_timber: { gain: 1, wet: 0.3, ref: 8, rolloff: 1 },
  surf: { gain: 0.43, wet: 0.15, ref: 12, rolloff: 1 },
  gulls: { gain: 2.5, wet: 0.2, ref: 12, rolloff: 1 },
  nave_tone: { gain: 0.25, wet: 0.6, ref: 10, rolloff: 1 },
  chant_far: { gain: 1.5, wet: 0.5, ref: 15, rolloff: 1 },
  vault_tone: { gain: 0.35, wet: 0.35, ref: 6, rolloff: 1 },
  machinery: { gain: 0.8, wet: 0.35, ref: 12, rolloff: 1 },
  leaves: { gain: 1, wet: 0.05, ref: 6, rolloff: 1 },
  fountain: { gain: 7, wet: 0.15, ref: 4, rolloff: 1.1 },
  birds: { gain: 4, wet: 0.3, ref: 10, rolloff: 1 },
  court_far: { gain: 4, wet: 0.4, ref: 20, rolloff: 1 },
  bell_hum: { gain: 0.6, wet: 0.3, ref: 6, rolloff: 1 },
};

// =============================================================================================
// Region beds (Phase 2)
// =============================================================================================

/** Siegeholm: heavy siege timber creaking in the cold, rope strain, a distant ram or trebuchet. */
class SiegeTimber extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('beam', from, to, () => rand(2, 6), () => rand(6, 15), (t) => {
      const pan = rand(-0.8, 0.8);
      const pair = Math.random() < 0.4;
      this.spawn(t, (v) => {
        const p = v.pan(pan);
        p.connect(v.out);
        creak(v, { dur: rand(0.9, 2), rate0: rand(9, 15), rate1: rand(12, 22), res: [rand(130, 180), rand(330, 450), rand(760, 950)], peak: rand(0.05, 0.09), q: 9, dest: p });
        // Strain released: a second, shorter groan.
        if (pair) creak(v, { dur: rand(0.5, 1), rate0: rand(18, 26), rate1: rand(10, 16), res: [rand(160, 220), rand(420, 520)], peak: rand(0.03, 0.05), at: v.t + rand(1.8, 2.8), q: 9, dest: p });
        if (Math.random() < 0.35) {
          // Rope strain: thin, high, squeezed.
          const r = v.osc('sawtooth', rand(55, 80), v.t + 0.3, v.t + 1.6);
          const bp = v.filter('bandpass', rand(1200, 1700), 14);
          const g = v.gain(0);
          v.hold(swell(g.gain, v.t + 0.3, 0.4, 0.02, 0.3, 0.5));
          r.connect(bp).connect(g).connect(p);
        }
      }, 0.5);
    });
    this.stream('impact', from, to, () => rand(12, 30), () => rand(25, 60), (t) => {
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 380, 0.6);
        lp.connect(v.out);
        thump(v, 58, 0.09, 1.1, t, lp);
        v.burst({ color: 'brown', type: 'lowpass', freq: 240, at: t, a: 0.02, peak: 0.12, d: 1.8, dest: lp });
        // Timber and stone settling after the blow.
        if (Math.random() < 0.6) v.burst({ color: 'pink', type: 'bandpass', freq: 500, q: 0.8, at: t + rand(0.4, 0.8), a: 0.1, peak: 0.02, d: 1.2, dest: lp });
      }, 2);
    });
  }
}

/** Sea cliffs: a distant sea roar, waves rising, breaking and drawing back over shingle. */
class Surf extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 320, 0.6);
    const g = b.gain(0.28);
    b.lfo(0.04, 0.08, g.gain);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
    const air = b.filter('bandpass', 900, 0.6);
    const ag = b.gain(0.012);
    b.noiseStereo('pink').connect(air).connect(ag).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('wave', from, to, () => rand(0.3, 2), () => rand(5.5, 10.5), (t) => {
      const big = Math.random();
      const rise = rand(2.2, 3.6);
      const peak = 0.07 + big * 0.1;
      const pan = rand(-0.5, 0.5);
      this.spawn(t, (v) => {
        const p = v.pan(pan);
        p.connect(v.out);
        const src = v.noise('pink', t);
        const lp = v.filter('lowpass', 250, 0.6);
        lp.frequency.setValueAtTime(250, t);
        lp.frequency.exponentialRampToValueAtTime(900 + big * 1400, t + rise);
        lp.frequency.exponentialRampToValueAtTime(300, t + rise + 4);
        const g = v.gain(0);
        v.hold(swell(g.gain, t, rise, peak, 0.25, 4.5));
        src.connect(lp).connect(g).connect(p);
        // The break: foam hiss.
        v.burst({ type: 'bandpass', freq: 2600, q: 0.5, at: t + rise - 0.15, a: 0.25, peak: peak * 0.3, d: 3, dest: p, sweepTo: 1400, sweepDur: 3 });
        // The backwash: shingle and foam drawing back.
        v.burst({ type: 'highpass', freq: 4500, at: t + rise + 1.2, a: 0.8, peak: peak * 0.1, d: 2.5, dest: p });
      }, 0.4);
    });
  }
}

/** Gull-like cries far along the cliffs: a rising yelp falling away, warbling, 1–3 at a time. */
class Gulls extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('cry', from, to, () => rand(4, 12), () => rand(10, 30), (t) => {
      const n = pick([1, 2, 2, 3]);
      const pan = rand(-0.85, 0.85);
      const base = rand(900, 1300);
      this.spawn(t, (v) => {
        const p = v.pan(pan);
        const lp = v.filter('lowpass', 2800, 0.5);
        lp.connect(p).connect(v.out);
        let tt = t;
        for (let i = 0; i < n; i++) {
          const dur = rand(0.35, 0.6);
          const f = base * rand(0.95, 1.05);
          const o = v.osc('triangle', f, tt, tt + dur + 0.05);
          o.frequency.setValueAtTime(f * 0.85, tt);
          o.frequency.linearRampToValueAtTime(f * 1.25, tt + 0.07);
          o.frequency.exponentialRampToValueAtTime(f * 0.62, tt + dur);
          v.modulator(rand(18, 26), f * 0.03, 'sine', tt).connect(o.frequency);
          const bp = v.filter('bandpass', f * 1.8, 1.4);
          const g = v.gain(0);
          g.gain.setValueAtTime(0, tt);
          g.gain.linearRampToValueAtTime(0.05, tt + 0.04);
          g.gain.setTargetAtTime(0, tt + dur * 0.6, dur * 0.15);
          const raw = v.gain(0.4);
          o.connect(bp).connect(g);
          o.connect(raw).connect(g);
          g.connect(lp);
          tt += dur + rand(0.15, 0.4);
        }
        v.hold(tt + 0.3);
      }, 1.4);
    });
  }
}

/** Cathedral nave: vast stone room tone — low air, a slow draught, far footfalls and doors. */
class NaveTone extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 140, 0.7);
    const g = b.gain(0.45);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
    const air = b.filter('bandpass', 380, 1.2);
    const ag = b.gain(0.02);
    b.lfo(0.045, 0.012, ag.gain);
    b.noiseStereo('pink').connect(air).connect(ag).connect(this.out);
    const hi = b.filter('bandpass', 3200, 0.8);
    const hg = b.gain(0.003);
    b.noiseStereo('pink').connect(hi).connect(hg).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('far', from, to, () => rand(8, 20), () => rand(18, 45), (t) => {
      const door = Math.random() < 0.4;
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', door ? 300 : 900, 0.6);
        const p = v.pan(rand(-0.7, 0.7));
        lp.connect(p).connect(v.out);
        if (door) {
          thump(v, 62, 0.07, 1.2, t, lp);
          v.burst({ color: 'brown', type: 'lowpass', freq: 200, at: t, peak: 0.08, d: 1.4, dest: lp });
        } else {
          // A few slow footfalls far down the nave.
          const n = 3 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) v.burst({ color: 'pink', type: 'bandpass', freq: rand(450, 700), q: 1.2, at: t + i * rand(0.75, 0.9), peak: 0.035, d: 0.08, dest: lp });
        }
      }, 2.5);
    });
  }
}

/** Distant chant: a few plainchant notes (G Dorian) sung somewhere in the building. */
class ChantFar extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('chant', from, to, () => rand(3, 10), () => rand(20, 42), (t) => {
      const n = 4 + Math.floor(Math.random() * 4);
      const root = pick([98, 110]);
      const scale = [0, 2, 3, 5, 7, 9, 10];
      const vowels = ['a', 'o', 'e', 'u', 'a'] as const;
      const second = Math.random() < 0.4;
      const pan = rand(-0.6, 0.6);
      this.spawn(t, (v) => {
        const p = v.pan(pan);
        const lp = v.filter('lowpass', 800, 0.5);
        lp.connect(p).connect(v.out);
        let d = pick([0, 2, 4]);
        let tt = t;
        for (let i = 0; i < n; i++) {
          const last = i === n - 1;
          if (last) d = 0;
          const dur = last ? rand(2, 2.8) : rand(0.9, 1.6);
          const f = root * Math.pow(2, (scale[((d % 7) + 7) % 7]! + 12 * Math.floor(d / 7)) / 12);
          const from = vowels[i % vowels.length]!;
          const to = vowels[(i + 1) % vowels.length]!;
          formantVoice(v, { f0: f, dur: dur + 0.15, from, to, peak: 0.02, voices: 3, spread: 14, breath: 0.25, a: 0.25, dest: lp, at: tt, vibrato: 6 });
          if (second) formantVoice(v, { f0: f * 0.667, dur: dur + 0.15, from, to, peak: 0.013, voices: 2, spread: 10, breath: 0.2, a: 0.3, dest: lp, at: tt, size: 0.9 });
          tt += dur;
          d = Math.max(0, Math.min(6, d + pick([-1, -1, 1, 1, 0, 2, -2])));
        }
      }, 2.2);
    });
  }
}

/** Treasury vaults: cold low air, a faint singing of steel, drips onto metal, the vault settling. */
class VaultTone extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const lp = b.filter('lowpass', 160, 0.7);
    const g = b.gain(0.35);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
    // Sympathetic resonance of plates and bars: inharmonic sines breathing in and out.
    [[1, 0.006], [2.41, 0.004], [3.83, 0.003], [5.1, 0.002]].forEach(([r, a], i) => {
      const pg = b.gain(a! * 0.6);
      b.lfo(rand(0.03, 0.09), a! * 0.5, pg.gain);
      b.osc('sine', 146 * r!).connect(pg).connect(this.out);
      if (i < 2) b.osc('sine', 146 * r! + rand(0.2, 0.5)).connect(pg);
    });
  }
  protected override events_(from: number, to: number): void {
    this.stream('drip', from, to, () => rand(0.3, 1.5), () => rand(0.9, 4.5), (t) => {
      this.spawn(t, (v) => {
        const f = rand(900, 2300);
        const pan = v.pan(rand(-0.8, 0.8));
        pan.connect(v.out);
        v.tone({ freq: f, bendTo: f * rand(1.5, 2.1), bendDur: 0.025, peak: rand(0.025, 0.06), d: 0.07, at: t, dest: pan });
        if (Math.random() < 0.35) metal(v, { f: rand(1700, 3400), peak: 0.012, decay: 0.9, at: t, dest: pan, ratios: [1, 2.76, 5.4], bright: 0.5 });
      }, 1.3);
    });
    this.stream('groan', from, to, () => rand(10, 25), () => rand(25, 55), (t) => {
      this.spawn(t, (v) => creak(v, { dur: rand(1.2, 2.4), rate0: rand(7, 11), rate1: rand(5, 9), res: [rand(200, 260), rand(520, 640), rand(1250, 1500)], peak: 0.025, q: 22 }), 1.2);
    });
    this.stream('coins', from, to, () => rand(20, 50), () => rand(40, 90), (t) => {
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 5000, 0.5);
        lp.connect(v.out);
        links(v, 6 + Math.floor(Math.random() * 8), 0.8, t, 0.015);
      }, 1.2);
    });
  }
}

/** Distant machinery: now and then a gear train runs for a while — rumble, rhythmic clanks — then stops. */
class Machinery extends LoopBase {
  private runStart = 0;
  private runUntil = 0;
  private period = 1.2;
  protected override events_(from: number, to: number): void {
    this.stream('run', from, to, () => rand(2, 8), () => rand(22, 45), (t) => {
      const len = rand(9, 20);
      this.runStart = t + 1.5;
      this.runUntil = t + len - 1.5;
      this.period = rand(0.8, 1.5);
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 110, 0.7);
        const g = v.gain(0);
        v.hold(swell(g.gain, t, 2, 0.16, len - 4, 3));
        v.noise('brown', t).connect(lp).connect(g).connect(v.out);
        const hum = v.gain(0);
        swell(hum.gain, t, 2.5, 0.02, len - 4.5, 3);
        v.osc('sine', rand(44, 52), t).connect(hum).connect(v.out);
      }, 0.6);
    });
    this.stream('clank', from, to, () => 0.2, () => this.period * rand(0.97, 1.03), (t) => {
      if (t < this.runStart || t > this.runUntil) return;
      this.spawn(t, (v) => {
        const lp = v.filter('lowpass', 900, 0.6);
        lp.connect(v.out);
        thump(v, 70, 0.07, 0.3, t, lp);
        metal(v, { f: rand(300, 420), peak: 0.03, decay: 0.5, at: t, dest: lp, bright: 0.6 });
        if (Math.random() < 0.5) for (let i = 0; i < 4; i++) v.burst({ type: 'bandpass', freq: 2400, q: 4, at: t + this.period * 0.5 + i * 0.045, peak: 0.02, d: 0.015, dest: lp });
      }, 1.5);
    });
  }
}

/** Autumn garden: dry leaves stirred by the wind, now and then one skittering across the stones. */
class Leaves extends LoopBase {
  private readonly rustle: GainNode;
  private readonly air: GainNode;
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const bp = b.filter('bandpass', 3800, 0.7);
    this.rustle = b.gain(0.08);
    b.noiseStereo('crackleSoft').connect(bp).connect(this.rustle).connect(this.out);
    const ab = b.filter('bandpass', 1200, 0.5);
    this.air = b.gain(0.036);
    b.noiseStereo('pink').connect(ab).connect(this.air).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('gust', from, to, () => 0.3, () => rand(3, 7), (t) => {
      const s = Math.pow(Math.random(), 1.4);
      this.rustle.gain.setTargetAtTime(0.04 + s * 0.24, t, rand(0.6, 1.5));
      this.air.gain.setTargetAtTime(0.018 + s * 0.09, t, rand(0.8, 1.8));
    });
    this.stream('skitter', from, to, () => rand(3, 9), () => rand(6, 18), (t) => {
      const n = 6 + Math.floor(Math.random() * 9);
      const len = rand(0.8, 1.6);
      const p0 = rand(-0.8, 0.8);
      this.spawn(t, (v) => {
        const p = v.pan(p0);
        p.pan.setValueAtTime(p0, t);
        p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, p0 + rand(-0.6, 0.6))), t + len);
        p.connect(v.out);
        for (let i = 0; i < n; i++) {
          const k = i / n;
          v.burst({ type: 'highpass', freq: rand(2800, 5000), at: t + k * len + rand(0, 0.04), peak: rand(0.02, 0.05) * (1 - k * 0.5), d: rand(0.008, 0.02), dest: p });
        }
      }, 0.2);
    });
  }
}

/** Fountain: a trickle burbling into a basin, the odd bubble. */
class Fountain extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const pan = b.pan(0.25);
    pan.connect(this.out);
    const bp = b.filter('bandpass', 1600, 0.8);
    const g = b.gain(0.03);
    b.noise('pink').connect(bp).connect(g).connect(pan);
    // Burble: the trickle's level modulated at audio rate by a soft crackle.
    const mod = b.gain(0.05);
    b.noise('crackleSoft', undefined, undefined, 1.4).connect(mod).connect(g.gain);
    const sp = b.filter('bandpass', 3500, 1.5);
    const sg = b.gain(0.008);
    b.noise('white').connect(sp).connect(sg).connect(pan);
  }
  protected override events_(from: number, to: number): void {
    this.stream('bubble', from, to, () => 0.2, () => rand(0.35, 1.1), (t) => {
      this.spawn(t, (v) => {
        const p = v.pan(rand(0, 0.5));
        p.connect(v.out);
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const f = rand(500, 1400);
          v.tone({ freq: f, bendTo: f * rand(1.4, 1.8), bendDur: 0.03, peak: rand(0.008, 0.02), d: 0.045, at: t + rand(0, 0.15), dest: p });
        }
      }, 0.2);
    });
  }
}

/** Sparse autumn birds: a few chirps, a two-note whistle or a short trill, far off. */
class Birds extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('call', from, to, () => rand(4, 12), () => rand(9, 26), (t) => {
      const kind = pick(['chirps', 'chirps', 'whistle', 'trill'] as const);
      this.spawn(t, (v) => {
        const p = v.pan(rand(-0.9, 0.9));
        const lp = v.filter('lowpass', 5200, 0.5);
        lp.connect(p).connect(v.out);
        if (kind === 'chirps') {
          const n = 3 + Math.floor(Math.random() * 4);
          const f = rand(3000, 4500);
          let tt = t;
          for (let i = 0; i < n; i++) {
            v.tone({ freq: f * rand(0.97, 1.05), bendTo: f * 0.7, bendDur: 0.06, peak: rand(0.01, 0.018), d: 0.07, at: tt, dest: lp });
            tt += rand(0.1, 0.2);
          }
        } else if (kind === 'whistle') {
          const f = rand(2200, 2700);
          for (const [k, r] of [[0, 1], [1, 0.8]] as const) {
            const o = v.tone({ freq: f * r, peak: 0.014, d: 0.35, a: 0.05, at: t + k * 0.32, dest: lp });
            v.lfo(7, f * 0.01, o.frequency, 'sine', t + k * 0.32);
          }
        } else {
          const o = v.tone({ freq: rand(3200, 3800), peak: 0.012, d: 0.6, a: 0.05, at: t, dest: lp });
          v.lfo(rand(22, 28), 350, o.frequency, 'square', t);
        }
      }, 1);
    });
  }
}

/** Far court music: a few phrases of the pavane on a lute, somewhere beyond the hedges. */
const COURT_PHRASES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 392], [2, 466.2], [3, 440], [4, 349.2], [6, 440], [7, 523.3]],
  [[0, 587.3], [2, 523.3], [3, 466.2], [4, 523.3], [5.5, 466.2], [6, 440], [7, 392]],
  [[0, 587.3], [2, 698.5], [3, 587.3], [4, 523.3], [6, 440], [7, 523.3]],
  [[0, 392], [2, 466.2], [3, 622.3], [4, 622.3], [6, 587.3], [7, 523.3]],
];
class CourtFar extends LoopBase {
  protected override events_(from: number, to: number): void {
    this.stream('phrase', from, to, () => rand(8, 25), () => rand(35, 80), (t) => {
      const ph = pick(COURT_PHRASES);
      const beat = 60 / 70;
      const pan = rand(-0.8, 0.8);
      const detune = rand(-0.012, 0.004);
      this.spawn(t, (v) => {
        const p = v.pan(pan);
        const lp = v.filter('lowpass', 1100, 0.5);
        lp.connect(p).connect(v.out);
        for (const [b, f0] of ph) {
          if (Math.random() < 0.15) continue; // lost on the wind
          const at = t + b * beat + rand(-0.02, 0.02);
          const f = f0 * (1 + detune);
          const flp = v.filter('lowpass', f * 6, 0.7);
          sweepDown(flp.frequency, at, f * 9, f * 1.5, 0.5);
          const g = v.gain(0);
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(0.02, at + 0.004);
          g.gain.setTargetAtTime(0, at + 0.004, 0.25);
          v.osc('sawtooth', f, at, at + 1.6).connect(flp);
          flp.connect(g).connect(lp);
        }
        v.hold(t + 8 * beat + 1.8);
      }, 2);
    });
  }
}
function sweepDown(p: AudioParam, t: number, from: number, to: number, dur: number): void {
  p.setValueAtTime(from, t);
  p.exponentialRampToValueAtTime(to, t + dur);
}

/** Belfry: the Great Bell never quite stops humming; the yoke creaks. */
class BellHum extends LoopBase {
  constructor(ctx: BaseAudioContext, bank: NoiseBank) {
    super(ctx, bank);
    const b = this.bed;
    const hum = 55;
    // The bell's own partials (hum, prime, tierce, quint, nominal…) breathing with slow beats.
    CHURCH_PARTIALS.slice(0, 7).forEach(([r, a], i) => {
      const amp = a * 0.03 / (1 + i * 0.5);
      const pg = b.gain(amp * 0.6);
      b.lfo(rand(0.03, 0.08), amp * 0.45, pg.gain);
      b.osc('sine', hum * 2 * r).connect(pg).connect(this.out);
      if (i < 4) b.osc('sine', hum * 2 * r + rand(0.25, 0.6)).connect(pg);
    });
    const lp = b.filter('lowpass', 70, 0.7);
    const g = b.gain(0.25);
    b.noiseStereo('brown').connect(lp).connect(g).connect(this.out);
  }
  protected override events_(from: number, to: number): void {
    this.stream('yoke', from, to, () => rand(5, 15), () => rand(18, 40), (t) => {
      this.spawn(t, (v) => creak(v, { dur: rand(1.5, 3), rate0: rand(7, 10), rate1: rand(9, 13), res: [rand(110, 140), rand(290, 340), rand(650, 760)], peak: 0.045, q: 12 }), 1);
    });
    this.stream('chain', from, to, () => rand(15, 30), () => rand(35, 70), (t) => {
      this.spawn(t, (v) => links(v, 5 + Math.floor(Math.random() * 6), 1, t, 0.02), 1.2);
    });
  }
}
