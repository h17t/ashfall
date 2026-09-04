import { describe, it, expect } from 'vitest';
import { newGame, advance, D, computeMods, evaluateHunt, resolveHunt, applyOffline, phantomLevelCost, squadSlots, canRecruit, phantomNumbers } from '..';

function withAldric(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.souls = D(10000);
  s.zones.approach.cleared = 1;
  advance(s, 0, [{ type: 'recruit', phantom: 'aldric' }]);
  expect(s.squad.phantoms.length).toBe(1);
  return s;
}

describe('recruiting and levelling', () => {
  it('recruits for souls, refuses twice, gates on boss kills', () => {
    const s = newGame(1);
    advance(s, 0.1);
    expect(canRecruit(s, 'aldric')).toMatch(/souls/);
    s.souls = D(10000);
    expect(canRecruit(s, 'aldric')).toBeNull();
    advance(s, 0, [{ type: 'recruit', phantom: 'aldric' }]);
    expect(s.souls.toNumber()).toBe(9600);
    expect(canRecruit(s, 'aldric')).toMatch(/Already/);
    expect(canRecruit(s, 'ilse')).toMatch(/lord/);
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    expect(canRecruit(s, 'ilse')).toBeNull();
  });
  it('levels with souls on a rising curve and with xp for free', () => {
    const s = withAldric();
    const ph = s.squad.phantoms[0];
    const c1 = phantomLevelCost(ph);
    advance(s, 0, [{ type: 'levelPhantom', phantom: 'aldric' }]);
    expect(ph.level).toBe(2);
    expect(phantomLevelCost(ph).gt(c1)).toBe(true);
    ph.xp = D(1e6);
    advance(s, 0.1);
    expect(ph.level).toBeGreaterThan(2);
  });
  it('slots grow with region bosses', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    expect(squadSlots(s, mods)).toBe(1);
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    expect(squadSlots(s, mods)).toBe(2);
  });
});

describe('beside the player', () => {
  it('a dps phantom damages the enemy and builds stagger', () => {
    const s = withAldric();
    s.automation.autoAttack = false;
    const e = s.encounter.enemy!;
    e.hp = D(1e9); e.hpMax = D(1e9);
    const ev = advance(s, 5);
    const hits = ev.filter((x) => x.type === 'hit' && x.source === 'phantom');
    expect(hits.length).toBeGreaterThan(2);
    expect(e.stagger > 0 || e.riposte > 0 || ev.some((x) => x.type === 'stagger')).toBe(true);
  });
  it('a healer heals the player', () => {
    const s = withAldric();
    s.prestige.bossesEverKilled.push('coldPyreWarden');
    advance(s, 0, [{ type: 'recruit', phantom: 'ilse' }]);
    expect(s.squad.phantoms.length).toBe(2);
    s.player.hp = 10;
    const ev = advance(s, 4);
    expect(ev.some((x) => x.type === 'heal')).toBe(true);
    expect(s.player.hp).toBeGreaterThan(10);
  });
  it('gear: a better weapon raises phantom damage; cannot equip the wielded one', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const before = phantomNumbers(s, mods, s.squad.phantoms[0]).dps;
    s.player.weapons.pilgrimMace = { id: 'pilgrimMace', level: 3, infusion: 'none' };
    advance(s, 0, [{ type: 'equipPhantom', phantom: 'aldric', weapon: 'pilgrimMace' }]);
    const after = phantomNumbers(s, mods, s.squad.phantoms[0]).dps;
    expect(after.gt(before)).toBe(true);
    const ev = advance(s, 0, [{ type: 'equipPhantom', phantom: 'aldric', weapon: 'hollowSword' }]);
    expect(ev.some((x) => x.type === 'error')).toBe(true);
  });
});

describe('hunting', () => {
  it('generates souls at a closed-form rate only on cleared tiers', () => {
    const s = withAldric();
    advance(s, 0, [{ type: 'assignPhantom', phantom: 'aldric', assignment: 'hunt' }]);
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.squad.phantoms);
    expect(r.survivable).toBe(true);
    expect(r.souls.gt(0)).toBe(true);
    const souls0 = s.souls;
    advance(s, 10);
    expect(s.souls.gt(souls0)).toBe(true);
    // roughly rate * time (hunting-only; player is not clicking, auto-attack kills add a little)
    const gained = s.souls.sub(souls0).toNumber();
    expect(gained).toBeGreaterThan(r.souls.toNumber() * 10 * 0.9);
    const ev = advance(s, 0, [{ type: 'setHunt', zone: 'approach', tier: 3, auto: false }]);
    expect(ev.some((x) => x.type === 'error')).toBe(true);
  });
  it('a lone level-1 phantom cannot hold the last tier and retreats without loss', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const r = evaluateHunt(s, mods, s.squad.phantoms, 'approach', 3);
    expect(r.survivable).toBe(false);
    expect(r.souls.toNumber()).toBe(0);
    expect(r.reason).toMatch(/retreat/);
    expect(r.uptime).toBeLessThan(0.25);
    s.zones.approach.cleared = 3;
    advance(s, 0, [{ type: 'assignPhantom', phantom: 'aldric', assignment: 'hunt' }, { type: 'setHunt', zone: 'approach', tier: 3, auto: false }]);
    const souls0 = s.souls;
    advance(s, 3);
    expect(s.souls.gte(souls0)).toBe(true);
    expect(s.squad.phantoms[0].retreat).toBeGreaterThan(0);
  });
  it('auto picks the highest survivable tier', () => {
    const s = withAldric();
    s.zones.approach.cleared = 3;
    s.squad.phantoms[0].level = 30;
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.squad.phantoms);
    expect(r.survivable).toBe(true);
    expect(r.tier).toBeGreaterThanOrEqual(1);
  });
  it('offline uses the squad rate with everyone hunting', () => {
    const s = withAldric();
    const mods = computeMods(s);
    const r = resolveHunt(s, mods, s.squad.phantoms);
    const sum = applyOffline(s, 3600)!;
    expect(sum.souls.toNumber()).toBeCloseTo(Math.floor(r.souls.toNumber() * 3600 * mods.offlineRate), -1);
    expect(sum.souls.gt(0)).toBe(true);
    expect(s.squad.phantoms[0].xp.gt(0)).toBe(true);
  });
});
