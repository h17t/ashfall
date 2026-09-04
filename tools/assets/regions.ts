/**
 * Region plates: four parallax layers each (far void/sky, mid architecture, near silhouettes,
 * foreground occluders), 1600×900 logical, rendered as ink silhouettes with atmospheric fade.
 * The layers are transparent so the runtime scene can drift and fog them independently.
 */
import { rng, blob, taper, jitter, smoothClosed, polyPath, svgDoc, inkFilter, paperFilter, type Pt, type Rng } from './svg';
import { PALETTE, type PaletteKey } from './palette';

export const RW = 1600, RH = 900;

interface RegionStyle { tint: PaletteKey; sky: string; mid: (r: Rng) => string[]; near: (r: Rng) => string[]; fore: (r: Rng) => string[]; glow?: { x: number; y: number; r: number; color: PaletteKey }[] }

const f = (n: number) => n.toFixed(1);
const path = (pts: Pt[], smooth = false) => (smooth ? smoothClosed(pts, 0.5) : polyPath(pts));

// ---- shape helpers for landscapes ----
function ground(r: Rng, y: number, rough = 30, n = 30): Pt[] {
  // a ridge line: three octaves of seeded sine (the slow swell, the hills, the scree) plus a little grit,
  // sampled densely so the outline rolls instead of sawing
  const ph = [r.range(0, 6.28), r.range(0, 6.28), r.range(0, 6.28)];
  const fr = [r.range(0.8, 1.4), r.range(2.5, 4), r.range(7, 11)];
  const pts: Pt[] = [[-40, RH + 40]];
  const m = Math.max(n * 3, 90);
  for (let i = 0; i <= m; i++) {
    const t = i / m;
    const swell = Math.sin(t * fr[0] * Math.PI * 2 + ph[0]) * 0.55 + Math.sin(t * fr[1] * Math.PI * 2 + ph[1]) * 0.3 + Math.sin(t * fr[2] * Math.PI * 2 + ph[2]) * 0.15;
    pts.push([-40 + t * (RW + 80), y + swell * rough + r.range(-rough * 0.08, rough * 0.08)]);
  }
  pts.push([RW + 40, RH + 40]);
  return pts;
}
function ruin(r: Rng, x: number, w: number, h: number, base = RH): Pt[] {
  // a broken wall with a jagged top and a missing chunk
  const pts: Pt[] = [[x, base], [x, base - h * r.range(0.5, 1)]];
  const n = Math.max(3, Math.round(w / 40));
  for (let i = 1; i < n; i++) pts.push([x + (i / n) * w, base - h * r.range(0.35, 1)]);
  pts.push([x + w, base - h * r.range(0.4, 0.9)], [x + w, base]);
  return pts;
}
function spire(r: Rng, x: number, w: number, h: number, base = RH): Pt[] {
  return jitter([[x - w / 2, base], [x - w * 0.3, base - h * 0.7], [x, base - h], [x + w * 0.3, base - h * 0.7], [x + w / 2, base]], r, 4);
}
function arch(x: number, w: number, h: number, base = RH): string {
  return `M${x} ${base} L${x} ${base - h * 0.6} Q${x + w / 2} ${base - h * 1.15} ${x + w} ${base - h * 0.6} L${x + w} ${base} Z`;
}
function tree(r: Rng, x: number, h: number, base = RH): string[] {
  // a dead tree: a leaning trunk that thins to a split crown, limbs that fork once, a few twigs
  const lean = r.range(-0.12, 0.12) * h;
  const top: Pt = [x + lean, base - h];
  const out: string[] = [path(taper([x, base], top, 16 + h * 0.02, 3, r, 2.5, 8))];
  const limbs = 3 + r.int(0, 3);
  for (let i = 0; i < limbs; i++) {
    const f = r.range(0.35, 0.92);
    const from: Pt = [x + lean * f, base - h * f];
    const dir = r.sign();
    const len = r.range(40, 110) * (1 - f * 0.5);
    const to: Pt = [from[0] + dir * len, from[1] - r.range(0.2, 0.8) * len];
    out.push(path(taper(from, to, 7, 1.5, r, 2, 5)));
    // a fork and a twig off the limb
    const mid: Pt = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    out.push(path(taper(mid, [mid[0] + dir * r.range(15, 45), mid[1] - r.range(20, 55)], 4, 1, r, 1.5, 4)));
    out.push(path(taper(to, [to[0] + dir * r.range(8, 30), to[1] - r.range(5, 30)], 3, 0.8, r, 1, 3)));
  }
  // the split crown
  out.push(path(taper(top, [top[0] - r.range(10, 40), top[1] - r.range(20, 50)], 4, 1, r, 1.5, 4)));
  out.push(path(taper(top, [top[0] + r.range(10, 40), top[1] - r.range(15, 45)], 4, 1, r, 1.5, 4)));
  return out;
}
function reeds(r: Rng, x0: number, x1: number, base: number, h: number): string[] {
  const out: string[] = [];
  for (let x = x0; x < x1; x += r.range(6, 14)) out.push(path(taper([x, base], [x + r.range(-8, 8), base - h * r.range(0.5, 1)], 3, 0.8, r, 1, 3)));
  return out;
}
function shelf(r: Rng, x: number, y: number, w: number, h: number): string[] {
  const out: string[] = [path(jitter([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, 2))];
  for (let i = 0; i < 6; i++) { const yy = y + (i + 1) * (h / 7); out.push(`M${x} ${f(yy)} L${x + w} ${f(yy + r.range(-2, 2))}`); }
  return out;
}
function stair(r: Rng, x: number, y: number, steps: number, w: number, dir = 1): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) out.push(path(jitter([[x + dir * i * w * 0.5, y + i * 22], [x + dir * i * w * 0.5 + dir * w, y + i * 22], [x + dir * i * w * 0.5 + dir * w, y + i * 22 + 22], [x + dir * i * w * 0.5, y + i * 22 + 22]], r, 1)));
  return out;
}

