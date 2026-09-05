import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, computeMods, weaponDamage, reinforceCost, type InfusionKey } from '@/engine';
import { WEAPONS, MATERIALS, reinforceMaterial, getZone, getWeapon, BALANCE } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';
import { ReforgeSheet, AffixRow } from './ReforgeSheet';
import { affixesOf, lockedOf, setPieces, setTier, masteryRank, masteryKills, masteryNext, artPower } from '@/engine';
import { ARTS, MASTERY_RANK_NAMES, MASTERY_RANKS } from '@/content';
import { SETS, SET_PIECES, type SetId } from '@/content';

const INFUSIONS: { id: InfusionKey; name: string; desc: string }[] = [
  { id: 'none', name: 'Uninfused', desc: 'The blade as it was forged.' },
  { id: 'heavy', name: 'Heavy', desc: 'Scaling rewritten to Might (A). Base ×0.95.' },
  { id: 'keen', name: 'Keen', desc: 'Scaling rewritten to Finesse (A). Base ×0.95.' },
  { id: 'magic', name: 'Magic', desc: 'Magic damage, scales with Insight (A). Base ×0.90.' },
  { id: 'blessed', name: 'Blessed', desc: 'Lightning damage, scales with Devotion (A). Base ×0.90.' },
  { id: 'bleed', name: 'Bleed', desc: 'Hits build Bleed; at 100 the enemy loses 12% max HP. Base ×0.85.' },
  { id: 'poison', name: 'Poison', desc: 'Hits build Poison; at 100 the enemy takes 1.2% max HP per second for 12s. Base ×0.85.' },
  { id: 'frost', name: 'Frost', desc: 'Hits build Frost; at 100 the enemy is slowed, takes bonus strain and 5% max HP. Base ×0.85.' },
];

export const WeaponsPanel = memo(function WeaponsPanel() {
  const owned = useSel((s) => Object.keys(s.player.weapons).join(','));
  const equipped = useSel((s) => s.player.weapon);
  const maxRegion = useSel((s) => Math.max(...s.unlockedZones.map((z) => getZone(z).region)));
  const [sel, setSel] = useState<string>(equipped);
  const ownedIds = owned.split(',');
  const shop = Object.values(WEAPONS).filter((w) => w.source.kind === 'shop' && w.source.region <= maxRegion && !ownedIds.includes(w.id));
  const current = ownedIds.includes(sel) || shop.some((w) => w.id === sel) ? sel : equipped;
  return (
    <div className="flex flex-col gap-3">
      <div className="t-display text-[20px] text-ember-hot">Weapons</div>
      <div className="flex flex-wrap gap-1">
        {ownedIds.map((id) => <WeaponChip key={id} id={id} selected={id === current} equipped={id === equipped} onSelect={() => setSel(id)} />)}
        {shop.map((w) => <button key={w.id} className={`btn flex items-center gap-2 border-dashed ${w.id === current ? 'border-ember' : ''}`} style={{ opacity: 0.8 }} onClick={() => setSel(w.id)}><span className="w-8 h-8 -my-2 shrink-0"><Plate kind="weapon" id={w.id} variant="icon" className="w-full h-full object-contain" /></span>{w.name} · {fmt(w.source.kind === 'shop' ? w.source.cost : 0)}</button>)}
      </div>
      <WeaponDetail id={current} owned={ownedIds.includes(current)} />
      <SetsRow />
    </div>
  );
});

function WeaponChip({ id, selected, equipped, onSelect }: { id: string; selected: boolean; equipped: boolean; onSelect: () => void }) {
  const level = useSel((s) => s.player.weapons[id]?.level ?? 0);
  const inf = useSel((s) => s.player.weapons[id]?.infusion ?? 'none');
  const def = getWeapon(id);
  return (
    <button className={`btn flex items-center gap-2 ${selected ? 'border-ember text-parchment' : ''} ${equipped ? 'btn-ember' : ''}`} onClick={onSelect}>
      <span className="w-8 h-8 -my-2 shrink-0"><Plate kind="weapon" id={id} variant="icon" className="w-full h-full object-contain" /></span>
      {inf !== 'none' && <span className="text-wisp">{inf}</span>}{def.name} <span className="font-num text-ember-hot">+{level}</span>
    </button>
  );
}

