// Garden Court quest-flow + boss run in a real browser (no rendering):
//   node tools/preview/household.flow.mjs [port]
// Drives the region controller through the page lead, shortcuts, the muster, the Twin Heirs, the
// signet door, Dame Celwyn (her habit reading, three phases, the anchor) and a reload.
import { chromium } from 'playwright-core';
const port = process.argv[2] ?? '5215';
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); if (m.type() === 'warning' && m.text().includes('unknown enemy')) errs.push(m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, timeout = 60000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 200 }).catch(() => {}); };
const pressEnter = async (n = 60) => {
  for (let i = 0; i < n; i++) {
    const st = await ev(() => ({ mode: window.__game.mode, blocking: window.__game.deps.ui.blocking }));
    if (st.mode === 'play' && !st.blocking) return;
    await page.keyboard.press('Enter');
    await wait(250);
  }
};

await page.goto(base + '?region=household&origin=householdKnight&quality=low&norender');
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'household', null, { timeout: 300000 });
await wait(3000);
await pressEnter();
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
  window.__tp = (x, y, z, yaw = 0) => { const g = window.__game; g.player.move = null; g.player.teleport(new window.THREE.Vector3(x, y, z), yaw); };
  window.__kill = (id) => { const e = window.__game.enemies.find((x) => x.spawnId === id); if (!e) return false; e.move = null; e.hp = 0; e.react('death', window.__game.player.pos); return true; };
  // keep the Returned alive through the scripted fights
  setInterval(() => { const p = window.__game.player; if (p && !p.dead) p.hp = p.hpMax; }, 100);
});
const flags = () => ev(() => ({ ...window.__session.ws.flags, wynn: window.__session.ws.npcs.wynn }));
const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const inv = (id) => ev((i) => window.__session.pd.inventory[i]?.count ?? 0, id);

const info = await ev(() => ({ region: window.__region.id, bells: window.__region.stillbells().map((b) => b.id), enemies: window.__game.enemies.length, kinds: [...new Set(window.__game.enemies.map((e) => e.def.kind))] }));
check('region loaded with its three Stillbells', info.region === 'household' && info.bells.join() === 'household.gate,household.orangery,household.throne', JSON.stringify(info.bells));
check('enemies spawned (all six kinds incl. hounds)', ['hhRetainer', 'hhDuellist', 'hhGardener', 'hhCourtier', 'hhGhost', 'huntingHound'].every((k) => info.kinds.includes(k)), `${info.enemies} ${info.kinds.join(',')}`);
check('behaviours applied', await ev(() => window.__game.enemies.filter((e) => e.def.kind === 'hhRetainer').every((e) => Object.getPrototypeOf(e).constructor.name.includes('Retainer'))));

// ------------------------------------------------ the elite retainer reads a light string
const read = await ev(async () => {
  const g = window.__game, T = window.THREE;
  const r = g.enemies.find((e) => e.spawnId === 'hh_hall_retainer1');
  const p = g.player;
  r.move = null; r.aware = false;
  r.teleport(new T.Vector3(-3.6, 2.4, -21), 0);
  p.teleport(new T.Vector3(-3.6, 2.4, -19.4), Math.PI);
  r.becomeAware(p);
  const M = (await import('/src/combat/moves.ts')).MOVES;
  const seen = [];
  r.def = { ...r.def, aggression: 0 };
  const simWait = async (s) => { const t0 = g.time; while (g.time - t0 < s) { await new Promise((res) => setTimeout(res, 15)); seen.push(r.move?.def.id ?? '-'); } };
  await simWait(0.5);
  for (const id of ['sword_light1', 'sword_light2', 'sword_light3']) { p.move = null; p.startMove(M[id]); await simWait(0.5); }
  await simWait(1.2);
  return seen;
});
check('retainer raises the parry stance on a predictable light string', read.includes('ret_stance'), read.filter((x, i) => x !== read[i - 1]).join('>'));

