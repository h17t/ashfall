/**
 * Content registry. The engine only reads content through these accessors.
 */
import { WEAPONS, STARTING_WEAPON } from './weapons';
import { ENEMIES } from './enemies';
import { ZONES, ZONE_ORDER } from './zones';
import { BOSSES } from './bosses';
import { SPELLS } from './spells';
import { PHANTOMS } from './phantoms';
import { COVENANTS } from './covenants';
import { TREE, SIGIL_UNLOCKS, BRANCH_INFO } from './tree';
import { MATERIALS, reinforceMaterial } from './materials';
import { BALANCE } from './balance';
import type { WeaponDef, EnemyDef, ZoneDef, BossDef, SpellDef, PhantomDef, CovenantDef, TreeNode, SigilUnlock, MaterialDef } from './types';

export { WEAPONS, ENEMIES, ZONES, ZONE_ORDER, BOSSES, SPELLS, PHANTOMS, COVENANTS, TREE, SIGIL_UNLOCKS, BRANCH_INFO, MATERIALS, BALANCE, STARTING_WEAPON, reinforceMaterial };
export { UPCOMING_SPELLS } from './spells';
export type { WeaponDef, EnemyDef, ZoneDef, BossDef, SpellDef, PhantomDef, CovenantDef, TreeNode, SigilUnlock, MaterialDef };

export function getWeapon(id: string): WeaponDef {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Unknown weapon ${id}`);
  return w;
}
export function getEnemy(id: string): EnemyDef {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Unknown enemy ${id}`);
  return e;
}
export function getZone(id: string): ZoneDef {
  const z = ZONES[id];
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
}
export function getBoss(id: string): BossDef {
  const b = BOSSES[id];
  if (!b) throw new Error(`Unknown boss ${id}`);
  return b;
}
export function getSpell(id: string): SpellDef {
  const s = SPELLS[id];
  if (!s) throw new Error(`Unknown spell ${id}`);
  return s;
}
export function getPhantom(id: string): PhantomDef {
  const p = PHANTOMS[id];
  if (!p) throw new Error(`Unknown phantom ${id}`);
  return p;
}

/** Global tier offsets: the cumulative tier index at which each zone starts. */
const zoneOffsets: Record<string, number> = {};
{
  let g = 0;
  for (const id of ZONE_ORDER) {
    zoneOffsets[id] = g;
    g += ZONES[id].tiers.length;
  }
}

/**
 * Global tier index for (zone, tier). tier -1 (boss) and -2 (secret boss) use the zone's last tier.
 */
export function globalTier(zone: string, tier: number, depth = 0): number {
  const z = getZone(zone);
  const d = z.endless ? depth * z.tiers.length : 0;
  if (tier < 0) return zoneOffsets[zone] + z.tiers.length - 1 + d;
  return zoneOffsets[zone] + Math.min(tier, z.tiers.length - 1) + d;
}

export function zoneOffset(zone: string): number {
  return zoneOffsets[zone] ?? 0;
}

/** The NG+ cycle boss of a zone, if any. */
export function cycleBossFor(zone: string): BossDef | null {
  for (const b of Object.values(BOSSES)) if (b.zone === zone && b.cycle !== undefined) return b;
  return null;
}

export function nextZone(zone: string): string | null {
  const i = ZONE_ORDER.indexOf(zone);
  return i >= 0 && i + 1 < ZONE_ORDER.length ? ZONE_ORDER[i + 1] : null;
}

