// Standing Orders: the editor with three orders, and a chip's picker sheet.
import { chromium, executablePath } from '../tools/audit/browser.mjs';
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.stack?.split('\n').slice(0, 12).join(' / ')));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 1500)); });
await page.goto(process.env.URL ?? 'http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  s.marrow = new D(9100); s.player.level = 22; s.player.hpMax = 1e6; s.player.hp = 1e6; s.stats.bossKills = 2; s.stats.reprisals = 12; s.stats.perfectDodges = 5; s.flags.autoAttack = true; s.flags.ordersUnlocked = true; s.flags.descentUnlocked = true;
  s.automation.unlocked = ['autoAttack']; s.prestige.bossesEverKilled = ['coldPyreWarden', 'mireMother']; s.spellsKnown = ['marrowDart']; s.player.recited = ['marrowDart']; s.player.recitationSlots = 1;
  g.replace(s);
  g.dispatch({ type: 'setOrders', rules: [
    { id: 1, when: [{ kind: 'hp', op: '<', value: 35 }, { kind: 'draughts', op: '>', value: 0 }], then: { kind: 'drink' }, on: true, fired: 41, cd: 0 },
    { id: 2, when: [{ kind: 'reprisal', op: '>', value: 1 }], then: { kind: 'strike' }, on: true, fired: 388, cd: 0 },
    { id: 3, when: [{ kind: 'marrow', op: '>', value: 2 }], then: { kind: 'levelUp', arg: 'mig' }, on: false, fired: 6, cd: 0 },
  ] });
});
await page.getByRole('button', { name: /^Combat$/ }).click(); await page.waitForTimeout(250);
await page.getByRole('tab', { name: /^Orders/ }).click(); await page.waitForTimeout(400);
await page.evaluate(() => { const el = document.querySelector('.shell-main'); const sec = document.querySelector('.section'); if (el && sec) el.scrollTop = sec.offsetTop - 8; });
await page.screenshot({ path: 'art/mobile/m6-orders.png' });
const n = await page.evaluate(() => __ashfall.getState().state.orders.rules.length);
console.log('rules', n);
await page.getByRole('button', { name: /^Condition 1: HP/ }).first().click(); await page.waitForTimeout(400);
await page.screenshot({ path: 'art/mobile/m6-picker.png' });
await page.getByRole('button', { name: /^Composure/ }).click(); await page.waitForTimeout(300);
console.log('after pick', await page.evaluate(() => JSON.stringify(__ashfall.getState().state.orders.rules[0].when)));
await browser.close();