// ------------------------------------------------ the postern page
console.log(await ev(() => window.__do('postern', 0.9, 0)));
await wait(600); await pressEnter();
let j = await journal();
check('remembered: the page and the postern', j.includes('mem_postern'));
await ev(() => window.__tp(-45.5, 0, 25, -Math.PI / 2));
await wait(1200); await pressEnter();
j = await journal();
check('observed: he is being coerced (contradicts the memory)', j.includes('obs_coerced'));
console.log(await ev(() => window.__do('page', 1.2, 0)));
await wait(800); await pressEnter();
check('the page will not leave while the courtier stands', (await flags()).wynn === 'imprisoned');
check('courtier killed', await ev(() => window.__kill('hh_coercer')));
await until(() => window.__game.enemies.find((e) => e.spawnId === 'hh_coercer')?.dead, 60000);
console.log(await ev(() => window.__do('page', 1.2, 0)));
await wait(800); await pressEnter();
await until(() => window.__session.ws.npcs.wynn === 'rescued', 20000);
let f = await flags();
check('Wynn Harrow freed → Hospice guest', f.wynn === 'rescued');
check('confirmed change recorded', (await journal()).includes('conf_freed'));
check('postern barred', await ev(() => window.__region.L.pieces.posternBar.object.children[0].visible));

// ------------------------------------------------ shortcuts
console.log(await ev(() => window.__do('open:winch', 0, -1.2)));
await until(() => window.__session.ws.flags['household.portcullis'] && !window.__region.L.pieces.portcullis.collider.enabled, 20000);
check('portcullis raised by the winch (persistent)', !!(await flags())['household.portcullis'] && await ev(() => !window.__region.L.pieces.portcullis.collider.enabled));
console.log(await ev(() => window.__do('open:kitchen', -1.0, 0)));
await until(() => window.__session.ws.flags['household.kitchenDoor'], 20000);
check('kitchen door unbolted (persistent)', !!(await flags())['household.kitchenDoor']);

// ------------------------------------------------ the Unlived Muster
console.log(await ev(() => window.__do('muster', 0.4, 1.2)));
await wait(800); await pressEnter();
console.log(await ev(() => window.__do('pickup:hhColour', 0.3, 0.6)));
await until(() => (window.__session.pd.inventory.hh_greyford_colour?.count ?? 0) > 0, 15000);
console.log(await ev(() => window.__do('muster', 0.4, 1.2)));
await wait(800); await pressEnter();
await until(() => window.__session.ws.flags['muster.household'], 15000);
check('muster.household set (colour returned)', !!(await flags())['muster.household']);
check('Greyford Flourish imprint given', (await inv('imprint_greyford_flourish')) > 0);

// ------------------------------------------------ loot sample
for (const k of ['pickup:hhGazebo', 'pickup:hhOathSet', 'pickup:hhShard', 'pickup:hhNiche']) { console.log(await ev((id) => window.__do(id, 0, 0.8), k)); await wait(1300); }
check('Vow Parry imprint, Oath set, shard, dirk taken', (await inv('imprint_vow_parry')) > 0 && (await inv('oath_coat')) > 0 && (await inv('parrying_dirk')) > 0);

// ------------------------------------------------ the Twin Heirs
console.log(await ev(() => window.__do('fog:heirs', 0, 1.6)));
await until(() => window.__region.fight?.arena.bossId === 'heirs' && window.__game.enemies.some((e) => e.spawnId === 'heirs_blood' && e.engaged), 30000);
check('both heirs engaged in one fight', await ev(() => window.__region.fight?.arena.bossId === 'heirs' && window.__game.enemies.filter((e) => e.spawnId?.startsWith('heirs') && e.engaged).length === 2));
const hud = await ev(() => { const h = {}; window.__region.hud(h); return h.boss; });
check('one combined boss bar', hud?.name === 'The Twin Heirs', JSON.stringify(hud));
await ev(() => window.__kill('heirs_blood'));
await until(() => window.__game.enemies.find((e) => e.spawnId === 'heirs')?.phase === 2, 20000);
check('the survivor grieves and enrages', await ev(() => { const e = window.__game.enemies.find((x) => x.spawnId === 'heirs'); return e.enraged && e.phase === 2; }));
await ev(() => window.__kill('heirs'));
await until(() => window.__session.ws.flags['boss.heirs'] && (window.__session.pd.inventory.hh_signet?.count ?? 0) > 0, 30000);
check('heirs defeated → signet', !!(await flags())['boss.heirs'] && (await inv('hh_signet')) > 0);
await until(() => !window.__region.L.pieces.heirsGate.collider.enabled, 10000);
check('north gate of the court opened (loop)', await ev(() => !window.__region.L.pieces.heirsGate.collider.enabled));

