# Ashfall — Design Log

Decisions and the reasoning behind them. Newest milestone at the bottom. Read this with `TODO.md` and `BALANCE.md` before resuming work.

## Architecture (Milestone 1)

**Stack.** Vite 8 + React 19 + TypeScript 7 + Zustand + Tailwind 4. `break_infinity.js` for every economy number from day one.

**Three layers, strictly separated.**
- `src/engine/` — pure, deterministic, framework-free. `step(state, dt, actions)` → `{ state, events }`. No `Date.now()`, no DOM. The only clock is `state.t`, advanced by ticks. Randomness comes from a mulberry32 PRNG whose state lives in `GameState.rng`, so a seed fully determines a run.
- `src/content/` — typed data (weapons, enemies, bosses, zones, spells, phantoms, covenants, tree). The engine reads content only through `src/content/index.ts`. `validateContent()` is a test that every cross-reference resolves and that no shipped text contains placeholder words.
- `src/ui/` — React, rendering only. Components select primitives from the store so a tick only re-renders what changed.

**Engine "purity" convention.** The engine *mutates the state object in place* and returns it. It is pure in the sense that matters: deterministic, no side effects outside the state object, no hidden clocks. Returning fresh immutable copies at 10Hz with a 5-phantom squad and DoTs would allocate heavily for no gameplay benefit, and the simulator would pay the same price hundreds of thousands of times. Tests that need snapshots clone explicitly.

**Which numbers are Decimals.** Souls, humanity, enemy HP, damage, costs, drop counts that scale with NG+ → `Decimal`. Player HP, stamina, FP, stat points, timers, poise, stagger buildup → plain numbers. Player HP is a plain number because enemy damage is defined *relative to the player's expected HP at that tier* (see Balance), so it never needs to reach 1e300.

**Tick loop.** 10Hz fixed logic step driven by `setInterval` (so throttled background tabs keep ticking coarsely) with an accumulator and a catch-up cap of 60 simulated seconds per frame. Gaps larger than that are handed to the offline calculator (Milestone 6) rather than simulated tick-by-tick. Clicks are applied synchronously through the reducer, not queued to the next tick, so there is no 100ms input lag.

**Actions and events.** Every player intention is an `Action` handled by `applyAction`. Invalid actions emit an `error` event and change nothing; they never throw. The engine emits `GameEvent`s (hit, kill, death, stagger, …) which the UI subscribes to for juice, and which the simulator counts for metrics. Nothing in the UI reads engine internals to decide when to flash.

**Extension hooks.** Later systems (phantoms, covenants, prestige) register per-tick hooks (`registerTickHook`) and action handlers (`registerActionHandler`) rather than editing the core loop. This keeps `combat.ts` about combat.

## Combat design (Milestones 1 & 3 — built together because they share a state shape)

- **Damage** = weapon base × 1.15^reinforce × (1 + Σ gradeCoef × statCurve(stat)) × infusion × requirement penalty × buffs × permanent modifiers. Every factor is shown in the weapon tooltip. Grade coefficients: E .25, D .5, C .8, B 1.1, A 1.4, S 1.8. The stat curve is piecewise linear with soft caps at 20/40/60 (slopes .03/.0175/.008, tail .0025). So an S-scaling weapon at 40 points gives +171% damage; the same points in an unscaled stat give nothing. Builds matter.
- **Stagger.** Each hit adds the weapon's stagger value (heavy weapons ~3× fast ones) to a meter against the enemy's poise. Full meter → 2s riposte window, enemy attack cancelled. Hits during the window use the weapon's riposte multiplier (daggers 5×, greatweapons 2.4×). Stagger does not build during the window itself, so you can't chain-stun.
- **Stamina.** Attacks cost stamina; attacking below the cost still lands but at 40% damage and builds no stagger ("exhausted"). This is deliberately soft: a spammer is worse off than a rhythmic player but never punished with a locked-out click.
- **Enemy telegraphs.** A visible wind-up bar. Dodge grants 0.45s of i-frames on a 1.6s cooldown; a dodge pressed inside the last 0.22s of a wind-up is *perfect* and grants +35% damage for 4s. Missing a dodge costs HP; missing a riposte costs only the bonus.
- **Death.** The full soul balance drops as a bloodstain at the encounter. Respawn at the bonfire, full HP and Estus. A *corpse run* begins: one kill per tier from the bonfire to the stain; reaching the stain's tier restores the souls. Dying again first loses the old stain. Travel is locked during a run (you can abandon the stain to unlock it). This keeps the recovery under a few minutes in Region 1 and makes "how deep did I fall" the real cost.
- **Tier clearing.** Each tier needs N kills to clear; cleared tiers stay open. The boss arena opens when the last tier is cleared. Bosses can be re-fought for 25% souls but yield their boss soul only once per cycle.

