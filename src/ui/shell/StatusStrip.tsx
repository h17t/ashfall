import { memo } from 'react';
import { useSel } from '../store';
import { fmt, D } from '@/engine';
import { Gauge } from '@/render/Gauge';

/** The top of the phone: Marrow, level, HP and stamina in one glance. Information lives up here; hands live below. */
export const StatusStrip = memo(function StatusStrip() {
  const marrow = useSel((s) => s.marrow.toString());
  const level = useSel((s) => s.player.level);
  const hp = useSel((s) => Math.round(s.player.hp));
  const hpMax = useSel((s) => s.player.hpMax);
  const stam = useSel((s) => Math.round(s.player.stamina));
  const stamMax = useSel((s) => s.player.staminaMax);
  const poisoned = useSel((s) => s.player.poisoned > 0);
  const remains = useSel((s) => s.remains?.marrow.toString() ?? null);
  return (
    <div className="status-strip" aria-label="Status">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="t-num text-[26px] leading-none" style={{ color: 'var(--parchment)' }}>{fmt(D(marrow))}</span>
          <span className="t-label" style={{ color: 'var(--ember-hot)' }}>Marrow</span>
          {remains && <span className="t-label" style={{ color: 'var(--blood-bright)' }}>· {fmt(D(remains))} in your Remains</span>}
        </div>
        <span className="t-label whitespace-nowrap">Level <span className="t-num text-[14px]" style={{ color: 'var(--parchment)' }}>{level}</span></span>
      </div>
      <div className="grid grid-cols-[3fr_2fr] gap-2 mt-1.5">
        <Gauge value={hp} max={hpMax} tone={poisoned ? 'verdigris' : 'blood'} height={10} text={`${hp} / ${hpMax}`} label="HP" />
        <Gauge value={stam} max={stamMax} tone={stam < 10 ? 'gold' : 'stamina'} height={10} cut={1} text={`${stam}`} label="Stamina" />
      </div>
    </div>
  );
});
