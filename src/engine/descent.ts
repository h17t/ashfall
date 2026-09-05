/**
 * The Stair: Descent Runs. A separate, active mode. Floor by floor, each a short fight scaled
 * past the road; after each floor, one of three Boons (run-only modifiers that stack past reason)
 * or the stair's exit. The haul is not yours until it is banked: withdraw and it is, die and it
 * is the stair's. Every fight on the stair is the ordinary combat engine; this module only owns
 * where the enemies come from, where the marrow goes, and what the boons do.
 */
import { BALANCE } from '@/content/balance';
import { BOONS, BOON_ORDER, RARITY_WEIGHT, ZONE_ORDER, getZone, getBoss, getEnemy, type BoonFx } from '@/content';
import { D, ZERO, safe, type Decimal } from './num';
import { rand, pick } from './rng';
import type { GameState, GameEvent, DescentRun, EnemyInstance } from './types';
import { tierHp, tierMarrow, tierPoise } from './formulas';
import type { Mods } from './mods';
import { registerActionHandler, registerTickHook } from './registry';

/** the encounter tier that marks a stair floor */
export const DESCENT_TIER = -4;
/** the zone whose picture the stair borrows until it has its own */
export const DESCENT_ZONE = 'nadir';

const B = BALANCE.descent;

// ---------------------------------------------------------------------------
// Boons
// ---------------------------------------------------------------------------

/** The summed effect of every boon in the run, with stacking rules applied. */
export function runFx(run: DescentRun | null): Required<BoonFx> {
  const fx: Required<BoonFx> = { dmg: 1, crit: 0, critDmg: 1, strain: 1, taken: 1, haul: 1, lifesteal: 0, reprisal: 1, statusBuild: 1, statusDmg: 1, stamRegen: 1, hpRegen: 0, thorns: 0, killsNeeded: 0, bankPerFloor: 0, firstHit: 1, momentum: 0, patience: 0, secondWind: 0, draughtRefill: 0, draughtDmg: 1, dodgeCd: 1, freeCasts: 0, bleedOnCrit: 0, materials: 1 };
  if (!run) return fx;
  for (const id of run.boons) {
    const b = BOONS[id];
    if (!b) continue;
    const e = b.fx;
    if (e.dmg) fx.dmg *= e.dmg;
    if (e.crit) fx.crit += e.crit;
    if (e.critDmg) fx.critDmg *= e.critDmg;
    if (e.strain) fx.strain *= e.strain;
    if (e.taken) fx.taken *= e.taken;
    if (e.haul) fx.haul *= e.haul;
    if (e.lifesteal) fx.lifesteal += e.lifesteal;
    if (e.reprisal) fx.reprisal *= e.reprisal;
    if (e.statusBuild) fx.statusBuild *= e.statusBuild;
    if (e.statusDmg) fx.statusDmg *= e.statusDmg;
    if (e.stamRegen) fx.stamRegen *= e.stamRegen;
    if (e.hpRegen) fx.hpRegen += e.hpRegen;
    if (e.thorns) fx.thorns += e.thorns;
    if (e.killsNeeded) fx.killsNeeded += e.killsNeeded;
    if (e.bankPerFloor) fx.bankPerFloor += e.bankPerFloor;
    if (e.firstHit) fx.firstHit *= e.firstHit;
    if (e.momentum) fx.momentum += e.momentum;
    if (e.patience) fx.patience += e.patience;
    if (e.secondWind) fx.secondWind += e.secondWind;
    if (e.draughtRefill) fx.draughtRefill = 1;
    if (e.draughtDmg) fx.draughtDmg *= e.draughtDmg;
    if (e.dodgeCd) fx.dodgeCd *= e.dodgeCd;
    if (e.freeCasts) fx.freeCasts = 1;
    if (e.bleedOnCrit) fx.bleedOnCrit = 1;
    if (e.materials) fx.materials *= e.materials;
  }
  return fx;
}

/** The damage multiplier the boons give right now: static boons, momentum, patience, Lantern-Oil. */
export function runDamageMult(run: DescentRun): number {
  const fx = runFx(run);
  let m = fx.dmg;
  if (fx.momentum > 0) m *= Math.min(B.momentumCap, Math.pow(1 + fx.momentum, run.runKills));
  if (fx.patience > 0) m *= Math.min(B.patienceCap, 1 + fx.patience * run.floorT);
  if (run.oilT > 0) m *= fx.draughtDmg;
  return m;
}

function boonCount(run: DescentRun, id: string): number { return run.boons.filter((b) => b === id).length; }

