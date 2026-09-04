# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- Current milestone: **3 — Combat depth (UI pass)**
- Last completed: Milestone 2 (engine + simulator + 51 tests).

## Milestone 3 checklist
The engine side of M3 (stamina, stagger, riposte, dodge, telegraphs, Estus, death, bloodstain, corpse run) shipped with M1/M2 and is tested. Remaining is making it all *legible and felt* in the UI:
- [ ] Corpse-run indicator: "your bloodstain lies at <tier>, N kills away", abandon button
- [ ] Death interstitial audio/visual polish deferred to M12; the 1.2s freeze exists
- [ ] Riposte moment: time-dilation/chromatic edge deferred to M12; glow + banner exists
- [ ] Stamina exhaustion feedback in the bar (flash when exhausted)
- [ ] Telegraph attack name + damage is shown; add "% of your HP"

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- `scripts/smoke.ts` is a throwaway; delete once the sim exists
- Enemy sprites are dark on dark; polish pass (M12)
