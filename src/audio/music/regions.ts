/**
 * Region exploration themes — one per institution (plus the Belfry and the ending).
 *
 * Every theme is built from 8/16-bar phrases; at each phrase boundary the score picks a "plan"
 * (which layers play, or none), so each loops for many minutes without repeating itself and
 * silence is part of the texture. Art direction:
 *   army      — iron, siege works, percussion: war drums and horns across a valley, snare rolls,
 *               open-fifth low strings, a violin lament (C minor)
 *   academy   — glass, suspended structures, unresolved tones: bowed-glass suspended chords that
 *               never resolve, glass-harmonica fragments that sag at their ends, echoing struck
 *               glass, sea wash (A Lydian); some phrases rest on almost nothing
 *   cathedral — monumental stone, processions, layered voices: a plainchant sung in 3-voice canon,
 *               organ, processional drum, far bells (G Dorian)
 *   treasury  — metal, vault mechanisms, mechanical rhythms: tick-tock escapements against a
 *               3-step gear, a phasing 7-note dulcimer cell, low brass counting, the mechanism
 *               halting and ratcheting back to life (F minor / Phrygian)
 *   household — formal gardens, distant court music: an original pavane on a far harpsichord/lute
 *               that decays pass by pass (notes drop out, the instrument goes out of tune and
 *               slows, the air grows darker) under quiet present-day strings (G minor)
 *   belfry    — immense, unsettling Great Bells a tritone/semitone apart, low choir clusters, sub
 *               drones (D)
 *   ending    — resolution: the title's bell motif in D major on piano-like bells, warm strings,
 *               a plagal close
 */
import { pick, rand } from '../engine/Voice';
import {
  brass, choir, distant, drone, dulcimer, glass, glassPluck, greatBell, harmonica, harpsichord, mbell, mechanism,
  organ, pianoBell, pluck, ratchet, snareRoll, strings, subDrone, taiko, timpani, wash, type FarOut, type MusicOut,
} from './instruments';
import { BaseScore, deg, MODES, notesAt, triad, weighted, type Line } from './score-base';
import { mtof, type Score } from './sequencer';

export type RegionState = 'army' | 'academy' | 'cathedral' | 'treasury' | 'household' | 'belfry' | 'ending';

export function regionScore(state: RegionState, out: MusicOut): Score {
  switch (state) {
    case 'army': return new ArmyScore(out);
    case 'academy': return new AcademyScore(out);
    case 'cathedral': return new CathedralScore(out);
    case 'treasury': return new TreasuryScore(out);
    case 'household': return new HouseholdScore(out);
    case 'belfry': return new BelfryScore(out);
    case 'ending': return new EndingScore(out);
  }
}

// =============================================================================================
// ARMY — Siegeholm. C minor, 66 bpm. Phrase = 8 bars (≈ 29 s).
// =============================================================================================

/** Horn call (relative to C4): G C C Eb D C G — bare fourths and fifths. */
const HORN_CALL: Line = [[0, -5, 1.5], [1.5, 0, 0.5], [2, 0, 1], [3, 3, 1.5], [4.5, 2, 0.5], [5, 0, 1], [6, -5, 2]];
/** Answer from the other side of the valley (relative to C4): C G Ab G F Eb C. */
const HORN_ANSWER: Line = [[0, 0, 1], [1, -5, 1], [2, -4, 1.5], [3.5, -5, 0.5], [4, -7, 1], [5, -9, 1], [6, -12, 2]];
/** Violin lament over C – Ab – F – G (relative to C5); it hangs on the leading tone. */
const LAMENT: Line = [
  [0, 3, 2], [2, 2, 1], [3, 0, 1], [4, -2, 1.5], [5.5, -4, 0.5], [6, -5, 2],
  [8, -4, 1], [9, -2, 1], [10, 0, 2], [12, 3, 2], [14, 0, 2],
  [16, 0, 1.5], [17.5, -2, 0.5], [18, -4, 1], [19, -5, 1], [20, -7, 2], [22, -4, 2],
  [24, -1, 2], [26, 2, 1], [27, 0, 1], [28, -1, 3],
];
/** War-drum patterns (8th-note steps of one bar → velocity). */
const DRUM_A: Record<number, number> = { 0: 1, 4: 0.55 };
const DRUM_B: Record<number, number> = { 0: 1, 3: 0.35, 4: 0.75, 6: 0.45 };
const DRUM_FILL: Record<number, number> = { 0: 1, 2: 0.45, 4: 0.7, 5: 0.5, 6: 0.85, 7: 0.6 };

