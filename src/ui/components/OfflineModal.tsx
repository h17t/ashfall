import { useGame, useSel } from '../store';
import { fmt } from '@/engine';
import { MATERIALS, getZone } from '@/content';

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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="slab p-6 max-w-md w-full flex flex-col gap-3">
        <div className="font-display text-2xl text-ember-400">While you were away</div>
        <div className="text-[12px] text-bone-400 uppercase tracking-widest">{dur(o.seconds)} gone{capped && <span> · counted {dur(o.cappedSeconds)} (offline cap)</span>}</div>
        {nothing ? (
          <p className="text-bone-300 text-sm leading-snug">
            {o.wiped ? 'Your phantoms could not hold their hunting ground and retreated to the bonfire. Nothing was lost; nothing was gained. Send them somewhere gentler, or make them stronger.' : 'You rested at the bonfire. No phantoms were hunting for you, so nothing was gathered. Recruit a phantom and the ash will work while you sleep.'}
          </p>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <span className="text-bone-400">Hunting ground</span><span className="text-bone-200 text-right">{where}</span>
            <span className="text-bone-400">Kills</span><span className="font-num text-bone-100 text-right">{fmt(Number(o.kills))}</span>
            <span className="text-bone-400">Souls</span><span className="font-num text-ember-400 text-right">{fmt(Number(o.souls))}</span>
            {Object.entries(o.materials).map(([k, n]) => <span key={k} className="contents"><span className="text-bone-400">{MATERIALS[k]?.name ?? k}</span><span className="font-num text-bone-100 text-right">{n}</span></span>)}
            {o.phantomXp !== '0' && <><span className="text-bone-400">Phantom experience</span><span className="font-num text-bone-100 text-right">{fmt(Number(o.phantomXp))} each</span></>}
          </div>
        )}
        <p className="text-[11px] text-bone-400">Offline never costs you anything: no deaths, no lost souls, no dropped bloodstains. Your Estus is full.</p>
        <button className="btn btn-ember self-end" onClick={() => dispatch({ type: 'ackOffline' })}>Return to the fire</button>
      </div>
    </div>
  );
}
