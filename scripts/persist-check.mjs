// Browser persistence check: reload survival, offline summary, corruption fallback.
import { chromium, executablePath } from '../tools/audit/browser.mjs';
const url = 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => { const g = window.__ashfall.getState(); g.state.marrow = g.state.marrow.add(4242); g.state.materials.shard = 7; });
await page.waitForTimeout(11000); // autosave
const before = await page.evaluate(() => window.__ashfall.getState().state.marrow.toString());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ marrow: window.__ashfall.getState().state.marrow.toString(), coarseSlag: window.__ashfall.getState().state.materials.shard }));
console.log('before', before, 'after', JSON.stringify(after));

// Backdate the save by 3 hours before the page scripts run (unload saves would otherwise overwrite it).
await ctx.addInitScript(() => {
  if (window.__did_backdate) return; window.__did_backdate = true;
  const raw = localStorage.getItem('mournwake.save'); if (!raw) return;
  const blob = JSON.parse(raw);
  if (blob.savedAt < Date.now() - 2 * 3600 * 1000) return;
  blob.state.savedAt = Date.now() - 3 * 3600 * 1000; blob.savedAt = blob.state.savedAt;
  const inner = JSON.stringify(blob.state);
  let h = 0x811c9dc5; for (let i = 0; i < inner.length; i++) { h ^= inner.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  blob.checksum = h.toString(16).padStart(8, '0');
  localStorage.setItem('mournwake.save', JSON.stringify(blob));
  localStorage.setItem('__backdated', '1');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: process.argv[2] });
console.log('offline modal shown:', (await page.getByText('While you were away').count()) > 0);
await page.getByRole('button', { name: 'Return to the fire' }).click();
await page.waitForTimeout(200);

// Corrupt the main save before load; the backup must take over with a visible banner.
await ctx.addInitScript(() => {
  if (localStorage.getItem('__corrupted')) return;
  const raw = localStorage.getItem('mournwake.save'); if (!raw) return;
  localStorage.setItem('mournwake.save', raw.slice(0, 200));
  localStorage.setItem('__corrupted', '1');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
console.log('corruption banner shown:', (await page.getByText(/could not be loaded/).count()) > 0, 'marrow from backup:', await page.evaluate(() => window.__ashfall.getState().state.marrow.toString()));
await browser.close();
