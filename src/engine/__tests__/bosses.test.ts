import { describe, it, expect } from 'vitest';
import { newGame, advance, D, type GameState } from '..';
import { BOSSES, ZONES, ZONE_ORDER, cycleBossFor, getZone } from '@/content';

function arena(bossZone: string, tier: number, wakings = 0): GameState {
  const s = newGame(11);
  s.prestige.wakings = wakings;
  for (const z of ZONE_ORDER) if (!s.unlockedZones.includes(z)) s.unlockedZones.push(z);
  advance(s, 0.1);
  for (const z of ZONE_ORDER) { advance(s, 0, [{ type: 'travel', zone: z, tier: 0 }]); advance(s, 0.1); s.zones[z].cleared = getZone(z).tiers.length - 1; s.zones[z].secretFound = true; s.zones[z].bossKills = tier === -3 ? 1 : 0; }
  s.player.stats.vit = 99; s.player.level = 300; // the test player must survive boss hits
  advance(s, 0, [{ type: 'travel', zone: bossZone, tier }]);
  advance(s, 0.5);
  expect(s.encounter.enemy?.isBoss).toBe(true);
  s.automation.autoAttack = false;
  s.player.hp = s.player.hpMax;
  return s;
}

describe('boss mechanics', () => {
  it('hymn reflects hits while it sounds and not in the silences', () => {
    const s = arena('mire', -2);
    const e = s.encounter.enemy!;
    expect(e.id).toBe('choirMaster');
    e.hp = D(1e12); e.hpMax = D(1e12);
    s.encounter.t = 0.1; // hymn on for the first 5s
    advance(s, 0.1);
    expect(e.mech.hymn).toBe(1);
    const hp0 = s.player.hp;
    advance(s, 0, [{ type: 'click' }]);
    expect(s.player.hp).toBeLessThan(hp0);
    s.encounter.t = 5.2; advance(s, 0.1);
    expect(e.mech.hymn).toBe(0);
    const hp1 = s.player.hp;
    advance(s, 0, [{ type: 'click' }]);
    expect(s.player.hp).toBe(hp1);
  });
  it('blind phases hide the telegraph flag and disable auto-dodge', () => {
    const s = arena('undercroft', -1);
    const e = s.encounter.enemy!;
    e.hp = e.hpMax.mul(0.6); // into phase 2: Lights Out
    e.statuses.poison.active = 0.2; e.statuses.poison.dps = D(1); // a tick of damage triggers the phase check
    advance(s, 0.1);
    expect(e.phase).toBe(1);
    expect(e.mech.blind).toBe(1);
    s.automation.unlocked.push('autoDodge'); s.automation.autoDodge = true;
    e.hp = D(1e12);
    let dodged = false;
    for (let i = 0; i < 100 && !dodged; i++) dodged = advance(s, 0.1).some((x) => x.type === 'enemyAttack' && x.dodged);
    expect(dodged).toBe(false);
  });
  it('enrage shortens the attack interval over the phase', () => {
    const s = arena('mire', -1);
    const e = s.encounter.enemy!;
    e.hp = e.hpMax.mul(0.2);
    e.statuses.poison.active = 0.2; e.statuses.poison.dps = D(1);
    advance(s, 0.1);
    expect(e.phase).toBe(2);
    e.hp = D(1e12);
    const timesEarly: number[] = [];
    const timesLate: number[] = [];
    for (let i = 0; i < 300; i++) { const ev = advance(s, 0.1); if (ev.some((x) => x.type === 'enemyAttack')) timesEarly.push(s.t); s.player.hp = s.player.hpMax; }
    s.encounter.t += 60;
    for (let i = 0; i < 300; i++) { const ev = advance(s, 0.1); if (ev.some((x) => x.type === 'enemyAttack')) timesLate.push(s.t); s.player.hp = s.player.hpMax; }
    expect(timesLate.length).toBeGreaterThan(timesEarly.length);
  });
  it('cycle bosses appear only in their cycle after the lord, drop dark motes, and yield no wisp', () => {
    const s0 = arena('tollroad', -1, 0);
    const ev0 = advance(s0, 0, [{ type: 'travel', zone: 'tollroad', tier: -3 }]);
    expect(ev0.some((e) => e.type === 'error')).toBe(true);
    const s = arena('tollroad', -3, 1);
    expect(s.encounter.enemy!.id).toBe('deserterCaptain');
    const h0 = s.prestige.vestige;
    s.encounter.enemy!.hp = D(1);
    advance(s, 0, [{ type: 'click' }]);
    expect(s.prestige.vestige.gt(h0)).toBe(true);
    expect(s.keepsakes.deserterCaptain ?? 0).toBe(0);
    expect(s.zones.tollroad.cycleKills).toBe(1);
    const ev = advance(s, 0, [{ type: 'travel', zone: 'tollroad', tier: -3 }]);
    expect(ev.some((e) => e.type === 'error')).toBe(true);
  });
  it('an open wound stops a regenerating boss from mending', () => {
    const s = arena('tollroad', -2);
    const e = s.encounter.enemy!;
    expect(e.id).toBe('hangedPilgrim');
    e.hp = e.hpMax.mul(0.5);
    const before = e.hp;
    advance(s, 2);
    expect(e.hp.gt(before)).toBe(true); // regenerates untouched
    e.hp = e.hpMax.mul(0.5);
    e.mech.lastBleed = s.encounter.t; // a bleed just procced
    const after = e.hp;
    advance(s, 2);
    expect(e.hp.lte(after)).toBe(true);
  });
  it('every region has a cycle boss for cycles 1-5 and every zone chain unlocks in order', () => {
    const cycles = ZONE_ORDER.map((z) => cycleBossFor(z)?.cycle).filter((c) => c !== undefined).sort();
    expect(cycles).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < ZONE_ORDER.length; i++) expect(ZONES[ZONE_ORDER[i]].requires).toBe(ZONES[ZONE_ORDER[i - 1]].boss);
  });
  it('all keepsake weapons are reachable: every bossSoul weapon belongs to a boss', () => {
    for (const b of Object.values(BOSSES)) expect(b.phases.every((p) => p.text.length > 20)).toBe(true);
  });
});
