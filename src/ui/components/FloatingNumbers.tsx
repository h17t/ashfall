import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';

interface Num { id: number; text: string; x: number; y: number; cls: string; }
let nextId = 1;

export function FloatingNumbers() {
  const [nums, setNums] = useState<Num[]>([]);
  const onEvents = useCallback((events: GameEvent[]) => {
    const add: Num[] = [];
    for (const e of events) {
      if (e.type === 'hit') {
        const cls = e.riposte ? 'text-ember-400 text-3xl' : e.crit ? 'text-ember-500 text-2xl' : e.source === 'dot' ? 'text-purple-300 text-sm' : e.source === 'phantom' ? 'text-bone-300 text-sm' : 'text-bone-100 text-lg';
        add.push({ id: nextId++, text: (e.riposte ? 'RIPOSTE ' : e.crit ? '✦ ' : '') + fmt(e.dmg), x: 35 + Math.random() * 30, y: 30 + Math.random() * 30, cls });
      } else if (e.type === 'enemyAttack') {
        if (e.dodged) add.push({ id: nextId++, text: e.perfect ? 'PERFECT DODGE' : 'dodged', x: 40 + Math.random() * 20, y: 70, cls: e.perfect ? 'text-ember-400 text-xl' : 'text-bone-300 text-base' });
        else add.push({ id: nextId++, text: `-${e.dmg}`, x: 40 + Math.random() * 20, y: 75, cls: 'text-blood-500 text-2xl' });
      } else if (e.type === 'heal') {
        add.push({ id: nextId++, text: `+${e.amount}`, x: 45, y: 72, cls: 'text-emerald-400 text-xl' });
      } else if (e.type === 'exhausted') {
        add.push({ id: nextId++, text: 'exhausted', x: 45, y: 60, cls: 'text-ash-400 text-xs' });
      } else if (e.type === 'statusProc') {
        add.push({ id: nextId++, text: e.status.toUpperCase(), x: 50, y: 40, cls: 'text-purple-300 text-lg' });
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