function SetsRow() {
  const pieces = useSel((s) => JSON.stringify(setPieces(s)));
  const p = JSON.parse(pieces) as Record<SetId, number>;
  const any = Object.values(p).some((n) => n > 0);
  if (!any) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="t-label">Sets · pieces in your hand and your shades'</div>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(SETS) as SetId[]).filter((k) => p[k] > 0).map((k) => (
          <Tooltip key={k} tip={<div><div className="t-display text-[17px]">{SETS[k].name}</div><div className="text-[14px] italic mt-1" style={{ color: 'var(--bone)' }}>{SETS[k].lore}</div><ol className="mt-2 text-[14px] list-none flex flex-col gap-1">{SETS[k].bonus.map((b, i) => <li key={i} style={{ color: p[k] >= SET_PIECES[i] ? 'var(--parchment)' : 'color-mix(in srgb, var(--bone) 55%, transparent)' }}><span className="t-num">{SET_PIECES[i]}</span> · {b}</li>)}</ol></div>}>
            <span className="boon-chip"><span className="t-display">{SETS[k].name}</span>&nbsp;<span className="t-num" style={{ color: setTier(p[k]) > 0 ? 'var(--ember-hot)' : 'var(--bone)' }}>{p[k]}</span></span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function Mastery({ id }: { id: string }) {
  const kills = useSel((s) => masteryKills(s.player.weapons[id]));
  const rank = useSel((s) => masteryRank(s.player.weapons[id]));
  const next = useSel((s) => masteryNext(s.player.weapons[id]));
  const power = useSel((s) => artPower(s.player.weapons[id]));
  const art = ARTS[getWeapon(id).archetype];
  const prev = rank > 0 ? MASTERY_RANKS[rank - 1] : 0;
  const frac = next === null ? 1 : Math.min(1, (kills - prev) / (next - prev));
  return (
    <div className="flex flex-col gap-1 border-t border-ash/50 pt-2">
      <div className="flex items-center justify-between"><span className="t-label">Mastery · {MASTERY_RANK_NAMES[rank]}</span><span className="t-num text-[12px]" style={{ color: 'var(--bone)' }}>{kills}{next !== null ? `/${next}` : ''} kills · +{rank * 4}% damage</span></div>
      <div className="study-track"><div className="study-fill" style={{ width: `${Math.round(frac * 100)}%` }} /></div>
      <Tooltip tip={<div><div className="t-display text-[17px]">{art.name}</div><div className="text-[14px] mt-1" style={{ color: 'var(--parchment)' }}>{art.text}</div><div className="text-[14px] italic mt-2" style={{ color: 'var(--bone)' }}>{art.lore}</div><div className="t-label mt-2">{art.cooldown}s cooldown · opens at {MASTERY_RANKS[0]} kills · +15% power per rank after</div></div>}>
        <div className="text-[14px]" style={{ color: rank >= 1 ? 'var(--parchment)' : 'color-mix(in srgb, var(--bone) 65%, transparent)' }}><span className="t-display">{art.name}</span> · {rank >= 1 ? `${art.text} Power ×${power.toFixed(2)}.` : `opens at ${MASTERY_RANKS[0]} kills with this weapon.`}</div>
      </Tooltip>
    </div>
  );
}

function Affixes({ id }: { id: string }) {
  const affixes = useSel((s) => JSON.stringify(affixesOf(s.player.weapons[id])));
  const locked = useSel((s) => lockedOf(s.player.weapons[id]).join(','));
  const forge = useSel((s) => !!s.flags.forgeUnlocked);
  const [open, setOpen] = useState(false);
  const list = JSON.parse(affixes) as { id: string; tier: 1 | 2 | 3 }[];
  if (!forge) return null;
  const lockedIds = locked.split(',').filter(Boolean);
  return (
    <div className="flex flex-col gap-1 border-t border-ash/50 pt-2">
      <div className="flex items-center justify-between"><span className="t-label">Affixes</span><button className="btn text-[13px] min-h-[48px]" onClick={() => setOpen(true)}>Reforge</button></div>
      {list.length === 0 ? <div className="text-[14px] italic" style={{ color: 'color-mix(in srgb, var(--bone) 70%, transparent)' }}>Bare steel.</div> : list.map((a) => <AffixRow key={a.id} affix={a.id} tier={a.tier} locked={lockedIds.includes(a.id)} />)}
      {open && <ReforgeSheet weapon={id} onClose={() => setOpen(false)} />}
    </div>
  );
}

function WeaponDetail({ id, owned }: { id: string; owned: boolean }) {
  const dispatch = useGame((g) => g.dispatch);
  const def = getWeapon(id);
  const equipped = useSel((s) => s.player.weapon === id);
  const level = useSel((s) => s.player.weapons[id]?.level ?? 0);
  const inf = useSel((s) => s.player.weapons[id]?.infusion ?? 'none');
  const marrow = useSel((s) => s.marrow.toString());
  const breakdown = useSel((s) => JSON.stringify(summarize(s, id)));
  const mat = reinforceMaterial(level);
  const matHave = useSel((s) => s.materials[mat.id] ?? 0);
  const pitchCoal = useSel((s) => s.materials.pitchCoal ?? 0);
  const infusionUnlocked = useSel((s) => !!s.flags.infusionUnlocked);
  const rc = reinforceCost(def.region, level);
  const b = JSON.parse(breakdown) as ReturnType<typeof summarize>;
  const canReinforce = owned && level < 10 && matHave >= mat.count && D(marrow).gte(rc);
  const canBuy = !owned && def.source.kind === 'shop' && D(marrow).gte(def.source.cost);
  const [showInf, setShowInf] = useState(false);
  return (
    <div className="relative border border-ash/50 p-3 pl-[118px] min-h-[128px] flex flex-col gap-2" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--void) 55%, transparent), transparent 40%)' }}>
      <div className="absolute left-1 top-1 w-[108px] h-[108px]" style={{ filter: 'drop-shadow(-4px 6px 8px var(--void))' }}><Plate kind="weapon" id={id} className="w-full h-full object-contain" /></div>
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[22px]">{def.name} {owned && <span className="font-num text-ember-hot text-[16px]">+{level}</span>}</span>
        <span className="t-label">{def.archetype} · {b.type}</span>
      </div>
      <p className="t-lore text-[14px] leading-snug">{def.lore}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[14px]">
        <Row k="Damage per hit" v={fmt(D(b.total))} tip={<DamageTip b={b} />} />
        <Row k="Stamina per hit" v={String(def.stamina)} tip="Attacking below this costs half and lands an exhausted hit: 40% damage, no strain." />
        <Row k="Strain per hit" v={def.strain.toFixed(0)} tip="Fills the enemy's composure bar. Full bar = strain and a 2s Reprisal window." />
        <Row k="Reprisal" v={`×${b.reprisal.toFixed(1)}`} tip="Damage multiplier on hits during the Reprisal window." />
        <Row k="Crit chance" v={`${Math.round(b.crit * 100)}%`} tip="Crits deal double damage. 5% base, +0.25% per Finesse up to 40, plus the weapon's own bonus." />
        <Row k="Scaling" v={Object.entries(b.grades).map(([s, g]) => `${s.toUpperCase()} ${g}`).join(' · ') || 'none'} tip="Grades E→S multiply the stat's curve value: E .25, D .5, C .8, B 1.1, A 1.4, S 1.8." />
        {Object.keys(def.req).length > 0 && <Row k="Requires" v={Object.entries(def.req).map(([s, n]) => `${s.toUpperCase()} ${n}`).join(', ')} tip="Unmet requirements halve damage." cls={b.reqPenalty < 1 ? 'text-blood-bright' : ''} />}
        {def.status && <Row k="Innate" v={Object.entries(def.status).map(([s, n]) => `${s} +${n}`).join(', ')} tip="Status buildup per hit." />}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        {owned && !equipped && <button className="btn btn-ember text-[13px]" onClick={() => dispatch({ type: 'equip', weapon: id })}>Equip</button>}
        {owned && equipped && <span className="t-label text-ember-hot self-center">Equipped</span>}
        {!owned && def.source.kind === 'shop' && <button className="btn btn-ember text-[13px]" disabled={!canBuy} onClick={() => dispatch({ type: 'buyWeapon', weapon: id })}>Buy for {fmt(def.source.cost)} marrow</button>}
        {owned && level < 10 && (
          <Tooltip tip={<span>Reinforce to +{level + 1}: ×{BALANCE.weapon.reinforceGrowth} damage. Costs {fmt(rc)} marrow and {mat.count}× {MATERIALS[mat.id].name} (you have {matHave}). {MATERIALS[mat.id].lore}</span>}>
            <button className={`btn text-[13px] ${canReinforce ? 'btn-ember' : ''}`} disabled={!canReinforce} onClick={() => dispatch({ type: 'reinforce', weapon: id })}>
              Reinforce +{level + 1} · {fmt(rc)} marrow · {mat.count}× {MATERIALS[mat.id].name.replace('Slag ', '')}
            </button>
          </Tooltip>
        )}
        {owned && level >= 10 && <span className="t-label self-center">Final form</span>}
        {owned && def.infusable && infusionUnlocked && <button className="btn text-[13px]" onClick={() => setShowInf((x) => !x)}>Infuse ({pitchCoal} pitchCoal)</button>}
      </div>
      {showInf && owned && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          {INFUSIONS.map((i) => (
            <Tooltip key={i.id} tip={<span>{i.desc}{i.id !== 'none' ? ' Costs 1 Cinder Coal.' : ''}</span>}>
              <button className={`btn text-[13px] w-full ${inf === i.id ? 'border-ember text-ember-hot' : ''}`} disabled={inf === i.id || (i.id !== 'none' && pitchCoal < 1)} onClick={() => dispatch({ type: 'infuse', weapon: id, infusion: i.id })}>{i.name}</button>
            </Tooltip>
          ))}
        </div>
      )}
      {owned && <Mastery id={id} />}
      {owned && <Affixes id={id} />}
    </div>
  );
}

