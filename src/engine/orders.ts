/**
 * Standing Orders: player-authored automation. A list of WHEN <conditions> THEN <action> rules,
 * evaluated in order every tick; a rule fires when every condition holds and the action can be
 * done, then waits a short cooldown. Slots, condition kinds and action kinds are earned by play.
 * The orders are the game's automation layer above the reflexes (auto-attack, auto-dodge ...),
 * and they run in the simulator exactly as they run on a phone.
 */
import { BALANCE } from '@/content/balance';
import { SHADES, BOONS, getWeapon, getZone, WEAPONS, reinforceMaterial } from '@/content';
import type { GameState, GameEvent, Order, OrderCond, OrderCondKind, OrderActKind, StatKey, Action } from './types';
import { STAT_KEYS } from './types';
import type { Mods } from './mods';
import { levelCost, reinforceCost } from './formulas';
import { registerActionHandler, registerTickHook } from './registry';
import { applyAction } from './actions';
import { canDescend } from './descent';
import { canRecruit } from './shades';
import { weaponDamage } from './combat';

const B = BALANCE.orders;

export const COND_KINDS: OrderCondKind[] = ['always', 'hp', 'stamina', 'fp', 'draughts', 'marrow', 'enemyHp', 'composure', 'reprisal', 'telegraph', 'boss', 'streak', 'floor', 'haul', 'boonOffer'];
export const ACT_KINDS: OrderActKind[] = ['strike', 'dodge', 'drink', 'cast', 'levelUp', 'reinforce', 'advance', 'retreat', 'withdraw', 'descend', 'takeBoon', 'equipBest', 'recruit'];
/** yes/no conditions: no operator, value 1 = is, 0 = is not */
export const BOOL_CONDS = new Set<OrderCondKind>(['always', 'reprisal', 'telegraph', 'boss', 'boonOffer']);

/** How many orders the player may hold. */
export function orderSlots(state: GameState): number {
  if (!state.flags.ordersUnlocked) return 0;
  return Math.min(B.maxSlots, B.baseSlots + B.perLord * state.prestige.bossesEverKilled.length);
}

/** Condition kinds the player has earned. */
export function availableConds(state: GameState): OrderCondKind[] {
  const out: OrderCondKind[] = ['always', 'hp', 'draughts', 'marrow', 'enemyHp'];
  if (state.player.level >= 5) out.push('stamina', 'fp');
  if (state.stats.reprisals >= 1) out.push('composure', 'reprisal');
  if (state.stats.perfectDodges >= 3 || state.automation.unlocked.includes('autoDodge')) out.push('telegraph');
  if (state.stats.bossKills >= 1) out.push('boss');
  if (state.stats.kills.gte(50)) out.push('streak');
  if (state.flags.descentUnlocked) out.push('floor', 'haul', 'boonOffer');
  return out;
}
/** Action kinds the player has earned. */
export function availableActs(state: GameState): OrderActKind[] {
  const out: OrderActKind[] = ['drink', 'levelUp', 'strike', 'retreat'];
  if (state.stats.perfectDodges >= 3 || state.automation.unlocked.includes('autoDodge')) out.push('dodge');
  if (state.spellsKnown.length > 0) out.push('cast');
  if (Object.values(state.player.weapons).some((w) => w.level > 0) || (state.materials.coarseSlag ?? 0) > 0) out.push('reinforce');
  if (Object.values(state.zones).some((z) => z.cleared >= 0)) out.push('advance');
  if (state.flags.descentUnlocked) out.push('withdraw', 'descend', 'takeBoon');
  if (Object.keys(state.player.weapons).length >= 2) out.push('equipBest');
  if (state.cortege.recruited.length > 0 || state.marrow.gte(400)) out.push('recruit');
  return out;
}

