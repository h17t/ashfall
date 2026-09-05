/** Spell icons (96), creed seals (128), item icons (96), UI plates. */
import type { Plate, Layer } from './compose';
import { rng, blob, taper, jitter, flame, type Pt } from './svg-parts';
import { humanoid } from './parts';
import type { PaletteKey } from './palette';
import { SPELLS, CREEDS, MATERIALS, BOONS, AFFIXES, ARTS, SETS, TOLL_PHASES } from '../../src/content';

const ring = (c: number, rad: number, r: ReturnType<typeof rng>, tone = 0.3): Layer[] => [
  { kind: 'mass', pts: blob(c, c, rad, rad, r, 0.06, 24), z: 1, tone },
  { kind: 'detail', pts: blob(c, c, rad * 0.86, rad * 0.86, r, 0.05, 24), color: 'ink', alpha: 0.9, z: 2 },
];

function motif(kind: string, c: number, r: ReturnType<typeof rng>, color: PaletteKey): Layer[] {
  const L: Layer[] = [];
  switch (kind) {
    case 'arrow': L.push({ kind: 'detail', pts: taper([c - 30, c + 26], [c + 30, c - 26], 10, 1, r, 0.5, 5), color, alpha: 0.95, z: 5 }); L.push({ kind: 'glow', cx: c + 24, cy: c - 20, r: 14, color, z: 9 }); break;
    case 'arrows': for (const d of [-14, 0, 14]) L.push({ kind: 'detail', pts: taper([c - 26 + d, c + 24 - d * 0.4], [c + 24 + d, c - 26 - d * 0.4], 7, 1, r, 0.4, 4), color, alpha: 0.9, z: 5 }); L.push({ kind: 'glow', cx: c + 20, cy: c - 22, r: 16, color, z: 9 }); break;
    case 'spear': L.push({ kind: 'detail', pts: taper([c - 34, c + 34], [c + 26, c - 26], 6, 2, r, 0.3, 4), color, alpha: 0.9, z: 5 }); L.push({ kind: 'detail', pts: jitter([[c + 22, c - 22], [c + 36, c - 36], [c + 30, c - 16]], r, 1), color, alpha: 0.95, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c + 30, cy: c - 30, r: 14, color, z: 9 }); break;
    case 'crystal': L.push({ kind: 'detail', pts: jitter([[c, c - 36], [c + 16, c - 8], [c + 8, c + 32], [c - 8, c + 32], [c - 16, c - 8]], r, 1), color, alpha: 0.95, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c - 6, r: 22, color, z: 9 }); break;
    case 'storm': for (let i = 0; i < 3; i++) L.push({ kind: 'detail', pts: jitter([[c - 20 + i * 18, c - 34], [c - 30 + i * 18, c + 2], [c - 20 + i * 18, c + 2], [c - 32 + i * 18, c + 34]], r, 1), color, alpha: 0.85, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c - 10, r: 26, color, z: 9 }); break;
    case 'rope': L.push({ kind: 'detail', pts: taper([c - 26, c - 30], [c + 10, c + 30], 5, 5, r, 2, 8), color, alpha: 0.95, z: 5 }); L.push({ kind: 'detail', pts: blob(c + 12, c + 30, 10, 8, r, 0.2, 8), color, alpha: 0.95, z: 5 }); break;
    case 'oath': L.push({ kind: 'detail', pts: taper([c, c + 30], [c, c - 28], 8, 3, r, 0.3, 4), color, alpha: 0.95, z: 5 }); L.push({ kind: 'detail', pts: jitter([[c - 22, c - 4], [c + 22, c - 4], [c + 22, c + 2], [c - 22, c + 2]], r, 0.5), color, alpha: 0.95, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c - 24, r: 12, color: 'gold', z: 9 }); break;
    case 'ring': L.push({ kind: 'detail', pts: blob(c, c, 24, 24, r, 0.08, 20), color, alpha: 0.85, z: 5 }); L.push({ kind: 'detail', pts: blob(c, c, 15, 15, r, 0.08, 16), color: 'ink', alpha: 0.95, z: 6 }); L.push({ kind: 'glow', cx: c, cy: c, r: 14, color, z: 9 }); break;
    case 'orb': L.push({ kind: 'glow', cx: c, cy: c, r: 30, color, z: 9 }); L.push({ kind: 'detail', pts: blob(c, c, 14, 14, r, 0.2, 14), color, alpha: 0.9, z: 5 }); break;
    case 'flame': L.push({ kind: 'detail', pts: flame(c, c + 30, r, 62, 40), color, alpha: 0.95, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c + 6, r: 22, color: 'emberHot', z: 9 }); break;
    case 'bolt': L.push({ kind: 'detail', pts: jitter([[c + 8, c - 34], [c - 10, c + 2], [c + 2, c + 2], [c - 8, c + 34], [c + 14, c - 6], [c + 2, c - 6]], r, 1), color, alpha: 0.95, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c, r: 20, color, z: 9 }); break;
    case 'hand': L.push({ kind: 'detail', pts: jitter([[c - 16, c + 30], [c - 20, c - 4], [c - 12, c - 24], [c - 6, c - 2], [c, c - 30], [c + 6, c - 2], [c + 12, c - 26], [c + 16, c - 2], [c + 20, c + 6], [c + 14, c + 30]], r, 1), color, alpha: 0.95, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c - 6, r: 18, color, z: 9 }); break;
    case 'mist': for (let i = 0; i < 5; i++) L.push({ kind: 'detail', pts: blob(c - 20 + i * 10, c + 10 - (i % 2) * 14, 12, 8, r, 0.3, 10), color, alpha: 0.6, z: 5 }); break;
    case 'sun': L.push({ kind: 'glow', cx: c, cy: c, r: 34, color: 'gold', z: 9 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; L.push({ kind: 'detail', pts: taper([c + Math.cos(a) * 14, c + Math.sin(a) * 14], [c + Math.cos(a) * 34, c + Math.sin(a) * 34], 5, 1, r, 0.3, 3), color: 'gold', alpha: 0.9, z: 5 }); } break;
    case 'sword': L.push({ kind: 'detail', pts: taper([c, c + 32], [c, c - 30], 9, 2, r, 0.3, 4), color, alpha: 0.95, z: 5 }); L.push({ kind: 'detail', pts: jitter([[c - 16, c + 8], [c + 16, c + 8], [c + 16, c + 13], [c - 16, c + 13]], r, 0.5), color, alpha: 0.95, smooth: false, z: 5 }); break;
    case 'skull': L.push({ kind: 'detail', pts: blob(c, c - 4, 20, 22, r, 0.08, 14), color, alpha: 0.95, z: 5 }); L.push({ kind: 'detail', pts: blob(c - 8, c - 6, 5, 6, r, 0.1, 8), color: 'ink', alpha: 1, z: 6 }); L.push({ kind: 'detail', pts: blob(c + 8, c - 6, 5, 6, r, 0.1, 8), color: 'ink', alpha: 1, z: 6 }); break;
    case 'veil': L.push({ kind: 'detail', pts: jitter([[c - 30, c - 10], [c, c - 34], [c + 30, c - 10], [c + 22, c + 32], [c - 22, c + 32]], r, 2), color, alpha: 0.5, z: 5 }); break;
    case 'lantern': L.push({ kind: 'detail', pts: jitter([[c - 14, c - 22], [c + 14, c - 22], [c + 18, c + 20], [c - 18, c + 20]], r, 1), color: 'ash', alpha: 0.9, smooth: false, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c, r: 22, color: 'gold', z: 9 }); break;
    case 'step': L.push({ kind: 'detail', pts: jitter([[c - 24, c + 24], [c - 8, c - 10], [c + 8, c + 4], [c + 26, c - 26]], r, 1.5), color, alpha: 0.9, smooth: false, z: 5 }); break;
    case 'drop': L.push({ kind: 'detail', pts: jitter([[c, c - 30], [c + 18, c + 6], [c + 12, c + 26], [c - 12, c + 26], [c - 18, c + 6]], r, 1.5), color, alpha: 0.95, z: 5 }); break;
  }
  return L;
}

const SPELL_MOTIF: Record<string, [string, PaletteKey]> = {
  marrowDart: ['arrow', 'wisp'], greatMarrowDart: ['arrows', 'wisp'], marrowSpike: ['spear', 'wisp'], glassSpike: ['crystal', 'parchment'], wovenEdge: ['sword', 'wisp'], frostLance: ['spear', 'parchment'], hush: ['veil', 'wisp'], marrowCleaver: ['oath', 'wisp'], unwriting: ['ring', 'wisp'], namelessStep: ['step', 'wisp'],
  heal: ['hand', 'gold'], shove: ['ring', 'gold'], stormJavelin: ['bolt', 'gold'], greatStormJavelin: ['storm', 'gold'], knitting: ['drop', 'gold'], swornLitany: ['oath', 'gold'], bountifulLight: ['sun', 'gold'], daybreakJavelin: ['spear', 'gold'], lastRites: ['skull', 'gold'], drowningHymn: ['mist', 'wisp'], lanternLight: ['lantern', 'gold'], stormCall: ['storm', 'gold'],
  pyreBloom: ['flame', 'ember'], flare: ['flame', 'ember'], gout: ['orb', 'ember'], rotBreath: ['mist', 'verdigris'], marrowBurn: ['flame', 'bloodBright'], ruinousGout: ['orb', 'ember'], hearth: ['hand', 'ember'], blackTallow: ['flame', 'wisp'], rotBloom: ['drop', 'verdigris'], firstWickSpell: ['sun', 'emberHot'],
  nadirOrb: ['orb', 'wisp'], deadAgain: ['skull', 'wisp'], numbness: ['veil', 'ash'],
};

export function spellPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 48;
  const [m, color] = SPELL_MOTIF[id] ?? ['orb', 'wisp'];
  const sp = SPELLS[id];
  const tint: PaletteKey = sp?.school === 'weaving' ? 'wisp' : sp?.school === 'litany' ? 'gold' : sp?.school === 'ruin' ? 'ember' : 'wisp';
  return { id, w: 96, h: 96, seed, tint, fire: [0.2, 1.0], layers: [...ring(c, 44, r), ...motif(m, c, r, color)], bleed: 1.6 };
}

