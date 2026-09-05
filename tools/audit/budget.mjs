// Payload budget. Three numbers the build must hold, or CI fails:
//   1. the shell (every script and stylesheet index.html loads) is at most BUDGET_GZ_KB gzipped;
//   2. the service worker's precache list is at most BUDGET_PRECACHE_KB on disk;
//   3. the game is playable within BUDGET_TTI_MS on a mid-range phone over 4G, measured as: a cold
//      load through Chromium with the network throttled to 1.6 Mbps / 150 ms RTT and the CPU
//      slowed 4x, until the arena is on screen AND a tap on Strike takes hit points off the enemy.
// Usage: node tools/audit/budget.mjs [url]   (run after `vite build`, against `vite preview`)
import { createRequire } from 'node:module';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

import { createServer } from 'node:http';
import { createGzip } from 'node:zlib';
import { createReadStream } from 'node:fs';
// Served from dist by this script with gzip on, the way any host or CDN serves it; `vite preview`
// sends raw bytes, which on a throttled link is a test of nothing real. Pass a url to skip this.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
async function serveDist() {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(path.resolve('dist'), p === '/' ? 'index.html' : p);
    if (!existsSync(f) || statSync(f).isDirectory()) f = path.join(path.resolve('dist'), 'index.html');
    const ext = path.extname(f);
    const type = MIME[ext] ?? 'application/octet-stream';
    res.setHeader('content-type', type);
    const text = /^(text\/|application\/(json|manifest|javascript))/.test(type) || ext === '.svg';
    if (text && /gzip/.test(req.headers['accept-encoding'] ?? '')) { res.setHeader('content-encoding', 'gzip'); createReadStream(f).pipe(createGzip({ level: 6 })).pipe(res); }
    else createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
const own = process.argv[2] ? null : await serveDist();
const url = process.argv[2] ?? own.url;
const BUDGET_GZ_KB = 240, BUDGET_PRECACHE_KB = 2600, BUDGET_TTI_MS = 3000;
const dist = path.resolve('dist');
const fail = [];

// 1. shell payload
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
let gz = 0;
const rows = [];
for (const r of new Set(refs)) {
  const buf = readFileSync(path.join(dist, r));
  const g = gzipSync(buf, { level: 9 }).length;
  gz += g; rows.push([r, (buf.length / 1024).toFixed(1), (g / 1024).toFixed(1)]);
}
console.log('shell payload (raw KB, gz KB):'); rows.forEach((r) => console.log('  ', ...r));
console.log(`  total gz ${(gz / 1024).toFixed(1)} KB, budget ${BUDGET_GZ_KB} KB`);
if (gz / 1024 > BUDGET_GZ_KB) fail.push(`shell ${(gz / 1024).toFixed(1)} KB gz over the ${BUDGET_GZ_KB} KB budget`);

// 2. precache
const sw = readFileSync(path.join(dist, 'sw.js'), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1]);
let pre = 0;
for (const u of shell) {
  const f = path.join(dist, u === './' ? 'index.html' : u.replace(/^\.\//, ''));
  if (!existsSync(f)) { fail.push(`precache lists a file the build did not emit: ${u}`); continue; }
  pre += statSync(f).size;
}
console.log(`precache: ${shell.length} files, ${(pre / 1024).toFixed(0)} KB, budget ${BUDGET_PRECACHE_KB} KB`);
if (pre / 1024 > BUDGET_PRECACHE_KB) fail.push(`precache ${(pre / 1024).toFixed(0)} KB over the ${BUDGET_PRECACHE_KB} KB budget`);
const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
for (const i of manifest.icons) { const f = path.join(dist, i.src.replace(/^\.\//, '')); if (!existsSync(f)) fail.push(`manifest icon missing from the build: ${i.src}`); }

// 3. time to playable on a throttled phone: the better of two cold loads, so a busy CI runner's
//    hiccup does not fail a build the phone would have passed
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let tArena = Infinity, tPlay = Infinity;
for (let attempt = 0; attempt < 2; attempt++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'commit' });
  await page.locator('.arena-stage').waitFor({ state: 'visible', timeout: 20000 });
  tArena = Math.min(tArena, Date.now() - t0);
  // playable: a tap takes hit points off the enemy
  let landed = -1;
  for (let i = 0; i < 80; i++) {
    const hp = await page.evaluate(() => globalThis.__ashfall ? __ashfall.getState().state.encounter.enemy?.hp.toNumber() ?? null : null);
    if (hp !== null) {
      await page.locator('.act-strike').dispatchEvent('pointerdown');
      const after = await page.evaluate(() => __ashfall.getState().state.encounter.enemy?.hp.toNumber() ?? -1);
      if (after >= 0 && after < hp) { landed = Date.now() - t0; break; }
    }
    await page.waitForTimeout(100);
  }
  if (landed >= 0) tPlay = Math.min(tPlay, landed);
  await ctx.close();
  if (tPlay <= BUDGET_TTI_MS) break;
}
console.log(`time to arena ${tArena} ms, time to first landed strike ${tPlay === Infinity ? 'never' : tPlay + ' ms'} (slow 4G, 4x CPU, best of two), budget ${BUDGET_TTI_MS} ms`);
if (tPlay === Infinity) fail.push('no strike landed within 8 s of the arena appearing');
else if (tPlay > BUDGET_TTI_MS) fail.push(`playable at ${tPlay} ms, over the ${BUDGET_TTI_MS} ms budget`);
await browser.close();
own?.server.close();

if (fail.length) { console.log('\nBUDGET FAIL'); fail.forEach((f) => console.log(' -', f)); process.exit(1); }
console.log('\nbudget ok');
