// Keyboard walk: tab through the page and report what receives focus, plus the visible focus ring.
import { chromium, executablePath } from '../tools/audit/browser.mjs';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const seen = [];
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return 'body'; const cs = getComputedStyle(el); return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28)}" outline=${cs.outlineStyle}/${cs.outlineWidth}`; });
  seen.push(info);
}
const unique = [...new Set(seen)];
console.log('focus stops:', unique.length); console.log(unique.slice(0, 40).join('\n'));
// hotkeys still work with focus on the body
await page.keyboard.press('f'); await page.waitForTimeout(100);
console.log('clicks after F:', await page.evaluate(() => __ashfall.getState().state.stats.clicks));
await browser.close();
