/**
 * Audio — the game's procedural audio system (implements IAudio).
 *
 * Every sound and all music is synthesised at runtime with WebAudio: no samples are loaded.
 *
 * Integration:
 *   const audio = new Audio();
 *   window.addEventListener('pointerdown', () => audio.unlock(), { once: true });   // + keydown/gamepad
 *   audio.onCaption((text, dir) => ui.caption(text, dir));
 *   audio.setVolumes(settings.audio);
 *   every frame: audio.setListener(camera.position, cameraForward, camera.up);
 *
 * Before `unlock()` resolves, play() is a silent no-op (captions still fire), while loop(),
 * setMusic(), setAmbience() and setMenuMuffle() are remembered and applied once unlocked.
 */
import type * as THREE from 'three';
import {
  CUE_CAPTIONS, type AmbienceId, type CueId, type IAudio, type LoopCueId, type LoopHandle, type MusicState, type PlayOpts,
} from './contract';
import { CUE_DEFS } from './cues';
import { Mixer } from './engine/Mixer';
import { NoiseBank } from './engine/noise';
import { inverseGain, ListenerState, type CaptionDir, type Vec3 } from './engine/spatial';
import { rand, Voice } from './engine/Voice';
import { MusicPlayer } from './music/MusicPlayer';
import { createLoop, LOOP_DEFS, type AnyLoopId, type LoopSynth } from './synth/ambience';
import type { SynthParams } from './synth/types';

export interface AudioOptions {
  /** Use this context instead of creating an AudioContext (e.g. OfflineAudioContext for tests). */
  context?: BaseAudioContext;
  /** No internal timer: the owner calls `pump(seconds)` to schedule music/ambience events. */
  manualClock?: boolean;
  /** Skip compressor/limiter (level measurement). */
  bypassDynamics?: boolean;
  /** HRTF panning for 3D sounds (default true); false = cheaper equal-power. */
  hrtf?: boolean;
  /** Simultaneous one-shot voice limit (default 48). */
  maxVoices?: number;
}

type Volumes = Parameters<IAudio['setVolumes']>[0];
type CaptionFn = (text: string, dir: CaptionDir | null) => void;

/** Ambience beds: which loops (and at what level) make up each zone. */
const BEDS: Record<AmbienceId, ReadonlyArray<readonly [AnyLoopId, number]>> = {
  outdoor: [['amb_wind', 0.8], ['embers_far', 0.5], ['far_tolls', 1]],
  interior: [['amb_interior', 1]],
  undercroft: [['amb_undercroft', 1], ['amb_wind', 0.12]],
  hospice: [['amb_hospice', 1]],
  arena: [['amb_wind', 1], ['fog_hum', 0.25], ['far_tolls', 0.6]],
  battlefield: [['amb_battlefield', 1], ['amb_wind', 0.6]],
  none: [],
};

/** Minimum gap between identical cues (s). */
const THROTTLE = 0.03;
/** Minimum gap between identical captions (ms). */
const CAPTION_THROTTLE_MS = 450;

// =============================================================================================

/** Engine surface the loop handles need (kept narrow). */
interface LoopHost {
  readonly live: { ctx: BaseAudioContext; bank: NoiseBank; mixer: Mixer } | null;
  readonly hrtf: boolean;
  release(h: LoopHandleImpl): void;
}

/**
 * A loop handle. It exists before the context is ready (state is remembered) and materialises
 * its graph once audio is unlocked.
 */
class LoopHandleImpl implements LoopHandle {
  private synth: LoopSynth | null = null;
  private gain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private send: GainNode | null = null;
  private panner: PannerNode | null = null;
  private stopped = false;

  constructor(private readonly host: LoopHost, readonly id: AnyLoopId, private vol: number, private pos: Vec3 | null) {}

  get active(): boolean { return !this.stopped; }

