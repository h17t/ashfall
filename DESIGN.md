# Mournwake — Design Log

Decisions and the reasoning behind them. Newest milestone at the bottom. Read this with `TODO.md` and `BALANCE.md` before resuming work.

## Architecture (Milestone 1)

**Stack.** Vite 8 + React 19 + TypeScript 7 + Zustand + Tailwind 4. `break_infinity.js` for every economy number from day one.

**Three layers, strictly separated.**
- `src/engine/` — pure, deterministic, framework-free. `step(state, dt, actions)` → `{ state, events }`. No `Date.now()`, no DOM. The only clock is `state.t`, advanced by ticks. Randomness comes from a mulberry32 PRNG whose state lives in `GameState.rng`, so a seed fully determines a run.
- `src/content/` — typed data (weapons, enemies, bosses, zones, spells, shades, creeds, tree). The engine reads content only through `src/content/index.ts`. `validateContent()` is a test that every cross-reference resolves and that no shipped text contains placeholder words.
- `src/ui/` — React, rendering only. Components select primitives from the store so a tick only re-renders what changed.

**Engine "purity" convention.** The engine *mutates the state object in place* and returns it. It is pure in the sense that matters: deterministic, no side effects outside the state object, no hidden clocks. Returning fresh immutable copies at 10Hz with a 5-shade cortege and DoTs would allocate heavily for no gameplay benefit, and the simulator would pay the same price hundreds of thousands of times. Tests that need snapshots clone explicitly.

**Which numbers are Decimals.** Marrow, vestige, enemy HP, damage, costs, drop counts that scale with Waking  → `Decimal`. Player HP, stamina, FP, stat points, timers, composure, strain buildup → plain numbers. Player HP is a plain number because enemy damage is defined *relative to the player's expected HP at that tier* (see Balance), so it never needs to reach 1e300.

**Tick loop.** 10Hz fixed logic step driven by `setInterval` (so throttled background tabs keep ticking coarsely) with an accumulator and a catch-up cap of 60 simulated seconds per frame. Gaps larger than that are handed to the offline calculator (Milestone 6) rather than simulated tick-by-tick. Clicks are applied synchronously through the reducer, not queued to the next tick, so there is no 100ms input lag.

**Actions and events.** Every player intention is an `Action` handled by `applyAction`. Invalid actions emit an `error` event and change nothing; they never throw. The engine emits `GameEvent`s (hit, kill, death, strain, …) which the UI subscribes to for juice, and which the simulator counts for metrics. Nothing in the UI reads engine internals to decide when to flash.

**Extension hooks.** Later systems (shades, creeds, prestige) register per-tick hooks (`registerTickHook`) and action handlers (`registerActionHandler`) rather than editing the core loop. This keeps `combat.ts` about combat.

## Combat design (Milestones 1 & 3 — built together because they share a state shape)

- **Damage** = weapon base × 1.15^reinforce × (1 + Σ gradeCoef × statCurve(stat)) × infusion × requirement penalty × buffs × permanent modifiers. Every factor is shown in the weapon tooltip. Grade coefficients: E .25, D .5, C .8, B 1.1, A 1.4, S 1.8. The stat curve is piecewise linear with soft caps at 20/40/60 (slopes .03/.0175/.008, tail .0025). So an S-scaling weapon at 40 points gives +171% damage; the same points in an unscaled stat give nothing. Builds matter.
- **Strain.** Each hit adds the weapon's strain value (heavy weapons ~3× fast ones) to a meter against the enemy's composure. Full meter → 2s reprisal window, enemy attack cancelled. Hits during the window use the weapon's reprisal multiplier (daggers 5×, greatweapons 2.4×). Strain does not build during the window itself, so you can't chain-stun.
- **Stamina.** Attacks cost stamina; attacking below the cost still lands but at 40% damage and builds no strain ("exhausted"). This is deliberately soft: a spammer is worse off than a rhythmic player but never punished with a locked-out click.
- **Enemy telegraphs.** A visible wind-up bar. Dodge grants 0.45s of i-frames on a 1.6s cooldown; a dodge pressed inside the last 0.22s of a wind-up is *perfect* and grants +35% damage for 4s. Missing a dodge costs HP; missing a reprisal costs only the bonus.
- **Death.** The full wisp balance drops as a remains at the encounter. Respawn at the lantern, full HP and Tallowdraught. A *corpse run* begins: one kill per tier from the lantern to the stain; reaching the stain's tier restores the marrow. Dying again first loses the old stain. Travel is locked during a run (you can abandon the stain to unlock it). This keeps the recovery under a few minutes in Region 1 and makes "how deep did I fall" the real cost.
- **Tier clearing.** Each tier needs N kills to clear; cleared tiers stay open. The boss arena opens when the last tier is cleared. Bosses can be re-fought for 25% marrow but yield their keepsake only once per cycle.

## Balance skeleton (see BALANCE.md for numbers and simulator output)

Enemy HP grows ×1.55 per global tier, marrow ×1.5, damage ×1.2, level cost ×1.115 per level (4 levels ≈ 1 tier). Player HP gains ×1.035 per level ("the mote hardens") so that Vitality stays a choice while HP still keeps pace with exponential enemy damage. Weapons step ×~5 base damage per region; reinforcement +10 is ×4; scaling adds up to ×3–4. The shortfall versus enemy HP growth is what shades, buffs, and the Vestige tree fill — by design, so that those systems are needed rather than decorative.

## Milestone 1 note

Skeleton is in place and exceeds the M1 brief: the combat state shape for M3 (strain, reprisal, dodge, Tallowdraught, death, remains, corpse run) was built at the same time because the enemy/player structs would have been rewritten otherwise. What is *not* here yet: the simulator, tests, level-up UI, weapon UI, zone navigation UI, lantern, save system.

## Milestone 2 — engine + simulator

**Simulator shape.** `src/sim/harness.ts` drives `step()` at 10Hz with a `Strategy` that returns actions each tick. One policy function, five parameterizations (greedy / optimal / casual / idle / noclick), so every later system plugs into all strategies through `registerSimExtension`. 200 simulated hours take ~20s. Metrics: time to auto-attack, first death, each boss, each region, Snuff, Severing; marrow per hour; deaths; stalls (no progress event for 20 min); economy invariants each hour.

