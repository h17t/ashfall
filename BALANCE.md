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

### Run — 2026-09-04 11:42 UTC · 3h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 2.9m | — | 9.6m | — | — | — | — | 60 | 3 | 0 | 0 | 0 | 854 |
| optimal | 3.8m | — | 10.7m | — | — | — | — | 60 | 3 | 0 | 0 | 0 | 716 |
| casual | 6.0m | — | 21.9m | — | — | — | — | 57 | 3 | 0 | 0 | 0 | 556 |
| idle | 6.0m | 26.6m | — | — | — | — | — | 37 | 3 | 0 | 55 | 0 | 646 |
| noclick | 6.0m | 2.5m | — | — | — | — | — | 35 | 3 | 0 | 54 | 0 | 472 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 |
|---|---|---|---|
| greedy | 82.7K | 112K |
| optimal | 82.2K | 111K |
| casual | 49.7K | 83.3K |
| idle | 10.5K | 6.64K |
| noclick | 7.06K | 8.02K |

Bosses (first kill):

- **greedy**: Eskel 9.6m
- **optimal**: Eskel 10.7m
- **casual**: Eskel 21.9m
- **idle**: none
- **noclick**: none

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

<details><summary>Previous runs</summary>

### Run — 2026-09-04 11:15 UTC · 6h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.2m | — | 12.5m | — | — | — | — | 67 | 3 | 0 | 0 | 5 | 576 |
| optimal | 4.4m | — | 11.4m | — | — | — | — | 67 | 3 | 0 | 0 | 5 | 457 |
| casual | 6.0m | 21.1m | 31.2m | — | — | — | — | 66 | 3 | 0 | 1 | 5 | 451 |
| idle | 6.0m | 26.9m | — | — | — | — | — | 34 | 3 | 0 | 127 | 0 | 323 |
| noclick | 6.0m | 2.5m | — | — | — | — | — | 33 | 3 | 0 | 132 | 0 | 327 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| greedy | 51.9K | 67.7K | 69.5K | 70.2K | 71.1K |
| optimal | 53.4K | 67.9K | 69.2K | 70.0K | 71.0K |
| casual | 33.6K | 62.9K | 65.4K | 66.9K | 68.9K |
| idle | 7.07K | 1.68K | 1.57K | 1.56K | 1.47K |
| noclick | 5.71K | 3.45K | 1.59K | 1.62K | 1.62K |

Bosses (first kill):

- **greedy**: Eskel 12.5m
- **optimal**: Eskel 11.4m
- **casual**: Eskel 31.2m
- **idle**: none
- **noclick**: none

Stalls (no progress event for 20+ min):

- **greedy** stalled 21.8m from 3.68h at The Cindered Approach tier 3 (cleared 3), level 62
- **greedy** stalled 24.5m from 4.04h at The Cindered Approach tier 3 (cleared 3), level 63
- **greedy** stalled 27.1m from 4.45h at The Cindered Approach tier 3 (cleared 3), level 64
- **greedy** stalled 30.3m from 4.90h at The Cindered Approach tier 3 (cleared 3), level 65
- **greedy** stalled 33.6m from 5.41h at The Cindered Approach tier 3 (cleared 3), level 66
- **optimal** stalled 21.9m from 3.66h at The Cindered Approach tier 3 (cleared 3), level 62
- **optimal** stalled 24.5m from 4.03h at The Cindered Approach tier 3 (cleared 3), level 63
- **optimal** stalled 27.1m from 4.44h at The Cindered Approach tier 3 (cleared 3), level 64
- **optimal** stalled 30.4m from 4.89h at The Cindered Approach tier 3 (cleared 3), level 65
- **optimal** stalled 33.7m from 5.40h at The Cindered Approach tier 3 (cleared 3), level 66
- **casual** stalled 20.8m from 3.77h at The Cindered Approach tier 3 (cleared 3), level 61
- **casual** stalled 22.8m from 4.12h at The Cindered Approach tier 3 (cleared 3), level 62
- **casual** stalled 24.7m from 4.50h at The Cindered Approach tier 3 (cleared 3), level 63
- **casual** stalled 27.9m from 4.91h at The Cindered Approach tier 3 (cleared 3), level 64
- **casual** stalled 30.7m from 5.38h at The Cindered Approach tier 3 (cleared 3), level 65

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 11:14 UTC · 2h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.2m | — | 12.5m | — | — | — | — | 55 | 3 | 0 | 0 | 0 | 240 |
| optimal | 4.4m | — | 11.4m | — | — | — | — | 55 | 3 | 0 | 0 | 0 | 194 |
| casual | 6.0m | 21.1m | 31.2m | — | — | — | — | 53 | 3 | 0 | 1 | 0 | 186 |
| idle | 6.0m | 26.9m | — | — | — | — | — | 28 | 3 | 0 | 34 | 0 | 125 |
| noclick | 6.0m | 2.5m | — | — | — | — | — | 28 | 3 | 0 | 33 | 0 | 101 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 |
|---|---|---|
| greedy | 51.9K |
| optimal | 53.4K |
| casual | 33.6K |
| idle | 7.07K |
| noclick | 5.71K |

Bosses (first kill):

- **greedy**: Eskel 12.5m
- **optimal**: Eskel 11.4m
- **casual**: Eskel 31.2m
- **idle**: none
- **noclick**: none

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min

---

### Run — 2026-09-04 11:14 UTC · 3h · seed 7

| Strategy | Auto-attack | 1st death | 1st boss | Region 2 | Region 3 | 1st Kindle | Sigil | Final L | Deepest | NG+ | Deaths | Stalls | Sim ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 3.2m | — | 10.0m | — | — | — | — | 59 | 3 | 0 | 0 | 0 | 328 |
| optimal | 4.4m | — | 10.8m | — | — | — | — | 59 | 3 | 0 | 0 | 0 | 271 |
| casual | 6.0m | — | 18.5m | — | — | — | — | 58 | 3 | 0 | 0 | 0 | 252 |
| idle | 6.0m | 26.9m | 1.50h | — | — | — | — | 43 | 3 | 0 | 26 | 0 | 225 |
| noclick | 6.0m | 2.5m | 1.24h | — | — | — | — | 40 | 3 | 0 | 21 | 0 | 195 |

Souls earned per hour (first 12 buckets):

| Strategy | h1 | h2 | h3 |
|---|---|---|---|
| greedy | 54.3K | 67.8K |
| optimal | 54.0K | 67.9K |
| casual | 43.7K | 63.6K |
| idle | 7.28K | 9.84K |
| noclick | 5.64K | 11.7K |

Bosses (first kill):

- **greedy**: Eskel 10.0m
- **optimal**: Eskel 10.8m
- **casual**: Eskel 18.5m
- **idle**: Eskel 1.50h
- **noclick**: Eskel 1.24h

Targets: first boss 6–16 min · first Kindle 3–7 h · first Sigil 30–60 h · auto-attack by 10 min
</details>
