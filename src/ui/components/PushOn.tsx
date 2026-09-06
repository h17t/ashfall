import { useGame, useSel } from '../store';
import { travelBlocked } from '@/engine';
import { getZone, getBoss, ZONE_ORDER } from '@/content';
import { haptic } from '../haptics';

/** The next step, from the arena itself: the next tier once this one is cleared, the lord once the road is, the next region once the lord has fallen. */
export function PushOn() {
  const dispatch = useGame((g) => g.dispatch);
  const next = useSel((s) => {
    const enc = s.encounter;
    if (s.descent.run || s.deathScreen > 0 || s.remainsRun || enc.tier < 0) return '';
    const z = getZone(enc.zone);
    const zp = s.zones[enc.zone];
    if (!zp || zp.cleared < enc.tier) return '';
    if (enc.tier + 1 < z.tiers.length) return travelBlocked(s, enc.zone, enc.tier + 1) ? '' : JSON.stringify({ label: `Push on to ${z.tiers[enc.tier + 1].name}`, zone: enc.zone, tier: enc.tier + 1 });
    if (zp.bossKills < 1) return travelBlocked(s, enc.zone, -1) ? '' : JSON.stringify({ label: `Challenge the lord, ${getBoss(z.boss).name}`, zone: enc.zone, tier: -1 });
    const nz = ZONE_ORDER[ZONE_ORDER.indexOf(enc.zone) + 1];
    if (nz && s.unlockedZones.includes(nz) && !travelBlocked(s, nz, 0)) return JSON.stringify({ label: `Go on to ${getZone(nz).name}`, zone: nz, tier: 0 });
    return '';
  });
  if (!next) return null;
  const n = JSON.parse(next) as { label: string; zone: string; tier: number };
  return (
    <div className="push-on">
      <button className="btn btn-ember" onClick={() => { haptic('tap'); dispatch({ type: 'travel', zone: n.zone, tier: n.tier }); }}>{n.label}</button>
    </div>
  );
}

