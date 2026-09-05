# Mournwake — Art Bible

The source of truth for every visual decision in the game. Every asset is checked against this document; `tools/assets/audit.ts` enforces the mechanical parts.

## 0. Capability audit (pass 2, step zero)

Audited in the order the brief demands.

| # | Capability | Finding |
|---|---|---|
| 1 | **Skills** | Enabled: `artifact-design` (visual-design guidance for artifacts; read in full), `design` (a canvas editor for mockups, not an asset generator), `dataviz`, `artifact-diagramming`, plus document skills (docx/pptx/pdf/xlsx). **None generates raster art.** The design guidance's list of "AI-default looks" (cream + terracotta, black + acid green, Inter, emoji markers, rounded-lg everywhere, everything centred) is adopted here as a banned list, on top of §10 of the brief. |
| 2 | **MCP servers** | Connected: `github`, `Claude_Code_Remote`. No image-generation or asset MCP is connected, no resources are exposed, and a tool search for image generation returns nothing. I cannot connect a new server from inside the session (no credentials, and the egress proxy denies unlisted hosts). |
| 3 | **Local raster tooling** | `sharp`, `@resvg/resvg-js`, `@napi-rs/canvas`, `svgo`, `simplex-noise` installed and smoke-tested (see the verification block below). |
| 4 | **Headless browser** | Playwright 1.56 + Chromium 1194 pre-installed; used throughout pass 1 for screenshots. `scripts/shot.mjs` and `scripts/shot2.mjs` drive `vite preview`. |
| 5 | **Fonts** | `@fontsource/im-fell-english-sc`, `@fontsource/eb-garamond`, `@fontsource/barlow-condensed` installed; woff2 files bundled by Vite. No CDN links. |

**Decision: Path B, procedural illustration.** There is no image generator available to me, so every illustration is composed as layered SVG from a shape library, run through SVG filter chains (turbulence displacement for broken etched edges and ink bleed, blur-and-composite for wash pooling, fractal noise for paper tooth), rasterised at build time with resvg, and finished by a shared treatment chain in sharp. Deterministic seeds per asset. The outputs are committed. If real illustrations are commissioned later, `assets/manifest.ts` is the only file that changes (`source: 'authored'`).

I am saying this plainly, as asked: the art will be procedural. The bar it is held to is §2.1 — plates from a water-damaged bestiary, not flat vector shapes — and the audit fails any asset with too few luminance values to be an illustration.

## 1. The direction

**Painterly ink-etching, lit by the fire you are holding.**

Reference points: the silhouette language and single-warm-light staging of *Salt and Sanctuary*; the ink weight and hatched shadow ramps of Doré's engravings; the desaturated rot and smoke of Beksiński. Every image is a plate from a bestiary that has been left out in the rain: ink lines that bleed and break, wash that pools in the darks, foxing and grain under everything. Nothing crisp. Nothing clean. Nothing that looks like it came out of a design tool.

Three rules that decide everything else:

1. **Silhouette is law.** Every enemy, boss, weapon and shade must be identifiable in pure black at 100px. The silhouette sheet in §5 is regenerated with every asset build and reviewed; two entities that read the same means one is redesigned.
2. **One light.** The lantern, low and warm, lights the whole interface. Highlights sit on the fire-facing edge of everything and flicker fractionally with it. There is no second light source anywhere unless it *is* a light source in the world (a lantern, a wisp-arrow, the reprisal flash).
3. **One accent at a time.** In any region of the screen at most one saturated colour is visible. When the reprisal window is open, the rest of the frame desaturates so the mote is alone.

## 2. Palette

Defined once as CSS custom properties in `src/ui/tokens.css`, mirrored in `tools/assets/palette.ts` for the treatment chain. Nothing outside this table appears in `src/ui/`, `src/render/` or `src/vfx/`; the audit greps for literals.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#0A0908` | Deepest background, letterbox bars |
| `--ink` | `#14100E` | Panel fills, shadow mass |
| `--stone` | `#241E1A` | Raised surfaces, UI slabs |
| `--ash` | `#4A423C` | Borders, dividers, disabled |
| `--bone` | `#C8BBA6` | Primary text |
| `--parchment` | `#E8DCC4` | Emphasis text, headings |
| `--ember` | `#C8560F` | The accent. Fire, active state, marrow gain |
| `--ember-hot` | `#F0902E` | Highlight core, reprisal flash |
| `--blood` | `#6E1212` | Damage taken, danger |
| `--blood-bright` | `#A81C1C` | Crit, death, boss phase change |
| `--verdigris` | `#3D5A4C` | Poison, rot, nature |
| `--wisp` | `#5C7A99` | Marrow, weaving, cold light |
| `--gold` | `#B8912F` | Litanies, rare items, creed seals |

Pure white and pure black are banned. Nothing is fully saturated except a light source. Semantic use is fixed: damage taken is always blood, never mote; marrow are mote when *gained* and bone when *displayed*; the three schools are wisp / gold / mote; poison is verdigris; frost is wisp at low alpha.

Rendered swatches: `art/palette.png` (regenerated by `npm run art:bible`).

## 3. Typography

Three faces, self-hosted from `@fontsource`, declared in `src/ui/fonts.css`. `Inter`, `system-ui` and any sans body face are banned.

- **Display — IM Fell English SC.** Boss names, region titles, UNMADE., the numbers that matter for a beat (reprisal damage). Letterpress irregularity is the point; it appears large (≥ 28px) or not at all. Tracking 0.12–0.3em on titles.
- **Body — EB Garamond.** Lore, descriptions, tooltips, hints. Italic for flavour text, ragged right, leading 1.45–1.6, measure ≤ 62 characters. Lore should read as transcribed.
- **Data — Barlow Condensed.** Every number that ticks: marrow, HP, damage, costs, rates, stats. `font-variant-numeric: tabular-nums` always; weights 500–600; letter-spacing 0.02em. Numbers never shift width.

