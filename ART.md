# Ashfall — Art Bible

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

1. **Silhouette is law.** Every enemy, boss, weapon and phantom must be identifiable in pure black at 100px. The silhouette sheet in §5 is regenerated with every asset build and reviewed; two entities that read the same means one is redesigned.
2. **One light.** The bonfire, low and warm, lights the whole interface. Highlights sit on the fire-facing edge of everything and flicker fractionally with it. There is no second light source anywhere unless it *is* a light source in the world (a lantern, a soul-arrow, the riposte flash).
3. **One accent at a time.** In any region of the screen at most one saturated colour is visible. When the riposte window is open, the rest of the frame desaturates so the ember is alone.

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
| `--ember` | `#C8560F` | The accent. Fire, active state, souls gain |
| `--ember-hot` | `#F0902E` | Highlight core, riposte flash |
| `--blood` | `#6E1212` | Damage taken, danger |
| `--blood-bright` | `#A81C1C` | Crit, death, boss phase change |
| `--verdigris` | `#3D5A4C` | Poison, rot, nature |
| `--soul` | `#5C7A99` | Souls, sorcery, cold light |
| `--gold` | `#B8912F` | Miracles, rare items, covenant seals |

Pure white and pure black are banned. Nothing is fully saturated except a light source. Semantic use is fixed: damage taken is always blood, never ember; souls are ember when *gained* and bone when *displayed*; the three schools are soul / gold / ember; poison is verdigris; frost is soul at low alpha.

Rendered swatches: `art/palette.png` (regenerated by `npm run art:bible`).

## 3. Typography

Three faces, self-hosted from `@fontsource`, declared in `src/ui/fonts.css`. `Inter`, `system-ui` and any sans body face are banned.

- **Display — IM Fell English SC.** Boss names, region titles, YOU DIED, the numbers that matter for a beat (riposte damage). Letterpress irregularity is the point; it appears large (≥ 28px) or not at all. Tracking 0.12–0.3em on titles.
- **Body — EB Garamond.** Lore, descriptions, tooltips, hints. Italic for flavour text, ragged right, leading 1.45–1.6, measure ≤ 62 characters. Lore should read as transcribed.
- **Data — Barlow Condensed.** Every number that ticks: souls, HP, damage, costs, rates, stats. `font-variant-numeric: tabular-nums` always; weights 500–600; letter-spacing 0.02em. Numbers never shift width.

Scale (px): 11 · 12.5 · 14 · 16 · 20 · 26 · 34 · 46 · 64 · 92. Labels are 11px Barlow uppercase, tracking 0.18em, bone at 70% alpha.

Type specimen: `art/type.png`.

## 4. Composition and materials

- **Panels are objects.** Three materials, each an SVG-masked surface with an irregular edge (noise-displaced path, never `border-radius`), a fire-side bevel, and grain: *stone slab* (structural panels), *scorched leather* (combat frame, squad), *nailed parchment* (tooltips, lore, trees). Materials are components in `src/render/materials/` and take a `seed` so no two slabs have the same edge.
- **Asymmetry.** The combat frame sits off-axis to the left; the hub column overlaps it and casts shadow onto it. Corner ornaments are uneven: one nailhead, one torn corner, one scorch.
- **The bonfire is the light.** A single `--fire` intensity value (0.85–1.15, flickering at ~8Hz with a slow drift) is written to a CSS variable by the render loop; every bevel highlight, rim light and glow multiplies by it.
- **Grain everywhere.** One film-grain layer over the whole app, animated at 12fps (steps), opacity 0.05–0.08. The VFX layer adds vignette and bloom.
- **Value structure first.** Backgrounds live in void→ink (L 3–10). Panels in stone (L 12–15). Text in bone/parchment (L 75–88). Art occupies the full range but its *mass* sits in the low-mid range so the one lit edge reads. A screenshot converted to greyscale must still show a clear focal point.

## 5. Silhouette sheet

Regenerated by the asset build into `art/silhouettes.png`: every enemy, boss, weapon and phantom in pure `--ink` on `--parchment` at 100px, labelled. Reviewed at every milestone.

## 6. Review log

Each milestone's screenshot-critique rounds are appended here, harshest reading first, with what was changed.

