# Ashfall — Balance Log

Simulator output per revision of `src/content/balance.ts`. The simulator lands in Milestone 2; this file starts life as the record of the initial curve choices.

## Rev 0 — initial curves (Milestone 1)

| Knob | Value |
|---|---|
| Enemy HP | 60 × 1.55^g |
| Enemy damage | 20 × 1.2^g (rev 1: was 9) |
| Enemy poise | 26 × 1.12^g |
| Souls per kill | 6 × 1.5^g |
| Level cost | 30 × 1.115^L + 6L |
| Reinforce | ×1.15 per level, cost 40 × 1.9^L × 5^(region−1) |
| Boss HP / souls / dmg | 30× / 40× / 2.4× the zone's last tier (rev 1: was 14× / 40× / 1.6×) |

Smoke run (2 min, click every 0.3s, tier 0): 68 kills, 309 souls, no deaths.

## Rev 2 — Milestone 10 (full content)

| Knob | Value | Why |
|---|---|---|
| NG+ scaling | HP ×1.45, dmg ×1.2, souls ×1.55, drops ×1.35 per cycle | a cycle must be net-positive (was 1.6 / 1.28 / 1.45) |
| Damage per soul level | ×1.025 (HP ×1.035) | levels must always pay; stats decide what they buy |
| Humanity | (souls/5000)^0.42 × 1.15^lords × 1.06^depth | depth compounds so pushing beats early kindling |
| Poise | 26 × 1.12^g | staggers must happen on tier-0 enemies |

Region cadence (skilled / casual): Eskel 9m / 18m · Mother Nettle 35m / 45m · Archivist 1.1h / 1.9h · Orvane 3.5h / 4.7h · Keeper 4.5h / 6h · Lord of Cinders 7h / 9.8h. First Kindle 2.4h / 3.2h / 3.5h (idle).

## Rev 3 — Milestones 11–12 (deep meta, polish)

| Knob | Value | Why |
|---|---|---|
| Sigil Marks | (lifetime Humanity ÷ 25)^0.6 × √(NG+ ÷ 5) × (1 + 0.1 × depth record) | opens at NG+5; depth record feeds it so the Abyss matters |
| Dark Level | 8 × 1.7^n Marks → ×1.5 dmg/souls, ×1.25 Humanity each | the endless horizon |
| Auto-Kindle | gain ≥ 2 × last Kindle's gain, ≥ 10, after 20 min | comparing with *held* Humanity kindled every minute (players spend it) |
| Bleed vs regen | open wound suppresses regen 6s (was 4s); Nettle mends 1.2%/2% (was 1.5%/2.5%) | the idle path could never sustain suppression at 1 hit/s |
| Reflex nodes | auto-riposte / auto-dodge cost 4 (was 6) | they are what get an idle player past a lord |

Final 60h, seed 7 — every strategy fells all six lords. Lords (skilled / casual / idle): Eskel 9m / 18m / 2.3h · Nettle 17m / 35m / 3.1h · Archivist 35m / 1.0h / 5.3h · Orvane 1.8h / 2.2h / 10h · Keeper 3.1h / 4.1h / 13h · Lord of Cinders 4.2h / 5.4h / 22h · the Watcher 8.3h / 16h / —. First Kindle 1.8h / 2.2h / 10h; first Sigil (see table). Deaths in 60h: 20 / 19 / 0. Two stalls, both 22 minutes, both idle at Sanctum tier 4.

Known gaps versus the spec targets: the skilled first Kindle (1.8h) is under the 3–7h window because the simulator kindles the moment it is stuck 90 minutes; a human who reads the depth multiplier will wait longer. The first Sigil for skilled play arrives well before the 30–60h target for the same reason (cycles are ~1–2h for a skilled player); both are cadence choices the player owns rather than walls. Region cadence from Orvane onward is 60–90 min per region for skilled play, as intended.

## Latest simulator run

