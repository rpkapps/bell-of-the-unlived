/**
 * Audio preview & offline level check.
 *   npx vite --port 5181 --strictPort  →  http://127.0.0.1:5181/tools/preview/audio.html
 *
 * Also exposes window.__levelCheck / __musicCheck / __loopCheck for headless automation: each
 * renders through an OfflineAudioContext (dynamics bypassed) and returns peak / RMS figures.
 */
import { Vector3 } from 'three';
import { Audio, EXTRA_CUES, formatCaption, type ExtraCueId } from '../../src/audio/Audio';
import { CUES, CUE_CAPTIONS, type AmbienceId, type CueId, type LoopCueId, type LoopHandle, type MusicState } from '../../src/audio/contract';
import { BOSS_REGION, describeBoss } from '../../src/audio/music/bosses';
import * as INS from '../../src/audio/music/instruments';
import { NoiseBank } from '../../src/audio/engine/noise';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const audio = new Audio();
const LOOPS: LoopCueId[] = ['amb_wind', 'amb_fire', 'amb_interior', 'amb_hospice', 'amb_battlefield', 'amb_undercroft', 'stillbell_hum', 'fog_hum', 'forge', 'brazier'];
const MUSIC: MusicState[] = ['none', 'title', 'intro', 'ashbridge', 'hospice', 'boss1', 'boss2', 'victory', 'battlefield',
  'army', 'academy', 'cathedral', 'treasury', 'household', 'belfry', 'ending'];
const BOSSES = ['corvane', ...Object.keys(BOSS_REGION)];
const AMB: AmbienceId[] = ['none', 'outdoor', 'interior', 'undercroft', 'hospice', 'arena', 'battlefield',
  'snow', 'sea', 'nave', 'vault', 'garden', 'belfry'];

const vols = { master: 0.9, music: 0.7, sfx: 0.9, ambience: 0.8, voice: 1, ui: 0.7, mono: false };

// ---- listener / source ------------------------------------------------------------------------
const source = new Vector3(4, 0, -4);
function updateListener(): void {
  const yaw = (Number($<HTMLInputElement>('yaw').value) * Math.PI) / 180;
  $('yawV').textContent = `${$<HTMLInputElement>('yaw').value}°`;
  const fwd = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  audio.setListener(new Vector3(0, 0, 0), fwd, new Vector3(0, 1, 0));
  for (const k of ['sx', 'sy', 'sz'] as const) $(`${k}V`).textContent = $<HTMLInputElement>(k).value;
  source.set(Number($<HTMLInputElement>('sx').value), Number($<HTMLInputElement>('sy').value), Number($<HTMLInputElement>('sz').value));
  for (const h of loopHandles.values()) h.setPos(source);
}
for (const id of ['yaw', 'sx', 'sy', 'sz']) $(id).addEventListener('input', updateListener);

// ---- captions ---------------------------------------------------------------------------------
audio.onCaption((text, dir) => {
  const log = $('log');
  log.textContent = `${new Date().toLocaleTimeString()}  ${formatCaption(text, dir)}\n${log.textContent ?? ''}`.slice(0, 4000);
});

// ---- unlock -----------------------------------------------------------------------------------
$('unlock').addEventListener('click', async () => {
  await audio.unlock();
  $('status').textContent = audio.ready ? `running @ ${audio.context?.sampleRate} Hz` : 'failed';
  updateListener();
});
const autoUnlock = () => { void audio.unlock().then(() => { $('status').textContent = audio.ready ? `running @ ${audio.context?.sampleRate} Hz` : 'locked'; }); };
window.addEventListener('pointerdown', autoUnlock, { once: true });
window.addEventListener('keydown', autoUnlock, { once: true });

