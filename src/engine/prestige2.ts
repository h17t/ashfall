/**
 * Deep meta: the Dark Severing (prestige 2) and the Unmaking (prestige 3), plus the top of
 * the automation ladder (auto-snuff, auto-severing).
 */
import { D, ZERO, Decimal, safe } from './num';
import { BALANCE } from '@/content/balance';
import { SEVERING_UNLOCKS, TREE, ZONE_ORDER, getZone } from '@/content';
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { computeMods } from './mods';
import { snuff, vestigePreview, canSnuff, wakingName } from './prestige';
import { registerActionHandler, registerTickHook } from './registry';
import { refreshPlayerMaxes } from './combat';

// ---------------------------------------------------------------------------
// Dark Severing
// ---------------------------------------------------------------------------

export function threadsPreview(state: GameState, mods: Mods = computeMods(state)): Decimal {
  const b = BALANCE.prestige;
  const h = state.prestige.vestigeTotal;
  if (h.lte(0)) return ZERO;
  const base = h.div(b.threadDivisor).pow(b.threadExponent);
  const cycles = Math.pow(Math.max(1, state.prestige.wakings) / b.severingAt, 0.5);
  return safe(base.mul(cycles).mul(1 + 0.1 * state.prestige.nadirRecord).floor());
}

export function canSever(state: GameState): string | null {
  if (state.prestige.wakings < BALANCE.prestige.severingAt) return `The Severing opens in ${wakingName(BALANCE.prestige.severingAt)}. You are in ${wakingName(state.prestige.wakings)}.`;
  if (threadsPreview(state).lt(1)) return 'Not enough has been gathered to mark.';
  return null;
}

export function severLedger(state: GameState, mods: Mods = computeMods(state)): { keep: string[]; lose: string[] } {
  const keep = ['Severing Marks and every Severing unlock', 'Creed standing', 'Spells known and boss-wisp choices', 'Recruited shades and lord-earned slots', 'Every automation unlocked', 'The Nadir depth record', 'Bestiary and records'];
  const lose = ['Vestige held', 'All Wakings (the world starts anew)', 'Marrow, level, weapons, zone progress, everything a Snuffing takes'];
  const keepFrac = Math.min(1, keepTreeFraction(state));
  if (keepFrac > 0) keep.push(`${Math.round(keepFrac * 100)}% of every Vestige tree rank (Deep Roots)`); else lose.push('The Vestige tree');
  if (mods.unlocks.has('hex')) keep.push('The Nadiral Chime, placed in your hand each cycle');
  const startNg = startKindles(state);
  if (startNg > 0) keep.push(`Start in ${wakingName(startNg)} (Familiar Ash)`);
  return { keep, lose };
}

function keepTreeFraction(state: GameState): number {
  const rank = state.prestige.severingUnlocks.keepTree ?? 0;
  return 0.25 * rank;
}
function startKindles(state: GameState): number {
  return state.prestige.severingUnlocks.startKindles ?? 0;
}

export function sever(state: GameState, events: GameEvent[], mods: Mods = computeMods(state)) {
  const marks = threadsPreview(state, mods);
  const pr = state.prestige;
  pr.severings++;
  pr.threads = pr.threads.add(marks);
  pr.lastSeverGain = marks;
  // tree: keep a fraction of ranks
  const frac = keepTreeFraction(state);
  const kept: Record<string, number> = {};
  for (const [id, rank] of Object.entries(pr.tree)) {
    const k = Math.floor(rank * frac);
    if (k > 0) kept[id] = k;
  }
  pr.tree = kept;
  pr.vestige = ZERO;
  pr.vestigeTotal = ZERO;
  pr.wakings = startKindles(state);
  // a Snuffing's worth of reset on top (uses fresh mods: the tree just changed)
  const fresh = computeMods(state);
  if (state.automation.unlocked.includes('keepWeaponsSigil')) fresh.keepWeapons = true;
  snuff(state, [], fresh);
  pr.wakings = startKindles(state);
  events.push({ type: 'unlock', what: 'severing', text: `The Dark Severing is carved. ${marks.toString()} Severing Mark${marks.eq(1) ? '' : 's'} gathered. The world begins again, and remembers you.` });
  events.push({ type: 'notice', text: `Severing ${pr.severings}.` });
  grantSigilGifts(state, events);
}

/** Things Severing unlocks hand you at the start of a cycle (the chime, the hex school). */
export function grantSigilGifts(state: GameState, events: GameEvent[]) {
  const mods = computeMods(state);
  if (mods.unlocks.has('hex')) {
    state.flags.hexUnlocked = true;
    if (!state.player.weapons.nadirChime) state.player.weapons.nadirChime = { id: 'nadirChime', level: mods.startWeaponLevel, infusion: 'none' };
    for (const id of ['nadirOrb', 'deadAgain', 'numbness']) if (!state.spellsKnown.includes(id)) state.spellsKnown.push(id);
  }
  refreshPlayerMaxes(state, mods);
}

export function severingUnlockCost(state: GameState, id: string): Decimal {
  const u = SEVERING_UNLOCKS[id];
  const rank = state.prestige.severingUnlocks[id] ?? 0;
  return D(u.cost).mul(Decimal.pow(1.6, rank)).ceil();
}

export function severingUnlockBlocked(state: GameState, id: string): string | null {
  const u = SEVERING_UNLOCKS[id];
  if (!u) return 'No such mark.';
  const rank = state.prestige.severingUnlocks[id] ?? 0;
  if (rank >= u.maxRank) return 'Complete.';
  for (const r of u.requires) if ((state.prestige.severingUnlocks[r] ?? 0) <= 0) return `Requires ${SEVERING_UNLOCKS[r].name}.`;
  if (state.prestige.threads.lt(severingUnlockCost(state, id))) return 'Not enough Severing Marks.';
  return null;
}

