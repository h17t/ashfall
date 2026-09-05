// Hover-information audit: on a phone there is no hover, so no information may live only behind
// one. Static: fails on `title=` attributes on interactive elements in src/ui, on onMouseEnter
// handlers, and on `:hover` rules that reveal content (display/visibility/opacity changes).
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const problems = [];
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx|ts|css)$/.test(p)) check(p); } }
function check(p) {
  const rel = path.relative(root, p);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/\btitle=\{?["'`]/.test(line) && /<(button|a|select|input|div|span)\b/.test(line)) problems.push(`${rel}:${i + 1} title= attribute (hover-only text)`);
    if (/onMouseEnter|onMouseOver/.test(line)) problems.push(`${rel}:${i + 1} mouse-hover handler`);
    if (/:hover\s*\{[^}]*(display|visibility|opacity)\s*:/.test(line)) problems.push(`${rel}:${i + 1} :hover reveals content`);
  });
}
walk(path.join(root, 'src/ui')); walk(path.join(root, 'src/render'));
for (const p of problems) console.log(p);
console.log(`hover audit: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
process.exit(problems.length ? 1 : 0);