// ---- cue buttons ------------------------------------------------------------------------------
function playOpts() {
  return {
    surface: $<HTMLSelectElement>('surface').value as 'stone',
    rate: Number($<HTMLInputElement>('rate').value),
    volume: Number($<HTMLInputElement>('vol').value),
    pos: $<HTMLInputElement>('use3d').checked ? source.clone() : undefined,
  };
}
$('rate').addEventListener('input', () => { $('rateV').textContent = $<HTMLInputElement>('rate').value; });
const cueBox = $('cues');
let group = '';
const groups: Record<string, string> = {
  ui_move: 'UI', step: 'Movement', swing_light: 'Melee', cast_shard: 'Magic & tools', enemy_alert: 'Enemies',
  player_hurt: 'Player state', stillbell_ring: 'World',
};
for (const cue of CUES) {
  if (groups[cue] && groups[cue] !== group) {
    group = groups[cue]!;
    const h = document.createElement('h3');
    h.textContent = group;
    cueBox.appendChild(h);
  }
  const b = document.createElement('button');
  b.textContent = cue;
  if (CUE_CAPTIONS[cue]) b.classList.add('cap');
  b.addEventListener('click', () => audio.play(cue, playOpts()));
  cueBox.appendChild(b);
}

{
  const h = document.createElement('h3');
  h.textContent = 'Extra cues (Audio.playExtra)';
  cueBox.appendChild(h);
  for (const cue of EXTRA_CUES) {
    const b = document.createElement('button');
    b.textContent = cue;
    b.classList.add('cap');
    b.addEventListener('click', () => audio.playExtra(cue, playOpts()));
    cueBox.appendChild(b);
  }
}

// ---- loops, beds, music -----------------------------------------------------------------------
const loopHandles = new Map<LoopCueId, LoopHandle>();
for (const id of LOOPS) {
  const b = document.createElement('button');
  b.textContent = id;
  b.addEventListener('click', () => {
    const h = loopHandles.get(id);
    if (h) {
      h.stop(1.5);
      loopHandles.delete(id);
      b.classList.remove('on');
    } else {
      loopHandles.set(id, audio.loop(id, { pos: $<HTMLInputElement>('use3d').checked ? source.clone() : undefined }));
      b.classList.add('on');
    }
  });
  $('loops').appendChild(b);
}
function radio(box: HTMLElement, ids: readonly string[], onPick: (id: string) => void): void {
  for (const id of ids) {
    const b = document.createElement('button');
    b.textContent = id;
    b.addEventListener('click', () => {
      for (const x of box.querySelectorAll('button')) x.classList.remove('on');
      b.classList.add('on');
      onPick(id);
    });
    box.appendChild(b);
  }
}
radio($('amb'), AMB, (id) => audio.setAmbience(id as AmbienceId));
radio($('music'), MUSIC, (id) => audio.setMusic(id as MusicState));

// Procedural boss themes: pick a boss id (or type any id), then a phase.
{
  const box = $('bossMusic');
  const sel = document.createElement('select');
  for (const id of BOSSES) sel.appendChild(new Option(id, id));
  const custom = document.createElement('input');
  custom.placeholder = 'or any id…';
  custom.size = 12;
  const info = document.createElement('div');
  info.style.cssText = 'color:var(--dim);font-size:11px;margin-top:4px';
  const id = () => custom.value.trim() || sel.value;
  const describe = () => { info.textContent = id() === 'corvane' ? 'corvane: hand-written boss1/boss2' : describeBoss(id()); };
  sel.addEventListener('change', describe);
  custom.addEventListener('input', describe);
  box.append(sel, custom);
  for (const ph of [1, 2, 3]) {
    const b = document.createElement('button');
    b.textContent = `phase ${ph}`;
    b.addEventListener('click', () => {
      for (const x of document.querySelectorAll('#music button, #bossMusic button')) x.classList.remove('on');
      b.classList.add('on');
      audio.setMusic(`boss:${id()}:${ph}`, ph === 1 ? 0.5 : 0.2);
    });
    box.appendChild(b);
  }
  box.appendChild(info);
  describe();
}

