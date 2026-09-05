import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, vestigePreview, canSnuff, snuffLedger, nodeCost, nodeBlocked, computeMods } from '@/engine';
import { wakingName } from '@/engine/prestige';
import { TREE, BRANCH_INFO } from '@/content';
import { Tooltip } from './Tooltip';
import { Slab } from '@/render/materials/Slab';
import { setSnuffLedger } from '@/render/cinematics/ledger';

export const SnuffPanel = memo(function SnuffPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const wakings = useSel((s) => s.prestige.wakings);
  const vestige = useSel((s) => s.prestige.vestige.toString());
  const total = useSel((s) => s.prestige.vestigeTotal.toString());
  const preview = useSel((s) => vestigePreview(s).toString());
  const why = useSel((s) => canSnuff(s));
  const ledger = useSel((s) => JSON.stringify(snuffLedger(s)));
  const cycleMarrow = useSel((s) => s.stats.cycleMarrow.toString());
  const cycleBosses = useSel((s) => s.stats.cycleBosses);
  const cycleTime = useSel((s) => Math.floor(s.stats.cycleTime / 60));
  const [confirm, setConfirm] = useState(false);
  const L = JSON.parse(ledger) as { keep: string[]; lose: string[] };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] text-ember-hot">Snuff the Flame</span>
        <span className="t-label">{wakingName(wakings)}</span>
      </div>
      <div className="border border-ash/50 p-2 text-[14px] flex flex-col gap-1">
        <div className="flex justify-between"><span className="text-bone/70">Vestige held</span><span className="font-num text-ember-hot">{fmt(D(vestige))}</span><span className="text-bone/70">of {fmt(D(total))} ever</span></div>
        <div className="flex justify-between"><span className="text-bone/70">This cycle</span><span className="font-num text-parchment">{fmt(D(cycleMarrow))} marrow · {cycleBosses} lords · {cycleTime} min</span></div>
        <Tooltip label="How Vestige is reckoned" tip="Vestige = (cycle marrow ÷ 5,000)^0.42 × 1.15 per lord felled × 1.06 per tier of depth reached × your Vestige bonuses. The curve is sub-linear: rendering twice as often gathers more than waiting twice as long.">
          <div className="flex justify-between cursor-help"><span className="text-bone/70">Snuffing now gathers</span><span className="font-num text-ember-hot text-[16px]">+{fmt(D(preview))} Vestige</span></div>
        </Tooltip>
      </div>
      {!confirm ? (
        <button className={`btn ${why ? '' : 'btn-ember'}`} disabled={!!why} title={why ?? ''} onClick={() => setConfirm(true)}>{why ?? 'Snuff…'}</button>
      ) : (
        <div className="border border-ember p-2 text-[14px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div><div className="t-label mb-1" style={{ color: 'var(--parchment)' }}><span aria-hidden className="inline-block w-2 h-2 mr-2" style={{ background: 'var(--verdigris)' }} />Kept</div>{L.keep.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
            <div><div className="t-label mb-1" style={{ color: 'var(--parchment)' }}><span aria-hidden className="inline-block w-2 h-2 mr-2" style={{ background: 'var(--blood-bright)' }} />Turned to ash</div>{L.lose.map((k) => <div key={k} className="text-bone">· {k}</div>)}</div>
          </div>
          <div className="text-bone/70">Enemies of the next cycle carry ×1.6 HP and ×1.28 damage, but yield ×1.45 marrow and ×1.3 drops, and new kinds of them walk the road.</div>
          <div className="flex gap-2">
            <button className="btn btn-ember" onClick={() => { setSnuffLedger({ keep: L.keep, lose: L.lose, cycle: wakings + 1 }); dispatch({ type: 'snuff' }); setConfirm(false); }}>Snuff the flame</button>
            <button className="btn" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        </div>
      )}
      <Tree />
    </div>
  );
});

/**
 * The Vestige tree as an illuminated page: four vines on parchment, medallions joined by drawn
 * stems, rank pips beneath each, mote where a node is complete, ash where it is not yet open.
 */
