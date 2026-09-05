# Mournwake

Screenshots: [SCREENSHOTS.md](SCREENSHOTS.md). Art bible and review log: [ART.md](ART.md).

*You are a Revenant: dead, and refusing it. You carry a Lantern whose flame is the only thing holding you in the world. You tap to strike, you die, your Marrow lies where you fell, and you go back for it. Behind you walks your Cortege, a funeral procession of Shades who fight on while you rest. When the road has nothing left to teach you, you snuff the Lantern and wake in a darker one.*

A dark-fantasy incremental game that fuses the moment-to-moment tension of a stamina-and-composure action game with the long arc of a deep idle game. Every illustration is procedural (see ART.md), every sound is synthesized, and the fiction is its own (see LORE.md and NAMING.md).

## Play

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/
```

On a phone, install it from the browser (the game offers after the first lord) and it opens like any app, with or without a signal. Controls: tap Strike, or click the enemy (or `F`), · `Space` dodge · `E` Tallowdraught · `1`–`6` cast recited spells. Everything else is in the tabs on the right, and every number has a tooltip that shows how it was computed.

## Develop

```
npm test           # Vitest: engine formulas, combat, death, saves, shades, magic, prestige, bosses, economy properties, pacing
npm run typecheck
npm run ci         # everything CI runs: tests, banned terms, hover, build, payload budget, PWA manifest, touch targets, accessibility, device matrix, interruptions
npm run sim        # headless balance simulation; writes BALANCE.md
npm run sim -- --hours 200 --strategies greedy,idle --seed 3 --verbose
```

Layout:

- `src/engine/` — pure, deterministic game logic. `step(state, dt, actions)` → `{ state, events }`. No DOM, no clock, seeded RNG. The simulator and the tests drive this directly.
- `src/content/` — every enemy, boss, weapon, spell, creed, shade, boon, tree node and zone as typed data with its own lore. Adding content never touches the engine; `validateContent()` fails the build on dangling references or placeholder text.
- `src/sim/` — the balance harness and five scripted strategies (greedy, optimal, casual, idle, noclick).
- `src/ui/` — React, rendering only. 10Hz fixed-timestep logic decoupled from render.

Design decisions and their reasoning live in [DESIGN.md](DESIGN.md); simulator output per balance revision in [BALANCE.md](BALANCE.md); what's next in [TODO.md](TODO.md).

## The shape of the game

- **Combat**: stamina, strain and the Reprisal window, telegraphed attacks with a perfect-dodge window, Tallowdraught. Damage is weapon base × reinforcement × stat scaling by grade × infusion × buffs × permanent bonuses × level, and the weapon tooltip shows every factor.
- **Death**: your marrow drop as a remains where you fell. Fight back to it, one kill per tier. Die first and it's gone. Offline never costs you anything.
- **Six regions, 32 tiers, 17 bosses.** Every wall is a boss; every boss has phases with a mechanic that punishes a lazy habit (over-clicking, spell spam, ignoring strain, hitting during the hymn, dodging on sight in the dark).
- **Shades**: up to six, each with a role. Beside you they fight your fight; hunting, they earn while you're away, with survivability and rate shown exactly.
- **Magic**: weaving, litanies, ruin (and hexes, later) with scarce recitation slots. **Creeds**: five oaths, one at a time, with standing that survives everything.
- **Snuffing** → Waking  with new enemy variants and cycle-exclusive bosses; the Vestige tree; automation as a reward. **The Dark Severing** at Waking 5 → Severing Marks and structural unlocks (a sixth shade, hexes, the endless Nadir). **The Unmaking** for the long horizon.