/** Three distinct boons the run can still take, weighted by rarity; epics grow likelier with depth. */
export function rollOffer(state: GameState, run: DescentRun): string[] {
  const pool = BOON_ORDER.filter((id) => boonCount(run, id) < BOONS[id].stack);
  const out: string[] = [];
  const epicLift = Math.min(30, run.floor * 2);
  for (let k = 0; k < 3 && pool.length > 0; k++) {
    const weights = pool.map((id) => { const r = BOONS[id].rarity; return r === 'epic' ? RARITY_WEIGHT.epic + epicLift : r === 'rare' ? RARITY_WEIGHT.rare + epicLift / 2 : RARITY_WEIGHT.common; });
    let total = weights.reduce((a, b) => a + b, 0);
    let x = rand(state.rng) * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { x -= weights[i]; if (x <= 0) break; }
    out.push(pool[i]);
    pool.splice(i, 1);
    total = 0;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry, floors, exit
// ---------------------------------------------------------------------------

export function canDescend(state: GameState): string | null {
  if (!state.flags.descentUnlocked) return 'The stair has not shown itself. Fell a lord first.';
  if (state.descent.run) return 'You are already on the stair.';
  if (state.deathScreen > 0) return 'Not now.';
  if (state.remainsRun) return 'Your Remains lie on the road. Reclaim them, or abandon them, before you descend.';
  return null;
}

/** The global tier a floor fights at. */
export function floorTier(state: GameState, floor: number): number {
  return Math.max(0, state.stats.cycleDeepest - B.startBelow) + Math.floor(floor * B.tierPerFloor);
}
export function floorIsLord(floor: number): boolean { return floor % B.bossEvery === 0; }
export function killsNeeded(run: DescentRun): number { return Math.max(1, B.killsPerFloor + runFx(run).killsNeeded); }
export function bankMult(run: DescentRun): number { return 1 + (B.bankPerFloor + runFx(run).bankPerFloor) * (run.floor - 1); }
export function bankedPreview(run: DescentRun): Decimal { return safe(run.haul.mul(bankMult(run)).floor()); }

export function startDescent(state: GameState, events: GameEvent[]) {
  const enc = state.encounter;
  const run: DescentRun = {
    floor: 1, kills: 0, need: B.killsPerFloor, boons: [], offer: null, haul: ZERO, haulMats: {},
    from: { zone: enc.zone, tier: Math.max(0, enc.tier) }, t: 0, floorT: 0, runKills: 0, secondWind: 0, hitOnce: false, oilT: 0,
  };
  state.descent.run = run;
  enc.zone = DESCENT_ZONE;
  enc.tier = DESCENT_TIER;
  enc.enemy = null;
  enc.respawnIn = 1.0;
  enc.streak = 0;
  enc.t = 0;
  state.player.buffs = [];
  events.push({ type: 'descentFloor', floor: 1 });
}

/**
 * What a kill on the stair is worth: the road's marrow near the tier you came from, growing only
 * gently with the floor. The danger climbs exponentially; the pay does not. Depth is worth having
 * for the bank multiplier and the story, never for a printed fortune.
 */
export function floorMarrowMult(state: GameState, floor: number): Decimal {
  const base = Math.max(0, state.stats.cycleDeepest - B.marrowBelow);
  return tierMarrow(base, state.prestige.wakings).mul(B.marrowMult).mul(Math.pow(B.marrowPerFloor, floor - 1));
}

/** The floor's enemy: something from any road you have walked, scaled to the floor; a lord every fifth floor. */
export function spawnDescentEnemy(state: GameState, mods: Mods, events: GameEvent[]) {
  const run = state.descent.run!;
  const enc = state.encounter;
  const g = floorTier(state, run.floor);
  const ng = state.prestige.wakings;
  enc.t = 0;
  run.hitOnce = false;
  const lords = state.prestige.bossesEverKilled.filter((b) => { try { return !getBoss(b).noKeepsake || true; } catch { return false; } });
  const statuses = () => ({ bleed: { buildup: 0, active: 0, dps: ZERO }, poison: { buildup: 0, active: 0, dps: ZERO }, frost: { buildup: 0, active: 0, dps: ZERO } });
  if (floorIsLord(run.floor) && lords.length > 0) {
    const bossId = pick(state.rng, lords);
    const boss = getBoss(bossId);
    const hp = tierHp(g, ng).mul(B.bossHpMult).mul(boss.hpMult).floor();
    const marrow = floorMarrowMult(state, run.floor).mul(B.bossMarrowMult).mul(boss.marrowMult).floor();
    const e: EnemyInstance = {
      id: bossId, name: `${boss.name}, ${boss.title}`, isBoss: true, phase: 0, hp, hpMax: hp, strain: 0,
      composure: tierPoise(g) * BALANCE.enemy.bossPoiseMult * boss.composureMult * 0.6, reprisal: 0,
      attackIn: boss.phases[0].attackInterval * 0.8, windup: 0, windupTotal: 0, attackDamage: 0, attackId: '',
      statuses: statuses(), mech: { phaseStart: 0 }, variants: [], marrow,
    };
    enc.enemy = e;
    events.push({ type: 'bossPhase', phase: 0, name: boss.phases[0].name });
    return;
  }
  const pool = new Set<string>();
  for (const z of state.unlockedZones) for (const t of getZone(z).tiers) for (const id of t.enemies) pool.add(id);
  if (pool.size === 0) for (const t of getZone(ZONE_ORDER[0]).tiers) for (const id of t.enemies) pool.add(id);
  const defId = pick(state.rng, [...pool]);
  const def = getEnemy(defId);
  const hp = tierHp(g, ng).mul(def.hpMult).floor();
  const marrow = floorMarrowMult(state, run.floor).mul(def.marrowMult).floor();
  enc.enemy = {
    id: defId, name: def.name, isBoss: false, phase: 0, hp, hpMax: hp, strain: 0,
    composure: tierPoise(g) * def.composureMult, reprisal: 0,
    attackIn: def.attackInterval * (0.5 + rand(state.rng) * 0.5), windup: 0, windupTotal: 0, attackDamage: 0, attackId: '',
    statuses: statuses(), mech: {}, variants: [], marrow,
  };
}

/** A kill on the stair: the marrow goes to the haul, the floor counts down, a cleared floor makes the offer. */
export function descentOnKill(state: GameState, mods: Mods, events: GameEvent[], enemy: EnemyInstance, marrowMult: number) {
  const run = state.descent.run!;
  const enc = state.encounter;
  const fx = runFx(run);
  const marrow = safe(enemy.marrow.mul(marrowMult).mul(fx.haul).floor());
  run.haul = run.haul.add(marrow);
  state.stats.kills = state.stats.kills.add(1);
  state.stats.cycleKills = state.stats.cycleKills.add(1);
  run.kills++;
  run.runKills++;
  enc.streak++;
  // drops go to the haul as well
  const drops: Record<string, number> = {};
  const table = enemy.isBoss ? getBoss(enemy.id).drops : getEnemy(enemy.id).drops;
  const dropMult = mods.materialMult * fx.materials * Math.pow(BALANCE.ng.dropGrowth, state.prestige.wakings);
  for (const [mat, ch] of Object.entries(table)) {
    if (mat === 'dust' || mat === 'wickStub' || mat === 'reliquaryBone' || mat === 'pitchCoal') continue; // the stair gives marrow and slag, never the lantern's own gifts
    const expected = (enemy.isBoss ? Math.min(ch, 1) : ch) * dropMult;
    let n = Math.floor(expected);
    if (rand(state.rng) < expected - n) n++;
    if (n > 0) { drops[mat] = n; run.haulMats[mat] = (run.haulMats[mat] ?? 0) + n; }
  }
  events.push({ type: 'kill', enemy: enemy.name, marrow, isBoss: enemy.isBoss, drops });
  if (enemy.isBoss) state.stats.bossKills++;
  enc.enemy = null;
  enc.respawnIn = B.respawn;
  if (run.kills >= killsNeeded(run)) {
    const offer = rollOffer(state, run);
    if (offer.length > 0) {
      run.offer = offer;
      events.push({ type: 'descentOffer', floor: run.floor, boons: run.offer });
    } else {
      nextFloor(state, run, events); // every boon taken to its limit: the stair simply continues
    }
  }
}

function nextFloor(state: GameState, run: DescentRun, events: GameEvent[]) {
  run.floor++;
  run.kills = 0;
  run.floorT = 0;
  run.need = killsNeeded(run);
  const fx = runFx(run);
  if (fx.draughtRefill) state.player.draughts = state.player.draughtsMax;
  state.descent.bestFloor = Math.max(state.descent.bestFloor, run.floor);
  state.encounter.respawnIn = B.respawn;
  events.push({ type: 'descentFloor', floor: run.floor });
}

export function chooseBoon(state: GameState, events: GameEvent[], index: number): string | null {
  const run = state.descent.run;
  if (!run) return 'You are not on the stair.';
  if (!run.offer) return 'Nothing is offered.';
  const id = run.offer[index];
  if (!id) return 'No such boon.';
  run.boons.push(id);
  run.offer = null;
  events.push({ type: 'boonTaken', boon: id, floor: run.floor });
  if (BOONS[id].fx.secondWind) run.secondWind += BOONS[id].fx.secondWind;
  nextFloor(state, run, events);
  return null;
}

/** Withdraw: the haul, times the bank multiplier, is yours; you climb back to where you were. */
export function withdraw(state: GameState, events: GameEvent[]): string | null {
  const run = state.descent.run;
  if (!run) return 'You are not on the stair.';
  if (state.deathScreen > 0) return 'Not now.';
  const mult = bankMult(run);
  const banked = bankedPreview(run);
  state.marrow = state.marrow.add(banked);
  state.stats.marrowEarned = state.stats.marrowEarned.add(banked);
  state.stats.cycleMarrow = state.stats.cycleMarrow.add(banked);
  for (const [m, n] of Object.entries(run.haulMats)) state.materials[m] = (state.materials[m] ?? 0) + n;
  state.descent.bankedTotal = state.descent.bankedTotal.add(banked);
  state.descent.runs++;
  state.descent.bestFloor = Math.max(state.descent.bestFloor, run.floor);
  state.descent.last = { floor: run.floor, banked, died: false, boons: run.boons.slice() };
  events.push({ type: 'descentBanked', floor: run.floor, haul: run.haul, mult, banked });
  endRun(state, run.from.zone, run.from.tier);
  return null;
}

/** Death on the stair: the haul is the stair's. The player's own marrow was never at stake. */
export function descentOnDeath(state: GameState, events: GameEvent[]) {
  const run = state.descent.run!;
  state.descent.runs++;
  state.descent.last = { floor: run.floor, banked: ZERO, died: true, boons: run.boons.slice() };
  events.push({ type: 'descentLost', floor: run.floor, haul: run.haul });
  state.descent.run = null;
  // the caller (playerDie) sends the player to the lantern
}

function endRun(state: GameState, zone: string, tier: number) {
  const enc = state.encounter;
  state.descent.run = null;
  enc.zone = state.unlockedZones.includes(zone) ? zone : state.lantern;
  enc.tier = Math.min(tier, getZone(enc.zone).tiers.length - 1);
  enc.enemy = null;
  enc.respawnIn = 1.0;
  enc.streak = 0;
  enc.t = 0;
  state.player.buffs = [];
}

/** A killing blow on the stair with a Second Waking left: survive at 1 HP. */
export function secondWind(state: GameState, events: GameEvent[]): boolean {
  const run = state.descent.run;
  if (!run || run.secondWind <= 0) return false;
  run.secondWind--;
  state.player.hp = 1;
  events.push({ type: 'notice', text: 'The Lantern had one more in it. You stand, barely.' });
  return true;
}

// ---------------------------------------------------------------------------
// Actions and the tick
// ---------------------------------------------------------------------------

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'descend': { const why = canDescend(state); if (why) return err(why); startDescent(state, events); return true; }
    case 'chooseBoon': { const why = chooseBoon(state, events, action.index); return why ? err(why) : true; }
    case 'descentWithdraw': { const why = withdraw(state, events); return why ? err(why) : true; }
  }
  return false;
});

