/**
 * Deep meta: the Dark Sigil (prestige 2) and the Age of Dark (prestige 3), plus the top of
 * the automation ladder (auto-kindle, auto-sigil).
 */
import { D, ZERO, Decimal, safe } from './num';
import { BALANCE } from '@/content/balance';
import { SIGIL_UNLOCKS, TREE, ZONE_ORDER, getZone } from '@/content';
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { computeMods } from './mods';
import { kindle, humanityPreview, canKindle } from './prestige';
import { registerActionHandler, registerTickHook } from './registry';
import { refreshPlayerMaxes } from './combat';

// ---------------------------------------------------------------------------
// Dark Sigil
// ---------------------------------------------------------------------------

export function sigilMarksPreview(state: GameState, mods: Mods = computeMods(state)): Decimal {
  const b = BALANCE.prestige;
  const h = state.prestige.humanityTotal;
  if (h.lte(0)) return ZERO;
  const base = h.div(b.sigilMarkDivisor).pow(b.sigilMarkExponent);
  const cycles = Math.pow(Math.max(1, state.prestige.kindles) / b.sigilAt, 0.5);
  return safe(base.mul(cycles).mul(1 + 0.1 * state.prestige.abyssRecord).floor());
}

export function canSigil(state: GameState): string | null {
  if (state.prestige.kindles < BALANCE.prestige.sigilAt) return `The Sigil opens at NG+${BALANCE.prestige.sigilAt}. You are at NG+${state.prestige.kindles}.`;
  if (sigilMarksPreview(state).lt(1)) return 'Not enough has been gathered to mark.';
  return null;
}

export function sigilLedger(state: GameState, mods: Mods = computeMods(state)): { keep: string[]; lose: string[] } {
  const keep = ['Sigil Marks and every Sigil unlock', 'Covenant standing', 'Spells known and boss-soul choices', 'Recruited phantoms and lord-earned slots', 'Every automation unlocked', 'The Abyss depth record', 'Bestiary and records'];
  const lose = ['Humanity held', 'All NG+ cycles (the world starts anew)', 'Souls, level, weapons, zone progress, everything a Kindling takes'];
  const keepFrac = Math.min(1, keepTreeFraction(state));
  if (keepFrac > 0) keep.push(`${Math.round(keepFrac * 100)}% of every Humanity tree rank (Deep Roots)`); else lose.push('The Humanity tree');
  if (mods.unlocks.has('hex')) keep.push('The Abyssal Chime, placed in your hand each cycle');
  const startNg = startKindles(state);
  if (startNg > 0) keep.push(`Start at NG+${startNg} (Familiar Ash)`);
  return { keep, lose };
}

function keepTreeFraction(state: GameState): number {
  const rank = state.prestige.sigilUnlocks.keepTree ?? 0;
  return 0.25 * rank;
}
function startKindles(state: GameState): number {
  return state.prestige.sigilUnlocks.startKindles ?? 0;
}

export function darkSigil(state: GameState, events: GameEvent[], mods: Mods = computeMods(state)) {
  const marks = sigilMarksPreview(state, mods);
  const pr = state.prestige;
  pr.sigils++;
  pr.sigilMarks = pr.sigilMarks.add(marks);
  pr.lastSigilGain = marks;
  // tree: keep a fraction of ranks
  const frac = keepTreeFraction(state);
  const kept: Record<string, number> = {};
  for (const [id, rank] of Object.entries(pr.tree)) {
    const k = Math.floor(rank * frac);
    if (k > 0) kept[id] = k;
  }
  pr.tree = kept;
  pr.humanity = ZERO;
  pr.humanityTotal = ZERO;
  pr.kindles = startKindles(state);
  // a Kindling's worth of reset on top (uses fresh mods: the tree just changed)
  const fresh = computeMods(state);
  if (state.automation.unlocked.includes('keepWeaponsSigil')) fresh.keepWeapons = true;
  kindle(state, [], fresh);
  pr.kindles = startKindles(state);
  events.push({ type: 'unlock', what: 'sigil', text: `The Dark Sigil is carved. ${marks.toString()} Sigil Mark${marks.eq(1) ? '' : 's'} gathered. The world begins again, and remembers you.` });
  events.push({ type: 'notice', text: `Sigil ${pr.sigils}.` });
  grantSigilGifts(state, events);
}