const SEAL_MOTIF: Record<string, [string, PaletteKey]> = { wick: ['flame', 'ember'], legion: ['oath', 'bone'], rot: ['drop', 'verdigris'], vigil: ['lantern', 'gold'], nadir: ['ring', 'wisp'] };

export function covenantPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 64;
  const [m, color] = SEAL_MOTIF[id] ?? ['orb', 'bone'];
  // a wax seal: blob of blood-dark wax with a pressed ring and the motif
  // a wax seal: a spilled wax blob, a raised pressed rim (lighter), the motif pressed into it
  const L: Layer[] = [
    { kind: 'mass', pts: blob(c, c + 2, 58, 54, r, 0.16, 28), z: 1, tone: 0.1 },
    { kind: 'detail', pts: blob(c, c, 48, 46, r, 0.05, 26), color: 'blood', alpha: 0.85, z: 2 },
    { kind: 'detail', pts: blob(c, c, 42, 40, r, 0.04, 26), color: 'bloodBright', alpha: 0.35, z: 3 },
    { kind: 'detail', pts: blob(c, c, 36, 34, r, 0.04, 26), color: 'blood', alpha: 0.9, z: 4 },
    { kind: 'line', pts: blob(c, c, 39, 37, r, 0.03, 26), width: 1.2, z: 5 },
    ...motif(m, c, r, color),
  ];
  void CREEDS[id];
  return { id, w: 128, h: 128, seed, tint: 'blood', fire: [0.2, 1.0], layers: L, bleed: 2.2 };
}

