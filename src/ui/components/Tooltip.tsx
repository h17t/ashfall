import { useState, type ReactNode } from 'react';
import { Slab } from '@/render/materials/Slab';

/** Lightweight hover tooltip. Everything numeric in the game is explained through these. */
export function Tooltip({ tip, children, className = '' }: { tip: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`relative inline-block ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-72 pointer-events-none">
          <Slab material="parchment" seed="tip" rough={7} ornament="none" className="px-4 py-3 text-[14px] leading-snug">
            {tip}
          </Slab>
        </div>
      )}
    </span>
  );
}
