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
  if (!f.ordersUnlocked && f.autoAttack) {
    f.ordersUnlocked = true;
    events.push({ type: 'unlock', what: 'orders', text: 'Standing Orders: tell your hands what to do when you are not looking. WHEN this, THEN that, in the order you set. Two orders to begin with; each lord felled grants another.' });
  }
  if (!f.firstDeath && state.stats.deaths > 0) {
    f.firstDeath = true;
  }
  if (!f.forgeUnlocked && state.stats.bossKills >= 1) {
    f.forgeUnlocked = true;
    events.push({ type: 'unlock', what: 'forge', text: 'The forge takes. Reforge a weapon (Arsenal) to roll three affixes; lock the one you like and roll the rest. Pieces of a set, in your hand and your shades\', pay at two, four and six.' });
  }
  if (!f.descentUnlocked && state.stats.bossKills >= 1) {
    f.descentUnlocked = true;
    events.push({ type: 'unlock', what: 'descent', text: 'Behind the lord\'s seat, a stair going down. The Stair: descend floor by floor, take what you can carry, and climb out before it takes you.' });
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
