/**
 * Keyframe clip with per-channel tracks. Vector channels use Catmull-Rom splines (so hand paths
 * arc naturally through keys); easing reshapes time between keys.
 */
import type { Ease, HandKey, Key, PoseSpec, V3 } from './types';
import { TRUNK } from './types';
import type { BoneName } from '../rigDefs';

type Track<T> = { t: number[]; v: T[]; e: Ease[] };

const ease = (e: Ease, x: number) => {
  switch (e) {
    case 'linear': return x;
    case 'in': return x * x;
    case 'out': return 1 - (1 - x) * (1 - x);
    case 'inout': return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case 'hold': return x < 1 ? 0 : 1;
    case 'smooth': default: return x * x * (3 - 2 * x);
  }
};

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function locate(times: number[], t: number): number {
  // index i such that times[i] <= t < times[i+1]
  let lo = 0, hi = times.length - 1;
  if (t <= times[0]) return -1;
  if (t >= times[hi]) return hi;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (times[m] <= t) lo = m; else hi = m;
  }
  return lo;
}

function sampleV3(tr: Track<V3>, t: number, loopDur: number | null, out: V3): V3 {
  const n = tr.t.length;
  if (n === 1) { out[0] = tr.v[0][0]; out[1] = tr.v[0][1]; out[2] = tr.v[0][2]; return out; }
  const i = locate(tr.t, t);
  if (i < 0) { const v = tr.v[0]; out[0] = v[0]; out[1] = v[1]; out[2] = v[2]; return out; }
  if (i >= n - 1 && loopDur === null) { const v = tr.v[n - 1]; out[0] = v[0]; out[1] = v[1]; out[2] = v[2]; return out; }
  const i1 = i, i2 = i + 1 < n ? i + 1 : 0;
  const t1 = tr.t[i1], t2 = i + 1 < n ? tr.t[i2] : loopDur!;
  const x = (t - t1) / Math.max(t2 - t1, 1e-6);
  const e = ease(tr.e[i2], Math.min(Math.max(x, 0), 1));
  const i0 = i1 > 0 ? i1 - 1 : (loopDur !== null ? n - 1 : 0);
  const i3 = i2 + 1 < n ? i2 + 1 : (loopDur !== null ? (i2 + 1) % n : i2);
  const a = tr.v[i0], b = tr.v[i1], c = tr.v[i2], d = tr.v[i3];
  out[0] = catmull(a[0], b[0], c[0], d[0], e);
  out[1] = catmull(a[1], b[1], c[1], d[1], e);
  out[2] = catmull(a[2], b[2], c[2], d[2], e);
  return out;
}

function sampleScalar(tr: Track<number>, t: number, loopDur: number | null): number {
  const n = tr.t.length;
  if (n === 1) return tr.v[0];
  const i = locate(tr.t, t);
  if (i < 0) return tr.v[0];
  if (i >= n - 1 && loopDur === null) return tr.v[n - 1];
  const i2 = i + 1 < n ? i + 1 : 0;
  const t1 = tr.t[i], t2 = i + 1 < n ? tr.t[i2] : loopDur!;
  const x = ease(tr.e[i2], Math.min(Math.max((t - t1) / Math.max(t2 - t1, 1e-6), 0), 1));
  return tr.v[i] + (tr.v[i2] - tr.v[i]) * x;
}

interface HandTrack {
  keys: Track<HandKey | null>;
  p: Track<V3>; dir: Track<V3>; up: Track<V3>; elbow: Track<V3>;
}

