# Ashfall — Balance Log

Simulator output per revision of `src/content/balance.ts`. The simulator lands in Milestone 2; this file starts life as the record of the initial curve choices.

## Rev 0 — initial curves (Milestone 1)

| Knob | Value |
|---|---|
| Enemy HP | 60 × 1.55^g |
| Enemy damage | 9 × 1.2^g |
| Enemy poise | 26 × 1.12^g |
| Souls per kill | 6 × 1.5^g |
| Level cost | 30 × 1.115^L + 6L |
| Reinforce | ×1.15 per level, cost 40 × 1.9^L × 5^(region−1) |
| Boss HP / souls | 14× / 40× the zone's last tier |

Smoke run (2 min, click every 0.3s, tier 0): 68 kills, 309 souls, no deaths.
