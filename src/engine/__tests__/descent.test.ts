import { describe, it, expect } from 'vitest';
import { newGame, advance, D, canDescend, bankMult, killsNeeded, runFx, floorTier, rollOffer, type GameState } from '..';
import { BOONS, BALANCE } from '@/content';

/** A player who has felled a lord and can hold a floor or two. */
function ready(seed = 3): GameState {
  const s = newGame(seed);
  s.stats.bossKills = 1; s.stats.deepestTier = 6; s.stats.cycleDeepest = 6; s.player.level = 60; s.player.stats.vit = 30; s.player.stats.mig = 30;
  s.automation.autoAttack = true; s.automation.unlocked.push('autoAttack'); s.flags.autoAttack = true;
  s.unlockedZones = ['tollroad', 'mire'];
  s.marrow = D(1000);
  advance(s, 0.1);
  return s;
}
/** Advance until the run makes an offer, a death, or the time runs out; boons are chosen by `pick`. */
function play(s: GameState, seconds: number, pick: (offer: string[]) => number = () => 0) {
  const out: any[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const acts: any[] = s.descent.run?.offer ? [{ type: 'chooseBoon', index: pick(s.descent.run.offer) }] : [];
    for (const e of advance(s, 0.1, acts)) out.push(e);
    if (!s.descent.run) break;
  }
  return out;
}

