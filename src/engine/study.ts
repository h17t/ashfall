/**
 * The Study: kill counters per creature and lord with ranked thresholds. Each rank reveals more
 * in the bestiary, pays a small permanent bonus to damage and marrow, and sharpens you against
 * that creature in particular. Counts are kept through Snuffing, the Severing and the Unmaking.
 */
import { ENEMIES, BOSSES, STUDY_RANKS_ENEMY, STUDY_RANKS_BOSS, STUDY_BONUS, STUDY_VS_PER_RANK } from '@/content';
import type { GameState, GameEvent } from './types';

export function studyKills(state: GameState, id: string): number { return state.study?.[id] ?? 0; }
export function studyThresholds(id: string): number[] { return BOSSES[id] ? STUDY_RANKS_BOSS : STUDY_RANKS_ENEMY; }
/** 0..4 */
export function studyRank(state: GameState, id: string): number {
  const k = studyKills(state, id);
  const th = studyThresholds(id);
  let r = 0;
  while (r < th.length && k >= th[r]) r++;
  return r;
}
/** kills to the next rank, or null at the top */
export function studyNext(state: GameState, id: string): number | null {
  const r = studyRank(state, id);
  const th = studyThresholds(id);
  return r >= th.length ? null : th[r];
}

/** Record a kill; emit an event when a rank is reached. */
export function recordStudyKill(state: GameState, events: GameEvent[], id: string) {
  if (!state.study) state.study = {};
  const before = studyRank(state, id);
  state.study[id] = (state.study[id] ?? 0) + 1;
  const after = studyRank(state, id);
  if (after > before) events.push({ type: 'studyRank', enemy: id, rank: after, isBoss: !!BOSSES[id] });
}

/** The account-wide bonus from every creature studied, as fractions to add to 1. */
export function studyBonus(state: GameState): { dmg: number; marrow: number; ranks: number; total: number } {
  let dmg = 0, ranks = 0, total = 0;
  for (const id of Object.keys(ENEMIES)) { const r = studyRank(state, id); ranks += r; total += STUDY_RANKS_ENEMY.length; dmg += r * STUDY_BONUS.enemy; }
  for (const id of Object.keys(BOSSES)) { const r = studyRank(state, id); ranks += r; total += STUDY_RANKS_BOSS.length; dmg += r * STUDY_BONUS.boss; }
  return { dmg, marrow: dmg, ranks, total };
}

/** Damage multiplier against this creature from having studied it. */
export function studyVsMult(state: GameState, id: string): number {
  return 1 + STUDY_VS_PER_RANK * studyRank(state, id);
}

/** Has the Study met a gate: a poisoner, any lord, or a named creature at a rank? */
export function studyMeets(state: GameState, gate: { kind: 'poisoner' | 'lord' | 'creature'; id?: string; rank: number }): boolean {
  if (gate.kind === 'creature') return studyRank(state, gate.id ?? '') >= gate.rank;
  if (gate.kind === 'lord') return Object.keys(BOSSES).some((b) => studyRank(state, b) >= gate.rank);
  return Object.values(ENEMIES).some((e) => e.attacks.some((a) => a.status === 'poison') && studyRank(state, e.id) >= gate.rank);
}