registerTickHook((state, mods, events, dt) => {
  const run = state.descent.run;
  if (!run) return;
  if (state.deathScreen > 0) return;
  run.t += dt;
  if (!run.offer && state.encounter.enemy) run.floorT += dt;
  if (run.oilT > 0) run.oilT = Math.max(0, run.oilT - dt);
  const fx = runFx(run);
  const p = state.player;
  // regen and lifesteal are scale-free: fractions of max HP
  if (fx.hpRegen > 0) p.hp = Math.min(p.hpMax, p.hp + p.hpMax * fx.hpRegen * dt);
  for (const e of events) {
    if (e.type === 'hit' && (e.source === 'player' || e.source === 'spell') && fx.lifesteal > 0) p.hp = Math.min(p.hpMax, p.hp + p.hpMax * fx.lifesteal);
    if (e.type === 'heal' && fx.draughtDmg > 1) run.oilT = 8;
  }
  // thorns: a landed enemy hit costs the striker a share of its HP
  const enemy = state.encounter.enemy;
  if (enemy && fx.thorns > 0 && events.some((e) => e.type === 'enemyAttack' && !e.dodged)) {
    enemy.hp = enemy.hp.sub(enemy.hpMax.mul(fx.thorns).floor());
    events.push({ type: 'hit', dmg: enemy.hpMax.mul(fx.thorns).floor(), crit: false, reprisal: false, source: 'dot', kind: 'thorns' });
    if (enemy.hp.lte(0)) { enemy.hp = ZERO; descentOnKill(state, mods, events, enemy, mods.marrow); }
  }
});
