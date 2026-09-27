// Headless quest-flow + boss run for the Undervaults (dev server must be running).
// node tools/preview/treasury.flow.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5214/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || t.includes('unknown enemy') || t.includes('unknown journal')) && !t.includes('404')) errs.push(t); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, timeout = 60000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 250 }).catch(() => {}); };
const pressEnter = async () => {
  for (let i = 0; i < 80; i++) {
    const st = await ev(() => ({ mode: window.__game.mode, blocking: window.__game.deps.ui.blocking }));
    if (st.mode === 'play' && !st.blocking) return;
    await page.keyboard.press('Enter');
    await wait(250);
  }
};
const flags = () => ev(() => ({ ...window.__session.ws.flags, ione: window.__session.ws.npcs.ione }));
const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const doIt = async (id, dx = 0, dz = 0.9) => { const r = await ev(([id, dx, dz]) => window.__do(id, dx, dz), [id, dx, dz]); console.log('   ', r); return r; };

await page.goto(base + '?region=treasury&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 240000 });
await wait(2500);
await ev(() => {
  window.__do = (id, dx = 0, dz = 0.9) => {
    const r = window.__region, g = window.__game;
    const it = r.inter.list.find((x) => x.id === id);
    if (!it) return 'missing ' + id;
    g.player.move = null;
    g.player.teleport(new window.THREE.Vector3(it.pos.x + dx, it.pos.y, it.pos.z + dz), Math.atan2(-dx, -dz));
    const text = it.prompt();
    if (!text) return 'unavailable ' + id;
    r.busy = false;
    it.action();
    return 'ok ' + text;
  };
  window.__godmode = setInterval(() => { const p = window.__game.player; if (p && !p.dead) p.hp = p.hpMax; }, 100);
});

check('region is the Undervaults, at the market Stillbell', await ev(() => window.__region.id === 'treasury' && window.__session.ws.lastStillbell === 'treasury.market'));
const kinds = await ev(() => { const m = {}; for (const e of window.__game.enemies) m[e.def.kind] = (m[e.def.kind] ?? 0) + 1; return m; });
console.log('    enemies', JSON.stringify(kinds));
check('enemy kinds spawned (7 types + coffers + 2 bosses)', ['tr_militia', 'tr_militiaFork', 'tr_collector', 'tr_collectorHead', 'tr_sentry', 'tr_guardian', 'tr_mimic', 'tr_warden', 'tr_coffer', 'aurelmask', 'mimicSovereign'].every((k) => kinds[k] > 0));
check('four ward-coffers', kinds.tr_coffer === 4);

// ---------------------------------------------------------------- market
await doIt('inspect:tr_twin_stalls', -0.9, 0); await wait(600); await pressEnter();
let j = await journal();
check('twofold: remembered famine market + contradicting gilt stalls', j.includes('tr_mem_market') && j.includes('tr_obs_stalls'));
await doIt('pickup:tr_axe', 0.9, 0);
await until(() => !!window.__session.pd.inventory.woodsman_axe, 10000);
check('woodsman axe from the woodpile', await ev(() => !!window.__session.pd.inventory.woodsman_axe));
const h0 = await ev(() => window.__session.pd.hours);
await doIt('tr:chest:chestMarket', 0, 1.15);
await until(() => window.__session.ws.flags['treasury.chestMarket'] && window.__session.pd.hours > 0, 10000);
await wait(800);
check('market chest: Hours + bellbronze scrap', await ev((h) => window.__session.pd.hours > h && !!window.__session.pd.inventory.bellbronze_scrap, h0));
// mimic springs when "opened"
await doIt('tr:mimic:tr_m_mimic1', 0, 1.3);
await wait(400);
check('mimic springs when the chest is opened', await ev(() => { const e = window.__game.enemies.find((x) => x.spawnId === 'tr_m_mimic1'); return !!e && e.aware && (e.move?.def.id === 'tr_mim_rise' || e.move?.def.id === 'tr_mim_bite'); }));
// collector grab takes Hours; killing him returns them
const steal = await ev(() => {
  const r = window.__region, s = window.__session;
  const e = window.__game.enemies.find((x) => x.spawnId === 'tr_m_col1');
  s.pd.hours = 1000;
  r.levy(e, { target: window.__game.player, outcome: 'hit', move: { id: 'tr_col_grab' } });
  return { hours: s.pd.hours, debt: s.ws.flags['treasury.debt.tr_m_col1'] };
});
check('grab takes 30 % of Hours, held by the collector', steal.hours === 700 && steal.debt === 300, JSON.stringify(steal));
await ev(() => { const e = window.__game.enemies.find((x) => x.spawnId === 'tr_m_col1'); e.hp = 0; e.react('death', window.__game.player.pos); });
await until(() => !window.__session.ws.flags['treasury.debt.tr_m_col1'], 15000);
check('killing the collector returns the Hours', await ev(() => window.__session.pd.hours >= 1000 && !window.__session.ws.flags['treasury.debt.tr_m_col1']));

// ---------------------------------------------------------------- the Counting Deep: Ione
await ev(() => { const g = window.__game; g.player.teleport(new window.THREE.Vector3(-33, -7.8, -88), Math.PI); });
await until(() => Object.keys(window.__session.ws.journal).includes('tr_mem_ione'), 8000);
check('deep memory: Ione remembered', (await journal()).includes('tr_mem_ione'));
await doIt('inspect:tr_collectors_ledger', 0, 0); await wait(600); await pressEnter();
await doIt('tr:pit', 0, 0); await wait(600); await pressEnter();
j = await journal();
check('observed: the dry pit contradicts the memory, and the ledger names the key', j.includes('tr_obs_cage') && j.includes('tr_obs_debt'));
check('winch is padlocked without the key', (await doIt('tr:winch', 0, 0)).includes('padlocked') || !(await ev(() => window.__session.ws.flags['treasury.cageLowered'])));
await ev(() => { const e = window.__game.enemies.find((x) => x.def.kind === 'tr_collectorHead'); e.hp = 0; e.react('death', window.__game.player.pos); });
await until(() => !!window.__session.pd.inventory.tally_key, 15000);
check('Head Collector carried the Tally Key', await ev(() => !!window.__session.pd.inventory.tally_key));
await doIt('tr:winch', 0, 0);
await until(() => window.__game.mode === 'dialogue', 20000); await pressEnter();
await until(() => window.__session.ws.npcs.ione === 'rescued', 20000);
let f = await flags();
check('cage lowered, Ione rescued', f.ione === 'rescued' && !!f['treasury.cageLowered']);
check('confirmed change recorded', (await journal()).includes('tr_conf_ione'));

// ---------------------------------------------------------------- shortcuts
await doIt('tr:weighLever', 0, 0);
await until(() => { const c = window.__region.L.pieces.weighGate.collider; return window.__session.ws.flags['treasury.weighGate'] && (!c || !c.enabled); }, 40000);
check('weigh-gate opened (collider off)', await ev(() => { const c = window.__region.L.pieces.weighGate.collider; return window.__session.ws.flags['treasury.weighGate'] && (!c || !c.enabled); }));
await doIt('tr:scaleLever', 0, 0);
await until(() => { const c = window.__region.L.pieces.scaleBridge.collider; return window.__session.ws.flags['treasury.scaleBridge'] && (!c || c.enabled); }, 40000);
check('scale bridge lowered (collider on)', await ev(() => { const c = window.__region.L.pieces.scaleBridge.collider; return !c || c.enabled; }));
await doIt('tr:vaultWheel', 0, 0);
await until(() => { const c = window.__region.L.pieces.vaultDoor.collider; return window.__session.ws.flags['treasury.vaultDoor'] && (!c || !c.enabled); }, 40000);
check('round vault door rolled open (collider off)', await ev(() => { const c = window.__region.L.pieces.vaultDoor.collider; return !c || !c.enabled; }));

// ---------------------------------------------------------------- the revelation, the muster
await doIt('inspect:tr_ledger', 0, 0);
await wait(800); await pressEnter();
j = await journal();
check('revelation: the ledger contradicts the remembered single ringing', j.includes('mem_defeat') && j.includes('obs_ledger'));
await doIt('tr:muster', 0, 0); await wait(800); await pressEnter();
check('muster soldier met', !!(await flags())['treasury.musterMet']);
await doIt('tr:payroll', 0, 0); await wait(800); await pressEnter();
await until(() => !!window.__session.pd.inventory.greyford_payroll, 8000);
await doIt('tr:muster', 0, 0); await wait(800); await pressEnter();
await until(() => window.__session.ws.flags['muster.treasury'], 10000);
check('muster.treasury set (pay-roll delivered)', !!(await flags())['muster.treasury']);

// ---------------------------------------------------------------- the Mimic Sovereign
await ev(() => { window.__region.arenaWarning = () => ''; });
console.log('   ', await ev(() => window.__do('fog:mimicsovereign', 0, 0)));
await wait(500); await pressEnter();
await until(() => window.__region.bosses.get('mimicsovereign')?.engaged === true, 30000);
check('Hoard veil: the Sovereign engages', await ev(() => window.__region.bosses.get('mimicsovereign')?.engaged === true));
await ev(() => { const b = window.__region.bosses.get('mimicsovereign'); b.move = null; b.hp = b.threshold + 5; b.hp -= 50; b.react('light', window.__game.player.pos); });
await until(() => window.__region.bosses.get('mimicsovereign').phase === 2, 30000);
check('Sovereign phase 2', await ev(() => window.__region.bosses.get('mimicsovereign').phase === 2));
await ev(() => { const b = window.__region.bosses.get('mimicsovereign'); b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['boss.mimicsovereign'] && !!window.__session.pd.inventory.gilded_tooth, 60000);
await wait(2500);
check('Sovereign defeated: tooth granted, grate raised', await ev(() => !!window.__session.pd.inventory.gilded_tooth && !window.__region.L.pieces.hoardGrate.collider?.enabled));

// ---------------------------------------------------------------- Treasurer Aurel Mask
console.log('   ', await ev(() => window.__do('fog:aurelmask', 0, 0)));
await wait(500); await pressEnter();
await until(() => window.__region.bosses.get('aurelmask')?.engaged === true, 30000);
check('Vault veil: Aurel engages', await ev(() => window.__region.bosses.get('aurelmask')?.engaged === true));
const ward = await ev(() => { const b = window.__region.bosses.get('aurelmask'); return { coffers: b.coffers, warded: b.warded, dmg: b.defend({ physical: 1000, magic: 0, fire: 0 }), sentinels: window.__game.enemies.filter((e) => e.def.kind === 'tr_coinSentinel' && !e.dead).length }; });
check('warded: 4 coffers, damage cut hard, sentinels summoned', ward.coffers === 4 && ward.warded && ward.dmg < 120 && ward.sentinels >= 1, JSON.stringify(ward));
await ev(() => { const b = window.__region.bosses.get('aurelmask'); b.hp = b.hpMax * 0.2; });
await wait(400);
check('warded: health cannot fall below half', await ev(() => { const b = window.__region.bosses.get('aurelmask'); return b.hp >= b.hpMax * 0.5 && b.phase === 1; }));
for (let i = 0; i < 4; i++) {
  await ev((i) => { const c = window.__game.enemies.filter((e) => e.def.kind === 'tr_coffer' && !e.dead && e.hp > 0)[0]; if (c) { c.hp = 0; c.react('death', window.__game.player.pos); } }, i);
  await wait(1300);
}
await until(() => window.__region.bosses.get('aurelmask').phase === 2, 30000);
check('last coffer broken → phase 2 (mask cracked)', await ev(() => { const b = window.__region.bosses.get('aurelmask'); return b.phase === 2 && !b.warded; }));
await ev(() => { const b = window.__region.bosses.get('aurelmask'); b.move = null; b.hp = b.threshold + 5; b.hp -= 50; b.react('light', window.__game.player.pos); });
await until(() => window.__region.bosses.get('aurelmask').phase === 3, 30000);
check('phase 3 reached (cannot be skipped)', await ev(() => window.__region.bosses.get('aurelmask').phase === 3));
await ev(() => { const b = window.__region.bosses.get('aurelmask'); b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['boss.aurelmask'], 60000);
await wait(4500);
f = await flags();
check('Aurel defeated flag', !!f['boss.aurelmask']);
check('Final Memory of Aurel granted', await ev(() => !!window.__session.pd.inventory.memory_aurelmask));
j = await journal();
check('confirmed: wards, market', j.includes('tr_conf_aurel') && j.includes('tr_conf_market'));

// ---------------------------------------------------------------- persistence
await ev(() => window.__session.save());
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await wait(1500);
await ev(() => window.__session.continueGame());
await page.waitForFunction(() => window.__game.mode === 'play' && window.__region?.id === 'treasury', null, { timeout: 120000 });
await wait(2500);
f = await flags();
check('after reload: shortcuts, cage, bosses, muster persist', f['treasury.weighGate'] && f['treasury.vaultDoor'] && f['treasury.scaleBridge'] && f['treasury.cageLowered'] && f['boss.aurelmask'] && f['boss.mimicsovereign'] && f['muster.treasury'] && f.ione === 'rescued');
check('after reload: no boss or coffers respawned', await ev(() => window.__region.bosses.size === 0 && !window.__game.enemies.some((e) => e.def.kind === 'tr_coffer')));
check('after reload: gate open, bridge down, door rolled', await ev(() => { const P = window.__region.L.pieces; return !P.weighGate.collider.enabled && P.scaleBridge.collider.enabled && !P.vaultDoor.collider.enabled; }));
// ---------------------------------------------------------------- the loss path: crossing while Ione is caged
await page.goto(base + '?region=treasury&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play' && window.__region?.id === 'treasury', null, { timeout: 240000 });
await wait(2000);
await ev(() => {
  window.__region.arenaWarning = () => '';
  const it = window.__region.inter.list.find((x) => x.id === 'fog:aurelmask');
  window.__game.player.teleport(new window.THREE.Vector3(it.pos.x, it.pos.y, it.pos.z), Math.PI);
  it.action();
});
await until(() => window.__session.ws.npcs.ione === 'taken', 30000);
check('crossing into the Vault with Ione caged: she is written off (taken)', await ev(() => window.__session.ws.npcs.ione === 'taken' && Object.keys(window.__session.ws.journal).includes('tr_conf_ione_taken')));
check('the cage is empty (no Ione NPC)', await ev(() => !window.__region.npcs.has('ione')));
for (const e of errs.slice(0, 12)) console.log('ERR', e.slice(0, 300));
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