Scale (px): 11 · 12.5 · 14 · 16 · 20 · 26 · 34 · 46 · 64 · 92. Labels are 11px Barlow uppercase, tracking 0.18em, bone at 70% alpha.

Type specimen: `art/type.png`.

## 4. Composition and materials

- **Panels are objects.** Three materials, each an SVG-masked surface with an irregular edge (noise-displaced path, never `border-radius`), a fire-side bevel, and grain: *stone slab* (structural panels), *scorched leather* (combat frame, cortege), *nailed parchment* (tooltips, lore, trees). Materials are components in `src/render/materials/` and take a `seed` so no two slabs have the same edge.
- **Asymmetry.** The combat frame sits off-axis to the left; the hub column overlaps it and casts shadow onto it. Corner ornaments are uneven: one nailhead, one torn corner, one scorch.
- **The lantern is the light.** A single `--fire` intensity value (0.85–1.15, flickering at ~8Hz with a slow drift) is written to a CSS variable by the render loop; every bevel highlight, rim light and glow multiplies by it.
- **Grain everywhere.** One film-grain layer over the whole app, animated at 12fps (steps), opacity 0.05–0.08. The VFX layer adds vignette and bloom.
- **Value structure first.** Backgrounds live in void→ink (L 3–10). Panels in stone (L 12–15). Text in bone/parchment (L 75–88). Art occupies the full range but its *mass* sits in the low-mid range so the one lit edge reads. A screenshot converted to greyscale must still show a clear focal point.

## 5. Silhouette sheet

Regenerated by the asset build into `art/silhouettes.png`: every enemy, boss, weapon and shade in pure `--ink` on `--parchment` at 100px, labelled. Reviewed at every milestone.

## 6. Review log

Each milestone's screenshot-critique rounds are appended here, harshest reading first, with what was changed.

### Round 1 — Milestone 1 (bible, silhouettes, style-target mockups)

Artifacts: `art/palette.png`, `art/type.png`, `art/silhouettes.png`, `art/try-sheet.png`, `art/mockups/{A,B,C}.png`.

**Type and palette** pass: IM Fell carries a name card; Garamond italic makes lore read as transcribed; Barlow tabular numbers hold their width. No further notes.

**Silhouette sheet (61 subjects), harsh reading.** Distinct and readable at 100px: every beast (rat, hound, stalker, leech, crawler, gargoyle, drake), the golems and sentinels, the tome, the sprite, the treant, the hanged pilgrim (rope), the crowned lords, the twin sentinels, the Mire Mother's spread hem. **Failing:** the nine robed figures are one cone with a staff moved about; the eight wraiths are one shroud; the wraith crowns vanish at this size; the deserter's crossbow is a lump; wanedPilgrim / mireWaned / undercroftWaned are the same hunched man with different props. Fix in Milestone 2: robed figures get four body forms (cone, tall, wide, bent) and three hood forms (pointed, cowl, mitre) and their prop hand differs; wraiths get four forms (shroud, column, flayed, spire) with crowns scaled to read; humanoids get posture (upright / hunched / lunging) and a distinctive prop each.

**Plates (try-sheet).** The etched, warm-underlit look is there: broken edges, pooled wash, one light. Notes: the rim light is too white (now `#B08A5A`-tinted, lower); the mote tint overwhelmed the golem (tint might 0.35 → 0.22); the hound's legs are sticks; interior linework is invisible at plate scale; the scattered "boss fx" glows sit on the chest and read as buttons rather than motes in the air (move them off-body in M2).

**Mockup A (off-axis frame + overlapping hub slab)** — adopted as the game's layout. Panels read as objects: irregular edges, fire-side bevel, grain, real shadow between overlapping slabs. First place the eye lands: the Pyre-Warden's eyes, then the name, then the marrow figure. Fails: the boss mass merges into the slab (needs either a lit fog plate behind the figure or a cooler slab), the cloak highlight streak is white, the chest glows.
**Mockup B (cinematic card)** — adopted for boss intros. Letterbox, name card with an mote rule, epithet: yes. Fails: plate too large (head cropped), HUD collides with the figure's feet, the same highlight and glow faults.
**Mockup C (bestiary page)** — adopted for lore and the bestiary. The parchment ground is the hardest test and the rig fails it: tin-can helm with a comic face, stub sword, noodle legs, no interior etching, no rope. On ink grounds darkness hid all of this. Rule adopted: **every plate is reviewed on parchment**, because a figure that only works in the dark is not an illustration.

Verdict: the direction is right and the type, palette and material language ship. The figures do not yet; Milestone 2 and 7 own that.

### Round 2 — Milestone 2 (pipeline: 153 plates, three sheets, the parchment test)

Artifacts: `art/sheet-enemies.png`, `art/sheet-enemies-parchment.png`, `art/sheet-bosses.png`, `art/sheet-weapons.png`, `art/sheet-icons.png`, `art/sheet-regions.png`, `art/silhouettes.png` (regenerated from the manifest).

**Pipeline.** Every entity in the manifest builds from `tools/assets/` with a content-hash cache, through the treatment chain in `treat.ts`, to `assets/generated/art/<kind>/<id>{@2x,}.webp` plus a silhouette mask. Full rebuild is ~7 minutes; the payload is 5.1 MB. Two resvg crashes were fixed on the way (fractional filter regions on displacement maps; every filter now declares an integer user-space region and every primitive a matching subregion).