export function itemPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 48;
  const L: Layer[] = [];
  const shardish = ['coarseSlag', 'fineSlag', 'blackSlag', 'slagIngot'];
  if (shardish.includes(id)) {
    const n = id === 'coarseSlag' ? 1 : id === 'fineSlag' ? 2 : id === 'blackSlag' ? 1 : 1;
    const size = id === 'slagIngot' ? 40 : id === 'blackSlag' ? 36 : id === 'fineSlag' ? 30 : 26;
    for (let i = 0; i < n; i++) L.push({ kind: 'mass', pts: jitter(id === 'slagIngot' ? [[c - 40, c - 14], [c + 38, c - 22], [c + 40, c + 18], [c - 36, c + 24]] : [[c - size * 0.5 + i * 18, c + size * 0.6], [c - size * 0.2 + i * 18, c - size * 0.9], [c + size * 0.5 + i * 18, c - size * 0.2], [c + size * 0.3 + i * 18, c + size * 0.7]], r, 2), z: 2, tone: id === 'blackSlag' ? 0.1 : 0.45 });
    L.push({ kind: 'glow', cx: c + 6, cy: c - 4, r: 10, color: 'wisp', z: 9 });
  } else if (id === 'wickStub' || id === 'renderFat') {
    L.push({ kind: 'mass', pts: jitter([[c - 20, c + 30], [c - 12, c - 30], [c + 12, c - 30], [c + 20, c + 30]], r, 2), z: 2, tone: 0.5 });
    L.push({ kind: 'glow', cx: c, cy: c + 4, r: 22, color: id === 'wickStub' ? 'emberHot' : 'bone', z: 9 });
  } else if (id === 'reliquaryBone') {
    L.push({ kind: 'mass', pts: jitter([[c - 24, c + 34], [c - 16, c - 6], [c - 6, c - 32], [c + 6, c - 32], [c + 16, c - 6], [c + 24, c + 34]], r, 2), z: 2, tone: 0.35 });
    L.push({ kind: 'glow', cx: c, cy: c + 8, r: 18, color: 'wisp', z: 9 });
  } else if (id === 'pitchCoal') {
    L.push({ kind: 'mass', pts: blob(c, c + 6, 30, 24, r, 0.3, 14), z: 2, tone: 0 });
    L.push({ kind: 'glow', cx: c - 8, cy: c + 2, r: 10, color: 'ember', z: 9 }); L.push({ kind: 'glow', cx: c + 10, cy: c + 10, r: 8, color: 'ember', z: 9 });
  } else if (id === 'ember') {
    L.push({ kind: 'mass', pts: blob(c, c + 10, 22, 16, r, 0.3, 12), z: 2 });
    L.push({ kind: 'detail', pts: flame(c, c + 12, r, 52, 30), color: 'ember', alpha: 0.95, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c, r: 24, color: 'emberHot', z: 9 });
  } else if (id === 'dust') {
    L.push({ kind: 'mass', pts: blob(c, c + 10, 22, 16, r, 0.3, 12), z: 2 });
    L.push({ kind: 'detail', pts: flame(c, c + 12, r, 52, 30), color: 'ink', alpha: 0.95, z: 5 }); L.push({ kind: 'glow', cx: c, cy: c, r: 22, color: 'wisp', z: 9 });
  } else {
    L.push({ kind: 'mass', pts: blob(c, c, 28, 28, r, 0.2, 12), z: 2, tone: 0.3 });
  }
  void MATERIALS[id];
  return { id, w: 96, h: 96, seed, tint: null, fire: [0.2, 1.0], layers: L, bleed: 1.6 };
}

