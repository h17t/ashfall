/**
 * Scripted strategies. All are parameterizations of one policy so that later systems
 * (shades, spells, creeds, rendering) plug into every strategy through `extensions`.
 */
import type { Action, GameState, StatKey } from '@/engine';
import { levelCost, reinforceCost, expectedLevel, weaponDamage, travelBlocked } from '@/engine';
import { getZone, getWeapon, WEAPONS, reinforceMaterial, globalTier, nextZone, ZONE_ORDER, BOSSES } from '@/content';
import type { Strategy, SimView } from './types';

export interface PolicyParams {
  id: string;
  description: string;
  /** clicks per second while an enemy is up (0 = never clicks) */
  clickRate: number;
  /** stop clicking after this many seconds of play (idle-only bootstrap) */
  clickUntil?: number;
  /** probability of reacting to a telegraph with a dodge */
  dodgeSkill: number;
  /** if reacting, probability the dodge is inside the perfect window */
  perfectSkill: number;
  /** clicks faster during reprisal windows */
  riposteAware: boolean;
  /** drink draughts below this hp fraction */
  estusAt: number;
  /** retreat to lantern below this hp fraction when out of draughts (0 = never) */
  retreatAt: number;
  /** stat allocation plan */
  levelPlan: 'balanced' | 'weaponBest' | 'vitality' | 'none';
  /** keep this many level-costs in reserve before spending on anything */
  soulsReserve: number;
  /** push into the next tier when level >= expected - pushLead */
  pushLead: number;
  /** after dying to a boss, gain this many levels before retrying */
  bossRetryLevels: number;
  /** avoid over-clicking during the Backdraft phase (learned vs. lazy) */
  respectsMechanics: boolean;
  /** the Stair: when to descend, how deep, how much nerve (absent = never descends) */
  descent?: { every: number; withdrawAt: number; nerve: number };
  /** Standing Orders the strategy writes, in priority order, as slots and kinds allow */
  orders?: { when: { kind: string; op: '<' | '>'; value: number }[]; then: { kind: string; arg?: string | number }; on?: boolean }[];
}

export interface PolicyMemory {
  clickAcc: number;
  lastTelegraphT: number;
  dodgeDecided: boolean;
  bossDeathLevel: number;
  bossDeathBoss: string | null;
  lastEcon: number;
  lastNav: number;
  /** scratch space for extensions */
  [k: string]: unknown;
}

export type Extension = (view: SimView, params: PolicyParams, mem: PolicyMemory, out: Action[]) => void;
const extensions: Extension[] = [];
/** Later-milestone systems register their sim decision logic here. */
export function registerSimExtension(ext: Extension) {
  extensions.push(ext);
}

export function bestStatFor(state: GameState): StatKey {
  const def = getWeapon(state.player.weapon);
  const inst = state.player.weapons[state.player.weapon];
  const order: string[] = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];
  let best: StatKey = 'mig';
  let bestG = -1;
  const scaling: Partial<Record<StatKey, string>> = { ...def.scaling };
  if (inst?.infusion === 'heavy') scaling.mig = 'A';
  if (inst?.infusion === 'keen') scaling.fin = 'A';
  if (inst?.infusion === 'magic') scaling.ins = 'A';
  if (inst?.infusion === 'blessed') scaling.dev = 'A';
  for (const [k, g] of Object.entries(scaling)) {
    const i = order.indexOf(g as string);
    if (i > bestG) { bestG = i; best = k as StatKey; }
  }
  return best;
}

function chooseStat(state: GameState, plan: PolicyParams['levelPlan']): StatKey | null {
  const p = state.player;
  if (plan === 'none') return null;
  if (plan === 'vitality') return p.stats.vit < 60 ? 'vit' : 'bre';
  const best = bestStatFor(state);
  // Everyone keeps a floor of survivability: vitality/breath every third level.
  const cycle = p.level % 3;
  if (plan === 'balanced') {
    if (cycle === 0) return 'vit';
    if (cycle === 1) return 'bre';
    return best;
  }
  // weaponBest: two damage points per survivability point
  if (cycle === 0) return p.stats.vit <= p.stats.bre ? 'vit' : 'bre';
  return best;
}

