// Touch-feel smoke: tap latency on Strike, multi-touch (Strike while Dodge is held), swipe between
// pillars, drag-to-dismiss a sheet, long-press opening details, and the haptic patterns fired.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.addInitScript(() => { window.__vibes = []; navigator.vibrate = (p) => { window.__vibes.push(p); return true; }; });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; s.player.hpMax = 1e5; s.player.hp = 1e5; g.replace(s); g.stepBy(1); });
// 1. tap latency: time from tap to the hit event's DOM response (the hurt tint) and the click counter
const strike = page.locator('.act-strike');
const before = await page.evaluate(() => __ashfall.getState().state.stats.clicks);
const t0 = Date.now();
await strike.tap();
const clicksAfter = await page.evaluate(() => __ashfall.getState().state.stats.clicks);
console.log('strike registered:', clicksAfter - before === 1, 'in', Date.now() - t0, 'ms (playwright round trip)');
// 2. multi-touch: hold Dodge with one finger, tap Strike with another
const dodge = page.locator('.act-dodge');
const db = await dodge.boundingBox(); const sb = await strike.boundingBox();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: db.x + db.width / 2, y: db.y + db.height / 2, id: 1 }] });
const c1 = await page.evaluate(() => __ashfall.getState().state.stats.clicks);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: db.x + db.width / 2, y: db.y + db.height / 2, id: 1 }, { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2, id: 2 }] });
await page.waitForTimeout(60);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: db.x + db.width / 2, y: db.y + db.height / 2, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const c2 = await page.evaluate(() => __ashfall.getState().state.stats.clicks);
console.log('strike while dodge held:', c2 - c1 >= 1);
// 3. swipe between pillars (on the section area, not the stage)
await page.getByRole('button', { name: /^Cortege$/ }).tap(); await page.waitForTimeout(200);
const area = await page.locator('.section-scroll').first().boundingBox();
const y = area.y + 60;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: area.x + area.width - 30, y, id: 3 }] });
for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: area.x + area.width - 30 - i * 40, y, id: 3 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(250);
console.log('swipe left → Arsenal:', await page.locator('.nav-btn.is-active .nav-label').textContent());
// 4. long-press opens details; drag-to-dismiss closes the sheet
const row = page.locator('.tip-wrap', { hasText: 'Damage per hit' }).first();
await row.scrollIntoViewIfNeeded();
const rb = await row.boundingBox();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rb.x + 40, y: rb.y + rb.height / 2, id: 4 }] });
await page.waitForTimeout(550);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(250);
console.log('long-press opened sheet:', await page.locator('[role=dialog]').count() === 1);
const sheet = await page.locator('.sheet').boundingBox();
const gx = sheet.x + sheet.width / 2, gy = sheet.y + 14;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gx, y: gy, id: 5 }] });
for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gx, y: gy + i * 20, id: 5 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(250);
console.log('drag closed sheet:', await page.locator('[role=dialog]').count() === 0);
// 5. haptics fired for hits; none while idling
const vibes = await page.evaluate(() => window.__vibes.length);
await page.evaluate(() => { window.__vibes = []; const g = __ashfall.getState(); const s = g.state; s.encounter.enemy = null; s.encounter.respawnIn = 60; g.replace(s); });
await page.waitForTimeout(1200);
const idle = await page.evaluate(() => window.__vibes.length);
console.log('haptics fired during play:', vibes > 0, '· during idle:', idle);
await browser.close();
