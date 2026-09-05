/**
 * Holdfasts: a region whose lord has fallen can be claimed and garrisoned. It produces marrow and
 * the region's slag while you are elsewhere, opens affixes at the forge, and is raided now and
 * then: defend it yourself for a large reward, or let the garrison hold for a smaller one. A lost
 * raid only slows the holdfast for an hour; a holdfast is never taken from you.
 */
import { BALANCE } from '@/content/balance';
import { getZone, globalTier, ZONE_ORDER } from '@/content';
import type { GameState, GameEvent, Holdfast } from './types';
import type { Mods } from './mods';
import { D, ZERO, safe, type Decimal } from './num';
import { rand, pick } from './rng';
import { tierMarrow, levelCost } from './formulas';
import { registerActionHandler, registerTickHook } from './registry';

const B = BALANCE.holdfast;

export function holdfastCount(state: GameState): number { return Object.keys(state.holdfasts ?? {}).length; }
export function holdfastMaxRegion(state: GameState): number { return Math.max(0, ...Object.keys(state.holdfasts ?? {}).map((z) => getZone(z).region)); }
export function claimCost(state: GameState): Decimal { return levelCost(state.player.level).mul(B.claimLevels).floor(); }
export function canClaim(state: GameState, zone: string): string | null {
  if (!state.flags.holdfastsUnlocked) return 'Fell a lord first; the road has no seat to hold yet.';
  const zp = state.zones[zone];
  if (!zp || zp.bossKills < 1) return 'Its lord still sits. Fell it first.';
  if (getZone(zone).endless) return 'The Nadir cannot be held.';
  if (state.holdfasts?.[zone]) return 'Already yours.';
  if (state.marrow.lt(claimCost(state))) return `Needs ${claimCost(state).toString()} marrow.`;
  return null;
}
function newRaidIn(state: GameState): number { return B.raidEvery[0] + rand(state.rng) * (B.raidEvery[1] - B.raidEvery[0]); }

export function claimHoldfast(state: GameState, events: GameEvent[], zone: string): string | null {
  const why = canClaim(state, zone);
  if (why) return why;
  state.marrow = state.marrow.sub(claimCost(state));
  state.holdfasts[zone] = { garrison: [], raidIn: newRaidIn(state), raid: null, raids: 0, held: 0, lost: 0, slowed: 0, produced: ZERO, acc: 0, slagAcc: 0 };
  events.push({ type: 'holdfastClaimed', zone });
  return null;
}

/** Production per second: a share of the region's last-tier kill, more with a garrison, halved after a lost raid. */
export function holdfastRate(state: GameState, zone: string): { marrow: Decimal; slag: string; slagPerSec: number } {
  const h = state.holdfasts[zone];
  const z = getZone(zone);
  const g = globalTier(zone, z.tiers.length - 1, state.prestige.nadirDepth);
  const garrison = 1 + B.garrisonPerShade * (h?.garrison.length ?? 0);
  const slow = h && h.slowed > 0 ? 0.5 : 1;
  const marrow = tierMarrow(g, state.prestige.wakings).mul(B.rate * garrison * slow);
  const slag = z.materialTier >= 3 ? 'blackSlag' : z.materialTier === 2 ? 'fineSlag' : 'coarseSlag';
  return { marrow: safe(marrow), slag, slagPerSec: (B.slagPerMinute / 60) * garrison * slow };
}

export function canGarrison(state: GameState, shade: string, zone: string | null): string | null {
  const ph = state.cortege.shades.find((p) => p.id === shade);
  if (!ph) return 'No such shade.';
  if (zone === null) return ph.assignment === 'garrison' ? null : 'Not in a garrison.';
  if (!state.holdfasts?.[zone]) return 'You hold nothing there.';
  if (ph.assignment === 'away') return 'Away on an expedition.';
  return null;
}
export function setGarrison(state: GameState, shade: string, zone: string | null): string | null {
  const why = canGarrison(state, shade, zone);
  if (why) return why;
  const ph = state.cortege.shades.find((p) => p.id === shade)!;
  for (const h of Object.values(state.holdfasts)) h.garrison = h.garrison.filter((s) => s !== shade);
  if (zone === null) { ph.assignment = 'beside'; return null; }
  state.holdfasts[zone].garrison.push(shade);
  ph.assignment = 'garrison';
  return null;
}

/** The raid the player is standing in, if any. */
export function activeRaid(state: GameState): { zone: string; raid: { remaining: number; kills: number } } | null {
  for (const [zone, h] of Object.entries(state.holdfasts ?? {})) if (h.raid) return { zone, raid: h.raid };
  return null;
}

