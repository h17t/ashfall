/** Renders art/palette.png: real swatches with their tokens, plus the tone ramp. */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import { PALETTE, toneRamp } from './palette';

const W = 1200, H = 520;
const entries = Object.entries(PALETTE);
let body = '';
entries.forEach(([k, v], i) => {
  const x = 40 + (i % 7) * 160, y = 40 + Math.floor(i / 7) * 190;
  body += `<rect x="${x}" y="${y}" width="140" height="110" fill="${v}" stroke="#4A423C" stroke-width="1"/>`;
  body += `<text x="${x}" y="${y + 135}" font-family="Barlow Condensed, sans-serif" font-size="18" font-weight="600" fill="#C8BBA6">--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}</text>`;
  body += `<text x="${x}" y="${y + 156}" font-family="Barlow Condensed, sans-serif" font-size="15" fill="#8A7D6B">${v}</text>`;
});
// tone ramp
const ry = 420;
for (let i = 0; i < 400; i++) {
  const [r, g, b] = toneRamp(i / 399);
  body += `<rect x="${40 + i * 2.5}" y="${ry}" width="2.6" height="36" fill="rgb(${r | 0},${g | 0},${b | 0})"/>`;
}
body += `<text x="40" y="${ry + 60}" font-family="Barlow Condensed, sans-serif" font-size="15" fill="#8A7D6B">TONE RAMP · luminance → house colour (treatment chain step 1)</text>`;
for (const [tint, x] of [['verdigris', 1080], ['soul', 1080]] as const) void tint, void x;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0A0908"/>${body}</svg>`;
const fontDir = 'node_modules/@fontsource/barlow-condensed/files';
const png = new Resvg(svg, { font: { fontFiles: fs.readdirSync(fontDir).filter((f) => f.endsWith('.woff2') === false && f.endsWith('.woff')).map((f) => `${fontDir}/${f}`), loadSystemFonts: false, defaultFontFamily: 'Barlow Condensed' } }).render().asPng();
fs.mkdirSync('art', { recursive: true });
fs.writeFileSync('art/palette.png', png);
console.log('wrote art/palette.png');
