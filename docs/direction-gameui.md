# BUILD 1,445: Art Direction Spec
**Client:** Hyverno, Gameplay Programmer & Technical Artist · **Angle:** "The site is a game" · **Stack:** SvelteKit 2 / Svelte 5 / GSAP 3.13 / Lenis / three.js

---

## 1. Concept

**Name:** BUILD 1,445

**One-line pitch:** A portfolio that compiles its shaders, hands you the controller and rewards you with achievements. It's built by someone whose job is making thousands of things move at 60fps.

**Why it fits Hyverno specifically**
- **One number holds the identity together.** He has 1,444 Steam achievements, and the site is #1,445. 38 × 38 = 1,444, so the boot screen is a 38×38 grid of "shaders" that then turns into the hero's crowd. The same number runs from the first frame to the Konami code.
- **The interface is the CV.** A tech artist's work is usually invisible: compile times, entity counts, frame budgets, replication. On this site every HUD number is real telemetry from the page's own simulations. A lead who reads `16,384 ENT · 60 FPS · 1.9 ms` is looking at his skills running live.
- **The input is real.** `[E]` really interacts, the Gamepad API works, the Graphics menu really changes entity counts, and the Konami code works. A gameplay programmer's site should handle input well.
- **Tone guardrail.** It should feel like a AAA front end, not a retro game. The model is the restraint of a modern AAA pause menu: chamfered panels, hairlines, big confident type and one hot accent. No pixel fonts, no CRT scanlines, no neon gradients, no glass blobs. **The only light comes from the simulations.**

---

## 2. Visual identity

### 2.1 Palette

| Token | Hex | Role |
|---|---|---|
| `--c-void` | `#0A0A0B` | Page background, WebGL clear color |
| `--c-carbon` | `#121214` | Panels, cards, HUD plates |
| `--c-gunmetal` | `#1C1D20` | Hover/selected panel fill |
| `--c-rule` | `#2B2C30` | Hairlines, grid, inactive ticks |
| `--c-bone` | `#EEEAE2` | Primary text, inverted surfaces, agents |
| `--c-ash` | `#8C8982` | Secondary text (5.6:1 on void, AA) |
| `--c-ignition` | `#FF5B23` | **The single accent**: focus brackets, selection bar, keycaps, CTA, "elite" agents |
| `--c-telemetry` | `#B8F55A` | FPS/ms numerals and "OK" states only, never decorative |
| `--c-alert` | `#FFC23D` | Frame-drop warnings, trophy rim, "NEW" tags |
| `--c-debug` | `#FF00FF` | Debug View only (missing-texture magenta) |

Rules: one accent per viewport, and Ignition covers less than 5% of the pixels.

**Level palettes.** These are scoped through `html[data-level]` and set `--lvl-bg / --lvl-ink / --lvl-accent`. The background color transitions over 600ms.

| Level | bg | ink | accent |
|---|---|---|---|
| Monsters are Coming! | `#16120B` | `#EFE3C8` | `#E2A93B` road dust |
| Tabletop Game Shop Sim | `#101317` | `#E9ECF1` | `#3E7BFA` paint, primer `#7A7A7C` |
| Invokyr | `#0B0607` | `#E8DCCB` | `#C2272D` blood, candle `#FFB347` |
| Crazy Planet Survivor | `#05080D` | `#E6F4FF` | `#59E1FF` ice, `#36C77A` earth |
| Stixiva | `#F3EEE4` Aida cloth | `#1E1C1A` | threads `#C8323C #2A6F6B #E8B23A #3B3F8F #1C1C1C` |
| Le Rongeur | `#FFF3E2` | `#2B1B12` | `#F2894B` (brand, untouched) |

The two light levels in the middle of the page are a deliberate choice. The site goes from dark to cream and back, which breaks the usual all-dark portfolio.

### 2.2 Typography (3 families, all self-hosted)

1. **Archivo Variable**: `@fontsource-variable/archivo`. Import `@fontsource-variable/archivo/wdth.css` to get wght 100–900 and wdth 62–125 (fall back to `full.css` if the package splits the axes differently). Family name: `'Archivo Variable'`. It is used for display and UI.
   - Display: wght 800, wdth 125, uppercase, tracking −0.02em.
   - HUD labels: wght 600, wdth 75, uppercase, tracking 0.08em.
   - Body: wght 400, wdth 100.
   - The **width axis is the motion signature** (see "width bloom" in 3.2).
2. **JetBrains Mono Variable**: `@fontsource-variable/jetbrains-mono` (wght 100–800). Used for telemetry, keycaps, logs and patch notes, at wght 500.
3. **Instrument Serif**: `@fontsource/instrument-serif` (`400.css`, `400-italic.css`). This is "the narrator": manifesto, dialogue lines and pull quotes. It never appears in the HUD. Its warmth is what turns "sci-fi UI" into "taste".

Subsets: latin + latin-ext (French diacritics). Preload only the Archivo woff2.

| Token | Value | Use |
|---|---|---|
| `--fs-mega` | `clamp(4rem, 1.2rem + 12.5vw, 15rem)` | Fallback hero name, CONTINUE? (lh 0.85) |
| `--fs-d1` | `clamp(2.75rem, 1.3rem + 6vw, 7.5rem)` | Level titles (lh 0.88) |
| `--fs-d2` | `clamp(2rem, 1.25rem + 3.2vw, 4.5rem)` | Section titles (lh 0.95) |
| `--fs-h3` | `clamp(1.375rem, 1.1rem + 1.2vw, 2.125rem)` | Card titles |
| `--fs-voice` | `clamp(1.5rem, 1rem + 2.2vw, 3rem)` | Instrument Serif lines (lh 1.1) |
| `--fs-body` | `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)` | lh 1.55, max 62ch |
| `--fs-ui` | `0.8125rem` | HUD labels |
| `--fs-micro` | `0.6875rem` | Mono telemetry, tracking 0.12em |