### Round 1 — Milestone 1 (bible, silhouettes, style-target mockups)

Artifacts: `art/palette.png`, `art/type.png`, `art/silhouettes.png`, `art/try-sheet.png`, `art/mockups/{A,B,C}.png`.

**Type and palette** pass: IM Fell carries a name card; Garamond italic makes lore read as transcribed; Barlow tabular numbers hold their width. No further notes.

**Silhouette sheet (61 subjects), harsh reading.** Distinct and readable at 100px: every beast (rat, hound, stalker, leech, crawler, gargoyle, drake), the golems and sentinels, the tome, the sprite, the treant, the hanged pilgrim (rope), the crowned lords, the twin sentinels, the Mire Mother's spread hem. **Failing:** the nine robed figures are one cone with a staff moved about; the eight wraiths are one shroud; the wraith crowns vanish at this size; the deserter's crossbow is a lump; hollowPilgrim / mireHollow / deepHollow are the same hunched man with different props. Fix in Milestone 2: robed figures get four body forms (cone, tall, wide, bent) and three hood forms (pointed, cowl, mitre) and their prop hand differs; wraiths get four forms (shroud, column, flayed, spire) with crowns scaled to read; humanoids get posture (upright / hunched / lunging) and a distinctive prop each.

**Plates (try-sheet).** The etched, warm-underlit look is there: broken edges, pooled wash, one light. Notes: the rim light is too white (now `#B08A5A`-tinted, lower); the ember tint overwhelmed the golem (tint strength 0.35 → 0.22); the hound's legs are sticks; interior linework is invisible at plate scale; the scattered "boss fx" glows sit on the chest and read as buttons rather than embers in the air (move them off-body in M2).

**Mockup A (off-axis frame + overlapping hub slab)** — adopted as the game's layout. Panels read as objects: irregular edges, fire-side bevel, grain, real shadow between overlapping slabs. First place the eye lands: Eskel's eyes, then the name, then the souls figure. Fails: the boss mass merges into the slab (needs either a lit fog plate behind the figure or a cooler slab), the cloak highlight streak is white, the chest glows.
**Mockup B (cinematic card)** — adopted for boss intros. Letterbox, name card with an ember rule, epithet: yes. Fails: plate too large (head cropped), HUD collides with the figure's feet, the same highlight and glow faults.
**Mockup C (bestiary page)** — adopted for lore and the bestiary. The parchment ground is the hardest test and the rig fails it: tin-can helm with a comic face, stub sword, noodle legs, no interior etching, no rope. On ink grounds darkness hid all of this. Rule adopted: **every plate is reviewed on parchment**, because a figure that only works in the dark is not an illustration.

Verdict: the direction is right and the type, palette and material language ship. The figures do not yet; Milestone 2 and 7 own that.

### Round 2 — Milestone 2 (pipeline: 153 plates, three sheets, the parchment test)

Artifacts: `art/sheet-enemies.png`, `art/sheet-enemies-parchment.png`, `art/sheet-bosses.png`, `art/sheet-weapons.png`, `art/sheet-icons.png`, `art/sheet-regions.png`, `art/silhouettes.png` (regenerated from the manifest).

**Pipeline.** Every entity in the manifest builds from `tools/assets/` with a content-hash cache, through the treatment chain in `treat.ts`, to `assets/generated/art/<kind>/<id>{@2x,}.webp` plus a silhouette mask. Full rebuild is ~7 minutes; the payload is 5.1 MB. Two resvg crashes were fixed on the way (fractional filter regions on displacement maps; every filter now declares an integer user-space region and every primitive a matching subregion).

**Parchment test (the rule from round 1).** The enemy sheet on `--parchment` now reads: robed figures come in four bodies and five hoods, wraiths in five forms, humanoids lunge or hunch, weapons are in front and sized to be seen, eyes are sunken and asymmetric or a single visor glow. The warm bonfire rim (`#B08A5A`) survives on parchment. Still failing: `ghrelt` is a slab (bulk 1.6 reads as a door), `gallowsKnight` has no rope, `deserterCrossbow` reads as a man carrying a cross, `deepHollow` is a stick figure, the interior etching (hatch, folds) is invisible below 200px. Ember "fx" glows on `cinderLordAsh`, `kilnKnight` and `charredAcolyte` still sit on the body and read as buttons.

