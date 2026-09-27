// Belfry screenshots: node tools/preview/belfry.shots.mjs <baseUrl> <outDir> [view ...]
// Views: name:px,py,pz:cx,cy,cz:lx,ly,lz  (player position, camera position, look-at)
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:5216/', outDir = '.', ...views] = process.argv.slice(2);
const DEFAULT = [
  'foot:0,-3,63.9:0,0,72:0,22,-5',
  'causeway:0,-1.5,42:6,1.5,52:0,12,10',
  'hall:0,0,8:0,3.2,11:0,2,-10',
  'nave:0,14,8:-3,17,12:0,15,-10',
  'coronation:0,28,6:0,31,10:0,29.5,-12',
  'crown:6,35,6:9,39,9:0,45,-8',
];
const list = views.length ? views : DEFAULT;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('[belfry]')) console.log('console:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + '?region=belfry&quality=low&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 600000 });
await page.waitForTimeout(3000);
const stats = await page.evaluate(() => { const L = window.__region?.L; return L?.stats; });
console.log('stats', JSON.stringify(stats));
for (const v of list) {
  const [name, p, c, l] = v.split(':');
  const [px, py, pz] = p.split(',').map(Number), [cx, cy, cz] = c.split(',').map(Number), [lx, ly, lz] = l.split(',').map(Number);
  await page.evaluate(([px, py, pz, cx, cy, cz, lx, ly, lz]) => {
    const g = window.__game, T = window.THREE;
    g.player.teleport(new T.Vector3(px, py, pz), 0);
    for (const e of g.enemies) { e.aware = false; e.target = null; }
    g.cameraOverride = (_dt, cam) => { cam.position.set(cx, cy, cz); cam.lookAt(lx, ly, lz); return true; };
  }, [px, py, pz, cx, cy, cz, lx, ly, lz]);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${outDir}/belfry-${name}.png` });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => window.__game.deps.renderer.stats());
  console.log(name, JSON.stringify(r));
  if (process.env.BREAKDOWN) console.log(await page.evaluate(() => {
    const out = {}; const g = window.__game;
    const vis = (o) => { for (let c = o; c; c = c.parent) if (!c.visible) return false; return true; };
    g.scene.traverse((o) => { if (!o.isMesh || !vis(o)) return; let top = o; while (top.parent && top.parent !== g.scene && !(top.name || '').startsWith('kit:') && !(top.name || '').startsWith('inst:')) top = top.parent; const k = top.name || top.type; out[k] = (out[k] || 0) + 1; });
    return JSON.stringify(Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 30));
  }));
}
await browser.close();
