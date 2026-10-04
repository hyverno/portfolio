<!--
	01 · Hero: HYVERNO (§S1, §5). Theme paper; the page's only <h1>.
	The crowd lands in the name (spawn → hero-wide, 1.4s `arrive`, left → right by Hilbert order),
	the lede rises 200ms after, and on desktop the pinned Width March narrows the name into a tall
	monolith (hero-wide → hero-tall) before the README anchor breaks it into a flock.
	The <h1> is the DOM twin: sized from the same ink ratios as the crowd's boxes, invisible (but
	read) while WebGL runs, a halftone fallback with its own width scrub when it does not.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudLine, themeSection } from '#lib/core/actions';
	import { whenBooted } from '#lib/core/boot.svelte';
	import { TIER, device } from '#lib/core/device.svelte';
	import { DUR, EASE, ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { whenEngine } from '#lib/gl/handle';
	import type { Engine } from '#lib/gl/types';
	import { fmtNum, i18n, t } from '#lib/i18n/index.svelte';
	import { entityCount } from '#lib/ui/chrome.svelte';
	import Keycap from '#lib/ui/Keycap.svelte';
	import { switchCollider } from './hero/collider';
	import { HeroDirector, type HeroCrowd } from './hero/director';
	import { HERO_TALL, HERO_TALL_ID, HERO_WIDE, HERO_WIDE_ID } from './hero/formations';
	import { heroMode } from './hero/mode';
	import { Rise } from './hero/rise';
	import { Twin } from './hero/twin';

	const KEY = /^\[(\d)\]$/;

	let sectionEl = $state<HTMLElement>();
	let frameEl = $state<HTMLElement>();
	let wideEl = $state<HTMLElement>();
	let tallEl = $state<HTMLElement>();
	let twinEl = $state<HTMLElement>();
	let wordEl = $state<HTMLElement>();
	let probeEl = $state<HTMLElement>();
	let indexEl = $state<HTMLElement>();
	let ledeWrapEl = $state<HTMLElement>();
	let hintWrapEl = $state<HTMLElement>();
	let hintEl = $state<HTMLElement>();
	let hintInlineEl = $state<HTMLElement>();

	let mounted = $state(false);
	/** Pin at rest: the copy colliders are trustworthy (see hero/collider.ts). */
	let atRest = $state(true);
	/**
	 * The copy is on screen. Before that it is no obstacle: the landing flies straight through
	 * where the lede will be (from the spawner below it up into the letters).
	 */
	let copyIn = $state(false);
	const solid = $derived(atRest && copyIn);

	const entities = $derived(mounted ? entityCount() : TIER.high.sim ** 2);
	const hintParts = $derived(t().hero.hint.split(/(\[\d\])/).filter(Boolean));

	/**
	 * The blend tween ends before the bodies do: the last entities leave the spawner about halfway
	 * through it (Hilbert stagger) and still have the width of the screen to fly. The copy waits
	 * for the name to settle, then rises 200ms later (§5).
	 */
	const SETTLE_S = 0.55;

	const rise = new Rise(() => device.reducedMotion);
	const director = new HeroDirector({ landed: ({ skipped }) => entrance(skipped, true) });

	/**
	 * The name must be baked first. The engine bakes every formation in one FIFO idle queue, and
	 * every section asks for the engine while it mounts, so the hero asks at component init (before
	 * any section's anchor) and defines its two formations right inside that first reaction: not
	 * after an `await` in the component, which the dev compiler wraps in extra microtask hops that
	 * let a dozen other sections queue their bakes first. Baked first, the name is ready before the
	 * preloader leaves (the boot waits for pending bakes) instead of seconds after.
	 */
	let heroBakes: Promise<unknown> | null = null;
	function defineHero(engine: Engine): Promise<unknown> {
		const crowd = engine.crowd;
		heroBakes ??= Promise.all([
			crowd.define(HERO_WIDE_ID, HERO_WIDE, { el: wideEl!, space: 'page' }, { preset: 'march' }),
			crowd.define(HERO_TALL_ID, HERO_TALL, { el: tallEl!, space: 'page' }, { preset: 'march' })
		]);
		return heroBakes;
	}
	const engineReady =
		typeof window === 'undefined'
			? null
			: whenEngine().then((e) => {
					// First load: the page has mounted long before the engine exists. A client-side
					// return finds the engine already up and lands here before mount: onMount defines.
					if (e && wideEl && tallEl) void defineHero(e);
					return e;
				});

	let entered = false;
	let copyCall: gsap.core.Tween | null = null;
	/** Index label and hint come in with the lede (the lede itself is the `Rise`). */
	function entrance(skipped: boolean, crowd: boolean) {
		if (entered) return;
		entered = true;
		const hints = [hintEl, hintInlineEl].filter((el): el is HTMLElement => !!el);
		const chrome = indexEl ? [indexEl, ...hints] : hints;
		if (skipped) {
			copyIn = true;
			rise.finish();
			gsap.set(chrome, { autoAlpha: 1, y: 0 });
			return;
		}
		const reduced = device.reducedMotion;
		const lead = (crowd && !reduced ? SETTLE_S : 0) + 0.2;
		// Until the copy shows it is no obstacle (the late arrivals fly straight through).
		copyCall = gsap.delayedCall(lead, () => void (copyIn = true));
		rise.play(lead);
		if (reduced) {
			gsap.to(chrome, { autoAlpha: 1, duration: 0.2, delay: lead, ease: 'none' });
			return;
		}
		if (indexEl)
			gsap.fromTo(
				indexEl,
				{ autoAlpha: 0, y: 12 },
				{ autoAlpha: 1, y: 0, duration: DUR.reveal, delay: lead, ease: EASE.steer }
			);
		gsap.fromTo(
			hints,
			{ autoAlpha: 0, y: 8 },
			{ autoAlpha: 1, y: 0, duration: DUR.reveal, delay: lead + 0.55, ease: EASE.steer }
		);
	}

	onMount(() => {
		mounted = true;
		let alive = true;
		let noGL = false;
		const twin = new Twin(twinEl!, wordEl!, probeEl!, wideEl!);

		// ── twin: measured once now, on fonts.ready and on resize (never per frame) ────────────
		twin.measure();
		let raf = 0;
		const remeasure = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => alive && twin.measure());
		};
		document.fonts?.ready.then(remeasure);
		const ro = new ResizeObserver(remeasure);
		ro.observe(frameEl!);

		// ── width march: pin + scrub, created synchronously (pins refresh top to bottom) ───────
		let marching = false;
		let lastP = 0;
		const progress = (p: number) => {
			lastP = p;
			director.setProgress(p);
			const rest = p < 0.001;
			if (rest !== atRest) atRest = rest;
			if (noGL) twin.scrub(p);
		};
		let first = true;
		let refreshRaf = 0;
		const offMotion = mm((ctx) => {
			const mode = heroMode(ctx);
			marching = mode === 'march';
			sectionEl!.dataset.mode = mode;
			director.setMode(mode, ctx.reduced);
			twin.reset();
			atRest = true;
			// The boxes moved without resizing: regions and pins re-measure on refresh.
			if (!first) {
				cancelAnimationFrame(refreshRaf);
				refreshRaf = requestAnimationFrame(() => ScrollTrigger.refresh());
			}
			first = false;
			if (!marching) return;

			const proxy = { p: 0 };
			const tl = gsap.timeline({
				defaults: { ease: 'none' },
				scrollTrigger: {
					trigger: sectionEl!,
					start: 'top top',
					end: '+=100%',
					pin: true,
					scrub: 1,
					refreshPriority: 50
				}
			});
			tl.to(proxy, { p: 1, duration: 1, onUpdate: () => progress(proxy.p) }, 0);
			// A refresh after a big jump (restored scroll, hash link, immediate scrollTo) can set the
			// timeline's progress without firing onUpdate: follow the real progress every frame too.
			const offFollow = onFrame(() => {
				const p = tl.progress();
				if (Math.abs(p - lastP) > 1e-4) progress(p);
			}, PRIORITY.input);
			tl.fromTo(
				ledeWrapEl!,
				{ y: 0, autoAlpha: 1 },
				{ y: -40, autoAlpha: 0, duration: 0.3, ease: EASE.despawn, immediateRender: false },
				0
			);
			tl.fromTo(
				hintWrapEl!,
				{ autoAlpha: 1 },
				{ autoAlpha: 0, duration: 0.16, immediateRender: false },
				0
			);
			return () => {
				offFollow();
				marching = false;
				lastP = 0;
				director.setProgress(0);
			};
		});

		// ── crowd ───────────────────────────────────────────────────────────────────────────────
		void (engineReady ?? whenEngine()).then((engine) => {
			if (!alive) return;
			if (!engine) {
				// Static build: the halftone <h1> is the hero; it runs the width scrub itself.
				noGL = true;
				twin.measure();
				if (marching) twin.scrub(lastP);
				void whenBooted().then(() => alive && entrance(false, false));
				return;
			}
			director.setCrowd(engine.crowd as HeroCrowd);
			void defineHero(engine).then(() => alive && director.ready());
		});
		void whenBooted().then(() => alive && director.boot());

		return () => {
			alive = false;
			copyCall?.kill();
			cancelAnimationFrame(raf);
			cancelAnimationFrame(refreshRaf);
			ro.disconnect();
			director.dispose();
			offMotion();
			rise.dispose();
			twin.reset();
		};
	});
