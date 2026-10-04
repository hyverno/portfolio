# HYVERNO: Art Direction Spec, "16.6"

## 1. Concept

**Name: SIXTEEN POINT SIX** (always written `16.6`, the number of milliseconds in one frame at 60 fps).

**Pitch:** A kinetic broadsheet printed at 60 frames per second. The type moves like a crowd, and the crowd lines up like type.

**Why it fits Hyverno:**
- **The frame budget.** 16.6 ms is the budget behind all of his work: crowds, Niagara systems, damage numbers, replicated entities. Studio leads recognise the number straight away. Everyone else just sees a sharp number.
- **Editorial and kinetic.** The editorial side shows taste, which is the tech-art half of him. The kinetic side shows engineering, which is the gameplay half. The type does the engineering on screen. The hero wordmark breaks apart into 24,576 GPU entities, and they come back to rebuild the name in the footer.
- **The accent colour.** The accent is `#FF00FF`, the "missing texture" magenta that every engine paints when an asset fails to load. Every game dev on the jury will recognise it. It is loud, and the choice has a reason behind it.
- **Game-dev details.** The site uses a real FPS HUD, an achievements layer (a nod to his 1,444 Steam achievements) and a career told as patch notes with version numbers. Version numbers also mean no dates get invented. There is no pixel art, no neon and no synthwave.

**Banned:** gradient blobs, glassmorphism, dark mode as the default, stock 3D blobs, and any metric that isn't real. Bone-coloured paper and ink alternate like printed spreads. The dark sections read as the "studio floor", not as a theme switch.

---

## 2. Visual identity

### Palette

The interface chrome uses three colours plus hairlines. Project visuals may use a local palette (listed below); the chrome never does.

| Token | Hex | Role |
|---|---|---|
| `--c-bone` | `#ECE8DF` | Paper. Main background, text on ink |
| `--c-ink` | `#0D0D0B` | Main text, background of the dark "studio floor" sections |
| `--c-signal` | `#FF00FF` | **Missing Texture.** The single loud accent: cursor "view" disc, crit damage numbers, row hover fills, `::selection`, focus rings, one word per section at most |
| `--c-graphite` | `#1C1C19` | Raised surfaces on ink (HUD, toasts, lab viewport frame) |
| `--c-ash` | `#66625A` | Meta text on bone (4.8:1) |
| `--c-ash-ink` | `#8E8A81` | Meta text on ink (5.6:1) |
| `--c-line` | `rgb(13 13 11 / .14)` on bone, `rgb(236 232 223 / .14)` on ink | Hairlines, grid rules |

**Contrast rules:**
- Magenta on bone is 2.6:1, so it is **never used for text on bone**. Use it only as a fill, with ink text inside (6.2:1).
- Magenta text is allowed on ink.

**Local palettes (inside project visuals only):**
- **Le Rongeur:** cream `#FFF3E2`, brown `#2B1B12`, apricot `#F2894B`. This section is a deliberate brand takeover.
- **Crazy Planet, Earth ramp:** `#2E3B2C → #8C7A5B → #D9CDB4`.
- **Crazy Planet, Ice ramp:** `#2F5D73 → #8FC3D6 → #DDEFF5`.
- **Stixiva thread palette (12):** `#1B1A17 #F3EFE6 #C8442F #E9A23B #3D6B4F #7FA88A #2D4A7A #8DB3D9 #6E3B5C #D98BA6 #8A6A4A #FF00FF`. One magenta thread lets the site accent sneak in.

**Images and duotone:** any optional real image is duotoned to ink/bone in the shader, so even screenshots follow the palette. Hovering shows the true colours through the distortion.

### Typography (3 families, all from Fontsource)

| Family | Package | Usage |
|---|---|---|
| **Anybody** (wdth 50–150, wght 100–900) | `@fontsource-variable/anybody`. Import the CSS that exposes **both wght and wdth** (`standard.css` or `full.css`; check `node_modules/@fontsource-variable/anybody/`). `index.css` alone only exposes wght. | Display, headings, nav, body |
| **Instrument Serif** (400, 400 italic) | `@fontsource/instrument-serif` (`400.css`, `400-italic.css`) | The "voice": leads, italic interjections inside giant headlines, pull quotes |
| **JetBrains Mono** (wght 100–800) | `@fontsource-variable/jetbrains-mono` | HUD, meta, labels, tags, counters (`font-variant-numeric: tabular-nums`) |

**Animating width:**
- Width is driven through `font-stretch: calc(var(--wdth) * 1%)`, and GSAP tweens `--wdth`.
- Default stretches by role:
  - Hero: wdth 125, wght 800.
  - H1/H2: wdth 72, wght 750.
  - Nav: wdth 112, wght 600.
  - Body: wdth 100, wght 400.
- Preload the Anybody woff2 file.

**Scale contrast** is the main signature: a 22vw ultra-wide grotesk sitting next to a 1.75rem italic serif.

| Token | Value | Use |
|---|---|---|
| `--fs-colossal` | `clamp(5rem, 22vw, 28rem)` | Hero and footer wordmark (also fit-to-width with JS) |
| `--fs-display` | `clamp(3.5rem, 11vw, 12rem)` | Section titles, CONTINUE? |
| `--fs-h1` | `clamp(2.75rem, 7vw, 7.5rem)` | Project titles |
| `--fs-h2` | `clamp(2rem, 4.2vw, 4.5rem)` | Subsections, lab rows |
| `--fs-h3` | `clamp(1.375rem, 2vw, 2rem)` | Card titles |
| `--fs-lead` | `clamp(1.25rem, 1.1rem + 0.8vw, 1.875rem)` | Instrument Serif italic |
| `--fs-body` | `clamp(1rem, 0.95rem + 0.25vw, 1.1875rem)` | Line-height 1.5, max 62ch |
| `--fs-meta` | `clamp(0.6875rem, 0.65rem + 0.15vw, 0.8125rem)` | Mono uppercase, tracking 0.06em |

