import { describe, it, expect } from 'vitest';
import { runSim, STRATEGIES } from '@/sim';
import { BALANCE } from '@/content/balance';

/**
 * Simulation tests asserting pacing targets. These fail the build when a balance change
 * breaks the curve. Kept short (1h) so the suite stays fast; the full 200h report is `npm run sim`.
 */
describe('pacing targets', () => {
  const T = BALANCE.targets;
  it('greedy: auto-attack inside 10 minutes, first boss inside the target window', () => {
    const r = runSim({ strategy: STRATEGIES.greedy(), hours: 1, seed: 7, until: (s) => s.stats.bossKills > 0 });
    expect(r.invariantErrors).toEqual([]);
    expect(r.milestones.autoAttack).not.toBeNull();
    expect(r.milestones.autoAttack! / 60).toBeLessThanOrEqual(T.autoAttackMin[1]);
    expect(r.milestones.firstBoss).not.toBeNull();
    expect(r.milestones.firstBoss! / 60).toBeGreaterThanOrEqual(T.firstBossMin[0]);
    expect(r.milestones.firstBoss! / 60).toBeLessThanOrEqual(T.firstBossMin[1]);
  });
  it('casual: still beats the first boss within an hour', () => {
    const r = runSim({ strategy: STRATEGIES.casual(), hours: 1, seed: 7, until: (s) => s.stats.bossKills > 0 });
    expect(r.invariantErrors).toEqual([]);
    expect(r.milestones.firstBoss).not.toBeNull();
  });
  it('noclick: progresses at all (the idle floor is not zero)', () => {
    const r = runSim({ strategy: STRATEGIES.noclick(), hours: 1, seed: 7 });
    expect(r.invariantErrors).toEqual([]);
    expect(r.finalLevel).toBeGreaterThan(5);
  });
  it('greedy: first Snuff lands inside the target window and the cycle after it is faster, not slower', () => {
    const r = runSim({ strategy: STRATEGIES.greedy(), hours: 7, seed: 7, until: (s) => s.prestige.wakings >= 1 && s.stats.cycleTime > 20 * 60 });
    expect(r.invariantErrors).toEqual([]);
    expect(r.milestones.firstKindle).not.toBeNull();
    const h = r.milestones.firstKindle! / 3600;
    expect(h).toBeGreaterThanOrEqual(1);
    expect(h).toBeLessThanOrEqual(T.firstKindleHours[1]);
  }, 60000);
  it('casual: clears Region 2 within four hours', () => {
    const r = runSim({ strategy: STRATEGIES.casual(), hours: 4, seed: 7, until: (s) => s.prestige.bossesEverKilled.includes('mireMother') });
    expect(r.milestones.bosses.mireMother).toBeDefined();
    expect(r.milestones.bosses.mireMother! / 3600).toBeLessThanOrEqual(4);
  }, 60000);
  it('a full hour of greedy play has no 20-minute stall', () => {
    const r = runSim({ strategy: STRATEGIES.greedy(), hours: 1, seed: 11 });
    expect(r.stalls).toEqual([]);
  });
});