**Why strategies gate boss attempts by level.** Real players who die to a boss go farm. The policy remembers the level at which it died to a boss and retries after +N levels (greedy 2, casual 3). Without that memory the sim throws itself at the boss forever and reports nonsense.

**First tuning pass.** Enemy damage 9 → 20 (nobody died in the first hour). Boss HP 14× → 30× and boss damage 1.6× → 2.4× the tier baseline: the first boss must be a *wall*. Result: greedy beats the Pyre-Warden at 12.5 min with no deaths (perfect dodges carry it), casual dies once at 21 min and wins at 31 min. That is the "feel clever about how you beat it" curve we want: the wall is skill-and-preparation, not a number.

**Auto-attack unlock** is the earlier of: clearing the second tier, or 6 minutes of play. The time fallback exists so the no-click floor is not zero; pillar 6 says the unlock arrives inside 10 minutes and this guarantees it.

**Tests.** 51 tests: formulas, damage, stamina, strain/reprisal, telegraphs/perfect dodge, Tallowdraught, death/remains/corpse run, leveling, weapons, content integrity (references + placeholder scan), 12-seed random-action property test on economy invariants, and pacing tests that fail the build if the first boss leaves its window.

## Milestone 3 — combat depth (UI pass)

The engine half of this milestone shipped in M1/M2. This pass made every combat number *legible*: the telegraph shows the attack name, its damage and that damage as a percentage of your HP; the stamina bar shakes and turns amber when a hit lands exhausted; the remains card names the tier where you fell and counts down the kills to reach it, with an explicit "abandon" escape hatch; the log narrates unlocks, tier clears, drops, boss phases and deaths in-world.

**Decision: no hidden numbers, ever.** Every derived value has a hover breakdown (damage = base × reinforce × (1+scaling) × infusion × buffs × permanent). This is pillar 7 (obscurity as flavor, never friction) made structural: the lore is cryptic, the tooltips are not.

## Milestone 4 — progression

- **Level-up at the lantern.** Each stat row shows the current points, the next soft cap, a filled curve bar, and a tooltip with the *marginal* gain of the next point in concrete terms ("damage 14.3 → 15.1", "HP 268 → 290"). The tooltip also says outright when the equipped weapon does not scale with a stat. A player should never need a spreadsheet.
- **Weapons panel.** Owned weapons as chips, shop weapons as dashed chips, one detail card: lore, every stat with a tooltip, reinforce button naming the exact material and count, infusion grid (unlocked by the first Cinder Coal drop). Infusions rewrite scaling to an A grade on one stat and downgrade the others by one grade, or trade 15% base for a status buildup.
- **Respec** is a Wisp Vessel consumable (secret-boss drop). It reallocates every point above the starting spread. Scarce, so choices keep their weight.
- **Weapons in Region 1**: Revenant Straight Sword (hybrid, start), Bandit Dagger (fast, shop), Pilgrim's Mace (heavy, shop), Deserter's Spear (hybrid, drop), Warden's Cleaver (heavy, keepsake), Gallows Rope (fast, secret keepsake). The mace at +2 makes the first boss comfortably beatable; the dagger's 5× reprisal rewards the player who has learned to strain.

## Milestone 5 — Region 1 and the first boss

**The Cindered Approach.** Four tiers (Ash Slopes → Toll Gate → Pyre Yard → Gallows Walk), eight enemies with distinct rhythms: rats bite every 2s for little, crossbowmen wind up for 1.9s and hit for 1.7×, Toll Wardens have 2.2× composure (the first enemy you *cannot* kill before it staggers, which teaches the reprisal), Cinder Wraiths take 60% physical and are immune to bleed/poison (the first "rebuild" prompt).

**the Pyre-Warden, Warden of the Cold Pyre.** Three phases, each invalidating a lazy strategy:
1. *The Watch* — plain heavy hits; teaches the dodge.
2. *Backdraft* (60%) — more than 7 player hits inside any 2s window triggers a retaliation burn of 8% max HP. Punishes over-clicking; rewards rhythm (and stamina discipline, since exhausted hits still count).
3. *Cold Pyre* (30%) — takes 15% damage unless broken. Must be broken to be damaged; heavy weapons and the perfect-dodge window suddenly matter.
Keepsake: **Warden's Cleaver** (heavy, STR B, fire) or **Pyre Bloom** (ruin burst that also grants the flame, i.e. the first recitation slot).

**The Hanged Pilgrim** (secret, after 40 kills on Gallows Walk) regenerates 2–3.5% HP/s unless bleeding, poisoned or frostbitten. The answer is the Bandit Dagger's innate bleed or an infusion; the reward is a Wisp Vessel (respec) and **Gallows Rope** / **Last Rites** (+60% marrow for 25s — the first "schedule your session" spell).

**Bosses respawn** for 25% marrow but yield their wisp once per cycle. Re-fighting is a legitimate (slow) wall answer and keeps the arena from becoming a dead button.

**Spell bar arrives here**, minimal but real, because the keepsake choice must be usable the moment it exists. Hotkeys 1–6. Full magic depth is Milestone 8.

Simulator: the Pyre-Warden falls at 12.5m (greedy) / 31m (casual, one death). Inside the 6–16 min target for the skilled path; the casual path's wall-then-win is intended.

## Milestone 6 — save system and offline progress

- **Format.** One JSON blob `{ v, savedAt, checksum, state }`. Decimals serialize as `§D§<string>` so no field list is needed and new Decimal fields need no serializer change. Checksum is FNV-1a over the state JSON: enough to catch truncation and hand edits, cheap enough to run every 10s. (`Decimal` defines `toJSON`, so the replacer reads the original from the holder object — a trap worth recording.)
- **Migrations.** `migrations[n]` upgrades version n → n+1; `parseSave` walks the chain and then `normalize()` deep-merges defaults from a fresh game, so a *new* field never needs a migration, only a *changed* one. `save.test.ts` keeps a fixture per historical version and asserts every version below current has a migration registered — adding a version without a migration fails the build.
- **Never lose a save.** Main slot and a rolling backup (the previous main). A main that fails to parse is copied to `mournwake.corrupt` and the backup loads with a visible banner. Hard delete requires typing UNMADE.
- **Export/import** is `ASHFALL1.` + base64 of the same blob (unicode-safe through TextEncoder), with distinct error messages for "not an export", "bad base64", "checksum", "newer version".
- **Offline** is closed-form: `idleRate(state)` × min(gap, cap) × offline multiplier. The rate function is installed by the shade module (Milestone 7); until then it returns zero with a reason the summary shows verbatim. The player is treated as resting at the lantern while away: full HP/Tallowdraught on return, no combat state, and *never* a wisp drop. Tab suspensions longer than the 60s catch-up cap are routed through the same calculator.
- **UI-only settings** (number format, reduce effects, sound, hints) live outside the game state so exporting a save doesn't carry preferences.