- Display line-height is 0.84 with tracking -0.02em.
- The hero is set at tracking 0. This is required so the DOM text matches the sampled glyph paths.

### Grid

- **Desktop:** 12 columns, 24px gutter, outer margin `clamp(16px, 3vw, 48px)`.
- **Tablet:** 6 columns.
- **Mobile:** 4 columns with a 16px gutter.
- **Baseline and spacing:** 8px baseline. Section padding is `clamp(96px, 14vh, 200px)`.
- **Layout feel:** content is deliberately asymmetric. Headlines bleed off the margins, and meta blocks snap to columns 1–3 or 10–12.
- **Debug grid:** pressing **`G`** draws the 12 columns as 1px magenta lines, like an engine wireframe view. This also unlocks an achievement.

### Texture

**Film grain:**
- A 256×256 noise tile is generated once on a canvas and used as a data URL.
- It sits on a `::before` that is 200% the size of the viewport, layered over everything.
- It moves with `transform: translate()`, never `background-position`, using `animation: grain .9s steps(6) infinite`.
- Opacity is 0.06 on bone with `mix-blend-mode: multiply`, and 0.09 on ink with `screen`.
- With reduced motion, the grain is static.

**Registration marks:** small `+` crosshairs mark section corners. They read both as print registration marks and as viewport gizmos.

### Iconography

- No icon library. Arrows are glyphs set in JetBrains Mono (`↗ → ↓ ←→`).
- Bullets are the keyframe diamond `◆`.
- Tags are bracketed mono: `[UE5] [HLSL] [DOTS]`.
- Status chips are mono text inside a 1px box.
- The only illustration on the site is Pépite the hamster, drawn from SVG primitives.

---

## 3. Motion language

### Principles

1. **Every frame is a budget.** Animate only transform, opacity, clip-path, CSS variables and shader uniforms. Allow at most three elements animating `--wdth` at the same time.
2. **Mass, then detail.** Big things move slowly and heavily. Small things snap.
3. **Scroll is the timeline.** Type that tells the story is scrubbed by scroll. Feedback to user input plays on its own and starts within one frame.
4. **Honest numbers.** Every on-screen counter is measured, or its label says where it comes from.

### Named eases (register with CustomEase)

| Name | Definition | Use |
|---|---|---|
| `hyv-out` | `M0,0 C0.16,1 0.3,1 1,1` (= cubic-bezier(.16,1,.3,1)) | Reveals, split text, entering elements |
| `hyv-inout` | `M0,0 C0.76,0 0.24,1 1,1` | Curtains, clip-path wipes, background colour morphs |
| `hyv-snap` | `M0,0 C0.14,0 0.18,0.72 0.3,0.94 0.38,1.06 0.5,1.02 1,1` | UI pops, toasts, cursor states (~6% overshoot) |
| `hyv-crunch` | `M0,0 L0.12,0 0.12,0.45 0.3,0.45 0.3,0.8 0.5,0.8 0.5,1 1,1` | Le Rongeur bites and odometers (stepped chomps) |
| scrub | `ease: "none"`, `scrub: 0.8` | All scroll-scrubbed timelines. The lag provides the inertia. |

### Duration tokens

- `--t-micro` 160ms
- `--t-ui` 320ms
- `--t-color` 600ms
- `--t-reveal` 900ms
- `--t-curtain` 1100ms
- `--t-hero` 1400ms

### Stagger values

- Characters: 0.022s, or `{amount: 0.5}` for strings longer than 24 characters.
- Words: 0.04s.
- Lines: 0.08s.
- List rows: 0.06s.
- Card grids: `{each: 0.07, from: "random"}` (a crowd effect).

### Default split reveal (GSAP 3.13 SplitText)

```js
SplitText.create(el, {
  type: "lines,chars",
  mask: "lines",
  autoSplit: true,
  onSplit: (s) => gsap.from(s.chars, {
    yPercent: 115, rotate: 8, transformOrigin: "0% 100%",
    duration: .9, ease: "hyv-out", stagger: .022,
    scrollTrigger: { trigger: el, start: "top 85%" }
  })
})
```

- **"Stretch-in" variant** (headlines only): characters animate from `--wdth: 150; opacity: 0` to their target width over 1.1s with `hyv-out`.
- **Text scramble** (language switch, HUD): characters cycle through `▓▒░#%&01` at a 30ms step for 400ms.

### Scroll behaviour

- **Lenis setup:** `new Lenis({ lerp: .085, smoothWheel: true })`. Touch devices keep native scrolling.
- **One loop drives everything:** `gsap.ticker.add(t => { lenis.raf(t*1000); engine.render(); })`, `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`.
- **Velocity:** a global smoothed velocity `vel = quickTo(lenis.velocity, .3)` feeds:
  - marquee `--wdth = 100 - min(|vel|*0.8, 40)`,
  - marquee `skewX = clamp(vel*0.15, -6, 6)deg`,
  - the WebGL `uVelocity`.
