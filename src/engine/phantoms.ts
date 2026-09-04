/**
 * The phantom squad: the idle layer. Phantoms fight beside the player (per-tick actions)
 * or hunt a cleared tier (closed-form rate), online and offline.
 */
import { D, ZERO, Decimal, safe } from './num';
import { chance } from './rng';
import { BALANCE } from '@/content/balance';
import { PHANTOMS, getPhantom, getWeapon, getZone, getEnemy, globalTier, ZONE_ORDER } from '@/content';
import type { GameState, GameEvent, PhantomState, Action, StatusKey } from './types';
import type { Mods } from './mods';
import { tierHp, tierDmg, tierSouls, reinforceMult } from './formulas';
import { damageEnemy, addStagger, applyStatus, ngLevel, buffMult } from './combat';
import { registerTickHook } from './tick';
import { registerActionHandler, ensureZone } from './actions';
import { setIdleRateFn, type IdleRate } from './idle';

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

export function phantomLevelCost(ph: PhantomState): Decimal {
  const def = getPhantom(ph.id);
  const region = getZone(def.zone).region;
  const b = BALANCE.phantom;
  return D(b.levelCostBase).mul(Decimal.pow(b.levelCostGrowth, ph.level - 1)).mul(Decimal.pow(6, region - 1)).floor();
}

export function phantomXpToNext(ph: PhantomState): Decimal {
  // XP thresholds track the souls a hunter earns at its level's fair tier, so idle levels
  // arrive steadily without out-pacing bought levels.
  return D(40).mul(Decimal.pow(1.22, ph.level - 1)).floor();
}

export interface PhantomNumbers {
  dmgPerHit: Decimal;
  hitsPerSec: number;
  dps: Decimal;
  hp: number;
  staggerPerHit: number;
  healPerAct: number; // fraction
  buffMult: number;
  status: Partial<Record<StatusKey, number>>;
  weaponName: string;
}

export function phantomAffinity(state: GameState, phantomId: string): number {
  const def = getPhantom(phantomId);
  return state.covenant.current === def.covenant ? 1.15 : 1;
}

export function phantomNumbers(state: GameState, mods: Mods, ph: PhantomState): PhantomNumbers {
  const def = getPhantom(ph.id);
  const w = ph.weapon && state.player.weapons[ph.weapon] ? state.player.weapons[ph.weapon] : null;
  const wdef = w ? getWeapon(w.id) : getWeapon(def.defaultWeapon);
  const wbase = w ? wdef.base * reinforceMult(w.level) : wdef.base * 0.6; // unarmed-ish fallback: a battered copy of their default
  const b = BALANCE.phantom;
  const level = Math.pow(b.powerPerLevel, ph.level - 1);
  const affinity = phantomAffinity(state, ph.id);
  const squadBuff = state.squad.buff.t > 0 ? state.squad.buff.mult : 1;
  const dmg = D(wbase).mul(def.power).mul(level).mul(mods.phantomDmg).mul(mods.dmg).mul(affinity).mul(squadBuff);
  const hitsPerSec = def.speed * wdef.speed;
  const status: Partial<Record<StatusKey, number>> = {};
  if (def.status) for (const [k, v] of Object.entries(def.status)) status[k as StatusKey] = (v as number) * (0.8 + level * 0.2);
  if (wdef.status) for (const [k, v] of Object.entries(wdef.status)) status[k as StatusKey] = (status[k as StatusKey] ?? 0) + (v as number);
  if (w && w.infusion !== 'none') {
    const inf = BALANCE.weapon.infusion[w.infusion];
    if (inf?.status) status[inf.status as StatusKey] = (status[inf.status as StatusKey] ?? 0) + (inf.amount ?? 0);
  }
  return {
    dmgPerHit: safe(dmg),
    hitsPerSec,
    dps: safe(dmg.mul(hitsPerSec)),
    hp: Math.floor(def.hp * Math.pow(b.hpPerLevel, ph.level - 1)),
    staggerPerHit: wdef.stagger * def.stagger * (def.role === 'stagger' ? 2.5 : 1),
    healPerAct: def.heal * (def.covenant === state.covenant.current ? 1.4 : 1),
    buffMult: def.buff,
    status,
    weaponName: w ? wdef.name : `${wdef.name} (worn)`,
  };
}

