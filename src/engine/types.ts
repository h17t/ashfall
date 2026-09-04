/**
 * Core engine types. The engine is framework-free and deterministic:
 * given a GameState, a dt and a list of Actions it produces the next GameState plus Events.
 * See DESIGN.md §"Engine purity" for the in-place mutation convention.
 */
import type { Decimal } from './num';
import type { RngState } from './rng';

export type StatKey = 'vig' | 'end' | 'str' | 'dex' | 'int' | 'fth';
export const STAT_KEYS: StatKey[] = ['vig', 'end', 'str', 'dex', 'int', 'fth'];

export type Grade = '-' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type DamageType = 'physical' | 'magic' | 'fire' | 'lightning' | 'dark';
export type StatusKey = 'bleed' | 'poison' | 'frost';
export type InfusionKey = 'none' | 'heavy' | 'keen' | 'magic' | 'blessed' | 'bleed' | 'poison' | 'frost';
export type WeaponArchetype = 'fast' | 'heavy' | 'hybrid' | 'catalyst';
export type SchoolKey = 'sorcery' | 'miracle' | 'pyromancy' | 'hex';
export type PhantomRole = 'dps' | 'stagger' | 'healer' | 'buffer' | 'status';
export type PhantomAssignment = 'beside' | 'hunt';

/** Player-side timed buff. */
export interface Buff {
  id: string;
  /** seconds remaining */
  t: number;
  /** multiplicative damage bonus (1.3 = +30%) */
  dmg?: number;
  /** multiplicative soul gain */
  souls?: number;
  /** stagger power multiplier */
  stagger?: number;
  /** damage taken multiplier (0.7 = 30% less) */
  taken?: number;
  /** stamina regen multiplier */
  stamRegen?: number;
  /** flat hp regen / s */
  hpRegen?: number;
}

export interface StatusState {
  /** buildup toward proc, 0..threshold */
  buildup: number;
  /** seconds of active effect remaining (0 = inactive) */
  active: number;
  /** DoT damage per second while active (poison), or stored for frost slow */
  dps: Decimal;
}

export interface EnemyInstance {
  id: string;
  /** Display name including NG+ variant prefix. */
  name: string;
  isBoss: boolean;
  /** For bosses: which phase (0-based). */
  phase: number;
  hp: Decimal;
  hpMax: Decimal;
  /** stagger meter 0..poise */
  stagger: number;
  poise: number;
  /** seconds of riposte window remaining (0 = none) */
  riposte: number;
  /** attack cycle: time until the next attack begins its wind-up */
  attackIn: number;
  /** wind-up remaining; >0 means a telegraph is active */
  windup: number;
  /** total windup duration for the current telegraph (for UI) */
  windupTotal: number;
  /** damage dealt by the pending attack */
  attackDamage: number;
  /** id of the attack pattern being telegraphed */
  attackId: string;
  statuses: Record<StatusKey, StatusState>;
  /** Boss-specific scratch data (mechanics). */
  mech: Record<string, number>;
  /** Variant modifier ids (NG+). */
  variants: string[];
  /** soul reward */
  souls: Decimal;
}

export interface WeaponInstance {
  id: string;
  level: number; // +0..+10
  infusion: InfusionKey;
}

export interface PlayerState {
  level: number;
  stats: Record<StatKey, number>;
  hp: number;
  hpMax: number;
  stamina: number;
  staminaMax: number;
  fp: number;
  fpMax: number;
  estus: number;
  estusMax: number;
  estusPotency: number; // fraction of max hp healed
  weapon: string; // equipped weapon id
  weapons: Record<string, WeaponInstance>;
  /** attuned spell ids (by slot) */
  attuned: (string | null)[];
  attunementSlots: number;
  /** spell cooldowns remaining by spell id */
  cooldowns: Record<string, number>;
  /** dodge */
  dodgeCd: number;
  iframes: number;
  buffs: Buff[];
  /** pyromancy flame level */
  flameLevel: number;
  /** player status effects (bleed/poison from enemies) */
  poisoned: number;
  /** seconds until next auto-attack */
  autoAttackIn: number;
  /** set when a dodge was pressed inside the perfect window; consumed on attack resolution */
  perfectPending: boolean;
  /** consumables */
  respecs: number;
}

