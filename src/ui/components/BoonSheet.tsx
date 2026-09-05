import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { Sheet } from '../shell/Sheet';
import { BOONS, type BoonRarity } from '@/content';
import { bankedPreview, bankMult, fmt, D } from '@/engine';
import { haptic } from '../haptics';

const RARITY_LABEL: Record<BoonRarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic' };

/**
 * The decision every floor: one of three boons, or the way out. The sheet cannot be dismissed
 * without deciding (the stair waits), but the way out is always the first thing under the thumb.
 * Choosing is two taps: pick a card, then take it, because a boon is for the whole run.
 */
export const BoonSheet = memo(function BoonSheet() {
  const dispatch = useGame((g) => g.dispatch);
  const offer = useSel((s) => s.descent.run?.offer?.join(',') ?? '');
  const floor = useSel((s) => s.descent.run?.floor ?? 0);
  const haul = useSel((s) => s.descent.run?.haul.toString() ?? '0');
  const banked = useSel((s) => (s.descent.run ? bankedPreview(s.descent.run).toString() : '0'));
  const mult = useSel((s) => (s.descent.run ? bankMult(s.descent.run) : 1));
  const nextMult = useSel((s) => (s.descent.run ? bankMult({ ...s.descent.run, floor: s.descent.run.floor + 1 }) : 1));
  const taken = useSel((s) => s.descent.run?.boons.join(',') ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  if (!offer) return null;
  const ids = offer.split(',');
  const counts = taken.split(',').filter(Boolean).reduce<Record<string, number>>((a, b) => { a[b] = (a[b] ?? 0) + 1; return a; }, {});
  const take = () => { const i = ids.indexOf(picked!); if (i >= 0) { haptic('levelUp'); dispatch({ type: 'chooseBoon', index: i }); setPicked(null); } };
  const withdraw = () => { haptic('bossFelled'); dispatch({ type: 'descentWithdraw' }); setPicked(null); };
  return (
    <Sheet open dismissable={false} onClose={() => { /* the stair waits: decide below */ }} material="stone" label={`Floor ${floor} cleared`}>
      <div className="flex flex-col gap-3 -mt-1">
        <div>
          <div className="t-label">The Stair · floor {floor} cleared</div>
          <div className="t-display text-[26px] leading-tight mt-1" style={{ color: 'var(--ember-hot)' }}>One more, or out?</div>
          <div className="text-[15px] mt-1" style={{ color: 'var(--bone)' }}>Haul <span className="t-num" style={{ color: 'var(--parchment)' }}>{fmt(D(haul))}</span> banks at <span className="t-num" style={{ color: 'var(--parchment)' }}>×{mult.toFixed(2)}</span> now, <span className="t-num">×{nextMult.toFixed(2)}</span> after the next floor. Die and it is the stair's.</div>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Boons on offer">
          {ids.map((id) => {
            const b = BOONS[id];
            if (!b) return null;
            const on = picked === id;
            return (
              <button key={id} role="radio" aria-checked={on} className={`boon-card ${b.rarity} ${on ? 'is-on' : ''}`} onClick={() => { haptic('tap'); setPicked(id); }}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="t-display text-[19px] leading-tight">{b.name}{counts[id] ? <span className="t-num text-[13px] ml-2" style={{ color: 'var(--bone)' }}>held ×{counts[id]}</span> : null}</span>
                  <span className="boon-rarity">{RARITY_LABEL[b.rarity]}</span>
                </span>
                <span className="block text-[15px] mt-1" style={{ color: 'var(--parchment)' }}>{b.text}</span>
                <span className="block text-[14px] mt-1 italic leading-snug" style={{ color: 'color-mix(in srgb, var(--bone) 80%, transparent)' }}>{b.lore}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <button className="btn flex-1 min-h-[56px]" onClick={withdraw}>Withdraw · bank {fmt(D(banked))}</button>
          <button className="btn btn-ember flex-1 min-h-[56px]" disabled={!picked} onClick={take}>{picked ? `Take ${BOONS[picked]?.name}` : 'Pick a boon'}</button>
        </div>
      </div>
    </Sheet>
  );
});
