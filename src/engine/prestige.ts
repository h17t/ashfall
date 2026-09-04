/**
 * Kindling (prestige 1): reset the cycle, keep Humanity, the tree, covenant standing,
 * knowledge. Also the Humanity tree purchases and the auto-level automation.
 */
import { D, ZERO, Decimal, safe } from './num';
import { BALANCE } from '@/content/balance';
import { TREE, ZONE_ORDER, STARTING_WEAPON, getZone, getWeapon, BOSSES } from '@/content';
import type { GameState, GameEvent, StatKey } from './types';
import { STAT_KEYS } from './types';
import type { Mods } from './mods';
import { computeMods } from './mods';
import { newPlayer, newZoneProgress } from './state';
import { refreshPlayerMaxes } from './combat';
import { levelCost } from './formulas';
import { registerActionHandler, registerTickHook } from './registry';

export function humanityPreview(state: GameState, mods: Mods = computeMods(state)): Decimal {
  const b = BALANCE.prestige;
  const souls = state.stats.cycleSouls;
  if (souls.lte(0)) return ZERO;
  const base = souls.div(b.humanityDivisor).pow(b.humanityExponent);
  const bossBonus = Math.pow(b.humanityPerBoss, state.stats.cycleBosses);
  // Depth compounds: pushing one tier deeper before kindling is worth ~6% more Humanity.
  const depth = Math.pow(1.06, state.stats.cycleDeepest);
  return safe(base.mul(bossBonus).mul(depth).mul(mods.humanityMult).floor());
}

export function canKindle(state: GameState): string | null {
  if (state.stats.cycleBosses < 1) return 'The flame needs a lord\'s soul to catch. Fell a region boss first.';
  if (humanityPreview(state).lt(BALANCE.prestige.minHumanity)) return 'Too little has burned. Kindling now would gather no Humanity.';
  return null;
}

export interface KindleLedger {
  keep: string[];
  lose: string[];
}

export function kindleLedger(state: GameState, mods: Mods = computeMods(state)): KindleLedger {
  const keep = ['Humanity and the Humanity tree', 'Covenant standing', 'Spells you know', 'Boss soul choices (their weapon returns when the boss falls again)', 'Recruited phantoms (levels reset)', 'Phantom slots earned from lords', 'Automation you have unlocked', 'Bestiary and records'];
  const lose = ['Souls', 'Soul level and stats', 'Zone progress and lit bonfires', 'Materials, Estus upgrades, attunement purchases, flame level', 'Covenant rites bought this cycle'];
  if (mods.keepWeapons) keep.push('Weapons, reinforcement and infusions (Unforgotten Steel)'); else lose.push('Weapons and their reinforcement');
  if (mods.startLevels > 0) keep.push(`${mods.startLevels} starting levels (Remembered Strength)`);
  if (mods.startSouls > 0) keep.push(`${mods.startSouls} starting souls (Ember in the Palm)`);
  if (mods.startWeaponLevel > 0) keep.push(`Weapons start at +${mods.startWeaponLevel} (Remembered Steel)`);
  return { keep, lose };
}

