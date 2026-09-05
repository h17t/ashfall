# Mournwake — Balance Log

Simulator output per revision of `src/content/balance.ts`. The simulator lands in Milestone 2; this file starts life as the record of the initial curve choices.

## Rev 0 — initial curves (Milestone 1)

| Knob | Value |
|---|---|
| Enemy HP | 60 × 1.55^g |
| Enemy damage | 20 × 1.2^g (rev 1: was 9) |
| Enemy composure | 26 × 1.12^g |
| Marrow per kill | 6 × 1.5^g |
| Level cost | 30 × 1.115^L + 6L |
| Reinforce | ×1.15 per level, cost 40 × 1.9^L × 5^(region−1) |
| Boss HP / marrow / dmg | 30× / 40× / 2.4× the zone's last tier (rev 1: was 14× / 40× / 1.6×) |

Smoke run (2 min, click every 0.3s, tier 0): 68 kills, 309 marrow, no deaths.

## Rev 2 — Milestone 10 (full content)

| Knob | Value | Why |
|---|---|---|
| Waking  scaling | HP ×1.45, dmg ×1.2, marrow ×1.55, drops ×1.35 per cycle | a cycle must be net-positive (was 1.6 / 1.28 / 1.45) |
| Damage per level | ×1.025 (HP ×1.035) | levels must always pay; stats decide what they buy |
| Vestige | (marrow/5000)^0.42 × 1.15^lords × 1.06^depth | depth compounds so pushing beats early rendering |
| Composure | 26 × 1.12^g | staggers must happen on tier-0 enemies |

Region cadence (skilled / casual): the Pyre-Warden 9m / 18m · Mother Nettle 35m / 45m · Archivist 1.1h / 1.9h · Orvane 3.5h / 4.7h · Keeper 4.5h / 6h · the Renderer 7h / 9.8h. First Snuff 2.4h / 3.2h / 3.5h (idle).

## Rev 3 — Milestones 11–12 (deep meta, polish)

| Knob | Value | Why |
|---|---|---|
| Severing Marks | (lifetime Vestige ÷ 25)^0.6 × √(Waking  ÷ 5) × (1 + 0.1 × depth record) | opens at Waking 5; depth record feeds it so the Nadir matters |
| Dark Level | 8 × 1.7^n Marks → ×1.5 dmg/marrow, ×1.25 Vestige each | the endless horizon |
| Auto-Snuff | gain ≥ 2 × last Snuff's gain, ≥ 10, after 20 min | comparing with *held* Vestige snuffed every minute (players spend it) |
| Bleed vs regen | open wound suppresses regen 6s (was 4s); Nettle mends 1.2%/2% (was 1.5%/2.5%) | the idle path could never sustain suppression at 1 hit/s |
| Reflex nodes | auto-reprisal / auto-dodge cost 4 (was 6) | they are what get an idle player past a lord |

Final 60h, seed 7 — every strategy fells all six lords. Lords (skilled / casual / idle): the Pyre-Warden 9m / 18m / 2.3h · Nettle 17m / 35m / 3.1h · Archivist 35m / 1.0h / 5.3h · Orvane 1.8h / 2.2h / 10h · Keeper 3.1h / 4.1h / 13h · the Renderer 4.2h / 5.4h / 22h · the Watcher 8.3h / 16h / —. First Snuff 1.8h / 2.2h / 10h; first Severing (see table). Deaths in 60h: 20 / 19 / 0. Two stalls, both 22 minutes, both idle at Sanctum tier 4.

200h long-horizon run (greedy / idle, seed 7, ~5.5 min of wall time each): no stalls (one 22-minute idle stall at 7.7h), no invariant violations at septillion-scale marrow. Skilled: Nadir depth 35 (global tier 205), Waking 13 within the current Severing, 20 deaths total, all in the first hours. Idle: the Watcher at 140h, Nadir depth 7, marrow/hour rising monotonically for the whole run (11K → 18.8M by hour 12 and onward), zero deaths. The Unmaking's multiplier and the Nadir keep both curves moving at hour 200.