**Bosses.** The tonal wash and one-light rim work: `mireMother`, `choirMaster`, `theUnwritten`, `abyssWatcher`, `choirOfTeeth` are the ones that would sell a boss card. `coldPyreWarden` and `choirMaster` lose the top of the head to the plate edge (rigs need 8% headroom on big plates). `lordOfCinders` has a sun on his chest.

**Weapons.** Blades read as blades; hilts and pommels help. Faults: the edge-glow dots read as gems or buttons (should be a hot line along the edge, not four spots), hammer and halberd heads are blobs, talismans and the pyromancy flame are a glow on a blob. **Icons.** Twenty motifs on rings; the seals as wax work; items enlarged. Fine at 40px; at 24px the ring dominates.

**Silhouettes at 100px.** Sixty-one subjects; fails are now few: the four hooded phantoms (`ilse`, `vesna`, `corvo`, `ysolde`) are the same cowl; `charredAcolyte` / `vigilAcolyte` share a cone; `deepHollow`.

**Regions (first cut, failed the audit).** The first region layers were flat vector shapes: the audit script's luminance-level check caught all 21 of them (four to thirteen levels each). That is the check doing its job, and the fix was to paint, not to lower the bar: each mass now carries a tonal gradient from a lit rim to a void foot, a fractal mottle, cracks, and hatching in the lower half; the sky carries an ashen cloud band, haze, motes and the region's light. The treatment chain gained a `tone: false` path for these layers so the SVG's own painting is kept rather than re-mapped through the gray ramp (which had split every hill into a saturated crown and a black skirt). A second pass was needed after the audit's spread check (standard deviation of luminance over opaque pixels, now alongside the level count at 2/255 steps): the near and foreground masses were still one brown. They now carry a two-tone mottle (lichen light, soot dark), cracks, hatching at 0.6, and an ember underlight that is a radial glow from where the bonfire sits rather than a uniform band. Kiln's near layer went from a spread of 3.4 to 8.2 and reads as scorched rock.

Verdict: the pipeline is real and end-to-end; the manifest is the only door the UI uses. Milestone 7 owns the figure faults listed above; the region sawtooth ridges and the paper-cut trees are Milestone 6's.

### Round 1 — Milestone 3 (foundation reskin)

Artifacts: `art/review/m3-fresh.png`, `art/review/m3-boss.png`, `art/review/m3-tabs-sheet.png`, `art/review/m3-states-sheet.png`.

**First screenshot, harsh reading.** The layout (mockup A) works: arena left, the hub slab overlapping its right edge, the leather side panel below. Faults found and fixed in the same round: the slab's chipped outline was clipping the first glyph of every panel's first line (the polygon was applied to a padded box: content now carries the layout classes and the polygon matches its box); the arena backdrop was a flat saturated orange band louder than the figure (darkened and desaturated at the backdrop layer until the region pass); the figure sat too small in the frame (raised to 92% of the stage); the hub covered the enemy HP figures (the arena foot now keeps 120px clear on the right); the boss card printed the title twice; the boss banner collided with the name card (moved to the foot until the cinematics milestone replaces it); the first film-grain layer was a full-viewport `feTurbulence` at 12fps (replaced by a cached noise tile jittered by background-position).

**What holds.** Slabs are objects: chipped stone, scorched leather, torn parchment for the log, hints and tooltips; each casts a real shadow on what it overlaps, and the fire-side bevel breathes with `--fire`. Gauges are nicked iron troughs with a hot leading edge, never a rounded cap. Type is IM Fell for names, Garamond italic for lore, Barlow tabular for every figure. Every enemy and boss is its illustration; weapons, spells, seals, items, phantoms and regions appear as plates through the manifest and nowhere else. No `#hex` outside `tokens.css`; no Tailwind gray; no emoji; the audit passes.

**Still wrong, carried forward.** The dark weapon plates vanish at 28px on stone (a lit well behind them helps, not enough: M7 should export an icon crop per weapon). The tabs wrap to two rows at 400px. The death overlay and the offline modal are re-dressed but not yet cinematic (M5). The region ridges are still a sawtooth (M6).

