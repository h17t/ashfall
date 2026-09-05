/**
 * Aggregated multipliers from all permanent/semi-permanent sources
 * (skill tree, creed, severing unlocks, the Unmaking). Time-varying buffs are applied
 * separately in combat. Every multiplier here is visible in the UI's "Modifiers" panel.
 */
import { CREEDS, TREE, SEVERING_UNLOCKS } from '@/content';
import { BALANCE } from '@/content/balance';
import type { GameState } from './types';
import { runFx, runDamageMult } from './descent';
import { studyBonus } from './study';
import { playerAffixFx } from './forge';
import { applyAfflictions } from './afflictions';
import { applyToll, creedHourFavoured } from './toll';
import { BOONS } from '@/content';

export interface Mods {
  dmg: number;
  marrow: number;
  strain: number;
  taken: number;
  phantomRate: number;
  phantomDmg: number;
  offlineCapHours: number;
  offlineRate: number;
  draughtCount: number;
  draughtPotency: number;
  critBonus: number;
  reprisalMult: number;
  hpMult: number;
  fpMult: number;
  stamRegen: number;
  statusBuild: number;
  statusDmg: number;
  materialMult: number;
  humanityMult: number;
  remainsKeep: number; // fraction of dropped marrow kept on pickup (1 = all)
  noBloodstain: boolean;
  dodgeCd: number;
  phantomSlots: number;
  recitationSlots: number;
  startWeaponLevel: number;
  startLevels: number;
  startSouls: number;
  keepWeapons: boolean;
  ngScaling: number; // multiplier on Waking enemy scaling exponent (1 = normal)
  /** afflictions and the Toll */
  enemyComposure: number;
  enemyHp: number;
  enemyDmg: number;
  reflexesSleep: boolean;
  reinforceScale: number;
  marrowLeak: number;
  stairPay: number;
  unlocks: Set<string>;
  /** human-readable breakdown for the UI */
  sources: { name: string; effect: string }[];
}