**Parchment test (the rule from round 1).** The enemy sheet on `--parchment` now reads: robed figures come in four bodies and five hoods, wraiths in five forms, humanoids lunge or hunch, weapons are in front and sized to be seen, eyes are sunken and asymmetric or a single visor glow. The warm lantern rim (`#B08A5A`) survives on parchment. Still failing: `ghrelt` is a slab (bulk 1.6 reads as a door), `gallowsKnight` has no rope, `deserterCrossbow` reads as a man carrying a cross, `undercroftWaned` is a stick figure, the interior etching (hatch, folds) is invisible below 200px. Wick "fx" glows on `lordsRemnant`, `renderKnight` and `charredAcolyte` still sit on the body and read as buttons.

**Bosses.** The tonal wash and one-light rim work: `mireMother`, `choirMaster`, `theUnwritten`, `nadirWatcher`, `choirOfTeeth` are the ones that would sell a boss card. `coldPyreWarden` and `choirMaster` lose the top of the head to the plate edge (rigs need 8% headroom on big plates). `theRenderer` has a sun on his chest.

**Weapons.** Blades read as blades; hilts and pommels help. Faults: the edge-glow dots read as gems or buttons (should be a hot line along the edge, not four spots), hammer and halberd heads are blobs, talismans and the ruin flame are a glow on a blob. **Icons.** Twenty motifs on rings; the seals as wax work; items enlarged. Fine at 40px; at 24px the ring dominates.

**Silhouettes at 100px.** Sixty-one subjects; fails are now few: the four hooded shades (`ilse`, `vesna`, `corvo`, `ysolde`) are the same cowl; `charredAcolyte` / `vigilAcolyte` share a cone; `undercroftWaned`.

**Regions (first cut, failed the audit).** The first region layers were flat vector shapes: the audit script's luminance-level check caught all 21 of them (four to thirteen levels each). That is the check doing its job, and the fix was to paint, not to lower the bar: each mass now carries a tonal gradient from a lit rim to a void foot, a fractal mottle, cracks, and hatching in the lower half; the sky carries an ashen cloud band, haze, motes and the region's light. The treatment chain gained a `tone: false` path for these layers so the SVG's own painting is kept rather than re-mapped through the gray ramp (which had split every hill into a saturated crown and a black skirt). A second pass was needed after the audit's spread check (standard deviation of luminance over opaque pixels, now alongside the level count at 2/255 steps): the near and foreground masses were still one brown. They now carry a two-tone mottle (lichen light, soot dark), cracks, hatching at 0.6, and an mote underlight that is a radial glow from where the lantern sits rather than a uniform band. Rendering Works's near layer went from a spread of 3.4 to 8.2 and reads as scorched rock.

Verdict: the pipeline is real and end-to-end; the manifest is the only door the UI uses. Milestone 7 owns the figure faults listed above; the region sawtooth ridges and the paper-cut trees are Milestone 6's.

### Round 1 — Milestone 3 (foundation reskin)

Artifacts: `art/review/m3-fresh.png`, `art/review/m3-boss.png`, `art/review/m3-tabs-sheet.png`, `art/review/m3-states-sheet.png`.

**First screenshot, harsh reading.** The layout (mockup A) works: arena left, the hub slab overlapping its right edge, the leather side panel below. Faults found and fixed in the same round: the slab's chipped outline was clipping the first glyph of every panel's first line (the polygon was applied to a padded box: content now carries the layout classes and the polygon matches its box); the arena backdrop was a flat saturated orange band louder than the figure (darkened and desaturated at the backdrop layer until the region pass); the figure sat too small in the frame (raised to 92% of the stage); the hub covered the enemy HP figures (the arena foot now keeps 120px clear on the right); the boss card printed the title twice; the boss banner collided with the name card (moved to the foot until the cinematics milestone replaces it); the first film-grain layer was a full-viewport `feTurbulence` at 12fps (replaced by a cached noise tile jittered by background-position).

**What holds.** Slabs are objects: chipped stone, scorched leather, torn parchment for the log, hints and tooltips; each casts a real shadow on what it overlaps, and the fire-side bevel breathes with `--fire`. Gauges are nicked iron troughs with a hot leading edge, never a rounded cap. Type is IM Fell for names, Garamond italic for lore, Barlow tabular for every figure. Every enemy and boss is its illustration; weapons, spells, seals, items, shades and regions appear as plates through the manifest and nowhere else. No `#hex` outside `tokens.css`; no Tailwind gray; no emoji; the audit passes.

**Still wrong, carried forward.** The dark weapon plates vanish at 28px on stone (a lit well behind them helps, not enough: M7 should export an icon crop per weapon). The tabs wrap to two rows at 400px. The death overlay and the offline modal are re-dressed but not yet cinematic (M5). The region ridges are still a sawtooth (M6).

### Round 2 — Milestone 4 (VFX layer)

Artifacts: `art/review/m4-boss.png`, `art/review/m4-reprisal-open.png`, `art/review/m4-reprisal.png`, `art/review/m4-reprisal-after.png`, `art/review/m4-sheet.png`.

**What was built.** A WebGL2 stage (`src/vfx/`, no framework: 600 lines of GL and five shaders) under the DOM HUD. It draws the four region layers (bottom-anchored cover fit, depth-scaled, drifting), the figure with its silhouette mask (status tints screened through the mask, a rim toward the lantern read off the mask edge, a hit flash), a CPU particle pool as GL points in two blend groups (motes, ash, wisp-wisps, sparks additive; blood and drips normal), then a post chain: quarter-res bloom (bright pass, two separable blurs), chromatic aberration, a shockwave ring, heat shimmer near the ground by region, an HP blood vignette, an iris, a flash, dithering. The DOM keeps the name card, gauges and numbers. Reduced-motion drops particles, shake, shock, aberration and heat, keeps tints and rim, and caps flashes at a fifth. Quality auto-degrades (1x, no bloom) after forty frames above 22ms and never bounces back. Without WebGL2 the combat frame falls back to the DOM backdrop and plate.

