/**
 * Sim extension: afflictions. A strategy with `afflictions` takes them the moment they offer
 * themselves and keeps them on; `bold` is greedy under four curses, and the difference between it
 * and greedy is what the dial is worth to a skilled hand.
 */
import { registerSimExtension, type PolicyParams } from './strategies';
import { canToggleAffliction, hasAffliction } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const want = (params as PolicyParams & { afflictions?: string[] }).afflictions;
  if (!want || !view.state.flags.afflictionsUnlocked) return;
  if (view.t - ((mem.lastAffl as number) ?? -1e9) < 20) return;
  mem.lastAffl = view.t;
  for (const id of want) if (!hasAffliction(view.state, id) && canToggleAffliction(view.state, id) === null) { out.push({ type: 'toggleAffliction', affliction: id }); return; }
});
