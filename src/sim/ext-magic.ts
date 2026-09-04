/** Sim extension: catalysts, spells, attunement and covenants for every strategy. */
import { registerSimExtension } from './strategies';
import { SPELLS, COVENANTS, getSpell } from '@/content';
import { canBuySpell, covenantAvailable, switchCost, upgradeCost, levelCost, attunementSlotCost, MAX_BOUGHT_SLOTS } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  const p = s.player;
  // cast anything ready, every tick (cheap)
  if (s.encounter.enemy && s.deathScreen <= 0) {
    for (let i = 0; i < p.attuned.length; i++) {
      const id = p.attuned[i];
      if (!id) continue;
      const sp = getSpell(id);
      if ((p.cooldowns[id] ?? 0) > 0 || p.fp < sp.fp) continue;
      if (sp.effect.kind === 'heal' && p.hp > p.hpMax * 0.6) continue;
      out.push({ type: 'cast', slot: i });
    }
  }
  if (view.t - ((mem.lastMagic as number) ?? -10) < 5) return;
  mem.lastMagic = view.t;
  const reserve = levelCost(p.level).mul(params.soulsReserve);
  // A caster plan buys the staff/talisman; everyone else picks up a talisman for Heal once rich.
  const wantsCatalyst = params.levelPlan === 'weaponBest' ? 'crackedTalisman' : 'ashenStaff';
  if (!p.weapons[wantsCatalyst] && s.souls.gte(reserve.add(260 * 3))) out.push({ type: 'buyWeapon', weapon: wantsCatalyst });
  // buy affordable spells of available schools
  for (const sp of Object.values(SPELLS)) {
    if (sp.source.kind !== 'shop') continue;
    if (canBuySpell(s, sp.id) === null && s.souls.gte(reserve.add(sp.source.cost * 2))) { out.push({ type: 'buySpell', spell: sp.id }); break; }
  }
  // slots
  const bought = s.materials.__attuneUpgrades ?? 0;
  if (bought < MAX_BOUGHT_SLOTS && s.spellsKnown.length > p.attunementSlots && s.souls.gte(attunementSlotCost(s).mul(2).add(reserve))) out.push({ type: 'buyAttunementSlot' });
  // attune: prefer buffs/souls, then damage
  const rank = (id: string) => { const e = getSpell(id).effect; return e.kind === 'buff' && e.buff.souls ? 5 : e.kind === 'buff' ? 4 : e.kind === 'staggerBomb' ? 3 : e.kind === 'damage' ? 2 : e.kind === 'heal' ? 1 : 0; };
  const wanted = [...s.spellsKnown].sort((a, b) => rank(b) - rank(a)).slice(0, p.attunementSlots);
  for (let i = 0; i < p.attunementSlots; i++) {
    const want = wanted[i] ?? null;
    if (p.attuned[i] !== want && !(want && p.attuned.includes(want))) out.push({ type: 'attune', slot: i, spell: want });
  }
  // flame
  if ((s.flags.hasFlame || p.weapons.pyromancyFlame) && s.souls.gte(reserve.add(300 * Math.pow(2.2, p.flameLevel) * 3))) out.push({ type: 'upgradeFlame' });
  // covenant: by play style
  const preferred = params.clickRate === 0 || params.clickUntil !== undefined ? 'legion' : params.respectsMechanics ? 'embers' : 'vigil';
  if (s.covenant.current !== preferred && covenantAvailable(s, preferred) === null && s.souls.gte(switchCost(s).add(reserve))) out.push({ type: 'joinCovenant', covenant: preferred });
  const cur = s.covenant.current;
  if (cur) {
    for (const u of COVENANTS[cur].upgrades) {
      const r = s.covenant.upgrades[u.id] ?? 0;
      if (r < u.maxRank && (s.covenant.rep[cur] ?? 0) >= u.repReq && s.souls.gte(upgradeCost(s, cur, u.id).mul(2).add(reserve))) { out.push({ type: 'buyCovenantUpgrade', upgrade: u.id }); break; }
    }
  }
});