/** Why a rule cannot be kept, or null. */
export function orderProblem(state: GameState, rule: Order): string | null {
  const conds = availableConds(state), acts = availableActs(state);
  if (rule.when.length === 0 || rule.when.length > 2) return 'An order has one or two conditions.';
  for (const c of rule.when) {
    if (!COND_KINDS.includes(c.kind)) return `No such condition: ${c.kind}.`;
    if (!conds.includes(c.kind)) return `You have not learned to read ${condName(c.kind)} yet.`;
    if (!Number.isFinite(c.value)) return 'A condition needs a number.';
  }
  if (!ACT_KINDS.includes(rule.then.kind)) return `No such action: ${rule.then.kind}.`;
  if (!acts.includes(rule.then.kind)) return `You cannot order ${actName(rule.then.kind)} yet.`;
  if (rule.then.kind === 'levelUp' && rule.then.arg !== undefined && rule.then.arg !== 'balanced' && !STAT_KEYS.includes(rule.then.arg as StatKey)) return 'Level which stat?';
  if (rule.then.kind === 'cast' && typeof rule.then.arg !== 'number') return 'Cast which slot?';
  return null;
}

// ---------------------------------------------------------------------------
// Reading the world
// ---------------------------------------------------------------------------

function pct(a: number, b: number): number { return b > 0 ? (a / b) * 100 : 0; }

/** Does one condition hold right now? */
export function condHolds(state: GameState, c: OrderCond): boolean {
  const p = state.player, e = state.encounter.enemy, run = state.descent.run;
  const cmp = (x: number) => (c.op === '<' ? x < c.value : x > c.value);
  const is = (b: boolean) => (c.value >= 1 ? b : !b);
  switch (c.kind) {
    case 'always': return true;
    case 'hp': return cmp(pct(p.hp, p.hpMax));
    case 'stamina': return cmp(pct(p.stamina, p.staminaMax));
    case 'fp': return cmp(pct(p.fp, p.fpMax));
    case 'draughts': return cmp(p.draughts);
    case 'marrow': return cmp(state.marrow.div(levelCost(p.level)).toNumber());
    case 'enemyHp': return !!e && cmp(pct(e.hp.toNumber(), Math.max(1, e.hpMax.toNumber())));
    case 'composure': return !!e && cmp(pct(e.strain, e.composure));
    case 'reprisal': return is(!!e && e.reprisal > 0);
    case 'telegraph': return is(!!e && e.windup > 0 && e.windup <= 0.6);
    case 'boss': return is(!!e && e.isBoss);
    case 'streak': return cmp(state.encounter.streak);
    case 'floor': return !!run && cmp(run.floor);
    case 'haul': return !!run && cmp(state.marrow.gt(0) ? run.haul.div(state.marrow).toNumber() : run.haul.gt(0) ? 1e9 : 0);
    case 'boonOffer': return is(!!run?.offer);
  }
}

function bestWeapon(state: GameState, mods: Mods): string {
  let best = state.player.weapon, bestDmg = -1;
  for (const id of Object.keys(state.player.weapons)) {
    if (!WEAPONS[id]) continue;
    const d = weaponDamage(state, mods, id).total.toNumber();
    if (d > bestDmg) { bestDmg = d; best = id; }
  }
  return best;
}

