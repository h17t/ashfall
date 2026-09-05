import { useCallback, useEffect, useState } from 'react';
import { useGame, useSel } from '../store';
import { useEvents } from '../hooks/useEvents';
import { useSettings } from '../settings';
import type { GameEvent } from '@/engine';
import { Slab } from '@/render/materials/Slab';

/**
 * Onboarding that teaches by playing. Each hint appears once, in the moment it is relevant,
 * and dismisses itself when the player does the thing. No text wall.
 */
interface Hint { id: string; text: string; until?: (e: GameEvent[]) => boolean; }

const HINTS: Record<string, Hint> = {
  click: { id: 'click', text: 'Strike the enemy: click it (or press F).', until: (ev) => ev.some((e) => e.type === 'hit' && e.source === 'player') },
  telegraph: { id: 'telegraph', text: 'The red bar is a wind-up. Dodge (Space) just before it fills for a perfect dodge and a damage buff.', until: (ev) => ev.some((e) => e.type === 'enemyAttack' && e.dodged) },
  strain: { id: 'strain', text: 'The pale bar under its health is its composure. Fill it and the Reprisal window opens: strike then for ×3 or more.', until: (ev) => ev.some((e) => e.type === 'hit' && e.reprisal) },
  stamina: { id: 'stamina', text: 'Out of stamina, your hits land weak and build no strain. Find a rhythm; the bar refills fast.' },
  levelUp: { id: 'levelUp', text: 'You can afford a level. Open the Lantern tab: each stat shows exactly what its next point buys.', until: (ev) => ev.some((e) => e.type === 'levelUp') },
  death: { id: 'death', text: 'Your marrow fell where you are unmade. Fight back to that tier, one kill per tier, to reclaim them. Die first and they are gone.', until: (ev) => ev.some((e) => e.type === 'remainsRecovered' || e.type === 'remainsLost') },
  cleared: { id: 'cleared', text: 'Tier cleared. The Road tab lets you push on, or stay and farm. Every tier past this one is a choice.' },
  boss: { id: 'boss', text: 'The arena is open. Bosses have phases; each one punishes a lazy habit. Read the phase text under its name.' },
  shade: { id: 'shade', text: 'A shade will answer for 400 marrow (Cortege tab). Beside you it fights your fight; hunting, it earns while you are away.' },
  offline: { id: 'offline', text: 'Everyone hunts while you are gone, for up to 12 hours. Offline never costs you anything.' },
  snuff: { id: 'snuff', text: 'A lord has fallen. The Snuff tab shows what the flame would gather: Vestige buys permanent might. Snuffing resets the road but never your knowledge.' },
};

export function Hints() {
  const show = useSettings((s) => s.showTutorial);
  const [seen, setSeen] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('mournwake.hints') ?? '[]')); } catch { return new Set(); } });
  const [active, setActive] = useState<string | null>(null);
  const dismiss = useCallback((id: string) => {
    setSeen((prev) => { const n = new Set(prev); n.add(id); try { localStorage.setItem('mournwake.hints', JSON.stringify([...n])); } catch { /* ignore */ } return n; });
    setActive((a) => (a === id ? null : a));
  }, []);
  // state-driven triggers
  const canLevel = useSel((s) => s.marrow.gte(30) && s.player.level === 1);
  const cleared = useSel((s) => (s.zones[s.encounter.zone]?.cleared ?? -1) >= 0);
  const bossOpen = useSel((s) => (s.zones.tollroad?.cleared ?? -1) >= 3 && (s.zones.tollroad?.bossKills ?? 0) === 0);
  const recruitable = useSel((s) => s.marrow.gte(400) && s.cortege.recruited.length === 0);
  const lowStam = useSel((s) => s.player.stamina < 8 && s.stats.clicks > 20);
  const bossDead = useSel((s) => s.stats.bossKills > 0 && s.prestige.wakings === 0);
  const hasPhantom = useSel((s) => s.cortege.recruited.length > 0);
  const clicks = useSel((s) => s.stats.clicks);
  const kills = useSel((s) => s.stats.kills.toNumber());
  useEffect(() => {
    if (!show || active) return;
    const order: [string, boolean][] = [
      ['click', clicks === 0 && kills === 0],
      ['telegraph', kills >= 2],
      ['strain', kills >= 5],
      ['stamina', lowStam],
      ['levelUp', canLevel],
      ['cleared', cleared],
      ['shade', recruitable],
      ['boss', bossOpen],
      ['offline', hasPhantom],
      ['snuff', bossDead],
    ];
    for (const [id, cond] of order) if (cond && !seen.has(id)) { setActive(id); return; }
  }, [show, active, seen, clicks, kills, lowStam, canLevel, cleared, recruitable, bossOpen, hasPhantom, bossDead]);
  // event-driven triggers and self-dismissal
  useEvents(useCallback((events: GameEvent[]) => {
    if (!show) return;
    if (events.some((e) => e.type === 'death') && !seen.has('death')) setActive('death');
    if (active && HINTS[active]?.until?.(events)) dismiss(active);
  }, [show, seen, active, dismiss]));
  if (!show || !active) return null;
  const h = HINTS[active];
  return (
    <div className="fixed bottom-5 left-[38%] -translate-x-1/2 z-30 max-w-lg w-[92%]" role="status">
      <Slab material="parchment" seed="hint" rough={8} ornament="none" tilt={-0.6} className="px-5 py-3 flex items-start gap-3">
        <span className="t-display text-[22px] leading-none" style={{ color: 'var(--ember)' }}>¶</span>
        <p className="text-[15px] leading-snug flex-1" style={{ color: 'var(--ink)' }}>{h.text}</p>
        <button className="text-[16px] leading-none" style={{ color: 'var(--ash)' }} onClick={() => dismiss(active)} aria-label="Dismiss hint">×</button>
      </Slab>
    </div>
  );
}
