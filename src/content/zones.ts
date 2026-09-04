import type { ZoneDef } from './types';

export const ZONES: Record<string, ZoneDef> = {
  approach: {
    id: 'approach',
    name: 'The Cindered Approach',
    region: 1,
    materialTier: 1,
    requires: null,
    boss: 'coldPyreWarden',
    secretBoss: 'hangedPilgrim',
    phantom: 'solaire',
    tiers: [
      { name: 'Ash Slopes', enemies: ['hollowPilgrim', 'ashRat'], kills: 6 },
      { name: 'The Toll Gate', enemies: ['tollWarden', 'deserterCrossbow', 'hollowPilgrim'], kills: 8 },
      { name: 'Pyre Yard', enemies: ['pyreHound', 'charredAcolyte'], kills: 10 },
      { name: 'Gallows Walk', enemies: ['gallowsKnight', 'cinderWraith'], kills: 12 },
    ],
    lore: 'A road of packed ash leading up to the Cold Pyre. Once, pilgrims walked it singing. The ash is what is left of the singing.',
  },
};

export const ZONE_ORDER: string[] = ['approach'];
