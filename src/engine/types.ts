/**
 * Core engine types. The engine is framework-free and deterministic:
 * given a GameState, a dt and a list of Actions it produces the next GameState plus Events.
 * See DESIGN.md §"Engine purity" for the in-place mutation convention.
 */
import type { Decimal } from './num';
import type { RngState } from './rng';

export type StatKey = 'vit' | 'bre' | 'mig' | 'fin' | 'ins' | 'dev';
export const STAT_KEYS: StatKey[] = ['vit', 'bre', 'mig', 'fin', 'ins', 'dev'];

export type Grade = '-' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type DamageType = 'physical' | 'magic' | 'fire' | 'lightning' | 'dark';
export type StatusKey = 'bleed' | 'poison' | 'frost';
export type InfusionKey = 'none' | 'heavy' | 'keen' | 'magic' | 'blessed' | 'bleed' | 'poison' | 'frost';
export type WeaponArchetype = 'fast' | 'heavy' | 'hybrid' | 'catalyst';
export type SchoolKey = 'weaving' | 'litany' | 'ruin' | 'hex';
export type PhantomRole = 'dps' | 'strain' | 'healer' | 'buffer' | 'status';
export type PhantomAssignment = 'beside' | 'hunt' | 'away' | 'garrison';

/** Player-side timed buff. */
export interface Buff {
  id: string;
  /** seconds remaining */
  t: number;
  /** multiplicative damage bonus (1.3 = +30%) */
  dmg?: number;
  /** multiplicative Marrow gain */
  marrow?: number;
  /** strain power multiplier */
  strain?: number;
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
  /** Display name including Waking variant prefix. */
  name: string;
  isBoss: boolean;
  /** For bosses: which phase (0-based). */
  phase: number;
  hp: Decimal;
  hpMax: Decimal;
  /** strain meter 0..composure */
  strain: number;
  composure: number;
  /** seconds of reprisal window remaining (0 = none) */
  reprisal: number;
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
  /** Variant modifier ids (later wakings). */
  variants: string[];
  /** Marrow reward */
  marrow: Decimal;
}

export interface WeaponAffix { id: string; tier: 1 | 2 | 3 }
export interface WeaponInstance {
  id: string;
  level: number; // +0..+10
  infusion: InfusionKey;
  /** rolled by the forge; empty until the first reforge */
  affixes?: WeaponAffix[];
  /** affix ids held through the next reroll (at most two) */
  locked?: string[];
  /** kills made with this weapon in hand; mastery */
  mastery?: number;
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
  draughts: number;
  draughtsMax: number;
  draughtPotency: number; // fraction of max hp healed
  weapon: string; // equipped weapon id
  weapons: Record<string, WeaponInstance>;
  /** recited spell ids (by slot) */
  recited: (string | null)[];
  recitationSlots: number;
  /** spell cooldowns remaining by spell id */
  cooldowns: Record<string, number>;
  /** dodge */
  dodgeCd: number;
  iframes: number;
  buffs: Buff[];
  /** ruin flame level */
  brandLevel: number;
  /** player status effects (bleed/poison from enemies) */
  poisoned: number;
  /** seconds until next auto-attack */
  autoAttackIn: number;
  /** set when a dodge was pressed inside the perfect window; consumed on attack resolution */
  perfectPending: boolean;
  /** consumables */
  respecs: number;
  /** weapon Art cooldown and the stance or stoking it left */
  artCd?: number;
  artBuff?: { kind: string; t: number; uses: number } | null;
}

export interface Remains {
  marrow: Decimal;
  zone: string;
  tier: number; // tier index, or -1 for boss arena, -2 secret boss
}

/** The "corpse run" after death: sequential progress required to reach the remains. */
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
  /** cycle-boss kills this cycle */
  cycleKills: number;
  /** discovered secret boss */
  secretFound: boolean;
}

export interface Encounter {
  zone: string;
  /** tier index; -1 boss, -2 secret boss, -3 cycle boss */
  tier: number;
  enemy: EnemyInstance | null;
  /** seconds until the next enemy spawns (after a kill) */
  respawnIn: number;
  /** consecutive kills without resting (for UI and some creed effects) */
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
  /** seconds until shade's next action (attack/heal) */
  actIn: number;
  /** if retreating after a wipe: seconds remaining */
  retreat: number;
}

