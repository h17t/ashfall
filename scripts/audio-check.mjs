// Headless smoke test for the synthesized audio: cues, the region bed, reverb swap, hush and tolls.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: /^Settings/ }).click();
await page.getByText('Sound (synthesized').locator('..').getByRole('button').click();
await page.waitForTimeout(200);
const arena = page.locator('.cursor-pointer').first();
for (let i = 0; i < 30; i++) { await arena.click({ force: true }); await page.waitForTimeout(60); }
await page.waitForTimeout(800);
console.log('bed after clicks:', await page.evaluate(() => JSON.stringify({ active: __ashfallAudio.bedActive(), region: __ashfallAudio.region() })));
await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; s.unlockedZones = ['approach', 'mire']; s.zones.approach.cleared = 3; s.zones.approach.bossKills = 1; g.dispatch({ type: 'travel', zone: 'mire', tier: 0 }); });
await page.waitForTimeout(600);
console.log('bed after travel:', await page.evaluate(() => JSON.stringify({ active: __ashfallAudio.bedActive(), region: __ashfallAudio.region() })));
// boss: drive HP to just above the second phase threshold → hush; then across it → toll and release
await page.evaluate(() => { const g = __ashfall.getState(); g.dispatch({ type: 'travel', zone: 'approach', tier: -1 }); g.stepBy(2); });
await page.waitForTimeout(300);
await page.evaluate(() => { const g = __ashfall.getState(); const e = g.state.encounter.enemy; e.hp = e.hpMax.mul(0.62); g.replace(g.state); });
await page.waitForTimeout(600);
console.log('hush near threshold:', await page.evaluate(() => __ashfallAudio.hushed()));
await page.evaluate(() => { const g = __ashfall.getState(); const e = g.state.encounter.enemy; e.hp = e.hpMax.mul(0.55); g.stepBy(0.1); });
await page.waitForTimeout(1500);
console.log('after phase:', await page.evaluate(() => JSON.stringify({ hushed: __ashfallAudio.hushed(), phase: __ashfall.getState().state.encounter.enemy?.phase })));
console.log('errors:', errors.length, errors.slice(0, 3));
await browser.close();