function Tree() {
  const dispatch = useGame((g) => g.dispatch);
  const ranks = useSel((s) => JSON.stringify(s.prestige.tree));
  const vestige = useSel((s) => s.prestige.vestige.toString());
  const blocked = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(TREE).map((id) => [id, nodeBlocked(s, id)]))));
  const costs = useSel((s) => JSON.stringify(Object.fromEntries(Object.keys(TREE).map((id) => [id, nodeCost(s, id).toString()]))));
  const R = JSON.parse(ranks) as Record<string, number>;
  const B = JSON.parse(blocked) as Record<string, string | null>;
  const C = JSON.parse(costs) as Record<string, string>;
  const branches = ['wick', 'bone', 'shadow', 'flame'] as const;
  const COL = 108, ROW = 96, PAD = 18;
  return (
    <Slab material="parchment" seed="tree" rough={8} ornament="fold" className="px-4 pt-3 pb-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[18px]" style={{ color: 'var(--ink)' }}>The Vestige Tree</span>
        <span className="t-label" style={{ color: 'var(--ash)' }}>permanent · <span className="font-num" style={{ color: 'var(--ember)' }}>{fmt(D(vestige))}</span> to spend</span>
      </div>
      {branches.map((b) => {
        const nodes = Object.values(TREE).filter((n) => n.branch === b);
        const rows = Math.max(...nodes.map((n) => n.pos.y)) + 1;
        const w = COL * 3 + PAD * 2, h = ROW * rows + 4;
        const at = (n: { pos: { x: number; y: number } }) => ({ x: PAD + n.pos.x * COL + COL / 2, y: 22 + n.pos.y * ROW });
        return (
          <div key={b}>
            <Tooltip className="tree-branch-title" tip={BRANCH_INFO[b].desc}><div className="t-display text-[15px] cursor-help" style={{ color: 'var(--stone)', letterSpacing: '0.1em' }}>{BRANCH_INFO[b].name}</div></Tooltip>
            <div className="relative" style={{ width: w, height: h, maxWidth: '100%' }}>
              <svg className="absolute inset-0" width={w} height={h} aria-hidden>
                {nodes.flatMap((n) => n.requires.map((req) => {
                  const a = at(TREE[req]), c = at(n);
                  const lit = (R[req] ?? 0) > 0;
                  const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2 + 6;
                  return <path key={req + n.id} d={`M${a.x} ${a.y + 54} Q${mx} ${my + 20} ${c.x} ${c.y - 16}`} fill="none" stroke={lit ? 'var(--ember)' : 'var(--ash)'} strokeWidth={lit ? 2 : 1.2} strokeDasharray={lit ? undefined : '3 4'} opacity={lit ? 0.9 : 0.6} />;
                }))}
              </svg>
              {nodes.map((n) => {
                const p = at(n);
                const rank = R[n.id] ?? 0;
                const why = B[n.id];
                const maxed = rank >= n.maxRank;
                const open = !why;
                const isAuto = Object.keys(n.effect).some((k) => k.startsWith('unlock'));
                const ring = maxed || open ? 'var(--ember)' : 'var(--ash)';
                const fill = maxed ? 'var(--ember)' : rank > 0 ? 'color-mix(in srgb, var(--ember) 45%, var(--parchment))' : 'color-mix(in srgb, var(--parchment) 70%, var(--bone))';
                const shape = isAuto ? '15,1 29,15 15,29 1,15' : '15,1 27,8 27,22 15,29 3,22 3,8';
                return (
                  <div key={n.id} className="absolute flex flex-col items-center" style={{ left: p.x - COL / 2, top: p.y - 15, width: COL }}>
                    <Tooltip label={n.name} tip={<div><div className="font-display text-[16px]">{n.name}</div><div>{n.desc}</div><div className="font-num mt-1" style={{ color: 'var(--ash)' }}>rank {rank}/{n.maxRank} · next costs {C[n.id]} Vestige{n.requires.length ? ` · requires ${n.requires.map((r) => TREE[r].name).join(', ')}` : ''}</div>{why && !maxed && <div className="mt-1" style={{ color: 'var(--blood)' }}>{why}</div>}</div>}>
                      <button
                        className="block relative"
                        disabled={!!why}
                        aria-label={`${n.name}, rank ${rank} of ${n.maxRank}`}
                        onClick={() => dispatch({ type: 'buyTreeNode', node: n.id })}
                        style={{ width: 48, height: 48, background: 'transparent', border: 0, padding: 9, opacity: open || maxed || rank > 0 ? 1 : 0.6, cursor: why ? 'default' : 'pointer', filter: maxed ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--ember-hot) 70%, transparent))' : undefined }}
                      >
                        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden><polygon points={shape} fill={fill} stroke={ring} strokeWidth="2" strokeLinejoin="round" />{rank > 0 && !maxed && <circle cx="15" cy="15" r="4" fill="var(--ember)" />}</svg>
                      </button>
                    </Tooltip>
                    <div className="text-[12px] leading-tight text-center mt-1 truncate w-full" style={{ color: open || maxed || rank > 0 ? 'var(--ink)' : 'var(--ash)', fontStyle: isAuto ? 'italic' : undefined }}>{n.name}</div>
                    <div className="flex gap-[3px] mt-[3px]" aria-hidden>
                      {Array.from({ length: n.maxRank }, (_, i) => <span key={i} style={{ width: 5, height: 5, background: i < rank ? 'var(--ember)' : 'transparent', border: '1px solid var(--ash)' }} />)}
                    </div>
                    {!maxed && <div className="font-num text-[11px]" style={{ color: open ? 'var(--ember)' : 'var(--ash)' }}>{C[n.id]}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Slab>
  );
}