// ---- toggles & volumes ------------------------------------------------------------------------
$('muffle').addEventListener('change', () => audio.setMenuMuffle($<HTMLInputElement>('muffle').checked));
$('mono').addEventListener('change', () => { vols.mono = $<HTMLInputElement>('mono').checked; audio.setVolumes(vols); });
$('hrtf').addEventListener('change', () => audio.setHrtf($<HTMLInputElement>('hrtf').checked));
for (const k of ['master', 'music', 'sfx', 'ambience', 'voice', 'ui'] as const) {
  const l = document.createElement('label');
  l.textContent = k;
  const r = document.createElement('input');
  r.type = 'range'; r.min = '0'; r.max = '1'; r.step = '0.01'; r.value = String(vols[k]);
  r.addEventListener('input', () => { vols[k] = Number(r.value); audio.setVolumes(vols); });
  l.appendChild(r);
  $('vols').appendChild(l);
  $('vols').appendChild(document.createElement('br'));
}
audio.setVolumes(vols);
$('stress').addEventListener('click', () => {
  for (let i = 0; i < 120; i++) {
    const cue = CUES[Math.floor(Math.random() * CUES.length)]!;
    setTimeout(() => audio.play(cue, { pos: new Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20), silentCaption: true }), i * 15);
  }
});
setInterval(() => { $('voices').textContent = String(audio.activeVoices); }, 200);
updateListener();

// =============================================================================================
// Offline level check
// =============================================================================================

export interface LevelRow { id: string; peakDb: number; rmsDb: number; stRmsDb: number; tailS: number; clip: number; error?: string; cpu?: number; quiet?: number }

const SR = 44100;
const FULL = { master: 1, music: 1, sfx: 1, ambience: 1, voice: 1, ui: 1, mono: false };
const toDb = (x: number) => (x > 0 ? 20 * Math.log10(x) : -120);

function analyse(id: string, buf: AudioBuffer): LevelRow {
  const n = buf.length;
  const chans = [buf.getChannelData(0), buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0)];
  let peak = 0;
  let clip = 0;
  let sum = 0;
  let lastLoud = 0;
  const win = Math.floor(SR * 0.05);
  let stMax = 0;
  let acc = 0;
  // Fraction of 1-s windows quieter than -45 dBFS (how much of a sparse theme is near-silence).
  let secAcc = 0;
  let secs = 0;
  let quietSecs = 0;
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (const c of chans) {
      const v = c[i]!;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      if (a >= 1) clip++;
      if (!Number.isFinite(v)) clip++;
      e += v * v;
    }
    e /= 2;
    sum += e;
    acc += e;
    if (Math.sqrt(e) > 0.001) lastLoud = i;
    if (i % win === win - 1) {
      stMax = Math.max(stMax, Math.sqrt(acc / win));
      acc = 0;
    }
    secAcc += e;
    if (i % SR === SR - 1) {
      secs++;
      if (Math.sqrt(secAcc / SR) < 0.0056) quietSecs++;
      secAcc = 0;
    }
  }
  // Integrated RMS over the sounding part only.
  const rms = Math.sqrt(sum / Math.max(1, lastLoud));
  return { id, peakDb: toDb(peak), rmsDb: toDb(rms), stRmsDb: toDb(stMax), tailS: lastLoud / SR, clip, quiet: secs ? quietSecs / secs : 0 };
}

/**
 * Render and analyse. `cpu` = wall-clock render time / audio duration (offline, single thread):
 * a rough upper bound on the audio-thread load the state adds in real time.
 */
/**
 * Render with a live-like scheduler: the context suspends every 0.5 s and the engine is pumped
 * one second ahead (like the real lookahead timer), so node counts match real-time playback.
 * `at`: [time (multiple of 0.5 s), action] pairs run at those suspension points.
 */
function liveRender(id: string, ctx: OfflineAudioContext, a: Audio, secs: number, at: Array<[number, () => void]> = []): Promise<LevelRow> {
  const LOOKAHEAD = 1;
  a.pump(LOOKAHEAD);
  for (let i = 1; i * 0.5 < secs; i++) {
    const t = i * 0.5;
    void ctx.suspend(t).then(() => {
      for (const [when, fn] of at) if (when === t) fn();
      a.pump(t + LOOKAHEAD);
      void ctx.resume();
    });
  }
  return timed(id, ctx, secs);
}

async function timed(id: string, ctx: OfflineAudioContext, secs: number): Promise<LevelRow> {
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  const row = analyse(id, buf);
  row.cpu = (performance.now() - t0) / 1000 / secs;
  return row;
}

