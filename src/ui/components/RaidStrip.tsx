import { memo } from 'react';
import { useGame, useSel } from '../store';
import { activeRaid, travelBlocked } from '@/engine';
import { getZone, BALANCE } from '@/content';

/** A raid is on: where, how long, how many kills repel it, and the way there. */
export const RaidStrip = memo(function RaidStrip() {
  const dispatch = useGame((g) => g.dispatch);
  const raid = useSel((s) => { const r = activeRaid(s); return r ? JSON.stringify({ zone: r.zone, remaining: Math.ceil(r.raid.remaining), kills: r.raid.kills, here: s.encounter.zone === r.zone, blocked: travelBlocked(s, r.zone, Math.max(0, s.zones[r.zone]?.cleared ?? 0)), tier: Math.max(0, s.zones[r.zone]?.cleared ?? 0), onStair: !!s.descent.run }) : ''; });
  if (!raid) return null;
  const r = JSON.parse(raid) as { zone: string; remaining: number; kills: number; here: boolean; blocked: string | null; tier: number; onStair: boolean };
  return (
    <div className="raid-strip" role="region" aria-label="Raid">
      <div className="min-w-0">
        <div className="t-label" style={{ color: 'var(--blood-bright)' }}>Raid on {getZone(r.zone).name} · <span className="t-num">{Math.floor(r.remaining / 60)}:{String(r.remaining % 60).padStart(2, '0')}</span></div>
        <div className="text-[15px] leading-tight mt-0.5" style={{ color: 'var(--bone)' }}>{r.here ? <span><span className="t-num" style={{ color: 'var(--parchment)' }}>{r.kills}/{BALANCE.holdfast.raidKills}</span> kills to repel it</span> : 'Fight there to repel it, or let the garrison answer.'}</div>
      </div>
      {!r.here && !r.onStair && <button className="btn min-h-[48px] shrink-0" disabled={r.blocked !== null} onClick={() => dispatch({ type: 'travel', zone: r.zone, tier: r.tier })}>Go</button>}
    </div>
  );
});
