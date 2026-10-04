<script lang="ts">
	// 04 · SIDE QUESTS (§5): the chapter opener. The crowd lands in `sq-intro`, a quest map of three
	// waypoint diamonds (one per side project) on a dotted path that leaves toward the planet. The
	// labels under each waypoint are real links: fast travel to the project.
	import { onMount } from 'svelte';
	import { hudLine, reveal, themeSection } from '#lib/core/actions';
	import { scrollTo } from '#lib/core/scroll.svelte';
	import { formation } from '#lib/gl/actions';
	import { loc, t } from '#lib/i18n/index.svelte';
	import { sideProjects } from '#lib/content/content';
	import { INTRO_RING, SQ_INTRO, introLayout, introSvg } from './intro-formations';
	import { guardLayout } from './planet/layout-guard';
	import { wideCollider } from './planet/wide-collider';

	onMount(() => guardLayout());

	/**
	 * Earlier than the default anchor window (top 80% → 20%): the map is fully formed while the
	 * headline is still on screen above it, not only once the headline has scrolled away.
	 */
	const ANCHOR = { id: 'sq-intro', source: SQ_INTRO, from: 'ludo-d20', start: 'top 95%', end: 'top 45%' };

	/** Section id of each waypoint's project, in content order. */
	const TARGETS = ['planet', 'stixiva', 'rongeur'] as const;

	let mapW = $state(0);
	let mapH = $state(0);
	// Before the first measure (SSR, no JS) a desktop-shaped layout drives the static SVG; the
	// labels are placed in % so they still sit under the right diamonds.
	const L = $derived(introLayout(mapW || 1200, mapH || 460));
	const svg = $derived(introSvg(L));

	const labels = $derived(
		L.waypoints.map((wp, i) => {
			const R = wp.r * INTRO_RING;
			if (!L.vertical) {
				return { i, x: (wp.x / L.w) * 100, y: ((wp.y + R + 14) / L.h) * 100, side: 'below' as const };
			}
			const right = wp.x < L.w / 2;
			return {
				i,
				x: ((right ? wp.x + R + 12 : wp.x - R - 12) / L.w) * 100,
				y: (wp.y / L.h) * 100,
				side: right ? ('right' as const) : ('left' as const)
			};
		})
	);

	function travel(e: MouseEvent, id: string) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		scrollTo(`#${id}`, { duration: 1.6 });
	}
</script>

<section
	id="side-quests"
	data-section="side-quests"
	data-theme="paper"
	use:themeSection={'paper'}
	use:hudLine={{ section: '04', label: t().sideQuests.hud }}
	class="section intro"
