// The monkey: a seeded run of random taps on every visible control on a phone, time passing
// through the engine between taps, sheets answered when they block. Fails on a page or console
// error, on a number that came out wrong on screen (NaN, undefined, Infinity, [object), and on the
// game refusing to render the arena at the end. Usage: node tools/audit/monkey.mjs [url] [taps] [seed]
import { chromium, executablePath } from './browser.mjs';
const url = process.argv[2] ?? 'http://localhost:4173/';
const TAPS = Number(process.argv[3] ?? 500);
let seed = Number(process.argv[4] ?? 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const BAD_TEXT = /\bNaN\b|\bundefined\b|\bInfinity\b|∞|\[object /;
const browser = await chromium.launch({ executablePath });
const fail = [];
for (const d of [{ name: 'upright', w: 390, h: 844 }, { name: 'sideways', w: 844, h: 390 }]) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 300) window.__lt.push(`${Math.round(e.startTime / 1000)}s ${Math.round(e.duration)}ms`); }).observe({ entryTypes: ['longtask'] }); } catch { /* not every browser */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Begin' }).click({ timeout: 4000 }).catch(() => {});
  // a mid-game save: everything unlocked, enough marrow to buy, two shades, a lord down
  await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; s.marrow = new D(5e6); s.player.level = 25; s.stats.bossKills = 1; s.stats.cycleBosses = 1; s.stats.cycleMarrow = new D(1e6); s.materials.reliquaryBone = 2; s.materials.pitchCoal = 3; s.prestige.wakings = 1; g.replace(s); g.stepBy(1); for (const id of ['aldric', 'ilse']) g.dispatch({ type: 'recruit', shade: id }); });
  const tapped = new Map();
  const slow = [];
  let refused = 0;
  const t0 = Date.now();
  for (let i = 0; i < TAPS; i++) {
    // a fuzz, not a clock: a slow runner stops early and says so, it does not fail
    if (Date.now() - t0 > 240000) { console.log(`  ${d.name}: stopped at tap ${i} after four minutes`); break; }
    const tapAt = Date.now();
    if (i % 50 === 0 && i) console.log(`  ${d.name}: ${i} taps, ${Math.round((Date.now() - t0) / 1000)}s`);
    // the cinema and the boon sheet hold the game; let them pass
    for (let k = 0; k < 40 && (await page.evaluate(() => document.documentElement.classList.contains('cine'))); k++) { if (k === 4) await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    const pick = await page.evaluate(([r, nav]) => {
      const dialog = document.querySelector('[role="dialog"]');
      const root = dialog ?? document;
      // every sixth tap goes to the navigation so the monkey wanders instead of nesting in one panel
      const els = Array.from(root.querySelectorAll(nav && !dialog ? '.nav-btn, [role="tab"]' : 'button, [role="tab"], [role="radio"], [role="switch"], select')).filter((el) => {
        if (el.disabled || el.closest('[aria-hidden="true"]')) return false;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
        const b = el.getBoundingClientRect(); if (b.width === 0 || b.height === 0) return false;
        const t = (el.getAttribute('aria-label') || el.textContent || '').trim();
        // never wipe the save or leave the page from inside the monkey
        return !/^(Start over|Wipe|Delete|Reset)/i.test(t);
      });
      if (!els.length) return null;
      const el = els[Math.floor(r * els.length)];
      el.setAttribute('data-monkey', '1');
      return (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30) + (dialog ? ` [in ${dialog.getAttribute('aria-label')}]` : '');
    }, [rnd(), i % 6 === 0]);
    if (pick === null) { refused++; await page.keyboard.press('Escape'); continue; }
    const el = page.locator('[data-monkey="1"]').first();
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
    const ok = await el.click({ timeout: 800, force: true, noWaitAfter: true }).then(() => true).catch(() => false);
    await page.evaluate(() => document.querySelectorAll('[data-monkey]').forEach((e) => e.removeAttribute('data-monkey'))).catch(() => {});
    if (!ok) refused++;
    tapped.set(pick, (tapped.get(pick) ?? 0) + 1);
    const took = Date.now() - tapAt;
    if (took > 1500) slow.push(`${pick} ${took}ms ` + await page.evaluate(() => { const s = __ashfall.getState().state; return `[t=${Math.round(performance.now() / 1000)}s html: ${document.documentElement.className.trim() || '-'}; dialog: ${document.querySelector('[role="dialog"]')?.getAttribute('aria-label') ?? '-'}; hp ${Math.round(s.player.hp)}; deathScreen ${s.deathScreen}; enemy ${s.encounter.enemy?.id ?? '-'}]`; }));
    if (rnd() < 0.3) await page.evaluate(() => { const g = __ashfall.getState(); for (let t = 0; t < 10; t += 0.5) g.stepBy(0.5); });
    if (i % 25 === 0) {
      const bad = await page.evaluate((re) => { const m = document.body.innerText.match(new RegExp(re)); return m ? document.body.innerText.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ') : null; }, BAD_TEXT.source);
      if (bad) fail.push(`${d.name} tap ${i}: bad text on screen: …${bad}…`);
    }
  }
  await page.keyboard.press('Escape');
  const state = await page.evaluate(() => { const s = __ashfall.getState().state; const bad = []; const walk = (v, path) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path); else if (v && typeof v === 'object' && typeof v.toNumber === 'function') { if (!Number.isFinite(v.toNumber()) && v.toNumber() !== Infinity) bad.push(path); } else if (v && typeof v === 'object' && bad.length < 10) for (const k of Object.keys(v)) walk(v[k], path + '.' + k); }; walk(s, 's'); return { bad, level: s.player.level, marrow: s.marrow.toString(), kills: s.stats.kills.toString() }; });
  for (const b of state.bad) fail.push(`${d.name}: the save carries a broken number at ${b}`);
  for (const e of errors) fail.push(`${d.name}: ${e}`);
  if (slow.length) console.log('  slow taps: ' + slow.slice(0, 8).join(', '));
  const lt = await page.evaluate(() => window.__lt ?? []);
  if (lt.length) console.log(`  long tasks over 300ms: ${lt.slice(0, 12).join(', ')}`);
  for (const x of lt) { const ms = Number(x.split(' ')[1]); if (ms > 2000) fail.push(`${d.name}: the page froze for ${ms}ms at ${x.split(' ')[0]}`); }
  console.log('  most tapped: ' + [...tapped].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ×${v}`).join(', '));
  console.log(`${d.name}: ${TAPS} taps on ${tapped.size} distinct controls, ${refused} refused, ${errors.length} errors, level ${state.level}, marrow ${state.marrow}, kills ${state.kills}`);
  await ctx.close();
}
await browser.close();
if (fail.length) { console.log('\nMONKEY FAIL'); [...new Set(fail)].forEach((f) => console.log(' -', f)); process.exit(1); }
console.log('\nmonkey ok');