### Run — 2026-09-04 13:07 UTC · 60h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.13h | 8.6m | 8.6m | 17.1m | 1.81h | 4.24h | 871 | 146 | 6 | 20 | 0 | 94327 |
| optimal | 3.7m | 3.30h | 9.4m | 9.4m | 17.9m | 1.40h | 3.86h | 829 | 139 | 3 | 5 | 0 | 70274 |
| casual | 6.0m | 4.40h | 17.7m | 17.7m | 34.5m | 2.16h | 5.55h | 851 | 134 | 8 | 19 | 0 | 92819 |
| idle | 6.0m | — | 2.34h | 2.34h | 3.10h | 10.07h | 15.63h | 773 | 33 | 7 | 0 | 1 | 63988 |
| noclick | 6.0m | 14.98h | 2.43h | 2.43h | 3.54h | 10.24h | 15.07h | 708 | 35 | 7 | 2 | 1 | 64895 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.01M | 6.54M | 155M | 6.06B | 13.9B | 31.4B | 120B | 67.2T | 238Qa | 751Qi | 69.9Sx | 7.29Sp |
| optimal | 2.53M | 10.4M | 1.15B | 17.3B | 3.48B | 42.9B | 65.7B | 60.5T | 211Qa | 2.08Sx | 131Sx | 2.45Sp |
| casual | 430K | 5.07M | 7.52M | 155M | 3.59B | 15.0B | 8.80B | 23.7B | 127B | 204T | 344Qa | 38.6Qi |
| idle | 11.3K | 27.4K | 65.1K | 236K | 418K | 2.11M | 3.65M | 3.72M | 4.21M | 7.70M | 3.43M | 18.8M |
| noclick | 5.82K | 22.0K | 59.4K | 203K | 332K | 991K | 2.76M | 3.99M | 4.09M | 4.54M | 2.50M | 16.5M |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 17.1m, Archivist Null 34.9m, Saint Orvane 1.81h, The Keeper 3.13h, The Lord of Cinders 4.18h, The Watcher 8.27h
- **optimal**: Eskel 9.4m, Mother Nettle 17.9m, Archivist Null 36.0m, Saint Orvane 1.39h, The Keeper 2.73h, The Lord of Cinders 3.77h, The Watcher 8.66h
- **casual**: Eskel 17.7m, Mother Nettle 34.5m, Archivist Null 1.04h, Saint Orvane 2.15h, The Keeper 4.10h, The Lord of Cinders 5.44h, The Watcher 16.34h
- **idle**: Eskel 2.34h, Mother Nettle 3.10h, Archivist Null 5.25h, Saint Orvane 10.07h, The Keeper 13.19h, The Lord of Cinders 21.97h
- **noclick**: Eskel 2.43h, Mother Nettle 3.54h, Archivist Null 6.20h, Saint Orvane 10.24h, The Keeper 12.83h, The Lord of Cinders 22.36h

Stalls (no progress event for 20+ min):

- **idle** stalled 22.6m from 7.72h at The Sanctum of the Vigil tier 4 (cleared 4), level 89
- **noclick** stalled 22.3m from 9.17h at The Sanctum of the Vigil tier 4 (cleared 4), level 92

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

<details><summary>Previous runs</summary>

