/**
 * Aggregated multipliers from all permanent/semi-permanent sources
 * (skill tree, covenant, sigil unlocks, Age of Dark). Time-varying buffs are applied
 * separately in combat. Every multiplier here is visible in the UI's "Modifiers" panel.
 */
import { COVENANTS, TREE, SIGIL_UNLOCKS } from '@/content';
import { BALANCE } from '@/content/balance';
import type { GameState } from './types';

export interface Mods {
  dmg: number;
  souls: number;
  stagger: number;
  taken: number;
  phantomRate: number;
  phantomDmg: number;
  offlineCapHours: number;
  offlineRate: number;
  estusCount: number;
  estusPotency: number;
  critBonus: number;
  riposteMult: number;
  hpMult: number;
  fpMult: number;
  stamRegen: number;
  statusBuild: number;
  statusDmg: number;
  materialMult: number;
  humanityMult: number;
  bloodstainKeep: number; // fraction of dropped souls kept on pickup (1 = all)
  noBloodstain: boolean;
  dodgeCd: number;
  phantomSlots: number;
  attunementSlots: number;
  startWeaponLevel: number;
  startLevels: number;
  startSouls: number;
  keepWeapons: boolean;
  ngScaling: number; // multiplier on NG+ enemy scaling exponent (1 = normal)
  unlocks: Set<string>;
  /** human-readable breakdown for the UI */
  sources: { name: string; effect: string }[];
}

export function baseMods(): Mods {
  return {
    dmg: 1, souls: 1, stagger: 1, taken: 1, phantomRate: 1, phantomDmg: 1,
    offlineCapHours: BALANCE.offline.capHours, offlineRate: BALANCE.offline.rateMult,
    estusCount: 0, estusPotency: 1, critBonus: 0, riposteMult: 1, hpMult: 1, fpMult: 1, stamRegen: 1,
    statusBuild: 1, statusDmg: 1, materialMult: 1, humanityMult: 1, bloodstainKeep: 1, noBloodstain: false,
    dodgeCd: 1, phantomSlots: 0, attunementSlots: 0, startWeaponLevel: 0, startLevels: 0, startSouls: 0,
    keepWeapons: false, ngScaling: 1, unlocks: new Set(), sources: [],
  };
}

function pct(v: number): string {
  const p = Math.round((v - 1) * 100);
  return (p >= 0 ? '+' : '') + p + '%';
}

export function computeMods(state: GameState): Mods {
  const m = baseMods();
  const add = (name: string, effect: string) => m.sources.push({ name, effect });

  for (const u of state.automation.unlocked) m.unlocks.add(u);

  // ---- Skill tree (Humanity) ----
  for (const [id, rank] of Object.entries(state.prestige.tree)) {
    const node = TREE[id];
    if (!node || rank <= 0) continue;
    applyEffects(m, node.effect, rank, node.name, add);
  }
  // ---- Sigil unlocks ----
  for (const [id, rank] of Object.entries(state.prestige.sigilUnlocks)) {
    const node = SIGIL_UNLOCKS[id];
    if (!node || rank <= 0) continue;
    applyEffects(m, node.effect, rank, node.name, add);
  }
  // ---- Covenant ----
  const cov = state.covenant.current ? COVENANTS[state.covenant.current] : null;
  if (cov) {
    applyEffects(m, cov.passive, 1, cov.name, add);
    if (cov.noBloodstain) m.noBloodstain = true;
    for (const up of cov.upgrades) {
      const rank = state.covenant.upgrades[up.id] ?? 0;
      if (rank > 0) applyEffects(m, up.effect, rank, up.name, add);
    }
  }
  // ---- Age of Dark ----
  if (state.prestige.darkLevel > 0) {
    const dl = state.prestige.darkLevel;
    const mult = Math.pow(1.5, dl);
    m.dmg *= mult;
    m.souls *= mult;
    m.humanityMult *= Math.pow(1.25, dl);
    add(`Age of Dark ${dl}`, `damage & souls ×${mult.toFixed(2)}`);
  }
  return m;
}

