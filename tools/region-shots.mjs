// In-game screenshots of a region at named anchors / stillbells.
// node tools/region-shots.mjs <region> <spec>... [--base=url] [--q=medium]
// spec: anchorName | bell:<id> | x,y,z[@yaw]   optional ~pitch  e.g. "bellView~0.05"  "10,0,-40@3.1~0.2"
import { chromium } from 'playwright-core';
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [region, ...specs] = args.filter((a) => !a.startsWith('--'));
const base = opt.base ?? 'http://127.0.0.1:5191/';
const [w, h] = (opt.view ?? '960x540').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`${base}?region=${region}&origin=${opt.origin ?? 'householdKnight'}&quality=${opt.q ?? 'medium'}`);
await page.waitForFunction(() => window.__ready && window.__game.mode === 'play', null, { timeout: 280000 });
await page.waitForTimeout(3000);
// hide transient overlays (area banners, captions, prompts, hints); --nohud hides the HUD too
await page.addStyleTag({ content: `.banner, .sub-line, .hud-prompt, .hint, .toast { display: none !important; }${opt.nohud ? ' .hud { display: none !important; }' : ''}` });
if (opt.list) console.log(await page.evaluate(() => Object.keys(window.__region.L?.anchors ?? {}).join(' ')));
for (const spec of specs) {
  const flip = spec.includes('^');
  const [spec2, back] = spec.replace('^', '').split('*');
  const [where, pitch] = spec2.split('~');
  const r = await page.evaluate(({ where, pitch, flip, back }) => {
    const g = window.__game, R = window.__region, T = window.THREE;
    let pos, yaw = g.player.yaw;
    if (where.startsWith('bell:')) { const b = R.stillbells().find((x) => x.id === where.slice(5)); if (!b) return 'no bell ' + where; pos = b.pos.clone(); yaw = b.yaw; }
    else if (/^-?[\d.]+,/.test(where)) { const [xyz, y2] = where.split('@'); const [x, y, z] = xyz.split(',').map(Number); pos = new T.Vector3(x, y, z); if (y2) yaw = +y2; }
    else { const a = R.L?.anchors?.[where]; if (!a) return 'no anchor ' + where; pos = a.pos.clone(); if (a.yaw !== undefined) yaw = a.yaw; }
    if (flip) yaw += Math.PI;
    g.player.move = null; g.player.teleport(pos, yaw); g.cam.snapBehind(g.player);
    if (pitch) g.cam.pitch = +pitch;
    if (back) {
      // free photo camera: behind and above the spot, pulled in before walls, looking along the yaw
      const p = +(pitch ?? 0.2), fwd = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const eye = pos.clone().setY(pos.y + 1.6);
      const bv = new T.Vector3(-fwd.x * Math.cos(p), Math.sin(p), -fwd.z * Math.cos(p));
      const hit = g.world.raycast(eye, bv, +back + 0.5);
      const d = hit ? Math.max(0.5, hit.distance - 0.4) : +back;
      const cpos = eye.clone().addScaledVector(bv, d);
      const look = eye.clone().addScaledVector(fwd, 14).setY(eye.y - 14 * Math.tan(p) * 0.35);
      g.cameraOverride = (dt, cam) => { cam.position.copy(cpos); cam.lookAt(look); return true; };
    } else g.cameraOverride = null;
    for (const e of g.enemies) e.aware = false;
    return 'ok ' + pos.toArray().map((v) => v.toFixed(1)).join(',');
  }, { where, pitch, flip, back });
  await page.waitForTimeout(+(opt.wait ?? 6000));
  const f = `tools/out/${region}-${where.replace(/[^\w.-]+/g, '_')}${flip ? '-r' : ''}.png`;
  await page.screenshot({ path: f });
  console.log(f, r);
}
await browser.close();
