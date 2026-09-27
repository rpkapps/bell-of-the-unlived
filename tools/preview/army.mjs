// Siegeholm headless checks (logic, ?norender): quest flow (rescue + loss branches), shortcuts,
// region mechanics (twice-slain, pike wall, bombard, Ram-Knight wall stagger, Varr's volley),
// boss defeats and persistence across a reload.
//   node tools/preview/army.mjs [baseUrl] [rescue|loss|all]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5211/';
const which = process.argv[3] ?? 'all';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
page.setDefaultTimeout(300000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); if (m.type() === 'warning' && m.text().includes('unknown enemy')) errs.push('WARN ' + m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, timeout = 60000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 200 }).catch(() => {}); };

async function boot() {
  await page.goto(base + '?region=army&quality=low&norender&origin=householdKnight');
  await page.waitForFunction(() => window.__ready && window.__game.mode === 'play' && window.__region?.id === 'army', null, { timeout: 180000 });
  await wait(1500);
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
    window.__game.deps.ui.confirm = async () => true;
    setInterval(() => { const g = window.__game; if (g.mode === 'dialogue') window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); }, 150);
    window.__peace = () => { for (const e of window.__game.enemies) if (!e.isBoss) { e.aware = false; e.target = null; } };
  });
}
const settle = async () => {
  for (let i = 0; i < 100; i++) {
    const st = await ev(() => ({ mode: window.__game.mode, blocking: window.__game.deps.ui.blocking }));
    if (st.mode === 'play' && !st.blocking) return;
    await page.keyboard.press('Enter');
    await wait(200);
  }
};
const flags = () => ev(() => ({ ...window.__session.ws.flags, tallis: window.__session.ws.npcs.tallis }));
const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const inv = (id) => ev((i) => window.__session.pd.inventory[i]?.count ?? 0, id);
const act = async (id, dx = 0, dz = 0.9) => { const r = await ev(([a, b, c]) => window.__do(a, b, c), [id, dx, dz]); await wait(900); await settle(); await wait(400); return r; };
const god = () => ev(() => { const p = window.__game.player; p.hp = p.hpMax; });

async function commonChecks() {
  const info = await ev(() => {
    const r = window.__region, g = window.__game;
    const kinds = {};
    for (const e of g.enemies) kinds[e.def.kind] = (kinds[e.def.kind] ?? 0) + 1;
    return { id: r.id, bells: r.stillbells().map((b) => b.id), enemies: g.enemies.length, kinds, bosses: [...r.bosses.keys()], formations: r.formations.length, battery: !!r.battery, pieces: Object.keys(r.L.pieces), zone: r.currentAreaName() };
  });
  console.log('region', JSON.stringify(info));
  check('region army loaded with its three Stillbells', info.id === 'army' && info.bells.join() === 'army.road,army.barbican,army.keep');
  check('enemies spawned (with region classes)', info.enemies > 40 && info.kinds.pikeman === 9 && info.kinds.twiceSlain >= 8 && info.kinds.cannonCrew === 2, JSON.stringify(info.kinds));
  check('three pike walls formed, gate bombard armed', info.formations === 3 && info.battery);
  check('both bosses spawned', info.bosses.sort().join() === 'oderic,varr');
  check('starts on the Siege Road', info.zone === 'The Siege Road', info.zone);
}

