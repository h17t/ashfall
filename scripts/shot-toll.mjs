// The Toll page at Dusk with two afflictions on; the arena in the Black Hour.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.env.URL ?? 'http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  s.marrow = new D(31000); s.player.level = 28; s.player.hpMax = 1e6; s.player.hp = 1e6; s.stats.bossKills = 1; s.flags.afflictionsUnlocked = true; s.flags.descentUnlocked = true; s.flags.forgeUnlocked = true;
  s.prestige.bossesEverKilled = ['coldPyreWarden']; s.creed.current = 'wick'; s.creed.rep = { wick: 20 };
  s.afflictions = ['thinBlood', 'ironComposure']; s.toll.t = 26 * 60; s.toll.phase = 'dusk';
  g.replace(s);
});
await page.getByRole('button', { name: /^Lantern$/ }).click(); await page.waitForTimeout(250);
await page.getByRole('tab', { name: /^Toll/ }).click(); await page.waitForTimeout(500);
await page.screenshot({ path: 'art/mobile/m8-toll.png' });
await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; s.toll.t = 35 * 60; s.toll.phase = 'black'; s.encounter.enemy = null; s.encounter.respawnIn = 0.1; g.replace(s); });
await page.getByRole('button', { name: /^Combat$/ }).click(); await page.waitForTimeout(1800);
console.log('phase', await page.evaluate(() => document.documentElement.className));
await page.screenshot({ path: 'art/mobile/m8-black.png' });
await browser.close();
