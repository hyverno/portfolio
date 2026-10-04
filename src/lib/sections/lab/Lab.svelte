<!--
	05 · LAB: R&D (§5, theme `viewport`). "Things that shouldn't run this fast."
	Six editor viewports in a 3×2 grid (2 columns on tablets, stacked on phones), each a live web
	recreation; a one-line spec per cell below. The global crowd parks in the grid gutters
	(`lab-gutters`), so the crowd becomes the grid lines. Cells only run on screen; on phones only
	the one under the viewport centre runs. The grid reveals once (AABB draw-on, stagger .06).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { collider, hudLine, reveal, themeSection } from '#lib/core/actions';
	import { formation } from '#lib/gl/actions';
	import { ScrollTrigger, mm } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { NBSP, fmtNum, loc, t } from '#lib/i18n/index.svelte';
	import { lab as entries } from '#lib/content/content';
	import type { LabId } from '#lib/content/types';
	import LabCell from './LabCell.svelte';
	import { LAB_GUTTERS } from './formations';
	import { activeCell, lab, resetLab } from './state.svelte';
	import { prefetchLab } from './cells/loaders';
	import { whenEngine } from '#lib/gl/handle';

	resetLab();

	let grid = $state<HTMLElement>();
	const h = $derived(t().lab.headline);

	// A true sub-line: the counts are the page's own.
	const live = $derived(device.webgl === 'none' ? entries.filter((e) => e.render === 'canvas2d').length : entries.length);
	const stills = $derived(entries.length - live);
	const sub = $derived.by(() => {
		// Each count stays glued to its noun when the line wraps.
		const n = (v: number, words: { en: string; fr: string }) =>
			`${fmtNum(v)}${NBSP}${loc(words).replaceAll(' ', NBSP)}`;
		const parts = [
			n(live, { en: 'LIVE VIEWPORTS', fr: 'VIEWPORTS EN DIRECT' }),
			...(stills ? [n(stills, { en: 'STILLS', fr: 'IMAGES FIXES' })] : []),
			n(0, { en: 'VIDEOS', fr: 'VIDÉO' }),
			n(0, { en: 'SCREENSHOTS', fr: 'CAPTURE D’ÉCRAN' })
		];
		return parts.join(' · ');
	});

	const pad = (i: number) => String(i + 1).padStart(2, '0');

	function specEnter(id: LabId) {
		lab.hoverSpec = id;
	}
	function specLeave(id: LabId) {
		if (lab.hoverSpec === id) lab.hoverSpec = null;
	}

	let section = $state<HTMLElement>();

	onMount(() => {
		// Two viewports ahead, warm every cell's chunk, so a fast scroll never meets an empty cell.
		const ahead = new IntersectionObserver(
			(records) => {
				if (!records[records.length - 1].isIntersecting) return;
				ahead.disconnect();
				void whenEngine().then((engine) => prefetchLab(!!engine));
			},
			{ rootMargin: '200% 0px' }
		);
		ahead.observe(section!);

		// Phones: one column, and only the cell under the viewport's centre line runs.
		const single = window.matchMedia('(max-width: 639px)');
		const syncSingle = () => (lab.single = single.matches || device.mobile);
		syncSingle();
		single.addEventListener('change', syncSingle);

		const centre = new IntersectionObserver(
			(records) => {
				for (const r of records) {
					if (!r.isIntersecting) continue;
					const id = (r.target as HTMLElement).dataset.labCell as LabId | undefined;
					if (id) lab.centre = id;
				}
			},
			{ rootMargin: '-50% 0px -50% 0px', threshold: 0 }
		);
		const cells = grid!.querySelectorAll<HTMLElement>('[data-lab-cell]');
		for (const c of cells) centre.observe(c);
		// Before the first crossing, the first cell on screen counts as the centre one.
		lab.centre ??= cells[0]?.dataset.labCell as LabId;

		// The reveal: once, when the grid comes in; none under reduced motion.
		const off = mm(({ reduced }) => {
			if (reduced) {
				lab.revealAt = -1;
				return;
			}
			if (lab.revealAt !== 0) return;
			const st = ScrollTrigger.create({
				trigger: grid!,
				start: 'top 82%',
				once: true,
				onEnter: () => {
					if (lab.revealAt === 0) lab.revealAt = performance.now();
				}
			});
			return () => st.kill();
		});

		return () => {
			off();
			ahead.disconnect();
			centre.disconnect();
			single.removeEventListener('change', syncSingle);
			resetLab();
		};
	});
</script>

<section
	id="lab"
	data-section="lab"
	data-theme="viewport"
	use:themeSection={'viewport'}
	use:hudLine={{ section: t().lab.index, label: t().lab.hud }}
	class="section lab"
	bind:this={section}