- **Section backgrounds:** backgrounds are not painted per section. The `<body>` background tweens `--bg`/`--fg` between bone, ink and cream on section enter, over 0.6s with `hyv-inout`. Sections stay transparent, so the fixed WebGL canvas behind them always shows through.

### Cursor (only with `(pointer: fine)` and no reduced motion)

**Parts:**
- Dot: 8px, `bone` colour with `mix-blend-mode: difference`, following through `quickTo` at 0.08s.
- Ring: 40px, 1px border, following at 0.18s with `power3.out`.

**States** (set with a `data-cursor` attribute; transitions take 0.32s with `hyv-snap`):

| State | Look |
|---|---|
| `view` | Ring grows to 104px, filled magenta, blend `normal`, label `VIEW ↗` |
| `drag` | Label `DRAG ←→` |
| `cast` | Crosshair reticle with 4 ticks rotating 90° per second |
| `fire` | Reticle that pulses on each spawn |
| `bite` | Ring masked with 3 bite circles |
| `stitch` | Becomes the loupe edge |

**Magnetic elements:** inside 1.4× the element's bounding box, the element moves 0.35× of the pointer offset and its inner label moves 0.15×, both at 0.45s `power3.out`. On leave, they return with `elastic.out(1, .4)` at 0.8s.

### Hover rules

- **Links:** a 1px underline wipes in from the left (scaleX, origin left, 0.45s `hyv-out`) and leaves to the right.
- **Labels:** text roll. The label is duplicated, both copies move `yPercent: -100`, with a 0.012s character stagger.
- **Rows:** a magenta wipe animates `clip-path: inset(0 100% 0 0) → inset(0)` over 0.5s with `hyv-inout`. At the same time the title width animates `--wdth 100 → 140`.
- **Hover is never the only way to reach information** (touch devices have no hover).

### Page transitions (`/projects/[slug]`)

- **Mechanism:** `onNavigate` returns a promise.
  1. Curtain in: the ink curtain animates `clip-path: inset(100% 0 0 0) → inset(0)` over 0.6s with `hyv-inout`. The project title crosses it at `--wdth 150`, moving from xPercent 30 to -30.
  2. Resolve the navigation.
  3. Curtain out: `inset(0 0 100% 0)` over 0.7s.
- **Cover handoff:** Flip moves the cover rectangle into the full-bleed header.
- **Language switch** uses the text scramble only. It never shows a curtain.

### Z-index layers

| Layer | z |
|---|---|
| Body background (`--bg`) | – |
| Fixed WebGL canvas | 1 |
| Content | 2 |
| Pinned content | 3 |
| Nav | 100 |
| HUD | 110 |
| Toasts | 300 |
| Curtain | 900 |
| Preloader | 950 |
| Grain | 960 |
| Cursor | 1000 |

---

## 4. Signature moments

### Engine architecture: one renderer, many views

- There is a single `WebGLRenderer` (`antialias: false`, `powerPreference: "high-performance"`).
- DPR is capped at 1.75 on desktop and 1.25 on mobile.
- The canvas is fixed, full-screen, and set to `pointer-events: none`.
- **Views:** each WebGL thing is a *view* `{ el, scene, camera, update(), visible }`. It renders with `setScissor`/`setViewport` into its DOM element's rectangle, which is the three.js "multiple elements" pattern.
- **Rect caching:** rects are cached on ResizeObserver/ScrollTrigger refresh and offset by the scroll delta each frame, so there is no layout reading per frame.
- **Visibility:** an IntersectionObserver sets `visible`.
- **Input:** interactive views use a transparent DOM hit area that forwards pointer coordinates.
- **Shader warm-up:** all materials are warmed with `renderer.compileAsync()` during the preloader.

### ① The Horde Release (hero)

The HYVERNO wordmark fills the viewport. On scroll, it compresses into a tall monolith and then breaks into 24,576 entities that walk off the letters.

**Glyph source (build time):**
- `scripts/wordmark.ts` uses `fontkit` to open the Anybody woff2 from the Fontsource package.
- It runs `getVariation({ wdth: 50, wght: 800 })`, lays out "HYVERNO", and writes `src/lib/gen/wordmark.json` containing `{ d, bbox }`.
- At runtime, a `Path2D(d)` is filled on a 2048px offscreen canvas. All filled pixels are collected, shuffled with a seed, and N of them kept with ±0.5px jitter.
- These become `aHome` (normalised 0..1 inside the bbox).

**Geometry:** `BufferGeometry` drawn as `Points` with these attributes:
- `aHome` (vec2)
- `aSeed` (float)
- `aBand` (vec2, a random slot in the crowd band at the bottom)
- `aDelay = 0.55 * aHome.x + 0.1 * aSeed`, so the letters peel left to right like a stadium emptying.

**Entity counts:** 24,576 on the high tier, 12,288 on medium, 6,144 on mobile.

**Uniforms:**
- `uBox` (vec4: the DOM wordmark rectangle in pixels)
- `uViewport`, `uRelease` (0..1), `uReturn` (0..1), `uBox2` (the footer wordmark rectangle)
- `uMouse` (px), `uRadius` (120px), `uTime`, `uScrollOut`, `uPixelRatio`

**Vertex shader logic:**

