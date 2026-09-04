import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, sigilMarksPreview, canSigil, sigilLedger, sigilUnlockCost, sigilUnlockBlocked, canAgeOfDark, darkLevelCost, DARK_LEVEL_GIFTS } from '@/engine';
import { SIGIL_UNLOCKS, BALANCE } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';

export const SigilPanel = memo(function SigilPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const sigils = useSel((s) => s.prestige.sigils);
  const marks = useSel((s) => s.prestige.sigilMarks.toString());
  const preview = useSel((s) => sigilMarksPreview(s).toString());
  const why = useSel((s) => canSigil(s));
  const ledger = useSel((s) => JSON.stringify(sigilLedger(s)));
  const kindles = useSel((s) => s.prestige.kindles);
  const darkLevel = useSel((s) => s.prestige.darkLevel);
  const darkWhy = useSel((s) => canAgeOfDark(s));
  const darkCost = useSel((s) => darkLevelCost(s).toString());
  const record = useSel((s) => s.prestige.abyssRecord);
  const [confirm, setConfirm] = useState(false);
  const L = JSON.parse(ledger) as { keep: string[]; lose: string[] };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] flex items-center gap-2" style={{ color: 'var(--soul)' }}><span className="w-12 h-6 -my-1 inline-block" style={{ filter: 'hue-rotate(190deg) saturate(0.6) brightness(1.3)' }}><Plate kind="ui" id="bloodstain" className="w-full h-full object-contain" /></span>The Dark Sigil</span>
        <span className="t-label">{sigils} carved · NG+{kindles}{record > 0 ? ` · depth record ${record}` : ''}</span>
      </div>
      <div className="border border-ash/50 p-2 text-[14px] flex flex-col gap-1">
        <div className="flex justify-between"><span className="text-bone/70">Sigil Marks held</span><span className="font-num text-soul">{fmt(D(marks))}</span></div>
        <Tooltip tip={<span>Marks = (all Humanity ever gathered this Sigil ÷ {BALANCE.prestige.sigilMarkDivisor})^{BALANCE.prestige.sigilMarkExponent} × √(NG+ ÷ {BALANCE.prestige.sigilAt}) × (1 + 10% per Abyss depth record). Opens at NG+{BALANCE.prestige.sigilAt}.</span>}>
          <div className="flex justify-between cursor-help"><span className="text-bone/70">Carving now gathers</span><span className="font-num text-soul text-[16px]">+{fmt(D(preview))} Marks</span></div>
        </Tooltip>
      </div>
      {!confirm ? (
        <button className={`btn ${why ? '' : 'border-soul text-soul'}`} disabled={!!why} title={why ?? ''} onClick={() => setConfirm(true)}>{why ?? 'Carve the Sigil…'}</button>
      ) : (
        <div className="border border-soul/60 p-2 text-[14px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div><div className="t-label text-verdigris mb-1">Kept</div>{L.keep.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
            <div><div className="t-label text-blood-bright mb-1">Unmade</div>{L.lose.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn border-soul text-soul" onClick={() => { dispatch({ type: 'darkSigil' }); setConfirm(false); }}>Carve it</button>
            <button className="btn" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        </div>
      )}
      <Unlocks />
      <div className="border-t border-ash/50 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[16px] text-parchment">The Age of Dark</span>
          <span className="t-label">Dark Level <span className="font-num text-parchment">{darkLevel}</span></span>
        </div>
        <p className="text-[13px] text-bone/70 mt-1">Each Dark Level: ×1.5 damage and souls, ×1.25 Humanity, forever. Costs Sigil Marks, rising ×1.7. {DARK_LEVEL_GIFTS[darkLevel + 1] ? `Next: ${DARK_LEVEL_GIFTS[darkLevel + 1].name} — ${DARK_LEVEL_GIFTS[darkLevel + 1].desc}` : 'Beyond the last gift, only the multiplier remains, and it does not stop.'}</p>
        <button className={`btn mt-2 ${darkWhy ? '' : 'btn-ember'}`} disabled={!!darkWhy} title={darkWhy ?? ''} onClick={() => dispatch({ type: 'ageOfDark' })}>{darkWhy ?? `${darkLevel === 0 ? 'Begin the Age of Dark' : `Dark Level ${darkLevel + 1}`} · ${fmt(D(darkCost))} Marks`}</button>
      </div>
    </div>
  );
});

function Unlocks() {
  const dispatch = useGame((g) => g.dispatch);
  const ranks = useSel((s) => JSON.stringify(s.prestige.sigilUnlocks));
  const blocked = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(SIGIL_UNLOCKS).map((id) => [id, sigilUnlockBlocked(s, id)]))));
  const costs = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(SIGIL_UNLOCKS).map((id) => [id, sigilUnlockCost(s, id).toString()]))));
  const R = JSON.parse(ranks) as Record<string, number>;
  const B = JSON.parse(blocked) as Record<string, string | null>;
  const C = JSON.parse(costs) as Record<string, string>;
  return (
    <div className="flex flex-col gap-1">
      <div className="t-label">Sigil marks · structural · permanent</div>
      {Object.values(SIGIL_UNLOCKS).map((u) => {
        const rank = R[u.id] ?? 0;
        const why = B[u.id];
        const done = rank >= u.maxRank;
        return (
          <div key={u.id} className={`flex items-center justify-between gap-2 border  px-2 py-1 text-[14px] ${done ? 'border-soul/60' : 'border-ash/50'}`}>
            <Tooltip className="flex-1" tip={<div><div className="font-display text-[16px]">{u.name}</div><div>{u.desc}</div>{u.requires.length > 0 && <div className="text-bone/70 mt-1">Requires {u.requires.map((r) => SIGIL_UNLOCKS[r].name).join(', ')}.</div>}</div>}>
              <div className="cursor-help"><span className={done ? 'text-soul' : 'text-parchment'}>{u.name}</span> <span className="font-num text-bone/70">{rank}/{u.maxRank}</span></div>
            </Tooltip>
            {!done && <button className={`btn text-[12px] px-2 py-0.5 ${why ? '' : 'border-soul text-soul'}`} disabled={!!why} title={why ?? ''} onClick={() => dispatch({ type: 'buySigilUnlock', unlock: u.id })}>{C[u.id]} ¶</button>}
          </div>
        );
      })}
    </div>
  );
}
