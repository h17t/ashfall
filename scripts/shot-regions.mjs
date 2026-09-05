// One capture per region, in-game, with the stage running. Usage: node scripts/shot-regions.mjs [outdir]
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const sharp = require('/home/user/mournwake/node_modules/sharp');
const out = process.argv[2] ?? 'art/review';
const zones = ['tollroad', 'mire', 'archive', 'sanctum', 'undercroft', 'renderworks', 'nadir'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const tiles = [];
for (const z of zones) {
  await page.evaluate((zone) => {
    const g = __ashfall.getState(); const s = g.state;
    s.unlockedZones = ['tollroad', 'mire', 'archive', 'sanctum', 'undercroft', 'renderworks', 'nadir'];
    for (const id of s.unlockedZones) { s.zones[id] = s.zones[id] ?? { cleared: -1, kills: [0, 0, 0, 0], bossKills: 0, secretFound: false, secretKills: 0, cycleKills: 0 }; s.zones[id].cleared = 3; s.zones[id].bossKills = 1; }
    s.player.level = 120; s.player.hpMax = 1e6; s.player.hp = 1e6; s.player.draughts = 99;
    localStorage.setItem('mournwake.seenBosses', '[]');
    g.dispatch({ type: 'travel', zone, tier: 1 }); g.stepBy(1);
    // skip the region card
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }, z);
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  await page.waitForTimeout(900);
  const buf = await page.screenshot({ clip: { x: 20, y: 50, width: 940, height: 640 } });
  tiles.push(await sharp(buf).resize(700).png().toBuffer());
  console.log('shot', z);
}
const h = Math.round(640 * 700 / 940);
await sharp({ create: { width: 1400, height: h * 4, channels: 3, background: '#000' } }).composite(tiles.map((b, i) => ({ input: b, left: (i % 2) * 700, top: Math.floor(i / 2) * h }))).png().toFile(`${out}/regions-sheet.png`);
await browser.close();
console.log('saved', `${out}/regions-sheet.png`);
