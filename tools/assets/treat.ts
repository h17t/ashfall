/**
 * The unifying treatment chain (ART.md §3.1). Every raster passes through it:
 *  1. desaturate, re-tint through the house tone ramp
 *  2. crush blacks (lifted off pure), compress mids
 *  3. multiply paper grain + foxing
 *  4. etching hatch in the shadow ramp only
 *  5. edge erosion so nothing has a clean cut-out boundary
 *  6. export webp @2x and @1x, plus a pure-ink silhouette mask
 */
import sharp from 'sharp';
import { createNoise2D } from 'simplex-noise';
import { toneRamp, hex, PALETTE, type PaletteKey } from './palette';
import { rng } from './svg';

export interface TreatOptions {
  tint?: PaletteKey | null;
  tintStrength?: number;
  seed?: number;
  /** 0..1 amount of grain */
  grain?: number;
  /** erode alpha edges by this many px (2x space) */
  erode?: number;
  /** keep colour of glows (skip the ramp where saturation is high) */
  keepSaturated?: boolean;
}

export interface TreatResult {
  webp2x: Buffer;
  webp1x: Buffer;
  mask: Buffer; // png, ink on transparent
  width: number;
  height: number;
  luminanceLevels: number;
}

export async function treat(pngInput: Buffer, opts: TreatOptions = {}): Promise<TreatResult> {
  const seed = opts.seed ?? 1;
  const r = rng(seed);
  const noiseA = createNoise2D(r.next);
  const noiseB = createNoise2D(r.next);
  const { data, info } = await sharp(pngInput).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.alloc(w * h * 4);
  const mask = Buffer.alloc(w * h * 4);
  const grainAmt = opts.grain ?? 0.16;
  const erode = opts.erode ?? 2;
  const levels = new Set<number>();
  const inkC = hex(PALETTE.ink);
  // Auto-levels: stretch the plate's luminance so the darkest 2% sit near ink and the brightest
  // (non-light-source) 98% near bone. Without this every dark plate collapses into the ramp's toe.
  const hist = new Array<number>(256).fill(0);
  let count = 0;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const l = Math.round(0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]);
    hist[l]++; count++;
  }
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= count * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= count * 0.03) { hi = i; break; } }
  const span = Math.max(24, hi - lo);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
      if (A === 0) { out[i + 3] = 0; continue; }
      // luminance & saturation
      const l0 = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      // 2. levels, then crush + compress: lift blacks slightly, gentle S-curve on the mids
      const ln = Math.min(1, Math.max(0, (l0 * 255 - lo) / span)) * 0.88;
      let l = Math.pow(ln, 1.05);
      l = 0.03 + l * 0.97;
      l = l < 0.5 ? 1.6 * l * l + 0.2 * l : 1 - 1.6 * (1 - l) * (1 - l) - 0.2 * (1 - l);
      // 1. re-tint through the ramp; keep genuine light sources (saturated & bright) as they are
      let c: [number, number, number];
      if (opts.keepSaturated !== false && sat > 0.55 && l0 > 0.35) {
        c = [R, G, B];
      } else {
        c = toneRamp(Math.min(1, Math.max(0, l)), opts.tint ?? null, opts.tintStrength ?? 0.22);
      }
      // 3. paper grain + foxing (multiply)
      const g = 1 - grainAmt * (0.55 * (noiseA(x * 0.9, y * 0.9) * 0.5 + 0.5) + 0.45 * (noiseB(x * 0.018, y * 0.018) * 0.5 + 0.5));
      // 4. hatch in shadows: diagonal lines, stronger the darker the pixel
      const shadow = Math.max(0, 0.55 - l) / 0.55;
      const line = ((x + y * 0.6) % 4.2) < 1.2 ? 1 : 0;
      const hatch = 1 - shadow * line * 0.35;
      // 5. edge erosion: alpha reduced by noise near the boundary
      let a = A / 255;
      if (erode > 0) {
        let edge = 0;
        for (let dy = -erode; dy <= erode && !edge; dy += erode) for (let dx = -erode; dx <= erode; dx += erode) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || data[(yy * w + xx) * 4 + 3] < 40) { edge = 1; break; }
        }
        if (edge) {
          const n = noiseA(x * 0.25 + 40, y * 0.25 + 40) * 0.5 + 0.5;
          a *= n > 0.42 ? 1 : n * 0.6;
        }
      }
      const rr = Math.min(255, c[0] * g * hatch), gg = Math.min(255, c[1] * g * hatch), bb = Math.min(255, c[2] * g * hatch);
      out[i] = rr; out[i + 1] = gg; out[i + 2] = bb; out[i + 3] = Math.round(a * 255);
      levels.add(Math.round((0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 8));
      if (a > 0.3) { mask[i] = inkC[0]; mask[i + 1] = inkC[1]; mask[i + 2] = inkC[2]; mask[i + 3] = 255; }
    }
  }
  const base = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  const webp2x = await base.clone().webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  const webp1x = await base.clone().resize(Math.round(w / 2), Math.round(h / 2), { kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 88 }).toBuffer();
  const maskPng = await sharp(mask, { raw: { width: w, height: h, channels: 4 } }).resize(Math.round(w / 2), Math.round(h / 2)).png({ palette: true, colors: 4 }).toBuffer();
  return { webp2x, webp1x, mask: maskPng, width: w, height: h, luminanceLevels: levels.size };
}
