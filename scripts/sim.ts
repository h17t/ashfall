/**
 * Runs every strategy and writes the pacing report to BALANCE.md.
 * Usage: npm run sim [-- --hours 12 --strategies greedy,casual --seed 7 --verbose]
 */
import fs from 'node:fs';
import { runSim, STRATEGIES, fmtTime, type SimResult } from '../src/sim';
import { fmt, D } from '../src/engine';
import { BALANCE } from '../src/content/balance';
import { BOSSES } from '../src/content';

const args = process.argv.slice(2);
const arg = (name: string, def: string) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const hours = Number(arg('hours', '12'));
const seed = Number(arg('seed', '7'));
const verbose = args.includes('--verbose');
const which = arg('strategies', Object.keys(STRATEGIES).join(',')).split(',');
const write = !args.includes('--no-write');

const results: SimResult[] = [];
for (const id of which) {
  const make = STRATEGIES[id];
  if (!make) { console.error('unknown strategy', id); process.exit(1); }
  const r = runSim({ strategy: make(), seed, hours, verbose });
  results.push(r);
  console.log(`${id.padEnd(8)} ${r.hours.toFixed(1)}h in ${r.wallMs}ms | firstBoss ${fmtTime(r.milestones.firstBoss)} | snuff ${fmtTime(r.milestones.firstKindle)} | L${r.finalLevel} deepest ${r.finalDeepest} Waking ${r.finalKindles} deaths ${r.deaths} | stair ${r.descent.runs}/${r.descent.deaths}† best ${r.descent.bestFloor} pays ${r.descent.ratio.toFixed(2)}× | stalls ${r.stalls.length} inv ${r.invariantErrors.length}`);
}

const lines: string[] = [];
lines.push(`### Run — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${hours}h · seed ${seed}`);
lines.push('');
lines.push('| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Snuff | Severing | Final L | Deepest | Waking  | Deaths | Stalls | Stair runs (died) | Best floor | Stair pays (× road rate) | Sim ms |');
lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  const m = r.milestones;
  lines.push(`| ${r.strategy} | ${fmtTime(m.autoAttack)} | ${fmtTime(m.firstDeath)} | ${fmtTime(m.firstBoss)} | ${fmtTime(m.regions[2] ?? null)} | ${fmtTime(m.regions[3] ?? null)} | ${fmtTime(m.firstKindle)} | ${fmtTime(m.firstSigil)} | ${r.finalLevel} | ${r.finalDeepest} | ${r.finalKindles} | ${r.deaths} | ${r.stalls.length} | ${r.descent.runs} (${r.descent.deaths}) | ${r.descent.bestFloor} | ${r.descent.ratio.toFixed(2)} | ${r.wallMs} |`);
}
lines.push('');
lines.push('Marrow earned per hour (first 12 buckets):');
lines.push('');
lines.push('| Strategy | ' + Array.from({ length: Math.min(12, hours) }, (_, i) => `h${i + 1}`).join(' | ') + ' |');
lines.push('|---|' + Array.from({ length: Math.min(12, hours) }, () => '---').join('|') + '|');
for (const r of results) lines.push(`| ${r.strategy} | ` + r.marrowPerHour.slice(0, 12).map((s) => fmt(D(s))).join(' | ') + ' |');
lines.push('');
lines.push('Expeditions, holdfasts, the war, the arts:');
lines.push('');
for (const r of results) lines.push(`- **${r.strategy}**: ${r.stretch.sent} expeditions (${r.stretch.lost} shades lost), ${r.stretch.holdfasts} holdfasts held, ${r.stretch.raids} raids (${r.stretch.repelled} repelled by hand), war contribution ${r.stretch.contributed}, ${r.stretch.arts} Arts used`);
lines.push('');
lines.push('Bosses (first kill):');
lines.push('');
for (const r of results) {
  const bosses = Object.entries(r.milestones.bosses).map(([b, t]) => `${BOSSES[b]?.name ?? b} ${fmtTime(t)}`).join(', ');
  lines.push(`- **${r.strategy}**: ${bosses || 'none'}`);
}
lines.push('');
const stalls = results.flatMap((r) => r.stalls.map((s) => `- **${r.strategy}** stalled ${fmtTime(s.duration)} from ${fmtTime(s.from)} at ${s.where}, level ${s.level}`));
if (stalls.length) { lines.push('Stalls (no progress event for 20+ min):'); lines.push(''); lines.push(...stalls); lines.push(''); }
const inv = results.flatMap((r) => r.invariantErrors.map((e) => `- **${r.strategy}**: ${e}`));
if (inv.length) { lines.push('Invariant violations:'); lines.push(''); lines.push(...inv); lines.push(''); }
lines.push(`Targets: first boss ${BALANCE.targets.firstBossMin[0]}–${BALANCE.targets.firstBossMin[1]} min · first Snuff ${BALANCE.targets.firstKindleHours[0]}–${BALANCE.targets.firstKindleHours[1]} h · first Severing ${BALANCE.targets.firstSigilHours[0]}–${BALANCE.targets.firstSigilHours[1]} h · auto-attack by ${BALANCE.targets.autoAttackMin[1]} min`);
lines.push('');
const report = lines.join('\n');
console.log('\n' + report);
if (write) {
  const path = 'BALANCE.md';
  const existing = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '# Mournwake — Balance Log\n';
  const marker = '\n## Latest simulator run\n\n';
  const idx = existing.indexOf(marker);
  const head = idx >= 0 ? existing.slice(0, idx) : existing;
  const prevRuns = idx >= 0 ? existing.slice(idx + marker.length) : '';
  // keep the previous "latest" as history under a collapsed section (last 3 runs)
  const historyMarker = '\n<details><summary>Previous runs</summary>\n\n';
  const prevLatest = prevRuns.split(historyMarker)[0];
  const prevHistory = prevRuns.includes(historyMarker) ? prevRuns.split(historyMarker)[1].replace(/\n<\/details>\n?$/, '') : '';
  const history = [prevLatest.trim(), prevHistory.trim()].filter(Boolean).join('\n\n---\n\n').split('\n\n---\n\n').slice(0, 3).join('\n\n---\n\n');
  fs.writeFileSync(path, head.trimEnd() + '\n' + marker + report + (history ? historyMarker + history + '\n</details>\n' : ''));
  console.log('wrote', path);
}