type ArmyPlan = 'march' | 'lament' | 'still' | 'silence';

class ArmyScore extends BaseScore {
  bpm = 66;
  readonly stepsPerBeat = 2;
  /** War drums and snares across the valley. */
  private readonly far: FarOut = distant(this.out, 850, 1.5);
  /** Horns, further still. */
  private readonly horns: FarOut = distant(this.out, 700, 2.1);
  private plan: ArmyPlan = 'still';
  private horn = false;
  private lamentHorn = false;
  /** Open-fifth bass per bar: C C Ab Ab F F G G. */
  private readonly roots = [36, 36, 32, 32, 29, 29, 31, 31];

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 8;
    const phrase = Math.floor(bar / 8);
    if (k === 0 && s === 0) {
      this.plan = phrase === 0 ? 'still' : phrase % 5 === 4 ? 'silence'
        : weighted<Exclude<ArmyPlan, 'silence'>>({ march: 4, lament: 3, still: 2 }, this.plan === 'still' || this.plan === 'silence' ? 'still' : undefined);
      this.horn = this.plan === 'march' || Math.random() < 0.6;
      this.lamentHorn = Math.random() < 0.3;
    }
    const p = this.plan;
    const root = this.roots[k]!;
    // --- low strings: bare open fifths, two bars at a time ---
    if (s === 0 && k % 2 === 0 && p !== 'silence' && (p !== 'still' || k === 0 || Math.random() < 0.35)) {
      const vel = p === 'still' ? 0.32 : 0.45;
      strings(this.out, t, mtof(root + 12), this.b(8) + 0.5, vel, { attack: 2.5, release: 3, bright: 0.45, wet: 0.7, pan: -0.15 });
      strings(this.out, t + 0.15, mtof(root + 19), this.b(8) + 0.5, vel * 0.7, { attack: 3, release: 3, bright: 0.4, wet: 0.7, pan: 0.15 });
      if (k === 0 && p !== 'still') drone(this.out, t, mtof(root), this.b(32), 0.45, { attack: 4, release: 5 });
    }
    // --- war drums across the valley ---
    if (p === 'march' && k >= 1) {
      const pat = k === 7 ? DRUM_FILL : k % 2 ? DRUM_B : DRUM_A;
      const v = pat[s];
      if (v !== undefined) taiko(this.far, t + rand(-0.01, 0.01), v * 0.72, { f: 50, wet: 0.5 });
    }
    if ((p === 'still' || p === 'lament') && k === 3 && s === 0 && Math.random() < 0.5) {
      taiko(this.far, t, 0.8, { f: 48 });
      taiko(this.far, t + this.b(1.5), 0.5, { f: 48 });
    }
    if (p === 'silence' && k === 5 && s === 0) taiko(this.far, t, 0.6, { f: 46 });
    // --- snare roll swelling and fading, far off ---
    if (p === 'march' && k === 3 && s === 0) {
      snareRoll(this.far, t, this.b(4), 0.04, 0.55, 1 / 16);
      snareRoll(this.far, t + this.b(4), this.b(3), 0.55, 0.03, 1 / 16);
    }
    // --- horns: a call, answered from the other side ---
    const ph = (k % 2) * this.stepsPerBar + s;
    if (this.horn && p !== 'silence' && (k === 0 || k === 1)) {
      for (const [iv, len] of notesAt(HORN_CALL, ph, 2)) {
        brass(this.horns, t, mtof(60 + iv), this.b(len) * 0.95, 0.5, { bite: 0.35, pan: -0.4, wet: 0.8 });
      }
    }
    if (p === 'march' && (k === 4 || k === 5)) {
      for (const [iv, len] of notesAt(HORN_ANSWER, ph, 2)) {
        brass(this.horns, t, mtof(60 + iv), this.b(len) * 0.95, 0.42, { bite: 0.3, pan: 0.45, wet: 0.8 });
      }
    }
    // --- the lament (violins, or a lone far horn an octave down) ---
    if (p === 'lament') {
      for (const [iv, len] of notesAt(LAMENT, k * this.stepsPerBar + s, 2)) {
        if (this.lamentHorn) brass(this.horns, t, mtof(60 + iv), this.b(len) * 0.97, 0.45, { bite: 0.3, pan: 0.3, wet: 0.9 });
        else strings(this.out, t, mtof(72 + iv), this.b(len) + 0.15, 0.4, { attack: 0.5, release: 1.4, bright: 0.7, wet: 1, pan: 0.15 });
      }
    }
    // --- siege: a rare distant impact ---
    if (s === 0 && p !== 'silence' && Math.random() < 0.05) timpani(this.far, t + rand(0, 1), mtof(24), 0.9, { decay: 3 });
  }
}