const normalize = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export class Clip {
  readonly duration: number;
  readonly loop: boolean;
  private trunk: Partial<Record<(typeof TRUNK)[number], Track<V3>>> = {};
  private hipsPos?: Track<V3>;
  private feet: { L?: Track<V3>; R?: Track<V3> } = {};
  private footPitch: { L?: Track<number>; R?: Track<number> } = {};
  private hands: { R?: HandTrack; L?: HandTrack } = {};
  private fk: Partial<Record<BoneName, Track<V3>>> = {};
  /** Channels this clip drives (used by masked blends such as upper-body overlays). */
  readonly drives = new Set<string>();

  constructor(public readonly name: string, keys: Key[], opts: { duration?: number; loop?: boolean; /** blade length for auto edge */ edgeLen?: number } = {}) {
    const sorted = [...keys].sort((a, b) => a.t - b.t);
    autoEdges(sorted, 'handR', opts.edgeLen ?? 0.9);
    this.duration = opts.duration ?? sorted[sorted.length - 1].t;
    this.loop = !!opts.loop;
    const push = <T>(tr: Track<T> | undefined, t: number, v: T, e: Ease): Track<T> => {
      const x = tr ?? { t: [], v: [], e: [] };
      x.t.push(t); x.v.push(v); x.e.push(e);
      return x;
    };
    for (const k of sorted) {
      const e = k.ease ?? 'smooth';
      for (const b of TRUNK) if (k[b]) { this.trunk[b] = push(this.trunk[b], k.t, k[b]!, e); this.drives.add(b); }
      if (k.hipsPos) { this.hipsPos = push(this.hipsPos, k.t, k.hipsPos, e); this.drives.add('hipsPos'); }
      if (k.footL) { this.feet.L = push(this.feet.L, k.t, k.footL, e); this.drives.add('footL'); }
      if (k.footR) { this.feet.R = push(this.feet.R, k.t, k.footR, e); this.drives.add('footR'); }
      if (k.footPitchL !== undefined) this.footPitch.L = push(this.footPitch.L, k.t, k.footPitchL, e);
      if (k.footPitchR !== undefined) this.footPitch.R = push(this.footPitch.R, k.t, k.footPitchR, e);
      for (const side of ['R', 'L'] as const) {
        const hk = side === 'R' ? k.handR : k.handL;
        if (hk === undefined) continue;
        this.drives.add('hand' + side);
        let ht = this.hands[side];
        if (!ht) ht = this.hands[side] = { keys: { t: [], v: [], e: [] }, p: { t: [], v: [], e: [] }, dir: { t: [], v: [], e: [] }, up: { t: [], v: [], e: [] }, elbow: { t: [], v: [], e: [] } };
        push(ht.keys, k.t, hk, e);
        if (hk) {
          push(ht.p, k.t, hk.p, e);
          push(ht.dir, k.t, normalize(hk.dir), e);
          if (hk.up) push(ht.up, k.t, normalize(hk.up), e);
          if (hk.elbow) push(ht.elbow, k.t, hk.elbow, e);
        }
      }
      if (k.fk) for (const b of Object.keys(k.fk) as BoneName[]) { this.fk[b] = push(this.fk[b], k.t, k.fk[b]!, e); this.drives.add('fk:' + b); }
    }
  }

  /** Write the pose at time t into `out`. Channels this clip doesn't drive are left untouched. */
  sample(t: number, out: PoseSpec): PoseSpec {
    const ld = this.loop ? this.duration : null;
    if (this.loop) { t = t % this.duration; if (t < 0) t += this.duration; }
    for (const b of TRUNK) { const tr = this.trunk[b]; if (tr) sampleV3(tr, t, ld, out[b]); }
    if (this.hipsPos) sampleV3(this.hipsPos, t, ld, out.hipsPos);
    if (this.feet.L) sampleV3(this.feet.L, t, ld, out.footL);
    if (this.feet.R) sampleV3(this.feet.R, t, ld, out.footR);
    if (this.footPitch.L) out.footPitchL = sampleScalar(this.footPitch.L, t, ld);
    if (this.footPitch.R) out.footPitchR = sampleScalar(this.footPitch.R, t, ld);
    for (const side of ['R', 'L'] as const) {
      const ht = this.hands[side];
      if (!ht) continue;
      // Nearest key decides whether the hand is IK-driven at all (null = free/FK).
      const i = locate(ht.keys.t, t);
      const cur = ht.keys.v[Math.max(0, Math.min(i, ht.keys.v.length - 1))];
      const next = ht.keys.v[Math.min(i + 1, ht.keys.v.length - 1)];
      const key = side === 'R' ? 'handR' : 'handL';
      if (!cur && !next) { out[key] = null; continue; }
      const ref = (cur ?? next)!;
      let target = out[key];
      if (!target) target = out[key] = { p: [0, 0, 0], dir: [0, 1, 0] };
      target.socket = ref.socket;
      if (ht.p.t.length) sampleV3(ht.p, t, ld, target.p);
      if (ht.dir.t.length) sampleV3(ht.dir, t, ld, target.dir);
      if (ht.up.t.length) sampleV3(ht.up, t, ld, (target.up ??= [0, 0, 1]));
      else target.up = undefined;
      if (ht.elbow.t.length) sampleV3(ht.elbow, t, ld, (target.elbow ??= [0, 0, 0]));
      else target.elbow = undefined;
    }
    for (const b of Object.keys(this.fk) as BoneName[]) {
      const tr = this.fk[b]!;
      const v = out.fk[b] ?? (out.fk[b] = [0, 0, 0]);
      sampleV3(tr, t, ld, v);
    }
    return out;
  }
}

