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

## Milestone 8 — magic and covenants

**Catalysts open schools.** Owning an Ashen Staff (sorcery), a Cracked Talisman (miracles) or a Pyromancy Flame (from Eskel's soul, or bought in Region 2) opens that school *and* the first attunement slot. Wielding the catalyst channels its school for +25% power at the cost of a weak melee, so a pure caster is a real build rather than "melee plus spells". Three more slots are bought with souls (×6 each); the tree and the Sigil add more.

**Power formula.** Sorcery/miracles: 0.4 + 2.2 × statCurve(INT or FTH) → 0.6 at 10 points, ~2.5 at 40. Pyromancy: (0.6 + 0.5 × (curve INT + curve FTH)) × 1.18^flame, so it levels with souls poured into the flame instead of stats. Spells scale from the "base strike" (weapon base × reinforcement × permanent modifiers, *no* stat scaling) so they stay relevant for a stat-invested caster without being mandatory for a melee build: Soul Arrow at 8 FP is +50% DPS for an unlearned build and +200% for INT 40. Buffs scale gently with √power and never below their listed value.

**The roster** is 21 spells across the three schools (six of them, tied to Regions 2–6 bosses and drops, are staged in `UPCOMING_SPELLS` until Milestone 10 ships their sources). The important ones for session shape: Last Rites (+60% souls for 25s), Sacred Oath (party-wide), Bountiful Light (phantoms ×1.5 for 40s), Power Within (the greedy self-burn).

**Covenants** are five mutually exclusive oaths with a passive, three ranked upgrades each, and *standing* that accrues per kill (+1, +25 per boss) and persists through Kindling. The first oath is free; each later switch costs three level-ups' worth of souls growing ×1.5, so switching is a real decision but never a lock. Upgrade costs are multiples of the current level-up cost, which keeps them meaningful across the exponential. Availability gates: Embers always; Legion after the first phantom; Rot Wardens and the Vigil from Region 2; the Abyssal Pact after two lords (×2 souls, ×2 damage, ×2 damage taken, *no bloodstain*).

**Phantom affinity**: a phantom whose covenant matches yours gets +15% damage (healers +40% healing). This is the horizontal hook that makes two players' squads differ.

Simulator: strategies now buy a catalyst, learn and cast, and swear by play style (Embers for skilled, Vigil for casual, Legion for idle). First boss: greedy 9.6m, casual 21.9m without a death (Heal carries it). Souls/hour up ~50% from the Embers passive and Magic Weapon.

## Milestone 9 — Kindling

**Humanity** = (cycle souls ÷ 5,000)^0.42 × 1.15^lords × (1 + 4% per deepest tier) × bonuses. Sub-linear on souls so that kindling *more often* out-gathers waiting, and it needs at least one lord's soul to catch. The Kindle panel shows the gain live, and the confirm step lists exactly what is kept and what turns to ash, computed from the actual modifiers.

**What survives.** Humanity and the tree; covenant standing (rites reset); spells known; boss-soul *choices* (the weapon is handed back the moment that boss falls again — the choice was permanent, the item is a consequence); recruited phantoms (levels reset to 1) and the phantom slots earned from lords; every automation unlocked; the bestiary. Weapons, levels, materials, zone progress, Estus and attunement purchases burn — unless *Unforgotten Steel* (10 Humanity) is bought.

**Why NG+ is net-positive.** The first tuning pass had HP ×1.6 and souls ×1.45 per cycle, and the simulator showed the exact anti-pattern the spec forbids: souls/hour fell by 80% after the first Kindle and deaths spiked. Now HP ×1.45, damage ×1.2, souls ×1.55, drops ×1.35 — the cycle pays for itself — and the Flame branch (starting levels, starting souls, weapons at +N) front-loads the first twenty minutes. Simulator after the fix: greedy's souls/hour go 70K → 116K → 169K → 253K → 426K across five hours and eight Kindles (Region 1 only; the cadence stretches once Regions 2–6 exist).

**The tree** is 25 nodes in four branches. Automation lives in the tree as *earned* nodes (Reflex of the Ember = auto-riposte, Reflex of the Bone = auto-dodge, Instinct to Drink, The Fire Chooses = auto-level, Restless Feet = auto-advance). Each sits behind the manual-skill nodes of its branch, so you graduate from a system only after investing in it. Familiar Dark (−8% NG+ scaling per rank, ×2 cost growth) is the long-tail sink.

**Variants.** NG+ enemies roll modifiers (Ashen, Hollowed, Abyssal, Ancient, Ember-touched) with a chance that rises per cycle, each changing how the fight plays (poise, damage, attack speed, telegraph length) rather than only its size. Cycle-exclusive bosses hook in through `BossDef.cycle` and ship with Milestone 10's regions.

**A found rule.** Resting at a bonfire now leaves a boss arena and returns you to the last tier. Before that fix the simulator's casual player retreated from Eskel's third phase, watched him reset, and walked back in for 50 minutes without ever going to level up. Real players do this too. The fog gate must be crossed deliberately every time.

## Milestone 10 — content build-out

**The spine.** Six regions, 32 tiers, 38 enemies, 17 bosses (6 lords, 6 secret, 5 cycle-exclusive), 32 weapons, 22 spells, 6 phantoms. Every item has its own lore; `validateContent()` scans all shipped text for placeholder words and fails the build on any.

**Regions as arguments.** Each region makes a case for a different build:
- *Mire* (R2): poison everywhere, Rotting Knights immune to it, Mother Nettle regenerates unless bled/frozen. Teaches status as a tool, not a bonus. Home of the Rot Wardens and Ghrelt (stagger).
- *Archive* (R3): magic-resistant Bound Tomes next to physical-resistant Custodians; Archivist Null is immune while reciting (stagger-only at 0%) and has a 2.2s "Unmaking" you must dodge. Teaches stagger + resist reading. Vesna (buffer).
- *Sanctum* (R4): lightning knights and Silver Sentinels with no blood to bleed. Saint Orvane's *Lantern* phase punishes hitting during the glow (hymn mechanic). Teaches restraint. Corvo (status).
- *Deep* (R5): the Keeper turns the lights out — telegraphs vanish, dodge on rhythm; auto-dodge fails there on purpose. Humanity Sprites drop Dark Embers. Ysolde (dps).
- *Kiln* (R6): everything at once; the Lord of Cinders has four phases (dodge → backdraft → stagger-only → enrage). The First Ember (secret) is blind + regen + enrage, the true final exam.

**Mechanics, now six.** regen, backdraft, staggerOnly, plus *enrage* (attack interval shrinks over the phase, floor 40%), *hymn* (alternating 5s windows where hits reflect 4–6% of your max HP; staggering silences it), *blind* (hidden telegraph; auto-dodge disabled; the simulator's players dodge at half skill). Every lord uses at least two, so "bigger HP bar" never describes a boss.

**Cycle bosses.** One per region for NG+1…5 (Captain Vell, the Choir of Teeth, the Custodian Prime, the Twin Sentinels, the Drowned Sun), each with two phases and its own mechanic pairing. They open at a third arena tier after the region's lord falls, once per cycle, and drop *Dark Embers* (instant Humanity), slabs and Soul Vessels instead of a boss soul. Early NG+ is discovery.

**Weapon curve.** Base damage ×~4–5 per region (11 → 62 → 300 → 1,500 → 7,500 → 38,000), shop prices at roughly 100 kills of the region's first tier, boss-soul weapons above the shop tier with an unusual scaling pair (Bell-Hammer STR/FTH lightning, Keeper's Blackblade INT/FTH dark). Catalysts scale into the late game through the Storm Talisman (miracles ×1.5).

**The big balance finding.** The first 40-hour run showed players at soul level 95 stalled in Region 2: stats past the soft caps stopped turning souls into power while enemy HP kept compounding ×1.55 per tier. Fix: *every* soul level multiplies damage by 1.025 (as it already did HP by 1.035). Stats and grades decide *what* a level buys; the level always buys something. With that, greedy clears all six lords in 8.2h, casual in 9.8h, and souls/hour rise monotonically through 40 hours and 14 Kindles. Levels 4 per tier × 1.025 ≈ ×1.10 per tier; reinforcement and the region weapon step supply the rest.

**Humanity now compounds with depth** (×1.06 per deepest tier instead of +4%): the simulator's players were kindling at 40 minutes after three quick lords; now the first Kindle lands at 2.4h (skilled), 3.2h (casual), 3.5h (idle). Region cadence for a skilled player: 9m, 35m, 1.1h, 3.5h, 4.5h, 7h. The R3→R4 step is the long one; Milestone 12 will look at it.

**Late-game stall (expected).** Past ~22 hours the greedy run sits at level ~200 on the Kiln floor in NG+14 waiting for levels that cost hours each. That is precisely the horizon the Dark Sigil (NG+5) and the Age of Dark exist for; Milestone 11 builds them.

## Milestone 11 — deep meta

**The Dark Sigil** (opens at NG+5). Marks = (lifetime Humanity this Sigil ÷ 25)^0.6 × √(NG+ ÷ 5) × (1 + 10% per Abyss depth record). Carving resets Humanity, the tree and the NG+ count and performs a Kindling on top; it keeps Marks, unlocks, standing, spells, boss-soul choices, phantoms and slots, automation, the depth record. The ledger in the panel is computed from real state, as with Kindling.

**Sigil unlocks are structural, not stat pads** (fourteen of them): the Sixth Banner (6th phantom slot); the Dark Arts (Hex school, an Abyssal Chime handed over at the start of every cycle, three hexes: Dark Orb, *Dead Again* — ×2 souls for 20s — and Numbness); the Abyss; auto-Kindle and auto-spells; Deep Roots (keep 25/50/75% of tree ranks through a Sigil); Familiar Ash (start at NG+1/2/3); The Cruel World, Known (−10% NG+ scaling per rank); wider mind, longer night, sharper shades, and the two long sinks (Sigil Edge / Sigil Hunger, +20% each rank, five ranks).

**The Abyss** is a seventh road below the Kiln with five tiers and the Watcher. Killing the Watcher *descends*: depth +1, the road resets, every tier is five global tiers harder, and the depth persists through Kindling (the stair remembers). Depth record feeds the Sigil formula. It is the endless treadmill for the player who has cleared everything, and it always has a boss at the end of it.

**The Age of Dark** begins after three Sigils. Each Dark Level costs Marks (8 × 1.7^n) and is a permanent ×1.5 damage and souls, ×1.25 Humanity, plus a gift for the first five: auto-Kindle *and* auto-Sigil (the fire tends itself), rites that survive Kindling, the Abyss resuming at record depth, weapons surviving the Sigil, double Dark Embers. After the fifth gift the multiplier simply never stops; a 200-hour player always has the next Dark Level and the next landing.

**The automation ladder, complete:** attack (tier 2 / 6 min) → riposte, dodge, estus, level, advance (Humanity tree) → spells, kindle (Sigil) → sigil (Age of Dark). Each is a toggle in the bar under the encounter and each was earned by playing the system it replaces.

**Sim findings.** The idle path had 1,151 deaths in 60h because the policy pushed tiers at parity and never retreated; a real idle player parks somewhere safe, so the policy now pushes only when 6–8 levels over-levelled (deaths → 0). It then sat at Mother Nettle for 20 hours fighting alone with auto-attack; now every strategy calls the whole squad beside it inside an arena, and the idle tree priority buys the Bone reflexes first (auto-dodge is what gets an idle player past a lord). The two reflex nodes cost 4 instead of 6. Cycle cadence is player-driven; the simulator now waits 90 minutes of no progress before kindling, which stretches skilled cycles toward the spec's ~6h loop rather than the 40-minute churn of the first pass.

## Milestone 12 — polish

**Juice.** Impact flash and damage-scaled root shake (both off under *reduce effects* and the shake toggle); crit and riposte numbers in their own colour and size; the riposte moment gets a 0.65s time-dilation (every animation in the arena slows), a chromatic edge on the viewport, a stagger crack and a rising chime; death gets a slow "YOU DIED" freeze, an ash burst and a descending sting; boss deaths a long bell; the bonfire flame at the foot of the page grows with lords, Kindles and Sigils, and turns violet once the Sigil is carved. `prefers-reduced-motion` is honoured and a manual toggle exists.

**Audio** is fully synthesized (`src/ui/audio.ts`): each cue is a tiny instrument built from oscillators, noise and envelopes. Off by default; the first pointer event primes the context once the player opts in.

**Onboarding teaches by playing.** Eleven contextual hints, each appearing in the moment it matters (first strike, first telegraph, first stagger, exhaustion, first affordable level, first death, first cleared tier, first affordable phantom, the open arena, the first offline stretch, the first Kindle) and dismissing itself when the player does the thing. Seen hints are remembered outside the save. No text wall anywhere.

**Bestiary.** Every foe met, with lore and its resistances; lords stay veiled until felled. Kept through Kindling and the Sigil, as knowledge should be.

**Performance.** The engine tick with six phantoms, a DoT, a boss and every automation on costs 0.02ms (benchmark in `scripts/bench.ts`). Every component selects primitives from the store, so a tick re-renders only what changed; floating numbers are capped at thirty.

**Auto-Kindle found a real bug.** After the first Sigil the simulator's players kindled every minute for fifty hours: the automation compared the gain with *held* Humanity, which a sensible player spends to zero. It now compares with what the *previous* Kindle gathered (×2, minimum 10, after 20 minutes), so each automatic cycle must beat the last and the cadence spaces itself. Auto-Sigil uses the same shape (×1.5, minimum 5).

**The idle wall, diagnosed.** The idle simulator sat at Mother Nettle for forty hours. Three causes, all fixed: bleed procs never recorded their time, so an open wound never actually stopped a regenerating lord (an engine bug the active players hid by out-damaging the regen); the strategy kept the 20×-stronger Rotwood Club against a poison-immune boss instead of reading "bleed her" and switching to the dagger (now decisive: against a regenerating lord, only weapons carrying a status it cannot shrug off are considered, and a Cinder Coal is spent to infuse one if none exists); and a bleed proc only suppressed regeneration for four seconds, which a one-hit-per-second auto-attacker with 7 buildup per hit could never sustain (now six seconds; Nettle mends at 1.2%/2% instead of 1.5%/2.5%). Idle players also farm four hours at a wall before kindling instead of ninety minutes, because for them levels are the only lever that always pays. Result: the idle path fells Nettle at 3.1h instead of 41h and every lord by 22h, with zero deaths.
