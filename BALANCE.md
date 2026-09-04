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

<details><summary>Previous runs</summary>

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

---

### Run — 2026-09-04 12:08 UTC · 40h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.1m | 1.71h | 8.6m | 8.6m | 48.9m | 23.0m | — | 212 | 31 | 15 | 297 | 7 | 48817 |
| casual | 6.0m | 4.31h | 17.7m | 17.7m | 2.18h | 35.5m | — | 180 | 31 | 15 | 256 | 18 | 47395 |
| idle | 6.0m | 32.5m | 1.88h | 1.88h | 18.53h | 2.61h | — | 101 | 13 | 5 | 627 | 0 | 15207 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 173K | 1.20M | 6.73M | 105M | 2.16B | 5.21B | 10.1B | 14.1B | 12.1B | 18.2B | 21.4B | 58.2B |
| casual | 71.1K | 316K | 682K | 1.74M | 7.71M | 88.1M | 984M | 4.58B | 5.77B | 8.79B | 10.1B | 7.49B |
| idle | 12.2K | 12.2K | 33.6K | 16.7K | 56.8K | 35.9K | 26.0K | 180K | 184K | 57.1K | 50.0K | 47.3K |

Bosses (first kill):

- **greedy**: Eskel 8.6m, Mother Nettle 48.9m, Archivist Null 2.67h, Saint Orvane 3.97h, The Keeper 4.72h, The Lord of Cinders 12.58h
- **casual**: Eskel 17.7m, Mother Nettle 2.18h, Archivist Null 4.41h, Saint Orvane 6.01h, The Keeper 6.91h, The Lord of Cinders 17.67h
- **idle**: Eskel 1.88h, Mother Nettle 18.53h

Stalls (no progress event for 20+ min):

- **greedy** stalled 27.4m from 34.17h at The Kiln of the First Flame tier 5 (cleared 5), level 202
- **greedy** stalled 28.9m from 35.09h at The Kiln of the First Flame tier 5 (cleared 5), level 204
- **greedy** stalled 27.0m from 35.57h at The Kiln of the First Flame tier 5 (cleared 5), level 205
- **greedy** stalled 35.9m from 36.02h at The Kiln of the First Flame tier 5 (cleared 5), level 206
- **greedy** stalled 28.6m from 37.75h at The Kiln of the First Flame tier 5 (cleared 5), level 209
- **greedy** stalled 26.1m from 38.34h at The Kiln of the First Flame tier 5 (cleared 5), level 210
- **greedy** stalled 38.0m from 39.11h at The Kiln of the First Flame tier 5 (cleared 5), level 211
- **casual** stalled 21.2m from 14.96h at The Deep tier 5 (cleared 5), level 167
- **casual** stalled 20.9m from 22.63h at The Kiln of the First Flame tier 5 (cleared 5), level 192
- **casual** stalled 22.0m from 23.29h at The Kiln of the First Flame tier 5 (cleared 5), level 194
- **casual** stalled 21.8m from 23.99h at The Kiln of the First Flame tier 5 (cleared 5), level 196
- **casual** stalled 25.2m from 28.81h at The Kiln of the First Flame tier 5 (cleared 5), level 191
- **casual** stalled 20.9m from 29.43h at The Kiln of the First Flame tier 5 (cleared 5), level 193
- **casual** stalled 23.7m from 30.36h at The Kiln of the First Flame tier 5 (cleared 5), level 196
- **casual** stalled 21.8m from 31.62h at The Kiln of the First Flame tier 5 (cleared 5), level 199
- **casual** stalled 29.4m from 32.04h at The Kiln of the First Flame tier 5 (cleared 5), level 200
- **casual** stalled 22.0m from 32.53h at The Kiln of the First Flame tier 5 (cleared 5), level 201
- **casual** stalled 33.7m from 32.90h at The Kiln of the First Flame tier 5 (cleared 5), level 202
- **casual** stalled 27.6m from 33.46h at The Kiln of the First Flame tier 5 (cleared 5), level 203
- **casual** stalled 39.3m from 33.92h at The Kiln of the First Flame tier 5 (cleared 5), level 204
- **casual** stalled 34.9m from 34.57h at The Kiln of the First Flame tier 5 (cleared 5), level 205
- **casual** stalled 45.7m from 35.16h at The Kiln of the First Flame tier 5 (cleared 5), level 206
- **casual** stalled 31.1m from 35.92h at The Kiln of the First Flame tier 5 (cleared 5), level 207
- **casual** stalled 46.5m from 36.44h at The Kiln of the First Flame tier 5 (cleared 5), level 208
- **casual** stalled 38.2m from 37.21h at The Kiln of the First Flame tier 5 (cleared 5), level 209

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 12:04 UTC · 40h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | 9.7m | 12.2m | 12.2m | 7.83h | 30.5m | — | 162 | 26 | 11 | 27 | 15 | 32535 |
| casual | 6.0m | 32.20h | 24.8m | 24.8m | 11.87h | 46.5m | — | 140 | 19 | 9 | 2 | 14 | 30127 |
| idle | 6.0m | 26.6m | 4.75h | 4.75h | — | 5.03h | — | 77 | 7 | 3 | 549 | 0 | 11349 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 | h7 | h8 | h9 | h10 | h11 | h12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 128K | 313K | 379K | 695K | 916K | 881K | 2.08M | 3.28M | 1.47M | 2.32M | 3.06M | 3.56M |
| casual | 56.0K | 108K | 356K | 237K | 636K | 748K | 780K | 452K | 1.39M | 1.91M | 2.45M | 2.36M |
| idle | 10.5K | 6.64K | 8.30K | 10.2K | 17.3K | 13.8K | 15.3K | 21.0K | 26.6K | 32.6K | 39.1K | 24.6K |