const STYLES: Record<string, RegionStyle> = {
  approach: {
    tint: 'ember', sky: 'ash',
    mid: (r) => [path(ground(r, 560, 40)), path(spire(r, 1180, 140, 420)), path(ruin(r, 1080, 260, 180)), path(spire(r, 300, 90, 260)), path(ruin(r, 60, 300, 120))],
    near: (r) => [path(ground(r, 700, 24)), ...[220, 520, 900, 1300].flatMap((x) => tree(r, x, r.range(220, 360), 720)), path(ruin(r, 1350, 220, 260, 740))],
    fore: (r) => [path(ground(r, 820, 18)), ...reeds(r, 0, 500, 840, 90), path(ruin(r, -40, 240, 420, 900))],
    glow: [{ x: 1250, y: 150, r: 180, color: 'ember' }],
  },
  mire: {
    tint: 'verdigris', sky: 'ash',
    mid: (r) => [path(ground(r, 600, 20)), ...[200, 700, 1250].flatMap((x) => tree(r, x, r.range(300, 460), 620)), path(ruin(r, 900, 200, 240, 620)), arch(940, 120, 200, 620)],
    near: (r) => [path(ground(r, 740, 12)), ...reeds(r, 0, RW, 760, 140), ...[420, 1100].flatMap((x) => tree(r, x, r.range(260, 380), 760))],
    fore: (r) => [path(ground(r, 850, 8)), ...reeds(r, 0, RW, 880, 200), path(blob(300, 880, 120, 20, r, 0.3, 14)), path(blob(1200, 890, 160, 24, r, 0.3, 14))],
    glow: [{ x: 500, y: 620, r: 120, color: 'verdigris' }, { x: 1150, y: 700, r: 80, color: 'verdigris' }],
  },
  archive: {
    tint: 'soul', sky: 'ink',
    mid: (r) => [path(ground(r, 640, 6)), ...shelf(r, 80, 100, 220, 540), ...shelf(r, 380, 60, 200, 580), ...shelf(r, 1000, 120, 240, 520), ...shelf(r, 1300, 40, 260, 600), arch(640, 300, 480, 640)],
    near: (r) => [path(ground(r, 760, 4)), ...shelf(r, -40, 200, 300, 560), ...shelf(r, 1250, 260, 400, 500), ...stair(r, 560, 620, 6, 120, 1)],
    fore: (r) => [path(ground(r, 860, 3)), ...shelf(r, -80, 300, 380, 600), path(blob(700, 880, 200, 30, r, 0.2, 14)), path(blob(1450, 860, 120, 40, r, 0.3, 12))],
    glow: [{ x: 790, y: 360, r: 160, color: 'soul' }],
  },
  sanctum: {
    tint: 'gold', sky: 'stone',
    mid: (r) => [path(ground(r, 580, 10)), path(spire(r, 800, 200, 640)), path(spire(r, 640, 90, 420)), path(spire(r, 960, 90, 440)), arch(700, 200, 380, 580), arch(400, 140, 300, 580), arch(1100, 140, 300, 580), path(spire(r, 200, 120, 380)), path(spire(r, 1400, 120, 400))],
    near: (r) => [path(ground(r, 720, 6)), ...stair(r, 500, 560, 8, 160, 1), ...stair(r, 1100, 560, 8, 160, -1), path(ruin(r, 40, 260, 400, 740)), path(ruin(r, 1300, 300, 420, 740))],
    fore: (r) => [path(ground(r, 850, 4)), path(ruin(r, -60, 300, 520, 900)), path(ruin(r, 1350, 320, 480, 900))],
    glow: [{ x: 800, y: 260, r: 220, color: 'gold' }],
  },
  deep: {
    tint: 'soul', sky: 'void',
    mid: (r) => [path(ground(r, 520, 60, 40)), ...stair(r, 700, 300, 14, 90, 1), path(blob(300, 520, 260, 90, r, 0.35, 20)), path(blob(1300, 500, 300, 110, r, 0.35, 20))],
    near: (r) => [path(ground(r, 700, 40, 40)), path(blob(200, 700, 220, 120, r, 0.4, 20)), path(blob(1400, 720, 260, 140, r, 0.4, 20)), ...[500, 1000].map((x) => path(spire(r, x, 60, 300, 720)))],
    fore: (r) => [path(ground(r, 840, 30, 40)), path(blob(-20, 860, 300, 160, r, 0.4, 20)), path(blob(1600, 880, 320, 180, r, 0.4, 20))],
    glow: [{ x: 950, y: 620, r: 140, color: 'soul' }],
  },
  kiln: {
    tint: 'ember', sky: 'ink',
    mid: (r) => [path(ground(r, 580, 30)), path(spire(r, 800, 260, 520)), path(ruin(r, 300, 340, 300)), path(ruin(r, 1100, 380, 320)), arch(720, 160, 260, 580)],
    near: (r) => [path(ground(r, 720, 20)), path(ruin(r, 60, 260, 380, 740)), path(ruin(r, 1250, 300, 400, 740)), path(blob(700, 740, 200, 60, r, 0.4, 16))],
    fore: (r) => [path(ground(r, 850, 14)), path(blob(200, 880, 260, 80, r, 0.4, 16)), path(blob(1300, 890, 300, 90, r, 0.4, 16))],
    glow: [{ x: 800, y: 420, r: 260, color: 'ember' }, { x: 300, y: 820, r: 120, color: 'ember' }, { x: 1300, y: 830, r: 120, color: 'ember' }],
  },
  abyss: {
    tint: 'soul', sky: 'void',
    mid: (r) => [path(ground(r, 500, 80, 40)), ...stair(r, 750, 200, 24, 80, -1)],
    near: (r) => [path(ground(r, 680, 60, 40)), ...stair(r, 300, 500, 10, 120, 1), path(blob(1300, 700, 300, 160, r, 0.45, 22))],
    fore: (r) => [path(ground(r, 830, 40, 40)), path(blob(100, 880, 340, 200, r, 0.45, 22)), path(blob(1500, 900, 360, 220, r, 0.45, 22))],
    glow: [{ x: 780, y: 200, r: 90, color: 'soul' }],
  },
};

