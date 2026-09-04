import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useGame, useSel } from '../store';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';
import { getEnemy, getBoss, getZone } from '@/content';
import { Bar } from './Bar';
import { EnemySprite } from './EnemySprite';
import { FloatingNumbers } from './FloatingNumbers';
import { BossBanner } from './BossBanner';

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
  const zoneName = useSel((s) => getZone(s.encounter.zone).name);
  const tier = useSel((s) => s.encounter.tier);
  const tierName = useSel((s) => { const z = getZone(s.encounter.zone); return s.encounter.tier >= 0 ? z.tiers[s.encounter.tier].name : s.encounter.tier === -1 ? 'Boss Arena' : s.encounter.tier === -2 ? 'A hidden place' : 'Something new walks the road'; });
  const deathScreen = useSel((s) => s.deathScreen > 0);
  const phaseName = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).phases[s.encounter.enemy.phase].name : ''));
  const bleed = useSel((s) => s.encounter.enemy?.statuses.bleed.buildup ?? 0);
  const poison = useSel((s) => s.encounter.enemy?.statuses.poison.active ?? 0);
  const frost = useSel((s) => s.encounter.enemy?.statuses.frost.active ?? 0);
  const hymn = useSel((s) => s.encounter.enemy?.mech.hymn === 1);
  const blind = useSel((s) => s.encounter.enemy?.mech.blind === 1);
  const mechanicText = useSel((s) => (s.encounter.enemy?.isBoss ? getBoss(s.encounter.enemy.id).phases[s.encounter.enemy.phase].text : ''));

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

  const shape = id ? (isBoss ? getBoss(id).shape : getEnemy(id).shape) : 'humanoid';
  const hpNum = Number(hp), hpMaxNum = Number(hpMax);
  const telegraph = windup > 0;
  const staggered = riposte > 0;

  const onClick = useCallback(() => dispatch({ type: 'click' }), [dispatch]);

  return (
    <div className={`relative slab p-4 h-full flex flex-col select-none ${shake % 2 ? 'shake' : ''}`} key={shake}>
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-bone-400">{zoneName}</div>
          <div className="font-display text-lg text-bone-200">{tierName}</div>
        </div>
        {isBoss && <div className="text-[10px] uppercase tracking-[0.3em] text-ember-400">Phase {phase + 1}: {phaseName}</div>}
      </div>

      <div
        className={`relative flex-1 min-h-[280px] mt-2 rounded-sm cursor-pointer overflow-hidden ${staggered ? 'riposte-glow' : ''}`}
        onMouseDown={onClick}
        style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(232,113,42,0.08), transparent 60%)' }}
      >
        <div className={`absolute inset-0 flex items-center justify-center transition-transform ${staggered ? 'scale-105' : ''}`} style={{ padding: isBoss ? '2%' : '12%' }}>
          {name ? <EnemySprite shape={shape} phase={phase} staggered={staggered} hurt={hurt} /> : <div className="text-bone-400 font-display italic">The ash settles…</div>}
        </div>
        {staggered && (
          <div className="absolute inset-x-0 top-3 text-center font-display text-3xl tracking-[0.4em] text-ember-400 uppercase" style={{ textShadow: '0 0 20px rgba(255,162,77,0.9)' }}>
            Riposte
          </div>
        )}
        {hymn && !staggered && (
          <div className="absolute inset-x-0 top-12 text-center font-display text-xl tracking-[0.3em] text-purple-300 uppercase" style={{ textShadow: '0 0 16px rgba(180,140,255,0.8)' }}>
            The hymn sounds — hold your blade
          </div>
        )}
        {telegraph && blind && !staggered && (
          <div className="absolute inset-x-0 bottom-3 text-center text-[10px] uppercase tracking-[0.3em] text-ash-400">…something moves in the dark…</div>
        )}
        {telegraph && !blind && !staggered && (
          <div className="absolute inset-x-0 bottom-3 px-8">
            <div className="text-center text-[10px] uppercase tracking-[0.3em] text-blood-500 mb-1">{attackId} · {attackDmg} dmg · {attackPct}% of your HP · dodge!</div>
            <div className="h-1.5 bg-ash-900 border border-blood-600 rounded-sm overflow-hidden">
              <div className="h-full bg-blood-500" style={{ width: `${(1 - windup / windupTotal) * 100}%` }} />
            </div>
          </div>
        )}
        <FloatingNumbers />
        <BossBanner />
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-baseline">
          <span className={`font-display ${isBoss ? 'text-2xl text-ember-400' : 'text-xl text-bone-100'}`}>{name || '—'}</span>
          <span className="font-num text-sm text-bone-300">{fmt(hpNum)} / {fmt(hpMaxNum)}</span>
        </div>
        <Bar value={hpNum} max={hpMaxNum} color={isBoss ? 'linear-gradient(90deg,#c2521a,#e8712a)' : '#a3202a'} height={isBoss ? 14 : 10} className="mt-1" />
        <Bar value={staggered ? poise : stagger} max={poise} color={staggered ? '#ffa24d' : '#b9ad99'} height={5} className="mt-1" />
        <div className="flex gap-3 mt-1 text-[10px] uppercase tracking-widest text-bone-400">
          {bleed > 0 && <span className="text-red-400">Bleed {Math.round(bleed)}%</span>}
          {poison > 0 && <span className="text-purple-300">Poisoned {poison.toFixed(0)}s</span>}
          {frost > 0 && <span className="text-sky-300">Frostbitten {frost.toFixed(0)}s</span>}
          {tier >= 0 && <TierProgress />}
        </div>
        {isBoss && mechanicText && <div className="text-[11px] italic text-bone-400 mt-1">{mechanicText}</div>}
      </div>
      {deathScreen && <DeathOverlay />}
    </div>
  );
});

function TierProgress() {
  const kills = useSel((s) => s.zones[s.encounter.zone]?.kills[s.encounter.tier] ?? 0);
  const need = useSel((s) => getZone(s.encounter.zone).tiers[s.encounter.tier].kills);
  const cleared = useSel((s) => (s.zones[s.encounter.zone]?.cleared ?? -1) >= s.encounter.tier);
  return <span className="ml-auto font-num">{cleared ? 'cleared' : `${kills}/${need} to clear`}</span>;
}

function DeathOverlay() {
  const [t, setT] = useState(0);
  useEffect(() => { const i = window.setInterval(() => setT((x) => x + 1), 100); return () => window.clearInterval(i); }, []);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 rounded-sm">
      <div className="font-display text-5xl md:text-6xl text-blood-500 uppercase" style={{ animation: 'you-died 1.2s ease-out forwards', textShadow: '0 0 30px rgba(163,32,42,0.6)' }}>You Died</div>
    </div>
  );
}
