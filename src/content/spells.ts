import type { SpellDef } from './types';

/**
 * Three schools. Weaving (INT): burst and frost. Litanies (FTH): lightning, healing, party and
 * Marrow-gain buffs. Ruin (Brand level + INS/DEV): fire, poison, the greedy self-buffs.
 * Hexes (dark) arrive with the Dark Severing.
 */
export const SPELLS: Record<string, SpellDef> = {
  // ---------------- Weaving ----------------
  marrowDart: {
    id: 'marrowDart', name: 'Marrow Dart', school: 'weaving', fp: 8, cooldown: 4, req: { ins: 10 },
    effect: { kind: 'damage', mult: 6, type: 'magic' },
    source: { kind: 'shop', cost: 90, region: 1 },
    lore: 'The first weaving taught and the last forgotten. A thread of Marrow drawn to a point and thrown. Whoever taught it first is not remembered, which is how weaving prefers it.',
  },
  wovenEdge: {
    id: 'wovenEdge', name: 'Woven Edge', school: 'weaving', fp: 20, cooldown: 45, req: { ins: 12 },
    effect: { kind: 'buff', buff: { dmg: 1.25 }, duration: 30 },
    source: { kind: 'shop', cost: 240, region: 1 },
    lore: 'Wraps a blade in borrowed light. The blade does not thank you; blades never do. But it cuts as if it had been sharpened by someone who loved it.',
  },
  greatMarrowDart: {
    id: 'greatMarrowDart', name: 'Great Marrow Dart', school: 'weaving', fp: 16, cooldown: 7, req: { ins: 16 },
    effect: { kind: 'damage', mult: 14, type: 'magic' },
    source: { kind: 'shop', cost: 1400, region: 2 },
    lore: 'The same dart, drawn longer and thrown harder. Insight does not make it kinder.',
  },
  frostLance: {
    id: 'frostLance', name: 'Frost Lance', school: 'weaving', fp: 22, cooldown: 10, req: { ins: 20 },
    effect: { kind: 'status', status: 'frost', amount: 65 },
    source: { kind: 'shop', cost: 6000, region: 3 },
    lore: 'A shard of the cold that was here before the fire. It does not so much wound as remind the flesh what it will one day return to.',
  },
  marrowSpike: {
    id: 'marrowSpike', name: 'Marrow Spike', school: 'weaving', fp: 35, cooldown: 15, req: { ins: 26 },
    effect: { kind: 'damage', mult: 42, type: 'magic' },
    source: { kind: 'shop', cost: 30000, region: 3 },
    lore: 'A length of Marrow held rigid until it is more spike than thread. It goes through what it is thrown at and keeps going.',
  },
  glassSpike: {
    id: 'glassSpike', name: 'Glass Spike', school: 'weaving', fp: 55, cooldown: 20, req: { ins: 40 },
    effect: { kind: 'damage', mult: 120, type: 'magic' },
    source: { kind: 'shop', cost: 900000, region: 5 },
    lore: 'Marrow drawn so fine and so cold it sets like glass, and so must break something instead of bending. The cost of learning it was somebody\'s hands.',
  },
  // ---------------- Litanies ----------------
  heal: {
    id: 'heal', name: 'Heal', school: 'litany', fp: 18, cooldown: 25, req: { dev: 10 },
    effect: { kind: 'heal', frac: 0.3 },
    source: { kind: 'shop', cost: 110, region: 1 },
    lore: 'A tale of a god who wept over the wounded. Whether the god existed matters less than the fact that the weeping still works.',
  },
  shove: {
    id: 'shove', name: 'Shove', school: 'litany', fp: 12, cooldown: 9, req: { dev: 12 },
    effect: { kind: 'strainBomb', amount: 45, mult: 2 },
    source: { kind: 'shop', cost: 320, region: 1 },
    lore: 'A litany with no words in it. The air moves; whatever stands in it does not get a say.',
  },
  stormJavelin: {
    id: 'stormJavelin', name: 'Storm Javelin', school: 'litany', fp: 20, cooldown: 8, req: { dev: 18 },
    effect: { kind: 'damage', mult: 16, type: 'lightning' },
    source: { kind: 'shop', cost: 1600, region: 2 },
    lore: 'A litany that ends in a thrown line of lightning. The saints of the Vigil said it with their whole bodies.',
  },
  lastRites: {
    id: 'lastRites', name: 'Last Rites', school: 'litany', fp: 22, cooldown: 30, req: { dev: 12 },
    effect: { kind: 'buff', buff: { marrow: 1.6 }, duration: 25 },
    source: { kind: 'keepsake', boss: 'hangedPilgrim' },
    lore: 'The words said over the hanged, which the Hanged Pilgrim heard forty times and learned by heart. Spoken over the dying, they draw out more of what the dying leave behind.',
  },
  knitting: {
    id: 'knitting', name: 'Knitting', school: 'litany', fp: 24, cooldown: 50, req: { dev: 16 },
    effect: { kind: 'buff', buff: { hpRegen: 6 }, duration: 30 },
    source: { kind: 'shop', cost: 5000, region: 3 },
    lore: 'The slow litany: wounds closing over the length of a walk. It asks nothing but time.',
  },
  swornLitany: {
    id: 'swornLitany', name: 'Sworn Litany', school: 'litany', fp: 34, cooldown: 60, req: { dev: 24 },
    effect: { kind: 'buff', buff: { dmg: 1.2, taken: 0.85 }, duration: 40 },
    source: { kind: 'shop', cost: 28000, region: 3 },
    lore: 'An oath said over the dead until the world agrees to it. For a while, everything you strike agrees too.',
  },
  greatStormJavelin: {
    id: 'greatStormJavelin', name: 'Great Storm Javelin', school: 'litany', fp: 38, cooldown: 14, req: { dev: 30 },
    effect: { kind: 'damage', mult: 48, type: 'lightning' },
    source: { kind: 'shop', cost: 250000, region: 4 },
    lore: 'The same litany, said by someone with more to lose.',
  },
  // ---------------- Ruin ----------------
  pyreBloom: {
    id: 'pyreBloom', name: 'Pyre Bloom', school: 'ruin', fp: 14, cooldown: 9, req: {},
    effect: { kind: 'damage', mult: 11, type: 'fire' },
    source: { kind: 'keepsake', boss: 'coldPyreWarden' },
    lore: 'The last hearth of the Cold Pyre, coaxed into a bloom of flame. the Pyre-Warden never learned it; he only guarded it. Guarding a thing for long enough is a kind of learning.',
  },
  flare: {
    id: 'flare', name: 'Flare', school: 'ruin', fp: 5, cooldown: 1.5, req: {},
    effect: { kind: 'damage', mult: 4, type: 'fire' },
    source: { kind: 'shop', cost: 700, region: 2 },
    lore: 'Heat with no distance in it. Everything within reach of your hand learns why the school is called Ruin.',
  },
  gout: {
    id: 'gout', name: 'Gout', school: 'ruin', fp: 12, cooldown: 5, req: {},
    effect: { kind: 'damage', mult: 13, type: 'fire' },
    source: { kind: 'shop', cost: 1200, region: 2 },
    lore: 'Heat let out of the bones all at once and thrown. The oldest Ruin and the one that needs the least of you.',
  },
  rotBreath: {
    id: 'rotBreath', name: 'Rot Breath', school: 'ruin', fp: 18, cooldown: 12, req: {},
    effect: { kind: 'status', status: 'poison', amount: 75 },
    source: { kind: 'shop', cost: 4000, region: 3 },
    lore: 'A breath from the Mire, carried in the Brand and let go. It settles on what you fight and does not lift.',
  },
  ruinousGout: {
    id: 'ruinousGout', name: 'Ruinous Gout', school: 'ruin', fp: 36, cooldown: 14, req: {},
    effect: { kind: 'dot', mult: 60, duration: 8, type: 'fire' },
    source: { kind: 'shop', cost: 180000, region: 4 },
    lore: 'Gout, held a breath longer than is safe. The Brand remembers what it cost the last one.',
  },
  hearth: {
    id: 'hearth', name: 'Hearth', school: 'ruin', fp: 28, cooldown: 60, req: {},
    effect: { kind: 'buff', buff: { hpRegen: 14 }, duration: 20 },
    source: { kind: 'shop', cost: 600000, region: 5 },
    lore: 'A small fire kept where the Brand sits. Your wounds knit by it while it burns.',
  },
};

