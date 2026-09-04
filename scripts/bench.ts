/** Engine tick benchmark: a full squad, DoTs active, boss fight. Must stay far below the 100ms tick budget. */
import { newGame, step, D } from '../src/engine';
const s = newGame(5);
for (const z of ['mire', 'archive', 'sanctum', 'deep', 'kiln']) s.unlockedZones.push(z);
step(s, 0.1);
for (const [id, w] of [['aldric', 'hollowSword'], ['ilse', 'pilgrimMace'], ['ghrelt', 'rotwoodClub'], ['vesna', 'ashenStaff'], ['corvo', 'banditDagger'], ['ysolde', 'paleDagger']]) {
  s.squad.recruited.push(id);
  s.player.weapons[w] = { id: w, level: 5, infusion: 'none' };
  s.squad.phantoms.push({ id, level: 20, xp: D(0), weapon: w === 'hollowSword' ? null : w, assignment: id === 'ilse' || id === 'corvo' ? 'hunt' : 'beside', hpFrac: 1, actIn: 0.5, retreat: 0 });
}
s.prestige.bossesEverKilled.push('coldPyreWarden', 'mireMother', 'archivistNull', 'saintOrvane');
s.prestige.sigilUnlocks.sixthBanner = 1;
s.prestige.tree = { emberEdge: 5, boneVigor: 5, shadowRate: 5 };
s.covenant.current = 'embers';
s.player.stats.vig = 60; s.player.level = 120;
step(s, 0, [{ type: 'travel', zone: 'kiln', tier: 0 }]);
s.zones.kiln.cleared = 5;
step(s, 0, [{ type: 'travel', zone: 'kiln', tier: -1 }]);
step(s, 0.5);
s.encounter.enemy!.statuses.poison.active = 999; s.encounter.enemy!.statuses.poison.dps = D(10);
s.automation.unlocked.push('autoAttack', 'autoRiposte', 'autoDodge', 'autoEstus'); s.automation.autoAttack = s.automation.autoRiposte = s.automation.autoDodge = s.automation.autoEstus = true;
const N = 20000;
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  step(s, 0.1, i % 3 === 0 ? [{ type: 'click' }] : []);
  if (s.encounter.enemy) { s.encounter.enemy.hp = s.encounter.enemy.hpMax; }
  s.player.hp = s.player.hpMax;
}
const ms = (performance.now() - t0) / N;
console.log(`${ms.toFixed(3)} ms per tick with 6 phantoms, DoT, boss, automation (budget 100ms; ${(ms / 100 * 100).toFixed(2)}% of budget)`);
