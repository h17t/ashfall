import { describe, it, expect } from 'vitest';
import { newGame, advance, D, computeMods, canDispatch, missionPreview, advanceMissions, canClaim, claimCost, holdfastRate, advanceHoldfasts, activeRaid, warOrder, underdogBonus, advanceWar, masteryRank, masteryDmgMult, canArt, weaponDamage, applyOffline, activeShades, type GameState } from '..';
import { BALANCE, MASTERY_RANKS, CREEDS, SHADES } from '@/content';
import { affixPool } from '..';

function lord(seed = 3): GameState {
  const s = newGame(seed);
  s.stats.bossKills = 1; s.player.level = 40; s.player.stats.vit = 20; s.player.stats.mig = 20; s.marrow = D(1e7);
  s.zones.tollroad = { kills: [20, 20, 20, 20], cleared: 3, bossKills: 1, secretKills: 0, cycleKills: 0, secretFound: false };
  s.prestige.bossesEverKilled = ['coldPyreWarden'];
  s.cortege.recruited = ['aldric', 'sister']; s.cortege.slots = 2;
  s.cortege.shades = [
    { id: 'aldric', level: 4, xp: D(0), weapon: null, assignment: 'beside', hpFrac: 1, actIn: 1, retreat: 0 },
    { id: Object.keys(SHADES)[1], level: 3, xp: D(0), weapon: null, assignment: 'hunt', hpFrac: 1, actIn: 1, retreat: 0 },
  ];
  advance(s, 0.1);
  for (const ph of s.cortege.shades) { ph.retreat = 0; ph.assignment = 'beside'; }
  return s;
}

