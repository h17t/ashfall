import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';

interface Num { id: number; text: string; x: number; y: number; cls: string; }
let nextId = 1;

export function FloatingNumbers() {
  const [nums, setNums] = useState<Num[]>([]);
  const onEvents = useCallback((events: GameEvent[]) => {
    // no numbers over a cinematic: the card is the only thing that speaks
    if (document.documentElement.classList.contains('cine')) return;
    const add: Num[] = [];
    for (const e of events) {
      if (e.type === 'hit') {
        const cls = e.reprisal ? 'num-reprisal' : e.crit ? 'text-ember-hot text-[30px]' : e.source === 'dot' ? 'text-wisp text-[15px]' : e.source === 'shade' ? 'text-bone text-[15px]' : 'text-parchment text-[22px]';
        add.push({ id: nextId++, text: (e.crit && !e.reprisal ? '¶ ' : '') + fmt(e.dmg), x: 35 + Math.random() * 30, y: 30 + Math.random() * 30, cls });
      } else if (e.type === 'enemyAttack') {
        if (e.dodged) add.push({ id: nextId++, text: e.perfect ? 'PERFECT DODGE' : 'dodged', x: 40 + Math.random() * 20, y: 70, cls: e.perfect ? 'text-ember-hot text-[24px]' : 'text-bone text-[17px]' });
        else add.push({ id: nextId++, text: `-${e.dmg}`, x: 40 + Math.random() * 20, y: 75, cls: 'text-blood-bright text-[30px]' });
      } else if (e.type === 'heal') {
        add.push({ id: nextId++, text: `+${e.amount}`, x: 45, y: 72, cls: 'text-verdigris text-[24px]' });
      } else if (e.type === 'exhausted') {
        add.push({ id: nextId++, text: 'exhausted', x: 45, y: 60, cls: 'text-bone text-[13px]' });
      } else if (e.type === 'statusProc') {
        add.push({ id: nextId++, text: e.status.toUpperCase(), x: 50, y: 40, cls: 'text-wisp text-[22px]' });
      }
    }
    if (add.length) {
      setNums((prev) => [...prev.slice(-30), ...add]);
      window.setTimeout(() => setNums((prev) => prev.filter((n) => !add.includes(n))), 950);
    }
  }, []);
  useEvents(onEvents);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {nums.map((n) => (
        <div key={n.id} className={`float-num ${n.cls}`} style={{ left: `${n.x}%`, top: `${n.y}%` }}>{n.text}</div>
      ))}
    </div>
  );
}
