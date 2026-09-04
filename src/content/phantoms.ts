import type { PhantomDef } from './types';

export const PHANTOMS: Record<string, PhantomDef> = {
  solaire: {
    id: 'solaire',
    name: 'Aldric of the Ember Watch',
    role: 'dps',
    power: 0.55,
    speed: 0.9,
    hp: 120,
    stagger: 0.6,
    heal: 0,
    buff: 1,
    covenant: 'embers',
    affinityBonus: '+15% damage while you are sworn to the Way of Embers',
    defaultWeapon: 'hollowSword',
    zone: 'approach',
    recruitCost: 400,
    shape: 'knight',
    lore: 'A knight of the Ember Watch, whose watch ended when the Pyre did. He asks only to fight beside someone who still means to go somewhere. He does not ask where.',
  },
};
