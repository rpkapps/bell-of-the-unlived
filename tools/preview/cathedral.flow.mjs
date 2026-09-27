// Headless quest-flow + boss run for the Pilgrim Stair (the Cathedral), in the real game (?norender).
//   node tools/preview/cathedral.flow.mjs [baseUrl] [branch]      branch = returned (default) | taken
// Drives interactables directly (teleport + action), answers dialogues/confirms, forces boss HP to
// thresholds, and checks journal entries, flags, NPC fates, the region mechanics and persistence.
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5191/';
const branch = process.argv[3] ?? 'returned';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, timeout = 60000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 250 }).catch(() => {}); };

await page.goto(base + '?region=cathedral&origin=householdKnight&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play' && window.__region?.id === 'cathedral', null, { timeout: 300000 });
await wait(2000);
await ev(() => {
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
  window.__tp = (x, y, z) => { const g = window.__game; g.player.move = null; g.player.teleport(new window.THREE.Vector3(x, y, z), Math.PI); };
  // pacify everything except what a test wakes explicitly (keeps the logic run about logic)
  window.__calm = () => { for (const e of window.__game.enemies) if (!e.isBoss) { e.aware = false; e.target = null; e.ai = 'idle'; } };
  window.__killAll = () => { for (const e of window.__game.enemies) if (!e.isBoss && !e.dead) { e.hp = 0; e.dead = true; e.object.visible = false; } };
});
const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const flags = () => ev(() => ({ ...window.__session.ws.flags, wenna: window.__session.ws.npcs.wenna }));
const answer = async () => {
  for (let i = 0; i < 90; i++) {
    const st = await ev(() => ({ mode: window.__game.mode, blocking: window.__game.deps.ui.blocking }));
    if (st.mode === 'play' && !st.blocking) return;
    const clicked = await ev(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(Cross|Yes)$/i.test(x.textContent.trim()) && x.offsetParent); if (b) { b.click(); return true; } return false; });
    if (!clicked) await page.keyboard.press('Enter');
    await wait(250);
  }
};
const hp = () => ev(() => { const p = window.__game.player; return { hp: p.hp, max: p.hpMax, move: p.move?.def.id ?? null }; });

// ---------------------------------------------------------------- arrival
check('arrived at the Pilgrims\' Gate Stillbell', await ev(() => window.__session.ws.lastStillbell === 'cathedral.gate' && window.__region.stillbells().length === 3));
await ev(() => window.__killAll());
await ev(() => window.__tp(0, 0, 50));
await until(() => Object.keys(window.__session.ws.journal).includes('mem_saint'), 20000);
check('arrival: the Great Bell is remembered (mem_saint)', (await journal()).includes('mem_saint'));
console.log(await ev(() => window.__do('inspect:cath_roll', 0, 0.8)));
await wait(600); await answer();
check('the Pilgrim Roll: names chiselled and recut (obs_plaques)', (await journal()).includes('obs_plaques'));

// ---------------------------------------------------------------- the procession: the same woman twice; the hazard
console.log(await ev(() => window.__do('inspect:twice', 0, 0.6)));
await wait(600); await answer();
check('the same pilgrim walks twice (obs_twice, contradicts mem_saint)', (await journal()).includes('obs_twice'));
{
  const before = await hp();
  await ev(() => { const pr = window.__region.L.processions[0]; const p = window.__game.player; p.move = null; p.hp = p.hpMax; const f = new window.THREE.Vector3(Math.sin(pr.heading), 0, Math.cos(pr.heading)); p.teleport(pr.pos.clone().addScaledVector(f, 1.0), 0); });
  await until(() => window.__game.player.move?.def.id === 'cath_knockdown', 10000);
  const after = await hp();
  check('a procession knocks the Returned down and hurts him', after.move === 'cath_knockdown' || after.hp < before.max, JSON.stringify(after));
  await wait(2000);
}