export function baseMods(): Mods {
  return {
    dmg: 1, marrow: 1, strain: 1, taken: 1, phantomRate: 1, phantomDmg: 1,
    offlineCapHours: BALANCE.offline.capHours, offlineRate: BALANCE.offline.rateMult,
    draughtCount: 0, draughtPotency: 1, critBonus: 0, reprisalMult: 1, hpMult: 1, fpMult: 1, stamRegen: 1,
    statusBuild: 1, statusDmg: 1, materialMult: 1, humanityMult: 1, remainsKeep: 1, noBloodstain: false,
    dodgeCd: 1, phantomSlots: 0, recitationSlots: 0, startWeaponLevel: 0, startLevels: 0, startSouls: 0,
    keepWeapons: false, ngScaling: 1, enemyComposure: 1, enemyHp: 1, enemyDmg: 1, reflexesSleep: false, reinforceScale: 1, marrowLeak: 0, stairPay: 1, unlocks: new Set(), sources: [],
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

  // ---- Skill tree (Vestige) ----
  for (const [id, rank] of Object.entries(state.prestige.tree)) {
    const node = TREE[id];
    if (!node || rank <= 0) continue;
    applyEffects(m, node.effect, rank, node.name, add);
  }
  // ---- Severing unlocks ----
  for (const [id, rank] of Object.entries(state.prestige.severingUnlocks)) {
    const node = SEVERING_UNLOCKS[id];
    if (!node || rank <= 0) continue;
    applyEffects(m, node.effect, rank, node.name, add);
  }
  // ---- Creed ----
  const cov = state.creed.current ? CREEDS[state.creed.current] : null;
  if (cov) {
    applyEffects(m, cov.passive, 1, cov.name, add);
    if (creedHourFavoured(state, state.creed.current)) applyEffects(m, favourable(cov.passive), 1, `${cov.name}, in its hour`, add);
    if (cov.noBloodstain) m.noBloodstain = true;
    for (const up of cov.upgrades) {
      const rank = state.creed.upgrades[up.id] ?? 0;
      if (rank > 0) applyEffects(m, up.effect, rank, up.name, add);
    }
  }
  // ---- the Unmaking ----
  if (state.prestige.unmaking > 0) {
    const dl = state.prestige.unmaking;
    const mult = Math.pow(1.5, dl);
    m.dmg *= mult;
    m.marrow *= mult;
    m.humanityMult *= Math.pow(1.25, dl);
    add(`the Unmaking ${dl}`, `damage & marrow ×${mult.toFixed(2)}`);
  }
  // ---- the Study: what you have learned of every creature ----
  const st = studyBonus(state);
  if (st.dmg > 0) { m.dmg *= 1 + st.dmg; m.marrow *= 1 + st.marrow; add(`the Study (${st.ranks} ranks)`, `damage & marrow +${Math.round(st.dmg * 1000) / 10}%`); }
  // ---- the forge: the affixes on the weapon in your hand, and the sets across the Cortege ----
  const fx = playerAffixFx(state);
  m.dmg *= fx.dmg; m.marrow *= fx.marrow; m.critBonus += fx.crit; m.strain *= fx.strain; m.taken *= fx.taken; m.materialMult *= fx.materials;
  m.reprisalMult *= fx.reprisal; m.stamRegen *= fx.stamRegen; m.hpMult *= fx.hp; m.statusBuild *= fx.statusBuild; m.statusDmg *= fx.statusDmg; m.stairPay *= fx.stairPay;
  for (const src of fx.sources) add(src.name, src.effect);
  // ---- afflictions: the dial the player set ----
  applyAfflictions(state, m, add);
  // ---- the Toll: the hour of the world ----
  applyToll(state, m, add);
  // ---- the Stair: boons last the run ----
  const run = state.descent?.run;
  if (run) {
    const fx = runFx(run);
    const dmg = runDamageMult(run);
    if (dmg !== 1) m.dmg *= dmg;
    m.strain *= fx.strain; m.taken *= fx.taken; m.reprisalMult *= fx.reprisal; m.statusBuild *= fx.statusBuild; m.statusDmg *= fx.statusDmg;
    m.stamRegen *= fx.stamRegen; m.dodgeCd *= fx.dodgeCd;
    const seen = new Set<string>();
    for (const id of run.boons) { if (seen.has(id)) continue; seen.add(id); const n = run.boons.filter((b) => b === id).length; add(`Boon: ${BOONS[id]?.name ?? id}${n > 1 ? ` ×${n}` : ''}`, BOONS[id]?.text ?? ''); }
    if (fx.momentum > 0 && run.runKills > 0) add('Grave-Momentum', `damage ×${Math.pow(1 + fx.momentum, run.runKills).toFixed(2)} from ${run.runKills} kills`);
  }
  return m;
}

/** The half of a passive that helps: a creed's hour redoubles its gifts, never its costs. */
function favourable(effect: Record<string, number | undefined>): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const [k, v] of Object.entries(effect)) {
    if (v === undefined) continue;
    const good = k === 'takenMult' || k === 'dodgeCd' ? v < 1 : k.startsWith('unlock') || k === 'keepWeapons' ? false : v > 1;
    if (good) out[k] = v;
  }
  return out;
}

