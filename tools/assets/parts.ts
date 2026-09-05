/**
 * Shape library and rigs. Every subject is composed from these parts so silhouettes share a
 * vocabulary (skulls, horns, blades, cloth, chain, bone, flame) while staying distinct.
 * All coordinates are in a 256×320 plate space unless a rig scales them.
 */
import type { Layer } from './compose';
import { blob, taper, jitter, resample, smoothClosed, rotate, translate, scale, mirrorX, type Pt, type Rng } from './svg';

export const PW = 256, PH = 320;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function skull(cx: number, cy: number, r: Rng, size = 22): Pt[] {
  // cranium + jaw, slightly asymmetric
  const cran = blob(cx, cy - size * 0.15, size, size * 0.95, r, 0.08, 16);
  const jaw = [[cx - size * 0.6, cy + size * 0.45], [cx + size * 0.55, cy + size * 0.45], [cx + size * 0.4, cy + size * 1.05], [cx - size * 0.35, cy + size * 1.05]] as Pt[];
  return union(cran, jitter(jaw, r, 1.5));
}

export function helm(cx: number, cy: number, r: Rng, size = 22, crest = false): Pt[] {
  // a great helm: flat-ish crown, flared cheeks, a chin that narrows; the visor is carved by helmVisor()
  const pts: Pt[] = [[cx - size * 0.95, cy + size * 0.8], [cx - size * 1.0, cy - size * 0.1], [cx - size * 0.8, cy - size * 1.0], [cx - size * 0.3, cy - size * 1.25], [cx + size * 0.3, cy - size * 1.25], [cx + size * 0.8, cy - size * 1.0], [cx + size * 1.0, cy - size * 0.1], [cx + size * 0.95, cy + size * 0.8], [cx + size * 0.55, cy + size * 1.2], [cx - size * 0.55, cy + size * 1.2]];
  const base = jitter(pts, r, 1.2);
  if (crest) return union(base, jitter([[cx - 3, cy - size * 1.05], [cx + 3, cy - size * 1.05], [cx + 5, cy - size * 2.1], [cx - 2, cy - size * 2.3]], r, 1));
  return base;
}

export function hood(cx: number, cy: number, r: Rng, size = 24): Pt[] {
  const pts: Pt[] = [[cx - size * 1.1, cy + size * 1.2], [cx - size * 0.9, cy - size * 0.3], [cx - size * 0.3, cy - size * 1.3], [cx + size * 0.5, cy - size * 1.25], [cx + size * 1.0, cy - size * 0.2], [cx + size * 1.15, cy + size * 1.2]];
  return jitter(pts, r, 2);
}

export function horns(cx: number, cy: number, r: Rng, len = 30, spread = 18): Pt[][] {
  const left = taper([cx - spread * 0.5, cy], [cx - spread - len * 0.3, cy - len], 8, 2, r, 0.8);
  const right = taper([cx + spread * 0.5, cy], [cx + spread + len * 0.2, cy - len * 1.1], 8, 2, r, 0.8);
  return [left, right];
}

export function torso(cx: number, cy: number, r: Rng, w = 60, h = 90, bulk = 1, hunched = false): Pt[] {
  const top = cy - h / 2, bot = cy + h / 2;
  // shoulders wide, waist narrow, hips out again: a body, not a box
  const pts: Pt[] = hunched
    ? [[cx - w * 0.5 * bulk, bot], [cx - w * 0.42 * bulk, cy + h * 0.15], [cx - w * 0.62 * bulk, cy - h * 0.1], [cx - w * 0.5 * bulk, top + 10], [cx + w * 0.15, top - 8], [cx + w * 0.66 * bulk, top + 16], [cx + w * 0.5 * bulk, cy + 6], [cx + w * 0.4 * bulk, bot]]
    : [[cx - w * 0.44, bot], [cx - w * 0.36 * bulk, cy + h * 0.12], [cx - w * 0.62 * bulk, top + 14], [cx - w * 0.3, top], [cx + w * 0.3, top], [cx + w * 0.62 * bulk, top + 14], [cx + w * 0.36 * bulk, cy + h * 0.12], [cx + w * 0.44, bot]];
  return jitter(resample(pts, 22), r, 2.2);
}

export function cloak(cx: number, cy: number, r: Rng, w = 90, h = 150, tatter = 0.5): Pt[] {
  const pts: Pt[] = [];
  const top = cy - h * 0.45;
  pts.push([cx - w * 0.35, top], [cx + w * 0.35, top], [cx + w * 0.55, cy + h * 0.1]);
  // tattered hem
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx + w * 0.55 - t * w * 1.1;
    const y = cy + h * 0.55 + (i % 2 ? -1 : 1) * tatter * r.range(4, 16) + r.range(-3, 3);
    pts.push([x, y]);
  }
  pts.push([cx - w * 0.55, cy + h * 0.1]);
  return jitter(pts, r, 1.5);
}

/** A limb with a joint: two tapered segments bent at the knee/elbow, so legs and arms read as anatomy. */
export function limb(a: Pt, b: Pt, r: Rng, w0 = 16, w1 = 11, bend = 0.18): Pt[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const side = r.sign();
  const joint: Pt = [mx + (-dy / len) * len * bend * side, my + (dx / len) * len * bend * side];
  const upper = taper(a, joint, w0, w0 * 0.85, r, 0.6, 3);
  const lower = taper(joint, b, w0 * 0.8, w1, r, 0.6, 3);
  const half = (p: Pt[]) => p.length / 2;
  // stitch: upper left side, lower left side, lower right, upper right
  const uL = upper.slice(0, half(upper)), uR = upper.slice(half(upper));
  const lL = lower.slice(0, half(lower)), lR = lower.slice(half(lower));
  return [...uL, ...lL, ...lR, ...uR];
}

/** Boot / foot mass at the end of a leg. */
export function boot(b: Pt, r: Rng, w = 18): Pt[] {
  return jitter([[b[0] - w * 0.5, b[1] - 8], [b[0] + w * 0.4, b[1] - 10], [b[0] + w * 0.9, b[1] - 2], [b[0] + w * 0.6, b[1] + 3], [b[0] - w * 0.5, b[1] + 3]], r, 1);
}

export function shield(cx: number, cy: number, r: Rng, w = 46, h = 62, kite = true): Pt[] {
  const pts: Pt[] = kite
    ? [[cx - w / 2, cy - h * 0.4], [cx, cy - h * 0.5], [cx + w / 2, cy - h * 0.4], [cx + w * 0.4, cy + h * 0.1], [cx, cy + h * 0.5], [cx - w * 0.4, cy + h * 0.1]]
    : blob(cx, cy, w / 2, h / 2, r, 0.06, 14);
  return jitter(pts, r, 1.2);
}

