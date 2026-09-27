/**
 * Procedurally generated source buffers, created once per AudioContext and cached.
 *
 * Every buffer is computed from a fixed-seed PRNG so the game sounds identical across builds, and
 * nothing is ever loaded from disk (all audio is synthesised: this is the licensing guarantee).
 */

export type NoiseColor = 'white' | 'pink' | 'brown' | 'crackle' | 'crackleSoft';

/** Small deterministic PRNG (mulberry32) — local copy so the audio module has no game deps. */
function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fill `out` with coloured noise normalised to a peak of ~0.95. */
function fillNoise(dst: Float32Array, color: NoiseColor, rnd: () => number, sampleRate: number): void {
  // Generate a little extra so the loop point can be cross-faded seamlessly.
  const xf = Math.min(2048, dst.length >> 4);
  const out = new Float32Array(dst.length + xf);
  const n = out.length;
  if (color === 'white') {
    for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
  } else if (color === 'pink') {
    // Paul Kellet's refined pink filter.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  } else if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // leaky integrator
      out[i] = last;
    }
  } else {
    // Fire crackle: sparse pops, each a tiny decaying burst of filtered noise with random
    // brightness. 'crackleSoft' is denser but duller (distant embers, braziers).
    const soft = color === 'crackleSoft';
    const rate = soft ? 26 : 16; // pops per second
    let t = 0;
    while (t < n) {
      t += Math.floor((-Math.log(1 - rnd()) / rate) * sampleRate);
      if (t >= n) break;
      const amp = Math.pow(rnd(), soft ? 2.2 : 1.6) * (rnd() < 0.08 ? 1 : 0.45);
      const len = Math.floor((0.0015 + rnd() * (soft ? 0.012 : 0.02)) * sampleRate);
      const bright = soft ? 0.35 + rnd() * 0.3 : 0.2 + rnd() * 0.75; // one-pole coefficient
      let lp = 0;
      // Occasionally a "snap" cluster of 2–4 pops.
      const cluster = rnd() < 0.15 ? 2 + Math.floor(rnd() * 3) : 1;
      for (let c = 0; c < cluster; c++) {
        const off = t + Math.floor(c * rnd() * 0.012 * sampleRate);
        for (let i = 0; i < len && off + i < n; i++) {
          const env = Math.exp((-6 * i) / len);
          lp += bright * ((rnd() * 2 - 1) - lp);
          out[off + i] = (out[off + i] ?? 0) + lp * env * amp;
        }
      }
    }
  }
  // Normalise.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]!));
  const k = peak > 0 ? 0.95 / peak : 1;
  for (let i = 0; i < n; i++) out[i]! *= k;
  // Cross-fade the overhang into the head: sample n-1 flows continuously into sample 0.
  const m = dst.length;
  for (let i = 0; i < m; i++) dst[i] = out[i]!;
  for (let i = 0; i < xf; i++) {
    const a = i / xf;
    dst[i] = out[i]! * a + out[m + i]! * (1 - a);
  }
}

/** Cache of generated buffers for one context. */
export class NoiseBank {
  private readonly mono = new Map<NoiseColor, AudioBuffer>();
  private readonly stereo = new Map<NoiseColor, AudioBuffer>();
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();

  constructor(readonly ctx: BaseAudioContext) {}

  /** 3-second mono buffer of the given colour (loopable). */
  get(color: NoiseColor): AudioBuffer {
    let b = this.mono.get(color);
    if (!b) {
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * (color.startsWith('crackle') ? 6 : 3));
      b = this.ctx.createBuffer(1, len, sr);
      fillNoise(b.getChannelData(0), color, mulberry(0xbe11 + color.length * 977), sr);
      this.mono.set(color, b);
    }
    return b;
  }

  /** 7-second stereo buffer with decorrelated channels (ambience beds). */
  getStereo(color: NoiseColor): AudioBuffer {
    let b = this.stereo.get(color);
    if (!b) {
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 7);
      b = this.ctx.createBuffer(2, len, sr);
      fillNoise(b.getChannelData(0), color, mulberry(0x5eed + color.length * 31), sr);
      fillNoise(b.getChannelData(1), color, mulberry(0xfade + color.length * 57), sr);
      this.stereo.set(color, b);
    }
    return b;
  }

  /** Soft-clip (tanh) curve for WaveShaper drive; cached per rounded drive amount. */
  curve(drive: number): Float32Array<ArrayBuffer> {
    const key = Math.round(drive * 10) / 10;
    let c = this.curves.get(key);
    if (!c) {
      const n = 1024;
      c = new Float32Array(n);
      const norm = Math.tanh(key);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        c[i] = Math.tanh(x * key) / norm;
      }
      this.curves.set(key, c);
    }
    return c;
  }
}