export function uiPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  if (id === 'lantern') {
    const cx = 160, gy = 210;
    const L: Layer[] = [];
    // coiled sword in a mound of ash and bones
    L.push({ kind: 'mass', pts: blob(cx, gy, 120, 26, r, 0.2, 20), z: 1, tone: 0.2 });
    for (let i = 0; i < 7; i++) L.push({ kind: 'mass', pts: taper([cx - 90 + i * 30, gy - 4], [cx - 70 + i * 26, gy - 30 - (i % 3) * 10], 9, 3, r, 1, 4), z: 2, tone: 0.5 });
    L.push({ kind: 'mass', pts: taper([cx + 6, gy - 10], [cx - 4, 30], 10, 3, r, 0.8, 8), z: 4, tone: 0.5 });
    L.push({ kind: 'mass', pts: jitter([[cx - 28, 78], [cx + 30, 72], [cx + 26, 84], [cx - 26, 90]], r, 1), z: 4, tone: 0.5 });
    L.push({ kind: 'detail', pts: flame(cx, gy - 12, r, 130, 90), color: 'ember', alpha: 0.9, z: 5 });
    L.push({ kind: 'detail', pts: flame(cx + 4, gy - 14, r, 80, 44), color: 'emberHot', alpha: 0.9, z: 6 });
    L.push({ kind: 'glow', cx, cy: gy - 40, r: 110, color: 'ember', z: 9 });
    return { id, w: 320, h: 240, seed, tint: 'ember', fire: [0.5, 0.85], layers: L, bleed: 2.5 };
  }
  if (id === 'remains') {
    const L: Layer[] = [{ kind: 'mass', pts: blob(64, 34, 52, 16, r, 0.35, 22), z: 1, tone: 0 }, { kind: 'detail', pts: blob(64, 34, 40, 12, r, 0.3, 18), color: 'blood', alpha: 0.8, z: 2 }, { kind: 'glow', cx: 64, cy: 32, r: 28, color: 'bloodBright', z: 9 }];
    return { id, w: 128, h: 64, seed, tint: 'blood', layers: L, bleed: 2 };
  }
  // revenant: the player, seen from behind-ish, holding an mote
  const L = humanoid(r, { head: 'hood', cloak: 0.9, weapon: { kind: 'sword', raised: false }, height: 1.05, bulk: 0.9, eyes: 'none', fx: [{ kind: 'glow', cx: 128 - 40, cy: 200, r: 26, color: 'emberHot', z: 9 }] });
  return { id, w: 256, h: 320, seed, tint: 'ember', layers: L };
}


