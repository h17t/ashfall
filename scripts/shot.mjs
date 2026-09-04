// Screenshot helper. Usage: node scripts/shot.mjs <url> <out.png> [tab] [setupJs]
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [url = 'http://localhost:4173/', out = 'shot.png', tab = '', setup = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
if (setup) await page.evaluate(setup);
await page.waitForTimeout(300);
if (tab) await page.getByRole('button', { name: new RegExp('^' + tab + '$', 'i') }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
