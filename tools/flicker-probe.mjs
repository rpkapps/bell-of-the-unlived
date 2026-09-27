// Flicker probe: renders N consecutive frames of a region (loop stopped, stepped by hand) and
// measures temporal instability. Smooth change (camera motion, slow animation) has a small second
// temporal difference |f(t+1) - 2 f(t) + f(t-1)|; pixels that toggle (shadow shimmer, z-fighting,
// light pops, sparkle) have a large one.
//
//   node tools/flicker-probe.mjs <region> <run>... [--q=medium] [--frames=10] [--thr=0.06]
//        [--out=tools/out/flicker] [--hide=player,enemies] [--dt=0.016667] [--speed=1.5] [--settle=30]
//   run  = spec[|mode[|off,off...]]  (one browser session serves every run; loading is the slow part)
//   spec (like region-shots): anchorName | bell:<id> | x,y,z[@yaw]  optional ~pitch
//   mode = static | pan (camera yaw 0.14 deg/frame) | walk (player forward, camera follows) | dolly (sideways)
//   off  = grain | bloom | gtao | smaa | fxaa | motion | grade | fill | sun (shadows) | anim (renderer clock frozen)
//
// Prints per view: flicker pixels (% of the frame whose max second difference > thr), mean second
// difference, plus the first frame and a heat map PNG (red = flicker energy) in --out.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));
const [region, ...specs] = args.filter((a) => !a.startsWith('--'));
const base = opt.base ?? 'http://127.0.0.1:5191/';
const out = opt.out ?? 'tools/out/flicker';
mkdirSync(out, { recursive: true });
const [w, h] = (opt.view ?? '960x540').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
await page.goto(`${base}?region=${region}&origin=${opt.origin ?? 'householdKnight'}&quality=${opt.q ?? 'medium'}`);
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 580000 });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
await page.evaluate(({ hide }) => {
  const g = window.__game;
  g.loop.stop();
  for (const e of g.enemies) { e.aware = false; if (hide.includes('enemies')) e.object.visible = false; }
  if (hide.includes('player')) g.player.object.visible = false;
  // feature toggles, undone after each run
  window.__probeOff = (off) => {
    const R = g.deps.renderer, undo = [];
    const setp = (o, k, v) => { if (!o) return; const old = o[k]; o[k] = v; undo.push(() => { o[k] = old; }); };
    for (const k of off) {
      if (k === 'grain') setp(R.settings, 'filmGrain', false);
      else if (k === 'fill') setp(g.fill, 'intensity', 0);
      else if (k === 'sun') setp(R.sun, 'castShadow', false);
      else if (k === 'anim') { const f = g.deps.renderer.render.bind(R); setp(R, 'render', () => f(0)); }
      else setp(R[k], 'enabled', false);
    }
    return () => { for (const u of undo.reverse()) u(); };
  };
}, { hide: (opt.hide ?? '').split(',').filter(Boolean) });