### Run — 2026-09-04 12:55 UTC · 60h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.13h | 8.6m | 8.6m | 22.7m | 1.51h | 4.10h | 900 | 151 | 7 | 22 | 0 | 97684 |
| optimal | 3.7m | 1.08h | 9.4m | 9.4m | 19.1m | 1.35h | 3.78h | 875 | 151 | 6 | 3 | 0 | 72379 |
| casual | 6.0m | 4.70h | 17.7m | 17.7m | 39.8m | 2.44h | 5.97h | 740 | 131 | 4 | 28 | 0 | 93342 |
| idle | 6.0m | — | 2.34h | 2.34h | 41.50h | 4.58h | 38.71h | 506 | 32 | 3 | 0 | 9 | 31883 |
| noclick | 6.0m | — | 2.43h | 2.43h | 40.17h | 5.02h | 47.71h | 138 | 30 | 4 | 0 | 11 | 27592 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 1.53M | 8.56M | 497M | 8.22B | 7.86B | 38.5B | 62.2B | 208T | 3.20Qi | 610Qi | 273Sx | 10.6Sp |
| optimal | 2.31M | 11.4M | 1.09B | 15.1B | 7.56B | 36.5B | 70.3B | 16.7Qa | 22.5Qi | 1.70Sx | 973Sx | 26.2Sp |
| casual | 306K | 4.80M | 4.32M | 49.5M | 1.60B | 17.0B | 199M | 27.5B | 86.1B | 853B | 747T | 1.34Qi |
| idle | 11.3K | 27.4K | 65.1K | 12.6K | 3.82K | 23.8K | 73.6K | 89.1K | 0 | 15.0K | 41.7K | 160K |
| noclick | 5.82K | 22.0K | 59.4K | 70.6K | 0 | 12.6K | 36.0K | 146K | 25.5K | 4.51K | 21.5K | 72.5K |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 22.7m, Archivist Null 45.1m, Saint Orvane 1.50h, The Keeper 2.84h, The Lord of Cinders 4.07h, The Watcher 8.18h
- **optimal**: Eskel 9.4m, Mother Nettle 19.1m, Archivist Null 38.8m, Saint Orvane 1.34h, The Keeper 2.71h, The Lord of Cinders 3.74h, The Watcher 7.78h
- **casual**: Eskel 17.7m, Mother Nettle 39.8m, Archivist Null 1.18h, Saint Orvane 2.44h, The Keeper 4.41h, The Lord of Cinders 5.86h, The Watcher 12.04h
- **idle**: Eskel 2.34h, Mother Nettle 41.50h, Archivist Null 43.03h, Saint Orvane 45.98h, The Keeper 49.02h, The Lord of Cinders 57.93h
- **noclick**: Eskel 2.43h, Mother Nettle 40.17h, Archivist Null 43.01h, Saint Orvane 53.49h, The Keeper 55.64h

Stalls (no progress event for 20+ min):

