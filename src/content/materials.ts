import type { MaterialDef } from './types';

export const MATERIALS: Record<string, MaterialDef> = {
  shard: {
    id: 'shard',
    name: 'Titanite Shard',
    tier: 1,
    lore: 'A fragment of the stone the old smiths called god-bone. Reinforces a weapon to +3. Nobody remembers which god, or what was done to it.',
  },
  largeShard: {
    id: 'largeShard',
    name: 'Large Titanite Shard',
    tier: 2,
    lore: 'A larger fragment, veined with something that glows only when no one is looking. Reinforces a weapon to +6.',
  },
  chunk: {
    id: 'chunk',
    name: 'Titanite Chunk',
    tier: 3,
    lore: 'Dense and cold. The weight of it is wrong for its size, as if part of it lies somewhere else. Reinforces a weapon to +9.',
  },
  slab: {
    id: 'slab',
    name: 'Titanite Slab',
    tier: 4,
    lore: 'A perfect slab, worked smooth by hands that ended their work before the first fire was lit. Reinforces a weapon to +10, its final form.',
  },
  estusShard: {
    id: 'estusShard',
    name: 'Estus Shard',
    tier: 0,
    lore: 'A shard of a broken flask. Fit it to your own and it holds one more draught of the flame. The fire remembers what it once filled.',
  },
  boneShard: {
    id: 'boneShard',
    name: 'Undead Bone Shard',
    tier: 0,
    lore: 'A bone that would not stop burning. Cast into the bonfire, it deepens the flame and the Estus draws more from it.',
  },
  soulVessel: {
    id: 'soulVessel',
    name: 'Soul Vessel',
    tier: 0,
    lore: 'An empty vessel that hungers for a shape. Pour yourself out into it and choose again what you are. Few are made; fewer survive the pouring.',
  },
  coal: {
    id: 'coal',
    name: 'Cinder Coal',
    tier: 0,
    lore: 'Coal that has been burnt once already and remembers how. Unlocks infusions at the bonfire, so a blade may learn a second nature.',
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    tier: 0,
    lore: 'A warmth clenched in the palm. Carried by those who mean to kindle something.',
  },
};

/** Materials required for reinforcement from level L to L+1. */
export function reinforceMaterial(level: number): { id: string; count: number } {
  if (level < 3) return { id: 'shard', count: level + 1 };
  if (level < 6) return { id: 'largeShard', count: level - 2 };
  if (level < 9) return { id: 'chunk', count: level - 5 };
  return { id: 'slab', count: 1 };
}
