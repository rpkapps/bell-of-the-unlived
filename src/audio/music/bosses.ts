/**
 * Procedural boss themes — `boss:<id>:<phase>`.
 *
 * Every boss id seeds a deterministic leitmotif (6–9 notes over two bars, in a mode chosen for the
 * boss's institution), a tempo, a key, a harmonic plan, an ostinato and an instrument palette.
 * The same id always yields the same theme; per-pass orchestration still varies at run time.
 *
 *   phase 1 — the motif: stated, answered (half cadence), passed to the counter voice, developed
 *             in sequence, then played tutti over a 16-bar form.
 *   phase 2 — the motif fights a COMPETING version of itself (same scale degrees, another key and
 *             mode) in canon and simultaneously; faster, 16th ostinato, denser drums. Both versions
 *             converge on their common tone at the end of the form.
 *   phase 3 — a third version: augmented (twice as slow), in a darker mode, microtonally detuned,
 *             in the low brass and choir, while diminished fragments of the first two versions
 *             flicker above; half-time drums and bell strikes.
 *
 * Phase changes (n → n+1 of the same boss) open with a two-bar stinger: a bell strike and war-drum
 * hit, a cluster of both keys swelling, a timpani crescendo, a riser and a snare surge, over which
 * the new version is first heard alone — the generalised boss1 → boss2 technique.
 *
 * Aldren (belfry) is special: his three phases are three versions of ONE royal motif — the young
 * conqueror (Mixolydian fanfare, fast), the sorcerer-king (Phrygian, choir and bells, contested by
 * the young version a tritone away) and the ancient king (Locrian, slow and immense, Great Bells).
 * Corvane keeps his hand-written boss1/boss2 (see scores.ts).
 */
import type { MusicState } from '../contract';
import { pick, rand } from '../engine/Voice';
import {
  brass, choir, clang, dulcimer, glass, glassPluck, greatBell, harmonica, harpsichord, mbell, mechanism, organ, pad,
  ratchet, riser, snare, snareRoll, strings, subDrone, taiko, timpani, timpaniRoll, type MusicOut,
} from './instruments';
import { BaseScore, deg, degTriad, hashString, MODES, notesAt, Rng, type Line, type ModeName } from './score-base';
import { mtof, type Score } from './sequencer';

export type BossRegion = 'army' | 'academy' | 'cathedral' | 'treasury' | 'household' | 'belfry' | 'secret';

/** Known boss ids → institution (palette bias). Unknown ids pick one from their seed. */
export const BOSS_REGION: Readonly<Record<string, BossRegion>> = {
  varr: 'army', oderic: 'army',
  orrow: 'academy', experiment9: 'academy',
  vessaline: 'cathedral', procession: 'cathedral',
  aurelmask: 'treasury', mimicsovereign: 'treasury',
  celwyn: 'household', twinheirs: 'household',
  aldren: 'belfry',
  bellkeeper: 'secret',
};

/** `boss:<id>:<phase>` (and the legacy boss1/boss2 = Corvane) → normalised id + phase (1..3). */
export function parseBossState(state: MusicState): { id: string; phase: number } | null {
  if (state === 'boss1') return { id: 'corvane', phase: 1 };
  if (state === 'boss2') return { id: 'corvane', phase: 2 };
  const m = /^boss:(.*):(\d+)$/.exec(state);
  if (!m) return null;
  return { id: normaliseBossId(m[1]!), phase: Math.max(1, Math.min(3, Number(m[2]))) };
}

/** Lower-case alphanumerics; a known boss name embedded in a longer id ("boss.marshal_varr") matches too. */
export function normaliseBossId(raw: string): string {
  const n = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const known = ['corvane', ...Object.keys(BOSS_REGION)];
  return known.find((k) => n === k) ?? known.find((k) => n.includes(k)) ?? (n || 'unknown');
}

/** True when `to` is a later phase of the same boss as `from` (drives the phase-change stinger). */
export function isPhaseChange(from: MusicState, to: MusicState): boolean {
  const a = parseBossState(from);
  const b = parseBossState(to);
  return !!a && !!b && a.id === b.id && b.phase > a.phase;
}

// ---------------------------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------------------------

type Lead = 'brass' | 'strings' | 'choir' | 'harmonica' | 'bells' | 'organ' | 'harpsichord' | 'dulcimer';
type Ost = 'strings' | 'harpsichord' | 'dulcimer' | 'glass' | 'brass';
type Perc = 'war' | 'procession' | 'clockwork' | 'court' | 'glass' | 'bells';
type Harm = 'pad' | 'organ' | 'choir' | 'glass';

interface Palette { lead: Lead; counter: Lead; ost: Ost; perc: Perc; harm: Harm; choir: boolean }

interface Profile {
  modes: ModeName[]; rivals: ModeName[]; thirds: ModeName[]; tempo: readonly [number, number]; tonics: number[];
  lead: Lead[]; counter: Lead[]; ost: Ost[]; perc: Perc; harm: Harm[]; choir: boolean;
}

