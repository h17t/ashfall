/**
 * Covenants: join/leave, reputation, exclusive upgrades. Modifiers are aggregated in mods.ts.
 */
import { D, Decimal } from './num';
import { COVENANTS, getZone } from '@/content';
import type { GameState } from './types';
import { levelCost } from './formulas';
import { registerActionHandler } from './registry';

export function covenantAvailable(state: GameState, id: string): string | null {
  const c = COVENANTS[id];
  if (!c) return 'No such covenant.';
  const maxRegion = Math.max(...state.unlockedZones.map((z) => getZone(z).region));
  if (c.region > maxRegion) return `Its altar lies in Region ${c.region}.`;
  if (id === 'legion' && state.squad.recruited.length === 0) return 'The Legion admits only those who lead others. Recruit a phantom.';
  if (id === 'abyss' && state.stats.bossKills < 2 && state.prestige.kindles === 0) return 'The dark does not bargain with the untested. Fell two lords.';
  return null;
}

/** Cost to switch into a covenant: 3 level-ups, growing with each switch. The first oath is free. */
export function switchCost(state: GameState): Decimal {
  if (state.covenant.switches === 0) return D(0);
  return levelCost(state.player.level).mul(3).mul(Decimal.pow(1.5, state.covenant.switches - 1)).floor();
}

export function upgradeCost(state: GameState, covenantId: string, upgradeId: string): Decimal {
  const up = COVENANTS[covenantId].upgrades.find((u) => u.id === upgradeId)!;
  const rank = state.covenant.upgrades[upgradeId] ?? 0;
  return levelCost(state.player.level).mul(up.cost).mul(Decimal.pow(2, rank)).floor();
}

export function addRep(state: GameState, amount: number) {
  const c = state.covenant.current;
  if (!c) return;
  state.covenant.rep[c] = (state.covenant.rep[c] ?? 0) + amount;
}

registerActionHandler((state, action, events) => {
  const err = (text: string) => { events.push({ type: 'error', text }); return true; };
  switch (action.type) {
    case 'joinCovenant': {
      if (action.covenant === null) {
        if (!state.covenant.current) return true;
        state.covenant.current = null;
        events.push({ type: 'notice', text: 'You forsake your oath. Your standing with them is remembered.' });
        return true;
      }
      const why = covenantAvailable(state, action.covenant);
      if (why) return err(why);
      if (state.covenant.current === action.covenant) return err('Already sworn.');
      const cost = switchCost(state);
      if (state.souls.lt(cost)) return err(`Swearing a new oath costs ${cost.toString()} souls.`);
      state.souls = state.souls.sub(cost);
      state.covenant.switches++;
      state.covenant.current = action.covenant;
      state.covenant.rep[action.covenant] = state.covenant.rep[action.covenant] ?? 0;
      events.push({ type: 'unlock', what: 'covenant:' + action.covenant, text: `You swear yourself to the ${COVENANTS[action.covenant].name}.` });
      return true;
    }
    case 'buyCovenantUpgrade': {
      const c = state.covenant.current;
      if (!c) return err('You are sworn to no one.');
      const up = COVENANTS[c].upgrades.find((u) => u.id === action.upgrade);
      if (!up) return err('No such rite.');
      const rank = state.covenant.upgrades[up.id] ?? 0;
      if (rank >= up.maxRank) return err('Already at its height.');
      if ((state.covenant.rep[c] ?? 0) < up.repReq) return err(`Requires ${up.repReq} standing.`);
      const cost = upgradeCost(state, c, up.id);
      if (state.souls.lt(cost)) return err('Not enough souls.');
      state.souls = state.souls.sub(cost);
      state.covenant.upgrades[up.id] = rank + 1;
      return true;
    }
  }
  return false;
});
