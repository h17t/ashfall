import { describe, it, expect } from 'vitest';
import { newGame, advance, levelCost, D } from '..';

describe('leveling', () => {
  it('costs marrow on the rising curve and raises the stat', () => {
    const s = newGame(1);
    s.marrow = levelCost(1).add(levelCost(2));
    advance(s, 0, [{ type: 'levelUp', stat: 'mig' }]);
    expect(s.player.level).toBe(2);
    expect(s.player.stats.mig).toBe(11);
    expect(s.marrow.eq(levelCost(2))).toBe(true);
    advance(s, 0, [{ type: 'levelUp', stat: 'vit' }]);
    expect(s.player.level).toBe(3);
    expect(s.marrow.toNumber()).toBe(0);
    const ev = advance(s, 0, [{ type: 'levelUp', stat: 'vit' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    expect(s.player.level).toBe(3);
  });
  it('vitality raises max hp immediately', () => {
    const s = newGame(1);
    s.marrow = D(1e6);
    const hp0 = s.player.hpMax;
    advance(s, 0, [{ type: 'levelUp', stat: 'vit' }]);
    expect(s.player.hpMax).toBeGreaterThan(hp0);
  });
});

describe('weapons', () => {
  it('buys, equips and reinforces with materials', () => {
    const s = newGame(1);
    s.marrow = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'pilgrimMace' }]);
    expect(s.player.weapons.pilgrimMace).toBeDefined();
    advance(s, 0, [{ type: 'equip', weapon: 'pilgrimMace' }]);
    expect(s.player.weapon).toBe('pilgrimMace');
    const ev = advance(s, 0, [{ type: 'reinforce', weapon: 'pilgrimMace' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true); // no shards
    s.materials.coarseSlag = 1;
    advance(s, 0, [{ type: 'reinforce', weapon: 'pilgrimMace' }]);
    expect(s.player.weapons.pilgrimMace.level).toBe(1);
    expect(s.materials.coarseSlag).toBe(0);
  });
  it('refuses to buy twice or buy unowned-source weapons', () => {
    const s = newGame(1);
    s.marrow = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'banditDagger' }]);
    const ev = advance(s, 0, [{ type: 'buyWeapon', weapon: 'banditDagger' }, { type: 'buyWeapon', weapon: 'wardenCleaver' }]);
    expect(ev.filter((e) => e.type === 'error').length).toBe(2);
  });
});
