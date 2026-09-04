/**
 * Combat: encounter spawning, player attacks, stagger/riposte, enemy telegraphs,
 * dodges, statuses, boss phases and mechanics, kills, death and the bloodstain.
 */
import { D, Decimal, ZERO, safe, decMin } from './num';
import { rand, chance, pick } from './rng';
import { BALANCE } from '@/content/balance';
import { getEnemy, getZone, getBoss, getWeapon, globalTier, nextZone, BOSSES, WEAPONS } from '@/content';
import type { AttackPattern, BossPhase, EnemyDef } from '@/content/types';
import type { GameState, GameEvent, EnemyInstance, StatusKey, DamageType, Buff, StatKey } from './types';
import { tierHp, tierDmg, tierPoise, tierSouls, reinforceMult, gradeCoef, statCurve, critChance, playerHpMax, playerStaminaMax, playerStaminaRegen, playerFpMax } from './formulas';
import type { Mods } from './mods';

// ---------------------------------------------------------------------------
// Derived player numbers
// ---------------------------------------------------------------------------

export function refreshPlayerMaxes(state: GameState, mods: Mods) {
  const p = state.player;
  const hpMax = playerHpMax(p.stats.vig, p.level, mods.hpMult);
  const stamMax = playerStaminaMax(p.stats.end);
  const fpMax = playerFpMax(p.stats.int, p.stats.fth, mods.fpMult);
  if (hpMax !== p.hpMax) {
    // keep the same fraction when max changes
    const frac = p.hpMax > 0 ? p.hp / p.hpMax : 1;
    p.hpMax = hpMax;
    p.hp = Math.min(hpMax, Math.max(0, Math.round(frac * hpMax)));
  }
  p.staminaMax = stamMax;
  p.stamina = Math.min(p.stamina, stamMax);
  p.fpMax = fpMax;
  p.fp = Math.min(p.fp, fpMax);
  p.estusMax = BALANCE.player.estusStart + mods.estusCount + (state.flags.estusShards ? 0 : 0) + (state.materials.__estusUpgrades ?? 0);
  p.estus = Math.min(p.estus, p.estusMax);
  p.attunementSlots = (state.flags.hasCatalyst ? 1 : 0) + (state.materials.__attuneUpgrades ?? 0) + mods.attunementSlots;
  while (p.attuned.length < p.attunementSlots) p.attuned.push(null);
  if (p.attuned.length > p.attunementSlots) p.attuned.length = Math.max(0, p.attunementSlots);
}

export interface DamageBreakdown {
  base: number;
  reinforce: number;
  scaling: number;
  scalingParts: { stat: StatKey; grade: string; value: number }[];
  infusion: number;
  reqPenalty: number;
  buffs: number;
  mods: number;
  total: Decimal;
  type: DamageType;
  crit: number;
  riposte: number;
}

export function buffMult(buffs: Buff[], key: 'dmg' | 'souls' | 'stagger' | 'taken' | 'stamRegen'): number {
  let m = 1;
  for (const b of buffs) {
    const v = b[key];
    if (v !== undefined) m *= v;
  }
  return m;
}

/** Full damage computation for the equipped weapon, with a breakdown for the UI. */
export function weaponDamage(state: GameState, mods: Mods, weaponId = state.player.weapon): DamageBreakdown {
  const p = state.player;
  const inst = p.weapons[weaponId];
  const def = getWeapon(weaponId);
  const level = inst?.level ?? 0;
  const inf = inst?.infusion ?? 'none';
  const infDef = inf !== 'none' ? BALANCE.weapon.infusion[inf] : null;
  let type: DamageType = def.damageType;
  let scaling: Partial<Record<StatKey, string>> = { ...def.scaling };
  let infusionMult = 1;
  if (infDef) {
    infusionMult = infDef.base;
    if (infDef.stat && infDef.grade) {
      // physical infusions shift scaling onto one stat; others are reduced a grade
      const target = infDef.stat as StatKey;
      const reduced: Partial<Record<StatKey, string>> = {};
      for (const [k, g] of Object.entries(scaling)) reduced[k as StatKey] = downgrade(g as string);
      reduced[target] = infDef.grade;
      scaling = reduced;
    }
    if (infDef.type) type = infDef.type as DamageType;
  }
  const parts: { stat: StatKey; grade: string; value: number }[] = [];
  let scalingSum = 0;
  for (const [k, g] of Object.entries(scaling)) {
    const stat = k as StatKey;
    const v = gradeCoef(g as any) * statCurve(p.stats[stat]);
    if (v > 0 || g !== '-') parts.push({ stat, grade: g as string, value: v });
    scalingSum += v;
  }
  let reqPenalty = 1;
  for (const [k, need] of Object.entries(def.req)) {
    if (p.stats[k as StatKey] < (need ?? 0)) reqPenalty = BALANCE.weapon.reqPenalty;
  }
  const reinforce = reinforceMult(level);
  const buffs = buffMult(p.buffs, 'dmg');
  const total = D(def.base).mul(reinforce).mul(1 + scalingSum).mul(infusionMult).mul(reqPenalty).mul(buffs).mul(mods.dmg);
  return {
    base: def.base,
    reinforce,
    scaling: scalingSum,
    scalingParts: parts,
    infusion: infusionMult,
    reqPenalty,
    buffs,
    mods: mods.dmg,
    total: safe(total),
    type,
    crit: critChance(p.stats.dex, mods.critBonus + def.crit),
    riposte: def.riposteMult * mods.riposteMult,
  };
}

