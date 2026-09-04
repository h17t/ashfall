/**
 * Every tunable number in one place. Growth rates are the design surface.
 * BALANCE.md records the simulator output for each revision of this file.
 */
export const BALANCE = {
  tick: 0.1, // seconds per logic tick (10Hz)

  // ---- Enemy baselines by global tier index g ----
  enemy: {
    hpBase: 60,
    hpGrowth: 1.55, // per global tier
    dmgBase: 20,
    dmgGrowth: 1.2,
    poiseBase: 26,
    poiseGrowth: 1.12,
    soulBase: 6,
    soulGrowth: 1.5,
    respawnDelay: 0.6,
    /** boss HP as multiple of its zone's last-tier baseline */
    bossHpMult: 30,
    bossDmgMult: 2.4,
    bossPoiseMult: 4,
    bossSoulMult: 40,
    secretBossHpMult: 45,
    secretBossSoulMult: 70,
  },

  // ---- NG+ scaling per kindle ----
  ng: {
    hpGrowth: 1.45,
    dmgGrowth: 1.2,
    soulGrowth: 1.55, // souls outgrow HP: a cycle is net-positive, so the 20 minutes after a Kindle are faster than the 20 before
    dropGrowth: 1.35,
  },

  // ---- Player ----
  player: {
    hpBase: 100,
    hpPerVig: 14, // per curve-point (see statCurve, 0..~1.15 -> scaled by 40)
    hpPerLevel: 1.035, // multiplicative HP per soul level ("ember hardening")
    dmgPerLevel: 1.025, // multiplicative damage per soul level: levels always pay, stats decide how
    staminaBase: 60,
    staminaPerEnd: 1.6,
    staminaRegenBase: 18,
    staminaRegenPerEnd: 0.5,
    /** damage multiplier when attacking without enough stamina */
    exhaustedMult: 0.4,
    fpBase: 20,
    fpPerIntFth: 2.5,
    fpRegen: 1.2, // per second
    estusStart: 3,
    estusPotency: 0.4,
    dodgeCd: 1.6,
    iframes: 0.45,
    perfectWindow: 0.22,
    perfectBuff: { dmg: 1.35, t: 4 },
    critMult: 2.0,
    baseCrit: 0.05,
    critPerDex: 0.0025, // per dex point up to 40
    riposteWindow: 2.0,
    /** heavy stagger reduces enemy attack progress by this fraction on stagger */
    staggerResetsAttack: true,
    autoAttackRate: 1.0, // attacks/sec base for the auto-attack unlock
    respawnHeal: 1.0,
    deathScreen: 1.2,
  },

  // ---- Leveling ----
  level: {
    costBase: 30,
    costGrowth: 1.115,
    costLinear: 6,
    /** soft caps in stat points */
    softCaps: [20, 40, 60] as const,
    /** stat curve slopes per band; band 4 is beyond the last soft cap */
    slopes: [0.03, 0.0175, 0.008, 0.0025] as const,
    startingStats: { vig: 10, end: 10, str: 10, dex: 10, int: 8, fth: 8 },
  },

  // ---- Weapons ----
  weapon: {
    reinforceGrowth: 1.15, // damage per +1
    reinforceCostBase: 40,
    reinforceCostGrowth: 1.9,
    /** grade coefficients for scaling */
    grade: { '-': 0, E: 0.25, D: 0.5, C: 0.8, B: 1.1, A: 1.4, S: 1.8 } as Record<string, number>,
    /** unmet requirement damage multiplier */
    reqPenalty: 0.5,
    /** infusion: base multiplier and scaling override strength */
    infusion: {
      heavy: { base: 0.95, grade: 'A', stat: 'str' },
      keen: { base: 0.95, grade: 'A', stat: 'dex' },
      magic: { base: 0.9, grade: 'A', stat: 'int', type: 'magic' },
      blessed: { base: 0.9, grade: 'A', stat: 'fth', type: 'lightning' },
      bleed: { base: 0.85, status: 'bleed', amount: 22 },
      poison: { base: 0.85, status: 'poison', amount: 22 },
      frost: { base: 0.85, status: 'frost', amount: 20 },
    } as Record<string, { base: number; grade?: string; stat?: string; type?: string; status?: string; amount?: number }>,
  },

  // ---- Status effects ----
  status: {
    threshold: 100,
    decay: 6, // buildup lost per second when not applying
    bleed: { burstFrac: 0.12, duration: 0 }, // burst % of max hp
    poison: { duration: 12, dpsFrac: 0.012 }, // % of max hp per second
    frost: { duration: 8, slow: 0.5, staggerBonus: 1.5, burstFrac: 0.05 },
  },

  // ---- Death ----
  death: {
    /** kills needed per tier during the corpse run */
    runKillsPerTier: 1,
  },

  // ---- Phantoms ----
  phantom: {
    levelCostBase: 25,
    levelCostGrowth: 1.14,
    powerPerLevel: 1.07, // multiplicative damage per level
    hpPerLevel: 1.06,
    xpPerKillMult: 1.0,
    /** fraction of soul value that phantom kills yield when hunting */
    huntSoulFrac: 0.45,
    /** fraction of drops when hunting */
    huntDropFrac: 0.6,
    /** beside-the-player damage fraction vs hunting damage */
    besideDmgMult: 1.0,
    /** squad retreats for this long after a wipe */
    retreatTime: 30,
    /** squad recovery per second as a fraction of its max hp (before healers) */
    baseRegenFrac: 0.05,
    /** below this uptime (recovery / incoming) the squad wipes and retreats */
    wipeUptime: 0.25,
  },

  // ---- Offline ----
  offline: {
    capHours: 12,
    /** offline rate relative to online hunting rate */
    rateMult: 0.8,
    minSeconds: 30,
  },

  // ---- Prestige ----
  prestige: {
    /** humanity = (cycleSouls / divisor) ^ exponent * bossBonus */
    humanityDivisor: 5000,
    humanityExponent: 0.42,
    humanityPerBoss: 1.15, // multiplicative per boss killed this cycle
    minHumanity: 1,
    /** Dark Sigil unlock NG+ count */
    sigilAt: 5,
    sigilMarkDivisor: 25,
    sigilMarkExponent: 0.6,
    ageOfDarkAt: 3, // sigils required
  },

  covenant: {
    switchCostBase: 500,
    switchCostGrowth: 2.2,
  },

  // ---- Pacing targets (asserted by simulation tests, minutes) ----
  targets: {
    firstBossMin: [6, 16],
    firstKindleHours: [3, 7],
    firstSigilHours: [30, 60],
    autoAttackMin: [3, 10],
  },
} as const;

export type Balance = typeof BALANCE;