/** The engine action a rule would take now, or null when it cannot be done. */
export function orderAction(state: GameState, mods: Mods, rule: Order): Action | null {
  const p = state.player, e = state.encounter.enemy, run = state.descent.run, a = rule.then;
  switch (a.kind) {
    case 'strike': return e && e.hp.gt(0) && p.stamina >= getWeapon(p.weapon).stamina ? { type: 'click' } : null;
    case 'dodge': return e && p.dodgeCd <= 0 && p.stamina >= 7 ? { type: 'dodge' } : null;
    case 'drink': return p.draughts > 0 && p.hp < p.hpMax ? { type: 'draughts' } : null;
    case 'cast': {
      const slot = typeof a.arg === 'number' ? a.arg : 0;
      const id = p.recited[slot];
      return e && id && !(p.cooldowns[id] > 0) ? { type: 'cast', slot } : null;
    }
    case 'levelUp': {
      if (state.marrow.lt(levelCost(p.level))) return null;
      const stat = a.arg && a.arg !== 'balanced' ? (a.arg as StatKey) : STAT_KEYS.reduce((lo, k) => (p.stats[k] < p.stats[lo] ? k : lo), 'vit' as StatKey);
      return { type: 'levelUp', stat };
    }
    case 'reinforce': {
      const inst = p.weapons[p.weapon];
      if (!inst || inst.level >= 10) return null;
      const mat = reinforceMaterial(inst.level);
      if ((state.materials[mat.id] ?? 0) < mat.count || state.marrow.lt(reinforceCost(getWeapon(inst.id).region, inst.level))) return null;
      return { type: 'reinforce', weapon: p.weapon };
    }
    case 'advance': {
      if (run || state.remainsRun) return null;
      const enc = state.encounter, zp = state.zones[enc.zone], zone = getZone(enc.zone);
      if (!zp || enc.tier < 0 || zp.cleared < enc.tier || enc.tier >= zone.tiers.length - 1) return null;
      return { type: 'travel', zone: enc.zone, tier: enc.tier + 1 };
    }
    case 'retreat': return e && !run && state.encounter.tier !== 0 ? { type: 'retreat' } : (e && !run && state.encounter.zone !== state.lantern ? { type: 'retreat' } : null);
    case 'withdraw': return run && state.deathScreen <= 0 ? { type: 'descentWithdraw' } : null;
    case 'descend': return canDescend(state) === null && p.hp >= p.hpMax * 0.9 ? { type: 'descend' } : null;
    case 'takeBoon': {
      if (!run?.offer?.length) return null;
      const pref = a.arg === 'rare' ? ['rare', 'epic', 'common'] : a.arg === 'first' ? [] : ['epic', 'rare', 'common'];
      let idx = 0;
      if (pref.length) idx = run.offer.map((id) => pref.indexOf(BOONS[id]?.rarity ?? 'common')).reduce((bi, r, i, arr) => (r < arr[bi] ? i : bi), 0);
      return { type: 'chooseBoon', index: idx };
    }
    case 'equipBest': { const best = bestWeapon(state, mods); return best !== p.weapon ? { type: 'equip', weapon: best } : null; }
    case 'recruit': {
      for (const id of Object.keys(SHADES)) if (canRecruit(state, id) === null) return { type: 'recruit', shade: id };
      return null;
    }
  }
}

function cooldownFor(kind: OrderActKind): number {
  if (kind === 'strike') return B.strikeCooldown;
  if (kind === 'levelUp' || kind === 'reinforce' || kind === 'equipBest' || kind === 'recruit' || kind === 'advance') return B.economyCooldown;
  return B.cooldown;
}

/** Evaluate every order in turn; fire the ones that hold and can act. */
export function runOrders(state: GameState, mods: Mods, events: GameEvent[], dt: number) {
  const rules = state.orders.rules;
  if (rules.length === 0) return;
  const slots = orderSlots(state);
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (r.cd > 0) r.cd = Math.max(0, r.cd - dt);
    if (!r.on || r.cd > 0 || i >= slots) continue;
    if (state.deathScreen > 0) continue;
    if (!r.when.every((c) => condHolds(state, c))) continue;
    const action = orderAction(state, mods, r);
    if (!action) continue;
    const before = events.length;
    applyAction(state, action, events, mods);
    // an action the engine refused (an error event) does not count as fired
    if (events.slice(before).some((e) => e.type === 'error')) { events.splice(before); r.cd = cooldownFor(r.then.kind); continue; }
    r.fired++;
    r.cd = cooldownFor(r.then.kind);
    events.push({ type: 'orderFired', id: r.id, action: r.then.kind });
  }
}

