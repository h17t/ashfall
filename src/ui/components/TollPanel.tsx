import { memo } from 'react';
import { useGame, useSel } from '../store';
import { tollPhase, tollRemaining, tollUntilBlack, tollFraction, hasAffliction, canToggleAffliction, afflictionGains, creedHourFavoured } from '@/engine';
import { TOLL_PHASES, TOLL_CYCLE_SECONDS, AFFLICTIONS, AFFLICTION_ORDER, CREEDS } from '@/content';
import { Tooltip } from './Tooltip';
import { haptic } from '../haptics';
import { Plate } from '@/render/Plate';

function mmss(s: number): string { const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; }
const PHASE_COLOR: Record<string, string> = { dawn: 'var(--bone)', day: 'var(--gold)', dusk: 'var(--verdigris)', black: 'var(--wisp)' };

/** The dial: one ring, four arcs the length of their hours, a needle for now. */
function Dial({ frac, phase }: { frac: number; phase: string }) {
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = TOLL_PHASES.map((p) => { const len = (p.minutes * 60) / TOLL_CYCLE_SECONDS; const a = { p, off: acc, len }; acc += len; return a; });
  const ang = frac * 2 * Math.PI - Math.PI / 2;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden className="shrink-0">
      {arcs.map(({ p, off, len }) => (
        <circle key={p.id} cx="70" cy="70" r={R} fill="none" stroke={PHASE_COLOR[p.id]} strokeWidth={p.id === phase ? 10 : 6} opacity={p.id === phase ? 1 : 0.45}
          strokeDasharray={`${len * C - 2} ${C - len * C + 2}`} strokeDashoffset={-off * C} transform="rotate(-90 70 70)" />
      ))}
      <line x1="70" y1="70" x2={70 + Math.cos(ang) * (R - 14)} y2={70 + Math.sin(ang) * (R - 14)} stroke="var(--parchment)" strokeWidth="2" />
      <circle cx="70" cy="70" r="4" fill="var(--ember-hot)" />
    </svg>
  );
}

