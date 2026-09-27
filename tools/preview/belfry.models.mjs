// Belfry model line-up: node tools/preview/belfry.models.mjs <baseUrl> <outDir> [set]
// set 'enemies' (default): bellWarden, keeperEcho ×3, bellRinger, bellkeeperBoss; 'aldren': the three reigns.
// Optional 'pose:<moveId>@<t>' freezes each actor mid-move.
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:5216/', outDir = '.', set = 'enemies', poseArg = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + '?region=belfry&quality=low&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 600000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.__game; g.player.teleport(new window.THREE.Vector3(0, 35, 6), Math.PI); });
await page.waitForTimeout(9000);
const pose = poseArg.startsWith('pose:') ? poseArg.slice(5).split('@') : null;
await page.evaluate(([set, pose]) => {
  const g = window.__game, T = window.THREE, m = g.deps.models;
  for (const e of g.enemies) e.object.visible = false;
  g.enemies.length = 0;
  const lineup = set === 'aldren'
    ? [['keeperEcho', 'aldren_young', 'aldren_lance', 1.08, 1], ['keeperEcho', 'aldren_sorcerer', 'aldren_lance', 1.08, 1], ['keeperEcho', 'aldren_ancient', 'aldren_maul', 1.08, 1.32]]
    : [['bellWarden', null, null, 1, 1], ['keeperEcho', null, null, 1, 1], ['keeperEcho', null, null, 1, 1], ['keeperEcho', null, null, 1, 1], ['bellRinger', null, null, 1, 1], ['keeperEcho', 'bellkeeperBoss', 'condemned_chain', 1, 1]];
  const y = 35, z = -6;
  window.__lineup = lineup.map(([kind, look, weapon, h, scale], i) => {
    const x = (i - (lineup.length - 1) / 2) * (set === 'aldren' ? 3.4 : 2.1);
    const e = g.spawnEnemy(kind, new T.Vector3(x, y, z), 0, { seed: 3 + i * 5 });
    if (look) {
      e.model?.dispose();
      e.model = m.buildEnemy(e.rig, look, 1);
      if (weapon) { if (e.weaponR) e.weaponR.model.object.removeFromParent(); const w = m.buildWeapon(weapon); e.weaponR = { id: weapon, model: w }; e.rig.sockets.weaponR.add(w.object); }
    }
    e.object.scale.setScalar(scale);
    e.aware = false; e.def = { ...e.def, passive: true };
    return e;
  });
  g.player.teleport(new T.Vector3(0, y, 6), Math.PI);
  g.cameraOverride = (_dt, cam) => { cam.position.set(0, y + (set === 'aldren' ? 1.9 : 1.5), z + (set === 'aldren' ? 6.0 : 4.6)); cam.lookAt(0, y + (set === 'aldren' ? 1.5 : 1.0), z); return true; };
  window.__posed = pose;
  const l = new T.PointLight(0xfff0dd, 30, 20, 1.5); l.position.set(0, y + 3, z + 4); g.scene.add(l);
}, [set, pose]);
await page.waitForTimeout(5000);
await page.evaluate(() => { document.getElementById('ui').style.display = 'none'; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/belfry-models-${set}.png` });
console.log('saved', `${outDir}/belfry-models-${set}.png`);
const n = await page.evaluate(() => window.__lineup.length);
for (let i = 0; i < n; i++) {
  await page.evaluate((i) => {
    const e = window.__lineup[i], g = window.__game;
    const h = e.height * e.object.scale.x;
    g.cameraOverride = (_dt, cam) => { cam.position.set(e.pos.x + 0.9, e.pos.y + h * 0.8, e.pos.z + 2.2 + h * 0.6); cam.lookAt(e.pos.x, e.pos.y + h * 0.6, e.pos.z); return true; };
  }, i);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/belfry-models-${set}-${i}.png` });
}
await browser.close();
