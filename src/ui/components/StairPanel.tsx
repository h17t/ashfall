import { memo } from 'react';
import { useGame, useSel } from '../store';
import { Plate } from '@/render/Plate';
import { canDescend, floorTier, fmt, D } from '@/engine';
import { BOONS, BOON_ORDER, type BoonRarity } from '@/content';
import { Tooltip } from './Tooltip';

const RARITY_LABEL: Record<BoonRarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic' };

/**
 * The Stair's own page: what it is, the way down, the records, the last run, and every boon the
 * stair can offer with its lore. The descent itself happens in Combat.
 */
export const StairPanel = memo(function StairPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const why = useSel((s) => canDescend(s));
  const active = useSel((s) => !!s.descent.run);
  const runs = useSel((s) => s.descent.runs);
  const best = useSel((s) => s.descent.bestFloor);
  const banked = useSel((s) => s.descent.bankedTotal.toString());
  const last = useSel((s) => (s.descent.last ? JSON.stringify({ ...s.descent.last, banked: s.descent.last.banked.toString() }) : ''));
  const floor1 = useSel((s) => floorTier(s, 1));
  const lastRun = last ? (JSON.parse(last) as { floor: number; banked: string; died: boolean; boons: string[] }) : null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="t-display text-[20px] text-ember-hot">The Stair</div>
        <p className="text-[15px] leading-snug mt-1" style={{ color: 'var(--bone)' }}>Behind every lord's seat, a stair going down. Each floor is a short fight, harder than the last. After each, one of three Boons for the run, or the way out. What you carry is not yours until you climb out with it; die, and the stair keeps it. Your own marrow is never at stake.</p>
      </div>
      {active ? (
        <div className="hint-card" role="status"><span className="text-[15px]">You are on the stair now. The fight is in Combat; the way out is there too.</span></div>
      ) : (
        <button className="btn btn-ember min-h-[56px] text-[16px]" disabled={why !== null} onClick={() => dispatch({ type: 'descend' })}>{why ?? `Descend · floor 1 fights like tier ${floor1 + 1} of the road`}</button>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="stat-tile"><div className="t-num text-[22px]" style={{ color: 'var(--parchment)' }}>{runs}</div><div className="t-label">Descents</div></div>
        <div className="stat-tile"><div className="t-num text-[22px]" style={{ color: 'var(--parchment)' }}>{best}</div><div className="t-label">Deepest floor</div></div>
        <div className="stat-tile"><div className="t-num text-[22px]" style={{ color: 'var(--ember-hot)' }}>{fmt(D(banked))}</div><div className="t-label">Banked, ever</div></div>
      </div>
      {lastRun && (
        <div className="text-[14px]" style={{ color: 'var(--bone)' }}>
          Last descent: {lastRun.died ? <span>unmade on floor <span className="t-num" style={{ color: 'var(--parchment)' }}>{lastRun.floor}</span>; the stair kept the haul.</span> : <span>climbed out from floor <span className="t-num" style={{ color: 'var(--parchment)' }}>{lastRun.floor}</span> with <span className="t-num" style={{ color: 'var(--ember-hot)' }}>{fmt(D(lastRun.banked))}</span> marrow.</span>}
          {lastRun.boons.length > 0 && <span> Carried: {[...new Set(lastRun.boons)].map((b) => BOONS[b]?.name ?? b).join(', ')}.</span>}
        </div>
      )}
      <div>
        <div className="t-label mb-2">The boons</div>
        <div className="flex flex-col gap-1">
          {BOON_ORDER.map((id) => { const b = BOONS[id]; return (
            <Tooltip key={id} mode="wrap" tip={<div><div className="t-display text-[18px]">{b.name}</div><div className="text-[15px] mt-1" style={{ color: 'var(--parchment)' }}>{b.text}</div><div className="text-[14px] italic mt-2" style={{ color: 'var(--bone)' }}>{b.lore}</div><div className="t-label mt-2">{RARITY_LABEL[b.rarity]} · up to ×{b.stack} in a run</div></div>}>
              <div className={`boon-row ${b.rarity}`}>
                <span className="w-9 h-9 shrink-0" aria-hidden><Plate kind="boon" id={id} className="w-full h-full object-contain" /></span>
                <span className="t-display text-[16px]">{b.name}</span>
                <span className="text-[13px] truncate flex-1" style={{ color: 'var(--bone)' }}>{b.text}</span>
                <span className="boon-rarity">{RARITY_LABEL[b.rarity]}</span>
              </div>
            </Tooltip>
          ); })}
        </div>
      </div>
    </div>
  );
});
