import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, computeMods, canBuySpell, schoolsAvailable, attunementSlotCost, spellPower, MAX_BOUGHT_SLOTS } from '@/engine';
import { SPELLS, getSpell, getZone } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';

const SCHOOL_NAME: Record<string, string> = { sorcery: 'Sorcery', miracle: 'Miracles', pyromancy: 'Pyromancy', hex: 'Hexes' };
const SCHOOL_DESC: Record<string, string> = {
  sorcery: 'Scales with Intelligence. Burst and frost. Needs an Ashen Staff.',
  miracle: 'Scales with Faith. Lightning, healing, oaths and rites. Needs a Cracked Talisman.',
  pyromancy: 'Scales with the flame itself (fed with souls) and a little with INT and FTH. Needs a Pyromancy Flame.',
  hex: 'Scales with the lesser of Intelligence and Faith. Dark arts opened by the Sigil.',
};

function effectText(id: string): string {
  const e = getSpell(id).effect;
  switch (e.kind) {
    case 'damage': return `${e.type} damage ×${e.mult} of your base strike`;
    case 'staggerBomb': return `×${e.mult} magic damage and ${e.amount} stagger`;
    case 'buff': return `${Object.entries(e.buff).map(([k, v]) => k === 'dmg' ? `+${Math.round((v! - 1) * 100)}% damage` : k === 'souls' ? `+${Math.round((v! - 1) * 100)}% souls` : k === 'taken' ? `${Math.round((1 - v!) * 100)}% less damage taken` : k === 'hpRegen' ? `${v} HP/s` : k === 'stamRegen' ? `+${Math.round((v! - 1) * 100)}% stamina regen` : `${k} ${v}`).join(', ')} for ${e.duration}s`;
    case 'dot': return `${e.type} damage ×${e.mult} over ${e.duration}s`;
    case 'heal': return `heals ${Math.round(e.frac * 100)}% of max HP`;
    case 'status': return `+${e.amount} ${e.status} buildup`;
    case 'squadBuff': return `phantoms deal ×${e.mult} for ${e.duration}s`;
  }
}