/** A blade: tip at `tip`, grip at `grip`. kind shapes the profile. */
export function blade(grip: Pt, tip: Pt, r: Rng, kind: 'straight' | 'curved' | 'great' | 'dagger' | 'cleaver' | 'rapier' | 'katana' | 'estoc' = 'straight', width = 10): Pt[] {
  const dx = tip[0] - grip[0], dy = tip[1] - grip[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const w = kind === 'great' ? width * 1.7 : kind === 'cleaver' ? width * 2.2 : kind === 'dagger' ? width * 0.8 : kind === 'rapier' || kind === 'estoc' ? width * 0.45 : width;
  const guardAt = kind === 'dagger' ? 0.22 : 0.26;
  const pts: Pt[] = [];
  const at = (t: number, off: number): Pt => [grip[0] + ux * len * t + nx * off, grip[1] + uy * len * t + ny * off];
  // grip
  pts.push(at(0, -w * 0.28), at(0, w * 0.28), at(guardAt - 0.02, w * 0.28));
  // guard
  const gw = kind === 'katana' ? w * 0.9 : kind === 'rapier' ? w * 2.4 : w * 1.6;
  pts.push(at(guardAt - 0.02, gw), at(guardAt + 0.03, gw), at(guardAt + 0.03, w * 0.55));
  // blade edge
  const curve = kind === 'curved' || kind === 'katana' ? 0.18 : 0;
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const t = guardAt + 0.03 + (1 - guardAt - 0.03) * (i / segs);
    const taperW = kind === 'cleaver' ? (i < segs * 0.75 ? w : w * (1 - (i - segs * 0.75) / (segs * 0.25))) : w * (1 - Math.pow(i / segs, kind === 'rapier' || kind === 'estoc' ? 1.5 : 2.2)) + 0.5;
    pts.push(at(t, taperW * 0.55 + curve * len * Math.sin((i / segs) * Math.PI) * 0.35));
  }
  for (let i = segs; i >= 0; i--) {
    const t = guardAt + 0.03 + (1 - guardAt - 0.03) * (i / segs);
    const taperW = kind === 'cleaver' ? w * 0.4 : w * (1 - Math.pow(i / segs, 2.2)) + 0.5;
    pts.push(at(t, -taperW * 0.55 + curve * len * Math.sin((i / segs) * Math.PI) * 0.35));
  }
  pts.push(at(guardAt + 0.03, -w * 0.55), at(guardAt + 0.03, -gw), at(guardAt - 0.02, -gw), at(guardAt - 0.02, -w * 0.28));
  return jitter(pts, r, 0.6);
}

export function haft(a: Pt, b: Pt, r: Rng, w = 5): Pt[] {
  return taper(a, b, w, w * 0.9, r, 0.4, 4);
}

export function maceHead(c: Pt, r: Rng, size = 16, flanged = true): Pt[] {
  if (!flanged) return blob(c[0], c[1], size, size, r, 0.1, 12);
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rad = i % 2 ? size : size * 0.62;
    pts.push([c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad]);
  }
  return jitter(pts, r, 0.8);
}

export function spearHead(a: Pt, b: Pt, r: Rng, w = 9): Pt[] {
  return taper(a, b, w, 0.5, r, 0.4, 5);
}

export function axeHead(c: Pt, r: Rng, size = 22, dir = 1): Pt[] {
  const pts: Pt[] = [[c[0], c[1] - size * 0.9], [c[0] + dir * size * 1.1, c[1] - size * 1.2], [c[0] + dir * size * 1.35, c[1]], [c[0] + dir * size * 1.1, c[1] + size * 1.2], [c[0], c[1] + size * 0.9]];
  return jitter(pts, r, 1);
}

export function flame(cx: number, cy: number, r: Rng, h = 40, w = 24): Pt[] {
  const pts: Pt[] = [[cx - w * 0.5, cy], [cx - w * 0.55, cy - h * 0.35], [cx - w * 0.2, cy - h * 0.55], [cx - w * 0.05, cy - h], [cx + w * 0.25, cy - h * 0.6], [cx + w * 0.5, cy - h * 0.4], [cx + w * 0.5, cy]];
  return jitter(pts, r, 2);
}

export function chain(a: Pt, b: Pt, r: Rng, links = 6, size = 5): Pt[][] {
  const out: Pt[][] = [];
  for (let i = 0; i <= links; i++) {
    const t = i / links;
    out.push(blob(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 6, size, size * 1.5, r, 0.1, 8, (i % 2) * Math.PI / 2));
  }
  return out;
}

export function rope(a: Pt, b: Pt, r: Rng, w = 3): Pt[] {
  return taper(a, b, w, w, r, 1.2, 8);
}

/** Convex-ish union of two point sets by concatenating hulls (good enough for silhouettes). */
export function union(a: Pt[], b: Pt[]): Pt[] {
  // Combine and take the outline via angular sort around the centroid of the combined cloud.
  const all = [...a, ...b];
  const cx = all.reduce((s, p) => s + p[0], 0) / all.length, cy = all.reduce((s, p) => s + p[1], 0) / all.length;
  return all.map((p) => [p, Math.atan2(p[1] - cy, p[0] - cx)] as [Pt, number]).sort((u, v) => u[1] - v[1]).map((u) => u[0]);
}

// ---------------------------------------------------------------------------
// Rigs
// ---------------------------------------------------------------------------

export interface HumanoidSpec {
  height?: number;      // 0.6..1.6
  bulk?: number;        // 0.7..1.6
  head?: 'skull' | 'helm' | 'helmCrest' | 'hood' | 'bare' | 'none' | 'crowned' | 'lantern';
  cloak?: number;       // 0 none .. 1 long
  hunched?: boolean;
  lunge?: boolean;
  weapon?: { kind: 'sword' | 'great' | 'dagger' | 'mace' | 'spear' | 'halberd' | 'staff' | 'club' | 'crossbow' | 'cleaver' | 'rapier' | 'twin' | 'katana' | 'hammer' | 'bell' | 'axe' | 'none'; raised?: boolean };
  shield?: 'kite' | 'round' | 'none';
  horns?: boolean;
  eyes?: 'ember' | 'wisp' | 'gold' | 'none';
  rope?: boolean;       // hanged
  wings?: boolean;
  chains?: boolean;
  armour?: number;      // 0..1 plate coverage (adds pauldron masses)
  fx?: Layer[];
}