## Milestone 7 — shades (the idle layer)

**Roster and slots.** Six shade characters across the content spine (two in Region 1: Aldric the dps knight at 400 marrow, Sister Ilse the healer after the Pyre-Warden; one each in Regions 2–5, arriving with Milestone 10). Slots start at **one** and grow by one per region lord defeated (max five), with a sixth from the Dark Severing. Recruiting more shades than slots is allowed; the extras wait at the lantern. So cortege *composition* is a choice from the second boss onward, and the first shade is a 10-minute decision rather than a menu.

**Two assignments, one switch.** *Beside* = the shade acts in the player's encounter on its own timer (dps hits, strain feeds the reprisal, healer heals the player, buffer refreshes a party damage buff, status applier builds bleed/poison). *Hunt* = closed-form grinding of a cleared tier for 45% marrow per kill, 60% drops, plus experience. Offline, everyone hunts regardless. The pillar-3 tension is real: for an active player a dps shade beside them multiplies full-value kills; for an idle stretch the healer's uptime bonus is what keeps the hunt alive.

**Hunting math is legible.** `evaluateHunt` computes cortege DPS, kill time, incoming DPS from the tier's enemy mix, and "death time". If the cortege would fall before finishing one kill it *wipes*: rate zero, they retreat, nothing lost. Otherwise uptime = recovery ÷ (recovery + incoming), where recovery is 5% of cortege HP per second plus healer output. Kills/s = uptime ÷ kill time. The Cortege panel shows all of this: marrow/min, uptime bar, "a kill takes 14s, they would fall in 45s", and the exact offline marrow/hour with the cap. Auto mode picks the highest cleared tier that holds; manual mode lets the player farm a specific drop table.

**Levels.** Bought with marrow (×1.14 per level, ×6 per region) *and* earned free from hunting experience, so an idle player's cortege grows on its own while an active player can accelerate it. +7% damage and +6% HP per level, tuned against enemy damage ×1.2 per tier so roughly three shade levels keep pace with one tier.

**Gear.** A shade's damage is driven by the base of the weapon in its slot (any owned weapon the player isn't wielding; swapping between shades is automatic). This makes old weapons useful hand-me-downs and reinforcement a cortege-wide investment.

**Performance.** The hunt is re-evaluated once per second of game time (memoised per state object, keyed on roster, level, gear and hunting choice). Deterministic, and it kept the 200-hour simulation under a minute.

Simulator after M7: idle-only earns ~15% of the greedy player's marrow in the first hour with a single shade; the idle path still cannot beat the Pyre-Warden (it doesn't dodge), which is intended until auto-dodge and auto-reprisal are earned.

## Milestone 8 — magic and creeds

