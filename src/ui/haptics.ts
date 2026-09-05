/**
 * Haptics are a feel system, not decoration. Patterns are short and distinct so the hand can tell
 * them apart without looking: a tick for a hit, a firmer pulse for a crit, a double-pulse when the
 * Reprisal window opens, a long buzz when you are unmade. Nothing on idle ticks. Fully toggleable;
 * silently does nothing where the Vibration API is missing (iOS Safari).
 */
import { useSettings } from './settings';
import { subscribeEvents } from './store';
import type { GameEvent } from '@/engine';

export const PATTERNS = {
  hit: [8],
  crit: [22],
  reprisalOpen: [30, 40, 30],
  reprisalHit: [40],
  hurt: [28],
  perfectDodge: [10, 30, 10],
  unmade: [220],
  bossFelled: [60, 50, 60, 50, 120],
  levelUp: [14],
  tap: [6],
} as const;

export type HapticKind = keyof typeof PATTERNS;

let lastAt = 0;
export function haptic(kind: HapticKind): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (!useSettings.getState().haptics) return false;
  const now = Date.now();
  // hits arrive many times a second; never queue more than one tick per 60ms
  if (kind === 'hit' && now - lastAt < 60) return false;
  lastAt = now;
  try { return navigator.vibrate([...PATTERNS[kind]]); } catch { return false; }
}

/** Wire game events to patterns. Returns an unsubscribe. */
export function startHaptics(): () => void {
  return subscribeEvents((events: GameEvent[]) => {
    let best: HapticKind | null = null;
    const rank: Record<HapticKind, number> = { tap: 0, hit: 1, levelUp: 2, crit: 3, perfectDodge: 3, hurt: 4, reprisalHit: 5, reprisalOpen: 6, bossFelled: 8, unmade: 9 };
    const consider = (k: HapticKind) => { if (!best || rank[k] > rank[best]) best = k; };
    for (const e of events) {
      switch (e.type) {
        case 'hit': if (e.source === 'player') consider(e.reprisal ? 'reprisalHit' : e.crit ? 'crit' : 'hit'); break;
        case 'strain': consider('reprisalOpen'); break;
        case 'enemyAttack': consider(e.dodged ? (e.perfect ? 'perfectDodge' : 'tap') : 'hurt'); break;
        case 'death': consider('unmade'); break;
        case 'bossKilled': consider('bossFelled'); break;
        case 'levelUp': consider('levelUp'); break;
      }
    }
    if (best) haptic(best);
  });
}