// ---------------------------------------------------------------------------
// Pass 3: boons, arts, affixes, sets, the hours
// ---------------------------------------------------------------------------

const BOON_MOTIF: Record<string, [string, PaletteKey]> = {
  tallowEdge: ['sword', 'ember'], marrowGreed: ['orb', 'gold'], keenEye: ['crystal', 'parchment'], stoneComposure: ['ring', 'bone'], quickWick: ['flame', 'bone'], rendering: ['hand', 'ember'], saltedBlade: ['drop', 'verdigris'], coldBreath: ['mist', 'wisp'], gildedHands: ['hand', 'gold'],
  leechWick: ['drop', 'bloodBright'], graveMomentum: ['arrows', 'ember'], patientKnife: ['spear', 'parchment'], thornedShroud: ['veil', 'bone'], reliquaryDraught: ['drop', 'emberHot'], wideReprisal: ['oath', 'ember'], firstCut: ['arrow', 'emberHot'], shortStair: ['step', 'wisp'], usurersBank: ['ring', 'gold'], openVein: ['drop', 'bloodBright'], woundDeepens: ['skull', 'verdigris'],
  glassMarrow: ['crystal', 'wisp'], avarice: ['sun', 'gold'], secondWaking: ['lantern', 'emberHot'], severTheCost: ['ring', 'wisp'], critRot: ['skull', 'bloodBright'], lanternOil: ['flame', 'emberHot'], unendingWick: ['flame', 'wisp'],
};
/** A boon: a spell-like ring in the rarity's metal, the motif inside. */
export function boonPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 48;
  const [m, color] = BOON_MOTIF[id] ?? ['orb', 'bone'];
  const rarity = BOONS[id]?.rarity ?? 'common';
  const tint: PaletteKey = rarity === 'epic' ? 'ember' : rarity === 'rare' ? 'wisp' : 'bone';
  const L: Layer[] = [
    // a rougher ring than a spell's: the stair's boons are cut, not cast
    { kind: 'mass', pts: blob(c, c, 44, 44, r, rarity === 'epic' ? 0.14 : 0.1, 18), z: 1, tone: rarity === 'common' ? 0.35 : 0.2 },
    { kind: 'detail', pts: blob(c, c, 37, 37, r, 0.06, 20), color: 'ink', alpha: 0.92, z: 2 },
    ...(rarity !== 'common' ? [{ kind: 'line', pts: blob(c, c, 40, 40, r, 0.04, 20), width: rarity === 'epic' ? 2.2 : 1.4, z: 3 } as Layer] : []),
    ...motif(m, c, r, color),
  ];
  return { id, w: 96, h: 96, seed, tint, fire: [0.2, 1.0], layers: L, bleed: 1.8 };
}

