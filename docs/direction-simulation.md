# HEADCOUNT: Art Direction Spec for hyverno.com

---

## 1. Concept

**Name:** HEADCOUNT

**Pitch:** Every mark on this page is an entity. The type, the rules between rows and the project art are all one crowd of 16,384 agents. It reforms into each piece of work as you scroll, steers around your cursor and never drops a frame.

**Why it fits Hyverno:**
- His career is a rising entity count. It starts with one Godot sprite, goes to 2,000+ replicated crowd agents in UE4, then hundreds of Mass agents on a navmesh, then thousands of DOTS units on a sphere, then millions of GPU damage numbers. The site does not describe that work. It runs it.
- The no-external-images constraint becomes the concept. There are no screenshots because the portfolio is the demo reel.
- Debug overlays like bounding boxes, quadtrees, velocity vectors and stat counters are his everyday visual language from Niagara, the visual logger and stat unit. Here they become ornament.
- It is playful in a game-dev way: RTS unit selection, damage-number crits, achievements, patch notes and a co-op lobby. That says "ships games", not "makes Dribbble shots".

**Anti-cliché stance:** We reject glowing particles on a black void. Ours are **ink on paper**: crisp dark agents moving over warm lab paper, closer to an ant farm, a scientific plot or an engineer's notebook. Taste comes from restraint. One signal colour, hairline debug geometry, and each project brings its own palette.

**The rule:** Nothing on the site is a picture of motion. Every HUD number is real: entity count, fps, ms, selected units and numbers drawn.

---

## 2. Visual Identity

### 2.1 Palette

**Core (Paper theme, default)**

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#ECE9E1` | Page background, the "sim floor" |
| `--ink` | `#111110` | Entities, headings, body text (15.6:1) |
| `--graphite` | `#5F5E58` | Secondary text and HUD labels (5.3:1) |
| `--hairline` | `#D2CEC3` | Grid, rules, world-grid crosses |
| `--signal` | `#FF4A1C` | "Aggro" colour: selected/hot entities, cursor marquee, crits. **Graphics only** (2.8:1) |
| `--signal-text` | `#B8310D` | Signal used as text, links and serif accent words (≈5:1) |

**Viewport theme (Ludogram + Lab, "in-engine")**

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#0F1110` | Background |
| `--ink` | `#ECE9E1` | Entities and text |
| `--graphite` | `#8C8B84` | Secondary text |
| `--hairline` | `#262826` | Grid |
| `--signal` | `#FF5A2E` | Signal |

**Debug set (only inside Debug view mode and lab gizmos)**

| Token | Hex | Role |
|---|---|---|
| `--debug-cobalt` | `#2440FF` on paper / `#5B73FF` on dark | Quadtree lines, AABBs, obstacle outlines |
| `--debug-lime` | `#B8FF3D` | FPS ≥ 58, "ready" states (dark only) |
| `--debug-amber` | `#FFB020` | FPS 45–57, warnings |

**Contact theme ("Ink"):** background `#111110`, ink `#ECE9E1`, signal `#FF4A1C`.

