/** Three style-target mockups of the combat screen, rendered from real plates and the real fonts. */
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { composePlate } from './compose';
import { findSubject } from './subjects';
import { treat } from './treat';
import { PALETTE } from './palette';

async function plateData(id: string, seed = 7) {
  const p = findSubject(id)!.build(seed);
  const png = new Resvg(composePlate(p), { fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
  const t = await treat(png, { seed, tint: p.tint ?? null });
  return `data:image/webp;base64,${t.webp2x.toString('base64')}`;
}

const fonts = `
@font-face{font-family:"IM Fell English SC";src:url("../../node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2") format("woff2")}
@font-face{font-family:"EB Garamond";src:url("../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2") format("woff2")}
@font-face{font-family:"EB Garamond";font-style:italic;src:url("../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff2") format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:500;src:url("../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2") format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url("../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2") format("woff2")}`;

/** A stone slab with a noise-displaced edge, bevel from the fire (bottom-left) and grain. */
function slab(seed: number, w: number, h: number, fill: string = PALETTE.stone): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
  <defs>
    <filter id="edge${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="grain${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed + 1}"/><feColorMatrix type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0 0.4 0 0 0 0.18 0"/></filter>
    <linearGradient id="bev${seed}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7A5A3A" stop-opacity="0.55"/><stop offset="0.35" stop-color="#7A5A3A" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>
  </defs>
  <g filter="url(#edge${seed})"><rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="${fill}"/><rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="url(#bev${seed})"/></g>
  <rect x="0" y="0" width="${w}" height="${h}" filter="url(#grain${seed})" opacity="0.6"/>
</svg>`;
}

function grainOverlay(): string {
  return `<svg style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:overlay;opacity:.09"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
}

const base = (body: string, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
:root{--void:#0A0908;--ink:#14100E;--stone:#241E1A;--ash:#4A423C;--bone:#C8BBA6;--parchment:#E8DCC4;--ember:#C8560F;--ember-hot:#F0902E;--blood:#6E1212;--blood-bright:#A81C1C;--verdigris:#3D5A4C;--soul:#5C7A99;--gold:#B8912F}
*{box-sizing:border-box}body{margin:0;width:1400px;height:900px;background:radial-gradient(ellipse at 22% 100%,#2A1A0E 0%,var(--ink) 34%,var(--void) 75%);color:var(--bone);font-family:"EB Garamond",serif;overflow:hidden;position:relative}
.lab{font-family:"Barlow Condensed";font-weight:600;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(200,187,166,.7)}
.num{font-family:"Barlow Condensed";font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.disp{font-family:"IM Fell English SC";letter-spacing:.14em;color:var(--parchment)}
.gauge{position:relative;height:14px;background:var(--void);border:1px solid var(--ash);clip-path:polygon(0 15%,2% 0,98% 4%,100% 20%,99% 100%,1% 96%)}
.gauge i{position:absolute;inset:0;background:linear-gradient(90deg,var(--blood),var(--blood-bright));clip-path:polygon(0 0,100% 0,97% 40%,100% 100%,0 100%)}
.slab{position:relative}.slab>*{position:relative}
${extra}
</style></head><body>${body}${grainOverlay()}</body></html>`;

async function main() {
  const boss = await plateData('coldPyreWarden');
  const knight = await plateData('gallowsKnight');
  fs.mkdirSync('art/mockups', { recursive: true });

  // A — off-axis combat frame, hub column overlapping and casting shadow
  const A = base(`
  <div style="position:absolute;left:40px;top:40px;width:900px;height:820px">
    <div class="slab" style="position:absolute;inset:0">${slab(3, 900, 820, '#1C1614')}</div>
    <img src="${boss}" style="position:absolute;left:150px;top:60px;height:700px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.8))">
    <div style="position:absolute;left:60px;top:40px"><div class="lab">The Cindered Approach · Boss Arena</div><div class="disp" style="font-size:46px;margin-top:6px">Eskel</div><div class="disp" style="font-size:20px;letter-spacing:.2em;opacity:.8">Warden of the Cold Pyre</div></div>
    <div style="position:absolute;left:60px;right:60px;bottom:56px"><div class="gauge" style="height:18px"><i style="width:64%"></i></div><div style="display:flex;justify-content:space-between;margin-top:8px"><span class="lab" style="color:var(--ember)">Phase 2 · Backdraft</span><span class="num" style="font-size:20px;color:var(--parchment)">57,392 <span style="color:rgba(200,187,166,.5)">/ 89,688</span></span></div><div style="font-style:italic;font-size:15px;color:rgba(200,187,166,.75);margin-top:4px;max-width:60ch">The cleaver ignites. Every strike feeds it. Strike too fast and the flame answers in kind.</div></div>
  </div>
  <div style="position:absolute;left:880px;top:90px;width:470px;height:720px;filter:drop-shadow(-18px 20px 30px rgba(0,0,0,.85))">
    <div class="slab" style="position:absolute;inset:0">${slab(5, 470, 720)}</div>
    <div style="position:absolute;left:44px;top:40px;right:44px">
      <div class="lab">Ember-tender · Soul level <span class="num" style="color:var(--bone)">31</span></div>
      <div class="num" style="font-size:44px;color:var(--parchment);margin-top:6px;line-height:1">1,240,905 <span style="color:var(--ember);font-size:22px">+3,117</span></div>
      <div class="lab" style="margin-top:22px">HP <span class="num" style="float:right;color:var(--bone)">2,443 / 2,443</span></div><div class="gauge" style="margin-top:5px"><i style="width:100%"></i></div>
      <div class="lab" style="margin-top:14px">Stamina <span class="num" style="float:right;color:var(--bone)">62 / 79</span></div><div class="gauge" style="margin-top:5px;height:9px"><i style="width:78%;background:linear-gradient(90deg,#3D5A4C,#5f7a5a)"></i></div>
      <div style="display:flex;gap:10px;margin-top:26px"><div class="lab" style="border:1px solid var(--ash);padding:10px 14px;flex:1;text-align:center;color:var(--bone)">Estus <span class="num" style="color:var(--ember)">3/3</span></div><div class="lab" style="border:1px solid var(--ash);padding:10px 14px;flex:1;text-align:center;color:var(--bone)">Dodge</div></div>
      <div style="margin-top:30px;border-top:1px solid var(--ash);padding-top:18px"><div class="lab">Hollow Straight Sword <span class="num" style="color:var(--ember)">+4</span></div><div style="font-style:italic;font-size:15px;line-height:1.5;color:rgba(200,187,166,.8);margin-top:8px">The sword every hollow carries, because every hollow was once given one. Notched, honest, unremarkable. It will outlast you, and then someone else will carry it.</div><div class="num" style="margin-top:12px;font-size:16px;color:var(--bone)">Damage 214 · Stagger 6 · Riposte ×3.0 · <span style="font-family:'IM Fell English SC';letter-spacing:.1em">STR D · DEX D</span></div></div>
    </div>
  </div>`);
  fs.writeFileSync('art/mockups/A.html', A);

  // B — cinematic: plate dominant, HUD as a low stone rail, name card top-left
  const Bm = base(`
  <img src="${boss}" style="position:absolute;left:330px;top:-20px;height:920px;filter:drop-shadow(0 40px 60px rgba(0,0,0,.9))">
  <div style="position:absolute;left:0;right:0;top:0;height:70px;background:var(--void)"></div><div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:var(--void)"></div>
  <div style="position:absolute;left:80px;top:110px"><div class="disp" style="font-size:64px;letter-spacing:.24em">Eskel</div><div style="width:260px;height:1px;background:linear-gradient(90deg,var(--ember),transparent);margin:10px 0"></div><div class="disp" style="font-size:22px;letter-spacing:.22em;opacity:.8">Warden of the Cold Pyre</div></div>
  <div style="position:absolute;left:80px;right:80px;bottom:100px"><div class="gauge" style="height:20px"><i style="width:64%"></i></div></div>
  <div style="position:absolute;left:80px;bottom:130px;display:flex;gap:40px;align-items:flex-end"><div><div class="lab">Souls</div><div class="num" style="font-size:40px;color:var(--parchment);line-height:1">1,240,905</div></div><div><div class="lab">HP</div><div class="gauge" style="width:260px;margin-top:6px"><i style="width:100%"></i></div></div><div><div class="lab">Stamina</div><div class="gauge" style="width:200px;height:9px;margin-top:6px"><i style="width:78%;background:linear-gradient(90deg,#3D5A4C,#5f7a5a)"></i></div></div><div class="lab" style="border:1px solid var(--ash);padding:8px 14px;color:var(--bone)">Estus <span class="num" style="color:var(--ember)">3/3</span></div></div>
  <div style="position:absolute;right:80px;top:110px;width:300px;text-align:right"><div class="lab">Phase 2 · Backdraft</div><div style="font-style:italic;font-size:15px;line-height:1.5;color:rgba(200,187,166,.75);margin-top:6px">The cleaver ignites. Every strike feeds it. Strike too fast and the flame answers in kind.</div></div>`);
  fs.writeFileSync('art/mockups/B.html', Bm);

  // C — bestiary page: parchment plate framing, manuscript margins, the game as an illuminated book
  const C = base(`
  <div style="position:absolute;left:60px;top:40px;width:1280px;height:820px;background:#D9CBAE;clip-path:polygon(0.5% 1%,99% 0,100% 98%,1% 100%);box-shadow:0 30px 60px rgba(0,0,0,.8)">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 100%,rgba(200,86,15,.18),transparent 55%),radial-gradient(ellipse at 90% 10%,rgba(74,66,60,.35),transparent 60%)"></div>
    <img src="${knight}" style="position:absolute;left:120px;top:60px;height:640px;filter:drop-shadow(0 20px 30px rgba(20,16,14,.6))">
    <div style="position:absolute;left:620px;top:90px;width:560px;color:#241E1A"><div class="disp" style="color:#241E1A;font-size:40px;letter-spacing:.16em">Gallows Knight</div><div class="lab" style="color:#6E1212;margin-top:4px">Gallows Walk · The Cindered Approach</div><div style="font-style:italic;font-size:19px;line-height:1.55;margin-top:22px;max-width:58ch">Executioners of the old lord, who hanged deserters and, when there were no deserters, pilgrims, and when there were no pilgrims, each other. The rope is still around the neck. It has never once been in the way.</div><div class="num" style="margin-top:28px;font-size:17px;color:#4A423C;line-height:1.7">HP ×1.8 · Damage ×1.5 · Poise ×2.6<br>Resists steel · Shrugs off poison<br>Drops: Titanite Shard, Large Titanite Shard</div></div>
    <div style="position:absolute;left:620px;right:100px;bottom:80px"><div class="gauge" style="height:16px;background:#241E1A;border-color:#4A423C"><i style="width:44%"></i></div><div class="num" style="margin-top:8px;font-size:18px;color:#241E1A">1,318 / 2,996</div></div>
  </div>`);
  fs.writeFileSync('art/mockups/C.html', C);
  console.log('mockups written');
}
main();
