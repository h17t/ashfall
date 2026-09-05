import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseSave, serialize, checksum } from '../save';
import { newGame, SAVE_VERSION } from '../state';
import { D } from '../num';

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8');
const fixtureV2 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v2.json'), 'utf8');
const fixtureV3 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v3.json'), 'utf8');
const fixtureV4 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v4.json'), 'utf8');
const fixtureV5 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v5.json'), 'utf8');

describe('save migration v1 → v2 (the rename)', () => {
  it('loads the pre-rename fixture and every value survives under its new key', () => {
    const s = parseSave(fixture);
    expect(s.version).toBe(SAVE_VERSION);
    // currency and progress
    expect(s.marrow.toNumber()).toBeCloseTo(122592.83, 1);
    expect(s.player.level).toBe(10);
    expect(s.player.stats).toEqual({ vit: 13, bre: 10, mig: 13, fin: 13, ins: 8, dev: 8 });
    expect(s.player.draughts).toBe(2); expect(s.player.draughtsMax).toBe(3); expect(s.player.draughtPotency).toBeCloseTo(0.48);
    expect(s.player.brandLevel).toBe(2);
    expect(s.player.weapon).toBe('revenantSword');
    expect(Object.keys(s.player.weapons).sort()).toEqual(['banditDagger', 'revenantSword']);
    expect(s.player.weapons.revenantSword.id).toBe('revenantSword');
    expect(s.player.weapons.revenantSword.level).toBe(0);
    expect(s.materials).toMatchObject({ coarseSlag: 7, fineSlag: 2, wickStub: 1, renderFat: 1, reliquaryBone: 1, pitchCoal: 2 });
    expect(s.cortege.matAcc).toEqual({ coarseSlag: 0.014 });
    expect(s.spellsKnown).toEqual(['marrowDart']);
    expect(s.player.recited).toEqual(['marrowDart']); expect(s.player.recitationSlots).toBe(1);
    // world
    expect(s.encounter.zone).toBe('tollroad');
    expect(s.zones.tollroad.cleared).toBe(3); expect(s.zones.tollroad.bossKills).toBe(1); expect(s.zones.tollroad.kills).toEqual([7, 8, 10, 12]);
    expect(s.unlockedZones).toEqual(['tollroad', 'mire']); expect(s.lanternsLit).toEqual(['tollroad', 'mire']); expect(s.lantern).toBe('tollroad');
    expect(s.keepsakes).toEqual({ coldPyreWarden: 1 }); expect(s.keepsakeChoices).toEqual({ mireMother: 'weapon' });
    expect(s.remains?.marrow.toNumber()).toBe(999); expect(s.remains?.zone).toBe('tollroad'); expect(s.remainsRun?.targetTier).toBe(2);
    // cortege and creed
    expect(s.cortege.recruited).toEqual(['aldric']); expect(s.cortege.shades[0].id).toBe('aldric'); expect(s.cortege.shades[0].level).toBe(3); expect(s.cortege.shades[0].xp.toNumber()).toBeCloseTo(41.36, 1);
    expect(s.creed.current).toBe('wick'); expect(s.creed.rep).toEqual({ wick: 13 }); expect(s.creed.upgrades).toEqual({ wickGreed: 1 });
    // prestige
    expect(s.prestige.wakings).toBe(2); expect(s.prestige.vestige.toNumber()).toBe(14); expect(s.prestige.vestigeTotal.toNumber()).toBe(30);
    expect(s.prestige.tree).toEqual({ wickEdge: 5, boneVigor: 2 });
    expect(s.prestige.severings).toBe(1); expect(s.prestige.threads.toNumber()).toBe(4); expect(s.prestige.unmaking).toBe(1); expect(s.prestige.unmakingDust.toNumber()).toBe(3);
    expect(s.prestige.bossesEverKilled).toEqual(['coldPyreWarden', 'mireMother']);
    // automation and stats
    expect(s.automation.autoAttack).toBe(true); expect(s.automation.autoDraught).toBe(true); expect(s.automation.autoSnuff).toBe(true); expect(s.automation.autoLevelStat).toBe('mig');
    expect(s.stats.kills.toNumber()).toBe(321); expect(s.stats.marrowEarned.toNumber()).toBeCloseTo(555560.83, 1); expect(s.stats.deaths).toBe(4);
    expect(s.flags.infusionUnlocked).toBe(true);
    // no key of the old vocabulary survives anywhere in the migrated object
    const json = JSON.stringify(s);
    // banned-terms: allow
    for (const old of ['"souls"', '"bonfire"', '"estus', '"humanity', '"kindles"', '"sigil', '"covenant"', '"squad"', '"phantoms"', '"attuned"', '"poise"', '"stagger"', '"riposte"', '"bloodstain"', '"vig"', '"str"', 'hollowSword', 'soulArrow', 'titanite']) expect(json, old).not.toContain(old); // banned-terms: allow
  });

  it('round-trips through the current serializer and stays at the current version', () => {
    const s = parseSave(fixture);
    const again = parseSave(serialize(s, 1));
    expect(again.version).toBe(SAVE_VERSION);
    expect(again.marrow.toString()).toBe(s.marrow.toString());
    expect(again.player.stats).toEqual(s.player.stats);
    expect(again.prestige.tree).toEqual(s.prestige.tree);
  });

  it('a fresh save round-trips exactly', () => {
    const s = newGame(7); s.marrow = D(12345);
    const t = parseSave(serialize(s, 1));
    expect(t.marrow.toNumber()).toBe(12345); expect(t.version).toBe(SAVE_VERSION);
  });
});

