// Aldren combat sanity (headless): the Returned stands in the arena; every move Aldren uses is
// logged with whether it connected. node tools/preview/belfry.combat.mjs [baseUrl] [secondsPerPhase]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5216/';
const secs = parseInt(process.argv[3] ?? '40', 10);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + '?region=belfry&quality=low&norender&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play', null, { timeout: 600000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game, r = window.__region;
  g.deps.ui.confirm = async () => true;
  window.__log = {};
  window.__immortal = setInterval(() => { const p = g.player; if (p && !p.dead) { p.hp = p.hpMax; p.stamina = p.staminaMax; } }, 50);
  const prev = g.combat.onResult;
  g.combat.onResult = (res) => {
    prev(res);
    if (res.target !== g.player) return;
    const id = res.move?.id ?? '?';
    const k = window.__log[id] ??= { hits: 0, dmg: 0 };
    k.hits++; k.dmg = Math.max(k.dmg, res.damage);
  };
  const it = r.inter.list.find((x) => x.id === 'fog:aldren');
  g.player.teleport(it.pos.clone(), Math.PI);
  it.action();
});
await page.waitForFunction(() => !!window.__region.fight, null, { timeout: 60000, polling: 200 });
const used = async () => page.evaluate(() => { const b = window.__region.bosses.get('aldren'); window.__used ??= {}; const m = b.move?.def.id; if (m) window.__used[m] = (window.__used[m] || 0) + 1; });
const runPhase = async (label) => {
  await page.evaluate(() => { window.__used = {}; window.__log = {}; window.__usedT = setInterval(() => { const b = window.__region.bosses.get('aldren'); const m = b?.move?.def.id; if (m && m !== window.__lastM) { window.__used[m] = (window.__used[m] || 0) + 1; } window.__lastM = m; }, 30); });
  // keep the Returned near the King so every range band gets exercised
  for (let t = 0; t < secs; t += 2) {
    await page.evaluate((t) => {
      const g = window.__game, b = window.__region.bosses.get('aldren');
      const d = [2.5, 4.5, 8, 12, 1.5][Math.floor(t / 6) % 5];
      const p = g.player;
      if (p.pos.distanceTo(b.pos) > d + 3 || p.pos.distanceTo(b.pos) < d - 1.5) {
        const dir = p.pos.clone().sub(b.pos).setY(0).normalize();
        if (!isFinite(dir.x)) dir.set(0, 0, 1);
        const C = window.__region.L.arenas[0].center;
        const q = b.pos.clone().addScaledVector(dir, d).setY(35);
        const off = q.clone().sub(C).setY(0);
        if (off.length() > 10.5) q.copy(C).addScaledVector(off.normalize(), 10.5).setY(35);
        p.teleport(q, Math.atan2(b.pos.x - q.x, b.pos.z - q.z));
      }
    }, t);
    await page.waitForTimeout(2000);
  }
  const res = await page.evaluate(() => { clearInterval(window.__usedT); return { used: window.__used, hits: window.__log, phase: window.__region.bosses.get('aldren').phase, fight: !!window.__region.fight, dead: window.__game.player.dead, gt: window.__game.time.toFixed(0) }; });
  console.log(`\n== ${label} (phase ${res.phase}, fight ${res.fight}, dead ${res.dead}, game time ${res.gt}s)`);
  console.log(' moves used:', JSON.stringify(res.used));
  console.log(' hits on the Returned:', JSON.stringify(res.hits));
};
void used;
await runPhase('The Young Conqueror');
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); b.hp = b.hpMax * 0.66 - 5; });
await page.waitForTimeout(4000);
await runPhase('The Sorcerer-King');
await page.evaluate(() => { const b = window.__region.bosses.get('aldren'); b.hp = b.hpMax * 0.33 - 5; });
await page.waitForTimeout(5000);
await runPhase('The Ancient King');
await browser.close();
