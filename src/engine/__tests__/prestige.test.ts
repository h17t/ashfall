import { describe, it, expect } from 'vitest';
import { newGame, advance, D, humanityPreview, canKindle, nodeCost, nodeBlocked, computeMods, kindleLedger } from '..';
import { TREE } from '@/content';

function readyToKindle(seed = 1) {
  const s = newGame(seed);
  advance(s, 0.1);
  s.stats.cycleSouls = D(500000);
  s.stats.cycleBosses = 2;
  s.stats.cycleDeepest = 5;
  s.player.level = 40; s.player.stats.str = 30;
  s.souls = D(12345);
  s.materials.shard = 9;
  s.player.weapons.pilgrimMace = { id: 'pilgrimMace', level: 5, infusion: 'heavy' };
  s.player.weapon = 'pilgrimMace';
  s.spellsKnown.push('soulArrow');
  s.bossSoulChoices.coldPyreWarden = 'weapon';
  s.prestige.bossesEverKilled.push('coldPyreWarden');
  s.covenant.current = 'embers'; s.covenant.rep.embers = 200; s.covenant.upgrades.emberGreed = 2;
  s.squad.recruited.push('aldric'); s.squad.phantoms.push({ id: 'aldric', level: 12, xp: D(50), weapon: 'hollowSword', assignment: 'hunt', hpFrac: 1, actIn: 1, retreat: 0 });
  s.zones.approach.cleared = 3; s.zones.approach.bossKills = 1;
  s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
  return s;
}

describe('kindling', () => {
  it('requires a boss kill and a meaningful gain', () => {
    const s = newGame(1);
    expect(canKindle(s)).toMatch(/lord/);
    s.stats.cycleBosses = 1;
    expect(canKindle(s)).toMatch(/Too little/);
    s.stats.cycleSouls = D(500000);
    expect(canKindle(s)).toBeNull();
  });
  it('humanity grows monotonically with souls and bosses', () => {
    const s = newGame(1);
    s.stats.cycleSouls = D(1e5);
    const a = humanityPreview(s);
    s.stats.cycleSouls = D(1e6);
    const b = humanityPreview(s);
    s.stats.cycleBosses = 3;
    const c = humanityPreview(s);
    expect(b.gt(a)).toBe(true);
    expect(c.gt(b)).toBe(true);
    expect(a.gte(1)).toBe(true);
  });
  it('keeps and loses exactly what the ledger says', () => {
    const s = readyToKindle();
    const gain = humanityPreview(s);
    const ledger = kindleLedger(s);
    expect(ledger.lose.some((l) => /Weapons/.test(l))).toBe(true);
    const ev = advance(s, 0, [{ type: 'kindle' }]);
    expect(ev.some((e) => e.type === 'kindled')).toBe(true);
    expect(s.prestige.kindles).toBe(1);
    expect(s.prestige.humanity.eq(gain)).toBe(true);
    // lost
    expect(s.souls.toNumber()).toBe(0);
    expect(s.player.level).toBe(1);
    expect(s.player.weapons.pilgrimMace).toBeUndefined();
    expect(s.player.weapon).toBe('hollowSword');
    expect(s.materials.shard).toBeUndefined();
    expect(s.zones.approach?.cleared ?? -1).toBe(-1);
    expect(s.zones.approach?.bossKills ?? 0).toBe(0);
    expect(s.covenant.upgrades.emberGreed).toBeUndefined();
    expect(s.squad.phantoms[0].level).toBe(1);
    // kept
    expect(s.spellsKnown).toContain('soulArrow');
    expect(s.bossSoulChoices.coldPyreWarden).toBe('weapon');
    expect(s.covenant.current).toBe('embers');
    expect(s.covenant.rep.embers).toBe(200);
    expect(s.squad.recruited).toContain('aldric');
    expect(s.prestige.bossesEverKilled).toContain('coldPyreWarden');
    expect(s.automation.unlocked).toContain('autoAttack');
    // and the world keeps ticking, harder
    advance(s, 1);
    expect(s.encounter.enemy).not.toBeNull();
    const fresh = newGame(1); advance(fresh, 1);
    expect(s.encounter.enemy!.hpMax.gt(fresh.encounter.enemy!.hpMax)).toBe(true);
  });
  it('remembered boss soul choices return the weapon on the next kill', () => {
    const s = readyToKindle();
    advance(s, 0, [{ type: 'kindle' }]);
    advance(s, 0.1);
    s.zones.approach.cleared = 3;
    advance(s, 0, [{ type: 'travel', zone: 'approach', tier: -1 }]);
    advance(s, 1);
    s.encounter.enemy!.hp = D(1);
    const ev = advance(s, 0, [{ type: 'click' }]);
    expect(ev.some((e) => e.type === 'bossKilled')).toBe(true);
    expect(s.player.weapons.wardenCleaver).toBeDefined();
    expect(s.bossSouls.coldPyreWarden ?? 0).toBe(0);
  });
});

describe('the humanity tree', () => {
  it('buys nodes with humanity, respects prerequisites and ranks', () => {
    const s = newGame(1);
    s.prestige.humanity = D(3);
    expect(nodeBlocked(s, 'emberSouls')).toMatch(/Requires/);
    expect(nodeCost(s, 'emberEdge').toNumber()).toBe(1);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'emberEdge' }]);
    expect(s.prestige.tree.emberEdge).toBe(1);
    expect(s.prestige.humanity.toNumber()).toBe(2);
    expect(nodeCost(s, 'emberEdge').toNumber()).toBe(2);
    expect(computeMods(s).dmg).toBeCloseTo(1.1, 6);
    expect(nodeBlocked(s, 'emberSouls')).toBeNull();
    expect(nodeBlocked(s, 'emberRiposte')).toBeNull();
    s.prestige.humanity = D(0);
    expect(nodeBlocked(s, 'emberEdge')).toMatch(/Humanity/);
  });
  it('automation nodes unlock and enable the feature', () => {
    const s = newGame(1);
    s.prestige.humanity = D(100);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameSouls' }, { type: 'buyTreeNode', node: 'flameAutoLevel' }]);
    expect(s.automation.unlocked).toContain('autoLevel');
    expect(computeMods(s).unlocks.has('autoLevel')).toBe(true);
    s.souls = D(1e6);
    advance(s, 0.1);
    expect(s.player.level).toBeGreaterThan(1);
  });
  it('start bonuses apply on kindle and the first minutes are faster', () => {
    const s = readyToKindle();
    s.prestige.humanity = D(100);
    advance(s, 0, [{ type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameStart' }, { type: 'buyTreeNode', node: 'flameWeapon' }, { type: 'buyTreeNode', node: 'flameSouls' }]);
    advance(s, 0, [{ type: 'kindle' }]);
    expect(s.player.level).toBe(11);
    expect(s.souls.toNumber()).toBe(1000);
    expect(s.player.weapons.hollowSword.level).toBe(1);
  });
  it('every node has lore-free but real text and valid prerequisites', () => {
    for (const n of Object.values(TREE)) {
      expect(n.desc.length).toBeGreaterThan(10);
      for (const r of n.requires) expect(TREE[r]).toBeDefined();
      expect(n.maxRank).toBeGreaterThan(0);
    }
  });
});