export function humanoid(r: Rng, spec: HumanoidSpec = {}): Layer[] {
  const H = spec.height ?? 1, B = spec.bulk ?? 1;
  const cx = PW * 0.5, ground = PH * 0.93;
  const totalH = 250 * H;
  const legH = totalH * 0.4, torsoH = totalH * 0.36, headR = 20 * Math.pow(B, 0.3) * Math.pow(H, 0.5);
  const hipY = ground - legH, shoulderY = hipY - torsoH, headY = shoulderY - headR * 1.3;
  const w = 62 * B;
  const L: Layer[] = [];
  // legs (fire side leg lit)
  const lunge = spec.lunge ? 1 : 0;
  const footL: Pt = [cx - w * (0.28 + lunge * 0.9) + r.range(-4, 4), ground - lunge * 6], footR: Pt = [cx + w * (0.3 + lunge * 0.5) + r.range(-4, 4), ground];
  L.push({ kind: 'mass', pts: limb([cx - w * 0.22, hipY + 4], footL, r, 19 * B, 12 * B, 0.12), z: 1 });
  L.push({ kind: 'mass', pts: limb([cx + w * 0.22, hipY + 4], footR, r, 19 * B, 12 * B, 0.12), z: 1 });
  L.push({ kind: 'mass', pts: boot(footL, r, 18 * B), z: 1 });
  L.push({ kind: 'mass', pts: boot(footR, r, 18 * B), z: 1 });
  // cloak behind
  if ((spec.cloak ?? 0) > 0) L.push({ kind: 'mass', pts: cloak(cx + 4, hipY - torsoH * 0.1, r, w * 1.5, torsoH + legH * (0.3 + spec.cloak! * 0.7), 0.6), z: 0, tone: 0 });
  // torso
  L.push({ kind: 'mass', pts: torso(cx, hipY - torsoH / 2, r, w, torsoH, B, spec.hunched), z: 2 });
  if ((spec.armour ?? 0) > 0.3) {
    L.push({ kind: 'mass', pts: blob(cx - w * 0.52, shoulderY + 10, 16 * B, 12 * B, r, 0.12, 12), z: 3, tone: 0.3 });
    L.push({ kind: 'mass', pts: blob(cx + w * 0.52, shoulderY + 10, 16 * B, 12 * B, r, 0.12, 12), z: 3, tone: 0.3 });
  }
  // head
  const hy = headY;
  if (spec.head === 'skull' || spec.head === undefined || spec.head === 'bare') L.push({ kind: 'mass', pts: spec.head === 'bare' ? blob(cx, hy, headR * 0.9, headR * 1.05, r, 0.08, 14) : skull(cx, hy, r, headR), z: 4 });
  else if (spec.head === 'helm' || spec.head === 'helmCrest') { L.push({ kind: 'mass', pts: helm(cx, hy, r, headR, spec.head === 'helmCrest'), z: 4 }); L.push({ kind: 'detail', pts: jitter([[cx - headR * 0.75, hy - headR * 0.15], [cx + headR * 0.75, hy - headR * 0.2], [cx + headR * 0.7, hy + headR * 0.08], [cx - headR * 0.7, hy + headR * 0.12]], r, 0.8), color: 'void', alpha: 0.95, smooth: false, z: 8 }); }
  else if (spec.head === 'hood') L.push({ kind: 'mass', pts: hood(cx, hy + 6, r, headR * 1.15), z: 4 });
  else if (spec.head === 'crowned') { L.push({ kind: 'mass', pts: skull(cx, hy, r, headR), z: 4 }); for (let i = -2; i <= 2; i++) L.push({ kind: 'mass', pts: taper([cx + i * headR * 0.42, hy - headR * 0.7], [cx + i * headR * 0.75, hy - headR * (2.1 + (i === 0 ? 0.8 : 0.2))], 7, 1, r, 0.6, 3), z: 4 }); }
  else if (spec.head === 'lantern') { L.push({ kind: 'mass', pts: helm(cx, hy, r, headR), z: 4 }); L.push({ kind: 'glow', cx: cx - w * 0.9, cy: shoulderY + 20, r: 26, color: 'gold', z: 9 }); }
  if (spec.horns) for (const h of horns(cx, hy - headR * 0.6, r, headR * 1.6, headR)) L.push({ kind: 'mass', pts: h, z: 4 });
  if (spec.eyes && spec.eyes !== 'none' && spec.head !== 'none') {
    // eyes are sunk and small: a pinprick of light in a socket, asymmetric, never two cartoon dots
    const ec = spec.eyes === 'ember' ? 'emberHot' : spec.eyes;
    const helmed = spec.head === 'helm' || spec.head === 'helmCrest' || spec.head === 'lantern';
    if (helmed) L.push({ kind: 'glow', cx: cx - headR * 0.1, cy: hy - headR * 0.05, r: headR * 0.42, color: ec, z: 9 });
    else {
      L.push({ kind: 'detail', pts: blob(cx - headR * 0.3, hy - 2, headR * 0.22, headR * 0.16, r, 0.2, 8), color: 'void', alpha: 0.9, z: 8 });
      L.push({ kind: 'detail', pts: blob(cx + headR * 0.32, hy - 1, headR * 0.2, headR * 0.15, r, 0.2, 8), color: 'void', alpha: 0.9, z: 8 });
      L.push({ kind: 'glow', cx: cx - headR * 0.3, cy: hy - 2, r: headR * 0.13, color: ec, z: 9 });
      if (r.chance(0.7)) L.push({ kind: 'glow', cx: cx + headR * 0.32, cy: hy - 1, r: headR * 0.1, color: ec, z: 9 });
    }
  }
  // arms + weapon
  const shL: Pt = [cx - w * 0.5, shoulderY + 12], shR: Pt = [cx + w * 0.5, shoulderY + 12];
  const raised = spec.weapon?.raised ?? r.chance(0.4);
  const handR: Pt = raised ? [cx + w * 0.85, shoulderY - 20] : [cx + w * 0.75, hipY - 6];
  const handL: Pt = spec.shield && spec.shield !== 'none' ? [cx - w * 0.9, hipY - torsoH * 0.35] : [cx - w * 0.72, hipY + 4];
  L.push({ kind: 'mass', pts: limb(shR, handR, r, 16 * B, 10 * B, 0.2), z: 6 });
  L.push({ kind: 'mass', pts: limb(shL, handL, r, 16 * B, 10 * B, 0.2), z: 3 });
  const wk = spec.weapon?.kind ?? 'sword';
  const wl = 84 * H;
  const tipDir: Pt = raised ? [0.35, -1] : [0.15, -1];
  const tip: Pt = [handR[0] + tipDir[0] * wl * (raised ? 1.1 : 1.4), handR[1] + tipDir[1] * wl * (raised ? 1.1 : 1.4)];
  const grip: Pt = [handR[0] - tipDir[0] * wl * 0.3, handR[1] - tipDir[1] * wl * 0.3];
  if (wk === 'sword') L.push({ kind: 'mass', pts: blade(grip, tip, r, 'straight', 9), z: 5, tone: 0.4 });
  if (wk === 'great') L.push({ kind: 'mass', pts: blade(grip, [tip[0] + tipDir[0] * 30, tip[1] + tipDir[1] * 30], r, 'great', 13), z: 5, tone: 0.4 });
  if (wk === 'katana') L.push({ kind: 'mass', pts: blade(grip, tip, r, 'katana', 7), z: 5, tone: 0.4 });
  if (wk === 'rapier') L.push({ kind: 'mass', pts: blade(grip, tip, r, 'rapier', 8), z: 5, tone: 0.4 });
  if (wk === 'cleaver') L.push({ kind: 'mass', pts: blade(grip, [tip[0], tip[1] + 20], r, 'cleaver', 12), z: 5, tone: 0.3 });
  if (wk === 'dagger') L.push({ kind: 'mass', pts: blade([handR[0], handR[1] + 6], [handR[0] + 10, handR[1] - 40], r, 'dagger', 7), z: 5, tone: 0.4 });
  if (wk === 'twin') { L.push({ kind: 'mass', pts: blade([handR[0], handR[1] + 6], [handR[0] + 14, handR[1] - 44], r, 'curved', 7), z: 5, tone: 0.4 }); L.push({ kind: 'mass', pts: blade([handL[0], handL[1] + 6], [handL[0] - 14, handL[1] - 44], r, 'curved', 7), z: 5, tone: 0.4 }); }
  if (wk === 'mace' || wk === 'club' || wk === 'hammer') { const end: Pt = [handR[0] + tipDir[0] * wl, handR[1] + tipDir[1] * wl]; L.push({ kind: 'mass', pts: haft(grip, end, r, wk === 'club' ? 9 : 6), z: 5 }); L.push({ kind: 'mass', pts: wk === 'hammer' ? jitter([[end[0] - 22, end[1] - 10], [end[0] + 22, end[1] - 10], [end[0] + 22, end[1] + 12], [end[0] - 22, end[1] + 12]], r, 1) : wk === 'club' ? blob(end[0], end[1] - 8, 13, 22, r, 0.2, 12) : maceHead(end, r, 15), z: 5, tone: 0.3 }); }
  if (wk === 'spear' || wk === 'halberd') { const g2: Pt = [handR[0] - tipDir[0] * wl * 0.9, handR[1] - tipDir[1] * wl * 0.9]; const end: Pt = [handR[0] + tipDir[0] * wl * 1.5, handR[1] + tipDir[1] * wl * 1.5]; L.push({ kind: 'mass', pts: haft(g2, end, r, 5), z: 5 }); L.push({ kind: 'mass', pts: spearHead(end, [end[0] + tipDir[0] * 34, end[1] + tipDir[1] * 34], r, 10), z: 5, tone: 0.4 }); if (wk === 'halberd') L.push({ kind: 'mass', pts: axeHead([end[0], end[1] + 6], r, 14, 1), z: 5, tone: 0.3 }); }
  if (wk === 'axe') { const end: Pt = [handR[0] + tipDir[0] * wl, handR[1] + tipDir[1] * wl]; L.push({ kind: 'mass', pts: haft(grip, end, r, 6), z: 5 }); L.push({ kind: 'mass', pts: axeHead(end, r, 20, 1), z: 5, tone: 0.3 }); }
  if (wk === 'staff') { const g2: Pt = [handR[0] - tipDir[0] * wl * 0.8, handR[1] - tipDir[1] * wl * 0.8]; const end: Pt = [handR[0] + tipDir[0] * wl * 1.3, handR[1] + tipDir[1] * wl * 1.3]; L.push({ kind: 'mass', pts: haft(g2, end, r, 5), z: 5 }); L.push({ kind: 'glow', cx: end[0], cy: end[1] - 6, r: 18, color: 'wisp', z: 9 }); }
  if (wk === 'crossbow') {
    // stock along the forearm, a bow arc across the muzzle, a string, the wound bolt
    const muzzle: Pt = [handR[0] + 34, handR[1] - 18];
    L.push({ kind: 'mass', pts: haft([handR[0] - 30, handR[1] + 14], muzzle, r, 9), z: 5 });
    L.push({ kind: 'mass', pts: taper([muzzle[0] - 26, muzzle[1] - 22], [muzzle[0] + 4, muzzle[1] + 2], 7, 3, r, 1.2, 5), z: 5, tone: 0.3 });
    L.push({ kind: 'mass', pts: taper([muzzle[0] + 30, muzzle[1] + 14], [muzzle[0] + 4, muzzle[1] + 2], 7, 3, r, 1.2, 5), z: 5, tone: 0.3 });
    L.push({ kind: 'line', pts: [[muzzle[0] - 26, muzzle[1] - 22], [handR[0] - 8, handR[1] + 4], [muzzle[0] + 30, muzzle[1] + 14]], width: 1.2, closed: false, z: 7 });
    L.push({ kind: 'mass', pts: taper([handR[0] - 16, handR[1] + 6], [muzzle[0] + 12, muzzle[1] - 8], 3, 1.5, r, 0.4, 3), z: 6, tone: 0.5 });
  }
  if (wk === 'bell') { const end: Pt = [handR[0] + tipDir[0] * wl * 0.9, handR[1] + tipDir[1] * wl * 0.9]; L.push({ kind: 'mass', pts: haft(grip, end, r, 6), z: 5 }); L.push({ kind: 'mass', pts: jitter([[end[0] - 16, end[1] - 22], [end[0] + 16, end[1] - 22], [end[0] + 22, end[1] + 8], [end[0] - 22, end[1] + 8]], r, 1), z: 5, tone: 0.3 }); }
  if (spec.shield && spec.shield !== 'none') L.push({ kind: 'mass', pts: shield(handL[0] - 6, handL[1] - 6, r, 46 * B, 66 * B, spec.shield === 'kite'), z: 6, tone: 0.35 });
  if (spec.rope) {
    // the noose: a heavy rope from the top edge, a knot beside the jaw, a tail over the shoulder
    L.push({ kind: 'mass', pts: rope([cx + headR * 1.6, -10], [cx + headR * 0.9, hy + headR * 0.5], r, 8), z: 3, tone: 0.5 });
    L.push({ kind: 'mass', pts: blob(cx + headR * 0.85, hy + headR * 0.85, headR * 0.5, headR * 0.36, r, 0.25, 10), z: 5, tone: 0.6 });
    L.push({ kind: 'mass', pts: rope([cx + headR * 0.8, hy + headR * 0.95], [cx + w * 0.62, shoulderY + torsoH * 0.4], r, 6), z: 5, tone: 0.5 });
    // the fibre reads pale against the armour: a bone overlay along the rope and its knot
    L.push({ kind: 'detail', pts: rope([cx + headR * 1.6, -10], [cx + headR * 0.9, hy + headR * 0.5], r, 5), color: 'bone', alpha: 0.55, z: 7 });
    L.push({ kind: 'detail', pts: blob(cx + headR * 0.85, hy + headR * 0.85, headR * 0.4, headR * 0.28, r, 0.25, 10), color: 'bone', alpha: 0.5, z: 7 });
    L.push({ kind: 'detail', pts: rope([cx + headR * 0.8, hy + headR * 0.95], [cx + w * 0.62, shoulderY + torsoH * 0.4], r, 4), color: 'bone', alpha: 0.5, z: 7 });
  }
  if (spec.chains) for (const c of chain([cx - w * 0.5, hipY], [cx - w * 1.1, ground - 10], r, 5, 4)) L.push({ kind: 'mass', pts: c, z: 6 });
  if (spec.wings) { L.push({ kind: 'mass', pts: jitter([[cx - w * 0.3, shoulderY + 20], [cx - w * 1.6, shoulderY - 40], [cx - w * 1.9, shoulderY + 30], [cx - w * 1.3, shoulderY + 20], [cx - w * 1.4, shoulderY + 70], [cx - w * 0.7, shoulderY + 40]], r, 3), z: 0 }); L.push({ kind: 'mass', pts: jitter([[cx + w * 0.3, shoulderY + 20], [cx + w * 1.6, shoulderY - 40], [cx + w * 1.9, shoulderY + 30], [cx + w * 1.3, shoulderY + 20], [cx + w * 1.4, shoulderY + 70], [cx + w * 0.7, shoulderY + 40]], r, 3), z: 0 }); }
  // interior lines: a few etched folds and edges
  L.push({ kind: 'line', pts: [[cx - w * 0.2, shoulderY + 30], [cx - w * 0.05, hipY - 10]], width: 1.4, closed: false, z: 7 });
  L.push({ kind: 'line', pts: [[cx + w * 0.15, shoulderY + 24], [cx + w * 0.25, hipY - 16]], width: 1.1, closed: false, z: 7 });
  // rim light region: fire-side flank
  L.push({ kind: 'light', pts: taper([cx - w * 0.45, shoulderY + 10], [cx - w * 0.3, ground], 22 * B, 14 * B, r, 1), power: 0.42, z: 8 });
  if (spec.fx) L.push(...spec.fx);
  return L;
}

