import type { SpellDef } from './types';

export const SPELLS: Record<string, SpellDef> = {
  pyreBloom: {
    id: 'pyreBloom',
    name: 'Pyre Bloom',
    school: 'pyromancy',
    fp: 14,
    cooldown: 9,
    req: {},
    effect: { kind: 'damage', mult: 9, type: 'fire' },
    source: { kind: 'bossSoul', boss: 'coldPyreWarden' },
    lore: "The last warmth of the Cold Pyre, coaxed into a bloom of flame. Eskel never learned it; he only guarded it. Guarding a thing for long enough is a kind of learning.",
  },
  lastRites: {
    id: 'lastRites',
    name: 'Last Rites',
    school: 'miracle',
    fp: 22,
    cooldown: 30,
    req: { fth: 12 },
    effect: { kind: 'buff', buff: { souls: 1.6 }, duration: 25 },
    source: { kind: 'bossSoul', boss: 'hangedPilgrim' },
    lore: 'The words said over the hanged, which the Hanged Pilgrim heard forty times and learned by heart. Spoken over the dying, they draw out more of what the dying leave behind.',
  },
};
