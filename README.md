# HEADCOUNT · hyverno.com

Portfolio of Hyverno, gameplay programmer and technical artist.

Every mark on the page is an entity: a 16,384-agent GPU crowd (WebGL2 GPGPU) spells the name, rules the tables, builds each game, walks on a planet and stitches a pattern. It steers around the cursor and the copy, and stays inside a 16.6 ms frame.

## Stack

- SvelteKit 3 + Svelte 5 (runes), `adapter-static` (fully prerendered, `/` and `/fr`)
- three.js 0.186 (GPGPU crowd, scissored scenes), GSAP 3.15 (ScrollTrigger, SplitText, Flip, CustomEase), Lenis
- Fonts: Archivo (variable width), Martian Mono, Instrument Serif, all self-hosted through Fontsource

## Scripts

```bash
npm install
npm run dev        # dev server (bakes the HYVERNO glyph paths first)
npm run check      # svelte-check
npm run build      # static site in build/
npm run preview    # serve the build locally
```

Tooling (needs Playwright's Chromium: `npx playwright install chromium`):

```bash
node scripts/shot.mjs --path / --scroll 0,1800 --out shots/home   # headless screenshots + console errors
node scripts/tour.mjs --out shots/tour                             # visitor-like scroll through the whole page
node scripts/og.mjs                                                # regenerates static/og.png
node scripts/icons.mjs                                             # regenerates static/apple-touch-icon.png
```

`/dev/crowd` and `/dev/effects` are dev-only engine benches (lil-gui).

## Where things live

| Path | What |
|---|---|
| `src/lib/content/content.ts` | Facts: games, side projects, lab entries, contracts, patch notes, loadout |
| `src/lib/i18n/en.ts`, `fr.ts` | Every string of the site, in English and French |
| `src/lib/sections/**` | One folder or component per section (hero, Ludogram, side quests, lab, contracts, patch notes, contact) |
| `src/lib/gl/**` | The crowd engine, damage numbers, view modes, Ink Swarm transition |
| `src/lib/core/**` | Motion, scroll, ticker, theme, device tiers, colliders, keys, boot |
| `src/lib/ui/**` | Preloader, HUD, cursor, toasts, settings, achievements |
| `docs/DESIGN.md` | The art direction (HEADCOUNT) and the build plan |

## To fill in

Search the code for `TODO(Hyverno)`:

- social links (`site.socials`): hidden while empty
- Tabletop Game Shop Simulator reception and Le Rongeur status: hidden while empty
- optional dates for the patch notes (versions only, nothing is invented)

## Deploy

`npm run build` writes a static site to `build/`. Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages, OVHcloud web hosting). Serve `404.html` as the not-found page. The site expects to live at the domain root (`https://hyverno.com`), which is the origin used for canonical, hreflang and Open Graph URLs (`src/lib/core/site.ts`).

## Easter eggs

Drag to select units, click to ping, `1`–`4` for the view modes (`3` shows the wires), and there are 11 achievements to find, the last one hidden behind a well-known code.