export interface BeastSpec {
  size?: number;
  spines?: boolean;
  tail?: 'long' | 'short' | 'none';
  headLow?: boolean;
  legs?: 2 | 4 | 6;
  eyes?: 'ember' | 'wisp' | 'gold' | 'none';
  wings?: boolean;
  segmented?: boolean; // leech / crawler
  maw?: boolean;
}

export function beast(r: Rng, spec: BeastSpec = {}): Layer[] {
  const S = spec.size ?? 1;
  const cx = PW * 0.5, ground = PH * 0.9;
  const bodyW = 110 * S, bodyH = 54 * S;
  const by = ground - bodyH * 0.9 - 24 * S;
  const L: Layer[] = [];
  const legs = spec.legs ?? 4;
  for (let i = 0; i < legs; i++) {
    const t = i / (legs - 1);
    const x = cx - bodyW * 0.4 + t * bodyW * 0.8;
    L.push({ kind: 'mass', pts: limb([x, by + bodyH * 0.2], [x + r.range(-8, 8), ground], r, 14 * S, 8 * S), z: 1 });
  }
  L.push({ kind: 'mass', pts: spec.segmented ? segmentedBody(cx, by, bodyW, bodyH, r) : blob(cx, by, bodyW / 2, bodyH / 2, r, 0.14, 20), z: 2 });
  const hx = cx + bodyW * 0.55, hy = spec.headLow ? by + bodyH * 0.25 : by - bodyH * 0.25;
  L.push({ kind: 'mass', pts: blob(hx, hy, 24 * S, 20 * S, r, 0.12, 14, 0.3), z: 3 });
  if (spec.maw) L.push({ kind: 'mass', pts: jitter([[hx + 10 * S, hy + 4 * S], [hx + 34 * S, hy + 2 * S], [hx + 30 * S, hy + 18 * S], [hx + 8 * S, hy + 14 * S]], r, 1.5), z: 3 });
  L.push({ kind: 'mass', pts: taper([hx - 10 * S, hy - 14 * S], [hx - 4 * S, hy - 32 * S], 8 * S, 2, r, 0.5, 3), z: 3 });
  if (spec.spines) for (let i = 0; i < 6; i++) { const x = cx - bodyW * 0.35 + i * bodyW * 0.13; L.push({ kind: 'mass', pts: taper([x, by - bodyH * 0.45], [x - 4, by - bodyH * 0.45 - (14 + (i % 2) * 8) * S], 7 * S, 1, r, 0.4, 3), z: 3 }); }
  if (spec.tail !== 'none') L.push({ kind: 'mass', pts: taper([cx - bodyW * 0.45, by], [cx - bodyW * (spec.tail === 'long' ? 0.95 : 0.65), by - bodyH * (spec.tail === 'long' ? 0.9 : 0.3)], 12 * S, 2, r, 1.5, 7), z: 1 });
  if (spec.wings) L.push({ kind: 'mass', pts: jitter([[cx - 10, by - bodyH * 0.3], [cx - bodyW * 0.7, by - bodyH * 2.2], [cx - bodyW * 0.2, by - bodyH * 1.2], [cx + bodyW * 0.3, by - bodyH * 2.0], [cx + bodyW * 0.2, by - bodyH * 0.4]], r, 3), z: 0 });
  if (spec.eyes && spec.eyes !== 'none') L.push({ kind: 'glow', cx: hx + 8 * S, cy: hy - 4 * S, r: 8 * S, color: spec.eyes === 'ember' ? 'emberHot' : spec.eyes, z: 9 });
  L.push({ kind: 'line', pts: [[cx - bodyW * 0.3, by - 4], [cx + bodyW * 0.2, by + 6]], width: 1.3, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - bodyW * 0.4, by + bodyH * 0.3], [cx + bodyW * 0.3, by + bodyH * 0.45], 18 * S, 12 * S, r, 1), power: 0.5, z: 8 });
  return L;
}

