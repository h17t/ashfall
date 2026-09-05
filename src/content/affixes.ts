/**
 * Affixes: what the forge can put on a weapon. Three slots, each rolled from the pool at a tier;
 * a lock keeps one through the next reroll at a price. Every affix belongs to a set; pieces are
 * the weapon in your hand and the weapons in your shades' hands, and sets pay at two, four, six.
 */
export type AffixTier = 1 | 2 | 3;
export type SetId = 'usurer' | 'butcher' | 'mason' | 'thief' | 'wick';
export type AffixStat = 'dmg' | 'marrow' | 'crit' | 'strain' | 'bleed' | 'poison' | 'frost' | 'speed' | 'lifesteal' | 'hp' | 'taken' | 'materials' | 'reprisal' | 'stamRegen';

export interface AffixDef {
  id: string;
  /** the word before the weapon's name */
  name: string;
  stat: AffixStat;
  /** magnitude per tier; a fraction for multipliers, points for status buildup */
  mag: [number, number, number];
  set: SetId;
  text: string;
  lore: string;
  /** what the Study must hold before this affix can roll */
  gate?: { kind: 'poisoner' | 'lord' | 'creature' | 'holdfast'; id?: string; rank: number };
}

export const AFFIXES: Record<string, AffixDef> = {
  brutal: { id: 'brutal', name: 'Brutal', stat: 'dmg', mag: [0.06, 0.10, 0.16], set: 'mason', text: 'Damage', lore: 'Forged with the anger left in it. It goes in further than it should.' },
  hungry: { id: 'hungry', name: 'Hungry', stat: 'marrow', mag: [0.08, 0.14, 0.22], set: 'usurer', text: 'Marrow from kills', lore: 'The steel has learned what marrow tastes like, and asks for more of it.' },
  keen: { id: 'keen', name: 'Keen', stat: 'crit', mag: [0.03, 0.05, 0.08], set: 'thief', text: 'Crit chance', lore: 'An edge that finds the seam on its own. You only have to be near.' },
  heavy: { id: 'heavy', name: 'Heavy', stat: 'strain', mag: [0.12, 0.20, 0.32], set: 'mason', text: 'Strain', lore: 'It lands like a thing that was dropped. Balance is for the living.' },
  wounding: { id: 'wounding', name: 'Wounding', stat: 'bleed', mag: [12, 20, 32], set: 'butcher', text: 'Bleed per hit', lore: 'A groove along the blade that keeps the wound from closing.' },
  venomed: { id: 'venomed', name: 'Venomed', stat: 'poison', mag: [12, 20, 32], set: 'butcher', text: 'Poison per hit', lore: 'Quenched in what a poisoner carried. You learned where; the smith did not ask.', gate: { kind: 'poisoner', rank: 2 } },
  rimed: { id: 'rimed', name: 'Rimed', stat: 'frost', mag: [12, 20, 32], set: 'butcher', text: 'Frost per hit', lore: 'Cold that a lord kept and could not take with it. It has not thawed since.', gate: { kind: 'lord', rank: 2 } },
  swift: { id: 'swift', name: 'Swift', stat: 'speed', mag: [0.06, 0.10, 0.15], set: 'thief', text: 'Attack speed', lore: 'Lighter than the hand expects, every time. The second swing arrives with the first.' },
  draining: { id: 'draining', name: 'Draining', stat: 'lifesteal', mag: [0.004, 0.007, 0.011], set: 'wick', text: 'HP mended per hit', lore: 'The hilt drinks. What it takes from them, it hands back to you, a little at a time.' },
  stalwart: { id: 'stalwart', name: 'Stalwart', stat: 'hp', mag: [0.05, 0.08, 0.12], set: 'wick', text: 'Max HP', lore: 'Held in front of you, it makes you heavier to move. Held long enough, you are.' },
  warding: { id: 'warding', name: 'Warding', stat: 'taken', mag: [0.04, 0.07, 0.10], set: 'mason', text: 'Damage taken, less', lore: 'Something in the metal turns aside what was meant for you. Not all of it. Some.' },
  gilded: { id: 'gilded', name: 'Gilded', stat: 'materials', mag: [0.15, 0.25, 0.40], set: 'usurer', text: 'Material drops', lore: 'Set from a holdfast\'s yield: what falls near it falls into your hands.', gate: { kind: 'holdfast', rank: 1 } },
  vengeful: { id: 'vengeful', name: 'Vengeful', stat: 'reprisal', mag: [0.12, 0.20, 0.30], set: 'mason', text: 'Reprisal damage', lore: 'It waits, as the holdfasts wait, and it pays what it owes when they stumble.', gate: { kind: 'holdfast', rank: 2 } },
  breathing: { id: 'breathing', name: 'Breathing', stat: 'stamRegen', mag: [0.10, 0.18, 0.28], set: 'wick', text: 'Stamina regen', lore: 'The weight sits where the arm wants it. You do not tire of it. You do not tire.' },
  usurious: { id: 'usurious', name: 'Usurious', stat: 'marrow', mag: [0.05, 0.09, 0.14], set: 'usurer', text: 'Marrow from kills', lore: 'A lord\'s debt, collected on. Interest on every kill, in marrow.', gate: { kind: 'lord', rank: 1 } },
};
export const AFFIX_ORDER = Object.keys(AFFIXES);

export interface SetDef { id: SetId; name: string; lore: string; bonus: [string, string, string] }
export const SETS: Record<SetId, SetDef> = {
  usurer: { id: 'usurer', name: 'The Usurer', lore: 'Whoever lent the road its marrow wants it back with interest, and has made your hands the collector.', bonus: ['Marrow +10%', 'Marrow +25%, material drops +25%', 'Kills on the Stair pay +50%'] },
  butcher: { id: 'butcher', name: 'The Butcher', lore: 'Nothing wasted, nothing quick. The wound is the work.', bonus: ['Status buildup +20%', 'Status damage ×1.5', 'Crits open a wound: bleed'] },
  mason: { id: 'mason', name: 'The Mason', lore: 'Stone does not flinch, and it does not forgive the hand that cracks it.', bonus: ['Damage taken −8%', 'Reprisal +40%', 'Strain +50%'] },
  thief: { id: 'thief', name: 'The Thief', lore: 'Take what is not guarded. Everything, eventually, is not guarded.', bonus: ['Crit +5%', 'Attack speed +15%', 'Crit damage ×1.5'] },
  wick: { id: 'wick', name: 'The Wick', lore: 'A flame that has learned to eat what it burns.', bonus: ['Max HP +10%', 'Each hit mends 1% HP', 'Stamina regen +50%'] },
};
export const SET_PIECES = [2, 4, 6];
export const TIER_NAMES: Record<AffixTier, string> = { 1: 'Rough', 2: 'Fine', 3: 'Black' };
