import { describe, it, expect } from 'vitest';
import { newGame, advance, step, computeMods, weaponDamage, spawnEnemy, playerAttack, D, type GameState, type GameEvent } from '..';
import { BALANCE } from '@/content/balance';
import { getWeapon } from '@/content';

function withEnemy(seed = 1): GameState {
  const s = newGame(seed);
  advance(s, 1); // spawns
  expect(s.encounter.enemy).not.toBeNull();
  return s;
}

describe('damage formula', () => {
  it('scales with the weapon grade and stat', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    const base = weaponDamage(s, mods).total;
    s.player.stats.mig = 40;
    const strong = weaponDamage(s, mods).total;
    expect(strong.gt(base)).toBe(true);
    // D grade at 40 points: 0.5 * 0.95 = +47.5% from str alone (fin still 10 -> 0.15)
    expect(strong.div(base).toNumber()).toBeCloseTo((1 + 0.5 * 0.95 + 0.5 * 0.3) / (1 + 0.5 * 0.3 + 0.5 * 0.3), 3);
  });
  it('applies reinforcement multiplicatively', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    const base = weaponDamage(s, mods).total;
    s.player.weapons[s.player.weapon].level = 5;
    expect(weaponDamage(s, mods).total.div(base).toNumber()).toBeCloseTo(BALANCE.weapon.reinforceGrowth ** 5, 6);
  });
  it('halves damage when requirements are unmet', () => {
    const s = newGame(1);
    s.player.weapons.pilgrimMace = { id: 'pilgrimMace', level: 0, infusion: 'none' };
    s.player.weapon = 'pilgrimMace';
    s.player.stats.mig = 5;
    const mods = computeMods(s);
    const br = weaponDamage(s, mods);
    expect(br.reqPenalty).toBe(BALANCE.weapon.reqPenalty);
  });
  it('never produces NaN or negative damage', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    for (const k of ['vit', 'bre', 'mig', 'fin', 'ins', 'dev'] as const) s.player.stats[k] = 0;
    const br = weaponDamage(s, mods);
    expect(br.total.gte(0)).toBe(true);
    expect(Number.isFinite(br.total.mantissa)).toBe(true);
  });
});

describe('clicking and stamina', () => {
  it('a click damages the enemy and costs stamina', () => {
    const s = withEnemy();
    const hp0 = s.encounter.enemy!.hp;
    const stam0 = s.player.stamina;
    const ev = advance(s, 0, [{ type: 'click' }]);
    expect(s.encounter.enemy!.hp.lt(hp0)).toBe(true);
    expect(s.player.stamina).toBeLessThan(stam0);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
  });
  it('exhausted attacks deal reduced damage and build no strain', () => {
    const s = withEnemy();
    s.player.stamina = 0;
    s.encounter.enemy!.hp = D(1e9);
    s.encounter.enemy!.hpMax = D(1e9);
    const ev = advance(s, 0, [{ type: 'click' }]);
    expect(ev.some((e) => e.type === 'exhausted')).toBe(true);
    expect(s.encounter.enemy!.strain).toBe(0);
  });
  it('stamina regenerates over time', () => {
    const s = withEnemy();
    s.player.stamina = 0;
    advance(s, 2);
    expect(s.player.stamina).toBeGreaterThan(20);
  });
});

describe('strain and reprisal', () => {
  it('fills the strain meter, opens a reprisal window, and multiplies damage', () => {
    const s = withEnemy();
    const e = s.encounter.enemy!;
    e.hp = D(1e9); e.hpMax = D(1e9);
    e.composure = 5; // one hit staggers
    const ev = advance(s, 0, [{ type: 'click' }]);
    expect(ev.some((x) => x.type === 'strain')).toBe(true);
    expect(e.reprisal).toBeGreaterThan(0);
    const mods = computeMods(s);
    const normal = weaponDamage(s, mods);
    const ev2 = advance(s, 0, [{ type: 'click' }]);
    const hit = ev2.find((x) => x.type === 'hit') as Extract<GameEvent, { type: 'hit' }>;
    expect(hit.reprisal).toBe(true);
    // ±8% variance and possible crit; reprisal is 3x for the starting sword
    expect(hit.dmg.toNumber()).toBeGreaterThan(normal.total.toNumber() * getWeapon(s.player.weapon).reprisalMult * 0.9);
  });
  it('reprisal window expires and reports a miss when unused', () => {
    const s = withEnemy();
    const e = s.encounter.enemy!;
    e.hp = D(1e9); e.hpMax = D(1e9);
    e.composure = 5;
    advance(s, 0, [{ type: 'click' }]);
    const ev = advance(s, BALANCE.player.riposteWindow + 0.2);
    expect(e.reprisal).toBe(0);
    expect(ev.some((x) => x.type === 'riposteMissed')).toBe(true);
  });
});

describe('enemy attacks and dodging', () => {
  it('telegraphs then hits the player', () => {
    const s = withEnemy();
    s.encounter.enemy!.hp = D(1e9);
    const hp0 = s.player.hp;
    const ev = advance(s, 12);
    expect(ev.some((x) => x.type === 'enemyAttack' && !x.dodged)).toBe(true);
    expect(s.player.hp).toBeLessThan(hp0);
  });
  it('a dodge inside the perfect window avoids damage and grants a buff', () => {
    const s = withEnemy();
    const e = s.encounter.enemy!;
    e.hp = D(1e9);
    // shove a telegraph about to land
    e.attackIn = 0; e.windup = 0;
    advance(s, 0.1); // begins telegraph
    expect(e.windup).toBeGreaterThan(0);
    // wait until inside the perfect window
    while (e.windup > BALANCE.player.perfectWindow) advance(s, 0.1);
    const hp0 = s.player.hp;
    const ev = advance(s, 0.5, [{ type: 'dodge' }]);
    const atk = ev.find((x) => x.type === 'enemyAttack') as Extract<GameEvent, { type: 'enemyAttack' }>;
    expect(atk.dodged).toBe(true);
    expect(atk.perfect).toBe(true);
    expect(s.player.hp).toBe(hp0);
    expect(s.player.buffs.some((b) => b.id === 'perfectDodge')).toBe(true);
  });
});

describe('draughts', () => {
  it('heals a fraction of max hp and consumes a flask', () => {
    const s = withEnemy();
    s.player.hp = 10;
    const ev = advance(s, 0, [{ type: 'draughts' }]);
    expect(s.player.draughts).toBe(BALANCE.player.draughtsStart - 1);
    expect(s.player.hp).toBeGreaterThanOrEqual(10 + Math.floor(s.player.hpMax * BALANCE.player.draughtPotency) - 1);
    expect(ev.some((x) => x.type === 'heal')).toBe(true);
  });
  it('resting refills draughts and hp without losing marrow', () => {
    const s = withEnemy();
    s.player.hp = 5; s.player.draughts = 0; s.marrow = D(500);
    advance(s, 0, [{ type: 'retreat' }]);
    expect(s.player.draughts).toBe(s.player.draughtsMax);
    expect(s.player.hp).toBe(s.player.hpMax);
    expect(s.marrow.toNumber()).toBe(500);
  });
});
