// Alternate branch: enter the Commander's Yard before rescuing Oswin → he is taken (persistent loss).
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5191/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(300000);
let failures = 0;
const check = (n, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) failures++; };
const ev = (f) => page.evaluate(f);
const until = (fn, t = 60000) => page.waitForFunction(fn, null, { timeout: t, polling: 250 }).catch(() => {});
await page.goto(base + '?skipintro&origin=householdKnight&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 180000 });
const openFog = () => ev(() => { const r = window.__region, g = window.__game; const it = r.inter.list.find((x) => x.id === 'fog'); g.player.teleport(new window.THREE.Vector3(it.pos.x, it.pos.y, it.pos.z + 1.2), Math.PI); it.action(); });
// 1) decline: nothing changes
await openFog();
await until(() => !!document.querySelector('button[data-key="no"]'));
check('plain-language warning shown while Oswin is imprisoned', await ev(() => !!document.querySelector('button[data-key="yes"]') && document.body.innerText.includes('imprisoned')));
await ev(() => document.querySelector('button[data-key="no"]').click());
await until(() => window.__game.mode === 'play');
check('declining keeps Oswin imprisoned and the fight unstarted', await ev(() => window.__session.ws.npcs.oswin === 'imprisoned' && !window.__region.boss.engaged));
// 2) accept: he is taken
await openFog();
await until(() => !!document.querySelector('button[data-key="yes"]'));
await ev(() => document.querySelector('button[data-key="yes"]').click());
await until(() => window.__session.ws.npcs.oswin === 'taken');
check('crossing takes Oswin (persistent)', await ev(() => window.__session.ws.npcs.oswin === 'taken'));
check('journal records the loss', await ev(() => { const l = window.__session.journal().find((x) => x.id === 'healer'); return l && l.status === 'lost' && l.entries.some((e) => e.loss); }));
check('the cell is empty', await ev(() => !window.__region.npcs.has('oswin')));
check('the rosary can be examined', await ev(() => !!window.__region.inter.list.find((x) => x.id === 'rosary').prompt()));
check('the refuge offers no rescue anymore', await ev(() => !window.__region.inter.list.find((x) => x.id === 'oswinCell').prompt()));
// persistence
await ev(() => window.__session.save());
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await ev(() => window.__session.continueGame());
await until(() => window.__game.mode === 'play');
check('after reload: Oswin still taken, cell still empty', await ev(() => window.__session.ws.npcs.oswin === 'taken' && !window.__region.npcs.has('oswin')));
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
