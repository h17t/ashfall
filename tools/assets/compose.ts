/**
 * Plate composer. A plate is a list of layers (mass, light, hatch, line, detail, glow) assembled
 * into one SVG with the etching filter chains applied. Rigs (parts.ts) produce layers.
 */
import { PALETTE, type PaletteKey } from './palette';
import { inkFilter, washFilter, paperFilter, hatchPattern, fireGradient, smoothClosed, polyPath, svgDoc, type Pt, type Rng, rng } from './svg';

export type Layer =
  | { kind: 'mass'; pts: Pt[]; smooth?: boolean; tone?: number; z?: number }          // tone 0 = ink, 1 = ash (interior value)
  | { kind: 'line'; pts: Pt[]; width: number; closed?: boolean; smooth?: boolean; z?: number }
  | { kind: 'light'; pts: Pt[]; smooth?: boolean; strength?: number; z?: number }     // rim light region (fire side)
  | { kind: 'detail'; pts: Pt[]; color: PaletteKey; alpha?: number; smooth?: boolean; z?: number }
  | { kind: 'glow'; cx: number; cy: number; r: number; color: PaletteKey; z?: number } // a light source in the world
  | { kind: 'hatch'; pts: Pt[]; smooth?: boolean; spacing?: number; angle?: number; z?: number };

export interface Plate {
  id: string;
  w: number;
  h: number;
  seed: number;
  tint?: PaletteKey | null;
  /** where the fire is, in unit coordinates (default bottom-left) */
  fire?: Pt;
  layers: Layer[];
  /** extra ink bleed amount */
  bleed?: number;
}

function pathOf(pts: Pt[], smooth = true): string {
  return smooth ? smoothClosed(pts, 0.55) : polyPath(pts);
}