function downgrade(g: string): string {
  const order = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];
  const i = order.indexOf(g);
  return order[Math.max(0, i - 1)];
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

function emptyStatuses(): Record<StatusKey, { buildup: number; active: number; dps: Decimal }> {
  return {
    bleed: { buildup: 0, active: 0, dps: ZERO },
    poison: { buildup: 0, active: 0, dps: ZERO },
    frost: { buildup: 0, active: 0, dps: ZERO },
  };
}

export function ngLevel(state: GameState, mods: Mods): number {
  return state.prestige.kindles * mods.ngScaling;
}

export function spawnEnemy(state: GameState, mods: Mods, events: GameEvent[]) {
  const enc = state.encounter;
  const zone = getZone(enc.zone);
  const g = globalTier(enc.zone, enc.tier);
  const ng = ngLevel(state, mods);
  enc.t = 0;
  if (enc.tier < 0) {
    const bossId = enc.tier === -1 ? zone.boss : zone.secretBoss!;
    const boss = getBoss(bossId);
    const secret = boss.secret;
    const hp = tierHp(g, ng).mul(secret ? BALANCE.enemy.secretBossHpMult : BALANCE.enemy.bossHpMult).mul(boss.hpMult).floor();
    const alreadyKilled = state.prestige.bossesEverKilled.includes(bossId) && (enc.tier === -1 ? state.zones[enc.zone]?.bossKills : state.zones[enc.zone]?.secretKills) > 0;
    const souls = tierSouls(g, ng).mul(secret ? BALANCE.enemy.secretBossSoulMult : BALANCE.enemy.bossSoulMult).mul(boss.soulMult).mul(alreadyKilled ? 0.25 : 1).floor();
    enc.enemy = {
      id: bossId,
      name: `${boss.name}, ${boss.title}`,
      isBoss: true,
      phase: 0,
      hp,
      hpMax: hp,
      stagger: 0,
      poise: tierPoise(g) * BALANCE.enemy.bossPoiseMult * boss.poiseMult,
      riposte: 0,
      attackIn: boss.phases[0].attackInterval * 0.8,
      windup: 0,
      windupTotal: 0,
      attackDamage: 0,
      attackId: '',
      statuses: emptyStatuses(),
      mech: {},
      variants: [],
      souls,
    };
    events.push({ type: 'bossPhase', phase: 0, name: boss.phases[0].name });
    return;
  }
  const tier = zone.tiers[enc.tier];
  const defId = pick(state.rng, tier.enemies);
  const def = getEnemy(defId);
  const variants = pickVariants(state, ng);
  const vMult = variantMults(variants);
  const hp = tierHp(g, ng).mul(def.hpMult).mul(vMult.hp).floor();
  const souls = tierSouls(g, ng).mul(def.soulMult).mul(vMult.souls).floor();
  enc.enemy = {
    id: defId,
    name: (variants.length ? variants.map((v) => VARIANTS[v].name).join(' ') + ' ' : '') + def.name,
    isBoss: false,
    phase: 0,
    hp,
    hpMax: hp,
    stagger: 0,
    poise: tierPoise(g) * def.poiseMult * vMult.poise,
    riposte: 0,
    attackIn: def.attackInterval * (0.5 + rand(state.rng) * 0.5),
    windup: 0,
    windupTotal: 0,
    attackDamage: 0,
    attackId: '',
    statuses: emptyStatuses(),
    mech: {},
    variants,
    souls,
  };
}

