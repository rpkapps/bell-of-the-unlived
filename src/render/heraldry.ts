/**
 * Canvas heraldry: draws the vector charges from `heraldrySvg.ts` with Path2D and builds worn,
 * painted textures (faded, chipped, scratched paint) for banners, shields and props.
 *
 * Browser-only at call time (uses canvas); importing the module is side-effect free.
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';
import { heraldryShape, type HeraldryKind } from './heraldrySvg';

export type { HeraldryKind } from './heraldrySvg';
export { HERALDRY_KINDS, heraldrySvg, heraldryShape } from './heraldrySvg';

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const pathCache = new Map<HeraldryKind, Path2D>();
function path2d(kind: HeraldryKind): Path2D {
  let p = pathCache.get(kind);
  if (!p) { p = new Path2D(heraldryShape(kind).d); pathCache.set(kind, p); }
  return p;
}

/** Create a 2D canvas (OffscreenCanvas when available — faster, works in workers). */
export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Ctx2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    return { canvas, ctx: canvas.getContext('2d') as OffscreenCanvasRenderingContext2D };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D };
}

/**
 * Draw a charge centred on (x, y), scaled so its LARGER dimension equals `size` pixels.
 * Uses the even-odd rule so cut-outs (arch openings, keyholes, slits) stay transparent.
 */
export function drawHeraldry(ctx: Ctx2D, kind: HeraldryKind, x: number, y: number, size: number, color: string | CanvasGradient | CanvasPattern): void {
  const [vx, vy, vw, vh] = heraldryShape(kind).viewBox;
  const s = size / Math.max(vw, vh);
  ctx.save();
  ctx.translate(x - (vw * s) / 2 - vx * s, y - (vh * s) / 2 - vy * s);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fill(path2d(kind), 'evenodd');
  ctx.restore();
}

/** Aspect (height / width) of a charge's viewBox. */
export function heraldryAspect(kind: HeraldryKind): number {
  const vb = heraldryShape(kind).viewBox;
  return vb[3] / vb[2];
}

/**
 * White-on-transparent mask of a charge, for the GPU texture generator (which paints and wears
 * it procedurally). `fill` = fraction of the canvas height the charge occupies; `cy` = vertical
 * centre as a fraction of the height (0 = top).
 */
export function heraldryMaskCanvas(kind: HeraldryKind, w: number, h: number, fill = 0.72, cy = 0.5): HTMLCanvasElement | OffscreenCanvas {
  const { canvas, ctx } = makeCanvas(w, h);
  const aspect = heraldryAspect(kind);
  // fit by height, but never wider than 86 % of the canvas
  let size = h * fill;
  const widthAtSize = aspect >= 1 ? size / aspect : size;
  if (widthAtSize > w * 0.86) size *= (w * 0.86) / widthAtSize;
  drawHeraldry(ctx, kind, w / 2, h * cy, size, '#ffffff');
  return canvas;
}

export interface HeraldryTextureOpts {
  /** Field (background) colour, CSS. */
  field: string;
  /** Charge (paint) colour, CSS. */
  charge: string;
  /** 0 = crisp new paint … 1 = heavily faded and chipped. */
  wear: number;
  /** Texture width in px (default 512). */
  size?: number;
  /** Height / width of the texture (default 1; banners ~2). */
  aspect?: number;
  /** Deterministic seed for the wear pattern. */
  seed?: number;
  /** Fraction of the height the charge occupies (default 0.7). */
  fill?: number;
}

/**
 * A painted, worn heraldic CanvasTexture: field colour with grain and grime, the charge in
 * paint that is faded, chipped (flakes lost down to the field), scratched and rubbed at the
 * high points. sRGB colour space; ready for `map`.
 */
