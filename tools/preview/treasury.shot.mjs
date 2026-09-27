// Screenshots of the Undervaults from named viewpoints (dev server must be running).
// Usage: node tools/preview/treasury.shot.mjs [baseUrl] [view1,view2,...] [quality]
// Views use either the player camera (player placed at p, facing yaw, camera pitch) or a free
// camera override (cam → look).
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5214/';
const only = (process.argv[3] ?? '').split(',').filter(Boolean);
const quality = process.argv[4] ?? 'low';
const VIEWS = {
  entry: { p: [12.4, 0, 7.4], yaw: Math.PI, pitch: 0.05 },
  entryWide: { cam: [9, 3.2, 8], look: [0, 16, -110], at: [9, 0, 8] },
  quays: { cam: [0, 6, -4], look: [0, 1, -45], at: [0, 0, -6] },
  famine: { cam: [4, 3.5, -20], look: [16, 1, -12], at: [4, 0, -20] },
  prosper: { cam: [-2, 3.5, -8], look: [-14, 1, -18], at: [-2, 0, -8] },
  breadline: { cam: [2, 4, -42], look: [10, 3, -56], at: [2, 0, -42] },
  balcony: { cam: [-16, 7.2, -55], look: [6, 5, -58.5], at: [-16, 5, -55] },
  culvert: { p: [0, -3.2, -62], yaw: Math.PI, pitch: 0.1 },
  sluice: { cam: [-8, -0.4, -82], look: [6, -2.5, -93], at: [-8, -3.2, -82] },
  deep: { cam: [-24, -4.2, -84], look: [-38, -6.5, -98], at: [-24, -7.8, -84] },
  cage: { cam: [-30, -5.5, -88], look: [-34, -5.5, -94], at: [-30, -7.8, -88] },
  hall: { cam: [-27, 4, -62.5], look: [-14, 3, -74], at: [-27, 0, -62.5] },
  strong: { cam: [-37.5, -5.6, -116], look: [-44, -7, -116], at: [-37.5, -7.8, -116] },
  gallery: { cam: [-19, -5.6, -115], look: [-8, -7.5, -115], at: [-19, -7.8, -115] },
  ante: { cam: [16, -0.8, -100.5], look: [6, -2.5, -109], at: [16, -3.2, -100.5] },
  archive: { cam: [20, -1, -100], look: [28, -2, -105], at: [20, -3.2, -100] },
  arena: { cam: [10, 2, -113.5], look: [10, -1, -130], at: [10, -3.2, -113.5] },
  arenaUp: { cam: [10, -1, -118], look: [10, 44, -124], at: [10, -3.2, -118] },
  hoard: { cam: [-33, -4.6, -132], look: [-33, -7, -146], at: [-33, -7.8, -132] },
  tower: { cam: [0, 20, -40], look: [10, 38, -124], at: [0, 0, -40] },
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(300000);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + `?region=treasury&quality=${quality}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(3000);
await page.evaluate(() => { const ui = document.querySelectorAll('.hud, .toast, .banner'); ui.forEach((e) => (e.style.opacity = '0')); });
const names = only.length ? only : Object.keys(VIEWS);
for (const n of names) {
  const v = VIEWS[n];
  if (!v) { console.log('no view', n); continue; }
  await page.evaluate((v) => {
    const g = window.__game, T = window.THREE;
    g.player.hpMax = g.player.hp = 1e7;
    for (const e of g.enemies) { e.aware = false; e.target = null; }
    if (v.cam) {
      const c = new T.Vector3(...v.cam), l = new T.Vector3(...v.look);
      g.player.teleport(new T.Vector3(...v.at), 0);
      g.cameraOverride = (_dt, cam) => { cam.position.copy(c); cam.lookAt(l); cam.updateMatrixWorld(); return true; };
      g.deps.renderer.setFocus(l);
    } else {
      g.cameraOverride = null;
      g.player.teleport(new T.Vector3(...v.p), v.yaw);
      g.cam.snapBehind(g.player);
      g.cam.pitch = v.pitch ?? 0.2;
    }
  }, v);
  await page.waitForTimeout(3500);
  const f = `tools/out/treasury-${n}.png`;
  await page.screenshot({ path: f });
  const info = await page.evaluate(() => { const r = window.__game.deps.renderer.renderer; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null; });
  console.log(f, JSON.stringify(info));
}
await browser.close();
