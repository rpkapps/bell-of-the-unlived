// Usage: node tools/preview/beasts-shot.mjs <port> <outPrefix> <query1> [query2...]
// Screenshots tools/preview/beasts.html with software GL (960×540). Keep sessions short.
import { chromium } from 'playwright-core';
const [port, prefix, ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
let i = 0;
for (const q of queries) {
  const wait = /wait=(\d+)/.exec(q);
  await page.goto(`http://127.0.0.1:${port}/tools/preview/beasts.html?${q}`, { waitUntil: 'commit', timeout: 180000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 400000 }).catch(() => console.log('not ready', q));
  await page.waitForTimeout(wait ? Number(wait[1]) : 300);
  const f = `tools/out/${prefix}-${i++}.png`;
  await page.screenshot({ path: f, timeout: 300000 });
  const stats = await page.evaluate(() => window.__stats);
  console.log(f, q, JSON.stringify(stats));
}
await browser.close();
