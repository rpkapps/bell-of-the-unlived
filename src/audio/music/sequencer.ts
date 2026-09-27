/**
 * Lookahead step sequencer. The engine's ~25 ms timer calls `pump(horizon)`; every grid step
 * whose start time falls before `horizon` is handed to the score with its exact AudioContext time,
 * so timing is sample-accurate regardless of main-thread jitter ("A Tale of Two Clocks").
 */

export interface Score {
  /** Tempo in beats per minute (may change between steps). */
  readonly bpm: number;
  /** Grid resolution: 2 = eighth notes, 4 = sixteenths. */
  readonly stepsPerBeat: number;
  /** Schedule everything that starts on global step `i` at time `t`. */
  step(i: number, t: number): void;
}

export class Sequencer {
  private i = 0;
  private nextT: number;

  constructor(private readonly score: Score, start: number) {
    this.nextT = start;
  }

  /** Schedule all steps starting before `until`. */
  pump(until: number): void {
    // Guard against a stalled context racing through thousands of steps.
    let guard = 512;
    while (this.nextT < until && guard-- > 0) {
      this.score.step(this.i, this.nextT);
      this.nextT += 60 / this.score.bpm / this.score.stepsPerBeat;
      this.i++;
    }
  }

  /** Re-anchor after the context was suspended (skips missed steps instead of bursting them). */
  resync(now: number): void {
    if (this.nextT < now) {
      const dt = 60 / this.score.bpm / this.score.stepsPerBeat;
      const missed = Math.ceil((now - this.nextT) / dt);
      this.i += missed;
      this.nextT += missed * dt;
    }
  }
}

/** MIDI note number → Hz. */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Note name ("D4", "F#3", "Bb2") → MIDI number. */
export function nn(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
}
