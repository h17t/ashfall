/**
 * Snuffing (prestige 1): reset the cycle, keep Vestige, the tree, creed standing,
 * knowledge. Also the Vestige tree purchases and the auto-level automation.
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

export function vestigePreview(state: GameState, mods: Mods = computeMods(state)): Decimal {
  const b = BALANCE.prestige;
  const marrow = state.stats.cycleMarrow;
  if (marrow.lte(0)) return ZERO;
  const base = marrow.div(b.humanityDivisor).pow(b.humanityExponent);
  const bossBonus = Math.pow(b.humanityPerBoss, state.stats.cycleBosses);
  // Depth compounds: pushing one tier deeper before rendering is worth ~6% more Vestige.
  const depth = Math.pow(1.06, state.stats.cycleDeepest);
  return safe(base.mul(bossBonus).mul(depth).mul(mods.humanityMult).floor());
}

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];
/** The name of a waking: the run you started in is the First Waking; each Snuffing begins the next. */
export function wakingName(wakings: number): string {
  return ORDINALS[wakings] ? `the ${ORDINALS[wakings]} Waking` : `the ${wakings + 1}th Waking`;
}

export function canSnuff(state: GameState): string | null {
  if (state.descent.run) return 'You are on the stair. Climb out first.';
  if (state.stats.cycleBosses < 1) return 'The flame needs a lord\'s Keepsake to catch. Fell a region boss first.';
  if (vestigePreview(state).lt(BALANCE.prestige.minHumanity)) return 'Too little has burned. Snuffing now would gather no Vestige.';
  return null;
}

export interface KindleLedger {
  keep: string[];
  lose: string[];
}

export function snuffLedger(state: GameState, mods: Mods = computeMods(state)): KindleLedger {
  const keep = ['Vestige and the Vestige tree', 'Creed standing', 'Spells you know', 'Keepsake choices (their weapon returns when the boss falls again)', 'Recruited shades (levels reset)', 'Shade slots earned from lords', 'Automation you have unlocked', 'Bestiary and records'];
  const lose = ['Marrow', 'Level and stats', 'Zone progress and lit lanterns', 'Materials, Tallowdraught upgrades, recitation purchases, flame level', 'Creed rites bought this cycle'];
  if (mods.keepWeapons) keep.push('Weapons, reinforcement and infusions (Unforgotten Steel)'); else lose.push('Weapons and their reinforcement');
  if (mods.startLevels > 0) keep.push(`${mods.startLevels} starting levels (Remembered Might)`);
  if (mods.startSouls > 0) keep.push(`${mods.startSouls} starting marrow (Wick in the Palm)`);
  if (mods.startWeaponLevel > 0) keep.push(`Weapons start at +${mods.startWeaponLevel} (Remembered Steel)`);
  return { keep, lose };
}

/** Perform the Snuffing. */
export function snuff(state: GameState, events: GameEvent[], mods: Mods = computeMods(state)) {
  const gained = vestigePreview(state, mods);
  const pr = state.prestige;
  pr.vestige = pr.vestige.add(gained);
  pr.vestigeTotal = pr.vestigeTotal.add(gained);
  pr.lastSnuffGain = gained;
  pr.wakings++;
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
  state.marrow = D(mods.startSouls);
  state.materials = {};
  state.keepsakes = {};
  // ---- world ----
  state.zones = {};
  state.unlockedZones = [ZONE_ORDER[0]];
  state.lantern = ZONE_ORDER[0];
  state.lanternsLit = [ZONE_ORDER[0]];
  state.encounter = { zone: ZONE_ORDER[0], tier: 0, enemy: null, respawnIn: 0.8, streak: 0, t: 0 };
  state.remains = null;
  state.remainsRun = null;
  state.deathScreen = 0;
  // ---- cortege ----
  for (const ph of state.cortege.shades) { ph.level = 1; ph.xp = ZERO; ph.weapon = null; ph.actIn = 1; ph.retreat = 0; }
  state.cortege.huntAuto = true;
  state.cortege.killAcc = 0;
  state.cortege.matAcc = {};
  state.cortege.buff = { mult: 1, t: 0 };
  // ---- creed: standing stays, rites reset (unless Oaths Remembered) ----
  if (!state.automation.unlocked.includes('keepRites')) state.creed.upgrades = {};
  // ---- cycle stats ----
  state.stats.cycleMarrow = ZERO;
  state.stats.cycleKills = ZERO;
  state.stats.cycleTime = 0;
  state.stats.cycleDeepest = 0;
  state.stats.cycleBosses = 0;
  state.flags.hasCatalyst = false;
  state.flags.hasBrand = false;
  state.flags.infusionUnlocked = false;
  // Severing gifts: the chime and the hexes return every cycle
  if (mods.unlocks.has('hex')) {
    state.flags.hexUnlocked = true;
    state.player.weapons.nadirChime = state.player.weapons.nadirChime ?? { id: 'nadirChime', level: mods.startWeaponLevel, infusion: 'none' };
  }
  refreshPlayerMaxes(state, computeMods(state));
  events.push({ type: 'snuffed', vestige: gained });
  events.push({ type: 'unlock', what: 'snuff', text: `New Game+${pr.wakings}. The world is crueler; so are you.` });
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
  if (state.prestige.vestige.lt(nodeCost(state, id))) return 'Not enough Vestige.';
  return null;
}

registerActionHandler((state, action, events, mods) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'snuff': {
      const why = canSnuff(state);
      if (why) return err(why);
      snuff(state, events, mods);
      return true;
    }
    case 'buyTreeNode': {
      const why = nodeBlocked(state, action.node);
      if (why) return err(why);
      state.prestige.vestige = state.prestige.vestige.sub(nodeCost(state, action.node));
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
    if (state.marrow.lt(cost)) break;
    const pick = state.automation.autoLevelStat;
    const stat: StatKey = pick === 'balanced' ? balancedPick(state) : pick;
    state.marrow = state.marrow.sub(cost);
    state.player.stats[stat]++;
    state.player.level++;
    events.push({ type: 'levelUp', stat, level: state.player.level });
  }
  refreshPlayerMaxes(state, mods);
});

function balancedPick(state: GameState): StatKey {
  // vitality / breath / the equipped weapon's best scaling stat, round-robin
  const def = getWeapon(state.player.weapon);
  const order = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];
  let best: StatKey = 'mig';
  let bg = -1;
  for (const [k, g] of Object.entries(def.scaling)) { const i = order.indexOf(g as string); if (i > bg) { bg = i; best = k as StatKey; } }
  const c = state.player.level % 3;
  return c === 0 ? 'vit' : c === 1 ? 'bre' : best;
}

export { TREE, BOSSES };