/** NG+ enemy variants: each kindle adds a chance for modifiers that change how the fight plays. */
export const VARIANTS: Record<string, { name: string; hp: number; dmg: number; poise: number; souls: number; desc: string; minNg: number }> = {
  ashen: { name: 'Ashen', hp: 1.3, dmg: 1.0, poise: 1.4, souls: 1.35, desc: 'Hardened by the second burning. More HP and poise, worth more souls.', minNg: 1 },
  hollowed: { name: 'Hollowed', hp: 0.8, dmg: 1.5, poise: 0.7, souls: 1.25, desc: 'Nothing left but the urge to strike. Hits hard, breaks easily.', minNg: 1 },
  abyssal: { name: 'Abyssal', hp: 1.2, dmg: 1.2, poise: 1.0, souls: 1.8, desc: 'Touched by the dark. Attacks faster; drops far more souls.', minNg: 2 },
  ancient: { name: 'Ancient', hp: 2.0, dmg: 1.1, poise: 2.0, souls: 2.4, desc: 'Was old before the first fire. A wall of a creature.', minNg: 3 },
  ember: { name: 'Ember-touched', hp: 1.0, dmg: 1.3, poise: 1.0, souls: 1.6, desc: 'Burns from within. Its attacks come with almost no warning.', minNg: 4 },
};

function pickVariants(state: GameState, ng: number): string[] {
  if (ng <= 0) return [];
  const out: string[] = [];
  const p = Math.min(0.6, 0.12 * ng);
  if (chance(state.rng, p)) {
    const eligible = Object.keys(VARIANTS).filter((k) => VARIANTS[k].minNg <= ng);
    out.push(pick(state.rng, eligible));
  }
  return out;
}

export function variantMults(variants: string[]) {
  let hp = 1, dmg = 1, poise = 1, souls = 1;
  for (const v of variants) {
    const d = VARIANTS[v];
    hp *= d.hp; dmg *= d.dmg; poise *= d.poise; souls *= d.souls;
  }
  return { hp, dmg, poise, souls };
}

function currentPhase(enemy: EnemyInstance): BossPhase | null {
  if (!enemy.isBoss) return null;
  return getBoss(enemy.id).phases[enemy.phase];
}

function enemyDef(enemy: EnemyInstance): EnemyDef | null {
  return enemy.isBoss ? null : getEnemy(enemy.id);
}

function resistFor(enemy: EnemyInstance, type: DamageType): number {
  const ph = currentPhase(enemy);
  if (ph) return ph.resist?.[type] ?? 1;
  return enemyDef(enemy)!.resist[type] ?? 1;
}

function statusResistFor(enemy: EnemyInstance, s: StatusKey): number {
  const ph = currentPhase(enemy);
  if (ph) return ph.statusResist?.[s] ?? 1;
  return enemyDef(enemy)!.statusResist[s] ?? 1;
}

// ---------------------------------------------------------------------------
// Damage to enemy
// ---------------------------------------------------------------------------

export function damageEnemy(
  state: GameState,
  mods: Mods,
  events: GameEvent[],
  dmg: Decimal,
  type: DamageType,
  source: 'player' | 'phantom' | 'dot' | 'spell',
  opts: { crit?: boolean; riposte?: boolean; kind?: string } = {},
): Decimal {
  const enemy = state.encounter.enemy;
  if (!enemy || enemy.hp.lte(0)) return ZERO;
  let d = dmg.mul(resistFor(enemy, type));
  // Boss mechanics that modify incoming damage
  const ph = currentPhase(enemy);
  if (ph?.mechanic === 'staggerOnly' && enemy.riposte <= 0 && source !== 'dot') {
    d = d.mul(ph.mechParam ?? 0.15);
  }
  if (ph?.mechanic === 'backdraft' && source === 'player') {
    // hits within the window count; exceeding the cap retaliates
    const now = state.encounter.t;
    const windowStart = enemy.mech.bdStart ?? -10;
    if (now - windowStart > 2) { enemy.mech.bdStart = now; enemy.mech.bdCount = 0; }
    enemy.mech.bdCount = (enemy.mech.bdCount ?? 0) + 1;
    if (enemy.mech.bdCount > (ph.mechParam ?? 7)) {
      const burn = Math.round(state.player.hpMax * 0.08);
      hurtPlayer(state, mods, events, burn, 'backdraft');
      enemy.mech.bdCount = 0;
      enemy.mech.bdStart = now;
    }
  }
  d = safe(d.floor());
  if (d.lt(1) && dmg.gt(0)) d = D(1);
  enemy.hp = enemy.hp.sub(d);
  events.push({ type: 'hit', dmg: d, crit: !!opts.crit, riposte: !!opts.riposte, source, kind: opts.kind });
  if (enemy.hp.lte(0)) {
    enemy.hp = ZERO;
    onKill(state, mods, events);
  } else if (enemy.isBoss) {
    checkPhase(state, events);
  }
  return d;
}