// ---------------------------------------------------------------- the hymn: remembered, observed, the tablet
await ev(() => window.__tp(0, 0, 18));
await until(() => Object.keys(window.__session.ws.journal).includes('mem_hymn'), 20000);
check('the Stair\'s foot: the hymn is remembered (mem_hymn)', (await journal()).includes('mem_hymn'));
console.log(await ev(() => window.__do('npc:wenna', 0.4, 0)));
await wait(800); await answer();
check('Wenna is nameless (obs_nameless, contradicts mem_hymn)', (await journal()).includes('obs_nameless'));
if (branch === 'returned') {
  console.log(await ev(() => window.__do('pickup:cath.tablet', 0, 0)));
  await until(() => !!window.__session.pd.inventory.name_tablet_wenna, 10000);
  check('the name-tablet is found in the ossuary (obs_tablet)', (await journal()).includes('obs_tablet') && await ev(() => !!window.__session.pd.inventory.name_tablet_wenna));
  console.log(await ev(() => window.__do('npc:wenna', 0.4, 0)));
  await wait(800); await answer();
  await until(() => window.__session.ws.npcs.wenna === 'rescued', 15000);
  check('her name returned: Wenna goes to the Hospice (rescued, conf_returned)', (await flags()).wenna === 'rescued' && (await journal()).includes('conf_returned'));
  check('Wenna registered as a Hospice guest', await ev(async () => (await import('/src/game/regions/hub.ts')).HOSPICE_GUESTS.some((g) => g.id === 'wenna' && g.present(window.__session.ws))));
}

// ---------------------------------------------------------------- the Unlived Muster
console.log(await ev(() => window.__do('npc:soames', 0.9, 0)));
await wait(800); await answer();
check('Soames asks for the Greyford roll (obs_soames)', (await journal()).includes('obs_soames'));
console.log(await ev(() => window.__do('pickup:cath.roll', 0, 0)));
await wait(900); await answer();
console.log(await ev(() => window.__do('npc:soames', 0.9, 0)));
await wait(800); await answer();
await until(() => !!window.__session.ws.flags['muster.cathedral'], 15000);
check('the Muster: Soames hears his squad\'s names (muster.cathedral)', !!(await flags())['muster.cathedral']);

// ---------------------------------------------------------------- shortcuts
console.log(await ev(() => window.__do('open:grate', 0, -0.8)));
await until(() => window.__session.ws.flags['cathedral.grate'], 10000);
check('shortcut 1: the ossuary grate raised (persistent)', !!(await flags())['cathedral.grate']);

// ---------------------------------------------------------------- mechanics: a healer's rite, a giant's grab
{
  const r = await ev(async () => {
    const g = window.__game, T = window.THREE;
    const p = g.player; p.move = null; p.teleport(new T.Vector3(0, 0, 44), Math.PI);
    const h = g.spawnEnemy('cath_healer', new T.Vector3(0, 0, 36), 0, { id: 't_healer' });
    const a = g.spawnEnemy('cath_pilgrim', new T.Vector3(1.5, 0, 36.5), 0, { id: 't_pil' });
    window.__region.decorate?.(h); window.__region.decorate?.(a);
    a.hp = a.hpMax * 0.3; h.becomeAware(p);
    window.__t = { h, a };
    return a.hp;
  });
  await until(() => window.__t.a.hp > window.__t.a.hpMax * 0.55 || window.__t.h.dead, 30000);
  const healed = await ev(() => ({ hp: window.__t.a.hp, max: window.__t.a.hpMax }));
  check('a healer-priest\'s rite restores an ally (health)', healed.hp > healed.max * 0.55, JSON.stringify({ before: r, ...healed }));
  await ev(() => { for (const e of [window.__t.h, window.__t.a]) { e.hp = 0; e.dead = true; e.object.visible = false; } });
}
{
  await ev(() => {
    const g = window.__game, T = window.THREE;
    const p = g.player; p.move = null; p.hp = p.hpMax; p.teleport(new T.Vector3(0, 0, 44), Math.PI);
    const m = g.spawnEnemy('cath_mourner', new T.Vector3(0, 0, 42.4), 0, { id: 't_giant' });
    window.__region.decorate?.(m);
    m.becomeAware(p); m.aware = true; m.target = p;
    window.__giant = m;
  });
  await ev(async () => { const { MOVES } = await import('/src/combat/moves.ts'); window.__giant.startMove(MOVES.cath_mg_grab); });
  await until(() => window.__game.player.move?.def.id === 'cath_held', 8000);
  const held = await hp();
  check('a mourner giant\'s grab holds the Returned (hand-icon move → held)', held.move === 'cath_held', JSON.stringify(held));
  await until(() => window.__game.player.move?.def.id === 'cath_knockdown', 8000);
  const thrown = await hp();
  check('… crushes and throws him down', thrown.move === 'cath_knockdown' && thrown.hp < thrown.max, JSON.stringify(thrown));
  await ev(() => { const m = window.__giant; m.hp = 0; m.dead = true; m.object.visible = false; });
  await wait(2000);
}

