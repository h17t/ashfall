import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, computeMods, weaponDamage, reinforceCost, type InfusionKey } from '@/engine';
import { WEAPONS, MATERIALS, reinforceMaterial, getZone, getWeapon, BALANCE } from '@/content';
import { Tooltip } from './Tooltip';

const INFUSIONS: { id: InfusionKey; name: string; desc: string }[] = [
  { id: 'none', name: 'Uninfused', desc: 'The blade as it was forged.' },
  { id: 'heavy', name: 'Heavy', desc: 'Scaling rewritten to Strength (A). Base ×0.95.' },
  { id: 'keen', name: 'Keen', desc: 'Scaling rewritten to Dexterity (A). Base ×0.95.' },
  { id: 'magic', name: 'Magic', desc: 'Magic damage, scales with Intelligence (A). Base ×0.90.' },
  { id: 'blessed', name: 'Blessed', desc: 'Lightning damage, scales with Faith (A). Base ×0.90.' },
  { id: 'bleed', name: 'Bleed', desc: 'Hits build Bleed; at 100 the enemy loses 12% max HP. Base ×0.85.' },
  { id: 'poison', name: 'Poison', desc: 'Hits build Poison; at 100 the enemy takes 1.2% max HP per second for 12s. Base ×0.85.' },
  { id: 'frost', name: 'Frost', desc: 'Hits build Frost; at 100 the enemy is slowed, takes bonus stagger and 5% max HP. Base ×0.85.' },
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
      <div className="font-display text-lg text-ember-400">Weapons</div>
      <div className="flex flex-wrap gap-1">
        {ownedIds.map((id) => <WeaponChip key={id} id={id} selected={id === current} equipped={id === equipped} onSelect={() => setSel(id)} />)}
        {shop.map((w) => <button key={w.id} className={`btn text-xs border-dashed ${w.id === current ? 'border-ember-500' : ''}`} onClick={() => setSel(w.id)}>{w.name} · {fmt(w.source.kind === 'shop' ? w.source.cost : 0)}</button>)}
      </div>
      <WeaponDetail id={current} owned={ownedIds.includes(current)} />
    </div>
  );
});

function WeaponChip({ id, selected, equipped, onSelect }: { id: string; selected: boolean; equipped: boolean; onSelect: () => void }) {
  const level = useSel((s) => s.player.weapons[id]?.level ?? 0);
  const inf = useSel((s) => s.player.weapons[id]?.infusion ?? 'none');
  const def = getWeapon(id);
  return (
    <button className={`btn text-xs ${selected ? 'border-ember-500 text-bone-100' : ''} ${equipped ? 'bg-ember-700/30' : ''}`} onClick={onSelect}>
      {inf !== 'none' && <span className="text-purple-300 mr-1">{inf}</span>}{def.name} <span className="font-num text-ember-400">+{level}</span>
    </button>
  );
}

