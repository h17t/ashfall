/** Sim extension: every strategy recruits, levels, gears and assigns phantoms. */
import { registerSimExtension } from './strategies';
import { PHANTOMS, getPhantom, getWeapon } from '@/content';
import { canRecruit, phantomLevelCost, levelCost } from '@/engine';

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  if (view.t - ((mem.lastSquad as number) ?? -10) < 3) return;
  mem.lastSquad = view.t;
  const reserve = levelCost(s.player.level).mul(params.soulsReserve);
  // recruit anyone available
  for (const id of Object.keys(PHANTOMS)) {
    if (!canRecruit(s, id) && s.souls.sub(PHANTOMS[id].recruitCost).gte(reserve)) { out.push({ type: 'recruit', phantom: id }); return; }
  }
  const active = params.clickRate > 0 && (params.clickUntil === undefined || view.t < params.clickUntil);
  for (const ph of s.squad.phantoms) {
    const def = getPhantom(ph.id);
    // assignment: active players keep damage/stagger/buffer beside them; idle players send everyone hunting
    const wantBeside = active && (def.role === 'dps' || def.role === 'stagger' || def.role === 'buffer');
    const want = wantBeside ? 'beside' : 'hunt';
    if (ph.assignment !== want) out.push({ type: 'assignPhantom', phantom: ph.id, assignment: want });
    // gear: hand over the best weapon we are not wielding
    let best: string | null = null;
    let bestBase = -1;
    for (const w of Object.values(s.player.weapons)) {
      if (w.id === s.player.weapon) continue;
      if (s.squad.phantoms.some((o) => o.id !== ph.id && o.weapon === w.id)) continue;
      const base = getWeapon(w.id).base * Math.pow(1.15, w.level);
      if (base > bestBase) { bestBase = base; best = w.id; }
    }
    if (best && best !== ph.weapon) out.push({ type: 'equipPhantom', phantom: ph.id, weapon: best });
    // level when cheap relative to our own level cost
    const c = phantomLevelCost(ph);
    if (s.souls.gte(c.mul(3).add(reserve)) && c.lt(levelCost(s.player.level))) out.push({ type: 'levelPhantom', phantom: ph.id });
  }
  if (!s.squad.huntAuto) out.push({ type: 'setHunt', zone: s.squad.huntZone, tier: s.squad.huntTier, auto: true });
});
