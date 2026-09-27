/**
 * Scores — one class per MusicState. Every score is generative: a fixed harmonic/melodic skeleton
 * with per-loop variations (orchestration, octave, density, fills), so it stays listenable for
 * many minutes and loops seamlessly (the grid never stops; the next pass just continues).
 *
 * Keys: the kingdom is in D minor. The Commander's leitmotif (8 notes, D minor):
 *   D  A  Bb A  G | F  E  D
 * At the phase change it is answered by a COMPETING version a major third up in F# Phrygian
 * (F# C# D C# B | A G F#), layered against the original: two claims on the same melody.
 *
 * Region exploration themes live in regions.ts; procedural boss themes (`boss:<id>:<phase>`) in
 * bosses.ts. Corvane keeps the hand-written boss1/boss2 below.
 */
import type { MusicState } from '../contract';
import { pick, rand } from '../engine/Voice';
import {
  brass, choir, drone, mbell, pad, pluck, riser, snare, snareRoll, strings, taiko, timpani, timpaniRoll,
  type MusicOut,
} from './instruments';
import { mtof, nn, type Score } from './sequencer';
import { BaseScore, notesAt, triad, type Line } from './score-base';
import { bossScore, parseBossState } from './bosses';
import { regionScore } from './regions';

/** The Commander's leitmotif (2 bars of 4/4), relative to D. */
const LEITMOTIF: Line = [[0, 0, 1], [1, 7, 1], [2, 8, 0.5], [2.5, 7, 0.5], [3, 5, 1], [4, 3, 1], [5, 2, 1], [6, 0, 2]];
/** Answer phrase: half cadence onto the dominant. */
const LEITMOTIF_ANSWER: Line = [[0, 0, 1], [1, 7, 1], [2, 8, 0.5], [2.5, 7, 0.5], [3, 5, 1], [4, 3, 1], [5, 2, 1], [6, -1, 1], [7, -5, 1]];
/** Competing version: same contour, Phrygian inflection (b2) — sung by a rival key. */
const COMPETING: Line = [[0, 0, 1], [1, 7, 1], [2, 8, 0.5], [2.5, 7, 0.5], [3, 5, 1], [4, 3, 1], [5, 1, 1], [6, 0, 2]];
/** Major transfiguration for the victory. */
const LEITMOTIF_MAJOR: Line = [[0, 0, 2], [2, 7, 2], [4, 9, 1], [5, 7, 1], [6, 5, 2], [8, 4, 2], [10, 2, 2], [12, 0, 4]];

// =============================================================================================
// TITLE — slow, sparse, dignified and sorrowful: low strings, pad, choir, a bell motif.
// =============================================================================================
class TitleScore extends BaseScore {
  readonly bpm = 54;
  readonly stepsPerBeat = 2;
  /** [bass, chord] for the 8-bar phrase: i – VI – III – VII – iv – i6 – V(sus) – i. */
  private readonly prog: ReadonlyArray<readonly [number, readonly number[]]> = [
    [nn('D2'), [50, 53, 57, 62]],
    [nn('Bb1'), [50, 53, 58]],
    [nn('F2'), [48, 53, 57]],
    [nn('C2'), [48, 52, 55, 60]],
    [nn('G1'), [50, 55, 58]],
    [nn('F2'), [50, 53, 57]],
    [nn('A1'), [50, 52, 57]],
    [nn('D2'), [50, 53, 57, 62]],
  ];