**Catalysts open schools.** Owning an Ashen Staff (weaving), a Cracked Talisman (litanies) or a Ruin Flame (from the Pyre-Warden's wisp, or bought in Region 2) opens that school *and* the first recitation slot. Wielding the catalyst channels its school for +25% power at the cost of a weak melee, so a pure caster is a real build rather than "melee plus spells". Three more slots are bought with marrow (×6 each); the tree and the Severing add more.

**Power formula.** Weaving/litanies: 0.4 + 2.2 × statCurve(INT or FTH) → 0.6 at 10 points, ~2.5 at 40. Ruin: (0.6 + 0.5 × (curve INT + curve FTH)) × 1.18^flame, so it levels with marrow poured into the flame instead of stats. Spells scale from the "base strike" (weapon base × reinforcement × permanent modifiers, *no* stat scaling) so they stay relevant for a stat-invested caster without being mandatory for a melee build: Wisp Arrow at 8 FP is +50% DPS for an unlearned build and +200% for INT 40. Buffs scale gently with √power and never below their listed value.

**The roster** is 21 spells across the three schools (six of them, tied to Regions 2–6 bosses and drops, are staged in `UPCOMING_SPELLS` until Milestone 10 ships their sources). The important ones for session shape: Last Rites (+60% marrow for 25s), Sworn Litany (party-wide), Bountiful Light (shades ×1.5 for 40s), Marrow Burn (the greedy self-burn).

**Creeds** are five mutually exclusive oaths with a passive, three ranked upgrades each, and *standing* that accrues per kill (+1, +25 per boss) and persists through Snuffing. The first oath is free; each later switch costs three level-ups' worth of marrow growing ×1.5, so switching is a real decision but never a lock. Upgrade costs are multiples of the current level-up cost, which keeps them meaningful across the exponential. Availability gates: the Wick always; Legion after the first shade; Rot Wardens and the Vigil from Region 2; the Nadiral Pact after two lords (×2 marrow, ×2 damage, ×2 damage taken, *no remains*).

**Shade affinity**: a shade whose creed matches yours gets +15% damage (healers +40% healing). This is the horizontal hook that makes two players' squads differ.

Simulator: strategies now buy a catalyst, learn and cast, and swear by play style (the Wick for skilled, Vigil for casual, Legion for idle). First boss: greedy 9.6m, casual 21.9m without a death (Heal carries it). Marrow/hour up ~50% from the Wick passive and Magic Weapon.

## Milestone 9 — Snuffing

**Vestige** = (cycle marrow ÷ 5,000)^0.42 × 1.15^lords × (1 + 4% per deepest tier) × bonuses. Sub-linear on marrow so that rendering *more often* out-gathers waiting, and it needs at least one lord's wisp to catch. The Snuff panel shows the gain live, and the confirm step lists exactly what is kept and what turns to ash, computed from the actual modifiers.

**What survives.** Vestige and the tree; creed standing (rites reset); spells known; boss-wisp *choices* (the weapon is handed back the moment that boss falls again — the choice was permanent, the item is a consequence); recruited shades (levels reset to 1) and the shade slots earned from lords; every automation unlocked; the bestiary. Weapons, levels, materials, zone progress, Tallowdraught and recitation purchases burn — unless *Unforgotten Steel* (10 Vestige) is bought.

**Why Waking  is net-positive.** The first tuning pass had HP ×1.6 and marrow ×1.45 per cycle, and the simulator showed the exact anti-pattern the spec forbids: marrow/hour fell by 80% after the first Snuff and deaths spiked. Now HP ×1.45, damage ×1.2, marrow ×1.55, drops ×1.35 — the cycle pays for itself — and the Flame branch (starting levels, starting marrow, weapons at +N) front-loads the first twenty minutes. Simulator after the fix: greedy's marrow/hour go 70K → 116K → 169K → 253K → 426K across five hours and eight Wakings (Region 1 only; the cadence stretches once Regions 2–6 exist).

**The tree** is 25 nodes in four branches. Automation lives in the tree as *earned* nodes (Reflex of the Wick = auto-reprisal, Reflex of the Bone = auto-dodge, Instinct to Drink, The Fire Chooses = auto-level, Restless Feet = auto-advance). Each sits behind the manual-skill nodes of its branch, so you graduate from a system only after investing in it. Familiar Dark (−8% Waking  scaling per rank, ×2 cost growth) is the long-tail sink.

**Variants.** Waking  enemies roll modifiers (Ashen, Waned, Nadiral, Ancient, Lit) with a chance that rises per cycle, each changing how the fight plays (composure, damage, attack speed, telegraph length) rather than only its size. Cycle-exclusive bosses hook in through `BossDef.cycle` and ship with Milestone 10's regions.

**A found rule.** Resting at a lantern now leaves a boss arena and returns you to the last tier. Before that fix the simulator's casual player retreated from the Pyre-Warden's third phase, watched him reset, and walked back in for 50 minutes without ever going to level up. Real players do this too. The threshold must be crossed deliberately every time.

## Milestone 10 — content build-out

**The spine.** Six regions, 32 tiers, 38 enemies, 17 bosses (6 lords, 6 secret, 5 cycle-exclusive), 32 weapons, 22 spells, 6 shades. Every item has its own lore; `validateContent()` scans all shipped text for placeholder words and fails the build on any.

**Regions as arguments.** Each region makes a case for a different build:
- *Mire* (R2): poison everywhere, Rotting Knights immune to it, Mother Nettle regenerates unless bled/frozen. Teaches status as a tool, not a bonus. Home of the Rot Wardens and Ghrelt (strain).
- *Archive* (R3): magic-resistant Bound Tomes next to physical-resistant Custodians; Archivist Null is immune while reciting (strain-only at 0%) and has a 2.2s "Unmaking" you must dodge. Teaches strain + resist reading. Vesna (buffer).
- *Sanctum* (R4): lightning knights and Silver Sentinels with no blood to bleed. Saint Orvane's *Lantern* phase punishes hitting during the glow (hymn mechanic). Teaches restraint. Corvo (status).
- *Deep* (R5): the Keeper turns the lights out — telegraphs vanish, dodge on rhythm; auto-dodge fails there on purpose. Vestige Sprites drop Dark the Wick. Ysolde (dps).
- *Rendering Works* (R6): everything at once; the Renderer has four phases (dodge → backdraft → strain-only → enrage). The First Wick (secret) is blind + regen + enrage, the true final exam.

**Mechanics, now six.** regen, backdraft, breakOnly, plus *enrage* (attack interval shrinks over the phase, floor 40%), *hymn* (alternating 5s windows where hits reflect 4–6% of your max HP; staggering silences it), *blind* (hidden telegraph; auto-dodge disabled; the simulator's players dodge at half skill). Every lord uses at least two, so "bigger HP bar" never describes a boss.

**Cycle bosses.** One per region for Waking 1…5 (Captain Vell, the Choir of Teeth, the Custodian Prime, the Twin Sentinels, the Drowned Sun), each with two phases and its own mechanic pairing. They open at a third arena tier after the region's lord falls, once per cycle, and drop *Dark the Wick* (instant Vestige), slabs and Wisp Vessels instead of a keepsake. Early Waking  is discovery.

**Weapon curve.** Base damage ×~4–5 per region (11 → 62 → 300 → 1,500 → 7,500 → 38,000), shop prices at roughly 100 kills of the region's first tier, boss-wisp weapons above the shop tier with an unusual scaling pair (Bell-Hammer STR/FTH lightning, Keeper's Blackblade INT/FTH dark). Catalysts scale into the late game through the Storm Talisman (litanies ×1.5).

**The big balance finding.** The first 40-hour run showed players at level 95 stalled in Region 2: stats past the soft caps stopped turning marrow into power while enemy HP kept compounding ×1.55 per tier. Fix: *every* level multiplies damage by 1.025 (as it already did HP by 1.035). Stats and grades decide *what* a level buys; the level always buys something. With that, greedy clears all six lords in 8.2h, casual in 9.8h, and marrow/hour rise monotonically through 40 hours and 14 Wakings. Levels 4 per tier × 1.025 ≈ ×1.10 per tier; reinforcement and the region weapon step supply the rest.

**Vestige now compounds with depth** (×1.06 per deepest tier instead of +4%): the simulator's players were rendering at 40 minutes after three quick lords; now the first Snuff lands at 2.4h (skilled), 3.2h (casual), 3.5h (idle). Region cadence for a skilled player: 9m, 35m, 1.1h, 3.5h, 4.5h, 7h. The R3→R4 step is the long one; Milestone 12 will look at it.

**Late-game stall (expected).** Past ~22 hours the greedy run sits at level ~200 on the Rendering Works floor in Waking 14 waiting for levels that cost hours each. That is precisely the horizon the Dark Severing (Waking 5) and the Unmaking exist for; Milestone 11 builds them.

## Milestone 11 — deep meta

**The Dark Severing** (opens at Waking 5). Marks = (lifetime Vestige this Severing ÷ 25)^0.6 × √(Waking  ÷ 5) × (1 + 10% per Nadir depth record). Carving resets Vestige, the tree and the Waking  count and performs a Snuffing on top; it keeps Marks, unlocks, standing, spells, boss-wisp choices, shades and slots, automation, the depth record. The ledger in the panel is computed from real state, as with Snuffing.

**Severing unlocks are structural, not stat pads** (fourteen of them): the Sixth Banner (6th shade slot); the Dark Arts (Hex school, an Nadiral Chime handed over at the start of every cycle, three hexes: Dark Orb, *Dead Again* — ×2 marrow for 20s — and Numbness); the Nadir; auto-Snuff and auto-spells; Deep Roots (keep 25/50/75% of tree ranks through a Severing); Familiar Ash (start at Waking 1/2/3); The Cruel World, Known (−10% Waking  scaling per rank); wider mind, longer night, sharper shades, and the two long sinks (Severing Edge / Severing Hunger, +20% each rank, five ranks).

**The Nadir** is a seventh road below the Rendering Works with five tiers and the Watcher. Killing the Watcher *descends*: depth +1, the road resets, every tier is five global tiers harder, and the depth persists through Snuffing (the stair remembers). Depth record feeds the Severing formula. It is the endless treadmill for the player who has cleared everything, and it always has a boss at the end of it.

**The Unmaking** begins after three Severings. Each Dark Level costs Marks (8 × 1.7^n) and is a permanent ×1.5 damage and marrow, ×1.25 Vestige, plus a gift for the first five: auto-Snuff *and* auto-Severing (the fire tends itself), rites that survive Snuffing, the Nadir resuming at record depth, weapons surviving the Severing, double Dark the Wick. After the fifth gift the multiplier simply never stops; a 200-hour player always has the next Dark Level and the next landing.

**The automation ladder, complete:** attack (tier 2 / 6 min) → reprisal, dodge, draughts, level, advance (Vestige tree) → spells, snuff (Severing) → severing (the Unmaking). Each is a toggle in the bar under the encounter and each was earned by playing the system it replaces.

**Sim findings.** The idle path had 1,151 deaths in 60h because the policy pushed tiers at parity and never retreated; a real idle player parks somewhere safe, so the policy now pushes only when 6–8 levels over-levelled (deaths → 0). It then sat at Mother Nettle for 20 hours fighting alone with auto-attack; now every strategy calls the whole cortege beside it inside an arena, and the idle tree priority buys the Bone reflexes first (auto-dodge is what gets an idle player past a lord). The two reflex nodes cost 4 instead of 6. Cycle cadence is player-driven; the simulator now waits 90 minutes of no progress before rendering, which stretches skilled cycles toward the spec's ~6h loop rather than the 40-minute churn of the first pass.

## Milestone 12 — polish

**Juice.** Impact flash and damage-scaled root shake (both off under *reduce effects* and the shake toggle); crit and reprisal numbers in their own colour and size; the reprisal moment gets a 0.65s time-dilation (every animation in the arena slows), a chromatic edge on the viewport, a strain crack and a rising chime; death gets a slow "UNMADE." freeze, an ash burst and a descending sting; boss deaths a long bell; the lantern flame at the foot of the page grows with lords, Wakings and Severings, and turns violet once the Severing is carved. `prefers-reduced-motion` is honoured and a manual toggle exists.

**Audio** is fully synthesized (`src/ui/audio.ts`): each cue is a tiny instrument built from oscillators, noise and envelopes. Off by default; the first pointer event primes the context once the player opts in.

**Onboarding teaches by playing.** Eleven contextual hints, each appearing in the moment it matters (first strike, first telegraph, first strain, exhaustion, first affordable level, first death, first cleared tier, first affordable shade, the open arena, the first offline stretch, the first Snuff) and dismissing itself when the player does the thing. Seen hints are remembered outside the save. No text wall anywhere.

**Bestiary.** Every foe met, with lore and its resistances; lords stay veiled until felled. Kept through Snuffing and the Severing, as knowledge should be.

**Performance.** The engine tick with six shades, a DoT, a boss and every automation on costs 0.02ms (benchmark in `scripts/bench.ts`). Every component selects primitives from the store, so a tick re-renders only what changed; floating numbers are capped at thirty.

**Auto-Snuff found a real bug.** After the first Severing the simulator's players snuffed every minute for fifty hours: the automation compared the gain with *held* Vestige, which a sensible player spends to zero. It now compares with what the *previous* Snuff gathered (×2, minimum 10, after 20 minutes), so each automatic cycle must beat the last and the cadence spaces itself. Auto-Severing uses the same shape (×1.5, minimum 5).

**The idle wall, diagnosed.** The idle simulator sat at Mother Nettle for forty hours. Three causes, all fixed: bleed procs never recorded their time, so an open wound never actually stopped a regenerating lord (an engine bug the active players hid by out-damaging the regen); the strategy kept the 20×-stronger Rotwood Club against a poison-immune boss instead of reading "bleed her" and switching to the dagger (now decisive: against a regenerating lord, only weapons carrying a status it cannot shrug off are considered, and a Cinder Coal is spent to infuse one if none exists); and a bleed proc only suppressed regeneration for four seconds, which a one-hit-per-second auto-attacker with 7 buildup per hit could never sustain (now six seconds; Nettle mends at 1.2%/2% instead of 1.5%/2.5%). Idle players also farm four hours at a wall before rendering instead of ninety minutes, because for them levels are the only lever that always pays. Result: the idle path fells Nettle at 3.1h instead of 41h and every lord by 22h, with zero deaths.

## Pass 2: presentation layer (art direction overhaul)

Decisions made in the second pass, all outside the engine:

- **The engine is read-only to the renderer.** `src/render/` and `src/vfx/` subscribe to the store's event stream (`subscribeEvents`) and select primitives; nothing in `src/engine/` changed, and the 102 engine tests are the proof.
- **Assets are built artifacts, committed.** `tools/assets/` turns a shape library into plates (SVG filter chains, resvg at 2x, a sharp treatment chain) and writes `assets/generated/art/<kind>/<id>{@2x,}.webp` plus a silhouette mask. A content-hash cache makes rebuilds incremental; `npm run art -- --only boss:coldPyreWarden --shove` rebuilds one.
- **The manifest is the only door.** `assets/manifest.ts` maps every entity to a file and a `source` (`procedural` today, `authored` later). Components use `<Plate kind id>`; no image path is imported anywhere in `src/ui/`. Swapping a procedural plate for an authored one is a manifest edit.
- **The audit is a test.** `tools/assets/audit.test.ts` fails the suite on a missing plate, a flat plate (too few luminance levels), a banned string, an emoji glyph, or a colour literal outside the thirteen tokens. It runs on every `npm test`.
- **Panels are objects, not boxes.** `src/render/materials/Slab.tsx` gives each panel a seeded clip-path polygon (chipped stone, torn parchment, cut iron), a fire-side bevel driven by the `--fire` custom property (written at 8Hz by `FireLight`), cached grain and mottle tiles, and a cast shadow. No SVG filter runs per frame; the grain overlay is a jittered tile.
- **Presentation knobs stay in settings**, not in the save: reduce-effects, screen shake, sound. Saves from before the pass load unchanged (no schema change).
- **VFX is a canvas under the HUD, not filters over it.** `src/vfx/stage.ts` draws the region layers and the figure itself in WebGL2 so the post chain (bloom, aberration, shockwave, heat, vignette, iris, flash) can touch the whole scene; the DOM keeps text and gauges on top. Cinematics reach the stage through `stageRef`. Hit-stop and time dilation act on the render and the particles only; the engine loop is never paused or scaled, so gameplay timing is unchanged.


## Pass 3: the rename

- **The name is MOURNWAKE.** GRAVEWAKE and every alternate in the brief were taken (NAMING.md has the table); MOURNWAKE was the first clear name in a second list of ten built against the same brief. Register checks that the sandbox could not reach are listed there as open items.
- **Mechanics stayed, words went.** Every system from passes 1 and 2 is intact. The vocabulary is the migration table from the brief plus a scrub of every proper noun that echoed the source games: boss names now follow the house pattern (*The Fenwright, Who Drowned the Choir*), regions are the Tollroad, the Mire, the Archive, the Sanctum, the Undercroft, the Rendering Works and the Nadir; the six stats are Vitality, Breath, Might, Finesse, Insight and Devotion (keys `vit bre mig fin ins dev`).
- **Identifiers, not just strings.** The old flask count became `draughtCount`, the old openness state became `strain`, the old counter-window became `reprisal`, the old party became `cortege`, and so on through 4,600 replacements. <!-- banned-terms: allow --> Palette tokens are the one exception: `--ember` and `--ember-hot` remain as colours (the brief allows this) and `--soul` became `--wisp` so no colour name is a content word.
- **The linter is a test.** `tools/lint/banned-terms.ts` scans source, content, tools, the manifest and every markdown file for the whole left column and a long list of FromSoftware nouns; `npm test` fails on a hit. Three lines carry a `banned-terms: allow` pragma: the legacy export prefix, the legacy storage keys, and the migration test's list of keys that must *not* survive.
- **Saves survive.** Schema version 2; `src/engine/migrations/v1-to-v2.ts` remaps every key, id and enum from `rename-map.ts` (generated by the rename itself, so code and migration cannot drift). A pre-rename fixture (`src/engine/__tests__/fixtures/save-v1.json`) round-trips in the suite, and a 300-case fuzz test asserts damaged saves are rejected with a SaveError rather than wiped. Old localStorage keys are adopted on first load; old export strings still import.

## Pass 3: mobile-first

- **Portrait is the design.** `src/ui/App.tsx` is a shell of three bands: the status strip (information), the section (one of five pillars), and the hand (a thumb-zone action bar in Combat and the bottom navigation everywhere). `useLayout()` in `src/ui/shell/useViewport.ts` picks portrait, landscape (a phone on its side: combat frame beside the section) or wide (a rail of pillars, the frame, the section) from the viewport; each is a different arrangement of the same components, not a stretched phone.
- **One modal surface: the bottom sheet.** `Sheet.tsx` is a portal over a scrim, capped at 85% of the viewport, closed by scrim, Escape or its own control. The old `Tooltip` keeps its API and renders a sheet on tap, so nothing was rewritten to lose its hover.
- **Audits fail the build.** `tools/audit/touch-targets.mjs` (48×48, 8px, walked at 390×844 on every pillar and sub-tab, top and scrolled) and `tools/audit/hover.mjs` (no `title=`, no mouse-enter, no reveal-on-hover) run in `npm run ci` and in `.github/workflows/ci.yml` beside the tests, the asset audit and the banned-terms linter.
- **Sections keep their place.** `Section.tsx` remembers the chosen sub-tab and the scroll position per section, so leaving and returning never loses the player's spot.

## Pass 3: platform

- **A web app that installs.** `tools/pwa/icons.ts` generates the icon set and splash plates into `assets/generated/pwa/`; the manifest sits beside them and both are copied into `dist/`. `src/ui/pwa.ts` registers `sw.js` in production, holds the browser's install prompt, and offers it once from `InstallSheet` six seconds after the first lord (on iOS, instructions instead). `tools/pwa/sw-plugin.ts` writes the service worker at build time from the actual bundle: shell and chunks, the manifest, and `assets/first.ts` (the first region's layers, the first enemies, the lantern, the remains, the first sword) precached; navigations network-first, art and hashed assets cache-first.
- **Quality is a set of knobs, not a switch.** `src/vfx/quality.ts` defines four tiers (Cinematic, High, Balanced, Battery) as `{dpr, bloom, particles, motes, heat, grain, cinematic}`. The stage, the particle pool, `Grain`, `MoteField` and `Cinema` read them; the settings screen shows Auto plus the four. Auto detects from device memory, cores, touch, save-data and reduced motion, and steps down on two runs of forty frames over 22 ms; a pinned tier never moves. Below Battery the stage gives the frame to the DOM picture (`perf-lite`).
- **Nothing runs for a hidden page.** `Vfx` stops its animation frame on `visibilitychange`; `loop.ts` re-arms its interval at 1 Hz while hidden, 20 Hz visible; the accumulator (capped at 60 s of catch-up) and the offline calculator cover the rest.
- **Saving survives the phone.** `persist.ts` saves on interval, on hidden, on `pagehide`, `beforeunload`, `freeze`, and within two seconds of any event that changes what the player would miss. `tools/audit/interrupt.mjs` checks backgrounding, a renderer kill, and clock jumps of two and three hours; `tools/audit/budget.mjs` checks payload and time-to-playable on a throttled phone. Both run in `npm run ci` and in the workflow.