export interface Bloodstain {
  souls: Decimal;
  zone: string;
  tier: number; // tier index, or -1 for boss arena, -2 secret boss
}

/** The "corpse run" after death: sequential progress required to reach the bloodstain. */
export interface CorpseRun {
  zone: string;
  targetTier: number;
  /** tier the player is currently fighting through */
  atTier: number;
  killsAtTier: number;
}

export interface ZoneProgress {
  /** kills recorded per tier index */
  kills: number[];
  /** highest tier index that has been cleared (-1 = none) */
  cleared: number;
  bossKills: number;
  secretKills: number;
  /** discovered secret boss */
  secretFound: boolean;
}

export interface Encounter {
  zone: string;
  /** tier index; -1 boss, -2 secret boss */
  tier: number;
  enemy: EnemyInstance | null;
  /** seconds until the next enemy spawns (after a kill) */
  respawnIn: number;
  /** consecutive kills without resting (for UI and some covenant effects) */
  streak: number;
  /** total time in this encounter, for boss enrage mechanics */
  t: number;
}

export interface PhantomState {
  id: string;
  level: number;
  xp: Decimal;
  weapon: string | null;
  assignment: PhantomAssignment;
  /** current hp fraction 0..1 when hunting (for wipe/retreat logic) */
  hpFrac: number;
  /** seconds until phantom's next action (attack/heal) */
  actIn: number;
  /** if retreating after a wipe: seconds remaining */
  retreat: number;
}

export interface SquadState {
  phantoms: PhantomState[];
  /** tier the hunters are grinding; 'auto' picks highest survivable */
  huntZone: string;
  huntTier: number;
  huntAuto: boolean;
  /** accumulated fractional kills (closed-form rate integration) */
  killAcc: number;
  /** maximum simultaneous phantoms */
  slots: number;
  recruited: string[];
  /** temporary squad-wide damage buff from spells */
  buff: { mult: number; t: number };
}

export interface CovenantState {
  current: string | null;
  /** reputation per covenant (persists through Kindling) */
  rep: Record<string, number>;
  /** purchased covenant upgrades */
  upgrades: Record<string, number>;
  /** souls-cost multiplier for switching (grows) */
  switches: number;
}

export interface PrestigeState {
  kindles: number; // NG+ cycle index (0 = NG)
  humanity: Decimal;
  humanityTotal: Decimal;
  /** skill tree node purchases: nodeId -> rank */
  tree: Record<string, number>;
  sigils: number;
  sigilMarks: Decimal;
  sigilUnlocks: Record<string, number>;
  /** Age of Dark */
  darkLevel: number;
  darkEmbers: Decimal;
  /** bosses defeated at least once (ids), kept for NG+ new-boss scheduling */
  bossesEverKilled: string[];
  /** per-cycle bonus bosses that have appeared */
  cycleBossesSpawned: string[];
}

export interface AutomationState {
  autoAttack: boolean;
  autoRiposte: boolean;
  autoDodge: boolean;
  autoEstus: boolean;
  autoLevel: boolean;
  autoLevelStat: StatKey | 'balanced';
  autoKindle: boolean;
  autoKindleAt: number; // NG+ trigger: kindle when humanity gain >= threshold multiple
  autoSpells: boolean;
  autoAdvance: boolean;
  /** unlocked automation features */
  unlocked: string[];
}

export interface Stats {
  kills: Decimal;
  deaths: number;
  bossKills: number;
  soulsEarned: Decimal;
  soulsLost: Decimal;
  clicks: number;
  ripostes: number;
  perfectDodges: number;
  playTime: number;
  /** souls earned this cycle (for humanity calc) */
  cycleSouls: Decimal;
  cycleKills: Decimal;
  cycleTime: number;
  deepestTier: number; // global tier index reached (for humanity + hunting)
  cycleDeepest: number;
  cycleBosses: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: RngState;
  /** engine time in seconds (deterministic, only advanced by tick) */
  t: number;
  /** wall-clock ms of last save (set by the host, read by offline calc) */
  savedAt: number;
  souls: Decimal;
  materials: Record<string, number>;
  /** boss souls held: bossId -> count */
  bossSouls: Record<string, number>;
  /** consumed boss souls: bossId -> 'weapon' | 'spell' */
  bossSoulChoices: Record<string, 'weapon' | 'spell'>;
  spellsKnown: string[];
  player: PlayerState;
  encounter: Encounter;
  bloodstain: Bloodstain | null;
  corpseRun: CorpseRun | null;
  bonfire: string; // zone id of current bonfire
  bonfiresLit: string[];
  zones: Record<string, ZoneProgress>;
  unlockedZones: string[];
  squad: SquadState;
  covenant: CovenantState;
  prestige: PrestigeState;
  automation: AutomationState;
  stats: Stats;
  /** flags for one-off unlocks / tutorial beats */
  flags: Record<string, boolean>;
  /** "YOU DIED" interstitial timer (engine-owned so the sim sees it too) */
  deathScreen: number;
  /** pending offline summary produced on load (cleared by UI ack) */
  offline: OfflineSummary | null;
}

