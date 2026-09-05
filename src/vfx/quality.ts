/**
 * Four quality tiers, one of them the auto-detected default. A tier is a set of knobs the stage,
 * the particles, the grain and the cinematics read: resolution scale, post-processing, particle
 * budget, cinematic length. Auto picks a starting tier from what the device says about itself and
 * then steps down on sustained frame drops (never up, until the next launch).
 */
import { useEffect, useState } from 'react';
import { useSettings } from '@/ui/settings';

export type Tier = 'cinematic' | 'high' | 'balanced' | 'battery';
export const TIERS: Tier[] = ['cinematic', 'high', 'balanced', 'battery'];

export interface TierKnobs { dpr: number; bloom: boolean; particles: number; cinematic: number; grain: boolean; motes: number; heat: boolean }

export const KNOBS: Record<Tier, TierKnobs> = {
  cinematic: { dpr: 2, bloom: true, particles: 1, cinematic: 1, grain: true, motes: 1, heat: true },
  high: { dpr: 1.5, bloom: true, particles: 0.7, cinematic: 1, grain: true, motes: 0.6, heat: true },
  balanced: { dpr: 1, bloom: false, particles: 0.45, cinematic: 0.7, grain: true, motes: 0.35, heat: false },
  battery: { dpr: 1, bloom: false, particles: 0.2, cinematic: 0.5, grain: false, motes: 0, heat: false },
};

/** What the device says about itself, before any frame is measured. */
export function detectTier(): Tier {
  if (typeof navigator === 'undefined') return 'balanced';
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = n.hardwareConcurrency ?? 4;
  const mem = n.deviceMemory ?? 4;
  const touch = 'ontouchstart' in window || n.maxTouchPoints > 0;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (n.connection?.saveData || reduced) return 'battery';
  if (touch) return mem >= 6 && cores >= 8 ? 'high' : mem >= 4 ? 'balanced' : 'battery';
  return cores >= 8 ? 'cinematic' : 'high';
}

let autoTier: Tier = 'balanced';
let detected = false;
const listeners = new Set<() => void>();

/** The effective tier as a class on <html> (tier-battery ...), so CSS can drop the weather without a React subscription. */
function applyTierClass() {
  if (typeof document === 'undefined') return;
  const cls = document.documentElement.classList;
  for (const t of TIERS) cls.toggle('tier-' + t, t === currentTier());
}

export function currentTier(): Tier {
  if (!detected) { autoTier = detectTier(); detected = true; queueMicrotask(applyTierClass); }
  const pref = useSettings.getState().quality;
  return pref === 'auto' || !pref ? autoTier : pref;
}
export function knobs(): TierKnobs { return KNOBS[currentTier()]; }

/** The stage calls this when it has measured sustained frame drops; auto steps down one tier. */
export function stepDown(): Tier | null {
  if (!detected) currentTier();
  const i = TIERS.indexOf(autoTier);
  if (i >= TIERS.length - 1) return null;
  autoTier = TIERS[i + 1];
  applyTierClass();
  listeners.forEach((l) => l());
  return autoTier;
}
export function onTierChange(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; }
export function autoTierName(): Tier { if (!detected) currentTier(); return autoTier; }

// a hand-picked tier is a tier change too
let lastPref: string | null = null;
useSettings.subscribe((st) => { if (st.quality !== lastPref) { lastPref = st.quality; applyTierClass(); listeners.forEach((l) => l()); } });

/**
 * The effective tier, for React: re-renders on step-down and on a settings change. A plain
 * subscription rather than useSyncExternalStore: the store hook, used from a memoised component
 * beside a useEffect, left that component's hook list inconsistent in production (React 19.2).
 */
export function useTier(): Tier {
  const [tier, setTier] = useState<Tier>(() => currentTier());
  useEffect(() => { setTier(currentTier()); return onTierChange(() => setTier(currentTier())); }, []);
  return tier;
}