**Impact grammar.** Player hit: blood spray sized by damage fraction, three sparks, a short directional kick from the lower left, a scale punch on the figure and a blood flash through its mask. Crit: a 45ms freeze, a small shockwave, ten sparks. Enemy hit on the player: a kick toward the viewer scaled by damage, blood flash, aberration spike. Perfect dodge: a wisp-blue flicker. Kill: wisps rise off the body (gold and mote for a lord, plus a flash and a shockwave). Status procs: a burst in the status colour and drips or sparkle while it holds. Cast: a rush of wisp-coloured sparks from the player's side.

**The reprisal sequence.** Window opens: particles slow to 85%, the world desaturates over ~120ms while saturated bright pixels (motes, the rim, glows) are kept hot, the figure's rim goes to ember-hot, an iris closes to 45% around the figure. First reprisal hit: 80ms freeze, an ember-hot flash at 38%, a shockwave from the wound, a nine-pixel kick, aberration, sixty heavy drops thrown up and right, and the figure in the display face at 84px. Later hits in the same window only kick and spark. Window closes: everything eases back.

**Harsh reading, and what changed in the round.** First capture: the boss plate was drawn at 96% of the stage and lost its head (now 84% for bosses, 74% for the rest, feet at 11%). Second: the landing bleached the whole frame to parchment and the figure to a pale cut-out, with green fringes from an aberration term that scaled with the ring (flash is now ember-hot at 38% for 220ms, the ring's aberration contribution is 1/50th of what it was, the figure flash is ember-hot and squared). Third: every auto-attack in the window re-fired the full landing (only the first hit lands; the rest kick and spark). Fourth: the composite desaturation greyed the mote rim and the figure tint with the world (desaturation now spares saturated bright pixels; the figure's window tint dropped from 35% to 12%). The final capture is the first frame of the pass that would sit on a store page: grey world, one burning edge, the number.

**Performance.** `scripts/perf.mjs` in this container runs WebGL through SwiftShader (no GPU) and reports ~80ms frames, which measures the software rasteriser, not the layer; the DOM-only measurement before the stage was p95 13.6ms. On hardware the stage is six full-frame passes at the arena's size plus a quarter-res bloom; the adaptive drop to 1x/no-bloom is the safety net for integrated GPUs. This must be re-measured on a real machine in the final review.

**Still wrong, carried forward.** The DOM boss banner sits under the reprisal number (cinematics milestone). Ash and mote rates per region are guesses until the region pass. The iris centre is the figure's chest; a boss with a raised weapon wants it higher.

### Round 3 — Milestone 5 (cinematics)

Artifacts: `art/review/m5-bossintro.png`, `art/review/m5-phase.png`, `art/review/m5-died.png`, `art/review/m5-region.png`, `art/review/m5-snuff.png`, `art/review/m5-sheet.png`, `art/review/m5-sheet2.png`.

**Built.** `src/render/cinematics/`: a sequencer (one timeline at a time, priority-ordered queue, Escape or click skips a skippable one) and the Cinema layer, DOM driven by gsap, that owns the letterbox bars, the shroud, the wipe, the flash and every card. Six sequences: boss intro (letterbox, the stage zooms from 1.18 back to 1 and dims, the name arrives from wide tracking, an mote rule draws, the epithet, the lore; unskippable the first time a lord is met, the memory kept in local storage, never in the save), phase transition (the phase name slams in from 1.25 scale with a short zoom and the mechanic line), UNMADE. (shroud to 88%, the words in blood-bright display face widening from 0.25em to 0.5em over 1.6s, the marrow line, out), remains recovery (a plate card with the stain brightening), region transition (a black wipe from the left, region number, name, rule, lore, wipe out to the right; fired off the store when the encounter zone changes, since a quiet travel emits no event), and the first Snuffing rite (solid shroud, the lantern plate brightening over eight seconds while four lines arrive, a parchment flash, out; Milestone 8 grows this into the full thirty-second ritual). Reduced motion runs every timeline at 55% and skips the stage zoom.

**Harsh reading.** First capture: every card was invisible. The timelines were built in the same tick as the React state change that mounts the card, so gsap found no targets; cards are now committed with `flushSync` before a timeline is built. Second: the boss card sat at the viewport's lower left, on top of the log parchment and the health gauge; boss and phase cards are now placed inside the combat frame from its measured rect, and the frame's own name card fades while a cinematic plays so the name is not printed twice. Third: the Snuffing shroud let the arena ghost through (solid for the rite). Fourth: the region wipe was fine and the card on black is the cleanest card in the set; the phase card ("Backdraft") reads at a glance. UNMADE. is right: it is the one everyone knows and it does not try to be clever.

**Carried forward.** The intro's zoom is only legible in motion; the still cannot judge it. The Snuffing rite needs its own scene (the ash field, the flame growing from the player's own lantern size, the tree lighting), not a plate on black.

### Round 4 — Milestone 6 (parallax regions)

Artifacts: `art/review/regions-sheet.png` (all seven regions captured in-game with the stage running), `art/review/region-approach.png`, `art/review/region-renderworks.png`.

