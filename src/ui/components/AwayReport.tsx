import { useEffect, useState } from 'react';
import { useGame, useSel } from '../store';
import { fmt } from '@/engine';
import { MATERIALS, getZone } from '@/content';
import { Sheet } from '../shell/Sheet';
import { Plate } from '@/render/Plate';
import { haptic } from '../haptics';

function dur(s: number): string {
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** A number that counts up to its value over `ms`, stepping on frames. Honest: it lands exactly. */
function useCountUp(target: number, ms = 1400, delay = 0): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay;
    const tick = (t: number) => { const k = Math.min(1, Math.max(0, (t - t0) / ms)); const e = 1 - Math.pow(1 - k, 3); setV(target * e); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

/**
 * "While you were away", designed as a screen: the Cortege that hunted, where, what it brought
 * back, counted up line by line. The best reason to have opened the app. A bottom sheet: pull it
 * down (or tap the button) to return to the fire.
 */
export function AwayReport() {
  const dispatch = useGame((g) => g.dispatch);
  const off = useSel((s) => (s.offline ? JSON.stringify({ ...s.offline, marrow: s.offline.marrow.toString(), kills: s.offline.kills.toString(), shadeXp: s.offline.shadeXp.toString(), blackShare: s.offline.blackShare ?? 0 }) : ''));
  const hunters = useSel((s) => s.cortege.shades.map((p) => p.id).join(','));
  if (!off) return null;
  return <Report json={off} hunters={hunters.split(',').filter(Boolean)} onClose={() => dispatch({ type: 'ackOffline' })} />;
}

function Report({ json, hunters, onClose }: { json: string; hunters: string[]; onClose: () => void }) {
  const o = JSON.parse(json) as { seconds: number; cappedSeconds: number; marrow: string; materials: Record<string, number>; kills: string; shadeXp: string; zone: string; tier: number; wiped: boolean; blackShare?: number };
  const capped = o.seconds > o.cappedSeconds + 1;
  const nothing = o.marrow === '0' && Object.keys(o.materials).length === 0;
  const zone = getZone(o.zone);
  const where = o.tier >= 0 ? `${zone.tiers[Math.min(o.tier, zone.tiers.length - 1)].name}, ${zone.name}` : zone.name;
  const marrow = useCountUp(Number(o.marrow), 1600, 300);
  const kills = useCountUp(Number(o.kills), 1000, 200);
  const xp = useCountUp(Number(o.shadeXp), 1000, 500);
  useEffect(() => { if (!nothing) haptic('levelUp'); }, [nothing]);
  return (
    <Sheet open onClose={onClose} material="stone" label="While you were away">
      <div className="away flex flex-col gap-4 -mt-2">
        <div>
          <div className="t-label">{dur(o.seconds)} gone{capped && <span> · {dur(o.cappedSeconds)} counted</span>}</div>
          <div className="t-display text-[28px] leading-tight mt-1" style={{ color: 'var(--ember-hot)' }}>While you were away</div>
        </div>
        <div className="away-scene relative h-[150px] overflow-hidden" style={{ clipPath: 'polygon(0 2%, 100% 0, 99% 100%, 1% 97%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: `url(${zoneLayer(o.zone, 0)}), url(${zoneLayer(o.zone, 1)})`, backgroundSize: 'cover', backgroundPosition: '50% 70%', filter: 'saturate(0.7) brightness(0.8)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, var(--ink) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 px-4 pb-1">
            {hunters.slice(0, 4).map((id, i) => <div key={id} className="w-[64px] h-[84px]" style={{ filter: 'brightness(1.1) drop-shadow(-3px 4px 6px var(--void))', transform: `translateY(${i % 2 ? 4 : 0}px)` }}><Plate kind="shade" id={id} className="w-full h-full object-contain object-bottom" /></div>)}
          </div>
          <div className="absolute left-3 top-3 t-label" style={{ color: 'var(--parchment)', textShadow: '0 1px 2px var(--void)' }}>{where}</div>
        </div>
        {nothing ? (
          <p className="text-[16px] leading-snug" style={{ color: 'var(--bone)' }}>
            {o.wiped ? 'Your Cortege could not hold its hunting ground and came back to the Lantern. Nothing was lost; nothing was gained. Send them somewhere gentler, or make them stronger.' : 'You rested at the Lantern. No Shade was hunting for you, so nothing was gathered. Call a Shade and the road will work while you sleep.'}
          </p>
        ) : (
          <div className="flex flex-col">
            <Row label="Marrow" value={fmt(Math.round(marrow))} hot />
            <Row label="Kills" value={fmt(Math.round(kills))} />
            {Object.entries(o.materials).map(([k, n], i) => <Row key={k} label={MATERIALS[k]?.name ?? k} value={String(n)} delay={i} plate={k} />)}
            {o.shadeXp !== '0' && <Row label="Shade experience" value={`${fmt(Math.round(xp))} each`} />}
          </div>
        )}
        <p className="t-lore text-[14px]">Being away never costs you anything: no deaths, no lost Marrow, no dropped Remains. Your Tallowdraught is full.</p>
        <button className="btn btn-ember min-h-[56px] text-[15px]" onClick={onClose}>Return to the fire</button>
      </div>
    </Sheet>
  );
}

function Row({ label, value, hot, delay = 0, plate }: { label: string; value: string; hot?: boolean; delay?: number; plate?: string }) {
  return (
    <div className="ledger items-center" style={{ animation: `away-row 500ms ease-out ${200 + delay * 120}ms both` }}>
      <span className="flex items-center gap-2 text-[16px]" style={{ color: 'var(--bone)' }}>{plate && <span className="w-7 h-7"><Plate kind="item" id={plate} className="w-full h-full object-contain" /></span>}{label}</span>
      <span className="t-num text-[22px]" style={{ color: hot ? 'var(--ember-hot)' : 'var(--parchment)' }}>{value}</span>
    </div>
  );
}

import { asset } from '../../../assets/manifest';
function zoneLayer(zone: string, i: number): string { try { return asset('region', zone).layers?.[i] ?? ''; } catch { return ''; } }
