/** The palette, mirrored from src/ui/tokens.css. The treatment chain maps luminance into these. */
export const PALETTE = {
  void: '#0A0908',
  ink: '#14100E',
  stone: '#241E1A',
  ash: '#4A423C',
  bone: '#C8BBA6',
  parchment: '#E8DCC4',
  ember: '#C8560F',
  emberHot: '#F0902E',
  blood: '#6E1212',
  bloodBright: '#A81C1C',
  verdigris: '#3D5A4C',
  soul: '#5C7A99',
  gold: '#B8912F',
} as const;
export type PaletteKey = keyof typeof PALETTE;

export function hex(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * The house tone ramp: luminance 0..1 → colour. Darks pool toward ink, mids sit in ash/stone,
 * lights warm toward bone and, at the very top, the ember highlight. A `tint` key bends the mids
 * (verdigris for the Mire, soul for the Archive, gold for the Sanctum, blood for the Deep).
 */
export function toneRamp(l: number, tint: PaletteKey | null = null, tintStrength = 0.35): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, hex(PALETTE.void)],
    [0.12, hex(PALETTE.ink)],
    [0.3, hex(PALETTE.stone)],
    [0.5, hex(PALETTE.ash)],
    [0.72, hex('#8A7D6B')],
    [0.86, hex(PALETTE.bone)],
    [0.95, hex(PALETTE.parchment)],
    [1.0, hex(PALETTE.emberHot)],
  ];
  let c = stops[stops.length - 1][1];
  for (let i = 1; i < stops.length; i++) {
    if (l <= stops[i][0]) {
      const t = (l - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      c = lerpRgb(stops[i - 1][1], stops[i][1], Math.max(0, Math.min(1, t)));
      break;
    }
  }
  if (tint) {
    // bend the mids only; keep darks inky and lights bone
    const w = Math.sin(Math.PI * Math.min(1, Math.max(0, l))) * tintStrength;
    c = lerpRgb(c, hex(PALETTE[tint]), w);
  }
  return c;
}
