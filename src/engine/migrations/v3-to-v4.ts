/** Save migration 3 → 4: Standing Orders arrive. Nothing existing changes shape. */
export function migrateV3toV4(raw: any): any {
  if (!raw.orders) raw.orders = { rules: [], nextId: 1 };
  return raw;
}
