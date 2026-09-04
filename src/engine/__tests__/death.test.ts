import { describe, it, expect } from 'vitest';
import { newGame, advance, D, type GameState } from '..';
import { getZone } from '@/content';
import { BALANCE } from '@/content/balance';

function killPlayerAt(s: GameState, tier: number) {
  // clear up to the tier, travel there, then die
  const zp = s.zones.approach ?? (advance(s, 0.1), s.zones.approach);
  zp.cleared = Math.max(zp.cleared, tier - 1);
  advance(s, 0.1, [{ type: 'travel', zone: 'approach', tier }]);
  advance(s, 1);
  s.player.hp = 1;
  s.encounter.enemy!.hp = D(1e12);
  s.automation.autoAttack = false;
  let died = false;
  for (let i = 0; i < 200 && !died; i++) {
    const ev = advance(s, 0.1);
    if (ev.some((e) => e.type === 'death')) died = true;
  }
  expect(died).toBe(true);
}

describe('death and the bloodstain', () => {
  it('drops all souls as a bloodstain at the encounter and respawns at the bonfire', () => {
    const s = newGame(3);
    s.souls = D(1234);
    killPlayerAt(s, 2);
    expect(s.souls.toNumber()).toBe(0);
    expect(s.bloodstain?.souls.toNumber()).toBe(1234);
    expect(s.bloodstain?.tier).toBe(2);
    expect(s.encounter.tier).toBe(0);
    expect(s.corpseRun).toEqual({ zone: 'approach', targetTier: 2, atTier: 0, killsAtTier: 0 });
    expect(s.player.hp).toBe(s.player.hpMax);
    expect(s.player.estus).toBe(s.player.estusMax);
    expect(s.deathScreen).toBeGreaterThan(0);
  });
  it('freezes combat during the death screen', () => {
    const s = newGame(3);
    killPlayerAt(s, 0);
    const t = s.t;
    advance(s, 0.5, [{ type: 'click' }]);
    expect(s.encounter.enemy).toBeNull();
    expect(s.deathScreen).toBeLessThan(BALANCE.player.deathScreen);
  });
  it('recovers the bloodstain by fighting back to it, one kill per tier', () => {
    const s = newGame(4);
    s.souls = D(900);
    killPlayerAt(s, 2);
    advance(s, BALANCE.player.deathScreen + 0.5);
    // kill 1 enemy at tier 0, 1 at tier 1, 1 at tier 2
    let recovered = false;
    for (let i = 0; i < 3000 && !recovered; i++) {
      if (s.encounter.enemy) s.encounter.enemy.hp = D(1);
      const ev = advance(s, 0.1, [{ type: 'click' }]);
      if (ev.some((e) => e.type === 'bloodstainRecovered')) recovered = true;
      s.player.hp = s.player.hpMax; // don't die during the test run
    }
    expect(recovered).toBe(true);
    // 900 recovered plus the souls from the three corpse-run kills
    expect(s.souls.toNumber()).toBeGreaterThanOrEqual(900);
    expect(s.souls.toNumber()).toBeLessThan(1000);
    expect(s.bloodstain).toBeNull();
    expect(s.corpseRun).toBeNull();
    expect(s.encounter.tier).toBe(2);
  });
  it('dying again loses the first bloodstain forever', () => {
    const s = newGame(5);
    s.souls = D(500);
    killPlayerAt(s, 1);
    advance(s, BALANCE.player.deathScreen + 0.5);
    s.souls = D(50);
    if (!s.encounter.enemy) advance(s, 1);
    s.player.hp = 1;
    s.encounter.enemy!.hp = D(1e12);
    let lost: any = null;
    for (let i = 0; i < 200 && !lost; i++) lost = advance(s, 0.1).find((e) => e.type === 'bloodstainLost');
    expect(lost?.souls.toNumber()).toBe(500);
    expect(s.bloodstain?.souls.toNumber()).toBe(50);
    expect(s.stats.soulsLost.toNumber()).toBe(500);
  });
  it('travel is locked during a corpse run and unlocked by abandoning the stain', () => {
    const s = newGame(6);
    s.souls = D(100);
    killPlayerAt(s, 1);
    advance(s, BALANCE.player.deathScreen + 0.5);
    const ev = advance(s, 0, [{ type: 'travel', zone: 'approach', tier: 1 }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    advance(s, 0, [{ type: 'abandonBloodstain' }]);
    expect(s.bloodstain).toBeNull();
    const ev2 = advance(s, 0, [{ type: 'travel', zone: 'approach', tier: 1 }]);
    expect(ev2.some((e) => e.type === 'error')).toBe(false);
    expect(s.encounter.tier).toBe(1);
  });
  it('tier gating: cannot skip ahead', () => {
    const s = newGame(7);
    advance(s, 0.1);
    const ev = advance(s, 0, [{ type: 'travel', zone: 'approach', tier: 3 }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    const z = getZone('approach');
    expect(z.tiers.length).toBe(4);
  });
});
