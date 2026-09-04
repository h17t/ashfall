import type { SpellDef } from './types';

/**
 * Three schools. Sorcery (INT): burst and frost. Miracles (FTH): lightning, healing, party and
 * soul-gain buffs. Pyromancy (flame level + INT/FTH): fire, poison, the greedy self-buffs.
 * Hexes (dark) arrive with the Dark Sigil.
 */
export const SPELLS: Record<string, SpellDef> = {
  // ---------------- Sorcery ----------------
  soulArrow: {
    id: 'soulArrow', name: 'Soul Arrow', school: 'sorcery', fp: 8, cooldown: 4, req: { int: 10 },
    effect: { kind: 'damage', mult: 6, type: 'magic' },
    source: { kind: 'shop', cost: 90, region: 1 },
    lore: 'The first sorcery taught and the last forgotten. A soul, shaped to a point and thrown. It is said the scholars who devised it were embarrassed by how well it worked.',
  },
  magicWeapon: {
    id: 'magicWeapon', name: 'Magic Weapon', school: 'sorcery', fp: 20, cooldown: 45, req: { int: 12 },
    effect: { kind: 'buff', buff: { dmg: 1.25 }, duration: 30 },
    source: { kind: 'shop', cost: 240, region: 1 },
    lore: 'Wraps a blade in borrowed soul-light. The blade does not thank you; blades never do. But it cuts as if it might.',
  },
  greatSoulArrow: {
    id: 'greatSoulArrow', name: 'Great Soul Arrow', school: 'sorcery', fp: 16, cooldown: 7, req: { int: 16 },
    effect: { kind: 'damage', mult: 14, type: 'magic' },
    source: { kind: 'shop', cost: 1400, region: 2 },
    lore: 'The same arrow, drawn from a deeper well. Students are warned that the well has a bottom. None have reported finding it.',
  },
  frostLance: {
    id: 'frostLance', name: 'Frost Lance', school: 'sorcery', fp: 22, cooldown: 10, req: { int: 20 },
    effect: { kind: 'status', status: 'frost', amount: 65 },
    source: { kind: 'shop', cost: 6000, region: 3 },
    lore: 'A shard of the cold that was here before the fire. It does not so much wound as remind the flesh what it will one day return to.',
  },
  soulSpear: {
    id: 'soulSpear', name: 'Soul Spear', school: 'sorcery', fp: 35, cooldown: 15, req: { int: 26 },
    effect: { kind: 'damage', mult: 42, type: 'magic' },
    source: { kind: 'shop', cost: 30000, region: 3 },
    lore: 'The arrow, perfected into a thing that goes through. Whatever stands behind the target is advised to stand elsewhere.',
  },
  crystalSoulSpear: {
    id: 'crystalSoulSpear', name: 'Crystal Soul Spear', school: 'sorcery', fp: 55, cooldown: 20, req: { int: 40 },
    effect: { kind: 'damage', mult: 120, type: 'magic' },
    source: { kind: 'shop', cost: 900000, region: 5 },
    lore: 'Soul, crystallised until it can no longer bend and so must break something instead. The cost of learning it was a mind. The scholars considered this a bargain.',
  },
  // ---------------- Miracles ----------------
  heal: {
    id: 'heal', name: 'Heal', school: 'miracle', fp: 18, cooldown: 25, req: { fth: 10 },
    effect: { kind: 'heal', frac: 0.3 },
    source: { kind: 'shop', cost: 110, region: 1 },
    lore: 'A tale of a god who wept over the wounded. Whether the god existed matters less than the fact that the weeping still works.',
  },
  force: {
    id: 'force', name: 'Force', school: 'miracle', fp: 12, cooldown: 9, req: { fth: 12 },
    effect: { kind: 'staggerBomb', amount: 45, mult: 2 },
    source: { kind: 'shop', cost: 320, region: 1 },
    lore: 'A shove, delivered by no one. The faithful say it is the hand of a god. The faithless say it is a very impolite miracle. Both agree it works on knees.',
  },
  lightningSpear: {
    id: 'lightningSpear', name: 'Lightning Spear', school: 'miracle', fp: 20, cooldown: 8, req: { fth: 18 },
    effect: { kind: 'damage', mult: 16, type: 'lightning' },
    source: { kind: 'shop', cost: 1600, region: 2 },
    lore: 'A tale of the god of war, who hurled the sky at his enemies. The spear is not the sky. It is close enough to be going on with.',
  },
  lastRites: {
    id: 'lastRites', name: 'Last Rites', school: 'miracle', fp: 22, cooldown: 30, req: { fth: 12 },
    effect: { kind: 'buff', buff: { souls: 1.6 }, duration: 25 },
    source: { kind: 'bossSoul', boss: 'hangedPilgrim' },
    lore: 'The words said over the hanged, which the Hanged Pilgrim heard forty times and learned by heart. Spoken over the dying, they draw out more of what the dying leave behind.',
  },
  replenishment: {
    id: 'replenishment', name: 'Replenishment', school: 'miracle', fp: 24, cooldown: 50, req: { fth: 16 },
    effect: { kind: 'buff', buff: { hpRegen: 6 }, duration: 30 },
    source: { kind: 'shop', cost: 5000, region: 3 },
    lore: 'Slow, warm, unremarkable. The kind of miracle that is only appreciated afterwards, when you notice you are still standing.',
  },
  sacredOath: {
    id: 'sacredOath', name: 'Sacred Oath', school: 'miracle', fp: 34, cooldown: 60, req: { fth: 24 },
    effect: { kind: 'buff', buff: { dmg: 1.2, taken: 0.85 }, duration: 40 },
    source: { kind: 'shop', cost: 28000, region: 3 },
    lore: 'An oath sworn by a company of knights before a battle none of them survived. The words outlived the oath-takers and go on keeping their promise to whoever says them.',
  },
  greatLightningSpear: {
    id: 'greatLightningSpear', name: 'Great Lightning Spear', school: 'miracle', fp: 38, cooldown: 14, req: { fth: 30 },
    effect: { kind: 'damage', mult: 48, type: 'lightning' },
    source: { kind: 'shop', cost: 250000, region: 4 },
    lore: 'The spear, as the god of war himself is said to have thrown it. Those who have felt it do not describe it. Those who threw it describe nothing else.',
  },
  // ---------------- Pyromancy ----------------
  pyreBloom: {
    id: 'pyreBloom', name: 'Pyre Bloom', school: 'pyromancy', fp: 14, cooldown: 9, req: {},
    effect: { kind: 'damage', mult: 11, type: 'fire' },
    source: { kind: 'bossSoul', boss: 'coldPyreWarden' },
    lore: 'The last warmth of the Cold Pyre, coaxed into a bloom of flame. Eskel never learned it; he only guarded it. Guarding a thing for long enough is a kind of learning.',
  },
  combustion: {
    id: 'combustion', name: 'Combustion', school: 'pyromancy', fp: 5, cooldown: 1.5, req: {},
    effect: { kind: 'damage', mult: 4, type: 'fire' },
    source: { kind: 'shop', cost: 700, region: 2 },
    lore: 'Fire, at arm\'s length, without the arm. The first pyromancy every swamp-child learns and the one they keep using when the grand ones fail.',
  },
  fireball: {
    id: 'fireball', name: 'Fireball', school: 'pyromancy', fp: 12, cooldown: 5, req: {},
    effect: { kind: 'damage', mult: 13, type: 'fire' },
    source: { kind: 'shop', cost: 1200, region: 2 },
    lore: 'A ball of fire. The pyromancers, unlike the sorcerers, never felt the need to name things anything other than what they were.',
  },
  poisonMist: {
    id: 'poisonMist', name: 'Poison Mist', school: 'pyromancy', fp: 18, cooldown: 12, req: {},
    effect: { kind: 'status', status: 'poison', amount: 75 },
    source: { kind: 'shop', cost: 4000, region: 3 },
    lore: 'The swamp, bottled. Breathed by anything that stands in it, including its caster, who has long since stopped minding.',
  },
  greatChaosFireball: {
    id: 'greatChaosFireball', name: 'Great Chaos Fireball', school: 'pyromancy', fp: 36, cooldown: 14, req: {},
    effect: { kind: 'dot', mult: 60, duration: 8, type: 'fire' },
    source: { kind: 'shop', cost: 180000, region: 4 },
    lore: 'Fire that was made wrong on purpose. It lands, and then it keeps landing. The witch who devised it did not survive its devising and is thought to have counted that a success.',
  },
  warmth: {
    id: 'warmth', name: 'Warmth', school: 'pyromancy', fp: 28, cooldown: 60, req: {},
    effect: { kind: 'buff', buff: { hpRegen: 14 }, duration: 20 },
    source: { kind: 'shop', cost: 600000, region: 5 },
    lore: 'A gentle flame that harms nothing and heals what stands near it. Pyromancers speak of it as an aberration. They also, every one of them, learn it.',
  },
};

