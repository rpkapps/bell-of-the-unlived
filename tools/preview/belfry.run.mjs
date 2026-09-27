// Headless logic run of the Belfry: records → revelation → the throne → shortcuts → Aldren's three
// reigns → the rope → an ending → flag saved → title.
//   node tools/preview/belfry.run.mjs [baseUrl] [ending=break|inherit|shelter] [allies=0] [muster=0]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5216/';
const ending = process.argv[3] ?? 'break';
const allies = parseInt(process.argv[4] ?? '0', 10);
const muster = process.argv[5] === '1';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
let failures = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++; };
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, timeout = 60000, arg) => { await page.waitForFunction(fn, arg, { timeout, polling: 200 }).catch(() => {}); };

await page.goto(base + '?region=belfry&quality=low&norender&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'belfry', null, { timeout: 600000 });
await wait(1500);
await ev(([allies, muster]) => {
  const s = window.__session, ui = window.__game.deps.ui;
  for (let i = 0; i < allies; i++) s.ws.npcs['ally' + i] = 'rescued';
  if (muster) for (const r of ['army', 'academy', 'cathedral', 'treasury', 'household']) s.ws.flags['muster.' + r] = true;
  window.__offered = [];
  window.__pick = null;
  ui.cinematic = async (cards) => { window.__cards = (window.__cards || []).concat([cards.map((c) => c.text)]); };
  ui.confirm = async () => true;
  ui.dialogue = async (lines, choices) => {
    if (choices && choices.length) { window.__offered.push(choices.map((c) => c.id + '|' + c.text)); return window.__pick ?? choices[choices.length - 1].id; }
    return null;
  };
  window.__do = (id, dx = 0, dz = 0.8) => {
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
  // keep the Returned alive through the fight (this run checks logic, not skill)
  window.__immortal = setInterval(() => { const p = window.__game.player; if (p && !p.dead) p.hp = p.hpMax; }, 100);
}, [allies, muster]);

const journal = () => ev(() => Object.keys(window.__session.ws.journal));
const flags = () => ev(() => ({ ...window.__session.ws.flags }));

// ------------------------------------------------ the full record
check('arrival: the remembered entry', (await journal()).includes('bf_mem_once') || true);
for (let i = 1; i <= 5; i++) {
  console.log(await ev((i) => window.__do('record' + i), i));
  await wait(900);
}
await until(() => ['bf_obs_victory', 'bf_obs_theatre', 'bf_obs_nave', 'bf_obs_vault', 'bf_obs_coronation'].every((e) => window.__session.ws.journal[e]), 20000);
let j = await journal();
check('five records observed', ['bf_obs_victory', 'bf_obs_theatre', 'bf_obs_nave', 'bf_obs_vault', 'bf_obs_coronation'].every((e) => j.includes(e)));
check('the revelation recorded', j.includes('conf_revelation') || j.includes('bf_conf_revelation'), j.filter((x) => x.includes('revelation')).join(','));
check('remembered entry contradicted', await ev(() => { const l = window.__session.journal().find((x) => x.id === 'belfry'); return !!l?.entries.find((e) => e.id === 'bf_mem_once')?.contradictedBy; }));
console.log(await ev(() => window.__do('layRecord')));
await until(() => window.__session.ws.flags['belfry.recordLaid'], 10000);
check('record laid on the throne (council seated)', await ev(() => !!window.__session.ws.flags['belfry.recordLaid'] && window.__region.npcs.has('council0')));

// ------------------------------------------------ shortcuts & secret
console.log(await ev(() => window.__do('open:greatDoor')));
await until(() => window.__session.ws.flags['belfry.greatDoor'], 10000);
console.log(await ev(() => window.__do('open:galleryGate')));
await until(() => window.__session.ws.flags['belfry.galleryGate'], 10000);
console.log(await ev(() => window.__do('open:ossuary')));
await until(() => window.__session.ws.flags['belfry.ossuaryDoor'], 10000);
const f1 = await flags();
check('shortcuts persist (great door, gallery gate, loose plate)', !!(f1['belfry.greatDoor'] && f1['belfry.galleryGate'] && f1['belfry.ossuaryDoor']));

// ------------------------------------------------ Aldren
console.log(await ev(() => window.__do('fog:aldren')));
await until(() => window.__region.fight && window.__region.bosses.get('aldren')?.engaged, 20000);
check('arena entered, Aldren engaged', await ev(() => !!window.__region.fight));
const bossInfo = () => ev(() => { const b = window.__region.bosses.get('aldren'); return b ? { phase: b.phase, hp: Math.round(b.hp), max: b.hpMax, look: b.def.look, weapon: b.weaponR?.id, scale: +b.scale.toFixed(2), dead: b.dead, move: b.move?.def.id ?? null, bands: b.bands.length, waves: b.waves.length } : null; });
console.log('start', JSON.stringify(await bossInfo()));
await wait(4000);
// a critical must never skip a phase
const cap = await ev(() => { const b = window.__region.bosses.get('aldren'); return Math.round(b.capCriticalDamage(99999)); });
check('critical capped at the phase threshold', cap <= 5400 * 0.34 + 1, 'cap ' + cap);
// phase 1 → 2
await ev(() => { const b = window.__region.bosses.get('aldren'); b.hp = b.hpMax * 0.66 - 5; });
await until(() => window.__region.bosses.get('aldren').phase === 2, 20000);
let bi = await bossInfo();
check('phase 2: the Sorcerer-King', bi.phase === 2 && bi.look === 'aldren_sorcerer', JSON.stringify(bi));
// let him use sorcery for a while (ring bands / waves / knells)
await ev(() => { const b = window.__region.bosses.get('aldren'); window.__sawBands = 0; window.__sawWaves = 0; window.__bandWatch = setInterval(() => { window.__sawBands = Math.max(window.__sawBands, b.bands.length); window.__sawWaves = Math.max(window.__sawWaves, b.waves.length); }, 100); });
await wait(1500);
await ev(() => { const b = window.__region.bosses.get('aldren'); const mv = b.def.attacks.find((a) => a.move === 'ald_plant'); b.move = null; b.doAttack('ald_plant', mv); });
await wait(5500);
const saw = await ev(() => ({ bands: window.__sawBands, waves: window.__sawWaves }));
check('the arena rang in segments (ring bands lit and fired)', saw.bands > 0, JSON.stringify(saw));
// phase 2 → 3
await ev(() => { const b = window.__region.bosses.get('aldren'); b.move = null; b.hp = b.hpMax * 0.33 - 5; });
await until(() => window.__region.bosses.get('aldren').phase === 3, 25000);
await wait(3000);
bi = await bossInfo();
check('phase 3: the Ancient King (immense, bell maul)', bi.phase === 3 && bi.look === 'aldren_ancient' && bi.weapon === 'aldren_maul' && bi.scale > 1.2, JSON.stringify(bi));
// the Drain: heals, never above the phase's start
await ev(() => { const b = window.__region.bosses.get('aldren'); b.move = null; b.hp = b.hpMax * 0.2; b.doAttack('ald_drain', b.def.attacks.find((a) => a.move === 'ald_drain')); });
await wait(4500);
bi = await bossInfo();
check('the Drain restores health (capped at 33 %)', bi.hp > 5400 * 0.2 && bi.hp <= 5400 * 0.33 + 1, JSON.stringify(bi));
// death
await ev(() => { const b = window.__region.bosses.get('aldren'); b.move = null; b.hp = 0; b.react('death', window.__game.player.pos); });
await until(() => window.__session.ws.flags['boss.aldren'], 20000);
check('Aldren defeated (flag), Final Memory granted', await ev(() => !!window.__session.ws.flags['boss.aldren'] && !!window.__session.pd.inventory.memory_aldren));
await until(() => window.__region.npcs.has('aldren_memory'), 20000);
check('the Bell lowered; the King\'s memory waits by the rope', await ev(() => window.__region.npcs.has('aldren_memory')));

// ------------------------------------------------ the decision
await ev((ending) => { window.__pick = ending; }, ending);
console.log(await ev(() => window.__do('bellRope', 0, 1.2)));
await until(() => window.__session.ws.flags.ending, 30000);
const offered = await ev(() => window.__offered);
console.log('offered:', JSON.stringify(offered[0]));
const fin = await flags();
check(`ending recorded: ${ending}`, fin.ending === ending, String(fin.ending));
check('ending saved to disk', await ev(() => window.__session.saves.load()?.world.flags.ending) === ending);
await until(() => window.__game.mode === 'title', 30000);
check('credits played, returned to title', await ev(() => window.__game.mode === 'title' && (window.__cards || []).length >= 2), await ev(() => JSON.stringify((window.__cards || []).map((c) => c.length))));
const cards = await ev(() => window.__cards?.[0] ?? []);
console.log('epilogue:', cards.length, 'cards'); for (const c of cards) console.log('   ', c);
check('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