function checkPhase(state: GameState, events: GameEvent[]) {
  const enemy = state.encounter.enemy!;
  const boss = getBoss(enemy.id);
  const frac = enemy.hp.div(enemy.hpMax).toNumber();
  let target = enemy.phase;
  for (let i = enemy.phase + 1; i < boss.phases.length; i++) {
    if (frac <= boss.phases[i].at) target = i;
  }
  if (target !== enemy.phase) {
    enemy.phase = target;
    enemy.windup = 0;
    enemy.attackIn = boss.phases[target].attackInterval * 0.6;
    enemy.stagger = 0;
    enemy.riposte = 0;
    events.push({ type: 'bossPhase', phase: target, name: boss.phases[target].name });
  }
}

export function addStagger(state: GameState, mods: Mods, events: GameEvent[], amount: number) {
  const enemy = state.encounter.enemy;
  if (!enemy || enemy.riposte > 0 || enemy.hp.lte(0)) return;
  let a = amount * mods.stagger * buffMult(state.player.buffs, 'stagger');
  if (enemy.statuses.frost.active > 0) a *= BALANCE.status.frost.staggerBonus;
  enemy.stagger += a;
  if (enemy.stagger >= enemy.poise) {
    enemy.stagger = 0;
    enemy.riposte = BALANCE.player.riposteWindow;
    enemy.mech.riposteHit = 0;
    if (BALANCE.player.staggerResetsAttack) {
      enemy.windup = 0;
      enemy.attackIn = Math.max(enemy.attackIn, 1.0);
    }
    events.push({ type: 'stagger' });
  }
}

export function applyStatus(state: GameState, mods: Mods, events: GameEvent[], status: StatusKey, amount: number) {
  const enemy = state.encounter.enemy;
  if (!enemy || enemy.hp.lte(0)) return;
  const st = enemy.statuses[status];
  if (st.active > 0 && status !== 'bleed') return; // already active; bleed can re-proc
  const resist = statusResistFor(enemy, status);
  if (resist <= 0) return;
  st.buildup += amount * resist * mods.statusBuild;
  if (st.buildup >= BALANCE.status.threshold) {
    st.buildup = 0;
    events.push({ type: 'statusProc', status, target: 'enemy' });
    const b = BALANCE.status;
    if (status === 'bleed') {
      const burst = enemy.hpMax.mul(b.bleed.burstFrac * mods.statusDmg);
      damageEnemy(state, mods, events, burst, 'physical', 'dot', { kind: 'bleed' });
    } else if (status === 'poison') {
      st.active = b.poison.duration;
      st.dps = enemy.hpMax.mul(b.poison.dpsFrac * mods.statusDmg);
    } else if (status === 'frost') {
      st.active = b.frost.duration;
      const burst = enemy.hpMax.mul(b.frost.burstFrac * mods.statusDmg);
      damageEnemy(state, mods, events, burst, 'magic', 'dot', { kind: 'frost' });
    }
  }
}

// ---------------------------------------------------------------------------
// Player attack
// ---------------------------------------------------------------------------

export function playerAttack(state: GameState, mods: Mods, events: GameEvent[], fromClick: boolean) {
  const enemy = state.encounter.enemy;
  const p = state.player;
  if (!enemy || enemy.hp.lte(0) || state.deathScreen > 0) return;
  const def = getWeapon(p.weapon);
  const br = weaponDamage(state, mods);
  let dmg = br.total;
  let exhausted = false;
  const cost = def.stamina;
  if (p.stamina >= cost) {
    p.stamina -= cost;
  } else {
    exhausted = true;
    p.stamina = Math.max(0, p.stamina - cost * 0.5);
    dmg = dmg.mul(BALANCE.player.exhaustedMult);
    events.push({ type: 'exhausted' });
  }
  if (fromClick) state.stats.clicks++;
  const crit = chance(state.rng, br.crit);
  if (crit) dmg = dmg.mul(BALANCE.player.critMult);
  const riposte = enemy.riposte > 0;
  if (riposte) {
    dmg = dmg.mul(br.riposte);
    enemy.mech.riposteHit = (enemy.mech.riposteHit ?? 0) + 1;
    state.stats.ripostes++;
  }
  // roll variance ±8% so numbers feel alive
  dmg = dmg.mul(0.92 + rand(state.rng) * 0.16);
  damageEnemy(state, mods, events, dmg, br.type, 'player', { crit, riposte });
  if (state.encounter.enemy && state.encounter.enemy.hp.gt(0)) {
    if (!exhausted) {
      const strBonus = 1 + statCurve(p.stats.str) * 0.25;
      addStagger(state, mods, events, def.stagger * strBonus * (riposte ? 0 : 1));
    }
    // status from weapon + infusion
    const inst = p.weapons[p.weapon];
    const infDef = inst && inst.infusion !== 'none' ? BALANCE.weapon.infusion[inst.infusion] : null;
    if (def.status) for (const [s, a] of Object.entries(def.status)) applyStatus(state, mods, events, s as StatusKey, a as number);
    if (infDef?.status) applyStatus(state, mods, events, infDef.status as StatusKey, infDef.amount ?? 0);
  }
}

