/**
 * The no-placeholder rule, enforced. Returns a list of failures; the vitest wrapper asserts [].
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ALL_ASSETS, MANIFEST } from '../../assets/manifest';
import { ENEMIES, BOSSES, SHADES, WEAPONS, SPELLS, CREEDS, MATERIALS, ZONES, BOONS, ARTS, AFFIXES, SETS, TOLL_PHASES } from '../../src/content';
import { PALETTE } from './palette';

const OUT = 'assets/generated';
const MIN_BYTES: Record<string, number> = { enemy: 6000, boss: 9000, shade: 6000, weapon: 2500, spell: 1200, creed: 1800, item: 900, region: 12000, ui: 1500, boon: 1000, art: 1000, affix: 800, set: 1600, toll: 2500 };
const MIN_LEVELS = 24;
const MIN_SPREAD = 6;

export async function auditAssets(): Promise<string[]> {
  const errs: string[] = [];
  // 1. every content entity has a manifest entry
  const need: [string, string[]][] = [['enemy', Object.keys(ENEMIES)], ['boss', Object.keys(BOSSES)], ['shade', Object.keys(SHADES)], ['weapon', Object.keys(WEAPONS)], ['spell', Object.keys(SPELLS)], ['creed', Object.keys(CREEDS)], ['item', Object.keys(MATERIALS)], ['region', [...Object.keys(ZONES), 'stair']], ['boon', Object.keys(BOONS)], ['art', Object.values(ARTS).map((a) => a.id)], ['affix', Object.keys(AFFIXES)], ['set', Object.keys(SETS)], ['toll', TOLL_PHASES.map((p) => p.id)]];
  for (const [kind, ids] of need) for (const id of ids) if (!MANIFEST[`${kind}:${id}`]) errs.push(`no manifest entry for ${kind}:${id}`);
  // 2. every manifest entry has files; files are illustrations, not fills
  for (const e of ALL_ASSETS) {
    const paths = e.kind === 'region' ? e.layers! : [e.files.x2, e.files.x1];
    // icon crops only need to exist; they are judged on the sheet, not by size
    if (e.files.icon && !fs.existsSync(path.join(OUT, e.files.icon))) errs.push(`${e.files.icon} is missing`);
    for (const p of paths) {
      const fp = path.join(OUT, p);
      if (!fs.existsSync(fp)) { errs.push(`missing file ${p}`); continue; }
      const size = fs.statSync(fp).size;
      const min = (MIN_BYTES[e.kind] ?? 1000) * (p.includes('@2x') ? 1 : 0.35);
      if (size < min) errs.push(`${p} is ${size} bytes (< ${min}): too small to be an illustration`);
      if (p.includes('@2x')) {
        const { data, info } = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        // Flatness: a painted plate has many distinct tones and a real spread; a flat fill has one tone
        // (or a gradient of a handful) and almost no spread. Dark plates are allowed to be dark: the
        // levels are counted at 2/255 steps and the spread is a standard deviation, not a range.
        const levels = new Set<number>();
        let opaque = 0, sum = 0, sum2 = 0;
        for (let i = 0; i < info.width * info.height; i++) {
          if (data[i * 4 + 3] < 64) continue;
          opaque++;
          const l = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
          levels.add(Math.round(l / 2));
          sum += l; sum2 += l * l;
        }
        const sd = opaque ? Math.sqrt(Math.max(0, sum2 / opaque - (sum / opaque) ** 2)) : 0;
        if (opaque === 0) errs.push(`${p} is fully transparent`);
        else if (levels.size < MIN_LEVELS) errs.push(`${p} has only ${levels.size} luminance levels: a flat shape masquerading as illustration`);
        else if (sd < MIN_SPREAD) errs.push(`${p} has a luminance spread of ${sd.toFixed(1)}: a flat fill, not a painting`);
      }
    }
  }
  return errs;
}

// `placeholder=` is an HTML input attribute, not placeholder text
const TEXT_BAN = /\b(lorem|placeholder(?!=)|TODO|TBD|coming soon|FIXME)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2934}\u{2935}\u{25AA}-\u{25FE}]/u;

/** Source-level rules over src/ui, src/render, src/vfx: no banned words, no emoji, no colour literals off the palette. */
export function auditSource(): string[] {
  const errs: string[] = [];
  const allowed = new Set(Object.values(PALETTE).map((h) => h.toLowerCase()));
  const walk = (dir: string): string[] => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]) : [];
  const files = [...walk('src/ui'), ...walk('src/render'), ...walk('src/vfx')].filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts'));
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      const where = `${f}:${i + 1}`;
      if (TEXT_BAN.test(line) && !line.trim().startsWith('//') && !line.includes('audit')) errs.push(`${where}: banned text: ${line.trim().slice(0, 80)}`);
      if (EMOJI.test(line)) errs.push(`${where}: emoji in UI: ${line.trim().slice(0, 80)}`);
      for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) {
        const lit = m[0].toLowerCase();
        if (f.endsWith('tokens.css')) continue; // the one place literals are defined
        if (lit.startsWith('#') && allowed.has(lit)) continue;
        errs.push(`${where}: colour literal off the palette: ${m[0]}`);
      }
    });
  }
  // the shipped content: lore and names
  const content = [...Object.values(ENEMIES), ...Object.values(BOSSES), ...Object.values(WEAPONS), ...Object.values(SPELLS), ...Object.values(SHADES), ...Object.values(CREEDS), ...Object.values(MATERIALS), ...Object.values(ZONES)];
  for (const c of content) { const t = `${(c as any).name} ${(c as any).lore ?? ''} ${(c as any).desc ?? ''}`; if (TEXT_BAN.test(t)) errs.push(`content ${(c as any).id}: banned text`); }
  return errs;
}
