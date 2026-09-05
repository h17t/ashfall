import { memo } from 'react';
import { useGame, useSel } from '../store';
import { bankedPreview, bankMult, killsNeeded, fmt, D } from '@/engine';
import { BOONS } from '@/content';
import { Tooltip } from './Tooltip';

/** The run at a glance, in the hand: floor, haul, what it banks, and the way out. */
export const DescentStrip = memo(function DescentStrip() {
  const dispatch = useGame((g) => g.dispatch);
  const active = useSel((s) => !!s.descent.run);
  const floor = useSel((s) => s.descent.run?.floor ?? 0);
  const kills = useSel((s) => s.descent.run?.kills ?? 0);
  const need = useSel((s) => (s.descent.run ? killsNeeded(s.descent.run) : 0));
  const haul = useSel((s) => s.descent.run?.haul.toString() ?? '0');
  const banked = useSel((s) => (s.descent.run ? bankedPreview(s.descent.run).toString() : '0'));
  const mult = useSel((s) => (s.descent.run ? bankMult(s.descent.run) : 1));
  const boons = useSel((s) => s.descent.run?.boons.join(',') ?? '');
  const dead = useSel((s) => s.deathScreen > 0);
  if (!active) return null;
  const list = boons.split(',').filter(Boolean);
  const counts = list.reduce<Record<string, number>>((a, b) => { a[b] = (a[b] ?? 0) + 1; return a; }, {});
  return (
    <div className="descent-strip" role="region" aria-label="The Stair">
      <div className="min-w-0 flex-1">
        <div className="t-label flex items-center gap-1 whitespace-nowrap">
          <span>Floor <span className="t-num" style={{ color: 'var(--parchment)' }}>{floor}</span> · <span className="t-num">{kills}/{need}</span> kills</span>
          {list.length > 0 && (
            <Tooltip mode="inline" tip={<div className="flex flex-col gap-2"><div className="t-label">Boons this run</div>{Object.entries(counts).map(([id, n]) => <div key={id}><span className="t-display text-[17px]">{BOONS[id]?.name ?? id}{n > 1 ? ` ×${n}` : ''}</span><span className="block text-[14px]" style={{ color: 'var(--bone)' }}>{BOONS[id]?.text}</span></div>)}</div>}>
              <span>· <span className="t-num" style={{ color: 'var(--parchment)' }}>{list.length}</span> boon{list.length === 1 ? '' : 's'}</span>
            </Tooltip>
          )}
        </div>
        <div className="text-[15px] leading-tight mt-0.5" style={{ color: 'var(--bone)' }}>Haul <span className="t-num" style={{ color: 'var(--parchment)' }}>{fmt(D(haul))}</span> → banks <span className="t-num" style={{ color: 'var(--ember-hot)' }}>{fmt(D(banked))}</span> <span className="t-num text-[12px]">×{mult.toFixed(2)}</span></div>
      </div>
      <button className="btn min-h-[48px] shrink-0" disabled={dead} onClick={() => dispatch({ type: 'descentWithdraw' })}>Withdraw</button>
    </div>
  );
});
