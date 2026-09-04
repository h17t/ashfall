import { memo, useEffect } from 'react';
import { useSettings } from '@/ui/settings';

/**
 * The bonfire is the light source for the whole interface. The flicker is a compositor-driven
 * keyframe animation on the lit layers (`.fire-lit` in index.css); this component only mirrors the
 * reduce-effects setting onto the root so those layers can hold still. A root-variable write at 8Hz
 * was measured at a full-tree style recalc per write and dropped.
 */
export const FireLight = memo(function FireLight() {
  const reduceFx = useSettings((s) => s.reduceFx);
  useEffect(() => {
    document.documentElement.classList.toggle('fire-still', reduceFx);
    return () => document.documentElement.classList.remove('fire-still');
  }, [reduceFx]);
  return null;
});