describe('Cortege Dispatch', () => {
  it('opens with a second shade; a safe expedition always comes home with pay', () => {
    const s = lord();
    expect(s.flags.dispatchUnlocked).toBe(true);
    const shade = s.cortege.shades[1].id;
    expect(canDispatch(s, shade, 'safe')).toBeNull();
    const pv = missionPreview(s, shade, 'safe');
    expect(pv.marrow.gt(0)).toBe(true); expect(pv.success).toBe(1);
    const ev = advance(s, 0, [{ type: 'dispatch', shade, kind: 'safe' }]);
    expect(ev.some((e) => e.type === 'dispatched')).toBe(true);
    expect(s.cortege.shades[1].assignment).toBe('away');
    expect(activeShades(s, computeMods(s)).map((p) => p.id)).not.toContain(shade);
    const purse = s.marrow;
    const returns = advanceMissions(s, BALANCE.dispatch.kinds.safe.seconds + 1, []);
    expect(returns).toHaveLength(1); expect(returns[0].outcome).toBe('success');
    expect(s.marrow.gt(purse)).toBe(true);
    expect(s.cortege.shades[1].assignment).toBe('beside');
    expect(s.dispatch.missions).toHaveLength(0);
  });
  it('a perilous expedition can lose the shade, and the loss leaves an Echo in the modifiers', () => {
    let lost = false;
    for (let seed = 1; seed < 40 && !lost; seed++) {
      const s = lord(seed);
      const shade = s.cortege.shades[0].id;
      advance(s, 0, [{ type: 'dispatch', shade, kind: 'perilous' }]);
      const r = advanceMissions(s, BALANCE.dispatch.kinds.perilous.seconds + 1, [])[0];
      if (r.outcome === 'lost') {
        lost = true;
        expect(s.cortege.shades.find((p) => p.id === shade)).toBeUndefined();
        expect(s.dispatch.echoes).toContain(shade);
        expect(computeMods(s).sources.some((x) => x.name.startsWith('Echo of'))).toBe(true);
        expect(s.cortege.recruited).toContain(shade); // gone, not forgotten; never re-recruited
      }
    }
    expect(lost).toBe(true);
  });
  it('the mission clock runs while away', () => {
    const s = lord();
    const shade = s.cortege.shades[1].id;
    advance(s, 0, [{ type: 'dispatch', shade, kind: 'safe' }]);
    const sum = applyOffline(s, BALANCE.dispatch.kinds.safe.seconds + 60)!;
    expect(sum.returns).toHaveLength(1);
    expect(s.cortege.shades[1].assignment).toBe('beside');
  });
  it('an away shade cannot be reassigned by hand', () => {
    const s = lord();
    const shade = s.cortege.shades[1].id;
    advance(s, 0, [{ type: 'dispatch', shade, kind: 'safe' }]);
    const ev = advance(s, 0, [{ type: 'assignShade', shade, assignment: 'hunt' }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
  });
});

describe('Holdfasts', () => {
  it('a felled region can be claimed for marrow; it produces, more with a garrison', () => {
    const s = lord();
    expect(canClaim(s, 'mire')).toMatch(/lord/);
    expect(canClaim(s, 'tollroad')).toBeNull();
    s.encounter.enemy = null; s.encounter.respawnIn = 100; // nothing dies during the claim
    const cost = claimCost(s);
    const purse = s.marrow;
    advance(s, 0, [{ type: 'claimHoldfast', zone: 'tollroad' }]);
    expect(s.holdfasts.tollroad).toBeDefined();
    expect(purse.sub(s.marrow).toNumber()).toBe(cost.toNumber());
    const bare = holdfastRate(s, 'tollroad').marrow;
    advance(s, 0, [{ type: 'garrison', shade: 'aldric', zone: 'tollroad' }]);
    expect(s.cortege.shades[0].assignment).toBe('garrison');
    expect(holdfastRate(s, 'tollroad').marrow.toNumber()).toBeCloseTo(bare.toNumber() * 1.5, 3);
    const before = s.marrow;
    advance(s, 60);
    expect(s.marrow.gt(before)).toBe(true);
    advance(s, 0, [{ type: 'garrison', shade: 'aldric', zone: null }]);
    expect(s.cortege.shades[0].assignment).toBe('beside');
  });
  it('a raid opens a window; five kills in the zone repel it for a large reward', () => {
    const s = lord();
    advance(s, 0, [{ type: 'claimHoldfast', zone: 'tollroad' }]);
    s.holdfasts.tollroad.raidIn = 0.05;
    const ev = advance(s, 0.1);
    expect(ev.some((e) => e.type === 'raid' && e.zone === 'tollroad')).toBe(true);
    expect(activeRaid(s)?.zone).toBe('tollroad');
    s.player.hpMax = 1e6; s.player.hp = 1e6; s.automation.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
    let ended: any = null;
    for (let i = 0; i < 1100 && !ended; i++) ended = advance(s, 0.1).find((e) => e.type === 'raidEnded');
    expect(ended).toBeTruthy();
    expect(['repelled', 'held', 'lost']).toContain(ended.outcome);
    if (ended.outcome === 'repelled') expect(ended.marrow.gt(0)).toBe(true);
    expect(s.holdfasts.tollroad.raid).toBeNull();
    expect(s.holdfasts.tollroad.raidIn).toBeGreaterThan(0);
  });
  it('an unanswered raid is decided by the garrison, and a loss only slows the holdfast', () => {
    const s = lord();
    advance(s, 0, [{ type: 'claimHoldfast', zone: 'tollroad' }]);
    s.encounter.zone = 'mire'; s.unlockedZones.push('mire'); // fighting elsewhere: no kills count
    s.holdfasts.tollroad.raidIn = 0.05;
    let ended: any = null;
    for (let i = 0; i < 1400 && !ended; i++) ended = advance(s, 0.1).find((e) => e.type === 'raidEnded');
    expect(ended).toBeTruthy();
    expect(['held', 'lost']).toContain(ended.outcome);
    if (ended.outcome === 'lost') expect(s.holdfasts.tollroad.slowed).toBe(BALANCE.holdfast.slowedSeconds);
    expect(s.holdfasts.tollroad).toBeDefined(); // never taken
  });
  it('produces while away and raids resolve by garrison alone', () => {
    const s = lord();
    advance(s, 0, [{ type: 'claimHoldfast', zone: 'tollroad' }]);
    s.holdfasts.tollroad.raidIn = 100;
    const sum = applyOffline(s, 2 * 3600)!;
    expect(Number(sum.holdfastMarrow)).toBeGreaterThan(0);
    expect(s.holdfasts.tollroad.raids).toBe(1);
    expect(s.holdfasts.tollroad.raid).toBeNull();
  });
  it('a holdfast opens the Gilded affix; Snuffing takes the holdfasts with the cycle', () => {
    const s = lord();
    expect(affixPool(s)).not.toContain('gilded');
    advance(s, 0, [{ type: 'claimHoldfast', zone: 'tollroad' }]);
    expect(affixPool(s)).toContain('gilded');
    s.stats.cycleBosses = 1; s.stats.cycleMarrow = D(1e7);
    advance(s, 0, [{ type: 'snuff' }]);
    expect(Object.keys(s.holdfasts)).toHaveLength(0);
  });
});

describe('the Creed War', () => {
  it('kills count for your creed; the world drifts; the weaker side pays more standing and marrow', () => {
    const s = lord();
    s.creed.current = 'wick'; s.creed.rep = { wick: 1 };
    s.war.standing = { wick: 50, legion: 400, rot: 300, vigil: 200, nadir: 100 };
    expect(warOrder(s)[0]).toBe('legion'); expect(warOrder(s)[4]).toBe('wick');
    const u = underdogBonus(s, 'wick');
    expect(u.rank).toBe(4); expect(u.rep).toBeCloseTo(1.4); expect(u.marrow).toBeCloseTo(1.16);
    expect(computeMods(s).sources.some((x) => /weaker side/.test(x.name))).toBe(true);
    const before = s.war.standing.wick;
    s.player.hpMax = 1e6; s.player.hp = 1e6; s.automation.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
    advance(s, 30);
    expect(s.war.standing.wick).toBeGreaterThan(before);
    expect(s.war.contributed).toBeGreaterThan(0);
    expect(s.war.standing.legion).toBeGreaterThan(400); // the world's hands
  });
  it('a round ends on the clock: the leader holds dominion and lends its gifts to everyone else', () => {
    const s = lord();
    s.creed.current = 'wick';
    s.war.standing = { wick: 10, legion: 500, rot: 20, vigil: 30, nadir: 40 };
    const ev: any[] = [];
    advanceWar(s, BALANCE.war.roundSeconds, ev);
    expect(ev.some((e) => e.type === 'warRound' && e.dominion === 'legion')).toBe(true);
    expect(s.war.dominion).toBe('legion'); expect(s.war.round).toBe(2);
    const m = computeMods(s);
    expect(m.sources.some((x) => x.name.startsWith('Dominion of'))).toBe(true);
    expect(m.phantomRate).toBeGreaterThan(1); // the Legion's gift, at half power
    expect(m.dmg).toBeGreaterThanOrEqual(1); // never its penalty
    expect(CREEDS.legion.passive.dmgMult).toBeLessThan(1);
  });
});

describe('Weapon Mastery', () => {
  it('kills rank the weapon in hand; each rank adds damage with it; the first opens the Art', () => {
    const s = lord();
    const inst = s.player.weapons.revenantSword;
    expect(masteryRank(inst)).toBe(0);
    expect(canArt(s)).toMatch(/opens at/);
    const base = weaponDamage(s, computeMods(s)).total.toNumber();
    inst.mastery = MASTERY_RANKS[1];
    expect(masteryRank(inst)).toBe(2);
    expect(masteryDmgMult(inst)).toBeCloseTo(1.08);
    expect(weaponDamage(s, computeMods(s)).total.toNumber() / base).toBeCloseTo(1.08, 2);
    advance(s, 2);
    expect(canArt(s)).toBeNull();
  });
  it('Reprisal Stance doubles Reprisal hits for six seconds and then rests on its cooldown', () => {
    const s = lord();
    const inst = s.player.weapons.revenantSword; inst.mastery = MASTERY_RANKS[0]; // a hybrid blade
    s.automation.autoAttack = false;
    advance(s, 2);
    const e = s.encounter.enemy!; e.hp = D(1e12); e.hpMax = D(1e12); e.reprisal = 5;
    const plain = advance(s, 0, [{ type: 'click' }]).find((x) => x.type === 'hit') as any;
    s.player.stamina = s.player.staminaMax;
    const ev = advance(s, 0, [{ type: 'art' }]);
    expect(ev.some((x) => x.type === 'art' && x.art === 'stance')).toBe(true);
    expect(s.player.artBuff?.kind).toBe('stance');
    const stanced = advance(s, 0, [{ type: 'click' }]).find((x) => x.type === 'hit') as any;
    expect(stanced.dmg.toNumber() / plain.dmg.toNumber()).toBeGreaterThan(1.6);
    expect(canArt(s)).toMatch(/in \d+s/);
    advance(s, 7);
    expect(s.player.artBuff).toBeNull();
  });
  it('mastery counts kills made on the Stair too', () => {
    const s = lord();
    s.flags.descentUnlocked = true; s.stats.cycleDeepest = 4; s.player.hpMax = 1e6; s.player.hp = 1e6; s.automation.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
    advance(s, 0, [{ type: 'descend' }]);
    for (let i = 0; i < 600 && (s.player.weapons.revenantSword.mastery ?? 0) === 0; i++) advance(s, 0.1, s.descent.run?.offer ? [{ type: 'chooseBoon', index: 0 }] : []);
    expect(s.player.weapons.revenantSword.mastery ?? 0).toBeGreaterThan(0);
  });
});