export function squadSlots(state: GameState, mods: Mods): number {
  // 1 base, +1 per region boss defeated (ever), up to 5; modifiers add more.
  const bossSlots = Math.min(4, state.prestige.bossesEverKilled.filter((b) => ZONE_ORDER.some((z) => getZone(z).boss === b)).length);
  return Math.min(6, 1 + bossSlots + mods.phantomSlots);
}

export function activePhantoms(state: GameState, mods: Mods): PhantomState[] {
  const slots = squadSlots(state, mods);
  return state.squad.phantoms.slice(0, slots);
}

// ---------------------------------------------------------------------------
// Hunting (closed form)
// ---------------------------------------------------------------------------

export interface HuntReport extends IdleRate {
  squadDps: Decimal;
  squadHp: number;
  killTime: number;
  deathTime: number;
  incomingDps: number;
  regenPerSec: number;
  survivable: boolean;
  /** fraction of time the squad can stay in the fight (recovery / incoming), 0..1 */
  uptime: number;
  hunters: string[];
}

export function huntTargets(state: GameState): { zone: string; tier: number }[] {
  const out: { zone: string; tier: number }[] = [];
  for (const z of ZONE_ORDER) {
    if (!state.unlockedZones.includes(z)) continue;
    const zp = state.zones[z];
    if (!zp) continue;
    for (let t = 0; t <= zp.cleared && t < getZone(z).tiers.length; t++) out.push({ zone: z, tier: t });
  }
  return out;
}

/** Rate for the given hunters at (zone, tier). */
export function evaluateHunt(state: GameState, mods: Mods, hunters: PhantomState[], zone: string, tier: number): HuntReport {
  const z = getZone(zone);
  const t = z.tiers[Math.max(0, Math.min(tier, z.tiers.length - 1))];
  const g = globalTier(zone, tier);
  const ng = ngLevel(state, mods);
  const defs = t.enemies.map(getEnemy);
  const avg = (f: (e: ReturnType<typeof getEnemy>) => number) => defs.reduce((a, e) => a + f(e), 0) / defs.length;
  const hp = tierHp(g, ng).mul(avg((e) => e.hpMult));
  let squadDps = ZERO;
  let squadHp = 0;
  let heal = 0;
  let buff = 1;
  let statusBonus = 1;
  const b = BALANCE.phantom;
  for (const ph of hunters) {
    const n = phantomNumbers(state, mods, ph);
    const def = getPhantom(ph.id);
    squadDps = squadDps.add(n.dps);
    squadHp += n.hp;
    if (def.role === 'healer') heal += n.healPerAct * n.hitsPerSec; // fraction of squad hp per second
    if (def.role === 'buffer') buff *= n.buffMult;
    if (def.role === 'status') statusBonus *= 1.35;
  }
  squadDps = squadDps.mul(buff).mul(statusBonus);
  const regen = squadHp * (b.baseRegenFrac + heal);
  const incoming = tierDmg(g, ng) * avg((e) => e.dmgMult * e.attacks.reduce((a, x) => a + x.mult * x.weight, 0) / e.attacks.reduce((a, x) => a + x.weight, 0)) / avg((e) => e.attackInterval);
  // The squad fights until its HP is gone, then rests to recover. If it would fall before
  // finishing a single kill, it cannot hold the ground at all and retreats (no loss, no gain).
  const killTime = squadDps.gt(0) ? hp.div(squadDps).toNumber() : Infinity;
  const deathTime = incoming > 0 ? squadHp / incoming : Infinity;
  const canFinish = deathTime >= killTime * 1.2;
  const uptime = hunters.length === 0 ? 0 : !canFinish ? 0 : incoming <= 0 ? 1 : regen / (regen + incoming);
  const survivable = hunters.length > 0 && uptime >= b.wipeUptime;
  const kills = survivable ? uptime / killTime : 0;
  const soulEach = tierSouls(g, ng).mul(avg((e) => e.soulMult));
  const souls = survivable ? soulEach.mul(kills).mul(b.huntSoulFrac).mul(mods.souls).mul(mods.phantomRate) : ZERO;
  const materials: Record<string, number> = {};
  if (survivable) {
    const dropMult = mods.materialMult * Math.pow(BALANCE.ng.dropGrowth, state.prestige.kindles) * b.huntDropFrac * mods.phantomRate;
    for (const e of defs) for (const [m, c] of Object.entries(e.drops)) materials[m] = (materials[m] ?? 0) + (c * kills * dropMult) / defs.length;
  }
  const xp = survivable ? soulEach.mul(kills).mul(b.xpPerKillMult * 0.5) : ZERO;
  return {
    souls: safe(souls), kills, materials, xp: safe(xp), zone, tier,
    wiped: hunters.length > 0 && !survivable,
    reason: hunters.length === 0 ? 'No phantoms are hunting. Assign one to "hunt" in the Squad panel.' : !survivable ? (!canFinish ? `The squad cannot hold ${t.name}: a kill takes ${killTime.toFixed(0)}s but they would fall in ${deathTime.toFixed(0)}s. They retreat.` : `The squad cannot hold ${t.name}: ${incoming.toFixed(1)} incoming damage/s against ${regen.toFixed(1)} recovery/s. They retreat.`) : null,
    squadDps, squadHp, killTime, deathTime, incomingDps: incoming, regenPerSec: regen, survivable, uptime, hunters: hunters.map((h) => h.id),
  };
}

