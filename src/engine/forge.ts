/**
 * The forge: affixes on weapons. Reforge rerolls every unlocked slot from the pool the Study has
 * opened, at a marrow-and-slag price that climbs with each affix you lock. The equipped weapon's
 * affixes shape the player's numbers; a shade's weapon shapes the shade; every wielded weapon is
 * a piece of the sets it carries.
 */
import { BALANCE } from '@/content/balance';
import { AFFIXES, AFFIX_ORDER, SETS, SET_PIECES, getWeapon, type AffixTier, type SetId, type AffixStat } from '@/content';
import type { GameState, GameEvent, WeaponInstance, WeaponAffix } from './types';
import { reinforceCost } from './formulas';
import { rand } from './rng';
import { studyMeets } from './study';
import { registerActionHandler } from './registry';

const F = BALANCE.forge;

export function affixesOf(inst: WeaponInstance | undefined | null): WeaponAffix[] { return inst?.affixes ?? []; }
export { reinforceMaterial } from '@/content';
export function lockedOf(inst: WeaponInstance | undefined | null): string[] { return inst?.locked ?? []; }

/** The slag the forge wants for a weapon of this region. */
export function forgeMaterial(weaponId: string): { id: string; count: number } {
  const r = getWeapon(weaponId).region;
  if (r <= 1) return { id: 'coarseSlag', count: 2 };
  if (r <= 3) return { id: 'fineSlag', count: 1 };
  return { id: 'blackSlag', count: 1 };
}
export function forgeCost(state: GameState, weaponId: string) {
  const inst = state.player.weapons[weaponId];
  const def = getWeapon(weaponId);
  const marrow = reinforceCost(def.region, inst?.level ?? 0).mul(F.costMult).mul(Math.pow(F.lockCostMult, lockedOf(inst).length)).floor();
  return { marrow, material: forgeMaterial(weaponId) };
}
export function canReforge(state: GameState, weaponId: string): string | null {
  const inst = state.player.weapons[weaponId];
  if (!inst) return 'You do not own that.';
  if (!state.flags.forgeUnlocked) return 'The forge is cold. Fell a lord first.';
  const c = forgeCost(state, weaponId);
  if (state.marrow.lt(c.marrow)) return `Needs ${c.marrow.toString()} marrow.`;
  if ((state.materials[c.material.id] ?? 0) < c.material.count) return `Needs ${c.material.count} ${c.material.id === 'coarseSlag' ? 'Coarse Slag' : c.material.id === 'fineSlag' ? 'Fine Slag' : 'Black Slag'}.`;
  return null;
}

/** Affixes the Study has opened. */
export function affixPool(state: GameState): string[] {
  return AFFIX_ORDER.filter((id) => { const g = AFFIXES[id].gate; return !g || studyMeets(state, g); });
}
function rollTier(state: GameState, level: number): AffixTier {
  const k = Math.max(0, Math.min(1, level / 10));
  const w = F.tierWeightsLow.map((lo, i) => lo + (F.tierWeightsHigh[i] - lo) * k);
  let x = rand(state.rng) * (w[0] + w[1] + w[2]);
  if ((x -= w[0]) < 0) return 1;
  if ((x -= w[1]) < 0) return 2;
  return 3;
}

/** Reroll every unlocked slot; locked affixes stay as they are. */
export function reforge(state: GameState, events: GameEvent[], weaponId: string): string | null {
  const why = canReforge(state, weaponId);
  if (why) return why;
  const inst = state.player.weapons[weaponId];
  const cost = forgeCost(state, weaponId);
  state.marrow = state.marrow.sub(cost.marrow);
  state.materials[cost.material.id] = (state.materials[cost.material.id] ?? 0) - cost.material.count;
  const kept = affixesOf(inst).filter((a) => lockedOf(inst).includes(a.id));
  const pool = affixPool(state).filter((id) => !kept.some((a) => a.id === id));
  const out: WeaponAffix[] = kept.slice();
  while (out.length < F.slots && pool.length > 0) {
    const i = Math.floor(rand(state.rng) * pool.length);
    out.push({ id: pool[i], tier: rollTier(state, inst.level) });
    pool.splice(i, 1);
  }
  inst.affixes = out;
  inst.locked = lockedOf(inst).filter((id) => out.some((a) => a.id === id));
  events.push({ type: 'reforged', weapon: weaponId, affixes: out.slice() });
  return null;
}

export function toggleLock(state: GameState, weaponId: string, affix: string | null): string | null {
  const inst = state.player.weapons[weaponId];
  if (!inst) return 'You do not own that.';
  if (affix === null) { inst.locked = []; return null; }
  if (!affixesOf(inst).some((a) => a.id === affix)) return 'That weapon carries no such affix.';
  const locked = lockedOf(inst);
  if (locked.includes(affix)) { inst.locked = locked.filter((x) => x !== affix); return null; }
  if (locked.length >= F.maxLocked) return `At most ${F.maxLocked} affixes can be locked.`;
  inst.locked = [...locked, affix];
  return null;
}

// ---------------------------------------------------------------------------
// What the affixes do
// ---------------------------------------------------------------------------

