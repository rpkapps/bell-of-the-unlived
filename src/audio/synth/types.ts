/** Shared types for cue synth functions. */
import type { Voice } from '../engine/Voice';

export type Surface = 'stone' | 'wood' | 'dirt' | 'metal' | 'water';

/** Per-play parameters handed to a synth. */
export interface SynthParams {
  /** Pitch/speed multiplier (PlayOpts.rate, default 1). */
  rate: number;
  /** Surface variant for footsteps / impacts. */
  surface: Surface;
  /** Stereo pan hint for 2D sounds (-1..1); the engine picks it for cues with `randomPan`. */
  pan: number;
}

/** A synth builds nodes on the voice, connects them to `v.out` and extends `v.end` via `v.hold`. */
export type Synth = (v: Voice, p: SynthParams) => void;
