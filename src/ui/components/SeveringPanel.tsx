import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, threadsPreview, canSever, severLedger, severingUnlockCost, severingUnlockBlocked, canUnmake, unmakingCost, UNMAKING_GIFTS } from '@/engine';
import { wakingName } from '@/engine/prestige';
import { SEVERING_UNLOCKS, BALANCE } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';

export const SeveringPanel = memo(function SeveringPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const severings = useSel((s) => s.prestige.severings);
  const marks = useSel((s) => s.prestige.threads.toString());
  const preview = useSel((s) => threadsPreview(s).toString());
  const why = useSel((s) => canSever(s));
  const ledger = useSel((s) => JSON.stringify(severLedger(s)));
  const wakings = useSel((s) => s.prestige.wakings);
  const unmaking = useSel((s) => s.prestige.unmaking);
  const darkWhy = useSel((s) => canUnmake(s));
  const darkCost = useSel((s) => unmakingCost(s).toString());
  const record = useSel((s) => s.prestige.nadirRecord);
  const [confirm, setConfirm] = useState(false);
  const L = JSON.parse(ledger) as { keep: string[]; lose: string[] };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] flex items-center gap-2" style={{ color: 'var(--wisp)' }}><span className="w-12 h-6 -my-1 inline-block" style={{ filter: 'hue-rotate(190deg) saturate(0.6) brightness(1.3)' }}><Plate kind="ui" id="remains" className="w-full h-full object-contain" /></span>The Dark Severing</span>
        <span className="t-label">{severings} carved · {wakingName(wakings)}{record > 0 ? ` · depth record ${record}` : ''}</span>
      </div>
      <div className="border border-ash/50 p-2 text-[14px] flex flex-col gap-1">
        <div className="flex justify-between"><span className="text-bone/70">Severing Marks held</span><span className="font-num text-wisp">{fmt(D(marks))}</span></div>
        <Tooltip tip={<span>Marks = (all Vestige ever gathered this Severing ÷ {BALANCE.prestige.threadDivisor})^{BALANCE.prestige.threadExponent} × √(Waking ÷ {BALANCE.prestige.severingAt}) × (1 + 10% per Nadir depth record). Opens at Waking {BALANCE.prestige.severingAt}.</span>}>
          <div className="flex justify-between cursor-help"><span className="text-bone/70">Carving now gathers</span><span className="font-num text-wisp text-[16px]">+{fmt(D(preview))} Marks</span></div>
        </Tooltip>
      </div>
      {!confirm ? (
        <button className={`btn ${why ? '' : 'border-wisp text-wisp'}`} disabled={!!why} title={why ?? ''} onClick={() => setConfirm(true)}>{why ?? 'Carve the Severing…'}</button>
      ) : (
        <div className="border border-wisp/60 p-2 text-[14px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div><div className="t-label mb-1" style={{ color: 'var(--parchment)' }}><span aria-hidden className="inline-block w-2 h-2 mr-2" style={{ background: 'var(--verdigris)' }} />Kept</div>{L.keep.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
            <div><div className="t-label mb-1" style={{ color: 'var(--parchment)' }}><span aria-hidden className="inline-block w-2 h-2 mr-2" style={{ background: 'var(--blood-bright)' }} />Unmade</div>{L.lose.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn border-wisp text-wisp" onClick={() => { dispatch({ type: 'sever' }); setConfirm(false); }}>Carve it</button>
            <button className="btn" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        </div>
      )}
      <Unlocks />
      <div className="border-t border-ash/50 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[16px] text-parchment">The Unmaking</span>
          <span className="t-label">Dark Level <span className="font-num text-parchment">{unmaking}</span></span>
        </div>
        <p className="text-[13px] text-bone/70 mt-1">Each Dark Level: ×1.5 damage and marrow, ×1.25 Vestige, forever. Costs Severing Marks, rising ×1.7. {UNMAKING_GIFTS[unmaking + 1] ? `Next: ${UNMAKING_GIFTS[unmaking + 1].name} — ${UNMAKING_GIFTS[unmaking + 1].desc}` : 'Beyond the last gift, only the multiplier remains, and it does not stop.'}</p>
        <button className={`btn mt-2 ${darkWhy ? '' : 'btn-ember'}`} disabled={!!darkWhy} title={darkWhy ?? ''} onClick={() => dispatch({ type: 'unmake' })}>{darkWhy ?? `${unmaking === 0 ? 'Begin the Unmaking' : `Dark Level ${unmaking + 1}`} · ${fmt(D(darkCost))} Marks`}</button>
      </div>
    </div>
  );
});

function Unlocks() {
  const dispatch = useGame((g) => g.dispatch);
  const ranks = useSel((s) => JSON.stringify(s.prestige.severingUnlocks));
  const blocked = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(SEVERING_UNLOCKS).map((id) => [id, severingUnlockBlocked(s, id)]))));
  const costs = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(SEVERING_UNLOCKS).map((id) => [id, severingUnlockCost(s, id).toString()]))));
  const R = JSON.parse(ranks) as Record<string, number>;
  const B = JSON.parse(blocked) as Record<string, string | null>;
  const C = JSON.parse(costs) as Record<string, string>;
  return (
    <div className="flex flex-col gap-1">
      <div className="t-label">Severing marks · structural · permanent</div>
      {Object.values(SEVERING_UNLOCKS).map((u) => {
        const rank = R[u.id] ?? 0;
        const why = B[u.id];
        const done = rank >= u.maxRank;
        return (
          <div key={u.id} className={`flex items-center justify-between gap-2 border  px-2 py-1 text-[14px] ${done ? 'border-wisp/60' : 'border-ash/50'}`}>
            <Tooltip className="flex-1" tip={<div><div className="font-display text-[16px]">{u.name}</div><div>{u.desc}</div>{u.requires.length > 0 && <div className="text-bone/70 mt-1">Requires {u.requires.map((r) => SEVERING_UNLOCKS[r].name).join(', ')}.</div>}</div>}>
              <div className="cursor-help"><span className={done ? 'text-wisp' : 'text-parchment'}>{u.name}</span> <span className="font-num text-bone/70">{rank}/{u.maxRank}</span></div>
            </Tooltip>
            {!done && <button className={`btn text-[12px] px-2 py-0.5 ${why ? '' : 'border-wisp text-wisp'}`} disabled={!!why} title={why ?? ''} onClick={() => dispatch({ type: 'buySeveringUnlock', unlock: u.id })}>{C[u.id]} ¶</button>}
          </div>
        );
      })}
    </div>
  );
}
