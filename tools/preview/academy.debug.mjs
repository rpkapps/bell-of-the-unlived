import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.on('pageerror', (e) => console.log('PAGEERR', e.message, e.stack?.slice(0,600)));
page.on('console', (m) => { if (m.type() === 'error' || m.type()==='warning') console.log(m.type(), m.text().slice(0, 400)); });
await page.goto('http://127.0.0.1:5212/?region=academy&quality=low&norender');
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => ({ ready: window.__ready, mode: window.__game?.mode, region: window.__region?.id }));
  console.log(JSON.stringify(s));
  if (s.mode === 'play' && s.region === 'academy') break;
}
await browser.close();