## Pass 3: the Stair (Descent Runs)

- **A separate, active mode on the ordinary engine.** `src/engine/descent.ts` owns entry, floors, the offer, banking and death; the fights themselves are `combat.ts` unchanged. A run sets the encounter to tier `DESCENT_TIER` (−4) in the `nadir` zone's picture; `spawnEnemy`, `onKill`, `playerDie`, `hurtPlayer`, `playerAttack` and `gTier` each carry one branch for it. Every other system (spells, shades beside you, automation, statuses, boss phases) works on the stair because nothing about it is special.
- **The stake is the haul, never the purse.** Kills on the stair fill `run.haul`; a withdrawal banks it times `1 + 0.06 × (floor − 1)` and counts it toward the cycle's marrow (so Vestige sees it); death on the stair loses the haul, drops no Remains and leaves your own marrow untouched. Snuffing, Severing and the Unmaking refuse while a run is open.
- **The decision every floor is a sheet.** Three boons, or the way out; the sheet cannot be dismissed, and the way out is the first button under the thumb. Choosing is two taps (pick, then take) because a boon lasts the run. An exhausted boon pool simply continues the stair.
- **Boons are knobs the combat reads.** `runFx()` sums the run's boons into one effect record; `computeMods` folds the multiplicative ones (damage, strain, taken, reprisal, status, stamina, dodge) into the ordinary modifiers so they appear in the Modifiers list like everything else. The rest (lifesteal, thorns, regen, First Cut, Second Waking, free casts, Lantern-Oil, Short Stair, Usurer's Bank) are handled where they bite. Grave-Momentum compounds per kill and Patient Knife per second, both capped in `BALANCE.descent`.
- **Danger climbs exponentially, pay does not.** A floor fights at `cycleDeepest − 4 + floor/2` global tiers (a lord every fifth floor at a fifth of its road might); a kill pays like the road five tiers under the cycle's deepest, times `1.02^(floor−1)`. The first draft paid the floor's own tier and a forty-floor run out-earned the road ten-thousandfold (BALANCE.md rev 4). Depth is worth the bank multiplier and the story, not a printed fortune.
- **Sim strategies descend.** `PolicyParams.descent` gives each strategy a cadence, a floor to withdraw at and a nerve; `nostair` is the control and `reckless` never climbs out before floor 40. The report's "Stair pays" column is the median over banked runs of the run's marrow per minute against the road's marrow per minute since the previous run.