function segmentedBody(cx: number, cy: number, w: number, h: number, r: Rng): Pt[] {
  const top: Pt[] = [], bot: Pt[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx - w / 2 + t * w;
    const bump = (i % 2 ? 1 : 0.7) * h * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.2));
    top.push([x, cy - bump + r.range(-2, 2)]);
    bot.push([x, cy + bump * 0.7 + r.range(-2, 2)]);
  }
  return [...top, ...bot.reverse()];
}

export type WraithForm = 'shroud' | 'column' | 'flayed' | 'spire' | 'wide';
export interface WraithSpec { height?: number; tatter?: number; eyes?: 'wisp' | 'ember' | 'gold' | 'none'; arms?: boolean; crown?: boolean; sun?: boolean; form?: WraithForm; hands?: boolean }

export function wraith(r: Rng, spec: WraithSpec = {}): Layer[] {
  const H = spec.height ?? 1;
  const cx = PW * 0.5, top = PH * 0.12, bot = PH * 0.95;
  const form = spec.form ?? 'shroud';
  const w = (form === 'column' ? 44 : form === 'wide' ? 100 : form === 'spire' ? 56 : 70) * H;
  const L: Layer[] = [];
  const pts: Pt[] = form === 'spire' ? [[cx, top - 20], [cx + w * 0.3, top + 80 * H], [cx + w * 0.7, bot - 60], [cx + w * 0.5, bot - 40]] : [[cx - 8, top], [cx + w * 0.55, top + 60 * H], [cx + w * 0.7, bot - 90], [cx + w * 0.5, bot - 40]];
  const n = form === 'flayed' ? 14 : 8;
  const tat = (spec.tatter ?? 0.6) * (form === 'flayed' ? 1.8 : 1);
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([cx + w * 0.5 - t * w, bot - (i % 2 ? 0 : tat * r.range(20, 60))]); }
  pts.push([cx - w * 0.7, bot - 90], [cx - w * 0.6, top + 60 * H]);
  if (form === 'flayed') for (let i = 0; i < 5; i++) L.push({ kind: 'mass', pts: taper([cx + r.range(-w * 0.4, w * 0.4), top + 120 * H], [cx + r.range(-w * 1.1, w * 1.1), bot + 10], 14, 1, r, 3, 5), z: 1 });
  L.push({ kind: 'mass', pts: jitter(pts, r, 3), z: 2 });
  L.push({ kind: 'mass', pts: form === 'spire' ? jitter([[cx - 18 * H, top + 60 * H], [cx, top + 4], [cx + 18 * H, top + 60 * H]], r, 2) : blob(cx, top + 34 * H, 22 * H, 26 * H, r, 0.1, 14), z: 3 });
  if (spec.hands) { L.push({ kind: 'mass', pts: jitter([[cx - w * 0.5, top + 110], [cx - w * 0.9, top + 60], [cx - w * 0.75, top + 100], [cx - w * 0.6, top + 130]], r, 2), z: 3 }); L.push({ kind: 'mass', pts: jitter([[cx + w * 0.5, top + 110], [cx + w * 0.9, top + 60], [cx + w * 0.75, top + 100], [cx + w * 0.6, top + 130]], r, 2), z: 3 }); }
  if (spec.arms) { L.push({ kind: 'mass', pts: limb([cx - w * 0.4, top + 90], [cx - w * 1.0, top + 150], r, 12, 6), z: 3 }); L.push({ kind: 'mass', pts: limb([cx + w * 0.4, top + 90], [cx + w * 0.95, top + 40], r, 12, 6), z: 3 }); }
  if (spec.crown) for (let i = -2; i <= 2; i++) L.push({ kind: 'mass', pts: taper([cx + i * 14 * H, top + 16], [cx + i * 20 * H, top - 30 - (2 - Math.abs(i)) * 12], 9, 1, r, 0.6, 3), z: 3 });
  if (spec.sun) L.push({ kind: 'glow', cx, cy: top + 34 * H, r: 60, color: 'gold', z: 9 });
  if (spec.eyes && spec.eyes !== 'none') { L.push({ kind: 'glow', cx: cx - 8, cy: top + 32 * H, r: 8, color: spec.eyes === 'ember' ? 'emberHot' : spec.eyes, z: 9 }); L.push({ kind: 'glow', cx: cx + 9, cy: top + 32 * H, r: 8, color: spec.eyes === 'ember' ? 'emberHot' : spec.eyes, z: 9 }); }
  L.push({ kind: 'line', pts: [[cx - 10, top + 90], [cx - 24, bot - 70]], width: 1.2, closed: false, z: 7 });
  L.push({ kind: 'line', pts: [[cx + 14, top + 100], [cx + 20, bot - 60]], width: 1.0, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - w * 0.45, top + 80], [cx - w * 0.35, bot - 40], 16, 10, r, 1), power: 0.4, z: 8 });
  return L;
}