const LONG: Partial<Record<CueId, number>> = {
  great_bell_toll: 20, stillbell_ring: 10, stillbell_rest: 10, unfinished_toll: 12, player_death: 9,
  anchor_shatter: 9, collapse_rumble: 7, memory_trigger: 8, posture_break: 5, drawbridge_slam: 5,
};

async function renderExtra(cue: ExtraCueId): Promise<LevelRow> {
  const ctx = new OfflineAudioContext(2, SR * 5, SR);
  const a = new Audio({ context: ctx, manualClock: true, bypassDynamics: true, hrtf: false });
  a.setVolumes(FULL);
  await a.unlock();
  a.playExtra(cue, { silentCaption: true });
  return analyse(cue, await ctx.startRendering());
}
async function extraCheck(): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  for (const cue of EXTRA_CUES) rows.push(await renderExtra(cue));
  return rows;
}

async function renderCue(cue: CueId): Promise<LevelRow> {
  const secs = LONG[cue] ?? 4;
  const ctx = new OfflineAudioContext(2, SR * secs, SR);
  const a = new Audio({ context: ctx, manualClock: true, bypassDynamics: true, hrtf: false });
  a.setVolumes(FULL);
  await a.unlock();
  let error: string | undefined;
  const orig = console.warn;
  console.warn = (...args: unknown[]) => { error = String(args[1] ?? args[0]); orig(...args); };
  a.play(cue, { silentCaption: true });
  console.warn = orig;
  const buf = await ctx.startRendering();
  const row = analyse(cue, buf);
  if (error) row.error = error;
  return row;
}

function table(rows: LevelRow[]): string {
  const pad = (s: string, n: number) => s.padEnd(n);
  const f = (x: number) => x.toFixed(1).padStart(6);
  return [
    `${pad('id', 22)}  peak    rms  stRms   tail  clip   cpu%  quiet%`,
    ...rows.map((r) => `${pad(r.id, 22)}${f(r.peakDb)}${f(r.rmsDb)}${f(r.stRmsDb)}${r.tailS.toFixed(1).padStart(6)}  ${String(r.clip).padEnd(4)}${r.cpu !== undefined ? (r.cpu * 100).toFixed(1).padStart(6) : ''}${r.quiet !== undefined ? (r.quiet * 100).toFixed(0).padStart(7) : ''}${r.error ? '  ERR ' + r.error : ''}`),
  ].join('\n');
}

async function levelCheck(filter?: string[]): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  for (const cue of CUES) {
    if (filter && !filter.includes(cue)) continue;
    try { rows.push(await renderCue(cue)); } catch (e) { rows.push({ id: cue, peakDb: 0, rmsDb: 0, stRmsDb: 0, tailS: 0, clip: 0, error: String(e) }); }
  }
  return rows;
}

/** Render music states (optionally "boss1>boss2" transitions) for `secs` seconds each. */
async function musicCheck(states: string[] = [...MUSIC.filter((m) => m !== 'none'), 'boss1>boss2',
  ...BOSSES.filter((b) => b !== 'corvane').flatMap((b) => [`boss:${b}:1`, `boss:${b}:2`, `boss:${b}:3`]), 'boss:varr:1>boss:varr:2', 'boss:aldren:2>boss:aldren:3'], secs = 30): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  for (const st of states) {
    const ctx = new OfflineAudioContext(2, SR * secs, SR);
    const a = new Audio({ context: ctx, manualClock: true, bypassDynamics: true, hrtf: false });
    a.setVolumes(FULL);
    await a.unlock();
    try {
      if (st.includes('>')) {
        const [s0, s1] = st.split('>') as [MusicState, MusicState];
        a.setMusic(s0, 0.1);
        rows.push(await liveRender(st, ctx, a, secs, [[Math.round(secs / 2), () => a.setMusic(s1, 0.2)]]));
      } else {
        a.setMusic(st as MusicState, 0.1);
        rows.push(await liveRender(st, ctx, a, secs));
      }
    } catch (e) {
      rows.push({ id: st, peakDb: 0, rmsDb: 0, stRmsDb: 0, tailS: 0, clip: 0, error: String(e) });
    }
  }
  return rows;
}

