/** Dev: render one rig end to end and write art/try-*.png for review. */
import fs from 'node:fs';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { composePlate, silhouetteSvg, type Plate } from './compose';
import { rng } from './svg';
import { humanoid, beast, wraith, robed, golem, PW, PH } from './parts';
import { treat } from './treat';

const subjects: Record<string, (seed: number) => Plate> = {
  knight: (seed) => ({ id: 'knight', w: PW, h: PH, seed, layers: humanoid(rng(seed), { head: 'helm', armour: 1, weapon: { kind: 'great', raised: true }, cloak: 0.6, eyes: 'ember', bulk: 1.15 }) }),
  hound: (seed) => ({ id: 'hound', w: PW, h: PH, seed, layers: beast(rng(seed), { size: 1, spines: true, tail: 'long', eyes: 'ember', maw: true }) }),
  wraith: (seed) => ({ id: 'wraith', w: PW, h: PH, seed, tint: 'wisp', layers: wraith(rng(seed), { eyes: 'wisp', arms: true }) }),
  acolyte: (seed) => ({ id: 'acolyte', w: PW, h: PH, seed, layers: robed(rng(seed), { eyes: 'ember', staff: true }) }),
  golem: (seed) => ({ id: 'golem', w: PW, h: PH, seed, tint: 'ember', layers: golem(rng(seed), { size: 1, cracks: true, eyes: 'ember' }) }),
};
const which = process.argv[2] ?? 'knight';
const plate = subjects[which](11);
const svg = composePlate(plate);
fs.writeFileSync(`art/try-${which}.svg`, svg);
const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
const t = await treat(png, { seed: 11, tint: plate.tint ?? null });
fs.writeFileSync(`art/try-${which}.webp`, t.webp2x);
// review sheet: raw svg render | treated | silhouette, on parchment and on ink
const sil = new Resvg(silhouetteSvg(plate, '#14100E', '#E8DCC4'), { fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
const treatedPng = await sharp(t.webp2x).png().toBuffer();
await sharp({ create: { width: PW * 6, height: PH * 2, channels: 4, background: '#241E1A' } })
  .composite([{ input: png, left: 0, top: 0 }, { input: treatedPng, left: PW * 2, top: 0 }, { input: sil, left: PW * 4, top: 0 }])
  .png().toFile(`art/try-${which}.png`);
console.log('levels', t.luminanceLevels, 'wrote art/try-' + which + '.png');