### 2.3 Grid
- 12 columns, max-width 1680px, gutter `clamp(12px, 1.4vw, 24px)`, outer margin `clamp(16px, 4vw, 72px)`. Tablet uses 8 columns, mobile 4.
- 8px baseline. Spacing tokens: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 120 / 200.
- **Title-safe frame.** The HUD sits inside a fixed 24px inset (16px on mobile), marked by four 12px L-brackets in `--c-rule`. Content can run full bleed; the HUD never does.

### 2.4 Texture
- **Grain.** A 128×128 noise tile is generated on a canvas at boot (no asset file). It sits in a fixed `body::after` at opacity 0.06 (0.035 on light levels) with `mix-blend-mode: overlay`, and its background-position jitters with a `steps(5)` animation over 0.5s. It is static under reduced motion.
- **Chamfer, the identity shape.** Panels use `clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))`, which cuts the top-right and bottom-left corners. Cards use 16px, buttons 6px.
- **Bayer 8×8 ordered dither.** This is the only pixel-level effect on the site, used for transitions and image reveals. It is presented as a tech-art technique, not as nostalgia.
- **Dot grid.** 1px dots every 24px at `--c-rule` 50%, used only behind the R&D Lab.

### 2.5 Iconography
- A 24px grid with 1.5px strokes, square caps, miter joins and 45° angles only, to match the chamfer. About 20 inline SVGs: arrow, chevron, close, copy, mail, external, sound, globe, gamepad, keyboard, trophy, lock, play, pause, flag, dice, planet, needle, tooth.
- **`<Prompt action>` component.** It renders a keycap `[E]` (22×22, 1px bone border, 2px bottom border for depth, mono 11px), or a generic gamepad face button (a circle with A/B/X/Y and no console-brand shapes), or `TAP` on touch. The glyph follows the device of the last input event.
- **Achievement badges** are procedural: a flat-top hexagon with a glyph and a tick ring seeded by the achievement id.

---

## 3. Motion language

### 3.1 Principles
1. **Acknowledge input within one frame.** Every press or hover changes something visibly within 16ms; the easing comes after.
2. **Mass, not float.** UI snaps in and settles. No slow fades and no floating parallax.
3. **Telemetry is truth.** Any number that moves is real.
4. **Simulations loop; the DOM never idles.** No ambient bobbing on HTML elements.

### 3.2 Eases, durations, staggers

| Name | Definition (register with `CustomEase.create`) | Use |
|---|---|---|
| `snap` | `M0,0 C0.16,1 0.3,1 1,1`, i.e. `cubic-bezier(0.16,1,0.3,1)` | Default enter, selection |
| `commit` | `cubic-bezier(0.7,0,0.2,1)` | Fast travel, slot change, wipes |
| `blip` | `M0,0 C0.14,0 0.12,1.16 0.42,1.05 0.6,0.99 0.78,1 1,1` | Toasts, keycaps, counters (~5% overshoot) |
| `dolly` | `cubic-bezier(0.65,0.05,0.36,1)` | 3D cameras |
| `drop` | `cubic-bezier(0.5,0,0.75,0)` | Exits |

**Durations:** `--t-ack 60ms · --t-micro 140ms · --t-short 280ms · --t-base 520ms · --t-long 900ms · --t-cine 1600ms`. Exits take 60% of the enter duration.

**Staggers:** characters 0.016 (capped with `amount: 0.4`), words 0.035, lines 0.08, slots/cards 0.09, list rows 0.05, HUD pieces 0.06, grids from `"center"` with amount 0.6.

**Width bloom, the signature text reveal.** Use SplitText (3.13) with `type: "lines", mask: "lines", autoSplit: true`. Lines animate `yPercent: 105 → 0` over 900ms with `snap` and a 0.08 stagger. At the same time a CSS var `--wdth` tweens 62 → 125 over 1100ms, driving `font-variation-settings: "wdth" var(--wdth)`. Titles arrive condensed and spread out into place.
- Body text: lines go opacity 0 → 1 and y 12 → 0 over 520ms, stagger 0.05.
- HUD labels (24 characters or fewer): a decode where each character cycles through two glyphs from `0123456789#/_` at 30ms each, then lands.

### 3.3 Scroll
- Lenis config: `{ lerp: 0.09, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false }`. It is driven by `gsap.ticker` with `lagSmoothing(0)`, and `ScrollTrigger.update` runs on Lenis `scroll`.
- Scrub is 0.6 for DOM and 1.0 for cameras and uniforms, so 3D feels heavier.
- Only two sections pin: Level Select (horizontal) and Crazy Planet (250vh). Native keyboard scrolling keeps working everywhere.
- Call `ScrollTrigger.refresh()` after `document.fonts.ready`, after boot and after each navigation.

### 3.4 Cursor: "Lock-on"
- This only applies on `(hover: hover) and (pointer: fine)`. The native cursor is hidden except over inputs.
- **Idle:** a 4px bone dot plus four 6px corner ticks forming a 28px square. It follows via `gsap.quickTo` (0.18s, `power3`).
- **Hover on `[data-interact]`:** the ticks fly to the target's bounding box plus 6px padding (280ms, `snap`) and the dot fades. A prompt `[E] {data-verb}` appears 8px below-right ("Load", "Inspect", "Copy", "Bite", "Roll"). **Pressing E clicks the locked element.**
- **Mousedown:** the box scales to 0.9 for 80ms, like a trigger pull.
- **Over interactive WebGL:** it switches to crosshair mode, with a ring showing the effect radius (crater size, repulsor size).
- **Keyboard `:focus-visible`** uses the same bracket component, so focus is also a lock-on.