describe('save migration v2 → v3 (the Stair)', () => {
  it('loads a v2 save made by a 50-minute greedy playthrough and every value survives', () => {
    const raw = JSON.parse(fixtureV2);
    expect(raw.v).toBe(2);
    const s = parseSave(fixtureV2);
    expect(s.version).toBe(SAVE_VERSION);
    const before = raw.state;
    expect(s.player.level).toBe(before.player.level);
    expect(s.player.stats).toEqual(before.player.stats);
    expect(s.marrow.toString()).toBe(before.marrow.replace('§D§', ''));
    expect(s.stats.kills.toString()).toBe(before.stats.kills.replace('§D§', ''));
    expect(s.stats.bossKills).toBe(before.stats.bossKills);
    expect(s.unlockedZones).toEqual(before.unlockedZones);
    expect(Object.keys(s.player.weapons).sort()).toEqual(Object.keys(before.player.weapons).sort());
    expect(s.cortege.shades.map((p) => p.id)).toEqual(before.cortege.shades.map((p: any) => p.id));
    expect(s.creed.current).toBe(before.creed.current);
    expect(s.prestige.bossesEverKilled).toEqual(before.prestige.bossesEverKilled);
    expect(s.materials).toEqual(before.materials);
    // the new field arrives with its defaults
    expect(s.descent).toEqual({ run: null, runs: 0, bestFloor: 0, bankedTotal: D(0), last: null });
    expect(s.descent.bankedTotal.toNumber()).toBe(0);
    // and every scalar of the old state is still there, untouched
    const walk = (a: any, b: any, at: string) => {
      if (a && typeof a === 'object' && !Array.isArray(a) && !('mantissa' in a)) { for (const k of Object.keys(a)) walk(a[k], b?.[k], at + '.' + k); return; }
      if (typeof a === 'string' && a.startsWith('§D§')) { expect(String(b), at).toBe(a.slice(3)); return; }
      if (Array.isArray(a)) { expect(JSON.stringify(b), at).toBe(JSON.stringify(a).replace(/§D§/g, '')); return; }
      expect(b, at).toEqual(a);
    };
    walk({ ...before, version: undefined }, { ...JSON.parse(JSON.stringify(s)), version: undefined }, 'state');
  });
});

