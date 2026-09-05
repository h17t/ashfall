import { describe, it, expect } from 'vitest';
import { statCurve, statMarginal, levelCost, tierHp, tierMarrow, reinforceMult, playerHpMax, gradeCoef } from '../formulas';
import { BALANCE } from '@/content/balance';

describe('statCurve', () => {
  it('is monotonic with diminishing returns across soft caps', () => {
    let prev = statCurve(0);
    let prevMarg = Infinity;
    for (let x = 1; x <= 120; x++) {
      const v = statCurve(x);
      expect(v).toBeGreaterThan(prev);
      const marg = v - prev;
      expect(marg).toBeLessThanOrEqual(prevMarg + 1e-9);
      prev = v;
      prevMarg = marg;
    }
  });
  it('hits the documented values at soft caps', () => {
    expect(statCurve(20)).toBeCloseTo(0.6, 5);
    expect(statCurve(40)).toBeCloseTo(0.95, 5);
    expect(statCurve(60)).toBeCloseTo(1.11, 5);
    expect(statMarginal(19)).toBeCloseTo(BALANCE.level.slopes[0], 6);
    expect(statMarginal(20)).toBeCloseTo(BALANCE.level.slopes[1], 6);
  });
});

describe('costs and tiers', () => {
  it('level cost rises strictly and stays finite', () => {
    let prev = levelCost(1);
    for (let l = 2; l < 400; l++) {
      const c = levelCost(l);
      expect(c.gt(prev)).toBe(true);
      expect(Number.isFinite(c.mantissa)).toBe(true);
      prev = c;
    }
  });
  it('tier hp and marrow grow geometrically', () => {
    expect(tierHp(1, 0).div(tierHp(0, 0)).toNumber()).toBeCloseTo(BALANCE.enemy.hpGrowth, 6);
    expect(tierMarrow(5, 0).div(tierMarrow(4, 0)).toNumber()).toBeCloseTo(BALANCE.enemy.soulGrowth, 6);
    expect(tierHp(3, 2).div(tierHp(3, 0)).toNumber()).toBeCloseTo(BALANCE.ng.hpGrowth ** 2, 6);
  });
  it('reinforce +10 is roughly 4x', () => {
    expect(reinforceMult(10)).toBeGreaterThan(3.9);
    expect(reinforceMult(10)).toBeLessThan(4.2);
  });
  it('grade coefficients are ordered', () => {
    const order = ['-', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
    for (let i = 1; i < order.length; i++) expect(gradeCoef(order[i])).toBeGreaterThan(gradeCoef(order[i - 1]));
  });
  it('player hp grows with vitality and level', () => {
    expect(playerHpMax(20, 1, 1)).toBeGreaterThan(playerHpMax(10, 1, 1));
    expect(playerHpMax(10, 20, 1)).toBeGreaterThan(playerHpMax(10, 1, 1));
    expect(playerHpMax(10, 1, 2)).toBe(playerHpMax(10, 1, 1) * 2);
  });
});