function applyEffects(m: Mods, effect: Record<string, number | undefined>, rank: number, name: string, add: (n: string, e: string) => void) {
  for (const [k, v0] of Object.entries(effect)) {
    if (v0 === undefined) continue;
    const v = v0;
    switch (k) {
      case 'dmgMult': m.dmg *= Math.pow(v, rank); add(name, `damage ${pct(Math.pow(v, rank))}`); break;
      case 'soulMult': m.souls *= Math.pow(v, rank); add(name, `souls ${pct(Math.pow(v, rank))}`); break;
      case 'staggerMult': m.stagger *= Math.pow(v, rank); add(name, `stagger ${pct(Math.pow(v, rank))}`); break;
      case 'takenMult': m.taken *= Math.pow(v, rank); add(name, `damage taken ${pct(Math.pow(v, rank))}`); break;
      case 'phantomRate': m.phantomRate *= Math.pow(v, rank); add(name, `phantom rate ${pct(Math.pow(v, rank))}`); break;
      case 'phantomDmg': m.phantomDmg *= Math.pow(v, rank); add(name, `phantom damage ${pct(Math.pow(v, rank))}`); break;
      case 'offlineCap': case 'offlineCapHours': m.offlineCapHours += v * rank; add(name, `offline cap +${v * rank}h`); break;
      case 'offlineRate': m.offlineRate *= Math.pow(v, rank); add(name, `offline rate ${pct(Math.pow(v, rank))}`); break;
      case 'estusCount': m.estusCount += v * rank; add(name, `+${v * rank} Estus`); break;
      case 'estusPotency': m.estusPotency *= Math.pow(v, rank); add(name, `Estus potency ${pct(Math.pow(v, rank))}`); break;
      case 'critChance': m.critBonus += v * rank; add(name, `crit +${Math.round(v * rank * 100)}%`); break;
      case 'riposteMult': m.riposteMult *= Math.pow(v, rank); add(name, `riposte ${pct(Math.pow(v, rank))}`); break;
      case 'hpMult': m.hpMult *= Math.pow(v, rank); add(name, `HP ${pct(Math.pow(v, rank))}`); break;
      case 'fpMult': m.fpMult *= Math.pow(v, rank); add(name, `FP ${pct(Math.pow(v, rank))}`); break;
      case 'staminaRegen': m.stamRegen *= Math.pow(v, rank); add(name, `stamina regen ${pct(Math.pow(v, rank))}`); break;
      case 'statusBuild': m.statusBuild *= Math.pow(v, rank); add(name, `status buildup ${pct(Math.pow(v, rank))}`); break;
      case 'statusDmg': m.statusDmg *= Math.pow(v, rank); add(name, `status damage ${pct(Math.pow(v, rank))}`); break;
      case 'materialMult': m.materialMult *= Math.pow(v, rank); add(name, `material drops ${pct(Math.pow(v, rank))}`); break;
      case 'humanityMult': m.humanityMult *= Math.pow(v, rank); add(name, `Humanity ${pct(Math.pow(v, rank))}`); break;
      case 'bloodstainKeep': m.bloodstainKeep *= Math.pow(v, rank); add(name, `bloodstain recovery ${pct(Math.pow(v, rank))}`); break;
      case 'dodgeCd': m.dodgeCd *= Math.pow(v, rank); add(name, `dodge cooldown ${pct(Math.pow(v, rank))}`); break;
      case 'phantomSlot': m.phantomSlots += v * rank; add(name, `+${v * rank} phantom slot`); break;
      case 'attunementSlot': m.attunementSlots += v * rank; add(name, `+${v * rank} attunement slot`); break;
      case 'startWeaponLevel': m.startWeaponLevel += v * rank; add(name, `weapons start +${v * rank}`); break;
      case 'startLevels': m.startLevels += v * rank; add(name, `+${v * rank} starting levels`); break;
      case 'startSouls': m.startSouls += v * rank; add(name, `start with ${v * rank} souls`); break;
      case 'keepWeapons': m.keepWeapons = true; add(name, 'weapons persist through Kindling'); break;
      case 'ngScaling': m.ngScaling *= Math.pow(v, rank); add(name, `NG+ scaling ${pct(Math.pow(v, rank))}`); break;
      default:
        if (k.startsWith('unlock')) { m.unlocks.add(k.slice(6).replace(/^./, (c) => c.toLowerCase())); add(name, `unlocks ${k.slice(6)}`); }
        break;
    }
  }
}
