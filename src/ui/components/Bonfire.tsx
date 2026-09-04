import { memo } from 'react';
import { useSel } from '../store';
import { ZONE_ORDER } from '@/content';

/** The bonfire flame grows with progression: lords felled, Kindles, Sigils. Pure CSS/SVG. */
export const Bonfire = memo(function Bonfire() {
  const lords = useSel((s) => s.prestige.bossesEverKilled.length);
  const kindles = useSel((s) => s.prestige.kindles);
  const sigils = useSel((s) => s.prestige.sigils);
  const dark = useSel((s) => s.prestige.darkLevel);
  const size = Math.min(1.9, 0.6 + lords * 0.06 + kindles * 0.04 + sigils * 0.15 + dark * 0.1);
  const tone = dark > 0 || sigils > 0 ? 'var(--soul)' : 'var(--ember)';
  const toneHot = dark > 0 || sigils > 0 ? 'var(--parchment)' : 'var(--ember-hot)';
  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 z-0 flex items-end justify-center" style={{ width: 240 * size, height: 160 * size, opacity: 0.9 }} aria-hidden>
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <defs>
          <radialGradient id="glow" cx="50%" cy="80%" r="60%"><stop offset="0%" stopColor={tone} stopOpacity="0.55" /><stop offset="100%" stopColor={tone} stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="60" cy="88" rx="60" ry="30" fill="url(#glow)" />
        <g className="flame" style={{ transformOrigin: '60px 90px' }}>
          <path d="M60 90 C40 75 42 55 52 45 C50 60 58 62 58 50 C64 58 70 60 66 42 C80 55 78 78 60 90 Z" fill={tone} opacity="0.9" />
          <path d="M60 90 C50 80 50 66 56 58 C56 66 60 68 60 60 C64 66 66 70 64 58 C72 68 70 82 60 90 Z" fill={toneHot} opacity="0.9" />
        </g>
        <path d="M30 90 L90 90 L82 96 L38 96 Z" fill="#241E1A" />
        <path d="M45 90 L60 82 L75 90 Z" fill="#241E1A" />
      </svg>
    </div>
  );
});
