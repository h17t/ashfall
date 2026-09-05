/**
 * Action reducer: every player-initiated change goes through `applyAction`.
 * Actions are validated here; invalid actions emit an 'error' event and change nothing.
 */
import { D, ZERO, safe } from './num';
import { BALANCE } from '@/content/balance';
import { runFx } from './descent';
import { getZone, getWeapon, getBoss, getSpell, reinforceMaterial, cycleBossFor, WEAPONS, MATERIALS } from '@/content';
import type { GameState, GameEvent, Action, StatKey } from './types';
import { STAT_KEYS } from './types';
import { levelCost, reinforceCost, statCurve, reinforceMult, levelDamageMult } from './formulas';
import { computeMods, type Mods } from './mods';
import { playerAttack, playerDodge, playerEstus, restAtLantern, refreshPlayerMaxes, recoverBloodstain, damageEnemy, addStagger, applyStatus, weaponDamage } from './combat';
import { newZoneProgress } from './state';
import { actionHandlers } from './registry';
export { registerActionHandler } from './registry';
import { spellPower } from './magic';

export function ensureZone(state: GameState, zone: string) {
  if (!state.zones[zone]) state.zones[zone] = newZoneProgress(getZone(zone).tiers.length);
  return state.zones[zone];
}

/** Can the player travel to (zone, tier) right now? Returns a reason string if not. */
export function travelBlocked(state: GameState, zone: string, tier: number): string | null {
  if (!state.unlockedZones.includes(zone)) return 'That road is not yet open.';
  const z = getZone(zone);
  const zp = ensureZone(state, zone);
  if (state.remainsRun) return 'Your remains lies ahead. Reach it, or abandon it.';
  if (tier === -1) {
    if (zp.cleared < z.tiers.length - 1) return `Clear ${z.tiers[z.tiers.length - 1].name} first.`;
    return null;
  }
  if (tier === -2) {
    if (!z.secretBoss || !zp.secretFound) return 'Nothing waits there. Yet.';
    return null;
  }
  if (tier === -3) {
    const cb = cycleBossFor(zone);
    if (!cb || state.prestige.wakings < (cb.cycle ?? 99)) return 'Nothing stirs there in this cycle.';
    if (zp.bossKills <= 0) return 'It waits for the region\'s lord to fall first.';
    if (zp.cycleKills > 0) return 'Already put down this cycle.';
    return null;
  }
  if (tier < 0 || tier >= z.tiers.length) return 'No such place.';
  if (tier > zp.cleared + 1) return `Clear ${z.tiers[tier - 1].name} first.`;
  return null;
}