### 3.5 Hover rules
- **List/menu items:** a 3px Ignition bar plus a gunmetal fill wipes in (`scaleX 0→1`, origin left, 280ms `snap`). The label moves x +10px and its wdth goes 100 → 115. Exit is 160ms `drop`.
- **Save slots:** the hairline turns Ignition and the viewport switches from a still poster to 60fps live. Tilt is limited to 3°. No lift shadows.
- **Text links:** the underline grows via `background-size` 0 → 100% over 280ms.
- Hover feedback never starts later than 280ms and never runs longer than 520ms.

### 3.6 Page transitions: "Level load"
`onNavigate` returns a promise that resolves after the Out phase.
1. **Out (420ms `commit`).** A fullscreen low-res canvas (10px cells, around 190×110 cells) fills with Void wherever `bayer8[i] < progress`.
2. **Hold (minimum 380ms).** `LOADING LEVEL` in mono, the level title (`d2`, width bloom), a random loading tip, and a chamfered diamond spinner rotating 90° every 240ms with `blip`.
3. **In (520ms).** The dither reverses and the page title blooms.

Reduced motion replaces all of this with a 160ms crossfade. The language toggle never triggers it: lines just swap with y 8px and opacity, stagger 0.015.

### 3.7 Z-index

| z | Layer |
|---|---|
| 0 | WebGL canvas (fixed, full viewport) |
| 10 | Content |
| 20 | In-content overlays and tooltips |
| 40 | Grain |
| 50 | HUD |
| 60 | Reticle and prompt |
| 70 | Pause menu |
| 80 | Achievement toasts |
| 90 | Level-load overlay |
| 100 | Boot |
| 110 | Debug View labels and stat panel |

---

## 4. Signature moments

### S1: "Compiling 1,444 shaders" (boot)
- **Grid.** An `InstancedMesh` of 1,444 quads laid out 38×38 in the main canvas. Each instance has an `aOrder` attribute equal to `0.6·radialDist + 0.4·hash(cell)` (normalized), so the fill starts at the center and sparkles outward.
  - Fragment: `visible = step(aOrder, uProgress)`. Cells within 0.03 of the front flash Ignition and then settle to Bone.
  - Without WebGL, a CSS grid version uses the same order through `--o`.
- **Real progress, weighted:** fonts 0.15, dynamic three.js import 0.25, `renderer.compileAsync()` per registered scene 0.45, GPGPU warm-up (3 frames) 0.15.
  - The counter shows `COMPILING SHADERS 0912 / 1444` (round(progress × 1444)).
  - The footnote reads: *"Actual count: 9. The rest are for drama."*
- **Log column.** On the left, mono micro text in ash, one new line every ~90ms, at most 14 visible. The values are real:
  - `[0.014] renderer WebGL2 ok · maxTex 16384 · DPR 2`
  - `[0.081] preset HIGH (8 threads, fine pointer)`
  - `[0.203] compile horde.sim.frag ok 3.1ms`
- **Timing.** Minimum 1,100ms. If loading finishes early, the counter eases to 1444 with `commit`.
- **Handoff.** Each cell shrinks into a chevron. The hero simulation's position texture puts agents 0–1443 at the cell centers. Agents 1444 and up spawn at their parent `(i % 1444)` and burst outward in 600ms ("mitosis"), then seek the letters.
- **Title card.** `PRESS ANY KEY` (`TAP TO START` on touch) with a ring timer that auto-continues after 2,400ms. A key press unlocks *Any Key Located*.
- **Return visit** (`localStorage hyv.save`, wrapped in try/catch): two save slots, `CONTINUE (Checkpoint: R&D Lab · 7/15)` and `NEW GAME`. Continue scrolls to the checkpoint once the hero has assembled.

### S2: "The Horde" (hero crowd)
- **Simulation.** `GPUComputationRenderer` with two variables:
  - `texturePosition`: xy world position, z heading, w seed.
  - `textureVelocity`.
  - Sizes per tier: 128² = 16,384 (High), 128×64 (Medium), 64² = 4,096 (Low and mobile). Use half-float, and fall back if the half-float extension is missing.
- **Targets.** "HYVERNO" is drawn in Archivo 900 / wdth 125 on a 1024×256 offscreen canvas after the fonts load. Pixels with alpha above 0.5 are shuffled into a `DataTexture`, one unique target per agent (duplicates get jitter). Unique slots mean no clumping without needing neighbour searches.
- **Forces per frame:**
  - `seek = clampLen((target − pos)·4.0, 2.2)·(1 − uDisperse)`
  - `+ curl2D(pos·1.5 + t·0.1)·0.35`
  - `+ cursor repulse: normalize(pos − uCursor)·(1 − d/R)²·9` with R = 0.18
  - `+ flow (0, −1.4)·uDisperse`
  - damping 0.92
- **Render.** A single draw call: an `InstancedMesh` triangle-chevron. The vertex shader reads the textures via `aRef`, rotates by `atan(vel.y, vel.x)` and stretches by `1 + speed·0.6`. 6% of agents (`hash(i) < 0.06`) are Ignition "elites".
- **Click shockwave.** A `uShock(xy, t)` radial impulse. It also spawns **damage numbers**: a 128-instance quad pool sampling a 10-glyph digit atlas (canvas-baked JetBrains Mono 700). Each rises 40px with a `blip` scale and fades over 700ms. This is a deliberate setup for the Advanced Draw Number entry in the Lab.
- **Scroll.** Trigger from `top top` to `bottom top`, scrub 1. `uDisperse` goes 0 → 1: the name breaks apart, the crowd drifts down into the manifesto and settles to 25% opacity as a background texture.

