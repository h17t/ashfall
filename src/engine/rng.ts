/**
 * Deterministic PRNG (mulberry32). State lives inside GameState so the engine stays
 * pure and the simulator is reproducible.
 */
export interface RngState {
  s: number;
}

export function makeRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

/** Returns a float in [0,1) and advances the state. */
export function rand(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(r: RngState, min: number, maxInclusive: number): number {
  return min + Math.floor(rand(r) * (maxInclusive - min + 1));
}

export function chance(r: RngState, p: number): boolean {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return rand(r) < p;
}

export function pick<T>(r: RngState, arr: readonly T[]): T {
  return arr[Math.floor(rand(r) * arr.length)];
}
