/** Sim extension: every strategy recruits, levels, gears and assigns shades. */
import { registerSimExtension } from './strategies';
import { SHADES, getPhantom, getWeapon } from '@/content';
import { canRecruit, shadeLevelCost, levelCost } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  const arenaChanged = (s.encounter.tier < 0) !== ((mem.wasArena as boolean) ?? false);
  mem.wasArena = s.encounter.tier < 0;
  if (!arenaChanged && view.t - ((mem.lastSquad as number) ?? -10) < 3) return;
  mem.lastSquad = view.t;
  const reserve = levelCost(s.player.level).mul(params.soulsReserve);
  // recruit anyone available
  for (const id of Object.keys(SHADES)) {
    if (!canRecruit(s, id) && s.marrow.sub(SHADES[id].recruitCost).gte(reserve)) { out.push({ type: 'recruit', shade: id }); return; }
  }
  const active = params.clickRate > 0 && (params.clickUntil === undefined || view.t < params.clickUntil);
  const inArena = s.encounter.tier < 0;
  for (const ph of s.cortege.shades) {
    const def = getPhantom(ph.id);
    // assignment: everyone stands beside you for a boss; otherwise active players keep damage/strain/buffer
    // beside them and idle players send everyone hunting
    const wantBeside = inArena || (active && (def.role === 'dps' || def.role === 'strain' || def.role === 'buffer'));
    const want = wantBeside ? 'beside' : 'hunt';
    if (ph.assignment !== want) out.push({ type: 'assignShade', shade: ph.id, assignment: want });
    // gear: hand over the best weapon we are not wielding
    let best: string | null = null;
    let bestBase = -1;
    for (const w of Object.values(s.player.weapons)) {
      if (w.id === s.player.weapon) continue;
      if (s.cortege.shades.some((o) => o.id !== ph.id && o.weapon === w.id)) continue;
      const base = getWeapon(w.id).base * Math.pow(1.15, w.level);
      if (base > bestBase) { bestBase = base; best = w.id; }
    }
    if (best && best !== ph.weapon) out.push({ type: 'equipShade', shade: ph.id, weapon: best });
    // level when cheap relative to our own level cost
    const c = shadeLevelCost(ph);
    if (s.marrow.gte(c.mul(3).add(reserve)) && c.lt(levelCost(s.player.level))) out.push({ type: 'assignShadeLevel', shade: ph.id });
  }
  if (!s.cortege.huntAuto) out.push({ type: 'setHunt', zone: s.cortege.huntZone, tier: s.cortege.huntTier, auto: true });
});
