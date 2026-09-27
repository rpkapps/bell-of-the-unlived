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
const until = async (fn, timeout = 120000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 200 }).catch(() => {}); };

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
    // keep the Returned alive through the scripted checks; count bombard hits on him
    window.__god = setInterval(() => { const p = window.__game.player; if (p && !p.dead) p.hp = p.hpMax; }, 40);
    window.__hits = 0;
    { const g = window.__game, orig = g.combat.onResult; g.combat.onResult = (r) => { if (r.target === g.player && r.move?.id === 'bombard_shot' && r.outcome !== 'dodged') window.__hits++; orig(r); }; }
    setInterval(() => { const g = window.__game; if (g.mode === 'dialogue') window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); }, 150);
    window.__simWait = (sec) => new Promise((res) => { const g = window.__game, t0 = g.time; const id = setInterval(() => { if (g.time - t0 >= sec) { clearInterval(id); res(); } }, 40); });
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
    await window.__simWait(5.2);
    const rose = !e.down && e.revived && !e.dead && e.hp > 0;
    e.hp = 1; e.react('death', p.pos);
    await window.__simWait(3.0);
    return { down1, rose, dead: e.dead };
  });
  check('twice-slain falls, rises once, then dies', ts.down1 && ts.rose && ts.dead, JSON.stringify(ts));
  // pike wall: face the player, step together; a broken guard dissolves it
  const pk = await ev(async () => {
    const g = window.__game, r = window.__region;
    const f = r.formations.find((x) => x.id.includes('bailey'));
    const p = g.player;
    p.teleport(new window.THREE.Vector3(6, 0, -34.5), Math.PI);
    await window.__simWait(2.5);
    const aware = f.members.every((m) => m.aware);
    const faced = f.members.every((m) => Math.abs(Math.atan2(Math.sin(m.yaw - f.yaw), Math.cos(m.yaw - f.yaw))) < 0.5);
    const intact = !f.broken;
    f.members[1].react('guardBreak', p.pos);
    await window.__simWait(0.3);
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
    const h0 = window.__hits;
    let sawShell = false;
    for (let i = 0; i < 80; i++) { await window.__simWait(0.1); if (r.shells.active > 0) sawShell = true; p.teleport(new window.THREE.Vector3(1, 0, 4), Math.PI); if (sawShell && r.shells.active === 0) break; }
    return { sawShell, hit: window.__hits > h0 };
  });
  check('bombard fires at the killing ground (marked shot lands)', bomb.sawShell && bomb.hit, JSON.stringify(bomb));
  await god();
  const cover = await ev(async () => {
    const g = window.__game, r = window.__region, p = g.player;
    r.battery.reset();
    // behind the mantlet at (3.5, -5): the gun has no sightline
    p.teleport(new window.THREE.Vector3(3.5, 0, -3.9), Math.PI);
    let shells = 0;
    for (let i = 0; i < 50; i++) { await window.__simWait(0.1); shells = Math.max(shells, r.shells.active); p.teleport(new window.THREE.Vector3(3.5, 0, -3.9), Math.PI); }
    return { shells };
  });
  check('cover denies the bombard its sightline', cover.shells === 0, JSON.stringify(cover));
  const silence = await ev(async () => {
    const g = window.__game, r = window.__region, p = g.player;
    for (const c of r.battery.crew) { c.hp = 0; c.dead = true; }
    r.battery.reset();
    p.teleport(new window.THREE.Vector3(1, 0, 4), Math.PI);
    let shells = 0;
    for (let i = 0; i < 50; i++) { await window.__simWait(0.1); shells = Math.max(shells, r.shells.active); }
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
  await wait(2500);
  await ev(() => { window.__session.leaveStillbell?.(); window.__game.deps.ui.closeAll(); window.__game.resumePlay(); });
  await settle();
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
  await until(() => window.__region.fight?.boss.spec.id === 'oderic' && window.__region.fight.boss.engaged, 120000);
  await god();
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
    for (let i = 0; i < 45; i++) { await window.__simWait(0.1); if (b.move?.def.id === 'od_stunned') stunned = true; if (stunned) break; }
    return { stunned, vulnerable: stunned, hp: b.hp, max: b.hpMax };
  });
  check('the Ram-Knight\'s charge into a pier staggers him', stag.stunned, JSON.stringify(stag));
  await god();
  await ev(() => { const b = window.__region.fight.boss; b.engaged = true; b.move = null; b.hp = b.threshold + 5; b.hp -= 50; b.react('light', window.__game.player.pos); });
  await until(() => window.__region.fight?.boss.phase === 2, 30000);
  check('Oderic phase 2 (helm broken)', await ev(() => window.__region.fight?.boss.phase === 2));
  await ev(() => { const b = window.__region.fight.boss; b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
  await until(() => window.__session.ws.flags['boss.oderic'], 30000);
  await ev(() => window.__simWait(6));
  check('Oderic defeated, the north gate opens, maul granted', !!(await flags())['boss.oderic'] && (await ev(() => !window.__region.L.pieces.odericGate.collider?.enabled)) && (await inv('ram_knight_maul')) === 1);
  // Varr: volley, phase, defeat, Great Bell silenced
  await ev(() => window.__peace());
  console.log(await act('fog:varr', 0, 1.2));
  await until(() => window.__region.fight?.boss.spec.id === 'varr' && window.__region.fight.boss.engaged, 120000);
  await god();
  check('entered the Bell Rampart', await ev(() => window.__region.fight?.boss.spec.id === 'varr'));
  const vol = await ev(async () => {
    const { MOVES } = await import('/src/combat/moves.ts');
    const r = window.__region, b = r.fight.boss;
    b.move = null; b.startMove(MOVES.varr_volley);
    let most = 0;
    for (let i = 0; i < 30; i++) { await window.__simWait(0.1); most = Math.max(most, r.shells.active); }
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
  await ev(() => window.__simWait(7));
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
  await wait(2500);
  await ev(() => { window.__session.leaveStillbell?.(); window.__game.deps.ui.closeAll(); window.__game.resumePlay(); });
  await ev(() => window.__peace());
  console.log(await act('fog:oderic', 0, 1.2));
  await until(() => window.__region.fight?.boss.spec.id === 'oderic', 30000);
  const f = await flags();
  check('crossing with Tallis locked in: the magazine goes up (persistent)', f.tallis === 'dead' && f['army.magazineBlown']);
  check('the loss is recorded', (await journal()).includes('conf_lost'));
  check('the magazine is a ruin', await ev(() => { const m = window.__region.L.pieces.magazine; return m.object.visible === false; }));
  await wait(8000);
}


// ------------------------------------------------------------------ screenshots (rendered)
async function shotsMode(list) {
  const out = process.env.ARMY_SHOTS ?? 'tools/out';
  await page.goto(base + '?region=army&quality=' + (process.env.ARMY_Q ?? 'low') + '&origin=householdKnight');
  await page.waitForFunction(() => window.__ready && window.__game.mode === 'play' && window.__region?.id === 'army', null, { timeout: 240000 });
  await wait(4000);
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } canvas { visibility: visible !important; }' });
  await ev(() => { window.__game.deps.ui.setHudVisible(false); window.__peace = () => { for (const e of window.__game.enemies) if (!e.isBoss) { e.aware = false; e.target = null; } }; });
  const views = {
    spawn: null,
    road: { cam: [-2, 3.2, 58], look: [0, 18, -120], player: [-1, 0, 50] },
    gate: { cam: [4, 2.4, 12], look: [0, 9, -30], player: [2, 0, 6] },
    bailey: { cam: [30, 7, -26], look: [-12, 2, -48], player: [28, 0, -30] },
    barbican: { cam: [14, 9, -63], look: [-4, 7, -86], player: [10, 6, -66] },
    passage: { cam: [0, 9.5, -89], look: [0, 7, -115], player: [0, 6, -92] },
    hall: { cam: [-16, 9, -134], look: [-30, 6.5, -158], player: [-17, 6, -140] },
    ward: { cam: [22, 12, -136], look: [-8, 11, -168], player: [18, 6, -140] },
    pikes: { cam: [7.5, 1.9, -35.2], look: [5.6, 1.1, -40], player: [6, 0, -29] },
    knight: { actor: 'siegeKnight', dist: 4.2, h: 1.5, side: 0.35, player: [8, 6, -70] },
    oderic: { actor: 'oderic', isBoss: true, dist: 5.2, h: 1.7, side: 0.3, player: [0, 6, -95] },
    varr: { actor: 'varr', isBoss: true, dist: 3.8, h: 1.5, side: 0.3, player: [0, 24, -214] },
    varr2: { actor: 'varr', isBoss: true, phase2: true, dist: 3.8, h: 1.5, side: -0.3, player: [0, 24, -214] },
    crew: { actor: 'cannonCrew', dist: 3.2, h: 1.3, side: 0.4, player: [2, 8, -21] },
    xbow: { actor: 'crossbowman', dist: 3.4, h: 1.3, side: 0.4, player: [0, 0, 20] },
    sapper: { actor: 'sapper', dist: 3.4, h: 1.3, side: 0.4, player: [0, 0, 20] },
    twice: { actor: 'twiceSlain', dist: 3.4, h: 1.3, side: 0.4, player: [0, 0, 20] },
    keep: { cam: [-12, 18, -176], look: [0, 50, -228], player: [-10, 14, -178] },
    rampart: { cam: [0, 29, -210], look: [0, 40, -232], player: [0, 24, -214] },
    bell: { cam: [0, 40, -205], look: [0, 78, -231], player: [0, 24, -214] },
    magazine: { cam: [28, 9, -64], look: [40, 7, -84], player: [30, 6, -66] },
  };
  for (const name of list) {
    const v = views[name];
    if (v === undefined) continue;
    await ev((vv) => {
      const g = window.__game, T = window.THREE;
      window.__peace();
      if (vv && vv.actor) {
        const pp = new T.Vector3(...vv.player);
        g.player.teleport(vv.isBoss ? pp : new T.Vector3(-8, 0, 52), Math.PI);
        const pool = g.enemies.filter((e) => !e.dead && (e.spec?.id === vv.actor || e.def?.kind === vv.actor));
        pool.sort((a, b) => a.pos.distanceToSquared(pp) - b.pos.distanceToSquared(pp));
        const e = pool[0];
        if (!e) { g.cameraOverride = null; return; }
        if (vv.phase2 && e.advancePhase && e.phase === 1) e.advancePhase();
        window.__shotActor = e;
        g.cameraOverride = (dt, cam) => {
          const f = e.forward, r = new T.Vector3(-f.z, 0, f.x);
          cam.position.copy(e.pos).addScaledVector(f, vv.dist).addScaledVector(r, vv.dist * vv.side).add(new T.Vector3(0, vv.h, 0));
          cam.lookAt(e.pos.x, e.pos.y + vv.h * 0.8, e.pos.z);
          return true;
        };
      } else if (vv) {
        g.player.teleport(new T.Vector3(...vv.player), Math.PI);
        g.cameraOverride = (dt, cam) => { cam.position.set(...vv.cam); cam.lookAt(...vv.look); return true; };
      } else g.cameraOverride = null;
    }, v);
    await wait(name === 'spawn' ? 9000 : 9000);
    await page.screenshot({ path: `${out}/army-${name}.png` });
    const st = await ev(() => { const r = window.__game.deps.renderer; return { ...r.stats(), area: window.__region.currentAreaName() }; });
    console.log('shot', name, JSON.stringify(st));
  }
}

if (which.startsWith('shots')) await shotsMode((process.argv[4] ?? 'spawn,road,gate,bailey,barbican,passage,hall,ward,keep,rampart,bell,magazine').split(','));
if (which === 'rescue' || which === 'all') { await boot(); await rescueBranch(); }
if (which === 'loss' || which === 'all') await lossBranch();
for (const e of errs.slice(0, 15)) console.log('ERR', e);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
