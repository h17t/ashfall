import { describe, it, expect } from 'vitest';
import { newGame, advance, D, studyRank, studyKills, studyNext, studyBonus, studyVsMult, studyMeets, recordStudyKill, forgeCost, canReforge, affixPool, setPieces, setTier, playerAffixFx, computeMods, shadeNumbers, serialize, parseSave, type GameState } from '..';
import { AFFIXES, ENEMIES, STUDY_RANKS_ENEMY, STUDY_RANKS_BOSS, STUDY_BONUS, BALANCE } from '@/content';

function smith(seed = 9): GameState {
  const s = newGame(seed);
  s.flags.forgeUnlocked = true; s.stats.bossKills = 1;
  s.marrow = D(1e9); s.materials.coarseSlag = 50; s.materials.fineSlag = 20; s.materials.blackSlag = 10;
  advance(s, 0.1);
  return s;
}

describe('the Study', () => {
  it('ranks by lifetime kills, with lords on a shorter ladder', () => {
    const s = newGame(1);
    expect(studyRank(s, 'ashRat')).toBe(0);
    s.study.ashRat = STUDY_RANKS_ENEMY[0];
    expect(studyRank(s, 'ashRat')).toBe(1);
    s.study.ashRat = STUDY_RANKS_ENEMY[3];
    expect(studyRank(s, 'ashRat')).toBe(4); expect(studyNext(s, 'ashRat')).toBeNull();
    s.study.coldPyreWarden = STUDY_RANKS_BOSS[1];
    expect(studyRank(s, 'coldPyreWarden')).toBe(2); expect(studyNext(s, 'coldPyreWarden')).toBe(STUDY_RANKS_BOSS[2]);
  });
  it('a kill on the road counts, and reaching a rank is an event', () => {
    const s = newGame(2);
    s.study.ashRat = STUDY_RANKS_ENEMY[0] - 1;
    const ev: any[] = [];
    recordStudyKill(s, ev, 'ashRat');
    expect(studyKills(s, 'ashRat')).toBe(STUDY_RANKS_ENEMY[0]);
    expect(ev).toEqual([{ type: 'studyRank', enemy: 'ashRat', rank: 1, isBoss: false }]);
  });
  it('kills made in play are recorded per creature', () => {
    const s = newGame(3);
    s.player.level = 60; s.player.stats.mig = 30; s.automation.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
    advance(s, 60);
    const total = Object.values(s.study).reduce((a, b) => a + b, 0);
    expect(total).toBe(s.stats.kills.toNumber());
    expect(total).toBeGreaterThan(3);
  });
  it('every rank pays a permanent bonus, and studying a creature sharpens you against it', () => {
    const s = newGame(4);
    expect(studyBonus(s).dmg).toBe(0);
    s.study.ashRat = 2000; s.study.coldPyreWarden = 30;
    const b = studyBonus(s);
    expect(b.dmg).toBeCloseTo(4 * STUDY_BONUS.enemy + 4 * STUDY_BONUS.boss);
    expect(computeMods(s).dmg).toBeCloseTo(1 + b.dmg);
    expect(studyVsMult(s, 'ashRat')).toBeCloseTo(1.12);
    expect(studyVsMult(s, 'wanedPilgrim')).toBe(1);
  });
  it('the Study survives Snuffing', () => {
    const s = newGame(5);
    s.study.ashRat = 300;
    s.stats.cycleBosses = 1; s.stats.cycleMarrow = D(1e7); s.prestige.bossesEverKilled = ['coldPyreWarden'];
    advance(s, 0, [{ type: 'snuff' }]);
    expect(s.prestige.wakings).toBe(1);
    expect(s.study.ashRat).toBe(300);
  });
  it('gates: a poisoner at rank 2 opens Venomed, any lord at rank 2 opens Rimed', () => {
    const s = newGame(6);
    expect(affixPool(s)).not.toContain('venomed'); expect(affixPool(s)).not.toContain('rimed');
    expect(studyMeets(s, { kind: 'poisoner', rank: 2 })).toBe(false);
    const poisoner = Object.values(ENEMIES).find((e) => e.attacks.some((a) => a.status === 'poison'))!;
    s.study[poisoner.id] = STUDY_RANKS_ENEMY[1];
    expect(affixPool(s)).toContain('venomed');
    s.study.coldPyreWarden = STUDY_RANKS_BOSS[1];
    expect(affixPool(s)).toContain('rimed');
  });
});

