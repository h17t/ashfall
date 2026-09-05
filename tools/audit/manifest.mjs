// PWA completeness: the manifest, its icons on disk, the Apple tags in index.html, the service worker.
// Usage: node tools/audit/manifest.mjs   (after `vite build`)
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
const fail = [];
const m = JSON.parse(readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
for (const k of ['name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color', 'icons']) if (!(k in m)) fail.push(`manifest lacks ${k}`);
if (m.display !== 'standalone') fail.push(`display is ${m.display}, not standalone`);
if (!m.orientation) fail.push('manifest lacks orientation');
const sizes = new Set((m.icons ?? []).map((i) => i.sizes));
for (const s of ['192x192', '512x512']) if (!sizes.has(s)) fail.push(`no ${s} icon`);
if (!(m.icons ?? []).some((i) => /maskable/.test(i.purpose ?? ''))) fail.push('no maskable icon');
for (const i of m.icons ?? []) { const f = path.join(dist, i.src.replace(/^\.\//, '')); if (!existsSync(f)) fail.push(`icon missing: ${i.src}`); }
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const tag of ['apple-mobile-web-app-capable', 'apple-touch-icon', 'apple-touch-startup-image', 'theme-color', 'viewport-fit=cover', 'rel="manifest"']) if (!html.includes(tag)) fail.push(`index.html lacks ${tag}`);
for (const m2 of html.matchAll(/href="\.?\/?(pwa\/[^"]+)"/g)) if (!existsSync(path.join(dist, m2[1]))) fail.push(`linked file missing: ${m2[1]}`);
if (!existsSync(path.join(dist, 'sw.js'))) fail.push('no service worker emitted');
else { const sw = readFileSync(path.join(dist, 'sw.js'), 'utf8'); if (!/addEventListener\('fetch'/.test(sw) || !/addEventListener\('install'/.test(sw)) fail.push('service worker lacks install/fetch handlers'); }
if (fail.length) { console.log('MANIFEST FAIL'); fail.forEach((f) => console.log(' -', f)); process.exit(1); }
console.log(`manifest ok: ${m.icons.length} icons, ${m.display}, ${m.orientation}`);