**Built.** The stage's four layers now move: pointer parallax over the combat frame (far layer 0.15, foreground 1.3 of the pointer's throw; the figure slides between near and fore), an impact push (every kick shoves the camera and springs back at 6/s), and a slow drift per layer on its own sine. Region transitions are the Milestone 5 wipe. Region art: ridges are three octaves of seeded swell sampled densely instead of thirty jittered points (the sawtooth is gone), dead trees lean, thin to a split crown, and fork once with twigs.

**Harsh reading, all seven.** The Approach (scorched sky, dead trees, ash in the air) and the Rendering Works (mote arch, sooty rock, heat shimmer) are the two that sell. The Mire's green murk with reeds and the Deep's blue cold rock hold. The Archive is the weakest: the shelves are still flat blue-grey blocks and the arch is a cut-out, because that region's shapes are all rectangles and the mottle cannot save a rectangle; it needs book spines, a fallen ladder, a scatter of pages (Milestone 7). The Sanctum's gold is too even; it wants a shaft of light and darker flanks. The Nadir frame in the first sheet was a death (the blood vignette at full and the shroud), a capture error, not the region; retaken.

**Carried forward.** Archive and Sanctum shape passes; a mid-layer of hanging moss for the Mire; stalactites for the Deep. All Milestone 7, where the figure faults from round 2 also live.

### Round 5 — Milestone 7 (asset production)

Artifacts: `art/sheet-enemies-parchment.png`, `art/sheet-bosses.png`, `art/sheet-weapons.png`, `art/silhouettes.png`, `art/review/m7-probe.png`, `art/review/regions-sheet.png` (all regenerated: 153 plates, 32 weapon icons, payload 6.7 MB).

**Figures, against the round-2 list.** `ghrelt` carries a round shield and a club at bulk 1.3 instead of a door; `gallowsKnight` and the Hanged Pilgrim wear a noose that reads (a pale fibre overlay on the rope, a knot at the jaw, the tail over the shoulder; the first two attempts hid the rope behind the crest and then drew it in ink on ink); `deserterCrossbow` holds a crossbow with a bow arc, a string and a bolt; `undercroftWaned` gained a skull, a cloak, chains and a hunch; the four hooded shades are now four people (Ilse wide and veiled with a lantern, Vesna tall and bare-headed with staff and book, Corvo hunched and lunging with twin knives, Ysolde lunging with a rapier); `charredAcolyte` is a wide pointed-hood figure with its motes in the air. Boss heads fit (heights capped at 1.15; raised weapons shortened to 1.1 of reach); the Pyre-Warden's eye is back in frame. `theRenderer` wears his sun as a corona above the crown; `renderKnight`'s heat sits on the blade; `lordsRemnant`'s above the head. The flank rim light is mote rather than ember-hot at 0.42, so the Keeper's cloak no longer goes white. Interior lines are 1.6× heavier and the shadow hatch stronger; they now show at 256px.

**Weapons.** Enchanted blades carry a hot line along the edge (a soft stroke under a thin parchment core) instead of four gems; the maul has a squared, bevelled head with a spike; talismans are rings on a cord. Each weapon also exports a trimmed, lifted 64px icon crop for chips and lists; dark steel now reads at 32px on stone without the lit well.

**Regions.** The Archive is a library: uprights, shelves, rows of spines with gaps, fallen books, a leaning ladder and a scatter of pages on the floor; the Sanctum and the Archive carry light shafts from above.

**Still wrong.** `pyreGolem` keeps its mote pocks on the body by design, but they read as buttons at 100px. The chime and the ruin flame remain a glow on a blob. `vigilMaul`'s head is better but still lumpy. The Mire wants hanging moss and the Deep stalactites. These go to the final review's punch list, not to another milestone.

### Round 6 — Milestone 8 (Snuffing ritual and the meta screens)

Artifacts: `art/review/m8-tree.png`, `art/review/m8-ritual-sheet.png` (five moments of the ritual), `art/review/m8-marrow.png`, `art/review/m8-severing.png`.

**The Vestige tree** is an illuminated page: four vines on torn parchment, hexagonal medallions (diamonds for the automation gifts) joined by drawn stems that turn mote once the parent is ranked, rank pips beneath each name, the cost in mote when a node is open. The first cut hid every unranked node: the medallions were clip-path buttons whose border was clipped away, so only ranked ones showed; they are SVG polygons now with a transparent button over them. The parchment mottle was dropped from 0.45 to 0.2 because at 0.45 the page read as grey stone.

**The Snuffing ritual** runs about thirty seconds in five acts: the fire dies (the plate shrinks and darkens, the glow beneath it fades); what you carried rises as ash, one line at a time from the real ledger the panel hands the sequencer; what you know settles and stays; the mote catches (the plate grows, the mote glow returns, the count climbs to the Vestige gathered); the next burning is named. It is skippable with Escape. Faults: the screen is sparse between acts, and the lantern plate is a small object for a full-screen moment; the punch list has "ash particles rising through act II from the VFX stage" and "a larger lantern plate with the tender beside it".

**Boss marrow** are parchment pages with the lord's plate and the two one-way choices stacked; **the Dark Severing** takes the wisp-blue accent with a mark beside its name. Both hold the one-accent-per-region rule.

### Round 7 — Milestone 9 (audio pass)

Still synthesized, still opt-in. What changed: every cue now sends into a convolution reverb whose impulse is built for the region (exponentially decaying noise through a one-pole low-pass: 1.4s and bright on the Approach, 5s in the Sanctum, 7s and dark in the Nadir); each region has a drone bed (detuned oscillators under a slow-breathing low-pass, plus a texture: wind on the Approach, water in the Mire, whispers in the Archive, crackle in the Rendering Works, and drips or distant bells as pings in the Deep, the Sanctum and the Nadir) that crossfades on travel; a boss's arrival and each phase turn are tolled; and the hush: when a boss is within four percent of its next phase threshold everything ducks to a whisper in 0.4s, and the phase's toll lands 0.6s after it turns before the bed returns over 1.2s. The Snuffing ritual's fourth act carries a five-second rising chord. `scripts/audio-check.mjs` drives all of it headless: bed on, region swap, hush on approach, release and toll after the turn, zero errors.

