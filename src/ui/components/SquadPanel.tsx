import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, computeMods, phantomNumbers, phantomLevelCost, phantomXpToNext, canRecruit, squadSlots, resolveHunt, currentHunters, huntTargets, activePhantoms } from '@/engine';
import { PHANTOMS, getPhantom, getZone, getWeapon, COVENANTS } from '@/content';
import { Tooltip } from './Tooltip';
import { Bar } from './Bar';

const ROLE_DESC: Record<string, string> = {
  dps: 'Raw damage. Worth most beside you, where kills pay full souls.',
  stagger: 'Builds stagger fast. Feeds your riposte window when beside you.',
  healer: 'Heals you beside you; keeps the squad alive on a hunt. Worth most when you are away.',
  buffer: 'Multiplies the damage of everyone around it, you included.',
  status: 'Applies bleed and poison. The answer to foes that heal or shrug off steel.',
};

export const SquadPanel = memo(function SquadPanel() {
  const recruited = useSel((s) => s.squad.recruited.join(','));
  const slots = useSel((s) => squadSlots(s, computeMods(s)));
  const unlocked = useSel((s) => s.unlockedZones.join(','));
  const ids = recruited.split(',').filter(Boolean);
  const recruitable = Object.values(PHANTOMS).filter((p) => !ids.includes(p.id) && unlocked.split(',').includes(p.zone));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg text-ember-400">Squad</span>
        <Tooltip tip="One slot to begin with. Each region's lord you fell adds a slot, up to five. The Dark Sigil can open a sixth. Phantoms beyond your slots wait at the bonfire."><span className="text-[10px] uppercase tracking-widest text-bone-400 cursor-help">{Math.min(ids.length, slots)}/{slots} fielded</span></Tooltip>
      </div>
      <HuntReadout />
      {ids.map((id, i) => <PhantomCard key={id} id={id} benched={i >= slots} />)}
      {recruitable.map((p) => <RecruitCard key={p.id} id={p.id} />)}
      {ids.length === 0 && recruitable.length === 0 && <p className="text-[12px] text-bone-400 italic">No one answers. Phantoms are found along the road.</p>}
    </div>
  );
});

