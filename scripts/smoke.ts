import { newGame, advance, fmt, computeMods, weaponDamage } from '../src/engine';
const s = newGame(42);
console.log('dmg', weaponDamage(s, computeMods(s)).total.toString());
let kills = 0, deaths = 0, hits = 0;
for (let i = 0; i < 1200; i++) {
  const ev = advance(s, 0.1, i % 3 === 0 ? [{ type: 'click' }] : []);
  for (const e of ev) { if (e.type === 'kill') kills++; if (e.type === 'death') deaths++; if (e.type === 'hit') hits++; if (e.type === 'unlock' || e.type === 'tierCleared' || e.type==='stagger') console.log(s.t.toFixed(1), e.type, (e as any).text ?? ''); }
  if (s.player.hp < s.player.hpMax * 0.4 && s.player.estus > 0) advance(s, 0, [{ type: 'estus' }]);
}
console.log({ t: s.t, souls: fmt(s.souls), kills, deaths, hits, hp: s.player.hp, stam: s.player.stamina.toFixed(0), tier: s.encounter.tier, cleared: s.zones.approach.cleared });
