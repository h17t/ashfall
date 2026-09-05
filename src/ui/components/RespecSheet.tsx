import { useState } from 'react';
import { useGame, useSel } from '../store';
import { STAT_KEYS, STAT_NAMES, type StatKey } from '@/engine';
import { BALANCE, MATERIALS } from '@/content';
import { Sheet } from '../shell/Sheet';
import { Plate } from '@/render/Plate';

/** Pour your levels out and back: a sheet of six steppers, each with 48px targets, and a confirm that says what it costs. */
export function RespecSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const stats = useSel((s) => JSON.stringify(s.player.stats));
  const bones = useSel((s) => s.materials.reliquaryBone ?? 0);
  const free = useSel((s) => s.player.respecs > 0);
  const cur = JSON.parse(stats) as Record<StatKey, number>;
  const min = BALANCE.level.startingStats;
  const total = STAT_KEYS.reduce((a, k) => a + cur[k], 0);
  const [next, setNext] = useState<Record<StatKey, number>>(() => ({ ...cur }));
  const spent = STAT_KEYS.reduce((a, k) => a + next[k], 0);
  const spare = total - spent;
  const bump = (k: StatKey, d: number) => setNext((n) => ({ ...n, [k]: Math.max(min[k], n[k] + d) }));
  return (
    <Sheet open={open} onClose={onClose} material="stone" title="Reallocate">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[15px]" style={{ color: 'var(--bone)' }}><span className="w-8 h-8"><Plate kind="item" id="reliquaryBone" className="w-full h-full object-contain" /></span><span>{free ? 'This one is free.' : `Costs one Reliquary Bone (you hold ${bones}).`}</span></div>
        <p className="t-lore text-[14px]">{MATERIALS.reliquaryBone.lore}</p>
        <div className="flex items-baseline justify-between"><span className="t-label">Points to place</span><span className="t-num text-[24px]" style={{ color: spare === 0 ? 'var(--parchment)' : 'var(--ember-hot)' }}>{spare}</span></div>
        {STAT_KEYS.map((k) => (
          <div key={k} className="grid grid-cols-[1fr_48px_56px_48px] items-center gap-2">
            <span className="text-[16px]" style={{ color: 'var(--parchment)' }}>{STAT_NAMES[k]}<span className="t-label ml-2">base {min[k]}</span></span>
            <button className="btn min-w-[48px] min-h-[48px] px-0" disabled={next[k] <= min[k]} onClick={() => bump(k, -1)} aria-label={`Lower ${STAT_NAMES[k]}`}>−</button>
            <span className="t-num text-[22px] text-center" style={{ color: 'var(--parchment)' }}>{next[k]}</span>
            <button className="btn min-w-[48px] min-h-[48px] px-0" disabled={spare <= 0} onClick={() => bump(k, +1)} aria-label={`Raise ${STAT_NAMES[k]}`}>+</button>
          </div>
        ))}
        <button className="btn btn-ember min-h-[56px]" disabled={spare !== 0 || (!free && bones <= 0)} onClick={() => { dispatch({ type: 'respec', stats: next }); onClose(); }}>
          {spare !== 0 ? `Place ${spare} more` : 'Pour and re-pour'}
        </button>
      </div>
    </Sheet>
  );
}
