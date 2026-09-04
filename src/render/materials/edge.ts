import { seeded } from '../seed';

/**
 * An irregular outline for a panel: a chipped stone edge or a torn sheet, as a CSS polygon in px.
 * Deterministic per (seed, size). Never a border-radius.
 */
export type EdgeStyle = 'chipped' | 'torn' | 'cut';

export function edgePolygon(w: number, h: number, seed: number, rough: number, style: EdgeStyle, inset = 0): string {
  const r = seeded(seed);
  const step = style === 'torn' ? 9 : 16;
  const pts: [number, number][] = [];
  // three seeded sine phases give a slow wander; per-point jitter gives the chips
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const fr = [0.011 + r() * 0.01, 0.031 + r() * 0.02, 0.07 + r() * 0.05];
  const wander = (t: number) => Math.sin(t * fr[0] + ph[0]) * 0.55 + Math.sin(t * fr[1] + ph[1]) * 0.3 + Math.sin(t * fr[2] + ph[2]) * 0.15;
  const jitter = () => (style === 'torn' ? (r() - 0.5) * 1.2 : r() < 0.12 ? (r() - 0.5) * 1.8 : (r() - 0.5) * 0.35);
  const chip = (t: number) => (rough * (wander(t) * 0.7 + jitter())) - inset;
  const perim = 2 * (w + h);
  let t = 0;
  // corners get a bite so no slab is a true rectangle
  const bite = () => (style === 'cut' ? 2 : 4 + r() * rough * 1.4);
  const b = [bite(), bite(), bite(), bite()];
  // top edge, left → right
  pts.push([b[0], b[0] * 0.6]);
  for (let x = step; x < w - step; x += step, t += step) pts.push([x, Math.max(0, chip(t))]);
  pts.push([w - b[1] * 0.6, b[1]]);
  t = w;
  for (let y = step; y < h - step; y += step, t += step) pts.push([w - Math.max(0, chip(t)), y]);
  pts.push([w - b[2], h - b[2] * 0.6]);
  t = w + h;
  for (let x = w - step; x > step; x -= step, t += step) pts.push([x, h - Math.max(0, chip(t))]);
  pts.push([b[3] * 0.6, h - b[3]]);
  t = 2 * w + h;
  for (let y = h - step; y > step; y -= step, t += step) pts.push([Math.max(0, chip(t)), y]);
  void perim;
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
}