export type RobeForm = 'cone' | 'tall' | 'wide' | 'bent';
export type HoodForm = 'pointed' | 'cowl' | 'mitre' | 'bare' | 'veil';

export function robed(r: Rng, spec: HumanoidSpec & { staff?: boolean; lantern?: boolean; hoodUp?: boolean; form?: RobeForm; hoodForm?: HoodForm; sleeves?: boolean; book?: boolean } = {}): Layer[] {
  const H = spec.height ?? 1;
  const cx = PW * 0.5, ground = PH * 0.94;
  const top = ground - 230 * H;
  const L: Layer[] = [];
  const form = spec.form ?? 'cone';
  const shoulder = form === 'wide' ? 44 : form === 'tall' ? 20 : form === 'bent' ? 30 : 26;
  const hem = form === 'wide' ? 84 : form === 'tall' ? 40 : form === 'bent' ? 56 : 62;
  const lean = form === 'bent' ? 22 : 0;
  const robe: Pt[] = [[cx - shoulder * H + lean, top + 40 * H], [cx + shoulder * H + lean, top + 40 * H], [cx + (hem * 0.7) * H + lean * 0.5, top + 130 * H], [cx + hem * H, ground]];
  for (let i = 0; i <= 7; i++) robe.push([cx + hem * H - (i / 7) * 2 * hem * H, ground - (i % 2 ? 6 : 0) + r.range(-2, 2)]);
  robe.push([cx - (hem * 0.7) * H + lean * 0.5, top + 130 * H]);
  L.push({ kind: 'mass', pts: jitter(robe, r, 2), z: 2 });
  const hf: HoodForm = spec.hoodForm ?? (spec.hoodUp === false ? 'bare' : 'pointed');
  const hx = cx + lean, hy = top + 26 * H;
  if (hf === 'bare') L.push({ kind: 'mass', pts: skull(hx, top + 22 * H, r, 18 * H), z: 4 });
  else if (hf === 'pointed') L.push({ kind: 'mass', pts: jitter([[hx - 26 * H, hy + 28 * H], [hx - 18 * H, hy - 8 * H], [hx - 2 * H, hy - 44 * H], [hx + 12 * H, hy - 10 * H], [hx + 26 * H, hy + 28 * H]], r, 2), z: 4 });
  else if (hf === 'cowl') L.push({ kind: 'mass', pts: hood(hx, hy, r, 22 * H), z: 4 });
  else if (hf === 'mitre') L.push({ kind: 'mass', pts: jitter([[hx - 20 * H, hy + 26 * H], [hx - 16 * H, hy - 30 * H], [hx, hy - 62 * H], [hx + 16 * H, hy - 30 * H], [hx + 20 * H, hy + 26 * H]], r, 2), z: 4 });
  else if (hf === 'veil') { L.push({ kind: 'mass', pts: blob(hx, hy - 4, 16 * H, 18 * H, r, 0.1, 12), z: 4 }); L.push({ kind: 'mass', pts: jitter([[hx - 30 * H, hy - 20 * H], [hx + 30 * H, hy - 20 * H], [hx + 34 * H, hy + 70 * H], [hx - 34 * H, hy + 70 * H]], r, 3), z: 3, tone: 0.3 }); }
  if (spec.sleeves) { L.push({ kind: 'mass', pts: jitter([[cx - shoulder * H, top + 50 * H], [cx - shoulder * H - 40 * H, top + 120 * H], [cx - shoulder * H - 10 * H, top + 130 * H], [cx - shoulder * H + 10 * H, top + 80 * H]], r, 2), z: 3 }); L.push({ kind: 'mass', pts: jitter([[cx + shoulder * H, top + 50 * H], [cx + shoulder * H + 40 * H, top + 120 * H], [cx + shoulder * H + 10 * H, top + 130 * H], [cx + shoulder * H - 10 * H, top + 80 * H]], r, 2), z: 3 }); }
  if (spec.book) { L.push({ kind: 'mass', pts: jitter([[cx - 30 * H, top + 100 * H], [cx + 30 * H, top + 96 * H], [cx + 32 * H, top + 130 * H], [cx - 28 * H, top + 134 * H]], r, 1.5), z: 5, tone: 0.5 }); }
  const handR: Pt = [cx + 44 * H, top + 110 * H];
  L.push({ kind: 'mass', pts: limb([cx + 22 * H, top + 60 * H], handR, r, 14, 9), z: 3 });
  L.push({ kind: 'mass', pts: limb([cx - 22 * H, top + 60 * H], [cx - 40 * H, top + 120 * H], r, 14, 9), z: 3 });
  if (spec.staff !== false) { L.push({ kind: 'mass', pts: haft([handR[0] + 6, ground], [handR[0] + 14, top - 10 * H], r, 5), z: 5 }); L.push({ kind: 'glow', cx: handR[0] + 15, cy: top - 6 * H, r: 16, color: spec.eyes === 'gold' ? 'gold' : 'wisp', z: 9 }); }
  if (spec.lantern) L.push({ kind: 'glow', cx: cx - 48 * H, cy: top + 126 * H, r: 24, color: 'gold', z: 9 });
  if (spec.eyes && spec.eyes !== 'none') { L.push({ kind: 'glow', cx: cx - 6, cy: top + 26 * H, r: 6, color: spec.eyes === 'ember' ? 'emberHot' : spec.eyes, z: 9 }); L.push({ kind: 'glow', cx: cx + 7, cy: top + 26 * H, r: 6, color: spec.eyes === 'ember' ? 'emberHot' : spec.eyes, z: 9 }); }
  L.push({ kind: 'line', pts: [[cx - 8, top + 70 * H], [cx - 18, ground - 10]], width: 1.3, closed: false, z: 7 });
  L.push({ kind: 'line', pts: [[cx + 10, top + 80 * H], [cx + 22, ground - 20]], width: 1.1, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - 34 * H, top + 90 * H], [cx - 48 * H, ground], 16, 12, r, 1), power: 0.5, z: 8 });
  if (spec.fx) L.push(...spec.fx);
  return L;
}

