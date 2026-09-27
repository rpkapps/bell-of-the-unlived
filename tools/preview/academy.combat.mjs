// Academy combat readability shots: lens-floor warning/burn, a warden's narrowing beam, choir wards.
// node tools/preview/academy.combat.mjs [baseUrl] [outDir]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5212/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(600000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(base + '?region=academy&quality=low&origin=courtMage');
await page.waitForFunction(() => window.__ready && window.__game?.mode === 'play' && window.__region?.id === 'academy', null, { timeout: 600000 });
await page.waitForTimeout(2000);
const ev = (f, a) => page.evaluate(f, a);
await ev(() => { document.getElementById('ui').style.visibility = 'hidden'; const p = window.__game.player; p.hpMax = p.hp = 1e7; });
// wait in simulated seconds (swiftshader frames are slow), then capture
const shot = async (name, wait = 2500) => { const t0 = await ev(() => window.__region.time); await page.waitForFunction(([t, w]) => window.__region.time >= t + w, [t0, wait / 1000], { polling: 100 }); await page.screenshot({ path: `${out}/academy-combat-${name}.png` }); console.log('shot', name); };

// 1) a lens warden's beam, aimed down the tunnel toward the Returned
await ev(() => import('/src/combat/moves.ts').then((m) => { window.__moves = m.MOVES; }));
await ev(() => {
  const g = window.__game, T = window.THREE;
  const w = g.enemies.find((e) => e.spawnId === 'ac_warden_tunnel');
  for (const e of g.enemies) if (e !== w) e.think = () => e.wish.set(0, 0, 0);
  g.player.teleport(new T.Vector3(-13.5, 2, -1.5), -Math.PI / 2);
  w.think = () => w.wish.set(0, 0, 0);
  w.target = g.player; w.aware = true;
  w.startMove(window.__moves.warden_beam);
  g.cameraOverride = (dt, cam) => { cam.position.set(-15.2, 3.4, -0.4); cam.lookAt(-7, 2.6, -1.8); return true; };
});
await shot('beam-aim', 900);
// 2) the ritual choir warding the hall
await ev(() => {
  const g = window.__game, T = window.THREE;
  g.player.teleport(new T.Vector3(1, 18, 2), Math.PI);
  const c = g.enemies.find((e) => e.spawnId === 'ac_choir_hall');
  const echo = g.enemies.find((e) => e.spawnId === 'ac_echo_hall');
  c.target = g.player; c.aware = true; echo.aware = true; echo.target = g.player;
  c.startMove({ ...window.__moves.choir_chant, dur: 60 });
  g.cameraOverride = (dt, cam) => { cam.position.set(1, 20.2, 3); cam.lookAt(7, 18.8, -3.5); return true; };
});
await shot('choir-ward', 1500);
// 3) Keeper Orrow and the lens floor warning, then burning
await ev(() => {
  const g = window.__game, T = window.THREE, r = window.__region;
  const a = r.L.arenas.find((x) => x.bossId === 'orrow');
  g.player.teleport(new T.Vector3(-6.25, 44, -54), Math.PI);
  r.fight = { arena: a, boss: r.bosses.get('orrow') };
  const b = r.bosses.get('orrow'); b.engaged = true; b.think = () => b.wish.set(0, 0, 0); b.target = g.player; b.aware = true;
  r.floor.active = true; r.floor.nextAt = 1e9;
  r.startFloorPattern();
  g.cameraOverride = (dt, cam) => { cam.position.set(4, 53, -46); cam.lookAt(-6.25, 44, -64); return true; };
});
await shot('lens-warning', 1600);
await shot('lens-burn', 1200);
await ev(() => { const g = window.__game; g.cameraOverride = (dt, cam) => { cam.position.set(-6.25, 45.6, -58.5); cam.lookAt(-6.25, 45.2, -66); return true; }; });
await shot('orrow-face', 600);
for (const e of errs.slice(0, 8)) console.log('ERR', e.slice(0, 300));
await browser.close();