/** Spells sourced from Regions 2–6 bosses and drops (merged into SPELLS below). */
export const UPCOMING_SPELLS: Record<string, SpellDef> = {
  marrowCleaver: {
    id: 'marrowCleaver', name: 'Marrow Cleaver', school: 'weaving', fp: 30, cooldown: 12, req: { ins: 22 },
    effect: { kind: 'strainBomb', amount: 90, mult: 24 },
    source: { kind: 'keepsake', boss: 'archivistNull' },
    lore: 'A sword\'s worth of Marrow, swung once. It is not a sword. It does what a sword does to what it is swung at, and then it is gone.',
  },
  hush: {
    id: 'hush', name: 'Hush', school: 'weaving', fp: 25, cooldown: 60, req: { ins: 18 },
    effect: { kind: 'buff', buff: { taken: 0.7 }, duration: 25 },
    source: { kind: 'drop', zone: 'archive', tier: 2, chance: 0.04 },
    lore: 'A weaving that asks the world to look elsewhere. It works on the dead better than on the living.',
  },
  bountifulLight: {
    id: 'bountifulLight', name: 'Bountiful Light', school: 'litany', fp: 40, cooldown: 90, req: { dev: 28 },
    effect: { kind: 'cortegeBuff', mult: 1.5, duration: 40 },
    source: { kind: 'drop', zone: 'sanctum', tier: 3, chance: 0.04 },
    lore: 'A litany for the whole procession. Every Shade in your Cortege heals a little while it is said.',
  },
  daybreakJavelin: {
    id: 'daybreakJavelin', name: 'Daybreak Javelin', school: 'litany', fp: 60, cooldown: 22, req: { dev: 40 },
    effect: { kind: 'strainBomb', amount: 160, mult: 110 },
    source: { kind: 'keepsake', boss: 'theRenderer' },
    lore: 'The last litany of the Lantern-Warden. It is said only once a day, and only by those who mean it.',
  },
  marrowBurn: {
    id: 'marrowBurn', name: 'Marrow Burn', school: 'ruin', fp: 30, cooldown: 90, req: {},
    effect: { kind: 'buff', buff: { dmg: 1.4, taken: 1.25, stamRegen: 1.3 }, duration: 30 },
    source: { kind: 'drop', zone: 'mire', tier: 3, chance: 0.05 },
    lore: 'Burn your own Marrow for might. The Ruin-casters call it the honest bargain: you pay first.',
  },
  blackTallow: {
    id: 'blackTallow', name: 'Black Tallow', school: 'ruin', fp: 42, cooldown: 12, req: {},
    effect: { kind: 'strainBomb', amount: 120, mult: 70 },
    source: { kind: 'keepsake', boss: 'undercroftKeeper' },
    lore: 'Tallow rendered from something that should not have been. It burns black, and what it touches burns with it.',
  },
};

