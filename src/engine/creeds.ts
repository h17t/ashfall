/**
 * Creeds: join/leave, reputation, exclusive upgrades. Modifiers are aggregated in mods.ts.
 */
import { D, Decimal } from './num';
import { CREEDS, getZone } from '@/content';
import type { GameState } from './types';
import { levelCost } from './formulas';
import { registerActionHandler } from './registry';

export function creedAvailable(state: GameState, id: string): string | null {
  const c = CREEDS[id];
  if (!c) return 'No such creed.';
  const maxRegion = Math.max(...state.unlockedZones.map((z) => getZone(z).region));
  if (c.region > maxRegion) return `Its altar lies in Region ${c.region}.`;
  if (id === 'legion' && state.cortege.recruited.length === 0) return 'The Legion admits only those who lead others. Recruit a shade.';
  if (id === 'nadir' && state.stats.bossKills < 2 && state.prestige.wakings === 0) return 'The dark does not bargain with the untested. Fell two lords.';
  return null;
}

/** Cost to switch into a creed: 3 level-ups, growing with each switch. The first oath is free. */
export function switchCost(state: GameState): Decimal {
  if (state.creed.switches === 0) return D(0);
  return levelCost(state.player.level).mul(3).mul(Decimal.pow(1.5, state.creed.switches - 1)).floor();
}

export function upgradeCost(state: GameState, covenantId: string, upgradeId: string): Decimal {
  const up = CREEDS[covenantId].upgrades.find((u) => u.id === upgradeId)!;
  const rank = state.creed.upgrades[upgradeId] ?? 0;
  return levelCost(state.player.level).mul(up.cost).mul(Decimal.pow(2, rank)).floor();
}

export function addRep(state: GameState, amount: number) {
  const c = state.creed.current;
  if (!c) return;
  state.creed.rep[c] = (state.creed.rep[c] ?? 0) + amount;
}

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'joinCreed': {
      if (action.creed === null) {
        if (!state.creed.current) return true;
        state.creed.current = null;
        events.push({ type: 'notice', text: 'You forsake your oath. Your standing with them is remembered.' });
        return true;
      }
      const why = creedAvailable(state, action.creed);
      if (why) return err(why);
      if (state.creed.current === action.creed) return err('Already sworn.');
      const cost = switchCost(state);
      if (state.marrow.lt(cost)) return err(`Swearing a new oath costs ${cost.toString()} marrow.`);
      state.marrow = state.marrow.sub(cost);
      state.creed.switches++;
      state.creed.current = action.creed;
      state.creed.rep[action.creed] = state.creed.rep[action.creed] ?? 0;
      events.push({ type: 'unlock', what: 'creed:' + action.creed, text: `You swear yourself to the ${CREEDS[action.creed].name}.` });
      return true;
    }
    case 'buyCreedUpgrade': {
      const c = state.creed.current;
      if (!c) return err('You are sworn to no one.');
      const up = CREEDS[c].upgrades.find((u) => u.id === action.upgrade);
      if (!up) return err('No such rite.');
      const rank = state.creed.upgrades[up.id] ?? 0;
      if (rank >= up.maxRank) return err('Already at its height.');
      if ((state.creed.rep[c] ?? 0) < up.repReq) return err(`Requires ${up.repReq} standing.`);
      const cost = upgradeCost(state, c, up.id);
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      state.creed.upgrades[up.id] = rank + 1;
      return true;
    }
  }
  return false;
});