### S3: Level Select (Ludogram) with live save slots
- **One renderer, many viewports.** The fixed canvas renders each registered scene into the `getBoundingClientRect()` of its DOM element using `setScissor` and `setViewport`. The `viewport` action/attachment registers the elements and rects are read once per frame. Content panels are transparent where viewports sit.
- **Pin.** The pin covers `+=270vh` and the track translates x with `ease: none`. It snaps with `snap: 1/(n−1)` (duration 0.2–0.5, `commit`).
  - Each slot has `focus = 1 − clamp(|slotCenter − vpCenter| / slotWidth)`. Focus drives scale 0.86 → 1, the `uBrightness` uniform 0.45 → 1, and **only the focused slot simulates at 60fps**. The others show a cached poster frame.
- **Slot anatomy.** Header `SLOT 01 · LUDOGRAM` with a status chip; a 16:9 chamfered viewport; a `d2` title; a 2×3 meta grid (CLASS, PUBLISHER, PLATFORMS, RELEASE, RECEPTION, STATUS); footer `[E] Load level · [→] Next slot`. The ←/→ keys and gamepad D-pad/LB/RB move between slots.
- **Load.** `Flip.fit` takes the viewport to a full-screen ghost (700ms `commit`), then the route changes. The detail page mounts the same scene id, so the change is seamless and skips the dither.

### S4: Walk on a planet (Crazy Planet Survivor)
- **Planet.** `IcosahedronGeometry(1, 40)` (detail 16 on mobile). The vertex shader displaces with fBm (5 octaves, amplitude 0.08) plus craters from `uniform vec4 uCraters[16]` (xyz direction, w depth).
  - With `a = acos(dot(n, c))` and `r = 0.22`: bowl `−w·(1 − (a/r)²)` for a < r, plus rim `0.3·w·exp(−((a − r)/0.05)²)`.
  - The GLSL lives in a shared chunk so the entities use the same height function.
- **Entities.** GPGPU 64² (High: 128×64). Positions are unit vectors in RGB.
  - Each step: `v += tangentToward(player)·accel + noise`, then `v −= dot(v, p)·p`, then `p = normalize(p + v·dt)`.
  - Render: an instanced 6-sided cone with up = p and forward = v, placed at height `1 + disp(p)`.
- **Player and spells.** The pointer ray hitting the sphere places an Ignition player marker, and the horde swarms it. Every 1.4s a "VFX Graph" ring (`uRing` direction and radius 0 → 0.35 rad) draws an emissive band on the surface and pushes entities away.
- **Click: terraform.** It writes a ring-buffer crater whose depth tweens 0 → 0.12 over 260ms with `blip`. Nearby entities get flung; 30% of them die and respawn at the antipode.
- **Biome.** `uBiome` goes from Earth (ocean `#1C4E80`, land `#36C77A → #C9B27C`, peaks `#F4F7F9`) to Ice (`#0E2A3B`, `#9FE6FF`, `#FFFFFF`). Lighting is one directional light plus a fresnel rim in `--lvl-accent`, with no shadows.
- **Scroll map (250vh, scrub 1):**
  - 0–0.25: camera dollies in (z 6 → 3.2) and the planet rises from y −1.4.
  - 0.25–0.7: rotation (scroll adds yaw), with the biome changing over 0.45–0.65 under the label `BIOME: EARTH → ICE`.
  - 0.7–1: the camera moves to the side and the brief panel enters from the right.
- **Local HUD:** `ENTITIES 8,192 · SURFACE: SPHERICAL · CRATERS 3/16 · SURVIVED 00:42`.

### S5: Achievement #1,445 and Debug View
- **Unlock.** Konami code `↑↑↓↓←→←→BA`. On mobile, tapping the HUD build tag 7 times (the Android developer-mode gesture) does the same.
- **Payoff.** A 120ms "hitch" pauses all tweens. The HUD trophy odometer rolls from 1,444 to 1,445 digit by digit (`blip`, 0.06 stagger). An ULTRA RARE toast appears with an alert-colored rim.
- **Debug View** (toggle afterwards with the backtick key, or in Options):
  - All meshes switch to `wireframe`, and agents render as velocity lines.
  - `html.debug` outlines every section in 1px `#FF00FF` and shows `::before` labels with component name and size (`data-debug`).
  - Grain turns off, and every empty image slot shows a magenta/black missing-texture checker.
  - A stat panel shows `Frame / CPU / GPU ms, draw calls, triangles, programs` from `renderer.info` and timer queries where available.
- Recruiters get a real profiler on top of the portfolio.

**Supporting flex: input that is actually wired.** Gamepad API polling in the ticker: the D-pad does fast travel, A interacts, B goes back, Start pauses. Connecting a controller shows a toast (*Controller detected. Prompts updated.*) and unlocks *Couch Co-op*.

---

## 5. Section-by-section choreography

### 5.0 Global HUD (persistent)
- **Top-left:** wordmark `HYVERNO` (Archivo 800/125, 16px) and the build tag `BUILD 1.445 · EN` in mono micro.
- **Top-center (1024px and up): compass ribbon.** A 420px strip with ticks every 8px and diamond POIs per section (TITLE, LORE, STUDIO, SIDE QUESTS, LAB, CONTRACTS, CAMPAIGN, CREDITS). A fixed center needle reads the strip, which translates with scroll progress. Clicking a POI fast-travels: `lenis.scrollTo` over 1.4s with `commit`, prompt `[E] Fast travel`.
- **Top-right:** `[EN|FR]` keycaps, SFX toggle (off by default), `[Esc] Menu`.
- **Bottom-left:** `OBJECTIVE`, the objective line for the current section (decoded on change) and a 2px progress bar.
- **Bottom-right:** telemetry `60 FPS · 16,384 ENT · 1.9 ms`, updated 4 times per second, and the trophy counter `1,444`.
- **Entrance:** each piece slides 24px in from its nearest edge (520ms `snap`, stagger 0.06).
- **Mobile:** wordmark, a menu button and an objective pill. Telemetry moves into the menu.