/** Pick the hunting ground: explicit or the highest survivable cleared tier. */
export function resolveHunt(state: GameState, mods: Mods, hunters: PhantomState[]): HuntReport {
  const targets = huntTargets(state);
  if (targets.length === 0 || hunters.length === 0) {
    const z = state.unlockedZones[0];
    return evaluateHunt(state, mods, hunters, z, 0);
  }
  if (!state.squad.huntAuto) {
    const chosen = targets.find((t) => t.zone === state.squad.huntZone && t.tier === state.squad.huntTier) ?? targets[0];
    return evaluateHunt(state, mods, hunters, chosen.zone, chosen.tier);
  }
  let best: HuntReport | null = null;
  for (let i = targets.length - 1; i >= 0; i--) {
    const r = evaluateHunt(state, mods, hunters, targets[i].zone, targets[i].tier);
    if (r.survivable && (!best || r.souls.gt(best.souls))) { best = r; if (r.souls.gt(0)) break; }
  }
  return best ?? evaluateHunt(state, mods, hunters, targets[0].zone, targets[0].tier);
}

/**
 * The squad re-evaluates its hunting ground once per second of game time (deterministic:
 * keyed on state.t and the hunter roster), not every tick. Cached per state object.
 */
const huntMemo = new WeakMap<GameState, { key: string; t: number; report: HuntReport }>();
export function cachedHunt(state: GameState, mods: Mods, hunters: PhantomState[]): HuntReport {
  const key = hunters.map((h) => `${h.id}:${h.level}:${h.weapon}`).join('|') + `|${state.squad.huntAuto}:${state.squad.huntZone}:${state.squad.huntTier}|${state.covenant.current}|${state.prestige.kindles}`;
  const m = huntMemo.get(state);
  if (m && m.key === key && state.t - m.t < 1) return m.report;
  const report = resolveHunt(state, mods, hunters);
  huntMemo.set(state, { key, t: state.t, report });
  return report;
}

export function currentHunters(state: GameState, mods: Mods, everyone = false): PhantomState[] {
  return activePhantoms(state, mods).filter((p) => everyone || p.assignment === 'hunt');
}