  protected onStep(bar: number, s: number, t: number): void {
    const pass = Math.floor(bar / 8);
    const k = bar % 8;
    const [bass, chord] = this.prog[k]!;
    const barDur = this.b(4);
    const variant = pass === 0 ? 0 : 1 + ((pass - 1) % 3);
    if (s === 0) {
      pad(this.out, t, chord.map(mtof), barDur + 0.4, variant === 3 ? 0.6 : 0.85, { attack: 1.6, release: 3, cutoff: 800 });
      strings(this.out, t, mtof(bass + 12), barDur + 0.2, 0.75, { attack: 0.9, release: 1.8, bright: 0.6 });
      if (k === 0 || k === 4) drone(this.out, t, mtof(bass), this.b(16), 0.5, { attack: 3, release: 4 });
      if (variant >= 1 && variant !== 3 && k % 2 === 0) {
        choir(this.out, t + 0.2, chord.map((m) => mtof(m + 12)), this.b(8), 0.55, { vowel: 'o', to: pass % 2 ? 'a' : 'u', attack: 2, release: 3 });
      }
      if (variant === 2 && k === 6) timpaniRoll(this.out, t, mtof(nn('A1')), this.b(4), 0.1, 0.5);
    }
    // Bell motif: A F E D (bar 0), Bb A G A (bar 4) — question & answer.
    const motifA: Line = [[0, nn('A4'), 1.5], [1.5, nn('F4'), 0.5], [2, nn('E4'), 1], [3, nn('D4'), 1]];
    const motifB: Line = [[0, nn('Bb4'), 1.5], [1.5, nn('A4'), 0.5], [2, nn('G4'), 1], [3, nn('A4'), 1]];
    const motif = k === 0 ? motifA : k === 4 ? motifB : k === 7 && variant === 2 ? motifA : null;
    if (motif) {
      for (const [m, len] of notesAt(motif, s, this.stepsPerBeat)) {
        if (variant === 3) {
          strings(this.out, t, mtof(m), this.b(len) + 0.2, 0.55, { attack: 0.35, bright: 0.8, wet: 0.8 });
        } else {
          const up = variant === 2 ? 12 : 0;
          mbell(this.out, t, mtof(m + up), variant === 2 ? 0.55 : 0.8, { decay: 6, wet: 1 });
        }
      }
    }
  }
}

// =============================================================================================
// INTRO — memory cinematic underscore: drones, suspended clusters, a heartbeat, far bells.
// =============================================================================================
class IntroScore extends BaseScore {
  readonly bpm = 48;
  readonly stepsPerBeat = 2;
  private readonly clusters: readonly (readonly number[])[] = [
    [50, 52, 57], [46, 50, 53, 57], [48, 53, 55, 60], [45, 49, 52, 57],
  ];
  protected onStep(bar: number, s: number, t: number): void {
    const pass = Math.floor(bar / 8);
    const k = bar % 8;
    if (s === 0) {
      if (k === 0) {
        drone(this.out, t, mtof(nn('D2')), this.b(34), 0.7, { attack: 5, release: 6 });
        drone(this.out, t, mtof(nn('A2')), this.b(34), 0.35, { attack: 7, release: 6 });
      }
      if (k % 2 === 0) {
        const c = this.clusters[(k / 2) % 4]!;
        pad(this.out, t, c.map(mtof), this.b(8), 0.75, { attack: 3, release: 4, cutoff: 700 + pass * 50 });
      }
      if (k >= 4 && pass % 2 === 0) {
        strings(this.out, t, mtof(nn('A4')), this.b(4), 0.25, { attack: 2, release: 2, bright: 0.4, wet: 1 });
      }
      if (pass >= 1) {
        timpani(this.out, t, mtof(nn('D2')), 0.22, { decay: 0.8 });
        timpani(this.out, t + 0.32, mtof(nn('D2')), 0.15, { decay: 0.8 });
      }
      if (k === 3 || (k === 7 && pass % 2 === 1)) mbell(this.out, t, mtof(nn('D3')), 0.6, { church: true, decay: 9, far: true, wet: 1.2 });
    }
    if (k === 7 && s === 5 && pass % 2 === 0) riser(this.out, t, this.b(1.5), 0.6, mtof(nn('A2')));
  }
}

