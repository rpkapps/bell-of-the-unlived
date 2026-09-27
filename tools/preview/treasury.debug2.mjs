// Force a boss/enemy to perform one move toward a standing player; report contact and the closest approach of its weapon.
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://127.0.0.1:5214/';
const [kind, move, dist] = [process.argv[3] ?? 'aurelmask', process.argv[4] ?? 'tr_au_tally', +(process.argv[5] ?? 2.2)];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(400000);
await page.goto(base + '?region=treasury&quality=low&norender');
await page.waitForFunction(() => window.__ready === true && window.__game?.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async ({ kind, move, dist }) => {
  const g = window.__game, T = window.THREE, M = window.__region.debugMoves();
  const e = g.enemies.find((x) => x.def.kind === kind && !x.dead);
  const p = g.player;
  const C = new T.Vector3(10, -3.2, -120);
  e.engaged = false; e.aware = false;
  e.teleport(C.clone(), 0);
  p.teleport(C.clone().add(new T.Vector3(0, 0, dist)), Math.PI);
  const hits = [];
  const prev = g.combat.onResult;
  g.combat.onResult = (res) => { prev(res); if (res.attacker === e) hits.push(res.outcome + '@' + e.move?.t.toFixed(2)); };
  let best = 99, bestT = 0;
  e.startMove(M[move]);
  const a = new T.Vector3(), b = new T.Vector3();
  await new Promise((res) => {
    const w = () => {
      p.hp = p.hpMax;
      if (e.move) {
        const seg = e.weaponSegment('R', a, b);
        if (seg !== null) { const d = Math.min(a.distanceTo(p.chest), b.distanceTo(p.chest)); if (d < best) { best = d; bestT = e.move.t; } }
      }
      if (!e.move) res(); else setTimeout(w, 16);
    };
    w();
  });
  g.combat.onResult = prev;
  return { hits, closestWeaponEndToChest: +best.toFixed(2), at: +bestT.toFixed(2), enemyPos: e.pos.toArray().map((x) => +x.toFixed(2)) };
}, { kind, move, dist });
console.log(kind, move, dist, JSON.stringify(r));
await browser.close();
