# Jury scores

| Direction | Originality | Relevance to Hyverno | Award potential | One-pass buildability | Perf risk (10 = riskiest) |
|---|---|---|---|---|---|
| **simulation · HEADCOUNT** | 9 | 10 | 9 | 5 | 7 |
| **gameui · BUILD 1,445** | 7 | 9 | 7 | 5 | 6 |
| **editorial · 16.6** | 7 | 8 | 8 | 7 | 4 |

**Verdicts**
- **HEADCOUNT is the backbone.** It is the only pitch where the site *is* the proof. One GPU crowd plays every role on the page: the type, the rules between rows and the project art. Ink on paper is also a fresh look against the usual black-void particle reel. It has two weak points: the scope is huge, and the formation engine can feel tweened instead of alive. We fix both with a stricter engine contract and cuts.
- **BUILD 1,445 has the best gamification instincts**: a real boot log, an `[E]` lock-on prompt, an honest quality governor and the #1,445 achievement. As a whole it tips toward a kitsch HUD (pause menu, compass, gamepad, credits roll). We take the instincts and leave the game shell.
- **16.6 has the best engineering hygiene**: build-time glyph paths for an exact DOM↔particle match, release statuses computed at runtime, native scroll on touch, grain animated through transforms, and a 65k damage-number hose. It also has the best bookend: the horde comes home in the footer. Its magenta accent and cartridge covers make it a different site, so we leave them out.

**What we grafted**
- **From 16.6:** the frame-budget meter (`/ 16.6 MS`), glyph paths baked at build time, the hero width march, the horde rebuilding the name in the footer, the Damage Number Hose, grain moved with `transform`, runtime release statuses, native scroll on coarse pointers, and prices labelled as examples.
- **From BUILD 1,445:** a boot log with real values, the `[E]` lock-on prompt, a quality governor that reports itself honestly, the Konami code unlocking achievement #1,445, Le Rongeur's bitten top-edge entrance, the `PEONS DEPLOYED` counter, the primer→paint sweep for Tabletop, and the rule of one game device per viewport.

**What we cut**
- Gamepad support, pause menu, compass ribbon, credits roll, CONTINUE countdown, magenta as the accent (it survives only on the 404), cartridge covers, and SFX on by default.

---

# HEADCOUNT: Final Art Direction Spec for hyverno.com

## 1. Concept

**Name:** HEADCOUNT

**One-line pitch:** Every mark on this page is an entity. 16,384 GPU agents spell the name, rule the tables, build each game, walk on a planet and stitch a pattern. They steer around your cursor and stay inside a 16.6 ms frame.

**Why it fits Hyverno specifically**
- **His career is a rising entity count.** It goes from one Godot sprite, to 2,000+ replicated UE4 crowd agents, to hundreds of Mass agents on a navmesh, to thousands of DOTS units on a sphere, to millions of GPU damage numbers. The site doesn't describe this work. It runs it.
- **"No external images" becomes the concept.** There are no screenshots because the portfolio is the demo reel. An optional image slot exists for each project, dithered so it reads as part of the same world.
- **Debug geometry is his visual language**: bounding boxes, quadtrees, velocity vectors and `stat unit` overlays. Here they become the ornament.
- **The game-dev flavour shows that he ships games, not Dribbble shots.** Examples: RTS selection, crit damage numbers, a d20, patch notes and a co-op lobby. His 1,444 Steam achievements get a sequel, #1,445, hidden behind the Konami code.

**The three laws**
1. **Every mark is an entity.** If something on the page moves as a group of dots, it is the crowd, not a video and not a sprite sheet.
2. **Every number is real.** Every HUD value is measured: `ENT`, `FPS`, `MS`, units selected, numbers drawn, craters and stitches. Illustrative numbers, such as prices in Le Rongeur, carry an `EXAMPLE` label.
3. **Ink on paper, one signal colour.** Dark crisp agents move over warm lab paper, like an ant farm, a scientific plot or an engineer's notebook. There are no glowing particles on black, no blur and no glassmorphism. Each project brings its own palette.

**Tone guardrail:** one game device per viewport, and every second joke gets cut. Confident, a little cheeky, never cute.

---

## 2. Visual identity

### 2.1 Palette

**Core tokens (theme `paper`, the default)**

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#ECE9E1` | Page background and "sim floor"; WebGL composites over it |
| `--ink` | `#111110` | Entities, headings, body (15.6:1) |
| `--graphite` | `#5F5E58` | Secondary text, HUD labels (5.3:1) |
| `--hairline` | `#D2CEC3` | World-grid crosses, rules, inactive ticks |
| `--signal` | `#FF4A1C` | "Aggro" colour: selected or hot entities, marquee, crits, peon, focus accents. **Graphics only** (2.8:1) |
| `--signal-text` | `#B8310D` | Signal used as text: links, the serif accent word (≈5:1) |

**Theme set.** Each theme writes the same six tokens. The theme engine is described in 2.1.1.

