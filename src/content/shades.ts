import type { PhantomDef } from './types';

/**
 * Shade roster. Roles: dps (raw damage), strain (feeds the reprisal), healer (keeps the
 * cortege alive while hunting, heals the player beside), buffer (multiplies the party),
 * status (applies bleed/poison, the answer to regenerating and armoured foes).
 */
export const SHADES: Record<string, PhantomDef> = {
  aldric: {
    id: 'aldric',
    name: 'Aldric of the Wick Watch',
    role: 'dps',
    power: 0.55,
    speed: 0.9,
    hp: 220,
    strain: 0.6,
    heal: 0,
    buff: 1,
    creed: 'wick',
    affinityBonus: '+15% damage while you are sworn to the Way of the Wick',
    defaultWeapon: 'revenantSword',
    zone: 'tollroad',
    recruitCost: 400,
    shape: 'knight',
    greeting: 'The Watch is ended. I would keep watching anyway, if you will have me.',
    lore: 'A knight of the Wick Watch, whose watch ended when the Pyre did. He asks only to fight beside someone who still means to go somewhere. He does not ask where.',
  },
  ilse: {
    id: 'ilse',
    name: 'Sister Ilse of the Cold Pyre',
    role: 'healer',
    power: 0.25,
    speed: 0.5,
    hp: 170,
    strain: 0.3,
    heal: 0.08,
    buff: 1,
    creed: 'vigil',
    affinityBonus: 'Heals +40% while you keep the Vigil',
    defaultWeapon: 'pilgrimMace',
    zone: 'tollroad',
    recruitCost: 1800,
    requiresBoss: 'coldPyreWarden',
    shape: 'robed',
    greeting: 'the Pyre-Warden is at rest. That leaves the rest of us. Show me your wounds.',
    lore: 'She tended the Pyre\'s wounded long after there was a Pyre. When the Warden fell she wept, and then she packed her things. Her litanies are small and close and stubborn, like her.',
  },
};

Object.assign(SHADES, {
  ghrelt: {
    id: 'ghrelt', name: 'Ghrelt the Bog-Warden', role: 'strain', power: 0.5, speed: 0.75, hp: 420, strain: 1.2, heal: 0, buff: 1,
    creed: 'rot', affinityBonus: '+15% damage while you are sworn to the Rot Wardens', defaultWeapon: 'rotwoodClub', zone: 'mire', recruitCost: 6000,
    shape: 'knight', greeting: 'You want things knocked down. I knock things down. This is a good arrangement.',
    lore: 'A warden of the Mire, huge and slow and cheerful about it. He does not kill quickly. He makes sure that whatever you are fighting spends a lot of time on its knees, which he considers the polite way to fight.',
  },
  vesna: {
    id: 'vesna', name: 'Vesna of the Quiet Page', role: 'buffer', power: 0.3, speed: 0.6, hp: 260, strain: 0.4, heal: 0, buff: 1.18,
    creed: 'wick', affinityBonus: '+15% damage while you are sworn to the Way of the Wick', defaultWeapon: 'weaverStaff', zone: 'archive', recruitCost: 50000,
    shape: 'robed', greeting: 'I have read how this ends. Several versions. I would like to see one where we win.',
    lore: 'A scribe who read enough of the Archive to know which words make a blade sharper and which make a heart braver, and who left before reading the one that ends everything. She hums the sharp ones under her breath while you fight.',
  },
  corvo: {
    id: 'corvo', name: 'Corvo the Rotknife', role: 'status', power: 0.45, speed: 1.1, hp: 330, strain: 0.5, heal: 0, buff: 1, status: { bleed: 14, poison: 10 },
    creed: 'rot', affinityBonus: '+15% damage while you are sworn to the Rot Wardens', defaultWeapon: 'banditDagger', zone: 'sanctum', recruitCost: 400000,
    shape: 'humanoid', greeting: 'Everything bleeds if you ask it properly. I ask very politely, and many times.',
    lore: 'Found in the Sanctum\'s cells, where the Vigil kept him for what he did to a Silver Sentinel with two knives and a great deal of time. He is pleasant company. He is, in every sense, a specialist.',
  },
  ysolde: {
    id: 'ysolde', name: 'Ysolde the Pale', role: 'dps', power: 0.7, speed: 1.0, hp: 380, strain: 0.7, heal: 0, buff: 1,
    creed: 'nadir', affinityBonus: '+15% damage while you are bound by the Nadiral Pact', defaultWeapon: 'paleDagger', zone: 'undercroft', recruitCost: 5000000,
    shape: 'humanoid', greeting: 'I went down here for the dark. It was not what I was promised. Perhaps you are.',
    lore: 'A gaoler who let the prisoners out one night and went down after them to see what they were running toward. She never found it. She found you, which she says is nearly as good, and does not say what she means by it.',
  },
} satisfies Record<string, PhantomDef>);
