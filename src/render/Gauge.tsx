import { memo } from 'react';

/**
 * A chipped iron gauge. Never a rounded-cap bar: the trough is cut stone, the fill is a hot liquid
 * with a brighter leading edge, and the outline is nicked so no two gauges are the same rectangle.
 */
export type Tone = 'blood' | 'ember' | 'stamina' | 'bone' | 'soul' | 'gold' | 'verdigris';

const FILL: Record<Tone, string> = {
  blood: 'linear-gradient(90deg, var(--blood) 0%, var(--blood-bright) 100%)',
  ember: 'linear-gradient(90deg, var(--ember) 0%, var(--ember-hot) 100%)',
  stamina: 'linear-gradient(90deg, var(--verdigris) 0%, color-mix(in srgb, var(--verdigris) 55%, var(--bone)) 100%)',
  bone: 'linear-gradient(90deg, var(--ash) 0%, var(--bone) 100%)',
  soul: 'linear-gradient(90deg, color-mix(in srgb, var(--soul) 70%, var(--ink)) 0%, var(--soul) 100%)',
  gold: 'linear-gradient(90deg, color-mix(in srgb, var(--gold) 70%, var(--ink)) 0%, var(--gold) 100%)',
  verdigris: 'linear-gradient(90deg, var(--verdigris) 0%, color-mix(in srgb, var(--verdigris) 60%, var(--soul)) 100%)',
};
const EDGE: Record<Tone, string> = {
  blood: 'var(--blood-bright)', ember: 'var(--ember-hot)', stamina: 'var(--bone)', bone: 'var(--parchment)', soul: 'var(--parchment)', gold: 'var(--parchment)', verdigris: 'var(--bone)',
};

// two nicked outlines so adjacent gauges do not rhyme
const CUTS = [
  'polygon(0 18%, 1.2% 0, 40% 6%, 98.5% 0, 100% 25%, 99.2% 100%, 60% 94%, 0.6% 100%)',
  'polygon(0.8% 0, 55% 5%, 99.4% 0, 100% 70%, 98.8% 100%, 30% 95%, 0 100%, 0.4% 30%)',
];

interface Props {
  value: number;
  max: number;
  tone: Tone;
  height?: number;
  label?: string;
  text?: string;
  className?: string;
  /** which nick pattern */
  cut?: 0 | 1;
  /** a faint ghost of the previous value, for the "damage just taken" read */
  ghost?: number;
}

export const Gauge = memo(function Gauge({ value, max, tone, height = 10, label, text, className = '', cut = 0, ghost }: Props) {
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const gfrac = ghost !== undefined && max > 0 ? Math.max(frac, Math.min(1, ghost / max)) : 0;
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="t-label flex justify-between items-baseline mb-1">
          <span>{label}</span>
          {text && <span className="t-num text-[12px] tracking-[0.02em]" style={{ color: 'var(--bone)' }}>{text}</span>}
        </div>
      )}
      <div className="relative w-full" style={{ height, clipPath: CUTS[cut], background: 'var(--void)', boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--ash) 60%, transparent)' }}>
        {gfrac > 0 && <div className="absolute inset-y-0 left-0" style={{ width: `${gfrac * 100}%`, background: 'color-mix(in srgb, var(--parchment) 45%, transparent)', transition: 'width 600ms ease-out 200ms' }} />}
        <div className="absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear" style={{ width: `${frac * 100}%`, background: FILL[tone] }}>
          <span className="absolute inset-y-0 right-0" style={{ width: 2, background: EDGE[tone], opacity: 0.9 }} />
          <span className="absolute inset-x-0 top-0" style={{ height: 1, background: 'color-mix(in srgb, var(--parchment) 22%, transparent)' }} />
        </div>
      </div>
    </div>
  );
});
