import { describe, it, expect } from 'vitest';
import { newGame, advance, step, nextGoal, D, type GameState, type GameEvent } from '..';
import { BALANCE } from '@/content/balance';

function withEnemy(seed = 1): GameState {
  const s = newGame(seed);
  advance(s, 1);
  expect(s.encounter.enemy).not.toBeNull();
  return s;
}

/** advance until a wind-up is in progress, returning the remaining windup */
function untilWindup(s: GameState, max = 30): number {
  for (let t = 0; t < max; t += BALANCE.tick) {
    step(s, BALANCE.tick);
    const e = s.encounter.enemy;
    if (e && e.windup > 0) return e.windup;
  }
  throw new Error('no wind-up came');
}

describe('the fight waits while the player is in a menu', () => {
  it('freezes wind-ups, kills and spawns, but not the world outside the fight', () => {
    const s = withEnemy(3);
    untilWindup(s);
    const w0 = s.encounter.enemy!.windup;
    const hp0 = s.player.hp;
    const kills0 = s.stats.kills.toString();
    s.encounter.held = true;
    const ev = advance(s, 20);
    expect(s.encounter.enemy!.windup).toBe(w0);
    expect(s.player.hp).toBe(hp0);
    expect(s.stats.kills.toString()).toBe(kills0);
    expect(ev.some((e) => e.type === 'enemyAttack' || e.type === 'hit')).toBe(false);
    // the clock of the world still runs
    expect(s.t).toBeGreaterThan(20);
    s.encounter.held = false;
    advance(s, 5);
    expect(s.encounter.enemy === null || s.encounter.enemy.windup !== w0 || s.player.hp !== hp0 || s.stats.kills.toString() !== kills0).toBe(true);
  });
  it('is never loaded as held', async () => {
    const { normalize } = await import('..');
    const s = newGame(1);
    s.encounter.held = true;
    const loaded = normalize(JSON.parse(JSON.stringify(s)));
    expect(loaded.encounter.held).toBe(false);
  });
});

describe('the dodge', () => {
  it('inside the window, the blow misses however early in the window it was pressed', () => {
    const s = withEnemy(5);
    // bring the wind-up to just inside the window
    untilWindup(s);
    const e = s.encounter.enemy!;
    e.windup = BALANCE.player.dodgeWindow - 0.05;
    const hp0 = s.player.hp;
    const ev: GameEvent[] = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeSet' && !x.perfect)).toBe(true);
    const later = advance(s, 1.5);
    const attack = later.find((x) => x.type === 'enemyAttack');
    expect(attack && attack.type === 'enemyAttack' && attack.dodged).toBe(true);
    expect(s.player.hp).toBe(hp0);
  });
  it('the last instant is perfect and buffs damage', () => {
    const s = withEnemy(5);
    untilWindup(s);
    s.encounter.enemy!.windup = BALANCE.player.perfectWindow * 0.5;
    const ev = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeSet' && x.perfect)).toBe(true);
    advance(s, 1);
    expect(s.player.buffs.some((b) => b.id === 'perfectDodge')).toBe(true);
  });
  it('too early says so, costs half, and recovers fast enough to try again', () => {
    const s = withEnemy(5);
    untilWindup(s);
    const e = s.encounter.enemy!;
    e.windup = BALANCE.player.dodgeWindow + 1.0;
    const stam0 = s.player.stamina;
    const ev = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeMiss' && x.reason === 'early')).toBe(true);
    expect(stam0 - s.player.stamina).toBeCloseTo(7, 5);
    expect(s.player.dodgeCd).toBe(BALANCE.player.dodgeCdMiss);
    // wait out the short recovery inside the same wind-up, then dodge for real
    advance(s, BALANCE.player.dodgeCdMiss + BALANCE.tick);
    expect(s.encounter.enemy!.windup).toBeGreaterThan(0);
    s.encounter.enemy!.windup = Math.min(s.encounter.enemy!.windup, BALANCE.player.dodgeWindow - 0.1);
    const hp0 = s.player.hp;
    const ev2 = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev2.some((x) => x.type === 'dodgeSet')).toBe(true);
    advance(s, 1.5);
    expect(s.player.hp).toBe(hp0);
  });
  it('with nothing coming, or winded, or still recovering, it says which', () => {
    const s = withEnemy(5);
    const e = s.encounter.enemy!;
    e.windup = 0; e.attackIn = 5;
    let ev = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeMiss' && x.reason === 'nothing')).toBe(true);
    ev = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeMiss' && x.reason === 'cooldown')).toBe(true);
    s.player.dodgeCd = 0; s.player.stamina = 2;
    ev = step(s, 0, [{ type: 'dodge' }]).events;
    expect(ev.some((x) => x.type === 'dodgeMiss' && x.reason === 'stamina')).toBe(true);
  });
});

describe('what to do now', () => {
  it('walks a new player from the first strike to the first snuff', () => {
    const s = newGame(2);
    expect(nextGoal(s).text).toMatch(/Strike the foe/);
    s.stats.kills = D(1);
    s.marrow = D(1e6);
    expect(nextGoal(s)).toMatchObject({ where: 'lantern', tab: 'rest' });
    s.player.level = 10;
    s.zones.tollroad = { kills: [2, 0, 0, 0], cleared: -1, bossKills: 0, secretKills: 0, cycleKills: 0, secretFound: false };
    expect(nextGoal(s).text).toMatch(/Clear The Ash Slopes: 2 of 6/);
    s.zones.tollroad.cleared = 0;
    expect(nextGoal(s)).toMatchObject({ where: 'lantern', tab: 'road' });
    s.zones.tollroad.cleared = 3; s.encounter.tier = 3;
    expect(nextGoal(s).text).toMatch(/lord waits/);
    s.encounter.tier = -1;
    expect(nextGoal(s).text).toMatch(/The lord/);
    s.zones.tollroad.bossKills = 1; s.stats.cycleBosses = 1; s.stats.cycleMarrow = D(1e6); s.encounter.tier = 3;
    expect(nextGoal(s)).toMatchObject({ where: 'lantern', tab: 'snuff' });
    s.player.hp = s.player.hpMax * 0.2; s.player.draughts = 0;
    expect(nextGoal(s)).toMatchObject({ where: 'lantern', tab: 'rest' });
    expect(nextGoal(s).text).toMatch(/Rest at the Lantern/);
    s.deathScreen = 2;
    expect(nextGoal(s).text).toMatch(/Unmade/);
  });
});