// ---------------------------------------------------------------------------
// Player damage, dodge, death
// ---------------------------------------------------------------------------

export function hurtPlayer(state: GameState, mods: Mods, events: GameEvent[], amount: number, attackId: string): boolean {
  const p = state.player;
  if (state.deathScreen > 0) return false;
  const taken = mods.taken * buffMult(p.buffs, 'taken');
  const dmg = Math.max(1, Math.round(amount * taken));
  p.hp -= dmg;
  events.push({ type: 'enemyAttack', dmg, dodged: false, perfect: false, attackId });
  if (p.hp <= 0) {
    p.hp = 0;
    playerDie(state, mods, events);
    return true;
  }
  return false;
}

export function playerDodge(state: GameState, mods: Mods, events: GameEvent[]) {
  const p = state.player;
  if (p.dodgeCd > 0 || state.deathScreen > 0) return;
  const cost = 14;
  if (p.stamina < cost * 0.5) return;
  p.stamina = Math.max(0, p.stamina - cost);
  p.dodgeCd = BALANCE.player.dodgeCd * mods.dodgeCd;
  p.iframes = BALANCE.player.iframes;
  const enemy = state.encounter.enemy;
  // perfect dodge: pressed within the last `perfectWindow` seconds of a telegraph
  if (enemy && enemy.windup > 0 && enemy.windup <= BALANCE.player.perfectWindow) {
    state.player.perfectPending = true;
  } else {
    state.player.perfectPending = false;
  }
}

export function playerEstus(state: GameState, mods: Mods, events: GameEvent[]) {
  const p = state.player;
  if (p.estus <= 0 || state.deathScreen > 0 || p.hp >= p.hpMax) return;
  p.estus--;
  const amt = Math.round(p.hpMax * p.estusPotency * mods.estusPotency);
  p.hp = Math.min(p.hpMax, p.hp + amt);
  events.push({ type: 'heal', amount: amt });
}

export function playerDie(state: GameState, mods: Mods, events: GameEvent[]) {
  const p = state.player;
  const enc = state.encounter;
  state.stats.deaths++;
  const lost = state.souls;
  // Losing a stain you hadn't reclaimed
  if (state.bloodstain && state.bloodstain.souls.gt(0)) {
    events.push({ type: 'bloodstainLost', souls: state.bloodstain.souls });
    state.stats.soulsLost = state.stats.soulsLost.add(state.bloodstain.souls);
  }
  if (mods.noBloodstain) {
    state.bloodstain = null;
    state.stats.soulsLost = state.stats.soulsLost.add(lost);
  } else if (lost.gt(0)) {
    state.bloodstain = { souls: lost, zone: enc.zone, tier: enc.tier };
  } else {
    state.bloodstain = null;
  }
  state.souls = ZERO;
  events.push({ type: 'death', soulsLost: lost });
  state.deathScreen = BALANCE.player.deathScreen;
  // Respawn at bonfire
  const bonfireZone = state.bonfiresLit.includes(enc.zone) ? enc.zone : state.bonfire;
  state.bonfire = bonfireZone;
  p.hp = Math.round(p.hpMax * BALANCE.player.respawnHeal);
  p.stamina = p.staminaMax;
  p.fp = p.fpMax;
  p.estus = p.estusMax;
  p.buffs = [];
  p.poisoned = 0;
  p.dodgeCd = 0;
  p.iframes = 0;
  enc.zone = bonfireZone;
  enc.tier = 0;
  enc.enemy = null;
  enc.respawnIn = 0.5;
  enc.streak = 0;
  if (state.bloodstain && state.bloodstain.zone === bonfireZone) {
    state.corpseRun = { zone: bonfireZone, targetTier: state.bloodstain.tier, atTier: 0, killsAtTier: 0 };
  } else {
    state.corpseRun = null;
  }
}

// ---------------------------------------------------------------------------
// Kill resolution
// ---------------------------------------------------------------------------

