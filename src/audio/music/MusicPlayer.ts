/**
 * MusicPlayer — owns the current score playback and crossfades between music states.
 * Each playback has its own dry/wet faders so old notes (and their reverb) fade together.
 */
import type { MusicState } from '../contract';
import type { NoiseBank } from '../engine/noise';
import { BOSS_REGION, isPhaseChange, parseBossState, type BossRegion } from './bosses';
import { createScore } from './scores';
import { Sequencer } from './sequencer';

type FixedState = Exclude<MusicState, 'none' | `boss:${string}:${number}`>;

/**
 * Per-state output trims from the offline level check, so every state sits at a consistent
 * loudness (integrated RMS ≈ -24…-26 dBFS for underscore and boss fights alike, sparse
 * exploration states lower — their silences are part of the music).
 */
const STATE_GAIN: Record<FixedState, number> = {
  title: 0.75, intro: 0.67, ashbridge: 1.6, hospice: 0.84, boss1: 0.63, boss2: 0.56, victory: 0.73, battlefield: 0.59,
  army: 0.81, academy: 0.86, cathedral: 0.91, treasury: 1.5, household: 2.45, belfry: 0.83, ending: 1.6,
};

/**
 * Procedural boss trims per phase (1..3), from the offline level check: phase 1 ≈ -24.5 dBFS,
 * phase 2 ≈ -24, phase 3 ≈ -23.5 integrated RMS (Corvane's boss1/boss2 measure -24.4 / -23.9).
 * Unknown ids use their institution's default.
 */
const BOSS_GAIN: Record<BossRegion, readonly [number, number, number]> = {
  army: [0.665, 0.63, 0.59], academy: [0.6, 0.49, 0.5], cathedral: [0.62, 0.53, 0.525], treasury: [0.72, 0.66, 0.59],
  household: [0.82, 0.65, 0.61], belfry: [0.6, 0.51, 0.58], secret: [0.59, 0.56, 0.51],
};
const BOSS_ID_GAIN: Readonly<Record<string, readonly [number, number, number]>> = {
  varr: [0.673, 0.631, 0.589], oderic: [0.658, 0.631, 0.589],
  orrow: [0.535, 0.457, 0.485], experiment9: [0.673, 0.531, 0.525],
  vessaline: [0.636, 0.563, 0.537], procession: [0.6, 0.496, 0.513],
  aurelmask: [0.73, 0.669, 0.603], mimicsovereign: [0.713, 0.646, 0.583],
  celwyn: [0.838, 0.653, 0.61], twinheirs: [0.809, 0.646, 0.617],
  aldren: [0.6, 0.513, 0.576], bellkeeper: [0.586, 0.556, 0.507],
};

/** Output level for a state. */
export function stateGain(state: Exclude<MusicState, 'none'>): number {
  const b = parseBossState(state);
  if (b && state.startsWith('boss:')) {
    if (b.id === 'corvane') return b.phase <= 1 ? STATE_GAIN.boss1 : STATE_GAIN.boss2;
    const g = BOSS_ID_GAIN[b.id] ?? BOSS_GAIN[BOSS_REGION[b.id] ?? 'army'];
    return g[b.phase - 1]!;
  }
  return STATE_GAIN[state as FixedState] ?? 0.8;
}

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

  /** Change state with a crossfade of `fade` seconds (a boss phase change uses a dramatic cut). */
  set(state: MusicState, fade: number): void {
    if (state === this._state) return;
    const now = this.ctx.currentTime;
    const prev = this._state;
    this._state = state;
    // boss1 → boss2, boss:<id>:1 → boss:<id>:2 → …:3: cut hard into the next phase's stinger.
    const phaseChange = isPhaseChange(prev, state);
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
    const level = stateGain(state);
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