function bestOwnedWeapon(view: SimView): string {
  const s = view.state;
  let best = s.player.weapon;
  let bestScore = -1;
  // Reading the boss: a regenerating lord needs an open wound. Prefer a status it cannot shrug off.
  const enemy = s.encounter.enemy;
  const boss = enemy?.isBoss ? BOSSES[enemy.id] : null;
  const ph = boss ? boss.phases[enemy!.phase] : null;
  const needsStatus = !!ph && ph.mechanic === 'regen';
  const resists = (st: string) => (ph?.statusResist?.[st as 'bleed'] ?? 1) <= 0;
  const usableStatus = (id: string) => {
    const def = getWeapon(id);
    const inst = s.player.weapons[id];
    const statuses = { ...(def.status ?? {}) } as Record<string, number>;
    const inf = inst.infusion !== 'none' ? (BALANCE_INFUSION[inst.infusion]?.status as string | undefined) : undefined;
    if (inf) statuses[inf] = (statuses[inf] ?? 0) + 20;
    return Object.keys(statuses).some((st) => !resists(st));
  };
  const ids = Object.keys(s.player.weapons).filter((id) => getWeapon(id).archetype !== 'catalyst');
  const pool = needsStatus && ids.some(usableStatus) ? ids.filter(usableStatus) : ids;
  for (const id of pool) {
    const br = weaponDamage(s, view.mods, id);
    const def = getWeapon(id);
    // damage per stamina point, weighted towards raw hit for boss-killing
    const score = br.total.toNumber() * (0.6 + 0.4 * (10 / def.stamina)) * (1 + def.strain / 40);
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

/** Against a regenerating lord, infuse the best infusable weapon with a status it cannot shrug off. */
function infuseForBoss(view: SimView, out: Action[]) {
  const s = view.state;
  const enemy = s.encounter.enemy;
  if (!enemy?.isBoss || (s.materials.pitchCoal ?? 0) < 1 || !s.flags.infusionUnlocked) return;
  const ph = BOSSES[enemy.id]?.phases[enemy.phase];
  if (ph?.mechanic !== 'regen') return;
  const resists = (st: string) => (ph.statusResist?.[st as 'bleed'] ?? 1) <= 0;
  const status = (['bleed', 'poison', 'frost'] as const).find((st) => !resists(st));
  if (!status) return;
  // best infusable weapon we own that does not already carry a usable status
  let best: string | null = null; let bestBase = -1;
  for (const [id, inst] of Object.entries(s.player.weapons)) {
    const def = getWeapon(id);
    if (!def.infusable || inst.infusion === status) continue;
    if (def.status && Object.keys(def.status).some((st) => !resists(st))) continue;
    const base = def.base * Math.pow(1.15, inst.level);
    if (base > bestBase) { bestBase = base; best = id; }
  }
  if (best) out.push({ type: 'infuse', weapon: best, infusion: status });
}
import { BALANCE } from '@/content/balance';
const BALANCE_INFUSION = BALANCE.weapon.infusion;

export function makePolicy(params: PolicyParams): Strategy {
  const mem: PolicyMemory = { clickAcc: 0, lastTelegraphT: -1, dodgeDecided: false, bossDeathLevel: -1, bossDeathBoss: null, lastEcon: -10, lastNav: -10 };
  return {
    id: params.id,
    description: params.description,
    decide(view: SimView): Action[] {
      const s = view.state;
      const out: Action[] = [];
      const p = s.player;
      if (s.deathScreen > 0) return out;
      const enemy = s.encounter.enemy;
      const dt = 0.1;

      // ---- combat ----
      if (enemy && enemy.hp.gt(0)) {
        // dodge decision, once per telegraph
        if (enemy.windup > 0) {
          if (mem.lastTelegraphT !== s.encounter.t - (enemy.windupTotal - enemy.windup)) {
            // new telegraph: decide whether we react
            const key = s.encounter.t - (enemy.windupTotal - enemy.windup);
            if (Math.abs(key - mem.lastTelegraphT) > 0.05) {
              mem.lastTelegraphT = key;
              mem.dodgeDecided = view.rand() < params.dodgeSkill;
              mem.blindRolled = false;
            }
          }
          if (mem.dodgeDecided && enemy.mech.blind === 1 && !mem.blindRolled) { mem.blindRolled = true; if (view.rand() < 0.5) mem.dodgeDecided = false; }
          if (mem.dodgeDecided && p.dodgeCd <= 0) {
            const perfect = view.rand() < params.perfectSkill;
            const threshold = perfect ? 0.2 : 0.5;
            if (enemy.windup <= threshold) { out.push({ type: 'dodge' }); mem.dodgeDecided = false; }
          }
        }
        // draughts
        if (p.hp < p.hpMax * params.estusAt && p.draughts > 0) out.push({ type: 'draughts' });
        else if (params.retreatAt > 0 && p.draughts === 0 && p.hp < p.hpMax * params.retreatAt && !s.remainsRun) {
          out.push({ type: 'retreat' });
          // retreating from a boss resets it: count it as a failed attempt and go level up
          if (s.encounter.tier < 0) { mem.bossDeathBoss = s.encounter.tier === -1 ? getZone(s.encounter.zone).boss : getZone(s.encounter.zone).secretBoss ?? null; mem.bossDeathLevel = p.level; }
        }
        // clicking
        const clicking = params.clickRate > 0 && (params.clickUntil === undefined || view.t < params.clickUntil);
        if (clicking) {
          let rate = params.clickRate;
          if (params.riposteAware && enemy.reprisal > 0) rate = Math.max(rate, 6);
          // learned players ease off during Backdraft
          if (params.respectsMechanics && enemy.isBoss) {
            const ph = BOSSES[enemy.id]?.phases[enemy.phase];
            if (ph?.mechanic === 'backdraft' && enemy.reprisal <= 0) rate = Math.min(rate, (ph.mechParam ?? 7) / 2.2);
            if (ph?.mechanic === 'hymn' && enemy.mech.hymn === 1 && enemy.reprisal <= 0) rate = 0;
          }
          mem.clickAcc += rate * dt;
          const w = getWeapon(p.weapon);
          while (mem.clickAcc >= 1) {
            mem.clickAcc -= 1;
            // rhythmic players wait for stamina; spammers don't
            if (params.respectsMechanics && p.stamina < w.stamina && enemy.reprisal <= 0) break;
            out.push({ type: 'click' });
          }
        }
      }

      // ---- economy (every 1s) ----
      if (view.t - mem.lastEcon >= 1) {
        mem.lastEcon = view.t;
        const cost = levelCost(p.level);
        const reserve = cost.mul(params.soulsReserve);
        // boss marrow: default to the weapon
        for (const [boss, n] of Object.entries(s.keepsakes)) if (n > 0) out.push({ type: 'chooseKeepsake', boss, choice: 'weapon' });
        // shop weapons: buy anything affordable we don't own from unlocked regions
        const maxRegion = Math.max(...s.unlockedZones.map((z) => getZone(z).region));
        for (const w of Object.values(WEAPONS)) {
          if (w.source.kind === 'shop' && w.source.region <= maxRegion && !p.weapons[w.id] && s.marrow.gte(w.source.cost + reserve.toNumber())) {
            out.push({ type: 'buyWeapon', weapon: w.id });
            break;
          }
        }
        // read the lord: infuse for its mechanic, then equip the best answer
        infuseForBoss(view, out);
        const best = bestOwnedWeapon(view);
        if (best !== p.weapon) out.push({ type: 'equip', weapon: best });
        // reinforce equipped weapon when materials allow
        const inst = p.weapons[p.weapon];
        if (inst && inst.level < 10) {
          const mat = reinforceMaterial(inst.level);
          const rc = reinforceCost(getWeapon(inst.id).region, inst.level);
          if ((s.materials[mat.id] ?? 0) >= mat.count && s.marrow.gte(rc.add(reserve))) out.push({ type: 'reinforce', weapon: p.weapon });
        }
        // draughts upgrades
        if ((s.materials.wickStub ?? 0) > 0) out.push({ type: 'upgradeDraught', kind: 'count' });
        if ((s.materials.renderFat ?? 0) > 0) out.push({ type: 'upgradeDraught', kind: 'potency' });
        // level up
        const stat = chooseStat(s, params.levelPlan);
        if (stat && s.marrow.gte(cost)) out.push({ type: 'levelUp', stat });
      }

      // ---- navigation (every 2s) ----
      if (view.t - mem.lastNav >= 2 && !s.remainsRun && s.deathScreen <= 0) {
        mem.lastNav = view.t;
        const zoneId = s.encounter.zone;
        const zone = getZone(zoneId);
        const zp = s.zones[zoneId];
        const tier = s.encounter.tier;
        if (zp) {
          const lastTier = zone.tiers.length - 1;
          const bossDone = zp.bossKills > 0;
          const nz = nextZone(zoneId);
          if (bossDone && nz && s.unlockedZones.includes(nz)) {
            // move on to the next region
            if (!travelBlocked(s, nz, 0)) out.push({ type: 'travel', zone: nz, tier: 0 });
          } else if (tier >= 0 && zp.cleared >= tier && tier < lastTier) {
            // push when strong enough
            const g = globalTier(zoneId, tier + 1, s.prestige.nadirDepth);
            if (p.level >= expectedLevel(g, s.prestige.wakings) - params.pushLead && !travelBlocked(s, zoneId, tier + 1)) out.push({ type: 'travel', zone: zoneId, tier: tier + 1 });
          } else if (tier >= 0 && zp.cleared >= lastTier && !bossDone) {
            // boss attempt gating
            const canRetry = mem.bossDeathBoss !== zone.boss || p.level >= mem.bossDeathLevel + params.bossRetryLevels;
            if (canRetry && !travelBlocked(s, zoneId, -1)) out.push({ type: 'travel', zone: zoneId, tier: -1 });
          }
        }
      }
      // remember boss deaths (remains in the arena)
      if (s.remains && s.remains.tier === -1 && mem.bossDeathBoss !== getZone(s.remains.zone).boss) {
        mem.bossDeathBoss = getZone(s.remains.zone).boss;
        mem.bossDeathLevel = p.level;
      }
      for (const ext of extensions) ext(view, params, mem, out);
      return out;
    },
  };
}

export const STRATEGIES: Record<string, () => Strategy> = {
  greedy: () => makePolicy({
    id: 'greedy', description: 'Clicks 4/s, dodges most telegraphs, pushes early, levels the weapon stat.',
    clickRate: 4, dodgeSkill: 0.85, perfectSkill: 0.5, riposteAware: true, estusAt: 0.4, retreatAt: 0.15,
    levelPlan: 'weaponBest', soulsReserve: 0, pushLead: 6, bossRetryLevels: 2, respectsMechanics: true,
    descent: { every: 10 * 60, withdrawAt: 10, nerve: 0.35 },
  }),
  reckless: () => makePolicy({
    id: 'reckless', description: 'Greedy who never climbs out: pushes the Stair until it kills them. The cost of pushing, measured.',
    clickRate: 4, dodgeSkill: 0.85, perfectSkill: 0.5, riposteAware: true, estusAt: 0.4, retreatAt: 0.15,
    levelPlan: 'weaponBest', soulsReserve: 0, pushLead: 6, bossRetryLevels: 2, respectsMechanics: true,
    descent: { every: 8 * 60, withdrawAt: 40, nerve: 0.08 },
  }),
  nostair: () => makePolicy({
    id: 'nostair', description: 'Greedy without ever taking the Stair: the control for the Descent economy.',
    clickRate: 4, dodgeSkill: 0.85, perfectSkill: 0.5, riposteAware: true, estusAt: 0.4, retreatAt: 0.15,
    levelPlan: 'weaponBest', soulsReserve: 0, pushLead: 6, bossRetryLevels: 2, respectsMechanics: true,
  }),
  optimal: () => makePolicy({
    id: 'optimal', description: 'Near-perfect play: rhythmic clicking, perfect dodges, respects boss mechanics.',
    clickRate: 4.5, dodgeSkill: 0.97, perfectSkill: 0.85, riposteAware: true, estusAt: 0.45, retreatAt: 0.2,
    levelPlan: 'weaponBest', soulsReserve: 0, pushLead: 5, bossRetryLevels: 1, respectsMechanics: true,
    descent: { every: 8 * 60, withdrawAt: 14, nerve: 0.3 },
  }),
  casual: () => makePolicy({
    id: 'casual', description: 'Clicks 2/s, dodges half the time, over-levels before pushing, spams during bosses.',
    clickRate: 2, dodgeSkill: 0.5, perfectSkill: 0.2, riposteAware: true, estusAt: 0.35, retreatAt: 0.25,
    levelPlan: 'balanced', soulsReserve: 0, pushLead: 2, bossRetryLevels: 3, respectsMechanics: false,
    descent: { every: 15 * 60, withdrawAt: 6, nerve: 0.5 },
  }),
  idle: () => makePolicy({
    id: 'idle', description: 'Clicks for the first 8 minutes to bootstrap, then relies on auto-attack and the cortege; only pushes when safely over-levelled.',
    clickRate: 2.5, clickUntil: 8 * 60, dodgeSkill: 0.3, perfectSkill: 0.1, riposteAware: false, estusAt: 0.4, retreatAt: 0.3,
    levelPlan: 'balanced', soulsReserve: 0, pushLead: -6, bossRetryLevels: 4, respectsMechanics: false,
    descent: { every: 40 * 60, withdrawAt: 4, nerve: 0.6 },
  }),
  authored: () => makePolicy({
    id: 'authored', description: 'The idle player who wrote good Standing Orders: drink at 35%, strike the Reprisal, dodge the telegraph, level the lowest stat, climb out of the Stair at floor 5.',
    clickRate: 2.5, clickUntil: 8 * 60, dodgeSkill: 0.3, perfectSkill: 0.1, riposteAware: false, estusAt: 0.4, retreatAt: 0.3,
    levelPlan: 'none', soulsReserve: 0, pushLead: -6, bossRetryLevels: 4, respectsMechanics: false,
    descent: { every: 40 * 60, withdrawAt: 99, nerve: 0 },
    orders: [
      // the economy first: with two slots these are the two that matter
      { when: [{ kind: 'marrow', op: '>', value: 1 }], then: { kind: 'levelUp', arg: 'balanced' } },
      { when: [{ kind: 'hp', op: '<', value: 35 }, { kind: 'draughts', op: '>', value: 0 }], then: { kind: 'drink' } },
      { when: [{ kind: 'boonOffer', op: '>', value: 1 }, { kind: 'floor', op: '>', value: 4 }], then: { kind: 'withdraw' } },
      { when: [{ kind: 'boonOffer', op: '>', value: 1 }], then: { kind: 'takeBoon', arg: 'epic' } },
      { when: [{ kind: 'reprisal', op: '>', value: 1 }], then: { kind: 'strike' } },
      { when: [{ kind: 'telegraph', op: '>', value: 1 }], then: { kind: 'dodge' } },
      { when: [{ kind: 'hp', op: '<', value: 30 }, { kind: 'draughts', op: '<', value: 1 }], then: { kind: 'withdraw' } },
      { when: [{ kind: 'always', op: '>', value: 1 }], then: { kind: 'reinforce' } },
    ],
  }),
  noclick: () => makePolicy({
    id: 'noclick', description: 'Never clicks. Measures the pure idle floor: auto-attack (from 6 min) and shades.',
    clickRate: 0, dodgeSkill: 0.4, perfectSkill: 0.1, riposteAware: false, estusAt: 0.4, retreatAt: 0.3,
    levelPlan: 'balanced', soulsReserve: 0, pushLead: -8, bossRetryLevels: 4, respectsMechanics: false,
  }),
};
