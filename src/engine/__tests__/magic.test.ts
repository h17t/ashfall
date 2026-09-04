import { describe, it, expect } from 'vitest';
import { newGame, advance, D, canBuySpell, schoolsAvailable, attunementSlotCost, spellPower, computeMods, covenantAvailable, switchCost, upgradeCost } from '..';

function caster(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.souls = D(1e6);
  advance(s, 0, [{ type: 'buyWeapon', weapon: 'ashenStaff' }]);
  advance(s, 0.1);
  return s;
}

describe('magic', () => {
  it('a catalyst opens a slot and its school; spells need the school', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(s.player.attunementSlots).toBe(0);
    expect(canBuySpell(s, 'soulArrow')).toMatch(/staff/);
    s.souls = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'ashenStaff' }]);
    advance(s, 0.1);
    expect(schoolsAvailable(s).has('sorcery')).toBe(true);
    expect(s.player.attunementSlots).toBe(1);
    expect(canBuySpell(s, 'soulArrow')).toBeNull();
    expect(canBuySpell(s, 'heal')).toMatch(/talisman/);
    expect(canBuySpell(s, 'greatSoulArrow')).toMatch(/Region 2/);
  });
  it('buys, attunes, casts with FP and cooldown', () => {
    const s = caster();
    advance(s, 0, [{ type: 'buySpell', spell: 'soulArrow' }, { type: 'attune', slot: 0, spell: 'soulArrow' }]);
    expect(s.spellsKnown).toContain('soulArrow');
    expect(s.player.attuned[0]).toBe('soulArrow');
    const fp0 = s.player.fp;
    const hp0 = s.encounter.enemy!.hp;
    s.encounter.enemy!.hp = D(1e9); s.encounter.enemy!.hpMax = D(1e9);
    const ev = advance(s, 0, [{ type: 'cast', slot: 0 }]);
    expect(ev.some((e) => e.type === 'cast')).toBe(true);
    expect(ev.some((e) => e.type === 'hit' && e.source === 'spell')).toBe(true);
    expect(s.player.fp).toBe(fp0 - 8);
    expect(s.player.cooldowns.soulArrow).toBe(4);
    const ev2 = advance(s, 0, [{ type: 'cast', slot: 0 }]);
    expect(ev2.some((e) => e.type === 'cast')).toBe(false); // on cooldown
    expect(hp0.gt(0)).toBe(true);
  });
  it('spell power scales with the school stat and the wielded catalyst', () => {
    const s = caster();
    const mods = computeMods(s);
    const base = spellPower(s, mods, 'soulArrow');
    s.player.stats.int = 40;
    const invested = spellPower(s, mods, 'soulArrow');
    expect(invested).toBeGreaterThan(base * 2);
    s.player.weapon = 'ashenStaff';
    expect(spellPower(s, mods, 'soulArrow')).toBeCloseTo(invested * 1.25, 6);
  });
  it('attunement slots are a scarce purchase', () => {
    const s = caster();
    const c0 = attunementSlotCost(s);
    advance(s, 0, [{ type: 'buyAttunementSlot' }]);
    advance(s, 0.1);
    expect(s.player.attunementSlots).toBe(2);
    expect(attunementSlotCost(s).gt(c0)).toBe(true);
    s.souls = D(1e12);
    advance(s, 0, [{ type: 'buyAttunementSlot' }, { type: 'buyAttunementSlot' }]);
    const ev = advance(s, 0, [{ type: 'buyAttunementSlot' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
  });
  it('buffs and heals resolve', () => {
    const s = caster();
    s.player.weapons.crackedTalisman = { id: 'crackedTalisman', level: 0, infusion: 'none' };
    advance(s, 0.1);
    advance(s, 0, [{ type: 'buySpell', spell: 'heal' }, { type: 'buySpell', spell: 'magicWeapon' }, { type: 'buyAttunementSlot' }]);
    advance(s, 0.1);
    advance(s, 0, [{ type: 'attune', slot: 0, spell: 'heal' }, { type: 'attune', slot: 1, spell: 'magicWeapon' }]);
    s.player.hp = 10;
    advance(s, 0, [{ type: 'cast', slot: 0 }, { type: 'cast', slot: 1 }]);
    expect(s.player.hp).toBeGreaterThan(10);
    expect(s.player.buffs.some((b) => b.id === 'spell:magicWeapon' && (b.dmg ?? 0) >= 1.25)).toBe(true);
  });
});

describe('covenants', () => {
  it('first oath is free, switching costs, upgrades need rep', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(covenantAvailable(s, 'embers')).toBeNull();
    expect(covenantAvailable(s, 'legion')).toMatch(/Recruit/);
    expect(covenantAvailable(s, 'rot')).toMatch(/Region 2/);
    expect(switchCost(s).toNumber()).toBe(0);
    advance(s, 0, [{ type: 'joinCovenant', covenant: 'embers' }]);
    expect(s.covenant.current).toBe('embers');
    expect(switchCost(s).gt(0)).toBe(true);
    const mods = computeMods(s);
    expect(mods.souls).toBeCloseTo(1.25, 6);
    expect(mods.bloodstainKeep).toBeCloseTo(0.7, 6);
    const ev = advance(s, 0, [{ type: 'buyCovenantUpgrade', upgrade: 'emberGreed' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    s.covenant.rep.embers = 100;
    s.souls = D(1e9);
    advance(s, 0, [{ type: 'buyCovenantUpgrade', upgrade: 'emberGreed' }]);
    expect(s.covenant.upgrades.emberGreed).toBe(1);
    expect(computeMods(s).souls).toBeCloseTo(1.25 * 1.1, 6);
    expect(upgradeCost(s, 'embers', 'emberGreed').gt(0)).toBe(true);
    // leaving keeps rep and upgrades but removes their effect
    advance(s, 0, [{ type: 'joinCovenant', covenant: null }]);
    expect(computeMods(s).souls).toBe(1);
    expect(s.covenant.rep.embers).toBe(100);
  });
  it('kills raise reputation', () => {
    const s = newGame(2);
    advance(s, 0, [{ type: 'joinCovenant', covenant: 'embers' }]);
    let kills = 0;
    for (let i = 0; i < 600 && kills < 3; i++) {
      if (s.encounter.enemy) s.encounter.enemy.hp = D(1);
      kills += advance(s, 0.1, [{ type: 'click' }]).filter((e) => e.type === 'kill').length;
    }
    expect(s.covenant.rep.embers).toBe(kills);
  });
  it('the Abyssal Pact removes the bloodstain', () => {
    const s = newGame(3);
    advance(s, 0.1);
    s.covenant.current = 'abyss';
    s.souls = D(1000);
    s.player.hp = 1;
    s.encounter.enemy!.hp = D(1e12);
    let died = false;
    for (let i = 0; i < 200 && !died; i++) died = advance(s, 0.1).some((e) => e.type === 'death');
    expect(died).toBe(true);
    expect(s.bloodstain).toBeNull();
    expect(s.souls.toNumber()).toBe(0);
    expect(s.stats.soulsLost.toNumber()).toBe(1000);
  });
});
