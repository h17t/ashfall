/** Sim extension: catalysts, spells, recitation and creeds for every strategy. */
import { registerSimExtension } from './strategies';
import { SPELLS, CREEDS, getSpell } from '@/content';
import { canBuySpell, creedAvailable, switchCost, upgradeCost, levelCost, recitationSlotCost, MAX_BOUGHT_SLOTS } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  const p = s.player;
  // cast anything ready, every tick (cheap)
  if (s.encounter.enemy && s.deathScreen <= 0) {
    for (let i = 0; i < p.recited.length; i++) {
      const id = p.recited[i];
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
  const wantsCatalyst = params.levelPlan === 'weaponBest' ? 'litanyBeads' : 'weaverStaff';
  if (!p.weapons[wantsCatalyst] && s.marrow.gte(reserve.add(260 * 3))) out.push({ type: 'buyWeapon', weapon: wantsCatalyst });
  // buy affordable spells of available schools
  for (const sp of Object.values(SPELLS)) {
    if (sp.source.kind !== 'shop') continue;
    if (canBuySpell(s, sp.id) === null && s.marrow.gte(reserve.add(sp.source.cost * 2))) { out.push({ type: 'buySpell', spell: sp.id }); break; }
  }
  // slots
  const bought = s.materials.__reciteUpgrades ?? 0;
  if (bought < MAX_BOUGHT_SLOTS && s.spellsKnown.length > p.recitationSlots && s.marrow.gte(recitationSlotCost(s).mul(2).add(reserve))) out.push({ type: 'buyRecitationSlot' });
  // recite: prefer buffs/marrow, then damage
  const rank = (id: string) => { const e = getSpell(id).effect; return e.kind === 'buff' && e.buff.marrow ? 5 : e.kind === 'buff' ? 4 : e.kind === 'strainBomb' ? 3 : e.kind === 'damage' ? 2 : e.kind === 'heal' ? 1 : 0; };
  const wanted = [...s.spellsKnown].sort((a, b) => rank(b) - rank(a)).slice(0, p.recitationSlots);
  for (let i = 0; i < p.recitationSlots; i++) {
    const want = wanted[i] ?? null;
    if (p.recited[i] !== want && !(want && p.recited.includes(want))) out.push({ type: 'recite', slot: i, spell: want });
  }
  // flame
  if ((s.flags.hasBrand || p.weapons.ruinBrand) && s.marrow.gte(reserve.add(300 * Math.pow(2.2, p.brandLevel) * 3))) out.push({ type: 'feedBrand' });
  // creed: by play style
  const preferred = params.clickRate === 0 || params.clickUntil !== undefined ? 'legion' : params.respectsMechanics ? 'wick' : 'vigil';
  if (s.creed.current !== preferred && creedAvailable(s, preferred) === null && s.marrow.gte(switchCost(s).add(reserve))) out.push({ type: 'joinCreed', creed: preferred });
  const cur = s.creed.current;
  if (cur) {
    for (const u of CREEDS[cur].upgrades) {
      const r = s.creed.upgrades[u.id] ?? 0;
      if (r < u.maxRank && (s.creed.rep[cur] ?? 0) >= u.repReq && s.marrow.gte(upgradeCost(s, cur, u.id).mul(2).add(reserve))) { out.push({ type: 'buyCreedUpgrade', upgrade: u.id }); break; }
    }
  }
});
