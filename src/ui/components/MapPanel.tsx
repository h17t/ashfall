import { memo } from 'react';
import { useGame, useSel } from '../store';
import { travelBlocked, expectedLevel, fmt, D, tierHp, tierMarrow, wakingLevel, computeMods, canClaim, claimCost, holdfastRate, canGarrison } from '@/engine';
import { ZONE_ORDER, getZone, getBoss, globalTier, getEnemy, cycleBossFor } from '@/content';
import { Tooltip } from './Tooltip';
import { asset } from '../../../assets/manifest';
import { getPhantom, MATERIALS } from '@/content';

export const MapPanel = memo(function MapPanel() {
  const unlocked = useSel((s) => s.unlockedZones.join(','));
  return (
    <div className="flex flex-col gap-3">
      <div className="t-display text-[20px] text-ember-hot">The Road</div>
      {ZONE_ORDER.filter((z) => unlocked.split(',').includes(z)).map((z) => <ZoneBlock key={z} zone={z} />)}
    </div>
  );
});

function ZoneBlock({ zone }: { zone: string }) {
  const z = getZone(zone);
  const depthOf = () => useGame.getState().state.prestige.nadirDepth;
  const cleared = useSel((s) => s.zones[zone]?.cleared ?? -1);
  const bossKills = useSel((s) => s.zones[zone]?.bossKills ?? 0);
  const secretFound = useSel((s) => s.zones[zone]?.secretFound ?? false);
  const secretKills = useSel((s) => s.zones[zone]?.secretKills ?? 0);
  const here = useSel((s) => s.encounter.zone === zone);
  const wakings = useSel((s) => s.prestige.wakings);
  const cycleKills = useSel((s) => s.zones[zone]?.cycleKills ?? 0);
  const cb = cycleBossFor(zone);
  return (
    <div className="border border-ash/50 p-2 relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[64px] pointer-events-none" style={{ backgroundImage: `linear-gradient(180deg, transparent 20%, var(--ink) 100%), url(${asset('region', zone).layers?.[1] ?? ''}), url(${asset('region', zone).files.x2})`, backgroundSize: 'cover', backgroundPosition: '50% 70%', opacity: 0.7, filter: 'saturate(0.6)' }} />
      <Tooltip tip={<span className="italic">{z.lore}</span>}>
        <div className="relative t-display text-[18px] cursor-help pt-6" style={{ textShadow: '0 1px 2px var(--void), 0 0 12px var(--void)' }}>{z.name} <span className="t-label not-italic">{z.endless ? `Dark Depth ${depthOf()}` : `Region ${z.region}`}</span></div>
      </Tooltip>
      <div className="relative flex flex-col gap-0.5 mt-2">
        {z.tiers.map((t, i) => <TierRow key={i} zone={zone} tier={i} name={t.name} cleared={cleared >= i} here={here} />)}
        <TierRow zone={zone} tier={-1} name={`${getBoss(z.boss).name}, ${getBoss(z.boss).title}`} cleared={bossKills > 0} here={here} boss />
        {z.secretBoss && secretFound && <TierRow zone={zone} tier={-2} name={getBoss(z.secretBoss).name} cleared={secretKills > 0} here={here} boss />}
        {cb && wakings >= (cb.cycle ?? 99) && bossKills > 0 && <TierRow zone={zone} tier={-3} name={`${cb.name}, ${cb.title}`} cleared={cycleKills > 0} here={here} boss />}
      </div>
      {!z.endless && bossKills > 0 && <HoldfastRow zone={zone} />}
    </div>
  );
}

