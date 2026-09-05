import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Slab } from '@/render/materials/Slab';

/**
 * A bottom sheet: the one modal surface the game uses on a phone. Slides up from the thumb, sits
 * on a scrim, closes on the scrim, on Escape, on its own close control, and (Milestone 3) on a
 * downward swipe. Never taller than 85% of the viewport; scrolls inside itself.
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // focus the sheet so screen readers announce it and Escape works
    ref.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="sheet-root fixed inset-0 z-[70]" role="presentation">
      <div className="absolute inset-0 sheet-scrim" onClick={onClose} aria-hidden />
      <div ref={ref} className="sheet absolute inset-x-0 bottom-0 outline-none" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : 'Details')} tabIndex={-1}>
        <Slab material={material} seed="sheet" rough={7} ornament="none" shadow={false} outer="sheet-body" className="flex flex-col">
          <div className="sheet-grip mx-auto mt-2 mb-1" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pt-1">
            {title ? <div className="t-display text-[20px] leading-tight" style={{ color: material === 'parchment' ? 'var(--ink)' : 'var(--parchment)' }}>{title}</div> : <span />}
            <button className="sheet-close t-num text-[22px] leading-none" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="sheet-scroll overflow-y-auto px-5 pb-6 pt-2 text-[16px] leading-snug">{children}</div>
        </Slab>
      </div>
    </div>,
    document.body,
  );
}
