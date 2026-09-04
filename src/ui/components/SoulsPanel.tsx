import { memo } from 'react';
import { useGame, useSel } from '../store';
import { BOSSES, getWeapon, getSpell } from '@/content';
import { Tooltip } from './Tooltip';

/** Boss souls: a permanent, one-way choice between a signature weapon and a signature spell. */
export const SoulsPanel = memo(function SoulsPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const held = useSel((s) => JSON.stringify(s.bossSouls));
  const chosen = useSel((s) => JSON.stringify(s.bossSoulChoices));
  const heldMap = JSON.parse(held) as Record<string, number>;
  const chosenMap = JSON.parse(chosen) as Record<string, 'weapon' | 'spell'>;
  const entries = Object.entries(heldMap).filter(([, n]) => n > 0);
  const past = Object.entries(chosenMap);
  return (
    <div className="flex flex-col gap-3">
      <div className="font-display text-lg text-ember-400">Boss Souls</div>
      {entries.length === 0 && past.length === 0 && <p className="text-[12px] text-bone-400 italic">Slay a lord of a region and its soul will linger here, waiting to be shaped into a weapon or a spell. The choice is permanent.</p>}
      {entries.map(([boss]) => {
        const b = BOSSES[boss];
        const w = getWeapon(b.soulWeapon);
        const sp = getSpell(b.soulSpell);
        return (
          <div key={boss} className="border border-ember-700 rounded-sm p-3 flex flex-col gap-2">
            <div className="font-display text-lg text-bone-100">Soul of {b.name}</div>
            <p className="text-[12px] italic text-bone-300">{b.lore}</p>
            <div className="grid grid-cols-2 gap-2">
              <Tooltip tip={<div><div className="font-display text-base">{w.name}</div><div className="italic">{w.lore}</div><div className="font-num mt-1">base {w.base} · {w.archetype} · scales {Object.entries(w.scaling).map(([s, g]) => `${s.toUpperCase()} ${g}`).join(', ')}</div></div>}>
                <button className="btn btn-ember w-full text-xs" onClick={() => dispatch({ type: 'chooseBossSoul', boss, choice: 'weapon' })}>Forge: {w.name}</button>
              </Tooltip>
              <Tooltip tip={<div><div className="font-display text-base">{sp.name}</div><div className="italic">{sp.lore}</div><div className="font-num mt-1">{sp.school} · {sp.fp} FP · {sp.cooldown}s cooldown</div></div>}>
                <button className="btn btn-ember w-full text-xs" onClick={() => dispatch({ type: 'chooseBossSoul', boss, choice: 'spell' })}>Learn: {sp.name}</button>
              </Tooltip>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-bone-400">One-way. The other is lost with the soul.</p>
          </div>
        );
      })}
      {past.length > 0 && (
        <div className="text-[12px] text-bone-400">
          {past.map(([boss, c]) => <div key={boss}>{BOSSES[boss].name}: {c === 'weapon' ? getWeapon(BOSSES[boss].soulWeapon).name : getSpell(BOSSES[boss].soulSpell).name}</div>)}
        </div>
      )}
    </div>
  );
});
