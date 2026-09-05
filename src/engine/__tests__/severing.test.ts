import { describe, it, expect } from 'vitest';
import { newGame, advance, D, canSever, threadsPreview, severingUnlockBlocked, canUnmake, computeMods, cortegeSlots, schoolsAvailable } from '..';
import { BALANCE } from '@/content/balance';

function deep(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.prestige.wakings = 6;
  s.prestige.vestigeTotal = D(400);
  s.prestige.vestige = D(30);
  s.prestige.tree = { wickEdge: 5, boneVigor: 4, flameStart: 2 };
  s.creed.rep.wick = 900;
  s.cortege.recruited.push('aldric');
  s.spellsKnown.push('marrowDart');
  return s;
}

describe('the Dark Severing', () => {
  it('opens at Waking 5 and gathers marks from lifetime vestige', () => {
    const s = newGame(1);
    expect(canSever(s)).toMatch(/Sixth Waking/);
    const d = deep();
    expect(canSever(d)).toBeNull();
    expect(threadsPreview(d).gte(1)).toBe(true);
    d.prestige.vestigeTotal = D(4000);
    const more = threadsPreview(d);
    d.prestige.vestigeTotal = D(400);
    expect(more.gt(threadsPreview(d))).toBe(true);
  });
  it('resets vestige, the tree and Waking , keeps marks, standing, spells, shades', () => {
    const s = deep();
    const gain = threadsPreview(s);
    advance(s, 0, [{ type: 'sever' }]);
    expect(s.prestige.severings).toBe(1);
    expect(s.prestige.threads.eq(gain)).toBe(true);
    expect(s.prestige.vestige.toNumber()).toBe(0);
    expect(s.prestige.tree).toEqual({});
    expect(s.prestige.wakings).toBe(0);
    expect(s.player.level).toBe(1);
    expect(s.creed.rep.wick).toBe(900);
    expect(s.spellsKnown).toContain('marrowDart');
    expect(s.cortege.recruited).toContain('aldric');
    advance(s, 1);
    expect(s.encounter.enemy).not.toBeNull();
  });
  it('Deep Roots keeps a fraction of ranks; Familiar Ash starts at Waking n', () => {
    const s = deep();
    s.prestige.threads = D(100);
    advance(s, 0, [{ type: 'buySeveringUnlock', unlock: 'keepTree' }, { type: 'buySeveringUnlock', unlock: 'keepTree' }, { type: 'buySeveringUnlock', unlock: 'startKindles' }]);
    expect(s.prestige.severingUnlocks.keepTree).toBe(2);
    advance(s, 0, [{ type: 'sever' }]);
    expect(s.prestige.tree.wickEdge).toBe(2); // 50% of 5, floored
    expect(s.prestige.tree.boneVigor).toBe(2);
    expect(s.prestige.tree.flameStart).toBe(1);
    expect(s.prestige.wakings).toBe(1);
  });
  it('the Dark Arts grant the chime and hexes every cycle; the Sixth Banner adds a slot', () => {
    const s = deep();
    s.prestige.threads = D(100);
    advance(s, 0, [{ type: 'buySeveringUnlock', unlock: 'hexes' }, { type: 'buySeveringUnlock', unlock: 'sixthBanner' }]);
    advance(s, 0.1);
    expect(schoolsAvailable(s).has('hex')).toBe(true);
    expect(s.player.weapons.nadirChime).toBeDefined();
    expect(s.spellsKnown).toContain('nadirOrb');
    expect(cortegeSlots(s, computeMods(s))).toBe(2);
    advance(s, 0, [{ type: 'sever' }]);
    advance(s, 0.1);
    expect(s.player.weapons.nadirChime).toBeDefined();
    expect(s.spellsKnown).toContain('deadAgain');
  });
  it('the Nadir opens below the Rendering Works only with the mark, and descends on each Watcher kill', () => {
    const s = deep();
    s.prestige.threads = D(100);
    for (const z of ['mire', 'archive', 'sanctum', 'undercroft', 'renderworks']) s.unlockedZones.push(z);
    advance(s, 0, [{ type: 'travel', zone: 'renderworks', tier: 0 }]);
    advance(s, 0.1);
    s.zones.renderworks.cleared = 5;
    s.player.stats.vit = 99; s.player.level = 400;
    advance(s, 0, [{ type: 'travel', zone: 'renderworks', tier: -1 }]);
    advance(s, 0.5);
    s.encounter.enemy!.hp = D(1);
    advance(s, 0, [{ type: 'click' }]);
    expect(s.unlockedZones).not.toContain('nadir');
    advance(s, 0, [{ type: 'buySeveringUnlock', unlock: 'nadir' }]);
    expect(s.unlockedZones).toContain('nadir');
    advance(s, 0, [{ type: 'travel', zone: 'nadir', tier: 0 }]);
    advance(s, 0.1);
    s.zones.nadir.cleared = 4;
    advance(s, 0, [{ type: 'travel', zone: 'nadir', tier: -1 }]);
    advance(s, 0.5);
    expect(s.encounter.enemy?.id).toBe('nadirWatcher');
    const hp1 = s.encounter.enemy!.hpMax;
    s.encounter.enemy!.hp = D(1);
    advance(s, 0, [{ type: 'click' }]);
    expect(s.prestige.nadirDepth).toBe(1);
    expect(s.zones.nadir.cleared).toBe(-1);
    // deeper: the same arena is harder
    s.zones.nadir.cleared = 4;
    advance(s, 0, [{ type: 'travel', zone: 'nadir', tier: -1 }]);
    advance(s, 0.5);
    expect(s.encounter.enemy!.hpMax.gt(hp1)).toBe(true);
  });
  it('the Unmaking begins after three severings and levels with marks', () => {
    const s = deep();
    expect(canUnmake(s)).toMatch(/Severings/);
    s.prestige.severings = 3;
    s.prestige.threads = D(100);
    expect(canUnmake(s)).toBeNull();
    const before = computeMods(s);
    advance(s, 0, [{ type: 'unmake' }]);
    expect(s.prestige.unmaking).toBe(1);
    expect(s.automation.unlocked).toContain('autoSnuff');
    expect(s.automation.unlocked).toContain('autoSever');
    const m = computeMods(s);
    expect(m.dmg / before.dmg).toBeCloseTo(1.5, 6);
    expect(m.marrow / before.marrow).toBeCloseTo(1.5, 6);
    expect(s.prestige.threads.lt(100)).toBe(true);
  });
  it('auto-snuff fires when the gain is worth it', () => {
    const s = deep();
    s.automation.unlocked.push('autoSnuff');
    s.automation.autoSnuff = true;
    s.stats.cycleMarrow = D(5e7);
    s.stats.cycleBosses = 3;
    s.stats.cycleDeepest = 20;
    s.prestige.vestige = D(2);
    s.stats.cycleTime = 30 * 60;
    advance(s, 6);
    expect(s.prestige.wakings).toBe(7);
    // and it will not fire again until the next cycle beats this one
    s.stats.cycleMarrow = D(5e7); s.stats.cycleBosses = 3; s.stats.cycleDeepest = 20; s.stats.cycleTime = 30 * 60;
    advance(s, 6);
    expect(s.prestige.wakings).toBe(7);
  });
});
