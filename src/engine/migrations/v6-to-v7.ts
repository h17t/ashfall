/** Save migration 6 → 7: Dispatch, Holdfasts, the Creed War and Weapon Mastery. Everything starts empty; the war starts level. */
export function migrateV6toV7(raw: any): any {
  if (!raw.dispatch) raw.dispatch = { missions: [], nextId: 1, echoes: [], sent: 0, lost: 0 };
  if (!raw.holdfasts) raw.holdfasts = {};
  if (!raw.war) raw.war = { standing: { wick: 100, legion: 100, rot: 100, vigil: 100, nadir: 100 }, roundT: 0, round: 1, dominion: null, contributed: 0 };
  for (const w of Object.values<any>(raw.player?.weapons ?? {})) if (w.mastery === undefined) w.mastery = 0;
  return raw;
}