Bosses (first kill):

- **greedy**: Eskel 12.2m, Mother Nettle 7.83h, Archivist Null 24.26h, Saint Orvane 29.91h, The Keeper 31.93h
- **casual**: Eskel 24.8m, Mother Nettle 11.87h, Archivist Null 27.34h
- **idle**: Eskel 4.75h

Stalls (no progress event for 20+ min):

- **greedy** stalled 21.7m from 11.87h at The Drowned Mire tier 4 (cleared 4), level 90
- **greedy** stalled 22.6m from 12.46h at The Drowned Mire tier 4 (cleared 4), level 92
- **greedy** stalled 25.6m from 13.10h at The Drowned Mire tier 4 (cleared 4), level 94
- **greedy** stalled 29.6m from 13.78h at The Drowned Mire tier 4 (cleared 4), level 96
- **greedy** stalled 24.4m from 14.28h at The Drowned Mire tier 4 (cleared 4), level 97
- **greedy** stalled 32.8m from 14.68h at The Drowned Mire tier 4 (cleared 4), level 98
- **greedy** stalled 24.0m from 15.23h at The Drowned Mire tier 4 (cleared 4), level 99
- **greedy** stalled 23.6m from 20.00h at The Drowned Mire tier 4 (cleared 4), level 94
- **greedy** stalled 25.1m from 20.57h at The Drowned Mire tier 4 (cleared 4), level 96
- **greedy** stalled 30.6m from 21.28h at The Drowned Mire tier 4 (cleared 4), level 98
- **greedy** stalled 35.2m from 22.07h at The Drowned Mire tier 4 (cleared 4), level 100
- **greedy** stalled 37.5m from 22.94h at The Drowned Mire tier 4 (cleared 4), level 102
- **greedy** stalled 22.7m from 23.56h at The Drowned Mire tier 4 (cleared 4), level 103
- **greedy** stalled 22.0m from 28.42h at The Drowned Mire tier 4 (cleared 4), level 102
- **greedy** stalled 21.0m from 28.79h at The Drowned Mire tier 4 (cleared 4), level 103
- **casual** stalled 20.7m from 19.52h at The Drowned Mire tier 4 (cleared 4), level 92
- **casual** stalled 20.3m from 21.03h at The Drowned Mire tier 4 (cleared 4), level 97
- **casual** stalled 33.9m from 21.37h at The Drowned Mire tier 4 (cleared 4), level 98
- **casual** stalled 21.6m from 21.94h at The Drowned Mire tier 4 (cleared 4), level 99
- **casual** stalled 25.1m from 22.30h at The Drowned Mire tier 4 (cleared 4), level 100
- **casual** stalled 30.3m from 22.72h at The Drowned Mire tier 4 (cleared 4), level 101
- **casual** stalled 28.4m from 23.22h at The Drowned Mire tier 4 (cleared 4), level 102
- **casual** stalled 27.3m from 23.70h at The Drowned Mire tier 4 (cleared 4), level 103
- **casual** stalled 20.0m from 26.66h at The Archive of Null tier 4 (cleared 4), level 114
- **casual** stalled 20.3m from 28.78h at The Drowned Mire tier -1 (cleared 4), level 75
- **casual** stalled 21.8m from 29.65h at The Drowned Mire tier -1 (cleared 4), level 81
- **casual** stalled 28.3m from 30.17h at The Drowned Mire tier -1 (cleared 4), level 84
- **casual** stalled 27.1m from 30.82h at The Drowned Mire tier -1 (cleared 4), level 87
- **casual** stalled 22.2m from 31.50h at The Drowned Mire tier -1 (cleared 4), level 90

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min
</details>
