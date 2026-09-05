// Reachability: on a grid of viewports (phones upright and sideways, tablets both ways, laptop widths)
// every control on every pillar and sub-tab must be reachable with a finger: inside the viewport once
// its own scroll container is scrolled to it, and not covered by anything else (the fixed navigation,
// a strip, a card). Usage: node tools/audit/reach.mjs [url]
import { chromium, executablePath } from './browser.mjs';
const url = process.argv[2] ?? 'http://localhost:4173/';
const VIEWPORTS = [
  [360, 640], [360, 780], [375, 667], [390, 844], [412, 915], [430, 932],
  [640, 360], [667, 375], [740, 360], [844, 390], [915, 412],
  [768, 1024], [820, 1180], [1024, 768], [1180, 820],
  [900, 600], [1000, 700], [1100, 700], [1280, 800], [1440, 900],
];
const SHEETS = [[360, 640], [390, 844], [844, 390], [1280, 800]];
const SEL = 'button, [role="tab"], a[href], select, input, textarea, [role="button"], [role="radio"]';
const browser = await chromium.launch({ executablePath });
const fail = [];
let total = 0;
for (const [w, h] of VIEWPORTS) {
  const mobile = w < 900 || h < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; s.marrow = new D(1e6); s.player.level = 40; s.stats.deepestTier = Math.max(s.stats.deepestTier ?? 0, 3); s.flags.descentUnlocked = true; s.flags.ordersUnlocked = true; s.prestige.wakings = Math.max(s.prestige.wakings, 3); g.replace(s); });
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => document.querySelector('.shell')?.className.match(/shell-(portrait|landscape|wide)/)?.[1]);
  const tag = `${w}x${h} ${layout}`;
  let count = 0;
  const check = async (where) => {
    await page.waitForTimeout(200);
    const out = await page.evaluate((sel) => {
      const problems = [];
      const scroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p; } return null; };
      const els = Array.from(document.querySelectorAll(sel)).filter((el) => { if (el.closest('[aria-hidden="true"]') || el.disabled) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      let n = 0;
      for (const el of els) {
        n++;
        const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        const sc = scroller(el);
        if (sc) { const r0 = el.getBoundingClientRect(), c = sc.getBoundingClientRect(); sc.scrollTop += (r0.top + r0.height / 2) - (c.top + c.height / 2); }
        else if (document.documentElement.scrollHeight > innerHeight + 1) { const r0 = el.getBoundingClientRect(); window.scrollBy(0, (r0.top + r0.height / 2) - innerHeight / 2); }
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { problems.push(`"${label}" sits outside the screen at ${Math.round(cx)},${Math.round(cy)}`); continue; }
        const hit = document.elementFromPoint(cx, cy);
        if (!hit) { problems.push(`"${label}" has nothing under its centre`); continue; }
        if (!(el.contains(hit) || hit.contains(el))) {
          const who = hit.closest('button, [role], .bottom-nav, .sheet, .hint-card, .status-strip, .descent-strip, .raid-strip')?.className?.toString().split(' ').slice(0, 2).join(' ') || hit.tagName.toLowerCase();
          problems.push(`"${label}" is covered by ${who}`);
        }
      }
      return { n, problems };
    }, SEL);
    count += out.n;
    for (const p of out.problems) fail.push(`${tag} ${where}: ${p}`);
  };
  await check('combat');
  for (const name of ['Combat', 'Cortege', 'Arsenal', 'Creeds', 'Lantern']) {
    const b = page.getByRole('button', { name: new RegExp(`^${name}$`) }).first();
    if (!(await b.isVisible().catch(() => false))) { if (name !== 'Combat') fail.push(`${tag}: no ${name} in the navigation`); continue; }
    await b.click();
    await check(name);
    const tabs = await page.locator('[role="tab"]').allTextContents();
    for (const t of tabs.map((x) => x.trim()).filter(Boolean)) {
      const tab = page.getByRole('tab', { name: t }).first();
      if (!(await tab.isVisible().catch(() => false))) { fail.push(`${tag} ${name}: tab "${t}" is not visible`); continue; }
      await tab.click({ timeout: 3000 }).catch((e) => fail.push(`${tag} ${name}: tab "${t}" cannot be tapped: ${e.message.split('\n')[0]}`));
      await check(`${name}/${t}`);
    }
  }
  // the sheets: each opened by its own control, its controls audited inside the dialog
  if (SHEETS.some(([sw, sh]) => sw === w && sh === h)) {
    const sheet = async (name, open) => {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(150);
      const ok = await open().then(() => true).catch(() => false);
      await page.waitForTimeout(350);
      const dialog = page.getByRole('dialog').first();
      if (!ok || !(await dialog.isVisible().catch(() => false))) { fail.push(`${tag} sheet ${name}: did not open`); return; }
      const out = await page.evaluate((sel) => {
        const d = document.querySelector('[role="dialog"]');
        const sc = d.querySelector('.sheet-scroll');
        const problems = []; let n = 0;
        for (const el of Array.from(d.querySelectorAll(sel))) {
          const cs = getComputedStyle(el); if (el.disabled || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
          const r0 = el.getBoundingClientRect(); if (r0.width === 0 || r0.height === 0) continue;
          n++;
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
          if (sc && sc.contains(el) && sc.scrollHeight > sc.clientHeight + 1) { const c = sc.getBoundingClientRect(); sc.scrollTop += (r0.top + r0.height / 2) - (c.top + c.height / 2); }
          const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { problems.push(`"${label}" sits outside the screen at ${Math.round(cx)},${Math.round(cy)}`); continue; }
          const hit = document.elementFromPoint(cx, cy);
          if (!hit || !(el.contains(hit) || hit.contains(el))) problems.push(`"${label}" is covered by ${hit ? (hit.className?.toString().split(' ').slice(0, 2).join(' ') || hit.tagName.toLowerCase()) : 'nothing'}`);
        }
        return { n, problems };
      }, SEL);
      count += out.n;
      for (const p of out.problems) fail.push(`${tag} sheet ${name}: ${p}`);
    };
    await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; s.flags.forgeUnlocked = true; s.flags.dispatchUnlocked = true; s.stats.bossKills = Math.max(1, s.stats.bossKills); s.marrow = new D(1e7); s.materials.reliquaryBone = 2; g.replace(s); for (const id of ['aldric', 'ilse']) g.dispatch({ type: 'recruit', shade: id }); });
    await page.waitForTimeout(300);
    await sheet('details', async () => { await page.getByRole('button', { name: /^Lantern$/ }).first().click(); await page.getByRole('tab', { name: 'Rest' }).first().click(); await page.locator('.info-mark').first().click(); });
    await sheet('reallocate', async () => { await page.getByRole('button', { name: 'Reallocate' }).first().click(); });
    await sheet('reforge', async () => { await page.getByRole('button', { name: /^Arsenal$/ }).first().click(); await page.getByRole('tab', { name: 'Weapons' }).first().click(); await page.getByRole('button', { name: /^Reforge$/ }).first().click(); });
    await sheet('dispatch', async () => { await page.getByRole('button', { name: /^Cortege$/ }).first().click(); await page.getByRole('button', { name: /^Dispatch$/ }).first().click(); });
    await sheet('order chip', async () => { await page.getByRole('button', { name: /^Combat$|^Lantern$/ }).first().click(); await page.getByRole('tab', { name: 'Orders' }).first().click(); const chips = page.locator('.order-chip'); if (!(await chips.count())) await page.getByRole('button', { name: 'New order' }).first().click(); await page.locator('.order-chip').first().click(); });
    await sheet('boon offer', async () => { await page.evaluate(() => { const g = __ashfall.getState(); g.dispatch({ type: 'descend' }); const s = g.state; const D = s.marrow.constructor; if (s.descent.run) { s.descent.run.offer = ['glassMarrow', 'leechWick', 'marrowGreed']; s.descent.run.haul = new D(1000); } g.replace(s); }); });
    await sheet('haul', async () => { await page.getByRole('dialog').getByRole('button', { name: /^Withdraw/ }).first().click(); });
    await page.getByRole('button', { name: 'Back to the road' }).first().click().catch(() => {});
  }
  for (const e of errors) fail.push(`${tag}: page error: ${e}`);
  total += count;
  console.log(`${tag.padEnd(20)} ${count} controls`);
  await ctx.close();
}
await browser.close();
if (fail.length) { console.log(`\nREACH FAIL (${fail.length})`); [...new Set(fail)].forEach((f) => console.log(' -', f)); process.exit(1); }
console.log(`\nreach ok: ${total} controls across ${VIEWPORTS.length} viewports`);
