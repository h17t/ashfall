/**
 * Boons: the run-only modifiers of the Stair. Three are offered after every floor; one is taken.
 * They are meant to combine past reason: the run where four of them line up is the one that gets
 * told. Every effect lasts exactly one Descent and is gone when the haul is banked or lost.
 */
export type BoonRarity = 'common' | 'rare' | 'epic';

export interface BoonFx {
  /** multiplier on damage dealt */
  dmg?: number;
  /** flat crit chance added */
  crit?: number;
  /** multiplier on crit damage */
  critDmg?: number;
  /** multiplier on strain dealt */
  strain?: number;
  /** multiplier on damage taken */
  taken?: number;
  /** multiplier on the haul (unbanked marrow) */
  haul?: number;
  /** fraction of max HP mended per landed hit */
  lifesteal?: number;
  /** multiplier on Reprisal damage */
  reprisal?: number;
  statusBuild?: number;
  statusDmg?: number;
  stamRegen?: number;
  /** fraction of max HP mended each second */
  hpRegen?: number;
  /** fraction of the enemy's max HP dealt back when it lands a hit */
  thorns?: number;
  /** change to the kills a floor needs (negative shortens the floor) */
  killsNeeded?: number;
  /** added to the bank multiplier per floor */
  bankPerFloor?: number;
  /** multiplier on the first hit landed on each enemy */
  firstHit?: number;
  /** damage bonus per kill this run, compounding (0.03 = +3% per kill) */
  momentum?: number;
  /** damage bonus per second spent on the current floor */
  patience?: number;
  /** survive a killing blow at 1 HP, this many times */
  secondWind?: number;
  /** flasks refill when a floor is cleared */
  draughtRefill?: number;
  /** damage multiplier for eight seconds after drinking */
  draughtDmg?: number;
  dodgeCd?: number;
  /** spells cost no FP */
  freeCasts?: number;
  /** crits apply bleed */
  bleedOnCrit?: number;
  /** material drops multiplier */
  materials?: number;
}

export interface BoonDef {
  id: string;
  name: string;
  rarity: BoonRarity;
  /** how many times it can be taken in one run */
  stack: number;
  /** the mechanical line */
  text: string;
  lore: string;
  fx: BoonFx;
}

