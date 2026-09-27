/**
 * Procedural convolution reverb impulse responses.
 *
 * An IR is stereo decaying noise with: a pre-delay, a handful of discrete early reflections,
 * frequency-dependent decay (a one-pole lowpass whose cutoff falls over time, so high frequencies
 * die first like in stone halls) and slightly different decay per channel for width.
 * IRs are cached per context + preset so they are generated only once.
 */

export interface ReverbPreset {
  /** Total IR length in seconds. */
  duration: number;
  /** Time to decay by 60 dB (RT60), seconds. */
  rt60: number;
  /** Pre-delay before the diffuse tail, seconds. */
  preDelay: number;
  /** 0..1 — how fast high frequencies decay relative to lows (1 = very dark tail). */
  damping: number;
  /** Early reflections: [delay s, gain] pairs (applied with slight L/R offsets). */
  early: ReadonlyArray<readonly [number, number]>;
}

export const REVERB_PRESETS = {
  /** World: bronze-and-stone keep, moderately long. */
  world: {
    duration: 3.2, rt60: 2.6, preDelay: 0.018, damping: 0.55,
    early: [[0.011, 0.5], [0.019, 0.35], [0.027, 0.3], [0.041, 0.22], [0.053, 0.15], [0.071, 0.1]],
  },
  /** Music: a large, dark cathedral-like hall. */
  music: {
    duration: 4.2, rt60: 3.6, preDelay: 0.03, damping: 0.45,
    early: [[0.023, 0.3], [0.037, 0.22], [0.051, 0.18], [0.077, 0.12]],
  },
} as const satisfies Record<string, ReverbPreset>;

const cache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build (or fetch from cache) the IR for `name`. */
export function impulseResponse(ctx: BaseAudioContext, name: keyof typeof REVERB_PRESETS): AudioBuffer {
  let m = cache.get(ctx);
  if (!m) cache.set(ctx, (m = new Map()));
  const hit = m.get(name);
  if (hit) return hit;

  const p: ReverbPreset = REVERB_PRESETS[name];
  const sr = ctx.sampleRate;
  const len = Math.floor(p.duration * sr);
  const buf = ctx.createBuffer(2, len, sr);
  const rnd = mulberry(name === 'world' ? 0x1a2b : 0x3c4d);
  const pre = Math.floor(p.preDelay * sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // Per-channel RT variation for stereo width.
    const rt = p.rt60 * (ch === 0 ? 1 : 1.04);
    const k = Math.log(1000) / (rt * sr); // amplitude decay per sample
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / sr;
      // Lowpass coefficient falls from ~0.95 (bright) toward (1 - damping) over the tail.
      const coef = Math.max(0.03, 0.95 * Math.exp((-tt * p.damping * 3) / p.rt60 * 2));
      lp += coef * ((rnd() * 2 - 1) - lp);
      // Soft onset of the diffuse tail (build-up of density).
      const onset = Math.min(1, tt / 0.03);
      d[i] = lp * Math.exp(-k * (i - pre)) * onset;
    }
    // Early reflections (channel-offset for width).
    for (const [t, g] of p.early) {
      const idx = Math.floor((t + (ch ? 0.0017 : 0)) * sr);
      if (idx < len) d[idx] = (d[idx] ?? 0) + g * (rnd() < 0.5 ? -1 : 1);
    }
    // Fade the very end to avoid a truncation click.
    const fade = Math.floor(0.05 * sr);
    for (let i = 0; i < fade; i++) d[len - 1 - i]! *= i / fade;
  }
  // Normalise energy so presets have comparable loudness.
  let e = 0;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) e += d[i]! * d[i]!;
  }
  const norm = 1 / Math.sqrt(e / 2 + 1e-9) * 0.5;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i]! *= norm;
  }
  m.set(name, buf);
  return buf;
}