function applyEffects(m: Mods, effect: Record<string, number | undefined>, rank: number, name: string, add: (n: string, e: string) => void) {
  for (const [k, v0] of Object.entries(effect)) {
    if (v0 === undefined) continue;
    const v = v0;
    switch (k) {
      case 'dmgMult': m.dmg *= Math.pow(v, rank); add(name, `damage ${pct(Math.pow(v, rank))}`); break;
      case 'marrowMult': m.marrow *= Math.pow(v, rank); add(name, `marrow ${pct(Math.pow(v, rank))}`); break;
      case 'strainMult': m.strain *= Math.pow(v, rank); add(name, `strain ${pct(Math.pow(v, rank))}`); break;
      case 'takenMult': m.taken *= Math.pow(v, rank); add(name, `damage taken ${pct(Math.pow(v, rank))}`); break;
      case 'phantomRate': m.phantomRate *= Math.pow(v, rank); add(name, `shade rate ${pct(Math.pow(v, rank))}`); break;
      case 'phantomDmg': m.phantomDmg *= Math.pow(v, rank); add(name, `shade damage ${pct(Math.pow(v, rank))}`); break;
      case 'offlineCap': case 'offlineCapHours': m.offlineCapHours += v * rank; add(name, `offline cap +${v * rank}h`); break;
      case 'offlineRate': m.offlineRate *= Math.pow(v, rank); add(name, `offline rate ${pct(Math.pow(v, rank))}`); break;
      case 'draughtCount': m.draughtCount += v * rank; add(name, `+${v * rank} Tallowdraught`); break;
      case 'draughtPotency': m.draughtPotency *= Math.pow(v, rank); add(name, `Tallowdraught potency ${pct(Math.pow(v, rank))}`); break;
      case 'critChance': m.critBonus += v * rank; add(name, `crit +${Math.round(v * rank * 100)}%`); break;
      case 'reprisalMult': m.reprisalMult *= Math.pow(v, rank); add(name, `reprisal ${pct(Math.pow(v, rank))}`); break;
      case 'hpMult': m.hpMult *= Math.pow(v, rank); add(name, `HP ${pct(Math.pow(v, rank))}`); break;
      case 'fpMult': m.fpMult *= Math.pow(v, rank); add(name, `FP ${pct(Math.pow(v, rank))}`); break;
      case 'staminaRegen': m.stamRegen *= Math.pow(v, rank); add(name, `stamina regen ${pct(Math.pow(v, rank))}`); break;
      case 'statusBuild': m.statusBuild *= Math.pow(v, rank); add(name, `status buildup ${pct(Math.pow(v, rank))}`); break;
      case 'statusDmg': m.statusDmg *= Math.pow(v, rank); add(name, `status damage ${pct(Math.pow(v, rank))}`); break;
      case 'materialMult': m.materialMult *= Math.pow(v, rank); add(name, `material drops ${pct(Math.pow(v, rank))}`); break;
      case 'humanityMult': m.humanityMult *= Math.pow(v, rank); add(name, `Vestige ${pct(Math.pow(v, rank))}`); break;
      case 'remainsKeep': m.remainsKeep *= Math.pow(v, rank); add(name, `remains recovery ${pct(Math.pow(v, rank))}`); break;
      case 'dodgeCd': m.dodgeCd *= Math.pow(v, rank); add(name, `dodge cooldown ${pct(Math.pow(v, rank))}`); break;
      case 'phantomSlot': m.phantomSlots += v * rank; add(name, `+${v * rank} shade slot`); break;
      case 'attunementSlot': m.recitationSlots += v * rank; add(name, `+${v * rank} recitation slot`); break;
      case 'startWeaponLevel': m.startWeaponLevel += v * rank; add(name, `weapons start +${v * rank}`); break;
      case 'startLevels': m.startLevels += v * rank; add(name, `+${v * rank} starting levels`); break;
      case 'startSouls': m.startSouls += v * rank; add(name, `start with ${v * rank} marrow`); break;
      case 'keepWeapons': m.keepWeapons = true; add(name, 'weapons persist through Snuffing'); break;
      case 'ngScaling': m.ngScaling *= Math.pow(v, rank); add(name, `Waking scaling ${pct(Math.pow(v, rank))}`); break;
      default:
        if (k.startsWith('unlock')) { m.unlocks.add(k.slice(6).replace(/^./, (c) => c.toLowerCase())); add(name, `unlocks ${k.slice(6)}`); }
        break;
    }
  }
}