export interface SquadState {
  shades: PhantomState[];
  /** tier the hunters are grinding; 'auto' picks highest survivable */
  huntZone: string;
  huntTier: number;
  huntAuto: boolean;
  /** accumulated fractional kills (closed-form rate integration) */
  killAcc: number;
  /** accumulated fractional material drops */
  matAcc: Record<string, number>;
  /** maximum simultaneous shades */
  slots: number;
  recruited: string[];
  /** temporary cortege-wide damage buff from spells */
  buff: { mult: number; t: number };
}

export interface CovenantState {
  current: string | null;
  /** reputation per creed (persists through Snuffing) */
  rep: Record<string, number>;
  /** purchased creed upgrades */
  upgrades: Record<string, number>;
  /** marrow-cost multiplier for switching (grows) */
  switches: number;
}

export interface PrestigeState {
  wakings: number; // Waking cycle index (0 = NG)
  vestige: Decimal;
  vestigeTotal: Decimal;
  /** skill tree node purchases: nodeId -> rank */
  tree: Record<string, number>;
  severings: number;
  threads: Decimal;
  severingUnlocks: Record<string, number>;
  /** the Unmaking */
  unmaking: number;
  unmakingDust: Decimal;
  /** bosses defeated at least once (ids), kept for Waking new-boss scheduling */
  bossesEverKilled: string[];
  /** per-cycle bonus bosses that have appeared */
  cycleBossesSpawned: string[];
  /** the Nadir: current depth (persists; the stair remembers) and the record */
  nadirDepth: number;
  nadirRecord: number;
  /** what the last Snuff / Severing gathered: automation wakings when the next would beat it */
  lastSnuffGain: Decimal;
  lastSeverGain: Decimal;
}

export interface AutomationState {
  autoAttack: boolean;
  autoReprisal: boolean;
  autoDodge: boolean;
  autoDraught: boolean;
  autoLevel: boolean;
  autoLevelStat: StatKey | 'balanced';
  autoSnuff: boolean;
  autoSnuffAt: number; // Waking trigger: snuff when vestige gain >= threshold multiple
  autoSpells: boolean;
  autoAdvance: boolean;
  autoSever: boolean;
  /** unlocked automation features */
  unlocked: string[];
}

export interface Stats {
  kills: Decimal;
  deaths: number;
  bossKills: number;
  marrowEarned: Decimal;
  marrowLost: Decimal;
  clicks: number;
  reprisals: number;
  perfectDodges: number;
  playTime: number;
  /** marrow earned this cycle (for vestige calc) */
  cycleMarrow: Decimal;
  cycleKills: Decimal;
  cycleTime: number;
  deepestTier: number; // global tier index reached (for vestige + hunting)
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
  marrow: Decimal;
  materials: Record<string, number>;
  /** boss marrow held: bossId -> count */
  keepsakes: Record<string, number>;
  /** consumed boss marrow: bossId -> 'weapon' | 'spell' */
  keepsakeChoices: Record<string, 'weapon' | 'spell'>;
  spellsKnown: string[];
  player: PlayerState;
  encounter: Encounter;
  remains: Remains | null;
  remainsRun: CorpseRun | null;
  lantern: string; // zone id of current lantern
  lanternsLit: string[];
  zones: Record<string, ZoneProgress>;
  unlockedZones: string[];
  cortege: SquadState;
  creed: CovenantState;
  prestige: PrestigeState;
  automation: AutomationState;
  stats: Stats;
  /** flags for one-off unlocks / tutorial beats */
  flags: Record<string, boolean>;
  /** "UNMADE." interstitial timer (engine-owned so the sim sees it too) */
  deathScreen: number;
  /** pending offline summary produced on load (cleared by UI ack) */
  offline: OfflineSummary | null;
  /** the Stair */
  descent: DescentState;
  /** Standing Orders */
  orders: OrdersState;
  /** the Study: lifetime kills per creature and lord id; kept through every fire */
  study: Record<string, number>;
  /** curses taken on by choice */
  afflictions: string[];
  /** the Toll: the world's clock in seconds, running online and away */
  toll: { t: number; phase: string };
  dispatch: DispatchState;
  holdfasts: Record<string, Holdfast>;
  war: WarState;
}