### Round 8 — Milestone 10 (final review)

Artifacts: `art/final/boss-intro.png`, `art/final/reprisal.png`, `art/final/lantern.png`, `art/final/bestiary.png`; the gallery is `SCREENSHOTS.md`.

**Three rounds on the three frames.** Round one found the page beyond the frame fully lit during a boss intro (the hub competed with the card) and a crit number floating over the Pyre-Warden mid-arrival; the columns beyond the frame now step back to 30% under a cinematic and no floating number is raised while one plays. Round two was contrast: `blood-bright` text on stone measured 2.2:1 and `verdigris` labels 2.2:1, `ash` figures 1.7:1; every one is now parchment or bone-at-72% text with the colour carried by a pip beside it (5.2:1 or better everywhere text is read; the palette itself did not change). Round three was performance: the first measurement of the finished stack came in at 77ms a frame headless, and the ladder was built to answer it: full GL → GL at 1× without bloom → the DOM stage → ambient motion off, each rung taken after forty slow frames and never given back. Two real costs surfaced on the way and were fixed for every machine, not only the headless one: the 8Hz `--fire` root-variable write (a full-tree style recalc per write; the flicker is a stepped keyframe on the lit layers now) and the impact shake on `#root` (a re-raster of the whole document per hit; it shakes the combat frame). Headless, software-rendered, with a boss, a shade, all three status effects and forty clicks in four seconds:

| mode | avg | p50 | p95 | frames over 20ms |
|---|---|---|---|---|
| full effects (DOM rung after the ladder) | 5.7ms | 2.8ms | 16.1ms | 5 of 235 |
| reduce effects | 2.9ms | 2.1ms | 6.9ms | 0 |

On a machine with a GPU the GL rungs hold; the ladder is the guarantee, not the measurement.

**Keyboard and motion.** Every control is a real button with a visible 2px mote focus ring; the hotkeys work from the body; the tab list carries `role=tab` and `aria-selected`. Reduce-effects and `prefers-reduced-motion` hold the grain, motes, drift, flicker, shake and chromatic edge still, shorten every cinematic by half, and never remove information.

**What would still be done with more days**, in order: ash particles through the Snuffing ritual's second act; a lantern plate with the tender beside it for the ritual and the away report; the Mire's hanging moss and the Deep's stalactites; `pyreGolem`'s mote pocks, the chime and the flame plates; the region ridges could take one more octave of shape. None of these is a placeholder; each is a plate or a sequence that ships today and could be better.

**Verdict.** The boss intro, the reprisal moment and the lantern frame could sit on a Steam page. The pass is done.

## 7. Pass 3: the phone

### Round 9 — Pass 3, Milestone 2 (mobile foundation)

Artifacts: `art/mobile/m2-sheet.png` (the five pillars at 390×844), `art/mobile/m2-combat-landscape.png`, `art/mobile/m2-wide.png`, `art/mobile/m2-sheet-open.png`.

**The shell.** Portrait is the design; the others are arrangements of it. A status strip at the top (Marrow, level, HP, stamina: information where the eye goes), the section in the middle, the hand at the bottom: a bottom navigation of the five pillars (Combat, Cortege, Arsenal, Creeds, Lantern) over the safe area, and in Combat a thumb-zone action bar with Strike as the one big target, Dodge and Draught beside it, recitation slots above. Landscape phones and wide screens show the combat frame beside the current section with the pillars as a rail; the Combat pillar disappears from the rail because the frame is already on screen.

**No hover.** The tooltip became a bottom sheet: the whole row is a tap target where the row carries no other action, and a 48px information mark sits beside anything that does. Seventy-eight tooltips moved without rewriting their content; `tools/audit/hover.mjs` fails the build on a `title=` attribute, a mouse-enter handler, or a `:hover` rule that reveals content.

**Touch targets.** `tools/audit/touch-targets.mjs` renders the built game at 390×844, walks every pillar and sub-tab at the top and scrolled to the end, and fails on any interactive element under 48×48 or with less than 8px of air from another in the same scroll scope. The first run found 182 problems; the fixes were structural, not per-element: every button carries a 48px floor, rows that open a sheet are 48px rows, gaps are 8–12px, the settings toggles are 64×48 switches, tree medallions have a 48px hit area, and the section owns its own scrolling so nothing passes under the nav. It now checks 319 targets and finds none.

