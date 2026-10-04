<script lang="ts">
	import '#lib/styles/fonts';
	import 'lenis/dist/lenis.css';
	import '#lib/styles/global.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { onNavigate } from '$app/navigation';
	import favicon from '#lib/assets/favicon.svg';
	import { FONT_PROBES, archivoLatinUrl } from '#lib/styles/fonts';
	import { i18n, setLangFromRoute, t } from '#lib/i18n/index.svelte';
	import { ScrollTrigger, gsap, registerMotion } from '#lib/core/motion';
	import { detectDevice, device, markNoWebGL } from '#lib/core/device.svelte';
	import { initScroll } from '#lib/core/scroll.svelte';
	import { startTicker } from '#lib/core/ticker';
	import { boot, finishBoot, initBoot, log, report, whenBooted } from '#lib/core/boot.svelte';
	import { FLAGS } from '#lib/core/flags';
	import { absoluteUrl } from '#lib/core/site';
	import { getEngine, setEngine } from '#lib/gl/handle';
	import type { Engine } from '#lib/gl/types';
	import SkipLink from '#lib/ui/SkipLink.svelte';
	import WorldGrid from '#lib/ui/WorldGrid.svelte';
	import Grain from '#lib/ui/Grain.svelte';
	import ViewportFrame from '#lib/ui/ViewportFrame.svelte';
	import Hud from '#lib/ui/Hud.svelte';
	import Cursor from '#lib/ui/Cursor.svelte';
	import Toasts from '#lib/ui/Toasts.svelte';
	import Preloader from '#lib/ui/Preloader.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const FONT_TIMEOUT_MS = 2500;
	const BOOT_SAFETY_MS = 6000;
	const TRANSITION_TIMEOUT_MS = 1500;

	let canvas: HTMLCanvasElement;
	let inkFade: HTMLDivElement;

	// The route param is the language's single source of truth (runs during SSR too). Unmatched
	// routes (404) have no params, so fall back to the path prefix, like hooks.server.ts does.
	const routeLang = () =>
		page.params.lang ?? (/^\/fr(\/|$)/.test(page.url.pathname) ? 'fr' : undefined);
	setLangFromRoute(routeLang());
	$effect.pre(() => setLangFromRoute(routeLang()));
	$effect(() => {
		document.documentElement.lang = i18n.lang;
	});

	// Before any child initialises: chrome reads device / boot state in its own setup.
	if (browser) {
		registerMotion();
		detectDevice();
		initBoot();
	}

	const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
	const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
	const settle = (p: Promise<unknown>, ms: number) => Promise.race([p.catch(() => {}), delay(ms)]);

	async function loadFonts() {
		const t0 = performance.now();
		const loaded = Promise.all(FONT_PROBES.map((f) => document.fonts.load(f))).then(
			() => true,
			() => false
		);
		const ok = await Promise.race([loaded, delay(FONT_TIMEOUT_MS).then(() => false)]);
		log(ok ? t().boot.log.fonts(String(FONT_PROBES.length), (performance.now() - t0).toFixed(0)) : 'FONTS TIMEOUT · FALLBACK STACK');
		report('fonts');
	}

	async function startEngine() {
		let engine: Engine | null = null;
		if (FLAGS.crowd) {
			try {
				await nextFrame(); // three.js is fetched after first paint
				performance.mark('hyv:engine-import');
				const { initEngine } = await import('#lib/gl/engine');
				performance.mark('hyv:engine-init');
				engine = await initEngine(canvas);
				performance.mark('hyv:engine-ready');
			} catch (err) {
				// Any engine failure means the static build, never a blank page.
				console.warn('[engine] init failed, using the static build', err);
				engine = null;
			}
		}
		setEngine(engine);
		if (engine) {
			device.webgl = 'ok';
			// Diagnostics hook (scripts/shot.mjs, scripts/tour.mjs, or `?debug` on a deployed build):
			// the engine (owner, blend, alpha) and the boot log with its real timings.
			if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug'))
				(window as unknown as { __hyv?: { engine: Engine; boot: typeof boot } }).__hyv = { engine, boot };
			return;
		}
		markNoWebGL();
		log(t().boot.log.noWebgl);
		report('compile');
		report('formations');
		report('firstFrame');
	}

	function fade(to: 0 | 1): Promise<void> {
		return new Promise((resolve) => {
			gsap.to(inkFade, { autoAlpha: to, duration: 0.2, ease: 'none', overwrite: true, onComplete: resolve });
		});
	}

	// Page transitions (§3.7): Ink Swarm when the engine runs, a 200ms --ink crossfade otherwise.
	onNavigate((nav) => {
		if (!nav.from || !nav.to || nav.willUnload) return;
		if (nav.from.url.pathname === nav.to.url.pathname) return;
		const engine = FLAGS.inkSwarm && !device.reducedMotion ? getEngine() : null;
		return (async () => {
			if (engine) {
				await settle(engine.inkCover(), TRANSITION_TIMEOUT_MS);
				return () => void settle(engine.inkReveal(), TRANSITION_TIMEOUT_MS);
			}
			await fade(1);
			return () => void fade(0);
		})();
	});

	onMount(() => {
		const stopScroll = initScroll();
		startTicker();
		void loadFonts();
		void startEngine();

		const safety = setTimeout(() => {
			if (!boot.done) finishBoot();
		}, BOOT_SAFETY_MS);
		whenBooted().then(() => ScrollTrigger.refresh());

		return () => {
			clearTimeout(safety);
			stopScroll();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="preload" as="font" type="font/woff2" href={archivoLatinUrl} crossorigin="anonymous" />
	{#if !page.error}
		<link rel="alternate" hreflang="en" href={absoluteUrl(page.url.pathname, 'en')} />
		<link rel="alternate" hreflang="fr" href={absoluteUrl(page.url.pathname, 'fr')} />
		<link rel="alternate" hreflang="x-default" href={absoluteUrl(page.url.pathname, 'en')} />
	{/if}
</svelte:head>

<SkipLink />
<WorldGrid />
<Grain />
<ViewportFrame />
<Hud />
<Cursor />
<Toasts />
<Preloader />

<canvas class="gl" bind:this={canvas} aria-hidden="true"></canvas>

<main id="content" tabindex="-1">
	{@render children()}
</main>

<div class="ink-fade" bind:this={inkFade} aria-hidden="true"></div>

<style>
	.gl {
		position: fixed;
		inset: 0 auto auto 0;
		width: 100vw;
		height: 100vh;
		z-index: var(--z-gl);
		pointer-events: none;
	}

	#content:focus {
		outline: none;
	}

	.ink-fade {
		position: fixed;
		inset: 0;
		z-index: var(--z-ink);
		background: var(--ink);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}
</style>
