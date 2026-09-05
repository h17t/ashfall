import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D, computeMods, shadeNumbers, shadeLevelCost, shadeXpToNext, canRecruit, cortegeSlots, resolveHunt, currentHunters, huntTargets, activeShades } from '@/engine';
import { SHADES, getPhantom, getZone, getWeapon, CREEDS } from '@/content';
import { Tooltip } from './Tooltip';
import { Bar } from './Bar';
import { Plate } from '@/render/Plate';
import { DispatchSheet } from './DispatchSheet';
import { missionOf } from '@/engine';
import { useState } from 'react';

const ROLE_DESC: Record<string, string> = {
  dps: 'Raw damage. Worth most beside you, where kills pay full marrow.',
  strain: 'Builds strain fast. Feeds your reprisal window when beside you.',
  healer: 'Heals you beside you; keeps the cortege alive on a hunt. Worth most when you are away.',
  buffer: 'Multiplies the damage of everyone around it, you included.',
  status: 'Applies bleed and poison. The answer to foes that heal or shrug off steel.',
};

export const CortegePanel = memo(function CortegePanel() {
  const recruited = useSel((s) => s.cortege.recruited.join(','));
  const slots = useSel((s) => cortegeSlots(s, computeMods(s)));
  const unlocked = useSel((s) => s.unlockedZones.join(','));
  const ids = recruited.split(',').filter(Boolean);
  const recruitable = Object.values(SHADES).filter((p) => !ids.includes(p.id) && unlocked.split(',').includes(p.zone));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] text-ember-hot">Cortege</span>
        <Tooltip tip="One slot to begin with. Each region's lord you fell adds a slot, up to five. The Dark Severing can open a sixth. Shades beyond your slots wait at the lantern."><span className="t-label cursor-help">{Math.min(ids.length, slots)}/{slots} fielded</span></Tooltip>
      </div>
      <HuntReadout />
      {ids.map((id, i) => <ShadeCard key={id} id={id} benched={i >= slots} />)}
      {recruitable.map((p) => <RecruitCard key={p.id} id={p.id} />)}
      {ids.length === 0 && recruitable.length === 0 && <p className="text-[14px] text-bone/70 italic">No one answers. Shades are found along the road.</p>}
    </div>
  );
});

function HuntReadout() {
  const dispatch = useGame((g) => g.dispatch);
  const report = useSel((s) => {
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, currentHunters(s, mods));
    const offline = resolveHunt(s, mods, currentHunters(s, mods, true));
    return JSON.stringify({ marrow: r.marrow.mul(60).toString(), kills: r.kills * 60, uptime: r.uptime, survivable: r.survivable, reason: r.reason, zone: r.zone, tier: r.tier, hunters: r.hunters.length, killTime: r.killTime, deathTime: r.deathTime, offMarrow: offline.marrow.mul(3600).mul(mods.offlineRate).toString(), offOk: offline.survivable, cap: mods.offlineCapHours });
  });
  const auto = useSel((s) => s.cortege.huntAuto);
  const targets = useSel((s) => JSON.stringify(huntTargets(s)));
  const r = JSON.parse(report);
  const t = JSON.parse(targets) as { zone: string; tier: number }[];
  const z = getZone(r.zone);
  return (
    <div className="border border-ash/50 p-2 text-[14px] flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-parchment font-display text-[15px]">Hunting ground</span>
        <select className="bg-ink border border-ash text-parchment text-[13px] px-1 py-0.5 max-w-[180px]" value={auto ? 'auto' : `${r.zone}:${r.tier}`} onChange={(e) => {
          if (e.target.value === 'auto') dispatch({ type: 'setHunt', zone: r.zone, tier: r.tier, auto: true });
          else { const [zone, tier] = e.target.value.split(':'); dispatch({ type: 'setHunt', zone, tier: Number(tier), auto: false }); }
        }}>
          <option value="auto">Highest they can hold</option>
          {t.map((x) => <option key={`${x.zone}:${x.tier}`} value={`${x.zone}:${x.tier}`}>{getZone(x.zone).tiers[x.tier].name}</option>)}
        </select>
      </div>
      {r.hunters === 0 ? <div className="text-bone/70 italic">{r.reason}</div> : r.survivable ? (
        <>
          <div className="text-bone">{z.tiers[r.tier].name}, {z.name} · <span className="font-num text-ember-hot">{fmt(D(r.marrow))}</span> marrow/min · <span className="font-num">{r.kills.toFixed(1)}</span> kills/min</div>
          <Tooltip tip={<span>Uptime is the share of time the cortege can stay in the fight: recovery ÷ (recovery + incoming damage). A kill takes {r.killTime.toFixed(0)}s; the cortege would fall in {r.deathTime.toFixed(0)}s of unbroken fighting.</span>}>
            <div className="cursor-help"><Bar value={r.uptime} max={1} color={r.uptime > 0.6 ? '#3D5A4C' : '#B8912F'} label="Holding" text={`${Math.round(r.uptime * 100)}% uptime`} height={5} /></div>
          </Tooltip>
        </>
      ) : <div className="text-blood-bright">{r.reason}</div>}
      <Tooltip tip={<span>While you are away everyone hunts, including shades fighting beside you now. Offline earns {Math.round(computeModsOfflineRate() * 100)}% of the online rate, for up to {r.cap} hours. Offline never loses marrow.</span>}>
        <div className="text-bone/70 cursor-help">Away: {r.offOk ? <span className="font-num text-parchment">{fmt(D(r.offMarrow))} marrow/h</span> : <span>the full cortege cannot hold its ground</span>}, up to {r.cap}h</div>
      </Tooltip>
    </div>
  );
}
function computeModsOfflineRate() { return 0.8; }

