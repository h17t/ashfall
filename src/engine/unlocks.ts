/**
 * Milestone unlocks that are tied to play rather than purchases (auto-attack in the first
 * minutes, tutorial beats). Each fires once and records a flag.
 */
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { ensureZone } from './actions';
import { ZONE_ORDER } from '@/content';

export function checkUnlocks(state: GameState, mods: Mods, events: GameEvent[]) {
  const f = state.flags;
  const first = ensureZone(state, ZONE_ORDER[0]);
  // Auto-attack: the mote learns your rhythm after the second tier of the first region.
  if (!f.autoAttack && (first.cleared >= 1 || state.prestige.wakings > 0 || state.stats.playTime >= 360)) {
    f.autoAttack = true;
    state.automation.unlocked.push('autoAttack');
    state.automation.autoAttack = true;
    events.push({ type: 'unlock', what: 'autoAttack', text: 'Revenant Instinct: your hands remember the swing. Auto-attack unlocked. Clicking still adds on top.' });
  }
  if (!f.firstDeath && state.stats.deaths > 0) {
    f.firstDeath = true;
  }
  if (!f.infusionUnlocked && (state.materials.pitchCoal ?? 0) > 0) {
    f.infusionUnlocked = true;
    events.push({ type: 'unlock', what: 'infusion', text: 'Cinder Coal: the lantern can now infuse weapons.' });
  }
}

/** Automation features that are always available once their flag is set. */
export function automationAvailable(state: GameState, mods: Mods, key: string): boolean {
  if (state.automation.unlocked.includes(key)) return true;
  return mods.unlocks.has(key);
}
