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

## Latest simulator run

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

<details><summary>Previous runs</summary>

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

---

### Run — 2026-09-04 12:20 UTC · 40h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 28.1m | 8.6m | 8.6m | 34.9m | 1.06h | — | 178 | 31 | 14 | 293 | 16 | 49842 |
| optimal | 3.7m | 1.30h | 9.4m | 9.4m | 19.7m | 41.0m | — | 204 | 31 | 16 | 212 | 5 | 47909 |
| casual | 6.0m | 7.07h | 17.7m | 17.7m | 44.5m | 1.88h | — | 196 | 31 | 12 | 189 | 21 | 46380 |
| idle | 6.0m | 32.5m | 1.88h | 1.88h | 17.75h | 19.82h | — | 161 | 27 | 7 | 472 | 0 | 16978 |
| noclick | 6.0m | 2.5m | 2.01h | 2.01h | 18.00h | 20.22h | — | 73 | 21 | 4 | 472 | 1 | 16472 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 485K | 1.34M | 5.65M | 71.7M | 1.30B | 2.91B | 4.42B | 28.9B | 48.2B | 72.5B | 105B | 107B |
| optimal | 462K | 1.59M | 14.5M | 219M | 2.59B | 2.71B | 34.5B | 48.5B | 56.0B | 86.9B | 64.4B | 99.7B |
| casual | 259K | 1.53M | 1.48M | 4.87M | 16.0M | 129M | 666M | 2.81B | 6.52B | 28.6B | 45.0B | 59.8B |
| idle | 12.2K | 12.2K | 74.3K | 56.0K | 64.9K | 75.7K | 87.2K | 98.7K | 110K | 124K | 133K | 144K |
| noclick | 9.52K | 7.40K | 58.2K | 64.4K | 62.5K | 74.1K | 84.4K | 95.6K | 106K | 120K | 131K | 142K |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 34.9m, Archivist Null 1.05h, Saint Orvane 3.97h, The Keeper 4.77h, The Lord of Cinders 8.24h
- **optimal**: Eskel 9.4m, Mother Nettle 19.7m, Archivist Null 40.6m, Saint Orvane 3.56h, The Keeper 4.26h, The Lord of Cinders 6.77h
- **casual**: Eskel 17.7m, Mother Nettle 44.5m, Archivist Null 1.88h, Saint Orvane 5.96h, The Keeper 6.73h, The Lord of Cinders 9.78h
- **idle**: Eskel 1.88h, Mother Nettle 17.75h, Archivist Null 19.81h, Saint Orvane 35.85h, The Keeper 38.25h
- **noclick**: Eskel 2.01h, Mother Nettle 18.00h, Archivist Null 20.22h, Saint Orvane 39.51h

Stalls (no progress event for 20+ min):

