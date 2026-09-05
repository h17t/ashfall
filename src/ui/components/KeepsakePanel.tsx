import { memo } from 'react';
import { useGame, useSel } from '../store';
import { BOSSES, getWeapon, getSpell } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';
import { Slab } from '@/render/materials/Slab';

/** Boss marrow: a permanent, one-way choice between a signature weapon and a signature spell. */
export const KeepsakePanel = memo(function KeepsakePanel() {
  const dispatch = useGame((g) => g.dispatch);
  const held = useSel((s) => JSON.stringify(s.keepsakes));
  const chosen = useSel((s) => JSON.stringify(s.keepsakeChoices));
  const heldMap = JSON.parse(held) as Record<string, number>;
  const chosenMap = JSON.parse(chosen) as Record<string, 'weapon' | 'spell'>;
  const entries = Object.entries(heldMap).filter(([, n]) => n > 0);
  const past = Object.entries(chosenMap);
  return (
    <div className="flex flex-col gap-3">
      <div className="t-display text-[20px] text-ember-hot">Boss Marrow</div>
      {entries.length === 0 && past.length === 0 && <p className="text-[14px] text-bone/70 italic">Fell a lord of the road and its Keepsake will lie here: the last dense knot of what it was. It can be worked into a weapon or spoken into a spell. Either. Not both.</p>}
      {entries.map(([boss]) => {
        const b = BOSSES[boss];
        const w = getWeapon(b.keepsakeWeapon);
        const sp = getSpell(b.keepsakeSpell);
        return (
          <Slab key={boss} material="parchment" seed={`keepsake-${boss}`} rough={7} ornament="fold" className="relative p-3 pl-[122px] min-h-[170px] flex flex-col gap-2">
            <div className="absolute left-2 top-1 w-[108px] h-[150px]" style={{ filter: 'sepia(0.3) drop-shadow(-3px 5px 6px color-mix(in srgb, var(--ash) 60%, transparent))' }}><Plate kind="boss" id={boss} className="w-full h-full object-contain object-bottom" /></div>
            <div className="t-display text-[18px]" style={{ color: 'var(--ink)' }}>Keepsake of {b.name}</div>
            <p className="t-lore text-[14px]" style={{ color: 'var(--stone)' }}>{b.lore}</p>
            <div className="grid grid-cols-1 gap-2">
              <Tooltip tip={<div><div className="font-display text-[16px]">{w.name}</div><div className="italic">{w.lore}</div><div className="font-num mt-1">base {w.base} · {w.archetype} · scales {Object.entries(w.scaling).map(([s, g]) => `${s.toUpperCase()} ${g}`).join(', ')}</div></div>}>
                <button className="btn btn-ember w-full text-[13px]" onClick={() => dispatch({ type: 'chooseKeepsake', boss, choice: 'weapon' })}>Forge: {w.name}</button>
              </Tooltip>
              <Tooltip tip={<div><div className="font-display text-[16px]">{sp.name}</div><div className="italic">{sp.lore}</div><div className="font-num mt-1">{sp.school} · {sp.fp} FP · {sp.cooldown}s cooldown</div></div>}>
                <button className="btn btn-ember w-full text-[13px]" onClick={() => dispatch({ type: 'chooseKeepsake', boss, choice: 'spell' })}>Learn: {sp.name}</button>
              </Tooltip>
            </div>
            <p className="t-label" style={{ color: 'var(--ash)' }}>One-way. The other is lost with the Keepsake.</p>
          </Slab>
        );
      })}
      {past.length > 0 && (
        <div className="text-[14px] text-bone/70">
          {past.map(([boss, c]) => <div key={boss}>{BOSSES[boss].name}: {c === 'weapon' ? getWeapon(BOSSES[boss].keepsakeWeapon).name : getSpell(BOSSES[boss].keepsakeSpell).name}</div>)}
        </div>
      )}
    </div>
  );
});
