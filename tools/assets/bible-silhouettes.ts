/** Renders art/silhouettes.png: every subject in ink on parchment at 100px, labelled (via HTML). */
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { silhouetteSvg } from './compose';
import { SUBJECTS } from './subjects';

const cells: string[] = [];
for (const s of SUBJECTS) {
  const p = s.build(7);
  const png = new Resvg(silhouetteSvg(p, '#14100E', 'none'), { fitTo: { mode: 'height', value: 100 } }).render().asPng();
  cells.push(`<div class="c"><img src="data:image/png;base64,${png.toString('base64')}"><span>${s.id}</span></div>`);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:500;src:url("../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2") format("woff2")}
body{margin:0;background:#E8DCC4;padding:24px;width:1400px;box-sizing:border-box;font-family:"Barlow Condensed";display:flex;flex-wrap:wrap;gap:10px 6px}
.c{width:112px;text-align:center}.c img{height:100px;display:block;margin:0 auto}.c span{display:block;font-size:11px;letter-spacing:.06em;color:#4A423C;margin-top:2px}
</style></head><body>${cells.join('')}</body></html>`;
fs.writeFileSync('tools/assets/bible-silhouettes.html', html);
console.log('cells', cells.length);
