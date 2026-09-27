// The first-arrival reveal and the title vista: node tools/preview/belfry.reveal.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:5216/', outDir = '.'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base + '?region=belfry&quality=low&skipintro', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 600000 });
for (const [i, ms] of [[0, 1500], [1, 3500], [2, 3500]]) {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${outDir}/belfry-reveal-${i}.png` });
}
await page.evaluate(() => window.__session.quitToTitle());
await page.waitForTimeout(6000);
await page.screenshot({ path: `${outDir}/belfry-title.png` });
await browser.close();
