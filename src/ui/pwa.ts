/**
 * Installation. The service worker is registered in production; the browser's install prompt is
 * caught and kept until a good moment (the first lord falls), then offered once from a sheet.
 * On iOS Safari there is no prompt: the sheet explains Share → Add to Home Screen instead.
 */
import { subscribeEvents, useGame } from './store';

type Deferred = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Deferred | null = null;
const KEY = 'mournwake.installAsked';
const listeners = new Set<(offer: InstallOffer | null) => void>();
export interface InstallOffer { kind: 'prompt' | 'ios'; accept: () => Promise<void>; dismiss: () => void }
let current: InstallOffer | null = null;

export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
export const isIOS = () => typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent) && !(window as any).MSStream;

function emit(o: InstallOffer | null) { current = o; listeners.forEach((l) => l(o)); }
export function onInstallOffer(l: (o: InstallOffer | null) => void): () => void { listeners.add(l); l(current); return () => { listeners.delete(l); }; }

function asked(): boolean { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
function markAsked() { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } }

function offer() {
  if (isStandalone() || asked()) return;
  if (deferred) {
    const d = deferred;
    emit({ kind: 'prompt', accept: async () => { markAsked(); emit(null); await d.prompt(); await d.userChoice; deferred = null; }, dismiss: () => { markAsked(); emit(null); } });
  } else if (isIOS()) {
    emit({ kind: 'ios', accept: async () => { markAsked(); emit(null); }, dismiss: () => { markAsked(); emit(null); } });
  }
}

export function startPwa(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline play is a nicety, never a blocker */ });
  }
  const onPrompt = (e: Event) => { e.preventDefault(); deferred = e as unknown as Deferred; };
  window.addEventListener('beforeinstallprompt', onPrompt);
  // the good moment: the first lord falls
  const unsub = subscribeEvents((events) => {
    if (events.some((e) => e.type === 'bossKilled') && useGame.getState().state.stats.bossKills >= 1) window.setTimeout(offer, 6000);
  });
  return () => { window.removeEventListener('beforeinstallprompt', onPrompt); unsub(); };
}
