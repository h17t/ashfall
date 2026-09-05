# Mournwake — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- **Pass 3 (rename, mobile-first, deep content) in progress.** The name is MOURNWAKE (NAMING.md); the fiction is LORE.md; the banned-terms linter runs in `npm test`.
  - [x] M1 rename: name verified as far as the sandbox allows, full term migration (4,600 replacements, every identifier), `tools/lint/banned-terms.ts` in the test suite, save schema 2 with a v1→v2 migration and a pre-rename fixture round-trip, fuzz test, LORE.md
  - [x] M2 mobile foundation: portrait-first shell (status strip, section, action bar, bottom nav), landscape and wide arrangements, safe areas, tooltips as bottom sheets, touch-target and hover audits in CI
  - [x] M3 touch feel: pointerdown actions, multi-touch, swipe/long-press/pull-to-dismiss, haptic patterns with a toggle, the away report and reallocation as sheets; `scripts/touch-check.mjs`
  - [x] M4 platform: PWA (icons, manifest, splash, install sheet after the first lord), build-time service worker with precache, four quality tiers with auto-detect and step-down, render pause + 1Hz logic when hidden, freeze/event autosave, budget + interruption audits in CI
  - [x] M5 Descent Runs: the Stair (engine module, 27 boons, offer sheet, strip, haul sheet, Stair page), save v3 + v2 fixture test, sim strategies with a control and a reckless, BALANCE.md rev 4
  - [x] M6 Standing Orders: rule engine (15 conditions, 13 actions, earned slots and kinds), chip-and-sheet editor in Combat, save v4 + v3 fixture, authored sim strategy, BALANCE.md rev 5
  - [x] M7 The Study and Reforging: kill ranks with reveals and permanent bonuses, 15 affixes in five sets with Study gates, reforge and lock, sets across the Cortege, save v5 + v4 fixture, forge sim extension, BALANCE.md rev 6
  - [ ] M8 Afflictions and the Toll
  - [ ] M9 stretch: Dispatch, Holdfasts, Creed War, Weapon Mastery
  - [ ] M10 content and art for everything new
  - [ ] M11 test and polish: device matrix, audits, onboarding, accessibility, QA.md, balance
- **Pass 2 (art direction & presentation) complete.** Engine untouched; all 102 engine/UI tests pass unchanged. See ART.md for the bible and the review log.
  - [x] M1 audit & bible (ART.md, palette/type/silhouette sheets, mockups A/B/C)
  - [x] M2 pipeline: tools/assets, treatment chain, manifest, audit wired into `npm test`; 153 plates built
  - [x] M3 foundation reskin: fonts, tokens, Slab material, grain, fire light, gauges, every screen re-dressed; review round 1
  - [x] M4 VFX layer: WebGL2 stage in src/vfx (layers, masked figure, particles, bloom/CA/shock/heat/vignette/iris post), hit-stop, reprisal sequence; review round 2
  - [x] M5 cinematics: gsap sequencer + Cinema layer (boss intro, phase, UNMADE., remains, first Snuffing rite, region transition); review round 3
  - [x] M6 parallax regions: pointer and impact parallax, per-layer drift, rolled ridges and rebuilt trees; review round 4
  - [x] M7 asset production: every round-2 figure fault addressed, edge streaks and icon crops for weapons, Archive library and light shafts; review round 5
  - [x] M8 Snuffing ritual (five acts, ~30s) and meta screens: illuminated Vestige tree, parchment boss marrow, Severing; review round 6
  - [x] M9 audio pass: region reverb and drone beds, tolls, the hush before a phase turn, the Snuffing swell; headless smoke test
  - [x] M10 final review: three rounds on the three frames, contrast fixes, the performance ladder, keyboard walk, SCREENSHOTS.md
- **All twelve milestones complete.** The build is playable end to end: six regions, 17 bosses, 32 weapons, 25 spells, 6 shades, 5 creeds, Snuffing with a 25-node tree, the Dark Severing with 14 unlocks, the endless Nadir, the Unmaking, the full automation ladder.
- A fresh session should: read DESIGN.md (decisions), BALANCE.md (latest simulator run), this file; run `npm test` and `npm run sim -- --hours 12`; then pick from the list below.

## Milestone 12 checklist
- [x] Juice: impact flash, damage-scaled shake, reprisal time-dilation + chromatic edge, ash burst on death, growing lantern flame
- [x] Audio: Web Audio synth (hit, reprisal chime, strain crack, dodge, hurt, boss toll, UNMADE. sting, unlock, recover, cast); off by default
- [x] Onboarding hints that dismiss themselves; no text wall
- [x] Accessibility: reduced motion, focus styles, keyboard for core actions, mobile ordering
- [x] Performance: 0.02ms engine tick with a full cortege (scripts/bench.ts)
- [x] Bestiary panel
- [x] README
- [x] Final balance pass: 60h report for all strategies; 200h long-horizon run of greedy + idle (see BALANCE.md)
- [x] Commit

## After Milestone 12 (ideas, not commitments)
- Shade-specific gear (armour slot), a creed for pure casters, a seventh region theme for Severing 5+
- A proper stats page with graphs of marrow/hour over the session
- Cloud save via export string is enough for now; no accounts

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- Enemy sprites are dark on dark; polish pass (M12)