// ---------------- Keepsake spells of Regions 2–6 ----------------
Object.assign(SPELLS, UPCOMING_SPELLS, {
  rotBloom: {
    id: 'rotBloom', name: 'Rot Bloom', school: 'ruin', fp: 20, cooldown: 11, req: {},
    effect: { kind: 'status', status: 'poison', amount: 130 },
    source: { kind: 'keepsake', boss: 'mireMother' },
    lore: 'Mother Nettle\'s love, bottled. It opens in the enemy like a flower in a wound. Nothing that is poisoned by it stops being poisoned quickly.',
  },
  drowningHymn: {
    id: 'drowningHymn', name: 'Drowning Hymn', school: 'litany', fp: 30, cooldown: 45, req: { dev: 16 },
    effect: { kind: 'buff', buff: { marrow: 1.4, hpRegen: 4 }, duration: 30 },
    source: { kind: 'keepsake', boss: 'choirMaster' },
    lore: 'The hymn the choir finished as the water closed. Sung over the dying it steadies the singer and draws out what the dying leave behind. It is, the Choir-Master would insist, a comfort.',
  },
  unwriting: {
    id: 'unwriting', name: 'Unwriting', school: 'weaving', fp: 32, cooldown: 14, req: { ins: 24 },
    effect: { kind: 'strainBomb', amount: 140, mult: 30 },
    source: { kind: 'keepsake', boss: 'theUnwritten' },
    lore: 'Removes, briefly, the enemy\'s certainty that it is standing. Most things fall over when reminded. It does not last, but nothing needs to.',
  },
  lanternLight: {
    id: 'lanternLight', name: 'Lantern Light', school: 'litany', fp: 44, cooldown: 80, req: { dev: 26 },
    effect: { kind: 'cortegeBuff', mult: 1.8, duration: 30 },
    source: { kind: 'keepsake', boss: 'saintOrvane' },
    lore: 'Orvane\'s lantern, lit in the palm. Everyone it shines on fights as if the night were nearly over. Shades especially. They have been waiting the longest.',
  },
  stormCall: {
    id: 'stormCall', name: 'Storm Call', school: 'litany', fp: 48, cooldown: 18, req: { dev: 32 },
    effect: { kind: 'damage', mult: 85, type: 'lightning' },
    source: { kind: 'keepsake', boss: 'deaconUnburied' },
    lore: 'The Deacon\'s last sermon, delivered by the sky. It is short. It is mostly one word, and the word is loud.',
  },
  namelessStep: {
    id: 'namelessStep', name: 'Nameless Step', school: 'weaving', fp: 26, cooldown: 50, req: { ins: 14 },
    effect: { kind: 'buff', buff: { dmg: 1.3, stamRegen: 1.5 }, duration: 30 },
    source: { kind: 'keepsake', boss: 'namelessWanderer' },
    lore: 'How the Nameless walked so far: lightly, and without stopping. For a while your feet remember it.',
  },
  firstWickSpell: {
    id: 'firstWickSpell', name: 'First Wick', school: 'ruin', fp: 70, cooldown: 25, req: {},
    effect: { kind: 'damage', mult: 240, type: 'fire' },
    source: { kind: 'keepsake', boss: 'firstWick' },
    lore: 'The fire before it had a name. The Keepsake of the First Wick, spoken as a spell, burns the way it did then.',
  },
} satisfies Record<string, SpellDef>);

