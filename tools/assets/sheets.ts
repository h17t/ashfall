/** Contact sheets for review: art/sheet-<kind>.png, on stone and on parchment. */
import fs from 'node:fs';
import sharp, { type OverlayOptions } from 'sharp';
import { ALL_ASSETS } from '../../assets/manifest';

async function sheet(kinds: string[], out: string, cellW: number, cellH: number, cols: number, bg: string) {
  const items = ALL_ASSETS.filter((e) => kinds.includes(e.kind));
  const rows = Math.ceil(items.length / cols);
  const comps: OverlayOptions[] = [];
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    const src = 'assets/generated' + (e.kind === 'region' ? e.layers![1] : e.files.x2);
    const img = await sharp(src).resize({ width: cellW - 16, height: cellH - 30, fit: 'inside' }).toBuffer();
    const meta = await sharp(img).metadata();
    const x = (i % cols) * cellW + Math.round((cellW - (meta.width ?? 0)) / 2), y = Math.floor(i / cols) * cellH + Math.round((cellH - 24 - (meta.height ?? 0)) / 2);
    comps.push({ input: img, left: x, top: y });
    const label = Buffer.from(`<svg width="${cellW}" height="22"><text x="${cellW / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${bg === '#E8DCC4' ? '#4A423C' : '#C8BBA6'}">${e.id}</text></svg>`);
    comps.push({ input: label, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH + cellH - 24 });
  }
  await sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 4, background: bg } }).composite(comps).png().toFile(out);
  console.log('wrote', out);
}
fs.mkdirSync('art', { recursive: true });
await sheet(['enemy', 'shade'], 'art/sheet-enemies.png', 200, 270, 9, '#241E1A');
await sheet(['enemy', 'shade'], 'art/sheet-enemies-parchment.png', 200, 270, 9, '#E8DCC4');
await sheet(['boss'], 'art/sheet-bosses.png', 260, 330, 6, '#241E1A');
await sheet(['weapon'], 'art/sheet-weapons.png', 180, 200, 8, '#241E1A');
await sheet(['spell', 'creed', 'item', 'ui'], 'art/sheet-icons.png', 140, 160, 10, '#241E1A');
await sheet(['boon', 'art', 'affix', 'set', 'toll'], 'art/sheet-pass3.png', 140, 160, 10, '#241E1A');