</script>

<section
	id="hero"
	class="hero"
	data-section="hero"
	data-theme="paper"
	bind:this={sectionEl}
	use:themeSection={'paper'}
	use:hudLine={{ section: t().hero.index, label: t().hero.hud }}
>
	<div class="wrap">
		<div class="frame" bind:this={frameEl}>
			<p class="index hud-text graphite" bind:this={indexEl}>{t().hero.index}</p>

			<!-- Where the crowd forms the name: ink boxes with the baked glyph aspect ratios. -->
			<div class="ink wide" bind:this={wideEl} aria-hidden="true"></div>
			<div class="ink tall" bind:this={tallEl} aria-hidden="true"></div>

			<h1 class="twin" bind:this={twinEl}>
				<span class="word" bind:this={wordEl}>{t().hero.name}</span><span
					class="probe"
					bind:this={probeEl}
					aria-hidden="true"
				></span><span class="visually-hidden">, {t().hero.role}</span>
			</h1>
			<p class="visually-hidden gl-only">{t().hero.canvas(fmtNum(entities))}</p>

			<div
				class="lede-wrap"
				bind:this={ledeWrapEl}
				use:switchCollider={{ enabled: solid, pad: 14 }}
			>
				{#key `${i18n.lang}:${device.reducedMotion}`}
					<p class="lede t-lede" use:rise.attach>
						{t().hero.lede.pre}<em class="serif">{t().hero.lede.em}</em>{t().hero.lede.post}
					</p>
				{/key}
				<!-- Tablets and narrow desktops: no room between the HUD corners, the hint joins the copy. -->
				<p class="hint inline hud-text graphite gl-only" bind:this={hintInlineEl}>
					{@render hint()}
				</p>
			</div>
		</div>
	</div>

	<div class="hint-wrap gl-only" bind:this={hintWrapEl}>
		<p
			class="hint hud-text graphite"
			bind:this={hintEl}
			use:switchCollider={{ enabled: solid, pad: 10 }}
		>
			{@render hint()}
		</p>
	</div>
</section>

{#snippet hint()}
	<span class="fine"
		>{#each hintParts as part, i (i)}{@const key = KEY.exec(part)}{#if key}<span
					class="visually-hidden">{part}</span
				><Keycap key={key[1]} size="micro" />{:else}{part}{/if}{/each}</span
	><span class="touch">{t().hero.hintTouch}</span>
{/snippet}

<style>
	.hero {
		position: relative;
		height: 100svh;
		min-height: 30rem;
		/* Taps ping, vertical scroll is never blocked (§5 mobile). */
		touch-action: pan-y pinch-zoom;
	}

	.wrap {
		height: 100%;
	}

	/*
		Layout in one place. 12 columns: the name spans cols 2–11, centred on the 42% line; the lede
		sits on cols 2–7 under it. --W is the ink width shared by the twin and the crowd's boxes.
		(Custom properties resolve where they are used, so 100cqi below is this frame's width.)
	*/
	.frame {
		position: relative;
		height: 100%;
		container-type: inline-size;
		--line: 42%;
		--col: calc((100cqi - 11 * var(--gutter)) / 12);
		--W: min(calc(10 * var(--col) + 9 * var(--gutter)), 164svh);
		--x: calc(var(--col) + var(--gutter));
		/* Name height: wide ink box (6592 × 712). */
		--hn: calc(var(--W) * 0.10801);
		--lede-x: var(--x);
		--lede-w: calc(6 * var(--col) + 5 * var(--gutter));
	}

	.index {
		position: absolute;
		left: 0;
		top: var(--section-pad);
		margin: 0;
	}

	/* ── where the crowd forms ─────────────────────────────────────────── */
	.ink {
		position: absolute;
		left: var(--x);
		top: var(--line);
		width: var(--W);
		pointer-events: none;
	}

	.ink.wide {
		aspect-ratio: 6592 / 712;
		transform: translateY(-50%);
	}

	/* March: same width, same baseline as the wide name; it grows upward as it narrows. */
	.ink.tall {
		aspect-ratio: 3437 / 712;
		transform: translateY(-73.93%);
	}

	/* ── the DOM twin ───────────────────────────────────────────────────── */
	.twin {
		/* F0 fixes the baseline (centre line + 0.344 em), F is the current size (static scrub). */
		--F0: calc(var(--W) / 6.592);
		--F: var(--F0);
		--lsb: 0.074;
		--k: 0.834;
		--wdth: 125;
		position: absolute;
		left: calc(var(--x) - var(--lsb) * var(--F));
		top: calc(var(--line) + 0.344 * var(--F0) - var(--k) * var(--F));
		margin: 0;
		font-size: var(--F);
		font-weight: 900;
		line-height: 1;
		letter-spacing: 0;
		white-space: nowrap;
		text-wrap: nowrap;
		color: var(--ink);
	}

	.probe {
		display: inline-block;
		width: 0;
		height: 0;
		vertical-align: baseline;
	}

	/* WebGL (or still booting): the crowd draws the name; the twin is read, not seen. */
	:global(html.js:not(.no-webgl)) .twin {
		opacity: 0;
		pointer-events: none;
		user-select: none;
	}

	/* Static build: the name in halftone, the same dots the crowd would have drawn. */
	:global(html.no-webgl) .twin,
	:global(html:not(.js)) .twin {
		color: transparent;
		background-image: radial-gradient(circle at 50% 50%, var(--ink) 0 1.45px, transparent 1.8px);
		background-size: 4px 4px;
		-webkit-background-clip: text;
		background-clip: text;
	}

	/* ── lede ───────────────────────────────────────────────────────────── */
	.lede-wrap {
		position: absolute;
		left: var(--lede-x);
		top: calc(var(--line) + var(--hn) / 2 + clamp(28px, 5.5svh, 60px));
		width: var(--lede-w);
	}

	.lede {
		max-width: none;
		text-wrap: pretty;
	}

	/* SplitText leaves span lines inline: block them so the masks clip and the lines can move. */
	.lede :global(.rise-line),
	.lede :global(.rise-line-mask) {
		display: block;
	}

	/* Hidden until the crowd has landed (the Rise reveals it line by line). */
	:global(html.js) .lede,
	:global(html.js) .index,
	:global(html.js) .hint {
		visibility: hidden;
	}

	/* ── hint ───────────────────────────────────────────────────────────── */
	/* Bottom-centre, on the HUD's bottom row, between its corners (keys left, stats right). */
	.hint-wrap {
		position: absolute;
		left: 50%;
		bottom: calc(var(--frame-inset) + 14px);
		transform: translateX(-50%);
		width: max-content;
		max-width: min(70ch, calc(100vw - 50rem));
		text-align: center;
	}

	.hint {
		max-width: none;
		text-wrap: balance;
	}

	.hint.inline {
		display: none;
		margin-top: var(--s-3);
		text-align: left;
	}

	.hint :global(.keycap) {
		margin-inline: 0.2em;
		vertical-align: 0.05em;
	}

	.touch {
		display: none;
	}

	@media (pointer: coarse) {
		.fine {
			display: none;
		}

		.touch {
			display: inline;
		}
	}

	:global(html:not(.js)) .hint,
	:global(html.reduced-motion) .hint {
		display: none !important;
	}

	/* ── tall mode: mobile, tablet, coarse pointers, reduced motion ─────── */
	.hero:global([data-mode='tall']) .frame {
		--hn: calc(var(--W) * 0.20716);
	}

	.hero:global([data-mode='tall']) .ink.tall {
		transform: translateY(-50%);
	}

	.hero:global([data-mode='tall']) .twin {
		--F0: calc(var(--W) / 3.437);
		--lsb: 0.04;
		--wdth: 62;
	}

	@media (max-width: 1279px) and (min-width: 768px) {
		/* Not enough room between the HUD corners: the hint joins the copy, under the lede. */
		.hint-wrap {
			display: none;
		}

		.hint.inline {
			display: block;
		}
	}

	@media (max-width: 1023px) {
		.frame {
			--W: min(100cqi, 164svh);
			--x: calc((100cqi - var(--W)) / 2);
			--hn: calc(var(--W) * 0.20716);
			--lede-x: 0px;
			--lede-w: calc(6 * (100cqi - 7 * var(--gutter)) / 8 + 5 * var(--gutter));
		}

		.ink.tall {
			transform: translateY(-50%);
		}

		.twin {
			--F0: calc(var(--W) / 3.437);
			--lsb: 0.04;
			--wdth: 62;
		}
	}

	@media (max-width: 767px) {
		.frame {
			--W: min(92vw, 164svh);
			--lede-w: 100cqi;
		}

		/* The HUD has no bottom corners on phones: the whole bottom edge is free. */
		.hint-wrap {
			bottom: calc(var(--frame-inset) + 18px);
			max-width: calc(100vw - 48px);
		}
	}

	@media (max-height: 520px) {
		.hint-wrap {
			display: none;
		}
	}
</style>