function ShadeCard({ id, benched }: { id: string; benched: boolean }) {
  const dispatch = useGame((g) => g.dispatch);
  const def = getPhantom(id);
  const level = useSel((s) => s.cortege.shades.find((p) => p.id === id)?.level ?? 1);
  const assignment = useSel((s) => s.cortege.shades.find((p) => p.id === id)?.assignment ?? 'beside');
  const mission = useSel((s) => { const m = missionOf(s, id); return m ? JSON.stringify({ kind: m.kind, remaining: Math.ceil(m.remaining), total: m.total }) : ''; });
  const canSend = useSel((s) => !!s.flags.dispatchUnlocked);
  const [sending, setSending] = useState(false);
  const weapon = useSel((s) => s.cortege.shades.find((p) => p.id === id)?.weapon ?? null);
  const retreat = useSel((s) => (s.cortege.shades.find((p) => p.id === id)?.retreat ?? 0) > 0);
  const nums = useSel((s) => { const ph = s.cortege.shades.find((p) => p.id === id)!; const n = shadeNumbers(s, computeMods(s), ph); return JSON.stringify({ dps: n.dps.toString(), hp: n.hp, heal: n.healPerAct, buff: n.buffMult, strain: n.staggerPerHit, xp: ph.xp.toString(), next: shadeXpToNext(ph).toString(), cost: shadeLevelCost(ph).toString(), weaponName: n.weaponName }); });
  const marrow = useSel((s) => s.marrow.toString());
  const freeWeapons = useSel((s) => Object.keys(s.player.weapons).filter((w) => w !== s.player.weapon && !s.cortege.shades.some((p) => p.id !== id && p.weapon === w)).join(','));
  const creed = useSel((s) => s.creed.current);
  const n = JSON.parse(nums);
  const canLevel = D(marrow).gte(D(n.cost));
  const affinity = creed === def.creed;
  return (
    <div className={`relative border p-2 pl-[74px] flex flex-col gap-1.5 ${benched ? 'border-ash/40 opacity-60' : 'border-ash/50'}`}>
      <div className="absolute left-1 top-1 bottom-1 w-[64px] overflow-hidden" style={{ filter: 'brightness(1.3) drop-shadow(-3px 4px 6px var(--void))' }}><Plate kind="shade" id={id} className="w-full h-full object-cover object-top" /></div>
      <div className="flex items-baseline justify-between">
        <Tooltip tip={<div><div className="italic">{def.lore}</div><div className="mt-1 text-bone/70">{ROLE_DESC[def.role]}</div><div className="mt-1 text-ember-hot">{def.affinityBonus}{affinity ? ' (active)' : ''}</div></div>}>
          <span className="font-display text-[16px] text-parchment cursor-help">{def.name}</span>
        </Tooltip>
        <span className="t-label">{def.role} · lv <span className="font-num text-parchment">{level}</span></span>
      </div>
      {benched && <div className="text-[13px] text-bone/70 italic">Waiting at the lantern: no free slot.</div>}
      {retreat && !benched && <div className="text-[13px] text-blood-bright">Retreating: the hunting ground is too dangerous.</div>}
      <div className="grid grid-cols-3 gap-x-2 text-[13px] font-num text-bone">
        <span>{fmt(D(n.dps))} dps</span><span>{n.hp} hp</span>
        <span>{def.role === 'healer' ? `heals ${Math.round(n.heal * 100)}%` : def.role === 'buffer' ? `×${n.buff.toFixed(2)} party` : `${n.strain.toFixed(1)} strain`}</span>
      </div>
      <Bar value={Number(n.xp)} max={Number(n.next)} color="#4A423C" height={3} />
      <div className="flex gap-2 flex-wrap items-center">
        <Tooltip mode="inline" tip="Beside you: fights in your encounter, feeds your reprisal, heals or buffs you. Hunting: grinds a cleared tier on its own for 45% marrow per kill, online and offline. Away from the keyboard, everyone hunts.">
          <div className="seg">
            <button className={`seg-btn ${assignment === 'beside' ? 'is-on' : ''}`} disabled={assignment === 'away' || assignment === 'garrison'} onClick={() => dispatch({ type: 'assignShade', shade: id, assignment: 'beside' })}>Beside</button>
            <button className={`seg-btn ${assignment === 'hunt' ? 'is-on' : ''}`} disabled={assignment === 'away' || assignment === 'garrison'} onClick={() => dispatch({ type: 'assignShade', shade: id, assignment: 'hunt' })}>Hunt</button>
            {canSend && <button className={`seg-btn ${assignment === 'away' ? 'is-on' : ''}`} disabled={assignment === 'away' || assignment === 'garrison'} onClick={() => setSending(true)}>Dispatch</button>}
          </div>
          {mission && (() => { const m = JSON.parse(mission) as { kind: string; remaining: number; total: number }; return <div className="text-[13px] mt-1" style={{ color: 'var(--wisp)' }}>Away on {m.kind === 'safe' ? 'the near road' : m.kind === 'risky' ? 'the far road' : 'the dark road'} · back in <span className="t-num">{Math.floor(m.remaining / 60)}:{String(m.remaining % 60).padStart(2, '0')}</span></div>; })()}
          {assignment === 'garrison' && <div className="text-[13px] mt-1" style={{ color: 'var(--gold)' }}>Holding a holdfast (the Road).</div>}
          {sending && <DispatchSheet shade={id} onClose={() => setSending(false)} />}
        </Tooltip>
        <select className="basis-full text-[14px] px-2" value={weapon ?? ''} onChange={(e) => dispatch({ type: 'equipShade', shade: id, weapon: e.target.value || null })} aria-label="Gear slot: any weapon you own and are not wielding.">
          <option value="">{n.weaponName.includes('(worn)') ? n.weaponName : 'No weapon'}</option>
          {freeWeapons.split(',').filter(Boolean).map((w) => <option key={w} value={w}>{getWeapon(w).name}</option>)}
        </select>
        <Tooltip tip={<span>Level {level} → {level + 1}: +7% damage, +6% HP. Shades also level for free from hunting experience (the grey bar).</span>}>
          <button className={`btn text-[13px] px-2 py-0.5 ${canLevel ? 'btn-ember' : ''}`} disabled={!canLevel} onClick={() => dispatch({ type: 'assignShadeLevel', shade: id })}>Level · {fmt(D(n.cost))}</button>
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
    <div className="relative border border-dashed border-ash p-2 pl-[74px] flex flex-col gap-1">
      <div className="absolute left-1 top-1 bottom-1 w-[64px] overflow-hidden" style={{ opacity: 0.6, filter: 'grayscale(0.6) drop-shadow(-3px 4px 6px var(--void))' }}><Plate kind="shade" id={id} className="w-full h-full object-cover object-top" /></div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[16px] text-parchment">{def.name}</span>
        <span className="t-label">{def.role}</span>
      </div>
      <p className="text-[13px] italic text-bone/70">{def.lore}</p>
      <p className="text-[13px] text-bone/70">{ROLE_DESC[def.role]} Affinity: {CREEDS[def.creed]?.name ?? def.creed}.</p>
      <button className={`btn text-[13px] self-start ${why ? '' : 'btn-ember'}`} disabled={!!why} title={why ?? ''} onClick={() => dispatch({ type: 'recruit', shade: id })}>Call · {fmt(def.recruitCost)} marrow{why ? ` — ${why}` : ''}</button>
    </div>
  );
}
