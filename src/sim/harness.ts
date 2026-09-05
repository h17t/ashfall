/**
 * Headless simulation harness. Drives the engine with a scripted strategy at 10Hz and
 * records pacing metrics. Hundreds of simulated hours run in seconds because the engine
 * has no rendering and shades/offline use closed-form rates.
 */
import { newGame, step, computeMods, isFiniteDec, type GameState, type GameEvent, type Action } from '@/engine';
import { BALANCE } from '@/content/balance';
import { getZone, ZONE_ORDER } from '@/content';
import { makeRng, rand } from '@/engine/rng';
import type { Strategy, SimResult, Milestones, Stall, SimView } from './types';

export interface SimOptions {
  strategy: Strategy;
  seed?: number;
  hours: number;
  /** log progress lines */
  verbose?: boolean;
  /** stop early when this predicate returns true */
  until?: (state: GameState) => boolean;
  /** stall threshold in seconds (no progress event) */
  stallSeconds?: number;
}

const PROGRESS_EVENTS = new Set(['tierCleared', 'bossKilled', 'levelUp', 'zoneUnlocked', 'snuffed', 'unlock', 'remainsRecovered']);

export function runSim(opts: SimOptions): SimResult {
  const seed = opts.seed ?? 7;
  const state = newGame(seed);
  const decisionRng = makeRng(seed ^ 0x9e3779b9);
  const dt = BALANCE.tick;
  const totalTicks = Math.round((opts.hours * 3600) / dt);
  const ms: Milestones = { autoAttack: null, firstDeath: null, firstBoss: null, bosses: {}, regions: {}, firstKindle: null, wakings: [], firstSigil: null, unmake: null, level10: null, level25: null, level50: null, level100: null };
  const marrowPerHour: string[] = [];
  const levelsPerHour: number[] = [];
  const deepestPerHour: number[] = [];
  const stalls: Stall[] = [];
  const invariantErrors: string[] = [];
  const notes: string[] = [];
  const stallThreshold = opts.stallSeconds ?? 20 * 60;
  let lastProgress = 0;
  let hourSoulsStart = state.stats.marrowEarned;
  let nextHour = 3600;
  const t0 = Date.now();
  let prevKindles = 0;
  let prevSigils = 0;

  const view: SimView = { state, mods: computeMods(state), t: 0, rand: () => rand(decisionRng) };

  for (let i = 0; i < totalTicks; i++) {
    const t = i * dt;
    view.t = t;
    if (i % 10 === 0) view.mods = computeMods(state);
    const actions: Action[] = opts.strategy.decide(view);
    const r = step(state, dt, actions);
    for (const e of r.events) {
      if (PROGRESS_EVENTS.has(e.type)) lastProgress = t;
      switch (e.type) {
        case 'unlock':
          if (e.what === 'autoAttack' && ms.autoAttack === null) ms.autoAttack = t;
          break;
        case 'death':
          if (ms.firstDeath === null) ms.firstDeath = t;
          break;
        case 'bossKilled':
          if (ms.firstBoss === null) ms.firstBoss = t;
          if (ms.bosses[e.boss] === undefined) ms.bosses[e.boss] = t;
          break;
        case 'zoneUnlocked': {
          const region = getZone(e.zone).region;
          if (ms.regions[region] === undefined) ms.regions[region] = t;
          break;
        }
        case 'levelUp':
          if (e.level >= 10 && ms.level10 === null) ms.level10 = t;
          if (e.level >= 25 && ms.level25 === null) ms.level25 = t;
          if (e.level >= 50 && ms.level50 === null) ms.level50 = t;
          if (e.level >= 100 && ms.level100 === null) ms.level100 = t;
          break;
        case 'snuffed':
          if (ms.firstKindle === null) ms.firstKindle = t;
          ms.wakings.push(t);
          break;
        case 'error':
          break;
      }
    }
    if (state.prestige.wakings !== prevKindles) { prevKindles = state.prestige.wakings; lastProgress = t; }
    if (state.prestige.severings !== prevSigils) { prevSigils = state.prestige.severings; if (ms.firstSigil === null) ms.firstSigil = t; lastProgress = t; }
    if (state.prestige.unmaking > 0 && ms.unmake === null) ms.unmake = t;

    // stall detection
    if (t - lastProgress > stallThreshold) {
      const where = `${getZone(state.encounter.zone).name} tier ${state.encounter.tier} (cleared ${state.zones[state.encounter.zone]?.cleared})`;
      const last = stalls[stalls.length - 1];
      if (last && last.from === lastProgress) last.duration = t - lastProgress;
      else stalls.push({ from: lastProgress, duration: t - lastProgress, where, level: state.player.level });
    }

    // per-hour buckets & invariants
    if (t >= nextHour - 1e-6) {
      marrowPerHour.push(state.stats.marrowEarned.sub(hourSoulsStart).toString());
      hourSoulsStart = state.stats.marrowEarned;
      levelsPerHour.push(state.player.level);
      deepestPerHour.push(state.stats.deepestTier);
      nextHour += 3600;
      const inv = checkInvariants(state);
      if (inv.length) invariantErrors.push(`h${(t / 3600).toFixed(0)}: ${inv.join('; ')}`);
      if (opts.verbose) console.log(`[${opts.strategy.id}] h${(t / 3600).toFixed(0)} L${state.player.level} marrow=${state.marrow.toString()} deepest=${state.stats.deepestTier} Waking ${state.prestige.wakings} deaths=${state.stats.deaths}`);
    }
    if (opts.until && opts.until(state)) break;
  }
  const inv = checkInvariants(state);
  if (inv.length) invariantErrors.push(`final: ${inv.join('; ')}`);
  if (state.t < nextHour - 1e-6 && state.stats.marrowEarned.gt(hourSoulsStart)) {
    marrowPerHour.push(state.stats.marrowEarned.sub(hourSoulsStart).toString());
    levelsPerHour.push(state.player.level);
    deepestPerHour.push(state.stats.deepestTier);
  }
  return {
    strategy: opts.strategy.id,
    seed,
    hours: state.t / 3600,
    wallMs: Date.now() - t0,
    milestones: ms,
    marrowPerHour,
    levelsPerHour,
    deepestPerHour,
    deaths: state.stats.deaths,
    kills: state.stats.kills.toString(),
    finalLevel: state.player.level,
    finalDeepest: state.stats.deepestTier,
    finalKindles: state.prestige.wakings,
    stalls,
    invariantErrors,
    notes,
  };
}