## Pass 3: Standing Orders

- **A program, not a set of toggles.** `src/engine/orders.ts` evaluates the player's rules top to bottom every tick: a rule fires when each of its (one or two) conditions holds and its action can be done right now, then rests a cooldown (0.25 s for Strike, 1 s for economy actions, 0.3 s otherwise). An action the engine refuses does not count as fired and leaves no error in the log. Rules run through `applyAction`, so an order can do only what a thumb could.
- **Earned, not given.** Orders arrive with Revenant Instinct; slots are two plus one per lord ever felled, to eight. Condition kinds unlock as the player meets them (Composure and the Reprisal window after the first Reprisal, a coming attack after three perfect dodges, the Stair's floor, haul and offer once the stair shows itself); action kinds the same (Cast with a spell known, Reinforce with slag in hand, Withdraw and Descend with the stair). `orderProblem()` is the one validator, used by the action handler, the editor and the simulator.
- **Scale-free thresholds.** Percentages for HP, stamina, FP, enemy HP and Composure; counts for draughts, streak and floor; Marrow in multiples of the next level's cost; the haul in multiples of the purse. Nothing on a phone is typed.
- **The editor is chips and sheets.** Every part of a rule is a 48px chip; a chip opens a sheet of choices with a line of help each. Rows carry a switch, up and down, and removal behind a confirmation. In portrait the Combat column now scrolls as one (arena, hand, reflexes, orders, log), so nothing is trapped under the fold; the touch audit treats the column as a scroll scope.
- **Authorship is worth something, measurably.** The `authored` simulator strategy is `idle` plus eight orders written in priority (level the lowest stat, drink at 35%, climb out of the Stair past floor 4, take the rarest boon, strike the Reprisal, dodge the telegraph, withdraw when out of draughts, reinforce). 12 h, seed 7: level 161 against idle's 113, first Snuff at 6.8 h against 9.1 h, marrow per hour double by the third hour, no deaths either way. The sim writes the orders the moment they unlock and again whenever a new slot or kind arrives, keeping the counters of rules that already exist.

## Pass 3: the Study and the forge

- **The Study is the bestiary with a ladder.** `state.study` counts lifetime kills per creature and lord and is kept through every fire. Ranks at 25 / 100 / 500 / 2000 kills (lords 1 / 4 / 12 / 30) reveal, in turn, resistances, attacks and their tells, drops, and the creature's full measure. Every rank pays a permanent +0.2% (lords +0.5%) to damage and marrow, to about +66% at total mastery, and +3% damage per rank against that creature. The first draft ramped four times faster and pulled the greedy first Snuff under the hour; slowed before it shipped (BALANCE.md rev 6).
- **The Study gates the forge.** Affixes carry gates the Study must meet: Venomed needs a poisoner known, Rimed and Usurious need a lord known. `affixPool(state)` is the one place that decides what can roll.
- **Affixes are three slots on a weapon instance.** `WeaponInstance.affixes` and `.locked` arrive empty (a v5 migration adds them to old saves). Reforge rerolls every unlocked slot at the reinforce price times 0.6, times 2.5 per locked affix, plus slag by region; tiers Rough / Fine / Black weighted by the weapon's reinforcement. The equipped weapon's affixes fold into `computeMods` (damage, marrow, crit, strain, taken, materials, reprisal, stamina, HP, status) and reach the attack itself (status per hit, crit damage, lifesteal, attack speed); a shade's weapon gives the shade its Brutal and Swift.
- **Sets count pieces across the Cortege.** Every wielded weapon (yours and each shade's) is a piece of each set among its affixes; the Usurer, the Butcher, the Mason, the Thief and the Wick pay at two, four and six pieces. Six pieces means a full Cortege armed with matching steel: a late-game goal that is not a bigger number.
- **The simulator forges.** Clicking strategies reforge once a minute when they can spare four times the price and still reinforce, and lock a Black affix worth keeping; idle strategies never touch it.

## Pass 3: Afflictions and the Toll

- **Afflictions are the player's difficulty dial.** `state.afflictions` is a list of curse ids from `src/content/afflictions.ts`, each a cost and a gain, all stacking, toggled at will except on the stair. `applyAfflictions` folds them into the modifiers; the costs bite through new modifier fields (`enemyComposure`, `reflexesSleep`, `reinforceScale`, `marrowLeak`) read where they matter: the spawn, the reflex checks in the tick, the reinforcement term of weapon damage, a tick hook that drains the purse. The gains are ordinary multipliers, so the Modifiers list shows the whole bargain.
- **The Toll is a clock in the save.** `state.toll.t` advances with every tick and with every second away (`applyOffline` turns it forward), so the hour you return to is the hour it is, not the hour you left. Phases from `src/content/toll.ts` (Dawn 8, Day 14, Dusk 12, Black Hour 6 minutes) tilt the modifiers; the Black Hour raises enemy HP and damage by half, pays marrow ×1.75 and materials ×2, sends a third of its spawns dark-touched, and multiplies the Stair's haul. Each creed has an hour in which the gifts of its passive (never its costs) are applied a second time.
- **Generous by construction.** No phase takes anything away. Time away is credited the Black Hour's share of itself (`blackShare` walks the phases), so the summary on return says what the Hour paid while you slept. The clock is shown as a dial with the minutes to the next Black Hour, in the Lantern's Toll tab beside the afflictions, and the hour's name sits in the arena header; the page tints for Dusk and the Black Hour through classes on `<html>`.
- **Measured.** `bold` is greedy under four afflictions (Thin Blood, Short Breath, Iron Composure, Brittle Steel). Six hours, seed 7: level 165 against greedy's 147 and marrow per hour ahead by hour four, at the cost of 31 deaths to greedy's 4 and a first Snuff nine minutes later. The dial pays a hand that can take it. The Toll's first draft (Day +10%, Black Hour ×2) pulled the greedy first Snuff to 0.91 h; at +5% and ×1.75 it sits at 0.95 h, and the pacing test's floor moved from 1 h to 0.8 h with the reasoning recorded in the test.

## Pass 3: the stretch mechanics

- **Cortege Dispatch.** `src/engine/dispatch.ts`. A shade goes `away` for ten, twenty or thirty minutes on the near road, the far road or into the dark; it leaves the active Cortege while gone. Pay is the shade's own worth at the deepest cleared tier times the road's multiplier; the far and dark roads fail sometimes and carry a chance of a lord's Keepsake; the dark keeps one shade in five. A lost shade stays in `recruited` (never re-recruited) and joins `dispatch.echoes`: a permanent bonus by its role, listed in the Modifiers. Missions run on the clock, online and away; the away report lists the returns.
- **Holdfasts.** `src/engine/holdfasts.ts`. A region whose lord has fallen can be claimed for one level-up's marrow. It produces a share of its last tier's kill each second, more with a garrison (`garrison` is a third shade assignment), plus the region's slag, and it opens affixes at the forge (Gilded with any holdfast, Vengeful with one in region two or deeper). Raids come every 25 to 40 minutes: a two-minute window in which five kills in the zone repel it for ninety minutes of production and a chance of a Keepsake; unanswered, the garrison holds (30 minutes of production) or does not (production halved for an hour). A holdfast is never lost; holdfasts fall with the cycle at Snuffing. Production accrues in fractions and pays whole marrow, because a tenth of a second of a small rate floors to nothing.
- **The Creed War.** `src/engine/war.ts`. Five standings the world drifts by a deterministic tide; your kills add one and your lords fifty to your creed. Order from the top decides the underdog bonus: each rank below the leader pays +10% standing and +4% marrow. Six-hour rounds on the clock; the leader takes dominion and lends the gifts of its passive (never its costs) to everyone at half power for the next round, while standings halve and carry.
- **Weapon Mastery.** `src/engine/mastery.ts`. Kills with a weapon in hand rank it at 50 / 200 / 600 / 1500; each rank is +4% damage with it; the first opens the archetype's Art (Flurry, Crush, Reprisal Stance, Stoke) on a cooldown, and each rank after adds 15% to the Art. Arts are a Standing Orders action and a button on the hand.
- **Measured.** Six hours, seed 7: every strategy uses its Art about a thousand times; greedy sends eight expeditions and bold nine into the dark (none lost this seed), idle claims and is raided fourteen times without ever answering; holdfasts are claimed on the tick the purse allows (the simulator puts the claim before the level-up) and fall at each Snuff. Pacing holds (greedy first Snuff 0.91 h).

## Pass 3: content and art for the new mechanics

- **Five new asset kinds through the pass-2 pipeline.** `boon` (27, a cut ring in the rarity's metal with a motif), `art` (4, a struck iron plate), `affix` (15, a shard of slag lit in its set's colour), `set` (5, an iron seal beside the creeds' wax), `toll` (4, a horizon strip with the hour's light where the hour keeps it), and a `stair` region of four parallax layers: one great descent through the centre, arches marching down with it. All are manifest entries built by `tools/assets/generate.ts`, judged by the same no-placeholder audit (byte floors per kind, luminance levels and spread), and laid out on `art/sheet-pass3.png`.
- **The Stair has its own picture.** The engine keeps the run in the `nadir` zone id; the stage, the DOM backdrop and the encounter header ask for `stair` while a run is open, and the stage has an ambient line for it (a few motes, some ash, wisps rising, a little heat from the lantern below).
- **Every new thing has words.** Affixes gained a line of lore each (shown on the reforge sheet), joining the boons, the Arts, the sets, the afflictions and the hours, all validated for length by `validateContent()`; the banned-terms linter caught "Riposte", "Kindle" and "Hollow" on the way in and they were renamed before they shipped.