const ART_MOTIF: Record<string, [string, PaletteKey]> = { flurry: ['arrows', 'parchment'], crush: ['sword', 'ember'], stance: ['oath', 'wisp'], stoke: ['flame', 'emberHot'] };
/** An Art: a square iron plate with the motif struck into it. */
export function artPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 48;
  const [m, color] = ART_MOTIF[id] ?? ['sword', 'bone'];
  const L: Layer[] = [
    { kind: 'mass', pts: jitter([[c - 40, c - 40], [c + 40, c - 40], [c + 40, c + 40], [c - 40, c + 40]], r, 2.5), smooth: false, z: 1, tone: 0.3 },
    { kind: 'detail', pts: jitter([[c - 33, c - 33], [c + 33, c - 33], [c + 33, c + 33], [c - 33, c + 33]], r, 1.5), color: 'ink', alpha: 0.9, smooth: false, z: 2 },
    { kind: 'line', pts: jitter([[c - 36, c - 36], [c + 36, c - 36], [c + 36, c + 36], [c - 36, c + 36]], r, 1), width: 1.4, closed: true, smooth: false, z: 3 },
    ...motif(m, c, r, color),
  ];
  void ARTS;
  return { id, w: 96, h: 96, seed, tint: color === 'ember' || color === 'emberHot' ? 'ember' : 'wisp', fire: [0.2, 1.0], layers: L, bleed: 1.6 };
}

const AFFIX_MOTIF: Record<string, string> = { brutal: 'sword', hungry: 'orb', keen: 'crystal', heavy: 'hand', wounding: 'drop', venomed: 'drop', rimed: 'mist', swift: 'arrows', draining: 'drop', stalwart: 'ring', warding: 'veil', gilded: 'sun', vengeful: 'oath', breathing: 'flame', usurious: 'ring' };
const SET_COLOR: Record<string, PaletteKey> = { usurer: 'gold', butcher: 'bloodBright', mason: 'bone', thief: 'parchment', wick: 'emberHot' };
/** An affix: a shard of slag with its set's light in it and the motif cut small. */
export function affixPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 48;
  const def = AFFIXES[id];
  const color = SET_COLOR[def?.set ?? 'mason'] ?? 'bone';
  const L: Layer[] = [
    { kind: 'mass', pts: jitter([[c - 22, c + 34], [c - 30, c - 6], [c - 8, c - 36], [c + 26, c - 22], [c + 32, c + 14], [c + 10, c + 38]], r, 2.5), smooth: false, z: 1, tone: def?.set === 'butcher' ? 0.15 : 0.4 },
    { kind: 'detail', pts: jitter([[c - 14, c + 22], [c - 20, c - 4], [c - 4, c - 26], [c + 18, c - 14], [c + 22, c + 10], [c + 6, c + 26]], r, 1.5), color: 'ink', alpha: 0.8, smooth: false, z: 2 },
    { kind: 'glow', cx: c + 6, cy: c - 6, r: 16, color, z: 9 },
    ...motif(AFFIX_MOTIF[id] ?? 'orb', c, r, color).map((l) => (l.kind === 'detail' ? { ...l, alpha: 0.75 } : l)),
  ];
  return { id, w: 96, h: 96, seed, tint: null, fire: [0.2, 1.0], layers: L, bleed: 1.6 };
}

