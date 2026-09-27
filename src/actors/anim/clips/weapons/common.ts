/**
 * Authoring helpers shared by the weapon-class movesets (root space: +Z forward, −X = right).
 *
 * Two-handed weapons: author only the RIGHT (main) hand; `twoHand()` then places the LEFT hand on
 * the same grip axis at `off` metres along the weapon's +Y (the model's `offhandGrip`), with the
 * same socket frame (dir + edge), so both fists close on the shaft/hilt exactly. A key may carry
 * its own `off` (the shaft sliding through the lead hand on spear thrusts) or an explicit
 * `handL` (letting go) which is kept as authored.
 */
import { Clip } from '../../Clip';
import type { HandKey, Key, V3 } from '../../types';

export type K = Key & { off?: number };

export const H = (p: V3, dir: V3, x: Partial<HandKey> = {}): HandKey => ({ p, dir, ...x });

const nrm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/**
 * Resolve automatic edges for the right hand exactly like Clip does (edge leads along the tip's
 * path through each middle key), and fill first/last keys with the solver's default edge, so a
 * second hand can copy the final frame.
 */
export function resolveEdges(keys: K[], len: number): K[] {
  const ks = [...keys].sort((a, b) => a.t - b.t).map((k) => ({ ...k }));
  const idx = ks.map((k, i) => (k.handR ? i : -1)).filter((i) => i >= 0);
  const tip = (h: HandKey): V3 => { const d = nrm(h.dir); return [h.p[0] + d[0] * len, h.p[1] + d[1] * len, h.p[2] + d[2] * len]; };
  for (let n = 0; n < idx.length; n++) {
    const h = ks[idx[n]].handR!;
    if (h.up) continue;
    const d = nrm(h.dir);
    let up: V3 | null = null;
    if (n > 0 && n < idx.length - 1) {
      const a = tip(ks[idx[n - 1]].handR!), c = tip(ks[idx[n + 1]].handR!);
      const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      if (Math.hypot(v[0], v[1], v[2]) >= 0.25) {
        const dot = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
        const e: V3 = [v[0] - d[0] * dot, v[1] - d[1] * dot, v[2] - d[2] * dot];
        if (Math.hypot(e[0], e[1], e[2]) > 1e-3) up = nrm(e);
      }
    }
    if (!up) up = Math.abs(d[1]) < 0.8 ? [0, -1, 0] : [0, 0, 1];
    ks[idx[n]] = { ...ks[idx[n]], handR: { ...h, up } };
  }
  return ks;
}

/** Add the left hand on the weapon axis (see file header). */
export function twoHand(keys: K[], off: number, len: number, elbowL: V3 = [0.7, -0.55, -0.35]): Key[] {
  return resolveEdges(keys, len).map((k) => {
    const { off: o, ...key } = k;
    const h = key.handR;
    if (!h || key.handL !== undefined) return key;
    const d = nrm(h.dir), f = o ?? off;
    const hl: HandKey = { p: [h.p[0] + d[0] * f, h.p[1] + d[1] * f, h.p[2] + d[2] * f], dir: h.dir, up: h.up, elbow: elbowL };
    return { ...key, handL: hl };
  });
}

/** Strip helper fields (one-handed variant). */
export const oneHand = (keys: K[]): Key[] => keys.map(({ off: _o, ...k }) => k);

export const clip = (name: string, keys: Key[], edgeLen = 0.9, opts: { loop?: boolean; duration?: number } = {}) => new Clip(name, keys, { edgeLen, ...opts });

/** A two-handed clip `name` plus its one-handed variant `name_1h` (off-hand busy with a shield). */
export function pair(name: string, keys: K[], off: number, len: number, elbowL?: V3): Record<string, Clip> {
  return { [name]: clip(name, twoHand(keys, off, len, elbowL), len), [name + '_1h']: clip(name + '_1h', resolveEdges(oneHand(keys) as K[], len) as Key[], len) };
}

/** Shift a key list in time (for building combined clips from existing arcs). */
export const shift = (keys: K[], dt: number): K[] => keys.map((k) => ({ ...k, t: k.t + dt }));
