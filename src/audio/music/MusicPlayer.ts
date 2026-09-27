/**
 * MusicPlayer — owns the current score playback and crossfades between music states.
 * Each playback has its own dry/wet faders so old notes (and their reverb) fade together.
 */
import type { MusicState } from '../contract';
import type { NoiseBank } from '../engine/noise';
import { createScore } from './scores';
import { Sequencer } from './sequencer';

/**
 * Per-state output trims from the offline level check, so every state sits at a consistent
 * loudness (integrated RMS ≈ -24 dBFS for underscore, ≈ -20 for boss fights, sparse states lower).
 */
const STATE_GAIN: Partial<Record<Exclude<MusicState, 'none'>, number>> = {
  title: 0.75, intro: 0.67, ashbridge: 1.6, hospice: 0.84, boss1: 0.63, boss2: 0.56, victory: 0.73, battlefield: 0.59,
};

interface Playback {
  state: MusicState;
  seq: Sequencer;
  dry: GainNode;
  wet: GainNode;
  /** After this context time the faders are disconnected. */
  killAt: number;
}

export class MusicPlayer {
  private current: Playback | null = null;
  private readonly dying: Playback[] = [];
  private _state: MusicState = 'none';

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly bank: NoiseBank,
    private readonly dryIn: AudioNode,
    private readonly wetIn: AudioNode,
  ) {}

  get state(): MusicState { return this._state; }

  /** Change state with a crossfade of `fade` seconds (boss1 → boss2 uses a dramatic cut). */
  set(state: MusicState, fade: number): void {
    if (state === this._state) return;
    const now = this.ctx.currentTime;
    const prev = this._state;
    this._state = state;
    const phaseChange = prev === 'boss1' && state === 'boss2';
    const outFade = phaseChange ? 0.6 : Math.max(0.05, fade);

    if (this.current) {
      const c = this.current;
      for (const g of [c.dry.gain, c.wet.gain]) {
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.setTargetAtTime(0, now, outFade / 4);
      }
      // Keep the sequencer out of the pump; let tails ring, then release.
      c.killAt = now + outFade + 6;
      this.dying.push(c);
      this.current = null;
    }
    if (state === 'none') return;

    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    dry.connect(this.dryIn);
    wet.connect(this.wetIn);
    const inFade = phaseChange ? 0.02 : Math.max(0.05, fade * 0.6);
    const level = STATE_GAIN[state as Exclude<MusicState, 'none'>] ?? (state.startsWith('boss:') ? 0.6 : 0.8);
    for (const g of [dry.gain, wet.gain]) {
      g.setValueAtTime(0, now);
      g.linearRampToValueAtTime(level, now + inFade);
    }
    const score = createScore(state, { ctx: this.ctx, bank: this.bank, dry, wet }, prev);
    // Scores start slightly ahead so their first notes are scheduled, not late.
    const seq = new Sequencer(score, now + (phaseChange ? 0.05 : 0.15));
    this.current = { state, seq, dry, wet, killAt: Infinity };
  }

  /** Schedule notes up to `until`; release faded playbacks. */
  pump(now: number, until: number): void {
    this.current?.seq.pump(until);
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i]!;
      if (now >= d.killAt) {
        d.dry.disconnect();
        d.wet.disconnect();
        this.dying.splice(i, 1);
      }
    }
  }

  /** After a context suspension: skip missed steps rather than bursting them. */
  resync(now: number): void {
    this.current?.seq.resync(now);
  }
}
