/**
 * Afflictions: curses the player takes on by choice, each a cost and a gain, stacking as far as
 * they dare. The difficulty dial belongs to the player, not to a settings screen.
 */
export interface AfflictionDef {
  id: string;
  name: string;
  /** what it costs you */
  cost: string;
  /** what it pays */
  gain: string;
  lore: string;
  fx: {
    /** damage taken multiplier */
    taken?: number;
    /** draught potency multiplier */
    draught?: number;
    /** share of held marrow lost per second */
    leak?: number;
    /** enemy composure multiplier */
    composure?: number;
    stamRegen?: number;
    /** auto-dodge and auto-reprisal sleep */
    reflexesSleep?: boolean;
    /** reinforcement effect multiplier */
    reinforce?: number;
    hpMult?: number;
    // gains
    marrow?: number;
    dmg?: number;
    reprisal?: number;
    materials?: number;
    vestige?: number;
  };
}

export const AFFLICTIONS: Record<string, AfflictionDef> = {
  thinBlood: { id: 'thinBlood', name: 'Thin Blood', cost: 'Enemies hit +40% harder.', gain: 'Marrow ×1.5.', lore: 'You bleed faster now, and what comes out of you shines. They can smell it.', fx: { taken: 1.4, marrow: 1.5 } },
  bitterDraught: { id: 'bitterDraught', name: 'Bitter Draught', cost: 'Tallowdraughts heal half as much.', gain: 'Damage ×1.2.', lore: 'The flask has gone bitter. Whatever it does now, it does not mend; it sharpens.', fx: { draught: 0.5, dmg: 1.2 } },
  theLeak: { id: 'theLeak', name: 'The Leak', cost: 'Held marrow drains 1% a second.', gain: 'Marrow from kills ×1.75.', lore: 'A hole in you that marrow runs out of. Spend it before it goes. Spend it now.', fx: { leak: 0.01, marrow: 1.75 } },
  ironComposure: { id: 'ironComposure', name: 'Iron Composure', cost: 'Enemies have 60% more Composure.', gain: 'Reprisal ×2.2.', lore: 'They do not break for you any more. When they do, break them properly.', fx: { composure: 1.6, reprisal: 2.2 } },
  shortBreath: { id: 'shortBreath', name: 'Short Breath', cost: 'Stamina regen ×0.6.', gain: 'Damage ×1.25.', lore: 'Each swing costs a breath you do not get back quickly. Make each one count.', fx: { stamRegen: 0.6, dmg: 1.25 } },
  dimmedLantern: { id: 'dimmedLantern', name: 'Dimmed Lantern', cost: 'Auto-dodge and auto-Reprisal sleep.', gain: 'Marrow ×1.4.', lore: 'The reflexes the fire gave you go dark. Your hands are your own again, for better and worse.', fx: { reflexesSleep: true, marrow: 1.4 } },
  brittleSteel: { id: 'brittleSteel', name: 'Brittle Steel', cost: 'Reinforcement counts for half.', gain: 'Material drops ×2.', lore: 'The edge you ground into it has gone soft. What you take from them, you take twice.', fx: { reinforce: 0.5, materials: 2 } },
  theWaning: { id: 'theWaning', name: 'The Waning', cost: 'Max HP ×0.6.', gain: 'Vestige from Snuffing ×1.3.', lore: 'You are less than you were, and the fire remembers it, and pays for the difference.', fx: { hpMult: 0.6, vestige: 1.3 } },
};
export const AFFLICTION_ORDER = Object.keys(AFFLICTIONS);