```glsl
vec2 home = uBox.xy + aHome * uBox.zw;
float t = smoothstep(0., 1., clamp((uRelease - aDelay) / .45, 0., 1.));
vec2 band = vec2(aBand.x * uViewport.x, uViewport.y * .9 + aBand.y * 48.);
vec2 flow = curl(vec3(home * .003, uTime * .05 + aSeed)).xy;
vec2 p = mix(home, band, t) + flow * sin(t * 3.1416) * 180.;          // mid-flight arc through noise
p.x += sin(uTime * (0.6 + aSeed) + aSeed * 6.28) * 6. * t;             // idle wander once landed
p.y -= uScrollOut;                                                     // crowd scrolls away after the pin
p = mix(p, uBox2.xy + aHome * uBox2.zw, smoothstep(0.,1.,clamp((uReturn - aDelay)/.45,0.,1.)));
vec2 d = p - uMouse; p += normalize(d) * smoothstep(uRadius, 0., length(d)) * 60.; // the cursor parts the horde
gl_PointSize = 2.0 * uPixelRatio;
```

- Points render as squares in ink.
- About 1 in 64 points (`aSeed > .984`) is magenta, the "elites".

**Scroll mapping:** pin the hero with `end: "+=180%"`, `scrub: 0.8`.

| Progress | What happens |
|---|---|
| 0–0.35 | `--wdth` goes 125 → 50. A `scale` from a precomputed lookup table (11 width steps measured at load) keeps the word exactly full-width, so it grows taller as it narrows. Lead lines fade out. |
| 0.35–0.42 | The DOM wordmark fades out while the points fade in. The seam is hidden by the crossfade. |
| 0.42–1.0 | `uRelease` 0 → 1. A mono counter counts up with the release: `24,576 ENTITIES · 60 FPS · 1 DRAW CALL`. |

### ② The Cartridge Rail (Ludogram)

A pinned horizontal gallery of three procedural covers.

**Shared cover shader uniforms:** `uTime`, `uHover` (tweened 0 → 1 over 0.6s with `hyv-out`), `uMouse` (in uv), `uMouseVel`, `uVelocity`, `uReveal`, `uTexture`, `uHasTexture`, `uSeed`.

**Vertex:** a "flag" bend. The plane is subdivided 32×32, and `position.y += sin(uv.x * PI) * uVelocity * 0.6`.

**Fragment:**
- Liquid displacement near the mouse: `uv += (fbm(uv*4.+uTime*.3)-.5) * .04 * uHover * smoothstep(.35, 0., distance(uv, uMouse))`.
- RGB split of `0.006 * uHover` along `uMouseVel`.
- The reveal edge is noise-ragged, from the bottom: `step(uv.y, uReveal + fbm(uv*8.)*.08)`.
- If an image exists, it is sampled and duotoned. On hover, the true colour shows through, masked by the same noise.

**Procedural covers** (duotone ink/bone, with magenta used once):

| Game | Cover |
|---|---|
| **Monsters are Coming!** | A caravan city on wheels bobbing along a horizon at y = .62. Road dashes scroll by. A horde of about 400 flow-field dots comes in from the right; their eyes are paired magenta pixels. On hover, `uSpeed` goes 1 → 3 and the horde scatters. |
| **Tabletop Game Shop Simulator** | A top-down 9×6 shelf grid of mini silhouettes (an SDF circle base plus a capsule). A diagonal "paint sweep" band fills one mini in magenta. On hover, two d6 SDF dice roll in the centre. |
| **Invokyr** | A polar spiral board of 40 SDF cells with four player tokens. An fbm "dread" threshold eats the board in from the vignette. On hover there is a dice roll: dread spikes and recedes, and the landed cell glows magenta. This cover gets heavier grain. |

### ③ Pocket Planet (Crazy Planet Survivor)

A terraformable planet with 8,192 GPU-walked entities.

**Planet:**
- `IcosahedronGeometry(1, 24)`.
- Vertex height: `fbm(n * 2.) * .06`, minus craters.
- Craters come from `uniform vec4 uCraters[8]` (xyz = direction, w = radius × age, used as a ring buffer): `h -= .08 * smoothstep(r, 0., acos(dot(n, c.xyz))) - .03 * rim`.
- Fragment: a biome ramp by height, mixed Earth → Ice with `uBiome`. Lambert lighting plus a bone fresnel rim on ink space.

**Entities:**
- An `InstancedMesh` of tiny cones: 8,192 on high, 4,096 on medium, 2,048 on mobile.
- Per-instance attributes: `aAxis`, `aStart` (orthogonal to aAxis), `aSpeed`, `aPhase`.
- They walk great circles: `p = rotate(aStart, aAxis, aPhase + uTime * aSpeed)`.
- Attraction: `p = normalize(mix(p, uAttract, .35 * smoothstep(1.2, 0., distance(p, uAttract))))`.
- They sit on the terrain using the same fbm and crater function.
- They are oriented with up = normal and forward = `cross(aAxis, p)`.

**Spell (click):**
- An analytic ray–sphere intersection on the CPU sets `uShockOrigin` and `uShockTime`.
- Entities inside the wavefront band, `|angle - (uTime - uShockTime) * 1.4| < .08`, are pushed along the tangent.
- A magenta ring is drawn in the planet fragment shader.
- A crater is added to the ring buffer.

**Scroll:** pinned for 200%. Rotation is scrubbed through 1.5 turns. `uBiome` goes 0 → 1 between progress 0.45 and 0.6.

**Labels:** mono labels orbit the planet, set on an SVG circle path that rotates. These replace stars, which would be a cliché.

### ④ The Damage Number Hose (Lab)

A WebGL homage to Advanced Draw Number.

