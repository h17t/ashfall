import { memo, useCallback, useRef, useState } from 'react';
import { useGame, useSel } from '../store';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';
import { getEnemy, getBoss, getZone } from '@/content';
import { Gauge } from '@/render/Gauge';
import { Slab } from '@/render/materials/Slab';
import { Backdrop } from '@/render/Backdrop';
import { Figure } from './Figure';
import { Vfx } from '@/vfx/Vfx';
import { vfxSupported } from '@/vfx/gl';
import { FloatingNumbers } from './FloatingNumbers';

/**
 * The combat frame. One slab, one scene: the region plate behind, the figure standing in it,
 * the name card top-left, the health gauge along the foot. The eye should land on the enemy's
 * eyes, then the name, then the gauge (ART.md §4, mockup A).
 */
const GL = vfxSupported();

export const Encounter = memo(function Encounter() {
  const dispatch = useGame((g) => g.dispatch);
  const name = useSel((s) => s.encounter.enemy?.name ?? '');
  const id = useSel((s) => s.encounter.enemy?.id ?? '');
  const isBoss = useSel((s) => s.encounter.enemy?.isBoss ?? false);
  const phase = useSel((s) => s.encounter.enemy?.phase ?? 0);
  const hp = useSel((s) => s.encounter.enemy?.hp.toString() ?? '0');
  const hpMax = useSel((s) => s.encounter.enemy?.hpMax.toString() ?? '1');
  const stagger = useSel((s) => s.encounter.enemy?.stagger ?? 0);
  const poise = useSel((s) => s.encounter.enemy?.poise ?? 1);
  const riposte = useSel((s) => s.encounter.enemy?.riposte ?? 0);
  const windup = useSel((s) => s.encounter.enemy?.windup ?? 0);
  const windupTotal = useSel((s) => s.encounter.enemy?.windupTotal ?? 1);
  const attackDmg = useSel((s) => s.encounter.enemy?.attackDamage ?? 0);
  const attackPct = useSel((s) => s.encounter.enemy ? Math.round((s.encounter.enemy.attackDamage / Math.max(1, s.player.hpMax)) * 100) : 0);
  const attackId = useSel((s) => s.encounter.enemy?.attackId ?? '');
  const zone = useSel((s) => s.encounter.zone);
  const zoneName = useSel((s) => getZone(s.encounter.zone).name);
  const tier = useSel((s) => s.encounter.tier);
  const tierName = useSel((s) => { const z = getZone(s.encounter.zone); return s.encounter.tier >= 0 ? z.tiers[s.encounter.tier].name : s.encounter.tier === -1 ? 'Boss Arena' : s.encounter.tier === -2 ? 'A hidden place' : 'Something new walks the road'; });
  const phaseName = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).phases[s.encounter.enemy.phase].name : ''));
  const bossTitle = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).title : ''));
  const bossName = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).name : ''));
  const bleed = useSel((s) => s.encounter.enemy?.statuses.bleed.buildup ?? 0);
  const poison = useSel((s) => s.encounter.enemy?.statuses.poison.active ?? 0);
  const frost = useSel((s) => s.encounter.enemy?.statuses.frost.active ?? 0);
  const hymn = useSel((s) => s.encounter.enemy?.mech.hymn === 1);
  const blind = useSel((s) => s.encounter.enemy?.mech.blind === 1);
  const mechanicText = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).phases[s.encounter.enemy.phase].text : ''));
  const lore = useSel((s) => (s.encounter.enemy && !s.encounter.enemy.isBoss ? getEnemy(s.encounter.enemy.id).lore ?? '' : ''));

  const [shake, setShake] = useState(0);
  const [hurt, setHurt] = useState(false);
  const hurtTimer = useRef<number>(0);
  const onEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'hit' && e.source === 'player') {
        setHurt(true);
        window.clearTimeout(hurtTimer.current);
        hurtTimer.current = window.setTimeout(() => setHurt(false), 90);
        if (e.riposte || e.crit) setShake((s) => s + 1);
      }
      if (e.type === 'enemyAttack' && !e.dodged) setShake((s) => s + 1);
    }
  }, []);
  useEvents(onEvents);

  const hpNum = Number(hp), hpMaxNum = Number(hpMax);
  const telegraph = windup > 0;
  const staggered = riposte > 0;
  const onClick = useCallback(() => dispatch({ type: 'click' }), [dispatch]);

  return (
    <Slab material="stone" seed="arena" rough={7} ornament="scorch" outer={`arena w-full flex ${!GL && shake % 2 ? 'shake' : ''}`} className="flex-1 flex flex-col min-h-0">
      <div className={`relative flex-1 min-h-[520px] cursor-pointer overflow-hidden ${staggered ? 'riposte-glow' : ''}`} onMouseDown={onClick}>
        {GL ? (
          <Vfx />
        ) : (
          <>
            <Backdrop zone={zone} dim={isBoss ? 0.5 : 0.3} />
            <div className={`absolute inset-x-0 bottom-[12%] top-[8%] flex items-end justify-center transition-transform ${staggered ? 'scale-[1.04]' : ''}`}>
              {name && <Figure kind={isBoss ? 'boss' : 'enemy'} id={id} hurt={hurt} staggered={staggered} poison={poison > 0} frost={frost > 0} bleed={bleed} big={isBoss} />}
            </div>
          </>
        )}
        {!name && <div className="absolute inset-x-0 bottom-[30%] text-center t-lore text-[18px] pointer-events-none">The ash settles.</div>}

        {/* name card */}
        <div className="arena-namecard absolute left-7 top-6 max-w-[62%] pointer-events-none">
          <div className="t-label">{zoneName} · {tierName}</div>
          <div className={`t-display leading-none mt-2 ${isBoss ? 'text-[44px]' : 'text-[30px]'}`} style={{ textShadow: '0 2px 0 var(--void), 0 0 24px var(--void)' }}>{isBoss ? bossName : name || '—'}</div>
          {isBoss && bossTitle && <div className="t-display text-[17px] mt-2" style={{ color: 'var(--bone)', letterSpacing: '0.2em' }}>{bossTitle}</div>}
          {!isBoss && lore && <div className="t-lore text-[14px] mt-2 max-w-[360px] leading-snug" style={{ textShadow: '0 1px 2px var(--void)' }}>{lore}</div>}
        </div>

        {staggered && (
          <div className="absolute inset-x-0 top-[38%] text-center t-display text-[46px] pointer-events-none" style={{ color: 'var(--ember-hot)', letterSpacing: '0.42em', textShadow: '0 0 28px color-mix(in srgb, var(--ember-hot) 90%, transparent), 0 2px 0 var(--void)' }}>
            Riposte
          </div>
        )}
        {hymn && !staggered && (
          <div className="absolute inset-x-0 top-[30%] text-center t-display text-[20px] pointer-events-none" style={{ color: 'var(--soul)', letterSpacing: '0.3em', textShadow: '0 0 16px color-mix(in srgb, var(--soul) 80%, transparent)' }}>
            The hymn sounds. Hold your blade.
          </div>
        )}
        {telegraph && blind && !staggered && (
          <div className="absolute inset-x-0 bottom-4 text-center t-label" style={{ color: 'var(--ash)' }}>Something moves in the dark.</div>
        )}
        {telegraph && !blind && !staggered && (
          <div className="absolute inset-x-0 bottom-4 pl-10 pr-10 lg:pr-[120px] pointer-events-none">
            <div className="t-label mb-1 flex justify-between" style={{ color: 'var(--blood-bright)' }}><span>{attackId}</span><span className="t-num">{attackDmg} · {attackPct}% of you · dodge</span></div>
            <Gauge value={windupTotal - windup} max={windupTotal} tone="blood" height={5} cut={1} />
          </div>
        )}
        <FloatingNumbers />
      </div>

      {/* the foot: health, poise, statuses */}
      <div className="relative px-7 lg:pr-[120px] pt-3 pb-5" style={{ background: 'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--void) 35%, transparent) 100%)' }}>
        <div className="flex justify-between items-end mb-1">
          <div className="t-label" style={{ color: isBoss ? 'var(--ember-hot)' : undefined }}>{isBoss ? `Phase ${phase + 1} · ${phaseName}` : tier >= 0 ? <TierProgress /> : ' '}</div>
          <span className="t-num text-[18px]" style={{ color: 'var(--parchment)' }}>{fmt(hpNum)} <span style={{ color: 'var(--ash)' }}>/ {fmt(hpMaxNum)}</span></span>
        </div>
        <Gauge value={hpNum} max={hpMaxNum} tone={isBoss ? 'ember' : 'blood'} height={isBoss ? 14 : 11} />
        <Gauge value={staggered ? poise : stagger} max={poise} tone={staggered ? 'ember' : 'bone'} height={4} cut={1} className="mt-1.5" />
        <div className="flex gap-4 mt-2 t-label min-h-[14px]">
          {bleed > 0 && <span style={{ color: 'var(--blood-bright)' }}>Bleed {Math.round(bleed)}%</span>}
          {poison > 0 && <span style={{ color: 'var(--verdigris)' }}>Poisoned {poison.toFixed(0)}s</span>}
          {frost > 0 && <span style={{ color: 'var(--soul)' }}>Frostbitten {frost.toFixed(0)}s</span>}
          {isBoss && mechanicText && <span className="t-lore normal-case tracking-normal text-[14px] ml-auto text-right max-w-[70%]" style={{ letterSpacing: 0 }}>{mechanicText}</span>}
        </div>
      </div>
    </Slab>
  );
});

function TierProgress() {
  const kills = useSel((s) => s.zones[s.encounter.zone]?.kills[s.encounter.tier] ?? 0);
  const need = useSel((s) => getZone(s.encounter.zone).tiers[s.encounter.tier].kills);
  const cleared = useSel((s) => (s.zones[s.encounter.zone]?.cleared ?? -1) >= s.encounter.tier);
  return <span className="t-num">{cleared ? 'Tier cleared' : `${kills} / ${need} to clear`}</span>;
}