// =============================================================================================
// ACADEMY — the Suspended Campus. A Lydian, 52 bpm. Nothing ever resolves.
// =============================================================================================

/** Suspended chords (bowed glass, voiced an octave up): Asus2maj7, Esus4, F#7sus4, D#ø, Bsus2(7). */
const ACADEMY_CHORDS: readonly (readonly number[])[] = [
  [69, 71, 76, 80], [64, 69, 71, 76], [66, 71, 73, 76], [63, 66, 69, 73], [71, 73, 78, 81],
];
/** A Lydian from A4 upward. */
const A_LYDIAN = [69, 71, 73, 75, 76, 78, 80, 81, 83, 85, 87, 88];
/** Fragments may only end on these (never A or E): B, D#, F#, G#. */
const UNRESOLVED = new Set([71, 75, 78, 80, 83, 87]);

type AcademyPlan = 'glass' | 'sea' | 'open' | 'rest';

class AcademyScore extends BaseScore {
  bpm = 52;
  readonly stepsPerBeat = 2;
  private plan: AcademyPlan = 'open';
  private seaCool = 0;
  private lastChord = -1;

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 8;
    const phrase = Math.floor(bar / 8);
    if (k === 0 && s === 0) {
      this.plan = phrase === 0 ? 'open' : weighted<AcademyPlan>({ glass: 4, sea: 2, open: 3, rest: 1.5 }, this.plan === 'sea' || this.plan === 'rest' ? this.plan : undefined);
    }
    const p = this.plan;
    if (s !== 0) return;
    this.seaCool--;
    // --- bowed-glass suspended chords ---
    if ((p === 'glass' && k % 4 === 0) || (p === 'open' && k === 0)) {
      let i = Math.floor(Math.random() * ACADEMY_CHORDS.length);
      if (i === this.lastChord) i = (i + 1) % ACADEMY_CHORDS.length;
      this.lastChord = i;
      const c = ACADEMY_CHORDS[i]!;
      c.forEach((m, j) => glass(this.out, t + j * 0.35, mtof(m), this.b(p === 'open' ? 10 : 14), p === 'open' ? 0.32 : 0.42));
      if (p === 'glass' && k === 0) strings(this.out, t, mtof(45), this.b(30), 0.22, { attack: 5, release: 5, bright: 0.3, wet: 0.9 });
    }
    // --- glass-harmonica fragments, ending on an unresolved tone that sags ---
    if ((p === 'glass' || p === 'open') && (k % 4 === 1 || k % 4 === 2) && Math.random() < 0.5) this.fragment(t + this.b(pick([0, 1, 2])));
    if (p === 'sea' && k === 4 && Math.random() < 0.5) {
      harmonica(this.out, t, mtof(pick([71, 75, 78])), this.b(4), 0.35, { bend: 40, pan: rand(-0.5, 0.5), release: 3 });
    }
    // --- sea wash ---
    const seaChance = p === 'sea' ? 0.7 : p === 'rest' ? 0.06 : 0.18;
    if (this.seaCool <= 0 && Math.random() < seaChance) {
      wash(this.out, t + rand(0, 1), rand(7, 11), p === 'sea' ? 0.8 : 0.55, { pan: rand(-0.6, 0.6), cutoff: rand(900, 1600) });
      this.seaCool = p === 'sea' ? Math.floor(rand(1, 3)) : Math.floor(rand(2, 4));
    }
    if (p === 'sea' && k === 0) drone(this.out, t, mtof(33), this.b(30), 0.4, { attack: 6, release: 6 });
    // --- suspended pings: a struck glass echoing through the scaffolds ---
    if (p !== 'glass' && Math.random() < 0.16) {
      const f = mtof(pick([81, 83, 87, 88, 90]));
      const t0 = t + this.b(rand(0, 3));
      const n = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) glassPluck(this.out, t0 + i * 0.37, f, 0.5 * Math.pow(0.55, i), { pan: i % 2 ? 0.55 : -0.55, wet: 1.1, decay: 1.4 });
    }
  }

  /** 3–5 harmonica notes; the last is held, bends flat and never lands on the tonic. */
  private fragment(t0: number): void {
    const n = 3 + Math.floor(Math.random() * 3);
    let i = 2 + Math.floor(Math.random() * 6);
    let t = t0;
    const pan = rand(-0.4, 0.4);
    for (let j = 0; j < n; j++) {
      const last = j === n - 1;
      if (last) {
        // Step to the nearest unresolved tone.
        let best = i;
        for (let d = 0; d < A_LYDIAN.length; d++) {
          for (const c of [i - d, i + d]) if (c >= 0 && c < A_LYDIAN.length && UNRESOLVED.has(A_LYDIAN[c]!)) { best = c; d = 99; break; }
        }
        i = best;
      }
      const dur = last ? this.b(rand(3, 5)) : this.b(pick([1, 1, 1.5, 2]));
      harmonica(this.out, t, mtof(A_LYDIAN[i]!), dur * (last ? 1 : 0.9), last ? 0.42 : 0.36, { bend: last ? rand(25, 55) : 0, pan, release: last ? 3 : 1.6 });
      t += dur;
      i = Math.max(0, Math.min(A_LYDIAN.length - 1, i + pick([-2, -1, -1, 1, 1, 2, 3])));
    }
  }
}

