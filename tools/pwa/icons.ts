/**
 * PWA icons and splash art from the Lantern plate: every required size, maskable variants with
 * safe-zone padding, and portrait splash screens for the common phone classes. Output is
 * committed under assets/generated/pwa (Vite's public dir), like every other built asset.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('assets/generated/pwa');
const PLATE = path.resolve('assets/generated/art/ui/lantern@2x.webp');
const VOID = { r: 10, g: 9, b: 8, alpha: 1 };

async function icon(size: number, maskable: boolean): Promise<Buffer> {
  const pad = maskable ? Math.round(size * 0.2) : Math.round(size * 0.08);
  const inner = size - pad * 2;
  const plate = await sharp(PLATE).trim({ threshold: 12 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const glow = Buffer.from(`<svg width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#C8560F" stop-opacity="0.55"/><stop offset="1" stop-color="#C8560F" stop-opacity="0"/></radialGradient></defs><rect width="${size}" height="${size}" fill="#0A0908"/><rect width="${size}" height="${size}" fill="url(#g)"/></svg>`);
  return sharp(glow).composite([{ input: plate, left: pad, top: pad }]).png().toBuffer();
}

async function splash(w: number, h: number): Promise<Buffer> {
  const size = Math.round(Math.min(w, h) * 0.42);
  const plate = await sharp(PLATE).trim({ threshold: 12 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const bg = Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="g" cx="50%" cy="58%" r="45%"><stop offset="0" stop-color="#C8560F" stop-opacity="0.45"/><stop offset="1" stop-color="#C8560F" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#0A0908"/><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="${Math.round(h * 0.58 + size * 0.62)}" text-anchor="middle" font-family="serif" font-size="${Math.round(size * 0.18)}" letter-spacing="${Math.round(size * 0.05)}" fill="#E8DCC4">MOURNWAKE</text></svg>`);
  return sharp(bg).composite([{ input: plate, left: Math.round((w - size) / 2), top: Math.round(h * 0.58 - size * 0.5) }]).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512]) fs.writeFileSync(path.join(OUT, `icon-${s}.png`), await icon(s, false));
  for (const s of [192, 512]) fs.writeFileSync(path.join(OUT, `maskable-${s}.png`), await icon(s, true));
  const splashes: [number, number][] = [[750, 1334], [1170, 2532], [1284, 2778], [1080, 2400], [1668, 2388]];
  for (const [w, h] of splashes) fs.writeFileSync(path.join(OUT, `splash-${w}x${h}.png`), await splash(w, h));
  const total = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`pwa icons: ${fs.readdirSync(OUT).length} files, ${(total / 1024).toFixed(0)} KB`);
}
main();