### Round 2 — Milestone 4 (VFX layer)

Artifacts: `art/review/m4-boss.png`, `art/review/m4-riposte-open.png`, `art/review/m4-riposte.png`, `art/review/m4-riposte-after.png`, `art/review/m4-sheet.png`.

**What was built.** A WebGL2 stage (`src/vfx/`, no framework: 600 lines of GL and five shaders) under the DOM HUD. It draws the four region layers (bottom-anchored cover fit, depth-scaled, drifting), the figure with its silhouette mask (status tints screened through the mask, a rim toward the bonfire read off the mask edge, a hit flash), a CPU particle pool as GL points in two blend groups (embers, ash, soul-wisps, sparks additive; blood and drips normal), then a post chain: quarter-res bloom (bright pass, two separable blurs), chromatic aberration, a shockwave ring, heat shimmer near the ground by region, an HP blood vignette, an iris, a flash, dithering. The DOM keeps the name card, gauges and numbers. Reduced-motion drops particles, shake, shock, aberration and heat, keeps tints and rim, and caps flashes at a fifth. Quality auto-degrades (1x, no bloom) after forty frames above 22ms and never bounces back. Without WebGL2 the combat frame falls back to the DOM backdrop and plate.

**Impact grammar.** Player hit: blood spray sized by damage fraction, three sparks, a short directional kick from the lower left, a scale punch on the figure and a blood flash through its mask. Crit: a 45ms freeze, a small shockwave, ten sparks. Enemy hit on the player: a kick toward the viewer scaled by damage, blood flash, aberration spike. Perfect dodge: a soul-blue flicker. Kill: wisps rise off the body (gold and ember for a lord, plus a flash and a shockwave). Status procs: a burst in the status colour and drips or sparkle while it holds. Cast: a rush of soul-coloured sparks from the player's side.

**The riposte sequence.** Window opens: particles slow to 85%, the world desaturates over ~120ms while saturated bright pixels (embers, the rim, glows) are kept hot, the figure's rim goes to ember-hot, an iris closes to 45% around the figure. First riposte hit: 80ms freeze, an ember-hot flash at 38%, a shockwave from the wound, a nine-pixel kick, aberration, sixty heavy drops thrown up and right, and the figure in the display face at 84px. Later hits in the same window only kick and spark. Window closes: everything eases back.

**Harsh reading, and what changed in the round.** First capture: the boss plate was drawn at 96% of the stage and lost its head (now 84% for bosses, 74% for the rest, feet at 11%). Second: the landing bleached the whole frame to parchment and the figure to a pale cut-out, with green fringes from an aberration term that scaled with the ring (flash is now ember-hot at 38% for 220ms, the ring's aberration contribution is 1/50th of what it was, the figure flash is ember-hot and squared). Third: every auto-attack in the window re-fired the full landing (only the first hit lands; the rest kick and spark). Fourth: the composite desaturation greyed the ember rim and the figure tint with the world (desaturation now spares saturated bright pixels; the figure's window tint dropped from 35% to 12%). The final capture is the first frame of the pass that would sit on a store page: grey world, one burning edge, the number.

**Performance.** `scripts/perf.mjs` in this container runs WebGL through SwiftShader (no GPU) and reports ~80ms frames, which measures the software rasteriser, not the layer; the DOM-only measurement before the stage was p95 13.6ms. On hardware the stage is six full-frame passes at the arena's size plus a quarter-res bloom; the adaptive drop to 1x/no-bloom is the safety net for integrated GPUs. This must be re-measured on a real machine in the final review.

**Still wrong, carried forward.** The DOM boss banner sits under the riposte number (cinematics milestone). Ash and ember rates per region are guesses until the region pass. The iris centre is the figure's chest; a boss with a raised weapon wants it higher.

### Round 3 — Milestone 5 (cinematics)

Artifacts: `art/review/m5-bossintro.png`, `art/review/m5-phase.png`, `art/review/m5-died.png`, `art/review/m5-region.png`, `art/review/m5-kindle.png`, `art/review/m5-sheet.png`, `art/review/m5-sheet2.png`.

