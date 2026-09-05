import type { MaterialDef } from './types';

export const MATERIALS: Record<string, MaterialDef> = {
  coarseSlag: {
    id: 'coarseSlag',
    name: 'Coarse Slag',
    tier: 1,
    lore: 'Grey slag from the Rendering Works, the crust the old smiths chipped from the crucible. Reinforces a weapon to +3.',
  },
  fineSlag: {
    id: 'fineSlag',
    name: 'Fine Slag',
    tier: 2,
    lore: 'Slag skimmed from a clean melt. Reinforces a weapon from +3 to +6.',
  },
  blackSlag: {
    id: 'blackSlag',
    name: 'Black Slag',
    tier: 3,
    lore: 'Slag from the deepest crucible, black all the way through. Reinforces a weapon from +6 to +9.',
  },
  slagIngot: {
    id: 'slagIngot',
    name: 'Slag Ingot',
    tier: 4,
    lore: 'A whole ingot, poured once and never used. Takes a weapon to +10, its final shape.',
  },
  wickStub: {
    id: 'wickStub',
    name: 'Wick Stub',
    tier: 0,
    lore: 'The stub of a burnt wick. Set into your Lantern it holds one more Tallowdraught.',
  },
  renderFat: {
    id: 'renderFat',
    name: 'Render Fat',
    tier: 0,
    lore: 'Fat rendered from something that walked a long way. Cast into the Lantern it makes every draught heal more.',
  },
  reliquaryBone: {
    id: 'reliquaryBone',
    name: 'Reliquary Bone',
    tier: 0,
    lore: 'A bone kept in a reliquary long enough to forget whose it was. Held, it lets you forget what you were and choose again: your stats are poured out and re-poured.',
  },
  pitchCoal: {
    id: 'pitchCoal',
    name: 'Pitch Coal',
    tier: 0,
    lore: 'Coal that has burnt once already and remembers how. Unlocks infusions at the Lantern, so a blade can be taught a second nature.',
  },
  wickEnd: {
    id: 'lit',
    name: 'Wick',
    tier: 0,
    lore: 'A hearth clenched in the palm. Carried by those who mean to snuff something.',
  },
};

/** Materials required for reinforcement from level L to L+1. */
export function reinforceMaterial(level: number): { id: string; count: number } {
  if (level < 3) return { id: 'coarseSlag', count: level + 1 };
  if (level < 6) return { id: 'fineSlag', count: level - 2 };
  if (level < 9) return { id: 'blackSlag', count: level - 5 };
  return { id: 'slagIngot', count: 1 };
}

MATERIALS.dust = {
  id: 'dust',
  name: 'Dust of the Unmaking',
  tier: 0,
  lore: 'What is left of a world when the Unmaking has finished with it. Each grain buys a little more of it.',
};