// offline: everyone hunts
setIdleRateFn((state, mods) => resolveHunt(state, mods, currentHunters(state, mods, true)));

// ---------------------------------------------------------------------------
// Per-tick
// ---------------------------------------------------------------------------

function tickPhantoms(state: GameState, mods: Mods, events: GameEvent[], dt: number) {
  const sq = state.squad;
  if (sq.buff.t > 0) { sq.buff.t -= dt; if (sq.buff.t <= 0) { sq.buff.t = 0; sq.buff.mult = 1; } }
  const active = activePhantoms(state, mods);
  if (active.length === 0) return;
  sq.slots = squadSlots(state, mods);

  // ---- hunters: closed-form accrual ----
  const hunters = active.filter((p) => p.assignment === 'hunt');
  if (hunters.length > 0) {
    const r = cachedHunt(state, mods, hunters);
    sq.huntZone = r.zone;
    sq.huntTier = r.tier;
    if (r.survivable) {
      const souls = r.souls.mul(dt);
      state.souls = state.souls.add(souls);
      state.stats.soulsEarned = state.stats.soulsEarned.add(souls);
      state.stats.cycleSouls = state.stats.cycleSouls.add(souls);
      sq.killAcc += r.kills * dt;
      if (sq.killAcc >= 1) {
        const n = Math.floor(sq.killAcc);
        sq.killAcc -= n;
        state.stats.kills = state.stats.kills.add(n);
        state.stats.cycleKills = state.stats.cycleKills.add(n);
        const zp = ensureZone(state, r.zone);
        zp.kills[r.tier] = (zp.kills[r.tier] ?? 0) + n;
      }
      const matAcc = sq.matAcc;
      for (const [m, per] of Object.entries(r.materials)) {
        matAcc[m] = (matAcc[m] ?? 0) + per * dt;
        if (matAcc[m] >= 1) { const n = Math.floor(matAcc[m]); matAcc[m] -= n; state.materials[m] = (state.materials[m] ?? 0) + n; }
      }
      const xp = r.xp.mul(dt);
      for (const ph of hunters) { ph.xp = ph.xp.add(xp); ph.retreat = 0; }
    } else {
      for (const ph of hunters) ph.retreat = BALANCE.phantom.retreatTime;
    }
  }

  // ---- beside: act on the encounter ----
  const enemy = state.encounter.enemy;
  for (const ph of active) {
    if (ph.assignment !== 'beside') continue;
    if (state.deathScreen > 0) continue;
    ph.actIn -= dt;
    if (ph.actIn > 0) continue;
    const n = phantomNumbers(state, mods, ph);
    const def = getPhantom(ph.id);
    ph.actIn = 1 / Math.max(0.05, n.hitsPerSec);
    const p = state.player;
    if (def.role === 'healer') {
      const amt = Math.round(p.hpMax * n.healPerAct);
      if (p.hp < p.hpMax && amt > 0) { p.hp = Math.min(p.hpMax, p.hp + amt); events.push({ type: 'heal', amount: amt }); }
    }
    if (def.role === 'buffer') {
      p.buffs = p.buffs.filter((b) => b.id !== 'phantom:' + ph.id);
      p.buffs.push({ id: 'phantom:' + ph.id, t: ph.actIn + 0.5, dmg: n.buffMult });
    }
    if (!enemy || enemy.hp.lte(0)) continue;
    const wdef = ph.weapon && p.weapons[ph.weapon] ? getWeapon(ph.weapon) : getWeapon(def.defaultWeapon);
    const roleDmg = def.role === 'dps' ? 1 : def.role === 'stagger' ? 0.6 : def.role === 'healer' ? 0.3 : def.role === 'buffer' ? 0.4 : 0.5;
    const riposte = enemy.riposte > 0;
    let dmg = n.dmgPerHit.mul(roleDmg).mul(BALANCE.phantom.besideDmgMult);
    if (riposte) dmg = dmg.mul(1.5);
    damageEnemy(state, mods, events, dmg, wdef.damageType, 'phantom', { riposte });
    if (!state.encounter.enemy || state.encounter.enemy.hp.lte(0)) continue;
    addStagger(state, mods, events, n.staggerPerHit);
    for (const [s, a] of Object.entries(n.status)) if (a) applyStatus(state, mods, events, s as StatusKey, a as number);
  }

  // ---- XP levels ----
  for (const ph of active) {
    let guard = 0;
    while (ph.xp.gte(phantomXpToNext(ph)) && guard++ < 50) {
      ph.xp = ph.xp.sub(phantomXpToNext(ph));
      ph.level++;
      events.push({ type: 'notice', text: `${getPhantom(ph.id).name} grows stronger (level ${ph.level}).` });
    }
  }
}
registerTickHook(tickPhantoms);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function canRecruit(state: GameState, id: string): string | null {
  const def = PHANTOMS[id];
  if (!def) return 'No such phantom.';
  if (state.squad.recruited.includes(id)) return 'Already sworn to you.';
  if (!state.unlockedZones.includes(def.zone)) return `Found in ${getZone(def.zone).name}.`;
  if (def.requiresBoss && !state.prestige.bossesEverKilled.includes(def.requiresBoss)) return 'Will not answer until the region\'s lord has fallen.';
  if (state.souls.lt(def.recruitCost)) return `Requires ${def.recruitCost} souls.`;
  return null;
}