// ---------------------------------------------------------------------------
// Names for the chips
// ---------------------------------------------------------------------------

export function condName(k: OrderCondKind): string {
  return ({ always: 'always', hp: 'HP', stamina: 'Stamina', fp: 'FP', draughts: 'Draughts', marrow: 'Marrow', enemyHp: 'Enemy HP', composure: 'Composure', reprisal: 'Reprisal open', telegraph: 'Attack coming', boss: 'A lord', streak: 'Streak', floor: 'Stair floor', haul: 'Haul', boonOffer: 'Boons offered' } as Record<OrderCondKind, string>)[k];
}
export function actName(k: OrderActKind): string {
  return ({ strike: 'Strike', dodge: 'Dodge', drink: 'Drink', cast: 'Cast', levelUp: 'Level up', reinforce: 'Reinforce', advance: 'Advance', retreat: 'Retreat', withdraw: 'Withdraw', descend: 'Descend', takeBoon: 'Take a boon', equipBest: 'Equip the best', recruit: 'Recruit a shade' } as Record<OrderActKind, string>)[k];
}
/** A condition in words: "HP < 35%", "Marrow > 2× a level", "Reprisal open". */
export function condText(c: OrderCond): string {
  const n = condName(c.kind);
  if (BOOL_CONDS.has(c.kind)) return c.kind === 'always' ? 'always' : c.value >= 1 ? n : `not ${n.toLowerCase()}`;
  const unit = c.kind === 'marrow' ? '× a level' : c.kind === 'haul' ? '× the purse' : c.kind === 'draughts' || c.kind === 'streak' || c.kind === 'floor' ? '' : '%';
  return `${n} ${c.op} ${c.value}${unit}`;
}
export function actText(a: { kind: OrderActKind; arg?: string | number }): string {
  const n = actName(a.kind);
  if (a.kind === 'cast') return `${n} slot ${(typeof a.arg === 'number' ? a.arg : 0) + 1}`;
  if (a.kind === 'levelUp') return a.arg && a.arg !== 'balanced' ? `Level ${({ vit: 'Vitality', bre: 'Breath', mig: 'Might', fin: 'Finesse', ins: 'Insight', dev: 'Devotion' } as Record<string, string>)[a.arg as string] ?? a.arg}` : 'Level the lowest stat';
  if (a.kind === 'takeBoon') return a.arg === 'rare' ? 'Take the rarest boon, rare first' : a.arg === 'first' ? 'Take the first boon' : 'Take the rarest boon';
  return n;
}

// ---------------------------------------------------------------------------
// Actions and the tick
// ---------------------------------------------------------------------------

registerActionHandler((state, action, events) => {
  if (action.type !== 'setOrders') return false;
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  if (!state.flags.ordersUnlocked) return err('You have no Standing Orders yet.');
  if (action.rules.length > orderSlots(state)) return err(`You may hold ${orderSlots(state)} orders.`);
  const seen = new Set<number>();
  const rules: Order[] = [];
  for (const raw of action.rules) {
    const r: Order = { id: raw.id > 0 && !seen.has(raw.id) ? raw.id : state.orders.nextId++, when: raw.when.map((c) => ({ kind: c.kind, op: c.op === '<' ? '<' : '>', value: Number(c.value) })), then: { kind: raw.then.kind, arg: raw.then.arg }, on: raw.on !== false, fired: state.orders.rules.find((x) => x.id === raw.id)?.fired ?? 0, cd: 0 };
    seen.add(r.id);
    const why = orderProblem(state, r);
    if (why) return err(why);
    rules.push(r);
  }
  state.orders.rules = rules;
  state.orders.nextId = Math.max(state.orders.nextId, ...rules.map((r) => r.id + 1));
  return true;
});

registerTickHook((state, mods, events, dt) => { if (dt > 0) runOrders(state, mods, events, dt); });