/** Render ambience loops and beds for `secs` seconds each. */
async function loopCheck(secs = 20, only?: string[]): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  const items: Array<[string, (a: Audio) => void]> = [
    ...LOOPS.map((id) => [id, (a: Audio) => { a.loop(id); }] as [string, (a: Audio) => void]),
    ...AMB.filter((x) => x !== 'none').map((id) => [`bed:${id}`, (a: Audio) => a.setAmbience(id, 0.1)] as [string, (a: Audio) => void]),
  ];
  for (const [id, start] of items) {
    if (only && !only.includes(id)) continue;
    const ctx = new OfflineAudioContext(2, SR * secs, SR);
    const a = new Audio({ context: ctx, manualClock: true, bypassDynamics: true, hrtf: false });
    a.setVolumes(FULL);
    await a.unlock();
    try {
      start(a);
      rows.push(await liveRender(id, ctx, a, secs));
    } catch (e) {
      rows.push({ id, peakDb: 0, rmsDb: 0, stRmsDb: 0, tailS: 0, clip: 0, error: String(e) });
    }
  }
  return rows;
}

/**
 * Instrument calibration: render one note/figure of each music instrument (dry + wet into a plain
 * mix, no reverb) and report its level — for balancing layers inside a score.
 */
type InstrFn = (o: INS.MusicOut, t: number) => void;
const INSTR: Record<string, InstrFn> = {
  pad3: (o, t) => INS.pad(o, t, [220, 262, 330], 2, 0.8),
  strings: (o, t) => INS.strings(o, t, 147, 2, 0.5),
  stringsHi: (o, t) => INS.strings(o, t, 523, 2, 0.4),
  brass: (o, t) => INS.brass(o, t, 147, 1, 0.85),
  brassLow: (o, t) => INS.brass(o, t, 87, 2, 0.4, { bite: 0.3 }),
  choir1: (o, t) => INS.choir(o, t, [196], 2, 0.55),
  taiko: (o, t) => INS.taiko(o, t, 1),
  snare: (o, t) => INS.snare(o, t, 0.6),
  timpani: (o, t) => INS.timpani(o, t, 73, 0.8),
  mbell: (o, t) => INS.mbell(o, t, 880, 0.7),
  drone: (o, t) => INS.drone(o, t, 73, 3, 0.5, { attack: 0.5 }),
  glass: (o, t) => INS.glass(o, t, 880, 3, 0.5),
  mechanism: (o, t) => INS.mechanism(o, t, 0.3),
  pluck: (o, t) => INS.pluck(o, t, 392, 0.6),
  harmonica: (o, t) => INS.harmonica(o, t, 880, 2, 0.4),
  glassPluck: (o, t) => INS.glassPluck(o, t, 1760, 0.5),
  organ3: (o, t) => INS.organ(o, t, [196, 233, 294], 2, 0.6, { attack: 0.3 }),
  harpsichord: (o, t) => INS.harpsichord(o, t, 392, 0.6),
  dulcimer: (o, t) => INS.dulcimer(o, t, 349, 0.35),
  pianoBell: (o, t) => INS.pianoBell(o, t, 880, 0.7),
  greatBell: (o, t) => INS.greatBell(o, t, 73.4, 1),
  subDrone: (o, t) => INS.subDrone(o, t, 36.7, 3, 0.5, { attack: 0.5 }),
  wash: (o, t) => INS.wash(o, t, 8, 0.7),
  clang: (o, t) => INS.clang(o, t, 500, 0.55),
};
async function instrumentCheck(names: string[] = Object.keys(INSTR)): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  for (const n of names) {
    const ctx = new OfflineAudioContext(2, SR * 6, SR);
    const bank = new NoiseBank(ctx);
    const out = { ctx, bank, dry: ctx.destination, wet: ctx.createGain() };
    INSTR[n]!(out, 0.05);
    rows.push(analyse(n, await ctx.startRendering()));
  }
  return rows;
}

$('lvl').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await levelCheck()); });
$('lvlMusic').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await musicCheck()); });
$('lvlLoops').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await loopCheck()); });

Object.assign(window, { __extraCheck: extraCheck, __instrumentCheck: instrumentCheck, __levelCheck: levelCheck, __musicCheck: musicCheck, __loopCheck: loopCheck, __table: table, __audio: audio });
