import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, humanityPreview, canKindle, kindleLedger, nodeCost, nodeBlocked, computeMods } from '@/engine';
import { TREE, BRANCH_INFO } from '@/content';
import { Tooltip } from './Tooltip';

export const KindlePanel = memo(function KindlePanel() {
  const dispatch = useGame((g) => g.dispatch);
  const kindles = useSel((s) => s.prestige.kindles);
  const humanity = useSel((s) => s.prestige.humanity.toString());
  const total = useSel((s) => s.prestige.humanityTotal.toString());
  const preview = useSel((s) => humanityPreview(s).toString());
  const why = useSel((s) => canKindle(s));
  const ledger = useSel((s) => JSON.stringify(kindleLedger(s)));
  const cycleSouls = useSel((s) => s.stats.cycleSouls.toString());
  const cycleBosses = useSel((s) => s.stats.cycleBosses);
  const cycleTime = useSel((s) => Math.floor(s.stats.cycleTime / 60));
  const [confirm, setConfirm] = useState(false);
  const L = JSON.parse(ledger) as { keep: string[]; lose: string[] };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg text-ember-400">Kindle the Flame</span>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">{kindles === 0 ? 'First cycle' : `New Game+${kindles}`}</span>
      </div>
      <div className="border border-ash-700 rounded-sm p-2 text-[12px] flex flex-col gap-1">
        <div className="flex justify-between"><span className="text-bone-400">Humanity held</span><span className="font-num text-ember-400">{fmt(D(humanity))}</span><span className="text-bone-400">of {fmt(D(total))} ever</span></div>
        <div className="flex justify-between"><span className="text-bone-400">This cycle</span><span className="font-num text-bone-200">{fmt(D(cycleSouls))} souls · {cycleBosses} lords · {cycleTime} min</span></div>
        <Tooltip tip="Humanity = (cycle souls ÷ 5,000)^0.42 × 1.15 per lord felled × (1 + 4% per deepest tier) × your Humanity bonuses. The curve is sub-linear: kindling twice as often gathers more than waiting twice as long.">
          <div className="flex justify-between cursor-help"><span className="text-bone-400">Kindling now gathers</span><span className="font-num text-ember-400 text-base">+{fmt(D(preview))} Humanity</span></div>
        </Tooltip>
      </div>
      {!confirm ? (
        <button className={`btn ${why ? '' : 'btn-ember'}`} disabled={!!why} title={why ?? ''} onClick={() => setConfirm(true)}>{why ?? 'Kindle…'}</button>
      ) : (
        <div className="border border-ember-700 rounded-sm p-2 text-[12px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Kept</div>{L.keep.map((k) => <div key={k} className="text-bone-300">· {k}</div>)}</div>
            <div><div className="text-[10px] uppercase tracking-widest text-blood-500 mb-1">Turned to ash</div>{L.lose.map((k) => <div key={k} className="text-bone-300">· {k}</div>)}</div>
          </div>
          <div className="text-bone-400">Enemies of the next cycle carry ×1.6 HP and ×1.28 damage, but yield ×1.45 souls and ×1.3 drops, and new kinds of them walk the road.</div>
          <div className="flex gap-2">
            <button className="btn btn-ember" onClick={() => { dispatch({ type: 'kindle' }); setConfirm(false); }}>Kindle the flame</button>
            <button className="btn" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        </div>
      )}
      <Tree />
    </div>
  );
});

function Tree() {
  const dispatch = useGame((g) => g.dispatch);
  const ranks = useSel((s) => JSON.stringify(s.prestige.tree));
  const humanity = useSel((s) => s.prestige.humanity.toString());
  const blocked = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(TREE).map((id) => [id, nodeBlocked(s, id)]))));
  const costs = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(TREE).map((id) => [id, nodeCost(s, id).toString()]))));
  const R = JSON.parse(ranks) as Record<string, number>;
  const B = JSON.parse(blocked) as Record<string, string | null>;
  const C = JSON.parse(costs) as Record<string, string>;
  const branches = ['ember', 'bone', 'shadow', 'flame'] as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-widest text-bone-400">The Humanity tree · permanent · <span className="font-num text-ember-400">{fmt(D(humanity))}</span> to spend</div>
      {branches.map((b) => {
        const nodes = Object.values(TREE).filter((n) => n.branch === b);
        const rows = Math.max(...nodes.map((n) => n.pos.y)) + 1;
        return (
          <div key={b} className="border border-ash-700 rounded-sm p-2">
            <Tooltip tip={BRANCH_INFO[b].desc}><div className="font-display text-sm text-bone-200 cursor-help mb-1">{BRANCH_INFO[b].name}</div></Tooltip>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {Array.from({ length: rows }, (_, y) => Array.from({ length: 3 }, (_, x) => {
                const n = nodes.find((k) => k.pos.x === x && k.pos.y === y);
                if (!n) return <div key={`${x}${y}`} />;
                const rank = R[n.id] ?? 0;
                const why = B[n.id];
                const maxed = rank >= n.maxRank;
                const isAuto = Object.keys(n.effect).some((k) => k.startsWith('unlock'));
                return (
                  <Tooltip key={n.id} tip={<div><div className="font-display text-base">{n.name}</div><div>{n.desc}</div><div className="font-num text-bone-400 mt-1">rank {rank}/{n.maxRank} · next costs {C[n.id]} Humanity{n.requires.length ? ` · requires ${n.requires.map((r) => TREE[r].name).join(', ')}` : ''}</div>{why && !maxed && <div className="text-blood-500 mt-1">{why}</div>}</div>}>
                    <button
                      className={`w-full text-left rounded-sm border px-1.5 py-1 text-[11px] leading-tight ${maxed ? 'border-ember-600 bg-ember-700/30 text-ember-400' : why ? 'border-ash-700 text-bone-400' : 'border-ember-500 text-bone-100 hover:bg-ember-700/30'} ${isAuto ? 'italic' : ''}`}
                      disabled={!!why}
                      onClick={() => dispatch({ type: 'buyTreeNode', node: n.id })}
                    >
                      <div className="truncate">{n.name}</div>
                      <div className="font-num text-[10px] text-bone-400">{rank}/{n.maxRank}{maxed ? '' : ` · ${C[n.id]}`}</div>
                    </button>
                  </Tooltip>
                );
              }))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
