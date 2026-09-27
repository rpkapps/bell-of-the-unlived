// Aldren fight snapshots: node tools/preview/belfry.fight.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:5216/', outDir = '.'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + '?region=belfry&quality=low&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 600000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game, r = window.__region, ui = g.deps.ui;
  ui.confirm = async () => true;
  window.__immortal = setInterval(() => { const p = g.player; if (p && !p.dead) p.hp = p.hpMax; }, 100);
  const it = r.inter.list.find((x) => x.id === 'fog:aldren');
  g.player.teleport(it.pos.clone(), Math.PI);
  it.action();
});
await page.waitForFunction(() => !!window.__region.fight, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => { document.getElementById('ui').querySelectorAll('.hint, .toast').forEach((e) => e.remove()); });
const cam = (px, py, pz, lx, ly, lz) => page.evaluate(([px, py, pz, lx, ly, lz]) => { window.__game.cameraOverride = (_d, c) => { c.position.set(px, py, pz); c.lookAt(lx, ly, lz); return true; }; }, [px, py, pz, lx, ly, lz]);
const fast = (on) => page.evaluate((on) => { window.__game.deps.noRender = on; }, on);
const shot = async (n) => { await page.evaluate(() => { window.__game.loop.timeScale = 0; }); await fast(false); await page.waitForTimeout(3000); await page.screenshot({ path: `${outDir}/belfry-fight-${n}.png` }); console.log('shot', n, await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); return JSON.stringify({ phase: b.phase, move: b.move?.def.id, t: b.move?.t?.toFixed(2), bands: b.bands.map((x) => x.band + ':' + x.t.toFixed(2)) }); })); await fast(true); await page.evaluate(() => { window.__game.loop.timeScale = 1; }); };
await fast(true);
await page.waitForTimeout(4000);
await cam(6, 38, 8, 0, 36, -8);
await page.waitForTimeout(2500);
await shot('p1');
// phase 2 and the ring tolls
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); b.hp = b.hpMax * 0.66 - 5; });
await page.waitForFunction(() => window.__region.bosses.get('aldren').phase === 2 && window.__region.bosses.get('aldren').move?.def.id !== 'ald_trans2', null, { timeout: 120000, polling: 250 });
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); b.move = null; b.doAttack('ald_plant', b.def.attacks.find((a) => a.move === 'ald_plant')); });
await cam(0, 52, 16, 0, 35, -5);
await page.waitForFunction(() => { const b = window.__region.bosses.get('aldren'); return b.move?.def.id === 'ald_plant' && b.move.t > 1.6; }, null, { timeout: 60000, polling: 50 });
await shot('p2-rings');
await page.waitForFunction(() => { const b = window.__region.bosses.get('aldren'); return b.move?.def.id === 'ald_plant' && b.move.t > 2.3; }, null, { timeout: 60000, polling: 50 });
await shot('p2-rings-b');
// phase 3
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); b.move = null; b.hp = b.hpMax * 0.33 - 5; });
await page.waitForFunction(() => window.__region.bosses.get('aldren').phase === 3 && window.__region.bosses.get('aldren').move?.def.id !== 'ald_trans3', null, { timeout: 120000, polling: 250 });
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); window.__game.player.teleport(b.pos.clone().add(new window.THREE.Vector3(0, 0, 5)), Math.PI); });
await cam(5, 39, 6, 0, 37, -8);
await page.waitForTimeout(3000);
await shot('p3');
await browser.close();