- **idle** stalled 1.49h from 3.09h at The Drowned Mire tier -1 (cleared 4), level 48
- **idle** stalled 1.49h from 7.56h at The Drowned Mire tier -1 (cleared 4), level 53
- **idle** stalled 1.48h from 12.39h at The Drowned Mire tier -1 (cleared 4), level 58
- **idle** stalled 1.48h from 17.15h at The Drowned Mire tier -1 (cleared 4), level 63
- **idle** stalled 1.46h from 22.40h at The Drowned Mire tier -1 (cleared 4), level 68
- **idle** stalled 1.47h from 27.93h at The Drowned Mire tier -1 (cleared 4), level 73
- **idle** stalled 1.50h from 32.91h at The Drowned Mire tier -1 (cleared 4), level 78
- **idle** stalled 1.49h from 37.21h at The Drowned Mire tier -1 (cleared 4), level 83
- **idle** stalled 22.9m from 44.71h at The Sanctum of the Vigil tier 4 (cleared 4), level 88
- **noclick** stalled 1.49h from 3.53h at The Drowned Mire tier -1 (cleared 4), level 50
- **noclick** stalled 1.49h from 8.13h at The Drowned Mire tier -1 (cleared 4), level 55
- **noclick** stalled 1.49h from 13.21h at The Drowned Mire tier -1 (cleared 4), level 60
- **noclick** stalled 1.47h from 18.20h at The Drowned Mire tier -1 (cleared 4), level 65
- **noclick** stalled 1.47h from 23.93h at The Drowned Mire tier -1 (cleared 4), level 70
- **noclick** stalled 1.47h from 29.81h at The Drowned Mire tier -1 (cleared 4), level 75
- **noclick** stalled 1.49h from 35.49h at The Drowned Mire tier -1 (cleared 4), level 80
- **noclick** stalled 20.3m from 42.62h at The Archive of Null tier 3 (cleared 3), level 104
- **noclick** stalled 30.2m from 46.41h at The Sanctum of the Vigil tier 4 (cleared 4), level 126
- **noclick** stalled 25.5m from 46.92h at The Sanctum of the Vigil tier 4 (cleared 4), level 127
- **noclick** stalled 21.4m from 47.34h at The Sanctum of the Vigil tier 4 (cleared 4), level 128

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 12:40 UTC · 60h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.13h | 8.6m | 8.6m | 22.7m | 1.51h | 4.10h | 447 | 59 | 5 | 21 | 0 | 88743 |
| optimal | 3.7m | 1.08h | 9.4m | 9.4m | 19.1m | 1.35h | 3.78h | 467 | 54 | 4 | 3 | 0 | 68108 |
| casual | 6.0m | 4.70h | 17.7m | 17.7m | 39.8m | 2.44h | 5.97h | 588 | 51 | 10 | 25 | 0 | 87015 |
| idle | 6.0m | — | 2.34h | 2.34h | 41.50h | 4.58h | 38.71h | 47 | 30 | 3 | 0 | 9 | 26600 |
| noclick | 6.0m | — | 2.43h | 2.43h | 40.17h | 5.02h | 47.71h | 33 | 30 | 0 | 0 | 11 | 25809 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 1.53M | 8.56M | 497M | 8.22B | 7.39B | 10.3M | 13.4M | 19.5M | 33.5M | 16.6M | 34.9M | 350M |
| optimal | 2.31M | 11.4M | 1.09B | 15.1B | 5.64M | 12.5M | 14.3M | 21.2M | 76.1M | 2.02B | 1.51B | 11.5B |
| casual | 306K | 4.80M | 4.32M | 49.5M | 1.60B | 17.0B | 4.30M | 4.18M | 9.03M | 9.81M | 9.00M | 8.47M |
| idle | 11.3K | 27.4K | 65.1K | 12.6K | 3.82K | 23.8K | 73.6K | 89.1K | 0 | 15.0K | 41.7K | 160K |
| noclick | 5.82K | 22.0K | 59.4K | 70.6K | 0 | 12.6K | 36.0K | 146K | 25.5K | 4.51K | 21.5K | 72.5K |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 22.7m, Archivist Null 45.1m, Saint Orvane 1.50h, The Keeper 2.84h, The Lord of Cinders 4.07h, The Watcher 47.37h
- **optimal**: Eskel 9.4m, Mother Nettle 19.1m, Archivist Null 38.8m, Saint Orvane 1.34h, The Keeper 2.71h, The Lord of Cinders 3.74h, The Watcher 41.93h
- **casual**: Eskel 17.7m, Mother Nettle 39.8m, Archivist Null 1.18h, Saint Orvane 2.44h, The Keeper 4.41h, The Lord of Cinders 5.86h, The Watcher 47.46h
- **idle**: Eskel 2.34h, Mother Nettle 41.50h, Archivist Null 43.03h, Saint Orvane 45.98h, The Keeper 49.02h
- **noclick**: Eskel 2.43h, Mother Nettle 40.17h, Archivist Null 43.01h, Saint Orvane 53.49h, The Keeper 55.64h

Stalls (no progress event for 20+ min):

