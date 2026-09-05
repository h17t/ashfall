/**
 * Save migration 1 → 2: the pass-3 rename. Every key, id and enum value that carried the old
 * vocabulary is remapped; every number and Decimal survives untouched. The maps come from
 * rename-map.ts, which the rename itself generated, so the code and the migration cannot drift.
 */
import { ZONES, ENEMIES, BOSSES, WEAPONS, SPELLS, CREEDS, CREED_UPGRADES, MATERIALS, TREE, STATS, AUTOMATION, VARIANTS } from './rename-map';

const id = (m: Record<string, string>, k: string): string => m[k] ?? k;
const remapKeys = (o: any, m: Record<string, string>): any => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
  const out: any = {};
  for (const [k, v] of Object.entries(o)) out[id(m, k)] = v;
  return out;
};
const rename = (o: any, from: string, to: string) => { if (o && from in o) { o[to] = o[from]; delete o[from]; } };
const ENEMY_OR_BOSS = { ...ENEMIES, ...BOSSES };

export function migrateV1toV2(raw: any): any {
  const s = raw;
  // currency and top-level fields
  rename(s, 'souls', 'marrow');
  rename(s, 'bossSouls', 'keepsakes'); s.keepsakes = remapKeys(s.keepsakes, BOSSES);
  rename(s, 'bossSoulChoices', 'keepsakeChoices'); s.keepsakeChoices = remapKeys(s.keepsakeChoices, BOSSES);
  s.materials = remapKeys(s.materials, MATERIALS);
  if (Array.isArray(s.spellsKnown)) s.spellsKnown = s.spellsKnown.map((k: string) => id(SPELLS, k));
  rename(s, 'bloodstain', 'remains');
  if (s.remains) { rename(s.remains, 'souls', 'marrow'); s.remains.zone = id(ZONES, s.remains.zone); }
  rename(s, 'corpseRun', 'remainsRun');
  if (s.remainsRun) s.remainsRun.zone = id(ZONES, s.remainsRun.zone);
  rename(s, 'bonfire', 'lantern'); s.lantern = id(ZONES, s.lantern);
  rename(s, 'bonfiresLit', 'lanternsLit'); if (Array.isArray(s.lanternsLit)) s.lanternsLit = s.lanternsLit.map((z: string) => id(ZONES, z));
  s.zones = remapKeys(s.zones, ZONES);
  if (Array.isArray(s.unlockedZones)) s.unlockedZones = s.unlockedZones.map((z: string) => id(ZONES, z));
  // player
  const p = s.player ?? {};
  p.stats = remapKeys(p.stats, STATS);
  rename(p, 'estus', 'draughts'); rename(p, 'estusMax', 'draughtsMax'); rename(p, 'estusPotency', 'draughtPotency');
  p.weapon = id(WEAPONS, p.weapon);
  if (p.weapons) { p.weapons = remapKeys(p.weapons, WEAPONS); for (const w of Object.values<any>(p.weapons)) w.id = id(WEAPONS, w.id); }
  rename(p, 'attuned', 'recited'); if (Array.isArray(p.recited)) p.recited = p.recited.map((k: string | null) => (k ? id(SPELLS, k) : k));
  rename(p, 'attunementSlots', 'recitationSlots');
  p.cooldowns = remapKeys(p.cooldowns, SPELLS);
  if (Array.isArray(p.buffs)) for (const b of p.buffs) if (typeof b.id === 'string' && b.id.startsWith('spell:')) b.id = 'spell:' + id(SPELLS, b.id.slice(6));
  rename(p, 'flameLevel', 'brandLevel');
  // encounter
  const e = s.encounter ?? {};
  e.zone = id(ZONES, e.zone);
  if (e.enemy) {
    const en = e.enemy;
    en.id = id(ENEMY_OR_BOSS, en.id);
    rename(en, 'souls', 'marrow'); rename(en, 'poise', 'composure'); rename(en, 'stagger', 'strain'); rename(en, 'riposte', 'reprisal');
    if (Array.isArray(en.variants)) en.variants = en.variants.map((v: string) => id(VARIANTS, v));
  }
  // cortege
  rename(s, 'squad', 'cortege');
  const c = s.cortege ?? {};
  rename(c, 'phantoms', 'shades');
  if (Array.isArray(c.shades)) for (const sh of c.shades) if (sh.weapon) sh.weapon = id(WEAPONS, sh.weapon);
  c.huntZone = id(ZONES, c.huntZone);
  c.matAcc = remapKeys(c.matAcc, MATERIALS);
  // creed
  rename(s, 'covenant', 'creed');
  const cr = s.creed ?? {};
  if (cr.current) cr.current = id(CREEDS, cr.current);
  cr.rep = remapKeys(cr.rep, CREEDS);
  cr.upgrades = remapKeys(cr.upgrades, CREED_UPGRADES);
  // prestige
  const pr = s.prestige ?? {};
  rename(pr, 'kindles', 'wakings'); rename(pr, 'humanity', 'vestige'); rename(pr, 'humanityTotal', 'vestigeTotal');
  pr.tree = remapKeys(pr.tree, TREE);
  rename(pr, 'sigils', 'severings'); rename(pr, 'sigilMarks', 'threads'); rename(pr, 'sigilUnlocks', 'severingUnlocks');
  pr.severingUnlocks = remapKeys(pr.severingUnlocks, { abyss: 'nadir' });
  rename(pr, 'darkLevel', 'unmaking'); rename(pr, 'darkEmbers', 'unmakingDust');
  rename(pr, 'abyssDepth', 'nadirDepth'); rename(pr, 'abyssRecord', 'nadirRecord');
  rename(pr, 'lastKindleGain', 'lastSnuffGain'); rename(pr, 'lastSigilGain', 'lastSeverGain');
  if (Array.isArray(pr.bossesEverKilled)) pr.bossesEverKilled = pr.bossesEverKilled.map((b: string) => id(BOSSES, b));
  if (Array.isArray(pr.cycleBossesSpawned)) pr.cycleBossesSpawned = pr.cycleBossesSpawned.map((b: string) => id(BOSSES, b));
  // automation
  s.automation = remapKeys(s.automation, AUTOMATION);
  if (s.automation?.autoLevelStat) s.automation.autoLevelStat = id(STATS, s.automation.autoLevelStat);
  if (Array.isArray(s.automation?.unlocked)) s.automation.unlocked = s.automation.unlocked.map((k: string) => id(AUTOMATION, k));
  // stats
  const st = s.stats ?? {};
  rename(st, 'soulsEarned', 'marrowEarned'); rename(st, 'soulsLost', 'marrowLost'); rename(st, 'cycleSouls', 'cycleMarrow'); rename(st, 'reprisals', 'reprisals');
  // flags
  if (s.flags) rename(s.flags, 'hasFlame', 'hasBrand');
  // offline report
  if (s.offline) { rename(s.offline, 'souls', 'marrow'); s.offline.zone = id(ZONES, s.offline.zone); s.offline.materials = remapKeys(s.offline.materials, MATERIALS); }
  return s;
}