export function heraldryTexture(kind: HeraldryKind, opts: HeraldryTextureOpts): THREE.CanvasTexture {
  const w = opts.size ?? 512, h = Math.round(w * (opts.aspect ?? 1));
  const wear = Math.min(1, Math.max(0, opts.wear));
  const rng = new Rng(opts.seed ?? 7);
  const { canvas, ctx } = makeCanvas(w, h);

  // --- field: base colour + fine grain + soft mottled grime ------------------------------------
  ctx.fillStyle = opts.field;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    ctx.globalAlpha = (0.015 + 0.03 * wear) * rng.next();
    ctx.fillStyle = rng.chance(0.55) ? '#000' : '#fff';
    const x = rng.range(0, w), len = rng.range(0.1, 0.6) * h;
    ctx.fillRect(x, rng.range(-0.2, 1) * h, rng.range(0.5, 1.5) * (w / 512), len);
  }
  for (let i = 0; i < 40; i++) {
    const r = rng.range(0.08, 0.3) * w;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(0,0,0,${0.12 + 0.18 * wear})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(rng.range(0, w), rng.range(0, h)); ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
  }
  ctx.globalAlpha = 1;

  // --- charge on its own layer so wear can erase paint only ------------------------------------
  const layer = makeCanvas(w, h);
  const lctx = layer.ctx;
  const aspectC = heraldryAspect(kind);
  let size = h * (opts.fill ?? 0.7);
  const wAt = aspectC >= 1 ? size / aspectC : size;
  if (wAt > w * 0.84) size *= (w * 0.84) / wAt;
  drawHeraldry(lctx, kind, w / 2, h / 2, size, opts.charge);

  // Paint tone: soft dirty patches (large, low contrast) so the paint is never flat.
  lctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 26; i++) {
    const r = rng.range(0.06, 0.2) * w;
    const g = lctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(30,20,10,${(0.1 + 0.25 * wear) * rng.next()})`); g.addColorStop(1, 'rgba(30,20,10,0)');
    lctx.save(); lctx.translate(rng.range(0, w), rng.range(0, h)); lctx.fillStyle = g; lctx.fillRect(-r, -r, 2 * r, 2 * r); lctx.restore();
  }

  lctx.globalCompositeOperation = 'destination-out';
  const px = w / 512;
  // Craquelure: jagged hair-line cracks wandering across the paint.
  lctx.lineJoin = 'round';
  const cracks = Math.round(20 + 140 * wear);
  for (let i = 0; i < cracks; i++) {
    let x = rng.range(0, w), y = rng.range(0, h), a = rng.range(0, Math.PI * 2);
    lctx.strokeStyle = `rgba(0,0,0,${0.5 + 0.5 * rng.next()})`;
    lctx.lineWidth = rng.range(0.6, 1.6) * px;
    lctx.beginPath(); lctx.moveTo(x, y);
    const n = rng.int(4, 12);
    for (let k = 0; k < n; k++) {
      a += rng.range(-0.9, 0.9);
      const l = rng.range(4, 14) * px;
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      lctx.lineTo(x, y);
    }
    lctx.stroke();
  }
  // Flakes: many small angular chips, clustered (paint lifts where it already cracked).
  const clusters = Math.round(8 + 60 * wear);
  for (let c = 0; c < clusters; c++) {
    const ccx = rng.range(0, w), ccy = rng.range(0, h), spread = rng.range(0.02, 0.09) * w;
    const count = rng.int(4, 10 + Math.round(30 * wear));
    for (let i = 0; i < count; i++) {
      const cx = ccx + rng.gauss(0, spread * 0.5), cy = ccy + rng.gauss(0, spread * 0.5);
      const r = rng.range(1.2, 3 + 7 * wear) * px;
      const n = rng.int(4, 7);
      lctx.fillStyle = `rgba(0,0,0,${0.75 + 0.25 * rng.next()})`;
      lctx.beginPath();
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2 + rng.range(-0.3, 0.3), rr = r * rng.range(0.4, 1.3);
        const qx = cx + Math.cos(ang) * rr, qy = cy + Math.sin(ang) * rr;
        k === 0 ? lctx.moveTo(qx, qy) : lctx.lineTo(qx, qy);
      }
      lctx.closePath(); lctx.fill();
    }
  }
  // Scratches: straight, fine, in a couple of dominant directions (handling / blade strikes).
  lctx.lineCap = 'round';
  const dirA = rng.range(0, Math.PI);
  for (let i = 0; i < 20 + 60 * wear; i++) {
    lctx.strokeStyle = `rgba(0,0,0,${0.4 + 0.5 * rng.next()})`;
    lctx.lineWidth = rng.range(0.4, 1.2) * px;
    const x0 = rng.range(0, w), y0 = rng.range(0, h), ang = dirA + rng.gauss(0, 0.35), l = rng.range(0.02, 0.14) * w;
    lctx.beginPath(); lctx.moveTo(x0, y0); lctx.lineTo(x0 + Math.cos(ang) * l, y0 + Math.sin(ang) * l); lctx.stroke();
  }
  // Overall fade.
  lctx.globalCompositeOperation = 'destination-in';
  lctx.fillStyle = `rgba(0,0,0,${1 - 0.3 * wear})`;
  lctx.fillRect(0, 0, w, h);
  lctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(layer.canvas as CanvasImageSource, 0, 0);

  // Edge grime: darken toward the borders (handled, smoke).
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(8,6,4,${0.25 + 0.35 * wear})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.name = `heraldry:${kind}`;
  return tex;
}
