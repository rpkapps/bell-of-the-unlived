// Whole-campaign smoke test: one session travels Hospice → every region → Hospice, checking each
// region loads, the player stands on ground, the scene does not leak between loads, rescued allies
// appear at the Hospice, and nothing throws.   node tools/campaign-test.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5191/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(600000);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
let failures = 0;
const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const until = (fn, a, t = 240000) => page.waitForFunction(fn, a, { timeout: t, polling: 300 }).then(() => true).catch(() => false);
await page.goto(base + '?skipintro&origin=householdKnight&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 280000 });
const guests = await ev(async () => (await import('/src/game/regions/hub.ts')).HOSPICE_GUESTS.map((g) => g.id));
console.log('hospice guests:', guests.join(', '));
await ev(() => {
  const ws = window.__session.ws;
  for (const b of ['corvane', 'varr', 'orrow', 'vessaline', 'aurelmask', 'celwyn']) ws.flags['boss.' + b] = true;
  ws.stillbells.hospice = true;
});
const baseline = await ev(() => window.__game.scene.children.length);
const route = ['army.road', 'academy.causeway', 'cathedral.gate', 'treasury.market', 'household.gate', 'belfry.foot', 'hospice'];
let from = 'hospice';
for (const bell of route) {
  if (bell === 'hospice') await ev((ids) => { for (const id of ids) window.__session.ws.npcs[id] = 'rescued'; }, guests);
  const open = await ev((b) => window.__session.destinations().find((d) => d.id === b)?.unlocked ?? false, bell);
  check(`${bell} unlocked`, open);
  await ev(([f, b]) => { window.__session.atBell = { id: f, name: f }; window.__session.travel(b); }, [from, bell]);
  const region = bell === 'hospice' ? 'ashbridge' : bell.split('.')[0];
  const ok = await until((r) => window.__session.region?.id === r && window.__game.player && window.__session.playing !== false, region);
  await ev(() => window.__session.leaveStillbell?.());
  await until(() => window.__game.mode === 'play', undefined, 60000);
  // let the simulation run a little, then check footing
  await page.waitForTimeout(4000);
  const st = await ev(() => {
    const g = window.__game, p = g.player, R = window.__session.region;
    return { id: R.id, y: +p.pos.y.toFixed(2), grounded: !!p.grounded, dead: p.dead, enemies: g.enemies.length, scene: g.scene.children.length, killY: R.L?.killY ?? null };
  });
  check(`travelled to ${region}`, ok && st.id === region, JSON.stringify(st));
  check(`${region}: player standing, alive`, !st.dead && (st.killY === null || st.y > st.killY + 1));
  from = bell;
}
const after = await ev(() => window.__game.scene.children.length);
check('no scene growth across six region loads', after <= baseline + 5, `${baseline} → ${after}`);
// Allies rescued out in the regions (fates set before the last leg home) wait at the Hospice.
const present = await ev((ids) => ids.filter((id) => window.__session.region.npcs?.has('guest:' + id)), guests);
check('every rescued ally stands in the Hospice', present.length === guests.length, `${present.length}/${guests.length}: ${present.join(', ')}`);
check('no page errors', errs.length === 0);
for (const e of errs.slice(0, 10)) console.log('ERR', e.slice(0, 300));
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
