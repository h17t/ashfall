import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { getSpell } from '@/content';
import { Tooltip } from './Tooltip';
import { Gauge } from '@/render/Gauge';
import { Slab } from '@/render/materials/Slab';
import { Plate } from '@/render/Plate';

/** Attunement slots + FP. Hotkeys 1–6 cast. Hidden until the player owns a catalyst/spell. */
export const SpellBar = memo(function SpellBar() {
  const slots = useSel((s) => s.player.attunementSlots);
  const known = useSel((s) => s.spellsKnown.join(','));
  const fp = useSel((s) => Math.floor(s.player.fp));
  const fpMax = useSel((s) => s.player.fpMax);
  if (slots <= 0 && !known) return null;
  return (
    <Slab material="iron" seed="spells" ornament="none" className="px-4 py-2.5 flex items-center gap-4">
      <div className="w-32"><Gauge value={fp} max={fpMax} tone="soul" label="Focus" text={`${fp} / ${fpMax}`} height={6} /></div>
      <div className="flex gap-2 flex-1">
        {Array.from({ length: slots }, (_, i) => <Slot key={i} slot={i} known={known.split(',').filter(Boolean)} />)}
        {slots === 0 && <span className="t-lore text-[13px]">You know a spell but have no attunement slot. A catalyst or a Kindled gift will open one.</span>}
      </div>
    </Slab>
  );
});

function Slot({ slot, known }: { slot: number; known: string[] }) {
  const dispatch = useGame((g) => g.dispatch);
  const id = useSel((s) => s.player.attuned[slot] ?? null);
  const cd = useSel((s) => (id ? s.player.cooldowns[id] ?? 0 : 0));
  const fp = useSel((s) => s.player.fp);
  const [pick, setPick] = useState(false);
  const def = id ? getSpell(id) : null;
  const ready = def && cd <= 0 && fp >= def.fp;
  return (
    <div className="relative">
      <Tooltip tip={def ? <div><div className="font-display text-[16px]">{def.name}</div><div className="italic">{def.lore}</div><div className="font-num mt-1">{def.school} · {def.fp} FP · {def.cooldown}s cooldown · key {slot + 1}</div></div> : 'Empty attunement slot. Click to attune a known spell.'}>
        <button
          className={`btn min-w-[132px] flex items-center gap-2 ${ready ? 'btn-ember' : ''}`}
          onClick={() => (def ? dispatch({ type: 'cast', slot }) : setPick((x) => !x))}
          onContextMenu={(e) => { e.preventDefault(); setPick((x) => !x); }}
        >
          {def && <span className="w-6 h-6 -my-1 shrink-0"><Plate kind="spell" id={def.id} className="w-full h-full object-contain" /></span>}
          <span style={{ color: 'var(--ash)' }}>{slot + 1}</span>{def ? def.name : 'attune'}{cd > 0 && <span className="t-num ml-1" style={{ color: 'var(--bone)' }}>{cd.toFixed(0)}s</span>}
        </button>
      </Tooltip>
      {pick && (
        <div className="absolute z-40 top-full mt-1 slab p-2 flex flex-col gap-1 min-w-[160px]">
          {known.map((k) => <button key={k} className="btn" onClick={() => { dispatch({ type: 'attune', slot, spell: k }); setPick(false); }}>{getSpell(k).name}</button>)}
          {def && <button className="btn" onClick={() => { dispatch({ type: 'attune', slot, spell: null }); setPick(false); }}>Unattune</button>}
          {known.length === 0 && <span className="t-lore text-[13px]">No spells known.</span>}
        </div>
      )}
    </div>
  );
}
