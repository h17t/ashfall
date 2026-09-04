/**
 * Zustand store bridging the pure engine and React.
 * The engine mutates `state` in place; we bump `tick` after each step so selectors re-run.
 * Components must select primitives (numbers/strings) so they only re-render on real change.
 */
import { create } from 'zustand';
import { newGame, step, applyAction, computeMods, type GameState, type Action, type GameEvent } from '@/engine';

type Listener = (events: GameEvent[]) => void;
const listeners = new Set<Listener>();

export function subscribeEvents(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function emit(events: GameEvent[]) {
  if (events.length === 0) return;
  for (const l of listeners) l(events);
}

export interface GameStore {
  state: GameState;
  tick: number;
  dispatch: (action: Action) => void;
  stepBy: (dt: number) => void;
  replace: (state: GameState) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  state: newGame(Math.floor(Math.random() * 2 ** 31)),
  tick: 0,
  dispatch: (action) => {
    const s = get().state;
    const events: GameEvent[] = [];
    applyAction(s, action, events, computeMods(s));
    emit(events);
    set({ tick: get().tick + 1 });
  },
  stepBy: (dt) => {
    const s = get().state;
    const r = step(s, dt);
    emit(r.events);
    set({ tick: get().tick + 1 });
  },
  replace: (state) => set({ state, tick: get().tick + 1 }),
}));

/** Select a primitive derived from the game state. */
export function useSel<T>(fn: (s: GameState) => T): T {
  return useGame((g) => fn(g.state));
}
