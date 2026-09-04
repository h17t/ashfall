import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useSettings } from '../settings';
import type { GameEvent } from '@/engine';

/**
 * Screen-level juice: impact flash, damage-scaled shake, riposte time-dilation with a chromatic
 * edge, ash burst on death. All CSS. Honors reduce-effects and the screen-shake toggle.
 */
export const Fx = memo(function Fx() {
  const reduceFx = useSettings((s) => s.reduceFx);
  const shakeOn = useSettings((s) => s.screenShake);
  const [flash, setFlash] = useState<{ key: number; color: string } | null>(null);
  const [riposte, setRiposte] = useState(0);
  const [ash, setAsh] = useState(0);
  const shakeEl = useRef<HTMLDivElement>(null);
  const onEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'stagger' && !reduceFx) setRiposte(Date.now());
      if (e.type === 'death') { setAsh(Date.now()); setFlash({ key: Date.now(), color: 'color-mix(in srgb, #6E1212 35%, transparent)' }); }
      if (e.type === 'bossKilled') setFlash({ key: Date.now(), color: 'color-mix(in srgb, #F0902E 25%, transparent)' });
      if (e.type === 'enemyAttack' && !e.dodged && shakeOn && !reduceFx) shake(shakeEl.current, Math.min(12, 3 + e.dmg / 40));
      if (e.type === 'hit' && e.riposte && shakeOn && !reduceFx) shake(shakeEl.current, 8);
      if (e.type === 'statusProc' && e.target === 'enemy') setFlash({ key: Date.now(), color: 'color-mix(in srgb, #5C7A99 12%, transparent)' });
    }
  }, [reduceFx, shakeOn]);
  useEvents(onEvents);
  useEffect(() => { if (!flash) return; const t = window.setTimeout(() => setFlash(null), 320); return () => window.clearTimeout(t); }, [flash]);
  useEffect(() => { if (!riposte) return; document.documentElement.classList.add('riposte-time'); const t = window.setTimeout(() => document.documentElement.classList.remove('riposte-time'), 650); return () => window.clearTimeout(t); }, [riposte]);
  return (
    <>
      <div ref={shakeEl} className="pointer-events-none fixed inset-0 z-40" />
      {flash && <div key={flash.key} className="pointer-events-none fixed inset-0 z-40" style={{ background: flash.color, animation: 'flash 0.32s ease-out forwards' }} />}
      {riposte > 0 && !reduceFx && <div key={riposte} className="pointer-events-none fixed inset-0 z-40 chromatic-edge" />}
      {ash > 0 && !reduceFx && <AshBurst key={ash} />}
    </>
  );
});

function shake(el: HTMLDivElement | null, px: number) {
  // Shake the whole app root: translate a wrapper via CSS var read by the root animation.
  const root = (document.querySelector('.arena') as HTMLElement | null) ?? document.getElementById('root');
  if (!root) return;
  root.style.setProperty('--shake', `${px}px`);
  root.classList.remove('shaking');
  void root.offsetWidth;
  root.classList.add('shaking');
  window.setTimeout(() => root.classList.remove('shaking'), 220);
}

function AshBurst() {
  const flakes = Array.from({ length: 36 }, (_, i) => ({ id: i, x: 50 + (Math.random() - 0.5) * 30, y: 45 + (Math.random() - 0.5) * 20, dx: (Math.random() - 0.5) * 240, dy: 80 + Math.random() * 220, size: 2 + Math.random() * 4, dur: 1.4 + Math.random() * 1.2 }));
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {flakes.map((f) => (
        <div key={f.id} className="absolute rounded-full bg-bone-400" style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.size, height: f.size, opacity: 0.7, animation: `ash-fall ${f.dur}s ease-in forwards`, ['--dx' as any]: `${f.dx}px`, ['--dy' as any]: `${f.dy}px` }} />
      ))}
    </div>
  );
}
