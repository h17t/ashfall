import { describe, it, expect } from 'vitest';
import { newGame, advance, D, canBuySpell, schoolsAvailable, recitationSlotCost, spellPower, computeMods, creedAvailable, switchCost, upgradeCost } from '..';

function caster(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.marrow = D(1e6);
  advance(s, 0, [{ type: 'buyWeapon', weapon: 'weaverStaff' }]);
  advance(s, 0.1);
  return s;
}

describe('magic', () => {
  it('a catalyst opens a slot and its school; spells need the school', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(s.player.recitationSlots).toBe(0);
    expect(canBuySpell(s, 'marrowDart')).toMatch(/staff/);
    s.marrow = D(1e6);
    advance(s, 0, [{ type: 'buyWeapon', weapon: 'weaverStaff' }]);
    advance(s, 0.1);
    expect(schoolsAvailable(s).has('weaving')).toBe(true);
    expect(s.player.recitationSlots).toBe(1);
    expect(canBuySpell(s, 'marrowDart')).toBeNull();
    expect(canBuySpell(s, 'heal')).toMatch(/talisman/);
    expect(canBuySpell(s, 'greatMarrowDart')).toMatch(/Region 2/);
  });
  it('buys, attunes, casts with FP and cooldown', () => {
    const s = caster();
    advance(s, 0, [{ type: 'buySpell', spell: 'marrowDart' }, { type: 'recite', slot: 0, spell: 'marrowDart' }]);
    expect(s.spellsKnown).toContain('marrowDart');
    expect(s.player.recited[0]).toBe('marrowDart');
    const fp0 = s.player.fp;
    const hp0 = s.encounter.enemy!.hp;
    s.encounter.enemy!.hp = D(1e9); s.encounter.enemy!.hpMax = D(1e9);
    const ev = advance(s, 0, [{ type: 'cast', slot: 0 }]);
    expect(ev.some((e) => e.type === 'cast')).toBe(true);
    expect(ev.some((e) => e.type === 'hit' && e.source === 'spell')).toBe(true);
    expect(s.player.fp).toBe(fp0 - 8);
    expect(s.player.cooldowns.marrowDart).toBe(4);
    const ev2 = advance(s, 0, [{ type: 'cast', slot: 0 }]);
    expect(ev2.some((e) => e.type === 'cast')).toBe(false); // on cooldown
    expect(hp0.gt(0)).toBe(true);
  });
  it('spell power scales with the school stat and the wielded catalyst', () => {
    const s = caster();
    const mods = computeMods(s);
    const base = spellPower(s, mods, 'marrowDart');
    s.player.stats.ins = 40;
    const invested = spellPower(s, mods, 'marrowDart');
    expect(invested).toBeGreaterThan(base * 2);
    s.player.weapon = 'weaverStaff';
    expect(spellPower(s, mods, 'marrowDart')).toBeCloseTo(invested * 1.25, 6);
  });
  it('recitation slots are a scarce purchase', () => {
    const s = caster();
    const c0 = recitationSlotCost(s);
    advance(s, 0, [{ type: 'buyRecitationSlot' }]);
    advance(s, 0.1);
    expect(s.player.recitationSlots).toBe(2);
    expect(recitationSlotCost(s).gt(c0)).toBe(true);
    s.marrow = D(1e12);
    advance(s, 0, [{ type: 'buyRecitationSlot' }, { type: 'buyRecitationSlot' }]);
    const ev = advance(s, 0, [{ type: 'buyRecitationSlot' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
  });
  it('buffs and heals resolve', () => {
    const s = caster();
    s.player.weapons.litanyBeads = { id: 'litanyBeads', level: 0, infusion: 'none' };
    advance(s, 0.1);
    advance(s, 0, [{ type: 'buySpell', spell: 'heal' }, { type: 'buySpell', spell: 'wovenEdge' }, { type: 'buyRecitationSlot' }]);
    advance(s, 0.1);
    advance(s, 0, [{ type: 'recite', slot: 0, spell: 'heal' }, { type: 'recite', slot: 1, spell: 'wovenEdge' }]);
    s.player.hp = 10;
    advance(s, 0, [{ type: 'cast', slot: 0 }, { type: 'cast', slot: 1 }]);
    expect(s.player.hp).toBeGreaterThan(10);
    expect(s.player.buffs.some((b) => b.id === 'spell:wovenEdge' && (b.dmg ?? 0) >= 1.25)).toBe(true);
  });
});

describe('creeds', () => {
  it('first oath is free, switching costs, upgrades need rep', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(creedAvailable(s, 'wick')).toBeNull();
    expect(creedAvailable(s, 'legion')).toMatch(/Recruit/);
    expect(creedAvailable(s, 'rot')).toMatch(/Region 2/);
    expect(switchCost(s).toNumber()).toBe(0);
    advance(s, 0, [{ type: 'joinCreed', creed: 'wick' }]);
    expect(s.creed.current).toBe('wick');
    expect(switchCost(s).gt(0)).toBe(true);
    s.toll.t = 22 * 60; // Dusk: not the Wickkeepers' hour, and no marrow tilt of its own
    const mods = computeMods(s);
    expect(mods.marrow).toBeCloseTo(1.25, 6);
    expect(mods.remainsKeep).toBeCloseTo(0.7, 6);
    const ev = advance(s, 0, [{ type: 'buyCreedUpgrade', upgrade: 'wickGreed' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
    s.creed.rep.wick = 100;
    s.marrow = D(1e9);
    advance(s, 0, [{ type: 'buyCreedUpgrade', upgrade: 'wickGreed' }]);
    expect(s.creed.upgrades.wickGreed).toBe(1);
    expect(computeMods(s).marrow).toBeCloseTo(1.25 * 1.1, 6);
    expect(upgradeCost(s, 'wick', 'wickGreed').gt(0)).toBe(true);
    // leaving keeps rep and upgrades but removes their effect
    advance(s, 0, [{ type: 'joinCreed', creed: null }]);
    expect(computeMods(s).marrow).toBe(1);
    expect(s.creed.rep.wick).toBe(100);
  });
  it('kills raise reputation', () => {
    const s = newGame(2);
    advance(s, 0, [{ type: 'joinCreed', creed: 'wick' }]);
    let kills = 0;
    for (let i = 0; i < 600 && kills < 3; i++) {
      if (s.encounter.enemy) s.encounter.enemy.hp = D(1);
      kills += advance(s, 0.1, [{ type: 'click' }]).filter((e) => e.type === 'kill').length;
    }
    expect(s.creed.rep.wick).toBe(kills);
  });
  it('the Nadiral Pact removes the remains', () => {
    const s = newGame(3);
    advance(s, 0.1);
    s.creed.current = 'nadir';
    s.marrow = D(1000);
    s.player.hp = 1;
    s.encounter.enemy!.hp = D(1e12);
    let died = false;
    for (let i = 0; i < 200 && !died; i++) died = advance(s, 0.1).some((e) => e.type === 'death');
    expect(died).toBe(true);
    expect(s.remains).toBeNull();
    expect(s.marrow.toNumber()).toBe(0);
    expect(s.stats.marrowLost.toNumber()).toBe(1000);
  });
});
