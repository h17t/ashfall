/** Save migration 5 → 6: Afflictions and the Toll. Old saves start at Dawn with no curses. */
export function migrateV5toV6(raw: any): any {
  if (!raw.afflictions) raw.afflictions = [];
  if (!raw.toll) raw.toll = { t: 0, phase: 'dawn' };
  return raw;
}
