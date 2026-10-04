# Stage 1 — what exists and how sections use it

Stage 1 (platform, content/i18n, crowd engine, GL effects, chrome) is built, type-checks (0 errors) and boots: the
preloader spawns 16,384 entities, the HUD shows real stats, `/dev/crowd` forms HYVERNO in dots and the crowd flows
around DOM colliders. Every section under `src/lib/sections/**` is still a STUB — stage 2 replaces them.

Read `docs/BUILD-NOTES.md` (SvelteKit 3 rules: `#lib/...` imports, `$app/state`, `$app/env`) and the relevant parts of
`docs/DESIGN.md` first. Look at `src/routes/dev/crowd/+page.svelte` + `bench.ts` for a working example of every
formation kind (glyphs, points circle, svg house, paths stream, rotating 3D d20).

## 1. Section skeleton

```svelte
<script lang="ts">
	import { themeSection, reveal, collider, interact, hudLine } from '#lib/core/actions';
	import { formation } from '#lib/gl/actions';
	import { t, loc, fmtNum } from '#lib/i18n/index.svelte';
	import { games } from '#lib/content/content';
</script>

<section id="shipped" data-section="shipped" data-theme="viewport" use:themeSection={'viewport'}
	use:hudLine={{ section: t().shipped.index, label: t().shipped.hud }} class="section">
	<p class="hud-text graphite">{t().shipped.index}</p>
	<h2 class="t-display" use:reveal={{ mode: 'lines', widthMarch: true }} use:collider>…</h2>
	<div class="stage" use:formation={{ id: 'ludo-city', source: CITY, preset: 'march' }}></div>
</section>
```

- Keep the exact section `id` (hero, readme, shipped, side-quests, planet, stixiva, rongeur, lab, contracts,
  patch-notes, contact) and `data-section`. Always also write `data-theme="<name>"` in the markup (no-JS fallback).
