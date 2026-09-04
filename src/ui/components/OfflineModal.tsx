import { useGame, useSel } from '../store';
import { fmt } from '@/engine';
import { MATERIALS, getZone } from '@/content';
import { Slab } from '@/render/materials/Slab';

function dur(s: number): string {
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** "While you were away" — itemized and honest about caps and wipes. */
export function OfflineModal() {
  const dispatch = useGame((g) => g.dispatch);
  const off = useSel((s) => (s.offline ? JSON.stringify({ ...s.offline, souls: s.offline.souls.toString(), kills: s.offline.kills.toString(), phantomXp: s.offline.phantomXp.toString() }) : ''));
  if (!off) return null;
  const o = JSON.parse(off) as { seconds: number; cappedSeconds: number; souls: string; materials: Record<string, number>; kills: string; phantomXp: string; zone: string; tier: number; wiped: boolean };
  const capped = o.seconds > o.cappedSeconds + 1;
  const nothing = o.souls === '0' && Object.keys(o.materials).length === 0;
  const zone = getZone(o.zone);
  const where = o.tier >= 0 ? `${zone.tiers[Math.min(o.tier, zone.tiers.length - 1)].name}, ${zone.name}` : zone.name;
  return (
    <div className="fixed inset-0 z-50 bg-void/85 flex items-center justify-center p-4">
      <Slab material="stone" seed="away" rough={7} className="p-6 max-w-md w-full flex flex-col gap-3">
        <div className="t-display text-[26px] text-ember-hot">While you were away</div>
        <div className="t-label">{dur(o.seconds)} gone{capped && <span> · counted {dur(o.cappedSeconds)} (offline cap)</span>}</div>
        {nothing ? (
          <p className="text-bone text-[15px] leading-snug">
            {o.wiped ? 'Your phantoms could not hold their hunting ground and retreated to the bonfire. Nothing was lost; nothing was gained. Send them somewhere gentler, or make them stronger.' : 'You rested at the bonfire. No phantoms were hunting for you, so nothing was gathered. Recruit a phantom and the ash will work while you sleep.'}
          </p>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[15px]">
            <span className="text-bone/70">Hunting ground</span><span className="text-parchment text-right">{where}</span>
            <span className="text-bone/70">Kills</span><span className="font-num text-parchment text-right">{fmt(Number(o.kills))}</span>
            <span className="text-bone/70">Souls</span><span className="font-num text-ember-hot text-right">{fmt(Number(o.souls))}</span>
            {Object.entries(o.materials).map(([k, n]) => <span key={k} className="contents"><span className="text-bone/70">{MATERIALS[k]?.name ?? k}</span><span className="font-num text-parchment text-right">{n}</span></span>)}
            {o.phantomXp !== '0' && <><span className="text-bone/70">Phantom experience</span><span className="font-num text-parchment text-right">{fmt(Number(o.phantomXp))} each</span></>}
          </div>
        )}
        <p className="text-[13px] text-bone/70">Offline never costs you anything: no deaths, no lost souls, no dropped bloodstains. Your Estus is full.</p>
        <button className="btn btn-ember self-end" onClick={() => dispatch({ type: 'ackOffline' })}>Return to the fire</button>
      </Slab>
    </div>
  );
}
