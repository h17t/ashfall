import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useGame } from '../store';
import { getBoss } from '@/content';
import type { GameEvent } from '@/engine';

/** Boss intro and phase-change banner. Shows the phase text so the mechanic is taught in-world. */
export function BossBanner() {
  const [banner, setBanner] = useState<{ title: string; sub?: string; text: string; key: number } | null>(null);
  const onEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'bossPhase') {
        const enemy = useGame.getState().state.encounter.enemy;
        if (!enemy || !enemy.isBoss) continue;
        const boss = getBoss(enemy.id);
        const ph = boss.phases[e.phase];
        const title = e.phase === 0 ? boss.name : ph.name;
        setBanner({ title, sub: e.phase === 0 ? boss.title : undefined, text: ph.text, key: Date.now() });
        window.setTimeout(() => setBanner((b) => (b && Date.now() - b.key >= 3900 ? null : b)), 4000);
      }
    }
  }, []);
  useEvents(onEvents);
  if (!banner) return null;
  return (
    <div key={banner.key} className="absolute inset-x-0 bottom-[10%] z-10 text-center pointer-events-none px-6 lg:pr-[120px]" style={{ animation: 'flash 4s ease-in forwards', opacity: 1 }}>
      <div className="t-display text-[34px] md:text-[46px]" style={{ color: 'var(--ember-hot)', textShadow: '0 0 24px color-mix(in srgb, var(--ember-hot) 70%, transparent), 0 2px 0 var(--void)' }}>{banner.title}</div>
      {banner.sub && <div className="t-display text-[18px] mt-1" style={{ color: 'var(--bone)', letterSpacing: '0.22em', textShadow: '0 1px 2px var(--void)' }}>{banner.sub}</div>}
      <div className="t-rule w-48 mx-auto mt-2" style={{ background: 'linear-gradient(90deg, transparent, var(--ember), transparent)' }} />
      <div className="t-lore text-[18px] mt-2" style={{ color: 'var(--parchment)', textShadow: '0 1px 2px var(--void)' }}>{banner.text}</div>
    </div>
  );
}