export function applyAction(state: GameState, action: Action, events: GameEvent[], mods: Mods = computeMods(state)): void {
  const p = state.player;
  const err = (text: string): void => { events.push({ type: 'error', text }); };
  switch (action.type) {
    case 'click':
      playerAttack(state, mods, events, true);
      return;
    case 'dodge':
      playerDodge(state, mods, events);
      return;
    case 'draughts':
      playerEstus(state, mods, events);
      return;
    case 'retreat':
      if (state.deathScreen > 0) return;
      restAtLantern(state, mods, events);
      return;
    case 'travel': {
      if (state.deathScreen > 0) return;
      const blocked = travelBlocked(state, action.zone, action.tier);
      if (blocked) return err(blocked);
      const enc = state.encounter;
      const changingZone = enc.zone !== action.zone;
      if (changingZone) {
        // Arriving in a new region lights its lantern and rests there before setting out.
        enc.zone = action.zone;
        enc.tier = 0;
        restAtLantern(state, mods, events);
      }
      enc.tier = action.tier;
      enc.enemy = null;
      enc.respawnIn = 0.4;
      enc.streak = 0;
      enc.t = 0;
      return;
    }
    case 'abandonRemains':
      if (state.remains) {
        events.push({ type: 'remainsLost', marrow: state.remains.marrow });
        state.stats.marrowLost = state.stats.marrowLost.add(state.remains.marrow);
      }
      state.remains = null;
      state.remainsRun = null;
      return;
    case 'levelUp': {
      if (!STAT_KEYS.includes(action.stat)) return err('No such stat.');
      const cost = levelCost(p.level);
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      p.stats[action.stat]++;
      p.level++;
      const before = p.hpMax;
      refreshPlayerMaxes(state, mods);
      p.hp = Math.min(p.hpMax, p.hp + Math.max(0, p.hpMax - before));
      events.push({ type: 'levelUp', stat: action.stat, level: p.level });
      return;
    }
    case 'equip': {
      if (!p.weapons[action.weapon]) return err('You do not own that.');
      p.weapon = action.weapon;
      return;
    }
    case 'buyWeapon': {
      const def = WEAPONS[action.weapon];
      if (!def) return err('No such weapon.');
      if (p.weapons[def.id]) return err('Already owned.');
      if (def.source.kind !== 'shop') return err('Not for sale.');
      const shopRegion = def.source.region;
      const regionUnlocked = state.unlockedZones.some((z) => getZone(z).region >= shopRegion);
      if (!regionUnlocked) return err('Not available here.');
      const cost = D(def.source.cost);
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      p.weapons[def.id] = { id: def.id, level: mods.startWeaponLevel, infusion: 'none' };
      events.push({ type: 'unlock', what: 'weapon:' + def.id, text: `${def.name} acquired.` });
      return;
    }
    case 'reinforce': {
      const inst = p.weapons[action.weapon];
      if (!inst) return err('You do not own that.');
      if (inst.level >= 10) return err('Already at its final form.');
      const def = getWeapon(inst.id);
      const cost = reinforceCost(def.region, inst.level);
      const mat = reinforceMaterial(inst.level);
      if ((state.materials[mat.id] ?? 0) < mat.count) return err(`Requires ${mat.count}× ${MATERIALS[mat.id].name}.`);
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      state.materials[mat.id] -= mat.count;
      inst.level++;
      return;
    }
    case 'infuse': {
      const inst = p.weapons[action.weapon];
      if (!inst) return err('You do not own that.');
      const def = getWeapon(inst.id);
      if (!def.infusable) return err('This weapon refuses the pitchCoal.');
      if (action.infusion !== 'none' && !state.flags.infusionUnlocked) return err('You need Cinder Coal to unlock infusions.');
      if (action.infusion === inst.infusion) return;
      if (action.infusion !== 'none') {
        if ((state.materials.pitchCoal ?? 0) < 1) return err('Requires 1× Cinder Coal.');
        state.materials.pitchCoal -= 1;
      }
      inst.infusion = action.infusion;
      return;
    }
    case 'chooseKeepsake': {
      const boss = getBoss(action.boss);
      if ((state.keepsakes[action.boss] ?? 0) <= 0) return err('You hold no such Keepsake.');
      state.keepsakes[action.boss]--;
      if (action.choice === 'weapon') {
        if (p.weapons[boss.keepsakeWeapon]) { state.keepsakes[action.boss]++; return err('Already forged.'); }
        p.weapons[boss.keepsakeWeapon] = { id: boss.keepsakeWeapon, level: mods.startWeaponLevel, infusion: 'none' };
        events.push({ type: 'unlock', what: 'weapon:' + boss.keepsakeWeapon, text: `${getWeapon(boss.keepsakeWeapon).name} forged from the Marrow.` });
      } else {
        if (state.spellsKnown.includes(boss.keepsakeSpell)) { state.keepsakes[action.boss]++; return err('Already learned.'); }
        state.spellsKnown.push(boss.keepsakeSpell);
        const sp = getSpell(boss.keepsakeSpell);
        if (sp.school === 'ruin') state.flags.hasBrand = true;
        state.flags.hasCatalyst = true;
        refreshPlayerMaxes(state, mods);
        events.push({ type: 'unlock', what: 'spell:' + boss.keepsakeSpell, text: `${sp.name} learned from the Marrow.` });
      }
      state.keepsakeChoices[action.boss] = action.choice;
      return;
    }
    case 'recite': {
      if (action.slot < 0 || action.slot >= p.recitationSlots) return err('No such slot.');
      if (action.spell && !state.spellsKnown.includes(action.spell)) return err('Unknown spell.');
      if (action.spell && p.recited.includes(action.spell)) return err('Already recited.');
      p.recited[action.slot] = action.spell;
      return;
    }
    case 'cast': {
      const id = p.recited[action.slot];
      if (!id) return;
      castSpell(state, mods, events, id);
      return;
    }
    case 'feedBrand': {
      const cost = D(300).mul(D(2.2).pow(p.brandLevel)).floor();
      if (!state.flags.hasBrand && !p.weapons.ruinBrand) return err('You have no flame to feed.');
      if (state.marrow.lt(cost)) return err('Not enough marrow.');
      state.marrow = state.marrow.sub(cost);
      p.brandLevel++;
      return;
    }
    case 'upgradeDraught': {
      if (action.kind === 'count') {
        if ((state.materials.wickStub ?? 0) < 1) return err('Requires an Tallowdraught Shard.');
        state.materials.wickStub--;
        state.materials.__estusUpgrades = (state.materials.__estusUpgrades ?? 0) + 1;
        refreshPlayerMaxes(state, mods);
        p.draughts = p.draughtsMax;
      } else {
        if ((state.materials.renderFat ?? 0) < 1) return err('Requires an Revenant Bone Shard.');
        state.materials.renderFat--;
        p.draughtPotency = Math.min(0.9, p.draughtPotency + 0.08);
      }
      return;
    }
    case 'respec': {
      if (p.respecs <= 0 && (state.materials.reliquaryBone ?? 0) <= 0) return err('You have no Reliquary Bone.');
      const total = STAT_KEYS.reduce((a, k) => a + p.stats[k], 0);
      const wanted = STAT_KEYS.reduce((a, k) => a + Math.max(0, Math.floor(action.stats[k] ?? 0)), 0);
      if (wanted !== total) return err('Points must add up.');
      const min = BALANCE.level.startingStats;
      for (const k of STAT_KEYS) if ((action.stats[k] ?? 0) < min[k]) return err('Cannot go below starting values.');
      for (const k of STAT_KEYS) p.stats[k] = Math.floor(action.stats[k]);
      if (state.materials.reliquaryBone > 0) state.materials.reliquaryBone--; else p.respecs--;
      refreshPlayerMaxes(state, mods);
      return;
    }
    case 'setAutomation': {
      const k = action.key;
      if (k === 'unlocked') return;
      (state.automation as any)[k] = action.value;
      return;
    }
    case 'ackOffline':
      state.offline = null;
      return;
    case 'ackDeath':
      state.deathScreen = 0;
      return;
    default:
      // Later-milestone actions are wired in their modules (shades, creeds, prestige).
      return handleExtended(state, action, events, mods);
  }
}