const PROFILES: Record<BossRegion, Profile> = {
  army: {
    modes: ['aeolian', 'phrygian', 'harmonic'], rivals: ['phrygian', 'locrian', 'harmonic', 'aeolian'], thirds: ['locrian', 'hungarian'],
    tempo: [122, 138], tonics: [36, 40, 41, 43], lead: ['brass'], counter: ['strings'], ost: ['strings'], perc: 'war', harm: ['pad'], choir: false,
  },
  academy: {
    modes: ['hungarian', 'harmonic', 'dorian'], rivals: ['lydian', 'phrygianDom', 'locrian'], thirds: ['locrian', 'phrygian'],
    tempo: [108, 124], tonics: [45, 42, 44], lead: ['strings', 'harmonica'], counter: ['harmonica', 'choir'], ost: ['glass'], perc: 'glass', harm: ['glass'], choir: true,
  },
  cathedral: {
    modes: ['dorian', 'phrygian', 'aeolian'], rivals: ['phrygianDom', 'harmonic', 'locrian'], thirds: ['locrian', 'phrygian'],
    tempo: [96, 112], tonics: [43, 40, 42], lead: ['choir', 'brass'], counter: ['brass', 'organ'], ost: ['strings'], perc: 'procession', harm: ['organ'], choir: true,
  },
  treasury: {
    modes: ['phrygianDom', 'harmonic', 'phrygian'], rivals: ['hungarian', 'locrian', 'aeolian'], thirds: ['locrian'],
    tempo: [116, 132], tonics: [41, 39, 42], lead: ['brass'], counter: ['dulcimer', 'strings'], ost: ['dulcimer'], perc: 'clockwork', harm: ['pad'], choir: false,
  },
  household: {
    modes: ['dorian', 'aeolian', 'harmonic'], rivals: ['phrygian', 'harmonic', 'ionian'], thirds: ['locrian', 'phrygian'],
    tempo: [132, 148], tonics: [43, 45, 40], lead: ['strings'], counter: ['brass', 'harpsichord'], ost: ['harpsichord'], perc: 'court', harm: ['pad'], choir: false,
  },
  belfry: {
    modes: ['phrygian', 'aeolian'], rivals: ['locrian', 'mixolydian'], thirds: ['locrian'],
    tempo: [96, 112], tonics: [38], lead: ['brass', 'choir'], counter: ['bells'], ost: ['strings'], perc: 'bells', harm: ['choir'], choir: true,
  },
  secret: {
    modes: ['locrian', 'phrygian'], rivals: ['hungarian', 'phrygianDom'], thirds: ['locrian'],
    tempo: [84, 100], tonics: [37, 44], lead: ['bells'], counter: ['choir', 'organ'], ost: ['strings'], perc: 'bells', harm: ['choir'], choir: true,
  },
};

/** Progression templates (chord degree per bar, 16 bars). Bars 4, 5 and 12 stay on the tonic. */
const PROGS: readonly (readonly number[])[] = [
  [0, 0, 5, 6, 0, 0, 5, 4, 3, 3, 5, 4, 0, 6, 4, 4],
  [0, 0, 1, 0, 0, 0, 5, 4, 3, 3, 1, 4, 0, 1, 4, 4],
  [0, 5, 3, 4, 0, 0, 3, 4, 5, 5, 6, 6, 0, 1, 4, 4],
  [0, 0, 6, 5, 0, 0, 6, 4, 3, 5, 3, 4, 0, 6, 4, 4],
];
/** Ostinato cells (semitones above the bar root, one per 8th). */
const OSTS: readonly (readonly number[])[] = [
  [0, 0, 12, 0, 0, 7, 12, 0], [0, 0, 12, 0, 7, 0, 12, 10], [0, 12, 7, 12, 0, 12, 7, 12], [0, 0, 7, 0, 12, 0, 7, 3],
];

export interface BossSpec {
  id: string;
  region: BossRegion;
  /** Leitmotif in scale degrees: [beat, degree, beats] over 8 beats. */
  motif: Line;
  /** Answer: the motif ending on a half cadence. */
  answer: Line;
  tonic: number;
  mode: readonly number[];
  rivalMode: readonly number[];
  rivalShift: number;
  thirdMode: readonly number[];
  bpm: number;
  prog: readonly number[];
  ost: readonly number[];
  pal: Palette;
  drumVar: number;
  /** Phase 3 distortion (cents of random detune per note). */
  detune: number;
  /** Mode names (for debugging / the preview tool). */
  names: { mode: ModeName; rival: ModeName; third: ModeName };
}

/** Rhythm of n notes over 8 beats (last note long). Deterministic from `rng`. */
function genRhythm(rng: Rng, n: number): number[] {
  const d = Array.from({ length: n - 1 }, () => 1);
  d.push(2);
  let sum = n + 1;
  let guard = 64;
  while (sum > 8 && guard-- > 0) {
    const i = rng.int(0, n - 2);
    if (d[i] === 1) { d[i] = 0.5; sum -= 0.5; }
  }
  while (sum < 8 && guard-- > 0) {
    const i = rng.int(0, n - 1);
    if (d[i]! <= 1.5) { d[i]! += 0.5; sum += 0.5; }
  }
  // A dotted pair (1, 1) → (1.5, 0.5) for character.
  if (rng.chance(0.6)) {
    for (let i = 0; i < n - 2; i++) if (d[i] === 1 && d[i + 1] === 1) { d[i] = 1.5; d[i + 1] = 0.5; break; }
  }
  return d;
}