## Balance skeleton (see BALANCE.md for numbers and simulator output)

Enemy HP grows ×1.55 per global tier, souls ×1.5, damage ×1.2, level cost ×1.115 per level (4 levels ≈ 1 tier). Player HP gains ×1.035 per soul level ("the ember hardens") so that Vigor stays a choice while HP still keeps pace with exponential enemy damage. Weapons step ×~5 base damage per region; reinforcement +10 is ×4; scaling adds up to ×3–4. The shortfall versus enemy HP growth is what phantoms, buffs, and the Humanity tree fill — by design, so that those systems are needed rather than decorative.

## Milestone 1 note

Skeleton is in place and exceeds the M1 brief: the combat state shape for M3 (stagger, riposte, dodge, Estus, death, bloodstain, corpse run) was built at the same time because the enemy/player structs would have been rewritten otherwise. What is *not* here yet: the simulator, tests, level-up UI, weapon UI, zone navigation UI, bonfire, save system.

## Milestone 2 — engine + simulator

**Simulator shape.** `src/sim/harness.ts` drives `step()` at 10Hz with a `Strategy` that returns actions each tick. One policy function, five parameterizations (greedy / optimal / casual / idle / noclick), so every later system plugs into all strategies through `registerSimExtension`. 200 simulated hours take ~20s. Metrics: time to auto-attack, first death, each boss, each region, Kindle, Sigil; souls per hour; deaths; stalls (no progress event for 20 min); economy invariants each hour.

**Why strategies gate boss attempts by level.** Real players who die to a boss go farm. The policy remembers the level at which it died to a boss and retries after +N levels (greedy 2, casual 3). Without that memory the sim throws itself at the boss forever and reports nonsense.

**First tuning pass.** Enemy damage 9 → 20 (nobody died in the first hour). Boss HP 14× → 30× and boss damage 1.6× → 2.4× the tier baseline: the first boss must be a *wall*. Result: greedy beats Eskel at 12.5 min with no deaths (perfect dodges carry it), casual dies once at 21 min and wins at 31 min. That is the "feel clever about how you beat it" curve we want: the wall is skill-and-preparation, not a number.

**Auto-attack unlock** is the earlier of: clearing the second tier, or 6 minutes of play. The time fallback exists so the no-click floor is not zero; pillar 6 says the unlock arrives inside 10 minutes and this guarantees it.

**Tests.** 51 tests: formulas, damage, stamina, stagger/riposte, telegraphs/perfect dodge, Estus, death/bloodstain/corpse run, leveling, weapons, content integrity (references + placeholder scan), 12-seed random-action property test on economy invariants, and pacing tests that fail the build if the first boss leaves its window.

## Milestone 3 — combat depth (UI pass)

The engine half of this milestone shipped in M1/M2. This pass made every combat number *legible*: the telegraph shows the attack name, its damage and that damage as a percentage of your HP; the stamina bar shakes and turns amber when a hit lands exhausted; the bloodstain card names the tier where you fell and counts down the kills to reach it, with an explicit "abandon" escape hatch; the log narrates unlocks, tier clears, drops, boss phases and deaths in-world.