export const BOONS: Record<string, BoonDef> = {
  // ---- common: the plain edges
  tallowEdge: { id: 'tallowEdge', name: 'Tallow Edge', rarity: 'common', stack: 4, text: 'Damage +25%.', lore: 'Fat rendered from the last floor, wiped along the blade. It goes in easier.', fx: { dmg: 1.25 } },
  marrowGreed: { id: 'marrowGreed', name: 'Marrow-Greed', rarity: 'common', stack: 4, text: 'Haul +30%.', lore: 'You have started counting before the thing is dead. It notices. So does the marrow.', fx: { haul: 1.3 } },
  keenEye: { id: 'keenEye', name: 'Keen Eye', rarity: 'common', stack: 3, text: 'Crit chance +10%.', lore: 'The dark on the stair is not dark to you any more. You see where the seams are.', fx: { crit: 0.1 } },
  stoneComposure: { id: 'stoneComposure', name: 'Stone Composure', rarity: 'common', stack: 3, text: 'Damage taken −15%.', lore: 'Whatever was in you that flinched has gone quiet. The blows land on something else.', fx: { taken: 0.85 } },
  quickWick: { id: 'quickWick', name: 'Quick Wick', rarity: 'common', stack: 3, text: 'Stamina regen +40%.', lore: 'The breath comes back before you have asked for it.', fx: { stamRegen: 1.4 } },
  rendering: { id: 'rendering', name: 'Rendering', rarity: 'common', stack: 3, text: 'Strain +35%.', lore: 'You have learned where a thing keeps its balance, and you go there first.', fx: { strain: 1.35 } },
  saltedBlade: { id: 'saltedBlade', name: 'Salted Blade', rarity: 'common', stack: 2, text: 'Status buildup +50%.', lore: 'Grave-salt in the fuller. Wounds that should close, don\'t.', fx: { statusBuild: 1.5 } },
  coldBreath: { id: 'coldBreath', name: 'Cold Breath', rarity: 'common', stack: 2, text: 'Dodge cooldown −30%.', lore: 'You step out of the way of the stair itself. The stair does not mind.', fx: { dodgeCd: 0.7 } },
  gildedHands: { id: 'gildedHands', name: 'Gilded Hands', rarity: 'common', stack: 2, text: 'Material drops ×2.', lore: 'What falls from them falls into your hands, and stays there.', fx: { materials: 2 } },
  // ---- rare: the engines
  leechWick: { id: 'leechWick', name: 'Leech-Wick', rarity: 'rare', stack: 2, text: 'Each landed hit mends 1.5% of your HP.', lore: 'The flame in you has learned to feed. You do not ask it what on.', fx: { lifesteal: 0.015 } },
  graveMomentum: { id: 'graveMomentum', name: 'Grave-Momentum', rarity: 'rare', stack: 2, text: 'Damage +3% per kill this run, compounding.', lore: 'Each one makes the next one lighter. By the tenth you are not walking down; you are falling with intent.', fx: { momentum: 0.03 } },
  patientKnife: { id: 'patientKnife', name: 'Patient Knife', rarity: 'rare', stack: 2, text: 'Damage +2% per second on a floor; resets on the next.', lore: 'Wait. Watch it breathe. Then find the place where it does not.', fx: { patience: 0.02 } },
  thornedShroud: { id: 'thornedShroud', name: 'Thorned Shroud', rarity: 'rare', stack: 2, text: 'A hit that lands on you costs the striker 4% of its HP. Damage taken −10%.', lore: 'Whatever you are wearing has grown teeth on the inside, and on the outside.', fx: { thorns: 0.04, taken: 0.9 } },
  reliquaryDraught: { id: 'reliquaryDraught', name: 'Reliquary Draught', rarity: 'rare', stack: 1, text: 'Tallowdraughts refill when a floor is cleared.', lore: 'The flask is never empty when you look, and you have stopped looking.', fx: { draughtRefill: 1 } },
  wideReprisal: { id: 'wideReprisal', name: 'Wide Reprisal', rarity: 'rare', stack: 2, text: 'Reprisal damage +60%.', lore: 'When they stumble, you have already decided where the blade goes.', fx: { reprisal: 1.6 } },
  firstCut: { id: 'firstCut', name: 'First Cut', rarity: 'rare', stack: 2, text: 'The first hit on each enemy deals ×4.', lore: 'The opening line is the only one that matters. Everything after is argument.', fx: { firstHit: 4 } },
  shortStair: { id: 'shortStair', name: 'Short Stair', rarity: 'rare', stack: 1, text: 'Floors need one fewer kill.', lore: 'Some of the steps are missing. You have stopped counting the ones that are not.', fx: { killsNeeded: -1 } },
  usurersBank: { id: 'usurersBank', name: 'Usurer\'s Bank', rarity: 'rare', stack: 2, text: 'Bank multiplier +0.1 per floor.', lore: 'The deeper the debt, the better the terms. Someone down there wants you to keep going.', fx: { bankPerFloor: 0.1 } },
  openVein: { id: 'openVein', name: 'Open Vein', rarity: 'rare', stack: 1, text: 'Crits apply bleed.', lore: 'Precision has consequences. Yours have started to run.', fx: { bleedOnCrit: 1 } },
  woundDeepens: { id: 'woundDeepens', name: 'The Wound Deepens', rarity: 'rare', stack: 2, text: 'Status damage ×2.', lore: 'Poison, cold, an open wound: none of them are in a hurry any more, and none of them stop.', fx: { statusDmg: 2 } },
  // ---- epic: the ones that make the story
  glassMarrow: { id: 'glassMarrow', name: 'Glass Marrow', rarity: 'epic', stack: 1, text: 'Damage ×2. Damage taken ×2.', lore: 'You are brittle now and you are sharp now, and the stair will find out which first.', fx: { dmg: 2, taken: 2 } },
  avarice: { id: 'avarice', name: 'Avarice', rarity: 'epic', stack: 1, text: 'Haul ×2. Damage taken +40%.', lore: 'It is not that you want more. It is that you can no longer remember wanting anything else.', fx: { haul: 2, taken: 1.4 } },
  secondWaking: { id: 'secondWaking', name: 'A Second Waking', rarity: 'epic', stack: 1, text: 'Survive one killing blow at 1 HP.', lore: 'The Lantern has one more in it than it said. It will not say so twice.', fx: { secondWind: 1 } },
  severTheCost: { id: 'severTheCost', name: 'Sever the Cost', rarity: 'epic', stack: 1, text: 'Spells cost no FP.', lore: 'Whoever was keeping the ledger of what the Weaving costs has been paid off, or buried.', fx: { freeCasts: 1 } },
  critRot: { id: 'critRot', name: 'Crit-Rot', rarity: 'epic', stack: 1, text: 'Crit chance +15%. Crit damage ×2.', lore: 'Everything has a soft place. You have stopped hitting anywhere else.', fx: { crit: 0.15, critDmg: 2 } },
  lanternOil: { id: 'lanternOil', name: 'Lantern-Oil', rarity: 'epic', stack: 1, text: 'Drinking grants +80% damage for eight seconds.', lore: 'It is not tallow in the flask any more. It burns going down and keeps burning.', fx: { draughtDmg: 1.8 } },
  unendingWick: { id: 'unendingWick', name: 'Unending Wick', rarity: 'epic', stack: 1, text: 'Mend 2% of your HP every second. Haul −20%.', lore: 'Something down here wants you alive. The price is that it takes a cut.', fx: { hpRegen: 0.02, haul: 0.8 } },
};

export const BOON_ORDER = Object.keys(BOONS);
export const RARITY_WEIGHT: Record<BoonRarity, number> = { common: 60, rare: 30, epic: 10 };
