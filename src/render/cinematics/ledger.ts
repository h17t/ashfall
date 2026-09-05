/** The Snuff panel records what the fire will take and keep just before it dispatches, so the ritual can read it. */
let snuffLedger: { keep: string[]; lose: string[]; cycle: number } = { keep: [], lose: [], cycle: 0 };
export function setSnuffLedger(l: { keep: string[]; lose: string[]; cycle: number }) { snuffLedger = l; }
export function snuffLedgerNow() { return snuffLedger; }