**Decision: no hidden numbers, ever.** Every derived value has a hover breakdown (damage = base × reinforce × (1+scaling) × infusion × buffs × permanent). This is pillar 7 (obscurity as flavor, never friction) made structural: the lore is cryptic, the tooltips are not.

## Milestone 4 — progression

- **Level-up at the bonfire.** Each stat row shows the current points, the next soft cap, a filled curve bar, and a tooltip with the *marginal* gain of the next point in concrete terms ("damage 14.3 → 15.1", "HP 268 → 290"). The tooltip also says outright when the equipped weapon does not scale with a stat. A player should never need a spreadsheet.
- **Weapons panel.** Owned weapons as chips, shop weapons as dashed chips, one detail card: lore, every stat with a tooltip, reinforce button naming the exact material and count, infusion grid (unlocked by the first Cinder Coal drop). Infusions rewrite scaling to an A grade on one stat and downgrade the others by one grade, or trade 15% base for a status buildup.
- **Respec** is a Soul Vessel consumable (secret-boss drop). It reallocates every point above the starting spread. Scarce, so choices keep their weight.
- **Weapons in Region 1**: Hollow Straight Sword (hybrid, start), Bandit Dagger (fast, shop), Pilgrim's Mace (heavy, shop), Deserter's Spear (hybrid, drop), Warden's Cleaver (heavy, boss soul), Gallows Rope (fast, secret boss soul). The mace at +2 makes the first boss comfortably beatable; the dagger's 5× riposte rewards the player who has learned to stagger.

## Milestone 5 — Region 1 and the first boss

**The Cindered Approach.** Four tiers (Ash Slopes → Toll Gate → Pyre Yard → Gallows Walk), eight enemies with distinct rhythms: rats bite every 2s for little, crossbowmen wind up for 1.9s and hit for 1.7×, Toll Wardens have 2.2× poise (the first enemy you *cannot* kill before it staggers, which teaches the riposte), Cinder Wraiths take 60% physical and are immune to bleed/poison (the first "rebuild" prompt).

**Eskel, Warden of the Cold Pyre.** Three phases, each invalidating a lazy strategy:
1. *The Watch* — plain heavy hits; teaches the dodge.
2. *Backdraft* (60%) — more than 7 player hits inside any 2s window triggers a retaliation burn of 8% max HP. Punishes over-clicking; rewards rhythm (and stamina discipline, since exhausted hits still count).
3. *Cold Pyre* (30%) — takes 15% damage unless staggered. Must be staggered to be damaged; heavy weapons and the perfect-dodge window suddenly matter.
Boss soul: **Warden's Cleaver** (heavy, STR B, fire) or **Pyre Bloom** (pyromancy burst that also grants the flame, i.e. the first attunement slot).

**The Hanged Pilgrim** (secret, after 40 kills on Gallows Walk) regenerates 2–3.5% HP/s unless bleeding, poisoned or frostbitten. The answer is the Bandit Dagger's innate bleed or an infusion; the reward is a Soul Vessel (respec) and **Gallows Rope** / **Last Rites** (+60% souls for 25s — the first "schedule your session" spell).

**Bosses respawn** for 25% souls but yield their soul once per cycle. Re-fighting is a legitimate (slow) wall answer and keeps the arena from becoming a dead button.

**Spell bar arrives here**, minimal but real, because the boss soul choice must be usable the moment it exists. Hotkeys 1–6. Full magic depth is Milestone 8.

Simulator: Eskel falls at 12.5m (greedy) / 31m (casual, one death). Inside the 6–16 min target for the skilled path; the casual path's wall-then-win is intended.

## Milestone 6 — save system and offline progress