- **greedy** stalled 21.0m from 22.62h at The Kiln of the First Flame tier 5 (cleared 5), level 196
- **greedy** stalled 23.5m from 23.88h at The Kiln of the First Flame tier 5 (cleared 5), level 199
- **greedy** stalled 27.5m from 24.27h at The Kiln of the First Flame tier 5 (cleared 5), level 200
- **greedy** stalled 20.4m from 24.73h at The Kiln of the First Flame tier 5 (cleared 5), level 201
- **greedy** stalled 30.8m from 25.07h at The Kiln of the First Flame tier 5 (cleared 5), level 202
- **greedy** stalled 26.6m from 25.58h at The Kiln of the First Flame tier 5 (cleared 5), level 203
- **greedy** stalled 34.5m from 26.02h at The Kiln of the First Flame tier 5 (cleared 5), level 204
- **greedy** stalled 32.7m from 26.60h at The Kiln of the First Flame tier 5 (cleared 5), level 205
- **greedy** stalled 42.6m from 27.14h at The Kiln of the First Flame tier 5 (cleared 5), level 206
- **greedy** stalled 26.9m from 27.85h at The Kiln of the First Flame tier 5 (cleared 5), level 207
- **greedy** stalled 39.2m from 28.38h at The Kiln of the First Flame tier 5 (cleared 5), level 208
- **greedy** stalled 23.4m from 35.93h at The Kiln of the First Flame tier 5 (cleared 5), level 199
- **greedy** stalled 26.5m from 36.32h at The Kiln of the First Flame tier 5 (cleared 5), level 200
- **greedy** stalled 20.1m from 36.76h at The Kiln of the First Flame tier 5 (cleared 5), level 201
- **greedy** stalled 24.5m from 37.65h at The Kiln of the First Flame tier 5 (cleared 5), level 203
- **greedy** stalled 31.7m from 38.05h at The Kiln of the First Flame tier 5 (cleared 5), level 204
- **optimal** stalled 25.5m from 30.53h at The Kiln of the First Flame tier 5 (cleared 5), level 198
- **optimal** stalled 22.4m from 30.96h at The Kiln of the First Flame tier 5 (cleared 5), level 199
- **optimal** stalled 20.8m from 37.88h at The Kiln of the First Flame tier 4 (cleared 5), level 199
- **optimal** stalled 23.6m from 38.72h at The Kiln of the First Flame tier 5 (cleared 5), level 201
- **optimal** stalled 29.3m from 39.11h at The Kiln of the First Flame tier 5 (cleared 5), level 202
- **casual** stalled 23.4m from 17.90h at The Kiln of the First Flame tier 5 (cleared 5), level 190
- **casual** stalled 20.4m from 18.29h at The Kiln of the First Flame tier 5 (cleared 5), level 191
- **casual** stalled 24.7m from 18.63h at The Kiln of the First Flame tier 5 (cleared 5), level 192
- **casual** stalled 23.5m from 24.46h at The Kiln of the First Flame tier 5 (cleared 5), level 192
- **casual** stalled 21.9m from 24.86h at The Kiln of the First Flame tier 5 (cleared 5), level 193
- **casual** stalled 26.3m from 25.22h at The Kiln of the First Flame tier 5 (cleared 5), level 194
- **casual** stalled 30.1m from 25.97h at The Kiln of the First Flame tier 5 (cleared 5), level 196
- **casual** stalled 23.9m from 26.47h at The Kiln of the First Flame tier 5 (cleared 5), level 197
- **casual** stalled 35.7m from 26.87h at The Kiln of the First Flame tier 5 (cleared 5), level 198
- **casual** stalled 32.9m from 27.47h at The Kiln of the First Flame tier 5 (cleared 5), level 199
- **casual** stalled 36.8m from 28.01h at The Kiln of the First Flame tier 5 (cleared 5), level 200
- **casual** stalled 25.7m from 28.63h at The Kiln of the First Flame tier 5 (cleared 5), level 201
- **casual** stalled 41.7m from 29.06h at The Kiln of the First Flame tier 5 (cleared 5), level 202
- **casual** stalled 33.5m from 29.75h at The Kiln of the First Flame tier 5 (cleared 5), level 203
- **casual** stalled 45.4m from 30.31h at The Kiln of the First Flame tier 5 (cleared 5), level 204
- **casual** stalled 44.1m from 31.06h at The Kiln of the First Flame tier 5 (cleared 5), level 205
- **casual** stalled 56.4m from 31.80h at The Kiln of the First Flame tier 5 (cleared 5), level 206
- **casual** stalled 36.6m from 32.74h at The Kiln of the First Flame tier 5 (cleared 5), level 207
- **casual** stalled 21.6m from 38.38h at The Kiln of the First Flame tier 5 (cleared 5), level 192
- **casual** stalled 21.1m from 38.74h at The Kiln of the First Flame tier 5 (cleared 5), level 193
- **casual** stalled 24.5m from 39.09h at The Kiln of the First Flame tier 5 (cleared 5), level 194
- **noclick** stalled 24.3m from 35.69h at The Drowned Mire tier -1 (cleared 4), level 92

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min
</details>