/** Contour in scale degrees: rise (often with an opening leap) to a peak, fall back to the tonic. */
function genContour(rng: Rng, n: number): number[] {
  const start = rng.chance(0.7) ? 0 : 4;
  const peakIdx = Math.max(1, Math.min(n - 3, Math.round(n * rng.range(0.3, 0.55))));
  const peak = Math.max(start + 2, rng.pick([4, 5, 5, 6, 7]));
  const out = [start];
  let cur = start;
  for (let i = 1; i <= peakIdx; i++) {
    const left = peakIdx - i + 1;
    if (i === 1 && rng.chance(0.55)) cur = Math.min(peak, cur + rng.pick([3, 4]));
    else cur = cur + Math.max(1, Math.ceil((peak - cur) / left)) * (rng.chance(0.15) && cur > start ? -1 : 1);
    if (i === peakIdx) cur = peak;
    out.push(cur);
  }
  for (let i = peakIdx + 1; i < n; i++) {
    const left = n - i;
    if (i === n - 1) cur = 0;
    else if (left > cur && rng.chance(0.3)) cur = cur + 1; // a turn
    else {
      let step = Math.ceil(cur / left);
      if (step > 1 && rng.chance(0.3)) step -= 1;
      cur -= Math.max(1, step);
    }
    out.push(cur);
  }
  return out;
}

const specCache = new Map<string, BossSpec>();

/** Build (deterministically) the spec for a boss id. */
export function bossSpec(id: string): BossSpec {
  const hit = specCache.get(id);
  if (hit) return hit;
  const rng = new Rng(hashString(`bell-of-the-unlived/${id}`));
  const region: BossRegion = BOSS_REGION[id] ?? rng.pick(['army', 'academy', 'cathedral', 'treasury', 'household'] as const);
  const P = PROFILES[region];
  const modeName = rng.pick(P.modes);
  const rivalName = rng.pick(P.rivals.filter((m) => m !== modeName));
  const thirdName = rng.pick(P.thirds);
  const n = rng.int(6, 9);
  const durs = genRhythm(rng, n);
  const contour = genContour(rng, n);
  const motif: Array<[number, number, number]> = [];
  let b = 0;
  for (let i = 0; i < n; i++) {
    motif.push([b, contour[i]!, durs[i]!]);
    b += durs[i]!;
  }
  const last = motif[n - 1]!;
  const answer: Array<[number, number, number]> = [...motif.slice(0, n - 1).map((x) => [...x] as [number, number, number]),
    [last[0], -1, last[2] / 2], [last[0] + last[2] / 2, -3, last[2] / 2]];
  const spec: BossSpec = {
    id, region, motif, answer,
    tonic: rng.pick(P.tonics),
    mode: MODES[modeName], rivalMode: MODES[rivalName], thirdMode: MODES[thirdName],
    rivalShift: rng.pick([4, 6, 3, 8]),
    bpm: Math.round(rng.range(P.tempo[0], P.tempo[1])),
    prog: rng.pick(PROGS),
    ost: rng.pick(OSTS),
    pal: { lead: rng.pick(P.lead), counter: rng.pick(P.counter), ost: rng.pick(P.ost), perc: P.perc, harm: rng.pick(P.harm), choir: P.choir },
    drumVar: rng.int(0, 2),
    detune: rng.range(18, 35),
    names: { mode: modeName, rival: rivalName, third: thirdName },
  };
  specCache.set(id, spec);
  return spec;
}

/** Per-phase view of a spec (Aldren's three reigns override mode, tempo and palette). */
function phaseSpec(sp: BossSpec, phase: number): BossSpec & { slow: boolean } {
  if (sp.id !== 'aldren') {
    const bpm = phase === 1 ? sp.bpm : Math.min(164, Math.round(sp.bpm * (phase === 2 ? 1.1 : 1.14)));
    return { ...sp, bpm, slow: false };
  }
  if (phase === 1) {
    // The Young Conqueror: the royal motif as a Mixolydian fanfare.
    return {
      ...sp, mode: MODES.mixolydian, bpm: 144, slow: false,
      pal: { lead: 'brass', counter: 'strings', ost: 'strings', perc: 'war', harm: 'pad', choir: false },
    };
  }
  if (phase === 2) {
    // The Sorcerer-King: Phrygian, choir and bells; the young version contests it a tritone away.
    return {
      ...sp, mode: MODES.phrygian, rivalMode: MODES.mixolydian, rivalShift: 6, bpm: 126, slow: false,
      pal: { lead: 'choir', counter: 'brass', ost: 'strings', perc: 'bells', harm: 'organ', choir: true },
    };
  }
  // The Ancient King: Locrian, slow and immense; both earlier reigns flicker above him.
  return {
    ...sp, mode: MODES.phrygian, rivalMode: MODES.mixolydian, rivalShift: 6, thirdMode: MODES.locrian, bpm: 78, slow: true, detune: 30,
    pal: { lead: 'brass', counter: 'bells', ost: 'strings', perc: 'bells', harm: 'choir', choir: true },
  };
}

/** Score factory. `from` = the previous music state (a lower phase of the same boss → stinger). */
export function bossScore(id: string, phase: number, out: MusicOut, from: MusicState): Score {
  const prev = parseBossState(from);
  return new BossTheme(out, phaseSpec(bossSpec(id), phase), phase, !!prev && prev.id === id && prev.phase < phase);
}

// ---------------------------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------------------------

/** Octaves above the tonic (octave 2) for each lead instrument. */
const LEAD_OCT: Record<Lead, number> = { brass: 12, strings: 24, choir: 24, harmonica: 36, bells: 36, organ: 24, harpsichord: 36, dulcimer: 36 };

