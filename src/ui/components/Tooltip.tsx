import { useState, type ReactNode } from 'react';

/** Lightweight hover tooltip. Everything numeric in the game is explained through these. */
export function Tooltip({ tip, children, className = '' }: { tip: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`relative inline-block ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-72 slab p-3 text-[12px] leading-snug text-bone-200 shadow-xl pointer-events-none">
          {tip}
        </div>
      )}
    </span>
  );
}
