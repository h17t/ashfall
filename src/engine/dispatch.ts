/**
 * Cortege Dispatch: send a shade away on a timed expedition. Safe pays a little and always comes
 * home; risky pays more and sometimes fails; perilous pays most, sometimes fails, and sometimes the
 * shade does not return. A lost shade leaves an Echo: a permanent bonus by its role. The mission
 * clock runs online and away.
 */
import { BALANCE } from '@/content/balance';
import { SHADES, getZone, getPhantom, ZONE_ORDER } from '@/content';
import type { GameState, GameEvent, Mission, PhantomState } from './types';
import type { Mods } from './mods';
import { D, ZERO, safe, type Decimal } from './num';
import { rand, pick } from './rng';
import { tierMarrow } from './formulas';
import { globalTier } from '@/content';
import { registerActionHandler, registerTickHook } from './registry';

const B = BALANCE.dispatch;
export type MissionKind = keyof typeof B.kinds;
export const MISSION_KINDS: MissionKind[] = ['safe', 'risky', 'perilous'];

export function missionOf(state: GameState, shade: string): Mission | undefined { return state.dispatch?.missions.find((m) => m.shade === shade); }
export function canDispatch(state: GameState, shade: string, kind: MissionKind): string | null {
  if (!B.kinds[kind]) return 'No such expedition.';
  if (!state.flags.dispatchUnlocked) return 'The Cortege is not yet large enough to spare anyone. Recruit a second shade.';
  const ph = state.cortege.shades.find((p) => p.id === shade);
  if (!ph) return 'No such shade in your Cortege.';
  if (ph.assignment === 'away') return 'Already away.';
  if (ph.assignment === 'garrison') return 'Holding a holdfast. Relieve it first.';
  if (ph.retreat > 0) return 'Still recovering.';
  return null;
}

/** What a shade earns per second of expedition: its own worth at the deepest cleared tier. */
export function missionRate(state: GameState, ph: PhantomState): { marrow: Decimal; zone: string; slag: string } {
  let zone = ZONE_ORDER[0], tier = 0;
  for (const z of ZONE_ORDER) { const zp = state.zones[z]; if (state.unlockedZones.includes(z) && zp && zp.cleared >= 0) { zone = z; tier = zp.cleared; } }
  const g = globalTier(zone, tier, state.prestige.nadirDepth);
  const def = getPhantom(ph.id);
  const per = tierMarrow(g, state.prestige.wakings).mul(0.08 * def.power * Math.pow(BALANCE.shade.powerPerLevel, ph.level - 1));
  const mt = getZone(zone).materialTier;
  return { marrow: safe(per), zone, slag: mt >= 3 ? 'blackSlag' : mt === 2 ? 'fineSlag' : 'coarseSlag' };
}
export function missionPreview(state: GameState, shade: string, kind: MissionKind): { marrow: Decimal; seconds: number; success: number; keepsake: number; lost: number; slag: string } {
  const ph = state.cortege.shades.find((p) => p.id === shade);
  const k = B.kinds[kind];
  if (!ph) return { marrow: ZERO, seconds: k.seconds, success: k.success, keepsake: k.keepsake, lost: k.lost, slag: 'coarseSlag' };
  const r = missionRate(state, ph);
  return { marrow: safe(r.marrow.mul(k.seconds).mul(k.pay).floor()), seconds: k.seconds, success: k.success, keepsake: k.keepsake, lost: k.lost, slag: r.slag };
}

export function dispatchShade(state: GameState, events: GameEvent[], shade: string, kind: MissionKind): string | null {
  const why = canDispatch(state, shade, kind);
  if (why) return why;
  const ph = state.cortege.shades.find((p) => p.id === shade)!;
  const k = B.kinds[kind];
  const r = missionRate(state, ph);
  ph.assignment = 'away';
  state.dispatch.missions.push({ id: state.dispatch.nextId++, shade, kind, remaining: k.seconds, total: k.seconds, zone: r.zone });
  state.dispatch.sent++;
  events.push({ type: 'dispatched', shade, kind, seconds: k.seconds });
  return null;
}

