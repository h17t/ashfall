/**
 * Sim extension: the forge. Once a minute, a strategy that clicks reforges the weapon in its hand
 * when it can spare the price four times over and still reinforce, and locks a Black affix that
 * pays in damage or marrow when one turns up. Idle strategies leave the forge alone: they have
 * no thumb to spend.
 */
import { registerSimExtension } from './strategies';
import { canReforge, forgeCost, affixesOf, lockedOf, reinforceMaterial } from '@/engine';
import { AFFIXES } from '@/content';

const WANT = new Set(['brutal', 'hungry', 'usurious', 'keen', 'swift']);

registerSimExtension((view, params, mem, out) => {
  if (params.clickRate === 0 || params.clickUntil !== undefined) return;
  const s = view.state;
  if (!s.flags.forgeUnlocked) return;
  if (view.t - ((mem.lastForge as number) ?? -1e9) < 60) return;
  mem.lastForge = view.t;
  const w = s.player.weapon;
  const inst = s.player.weapons[w];
  if (!inst) return;
  // lock what is worth keeping
  for (const a of affixesOf(inst)) if (a.tier === 3 && WANT.has(a.id) && !lockedOf(inst).includes(a.id) && lockedOf(inst).length < 2) { out.push({ type: 'lockAffix', weapon: w, affix: a.id }); return; }
  const good = affixesOf(inst).filter((a) => a.tier === 3 && WANT.has(a.id)).length;
  if (good >= 2) return;
  const cost = forgeCost(s, w);
  const rm = reinforceMaterial(inst.level);
  const spare = (s.materials[cost.material.id] ?? 0) - (rm.id === cost.material.id ? rm.count : 0);
  if (spare < cost.material.count || s.marrow.lt(cost.marrow.mul(4))) return;
  if (canReforge(s, w) === null) out.push({ type: 'reforge', weapon: w });
});
