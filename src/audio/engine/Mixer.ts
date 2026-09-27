/**
 * Mixer — the fixed bus graph.
 *
 *   music ─ musicVerb ┐
 *   music ────────────┴→ musicDuck → musicMenu ───────────────────────┐
 *   sfx, combat, voice, ambience ─┐                                    │
 *   (each bus has a wet send) → worldVerb ─┴→ world → muffleLP → muffleGain ─┤
 *   ui ─────────────────────────────────────────────────────────────────────┤
 *                                                  master → stereo|mono → compressor → limiter → out
 *
 * Every volume change is ramped (setTargetAtTime), so nothing ever clicks.
 */
import { impulseResponse } from '../synth/reverb';

export type BusId = 'music' | 'sfx' | 'combat' | 'voice' | 'ambience' | 'ui';

/** One bus: `input` receives dry signal, `wet` feeds the reverb (post bus-volume). */
export interface Bus {
  readonly input: GainNode;
  readonly wet: GainNode;
}

/** Smooth time constant for volume changes (s). */
const TC = 0.06;

export class Mixer {
  readonly buses: Record<BusId, Bus>;
  /** Dry input for music scores (post-state faders connect here). */
  readonly musicIn: GainNode;
  /** Wet input for music (music reverb). */
  readonly musicWetIn: GainNode;

  private readonly master: GainNode;
  private readonly stereoPath: GainNode;
  private readonly monoPath: GainNode;
  private readonly musicDuck: GainNode;
  private readonly musicMenu: GainNode;
  private readonly ambDuck: GainNode;
  private readonly muffleLP: BiquadFilterNode;
  private readonly muffleGain: GainNode;
  private duckRelease = 0;

  constructor(readonly ctx: BaseAudioContext, opts: { bypassDynamics?: boolean } = {}) {
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };

    // ---- master section ----
    this.master = g(0.9);
    this.stereoPath = g(1);
    this.monoPath = g(0);
    this.monoPath.channelCount = 1;
    this.monoPath.channelCountMode = 'explicit';
    this.monoPath.channelInterpretation = 'speakers';
    this.master.connect(this.stereoPath);
    this.master.connect(this.monoPath);

    const sum = g(1);
    this.stereoPath.connect(sum);
    this.monoPath.connect(sum);
    if (opts.bypassDynamics) {
      sum.connect(ctx.destination);
    } else {
      // Gentle glue compression then a brick-wall-ish limiter.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3;
      comp.attack.value = 0.006; comp.release.value = 0.25;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20;
      lim.attack.value = 0.001; lim.release.value = 0.12;
      const makeup = g(1.15);
      sum.connect(comp).connect(makeup).connect(lim).connect(ctx.destination);
    }

    // ---- world group with menu muffle ----
    const world = g(1);
    this.muffleLP = ctx.createBiquadFilter();
    this.muffleLP.type = 'lowpass';
    this.muffleLP.frequency.value = 20000;
    this.muffleLP.Q.value = 0.5;
    this.muffleGain = g(1);
    world.connect(this.muffleLP).connect(this.muffleGain).connect(this.master);

    const worldVerbIn = g(1);
    const worldVerb = ctx.createConvolver();
    worldVerb.normalize = false;
    worldVerb.buffer = impulseResponse(ctx, 'world');
    const worldVerbRet = g(1);
    worldVerbIn.connect(worldVerb).connect(worldVerbRet).connect(world);

    // ---- music group ----
    this.musicIn = g(1);
    this.musicWetIn = g(1);
    const musicBus = g(1);
    const musicWet = g(1);
    const musicVerb = ctx.createConvolver();
    musicVerb.normalize = false;
    musicVerb.buffer = impulseResponse(ctx, 'music');
    this.musicDuck = g(1);
    this.musicMenu = g(1);
    this.musicIn.connect(musicBus);
    // Wet path gets the music volume once (on musicWet), then joins after the dry bus gain.
    this.musicWetIn.connect(musicWet).connect(musicVerb).connect(this.musicDuck);
    musicBus.connect(this.musicDuck).connect(this.musicMenu).connect(this.master);

    // ---- world buses ----
    const mk = (dest: AudioNode, verbDest: AudioNode | null): Bus => {
      const input = g(1);
      const wet = g(1);
      input.connect(dest);
      if (verbDest) wet.connect(verbDest);
      return { input, wet };
    };
    this.ambDuck = g(1);
    this.ambDuck.connect(world);
    const uiBus = mk(this.master, null);
    this.buses = {
      music: { input: musicBus, wet: musicWet },
      sfx: mk(world, worldVerbIn),
      combat: mk(world, worldVerbIn),
      voice: mk(world, worldVerbIn),
      ambience: mk(this.ambDuck, worldVerbIn),
      ui: uiBus,
    };
    // UI "wet" is a light touch of the world verb that bypasses the menu muffle.
    const uiVerb = ctx.createConvolver();
    uiVerb.normalize = false;
    uiVerb.buffer = impulseResponse(ctx, 'world');
    uiBus.wet.connect(uiVerb).connect(this.master);
  }

  /** Apply user volumes (0..1 each). SFX volume drives both sfx and combat buses. */
  setVolumes(v: { master: number; music: number; sfx: number; ambience: number; voice: number; ui: number; mono: boolean }): void {
    const now = this.ctx.currentTime;
    const set = (p: AudioParam, x: number) => p.setTargetAtTime(Math.max(0, Math.min(2, x)), now, TC);
    // Perceptual taper: squared slider gives a more even loudness curve.
    const taper = (x: number) => x * x;
    set(this.master.gain, taper(v.master));
    const bus = (id: BusId, x: number) => { set(this.buses[id].input.gain, taper(x)); set(this.buses[id].wet.gain, taper(x)); };
    bus('music', v.music);
    bus('sfx', v.sfx);
    bus('combat', v.sfx);
    bus('ambience', v.ambience);
    bus('voice', v.voice);
    bus('ui', v.ui);
    set(this.stereoPath.gain, v.mono ? 0 : 1);
    set(this.monoPath.gain, v.mono ? 1 : 0);
  }

  /**
   * Sidechain-like duck: pull music down by `depthDb` (and ambience by half that) for `hold`
   * seconds, then release smoothly. Overlapping ducks extend the hold rather than stacking.
   */
  duck(depthDb: number, hold: number): void {
    const now = this.ctx.currentTime;
    const target = Math.pow(10, -Math.abs(depthDb) / 20);
    const ambTarget = Math.pow(10, -Math.abs(depthDb) / 40);
    const release = Math.max(this.duckRelease, now + hold);
    this.duckRelease = release;
    for (const [p, v] of [[this.musicDuck.gain, target], [this.ambDuck.gain, ambTarget]] as const) {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.setTargetAtTime(Math.min(p.value, v), now, 0.012);
      p.setTargetAtTime(1, release, 0.22);
    }
  }

  /** Pause-menu muffle: lowpass + duck world audio, soften music. */
  setMenuMuffle(on: boolean): void {
    const now = this.ctx.currentTime;
    const tc = on ? 0.12 : 0.2;
    this.muffleLP.frequency.cancelScheduledValues(now);
    this.muffleLP.frequency.setTargetAtTime(on ? 650 : 20000, now, tc);
    this.muffleGain.gain.setTargetAtTime(on ? 0.45 : 1, now, tc);
    this.musicMenu.gain.setTargetAtTime(on ? 0.6 : 1, now, tc);
  }
}