Known gaps versus the spec targets: the skilled first Snuff (1.8h) is under the 3–7h window because the simulator wakings the moment it is stuck 90 minutes; a human who reads the depth multiplier will wait longer. The first Severing for skilled play arrives well before the 30–60h target for the same reason (cycles are ~1–2h for a skilled player); both are cadence choices the player owns rather than walls. Region cadence from Orvane onward is 60–90 min per region for skilled play, as intended.

## Rev 4 — Pass 3, Milestone 5 (the Stair)

| Knob | Value | Why |
|---|---|---|
| Floor danger | global tier `cycleDeepest − 4 + floor/2`; a felled lord every 5th floor at 6× HP (the road's lords are 30×) | floor 1 is a warm-up; floor 10 is two tiers past the road; a lord floor is a wall, not a run-ender |
| Floor pay | marrow of the road five tiers under the cycle's deepest × `1.02^(floor−1)`; stair respawn 1.0 s (road 0.6 s) | pay must not track danger: the first draft paid the floor's own tier (×1.55 per tier) and a 40-floor run out-earned the road ×4000 |
| Bank | `1 + 0.06 × (floor − 1)` (Usurer's Bank +0.1 per floor) | linear: one more floor is always a modest gain against the whole haul |
| Kills per floor | 3 (Short Stair: 2) | a decision every thirty seconds at road speed |
| Momentum / Patience caps | ×8 / ×2.5 | uncapped momentum one-shot floor 53 and exhausted the boon pool (which now simply continues the stair) |
| Boon offer | weights common 60 / rare 30 / epic 10, epic +2 per floor (capped +30), no boon past its stack | deep runs are where the combos line up |

The metric is "Stair pays": the median over banked runs of the run's marrow per minute divided by the road's marrow per minute since the previous run, reset at each Snuff. 12 h, seed 7: greedy (withdraws at floor 10) 1.02×, optimal (floor 14) 1.91×, casual (floor 6) 1.14×, idle (floor 4, every 40 min) 0.54×, reckless (floor 40, nerve 8%) 4.96× with 24 of 78 runs lost. `nostair` is greedy without the stair: its first Snuff moves from 1.81 h to 1.43 h with the stair, deaths from 17 to 14, final level 372 → 407. The pacing targets hold (first boss 8.6 / 17.7 min, first Snuff 1.4–2.1 h skilled, 9–10 h idle). The stair is worth about the road's rate for typical play and twice it for expert play; it is a session mode, not the economy. Revisit at the M11 re-tune with the human cadence (a run or three per sitting, not one every ten minutes).

## Rev 5 — Pass 3, Milestone 6 (Standing Orders)

| Knob | Value | Why |
|---|---|---|
| Slots | 2 + 1 per lord ever felled, cap 8 | the first two orders are the two that matter (level, drink); depth of authorship follows progress |
| Cooldowns | Strike 0.25 s, economy 1 s, else 0.3 s | a strike order is a fast hand, not a machine; leveling once a second matches the simulator's own cadence |
| Unlocks | conditions and actions by deed (first Reprisal, three perfect dodges, first spell, slag in hand, the stair) | the editor only ever offers what the player has seen |

`authored` (idle plus eight orders) against `idle`, 12 h, seed 7: level 161 vs 113, first Snuff 6.8 h vs 9.1 h, deepest 27 vs 22, marrow/hour 1.3e5 vs 6.5e4 by hour three; zero deaths in both. The first draft of the authored rule list put "strike the Reprisal" before "level up"; when the Reprisal condition unlocked it took the second of two slots and the strategy stopped leveling at 24. Priority order matters in the list the player writes too, and the editor says so.

## Rev 6 — Pass 3, Milestone 7 (the Study and the forge)

| Knob | Value | Why |
|---|---|---|
| Study ranks | 25 / 100 / 500 / 2000 kills; lords 1 / 4 / 12 / 30 | the first draft (10 / 50 / 250 / 1000) gave greedy 132 of 220 ranks by hour six |
| Study bonus | +0.2% damage and marrow per creature rank, +0.5% per lord rank; +3% damage per rank against the creature | the first draft (0.4% / 1% / 5%) put the greedy first Snuff at 0.94 h, under the 1 h floor of the pacing test; now +27% at 6 h for greedy, +9% for idle, +66% at total mastery |
| Reforge price | reinforce cost × 0.6 × 2.5 per locked affix, plus 2 Coarse Slag (region 1), 1 Fine (2–3), 1 Black (4+) | a lock is a commitment; slag competes with reinforcement so the forge is a choice, not a tax |
| Affix tiers | Rough / Fine / Black weighted 70 / 25 / 5 at +0, 30 / 45 / 25 at +10 | a reinforced weapon is worth forging |
| Sets | 2 / 4 / 6 pieces across the weapon in hand and the shades' | six pieces needs a full armed Cortege |

Six hours, seed 7: greedy holds 100 of 220 Study ranks (+27%), casual 91 (+24%) with a Swift (Black) locked on a Render Greatsword, idle 41 (+9%) and never forges. The pacing tests hold after the tune.

## Latest simulator run

### Run — 2026-09-05 08:25 UTC · 12h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Snuff | Severing | Final L | Deepest | Waking  | Deaths | Stalls | Stair runs (died) | Best floor | Stair pays (× road rate) | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.04h | 8.6m | 8.6m | 17.2m | 1.43h | 3.96h | 407 | 31 | 3 | 14 | 0 | 67 (0) | 10 | 1.02 | 19434 |
| reckless | 3.1m | 10.6m | 8.6m | 8.6m | 20.9m | 1.69h | 5.09h | 260 | 33 | 5 | 32 | 0 | 78 (24) | 40 | 4.96 | 22902 |
| nostair | 3.1m | 1.13h | 8.6m | 8.6m | 17.1m | 1.81h | 4.23h | 372 | 31 | 5 | 17 | 0 | 0 (0) | 0 | 0.00 | 15071 |
| optimal | 3.7m | 3.43h | 9.4m | 9.4m | 21.5m | 1.35h | 3.92h | 379 | 31 | 6 | 3 | 0 | 84 (0) | 14 | 1.91 | 14714 |
| casual | 6.0m | 4.36h | 17.7m | 17.7m | 34.3m | 2.05h | 5.58h | 317 | 31 | 7 | 30 | 0 | 44 (0) | 6 | 1.14 | 17015 |
| idle | 6.0m | — | 2.34h | 2.34h | 3.11h | 9.09h | — | 113 | 22 | 4 | 0 | 1 | 14 (0) | 4 | 0.54 | 6391 |
| authored | 6.0m | — | 2.32h | 2.32h | 2.83h | 6.83h | — | 161 | 27 | 7 | 0 | 0 | 14 (0) | 5 | 0.91 | 16349 |
| noclick | 6.0m | — | 2.43h | 2.43h | 3.54h | 10.24h | — | 63 | 21 | 2 | 0 | 1 | 0 (0) | 0 | 0.00 | 6081 |

Marrow earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.67M | 15.3M | 691M | 21.7B | 384M | 32.7B | 69.8B | 93.9B | 12.4Qa | 45.0Qi | 4.00Sx |
| reckless | 1.15M | 4.88M | 585M | 4.60B | 34.2B | 76.9B | 1.11T | 254B | 1.77T | 16.3Qa | 5.77Qi |
| nostair | 2.01M | 6.54M | 146M | 5.88B | 13.0B | 72.7B | 85.9B | 2.75T | 192Qa | 42.0Qi | 9.21Sx |
| optimal | 1.98M | 19.0M | 1.02B | 30.3B | 5.55B | 126B | 157B | 338T | 232Qa | 143Qi | 9.68Sx |
| casual | 392K | 5.43M | 9.07M | 237M | 4.04B | 13.5B | 4.87B | 27.1B | 61.8B | 71.5B | 105T |
| idle | 11.3K | 27.4K | 65.3K | 232K | 411K | 1.95M | 3.51M | 3.71M | 4.08M | 1.50M | 12.6M |
| authored | 12.6K | 26.7K | 132K | 358K | 2.51M | 5.64M | 6.03M | 2.60M | 10.9M | 374M | 9.31B |
| noclick | 5.82K | 22.0K | 59.4K | 203K | 332K | 991K | 2.76M | 3.99M | 4.09M | 4.54M | 2.30M |

Bosses (first kill):

- **greedy**: The Pyre-Warden 8.6m, The Fenwright 17.2m, The Archivist 36.1m, The Lantern-Warden 1.43h, The Keeper 2.77h, The Renderer 3.91h
- **reckless**: The Pyre-Warden 8.6m, The Fenwright 20.9m, The Archivist 42.9m, The Lantern-Warden 1.68h, The Keeper 3.08h, The Renderer 4.36h
- **nostair**: The Pyre-Warden 8.6m, The Fenwright 17.1m, The Archivist 34.9m, The Lantern-Warden 1.81h, The Keeper 3.13h, The Renderer 4.17h
- **optimal**: The Pyre-Warden 9.4m, The Fenwright 21.5m, The Archivist 41.5m, The Lantern-Warden 1.35h, The Keeper 2.79h, The Renderer 3.83h
- **casual**: The Pyre-Warden 17.7m, The Fenwright 34.3m, The Archivist 1.04h, The Lantern-Warden 2.05h, The Keeper 4.03h, The Renderer 5.50h
- **idle**: The Pyre-Warden 2.34h, The Fenwright 3.11h, The Archivist 5.29h, The Lantern-Warden 9.09h
- **authored**: The Pyre-Warden 2.32h, The Fenwright 2.83h, The Archivist 4.37h, The Lantern-Warden 6.83h, The Keeper 10.50h
- **noclick**: The Pyre-Warden 2.43h, The Fenwright 3.54h, The Archivist 6.20h, The Lantern-Warden 10.24h

Stalls (no progress event for 20+ min):

- **idle** stalled 26.2m from 7.79h at The Sanctum of the Vigil tier 4 (cleared 4), level 89
- **noclick** stalled 22.3m from 9.17h at The Sanctum of the Vigil tier 4 (cleared 4), level 92

Targets: first boss 6–16 min · first Snuff 3–7 h · first Severing 30–60 h · auto-attack by 10 min

<details><summary>Previous runs</summary>

### Run — 2026-09-05 08:08 UTC · 12h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Snuff | Severing | Final L | Deepest | Waking  | Deaths | Stalls | Stair runs (died) | Best floor | Stair pays (× road rate) | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.04h | 8.6m | 8.6m | 17.2m | 1.43h | 3.96h | 407 | 31 | 3 | 14 | 0 | 67 (0) | 10 | 1.02 | 21432 |
| reckless | 3.1m | 10.6m | 8.6m | 8.6m | 20.9m | 1.69h | 5.09h | 260 | 33 | 5 | 32 | 0 | 78 (24) | 40 | 4.96 | 22306 |
| nostair | 3.1m | 1.13h | 8.6m | 8.6m | 17.1m | 1.81h | 4.23h | 372 | 31 | 5 | 17 | 0 | 0 (0) | 0 | 0.00 | 14664 |
| optimal | 3.7m | 3.43h | 9.4m | 9.4m | 21.5m | 1.35h | 3.92h | 379 | 31 | 6 | 3 | 0 | 84 (0) | 14 | 1.91 | 14963 |
| casual | 6.0m | 4.36h | 17.7m | 17.7m | 34.3m | 2.05h | 5.58h | 317 | 31 | 7 | 30 | 0 | 44 (0) | 6 | 1.14 | 17905 |
| idle | 6.0m | — | 2.34h | 2.34h | 3.11h | 9.09h | — | 113 | 22 | 4 | 0 | 1 | 14 (0) | 4 | 0.54 | 6581 |
| noclick | 6.0m | — | 2.43h | 2.43h | 3.54h | 10.24h | — | 63 | 21 | 2 | 0 | 1 | 0 (0) | 0 | 0.00 | 5738 |

Marrow earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.67M | 15.3M | 691M | 21.7B | 384M | 32.7B | 69.8B | 93.9B | 12.4Qa | 45.0Qi | 4.00Sx |
| reckless | 1.15M | 4.88M | 585M | 4.60B | 34.2B | 76.9B | 1.11T | 254B | 1.77T | 16.3Qa | 5.77Qi |
| nostair | 2.01M | 6.54M | 146M | 5.88B | 13.0B | 72.7B | 85.9B | 2.75T | 192Qa | 42.0Qi | 9.21Sx |
| optimal | 1.98M | 19.0M | 1.02B | 30.3B | 5.55B | 126B | 157B | 338T | 232Qa | 143Qi | 9.68Sx |
| casual | 392K | 5.43M | 9.07M | 237M | 4.04B | 13.5B | 4.87B | 27.1B | 61.8B | 71.5B | 105T |
| idle | 11.3K | 27.4K | 65.3K | 232K | 411K | 1.95M | 3.51M | 3.71M | 4.08M | 1.50M | 12.6M |
| noclick | 5.82K | 22.0K | 59.4K | 203K | 332K | 991K | 2.76M | 3.99M | 4.09M | 4.54M | 2.30M |

Bosses (first kill):

- **greedy**: The Pyre-Warden 8.6m, The Fenwright 17.2m, The Archivist 36.1m, The Lantern-Warden 1.43h, The Keeper 2.77h, The Renderer 3.91h
- **reckless**: The Pyre-Warden 8.6m, The Fenwright 20.9m, The Archivist 42.9m, The Lantern-Warden 1.68h, The Keeper 3.08h, The Renderer 4.36h
- **nostair**: The Pyre-Warden 8.6m, The Fenwright 17.1m, The Archivist 34.9m, The Lantern-Warden 1.81h, The Keeper 3.13h, The Renderer 4.17h
- **optimal**: The Pyre-Warden 9.4m, The Fenwright 21.5m, The Archivist 41.5m, The Lantern-Warden 1.35h, The Keeper 2.79h, The Renderer 3.83h
- **casual**: The Pyre-Warden 17.7m, The Fenwright 34.3m, The Archivist 1.04h, The Lantern-Warden 2.05h, The Keeper 4.03h, The Renderer 5.50h
- **idle**: The Pyre-Warden 2.34h, The Fenwright 3.11h, The Archivist 5.29h, The Lantern-Warden 9.09h
- **noclick**: The Pyre-Warden 2.43h, The Fenwright 3.54h, The Archivist 6.20h, The Lantern-Warden 10.24h

Stalls (no progress event for 20+ min):

- **idle** stalled 26.2m from 7.79h at The Sanctum of the Vigil tier 4 (cleared 4), level 89
- **noclick** stalled 22.3m from 9.17h at The Sanctum of the Vigil tier 4 (cleared 4), level 92

Targets: first boss 6–16 min · first Snuff 3–7 h · first Severing 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-05 08:02 UTC · 12h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Snuff | Severing | Final L | Deepest | Waking  | Deaths | Stalls | Stair runs (died) | Best floor | A run pays (× road since last) | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 2.90h | 8.6m | 8.6m | 18.5m | 1.10h | 3.20h | 396 | 31 | 7 | 5 | 0 | 68 (0) | 10 | 0.49 | 21559 |
| reckless | 3.1m | — | 8.6m | 8.6m | — | — | — | 18 | 3 | 0 | 0 | 1 | 0 (0) | 53 | 0.00 | 36037 |
| nostair | 3.1m | 1.13h | 8.6m | 8.6m | 17.1m | 1.81h | 4.23h | 372 | 31 | 5 | 17 | 0 | 0 (0) | 0 | 0.00 | 14178 |
| optimal | 3.7m | 2.66h | 9.4m | 9.4m | 20.8m | 1.00h | 3.42h | 406 | 31 | 7 | 1 | 0 | 84 (0) | 14 | 0.86 | 15530 |
| casual | 6.0m | 3.84h | 17.7m | 17.7m | 34.5m | 2.02h | 5.38h | 259 | 31 | 5 | 19 | 0 | 44 (0) | 6 | 0.10 | 17243 |
| idle | 6.0m | — | 2.34h | 2.34h | 3.07h | 8.92h | — | 110 | 21 | 3 | 0 | 1 | 14 (0) | 4 | 0.01 | 6360 |
| noclick | 6.0m | — | 2.43h | 2.43h | 3.54h | 10.24h | — | 63 | 21 | 2 | 0 | 1 | 0 (0) | 0 | 0.00 | 5473 |

Marrow earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 6.66M | 118M | 7.68B | 22.0B | 48.0B | 60.9B | 1.07T | 29.9Qa | 4.68Qi | 1.64Sx | 21.5Sx |
| reckless | 4.31K | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nostair | 2.01M | 6.54M | 146M | 5.88B | 13.0B | 72.7B | 85.9B | 2.75T | 192Qa | 42.0Qi | 9.21Sx |
| optimal | 8.23M | 364M | 51.8B | 90.6B | 57.4B | 208B | 54.4T | 1.02Qi | 760Qi | 18.1Sx | 359Sx |
| casual | 392K | 6.09M | 10.3M | 343M | 5.10B | 12.9B | 13.2B | 20.6B | 78.0B | 1.64T | 11.8Qa |
| idle | 11.3K | 27.4K | 66.9K | 235K | 456K | 2.20M | 3.75M | 3.72M | 4.12M | 1.05M | 10.3M |
| noclick | 5.82K | 22.0K | 59.4K | 203K | 332K | 991K | 2.76M | 3.99M | 4.09M | 4.54M | 2.30M |

Bosses (first kill):

- **greedy**: The Pyre-Warden 8.6m, The Fenwright 18.5m, The Archivist 36.0m, The Lantern-Warden 1.10h, The Keeper 2.22h, The Renderer 4.77h
- **reckless**: The Pyre-Warden 8.6m
- **nostair**: The Pyre-Warden 8.6m, The Fenwright 17.1m, The Archivist 34.9m, The Lantern-Warden 1.81h, The Keeper 3.13h, The Renderer 4.17h
- **optimal**: The Pyre-Warden 9.4m, The Fenwright 20.8m, The Archivist 37.1m, The Lantern-Warden 59.8m, The Keeper 2.05h, The Renderer 3.03h
- **casual**: The Pyre-Warden 17.7m, The Fenwright 34.5m, The Archivist 1.06h, The Lantern-Warden 2.01h, The Keeper 3.98h, The Renderer 5.28h
- **idle**: The Pyre-Warden 2.34h, The Fenwright 3.07h, The Archivist 5.20h, The Lantern-Warden 8.91h
- **noclick**: The Pyre-Warden 2.43h, The Fenwright 3.54h, The Archivist 6.20h, The Lantern-Warden 10.24h

Stalls (no progress event for 20+ min):

- **reckless** stalled 11.86h from 8.6m at The Nadir tier -4 (cleared -1), level 18
- **idle** stalled 26.8m from 7.32h at The Sanctum of the Vigil tier 4 (cleared 4), level 88
- **noclick** stalled 22.3m from 9.17h at The Sanctum of the Vigil tier 4 (cleared 4), level 92

Targets: first boss 6–16 min · first Snuff 3–7 h · first Severing 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-05 07:54 UTC · 12h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Snuff | Severing | Final L | Deepest | Waking  | Deaths | Stalls | Stair runs (died) | Best floor | A run pays (× road since last) | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 2.90h | 8.6m | 8.6m | 18.5m | 1.10h | 3.20h | 396 | 31 | 7 | 5 | 0 | 68 (0) | 10 | 0.00 | 21541 |
| nostair | 3.1m | 1.13h | 8.6m | 8.6m | 17.1m | 1.81h | 4.23h | 372 | 31 | 5 | 17 | 0 | 0 (0) | 0 | 0.00 | 14436 |
| optimal | 3.7m | 2.66h | 9.4m | 9.4m | 20.8m | 1.00h | 3.42h | 406 | 31 | 7 | 1 | 0 | 84 (0) | 14 | 0.00 | 21525 |
| casual | 6.0m | 3.84h | 17.7m | 17.7m | 34.5m | 2.02h | 5.38h | 259 | 31 | 5 | 19 | 0 | 44 (0) | 6 | 0.01 | 18069 |
| idle | 6.0m | — | 2.34h | 2.34h | 3.07h | 8.92h | — | 110 | 21 | 3 | 0 | 1 | 14 (0) | 4 | 0.01 | 6786 |
| noclick | 6.0m | — | 2.43h | 2.43h | 3.54h | 10.24h | — | 63 | 21 | 2 | 0 | 1 | 0 (0) | 0 | 0.00 | 6257 |

Marrow earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 6.66M | 118M | 7.68B | 22.0B | 48.0B | 60.9B | 1.07T | 29.9Qa | 4.68Qi | 1.64Sx | 21.5Sx |
| nostair | 2.01M | 6.54M | 146M | 5.88B | 13.0B | 72.7B | 85.9B | 2.75T | 192Qa | 42.0Qi | 9.21Sx |
| optimal | 8.23M | 364M | 51.8B | 90.6B | 57.4B | 208B | 54.4T | 1.02Qi | 760Qi | 18.1Sx | 359Sx |
| casual | 392K | 6.09M | 10.3M | 343M | 5.10B | 12.9B | 13.2B | 20.6B | 78.0B | 1.64T | 11.8Qa |
| idle | 11.3K | 27.4K | 66.9K | 235K | 456K | 2.20M | 3.75M | 3.72M | 4.12M | 1.05M | 10.3M |
| noclick | 5.82K | 22.0K | 59.4K | 203K | 332K | 991K | 2.76M | 3.99M | 4.09M | 4.54M | 2.30M |

Bosses (first kill):

- **greedy**: The Pyre-Warden 8.6m, The Fenwright 18.5m, The Archivist 36.0m, The Lantern-Warden 1.10h, The Keeper 2.22h, The Renderer 4.77h
- **nostair**: The Pyre-Warden 8.6m, The Fenwright 17.1m, The Archivist 34.9m, The Lantern-Warden 1.81h, The Keeper 3.13h, The Renderer 4.17h
- **optimal**: The Pyre-Warden 9.4m, The Fenwright 20.8m, The Archivist 37.1m, The Lantern-Warden 59.8m, The Keeper 2.05h, The Renderer 3.03h
- **casual**: The Pyre-Warden 17.7m, The Fenwright 34.5m, The Archivist 1.06h, The Lantern-Warden 2.01h, The Keeper 3.98h, The Renderer 5.28h
- **idle**: The Pyre-Warden 2.34h, The Fenwright 3.07h, The Archivist 5.20h, The Lantern-Warden 8.91h
- **noclick**: The Pyre-Warden 2.43h, The Fenwright 3.54h, The Archivist 6.20h, The Lantern-Warden 10.24h

Stalls (no progress event for 20+ min):

- **idle** stalled 26.8m from 7.32h at The Sanctum of the Vigil tier 4 (cleared 4), level 88
- **noclick** stalled 22.3m from 9.17h at The Sanctum of the Vigil tier 4 (cleared 4), level 92

Targets: first boss 6–16 min · first Snuff 3–7 h · first Severing 30–60 h · auto-attack by 10 min
</details>
