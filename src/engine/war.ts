/**
 * The Creed War: five creeds in a standing contest the rest of the world takes part in. Your kills
 * and lords count for yours; the weaker your side, the better it pays; at the end of a round the
 * leader holds dominion and lends the gifts of its passive to everyone. Rounds run on the clock,
 * online and away.
 */
import { BALANCE } from '@/content/balance';
import { CREEDS } from '@/content';
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { registerTickHook } from './registry';

const B = BALANCE.war;
export const WAR_CREEDS = Object.keys(CREEDS);

/** creeds ordered strongest first */
export function warOrder(state: GameState): string[] {
  const st = state.war?.standing ?? {};
  return WAR_CREEDS.slice().sort((a, b) => (st[b] ?? 0) - (st[a] ?? 0));
}
/** 0 for the leader .. 4 for the weakest */
export function warRankFromTop(state: GameState, creed: string): number { return Math.max(0, warOrder(state).indexOf(creed)); }
/** what backing this creed pays right now: standing and marrow multipliers */
export function underdogBonus(state: GameState, creed: string | null): { rep: number; marrow: number; rank: number } {
  if (!creed) return { rep: 1, marrow: 1, rank: 0 };
  const rank = warRankFromTop(state, creed);
  return { rep: 1 + B.underdogRepPerRank * rank, marrow: 1 + B.underdogMarrowPerRank * rank, rank };
}
export function warRoundRemaining(state: GameState): number { return Math.max(0, B.roundSeconds - (state.war?.roundT ?? 0)); }

/** The rest of the world's hands, deterministic in the clock. */
function drift(t: number, i: number): number { return B.drift * (1 + B.driftSway * Math.sin(t / 1900 + i * 1.3)); }

export function contribute(state: GameState, amount: number) {
  const c = state.creed.current;
  if (!c || !state.war) return;
  state.war.standing[c] = (state.war.standing[c] ?? 0) + amount;
  state.war.contributed += amount;
}

/** Advance the war by seconds: the world drifts; a finished round crowns a dominion and halves the standings. */
export function advanceWar(state: GameState, seconds: number, events: GameEvent[] | null) {
  if (!state.war) return;
  const w = state.war;
  const t0 = w.roundT;
  WAR_CREEDS.forEach((c, i) => { w.standing[c] = (w.standing[c] ?? 0) + drift(t0 + (state.toll?.t ?? 0), i) * seconds; });
  w.roundT += seconds;
  while (w.roundT >= B.roundSeconds) {
    w.roundT -= B.roundSeconds;
    const leader = warOrder(state)[0];
    w.dominion = leader;
    w.round++;
    for (const c of WAR_CREEDS) w.standing[c] = (w.standing[c] ?? 0) * B.carry;
    events?.push({ type: 'warRound', round: w.round, dominion: leader });
  }
}

/** Dominion: the round's winner lends the gifts of its passive to everyone, at half power. */
export function applyDominion(state: GameState, m: Mods, add: (n: string, e: string) => void, applyEffects: (m: Mods, effect: Record<string, number | undefined>, rank: number, name: string, add: (n: string, e: string) => void) => void, favourable: (e: Record<string, number | undefined>) => Record<string, number | undefined>) {
  const d = state.war?.dominion;
  if (!d || !CREEDS[d]) return;
  if (state.creed.current === d) return; // your own creed's gifts you already have in full
  applyEffects(m, favourable(CREEDS[d].passive), B.dominionPower, `Dominion of ${CREEDS[d].name}`, add);
  // the underdog's marrow
  const u = underdogBonus(state, state.creed.current);
  if (u.marrow > 1) { m.marrow *= u.marrow; add(`${CREEDS[state.creed.current!].name}, the weaker side`, `marrow +${Math.round((u.marrow - 1) * 100)}%`); }
}
export function applyUnderdog(state: GameState, m: Mods, add: (n: string, e: string) => void) {
  const c = state.creed.current;
  if (!c) return;
  const u = underdogBonus(state, c);
  if (u.marrow > 1 && (!state.war?.dominion || state.war.dominion === c)) { m.marrow *= u.marrow; add(`${CREEDS[c].name}, the weaker side`, `marrow +${Math.round((u.marrow - 1) * 100)}%`); }
}

registerTickHook((state, _mods, events, dt) => { if (dt > 0) advanceWar(state, dt, events); });