export function composePlate(p: Plate): string {
  const r = rng(p.seed);
  const fire = p.fire ?? [0.12, 1.05];
  const bleed = p.bleed ?? 3.5;
  const tintHex = p.tint ? PALETTE[p.tint] : PALETTE.ash;
  const defs = [
    inkFilter('ink', p.seed, bleed, 0.03),
    inkFilter('inkFine', p.seed + 3, 1.6, 0.08),
    washFilter('wash', p.seed + 11, Math.max(4, p.w / 80)),
    paperFilter('paper', p.seed + 5),
    hatchPattern('hatch', 3.2, -32, PALETTE.ink, 1.0),
    hatchPattern('hatchCross', 4.5, 40, PALETTE.ink, 0.7),
    fireGradient('rim', PALETTE.emberHot, PALETTE.ember, fire[0], fire[1], 0.95),
    fireGradient('warm', '#B08A5A', tintHex, fire[0], fire[1], 1.1),
    `<radialGradient id="shadowRamp" cx="${1 - fire[0]}" cy="${Math.max(0, 1 - fire[1])}" r="1.15" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.7"/><stop offset="0.8" stop-color="#fff" stop-opacity="0.15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  ];
  const layers = [...p.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const masses = layers.filter((l): l is Extract<Layer, { kind: 'mass' }> => l.kind === 'mass');
  const massPaths = masses.map((m) => `<path d="${pathOf(m.pts, m.smooth ?? true)}"/>`).join('');
  defs.push(`<clipPath id="body">${massPaths}</clipPath>`);
  defs.push(`<mask id="shadowMask"><rect width="${p.w}" height="${p.h}" fill="url(#shadowRamp)"/></mask>`);
  defs.push(`<mask id="lightMask"><rect width="${p.w}" height="${p.h}" fill="url(#rim)"/></mask>`);

  let body = '';
  // 1. Silhouette masses with wash pooling and broken edges.
  body += `<g filter="url(#ink)"><g filter="url(#wash)">`;
  for (const m of masses) {
    const tone = m.tone ?? 0;
    // Base masses sit in stone so the light can carve them; ink is reserved for the shadow ramp.
    const fill = tone <= 0 ? '#2A2320' : tone < 0.6 ? '#3A322C' : PALETTE.ash;
    body += `<path d="${pathOf(m.pts, m.smooth ?? true)}" fill="${fill}"/>`;
  }
  body += `</g></g>`;
  // 2. Warm interior wash from the fire side, clipped to the body: the one light.
  body += `<g clip-path="url(#body)"><rect width="${p.w}" height="${p.h}" fill="url(#warm)" opacity="0.85"/></g>`;
  // 2b. Core shadow: ink pools on the side away from the fire.
  body += `<g clip-path="url(#body)" mask="url(#shadowMask)"><rect width="${p.w}" height="${p.h}" fill="${PALETTE.ink}" opacity="0.8"/></g>`;
  // 3. Etching hatch in the shadow ramp, clipped to body.
  body += `<g clip-path="url(#body)" mask="url(#shadowMask)"><rect width="${p.w}" height="${p.h}" fill="url(#hatch)" opacity="0.7"/><rect width="${p.w}" height="${p.h}" fill="url(#hatchCross)" opacity="0.3"/></g>`;
  // 4. Explicit hatch regions, lights and details.
  for (const l of layers) {
    if (l.kind === 'hatch') {
      body += `<g filter="url(#inkFine)"><path d="${pathOf(l.pts, l.smooth ?? true)}" fill="url(#hatch)" opacity="0.9"/></g>`;
    } else if (l.kind === 'light') {
      body += `<g clip-path="url(#body)" filter="url(#inkFine)"><path d="${pathOf(l.pts, l.smooth ?? true)}" fill="${PALETTE.emberHot}" opacity="${(l.strength ?? 0.7).toFixed(2)}" mask="url(#lightMask)"/></g>`;
    } else if (l.kind === 'detail') {
      body += `<g filter="url(#inkFine)"><path d="${pathOf(l.pts, l.smooth ?? true)}" fill="${PALETTE[l.color]}" opacity="${(l.alpha ?? 1).toFixed(2)}"/></g>`;
    } else if (l.kind === 'line') {
      const d = l.closed === false ? 'M' + l.pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') : pathOf(l.pts, l.smooth ?? true);
      body += `<g filter="url(#inkFine)"><path d="${d}" fill="none" stroke="${PALETTE.ink}" stroke-width="${l.width}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/></g>`;
    }
  }
  // 5. Rim light along the fire-facing silhouette edge: offset the body toward the fire, keep the sliver.
  const fx = (fire[0] - 0.5) * 2, fy = (fire[1] - 0.5) * 2;
  const off = Math.max(2, p.w / 90);
  defs.push(`<mask id="rimSliver"><g fill="#fff">${massPaths}</g><g fill="#000" transform="translate(${(-fx * off).toFixed(1)} ${(-fy * off).toFixed(1)})">${massPaths}</g></mask>`);
  body += `<g mask="url(#rimSliver)" filter="url(#inkFine)"><rect width="${p.w}" height="${p.h}" fill="url(#rim)" opacity="0.9"/></g>`;
  // 6. Glows: actual light sources (eyes, flame, soul).
  for (const l of layers) {
    if (l.kind !== 'glow') continue;
    const gid = `g${Math.round(l.cx)}_${Math.round(l.cy)}`;
    defs.push(`<radialGradient id="${gid}"><stop offset="0" stop-color="${PALETTE[l.color]}" stop-opacity="1"/><stop offset="0.35" stop-color="${PALETTE[l.color]}" stop-opacity="0.55"/><stop offset="1" stop-color="${PALETTE[l.color]}" stop-opacity="0"/></radialGradient>`);
    body += `<circle cx="${l.cx}" cy="${l.cy}" r="${l.r}" fill="url(#${gid})"/>`;
    body += `<circle cx="${l.cx}" cy="${l.cy}" r="${(l.r * 0.22).toFixed(1)}" fill="${PALETTE.emberHot}" opacity="0.95"/>`;
  }
  // 7. Paper tooth and foxing over the whole body.
  body += `<g clip-path="url(#body)" style="mix-blend-mode:multiply"><rect width="${p.w}" height="${p.h}" filter="url(#paper)" opacity="0.5"/></g>`;
  void r;
  return svgDoc(p.w, p.h, defs.join('\n'), body);
}

/** Pure-black silhouette of a plate (for the audit sheet and VFX masks). */
export function silhouetteSvg(p: Plate, fill = PALETTE.ink, bg = 'none'): string {
  const masses = p.layers.filter((l): l is Extract<Layer, { kind: 'mass' }> => l.kind === 'mass');
  const body = masses.map((m) => `<path d="${pathOf(m.pts, m.smooth ?? true)}" fill="${fill}"/>`).join('');
  return svgDoc(p.w, p.h, '', body, bg);
}
