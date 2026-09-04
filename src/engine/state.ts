import { D, ZERO } from './num';
import { makeRng } from './rng';
import { BALANCE } from '@/content/balance';
import { STARTING_WEAPON, ZONE_ORDER } from '@/content';
import type { GameState, PlayerState, StatKey, ZoneProgress } from './types';
import { playerHpMax, playerStaminaMax, playerFpMax } from './formulas';

export const SAVE_VERSION = 1;

export function newZoneProgress(tierCount: number): ZoneProgress {
  return { kills: new Array(tierCount).fill(0), cleared: -1, bossKills: 0, secretKills: 0, cycleKills: 0, secretFound: false };
}

export function newPlayer(): PlayerState {
  const stats = { ...BALANCE.level.startingStats } as Record<StatKey, number>;
  const hpMax = playerHpMax(stats.vig, 1, 1);
  const stamMax = playerStaminaMax(stats.end);
  const fpMax = playerFpMax(stats.int, stats.fth, 1);
  return {
    level: 1,
    stats,
    hp: hpMax,
    hpMax,
    stamina: stamMax,
    staminaMax: stamMax,
    fp: fpMax,
    fpMax,
    estus: BALANCE.player.estusStart,
    estusMax: BALANCE.player.estusStart,
    estusPotency: BALANCE.player.estusPotency,
    weapon: STARTING_WEAPON,
    weapons: { [STARTING_WEAPON]: { id: STARTING_WEAPON, level: 0, infusion: 'none' } },
    attuned: [],
    attunementSlots: 0,
    cooldowns: {},
    dodgeCd: 0,
    iframes: 0,
    buffs: [],
    flameLevel: 0,
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
    souls: ZERO,
    materials: {},
    bossSouls: {},
    bossSoulChoices: {},
    spellsKnown: [],
    player: newPlayer(),
    encounter: { zone: first, tier: 0, enemy: null, respawnIn: 0, streak: 0, t: 0 },
    bloodstain: null,
    corpseRun: null,
    bonfire: first,
    bonfiresLit: [first],
    zones: {},
    unlockedZones: [first],
    squad: { phantoms: [], huntZone: first, huntTier: 0, huntAuto: true, killAcc: 0, matAcc: {}, slots: 0, recruited: [], buff: { mult: 1, t: 0 } },
    covenant: { current: null, rep: {}, upgrades: {}, switches: 0 },
    prestige: {
      kindles: 0, humanity: ZERO, humanityTotal: ZERO, tree: {}, sigils: 0, sigilMarks: ZERO, sigilUnlocks: {},
      darkLevel: 0, darkEmbers: ZERO, bossesEverKilled: [], cycleBossesSpawned: [],
    },
    automation: {
      autoAttack: false, autoRiposte: false, autoDodge: false, autoEstus: false, autoLevel: false, autoLevelStat: 'balanced',
      autoKindle: false, autoKindleAt: 2, autoSpells: false, autoAdvance: false, unlocked: [],
    },
    stats: {
      kills: ZERO, deaths: 0, bossKills: 0, soulsEarned: ZERO, soulsLost: ZERO, clicks: 0, ripostes: 0, perfectDodges: 0, playTime: 0,
      cycleSouls: ZERO, cycleKills: ZERO, cycleTime: 0, deepestTier: 0, cycleDeepest: 0, cycleBosses: 0,
    },
    flags: {},
    deathScreen: 0,
    offline: null,
  };
}

export { D };
