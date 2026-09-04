import { memo, useEffect } from 'react';
import { useSettings } from '@/ui/settings';

/**
 * The bonfire is the light source for the whole interface. Writes `--fire` (0.85..1.15) to the
 * root at ~8Hz with a slow drift, so every bevel, rim and glow that multiplies by it flickers together.
 */
export const FireLight = memo(function FireLight() {
  const reduceFx = useSettings((s) => s.reduceFx);
  useEffect(() => {
    const root = document.documentElement;
    if (reduceFx) { root.style.setProperty('--fire', '1'); return; }
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.125;
      const slow = Math.sin(t * 0.7) * 0.05 + Math.sin(t * 0.23) * 0.04;
      const flick = (Math.random() - 0.5) * 0.12;
      root.style.setProperty('--fire', (1 + slow + flick).toFixed(3));
    }, 125);
    return () => { window.clearInterval(id); root.style.setProperty('--fire', '1'); };
  }, [reduceFx]);
  return null;
});