function HoldfastRow({ zone }: { zone: string }) {
  const dispatch = useGame((g) => g.dispatch);
  const held = useSel((s) => !!s.holdfasts[zone]);
  const why = useSel((s) => canClaim(s, zone));
  const cost = useSel((s) => claimCost(s).toString());
  const info = useSel((s) => { const h = s.holdfasts[zone]; if (!h) return ''; const r = holdfastRate(s, zone); return JSON.stringify({ garrison: h.garrison, raidIn: Math.ceil(h.raidIn), raid: h.raid, perMin: r.marrow.mul(60).toString(), slag: r.slag, slagPerHour: Math.round(r.slagPerSec * 3600 * 10) / 10, slowed: Math.ceil(h.slowed), held: h.held, lost: h.lost, produced: h.produced.toString() }); });
  const shades = useSel((s) => JSON.stringify(s.cortege.shades.map((p) => ({ id: p.id, a: p.assignment, ok: canGarrison(s, p.id, zone) }))));
  if (!held) {
    return (
      <div className="relative mt-2 flex items-center justify-between gap-2 border-t border-ash/40 pt-2">
        <div className="text-[13px]" style={{ color: 'var(--bone)' }}><span className="t-display text-[15px]" style={{ color: 'var(--parchment)' }}>Holdfast</span> · claim for <span className="t-num">{fmt(D(cost))}</span> marrow</div>
        <button className="btn text-[13px] min-h-[48px]" disabled={why !== null} onClick={() => dispatch({ type: 'claimHoldfast', zone })}>{why && !/Needs/.test(why) ? 'Not yet' : 'Claim'}</button>
      </div>
    );
  }
  const h = JSON.parse(info) as { garrison: string[]; raidIn: number; raid: { remaining: number; kills: number } | null; perMin: string; slag: string; slagPerHour: number; slowed: number; held: number; lost: number; produced: string };
  const list = JSON.parse(shades) as { id: string; a: string; ok: string | null }[];
  return (
    <div className="relative mt-2 border-t border-ash/40 pt-2 flex flex-col gap-1 text-[13px]" style={{ color: 'var(--bone)' }}>
      <div className="flex items-center justify-between gap-2">
        <span><span className="t-display text-[15px]" style={{ color: 'var(--gold)' }}>Holdfast</span> · <span className="t-num" style={{ color: 'var(--parchment)' }}>{fmt(D(h.perMin))}</span>/min · {h.slagPerHour} {MATERIALS[h.slag]?.name ?? h.slag}/h{h.slowed > 0 && <span style={{ color: 'var(--blood-bright)' }}> · slowed {Math.ceil(h.slowed / 60)}m</span>}</span>
        <span className="t-num">{h.raid ? <span style={{ color: 'var(--blood-bright)' }}>RAID {Math.floor(h.raid.remaining / 60)}:{String(Math.ceil(h.raid.remaining) % 60).padStart(2, '0')}</span> : <span>raid in {Math.floor(h.raidIn / 60)}m</span>}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span>Garrison {h.garrison.length ? h.garrison.map((g) => getPhantom(g).name).join(', ') : 'none'} · held {h.held}, lost {h.lost}</span>
        <select className="bg-ink border border-ash text-parchment text-[13px] px-1 min-h-[48px]" value="" aria-label={`Garrison ${zone}`} onChange={(e) => { if (e.target.value) dispatch({ type: 'garrison', shade: e.target.value.replace(/^-/, ''), zone: e.target.value.startsWith('-') ? null : zone }); }}>
          <option value="">Post or relieve…</option>
          {list.filter((p) => p.ok === null).map((p) => <option key={p.id} value={p.id}>Post {getPhantom(p.id).name}</option>)}
          {h.garrison.map((g) => <option key={'-' + g} value={'-' + g}>Relieve {getPhantom(g).name}</option>)}
        </select>
      </div>
    </div>
  );
}

function TierRow({ zone, tier, name, cleared, here, boss }: { zone: string; tier: number; name: string; cleared: boolean; here: boolean; boss?: boolean }) {
  const dispatch = useGame((g) => g.dispatch);
  const blocked = useSel((s) => travelBlocked(s, zone, tier));
  const current = useSel((s) => here && s.encounter.tier === tier);
  const kills = useSel((s) => tier >= 0 ? (s.zones[zone]?.kills[tier] ?? 0) : 0);
  const need = tier >= 0 ? getZone(zone).tiers[tier].kills : 0;
  const depth = useSel((s) => s.prestige.nadirDepth);
  const g = globalTier(zone, tier, depth);
  const ng = useSel((s) => wakingLevel(s, computeMods(s)));
  const level = useSel((s) => s.player.level);
  const exp = expectedLevel(g, ng);
  const z = getZone(zone);
  const tip = tier >= 0 ? (
    <div className="flex flex-col gap-1">
      <div className="font-display text-[16px]">{name}</div>
      <div className="text-bone">Foes: {z.tiers[tier].enemies.map((e) => getEnemy(e).name).join(', ')}</div>
      <div className="font-num text-bone/70">~{fmt(tierHp(g, ng))} HP · ~{fmt(tierMarrow(g, ng))} marrow each · {kills}/{need} to clear</div>
      <div className={level < exp - 4 ? 'text-blood-bright' : 'text-bone/70'}>Fair fight around level {exp}. You are {level}.</div>
    </div>
  ) : (
    <div className="flex flex-col gap-1">
      <div className="font-display text-[16px]">{name}</div>
      <div className="text-bone italic">{getBoss(tier === -1 ? z.boss : tier === -2 ? z.secretBoss! : cycleBossFor(zone)!.id).lore}</div>
      <div className={level < exp ? 'text-blood-bright' : 'text-bone/70'}>A wall. Come prepared: around level {exp + 4}, a reinforced weapon, and full Tallowdraught.</div>
    </div>
  );
  return (
    <div className={`flex items-center gap-2 text-[14px] ${current ? 'text-ember-hot' : cleared ? 'text-parchment' : 'text-bone/70'}`}>
      <span className="w-3 text-center">{current ? '›' : cleared ? '·' : boss ? '†' : '·'}</span>
      <Tooltip className="flex-1" tip={tip}><span className={`cursor-help ${boss ? 'font-display text-[15px]' : ''}`}>{name}</span></Tooltip>
      {tier >= 0 && !cleared && <span className="font-num text-[12px] text-bone/70">{kills}/{need}</span>}
      <button className="btn text-[12px] px-2 py-0.5" disabled={!!blocked || current} onClick={() => dispatch({ type: 'travel', zone, tier })}>{current ? 'here' : boss ? 'Challenge' : 'Go'}</button>
    </div>
  );
}