>
	<div class="wrap">
		<header class="head">
			<p class="index hud-text graphite">{t().lab.index}</p>
			<h2 class="t-display title" use:reveal={{ mode: 'lines', widthMarch: true }} use:collider={{ pad: 12 }}>
				{h.pre}<em class="serif">{h.em}</em>{h.post}
			</h2>
			<p class="sub hud-text graphite" use:reveal={{ mode: 'fade', delay: 0.2 }}>{sub}</p>
		</header>

		<p class="visually-hidden">{t().lab.canvas}</p>

		<div
			class="cells"
			bind:this={grid}
			use:formation={{ id: 'lab-gutters', source: LAB_GUTTERS, preset: 'march' }}
		>
			{#each entries as entry, i (entry.id)}
				<LabCell {entry} index={i} />
			{/each}
		</div>

		<ol class="specs" role="list" use:collider={{ pad: 8 }}>
			<li class="spec legend micro graphite" aria-hidden="true">
				<span class="n">#</span>
				<span class="t"></span>
				<span class="e">{t().lab.spec.original}</span>
				<span class="g">{t().lab.spec.tags}</span>
				<span class="m">{t().lab.spec.metric}</span>
			</li>
			{#each entries as e, i (e.id)}
				<li
					class="spec"
					class:on={activeCell() === e.id}
					id="lab-spec-{e.id}"
					onpointerenter={(ev) => ev.pointerType === 'mouse' && specEnter(e.id)}
					onpointerleave={() => specLeave(e.id)}
				>
					<span class="n mono">{pad(i)}</span>
					<h3 class="t">{e.title}</h3>
					<span class="e micro"><span class="visually-hidden">{t().lab.spec.original}: </span>{e.engine}</span>
					<span class="g micro graphite">
						<span class="visually-hidden">{t().lab.spec.tags}: </span>{e.tags.join(' · ')}
					</span>
					<span class="m hud-text"><span class="visually-hidden">{t().lab.spec.metric}: </span>{loc(e.metric)}</span>
					<p class="b">{loc(e.body)} <span class="rec micro graphite">{t().lab.recreation}</span></p>
				</li>
			{/each}
		</ol>
	</div>
</section>

<style>
	.lab {
		--lab-gap: clamp(20px, 2.8vw, 48px);
	}

	.head {
		display: grid;
		justify-items: start;
		gap: var(--s-2);
		margin-bottom: calc(var(--lab-gap) * 2.5);
	}

	/* Two lines in English at desktop widths ("Things that shouldn't / run this fast."). */
	.title {
		max-width: 18ch;
	}

	.sub {
		margin-top: var(--s-1);
	}

	/* ── the grid: 3 × 2 desktop, 2 columns tablet, one column phone ─────────────────── */
	.cells {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lab-gap);
		margin-bottom: calc(var(--lab-gap) * 2.5);
	}

	@media (max-width: 1023px) {
		.cells {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 639px) {
		.cells {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* ── spec list: one line per cell (title, original, tags, metric) + the cell's note ── */
	.specs {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.spec {
		display: grid;
		grid-template-columns: 3ch minmax(0, 3fr) minmax(0, 2fr) minmax(0, 4fr) minmax(0, 3fr);
		grid-template-areas:
			'n t e g m'
			'. b b b .';
		column-gap: var(--gutter);
		row-gap: 6px;
		align-items: baseline;
		padding: 14px 0 16px;
		border-top: 1px solid color-mix(in srgb, var(--ink) 13%, transparent);
		transition: color var(--t-fast) var(--ease-steer);
	}

	.spec.legend {
		grid-template-areas: 'n t e g m';
		padding: 0 0 10px;
		border-top: 0;
	}

	.n {
		grid-area: n;
		color: var(--graphite);
		font-size: var(--fs-hud);
		transition: color var(--t-micro) steps(2);
	}

	.spec.on .n {
		color: var(--signal-text);
	}

	.t {
		grid-area: t;
		font-size: var(--fs-h3);
		line-height: 1.1;
		--wdth: 88;
		transition: --wdth var(--t-base) var(--ease-steer);
	}

	.spec.on .t {
		--wdth: 100;
	}

	.e {
		grid-area: e;
		color: var(--ink);
	}

	.g {
		grid-area: g;
	}

	.m {
		grid-area: m;
		justify-self: end;
		text-align: right;
		color: var(--ink);
		/* Content is already in caps; a transform would turn the wavelength λ into Λ. */
		text-transform: none;
	}

	.b {
		grid-area: b;
		max-width: 68ch;
		color: var(--graphite);
		font-size: clamp(0.9375rem, 0.9rem + 0.12vw, 1.0625rem);
		line-height: 1.5;
	}

	.rec {
		margin-left: 0.6em;
		white-space: nowrap;
	}

	@media (max-width: 1023px) {
		.spec {
			grid-template-columns: 3ch minmax(0, 1fr) auto;
			grid-template-areas:
				'n t m'
				'. e e'
				'. g g'
				'. b b';
		}
		.spec.legend {
			display: none;
		}
	}

	@media (max-width: 639px) {
		.head {
			margin-bottom: calc(var(--lab-gap) * 2);
		}
		.spec {
			grid-template-columns: 3ch minmax(0, 1fr);
			grid-template-areas:
				'n t'
				'. m'
				'. e'
				'. g'
				'. b';
		}
		.m {
			justify-self: start;
			text-align: left;
		}
	}
</style>
