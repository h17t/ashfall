/**
 * The Toll: the world's clock. It runs on engine time while you play and on the seconds you were
 * away when you return, so the hour you left in is not the hour you come back to. Each phase adds
 * something; the Black Hour adds danger and pays for it.
 */
import { TOLL_PHASES, TOLL_CYCLE_SECONDS, BALANCE, type TollPhase, type TollPhaseDef } from '@/content';
import type { GameState, GameEvent } from './types';
import type { Mods } from './mods';
import { registerTickHook } from './registry';

export function tollPhaseAt(t: number): TollPhaseDef {
  let x = ((t % TOLL_CYCLE_SECONDS) + TOLL_CYCLE_SECONDS) % TOLL_CYCLE_SECONDS;
  for (const p of TOLL_PHASES) { if (x < p.minutes * 60) return p; x -= p.minutes * 60; }
  return TOLL_PHASES[0];
}
export function tollPhase(state: GameState): TollPhaseDef { return tollPhaseAt(state.toll?.t ?? 0); }
/** seconds until the current phase ends */
export function tollRemaining(state: GameState): number {
  const t = state.toll?.t ?? 0;
  let x = t % TOLL_CYCLE_SECONDS;
  for (const p of TOLL_PHASES) { const len = p.minutes * 60; if (x < len) return len - x; x -= len; }
  return 0;
}
/** seconds until the next Black Hour begins (0 while it is on) */
export function tollUntilBlack(state: GameState): number {
  const t = state.toll?.t ?? 0;
  const x = t % TOLL_CYCLE_SECONDS;
  const start = TOLL_PHASES.slice(0, TOLL_PHASES.findIndex((p) => p.id === 'black')).reduce((a, p) => a + p.minutes * 60, 0);
  if (x >= start && x < start + 6 * 60) return 0;
  return x < start ? start - x : TOLL_CYCLE_SECONDS - x + start;
}
/** 0..1 around the dial */
export function tollFraction(state: GameState): number { return ((state.toll?.t ?? 0) % TOLL_CYCLE_SECONDS) / TOLL_CYCLE_SECONDS; }

/** Share of a span of seconds starting now that falls in the Black Hour. */
export function blackShare(state: GameState, seconds: number): number {
  if (seconds <= 0) return 0;
  const t0 = state.toll?.t ?? 0;
  let black = 0;
  // whole cycles, then the remainder walked phase by phase
  const cycles = Math.floor(seconds / TOLL_CYCLE_SECONDS);
  black += cycles * 6 * 60;
  let rem = seconds - cycles * TOLL_CYCLE_SECONDS;
  let t = t0 + cycles * TOLL_CYCLE_SECONDS;
  while (rem > 0) {
    const p = tollPhaseAt(t);
    const x = ((t % TOLL_CYCLE_SECONDS) + TOLL_CYCLE_SECONDS) % TOLL_CYCLE_SECONDS;
    const start = TOLL_PHASES.slice(0, TOLL_PHASES.indexOf(p)).reduce((a, q) => a + q.minutes * 60, 0);
    const left = start + p.minutes * 60 - x;
    const take = Math.min(left, rem);
    if (p.id === 'black') black += take;
    rem -= take; t += take;
  }
  return black / seconds;
}

/** Fold the hour into the modifiers. */
export function applyToll(state: GameState, m: Mods, add: (name: string, effect: string) => void) {
  const p = tollPhase(state);
  const f = p.fx;
  if (f.marrow) m.marrow *= f.marrow;
  if (f.materials) m.materialMult *= f.materials;
  if (f.draught) m.draughtPotency *= f.draught;
  if (f.statusBuild) m.statusBuild *= f.statusBuild;
  if (f.enemyHp) m.enemyHp *= f.enemyHp;
  if (f.enemyDmg) m.enemyDmg *= f.enemyDmg;
  if (f.stairPay) m.stairPay *= f.stairPay;
  add(`The Toll: ${p.name}`, p.effects.filter((e) => !/passive/.test(e)).join(', '));
}
/** Is this creed's passive doubled right now? */
export function creedHourFavoured(state: GameState, creed: string | null): boolean {
  if (!creed) return false;
  const p = tollPhase(state);
  return p.creed === creed || (p.id === 'black' && creed === 'nadir');
}

/** Advance the clock by seconds (play or absence); emit the phase change. */
export function advanceToll(state: GameState, seconds: number, events?: GameEvent[]) {
  if (!state.toll) state.toll = { t: 0, phase: 'dawn' };
  state.toll.t += seconds;
  const p = tollPhase(state);
  if (p.id !== state.toll.phase) { state.toll.phase = p.id; events?.push({ type: 'tollPhase', phase: p.id }); }
}

registerTickHook((state, _mods, events, dt) => { if (dt > 0) advanceToll(state, dt, events); });
export type { TollPhase };