- **Format.** One JSON blob `{ v, savedAt, checksum, state }`. Decimals serialize as `§D§<string>` so no field list is needed and new Decimal fields need no serializer change. Checksum is FNV-1a over the state JSON: enough to catch truncation and hand edits, cheap enough to run every 10s. (`Decimal` defines `toJSON`, so the replacer reads the original from the holder object — a trap worth recording.)
- **Migrations.** `migrations[n]` upgrades version n → n+1; `parseSave` walks the chain and then `normalize()` deep-merges defaults from a fresh game, so a *new* field never needs a migration, only a *changed* one. `save.test.ts` keeps a fixture per historical version and asserts every version below current has a migration registered — adding a version without a migration fails the build.
- **Never lose a save.** Main slot and a rolling backup (the previous main). A main that fails to parse is copied to `ashfall.corrupt` and the backup loads with a visible banner. Hard delete requires typing HOLLOW.
- **Export/import** is `ASHFALL1.` + base64 of the same blob (unicode-safe through TextEncoder), with distinct error messages for "not an export", "bad base64", "checksum", "newer version".
- **Offline** is closed-form: `idleRate(state)` × min(gap, cap) × offline multiplier. The rate function is installed by the phantom module (Milestone 7); until then it returns zero with a reason the summary shows verbatim. The player is treated as resting at the bonfire while away: full HP/Estus on return, no combat state, and *never* a soul drop. Tab suspensions longer than the 60s catch-up cap are routed through the same calculator.
- **UI-only settings** (number format, reduce effects, sound, hints) live outside the game state so exporting a save doesn't carry preferences.

## Milestone 7 — phantoms (the idle layer)

**Roster and slots.** Six phantom characters across the content spine (two in Region 1: Aldric the dps knight at 400 souls, Sister Ilse the healer after Eskel; one each in Regions 2–5, arriving with Milestone 10). Slots start at **one** and grow by one per region lord defeated (max five), with a sixth from the Dark Sigil. Recruiting more phantoms than slots is allowed; the extras wait at the bonfire. So squad *composition* is a choice from the second boss onward, and the first phantom is a 10-minute decision rather than a menu.

**Two assignments, one switch.** *Beside* = the phantom acts in the player's encounter on its own timer (dps hits, stagger feeds the riposte, healer heals the player, buffer refreshes a party damage buff, status applier builds bleed/poison). *Hunt* = closed-form grinding of a cleared tier for 45% souls per kill, 60% drops, plus experience. Offline, everyone hunts regardless. The pillar-3 tension is real: for an active player a dps phantom beside them multiplies full-value kills; for an idle stretch the healer's uptime bonus is what keeps the hunt alive.

**Hunting math is legible.** `evaluateHunt` computes squad DPS, kill time, incoming DPS from the tier's enemy mix, and "death time". If the squad would fall before finishing one kill it *wipes*: rate zero, they retreat, nothing lost. Otherwise uptime = recovery ÷ (recovery + incoming), where recovery is 5% of squad HP per second plus healer output. Kills/s = uptime ÷ kill time. The Squad panel shows all of this: souls/min, uptime bar, "a kill takes 14s, they would fall in 45s", and the exact offline souls/hour with the cap. Auto mode picks the highest cleared tier that holds; manual mode lets the player farm a specific drop table.

**Levels.** Bought with souls (×1.14 per level, ×6 per region) *and* earned free from hunting experience, so an idle player's squad grows on its own while an active player can accelerate it. +7% damage and +6% HP per level, tuned against enemy damage ×1.2 per tier so roughly three phantom levels keep pace with one tier.

**Gear.** A phantom's damage is driven by the base of the weapon in its slot (any owned weapon the player isn't wielding; swapping between phantoms is automatic). This makes old weapons useful hand-me-downs and reinforcement a squad-wide investment.

**Performance.** The hunt is re-evaluated once per second of game time (memoised per state object, keyed on roster, level, gear and hunting choice). Deterministic, and it kept the 200-hour simulation under a minute.

Simulator after M7: idle-only earns ~15% of the greedy player's souls in the first hour with a single phantom; the idle path still cannot beat Eskel (it doesn't dodge), which is intended until auto-dodge and auto-riposte are earned.
