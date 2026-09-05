/**
 * Afflictions: the player's own difficulty dial. Each curse is a cost and a gain; all of them
 * stack. Taken and shed at will; the numbers live in the content file.
 */
import { AFFLICTIONS } from '@/content';
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { registerActionHandler, registerTickHook } from './registry';
import { ZERO } from './num';

export function hasAffliction(state: GameState, id: string): boolean { return (state.afflictions ?? []).includes(id); }
export function canToggleAffliction(state: GameState, id: string): string | null {
  if (!AFFLICTIONS[id]) return 'No such affliction.';
  if (!state.flags.afflictionsUnlocked) return 'The afflictions have not offered themselves. Fell a lord first.';
  if (state.descent.run) return 'Not on the stair. Climb out first.';
  return null;
}

/** Fold every taken affliction into the modifiers. */
export function applyAfflictions(state: GameState, m: Mods, add: (name: string, effect: string) => void) {
  for (const id of state.afflictions ?? []) {
    const a = AFFLICTIONS[id]; if (!a) continue;
    const f = a.fx;
    if (f.taken) m.taken *= f.taken;
    if (f.draught) m.draughtPotency *= f.draught;
    if (f.leak) m.marrowLeak += f.leak;
    if (f.composure) m.enemyComposure *= f.composure;
    if (f.stamRegen) m.stamRegen *= f.stamRegen;
    if (f.reflexesSleep) m.reflexesSleep = true;
    if (f.reinforce) m.reinforceScale *= f.reinforce;
    if (f.hpMult) m.hpMult *= f.hpMult;
    if (f.marrow) m.marrow *= f.marrow;
    if (f.dmg) m.dmg *= f.dmg;
    if (f.reprisal) m.reprisalMult *= f.reprisal;
    if (f.materials) m.materialMult *= f.materials;
    if (f.vestige) m.humanityMult *= f.vestige;
    add(`Affliction: ${a.name}`, `${a.cost} ${a.gain}`);
  }
}

/** The product of every taken affliction's gains, for the dial's readout. */
export function afflictionGains(state: GameState): { marrow: number; dmg: number; reprisal: number; materials: number; vestige: number; count: number } {
  const g = { marrow: 1, dmg: 1, reprisal: 1, materials: 1, vestige: 1, count: 0 };
  for (const id of state.afflictions ?? []) { const f = AFFLICTIONS[id]?.fx; if (!f) continue; g.count++; g.marrow *= f.marrow ?? 1; g.dmg *= f.dmg ?? 1; g.reprisal *= f.reprisal ?? 1; g.materials *= f.materials ?? 1; g.vestige *= f.vestige ?? 1; }
  return g;
}

registerActionHandler((state, action, events) => {
  if (action.type !== 'toggleAffliction') return false;
  const why = canToggleAffliction(state, action.affliction);
  if (why) { events.push({ type: 'error', text: why }); return true; }
  const has = hasAffliction(state, action.affliction);
  state.afflictions = has ? state.afflictions.filter((a) => a !== action.affliction) : [...(state.afflictions ?? []), action.affliction];
  events.push({ type: 'notice', text: has ? `${AFFLICTIONS[action.affliction].name} lifts.` : `${AFFLICTIONS[action.affliction].name}. ${AFFLICTIONS[action.affliction].cost}` });
  return true;
});

// the Leak: held marrow drains
registerTickHook((state, mods, _events, dt) => {
  if (mods.marrowLeak <= 0 || dt <= 0 || state.marrow.lte(0)) return;
  const lost = state.marrow.mul(mods.marrowLeak * dt).floor();
  if (lost.gt(0)) { state.marrow = state.marrow.sub(lost); if (state.marrow.lt(0)) state.marrow = ZERO; state.stats.marrowLost = state.stats.marrowLost.add(lost); }
});
