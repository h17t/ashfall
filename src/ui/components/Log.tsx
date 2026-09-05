import { useCallback, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { fmt, type GameEvent } from '@/engine';
import { MATERIALS, getZone, BOONS } from '@/content';
import { Slab } from '@/render/materials/Slab';

interface Line { id: number; text: string; cls: string; t: number }
let nextId = 1;

/** Scrolling log of meaningful events: unlocks, tier clears, drops, deaths, boss phases. */
export function Log() {
  const [lines, setLines] = useState<Line[]>([]);
  const onEvents = useCallback((events: GameEvent[]) => {
    const add: Line[] = [];
    for (const e of events) {
      const push = (text: string, cls = 'text-bone') => add.push({ id: nextId++, text, cls, t: Date.now() });
      switch (e.type) {
        case 'unlock': push(e.text, 'text-ember-hot'); break;
        case 'tierCleared': push(`${getZone(e.zone).tiers[e.tier].name} cleared. The road ahead opens.`, 'text-ember-hot'); break;
        case 'bossPhase': if (e.phase > 0) push(`Phase ${e.phase + 1}: ${e.name}`, 'text-ember-hot'); break;
        case 'bossKilled': push('The lord falls. Its Keepsake is yours to shape.', 'text-ember-hot'); break;
        case 'zoneUnlocked': push(`${getZone(e.zone).name} lies open.`, 'text-ember-hot'); break;
        case 'death': push(e.marrowLost.gt(0) ? `You are unmade. ${fmt(e.marrowLost)} marrow stain the ground where you fell.` : 'You are unmade.', 'text-ember-hot'); break;
        case 'remainsRecovered': push(`Remains recovered: ${fmt(e.marrow)} marrow.`, 'text-verdigris'); break;
        case 'remainsLost': push(`${fmt(e.marrow)} marrow, lost to the ash.`, 'text-ember-hot'); break;
        case 'kill': {
          const drops = Object.entries(e.drops).filter(([k]) => !k.startsWith('__'));
          if (drops.length) push(`Dropped: ${drops.map(([k, n]) => `${n}× ${MATERIALS[k]?.name ?? k}`).join(', ')}`, 'text-bone');
          if (e.isBoss) push(`Felled ${e.enemy} for ${fmt(e.marrow)} marrow.`, 'text-ember-hot');
          break;
        }
        case 'statusProc': if (e.target === 'enemy') push(`${e.status} procs.`, 'text-wisp'); break;
        case 'levelUp': break;
        case 'error': push(e.text, 'text-ash italic'); break;
        case 'notice': push(e.text); break;
        case 'descentFloor': push(e.floor === 1 ? 'You take the stair down. Floor 1.' : `Floor ${e.floor}.`, 'text-wisp'); break;
        case 'descentOffer': push(`Floor ${e.floor} cleared. The stair offers three boons, or the way out.`, 'text-ember-hot'); break;
        case 'boonTaken': push(`${BOONS[e.boon]?.name ?? e.boon}: ${BOONS[e.boon]?.text ?? ''}`, 'text-ember-hot'); break;
        case 'descentBanked': push(`You climb out from floor ${e.floor}. ${fmt(e.haul)} haul × ${e.mult.toFixed(2)} = ${fmt(e.banked)} marrow banked.`, 'text-verdigris'); break;
        case 'descentLost': push(e.haul.gt(0) ? `The stair keeps ${fmt(e.haul)} marrow of haul. Floor ${e.floor}.` : `The stair took you on floor ${e.floor}.`, 'text-ember-hot'); break;
        case 'snuffed': push(`The flame is snuffed. ${fmt(e.vestige)} Vestige gathered.`, 'text-ember-hot'); break;
      }
    }
    if (add.length) setLines((prev) => [...prev, ...add].slice(-8));
  }, []);
  useEvents(onEvents);
  return (
    <Slab material="parchment" seed="log" rough={7} ornament="fold" className="px-5 py-3 min-h-[72px] text-[14px] leading-snug font-body">
      <div className="t-label mb-1" style={{ color: 'var(--ash)' }}>The road so far</div>
      {lines.length === 0 && <span className="t-lore" style={{ color: 'var(--ash)' }}>The ash is quiet.</span>}
      {lines.map((l) => <div key={l.id} style={{ color: l.cls.includes('blood') ? 'var(--blood)' : l.cls.includes('lit') ? 'var(--ember)' : l.cls.includes('verdigris') ? 'var(--verdigris)' : l.cls.includes('wisp') ? 'var(--wisp)' : 'var(--ink)', fontStyle: l.cls.includes('italic') ? 'italic' : undefined, opacity: l.cls === 'text-bone' ? 0.8 : 1 }}>{l.text}</div>)}
    </Slab>
  );
}