/** Big blocky constructs: golems, sentinels, custodians. */
export function golem(r: Rng, spec: { size?: number; eyes?: 'ember' | 'wisp' | 'gold'; cracks?: boolean; halberd?: boolean; twin?: boolean } = {}): Layer[] {
  const S = spec.size ?? 1;
  const cx = PW * 0.5, ground = PH * 0.94;
  const L: Layer[] = [];
  const bodyH = 150 * S, bodyW = 110 * S;
  const by = ground - 60 * S - bodyH / 2;
  L.push({ kind: 'mass', pts: jitter([[cx - bodyW * 0.3, ground], [cx - bodyW * 0.32, ground - 60 * S], [cx - bodyW * 0.1, ground - 60 * S], [cx - bodyW * 0.08, ground]], r, 2), z: 1 });
  L.push({ kind: 'mass', pts: jitter([[cx + bodyW * 0.08, ground], [cx + bodyW * 0.1, ground - 60 * S], [cx + bodyW * 0.32, ground - 60 * S], [cx + bodyW * 0.3, ground]], r, 2), z: 1 });
  L.push({ kind: 'mass', pts: jitter(resample([[cx - bodyW * 0.45, by + bodyH * 0.5], [cx - bodyW * 0.55, by - bodyH * 0.35], [cx - bodyW * 0.3, by - bodyH * 0.5], [cx + bodyW * 0.3, by - bodyH * 0.5], [cx + bodyW * 0.55, by - bodyH * 0.35], [cx + bodyW * 0.45, by + bodyH * 0.5]], 20), r, 3), z: 2 });
  L.push({ kind: 'mass', pts: jitter([[cx - 22 * S, by - bodyH * 0.5 + 6], [cx + 22 * S, by - bodyH * 0.5 + 6], [cx + 18 * S, by - bodyH * 0.5 - 30 * S], [cx - 18 * S, by - bodyH * 0.5 - 30 * S]], r, 2), z: 4 });
  L.push({ kind: 'mass', pts: limb([cx - bodyW * 0.5, by - bodyH * 0.3], [cx - bodyW * 0.75, by + bodyH * 0.4], r, 30 * S, 22 * S), z: 3 });
  L.push({ kind: 'mass', pts: limb([cx + bodyW * 0.5, by - bodyH * 0.3], [cx + bodyW * 0.72, by + bodyH * 0.4], r, 30 * S, 22 * S), z: 3 });
  if (spec.halberd) { const g: Pt = [cx + bodyW * 0.72, by + bodyH * 0.55]; const e: Pt = [cx + bodyW * 0.85, by - bodyH * 0.95]; L.push({ kind: 'mass', pts: haft(g, e, r, 6), z: 5 }); L.push({ kind: 'mass', pts: spearHead(e, [e[0] + 4, e[1] - 40], r, 12), z: 5, tone: 0.4 }); L.push({ kind: 'mass', pts: axeHead([e[0], e[1] + 10], r, 18, 1), z: 5, tone: 0.3 }); }
  if (spec.cracks) for (let i = 0; i < 4; i++) L.push({ kind: 'glow', cx: cx + r.range(-bodyW * 0.3, bodyW * 0.3), cy: by + r.range(-bodyH * 0.3, bodyH * 0.3), r: 10, color: 'ember', z: 9 });
  L.push({ kind: 'glow', cx: cx - 8 * S, cy: by - bodyH * 0.5 - 12 * S, r: 7 * S, color: spec.eyes === 'wisp' ? 'wisp' : spec.eyes === 'gold' ? 'gold' : 'emberHot', z: 9 });
  L.push({ kind: 'glow', cx: cx + 8 * S, cy: by - bodyH * 0.5 - 12 * S, r: 7 * S, color: spec.eyes === 'wisp' ? 'wisp' : spec.eyes === 'gold' ? 'gold' : 'emberHot', z: 9 });
  L.push({ kind: 'line', pts: [[cx - bodyW * 0.2, by - bodyH * 0.2], [cx - bodyW * 0.1, by + bodyH * 0.3]], width: 1.6, closed: false, z: 7 });
  L.push({ kind: 'line', pts: [[cx + bodyW * 0.1, by - bodyH * 0.35], [cx + bodyW * 0.25, by + bodyH * 0.1]], width: 1.2, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - bodyW * 0.45, by - bodyH * 0.2], [cx - bodyW * 0.3, ground], 26 * S, 16 * S, r, 1), power: 0.55, z: 8 });
  return L;
}

