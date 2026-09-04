# Ashfall

*You are an undead ember-tender. You click to strike, you die, you lose your souls, you go back for them. You recruit phantoms who fight while you sleep. You kindle the flame and begin again, stronger, in a world that has grown crueler.*

A dark-fantasy incremental game that fuses the moment-to-moment tension of a Souls-like with the long arc of a deep idle game. Everything is CSS, SVG and Web Audio synthesis; there are no external assets.

## Play

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/
```

Controls: click the enemy (or `F`) to strike · `Space` dodge · `E` Estus · `1`–`6` cast attuned spells. Everything else is in the tabs on the right, and every number has a tooltip that shows how it was computed.

## Develop

```
npm test           # Vitest: engine formulas, combat, death, saves, phantoms, magic, prestige, bosses, economy properties, pacing
npm run typecheck
npm run sim        # headless balance simulation; writes BALANCE.md
npm run sim -- --hours 200 --strategies greedy,idle --seed 3 --verbose
```

Layout:

- `src/engine/` — pure, deterministic game logic. `step(state, dt, actions)` → `{ state, events }`. No DOM, no clock, seeded RNG. The simulator and the tests drive this directly.
- `src/content/` — every enemy, boss, weapon, spell, covenant, phantom, tree node and zone as typed data with its own lore. Adding content never touches the engine; `validateContent()` fails the build on dangling references or placeholder text.
- `src/sim/` — the balance harness and five scripted strategies (greedy, optimal, casual, idle, noclick).
- `src/ui/` — React, rendering only. 10Hz fixed-timestep logic decoupled from render.

Design decisions and their reasoning live in [DESIGN.md](DESIGN.md); simulator output per balance revision in [BALANCE.md](BALANCE.md); what's next in [TODO.md](TODO.md).

## The shape of the game

- **Combat**: stamina, stagger and the Riposte window, telegraphed attacks with a perfect-dodge window, Estus. Damage is weapon base × reinforcement × stat scaling by grade × infusion × buffs × permanent bonuses × soul level, and the weapon tooltip shows every factor.
- **Death**: your souls drop as a bloodstain where you fell. Fight back to it, one kill per tier. Die first and it's gone. Offline never costs you anything.
- **Six regions, 32 tiers, 17 bosses.** Every wall is a boss; every boss has phases with a mechanic that punishes a lazy habit (over-clicking, spell spam, ignoring stagger, hitting during the hymn, dodging on sight in the dark).
- **Phantoms**: up to six, each with a role. Beside you they fight your fight; hunting, they earn while you're away, with survivability and rate shown exactly.
- **Magic**: sorcery, miracles, pyromancy (and hexes, later) with scarce attunement slots. **Covenants**: five oaths, one at a time, with standing that survives everything.
- **Kindling** → NG+ with new enemy variants and cycle-exclusive bosses; the Humanity tree; automation as a reward. **The Dark Sigil** at NG+5 → Sigil Marks and structural unlocks (a sixth phantom, hexes, the endless Abyss). **The Age of Dark** for the long horizon.
