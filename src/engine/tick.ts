/**
 * The fixed-timestep engine step. Deterministic: no Date.now(), no DOM.
 * `step` consumes the state in place and returns it along with the events produced.
 */
import { BALANCE } from '@/content/balance';
import type { GameState, GameEvent, Action } from './types';
import { computeMods, type Mods } from './mods';
import { applyAction } from './actions';
import { tickCombat, refreshPlayerMaxes } from './combat';
import { ensureZone } from './actions';
import { getZone } from '@/content';
import { checkUnlocks } from './unlocks';

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

const hooks: ((state: GameState, mods: Mods, events: GameEvent[], dt: number) => void)[] = [];
/** Later modules (phantoms, covenants, prestige) register their per-tick logic here. */
export function registerTickHook(h: (state: GameState, mods: Mods, events: GameEvent[], dt: number) => void) {
  hooks.push(h);
}

export function step(state: GameState, dt: number, actions: Action[] = []): StepResult {
  const events: GameEvent[] = [];
  const mods = computeMods(state);
  ensureZone(state, state.encounter.zone);
  refreshPlayerMaxes(state, mods);
  for (const a of actions) applyAction(state, a, events, mods);
  state.t += dt;
  state.stats.playTime += dt;
  state.stats.cycleTime += dt;
  tickCombat(state, mods, events, dt);
  for (const h of hooks) h(state, mods, events, dt);
  checkUnlocks(state, mods, events);
  return { state, events };
}

/** Advance by `seconds` in fixed ticks, applying `actions` on the first tick. */
export function advance(state: GameState, seconds: number, actions: Action[] = []): GameEvent[] {
  const all: GameEvent[] = [];
  let first = true;
  let remaining = seconds;
  if (seconds <= 0) {
    // zero-length step: apply actions without advancing time
    return step(state, 0, actions).events;
  }
  while (remaining > 1e-9) {
    const dt = Math.min(BALANCE.tick, remaining);
    const r = step(state, dt, first ? actions : []);
    first = false;
    for (const e of r.events) all.push(e);
    remaining -= dt;
  }
  return all;
}

export function currentZoneName(state: GameState): string {
  return getZone(state.encounter.zone).name;
}