async function mechanics() {
  // twice-slain: a plain kill makes it rise once; the second kill is final
  const ts = await ev(async () => {
    const g = window.__game;
    const e = g.enemies.find((x) => x.def.kind === 'twiceSlain' && !x.dead);
    const p = g.player;
    e.hp = 1; e.react('death', p.pos);
    const down1 = e.down && !e.dead;
    await new Promise((r) => setTimeout(r, 5200));
    const rose = !e.down && e.revived && !e.dead && e.hp > 0;
    e.hp = 1; e.react('death', p.pos);
    await new Promise((r) => setTimeout(r, 2600));
    return { down1, rose, dead: e.dead };
  });
  check('twice-slain falls, rises once, then dies', ts.down1 && ts.rose && ts.dead, JSON.stringify(ts));
  // pike wall: face the player, step together; a broken guard dissolves it
  const pk = await ev(async () => {
    const g = window.__game, r = window.__region;
    const f = r.formations.find((x) => x.id.includes('bailey'));
    const p = g.player;
    p.teleport(new window.THREE.Vector3(6, 0, -34.5), Math.PI);
    await new Promise((res) => setTimeout(res, 2500));
    const aware = f.members.every((m) => m.aware);
    const faced = f.members.every((m) => Math.abs(Math.atan2(Math.sin(m.yaw - f.yaw), Math.cos(m.yaw - f.yaw))) < 0.5);
    const intact = !f.broken;
    f.members[1].react('guardBreak', p.pos);
    await new Promise((res) => setTimeout(res, 300));
    return { aware, faced, intact, broken: f.broken };
  });
  check('pike wall alerts together, faces as one, breaks on a broken guard', pk.aware && pk.faced && pk.intact && pk.broken, JSON.stringify(pk));
  await ev(() => { window.__game.player.teleport(new window.THREE.Vector3(-11.8, 0, 46), Math.PI); window.__peace(); });
  await wait(500);
  // the gate bombard: a player on the killing ground in its sightline draws a marked shot
  const bomb = await ev(async () => {
    const g = window.__game, r = window.__region, p = g.player;
    r.resetEnemies();
    p.teleport(new window.THREE.Vector3(1, 0, 4), Math.PI);
    const hp0 = p.hp;
    let sawShell = false;
    for (let i = 0; i < 50; i++) { await new Promise((res) => setTimeout(res, 100)); if (r.shells.active > 0) sawShell = true; p.teleport(new window.THREE.Vector3(1, 0, 4), Math.PI); }
    return { sawShell, hit: p.hp < hp0 || p.dead };
  });
  check('bombard fires at the killing ground (marked shot lands)', bomb.sawShell && bomb.hit, JSON.stringify(bomb));
  await god();
  const cover = await ev(async () => {
    const g = window.__game, r = window.__region, p = g.player;
    r.battery.reset();
    // behind the mantlet at (3.5, -5): the gun has no sightline
    p.teleport(new window.THREE.Vector3(3.5, 0, -6.3), Math.PI);
    let shells = 0;
    for (let i = 0; i < 40; i++) { await new Promise((res) => setTimeout(res, 100)); shells = Math.max(shells, r.shells.active); p.teleport(new window.THREE.Vector3(3.5, 0, -6.3), Math.PI); }
    return { shells };
  });
  check('cover denies the bombard its sightline', cover.shells === 0, JSON.stringify(cover));
  const silence = await ev(async () => {
    const g = window.__game, r = window.__region, p = g.player;
    for (const c of r.battery.crew) { c.hp = 0; c.dead = true; }
    r.battery.reset();
    p.teleport(new window.THREE.Vector3(1, 0, 4), Math.PI);
    let shells = 0;
    for (let i = 0; i < 40; i++) { await new Promise((res) => setTimeout(res, 100)); shells = Math.max(shells, r.shells.active); }
    return { silenced: r.battery.silenced, shells };
  });
  check('killing the crew silences the bombard', silence.silenced && silence.shells === 0, JSON.stringify(silence));
  await ev(() => { window.__region.resetEnemies(); window.__game.player.teleport(new window.THREE.Vector3(-11.8, 0, 46), Math.PI); window.__peace(); });
  await god();
}

