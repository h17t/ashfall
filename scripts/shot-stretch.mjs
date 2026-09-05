// Dispatch sheet, a holdfast row with a raid, the war board, the Art on the hand.
import { chromium, executablePath } from '../tools/audit/browser.mjs';
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.env.URL ?? 'http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  s.marrow = new D(96000); s.player.level = 36; s.player.hpMax = 1e6; s.player.hp = 1e6; s.stats.bossKills = 2; s.flags.holdfastsUnlocked = true; s.flags.dispatchUnlocked = true; s.flags.warUnlocked = true; s.flags.forgeUnlocked = true; s.flags.descentUnlocked = true;
  s.prestige.bossesEverKilled = ['coldPyreWarden', 'mireMother']; s.unlockedZones = ['tollroad', 'mire'];
  s.zones.tollroad = { kills: [20, 20, 20, 20], cleared: 3, bossKills: 1, secretKills: 0, cycleKills: 0, secretFound: false };
  s.creed.current = 'wick'; s.creed.rep = { wick: 140 };
  s.war.standing = { wick: 210, legion: 900, rot: 640, vigil: 480, nadir: 330 }; s.war.dominion = 'legion'; s.war.round = 3; s.war.roundT = 2 * 3600; s.war.contributed = 412;
  s.cortege.recruited = ['aldric', 'ilse', 'ghrelt']; s.cortege.slots = 2;
  g.replace(s);
});
const shadeIds = await page.evaluate(() => { const g = __ashfall.getState(); const s = g.state; return s.cortege.recruited; });
console.log('recruited', shadeIds);
await page.evaluate(() => {
  const g = __ashfall.getState(); const s = g.state; const D = s.marrow.constructor;
  // three shades: one beside, one away, one garrisoned
  const names = s.cortege.recruited;
  s.cortege.shades = names.slice(0, 3).map((id, i) => ({ id, level: 3 + i, xp: new D(0), weapon: null, assignment: i === 1 ? 'away' : i === 2 ? 'garrison' : 'beside', hpFrac: 1, actIn: 1, retreat: 0 }));
  s.dispatch.missions = names[1] ? [{ id: 1, shade: names[1], kind: 'risky', remaining: 14 * 60 + 12, total: 20 * 60, zone: 'tollroad' }] : [];
  s.dispatch.nextId = 2; s.dispatch.sent = 4;
  s.holdfasts = { tollroad: { garrison: names[2] ? [names[2]] : [], raidIn: 900, raid: { remaining: 84, kills: 0 }, raids: 3, held: 2, lost: 0, slowed: 0, produced: new D(18400) } };
  s.player.weapons.revenantSword.mastery = 260;
  s.encounter.zone = 'mire'; s.encounter.tier = 0; s.encounter.enemy = null; s.encounter.respawnIn = 0.5; s.zones.mire = { kills: [0, 0, 0, 0, 0], cleared: 0, bossKills: 0, secretKills: 0, cycleKills: 0, secretFound: false };
  g.replace(s);
});
await page.getByRole('button', { name: /^Cortege$/ }).click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: /^Dispatch$/ }).first().click(); await page.waitForTimeout(500);
await page.screenshot({ path: 'art/mobile/m9-dispatch.png' });
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.getByRole('button', { name: /^Lantern$/ }).click(); await page.waitForTimeout(250);
await page.getByRole('tab', { name: /^Road/ }).click(); await page.waitForTimeout(400);
await page.screenshot({ path: 'art/mobile/m9-holdfast.png' });
await page.getByRole('button', { name: /^Creeds$/ }).click(); await page.waitForTimeout(400);
await page.screenshot({ path: 'art/mobile/m9-war.png' });
await page.getByRole('button', { name: /^Combat$/ }).click(); await page.waitForTimeout(600);
await page.screenshot({ path: 'art/mobile/m9-art.png' });
console.log('art button', await page.getByRole('button', { name: /Reprisal Stance/ }).count(), 'raid strip', await page.locator('.raid-strip').count());
await browser.close();