const aug = (l: Line, k: number): Line => l.map(([b, d, len]) => [b * k, d, len * k] as const);

class BossTheme extends BaseScore {
  bpm: number;
  readonly stepsPerBeat = 4;
  private readonly intro: number;
  private readonly rivalTonic: number;
  /** A pitch (MIDI, octave 3) both versions share — where phase 2 converges. */
  private readonly common: number;
  private readonly third: Line;
  private readonly dim: Line;

  constructor(out: MusicOut, private readonly sp: BossSpec & { slow: boolean }, private readonly phase: number, fromPrev: boolean) {
    super(out);
    this.bpm = sp.bpm;
    this.intro = fromPrev ? 2 : 0;
    this.rivalTonic = sp.tonic + sp.rivalShift;
    this.third = aug(sp.motif, 2);
    this.dim = aug(sp.motif.slice(0, 4), 0.5);
    const rivalPcs = new Set(sp.rivalMode.map((x) => (this.rivalTonic + x) % 12));
    const cand = [4, 0, 2, 3, 5, 6, 1].map((d) => sp.tonic + 12 + deg(sp.mode, d));
    this.common = cand.find((m) => rivalPcs.has(m % 12)) ?? sp.tonic + 19;
  }

  // ---- instrument dispatch ----

  private voice(kind: Lead, t: number, midi: number, dur: number, vel: number, pan = 0, cents = 0): void {
    const f = mtof(midi) * Math.pow(2, cents / 1200);
    const o = this.out;
    switch (kind) {
      case 'brass': brass(o, t, f, dur * 0.92, vel, { pan }); break;
      case 'strings': strings(o, t, f, dur * 0.95, vel * 0.95, { attack: 0.05, release: 0.35, bright: 1.2, pan }); break;
      case 'choir': choir(o, t, [f], dur + 0.05, vel * 0.95, { vowel: 'a', to: 'o', attack: 0.07, release: 0.5, wet: 0.9 }); break;
      case 'harmonica': harmonica(o, t, f, dur * 0.95, vel * 1.1, { pan, attack: 0.04, release: 0.8 }); break;
      case 'bells': mbell(o, t, f, vel * 0.9, { decay: 2.5 + dur, pan }); break;
      case 'organ': organ(o, t, [f], dur * 0.95, vel * 1.2, { attack: 0.04, release: 0.3, wet: 0.6 }); break;
      case 'harpsichord': harpsichord(o, t, f, vel, { pan }); break;
      case 'dulcimer': dulcimer(o, t, f, vel * 1.1, { pan }); break;
    }
  }

  /** Play the notes of `line` (degrees) that start on phrase step `ps`. */
  private line(kind: Lead, line: Line, ps: number, tonic: number, mode: readonly number[], t: number, vel: number,
    o: { pan?: number; oct?: number; detune?: number } = {}): void {
    if (ps < 0) return;
    for (const [d, len] of notesAt(line, ps, 4)) {
      const cents = o.detune ? rand(-1, 1) * o.detune : 0;
      this.voice(kind, t, tonic + LEAD_OCT[kind] + (o.oct ?? 0) + deg(mode, d), this.b(len), vel, o.pan ?? 0, cents);
    }
  }

  // ---- harmony ----

  /** Bass root (MIDI, octave 2) and triad (octave 3) for bar k. */
  private chord(k: number): { root: number; notes: number[] } {
    const sp = this.sp;
    let tonic = sp.tonic;
    let mode = sp.mode;
    let d = sp.prog[k]!;
    if (this.phase === 2) {
      if ((k >= 4 && k < 8) || (k >= 8 && k < 12 && k % 2 === 1)) { tonic = this.rivalTonic; mode = sp.rivalMode; }
    } else if (this.phase === 3) {
      if (k < 4) d = 0;
      else if (k < 8) { mode = sp.thirdMode; d = [0, 0, 1, 4][k - 4]!; }
      else if (k < 12) { d = 0; if (k % 2) tonic = sp.tonic + 6; }
      else if (k === 13) { tonic = this.rivalTonic; mode = sp.rivalMode; d = 0; }
    }
    let root = tonic + deg(mode, d);
    while (root > 45) root -= 12;
    while (root < 33) root += 12;
    const tri = degTriad(mode, d).map((x) => x - deg(mode, d));
    return { root, notes: tri.map((x) => root + 12 + x) };
  }

