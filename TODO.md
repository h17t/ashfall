# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- Current milestone: **9 — Kindling (prestige 1)**
- Last completed: Milestone 8 (three schools, catalysts, attunement, five covenants).

## Milestone 9 checklist
- [ ] `src/engine/prestige.ts`: humanity formula, kindle reset (keep humanity, tree, covenant rep, bestiary/knowledge), NG+ scaling already in formulas
- [ ] Humanity skill tree content (`src/content/tree.ts`): four branches, ~24 nodes incl. automation unlocks (auto-level, auto-riposte, auto-dodge, auto-estus, auto-advance), start bonuses, keepWeapons
- [ ] New enemy variants per cycle exist (VARIANTS); add a cycle boss per NG+ for the first several cycles (needs M10 zones — define the hook now, content in M10)
- [ ] Kindle UI: humanity preview, confirm, tree panel with node positions
- [ ] First 20 minutes after Kindle must be faster than before: startLevels/startWeaponLevel/startSouls nodes, and NG+ soul growth > HP growth early
- [ ] Sim extension: kindle when humanity gain ≥ threshold; buy tree nodes
- [ ] Tests: kindle preserves/destroys the right things, humanity monotonic, NG+ scaling, tree purchase rules

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- Enemy sprites are dark on dark; polish pass (M12)
