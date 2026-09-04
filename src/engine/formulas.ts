/**
 * Pure formulas: stat curves, costs, tier baselines. No state mutation here.
 */
import { BALANCE } from '@/content/balance';
import { D, Decimal } from './num';
import type { Grade, StatKey } from './types';

/**
 * Diminishing-returns stat curve. Returns the "scaling value" of a stat: 0 at 0 points,
 * ~0.6 at the first soft cap (20), ~0.95 at 40, ~1.11 at 60, then a slow tail.
 */
export function statCurve(points: number): number {
  const caps = BALANCE.level.softCaps;
  const slopes = BALANCE.level.slopes;
  let v = 0;
  let prev = 0;
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    if (points <= cap) return v + (points - prev) * slopes[i];
    v += (cap - prev) * slopes[i];
    prev = cap;
  }
  return v + (points - prev) * slopes[slopes.length - 1];
}

/** Marginal gain of the next point in a stat (for tooltips). */
export function statMarginal(points: number): number {
  return statCurve(points + 1) - statCurve(points);
}

export function softCapBand(points: number): number {
  const caps = BALANCE.level.softCaps;
  for (let i = 0; i < caps.length; i++) if (points < caps[i]) return i;
  return caps.length;
}

export function gradeCoef(g: Grade | undefined): number {
  if (!g) return 0;
  return BALANCE.weapon.grade[g] ?? 0;
}

/** Soul cost of going from `level` to `level + 1`. */
export function levelCost(level: number): Decimal {
  const b = BALANCE.level;
  return D(b.costBase).mul(Decimal.pow(b.costGrowth, level)).add(b.costLinear * level).floor();
}

export function reinforceCost(weaponRegion: number, currentLevel: number): Decimal {
  const b = BALANCE.weapon;
  const regionMult = Decimal.pow(5, weaponRegion - 1);
  return D(b.reinforceCostBase).mul(Decimal.pow(b.reinforceCostGrowth, currentLevel)).mul(regionMult).floor();
}

export function reinforceMult(level: number): number {
  return Math.pow(BALANCE.weapon.reinforceGrowth, level);
}

/** Enemy baselines by global tier g (0-based) and NG+ cycle. */
export function tierHp(g: number, ng: number): Decimal {
  const e = BALANCE.enemy;
  return D(e.hpBase).mul(Decimal.pow(e.hpGrowth, g)).mul(Decimal.pow(BALANCE.ng.hpGrowth, ng));
}
export function tierDmg(g: number, ng: number): number {
  const e = BALANCE.enemy;
  return e.dmgBase * Math.pow(e.dmgGrowth, g) * Math.pow(BALANCE.ng.dmgGrowth, ng);
}
export function tierPoise(g: number): number {
  const e = BALANCE.enemy;
  return e.poiseBase * Math.pow(e.poiseGrowth, g);
}
export function tierSouls(g: number, ng: number): Decimal {
  const e = BALANCE.enemy;
  return D(e.soulBase).mul(Decimal.pow(e.soulGrowth, g)).mul(Decimal.pow(BALANCE.ng.soulGrowth, ng));
}

export function playerHpMax(vig: number, level: number, hpMult: number): number {
  const p = BALANCE.player;
  const base = p.hpBase + statCurve(vig) * 40 * p.hpPerVig;
  return Math.floor(base * Math.pow(p.hpPerLevel, Math.max(0, level - 1)) * hpMult);
}

/** Ember hardening for damage: every soul level multiplies damage. Stats and grades decide *which* damage. */
export function levelDamageMult(level: number): number {
  return Math.pow(BALANCE.player.dmgPerLevel, Math.max(0, level - 1));
}

export function playerStaminaMax(end: number): number {
  const p = BALANCE.player;
  return Math.floor(p.staminaBase + statCurve(end) * 40 * p.staminaPerEnd);
}

export function playerStaminaRegen(end: number, mult: number): number {
  const p = BALANCE.player;
  return (p.staminaRegenBase + statCurve(end) * 40 * p.staminaRegenPerEnd) * mult;
}

export function playerFpMax(int: number, fth: number, mult: number): number {
  const p = BALANCE.player;
  return Math.floor((p.fpBase + (statCurve(int) + statCurve(fth)) * 40 * p.fpPerIntFth) * mult);
}

export function critChance(dex: number, bonus: number): number {
  return BALANCE.player.baseCrit + Math.min(dex, 40) * BALANCE.player.critPerDex + bonus;
}

/** Expected soul level for a global tier; used by phantom hunting difficulty and tooltips. */
export function expectedLevel(g: number, ng = 0): number {
  return 10 + 4 * g + 5 * ng;
}

export const STAT_NAMES: Record<StatKey, string> = {
  vig: 'Vigor',
  end: 'Endurance',
  str: 'Strength',
  dex: 'Dexterity',
  int: 'Intelligence',
  fth: 'Faith',
};

export const STAT_DESC: Record<StatKey, string> = {
  vig: 'Max HP. The ember burns longer.',
  end: 'Max stamina and stamina regen. Every swing and roll is paid from here.',
  str: 'Scales heavy weapons. Slightly raises stagger power.',
  dex: 'Scales fast weapons. Raises crit chance.',
  int: 'Scales sorcery and magic infusions. Raises FP.',
  fth: 'Scales miracles and blessed infusions. Raises FP.',
};