/** Things Sigil unlocks hand you at the start of a cycle (the chime, the hex school). */
export function grantSigilGifts(state: GameState, events: GameEvent[]) {
  const mods = computeMods(state);
  if (mods.unlocks.has('hex')) {
    state.flags.hexUnlocked = true;
    if (!state.player.weapons.abyssalChime) state.player.weapons.abyssalChime = { id: 'abyssalChime', level: mods.startWeaponLevel, infusion: 'none' };
    for (const id of ['darkOrb', 'deadAgain', 'numbness']) if (!state.spellsKnown.includes(id)) state.spellsKnown.push(id);
  }
  refreshPlayerMaxes(state, mods);
}

export function sigilUnlockCost(state: GameState, id: string): Decimal {
  const u = SIGIL_UNLOCKS[id];
  const rank = state.prestige.sigilUnlocks[id] ?? 0;
  return D(u.cost).mul(Decimal.pow(1.6, rank)).ceil();
}

export function sigilUnlockBlocked(state: GameState, id: string): string | null {
  const u = SIGIL_UNLOCKS[id];
  if (!u) return 'No such mark.';
  const rank = state.prestige.sigilUnlocks[id] ?? 0;
  if (rank >= u.maxRank) return 'Complete.';
  for (const r of u.requires) if ((state.prestige.sigilUnlocks[r] ?? 0) <= 0) return `Requires ${SIGIL_UNLOCKS[r].name}.`;
  if (state.prestige.sigilMarks.lt(sigilUnlockCost(state, id))) return 'Not enough Sigil Marks.';
  return null;
}

// ---------------------------------------------------------------------------
// Age of Dark
// ---------------------------------------------------------------------------

export function darkLevelCost(state: GameState): Decimal {
  return D(8).mul(Decimal.pow(1.7, state.prestige.darkLevel)).ceil();
}

export function canAgeOfDark(state: GameState): string | null {
  if (state.prestige.sigils < BALANCE.prestige.ageOfDarkAt) return `The Age of Dark begins after ${BALANCE.prestige.ageOfDarkAt} Sigils. You have carved ${state.prestige.sigils}.`;
  if (state.prestige.sigilMarks.lt(darkLevelCost(state))) return `Requires ${darkLevelCost(state).toString()} Sigil Marks.`;
  return null;
}

/** What each Dark Level brings, beyond ×1.5 damage & souls and ×1.25 Humanity. */
export const DARK_LEVEL_GIFTS: Record<number, { name: string; desc: string; unlock?: string }> = {
  1: { name: 'The Age of Dark', desc: 'The fire is a memory. Kindling and the Sigil now tend themselves: auto-Kindle and auto-Sigil are yours.', unlock: 'autoSigil' },
  2: { name: 'Oaths Remembered', desc: 'Covenant rites bought this cycle survive Kindling.', unlock: 'keepRites' },
  3: { name: 'The Long Descent', desc: 'The Abyss opens at your record depth instead of the first landing.', unlock: 'abyssResume' },
  4: { name: 'Dark Lord', desc: 'Weapons survive the Sigil itself.', unlock: 'keepWeaponsSigil' },
  5: { name: 'The Last Ember', desc: 'The Watcher yields double Dark Embers, and every lord drops one.', unlock: 'emberLords' },
};

