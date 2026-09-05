/** Save migration 2 → 3: the Stair (Descent Runs) arrives. Nothing existing changes shape. */
export function migrateV2toV3(raw: any): any {
  if (!raw.descent) raw.descent = { run: null, runs: 0, bestFloor: 0, bankedTotal: undefined, last: null };
  return raw;
}
