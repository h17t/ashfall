import { memo, useMemo } from 'react';

/** Constant drifting embers. Pure CSS; hidden under reduce-effects. */
export const EmberField = memo(function EmberField({ count = 28 }: { count?: number }) {
  const embers = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 1 + Math.random() * 3,
    dur: 8 + Math.random() * 14,
    delay: -Math.random() * 20,
    drift: (Math.random() - 0.5) * 120,
  })), [count]);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {embers.map((e) => (
        <div key={e.id} className="ember absolute rounded-full" style={{
          left: `${e.left}%`, bottom: -10, width: e.size * 3, height: e.size * 3,
          // a soft dot from a gradient, not a box-shadow: no blur to repaint while it moves; its own compositor layer
          background: 'radial-gradient(circle, var(--ember-hot) 0%, color-mix(in srgb, var(--ember-hot) 55%, transparent) 30%, transparent 70%)',
          willChange: 'transform, opacity',
          animation: `ember-rise ${e.dur}s linear ${e.delay}s infinite`, ['--drift' as any]: `${e.drift}px`, opacity: 0,
        }} />
      ))}
    </div>
  );
});