// =============================================================================================
// CATHEDRAL — the Pilgrim Stair. G Dorian, 50 bpm. Phrase = 8 bars (≈ 38 s).
// =============================================================================================

const G_DORIAN = MODES.dorian;
/** Plainchant in scale degrees above G3: G A Bb C – Bb A | Bb C D E D C | Bb A G. */
const CHANT: Line = [
  [0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 3, 2], [5, 2, 1], [6, 1, 1], [7, 2, 1], [8, 3, 1], [9, 4, 1], [10, 5, 1],
  [11, 4, 1], [12, 3, 1], [13, 2, 1], [14, 1, 1], [15, 0, 3],
];
/** Organ progressions (2 bars per chord): Gm C F Gm | Eb F C D. */
const ORGAN_PROG: readonly (readonly (readonly number[])[])[] = [
  [[55, 58, 62], [55, 60, 64], [53, 57, 60], [55, 58, 62]],
  [[51, 55, 58], [53, 57, 60], [52, 55, 60], [54, 57, 62]],
];
const CANON_VOICES = [
  { delay: 0, shift: 0, vowel: 'a', to: 'o', vel: 0.55, pan: 0 },
  { delay: 4, shift: -3, vowel: 'o', to: 'u', vel: 0.5, pan: -0.45 },
  { delay: 8, shift: -7, vowel: 'u', to: 'o', vel: 0.5, pan: 0.45 },
] as const;

type CathedralPlan = 'procession' | 'canon' | 'nave' | 'bells';

class CathedralScore extends BaseScore {
  bpm = 50;
  readonly stepsPerBeat = 2;
  private plan: CathedralPlan = 'nave';
  private voices = 1;
  private prog = 0;
  private readonly bells: FarOut = distant(this.out, 1300, 1.8);

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 8;
    const phrase = Math.floor(bar / 8);
    if (k === 0 && s === 0) {
      this.plan = phrase === 0 ? 'nave' : weighted<CathedralPlan>({ procession: 3, canon: 3, nave: 1.5, bells: 1.5 }, this.plan);
      this.voices = this.plan === 'canon' ? 3 : this.plan === 'procession' ? 1 + (Math.random() < 0.5 ? 1 : 0) : 1;
      this.prog = (this.prog + 1) % 2;
    }
    const p = this.plan;
    if (s === 0) {
      // --- organ ---
      if (p === 'procession' && k % 2 === 0) {
        const c = ORGAN_PROG[this.prog]![k / 2]!;
        organ(this.out, t, c.map(mtof), this.b(8) + 0.3, 0.6, { attack: 1.2, release: 2, pedal: true });
      }
      if (p === 'canon' && k === 0) organ(this.out, t, [mtof(43), mtof(50)], this.b(30), 0.5, { attack: 4, release: 5, bright: 0.7 });
      if (p === 'nave' && k === 0) organ(this.out, t, [55, 57, 62, 58].map(mtof), this.b(22), 0.42, { attack: 5, release: 6, bright: 0.6, pedal: true });
      // --- far bells ---
      if (p === 'bells' && k % 2 === 0 && k < 6) mbell(this.bells, t + rand(0, 0.3), mtof(43), 0.75, { church: true, decay: 9, wet: 1.2, pan: -0.3 });
      if (p === 'procession' && k === 4 && Math.random() < 0.5) mbell(this.bells, t, mtof(50), 0.55, { church: true, decay: 8, pan: 0.35 });
    }
    // --- processional drum: slow, steady half notes ---
    if (p === 'procession' && k < 7 && (s === 0 || s === 4)) taiko(this.out, t, s === 0 ? 0.4 : 0.24, { f: 55, wet: 0.8 });
    // --- the chant, in canon ---
    if ((p === 'canon' || p === 'procession' || (p === 'bells' && k >= 2)) && k < 7) {
      const beatStep = k * this.stepsPerBar + s - (p === 'bells' ? 2 * this.stepsPerBar : 0);
      for (let vi = 0; vi < this.voices; vi++) {
        const V = CANON_VOICES[vi]!;
        const cs = beatStep - V.delay * this.stepsPerBeat;
        if (cs < 0) continue;
        for (const [d, len] of notesAt(CHANT, cs, this.stepsPerBeat)) {
          const m = 55 + deg(G_DORIAN, d + V.shift);
          choir(this.out, t, [mtof(m)], this.b(len) + 0.12, V.vel * (p === 'bells' ? 0.7 : 1),
            { vowel: V.vowel, to: V.to, attack: 0.28, release: 0.8, wet: 1.1, size: vi === 2 ? 0.9 : 1 });
        }
      }
    }
  }
}

