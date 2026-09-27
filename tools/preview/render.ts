/**
 * Render preview: `?view=heraldry` (comparison board) | `?view=gallery` (material gallery, default).
 */
import { HERALDRY_KINDS, drawHeraldry, heraldryTexture } from '../../src/render/heraldry';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'gallery';
declare global { interface Window { __ready?: boolean; __log?: string[] } }

async function heraldryBoard(): Promise<void> {
  const board = document.getElementById('board')!;
  board.style.display = 'block';
  (document.getElementById('c') as HTMLCanvasElement).style.display = 'none';
  const refs = ['/concept-art/heraldry/royal-arms-user-reference.png', '/concept-art/heraldry/heraldry-system-user-reference.png'];
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;padding:10px;align-items:flex-start;flex-wrap:wrap';
  board.appendChild(row);
  for (const src of refs) {
    const im = new Image(); im.src = src; im.style.height = '360px'; row.appendChild(im);
    await im.decode();
  }
  // our vector charges on a dark field in the same layout as the sheet
  const cv = document.createElement('canvas'); cv.width = 540; cv.height = 360; row.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#1d1b19'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sheet = ['household', 'crown', 'army', 'academy', 'cathedral', 'treasury'] as const;
  sheet.forEach((k, i) => drawHeraldry(ctx, k, 90 + (i % 3) * 180, 90 + Math.floor(i / 3) * 180, 130, '#e6dccb'));
  const cv2 = document.createElement('canvas'); cv2.width = 216; cv2.height = 360; row.appendChild(cv2);
  const c2 = cv2.getContext('2d')!;
  c2.fillStyle = '#23201d'; c2.fillRect(0, 0, 216, 360);
  drawHeraldry(c2, 'royal', 108, 180, 330, '#b8955c');
  // worn textures
  const row2 = document.createElement('div'); row2.style.cssText = row.style.cssText; board.appendChild(row2);
  const specs: [typeof HERALDRY_KINDS[number], string, string, number, number][] = [
    ['royal', '#1b1a18', '#b08a52', 0.8, 1.6], ['royal', '#4a1414', '#c9a45a', 0.4, 2], ['household', '#1c2436', '#c9a45a', 0.5, 1],
    ['army', '#2a2622', '#9a9a90', 0.6, 1], ['cathedral', '#d8cfbd', '#2a2420', 0.3, 1], ['treasury', '#3a2c1c', '#c9a45a', 0.7, 1],
    ['academy', '#20303a', '#d8d0c0', 0.5, 1], ['crown', '#101010', '#d4b06a', 0.9, 1],
  ];
  for (const [k, f, c, w, a] of specs) {
    const t = heraldryTexture(k, { field: f, charge: c, wear: w, size: 256, aspect: a });
    const img = t.image as HTMLCanvasElement | OffscreenCanvas;
    const out = document.createElement('canvas'); out.width = img.width; out.height = img.height;
    out.getContext('2d')!.drawImage(img as CanvasImageSource, 0, 0);
    out.style.height = '300px'; row2.appendChild(out);
  }
  window.__ready = true;
}

if (view === 'heraldry') void heraldryBoard();