- One `h2` per section (the hero owns the page's only `h1`), `h3` per project.
- `use:collider` on every copy block the crowd must walk around (paragraphs, headings, cards). `{ pad }` in px.
- `use:interact={{ verb: 'ROLL' }}` on custom controls: adds role/tabindex, `[E]` lock-on prompt, E/Enter/Space click.
  Native `<a>`/`<button>` get the lock-on automatically; add `use:interact` to give them a custom verb.
- `use:reveal={{ mode: 'lines' | 'words' | 'fade', scrub?, delay?, widthMarch? }}` = the house SplitText reveal
  (fade under reduced motion). Headings take `widthMarch: true` (≤3 run at once automatically).
- `use:hudLine={{ section, label, line? }}` writes the bottom-left HUD context while in view.
- CSS utilities (global.css): `.wrap .grid (--cols) .section .t-mega .t-display .t-h1 .t-h2 .t-h3 .t-lede .mono
  .serif .hud-text .micro .graphite .link .brackets .visually-hidden .gl-only .static-only`. Tokens in
  `src/lib/styles/tokens.css` (`--paper --ink --graphite --hairline --signal --signal-text`, `--fs-*`, `--s-*`,
  `--z-*`, `--ease-steer|arrive|spawn|despawn|snap`, durations). `--wdth` drives `font-stretch` on headings.
- `.gl-only` hides under `html.no-webgl`; `.static-only` shows only under `html.no-webgl` / no JS.

## 2. The crowd

### Declarative: `use:formation` (most sections)
`formation(node, { id, source, from?, start?, end?, preset?, glyph?, region?, space? })` from `#lib/gl/actions`.
- Defines the formation on the node's rect (or `region`), and scrubs `from → id` from `top 80%` to `top 20%`
  (scrub .6), holding at 1. `from` defaults to the previous anchor in DOM order, else `'ambient'`.
- Only writes while nobody has claimed the crowd. No-op without WebGL. Reduced motion → jumps.
- `source` is a `FormationSource` (`src/lib/gl/types.ts`):
  - `{ kind: 'glyphs', key: 'HYVERNO_W125' | 'HYVERNO_W62' | '1445', fill? }` (baked from Archivo, exact DOM match)
  - `{ kind: 'svg', viewBox: [w, h], paths: string[], mode: 'stroke' | 'fill', share?, weight? }`
  - `{ kind: 'points', build: (ctx: BakeCtx) => BakeResult }` — return EXACTLY `ctx.N` slots:
    `targets: Float32Array(N*4)` = x, y in [-1, 1] of the region (**y up**), z in [-1, 1] (3D), w = weight
    (0 = free roam; keep ≤25% at 0); optional `paint`/`paintAlt: Uint8Array(N*4)` RGBA8 and `named: { peon: index }`.
    **Define the source object once at module level** (identity is compared; a new object re-bakes).
  - `{ kind: 'paths', viewBox, paths, speed, share?, weight?, color? }` — entities flow along the paths.
  - `{ kind: 'ambient' }`.
- Internal formations you can blend to/from: `'spawn'`, `'fill'`, `'ambient'`.

### Imperative: the engine handle (pins, interactions)
```ts
import { whenEngine, getEngine } from '#lib/gl/handle';
const engine = await whenEngine(); // null → static build: render your fallback
if (!engine) return;
const crowd = engine.crowd;
await crowd.define('ludo-d20', D20, { el: stageEl, space: 'page' }, { preset: 'march' });
crowd.claim('ludogram');                              // pinned sections own the crowd while pinned
crowd.blend('ludo-city', 'ludo-d20', p, { owner: 'ludogram' });
crowd.release('ludogram');                            // anchors take the crowd back
```
Crowd API (all in `src/lib/gl/crowd/Crowd.ts`, contract in `types.ts`):
`N, owner, has(id), define(id, src, region, {preset, glyph}) → Promise, setPaint(id, paint?, paintAlt?),
blend(from, to, mix, {owner}), claim(owner), release(owner), set(Partial<CrowdParams>), preset('calm'|'march'|'panic'|'still', {duration}),
ping(xPx, yPx, strength?), attract(i 0..3, DOMRect|null, {mode: 'fill'|'perimeter', strength}),
setScan({angleDeg, offsetPx} | null) (past the line: paintAlt + glyphAlt), setAlpha(a, {duration}),
named(name) → {x, y, visible} px (refreshed every 3 frames), select(rect) → Promise<count>, command(x, y)`.
Extras: `setRotation(id, rx, ry, rz)` (3D formations, radians, z targets), `sendWave({duration, amplitude})`
(stadium wave), `blendState`, `onRelease(fn)`.
- Claim/release in ScrollTrigger `onToggle` (enter/enterBack → claim, leave/leaveBack → release). Never leave a claim
  dangling on destroy.
- `crowd.set({ glyphAlt: 'xstitch' })` etc. — see `CrowdParams`. Presets tween.
- Pixel coordinates are viewport CSS px (clientX/clientY space).

### Damage numbers
`engine.numbers.spawn(x, y, { value, crit, glyph: 'digits' | 'dot', color: [r,g,b] 0..1, vx, vy, gravity })`,
`engine.numbers.burst(x, y, { count, radius, critRate, glyph, color })`. Viewport px. For a dedicated pool (e.g. the
Lab hose inside a GLView): `engine.createNumbers({ capacity, view })`.

### Scissored 3D scenes (planet, lab cells)
Files that import `three` must be dynamically imported (`const m = await import('./PlanetScene')`).
```ts
const off = engine.addView({ el, scene, camera, update(t, dt) {}, onResize(w, h) {}, rate: 1, clearAlpha: 0, active: true });
// renderer: engine.renderer as THREE.WebGLRenderer (shared; don't create another one)
```
The engine renders each view inside `el`'s rect (pin-aware, IntersectionObserver-gated). `clearAlpha: 0` punches the
crowd out of that rect; omit it to draw over the crowd. Call `off()` on destroy.

## 3. Core modules (`#lib/core/...`)
- `motion`: `gsap, ScrollTrigger, SplitText, Flip, CustomEase, EASE, DUR, STAGGER, mm(({reduced, desktop, coarse}) => cleanup)`
  (gsap.matchMedia honouring the ⚙ motion override — build pins/scrubs inside it), `revealLines, revealSplit, tickTo(el, to, {from, steps, duration, format}), decode(el, text)`.
  Named eases are registered: `'steer' 'arrive' 'spawn' 'despawn' 'snap' 'glitch'`.
- `ticker`: `onFrame((timeSec, dtSec) => …, PRIORITY.ui)` → unsubscribe. One loop for everything; never use your own rAF.
- `scroll.svelte`: `scroll.{y, delta, velocity, limit, smooth}`, `scrollTo(target, {duration, offset, immediate})`, `currentSectionId()`.
- `device.svelte`: `device.{reducedMotion, finePointer, coarse, mobile, webgl, tier, dpr}`, `TIER[tier]` (planet sizes, hose cap…).
- `theme.svelte`: `setTheme(name)`, `theme.name`, `THEMES` (themeSection does it for you; the planet switches earth → ice itself).
- `stats.svelte`: `stats` (fps, entities, numbersDrawn, onScreen, selected…), `hud`.
- `keys`: `onKey('Space', fn)`, `onSequence`. `boot.svelte`: `whenBooted()` — start entrance animations after it.
- Under reduced motion / coarse pointer there is no Lenis and no pin (build pins only in `mm` desktop branches).

## 4. i18n & content
- `t()` reactive dict (`src/lib/i18n/en.ts` has a key map at the top; `fr.ts` mirrors it). Every section has
  `t().<section>.index` ('03 / SHIPPED · LUDOGRAM'), `.hud`, usually `.canvas` (visually-hidden description).
- `Rich` headlines `{pre, em, post}` → `{pre}<em class="serif">{em}</em>{post}`.
- `loc(l)` picks the language from a content `L = {en, fr}` pair. `fmtNum`, `fmtDate`, `fmtHudDate`, `langHref`.
- Content: `#lib/content/content` → `site, studio, heroStats, games, sideProjects, lab, contracts, volunteer,
  patchNotes, loadout, projects, projectBySlug, nextProject, isGame`. `#lib/content/status` → `releaseStatus`,
  `releaseLabel(game, lang, now?)` (call in onMount; prerender uses the build date). Empty `L` strings = hide.
- Need a string that is not in the dict? Define a local `{ en, fr }` pair in your own file and render it with
  `loc()` — never edit `i18n/**`. Keep FR native and idiomatic (French typography: narrow no-break spaces before ; ! ? and %).

## 5. Chrome & stores
- `#lib/stores/achievements.svelte`: `unlock(id)`, `progress(id, value, max)`, `toast({title, body?, kind?})`,
  `isUnlocked(id)`. Ids: first-blood, crowd-control, wireframe, crit, planet-breaker, cross-stitch, cheeks-full,
  bullet-hell, networking, completionist, dev-mode.
- `#lib/ui/sfx`: `sfx('tick'|'ping'|'crit'|'ach'|'bite'|'roll'|'stitch')` (no-op unless the user enabled SFX).
- Components: `Brackets {target?, color?, pad?, fixed?}`, `Keycap {key, active?, gold?, size?}`, `Prompt {verb}`,
  `Odometer {value, digits?, ease?}` in `#lib/ui/`.
- Cursor: `[data-cursor="cast"]` + `data-cursor-r="<px>"` shows the cast ring. Lock-on is automatic on
  `a, button, [data-interact]`.

## 6. Known behaviour / limitations
- Headless SwiftShader runs ~25 fps, so the governor steps quality down (DPR 1, density 128, draw 75%) in
  `scripts/shot.mjs` runs. Judge correctness there, not fps. `window.__hyv.engine` exists only on `/dev/crowd`.
- Until a page defines anchors, the crowd spreads to `'ambient'` after the preloader (dense noise everywhere). Once
  the hero defines `hero-wide`, the crowd lands in the name.
