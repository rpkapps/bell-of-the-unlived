// Scripted play-test: node tools/play.mjs <url> <outPrefix> <script.json|inline>
// Script: array of steps {wait:ms} | {key:'KeyW', down:ms} | {mouse:'left'} | {shot:true} | {eval:'js'}
import { chromium } from 'playwright-core';
const [url, prefix, scriptArg] = process.argv.slice(2);
const script = JSON.parse(scriptArg);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
let n = 0;
for (const s of script) {
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.key) { await page.keyboard.down(s.key); await page.waitForTimeout(s.down ?? 80); await page.keyboard.up(s.key); }
  if (s.hold) await page.keyboard.down(s.hold);
  if (s.release) await page.keyboard.up(s.release);
  if (s.mouse) { await page.mouse.move(640, 360); await page.mouse.down({ button: s.mouse }); await page.waitForTimeout(s.down ?? 60); await page.mouse.up({ button: s.mouse }); }
  if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log('eval:', JSON.stringify(r)); }
  if (s.shot) { const f = `tools/out/${prefix}-${n++}.png`; await page.screenshot({ path: f }); console.log(f); }
}
for (const e of errs.slice(0, 20)) console.log(e);
await browser.close();