  private harmony(k: number, s: number, t: number, pass: number): void {
    const { root, notes } = this.chord(k);
    const barDur = this.b(4);
    const pal = this.sp.pal;
    if (s !== 0) return;
    const cadence = k === 15;
    if (!cadence) {
      switch (pal.harm) {
        case 'pad': pad(this.out, t, notes.map(mtof), barDur, 0.8, { attack: 0.1, release: 0.45, cutoff: 1400, wet: 0.35 }); break;
        case 'organ': organ(this.out, t, notes.map(mtof), barDur, 0.75, { attack: 0.08, release: 0.4, wet: 0.6, pedal: k % 4 === 0 }); break;
        case 'choir':
          if (k % 2 === 0) choir(this.out, t, notes.map((m) => mtof(m + 12)), this.b(8) + 0.2, 0.6, { vowel: 'a', to: k % 4 ? 'o' : 'u', attack: 0.35, release: 1 });
          pad(this.out, t, notes.map(mtof), barDur, 0.5, { attack: 0.1, release: 0.4, cutoff: 900, wet: 0.35 });
          break;
        case 'glass':
          pad(this.out, t, notes.map(mtof), barDur, 0.55, { attack: 0.1, release: 0.4, cutoff: 1100, wet: 0.35 });
          if (k % 4 === 0) notes.forEach((m) => glass(this.out, t, mtof(m + 24), this.b(15), 0.45));
          break;
      }
    }
    // Sub drone under phase 3 (and the slow Ancient King).
    if (this.phase === 3 && k % 8 === 0) subDrone(this.out, t, mtof(this.sp.tonic - 12), this.b(32), 0.28, { attack: 1, release: 3 });
    if (k % 2 === 0 || cadence) timpani(this.out, t, mtof(root), 0.8);
    if (pal.choir && this.phase >= 2 && k >= 8 && k < 12 && pal.harm !== 'choir') {
      choir(this.out, t, notes.map((m) => mtof(m + 12)), barDur + 0.2, 0.55, { vowel: 'a', to: 'o', attack: 0.3, release: 1 });
    }
    // Top of the form: a crash-like strike (every pass in phases 2–3, from the second pass in phase 1).
    if ((pass > 0 || this.phase >= 2) && k === 0) {
      if (pal.perc !== 'bells') mbell(this.out, t, mtof(this.sp.tonic + 12), 0.8, { church: true, decay: 6, wet: 1 });
      if (this.phase === 2) taiko(this.out, t, 0.9, { f: 50 }); // phase 3's half-time drums already hit here
    }
  }

  // ---- ostinato ----

  private ostinato(k: number, s: number, t: number, pass: number): void {
    if (k === 15 && s >= 8) return;
    const sixteenths = this.phase >= 2 || this.sp.slow;
    if (!sixteenths && s % 2 === 1) return;
    if (this.phase === 1 && pass > 0 && pass % 3 === 2 && k < 2) return; // a sparse intro now and then
    const { root } = this.chord(k);
    const iv = sixteenths ? [0, 0, 12, 0][s % 4]! : this.sp.ost[s / 2]!;
    const accent = sixteenths ? s % 4 === 0 : s % 8 === 0;
    const f = mtof(root + 12 + iv);
    const vel = accent ? 0.85 : sixteenths ? 0.45 : 0.6;
    switch (this.sp.pal.ost) {
      case 'strings': strings(this.out, t, f, sixteenths ? 0.07 : 0.11, vel, { attack: 0.01, release: 0.1, bright: 1.35, wet: 0.18 }); break;
      case 'harpsichord': harpsichord(this.out, t, f * 2, vel * 0.8, { decay: sixteenths ? 0.35 : 0.5, four: false }); break;
      case 'dulcimer': dulcimer(this.out, t, f * 2, vel * 0.75, sixteenths ? { decay: 0.5, lite: true } : { decay: 0.8 }); break;
      case 'glass': glassPluck(this.out, t, f * 4, vel * 0.55, { decay: 0.5, wet: 0.5, lite: true }); break;
      case 'brass': brass(this.out, t, f, 0.1, vel * 0.7, { wet: 0.2 }); break;
    }
    // A low string anchor under non-string ostinati.
    if (this.sp.pal.ost !== 'strings' && accent && s % 8 === 0) strings(this.out, t, mtof(root + 12), 0.2, 0.6, { attack: 0.01, release: 0.15, bright: 1, wet: 0.2 });
  }

  // ---- drums ----