const frames = +(opt.frames ?? 10), thr = +(opt.thr ?? 0.06), dt = +(opt.dt ?? 1 / 60);
for (const run of specs) {
  const [spec, mode = opt.mode ?? 'static', offs = ''] = run.split('|');
  const [where, pitch] = spec.split('~');
  const r = await page.evaluate(({ where, pitch, settle }) => {
    const g = window.__game, R = window.__region, T = window.THREE;
    let pos, yaw = g.player.yaw;
    if (where.startsWith('bell:')) { const b = R.stillbells().find((x) => x.id === where.slice(5)); if (!b) return 'no bell ' + where; pos = b.pos.clone(); yaw = b.yaw; }
    else if (/^-?[\d.]+,/.test(where)) { const [xyz, y2] = where.split('@'); const [x, y, z] = xyz.split(',').map(Number); pos = new T.Vector3(x, y, z); if (y2) yaw = +y2; }
    else { const a = R.L?.anchors?.[where]; if (!a) return 'no anchor ' + where; pos = a.pos.clone(); if (a.yaw !== undefined) yaw = a.yaw; }
    g.player.move = null; g.player.teleport(pos, yaw); g.cam.snapBehind(g.player);
    if (pitch) g.cam.pitch = +pitch;
    g.deps.renderer.cameraCut?.();
    // settle: camera damping, light fades, env capture
    for (let i = 0; i < settle; i++) g.loop.advance(1 / 30);
    window.__probeStart = { pos: pos.clone(), yaw };
    return 'ok ' + pos.toArray().map((v) => v.toFixed(1)).join(',');
  }, { where, pitch, settle: +(opt.settle ?? 30) });
  if (!r.startsWith('ok')) { console.log(spec, r); continue; }
  await page.evaluate((offs) => { window.__probeUndo = window.__probeOff(offs); }, offs.split(',').filter(Boolean));
  const t0 = Date.now();
  const res = await page.evaluate(({ frames, thr, dt, mode, speed }) => {
    const g = window.__game, cv = g.deps.renderer.renderer.domElement;
    const W = cv.width, H = cv.height;
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const ctx = c2.getContext('2d', { willReadFrequently: true });
    const st = window.__probeStart;
    const fwd = new window.THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
    const side = new window.THREE.Vector3(fwd.z, 0, -fwd.x);
    const lum = [];
    let first = null;
    for (let k = 0; k < frames; k++) {
      if (mode === 'walk') { g.player.teleport(st.pos.clone().addScaledVector(fwd, speed * dt * k), st.yaw); }
      if (mode === 'dolly') { g.player.teleport(st.pos.clone().addScaledVector(side, speed * dt * k), st.yaw); }
      if (mode === 'pan') g.cam.yaw += 0.0025;
      g.loop.advance(dt);
      ctx.drawImage(cv, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      if (!first) first = c2.toDataURL('image/png');
      const L = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      lum.push(L);
    }
    const N = W * H, mx = new Float32Array(N), sum = new Float32Array(N);
    let tot = 0;
    for (let t = 1; t < frames - 1; t++) {
      const a = lum[t - 1], b = lum[t], c = lum[t + 1];
      for (let i = 0; i < N; i++) { const v = Math.abs(c[i] - 2 * b[i] + a[i]); sum[i] += v; if (v > mx[i]) mx[i] = v; tot += v; }
    }
    let flick = 0;
    const img = ctx.createImageData(W, H), base = lum[0];
    // region breakdown: 3x3 grid of flicker %
    const grid = new Array(9).fill(0);
    for (let i = 0; i < N; i++) {
      const f = mx[i] > thr;
      if (f) { flick++; const x = i % W, y = (i / W) | 0; grid[Math.min(2, (y * 3 / H) | 0) * 3 + Math.min(2, (x * 3 / W) | 0)]++; }
      const gv = 40 + base[i] * 150;
      const e = Math.min(1, Math.max(0, (sum[i] / (frames - 2) - 0.012) / 0.06));
      img.data[i * 4] = gv + e * (255 - gv); img.data[i * 4 + 1] = gv * (1 - e); img.data[i * 4 + 2] = gv * (1 - e); img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { flickPct: (100 * flick) / N, mean: tot / (N * (frames - 2)), grid: grid.map((v) => ((100 * v) / (N / 9)).toFixed(1)), first, heat: c2.toDataURL('image/png') };
  }, { frames, thr, dt, mode, speed: +(opt.speed ?? 1.5) });
  await page.evaluate(() => window.__probeUndo?.());
  const tag = `${region}-${where.replace(/[^\w.-]+/g, '_')}-${mode}${offs ? '-no_' + offs.replace(/,/g, '_') : ''}${opt.tag ? '-' + opt.tag : ''}`;
  writeFileSync(`${out}/${tag}.png`, Buffer.from(res.first.split(',')[1], 'base64'));
  writeFileSync(`${out}/${tag}-heat.png`, Buffer.from(res.heat.split(',')[1], 'base64'));
  console.log(`${tag}: flicker ${res.flickPct.toFixed(3)}%  mean2nd ${(res.mean * 1000).toFixed(3)}e-3  grid[${res.grid.join(' ')}]  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await browser.close();
