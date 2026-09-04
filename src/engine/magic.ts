/**
 * Magic: catalysts, attunement slots, spell purchase and casting support.
 * Spell effects themselves are resolved in actions.ts (castSpell); this module owns the
 * unlock/economy side and the per-school power formula.
 */
import { D, Decimal } from './num';
import { getSpell, getWeapon, getZone, SPELLS, WEAPONS } from '@/content';
import type { GameState, GameEvent, StatKey, SchoolKey } from './types';
import type { Mods } from './mods';
import { statCurve } from './formulas';
import { registerActionHandler } from './registry';
import { registerTickHook } from './registry';

export const MAX_BOUGHT_SLOTS = 3;

/** Which schools the player can cast: owning the matching catalyst (or knowing a boss-soul spell of it). */
export function schoolsAvailable(state: GameState): Set<SchoolKey> {
  const out = new Set<SchoolKey>();
  const w = state.player.weapons;
  if (w.ashenStaff) out.add('sorcery');
  if (w.crackedTalisman) out.add('miracle');
  if (w.pyromancyFlame || state.flags.hasFlame) out.add('pyromancy');
  if (state.flags.hexUnlocked) out.add('hex');
  for (const id of state.spellsKnown) out.add(getSpell(id).school);
  return out;
}

export function hasAnyCatalyst(state: GameState): boolean {
  return schoolsAvailable(state).size > 0;
}

export function attunementSlotCost(state: GameState): Decimal {
  const bought = state.materials.__attuneUpgrades ?? 0;
  return D(1500).mul(Decimal.pow(6, bought)).floor();
}

/** School power multiplier. 0.4 at zero investment; ~2.5 at 40 points; catalyst wielded +25%. */
export function spellPower(state: GameState, mods: Mods, spellId: string): number {
  const sp = getSpell(spellId);
  const p = state.player;
  let scale: number;
  if (sp.school === 'sorcery') scale = 0.4 + statCurve(p.stats.int) * 2.2;
  else if (sp.school === 'miracle') scale = 0.4 + statCurve(p.stats.fth) * 2.2;
  else if (sp.school === 'pyromancy') scale = (0.6 + (statCurve(p.stats.int) + statCurve(p.stats.fth)) * 0.5) * Math.pow(1.18, p.flameLevel);
  else scale = 0.4 + Math.min(statCurve(p.stats.int), statCurve(p.stats.fth)) * 3.2;
  const wielded = getWeapon(p.weapon);
  if (wielded.archetype === 'catalyst') {
    const school: SchoolKey | null = wielded.id === 'ashenStaff' ? 'sorcery' : wielded.id === 'crackedTalisman' ? 'miracle' : wielded.id === 'pyromancyFlame' ? 'pyromancy' : wielded.id === 'abyssalChime' ? 'hex' : null;
    if (school === sp.school) scale *= 1.25;
  }
  for (const [k, need] of Object.entries(sp.req)) if (p.stats[k as StatKey] < (need ?? 0)) scale *= 0.5;
  return scale;
}

export function canBuySpell(state: GameState, id: string): string | null {
  const sp = SPELLS[id];
  if (!sp) return 'No such spell.';
  if (state.spellsKnown.includes(id)) return 'Already known.';
  if (sp.source.kind !== 'shop') return 'Not for sale.';
  const maxRegion = Math.max(...state.unlockedZones.map((z) => getZone(z).region));
  if (sp.source.region > maxRegion) return `Sold from Region ${sp.source.region}.`;
  if (!schoolsAvailable(state).has(sp.school)) return sp.school === 'pyromancy' ? 'Requires a Pyromancy Flame.' : sp.school === 'sorcery' ? 'Requires a staff.' : sp.school === 'miracle' ? 'Requires a talisman.' : 'Requires the Sigil.';
  if (state.souls.lt(sp.source.cost)) return 'Not enough souls.';
  return null;
}

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'buySpell': {
      const why = canBuySpell(state, action.spell);
      if (why) return err(why);
      const sp = getSpell(action.spell);
      state.souls = state.souls.sub((sp.source as { cost: number }).cost);
      state.spellsKnown.push(sp.id);
      events.push({ type: 'unlock', what: 'spell:' + sp.id, text: `${sp.name} learned.` });
      return true;
    }
    case 'buyAttunementSlot': {
      const bought = state.materials.__attuneUpgrades ?? 0;
      if (bought >= MAX_BOUGHT_SLOTS) return err('The mind holds no more.');
      const cost = attunementSlotCost(state);
      if (state.souls.lt(cost)) return err('Not enough souls.');
      state.souls = state.souls.sub(cost);
      state.materials.__attuneUpgrades = bought + 1;
      events.push({ type: 'unlock', what: 'attunement', text: 'Another attunement slot opens.' });
      return true;
    }
  }
  return false;
});

// keep the catalyst flag in sync with ownership so refreshPlayerMaxes grants the slot
registerTickHook((state) => {
  const has = hasAnyCatalyst(state);
  if (has !== !!state.flags.hasCatalyst) state.flags.hasCatalyst = has;
});

export { SPELLS, WEAPONS };