// =============================================================================================
// ASHBRIDGE — very sparse: mostly silence, occasional pad swells and a distant bell.
// =============================================================================================
class AshbridgeScore extends BaseScore {
  readonly bpm = 60;
  readonly stepsPerBeat = 1;
  private padCool = 0;
  private bellCool = 4;
  private readonly chords: readonly (readonly number[])[] = [
    [50, 57, 64], [50, 53, 58], [50, 55, 58], [48, 53, 57], [45, 52, 57], [43, 50, 57],
  ];
  protected onStep(bar: number, s: number, t: number): void {
    if (s !== 0) return;
    this.padCool--;
    this.bellCool--;
    if (bar === 1 || (this.padCool <= 0 && Math.random() < 0.3)) {
      const c = pick(this.chords);
      pad(this.out, t, c.map(mtof), this.b(6), 0.55, { attack: 4.5, release: 6, cutoff: 650 });
      if (Math.random() < 0.35) strings(this.out, t + this.b(1), mtof(c[0]! - 12), this.b(6), 0.4, { attack: 3, release: 4, bright: 0.5 });
      this.padCool = Math.floor(rand(5, 10));
    }
    if (this.bellCool <= 0 && Math.random() < 0.12) {
      mbell(this.out, t + rand(0, 1), mtof(pick([nn('D3'), nn('A2')])), 0.55, { church: true, decay: 10, far: true, wet: 1.4, pan: rand(-0.5, 0.5) });
      this.bellCool = Math.floor(rand(10, 17));
    }
    if (Math.random() < 0.05) strings(this.out, t, mtof(pick([nn('A4'), nn('D5'), nn('F4')])), this.b(5), 0.22, { attack: 2.5, release: 3, bright: 0.45, wet: 1.1 });
  }
}

// =============================================================================================
// HOSPICE — gentle, restorative: soft drone, warm pad in D major, stillbell-like bells.
// =============================================================================================
class HospiceScore extends BaseScore {
  readonly bpm = 66;
  readonly stepsPerBeat = 2;
  private readonly prog: readonly (readonly number[])[] = [
    [50, 54, 57, 62], [50, 55, 59, 62], [50, 52, 55, 59], [50, 54, 57, 61],
    [47, 50, 54, 59], [43, 50, 55, 59], [45, 50, 52, 57], [50, 54, 57, 62],
  ];
  private bellSteps: number[] = [];
  private bellNotes: number[] = [];
  protected onStep(bar: number, s: number, t: number): void {
    const pass = Math.floor(bar / 8);
    const k = bar % 8;
    const chord = this.prog[k]!;
    if (s === 0) {
      if (k === 0) {
        drone(this.out, t, mtof(nn('D2')), this.b(34), 0.55, { attack: 4, release: 5 });
        drone(this.out, t, mtof(nn('A2')), this.b(34), 0.25, { attack: 5, release: 5 });
      }
      pad(this.out, t, chord.map(mtof), this.b(4) + 0.5, 0.6, { attack: 2, release: 3, cutoff: 650 });
      if (pass >= 1 && k % 4 === 0) choir(this.out, t, chord.slice(1).map((m) => mtof(m + 12)), this.b(16), 0.35, { vowel: 'u', attack: 3, release: 4 });
      // Choose this bar's bell figure: 2–3 chord tones in octave 5 on 8th-note positions.
      const n = pass === 0 && k < 2 ? 1 : 2 + (Math.random() < 0.4 ? 1 : 0);
      const slots = [0, 2, 3, 4, 5, 6];
      this.bellSteps = [];
      while (this.bellSteps.length < n) {
        const x = pick(slots);
        if (!this.bellSteps.includes(x)) this.bellSteps.push(x);
      }
      this.bellNotes = this.bellSteps.map(() => pick(chord) + 24 - (Math.random() < 0.3 ? 12 : 0));
    }
    const idx = this.bellSteps.indexOf(s);
    if (idx >= 0) {
      const m = this.bellNotes[idx]!;
      if (pass % 3 === 2) pluck(this.out, t, mtof(m - 12), 0.5, { far: true });
      else mbell(this.out, t, mtof(m), rand(0.3, 0.45), { decay: 4.5, wet: 1, pan: rand(-0.4, 0.4) });
    }
  }
}

