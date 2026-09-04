/** Weapon plates: 160×160 logical, the item drawn diagonally hilt bottom-left, tip top-right. */
import type { Plate, Layer } from './compose';
import { rng, blade, haft, maceHead, spearHead, axeHead, flame, rope, blob, taper, jitter, type Pt, type Rng } from './svg-parts';
import type { PaletteKey } from './palette';

export const WW = 160;

type Kind = 'straight' | 'dagger' | 'mace' | 'spear' | 'halberd' | 'great' | 'cleaver' | 'rapier' | 'estoc' | 'katana' | 'twin' | 'club' | 'hammer' | 'bell' | 'staff' | 'talisman' | 'flame' | 'chime' | 'rope';

const SPEC: Record<string, { kind: Kind; tint?: PaletteKey | null; glow?: PaletteKey; big?: number; status?: PaletteKey }> = {
  hollowSword: { kind: 'straight' }, banditDagger: { kind: 'dagger', status: 'blood' }, pilgrimMace: { kind: 'mace' }, deserterSpear: { kind: 'spear' },
  wardenCleaver: { kind: 'cleaver', glow: 'ember', tint: 'ember' }, gallowsRope: { kind: 'rope', status: 'blood' },
  ashenStaff: { kind: 'staff', glow: 'soul', tint: 'soul' }, crackedTalisman: { kind: 'talisman', glow: 'gold', tint: 'gold' }, pyromancyFlame: { kind: 'flame', glow: 'ember', tint: 'ember' },
  rotwoodClub: { kind: 'club', tint: 'verdigris', status: 'verdigris' }, fenRapier: { kind: 'rapier' }, drownedHalberd: { kind: 'halberd', tint: 'verdigris' }, mothersThorn: { kind: 'dagger', tint: 'verdigris', status: 'verdigris', big: 1.1 }, bellHammer: { kind: 'bell', glow: 'gold', tint: 'gold' },
  scholarsEstoc: { kind: 'estoc', tint: 'soul' }, custodianGreatmace: { kind: 'mace', big: 1.25 }, crystalSword: { kind: 'straight', tint: 'soul', glow: 'soul' }, nullBlade: { kind: 'straight', tint: 'soul', glow: 'soul', big: 1.1 }, unwrittenEdge: { kind: 'dagger', tint: 'soul', glow: 'soul' },
  sanctumSpear: { kind: 'spear', tint: 'gold', glow: 'gold' }, vigilMaul: { kind: 'hammer', big: 1.2 }, lanternBlade: { kind: 'straight', tint: 'gold', glow: 'gold' }, stormTalisman: { kind: 'talisman', tint: 'gold', glow: 'gold', big: 1.1 },
  paleDagger: { kind: 'dagger', status: 'blood' }, abyssGreatsword: { kind: 'great', tint: 'soul' }, keepersBlackblade: { kind: 'straight', tint: 'soul', glow: 'soul', big: 1.15 }, wanderersTwinblades: { kind: 'twin', status: 'blood' },
  kilnGreatsword: { kind: 'great', tint: 'ember', glow: 'ember', big: 1.2 }, cinderKatana: { kind: 'katana', tint: 'ember', glow: 'ember' }, lordsEmberSword: { kind: 'great', tint: 'ember', glow: 'ember', big: 1.1 }, firstBlade: { kind: 'straight', tint: 'ember', glow: 'emberHot', big: 1.2 },
  abyssalChime: { kind: 'chime', tint: 'soul', glow: 'soul' },
};

