// The deployed shape: dist served under a sub-path the way GitHub Pages serves it (the repository's name), with
// the service worker allowed. Walks every pillar and sub-tab, the map and the Stair, and fails on any
// request that 404s, any <img> that never decoded, any page error, and a service worker that did
// not install. Usage: node tools/audit/deploy.mjs [subpath]   (after `vite build`)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium, executablePath } from './browser.mjs';
const sub = process.argv[2] ?? '/mournwake/';
const dist = path.resolve('dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (!u.pathname.startsWith(sub)) { res.writeHead(404); res.end('outside the site'); return; }
  let p = path.join(dist, u.pathname.slice(sub.length));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}${sub}`;
const browser = await chromium.launch({ executablePath });
const fail = [];
for (const d of [{ name: 'phone', w: 390, h: 844, mobile: true }, { name: 'desktop', w: 1440, h: 900, mobile: false }]) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: d.mobile, hasTouch: d.mobile });
  const page = await ctx.newPage();
  const bad = new Set(); const errors = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.add(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('requestfailed', (r) => bad.add(`failed ${new URL(r.url()).pathname} ${r.failure()?.errorText ?? ''}`));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Begin' }).click({ timeout: 4000 }).catch(() => {});
  // unlock everything so every panel has something to draw
  await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor; s.marrow = new D(1e6); s.player.level = 40; s.stats.deepestTier = Math.max(s.stats.deepestTier ?? 0, 3); s.flags.descentUnlocked = true; s.flags.ordersUnlocked = true; s.prestige.wakings = Math.max(s.prestige.wakings, 3); g.replace(s); });
  await page.waitForTimeout(300);
  const seen = [];
  const walk = async (label) => {
    await page.waitForTimeout(350);
    await page.waitForLoadState('networkidle').catch(() => {});
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.src && i.complete && i.naturalWidth === 0 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')));
    for (const b of broken) fail.push(`${d.name} ${label}: image did not decode: ${b}`);
    seen.push(label);
  };
  await walk('combat');
  const pillars = await page.getByRole('button', { name: /^(Combat|Cortege|Arsenal|Creeds|Lantern)$/ }).all();
  const names = [];
  for (const p of pillars) names.push((await p.textContent())?.trim() ?? '');
  for (const name of [...new Set(names)].filter(Boolean)) {
    const b = page.getByRole('button', { name: new RegExp(`^${name}$`) }).first();
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.click().catch(() => {});
    await walk(name);
    const tabs = await page.getByRole('tab').all();
    for (const t of tabs) {
      const tn = (await t.textContent())?.trim() ?? '';
      if (!(await t.isVisible().catch(() => false))) { fail.push(`${d.name} ${name}: tab "${tn}" is not visible`); continue; }
      await t.click().catch((e) => fail.push(`${d.name} ${name}: tab "${tn}" could not be clicked: ${e.message.split('\n')[0]}`));
      await walk(`${name}/${tn}`);
    }
  }
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker?.getRegistration(); return r ? (r.active ? 'active' : r.installing ? 'installing' : r.waiting ? 'waiting' : 'none') : 'unregistered'; });
  if (sw === 'unregistered') fail.push(`${d.name}: the service worker did not register under ${sub}`);
  for (const b of bad) fail.push(`${d.name}: ${b}`);
  for (const e of errors) fail.push(`${d.name}: ${e}`);
  console.log(seen.join(', '));
  console.log(`${d.name.padEnd(8)} ${seen.length} screens, ${bad.size} bad requests, ${errors.length} errors, service worker ${sw}`);
  await ctx.close();
}
await browser.close();
server.close();
if (fail.length) { console.log('\nDEPLOY FAIL'); [...new Set(fail)].forEach((f) => console.log(' -', f)); process.exit(1); }
console.log(`\ndeploy ok under ${sub}`);
