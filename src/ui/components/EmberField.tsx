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
          left: `${e.left}%`, bottom: -10, width: e.size, height: e.size,
          background: e.size > 2.5 ? '#ffa24d' : '#e8712a', boxShadow: '0 0 6px 1px rgba(232,113,42,0.5)',
          animation: `ember-rise ${e.dur}s linear ${e.delay}s infinite`, ['--drift' as any]: `${e.drift}px`, opacity: 0,
        }} />
      ))}
    </div>
  );
});
