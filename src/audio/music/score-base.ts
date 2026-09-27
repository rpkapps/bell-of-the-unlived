/**
 * Shared score scaffolding: the grid-based BaseScore, melodic line helpers, modes and a seeded RNG
 * (boss leitmotifs are derived deterministically from the boss id).
 */
import type { Score } from './sequencer';
import type { MusicOut } from './instruments';

/** [start beat within phrase, semitone offset (or scale degree) from phrase root, length in beats]. */
export type Line = ReadonlyArray<readonly [number, number, number]>;

/** Notes of `line` that start exactly on phrase step `s` (grid = stepsPerBeat). */
export function notesAt(line: Line, s: number, spb: number): Array<readonly [number, number]> {
  const res: Array<readonly [number, number]> = [];
  for (const [b, n, len] of line) if (Math.round(b * spb) === s) res.push([n, len]);
  return res;
}

/** Triad (root, third, fifth) in MIDI from a root and quality. */
export function triad(root: number, minor: boolean): number[] {
  return [root, root + (minor ? 3 : 4), root + 7];
}

export abstract class BaseScore implements Score {
  abstract bpm: number;
  abstract readonly stepsPerBeat: number;
  readonly beatsPerBar: number = 4;
  constructor(protected readonly out: MusicOut) {}

  /** Seconds per beat. */
  protected get spb(): number { return 60 / this.bpm; }
  protected get stepsPerBar(): number { return this.stepsPerBeat * this.beatsPerBar; }
  /** Seconds for n beats. */
  protected b(n: number): number { return n * this.spb; }

  step(i: number, t: number): void {
    const bar = Math.floor(i / this.stepsPerBar);
    this.onStep(bar, i % this.stepsPerBar, t);
  }
  protected abstract onStep(bar: number, s: number, t: number): void;
}

// ---------------------------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------------------------

export const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
} as const satisfies Record<string, readonly number[]>;
export type ModeName = keyof typeof MODES;

/** Scale degree (any integer; 7 = octave) → semitones above the tonic. */
export function deg(mode: readonly number[], d: number): number {
  const n = mode.length;
  const oct = Math.floor(d / n);
  return mode[((d % n) + n) % n]! + 12 * oct;
}

/** Diatonic triad on degree `d` (semitones above the tonic). */
export function degTriad(mode: readonly number[], d: number): number[] {
  return [deg(mode, d), deg(mode, d + 2), deg(mode, d + 4)];
}

// ---------------------------------------------------------------------------------------------
// Seeded randomness (deterministic leitmotifs)
// ---------------------------------------------------------------------------------------------

/** FNV-1a string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG with helpers. */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  int(a: number, b: number): number { return Math.floor(this.range(a, b + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]!; }
  chance(p: number): boolean { return this.next() < p; }
}

/** Weighted pick (Math.random) avoiding `avoid` when possible. */
export function weighted<T extends string>(w: Readonly<Record<T, number>>, avoid?: T): T {
  const keys = (Object.keys(w) as T[]).filter((k) => k !== avoid && w[k] > 0);
  const total = keys.reduce((a, k) => a + w[k], 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return keys[keys.length - 1]!;
}