**Rendering:**
- An `InstancedBufferGeometry` quad with one instance per digit.
- A ring buffer of 65,536 instances on desktop and 8,192 on mobile.

**Per-instance data:** `aOrigin`, `aVel`, `aSpawn`, `aDigit`, `aOffset` (the character index), `aCrit`.

**Writing spawns:**
- Spawns are written into the ring with `attribute.addUpdateRange()`.
- The CPU does no per-frame work beyond those writes.
- Holding the pointer spawns 40 numbers per frame.

**Vertex:**
- Age: `age = uTime - aSpawn`.
- Ballistic arc: `p = aOrigin + aVel*age + vec2(0., 900.)*age*age*.5`.
- Pop-in: `scale = 1. + .6*exp(-age*14.)`.
- Fade: `alpha = 1 - smoothstep(.8, 1.2, age)`.
- Crits are drawn at 2× in magenta.

**Fragment:** samples a 10-glyph JetBrains Mono atlas generated on a canvas at boot.

**HUD (real numbers):** `ON SCREEN 31,204 · DRAW CALLS 1 · JS FRAME 2.3ms`.

**Copy must stay honest:** "The UE plugin is 6,000× faster than UMG widgets. This is its WebGL cousin."

### ⑤ Continue? (footer) and the horde comes home

- The screen turns ink. **CONTINUE?** appears at `--fs-display`.
- An arcade countdown runs from 9 to 0. Each digit morphs from `--wdth 150` to 50 and fades over 1s with `hyv-out`.
- Under it, the email is the CTA.
- Meanwhile `uReturn` is scrubbed from 0 to 1 by the footer ScrollTrigger. The entities that left in the hero walk back and rebuild HYVERNO at the bottom (`uBox2`), and the cursor can still part them.
- When the countdown reaches 0: "GAME OVER" flickers 3 times (opacity steps), then "Just kidding. Insert coin ↓". Any key restarts the countdown.

---

## 5. Section choreography (in page order)

### 0. Preloader: "Compiling shaders"

**Layout:**
- Ink background.
- A giant counter 000 → 100 in Anybody, where `--wdth = 50 + value`.
- A mono log streaming in the bottom-left. Every line is true:
  - `> fonts ............ ok`
  - `> compiling shaders (3/7)`
  - `> spawning 24,576 entities`
  - `> warming PSO cache… just kidding, this is the web`

**Work done:** waits for `document.fonts.ready`, the dynamic import of three, `compileAsync`, glyph sampling, and a 30-frame benchmark that picks the quality tier.

**Timing:** minimum 1.2s, maximum 2.5s. Repeat visits in the same session take 400ms (sessionStorage).

**Exit:** the curtain lifts with `clip-path: inset(0 0 100% 0)` over 1.1s `hyv-inout`. The hero characters rise 0.15s after it starts.

**Mobile:** same behaviour, with fewer log lines.

### 1. Hero

**Layout:**
- Bone background.
- Mono nav at the top:
  - left: `HYVERNO ©2026`
  - centre: `GAMEPLAY PROGRAMMER / TECHNICAL ARTIST`
  - right: `WORK · LAB · CONTACT · FR`
- The wordmark is fit-to-width, edge to edge.
- Under it:
  - left, in Instrument Serif italic: "Gameplay programmer & technical artist."
  - right, in mono: `CURRENTLY → LUDOGRAM` and `SCROLL TO RELEASE THE HORDE ↓`
- The HUD sits bottom-right: `60 FPS · 16.6 MS`, measured and updated 4× per second. On hover it expands to show `ENT · DRAW · TIER`.

**Enter:** wordmark characters rise with a 0.035s stagger over 1.4s `hyv-out`, rotating from 6° to 0.

**Scrub:** see Signature ①.

**Mobile:**
- Pinned for 120% instead of 180%.
- 6,144 points.
- Touch repulsion on `touchmove`.

**No WebGL:** the width scrub only, then the wordmark slides up and away.

### 2. Manifesto and Loadout

**Manifesto layout:**
- A centred 10-column paragraph mixing Anybody and Instrument Serif italic, revealed word by word by scrub (opacity 0.12 → 1, `scrub: 0.6`).
- Three keywords carry inline pill canvases, 1.2em tall, drawn with 2D canvas (not WebGL) and animated only while in view:
  - "water" gets a sine ripple,
  - "explosions" gets a looping radial burst,
  - "crowds" gets drifting dots.

**Facts row:** odometers that roll in on enter with `hyv-crunch` over 1.2s:
- `7+ YEARS WRITING CODE`
- `3 GAMES AT LUDOGRAM`
- `1,444 STEAM ACHIEVEMENTS`

**Loadout:**
- Three marquee rows of the full stack, crossing at -3°, 2° and -1°, moving in alternating directions.
- Marquees animate `xPercent` (with duplicated content), not `x`, so width changes driven by velocity never cause a jump in the loop.
- The scroll direction flips the marquee direction.

**Exit:** the body morphs to ink as the Studio section enters.

**Mobile:** the inline pills become static drawings, and the marquee runs at a constant speed.

### 3. Studio work: Ludogram

**Layout:**
- Ink background with an intro panel: "LUDOGRAM" at `--fs-display`, plus the sub-line "Shipped, not just prototyped."
- Then three panels, each 78vw wide with a 6vw gap:
  - The cover takes 62vw × 70vh.
  - The title overlaps the cover's edge at 9vw, `--wdth 60`, with `mix-blend-mode: difference`.
