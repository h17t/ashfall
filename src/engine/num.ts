/**
 * Big-number helpers. All economy/damage numbers in Ashfall are break_infinity Decimals
 * from day one. Timers, stat points, stamina, and other bounded values are plain numbers.
 */
import Decimal from 'break_infinity.js';

export type Dec = Decimal;
export const D = (v: number | string | Decimal): Decimal => new Decimal(v);
export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function isFiniteDec(d: Decimal): boolean {
  return Number.isFinite(d.mantissa) && Number.isFinite(d.exponent) && !Number.isNaN(d.mantissa);
}

/** Clamp a Decimal to >= 0 and guard against NaN/Infinity (economy safety). */
export function safe(d: Decimal): Decimal {
  if (!isFiniteDec(d)) return ZERO;
  if (d.lt(0)) return ZERO;
  return d;
}

export function decMax(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}
export function decMin(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}

export type NumberFormat = 'short' | 'scientific' | 'engineering';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/**
 * Format a number for display. thousands -> K/M/B... then scientific beyond the suffix table
 * (or beyond `sciThreshold` exponent if the player prefers).
 */
/** Host-settable default format (the UI sets this from Settings). */
export let defaultFormat: NumberFormat = 'short';
export function setDefaultFormat(f: NumberFormat) { defaultFormat = f; }

export function fmt(v: Decimal | number, format: NumberFormat = defaultFormat, precision = 2): string {
  const d = typeof v === 'number' ? new Decimal(v) : v;
  if (!isFiniteDec(d)) return '∞';
  if (d.lt(0)) return '-' + fmt(d.neg(), format, precision);
  if (d.lt(1000)) {
    const n = d.toNumber();
    if (Number.isInteger(n)) return String(n);
    if (n < 10) return n.toFixed(precision);
    if (n < 100) return n.toFixed(1);
    return n.toFixed(0);
  }
  const exp = Math.floor(d.log10());
  if (format === 'scientific' || exp >= SUFFIXES.length * 3) {
    const mant = d.div(Decimal.pow(10, exp)).toNumber();
    return `${mant.toFixed(precision)}e${exp}`;
  }
  if (format === 'engineering') {
    const e3 = Math.floor(exp / 3) * 3;
    const mant = d.div(Decimal.pow(10, e3)).toNumber();
    return `${mant.toFixed(precision)}e${e3}`;
  }
  const idx = Math.floor(exp / 3);
  const mant = d.div(Decimal.pow(10, idx * 3)).toNumber();
  const digits = mant >= 100 ? 0 : mant >= 10 ? 1 : precision;
  return `${mant.toFixed(digits)}${SUFFIXES[idx]}`;
}

export function fmtInt(v: Decimal | number): string {
  const d = typeof v === 'number' ? new Decimal(v) : v;
  if (d.lt(1000)) return String(Math.floor(d.toNumber()));
  return fmt(d);
}

/** Serialize a Decimal for saves. */
export function decToJSON(d: Decimal): string {
  return d.toString();
}
export function decFromJSON(s: string | number | undefined | null): Decimal {
  if (s === undefined || s === null) return ZERO;
  const d = new Decimal(s);
  return isFiniteDec(d) ? d : ZERO;
}

export { Decimal };
