/**
 * Content schema. Everything in src/content is typed data; the engine reads it through
 * the registry in src/content/index.ts. Adding content never requires touching the engine.
 */
import type { Grade, StatKey, DamageType, StatusKey, WeaponArchetype, SchoolKey, PhantomRole, InfusionKey } from '@/engine/types';

export interface WeaponDef {
  id: string;
  name: string;
  archetype: WeaponArchetype;
  /** base damage at +0 */
  base: number;
  damageType: DamageType;
  /** stamina cost per attack */
  stamina: number;
  /** stagger build per hit */
  stagger: number;
  /** multiplier applied to hits during a riposte window */
  riposteMult: number;
  /** base crit chance (0..1) */
  crit: number;
  scaling: Partial<Record<StatKey, Grade>>;
  /** minimum stat requirements; unmet -> damage halved */
  req: Partial<Record<StatKey, number>>;
  /** innate status buildup per hit */
  status?: Partial<Record<StatusKey, number>>;
  infusable: boolean;
  /** how to obtain: 'start' | 'shop' | {drop zone/tier} | {boss soul} */
  source: { kind: 'start' } | { kind: 'shop'; cost: number; region: number } | { kind: 'drop'; zone: string; tier: number; chance: number } | { kind: 'bossSoul'; boss: string };
  /** attack rate for auto-attack and phantoms (attacks per second) */
  speed: number;
  lore: string;
  /** region tier used for material tier & shop gating */
  region: number;
}

export interface AttackPattern {
  id: string;
  name: string;
  /** windup seconds (telegraph) */
  windup: number;
  /** damage multiplier vs enemy base damage */
  mult: number;
  /** weight in random selection */
  weight: number;
  /** if true, this attack cannot be dodged with iframes alone; requires being staggered/other (rare, boss-only) */
  unblockable?: boolean;
  /** applies status to player */
  status?: 'poison';
}

export interface EnemyDef {
  id: string;
  name: string;
  /** HP multiplier vs the tier baseline */
  hpMult: number;
  /** damage multiplier vs tier baseline */
  dmgMult: number;
  /** poise multiplier vs baseline */
  poiseMult: number;
  /** attack interval seconds (time between attacks) */
  attackInterval: number;
  attacks: AttackPattern[];
  resist: Partial<Record<DamageType, number>>; // multiplier on damage taken (0.5 = resists)
  statusResist: Partial<Record<StatusKey, number>>; // multiplier on buildup (0 = immune)
  soulMult: number;
  /** material drops: id -> chance per kill */
  drops: Record<string, number>;
  lore: string;
  /** silhouette key for the renderer */
  shape: string;
}

export interface BossPhase {
  name: string;
  /** hp fraction at which this phase begins (1.0 for first) */
  at: number;
  attacks: AttackPattern[];
  attackInterval: number;
  resist?: Partial<Record<DamageType, number>>;
  statusResist?: Partial<Record<StatusKey, number>>;
  /** phase-specific mechanic id handled by engine/bossMechanics.ts */
  mechanic?: string;
  /** mechanic parameter */
  mechParam?: number;
  /** message shown on phase start */
  text: string;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  zone: string;
  secret: boolean;
  /** HP multiplier vs the zone's final tier baseline */
  hpMult: number;
  dmgMult: number;
  poiseMult: number;
  phases: BossPhase[];
  soulMult: number;
  /** boss soul rewards */
  soulWeapon: string;
  soulSpell: string;
  /** guaranteed drops */
  drops: Record<string, number>;
  lore: string;
  shape: string;
  /** unlock condition for secret bosses */
  secretCondition?: { kind: 'kills'; zone: string; count: number } | { kind: 'covenant'; covenant: string } | { kind: 'item'; item: string };
  /** for NG+ cycle bosses: appears from this kindle count */
  cycle?: number;
}

export interface ZoneTier {
  name: string;
  enemies: string[];
  /** kills required to clear */
  kills: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  region: number; // 1..6
  tiers: ZoneTier[];
  boss: string;
  secretBoss?: string;
  /** zone unlocked by killing this boss (previous region) */
  requires: string | null;
  phantom?: string; // phantom recruitable here
  lore: string;
  /** material family dropped here */
  materialTier: number;
}