export function ageOfDark(state: GameState, events: GameEvent[]) {
  const cost = darkLevelCost(state);
  state.prestige.sigilMarks = state.prestige.sigilMarks.sub(cost);
  state.prestige.darkLevel++;
  const gift = DARK_LEVEL_GIFTS[state.prestige.darkLevel];
  if (gift?.unlock && !state.automation.unlocked.includes(gift.unlock)) state.automation.unlocked.push(gift.unlock);
  if (state.prestige.darkLevel === 1) {
    for (const k of ['autoKindle', 'autoSigil']) if (!state.automation.unlocked.includes(k)) state.automation.unlocked.push(k);
  }
  events.push({ type: 'unlock', what: 'dark:' + state.prestige.darkLevel, text: gift ? `${gift.name}: ${gift.desc}` : `Dark Level ${state.prestige.darkLevel}. Everything, again, ×1.5.` });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

registerActionHandler((state, action, events, mods) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'darkSigil': {
      const why = canSigil(state);
      if (why) return err(why);
      darkSigil(state, events, mods);
      return true;
    }
    case 'buySigilUnlock': {
      const why = sigilUnlockBlocked(state, action.unlock);
      if (why) return err(why);
      state.prestige.sigilMarks = state.prestige.sigilMarks.sub(sigilUnlockCost(state, action.unlock));
      state.prestige.sigilUnlocks[action.unlock] = (state.prestige.sigilUnlocks[action.unlock] ?? 0) + 1;
      const u = SIGIL_UNLOCKS[action.unlock];
      for (const k of Object.keys(u.effect)) if (k.startsWith('unlock')) {
        const key = k.slice(6).replace(/^./, (c) => c.toLowerCase());
        if (!state.automation.unlocked.includes(key)) state.automation.unlocked.push(key);
        if (key in state.automation) (state.automation as any)[key] = true;
      }
      if (action.unlock === 'abyss') {
        // opens the road below the Kiln if the Lord is already down this cycle
        const kiln = state.zones.kiln;
        if (kiln && kiln.bossKills > 0 && !state.unlockedZones.includes('abyss')) { state.unlockedZones.push('abyss'); events.push({ type: 'zoneUnlocked', zone: 'abyss' }); }
      }
      grantSigilGifts(state, events);
      events.push({ type: 'notice', text: `${u.name} ${state.prestige.sigilUnlocks[action.unlock]}/${u.maxRank}.` });
      return true;
    }
    case 'ageOfDark': {
      const why = canAgeOfDark(state);
      if (why) return err(why);
      ageOfDark(state, events);
      return true;
    }
  }
  return false;
});

// ---------------------------------------------------------------------------
// Automation: auto-kindle, auto-sigil (checked every ~5s of game time)
// ---------------------------------------------------------------------------

registerTickHook((state, mods, events) => {
  if (Math.floor(state.t * 10) % 50 !== 0) return;
  const a = state.automation;
  // Auto-Kindle: when this cycle would gather at least `autoKindleAt` × what the last Kindle gathered
  // (and at least 10), after a minimum of 20 minutes. Each automatic cycle must beat the last, so the
  // cadence spaces itself out instead of resetting you every minute.
  if (a.autoKindle && mods.unlocks.has('autoKindle') && !canKindle(state) && state.stats.cycleTime > 20 * 60) {
    const gain = humanityPreview(state, mods);
    const threshold = state.prestige.lastKindleGain.mul(a.autoKindleAt);
    if (gain.gte(threshold) && gain.gte(10)) {
      kindle(state, events, mods);
      grantSigilGifts(state, events);
    }
  }
  if (a.autoSigil && mods.unlocks.has('autoSigil') && !canSigil(state)) {
    const gain = sigilMarksPreview(state, mods);
    if (gain.gte(5) && gain.gte(state.prestige.lastSigilGain.mul(1.5))) darkSigil(state, events, mods);
  }
  // the Abyss resumes at record depth (Dark Level 3)
  if (mods.unlocks.has('abyssResume') && state.prestige.abyssDepth < state.prestige.abyssRecord && state.encounter.zone !== 'abyss') {
    state.prestige.abyssDepth = state.prestige.abyssRecord;
  }
});