**Built.** `src/render/cinematics/`: a sequencer (one timeline at a time, priority-ordered queue, Escape or click skips a skippable one) and the Cinema layer, DOM driven by gsap, that owns the letterbox bars, the shroud, the wipe, the flash and every card. Six sequences: boss intro (letterbox, the stage zooms from 1.18 back to 1 and dims, the name arrives from wide tracking, an ember rule draws, the epithet, the lore; unskippable the first time a lord is met, the memory kept in local storage, never in the save), phase transition (the phase name slams in from 1.25 scale with a short zoom and the mechanic line), YOU DIED (shroud to 88%, the words in blood-bright display face widening from 0.25em to 0.5em over 1.6s, the souls line, out), bloodstain recovery (a plate card with the stain brightening), region transition (a black wipe from the left, region number, name, rule, lore, wipe out to the right; fired off the store when the encounter zone changes, since a quiet travel emits no event), and the first Kindling rite (solid shroud, the bonfire plate brightening over eight seconds while four lines arrive, a parchment flash, out; Milestone 8 grows this into the full thirty-second ritual). Reduced motion runs every timeline at 55% and skips the stage zoom.

**Harsh reading.** First capture: every card was invisible. The timelines were built in the same tick as the React state change that mounts the card, so gsap found no targets; cards are now committed with `flushSync` before a timeline is built. Second: the boss card sat at the viewport's lower left, on top of the log parchment and the health gauge; boss and phase cards are now placed inside the combat frame from its measured rect, and the frame's own name card fades while a cinematic plays so the name is not printed twice. Third: the Kindling shroud let the arena ghost through (solid for the rite). Fourth: the region wipe was fine and the card on black is the cleanest card in the set; the phase card ("Backdraft") reads at a glance. YOU DIED is right: it is the one everyone knows and it does not try to be clever.

**Carried forward.** The intro's zoom is only legible in motion; the still cannot judge it. The Kindling rite needs its own scene (the ash field, the flame growing from the player's own bonfire size, the tree lighting), not a plate on black.

### Round 4 — Milestone 6 (parallax regions)

Artifacts: `art/review/regions-sheet.png` (all seven regions captured in-game with the stage running), `art/review/region-approach.png`, `art/review/region-kiln.png`.

**Built.** The stage's four layers now move: pointer parallax over the combat frame (far layer 0.15, foreground 1.3 of the pointer's throw; the figure slides between near and fore), an impact push (every kick shoves the camera and springs back at 6/s), and a slow drift per layer on its own sine. Region transitions are the Milestone 5 wipe. Region art: ridges are three octaves of seeded swell sampled densely instead of thirty jittered points (the sawtooth is gone), dead trees lean, thin to a split crown, and fork once with twigs.

**Harsh reading, all seven.** The Approach (scorched sky, dead trees, ash in the air) and the Kiln (ember arch, sooty rock, heat shimmer) are the two that sell. The Mire's green murk with reeds and the Deep's blue cold rock hold. The Archive is the weakest: the shelves are still flat blue-grey blocks and the arch is a cut-out, because that region's shapes are all rectangles and the mottle cannot save a rectangle; it needs book spines, a fallen ladder, a scatter of pages (Milestone 7). The Sanctum's gold is too even; it wants a shaft of light and darker flanks. The Abyss frame in the first sheet was a death (the blood vignette at full and the shroud), a capture error, not the region; retaken.

**Carried forward.** Archive and Sanctum shape passes; a mid-layer of hanging moss for the Mire; stalactites for the Deep. All Milestone 7, where the figure faults from round 2 also live.

### Round 5 — Milestone 7 (asset production)

Artifacts: `art/sheet-enemies-parchment.png`, `art/sheet-bosses.png`, `art/sheet-weapons.png`, `art/silhouettes.png`, `art/review/m7-probe.png`, `art/review/regions-sheet.png` (all regenerated: 153 plates, 32 weapon icons, payload 6.7 MB).