// =============================================================================================
// TREASURY — the Undervaults. F minor / Phrygian, 100 bpm, 16th grid. Phrase = 8 bars (≈ 19 s).
// =============================================================================================

/** The dulcimer cell: 7 notes cycling over an 8th-note grid, so it phases against the bar. */
const CELL = [65, 68, 72, 73, 72, 68, 67];
/** Low brass bass (2 bars each): F Db Eb C. */
const TREASURY_BASS = [41, 37, 39, 36];
/** Counting motif (half notes): F Gb F E | F. */
const COUNT: Line = [[0, 0, 2], [2, 1, 2], [4, 0, 2], [6, -1, 2], [8, 0, 4]];

type TreasuryPlan = 'works' | 'count' | 'vault' | 'halt';

class TreasuryScore extends BaseScore {
  bpm = 100;
  readonly stepsPerBeat = 4;
  private plan: TreasuryPlan = 'vault';
  private eighth = 0;
  private readonly deep: FarOut = distant(this.out, 600, 1.4);

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 8;
    const phrase = Math.floor(bar / 8);
    if (k === 0 && s === 0) this.plan = phrase === 0 ? 'vault' : weighted<TreasuryPlan>({ works: 3, count: 2, vault: 2, halt: 1.2 }, this.plan);
    const p = this.plan;
    const halted = p === 'halt' && k >= 2 && k < 7;
    // --- clockwork: tick-tock on 8ths against a 3-step gear ---
    if (!halted) {
      if (s % 2 === 0) mechanism(this.out, t, s % 4 === 0 ? 0.3 : 0.22, s % 4 === 0 ? 1 : 0.82);
      if (p !== 'count' && s % 3 === 0) mechanism(this.out, t, 0.09, 1.7);
    }
    if (p === 'halt' && k === 2 && s === 0) {
      mechanism(this.out, t, 0.4, 0.4);
      taiko(this.deep, t, 0.5, { f: 42 });
      drone(this.out, t, mtof(29), this.b(18), 0.35, { attack: 2, release: 4 });
    }
    if (p === 'halt' && k === 6 && s === 0) ratchet(this.out, t, 14, this.b(4), 0.22, 1.25, true);
    if (s % 2 === 0) this.eighth++;
    // --- dulcimer cell ---
    const cellOn = p === 'works' || (p === 'vault' && this.eighth % 2 === 0 && k >= 2);
    if (cellOn && s % 2 === 0) {
      const idx = this.eighth % CELL.length;
      dulcimer(this.out, t, mtof(CELL[idx]! + (k >= 4 && p === 'works' ? 12 : 0)), idx === 0 ? 0.5 : 0.36, { pan: idx % 2 ? 0.3 : -0.3, decay: 1.6 });
    }
    // --- low brass ---
    if (s === 0 && k % 2 === 0 && (p === 'works' || p === 'vault')) {
      brass(this.out, t, mtof(TREASURY_BASS[k / 2]!), this.b(8) * 0.95, 0.45, { bite: 0.25, wet: 0.6 });
    }
    if (p === 'count' && k < 6) {
      const cs = (k % 3) * this.stepsPerBar + s;
      if (k < 3) {
        for (const [iv, len] of notesAt(COUNT, cs, 4)) {
          brass(this.out, t, mtof(41 + iv), this.b(len) * 0.95, 0.45, { bite: 0.3, wet: 0.6, pan: -0.2 });
          brass(this.out, t, mtof(48 + iv), this.b(len) * 0.95, 0.3, { bite: 0.3, wet: 0.6, pan: 0.2 });
        }
      } else if (k === 3 && s === 0) {
        ratchet(this.out, t, 8, this.b(2), 0.18, 1.4, false);
      }
    }
    // --- vault door ---
    if (p === 'vault' && k === 0 && s === 0) {
      taiko(this.deep, t, 0.55, { f: 40 });
      mechanism(this.out, t + 0.05, 0.35, 0.35);
    }
  }
}