// ------------------------------------------------ the signet door
console.log(await ev(() => window.__do('open:signet', -1.2, 0)));
await until(() => window.__session.ws.flags['household.signetDoor'], 15000);
check('signet door opened', !!(await flags())['household.signetDoor']);

// ------------------------------------------------ Dame Celwyn
console.log(await ev(() => window.__do('fog:celwyn', -1.0, 0)));
await wait(2500);
await pressEnter(80);
await until(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn')?.engaged === true, 30000);
check('the meeting (choice) and the fight', await ev(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn')?.engaged === true));
j = await journal();
check('her question answered in the journal', j.some((k) => k.startsWith('obs_answer_')), j.filter((k) => k.startsWith('obs_answer')).join());
const celRead = await ev(async () => {
  const g = window.__game, T = window.THREE;
  const b = g.enemies.find((e) => e.spawnId === 'celwyn'); const p = g.player;
  const M = (await import('/src/combat/moves.ts')).MOVES;
  const out = [];
  const aggr = b.def.aggression;
  b.def = { ...b.def, aggression: 0 };
  const simWait = async (s) => { const t0 = g.time; while (g.time - t0 < s) { await new Promise((res) => setTimeout(res, 15)); out.push(b.move?.def.id ?? '-'); } };
  b.move = null;
  b.teleport(new T.Vector3(39, 14.4, -76), Math.PI); p.teleport(new T.Vector3(39, 14.4, -77.8), 0);
  for (let k = 0; k < 3; k++) { p.move = null; p.startMove(M.sword_light1); await simWait(1.6); }
  b.def = { ...b.def, aggression: aggr };
  return out;
});
check('Celwyn reads a repeated attack (stance)', celRead.includes('cel_stance'), celRead.filter((x, i) => x !== celRead[i - 1]).join('>'));
check('habit reading recorded', (await journal()).includes('obs_reads'));
await ev(() => { const b = window.__game.enemies.find((e) => e.spawnId === 'celwyn'); b.move = null; b.hp = b.threshold + 5; b.hp -= 60; b.react('light', window.__game.player.pos); });
await until(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn')?.phase === 2, 30000);
check('phase 2 (The Lesson)', await ev(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn').phase === 2));
await wait(3000);
await ev(() => { const b = window.__game.enemies.find((e) => e.spawnId === 'celwyn'); b.move = null; b.hp = b.threshold + 5; b.hp -= 60; b.react('light', window.__game.player.pos); });
await until(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn')?.phase === 3, 30000);
check('phase 3 (The Last Choice)', await ev(() => window.__game.enemies.find((e) => e.spawnId === 'celwyn').phase === 3));
await wait(3500);
await ev(() => window.__kill('celwyn'));
await until(() => window.__session.ws.flags['boss.celwyn'], 30000);
f = await flags();
check('Dame Celwyn defeated', !!f['boss.celwyn']);
check('Final Memory granted', (await inv('memory_celwyn')) > 0);
await wait(4500);
check('the Great Bell\'s anchor shattered', await ev(() => window.__region.L.arenas.find((a) => a.bossId === 'celwyn').onDefeat[0].state >= 0.99));
check('conf_celwyn recorded', (await journal()).includes('conf_celwyn'));

// ------------------------------------------------ persistence
await ev(() => window.__session.save());
await page.goto(base + '?quality=low&norender');
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await wait(1500);
await ev(() => window.__session.continueGame());
await page.waitForFunction(() => window.__game.mode === 'play' && window.__region?.id === 'household', null, { timeout: 120000 });
await wait(2500);
f = await flags();
check('after reload: page, shortcuts, muster and bosses persist', f.wynn === 'rescued' && f['household.portcullis'] && f['household.kitchenDoor'] && f['muster.household'] && f['boss.heirs'] && f['boss.celwyn']);
check('after reload: no bosses, no courtier', await ev(() => !window.__game.enemies.some((e) => ['heirs', 'heirs_blood', 'celwyn', 'hh_coercer'].includes(e.spawnId))));
check('after reload: portcullis still up, anchor still broken', await ev(() => !window.__region.L.pieces.portcullis.collider.enabled && window.__region.L.arenas.find((a) => a.bossId === 'celwyn').onDefeat[0].state >= 0.99));

for (const e of errs.slice(0, 12)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
