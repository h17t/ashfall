/**
 * What to do now. One line, always true, always the next thing that matters: the game never
 * leaves a new hand guessing. Pure: reads the state, names a place in the shell to go.
 */
import type { GameState } from './types';
import { getZone, ZONE_ORDER } from '@/content';
import { levelCost } from './formulas';
import { canSnuff } from './prestige';

export interface Goal {
  text: string;
  /** where the shell should point: a pillar, and a sub-tab when it matters */
  where: 'combat' | 'lantern' | 'arsenal' | 'cortege' | 'creeds' | null;
  tab?: string;
}

export function nextGoal(state: GameState): Goal {
  const enc = state.encounter;
  const p = state.player;
  if (state.deathScreen > 0) return { text: 'Unmade. You wake at the Lantern; your marrow lies where you fell.', where: 'combat' };
  if (state.descent.run) {
    const run = state.descent.run;
    if (run.offer) return { text: 'Floor cleared. Take a boon, or climb out with the haul.', where: 'combat' };
    return { text: `The Stair, floor ${run.floor}: ${run.kills} of ${run.need} felled. Withdraw whenever you like; die and the haul is lost.`, where: 'combat' };
  }
  if (state.remainsRun) {
    const r = state.remainsRun;
    return { text: `Your marrow lies at ${getZone(r.zone).tiers[r.targetTier]?.name ?? 'the road ahead'}. One kill a tier brings it back.`, where: 'combat' };
  }
  if (state.stats.kills.lt(1)) return { text: 'Strike the foe. What it drops is marrow, and marrow is everything.', where: 'combat' };
  const zone = getZone(enc.zone);
  const zp = state.zones[enc.zone];
  const cost = levelCost(p.level);
  const rich = state.marrow.gte(cost);
  if (rich && p.level < 4) return { text: `Rest at the Lantern: a level costs ${cost.toString()} marrow, and you have it.`, where: 'lantern', tab: 'rest' };
  if (enc.tier === -1 || enc.tier === -2 || enc.tier === -3) return { text: 'The lord. Watch the red wind-up; dodge as it fills; strike when its composure breaks.', where: 'combat' };
  if (zp && enc.tier >= 0) {
    const tier = zone.tiers[enc.tier];
    const kills = zp.kills[enc.tier] ?? 0;
    if (zp.cleared < enc.tier) return { text: `Clear ${tier.name}: ${Math.min(kills, tier.kills)} of ${tier.kills} felled.`, where: 'combat' };
    if (enc.tier + 1 < zone.tiers.length) return { text: `${tier.name} is cleared. ${zone.tiers[enc.tier + 1].name} waits: Lantern, then Road.`, where: 'lantern', tab: 'road' };
    if (zp.bossKills < 1) return { text: `The road is cleared. Its lord waits at the end: Lantern, then Road, then Challenge.`, where: 'lantern', tab: 'road' };
  }
  if (canSnuff(state) === null && state.prestige.wakings < 1) return { text: 'A lord has fallen. Snuff the flame (Lantern, then Snuff): Vestige is permanent, and the road comes back richer.', where: 'lantern', tab: 'snuff' };
  const next = ZONE_ORDER[ZONE_ORDER.indexOf(enc.zone) + 1];
  if (next && state.unlockedZones.includes(next)) {
    const np = state.zones[next];
    if (!np || np.cleared < getZone(next).tiers.length - 1) return { text: `${getZone(next).name} is open on the Road. Deeper pays more, and hits harder.`, where: 'lantern', tab: 'road' };
  }
  if (rich) return { text: `A level is affordable at the Lantern (${cost.toString()} marrow).`, where: 'lantern', tab: 'rest' };
  return { text: 'Hold and farm, or go deeper on the Road. Either way the marrow comes.', where: 'combat' };
}