// =============================================================================================
// BOSS 1 — Commander Corvane, "The Appointed Commander": martial drums, low saw-brass pads,
// driving ostinato, and the leitmotif.
// =============================================================================================
class Boss1Score extends BaseScore {
  readonly bpm = 124;
  readonly stepsPerBeat = 4;
  /** Bass root per bar (16-bar form) and whether the chord is minor. */
  protected readonly bass: ReadonlyArray<readonly [number, boolean]> = [
    [38, true], [38, true], [34, false], [33, false],
    [38, true], [38, true], [34, false], [33, false],
    [31, true], [31, true], [41, false], [33, false],
    [34, false], [36, false], [33, false], [33, false],
  ];
  protected onStep(bar: number, s: number, t: number): void {
    const pass = Math.floor(bar / 16);
    const k = bar % 16;
    const [root, minor] = this.bass[k]!;
    const barDur = this.b(4);
    const sparseIntro = pass > 0 && pass % 3 === 2 && k < 2;

    // --- harmony ---
    if (s === 0) {
      if (k !== 15) pad(this.out, t, triad(root + 12, minor).map(mtof), barDur, 0.8, { attack: 0.12, release: 0.5, cutoff: 1300, wet: 0.35 });
      if (k % 2 === 0 || k === 15) timpani(this.out, t, mtof(root + 12 > 45 ? root : root + 12), 0.8);
      if (k >= 8 && k < 12) choir(this.out, t, triad(root + 24, minor).map(mtof), barDur + 0.2, 0.7, { vowel: 'a', attack: 0.4, release: 1.2 });
    }
    // --- ostinato (8ths, staccato cellos) ---
    if (!sparseIntro && s % 2 === 0 && k !== 15) {
      const pat = pass % 2 ? [0, 0, 12, 0, 7, 0, 12, 10] : [0, 0, 12, 0, 0, 7, 12, 0];
      const iv = pat[s / 2]!;
      strings(this.out, t, mtof(root + 12 + iv), 0.11, s % 8 === 0 ? 0.9 : 0.6, { attack: 0.012, release: 0.12, bright: 1.3, wet: 0.2 });
    }
    // --- drums ---
    const taikoPat: Record<number, number> = { 0: 1, 6: 0.55, 8: 0.9, 10: 0.45, 14: 0.4 };
    const tv = taikoPat[s];
    if (tv !== undefined && (!sparseIntro || s === 0)) taiko(this.out, t, tv * (k % 4 === 0 && s === 0 ? 1.2 : 1));
    if (pass % 2 === 1 && (s === 3 || s === 11) && Math.random() < 0.5) taiko(this.out, t, 0.25);
    if (k >= 4 && !sparseIntro) {
      if (s === 4 || s === 12) snare(this.out, t, 0.6);
      if ((s === 13 || s === 15) && Math.random() < 0.6) snare(this.out, t, 0.18);
    }
    if ((k % 4 === 3) && s === 12) snareRoll(this.out, t, this.b(1), 0.15, 0.7);
    // --- leitmotif ---
    const phraseStep = (k % 2) * this.stepsPerBar + s;
    if (k === 4 || k === 5) {
      const up = pass % 2 ? 12 : 0;
      for (const [iv, len] of notesAt(LEITMOTIF, phraseStep, 4)) {
        brass(this.out, t, mtof(nn('D3') + up + iv), this.b(len) * 0.92, 0.85);
      }
    }
    if (k === 6 || k === 7) {
      for (const [iv, len] of notesAt(LEITMOTIF_ANSWER, phraseStep, 4)) {
        brass(this.out, t, mtof(nn('D3') + iv), this.b(len) * 0.92, 0.85);
      }
    }
    if (k === 8 || k === 9) {
      // Over G minor: the motif in the strings, an octave up.
      for (const [iv, len] of notesAt(LEITMOTIF, phraseStep, 4)) {
        strings(this.out, t, mtof(nn('D4') + iv), this.b(len) * 0.95, 0.8, { attack: 0.06, release: 0.4, bright: 1.1 });
      }
    }
    if (k === 12 || k === 13) {
      for (const [iv, len] of notesAt(LEITMOTIF, phraseStep, 4)) {
        brass(this.out, t, mtof(nn('D3') + iv), this.b(len) * 0.92, 0.9);
        strings(this.out, t, mtof(nn('D4') + iv), this.b(len) * 0.95, 0.6, { attack: 0.05, release: 0.3 });
      }
    }
    // --- bar 15: dominant stabs, then a roll back to the top ---
    if (k === 15) {
      if (s === 0 || s === 3 || s === 6) {
        for (const m of triad(nn('A2'), false)) brass(this.out, t, mtof(m), this.b(0.5), 0.9, { bite: 1.3 });
        taiko(this.out, t, 1);
      }
      if (s === 8) timpaniRoll(this.out, t, mtof(nn('A1')), this.b(2), 0.2, 0.9);
    }
  }
}