/** Validation used by tests: every cross-reference resolves. */
export function validateContent(): string[] {
  const errs: string[] = [];
  for (const z of Object.values(ZONES)) {
    if (!BOSSES[z.boss]) errs.push(`zone ${z.id} boss ${z.boss} missing`);
    if (z.secretBoss && !BOSSES[z.secretBoss]) errs.push(`zone ${z.id} secret boss ${z.secretBoss} missing`);
    if (z.phantom && !PHANTOMS[z.phantom]) errs.push(`zone ${z.id} phantom ${z.phantom} missing`);
    if (z.requires && !BOSSES[z.requires]) errs.push(`zone ${z.id} requires ${z.requires} missing`);
    if (z.requiresUnlock && !SIGIL_UNLOCKS[z.requiresUnlock]) errs.push(`zone ${z.id} requiresUnlock ${z.requiresUnlock} missing`);
    z.tiers.forEach((t, i) => t.enemies.forEach((e) => { if (!ENEMIES[e]) errs.push(`zone ${z.id} tier ${i} enemy ${e} missing`); }));
    if (!ZONE_ORDER.includes(z.id)) errs.push(`zone ${z.id} not in ZONE_ORDER`);
  }
  for (const b of Object.values(BOSSES)) {
    if (!WEAPONS[b.soulWeapon]) errs.push(`boss ${b.id} soul weapon ${b.soulWeapon} missing`);
    if (!SPELLS[b.soulSpell]) errs.push(`boss ${b.id} soul spell ${b.soulSpell} missing`);
    if (!ZONES[b.zone]) errs.push(`boss ${b.id} zone ${b.zone} missing`);
    for (const d of Object.keys(b.drops)) if (!MATERIALS[d]) errs.push(`boss ${b.id} drop ${d} missing`);
    if (b.phases.length === 0) errs.push(`boss ${b.id} has no phases`);
    if (b.phases[0]?.at !== 1) errs.push(`boss ${b.id} first phase must start at 1.0`);
  }
  for (const e of Object.values(ENEMIES)) {
    for (const d of Object.keys(e.drops)) if (!MATERIALS[d]) errs.push(`enemy ${e.id} drop ${d} missing`);
    if (e.attacks.length === 0) errs.push(`enemy ${e.id} has no attacks`);
  }
  for (const w of Object.values(WEAPONS)) {
    if (w.source.kind === 'bossSoul' && !BOSSES[w.source.boss]) errs.push(`weapon ${w.id} boss ${w.source.boss} missing`);
    if (w.source.kind === 'drop' && !ZONES[w.source.zone]) errs.push(`weapon ${w.id} zone missing`);
    if (!w.lore || w.lore.length < 40) errs.push(`weapon ${w.id} lore too short`);
  }
  for (const p of Object.values(PHANTOMS)) {
    if (!WEAPONS[p.defaultWeapon]) errs.push(`phantom ${p.id} weapon missing`);
    if (!ZONES[p.zone]) errs.push(`phantom ${p.id} zone missing`);
    if (p.requiresBoss && !BOSSES[p.requiresBoss]) errs.push(`phantom ${p.id} requires missing boss`);
    if (!p.greeting) errs.push(`phantom ${p.id} has no greeting`);
  }
  for (const s of Object.values(SPELLS)) {
    if (s.source.kind === 'bossSoul' && !BOSSES[s.source.boss]) errs.push(`spell ${s.id} boss missing`);
  }
  for (const n of Object.values(TREE)) for (const r of n.requires) if (!TREE[r]) errs.push(`tree ${n.id} requires ${r} missing`);
  for (const n of Object.values(SIGIL_UNLOCKS)) for (const r of n.requires) if (!SIGIL_UNLOCKS[r]) errs.push(`sigil ${n.id} requires ${r} missing`);
  const placeholder = /placeholder|coming soon|todo|lorem/i;
  const allText = [...Object.values(WEAPONS), ...Object.values(ENEMIES), ...Object.values(BOSSES), ...Object.values(ZONES), ...Object.values(SPELLS), ...Object.values(PHANTOMS), ...Object.values(MATERIALS)].map((x) => x.lore + ' ' + x.name);
  allText.forEach((t) => { if (placeholder.test(t)) errs.push(`placeholder text: ${t.slice(0, 40)}`); });
  return errs;
}