export function weaponPlate(id: string, seed: number): Plate {
  const s = SPEC[id] ?? { kind: 'straight' as Kind };
  const r = rng(seed);
  const S = s.big ?? 1;
  const c = WW / 2;
  const grip: Pt = [c - 48 * S, c + 52 * S], tip: Pt = [c + 52 * S, c - 56 * S];
  const L: Layer[] = [];
  const k = s.kind;
  if (k === 'straight' || k === 'great' || k === 'rapier' || k === 'estoc' || k === 'katana' || k === 'cleaver' || k === 'dagger') {
    const g: Pt = k === 'dagger' ? [c - 30 * S, c + 34 * S] : grip;
    const t: Pt = k === 'dagger' ? [c + 34 * S, c - 40 * S] : tip;
    L.push({ kind: 'mass', pts: blade(g, t, r, k === 'straight' ? 'straight' : k, k === 'great' ? 24 : k === 'cleaver' ? 22 : k === 'dagger' ? 17 : k === 'rapier' || k === 'estoc' ? 22 : 18), z: 2, tone: 0.45 });
    L.push({ kind: 'mass', pts: blob(g[0] - 4 * S, g[1] + 4 * S, 7 * S, 7 * S, r, 0.1, 8), z: 3, tone: 0.3 }); // pommel
    L.push({ kind: 'line', pts: [[g[0] + (t[0] - g[0]) * 0.32, g[1] + (t[1] - g[1]) * 0.32], [g[0] + (t[0] - g[0]) * 0.92, g[1] + (t[1] - g[1]) * 0.92]], width: 1.2, closed: false, z: 7 });
  }
  if (k === 'twin') {
    L.push({ kind: 'mass', pts: blade([c - 52, c + 40], [c + 30, c - 60], r, 'curved', 15), z: 2, tone: 0.45 });
    L.push({ kind: 'mass', pts: blade([c - 20, c + 60], [c + 62, c - 30], r, 'curved', 15), z: 3, tone: 0.5 });
  }
  if (k === 'mace' || k === 'club' || k === 'hammer' || k === 'bell') {
    L.push({ kind: 'mass', pts: haft(grip, [c + 30 * S, c - 34 * S], r, k === 'club' ? 12 : 8), z: 2 });
    const head: Pt = [c + 34 * S, c - 38 * S];
    if (k === 'mace') L.push({ kind: 'mass', pts: maceHead(head, r, 24 * S), z: 3, tone: 0.4 });
    if (k === 'club') L.push({ kind: 'mass', pts: blob(head[0], head[1], 20 * S, 32 * S, r, 0.25, 14, -0.7), z: 3, tone: 0.2 });
    if (k === 'hammer') L.push({ kind: 'mass', pts: jitter([[head[0] - 34, head[1] - 12], [head[0] + 26, head[1] - 34], [head[0] + 40, head[1] + 4], [head[0] - 20, head[1] + 26]], r, 1.5), z: 3, tone: 0.4 });
    if (k === 'bell') { L.push({ kind: 'mass', pts: jitter([[head[0] - 26, head[1] - 30], [head[0] + 26, head[1] - 30], [head[0] + 36, head[1] + 18], [head[0] - 36, head[1] + 18]], r, 1.5), z: 3, tone: 0.4 }); L.push({ kind: 'glow', cx: head[0], cy: head[1] + 8, r: 14, color: 'gold', z: 9 }); }
  }
  if (k === 'spear' || k === 'halberd') {
    L.push({ kind: 'mass', pts: haft([c - 60 * S, c + 62 * S], [c + 40 * S, c - 40 * S], r, 6), z: 2 });
    L.push({ kind: 'mass', pts: spearHead([c + 40 * S, c - 40 * S], [c + 66 * S, c - 68 * S], r, 14), z: 3, tone: 0.45 });
    if (k === 'halberd') L.push({ kind: 'mass', pts: axeHead([c + 36 * S, c - 30 * S], r, 22, 1), z: 3, tone: 0.4 });
  }
  if (k === 'staff') { L.push({ kind: 'mass', pts: haft([c - 56, c + 64], [c + 36, c - 44], r, 7), z: 2 }); L.push({ kind: 'mass', pts: blob(c + 40, c - 50, 14, 16, r, 0.3, 12), z: 3, tone: 0.3 }); L.push({ kind: 'glow', cx: c + 40, cy: c - 50, r: 20, color: 'soul', z: 9 }); }
  if (k === 'talisman') { L.push({ kind: 'mass', pts: blob(c, c, 40 * S, 48 * S, r, 0.1, 16), z: 2, tone: 0.3 }); L.push({ kind: 'mass', pts: jitter([[c - 6, c - 60 * S], [c + 6, c - 60 * S], [c + 6, c + 60 * S], [c - 6, c + 60 * S]], r, 1), z: 3, tone: 0.5 }); L.push({ kind: 'mass', pts: jitter([[c - 40 * S, c - 10], [c + 40 * S, c - 10], [c + 40 * S, c + 2], [c - 40 * S, c + 2]], r, 1), z: 3, tone: 0.5 }); L.push({ kind: 'detail', pts: taper([c - 8, c - 44], [c + 10, c + 40], 2, 4, r, 0.6, 4), color: 'void', alpha: 0.9, z: 8 }); L.push({ kind: 'glow', cx: c, cy: c - 4, r: 22, color: s.glow ?? 'gold', z: 9 }); }
  if (k === 'flame') { L.push({ kind: 'mass', pts: blob(c, c + 44, 34, 18, r, 0.15, 12), z: 2 }); L.push({ kind: 'mass', pts: flame(c, c + 40, r, 96, 56), z: 3, tone: 0.6 }); L.push({ kind: 'glow', cx: c, cy: c + 4, r: 40, color: 'ember', z: 9 }); L.push({ kind: 'glow', cx: c - 4, cy: c + 20, r: 18, color: 'emberHot', z: 9 }); }
  if (k === 'chime') { L.push({ kind: 'mass', pts: jitter([[c - 30, c - 50], [c + 30, c - 50], [c + 44, c + 34], [c - 44, c + 34]], r, 2), z: 2, tone: 0.35 }); L.push({ kind: 'mass', pts: haft([c, c - 70], [c, c - 46], r, 6), z: 2 }); L.push({ kind: 'glow', cx: c, cy: c + 10, r: 26, color: 'soul', z: 9 }); }
  if (k === 'rope') { L.push({ kind: 'mass', pts: rope([c - 60, c + 30], [c + 10, c - 50], r, 7), z: 2 }); L.push({ kind: 'mass', pts: rope([c + 10, c - 50], [c + 60, c + 20], r, 7), z: 2 }); L.push({ kind: 'mass', pts: blob(c + 10, c - 50, 14, 12, r, 0.2, 10), z: 3 }); L.push({ kind: 'mass', pts: rope([c + 60, c + 20], [c + 30, c + 66], r, 6), z: 2 }); }
  // enchanted blades glow along the edge, not as an orb
  if (s.glow && k !== 'flame' && k !== 'staff' && k !== 'talisman' && k !== 'chime' && k !== 'bell') for (let i = 0; i < 4; i++) L.push({ kind: 'glow', cx: grip[0] + (tip[0] - grip[0]) * (0.45 + i * 0.16), cy: grip[1] + (tip[1] - grip[1]) * (0.45 + i * 0.16), r: 7, color: s.glow, z: 9 });
  if (s.status) for (let i = 0; i < 4; i++) L.push({ kind: 'detail', pts: blob(c + 8 + i * 9, c - 6 + i * 10, 3, 5, r, 0.4, 8), color: s.status, alpha: 0.85, z: 8 });
  return { id, w: WW, h: WW, seed, tint: s.tint ?? null, fire: [0.1, 1.0], layers: L, bleed: 2.2 };
}

export const WEAPON_IDS = Object.keys(SPEC);
