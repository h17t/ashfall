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

Object.assign(PHANTOMS, {
  ghrelt: {
    id: 'ghrelt', name: 'Ghrelt the Bog-Warden', role: 'stagger', power: 0.5, speed: 0.75, hp: 420, stagger: 1.2, heal: 0, buff: 1,
    covenant: 'rot', affinityBonus: '+15% damage while you are sworn to the Rot Wardens', defaultWeapon: 'rotwoodClub', zone: 'mire', recruitCost: 6000,
    shape: 'knight', greeting: 'You want things knocked down. I knock things down. This is a good arrangement.',
    lore: 'A warden of the Mire, huge and slow and cheerful about it. He does not kill quickly. He makes sure that whatever you are fighting spends a lot of time on its knees, which he considers the polite way to fight.',
  },
  vesna: {
    id: 'vesna', name: 'Vesna of the Quiet Page', role: 'buffer', power: 0.3, speed: 0.6, hp: 260, stagger: 0.4, heal: 0, buff: 1.18,
    covenant: 'embers', affinityBonus: '+15% damage while you are sworn to the Way of Embers', defaultWeapon: 'ashenStaff', zone: 'archive', recruitCost: 50000,
    shape: 'robed', greeting: 'I have read how this ends. Several versions. I would like to see one where we win.',
    lore: 'A scribe who read enough of the Archive to know which words make a blade sharper and which make a heart braver, and who left before reading the one that ends everything. She hums the sharp ones under her breath while you fight.',
  },
  corvo: {
    id: 'corvo', name: 'Corvo the Rotknife', role: 'status', power: 0.45, speed: 1.1, hp: 330, stagger: 0.5, heal: 0, buff: 1, status: { bleed: 14, poison: 10 },
    covenant: 'rot', affinityBonus: '+15% damage while you are sworn to the Rot Wardens', defaultWeapon: 'banditDagger', zone: 'sanctum', recruitCost: 400000,
    shape: 'humanoid', greeting: 'Everything bleeds if you ask it properly. I ask very politely, and many times.',
    lore: 'Found in the Sanctum\'s cells, where the Vigil kept him for what he did to a Silver Sentinel with two knives and a great deal of time. He is pleasant company. He is, in every sense, a specialist.',
  },
  ysolde: {
    id: 'ysolde', name: 'Ysolde the Pale', role: 'dps', power: 0.7, speed: 1.0, hp: 380, stagger: 0.7, heal: 0, buff: 1,
    covenant: 'abyss', affinityBonus: '+15% damage while you are bound by the Abyssal Pact', defaultWeapon: 'paleDagger', zone: 'deep', recruitCost: 5000000,
    shape: 'humanoid', greeting: 'I went down here for the dark. It was not what I was promised. Perhaps you are.',
    lore: 'A gaoler who let the prisoners out one night and went down after them to see what they were running toward. She never found it. She found you, which she says is nearly as good, and does not say what she means by it.',
  },
} satisfies Record<string, PhantomDef>);
