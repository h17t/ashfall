/** Sim extension: kindle and spend Humanity. */
import { registerSimExtension } from './strategies';
import { TREE } from '@/content';
import { canKindle, humanityPreview, nodeBlocked } from '@/engine';

const PRIORITY: Record<string, string[]> = {
  active: ['flameStart', 'emberEdge', 'flameWeapon', 'emberSouls', 'boneVigor', 'flameSouls', 'emberRiposte', 'flameAutoAdvance', 'flameAutoLevel', 'emberStagger', 'boneEstus', 'boneAutoEstus', 'boneStamina', 'boneDodge', 'boneAutoDodge', 'emberAutoRiposte', 'shadowRate', 'shadowDmg', 'flameKeep', 'flameNg', 'shadowOffline', 'shadowHumanity', 'bonePotency', 'emberCrit', 'shadowMaterials', 'shadowSlot', 'flameAttune'],
  idle: ['shadowRate', 'shadowDmg', 'flameStart', 'boneVigor', 'flameSouls', 'flameAutoLevel', 'flameAutoAdvance', 'boneEstus', 'boneAutoEstus', 'boneStamina', 'boneDodge', 'boneAutoDodge', 'emberEdge', 'emberRiposte', 'emberStagger', 'emberAutoRiposte', 'shadowSlot', 'shadowOffline', 'shadowHumanity', 'flameWeapon', 'flameKeep', 'flameNg', 'emberSouls', 'shadowMaterials', 'bonePotency', 'emberCrit', 'flameAttune'],
};

registerSimExtension((view, params, mem, out) => {
  const s = view.state;
  if (view.t - ((mem.lastPrestige as number) ?? -60) < 30) return;
  mem.lastPrestige = view.t;
  // kindle when the gain is worth it: at least 3 humanity and >= 60% of what we have ever gathered,
  // or after the region's content is exhausted (all unlocked zones' bosses dead) for a while.
  // Players kindle when the road runs out (every open region's lord is dead and nothing has
  // happened for a while) or when the gain would double their Humanity.
  const gain = humanityPreview(s);
  // Progress memory: deepest tier or lords this cycle moving forward resets the "stuck" clock.
  const progressKey = s.stats.cycleDeepest * 100 + s.stats.cycleBosses;
  if (progressKey !== ((mem.progressKey as number) ?? -1)) { mem.progressKey = progressKey; mem.lastAdvanceT = view.t; }
  const stuckFor = view.t - ((mem.lastAdvanceT as number) ?? view.t);
  const allBossesDead = s.unlockedZones.every((z) => (s.zones[z]?.bossKills ?? 0) > 0);
  // Players kindle when they are stuck (no new tier or lord for 45 min, or the road is fully cleared and 15 min pass)
  // and the gain is worth having; or, late, when it would double their Humanity after four lords.
  const stuck = (stuckFor > 45 * 60 || (allBossesDead && stuckFor > 15 * 60)) && gain.gte(2);
  const doubling = s.stats.cycleBosses >= 4 && gain.gte(4) && gain.gte(s.prestige.humanityTotal.add(1));
  if (!canKindle(s) && (doubling || stuck)) {
    out.push({ type: 'kindle' });
    mem.progressKey = -1;
    return;
  }
  // spend humanity by priority
  const list = PRIORITY[params.clickRate === 0 || params.clickUntil !== undefined ? 'idle' : 'active'];
  for (const id of list) {
    if (!TREE[id]) continue;
    if (nodeBlocked(s, id) === null) { out.push({ type: 'buyTreeNode', node: id }); return; }
  }
  // enable every automation we own
  for (const k of ['autoRiposte', 'autoDodge', 'autoEstus', 'autoLevel', 'autoAdvance'] as const) {
    if (s.automation.unlocked.includes(k) && !s.automation[k]) out.push({ type: 'setAutomation', key: k, value: true });
  }
});