async function rescueBranch() {
  console.log('--- rescue branch');
  await commonChecks();
  console.log(await act('bell:army.road', 0, 1.2));
  await mechanics();
  // the two histories
  console.log(await act('inspect:army_victory_relief', 0, 0));
  console.log(await act('inspect:army_mass_grave', 0, 0));
  let j = await journal();
  check('remembered victory contradicted by the graves', j.includes('mem_victory') && j.includes('obs_graves'));
  // muster: meet the soldier, fetch the roll from the ossuary, bring it back
  console.log(await act('muster', 0, 1.2));
  console.log(await act('pickup:army.musterRoll', -1.2, 0));
  check('muster roll found in the ossuary', (await inv('greyford_muster_roll')) === 1);
  console.log(await act('muster', 0, 1.2));
  check('the Unlived Muster soldier is answered (muster.army)', !!(await flags())['muster.army']);
  // pickups
  for (const [id, item] of [['pickup:army.arbalest', 'garrison_arbalest'], ['pickup:army.towerNook', 'greyford_tower_shield'], ['pickup:army.pikeScroll', 'imprint_impaling_charge'], ['pickup:army.casemateArmour', 'gatewarden_helm'], ['pickup:army.laneShard', 'bellbronze_shard']]) {
    const r = await act(id, 0, 0.6);
    const n = item === 'bellbronze_shard' ? await ev(() => window.__session.pd.flask.total) : await inv(item);
    check(`${id} → ${item}`, n > 0, r);
  }
  check('arbalest cache includes bolts and the pinning-shot scroll', (await inv('iron_bolt')) >= 20 && (await inv('imprint_pinning_shot')) === 1);
  // shortcuts
  console.log(await act('open:postern', 0, -0.9));
  await wait(1500);
  check('postern opened (shortcut 1, persistent)', !!(await flags())['army.postern'] && (await ev(() => !window.__region.L.pieces.postern.collider?.enabled)));
  console.log(await act('winch', 0, -0.9));
  await wait(3200);
  check('eastern portcullis raised (shortcut 2, persistent)', !!(await flags())['army.eastGate'] && (await ev(() => !window.__region.L.pieces.eastGate.collider?.enabled)));
  // the magazine lead
  console.log(await act('inspect:army_orders', 0, 0));
  j = await journal();
  check('orders contradict the remembered betrayal', j.includes('mem_magazine') && j.includes('obs_order'));
  await ev(() => window.__peace());
  console.log(await act('magazine', 0, 0));
  console.log(await act('magazine', 0, 0));
  await until(() => window.__session.ws.npcs.tallis === 'rescued', 30000);
  await settle();
  const f = await flags();
  check('Tallis rescued (magazine opened)', f.tallis === 'rescued' && f['army.magazineOpen'], JSON.stringify({ t: f.tallis, o: f['army.magazineOpen'] }));
  check('rescue confirmed in the journal', (await journal()).includes('conf_rescued'));
  // Oderic: veil (no loss now), wall stagger, phase, defeat
  console.log(await act('fog:oderic', 0, 1.2));
  await until(() => window.__region.fight?.boss.spec.id === 'oderic' && window.__region.fight.boss.engaged, 30000);
  check('entered the Ram-Knight\'s passage', await ev(() => window.__region.fight?.boss.spec.id === 'oderic'));
  const stag = await ev(async () => {
    const { MOVES } = await import('/src/combat/moves.ts');
    const r = window.__region, g = window.__game, b = r.fight.boss, p = g.player;
    b.engaged = false;
    b.move = null;
    b.teleport(new window.THREE.Vector3(0, 6, -93), Math.PI);
    p.teleport(new window.THREE.Vector3(5.2, 6, -106.5), 0);
    b.target = p;
    b.startMove(MOVES.od_charge);
    let stunned = false;
    for (let i = 0; i < 40; i++) { await new Promise((res) => setTimeout(res, 100)); if (b.move?.def.id === 'od_stunned') stunned = true; }
    return { stunned, vulnerable: stunned, hp: b.hp, max: b.hpMax };
  });
  check('the Ram-Knight\'s charge into a pier staggers him', stag.stunned, JSON.stringify(stag));
  await god();
  await ev(() => { const b = window.__region.fight.boss; b.engaged = true; b.move = null; b.hp = b.threshold + 5; b.hp -= 50; b.react('light', window.__game.player.pos); });
  await until(() => window.__region.fight?.boss.phase === 2, 30000);
  check('Oderic phase 2 (helm broken)', await ev(() => window.__region.fight?.boss.phase === 2));
  await ev(() => { const b = window.__region.fight.boss; b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
  await until(() => window.__session.ws.flags['boss.oderic'], 30000);
  await wait(6000);
  check('Oderic defeated, the north gate opens, maul granted', !!(await flags())['boss.oderic'] && (await ev(() => !window.__region.L.pieces.odericGate.collider?.enabled)) && (await inv('ram_knight_maul')) === 1);
  // Varr: volley, phase, defeat, Great Bell silenced
  await ev(() => window.__peace());
  console.log(await act('fog:varr', 0, 1.2));
  await until(() => window.__region.fight?.boss.spec.id === 'varr' && window.__region.fight.boss.engaged, 30000);
  check('entered the Bell Rampart', await ev(() => window.__region.fight?.boss.spec.id === 'varr'));
  const vol = await ev(async () => {
    const { MOVES } = await import('/src/combat/moves.ts');
    const r = window.__region, b = r.fight.boss;
    b.move = null; b.startMove(MOVES.varr_volley);
    let most = 0;
    for (let i = 0; i < 30; i++) { await new Promise((res) => setTimeout(res, 100)); most = Math.max(most, r.shells.active); }
    return { most };
  });
  check('Varr\'s volley marks three blasts in phase 1', vol.most === 3, JSON.stringify(vol));
  await god();
  await ev(() => { const b = window.__region.fight.boss; b.move = null; b.hp = b.threshold + 5; b.hp -= 50; b.react('light', window.__game.player.pos); });
  await until(() => window.__region.fight?.boss.phase === 2, 30000);
  check('Varr phase 2 "The Defeat" (look changed)', await ev(() => window.__region.fight?.boss.phase === 2));
  await god();
  await ev(() => { const b = window.__region.fight.boss; b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
  await until(() => window.__session.ws.flags['boss.varr'], 30000);
  await wait(7000);
  const bell = await ev(() => { const r = window.__region; return { std: !!r.L.pieces.varrStandard, flag: window.__session.ws.flags['boss.varr'] }; });
  check('Marshal Varr defeated (boss.varr), Final Memory granted', bell.flag && (await inv('memory_varr')) === 1);
  check('the siege resolved in the journal', (await journal()).includes('conf_bell'));
  // persistence
  await ev(() => window.__session.save());
  await page.goto(base + '?quality=low&norender');
  await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  await wait(1200);
  await ev(() => window.__session.continueGame());
  await page.waitForFunction(() => window.__game.mode === 'play' && window.__region?.id === 'army', null, { timeout: 90000 });
  await wait(2000);
  const pf = await flags();
  check('after reload: shortcuts, rescue, muster, bosses persist', pf['army.postern'] && pf['army.eastGate'] && pf.tallis === 'rescued' && pf['muster.army'] && pf['boss.oderic'] && pf['boss.varr']);
  check('after reload: bosses not respawned; pieces restored', await ev(() => { const r = window.__region; return r.bosses.size === 0 && !r.L.pieces.postern.collider?.enabled && !r.L.pieces.eastGate.collider?.enabled && !r.L.pieces.odericGate.collider?.enabled; }));
}

async function lossBranch() {
  console.log('--- loss branch');
  await boot();
  console.log(await act('bell:army.road', 0, 1.2));
  await ev(() => window.__peace());
  console.log(await act('fog:oderic', 0, 1.2));
  await until(() => window.__region.fight?.boss.spec.id === 'oderic', 30000);
  const f = await flags();
  check('crossing with Tallis locked in: the magazine goes up (persistent)', f.tallis === 'dead' && f['army.magazineBlown']);
  check('the loss is recorded', (await journal()).includes('conf_lost'));
  check('the magazine is a ruin', await ev(() => { const m = window.__region.L.pieces.magazine; return m.object.visible === false; }));
  await wait(8000);
}

if (which === 'rescue' || which === 'all') { await boot(); await rescueBranch(); }
if (which === 'loss' || which === 'all') await lossBranch();
for (const e of errs.slice(0, 15)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