**Pause menu** (Esc, Start or the menu button):
- Background is 94% Void with a dither-in. The left column lists `Resume / Fast Travel / Achievements / Options / Contact` in `d2` at wdth 75, and the selected item blooms to 125.
- Simulations really pause (the sim stops stepping) and the label `SIMULATIONS PAUSED` shows.
- **Options:** Graphics Low/Med/High/Ultra (changes entity counts and DPR live), Motion Full/Reduced, SFX, Language, Prompts Auto/Keyboard/Gamepad.
- SFX are synthesized with WebAudio, with no audio files: hover is a 40ms 880Hz triangle; achievements are a 660 → 990Hz two-tone.

### 5.1 Preloader / Boot
See S1. Layout: the grid is centered at `min(56vmin, 520px)`, the log runs along the left title-safe edge, the counter sits bottom-right in mono `d2`. On exit the counter and log drop out (`drop`, 300ms) while the grid hands off to the horde. On mobile the grid is 72vw, the log shows 6 lines, and the stage is skipped after the first session.

### 5.2 Hero: "Title Screen"
- **Layout.** The crowd-drawn name fills the upper 55%. A visually hidden `h1` holds "Hyverno, Gameplay Programmer & Technical Artist".
  - Bottom-left, visible: `GAMEPLAY PROGRAMMER / TECHNICAL ARTIST` (Archivo 600/75, `h3`).
  - Bottom-right: an Instrument Serif italic voice line.
  - Center: `[Scroll] Start · [Click] Stress test`.
- **Motion.** The DOM lines width-bloom 300ms after handoff. On scrub, the S2 dispersal runs and the text exits at y −40 with fading opacity.
- **Interaction.** The cursor repels, and a click sends a shockwave with damage numbers (*Stress Test* achievement).
- **Mobile.** 4,096 agents. Touch-drag repels, and touch-action stays `pan-y`. The name fits 92vw.

### 5.3 Intro / Manifesto: "Character Sheet"
- **Layout, left 5 columns: a chamfered carbon card.**
  - CLASS: Gameplay Programmer / Technical Artist
  - GUILD: Ludogram
  - ORIGIN: France · ISTIC Rennes
  - SPECIALTY: crowds, water, explosions, multiplayer
  - COMPLETIONIST: 1,444 Steam achievements
- **Right 7 columns: dialogue in `--fs-voice`.** Words scrub from opacity 0.12 to 1 (from `top 75%` to `bottom 45%`).
- **Loadout.** Six square chamfered equipment slots:
  - PRIMARY: Unreal Engine 4/5 (C++, Blueprint, Mass, Niagara, HLSL, Materials)
  - SECONDARY: Unity DOTS/ECS (Burst, VFX Graph, FMOD)
  - SIDEARM: Godot
  - MODS: Rust
  - WEB KIT: SvelteKit, three.js, TypeScript, Node/Express
  - WORKSHOP: Figma, Blender, Substance
- **Motion.** Slot borders draw in (stroke-dashoffset, 280ms), then icons `blip` with a 0.07 stagger, like an inventory loading. On hover or focus, a loot-style tooltip appears with the line `RARITY: Daily driver`.
- **Mobile.** Slots go to 2 columns, and the tooltip becomes an inline expand on tap.
- **Unlocks:** *Lore Reader*.

### 5.4 Ludogram studio work: "Level Select"
- **Header:** `STUDIO WORK · LUDOGRAM`, then S3.
- **Slot 01: Monsters are Coming! Rock & Road.**
  - Class Gameplay Programmer, publisher Raw Fury, PC Nov 2025 (Steam, Game Pass), Xbox Series Aug 2026. Reception: Very Positive.
  - Preview: an orthographic top-down road whose stripes scroll in the shader (speed tied to scroll velocity). The city is 12 instanced boxes on wheels. Around 3,000 instanced monsters stream in from the edges and seek it. Eight towers fire `LineSegments` tracers, and monsters shrink to 0 when hit.
  - One Ignition dot is "you", a dispensable peon. Hovering kills and respawns it, and a `PEONS DEPLOYED: n` counter starts at 0.
- **Slot 02: Tabletop Game Shop Simulator.**
  - Gameplay Developer, publisher Knight Fever Games, Steam, May 28, 2026.
  - Preview: a procedural mini built from a `LatheGeometry` base plus capsule, sphere and cone parts, with a `partId` attribute. Focus progress runs three stages:
    1. Glue: parts fly in from exploded positions.
    2. Prime: everything goes to `#7A7A7C`.
    3. Paint: `mix(primer, paintColor[partId], smoothstep(uPaint − 0.08, uPaint, fbm(pos·6)))` gives brush-like patches.
  - Click rolls a d20 (`IcosahedronGeometry(1, 0)` has exactly 20 faces) for a "duel", and the result appears in the DOM.
- **Slot 03: Invokyr.**
  - Gameplay Developer / Network. Co-op for up to 4 players. Steam demo 94% Very Positive (1,100+ reviews).
  - The status chip is computed at runtime: `EARLY ACCESS IN 4 DAYS` before Oct 8, 2026, `OUT NOW · EARLY ACCESS` after. Dates are formatted with `Intl.DateTimeFormat`.
  - Preview: a 7×7 instanced tile board in darkness, four pawns in player colors, and a `RoundedBoxGeometry` d6 with pips baked on a canvas. One candle `PointLight` flickers at `1.2 + 0.25·noise(t·8)`.
  - Hover `[E] Roll`: a 700ms tumble to a face-lookup orientation.
    - On 3–6, HOPE: the candle flares and a tile lights up.
    - On 1–2, HORROR: the light turns blood red and a noise tendril creeps across the tiles.
