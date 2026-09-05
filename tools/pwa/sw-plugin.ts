/**
 * Vite plugin: emits sw.js at build with a precache list of the app shell (html, js, css, the
 * latin font faces) plus the first region and the first tier's foes, so the game opens and plays
 * offline from the first launch. Everything else under /art is cached on first use.
 */
import type { Plugin } from 'vite';

export function serviceWorker(opts: { firstArt: string[] }): Plugin {
  let base = './';
  return {
    name: 'mournwake-sw',
    apply: 'build',
    configResolved(c) { base = c.base; },
    generateBundle(_o, bundle) {
      const shell = Object.keys(bundle).filter((f) => /\.(js|css|html)$/.test(f) || (/latin-400-normal\.woff2$/.test(f) || /latin-(500|600)-normal\.woff2$/.test(f) || /latin-400-italic\.woff2$/.test(f)));
      const precache = ['./', ...shell.map((f) => './' + f), './manifest.webmanifest', ...opts.firstArt.map((p) => '.' + p)];
      const version = String(Date.now());
      const code = `/* Mournwake service worker (generated at build) */
const VERSION = 'mw-${version}';
const SHELL = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => c.addAll(SHELL.filter((u) => !u.startsWith('./art/'))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // the page itself: network first so an update lands, cache when offline
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('./', copy)); return r; }).catch(() => caches.match('./'))); return; }
  // art and hashed assets: cache first, fill on first use
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok && (url.pathname.includes('/art/') || url.pathname.includes('/assets/') || url.pathname.includes('/pwa/'))) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return r; })));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
    },
  };
}