/** Economy invariants: no negative currency, NaN, or Infinity anywhere that matters. */
export function checkInvariants(state: GameState): string[] {
  const errs: string[] = [];
  const dec = (name: string, d: any) => {
    if (!d || typeof d.mantissa !== 'number') { errs.push(`${name} not a Decimal`); return; }
    if (!isFiniteDec(d)) errs.push(`${name} non-finite`);
    else if (d.lt(0)) errs.push(`${name} negative`);
  };
  dec('marrow', state.marrow);
  dec('vestige', state.prestige.vestige);
  dec('threads', state.prestige.threads);
  dec('marrowEarned', state.stats.marrowEarned);
  if (state.remains) dec('remains', state.remains.marrow);
  if (state.encounter.enemy) { dec('enemy.hp', state.encounter.enemy.hp); dec('enemy.marrow', state.encounter.enemy.marrow); }
  for (const [k, v] of Object.entries(state.materials)) if (!Number.isFinite(v) || v < 0) errs.push(`material ${k} = ${v}`);
  const p = state.player;
  for (const [k, v] of Object.entries({ hp: p.hp, hpMax: p.hpMax, stamina: p.stamina, staminaMax: p.staminaMax, fp: p.fp, fpMax: p.fpMax, draughts: p.draughts })) {
    if (!Number.isFinite(v) || v < 0) errs.push(`player.${k} = ${v}`);
  }
  if (p.hp > p.hpMax + 1) errs.push('hp > hpMax');
  for (const ph of state.cortege.shades) dec(`shade ${ph.id} xp`, ph.xp);
  return errs;
}

export function fmtTime(s: number | null): string {
  if (s === null) return '—';
  if (s < 3600) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(2)}h`;
}