**Figures, against the round-2 list.** `ghrelt` carries a round shield and a club at bulk 1.3 instead of a door; `gallowsKnight` and the Hanged Pilgrim wear a noose that reads (a pale fibre overlay on the rope, a knot at the jaw, the tail over the shoulder; the first two attempts hid the rope behind the crest and then drew it in ink on ink); `deserterCrossbow` holds a crossbow with a bow arc, a string and a bolt; `deepHollow` gained a skull, a cloak, chains and a hunch; the four hooded phantoms are now four people (Ilse wide and veiled with a lantern, Vesna tall and bare-headed with staff and book, Corvo hunched and lunging with twin knives, Ysolde lunging with a rapier); `charredAcolyte` is a wide pointed-hood figure with its embers in the air. Boss heads fit (heights capped at 1.15; raised weapons shortened to 1.1 of reach); Eskel's eye is back in frame. `lordOfCinders` wears his sun as a corona above the crown; `kilnKnight`'s heat sits on the blade; `cinderLordAsh`'s above the head. The flank rim light is ember rather than ember-hot at 0.42, so the Keeper's cloak no longer goes white. Interior lines are 1.6× heavier and the shadow hatch stronger; they now show at 256px.

**Weapons.** Enchanted blades carry a hot line along the edge (a soft stroke under a thin parchment core) instead of four gems; the maul has a squared, bevelled head with a spike; talismans are rings on a cord. Each weapon also exports a trimmed, lifted 64px icon crop for chips and lists; dark steel now reads at 32px on stone without the lit well.

**Regions.** The Archive is a library: uprights, shelves, rows of spines with gaps, fallen books, a leaning ladder and a scatter of pages on the floor; the Sanctum and the Archive carry light shafts from above.

**Still wrong.** `pyreGolem` keeps its ember pocks on the body by design, but they read as buttons at 100px. The chime and the pyromancy flame remain a glow on a blob. `vigilMaul`'s head is better but still lumpy. The Mire wants hanging moss and the Deep stalactites. These go to the final review's punch list, not to another milestone.

### Round 6 — Milestone 8 (Kindling ritual and the meta screens)

Artifacts: `art/review/m8-tree.png`, `art/review/m8-ritual-sheet.png` (five moments of the ritual), `art/review/m8-souls.png`, `art/review/m8-sigil.png`.

**The Humanity tree** is an illuminated page: four vines on torn parchment, hexagonal medallions (diamonds for the automation gifts) joined by drawn stems that turn ember once the parent is ranked, rank pips beneath each name, the cost in ember when a node is open. The first cut hid every unranked node: the medallions were clip-path buttons whose border was clipped away, so only ranked ones showed; they are SVG polygons now with a transparent button over them. The parchment mottle was dropped from 0.45 to 0.2 because at 0.45 the page read as grey stone.

**The Kindling ritual** runs about thirty seconds in five acts: the fire dies (the plate shrinks and darkens, the glow beneath it fades); what you carried rises as ash, one line at a time from the real ledger the panel hands the sequencer; what you know settles and stays; the ember catches (the plate grows, the ember glow returns, the count climbs to the Humanity gathered); the next burning is named. It is skippable with Escape. Faults: the screen is sparse between acts, and the bonfire plate is a small object for a full-screen moment; the punch list has "ash particles rising through act II from the VFX stage" and "a larger bonfire plate with the tender beside it".

**Boss souls** are parchment pages with the lord's plate and the two one-way choices stacked; **the Dark Sigil** takes the soul-blue accent with a mark beside its name. Both hold the one-accent-per-region rule.

### Round 7 — Milestone 9 (audio pass)

Still synthesized, still opt-in. What changed: every cue now sends into a convolution reverb whose impulse is built for the region (exponentially decaying noise through a one-pole low-pass: 1.4s and bright on the Approach, 5s in the Sanctum, 7s and dark in the Abyss); each region has a drone bed (detuned oscillators under a slow-breathing low-pass, plus a texture: wind on the Approach, water in the Mire, whispers in the Archive, crackle in the Kiln, and drips or distant bells as pings in the Deep, the Sanctum and the Abyss) that crossfades on travel; a boss's arrival and each phase turn are tolled; and the hush: when a boss is within four percent of its next phase threshold everything ducks to a whisper in 0.4s, and the phase's toll lands 0.6s after it turns before the bed returns over 1.2s. The Kindling ritual's fourth act carries a five-second rising chord. `scripts/audio-check.mjs` drives all of it headless: bed on, region swap, hush on approach, release and toll after the turn, zero errors.
