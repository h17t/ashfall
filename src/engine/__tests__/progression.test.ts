import { describe, it, expect } from 'vitest';
import { newGame, advance, levelCost, D } from '..';

describe('leveling', () => {
  it('costs souls on the rising curve and raises the stat', () => {
    const s = newGame(1);
    s.souls = levelCost(1).add(levelCost(2));
    advance(s, 0, [{ type: 'levelUp', stat: 'str' }]);
    expect(s.player.level).toBe(2);
    expect(s.player.stats.str).toBe(11);
    expect(s.souls.eq(levelCost(2))).toBe(true);
    advance(s, 0, [{ type: 'levelUp', stat: 'vig' }]);
    expect(s.player.level).toBe(3);
    expect(s.souls.toNumber()).toBe(0);
    const ev = advance(s, 0, [{ type: 'levelUp', stat: 'vig' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    expect(s.player.level).toBe(3);
  });
  it('vigor raises max hp immediately', () => {
    const s = newGame(1);
    s.souls = D(1e6);
    const hp0 = s.player.hpMax;
    advance(s, 0, [{ type: 'levelUp', stat: 'vig' }]);
    expect(s.player.hpMax).toBeGreaterThan(hp0);
  });
});

describe('weapons', () => {
  it('buys, equips and reinforces with materials', () => {
    const s = newGame(1);
    s.souls = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'pilgrimMace' }]);
    expect(s.player.weapons.pilgrimMace).toBeDefined();
    advance(s, 0, [{ type: 'equip', weapon: 'pilgrimMace' }]);
    expect(s.player.weapon).toBe('pilgrimMace');
    const ev = advance(s, 0, [{ type: 'reinforce', weapon: 'pilgrimMace' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true); // no shards
    s.materials.shard = 1;
    advance(s, 0, [{ type: 'reinforce', weapon: 'pilgrimMace' }]);
    expect(s.player.weapons.pilgrimMace.level).toBe(1);
    expect(s.materials.shard).toBe(0);
  });
  it('refuses to buy twice or buy unowned-source weapons', () => {
    const s = newGame(1);
    s.souls = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'banditDagger' }]);
    const ev = advance(s, 0, [{ type: 'buyWeapon', weapon: 'banditDagger' }, { type: 'buyWeapon', weapon: 'wardenCleaver' }]);
    expect(ev.filter((e) => e.type === 'error').length).toBe(2);
  });
});