**Harsh reading of the first shots.** Duplicate headings (the section title over the panel's own title): the panels keep theirs. The hint card sat on the Strike button: on a phone it is now part of the flow under the status strip. The Cortege card squashed a segmented control, a select and a button into one row: the control is a real segmented switch and the select takes its own line. The enemy names the multi-line rename missed read "Revenant Pilgrim": they are the Waned now. The info sheet rendered at two-thirds width because its slab shrank to its content inside a flex parent: it spans the phone.

**Legibility.** Body copy is 16px, labels 12px in Barlow, numbers 14–26px; the HP figure at the top reads at arm's length in the 2× capture.

### Round 10 — Pass 3, Milestone 3 (touch feel)

Artifacts: `scripts/touch-check.mjs` (a phone context with a recorded vibration API: tap, two-finger Strike-while-Dodge, swipe, long-press, drag-to-dismiss, idle silence), `art/mobile/m3-away.png`.

**The hand.** Strike, Dodge and Draught fire on `pointerdown`, not click, so the visual answer is the next frame; the viewport disallows zoom and every control carries `touch-action: manipulation`, so there is no 300ms wait and no double-tap zoom; the stage and the action bar carry `touch-action: none`, so a second finger on Strike while the first holds Dodge lands as two pointers (the smoke test proves it). Sections carry `touch-action: pan-y`: vertical scrolling stays native and sideways pans belong to the swipe.

**Gestures, none of them the only way.** Swipe sideways on a section to step through the pillars (the bar does the same). Long-press any row or control with details to open its sheet (a tap on the row or its mark does the same). Pull a sheet down to dismiss it (the scrim, the close mark and Escape do the same); the pull follows the finger and only begins when the sheet's own scroll is at its top. The first drag implementation used pointer events and lost every drag to a `pointercancel` the moment the browser decided the touch was a scroll; it is native touch listeners with `passive: false` now.

**Haptics.** `src/ui/haptics.ts`: a tick on a hit, a firmer pulse on a crit, a double-pulse when the Reprisal window opens, a longer one when a Reprisal lands, a buzz when you are hurt, a triple flick on a perfect dodge, a long heavy buzz when you are unmade, a slow triple for a felled lord; one pattern per event batch, the strongest wins, hits never more than one tick per 60ms, nothing at all on idle ticks. A settings toggle; silent where `navigator.vibrate` is missing.

**Sheets over modals.** The away report is a designed sheet: the region behind, the Shades that hunted standing in it, Marrow and kills counting up, each line arriving in turn, a pull-down to return to the fire. The reallocation prompt (a `window.prompt` with a comma list, indefensible on a phone) is a sheet of six steppers with 48px targets and a confirm that names the cost.

### Round 11 — Pass 3, Milestone 4 (platform)

Artifacts: `art/mobile/m4-settings.png` (the quality control), `art/mobile/m4-install.png` (the install sheet after the first lord), `tools/audit/budget.mjs`, `tools/audit/interrupt.mjs`.

**Installable.** `tools/pwa/icons.ts` renders the lantern mark into every icon size the two stores of the web ask for (48 to 512, maskable 192 and 512 with the safe zone respected, and three iPhone splash plates on the ink ground); `assets/generated/manifest.webmanifest` declares standalone display, portrait, the theme colour and the icons; `index.html` carries the Apple meta tags. The install offer is a sheet, "Keep the Lantern", and it waits for the good moment: six seconds after the first lord falls, once, never again if declined. On iOS, where there is no prompt, the sheet says how in three lines. A build-time Vite plugin (`tools/pwa/sw-plugin.ts`) writes `sw.js` with the shell, the first region's four layers, the first two enemies, the lantern, the remains and the starting sword in the precache: the game opens without a signal from the second visit on. The cinematics chunk carries gsap and loads after the shell (a lord or a death is minutes away); the precache includes it so the first death still plays offline.

**Four tiers.** `src/vfx/quality.ts` is a set of knobs the presentation reads every frame: resolution scale, bloom, particle budget, ambient mote rate, heat shimmer, film grain, cinematic length. Cinematic is a desktop or a flagship on charge; High is bloom at 1.5x; Balanced is the phone default (native resolution, no bloom, half the particles); Battery is the picture without the weather. Auto picks from what the device says about itself (memory, cores, touch, save-data, reduced motion) and steps down one rung after two runs of forty slow frames; a tier the player pinned is never touched. Below Battery the stage hands the frame to the DOM picture as before. Rendering pauses while the page is hidden and the logic loop drops to one tick a second; the accumulator catches up in one burst when the tab returns.

**Saving.** The autosave also fires on `freeze` (a mobile OS may freeze without hiding) and within two seconds of a death, a kill, a level, a lord, a Snuffing or an unlock. `tools/audit/interrupt.mjs` proves three things against the build: hiding the tab writes a save inside a few milliseconds; a renderer killed from outside while backgrounded loses nothing (the reopened game carries every kill); a two-hour jump of the clock with the page open, and a three-hour one across a reload, both open the away report with the hours credited. The first draft of the kill test SIGKILLed the whole browser and lost ten seconds: Chromium batches localStorage commits and rate-limits them to about one a minute under steady writing. A phone kills the renderer, not the browser, so the test now does what the phone does; the finding stands as a note for anyone who wants a browser-process guarantee (IndexedDB would give it).

**Payload.** `tools/audit/budget.mjs` serves `dist/` itself with gzip (a throttled test against `vite preview`, which sends raw bytes, measures nothing real), then fails the build if the shell is over 240 KB gzipped, the precache over 2.6 MB, or a tap on Strike takes longer than three seconds to land on a 390×844 phone over 1.6 Mbps with 150 ms of latency and the CPU slowed four times. Splitting the cinematics took the shell from 199 to 170 KB gzipped and the time to a landed strike from 2.5 to 2.3 s.

**Reading the shots.** The quality control wraps to two rows of thumb-wide segments; the caption names the detected tier and what the chosen one costs. The install sheet uses the lantern plate and two 56px buttons. One thing to carry to the onboarding milestone: the first hint still says "click it (or press F)" on a phone.

### Round 12 — Pass 3, Milestone 5 (the Stair)

Artifacts: `art/mobile/m5-stair.png` (the Stair page), `art/mobile/m5-strip.png` (a run in Combat), `art/mobile/m5-boons.png` (the offer), `art/mobile/m5-haul.png` (the climb out), `scripts/shot-stair.mjs`.

**The page.** A paragraph that says the whole rule, one wide Descend button that names what floor 1 will fight like, three tiles (descents, deepest floor, banked ever), the last run in a sentence, and every boon as a row with its rarity on the right and its lore behind a tap. The stair borrows the Nadir's picture for now; it gets its own in Milestone 10.

**The strip.** Under the arena, above the hand: floor and kills on the first line with the boon count (tap for the list), the haul and what it banks on the second, Withdraw on the right at 48px. The first cut had the boon count in a tall box and the haul line truncated at "b..."; the box became text and the strip two lines.

**The offer.** Stone, not parchment: it is a decision, not reading. Three cards tall enough for name, rule and lore, bordered by rarity (ash grey, wisp blue, the fire's orange); the chosen one fills. Two buttons at the thumb: Withdraw with the exact sum it banks, and Take with the boon's name. No close mark, no scrim tap, no drag: the stair waits. The Sheet grew a `dismissable` flag for it.

**The climb out.** Haul, multiplier, banked in a ledger with the remains plate beside it; the boons carried as chips. The first capture showed ∞ for every number: the sheet was formatting a string as a Decimal.

**Cinematics.** Walking down and climbing out no longer play a region card (the stair is not arriving anywhere), and Unmade. on the stair says what the stair kept.

**A production-only crash.** Tapping a boon card crashed the page about half the time on a cold load, in the film-grain component, with React complaining about a hook's dependency list. It never reproduced in development or unminified. The grain read the quality tier through a store hook beside its effect; the tier hook is a plain subscription now and the GL-mode hook's functions are module constants. Four cold captures in a row are clean.

### Round 13 — Pass 3, Milestone 6 (Standing Orders)

Artifacts: `art/mobile/m6-orders.png` (three orders in the editor), `art/mobile/m6-picker.png` (a chip's sheet), `scripts/shot-orders.mjs`.

**The editor.** An order is a sentence laid out as chips: WHEN in the display face, then the condition, the comparison and the value as three chips with a wisp-blue edge; AND for a second condition; THEN and the action with the fire's edge. Every chip is 48px and opens a sheet; the sheet lists the choices with a line of help under each, so the player learns what Composure means by choosing it. A row carries its switch, up and down at 48px, and a red × that asks before removing. Disabled rows fade rather than vanish. The count reads "fired 388" so the player can see an order working.

**The fold.** The first capture put the Orders and Log tabs at the very bottom of the phone with nothing under them: the Combat column was a fixed flex stack, and the section inside it had no height left after the arena and the hand. It had been that way since the shell was built; the log was simply never reachable in portrait. The column scrolls as one now, and the sections inside it flow.

**The crash, closed.** The production-only crash in the film-grain component survived the tier-hook rewrite and reproduced on an unminified build: React's effect found a non-effect hook in the previous render's slot, in Grain and only in Grain. Grain was the one component with a store subscription (the GL-mode hook) followed by more hooks; Encounter uses the same subscription last and never failed, MoteField uses the tier hook without the GL one and never failed. The grain now reads its gates (perf-lite, the Battery tier) from classes the quality system puts on `<html>` and keeps a single settings subscription; eight cold captures across both flows are clean. The root cause inside React 19.2's store hook is not proven, only avoided; the note stays here for whoever meets it next.

### Round 14 — Pass 3, Milestone 7 (the Study and the forge)

Artifacts: `art/mobile/m7-study.png` (the bestiary with ranks, one entry open), `art/mobile/m7-weapon.png` (a weapon's affixes), `art/mobile/m7-forge.png` (the reforge sheet), `scripts/shot-forge.mjs`.

**The Study.** The bestiary page is now titled for what it does. A completion bar at the top (ranks held of ranks possible, and the bonus they pay), and on every row four rank pips with the kill count and a thin progress line to the next rank. An open entry names its rank and what the next one reveals; the numbers appear rank by rank on the parchment, and the line "+9% damage against it" makes the rank a weapon.

**The weapon.** Under infusions, an Affixes block: each affix a row with its tier on the left in the tier's colour (bone, wisp, the fire), its name, its effect and its set; a locked row fills. Reforge opens a stone sheet: the same rows with a lock switch each, the price with the slag count coloured by whether you have it, one button that names how many slots it rolls, and the pool as chips with the shut ones dashed. A reroll flashes the rows.

**Sets.** A row of chips under the weapon, one per set with pieces held; the chip opens the set's lore and its three bonuses, lit as they are reached.

### Round 15 — Pass 3, Milestone 8 (Afflictions and the Toll)

Artifacts: `art/mobile/m8-toll.png` (the Toll page at Dusk with two afflictions on), `art/mobile/m8-black.png` (the arena in the Black Hour), `scripts/shot-toll.mjs`.

**The dial.** One ring in four arcs, each the length of its hour and in its colour (bone for Dawn, gold for Day, verdigris for Dusk, the wisp's blue for the Black Hour), the present hour drawn thicker, a needle for now. Beside it the hour's name in the display face, its line of lore, the minutes left and the minutes to the Black Hour. Under it the hour's effects as a list, and the four hours as tiles that open their lore and effects.

**The afflictions.** Below a rule, in the blood's colour: a readout of what the carried curses multiply, and each affliction as a row with its cost in red and its gain in the fire's orange on one line, a switch at the right, and its lore behind a tap. A taken row fills with a wash of blood. The switch hums a hurt pattern going on and a tap going off.

**The Black Hour on the arena.** The header names the hour in the wisp's blue; the stage darkens at its edges with a blue-black radial wash under multiply, so the picture keeps its colour and loses its light. Dusk warms the top of the stage instead. Both are classes on `<html>` and cost nothing per frame.

**Harsh reading.** Three bullets drawn as a glyph tripped the asset audit's emoji rule and became a rotated square in CSS; three colour literals in the tints became palette mixes. The audit is doing its job.
