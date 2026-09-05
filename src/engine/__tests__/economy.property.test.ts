import { describe, it, expect } from 'vitest';
import { newGame, advance, type Action } from '..';
import { makeRng, rand, randInt, pick } from '../rng';
import { checkInvariants } from '@/sim/harness';
import { STAT_KEYS } from '../types';
import { WEAPONS } from '@/content';

/**
 * Property test: random action sequences never produce negative currency, NaN or Infinity,
 * and never throw.
 */
describe('economy invariants under random play', () => {
  const weaponIds = Object.keys(WEAPONS);
  for (let seed = 1; seed <= 12; seed++) {
    it(`seed ${seed}`, () => {
      const s = newGame(seed);
      const r = makeRng(seed * 7919);
      for (let i = 0; i < 4000; i++) {
        const actions: Action[] = [];
        const roll = rand(r);
        if (roll < 0.5) actions.push({ type: 'click' });
        else if (roll < 0.55) actions.push({ type: 'dodge' });
        else if (roll < 0.6) actions.push({ type: 'draughts' });
        else if (roll < 0.65) actions.push({ type: 'levelUp', stat: pick(r, STAT_KEYS) });
        else if (roll < 0.7) actions.push({ type: 'buyWeapon', weapon: pick(r, weaponIds) });
        else if (roll < 0.74) actions.push({ type: 'reinforce', weapon: pick(r, weaponIds) });
        else if (roll < 0.77) actions.push({ type: 'equip', weapon: pick(r, weaponIds) });
        else if (roll < 0.8) actions.push({ type: 'travel', zone: 'tollroad', tier: randInt(r, -2, 4) });
        else if (roll < 0.82) actions.push({ type: 'retreat' });
        else if (roll < 0.83) actions.push({ type: 'abandonRemains' });
        else if (roll < 0.84) actions.push({ type: 'chooseKeepsake', boss: 'coldPyreWarden', choice: rand(r) < 0.5 ? 'weapon' : 'spell' });
        else if (roll < 0.85) actions.push({ type: 'cast', slot: 0 });
        // occasionally gift marrow/materials so purchases actually happen
        if (rand(r) < 0.02) s.marrow = s.marrow.add(randInt(r, 0, 5000));
        if (rand(r) < 0.02) s.materials.shard = (s.materials.shard ?? 0) + 3;
        expect(() => advance(s, 0.1 * randInt(r, 1, 10), actions)).not.toThrow();
        const errs = checkInvariants(s);
        expect(errs).toEqual([]);
      }
    });
  }
});
