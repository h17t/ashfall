/**
 * Manifest-driven asset build. For each procedural entry: build the plate, rasterise at 2x,
 * run the treatment chain, write @2x/@1x/mask. Cached by a hash of the recipe source and seed,
 * so unchanged assets are never regenerated. Usage: npm run art [-- --only enemy:ashRat --shove]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { ALL_ASSETS, type AssetEntry } from '../../assets/manifest';
import { composePlate, type Plate } from './compose';
import { findSubject } from './subjects';
import { weaponPlate } from './weapons';
import { spellPlate, covenantPlate, itemPlate, uiPlate, boonPlate, artPlate, affixPlate, setPlate, tollPlate } from './icons';
import { regionLayers } from './regions';
import { treat } from './treat';

const OUT = 'assets/generated';
const CACHE = path.join(OUT, '.cache.json');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const shove = args.includes('--shove');

// recipe hash: every source file in tools/assets participates, so a tweak to a rig rebuilds
const recipeHash = crypto.createHash('sha1');
for (const f of fs.readdirSync('tools/assets').filter((f) => f.endsWith('.ts') && !f.startsWith('bible') && f !== 'generate.ts' && f !== 'audit.ts' && f !== 'try.ts').sort()) recipeHash.update(fs.readFileSync(path.join('tools/assets', f)));
const RECIPE = recipeHash.digest('hex').slice(0, 12);

const cache: Record<string, string> = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

function plateFor(e: AssetEntry): Plate | null {
  switch (e.kind) {
    case 'enemy': case 'boss': case 'shade': return findSubject(e.id)?.build(e.seed) ?? null;
    case 'weapon': return weaponPlate(e.id, e.seed);
    case 'spell': return spellPlate(e.id, e.seed);
    case 'creed': return covenantPlate(e.id, e.seed);
    case 'item': return itemPlate(e.id, e.seed);
    case 'ui': return uiPlate(e.id, e.seed);
    case 'boon': return boonPlate(e.id, e.seed);
    case 'art': return artPlate(e.id, e.seed);
    case 'affix': return affixPlate(e.id, e.seed);
    case 'set': return setPlate(e.id, e.seed);
    case 'toll': return tollPlate(e.id, e.seed);
    default: return null;
  }
}

async function buildOne(e: AssetEntry): Promise<'built' | 'cached' | 'skipped'> {
  if (e.source === 'authored') return 'skipped';
  const key = `${e.kind}:${e.id}`;
  const stamp = `${RECIPE}:${e.seed}:${e.w}x${e.h}`;
  const dir = path.join(OUT, 'art', e.kind);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(OUT, e.files.x2);
  if (!shove && cache[key] === stamp && fs.existsSync(target)) return 'cached';
  if (e.kind === 'region') {
    const svgs = regionLayers(e.id, e.seed);
    for (let i = 0; i < svgs.length; i++) {
      const png = new Resvg(svgs[i], { fitTo: { mode: 'width', value: e.w * 2 } }).render().asPng();
      // regions get grain but no tinting/erosion: the sky must stay a gradient and layers must tile cleanly
      const t = await treat(png, { seed: e.seed + i, tint: null, erode: 0, grain: 0.09, keepSaturated: true, levels: false, hatch: false, tone: false });
      fs.writeFileSync(path.join(OUT, `/art/region/${e.id}.L${i}@2x.webp`), t.webp2x);
      fs.writeFileSync(path.join(OUT, `/art/region/${e.id}.L${i}.webp`), t.webp1x);
    }
  } else {
    const plate = plateFor(e);
    if (!plate) throw new Error(`no plate builder for ${key}`);
    const svg = composePlate(plate);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: e.w * 2 } }).render().asPng();
    const t = await treat(png, { seed: e.seed, tint: plate.tint ?? null, erode: e.kind === 'spell' || e.kind === 'item' || e.kind === 'boon' || e.kind === 'art' || e.kind === 'affix' ? 1 : 2 });
    fs.writeFileSync(target, t.webp2x);
    fs.writeFileSync(path.join(OUT, e.files.x1), t.webp1x);
    if (e.files.mask) fs.writeFileSync(path.join(OUT, e.files.mask), t.mask);
    if (e.files.icon) {
      // icon: trim to the drawn bounds, lift the midtones so dark steel reads at 32px, 64px square
      const icon = await sharp(t.webp2x).trim({ threshold: 20 }).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).modulate({ brightness: 1.45, saturation: 1.15 }).webp({ quality: 88 }).toBuffer();
      fs.writeFileSync(path.join(OUT, e.files.icon), icon);
    }
  }
  cache[key] = stamp;
  return 'built';
}

async function main() {
  const list = ALL_ASSETS.filter((e) => !only || `${e.kind}:${e.id}` === only || e.kind === only);
  let built = 0, cached = 0;
  const t0 = Date.now();
  for (const e of list) {
    process.stdout.write(`\r${built + cached + 1}/${list.length} ${e.kind}:${e.id}          `);
    const r = await buildOne(e);
    if (r === 'built') built++; else if (r === 'cached') cached++;
    if (r === 'built') fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); // survive a native crash
  }
  const total = fs.readdirSync(path.join(OUT, 'art'), { recursive: true }).filter((f) => String(f).endsWith('.webp')).reduce((s, f) => s + fs.statSync(path.join(OUT, 'art', String(f))).size, 0);
  console.log(`\nbuilt ${built}, cached ${cached}, ${(Date.now() - t0) / 1000}s, payload ${(total / 1024 / 1024).toFixed(2)} MB`);
  void sharp;
}
main();
