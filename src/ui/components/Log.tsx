import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';
import { MATERIALS, getZone } from '@/content';

interface Line { id: number; text: string; cls: string; t: number }
let nextId = 1;

/** Scrolling log of meaningful events: unlocks, tier clears, drops, deaths, boss phases. */
export function Log() {
  const [lines, setLines] = useState<Line[]>([]);
  const onEvents = useCallback((events: GameEvent[]) => {
    const add: Line[] = [];
    for (const e of events) {
      const push = (text: string, cls = 'text-bone-300') => add.push({ id: nextId++, text, cls, t: Date.now() });
      switch (e.type) {
        case 'unlock': push(e.text, 'text-ember-400'); break;
        case 'tierCleared': push(`${getZone(e.zone).tiers[e.tier].name} cleared. The road ahead opens.`, 'text-ember-400'); break;
        case 'bossPhase': if (e.phase > 0) push(`Phase ${e.phase + 1}: ${e.name}`, 'text-ember-400'); break;
        case 'bossKilled': push('The boss falls. Its soul is yours to shape.', 'text-ember-400'); break;
        case 'zoneUnlocked': push(`${getZone(e.zone).name} lies open.`, 'text-ember-400'); break;
        case 'death': push(e.soulsLost.gt(0) ? `You died. ${fmt(e.soulsLost)} souls stain the ground where you fell.` : 'You died.', 'text-blood-500'); break;
        case 'bloodstainRecovered': push(`Bloodstain recovered: ${fmt(e.souls)} souls.`, 'text-emerald-400'); break;
        case 'bloodstainLost': push(`${fmt(e.souls)} souls, lost to the ash.`, 'text-blood-500'); break;
        case 'kill': {
          const drops = Object.entries(e.drops).filter(([k]) => !k.startsWith('__'));
          if (drops.length) push(`Dropped: ${drops.map(([k, n]) => `${n}× ${MATERIALS[k]?.name ?? k}`).join(', ')}`, 'text-bone-400');
          if (e.isBoss) push(`Felled ${e.enemy} for ${fmt(e.souls)} souls.`, 'text-ember-400');
          break;
        }
        case 'statusProc': if (e.target === 'enemy') push(`${e.status} procs.`, 'text-purple-300'); break;
        case 'levelUp': break;
        case 'error': push(e.text, 'text-ash-400 italic'); break;
        case 'notice': push(e.text); break;
        case 'kindled': push(`The flame is kindled. ${fmt(e.humanity)} Humanity gathered.`, 'text-ember-400'); break;
      }
    }
    if (add.length) setLines((prev) => [...prev, ...add].slice(-8));
  }, []);
  useEvents(onEvents);
  return (
    <div className="slab px-3 py-2 min-h-[64px] text-[12px] leading-snug font-body">
      {lines.length === 0 && <span className="text-bone-400 italic">The ash is quiet.</span>}
      {lines.map((l) => <div key={l.id} className={l.cls}>{l.text}</div>)}
    </div>
  );
}