// =============================================================================================
// HOUSEHOLD — the Garden Court. A far-off pavane in G minor that decays pass by pass.
// =============================================================================================

/** Original pavane melody (absolute MIDI), 16 bars: strain A (bars 0–7), strain B (8–15). */
const PAVANE: Line = [
  [0, 67, 2], [2, 70, 1], [3, 69, 1], [4, 65, 2], [6, 69, 1], [7, 72, 1],
  [8, 70, 2], [10, 67, 1], [11, 70, 1], [12, 69, 2], [14, 66, 1], [15, 69, 1],
  [16, 74, 2], [18, 72, 1], [19, 70, 1], [20, 72, 1.5], [21.5, 70, 0.5], [22, 69, 1], [23, 67, 1],
  [24, 69, 2], [26, 74, 1], [27, 66, 1], [28, 67, 4],
  [32, 74, 2], [34, 77, 1], [35, 74, 1], [36, 72, 2], [38, 69, 1], [39, 72, 1],
  [40, 70, 2], [42, 74, 1], [43, 72, 1], [44, 69, 2], [46, 67, 1], [47, 66, 1],
  [48, 67, 2], [50, 70, 1], [51, 75, 1], [52, 75, 2], [54, 74, 1], [55, 72, 1],
  [56, 74, 2], [58, 72, 1], [59, 66, 1], [60, 67, 4],
];
/** Harmony per bar: [root (MIDI, octave 2), minor]. */
const PAVANE_HARM: ReadonlyArray<readonly [number, boolean]> = [
  [43, true], [41, false], [39, false], [38, false], [43, true], [36, true], [38, false], [43, true],
  [46, false], [41, false], [43, true], [38, false], [39, false], [36, true], [38, false], [43, true],
];
/** Per decay stage: tempo, air (cutoff), level, note dropout, detune wobble (cents). */
const DECAY = [
  { bpm: 72, cut: 2100, vel: 0.62, drop: 0, wow: 3 },
  { bpm: 69, cut: 1500, vel: 0.52, drop: 0.14, wow: 9 },
  { bpm: 66, cut: 1000, vel: 0.42, drop: 0.38, wow: 18 },
] as const;

