/** Sim extension: snuff and spend Vestige. */
import { registerSimExtension } from './strategies';
import { TREE } from '@/content';
import { canSnuff, vestigePreview, nodeBlocked, canSever, threadsPreview, severingUnlockBlocked, canUnmake } from '@/engine';
import { SEVERING_UNLOCKS } from '@/content';

const SIGIL_PRIORITY = ['sigilEdge', 'sigilHunger', 'autoSnuff', 'keepTree', 'sixthBanner', 'nadir', 'hexes', 'sigilEdge', 'sigilHunger', 'startKindles', 'sigilFamiliar', 'autoSpells', 'sigilDark', 'sigilShades', 'sigilMind', 'sigilNight'];

const PRIORITY: Record<string, string[]> = {
  active: ['flameStart', 'wickEdge', 'flameWeapon', 'wickMarrow', 'boneVigor', 'flameSouls', 'wickReprisal', 'flameAutoAdvance', 'flameAutoLevel', 'wickStrain', 'boneEstus', 'boneAutoEstus', 'boneStamina', 'boneDodge', 'boneAutoDodge', 'wickAutoReprisal', 'shadowRate', 'shadowDmg', 'flameKeep', 'flameNg', 'shadowOffline', 'shadowHumanity', 'bonePotency', 'wickCrit', 'shadowMaterials', 'shadowSlot', 'flameAttune'],
  // Idle players buy the reflexes first: auto-dodge is what gets them past a lord.
  idle: ['boneVigor', 'boneStamina', 'boneDodge', 'boneAutoDodge', 'boneEstus', 'boneAutoEstus', 'wickEdge', 'wickReprisal', 'wickStrain', 'wickAutoReprisal', 'flameStart', 'flameSouls', 'flameAutoLevel', 'flameAutoAdvance', 'shadowRate', 'shadowDmg', 'shadowSlot', 'shadowOffline', 'shadowHumanity', 'flameWeapon', 'flameKeep', 'flameNg', 'wickMarrow', 'shadowMaterials', 'bonePotency', 'wickCrit', 'flameAttune'],
};

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  if (view.t - ((mem.lastPrestige as number) ?? -60) < 30) return;
  mem.lastPrestige = view.t;
  // snuff when the gain is worth it: at least 3 vestige and >= 60% of what we have ever gathered,
  // or after the region's content is exhausted (all unlocked zones' bosses dead) for a while.
  // Players snuff when the road runs out (every open region's lord is dead and nothing has
  // happened for a while) or when the gain would double their Vestige.
  const gain = vestigePreview(s);
  // Progress memory: deepest tier or lords this cycle moving forward resets the "stuck" clock.
  const progressKey = s.stats.cycleDeepest * 100 + s.stats.cycleBosses;
  if (progressKey !== ((mem.progressKey as number) ?? -1)) { mem.progressKey = progressKey; mem.lastAdvanceT = view.t; }
  const stuckFor = view.t - ((mem.lastAdvanceT as number) ?? view.t);
  const allBossesDead = s.unlockedZones.every((z) => (s.zones[z]?.bossKills ?? 0) > 0);
  // Players snuff when they are stuck (no new tier or lord for 45 min, or the road is fully cleared and 15 min pass)
  // and the gain is worth having; or, late, when it would double their Vestige after four lords.
  // Idle players farm longer before giving up on a wall: levels always pay, and their cycles gather little.
  const patience = params.clickRate === 0 || params.clickUntil !== undefined ? 240 * 60 : 90 * 60;
  const stuck = (stuckFor > patience || (allBossesDead && stuckFor > 30 * 60)) && gain.gte(2);
  const doubling = s.stats.cycleBosses >= 4 && gain.gte(4) && gain.gte(s.prestige.vestigeTotal.add(1));
  if (s.descent.run && (doubling || stuck)) { out.push({ type: 'descentWithdraw' }); return; }
  if (!canSnuff(s) && (doubling || stuck)) {
    out.push({ type: 'snuff' });
    mem.progressKey = -1;
    return;
  }
  // Dark Severing: carve when it would gather at least 3 marks and at least half of what we hold,
  // and the current cycle has run its course (stuck, or Waking well past the threshold).
  const marks = threadsPreview(s);
  if (!canSever(s) && marks.gte(3) && marks.gte(s.prestige.threads.mul(0.5)) && (stuckFor > 60 * 60 || s.prestige.wakings >= 8)) {
    out.push({ type: 'sever' });
    mem.progressKey = -1;
    return;
  }
  for (const id of SIGIL_PRIORITY) if (SEVERING_UNLOCKS[id] && severingUnlockBlocked(s, id) === null) { out.push({ type: 'buySeveringUnlock', unlock: id }); return; }
  if (!canUnmake(s)) { out.push({ type: 'unmake' }); return; }
  // spend vestige by priority
  const list = PRIORITY[params.clickRate === 0 || params.clickUntil !== undefined ? 'idle' : 'active'];
  for (const id of list) {
    if (!TREE[id]) continue;
    if (nodeBlocked(s, id) === null) { out.push({ type: 'buyTreeNode', node: id }); return; }
  }
  // enable every automation we own
  for (const k of ['autoReprisal', 'autoDodge', 'autoDraught', 'autoLevel', 'autoAdvance', 'autoSpells'] as const) {
    if (s.automation.unlocked.includes(k) && !s.automation[k]) out.push({ type: 'setAutomation', key: k, value: true });
  }
});
