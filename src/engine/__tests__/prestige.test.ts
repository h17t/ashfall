import { describe, it, expect } from 'vitest';
import { newGame, advance, D, vestigePreview, canSnuff, nodeCost, nodeBlocked, computeMods, snuffLedger } from '..';
import { TREE } from '@/content';

function readyToKindle(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.stats.cycleMarrow = D(500000);
  s.stats.cycleBosses = 2;
  s.stats.cycleDeepest = 5;
  s.player.level = 40; s.player.stats.mig = 30;
  s.marrow = D(12345);
  s.materials.shard = 9;
  s.player.weapons.pilgrimMace = { id: 'pilgrimMace', level: 5, infusion: 'heavy' };
  s.player.weapon = 'pilgrimMace';
  s.spellsKnown.push('marrowDart');
  s.keepsakeChoices.coldPyreWarden = 'weapon';
  s.prestige.bossesEverKilled.push('coldPyreWarden');
  s.creed.current = 'wick'; s.creed.rep.wick = 200; s.creed.upgrades.wickGreed = 2;
  s.cortege.recruited.push('aldric'); s.cortege.shades.push({ id: 'aldric', level: 12, xp: D(50), weapon: 'revenantSword', assignment: 'hunt', hpFrac: 1, actIn: 1, retreat: 0 });
  s.zones.tollroad.cleared = 3; s.zones.tollroad.bossKills = 1;
  s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
  return s;
}

describe('rendering', () => {
  it('requires a boss kill and a meaningful gain', () => {
    const s = newGame(1);
    expect(canSnuff(s)).toMatch(/lord/);
    s.stats.cycleBosses = 1;
    expect(canSnuff(s)).toMatch(/Too little/);
    s.stats.cycleMarrow = D(500000);
    expect(canSnuff(s)).toBeNull();
  });
  it('vestige grows monotonically with marrow and bosses', () => {
    const s = newGame(1);
    s.stats.cycleMarrow = D(1e5);
    const a = vestigePreview(s);
    s.stats.cycleMarrow = D(1e6);
    const b = vestigePreview(s);
    s.stats.cycleBosses = 3;
    const c = vestigePreview(s);
    expect(b.gt(a)).toBe(true);
    expect(c.gt(b)).toBe(true);
    expect(a.gte(1)).toBe(true);
  });
  it('keeps and loses exactly what the ledger says', () => {
    const s = readyToKindle();
    const gain = vestigePreview(s);
    const ledger = snuffLedger(s);
    expect(ledger.lose.some((l) => /Weapons/.test(l))).toBe(true);
    const ev = advance(s, 0, [{ type: 'snuff' }]);
    expect(ev.some((e) => e.type === 'snuffed')).toBe(true);
    expect(s.prestige.wakings).toBe(1);
    expect(s.prestige.vestige.eq(gain)).toBe(true);
    // lost
    expect(s.marrow.toNumber()).toBe(0);
    expect(s.player.level).toBe(1);
    expect(s.player.weapons.pilgrimMace).toBeUndefined();
    expect(s.player.weapon).toBe('revenantSword');
    expect(s.materials.shard).toBeUndefined();
    expect(s.zones.tollroad?.cleared ?? -1).toBe(-1);
    expect(s.zones.tollroad?.bossKills ?? 0).toBe(0);
    expect(s.creed.upgrades.wickGreed).toBeUndefined();
    expect(s.cortege.shades[0].level).toBe(1);
    // kept
    expect(s.spellsKnown).toContain('marrowDart');
    expect(s.keepsakeChoices.coldPyreWarden).toBe('weapon');
    expect(s.creed.current).toBe('wick');
    expect(s.creed.rep.wick).toBe(200);
    expect(s.cortege.recruited).toContain('aldric');
    expect(s.prestige.bossesEverKilled).toContain('coldPyreWarden');
    expect(s.automation.unlocked).toContain('autoAttack');
    // and the world keeps ticking, harder
    advance(s, 1);
    expect(s.encounter.enemy).not.toBeNull();
    const fresh = newGame(1); advance(fresh, 1);
    expect(s.encounter.enemy!.hpMax.gt(fresh.encounter.enemy!.hpMax)).toBe(true);
  });
  it('remembered keepsake choices return the weapon on the next kill', () => {
    const s = readyToKindle();
    advance(s, 0, [{ type: 'snuff' }]);
    advance(s, 0.1);
    s.zones.tollroad.cleared = 3;
    advance(s, 0, [{ type: 'travel', zone: 'tollroad', tier: -1 }]);
    advance(s, 1);
    s.encounter.enemy!.hp = D(1);
    const ev = advance(s, 0, [{ type: 'click' }]);
    expect(ev.some((e) => e.type === 'bossKilled')).toBe(true);
    expect(s.player.weapons.wardenCleaver).toBeDefined();
    expect(s.keepsakes.coldPyreWarden ?? 0).toBe(0);
  });
});

describe('the vestige tree', () => {
  it('buys nodes with vestige, respects prerequisites and ranks', () => {
    const s = newGame(1);
    s.prestige.vestige = D(3);
    expect(nodeBlocked(s, 'wickMarrow')).toMatch(/Requires/);
    expect(nodeCost(s, 'wickEdge').toNumber()).toBe(1);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'wickEdge' }]);
    expect(s.prestige.tree.wickEdge).toBe(1);
    expect(s.prestige.vestige.toNumber()).toBe(2);
    expect(nodeCost(s, 'wickEdge').toNumber()).toBe(2);
    expect(computeMods(s).dmg).toBeCloseTo(1.1, 6);
    expect(nodeBlocked(s, 'wickMarrow')).toBeNull();
    expect(nodeBlocked(s, 'wickReprisal')).toBeNull();
    s.prestige.vestige = D(0);
    expect(nodeBlocked(s, 'wickEdge')).toMatch(/Vestige/);
  });
  it('automation nodes unlock and enable the feature', () => {
    const s = newGame(1);
    s.prestige.vestige = D(100);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameSouls' }, { type: 'buyTreeNode', node: 'flameAutoLevel' }]);
    expect(s.automation.unlocked).toContain('autoLevel');
    expect(computeMods(s).unlocks.has('autoLevel')).toBe(true);
    s.marrow = D(1e6);
    advance(s, 0.1);
    expect(s.player.level).toBeGreaterThan(1);
  });
  it('start bonuses apply on snuff and the first minutes are faster', () => {
    const s = readyToKindle();
    s.prestige.vestige = D(100);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameWeapon' }, { type: 'buyTreeNode', node: 'flameSouls' }]);
    advance(s, 0, [{ type: 'snuff' }]);
    expect(s.player.level).toBe(11);
    expect(s.marrow.toNumber()).toBe(1000);
    expect(s.player.weapons.revenantSword.level).toBe(1);
  });
  it('every node has lore-free but real text and valid prerequisites', () => {
    for (const n of Object.values(TREE)) {
      expect(n.desc.length).toBeGreaterThan(10);
      for (const r of n.requires) expect(TREE[r]).toBeDefined();
      expect(n.maxRank).toBeGreaterThan(0);
    }
  });
});
