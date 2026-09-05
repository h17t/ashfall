/** Weapon Arts: one per archetype, unlocked by mastery of a weapon, sharpened by each rank after. */
import type { WeaponArchetype } from '../engine/types';
export interface ArtDef { id: string; archetype: WeaponArchetype; name: string; text: string; lore: string; cooldown: number }
export const ARTS: Record<WeaponArchetype, ArtDef> = {
  fast: { id: 'flurry', archetype: 'fast', name: 'Flurry', text: 'Three hits at once, each 0.7× a strike, for one stamina cost.', lore: 'The blade is in three places and you are in none of them.', cooldown: 12 },
  heavy: { id: 'crush', archetype: 'heavy', name: 'Crush', text: 'One hit at 2.5×, with three times the strain.', lore: 'Not a swing. A verdict.', cooldown: 15 },
  hybrid: { id: 'stance', archetype: 'hybrid', name: 'Reprisal Stance', text: 'For six seconds, Reprisal hits deal double.', lore: 'You have already decided where the blade goes. You are only waiting for them to stumble into it.', cooldown: 14 },
  catalyst: { id: 'stoke', archetype: 'catalyst', name: 'Stoke', text: 'The next three casts cost nothing and deal 1.3×.', lore: 'The Weaving remembers who fed it, and for a moment asks nothing back.', cooldown: 20 },
};
export const MASTERY_RANKS = [50, 200, 600, 1500];
export const MASTERY_RANK_NAMES = ['Unfamiliar', 'Handled', 'Practised', 'Fluent', 'Mastered'];
/** damage with the weapon per rank */
export const MASTERY_DMG_PER_RANK = 0.04;
/** art power per rank past the first */
export const MASTERY_ART_PER_RANK = 0.15;
