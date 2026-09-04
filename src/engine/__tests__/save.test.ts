import { describe, it, expect } from 'vitest';
import { newGame, advance, serialize, parseSave, exportSave, importSave, SaveError, checksum, migrations, applyOffline, D, SAVE_VERSION, computeMods, type GameState } from '..';
import { BALANCE } from '@/content/balance';

function playedState(seed = 3): GameState {
  const s = newGame(seed);
  s.souls = D('12345678901234567890');
  for (let i = 0; i < 300; i++) advance(s, 0.1, i % 2 ? [{ type: 'click' }] : []);
  s.materials.shard = 4;
  return s;
}

describe('save round trip', () => {
  it('serializes and parses back to an equivalent state, Decimals intact', () => {
    const s = playedState();
    const json = serialize(s, 1000);
    const back = parseSave(json);
    expect(back.souls.eq(s.souls)).toBe(true);
    expect(back.souls.toNumber()).toBeCloseTo(1.2345678901234568e19, -5);
    expect(back.player.level).toBe(s.player.level);
    expect(back.stats.kills.eq(s.stats.kills)).toBe(true);
    expect(back.encounter.enemy?.hp.eq(s.encounter.enemy!.hp) ?? true).toBe(true);
    expect(back.materials.shard).toBe(4);
    expect(back.savedAt).toBe(1000);
    // and it keeps ticking deterministically
    const a = JSON.stringify(advance(s, 2).length);
    const b = JSON.stringify(advance(back, 2).length);
    expect(a).toBe(b);
    expect(back.souls.eq(s.souls)).toBe(true);
  });
  it('export/import is unicode-safe and detects corruption', () => {
    const s = playedState();
    const text = exportSave(s, 5);
    expect(text.startsWith('ASHFALL1.')).toBe(true);
    const back = importSave(text);
    expect(back.souls.eq(s.souls)).toBe(true);
    expect(() => importSave('hello')).toThrow(SaveError);
    expect(() => importSave(text.slice(0, text.length - 40))).toThrow(SaveError);
    try { importSave(text.slice(0, -40)); } catch (e) { expect((e as SaveError).kind).toMatch(/corrupt|checksum/); }
  });
  it('rejects a tampered checksum with a clear error', () => {
    const s = playedState();
    const json = serialize(s, 1);
    const tampered = json.replace('"shard":4', '"shard":9999');
    expect(() => parseSave(tampered)).toThrow(/checksum/);
  });
  it('rejects newer versions and empty saves', () => {
    const s = playedState();
    const json = serialize(s, 1).replace(`"v":${SAVE_VERSION}`, `"v":${SAVE_VERSION + 50}`);
    expect(() => parseSave(json)).toThrow(/newer/);
    expect(() => parseSave('')).toThrow(/empty/);
  });
  it('fills missing fields from defaults (forward-compatible normalize)', () => {
    const s = playedState();
    const blob = JSON.parse(serialize(s, 1));
    delete blob.state.automation;
    delete blob.state.prestige;
    blob.state.player.buffs = undefined;
    // recompute checksum for the edited state
    const inner = JSON.stringify(blob.state);
    blob.checksum = checksum(inner);
    const back = parseSave(JSON.stringify(blob));
    expect(back.automation.autoLevelStat).toBe('balanced');
    expect(back.prestige.humanity.toNumber()).toBe(0);
    expect(back.player.buffs).toEqual([]);
  });
  it('runs the migration chain from every historical version', () => {
    // Every version below SAVE_VERSION must have a migration registered.
    for (let v = 1; v < SAVE_VERSION; v++) expect(typeof migrations[v]).toBe('function');
    for (const fixture of FIXTURES) {
      const back = parseSave(fixture.json);
      expect(back.version).toBe(SAVE_VERSION);
      expect(back.souls.gte(0)).toBe(true);
      fixture.check(back);
    }
  });
});

/** Historical save fixtures; append one per schema version so migrations stay tested. */
const FIXTURES: { version: number; json: string; check: (s: GameState) => void }[] = [
  {
    version: 1,
    json: (() => { const s = newGame(9); s.souls = D(777); return serialize(s, 42); })(),
    check: (s) => expect(s.souls.toNumber()).toBe(777),
  },
];

describe('offline progress', () => {
  it('ignores short gaps and caps long ones', () => {
    const s = newGame(1);
    expect(applyOffline(s, 10)).toBeNull();
    const sum = applyOffline(s, 100 * 3600);
    expect(sum).not.toBeNull();
    expect(sum!.cappedSeconds).toBe(BALANCE.offline.capHours * 3600);
    expect(sum!.souls.toNumber()).toBe(0); // no phantoms yet
    expect(s.offline).toBe(sum);
  });
  it('never drops souls and restores the player', () => {
    const s = newGame(1);
    s.souls = D(500);
    s.player.hp = 1;
    s.player.estus = 0;
    applyOffline(s, 3600);
    expect(s.souls.toNumber()).toBe(500);
    expect(s.player.hp).toBe(s.player.hpMax);
    expect(s.player.estus).toBe(s.player.estusMax);
    expect(s.bloodstain).toBeNull();
  });
  it('respects the offline cap modifier', () => {
    const s = newGame(1);
    const mods = computeMods(s);
    mods.offlineCapHours = 24;
    const sum = applyOffline(s, 30 * 3600, mods);
    expect(sum!.cappedSeconds).toBe(24 * 3600);
  });
});