/** Every scalar of the old state is still there, untouched, under the same path. */
function everyScalarSurvives(before: any, after: any) {
  const walk = (a: any, b: any, at: string) => {
    if (a && typeof a === 'object' && !Array.isArray(a) && !('mantissa' in a)) { for (const k of Object.keys(a)) walk(a[k], b?.[k], at + '.' + k); return; }
    if (typeof a === 'string' && a.startsWith('§D§')) { expect(String(b), at).toBe(a.slice(3)); return; }
    if (Array.isArray(a)) { expect(JSON.stringify(b), at).toBe(JSON.stringify(a).replace(/§D§/g, '')); return; }
    expect(b, at).toEqual(a);
  };
  walk({ ...before, version: undefined }, { ...JSON.parse(JSON.stringify(after)), version: undefined }, 'state');
}

describe('save migration v3 → v4 (Standing Orders)', () => {
  it('loads a v3 save made by a 70-minute playthrough with the Stair, and every value survives', () => {
    const raw = JSON.parse(fixtureV3);
    expect(raw.v).toBe(3);
    const s = parseSave(fixtureV3);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.descent.runs).toBe(raw.state.descent.runs);
    expect(s.descent.bestFloor).toBe(raw.state.descent.bestFloor);
    expect(s.descent.bankedTotal.toString()).toBe(raw.state.descent.bankedTotal.replace('§D§', ''));
    expect(s.orders).toEqual({ rules: [], nextId: 1 });
    everyScalarSurvives(raw.state, s);
  });
  it('every fixture from every version loads to the current version', () => {
    for (const f of [fixture, fixtureV2, fixtureV3, fixtureV4, fixtureV5]) expect(parseSave(f).version).toBe(SAVE_VERSION);
  });
});

describe('save migration v4 → v5 (the Study and the forge)', () => {
  it('loads a v4 save made by an 80-minute authored playthrough; weapons gain empty affix lists, the Study starts empty', () => {
    const raw = JSON.parse(fixtureV4);
    expect(raw.v).toBe(4);
    const s = parseSave(fixtureV4);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.orders.rules.length).toBe(raw.state.orders.rules.length);
    for (const w of Object.values(s.player.weapons)) { expect(w.affixes).toEqual([]); expect(w.locked).toEqual([]); }
    expect(s.study).toEqual({});
    everyScalarSurvives(raw.state, s);
  });
});

describe('save migration v5 → v6 (afflictions and the Toll)', () => {
  it('loads a v5 save made by a 90-minute greedy playthrough; no curses, the clock at Dawn', () => {
    const raw = JSON.parse(fixtureV5);
    expect(raw.v).toBe(5);
    const s = parseSave(fixtureV5);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.afflictions).toEqual([]);
    expect(s.toll).toEqual({ t: 0, phase: 'dawn' });
    expect(Object.keys(s.study).length).toBe(Object.keys(raw.state.study).length);
    everyScalarSurvives(raw.state, s);
  });
});

describe('save corruption (fuzz)', () => {
  it('random byte damage is rejected with a SaveError, never a crash or a silent wipe', () => {
    const good = serialize(newGame(3), 1);
    let rejected = 0, accepted = 0;
    let seed = 99;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 300; i++) {
      const chars = good.split('');
      const n = 1 + Math.floor(rnd() * 6);
      for (let k = 0; k < n; k++) { const at = Math.floor(rnd() * chars.length); chars[at] = String.fromCharCode(32 + Math.floor(rnd() * 90)); }
      const bad = chars.join('');
      try {
        const s = parseSave(bad);
        // if it parsed, it must be a sane state
        expect(typeof s.player.level).toBe('number');
        expect(Number.isFinite(s.marrow.toNumber())).toBe(true);
        accepted++;
      } catch (e: any) {
        expect(e.name ?? e.constructor.name).toMatch(/SaveError|Error/);
        expect(typeof e.message).toBe('string');
        rejected++;
      }
    }
    expect(rejected + accepted).toBe(300);
    expect(rejected).toBeGreaterThan(200);
  });

  it('the checksum catches truncation', () => {
    const good = serialize(newGame(3), 1);
    expect(() => parseSave(good.slice(0, good.length - 20))).toThrow();
    expect(checksum('a')).not.toBe(checksum('b'));
  });
});
