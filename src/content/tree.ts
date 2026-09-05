import type { TreeNode, SigilUnlock } from './types';

/**
 * The Vestige tree: permanent, bought with Vestige from Snuffing.
 * Four branches. Wick = offense. Bone = survival. Shadow = the idle layer. Flame = starting
 * might and automation (automation is a reward: each unlock graduates you from a system).
 */
const N = (n: TreeNode): TreeNode => n;

export const TREE: Record<string, TreeNode> = {
  // ---- Wick ----
  wickEdge: N({ id: 'wickEdge', name: 'Wick\'s Edge', branch: 'wick', desc: '+10% damage per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { dmgMult: 1.1 }, pos: { x: 0, y: 0 } }),
  wickMarrow: N({ id: 'wickMarrow', name: 'Marrow Hunger', branch: 'wick', desc: '+10% marrow per rank.', cost: 2, costGrowth: 1.6, maxRank: 5, requires: ['wickEdge'], effect: { marrowMult: 1.1 }, pos: { x: 0, y: 1 } }),
  wickReprisal: N({ id: 'wickReprisal', name: 'Executioner', branch: 'wick', desc: 'Reprisals deal +15% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['wickEdge'], effect: { reprisalMult: 1.15 }, pos: { x: 1, y: 1 } }),
  wickCrit: N({ id: 'wickCrit', name: 'Keen Eye', branch: 'wick', desc: '+2% crit chance per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['wickEdge'], effect: { critChance: 0.02 }, pos: { x: 2, y: 1 } }),
  wickStrain: N({ id: 'wickStrain', name: 'Breaker', branch: 'wick', desc: '+10% strain per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['wickReprisal'], effect: { strainMult: 1.1 }, pos: { x: 1, y: 2 } }),
  wickAutoReprisal: N({ id: 'wickAutoReprisal', name: 'Reflex of the Wick', branch: 'wick', desc: 'Automation: strike the Reprisal window for you. You have earned the reflex.', cost: 4, costGrowth: 1, maxRank: 1, requires: ['wickReprisal', 'wickStrain'], effect: { unlockAutoRiposte: 1 }, pos: { x: 1, y: 3 } }),
  // ---- Bone ----
  boneVigor: N({ id: 'boneVigor', name: 'Marrow', branch: 'bone', desc: '+8% max HP per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { hpMult: 1.08 }, pos: { x: 0, y: 0 } }),
  boneEstus: N({ id: 'boneEstus', name: 'Deeper Flask', branch: 'bone', desc: '+1 Tallowdraught flask per rank.', cost: 3, costGrowth: 1.7, maxRank: 2, requires: ['boneVigor'], effect: { draughtCount: 1 }, pos: { x: 0, y: 1 } }),
  bonePotency: N({ id: 'bonePotency', name: 'Warm Flask', branch: 'bone', desc: 'Tallowdraught heals +10% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneVigor'], effect: { draughtPotency: 1.1 }, pos: { x: 1, y: 1 } }),
  boneStamina: N({ id: 'boneStamina', name: 'Second Wind', branch: 'bone', desc: '+10% stamina regen per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneVigor'], effect: { staminaRegen: 1.1 }, pos: { x: 2, y: 1 } }),
  boneDodge: N({ id: 'boneDodge', name: 'Light Step', branch: 'bone', desc: 'Dodge cooldown −10% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneStamina'], effect: { dodgeCd: 0.9 }, pos: { x: 2, y: 2 } }),
  boneAutoEstus: N({ id: 'boneAutoEstus', name: 'Instinct to Drink', branch: 'bone', desc: 'Automation: drink Tallowdraught below 35% HP.', cost: 4, costGrowth: 1, maxRank: 1, requires: ['boneEstus'], effect: { unlockAutoEstus: 1 }, pos: { x: 0, y: 2 } }),
  boneAutoDodge: N({ id: 'boneAutoDodge', name: 'Reflex of the Bone', branch: 'bone', desc: 'Automation: dodge telegraphs for you. Perfect, every time (except in the dark).', cost: 4, costGrowth: 1, maxRank: 1, requires: ['boneDodge'], effect: { unlockAutoDodge: 1 }, pos: { x: 2, y: 3 } }),
  // ---- Shadow ----
  shadowRate: N({ id: 'shadowRate', name: 'Hunters\' Moon', branch: 'shadow', desc: 'Shades hunt +12% faster per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { phantomRate: 1.12 }, pos: { x: 0, y: 0 } }),
  shadowDmg: N({ id: 'shadowDmg', name: 'Sharpened Shades', branch: 'shadow', desc: 'Shades deal +10% per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { phantomDmg: 1.1 }, pos: { x: 1, y: 0 } }),
  shadowOffline: N({ id: 'shadowOffline', name: 'Long Night', branch: 'shadow', desc: '+3 hours of offline progress per rank.', cost: 2, costGrowth: 1.5, maxRank: 4, requires: ['shadowRate'], effect: { offlineCapHours: 3 }, pos: { x: 0, y: 1 } }),
  shadowMaterials: N({ id: 'shadowMaterials', name: 'Scavengers', branch: 'shadow', desc: '+15% material drops per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['shadowDmg'], effect: { materialMult: 1.15 }, pos: { x: 1, y: 1 } }),
  shadowSlot: N({ id: 'shadowSlot', name: 'Another Shade', branch: 'shadow', desc: 'One more shade slot.', cost: 8, costGrowth: 1, maxRank: 1, requires: ['shadowRate', 'shadowDmg'], effect: { phantomSlot: 1 }, pos: { x: 0, y: 2 } }),
  shadowHumanity: N({ id: 'shadowHumanity', name: 'Gathered Dark', branch: 'shadow', desc: '+10% Vestige from Snuffing per rank.', cost: 3, costGrowth: 1.7, maxRank: 3, requires: ['shadowOffline'], effect: { humanityMult: 1.1 }, pos: { x: 1, y: 2 } }),
  // ---- Flame ----
  flameStart: N({ id: 'flameStart', name: 'Remembered Might', branch: 'flame', desc: 'Begin each cycle with +5 levels per rank (spread across your stats).', cost: 1, costGrowth: 1.7, maxRank: 4, requires: [], effect: { startLevels: 5 }, pos: { x: 0, y: 0 } }),
  flameWeapon: N({ id: 'flameWeapon', name: 'Remembered Steel', branch: 'flame', desc: 'Weapons you acquire start at +1 per rank.', cost: 2, costGrowth: 1.6, maxRank: 5, requires: [], effect: { startWeaponLevel: 1 }, pos: { x: 1, y: 0 } }),
  flameSouls: N({ id: 'flameSouls', name: 'Wick in the Palm', branch: 'flame', desc: 'Begin each cycle with 1,000 marrow per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['flameStart'], effect: { startSouls: 1000 }, pos: { x: 0, y: 1 } }),
  flameAutoAdvance: N({ id: 'flameAutoAdvance', name: 'Restless Feet', branch: 'flame', desc: 'Automation: push into the next tier as soon as one is cleared.', cost: 3, costGrowth: 1, maxRank: 1, requires: ['flameStart'], effect: { unlockAutoAdvance: 1 }, pos: { x: 2, y: 1 } }),
  flameAutoLevel: N({ id: 'flameAutoLevel', name: 'The Fire Chooses', branch: 'flame', desc: 'Automation: spend marrow on levels for you, into a stat of your choosing.', cost: 5, costGrowth: 1, maxRank: 1, requires: ['flameSouls'], effect: { unlockAutoLevel: 1 }, pos: { x: 0, y: 2 } }),
  flameKeep: N({ id: 'flameKeep', name: 'Unforgotten Steel', branch: 'flame', desc: 'Your weapons, their reinforcement and infusions survive Snuffing.', cost: 10, costGrowth: 1, maxRank: 1, requires: ['flameWeapon'], effect: { keepWeapons: 1 }, pos: { x: 1, y: 2 } }),
  flameAttune: N({ id: 'flameAttune', name: 'Room in the Mind', branch: 'flame', desc: 'One more recitation slot.', cost: 6, costGrowth: 1, maxRank: 1, requires: ['flameWeapon'], effect: { attunementSlot: 1 }, pos: { x: 2, y: 2 } }),
  flameNg: N({ id: 'flameNg', name: 'Familiar Dark', branch: 'flame', desc: 'Each Waking cycle scales enemies 8% less per rank.', cost: 5, costGrowth: 2, maxRank: 3, requires: ['flameKeep'], effect: { ngScaling: 0.92 }, pos: { x: 1, y: 3 } }),
};

export const BRANCH_INFO: Record<TreeNode['branch'], { name: string; desc: string }> = {
  wick: { name: 'Wick', desc: 'Strike harder, take more.' },
  bone: { name: 'Bone', desc: 'Endure. The flask, the roll, the marrow.' },
  shadow: { name: 'Shadow', desc: 'What hunts while you are gone.' },
  flame: { name: 'Flame', desc: 'Begin stronger; let the fire do the chores.' },
};

export const SEVERING_UNLOCKS: Record<string, SigilUnlock> = {};

/**
 * Severing unlocks: bought with Severing Marks from the Dark Severing. Structural changes, not stat pads.
 */
const S = (n: SigilUnlock): SigilUnlock => n;
Object.assign(SEVERING_UNLOCKS, {
  sixthBanner: S({ id: 'sixthBanner', name: 'The Sixth Banner', desc: 'A sixth shade slot. The cortege is a warband now.', cost: 3, maxRank: 1, requires: [], effect: { phantomSlot: 1 } }),
  hexes: S({ id: 'hexes', name: 'The Dark Arts', desc: 'Opens the school of Hexes and places an Nadiral Chime in your hand at the start of every cycle. Hexes scale with the lesser of Insight and Devotion.', cost: 4, maxRank: 1, requires: [], effect: { unlockHex: 1 } }),
  nadir: S({ id: 'nadir', name: 'The Nadir', desc: 'Opens a seventh road below the Rendering Works that has no bottom. Each descent is deeper than the last, and remembered.', cost: 5, maxRank: 1, requires: [], effect: { unlockAbyss: 1 } }),
  autoSnuff: S({ id: 'autoSnuff', name: 'The Fire Tends Itself', desc: 'Automation: Snuff when a cycle would gather at least double what the last one did.', cost: 3, maxRank: 1, requires: [], effect: { unlockAutoKindle: 1 } }),
  autoSpells: S({ id: 'autoSpells', name: 'Muscle Memory', desc: 'Automation: cast recited spells whenever they are ready.', cost: 2, maxRank: 1, requires: [], effect: { unlockAutoSpells: 1 } }),
  keepTree: S({ id: 'keepTree', name: 'Deep Roots', desc: 'Keep 25% of your Vestige tree ranks per rank through a Dark Severing (rounded down).', cost: 6, maxRank: 3, requires: [], effect: { keepTree: 0.25 } }),
  startKindles: S({ id: 'startKindles', name: 'Familiar Ash', desc: 'Begin each Severing at Waking 1 per rank. The early road is known.', cost: 4, maxRank: 3, requires: ['keepTree'], effect: { startKindles: 1 } }),
  sigilEdge: S({ id: 'sigilEdge', name: 'Severing Edge', desc: '+20% damage per rank, forever.', cost: 2, maxRank: 5, requires: [], effect: { dmgMult: 1.2 } }),
  sigilHunger: S({ id: 'sigilHunger', name: 'Severing Hunger', desc: '+20% marrow per rank, forever.', cost: 2, maxRank: 5, requires: [], effect: { marrowMult: 1.2 } }),
  sigilDark: S({ id: 'sigilDark', name: 'Gathered Night', desc: '+25% Vestige per rank.', cost: 3, maxRank: 3, requires: ['sigilHunger'], effect: { humanityMult: 1.25 } }),
  sigilFamiliar: S({ id: 'sigilFamiliar', name: 'The Cruel World, Known', desc: 'Each Waking scales enemies 10% less per rank.', cost: 5, maxRank: 3, requires: ['sigilEdge'], effect: { ngScaling: 0.9 } }),
  sigilMind: S({ id: 'sigilMind', name: 'Wider Mind', desc: 'One more recitation slot.', cost: 3, maxRank: 2, requires: ['hexes'], effect: { attunementSlot: 1 } }),
  sigilNight: S({ id: 'sigilNight', name: 'The Longest Night', desc: '+12 hours of offline progress.', cost: 3, maxRank: 2, requires: [], effect: { offlineCapHours: 12 } }),
  sigilShades: S({ id: 'sigilShades', name: 'Shades Sharpened', desc: 'Shades deal +25% per rank.', cost: 2, maxRank: 4, requires: ['sixthBanner'], effect: { phantomDmg: 1.25 } }),
});