/** The Toll: the hour of the world, and the afflictions the player has chosen to carry. */
export const TollPanel = memo(function TollPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const phaseId = useSel((s) => tollPhase(s).id);
  const remaining = useSel((s) => Math.floor(tollRemaining(s)));
  const untilBlack = useSel((s) => Math.floor(tollUntilBlack(s)));
  const frac = useSel((s) => tollFraction(s));
  const creed = useSel((s) => s.creed.current);
  const favoured = useSel((s) => creedHourFavoured(s, s.creed.current));
  const taken = useSel((s) => s.afflictions.join(','));
  const unlocked = useSel((s) => !!s.flags.afflictionsUnlocked);
  const onStair = useSel((s) => !!s.descent.run);
  const gains = useSel((s) => JSON.stringify(afflictionGains(s)));
  const phase = TOLL_PHASES.find((p) => p.id === phaseId)!;
  const g = JSON.parse(gains) as ReturnType<typeof afflictionGains>;
  const has = new Set(taken.split(',').filter(Boolean));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="t-display text-[20px] text-ember-hot">The Toll</div>
        <p className="text-[14px] leading-snug mt-1" style={{ color: 'var(--bone)' }}>The world keeps an hour of its own, and it keeps it whether you are here or not. Nothing here is taken from you for being away; the Black Hour's share of an absence pays as it would have.</p>
      </div>
      <div className="flex items-center gap-4">
        <Dial frac={frac} phase={phaseId} />
        <div className="flex-1 min-w-0">
          <div className="t-label" style={{ color: PHASE_COLOR[phaseId] }}>Now</div>
          <div className="t-display text-[24px] leading-tight" style={{ color: 'var(--parchment)' }}>{phase.name}</div>
          <div className="text-[13px] italic mt-1" style={{ color: 'var(--bone)' }}>{phase.lore}</div>
          <div className="t-num text-[13px] mt-2" style={{ color: 'var(--bone)' }}>{mmss(remaining)} left{phaseId !== 'black' && <span> · the Black Hour in <span style={{ color: 'var(--wisp)' }}>{mmss(untilBlack)}</span></span>}</div>
        </div>
      </div>
      <ul className="flex flex-col gap-1 text-[14px]" style={{ color: 'var(--parchment)' }}>
        {phase.effects.map((e) => <li key={e} className="flex gap-2 items-baseline"><span className="toll-bullet" style={{ background: PHASE_COLOR[phaseId] }} />{e}</li>)}
        {creed && <li className="flex gap-2 items-baseline text-[13px]" style={{ color: 'var(--bone)' }}><span className="toll-bullet" style={{ background: 'var(--bone)' }} />{favoured ? `${CREEDS[creed].name}: this is your hour.` : `The hour of ${CREEDS[creed].name} is ${TOLL_PHASES.find((p) => p.creed === creed || (p.id === 'black' && creed === 'nadir'))?.name ?? 'never'}.`}</li>}
      </ul>
      <div className="flex flex-col gap-2">
        <div className="t-label">The hours</div>
        <div className="grid grid-cols-4 gap-1">
          {TOLL_PHASES.map((p) => (
            <Tooltip key={p.id} tip={<div><div className="t-display text-[17px]">{p.name}</div><div className="text-[14px] italic mt-1" style={{ color: 'var(--bone)' }}>{p.lore}</div><ul className="mt-2 text-[14px] flex flex-col gap-1">{p.effects.map((e) => <li key={e} className="flex gap-2 items-baseline"><span className="toll-bullet" style={{ background: PHASE_COLOR[p.id] }} />{e}</li>)}</ul><div className="t-label mt-2">{p.minutes} minutes of a {TOLL_CYCLE_SECONDS / 60} minute turn</div></div>}>
              <div className={`hour-tile ${p.id === phaseId ? 'is-now' : ''}`} style={{ borderColor: PHASE_COLOR[p.id] }}><span className="hour-plate" aria-hidden><Plate kind="toll" id={p.id} className="w-full h-full object-cover" /></span><span className="t-display text-[14px]">{p.name.replace('The ', '')}</span><span className="t-num text-[11px]" style={{ color: 'var(--bone)' }}>{p.minutes}m</span></div>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="border-t border-ash/50 pt-3 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="t-display text-[20px]" style={{ color: 'var(--blood-bright)' }}>Afflictions</span>
          {g.count > 0 && <span className="t-label">{g.count} carried · marrow ×<span className="t-num" style={{ color: 'var(--parchment)' }}>{g.marrow.toFixed(2)}</span>{g.dmg !== 1 && <span> · damage ×<span className="t-num" style={{ color: 'var(--parchment)' }}>{g.dmg.toFixed(2)}</span></span>}</span>}
        </div>
        <p className="text-[14px] leading-snug" style={{ color: 'var(--bone)' }}>Curses you take on by choice. Each costs you something and pays you more; carry as many as you dare. {!unlocked && 'They offer themselves once a lord has fallen.'}{onStair && 'Not on the stair.'}</p>
        <div className="flex flex-col gap-1">
          {AFFLICTION_ORDER.map((id) => { const a = AFFLICTIONS[id]; const on = has.has(id); return (
            <div key={id} className={`affl-row ${on ? 'is-on' : ''}`}>
              <Tooltip mode="wrap" className="flex-1 min-w-0" tip={<div><div className="t-display text-[18px]">{a.name}</div><div className="text-[14px] italic mt-1" style={{ color: 'var(--bone)' }}>{a.lore}</div><div className="text-[14px] mt-2" style={{ color: 'var(--blood-bright)' }}>{a.cost}</div><div className="text-[14px]" style={{ color: 'var(--ember-hot)' }}>{a.gain}</div></div>}>
                <div className="min-w-0">
                  <span className="t-display text-[16px]" style={{ color: 'var(--parchment)' }}>{a.name}</span>
                  <span className="block text-[13px] truncate"><span style={{ color: 'var(--blood-bright)' }}>{a.cost}</span> <span style={{ color: 'var(--ember-hot)' }}>{a.gain}</span></span>
                </div>
              </Tooltip>
              <button role="switch" aria-checked={on} aria-label={`${a.name}: ${a.cost} ${a.gain}`} className={`switch ${on ? 'is-on' : ''}`} disabled={!unlocked || onStair} onClick={() => { haptic(on ? 'tap' : 'hurt'); dispatch({ type: 'toggleAffliction', affliction: id }); }}><span className="switch-knob" aria-hidden /></button>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
});
