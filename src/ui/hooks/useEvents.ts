import { useEffect } from 'react';
import { subscribeEvents } from '../store';
import type { GameEvent } from '@/engine';

export function useEvents(handler: (events: GameEvent[]) => void) {
  useEffect(() => subscribeEvents(handler), [handler]);
}
