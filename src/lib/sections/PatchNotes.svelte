<!--
	07 · PATCH NOTES (theme paper). The career as a changelog: versions, never invented dates
	(an optional `date` renders only when filled). The spine sits at col 2; 'patch-spine' runs a
	conveyor of entities down it that clusters at a diamond per version. A sticky version number
	(--fs-display Martian, cols 1–3) rolls in steps(4) as entries pass. Lines print like console
	output. Then the LOADOUT, and the one known issue. Mobile: spine 16px from the left, the
	version becomes an inline header per entry.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { collider, hudLine, reveal, themeSection } from '#lib/core/actions';
	import { device } from '#lib/core/device.svelte';
	import { DUR, EASE, STAGGER, ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { scroll } from '#lib/core/scroll.svelte';
	import { stats } from '#lib/core/stats.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { formation } from '#lib/gl/actions';
	import { patchNotes } from '#lib/content/content';
	import type { FormationSource } from '#lib/gl/types';
	import type { PatchKind } from '#lib/content/types';
	import { fmtDate, i18n, loc, t } from '#lib/i18n/index.svelte';
	import Loadout from './Loadout.svelte';
	import { tailEngine, trackPageHeight, watchLayout, type TailCrowd } from './tail/crowd';
	import {
		SPINE_ID,
		spineLanes,
		spinePaint,
		spineSource,
		type SpineGeometry
	} from './tail/formations';

	const KIND: Record<PatchKind, { sym: string; cls: string }> = {
		'+': { sym: '+', cls: 'add' },
		'~': { sym: '~', cls: 'chg' },
		'-': { sym: '−', cls: 'rem' },
		'!': { sym: '!', cls: 'bug' }
	};

	/** Characters a version column can roll through. */
	const ALPHABET = [...'0123456789x'];
	/** `v2.5` → ['2', '5']: the sticky number is laid out around its decimal point. */
	const parts = (v: string): [string, string] => {
		const [major = '0', minor = '0'] = v.replace(/^v/, '').split('.');
		return [major, minor];
	};
	/** Where the sticky number rests, as a fraction of the viewport height. */
	const STICKY_TOP = 0.24;

	let logEl = $state<HTMLElement>();
	let spineEl = $state<HTMLElement>();
	let engineOk = $state(false);
	let spineInit = $state<FormationSource | null>(null);
	let crowd: TailCrowd | null = null;
	let lastKey = '';
	/** Geometry of the source the crowd last baked (the paint must use the same slot plan). */
	let bakedGeo: SpineGeometry | null = null;
	let paintedFor = '';
	/** Waypoint centres (px from the spine top) for the static build's CSS diamonds. */
	let marks = $state<number[]>([]);

	/** Optional dates render only when filled, at the precision they were written with. */
	const dateLabel = (d: string) =>
		/^\d{4}$/.test(d) ? d : fmtDate(d, d.length > 7 ? 'day' : 'month');

	/** Index of the entry the reader is on (drives the sticky number and the HUD line). */
	let cur = $state(0);
	const version = $derived(patchNotes[cur]?.version ?? patchNotes[0].version);
	const major = $derived([...parts(version)[0]]);
	const minor = $derived([...parts(version)[1]]);

	let railEl = $state<HTMLElement>();
	let stickyEl = $state<HTMLElement>();

	/**
	 * With the crowd on, the number floats above the canvas (z 30, like the HUD) so the conveyor
	 * passes *behind* it: the node moves to <body> and its sticky behaviour is emulated from
	 * cached page offsets (no layout reads in the frame loop). Static build: plain CSS sticky.
	 */
	function floatVersion(rail: HTMLElement, el: HTMLElement): () => void {
		const home = el.parentElement;
		const next = el.nextSibling;
		document.body.appendChild(el);
		el.classList.add('floating');
		const geo = { top: 0, bottom: 0, left: 0, width: 0, h: 0 };
		let lastY = Number.NaN;
		let lastLimit = scroll.limit;
		let shown = true;
		const measure = () => {
			const r = rail.getBoundingClientRect();
			geo.top = r.top + window.scrollY;
			geo.bottom = r.bottom + window.scrollY;
			geo.left = r.left;
			geo.width = r.width;
			geo.h = el.offsetHeight;
			el.style.left = `${geo.left}px`;
			el.style.width = `${geo.width}px`;
			lastY = Number.NaN;
		};
		measure();
		const offLayout = watchLayout([rail, el], measure, 60);
		ScrollTrigger.addEventListener('refresh', measure);
		const offFrame = onFrame(() => {
			// The page above grew or shrank (late content, pins): our cached offsets moved with it.
			if (scroll.limit !== lastLimit) {
				lastLimit = scroll.limit;
				measure();
			}
			const vh = window.innerHeight;
			const y = Math.min(
				Math.max(geo.top - scroll.y, vh * STICKY_TOP),
				geo.bottom - scroll.y - geo.h
			);
			if (Math.abs(y - lastY) < 0.25) return;
			lastY = y;
			const visible = y < vh && y + geo.h > 0;
			if (visible !== shown) {
				shown = visible;
				el.style.visibility = visible ? '' : 'hidden';
			}
			if (visible) el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
		}, PRIORITY.ui);
		return () => {
			offFrame();
			offLayout();
			ScrollTrigger.removeEventListener('refresh', measure);
			el.classList.remove('floating');
			el.style.cssText = '';
			if (home?.isConnected) home.insertBefore(el, next?.parentNode === home ? next : null);
			else el.remove();
		};
	}

	$effect(() => {
		if (!engineOk || device.mobile || !railEl || !stickyEl) return;
		return floatVersion(railEl, stickyEl);
	});

	function waypointsOf(box: DOMRect): number[] {
		return [...(logEl?.querySelectorAll<HTMLElement>('.entry') ?? [])].map((entry) => {
			// Layout values only: the entry heads animate with transforms.
			const title = entry.querySelector<HTMLElement>('.entry-title');
			const r = entry.getBoundingClientRect();
			const lh = title ? parseFloat(getComputedStyle(title).lineHeight) || 24 : 24;
			return r.top - box.top + (title ? title.offsetTop + Math.min(title.offsetHeight, lh) / 2 : 0);
		});
	}

	function measure(): SpineGeometry | null {
		if (!spineEl || !logEl) return null;
		const box = spineEl.getBoundingClientRect();
		if (box.height < 8) return null;
		const waypoints = waypointsOf(box);
		marks = waypoints;
		if (!crowd) return null;
		return {
			width: box.width,
			height: box.height,
			waypoints,
			lanes: spineLanes(crowd.N, box.height, waypoints.length)
		};
	}

	/** Rebuilds the spine when the layout (or the tier) changed; compared by value, so cheap. */
	function remeasure() {
		const geo = measure();
		if (!geo || !crowd || !spineEl) return;
		const src = spineSource(geo);
		const key = JSON.stringify(src);
		if (key === lastKey) return;
		lastKey = key;
		bakedGeo = geo;
		paintedFor = '';
		if (!spineInit) spineInit = src;
		else void crowd.define(SPINE_ID, src, { el: spineEl, space: 'page' });
	}

	/** The current version's waypoint diamond glows signal (re-applied after every bake). */
	function paintCurrent(force = false) {
		if (!crowd || !bakedGeo || !crowd.has(SPINE_ID)) return;
		const tag = `${cur}:${crowd.N}:${lastKey.length}`;
		if (!force && tag === paintedFor) return;
		paintedFor = tag;
		crowd.setPaint(SPINE_ID, spinePaint(crowd.N, bakedGeo, cur));
	}

	$effect(() => {
		void cur;
		untrack(() => paintCurrent());
	});

	// Tier changes (governor) change N: re-plan the lanes. A tier swap re-bakes without a bake
	// event, so the highlight is re-applied once the new sim has settled.
	let repaintTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		void stats.entities;
		void i18n.lang;
		untrack(() => {
			requestAnimationFrame(remeasure);
			clearTimeout(repaintTimer);
			repaintTimer = setTimeout(() => paintCurrent(true), 2500);
		});
		return () => clearTimeout(repaintTimer);
	});

	onMount(() => {
		let alive = true;
		const offLayout = logEl ? watchLayout([logEl], remeasure, 200) : () => {};

		let offHeight = () => {};
		let offBake = () => {};
		void tailEngine().then((h) => {
			if (!alive || !h) return;
			crowd = h.crowd;
			engineOk = true;
			offHeight = trackPageHeight(h.crowd);
			// A bake replaces the formation's paint: put the highlight back.
			offBake = h.crowd.onBake((id) => {
				if (id === SPINE_ID) requestAnimationFrame(() => paintCurrent(true));
			});
			requestAnimationFrame(remeasure);
		});

		// Which version the reader is on: an entry is current once its head crosses 45%.
		const entries = [...(logEl?.querySelectorAll<HTMLElement>('.entry') ?? [])];
		const triggers = entries.map((entry, i) =>
			ScrollTrigger.create({
				trigger: entry,
				start: 'top 45%',
				onEnter: () => (cur = i),
				onLeaveBack: () => (cur = Math.max(0, i - 1))
			})
		);

		// Lines print like console output: clip-path inset(0 100% 0 0) → inset(0), 280ms, .06.
		const offPrint = mm(({ reduced }) => {
			for (const entry of entries) {
				const head = entry.querySelectorAll<HTMLElement>('[data-head]');
				const lines = entry.querySelectorAll<HTMLElement>('.line');
				const scrollTrigger = { trigger: entry, start: 'top 80%', once: true };
				if (reduced) {
					gsap.from([...head, ...lines], { autoAlpha: 0, duration: 0.2, ease: 'none', scrollTrigger });
					continue;
				}
				const tl = gsap.timeline({ scrollTrigger });
				tl.from(head, { yPercent: 60, autoAlpha: 0, duration: DUR.reveal, ease: EASE.steer, stagger: 0.05 });
				tl.fromTo(
					lines,
					{ clipPath: 'inset(0 100% 0 0)' },
					{ clipPath: 'inset(0 0% 0 0)', duration: 0.28, ease: 'steps(12)', stagger: STAGGER.rows },
					0.18
				);
			}
			const foot = logEl?.parentElement?.querySelector<HTMLElement>('.known-issue');
			if (foot && !reduced) {
				gsap.fromTo(
					foot,
					{ clipPath: 'inset(0 100% 0 0)' },
					{
						clipPath: 'inset(0 0% 0 0)',
						duration: 0.56,
						ease: 'steps(24)',
						scrollTrigger: { trigger: foot, start: 'top 88%', once: true }
					}
				);
			}
		});

		return () => {
			alive = false;
			offHeight();
			offBake();
			offLayout();
			offPrint();
			for (const st of triggers) st.kill();
		};
	});
