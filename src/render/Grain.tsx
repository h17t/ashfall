import { memo, useEffect, useRef } from 'react';
import { useSettings } from '@/ui/settings';
import { grainTile } from './materials/noise';
import { seeded } from './seed';

/**
 * One film-grain layer over the whole app, stepped at 12fps so it reads as film, not noise.
 * An oversized tile layer is moved with a transform (compositor only); nothing repaints per step.
 */
export const Grain = memo(function Grain() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceFx = useSettings((s) => s.reduceFx);
  // The quality tier and the perf-lite rung reach this layer as classes on <html> (CSS hides it);
  // the step just checks them. No store subscription here: one in this component, beside its
  // effect, left React's hook list inconsistent in production (React 19.2) about one load in three.
  useEffect(() => {
    if (reduceFx) return;
    const r = seeded(7);
    const id = window.setInterval(() => {
      const cls = document.documentElement.classList;
      if (cls.contains('perf-lite') || cls.contains('tier-battery')) return;
      if (ref.current) ref.current.style.transform = `translate3d(${-Math.floor(r() * 256)}px, ${-Math.floor(r() * 256)}px, 0)`;
    }, 1000 / 12);
    return () => window.clearInterval(id);
  }, [reduceFx]);
  if (reduceFx) return null;
  return (
    <div className="grain-layer pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden style={{ mixBlendMode: 'overlay', opacity: 0.07 }}>
      <div ref={ref} className="absolute" style={{ left: 0, top: 0, width: 'calc(100% + 256px)', height: 'calc(100% + 256px)', backgroundImage: grainTile(), backgroundSize: '256px 256px', willChange: 'transform' }} />
    </div>
  );
});
