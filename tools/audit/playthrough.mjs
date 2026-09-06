// A play-through driven by the real controls on a phone held upright and held sideways: strike,
// learn Standing Orders, level at the Lantern, buy and wield a weapon, call a shade, take the Stair
// (boon sheet, withdraw, haul), reforge, swear to a creed, snuff the flame and sit through the
// cinema, change settings, reload. Time passes through the engine (stepBy) between taps; the grind
// is skipped by editing the save where a test would otherwise take an hour. Fails on any page or
// console error and on any step the game refuses. Usage: node tools/audit/playthrough.mjs [url]
import { chromium, executablePath } from './browser.mjs';
const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath });
const fail = [];
for (const d of [{ name: 'upright', w: 390, h: 844 }, { name: 'sideways', w: 844, h: 390 }]) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const steps = [];
  const step = (name, ok, detail = '') => { steps.push(`${ok ? 'ok ' : 'BAD'} ${name}${detail ? ' · ' + detail : ''}`); if (!ok) fail.push(`${d.name}: ${name}${detail ? ' (' + detail + ')' : ''}`); };
  const S = (fn) => page.evaluate(fn);
  const ff = (sec) => page.evaluate((sec) => { const g = __ashfall.getState(); for (let t = 0; t < sec; t += 0.5) g.stepBy(0.5); }, sec);
  const patch = (fn) => page.evaluate((src) => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; (new Function('s', 'D', src))(s, D); g.replace(s); }, `(${fn.toString()})(s, D)`);
  const blocker = () => page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? `a sheet is open: ${d.getAttribute('aria-label')} · ${(d.textContent ?? '').trim().slice(0, 80)}` : 'nothing in the way'; });
  // the game stops for a cinema (a death, remains found, a lord's entrance) and for the boon sheet on the Stair
  const settle = async () => {
    for (let i = 0; i < 80 && (await S(() => document.documentElement.classList.contains('cine'))); i++) await page.waitForTimeout(250);
    const dialog = page.getByRole('dialog').first();
    if (await dialog.isVisible().catch(() => false)) {
      for (const name of [/^Withdraw/, /^Back to the road$/, /^Close$/]) { const b = dialog.getByRole('button', { name }); if (await b.count()) { await b.first().click(); await page.waitForTimeout(300); break; } }
    }
  };
  const go = async (pillar, tab) => {
    await settle();
    const b = page.getByRole('button', { name: new RegExp(`^${pillar}$`) }).first();
    if (await b.isVisible().catch(() => false)) { const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false); if (!ok) step(`open ${pillar}`, false, await blocker()); }
    if (tab) { const t = page.getByRole('tab', { name: tab }).first(); const ok = await t.click({ timeout: 5000 }).then(() => true).catch(() => false); if (!ok) step(`open ${pillar}/${tab}`, false, await blocker()); }
    await page.waitForTimeout(250);
  };
  const tap = async (locator, name) => { const ok = await locator.first().click({ timeout: 5000 }).then(() => true).catch(() => false); step(`tap ${name}`, ok); await page.waitForTimeout(200); return ok; };

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Begin' }).click({ timeout: 4000 }).catch(() => {});
  // 1. strike by hand until something dies
  for (let i = 0; i < 40; i++) { await page.locator('.arena-stage').dispatchEvent('pointerdown'); await ff(0.5); }
  await ff(20);
  step('first kill by hand', await S(() => __ashfall.getState().state.stats.kills.toNumber() >= 1));
  // 2. instinct and orders come with time
  await ff(400);
  step('auto-attack unlocked with time', await S(() => !!__ashfall.getState().state.flags.autoAttack));
  await go('Combat', 'Orders');
  await tap(page.getByRole('button', { name: 'New order' }), 'New order');
  const chips = page.locator('.order-chip');
  if (await chips.count()) { await chips.first().click(); await page.waitForTimeout(250); const opt = page.locator('.order-option').first(); if (await opt.count()) await opt.click(); }
  await page.waitForTimeout(200);
  step('an order stands', await S(() => __ashfall.getState().state.orders.rules.length >= 1));
  // 3. level at the Lantern
  await patch((s, D) => { s.marrow = new D(20000); });
  await go('Lantern', 'Rest');
  const lvl0 = await S(() => __ashfall.getState().state.player.level);
  await tap(page.getByRole('button', { name: 'Level Vitality' }), 'Level Vitality');
  await tap(page.getByRole('button', { name: 'Level Might' }), 'Level Might');
  step('two levels taken', await S(() => __ashfall.getState().state.player.level) === lvl0 + 2);
  // 4. a weapon bought and wielded
  await go('Arsenal', 'Weapons');
  const buy = page.getByRole('button', { name: /^Buy for/ });
  const owned0 = await S(() => Object.keys(__ashfall.getState().state.player.weapons).length);
  if (await buy.count()) { await tap(buy, 'Buy a weapon'); step('weapon owned', await S(() => Object.keys(__ashfall.getState().state.player.weapons).length) === owned0 + 1); }
  const equip = page.getByRole('button', { name: /^Equip$/ });
  if (await equip.count()) { const before = await S(() => __ashfall.getState().state.player.weapon); await tap(equip, 'Equip'); step('weapon changed hands', await S(() => __ashfall.getState().state.player.weapon) !== before); }
  // 5. a shade called
  await patch((s, D) => { s.marrow = new D(50000); });
  await go('Cortege');
  const call = page.getByRole('button', { name: /^Call · / });
  if (await call.count()) { await tap(call, 'Call a shade'); step('shade recruited', await S(() => __ashfall.getState().state.cortege.recruited.length >= 1)); } else step('a shade to call', false, 'no Call button');
  // 6. a lord felled (the grind skipped), which opens the forge, the stair, the holdfasts
  await patch((s, D) => { s.stats.bossKills = 1; s.stats.cycleBosses = 1; s.player.level = 30; s.marrow = new D(200000); });
  await ff(2);
  step('the lord\'s death unlocked the stair and forge', await S(() => { const f = __ashfall.getState().state.flags; return !!f.descentUnlocked && !!f.forgeUnlocked; }));
  // 7. the Stair: descend from the Lantern, take a boon, strike a floor, climb out, read the haul
  await go('Lantern', 'Stair');
  await tap(page.getByRole('button', { name: /^Descend/ }), 'Descend');
  step('on the stair', await S(() => !!__ashfall.getState().state.descent.run));
  await patch((s, D) => { if (s.descent.run) { s.descent.run.offer = ['glassMarrow', 'leechWick', 'marrowGreed']; s.descent.run.haul = new D(1000); } });
  await page.waitForTimeout(400);
  const boon = page.getByRole('radio', { name: /Glass Marrow/ });
  if (await boon.count()) { await tap(boon, 'a boon'); await tap(page.getByRole('button', { name: /^Take/ }), 'Take the boon'); }
  step('boon taken', await S(() => (__ashfall.getState().state.descent.run?.boons.length ?? 0) >= 1));
  await go('Combat');
  for (let i = 0; i < 20; i++) { await page.locator('.arena-stage').dispatchEvent('pointerdown'); await ff(0.5); }
  await ff(10);
  const marrow0 = await S(() => __ashfall.getState().state.marrow.toNumber());
  await settle();
  if (await S(() => !!__ashfall.getState().state.descent.run)) await tap(page.getByRole('button', { name: /^Withdraw/ }).and(page.locator(':visible')), 'Withdraw');
  await page.waitForTimeout(400);
  step('climbed out', await S(() => !__ashfall.getState().state.descent.run));
  step('the haul paid', await S(() => __ashfall.getState().state.marrow.toNumber()) > marrow0);
  await tap(page.getByRole('button', { name: 'Back to the road' }), 'Back to the road');
  // 8. the forge
  await go('Arsenal', 'Weapons');
  if (await tap(page.getByRole('button', { name: /^Reforge$/ }), 'Reforge')) {
    step('the reforge sheet opened', await page.getByRole('dialog').first().isVisible().catch(() => false));
    const roll = page.getByRole('dialog').getByRole('button', { name: /^Reforge the/ });
    if (await roll.count() && await roll.first().isEnabled()) { await tap(roll, 'roll the affixes'); step('affixes rolled', await S(() => { const s = __ashfall.getState().state; return Object.values(s.player.weapons).some((w) => (w.affixes?.length ?? 0) > 0); })); }
    await tap(page.getByRole('button', { name: 'Close' }), 'Close the sheet');
  }
  // 9. a creed sworn
  await go('Creeds');
  await tap(page.getByRole('button', { name: /^Swear/ }).and(page.locator(':not([disabled])')), 'Swear to a creed');
  step('sworn', await S(() => !!__ashfall.getState().state.creed.current));
  // 10. settings
  await go('Lantern', 'Settings');
  const battery = page.getByRole('radio', { name: /battery/i });
  if (await battery.count()) { await tap(battery, 'Quality: battery'); step('battery tier applied', await S(() => document.documentElement.classList.contains('tier-battery'))); }
  const plain = page.getByRole('switch', { name: /plain/i });
  if (await plain.count()) { await tap(plain, 'Plain type'); step('plain type applied', await S(() => document.documentElement.classList.contains('plain-type'))); }
  // 11. snuff the flame and sit through the cinema
  await patch((s, D) => { s.stats.cycleMarrow = new D(2e6); s.stats.cycleBosses = Math.max(1, s.stats.cycleBosses); });
  await go('Lantern', 'Snuff');
  await tap(page.getByRole('button', { name: /^Snuff…$/ }), 'Snuff…');
  await tap(page.getByRole('button', { name: 'Snuff the flame' }), 'Snuff the flame');
  await page.waitForTimeout(500);
  const wak = await S(() => __ashfall.getState().state.prestige.wakings);
  step('the flame was snuffed', wak === 1, `wakings ${wak}`);
  for (let i = 0; i < 120 && (await S(() => document.documentElement.classList.contains('cine'))); i++) await page.waitForTimeout(500);
  step('the cinema ended', !(await S(() => document.documentElement.classList.contains('cine'))));
  await go('Combat');
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 }).then(() => step('back in the arena', true)).catch(() => step('back in the arena', false));
  // 12. reload: the waking survives
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await go('Combat');
  const back = await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (!back) { await page.screenshot({ path: `art/devices/playthrough-${d.name}-reload.png` }); step('the arena came back after a reload', false, await S(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160))); }
  step('the save survived a reload', await S(() => __ashfall.getState().state.prestige.wakings) === 1);
  for (const e of errors) fail.push(`${d.name}: ${e}`);
  console.log(`${d.name}: ${steps.filter((s) => s.startsWith('ok')).length}/${steps.length} steps, ${errors.length} errors`);
  for (const s of steps) if (!s.startsWith('ok')) console.log('  ' + s);
  await ctx.close();
}
await browser.close();
if (fail.length) { console.log('\nPLAYTHROUGH FAIL'); [...new Set(fail)].forEach((f) => console.log(' -', f)); process.exit(1); }
console.log('\nplaythrough ok');