// =============================================================================================
// BOSS 2 — "The Measure": the leitmotif (D minor) now fights a second version of itself in
// F# Phrygian, in canon and simultaneously. Faster, denser, more urgent.
// =============================================================================================
class Boss2Score extends BaseScore {
  readonly bpm = 138;
  readonly stepsPerBeat = 4;
  /** Two transition bars before bar 0 when arriving from phase 1. */
  private intro: number;
  /** Harmony per bar: [bass root, minor]. D minor vs F# minor territories. */
  private readonly harm: ReadonlyArray<readonly [number, boolean]> = [
    [38, true], [38, true], [38, true], [38, true],
    [42, true], [42, true], [42, true], [42, true],
    [38, true], [42, true], [38, true], [42, true],
    [34, false], [33, false], [34, false], [33, false],
  ];
  constructor(out: MusicOut, fromBoss1: boolean) {
    super(out);
    this.intro = fromBoss1 ? 2 : 0;
  }

  protected onStep(barRaw: number, s: number, t: number): void {
    if (barRaw < this.intro) return this.transition(barRaw, s, t);
    const bar = barRaw - this.intro;
    const pass = Math.floor(bar / 16);
    const k = bar % 16;
    const [root, minor] = this.harm[k]!;
    const barDur = this.b(4);

    if (s === 0) {
      // Downbeat of the cycle: a crash-like strike.
      if (k === 0) {
        taiko(this.out, t, 1.3, { f: 50 });
        mbell(this.out, t, mtof(nn('D3')), 0.9, { church: true, decay: 6, wet: 1 });
      }
      pad(this.out, t, triad(root + 12, minor).map(mtof), barDur, 0.8, { attack: 0.08, release: 0.4, cutoff: 1500, wet: 0.35 });
      if (k >= 8 && k < 12) {
        // Both keys at once: D minor and F# minor triads sung together.
        choir(this.out, t, [...triad(nn('D4'), true), ...triad(nn('F#4'), true)].map(mtof), barDur + 0.2, 0.75, { vowel: 'a', to: 'o', attack: 0.3, release: 1 });
      }
      timpani(this.out, t, mtof(root > 40 ? root : root + 12), 0.85);
    }
    // --- 16th ostinato ---
    if (k < 15 || s < 8) {
      const pat = [0, 0, 12, 0];
      const iv = pat[s % 4]!;
      strings(this.out, t, mtof(root + 12 + iv), 0.07, s % 4 === 0 ? 0.8 : 0.45, { attack: 0.008, release: 0.08, bright: 1.4, wet: 0.15 });
    }
    // --- drums: driving 8ths ---
    if (s % 2 === 0) taiko(this.out, t, s === 0 || s === 8 ? 1 : 0.42);
    if (s === 14 || s === 15) taiko(this.out, t, 0.3);
    if (s === 4 || s === 12) snare(this.out, t, 0.65);
    if (k % 2 === 1 && s === 8) snareRoll(this.out, t, this.b(2), 0.1, 0.55, 1 / 24);
    else if (s % 2 === 1 && Math.random() < 0.3) snare(this.out, t, 0.14);

    // --- the two versions of the theme ---
    const ph = (k % 2) * this.stepsPerBar + s;
    const orig = (base: number, vel: number, phraseStep: number) => {
      for (const [iv, len] of notesAt(LEITMOTIF, phraseStep, 4)) brass(this.out, t, mtof(base + iv), this.b(len) * 0.92, vel, { pan: -0.25 });
    };
    const rival = (base: number, vel: number, phraseStep: number) => {
      for (const [iv, len] of notesAt(COMPETING, phraseStep, 4)) {
        strings(this.out, t, mtof(base + iv), this.b(len) * 0.95, vel, { attack: 0.04, release: 0.35, bright: 1.3, pan: 0.3 });
        brass(this.out, t, mtof(base + iv - 12), this.b(len) * 0.9, vel * 0.55, { pan: 0.3, wet: 0.6 });
      }
    };
    if (k === 0 || k === 1) orig(nn('D3') + (pass % 2 ? 12 : 0), 0.95, ph);
    // Canon: the rival enters two beats later and overlaps the original.
    if (k <= 2) {
      const cs = k * this.stepsPerBar + s - 8; // phrase step offset by 2 beats
      if (cs >= 0 && cs < 2 * this.stepsPerBar) rival(nn('F#4'), 0.75, cs);
    }
    if (k === 4 || k === 5) rival(nn('F#4'), 0.85, ph);
    if (k === 8 || k === 9) {
      // Simultaneous: both versions at once — the struggle made audible.
      orig(nn('D3'), 1, ph);
      rival(nn('F#4'), 0.8, ph);
    }
    if (k === 12 || k === 13) {
      orig(nn('D3'), 0.95, ph);
      const cs = ph - 4; // tighter canon: one beat behind
      if (cs >= 0) rival(nn('F#4'), 0.7, cs);
    }
    if (k === 14 && s === 0) rival(nn('F#4'), 0.7, 0); // truncated: interrupted
    // --- bar 15: both converge onto A, their only common tone ---
    if (k === 15 && s === 8) {
      brass(this.out, t, mtof(nn('A2')), this.b(2), 1, { bite: 1.4 });
      brass(this.out, t, mtof(nn('A3')), this.b(2), 0.9);
      strings(this.out, t, mtof(nn('A4')), this.b(2), 0.8, { attack: 0.03, bright: 1.3 });
      timpaniRoll(this.out, t, mtof(nn('A1')), this.b(2), 0.3, 1);
    }
  }

