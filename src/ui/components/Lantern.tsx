import { memo } from 'react';
import { useSel } from '../store';
import { ZONE_ORDER } from '@/content';

/** The lantern flame grows with progression: lords felled, Wakings, Severings. Pure CSS/SVG. */
export const Lantern = memo(function Lantern() {
  const lords = useSel((s) => s.prestige.bossesEverKilled.length);
  const wakings = useSel((s) => s.prestige.wakings);
  const severings = useSel((s) => s.prestige.severings);
  const dark = useSel((s) => s.prestige.unmaking);
  const size = Math.min(1.9, 0.6 + lords * 0.06 + wakings * 0.04 + severings * 0.15 + dark * 0.1);
  const tone = dark > 0 || severings > 0 ? 'var(--wisp)' : 'var(--ember)';
  const toneHot = dark > 0 || severings > 0 ? 'var(--parchment)' : 'var(--ember-hot)';
  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 z-0 flex items-end justify-center" style={{ width: 240 * size, height: 160 * size, opacity: 0.9 }} aria-hidden>
      <svg viewBox="0 0 120 100" className="w-full h-full flame" style={{ transformOrigin: '50% 90%', willChange: 'transform' }}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="80%" r="60%"><stop offset="0%" stopColor={tone} stopOpacity="0.55" /><stop offset="100%" stopColor={tone} stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="60" cy="88" rx="60" ry="30" fill="url(#glow)" />
        <g>
          <path d="M60 90 C40 75 42 55 52 45 C50 60 58 62 58 50 C64 58 70 60 66 42 C80 55 78 78 60 90 Z" fill={tone} opacity="0.9" />
          <path d="M60 90 C50 80 50 66 56 58 C56 66 60 68 60 60 C64 66 66 70 64 58 C72 68 70 82 60 90 Z" fill={toneHot} opacity="0.9" />
        </g>
        <path d="M30 90 L90 90 L82 96 L38 96 Z" fill="#241E1A" />
        <path d="M45 90 L60 82 L75 90 Z" fill="#241E1A" />
      </svg>
    </div>
  );
});