- **Mobile.** No pin. A vertical stack where a slot simulates at 30fps only while it is at least 50% visible, and only one at a time. *Studio Tour* unlocks after all three have been focused.

### 5.5 Personal projects: "Side Quests That Got Out of Hand"
Each project is a full-bleed level. Entering it sets `data-level`. Each has a strip `LEVEL 0X · PERSONAL · STATUS`, a `d1` title, a viewport plus brief in two columns, tech chips and a prompt CTA.

**a) Crazy Planet Survivor** (status: IN DEVELOPMENT)
- S4 runs in full.
- Chips: Unity DOTS/ECS 1.3, URP, Unity Physics, VFX Graph, FMOD.
- Micro disclaimer: *"Web recreation in three.js. The real one runs on DOTS."*
- Mobile: 2,048 entities. Tap makes a crater and the player wanders on its own.

**b) Stixiva** (status: PUBLIC BETA)
- **Entrance.** The level-load canvas is reused with an X glyph per cell, so cream Aida cloth "stitches" across the screen in 600ms.
- **The Stitch Engine (one fragment shader).**
  - Uniforms: `uSource` (a 128² `CanvasTexture` seeded with a generative hills-and-sun scene in thread colors), `uGrid` (24–96, scrubbed by scroll), `uPalette[12]`, `uPaletteSize`, `uPointer`.
  - Per fragment: `cell = floor(uv·grid)`, `local = fract(...)`. Sample the source at the cell center and snap it to the nearest palette color using weighted RGB (2, 4, 3).
  - Stitches: `d1 = |l.x − l.y|`, `d2 = |l.x + l.y − 1|`, `thread = smoothstep(.17, .12, min(d1, d2))`. The top diagonal is 8% brighter. Fiber shading is `0.85 + 0.15·sin((l.x + l.y)·40)`, with a per-cell hash offset.
  - Cloth: `#F3EEE4`, with holes darkened near cell corners (distance below 0.12).
  - **Chart view under the needle:** within 6 cells of the pointer, cells show SDF pattern symbols (circle, square, triangle, cross) per color, which is the PDF pattern export idea made visible.
- **UI.** A mock Stixiva toolbar kept in French as a nod to the real app (`Atelier · Palette · Grille · Exporter le PDF`). Palette chips set 4/8/12 colors. Dragging on the source thumbnail draws into it, and the stitched result updates live.
- Chips: Tauri/Rust core, PixiJS WebGL, React/TypeScript, PDF export.
- **Mobile.** Draw directly on the stitched canvas (`touch-action: none` on that element only), with the grid fixed at 48.
- **Unlocks:** *Cross My Heart*.

**c) Le Rongeur** (status: WIP)
- **Entrance.** The section's top edge is an SVG path with 5–7 seeded semicircular bites. The cream rises and Pépite peeks out of a bite.
- **Pépite (SVG primitives).** Apricot body `#F2894B`, cream belly, brown `#2B1B12` eyes and outline.
  - Cheeks scale 1 → 1.6 with total bites.
  - Each bite squashes the body (scaleY 0.92 for 80ms, then `blip`).
  - Blinks every 2.5–6s at random (eyelid scaleY 1 → 0.1 → 1 over 120ms).
- **The Gnaw.**
  - A 3×3 loose grid of generic price tags (category glyph, generic product name, mono price). On scrub they rise with a 0.09 stagger and their prices roll down on odometers.
  - `[E] Bite` / tap adds an SVG `<mask>` circle at the pointer (r 16–26 px, plus two r 6–9 "tooth" satellites) and spawns 8 crumb squares that fall with gravity over 650ms.
  - Each bite cuts the price by 3–9% (420ms `blip` odometer). After 3 bites a `MEILLEUR PRIX` stamp lands, rotated −8°, scale 1.4 → 1.
- **Copy.** The FR tagline stays in both languages: *"Il ronge les prix."* The EN subline is *"It gnaws prices."* Merchants (eBay, Fnac, Darty…) appear as text only, never as logos.
- **Exit.** The cream gets bitten away to reveal the dark Lab, and Pépite waves.
- **Unlocks:** *Gnawed* (first bite) and *Cheeks Full* (12 bites).

### 5.6 R&D Lab: "Patch Notes"
- **Layout.** A dot-grid background. The left 3 columns hold a sticky version index; the right 9 columns hold the entries.
- **Entry anatomy.** A mono version line, a `d2` title at wdth 75 (the Lab is the condensed zone of the site), and bullets with tag chips `[NEW] [PERF] [NET] [GPU] [ECS]`.
- **Demos.** Each demo starts as a 16:5 poster. `[E] Run demo` expands it to 16:9 with Flip (520ms `snap`). Only one demo runs at a time.
- **Entries:**
  - `v5.0 Crowd Simulation (UE4)`: 2,000+ replicated entities, Flecs integration, recoded collision, quadtree and line traces, persistent GPU IDs in Niagara. Demo: 2,000 top-down agents with a live JS quadtree debug overlay (`[Q]` toggles it).
  - `v4.0 Advanced Draw Number`: 6,000× faster than UMG widgets, replicated, GPU-driven. Demo: `[E] Spawn 100,000` instanced digit quads, plus a **log-scale** bar chart labelled honestly. Unlocks *Six Thousand Times*.
  - `v3.0 Technical VFX`: "system within a system". Demo: 64 parent rockets each emitting 64 sparks (4,096 GPU points), next to an SVG node graph whose nodes light up stage by stage.
  - `v2.0 NavMesh × Mass`: a build-time triangulated navmesh JSON, A* on triangle adjacency with centroid smoothing, and agents that path to your click.
  - `v1.x Misc`: a Gerstner water demo (a 128² plane with 4 waves and steepness/wavelength sliders); multiplayer inventory and lobby as a replication diagram; Niagara VFX.
