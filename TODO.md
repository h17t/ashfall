# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- Current milestone: **2 — Engine + simulator**
- Last completed: Milestone 1 (skeleton) — playable, typechecks, builds.

## Milestone 2 checklist
- [ ] `src/sim/` headless harness: strategies (greedy, casual, idle-only, no-click, optimal-ish), time-to-milestone, souls/hour, stall detection
- [ ] `scripts/sim.ts` writes `BALANCE.md`
- [ ] Vitest suite: formulas, damage, stagger/riposte, death/bloodstain/corpse run, content validation, economy property tests (no NaN/negative/Infinity)
- [ ] Simulation tests asserting pacing targets in `BALANCE.targets`

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- `scripts/smoke.ts` is a throwaway; delete once the sim exists
- Enemy sprites are dark on dark; polish pass (M12)
