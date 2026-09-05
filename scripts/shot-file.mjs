// Screenshot a local HTML file: node scripts/shot-file.mjs <file> <out.png> [width] [height]
import path from 'node:path';
import { chromium, executablePath } from '../tools/audit/browser.mjs';
const [file, out, w = '1200', h = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) || 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('file://' + path.resolve(file), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: Number(h) === 0 });
await browser.close();
console.log('saved', out);