function Row({ k, v, tip, cls = '' }: { k: string; v: string; tip: React.ReactNode; cls?: string }) {
  return (
    <Tooltip tip={tip}>
      <div className="flex justify-between gap-2 cursor-help"><span className="text-bone/70">{k}</span><span className={`font-num text-parchment text-right ${cls}`}>{v}</span></div>
    </Tooltip>
  );
}

function summarize(s: any, id: string) {
  const mods = computeMods(s);
  const owned = !!s.player.weapons[id];
  if (!owned) s.player.weapons[id] = { id, level: 0, infusion: 'none' };
  const b = weaponDamage(s, mods, id);
  if (!owned) delete s.player.weapons[id];
  const grades: Record<string, string> = {};
  for (const p of b.scalingParts) grades[p.stat] = p.grade;
  return { total: b.total.toString(), base: b.base, reinforce: b.reinforce, scaling: b.scaling, parts: b.scalingParts, infusion: b.infusion, reqPenalty: b.reqPenalty, buffs: b.buffs, mods: b.mods, level: b.level, type: b.type, crit: b.crit, reprisal: b.reprisal, grades };
}

function DamageTip({ b }: { b: ReturnType<typeof summarize> }) {
  return (
    <div className="flex flex-col gap-0.5 font-num">
      <div>base {b.base}</div>
      <div>× reinforcement {b.reinforce.toFixed(2)}</div>
      <div>× (1 + scaling {b.scaling.toFixed(3)}) [{b.parts.map((p) => `${p.stat} ${p.grade}: ${p.value.toFixed(3)}`).join(', ') || 'none'}]</div>
      {b.infusion !== 1 && <div>× infusion {b.infusion}</div>}
      {b.reqPenalty !== 1 && <div className="text-blood-bright">× unmet requirement {b.reqPenalty}</div>}
      {b.buffs !== 1 && <div className="text-ember-hot">× buffs {b.buffs.toFixed(2)}</div>}
      {b.mods !== 1 && <div className="text-ember-hot">× permanent bonuses {b.mods.toFixed(2)}</div>}
      <div>× level {b.level.toFixed(2)} (+2.5% per level)</div>
      <div className="border-t border-ash/50 mt-1 pt-1">= {fmt(D(b.total))} per hit (±8%)</div>
    </div>
  );
}
