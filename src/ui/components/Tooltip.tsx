import { useRef, useState, type ReactNode } from 'react';
import { Sheet } from '../shell/Sheet';
import { haptic } from '../haptics';

/**
 * There is no hover. Anything that used to live in a hover tooltip now opens a bottom sheet on
 * tap or on a long-press (420ms). The wrapped element stays whatever it was; an info mark beside
 * it makes the affordance visible and gives the sheet a 48px target of its own.
 *
 * `inline` puts the mark after the children in the flow and long-press opens the sheet from the
 * children too; `wrap` (default) makes the whole wrapper the tap target, for rows and cards that
 * carry no other action.
 */
interface Props { tip: ReactNode; children: ReactNode; className?: string; title?: ReactNode; mode?: 'wrap' | 'inline' }

const LONG = 420;

export function Tooltip({ tip, children, className = '', title, mode = 'wrap' }: Props) {
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const fired = useRef(false);
  const press = {
    onPointerDown: () => { fired.current = false; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { fired.current = true; haptic('tap'); setOpen(true); }, LONG); },
    onPointerUp: () => window.clearTimeout(timer.current),
    onPointerLeave: () => window.clearTimeout(timer.current),
    onPointerMove: () => window.clearTimeout(timer.current),
    onPointerCancel: () => window.clearTimeout(timer.current),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const sheet = <Sheet open={open} onClose={() => setOpen(false)} title={title}>{tip}</Sheet>;
  if (mode === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`} {...press}>
        {children}
        <button type="button" className="info-mark" aria-label="Details" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>i</button>
        {sheet}
      </span>
    );
  }
  return (
    <span className={`tip-wrap ${className}`} role="button" tabIndex={0} aria-haspopup="dialog" {...press}
      onClick={() => { if (fired.current) { fired.current = false; return; } setOpen(true); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}>
      {children}
      {sheet}
    </span>
  );
}
