/**
 * Save serialization, versioning, migrations, checksums, export/import.
 * Decimals serialize as strings prefixed with a severing so no field list is needed.
 */
import { Decimal, decFromJSON, isFiniteDec } from './num';
import { newGame, SAVE_VERSION } from './state';
import type { GameState } from './types';
import { migrateV1toV2 } from './migrations/v1-to-v2';
import { migrateV2toV3 } from './migrations/v2-to-v3';

const DEC_MARK = '§D§';

export interface SaveBlob {
  v: number;
  savedAt: number;
  checksum: string;
  state: unknown;
}

function replacer(this: any, k: string, v: unknown) {
  // Decimal defines toJSON, so `v` is already a string here; read the original from the holder.
  const orig = this?.[k];
  if (orig instanceof Decimal) return DEC_MARK + orig.toString();
  return v;
}
function reviver(_k: string, v: unknown) {
  if (typeof v === 'string' && v.startsWith(DEC_MARK)) return decFromJSON(v.slice(DEC_MARK.length));
  return v;
}

/** FNV-1a 32-bit over a string; enough to catch truncation and hand-edits. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function serialize(state: GameState, savedAt: number): string {
  state.savedAt = savedAt;
  const inner = JSON.stringify(state, replacer);
  const blob: SaveBlob = { v: state.version, savedAt, checksum: checksum(inner), state: JSON.parse(inner) };
  return JSON.stringify(blob);
}

export class SaveError extends Error {
  constructor(message: string, public readonly kind: 'corrupt' | 'checksum' | 'version' | 'empty') {
    super(message);
  }
}

/**
 * Migration chain: migrations[n] upgrades a raw (revived) state from version n to n+1.
 * Write one whenever the schema changes; never edit an old one.
 */
export const migrations: Record<number, (raw: any) => any> = { 1: migrateV1toV2, 2: migrateV2toV3 };

export function parseSave(json: string): GameState {
  if (!json || json.trim() === '') throw new SaveError('The save is empty.', 'empty');
  let blob: SaveBlob;
  try {
    blob = JSON.parse(json);
  } catch {
    throw new SaveError('The save is not valid JSON. It may have been truncated or edited.', 'corrupt');
  }
  if (!blob || typeof blob !== 'object' || typeof blob.v !== 'number' || !blob.state) throw new SaveError('The save is missing its header.', 'corrupt');
  const inner = JSON.stringify(blob.state);
  if (blob.checksum && checksum(inner) !== blob.checksum) throw new SaveError('The save failed its checksum. The contents do not match what was written.', 'checksum');
  if (blob.v > SAVE_VERSION) throw new SaveError(`The save is from a newer version (${blob.v}) than this build (${SAVE_VERSION}).`, 'version');
  let raw = JSON.parse(inner, reviver);
  for (let v = blob.v; v < SAVE_VERSION; v++) {
    const m = migrations[v];
    if (!m) throw new SaveError(`No migration from version ${v}.`, 'version');
    raw = m(raw);
    raw.version = v + 1;
  }
  return normalize(raw);
}

/**
 * Deep-merge defaults from a fresh game so that any field added to the schema exists.
 * Arrays and Decimals are taken from the save when present.
 */
export function normalize(raw: any): GameState {
  const fresh = newGame(typeof raw.seed === 'number' ? raw.seed : 1) as any;
  const merged = merge(fresh, raw);
  merged.version = SAVE_VERSION;
  // sanity on decimals
  for (const k of ['marrow'] as const) if (!isFiniteDec(merged[k])) merged[k] = new Decimal(0);
  return merged as GameState;
}

function merge(defaults: any, value: any): any {
  if (value === undefined || value === null) return defaults;
  if (value instanceof Decimal) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && typeof defaults === 'object' && defaults !== null && !(defaults instanceof Decimal) && !Array.isArray(defaults)) {
    const out: any = { ...value };
    for (const k of Object.keys(defaults)) out[k] = merge(defaults[k], value[k]);
    return out;
  }
  return value;
}

// ---- export / import (base64, unicode-safe) ----

const EXPORT_PREFIX = 'MOURNWAKE1.';
const LEGACY_PREFIX = 'ASHFALL1.'; // banned-terms: allow (exports made before the rename still import)

export function exportSave(state: GameState, savedAt: number): string {
  const json = serialize(state, savedAt);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return EXPORT_PREFIX + b64encode(bin);
}

export function importSave(text: string): GameState {
  const t = text.trim();
  const prefix = t.startsWith(EXPORT_PREFIX) ? EXPORT_PREFIX : t.startsWith(LEGACY_PREFIX) ? LEGACY_PREFIX : null;
  if (!prefix) throw new SaveError('Not a Mournwake export: the text should begin with MOURNWAKE1.', 'corrupt');
  let bin: string;
  try {
    bin = b64decode(t.slice(prefix.length));
  } catch {
    throw new SaveError('The export is not valid base64. Copy the whole string.', 'corrupt');
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return parseSave(json);
}

function b64encode(bin: string): string {
  if (typeof btoa === 'function') return btoa(bin);
  return Buffer.from(bin, 'binary').toString('base64');
}
function b64decode(s: string): string {
  if (typeof atob === 'function') return atob(s);
  return Buffer.from(s, 'base64').toString('binary');
}