  private drums(k: number, s: number, t: number): void {
    const sp = this.sp;
    const dense = this.phase >= 2 && !sp.slow;
    const half = this.phase === 3 && !sp.slow;
    const v = sp.drumVar;
    if (half) {
      // Half-time: heavy downbeats and backbeat on 3, 16th ghosts.
      if (s === 0) taiko(this.out, t, 1.25, { f: 50 });
      if (s === 8) { taiko(this.out, t, 0.9); snare(this.out, t, 0.75); }
      if (s === 6 || s === 14) taiko(this.out, t, 0.4);
      if (s % 2 === 1 && Math.random() < 0.25) snare(this.out, t, 0.12);
    } else if (dense && s % 2 === 0) {
      taiko(this.out, t, s === 0 || s === 8 ? 1 : 0.4);
    }
    switch (sp.pal.perc) {
      case 'war': {
        if (!dense && !half) {
          const pat = [{ 0: 1, 6: 0.55, 8: 0.9, 10: 0.45, 14: 0.4 }, { 0: 1, 3: 0.4, 8: 0.9, 11: 0.5 }, { 0: 1, 8: 0.8, 10: 0.6, 12: 0.4 }][v] as Record<number, number>;
          if (pat[s] !== undefined) taiko(this.out, t, pat[s]! * (k % 4 === 0 && s === 0 ? 1.2 : 1));
        }
        if (!half && k >= 4 && (s === 4 || s === 12)) snare(this.out, t, 0.6);
        if (!half && (s === 13 || s === 15) && Math.random() < 0.5) snare(this.out, t, 0.18);
        if (k % 4 === 3 && s === 12) snareRoll(this.out, t, this.b(1), 0.15, 0.7);
        break;
      }
      case 'procession': {
        if (!dense && !half && (s === 0 || s === 8)) taiko(this.out, t, s === 0 ? 1 : 0.75, { f: 52 });
        if (!half && s === 12 && (dense || v === 1)) taiko(this.out, t, 0.45);
        if (!half && k >= 4 && s === 8 && v !== 2) snare(this.out, t, 0.35, { tone: 0.8 });
        if (k % 4 === 0 && s === 0) mbell(this.out, t, mtof(sp.tonic + 12), 0.6, { church: true, decay: 7, wet: 1.1 });
        break;
      }
      case 'clockwork': {
        mechanism(this.out, t, s % 4 === 0 ? 0.3 : 0.14, s % 8 === 0 ? 1 : 0.85);
        if (!dense && !half) {
          const pat = [{ 0: 1, 8: 0.8, 11: 0.45 }, { 0: 1, 6: 0.5, 8: 0.8 }, { 0: 1, 10: 0.6 }][v] as Record<number, number>;
          if (pat[s] !== undefined) taiko(this.out, t, pat[s]!);
        }
        if (!half && (s === 4 || s === 12)) clang(this.out, t, 480 + v * 60, 0.55, { pan: s === 4 ? -0.3 : 0.3 });
        if (k % 4 === 3 && s === 8) ratchet(this.out, t, 10, this.b(2), 0.22, 1.3, true);
        break;
      }
      case 'court': {
        if (!dense && !half && (s === 0 || s === 8)) taiko(this.out, t, s === 0 ? 0.8 : 0.5);
        if (!half && (s === 4 || s === 12)) snare(this.out, t, 0.55, { tone: 1.15 });
        if (!half && s % 4 === 2 && Math.random() < 0.6) snare(this.out, t, 0.14, { tone: 1.15 });
        if (k % 4 === 3 && s === 12) snareRoll(this.out, t, this.b(1), 0.1, 0.5, 1 / 22);
        break;
      }
      case 'glass': {
        if (!dense && !half && (s === 0 || (s === 10 && v !== 1))) taiko(this.out, t, s === 0 ? 1 : 0.5);
        if (!half && s === 12) snare(this.out, t, 0.45, { tone: 1.3 });
        if (s % 4 === 2) mechanism(this.out, t, 0.12, 1.9);
        if (s === 6 && Math.random() < 0.3) glassPluck(this.out, t, mtof(sp.tonic + 48 + deg(sp.mode, pick([0, 2, 4]))), 0.5, { decay: 1.2, pan: rand(-0.6, 0.6) });
        break;
      }
      case 'bells': {
        if (!dense && !half) {
          const pat = sp.slow ? { 0: 1.2, 8: 0.9 } : ({ 0: 1, 6: 0.5, 8: 0.8 } as Record<number, number>);
          if ((pat as Record<number, number>)[s] !== undefined) taiko(this.out, t, (pat as Record<number, number>)[s]!, { f: 48 });
        }
        if (!half && !sp.slow && s === 12) snare(this.out, t, 0.4, { tone: 0.85 });
        if (k % 2 === 0 && s === 0) {
          if ((sp.slow || this.phase === 3) && k % 4 === 0) greatBell(this.out, t, mtof(sp.tonic), 0.75, { decay: 10, drift: 14 });
          else mbell(this.out, t, mtof(sp.tonic + 12 + (k % 4 ? 7 : 0)), 0.8, { church: true, decay: 6, wet: 1 });
        }
        if (sp.slow && k % 4 === 3 && s === 8) timpaniRoll(this.out, t, mtof(sp.tonic), this.b(2), 0.15, 0.8);
        break;
      }
    }
  }

  // ---- themes per phase ----

  private themes1(k: number, s: number, t: number, pass: number): void {
    const sp = this.sp;
    const ph = (k % 2) * this.stepsPerBar + s;
    const { lead, counter } = sp.pal;
    const up = pass % 2 ? 12 : 0;
    if (k === 4 || k === 5) this.line(lead, sp.motif, ph, sp.tonic, sp.mode, t, 0.85, { oct: lead === 'brass' ? up : 0 });
    if (k === 6 || k === 7) this.line(lead, sp.answer, ph, sp.tonic, sp.mode, t, 0.85);
    if (k === 8 || k === 9) this.line(counter, sp.motif, ph, sp.tonic, sp.mode, t, 0.8, { oct: counter === 'brass' ? 12 : 0 });
    if (k === 10 || k === 11) {
      // Development: the head of the motif in sequence, a degree higher each half bar.
      const head = sp.motif.filter(([b]) => b < 2);
      const seg = Math.floor(ph / 8);
      const shifted: Line = head.map(([b, d, len]) => [b, d + seg, Math.min(len, 2 - b)] as const);
      this.line(seg % 2 ? counter : lead, shifted, ph % 8, sp.tonic, sp.mode, t, 0.75);
    }
    if (k === 12 || k === 13) {
      this.line(lead, sp.motif, ph, sp.tonic, sp.mode, t, 0.9);
      this.line(counter, sp.motif, ph, sp.tonic, sp.mode, t, 0.6, { oct: 12 });
    }
    if (k === 0 && pass > 0 && pass % 2 === 1) this.line(counter, sp.motif, ph, sp.tonic, sp.mode, t, 0.5, { oct: 12 });
    this.cadence(k, s, t);
  }

