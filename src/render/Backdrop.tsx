import { memo } from 'react';
import { asset } from '../../assets/manifest';
import { ZONE_ORDER } from '@/content';

/**
 * The region behind the encounter: four painted layers stacked far to near, with the nearest one
 * drifting so the scene breathes. Cinematic parallax (pointer and combat driven) lands in the
 * regions milestone; this is the static plate.
 */
export const Backdrop = memo(function Backdrop({ zone, dim = 0.35, className = '' }: { zone: string; dim?: number; className?: string }) {
  const id = ZONE_ORDER.includes(zone) ? zone : ZONE_ORDER[0];
  const e = asset('region', id);
  const layers = e.layers ?? [];
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      {layers.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 bg-cover bg-bottom ${i === 3 ? 'backdrop-drift' : ''}`}
          style={{ backgroundImage: `url(${src})`, backgroundPosition: '50% 100%', transform: `scale(${1 + i * 0.03})`, transformOrigin: '50% 100%', filter: 'saturate(0.55) brightness(0.62) contrast(1.08)' }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in srgb, var(--void) ${Math.round(dim * 100)}%, transparent) 0%, transparent 40%, transparent 72%, color-mix(in srgb, var(--void) 80%, transparent) 100%), radial-gradient(ellipse 55% 50% at 50% 92%, color-mix(in srgb, var(--ember) 16%, transparent), transparent 70%)` }} />
    </div>
  );
});