export function onKill(state: GameState, mods: Mods, events: GameEvent[]) {
  const enc = state.encounter;
  const enemy = enc.enemy!;
  const zone = getZone(enc.zone);
  const g = globalTier(enc.zone, enc.tier);
  const zp = state.zones[enc.zone];
  const soulMult = mods.souls * buffMult(state.player.buffs, 'souls');
  const souls = safe(enemy.souls.mul(soulMult).floor());
  state.souls = state.souls.add(souls);
  state.stats.soulsEarned = state.stats.soulsEarned.add(souls);
  state.stats.cycleSouls = state.stats.cycleSouls.add(souls);
  state.stats.kills = state.stats.kills.add(1);
  state.stats.cycleKills = state.stats.cycleKills.add(1);
  state.stats.deepestTier = Math.max(state.stats.deepestTier, g);
  state.stats.cycleDeepest = Math.max(state.stats.cycleDeepest, g);
  enc.streak++;
  // drops
  const drops: Record<string, number> = {};
  const dropTable = enemy.isBoss ? getBoss(enemy.id).drops : getEnemy(enemy.id).drops;
  const dropMult = mods.materialMult * Math.pow(BALANCE.ng.dropGrowth, state.prestige.kindles);
  for (const [mat, ch] of Object.entries(dropTable)) {
    if (enemy.isBoss) {
      const already = enc.tier === -1 ? zp.bossKills > 0 : zp.secretKills > 0;
      if (already && ch >= 1 && (mat === 'estusShard' || mat === 'soulVessel' || mat === 'slab' || mat === 'coal')) continue;
      const n = Math.max(1, Math.floor(ch * (mat === 'estusShard' || mat === 'soulVessel' || mat === 'coal' ? 1 : dropMult)));
      drops[mat] = n;
    } else {
      const expected = ch * dropMult;
      let n = Math.floor(expected);
      if (chance(state.rng, expected - n)) n++;
      if (n > 0) drops[mat] = n;
    }
  }
  for (const [mat, n] of Object.entries(drops)) state.materials[mat] = (state.materials[mat] ?? 0) + n;
  // weapon drops
  for (const w of Object.values(WEAPONS)) {
    if (w.source.kind === 'drop' && w.source.zone === enc.zone && w.source.tier === enc.tier && !state.player.weapons[w.id]) {
      if (chance(state.rng, w.source.chance)) {
        state.player.weapons[w.id] = { id: w.id, level: mods.startWeaponLevel, infusion: 'none' };
        events.push({ type: 'unlock', what: 'weapon:' + w.id, text: `${w.name} dropped.` });
      }
    }
  }
  events.push({ type: 'kill', enemy: enemy.name, souls, isBoss: enemy.isBoss, drops });

  if (enemy.isBoss) {
    const bossId = enemy.id;
    if (enc.tier === -1) zp.bossKills++; else zp.secretKills++;
    state.stats.bossKills++;
    state.stats.cycleBosses++;
    const first = !state.prestige.bossesEverKilled.includes(bossId);
    if (first) state.prestige.bossesEverKilled.push(bossId);
    const firstThisCycle = (enc.tier === -1 ? zp.bossKills : zp.secretKills) === 1;
    if (firstThisCycle) {
      state.bossSouls[bossId] = (state.bossSouls[bossId] ?? 0) + 1;
    }
    events.push({ type: 'bossKilled', boss: bossId });
    if (enc.tier === -1) {
      const nz = nextZone(enc.zone);
      if (nz && !state.unlockedZones.includes(nz)) {
        state.unlockedZones.push(nz);
        events.push({ type: 'zoneUnlocked', zone: nz });
      }
    }
    // Boss arena: after the kill, the arena is empty; player returns to the last tier
    enc.enemy = null;
    enc.respawnIn = 2.0;
    enc.tier = zone.tiers.length - 1;
  } else {
    // tier progress
    zp.kills[enc.tier] = (zp.kills[enc.tier] ?? 0) + 1;
    const tierDef = zone.tiers[enc.tier];
    if (zp.cleared < enc.tier && zp.kills[enc.tier] >= tierDef.kills) {
      zp.cleared = enc.tier;
      events.push({ type: 'tierCleared', zone: enc.zone, tier: enc.tier });
    }
    // secret boss discovery
    if (zone.secretBoss && !zp.secretFound) {
      const cond = BOSSES[zone.secretBoss].secretCondition;
      const lastTierKills = zp.kills[zone.tiers.length - 1] ?? 0;
      if (cond?.kind === 'kills' && lastTierKills >= cond.count) {
        zp.secretFound = true;
        events.push({ type: 'unlock', what: 'secret:' + zone.secretBoss, text: `Something on the ${zone.tiers[zone.tiers.length - 1].name} has noticed you.` });
      }
    }
    // corpse run progress
    const run = state.corpseRun;
    if (run && run.zone === enc.zone && run.atTier === enc.tier) {
      run.killsAtTier++;
      if (run.killsAtTier >= BALANCE.death.runKillsPerTier) {
        if (run.targetTier >= 0 && run.atTier >= run.targetTier) {
          recoverBloodstain(state, mods, events);
        } else {
          run.atTier++;
          run.killsAtTier = 0;
          if (run.targetTier < 0 && run.atTier >= zone.tiers.length) {
            // stain lies in the boss arena: recovered upon reaching it
            recoverBloodstain(state, mods, events);
          } else {
            enc.tier = Math.min(run.atTier, zone.tiers.length - 1);
          }
        }
      }
    } else if (state.automation.autoAdvance && zp.cleared >= enc.tier && enc.tier < zone.tiers.length - 1 && !run) {
      enc.tier++;
    }
    enc.enemy = null;
    enc.respawnIn = BALANCE.enemy.respawnDelay;
  }
}