/** Echoes: what a lost shade leaves behind, by its role. */
export function echoText(shade: string): string {
  const role = SHADES[shade]?.role;
  return ({ dps: '+5% damage', healer: '+6% max HP', strain: '+10% strain', buffer: '+4% damage, +6% shade damage', status: '+10% status buildup' } as Record<string, string>)[role ?? ''] ?? '+3% damage';
}
export function applyEchoes(state: GameState, m: Mods, add: (n: string, e: string) => void) {
  for (const id of state.dispatch?.echoes ?? []) {
    const role = SHADES[id]?.role;
    if (role === 'dps') m.dmg *= 1.05; else if (role === 'healer') m.hpMult *= 1.06; else if (role === 'strain') m.strain *= 1.1; else if (role === 'buffer') { m.dmg *= 1.04; m.phantomDmg *= 1.06; } else if (role === 'status') m.statusBuild *= 1.1; else m.dmg *= 1.03;
    add(`Echo of ${SHADES[id]?.name ?? id}`, echoText(id));
  }
}

/** Resolve one mission that has run out of time. */
export function resolveMission(state: GameState, events: GameEvent[] | null, m: Mission): { outcome: 'success' | 'fail' | 'lost'; marrow: Decimal } {
  const k = B.kinds[m.kind];
  const ph = state.cortege.shades.find((p) => p.id === m.shade);
  const roll = rand(state.rng);
  let outcome: 'success' | 'fail' | 'lost' = 'success';
  if (roll < k.lost) outcome = 'lost'; else if (roll < k.lost + (1 - k.success)) outcome = 'fail';
  let marrow = ZERO;
  const drops: Record<string, number> = {};
  let keepsake: string | null = null;
  if (outcome === 'success' && ph) {
    const r = missionRate(state, ph);
    marrow = safe(r.marrow.mul(m.total).mul(k.pay).floor());
    state.marrow = state.marrow.add(marrow);
    state.stats.marrowEarned = state.stats.marrowEarned.add(marrow);
    state.stats.cycleMarrow = state.stats.cycleMarrow.add(marrow);
    const n = m.kind === 'perilous' ? 3 : m.kind === 'risky' ? 2 : 1;
    drops[r.slag] = n; state.materials[r.slag] = (state.materials[r.slag] ?? 0) + n;
    if (k.keepsake > 0 && state.prestige.bossesEverKilled.length > 0 && rand(state.rng) < k.keepsake) { keepsake = pick(state.rng, state.prestige.bossesEverKilled); state.keepsakes[keepsake] = (state.keepsakes[keepsake] ?? 0) + 1; }
  }
  if (ph) {
    if (outcome === 'lost') {
      state.cortege.shades = state.cortege.shades.filter((p) => p.id !== m.shade);
      if (!state.dispatch.echoes.includes(m.shade)) state.dispatch.echoes.push(m.shade);
      state.dispatch.lost++;
      events?.push({ type: 'echo', shade: m.shade, text: echoText(m.shade) });
    } else {
      ph.assignment = 'beside';
      if (outcome === 'fail') ph.retreat = B.failRetreat;
    }
  }
  state.dispatch.missions = state.dispatch.missions.filter((x) => x.id !== m.id);
  events?.push({ type: 'returned', shade: m.shade, kind: m.kind, outcome, marrow, drops, keepsake });
  return { outcome, marrow };
}

/** Advance every mission by `seconds`; resolve the ones that come home. */
export function advanceMissions(state: GameState, seconds: number, events: GameEvent[] | null): { shade: string; kind: string; outcome: 'success' | 'fail' | 'lost'; marrow: string }[] {
  const out: { shade: string; kind: string; outcome: 'success' | 'fail' | 'lost'; marrow: string }[] = [];
  for (const m of [...(state.dispatch?.missions ?? [])]) {
    m.remaining -= seconds;
    if (m.remaining <= 0) { const r = resolveMission(state, events, m); out.push({ shade: m.shade, kind: m.kind, outcome: r.outcome, marrow: r.marrow.toString() }); }
  }
  return out;
}

registerActionHandler((state, action, events) => {
  if (action.type !== 'dispatch') return false;
  const why = dispatchShade(state, events, action.shade, action.kind);
  if (why) events.push({ type: 'error', text: why });
  return true;
});
registerTickHook((state, _mods, events, dt) => { if (dt > 0 && state.dispatch?.missions.length) advanceMissions(state, dt, events); });
export { D };
