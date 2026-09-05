/**
 * Every illustrated subject: content id → plate. Silhouette is law: each entry is a distinct
 * combination of rig, head, weapon, posture and size, and the silhouette sheet is reviewed.
 */
import type { Plate, Layer } from './compose';
import { rng, taper, blob, jitter, type Pt } from './svg';
import { humanoid, beast, wraith, robed, golem, tome, sprite, treant, drake, PW, PH } from './parts';
import type { PaletteKey } from './palette';

export interface Subject { id: string; kind: 'enemy' | 'boss' | 'shade'; build: (seed: number) => Plate; tint?: PaletteKey | null; scale?: number }

const plate = (id: string, seed: number, layers: Layer[], tint: PaletteKey | null = null, big = false): Plate => ({ id, w: big ? PW * 1.5 : PW, h: big ? PH * 1.4 : PH, seed, tint, layers: big ? layers.map(scaleLayer(1.5, 1.4)) : layers });

function scaleLayer(sx: number, sy: number) {
  return (l: Layer): Layer => {
    if (l.kind === 'glow') return { ...l, cx: l.cx * sx, cy: l.cy * sy, r: l.r * (sx + sy) / 2 };
    if (l.kind === 'streak') return { ...l, a: [l.a[0] * sx, l.a[1] * sy] as Pt, b: [l.b[0] * sx, l.b[1] * sy] as Pt };
    return { ...l, pts: l.pts.map(([x, y]) => [x * sx, y * sy] as Pt) } as Layer;
  };
}

function bossFx(r: ReturnType<typeof rng>, kind: 'fire' | 'gold' | 'dark' | 'rot' | 'wisp'): Layer[] {
  const cx = PW * 0.5;
  const color: PaletteKey = kind === 'fire' ? 'ember' : kind === 'gold' ? 'gold' : kind === 'dark' ? 'wisp' : kind === 'rot' ? 'verdigris' : 'wisp';
  const L: Layer[] = [];
  for (let i = 0; i < 6; i++) { const side = r.sign(); L.push({ kind: 'glow', cx: cx + side * r.range(95, 125), cy: r.range(PH * 0.2, PH * 0.95), r: r.range(4, 9), color, z: 9 }); }
  return L;
}

const E = (id: string, build: (r: ReturnType<typeof rng>) => Layer[], tint: PaletteKey | null = null): Subject => ({ id, kind: 'enemy', tint, build: (seed) => plate(id, seed, build(rng(seed)), tint) });
const B = (id: string, build: (r: ReturnType<typeof rng>) => Layer[], tint: PaletteKey | null = null): Subject => ({ id, kind: 'boss', tint, build: (seed) => plate(id, seed, build(rng(seed)), tint, true) });
const P = (id: string, build: (r: ReturnType<typeof rng>) => Layer[], tint: PaletteKey | null = null): Subject => ({ id, kind: 'shade', tint, build: (seed) => plate(id, seed, build(rng(seed)), tint) });