export function recoverBloodstain(state: GameState, mods: Mods, events: GameEvent[]) {
  const bs = state.bloodstain;
  if (!bs) { state.corpseRun = null; return; }
  const kept = safe(bs.souls.mul(mods.bloodstainKeep).floor());
  state.souls = state.souls.add(kept);
  events.push({ type: 'bloodstainRecovered', souls: kept });
  state.bloodstain = null;
  state.corpseRun = null;
}


// ---------------------------------------------------------------------------
// Per-tick combat update
// ---------------------------------------------------------------------------

export function tickCombat(state: GameState, mods: Mods, events: GameEvent[], dt: number) {
  const p = state.player;
  const enc = state.encounter;

  // death screen freezes combat
  if (state.deathScreen > 0) {
    state.deathScreen = Math.max(0, state.deathScreen - dt);
    return;
  }

  // ---- player regen & timers ----
  p.stamina = Math.min(p.staminaMax, p.stamina + playerStaminaRegen(p.stats.end, mods.stamRegen * buffMult(p.buffs, 'stamRegen')) * dt);
  p.fp = Math.min(p.fpMax, p.fp + BALANCE.player.fpRegen * (1 + statCurve(p.stats.int) + statCurve(p.stats.fth)) * dt);
  if (p.dodgeCd > 0) p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  if (p.iframes > 0) p.iframes = Math.max(0, p.iframes - dt);
  for (const k of Object.keys(p.cooldowns)) {
    p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt);
    if (p.cooldowns[k] <= 0) delete p.cooldowns[k];
  }
  let hpRegen = 0;
  for (const b of p.buffs) { b.t -= dt; if (b.hpRegen) hpRegen += b.hpRegen; }
  p.buffs = p.buffs.filter((b) => b.t > 0);
  if (hpRegen > 0) p.hp = Math.min(p.hpMax, p.hp + hpRegen * dt);
  if (p.poisoned > 0) {
    p.poisoned = Math.max(0, p.poisoned - dt);
    const tick = Math.max(1, p.hpMax * 0.01 * dt);
    p.hp -= tick;
    if (p.hp <= 0) { p.hp = 0; playerDie(state, mods, events); return; }
  }

  // ---- spawn ----
  if (!enc.enemy) {
    enc.respawnIn -= dt;
    if (enc.respawnIn <= 0) spawnEnemy(state, mods, events);
    return;
  }
  const enemy = enc.enemy;
  enc.t += dt;

  // ---- statuses on enemy ----
  for (const key of ['bleed', 'poison', 'frost'] as StatusKey[]) {
    const st = enemy.statuses[key];
    if (st.active > 0) {
      st.active = Math.max(0, st.active - dt);
      if (key === 'poison' && st.dps.gt(0)) {
        damageEnemy(state, mods, events, st.dps.mul(dt), 'physical', 'dot', { kind: 'poison' });
        if (!enc.enemy) return;
      }
    } else if (st.buildup > 0) {
      st.buildup = Math.max(0, st.buildup - BALANCE.status.decay * dt);
    }
  }
  // boss regen mechanic (Hanged Pilgrim): heals unless bleeding/poisoned
  const ph = currentPhase(enemy);
  if (ph?.mechanic === 'regen') {
    const suppressed = enemy.statuses.poison.active > 0 || enemy.statuses.frost.active > 0 || (enemy.mech.lastBleed !== undefined && enc.t - enemy.mech.lastBleed < 4);
    if (!suppressed && enemy.hp.gt(0) && enemy.riposte <= 0) {
      enemy.hp = decMin(enemy.hpMax, enemy.hp.add(enemy.hpMax.mul((ph.mechParam ?? 0.02) * dt)));
    }
  }

  // ---- riposte window ----
  if (enemy.riposte > 0) {
    enemy.riposte = Math.max(0, enemy.riposte - dt);
    if (enemy.riposte <= 0 && !(enemy.mech.riposteHit > 0)) events.push({ type: 'riposteMissed' });
    // auto-riposte
    if (state.automation.autoRiposte && enemy.riposte > 0 && mods.unlocks.has('autoRiposte')) {
      enemy.mech.autoRip = (enemy.mech.autoRip ?? 0) - dt;
      if (enemy.mech.autoRip <= 0) { enemy.mech.autoRip = 0.35; playerAttack(state, mods, events, false); }
    }
    if (!enc.enemy) return;
  } else {
    // ---- enemy attack cycle ----
    const slow = enemy.statuses.frost.active > 0 ? 1 / BALANCE.status.frost.slow : 1;
    if (enemy.windup > 0) {
      enemy.windup -= dt / slow;
      // auto-dodge
      if (state.automation.autoDodge && mods.unlocks.has('autoDodge') && enemy.windup <= BALANCE.player.perfectWindow * 0.8 && p.dodgeCd <= 0 && p.iframes <= 0) {
        playerDodge(state, mods, events);
      }
      if (enemy.windup <= 0) {
        enemy.windup = 0;
        resolveEnemyAttack(state, mods, events);
        if (state.deathScreen > 0) return;
        enemy.attackIn = attackInterval(enemy) * slow * (0.85 + rand(state.rng) * 0.3);
      }
    } else {
      enemy.attackIn -= dt;
      if (enemy.attackIn <= 0) beginTelegraph(state, mods);
    }
  }

  // ---- auto attack ----
  if (state.automation.autoAttack && mods.unlocks.has('autoAttack') && enc.enemy) {
    p.autoAttackIn -= dt;
    if (p.autoAttackIn <= 0) {
      const w = getWeapon(p.weapon);
      p.autoAttackIn = 1 / (BALANCE.player.autoAttackRate * w.speed);
      // Auto-attack respects stamina: it waits rather than exhausting the player.
      if (p.stamina >= w.stamina) playerAttack(state, mods, events, false);
    }
  }
  // ---- auto estus ----
  if (state.automation.autoEstus && mods.unlocks.has('autoEstus') && p.hp < p.hpMax * 0.35 && p.estus > 0) {
    playerEstus(state, mods, events);
  }
}

