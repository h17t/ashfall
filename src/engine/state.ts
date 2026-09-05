import { D, ZERO } from './num';
import { makeRng } from './rng';
import { BALANCE } from '@/content/balance';
import { STARTING_WEAPON, ZONE_ORDER } from '@/content';
import type { GameState, PlayerState, StatKey, ZoneProgress } from './types';
import { playerHpMax, playerStaminaMax, playerFpMax } from './formulas';

export const SAVE_VERSION = 3;

export function newZoneProgress(tierCount: number): ZoneProgress {
  return { kills: new Array(tierCount).fill(0), cleared: -1, bossKills: 0, secretKills: 0, cycleKills: 0, secretFound: false };
}

export function newPlayer(): PlayerState {
  const stats = { ...BALANCE.level.startingStats } as Record<StatKey, number>;
  const hpMax = playerHpMax(stats.vit, 1, 1);
  const stamMax = playerStaminaMax(stats.bre);
  const fpMax = playerFpMax(stats.ins, stats.dev, 1);
  return {
    level: 1,
    stats,
    hp: hpMax,
    hpMax,
    stamina: stamMax,
    staminaMax: stamMax,
    fp: fpMax,
    fpMax,
    draughts: BALANCE.player.draughtsStart,
    draughtsMax: BALANCE.player.draughtsStart,
    draughtPotency: BALANCE.player.draughtPotency,
    weapon: STARTING_WEAPON,
    weapons: { [STARTING_WEAPON]: { id: STARTING_WEAPON, level: 0, infusion: 'none' } },
    recited: [],
    recitationSlots: 0,
    cooldowns: {},
    dodgeCd: 0,
    iframes: 0,
    buffs: [],
    brandLevel: 0,
    poisoned: 0,
    autoAttackIn: 0,
    perfectPending: false,
    respecs: 0,
  };
}

export function newGame(seed = 1): GameState {
  const first = ZONE_ORDER[0];
  return {
    version: SAVE_VERSION,
    seed,
    rng: makeRng(seed),
    t: 0,
    savedAt: 0,
    marrow: ZERO,
    materials: {},
    keepsakes: {},
    keepsakeChoices: {},
    spellsKnown: [],
    player: newPlayer(),
    encounter: { zone: first, tier: 0, enemy: null, respawnIn: 0, streak: 0, t: 0 },
    remains: null,
    remainsRun: null,
    lantern: first,
    lanternsLit: [first],
    zones: {},
    unlockedZones: [first],
    cortege: { shades: [], huntZone: first, huntTier: 0, huntAuto: true, killAcc: 0, matAcc: {}, slots: 0, recruited: [], buff: { mult: 1, t: 0 } },
    creed: { current: null, rep: {}, upgrades: {}, switches: 0 },
    prestige: {
      wakings: 0, vestige: ZERO, vestigeTotal: ZERO, tree: {}, severings: 0, threads: ZERO, severingUnlocks: {},
      unmaking: 0, unmakingDust: ZERO, bossesEverKilled: [], cycleBossesSpawned: [], nadirDepth: 0, nadirRecord: 0, lastSnuffGain: ZERO, lastSeverGain: ZERO,
    },
    automation: {
      autoAttack: false, autoReprisal: false, autoDodge: false, autoDraught: false, autoLevel: false, autoLevelStat: 'balanced',
      autoSnuff: false, autoSnuffAt: 2, autoSpells: false, autoAdvance: false, autoSever: false, unlocked: [],
    },
    stats: {
      kills: ZERO, deaths: 0, bossKills: 0, marrowEarned: ZERO, marrowLost: ZERO, clicks: 0, reprisals: 0, perfectDodges: 0, playTime: 0,
      cycleMarrow: ZERO, cycleKills: ZERO, cycleTime: 0, deepestTier: 0, cycleDeepest: 0, cycleBosses: 0,
    },
    flags: {},
    deathScreen: 0,
    offline: null,
    descent: { run: null, runs: 0, bestFloor: 0, bankedTotal: ZERO, last: null },
  };
}

export { D };
