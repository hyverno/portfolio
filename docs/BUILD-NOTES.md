# Build notes (read before writing code)

`docs/DESIGN.md` is the art-direction spec ("HEADCOUNT"). This file overrides it wherever they disagree.

## 1. Stack as actually installed (newer than the spec assumes)

| Package | Version | What changed vs the spec |
|---|---|---|
| `@sveltejs/kit` | **3.0** | see below |
| `svelte` | 5.57 (runes forced on for all project files) | — |
| `vite` | 8 | — |
| `three` | 0.186 | `three/addons/...` imports work; `GPUComputationRenderer` is at `three/addons/misc/GPUComputationRenderer.js`; `renderer.compileAsync` and `readRenderTargetPixelsAsync` exist |
| `gsap` | 3.15 | all plugins (SplitText, ScrollTrigger, Flip, CustomEase, EasePack, ScrambleText, MorphSVG, DrawSVG) are in the free `gsap` package: `import { SplitText } from 'gsap/SplitText'` |
| `lenis` | 1.3 | `import Lenis from 'lenis'` (+ `import 'lenis/dist/lenis.css'`) |
| fonts | `@fontsource-variable/archivo` (`wdth.css` exposes wght 100–900 + stretch 62–125%), `@fontsource-variable/martian-mono` (`wdth.css`), `@fontsource/instrument-serif` (`400.css`, `400-italic.css`) | Archivo woff2 for glyph baking: `node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2` |
| dev | `fontkit`, `lil-gui`, `playwright` (Chromium installed) | — |

**SvelteKit 3 differences (the build fails if you ignore these):**
- **`$lib` is removed. Import with `#lib/...`** (e.g. `import { t } from '#lib/i18n/index.svelte'`). Everywhere the spec says `$lib/`, write `#lib/`.
- **`$app/stores` is removed** → use `$app/state` (`import { page } from '$app/state'`, then `page.params`, `page.url`).
- **`$app/environment` is deprecated** → `import { browser, dev, building } from '$app/env'`.
- **There is no `svelte.config.js`.** Kit options go directly into `sveltekit({...})` in `vite.config.ts` (no `kit:` namespace). Only the platform agent edits `vite.config.ts`.
- `tsconfig.json` extends `$app/tsconfig`.
- Param matchers still live in `src/params/*.ts` (`export function match(p) {...}`), and `+page.ts` / `+layout.ts` still export `prerender`, `entries`, `trailingSlash`.
- `onNavigate`, `goto`, `afterNavigate` are in `$app/navigation`.
- Runes (`$state`, `$derived`, `$effect`) only in `.svelte` and `.svelte.ts` / `.svelte.js` files.

## 2. Contracts already written (do not edit; code against them)
- `src/lib/gl/types.ts` — public engine types (§9.1, plus `Crowd.has(id)` and `GLView.active`).
- `src/lib/gl/handle.ts` — `whenEngine()`, `getEngine()`, `setEngine()`.
- `src/lib/gl/internal.ts` — crowd core ↔ GL effects contract (`CrowdGPU`, `Effect`, factory signatures).
- `src/lib/gl/glsl/noise.ts` (`NOISE`: hash11/12/22/33, snoise2/3, curl2D, fbm3), `bayer.ts` (`BAYER`: bayer4, dither; `BAYER4`, `bayerAt` for CPU), `sdf.ts` (`SDF`: sdSegment, sdCapsule, sdRoundBox, sdCircle, sdTriangleIso, rot2, aastep).

Every other module API is the one written in DESIGN.md §9.1 (with `#lib` paths). If you need something the contract does not offer, do not edit another agent's file: work around it locally and list the gap in your final report.

## 3. File ownership
Write only inside the files/folders you own. Never delete or rewrite someone else's file. `package.json`: only the platform agent edits it, except the engine agent may run `npm pkg set scripts.predev=... scripts.prebuild=...` for glyph baking. Do not run `npm install` (all dependencies are installed; ask in your report if you truly need one).

**Stage 1 (foundation, in parallel)**
- **A1 platform & shell**: `vite.config.ts`, `src/app.html`, `src/app.d.ts`, `src/params/**`, `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+error.svelte`, `src/routes/[[lang=lang]]/+page.ts`, `src/routes/[[lang=lang]]/+page.svelte` (and delete the starter `src/routes/+page.svelte`), `src/lib/styles/**`, `src/lib/core/**`. Also creates **stub** files for every section component listed in §9.2 that does not exist yet (a minimal `<section id data-section>` with an `h2` from i18n), so the page builds before stage 2 replaces them.
- **A2 content & i18n**: `src/lib/i18n/**`, `src/lib/content/**`.
- **A3 crowd engine core**: `src/lib/gl/{engine.ts, actions.ts, capability.ts, renderer.ts, views.ts, select.ts, input.ts}`, `src/lib/gl/crowd/**`, `scripts/bake-glyphs.mjs`, `src/lib/gen/**`, `src/routes/dev/**`.
- **A3b GL effects**: `src/lib/gl/numbers/**`, `src/lib/gl/viewmodes.ts`, `src/lib/gl/inkswarm.ts`, `src/lib/gl/debugOverlay.ts`, `src/lib/gl/effects/**` (shaders/helpers).
- **A4 chrome & UI**: `src/lib/ui/**`, `src/lib/stores/**`.

