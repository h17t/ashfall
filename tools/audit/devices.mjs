// The device matrix: the critical path on six profiles, with a screenshot of each, failing on a page
// error or a missing control. iPhone SE, iPhone 14, Pixel 7, Galaxy S22, iPad, desktop.
// Usage: node tools/audit/devices.mjs [url]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:4173/';
const DEVICES = [
  { name: 'iphone-se', w: 375, h: 667, dpr: 2, mobile: true },
  { name: 'iphone-14', w: 390, h: 844, dpr: 3, mobile: true },
  { name: 'pixel-7', w: 412, h: 915, dpr: 2.625, mobile: true },
  { name: 'galaxy-s22', w: 360, h: 780, dpr: 3, mobile: true },
  { name: 'ipad', w: 820, h: 1180, dpr: 2, mobile: true },
  { name: 'desktop', w: 1440, h: 900, dpr: 1, mobile: false },
];
mkdirSync('art/devices', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const fail = [];
for (const d of DEVICES) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: d.mobile, hasTouch: d.mobile, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 });
  const loaded = Date.now() - t0;
  // 1. strike lands
  const hp0 = await page.evaluate(() => __ashfall.getState().state.encounter.enemy?.hp.toNumber() ?? null);
  for (let i = 0; i < 30 && (await page.evaluate(() => !__ashfall.getState().state.encounter.enemy)); i++) await page.waitForTimeout(100);
  const strike = page.getByRole('button', { name: /^Strike$|^Reprisal$/ }).first();
  if ((await strike.count()) === 0) fail.push(`${d.name}: no Strike button`);
  else { await strike.dispatchEvent('pointerdown'); await page.waitForTimeout(150); }
  const hp1 = await page.evaluate(() => __ashfall.getState().state.encounter.enemy?.hp.toNumber() ?? -1);
  if (hp0 !== null && hp1 >= hp0 && hp1 !== -1) fail.push(`${d.name}: the strike did not land (${hp0} -> ${hp1})`);
  // 2. a level at the Lantern
  await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; s.marrow = new D(5000); g.replace(s); });
  const lantern = page.getByRole('button', { name: /^Lantern$/ }).first();
  if ((await lantern.count()) === 0) fail.push(`${d.name}: no Lantern in the navigation`);
  else await lantern.click();
  await page.waitForTimeout(300);
  const lvl0 = await page.evaluate(() => __ashfall.getState().state.player.level);
  const plus = page.getByRole('button', { name: 'Level Vitality' }).first();
  if ((await plus.count()) > 0) { await plus.scrollIntoViewIfNeeded(); await plus.click(); await page.waitForTimeout(150); } else fail.push(`${d.name}: no Level Vitality button`);
  const lvl1 = await page.evaluate(() => __ashfall.getState().state.player.level);
  if (lvl1 <= lvl0) fail.push(`${d.name}: levelling from the Lantern did not work`);
  // 3. a sheet opens and closes (settings quality picker exists), then back to combat
  const settings = page.getByRole('tab', { name: 'Settings' }).first();
  if ((await settings.count()) === 0) fail.push(`${d.name}: no Settings tab`); else { await settings.scrollIntoViewIfNeeded(); await settings.click(); }
  await page.waitForTimeout(250);
  if ((await page.getByRole('radiogroup', { name: 'Quality' }).count()) === 0) fail.push(`${d.name}: quality control missing`);
  await page.getByRole('button', { name: /^Combat$/ }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  const layout = await page.evaluate(() => document.querySelector('.shell')?.className.match(/shell-(portrait|landscape|wide)/)?.[1]);
  if (d.w >= 900 && layout !== 'wide') fail.push(`${d.name}: expected the wide layout, got ${layout}`);
  if (d.w < 640 && layout !== 'portrait') fail.push(`${d.name}: expected portrait, got ${layout}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) fail.push(`${d.name}: the page scrolls sideways`);
  await page.screenshot({ path: `art/devices/${d.name}.png` });
  for (const e of errors) fail.push(`${d.name}: page error: ${e}`);
  console.log(`${d.name.padEnd(11)} ${d.w}x${d.h} ${layout} loaded ${loaded}ms level ${lvl0}->${lvl1} errors ${errors.length}`);
  await ctx.close();
}
await browser.close();
if (fail.length) { console.log('\nDEVICES FAIL'); fail.forEach((f) => console.log(' -', f)); process.exit(1); }
console.log('\ndevices ok');
