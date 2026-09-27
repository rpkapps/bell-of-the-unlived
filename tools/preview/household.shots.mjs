// Garden Court screenshots: node tools/preview/household.shots.mjs <port> <outDir> [view ...]
// A view is name:x,y,z:tx,ty,tz (camera position → look target). Without views, a default tour.
import { chromium } from 'playwright-core';
const [port = '5215', out = '/tmp', ...args] = process.argv.slice(2);
const DEFAULT = [
  'entry:-24.5,2.2,68:10,20,-80',
  'avenue:0,2.2,50:12,14,-60',
  'terrace:-8,5.5,-2:6,10,-16',
  'maze:-20,9,52:-22,0,20',
  'yard:-14,3,72:-30,1,58',
  'passage:-45.5,1.7,40:-45.5,1.6,20',
  'linen:-47.6,1.8,27:-51,1,23',
  'gallery:-16,10.2,-19:-34,10,-27',
  'hall:0,5,-17:0,6,-40',
  'ante:6,10.3,-47:-4,10,-56',
  'throne:0,10.6,-60:0,11,-84',
  'orangery:40,2.2,28:50,3,-4',
  'heirs:47,3,-10:47,1,-30',
  'loggia:16,10.3,-55.5:40,9,-54',
  'bellterrace:27,16.5,-76:40,24,-88',
  'bellview:39,17,-66:39,30,-91',
];
const views = (args.length ? args : DEFAULT).map((s) => { const [name, p, t] = s.split(':'); return { name, p: p.split(',').map(Number), t: t.split(',').map(Number) }; });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('[household]')) console.log('console:', m.text()); });
await page.goto(`http://127.0.0.1:${port}/?region=household&quality=${process.env.Q ?? 'low'}&origin=householdKnight`);
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const g = window.__game;
  g.deps.ui?.setHudVisible?.(false);
  for (const e of g.enemies) { e.object.visible = !!window.__showEnemies; }
});
for (const v of views) {
  await page.evaluate(({ p, t }) => {
    const g = window.__game, T = window.THREE;
    g.player.teleport(new T.Vector3(p[0], p[1] - 1.6, p[2]), 0);
    g.player.object.visible = false;
    g.cameraOverride = (dt, cam) => { cam.position.set(p[0], p[1], p[2]); cam.lookAt(t[0], t[1], t[2]); return true; };
  }, v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/hh-${v.name}.png` });
  console.log('shot', v.name);
}
const stats = await page.evaluate(() => { const r = window.__game.deps.renderer; return r.stats ? JSON.stringify(r.stats()) : ""; });
if (stats) console.log(stats);
await browser.close();
