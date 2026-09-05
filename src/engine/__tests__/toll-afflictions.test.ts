import { describe, it, expect } from 'vitest';
import { newGame, advance, D, computeMods, tollPhase, tollPhaseAt, tollRemaining, tollUntilBlack, blackShare, advanceToll, applyOffline, hasAffliction, afflictionGains, canToggleAffliction, weaponDamage, type GameState } from '..';
import { TOLL_PHASES, TOLL_CYCLE_SECONDS, AFFLICTIONS, BALANCE } from '@/content';

const BLACK_START = TOLL_PHASES.slice(0, 3).reduce((a, p) => a + p.minutes * 60, 0);

describe('the Toll', () => {
  it('the clock runs with play and cycles through the four phases in order', () => {
    const s = newGame(1);
    expect(tollPhase(s).id).toBe('dawn');
    expect(tollPhaseAt(8 * 60).id).toBe('day');
    expect(tollPhaseAt(22 * 60).id).toBe('dusk');
    expect(tollPhaseAt(34 * 60).id).toBe('black');
    expect(tollPhaseAt(TOLL_CYCLE_SECONDS).id).toBe('dawn');
    advance(s, 60);
    expect(s.toll.t).toBeCloseTo(60, 0);
    expect(tollRemaining(s)).toBeCloseTo(8 * 60 - 60, 0);
    expect(tollUntilBlack(s)).toBeCloseTo(BLACK_START - 60, 0);
  });
  it('a phase change is an event', () => {
    const s = newGame(2);
    s.toll.t = 8 * 60 - 0.05; s.toll.phase = 'dawn';
    const ev = advance(s, 0.1);
    expect(ev.some((e) => e.type === 'tollPhase' && e.phase === 'day')).toBe(true);
  });
  it('each phase tilts the modifiers and the Black Hour makes enemies stronger and richer', () => {
    const s = newGame(3);
    const dawn = computeMods(s);
    expect(dawn.draughtPotency).toBeCloseTo(1.25); expect(dawn.enemyDmg).toBeCloseTo(0.9);
    s.toll.t = BLACK_START + 10;
    const black = computeMods(s);
    expect(black.marrow).toBeCloseTo(1.75); expect(black.enemyHp).toBeCloseTo(1.5); expect(black.enemyDmg).toBeCloseTo(1.5); expect(black.stairPay).toBeCloseTo(1.5);
    expect(black.sources.some((x) => x.name === 'The Toll: The Black Hour')).toBe(true);
  });
  it('the Black Hour is felt in the spawn: more HP, harder hits', () => {
    const day = newGame(4); day.toll.t = 10 * 60; advance(day, 2);
    const black = newGame(4); black.toll.t = BLACK_START + 10; advance(black, 2);
    expect(black.encounter.enemy!.hpMax.toNumber()).toBeGreaterThan(day.encounter.enemy!.hpMax.toNumber() * 1.3);
  });
  it('the creed of the hour has its passive redoubled', () => {
    const s = newGame(5);
    s.creed.current = 'wick'; s.toll.t = 60; // Dawn is the Wickkeepers' hour
    const dawn = computeMods(s);
    s.toll.t = 10 * 60; // Day
    const day = computeMods(s);
    expect(dawn.marrow / day.marrow).toBeCloseTo(1.25 / 1.05); // the gift redoubled at Dawn; Day's own +5% on the other side
    expect(dawn.remainsKeep).toBeCloseTo(day.remainsKeep); // the cost is never redoubled
    s.creed.current = 'legion'; s.toll.t = 10 * 60;
    expect(computeMods(s).dmg).toBeCloseTo(0.85); // the Legion's hour does not square its penalty
  });
  it('time away turns the clock and the Black Hour\'s share of it pays', () => {
    const s = newGame(6);
    s.player.level = 40; s.zones.tollroad = { kills: [20, 20, 20, 20], cleared: 3, bossKills: 1, secretKills: 0, cycleKills: 0, secretFound: false };
    s.cortege.recruited = ['aldric']; s.cortege.shades = [{ id: 'aldric', level: 5, xp: D(0), weapon: null, assignment: 'hunt', hpFrac: 1, actIn: 1, retreat: 0 }]; s.cortege.slots = 1;
    const away = 2 * TOLL_CYCLE_SECONDS; // two full turns of the clock
    const t0 = s.toll.t;
    const share = blackShare(s, away);
    expect(share).toBeCloseTo(6 / 40, 3);
    const sum = applyOffline(s, away)!;
    expect(s.toll.t).toBeCloseTo(t0 + away, 0);
    expect(sum.blackShare).toBeCloseTo(share, 3);
    // a same-length absence with no Black Hour in it pays less
    const u = newGame(6);
    u.player.level = 40; u.zones.tollroad = { kills: [20, 20, 20, 20], cleared: 3, bossKills: 1, secretKills: 0, cycleKills: 0, secretFound: false };
    u.cortege.recruited = ['aldric']; u.cortege.shades = [{ id: 'aldric', level: 5, xp: D(0), weapon: null, assignment: 'hunt', hpFrac: 1, actIn: 1, retreat: 0 }]; u.cortege.slots = 1;
    const sumU = applyOffline(u, 10 * 60)!; // ten minutes of Dawn and Day only
    expect(sumU.blackShare).toBe(0);
    expect(blackShare(u, 10 * 60)).toBe(0);
  });
  it('blackShare walks partial phases correctly', () => {
    const s = newGame(7);
    s.toll.t = BLACK_START - 60; // one minute before the Hour
    expect(blackShare(s, 60)).toBe(0);
    expect(blackShare(s, 120)).toBeCloseTo(0.5, 5);
    expect(blackShare(s, 60 + 6 * 60 + 60)).toBeCloseTo(6 / 8, 5);
    advanceToll(s, 60);
    expect(tollPhase(s).id).toBe('black');
  });
});