// ---------------------------------------------------------------------------
// the Unmaking
// ---------------------------------------------------------------------------

export function unmakingCost(state: GameState): Decimal {
  return D(8).mul(Decimal.pow(1.7, state.prestige.unmaking)).ceil();
}

export function canUnmake(state: GameState): string | null {
  if (state.prestige.severings < BALANCE.prestige.ageOfDarkAt) return `The Unmaking begins after ${BALANCE.prestige.ageOfDarkAt} Severings. You have carved ${state.prestige.severings}.`;
  if (state.prestige.threads.lt(unmakingCost(state))) return `Requires ${unmakingCost(state).toString()} Severing Marks.`;
  return null;
}

/** What each Dark Level brings, beyond ×1.5 damage & marrow and ×1.25 Vestige. */
export const UNMAKING_GIFTS: Record<number, { name: string; desc: string; unlock?: string }> = {
  1: { name: 'The Unmaking', desc: 'The fire is a memory. Snuffing and the Severing now tend themselves: auto-Snuff and auto-Severing are yours.', unlock: 'autoSever' },
  2: { name: 'Oaths Remembered', desc: 'Creed rites bought this cycle survive Snuffing.', unlock: 'keepRites' },
  3: { name: 'The Long Descent', desc: 'The Nadir opens at your record depth instead of the first landing.', unlock: 'abyssResume' },
  4: { name: 'Dark Lord', desc: 'Weapons survive the Severing itself.', unlock: 'keepWeaponsSigil' },
  5: { name: 'The Last Wick', desc: 'The Watcher yields double Dark the Wick, and every lord drops one.', unlock: 'emberLords' },
};

export function unmake(state: GameState, events: GameEvent[]) {
  const cost = unmakingCost(state);
  state.prestige.threads = state.prestige.threads.sub(cost);
  state.prestige.unmaking++;
  const gift = UNMAKING_GIFTS[state.prestige.unmaking];
  if (gift?.unlock && !state.automation.unlocked.includes(gift.unlock)) state.automation.unlocked.push(gift.unlock);
  if (state.prestige.unmaking === 1) {
    for (const k of ['autoSnuff', 'autoSever']) if (!state.automation.unlocked.includes(k)) state.automation.unlocked.push(k);
  }
  events.push({ type: 'unlock', what: 'dark:' + state.prestige.unmaking, text: gift ? `${gift.name}: ${gift.desc}` : `Dark Level ${state.prestige.unmaking}. Everything, again, ×1.5.` });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

registerActionHandler((state, action, events, mods) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'sever': {
      const why = canSever(state);
      if (why) return err(why);
      sever(state, events, mods);
      return true;
    }
    case 'buySeveringUnlock': {
      const why = severingUnlockBlocked(state, action.unlock);
      if (why) return err(why);
      state.prestige.threads = state.prestige.threads.sub(severingUnlockCost(state, action.unlock));
      state.prestige.severingUnlocks[action.unlock] = (state.prestige.severingUnlocks[action.unlock] ?? 0) + 1;
      const u = SEVERING_UNLOCKS[action.unlock];
      for (const k of Object.keys(u.effect)) if (k.startsWith('unlock')) {
        const key = k.slice(6).replace(/^./, (c) => c.toLowerCase());
        if (!state.automation.unlocked.includes(key)) state.automation.unlocked.push(key);
        if (key in state.automation) (state.automation as any)[key] = true;
      }
      if (action.unlock === 'nadir') {
        // opens the road below the Rendering Works if the Lord is already down this cycle
        const renderworks = state.zones.renderworks;
        if (renderworks && renderworks.bossKills > 0 && !state.unlockedZones.includes('nadir')) { state.unlockedZones.push('nadir'); events.push({ type: 'zoneUnlocked', zone: 'nadir' }); }
      }
      grantSigilGifts(state, events);
      events.push({ type: 'notice', text: `${u.name} ${state.prestige.severingUnlocks[action.unlock]}/${u.maxRank}.` });
      return true;
    }
    case 'unmake': {
      const why = canUnmake(state);
      if (why) return err(why);
      unmake(state, events);
      return true;
    }
  }
  return false;
});

// ---------------------------------------------------------------------------
// Automation: auto-snuff, auto-severing (checked every ~5s of game time)
// ---------------------------------------------------------------------------

registerTickHook((state, mods, events) => {
  if (Math.floor(state.t * 10) % 50 !== 0) return;
  const a = state.automation;
  // Auto-Snuff: when this cycle would gather at least `autoSnuffAt` × what the last Snuff gathered
  // (and at least 10), after a minimum of 20 minutes. Each automatic cycle must beat the last, so the
  // cadence spaces itself out instead of resetting you every minute.
  if (a.autoSnuff && mods.unlocks.has('autoSnuff') && !canSnuff(state) && state.stats.cycleTime > 20 * 60) {
    const gain = vestigePreview(state, mods);
    const threshold = state.prestige.lastSnuffGain.mul(a.autoSnuffAt);
    if (gain.gte(threshold) && gain.gte(10)) {
      snuff(state, events, mods);
      grantSigilGifts(state, events);
    }
  }
  if (a.autoSever && mods.unlocks.has('autoSever') && !canSever(state)) {
    const gain = threadsPreview(state, mods);
    if (gain.gte(5) && gain.gte(state.prestige.lastSeverGain.mul(1.5))) sever(state, events, mods);
  }
  // the Nadir resumes at record depth (Dark Level 3)
  if (mods.unlocks.has('abyssResume') && state.prestige.nadirDepth < state.prestige.nadirRecord && state.encounter.zone !== 'nadir') {
    state.prestige.nadirDepth = state.prestige.nadirRecord;
  }
});