function endRaid(state: GameState, events: GameEvent[] | null, zone: string, outcome: 'repelled' | 'held' | 'lost') {
  const h = state.holdfasts[zone];
  const rate = holdfastRate(state, zone).marrow;
  let marrow = ZERO;
  if (outcome === 'repelled') { marrow = safe(rate.mul(B.repelMinutes * 60).floor()); h.held++; if (state.prestige.bossesEverKilled.length && rand(state.rng) < B.repelKeepsake) { const b = pick(state.rng, state.prestige.bossesEverKilled); state.keepsakes[b] = (state.keepsakes[b] ?? 0) + 1; } }
  else if (outcome === 'held') { marrow = safe(rate.mul(B.heldMinutes * 60).floor()); h.held++; }
  else { h.lost++; h.slowed = B.slowedSeconds; }
  if (marrow.gt(0)) { state.marrow = state.marrow.add(marrow); state.stats.marrowEarned = state.stats.marrowEarned.add(marrow); state.stats.cycleMarrow = state.stats.cycleMarrow.add(marrow); }
  h.raid = null;
  h.raidIn = newRaidIn(state);
  events?.push({ type: 'raidEnded', zone, outcome, marrow });
}
function garrisonHolds(state: GameState, h: Holdfast): boolean {
  const chance = Math.min(B.holdCap, B.holdBase + B.holdPerShade * h.garrison.length);
  return rand(state.rng) < chance;
}

/** A kill made in a raided zone counts toward repelling it. */
export function raidKill(state: GameState, events: GameEvent[], zone: string) {
  const h = state.holdfasts?.[zone];
  if (!h?.raid) return;
  h.raid.kills++;
  if (h.raid.kills >= B.raidKills) endRaid(state, events, zone, 'repelled');
}

/** Advance production, raid timers and slowdowns by `seconds`. Away (events null), raids resolve by garrison alone. */
export function advanceHoldfasts(state: GameState, seconds: number, events: GameEvent[] | null): Decimal {
  let produced = ZERO;
  for (const [zone, h] of Object.entries(state.holdfasts ?? {})) {
    const r = holdfastRate(state, zone);
    // production accrues in fractions and pays out whole marrow, so a tenth of a second is never lost to the floor
    const gained = r.marrow.mul(seconds);
    let m = ZERO;
    if (gained.gte(1e6)) m = gained.floor();
    else { h.acc = (h.acc ?? 0) + gained.toNumber(); const whole = Math.floor(h.acc); if (whole >= 1) { h.acc -= whole; m = D(whole); } }
    if (m.gt(0)) { produced = produced.add(m); h.produced = h.produced.add(m); state.marrow = state.marrow.add(m); state.stats.marrowEarned = state.stats.marrowEarned.add(m); state.stats.cycleMarrow = state.stats.cycleMarrow.add(m); }
    h.slagAcc = (h.slagAcc ?? 0) + r.slagPerSec * seconds;
    const n = Math.floor(h.slagAcc);
    if (n >= 1) { h.slagAcc -= n; state.materials[r.slag] = (state.materials[r.slag] ?? 0) + n; }
    if (h.slowed > 0) h.slowed = Math.max(0, h.slowed - seconds);
    if (h.raid) {
      h.raid.remaining -= seconds;
      if (h.raid.remaining <= 0) endRaid(state, events, zone, garrisonHolds(state, h) ? 'held' : 'lost');
    } else {
      h.raidIn -= seconds;
      if (h.raidIn <= 0) {
        h.raids++;
        if (events) { h.raid = { remaining: B.raidWindow, kills: 0 }; events.push({ type: 'raid', zone }); }
        else endRaid(state, null, zone, garrisonHolds(state, h) ? 'held' : 'lost'); // away: the garrison answers alone
      }
    }
  }
  return produced;
}

registerActionHandler((state, action, events) => {
  const err = (t: string) => { events.push({ type: 'error', text: t }); return true; };
  if (action.type === 'claimHoldfast') { const why = claimHoldfast(state, events, action.zone); return why ? err(why) : true; }
  if (action.type === 'garrison') { const why = setGarrison(state, action.shade, action.zone); return why ? err(why) : true; }
  return false;
});
registerTickHook((state, _mods, events, dt) => { if (dt > 0 && holdfastCount(state) > 0) advanceHoldfasts(state, dt, events); });
export { D, ZONE_ORDER };