/** Perform the Kindling. */
export function kindle(state: GameState, events: GameEvent[], mods: Mods = computeMods(state)) {
  const gained = humanityPreview(state, mods);
  const pr = state.prestige;
  pr.humanity = pr.humanity.add(gained);
  pr.humanityTotal = pr.humanityTotal.add(gained);
  pr.lastKindleGain = gained;
  pr.kindles++;
  pr.cycleBossesSpawned = [];
  // ---- player ----
  const oldWeapons = state.player.weapons;
  const oldWeapon = state.player.weapon;
  state.player = newPlayer();
  if (mods.keepWeapons) {
    state.player.weapons = oldWeapons;
    state.player.weapon = oldWeapon;
  } else {
    state.player.weapons = { [STARTING_WEAPON]: { id: STARTING_WEAPON, level: mods.startWeaponLevel, infusion: 'none' } };
  }
  // starting levels spread round-robin across stats
  for (let i = 0; i < mods.startLevels; i++) {
    const k = STAT_KEYS[i % STAT_KEYS.length];
    state.player.stats[k]++;
    state.player.level++;
  }
  state.souls = D(mods.startSouls);
  state.materials = {};
  state.bossSouls = {};
  // ---- world ----
  state.zones = {};
  state.unlockedZones = [ZONE_ORDER[0]];
  state.bonfire = ZONE_ORDER[0];
  state.bonfiresLit = [ZONE_ORDER[0]];
  state.encounter = { zone: ZONE_ORDER[0], tier: 0, enemy: null, respawnIn: 0.8, streak: 0, t: 0 };
  state.bloodstain = null;
  state.corpseRun = null;
  state.deathScreen = 0;
  // ---- squad ----
  for (const ph of state.squad.phantoms) { ph.level = 1; ph.xp = ZERO; ph.weapon = null; ph.actIn = 1; ph.retreat = 0; }
  state.squad.huntAuto = true;
  state.squad.killAcc = 0;
  state.squad.matAcc = {};
  state.squad.buff = { mult: 1, t: 0 };
  // ---- covenant: standing stays, rites reset (unless Oaths Remembered) ----
  if (!state.automation.unlocked.includes('keepRites')) state.covenant.upgrades = {};
  // ---- cycle stats ----
  state.stats.cycleSouls = ZERO;
  state.stats.cycleKills = ZERO;
  state.stats.cycleTime = 0;
  state.stats.cycleDeepest = 0;
  state.stats.cycleBosses = 0;
  state.flags.hasCatalyst = false;
  state.flags.hasFlame = false;
  state.flags.infusionUnlocked = false;
  // Sigil gifts: the chime and the hexes return every cycle
  if (mods.unlocks.has('hex')) {
    state.flags.hexUnlocked = true;
    state.player.weapons.abyssalChime = state.player.weapons.abyssalChime ?? { id: 'abyssalChime', level: mods.startWeaponLevel, infusion: 'none' };
  }
  refreshPlayerMaxes(state, computeMods(state));
  events.push({ type: 'kindled', humanity: gained });
  events.push({ type: 'unlock', what: 'kindle', text: `New Game+${pr.kindles}. The world is crueler; so are you.` });
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export function nodeCost(state: GameState, id: string): Decimal {
  const n = TREE[id];
  const rank = state.prestige.tree[id] ?? 0;
  return D(n.cost).mul(Decimal.pow(n.costGrowth, rank)).ceil();
}

export function nodeBlocked(state: GameState, id: string): string | null {
  const n = TREE[id];
  if (!n) return 'No such node.';
  const rank = state.prestige.tree[id] ?? 0;
  if (rank >= n.maxRank) return 'At its height.';
  for (const r of n.requires) if ((state.prestige.tree[r] ?? 0) <= 0) return `Requires ${TREE[r].name}.`;
  if (state.prestige.humanity.lt(nodeCost(state, id))) return 'Not enough Humanity.';
  return null;
}

registerActionHandler((state, action, events, mods) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'kindle': {
      const why = canKindle(state);
      if (why) return err(why);
      kindle(state, events, mods);
      return true;
    }
    case 'buyTreeNode': {
      const why = nodeBlocked(state, action.node);
      if (why) return err(why);
      state.prestige.humanity = state.prestige.humanity.sub(nodeCost(state, action.node));
      state.prestige.tree[action.node] = (state.prestige.tree[action.node] ?? 0) + 1;
      const n = TREE[action.node];
      events.push({ type: 'notice', text: `${n.name} ${state.prestige.tree[action.node]}/${n.maxRank}.` });
      // automation unlock flags
      for (const k of Object.keys(n.effect)) if (k.startsWith('unlock')) {
        const key = k.slice(6).replace(/^./, (c) => c.toLowerCase());
        if (!state.automation.unlocked.includes(key)) state.automation.unlocked.push(key);
        (state.automation as any)[key] = true;
      }
      refreshPlayerMaxes(state, computeMods(state));
      return true;
    }
  }
  return false;
});

// ---------------------------------------------------------------------------
// Auto-level
// ---------------------------------------------------------------------------

registerTickHook((state, mods, events) => {
  if (!state.automation.autoLevel || !mods.unlocks.has('autoLevel')) return;
  if (state.deathScreen > 0) return;
  let guard = 0;
  while (guard++ < 5) {
    const cost = levelCost(state.player.level);
    if (state.souls.lt(cost)) break;
    const pick = state.automation.autoLevelStat;
    const stat: StatKey = pick === 'balanced' ? balancedPick(state) : pick;
    state.souls = state.souls.sub(cost);
    state.player.stats[stat]++;
    state.player.level++;
    events.push({ type: 'levelUp', stat, level: state.player.level });
  }
  refreshPlayerMaxes(state, mods);
});

function balancedPick(state: GameState): StatKey {
  // vigor / endurance / the equipped weapon's best scaling stat, round-robin
  const def = getWeapon(state.player.weapon);
  const order = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];
  let best: StatKey = 'str';
  let bg = -1;
  for (const [k, g] of Object.entries(def.scaling)) { const i = order.indexOf(g as string); if (i > bg) { bg = i; best = k as StatKey; } }
  const c = state.player.level % 3;
  return c === 0 ? 'vig' : c === 1 ? 'end' : best;
}

export { TREE, BOSSES };
