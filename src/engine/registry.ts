/**
 * Extension registries with no dependencies, so feature modules can register handlers and
 * hooks without creating import cycles with the reducer or the tick loop.
 */
import type { GameState, GameEvent, Action } from './types';
import type { Mods } from './mods';

export type ActionHandler = (state: GameState, action: Action, events: GameEvent[], mods: Mods) => boolean;
export type TickHook = (state: GameState, mods: Mods, events: GameEvent[], dt: number) => void;

export const actionHandlers: ActionHandler[] = [];
export const tickHooks: TickHook[] = [];

/** Later modules (phantoms, covenants, prestige) register action handlers here. */
export function registerActionHandler(h: ActionHandler) {
  actionHandlers.push(h);
}
/** Later modules register their per-tick logic here. */
export function registerTickHook(h: TickHook) {
  tickHooks.push(h);
}