  /** Build the graph (called immediately if ready, else on unlock). */
  materialize(fadeIn = 0.5): void {
    const live = this.host.live;
    if (!live || this.synth || this.stopped) return;
    const { ctx, bank, mixer } = live;
    const def = LOOP_DEFS[this.id];
    const synth = createLoop(this.id, ctx, bank);
    const now = ctx.currentTime;
    // Handle volume: `g` (dry) and `gw` (the loop's reverb-only events) move together.
    const g = ctx.createGain();
    const gw = ctx.createGain();
    for (const p of [g.gain, gw.gain]) {
      p.setValueAtTime(0, now);
      p.setTargetAtTime(this.vol * def.gain, now, Math.max(0.01, fadeIn / 3));
    }
    const bus = mixer.buses.ambience;
    synth.out.connect(g);
    synth.wet.connect(gw).connect(bus.wet);
    let tail: AudioNode = g;
    if (this.pos) {
      const p = ctx.createPanner();
      p.panningModel = this.host.hrtf ? 'HRTF' : 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = def.ref;
      p.rolloffFactor = def.rolloff;
      p.maxDistance = 10000;
      setPannerPos(p, this.pos);
      g.connect(p);
      tail = p;
      this.panner = p;
    }
    tail.connect(bus.input);
    // Reverb send of the (distance-attenuated) dry signal.
    const send = ctx.createGain();
    send.gain.value = def.wet;
    tail.connect(send).connect(bus.wet);
    this.synth = synth;
    this.gain = g;
    this.wetGain = gw;
    this.send = send;
  }

  /** Scheduler tick. */
  tick(from: number, to: number): void {
    this.synth?.tick(from, to);
  }

  setVolume(v: number, fade = 0.5): void {
    if (this.stopped) return;
    this.vol = Math.max(0, Math.min(2, v));
    const live = this.host.live;
    if (this.gain && this.wetGain && live) {
      const now = live.ctx.currentTime;
      for (const p of [this.gain.gain, this.wetGain.gain]) {
        p.cancelScheduledValues(now);
        p.setValueAtTime(p.value, now);
        p.setTargetAtTime(this.vol * LOOP_DEFS[this.id].gain, now, Math.max(0.01, fade / 3));
      }
    }
  }

  setPos(p: Vec3): void {
    this.pos = { x: p.x, y: p.y, z: p.z };
    if (this.panner) setPannerPos(this.panner, this.pos);
  }

  stop(fade = 1): void {
    if (this.stopped) return;
    this.stopped = true;
    this.host.release(this);
    const live = this.host.live;
    if (!live || !this.synth || !this.gain) return;
    const now = live.ctx.currentTime;
    const f = Math.max(0.03, fade);
    for (const p of [this.gain.gain, this.wetGain!.gain]) {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(0, now + f);
    }
    this.synth.stop(now + f + 0.02);
    // The synth graph self-disconnects when its sources end; our routing nodes are released by
    // a silent timer source (works identically for realtime and offline contexts).
    const nodes: AudioNode[] = [this.gain, this.wetGain!, this.send!, ...(this.panner ? [this.panner] : [])];
    const ender = live.ctx.createConstantSource();
    ender.offset.value = 0;
    ender.connect(this.gain);
    ender.onended = () => {
      ender.disconnect();
      for (const n of nodes) n.disconnect();
    };
    ender.start(now);
    ender.stop(now + f + 0.15);
  }
}