export const SUBJECTS: Subject[] = [
  // ---- Region 1: Approach ----
  E('wanedPilgrim', (r) => humanoid(r, { head: 'skull', hunched: true, weapon: { kind: 'staff', raised: false }, cloak: 0.3, height: 0.95, bulk: 0.85, eyes: 'ember' })),
  E('ashRat', (r) => beast(r, { size: 0.55, tail: 'long', headLow: true, eyes: 'ember', maw: true })),
  E('tollWarden', (r) => humanoid(r, { head: 'helm', armour: 1, shield: 'kite', weapon: { kind: 'sword', raised: false }, bulk: 1.25, height: 1.05, eyes: 'ember' })),
  E('deserterCrossbow', (r) => humanoid(r, { head: 'hood', weapon: { kind: 'crossbow', raised: true }, height: 0.95, bulk: 0.85, cloak: 0.2, lunge: true })),
  E('pyreHound', (r) => beast(r, { size: 0.95, spines: true, tail: 'long', eyes: 'ember', maw: true }), 'ember'),
  E('charredAcolyte', (r) => robed(r, { eyes: 'ember', staff: false, form: 'wide', hoodForm: 'pointed', sleeves: true, fx: [{ kind: 'glow', cx: PW * 0.84, cy: PH * 0.38, r: 22, color: 'ember', z: 9 }, { kind: 'glow', cx: PW * 0.2, cy: PH * 0.8, r: 12, color: 'ember', z: 9 }] }), 'ember'),
  E('gallowsKnight', (r) => humanoid(r, { head: 'helmCrest', armour: 1, weapon: { kind: 'great', raised: true }, rope: true, bulk: 1.3, height: 1.15, eyes: 'ember' })),
  E('tallowWraith', (r) => wraith(r, { eyes: 'ember', tatter: 0.8 }), 'ember'),
  // ---- Region 2: Mire ----
  E('bogLeech', (r) => beast(r, { size: 0.7, segmented: true, legs: 2, tail: 'short', headLow: true, maw: true }), 'verdigris'),
  E('mireWaned', (r) => humanoid(r, { head: 'bare', hunched: true, weapon: { kind: 'club', raised: true }, height: 0.9, bulk: 1.1, eyes: 'wisp' }), 'verdigris'),
  E('rottingKnight', (r) => humanoid(r, { head: 'helm', armour: 1, weapon: { kind: 'halberd', raised: false }, bulk: 1.35, height: 1.1, hunched: true, chains: true }), 'verdigris'),
  E('drownedChorister', (r) => wraith(r, { eyes: 'wisp', hands: true, tatter: 0.4, form: 'column' }), 'wisp'),
  E('fenStalker', (r) => beast(r, { size: 1.05, tail: 'long', headLow: true, eyes: 'ember', maw: true, spines: false }), 'verdigris'),
  E('rotwoodTreant', (r) => treant(r), 'verdigris'),
  // ---- Region 3: Archive ----
  E('archiveScribe', (r) => robed(r, { eyes: 'wisp', staff: false, form: 'tall', hoodForm: 'bare', book: true }), 'wisp'),
  E('boundTome', (r) => tome(r), 'wisp'),
  E('nullCustodian', (r) => golem(r, { size: 0.85, eyes: 'wisp', halberd: false }), 'wisp'),
  E('crystalWaned', (r) => humanoid(r, { head: 'crowned', weapon: { kind: 'sword', raised: true }, height: 1.0, bulk: 0.95, eyes: 'wisp' }), 'wisp'),
  E('silencedScholar', (r) => robed(r, { eyes: 'none', staff: false, form: 'wide', hoodForm: 'veil', sleeves: true, fx: [{ kind: 'glow', cx: PW * 0.7, cy: PH * 0.45, r: 30, color: 'wisp', z: 9 }] }), 'wisp'),
  // ---- Region 4: Sanctum ----
  E('vigilAcolyte', (r) => robed(r, { eyes: 'gold', staff: false, lantern: true, form: 'cone', hoodForm: 'mitre' }), 'gold'),
  E('sanctumKnight', (r) => humanoid(r, { head: 'helmCrest', armour: 1, weapon: { kind: 'spear', raised: true }, shield: 'kite', bulk: 1.2, height: 1.1, eyes: 'gold' }), 'gold'),
  E('lanternBearer', (r) => humanoid(r, { head: 'lantern', cloak: 0.8, weapon: { kind: 'none' }, height: 1.05, bulk: 0.9 }), 'gold'),
  E('stormGargoyle', (r) => beast(r, { size: 0.9, wings: true, tail: 'long', eyes: 'gold', headLow: false, spines: true }), 'gold'),
  E('deaconOfStorms', (r) => robed(r, { eyes: 'gold', staff: true, form: 'wide', hoodForm: 'mitre', sleeves: true, fx: [{ kind: 'glow', cx: PW * 0.3, cy: PH * 0.2, r: 22, color: 'gold', z: 9 }] }), 'gold'),
  E('silverSentinel', (r) => golem(r, { size: 1.05, eyes: 'gold', halberd: true }), 'gold'),
  // ---- Region 5: Deep ----
  E('nadirCrawler', (r) => beast(r, { size: 0.9, legs: 6, segmented: true, tail: 'short', headLow: true, eyes: 'wisp', maw: true })),
  E('vestigeWisp', (r) => sprite(r), 'wisp'),
  E('undercroftWaned', (r) => humanoid(r, { head: 'skull', weapon: { kind: 'dagger' }, height: 1.0, bulk: 1.0, hunched: true, lunge: true, cloak: 0.25, eyes: 'wisp', chains: true })),
  E('shadowOfTheLost', (r) => wraith(r, { eyes: 'none', tatter: 1.0, height: 1.1, arms: true, form: 'flayed' }), 'wisp'),
  E('paleGaoler', (r) => humanoid(r, { head: 'hood', armour: 0.6, weapon: { kind: 'mace', raised: true }, chains: true, bulk: 1.25, height: 1.15, eyes: 'wisp' })),
  E('undercroftKnight', (r) => humanoid(r, { head: 'helm', armour: 1, weapon: { kind: 'great', raised: false }, cloak: 0.9, bulk: 1.3, height: 1.2, eyes: 'wisp' })),
  // ---- Region 6: Rendering Works ----
  E('renderKnight', (r) => humanoid(r, { head: 'helmCrest', armour: 1, weapon: { kind: 'great', raised: true }, bulk: 1.3, height: 1.15, eyes: 'ember', fx: [{ kind: 'glow', cx: PW * 0.8, cy: PH * 0.3, r: 16, color: 'ember', z: 9 }] }), 'ember'),
  E('tallowDrake', (r) => drake(r), 'ember'),
  E('pyreGolem', (r) => golem(r, { size: 1.15, eyes: 'ember', cracks: true }), 'ember'),
  E('ashWraith', (r) => wraith(r, { eyes: 'ember', tatter: 1.2, height: 1.15, form: 'wide', hands: true }), 'ember'),
  E('brandShepherd', (r) => robed(r, { eyes: 'ember', staff: true, form: 'tall', hoodForm: 'pointed', fx: [{ kind: 'glow', cx: PW * 0.7, cy: PH * 0.1, r: 30, color: 'ember', z: 9 }] }), 'ember'),
  E('lordsRemnant', (r) => humanoid(r, { head: 'crowned', armour: 1, weapon: { kind: 'great', raised: true }, cloak: 0.5, bulk: 1.2, height: 1.15, eyes: 'ember', fx: [{ kind: 'glow', cx: PW * 0.5, cy: PH * 0.1, r: 22, color: 'ember', z: 9 }] }), 'ember'),
  // ---- Bosses ----
  B('coldPyreWarden', (r) => [...humanoid(r, { head: 'helm', armour: 1, weapon: { kind: 'cleaver', raised: true }, cloak: 0.7, bulk: 1.45, height: 1.1, eyes: 'ember' }), ...bossFx(r, 'fire')], 'ember'),
  B('hangedPilgrim', (r) => humanoid(r, { head: 'skull', rope: true, weapon: { kind: 'none' }, height: 1.15, bulk: 0.8, hunched: true, eyes: 'ember', cloak: 0.2 })),
  B('mireMother', (r) => [...humanoid(r, { head: 'crowned', cloak: 1, weapon: { kind: 'none' }, height: 1.3, bulk: 1.1, eyes: 'verdigris' as any }), ...bossFx(r, 'rot'), { kind: 'mass', pts: taper([PW * 0.5, PH * 0.9], [PW * 0.15, PH * 0.98], 60, 10, r, 3, 6), z: 0 }, { kind: 'mass', pts: taper([PW * 0.5, PH * 0.9], [PW * 0.88, PH * 0.99], 60, 10, r, 3, 6), z: 0 }], 'verdigris'),
  B('choirMaster', (r) => [...robed(r, { eyes: 'wisp', staff: false, height: 1.08, form: 'wide', hoodForm: 'mitre', sleeves: true, fx: [] }), { kind: 'mass', pts: taper([PW * 0.7, PH * 0.55], [PW * 0.92, PH * 0.1], 8, 3, r, 0.5, 4), z: 5 }, { kind: 'mass', pts: jitter([[PW * 0.85, PH * 0.05], [PW * 0.99, PH * 0.05], [PW * 0.97, PH * 0.16], [PW * 0.87, PH * 0.16]], r, 1), z: 5, tone: 0.3 }, ...bossFx(r, 'wisp')], 'wisp'),
  B('archivistNull', (r) => [...robed(r, { eyes: 'wisp', staff: true, height: 1.25, form: 'tall', hoodForm: 'bare', book: true }), ...bossFx(r, 'wisp'), { kind: 'mass', pts: blob(PW * 0.2, PH * 0.4, 40, 30, r, 0.05, 10), z: 1, tone: 0.5 }], 'wisp'),
  B('theUnwritten', (r) => [...wraith(r, { eyes: 'none', tatter: 1.4, height: 1.2, arms: true, form: 'flayed' }), ...bossFx(r, 'wisp')], 'wisp'),
  B('saintOrvane', (r) => [...humanoid(r, { head: 'lantern', armour: 1, weapon: { kind: 'spear', raised: true }, cloak: 0.9, bulk: 1.1, height: 1.3, eyes: 'gold', wings: false }), ...bossFx(r, 'gold')], 'gold'),
  B('deaconUnburied', (r) => [...robed(r, { eyes: 'gold', staff: true, height: 1.2, form: 'bent', hoodForm: 'mitre', fx: [{ kind: 'glow', cx: PW * 0.5, cy: PH * 0.08, r: 40, color: 'gold', z: 9 }] }), ...bossFx(r, 'gold')], 'gold'),
  B('undercroftKeeper', (r) => [...humanoid(r, { head: 'helmCrest', armour: 1, weapon: { kind: 'great', raised: false }, shield: 'round', cloak: 1, bulk: 1.5, height: 1.15, eyes: 'wisp' }), ...bossFx(r, 'dark')]),
  B('namelessWanderer', (r) => humanoid(r, { head: 'hood', weapon: { kind: 'twin' }, cloak: 0.6, height: 1.1, bulk: 0.9, eyes: 'ember' })),
  B('theRenderer', (r) => [...humanoid(r, { head: 'crowned', armour: 1, weapon: { kind: 'great', raised: true }, cloak: 0.8, bulk: 1.5, height: 1.15, eyes: 'ember' }), ...bossFx(r, 'fire'), { kind: 'glow', cx: PW * 0.5, cy: PH * 0.05, r: 46, color: 'ember', z: 9 }], 'ember'),
  B('firstWick', (r) => [...wraith(r, { eyes: 'none', tatter: 0.6, height: 1.3, sun: true, crown: true, form: 'spire' }), ...bossFx(r, 'fire')], 'ember'),
  B('deserterCaptain', (r) => humanoid(r, { head: 'helm', weapon: { kind: 'crossbow' }, cloak: 0.5, height: 1.1, bulk: 1.0, eyes: 'ember' })),
  B('choirOfTeeth', (r) => [...beast(r, { size: 1.3, segmented: true, legs: 6, tail: 'long', headLow: true, maw: true, eyes: 'wisp' }), ...bossFx(r, 'rot')], 'verdigris'),
  B('custodianPrime', (r) => golem(r, { size: 1.25, eyes: 'wisp', halberd: false }), 'wisp'),
  B('twinSentinels', (r) => [...golem(r, { size: 0.9, eyes: 'gold', halberd: true }).map(shiftLayer(-48, 0)), ...golem(rng(r.int(1, 1e6)), { size: 0.9, eyes: 'gold', halberd: true }).map(shiftLayer(52, 8))], 'gold'),
  B('drownedSun', (r) => [...wraith(r, { eyes: 'none', tatter: 0.5, height: 1.25, sun: true, form: 'wide' }), ...bossFx(r, 'gold')], 'gold'),
  B('nadirWatcher', (r) => [...wraith(r, { eyes: 'wisp', tatter: 1.3, height: 1.35, hands: true, crown: true, form: 'column' }), ...bossFx(r, 'dark')], 'wisp'),
  // ---- Shades ----
  P('aldric', (r) => humanoid(r, { head: 'helm', armour: 0.8, weapon: { kind: 'sword', raised: false }, shield: 'kite', cloak: 0.4, height: 1.05, bulk: 1.05, eyes: 'ember' }), 'ember'),
  P('ilse', (r) => robed(r, { eyes: 'gold', staff: false, form: 'wide', hoodForm: 'veil', lantern: true, sleeves: true }), 'gold'),
  P('ghrelt', (r) => humanoid(r, { head: 'bare', weapon: { kind: 'club', raised: true }, shield: 'round', bulk: 1.3, height: 1.1, hunched: true, armour: 0.6, eyes: 'verdigris' as any }), 'verdigris'),
  P('vesna', (r) => robed(r, { eyes: 'wisp', staff: true, form: 'tall', hoodForm: 'bare', book: true }), 'wisp'),
  P('corvo', (r) => humanoid(r, { head: 'hood', weapon: { kind: 'twin' }, cloak: 0.3, height: 0.95, bulk: 0.85, hunched: true, lunge: true, eyes: 'ember' })),
  P('ysolde', (r) => humanoid(r, { head: 'bare', weapon: { kind: 'rapier', raised: false }, cloak: 0.7, height: 1.08, bulk: 0.85, lunge: true, eyes: 'wisp' }), 'wisp'),
];

function shiftLayer(dx: number, dy: number) {
  return (l: Layer): Layer => (l.kind === 'glow' ? { ...l, cx: l.cx + dx, cy: l.cy + dy } : l.kind === 'streak' ? { ...l, a: [l.a[0] + dx, l.a[1] + dy] as Pt, b: [l.b[0] + dx, l.b[1] + dy] as Pt } : ({ ...l, pts: l.pts.map(([x, y]) => [x + dx, y + dy] as Pt) } as Layer));
}

export function findSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