export const REGION_IDS = Object.keys(STYLES);

/** Returns the four layer SVGs for a region. Layer 0 is the sky/void with the glow; 1 mid; 2 near; 3 fore. */
export function regionLayers(id: string, seed: number): string[] {
  const st = STYLES[id];
  const r = rng(seed);
  const tint = PALETTE[st.tint];
  const skyBase = PALETTE[st.sky as PaletteKey];
  // ---- sky: gradient void, a band of turbulent ash-cloud, the region's light, motes in the air
  const skyDefs = `<radialGradient id="sky" cx="0.5" cy="0.25" r="0.9"><stop offset="0" stop-color="${skyBase}"/><stop offset="1" stop-color="${PALETTE.void}"/></radialGradient>` +
    (st.glow ?? []).map((g, i) => `<radialGradient id="glow${i}"><stop offset="0" stop-color="${PALETTE[g.color]}" stop-opacity="0.9"/><stop offset="0.35" stop-color="${PALETTE[g.color]}" stop-opacity="0.32"/><stop offset="1" stop-color="${PALETTE[g.color]}" stop-opacity="0"/></radialGradient>`).join('') +
    `<filter id="clouds" filterUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0075" numOctaves="5" seed="${seed}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 ${ch(tint, 0)}  0 0 0 0 ${ch(tint, 1)}  0 0 0 0 ${ch(tint, 2)}  1.6 0 0 0 -0.55"/>
    </filter>
    <filter id="haze" filterUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="${seed + 7}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 ${ch(skyBase, 0)}  0 0 0 0 ${ch(skyBase, 1)}  0 0 0 0 ${ch(skyBase, 2)}  0 0 0 0.9 -0.25"/>
    </filter>
    <linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="${tint}" stop-opacity="0"/><stop offset="0.8" stop-color="${tint}" stop-opacity="0.16"/><stop offset="1" stop-color="${PALETTE.void}" stop-opacity="0.5"/></linearGradient>` +
    paperFilter('paper', seed, RW, RH);
  const motes: string[] = [];
  for (let i = 0; i < 90; i++) motes.push(`<circle cx="${f(r.range(0, RW))}" cy="${f(r.range(0, RH * 0.85))}" r="${f(r.range(0.6, 2.4))}" fill="${i % 3 === 0 ? PALETTE.parchment : tint}" opacity="${f(r.range(0.15, 0.7))}"/>`);
  const sky = svgDoc(RW, RH, skyDefs,
    `<rect width="${RW}" height="${RH}" fill="url(#sky)"/>` +
    `<rect width="${RW}" height="${RH}" filter="url(#haze)" opacity="0.7"/>` +
    `<rect width="${RW}" height="${RH}" filter="url(#clouds)" opacity="0.55"/>` +
    (st.glow ?? []).map((g, i) => `<circle cx="${g.x}" cy="${g.y}" r="${g.r * 2.2}" fill="url(#glow${i})" opacity="0.5"/><circle cx="${g.x}" cy="${g.y}" r="${g.r}" fill="url(#glow${i})"/>`).join('') +
    `<rect width="${RW}" height="${RH}" fill="url(#horizon)"/>` +
    motes.join('') +
    `<rect width="${RW}" height="${RH}" filter="url(#paper)" opacity="0.35" style="mix-blend-mode:multiply"/>`);

  // ---- landscape layers: ink masses with tone, mottle, hatching and a rim toward the light
  const layerSvg = (shapes: string[], depth: number, s: number) => {
    // atmospheric perspective: far layers are lifted toward the tint; near layers are ink
    const fill = depth === 1 ? mix(PALETTE.ink, tint, 0.35) : depth === 2 ? mix(PALETTE.ink, tint, 0.14) : PALETTE.void;
    const lit = depth === 1 ? mix(fill, mix(PALETTE.ash, tint, 0.5), 0.8) : depth === 2 ? mix(fill, mix(PALETTE.ash, tint, 0.4), 0.85) : mix(fill, mix(PALETTE.ash, tint, 0.3), 0.8);
    const rimOp = depth === 1 ? 0.5 : depth === 2 ? 0.45 : 0.4;
    // the near layers stand in the bonfire's light: an ember underlight climbs from their feet
    const underOp = depth === 1 ? 0.12 : depth === 2 ? 0.3 : 0.42;
    const under = mix(tint, PALETTE.ember, 0.5);
    const mask = `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}"><g fill="#fff">${shapes.map((d) => `<path d="${d}"/>`).join('')}</g></mask>`;
    const defs = inkFilter('ink', s, depth === 3 ? 6 : 4, depth === 3 ? 0.012 : 0.02, RW, RH) + mask +
      `<linearGradient id="tone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit}" stop-opacity="${rimOp}"/><stop offset="0.35" stop-color="${lit}" stop-opacity="0.08"/><stop offset="1" stop-color="${PALETTE.void}" stop-opacity="0.55"/></linearGradient>
      <radialGradient id="under" gradientUnits="userSpaceOnUse" cx="${RW * 0.36}" cy="${RH * 1.02}" r="${RW * 0.42}"><stop offset="0" stop-color="${under}" stop-opacity="${underOp}"/><stop offset="0.45" stop-color="${under}" stop-opacity="${(underOp * 0.4).toFixed(3)}"/><stop offset="1" stop-color="${under}" stop-opacity="0"/></radialGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint}" stop-opacity="${depth === 1 ? 0.22 : depth === 2 ? 0.1 : 0.04}"/><stop offset="0.6" stop-color="${tint}" stop-opacity="0"/></linearGradient>
      <linearGradient id="hatchFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <mask id="mh" maskUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}"><g fill="url(#hatchFade)">${shapes.map((d) => `<path d="${d}"/>`).join('')}</g></mask>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(${depth === 2 ? -32 : 28})"><line x1="0" y1="0" x2="0" y2="9" stroke="${PALETTE.void}" stroke-width="${depth === 3 ? 2.2 : 1.4}" stroke-opacity="0.6"/></pattern>
      <filter id="mottle" filterUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${depth === 1 ? 0.006 : 0.009}" numOctaves="4" seed="${s + 3}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 ${ch(lit, 0)}  0 0 0 0 ${ch(lit, 1)}  0 0 0 0 ${ch(lit, 2)}  2.4 0 0 0 -1.0"/>
      </filter>
      <filter id="soot" filterUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${depth === 1 ? 0.004 : 0.007}" numOctaves="3" seed="${s + 5}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.015  0 0 0 0 0.01  0 0 0 2.2 -1.0"/>
      </filter>
      <filter id="cracks" filterUnits="userSpaceOnUse" x="0" y="0" width="${RW}" height="${RH}" color-interpolation-filters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="2" seed="${s + 9}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.015  0 0 0 0 0.01  0 0 0 1.8 -0.9"/>
      </filter>`;
    const body =
      `<g filter="url(#ink)" fill="${fill}">${shapes.map((d) => `<path d="${d}" stroke="${fill}" stroke-width="${depth === 3 ? 3 : 1.5}"/>`).join('')}</g>` +
      `<g mask="url(#m)">` +
        `<rect width="${RW}" height="${RH}" filter="url(#mottle)" opacity="${depth === 3 ? 0.75 : depth === 2 ? 0.8 : 0.6}"/>` +
        `<rect width="${RW}" height="${RH}" filter="url(#soot)" opacity="0.7"/>` +
        `<rect width="${RW}" height="${RH}" fill="url(#tone)"/>` +
        `<rect width="${RW}" height="${RH}" fill="url(#under)"/>` +
        `<rect width="${RW}" height="${RH}" filter="url(#cracks)" opacity="${depth === 1 ? 0.45 : 0.7}"/>` +
      `</g>` +
      `<rect width="${RW}" height="${RH}" fill="url(#hatch)" mask="url(#mh)" opacity="${depth === 1 ? 0.35 : 0.6}"/>` +
      `<g>${shapes.map((d) => `<path d="${d}" fill="url(#fade)"/>`).join('')}</g>`;
    return svgDoc(RW, RH, defs, body);
  };
  return [sky, layerSvg(st.mid(r), 1, seed + 1), layerSvg(st.near(r), 2, seed + 2), layerSvg(st.fore(r), 3, seed + 3)];
}

/** a colour channel as 0..1 for feColorMatrix */
function ch(hex: string, i: number): string {
  return (parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255).toFixed(3);
}

function mix(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const c = [0, 2, 4].map((i) => Math.round(p(a, 1 + i) + (p(b, 1 + i) - p(a, 1 + i)) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