**Chapter palettes** (scoped to their section, swapped through the theme engine):
- **Crazy Planet Survivor:** paper base. Earth uses sage `#8FA98B`, ochre `#D9A441` and ink contours. Ice uses `#A9D6F5` and prussian `#22406B`.
- **Stixiva:** Aida cloth `#F3EFE6`. Thread palette: `#B7332C` garance, `#E8A0A6` rose, `#D9A441` ocre, `#8FA98B` sauge, `#22406B` prusse, `#E9DFC9` lin, `#1B1B1B` encre, `#F07561` corail, `#A99AC9` lilas, `#2F5D46` bouteille.
- **Le Rongeur** (the client's brand): cream `#FFF3E2` as background, brown `#2B1B12` as ink, apricot `#F2894B` as signal.

**Theme engine:** a single JS object `theme = {paper, ink, graphite, hairline, signal}` (as THREE.Color). GSAP tweens it for 720ms with the `arrive` ease when a section's top crosses 50% of the viewport. `onUpdate` writes the CSS custom properties on `<html>` and the shader uniforms (`uPaper`, `uInk`, `uSignal`). There is one source of truth, so DOM and WebGL never drift apart.

### 2.2 Typography (3 families max)

| Family | Package | Import | Role |
|---|---|---|---|
| **Archivo** (variable) | `@fontsource-variable/archivo` | `import '@fontsource-variable/archivo/wdth.css'` (wght 100–900 + wdth 62–125; family `'Archivo Variable'`). Verify the filename in node_modules. | Display, headings, body, particle-type source |
| **Martian Mono** (variable) | `@fontsource-variable/martian-mono` | `import '@fontsource-variable/martian-mono/wdth.css'` (wght 100–800, wdth 75–112.5) | HUD, labels, data, damage-number atlas |
| **Instrument Serif** | `@fontsource/instrument-serif` | `400.css` and `400-italic.css` | The "human word": one italic word per headline at most |

Width is set with `font-stretch: 62%` etc. (fontsource declares the stretch range), falling back to `font-variation-settings: "wdth" 62`.

**Type scale**

| Token | Value | LH / tracking | Setting |
|---|---|---|---|
| `--fs-mega` | `clamp(4.5rem, 1rem + 15vw, 18rem)` | 0.82 / -0.02em | Archivo 900, wdth 62. Hero only, rendered by the swarm, with a DOM twin |
| `--fs-display` | `clamp(3rem, 1.2rem + 7vw, 9rem)` | 0.88 / -0.015em | 800, wdth 70 |
| `--fs-h1` | `clamp(2.25rem, 1.3rem + 3.8vw, 5.25rem)` | 0.95 / -0.01em | 750, wdth 80 |
| `--fs-h2` | `clamp(1.625rem, 1.2rem + 1.9vw, 3rem)` | 1.05 | 650, wdth 88 |
| `--fs-h3` | `clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)` | 1.2 | 600, wdth 100 |
| `--fs-lede` | `clamp(1.125rem, 1rem + 0.55vw, 1.5rem)` | 1.4 | 400, wdth 100 |
| `--fs-body` | `clamp(1rem, 0.96rem + 0.18vw, 1.125rem)` | 1.55, max 62ch | 400 |
| `--fs-hud` | `clamp(0.6875rem, 0.66rem + 0.12vw, 0.8125rem)` | 1.3 / +0.06em | Martian 450, wdth 87.5, uppercase, `tabular-nums` |
| `--fs-micro` | `0.625rem` | +0.08em | Martian 400, uppercase |

Rules:
- Headings are always condensed. Serif accent words use `--signal-text`, are scaled ×1.05 and are never bold.
- Numbers are always Martian Mono with tabular figures, so counters never jitter.

### 2.3 Grid

- 12 columns desktop (≥1024), 8 tablet, 4 mobile.
- Margin `clamp(16px, 4vw, 64px)`, gutter `clamp(12px, 1.6vw, 24px)`, max content 1680px, baseline 8px.
- Section block padding `clamp(96px, 14vh, 200px)`.
- **World grid:** a fixed layer of 1px `--hairline` "+" marks (7px) at every 64px intersection. It translates with scroll (`translateY(-scroll % 64)`), so the page reads as a world the camera pans over.
- **Viewport frame:** a 1px border inset 12px around the viewport, with ruler ticks every 64px on the top and left edges. The left ruler shows the world Y coordinate (`Y 004 280`) as you scroll.

### 2.4 Texture

- **Grain:** a 160px noise tile generated at runtime on a canvas, converted to a blob URL and used as a background on a fixed layer. `opacity: .05`, `mix-blend-mode: multiply`, background-position shifted with `animation: grain 1s steps(8) infinite`. On dark themes use opacity .07 with `screen`. Static under reduced motion.
- **Dither:** a 4×4 Bayer ordered dither is the house "image filter" (Density view, optional screenshots, planet shading bands). No blur and no glassmorphism anywhere.

### 2.5 Iconography and gizmos

There is no icon library. A custom 16px set with 1.5px strokes is drawn as debug gizmos:
- Velocity arrow, crosshair, AABB corner brackets, waypoint diamond, spawner (circle + dot), node and wire, keycap `[1]`.
- Focus rings, hover states and selection all use AABB brackets: four 10px corners, 1.5px, offset 4px.

### 2.6 The entity glyph

- **At rest** (speed < 0.05 u/s) an entity is a 2.5px round dot, so particle type reads as crisp halftone.
- **In motion** it morphs into a **dart** (notched arrowhead: 7px long, 5px wide, 30% notch) oriented along its velocity.
- Pixels at rest, agents in motion. Rendered as an SDF inside `gl_PointCoord`, so no textures are needed.

### 2.7 Layer stack (z-index)

| z | Layer |
|---|---|
| 0 | Body background (`--paper`) |
| 5 | World grid and grain |
| 10 | Content DOM |
| 20 | WebGL canvas (fixed, `pointer-events:none`, alpha) |
| 30 | Debug overlay DOM (AABB labels, obstacle outlines) |
| 40 | Fixed HUD (corners, nav, view modes, stats) |
| 50 | Custom cursor and selection marquee |
| 60 | Achievement toasts |
| 70 | Ink Swarm transition quad (separate small canvas, or the main canvas promoted) |
| 80 | Preloader |
| 100 | Skip link, focus-visible outlines |

The canvas sits above the DOM, but entities treat text blocks as colliders (see 4.2), so they walk around the copy and never over it.

---

## 3. Motion Language

### Principles
1. **Nothing teleports.** Everything arrives from somewhere and is steered, not tweened. GSAP moves *targets*. Physics moves *bodies*.
2. **Stagger is a crowd.** Never use a uniform index stagger. Use hash plus spatial order, so groups leave from one side like a stadium wave.
3. **Fixed timestep, variable render.** HUD numbers update at 4Hz with stepped eases, like a game's stat overlay.
4. **Debug is decoration, decoration is data.** Every gizmo shows a real value.
5. **Snap for UI, spring for matter.** UI chrome snaps. Entities, cheeks and planets overshoot.

### Named eases
Register with `gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase, EasePack)`.

| Name | CustomEase path | ≈ cubic-bezier | Use |
|---|---|---|---|
| `steer` | `M0,0 C0.18,0.9 0.32,1 1,1` | (0.18, 0.9, 0.32, 1) | Default out: reveals, HUD moves |
| `arrive` | `M0,0 C0.7,0 0.2,1 1,1` | (0.7, 0, 0.2, 1) | Theme changes, Flip, formations driven by time |
| `spawn` | `M0,0 C0.3,1.6 0.55,1 1,1` | (0.3, 1.6, 0.55, 1) | Pops, damage numbers, cheeks, keycaps |
| `despawn` | `M0,0 C0.6,0 0.9,0.4 1,1` | (0.6, 0, 0.9, 0.4) | Exits |
| `snap` | `M0,0 C0.9,0 0.1,1 1,1` | (0.9, 0, 0.1, 1) | View-mode switch, toggles |
| `tick` | `steps(4)` / `steps(8)` | — | Counters, ruler, fills |
| `glitch` | `rough({strength:1.2, points:24, taper:'out', randomize:true, clamp:true})` | — | Invokyr horror rolls |

### Durations and staggers

| Token | Value |
|---|---|
| `--t-micro` | 120ms |
| `--t-fast` | 240ms |
| `--t-base` | 480ms |
| `--t-reveal` | 720ms |
| `--t-morph` | 1400ms |
| `--t-page` | 1000ms (500 out + 500 in) |

- SplitText staggers: chars 0.014s, words 0.035s, lines 0.09s. Table rows 0.06s.
- Crowd stagger happens in-shader over 45% of the mix window (see 4.2).
- Line reveals: `yPercent: 110 → 0` inside a `mask: "lines"` wrapper, 720ms, `steer`.

### Scroll
- `new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.9 })`.
- One RAF for everything:
  ```
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => { lenis.raf(t*1000); sim.frame(t) })
  gsap.ticker.lagSmoothing(0)
  ```
- Formation scrubs use `scrub: 0.6`. Pinned narratives use `scrub: 1`.
- Ludogram snaps: `snap: { snapTo: 1/2, duration: {min:.3, max:.8}, ease: 'arrive', delay: .08 }`.
- Scroll velocity feeds `uScrollVel`, so the crowd lags behind fast scrolls and catches up. That is inertia the user can feel.

### Cursor (only with `(hover:hover) and (pointer:fine)`)
- **Default:** a 10px ink crosshair, lerp 0.35 (snappy, not floaty). In the sim it acts as an invisible obstacle with a 0.22u radius (≈120px at 1080p).
- **Over links:** the crosshair morphs into AABB brackets fitted to the element's rect (Flip, 240ms, `steer`), with a micro label: `LINK`, `PROJECT`, `COPY`.
- **Click and drag:** an RTS selection marquee. Dashed signal outline, signal fill at 6%.
- Debug mode adds a coordinate readout (`X 0412 Y 0233`) and the dashed aggro radius.

### Hover rules
- **Text links:** the underline is a row of 2px dots (`radial-gradient` repeat). On hover it becomes marching ants: `background-position` animates 400ms linear infinite.
- **Primary CTA:** a rectangle with corner brackets. On hover the brackets push out 6px and the ink fill sweeps in `steps(4)` over 240ms. The label swaps to mono `[ ENTER ]`.
- **Project titles:** `font-stretch` 62% → 100% over 480ms `steer`, plus an AABB label `ENTITY 0x03 · 412×288`. Never animate font width on more than 3 elements at once, because it triggers reflow. Wrap them in `contain: layout paint`.
- **Rows and cards:** hairline rules become entity rows (see Contracts).

### Page transitions: "Ink Swarm"
Applies to `/projects/[slug]` and to the EN↔FR toggle.
- **Out (500ms):** all entities target the `fill` formation, a jittered grid covering the viewport. A fullscreen quad thresholds the density field, `alpha = smoothstep(.35, .6, density*uInkGain)`, while `uInkGain` ramps 0→6. The crowd spreads like ink until the screen is solid `--ink`.
- **Navigate:** in `onNavigate`, return a promise that resolves when cover is complete.
- **In (500ms):** reverse into the new page's first formation.
- The canvas lives in `+layout.svelte`, so it survives navigation.
- Reduced motion: a 200ms opacity crossfade.

---

## 4. Signature Moments

### 4.1 Spawn Wave (preloader → hero)
- A single spawner gizmo sits at the centre of a paper screen. The HUD reads `SPAWNING ENTITIES 00000 / 16384`.
- Loading progress is real and is shown as spawned count:

  | Milestone | Progress |
  |---|---|
  | Fonts ready | 30% |
  | `renderer.compileAsync()` done | 60% |
  | Formations baked | 90% |
  | First sim frame | 100% |

- Unspawned entities (`index > progress*N`) sit at the spawner with alpha 0. Spawned ones are ejected along a golden-angle spiral (`angle = i*2.39996`, speed 0.6–1.2 u/s).
- At 100%, `uMix` tweens 0→1 into the HYVERNO formation (1400ms, `arrive`). The crowd lands into the letters from left to right.
- The preloader's mono labels Flip into their HUD corner slots (720ms, `steer`).
- Minimum 1.6s, hard skip at 4s. Repeat visits in the same session (`sessionStorage`) play a 0.6s version.

### 4.2 The Crowd Reforms (the core engine)

**Simulation:**
- GPGPU via `GPUComputationRenderer`.
- `SIM = 128` (16,384) on desktop, 96 on tablet, 64 on mobile.
- Textures:
  - `texPos` (RGBA): x, y in world units (y ∈ [-1,1] = viewport height, x ∈ [-aspect, aspect]), z = seed, w = selected flag.
  - `texVel` (RGBA): vx, vy, speed, age.
- Use `FloatType` when `EXT_color_buffer_float` is present, otherwise `HalfFloatType`. Coordinates are normalized, so half precision is ~1px.

**Formations:**
- Each formation is a 128×128 `DataTexture` of targets: xyz in a normalized [-1,1]³ box, w = weight (0 = free roam).
- An optional `paint` texture gives a per-entity colour.
- **Every baker returns exactly N slots.** Spare slots get weight 0 and ambient positions.
- Bakers:
  - Text: draw with Archivo on an offscreen canvas after `document.fonts.load`, read pixels, jittered-grid subsample to 0.75N.
  - SVG paths: `getPointAtLength`.
  - Parametric: d20 edges, grids, rings.
- **Hilbert sort every formation's slots** by their 2D position, so entity *i* is left-ish in every formation. Paths stay coherent instead of crossing chaotically. This is the single most important trick in the engine.

**Velocity shader uniforms (with defaults):**
- `uTargetA`, `uTargetB`, `uMatA`, `uMatB` (mat4: maps the box to the section's region rect, minus scroll; rotation for 3D formations), `uMix`, `uMixSpread = .45`.
- `uSeek = 6.0`, `uMaxSpeed = .9`, `uMaxForce = 4.0`, `uArrive = .18`.
- `uDensity` (sampler), `uSep = .6`.
- `uWander = .25`, `uNoiseScale = 1.8` (2D curl noise).
- `uMouse`, `uMouseVel`, `uMouseR = .22`, `uMouseF = 8.0`.
- `uObstacles[16]` (vec4 cx, cy, hw, hh), `uObstacleCount`.
- `uPing` (x, y, age, strength).
- `uScrollVel`, `uScrollDrag = .35`.
- `uPanic`, `uCommand` (x, y, active).

**Per-entity mix:**
- `s = mix(hash(id), hilbertT, .6)`
- `m = smoothstep(s*uMixSpread, s*uMixSpread + (1-uMixSpread), uMix)`
- `target = mix(project(uMatA*tA), project(uMatB*tB), m)`

**Forces:**
- Arrive-seek, scaled by target weight.
- Separation: `-gradient(density) * uSep`.
- Curl wander: ×4 when weight is 0.
- Cursor: radial push `(1-d/R)²` plus a tangential flow-around component of 0.6×, so the crowd parts around the cursor instead of bouncing off.
- DOM obstacles: rounded-box SDF push.
- Scroll drag, ping ring impulse (ring radius = 1.4u/s × age, band 0.06u).
- Damping `exp(-2.2*dt)`.
- Integration: semi-implicit Euler, dt clamped to 1/30, at most 2 substeps.

**Density pass:**
- Render the points additively into a 256×256 HalfFloat RT with `generateMipmaps: true`.
- 4px Gaussian splats: `exp(-r²*4)*.25`.
- Reused by separation, the Density view, the quadtree and Ink Swarm.

**Render pass:**
- `THREE.Points`. The `ref` attribute gives each vertex its sim uv.
- `gl_PointSize = uSize(7) * dpr * mix(.85, 1.25, speedN)`.
- The fragment shader rotates `gl_PointCoord` (flip y) by the heading and blends dot → dart SDF by speed. Colour = `mix(ink, paint, uPaintMix)`, and signal if selected or panicking.

**The DOM is level geometry:**
- Every `[data-collider]` (paragraphs, headings, cards) is an obstacle.
- Rects are cached through ResizeObserver and offset by `lenis.scroll` each frame. Never call `getBoundingClientRect` inside the loop.
- The crowd flows around the copy like water around stones.

**Scroll mapping:**
- Each section registers `use:formation={{ id, region }}`.
- A ScrollTrigger from `top 80%` to `top 20%` scrubs `uMix` between the previous formation and this one.
- `onEnter` / `onEnterBack` swap the A/B pair. Fast flicks across several sections just retarget, and the physics absorbs the discontinuity.

### 4.3 Aggro and Crits (cursor, ping, RTS, damage numbers)

**Click: ping**
- Sets `uPing`. A shockwave ring shoves entities outward.
- Spawns a burst of 12–40 **GPU damage numbers** along the ring, as a tribute to his Advanced Draw Number plugin.

**Damage numbers:**
- `InstancedBufferGeometry` (one quad per number) with a ring buffer of 4,096.
- Attributes: `aSpawn` (x, y, t0), `aValue`, `aFlags` (crit, digit count).
- Digit atlas: Martian Mono 800 at 64px, glyphs `0–9 !`, drawn into a 704×80 `CanvasTexture` at runtime.
- The fragment shader extracts digit *k* with `floor(mod(value/pow(10,k),10))`.
- Vertex motion over t ∈ [0, 0.9s]:
  - Scale: 0 → 1.35 at 0.12, settling to 1 by 0.3.
  - Rise: 60px. Drift: ±15px.
  - Fade: from 0.7.
- 10% are crits: ×1.6 size, signal colour, `!` suffix, values ×2.5.
- The HUD counter `NUMBERS DRAWN` accumulates across the visit.

**Drag: RTS select**
- `uSelectRect` marks entities inside the box (`texPos.w = 1`, written by a one-shot pass on mouseup). Selected entities turn signal.
- **Count is real:** selected points are rendered additively into a 1×1 float RT, then read with `readRenderTargetPixelsAsync`. The HUD shows `142 UNITS SELECTED`.
- The next click is a **move command**: `uCommand` makes selected units seek the click point with arrive. Click empty space or press Esc to deselect.
- Hint in the hero: `DRAG TO SELECT · CLICK TO COMMAND`.

### 4.4 View Modes [1] [2] [3] [4]
Switch with keys 1–4 or the bottom-left HUD keycaps. Uses the `snap` ease (240ms) and a full-screen stepped scanline sweep that applies the new mode top to bottom.

- **[1] LIT:** the default.
- **[2] DENSITY:** a fullscreen quad shows the density RT through a ramp (paper → apricot `#F2894B` → signal → ink) with Bayer 4×4 dithering. A heatmap of the crowd.
- **[3] DEBUG:**
  - **Shader quadtree.** For each pixel, loop levels L = 1..7. Sample `textureLod(uDensity, cellCentre, 8-(L-1))` and subdivide while the mean density exceeds `uQuadThreshold`. Draw 1px cobalt lines on the edges of the deepest cell. It is a real adaptive quadtree, computed per pixel from mipmaps.
  - **Velocity vectors:** a LineSegments pass reading the sim, drawing every 4th entity from `pos` to `pos + vel*.08`.
  - **AABB brackets** on every collider, labelled `div.copy · 512×184`.
  - Obstacle outlines, the cursor aggro radius, and a stats panel: draw calls, `sim ms`, `render ms`, fps graph sparkline.
- **[4] IDs:** each entity is coloured `hsv(hash(id), .55, .85)`. Colours **persist through every formation**, a nod to his persistent GPU IDs in Niagara. Scrolling in this mode makes the Hilbert mapping visible, and that is beautiful.

### 4.5 Floor → Planet (Crazy Planet Survivor)
The flat crowd wraps into a world.

1. **Disc (0–.25 of the pinned section):** the global swarm forms `planetDisc`. Its targets are the *screen projections* of the planet entities' initial 3D positions, computed on the CPU with the planet camera. Back-hemisphere entities sit on the rim.
2. **Handoff (.25–.32):**
   - Init the planet sim with those same 3D positions.
   - Crossfade the global swarm out and the planet entities in over 150ms, at identical screen positions.
   - The sphere draws in with a contour sweep (`uReveal`: discard height bands above the reveal value), 600ms.
3. **World (.32–.85):**
   - Scroll drives planet `rotation.y` from 0 → 1.4π and a camera dolly.
   - Entities chase a signal "player" dot.
   - Auto-spells every 2s. A click raycasts to the sphere and casts at that point.
4. **Release (.85–1):** reverse through the same disc formation, with mismatch hidden by a 200ms crossfade.

**Planet build:**
- `IcosahedronGeometry(1, 40)`. Shared GLSL `terrain(n)` = `fbm(n*2.2)*.08` minus crater bowls from `uCraters[8]` (dir.xyz, radius; ring buffer).
- Each crater animates radius 0→r over 400ms with the `spawn` ease, with a raised rim.
- Shading: 3-step toon (paper / graphite / ink), Bayer dither between bands, ink iso-height contours (`fract(h*40)`), 1px ink rim. Ice mode swaps palette and adds a stepped specular glint. **No atmosphere glow.** There is a dashed orbit-ring gizmo instead.

**Planet entities:**
- A separate 64×64 GPGPU.
- pos = unit normal, w = hop height. Velocity is tangent.
- Steering is projected onto the tangent plane: `v -= dot(v,n)n; n = normalize(n + v*dt)`.
- Crater impulse: tangential push plus a hop.
- Rendered as `InstancedMesh` cones (4-sided), with the basis built from the normal and velocity in the vertex shader.
- Spell hits spawn crit damage numbers at the projected hit point.

---

## 5. Section Choreography

### 00 · Preloader: SPAWN
As in 4.1. Copy: `SPAWNING ENTITIES`, `COMPILING SHADERS`, `BAKING FORMATIONS`, `READY`.

Mobile: 4,096 entities, max 1.2s.

### 01 · Hero: HYVERNO
**Layout:**
- The swarm forms HYVERNO at `--fs-mega` across 10 columns, vertically centred.
- The DOM `<h1>` twin sits at the same position: visually hidden when WebGL runs, visible as the fallback.
- Under it, a lede on cols 2–7: role line plus one sentence.
- HUD corners:
  - Top-left: `HYVERNO /SIM v3.0`
  - Top-centre: anchor nav
  - Top-right: `EN / FR`, `SFX OFF`
  - Bottom-left: view-mode keycaps
  - Bottom-right: `16,384 ENT · 60 FPS · 1.8 MS`

**Motion:**
- Lede lines rise (720ms, `steer`, stagger .09) 200ms after the formation settles.
- Idle **stadium wave** every 7s: a y-offset sine band sweeps left to right over 1.2s.
- Cursor parts the letters, and they re-arrive.

**Exit scrub:** formation → manifesto free-flock. Letters break formation from left to right. The lede slides up −40px and fades out.

**Mobile:** no cursor. A tap pings (a tap is never a scroll-blocker). The wave plays on load.

### 02 · Manifesto: README
**Layout:** a mono label `02 / README` on col 1. Big statement in `--fs-h1` on cols 2–11, with one serif italic word.

**Motion:**
- SplitText lines reveal on scroll (`scrub: 1`).
- As each line reveals, a temporary attractor (`uAttractors[4]`) pulls a cluster to the line's bbox. Entities swarm in, the line materialises, and they disperse.

**Stats row:** five counters in Martian, ticking up with `steps(8)` on enter:
- `~7 YRS OF CODE`
- `3 STUDIO TITLES`
- `2,000+ REPLICATED ENTITIES`
- `6000× FASTER THAN UMG`
- `1,444 STEAM ACHIEVEMENTS`

**Mobile:** reveals use `toggleActions` instead of scrub.

### 03 · Ludogram: SHIPPED (Viewport theme)
The theme flips to dark over 720ms: "we're in-engine now".

**Layout:**
- Pinned for 300vh, snapping to 3 slots.
- Left, cols 1–5, is a mission-brief panel (a collider):
  - Title (`--fs-display`)
  - Role chip
  - Publisher, platforms, date
  - Review stat as a HUD line
- The formation occupies the region box on cols 6–12.
- Footer ticker: `01/03`.
- An optional image slot shows a 1-bit Bayer-dithered capsule that colours in on hover.
- No publisher logos, only names.

**Game 1: Monsters are Coming! Rock & Road** (Raw Fury)
- Formation: 20% of entities form a little walking city (SVG path of houses on stilts). `uMatB` translates it right as you scroll. The other 80% are a weight-0.3 horde seeking a point behind the city.
- One entity is permanently signal-coloured, with a live label `PEON #4471 (DISPENSABLE)`. Its position comes from an 8×1 named-entity readback every 3 frames.
- HUD: `PC NOV 2025 · XBOX SERIES AUG 2026 · STEAM: VERY POSITIVE`.

**Game 2: Tabletop Game Shop Simulator** (Knight Fever Games)
- Entities snap into stocked shelves: blocks of 4×6 entities in rows.
- At 60% progress one block "opens a mystery pack". It bursts with the `spawn` ease and reveals one signal "rare mini" with the label `RARE PULL`.
- HUD: `RELEASED MAY 28 2026 · STEAM`.

**Game 3: Invokyr**
- Entities trace a d20: 30 icosahedron edges as 3D targets, rotated through `uMatB`.
- On slot enter, it rolls: 1.4s tumble, `spawn` ease, landing on a random face. The result shows in `--fs-display`.
  - **≥11 "HOPE":** calm, ordered.
  - **≤10 "HORROR":** `uPanic → 1`. Wander ×4, flee from centre, signal tint, HUD text jitters with the `glitch` ease for 600ms.
  - **Nat 20:** confetti of crits.
- Three AI ghost cursors (P2–P4) wander as extra obstacles, with labels `P3 · RTT 48ms`. A co-op and netcode nod.
- HUD: `CO-OP 1–4 · DEMO 94% (1,100+ REVIEWS) · EARLY ACCESS OCT 8 2026`.

**Mobile:**
- Unpinned stacked cards, each 100svh. The formation triggers on enter (not scrubbed), with the region above the text.
- d20 rolls on tap.

### 04 · Side Quests: personal projects
Each project gets its own chapter and theme. The intro label is `04 / SIDE QUESTS`, with the headline "Built after hours. Shipped anyway."

**Crazy Planet Survivor** (paper → chapter palette)
- Signature 4.5, pinned for 300vh.
- Copy panels on the left: what it is, the stack (Unity DOTS/ECS 1.3, URP, Unity Physics, VFX Graph, FMOD, procedural destructible planets).
- Toggle chips `[EARTH] [ICE]` swap palette and noise (`snap` ease, 240ms).
- HUD: `ENTITIES ON SPHERE 4,096 · CRATERS 3/8`.
- Mobile: no pin. The planet auto-rotates with 2,048 entities at detail 20. Tap casts a spell.

**Stixiva** (Aida theme)
- Background: Aida weave. `radial-gradient(circle, rgb(0 0 0/.08) 1px, transparent 1.6px) 0 0/10px 10px` over `#F3EFE6`.
- **Formation:** a 72×48 stitch grid (3,456 entities). The glyph uniform switches to **X-stitch** (two crossed SDF capsules). The paint texture gives the thread colours. Remaining entities line the hem.
- **Converter panel** (Canvas2D), with two panes:
  - **SOURCE:** a procedural motif, a polar-rose flower (`r = cos(5θ)`) with a radial gradient.
  - **PATTERN:** k-means (k = 10) palette fitted at init, nearest-colour mapping, optional Floyd–Steinberg toggle `DITHER ON/OFF`. Real cross-stitch convention: a symbol per colour (● ▲ ■ ◆ ✚ …) and a bold grid line every 10 cells.
- Scroll scrubs a conversion scanline from left to right.
- Hovering a cell shows `FIL 0817 · CORAIL · ×214 POINTS`. Legend chips below show counts.
- A `PDF EXPORT` chip plays a stepped "print" scan.
- Copy mentions the French UI, the public beta, PixiJS + Tauri/Rust + React/TS, and the paywall plan only as "Pro tier coming".
- Mobile: a 48×32 grid. The scanline triggers on enter.

**Le Rongeur** (Rongeur theme: cream / brown / apricot)
- **Hero object:** a giant price, `249,99 €`, in Archivo 900 wdth 62.
- Each scroll step adds a **bite**: a CSS `mask-image` stack of `radial-gradient` circles on the edge. The price ticks down `249,99 → 219,49 → 197,00 → 184,90` with `steps(6)`, then the stamp `RONGÉ −26 %` lands with the `spawn` ease.
- Clicking the price bites at the cursor and bursts apricot crumbs (the damage-number system with dot glyphs).
- **Pépite:** a procedural SVG hamster.
  - Body ellipse in brown, cream belly, apricot cheek ellipses, ear circles, eye dots with glints, 3 hairline whiskers.
  - Eyes track the cursor.
  - Cheeks inflate with the `spawn` ease (scale 1 → 1.35) each time a crumb stream arrives.
- **Formation:** entities become apricot round "deals" streaming along curved paths from mono feed labels (`EBAY · FNAC · DARTY · …`) into Pépite's cheeks.
- Decorative "bitten" generative blobs (superellipse plus 1–3 circular bites, seeded per visit) act as dividers.
- Copy mentions SvelteKit + Drizzle and official merchant APIs and feeds.
- Mobile: auto-bites on enter; crumbs reduced ×0.5.

### 05 · Lab: R&D (Viewport theme)
**Layout:**
- A 3×2 grid of "editor viewports", each with a toolbar: `PERSPECTIVE · LIT · REALTIME ●`.
- One renderer draws all cells with `setScissor` / `setViewport` at cached DOM rects. Only cells visible to an IntersectionObserver render.
- The global swarm parks in the **gutters** as marching columns of dots. The crowd becomes the grid lines.

**Cells:**
1. **CROWD SIM (UE4 + Flecs):** 2,048 agents with the shader quadtree always on.
2. **ADVANCED DRAW NUMBER:** hold to flood 1,000 numbers per second. Counter, plus the line "UMG would be at 0.2 fps right now."
3. **SYSTEM IN SYSTEM (Niagara):** fireworks where each particle is an emitter. An SVG node graph sits beside it with wires that pulse on spawn.
4. **NAVMESH × MASS** (Canvas2D allowed): a cobalt triangulated mesh with obstacles and a BFS flow field on a 48×27 grid. 300 agents path to the cursor.
5. **GERSTNER WATER:** 4 waves in ink contour lines. Live sliders for steepness Q and wavelength.
6. **REPLICATION** (Canvas2D allowed): split `SERVER | CLIENT` view with a latency slider (0–300ms) and an `INTERP ON/OFF` toggle. The jitter is visible, then fixed. A mini lobby/inventory grid mirrors moves with lag.

**Motion:**
- Cells reveal with an AABB draw-on (brackets grow 0 → full, 480ms, `steer`, stagger .06).
- Hovering a cell Flips it to a 2×2 span (480ms, `arrive`) and the others dim to 40%.

**Mobile:** cells stack vertically, and only the centred one runs.

### 06 · Contracts: CONTRACTS (paper)
**Layout:** a quest-log table (`CLIENT · ROLE · STACK · STATUS`) with names in `--fs-h1`, condensed.

**Rows:**
- **OVHcloud** — `Mission` — `—` — `✓` (nothing more)
- **Stoetzel Sonorisation** — UI/UX + front-end — Svelte, Express
- **Qanga** — UI design integrated in Unreal Engine
- **Assorted** — Discord webhooks, tools, Figma integrations

**Volunteer block:**
- **Asynconf:** organised, moderated and corrected ~300 exercises (editions 1, 2, 4).
- **Unreal community Discord:** terrain gen, Niagara, data.

**Motion:**
- The **horizontal rules are entities**: formation targets along each rule.
- Hovering a row spreads that row's rule entities into AABB brackets around it (`steer`, 480ms). The name widens to wdth 100.

**Mobile:** rows stack as cards; the rules are static dotted CSS.

### 07 · Timeline: PATCH NOTES (paper)
**Layout:**
- A vertical changelog with the spine at col 2.
- The formation is a conveyor: targets slide downward with `fract(time*.05)` wrap. Entities cluster at waypoint diamonds for each version.

**Version blocks** (dates to confirm against his CV):
- `v0.1` Godot top-down game
- `v0.2` web shop for game accounts
- `v1.0` freelance web design / front-end
- `v1.4` Web TechArt, three.js, ThreeJS Journey certified
- `v2.0` ISTIC Rennes
- `v3.0` Ludogram
- `v3.x` current side quests

Each block uses mono lines with coloured prefixes: `+ Added`, `~ Changed`, `− Removed`, `! Known issue`.

**LOADOUT** sub-block: an RPG inventory of 64px slots (text, no logos) with rarity tags:
- **LEGENDARY:** UE5 C++, Niagara, Mass, HLSL
- **EPIC:** Unity DOTS, three.js
- **RARE:** Rust, Svelte, TypeScript
- **COMMON:** Figma, Blender, Substance, Node

Hovering a slot shows an item tooltip.

**Motion:** blocks reveal per line (stagger .09). Version numbers tick through `steps(4)`.

**Mobile:** the spine sits on the left edge at 16px.

### 08 · Contact: PRESS START (Ink theme)
**Layout:**
- A co-op lobby: four player slots.
  - `P1 HYVERNO [READY]`
  - `P2 YOU [PRESS START]`
  - Two empty slots
- `--fs-display` headline. The email is huge DOM text with a `COPY` button and the CTA `PRESS START` (mailto).
- Social links are placeholders.

**Motion:**
- Entities form a ring around the lobby.
- Copying bursts crits and shows the toast `COPIED · +50 XP`.
- At the very bottom, all entities **despawn** into the spawner and the counter rolls to `00000`. `RESPAWN ↑` scrolls to the top and replays the spawn wave.

**Footer:** `Built with SvelteKit, three.js, GSAP. 16,384 entities simulated. No UMG widgets were harmed.`

### Optional `/projects/[slug]`
- A `SPEC SHEET` table (engine, role, team, platforms, status), long-form text and dithered media slots.
- `NEXT LEVEL →` forms the next project's formation as you approach.
- Transition: Ink Swarm.

### Bilingual
- `/` (EN) and `/fr` are both prerendered, with `hreflang`. The dictionaries are `src/lib/i18n/{en,fr}.ts`.
- The toggle uses Ink Swarm, and text formations re-bake per language.
- HUD labels need min-widths for FR (`ENTITÉS`, `IMAGES/S`).

---

## 6. Microcopy (EN)

**Hero:** "Gameplay programmer & technical artist. I make thousands of things move at 60fps, and look *good* doing it."
**Hero hint:** `DRAG TO SELECT · CLICK TO COMMAND · PRESS [3] TO SEE THE WIRES`

**Manifesto:** "I started with one sprite. Then two thousand replicated soldiers. Then millions of damage numbers. The headcount keeps going up. The frame time doesn't."

**Shipped:** "Shipped. On Steam. With reviews and everything."
- **Monsters are Coming!:** "You play a dispensable peon. I programmed the peon."
- **Tabletop Game Shop Simulator:** "Glue, paint, duel, restock. I wrote the code for all four."
- **Invokyr:** "Jumanji, but it bites. Roll for netcode."

**Side Quests:** "Built after hours. Shipped anyway."
- **Crazy Planet Survivor:** "Thousands of entities on a sphere, and none of them fall off."
- **Stixiva:** "Any image in. A stitchable pattern out."
- **Le Rongeur:** "Il ronge les prix. It gnaws prices down to the crumbs."

**Lab:** "Things that shouldn't run this fast."

**Contracts:** "Parties I've joined."

**Patch notes:** "Known issue: cannot stop optimising."

**Contact:** "Need someone who ships systems *and* makes them pretty? Press Start." CTA: `PRESS START`. Secondary: `RECRUIT THIS UNIT`.

**HUD labels:** `ENT` · `FPS` · `MS` · `UNITS SELECTED` · `NUMBERS DRAWN` · `VIEW [1] LIT [2] DENSITY [3] DEBUG [4] IDS`

**Achievement toasts:**
- `WIREFRAME ENJOYER: opened Debug view`
- `CROWD CONTROL: selected 500+ units`
- `CRIT HAPPENS: rolled a nat 20`
- `COMPLETIONIST: reached the footer (1,445/1,445)`, because his 1,444 plus you makes 1,445.

**Status messages:**
- **404:** "Entity not found. It probably despawned."
- **No WebGL:** "Your GPU called in sick. Here's the static build."
- **Reduced motion:** "Simulation paused for reduced motion. Everything's still here."

---

## 7. Accessibility and Performance

**Accessibility**
- All content lives in semantic DOM. The canvas is `aria-hidden`. The hero `<h1>` is real text.
- Heading order is strict, and there is a skip link.
- Focus rings are cobalt AABB brackets.
- Every interaction has a keyboard path:
  - View modes: keys 1–4 plus buttons.
  - Spells and dice: Enter on the focused stage.
- RTS selection is a mouse-only bonus.
- Counters are not live regions. Toasts use `role="status"`, limited to 1 per 5s.
- Contrast: body and graphite meet AA. `--signal` is never used for text.

**`prefers-reduced-motion`** (via `gsap.matchMedia`):
- No Lenis smoothing and no pins.
- Formations jump to their final state (`uMix` set, no wander).
- No damage numbers or grain animation.
- Transitions are 200ms fades.
- The cursor stays native.

**No WebGL (detected or context lost):**
- Hero DOM text filled with a halftone dot pattern (`background-clip:text`, `radial-gradient` dots).
- Static SVG formations per section.
- Lab cells show static procedural SVG stills.

**Performance**
- Budget per frame (mid laptop, 1080p):

  | Item | Budget |
  |---|---|
  | Sim passes | ≤ 1.2 ms |
  | Density | ≤ 0.4 ms |
  | Render | ≤ 2 ms |
  | JS / GSAP / DOM | ≤ 4 ms |

- Renderer: `antialias:false` (SDFs anti-alias themselves), DPR capped at 1.5 on desktop and 1 on mobile, `powerPreference:'high-performance'`.
- **Adaptive quality:** if the 60-frame rolling average is above 20ms, step down in this order:
  1. DPR 1.0
  2. Density RT 128
  3. `setDrawRange` to 75% of entities
  4. Grain off

  Never step back up during the same session.
- Pause the sim on `visibilitychange`.
- Lab cells only render when in view.
- three.js is `import()`-ed after first paint. LCP is DOM text.
- Preload the Archivo latin woff2. Approximate JS: three ~130KB gz, GSAP ~55KB, Lenis ~4KB.
- No `getBoundingClientRect` in the loop. Animate only transform and opacity. Font-width animation is limited to the rules in §3.

---

## 8. Risks and How to De-risk

1. **The crowd feels tweened, not alive.** This is the hardest part and it carries the whole concept.
   - Build the formation engine first, alone, with a dev-only `lil-gui` exposing every force uniform.
   - Lock presets per formation (`calm`, `march`, `panic`).
   - Make the Hilbert sort and the dart/dot speed morph part of the first milestone.
2. **DOM ↔ WebGL scroll desync** (swimming text versus entities).
   - Use a single gsap.ticker loop and read `lenis.scroll` once per frame.
   - Formation regions are cached rects offset by scroll and passed through `uMat`.
   - Test with a 240Hz mouse wheel and with trackpads.
3. **Float render targets on mobile Safari.**
   - Use normalized coordinates and the HalfFloat path.
   - Run a capability probe at boot (render one pixel, read it back). If it fails, use the static build.
4. **Text legibility under a moving crowd.**
   - Colliders on all copy blocks, plus a safe margin of 0.04u.
   - The weight-0 ambient population is capped at 25%.
   - The Debug view never runs on mobile by default.
5. **Planet handoff seam.**
   - Compute the disc targets with the exact same camera and matrices.
   - If the error is above 2px, a 150ms crossfade hides it. Ship the crossfade first and perfect the seam later.
6. **Scope (this is a lot).** Build behind feature flags, in this order:
   1. Sim, hero, manifesto, HUD
   2. Ludogram formations
   3. Side quests: Le Rongeur and Stixiva first (mostly DOM/Canvas2D), the planet last
   4. Lab, starting with the 2 Canvas2D cells
   5. Damage numbers, RTS, View modes
   6. Ink Swarm, achievements, FR

   Every milestone must still meet 60fps.
7. **Readback stalls** (named entities, selection count).
   - Use `readRenderTargetPixelsAsync` only.
   - If unavailable, fall back to synchronous reads every 6th frame for the 8×1 RT, and hide the labels on low tiers.
8. **Content accuracy.**
   - OVHcloud must stay a bare name everywhere, including the FR copy and alt text.
   - Dates in the patch notes need confirming against his CV before launch.