function attackInterval(enemy: EnemyInstance): number {
  const ph = currentPhase(enemy);
  if (ph) return ph.attackInterval;
  const def = enemyDef(enemy)!;
  const v = enemy.variants.includes('abyssal') ? 0.75 : 1;
  return def.attackInterval * v;
}

function beginTelegraph(state: GameState, mods: Mods) {
  const enemy = state.encounter.enemy!;
  const ph = currentPhase(enemy);
  const attacks: AttackPattern[] = ph ? ph.attacks : enemyDef(enemy)!.attacks;
  const totalW = attacks.reduce((a, b) => a + b.weight, 0);
  let r = rand(state.rng) * totalW;
  let atk = attacks[0];
  for (const a of attacks) { r -= a.weight; if (r <= 0) { atk = a; break; } }
  const g = globalTier(state.encounter.zone, state.encounter.tier);
  const ng = ngLevel(state, mods);
  const base = tierDmg(g, ng);
  let mult = atk.mult;
  if (enemy.isBoss) mult *= BALANCE.enemy.bossDmgMult * getBoss(enemy.id).dmgMult;
  else mult *= enemyDef(enemy)!.dmgMult * variantMults(enemy.variants).dmg;
  const emberTouched = enemy.variants.includes('ember');
  enemy.windup = atk.windup * (emberTouched ? 0.55 : 1);
  enemy.windupTotal = enemy.windup;
  enemy.attackDamage = Math.round(base * mult);
  enemy.attackId = atk.id;
  enemy.mech.attackStatus = atk.status === 'poison' ? 1 : 0;
}

function resolveEnemyAttack(state: GameState, mods: Mods, events: GameEvent[]) {
  const enemy = state.encounter.enemy!;
  const p = state.player;
  const dmg = enemy.attackDamage;
  if (p.iframes > 0) {
    const perfect = p.perfectPending;
    if (perfect) {
      state.stats.perfectDodges++;
      p.buffs.push({ id: 'perfectDodge', t: BALANCE.player.perfectBuff.t, dmg: BALANCE.player.perfectBuff.dmg });
    }
    events.push({ type: 'enemyAttack', dmg: 0, dodged: true, perfect, attackId: enemy.attackId });
    p.perfectPending = false;
    return;
  }
  const died = hurtPlayer(state, mods, events, dmg, enemy.attackId);
  if (!died && enemy.mech.attackStatus === 1) p.poisoned = 8;
}

/** Player retreats to the bonfire: no death, no soul loss, encounter resets, Estus refilled. */
export function restAtBonfire(state: GameState, mods: Mods, events: GameEvent[]) {
  const p = state.player;
  const enc = state.encounter;
  p.hp = p.hpMax;
  p.stamina = p.staminaMax;
  p.fp = p.fpMax;
  p.estus = p.estusMax;
  p.poisoned = 0;
  p.buffs = p.buffs.filter((b) => b.id.startsWith('spell:'));
  enc.enemy = null;
  enc.respawnIn = 0.8;
  enc.streak = 0;
  if (!state.bonfiresLit.includes(enc.zone)) state.bonfiresLit.push(enc.zone);
  state.bonfire = enc.zone;
}
