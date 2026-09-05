/**
 * Offline / idle progress. Computed in closed form from the cortege's hunting rate, never
 * tick-by-tick. The player rests at the lantern while away: offline never drops marrow.
 */
import { D, ZERO, Decimal, safe } from './num';
import { BALANCE } from '@/content/balance';
import type { GameState, OfflineSummary } from './types';
import type { Mods } from './mods';
import { computeMods } from './mods';

export interface IdleRate {
  /** marrow per second */
  marrow: Decimal;
  /** kills per second */
  kills: number;
  /** material id -> per second */
  materials: Record<string, number>;
  /** shade xp per second (shared) */
  xp: Decimal;
  zone: string;
  tier: number;
  /** true when the cortege cannot survive its hunting tier and retreats (rate is then 0) */
  wiped: boolean;
  /** human explanation when the rate is zero */
  reason: string | null;
}

type RateFn = (state: GameState, mods: Mods) => IdleRate;
let rateFn: RateFn = (state) => ({ marrow: ZERO, kills: 0, materials: {}, xp: ZERO, zone: state.cortege.huntZone, tier: state.cortege.huntTier, wiped: false, reason: 'No shades hunt for you yet. Recruit one at the lantern.' });

/** The shade module installs the real rate function. */
export function setIdleRateFn(fn: RateFn) {
  rateFn = fn;
}

export function idleRate(state: GameState, mods: Mods = computeMods(state)): IdleRate {
  return rateFn(state, mods);
}

export function offlineCapSeconds(mods: Mods): number {
  return mods.offlineCapHours * 3600;
}

/**
 * Apply offline progress for `elapsedSeconds` and attach the summary to `state.offline`.
 * Returns the summary (also attached) or null if the gap was too short to matter.
 */
export function applyOffline(state: GameState, elapsedSeconds: number, mods: Mods = computeMods(state)): OfflineSummary | null {
  if (elapsedSeconds < BALANCE.offline.minSeconds) return null;
  const cap = offlineCapSeconds(mods);
  const secs = Math.min(elapsedSeconds, cap);
  const rate = idleRate(state, mods);
  const mult = mods.offlineRate;
  const marrow = safe(rate.marrow.mul(secs).mul(mult).floor());
  const kills = D(rate.kills * secs * mult).floor();
  const materials: Record<string, number> = {};
  for (const [id, per] of Object.entries(rate.materials)) {
    const n = Math.floor(per * secs * mult);
    if (n > 0) materials[id] = n;
  }
  const xp = safe(rate.xp.mul(secs).mul(mult).floor());
  state.marrow = state.marrow.add(marrow);
  state.stats.marrowEarned = state.stats.marrowEarned.add(marrow);
  state.stats.cycleMarrow = state.stats.cycleMarrow.add(marrow);
  state.stats.kills = state.stats.kills.add(kills);
  state.stats.cycleKills = state.stats.cycleKills.add(kills);
  for (const [id, n] of Object.entries(materials)) state.materials[id] = (state.materials[id] ?? 0) + n;
  if (xp.gt(0)) for (const ph of state.cortege.shades) ph.xp = ph.xp.add(xp);
  // Returning: the player has rested. Full HP and Tallowdraught, no combat state carried over.
  state.player.hp = state.player.hpMax;
  state.player.stamina = state.player.staminaMax;
  state.player.fp = state.player.fpMax;
  state.player.draughts = state.player.draughtsMax;
  state.player.buffs = [];
  state.encounter.enemy = null;
  state.encounter.respawnIn = 0.8;
  const summary: OfflineSummary = { seconds: elapsedSeconds, cappedSeconds: secs, marrow, materials, kills, shadeXp: xp, zone: rate.zone, tier: rate.tier, wiped: rate.wiped };
  state.offline = summary;
  return summary;
}
