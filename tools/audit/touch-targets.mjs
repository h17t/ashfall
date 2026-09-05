// Touch-target audit. Renders the built game at a phone viewport, walks every visible interactive
// element on every pillar (and every sub-tab), and fails on anything smaller than 48×48 CSS px or
// closer than 8px to another interactive element. Usage: node tools/audit/touch-targets.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:4173/';
const MIN = 48, GAP = 8;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
// a played-in state so that every control exists
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  s.marrow = new D(500000); s.player.hpMax = 1e6; s.player.hp = 1e6; // nothing may die during the walk: a cinematic would intercept the taps s.unlockedZones = ['tollroad', 'mire']; s.zones.tollroad && (s.zones.tollroad.cleared = 3, s.zones.tollroad.bossKills = 1);
  s.materials.wickStub = 1; s.materials.renderFat = 1; s.materials.reliquaryBone = 1; s.materials.pitchCoal = 1; s.flags.infusionUnlocked = true;
  s.player.weapons.weaverStaff = { id: 'weaverStaff', level: 0, infusion: 'none' }; s.spellsKnown = ['marrowDart']; s.player.recitationSlots = 1;
  s.cortege.recruited = ['aldric']; s.cortege.shades = [{ id: 'aldric', level: 2, xp: new D(0), assignment: 'beside', weapon: null, retreat: 0 }]; s.cortege.slots = 1;
  s.keepsakes = { coldPyreWarden: 1 }; s.prestige.bossesEverKilled = ['coldPyreWarden']; s.flags.descentUnlocked = true; s.descent.last = { floor: 4, banked: new D(100), died: false, boons: ['tallowEdge'] }; s.stats.cycleBosses = 1; s.prestige.wakings = 6; s.prestige.severings = 1;
  g.replace(s);
});
await page.waitForTimeout(300);
const problems = [];
const SEL = 'button, a[href], [role="button"], [role="tab"], input, select, textarea';
async function audit(where) {
  const boxes = await page.evaluate((SEL) => {
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.closest('[role="status"]')) continue; // transient hint cards float over content by design
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.disabled) continue;
      let r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue; // off-screen rows are audited when scrolled (below)
      // rows clipped by their scroll container are not on screen; only the visible part counts
      const sc = el.closest('.section-scroll, .sheet-scroll');
      const full = { w: r.width, h: r.height };
      let scope = 'page';
      if (sc) { const c = sc.getBoundingClientRect(); const top = Math.max(r.top, c.top), bottom = Math.min(r.bottom, c.bottom); if (bottom - top < r.height * 0.9) continue; r = { left: r.left, top, width: r.width, height: bottom - top, bottom, right: r.right }; scope = sc.className; }
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
      out.push({ x: r.left, y: r.top, w: r.width, h: r.height, fw: full.w, fh: full.h, scope, label, tag: el.tagName.toLowerCase() });
    }
    return out;
  }, SEL);
  for (const b of boxes) if (b.fw < MIN - 0.5 || b.fh < MIN - 0.5) problems.push(`${where}: "${b.label}" is ${Math.round(b.fw)}×${Math.round(b.fh)}`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.scope !== b.scope) continue; // a row inside a scroll container and the fixed nav never touch
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    const overlap = dx === 0 && dy === 0;
    if (!overlap && Math.max(dx, dy) < GAP && (dx > 0 || dy > 0)) problems.push(`${where}: "${a.label}" and "${b.label}" are ${Math.round(Math.max(dx, dy))}px apart`);
  }
  return boxes.length;
}
let total = 0;
const pillars = ['Combat', 'Cortege', 'Arsenal', 'Creeds', 'Lantern'];
for (const p of pillars) {
  await page.getByRole('button', { name: new RegExp('^' + p + '$') }).first().click();
  await page.waitForTimeout(250);
  const tabs = await page.locator('[role="tab"]').allTextContents();
  const targets = tabs.length ? tabs : [''];
  for (const t of targets) {
    if (t) { await page.getByRole('tab', { name: t.trim() }).first().click(); await page.waitForTimeout(200); }
    const where = t ? `${p}/${t.trim()}` : p;
    // audit at the top and after scrolling the section to its end
    total += await audit(where);
    const scrolled = await page.evaluate(() => { const el = document.querySelector('.section-scroll'); if (!el) return false; el.scrollTop = el.scrollHeight; return el.scrollTop > 0; });
    if (scrolled) { await page.waitForTimeout(120); total += await audit(where + ' (scrolled)'); }
  }
}
// the Stair: the strip in Combat and the boon offer, which is a sheet that cannot be dismissed
await page.getByRole('button', { name: /^Combat$/ }).first().click();
await page.evaluate(() => { const g = __ashfall.getState(); g.dispatch({ type: 'descend' }); const s = g.state; const D = s.marrow.constructor; s.descent.run.offer = ['glassMarrow', 'leechWick', 'marrowGreed']; s.descent.run.haul = new D(1000); g.replace(s); });
await page.waitForTimeout(400);
total += await audit('Combat/stair strip + boon sheet');
await page.getByRole('radio', { name: /Glass Marrow/ }).click();
await page.getByRole('button', { name: /^Take/ }).click();
await page.waitForTimeout(300);
total += await audit('Combat/stair strip');
await page.getByRole('button', { name: /^Withdraw$/ }).click();
await page.waitForTimeout(400);
total += await audit('Combat/climbed out sheet');
const uniq = [...new Set(problems)];
for (const p of uniq) console.log(p);
console.log(`touch targets: ${total} checked, ${uniq.length} problem${uniq.length === 1 ? '' : 's'}`);
await browser.close();
process.exit(uniq.length ? 1 : 0);
