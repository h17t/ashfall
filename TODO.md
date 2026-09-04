# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- **Pass 2 (art direction & presentation) in progress.** Engine untouched; all 102 engine/UI tests pass unchanged. See ART.md for the bible and the review log.
  - [x] M1 audit & bible (ART.md, palette/type/silhouette sheets, mockups A/B/C)
  - [x] M2 pipeline: tools/assets, treatment chain, manifest, audit wired into `npm test`; 153 plates built
  - [x] M3 foundation reskin: fonts, tokens, Slab material, grain, fire light, gauges, every screen re-dressed; review round 1
  - [x] M4 VFX layer: WebGL2 stage in src/vfx (layers, masked figure, particles, bloom/CA/shock/heat/vignette/iris post), hit-stop, riposte sequence; review round 2
  - [ ] M5 cinematics sequencer (boss intro, phase, YOU DIED, bloodstain, Kindling, region transition)
  - [ ] M6 parallax regions (4 layers, drift, pointer/combat parallax)
  - [ ] M7 asset production (fix the figure faults in ART.md round 2; icon crops for weapons)
  - [ ] M8 Kindling ritual & meta screens
  - [ ] M9 audio pass
  - [ ] M10 final review, perf, a11y, SCREENSHOTS.md
- **All twelve milestones complete.** The build is playable end to end: six regions, 17 bosses, 32 weapons, 25 spells, 6 phantoms, 5 covenants, Kindling with a 25-node tree, the Dark Sigil with 14 unlocks, the endless Abyss, the Age of Dark, the full automation ladder.
- A fresh session should: read DESIGN.md (decisions), BALANCE.md (latest simulator run), this file; run `npm test` and `npm run sim -- --hours 12`; then pick from the list below.

## Milestone 12 checklist
- [x] Juice: impact flash, damage-scaled shake, riposte time-dilation + chromatic edge, ash burst on death, growing bonfire flame
- [x] Audio: Web Audio synth (hit, riposte chime, stagger crack, dodge, hurt, boss toll, YOU DIED sting, unlock, recover, cast); off by default
- [x] Onboarding hints that dismiss themselves; no text wall
- [x] Accessibility: reduced motion, focus styles, keyboard for core actions, mobile ordering
- [x] Performance: 0.02ms engine tick with a full squad (scripts/bench.ts)
- [x] Bestiary panel
- [x] README
- [x] Final balance pass: 60h report for all strategies; 200h long-horizon run of greedy + idle (see BALANCE.md)
- [x] Commit

## After Milestone 12 (ideas, not commitments)
- Phantom-specific gear (armour slot), a covenant for pure casters, a seventh region theme for Sigil 5+
- A proper stats page with graphs of souls/hour over the session
- Cloud save via export string is enough for now; no accounts

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- Enemy sprites are dark on dark; polish pass (M12)
