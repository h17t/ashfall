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
