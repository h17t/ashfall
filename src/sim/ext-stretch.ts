/**
 * Sim extension: the stretch mechanics. Every strategy claims a holdfast when a region's lord has
 * fallen and it can spare the price, garrisons nothing (the road needs the shades), sends benched
 * shades on expeditions (bold and reckless send them into peril), and uses its weapon's Art the
 * moment it is ready.
 */
import { registerSimExtension } from './strategies';
import { canClaim, canDispatch, canArt, activeShades, missionOf, ZONE_ORDER } from '@/engine';
import { computeMods } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  if (canArt(s) === null && s.encounter.enemy) out.push({ type: 'art' });
  // holdfasts: claim every felled region the moment the purse allows; the claim goes before the tick's
  // level-up (both cost one level), so the strategy that levels the instant it can still claims
  if (s.flags.holdfastsUnlocked) for (const z of ZONE_ORDER) { const why = canClaim(s, z); if (why === null) { out.unshift({ type: 'claimHoldfast', zone: z }); break; } }
  if (view.t - ((mem.lastStretch as number) ?? -1e9) < 30) return;
  mem.lastStretch = view.t;
  // dispatch: shades beyond the slots go on expeditions
  if (s.flags.dispatchUnlocked) {
    const active = new Set(activeShades(s, computeMods(s)).map((p) => p.id));
    const kind = params.id === 'bold' || params.id === 'reckless' ? 'perilous' : 'risky';
    for (const ph of s.cortege.shades) {
      if (active.has(ph.id) || ph.assignment === 'away' || ph.assignment === 'garrison' || missionOf(s, ph.id)) continue;
      if (canDispatch(s, ph.id, kind) === null) { out.push({ type: 'dispatch', shade: ph.id, kind }); break; }
    }
  }
});
