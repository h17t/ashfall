# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- Current milestone: **7 — Phantoms (the idle layer)**
- Last completed: Milestone 6 (versioned saves, migrations, export/import, backup recovery, offline summary).

## Milestone 7 checklist
- [ ] `src/engine/phantoms.ts`: recruit, level (souls), gear slot, assignment beside/hunt, per-tick beside contribution (dps/stagger/heal/buff/status), hunting rate (closed form) + survivability, wipe/retreat, XP
- [ ] Install `setIdleRateFn` so offline uses the hunt rate
- [ ] 5 phantoms with kits: dps, stagger, healer, buffer, status; one recruitable per region (regions 2–5 arrive in M10; until then all five recruitable in region 1 at rising costs? — decide, see DESIGN)
- [ ] Squad panel UI: recruit, level, assign, hunt-tier selector with "survivable / rate" readout
- [ ] Sim extension: strategies recruit/level/assign phantoms
- [ ] Tests: hunting rate math, wipe logic, offline uses squad rate

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- `scripts/smoke.ts` is a throwaway; delete once the sim exists
- Enemy sprites are dark on dark; polish pass (M12)
