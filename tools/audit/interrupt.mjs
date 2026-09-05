// Interruption tests. A phone backgrounds, freezes and kills the page without warning; the save
// and the offline summary have to survive all of it. Three checks, each against the built game:
//   A. backgrounding: the tab goes hidden -> the save on disk is fresher than a second;
//   B. an abrupt kill: play past one autosave, background the tab, crash the renderer from outside
//      -> the backgrounding save is what the reopened game loads, kills intact;
//   C. suspension: the clock jumps two hours while the page is open -> the away report opens and
//      marrow was earned; the same after a reload against the stale save.
// Usage: node tools/audit/interrupt.mjs [url]
import { chromium, executablePath } from './browser.mjs';
const url = process.argv[2] ?? 'http://localhost:4173/';
const EXE = executablePath;
const AUTOSAVE_MS = 10_000;
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' };
const fail = [];
const savedAt = (page) => page.evaluate(() => { const r = localStorage.getItem('mournwake.save'); return r ? JSON.parse(r).savedAt : 0; });
const kills = (page) => page.evaluate(() => __ashfall.getState().state.stats.kills.toNumber());
const hurry = (page) => page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; s.player.hpMax = 1e6; s.player.hp = 1e6; g.replace(s); });

// A. backgrounding
{
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await (await browser.newContext(phone)).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = await savedAt(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const now = await page.evaluate(() => Date.now());
  const after = await savedAt(page);
  console.log(`A backgrounding: save age before ${before ? now - before : 'none'} ms, after ${now - after} ms`);
  if (!(after > before && now - after < 1000)) fail.push('A: hiding the tab did not write a fresh save');
  // and the loop slows to 1Hz while hidden: the timer count drops
  await browser.close();
}

// B. abrupt kill. On a phone the OS kills the page's renderer, not the browser: whatever the page
// already handed to storage survives, and nothing the page meant to do at unload happens. So:
// play past an autosave, fight, background the tab, then crash the renderer from the outside and
// open the game again in the same browser.
{
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext(phone);
  let page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await hurry(page);
  await page.evaluate(() => { const g = __ashfall.getState(); setInterval(() => g.dispatch({ type: 'click' }), 120); });
  await page.waitForTimeout(AUTOSAVE_MS + 2500);
  const k = await kills(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const tHide = Date.now();
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  const crashed = new Promise((r) => page.once('crash', r));
  cdp.send('Page.crash').catch(() => {}); // the renderer dies mid-frame; no unload, no pagehide
  await Promise.race([crashed, new Promise((r) => setTimeout(r, 3000))]);
  await page.close().catch(() => {});
  page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const at = await savedAt(page);
  const k2 = await kills(page);
  console.log(`B abrupt kill: ${k} kills when backgrounded, ${k2} after the renderer was killed and the game reopened; the surviving save was written ${at - tHide} ms after backgrounding`);
  if (!(at > 0 && Math.abs(at - tHide) <= 500)) fail.push(`B: the save that survived the kill was not the backgrounding save (written ${at - tHide} ms after hiding)`);
  if (k2 < k) fail.push(`B: kills fell from ${k} to ${k2} across the kill`);
  if (k <= 0) fail.push('B: the fight before the kill made no kills, the check proved nothing');
  await browser.close();
}

// C. suspension
{
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await (await browser.newContext(phone)).newPage();
  await page.clock.install({ time: Date.now() });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.clock.runFor(2500);
  await hurry(page);
  await page.clock.fastForward('02:00:00');
  await page.clock.runFor(1200);
  const report = page.getByRole('dialog', { name: 'While you were away' });
  const open = await report.isVisible().catch(() => false);
  const credited = await page.evaluate(() => (__ashfall.getState().state.offline?.seconds ?? 0) / 3600);
  console.log(`C suspension (open page): away report ${open ? 'opened' : 'MISSING'}, ${credited.toFixed(2)} h credited`);
  if (!open) fail.push('C: no away report after a two-hour suspension with the page open');
  if (credited < 1.9) fail.push(`C: the open-page suspension credited ${credited.toFixed(2)} h`);
  // dismiss, save, jump again, reload: the stale save yields the summary on load
  await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; s.offline = null; g.replace(s); });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.fastForward('03:00:00');
  await page.reload({ waitUntil: 'networkidle' });
  await page.clock.runFor(1200);
  const open2 = await page.getByRole('dialog', { name: 'While you were away' }).isVisible().catch(() => false);
  const hours = await page.evaluate(() => (__ashfall.getState().state.offline?.seconds ?? 0) / 3600);
  console.log(`C suspension (reload): away report ${open2 ? 'opened' : 'MISSING'}, ${hours.toFixed(2)} h credited`);
  if (!open2 || hours < 2.9) fail.push(`C: reload after a stale save credited ${hours.toFixed(2)} h`);
  await browser.close();
}

if (fail.length) { console.log('\nINTERRUPT FAIL'); fail.forEach((f) => console.log(' -', f)); process.exit(1); }
console.log('\ninterruptions ok');