/**
 * For keys whose hand has no explicit `up` (edge) but `edge: 'auto'` semantics (dir given, up
 * omitted) in the MIDDLE of a clip, derive the edge from the tip's motion between neighbouring
 * keys so blades cut edge-first. First/last keys keep their authored/default edge.
 */
function autoEdges(keys: Key[], side: 'handR' | 'handL', len: number) {
  const idx = keys.map((k, i) => (k[side] ? i : -1)).filter((i) => i >= 0);
  const tip = (h: HandKey): V3 => {
    const d = normalize(h.dir);
    return [h.p[0] + d[0] * len, h.p[1] + d[1] * len, h.p[2] + d[2] * len];
  };
  for (let n = 1; n < idx.length - 1; n++) {
    const h = keys[idx[n]][side]!;
    if (h.up || h.socket === 'shieldL') continue;
    const a = tip(keys[idx[n - 1]][side]!), c = tip(keys[idx[n + 1]][side]!);
    const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    if (Math.hypot(v[0], v[1], v[2]) < 0.25) continue;
    const d = normalize(h.dir);
    const dot = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
    const e: V3 = [v[0] - d[0] * dot, v[1] - d[1] * dot, v[2] - d[2] * dot];
    if (Math.hypot(e[0], e[1], e[2]) < 1e-3) continue;
    keys[idx[n]] = { ...keys[idx[n]], [side]: { ...h, up: normalize(e) } };
  }
}

export function makePoseSpec(): PoseSpec {
  return {
    hipsPos: [0, 0, 0], hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
    handR: null, handL: null, footL: [0.11, 0.08, 0], footR: [-0.11, 0.08, 0], footPitchL: 0, footPitchR: 0, fk: {},
  };
}

const cloneHand = (h: HandKey | null): HandKey | null =>
  h ? { p: [...h.p] as V3, dir: [...h.dir] as V3, up: h.up ? [...h.up] as V3 : undefined, elbow: h.elbow ? [...h.elbow] as V3 : undefined, socket: h.socket } : null;

export function copyPoseSpec(src: PoseSpec, dst: PoseSpec): PoseSpec {
  for (const b of TRUNK) { dst[b][0] = src[b][0]; dst[b][1] = src[b][1]; dst[b][2] = src[b][2]; }
  dst.hipsPos[0] = src.hipsPos[0]; dst.hipsPos[1] = src.hipsPos[1]; dst.hipsPos[2] = src.hipsPos[2];
  dst.footL[0] = src.footL[0]; dst.footL[1] = src.footL[1]; dst.footL[2] = src.footL[2];
  dst.footR[0] = src.footR[0]; dst.footR[1] = src.footR[1]; dst.footR[2] = src.footR[2];
  dst.footPitchL = src.footPitchL; dst.footPitchR = src.footPitchR;
  dst.handR = cloneHand(src.handR); dst.handL = cloneHand(src.handL);
  dst.fk = {};
  for (const k of Object.keys(src.fk) as BoneName[]) dst.fk[k] = [...src.fk[k]!] as V3;
  return dst;
}
