// Screenshot helper: builds are served by `vite preview`; this captures the game after a few actions.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'shot.png';
const clicks = Number(process.argv[4] ?? 12);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const arena = page.locator('.cursor-pointer').first();
for (let i = 0; i < clicks; i++) { await arena.click({ force: true }); await page.waitForTimeout(120); }
await page.waitForTimeout(400);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