/** A Descent in progress: floor, the boons taken, the haul not yet banked. */
export interface DescentRun {
  floor: number;
  /** kills made on this floor / kills the floor needs */
  kills: number;
  need: number;
  /** boon ids taken, in order (repeats stack) */
  boons: string[];
  /** three boon ids on offer after a cleared floor; the run waits until one is chosen or the haul banked */
  offer: string[] | null;
  haul: Decimal;
  haulMats: Record<string, number>;
  /** where the player came from, restored on withdrawal */
  from: { zone: string; tier: number };
  /** seconds spent in this run and on this floor */
  t: number;
  floorT: number;
  /** kills this run (momentum) */
  runKills: number;
  /** second-wind charges left */
  secondWind: number;
  /** whether the current enemy has been hit yet (First Cut) */
  hitOnce: boolean;
  /** seconds of Lantern-Oil left */
  oilT: number;
}

export interface DescentState {
  run: DescentRun | null;
  runs: number;
  bestFloor: number;
  bankedTotal: Decimal;
  /** the last run's outcome, for the Stair screen */
  last: { floor: number; banked: Decimal; died: boolean; boons: string[] } | null;
}

/** Standing Orders: WHEN <conditions> THEN <action>, evaluated in order every tick. */
export type OrderCondKind = 'always' | 'hp' | 'stamina' | 'fp' | 'draughts' | 'marrow' | 'enemyHp' | 'composure' | 'reprisal' | 'telegraph' | 'boss' | 'streak' | 'floor' | 'haul' | 'boonOffer';
export type OrderActKind = 'strike' | 'dodge' | 'drink' | 'cast' | 'levelUp' | 'reinforce' | 'advance' | 'retreat' | 'withdraw' | 'descend' | 'takeBoon' | 'equipBest' | 'recruit' | 'art';
export interface OrderCond {
  kind: OrderCondKind;
  /** '<' or '>' against `value`; ignored for yes/no kinds, where value 1 means "is" and 0 "is not" */
  op: '<' | '>';
  /** percent for hp/stamina/fp/enemyHp/composure; a count for draughts/streak/floor; multiples of the next level's cost for marrow; multiples of the purse for haul */
  value: number;
}
export interface OrderAct {
  kind: OrderActKind;
  /** cast: recitation slot (0-based); levelUp: a stat key or 'balanced'; takeBoon: 'epic' | 'rare' | 'first' */
  arg?: string | number;
}
export interface Order {
  id: number;
  when: OrderCond[];
  then: OrderAct;
  on: boolean;
  /** times it has fired, ever */
  fired: number;
  /** seconds until it may fire again (engine-owned) */
  cd: number;
}
export interface OrdersState {
  rules: Order[];
  nextId: number;
}

/** A shade away on an expedition. */
export interface Mission { id: number; shade: string; kind: 'safe' | 'risky' | 'perilous'; remaining: number; total: number; zone: string }
export interface DispatchState { missions: Mission[]; nextId: number; /** shades lost on the road, each a permanent Echo */ echoes: string[]; sent: number; lost: number }
/** A claimed region. */
export interface Holdfast { garrison: string[]; raidIn: number; raid: { remaining: number; kills: number } | null; raids: number; held: number; lost: number; /** seconds of halved production left after a lost raid */ slowed: number; produced: Decimal; /** fractional marrow and slag not yet paid out */ acc?: number; slagAcc?: number }
/** The Creed War. */
export interface WarState { standing: Record<string, number>; roundT: number; round: number; dominion: string | null; contributed: number }

export interface OfflineSummary {
  seconds: number;
  cappedSeconds: number;
  marrow: Decimal;
  materials: Record<string, number>;
  kills: Decimal;
  shadeXp: Decimal;
  zone: string;
  tier: number;
  wiped: boolean;
  /** share of the time away that fell in the Black Hour, credited generously */
  blackShare?: number;
  /** expeditions that came home while away */
  returns?: { shade: string; kind: string; outcome: 'success' | 'fail' | 'lost'; marrow: string }[];
  /** what the holdfasts produced while away */
  holdfastMarrow?: string;
}

// ---------------- Actions ----------------

