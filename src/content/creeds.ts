import type { CovenantDef } from './types';

/**
 * Five creeds, one at a time. Costs are multiples of the current level-up cost so they
 * stay meaningful across the whole exponential curve. Reputation persists through Snuffing.
 */
export const CREEDS: Record<string, CovenantDef> = {
  wick: {
    id: 'wick',
    name: 'The Wickkeepers',
    epithet: 'Those who burn brighter and fall harder',
    region: 1,
    passive: { marrowMult: 1.25, remainsKeep: 0.7 },
    desc: '+25% marrow from every kill. Remains return only 70% of what fell.',
    upgrades: [
      { id: 'wickGreed', name: 'Wick Greed', desc: '+10% marrow per rank.', cost: 2, repReq: 50, maxRank: 3, effect: { marrowMult: 1.1 } },
      { id: 'litBlade', name: 'Lit Blade', desc: '+8% damage per rank.', cost: 3, repReq: 150, maxRank: 3, effect: { dmgMult: 1.08 } },
      { id: 'tallowMemory', name: 'Tallow Memory', desc: 'Remains return +10% more per rank.', cost: 2, repReq: 300, maxRank: 3, effect: { remainsKeep: 1.1 } },
    ],
    lore: 'They hold that Marrow kept is Marrow wasted, and spend theirs like tinder. The Way does not promise survival. It promises that the fire will have been worth it.',
  },
  legion: {
    id: 'legion',
    name: 'Revenant Legion',
    epithet: 'Might in the many, none in the one',
    region: 1,
    passive: { phantomRate: 1.4, phantomDmg: 1.25, dmgMult: 0.85 },
    desc: 'Shades hunt 40% faster and hit 25% harder. Your own blows land 15% softer.',
    upgrades: [
      { id: 'legionDrill', name: 'Legion Drill', desc: '+10% shade damage per rank.', cost: 2, repReq: 50, maxRank: 3, effect: { phantomDmg: 1.1 } },
      { id: 'marchingOrders', name: 'Marching Orders', desc: '+10% hunting rate per rank.', cost: 2, repReq: 150, maxRank: 3, effect: { phantomRate: 1.1 } },
      { id: 'sixthSense', name: 'The Sixth Banner', desc: 'One more shade slot.', cost: 8, repReq: 500, maxRank: 1, effect: { phantomSlot: 1 } },
    ],
    lore: 'Revenants who found that a hundred empty things marching together are, from a distance, indistinguishable from an army. From closer, they are worse.',
  },
  rot: {
    id: 'rot',
    name: 'Rot Wardens',
    epithet: 'What festers, endures',
    region: 2,
    passive: { statusBuild: 1.5, statusDmg: 1.25 },
    desc: 'Bleed, poison and frost build 50% faster and deal 25% more.',
    upgrades: [
      { id: 'festering', name: 'Festering', desc: '+15% status damage per rank.', cost: 2, repReq: 50, maxRank: 3, effect: { statusDmg: 1.15 } },
      { id: 'contagion', name: 'Contagion', desc: '+15% status buildup per rank.', cost: 2, repReq: 150, maxRank: 3, effect: { statusBuild: 1.15 } },
      { id: 'blightedBlade', name: 'Blighted Blade', desc: '+3% crit chance per rank.', cost: 3, repReq: 300, maxRank: 3, effect: { critChance: 0.03 } },
    ],
    lore: 'Keepers of the Mire, who learned that the swamp asks nothing and gives everything, slowly. They do not kill their enemies. They wait for them.',
  },
  vigil: {
    id: 'vigil',
    name: 'Keepers of the Vigil',
    epithet: 'The fire is kept while you sleep',
    region: 2,
    passive: { offlineCapHours: 6, offlineRate: 1.3, takenMult: 0.95 },
    desc: 'Offline progress lasts 6 hours longer and earns 30% more. You take 5% less damage.',
    upgrades: [
      { id: 'longWatch', name: 'Long Watch', desc: '+4 hours of offline progress per rank.', cost: 2, repReq: 50, maxRank: 3, effect: { offlineCapHours: 4 } },
      { id: 'steadyFlame', name: 'Steady Flame', desc: 'Tallowdraught heals +10% per rank.', cost: 2, repReq: 150, maxRank: 3, effect: { draughtPotency: 1.1 } },
      { id: 'patience', name: 'Patience', desc: 'Take 5% less damage per rank.', cost: 3, repReq: 300, maxRank: 3, effect: { takenMult: 0.95 } },
    ],
    lore: 'Firekeepers without a fire, who tend the memory of one. Their gift is time: what is done in your absence is done well, and nothing is lost to the dark while they watch.',
  },
  nadir: {
    id: 'nadir',
    name: 'The Nadir Pact',
    epithet: 'Everything, twice, and nothing back',
    region: 3,
    passive: { marrowMult: 2, dmgMult: 2, takenMult: 2 },
    noBloodstain: true,
    desc: 'Double marrow. Double damage. Double damage taken. When you die, your marrow are simply gone. No remains.',
    upgrades: [
      { id: 'deeper', name: 'Deeper', desc: '+15% Vestige from Snuffing per rank.', cost: 4, repReq: 100, maxRank: 3, effect: { humanityMult: 1.15 } },
      { id: 'darker', name: 'Darker', desc: '+10% damage per rank.', cost: 4, repReq: 250, maxRank: 3, effect: { dmgMult: 1.1 } },
      { id: 'nadirWalker', name: 'Nadir Walker', desc: 'Dodge cooldown −15% per rank.', cost: 3, repReq: 400, maxRank: 3, effect: { dodgeCd: 0.85 } },
    ],
    lore: 'A bargain struck with whatever is under the fire. The terms are simple and the dark does not negotiate. Those who sign do so laughing, and are very, very strong, until.',
  },
};