</script>

<section
	id="patch-notes"
	data-section="patch-notes"
	data-theme="paper"
	class="section patch"
	use:themeSection={'paper'}
	use:hudLine={{ section: t().patch.index.slice(0, 2), label: t().patch.hud, line: version }}
>
	<div class="wrap">
		<header class="head grid">
			<p class="index hud-text graphite">{t().patch.index}</p>
			<h2
				class="headline t-display"
				use:reveal={{ mode: 'lines', widthMarch: true }}
				use:collider={{ pad: 8 }}
			>
				{t().patch.headline}
			</h2>
		</header>

		<div class="log grid" bind:this={logEl}>
			<p class="visually-hidden">{t().patch.canvas}</p>

			<!-- The spine: the formation's region (entities) or a dotted line (static build). -->
			<div class="spine" bind:this={spineEl} aria-hidden="true">
				<span class="spine-css static-only"></span>
				{#each marks as y, i (i)}
					<span class="mark static-only" style:top="{y}px"></span>
				{/each}
			</div>
			{#if engineOk && spineInit && spineEl}
				<div
					class="spine-anchor"
					aria-hidden="true"
					use:formation={{ id: SPINE_ID, source: spineInit, region: spineEl }}
				></div>
			{/if}

			<div class="rail" bind:this={railEl} aria-hidden="true">
				<div class="sticky" bind:this={stickyEl}>
					<p class="version mono">
						<span class="lhs"
							><span class="v">v</span>{#each major as c, i (i)}
								<span class="col">
									<span class="strip" style:--i={Math.max(0, ALPHABET.indexOf(c))}>
										{#each ALPHABET as g (g)}<span>{g}</span>{/each}
									</span>
								</span>
							{/each}</span
						><span class="dot">.</span><span class="rhs"
							>{#each minor as c, i (i)}
								<span class="col">
									<span class="strip" style:--i={Math.max(0, ALPHABET.indexOf(c))}>
										{#each ALPHABET as g (g)}<span>{g}</span>{/each}
									</span>
								</span>
							{/each}</span
						>
					</p>
					<p class="version-label hud-text graphite">{t().patch.version}</p>
				</div>
			</div>

			<ol class="entries" role="list">
				{#each patchNotes as note (note.version)}
					<li class="entry" use:collider={{ pad: 6 }}>
						<p class="ver mono" data-head aria-hidden="true">{note.version}</p>
						<h3 class="entry-title" data-head>
							<span class="visually-hidden">{note.version} · </span>{loc(note.title)}
						</h3>
						{#if note.date}
							<p class="date hud-text graphite" data-head>{dateLabel(note.date)}</p>
						{/if}
						<ul class="lines mono" role="list">
							{#each note.lines as line, j (j)}
								<li class="line {KIND[line.kind].cls}">
									<span class="prefix">{KIND[line.kind].sym} {t().patch.kinds[line.kind]}</span>
									<span class="text">{loc(line.text)}</span>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ol>
		</div>

		<div class="loadout-wrap grid">
			<div class="loadout-cell">
				<Loadout />
			</div>
		</div>

		<p class="known-issue mono grid" use:collider={{ pad: 6 }}>
			<span class="ki"><span class="bang" aria-hidden="true">!</span> {t().patch.footer}</span>
		</p>
	</div>
</section>

<style>
	.head {
		row-gap: var(--s-3);
		margin-bottom: clamp(56px, 8vw, 120px);
	}

	.index,
	.headline {
		grid-column: 1 / -1;
	}

	/* ── the changelog ─────────────────────────────────────────────────────────── */
	.log {
		position: relative;
		grid-template-rows: auto;
	}

	.spine {
		position: absolute;
		grid-column: 2 / 3;
		grid-row: 1;
		justify-self: center;
		top: 0;
		bottom: 0;
		width: 64px;
		pointer-events: none;
	}

	.spine-anchor {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		pointer-events: none;
	}

	/* Static build: a dotted spine and CSS diamonds. */
	.spine-css {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 3px;
		margin-left: -1.5px;
		background: radial-gradient(circle, var(--ink) 1.1px, transparent 1.5px) 0 0 / 3px 6px repeat-y;
	}

	.rail {
		grid-column: 1 / 4;
		grid-row: 1;
		position: relative;
	}

	.sticky {
		position: sticky;
		top: 24vh;
	}

	/* Floating above the canvas (see floatVersion): the conveyor passes behind the number. */
	.sticky:global(.floating) {
		position: fixed !important;
		top: 0;
		left: 0;
		z-index: var(--z-debug);
		pointer-events: none;
		will-change: transform;
	}

	/* The decimal point sits on the spine (col 2's centre): [v + major] . [minor]. */
	.version {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: baseline;
		font-size: min(var(--fs-display), 7.4vw);
		line-height: 1;
		font-weight: 700;
		font-stretch: 75%;
		letter-spacing: -0.04em;
		color: var(--ink);
		max-width: none;
		/* A paper halo, like a map label, so the belt reads as passing under the number. */
		paint-order: stroke fill;
		-webkit-text-stroke: 0.1em var(--paper);
	}

	.lhs {
		display: flex;
		justify-self: end;
	}

	.rhs {
		display: flex;
		justify-self: start;
	}

	.version .v,
	.version .dot {
		color: var(--graphite);
	}

	.col {
		display: inline-block;
		height: 1em;
		overflow: hidden;
		/* Room for the halo stroke inside the mask. */
		padding-inline: 0.05em;
		margin-inline: -0.05em;
	}

	.strip {
		display: flex;
		flex-direction: column;
		transform: translateY(calc(var(--i) * -1em));
		transition: transform var(--t-base) steps(4, end);
	}

	.strip > span {
		display: block;
		height: 1em;
	}

	:global(html.reduced-motion) .strip {
		transition: none;
	}

	.version-label {
		margin-top: 16px;
		max-width: none;
	}

	.entries {
		grid-column: 5 / 12;
		grid-row: 1;
		display: grid;
		gap: clamp(56px, 7vw, 104px);
		list-style: none;
		padding: 0 0 clamp(40px, 5vw, 72px);
	}

	.entry {
		position: relative;
	}

	.ver {
		font-size: var(--fs-hud);
		letter-spacing: 0.06em;
		color: var(--graphite);
		margin-bottom: 6px;
	}

	.entry-title {
		--wdth: var(--wdth-h2);
		font-size: var(--fs-h2);
		line-height: var(--lh-h2);
		font-weight: var(--fw-h2);
		margin-bottom: var(--s-3);
	}

	.date {
		margin: -8px 0 var(--s-2);
	}

	.lines {
		display: grid;
		gap: 10px;
		list-style: none;
		padding: 0;
		font-size: clamp(0.8125rem, 0.78rem + 0.16vw, 0.9375rem);
		line-height: 1.5;
	}

	.line {
		display: grid;
		grid-template-columns: var(--kw, 15ch) minmax(0, 1fr);
		column-gap: 1.5ch;
		align-items: baseline;
		clip-path: inset(0 0 0 0);
	}

	:global(html[lang='fr']) .line {
		--kw: 18ch;
	}

	.prefix {
		white-space: nowrap;
		font-weight: 500;
	}

	.add .prefix {
		color: var(--ink);
	}

	.chg .prefix,
	.rem .prefix {
		color: var(--graphite);
	}

	.rem .text {
		color: var(--graphite);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}

	.bug .prefix {
		color: var(--signal-text);
	}

	.mark {
		position: absolute;
		left: 50%;
		width: 13px;
		height: 13px;
		margin: -6.5px 0 0 -6.5px;
		background: var(--ink);
		transform: rotate(45deg);
		box-shadow: 0 0 0 4px var(--paper);
	}

	/* ── loadout + footer ──────────────────────────────────────────────────────── */
	.loadout-wrap {
		margin-top: clamp(72px, 9vw, 136px);
	}

	.loadout-cell {
		grid-column: 5 / 13;
	}

	.known-issue {
		margin-top: clamp(64px, 8vw, 120px);
		max-width: none;
	}

	.ki {
		grid-column: 5 / 13;
		font-size: clamp(0.875rem, 0.8rem + 0.3vw, 1.0625rem);
	}

	.bang {
		color: var(--signal-text);
		font-weight: 700;
	}

	/* ── tablet ──────────────────────────────────────────────────────────────────── */
	@media (min-width: 768px) and (max-width: 1023px) {
		.rail {
			grid-column: 1 / 3;
		}
		.version {
			font-size: min(var(--fs-display), 9vw);
		}
		.entries,
		.loadout-cell,
		.ki {
			grid-column: 3 / 9;
		}
	}

	/* ── mobile: spine 16px from the left, inline version headers ─────────────────── */
	@media (max-width: 767px) {
		.log {
			display: block;
			padding-left: 32px;
		}

		.spine {
			left: -24px;
			top: 0;
			bottom: 0;
			width: 48px;
		}

		.rail {
			display: none;
		}

		.ver {
			font-size: clamp(2.5rem, 1.5rem + 6vw, 3.25rem);
			line-height: 1;
			font-weight: 700;
			font-stretch: 75%;
			letter-spacing: -0.03em;
			color: var(--ink);
			margin-bottom: 4px;
		}

		.entry-title {
			font-size: var(--fs-h3);
			margin-bottom: var(--s-2);
		}

		.line {
			grid-template-columns: minmax(0, 1fr);
			row-gap: 2px;
		}

		.entries,
		.loadout-cell,
		.ki {
			grid-column: 1 / -1;
		}

		.loadout-wrap,
		.known-issue {
			padding-left: 32px;
		}
	}
</style>