export type Action =
  | { type: 'click' }
  | { type: 'dodge' }
  | { type: 'draughts' }
  | { type: 'retreat' }
  | { type: 'travel'; zone: string; tier: number }
  | { type: 'abandonRemains' }
  | { type: 'levelUp'; stat: StatKey }
  | { type: 'equip'; weapon: string }
  | { type: 'reinforce'; weapon: string }
  | { type: 'infuse'; weapon: string; infusion: InfusionKey }
  | { type: 'buyWeapon'; weapon: string }
  | { type: 'chooseKeepsake'; boss: string; choice: 'weapon' | 'spell' }
  | { type: 'recite'; slot: number; spell: string | null }
  | { type: 'cast'; slot: number }
  | { type: 'feedBrand' }
  | { type: 'buySpell'; spell: string }
  | { type: 'buyRecitationSlot' }
  | { type: 'recruit'; shade: string }
  | { type: 'assignShade'; shade: string; assignment: PhantomAssignment }
  | { type: 'assignShadeLevel'; shade: string }
  | { type: 'equipShade'; shade: string; weapon: string | null }
  | { type: 'setHunt'; zone: string; tier: number; auto: boolean }
  | { type: 'joinCreed'; creed: string | null }
  | { type: 'buyCreedUpgrade'; upgrade: string }
  | { type: 'snuff' }
  | { type: 'buyTreeNode'; node: string }
  | { type: 'sever' }
  | { type: 'buySeveringUnlock'; unlock: string }
  | { type: 'unmake' }
  | { type: 'setAutomation'; key: keyof AutomationState; value: boolean | string | number }
  | { type: 'upgradeDraught'; kind: 'count' | 'potency' }
  | { type: 'respec'; stats: Record<StatKey, number> }
  | { type: 'ackOffline' }
  | { type: 'ackDeath' }
  | { type: 'descend' }
  | { type: 'chooseBoon'; index: number }
  | { type: 'descentWithdraw' }
  | { type: 'setOrders'; rules: Order[] }
  | { type: 'reforge'; weapon: string }
  | { type: 'lockAffix'; weapon: string; affix: string | null }
  | { type: 'toggleAffliction'; affliction: string }
  | { type: 'dispatch'; shade: string; kind: 'safe' | 'risky' | 'perilous' }
  | { type: 'claimHoldfast'; zone: string }
  | { type: 'garrison'; shade: string; zone: string | null }
  | { type: 'art' };

// ---------------- Events ----------------

export type GameEvent =
  | { type: 'hit'; dmg: Decimal; crit: boolean; reprisal: boolean; source: 'player' | 'shade' | 'dot' | 'spell'; kind?: string }
  | { type: 'exhausted' }
  | { type: 'enemyAttack'; dmg: number; dodged: boolean; perfect: boolean; attackId: string }
  | { type: 'strain' }
  | { type: 'riposteMissed' }
  | { type: 'kill'; enemy: string; marrow: Decimal; isBoss: boolean; drops: Record<string, number> }
  | { type: 'death'; marrowLost: Decimal }
  | { type: 'remainsRecovered'; marrow: Decimal }
  | { type: 'remainsLost'; marrow: Decimal }
  | { type: 'heal'; amount: number }
  | { type: 'levelUp'; stat: StatKey; level: number }
  | { type: 'tierCleared'; zone: string; tier: number }
  | { type: 'bossPhase'; phase: number; name: string }
  | { type: 'bossKilled'; boss: string }
  | { type: 'zoneUnlocked'; zone: string }
  | { type: 'unlock'; what: string; text: string }
  | { type: 'statusProc'; status: StatusKey; target: 'enemy' | 'player' }
  | { type: 'cast'; spell: string }
  | { type: 'snuffed'; vestige: Decimal }
  | { type: 'notice'; text: string }
  | { type: 'descentFloor'; floor: number }
  | { type: 'descentOffer'; floor: number; boons: string[] }
  | { type: 'boonTaken'; boon: string; floor: number }
  | { type: 'descentBanked'; floor: number; haul: Decimal; mult: number; banked: Decimal }
  | { type: 'descentLost'; floor: number; haul: Decimal }
  | { type: 'orderFired'; id: number; action: OrderActKind }
  | { type: 'studyRank'; enemy: string; rank: number; isBoss: boolean }
  | { type: 'reforged'; weapon: string; affixes: WeaponAffix[] }
  | { type: 'tollPhase'; phase: string }
  | { type: 'dispatched'; shade: string; kind: string; seconds: number }
  | { type: 'returned'; shade: string; kind: string; outcome: 'success' | 'fail' | 'lost'; marrow: Decimal; drops: Record<string, number>; keepsake: string | null }
  | { type: 'echo'; shade: string; text: string }
  | { type: 'holdfastClaimed'; zone: string }
  | { type: 'raid'; zone: string }
  | { type: 'raidEnded'; zone: string; outcome: 'repelled' | 'held' | 'lost'; marrow: Decimal }
  | { type: 'warRound'; round: number; dominion: string | null }
  | { type: 'masteryRank'; weapon: string; rank: number }
  | { type: 'art'; art: string }
  | { type: 'error'; text: string };
