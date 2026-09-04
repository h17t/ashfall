import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, covenantAvailable, switchCost, upgradeCost } from '@/engine';
import { COVENANTS, getZone } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';

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
        <span className="t-display text-[20px] text-ember-hot">Covenants</span>
        <Tooltip tip="One oath at a time. The first is free; each new oath after that costs three level-ups' worth of souls, growing by half each time. Standing (reputation) is kept forever, even through Kindling."><span className="t-label cursor-help">{current ? `sworn: ${COVENANTS[current].name}` : 'unsworn'} · next oath {fmt(D(cost))}</span></Tooltip>
      </div>
      {Object.values(COVENANTS).filter((c) => c.region <= maxRegion || c.id === current).map((c) => {
        const isCurrent = c.id === current;
        const why = avail[c.id];
        return (
          <div key={c.id} className={`relative border p-2 pl-[70px] flex flex-col gap-1 ${isCurrent ? 'border-ember' : 'border-ash/50'}`}>
            <div className="absolute left-1.5 top-1.5 w-[56px] h-[56px]" style={{ opacity: isCurrent || (rep[c.id] ?? 0) > 0 ? 1 : 0.6, filter: 'drop-shadow(-2px 3px 4px var(--void))' }}><Plate kind="covenant" id={c.id} className="w-full h-full object-contain" /></div>
            <div className="flex items-baseline justify-between">
              <Tooltip tip={<span className="italic">{c.lore}</span>}><span className="font-display text-[16px] text-parchment cursor-help">{c.name}</span></Tooltip>
              <span className="t-label">standing <span className="font-num text-parchment">{rep[c.id] ?? 0}</span></span>
            </div>
            <div className="text-[13px] italic text-bone/70">{c.epithet}</div>
            <div className="text-[14px] text-parchment">{c.desc}</div>
            <div className="flex gap-2 items-center">
              {isCurrent ? (
                <button className="btn text-[13px]" onClick={() => dispatch({ type: 'joinCovenant', covenant: null })}>Forsake</button>
              ) : (
                <button className={`btn text-[13px] ${why || D(souls).lt(D(cost)) ? '' : 'btn-ember'}`} disabled={!!why || D(souls).lt(D(cost))} title={why ?? ''} onClick={() => dispatch({ type: 'joinCovenant', covenant: c.id })}>Swear{why ? ` — ${why}` : cost !== '0' ? ` · ${fmt(D(cost))}` : ''}</button>
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
                    <div key={u.id} className="flex items-center justify-between text-[13px] gap-2">
                      <Tooltip tip={<span>{u.desc} Requires {u.repReq} standing. Costs {u.cost}× your level-up cost, doubling per rank. Applies only while sworn here.</span>}>
                        <span className={`cursor-help ${locked ? 'text-bone/70' : 'text-parchment'}`}>{u.name} <span className="font-num text-ember-hot">{rank}/{u.maxRank}</span>{locked && <span className="text-bone/70"> · needs {u.repReq}</span>}</span>
                      </Tooltip>
                      {!maxed && <button className={`btn text-[12px] px-2 py-0.5 ${canBuy ? 'btn-ember' : ''}`} disabled={!canBuy} onClick={() => dispatch({ type: 'buyCovenantUpgrade', upgrade: u.id })}>{fmt(D(upCost[u.id]))}</button>}
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
