import type { BossDef, AttackPattern } from './types';

const atk = (id: string, name: string, windup: number, mult: number, weight = 2, extra: Partial<AttackPattern> = {}): AttackPattern => ({ id, name, windup, mult, weight, ...extra });

/**
 * Mechanics (resolved in engine/combat.ts):
 *  regen        heals mechParam × max HP per second unless bleeding / poisoned / frostbitten
 *  backdraft    more than mechParam player hits inside any 2s window retaliates for 8% of your max HP
 *  staggerOnly  takes only mechParam × damage unless staggered
 *  enrage       attack interval shrinks by mechParam per second of the phase (floor 40%)
 *  hymn         alternating 5s windows: while the hymn sounds, every hit you land reflects 4% of your max HP onto you
 *  blind        telegraphs are hidden: dodge on rhythm, not on sight (auto-dodge fails)
 */
export const BOSSES: Record<string, BossDef> = {
  // ---------------- Region 1 ----------------
  coldPyreWarden: {
    id: 'coldPyreWarden', name: 'Eskel', title: 'Warden of the Cold Pyre', zone: 'approach', secret: false,
    hpMult: 1.0, dmgMult: 1.0, poiseMult: 1.0, soulMult: 1.0, soulWeapon: 'wardenCleaver', soulSpell: 'pyreBloom',
    drops: { estusShard: 1, shard: 4 }, shape: 'warden',
    phases: [
      { name: 'The Watch', at: 1.0, attackInterval: 4.0, attacks: [atk('cleave', 'Cleave', 1.2, 1.2, 3), atk('overhead', 'Warden\'s Overhead', 1.9, 2.2, 1)], text: 'The Warden rises from the ash of his own pyre.' },
      { name: 'Backdraft', at: 0.6, attackInterval: 3.4, attacks: [atk('cleave', 'Cleave', 1.0, 1.3, 3), atk('sweep', 'Pyre Sweep', 1.4, 1.7, 2)], resist: { fire: 0.3 }, mechanic: 'backdraft', mechParam: 7, text: 'The cleaver ignites. Every strike feeds it. Strike too fast and the flame answers in kind.' },
      { name: 'Cold Pyre', at: 0.3, attackInterval: 3.0, attacks: [atk('cleave', 'Cleave', 0.9, 1.4, 3), atk('overhead', 'Warden\'s Overhead', 1.6, 2.6, 2)], mechanic: 'staggerOnly', mechParam: 0.15, text: 'The flame gutters. He plants his feet and will not be moved. Break his stance, or barely scratch him.' },
    ],
    lore: 'Eskel kept the Pyre for a hundred years after the last pilgrim. When it went cold he did not leave his post, because no one told him to. He is not angry with you. He is simply still on duty.',
  },
  hangedPilgrim: {
    id: 'hangedPilgrim', name: 'The Hanged Pilgrim', title: 'Who Would Not Stay Hanged', zone: 'approach', secret: true,
    hpMult: 1.0, dmgMult: 1.2, poiseMult: 1.3, soulMult: 1.0, soulWeapon: 'gallowsRope', soulSpell: 'lastRites',
    drops: { soulVessel: 1, largeShard: 3, boneShard: 1 }, shape: 'hanged',
    secretCondition: { kind: 'kills', zone: 'approach', count: 40 },
    phases: [
      { name: 'Swaying', at: 1.0, attackInterval: 3.2, attacks: [atk('swing', 'Swing', 1.1, 1.3, 3), atk('drop', 'Drop', 1.7, 2.0, 1)], mechanic: 'regen', mechParam: 0.02, text: 'The rope creaks. Where it frays, the flesh knits back. Only wounds that keep bleeding will stay open.' },
      { name: 'Cut Down', at: 0.5, attackInterval: 2.6, attacks: [atk('claw', 'Claw', 0.8, 1.1, 3), atk('strangle', 'Strangle', 1.5, 2.3, 1)], mechanic: 'regen', mechParam: 0.035, text: 'The rope snaps. It comes down running.' },
    ],
    lore: 'Hanged forty times by the Gallows Knights, and forty times found walking the road at dawn. On the forty-first they gave up and hanged themselves instead. It watched, and it waited, and it is very patient with those who kill on the Gallows Walk.',
  },
  // ---------------- Region 2 ----------------
  mireMother: {
    id: 'mireMother', name: 'Mother Nettle', title: 'Matron of the Drowned', zone: 'mire', secret: false,
    hpMult: 1.0, dmgMult: 1.0, poiseMult: 1.1, soulMult: 1.0, soulWeapon: 'mothersThorn', soulSpell: 'rotBloom',
    drops: { estusShard: 1, largeShard: 5, coal: 1 }, shape: 'hanged',
    phases: [
      { name: 'The Brood', at: 1.0, attackInterval: 3.6, attacks: [atk('lash', 'Nettle Lash', 1.0, 1.2, 3), atk('spit', 'Rot Spit', 1.3, 0.9, 2, { status: 'poison' })], resist: { fire: 1.3 }, statusResist: { poison: 0 }, mechanic: 'regen', mechParam: 0.015, text: 'She rises from the reeds with her children clinging to her. The Mire feeds her. Something must eat at her faster than it does.' },
      { name: 'Nettle Crown', at: 0.55, attackInterval: 3.0, attacks: [atk('lash', 'Nettle Lash', 0.9, 1.4, 3), atk('embrace', 'Drowning Embrace', 1.8, 2.6, 1)], resist: { fire: 1.3, physical: 0.85 }, statusResist: { poison: 0 }, mechanic: 'regen', mechParam: 0.025, text: 'The crown of thorns closes. Her wounds close with it. Bleed her, freeze her, or watch her mend.' },
      { name: 'Drowning', at: 0.25, attackInterval: 2.4, attacks: [atk('lash', 'Nettle Lash', 0.7, 1.5, 3), atk('embrace', 'Drowning Embrace', 1.5, 2.8, 2)], resist: { fire: 1.5 }, statusResist: { poison: 0 }, mechanic: 'enrage', mechParam: 0.01, text: 'The water rises. She has stopped mending and started hurrying.' },
    ],
    lore: 'She came to the Mire pregnant and the Mire delivered her of something. She has been a mother ever since, to the leeches, to the drowned, to anyone who stays long enough. Her love is patient and total and it is what poison would be if it could hold you.',
  },
  choirMaster: {
    id: 'choirMaster', name: 'The Choir-Master', title: 'Who Drowned the Hymn', zone: 'mire', secret: true,
    hpMult: 1.0, dmgMult: 1.3, poiseMult: 1.2, soulMult: 1.0, soulWeapon: 'bellHammer', soulSpell: 'drowningHymn',
    drops: { soulVessel: 1, largeShard: 4, boneShard: 1, coal: 1 }, shape: 'robed',
    secretCondition: { kind: 'kills', zone: 'mire', count: 45 },
    phases: [
      { name: 'Hymn', at: 1.0, attackInterval: 3.8, attacks: [atk('toll', 'Toll', 1.3, 1.5, 3), atk('chord', 'Drowning Chord', 1.9, 2.4, 1)], resist: { lightning: 0.5, physical: 0.8 }, mechanic: 'hymn', mechParam: 0.04, text: 'The hymn swells. While it sounds, every blow you land rings back through you. Strike in the silences.' },
      { name: 'Crescendo', at: 0.45, attackInterval: 2.8, attacks: [atk('toll', 'Toll', 1.0, 1.7, 3), atk('chord', 'Drowning Chord', 1.6, 2.8, 2)], resist: { lightning: 0.5, physical: 0.8 }, mechanic: 'hymn', mechParam: 0.06, text: 'Louder. The silences are shorter now. Make them count.' },
    ],
    lore: 'He led the Sunken Chapel\'s choir the night the water came, and kept them singing while it rose. They finished the hymn. He has been conducting it since, and takes a dim view of interruptions.',
  },
  // ---------------- Region 3 ----------------
  archivistNull: {
    id: 'archivistNull', name: 'Archivist Null', title: 'Who Read the Word', zone: 'archive', secret: false,
    hpMult: 1.0, dmgMult: 1.0, poiseMult: 1.2, soulMult: 1.0, soulWeapon: 'nullBlade', soulSpell: 'soulGreatsword',
    drops: { estusShard: 1, largeShard: 4, chunk: 2, coal: 1 }, shape: 'robed',
    phases: [
      { name: 'Cataloguing', at: 1.0, attackInterval: 3.8, attacks: [atk('bolt', 'Soul Bolt', 1.1, 1.3, 3), atk('shelf', 'Falling Shelf', 1.8, 2.3, 1)], resist: { magic: 0.4 }, text: 'The Archivist looks up from his desk. He has been expecting a new entry.' },
      { name: 'Recitation', at: 0.65, attackInterval: 3.2, attacks: [atk('bolt', 'Soul Bolt', 1.0, 1.4, 3), atk('unmaking', 'Unmaking', 2.2, 3.4, 1)], resist: { magic: 0.4, physical: 0.9 }, mechanic: 'staggerOnly', mechParam: 0.0, text: 'He begins to recite. Nothing touches him while the word is spoken. Break his concentration, and dodge the Unmaking above all.' },
      { name: 'Erasure', at: 0.3, attackInterval: 2.8, attacks: [atk('bolt', 'Soul Bolt', 0.9, 1.5, 3), atk('unmaking', 'Unmaking', 1.8, 3.6, 2)], resist: { magic: 0.4 }, mechanic: 'enrage', mechParam: 0.012, text: 'The word is nearly finished. He speaks faster.' },
    ],
    lore: 'The last archivist, who read the word the Archive was built to hide, and understood it, and was not unmade. This is considered by the scholars to be the worst possible outcome. He agrees, and keeps the Archive anyway, because someone must.',
  },
  theUnwritten: {
    id: 'theUnwritten', name: 'The Unwritten', title: 'What the Word Left Out', zone: 'archive', secret: true,
    hpMult: 1.0, dmgMult: 1.4, poiseMult: 0.9, soulMult: 1.0, soulWeapon: 'unwrittenEdge', soulSpell: 'unwriting',
    drops: { soulVessel: 1, chunk: 3, boneShard: 1 }, shape: 'wraith',
    secretCondition: { kind: 'kills', zone: 'archive', count: 50 },
    phases: [
      { name: 'Margins', at: 1.0, attackInterval: 3.0, attacks: [atk('flicker', 'Flicker', 0.7, 1.2, 3), atk('blot', 'Blot', 1.5, 2.2, 1)], resist: { magic: 0.3, physical: 0.7, fire: 1.4 }, statusResist: { bleed: 0, poison: 0 }, mechanic: 'blind', mechParam: 1, text: 'It has no outline. Its blows come from nowhere you can see. Learn its rhythm, and roll to it.' },
      { name: 'Erasure', at: 0.5, attackInterval: 2.6, attacks: [atk('flicker', 'Flicker', 0.6, 1.4, 3), atk('blot', 'Blot', 1.3, 2.6, 2)], resist: { magic: 0.3, physical: 0.7, fire: 1.4 }, statusResist: { bleed: 0, poison: 0 }, mechanic: 'backdraft', mechParam: 5, text: 'Now it writes back. Strike too often and it strikes the same word through you.' },
    ],
    lore: 'Every word the Archive refused to keep, gathered in the margins into something that resents having been left out. It is not a ghost. It is an omission, and omissions, unlike ghosts, can be corrected.',
  },
  // ---------------- Region 4 ----------------
  saintOrvane: {
    id: 'saintOrvane', name: 'Saint Orvane', title: 'The Lantern Warden', zone: 'sanctum', secret: false,
    hpMult: 1.0, dmgMult: 1.0, poiseMult: 1.3, soulMult: 1.0, soulWeapon: 'lanternBlade', soulSpell: 'lanternLight',
    drops: { estusShard: 1, chunk: 5, coal: 1 }, shape: 'knight',
    phases: [
      { name: 'Vigil', at: 1.0, attackInterval: 3.8, attacks: [atk('thrust', 'Lightning Thrust', 1.1, 1.5, 3), atk('sunder', 'Sunder', 1.9, 2.5, 1)], resist: { lightning: 0.3, dark: 1.4 }, text: 'The Saint lifts the lantern. Its light finds you, and does not let go.' },
      { name: 'Lantern', at: 0.7, attackInterval: 3.4, attacks: [atk('thrust', 'Lightning Thrust', 1.0, 1.6, 3), atk('flare', 'Lantern Flare', 1.6, 2.4, 2)], resist: { lightning: 0.3, dark: 1.4 }, mechanic: 'hymn', mechParam: 0.05, text: 'The lantern pulses. Strike while it glows and the light burns you back. Wait for the dark between.' },
      { name: 'Storm Oath', at: 0.4, attackInterval: 2.8, attacks: [atk('thrust', 'Lightning Thrust', 0.9, 1.8, 3), atk('sunder', 'Sunder', 1.6, 3.0, 2)], resist: { lightning: 0.2, dark: 1.4, physical: 0.85 }, mechanic: 'staggerOnly', mechParam: 0.2, text: 'She swears the oath aloud and the storm takes her side. Only a broken stance lets steel through.' },
    ],
    lore: 'Orvane was the first to volunteer for the Vigil and the only one who never asked to be relieved. The lantern has been in her hand so long that the hand has gone; the lantern is held by the Saint\'s certainty alone. It has not flickered in an age. She would like to keep it that way.',
  },
  deaconUnburied: {
    id: 'deaconUnburied', name: 'The Deacon Unburied', title: 'Who Called the Storm Once Too Often', zone: 'sanctum', secret: true,
    hpMult: 1.0, dmgMult: 1.5, poiseMult: 1.0, soulMult: 1.0, soulWeapon: 'stormTalisman', soulSpell: 'stormCall',
    drops: { soulVessel: 1, chunk: 4, boneShard: 1, slab: 1 }, shape: 'robed',
    secretCondition: { kind: 'kills', zone: 'sanctum', count: 55 },
    phases: [
      { name: 'Sermon', at: 1.0, attackInterval: 3.6, attacks: [atk('bolt', 'Storm Bolt', 1.5, 2.2, 3), atk('spark', 'Spark', 0.8, 1.0, 2)], resist: { lightning: 0.2, dark: 1.2 }, mechanic: 'regen', mechParam: 0.02, text: 'He preaches, and the storm mends him as he speaks. Silence him with rot or cold.' },
      { name: 'Thunderhead', at: 0.5, attackInterval: 2.4, attacks: [atk('bolt', 'Storm Bolt', 1.2, 2.6, 3), atk('strike', 'Strike', 0.5, 1.4, 3)], resist: { lightning: 0.2, dark: 1.2 }, mechanic: 'enrage', mechParam: 0.015, text: 'The storm arrives. It is not patient.' },
    ],
    lore: 'A deacon who called the lightning down so many times that when he died it would not stop coming. They buried him under the Storm Steps. The Steps are named for what happened next.',
  },
  // ---------------- Region 5 ----------------
  keeperOfTheDeep: {
    id: 'keeperOfTheDeep', name: 'The Keeper', title: 'Of the Deep and What Sleeps There', zone: 'deep', secret: false,
    hpMult: 1.0, dmgMult: 1.0, poiseMult: 1.4, soulMult: 1.0, soulWeapon: 'keepersBlackblade', soulSpell: 'blackFlame',
    drops: { estusShard: 1, chunk: 6, slab: 1, coal: 1 }, shape: 'warden',
    phases: [
      { name: 'The Gate', at: 1.0, attackInterval: 3.8, attacks: [atk('blackthrust', 'Black Thrust', 1.1, 1.6, 3), atk('close', 'Close the Gate', 2.0, 2.8, 1)], resist: { dark: 0.2, lightning: 1.2 }, text: 'The Keeper stands before the gate. It has stood there since before the fire. It sees no reason to stop.' },
      { name: 'Lights Out', at: 0.65, attackInterval: 3.2, attacks: [atk('blackthrust', 'Black Thrust', 1.0, 1.7, 3), atk('grasp', 'Grasp from Below', 1.5, 2.4, 2)], resist: { dark: 0.2, physical: 0.85 }, mechanic: 'blind', mechParam: 1, text: 'It puts out the light. You will not see the blows coming. Count them.' },
      { name: 'What Sleeps', at: 0.3, attackInterval: 2.6, attacks: [atk('blackthrust', 'Black Thrust', 0.9, 1.9, 3), atk('close', 'Close the Gate', 1.7, 3.4, 2)], resist: { dark: 0.1, physical: 0.8 }, mechanic: 'staggerOnly', mechParam: 0.12, text: 'Something behind the gate stirs. The Keeper braces against it, and against you. Nothing but a broken stance lets you through.' },
    ],
    lore: 'Nobody set the Keeper at the gate. It was there when the first explorers arrived, and it explained, without words, that they would go no further. It is not guarding the Deep from you. It is guarding you from the Deep, and it is very good at its job.',
  },
  namelessWanderer: {
    id: 'namelessWanderer', name: 'The Nameless Wanderer', title: 'Who Walked Down and Kept Walking', zone: 'deep', secret: true,
    hpMult: 1.0, dmgMult: 1.6, poiseMult: 0.8, soulMult: 1.0, soulWeapon: 'wanderersTwinblades', soulSpell: 'wanderersStep',
    drops: { soulVessel: 2, chunk: 5, boneShard: 1, slab: 1 }, shape: 'humanoid',
    secretCondition: { kind: 'kills', zone: 'deep', count: 60 },
    phases: [
      { name: 'Wanderer', at: 1.0, attackInterval: 2.6, attacks: [atk('twin', 'Twin Cut', 0.7, 1.3, 4), atk('vault', 'Vault', 1.3, 2.4, 1)], resist: { dark: 0.6, magic: 0.8 }, mechanic: 'backdraft', mechParam: 6, text: 'A hollow like you, who came down here long ago. It fights the way you do. It punishes the way you would.' },
      { name: 'Remembering', at: 0.5, attackInterval: 2.2, attacks: [atk('twin', 'Twin Cut', 0.6, 1.5, 4), atk('vault', 'Vault', 1.1, 2.8, 2)], resist: { dark: 0.6, magic: 0.8 }, mechanic: 'regen', mechParam: 0.03, text: 'It remembers Estus. Its wounds close between your strikes. Keep them open.' },
    ],
    lore: 'An undead who walked the same road you did, and beat the same lords, and came down here looking for the end of it. It found no end. It found the dark, and the dark taught it to wait for the next one to come down. Its name was on a bloodstain that no one ever recovered.',
  },
  // ---------------- Region 6 ----------------
  lordOfCinders: {
    id: 'lordOfCinders', name: 'The Lord of Cinders', title: 'Who Fed the Flame Himself', zone: 'kiln', secret: false,
    hpMult: 1.2, dmgMult: 1.1, poiseMult: 1.5, soulMult: 1.5, soulWeapon: 'lordsEmberSword', soulSpell: 'sunlightSpear',
    drops: { estusShard: 1, slab: 2, chunk: 6, coal: 2 }, shape: 'warden',
    phases: [
      { name: 'The Throne', at: 1.0, attackInterval: 3.6, attacks: [atk('cinder', 'Cinder Slash', 1.0, 1.6, 3), atk('kindling', 'Kindling', 1.9, 2.8, 1)], resist: { fire: 0.2 }, statusResist: { frost: 0.5 }, text: 'The Lord rises from the Kiln. He has been waiting for fuel, and here you are.' },
      { name: 'Backdraft', at: 0.75, attackInterval: 3.2, attacks: [atk('cinder', 'Cinder Slash', 0.9, 1.7, 3), atk('sweep', 'Ember Sweep', 1.4, 2.2, 2)], resist: { fire: 0.2 }, mechanic: 'backdraft', mechParam: 6, text: 'Every blow feeds the fire. Feed it too fast and it feeds on you.' },
      { name: 'Lord\'s Stance', at: 0.5, attackInterval: 2.9, attacks: [atk('cinder', 'Cinder Slash', 0.85, 1.9, 3), atk('kindling', 'Kindling', 1.6, 3.2, 2)], resist: { fire: 0.15, physical: 0.85 }, mechanic: 'staggerOnly', mechParam: 0.15, text: 'He plants the great sword and will not be moved. Break him, or do nothing.' },
      { name: 'Cinders', at: 0.22, attackInterval: 2.4, attacks: [atk('cinder', 'Cinder Slash', 0.7, 2.1, 3), atk('kindling', 'Kindling', 1.4, 3.6, 2), atk('sweep', 'Ember Sweep', 1.0, 2.4, 2)], resist: { fire: 0.1 }, mechanic: 'enrage', mechParam: 0.014, text: 'What is left of him burns faster than it should. It will not last. Neither, perhaps, will you.' },
    ],
    lore: 'He linked the fire when it first faltered, and when it faltered again he did not wait for another to do it. He has fed it himself, piece by piece, for longer than the world has kept records. There is very little of him left that is not flame. He does not consider this a loss.',
  },
  firstEmber: {
    id: 'firstEmber', name: 'The First Ember', title: 'Before the Fire Had a Name', zone: 'kiln', secret: true,
    hpMult: 1.4, dmgMult: 1.5, poiseMult: 1.6, soulMult: 2.0, soulWeapon: 'firstBlade', soulSpell: 'firstFlame',
    drops: { soulVessel: 2, slab: 3, boneShard: 2, darkEmber: 3 }, shape: 'wraith',
    secretCondition: { kind: 'kills', zone: 'kiln', count: 70 },
    phases: [
      { name: 'Before', at: 1.0, attackInterval: 3.0, attacks: [atk('spark', 'The Spark', 0.8, 1.6, 3), atk('dawn', 'Dawn', 1.8, 3.0, 1)], resist: { fire: 0.1, dark: 0.5, magic: 0.8 }, statusResist: { poison: 0.3 }, mechanic: 'blind', mechParam: 1, text: 'It is too bright to see. You will feel the blows before you see them. Count.' },
      { name: 'Kindling', at: 0.6, attackInterval: 2.6, attacks: [atk('spark', 'The Spark', 0.7, 1.8, 3), atk('dawn', 'Dawn', 1.5, 3.4, 2)], resist: { fire: 0.1, dark: 0.5 }, mechanic: 'regen', mechParam: 0.025, text: 'It rekindles from its own heat. Only cold, or rot, or blood keeps it from closing.' },
      { name: 'Age of Fire', at: 0.3, attackInterval: 2.2, attacks: [atk('spark', 'The Spark', 0.6, 2.0, 3), atk('dawn', 'Dawn', 1.3, 3.8, 2)], resist: { fire: 0.05, dark: 0.4, physical: 0.8 }, mechanic: 'enrage', mechParam: 0.016, text: 'The first age, again, all at once.' },
    ],
    lore: 'Before the Lord, before the Kiln, before there was a word for burning. The fire that everything else is a copy of. It does not know that you are there. It has never known that anything is there. That is the terrible thing about it.',
  },
  // ---------------- Cycle bosses (NG+ only, no soul: they drop Dark Embers) ----------------
  deserterCaptain: {
    id: 'deserterCaptain', name: 'Captain Vell', title: 'Who Deserted Twice', zone: 'approach', secret: false, cycle: 1, noSoul: true,
    hpMult: 1.1, dmgMult: 1.2, poiseMult: 1.2, soulMult: 1.2, soulWeapon: 'deserterSpear', soulSpell: 'pyreBloom',
    drops: { darkEmber: 2, slab: 1, soulVessel: 1 }, shape: 'archer',
    phases: [
      { name: 'Volley', at: 1.0, attackInterval: 3.6, attacks: [atk('volley', 'Volley', 1.8, 2.4, 2), atk('jab', 'Jab', 0.7, 0.9, 3)], resist: {}, text: 'The crossbows of the whole garrison, in one pair of hands. He deserted the Watch, and then he deserted the deserters.' },
      { name: 'Last Stand', at: 0.5, attackInterval: 2.6, attacks: [atk('volley', 'Volley', 1.4, 2.8, 3), atk('jab', 'Jab', 0.6, 1.1, 2)], resist: { physical: 0.8 }, mechanic: 'enrage', mechParam: 0.015, text: 'Cornered. He has been cornered before.' },
    ],
    lore: 'Vell was captain of the Toll Gate garrison until the pay stopped, and captain of the deserters until they realised he would sell them too. In the second burning of the road he came back to the Gate, because there is nowhere else he has ever been able to stand.',
  },
  choirOfTeeth: {
    id: 'choirOfTeeth', name: 'The Choir of Teeth', title: 'What the Mire Sings With', zone: 'mire', secret: false, cycle: 2, noSoul: true,
    hpMult: 1.2, dmgMult: 1.3, poiseMult: 1.0, soulMult: 1.3, soulWeapon: 'fenRapier', soulSpell: 'rotBloom',
    drops: { darkEmber: 3, slab: 1, soulVessel: 1 }, shape: 'beast',
    phases: [
      { name: 'Many Mouths', at: 1.0, attackInterval: 2.4, attacks: [atk('bite', 'Bite', 0.6, 1.1, 4), atk('swarm', 'Swarm', 1.4, 2.4, 1, { status: 'poison' })], resist: { fire: 1.4 }, statusResist: { poison: 0, bleed: 1.4 }, mechanic: 'regen', mechParam: 0.02, text: 'Every leech in the Mire, singing with one throat. It mends as fast as it feeds. Make it bleed.' },
      { name: 'Chorus', at: 0.45, attackInterval: 1.9, attacks: [atk('bite', 'Bite', 0.5, 1.3, 4), atk('swarm', 'Swarm', 1.2, 2.8, 2, { status: 'poison' })], resist: { fire: 1.4 }, statusResist: { poison: 0, bleed: 1.4 }, mechanic: 'hymn', mechParam: 0.04, text: 'The song has a beat now. Strike between them.' },
    ],
    lore: 'When the Choir-Master drowned for the second time, the leeches learned the hymn. They sing it with their mouths open, which is the only way leeches can sing. It is not a pleasant sound, but it is, in its way, a devout one.',
  },
  custodianPrime: {
    id: 'custodianPrime', name: 'The Custodian Prime', title: 'The First Shelf', zone: 'archive', secret: false, cycle: 3, noSoul: true,
    hpMult: 1.4, dmgMult: 1.2, poiseMult: 2.0, soulMult: 1.4, soulWeapon: 'custodianGreatmace', soulSpell: 'soulArrow',
    drops: { darkEmber: 4, slab: 2, soulVessel: 1 }, shape: 'shield',
    phases: [
      { name: 'Ward', at: 1.0, attackInterval: 4.2, attacks: [atk('slam', 'Shelf Slam', 1.8, 2.6, 2), atk('shove', 'Shove', 0.9, 1.2, 3)], resist: { physical: 0.5, magic: 1.3 }, mechanic: 'staggerOnly', mechParam: 0.1, text: 'The first custodian, plated in the word itself. Nothing but a broken stance gets through the plates.' },
      { name: 'Unshelved', at: 0.4, attackInterval: 3.0, attacks: [atk('slam', 'Shelf Slam', 1.4, 3.0, 3), atk('shove', 'Shove', 0.7, 1.4, 2)], resist: { physical: 0.6, magic: 1.3 }, mechanic: 'enrage', mechParam: 0.012, text: 'The plates come loose. So does the custodian.' },
    ],
    lore: 'The first custodian the Archive made, from the first sorcerer who read the word. It has guarded the first shelf so long that the shelf is part of it. In the third burning it woke, and did not remember why it was there, and decided that was reason enough.',
  },
  twinSentinels: {
    id: 'twinSentinels', name: 'The Twin Sentinels', title: 'Oath and Counter-Oath', zone: 'sanctum', secret: false, cycle: 4, noSoul: true,
    hpMult: 1.6, dmgMult: 1.3, poiseMult: 2.2, soulMult: 1.6, soulWeapon: 'vigilMaul', soulSpell: 'force',
    drops: { darkEmber: 5, slab: 2, soulVessel: 1 }, shape: 'shield',
    phases: [
      { name: 'In Step', at: 1.0, attackInterval: 3.4, attacks: [atk('twinsweep', 'Twin Sweep', 1.3, 2.0, 3), atk('pincer', 'Pincer', 1.9, 3.0, 1)], resist: { physical: 0.55, lightning: 0.5 }, statusResist: { bleed: 0, poison: 0 }, mechanic: 'hymn', mechParam: 0.05, text: 'Two suits, one oath. When their halberds cross, striking either rings through you. Wait for them to part.' },
      { name: 'Out of Step', at: 0.5, attackInterval: 2.6, attacks: [atk('twinsweep', 'Twin Sweep', 1.0, 2.4, 3), atk('pincer', 'Pincer', 1.5, 3.4, 2)], resist: { physical: 0.6, lightning: 0.5 }, statusResist: { bleed: 0, poison: 0 }, mechanic: 'staggerOnly', mechParam: 0.2, text: 'One falls behind the other. Break the stance of the one that stands.' },
    ],
    lore: 'Two suits of silver that swore the Vigil together and were emptied together. They do not know which of them was which, and so they move as one, and hate as one, and fall, if they fall, as one.',
  },
  drownedSun: {
    id: 'drownedSun', name: 'The Drowned Sun', title: 'Light That Went Down', zone: 'deep', secret: false, cycle: 5, noSoul: true,
    hpMult: 1.8, dmgMult: 1.4, poiseMult: 1.8, soulMult: 2.0, soulWeapon: 'paleDagger', soulSpell: 'lightningSpear',
    drops: { darkEmber: 8, slab: 3, soulVessel: 2 }, shape: 'wraith',
    phases: [
      { name: 'Setting', at: 1.0, attackInterval: 3.2, attacks: [atk('ray', 'Last Ray', 1.4, 2.4, 3), atk('eclipse', 'Eclipse', 2.0, 3.6, 1)], resist: { dark: 0.3, fire: 0.5, lightning: 0.4 }, mechanic: 'blind', mechParam: 1, text: 'A sun, down here, too bright to look at. You will not see its blows. You will only feel the warmth first.' },
      { name: 'Drowned', at: 0.55, attackInterval: 2.8, attacks: [atk('ray', 'Last Ray', 1.2, 2.8, 3), atk('eclipse', 'Eclipse', 1.7, 4.0, 2)], resist: { dark: 0.3, fire: 0.5 }, mechanic: 'regen', mechParam: 0.03, text: 'It draws heat from the dark to mend itself. Keep the wound cold or rotten.' },
      { name: 'Gone', at: 0.2, attackInterval: 2.0, attacks: [atk('ray', 'Last Ray', 0.9, 3.2, 3), atk('eclipse', 'Eclipse', 1.4, 4.4, 2)], resist: { dark: 0.2, fire: 0.5 }, mechanic: 'enrage', mechParam: 0.02, text: 'The last light, going out fast.' },
    ],
    lore: 'The sun the Vigil waited for. It rose, once, in the fifth burning, and looked at the world, and went down into the Deep instead. It has been down there since, and it is not coming back up, and it does not want visitors.',
  },
  abyssWatcher: {
    id: 'abyssWatcher', name: 'The Watcher', title: 'At the Bottom of the Stair', zone: 'abyss', secret: false, noSoul: true,
    hpMult: 1.3, dmgMult: 1.2, poiseMult: 1.5, soulMult: 1.6, soulWeapon: 'abyssGreatsword', soulSpell: 'darkOrb',
    drops: { darkEmber: 6, slab: 2, soulVessel: 1 }, shape: 'wraith',
    phases: [
      { name: 'Watching', at: 1.0, attackInterval: 3.2, attacks: [atk('gaze', 'Gaze', 1.2, 1.8, 3), atk('descent', 'Descent', 1.9, 3.0, 1)], resist: { dark: 0.2, magic: 0.7, fire: 0.9 }, mechanic: 'blind', mechParam: 1, text: 'It has watched you all the way down. Now it watches from inside the dark. Count the blows.' },
      { name: 'Counting', at: 0.6, attackInterval: 2.8, attacks: [atk('gaze', 'Gaze', 1.0, 2.0, 3), atk('descent', 'Descent', 1.6, 3.4, 2)], resist: { dark: 0.2, magic: 0.7 }, mechanic: 'staggerOnly', mechParam: 0.15, text: 'It braces on the last step. Only a broken stance moves it.' },
      { name: 'Deeper', at: 0.3, attackInterval: 2.4, attacks: [atk('gaze', 'Gaze', 0.8, 2.2, 3), atk('descent', 'Descent', 1.3, 3.8, 2)], resist: { dark: 0.15, magic: 0.7 }, mechanic: 'enrage', mechParam: 0.016, text: 'It steps back into the dark, and the stair goes on. So must you.' },
    ],
    lore: 'Every stair has a bottom, and at the bottom of this one something waits that has never once been reached. When you strike it down the stair simply continues, and it is waiting again, one landing further, a little larger. It does not mind. It has all the depth in the world.',
  },
};