- A mono meta table under each panel: `ROLE / PUBLISHER / PLATFORMS / STATUS`.

**Status computed at runtime** (the page is prerendered; today's date is 2026-10-04):

| Game | Status |
|---|---|
| **Monsters are Coming! Rock & Road** (Raw Fury) | Gameplay Programmer. `OUT NOW · PC · GAME PASS · XBOX SERIES · VERY POSITIVE` |
| **Tabletop Game Shop Simulator** (Knight Fever Games) | Gameplay Developer. `OUT NOW · STEAM` |
| **Invokyr** | Gameplay Developer / Network. `DEMO 94% VERY POSITIVE`. A live countdown, `EARLY ACCESS IN 3D 14H`, which switches to `OUT NOW IN EARLY ACCESS` after 2026-10-08. |

**Scrub:**
- Pin the section and move the track `x` from 0 to `-(trackW - vw)` with `scrub: 1`.
- Each panel's split reveal and `uReveal` use `containerAnimation`.
- A progress readout shows `01 / 03` in mono.

**Interaction:**
- Cursor `drag` on the track and `view` on covers.
- Clicking a cover goes to `/projects/[slug]` (Flip plus curtain).

**Exit:** an outro panel: "More engines, fewer excuses → The Lab".

**Mobile:** no pin. Native horizontal `scroll-snap-type: x mandatory`. Covers render as WebGL only while snapped in view, with CSS posters otherwise.

### 4. Side quests

**Intro:** "SIDE QUESTS" as a single giant marquee line, with "(after hours)" in Instrument Serif italic. The rhythm varies on purpose: pinned, pinned, then free scroll, to avoid pin fatigue.

#### 4a. Crazy Planet Survivor

**Layout:**
- Ink background, with the planet centred at 60vmin.
- Left column: copy.
- Right column: a mono spec HUD: `ENTITIES 8,192 · UNITY DOTS/ECS 1.3 · URP · UNITY PHYSICS · VFX GRAPH · FMOD`.
- A biome toggle `EARTH / ICE` that is also scrubbed by scroll.
- Prompt: `CLICK TO CAST`.

**Motion:** see Signature ③. The counter readout blinks magenta when a spell lands.

**Keyboard:** Space casts at the planet's centre. Arrow keys rotate.

**Mobile:**
- A tap casts.
- 2,048 entities.
- Pinned for 120%.

#### 4b. Stixiva: "Pixels in, stitches out."

**Layout:**
- Bone background with an Aida-cloth weave in the shader background.
- Left 7 columns: the stitch canvas, a WebGL view.
- Right: a pattern key, with the 12 thread swatches in mono showing stitch counts that update live.
- A `PUBLIC BETA` chip.
- French UI labels are kept even in EN ("Atelier · Palette de fils · Exporter le PDF"), with the joke "UI in French. Embroidery is serious business."

**Shader:**
- `cell = floor(uv * vec2(uCells, uCells/aspect))`.
- The source is a procedural landscape (sky gradient, sun disc, three sine hills), or the optional image.
- Each cell takes the nearest colour from `uPalette[12]`.
- The X stitch is drawn with `min(abs(l.x - l.y), abs(l.x + l.y)) < .28`. The top leg is drawn last, and a twist is shaded with `.85 + .15*sin((l.x + l.y)*18.)`.
- Aida holes sit at the cell corners.
- Stitches are visible when the serpentine cell order divided by the total is less than `uStitch`.
- **Loupe:** inside `uLoupeR` around the cursor, the canvas is sampled at ¼ scale (4× zoom) with a 2px ink ring around it.

**Scrub:** pinned for 150%:
- `uCells` goes 120 → 36,
- then `uStitch` goes 0 → 1,
- then an A4 "pattern PDF" (a DOM grid of mono symbols) slides up, rotating from -4° to 0, over 0.9s `hyv-out`.

**Mobile:** no loupe. A static pinch hint.

#### 4c. Le Rongeur: the brand takeover

**Transition in:**
- A cream SVG overlay with a generatively bitten top edge (a seeded chain of circle subtractions) scrubs up to cover the viewport.
- The body background then switches to cream, the overlay is removed, and the chrome turns brown/apricot for this section only.

**Layout:**
- "IL RONGE LES PRIX." at `--fs-display`, in French in both languages, with "it gnaws prices" in Instrument Serif italic below.
- A centre stack of three price tags. Each has a generic SVG product silhouette (headphones, a box, a kettle; no brand look).
- A merchant line in mono, text only, no logos: `OFFICIAL FEEDS: EBAY · FNAC · DARTY · …`.
- Pépite on the right.

**Free scroll (no pin):**
- Each tag gets bitten as it passes 60% of the viewport.
- An SVG mask adds a 3-circle tooth cluster with `hyv-crunch` over 0.5s.
- Six apricot crumbs fall with gravity.
- The price odometer rolls down: for example, `€249,99 → €187,40` (any numbers shown must be clearly labelled as examples).

**Pépite:**
- Cheeks animate `scaleX` 1 → 1.35 (`elastic.out(1, .5)`) on each bite.
- Pupils track the cursor, clamped to 3px.
- The nose wiggles every 2.4s.

**Interaction:** the cursor is in `bite` state. A click bites at the pointer (12 bites maximum per tag) and drops the price by a random 2–9%.

**Mobile:** tap to bite.

### 5. The Lab

**Layout:**
- Bone background.
- Header: "The lab." plus "Where frame budgets go to get bullied."
- An editorial index table, one row per item, showing number / title / tags / metric:
  - `01 Crowd Simulation UE4 — 2,000+ replicated entities · Flecs · quadtree`
  - `02 Advanced Draw Number — millions of numbers · GPU-driven · replicated`
  - `03 Technical VFX — a system inside a system · Niagara`
  - `04 NavMesh × Mass — native pathfinding for hundreds of agents`
  - `05 Gerstner Water — HLSL material`
  - `06 Multiplayer inventory & lobby`

**Hover:**
- A floating 28vw preview view follows the cursor with `quickTo` at 0.6s, rotating ±4° by x-velocity.
- One material switches by `uMode`:
  - crowd → dots in grid lanes,
  - VFX → nested orbiting particle rings,
  - navmesh → a triangulated mesh with agents sliding along its edges,
  - water → a Gerstner sum,
  - lobby → 4 slots toggling to `READY`.
- The preview renders beneath the row text on purpose, so titles overprint it.
- Rows get the magenta wipe.

**Below the table:** the 16:9 **Damage Number Hose** viewport (Signature ④), framed in graphite with HUD corners.

**Mobile:** no floating preview. Each row expands an inline 16:9 preview on tap. The hose uses 8,192 instances.

### 6. Party members (clients and missions)

**Layout:** full-width rows with the name at `--fs-h1`, `--wdth 72`, and a mono tag right-aligned:

| Name | Tag |
|---|---|
| LUDOGRAM | `STUDIO · GAMEPLAY / NETWORK` |
| OVHCLOUD | `MISSION` (nothing more, ever) |
| STOETZEL SONORISATION | `UI/UX + FRONTEND · SVELTE / EXPRESS` |
| QANGA | `UI DESIGN INTEGRATED IN UNREAL` |
| ASYNCONF | `ORGANISER · MODERATION · ~300 EXERCISES CORRECTED` |
| FREELANCE | `WEBHOOKS · TOOLS · FIGMA INTEGRATIONS` |

**Enter:** rows reveal with a stretch-in effect and a 0.06s stagger.

**Hover:** a magenta wipe, and the name widens to 140.

**Mobile:** static rows. Tags wrap below the names.

### 7. Patch notes (experience)

**Layout:**
- A sticky left column with a giant version number at `--fs-display`, which odometers as entries pass.
- A 1px build-progress bar.
- Right column: entries in changelog grammar (`+ Added`, `~ Changed`, `− Removed`), revealed line by line.

**Entries:**
- v0.1 Hello, Godot (top-down game)
- v0.2 First website (sold game accounts)
- v0.5 Freelance web design & frontend
- v0.8 Web TechArt (three.js, Three.js Journey certified)
- v0.9 ISTIC Rennes
- v1.0 Games for real: water, explosions, crowds, multiplayer
- v2.0 Ludogram
- v2.x Side quests
- **Community DLC:** Asynconf, and helping Unreal devs on Discord.

Version numbers are used instead of years. **The client must confirm the order; don't invent dates.**

**Footer line:** "Known issues: cannot stop optimising."

**Mobile:** the version number becomes an inline header for each entry.

### 8. Continue? (contact and footer)

**Layout:** see Signature ⑤.
- The email `solo.hyverno@gmail.com` is set in Anybody `--wdth 120`, with magnetic characters (each character moves 0.2× toward the pointer).
- Click copies the email and shows "Copied. +1 life." A `mailto:` fallback is kept.
- Bottom bar in mono:
  - `© 2026 HYVERNO`
  - `1,444 ACHIEVEMENTS ON STEAM · {n}/8 HERE`
  - `BACK TO TITLE SCREEN ↑`, which runs `lenis.scrollTo(0, {duration: 2.2})`
  - social links as placeholders.

**Mobile:** the countdown and the return of the horde (6,144 points) are kept.

### Global layers

**Achievement toasts:**
- Bottom-left, graphite background, with a magenta square icon and a mono title.
- In on `hyv-snap`, held for 3s, then out.
- `aria-live="polite"`.
- Unlocked achievements are saved in localStorage.

| Achievement | Trigger |
|---|---|
| Tutorial Complete | Scrolled past the hero |
| Crowd Control | Parted the horde for 3s |
| Terraformer | 8 craters on the planet |
| Bullet Hell | 20,000 numbers on screen |
| Snack Time | 12 bites fed to Pépite |
| Bilingue | Switched language |
| Wireframe Mode | Pressed `G` |
| Insert Coin | Copied the email |

**404 page:** a magenta/black checkerboard with "Missing texture."

**`/projects/[slug]`:**
- A full-bleed cover view, a meta table, and "What I did" bullets (**content supplied by the client**).
- A "Next project" footer that triggers the curtain.

---

## 6. Microcopy (EN)

**Headlines and sections:**
- Hero sub: "Gameplay programmer & technical artist. I make thousands of things move at 60 fps — and look good doing it."
- Scroll hint: "SCROLL TO RELEASE THE HORDE ↓"
- Manifesto: "Water. Explosions. Crowds. Netcode. The stuff that makes a frame budget sweat — and four friends stay in sync."
- Studio: "Shipped, not just prototyped."

**Ludogram games:**
- Monsters are Coming!: "A city that refuses to stand still. I wrote the parts that move."
- Tabletop Game Shop Simulator: "Glue, paint, duel, repeat. Tiny plastic stakes."
- Invokyr: "Jumanji, but it bites back. Four players, one cursed board, netcode that never blinks."

**Side quests:**
- Intro: "Side quests. Built after hours, shipped anyway."
- Crazy Planet Survivor: "8,192 entities. One sphere. Zero mercy." / "Click to cast. Yes, you can dig craters."
- Stixiva: "Pixels in, stitches out." / "A real product. With a real paywall. Very brave."
- Le Rongeur: "Pépite chews through official merchant feeds so you don't overpay. Cheeks: full. Wallet: also full."

**Lab and clients:**
- Lab: "Where frame budgets go to get bullied." / "Hold to spawn. It does not care."
- Clients: "Party members." OVHcloud's row reads `MISSION`, nothing more.

**Patch notes:** "v2.0 — + Added: three commercial games. − Removed: sleep."

**Footer:** "CONTINUE?" / "Insert coin ↓" / "Copied. +1 life." / "Game over. Just kidding."

**Labels:** `ROLE · PUBLISHER · PLATFORMS · STATUS · OUT NOW · IN EARLY ACCESS IN 3D 14H · VIEW ↗ · DRAG ←→ · CLICK TO CAST`

**FR samples:**
- "Je fais bouger des milliers de choses à 60 i/s."
- "Quêtes secondaires."
- "Continuer ?"
- "Copié. +1 vie."

---

## 7. Accessibility and performance

### Reduced motion (`prefers-reduced-motion: reduce`)

- No Lenis, so scrolling is native.
- No pins on the hero, planet or Stixiva. Each shows its final state.
- Fixed width (wdth 100).
- Static points that never release. Marquees paused.
- Curtains replaced by a 200ms crossfade.
- Static grain. No cursor.
- The countdown is replaced by a static "Continue?".

### Semantics

- One `h1`, which also contains a visually hidden "Gameplay Programmer & Technical Artist".
- SplitText keeps its default `aria` handling.
- Canvases are `aria-hidden`, with a text description next to each.
- The countdown is `aria-hidden`.
- `<html lang>` and `hreflang` are set correctly.

### Keyboard

- A skip link.
- Focus rings: 2px magenta, offset 4px, on ink fill.
- Focusing a panel in the pinned rail calls `lenis.scrollTo` to its computed scroll position.
- Interactive demos have key equivalents: Space casts on the planet, Enter bursts on the hose.

### Bilingual routing

- Routes are `src/routes/[[lang=lang]]/`, with matcher `p === "fr"`.
- Dictionaries live in `src/lib/i18n/{en,fr}.ts`.
- Prerender `/` and `/fr`.
- French runs about 20% longer. Every display line is fit with JS or clamped; never hard-code a line break.

### Budgets

- LCP < 1.8s. The LCP element is DOM text.
- CLS 0.
- Initial JS < 120KB gzipped. three.js is loaded with a dynamic import.
- Fonts: latin subset only. Anybody is preloaded.
- All browser-only code runs in `onMount` or behind guards so prerendering stays safe.

### Runtime

- One gsap.ticker loop.
- Views render only while visible. Rendering pauses on `visibilitychange`.
- **Adaptive tier:** if the average frame time over 60 frames goes above 20ms, drop one step: DPR to 1, half the entities, grain frozen.
- **No WebGL** (WebGL2 context fails): add an `html.no-webgl` class.
  - Covers become CSS posters (repeating and conic gradients that suggest each game).
  - The planet becomes an SVG sphere with CSS-animated dots.
  - The hose falls back to DOM numbers capped at 200, with the label "UMG mode, ironically."

---

## 8. Risks and how to reduce them

1. **Hero DOM-to-points handoff mismatch.**
   - Generate the paths at build time from the exact Fontsource woff2, at tracking 0.
   - Cache `uBox` on refresh.
   - Do the swap at wdth 50, inside the 0.35–0.42 crossfade, with point jitter.
   - Test in Safari first.
2. **Pin and Lenis instability on iOS.** No pins and no Lenis on `(pointer: coarse)`. Native snap carousels. Use `ScrollTrigger.normalizeScroll(false)`.
3. **Cost of animating variable-font width.** At most three width-animated elements at once. Marquees use `xPercent`. Hero width uses a lookup table with scale compensation, so there are no per-frame measurements.
4. **Too many WebGL contexts or draw cost.** One renderer with scissor views, gated by IntersectionObserver. At most four views live at once.
5. **Shader compile stutter on first reveal.** Run `compileAsync` in the preloader, so the "compiling shaders" log is true.
6. **Fonts loading late and breaking splits.** `autoSplit` plus `document.fonts.ready` before the intro.
7. **Grain repaint cost.** Use a composited `transform` animation, never `background-position`, and no `filter` on large layers.
8. **Scope creep in a one-pass build.** Build in tiers:
   - **P0:** tokens, type, layout, Lenis, split reveals, background morphs, curtain, the DOM rail with CSS posters, i18n, reduced-motion and mobile paths.
   - **P1:** the WebGL engine, the hero horde and its return, the covers, the planet, the hose, Stixiva.
   - **P2:** achievements, the `G` debug grid, the Stixiva loupe, project pages.

   Each tier must ship as a coherent site on its own.
9. **Content accuracy.**
   - No invented dates, metrics or client details. OVHcloud gets the word "MISSION" and nothing else.
   - Every HUD number is measured or labelled as illustrative.
   - The 6,000× claim is attributed to the UE plugin.
   - Statuses that depend on dates are computed at runtime.