describe('afflictions', () => {
  function lorded(): GameState { const s = newGame(11); s.stats.bossKills = 1; advance(s, 0.1); return s; }
  it('offer themselves after the first lord and refuse before', () => {
    const s = newGame(10);
    expect(canToggleAffliction(s, 'thinBlood')).toMatch(/lord/);
    const t = lorded();
    expect(t.flags.afflictionsUnlocked).toBe(true);
    expect(canToggleAffliction(t, 'thinBlood')).toBeNull();
    expect(canToggleAffliction(t, 'nope')).toMatch(/No such/);
  });
  it('toggle on and off; each is a cost and a gain in the modifiers, and they stack', () => {
    const s = lorded();
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'thinBlood' }]);
    expect(hasAffliction(s, 'thinBlood')).toBe(true);
    let m = computeMods(s);
    expect(m.taken).toBeCloseTo(1.4); expect(m.marrow).toBeCloseTo(1.5); // Dawn adds no marrow; the curse alone
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'shortBreath' }, { type: 'toggleAffliction', affliction: 'ironComposure' }]);
    m = computeMods(s);
    expect(m.dmg).toBeCloseTo(1.25); expect(m.stamRegen).toBeCloseTo(0.6); expect(m.enemyComposure).toBeCloseTo(1.6); expect(m.reprisalMult).toBeCloseTo(2.2);
    expect(afflictionGains(s).count).toBe(3);
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'thinBlood' }]);
    expect(hasAffliction(s, 'thinBlood')).toBe(false);
    expect(computeMods(s).taken).toBeCloseTo(1);
  });
  it('the Leak drains held marrow every second', () => {
    const s = lorded();
    s.marrow = D(10000);
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'theLeak' }]);
    advance(s, 1);
    expect(s.marrow.toNumber()).toBeLessThan(10000 * 0.995); expect(s.marrow.toNumber()).toBeGreaterThan(10000 * 0.98);
  });
  it('Brittle Steel halves what reinforcement adds; the Dimmed Lantern puts the reflexes to sleep', () => {
    const s = lorded();
    s.player.weapons.revenantSword.level = 6;
    const full = weaponDamage(s, computeMods(s)).reinforce;
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'brittleSteel' }]);
    const half = weaponDamage(s, computeMods(s)).reinforce;
    expect(half - 1).toBeCloseTo((full - 1) / 2);
    advance(s, 0, [{ type: 'toggleAffliction', affliction: 'dimmedLantern' }]);
    expect(computeMods(s).reflexesSleep).toBe(true);
  });
  it('cannot be changed on the stair', () => {
    const s = lorded();
    s.flags.descentUnlocked = true;
    advance(s, 0, [{ type: 'descend' }]);
    const ev = advance(s, 0, [{ type: 'toggleAffliction', affliction: 'thinBlood' }]);
    expect(ev.some((e) => e.type === 'error' && /stair/.test(e.text))).toBe(true);
  });
  it('every affliction has a cost, a gain and lore', () => {
    for (const a of Object.values(AFFLICTIONS)) { expect(a.cost.length).toBeGreaterThan(8); expect(a.gain.length).toBeGreaterThan(5); expect(a.lore.length).toBeGreaterThan(30); expect(Object.keys(a.fx).length).toBeGreaterThanOrEqual(2); }
    expect(BALANCE.toll.blackSpawnChance).toBeLessThan(1);
  });
});
