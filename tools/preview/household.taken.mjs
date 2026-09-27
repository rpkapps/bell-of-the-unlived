// Garden Court: the "taken" branch of the Postern Page, plus enemy mechanics (ghost phasing,
// gardener grab, duellist feint, courtier bolt).   node tools/preview/household.taken.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] ?? '5215';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const until = async (fn, timeout = 60000) => { await page.waitForFunction(fn, null, { timeout, polling: 200 }).catch(() => {}); };

await page.goto(`http://127.0.0.1:${port}/?region=household&origin=courtMage&quality=low&norender`);
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'household', null, { timeout: 300000 });
await page.waitForTimeout(2500);
await ev(() => {
  setInterval(() => { const p = window.__game.player; if (p && !p.dead) p.hp = p.hpMax; }, 100);
  window.__simWait = async (s) => { const g = window.__game, t0 = g.time; while (g.time - t0 < s) await new Promise((r) => setTimeout(r, 20)); };
});

// ---- the veil warning; crossing takes the page
await ev(() => {
  const r = window.__region, g = window.__game;
  const it = r.inter.list.find((x) => x.id === 'fog:heirs');
  g.player.teleport(new window.THREE.Vector3(it.pos.x, it.pos.y, it.pos.z + 1.2), Math.PI);
  it.action();
});
await until(() => !!document.querySelector('[data-key=yes]'), 20000);
check('plain-language warning before the heirs\' veil', await ev(() => !!document.querySelector('.m-body')?.textContent.includes('page')), await ev(() => document.querySelector('.m-body')?.textContent ?? ''));
await ev(() => document.querySelector('[data-key=yes]').click());
await until(() => window.__session.ws.npcs.wynn === 'taken', 20000);
const st = await ev(() => ({ wynn: window.__session.ws.npcs.wynn, j: Object.keys(window.__session.ws.journal), door: window.__region.L.pieces.posternDoor.collider.enabled, coercer: window.__game.enemies.some((e) => e.spawnId === 'hh_coercer'), npc: window.__region.npcs.has('wynn') }));
check('the page is taken (persistent loss)', st.wynn === 'taken' && st.j.includes('conf_taken') && !st.npc, JSON.stringify(st));
check('the postern stands open, the courtier gone', !st.door && !st.coercer);
check('his cap can be found in the lane', await ev(() => !!window.__region.inter.list.find((x) => x.id === 'pageCap')?.prompt()));
await until(() => window.__region.fight?.arena.bossId === 'heirs', 20000);
await ev(() => { for (const e of window.__game.enemies) if (e.spawnId?.startsWith('heirs')) { e.engaged = false; e.move = null; } window.__region.onPlayerDeath(); });

// ---- ghost phasing between its two claims
const ghost = await ev(async () => {
  const g = window.__game, T = window.THREE;
  const e = g.enemies.find((x) => x.spawnId === 'hh_gallery_ghost');
  g.player.teleport(new T.Vector3(-25, 8.4, -22), 0);
  e.def = { ...e.def, attacks: [], walk: 0, run: 0 };
  e.becomeAware(g.player);
  const start = e.pos.clone();
  const seen = new Set();
  for (let i = 0; i < 80 && !seen.has('ghost_appear'); i++) { await window.__simWait(0.25); if (e.move) seen.add(e.move.def.id); }
  await window.__simWait(0.3);
  return { moved: e.pos.distanceTo(start), seen: [...seen] };
});
check('succession ghost phases to its other claim', ghost.moved > 3 && ghost.seen.includes('ghost_fade'), JSON.stringify(ghost));

// ---- the courtier's bolt flies
const bolt = await ev(async () => {
  const g = window.__game, T = window.THREE;
  const M = (await import('/src/combat/moves.ts')).MOVES;
  const e = g.enemies.find((x) => x.spawnId === 'hh_terrace_courtier');
  const p = g.player;
  e.move = null; e.teleport(new T.Vector3(18, 2.4, -10), 0);
  p.move = null; p.teleport(new T.Vector3(18, 2.4, -2), Math.PI);
  e.becomeAware(p); e.target = p;
  e.startMove(M.court_bolt);
  let n = 0;
  for (let i = 0; i < 20; i++) { await window.__simWait(0.1); n = Math.max(n, g.projectiles.list.length); }
  return n;
});
check('masked courtier casts a gilt bolt', bolt > 0, String(bolt));

// ---- gardener grab holds and cuts
const grab = await ev(async () => {
  const g = window.__game, T = window.THREE;
  const M = (await import('/src/combat/moves.ts')).MOVES;
  const e = g.enemies.find((x) => x.spawnId === 'hh_yard_gardener');
  const p = g.player;
  p.hpMax = p.hp = 1e6;
  e.move = null; e.teleport(new T.Vector3(-20, 0, 60), 0);
  p.move = null; p.teleport(new T.Vector3(-20, 0, 61.4), Math.PI);
  e.becomeAware(p); e.target = p;
  e.startMove(M.gard_grab);
  const seen = new Set();
  for (let i = 0; i < 40; i++) { await window.__simWait(0.1); if (p.move) seen.add(p.move.def.id); if (e.move) seen.add('g:' + e.move.def.id); }
  return [...seen];
});
check('gardener grab: the victim is held and cut', grab.includes('hh_held') && grab.includes('g:gard_cut'), grab.join(','));

for (const e of errs.slice(0, 10)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