**Stage 2 (sections, in parallel; read `docs/STAGE1.md` first)**
- **S-hero**: `src/lib/sections/{Hero.svelte, Manifesto.svelte}`, `src/lib/sections/hero/**`, `src/lib/sections/manifesto/**`.
- **S-ludo**: `src/lib/sections/ludogram/**`.
- **S-planet**: `src/lib/sections/side-quests/{SideQuestsIntro.svelte, intro-formations.ts}`, `src/lib/sections/side-quests/planet/**`.
- **S-craft**: `src/lib/sections/side-quests/stixiva/**`, `src/lib/sections/side-quests/rongeur/**`.
- **S-lab**: `src/lib/sections/lab/**`.
- **S-tail**: `src/lib/sections/{Contracts.svelte, PatchNotes.svelte, Loadout.svelte, Contact.svelte, Lobby.svelte}`, `src/lib/sections/tail/**` (formations/helpers for those).
- Later: `src/routes/[[lang=lang]]/projects/**`, `src/lib/sections/project/**`, SEO (`static/**`, OG image).

**Pin ordering (all pinned sections):** create the pin ScrollTrigger synchronously in `onMount` inside an `mm()`
desktop branch (not after an `await`), with an explicit `refreshPriority` so pins refresh top-to-bottom:
hero 50, ludogram 40, planet 30, stixiva 20. Non-pinned triggers keep the default (0).

## 4. Content rules (these override §6 microcopy where they conflict)
- **OVHcloud**: name only, everywhere. Role cell `MISSION`, nothing else. No tooltip, description, alt text or stack.
- **Never invent what Hyverno personally built** beyond his role title. Do not write "I programmed the peon" or "I wrote the code for all four". Keep the punch, attribute to the role: e.g. "You play a dispensable peon. I was on the gameplay code that keeps it busy." / "Glue, paint, duel, restock. Gameplay code: shipped."
- **Invokyr**: do not state a player count (sources disagree). HUD: `CO-OP · DEMO 94% POSITIVE · EARLY ACCESS OCT 8 2026`. Sub-line: "More players. More regrets." Published by Ludogram & Shochiku. Steam: https://store.steampowered.com/app/3883570/Invokyr/
- **Monsters are Coming! Rock & Road**: dev Ludogram, publisher Raw Fury. PC (Steam, Game Pass) 2025-11-20, Xbox Series 2026-08-06. Steam reviews: Very Positive. Steam: https://store.steampowered.com/app/2934220/
- **Tabletop Game Shop Simulator**: dev Ludogram & Knight Fever Games, publisher Knight Fever Games. Early Access 2025-11-12, full release 2026-05-28 (Steam). Steam: https://store.steampowered.com/app/3524750/
- Ludogram is an independent studio in Lille, France (https://ludogram.io/).
- Years coding: `7+` (not `~7`).
- Socials: empty strings with `TODO(Hyverno)`; links with empty URLs are hidden. Email: solo.hyverno@gmail.com.
- No invented dates for his own timeline (versions only, optional `date` fields left empty).
- Prices in Le Rongeur are labelled as examples. Lab demos are labelled "web recreation".
- Le Rongeur headline stays French in both languages; Stixiva mock UI stays French in both languages.

## 5. Verifying your work
- Type check: `npm run check` (svelte-check, whole project). In stage 1 other agents are writing at the same time: only fix errors in **your** files; filter with e.g. `npm run check 2>&1 | grep -A4 "src/lib/gl/crowd"`.
- Visual + console check (starts its own dev server on a free port, so parallel agents never collide):
  `node scripts/shot.mjs --path / --scroll 0,900,2400 --out shots/<you>/home` then **Read the PNGs** to look at them. Options are documented at the top of `scripts/shot.mjs` (`--width 375 --height 812`, `--reduced`, `--nowebgl`, `--eval`, `--keys`, `--click`, `--selector`). Headless Chromium uses SwiftShader WebGL2 (slow, so judge correctness there, not fps). Put screenshots under `shots/<your-agent-id>/`.
- Full build: `npm run build` (must pass at the end of each stage).
- Do not leave dev servers or watchers running.
- Do not commit; the orchestrator commits between stages.

## 6. Quality bar
This must be an Awwwards Site-of-the-Year contender. Motion must feel intentional, eased with the named eases, and never janky. Everything must work in four modes: full, `prefers-reduced-motion`, no-WebGL (`html.no-webgl`), and mobile (375px, touch). Zero console errors. No `getBoundingClientRect` inside per-frame loops. Respect the z-index table, tokens and type scale from DESIGN.md §2.
