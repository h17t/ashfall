import { seeded } from '../seed';

/**
 * Noise tiles for materials, built once per page with a canvas and handed to CSS as data URIs.
 * Two tiles: film-fine grain and a broad mottle (blurred value noise) for stone and leather.
 * Nothing here runs on a frame; the browser caches the images.
 */
let grainUrl = '';
let mottleUrl = '';

function build() {
  if (grainUrl || typeof document === 'undefined') return;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) { grainUrl = mottleUrl = 'none'; return; }
  const r = seeded(0x5eed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 90 + Math.floor(r() * 120);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainUrl = `url(${c.toDataURL('image/png')})`;

  // mottle: 8px value-noise lattice, bilinear, tileable
  const cells = 8, n = size / cells;
  const lattice: number[] = [];
  for (let i = 0; i < n * n; i++) lattice.push(r());
  const at = (x: number, y: number) => lattice[((y + n) % n) * n + ((x + n) % n)];
  const img2 = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / cells, gy = y / cells, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const v = (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
    const g = 110 + Math.floor(v * 90);
    const i = (y * size + x) * 4;
    img2.data[i] = g; img2.data[i + 1] = g; img2.data[i + 2] = g; img2.data[i + 3] = 255;
  }
  ctx.putImageData(img2, 0, 0);
  mottleUrl = `url(${c.toDataURL('image/png')})`;
}

export function grainTile(): string { build(); return grainUrl; }
export function mottleTile(): string { build(); return mottleUrl; }
