// Academy quest-flow + boss run (headless, ?norender): node tools/preview/academy.flow.mjs [baseUrl]
// Rescue branch (notes, winch, cage, Fenn & the register, shortcuts, lift, No. 9, Keeper Orrow with
// the lens floor and three phases), persistence after reload, then the "taken" branch.
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5212/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };

async function open(ctx, url) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(400000);
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(e.message + ' ' + (e.stack ?? '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) page.errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'academy', null, { timeout: 400000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__do = (id, dx = 0, dz = 0.9) => {
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
    // keep the Unlived still so they don't interfere with the logic run
    for (const e of window.__game.enemies) if (!e.isBoss) { e.think = () => e.wish.set(0, 0, 0); e.object.visible = false; }
    window.__game.player.hpMax = 1e6; window.__game.player.hp = 1e6;
  });
  return page;
}
const helpers = (page) => {
  const ev = (f, a) => page.evaluate(f, a);
  const until = (fn, t = 60000, a) => page.waitForFunction(fn, a, { timeout: t, polling: 250 }).catch(() => {});
  const enter = async () => { for (let i = 0; i < 80; i++) { const s = await ev(() => ({ m: window.__game.mode, b: window.__game.deps.ui.blocking })); if (s.m === 'play' && !s.b) return; await page.keyboard.press('Enter'); await page.waitForTimeout(250); } };
  const doit = async (id, dx, dz) => { const r = await ev(([i, x, z]) => window.__do(i, x, z), [id, dx ?? 0, dz ?? 0.9]); console.log('   ', id, '→', r); return r; };
  const flags = () => ev(() => ({ ...window.__session.ws.flags, wick: window.__session.ws.npcs.wick }));
  const journal = () => ev(() => Object.keys(window.__session.ws.journal));
  return { ev, until, enter, doit, flags, journal };
};

// ====================================================================== rescue branch
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
let page = await open(ctx, base + '?region=academy&origin=courtMage&quality=low&norender');
let { ev, until, enter, doit, flags, journal } = helpers(page);

check('starts at the Sea Causeway with 3 Stillbells listed', await ev(() => window.__region.stillbells().length === 3 && window.__session.ws.lastStillbell === 'academy.causeway'));
await until(() => Object.keys(window.__session.ws.journal).includes('mem_orrow'), 20000);
check('arrival memory (the Keeper) recorded', (await journal()).includes('mem_orrow'));
check('26+ Unlived of 6 kinds spawned', await ev(() => { const k = new Set(window.__game.enemies.filter((e) => !e.isBoss).map((e) => e.def.kind)); return window.__game.enemies.length >= 26 && k.size === 6; }));
check('Academy enemies are registered (no infantry fallbacks)', await ev(() => !window.__game.enemies.some((e) => e.spawnId.includes(':fallback'))));

// pickups
const flask0 = await ev(() => window.__session.pd.flask.total);
await doit('pickup:academy.shard'); await until(() => window.__session.ws.pickups['academy.shard'], 10000);
check('Bellbronze Shard on the tidal rocks → +1 flask', await ev((f0) => window.__session.pd.flask.total === f0 + 1, flask0));
for (const k of ['pinning', 'courtHood', 'courtGloves', 'scrapTunnel', 'knives', 'sealStaff', 'wardScroll', 'scrapLabB', 'scrapYard', 'scrapSpire']) { await doit('pickup:academy.' + k); await page.waitForTimeout(700); }
await until(() => !!window.__session.pd.inventory.mint_seal_staff, 10000);
check('loot: seal staff, imprint scrolls, court pieces, scrap', await ev(() => { const i = window.__session.pd.inventory; return !!(i.mint_seal_staff && i.imprint_pinning_shot && i.imprint_bellglass_ward && i.court_hood && i.court_gloves && i.bellbronze_scrap && i.tempered_scrap); }));

