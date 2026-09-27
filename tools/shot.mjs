// Usage: node tools/shot.mjs <baseUrl> <outPrefix> <query1> [query2...]
import { chromium } from 'playwright-core';
const [base, prefix, ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
let i = 0;
for (const q of queries) {
  await page.goto(base + '?' + q, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => console.log('not ready', q));
  await page.waitForTimeout(700);
  const f = `tools/out/${prefix}-${i++}.png`;
  await page.screenshot({ path: f });
  console.log(f, q);
}
await browser.close();