function handleExtended(state: GameState, action: Action, events: GameEvent[], mods: Mods) {
  for (const h of actionHandlers) if (h(state, action, events, mods)) return;
  events.push({ type: 'error', text: `Nothing happens. (${action.type})` });
}



export function castSpell(state: GameState, mods: Mods, events: GameEvent[], id: string) {
  const p = state.player;
  const sp = getSpell(id);
  if (state.deathScreen > 0) return;
  if ((p.cooldowns[id] ?? 0) > 0) return;
  const free = state.descent.run ? runFx(state.descent.run).freeCasts > 0 : false;
  if (!free && p.fp < sp.fp) { events.push({ type: 'error', text: 'Not enough FP.' }); return; }
  const enemy = state.encounter.enemy;
  const eff = sp.effect;
  const needsTarget = eff.kind === 'damage' || eff.kind === 'strainBomb' || eff.kind === 'dot' || eff.kind === 'status';
  if (needsTarget && (!enemy || enemy.hp.lte(0))) return;
  if (!free) p.fp -= sp.fp;
  p.cooldowns[id] = sp.cooldown;
  events.push({ type: 'cast', spell: id });
  const power = spellPower(state, mods, id);
  const wd = weaponDamage(state, mods);
  // spells scale from the weapon-independent "base strike" of the current tier so they stay relevant
  const baseStrike = D(getWeapon(p.weapon).base).mul(reinforceMult(p.weapons[p.weapon]?.level ?? 0)).mul(mods.dmg).mul(levelDamageMult(p.level));
  switch (eff.kind) {
    case 'damage': {
      const dmg = baseStrike.mul(eff.mult).mul(power).mul(wd.buffs);
      damageEnemy(state, mods, events, dmg, eff.type, 'spell', { kind: id });
      return;
    }
    case 'strainBomb': {
      const dmg = baseStrike.mul(eff.mult).mul(power).mul(wd.buffs);
      damageEnemy(state, mods, events, dmg, 'magic', 'spell', { kind: id });
      addStagger(state, mods, events, eff.amount * power);
      return;
    }
    case 'buff': {
      p.buffs = p.buffs.filter((b) => b.id !== 'spell:' + id);
      const b: any = { id: 'spell:' + id, t: eff.duration };
      for (const [k, v] of Object.entries(eff.buff)) {
        if (v === undefined) continue;
        // buffs scale gently with power (never below their listed value)
        b[k] = k === 'taken' ? v : 1 + (v - 1) * Math.max(1, Math.sqrt(power));
      }
      p.buffs.push(b);
      return;
    }
    case 'dot': {
      if (!enemy) return;
      const dps = baseStrike.mul(eff.mult).mul(power).div(eff.duration);
      enemy.statuses.poison.active = Math.max(enemy.statuses.poison.active, eff.duration);
      enemy.statuses.poison.dps = enemy.statuses.poison.dps.add(dps);
      return;
    }
    case 'heal': {
      const amt = Math.round(p.hpMax * eff.frac * Math.max(1, Math.sqrt(power)));
      p.hp = Math.min(p.hpMax, p.hp + amt);
      events.push({ type: 'heal', amount: amt });
      return;
    }
    case 'status': {
      applyStatus(state, mods, events, eff.status, eff.amount * power);
      return;
    }
    case 'cortegeBuff': {
      state.cortege.buff = { mult: eff.mult, t: eff.duration };
      return;
    }
  }
}