// shortcut 1: the Sea Gate (from inside)
check('the Sea Gate is closed from the landing (examine only)', (await doit('seaGate:outside', 0, 0)).startsWith('ok'));
await enter();
check('the Sea Gate collider blocks while closed', await ev(() => window.__region.L.pieces.seaGate.collider.enabled));
await doit('open:seaGate', 0, 0);
await until(() => window.__session.ws.flags['academy.seaGate'] && !window.__region.L.pieces.seaGate.collider.enabled, 20000);
check('Sea Gate opened (flag + collider off)', await ev(() => window.__session.ws.flags['academy.seaGate'] && !window.__region.L.pieces.seaGate.collider.enabled));

// the lift
await ev(() => { const g = window.__game; g.player.teleport(new window.THREE.Vector3(0, 2.05, 13), Math.PI); });
await page.waitForTimeout(300);
check('lift at the bottom offers a ride', (await doit('lift:ride', 0, 0)).startsWith('ok'));
await until(() => window.__session.ws.flags['academy.liftUp'] === true, 30000);
check('rode the lift to the terrace (player carried up)', await ev(() => window.__session.ws.flags['academy.liftUp'] && window.__game.player.pos.y > 17.5), JSON.stringify(await ev(() => window.__game.player.pos.y)));

// the Expelled Scholar
await doit('inspect:academy_wick_notes_a', 0, 0); await page.waitForTimeout(800); await enter();
let j = await journal();
check('notes (1st state): remembered + observed', j.includes('mem_wick') && j.includes('obs_notes_bell'));
await doit('inspect:academy_wick_notes_b', 0, 0); await page.waitForTimeout(800); await enter();
check('notes (2nd state) contradict the memory', await ev(() => { const l = window.__session.journal().find((x) => x.id === 'academy_scholar'); return l && l.entries.some((e) => e.id === 'mem_wick' && !!e.contradictedBy); }));
check('Wick is caged in lab B', await ev(() => window.__session.ws.npcs.wick === 'imprisoned' && window.__region.npcs.has('wick')));
await doit('winch', 0, 0);
await until(() => window.__game.mode === 'dialogue', 30000); await enter();
await until(() => window.__session.ws.flags['academy.cageDocked'], 20000);
check('winched the cage in (flag)', !!(await flags())['academy.cageDocked']);
await doit('cage', 0, 0);
await until(() => window.__game.mode === 'dialogue', 20000); await enter();
await until(() => window.__session.ws.npcs.wick === 'rescued', 20000);
check('Ansel Wick rescued', (await flags()).wick === 'rescued');
check('confirmed change: the drafting board shows the storm-bell', await ev(() => window.__session.ws.flags['academy.wickBoard'] && window.__region.L.pieces.wickBoard.object.children[0].children[1].visible));
check('journal: scholar lead resolved', await ev(() => window.__session.journal().find((x) => x.id === 'academy_scholar')?.status === 'resolved'));

// the Unlived Muster
await doit('fenn', 0, 1.2); await until(() => window.__game.mode === 'dialogue', 20000); await enter();
check('met Corporal Fenn', !!(await flags())['academy.fennMet']);
await doit('inspect:academy_register', 0, 0); await page.waitForTimeout(600); await enter(); await page.waitForTimeout(600); await enter();
await until(() => !!window.__session.pd.inventory.register_leaf, 10000);
check('cut Fenn\'s leaf from the register', await ev(() => !!window.__session.pd.inventory.register_leaf));
await doit('fenn', 0, 1.2); await until(() => window.__game.mode === 'dialogue', 20000); await enter();
check('muster.academy set', !!(await flags())['muster.academy']);

// shortcut 2: the drawbridge
await doit('open:drawbridge', 0, 0);
await until(() => window.__session.ws.flags['academy.drawbridge'], 20000);
check('drawbridge lowered (flag)', !!(await flags())['academy.drawbridge']);

