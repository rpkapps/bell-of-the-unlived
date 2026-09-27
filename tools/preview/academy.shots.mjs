// Academy viewpoint screenshots: node tools/preview/academy.shots.mjs [baseUrl] [outDir] [views…]
// Loads ?region=academy, then for each named view places the player and a fixed camera and saves a PNG.
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5212/';
const out = process.argv[3] ?? '.';
const only = process.argv.slice(4);
const VIEWS = {
  // name: [camera pos, look-at, player pos (optional)]
  entry: [[0, 4.6, 72.5], [0, 20, 10], [0, 2, 68]],
  causewayHigh: [[16, 14, 80], [-6, 12, 0]],
  landing: [[4, 5, 36], [-4, 4, 18], [0, 2, 30]],
  theatre: [[-20, 12, 18], [-40, 3, 0], [-26, 8, 22]],
  theatreStage: [[-36, 4.5, 8], [-36, 4, 22], [-36, 2, 4]],
  tunnel: [[-14, 3.6, -1.5], [-5, 3, -1.5], [-13, 2, -1.5]],
  liftWell: [[4, 5, 3], [0, 4, 14], [0, 2, 5]],
  terrace: [[0, 21, 6], [0, 22, 30], [0, 18, 8]],
  hall: [[12, 21.5, 2], [-12, 20, -6], [10, 18, 1]],
  hallGallery: [[-12, 26, -10], [8, 22, 0], [-12, 24, -10.5]],
  bridge: [[-18, 20.5, -9], [-40, 19, -9], [-18, 18, -9]],
  labs: [[-30, 24, -2], [-42, 17, -24], [-32, 18, -9]],
  labB: [[-34, 20.5, -22], [-44, 18, -29], [-36, 18, -22]],
  lab9: [[-49, 21, -6], [-60, 18, -10], [-47, 18, -9]],
  yard: [[10, 28, -20], [-12, 26, -40], [8, 24, -22]],
  spire: [[20, 34, -20], [0, 34, -40]],
  arena: [[-6.25, 50, -48], [-6.25, 46, -68], [-6.25, 44, -52]],
  bell: [[-6.25, 60, -52], [-6.25, 80, -80]],
  overview: [[60, 70, 90], [-10, 10, -20]],
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(400000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(base + '?region=academy&quality=low&origin=courtMage');
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'academy', null, { timeout: 400000 });
await page.waitForTimeout(3000);
const stats = await page.evaluate(() => ({ stats: window.__region.L.stats, calls: window.__game.deps.renderer.renderer?.info?.render }));
console.log(JSON.stringify(stats.stats && { tris: stats.stats.triangles, meshes: stats.stats.meshes, lights: stats.stats.lights, ms: Math.round(stats.stats.buildMs) }));
for (const [name, [cam, look, pl]] of Object.entries(VIEWS)) {
  if (only.length && !only.includes(name)) continue;
  await page.evaluate(([c, l, p]) => {
    const g = window.__game, T = window.THREE;
    for (const e of g.enemies) { e.aware = false; e.engaged = false; }
    if (p) { g.player.teleport(new T.Vector3(...p), 0); g.player.vy = 0; }
    g.cameraOverride = (dt, cam) => { cam.position.set(...c); cam.lookAt(...l); return true; };
    window.__region.zoneId = '';
  }, [cam, look, pl]);
  await page.waitForTimeout(2600);
  const info = await page.evaluate(() => { const r = window.__game.deps.renderer; const i = r.renderer?.info?.render ?? r.info?.render; return i ? { calls: i.calls, tris: i.triangles } : null; });
  await page.screenshot({ path: `${out}/academy-${name}.png` });
  console.log(name, JSON.stringify(info));
}
for (const e of errs.slice(0, 12)) console.log('ERR', e.slice(0, 300));
await browser.close();