  private themes2(k: number, s: number, t: number, pass: number): void {
    const sp = this.sp;
    const ph = (k % 2) * this.stepsPerBar + s;
    const { lead, counter } = sp.pal;
    const orig = (ps: number, vel: number, o: { oct?: number } = {}) => this.line(lead, sp.motif, ps, sp.tonic, sp.mode, t, vel, { pan: -0.25, ...o });
    const rival = (ps: number, vel: number) => {
      this.line(counter, sp.motif, ps, this.rivalTonic, sp.rivalMode, t, vel, { pan: 0.3 });
      if (counter !== 'brass') this.line('brass', sp.motif, ps, this.rivalTonic, sp.rivalMode, t, vel * 0.5, { pan: 0.3 });
    };
    if (k === 0 || k === 1) orig(ph, 0.95, { oct: pass % 2 ? 12 : 0 });
    if (k <= 2) rival(k * this.stepsPerBar + s - 8, 0.75); // canon: two beats behind
    if (k === 4 || k === 5) rival(ph, 0.85);
    if (k === 6 || k === 7) this.line(lead, sp.answer, ph, sp.tonic, sp.mode, t, 0.85);
    if (k === 8 || k === 9) {
      orig(ph, 1);
      rival(ph, 0.8);
    }
    if (k === 10 || k === 11) {
      // Fragments trading every two beats: the struggle over the motif's head.
      const seg = Math.floor(ph / 8);
      const head = sp.motif.filter(([b]) => b < 2);
      if (seg % 2 === 0) this.line(lead, head, ph % 8, sp.tonic, sp.mode, t, 0.8, { oct: seg >= 2 ? 12 : 0 });
      else this.line(counter, head, ph % 8, this.rivalTonic, sp.rivalMode, t, 0.75, { oct: seg >= 2 ? 12 : 0 });
    }
    if (k === 12 || k === 13) {
      orig(ph, 0.95);
      rival(ph - 4, 0.7); // tighter canon: one beat behind
    }
    if (k === 14 && s < 8) rival(s, 0.7); // interrupted
    // Bar 15: both converge on their common tone.
    if (k === 15 && s === 8) {
      brass(this.out, t, mtof(this.common - 12), this.b(2), 1, { bite: 1.4 });
      brass(this.out, t, mtof(this.common), this.b(2), 0.9);
      strings(this.out, t, mtof(this.common + 12), this.b(2), 0.8, { attack: 0.03, bright: 1.3 });
      timpaniRoll(this.out, t, mtof(this.sp.tonic + 7 > 45 ? this.sp.tonic - 5 : this.sp.tonic + 7), this.b(2), 0.3, 1);
    }
    if (k === 15 && s === 0) taiko(this.out, t, 1.1);
  }

  private themes3(k: number, s: number, t: number, pass: number): void {
    const sp = this.sp;
    const ph = (k % 2) * this.stepsPerBar + s;
    const ph4 = (k % 4) * this.stepsPerBar + s;
    const { lead, counter } = sp.pal;
    const det = sp.detune;
    const third = (ps: number, vel: number) => {
      this.line('brass', this.third, ps, sp.tonic, sp.thirdMode, t, vel, { detune: det, pan: -0.1 });
      if (sp.pal.choir) this.line('choir', this.third, ps, sp.tonic - 12, sp.thirdMode, t, vel * 0.7, { detune: det });
      else this.line('strings', this.third, ps, sp.tonic - 12, sp.thirdMode, t, vel * 0.7, { detune: det, pan: 0.1 });
    };
    // 0–3: diminished heads of the first two versions answering each other, high and fast.
    if (k < 4) {
      const half = Math.floor(s / 8);
      const fromOrig = (k * 2 + half) % 2 === 0;
      if (fromOrig) this.line(lead, this.dim, s % 8, sp.tonic, sp.mode, t, 0.7, { oct: lead === 'brass' ? 12 : 0, pan: -0.35 });
      else this.line(counter, this.dim, s % 8, this.rivalTonic, sp.rivalMode, t, 0.65, { oct: counter === 'brass' ? 12 : 0, pan: 0.35 });
    }
    // 4–7: the third version, augmented, in the depths.
    if (k >= 4 && k < 8) third(ph4, 1);
    // 8–11: all three at once.
    if (k >= 8 && k < 12) {
      third(ph4, 0.9);
      this.line(lead, sp.motif, ph, sp.tonic, sp.mode, t, 0.75, { oct: 12 });
      if (k === 9 || k === 10) this.line(counter, sp.motif, ((k - 9) * this.stepsPerBar + s), this.rivalTonic, sp.rivalMode, t, 0.6, { oct: 12, pan: 0.35 });
    }
    // 12–13: the original and the rival together, the third's head beneath.
    if (k === 12 || k === 13) {
      this.line(lead, sp.motif, ph, sp.tonic, sp.mode, t, 0.9);
      this.line(counter, sp.motif, ph, this.rivalTonic, sp.rivalMode, t, 0.75, { pan: 0.3 });
      if (k === 12) third(s, 0.8);
    }
    // 14–15: detuned cluster stabs, then a roll back to the top.
    if (k === 14 && (s === 0 || s === 6 || s === 12)) {
      for (const m of [sp.tonic + 12, sp.tonic + 13, sp.tonic + 18]) brass(this.out, t, mtof(m) * Math.pow(2, rand(-1, 1) * det / 1200), this.b(0.6), 0.85, { bite: 1.3 });
      taiko(this.out, t, 1.1, { f: 46 });
    }
    if (k === 15 && s === 0) {
      timpaniRoll(this.out, t, mtof(sp.tonic), this.b(4), 0.2, 1);
      riser(this.out, t + this.b(1), this.b(3), 0.8, mtof(sp.tonic));
    }
    if (pass > 0 && k === 0 && s === 0 && !sp.slow) greatBell(this.out, t, mtof(sp.tonic + 12), 0.5, { decay: 8, drift: 20 });
  }

