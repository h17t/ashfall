/**
 * SVG toolkit for procedural illustration: seeded randomness, rough/ink paths, and the filter
 * chains that do the artistic work (ink bleed, broken etched edges, wash pooling, paper tooth).
 */
import { createNoise2D } from 'simplex-noise';

export type Pt = [number, number];

/** mulberry32, so every asset is reproducible from its seed. */
export function rng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a: number, b: number) => a + (b - a) * next(),
    int: (a: number, b: number) => Math.floor(a + (b - a + 1) * next()),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}
export type Rng = ReturnType<typeof rng>;

export function noise2d(seed: number) {
  const r = rng(seed);
  return createNoise2D(r.next);
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Closed smooth path through points (Catmull-Rom → cubic Béziers). */
export function smoothClosed(pts: Pt[], tension = 0.5): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
}

/** Open smooth path. */
export function smoothOpen(pts: Pt[], tension = 0.5): string {
  const n = pts.length;
  if (n < 2) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Jitter every point of a polygon by up to `amt`, seeded. Broken, hand-drawn outlines. */
export function jitter(pts: Pt[], r: Rng, amt: number): Pt[] {
  return pts.map(([x, y]) => [x + r.range(-amt, amt), y + r.range(-amt, amt)]);
}

/** Resample a polygon so it has ~n points (more points = more wobble to work with). */
export function resample(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  const total = pts.length;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * total;
    const a = pts[Math.floor(t) % total], b = pts[(Math.floor(t) + 1) % total];
    const u = t - Math.floor(t);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}

/** A blob: an ellipse deformed by low-frequency noise. The workhorse for organic mass. */
export function blob(cx: number, cy: number, rx: number, ry: number, r: Rng, rough = 0.18, n = 18, rot = 0): Pt[] {
  const noise = createNoise2D(r.next);
  const phase = r.range(0, 100);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = 1 + noise(Math.cos(a) * 1.3 + phase, Math.sin(a) * 1.3) * rough;
    const x = Math.cos(a) * rx * d, y = Math.sin(a) * ry * d;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

/** Tapered stroke as a filled polygon between two points (limbs, blades, cloth strips). */
export function taper(a: Pt, b: Pt, w0: number, w1: number, r: Rng, wobble = 0.5, segs = 6): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = (w0 + (w1 - w0) * t) / 2;
    const px = a[0] + dx * t + r.range(-wobble, wobble), py = a[1] + dy * t + r.range(-wobble, wobble);
    left.push([px + nx * w, py + ny * w]);
    right.push([px - nx * w, py - ny * w]);
  }
  return [...left, ...right.reverse()];
}

export function polyPath(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
}

export function rotate(pts: Pt[], cx: number, cy: number, ang: number): Pt[] {
  const c = Math.cos(ang), s = Math.sin(ang);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
export function translate(pts: Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}
export function scale(pts: Pt[], cx: number, cy: number, sx: number, sy = sx): Pt[] {
  return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
}
export function mirrorX(pts: Pt[], cx: number): Pt[] {
  return pts.map(([x, y]) => [cx * 2 - x, y] as Pt).reverse();
}

// ---------------------------------------------------------------------------
// Filters. These are the brushes.
// ---------------------------------------------------------------------------

/** Broken etched edge + ink bleed: turbulence-displaced, slightly eroded. */
export function inkFilter(id: string, seed: number, amount = 3.5, freq = 0.035): string {
  return `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${amount}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feMorphology in="d" operator="erode" radius="0.35" result="e"/>
    <feGaussianBlur in="e" stdDeviation="0.35"/>
  </filter>`;
}

/** Wash pooling: blur the mass, then multiply back so ink gathers in the concavities. */
export function washFilter(id: string, seed: number, spread = 6): string {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${spread}" result="b"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="b" in2="n" scale="${spread * 2}" xChannelSelector="R" yChannelSelector="G" result="db"/>
    <feComposite in="db" in2="SourceAlpha" operator="in" result="pool"/>
    <feColorMatrix in="pool" type="matrix" values="0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 0 0.02  0 0 0 0.9 0" result="dark"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dark"/></feMerge>
  </filter>`;
}

/** Paper tooth and foxing as an overlay layer (use on a full-canvas rect). */
export function paperFilter(id: string, seed: number): string {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" result="fine"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="${seed + 7}" result="fox"/>
    <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.35 0" result="grain"/>
    <feColorMatrix in="fox" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0.5 0" result="stain"/>
    <feBlend in="grain" in2="stain" mode="multiply"/>
  </filter>`;
}

/** Etching hatch pattern, to be clipped to the shadow ramp. */
export function hatchPattern(id: string, spacing = 3, angle = -35, color = '#14100E', width = 0.9): string {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}" patternTransform="rotate(${angle})">
    <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${width}" stroke-linecap="butt"/>
  </pattern>`;
}

/** A rim-light gradient from the fire side (bottom-left by default). */
export function fireGradient(id: string, hot: string, warm: string, x = 0.15, y = 1.05, r = 0.9): string {
  return `<radialGradient id="${id}" cx="${x}" cy="${y}" r="${r}" gradientUnits="objectBoundingBox">
    <stop offset="0" stop-color="${hot}" stop-opacity="0.95"/>
    <stop offset="0.35" stop-color="${warm}" stop-opacity="0.55"/>
    <stop offset="0.75" stop-color="${warm}" stop-opacity="0.08"/>
    <stop offset="1" stop-color="${warm}" stop-opacity="0"/>
  </radialGradient>`;
}

export function svgDoc(w: number, h: number, defs: string, body: string, bg = 'none'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>${defs}</defs>
${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}
${body}
</svg>`;
}
