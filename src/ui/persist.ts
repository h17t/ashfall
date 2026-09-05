/**
 * localStorage persistence: autosave every 10s, on visibility change and unload.
 * Rolling backup slot; a bad main save falls back to the backup; a bad backup is kept
 * under a separate key so nothing is ever silently destroyed.
 */
import { serialize, parseSave, applyOffline, newGame, SaveError, type GameState } from '@/engine';
import { useGame } from './store';

export const KEYS = { main: 'mournwake.save', backup: 'mournwake.backup', corrupt: 'mournwake.corrupt' } as const;
/** the keys the game wrote before the rename; read once and carried over */
const LEGACY_KEYS = { main: 'ashfall.save', backup: 'ashfall.backup' } as const; // banned-terms: allow
export function adoptLegacyKeys(): void {
  try {
    for (const k of ['main', 'backup'] as const) {
      if (localStorage.getItem(KEYS[k]) === null) { const old = localStorage.getItem(LEGACY_KEYS[k]); if (old !== null) localStorage.setItem(KEYS[k], old); }
    }
  } catch { /* storage unavailable */ }
}
const AUTOSAVE_MS = 10_000;

export interface LoadReport {
  source: 'main' | 'backup' | 'new';
  error: string | null;
  offlineSeconds: number;
}

export function loadFromStorage(now = Date.now()): LoadReport {
  let error: string | null = null;
  adoptLegacyKeys();
  for (const source of ['main', 'backup'] as const) {
    const raw = safeGet(KEYS[source]);
    if (!raw) continue;
    try {
      const state = parseSave(raw);
      const gap = state.savedAt > 0 ? (now - state.savedAt) / 1000 : 0;
      applyOffline(state, gap);
      useGame.getState().replace(state);
      return { source, error, offlineSeconds: gap };
    } catch (e) {
      const msg = e instanceof SaveError ? e.message : String(e);
      error = `${source} save could not be loaded: ${msg}`;
      if (source === 'main') safeSet(KEYS.corrupt, raw);
    }
  }
  useGame.getState().replace(newGame(Math.floor(Math.random() * 2 ** 31)));
  return { source: 'new', error, offlineSeconds: 0 };
}

export function saveToStorage(now = Date.now()): boolean {
  const state = useGame.getState().state;
  try {
    const json = serialize(state, now);
    const prev = safeGet(KEYS.main);
    if (prev) safeSet(KEYS.backup, prev);
    safeSet(KEYS.main, json);
    return true;
  } catch {
    return false;
  }
}

export function hardDelete() {
  for (const k of Object.values(KEYS)) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  useGame.getState().replace(newGame(Math.floor(Math.random() * 2 ** 31)));
}

export function replaceState(state: GameState) {
  useGame.getState().replace(state);
  saveToStorage();
}

export function startAutosave(): () => void {
  const id = window.setInterval(() => saveToStorage(), AUTOSAVE_MS);
  const onVis = () => { if (document.visibilityState === 'hidden') saveToStorage(); };
  const onUnload = () => saveToStorage();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('beforeunload', onUnload);
  window.addEventListener('pagehide', onUnload);
  return () => {
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('beforeunload', onUnload);
    window.removeEventListener('pagehide', onUnload);
  };
}

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* quota or private mode */ } }