- **Motion.** Bullets "print" like console output (`clip-path inset(0 100% 0 0) → 0`, 280ms, stagger 0.06).
- **Footer:** *Known issues: developer occasionally optimizes things that were already fast enough.*
- **Unlocks:** *Patch Day*.

### 5.7 Clients / Missions: "Contracts"
**Quest log**, columns CLIENT · TYPE · STATUS:
- **OVHcloud** · Mission · Completed. *No other detail anywhere: no tooltip, no description.*
- **Stoetzel Sonorisation** · UI/UX and frontend (Svelte, Express) · Completed
- **Qanga** · UI design integrated in Unreal Engine · Completed
- **Assorted** · Discord webhooks, tools, Figma integrations · Completed

**Community log:**
- **Asynconf** · Organized, moderated and corrected ~300 exercises · Editions 1, 2 & 4
- **Unreal community Discord** · Terrain generation, Niagara, data · Ongoing

**Motion and layout.**
- Rows enter with the selection-bar wipe followed by a check-mark stroke draw (280ms, stagger 0.07).
- A `QUEST COMPLETE` stamp thumps onto the header (scale 1.3 → 1 with `blip`, plus a one-off 4px x-shake; no shake under reduced motion).
- Wordmarks are set in Archivo; no logos.
- On mobile, rows become stacked cards.

### 5.8 Experience: "Campaign"
- **Layout.** A vertical spine at column 4 (16px from the left on mobile). Giant outlined chapter numerals (`-webkit-text-stroke: 1px var(--c-rule)`) fill with Ignition when active.
- **Motion.** The spine fills with `scaleY` on scrub, with a diamond marker at the head. Each node unlocks at `top 60%`: the node does a `blip`, the card title blooms and a micro label shows `CHAPTER 03 UNLOCKED`.
- **Chapters:**
  1. Tutorial: a top-down Godot game, plus a site to sell game accounts.
  2. Freelance Arc: web design and frontend.
  3. Web TechArt: three.js, Three.js Journey certified.
  4. Academy: ISTIC Rennes.
  5. Into the Engine: water, explosions, crowds, multiplayer.
  6. Studio Era: Ludogram.
  7. Now Playing: personal projects. `Open to: studio roles · freelance`.
- Dates are optional content fields. **Never invent them.**

### 5.9 Contact / Footer: "Continue?"
- **Layout.** A full-viewport Void with `CONTINUE?` in `--fs-mega`. Below it, a mono countdown 9 → 0 (one `blip` swap per second, inside a ring). At 0 it shows `GAME OVER` for 1.2s, then *"…kidding. Inbox's always open."*, and stops.
- **Two save-slot buttons:**
  - `[E] Send a message` opens `mailto:solo.hyverno@gmail.com`.
  - `[C] Copy email` shows the address in mono and copies it, with the toast *Networking*.
- Link row: GitHub · LinkedIn · Steam profile (URLs come from config; leave them empty rather than guessing).
- **Credits roll.** A 40s CSS `translateY` loop that pauses on hover/focus and becomes a static list under reduced motion. The live lines read session counters, for example `Entities simulated this session: 1,204,332` and `Shaders compiled: 9 (we said 1,444)`.
- **End.** `THANKS FOR PLAYING · [Esc] Return to title` scrolls to the top and the crowd reassembles. Unlocks *Credits Roll*.

### 5.10 `/projects/[slug]`: "Mission Briefing"
- A full-bleed scene viewport (the same scene id as its slot), then BRIEFING, YOUR ROLE, INTEL (publisher, platforms, release, reception) and OBJECTIVES COMPLETED. Objectives come from content; empty fields stay hidden, with clear `TODO(Hyverno)` placeholders in the source and no invented claims.
- **Optional `media: {src, alt}` slot.** It reveals by **texture streaming**: the image is drawn to a canvas at 1/16 → 1/8 → 1/4 → 1/2 → 1 scale with `image-rendering: pixelated` over 600ms. Without media, the slot shows the procedural visual.
- **Footer:** `[Hold E] Next level`, a 650ms hold-to-confirm ring that drains in 200ms if released early. On touch it is a long-press.

---

## 6. Microcopy (EN)

**Headlines**
- Hero voice: *"I make thousands of things move at sixty frames a second, and make them look good doing it."*
- Hero alt: **Thousands of things. Sixty frames. One programmer.**
- Studio: **Studio work. Shipped, on sale, and slightly haunted.**
- Side quests: **Side quests that got out of hand.**
- Crazy Planet: **Thousands of enemies. Zero flat ground.**
- Stixiva: **From pixels to stitches.**
- Le Rongeur: **Il ronge les prix.** *Pépite gnaws prices so you don't have to.*
- Lab: **Patch notes from the R&D branch.** *Experimental. Unstable. Fast.*
- Contracts: **Contracts & side missions.**
- Campaign: **The campaign so far.**
- Invokyr subline: *Up to 4 players. Up to 4 regrets.*

**Objectives (HUD)**
- *Survive the title screen.*
- *Read the lore (optional, recommended).*
- *Pick a level.*
- *Break a planet.*
- *Take a bite.*
- *Read the patch notes. Nobody does.*
- *Hire the protagonist.*

**Prompts / CTAs:** `[E] Load level` · `[E] Run demo` · `[E] Roll` · `[E] Bite` · `[Hold E] Next level` · `[C] Copy email` · `[Esc] Menu` · `[~] Telemetry` · `[Scroll] Start`

