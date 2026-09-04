/**
 * The asset manifest. Every image the game shows is referenced through here — never by path.
 * One entry per asset: dimensions, anchor, and where it came from. Flipping `source` to
 * 'authored' and dropping a file in is the only change needed to replace procedural art.
 */
import { ENEMIES, BOSSES, PHANTOMS, WEAPONS, SPELLS, COVENANTS, MATERIALS, ZONES, ZONE_ORDER } from '../src/content';

export type AssetKind = 'enemy' | 'boss' | 'phantom' | 'weapon' | 'spell' | 'covenant' | 'item' | 'region' | 'ui';
export type AssetSource = 'generated' | 'procedural' | 'authored';

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  /** logical (1x) size in px */
  w: number;
  h: number;
  /** anchor in unit coordinates (where the feet / hilt / centre sit) */
  anchor: { x: number; y: number };
  source: AssetSource;
  /** file paths relative to the served root */
  files: { x2: string; x1: string; mask?: string };
  /** region plates carry four parallax layers */
  layers?: string[];
  /** the seed the procedural build used (for reproducibility) */
  seed: number;
}

const seedOf = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h % 1000003; };
const files = (kind: string, id: string) => ({ x2: `/art/${kind}/${id}@2x.webp`, x1: `/art/${kind}/${id}.webp`, mask: `/art/${kind}/${id}.mask.png` });

function entry(kind: AssetKind, id: string, w: number, h: number, anchor: { x: number; y: number }, extra: Partial<AssetEntry> = {}): AssetEntry {
  return { id, kind, w, h, anchor, source: 'procedural', files: files(kind, id), seed: seedOf(kind + ':' + id), ...extra };
}

export const MANIFEST: Record<string, AssetEntry> = {};
const put = (e: AssetEntry) => { MANIFEST[`${e.kind}:${e.id}`] = e; };

for (const id of Object.keys(ENEMIES)) put(entry('enemy', id, 256, 320, { x: 0.5, y: 0.93 }));
for (const id of Object.keys(BOSSES)) put(entry('boss', id, 384, 448, { x: 0.5, y: 0.93 }));
for (const id of Object.keys(PHANTOMS)) put(entry('phantom', id, 256, 320, { x: 0.5, y: 0.93 }));
for (const id of Object.keys(WEAPONS)) put(entry('weapon', id, 160, 160, { x: 0.5, y: 0.5 }));
for (const id of Object.keys(SPELLS)) put(entry('spell', id, 96, 96, { x: 0.5, y: 0.5 }));
for (const id of Object.keys(COVENANTS)) put(entry('covenant', id, 128, 128, { x: 0.5, y: 0.5 }));
for (const id of Object.keys(MATERIALS)) put(entry('item', id, 96, 96, { x: 0.5, y: 0.5 }));
for (const id of ZONE_ORDER) {
  void ZONES[id];
  put(entry('region', id, 1600, 900, { x: 0.5, y: 1 }, { layers: [0, 1, 2, 3].map((i) => `/art/region/${id}.L${i}@2x.webp`), files: { x2: `/art/region/${id}.L0@2x.webp`, x1: `/art/region/${id}.L0.webp` } }));
}
// UI materials: tileable grain, foxing, hatch, slab edges are SVG at runtime; the bonfire plate is an asset.
put(entry('ui', 'bonfire', 320, 240, { x: 0.5, y: 0.9 }));
put(entry('ui', 'bloodstain', 128, 64, { x: 0.5, y: 0.5 }));
put(entry('ui', 'emberTender', 256, 320, { x: 0.5, y: 0.93 }));

export function asset(kind: AssetKind, id: string): AssetEntry {
  const e = MANIFEST[`${kind}:${id}`];
  if (!e) throw new Error(`No asset for ${kind}:${id}`);
  return e;
}
export function assetUrl(kind: AssetKind, id: string, scale: 1 | 2 = 2): string {
  const e = asset(kind, id);
  return scale === 2 ? e.files.x2 : e.files.x1;
}
export const ALL_ASSETS = Object.values(MANIFEST);

export function hasAsset(kind: AssetKind, id: string): boolean {
  return `${kind}:${id}` in MANIFEST;
}