  /** Phase-change stinger: bell strike, clustered swell, timpani crescendo, snare surge. */
  private transition(bar: number, s: number, t: number): void {
    if (bar === 0 && s === 0) {
      mbell(this.out, t, mtof(nn('D2')), 1, { church: true, decay: 10, wet: 1.2 });
      taiko(this.out, t, 1.3, { f: 45 });
      pad(this.out, t, [nn('D3'), nn('Eb3'), nn('A3'), nn('F#3')].map(mtof), this.b(8), 0.9, { attack: this.b(6), release: 0.4, cutoff: 1800 });
      timpaniRoll(this.out, t + this.b(1), mtof(nn('D2')), this.b(7), 0.1, 1);
      riser(this.out, t + this.b(2), this.b(6), 1, mtof(nn('D2')));
    }
    if (bar === 1 && s === 0) snareRoll(this.out, t, this.b(4), 0.1, 0.9, 1 / 24);
    if (bar === 1) {
      // First glimpse of the rival version, alone and high, over the roll.
      for (const [iv, len] of notesAt(COMPETING.slice(0, 4), s, 4)) {
        strings(this.out, t, mtof(nn('F#4') + iv), this.b(len) * 0.95, 0.7, { attack: 0.04, release: 0.5, bright: 1.2, pan: 0.3 });
      }
    }
  }
}

// =============================================================================================
// VICTORY — release: a bright bell, the leitmotif transfigured in D major, then quiet.
// =============================================================================================
class VictoryScore extends BaseScore {
  readonly bpm = 60;
  readonly stepsPerBeat = 2;
  protected onStep(bar: number, s: number, t: number): void {
    if (bar < 8) {
      if (bar === 0 && s === 0) {
        mbell(this.out, t, mtof(nn('D3')), 1, { church: true, decay: 12, wet: 1.2 });
        drone(this.out, t, mtof(nn('D2')), this.b(32), 0.6, { attack: 3, release: 6 });
      }
      if (s === 0) {
        const chords = [[50, 54, 57], [50, 54, 57], [50, 55, 59], [50, 55, 59], [47, 50, 54], [43, 50, 55], [45, 49, 52], [50, 54, 57, 62]];
        pad(this.out, t, chords[bar]!.map(mtof), this.b(4) + 0.3, 0.7, { attack: 2, release: 3, cutoff: 900 });
        if (bar === 4) choir(this.out, t, [nn('D4'), nn('F#4'), nn('A4')].map(mtof), this.b(16), 0.5, { vowel: 'o', to: 'a', attack: 3, release: 4 });
      }
      if (bar >= 2 && bar < 6) {
        const ph = (bar - 2) * this.stepsPerBar + s;
        for (const [iv, len] of notesAt(LEITMOTIF_MAJOR, ph, 2)) {
          strings(this.out, t, mtof(nn('D4') + iv), this.b(len) + 0.2, 0.7, { attack: 0.5, release: 1.5, bright: 0.9, wet: 0.8 });
        }
      }
      return;
    }
    // Afterglow: quiet, slowly breathing.
    const k = (bar - 8) % 8;
    if (s === 0) {
      if (k === 0) drone(this.out, t, mtof(nn('D2')), this.b(34), 0.45, { attack: 5, release: 6 });
      if (k % 4 === 0) {
        const c = k === 0 ? [50, 54, 57, 61] : [50, 55, 59, 62];
        pad(this.out, t, c.map(mtof), this.b(16), 0.5, { attack: 4, release: 5, cutoff: 700 });
      }
    }
    if (s === 2 && Math.random() < 0.25) mbell(this.out, t, mtof(pick([74, 78, 81, 83, 86])), 0.3, { decay: 5, wet: 1, pan: rand(-0.5, 0.5) });
  }
}

