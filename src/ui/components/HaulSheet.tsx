import { memo, useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { Sheet } from '../shell/Sheet';
import { BOONS } from '@/content';
import { fmt, D, type GameEvent } from '@/engine';
import { Plate } from '@/render/Plate';
import { useSel } from '../store';

/** The climb out: what the stair gave up, and the boons that got you there. */
export const HaulSheet = memo(function HaulSheet() {
  const [shown, setShown] = useState<{ floor: number; haul: string; mult: number; banked: string } | null>(null);
  const last = useSel((s) => s.descent.last?.boons.join(',') ?? '');
  const onEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) if (e.type === 'descentBanked') setShown({ floor: e.floor, haul: e.haul.toString(), mult: e.mult, banked: e.banked.toString() });
  }, []);
  useEvents(onEvents);
  if (!shown) return null;
  const boons = last.split(',').filter(Boolean);
  const counts = boons.reduce<Record<string, number>>((a, b) => { a[b] = (a[b] ?? 0) + 1; return a; }, {});
  return (
    <Sheet open onClose={() => setShown(null)} material="stone" label="Climbed out">
      <div className="flex flex-col gap-4 -mt-1">
        <div>
          <div className="t-label">The Stair · {shown.floor} floor{shown.floor === 1 ? '' : 's'}</div>
          <div className="t-display text-[28px] leading-tight mt-1" style={{ color: 'var(--ember-hot)' }}>Climbed out</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] shrink-0"><Plate kind="ui" id="remains" className="w-full h-full object-contain" /></div>
          <div className="flex-1 flex flex-col gap-1 text-[15px]" style={{ color: 'var(--bone)' }}>
            <div className="flex justify-between"><span>Haul</span><span className="t-num" style={{ color: 'var(--parchment)' }}>{fmt(D(shown.haul))}</span></div>
            <div className="flex justify-between"><span>Bank multiplier</span><span className="t-num" style={{ color: 'var(--parchment)' }}>×{shown.mult.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1" style={{ borderColor: 'color-mix(in srgb, var(--ash) 60%, transparent)' }}><span>Banked</span><span className="t-num text-[20px]" style={{ color: 'var(--ember-hot)' }}>{fmt(D(shown.banked))} marrow</span></div>
          </div>
        </div>
        {boons.length > 0 && (
          <div>
            <div className="t-label mb-1">Boons carried</div>
            <div className="flex flex-wrap gap-2">{Object.entries(counts).map(([id, n]) => <span key={id} className={`boon-chip ${BOONS[id]?.rarity ?? ''}`}>{BOONS[id]?.name ?? id}{n > 1 ? ` ×${n}` : ''}</span>)}</div>
          </div>
        )}
        <button className="btn btn-ember min-h-[56px]" onClick={() => setShown(null)}>Back to the road</button>
      </div>
    </Sheet>
  );
});