function WeaponDetail({ id, owned }: { id: string; owned: boolean }) {
  const dispatch = useGame((g) => g.dispatch);
  const def = getWeapon(id);
  const equipped = useSel((s) => s.player.weapon === id);
  const level = useSel((s) => s.player.weapons[id]?.level ?? 0);
  const inf = useSel((s) => s.player.weapons[id]?.infusion ?? 'none');
  const souls = useSel((s) => s.souls.toString());
  const breakdown = useSel((s) => JSON.stringify(summarize(s, id)));
  const mat = reinforceMaterial(level);
  const matHave = useSel((s) => s.materials[mat.id] ?? 0);
  const coal = useSel((s) => s.materials.coal ?? 0);
  const infusionUnlocked = useSel((s) => !!s.flags.infusionUnlocked);
  const rc = reinforceCost(def.region, level);
  const b = JSON.parse(breakdown) as ReturnType<typeof summarize>;
  const canReinforce = owned && level < 10 && matHave >= mat.count && D(souls).gte(rc);
  const canBuy = !owned && def.source.kind === 'shop' && D(souls).gte(def.source.cost);
  const [showInf, setShowInf] = useState(false);
  return (
    <div className="border border-ash-700 rounded-sm p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xl text-bone-100">{def.name} {owned && <span className="font-num text-ember-400 text-base">+{level}</span>}</span>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">{def.archetype} · {b.type}</span>
      </div>
      <p className="text-[12px] italic text-bone-300 leading-snug">{def.lore}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px]">
        <Row k="Damage per hit" v={fmt(D(b.total))} tip={<DamageTip b={b} />} />
        <Row k="Stamina per hit" v={String(def.stamina)} tip="Attacking below this costs half and lands an exhausted hit: 40% damage, no stagger." />
        <Row k="Stagger per hit" v={def.stagger.toFixed(0)} tip="Fills the enemy's poise bar. Full bar = stagger and a 2s Riposte window." />
        <Row k="Riposte" v={`×${b.riposte.toFixed(1)}`} tip="Damage multiplier on hits during the Riposte window." />
        <Row k="Crit chance" v={`${Math.round(b.crit * 100)}%`} tip="Crits deal double damage. 5% base, +0.25% per Dexterity up to 40, plus the weapon's own bonus." />
        <Row k="Scaling" v={Object.entries(b.grades).map(([s, g]) => `${s.toUpperCase()} ${g}`).join(' · ') || 'none'} tip="Grades E→S multiply the stat's curve value: E .25, D .5, C .8, B 1.1, A 1.4, S 1.8." />
        {Object.keys(def.req).length > 0 && <Row k="Requires" v={Object.entries(def.req).map(([s, n]) => `${s.toUpperCase()} ${n}`).join(', ')} tip="Unmet requirements halve damage." cls={b.reqPenalty < 1 ? 'text-blood-500' : ''} />}
        {def.status && <Row k="Innate" v={Object.entries(def.status).map(([s, n]) => `${s} +${n}`).join(', ')} tip="Status buildup per hit." />}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        {owned && !equipped && <button className="btn btn-ember text-xs" onClick={() => dispatch({ type: 'equip', weapon: id })}>Equip</button>}
        {owned && equipped && <span className="text-[10px] uppercase tracking-widest text-ember-400 self-center">Equipped</span>}
        {!owned && def.source.kind === 'shop' && <button className="btn btn-ember text-xs" disabled={!canBuy} onClick={() => dispatch({ type: 'buyWeapon', weapon: id })}>Buy for {fmt(def.source.cost)} souls</button>}
        {owned && level < 10 && (
          <Tooltip tip={<span>Reinforce to +{level + 1}: ×{BALANCE.weapon.reinforceGrowth} damage. Costs {fmt(rc)} souls and {mat.count}× {MATERIALS[mat.id].name} (you have {matHave}). {MATERIALS[mat.id].lore}</span>}>
            <button className={`btn text-xs ${canReinforce ? 'btn-ember' : ''}`} disabled={!canReinforce} onClick={() => dispatch({ type: 'reinforce', weapon: id })}>
              Reinforce +{level + 1} · {fmt(rc)} souls · {mat.count}× {MATERIALS[mat.id].name.replace('Titanite ', '')}
            </button>
          </Tooltip>
        )}
        {owned && level >= 10 && <span className="text-[10px] uppercase tracking-widest text-bone-400 self-center">Final form</span>}
        {owned && def.infusable && infusionUnlocked && <button className="btn text-xs" onClick={() => setShowInf((x) => !x)}>Infuse ({coal} coal)</button>}
      </div>
      {showInf && owned && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          {INFUSIONS.map((i) => (
            <Tooltip key={i.id} tip={<span>{i.desc}{i.id !== 'none' ? ' Costs 1 Cinder Coal.' : ''}</span>}>
              <button className={`btn text-xs w-full ${inf === i.id ? 'border-ember-500 text-ember-400' : ''}`} disabled={inf === i.id || (i.id !== 'none' && coal < 1)} onClick={() => dispatch({ type: 'infuse', weapon: id, infusion: i.id })}>{i.name}</button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, tip, cls = '' }: { k: string; v: string; tip: React.ReactNode; cls?: string }) {
  return (
    <Tooltip tip={tip}>
      <div className="flex justify-between gap-2 cursor-help"><span className="text-bone-400">{k}</span><span className={`font-num text-bone-100 text-right ${cls}`}>{v}</span></div>
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
  return { total: b.total.toString(), base: b.base, reinforce: b.reinforce, scaling: b.scaling, parts: b.scalingParts, infusion: b.infusion, reqPenalty: b.reqPenalty, buffs: b.buffs, mods: b.mods, level: b.level, type: b.type, crit: b.crit, riposte: b.riposte, grades };
}

function DamageTip({ b }: { b: ReturnType<typeof summarize> }) {
  return (
    <div className="flex flex-col gap-0.5 font-num">
      <div>base {b.base}</div>
      <div>× reinforcement {b.reinforce.toFixed(2)}</div>
      <div>× (1 + scaling {b.scaling.toFixed(3)}) [{b.parts.map((p) => `${p.stat} ${p.grade}: ${p.value.toFixed(3)}`).join(', ') || 'none'}]</div>
      {b.infusion !== 1 && <div>× infusion {b.infusion}</div>}
      {b.reqPenalty !== 1 && <div className="text-blood-500">× unmet requirement {b.reqPenalty}</div>}
      {b.buffs !== 1 && <div className="text-ember-400">× buffs {b.buffs.toFixed(2)}</div>}
      {b.mods !== 1 && <div className="text-ember-400">× permanent bonuses {b.mods.toFixed(2)}</div>}
      <div>× soul level {b.level.toFixed(2)} (+2.5% per level)</div>
      <div className="border-t border-ash-700 mt-1 pt-1">= {fmt(D(b.total))} per hit (±8%)</div>
    </div>
  );
}