// ---------------- Hexes (Dark Severing) ----------------
Object.assign(SPELLS, {
  nadirOrb: {
    id: 'nadirOrb', name: 'Nadir Orb', school: 'hex', fp: 18, cooldown: 5, req: { ins: 12, dev: 12 },
    effect: { kind: 'damage', mult: 22, type: 'dark' },
    source: { kind: 'severing' },
    lore: 'Dark pulled up from the bottom of the stair and held in the palm. It weighs nothing and everything.',
  },
  deadAgain: {
    id: 'deadAgain', name: 'Dead Again', school: 'hex', fp: 36, cooldown: 40, req: { ins: 16, dev: 16 },
    effect: { kind: 'buff', buff: { marrow: 2.0 }, duration: 20 },
    source: { kind: 'severing' },
    lore: 'The hex that makes a corpse die a second time, and give up what it kept from the first. Twenty seconds of it are worth an hour of honest work, which is why it is a hex.',
  },
  numbness: {
    id: 'numbness', name: 'Numbness', school: 'hex', fp: 28, cooldown: 45, req: { ins: 14, dev: 14 },
    effect: { kind: 'buff', buff: { taken: 0.55 }, duration: 20 },
    source: { kind: 'severing' },
    lore: 'The dark, borrowed for a while, so that blows land on something that is not entirely you. It wears off. What was numb remembers all at once.',
  },
} satisfies Record<string, SpellDef>);