function HuntReadout() {
  const dispatch = useGame((g) => g.dispatch);
  const report = useSel((s) => {
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, currentHunters(s, mods));
    const offline = resolveHunt(s, mods, currentHunters(s, mods, true));
    return JSON.stringify({ souls: r.souls.mul(60).toString(), kills: r.kills * 60, uptime: r.uptime, survivable: r.survivable, reason: r.reason, zone: r.zone, tier: r.tier, hunters: r.hunters.length, killTime: r.killTime, deathTime: r.deathTime, offSouls: offline.souls.mul(3600).mul(mods.offlineRate).toString(), offOk: offline.survivable, cap: mods.offlineCapHours });
  });
  const auto = useSel((s) => s.squad.huntAuto);
  const targets = useSel((s) => JSON.stringify(huntTargets(s)));
  const r = JSON.parse(report);
  const t = JSON.parse(targets) as { zone: string; tier: number }[];
  const z = getZone(r.zone);
  return (
    <div className="border border-ash-700 rounded-sm p-2 text-[12px] flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-bone-200 font-display text-sm">Hunting ground</span>
        <select className="bg-ash-800 border border-ash-600 text-bone-200 text-[11px] px-1 py-0.5 rounded-sm max-w-[180px]" value={auto ? 'auto' : `${r.zone}:${r.tier}`} onChange={(e) => {
          if (e.target.value === 'auto') dispatch({ type: 'setHunt', zone: r.zone, tier: r.tier, auto: true });
          else { const [zone, tier] = e.target.value.split(':'); dispatch({ type: 'setHunt', zone, tier: Number(tier), auto: false }); }
        }}>
          <option value="auto">Highest they can hold</option>
          {t.map((x) => <option key={`${x.zone}:${x.tier}`} value={`${x.zone}:${x.tier}`}>{getZone(x.zone).tiers[x.tier].name}</option>)}
        </select>
      </div>
      {r.hunters === 0 ? <div className="text-bone-400 italic">{r.reason}</div> : r.survivable ? (
        <>
          <div className="text-bone-300">{z.tiers[r.tier].name}, {z.name} · <span className="font-num text-ember-400">{fmt(D(r.souls))}</span> souls/min · <span className="font-num">{r.kills.toFixed(1)}</span> kills/min</div>
          <Tooltip tip={<span>Uptime is the share of time the squad can stay in the fight: recovery ÷ (recovery + incoming damage). A kill takes {r.killTime.toFixed(0)}s; the squad would fall in {r.deathTime.toFixed(0)}s of unbroken fighting.</span>}>
            <div className="cursor-help"><Bar value={r.uptime} max={1} color={r.uptime > 0.6 ? '#3f7a3a' : '#8a6d1f'} label="Holding" text={`${Math.round(r.uptime * 100)}% uptime`} height={5} /></div>
          </Tooltip>
        </>
      ) : <div className="text-blood-500">{r.reason}</div>}
      <Tooltip tip={<span>While you are away everyone hunts, including phantoms fighting beside you now. Offline earns {Math.round(computeModsOfflineRate() * 100)}% of the online rate, for up to {r.cap} hours. Offline never loses souls.</span>}>
        <div className="text-bone-400 cursor-help">Away: {r.offOk ? <span className="font-num text-bone-200">{fmt(D(r.offSouls))} souls/h</span> : <span>the full squad cannot hold its ground</span>}, up to {r.cap}h</div>
      </Tooltip>
    </div>
  );
}
function computeModsOfflineRate() { return 0.8; }