export interface AffixFx { dmg: number; marrow: number; crit: number; strain: number; bleed: number; poison: number; frost: number; speed: number; lifesteal: number; hp: number; taken: number; materials: number; reprisal: number; stamRegen: number; statusBuild: number; statusDmg: number; critDmg: number; bleedOnCrit: boolean; stairPay: number }
export function emptyFx(): AffixFx { return { dmg: 1, marrow: 1, crit: 0, strain: 1, bleed: 0, poison: 0, frost: 0, speed: 1, lifesteal: 0, hp: 1, taken: 1, materials: 1, reprisal: 1, stamRegen: 1, statusBuild: 1, statusDmg: 1, critDmg: 1, bleedOnCrit: false, stairPay: 1 }; }

/** One weapon's own affixes, summed. */
export function weaponFx(inst: WeaponInstance | undefined | null): AffixFx {
  const fx = emptyFx();
  for (const a of affixesOf(inst)) {
    const def = AFFIXES[a.id]; if (!def) continue;
    const m = def.mag[a.tier - 1];
    const s: AffixStat = def.stat;
    if (s === 'dmg') fx.dmg *= 1 + m; else if (s === 'marrow') fx.marrow *= 1 + m; else if (s === 'crit') fx.crit += m; else if (s === 'strain') fx.strain *= 1 + m;
    else if (s === 'bleed') fx.bleed += m; else if (s === 'poison') fx.poison += m; else if (s === 'frost') fx.frost += m; else if (s === 'speed') fx.speed *= 1 + m;
    else if (s === 'lifesteal') fx.lifesteal += m; else if (s === 'hp') fx.hp *= 1 + m; else if (s === 'taken') fx.taken *= 1 - m; else if (s === 'materials') fx.materials *= 1 + m;
    else if (s === 'reprisal') fx.reprisal *= 1 + m; else if (s === 'stamRegen') fx.stamRegen *= 1 + m;
  }
  return fx;
}

/** Every wielded weapon (yours and your shades'), and how many pieces each set has among them. */
export function setPieces(state: GameState): Record<SetId, number> {
  const count: Record<SetId, number> = { usurer: 0, butcher: 0, mason: 0, thief: 0, wick: 0 };
  const wielded = [state.player.weapon, ...state.cortege.shades.map((p) => p.weapon)].filter((w): w is string => !!w);
  for (const w of wielded) {
    const sets = new Set<SetId>();
    for (const a of affixesOf(state.player.weapons[w])) { const d = AFFIXES[a.id]; if (d) sets.add(d.set); }
    for (const s of sets) count[s]++;
  }
  return count;
}
/** 0..3 tiers of a set reached */
export function setTier(pieces: number): number { let t = 0; for (const n of SET_PIECES) if (pieces >= n) t++; return t; }

/** The player's affix effects: the equipped weapon plus the set bonuses across the Cortege. */
export function playerAffixFx(state: GameState): AffixFx & { sets: Record<SetId, number>; sources: { name: string; effect: string }[] } {
  const fx = weaponFx(state.player.weapons[state.player.weapon]) as AffixFx & { sets: Record<SetId, number>; sources: { name: string; effect: string }[] };
  fx.sources = [];
  for (const a of affixesOf(state.player.weapons[state.player.weapon])) { const d = AFFIXES[a.id]; if (d) fx.sources.push({ name: `${d.name} (${a.tier === 3 ? 'Black' : a.tier === 2 ? 'Fine' : 'Rough'})`, effect: `${d.text} ${d.stat === 'bleed' || d.stat === 'poison' || d.stat === 'frost' ? '+' + d.mag[a.tier - 1] : (d.stat === 'taken' ? '−' : '+') + Math.round(d.mag[a.tier - 1] * 1000) / 10 + '%'}` }); }
  const sets = setPieces(state);
  fx.sets = sets;
  const t = (s: SetId) => setTier(sets[s]);
  const usurer = t('usurer'), butcher = t('butcher'), mason = t('mason'), thief = t('thief'), wick = t('wick');
  if (usurer >= 1) fx.marrow *= 1.1; if (usurer >= 2) { fx.marrow *= 1.25 / 1.1 * 1.1; fx.materials *= 1.25; } if (usurer >= 3) fx.stairPay *= 1.5;
  if (butcher >= 1) fx.statusBuild *= 1.2; if (butcher >= 2) fx.statusDmg *= 1.5; if (butcher >= 3) fx.bleedOnCrit = true;
  if (mason >= 1) fx.taken *= 0.92; if (mason >= 2) fx.reprisal *= 1.4; if (mason >= 3) fx.strain *= 1.5;
  if (thief >= 1) fx.crit += 0.05; if (thief >= 2) fx.speed *= 1.15; if (thief >= 3) fx.critDmg *= 1.5;
  if (wick >= 1) fx.hp *= 1.1; if (wick >= 2) fx.lifesteal += 0.01; if (wick >= 3) fx.stamRegen *= 1.5;
  for (const s of Object.keys(SETS) as SetId[]) { const tier = t(s); for (let i = 0; i < tier; i++) fx.sources.push({ name: `${SETS[s].name} (${SET_PIECES[i]} pieces)`, effect: SETS[s].bonus[i] }); }
  return fx;
}

/** A shade's weapon: damage and speed from its affixes. */
export function shadeAffixFx(state: GameState, weaponId: string | null): { dmg: number; speed: number } {
  if (!weaponId) return { dmg: 1, speed: 1 };
  const fx = weaponFx(state.player.weapons[weaponId]);
  return { dmg: fx.dmg, speed: fx.speed };
}

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  if (action.type === 'reforge') { const why = reforge(state, events, action.weapon); return why ? err(why) : true; }
  if (action.type === 'lockAffix') { const why = toggleLock(state, action.weapon, action.affix); return why ? err(why) : true; }
  return false;
});