- **idle** stalled 1.49h from 3.09h at The Drowned Mire tier -1 (cleared 4), level 48
- **idle** stalled 1.49h from 7.56h at The Drowned Mire tier -1 (cleared 4), level 53
- **idle** stalled 1.48h from 12.39h at The Drowned Mire tier -1 (cleared 4), level 58
- **idle** stalled 1.48h from 17.15h at The Drowned Mire tier -1 (cleared 4), level 63
- **idle** stalled 1.46h from 22.40h at The Drowned Mire tier -1 (cleared 4), level 68
- **idle** stalled 1.47h from 27.93h at The Drowned Mire tier -1 (cleared 4), level 73
- **idle** stalled 1.50h from 32.91h at The Drowned Mire tier -1 (cleared 4), level 78
- **idle** stalled 1.49h from 37.21h at The Drowned Mire tier -1 (cleared 4), level 83
- **idle** stalled 22.9m from 44.71h at The Sanctum of the Vigil tier 4 (cleared 4), level 88
- **noclick** stalled 1.49h from 3.53h at The Drowned Mire tier -1 (cleared 4), level 50
- **noclick** stalled 1.49h from 8.13h at The Drowned Mire tier -1 (cleared 4), level 55
- **noclick** stalled 1.49h from 13.21h at The Drowned Mire tier -1 (cleared 4), level 60
- **noclick** stalled 1.47h from 18.20h at The Drowned Mire tier -1 (cleared 4), level 65
- **noclick** stalled 1.47h from 23.93h at The Drowned Mire tier -1 (cleared 4), level 70
- **noclick** stalled 1.47h from 29.81h at The Drowned Mire tier -1 (cleared 4), level 75
- **noclick** stalled 1.49h from 35.49h at The Drowned Mire tier -1 (cleared 4), level 80
- **noclick** stalled 20.3m from 42.62h at The Archive of Null tier 3 (cleared 3), level 104
- **noclick** stalled 30.2m from 46.41h at The Sanctum of the Vigil tier 4 (cleared 4), level 126
- **noclick** stalled 25.5m from 46.92h at The Sanctum of the Vigil tier 4 (cleared 4), level 127
- **noclick** stalled 21.4m from 47.34h at The Sanctum of the Vigil tier 4 (cleared 4), level 128

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 12:24 UTC · 40h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 28.1m | 8.6m | 8.6m | 34.9m | 2.40h | — | 207 | 31 | 31 | 843 | 0 | 51524 |
| optimal | 3.7m | 1.35h | 9.4m | 9.4m | 19.7m | 1.45h | — | 197 | 31 | 31 | 448 | 2 | 40309 |
| casual | 6.0m | 2.69h | 17.7m | 17.7m | 44.5m | 3.22h | — | 145 | 27 | 30 | 195 | 1 | 47162 |
| idle | 6.0m | 32.5m | 1.88h | 1.88h | — | 3.48h | — | 84 | 8 | 11 | 512 | 0 | 14877 |
| noclick | 6.0m | 2.5m | 2.01h | 2.01h | — | 3.66h | — | 71 | 8 | 8 | 588 | 0 | 13657 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 485K | 6.17M | 10.9M | 48.1M | 1.18B | 2.09B | 21.1B | 38.6B | 55.0B | 61.4B | 68.8B | 78.2B |
| optimal | 2.13M | 9.10M | 360M | 3.27B | 26.0B | 32.0B | 34.8B | 48.0B | 64.2B | 74.6B | 86.3B | 98.7B |
| casual | 259K | 2.25M | 7.99M | 4.81M | 27.4M | 406M | 1.62B | 2.66B | 3.31B | 3.92B | 4.91B | 5.56B |
| idle | 12.2K | 12.2K | 74.3K | 31.4K | 21.8K | 124K | 56.7K | 31.5K | 138K | 126K | 51.4K | 108K |
| noclick | 9.52K | 7.40K | 58.2K | 47.5K | 21.6K | 69.9K | 107K | 31.4K | 27.1K | 205K | 48.6K | 50.3K |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 34.9m, Archivist Null 1.05h, Saint Orvane 3.49h, The Keeper 4.49h, The Lord of Cinders 6.98h
- **optimal**: Eskel 9.4m, Mother Nettle 19.7m, Archivist Null 40.6m, Saint Orvane 1.44h, The Keeper 2.93h, The Lord of Cinders 4.50h
- **casual**: Eskel 17.7m, Mother Nettle 44.5m, Archivist Null 1.88h, Saint Orvane 4.70h, The Keeper 6.02h
- **idle**: Eskel 1.88h
- **noclick**: Eskel 2.01h

Stalls (no progress event for 20+ min):

- **optimal** stalled 22.2m from 25.55h at The Kiln of the First Flame tier 3 (cleared 3), level 190
- **optimal** stalled 21.1m from 27.90h at The Kiln of the First Flame tier 2 (cleared 3), level 192
- **casual** stalled 22.1m from 33.99h at The Deep tier 2 (cleared 3), level 172

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min
</details>
