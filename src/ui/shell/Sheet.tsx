import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Slab } from '@/render/materials/Slab';

/**
 * A bottom sheet: the one modal surface the game uses on a phone. Slides up from the thumb, sits
 * on a scrim, closes on the scrim, on Escape, on its own close control, and on a downward drag of
 * more than 90px (the drag follows the finger). Never taller than 85% of the viewport; scrolls
 * inside itself, and a drag only begins when that inner scroll is at the top.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** parchment for reading, stone for controls */
  material?: 'parchment' | 'stone' | 'leather';
  /** a label for assistive tech when there is no visible title */
  label?: string;
}

export function Sheet({ open, onClose, title, children, material = 'parchment', label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; setDrag(0); };
  }, [open, onClose]);
  // the drag: native touch listeners (passive: false) so a downward pull at the top of the inner
  // scroll follows the finger instead of becoming a document scroll and a pointercancel
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    let y0 = 0, tracking = false, dy = 0;
    const onStart = (e: TouchEvent) => { tracking = (scrollRef.current?.scrollTop ?? 0) <= 0; y0 = e.touches[0].clientY; dy = 0; };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { e.preventDefault(); setDrag(dy); }
      else if (dy < -4) tracking = false;
    };
    const onEnd = () => { if (!tracking) return; tracking = false; if (dy > 90) onClose(); else setDrag(0); };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd); el.addEventListener('touchcancel', onEnd);
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd); };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="sheet-root fixed inset-0 z-[70]" role="presentation">
      <div className="absolute inset-0 sheet-scrim" onClick={onClose} aria-hidden style={{ opacity: Math.max(0.2, 1 - drag / 300) }} />
      <div ref={ref} className="sheet absolute inset-x-0 bottom-0 outline-none" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : 'Details')} tabIndex={-1}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? 'none' : undefined }}>
        <Slab material={material} seed="sheet" rough={7} ornament="none" shadow={false} outer="sheet-body" className="flex flex-col">
          <div className="sheet-grip mx-auto mt-2 mb-1" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pt-1">
            {title ? <div className="t-display text-[20px] leading-tight" style={{ color: material === 'parchment' ? 'var(--ink)' : 'var(--parchment)' }}>{title}</div> : <span />}
            <button className="sheet-close t-num text-[22px] leading-none" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div ref={scrollRef} className="sheet-scroll overflow-y-auto px-5 pb-6 pt-2 text-[16px] leading-snug">{children}</div>
        </Slab>
      </div>
    </div>,
    document.body,
  );
}
