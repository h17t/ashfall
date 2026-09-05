import { useEffect, type RefObject } from 'react';

/**
 * A horizontal swipe on an element: mostly sideways, at least `threshold` px, finished within a
 * second. Vertical movement cancels it so scrolling never turns into a page change. Never the only
 * way to do anything: the bottom navigation does the same job.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, onSwipe: (dir: 'left' | 'right') => void, threshold = 64) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x0 = 0, y0 = 0, t0 = 0, id = -1, live = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.arena-stage, .action-bar, input, select, textarea, .sheet-root')) return;
      x0 = e.clientX; y0 = e.clientY; t0 = e.timeStamp; id = e.pointerId; live = true;
    };
    const move = (e: PointerEvent) => {
      if (!live || e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) live = false; // it is a scroll
    };
    const up = (e: PointerEvent) => {
      if (!live || e.pointerId !== id) return;
      live = false;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (e.timeStamp - t0 > 1000) return;
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 'left' : 'right');
    };
    const cancel = () => { live = false; };
    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerup', up, { passive: true });
    el.addEventListener('pointercancel', cancel, { passive: true });
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
  }, [ref, onSwipe, threshold]);
}