export interface OfflineSummary {
  seconds: number;
  cappedSeconds: number;
  souls: Decimal;
  materials: Record<string, number>;
  kills: Decimal;
  phantomXp: Decimal;
  zone: string;
  tier: number;
  wiped: boolean;
}

// ---------------- Actions ----------------

export type Action =
  | { type: 'click' }
  | { type: 'dodge' }
  | { type: 'estus' }
  | { type: 'retreat' }
  | { type: 'travel'; zone: string; tier: number }
  | { type: 'abandonBloodstain' }
  | { type: 'levelUp'; stat: StatKey }
  | { type: 'equip'; weapon: string }
  | { type: 'reinforce'; weapon: string }
  | { type: 'infuse'; weapon: string; infusion: InfusionKey }
  | { type: 'buyWeapon'; weapon: string }
  | { type: 'chooseBossSoul'; boss: string; choice: 'weapon' | 'spell' }
  | { type: 'attune'; slot: number; spell: string | null }
  | { type: 'cast'; slot: number }
  | { type: 'upgradeFlame' }
  | { type: 'buyAttunementSlot' }
  | { type: 'recruit'; phantom: string }
  | { type: 'assignPhantom'; phantom: string; assignment: PhantomAssignment }
  | { type: 'levelPhantom'; phantom: string }
  | { type: 'equipPhantom'; phantom: string; weapon: string | null }
  | { type: 'setHunt'; zone: string; tier: number; auto: boolean }
  | { type: 'joinCovenant'; covenant: string | null }
  | { type: 'buyCovenantUpgrade'; upgrade: string }
  | { type: 'kindle' }
  | { type: 'buyTreeNode'; node: string }
  | { type: 'darkSigil' }
  | { type: 'buySigilUnlock'; unlock: string }
  | { type: 'ageOfDark' }
  | { type: 'setAutomation'; key: keyof AutomationState; value: boolean | string | number }
  | { type: 'upgradeEstus'; kind: 'count' | 'potency' }
  | { type: 'respec'; stats: Record<StatKey, number> }
  | { type: 'ackOffline' }
  | { type: 'ackDeath' };

// ---------------- Events ----------------

export type GameEvent =
  | { type: 'hit'; dmg: Decimal; crit: boolean; riposte: boolean; source: 'player' | 'phantom' | 'dot' | 'spell'; kind?: string }
  | { type: 'exhausted' }
  | { type: 'enemyAttack'; dmg: number; dodged: boolean; perfect: boolean; attackId: string }
  | { type: 'stagger' }
  | { type: 'riposteMissed' }
  | { type: 'kill'; enemy: string; souls: Decimal; isBoss: boolean; drops: Record<string, number> }
  | { type: 'death'; soulsLost: Decimal }
  | { type: 'bloodstainRecovered'; souls: Decimal }
  | { type: 'bloodstainLost'; souls: Decimal }
  | { type: 'heal'; amount: number }
  | { type: 'levelUp'; stat: StatKey; level: number }
  | { type: 'tierCleared'; zone: string; tier: number }
  | { type: 'bossPhase'; phase: number; name: string }
  | { type: 'bossKilled'; boss: string }
  | { type: 'zoneUnlocked'; zone: string }
  | { type: 'unlock'; what: string; text: string }
  | { type: 'statusProc'; status: StatusKey; target: 'enemy' | 'player' }
  | { type: 'cast'; spell: string }
  | { type: 'kindled'; humanity: Decimal }
  | { type: 'notice'; text: string }
  | { type: 'error'; text: string };
