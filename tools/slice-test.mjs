// Automated Ashbridge slice test: drives quest logic in a real browser and checks persistence.
// node tools/slice-test.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5190/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f) => page.evaluate(f);
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(base + '?skipintro&origin=courtMage&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 180000 });
await wait(2500);
// helper installed in page: teleport near an interactable and trigger it
await ev(() => {
  window.__do = async (id, dx = 0, dz = 0.9) => {
    const r = window.__region, g = window.__game;
    const it = r.inter.list.find((x) => x.id === id);
    if (!it) return 'missing ' + id;
    g.player.move = null;
    g.player.teleport(new window.THREE.Vector3(it.pos.x + dx, it.pos.y, it.pos.z + dz), Math.atan2(-dx, -dz));
    const text = it.prompt();
    if (!text) return 'unavailable ' + id;
    it.action();
    return 'ok ' + text;
  };
  window.__skipDialogue = setInterval(() => { const b = document.querySelector('.dialogue.open, .dlg.open'); if (b) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); }, 200);
});
const flags = () => ev(() => ({ ...window.__session.ws.flags, oswin: window.__session.ws.npcs.oswin }));
const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const pressEnter = async () => {
  // advance any open dialogue until the game is back in play
  for (let i = 0; i < 80; i++) {
    const st = await ev(() => ({ mode: window.__game.mode, blocking: window.__game.deps.ui.blocking }));
    if (st.mode === 'play' && !st.blocking) return;
    await page.keyboard.press('Enter');
    await wait(300);
  }
};
const until = async (fn, timeout = 90000) => { await page.waitForFunction(fn, null, { timeout, polling: 250 }).catch(() => {}); };

check('starts at the watchtower with mem_gate remembered', (await journal()).includes('mem_gate'));
// Counting room: memory + masonry
console.log(await ev(() => window.__do('masonry')));
await wait(800); await pressEnter();
let j = await journal();
check('remembered route + contradicting masonry recorded', j.includes('mem_route') && j.includes('obs_masonry'));
console.log(await ev(() => window.__do('hatch')));
await until(() => window.__session.ws.flags['ashbridge.hatchOpen']);
check('hatch opened (persistent flag)', !!(await flags())['ashbridge.hatchOpen']);
console.log(await ev(() => window.__do('keyhook')));
await until(() => !!window.__session.pd.inventory.refuge_key);
check('refuge key taken from the ledger hook', await ev(() => !!window.__session.pd.inventory.refuge_key));
console.log(await ev(() => window.__do('grimoire')));
await until(() => window.__session.pd.knownSpells.includes('cinder_bolt'));
check('Cinder Bolt learned', await ev(() => window.__session.pd.knownSpells.includes('cinder_bolt')));
console.log(await ev(() => window.__do('chest')));
await until(() => !!window.__session.pd.inventory.warden_talisman);
check('chest opened → talisman', await ev(() => !!window.__session.pd.inventory.warden_talisman));
console.log(await ev(() => window.__do('refuge')));
await until(() => window.__game.mode === 'dialogue', 20000); await pressEnter();
await until(() => window.__session.ws.npcs.oswin === 'rescued', 20000);
let f = await flags();
check('Oswin rescued', f.oswin === 'rescued', JSON.stringify(f.oswin));
check('rescue journal entry', (await journal()).includes('conf_rescued'));
console.log(await ev(() => window.__do('lever')));
await until(() => { const c = window.__region.L.drawbridge.collider; return window.__session.ws.flags['ashbridge.drawbridge'] && (!c || c.enabled); });
check('drawbridge lowered', !!(await flags())['ashbridge.drawbridge']);
check('drawbridge collider enabled', await ev(() => { const c = window.__region.L.drawbridge.collider; return !c || c.enabled; }));
console.log(await ev(() => window.__do('shard')));
await until(() => window.__session.pd.flask.total === 6);
check('bellbronze shard → +1 flask', await ev(() => window.__session.pd.flask.total === 6));

// Death & Last Breath
await ev(() => { window.__session.pd.hours = 777; const p = window.__game.player; p.hp = 0; p.react('death', p.pos); });
await until(() => window.__session.ws.lastBreath && window.__game.mode === 'play' && !window.__game.player.dead, 120000);
check('re-formed at a Stillbell after death', await ev(() => window.__game.mode === 'play' && !window.__game.player.dead));
check('Last Breath holds the 777 Hours', await ev(() => window.__session.ws.lastBreath?.hours === 777 && window.__session.pd.hours === 0));
await ev(() => { const lb = window.__session.ws.lastBreath; if (lb) window.__game.player.teleport(new window.THREE.Vector3(...lb.pos), 0); });
await until(() => !window.__session.ws.lastBreath, 20000);
check('Hours recovered by touching the Last Breath', await ev(() => window.__session.pd.hours === 777 && !window.__session.ws.lastBreath));

// Boss
console.log(await ev(() => window.__do('fog', 0, 1.2)));
await until(() => window.__region.boss?.engaged === true, 30000);
check('entered the arena, boss engaged', await ev(() => window.__region.boss?.engaged === true));
await ev(() => { const b = window.__region.boss; b.hp = b.threshold + 5; });
await ev(() => { const b = window.__region.boss; const p = window.__game.player; b.hp -= 50; b.react('light', p.pos); });
await until(() => window.__region.boss.phase === 2, 60000);
check('phase 2 reached (cannot be skipped)', await ev(() => window.__region.boss.phase === 2));
await ev(() => { const b = window.__region.boss; b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['ashbridge.reveal'] && window.__region.npcs.has('brannoc'), 180000);
f = await flags();
check('Commander defeated flag', !!f['boss.corvane']);
check('battlefield revealed', !!f['ashbridge.reveal']);
check('memory of Corvane granted', await ev(() => !!window.__session.pd.inventory.memory_corvane));
console.log(await ev(() => window.__do('brannoc', 0, 1.5)));
await wait(1000); await pressEnter(); await wait(1500); await pressEnter();
await until(() => Object.keys(window.__session.ws.journal).includes('conf_brannoc'), 30000);
j = await journal();
check('Brannoc recognises him (journal)', j.includes('conf_brannoc'));

// Persistence across reload
await ev(() => window.__session.save());
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await wait(1500);
await ev(() => window.__session.continueGame());
await page.waitForFunction(() => window.__game.mode === 'play', null, { timeout: 60000 });
await wait(2500);
f = await flags();
check('after reload: hatch, drawbridge, boss, rescue persist', f['ashbridge.hatchOpen'] && f['ashbridge.drawbridge'] && f['boss.corvane'] && f.oswin === 'rescued');
check('after reload: boss not respawned', await ev(() => !window.__region.boss));
check('after reload: drawbridge piece lowered', await ev(() => { const c = window.__region.L.drawbridge.collider; return !c || c.enabled; }));
for (const e of errs.slice(0, 10)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
