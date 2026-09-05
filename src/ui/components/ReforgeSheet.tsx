import { memo, useCallback, useState } from 'react';
import { useGame, useSel } from '../store';
import { Sheet } from '../shell/Sheet';
import { forgeCost, canReforge, affixesOf, lockedOf, affixPool, fmt, D, type GameEvent } from '@/engine';
import { AFFIXES, AFFIX_ORDER, MATERIALS, SETS, TIER_NAMES, getWeapon, BALANCE } from '@/content';
import { useEvents } from '../hooks/useEvents';
import { haptic } from '../haptics';
import { Plate } from '@/render/Plate';

/** One affix as a row: tier, name, what it does, and its lock. */
export function AffixRow({ weapon, affix, tier, locked, canLock, onLock, lore }: { weapon?: string; affix: string; tier: 1 | 2 | 3; locked: boolean; canLock?: boolean; onLock?: () => void; lore?: boolean }) {
  const d = AFFIXES[affix];
  if (!d) return null;
  const mag = d.mag[tier - 1];
  const val = d.stat === 'bleed' || d.stat === 'poison' || d.stat === 'frost' ? `+${mag}` : `${d.stat === 'taken' ? '−' : '+'}${Math.round(mag * 1000) / 10}%`;
  return (
    <div className={`affix-row t${tier} ${locked ? 'is-locked' : ''}`}>
      <span className="w-9 h-9 shrink-0" aria-hidden><Plate kind="affix" id={affix} className="w-full h-full object-contain" /></span>
      <span className="affix-tier">{TIER_NAMES[tier]}</span>
      <span className="flex-1 min-w-0">
        <span className="t-display text-[16px]" style={{ color: 'var(--parchment)' }}>{d.name}</span>
        <span className="block text-[13px]" style={{ color: 'var(--bone)' }}>{d.text} {val} · {SETS[d.set].name}</span>
        {lore && <span className="block text-[13px] italic mt-0.5" style={{ color: 'color-mix(in srgb, var(--bone) 75%, transparent)' }}>{d.lore}</span>}
      </span>
      {onLock && <button role="switch" aria-checked={locked} aria-label={`Lock ${d.name}${weapon ? ` on ${getWeapon(weapon).name}` : ''}`} className={`switch ${locked ? 'is-on' : ''}`} disabled={!locked && !canLock} onClick={onLock}><span className="switch-knob" aria-hidden /></button>}
    </div>
  );
}

/** The forge: what is on the weapon, what it costs to roll again, what the Study has opened. */
export const ReforgeSheet = memo(function ReforgeSheet({ weapon, onClose }: { weapon: string; onClose: () => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const affixes = useSel((s) => JSON.stringify(affixesOf(s.player.weapons[weapon])));
  const locked = useSel((s) => lockedOf(s.player.weapons[weapon]).join(','));
  const cost = useSel((s) => { const c = forgeCost(s, weapon); return JSON.stringify({ marrow: c.marrow.toString(), mat: c.material.id, n: c.material.count }); });
  const why = useSel((s) => canReforge(s, weapon));
  const have = useSel((s) => { const c = forgeCost(s, weapon); return s.materials[c.material.id] ?? 0; });
  const pool = useSel((s) => affixPool(s).join(','));
  const [flash, setFlash] = useState(0);
  useEvents(useCallback((events: GameEvent[]) => { if (events.some((e) => e.type === 'reforged' && e.weapon === weapon)) { setFlash((f) => f + 1); haptic('levelUp'); } }, [weapon]));
  const list = JSON.parse(affixes) as { id: string; tier: 1 | 2 | 3 }[];
  const lockedIds = locked.split(',').filter(Boolean);
  const c = JSON.parse(cost) as { marrow: string; mat: string; n: number };
  const open = pool.split(',').filter(Boolean);
  const def = getWeapon(weapon);
  return (
    <Sheet open onClose={onClose} material="stone" title={`Reforge ${def.name}`}>
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-snug" style={{ color: 'var(--bone)' }}>Three slots, rolled from what the Study has opened. Lock an affix to keep it through the next roll; each lock raises the price ×{BALANCE.forge.lockCostMult}. A locked affix never changes.</p>
        <div key={flash} className={`flex flex-col gap-1 ${flash ? 'forge-flash' : ''}`}>
          {list.length === 0 && <div className="text-[15px] italic" style={{ color: 'color-mix(in srgb, var(--bone) 70%, transparent)' }}>Bare steel. Nothing has been forged into it yet.</div>}
          {list.map((a) => <AffixRow key={a.id} weapon={weapon} affix={a.id} tier={a.tier} locked={lockedIds.includes(a.id)} canLock={lockedIds.length < BALANCE.forge.maxLocked} lore onLock={() => { haptic('tap'); dispatch({ type: 'lockAffix', weapon, affix: a.id }); }} />)}
        </div>
        <div className="flex items-center justify-between text-[14px]" style={{ color: 'var(--bone)' }}>
          <span>Price</span>
          <span className="t-num" style={{ color: 'var(--parchment)' }}>{fmt(D(c.marrow))} marrow · {c.n} {MATERIALS[c.mat]?.name ?? c.mat} <span style={{ color: have >= c.n ? 'var(--verdigris)' : 'var(--blood-bright)' }}>({have})</span></span>
        </div>
        <button className="btn btn-ember min-h-[56px]" disabled={why !== null} onClick={() => dispatch({ type: 'reforge', weapon })}>{why ?? (list.length ? `Reforge the ${3 - lockedIds.length} unlocked` : 'Reforge')}</button>
        <div>
          <div className="t-label mb-1">The pool · {open.length} of {AFFIX_ORDER.length} opened by the Study</div>
          <div className="flex flex-wrap gap-1">{AFFIX_ORDER.map((id) => <span key={id} className={`boon-chip ${open.includes(id) ? '' : 'is-shut'}`} title={undefined}>{AFFIXES[id].name}</span>)}</div>
        </div>
      </div>
    </Sheet>
  );
});