// =============================================================================================
// BATTLEFIELD — vast and eerie: massed voices in D Phrygian, drones, horns far away.
// =============================================================================================
class BattlefieldScore extends BaseScore {
  readonly bpm = 44;
  readonly stepsPerBeat = 2;
  private readonly clusters: readonly (readonly number[])[] = [[50, 52, 57], [51, 55, 58], [48, 51, 55], [46, 50, 53, 57]];
  protected onStep(bar: number, s: number, t: number): void {
    const pass = Math.floor(bar / 8);
    const k = bar % 8;
    if (s === 0) {
      if (k === 0) {
        drone(this.out, t, mtof(nn('D1')), this.b(34), 0.9, { attack: 5, release: 6 });
        drone(this.out, t, mtof(nn('D2')), this.b(34), 0.5, { attack: 6, release: 6 });
      }
      if (k % 2 === 0) {
        const c = this.clusters[k / 2]!;
        const vowels = [['u', 'a'], ['a', 'o'], ['o', 'a'], ['a', 'u']] as const;
        const [v0, v1] = vowels[(k / 2 + pass) % 4]!;
        choir(this.out, t, c.map(mtof), this.b(8), 0.8, { vowel: v0, to: v1, attack: 3, release: 4, size: 0.92 });
        choir(this.out, t + 0.3, c.map((m) => mtof(m - 12)), this.b(8), 0.55, { vowel: 'o', attack: 4, release: 4, size: 0.85 });
      }
      if (k === 0 || k === 4) strings(this.out, t, mtof(nn('D2')), this.b(16), 0.5, { attack: 3, release: 4, bright: 0.5 });
      if (pass >= 1 && Math.random() < 0.3) choir(this.out, t + rand(0, 2), [mtof(pick([nn('D5'), nn('A5'), nn('Eb5')]))], this.b(4), 0.25, { vowel: 'i', attack: 2, release: 3 });
      if (k === 7 && pass % 2 === 1) timpaniRoll(this.out, t, mtof(nn('D2')), this.b(4), 0.05, 0.35);
    }
    // Distant horns: a fragment of the leitmotif, far away.
    if (k === 2 || k === 6) {
      const frag: Line = [[0, 0, 1], [1, 7, 1], [2, 8, 1], [3, 7, 1.5]];
      for (const [iv, len] of notesAt(frag, s, 2)) brass(this.out, t, mtof(nn('D3') + iv), this.b(len), 0.35, { wet: 1.4, bite: 0.3 });
    }
  }
}

/** Build the score for a state. */
export function createScore(state: Exclude<MusicState, 'none'>, out: MusicOut, from: MusicState): Score {
  switch (state) {
    case 'title': return new TitleScore(out);
    case 'intro': return new IntroScore(out);
    case 'ashbridge': return new AshbridgeScore(out);
    case 'hospice': return new HospiceScore(out);
    case 'victory': return new VictoryScore(out);
    case 'battlefield': return new BattlefieldScore(out);
    case 'army': case 'academy': case 'cathedral': case 'treasury': case 'household': case 'belfry': case 'ending':
      return regionScore(state, out);
    default: {
      const boss = parseBossState(state);
      if (!boss) return new AshbridgeScore(out);
      // Corvane keeps his hand-written score (boss1/boss2 = boss:corvane:1/2).
      if (boss.id === 'corvane') {
        if (boss.phase <= 1) return new Boss1Score(out);
        const prev = parseBossState(from);
        return new Boss2Score(out, prev?.id === 'corvane' && prev.phase < boss.phase);
      }
      return bossScore(boss.id, boss.phase, out, from);
    }
  }
}

