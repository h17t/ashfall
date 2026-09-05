/**
 * Magic: catalysts, recitation slots, spell purchase and casting support.
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
import { castSpell } from './actions';

export const MAX_BOUGHT_SLOTS = 3;

/** Which schools the player can cast: owning the matching catalyst (or knowing a boss-wisp spell of it). */
export function schoolsAvailable(state: GameState): Set<SchoolKey> {
  const out = new Set<SchoolKey>();
  const w = state.player.weapons;
  if (w.weaverStaff) out.add('weaving');
  if (w.litanyBeads || w.stormTalisman) out.add('litany');
  if (w.ruinBrand || state.flags.hasBrand) out.add('ruin');
  if (state.flags.hexUnlocked) out.add('hex');
  for (const id of state.spellsKnown) out.add(getSpell(id).school);
  return out;
}

export function hasAnyCatalyst(state: GameState): boolean {
  return schoolsAvailable(state).size > 0;
}

export function recitationSlotCost(state: GameState): Decimal {
  const bought = state.materials.__reciteUpgrades ?? 0;
  return D(1500).mul(Decimal.pow(6, bought)).floor();
}

/** School power multiplier. 0.4 at zero investment; ~2.5 at 40 points; catalyst wielded +25%. */
export function spellPower(state: GameState, mods: Mods, spellId: string): number {
  const sp = getSpell(spellId);
  const p = state.player;
  let scale: number;
  if (sp.school === 'weaving') scale = 0.4 + statCurve(p.stats.ins) * 2.2;
  else if (sp.school === 'litany') scale = 0.4 + statCurve(p.stats.dev) * 2.2;
  else if (sp.school === 'ruin') scale = (0.6 + (statCurve(p.stats.ins) + statCurve(p.stats.dev)) * 0.5) * Math.pow(1.18, p.brandLevel);
  else scale = 0.4 + Math.min(statCurve(p.stats.ins), statCurve(p.stats.dev)) * 3.2;
  const wielded = getWeapon(p.weapon);
  if (wielded.archetype === 'catalyst') {
    const school: SchoolKey | null = wielded.id === 'weaverStaff' ? 'weaving' : wielded.id === 'litanyBeads' || wielded.id === 'stormTalisman' ? 'litany' : wielded.id === 'ruinBrand' ? 'ruin' : wielded.id === 'nadirChime' ? 'hex' : null;
    if (school === sp.school) scale *= wielded.id === 'stormTalisman' ? 1.5 : 1.25;
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
  if (!schoolsAvailable(state).has(sp.school)) return sp.school === 'ruin' ? 'Requires a Ruin Flame.' : sp.school === 'weaving' ? 'Requires a staff.' : sp.school === 'litany' ? 'Requires a talisman.' : 'Requires the Severing.';
  if (state.marrow.lt(sp.source.cost)) return 'Not enough marrow.';
  return null;
}

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'buySpell': {
      const why = canBuySpell(state, action.spell);
      if (why) return err(why);
      const sp = getSpell(action.spell);
      state.marrow = state.marrow.sub((sp.source as { cost: number }).cost);
      state.spellsKnown.push(sp.id);
      events.push({ type: 'unlock', what: 'spell:' + sp.id, text: `${sp.name} learned.` });
      return true;
    }
    case 'buyRecitationSlot': {
      const bought = state.materials.__reciteUpgrades ?? 0;
      if (bought >= MAX_BOUGHT_SLOTS) return err('The mind holds no more.');
      const cost = recitationSlotCost(state);
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      state.materials.__reciteUpgrades = bought + 1;
      events.push({ type: 'unlock', what: 'recitation', text: 'Another recitation slot opens.' });
      return true;
    }
  }
  return false;
});

// keep the catalyst flag in sync with ownership so refreshPlayerMaxes grants the slot,
// and run auto-cast when unlocked
registerTickHook((state, mods, events) => {
  const has = hasAnyCatalyst(state);
  if (has !== !!state.flags.hasCatalyst) state.flags.hasCatalyst = has;
  if (state.automation.autoSpells && mods.unlocks.has('autoSpells') && state.encounter.enemy && state.deathScreen <= 0) {
    const p = state.player;
    for (let i = 0; i < p.recited.length; i++) {
      const id = p.recited[i];
      if (!id) continue;
      const sp = getSpell(id);
      if ((p.cooldowns[id] ?? 0) > 0 || p.fp < sp.fp) continue;
      if (sp.effect.kind === 'heal' && p.hp > p.hpMax * 0.6) continue;
      castSpell(state, mods, events, id);
    }
  }
});

export { SPELLS, WEAPONS };
