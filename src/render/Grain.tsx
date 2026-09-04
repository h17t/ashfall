import { memo, useEffect, useRef } from 'react';
import { useSettings } from '@/ui/settings';
import { grainTile } from './materials/noise';
import { seeded } from './seed';

/**
 * One film-grain layer over the whole app, stepped at 12fps so it reads as film, not noise.
 * A cached noise tile is jittered by background-position; no per-frame filter work.
 */
export const Grain = memo(function Grain() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceFx = useSettings((s) => s.reduceFx);
  useEffect(() => {
    if (reduceFx) return;
    const r = seeded(7);
    const id = window.setInterval(() => {
      if (ref.current) ref.current.style.backgroundPosition = `${Math.floor(r() * 256)}px ${Math.floor(r() * 256)}px`;
    }, 1000 / 12);
    return () => window.clearInterval(id);
  }, [reduceFx]);
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden style={{ backgroundImage: grainTile(), backgroundSize: '256px 256px', mixBlendMode: 'overlay', opacity: 0.07 }} />
  );
});
