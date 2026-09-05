/** Engine tick benchmark: a full cortege, DoTs active, boss fight. Must stay far below the 100ms tick budget. */
import { newGame, step, D } from '../src/engine';
const s = newGame(5);
for (const z of ['mire', 'archive', 'sanctum', 'undercroft', 'renderworks']) s.unlockedZones.push(z);
step(s, 0.1);
for (const [id, w] of [['aldric', 'revenantSword'], ['ilse', 'pilgrimMace'], ['ghrelt', 'rotwoodClub'], ['vesna', 'weaverStaff'], ['corvo', 'banditDagger'], ['ysolde', 'paleDagger']]) {
  s.cortege.recruited.push(id);
  s.player.weapons[w] = { id: w, level: 5, infusion: 'none' };
  s.cortege.shades.push({ id, level: 20, xp: D(0), weapon: w === 'revenantSword' ? null : w, assignment: id === 'ilse' || id === 'corvo' ? 'hunt' : 'beside', hpFrac: 1, actIn: 0.5, retreat: 0 });
}
s.prestige.bossesEverKilled.push('coldPyreWarden', 'mireMother', 'archivistNull', 'saintOrvane');
s.prestige.severingUnlocks.sixthBanner = 1;
s.prestige.tree = { wickEdge: 5, boneVigor: 5, shadowRate: 5 };
s.creed.current = 'wick';
s.player.stats.vit = 60; s.player.level = 120;
step(s, 0, [{ type: 'travel', zone: 'renderworks', tier: 0 }]);
s.zones.renderworks.cleared = 5;
step(s, 0, [{ type: 'travel', zone: 'renderworks', tier: -1 }]);
step(s, 0.5);
s.encounter.enemy!.statuses.poison.active = 999; s.encounter.enemy!.statuses.poison.dps = D(10);
s.automation.unlocked.push('autoAttack', 'autoReprisal', 'autoDodge', 'autoDraught'); s.automation.autoAttack = s.automation.autoReprisal = s.automation.autoDodge = s.automation.autoDraught = true;
const N = 20000;
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  step(s, 0.1, i % 3 === 0 ? [{ type: 'click' }] : []);
  if (s.encounter.enemy) { s.encounter.enemy.hp = s.encounter.enemy.hpMax; }
  s.player.hp = s.player.hpMax;
}
const ms = (performance.now() - t0) / N;
console.log(`${ms.toFixed(3)} ms per tick with 6 shades, DoT, boss, automation (budget 100ms; ${(ms / 100 * 100).toFixed(2)}% of budget)`);