export const MagicPanel = memo(function MagicPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const schools = useSel((s) => Array.from(schoolsAvailable(s)).join(','));
  const known = useSel((s) => s.spellsKnown.join(','));
  const slots = useSel((s) => s.player.attunementSlots);
  const attuned = useSel((s) => s.player.attuned.join(','));
  const bought = useSel((s) => s.materials.__attuneUpgrades ?? 0);
  const slotCost = useSel((s) => attunementSlotCost(s).toString());
  const souls = useSel((s) => s.souls.toString());
  const flame = useSel((s) => s.player.flameLevel);
  const hasFlame = useSel((s) => !!s.flags.hasFlame || !!s.player.weapons.pyromancyFlame);
  const maxRegion = useSel((s) => Math.max(...s.unlockedZones.map((z) => getZone(z).region)));
  const powers = useSel((s) => { const m = computeMods(s); return JSON.stringify(Object.fromEntries(Object.keys(SPELLS).map((id) => [id, spellPower(s, m, id)]))); });
  const power = JSON.parse(powers) as Record<string, number>;
  const schoolSet = new Set(schools.split(',').filter(Boolean));
  const knownList = known.split(',').filter(Boolean);
  const attunedList = attuned.split(',');
  const flameCost = D(300).mul(D(2.2).pow(flame)).floor();
  if (schoolSet.size === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="t-display text-[20px] text-ember-hot">Magic</div>
        <p className="text-[14px] text-bone/70 italic">You hold no catalyst. An Ashen Staff or a Cracked Talisman from the Weapons shop opens a school and an attunement slot; Eskel's soul can become a flame.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] text-ember-hot">Magic</span>
        <span className="t-label">{slots} slot{slots === 1 ? '' : 's'} · keys 1–{Math.max(1, slots)}</span>
      </div>
      <div className="flex flex-wrap gap-1 items-center">
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} className="border border-ash px-2 py-1 text-[13px] min-w-[90px]">
            <span className="text-bone/70 mr-1">{i + 1}</span>{attunedList[i] ? <span className="text-ember-hot">{getSpell(attunedList[i]).name}</span> : <span className="text-bone/70 italic">empty</span>}
          </div>
        ))}
        {bought < MAX_BOUGHT_SLOTS && (
          <Tooltip tip={<span>Open one more attunement slot. Cost rises ×6 each time; three can be bought. The Humanity tree and the Sigil add more.</span>}>
            <button className={`btn text-[13px] ${D(souls).gte(D(slotCost)) ? 'btn-ember' : ''}`} disabled={D(souls).lt(D(slotCost))} onClick={() => dispatch({ type: 'buyAttunementSlot' })}>+ slot · {fmt(D(slotCost))}</button>
          </Tooltip>
        )}
      </div>
      {hasFlame && (
        <div className="flex items-center justify-between text-[14px] border border-ash/50 p-2">
          <Tooltip tip="Feed the flame souls: +18% pyromancy power per level, without touching your stats. This is the pyromancer's leveling."><span className="text-parchment cursor-help">Pyromancy Flame <span className="font-num text-ember-hot">+{flame}</span> · power ×{Math.pow(1.18, flame).toFixed(2)}</span></Tooltip>
          <button className={`btn text-[13px] ${D(souls).gte(flameCost) ? 'btn-ember' : ''}`} disabled={D(souls).lt(flameCost)} onClick={() => dispatch({ type: 'upgradeFlame' })}>Feed · {fmt(flameCost)}</button>
        </div>
      )}
      {(['sorcery', 'miracle', 'pyromancy', 'hex'] as const).filter((sc) => schoolSet.has(sc)).map((sc) => (
        <div key={sc} className="flex flex-col gap-1">
          <Tooltip tip={SCHOOL_DESC[sc]}><div className="font-display text-[16px] text-parchment cursor-help">{SCHOOL_NAME[sc]}</div></Tooltip>
          {Object.values(SPELLS).filter((sp) => sp.school === sc && (knownList.includes(sp.id) || (sp.source.kind === 'shop' && sp.source.region <= maxRegion))).map((sp) => {
            const isKnown = knownList.includes(sp.id);
            const slotIdx = attunedList.indexOf(sp.id);
            const why = isKnown ? null : canBuySpell(useGame.getState().state, sp.id);
            return (
              <div key={sp.id} className={`relative border p-2 pl-[58px] text-[14px] flex flex-col gap-1 ${isKnown ? 'border-ash/50' : 'border-dashed border-ash'}`}>
                <div className="absolute left-1.5 top-1.5 w-[44px] h-[44px]" style={{ opacity: isKnown ? 1 : 0.55, filter: 'drop-shadow(-2px 3px 4px var(--void))' }}><Plate kind="spell" id={sp.id} className="w-full h-full object-contain" /></div>
                <div className="flex items-baseline justify-between">
                  <Tooltip tip={<div><div className="italic">{sp.lore}</div><div className="mt-1 text-bone">{effectText(sp.id)}</div><div className="font-num text-bone/70 mt-1">power ×{power[sp.id].toFixed(2)} · {Object.entries(sp.req).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ') || 'no requirement'}</div></div>}>
                    <span className={`font-display text-[15px] cursor-help ${isKnown ? 'text-parchment' : 'text-bone'}`}>{sp.name}</span>
                  </Tooltip>
                  <span className="font-num text-[12px] text-bone/70">{sp.fp} FP · {sp.cooldown}s</span>
                </div>
                <div className="text-bone/70">{effectText(sp.id)} <span className="font-num">(×{power[sp.id].toFixed(2)})</span></div>
                <div className="flex gap-1 flex-wrap">
                  {isKnown ? (
                    <>
                      {Array.from({ length: slots }, (_, i) => (
                        <button key={i} className={`btn text-[12px] px-2 py-0.5 ${slotIdx === i ? 'border-ember text-ember-hot' : ''}`} onClick={() => dispatch({ type: 'attune', slot: i, spell: slotIdx === i ? null : sp.id })}>{slotIdx === i ? `slot ${i + 1} ·` : `slot ${i + 1}`}</button>
                      ))}
                      {slots === 0 && <span className="text-[12px] text-bone/70 italic">no slot open</span>}
                    </>
                  ) : (
                    <button className={`btn text-[12px] px-2 py-0.5 ${why ? '' : 'btn-ember'}`} disabled={!!why} title={why ?? ''} onClick={() => dispatch({ type: 'buySpell', spell: sp.id })}>Learn · {fmt((sp.source as { cost: number }).cost)}{why ? ` — ${why}` : ''}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
