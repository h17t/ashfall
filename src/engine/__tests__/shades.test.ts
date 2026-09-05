import { describe, it, expect } from 'vitest';
import { newGame, advance, D, computeMods, evaluateHunt, resolveHunt, applyOffline, shadeLevelCost, cortegeSlots, canRecruit, shadeNumbers } from '..';

function withAldric(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.marrow = D(10000);
  s.zones.tollroad.cleared = 1;
  advance(s, 0, [{ type: 'recruit', shade: 'aldric' }]);
  expect(s.cortege.shades.length).toBe(1);
  return s;
}

describe('recruiting and levelling', () => {
  it('recruits for marrow, refuses twice, gates on boss kills', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(canRecruit(s, 'aldric')).toMatch(/marrow/);
    s.marrow = D(10000);
    expect(canRecruit(s, 'aldric')).toBeNull();
    advance(s, 0, [{ type: 'recruit', shade: 'aldric' }]);
    expect(s.marrow.toNumber()).toBe(9600);
    expect(canRecruit(s, 'aldric')).toMatch(/Already/);
    expect(canRecruit(s, 'ilse')).toMatch(/lord/);
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    expect(canRecruit(s, 'ilse')).toBeNull();
  });
  it('levels with marrow on a rising curve and with xp for free', () => {
    const s = withAldric();
    const ph = s.cortege.shades[0];
    const c1 = shadeLevelCost(ph);
    advance(s, 0, [{ type: 'assignShadeLevel', shade: 'aldric' }]);
    expect(ph.level).toBe(2);
    expect(shadeLevelCost(ph).gt(c1)).toBe(true);
    ph.xp = D(1e6);
    advance(s, 0.1);
    expect(ph.level).toBeGreaterThan(2);
  });
  it('slots grow with region bosses', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    expect(cortegeSlots(s, mods)).toBe(1);
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    expect(cortegeSlots(s, mods)).toBe(2);
  });
});

describe('beside the player', () => {
  it('a dps shade damages the enemy and builds strain', () => {
    const s = withAldric();
    s.automation.autoAttack = false;
    const e = s.encounter.enemy!;
    e.hp = D(1e9); e.hpMax = D(1e9);
    const ev = advance(s, 5);
    const hits = ev.filter((x) => x.type === 'hit' && x.source === 'shade');
    expect(hits.length).toBeGreaterThan(2);
    expect(e.strain > 0 || e.reprisal > 0 || ev.some((x) => x.type === 'strain')).toBe(true);
  });
  it('a healer heals the player', () => {
    const s = withAldric();
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    advance(s, 0, [{ type: 'recruit', shade: 'ilse' }]);
    expect(s.cortege.shades.length).toBe(2);
    s.player.hp = 10;
    const ev = advance(s, 4);
    expect(ev.some((x) => x.type === 'heal')).toBe(true);
    expect(s.player.hp).toBeGreaterThan(10);
  });
  it('gear: a better weapon raises shade damage; cannot equip the wielded one', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const before = shadeNumbers(s, mods, s.cortege.shades[0]).dps;
    s.player.weapons.pilgrimMace = { id: 'pilgrimMace', level: 3, infusion: 'none' };
    advance(s, 0, [{ type: 'equipShade', shade: 'aldric', weapon: 'pilgrimMace' }]);
    const after = shadeNumbers(s, mods, s.cortege.shades[0]).dps;
    expect(after.gt(before)).toBe(true);
    const ev = advance(s, 0, [{ type: 'equipShade', shade: 'aldric', weapon: 'revenantSword' }]);
    expect(ev.some((x) => x.type === 'error')).toBe(true);
  });
});

describe('hunting', () => {
  it('generates marrow at a closed-form rate only on cleared tiers', () => {
    const s = withAldric();
    advance(s, 0, [{ type: 'assignShade', shade: 'aldric', assignment: 'hunt' }]);
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.cortege.shades);
    expect(r.survivable).toBe(true);
    expect(r.marrow.gt(0)).toBe(true);
    const souls0 = s.marrow;
    advance(s, 10);
    expect(s.marrow.gt(souls0)).toBe(true);
    // roughly rate * time (hunting-only; player is not clicking, auto-attack kills add a little)
    const gained = s.marrow.sub(souls0).toNumber();
    expect(gained).toBeGreaterThan(r.marrow.toNumber() * 10 * 0.9);
    const ev = advance(s, 0, [{ type: 'setHunt', zone: 'tollroad', tier: 3, auto: false }]);
    expect(ev.some((x) => x.type === 'error')).toBe(true);
  });
  it('a lone level-1 shade cannot hold the last tier and retreats without loss', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const r = evaluateHunt(s, mods, s.cortege.shades, 'tollroad', 3);
    expect(r.survivable).toBe(false);
    expect(r.marrow.toNumber()).toBe(0);
    expect(r.reason).toMatch(/retreat/);
    expect(r.uptime).toBeLessThan(0.25);
    s.zones.tollroad.cleared = 3;
    advance(s, 0, [{ type: 'assignShade', shade: 'aldric', assignment: 'hunt' }, { type: 'setHunt', zone: 'tollroad', tier: 3, auto: false }]);
    const souls0 = s.marrow;
    advance(s, 3);
    expect(s.marrow.gte(souls0)).toBe(true);
    expect(s.cortege.shades[0].retreat).toBeGreaterThan(0);
  });
  it('auto picks the highest survivable tier', () => {
    const s = withAldric();
    s.zones.tollroad.cleared = 3;
    s.cortege.shades[0].level = 30;
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.cortege.shades);
    expect(r.survivable).toBe(true);
    expect(r.tier).toBeGreaterThanOrEqual(1);
  });
  it('offline uses the cortege rate with everyone hunting', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.cortege.shades);
    const sum = applyOffline(s, 3600)!;
    expect(sum.marrow.toNumber()).toBeCloseTo(Math.floor(r.marrow.toNumber() * 3600 * mods.offlineRate), -1);
    expect(sum.marrow.gt(0)).toBe(true);
    expect(s.cortege.shades[0].xp.gt(0)).toBe(true);
  });
});
