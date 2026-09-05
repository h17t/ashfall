// Accessibility: every control has a name, every image an alt, every dialog a label, focus is
// visible, and the text on screen clears the contrast floor against the surface it sits on.
// Walks every pillar and sub-tab at 390×844. Usage: node tools/audit/a11y.mjs [url]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:4173/';
const css = readFileSync('src/ui/index.css', 'utf8');
const problems = [];
if (!/:focus-visible\s*\{[^}]*outline/.test(css)) problems.push('no :focus-visible outline rule in index.css');
if (!/prefers-reduced-motion/.test(css)) problems.push('no prefers-reduced-motion rule in index.css');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('pageerror', (e) => problems.push('page error: ' + e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  s.marrow = new D(500000); s.player.hpMax = 1e6; s.player.hp = 1e6; s.unlockedZones = ['tollroad', 'mire']; s.zones.tollroad && (s.zones.tollroad.cleared = 3, s.zones.tollroad.bossKills = 1);
  s.stats.bossKills = 1; s.prestige.bossesEverKilled = ['coldPyreWarden']; s.flags.descentUnlocked = true; s.flags.forgeUnlocked = true; s.flags.afflictionsUnlocked = true; s.flags.holdfastsUnlocked = true; s.flags.ordersUnlocked = true; s.flags.autoAttack = true; s.flags.warUnlocked = true;
  s.cortege.recruited = ['aldric']; s.cortege.shades = [{ id: 'aldric', level: 2, xp: new D(0), assignment: 'beside', weapon: null, retreat: 0, hpFrac: 1, actIn: 1 }]; s.cortege.slots = 1; s.creed.current = 'wick';
  s.player.weapons.revenantSword.affixes = [{ id: 'brutal', tier: 2 }]; s.player.weapons.revenantSword.mastery = 60;
  g.replace(s);
});
await page.waitForTimeout(300);
function lum(rgb) { const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
let checked = 0, measured = 0;
async function audit(where) {
  const r = await page.evaluate(() => {
    const out = { names: [], imgs: [], dialogs: [], text: [] };
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
    const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
    for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="radio"]')) {
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
      const name = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || (el.tagName === 'INPUT' && el.getAttribute('placeholder')) || el.getAttribute('title') || '').trim();
      if (!name) out.names.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
    }
    for (const img of document.querySelectorAll('img')) if (visible(img) && !img.hasAttribute('alt') && !img.closest('[aria-hidden="true"]')) out.imgs.push(img.getAttribute('src') ?? 'img');
    for (const d of document.querySelectorAll('[role="dialog"]')) if (!d.getAttribute('aria-label') && !d.getAttribute('aria-labelledby')) out.dialogs.push('dialog without a label');
    // text contrast: leaf text nodes against the nearest painted ancestor background; image backgrounds are skipped
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim(); if (t.length < 2) continue;
      const el = n.parentElement; if (!el || !visible(el) || el.closest('[aria-hidden="true"], svg, .arena-stage, .away-scene')) continue;
      const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg || fg.a < 0.5) continue;
      let bg = null, e = el, image = false;
      while (e && e !== document.documentElement) { const c = getComputedStyle(e); if (c.backgroundImage && c.backgroundImage !== 'none') { image = true; break; } const b = parse(c.backgroundColor); if (b && b.a >= 0.9) { bg = b; break; } e = e.parentElement; }
      if (image || !bg) continue;
      const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 600;
      out.text.push({ t: t.slice(0, 40), fg: fg.rgb, bg: bg.rgb, large: size >= 24 || (size >= 18.66 && bold) });
    }
    return out;
  });
  for (const n of r.names) problems.push(`${where}: control without a name: ${n}`);
  for (const i of r.imgs) problems.push(`${where}: image without alt: ${i}`);
  for (const d of r.dialogs) problems.push(`${where}: ${d}`);
  for (const t of r.text) { measured++; const c = contrast(t.fg, t.bg); if (c < (t.large ? 3 : 4.5)) problems.push(`${where}: "${t.t}" contrast ${c.toFixed(2)} on rgb(${t.bg.join(',')})`); }
  checked += r.text.length;
}
for (const p of ['Combat', 'Cortege', 'Arsenal', 'Creeds', 'Lantern']) {
  await page.getByRole('button', { name: new RegExp('^' + p + '$') }).first().click();
  await page.waitForTimeout(250);
  const tabs = await page.locator('[role="tab"]').allTextContents();
  for (const t of tabs.length ? tabs : ['']) {
    if (t) { await page.getByRole('tab', { name: t.trim() }).first().click(); await page.waitForTimeout(200); }
    await audit(t ? `${p}/${t.trim()}` : p);
  }
}
const uniq = [...new Set(problems)];
for (const p of uniq) console.log(p);
console.log(`a11y: ${measured} text runs measured, ${uniq.length} problem${uniq.length === 1 ? '' : 's'}`);
await browser.close();
process.exit(uniq.length ? 1 : 0);