export interface SpellDef {
  id: string;
  name: string;
  school: SchoolKey;
  fp: number;
  cooldown: number;
  req: Partial<Record<StatKey, number>>;
  effect:
    | { kind: 'damage'; mult: number; type: DamageType }
    | { kind: 'staggerBomb'; amount: number; mult: number }
    | { kind: 'buff'; buff: { dmg?: number; souls?: number; stagger?: number; taken?: number; stamRegen?: number; hpRegen?: number }; duration: number }
    | { kind: 'dot'; mult: number; duration: number; type: DamageType }
    | { kind: 'heal'; frac: number }
    | { kind: 'status'; status: StatusKey; amount: number }
    | { kind: 'squadBuff'; mult: number; duration: number };
  source: { kind: 'shop'; cost: number; region: number } | { kind: 'bossSoul'; boss: string } | { kind: 'drop'; zone: string; tier: number; chance: number } | { kind: 'sigil' } | { kind: 'start' };
  lore: string;
}

export interface CovenantUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: number; // souls (scaled)
  repReq: number;
  maxRank: number;
  effect: Partial<Record<CovenantEffectKey, number>>;
}

export type CovenantEffectKey =
  | 'soulMult' | 'dmgMult' | 'phantomRate' | 'phantomDmg' | 'statusBuild' | 'statusDmg'
  | 'offlineCap' | 'offlineRate' | 'takenMult' | 'bloodstainKeep' | 'estusPotency' | 'staggerMult' | 'materialMult' | 'humanityMult';

export interface CovenantDef {
  id: string;
  name: string;
  epithet: string;
  passive: Partial<Record<CovenantEffectKey, number>>;
  /** flags */
  noBloodstain?: boolean;
  desc: string;
  upgrades: CovenantUpgrade[];
  lore: string;
  /** region where the covenant can be joined */
  region: number;
}

export interface PhantomDef {
  id: string;
  name: string;
  role: PhantomRole;
  /** base damage per hit at level 1 relative to weapon base */
  power: number;
  /** attacks per second */
  speed: number;
  /** base hp at level 1 */
  hp: number;
  /** stagger build multiplier */
  stagger: number;
  /** heal per action as fraction of squad/player max hp (healer) */
  heal: number;
  /** buffer: damage multiplier granted */
  buff: number;
  /** status applier: buildup per hit */
  status?: Partial<Record<StatusKey, number>>;
  covenant: string; // affinity
  affinityBonus: string;
  defaultWeapon: string;
  zone: string;
  recruitCost: number;
  lore: string;
  shape: string;
}

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  branch: 'ember' | 'bone' | 'shadow' | 'flame';
  cost: number; // humanity per rank, scaled by rank
  costGrowth: number;
  maxRank: number;
  requires: string[];
  effect: Partial<Record<TreeEffectKey, number>>;
  pos: { x: number; y: number };
}

export type TreeEffectKey =
  | 'dmgMult' | 'soulMult' | 'offlineCapHours' | 'startWeaponLevel' | 'phantomRate' | 'estusCount' | 'estusPotency'
  | 'startLevels' | 'staminaRegen' | 'staggerMult' | 'humanityMult' | 'materialMult' | 'critChance' | 'riposteMult'
  | 'unlockAutoAttack' | 'unlockAutoLevel' | 'unlockAutoRiposte' | 'unlockAutoDodge' | 'unlockAutoEstus' | 'unlockAutoAdvance'
  | 'phantomSlot' | 'attunementSlot' | 'fpMult' | 'keepWeapons' | 'startSouls' | 'bloodstainKeep' | 'dodgeCd' | 'hpMult' | 'skipTutorialBoss';

export interface SigilUnlock {
  id: string;
  name: string;
  desc: string;
  cost: number;
  maxRank: number;
  requires: string[];
  effect: Partial<Record<SigilEffectKey, number>>;
}

export type SigilEffectKey =
  | 'phantomSlot' | 'unlockHex' | 'unlockAutoKindle' | 'unlockAutoSpells' | 'unlockAbyss' | 'keepTree' | 'dmgMult' | 'soulMult'
  | 'humanityMult' | 'ngScaling' | 'attunementSlot' | 'unlockAutoCovenant' | 'phantomDmg' | 'offlineCapHours' | 'startKindles';

export interface MaterialDef {
  id: string;
  name: string;
  tier: number;
  lore: string;
}
