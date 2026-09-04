import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useGame } from '../store';
import { getBoss } from '@/content';
import type { GameEvent } from '@/engine';

/** Boss intro and phase-change banner. Shows the phase text so the mechanic is taught in-world. */
export function BossBanner() {
  const [banner, setBanner] = useState<{ title: string; text: string; key: number } | null>(null);
  const onEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'bossPhase') {
        const enemy = useGame.getState().state.encounter.enemy;
        if (!enemy || !enemy.isBoss) continue;
        const boss = getBoss(enemy.id);
        const ph = boss.phases[e.phase];
        const title = e.phase === 0 ? `${boss.name}, ${boss.title}` : ph.name;
        setBanner({ title, text: ph.text, key: Date.now() });
        window.setTimeout(() => setBanner((b) => (b && Date.now() - b.key >= 3900 ? null : b)), 4000);
      }
    }
  }, []);
  useEvents(onEvents);
  if (!banner) return null;
  return (
    <div key={banner.key} className="absolute inset-x-0 top-[28%] z-10 text-center pointer-events-none px-6" style={{ animation: 'flash 4s ease-in forwards', opacity: 1 }}>
      <div className="font-display text-3xl md:text-4xl text-ember-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 24px rgba(232,113,42,0.7)' }}>{banner.title}</div>
      <div className="font-display italic text-bone-200 text-lg mt-2">{banner.text}</div>
    </div>
  );
}