>
	<div class="wrap">
		<div class="grid head">
			<p class="hud-text graphite index">{t().sideQuests.index}</p>
			<!-- The width march renders the heading wide (one more line) until it plays. An invisible
			     twin at the final width holds the layout, so the map below never shifts and the crowd's
			     cached region stays true. -->
			<div class="headline-box">
				<p class="t-display headline ghost" aria-hidden="true">
					{t().sideQuests.headline.pre}<em class="serif">{t().sideQuests.headline.em}</em>{t().sideQuests.headline.post}
				</p>
				<h2 class="t-display headline live" use:reveal={{ mode: 'lines', widthMarch: true }} use:wideCollider={{ pad: 8 }}>
					{t().sideQuests.headline.pre}<em class="serif">{t().sideQuests.headline.em}</em>{t().sideQuests.headline.post}
				</h2>
			</div>
		</div>

		<div class="map-wrap" class:vertical={L.vertical}>
			<div
				class="map"
				aria-hidden="true"
				bind:clientWidth={mapW}
				bind:clientHeight={mapH}
				use:formation={ANCHOR}
			>
				<!-- Static build: the same map as line art. -->
				<svg class="static-only still" viewBox="0 0 {L.w} {L.h}" preserveAspectRatio="none">
					{#each svg.paths as d}
						<path class="path" {d} />
					{/each}
					{#each svg.rings as d}
						<path class="ring" {d} />
					{/each}
					{#each svg.diamonds as d, i}
						<path class="diamond" class:active={i === 0} {d} />
					{/each}
				</svg>
			</div>

			<ol class="quests" role="list">
				{#each sideProjects as p, i (p.slug)}
					{@const l = labels[i]}
					<li class="quest {l.side}" style:left="{l.x}%" style:top="{l.y}%">
						<a href="#{TARGETS[i]}" onclick={(e) => travel(e, TARGETS[i])}>
							<span class="num" class:active={i === 0}>{String(i + 1).padStart(2, '0')}</span>
							<span class="title">{p.title}</span>
							{#if loc(p.status)}<span class="status">{loc(p.status)}</span>{/if}
						</a>
					</li>
				{/each}
			</ol>
		</div>
		<p class="visually-hidden">{t().sideQuests.canvas}</p>
	</div>
</section>

<style>
	.intro {
		/* The map leaves toward the planet: no bottom padding so the path runs into it. */
		padding-bottom: clamp(32px, 6vh, 72px);
	}

	.head {
		row-gap: var(--s-2);
		align-items: start;
	}

	.index {
		grid-column: 1 / -1;
	}

	.headline-box {
		position: relative;
		grid-column: 1 / -1;
	}

	.headline {
		max-width: 16ch;
		text-wrap: balance;
	}

	.ghost {
		visibility: hidden;
		pointer-events: none;
		user-select: none;
	}

	.live {
		position: absolute;
		inset: 0 0 auto 0;
	}

	@media (min-width: 1024px) {
		.index {
			grid-column: 1 / span 3;
			padding-top: 0.9em;
		}
		.headline-box {
			grid-column: 1 / span 10;
		}
	}

	.map-wrap {
		position: relative;
		margin-top: clamp(24px, 5vh, 64px);
	}

	.map {
		position: relative;
		width: 100%;
		height: clamp(340px, 54vh, 640px);
	}

	@media (max-width: 767px) {
		.map {
			height: min(150vw, 680px);
		}
	}

	.still {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.still .path {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-dasharray: 0 9;
		vector-effect: non-scaling-stroke;
	}

	.still .ring {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-dasharray: 13 8;
		vector-effect: non-scaling-stroke;
	}

	.still .diamond {
		fill: var(--ink);
	}

	.still .diamond.active {
		fill: var(--signal);
	}

	.quests {
		position: absolute;
		inset: 0;
		pointer-events: none;
		margin: 0;
	}

	.quest {
		position: absolute;
		pointer-events: auto;
		transform: translateX(-50%);
		white-space: nowrap;
	}

	.quest.right {
		transform: translateY(-50%);
	}

	.quest.left {
		transform: translate(-100%, -50%);
		text-align: right;
	}

	.quest a {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 6px 8px;
		font-family: var(--font-mono);
		font-size: var(--fs-hud);
		line-height: var(--lh-hud);
		letter-spacing: var(--tr-hud);
		font-weight: var(--fw-hud);
		font-stretch: calc(var(--wdth-hud) * 1%);
		text-transform: uppercase;
		color: var(--ink);
	}

	.quest.right a {
		justify-items: start;
	}

	.quest.left a {
		justify-items: end;
	}

	.num {
		color: var(--graphite);
	}

	.num.active {
		color: var(--signal-text);
	}

	.title {
		font-weight: 600;
	}

	.status {
		font-size: var(--fs-micro);
		letter-spacing: var(--tr-micro);
		color: var(--graphite);
		padding: 2px 6px;
		border: 1px solid var(--hairline);
	}

	.quest a:hover .title {
		text-decoration: underline dotted 2px;
		text-underline-offset: 4px;
	}

	@media (max-width: 767px) {
		.quest {
			white-space: normal;
			max-width: 46vw;
		}
	}
</style>
