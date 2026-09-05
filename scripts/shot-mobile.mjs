// Phone screenshots. Usage: node scripts/shot-mobile.mjs <out.png> [pillar] [subtab] [setupJs] [w] [h]
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = 'shot.png', pillar = '', subtab = '', setup = '', w = '390', h = '844'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2, isMobile: Number(w) < 900, hasTouch: Number(w) < 900 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
if (setup) await page.evaluate(setup);
await page.waitForTimeout(250);
if (pillar) { await page.getByRole('button', { name: new RegExp('^' + pillar + '$') }).first().click(); await page.waitForTimeout(250); }
if (subtab) { await page.getByRole('tab', { name: new RegExp('^' + subtab) }).first().click(); await page.waitForTimeout(250); }
await page.waitForTimeout(400);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