**Achievements (15 plus #1,445)**

| Achievement | Description |
|---|---|
| Any Key Located | Legend said it existed. |
| Stress Test | You clicked the horde. It clicked back. |
| Lore Reader | Read the whole manifesto. Rare behaviour. |
| Studio Tour | Inspected all three Ludogram levels. |
| Planet Breaker | Physics was consulted. |
| Cross My Heart | Stitched your first pattern. |
| Gnawed | You took a bite. |
| Cheeks Full | Pépite is proud of you. |
| Patch Day | Read three patch notes voluntarily. |
| Six Thousand Times | 100,000 damage numbers, still 60fps. |
| Couch Co-op | Controller detected. |
| Contract Signed | Reached the contracts. |
| Campaign Complete | Reached the end of the campaign. |
| Networking | Email copied. |
| Credits Roll | Reached the credits. |
| **#1,445 · Developer Mode** | *You found the Konami code. You're basically hired. (Please hire him.)* Rarity: **ULTRA RARE** |

**Loading tips**
- *TIP: Hyverno has 1,444 Steam achievements. This site is trying to be #1,445.*
- *TIP: Every entity on this page runs on your GPU. Say thanks.*
- *TIP: Press [Esc]. The horde will wait.*
- *TIP: In Invokyr, a 1 is never good news.*

**Fallbacks**
- No WebGL: *"Your GPU called in sick. Here's the poster version."*
- 404: *"Out of bounds. You clipped through the level geometry. [E] Respawn"*

---

## 7. Accessibility and performance

**Accessibility**
- **`prefers-reduced-motion` (or Options → Reduced):**
  - Native scroll (no Lenis) and no pins: the Level Select becomes a vertical stack.
  - WebGL renders still frames: the crowd appears already assembled and the planet is a static render.
  - No dither, shake or width bloom: 160ms fades instead.
  - Boot takes 300ms. Credits are a static list.
- **Keyboard.** Everything works by keyboard. E or Enter interacts (only when focus is not in an input). There is a skip link `Skip intro`, focus uses the lock-on brackets, Esc pauses, and the Konami listener never captures keys inside inputs.
- **Screen readers.**
  - All canvases are `aria-hidden` and have adjacent text equivalents.
  - Toasts live in an `aria-live="polite"` region, queued with at most one visible.
  - Telemetry is `aria-hidden`; the menu exposes it as text.
  - Semantic `section` / `h2` structure, real `h1`.
- **Other.** Contrast is AA or better everywhere, including Ash and Ignition on Void. SFX are off by default. Light levels re-check ink contrast. `lang` is set per route.

**Performance**
- **Rendering budget.**
  - One `WebGLRenderer` with scissored viewports. Only scenes visible via IntersectionObserver get rendered, and only the focused scene simulates at full rate.
  - Rendering pauses on `visibilitychange` and while the pause menu is open.
  - DPR is capped at `min(dpr, 1.75)` on desktop and 1.25 on mobile.
- **Quality governor.** If FPS stays below 52 for 90 frames, step down one tier (entities and DPR), and say so in the telemetry: `DYNAMIC QUALITY: MED`. It is honest and itself a flex.
- **Bundling.**
  - Content is fully prerendered with adapter-static, for both `/` and `/fr` via `[[lang=lang]]`, with hreflang.
  - three.js and the scenes are dynamically imported per section.
  - Initial JS stays under ~180 KB gz before three.js.
  - LCP is DOM text from the boot screen.
- **Lifecycle.** Each scene module exports `init / update(dt, t, progress) / resize / dispose / poster()`. A Svelte 5 `$state` game store holds achievements, tier, input device, lang, debug and SFX. Every GSAP setup goes through `gsap.context()` inside `$effect`, with cleanup on navigation.
- **No WebGL.** `html.no-webgl` swaps every viewport for an SVG/CSS poster. Each one is built **before** its shader version: the crowd poster is the giant Archivo name, the planet an SVG with craters, Stixiva a CSS `repeating-linear-gradient` X-stitch.

---

## 8. Risks and how to de-risk

| Risk | Why it's hard | De-risk |
|---|---|---|
| GPGPU crowd and planet on mobile/Safari | Float render-target support varies, and fill rate is limited | Spike S2 on day 1 across three devices; half-float with a CPU `Points` fallback (≤2,048); governor; mobile tier set in the boot preset |
| Multi-viewport sync with Lenis | DOM rects and the canvas can drift by a frame | Read rects once per frame inside the same `gsap.ticker` callback that drives Lenis; render after Lenis updates; never use rAF separately |
| Pins plus fonts plus i18n | Width bloom and French strings change layout and break pin math | `refresh()` after `fonts.ready`, after language switches and after boot; SplitText `autoSplit` with `onSplit` returning tweens; tune `clamp()` against "PROGRAMMEUR GAMEPLAY" |
| Variable-width animation cost | Animating wdth causes a relayout every frame | Headings only, at most 1.1s, never on paragraphs; containers get fixed heights while it runs |
| Game metaphor tipping into kitsch | Too many devices cheapen the effect | Rule: one game device per viewport; no pixel fonts, no 8-bit sound; a copy pass that cuts every second joke |
| Honesty | Fake stats undermine a technical portfolio | Telemetry is real; demos are labelled "web recreation"; the 6000× chart uses a labelled log scale; no invented dates, roles or OVHcloud details |
| Achievement spam | Toasts can interrupt reading | A queue (one toast visible, 3.2s hold, 320ms exit); the persisted ones never re-toast; Options lets you mute toasts |
| Scope for one pass | Six bespoke scenes is a lot | Build order: tokens, layout and static content (both languages) → HUD, menu, reticle, achievements → posters → boot and crowd → Level Select → personal levels → Lab demos → Debug View. Every stage ships on its own. |