// ---------------------------------------------------------------- the Procession
await ev(() => { const p = window.__game.player; p.hp = p.hpMax; });
console.log(await ev(() => window.__do('fog:procession', 0, 1.6)));
await wait(500); await answer();
await until(() => window.__region.bosses.get('procession')?.engaged === true, 30000);
check('the Procession: veil crossed, boss engaged', await ev(() => window.__region.bosses.get('procession')?.engaged === true));
check('… two bearers and a cantor walk with it', await ev(() => window.__region.S.adds.length === 3 && !!window.__region.S.cantor));
{
  // the cantor's hymn heals the bearer: wound it and make the cantor sing
  await ev(async () => { const { MOVES } = await import('/src/combat/moves.ts'); const b = window.__region.bosses.get('procession'); b.hp = b.hpMax * 0.7; window.__region.S.cantor.startMove(MOVES.cath_ctr_hymn); window.__pulseFrom = b.hp; });
  await until(() => window.__region.bosses.get('procession').hp > window.__pulseFrom + 10, 15000);
  check('… the reliquary pulses while the cantor sings (heals the bearer)', await ev(() => window.__region.bosses.get('procession').hp > window.__pulseFrom + 10));
  await ev(() => { const c = window.__region.S.cantor; c.hp = 0; c.react('death', c.pos); });
  await wait(1500);
  const b = 'procession';
  await ev((id) => { const x = window.__region.bosses.get(id); x.hp = x.threshold + 5; }, b);
  await ev((id) => { const x = window.__region.bosses.get(id); const p = window.__game.player; x.hp -= 50; x.react('light', p.pos); }, b);
  await until(() => window.__region.bosses.get('procession').phase === 2, 30000);
  check('… phase 2: the reliquary opens (cannot be skipped)', await ev(() => window.__region.bosses.get('procession').phase === 2));
  await wait(3000);
  await ev((id) => { const x = window.__region.bosses.get(id); x.move = null; x.hp = 0; x.react('death', window.__game.player.pos); }, b);
  await until(() => window.__session.ws.flags['boss.procession'], 60000);
  await wait(4000);
  check('the Procession defeated (flag), the cloister door opens', !!(await flags())['boss.procession'] && await ev(() => { const c = window.__region.L.pieces.cloisterDoor.collider; return !c || !c.enabled; }));
  check('… the hand bell is given', await ev(() => !!window.__session.pd.inventory.hand_bell));
}

// ---------------------------------------------------------------- the nave: shortcut 2
console.log(await ev(() => window.__do('open:doors', 0, -0.9)));
await until(() => window.__session.ws.flags['cathedral.greatDoors'], 10000);
check('shortcut 2: the great doors unbarred (persistent)', !!(await flags())['cathedral.greatDoors']);
console.log(await ev(() => window.__do('bell:cathedral.nave', -0.6, 0)));
await wait(2500); await ev(() => { window.__session.leaveStillbell?.(); window.__session.resume?.(); });
await wait(800);
await ev(() => window.__killAll());
check('the nave Stillbell kindled', await ev(() => !!window.__session.ws.stillbells['cathedral.nave']));

