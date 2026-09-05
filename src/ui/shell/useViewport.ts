import { useSyncExternalStore } from 'react';

/**
 * The three layouts the shell knows: a phone held upright (the primary design), a phone held
 * sideways, and anything wide enough to show the combat frame and a section side by side.
 */
export type Layout = 'portrait' | 'landscape' | 'wide';

function compute(): Layout {
  if (typeof window === 'undefined') return 'portrait';
  const w = window.innerWidth, h = window.innerHeight;
  if (w >= 900) return 'wide';
  if (w > h && w >= 640) return 'landscape';
  return 'portrait';
}

const listeners = new Set<() => void>();
let current = compute();
if (typeof window !== 'undefined') {
  const onChange = () => { const next = compute(); if (next !== current) { current = next; listeners.forEach((l) => l()); } };
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
}

export function useLayout(): Layout {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current, () => 'portrait');
}

export const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
