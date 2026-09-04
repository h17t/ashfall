import type { TreeNode, SigilUnlock } from './types';

/**
 * The Humanity tree: permanent, bought with Humanity from Kindling.
 * Four branches. Ember = offense. Bone = survival. Shadow = the idle layer. Flame = starting
 * strength and automation (automation is a reward: each unlock graduates you from a system).
 */
const N = (n: TreeNode): TreeNode => n;

export const TREE: Record<string, TreeNode> = {
  // ---- Ember ----
  emberEdge: N({ id: 'emberEdge', name: 'Ember\'s Edge', branch: 'ember', desc: '+10% damage per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { dmgMult: 1.1 }, pos: { x: 0, y: 0 } }),
  emberSouls: N({ id: 'emberSouls', name: 'Soul Hunger', branch: 'ember', desc: '+10% souls per rank.', cost: 2, costGrowth: 1.6, maxRank: 5, requires: ['emberEdge'], effect: { soulMult: 1.1 }, pos: { x: 0, y: 1 } }),
  emberRiposte: N({ id: 'emberRiposte', name: 'Executioner', branch: 'ember', desc: 'Ripostes deal +15% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['emberEdge'], effect: { riposteMult: 1.15 }, pos: { x: 1, y: 1 } }),
  emberCrit: N({ id: 'emberCrit', name: 'Keen Eye', branch: 'ember', desc: '+2% crit chance per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['emberEdge'], effect: { critChance: 0.02 }, pos: { x: 2, y: 1 } }),
  emberStagger: N({ id: 'emberStagger', name: 'Breaker', branch: 'ember', desc: '+10% stagger per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['emberRiposte'], effect: { staggerMult: 1.1 }, pos: { x: 1, y: 2 } }),
  emberAutoRiposte: N({ id: 'emberAutoRiposte', name: 'Reflex of the Ember', branch: 'ember', desc: 'Automation: strike the Riposte window for you. You have earned the reflex.', cost: 4, costGrowth: 1, maxRank: 1, requires: ['emberRiposte', 'emberStagger'], effect: { unlockAutoRiposte: 1 }, pos: { x: 1, y: 3 } }),
  // ---- Bone ----
  boneVigor: N({ id: 'boneVigor', name: 'Marrow', branch: 'bone', desc: '+8% max HP per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { hpMult: 1.08 }, pos: { x: 0, y: 0 } }),
  boneEstus: N({ id: 'boneEstus', name: 'Deeper Flask', branch: 'bone', desc: '+1 Estus flask per rank.', cost: 3, costGrowth: 1.7, maxRank: 2, requires: ['boneVigor'], effect: { estusCount: 1 }, pos: { x: 0, y: 1 } }),
  bonePotency: N({ id: 'bonePotency', name: 'Warm Flask', branch: 'bone', desc: 'Estus heals +10% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneVigor'], effect: { estusPotency: 1.1 }, pos: { x: 1, y: 1 } }),
  boneStamina: N({ id: 'boneStamina', name: 'Second Wind', branch: 'bone', desc: '+10% stamina regen per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneVigor'], effect: { staminaRegen: 1.1 }, pos: { x: 2, y: 1 } }),
  boneDodge: N({ id: 'boneDodge', name: 'Light Step', branch: 'bone', desc: 'Dodge cooldown −10% per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['boneStamina'], effect: { dodgeCd: 0.9 }, pos: { x: 2, y: 2 } }),
  boneAutoEstus: N({ id: 'boneAutoEstus', name: 'Instinct to Drink', branch: 'bone', desc: 'Automation: drink Estus below 35% HP.', cost: 4, costGrowth: 1, maxRank: 1, requires: ['boneEstus'], effect: { unlockAutoEstus: 1 }, pos: { x: 0, y: 2 } }),
  boneAutoDodge: N({ id: 'boneAutoDodge', name: 'Reflex of the Bone', branch: 'bone', desc: 'Automation: dodge telegraphs for you. Perfect, every time (except in the dark).', cost: 4, costGrowth: 1, maxRank: 1, requires: ['boneDodge'], effect: { unlockAutoDodge: 1 }, pos: { x: 2, y: 3 } }),
  // ---- Shadow ----
  shadowRate: N({ id: 'shadowRate', name: 'Hunters\' Moon', branch: 'shadow', desc: 'Phantoms hunt +12% faster per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { phantomRate: 1.12 }, pos: { x: 0, y: 0 } }),
  shadowDmg: N({ id: 'shadowDmg', name: 'Sharpened Shades', branch: 'shadow', desc: 'Phantoms deal +10% per rank.', cost: 1, costGrowth: 1.5, maxRank: 5, requires: [], effect: { phantomDmg: 1.1 }, pos: { x: 1, y: 0 } }),
  shadowOffline: N({ id: 'shadowOffline', name: 'Long Night', branch: 'shadow', desc: '+3 hours of offline progress per rank.', cost: 2, costGrowth: 1.5, maxRank: 4, requires: ['shadowRate'], effect: { offlineCapHours: 3 }, pos: { x: 0, y: 1 } }),
  shadowMaterials: N({ id: 'shadowMaterials', name: 'Scavengers', branch: 'shadow', desc: '+15% material drops per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['shadowDmg'], effect: { materialMult: 1.15 }, pos: { x: 1, y: 1 } }),
  shadowSlot: N({ id: 'shadowSlot', name: 'Another Shade', branch: 'shadow', desc: 'One more phantom slot.', cost: 8, costGrowth: 1, maxRank: 1, requires: ['shadowRate', 'shadowDmg'], effect: { phantomSlot: 1 }, pos: { x: 0, y: 2 } }),
  shadowHumanity: N({ id: 'shadowHumanity', name: 'Gathered Dark', branch: 'shadow', desc: '+10% Humanity from Kindling per rank.', cost: 3, costGrowth: 1.7, maxRank: 3, requires: ['shadowOffline'], effect: { humanityMult: 1.1 }, pos: { x: 1, y: 2 } }),
  // ---- Flame ----
  flameStart: N({ id: 'flameStart', name: 'Remembered Strength', branch: 'flame', desc: 'Begin each cycle with +5 soul levels per rank (spread across your stats).', cost: 1, costGrowth: 1.7, maxRank: 4, requires: [], effect: { startLevels: 5 }, pos: { x: 0, y: 0 } }),
  flameWeapon: N({ id: 'flameWeapon', name: 'Remembered Steel', branch: 'flame', desc: 'Weapons you acquire start at +1 per rank.', cost: 2, costGrowth: 1.6, maxRank: 5, requires: [], effect: { startWeaponLevel: 1 }, pos: { x: 1, y: 0 } }),
  flameSouls: N({ id: 'flameSouls', name: 'Ember in the Palm', branch: 'flame', desc: 'Begin each cycle with 1,000 souls per rank.', cost: 2, costGrowth: 1.5, maxRank: 3, requires: ['flameStart'], effect: { startSouls: 1000 }, pos: { x: 0, y: 1 } }),
  flameAutoAdvance: N({ id: 'flameAutoAdvance', name: 'Restless Feet', branch: 'flame', desc: 'Automation: push into the next tier as soon as one is cleared.', cost: 3, costGrowth: 1, maxRank: 1, requires: ['flameStart'], effect: { unlockAutoAdvance: 1 }, pos: { x: 2, y: 1 } }),
  flameAutoLevel: N({ id: 'flameAutoLevel', name: 'The Fire Chooses', branch: 'flame', desc: 'Automation: spend souls on levels for you, into a stat of your choosing.', cost: 5, costGrowth: 1, maxRank: 1, requires: ['flameSouls'], effect: { unlockAutoLevel: 1 }, pos: { x: 0, y: 2 } }),
  flameKeep: N({ id: 'flameKeep', name: 'Unforgotten Steel', branch: 'flame', desc: 'Your weapons, their reinforcement and infusions survive Kindling.', cost: 10, costGrowth: 1, maxRank: 1, requires: ['flameWeapon'], effect: { keepWeapons: 1 }, pos: { x: 1, y: 2 } }),
  flameAttune: N({ id: 'flameAttune', name: 'Room in the Mind', branch: 'flame', desc: 'One more attunement slot.', cost: 6, costGrowth: 1, maxRank: 1, requires: ['flameWeapon'], effect: { attunementSlot: 1 }, pos: { x: 2, y: 2 } }),
  flameNg: N({ id: 'flameNg', name: 'Familiar Dark', branch: 'flame', desc: 'Each NG+ cycle scales enemies 8% less per rank.', cost: 5, costGrowth: 2, maxRank: 3, requires: ['flameKeep'], effect: { ngScaling: 0.92 }, pos: { x: 1, y: 3 } }),
};

export const BRANCH_INFO: Record<TreeNode['branch'], { name: string; desc: string }> = {
  ember: { name: 'Ember', desc: 'Strike harder, take more.' },
  bone: { name: 'Bone', desc: 'Endure. The flask, the roll, the marrow.' },
  shadow: { name: 'Shadow', desc: 'What hunts while you are gone.' },
  flame: { name: 'Flame', desc: 'Begin stronger; let the fire do the chores.' },
};

export const SIGIL_UNLOCKS: Record<string, SigilUnlock> = {};

/**
 * Sigil unlocks: bought with Sigil Marks from the Dark Sigil. Structural changes, not stat pads.
 */
const S = (n: SigilUnlock): SigilUnlock => n;
Object.assign(SIGIL_UNLOCKS, {
  sixthBanner: S({ id: 'sixthBanner', name: 'The Sixth Banner', desc: 'A sixth phantom slot. The squad is a warband now.', cost: 3, maxRank: 1, requires: [], effect: { phantomSlot: 1 } }),
  hexes: S({ id: 'hexes', name: 'The Dark Arts', desc: 'Opens the school of Hexes and places an Abyssal Chime in your hand at the start of every cycle. Hexes scale with the lesser of Intelligence and Faith.', cost: 4, maxRank: 1, requires: [], effect: { unlockHex: 1 } }),
  abyss: S({ id: 'abyss', name: 'The Abyss', desc: 'Opens a seventh road below the Kiln that has no bottom. Each descent is deeper than the last, and remembered.', cost: 5, maxRank: 1, requires: [], effect: { unlockAbyss: 1 } }),
  autoKindle: S({ id: 'autoKindle', name: 'The Fire Tends Itself', desc: 'Automation: Kindle when a cycle would gather at least double what the last one did.', cost: 3, maxRank: 1, requires: [], effect: { unlockAutoKindle: 1 } }),
  autoSpells: S({ id: 'autoSpells', name: 'Muscle Memory', desc: 'Automation: cast attuned spells whenever they are ready.', cost: 2, maxRank: 1, requires: [], effect: { unlockAutoSpells: 1 } }),
  keepTree: S({ id: 'keepTree', name: 'Deep Roots', desc: 'Keep 25% of your Humanity tree ranks per rank through a Dark Sigil (rounded down).', cost: 6, maxRank: 3, requires: [], effect: { keepTree: 0.25 } }),
  startKindles: S({ id: 'startKindles', name: 'Familiar Ash', desc: 'Begin each Sigil at NG+1 per rank. The early road is known.', cost: 4, maxRank: 3, requires: ['keepTree'], effect: { startKindles: 1 } }),
  sigilEdge: S({ id: 'sigilEdge', name: 'Sigil Edge', desc: '+20% damage per rank, forever.', cost: 2, maxRank: 5, requires: [], effect: { dmgMult: 1.2 } }),
  sigilHunger: S({ id: 'sigilHunger', name: 'Sigil Hunger', desc: '+20% souls per rank, forever.', cost: 2, maxRank: 5, requires: [], effect: { soulMult: 1.2 } }),
  sigilDark: S({ id: 'sigilDark', name: 'Gathered Night', desc: '+25% Humanity per rank.', cost: 3, maxRank: 3, requires: ['sigilHunger'], effect: { humanityMult: 1.25 } }),
  sigilFamiliar: S({ id: 'sigilFamiliar', name: 'The Cruel World, Known', desc: 'Each NG+ scales enemies 10% less per rank.', cost: 5, maxRank: 3, requires: ['sigilEdge'], effect: { ngScaling: 0.9 } }),
  sigilMind: S({ id: 'sigilMind', name: 'Wider Mind', desc: 'One more attunement slot.', cost: 3, maxRank: 2, requires: ['hexes'], effect: { attunementSlot: 1 } }),
  sigilNight: S({ id: 'sigilNight', name: 'The Longest Night', desc: '+12 hours of offline progress.', cost: 3, maxRank: 2, requires: [], effect: { offlineCapHours: 12 } }),
  sigilShades: S({ id: 'sigilShades', name: 'Shades Sharpened', desc: 'Phantoms deal +25% per rank.', cost: 2, maxRank: 4, requires: ['sixthBanner'], effect: { phantomDmg: 1.25 } }),
});