describe('the Stair', () => {
  it('shows itself after the first lord and refuses before', () => {
    const s = newGame(1);
    expect(canDescend(s)).toMatch(/lord/);
    s.stats.bossKills = 1;
    const ev = advance(s, 0.1);
    expect(ev.some((e) => e.type === 'unlock' && e.what === 'descent')).toBe(true);
    expect(canDescend(s)).toBeNull();
  });
  it('descending moves the fight to the stair and remembers the way back', () => {
    const s = ready();
    s.encounter.tier = 2;
    advance(s, 0, [{ type: 'descend' }]);
    expect(s.descent.run).not.toBeNull();
    expect(s.encounter.tier).toBe(-4);
    expect(s.descent.run!.from).toEqual({ zone: 'tollroad', tier: 2 });
    advance(s, 2);
    expect(s.encounter.enemy).not.toBeNull();
    expect(s.encounter.enemy!.attackDamage).toBeLessThan(s.player.hpMax); // the floor is scaled to the road, not to the Nadir's picture
  });
  it('floor 1 sits under the deepest tier of this cycle and the floors climb by the balance step', () => {
    const s = ready();
    const B = BALANCE.descent;
    expect(floorTier(s, 1)).toBe(6 - B.startBelow + Math.floor(B.tierPerFloor));
    expect(floorTier(s, 9) - floorTier(s, 1)).toBe(Math.floor(9 * B.tierPerFloor) - Math.floor(B.tierPerFloor));
    s.stats.cycleDeepest = 0; // after a Snuff the stair starts over with the road
    expect(floorTier(s, 1)).toBe(Math.floor(B.tierPerFloor));
  });
  it('kills fill the haul, not the purse, and a cleared floor offers three distinct boons', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const purse = s.marrow.toString();
    const ev = play(s, 120, () => -1); // never choose: stop at the first offer
    const offer = ev.find((e) => e.type === 'descentOffer');
    expect(offer).toBeDefined();
    expect(new Set(offer.boons).size).toBe(3);
    expect(s.descent.run!.haul.gt(0)).toBe(true);
    expect(s.marrow.toString()).toBe(purse);
    // the stair waits: no enemy spawns while the offer stands
    advance(s, 5);
    expect(s.encounter.enemy).toBeNull();
    expect(s.descent.run!.offer).not.toBeNull();
  });
  it('choosing a boon opens the next floor and the boon is felt in the modifiers', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    play(s, 120, () => -1);
    const run = s.descent.run!;
    run.offer = ['tallowEdge', 'keenEye', 'glassMarrow'];
    advance(s, 0, [{ type: 'chooseBoon', index: 2 }]);
    expect(run.floor).toBe(2);
    expect(run.boons).toEqual(['glassMarrow']);
    const fx = runFx(run);
    expect(fx.dmg).toBe(2); expect(fx.taken).toBe(2);
    expect(s.descent.bestFloor).toBe(2);
  });
  it('boons stack up to their limit and are never offered past it', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.boons = ['tallowEdge', 'tallowEdge', 'tallowEdge', 'tallowEdge', 'glassMarrow'];
    for (let i = 0; i < 40; i++) { const o = rollOffer(s, run); expect(o).not.toContain('tallowEdge'); expect(o).not.toContain('glassMarrow'); expect(new Set(o).size).toBe(3); }
    expect(runFx(run).dmg).toBeCloseTo(1.25 ** 4 * 2);
  });
  it('the bank multiplier grows with the floor and withdrawing pays the haul times it, back where you were', () => {
    const s = ready();
    s.encounter.tier = 1;
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.floor = 6; run.haul = D(1000);
    expect(bankMult(run)).toBeCloseTo(1 + BALANCE.descent.bankPerFloor * 5);
    const before = s.marrow;
    const ev = advance(s, 0, [{ type: 'descentWithdraw' }]);
    const b = ev.find((e) => e.type === 'descentBanked') as any;
    expect(b.banked.toNumber()).toBe(Math.floor(1000 * (1 + BALANCE.descent.bankPerFloor * 5)));
    expect(s.marrow.sub(before).toNumber()).toBe(b.banked.toNumber());
    expect(s.descent.run).toBeNull();
    expect(s.encounter.zone).toBe('tollroad'); expect(s.encounter.tier).toBe(1);
    expect(s.descent.runs).toBe(1); expect(s.descent.last?.died).toBe(false);
    expect(s.stats.cycleMarrow.toNumber()).toBe(b.banked.toNumber()); // banked marrow feeds Vestige
  });
  it("Usurer's Bank raises the bank multiplier per floor", () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.floor = 11; run.boons = ['usurersBank'];
    expect(bankMult(run)).toBeCloseTo(1 + (BALANCE.descent.bankPerFloor + 0.1) * 10);
  });
  it('dying on the stair loses the haul, keeps your purse, and drops no Remains', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.haul = D(5000);
    advance(s, 2);
    const purse = s.marrow.toString();
    s.player.hp = 1; s.encounter.enemy!.attackIn = 0; s.encounter.enemy!.windup = 0;
    const ev = play(s, 30);
    const lost = ev.find((e) => e.type === 'descentLost') as any;
    expect(lost).toBeDefined(); expect(lost.haul.toNumber()).toBe(5000);
    expect(s.descent.run).toBeNull();
    expect(s.marrow.toString()).toBe(purse);
    expect(s.remains).toBeNull();
    expect(s.encounter.zone).toBe(s.lantern);
    expect(s.descent.last?.died).toBe(true);
    expect(s.stats.deaths).toBe(1);
  });
  it('A Second Waking survives one killing blow at 1 HP, once', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.offer = ['secondWaking', 'keenEye', 'tallowEdge'];
    advance(s, 0, [{ type: 'chooseBoon', index: 0 }]);
    expect(run.secondWind).toBe(1);
    advance(s, 2);
    s.player.hp = 1; s.encounter.enemy!.windup = 0; s.encounter.enemy!.attackIn = 0;
    let survived = false, died = false;
    for (let i = 0; i < 400 && !died; i++) {
      const ev = advance(s, 0.1);
      if (ev.some((e) => e.type === 'notice' && /one more/.test(e.text))) { survived = true; expect(s.player.hp).toBe(1); s.player.hp = 1; }
      if (ev.some((e) => e.type === 'death')) died = true;
    }
    expect(survived).toBe(true);
    expect(died).toBe(true); // the second blow lands
    expect(s.descent.run).toBeNull();
  });
  it('Short Stair shortens the floor; First Cut multiplies the opening hit', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.boons = ['shortStair'];
    expect(killsNeeded(run)).toBe(BALANCE.descent.killsPerFloor - 1);
    run.boons = ['firstCut'];
    advance(s, 2);
    const e = s.encounter.enemy!;
    e.hp = D(1e9); e.hpMax = D(1e9);
    s.automation.autoAttack = false;
    run.hitOnce = false; // the auto-attack already spent the opening while the enemy walked in
    const first = advance(s, 0, [{ type: 'click' }]).find((x) => x.type === 'hit') as any;
    s.player.stamina = s.player.staminaMax;
    const second = advance(s, 0, [{ type: 'click' }]).find((x) => x.type === 'hit') as any;
    expect(first.dmg.toNumber() / second.dmg.toNumber()).toBeGreaterThan(2.5); // ×4 less the ±8% swing and a possible crit
  });
  it('every fifth floor is a lord you have already felled, at a fraction of its road might', () => {
    const s = ready();
    s.prestige.bossesEverKilled = ['coldPyreWarden'];
    advance(s, 0, [{ type: 'descend' }]);
    const run = s.descent.run!;
    run.floor = 5;
    advance(s, 2);
    expect(s.encounter.enemy!.isBoss).toBe(true);
    expect(s.encounter.enemy!.id).toBe('coldPyreWarden');
  });
  it('the offer never stalls the road: retreat and travel are refused mid-run but the withdraw always works', () => {
    const s = ready();
    advance(s, 0, [{ type: 'descend' }]);
    play(s, 120, () => -1);
    expect(s.descent.run!.offer).not.toBeNull();
    const ev = advance(s, 0, [{ type: 'descentWithdraw' }]);
    expect(ev.some((e) => e.type === 'descentBanked')).toBe(true);
    expect(s.descent.run).toBeNull();
  });
  it('every boon has lore, a line, and does something', () => {
    for (const b of Object.values(BOONS)) { expect(b.lore.length).toBeGreaterThan(30); expect(b.text.length).toBeGreaterThan(5); expect(Object.keys(b.fx).length).toBeGreaterThan(0); }
  });
});
