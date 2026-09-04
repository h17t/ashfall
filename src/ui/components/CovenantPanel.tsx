import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, covenantAvailable, switchCost, upgradeCost } from '@/engine';
import { COVENANTS, getZone } from '@/content';
import { Tooltip } from './Tooltip';

export const CovenantPanel = memo(function CovenantPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const current = useSel((s) => s.covenant.current);
  const cost = useSel((s) => switchCost(s).toString());
  const souls = useSel((s) => s.souls.toString());
  const maxRegion = useSel((s) => Math.max(...s.unlockedZones.map((z) => getZone(z).region)));
  const reps = useSel((s) => JSON.stringify(s.covenant.rep));
  const ups = useSel((s) => JSON.stringify(s.covenant.upgrades));
  const availability = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(COVENANTS).map((id) => [id, covenantAvailable(s, id)]))));
  const costs = useSel((s) => JSON.stringify(Object.fromEntries(Object.values(COVENANTS).flatMap((c) => c.upgrades.map((u) => [u.id, upgradeCost(s, c.id, u.id).toString()])))));
  const rep = JSON.parse(reps) as Record<string, number>;
  const upgrades = JSON.parse(ups) as Record<string, number>;
  const avail = JSON.parse(availability) as Record<string, string | null>;
  const upCost = JSON.parse(costs) as Record<string, string>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg text-ember-400">Covenants</span>
        <Tooltip tip="One oath at a time. The first is free; each new oath after that costs three level-ups' worth of souls, growing by half each time. Standing (reputation) is kept forever, even through Kindling."><span className="text-[10px] uppercase tracking-widest text-bone-400 cursor-help">{current ? `sworn: ${COVENANTS[current].name}` : 'unsworn'} · next oath {fmt(D(cost))}</span></Tooltip>
      </div>
      {Object.values(COVENANTS).filter((c) => c.region <= maxRegion || c.id === current).map((c) => {
        const isCurrent = c.id === current;
        const why = avail[c.id];
        return (
          <div key={c.id} className={`border rounded-sm p-2 flex flex-col gap-1 ${isCurrent ? 'border-ember-600' : 'border-ash-700'}`}>
            <div className="flex items-baseline justify-between">
              <Tooltip tip={<span className="italic">{c.lore}</span>}><span className="font-display text-base text-bone-100 cursor-help">{c.name}</span></Tooltip>
              <span className="text-[10px] uppercase tracking-widest text-bone-400">standing <span className="font-num text-bone-200">{rep[c.id] ?? 0}</span></span>
            </div>
            <div className="text-[11px] italic text-bone-400">{c.epithet}</div>
            <div className="text-[12px] text-bone-200">{c.desc}</div>
            <div className="flex gap-2 items-center">
              {isCurrent ? (
                <button className="btn text-[11px]" onClick={() => dispatch({ type: 'joinCovenant', covenant: null })}>Forsake</button>
              ) : (
                <button className={`btn text-[11px] ${why || D(souls).lt(D(cost)) ? '' : 'btn-ember'}`} disabled={!!why || D(souls).lt(D(cost))} title={why ?? ''} onClick={() => dispatch({ type: 'joinCovenant', covenant: c.id })}>Swear{why ? ` — ${why}` : cost !== '0' ? ` · ${fmt(D(cost))}` : ''}</button>
              )}
            </div>
            {(isCurrent || (rep[c.id] ?? 0) > 0) && (
              <div className="flex flex-col gap-1 mt-1">
                {c.upgrades.map((u) => {
                  const rank = upgrades[u.id] ?? 0;
                  const locked = (rep[c.id] ?? 0) < u.repReq;
                  const maxed = rank >= u.maxRank;
                  const canBuy = isCurrent && !locked && !maxed && D(souls).gte(D(upCost[u.id]));
                  return (
                    <div key={u.id} className="flex items-center justify-between text-[11px] gap-2">
                      <Tooltip tip={<span>{u.desc} Requires {u.repReq} standing. Costs {u.cost}× your level-up cost, doubling per rank. Applies only while sworn here.</span>}>
                        <span className={`cursor-help ${locked ? 'text-bone-400' : 'text-bone-200'}`}>{u.name} <span className="font-num text-ember-400">{rank}/{u.maxRank}</span>{locked && <span className="text-bone-400"> · needs {u.repReq}</span>}</span>
                      </Tooltip>
                      {!maxed && <button className={`btn text-[10px] px-2 py-0.5 ${canBuy ? 'btn-ember' : ''}`} disabled={!canBuy} onClick={() => dispatch({ type: 'buyCovenantUpgrade', upgrade: u.id })}>{fmt(D(upCost[u.id]))}</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
