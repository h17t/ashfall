import type { PhantomDef } from './types';

/**
 * Phantom roster. Roles: dps (raw damage), stagger (feeds the riposte), healer (keeps the
 * squad alive while hunting, heals the player beside), buffer (multiplies the party),
 * status (applies bleed/poison, the answer to regenerating and armoured foes).
 */
export const PHANTOMS: Record<string, PhantomDef> = {
  aldric: {
    id: 'aldric',
    name: 'Aldric of the Ember Watch',
    role: 'dps',
    power: 0.55,
    speed: 0.9,
    hp: 220,
    stagger: 0.6,
    heal: 0,
    buff: 1,
    covenant: 'embers',
    affinityBonus: '+15% damage while you are sworn to the Way of Embers',
    defaultWeapon: 'hollowSword',
    zone: 'approach',
    recruitCost: 400,
    shape: 'knight',
    greeting: 'The Watch is ended. I would keep watching anyway, if you will have me.',
    lore: 'A knight of the Ember Watch, whose watch ended when the Pyre did. He asks only to fight beside someone who still means to go somewhere. He does not ask where.',
  },
  ilse: {
    id: 'ilse',
    name: 'Sister Ilse of the Cold Pyre',
    role: 'healer',
    power: 0.25,
    speed: 0.5,
    hp: 170,
    stagger: 0.3,
    heal: 0.08,
    buff: 1,
    covenant: 'vigil',
    affinityBonus: 'Heals +40% while you keep the Vigil',
    defaultWeapon: 'pilgrimMace',
    zone: 'approach',
    recruitCost: 1800,
    requiresBoss: 'coldPyreWarden',
    shape: 'robed',
    greeting: 'Eskel is at rest. That leaves the rest of us. Show me your wounds.',
    lore: 'She tended the Pyre\'s wounded long after there was a Pyre. When the Warden fell she wept, and then she packed her things. Her miracles are small and close and stubborn, like her.',
  },
};