// ---------------------------------------------------------------- Saint Vessaline
await ev(() => { const p = window.__game.player; p.hp = p.hpMax; });
console.log(await ev(() => window.__do('fog:vessaline', 0, 1.6)));
await wait(500); await answer();
await until(() => window.__region.bosses.get('vessaline')?.engaged === true, 30000);
check('Saint Vessaline: veil crossed, boss engaged, conviction recorded', await ev(() => window.__region.bosses.get('vessaline')?.engaged === true) && (await journal()).includes('obs_conviction'));
if (branch === 'taken') {
  const f = await flags();
  check('entering while Wenna is nameless: she is absorbed (taken, conf_absorbed)', f.wenna === 'taken' && (await journal()).includes('conf_absorbed'));
  check('… and the Saint sings with her voice (hymn style available)', await ev(() => window.__region.bosses.get('vessaline').hymn === true));
}
{
  // a borrowed style: force the next veil change
  await ev(() => { const v = window.__region.bosses.get('vessaline'); v.styleT = 0; v.move = null; });
  await until(() => window.__region.bosses.get('vessaline').style !== 'own', 20000);
  const st = await ev(() => { const v = window.__region.bosses.get('vessaline'); const veils = v.rig.bones.head.children.filter((c) => c.name.startsWith('vess:veil:') && c.visible).map((c) => c.name); return { style: v.style, veils, attacks: v.def.attacks.map((a) => a.move) }; });
  check('… she borrows a style: new moveset + the matching veil', st.style !== 'own' && st.veils.length === 1 && st.veils[0].endsWith(st.style), JSON.stringify(st));
  await ev(() => { const x = window.__region.bosses.get('vessaline'); x.hp = x.threshold + 5; });
  await ev(() => { const x = window.__region.bosses.get('vessaline'); const p = window.__game.player; x.hp -= 50; x.react('light', p.pos); });
  await until(() => window.__region.bosses.get('vessaline').phase === 2, 30000);
  check('… phase 2 (cannot be skipped)', await ev(() => window.__region.bosses.get('vessaline').phase === 2));
  await wait(4000);
  await ev(() => { const v = window.__region.bosses.get('vessaline'); v.styleT = 0; v.move = null; });
  await until(() => ['flagellant', 'measure', 'mourner', 'pilgrim', 'hymn'].includes(window.__region.bosses.get('vessaline').style), 20000);
  check('… phase 2 styles (flagellant / Measure / …)', await ev(() => window.__region.bosses.get('vessaline').style !== 'own'));
  await ev(() => { const x = window.__region.bosses.get('vessaline'); x.move = null; x.hp = 0; x.react('death', window.__game.player.pos); });
  await until(() => window.__session.ws.flags['boss.vessaline'], 60000);
  await wait(5000);
  const f = await flags();
  check('Saint Vessaline defeated (boss.vessaline), Final Memory granted', !!f['boss.vessaline'] && await ev(() => !!window.__session.pd.inventory.memory_vessaline));
  check('… conf_vessaline recorded; processions stop', (await journal()).includes('conf_vessaline') && await ev(() => window.__region.L.processions.every((p) => !p.running)));
}

// ---------------------------------------------------------------- persistence
await ev(() => window.__session.save());
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
await wait(1500);
await ev(() => window.__session.continueGame());
await page.waitForFunction(() => window.__game.mode === 'play' && window.__region?.id === 'cathedral', null, { timeout: 300000 });
await wait(2500);
const f2 = await flags();
check('after reload: shortcuts, bosses, muster persist', f2['cathedral.grate'] && f2['cathedral.greatDoors'] && f2['boss.procession'] && f2['boss.vessaline'] && f2['muster.cathedral']);
check('after reload: bosses not respawned; grate and doors open', await ev(() => !window.__region.bosses.get('vessaline') && !window.__region.bosses.get('procession') && !window.__region.L.pieces.grate.collider?.enabled && !window.__region.L.pieces.greatDoors.collider?.enabled));
check(`after reload: Wenna is ${branch === 'taken' ? 'gone (taken)' : 'at the Hospice (rescued)'}`, f2.wenna === (branch === 'taken' ? 'taken' : 'rescued'));
for (const e of errs.slice(0, 10)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
