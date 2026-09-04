// Frame-time probe. Usage: node scripts/perf.mjs [url]. Loads a heavy state (boss, full squad, DoTs, spam clicks)
// and reports rAF intervals over 4 seconds. Not a benchmark of the engine (see scripts/bench.ts): a check that
// the presentation layer leaves 60fps on the table.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state;
  s.zones.approach.cleared = 3; s.souls = s.souls.add(50000); s.player.level = 31;
  s.squad.recruited = ['aldric']; s.squad.phantoms = [{ id: 'aldric', level: 5, xp: s.souls.mul(0), assignment: 'beside', weapon: null, retreat: 0 }];
  g.dispatch({ type: 'travel', zone: 'approach', tier: -1 }); g.stepBy(2);
  const e = s.encounter.enemy; if (e) { e.statuses.poison.active = 30; e.statuses.frost.active = 30; e.statuses.bleed.buildup = 70; }
});
const res = await page.evaluate(() => new Promise((resolve) => {
  const dt = []; let last = performance.now(); let clicks = 0;
  const g = __ashfall.getState();
  const tick = (t) => { dt.push(t - last); last = t; if (dt.length % 6 === 0) { g.dispatch({ type: 'click' }); clicks++; } if (dt.length < 240) requestAnimationFrame(tick); else resolve({ dt, clicks }); };
  requestAnimationFrame(tick);
}));
const d = res.dt.slice(5).sort((a, b) => a - b);
const avg = d.reduce((a, b) => a + b, 0) / d.length;
console.log(`frames ${d.length} clicks ${res.clicks} avg ${avg.toFixed(1)}ms p50 ${d[Math.floor(d.length * 0.5)].toFixed(1)} p95 ${d[Math.floor(d.length * 0.95)].toFixed(1)} max ${d[d.length - 1].toFixed(1)} over20ms ${d.filter((x) => x > 20).length}`);
await browser.close();