  /** Phase 1 bar 14–15: roll into the dominant, stabs, roll back. */
  private cadence(k: number, s: number, t: number): void {
    const sp = this.sp;
    if (k === 14 && s === 8) timpaniRoll(this.out, t, mtof(sp.tonic + 7 > 45 ? sp.tonic - 5 : sp.tonic + 7), this.b(2), 0.15, 0.6);
    if (k === 15) {
      if (s === 0 || s === 3 || s === 6) {
        const dom = sp.tonic + 12 + deg(sp.mode, 4);
        for (const m of degTriad(sp.mode, 4).map((x) => x - deg(sp.mode, 4) + dom)) brass(this.out, t, mtof(m), this.b(0.5), 0.9, { bite: 1.3 });
        taiko(this.out, t, 1);
      }
      if (s === 8) timpaniRoll(this.out, t, mtof(sp.tonic), this.b(2), 0.2, 0.9);
    }
  }

  // ---- phase-change stinger (two bars) ----

  private transition(bar: number, s: number, t: number): void {
    const sp = this.sp;
    const other = this.phase === 2 ? this.rivalTonic : sp.tonic + 6;
    if (bar === 0 && s === 0) {
      if (this.phase === 3 || sp.pal.perc === 'bells') greatBell(this.out, t, mtof(sp.tonic), 0.85, { decay: 12, drift: this.phase === 3 ? 40 : 14 });
      else mbell(this.out, t, mtof(sp.tonic), 1, { church: true, decay: 10, wet: 1.2 });
      taiko(this.out, t, 1.3, { f: 45 });
      pad(this.out, t, [sp.tonic + 12, sp.tonic + 13, sp.tonic + 19, other + 12].map(mtof), this.b(8), 0.9, { attack: this.b(6), release: 0.4, cutoff: 1800 });
      timpaniRoll(this.out, t + this.b(1), mtof(sp.tonic), this.b(7), 0.1, 1);
      riser(this.out, t + this.b(2), this.b(6), 1, mtof(sp.tonic));
      if (this.phase === 3) {
        subDrone(this.out, t, mtof(sp.tonic - 12), this.b(10), 0.45, { attack: 0.5, release: 2 });
        choir(this.out, t + this.b(2), [sp.tonic + 12, sp.tonic + 18, sp.tonic + 25].map(mtof), this.b(6), 0.7, { vowel: 'u', to: 'a', attack: this.b(5), release: 0.5, size: 0.85 });
      }
    }
    if (bar === 1 && s === 0) {
      if (sp.pal.perc === 'bells' || sp.pal.perc === 'procession') timpaniRoll(this.out, t, mtof(sp.tonic + 7 > 45 ? sp.tonic - 5 : sp.tonic + 7), this.b(4), 0.2, 1);
      else snareRoll(this.out, t, this.b(4), 0.1, 0.9, 1 / 24);
    }
    if (bar === 1) {
      // First glimpse of the new version, alone over the roll.
      if (this.phase === 2) {
        const head = sp.motif.filter(([b]) => b < 4);
        this.line(sp.pal.counter, head, s, this.rivalTonic, sp.rivalMode, t, 0.75, { pan: 0.3 });
      } else {
        const head = this.third.filter(([b]) => b < 4);
        this.line('brass', head, s, sp.tonic, sp.thirdMode, t, 0.95, { detune: sp.detune });
      }
    }
  }

  protected onStep(barRaw: number, s: number, t: number): void {
    if (barRaw < this.intro) return this.transition(barRaw, s, t);
    const bar = barRaw - this.intro;
    const pass = Math.floor(bar / 16);
    const k = bar % 16;
    this.harmony(k, s, t, pass);
    this.ostinato(k, s, t, pass);
    this.drums(k, s, t);
    if (this.phase === 1) this.themes1(k, s, t, pass);
    else if (this.phase === 2) this.themes2(k, s, t, pass);
    else this.themes3(k, s, t, pass);
  }
}

/** Describe a boss theme (preview tool / debugging): mode names, tempo, motif as note names. */
export function describeBoss(id: string): string {
  const sp = bossSpec(normaliseBossId(id));
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const notes = sp.motif.map(([, d]) => names[(sp.tonic + deg(sp.mode, d)) % 12]).join(' ');
  if (sp.id === 'aldren') {
    return `aldren [belfry] royal motif ${notes} (in degrees) → phase 1 D Mixolydian 144 bpm (young conqueror), ` +
      'phase 2 D Phrygian 126 bpm vs the young version in G# Mixolydian (sorcerer-king), phase 3 D Locrian augmented, 78 bpm (ancient king)';
  }
  return `${sp.id} [${sp.region}] ${names[sp.tonic % 12]} ${sp.names.mode}, rival ${names[(sp.tonic + sp.rivalShift) % 12]} ${sp.names.rival}, third ${sp.names.third}; ${sp.bpm} bpm; ${sp.pal.lead}/${sp.pal.counter}/${sp.pal.ost}/${sp.pal.perc}; motif ${notes}`;
}
