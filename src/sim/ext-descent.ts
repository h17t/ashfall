/**
 * Sim extension: the Stair. A strategy that descends does so between fights when healthy, takes
 * boons by a priority (damage engines first, then greed, then armour), and withdraws at its
 * target floor or when its HP falls under its nerve. Strategies without a `descent` setting never
 * take the stair, which is the control in BALANCE.md.
 */
import { registerSimExtension, type PolicyParams } from './strategies';
import { canDescend } from '@/engine';
import { BOONS } from '@/content';

export interface DescentPolicy {
  /** seconds between runs */
  every: number;
  /** withdraw once this floor is reached (after its offer) */
  withdrawAt: number;
  /** withdraw at an offer when HP is under this fraction */
  nerve: number;
}

const PRIORITY = ['glassMarrow', 'critRot', 'graveMomentum', 'firstCut', 'tallowEdge', 'leechWick', 'secondWaking', 'avarice', 'usurersBank', 'marrowGreed', 'keenEye', 'wideReprisal', 'shortStair', 'reliquaryDraught', 'thornedShroud', 'stoneComposure', 'patientKnife', 'rendering', 'lanternOil', 'quickWick', 'saltedBlade', 'openVein', 'woundDeepens', 'coldBreath', 'unendingWick', 'severTheCost', 'gildedHands'];
const CAUTIOUS = ['stoneComposure', 'leechWick', 'secondWaking', 'thornedShroud', 'tallowEdge', 'graveMomentum', 'firstCut', 'unendingWick', 'reliquaryDraught', 'keenEye', 'marrowGreed', 'usurersBank', 'wideReprisal', 'rendering', 'quickWick', 'patientKnife', 'critRot', 'shortStair', 'coldBreath', 'saltedBlade', 'openVein', 'woundDeepens', 'lanternOil', 'severTheCost', 'gildedHands', 'glassMarrow', 'avarice'];

registerSimExtension((view, params, mem, out) => {
  const d = (params as PolicyParams & { descent?: DescentPolicy }).descent;
  if (!d) return;
  const s = view.state;
  const run = s.descent.run;
  const p = s.player;
  if (!run) {
    if (!s.flags.descentUnlocked) return;
    if (view.t - ((mem.lastDescent as number) ?? -1e9) < d.every) return;
    if (p.hp < p.hpMax * 0.9 || s.remainsRun || s.remains) return;
    if (canDescend(s) === null) { mem.lastDescent = view.t; out.push({ type: 'descend' }); }
    return;
  }
  if (run.offer) {
    // the decision every floor: bank, or one more
    if (run.floor >= d.withdrawAt || p.hp < p.hpMax * d.nerve) { out.push({ type: 'descentWithdraw' }); return; }
    const list = params.dodgeSkill >= 0.8 ? PRIORITY : CAUTIOUS;
    let best = 0;
    for (let i = 0; i < run.offer.length; i++) { const a = list.indexOf(run.offer[i]), b = list.indexOf(run.offer[best]); if ((a < 0 ? 99 : a) < (b < 0 ? 99 : b)) best = i; }
    if (BOONS[run.offer[best]]) out.push({ type: 'chooseBoon', index: best });
    return;
  }
  // mid-floor: out of draughts and low, bank what there is rather than lose it
  if (p.draughts === 0 && p.hp < p.hpMax * Math.min(d.nerve, 0.3)) out.push({ type: 'descentWithdraw' });
});