describe('the forge', () => {
  it('is cold until a lord has fallen', () => {
    const s = newGame(7); s.marrow = D(1e9); s.materials.coarseSlag = 9;
    expect(canReforge(s, 'revenantSword')).toMatch(/lord/);
  });
  it('a reforge fills three slots from the pool at a marrow and slag price', () => {
    const s = smith();
    const cost = forgeCost(s, 'revenantSword');
    const marrow = s.marrow, slag = s.materials.coarseSlag;
    const ev = advance(s, 0, [{ type: 'reforge', weapon: 'revenantSword' }]);
    const r = ev.find((e) => e.type === 'reforged') as any;
    expect(r.affixes).toHaveLength(BALANCE.forge.slots);
    expect(new Set(r.affixes.map((a: any) => a.id)).size).toBe(3);
    for (const a of r.affixes) { expect(AFFIXES[a.id]).toBeDefined(); expect([1, 2, 3]).toContain(a.tier); }
    expect(marrow.sub(s.marrow).toNumber()).toBe(cost.marrow.toNumber());
    expect(slag - s.materials.coarseSlag).toBe(cost.material.count);
  });
  it('a locked affix survives the reroll and multiplies the price; at most two lock', () => {
    const s = smith();
    advance(s, 0, [{ type: 'reforge', weapon: 'revenantSword' }]);
    const inst = s.player.weapons.revenantSword;
    const keep = inst.affixes![0];
    const base = forgeCost(s, 'revenantSword').marrow.toNumber();
    advance(s, 0, [{ type: 'lockAffix', weapon: 'revenantSword', affix: keep.id }]);
    expect(forgeCost(s, 'revenantSword').marrow.toNumber()).toBe(Math.floor(base * BALANCE.forge.lockCostMult));
    advance(s, 0, [{ type: 'lockAffix', weapon: 'revenantSword', affix: inst.affixes![1].id }]);
    const ev = advance(s, 0, [{ type: 'lockAffix', weapon: 'revenantSword', affix: inst.affixes![2].id }]);
    expect(ev.some((e) => e.type === 'error' && /At most/.test(e.text))).toBe(true);
    for (let i = 0; i < 5; i++) advance(s, 0, [{ type: 'reforge', weapon: 'revenantSword' }]);
    expect(inst.affixes!.find((a) => a.id === keep.id)).toEqual(keep);
    expect(inst.affixes).toHaveLength(3);
  });
  it('the equipped weapon\'s affixes reach the modifiers, and a shade\'s weapon reaches the shade', () => {
    const s = smith();
    const inst = s.player.weapons.revenantSword;
    inst.affixes = [{ id: 'brutal', tier: 3 }, { id: 'keen', tier: 2 }, { id: 'warding', tier: 1 }];
    const m = computeMods(s);
    expect(m.dmg).toBeCloseTo(1.16); expect(m.critBonus).toBeCloseTo(0.05); expect(m.taken).toBeCloseTo(0.96);
    expect(m.sources.some((x) => x.name.startsWith('Brutal'))).toBe(true);
    s.player.weapons.banditDagger = { id: 'banditDagger', level: 0, infusion: 'none', affixes: [{ id: 'brutal', tier: 1 }, { id: 'swift', tier: 3 }] };
    s.cortege.shades.push({ id: 'aldric', level: 1, xp: D(0), weapon: 'banditDagger', assignment: 'beside', hpFrac: 1, actIn: 1, retreat: 0 });
    const withAff = shadeNumbers(s, m, s.cortege.shades[0]);
    s.player.weapons.banditDagger.affixes = [];
    const bare = shadeNumbers(s, m, s.cortege.shades[0]);
    expect(withAff.dmgPerHit.toNumber() / bare.dmgPerHit.toNumber()).toBeCloseTo(1.06, 2);
    expect(withAff.hitsPerSec / bare.hitsPerSec).toBeCloseTo(1.15, 2);
  });
  it('sets count pieces across your hand and your shades\' and pay at two, four, six', () => {
    const s = smith();
    s.player.weapons.revenantSword.affixes = [{ id: 'brutal', tier: 1 }, { id: 'hungry', tier: 1 }];
    s.player.weapons.banditDagger = { id: 'banditDagger', level: 0, infusion: 'none', affixes: [{ id: 'heavy', tier: 1 }] };
    s.cortege.shades.push({ id: 'aldric', level: 1, xp: D(0), weapon: 'banditDagger', assignment: 'beside', hpFrac: 1, actIn: 1, retreat: 0 });
    const pieces = setPieces(s);
    expect(pieces.mason).toBe(2); expect(pieces.usurer).toBe(1);
    expect(setTier(2)).toBe(1); expect(setTier(4)).toBe(2); expect(setTier(6)).toBe(3); expect(setTier(1)).toBe(0);
    const fx = playerAffixFx(s);
    expect(fx.taken).toBeCloseTo(0.92); // the Mason at two pieces
    expect(fx.sources.some((x) => x.name.startsWith('The Mason'))).toBe(true);
  });
  it('affixes and the Study survive a save round-trip', () => {
    const s = smith();
    advance(s, 0, [{ type: 'reforge', weapon: 'revenantSword' }]);
    s.study.ashRat = 12;
    const t = parseSave(serialize(s, 1));
    expect(t.player.weapons.revenantSword.affixes).toEqual(s.player.weapons.revenantSword.affixes);
    expect(t.study).toEqual({ ashRat: 12 });
  });
});
