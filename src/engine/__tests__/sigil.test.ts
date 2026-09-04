import { describe, it, expect } from 'vitest';
import { newGame, advance, D, canSigil, sigilMarksPreview, sigilUnlockBlocked, canAgeOfDark, computeMods, squadSlots, schoolsAvailable } from '..';
import { BALANCE } from '@/content/balance';

function deep(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.prestige.kindles = 6;
  s.prestige.humanityTotal = D(400);
  s.prestige.humanity = D(30);
  s.prestige.tree = { emberEdge: 5, boneVigor: 4, flameStart: 2 };
  s.covenant.rep.embers = 900;
  s.squad.recruited.push('aldric');
  s.spellsKnown.push('soulArrow');
  return s;
}

describe('the Dark Sigil', () => {
  it('opens at NG+5 and gathers marks from lifetime humanity', () => {
    const s = newGame(1);
    expect(canSigil(s)).toMatch(/NG\+5/);
    const d = deep();
    expect(canSigil(d)).toBeNull();
    expect(sigilMarksPreview(d).gte(1)).toBe(true);
    d.prestige.humanityTotal = D(4000);
    const more = sigilMarksPreview(d);
    d.prestige.humanityTotal = D(400);
    expect(more.gt(sigilMarksPreview(d))).toBe(true);
  });
  it('resets humanity, the tree and NG+, keeps marks, standing, spells, phantoms', () => {
    const s = deep();
    const gain = sigilMarksPreview(s);
    advance(s, 0, [{ type: 'darkSigil' }]);
    expect(s.prestige.sigils).toBe(1);
    expect(s.prestige.sigilMarks.eq(gain)).toBe(true);
    expect(s.prestige.humanity.toNumber()).toBe(0);
    expect(s.prestige.tree).toEqual({});
    expect(s.prestige.kindles).toBe(0);
    expect(s.player.level).toBe(1);
    expect(s.covenant.rep.embers).toBe(900);
    expect(s.spellsKnown).toContain('soulArrow');
    expect(s.squad.recruited).toContain('aldric');
    advance(s, 1);
    expect(s.encounter.enemy).not.toBeNull();
  });
  it('Deep Roots keeps a fraction of ranks; Familiar Ash starts at NG+n', () => {
    const s = deep();
    s.prestige.sigilMarks = D(100);
    advance(s, 0, [{ type: 'buySigilUnlock', unlock: 'keepTree' }, { type: 'buySigilUnlock', unlock: 'keepTree' }, { type: 'buySigilUnlock', unlock: 'startKindles' }]);
    expect(s.prestige.sigilUnlocks.keepTree).toBe(2);
    advance(s, 0, [{ type: 'darkSigil' }]);
    expect(s.prestige.tree.emberEdge).toBe(2); // 50% of 5, floored
    expect(s.prestige.tree.boneVigor).toBe(2);
    expect(s.prestige.tree.flameStart).toBe(1);
    expect(s.prestige.kindles).toBe(1);
  });
  it('the Dark Arts grant the chime and hexes every cycle; the Sixth Banner adds a slot', () => {
    const s = deep();
    s.prestige.sigilMarks = D(100);
    advance(s, 0, [{ type: 'buySigilUnlock', unlock: 'hexes' }, { type: 'buySigilUnlock', unlock: 'sixthBanner' }]);
    advance(s, 0.1);
    expect(schoolsAvailable(s).has('hex')).toBe(true);
    expect(s.player.weapons.abyssalChime).toBeDefined();
    expect(s.spellsKnown).toContain('darkOrb');
    expect(squadSlots(s, computeMods(s))).toBe(2);
    advance(s, 0, [{ type: 'darkSigil' }]);
    advance(s, 0.1);
    expect(s.player.weapons.abyssalChime).toBeDefined();
    expect(s.spellsKnown).toContain('deadAgain');
  });
  it('the Abyss opens below the Kiln only with the mark, and descends on each Watcher kill', () => {
    const s = deep();
    s.prestige.sigilMarks = D(100);
    for (const z of ['mire', 'archive', 'sanctum', 'deep', 'kiln']) s.unlockedZones.push(z);
    advance(s, 0, [{ type: 'travel', zone: 'kiln', tier: 0 }]);
    advance(s, 0.1);
    s.zones.kiln.cleared = 5;
    s.player.stats.vig = 99; s.player.level = 400;
    advance(s, 0, [{ type: 'travel', zone: 'kiln', tier: -1 }]);
    advance(s, 0.5);
    s.encounter.enemy!.hp = D(1);
    advance(s, 0, [{ type: 'click' }]);
    expect(s.unlockedZones).not.toContain('abyss');
    advance(s, 0, [{ type: 'buySigilUnlock', unlock: 'abyss' }]);
    expect(s.unlockedZones).toContain('abyss');
    advance(s, 0, [{ type: 'travel', zone: 'abyss', tier: 0 }]);
    advance(s, 0.1);
    s.zones.abyss.cleared = 4;
    advance(s, 0, [{ type: 'travel', zone: 'abyss', tier: -1 }]);
    advance(s, 0.5);
    expect(s.encounter.enemy?.id).toBe('abyssWatcher');
    const hp1 = s.encounter.enemy!.hpMax;
    s.encounter.enemy!.hp = D(1);
    advance(s, 0, [{ type: 'click' }]);
    expect(s.prestige.abyssDepth).toBe(1);
    expect(s.zones.abyss.cleared).toBe(-1);
    // deeper: the same arena is harder
    s.zones.abyss.cleared = 4;
    advance(s, 0, [{ type: 'travel', zone: 'abyss', tier: -1 }]);
    advance(s, 0.5);
    expect(s.encounter.enemy!.hpMax.gt(hp1)).toBe(true);
  });
  it('the Age of Dark begins after three sigils and levels with marks', () => {
    const s = deep();
    expect(canAgeOfDark(s)).toMatch(/Sigils/);
    s.prestige.sigils = 3;
    s.prestige.sigilMarks = D(100);
    expect(canAgeOfDark(s)).toBeNull();
    const before = computeMods(s);
    advance(s, 0, [{ type: 'ageOfDark' }]);
    expect(s.prestige.darkLevel).toBe(1);
    expect(s.automation.unlocked).toContain('autoKindle');
    expect(s.automation.unlocked).toContain('autoSigil');
    const m = computeMods(s);
    expect(m.dmg / before.dmg).toBeCloseTo(1.5, 6);
    expect(m.souls / before.souls).toBeCloseTo(1.5, 6);
    expect(s.prestige.sigilMarks.lt(100)).toBe(true);
  });
  it('auto-kindle fires when the gain is worth it', () => {
    const s = deep();
    s.automation.unlocked.push('autoKindle');
    s.automation.autoKindle = true;
    s.stats.cycleSouls = D(5e7);
    s.stats.cycleBosses = 3;
    s.stats.cycleDeepest = 20;
    s.prestige.humanity = D(2);
    s.stats.cycleTime = 30 * 60;
    advance(s, 6);
    expect(s.prestige.kindles).toBe(7);
    // and it will not fire again until the next cycle beats this one
    s.stats.cycleSouls = D(5e7); s.stats.cycleBosses = 3; s.stats.cycleDeepest = 20; s.stats.cycleTime = 30 * 60;
    advance(s, 6);
    expect(s.prestige.kindles).toBe(7);
  });
});