function setPannerPos(p: PannerNode, v: Vec3): void {
  if (p.positionX) {
    p.positionX.value = v.x;
    p.positionY.value = v.y;
    p.positionZ.value = v.z;
  } else {
    (p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(v.x, v.y, v.z);
  }
}

// =============================================================================================

export class Audio implements IAudio, LoopHost {
  live: { ctx: BaseAudioContext; bank: NoiseBank; mixer: Mixer } | null = null;
  hrtf: boolean;

  private readonly opts: AudioOptions;
  private music: MusicPlayer | null = null;
  private unlocking: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private lookahead = 0.1;

  private readonly listener = new ListenerState();
  private readonly voices: Voice[] = [];
  private readonly maxVoices: number;
  private readonly lastPlay = new Map<CueId, number>();
  private readonly captionFns: CaptionFn[] = [];
  private readonly lastCaption = new Map<string, number>();
  private readonly loops = new Set<LoopHandleImpl>();
  private readonly bed = new Map<AnyLoopId, LoopHandleImpl>();

  // Desired state remembered before unlock.
  private volumes: Volumes = { master: 0.9, music: 0.7, sfx: 0.9, ambience: 0.8, voice: 1, ui: 0.7, mono: false };
  private wantMusic: { state: MusicState; fade: number } = { state: 'none', fade: 0 };
  private wantAmbience: AmbienceId = 'none';
  private muffled = false;

  constructor(opts: AudioOptions = {}) {
    this.opts = opts;
    this.hrtf = opts.hrtf ?? true;
    this.maxVoices = opts.maxVoices ?? 48;
  }

  // ---------------------------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------------------------

  /** Create/resume the AudioContext. Call from a user gesture the first time; safe to repeat. */
  unlock(): Promise<void> {
    if (this.live) {
      const ctx = this.live.ctx;
      if (ctx instanceof AudioContext && ctx.state !== 'running') return ctx.resume().catch(() => undefined);
      return Promise.resolve();
    }
    if (this.unlocking) return this.unlocking;
    this.unlocking = this.boot();
    return this.unlocking;
  }

  private async boot(): Promise<void> {
    let ctx = this.opts.context;
    if (!ctx) {
      const Ctor: typeof AudioContext | undefined =
        globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return; // no WebAudio: stay silent forever
      ctx = new Ctor({ latencyHint: 'interactive' });
    }
    const bank = new NoiseBank(ctx);
    // Pre-generate the commonly used buffers now rather than on the first sound.
    for (const c of ['white', 'pink', 'brown', 'crackle', 'crackleSoft'] as const) bank.get(c);
    const mixer = new Mixer(ctx, { bypassDynamics: this.opts.bypassDynamics });
    this.live = { ctx, bank, mixer };
    this.music = new MusicPlayer(ctx, bank, mixer.musicIn, mixer.musicWetIn);
    mixer.setVolumes(this.volumes, true);
    if (this.muffled) mixer.setMenuMuffle(true);
    this.applyListener();

    if (ctx instanceof AudioContext) {
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running') this.music?.resync(ctx.currentTime + 0.05);
      });
      try { await ctx.resume(); } catch { /* resumed on the next gesture */ }
    }
    // Apply remembered state.
    for (const h of this.loops) h.materialize(1);
    if (this.wantAmbience !== 'none') this.applyAmbience(this.wantAmbience, 2);
    if (this.wantMusic.state !== 'none') this.music.set(this.wantMusic.state, this.wantMusic.fade);
    if (!this.opts.manualClock) {
      this.lastTick = performance.now();
      this.timer = setInterval(() => this.tick(), 25);
    }
  }

  get ready(): boolean {
    const live = this.live;
    if (!live) return false;
    return !(live.ctx instanceof AudioContext) || live.ctx.state === 'running';
  }

  /** The underlying context (null until unlock). */
  get context(): BaseAudioContext | null { return this.live?.ctx ?? null; }

  /** Current music state. */
  get musicState(): MusicState { return this.wantMusic.state; }

  /** Stop timers and close the context. */
  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = this.live?.ctx;
    if (ctx instanceof AudioContext) void ctx.close();
    this.live = null;
  }

  /** Toggle HRTF (quality setting) for sounds started afterwards. */
  setHrtf(on: boolean): void { this.hrtf = on; }

  // ---------------------------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------------------------

  /** Timer callback: schedule music & ambience events inside the lookahead window. */
  private tick(): void {
    const live = this.live;
    if (!live || !this.ready) return;
    // Adaptive lookahead: if the timer is throttled (background tab), look further ahead.
    const nowMs = performance.now();
    const gap = (nowMs - this.lastTick) / 1000;
    this.lastTick = nowMs;
    this.lookahead = Math.min(1.2, Math.max(0.1, gap * 1.5, this.lookahead * 0.97));
    const now = live.ctx.currentTime;
    this.pumpWindow(now, now + this.lookahead);
  }

  private pumpWindow(from: number, to: number): void {
    this.music?.pump(from, to);
    for (const h of this.loops) h.tick(from, to);
  }

  /** Manual clock (offline rendering / tests): schedule everything up to `until` seconds. */
  pump(until: number): void {
    const live = this.live;
    if (!live) return;
    // Step in 0.5 s windows so evolving state (cooldowns, gusts) behaves as in real time.
    let t = live.ctx.currentTime;
    while (t < until) {
      const next = Math.min(until, t + 0.5);
      this.pumpWindow(t, next);
      t = next;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // IAudio
  // ---------------------------------------------------------------------------------------------

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.live?.mixer.setVolumes(this.volumes);
  }

  setListener(pos: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3): void {
    this.listener.set(pos, forward, up);
    this.applyListener();
  }

  private applyListener(): void {
    const live = this.live;
    if (!live) return;
    const l = live.ctx.listener;
    const { pos, fwd, up } = this.listener;
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = fwd.x; l.forwardY.value = fwd.y; l.forwardZ.value = fwd.z;
      l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = up.z;
    } else {
      const legacy = l as unknown as {
        setPosition(x: number, y: number, z: number): void;
        setOrientation(x: number, y: number, z: number, ux: number, uy: number, uz: number): void;
      };
      legacy.setPosition(pos.x, pos.y, pos.z);
      legacy.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  play(cue: CueId, opts: PlayOpts = {}): void {
    const def = CUE_DEFS[cue];
    if (!def) return;
    const pos = opts.pos ?? null;
    const params: SynthParams = {
      rate: Math.max(0.25, Math.min(4, opts.rate ?? 1)),
      surface: opts.surface ?? 'stone',
      pan: 0,
    };
    let dir: CaptionDir | null = pos ? this.listener.direction(pos) : null;
    if (!pos && def.randomPan) {
      params.pan = (Math.random() < 0.5 ? -1 : 1) * rand(0.45, 0.8);
      dir = params.pan < 0 ? 'left' : 'right';
    }

    // Distance attenuation (for culling and the reverb send).
    let distGain = 1;
    if (pos) {
      distGain = inverseGain(this.listener.distance(pos), def.ref ?? 2, def.rolloff ?? 1.2);
      if (distGain < 0.002) return; // inaudible: no sound, no caption
    }

    const live = this.live;
    if (!live || !this.ready) {
      this.caption(cue, opts, dir);
      return;
    }
    const { ctx, bank, mixer } = live;
    const now = ctx.currentTime;
    const last = this.lastPlay.get(cue);
    if (last !== undefined && now - last < THROTTLE) return;
    this.lastPlay.set(cue, now);

    if (!this.makeRoom(def.priority)) return;
    this.caption(cue, opts, dir);

    const v = new Voice(ctx, bank, now + 0.004);
    v.priority = def.priority;
    try {
      def.synth(v, params);
    } catch (e) {
      console.warn(`[audio] synth failed for ${cue}`, e);
      v.launch();
      return;
    }
    const vol = Math.max(0, Math.min(2, opts.volume ?? 1));
    v.out.gain.value = def.gain * vol;

    const bus = mixer.buses[def.bus];
    let tail: AudioNode = v.out;
    if (pos) {
      const p = v.track(ctx.createPanner());
      p.panningModel = this.hrtf ? 'HRTF' : 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = def.ref ?? 2;
      p.rolloffFactor = def.rolloff ?? 1.2;
      p.maxDistance = 10000;
      setPannerPos(p, pos);
      tail = p;
      v.out.connect(p);
      // Air absorption for far sounds.
      const d = this.listener.distance(pos);
      if (d > 12) {
        const lp = v.filter('lowpass', Math.max(1500, 18000 / (1 + (d - 12) / 10)), 0.5);
        p.connect(lp);
        tail = lp;
      }
    }
    tail.connect(bus.input);
    if (def.wet > 0) {
      // Reverb falls off slower than the direct sound, so distant sounds get relatively wetter.
      const send = v.gain(def.wet * Math.sqrt(distGain));
      v.out.connect(send).connect(bus.wet);
    }
    if (def.duck) mixer.duck(def.duck[0] * Math.min(1, distGain * 1.5), def.duck[1]);

    v.onFinished = () => {
      const i = this.voices.indexOf(v);
      if (i >= 0) this.voices.splice(i, 1);
    };
    this.voices.push(v);
    v.launch();
  }

  /** Voice stealing. Returns false if the new sound should be dropped instead. */
  private makeRoom(priority: number): boolean {
    if (this.voices.length < this.maxVoices) return true;
    let victim: Voice | null = null;
    for (const v of this.voices) {
      if (!victim || v.priority < victim.priority || (v.priority === victim.priority && v.t < victim.t)) victim = v;
    }
    if (!victim || victim.priority > priority) return false;
    victim.kill(0.03);
    this.voices.splice(this.voices.indexOf(victim), 1);
    return true;
  }

  loop(cue: LoopCueId, opts: PlayOpts = {}): LoopHandle {
    const h = new LoopHandleImpl(this, cue, Math.max(0, Math.min(2, opts.volume ?? 1)), opts.pos ? { ...toVec(opts.pos) } : null);
    this.loops.add(h);
    h.materialize(0.6);
    return h;
  }

  /** LoopHost: a handle stopped. */
  release(h: LoopHandleImpl): void {
    this.loops.delete(h);
  }

  setMusic(state: MusicState, fade = 2.5): void {
    this.wantMusic = { state, fade };
    this.music?.set(state, fade);
  }

  setAmbience(id: AmbienceId, fade = 3): void {
    this.wantAmbience = id;
    if (this.live) this.applyAmbience(id, fade);
  }

  private applyAmbience(id: AmbienceId, fade: number): void {
    const layers = new Map(BEDS[id]);
    for (const [lid, h] of this.bed) {
      const vol = layers.get(lid);
      if (vol === undefined || !h.active) {
        h.stop(fade);
        this.bed.delete(lid);
      } else {
        h.setVolume(vol, fade);
      }
    }
    for (const [lid, vol] of layers) {
      if (this.bed.has(lid)) continue;
      const h = new LoopHandleImpl(this, lid, vol, null);
      this.loops.add(h);
      this.bed.set(lid, h);
      h.materialize(fade);
    }
  }

  setMenuMuffle(on: boolean): void {
    this.muffled = on;
    this.live?.mixer.setMenuMuffle(on);
  }

  onCaption(fn: (text: string, dir: 'left' | 'right' | 'ahead' | 'behind' | null) => void): void {
    this.captionFns.push(fn);
  }

  /**
   * Emit a caption for captioned cues. `text` is the plain caption ("Enemy alerted"); the
   * direction is passed separately (the UI formats it, e.g. "[Enemy alerted — left]").
   */
  private caption(cue: CueId, opts: PlayOpts, dir: CaptionDir | null): void {
    const text = CUE_CAPTIONS[cue];
    if (!text || opts.silentCaption || this.captionFns.length === 0) return;
    const key = `${cue}|${dir ?? ''}`;
    const nowMs = performance.now();
    const last = this.lastCaption.get(key);
    if (last !== undefined && nowMs - last < CAPTION_THROTTLE_MS) return;
    this.lastCaption.set(key, nowMs);
    for (const fn of this.captionFns) {
      try { fn(text, dir); } catch (e) { console.warn('[audio] caption handler failed', e); }
    }
  }

  /** Number of live one-shot voices (debug overlay). */
  get activeVoices(): number { return this.voices.length; }
}

/** Format a caption the way the contract example shows: "[Enemy alerted — left]". */
export function formatCaption(text: string, dir: CaptionDir | null): string {
  return dir ? `[${text} — ${dir}]` : `[${text}]`;
}

function toVec(p: { x: number; y: number; z: number }): Vec3 {
  return { x: p.x, y: p.y, z: p.z };
}
