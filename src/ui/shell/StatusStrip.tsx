import { memo } from 'react';
import { useSel } from '../store';
import { useSettings } from '../settings';
import { fmt, D, nextGoal } from '@/engine';
import { Gauge } from '@/render/Gauge';
import { useShell } from './shellStore';
import { openSection } from './Section';
import { haptic } from '../haptics';

/** The top of the phone: Marrow, level, HP and stamina in one glance. Information lives up here; hands live below. */
export const StatusStrip = memo(function StatusStrip() {
  const marrow = useSel((s) => s.marrow.toString());
  const level = useSel((s) => s.player.level);
  const hp = useSel((s) => Math.round(s.player.hp));
  const hpMax = useSel((s) => s.player.hpMax);
  const stam = useSel((s) => Math.round(s.player.stamina));
  const stamMax = useSel((s) => s.player.staminaMax);
  const poisoned = useSel((s) => s.player.poisoned > 0);
  const colorblind = useSettings((s) => s.colorblind);
  const remains = useSel((s) => s.remains?.marrow.toString() ?? null);
  const goal = useSel((s) => JSON.stringify(nextGoal(s)));
  const setPillar = useShell((s) => s.setPillar);
  const held = useSel((s) => !!s.encounter.held);
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
        <Gauge value={hp} max={hpMax} tone={poisoned ? (colorblind ? 'wisp' : 'verdigris') : 'blood'} height={10} text={`${hp} / ${hpMax}`} label="HP" />
        <Gauge value={stam} max={stamMax} tone={stam < 10 ? 'gold' : 'stamina'} height={10} cut={1} text={`${stam}`} label="Stamina" />
      </div>
      {(() => {
        const g = JSON.parse(goal) as { text: string; where: 'combat' | 'lantern' | 'arsenal' | 'cortege' | 'creeds' | null; tab?: string };
        const go = () => { if (!g.where) return; haptic('tap'); setPillar(g.where); if (g.tab) openSection(g.where === 'combat' ? 'combat-extra' : g.where, g.tab); };
        return (
          <div className="goal-line" role="status" aria-live="polite">
            <span className="goal-mark" aria-hidden>¶</span>
            {g.where ? <button type="button" className="goal-text goal-go" onClick={go}>{g.text}</button> : <span className="goal-text">{g.text}</span>}
            {held && <span className="goal-held t-label">the fight waits</span>}
          </div>
        );
      })()}
    </div>
  );
});
