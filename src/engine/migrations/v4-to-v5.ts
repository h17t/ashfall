/** Save migration 4 → 5: the Study and the forge. Weapons gain empty affix lists; kills per creature start at zero. */
export function migrateV4toV5(raw: any): any {
  if (!raw.study) raw.study = {};
  const ws = raw.player?.weapons ?? {};
  for (const w of Object.values<any>(ws)) { if (!w.affixes) w.affixes = []; if (!w.locked) w.locked = []; }
  return raw;
}