class HouseholdScore extends BaseScore {
  bpm = 72;
  readonly stepsPerBeat = 2;
  /** 0..2 = the pavane decaying, 3 = it has gone (strings alone, then silence). */
  private stage = 0;
  private lute = false;
  private sag = 0;
  private readonly court: FarOut = distant(this.out, 2100, 1.7, 0.9);

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 16;
    if (k === 0 && s === 0 && bar > 0) {
      this.stage = (this.stage + 1) % 4;
      this.lute = this.stage > 0 && Math.random() < 0.45;
    }
    const st = this.stage;
    if (k === 0 && s === 0 && st < 3) {
      const d = DECAY[st]!;
      this.bpm = d.bpm;
      this.court.lp.frequency.setTargetAtTime(d.cut, t, 3);
      this.sag = -6 * st;
    }
    if (st === 3) {
      this.bpm = 64;
      this.present(k, s, t);
      return;
    }
    const d = DECAY[st]!;
    const [root, minor] = PAVANE_HARM[k]!;
    // --- the court music, far away ---
    for (const [m, len] of notesAt(PAVANE, k * this.stepsPerBar + s, 2)) {
      if (Math.random() < d.drop) continue;
      this.courtNote(t, m, d.vel, d.wow, len);
    }
    if (s === 0 && Math.random() >= d.drop * 0.8) this.courtNote(t, root, d.vel * 0.75, d.wow, 2);
    if (s === 4 && Math.random() >= d.drop * 0.8) {
      triad(root + 12, minor).forEach((m, i) => this.courtNote(t + i * 0.035, m, d.vel * 0.45, d.wow, 1));
    }
    // --- present-day strings: quiet, close, sustained ---
    if (s === 0 && k % 2 === 0 && (st > 0 || k >= 8)) {
      const chord = triad(root + 12, minor);
      strings(this.out, t, mtof(root), this.b(8) + 0.3, 0.2, { attack: 2.2, release: 2.5, bright: 0.45, wet: 0.7, pan: -0.2 });
      strings(this.out, t + 0.2, mtof(chord[1]! + 12), this.b(8) + 0.3, 0.14, { attack: 2.6, release: 2.5, bright: 0.45, wet: 0.8, pan: 0.25 });
    }
  }

  private courtNote(t: number, m: number, vel: number, wow: number, lenBeats: number): void {
    const det = this.sag + rand(-wow, wow);
    if (this.lute) pluck(this.court, t, mtof(m) * Math.pow(2, det / 1200), vel * 1.3);
    else harpsichord(this.court, t, mtof(m), vel, { detune: det, pan: rand(-0.15, 0.15), decay: lenBeats > 2 ? 2.8 : undefined });
  }

  /** Stage 3: the music has gone. A descending string line over a held G, then silence. */
  private present(k: number, s: number, t: number): void {
    if (s !== 0) return;
    if (k === 0) strings(this.out, t, mtof(43), this.b(32), 0.3, { attack: 3, release: 4, bright: 0.4, wet: 0.7 });
    if (k < 8 && k % 2 === 0) strings(this.out, t + 0.1, mtof([67, 65, 63, 62][k / 2]!), this.b(8) + 0.2, 0.28, { attack: 1.5, release: 2.5, bright: 0.55, wet: 0.9, pan: 0.2 });
    if (k === 12 && Math.random() < 0.5) pluck(this.court, t, mtof(pick([67, 70, 74])), 0.45);
  }
}

// =============================================================================================
// BELFRY — immense, unsettling Great Bells, low choir, sub drones. 40 bpm, beat grid.
// =============================================================================================

/** Great Bell primes: D2, Eb2 (a semitone away), Ab1 (a tritone), C#2. */
const GREAT_PRIMES = [73.4, 77.8, 51.9, 69.3];
const BELFRY_CLUSTERS: readonly (readonly number[])[] = [[50, 51, 57], [50, 57], [49, 50, 56], [50, 53, 56]];

class BelfryScore extends BaseScore {
  bpm = 40;
  readonly stepsPerBeat = 1;
  private bellCool = 2;
  private quiet = false;

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 8;
    const cycle = Math.floor(bar / 8);
    if (k === 0 && s === 0) {
      this.quiet = cycle % 3 === 2;
      subDrone(this.out, t, mtof(26), this.b(34), 0.2, { attack: 6, release: 8 });
      subDrone(this.out, t + 2, mtof(33), this.b(30), 0.12, { attack: 8, release: 8, beat: 0.21 });
    }
    // --- Great Bells: groups of 1–3 strikes, 25–45 s apart ---
    if (s === 0) this.bellCool--;
    if (this.bellCool <= 0 && Math.random() < 0.3) {
      const n = pick([1, 1, 2, 3]);
      const prime = pick(GREAT_PRIMES);
      let tt = t;
      for (let i = 0; i < n; i++) {
        greatBell(this.out, tt, prime * (i === 2 ? 1.06 : 1), rand(0.8, 1) * (i ? 0.8 : 1), { pan: rand(-0.3, 0.3), drift: rand(8, 18) });
        tt += this.b(rand(1.5, 2.5));
      }
      if (Math.random() < 0.2) greatBell(this.out, tt + this.b(2), 146.8, 0.5, { far: true, pan: rand(-0.7, 0.7), decay: 10 });
      this.bellCool = Math.floor(rand(4, 7));
    }
    // --- choir ---
    if (s === 0 && !this.quiet) {
      if (k % 4 === 0 && Math.random() < 0.65) {
        const c = pick(BELFRY_CLUSTERS);
        choir(this.out, t + rand(0, 1), c.map(mtof), this.b(16), 0.5, { vowel: 'u', to: 'o', attack: 5, release: 6, size: 0.85 });
        if (Math.random() < 0.35) choir(this.out, t + 1.5, c.map((m) => mtof(m - 12)), this.b(14), 0.35, { vowel: 'o', attack: 6, release: 6, size: 0.8 });
      }
      if (Math.random() < 0.12) choir(this.out, t + rand(0, 3), [mtof(pick([74, 75, 81]))], this.b(3), 0.2, { vowel: 'i', attack: 2, release: 3 });
    }
  }
}

