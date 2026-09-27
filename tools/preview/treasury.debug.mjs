// Combat sanity: each enemy type duels a god-mode player for a while; log which moves connect.
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5214/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(400000);
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(base + '?region=treasury&quality=low&norender');
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(2000);
const kinds = (process.argv[3] ?? 'tr_militia,tr_militiaFork,tr_collector,tr_sentry,tr_guardian,tr_mimic,tr_warden').split(',');
for (const kind of kinds) {
  const r = await page.evaluate(async (kind) => {
    const g = window.__game, T = window.THREE;
    const log = {};
    const prev = g.combat.onResult;
    g.combat.onResult = (res) => { prev(res); if (res.attacker.def?.kind === kind) { const k = res.move.id + ':' + res.outcome; log[k] = (log[k] ?? 0) + 1; } };
    const p = g.player;
    const e = g.enemies.find((x) => x.def.kind === kind && !x.dead);
    if (e.isBoss) { e.engaged = true; }
    const hours0 = (window.__session.pd.hours = 5000);
    for (const o of g.enemies) if (o !== e && !o.isBoss) { o.aware = false; o.target = null; o.def.sight = Math.min(o.def.sight, 0.01); }
    const C = new T.Vector3(10, -3.2, -120);
    e.home.copy(C); e.leash = 40; e.patrol = null;
    e.teleport(C.clone(), 0); e.move = null;
    p.teleport(C.clone().add(new T.Vector3(0, 0, kind === 'tr_warden' ? 8 : 2.2)), Math.PI);
    e.becomeAware(p);
    const t0 = g.time;
    const moves = {};
    const iv = setInterval(() => { if (!p.dead) p.hp = p.hpMax; const m = e.move?.def.id; if (m) moves[m] = 1; }, 50);
    const DUR = e.isBoss ? 40 : kind.startsWith('tr_collector') ? 30 : 14;
    await new Promise((res) => { const w = () => (g.time - t0 > DUR ? res() : setTimeout(w, 200)); w(); });
    clearInterval(iv);
    g.combat.onResult = prev;
    e.aware = false; e.target = null; e.teleport(e.home.clone().add(new T.Vector3(40, 0, 0)), 0);
    e.engaged = false;
    return { kind, used: Object.keys(moves), hits: log, simSeconds: +(g.time - t0).toFixed(1), hoursLost: hours0 - window.__session.pd.hours, phase: e.phase, sentinels: g.enemies.filter((x) => x.def.kind === 'tr_coinSentinel').length };
  }, kind);
  console.log(JSON.stringify(r));
}
await browser.close();