function PhantomCard({ id, benched }: { id: string; benched: boolean }) {
  const dispatch = useGame((g) => g.dispatch);
  const def = getPhantom(id);
  const level = useSel((s) => s.squad.phantoms.find((p) => p.id === id)?.level ?? 1);
  const assignment = useSel((s) => s.squad.phantoms.find((p) => p.id === id)?.assignment ?? 'beside');
  const weapon = useSel((s) => s.squad.phantoms.find((p) => p.id === id)?.weapon ?? null);
  const retreat = useSel((s) => (s.squad.phantoms.find((p) => p.id === id)?.retreat ?? 0) > 0);
  const nums = useSel((s) => { const ph = s.squad.phantoms.find((p) => p.id === id)!; const n = phantomNumbers(s, computeMods(s), ph); return JSON.stringify({ dps: n.dps.toString(), hp: n.hp, heal: n.healPerAct, buff: n.buffMult, stagger: n.staggerPerHit, xp: ph.xp.toString(), next: phantomXpToNext(ph).toString(), cost: phantomLevelCost(ph).toString(), weaponName: n.weaponName }); });
  const souls = useSel((s) => s.souls.toString());
  const freeWeapons = useSel((s) => Object.keys(s.player.weapons).filter((w) => w !== s.player.weapon && !s.squad.phantoms.some((p) => p.id !== id && p.weapon === w)).join(','));
  const covenant = useSel((s) => s.covenant.current);
  const n = JSON.parse(nums);
  const canLevel = D(souls).gte(D(n.cost));
  const affinity = covenant === def.covenant;
  return (
    <div className={`border rounded-sm p-2 flex flex-col gap-1.5 ${benched ? 'border-ash-800 opacity-60' : 'border-ash-700'}`}>
      <div className="flex items-baseline justify-between">
        <Tooltip tip={<div><div className="italic">{def.lore}</div><div className="mt-1 text-bone-400">{ROLE_DESC[def.role]}</div><div className="mt-1 text-ember-400">{def.affinityBonus}{affinity ? ' (active)' : ''}</div></div>}>
          <span className="font-display text-base text-bone-100 cursor-help">{def.name}</span>
        </Tooltip>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">{def.role} · lv <span className="font-num text-bone-200">{level}</span></span>
      </div>
      {benched && <div className="text-[11px] text-bone-400 italic">Waiting at the bonfire: no free slot.</div>}
      {retreat && !benched && <div className="text-[11px] text-blood-500">Retreating: the hunting ground is too dangerous.</div>}
      <div className="grid grid-cols-3 gap-x-2 text-[11px] font-num text-bone-300">
        <span>{fmt(D(n.dps))} dps</span><span>{n.hp} hp</span>
        <span>{def.role === 'healer' ? `heals ${Math.round(n.heal * 100)}%` : def.role === 'buffer' ? `×${n.buff.toFixed(2)} party` : `${n.stagger.toFixed(1)} stagger`}</span>
      </div>
      <Bar value={Number(n.xp)} max={Number(n.next)} color="#575050" height={3} />
      <div className="flex gap-1 flex-wrap items-center">
        <Tooltip tip="Beside you: fights in your encounter, feeds your riposte, heals or buffs you. Hunting: grinds a cleared tier on its own for 45% souls per kill, online and offline. Away from the keyboard, everyone hunts.">
          <div className="flex border border-ash-600 rounded-sm overflow-hidden">
            <button className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${assignment === 'beside' ? 'bg-ember-700/50 text-ember-400' : 'text-bone-400'}`} onClick={() => dispatch({ type: 'assignPhantom', phantom: id, assignment: 'beside' })}>Beside</button>
            <button className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${assignment === 'hunt' ? 'bg-ember-700/50 text-ember-400' : 'text-bone-400'}`} onClick={() => dispatch({ type: 'assignPhantom', phantom: id, assignment: 'hunt' })}>Hunt</button>
          </div>
        </Tooltip>
        <select className="bg-ash-800 border border-ash-600 text-bone-200 text-[11px] px-1 py-0.5 rounded-sm flex-1 min-w-[100px]" value={weapon ?? ''} onChange={(e) => dispatch({ type: 'equipPhantom', phantom: id, weapon: e.target.value || null })} title="Gear slot: any weapon you own and are not wielding.">
          <option value="">{n.weaponName.includes('(worn)') ? n.weaponName : 'No weapon'}</option>
          {freeWeapons.split(',').filter(Boolean).map((w) => <option key={w} value={w}>{getWeapon(w).name}</option>)}
        </select>
        <Tooltip tip={<span>Level {level} → {level + 1}: +7% damage, +6% HP. Phantoms also level for free from hunting experience (the grey bar).</span>}>
          <button className={`btn text-[11px] px-2 py-0.5 ${canLevel ? 'btn-ember' : ''}`} disabled={!canLevel} onClick={() => dispatch({ type: 'levelPhantom', phantom: id })}>Level · {fmt(D(n.cost))}</button>
        </Tooltip>
      </div>
    </div>
  );
}

function RecruitCard({ id }: { id: string }) {
  const dispatch = useGame((g) => g.dispatch);
  const def = getPhantom(id);
  const why = useSel((s) => canRecruit(s, id));
  return (
    <div className="border border-dashed border-ash-600 rounded-sm p-2 flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-base text-bone-200">{def.name}</span>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">{def.role}</span>
      </div>
      <p className="text-[11px] italic text-bone-400">{def.lore}</p>
      <p className="text-[11px] text-bone-400">{ROLE_DESC[def.role]} Affinity: {COVENANTS[def.covenant]?.name ?? def.covenant}.</p>
      <button className={`btn text-xs self-start ${why ? '' : 'btn-ember'}`} disabled={!!why} title={why ?? ''} onClick={() => dispatch({ type: 'recruit', phantom: id })}>Summon · {fmt(def.recruitCost)} souls{why ? ` — ${why}` : ''}</button>
    </div>
  );
}