/** A bound tome: book mass with fanned pages and a chain. */
export function tome(r: Rng): Layer[] {
  const cx = PW * 0.5, cy = PH * 0.55;
  const L: Layer[] = [];
  L.push({ kind: 'mass', pts: jitter([[cx - 70, cy - 40], [cx + 70, cy - 50], [cx + 76, cy + 50], [cx - 66, cy + 60]], r, 3), z: 2 });
  for (let i = 0; i < 7; i++) L.push({ kind: 'mass', pts: taper([cx - 60 + i * 20, cy - 44], [cx - 80 + i * 24, cy - 100 - (i % 3) * 20], 10, 2, r, 1, 4), z: 1, tone: 0.5 });
  for (const c of chain([cx - 70, cy + 10], [cx + 74, cy + 6], r, 8, 5)) L.push({ kind: 'mass', pts: c, z: 5, tone: 0.3 });
  L.push({ kind: 'glow', cx, cy: cy + 4, r: 28, color: 'wisp', z: 9 });
  L.push({ kind: 'line', pts: [[cx - 60, cy - 30], [cx + 62, cy - 38]], width: 1.4, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - 66, cy - 30], [cx - 60, cy + 56], 18, 12, r, 1), power: 0.5, z: 8 });
  return L;
}

/** Sprite: a small dark shape with a bright core. */
export function sprite(r: Rng): Layer[] {
  const cx = PW * 0.5, cy = PH * 0.5;
  const L: Layer[] = [];
  L.push({ kind: 'mass', pts: blob(cx, cy, 44, 52, r, 0.3, 22), z: 2 });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4; L.push({ kind: 'mass', pts: taper([cx + Math.cos(a) * 30, cy + Math.sin(a) * 36], [cx + Math.cos(a) * 90, cy + Math.sin(a) * 100], 14, 1, r, 2, 5), z: 1 }); }
  L.push({ kind: 'glow', cx, cy, r: 30, color: 'bone', z: 9 });
  return L;
}

/** A tree-thing: trunk mass, root-legs, branch arms. */
export function treant(r: Rng): Layer[] {
  const cx = PW * 0.5, ground = PH * 0.95;
  const L: Layer[] = [];
  L.push({ kind: 'mass', pts: jitter(resample([[cx - 50, ground], [cx - 40, ground - 90], [cx - 46, ground - 180], [cx - 20, ground - 240], [cx + 26, ground - 250], [cx + 50, ground - 170], [cx + 44, ground - 80], [cx + 60, ground]], 26), r, 4), z: 2 });
  for (let i = 0; i < 4; i++) L.push({ kind: 'mass', pts: taper([cx - 30 + i * 22, ground - 20], [cx - 60 + i * 42, ground], 14, 5, r, 1.5, 4), z: 1 });
  L.push({ kind: 'mass', pts: taper([cx - 44, ground - 200], [cx - 110, ground - 150], 20, 6, r, 2, 5), z: 3 });
  L.push({ kind: 'mass', pts: taper([cx + 46, ground - 210], [cx + 112, ground - 260], 20, 6, r, 2, 5), z: 3 });
  L.push({ kind: 'mass', pts: taper([cx + 30, ground - 246], [cx + 40, ground - 300], 12, 3, r, 2, 4), z: 3 });
  L.push({ kind: 'glow', cx: cx - 6, cy: ground - 215, r: 8, color: 'verdigris', z: 9 });
  L.push({ kind: 'glow', cx: cx + 12, cy: ground - 212, r: 8, color: 'verdigris', z: 9 });
  L.push({ kind: 'line', pts: [[cx - 10, ground - 190], [cx - 4, ground - 40]], width: 1.6, closed: false, z: 7 });
  L.push({ kind: 'line', pts: [[cx + 18, ground - 170], [cx + 26, ground - 60]], width: 1.2, closed: false, z: 7 });
  L.push({ kind: 'light', pts: taper([cx - 40, ground - 160], [cx - 44, ground], 18, 14, r, 1), power: 0.5, z: 8 });
  return L;
}

/** Drake: winged beast with a long neck. */
export function drake(r: Rng): Layer[] {
  const L = beast(r, { size: 1.0, tail: 'long', wings: true, eyes: 'ember', spines: true });
  const cx = PW * 0.5;
  L.push({ kind: 'glow', cx: cx + 70, cy: PH * 0.9 - 70, r: 22, color: 'ember', z: 9 });
  return L;
}
