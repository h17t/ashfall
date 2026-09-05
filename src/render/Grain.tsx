import { memo, useEffect, useRef } from 'react';
import { useSettings } from '@/ui/settings';
import { grainTile } from './materials/noise';
import { seeded } from './seed';
import { useGlMode } from '@/vfx/Vfx';
import { useTier, KNOBS } from '@/vfx/quality';

/**
 * One film-grain layer over the whole app, stepped at 12fps so it reads as film, not noise.
 * An oversized tile layer is moved with a transform (compositor only); nothing repaints per step.
 */
export const Grain = memo(function Grain() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceFx = useSettings((s) => s.reduceFx);
  const lite = useGlMode() === 'dom' || !KNOBS[useTier()].grain;
  useEffect(() => {
    if (reduceFx || lite) return;
    const r = seeded(7);
    const id = window.setInterval(() => {
      if (ref.current) ref.current.style.transform = `translate3d(${-Math.floor(r() * 256)}px, ${-Math.floor(r() * 256)}px, 0)`;
    }, 1000 / 12);
    return () => window.clearInterval(id);
  }, [reduceFx, lite]);
  if (lite) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden style={{ mixBlendMode: 'overlay', opacity: 0.07 }}>
      <div ref={ref} className="absolute" style={{ left: 0, top: 0, width: 'calc(100% + 256px)', height: 'calc(100% + 256px)', backgroundImage: grainTile(), backgroundSize: '256px 256px', willChange: 'transform' }} />
    </div>
  );
});
