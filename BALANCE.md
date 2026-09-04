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

## Latest simulator run

### Run — 2026-09-04 11:51 UTC · 6h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | 2.56h | 9.6m | — | — | 25.5m | — | 58 | 3 | 8 | 6 | 0 | 2658 |
| optimal | 3.8m | — | 10.7m | — | — | 26.5m | — | 41 | 3 | 10 | 0 | 0 | 2439 |
| casual | 6.0m | 1.69h | 24.8m | — | — | 40.5m | — | 67 | 3 | 4 | 1 | 0 | 1261 |
| idle | 6.0m | 26.6m | 4.75h | — | — | 4.76h | — | 31 | 3 | 1 | 103 | 0 | 1684 |
| noclick | 6.0m | 2.5m | 5.00h | — | — | 5.00h | — | 29 | 3 | 1 | 101 | 0 | 1084 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| greedy | 69.7K | 116K | 169K | 253K | 426K |
| optimal | 70.4K | 147K | 254K | 376K | 545K |
| casual | 33.7K | 62.4K | 98.8K | 163K | 199K |
| idle | 10.5K | 6.64K | 8.30K | 10.2K | 11.4K |
| noclick | 7.06K | 8.02K | 7.87K | 9.53K | 12.4K |

Bosses (first kill):

- **greedy**: Eskel 9.6m
- **optimal**: Eskel 10.7m
- **casual**: Eskel 24.8m
- **idle**: Eskel 4.75h
- **noclick**: Eskel 5.00h

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

<details><summary>Previous runs</summary>

### Run — 2026-09-04 11:50 UTC · 6h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | 1.69h | 9.6m | — | — | 25.5m | — | 36 | 3 | 8 | 17 | 1 | 2609 |
| optimal | 3.8m | 2.80h | 10.7m | — | — | 26.5m | — | 63 | 3 | 9 | 6 | 1 | 1997 |
| casual | 6.0m | — | 21.9m | — | — | 37.5m | — | 41 | 3 | 4 | 0 | 4 | 1624 |
| idle | 6.0m | 26.6m | 4.75h | — | — | 4.76h | — | 31 | 3 | 1 | 103 | 0 | 1703 |
| noclick | 6.0m | 2.5m | 5.00h | — | — | 5.00h | — | 29 | 3 | 1 | 101 | 0 | 1128 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| greedy | 69.7K | 96.0K | 97.9K | 226K | 199K |
| optimal | 70.4K | 147K | 178K | 258K | 212K |
| casual | 32.1K | 65.6K | 1.92K | 1.94K | 43.3K |
| idle | 10.5K | 6.64K | 8.30K | 10.2K | 11.4K |
| noclick | 7.06K | 8.02K | 7.87K | 9.53K | 12.4K |

Bosses (first kill):

- **greedy**: Eskel 9.6m
- **optimal**: Eskel 10.7m
- **casual**: Eskel 21.9m
- **idle**: Eskel 4.75h
- **noclick**: Eskel 5.00h

Stalls (no progress event for 20+ min):

- **greedy** stalled 22.9m from 5.20h at The Cindered Approach tier -1 (cleared 3), level 60
- **optimal** stalled 23.6m from 4.26h at The Cindered Approach tier -1 (cleared 3), level 58
- **casual** stalled 40.2m from 2.00h at The Cindered Approach tier -1 (cleared 3), level 35
- **casual** stalled 53.4m from 2.67h at The Cindered Approach tier -1 (cleared 3), level 36
- **casual** stalled 55.3m from 3.56h at The Cindered Approach tier -1 (cleared 3), level 37
- **casual** stalled 52.0m from 5.13h at The Cindered Approach tier -1 (cleared 3), level 41

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 11:49 UTC · 6h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | 1.69h | 9.6m | — | — | 25.5m | — | 47 | 3 | 6 | 37 | 1 | 2430 |
| optimal | 3.8m | 2.80h | 10.7m | — | — | 26.5m | — | 51 | 3 | 10 | 5 | 1 | 1922 |
| casual | 6.0m | — | 21.9m | — | — | 37.5m | — | 41 | 3 | 4 | 0 | 4 | 1642 |
| idle | 6.0m | 26.6m | 4.75h | — | — | 4.76h | — | 31 | 3 | 1 | 103 | 0 | 1682 |
| noclick | 6.0m | 2.5m | 5.00h | — | — | 5.00h | — | 29 | 3 | 1 | 101 | 0 | 1104 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| greedy | 69.7K | 96.0K | 14.3K | 60.7K | 16.0K |
| optimal | 70.4K | 147K | 178K | 258K | 295K |
| casual | 32.1K | 65.6K | 1.92K | 1.94K | 43.3K |
| idle | 10.5K | 6.64K | 8.30K | 10.2K | 11.4K |
| noclick | 7.06K | 8.02K | 7.87K | 9.53K | 12.4K |

Bosses (first kill):

- **greedy**: Eskel 9.6m
- **optimal**: Eskel 10.7m
- **casual**: Eskel 21.9m
- **idle**: Eskel 4.75h
- **noclick**: Eskel 5.00h

Stalls (no progress event for 20+ min):

- **greedy** stalled 26.7m from 2.44h at The Cindered Approach tier -1 (cleared 3), level 38
- **optimal** stalled 23.6m from 4.26h at The Cindered Approach tier -1 (cleared 3), level 58
- **casual** stalled 40.2m from 2.00h at The Cindered Approach tier -1 (cleared 3), level 35
- **casual** stalled 53.4m from 2.67h at The Cindered Approach tier -1 (cleared 3), level 36
- **casual** stalled 55.3m from 3.56h at The Cindered Approach tier -1 (cleared 3), level 37
- **casual** stalled 52.0m from 5.13h at The Cindered Approach tier -1 (cleared 3), level 41

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 11:48 UTC · 6h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | 1.12h | 9.6m | — | — | 30.5m | — | 33 | 3 | 4 | 113 | 0 | 2703 |
| optimal | 3.8m | 1.10h | 10.7m | — | — | 30.5m | — | 37 | 3 | 5 | 56 | 1 | 1831 |
| casual | 6.0m | 59.1m | 21.9m | — | — | 31.0m | — | 29 | 3 | 2 | 36 | 1 | 833 |
| idle | 6.0m | 26.6m | 4.75h | — | — | 4.76h | — | 28 | 3 | 1 | 108 | 0 | 1448 |
| noclick | 6.0m | 2.5m | 5.00h | — | — | 5.00h | — | 27 | 3 | 1 | 105 | 0 | 1009 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| greedy | 69.5K | 12.0K | 16.5K | 6.18K | 20.9K |
| optimal | 70.9K | 50.2K | 31.0K | 10.9K | 7.37K |
| casual | 20.7K | 16.1K | 806 | 1.27K | 1.26K |
| idle | 10.5K | 6.64K | 8.30K | 10.2K | 11.2K |
| noclick | 7.06K | 8.02K | 7.87K | 9.53K | 12.4K |

Bosses (first kill):

- **greedy**: Eskel 9.6m
- **optimal**: Eskel 10.7m
- **casual**: Eskel 21.9m
- **idle**: Eskel 4.75h
- **noclick**: Eskel 5.00h

Stalls (no progress event for 20+ min):

- **optimal** stalled 32.9m from 5.26h at The Cindered Approach tier -1 (cleared 3), level 36
- **casual** stalled 22.6m from 2.05h at The Cindered Approach tier -1 (cleared 3), level 25

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min
</details>