// ---- Aberrant Experiment No. 9
await doit('fog:experiment9', 0, 0);
await until(() => window.__region.bosses.get('experiment9')?.engaged === true, 30000);
check('No. 9: veil crossed, boss engaged', await ev(() => window.__region.bosses.get('experiment9').engaged));
await ev(() => { const b = window.__region.bosses.get('experiment9'); b.hp = b.threshold + 5; b.hp -= 40; b.react('light', window.__game.player.pos); });
await until(() => window.__region.bosses.get('experiment9').phase === 2, 30000);
check('No. 9 phase 2', await ev(() => window.__region.bosses.get('experiment9').phase === 2));
await ev(() => { const b = window.__region.bosses.get('experiment9'); b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['boss.experiment9'] && !!window.__session.pd.inventory.grimoire_falling_hour, 40000);
check('No. 9 defeated → Falling Hour grimoire', await ev(() => window.__session.ws.flags['boss.experiment9'] && window.__session.pd.knownSpells.includes('falling_hour')));

// ---- Keeper Orrow
await ev(() => window.__region.resetEnemies());
await doit('fog:orrow', 0, 0);
await until(() => window.__region.bosses.get('orrow')?.engaged === true, 30000);
check('Orrow: no warning once the scholar is safe; boss engaged', await ev(() => window.__region.bosses.get('orrow').engaged && window.__game.mode === 'play'));
// the lens floor: wait for a pattern
await until(() => window.__region.floor.states.some((s) => s.s === 1), 30000);
const pat = await ev(() => { const st = window.__region.floor.states; return { warn: st.filter((s) => s.s === 1).length, safe: st.filter((s) => s.s === 0).length, warnDur: Math.min(...st.filter((s) => s.s === 1).map((s) => s.warn)), glyph: window.__region.L.lensFloor.plates.filter((p) => p.glyph.visible).length }; });
check('lens floor: plates warn with a glyph ≥ 1.5 s, safe plates remain', pat.warn > 0 && pat.safe >= 6 && pat.warnDur >= 1.5 && pat.glyph === pat.warn, JSON.stringify(pat));
await until(() => window.__region.floor.states.some((s) => s.s === 2), 10000);
check('lens floor: warned plates burn', await ev(() => window.__region.floor.states.some((s) => s.s === 2)));
check('journal: observed the lens floor', (await journal()).includes('obs_lens_floor'));
// burn damage when standing on a burning plate (i-frames aside)
const burn = await ev(async () => {
  const r = window.__region, f = r.L.lensFloor, g = window.__game;
  const i = r.floor.states.findIndex((s) => s.s === 2);
  if (i < 0) return 'no burning plate';
  g.player.teleport(f.plates[i].centre.clone(), 0);
  const hp0 = g.player.hp;
  await new Promise((res) => setTimeout(res, 900));
  return hp0 - g.player.hp;
});
check('standing on a burning plate hurts', typeof burn === 'number' && burn > 0, String(burn));
// phases
await ev(() => { const b = window.__region.bosses.get('orrow'); b.hp = b.threshold + 5; b.hp -= 40; b.react('light', window.__game.player.pos); });
await until(() => window.__region.bosses.get('orrow').phase === 2, 30000);
check('Orrow phase 2: glass blade drawn, blade moveset', await ev(() => { const b = window.__region.bosses.get('orrow'); return b.phase === 2 && b.weaponR.id === 'orrow_glass_blade' && b.def.attacks.some((a) => a.move === 'orrow_lunge') && !b.def.attacks.some((a) => a.move === 'orrow_strike'); }));
await ev(() => { const b = window.__region.bosses.get('orrow'); b.move = null; b.hp = b.threshold + 5; b.hp -= 40; b.react('light', window.__game.player.pos); });
await until(() => window.__region.bosses.get('orrow').phase === 3, 30000);
check('Orrow phase 3: the Preserved Hour (Falling Hour in her moveset)', await ev(() => { const b = window.__region.bosses.get('orrow'); return b.phase === 3 && b.def.attacks.some((a) => a.move === 'orrow_hour'); }));
await ev(() => { const b = window.__region.bosses.get('orrow'); b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['boss.orrow'], 40000);
await until(() => !window.__region.L.arenas.find((a) => a.bossId === 'orrow').onDefeat[0].object.children[0].visible, 40000);
const f2 = await flags();
check('Keeper Orrow defeated (flag)', !!f2['boss.orrow']);
check('Final Memory of Keeper Orrow granted', await ev(() => !!window.__session.pd.inventory.memory_orrow));
check('memory rewards: lance, staff, hours', await ev(() => window.__session.pendingMemories().find((m) => m.id === 'memory_orrow')?.rewards.length === 3));
check('the Great Bell\'s anchor shattered', await ev(() => !window.__region.L.arenas.find((a) => a.bossId === 'orrow').onDefeat[0].object.children[0].visible));
check('journal: the Keeper lead resolved', (await journal()).includes('conf_orrow'));
check('lens floor reset after the fight', await ev(() => window.__region.floor.states.every((s) => s.s === 0)));
check('Hospice guest registered for Wick', await ev(async () => { const hub = await import('/src/game/regions/hub.ts'); const g = hub.HOSPICE_GUESTS.find((x) => x.id === 'wick'); return !!g && g.present(window.__session.ws); }));

// ---- persistence
await ev(() => window.__session.save());
for (const e of page.errs.slice(0, 8)) console.log('ERR', e.slice(0, 300));
await page.close();
page = await ctx.newPage();
page.setDefaultTimeout(400000);
page.errs = [];
page.on('pageerror', (e) => page.errs.push(e.message));
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 400000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__session.continueGame());
await page.waitForFunction(() => window.__game.mode === 'play' && window.__region?.id === 'academy', null, { timeout: 400000 });
await page.waitForTimeout(2000);
({ ev, until, enter, doit, flags, journal } = helpers(page));
const f3 = await flags();
check('after reload: gate, drawbridge, lift, scholar, muster, bosses persist', f3['academy.seaGate'] && f3['academy.drawbridge'] && f3['academy.liftUp'] && f3.wick === 'rescued' && f3['muster.academy'] && f3['boss.orrow'] && f3['boss.experiment9'], JSON.stringify({ g: f3['academy.seaGate'], d: f3['academy.drawbridge'], l: f3['academy.liftUp'], w: f3.wick }));
check('after reload: pieces applied, bosses not respawned', await ev(() => !window.__region.L.pieces.seaGate.collider.enabled && window.__region.bosses.size === 0 && !window.__region.npcs.has('wick')));
for (const e of page.errs.slice(0, 8)) console.log('ERR', e.slice(0, 300));
await ctx.close();

// ====================================================================== the taken branch
const ctx2 = await browser.newContext({ viewport: { width: 960, height: 540 } });
page = await open(ctx2, base + '?region=academy&origin=householdKnight&quality=low&norender');
({ ev, until, enter, doit, flags, journal } = helpers(page));
await doit('fog:orrow', 0, 0);
await until(() => !!document.querySelector('button[data-key="no"]'), 20000);
check('plain-language warning while the scholar is caged', await ev(() => document.body.innerText.includes('scholar')));
await ev(() => document.querySelector('button[data-key="no"]').click());
await until(() => window.__game.mode === 'play', 10000);
check('declining keeps Wick caged', (await flags()).wick === 'imprisoned');
await doit('fog:orrow', 0, 0);
await until(() => !!document.querySelector('button[data-key="yes"]'), 20000);
await ev(() => document.querySelector('button[data-key="yes"]').click());
await until(() => window.__session.ws.npcs.wick === 'taken', 20000);
check('crossing the veil: Wick is taken (persistent loss)', (await flags()).wick === 'taken');
check('journal: the loss is recorded, lead lost', await ev(() => { const l = window.__session.journal().find((x) => x.id === 'academy_scholar'); return l && l.status === 'lost' && l.entries.some((e) => e.loss); }));
check('the cage hangs empty and open (examine)', await ev(() => !window.__region.npcs.has('wick') && !!window.__region.inter.list.find((x) => x.id === 'cage').prompt()));
for (const e of page.errs.slice(0, 8)) console.log('ERR', e.slice(0, 300));
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
