/**
 * Audio preview & offline level check.
 *   npx vite --port 5181 --strictPort  →  http://127.0.0.1:5181/tools/preview/audio.html
 *
 * Also exposes window.__levelCheck / __musicCheck / __loopCheck for headless automation: each
 * renders through an OfflineAudioContext (dynamics bypassed) and returns peak / RMS figures.
 */
import { Vector3 } from 'three';
import { Audio, formatCaption } from '../../src/audio/Audio';
import { CUES, CUE_CAPTIONS, type AmbienceId, type CueId, type LoopCueId, type LoopHandle, type MusicState } from '../../src/audio/contract';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const audio = new Audio();
const LOOPS: LoopCueId[] = ['amb_wind', 'amb_fire', 'amb_interior', 'amb_hospice', 'amb_battlefield', 'amb_undercroft', 'stillbell_hum', 'fog_hum', 'forge', 'brazier'];
const MUSIC: MusicState[] = ['none', 'title', 'intro', 'ashbridge', 'hospice', 'boss1', 'boss2', 'victory', 'battlefield'];
const AMB: AmbienceId[] = ['none', 'outdoor', 'interior', 'undercroft', 'hospice', 'arena', 'battlefield'];

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

export interface LevelRow { id: string; peakDb: number; rmsDb: number; stRmsDb: number; tailS: number; clip: number; error?: string }

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
  }
  // Integrated RMS over the sounding part only.
  const rms = Math.sqrt(sum / Math.max(1, lastLoud));
  return { id, peakDb: toDb(peak), rmsDb: toDb(rms), stRmsDb: toDb(stMax), tailS: lastLoud / SR, clip };
}

const LONG: Partial<Record<CueId, number>> = {
  great_bell_toll: 20, stillbell_ring: 10, stillbell_rest: 10, unfinished_toll: 12, player_death: 9,
  anchor_shatter: 9, collapse_rumble: 7, memory_trigger: 8, posture_break: 5, drawbridge_slam: 5,
};

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
    `${pad('id', 22)}  peak    rms  stRms   tail  clip`,
    ...rows.map((r) => `${pad(r.id, 22)}${f(r.peakDb)}${f(r.rmsDb)}${f(r.stRmsDb)}${r.tailS.toFixed(1).padStart(6)}  ${r.clip}${r.error ? '  ERR ' + r.error : ''}`),
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
async function musicCheck(states: string[] = [...MUSIC.filter((m) => m !== 'none'), 'boss1>boss2'], secs = 30): Promise<LevelRow[]> {
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
        a.pump(secs / 2);
        void ctx.suspend(secs / 2).then(() => { a.setMusic(s1); a.pump(secs); void ctx.resume(); });
      } else {
        a.setMusic(st as MusicState, 0.1);
        a.pump(secs);
      }
      rows.push(analyse(st, await ctx.startRendering()));
    } catch (e) {
      rows.push({ id: st, peakDb: 0, rmsDb: 0, stRmsDb: 0, tailS: 0, clip: 0, error: String(e) });
    }
  }
  return rows;
}

/** Render ambience loops and beds for `secs` seconds each. */
async function loopCheck(secs = 20): Promise<LevelRow[]> {
  const rows: LevelRow[] = [];
  const items: Array<[string, (a: Audio) => void]> = [
    ...LOOPS.map((id) => [id, (a: Audio) => { a.loop(id); }] as [string, (a: Audio) => void]),
    ...AMB.filter((x) => x !== 'none').map((id) => [`bed:${id}`, (a: Audio) => a.setAmbience(id, 0.1)] as [string, (a: Audio) => void]),
  ];
  for (const [id, start] of items) {
    const ctx = new OfflineAudioContext(2, SR * secs, SR);
    const a = new Audio({ context: ctx, manualClock: true, bypassDynamics: true, hrtf: false });
    a.setVolumes(FULL);
    await a.unlock();
    try {
      start(a);
      a.pump(secs);
      rows.push(analyse(id, await ctx.startRendering()));
    } catch (e) {
      rows.push({ id, peakDb: 0, rmsDb: 0, stRmsDb: 0, tailS: 0, clip: 0, error: String(e) });
    }
  }
  return rows;
}

$('lvl').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await levelCheck()); });
$('lvlMusic').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await musicCheck()); });
$('lvlLoops').addEventListener('click', async () => { $('levels').textContent = 'rendering…'; $('levels').textContent = table(await loopCheck()); });

Object.assign(window, { __levelCheck: levelCheck, __musicCheck: musicCheck, __loopCheck: loopCheck, __table: table, __audio: audio });