// =============================================================================================
// ENDING — resolution. D major, 56 bpm. 16-bar cycle (≈ 69 s).
// =============================================================================================

/** The title's bell motif, now in D major, spread over the cycle (absolute MIDI, beats). */
const ENDING_MOTIF: Line = [
  [0, 69, 1.5], [1.5, 66, 0.5], [2, 64, 1], [3, 62, 1],
  [16, 71, 1.5], [17.5, 69, 0.5], [18, 67, 1], [19, 69, 1],
  [32, 71, 1.5], [33.5, 67, 0.5], [34, 66, 1], [35, 64, 1],
  [48, 74, 1.5], [49.5, 71, 0.5], [50, 69, 1], [51, 67, 1],
  [56, 66, 1.5], [57.5, 64, 0.5], [58, 62, 4],
];
/** Two bars per chord: D, Bm, G, D/F#, Em, A(sus4→3), G, D. [bass, chord]. */
const ENDING_PROG: ReadonlyArray<readonly [number, readonly number[]]> = [
  [38, [62, 66, 69]], [35, [62, 66, 71]], [43, [62, 67, 71]], [42, [62, 66, 69]],
  [40, [64, 67, 71]], [45, [64, 69, 74]], [43, [62, 67, 71]], [38, [62, 66, 69, 74]],
];

class EndingScore extends BaseScore {
  bpm = 56;
  readonly stepsPerBeat = 2;
  private bellSteps: number[] = [];

  protected onStep(bar: number, s: number, t: number): void {
    const k = bar % 16;
    const pass = Math.floor(bar / 16);
    const variant = pass === 0 ? 0 : 1 + ((pass - 1) % 3);
    const [bass, chord] = ENDING_PROG[Math.floor(k / 2)]!;
    // --- strings: warm, slow chords (absent at the very start; thinned in the quiet variant) ---
    if (s === 0 && k % 2 === 0 && !(pass === 0 && k < 4)) {
      const quiet = variant === 3;
      strings(this.out, t, mtof(bass), this.b(8) + 0.4, quiet ? 0.22 : 0.3, { attack: 2.5, release: 3, bright: 0.5, wet: 0.8 });
      if (!quiet || k >= 12) {
        chord.forEach((m, i) => strings(this.out, t + 0.15 * i, mtof(m), this.b(8) + 0.4, 0.17, { attack: 3, release: 3, bright: 0.5, wet: 0.9, pan: [-0.3, 0.3, 0, 0.15][i] }));
      }
      // A(sus4) resolves to A: the only suspension in the game that is allowed to resolve.
      if (k === 10) strings(this.out, t + this.b(4), mtof(73), this.b(4) + 0.4, 0.2, { attack: 1.5, release: 3, bright: 0.5, wet: 0.9 });
    }
    // --- the motif ---
    const ms = k * this.stepsPerBar + s;
    for (const [m, len] of notesAt(ENDING_MOTIF, ms, 2)) {
      if (variant === 3 && Math.random() < 0.5) continue;
      if (variant === 1) strings(this.out, t, mtof(m + 12), this.b(len) + 0.3, 0.32, { attack: 0.35, release: 1.6, bright: 0.8, wet: 1 });
      else pianoBell(this.out, t, mtof(m + 12), 0.7, { pan: rand(-0.2, 0.2) });
    }
    // --- sparse piano-bell accompaniment: 1–2 chord tones per bar ---
    if (s === 0) {
      const n = variant === 3 ? (Math.random() < 0.4 ? 1 : 0) : Math.random() < 0.5 ? 1 : 2;
      this.bellSteps = [];
      while (this.bellSteps.length < n) {
        const x = pick([1, 2, 3, 5, 6, 7]);
        if (!this.bellSteps.includes(x)) this.bellSteps.push(x);
      }
    }
    if (this.bellSteps.includes(s)) pianoBell(this.out, t, mtof(pick(chord) + 12 + (Math.random() < 0.3 ? 12 : 0)), rand(0.28, 0.4), { pan: rand(-0.5, 0.5) });
    // --- a low piano D under the final chord ---
    if (k === 14 && s === 0) pianoBell(this.out, t, mtof(50), 0.5, { decay: 7 });
  }
}