const SET_MOTIF: Record<string, string> = { usurer: 'orb', butcher: 'skull', mason: 'ring', thief: 'crystal', wick: 'flame' };
/** A set: an iron seal (the creeds' are wax), the motif in the set's light. */
export function setPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const c = 64;
  const color = SET_COLOR[id] ?? 'bone';
  const L: Layer[] = [
    { kind: 'mass', pts: blob(c, c + 2, 58, 56, r, 0.08, 28), z: 1, tone: 0.28 },
    { kind: 'detail', pts: blob(c, c, 50, 48, r, 0.04, 26), color: 'ink', alpha: 0.85, z: 2 },
    { kind: 'line', pts: blob(c, c, 44, 42, r, 0.03, 26), width: 1.6, z: 3 },
    { kind: 'line', pts: blob(c, c, 54, 52, r, 0.03, 26), width: 1.1, z: 3 },
    ...motif(SET_MOTIF[id] ?? 'ring', c, r, color),
  ];
  void SETS;
  return { id, w: 128, h: 128, seed, tint: id === 'wick' ? 'ember' : id === 'butcher' ? 'blood' : null, fire: [0.2, 1.0], layers: L, bleed: 2 };
}

/** An hour of the Toll: a horizon strip, the light where the hour keeps it. */
export function tollPlate(id: string, seed: number): Plate {
  const r = rng(seed);
  const W = 192, H = 96;
  const ph = TOLL_PHASES.find((p) => p.id === id);
  const L: Layer[] = [];
  // far ridge, near ground, a ruin or two
  L.push({ kind: 'mass', pts: [[0, H], [0, 58], ...Array.from({ length: 12 }, (_, i) => [i * (W / 11), 58 - r.range(0, 18)] as Pt), [W, 60], [W, H]], z: 1, tone: 0.5 });
  L.push({ kind: 'mass', pts: [[0, H], [0, 76], ...Array.from({ length: 10 }, (_, i) => [i * (W / 9), 76 - r.range(0, 10)] as Pt), [W, 78], [W, H]], z: 2, tone: 0.2 });
  L.push({ kind: 'mass', pts: jitter([[128, 78], [132, 34], [146, 30], [150, 78]], r, 1.5), smooth: false, z: 2, tone: 0.3 });
  L.push({ kind: 'mass', pts: jitter([[40, 78], [46, 48], [60, 52], [58, 78]], r, 1.5), smooth: false, z: 2, tone: 0.35 });
  if (id === 'dawn') { L.push({ kind: 'glow', cx: 30, cy: 60, r: 40, color: 'bone', z: 9 }); L.push({ kind: 'glow', cx: 30, cy: 60, r: 18, color: 'parchment', z: 9 }); }
  else if (id === 'day') { L.push({ kind: 'glow', cx: 96, cy: 14, r: 44, color: 'gold', z: 9 }); L.push({ kind: 'glow', cx: 96, cy: 14, r: 18, color: 'parchment', z: 9 }); }
  else if (id === 'dusk') { L.push({ kind: 'glow', cx: 166, cy: 62, r: 36, color: 'ember', z: 9 }); L.push({ kind: 'glow', cx: 60, cy: 70, r: 20, color: 'verdigris', z: 9 }); }
  else { L.push({ kind: 'glow', cx: 96, cy: 40, r: 16, color: 'wisp', z: 9 }); for (let i = 0; i < 6; i++) L.push({ kind: 'detail', pts: blob(r.range(10, W - 10), r.range(6, 40), 1.6, 1.6, r, 0.2, 6), color: 'parchment', alpha: 0.7, z: 8 }); }
  void ph;
  const tint: PaletteKey | null = id === 'dawn' ? 'bone' : id === 'day' ? 'gold' : id === 'dusk' ? 'ember' : 'wisp';
  return { id, w: W, h: H, seed, tint, fire: id === 'dawn' ? [0.15, 0.6] : id === 'dusk' ? [0.86, 0.65] : [0.5, 0.15], layers: L, bleed: 1.4 };
}
