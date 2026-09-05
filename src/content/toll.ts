/**
 * The Toll: the world's clock. Dawn, Day, Dusk and the rare Black Hour, repeating; each phase
 * tilts the road a little. Nothing here punishes an absence: every phase only adds, and the Black
 * Hour's danger is the price of its pay.
 */
export type TollPhase = 'dawn' | 'day' | 'dusk' | 'black';
export interface TollPhaseDef {
  id: TollPhase;
  name: string;
  /** minutes */
  minutes: number;
  lore: string;
  /** what it does, in words */
  effects: string[];
  fx: { enemyHp?: number; enemyDmg?: number; marrow?: number; materials?: number; draught?: number; statusBuild?: number; stairPay?: number; blackSpawns?: boolean };
  /** the creed whose passive is doubled in this hour */
  creed: string;
}
export const TOLL_PHASES: TollPhaseDef[] = [
  { id: 'dawn', name: 'Dawn', minutes: 8, lore: 'The ash is grey and the road is quiet. Whatever walks it is still waking.', effects: ['Tallowdraughts heal +25%', 'Enemies hit −10%', 'The Wickkeepers\' passive doubled'], fx: { draught: 1.25, enemyDmg: 0.9 }, creed: 'wick' },
  { id: 'day', name: 'Day', minutes: 14, lore: 'Such light as there is. The lords hold court and the road pays its due.', effects: ['Marrow +5%', 'The Legion\'s passive doubled'], fx: { marrow: 1.05 }, creed: 'legion' },
  { id: 'dusk', name: 'Dusk', minutes: 12, lore: 'Things come out of the walls at dusk to feed, and drop what they carried.', effects: ['Material drops +40%', 'Status buildup +25%', 'The Rot Wardens\' passive doubled'], fx: { materials: 1.4, statusBuild: 1.25 }, creed: 'rot' },
  { id: 'black', name: 'The Black Hour', minutes: 6, lore: 'The fire goes out in every lantern but yours. What the dark sends is worse, and it carries the best of everything.', effects: ['Enemies +50% HP and damage', 'Marrow ×1.75, material drops ×2', 'Stair haul ×1.5', 'Dark-touched spawns', 'The Vigil\'s and the Nadir Pact\'s passives doubled'], fx: { enemyHp: 1.5, enemyDmg: 1.5, marrow: 1.75, materials: 2, stairPay: 1.5, blackSpawns: true }, creed: 'vigil' },
];
export const TOLL_CYCLE_SECONDS = TOLL_PHASES.reduce((a, p) => a + p.minutes * 60, 0);