registerActionHandler((state, action, events, mods) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'recruit': {
      const why = canRecruit(state, action.phantom);
      if (why) return err(why);
      const def = getPhantom(action.phantom);
      state.souls = state.souls.sub(def.recruitCost);
      state.squad.recruited.push(def.id);
      const weapon = state.player.weapons[def.defaultWeapon] && state.player.weapon !== def.defaultWeapon && !state.squad.phantoms.some((p) => p.weapon === def.defaultWeapon) ? def.defaultWeapon : null;
      state.squad.phantoms.push({ id: def.id, level: 1, xp: ZERO, weapon, assignment: 'beside', hpFrac: 1, actIn: 1, retreat: 0 });
      state.squad.slots = squadSlots(state, mods);
      events.push({ type: 'unlock', what: 'phantom:' + def.id, text: `${def.name} answers the summon. "${def.greeting}"` });
      return true;
    }
    case 'levelPhantom': {
      const ph = state.squad.phantoms.find((p) => p.id === action.phantom);
      if (!ph) return err('No such phantom.');
      const cost = phantomLevelCost(ph);
      if (state.souls.lt(cost)) return err('Not enough souls.');
      state.souls = state.souls.sub(cost);
      ph.level++;
      return true;
    }
    case 'assignPhantom': {
      const ph = state.squad.phantoms.find((p) => p.id === action.phantom);
      if (!ph) return err('No such phantom.');
      ph.assignment = action.assignment;
      ph.retreat = 0;
      return true;
    }
    case 'equipPhantom': {
      const ph = state.squad.phantoms.find((p) => p.id === action.phantom);
      if (!ph) return err('No such phantom.');
      if (action.weapon) {
        if (!state.player.weapons[action.weapon]) return err('You do not own that.');
        if (state.player.weapon === action.weapon) return err('You are wielding that.');
        const other = state.squad.phantoms.find((p) => p.weapon === action.weapon && p.id !== ph.id);
        if (other) other.weapon = ph.weapon; // swap
      }
      ph.weapon = action.weapon;
      return true;
    }
    case 'setHunt': {
      state.squad.huntAuto = action.auto;
      if (!action.auto) {
        const ok = huntTargets(state).some((t) => t.zone === action.zone && t.tier === action.tier);
        if (!ok) return err('The squad can only hunt ground you have cleared.');
        state.squad.huntZone = action.zone;
        state.squad.huntTier = action.tier;
      }
      return true;
    }
  }
  return false;
});

export { PHANTOMS };
