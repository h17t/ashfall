import { memo } from 'react';
import { useGame, useSel } from '../store';
import { travelBlocked, expectedLevel, fmt, tierHp, tierSouls, ngLevel, computeMods } from '@/engine';
import { ZONE_ORDER, getZone, getBoss, globalTier, getEnemy, cycleBossFor } from '@/content';
import { Tooltip } from './Tooltip';
import { asset } from '../../../assets/manifest';

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
  const depthOf = () => useGame.getState().state.prestige.abyssDepth;
  const cleared = useSel((s) => s.zones[zone]?.cleared ?? -1);
  const bossKills = useSel((s) => s.zones[zone]?.bossKills ?? 0);
  const secretFound = useSel((s) => s.zones[zone]?.secretFound ?? false);
  const secretKills = useSel((s) => s.zones[zone]?.secretKills ?? 0);
  const here = useSel((s) => s.encounter.zone === zone);
  const kindles = useSel((s) => s.prestige.kindles);
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
        {cb && kindles >= (cb.cycle ?? 99) && bossKills > 0 && <TierRow zone={zone} tier={-3} name={`${cb.name}, ${cb.title}`} cleared={cycleKills > 0} here={here} boss />}
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
  const depth = useSel((s) => s.prestige.abyssDepth);
  const g = globalTier(zone, tier, depth);
  const ng = useSel((s) => ngLevel(s, computeMods(s)));
  const level = useSel((s) => s.player.level);
  const exp = expectedLevel(g, ng);
  const z = getZone(zone);
  const tip = tier >= 0 ? (
    <div className="flex flex-col gap-1">
      <div className="font-display text-[16px]">{name}</div>
      <div className="text-bone">Foes: {z.tiers[tier].enemies.map((e) => getEnemy(e).name).join(', ')}</div>
      <div className="font-num text-bone/70">~{fmt(tierHp(g, ng))} HP · ~{fmt(tierSouls(g, ng))} souls each · {kills}/{need} to clear</div>
      <div className={level < exp - 4 ? 'text-blood-bright' : 'text-bone/70'}>Fair fight around soul level {exp}. You are {level}.</div>
    </div>
  ) : (
    <div className="flex flex-col gap-1">
      <div className="font-display text-[16px]">{name}</div>
      <div className="text-bone italic">{getBoss(tier === -1 ? z.boss : tier === -2 ? z.secretBoss! : cycleBossFor(zone)!.id).lore}</div>
      <div className={level < exp ? 'text-blood-bright' : 'text-bone/70'}>A wall. Come prepared: around soul level {exp + 4}, a reinforced weapon, and full Estus.</div>
    </div>
  );
  return (
    <div className={`flex items-center gap-2 text-[14px] ${current ? 'text-ember-hot' : cleared ? 'text-parchment' : 'text-bone/70'}`}>
      <span className="w-3 text-center">{current ? '›' : cleared ? '·' : boss ? '†' : '·'}</span>
      <Tooltip className="flex-1" tip={tip}><span className={`cursor-help ${boss ? 'font-display text-[15px]' : ''}`}>{name}</span></Tooltip>
      {tier >= 0 && !cleared && <span className="font-num text-[12px] text-bone/70">{kills}/{need}</span>}
      <button className="btn text-[12px] px-2 py-0.5" disabled={!!blocked || current} title={blocked ?? 'Travel here'} onClick={() => dispatch({ type: 'travel', zone, tier })}>{current ? 'here' : boss ? 'Challenge' : 'Go'}</button>
    </div>
  );
}