/** Spells whose sources (regions 2–6 bosses and drops) ship in Milestone 10; merged into SPELLS then. */
export const UPCOMING_SPELLS: Record<string, SpellDef> = {
  soulGreatsword: {
    id: 'soulGreatsword', name: 'Soul Greatsword', school: 'sorcery', fp: 30, cooldown: 12, req: { int: 22 },
    effect: { kind: 'staggerBomb', amount: 90, mult: 24 },
    source: { kind: 'bossSoul', boss: 'archivistNull' },
    lore: 'A sorcery that pretends, for one swing, to be a sword. The Archivist wrote it for those who could not bear to put their blades down. He never used it himself; he had already put everything down.',
  },
  hiddenBody: {
    id: 'hiddenBody', name: 'Hush', school: 'sorcery', fp: 25, cooldown: 60, req: { int: 18 },
    effect: { kind: 'buff', buff: { taken: 0.7 }, duration: 25 },
    source: { kind: 'drop', zone: 'archive', tier: 2, chance: 0.04 },
    lore: 'Not invisibility. A quieting of the part of you that things notice. Blows still land; they land as if unsure they were aimed at anyone.',
  },
  bountifulSunlight: {
    id: 'bountifulSunlight', name: 'Bountiful Light', school: 'miracle', fp: 40, cooldown: 90, req: { fth: 28 },
    effect: { kind: 'squadBuff', mult: 1.5, duration: 40 },
    source: { kind: 'drop', zone: 'sanctum', tier: 3, chance: 0.04 },
    lore: 'A warmth that spreads to everyone within reach of the caster, phantoms included. The god who gave it asked nothing in return, which is why so few trusted it.',
  },
  sunlightSpear: {
    id: 'sunlightSpear', name: 'Sunlight Spear', school: 'miracle', fp: 60, cooldown: 22, req: { fth: 40 },
    effect: { kind: 'staggerBomb', amount: 160, mult: 110 },
    source: { kind: 'bossSoul', boss: 'lordOfCinders' },
    lore: 'The first miracle, thrown by the first lord at the first dragon. Everything since has been imitation. This is not.',
  },
  powerWithin: {
    id: 'powerWithin', name: 'Power Within', school: 'pyromancy', fp: 30, cooldown: 90, req: {},
    effect: { kind: 'buff', buff: { dmg: 1.4, taken: 1.25, stamRegen: 1.3 }, duration: 30 },
    source: { kind: 'drop', zone: 'mire', tier: 3, chance: 0.05 },
    lore: 'Burns the caster from within to make the caster burn brighter. The flame does not distinguish between fuel and pyromancer. Neither, after a while, does the pyromancer.',
  },
  blackFlame: {
    id: 'blackFlame', name: 'Black Flame', school: 'pyromancy', fp: 42, cooldown: 12, req: {},
    effect: { kind: 'staggerBomb', amount: 120, mult: 70 },
    source: { kind: 'bossSoul', boss: 'keeperOfTheDeep' },
    lore: 'Fire from below the fire. It gives no light and takes the light of whatever it touches. The Keeper carried it for an age without once being warmed.',
  },
};
