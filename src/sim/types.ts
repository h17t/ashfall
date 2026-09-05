import type { GameState, Action } from '@/engine';
import type { Mods } from '@/engine';

/** Read-only view handed to strategies each decision tick. */
export interface SimView {
  state: GameState;
  mods: Mods;
  /** seconds since sim start */
  t: number;
  /** 0..1 deterministic random for this decision tick */
  rand: () => number;
}

export interface Strategy {
  id: string;
  description: string;
  /** Called every logic tick (0.1s). Return the actions to apply before the tick. */
  decide(view: SimView): Action[];
}

export interface Milestones {
  autoAttack: number | null;
  firstDeath: number | null;
  firstBoss: number | null;
  bosses: Record<string, number>;
  regions: Record<number, number>;
  firstKindle: number | null;
  wakings: number[];
  firstSigil: number | null;
  unmake: number | null;
  level10: number | null;
  level25: number | null;
  level50: number | null;
  level100: number | null;
}

export interface Stall {
  from: number;
  duration: number;
  where: string;
  level: number;
}

export interface SimResult {
  strategy: string;
  seed: number;
  hours: number;
  wallMs: number;
  milestones: Milestones;
  /** marrow earned per hour bucket */
  marrowPerHour: string[];
  levelsPerHour: number[];
  deepestPerHour: number[];
  deaths: number;
  kills: string;
  finalLevel: number;
  finalDeepest: number;
  finalKindles: number;
  stalls: Stall[];
  invariantErrors: string[];
  notes: string[];
  /** the Stair: runs made, runs that died, best floor, marrow banked, and the median over banked runs of (the run's marrow per minute ÷ the road's marrow per minute since the previous run) */
  descent: { runs: number; deaths: number; bestFloor: number; banked: string; ratio: number };
  /** the stretch mechanics: expeditions sent and shades lost, holdfasts held and raids repelled, war contribution, arts used */
  stretch: { sent: number; lost: number; holdfasts: number; raids: number; repelled: number; contributed: number; arts: number };
}
