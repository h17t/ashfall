/**
 * Banned-terms linter (pass 3). The old vocabulary and every FromSoftware proper noun we could
 * list are forbidden across the source, the content, the tools, the assets manifest and the
 * markdown. A hit fails the build. Run: `npm run lint:terms`; it is also part of `npm test`.
 *
 * Allowances, all deliberate and all narrow:
 *  - `ember` survives only as the palette token (`--ember`, `--ember-hot`, `PALETTE.ember`, `emberHot`,
 *    the utility classes and the `'ember'` colour key in the art tools). It is never a content word.
 *  - `NAMING.md` documents the search and quotes rejected names on purpose.
 *  - The pre-rename save fixture and the one legacy string that recognises old exports/keys are
 *    marked with `banned-terms: allow` on the line.
 */
import fs from 'node:fs';
import path from 'node:path';

export const BANNED: string[] = [
  // the migration table's left column
  'souls', 'soul', 'bonfire', 'bonfires', 'estus', 'bloodstain', 'bloodstains', 'humanity', 'kindle', 'kindled', 'kindling', 'kindles',
  'sigil', 'sigils', 'age of dark', 'titanite', 'covenant', 'covenants', 'phantom', 'phantoms', 'summon', 'sorcery', 'sorceries', 'miracle', 'miracles',
  'pyromancy', 'pyromancies', 'pyromancer', 'attune', 'attuned', 'attunement', 'boss soul', 'fog gate', 'poise', 'stagger', 'staggered', 'riposte', 'ripostes',
  'hollow', 'hollows', 'hollowed', 'undead', 'ng+', 'you died', 'vigor', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith',
  // the old title
  'ashfall',
  // FromSoftware proper nouns and signature terms
  'firelink', 'lordran', 'drangleic', 'lothric', 'anor londo', 'gwyn', 'artorias', 'solaire', 'ornstein', 'smough', 'pontiff', 'sulyvahn', 'aldrich',
  'yhorm', 'nameless king', 'gael', 'midir', 'friede', 'abyss watcher', 'abyss watchers', 'lord of cinder', 'lords of cinder', 'lord of cinders', 'first flame',
  'kiln', 'darksign', 'dark sign', 'chosen undead', 'bearer of the curse', 'ashen one', 'unkindled', 'tarnished', 'erdtree', 'elden', 'malenia', 'radahn',
  'rennala', 'godrick', 'margit', 'morgott', 'site of grace', 'blood echoes', 'yharnam', "hunter's dream", 'blood vial', 'bloodborne', 'sekiro', "demon's souls",
  'boletaria', 'archstone', 'maiden in black', 'moonlight greatsword', 'havel', 'quelaag', 'seath', 'nito', 'pinwheel', "sen's fortress", 'blighttown', 'oolacile',
  'manus', 'kalameet', 'lautrec', 'siegmeyer', 'gwyndolin', 'gwynevere', 'velka', 'way of white', 'warriors of sunlight', 'warrior of sunlight', 'darkmoon',
  'chaos servant', 'forest hunter', 'gravelord', 'blue sentinels', 'bell keepers', 'heirs of the sun', 'pilgrims of dark', 'majula', 'emerald herald',
  'lucatiel', 'fire keeper', 'firekeeper', 'praise the sun', 'undead bone shard', 'estus shard', 'soul of cinder', 'abyss', 'abyssal', 'eskel', 'darkwraith',
  'crystal soul spear', 'soul arrow', 'lightning spear', 'sunlight spear', 'great chaos fireball', 'power within', 'hidden body', 'sacred oath',
];

const ROOTS = ['src', 'assets/manifest.ts', 'tools', 'content', 'scripts', 'README.md', 'DESIGN.md', 'BALANCE.md', 'TODO.md', 'ART.md', 'LORE.md', 'SCREENSHOTS.md', 'QA.md', 'package.json', 'index.html'];
const SKIP = /node_modules|\/dist\/|\/generated\/|\.png$|\.webp$|\.woff|save-v1\.json|package-lock/;
const TEXT = /\.(ts|tsx|css|md|json|mjs|cjs|html)$/;

/** the palette-token forms of ember, removed before scanning */
const EMBER_ALLOWED = /--ember(-hot)?|PAL(ETTE)?\.ember(Hot)?|\bemberHot\b|\b(text|bg|border|from|to|via)-ember(-hot)?\b|'ember'|"ember"|\bember:|\[('|")ember('|")\]|\bember(Hot)?\b(?=\s*[,:}\]])|fireGradient\('[a-z]+', PALETTE\.ember/g;

function* files(root: string): Generator<string> {
  if (!fs.existsSync(root)) return;
  const st = fs.statSync(root);
  if (st.isFile()) { yield root; return; }
  for (const f of fs.readdirSync(root)) {
    const p = path.join(root, f);
    if (SKIP.test(p)) continue;
    const s = fs.statSync(p);
    if (s.isDirectory()) yield* files(p);
    else if (TEXT.test(p)) yield p;
  }
}

export interface Hit { file: string; line: number; term: string; text: string }

export function scan(rootDir = process.cwd()): Hit[] {
  const hits: Hit[] = [];
  const patterns = BANNED.map((t) => ({ term: t, rx: new RegExp(`(^|[^a-z0-9_-])${t.replace(/[+.*?()]/g, (c) => '\\' + c)}(?![a-z0-9_-])`, 'i') }));
  const emberRx = /(^|[^a-z0-9_-])embers?(?![a-z0-9_-])/i;
  for (const root of ROOTS) {
    for (const file of files(path.join(rootDir, root))) {
      const rel = path.relative(rootDir, file);
      if (rel === 'NAMING.md' || rel.endsWith('banned-terms.ts') || rel.endsWith('banned-terms.test.ts') || rel.includes('migrations/')) continue;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/banned-terms: allow/.test(line)) return;
        for (const p of patterns) if (p.rx.test(line)) hits.push({ file: rel, line: i + 1, term: p.term, text: line.trim().slice(0, 120) });
        const stripped = line.replace(EMBER_ALLOWED, '');
        if (emberRx.test(stripped)) hits.push({ file: rel, line: i + 1, term: 'ember (content)', text: line.trim().slice(0, 120) });
      });
    }
  }
  return hits;
}

if (process.argv[1] && /banned-terms\.ts$/.test(process.argv[1])) {
  const hits = scan();
  for (const h of hits) console.log(`${h.file}:${h.line}  [${h.term}]  ${h.text}`);
  console.log(`${hits.length} banned-term hit${hits.length === 1 ? '' : 's'}`);
  process.exit(hits.length ? 1 : 0);
}
