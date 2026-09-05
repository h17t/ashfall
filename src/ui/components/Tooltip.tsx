import { useState, type ReactNode } from 'react';
import { Sheet } from '../shell/Sheet';

/**
 * There is no hover. Anything that used to live in a hover tooltip now opens a bottom sheet on
 * tap (and on long-press, Milestone 3). The wrapped element stays whatever it was; an info mark
 * beside it makes the affordance visible and gives the sheet a 48px target of its own.
 *
 * `inline` puts the mark after the children in the flow; `wrap` (default) makes the whole
 * wrapper the tap target, for rows and cards that carry no other action.
 */
interface Props { tip: ReactNode; children: ReactNode; className?: string; title?: ReactNode; mode?: 'wrap' | 'inline' }

export function Tooltip({ tip, children, className = '', title, mode = 'wrap' }: Props) {
  const [open, setOpen] = useState(false);
  const sheet = <Sheet open={open} onClose={() => setOpen(false)} title={title}>{tip}</Sheet>;
  if (mode === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        {children}
        <button type="button" className="info-mark" aria-label="Details" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>i</button>
        {sheet}
      </span>
    );
  }
  return (
    <span className={`tip-wrap ${className}`} role="button" tabIndex={0} aria-haspopup="dialog" onClick={() => setOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}>
      {children}
      {sheet}
    </span>
  );
}