| Theme | paper | ink | graphite | hairline | signal | signal-text | Used by |
|---|---|---|---|---|---|---|---|
| `paper` | `#ECE9E1` | `#111110` | `#5F5E58` | `#D2CEC3` | `#FF4A1C` | `#B8310D` | Hero, README, Side-quests intro, Contracts, Patch Notes |
| `viewport` | `#0F1110` | `#ECE9E1` | `#8C8B84` | `#262826` | `#FF5A2E` | `#FF7A55` | SHIPPED (Ludogram), Lab ("in-engine") |
| `ink` | `#111110` | `#ECE9E1` | `#8C8B84` | `#2A2A27` | `#FF4A1C` | `#FF7A55` | Contact / footer |
| `earth` | `#E6E4D8` | `#14160F` | `#5A5D4F` | `#CFCDBE` | `#FF4A1C` | `#B8310D` | Crazy Planet (Earth) |
| `ice` | `#E4ECF0` | `#0F1B2A` | `#4C5D6E` | `#C8D5DD` | `#FF4A1C` | `#B8310D` | Crazy Planet (Ice) |
| `aida` | `#F3EFE6` | `#1B1B1B` | `#5F5A50` | `#DDD6C6` | `#B7332C` | `#9E2A24` | Stixiva |
| `rongeur` | `#FFF3E2` | `#2B1B12` | `#6E5444` | `#EBD9C1` | `#F2894B` | `#A4471A` | Le Rongeur (the client's brand, untouched) |

**Debug set** (only in Debug view and lab gizmos)

| Token | Hex | Role |
|---|---|---|
| `--debug-cobalt` | `#2440FF` (light) / `#5B73FF` (dark) | Quadtree, AABBs, obstacle outlines, focus brackets |
| `--debug-lime` | `#B8FF3D` | FPS ≥ 58 and "ready" states, on dark only |
| `--debug-amber` | `#FFB020` | FPS 45–57, governor warnings |
| `--missing` | `#FF00FF` | **404 page only** (missing-texture checker) |

**Chapter-local palettes** (inside project visuals only)
- **Crazy Planet, Earth:** sage `#8FA98B`, ochre `#D9A441`, ink contours. **Ice:** `#A9D6F5`, prussian `#22406B`, glint `#FFFFFF`.
- **Stixiva threads (10):** garance `#B7332C`, rose `#E8A0A6`, ocre `#D9A441`, sauge `#8FA98B`, prusse `#22406B`, lin `#E9DFC9`, encre `#1B1B1B`, corail `#F07561`, lilas `#A99AC9`, bouteille `#2F5D46`.
- **Le Rongeur:** cream `#FFF3E2`, brown `#2B1B12`, apricot `#F2894B`.
- **Density ramp** (view mode 2): paper → `#F2894B` → `--signal` → `--ink`.

#### 2.1.1 Theme engine (one source of truth)
- A single JS object holds `{paper, ink, graphite, hairline, signal, signalText}` as linear-space `[r,g,b]`.
- A section's top crossing 50% of the viewport calls `setTheme(name)`. That runs a GSAP tween of 720ms with the `arrive` ease.
- `onUpdate` writes the CSS custom properties on `<html>` and notifies WebGL listeners. Those listeners set the uniforms `uPaper`, `uInk`, `uSignal`, `uGraphite` on every material.
- The DOM and WebGL can never drift apart.
- `body { background: var(--paper); color: var(--ink) }`.

### 2.2 Typography (3 families)

| Family | Package | Import | Role |
|---|---|---|---|
| **Archivo** (variable, wght 100–900, wdth 62–125) | `@fontsource-variable/archivo` | `import '@fontsource-variable/archivo/wdth.css'`. Family `'Archivo Variable'`. Verify that `wdth.css` exposes both axes; otherwise use `full.css`. | Display, headings, body, the hero glyph source |
| **Martian Mono** (variable, wght 100–800, wdth 75–112.5) | `@fontsource-variable/martian-mono` | `import '@fontsource-variable/martian-mono/wdth.css'` (same caveat). Family `'Martian Mono Variable'`. | HUD, labels, data, damage-number atlas |
| **Instrument Serif** (400, 400 italic) | `@fontsource/instrument-serif` | `400.css`, `400-italic.css` | The "human word": at most one italic word per headline |

- Subsets: latin + latin-ext, for French diacritics. Preload only the Archivo latin woff2.
- Width is set with `font-stretch: 62%` etc., with `font-variation-settings: "wdth" 62` as the fallback.
- Numbers are always Martian Mono with `font-variant-numeric: tabular-nums`, so counters never jitter.

| Token | Value | Line-height / tracking | Setting |
|---|---|---|---|
| `--fs-mega` | `clamp(4.5rem, 1rem + 15vw, 18rem)` | 0.82 / -0.02em | Archivo 900. The hero DOM twin is fit-to-width by JS. |
| `--fs-display` | `clamp(3rem, 1.2rem + 7vw, 9rem)` | 0.88 / -0.015em | 800, wdth 70 |
| `--fs-h1` | `clamp(2.25rem, 1.3rem + 3.8vw, 5.25rem)` | 0.95 / -0.01em | 750, wdth 80 |
| `--fs-h2` | `clamp(1.625rem, 1.2rem + 1.9vw, 3rem)` | 1.05 | 650, wdth 88 |
| `--fs-h3` | `clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)` | 1.2 | 600, wdth 100 |
| `--fs-lede` | `clamp(1.125rem, 1rem + 0.55vw, 1.5rem)` | 1.4 | 400, wdth 100 |
| `--fs-body` | `clamp(1rem, 0.96rem + 0.18vw, 1.125rem)` | 1.55, max 62ch | 400 |
| `--fs-hud` | `clamp(0.6875rem, 0.66rem + 0.12vw, 0.8125rem)` | 1.3 / +0.06em | Martian 450, wdth 87.5, uppercase |
| `--fs-micro` | `0.625rem` | +0.08em | Martian 400, uppercase |

**Rules**
- Headings are always condensed.
- The serif accent word uses `--signal-text`, is scaled ×1.05, and is never bold.
- Never set a hard line break in display copy, because French runs about 20% longer.

### 2.3 Grid
- **Columns:** 12 on desktop (≥1024px), 8 on tablet (≥640px), 4 on mobile.
- **Measures:**
  - Margin `clamp(16px, 4vw, 64px)`.
  - Gutter `clamp(12px, 1.6vw, 24px)`.
  - Max content width 1680px.
  - Baseline 8px.
  - Section padding `clamp(96px, 14vh, 200px)`.
- **Helper:** a `.grid` class (`display:grid; grid-template-columns: repeat(var(--cols), 1fr)`). Items place themselves with `grid-column`.
- **World grid:** a fixed layer of 7px "+" marks in `--hairline` at every 64px intersection.
  - It translates by `-(scroll.y % 64)` px, so the page reads as a world the camera pans over.
  - Implementation: one `background-image` built from 2 `linear-gradient`s, moved with `transform`.
- **Viewport frame:** a 1px `--hairline` border inset 12px (8px on mobile).
  - Ruler ticks run every 64px on the top and left edges.
  - The left ruler shows world Y: `Y 004 280`, which is `scroll.y` in px, zero-padded and updated at 4Hz.

### 2.4 Texture
- **Grain:**
  - A 160px noise tile is generated once on a canvas at boot and stored as a blob URL.
  - It is applied to a fixed `::before` that is 200% of the viewport.
  - It moves with `transform: translate()` through `animation: grain .8s steps(8) infinite`. It is never animated with `background-position`.
  - Blending: opacity .05 with `multiply` on light themes, .07 with `screen` on dark themes.
  - It is static under reduced motion and off at the lowest quality tier.
- **Bayer 4×4 ordered dither** is the house image filter. It is used for:
  - the Density view,
  - the planet's toon bands,
  - optional media (1-bit dithered, colouring in on hover),
  - the Ink Swarm edge.
- There is no blur and no `backdrop-filter` anywhere.

### 2.5 Iconography and gizmos
There is no icon library. A custom 16px set uses 1.5px strokes with square caps:
- velocity arrow
- crosshair
- AABB corner brackets
- waypoint diamond `◆`
- spawner (circle + dot)
- node-and-wire
- keycap `[1]`
- d20
- needle
- tooth

**Brackets are the house shape.** Focus rings, hover, selection and lock-on all use four 10px corners, 1.5px thick, offset 4px from the element.

### 2.6 The entity glyph
- **At rest** (speed below 0.05 u/s): a 2.5px round dot, so particle type reads as crisp halftone.
- **In motion:** a notched dart, 7px long and 5px wide with a 30% notch, oriented along the velocity.
- **`xstitch`** (Stixiva only): two crossed SDF capsules. The top leg is 8% lighter.
- All glyphs are SDFs inside `gl_PointCoord`, so no textures are needed.

### 2.7 Z-index

| z | Layer |
|---|---|
| 0 | `body` background (`--paper`) |
| 5 | World grid, grain |
| 10 | Content DOM; Canvas2D lab cells |
| 20 | Fixed WebGL canvas (`pointer-events:none`, alpha) |
| 30 | Debug overlay DOM (AABB labels, obstacle outlines) |
| 40 | Fixed HUD |
| 50 | Cursor, selection marquee, lock-on prompt |
| 60 | Achievement toasts |
| 70 | Ink Swarm quad (drawn by the main canvas, which is promoted to z 70 during a transition) |
| 80 | Preloader |
| 100 | Skip link, `:focus-visible` brackets |

The canvas sits above the DOM, but entities treat text blocks as colliders (see S2). They walk around the copy, never over it.

---

## 3. Motion language

### 3.1 Principles
1. **Nothing teleports.** GSAP moves *targets*. Physics moves *bodies*.
2. **Stagger is a crowd.** Never use a uniform index stagger. Use a hash plus spatial order, so groups leave from one side like a stadium wave.
3. **Fixed timestep, variable render.** HUD numbers update at 4Hz with stepped eases, like a stat overlay.
4. **Debug is decoration, decoration is data.**
5. **Snap for UI, spring for matter.** Chrome snaps. Entities, cheeks and planets overshoot.
6. **Acknowledge input within one frame.** Every press shows something within 16ms. The easing comes after.

### 3.2 Named eases
Register them once with `gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase, EasePack)`.

| Name | Definition | ≈ cubic-bezier | Use |
|---|---|---|---|
| `steer` | `CustomEase "M0,0 C0.18,0.9 0.32,1 1,1"` | (.18,.9,.32,1) | Default out: reveals, HUD moves, lock-on |
| `arrive` | `CustomEase "M0,0 C0.7,0 0.2,1 1,1"` | (.7,0,.2,1) | Theme changes, Flip, time-driven formations, snaps |
| `spawn` | `CustomEase "M0,0 C0.3,1.6 0.55,1 1,1"` | (.3,1.6,.55,1) | Pops, damage numbers, cheeks, keycaps, stamps |
| `despawn` | `CustomEase "M0,0 C0.6,0 0.9,0.4 1,1"` | (.6,0,.9,.4) | Exits |
| `snap` | `CustomEase "M0,0 C0.9,0 0.1,1 1,1"` | (.9,0,.1,1) | View-mode switch, toggles |
| `tick` | `steps(4)` / `steps(8)` | — | Counters, ruler, odometers |
| `glitch` | `rough({strength:1.2, points:24, taper:'out', randomize:true, clamp:true})` | — | Invokyr HORROR only |

### 3.3 Durations and staggers

| Token | Value |
|---|---|
| `--t-ack` | 60ms (input acknowledgement) |
| `--t-micro` | 120ms |
| `--t-fast` | 240ms |
| `--t-base` | 480ms |
| `--t-reveal` | 720ms |
| `--t-morph` | 1400ms |
| `--t-page` | 1000ms (500 out + 500 in) |

**Exits** take 60% of the enter duration and use `despawn`.

**Staggers:**
- SplitText: chars 0.014 (capped at `amount: .4`), words 0.035, lines 0.09.
- Table rows 0.06. Lab cells 0.06.
- Crowd stagger is computed in-shader through `uMixSpread = .45`.

**Default line reveal:** `SplitText.create(el, {type:'lines', mask:'lines', autoSplit:true, onSplit: s => gsap.from(s.lines, {yPercent:110, duration:.72, ease:'steer', stagger:.09, scrollTrigger:{trigger:el, start:'top 85%'}})})`.

**Width march (headings only):** `--wdth` goes 125 → target over 1.1s with `steer`, together with the line reveal.
- At most 3 elements animate width at once.
- Each wrapper gets `contain: layout paint`.

**HUD decode:** labels of 24 characters or fewer cycle each character through 2 glyphs from `0123456789#/_` at 30ms each, then land. This is also used for the language swap under reduced motion.

### 3.4 Scroll
- **Fine pointer, no reduced motion:** `new Lenis({ lerp: .09, smoothWheel: true, syncTouch: false, wheelMultiplier: .9 })`.
- **Coarse pointer or reduced motion:** native scroll, no Lenis. This avoids iOS pin instability.
- **One loop for everything**, in priority order:
  ```js
  lenis?.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => runFrame(t))   // 0 scroll (lenis.raf) → 5 input → 10 sim → 20 render → 30 ui
  gsap.ticker.lagSmoothing(0)
  ```
- **Scrub values:** formation anchors `scrub: .6`; pinned narratives `scrub: 1`.
- **Ludogram snap:** `snap: { snapTo: 1/2, duration: {min:.3, max:.8}, ease: 'arrive', delay: .08 }`.
- **Refresh:** call `ScrollTrigger.refresh()` after `document.fonts.ready`, after boot and after each language switch.
- **Scroll carry:** each frame the sim shifts entities by `-Δscroll × uScrollCarry` with `uScrollCarry = .85`, while formation targets shift by the full delta. The crowd lags about 15% behind fast scrolls and then catches up, so the user feels the inertia.

### 3.5 Cursor
The custom cursor is only active with `(hover:hover) and (pointer:fine)` and no reduced motion. Otherwise the native cursor stays.

- **Default:**
  - A 10px ink crosshair following through `gsap.quickTo` (x/y, .12s, `power3`). It is snappy, not floaty.
  - In the sim it is an invisible obstacle: `uMouseR = .22` world units (≈120px at 1080p).
- **Lock-on over `[data-interact]`:**
  - The crosshair splits into AABB brackets fitted to the element rect + 6px, over 240ms with `steer`.
  - A prompt appears 8px below-right, in Martian micro: `[E] {verb}` (e.g. `[E] ROLL`, `[E] BITE`, `[E] COPY`, `[E] RUN`).
  - **Pressing E (or Enter when the element has focus) clicks the locked element.**
- **Mousedown:** the brackets scale to .9 for 80ms.
- **Click-drag on empty sim space:** an RTS marquee with a dashed `--signal` outline and a 6% signal fill.
- **`[data-cursor="cast"]`:** a crosshair plus a dashed ring showing the effect radius, read from `data-cursor-r`.
- **Debug view** adds a readout `X 0412 Y 0233` and the dashed aggro radius.
- **Keyboard `:focus-visible`** renders the same bracket component in cobalt, so focus is also a lock-on.

### 3.6 Hover rules
- **Text links:** the underline is a row of 2px dots (`radial-gradient` repeat-x). On hover it becomes marching ants: `background-position` animates over 400ms, linear, infinite. That is a small element, so the cost is fine.
- **Primary CTA:**
  - A rectangle with corner brackets.
  - On hover the brackets push out 6px (240ms `steer`) and the ink fill sweeps in `steps(4)` over 240ms.
  - The label swaps to mono `[ ENTER ]`.
- **Project titles:**
  - `font-stretch` goes 62% → 100% over 480ms `steer`.
  - An AABB label appears: `ENTITY 0x03 · 412×288`, using the real rounded rect size.
- **Table rows** (Contracts):
  - The row's rule entities spread into brackets around the row (see 5.6).
  - The name widens to wdth 100.
- Hover feedback never starts later than 60ms and never runs longer than 520ms.
- **Hover is never the only path to information.**

### 3.7 Page transitions: "Ink Swarm"
Used for `/projects/[slug]` and for the EN↔FR toggle.

1. **Out (500ms):**
   - The crowd claims owner `'transition'` and blends to the internal `fill` formation, a jittered grid covering the viewport.
   - The canvas is promoted to z 70.
   - A fullscreen quad thresholds the density RT: `alpha = smoothstep(.35, .6, density*uInkGain)`, with Bayer 4×4 dithering on the edge band. `uInkGain` tweens 0 → 6.
   - The screen fills with solid `--ink`.
2. **Navigate:**
   - `onNavigate` returns a promise that resolves when the cover is complete.
   - The language toggle calls `goto(otherLang, { noScroll: true })`, then `scrollTo('#'+currentSectionId, {immediate:true})`.
3. **In (500ms):**
   - `uInkGain` goes 6 → 0, the crowd releases, and the page's anchor formation takes over.

The canvas lives in the root `+layout.svelte`, so it survives navigation. **Reduced motion or no WebGL:** a 200ms opacity crossfade of a `--ink` div.

---

## 4. Signature moments

### S1: Spawn Wave and Width March (preloader → hero)

**Preloader stage**
- A single spawner gizmo sits at the centre of the paper screen.
- The HUD reads `SPAWNING ENTITIES 00000 / 16384`. The count is `round(progress × N)`, and N is the real tier count.

**Real progress**
- `boot.report(stage)` with weights: fonts .3 (`document.fonts.load` for the 3 families), `renderer.compileAsync()` .3, formations baked .3, first sim frame .1.

**Log column** (bottom-left, mono micro, `--graphite`):
- At most 8 visible lines, a new line at least 90ms apart.
- Every value is real:
  - `[0.014] WEBGL2 OK · MAX_TEX 16384 · DPR 1.5`
  - `[0.081] TIER HIGH · 16,384 ENT`
  - `[0.203] COMPILE crowd.vel.frag OK 3.1MS`
  - `[0.390] BAKE hero-wide · HILBERT 4.2MS`
  - `[0.611] READY`

**Spawning**
- Unspawned entities (`index > progress*N`) sit on the spawner at alpha 0.
- Spawned ones eject along a golden-angle spiral: `angle = i*2.39996`, speed 0.6–1.2 u/s.

**Landing**
- At 100%, `crowd.blend('spawn','hero-wide', 0→1)` over 1400ms with `arrive`. The crowd lands into the letters from left to right, because of the Hilbert-ordered stagger.
- The preloader's mono labels Flip into their HUD corner slots (720ms `steer`, stagger .06).

**Timing**
- Minimum 1.6s, hard skip at 4s (the sim keeps running).
- A repeat visit in the same session (`sessionStorage 'hyv.boot'`, in try/catch) plays 0.6s.
- Mobile: 4,096 entities, at most 1.2s.

**Glyph source (exact DOM↔crowd match)**
- `scripts/bake-glyphs.mjs` runs as a `prebuild` and `predev` step.
- It uses `fontkit` to open the Archivo variable woff2 from `node_modules/@fontsource-variable/archivo/files/` (verify the exact filename).
- It applies `getVariation({wght:900, wdth:125})` and `getVariation({wght:900, wdth:62})`, lays out `HYVERNO` and `1,445` at tracking 0, and writes `src/lib/gen/glyphs.json` as `{ [key]: { d: string, bbox:[x,y,w,h] } }`.
- At runtime a `Path2D(d)` is filled on an offscreen canvas at region size, then sampled. The DOM twin `<h1>` uses the same width and size.
- Fallback if the JSON is missing: use canvas `ctx.fontStretch = 'expanded' | 'extra-condensed'` where supported.

**Width March (hero pin, desktop only)**
- `pin: true, end: '+=100%', scrub: 1`. The hero claims the crowd.

| Progress | What happens |
|---|---|
| 0 → .45 | `crowd.blend('hero-wide','hero-tall', p/.45)`. The name marches from wide (wdth 125) to a tall condensed monolith (wdth 62). Both bakes fit the same region width, so the word grows taller as it narrows. The crowd moves *as type*. |
| .45 → 1 | Release. The hero releases the claim, and the Manifesto anchor (`from: 'hero-tall'`) takes over: letters break formation left to right into a free flock. |

### S2: The Crowd Reforms (the engine)

**Simulation**
- `GPUComputationRenderer` (from `three/addons/misc/GPUComputationRenderer.js`) with `SIM` = 128 (16,384) on high, 96 (9,216) on med, 64 (4,096) on low and mobile.
- `texPos` RGBA: x, y in world units (y ∈ [-1,1] equals viewport height, x ∈ [-aspect, aspect]), z = seed, w = selected flag.
- `texVel` RGBA: vx, vy, speed, age.
- Use `FloatType` when `EXT_color_buffer_float` is present, otherwise `HalfFloatType`. Coordinates are normalized, so half precision gives about 1px.
- A boot capability probe renders 1px and reads it back. If that fails, the site uses the static build.

**Formations**
- A formation is a 128×128 (SIM²) `DataTexture` RGBA32F of targets:
  - xy in [-1,1] **normalized to its region rect**,
  - z ∈ [-1,1] for 3D formations,
  - w = weight (0 = free roam).
- Optional per-slot textures: `paint` and `paintAlt` (RGBA8), plus a `flow` flag for path formations.
- **Every baker returns exactly N slots.** Spare slots get weight 0 at ambient positions, and ambient is capped at 25% of N.
- **Bakers:**
  - `glyphs`: Path2D fill → collect filled pixels → jittered-grid subsample to `fill × N` (default .75).
  - `svg`: `getPointAtLength` for stroke, or rasterize for fill.
  - `points`: a user builder.
  - `paths`: each SVG path is resampled to 64 points into a 64×P `DataTexture`. Each slot stores (pathIndex, phase). The target is `pathTex(pathIndex, fract(phase + uTime*speed))`. Used by Le Rongeur streams and the Patch Notes conveyor.
  - `ambient`: all weight 0.
- **Hilbert-sort every formation's slots** by 2D target position (order 8 curve). Entity *i* is "left-ish" in every formation, so paths stay coherent and do not cross. This is the most important trick in the engine.
- Bakes run in idle chunks (`requestIdleCallback`, 4ms slices). They re-bake when a region is resized (debounced 250ms).

**Region mapping**
- Each formation has a region: an element rect, cached by `ResizeObserver` plus `ScrollTrigger.refresh`, in `'page'` or `'fixed'` space.
- Each frame the CPU builds `uMatA` / `uMatB` (mat4). These map the normalized box to world units:
  - world x = (px − vw/2)/(vh/2)
  - world y = −(py − vh/2)/(vh/2)
  - minus scroll for page space
  - plus an optional rotation for 3D formations (orthographic: z only scales the point size by ±15%).
- **Never call `getBoundingClientRect` inside the loop.**

**Velocity shader uniforms (defaults = preset `calm`)**
- `uTargetA`, `uTargetB`, `uPaintA`, `uPaintB`, `uMatA`, `uMatB`, `uFlowA`, `uFlowB`, `uPathsA`, `uPathsB`, `uMix`, `uMixSpread=.45`
- `uSeek=6.0`, `uMaxSpeed=.9`, `uMaxForce=4.0`, `uArrive=.18`
- `uDensity` (sampler), `uSep=.6`
- `uWander=.25`, `uNoiseScale=1.8` (2D curl)
- `uMouse`, `uMouseVel`, `uMouseR=.22`, `uMouseF=8.0`
- `uObstacles[16]` (vec4 cx, cy, hw, hh, in world units), `uObstacleCount`
- `uAttract[4]` (vec4 rect), `uAttractMode[4]` (0 off, 1 fill, 2 perimeter), `uAttractF=5.0`
- `uPing` (x, y, age, strength)
- `uScrollDelta`, `uScrollCarry=.85`
- `uPanic`, `uCommand` (x, y, active), `uSelectRect`, `uSelectPass`
- `uTime`, `uDt`

**Presets**

| Preset | seek | maxSpeed | wander | sep | panic |
|---|---|---|---|---|---|
| `calm` | 6 | .9 | .25 | .6 | 0 |
| `march` | 8 | 1.2 | .1 | .8 | 0 |
| `panic` | 2 | 1.6 | 1.0 | .4 | 1 |
| `still` | 10 | .6 | 0 | .6 | 0 (reduced motion) |

**Per-entity mix**
```glsl
float s = mix(hash(id), hilbertT, .6);
float m = smoothstep(s*uMixSpread, s*uMixSpread + (1.-uMixSpread), uMix);
vec3 target = mix(project(uMatA, tA), project(uMatB, tB), m);
float weight = mix(tA.w, tB.w, m);
```

**Forces** (summed, clamped to `uMaxForce`)
- **Arrive-seek:** `desired = normalize(d) * uMaxSpeed * min(1., len(d)/uArrive)`, times `uSeek` times weight.
- **Separation:** `-grad(density)*uSep`.
- **Curl wander:** ×4 when weight = 0, and ×4 again by `uPanic`.
- **Cursor:** radial push `(1-d/R)²*uMouseF`, plus a tangential flow-around term of 0.6×. The crowd *parts* around the cursor instead of bouncing off.
- **DOM obstacles:** a rounded-box SDF push inside a 0.04u margin.
- **Attractors:** fill = seek toward the nearest point inside the rect; perimeter = seek toward the nearest point on the rect's edge.
- **Ping ring:** an impulse when `abs(dist - 1.4*age) < .06`.
- **Damping:** `exp(-2.2*dt)`.
- **Integration:** semi-implicit Euler, dt clamped to 1/30, at most 2 substeps. The position shader also applies `pos.y -= uScrollDelta*uScrollCarry`.

**Density pass**
- Points are rendered additively into a 256×256 RT (128 on low) with `generateMipmaps: true`, using Gaussian splats `exp(-r²*4)*.25`.
- If mip generation on HalfFloat fails the probe, fall back to an RGBA8 RT with `clamp(density*.25)`.
- It is reused by separation, the Density view, the quadtree and Ink Swarm.

**Render pass**
- `THREE.Points`. The `ref` attribute gives each vertex its sim uv.
- `gl_PointSize = uSize(7.) * dpr * mix(.85, 1.25, speedN)`.
- The fragment shader rotates `gl_PointCoord` (with y flipped) by the heading and blends dot → dart by speed. For `xstitch`, it draws two capsules.
- Colour: `mix(ink, paint, uPaintMix)`. Selected or panicking entities use signal.
- **Scan line:** `uScan` (vec3: nx, ny, d in px). Fragments with `dot(gl_FragCoord.xy, n) < d` use `paintAlt` and `uGlyphAlt`. Stixiva uses this for its conversion scanline and Tabletop for its paint sweep.
- **Named entities:** an 8×1 RT of named slot positions, read with `readRenderTargetPixelsAsync` every 3 frames.

**The DOM is level geometry**
- Every `[data-collider]` (paragraphs, headings, cards) registers its rect.
- Each frame the CPU picks the 16 colliders nearest the viewport and passes them as `uObstacles`.
- The crowd flows around the copy like water around stones.

**Scroll protocol**
- `use:formation={{ id, source, from? }}` creates a ScrollTrigger from `top 80%` to `top 20%` with `scrub: .6`.
- `onUpdate` calls `crowd.blend(from ?? previousAnchor.id, id, progress)`.
- The formation holds at progress 1.
- Fast flicks just retarget, and the physics absorbs the discontinuity.
- Pinned sections call `crowd.claim(owner)` on enter/enterBack and `release` on leave/leaveBack. While the crowd is claimed, anchors do not write.

### S3: Aggro and Crits (ping, damage numbers, RTS, lock-on)

**Click on empty space (ping)**
- Sets `uPing`. A shockwave ring shoves entities outward.
- It also spawns 12–40 **GPU damage numbers** along the ring, as a tribute to his Advanced Draw Number plugin.
- The first ping unlocks *First Blood*.

**Damage numbers**
- **Structure:**
  - `InstancedBufferGeometry`, one quad per number.
  - A ring buffer of 4,096 (global overlay).
  - Writes use `attribute.addUpdateRange()`, so there is no full re-upload.
- **Attributes:**
  - `aSpawn` (x, y, t0)
  - `aValue`
  - `aFlags` (crit, digit count, glyph)
  - `aVel`
- **Atlas:** Martian Mono 800 at 64px, glyphs `0–9 ! •`, drawn at runtime into a 768×80 `CanvasTexture`.
- **Digit extraction:** the fragment shader extracts digit *k* with `floor(mod(value/pow(10.,k),10.))`.
- **Motion** over t ∈ [0, .9s]:
  - Scale 0 → 1.35 at .12s, settling to 1 by .3s (`spawn` curve in GLSL).
  - Rise 60px, drift ±15px, fade from .7s.
- **Crits:** 10% of numbers. They are ×1.6 size, signal-coloured, carry a `!` suffix and multiply the value by 2.5.
- **HUD:** `NUMBERS DRAWN` accumulates across the visit.

**Drag (RTS select)**
- On mouseup, a one-shot pass writes `texPos.w = 1` inside `uSelectRect`. Selected entities turn signal.
- **The count is real:** selected points render additively into a 1×1 float RT, read with `readRenderTargetPixelsAsync`. The HUD shows `142 UNITS SELECTED`.
- **The next click is a move command:** `uCommand` makes the selected units arrive at that point.
- Esc or a click on empty space deselects.
- Selecting 500 or more unlocks *Crowd Control*.
- RTS selection is a mouse-only bonus.

**Lock-on `[E]`**
- See 3.5. It turns every interactive element into a game prompt without a game shell.

### S4: View Modes and Achievement #1,445

**View modes.** Keys `1–4` or the bottom-left HUD keycaps switch between them.
- **Transition:** `snap` ease, 240ms, with a stepped scanline sweep (`steps(8)`) applying the new mode from top to bottom.

| Mode | What it shows |
|---|---|
| **[1] LIT** | The default. |
| **[2] DENSITY** | A fullscreen quad shows the density RT through the ramp (paper → apricot → signal → ink) with Bayer 4×4 dithering. A heatmap of the crowd. |
| **[3] DEBUG** | The full instrumentation overlay. Details below. Unlocks *Wireframe Enjoyer*. |
| **[4] IDS** | Each entity is coloured `hsv(hash(id), .55, .85)`. The colours persist through every formation, a nod to persistent GPU IDs in Niagara. Scrolling makes the Hilbert mapping visible. |

**[3] DEBUG overlay**
- **Shader quadtree:** for each pixel, loop L = 1..7.
  - Sample `textureLod(uDensity, cellCentre(L), 8.-float(L-1))` and subdivide while the mean exceeds `uQuadThreshold = .02`.
  - Draw 1px cobalt lines on the edges of the deepest cell.
  - It is a real adaptive quadtree, computed per pixel from mipmaps.
- **Velocity vectors:** a `LineSegments` pass draws every 4th entity from `pos` to `pos + vel*.08`.
- **DOM labels:** AABB brackets on every collider, labelled `p.copy · 512×184`, plus obstacle outlines and the cursor aggro ring.
- **Stats panel:** draw calls, `SIM MS`, `RENDER MS`, programs and an FPS sparkline. Values come from `renderer.info` and `EXT_disjoint_timer_query_webgl2` where available, otherwise CPU timings labelled `CPU`.

**#1,445**
- **Trigger:** the Konami code `↑↑↓↓←→←→BA`. On touch devices, tap the HUD build tag 7 times.
- **Payoff:**
  - All tweens pause for a 120ms "hitch".
  - The crowd claims owner `'konami'` and forms the `1,445` glyphs for 2.4s, then releases.
  - The HUD trophy odometer rolls `1,444 → 1,445` digit by digit (`spawn`, stagger .06).
  - Toast: `ACHIEVEMENT #1,445 · DEVELOPER MODE`, *"His 1,444 Steam achievements, plus you."*
  - [4] IDS mode gets a gold-rimmed keycap from then on.

### S5: Floor → Planet (Crazy Planet Survivor)
The flat crowd wraps itself into a world. The section is pinned for 300vh, `scrub: 1`, and claims the crowd.

| Progress | Phase | What happens |
|---|---|---|
| 0 → .25 | **Disc** | The global crowd blends to `planet-disc`. Its targets are the *screen projections* of the planet entities' initial 3D positions, computed on the CPU with the exact planet camera and matrices. Back-hemisphere entities are placed on the rim. |
| .25 → .32 | **Handoff** | The planet sim is initialised with the same 3D positions. `crowd.setAlpha` goes 1→0 while planet entities go 0→1 over 150ms at identical screen positions. The sphere draws in with a contour sweep (`uReveal`: discard height bands above the value, 600ms). If the seam error is above 2px, the crossfade hides it. Ship the crossfade first and perfect the seam later. |
| .32 → .85 | **World** | Scroll drives planet `rotation.y` 0 → 1.4π and a camera dolly (z 3.6 → 2.9). Entities chase a signal "player" dot that wanders on the surface. An auto-spell fires every 2s. A click raycasts the sphere (analytic ray–sphere on the CPU) and casts there. At .45–.6 the biome tweens Earth → Ice, with the theme switching to `ice`. |
| .85 → 1 | **Release** | The reverse handoff through the same disc, with a 200ms crossfade. Then the crowd releases. |

**Planet**
- **Geometry:** `IcosahedronGeometry(1, 40)` (detail 20 on low).
- **Shared GLSL height function:** `terrain(n) = fbm(n*2.2)*.08 + Σcraters`.
- **Craters** come from `uCraters[8]` (xyz = direction, w = depth), a ring buffer. With `a = acos(dot(n,c.xyz))` and `r = .22`:
  - bowl `-w*(1.-(a/r)*(a/r))` for a < r,
  - rim `.3*w*exp(-pow((a-r)/.05, 2.))`.
- **Crater animation:** depth tweens 0 → .12 over 400ms with `spawn`.
- **Shading:**
  - 3-step toon (paper / graphite / ink) with Bayer dither between bands.
  - Ink iso-height contours: `step(.92, fract(h*40.))`.
  - 1px ink rim (fresnel step).
  - Ice swaps the palette and adds a stepped specular glint.
- **No atmosphere glow.** Instead there is a dashed orbit-ring gizmo with mono labels (`CRATERS`, `ENT`) riding it.

**Planet entities**
- **Simulation:** a separate GPGPU (128×64 high, 64×64 med, 32×64 low).
  - Position = unit normal, w = hop height. Velocity is tangent.
  - Each step:
    - `v += tangent(toward player)*accel + curl*.2`
    - `v -= dot(v,p)*p`
    - `p = normalize(p + v*dt)`
- **Crater impulse:** a tangential push plus a hop (w). 30% of the entities caught in a hit respawn at the antipode.
- **Rendering:** an `InstancedMesh` of 4-sided cones. The basis comes from (normal, velocity) in the vertex shader, and each cone is placed at `1 + terrain(p)`.
- **Spell hits** spawn crit damage numbers at the projected hit point.
- **HUD (real):** `ENTITIES ON SPHERE 8,192 · CRATERS 3/8 · BIOME EARTH`. Eight craters unlock *Planet Breaker*.

---

## 5. Section choreography (page order)

**Section contract.** Every section root is `<section id data-section use:themeSection>` with a mono index label (`02 / README`) on col 1.

### 00 · Preloader: SPAWN
**Layout:**
- Paper background.
- Spawner gizmo at the centre.
- The counter `SPAWNING ENTITIES 00000 / 16384` bottom-right in `--fs-h2` Martian.
- The log column bottom-left, inside the viewport frame.
- Stage labels cycle: `SPAWNING ENTITIES` → `COMPILING SHADERS` → `BAKING FORMATIONS` → `READY`.

**Motion:** as in S1. Labels Flip into the HUD on exit. The counter drops out (300ms `despawn`).

**Tone:** dry engine log. One joke at most: `[0.611] WARMING PSO CACHE… JUST KIDDING, THIS IS THE WEB`.

**Mobile:** 6 log lines, 4,096 entities, at most 1.2s.

**No WebGL:** 400ms, the log ends with `WEBGL2 UNAVAILABLE · STATIC BUILD`.

### 01 · Hero: HYVERNO
**Layout:**
- The swarm forms HYVERNO (wdth 125) across 10 columns, vertically at 42%.
- The DOM `<h1>` twin sits at the same position and size. It is visually hidden while WebGL runs and visible as the fallback. It contains a visually hidden "Gameplay Programmer & Technical Artist".
- The lede sits on cols 2–7 under the name.
- The hint sits bottom-centre: `DRAG TO SELECT · CLICK TO PING · PRESS [3] TO SEE THE WIRES`.

**HUD corners** (persistent, see 5.10):
- Top-left: `HYVERNO /SIM v3.0`.
- Top-centre: the anchor nav `WORK · SIDE QUESTS · LAB · CONTACT`.
- Top-right: `EN / FR`, `SFX OFF`, `⚙`.
- Bottom-left: view-mode keycaps `[1] [2] [3] [4]`.
- Bottom-right: the stats line.

**Motion:**
- Lede lines rise (720ms `steer`, stagger .09) 200ms after the formation settles.
- Idle stadium wave every 7s: a vertical sine band (amplitude .03u) sweeps left to right over 1.2s.
- The cursor parts the letters, and they re-arrive.

**Scrub:** the Width March (S1), then the release into README. The lede exits at y −40px while fading out.

**Mobile:**
- No pin and no width march: the crowd lands directly in `hero-tall`, fit to 92vw.
- Tap pings. `touch-action: pan-y` stays, so a tap never blocks scrolling.
- The wave plays once on load.

**No WebGL:** the DOM h1 is filled with a halftone dot pattern (`background-clip:text` with a `radial-gradient` dot tile). `font-stretch` scrubs 125% → 62% over the first 100vh.

### 02 · README (manifesto)
**Layout:**
- A big statement in `--fs-h1` on cols 2–11, with one serif italic word.
- A stats row below.
- The crowd is in `readme-flock`, an ambient formation (weight 0, preset `calm`) bounded to the section.

**Motion:**
- SplitText lines reveal on scroll (`scrub: 1`, start `top 75%`, end `bottom 45%`).
- As each line reveals, attractor *k* is set to that line's bbox in `fill` mode for 900ms. A cluster swarms in, the line materialises, and the cluster disperses.

**Stats row:** five counters in Martian `--fs-h2`. On enter they tick up with `steps(8)` over 1.2s, stagger .09.

| Value | Label |
|---|---|
| `~7` | `YRS OF CODE` |
| `3` | `STUDIO TITLES` |
| `2,000+` | `REPLICATED ENTITIES` |
| `6000×` | `FASTER THAN UMG` |
| `1,444` | `STEAM ACHIEVEMENTS` |

**Mobile:** reveals use `toggleActions: 'play none none reverse'` instead of scrub. The stats wrap 2 + 3.

### 03 · SHIPPED: Ludogram (theme `viewport`)
The theme flips to dark over 720ms: "we're in-engine now".

**Layout (desktop)**
- Intro label `03 / SHIPPED · LUDOGRAM`.
- Pinned `+=200%`, with 3 slots snapping at `1/2`.
- **Left, cols 1–5: the mission-brief panel** (`data-collider`):
  - title in `--fs-display`
  - role chip
  - publisher · platforms
  - a release line (computed at runtime)
  - the reception as a HUD line
  - the line copy
  - `[E] SPEC SHEET →` link to `/projects/[slug]`
- **Right, cols 6–12: the formation region** (`.stage`, fixed space).
- **Footer ticker:** `01/03`.
- **Optional media slot:** a 1-bit Bayer-dithered capsule that colours in on hover.
- Publisher names only, no logos.

**Runtime status**
- The page is prerendered with the static dates. `onMount` recomputes with `releaseStatus()`.
- Today (2026-10-04):
  - Monsters: `OUT NOW · PC (STEAM, GAME PASS) · XBOX SERIES`.
  - Tabletop: `OUT NOW · STEAM`.
  - Invokyr: `EARLY ACCESS IN 4 DAYS`. After 2026-10-08 it becomes `OUT NOW · EARLY ACCESS`.
- All dates are formatted with `Intl.DateTimeFormat(lang)`.

**Slot 1: Monsters are Coming! Rock & Road** (Raw Fury · Gameplay Programmer)
- **Formation `ludo-city`** (`points` builder, preset `march`):
  - 20% of slots form a walking city: an SVG path of houses on stilts, sampled.
  - 80% form a weight-0.3 horde clustered behind the city.
  - Scroll inside the slot translates the region right by 15% of its width. The city keeps moving and the horde chases it.
- **The peon:**
  - One named slot `peon` is permanently signal-coloured.
  - A live DOM label follows it: `PEON #4471 (DISPENSABLE)`.
  - Clicking the label "despawns" it: a crit burst at its position, then it respawns at the city. `PEONS DEPLOYED: n` counts up.
- **HUD:** `PC NOV 2025 · XBOX SERIES AUG 2026 · STEAM: VERY POSITIVE`.

**Slot 2: Tabletop Game Shop Simulator** (Knight Fever Games · Gameplay Developer)
- **Formation `ludo-shelves`:**
  - Entities snap into stocked shelves: blocks of 4×6 in 3 rows.
  - `paint` is primer `#7A7A7C`. `paintAlt` is a 5-colour mini palette per block (`#B7332C #22406B #D9A441 #2F5D46 #ECE9E1`).
- **Primer → paint:** slot progress .2→.6 sweeps `crowd.setScan({angleDeg: 30, offsetPx})` across the stage. The minis get painted.
- **Mystery pack:**
  - At .6, one block bursts with the `spawn` ease (a local ping) and reveals one signal "rare mini" with the label `RARE PULL`.
  - `[E] OPEN PACK` replays it.
- **HUD:** `RELEASED MAY 28 2026 · STEAM`.

**Slot 3: Invokyr** (Gameplay Developer / Network)
- **Formation `ludo-d20`:**
  - Entities trace the 30 edges of a d20 as 3D targets (`IcosahedronGeometry(1,0)` edges, deduplicated).
  - The shape is rotated through `uMatB`.
- **The roll** happens on slot enter, or on `[E] ROLL`:
  - 1.4s tumble with `spawn`, landing on a random face. The result shows in `--fs-display` Martian.
  - **≥11 "HOPE":** preset `calm`, ordered.
  - **2–10 "HORROR":**
    - preset `panic` for 1.8s (wander ×4, flee from centre, signal tint),
    - the HUD text jitters with `glitch` for 600ms.
  - **1:** HORROR, and the theme `signal` flashes twice.
  - **Nat 20:** a confetti burst of 40 crits. Unlocks *Crit Happens*.
- **Netcode nod:** three AI ghost cursors (P2–P4) wander as extra obstacles, labelled `P3 · RTT 48MS`. The RTT values are simulated and change every 2s.
- **HUD:** `CO-OP 1–4 · DEMO 94% (1,100+ REVIEWS) · EARLY ACCESS OCT 8 2026`.

**Tone:** "Shipped. On Steam. With reviews and everything."

**Exit:** the crowd releases on leave. The Side-quests anchor declares `from: 'ludo-d20'`.

**Mobile:**
- No pin. Three stacked cards of 100svh, with the stage above the text.
- Each formation triggers on enter (`toggleActions`, 1.4s `arrive`), not scrubbed.
- The d20 rolls on tap. The scan sweep auto-plays.

### 04 · SIDE QUESTS (personal projects)
**Intro** (`paper`):
- Label `04 / SIDE QUESTS`.
- Headline "Built after hours. *Shipped* anyway."
- Formation `sq-intro`: three waypoint diamonds made of entities, one per project, connected by dotted paths.

The rhythm is deliberate: pinned (planet), pinned (Stixiva, short), then free scroll (Rongeur), to avoid pin fatigue.

#### 04a · Crazy Planet Survivor (themes `earth` → `ice`)
**Layout:**
- Pinned 300vh (S5).
- Copy panels on the left, cols 1–4, as colliders. They step through three short panels:
  1. "What it is": a survivors-like on spherical planets.
  2. "The stack": `Unity DOTS/ECS 1.3 · URP · Unity Physics · VFX Graph · FMOD`.
  3. "The flex": procedural destructible, terraformable planets.
- The stage takes cols 5–12.
- Toggle chips `[EARTH] [ICE]` swap palette and noise (240ms `snap`). They also override the scroll-driven biome until the next scrub past .45–.6.
- Status chip: `IN DEVELOPMENT`.
- Micro disclaimer: *"Web recreation in three.js. The real one runs on DOTS."*

**Interactions:**
- Click casts at the hit point (cursor `cast`, `data-cursor-r` = crater radius in px).
- Keyboard: Space casts at the visible centre, ←/→ nudge the yaw.

**Mobile:**
- No pin. The planet auto-rotates with 2,048 entities at detail 20.
- No disc handoff: the global crowd parks at the section edges.
- Tap casts.

**No WebGL:** an SVG sphere with contour ellipses and crater circles, plus CSS-animated dots on an orbit path.

#### 04b · Stixiva (theme `aida`)
**Background:** the Aida weave, `radial-gradient(circle, rgb(0 0 0 / .08) 1px, transparent 1.6px) 0 0 / 10px 10px` over `#F3EFE6`.

**Layout:**
- Pinned `+=150%` on desktop.
- **Left, cols 1–7:** the stitch stage (region of formation `stix-grid`).
- **Right, cols 8–12:** the pattern panel (Canvas2D), legend chips, copy and the `PUBLIC BETA` chip.
- **Mock toolbar**, kept in French in both languages: `Atelier · Palette de fils · Grille · Exporter le PDF`. Joke line: "UI in French. Embroidery is serious business."

**Formation `stix-grid`:**
- A 72×48 grid of 3,456 entities. Remaining entities line the hem as a dotted border.
- **Source:** a procedural polar rose (`r = cos(5θ)`) with a radial gradient on a 72×48 Canvas2D. The optional image slot replaces it.
- `paint` = the raw source colour.
- `paintAlt` = the quantised thread colour: k-means k=10 fitted at init on the 3,456 pixels, each cluster snapped to the nearest thread in the palette with weighted RGB (2,4,3).
- `DITHER ON/OFF` re-runs the mapping with Floyd–Steinberg and calls `crowd.setPaint` (cheap, no re-bake).

**Scrub:**
- Progress 0→.8 moves the scanline `setScan({angleDeg: 0, offsetPx})` left to right across the stage.
  - Left of the line: `xstitch` glyph in thread colours.
  - Right of the line: dots in source colours.
  - The image becomes a stitchable pattern before your eyes.
- The pattern panel scans in sync:
  - a cross-stitch chart with one symbol per colour (`● ▲ ■ ◆ ✚ ○ △ □ ◇ ✕`),
  - a bold grid line every 10 cells,
  - a legend with live stitch counts.
- Reaching .8 unlocks *Cross My Heart*.

**Interactions:**
- Hovering a stitch cell (cursor → cell math from the cached region) shows a mono tooltip `FIL 07 · CORAIL · ×214 POINTS`.
- `[E] PDF EXPORT`: a stepped "print" scan (`steps(12)`, 600ms), then an A4 DOM sheet of mono symbols slides up, rotating −4° → 0 (720ms `steer`). It is labelled `APERÇU / PREVIEW`.

**Copy:** French UI, public beta, `PixiJS WebGL · Tauri/Rust core · React/TypeScript · PDF pattern export`. The paywall appears only as "Pro tier coming."

**Mobile:** no pin. A 48×32 grid. The scanline plays on enter over 2.4s. Tap a cell to see its tooltip.

**No WebGL:** a CSS X-stitch made of two `repeating-linear-gradient`s over a static Canvas2D pattern chart.

#### 04c · Le Rongeur (theme `rongeur`, brand takeover)
**Entrance:**
- The section's top edge is an SVG path with 5–7 seeded semicircular bites. Cream rises over it.
- Pépite peeks out of the largest bite (y 40px → 0, `spawn`).

**Layout (free scroll, no pin):**
- **Headline:** "IL RONGE LES PRIX." in `--fs-display`, French in both languages, with "It gnaws prices." in Instrument Serif italic below.
- **The hero price:** a giant `249,99 €` in Archivo 900 wdth 62, on cols 1–7.
  - Micro label: `PRIX EXEMPLE / EXAMPLE PRICE`.
- **Pépite** on cols 8–12.
- **Merchant line**, mono and text only: `FLUX OFFICIELS: EBAY · FNAC · DARTY · …`.
- **Stack line:** `SvelteKit · Drizzle · official merchant APIs and feeds`.
- **Dividers:** decorative "bitten" generative blobs (a superellipse plus 1–3 circular bites, seeded per visit).

**Motion:**
- **The Gnaw:**
  - Each scroll step (4 ScrollTriggers at 30/45/60/75% of the section) adds a bite to the price: a CSS `mask-image` stack of `radial-gradient` circles on the edge, each with a main circle and 2 small "tooth" satellites. Each bite lands with `spawn` over 240ms.
  - The price ticks down `249,99 → 219,49 → 197,00 → 184,90` with `steps(6)`.
  - Then the stamp `RONGÉ −26 %` lands: rotated −8°, scale 1.4 → 1, `spawn`.
- **Formation `rongeur-stream`** (`paths` kind, speed .12, apricot paint):
  - Entities become round apricot "deals" streaming along 5 curved paths from the mono merchant labels into Pépite's cheeks.
  - Every 1.2s a crumb stream "arrives" and the cheeks inflate.

**Pépite** (procedural SVG):
- Brown body ellipse, cream belly, apricot cheek ellipses, ear circles, and eye dots with glints. Three hairline whiskers.
- Pupils track the cursor, clamped to 3px.
- Blinks at random every 2.5–6s (eyelid scaleY 1 → .1 → 1 over 120ms).
- Nose wiggles every 2.4s.
- Cheeks scale 1 → 1.35 with `spawn` on each arrival, and 1 → 1.6 cumulatively with your bites.

**Interactions:**
- `[E] BITE` / click on the price bites at the cursor (maximum 12).
- Each bite bursts 8 apricot crumbs: damage numbers with the `•` glyph and gravity.
- The price drops a random 2–9%.
- The first bite unlocks *Gnawed*. Twelve bites unlock *Cheeks Full*.

**Exit:** the cream gets bitten away at the bottom edge (a mirrored bite path) to reveal the dark Lab. Pépite waves (a paw rotate ±12°, twice).

**Mobile:** auto-bites on enter, crumbs ×0.5, tap to bite.

### 05 · LAB: R&D (theme `viewport`)
**Layout:**
- Header "Things that shouldn't run this fast." with the label `05 / LAB`.
- A 3×2 grid of "editor viewports", each with a toolbar `PERSPECTIVE · LIT · REALTIME ●`. Each cell is 16:10.
- Below the grid, a one-line spec per cell (title, engine, tags, metric).
- **WebGL cells** use one renderer with `setScissor/setViewport` at cached rects.
- **Canvas2D cells** are their own `<canvas>` elements in the DOM.
- Only cells visible to an IntersectionObserver run. The hovered or focused cell runs every frame and the others every 2nd frame.
- **Formation `lab-gutters`:** the global swarm parks in the grid gutters as marching columns of dots, so the crowd becomes the grid lines.

**Cells** (each labelled "web recreation" in the toolbar tooltip):

1. **CROWD SIM (UE4 + Flecs)** — Canvas2D.
   - 2,048 agents, with a JS quadtree rebuilt per frame and drawn in cobalt.
   - `[Q]` toggles the quadtree.
   - HUD: `2,048 AGENTS · QUADTREE DEPTH 7`.
   - Spec: 2,000+ replicated entities, Flecs ECS in C, recoded collision, quadtree and line traces, persistent GPU IDs in Niagara.
2. **ADVANCED DRAW NUMBER** — WebGL. The **Damage Number Hose**, `createDamageNumbers({capacity: 65536})` (8,192 on low).
   - Holding the pointer, or `[E]`, spawns 40 numbers per frame on ballistic arcs: `p = o + v*age + .5*g*age²`, g = 900px/s².
   - HUD (real): `ON SCREEN 31,204 · DRAW CALLS 1 · JS 0.4 MS`.
   - Copy: "The UE plugin: 6,000× faster than UMG widgets, replicated, GPU-driven. This is its WebGL cousin."
   - 20,000 on screen unlocks *Bullet Hell*.
3. **SYSTEM IN SYSTEM (Niagara)** — WebGL Points.
   - 64 parent rockets, each an emitter of 64 sparks: 4,096 GPU points, with analytic motion in the vertex shader.
   - An SVG node graph sits beside it (`Spawn → Update → Emitter[child] → Render`), and its wires pulse on each spawn.
4. **NAVMESH × MASS** — Canvas2D.
   - A cobalt triangulated mesh (a precomputed JSON of ~120 tris) with 5 obstacles.
   - A BFS flow field on a 48×27 grid, recomputed when the target changes.
   - 300 agents path to the cursor, or to a wandering target on touch.
5. **GERSTNER WATER** — WebGL. A 128² plane with 4 Gerstner waves, rendered as ink contour lines (`fract(height*24.)`).
   - Live sliders for steepness Q (0–1) and wavelength (0.5–4).
   - Spec: an HLSL Gerstner material.
6. **REPLICATION** — Canvas2D.
   - A split `SERVER | CLIENT` view with a latency slider (0–300ms) and an `INTERP ON/OFF` toggle. The jitter is visible, then fixed.
   - Below it, a 4-slot lobby and a 3×4 inventory grid mirror moves with the simulated lag.
   - Spec: multiplayer inventory and lobby.

**Motion:**
- Cells reveal with an AABB draw-on: brackets grow from 0 to full (480ms `steer`, stagger .06), then the toolbar decodes.
- Hovering a cell dims the others to 40% (240ms) and its `REALTIME ●` turns signal.

**Mobile:**
- Cells stack vertically. Only the cell closest to the viewport centre runs.
- The hose is capped at 8,192.

**No WebGL:** the WebGL cells show static procedural SVG stills.

### 06 · CONTRACTS (theme `paper`)
**Layout:** a quest-log table with columns `CLIENT · ROLE · STACK · STATUS`. Names are in `--fs-h1` (wdth 80).

| Client | Role | Stack | Status |
|---|---|---|---|
| **OVHcloud** | `MISSION` | `—` | `✓` |
| **Stoetzel Sonorisation** | UI/UX + front-end | Svelte, Express | `✓` |
| **Qanga** | UI design integrated in Unreal Engine | Unreal Engine | `✓` |
| **Assorted** | Discord webhooks, tools, Figma integrations | — | `✓` |

OVHcloud gets nothing more anywhere: no tooltip, no hover detail, no description, in any language or alt text.

**Community log** (a second, smaller table):
- **Asynconf:** dev conference and coding competition. Organised, moderated and corrected ~300 exercises across editions 1, 2 and 4.
- **Unreal community Discord:** helps devs with terrain gen, Niagara and data. Ongoing.

**Motion:**
- **The horizontal rules are entities.** The `contracts-rules` formation is a `points` builder that measures each `<tr>` rule from `ctx.el`.
- Rows reveal with a stagger of .06. The `✓` strokes draw on (280ms).
- Hovering a row sets attractor 0 to the row rect in `perimeter` mode. The rule entities spread into AABB brackets around the row (480ms `steer`), and the name widens to wdth 100.
- Reaching this section unlocks nothing. Restraint.

**Tone:** "Parties I've joined."

**Mobile:** rows stack as cards, and the rules are static dotted CSS.

### 07 · PATCH NOTES (experience, theme `paper`)
**Layout:**
- A vertical changelog with the spine at col 2.
- A sticky version number in `--fs-display` Martian on cols 1–3 rolls (`steps(4)`) as entries pass.
- Formation `patch-spine` (`paths` kind, speed .05): entities flow down the spine like a conveyor and cluster at a waypoint diamond for each version.

**Version blocks** (no dates; the order must be confirmed by Hyverno; optional `date` fields render only if filled):

| Version | Entry |
|---|---|
| `v0.1` | Hello, Godot: a top-down game |
| `v0.2` | First website: a shop selling game accounts |
| `v1.0` | Freelance web design and front-end |
| `v1.4` | Web TechArt: three.js, Three.js Journey certified |
| `v2.0` | ISTIC Rennes (programming faculty) |
| `v2.5` | Into the engine: water, explosions, crowds, multiplayer |
| `v3.0` | Ludogram: three commercial games |
| `v3.x` | Side quests: Crazy Planet Survivor, Stixiva, Le Rongeur |

Each block uses mono lines with coloured prefixes: `+ Added` (ink), `~ Changed` (graphite), `− Removed` (graphite), `! Known issue` (signal-text).

**LOADOUT sub-block:** an RPG inventory of 64px chamfer-free square slots. Text only, no logos. Each has a rarity tag and a hairline in the rarity tint.

| Rarity | Tint | Items |
|---|---|---|
| LEGENDARY | `#D9A441` | UE5 C++ · Niagara · Mass · HLSL |
| EPIC | `#A99AC9` | Unity DOTS/ECS · three.js · Blueprint |
| RARE | `#5B73FF` | Rust · Svelte/SvelteKit · TypeScript · Godot · VFX Graph |
| COMMON | `--graphite` | Figma · Blender · Substance · Node/Express · FMOD |

Hovering or focusing a slot shows an item tooltip, e.g. *"Niagara: Legendary. Used to put systems inside systems."*

**Motion:** lines print like console output (`clip-path: inset(0 100% 0 0) → inset(0)`, 280ms, stagger .06).

**Footer line:** "Known issue: cannot stop optimising."

**Mobile:** the spine sits 16px from the left. The version number becomes an inline header for each entry.

### 08 · PRESS START: contact and footer (theme `ink`)
**Layout:**
- **A co-op lobby** with four player slots in a row (2×2 on mobile):
  - `P1 HYVERNO [READY]` (lime dot)
  - `P2 YOU [PRESS START]` (blinking `steps(2)` at 1Hz)
  - two `[ EMPTY ]` slots
- The headline in `--fs-display`.
- **The email** `solo.hyverno@gmail.com` as huge DOM text in Archivo 700 wdth 88, `clamp(1.5rem, 5vw, 5rem)`.
- **Buttons:**
  - `[E] COPY`
  - CTA `PRESS START` (mailto)
  - Secondary: `RECRUIT THIS UNIT`, which jumps to the mailto with subject "Recruiting: gameplay / tech art".
- **Social links:** GitHub · LinkedIn · Steam, from config. Links with empty URLs are hidden, never guessed.

**Motion:**
- Formation `contact-ring`: entities form a ring around the lobby.
- Copying bursts 24 crits from the button and shows the toast `COPIED · +50 XP`. Unlocks *Networking*.
- **The horde comes home.** At the bottom, the `footer-name` formation (glyphs `HYVERNO_W125` in a footer region) rebuilds the name. The cursor can still part it.
- **RESPAWN:**
  - The last 30vh scrub `despawn`: all entities return to the spawner and the counter rolls to `00000`.
  - Reaching it unlocks *Completionist*.
  - `RESPAWN ↑` calls `scrollTo(0, {duration: 2.2})` and replays a 0.6s spawn wave.

**Footer line:** `Built with SvelteKit, three.js and GSAP. {N} entities simulated. No UMG widgets were harmed.` N is real.

**Mobile:** the ring has 2,048 entities. The footer name is fit to 92vw.

### `/projects/[slug]` (optional pages, one per Ludogram game and side quest)
- **Header:** the project's formation runs as the hero, as an anchor at the top.
- **`SPEC SHEET` table:** engine, role, team, platforms, status. Empty fields are hidden. The source carries `TODO(Hyverno)` placeholders, and nothing is invented.
- **Body:** long-form text, then dithered media slots that colour in on hover.
- **`NEXT LEVEL →`:** the next project's formation forms as you approach the footer. Click triggers Ink Swarm.

### 404
- A `--missing` / ink checker (16px).
- "Entity not found. It probably despawned."
- `[E] RESPAWN` links home.

### 5.10 Persistent HUD (all sections)

| Position | Content |
|---|---|
| Top-left | `HYVERNO /SIM v3.0`. This is the build tag; 7 taps trigger #1,445 on touch. |
| Top-centre | Anchor nav. ≥1024px only; on mobile it moves into the ⚙ sheet. |
| Top-right | `EN / FR`, `SFX OFF`, `⚙`. The ⚙ popover holds Quality `AUTO/LOW/MED/HIGH`, Motion `FULL/REDUCED` and Toasts `ON/OFF`. |
| Bottom-left | View-mode keycaps, plus the section context line, e.g. `03 · SHIPPED — PEONS DEPLOYED 3`. |
| Bottom-right | `16,384 ENT · 60 FPS · 1.8 / 16.6 MS` and a 1px frame-budget bar (fill = frameMs/16.6: lime below .7, amber below 1, signal above). `TROPHIES 03/11`. When the governor steps down: `DYNAMIC QUALITY: MED`. |

**Entrance:** each piece slides 24px in from its nearest edge (480ms `steer`, stagger .06).

**Mobile:** wordmark, an `EN/FR` pill and ⚙. Stats sit in the ⚙ sheet.

---

## 6. Microcopy (EN)

**Hero**
- *"Gameplay programmer & technical artist. I make thousands of things move at 60fps, and look *good* doing it."*
- Hint: `DRAG TO SELECT · CLICK TO PING · PRESS [3] TO SEE THE WIRES`

**README:** *"I started with one sprite. Then two thousand replicated soldiers. Then millions of damage numbers. The headcount keeps going up. The frame time doesn't."*

**Shipped:** "Shipped. On Steam. With reviews and everything."
- **Monsters are Coming!:** "You play a dispensable peon. I programmed the peon."
- **Tabletop Game Shop Simulator:** "Glue, paint, duel, restock. I wrote the code for all four."
- **Invokyr:** "Jumanji, but it bites. Roll for netcode." Sub: *Up to 4 players. Up to 4 regrets.*

**Side Quests:** "Built after hours. *Shipped* anyway."
- **Crazy Planet Survivor:** "Thousands of entities on a sphere, and none of them fall off." / `CLICK TO CAST`
- **Stixiva:** "Any image in. A stitchable pattern out." / "UI in French. Embroidery is serious business."
- **Le Rongeur:** "IL RONGE LES PRIX." / *It gnaws prices down to the crumbs.* / "Pépite reads the official feeds so you don't overpay."

**Lab:** "Things that shouldn't run this fast." / `HOLD TO SPAWN. IT DOES NOT CARE.`

**Contracts:** "Parties I've joined."

**Patch notes:** "Known issue: cannot stop optimising." / `v3.0 + Added: three commercial games. − Removed: sleep.`

**Contact:** "Need someone who ships systems *and* makes them pretty? Press Start." CTA `PRESS START` · secondary `RECRUIT THIS UNIT` · `COPIED · +50 XP`

**HUD labels:** `ENT · FPS · MS · / 16.6 · UNITS SELECTED · NUMBERS DRAWN · TROPHIES · VIEW [1] LIT [2] DENSITY [3] DEBUG [4] IDS · DYNAMIC QUALITY`

**Achievements (10 + #1,445)**

| ID | Title | Line |
|---|---|---|
| first-blood | FIRST BLOOD | You pinged the crowd. It pinged back. |
| crowd-control | CROWD CONTROL | Selected 500+ units. Micro: excellent. |
| wireframe | WIREFRAME ENJOYER | Opened Debug view. |
| crit | CRIT HAPPENS | Rolled a nat 20. |
| planet-breaker | PLANET BREAKER | Eight craters. Physics was consulted. |
| cross-stitch | CROSS MY HEART | Stitched a full pattern. |
| cheeks-full | CHEEKS FULL | Pépite is proud of you. |
| bullet-hell | BULLET HELL | 20,000 numbers on screen. Still 60fps. |
| networking | NETWORKING | Email copied. |
| completionist | COMPLETIONIST | Reached the footer. |
| dev-mode | **#1,445 · DEVELOPER MODE** | His 1,444 Steam achievements, plus you. **ULTRA RARE** |

*Gnawed* (first bite) is a toast-free micro-unlock folded into *Cheeks Full*'s progress (`3/12`).

**Status messages**
- 404: "Entity not found. It probably despawned."
- No WebGL: "Your GPU called in sick. Here's the static build."
- Reduced motion: "Simulation paused for reduced motion. Everything's still here."
- Governor: `DYNAMIC QUALITY: MED. HONESTY IS A FEATURE.`

**FR samples** (HUD min-widths sized for these)
- "Je fais bouger des milliers de choses à 60 i/s, et avec *goût*."
- `ENTITÉS · I/S · MS · UNITÉS SÉLECTIONNÉES · NOMBRES AFFICHÉS · TROPHÉES`
- "Quêtes secondaires. Codées après le boulot. Livrées quand même."
- `APPUYEZ SUR START` · `COPIÉ · +50 XP`

---

## 7. Accessibility and performance

### Accessibility
- **Semantics:**
  - All content lives in semantic DOM. Every canvas is `aria-hidden="true"` and has an adjacent text equivalent (`.visually-hidden` description).
  - The hero `<h1>` is real text. Heading order is strict (one h1, `h2` per section, `h3` per project).
  - SplitText keeps its default aria handling.
- **Skip link:** "Skip to content" (z 100).
- **Focus:** cobalt AABB brackets with a 4px offset. They are never removed.
- **Keyboard:**
  - Every interaction has a keyboard path: view modes on `1–4`, `E`/Enter on the locked or focused element, Space to cast on the planet, ←/→ for planet yaw, Esc to deselect.
  - The key listener ignores events inside inputs. The Konami listener never captures keys inside inputs.
  - Focusing a slot inside the pinned Ludogram calls `scrollTo` to that slot's scroll position.
- **Live regions:**
  - Counters are not live regions.
  - Toasts use `role="status"` with `aria-live="polite"`. They queue one at a time (3.2s hold, 320ms exit), and fire at most 1 per 5s. Persisted achievements never re-toast.
- **Contrast:**
  - Body text and graphite meet AA in every theme.
  - `--signal` is never used for text; `--signal-text` is.
- **Language:** `<html lang>` is set per route, with `hreflang` alternates.

### `prefers-reduced-motion` (or ⚙ Motion: REDUCED)
Implemented through `gsap.matchMedia` / `mm()`:
- Native scroll, no Lenis and no pins. The Ludogram, planet and Stixiva stack vertically.
- Formations jump to their final state (preset `still`, `uMix` set directly, no wander). The hero shows `hero-tall` assembled.
- No damage numbers, no ping ring and no stadium wave. Static grain.
- No width march and no glitch. Reveals become 200ms fades.
- Transitions are 200ms fades. The language swap uses the HUD decode.
- The cursor stays native.
- The HUD shows the reduced-motion status message once.

### No WebGL
Triggered when context creation fails, the float-RT probe fails, or `webglcontextlost` fires without restore within 2s.
- `html.no-webgl` is set.
- Hero: the halftone DOM name with the width scrub.
- Static SVG formations per section, each built *before* its shader version:
  - city / shelves / d20 line drawings,
  - an SVG planet,
  - a CSS X-stitch,
  - Pépite and the price still fully work, since they are DOM/SVG.
- Lab WebGL cells show SVG stills. Canvas2D cells still run.

### Performance budget (mid laptop, 1080p, 60fps)

| Item | Budget |
|---|---|
| Sim passes (vel + pos) | ≤ 1.2 ms |
| Density | ≤ 0.4 ms |
| Crowd render + numbers | ≤ 2.0 ms |
| Scissored views (planet / lab) | ≤ 3.0 ms |
| JS / GSAP / DOM | ≤ 4.0 ms |

**Renderer:**
- `antialias:false` (SDFs anti-alias themselves), `powerPreference:'high-performance'`, `alpha:true`.
- DPR capped at 1.5 on desktop and 1 on mobile.

**Governor:**
- If the 60-frame rolling average is above 20ms, step down in this order:
  1. DPR 1.0
  2. Density RT 128
  3. `setDrawRange` to 75% of entities
  4. Grain off
  5. Tier down (re-init the sim at the smaller size, during a scroll idle)
- It never steps back up in the same session.
- Every step is reported in the HUD.

**Lifecycle:**
- Pause on `visibilitychange`.
- Views render only when visible (IntersectionObserver).
- During the planet "World" phase, the global crowd's sim is skipped (alpha 0).

**Bundling:**
- adapter-static prerenders `/` and `/fr`, plus the project pages.
- three.js and every GL module are `import()`-ed after first paint.
- The LCP element is DOM text.
- Initial JS stays under 120KB gz before three (GSAP with its plugins ≈55KB, Lenis ≈4KB). three itself is ≈130KB gz.
- Fonts: latin + latin-ext, and only Archivo is preloaded.
- `CLS 0`: the hero twin and HUD have fixed boxes, and the fonts use `font-display: swap` with metric-compatible fallback stacks.

**Rules:**
- No `getBoundingClientRect` in the loop.
- Animate only transform, opacity, clip-path, CSS variables and uniforms.
- At most 3 elements animate width at once.

---

## 8. Risks and how to de-risk

1. **The crowd feels tweened, not alive.** This is the hardest part and it carries the whole concept.
   - Build the engine first, alone, on `/dev/crowd` (dev-only) with `lil-gui` exposing every uniform.
   - Lock the presets `calm`/`march`/`panic`/`still`.
   - The Hilbert sort, the dot→dart speed morph, scroll carry and DOM colliders are all milestone 1. Nothing else ships until the hero feels like a crowd.
2. **DOM ↔ WebGL scroll desync** (swimming text versus entities).
   - Run one `gsap.ticker` loop and read `scroll.y` once per frame, *after* `lenis.raf`.
   - Regions are cached rects offset by scroll.
   - Test with a 240Hz wheel, a trackpad and keyboard PageDown.
3. **Float render targets, mipmaps on HalfFloat, iOS Safari.**
   - Use normalized coordinates and the HalfFloat path. Run the boot probe (render one pixel and read it back, then test mipmap generation).
   - Use the RGBA8 density fallback. If the probe fails, use the static build.
   - No Lenis and no pins on coarse pointers.
4. **Text legibility under a moving crowd.**
   - Colliders on all copy blocks with a 0.04u margin, and ambient capped at 25%.
   - Debug view is off by default on mobile (the keycaps are hidden there).
5. **Planet handoff seam.**
   - Compute disc targets with the same camera and matrices.
   - Ship the 150ms crossfade first and perfect the seam later.
   - On mobile there is no handoff at all.
6. **Formation ownership bugs** (two systems writing the crowd).
   - The single-writer protocol: anchors write only while `crowd.owner === null`, and pinned sections `claim`/`release` in `onToggle`.
   - A dev overlay prints the owner and the A/B ids.
7. **Readback stalls** (named entities, selection count).
   - Use only `readRenderTargetPixelsAsync`.
   - If it is unavailable, fall back to a synchronous read every 6th frame for the 8×1 RT, and hide the peon label on the low tier.
8. **Variable-font cost and French text breaking pins.**
   - Width animation only on headings, at most 3 at once, inside `contain: layout paint` wrappers.
   - Call `ScrollTrigger.refresh()` after fonts load, after boot and after a language switch.
   - Test against "PROGRAMMEUR GAMEPLAY".
9. **Scope.** Build behind feature flags (`src/lib/core/flags.ts`) in this order:
   1. Shell, tokens, content in both languages, the static/no-WebGL build
   2. Crowd engine, hero, README, HUD
   3. Ludogram formations
   4. Le Rongeur and Stixiva (mostly DOM/Canvas2D), then the planet
   5. Lab, starting with the Canvas2D cells
   6. Damage numbers, RTS, view modes
   7. Ink Swarm, achievements, #1,445

   Every milestone must still hold 60fps.
10. **Content accuracy.**
    - OVHcloud stays a bare name everywhere.
    - No invented dates. Versions replace years.
    - Prices are labelled as examples, and the 6000× figure is attributed to the UE plugin.
    - Release statuses are computed at runtime. Lab demos are labelled as web recreations.

---

## 9. Build plan (8 parallel agents, zero file overlap)

### 9.0 Project setup and conventions
- **Dependencies:**
  - `@sveltejs/kit@^2`, `svelte@^5`, `@sveltejs/adapter-static`, `vite`, `typescript`
  - `gsap@^3.13`, `lenis@^1.3`, `three@^0.170` (needs `compileAsync` and `readRenderTargetPixelsAsync`), `@types/three`
  - `@fontsource-variable/archivo`, `@fontsource-variable/martian-mono`, `@fontsource/instrument-serif`
  - dev: `fontkit`, `lil-gui`
- **Routes:**
  - `src/routes/[[lang=lang]]/+page.svelte`, with `src/params/lang.ts` (`(p) => p === 'fr'`)
  - `export const prerender = true; export const trailingSlash = 'never'`
- **Data attributes:**
  - `data-collider` (obstacle)
  - `data-interact="VERB"` (lock-on + E)
  - `data-cursor="link|project|copy|cast"`, `data-cursor-r="px"`
  - `data-section="id"`
- **Section ids:** `hero, readme, shipped, side-quests, planet, stixiva, rongeur, lab, contracts, patch-notes, contact`.
- **Formation id ownership** (do not collide):
  - Engine-internal: `spawn`, `fill`, `ambient`
  - A5: `hero-wide`, `hero-tall`, `readme-flock`, `ludo-city`, `ludo-shelves`, `ludo-d20`
  - A6: `sq-intro`, `planet-disc`
  - A7: `stix-grid`, `rongeur-stream`
  - A8: `lab-gutters`, `contracts-rules`, `patch-spine`, `contact-ring`, `footer-name`
  - A4: `konami-1445`
- **Rules:**
  - Runes state lives only in `*.svelte.ts` files.
  - Nothing outside `src/lib/gl/**` and the section-local `*Scene.ts` files may import `three` statically.
  - Sections reach the engine through `$lib/gl/handle` (no three import).
- **Integration:** Agent 1 owns the final smoke test.

### 9.1 Shared module APIs (code against these before they exist)

```ts
// ───────── src/lib/core/motion.ts (A1)
export { gsap } from 'gsap';
export { ScrollTrigger } from 'gsap/ScrollTrigger';
export { SplitText } from 'gsap/SplitText';
export { Flip } from 'gsap/Flip';
export { CustomEase } from 'gsap/CustomEase';
export function registerMotion(): void;                       // idempotent: plugins + CustomEases ('steer','arrive','spawn','despawn','snap','glitch')
export const EASE: { steer: 'steer'; arrive: 'arrive'; spawn: 'spawn'; despawn: 'despawn'; snap: 'snap'; glitch: 'glitch' };
export const DUR: { ack: .06; micro: .12; fast: .24; base: .48; reveal: .72; morph: 1.4; page: .5 };
export const STAGGER: { chars: .014; words: .035; lines: .09; rows: .06; cells: .06 };
export function mm(setup: (c: { reduced: boolean; desktop: boolean; coarse: boolean }) => void | (() => void)): () => void; // gsap.matchMedia wrapper, honours device.reducedMotion override
export function revealLines(el: HTMLElement, o?: { scrub?: boolean | number; start?: string; end?: string; delay?: number; widthMarch?: boolean }): () => void;
export function tickTo(el: HTMLElement, to: number, o?: { from?: number; steps?: number; duration?: number; format?: (n: number) => string }): gsap.core.Tween;
export function decode(el: HTMLElement, text: string, o?: { duration?: number; charset?: string }): gsap.core.Tween;

// ───────── src/lib/core/ticker.ts (A1)
export type FrameFn = (time: number, dt: number) => void;     // seconds
export const PRIORITY: { scroll: 0; input: 5; sim: 10; render: 20; ui: 30 };
export function onFrame(fn: FrameFn, priority?: number): () => void;
export function startTicker(): void;                          // gsap.ticker.add + lagSmoothing(0); pauses on visibilitychange
export function setPaused(p: boolean): void;

// ───────── src/lib/core/scroll.svelte.ts (A1)
export const scroll: { y: number; delta: number; velocity: number; limit: number; smooth: boolean };  // $state, written once per frame
export function initScroll(): () => void;                    // Lenis unless reduced motion or coarse pointer; wires ScrollTrigger.update
export function scrollTo(target: number | string | HTMLElement, o?: { duration?: number; offset?: number; immediate?: boolean }): void;
export function stopScroll(): void;
export function startScroll(): void;
export function currentSectionId(): string;                  // the section crossing 50% of the viewport

// ───────── src/lib/core/device.svelte.ts (A1)
export type Tier = 'high' | 'med' | 'low';
export const device: { reducedMotion: boolean; finePointer: boolean; coarse: boolean; mobile: boolean;
  webgl: 'pending' | 'ok' | 'none'; floatRT: 'float' | 'half' | 'none'; tier: Tier; dpr: number; governed: boolean };
export const TIER: Record<Tier, { sim: 128 | 96 | 64; density: 256 | 128; dpr: number; planet: [number, number]; planetDetail: number; hose: number; numbers: number }>;
export function detectDevice(): void;                        // sync media queries + tier guess (mobile → low)
export function setTier(t: Tier, reason: 'governor' | 'user'): void;
export function setReducedMotion(v: boolean | null): void;   // null = follow OS

// ───────── src/lib/core/stats.svelte.ts (A1)
export const stats: { fps: number; frameMs: number; simMs: number; renderMs: number; entities: number; drawCalls: number;
  numbersDrawn: number; onScreen: number; selected: number; quality: 'AUTO' | 'LOW' | 'MED' | 'HIGH'; governorNote: string };
export const hud: { section: string; label: string; line: string };
export function sampleFrame(ms: number): void;               // rolling avg; publishes at 4 Hz; triggers governor callbacks
export function onGovernor(fn: (avgMs: number) => void): () => void;

// ───────── src/lib/core/theme.svelte.ts (A1)
export type ThemeName = 'paper' | 'viewport' | 'ink' | 'earth' | 'ice' | 'aida' | 'rongeur';
export interface ThemeTokens { paper: string; ink: string; graphite: string; hairline: string; signal: string; signalText: string }
export const THEMES: Record<ThemeName, ThemeTokens>;         // hexes from §2.1
export const theme: { name: ThemeName };
export function setTheme(name: ThemeName, o?: { duration?: number; immediate?: boolean }): void;
export function onThemeColors(fn: (c: Record<keyof ThemeTokens, [number, number, number]>) => void): () => void; // linear RGB 0..1, fires every tween update

// ───────── src/lib/core/actions.ts (A1), Svelte actions
export function themeSection(node: HTMLElement, name: ThemeName): ActionReturn<ThemeName>;  // top crosses 50% → setTheme
export function reveal(node: HTMLElement, o?: { mode?: 'lines' | 'words' | 'fade'; scrub?: boolean; delay?: number; widthMarch?: boolean }): ActionReturn;
export function collider(node: HTMLElement, o?: { pad?: number }): ActionReturn;            // registers in colliders.ts, sets data-collider
export function interact(node: HTMLElement, o: { verb: string }): ActionReturn;             // data-interact, E-key click while locked/focused, tabindex if needed
export function hudLine(node: HTMLElement, o: { section: string; label: string; line?: string }): ActionReturn; // writes hud store while in view

// ───────── src/lib/core/colliders.ts (A1)
export function registerCollider(el: HTMLElement, pad?: number): () => void;
export function packColliders(out: Float32Array /* 16*4 */, vw: number, vh: number, scrollY: number): number; // world units, returns count

// ───────── src/lib/core/keys.ts (A1)
export function onKey(key: string, fn: (e: KeyboardEvent) => void, o?: { allowInInputs?: boolean }): () => void;
export function onSequence(seq: string[], fn: () => void): () => void;
export const KONAMI: string[];

// ───────── src/lib/core/boot.svelte.ts (A1)
export const boot: { progress: number; stage: 'spawn' | 'compile' | 'bake' | 'ready'; log: string[]; done: boolean; short: boolean };
export function report(stage: 'fonts' | 'compile' | 'formations' | 'firstFrame', p?: number): void; // weights .3/.3/.3/.1
export function log(line: string): void;                    // prefixes [t.ttt]
export function whenBooted(): Promise<void>;
export function finishBoot(): void;

// ───────── src/lib/core/flags.ts (A1)
export const FLAGS: { crowd: boolean; planet: boolean; lab: boolean; numbers: boolean; rts: boolean; viewModes: boolean; inkSwarm: boolean; achievements: boolean };

// ───────── src/lib/i18n/index.svelte.ts (A2)
export type Lang = 'en' | 'fr';
export type Dict = typeof import('./en').default;
export const i18n: { lang: Lang };
export function t(): Dict;                                   // reactive read of i18n.lang
export function setLangFromRoute(param: string | undefined): void;
export function langHref(path: string, lang?: Lang): string; // '/fr' prefixing
export function switchLang(): Promise<void>;                 // goto(other,{noScroll:true}) then scrollTo(currentSectionId(),{immediate:true})
export function fmtDate(iso: string, precision: 'day' | 'month'): string;
export function fmtNum(n: number): string;                   // locale grouping (EN 16,384 / FR 16 384)
// en.ts: export default { nav, hud, boot, hero, readme, shipped, sideQuests, planet, stixiva, rongeur, lab, contracts, patch, contact, achievements, status, fallback } as const
// fr.ts: export default { ... } satisfies Dict

// ───────── src/lib/content/types.ts + content.ts + status.ts (A2)
export type L = { en: string; fr: string };
export interface Game { slug: 'monsters-are-coming' | 'tabletop-game-shop-simulator' | 'invokyr'; title: string; publisher: string | null;
  role: L; line: L; pitch: L; platforms: string[]; releases: { label: L; date: string; precision: 'day' | 'month' }[];
  reception: L; hud: L; formation: 'ludo-city' | 'ludo-shelves' | 'ludo-d20'; media?: { src: string; alt: L } }
export interface SideProject { slug: 'crazy-planet-survivor' | 'stixiva' | 'le-rongeur'; title: string; status: L; stack: string[]; line: L; body: L[]; media?: { src: string; alt: L } }
export interface LabEntry { id: 'crowd' | 'numbers' | 'nested' | 'navmesh' | 'water' | 'replication'; title: string; engine: string; tags: string[]; metric: L; body: L }
export interface Contract { name: string; role: L; stack: string | null }  // OVHcloud: role {en:'MISSION', fr:'MISSION'}, stack null, nothing else
export interface Volunteer { name: string; what: L; when: L }
export interface PatchNote { version: string; title: L; lines: { kind: '+' | '~' | '-' | '!'; text: L }[]; date?: string /* TODO(Hyverno) */ }
export interface LoadoutItem { name: string; rarity: 'legendary' | 'epic' | 'rare' | 'common'; tooltip: L }
export const site: { name: 'Hyverno'; email: 'solo.hyverno@gmail.com'; socials: { github: string; linkedin: string; steam: string } };
export const heroStats: { value: number; prefix?: string; suffix?: string; label: L }[];
export const games: Game[]; export const sideProjects: SideProject[]; export const lab: LabEntry[];
export const contracts: Contract[]; export const volunteer: Volunteer[]; export const patchNotes: PatchNote[]; export const loadout: LoadoutItem[];
export function releaseStatus(iso: string, now?: Date): { out: boolean; days: number; hours: number };  // status.ts
export function projectBySlug(slug: string): Game | SideProject | undefined;

// ───────── src/lib/gl/handle.ts (A3), NO three import; safe in any component
import type { Engine } from './types';
export function whenEngine(): Promise<Engine | null>;        // null when no WebGL
export function getEngine(): Engine | null;
export function setEngine(e: Engine | null): void;           // called by layout after init

// ───────── src/lib/gl/types.ts (A3), types only
export type Preset = 'calm' | 'march' | 'panic' | 'still';
export type Glyph = 'dot' | 'dart' | 'xstitch';
export type ViewMode = 1 | 2 | 3 | 4;
export interface Region { el: HTMLElement; space: 'page' | 'fixed' }   // rect cached by RO + ScrollTrigger refresh
export interface BakeCtx { N: number; w: number; h: number; rand: () => number; el: HTMLElement }
export interface BakeResult { targets: Float32Array /* N*4: x,y ∈[-1,1] of region, z ∈[-1,1], w weight */; paint?: Uint8Array /* N*4 */; paintAlt?: Uint8Array; named?: Record<string, number> }
export type FormationSource =
  | { kind: 'glyphs'; key: 'HYVERNO_W125' | 'HYVERNO_W62' | '1445'; fill?: number }
  | { kind: 'svg'; viewBox: [number, number]; paths: string[]; mode: 'stroke' | 'fill'; share?: number; weight?: number }
  | { kind: 'points'; build: (ctx: BakeCtx) => BakeResult }
  | { kind: 'paths'; viewBox: [number, number]; paths: string[]; speed: number; share?: number; weight?: number; color?: string }
  | { kind: 'ambient' };
export interface CrowdParams { seek: number; maxSpeed: number; maxForce: number; arrive: number; sep: number; wander: number; noiseScale: number;
  mouseR: number; mouseF: number; scrollCarry: number; panic: number; paintMix: number; size: number; mixSpread: number; glyph: Glyph; glyphAlt: Glyph }
export interface Crowd {
  readonly N: number; readonly owner: string | null;
  define(id: string, src: FormationSource, region: Region, o?: { preset?: Preset; glyph?: Glyph }): Promise<void>;  // idempotent; re-bakes on region resize
  setPaint(id: string, paint?: Uint8Array, paintAlt?: Uint8Array): void;
  blend(from: string, to: string, mix: number, o?: { owner?: string }): void;  // ignored if claimed by another owner
  claim(owner: string): void; release(owner: string): void;
  set(p: Partial<CrowdParams>): void; preset(p: Preset, o?: { duration?: number }): void;
  ping(xPx: number, yPx: number, strength?: number): void;
  attract(i: 0 | 1 | 2 | 3, rectPx: DOMRectReadOnly | null, o?: { mode?: 'fill' | 'perimeter'; strength?: number }): void;
  setScan(s: { angleDeg: number; offsetPx: number } | null): void;
  setAlpha(a: number, o?: { duration?: number }): void;
  named(name: string): { x: number; y: number; visible: boolean } | null;    // px, refreshed every 3 frames
  select(rectPx: DOMRectReadOnly | null): Promise<number>; command(xPx: number, yPx: number): void;
}
export interface DamageNumbers {
  spawn(xPx: number, yPx: number, o?: { value?: number; crit?: boolean; glyph?: 'digits' | 'dot'; color?: [number, number, number]; vx?: number; vy?: number; gravity?: number }): void;
  burst(xPx: number, yPx: number, o: { count: number; radius: number; critRate?: number; glyph?: 'digits' | 'dot'; color?: [number, number, number] }): void;
  readonly live: number; readonly total: number; readonly capacity: number; readonly object: unknown /* THREE.Mesh */;
}
export interface GLView { el: HTMLElement; scene: unknown /* THREE.Scene */; camera: unknown /* THREE.Camera */;
  update?(t: number, dt: number): void; onResize?(w: number, h: number): void; rate?: 1 | 2; clearAlpha?: number }
export interface Engine {
  renderer: unknown /* THREE.WebGLRenderer */; crowd: Crowd; numbers: DamageNumbers;
  addView(v: GLView): () => void;
  createNumbers(o: { capacity: number; view?: GLView }): DamageNumbers;
  viewMode: ViewMode; setViewMode(m: ViewMode): void;
  inkCover(): Promise<void>; inkReveal(): Promise<void>;
  setTier(t: 'high' | 'med' | 'low'): void; pause(p: boolean): void; dispose(): void;
}

// ───────── src/lib/gl/engine.ts (A3), dynamic-import only
export function initEngine(canvas: HTMLCanvasElement): Promise<Engine | null>; // probes, compiles, bakes spawn/fill/ambient, reports to boot, writes stats

// ───────── src/lib/gl/actions.ts (A3), no static three import
export function formation(node: HTMLElement, o: { id: string; source: FormationSource; from?: string; start?: string; end?: string;
  preset?: Preset; glyph?: Glyph; region?: HTMLElement; space?: 'page' | 'fixed' }): ActionReturn;

// ───────── src/lib/stores/achievements.svelte.ts (A4)
export type AchId = 'first-blood' | 'crowd-control' | 'wireframe' | 'crit' | 'planet-breaker' | 'cross-stitch' | 'cheeks-full' | 'bullet-hell' | 'networking' | 'completionist' | 'dev-mode';
export const ach: { unlocked: AchId[]; muted: boolean };
export function unlock(id: AchId): void;                     // persists 'hyv.ach' (try/catch), queues toast, sfx('ach')
export function toast(m: { title: string; body?: string; kind?: 'ach' | 'info' | 'ultra' }): void;
export function progress(id: AchId, value: number, max: number): void;  // e.g. cheeks-full 3/12

// ───────── src/lib/ui/sfx.ts (A4)
export function sfx(name: 'tick' | 'ping' | 'crit' | 'ach' | 'bite' | 'roll' | 'stitch'): void; // WebAudio synth, no-op unless enabled
export const sfxState: { enabled: boolean };                // lives in sfx.svelte.ts
```

### 9.2 Agent assignments

**A1 · Platform & shell.** Owns tokens, core and routing. Everything else depends on its signatures.
- **Files:**
  - `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`
  - `src/app.html` (preload of the Archivo woff2, `lang` placeholder), `src/app.d.ts`, `src/params/lang.ts`
  - `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+error.svelte`
  - `src/routes/[[lang=lang]]/+page.ts`, `src/routes/[[lang=lang]]/+page.svelte`
  - `src/lib/styles/tokens.css` (all §2 tokens, themes as `[data-theme]` fallbacks), `src/lib/styles/global.css` (reset, `.grid`, `.mono`, `.serif`, `.hud-text`, `.visually-hidden`, link dots, bracket utility)
  - `src/lib/styles/fonts.ts` (the 3 fontsource imports)
  - `src/lib/core/{motion.ts, ticker.ts, scroll.svelte.ts, device.svelte.ts, stats.svelte.ts, theme.svelte.ts, actions.ts, colliders.ts, keys.ts, boot.svelte.ts, flags.ts}`
- **`+layout.svelte` responsibilities:**
  - Call `registerMotion`, `detectDevice`, `initScroll` and `startTicker`.
  - Mount the A4 chrome: `SkipLink, WorldGrid, Grain, ViewportFrame, Hud, Cursor, Toasts, Preloader`.
  - Render the fixed `<canvas class="gl" aria-hidden="true">`, then `const { initEngine } = await import('$lib/gl/engine')` and `setEngine(...)`. Set `html.no-webgl` on null.
  - Wire `onNavigate` to `inkCover()` / `inkReveal()`, or a 200ms fade fallback.
  - Call `setLangFromRoute`, and set `<html lang>` and `hreflang` via `<svelte:head>`.
- **`+page.svelte`:** composes the sections in this exact order:
  - `$lib/sections/Hero.svelte`
  - `$lib/sections/Manifesto.svelte`
  - `$lib/sections/ludogram/Ludogram.svelte`
  - `$lib/sections/side-quests/SideQuestsIntro.svelte`
  - `$lib/sections/side-quests/planet/CrazyPlanet.svelte`
  - `$lib/sections/side-quests/stixiva/Stixiva.svelte`
  - `$lib/sections/side-quests/rongeur/Rongeur.svelte`
  - `$lib/sections/lab/Lab.svelte`
  - `$lib/sections/Contracts.svelte`
  - `$lib/sections/PatchNotes.svelte`
  - `$lib/sections/Contact.svelte`
- **Also:** prerender `entries` for `/` and `/fr`, and the final integration smoke test (both langs, no-WebGL, reduced motion, 375px).

**A2 · Content, i18n and project pages.**
- **Files:**
  - `src/lib/i18n/{index.svelte.ts, en.ts, fr.ts}`
  - `src/lib/content/{types.ts, content.ts, status.ts}`
  - `src/routes/[[lang=lang]]/projects/[slug]/{+page.ts, +page.svelte}` (with `entries()` for every slug in both langs)
  - `src/lib/sections/project/{SpecSheet.svelte, MediaSlot.svelte, NextLevel.svelte}`
- **Responsibilities:**
  - Write all copy from §6 and §5 in EN and FR. Never put OVHcloud detail anywhere.
  - Apply `TODO(Hyverno)` markers for dates and socials.
  - `MediaSlot` props: `{ media?: {src; alt: L}; fallback: Snippet }`. It applies the 1-bit Bayer dither via CSS `image-rendering: pixelated` on a canvas and colours in on hover.
  - Project pages reuse the formation of their section through `use:formation` with the same id and source, imported from that section's `formations.ts`. Import only; never edit it.

**A3 · Crowd engine and WebGL core.**
- **Files:**
  - `src/lib/gl/{handle.ts, types.ts, engine.ts, actions.ts, capability.ts, renderer.ts, views.ts, viewmodes.ts, inkswarm.ts, select.ts}`
  - `src/lib/gl/crowd/{Crowd.ts, bakers.ts, hilbert.ts, regions.ts, presets.ts, shaders/{velocity.glsl.ts, position.glsl.ts, render.glsl.ts, density.glsl.ts, quadtree.glsl.ts}}`
  - `src/lib/gl/numbers/{DamageNumbers.ts, atlas.ts, numbers.glsl.ts}`
  - `src/lib/gl/glsl/{noise.ts (hash, curl2D, fbm3), bayer.ts, sdf.ts}`
  - `scripts/bake-glyphs.mjs`, `src/lib/gen/glyphs.json` (generated; commit a version)
  - `src/routes/dev/crowd/+page.svelte` (dev-only lil-gui; `prerender = false`; excluded from the build via `import.meta.env.DEV` guard)
- **Responsibilities:**
  - Everything in S2, S3 (ping, numbers, RTS) and S4 (view modes, quadtree, stats panel), plus Ink Swarm.
  - Theme uniforms via `onThemeColors`, colliders via `packColliders`, stats writes and boot reports.
  - The governor reacting through `onGovernor`.
  - Global input: mouse/touch → `uMouse`, click → ping + `unlock('first-blood')`, drag → select, keys `1–4` → `setViewMode` + `unlock('wireframe')`.
- **Exports** only what §9.1 lists.

**A4 · Chrome and UI.**
- **Files:**
  - `src/lib/ui/{Preloader.svelte, Hud.svelte, HudStats.svelte, ViewKeys.svelte, Settings.svelte, LangToggle.svelte, Cursor.svelte, Toasts.svelte, Grain.svelte, WorldGrid.svelte, ViewportFrame.svelte, SkipLink.svelte, Brackets.svelte, Keycap.svelte, Prompt.svelte, Odometer.svelte, sfx.ts, sfx.svelte.ts}`
  - `src/lib/stores/achievements.svelte.ts`
- **Responsibilities:**
  - Preloader: reads the `boot` store, Flips its labels into the HUD.
  - HUD (§5.10): stats line, frame-budget bar, trophies odometer, build tag (7-tap trigger).
  - Settings popover: quality, motion, toasts.
  - Cursor: crosshair, lock-on with an `[E] VERB` prompt, marquee drawing (visual only; A3 does the selection), cast ring.
  - Toast queue and grain/world-grid/frame.
  - Konami via `onSequence(KONAMI)`, which runs: `unlock('dev-mode')`, then `crowd.define('konami-1445', {kind:'glyphs', key:'1445'}, {el: document.body, space:'fixed'})`, `claim → blend → release` after 2.4s.
- **Reusable component props:**
  - `Brackets {target?: HTMLElement; color?: string; pad?: number}`
  - `Keycap {key: string; active?: boolean}`
  - `Odometer {value: number; digits?: number; ease?: string}`
  - `Prompt {verb: string}`

**A5 · Hero, README, SHIPPED.**
- **Files:**
  - `src/lib/sections/{Hero.svelte, Manifesto.svelte}`
  - `src/lib/sections/hero/formations.ts`
  - `src/lib/sections/ludogram/{Ludogram.svelte, MissionBrief.svelte, PeonLabel.svelte, GhostCursors.svelte, DiceResult.svelte, formations.ts, d20.ts, ludogram-fallback.svelte}`
- **Responsibilities:**
  - The hero DOM twin (fit-to-width by measuring once on `fonts.ready` and resize).
  - The Width March pin (`claim('hero')`), stadium wave via `crowd.set` pulses, mobile/no-WebGL paths.
  - README line attractors and the stats row (`tickTo`).
  - The Ludogram pin with 3 slots, snapping, `claim('ludogram')`.
  - Builders for `ludo-city` / `ludo-shelves` / `ludo-d20` (exported from `formations.ts` for A2's project pages).
  - The peon label via `crowd.named('peon')`, the paint sweep via `setScan`, the mystery pack ping, the d20 roll logic with `releaseStatus` badges.
  - `unlock('crit')`.

**A6 · Side-quests intro and Crazy Planet.**
- **Files:**
  - `src/lib/sections/side-quests/{SideQuestsIntro.svelte, intro-formations.ts}`
  - `src/lib/sections/side-quests/planet/{CrazyPlanet.svelte, PlanetScene.ts, planetSim.ts, planet.glsl.ts, disc.ts, PlanetFallback.svelte, formations.ts}`
- **Responsibilities:**
  - S5 in full. `PlanetScene.ts` (dynamic-imported, may import three) exports `createPlanet(el: HTMLElement, o: {tier; onStats(s: {entities: number; craters: number; biome: 'earth' | 'ice'}): void}): { view: GLView; cast(xPx, yPx): void; castCenter(): void; setBiome(b, dur?): void; setProgress(p: number): void; discTargets(N: number): BakeResult; setVisible(a: number): void; dispose(): void }`.
  - The pinned scroll map with `claim('planet')`, the theme switch earth→ice via `setTheme`, `unlock('planet-breaker')`.
  - Mobile auto-rotate (no handoff), keyboard cast and yaw.

**A7 · Stixiva and Le Rongeur.**
- **Files:**
  - `src/lib/sections/side-quests/stixiva/{Stixiva.svelte, PatternPanel.svelte, PdfSheet.svelte, Toolbar.svelte, quantize.ts (kmeans(k=10), nearestThread, floydSteinberg), motif.ts (polar rose → ImageData 72×48), formations.ts}`
  - `src/lib/sections/side-quests/rongeur/{Rongeur.svelte, Pepite.svelte, BittenPrice.svelte, BiteEdge.svelte, BittenBlob.svelte, formations.ts, bites.ts (seeded bite generation)}`
- **Responsibilities:**
  - **Stixiva:** the `stix-grid` builder with `paint` and `paintAlt`, the scanline scrub (`setScan`) with `glyphAlt:'xstitch'`, the synced Canvas2D chart and legend counts, cell tooltip, dither toggle (`setPaint`), the PDF preview, `unlock('cross-stitch')`.
  - **Le Rongeur:** the bitten top and bottom edges, the price mask bites with stepped price, the stamp, Pépite (procedural SVG, eyes and cheeks API: `Pepite {cheeks: number; lookAt?: {x; y}}`), the `rongeur-stream` paths formation, crumbs via `engine.numbers.burst({glyph:'dot', color: apricot})`, `progress('cheeks-full', n, 12)`.

**A8 · Lab, Contracts, Patch Notes, Contact.**
- **Files:**
  - `src/lib/sections/lab/{Lab.svelte, LabCell.svelte, formations.ts, cells/CrowdQuadtree.ts, cells/Navmesh.ts, cells/navmesh.json, cells/Replication.ts, cells/HoseScene.ts, cells/NestedScene.ts, cells/WaterScene.ts, cells/stills.ts}`
  - `src/lib/sections/{Contracts.svelte, PatchNotes.svelte, Loadout.svelte, Contact.svelte, Lobby.svelte, ContactFormations.ts, contracts-formations.ts, patch-formations.ts}`
- **Responsibilities:**
  - **Lab:** the 6 cells. Canvas2D cells export `create(canvas: HTMLCanvasElement): { start(): void; stop(): void; resize(w: number, h: number): void; key?(k: string): void }`. WebGL `*Scene.ts` export `create(el: HTMLElement): { view: GLView; dispose(): void; input?(...) }` and are dynamic-imported. Also IO gating, hover dimming, `unlock('bullet-hell')`.
  - **Contracts:** the rule formation plus hover attractors.
  - **Patch Notes:** the conveyor and the sticky version.
  - **Loadout:** tooltips.
  - **Contact:** the lobby, copy with toast and `unlock('networking')`, `footer-name` + despawn + `RESPAWN`, `unlock('completionist')`, and the footer line with the real entity count.

### 9.3 Dependency and merge order
- **Parallel day 1:** A1 and A3 (core + engine), with A2 and A4 against the signatures.
- **A5–A8** code against the §9.1 signatures from the start. Each section must render its fallback when `whenEngine()` resolves `null`, so every agent can test without the engine.
- **Merge order:** A1 → A2 → A3 → A4 → A5–A8 in any order.
- **Shared contract:** §9.1 is the contract. Any change needs agreement across all agents and goes into `types.ts`/`motion.ts` only through A1/A3.