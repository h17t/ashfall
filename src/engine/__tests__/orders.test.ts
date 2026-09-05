import { describe, it, expect } from 'vitest';
import { newGame, advance, D, orderSlots, availableConds, availableActs, condHolds, condText, actText, levelCost, serialize, parseSave, type GameState, type Order } from '..';
import { BALANCE } from '@/content';

function learned(seed = 5): GameState {
  const s = newGame(seed);
  s.flags.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.automation.autoAttack = false;
  s.player.level = 20; s.player.stats.vit = 12;
  advance(s, 0.1); // the unlock check grants the orders
  return s;
}
const rule = (id: number, when: Order['when'], then: Order['then'], on = true): Order => ({ id, when, then, on, fired: 0, cd: 0 });
const set = (s: GameState, rules: Order[]) => advance(s, 0, [{ type: 'setOrders', rules }]);

describe('Standing Orders', () => {
  it('arrive with Revenant Instinct and grow a slot per lord, to the cap', () => {
    const s = newGame(1);
    expect(orderSlots(s)).toBe(0);
    const t = learned();
    expect(t.flags.ordersUnlocked).toBe(true);
    expect(orderSlots(t)).toBe(BALANCE.orders.baseSlots);
    t.prestige.bossesEverKilled = ['a', 'b', 'c'];
    expect(orderSlots(t)).toBe(BALANCE.orders.baseSlots + 3);
    t.prestige.bossesEverKilled = Array.from({ length: 20 }, (_, i) => 'l' + i);
    expect(orderSlots(t)).toBe(BALANCE.orders.maxSlots);
  });
  it('conditions and actions are earned by play', () => {
    const s = learned();
    expect(availableConds(s)).not.toContain('reprisal');
    expect(availableActs(s)).not.toContain('withdraw');
    s.stats.reprisals = 1; s.flags.descentUnlocked = true; s.spellsKnown = ['marrowDart'];
    expect(availableConds(s)).toEqual(expect.arrayContaining(['composure', 'reprisal', 'floor', 'haul', 'boonOffer']));
    expect(availableActs(s)).toEqual(expect.arrayContaining(['withdraw', 'descend', 'takeBoon', 'cast']));
  });
  it('refuses more orders than slots and orders you have not learned to give', () => {
    const s = learned();
    const three = [1, 2, 3].map((i) => rule(i, [{ kind: 'always', op: '>', value: 1 }], { kind: 'drink' }));
    expect(set(s, three).some((e) => e.type === 'error' && /hold 2/.test(e.text))).toBe(true);
    expect(s.orders.rules).toHaveLength(0);
    const ev = set(s, [rule(1, [{ kind: 'reprisal', op: '>', value: 1 }], { kind: 'strike' })]);
    expect(ev.some((e) => e.type === 'error' && /Reprisal/.test(e.text))).toBe(true);
  });
  it('WHEN HP < 35% THEN drink: fires once the threshold is crossed, waits for its cooldown, and counts', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'hp', op: '<', value: 35 }], { kind: 'drink' })]);
    expect(s.orders.rules).toHaveLength(1);
    s.player.hp = Math.round(s.player.hpMax * 0.5);
    advance(s, 0.5);
    expect(s.orders.rules[0].fired).toBe(0);
    s.player.hp = Math.round(s.player.hpMax * 0.2);
    const d = s.player.draughts;
    const ev = advance(s, 0.1);
    expect(ev.some((e) => e.type === 'orderFired' && e.id === 1)).toBe(true);
    expect(s.player.draughts).toBe(d - 1);
    expect(s.orders.rules[0].fired).toBe(1);
    expect(s.player.hp).toBeGreaterThan(s.player.hpMax * 0.35);
  });
  it('WHEN Marrow > 1× a level THEN level Might: spends down to the threshold, one level a second', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'marrow', op: '>', value: 1 }], { kind: 'levelUp', arg: 'mig' })]);
    s.marrow = levelCost(s.player.level).mul(3.5);
    const mig = s.player.stats.mig;
    advance(s, 2.5);
    expect(s.player.stats.mig).toBeGreaterThan(mig);
    expect(s.player.stats.mig - mig).toBeLessThanOrEqual(3);
  });
  it('orders are evaluated in the order they are set, and a disabled one is skipped', () => {
    const s = learned();
    s.player.hp = Math.round(s.player.hpMax * 0.1);
    set(s, [
      rule(1, [{ kind: 'hp', op: '<', value: 50 }], { kind: 'drink' }, false),
      rule(2, [{ kind: 'hp', op: '<', value: 50 }], { kind: 'drink' }),
    ]);
    const ev = advance(s, 0.1);
    const fired = ev.filter((e) => e.type === 'orderFired').map((e: any) => e.id);
    expect(fired).toEqual([2]);
  });
  it('two conditions must both hold', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'hp', op: '<', value: 50 }, { kind: 'draughts', op: '>', value: 1 }], { kind: 'drink' })]);
    s.player.hp = 1; s.player.draughts = 1;
    advance(s, 0.3);
    expect(s.orders.rules[0].fired).toBe(0);
    s.player.draughts = 2;
    advance(s, 0.1);
    expect(s.orders.rules[0].fired).toBe(1);
  });
  it('reads the enemy: composure, the Reprisal window, a coming attack', () => {
    const s = learned();
    advance(s, 1.5);
    const e = s.encounter.enemy!;
    e.strain = e.composure * 0.9;
    expect(condHolds(s, { kind: 'composure', op: '>', value: 80 })).toBe(true);
    e.reprisal = 1;
    expect(condHolds(s, { kind: 'reprisal', op: '>', value: 1 })).toBe(true);
    expect(condHolds(s, { kind: 'reprisal', op: '>', value: 0 })).toBe(false);
    e.windup = 0.3; e.windupTotal = 1;
    expect(condHolds(s, { kind: 'telegraph', op: '>', value: 1 })).toBe(true);
  });
  it('a strike order is paced like a hand, not a machine', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'always', op: '>', value: 1 }], { kind: 'strike' })]);
    advance(s, 1.5);
    s.encounter.enemy!.hp = D(1e9); s.encounter.enemy!.hpMax = D(1e9);
    s.player.stamina = 1e6; s.player.staminaMax = 1e6;
    const before = s.orders.rules[0].fired;
    advance(s, 2);
    const perSec = (s.orders.rules[0].fired - before) / 2;
    expect(perSec).toBeGreaterThan(2); expect(perSec).toBeLessThanOrEqual(1 / BALANCE.orders.strikeCooldown + 0.01);
  });
  it('the stair: withdraw on a floor, take the rarest boon on an offer', () => {
    const s = learned();
    s.stats.bossKills = 1; s.flags.descentUnlocked = true; s.stats.cycleDeepest = 4;
    set(s, [
      rule(1, [{ kind: 'boonOffer', op: '>', value: 1 }, { kind: 'floor', op: '<', value: 3 }], { kind: 'takeBoon', arg: 'epic' }),
      rule(2, [{ kind: 'boonOffer', op: '>', value: 1 }], { kind: 'withdraw' }),
    ]);
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.floor = 1; run.offer = ['tallowEdge', 'glassMarrow', 'keenEye']; run.haul = D(100);
    advance(s, 0.1);
    expect(run.boons).toEqual(['glassMarrow']); expect(run.floor).toBe(2);
    run.floor = 3; run.offer = ['tallowEdge', 'keenEye', 'marrowGreed'];
    advance(s, 0.5);
    expect(s.descent.run).toBeNull(); expect(s.descent.last?.died).toBe(false);
  });
  it('an order whose action the engine refuses does not count as fired and leaves no error in the log', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'always', op: '>', value: 1 }], { kind: 'retreat' })]);
    const ev = advance(s, 1);
    expect(ev.some((e) => e.type === 'error')).toBe(false);
  });
  it('reads back in words', () => {
    expect(condText({ kind: 'hp', op: '<', value: 35 })).toBe('HP < 35%');
    expect(condText({ kind: 'marrow', op: '>', value: 2 })).toBe('Marrow > 2× a level');
    expect(condText({ kind: 'reprisal', op: '>', value: 1 })).toBe('Reprisal open');
    expect(actText({ kind: 'levelUp', arg: 'mig' })).toBe('Level Might');
    expect(actText({ kind: 'cast', arg: 1 })).toBe('Cast slot 2');
  });
  it('survives a save round-trip with its counters', () => {
    const s = learned();
    set(s, [rule(1, [{ kind: 'hp', op: '<', value: 35 }], { kind: 'drink' })]);
    s.orders.rules[0].fired = 7;
    const t = parseSave(serialize(s, 1));
    expect(t.orders.rules).toEqual(s.orders.rules);
  });
});
