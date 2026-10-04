<!--
	`[E] PDF EXPORT` preview (DESIGN.md §5 04b): an A4 DOM sheet (black-and-white chart, mono
	legend) that slides up rotating −4° → 0 (720ms steer), labelled APERÇU / PREVIEW. Esc, the
	close button or a click on the backdrop dismisses it. Portalled to <body> above the crowd.
-->
<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { DUR, EASE, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { startScroll, stopScroll } from '#lib/core/scroll.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import { formatNum, NBSP } from '#lib/i18n/format';
	import { THREADS } from './palette.ts';
	import type { Mapping } from './quantize.ts';
	import type { Pattern } from './formations';
	import { chartGeometry, renderChart, sizeCanvas } from './chart';
	import { portal } from './portal';
	import SymbolIcon from './SymbolIcon.svelte';

	interface Props {
		open: boolean;
		pattern: Pattern;
		mapping: Mapping;
		onclose: () => void;
	}

	let { open, pattern, mapping, onclose }: Props = $props();

	let root = $state<HTMLDivElement>();
	let sheet = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let closeBtn = $state<HTMLButtonElement>();
	let shown = $state(false);
	let returnFocus: HTMLElement | null = null;
	let tl: gsap.core.Timeline | null = null;

	/** Finished size on 14-count Aida, French notation. */
	const size = $derived(
		`${formatNum(Math.round((pattern.cols / 14) * 25.4) / 10, 'fr', 1)}${NBSP}×${NBSP}${formatNum(Math.round((pattern.rows / 14) * 25.4) / 10, 'fr', 1)}${NBSP}CM`
	);

	function drawChart() {
		if (!canvas) return;
		const w = canvas.parentElement?.clientWidth ?? 400;
		const g = chartGeometry(pattern.cols, pattern.rows, w, Infinity);
		const ctx = sizeCanvas(canvas, g, Math.min(2.5, (window.devicePixelRatio || 1) * 1.5));
		canvas.style.width = `${g.w}px`;
		canvas.style.height = `${g.h}px`;
		if (ctx)
			renderChart(ctx, pattern, mapping, g, {
				mode: 'print',
				colors: { paper: '#FFFDF8', ink: '#1B1B1B', grid: 'rgb(27 27 27 / 0.22)', bold: '#1B1B1B' }
			});
	}

	async function show() {
		returnFocus = document.activeElement as HTMLElement | null;
		shown = true;
		stopScroll();
		await tick();
		drawChart();
		closeBtn?.focus({ preventScroll: true });
		tl?.kill();
		if (device.reducedMotion) {
			tl = gsap.timeline().fromTo(root!, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' });
			return;
		}
		tl = gsap
			.timeline()
			.fromTo(root!, { autoAlpha: 0 }, { autoAlpha: 1, duration: DUR.fast, ease: 'none' }, 0)
			.fromTo(
				sheet!,
				{ yPercent: 70, y: 0, rotation: -4 },
				{ yPercent: 0, rotation: 0, duration: DUR.reveal, ease: EASE.steer },
				0
			);
	}

	function hide() {
		tl?.kill();
		const finish = () => {
			shown = false;
			startScroll();
			returnFocus?.focus?.({ preventScroll: true });
			returnFocus = null;
		};
		if (!root || device.reducedMotion) {
			if (root) gsap.to(root, { autoAlpha: 0, duration: 0.2, ease: 'none', onComplete: finish });
			else finish();
			return;
		}
		// Exits take 60% of the enter and use `despawn`.
		tl = gsap
			.timeline({ onComplete: finish })
			.to(sheet!, { yPercent: 60, rotation: 3, duration: DUR.reveal * 0.6, ease: EASE.despawn }, 0)
			.to(root, { autoAlpha: 0, duration: DUR.reveal * 0.6, ease: 'none' }, 0.1);
	}

	$effect(() => {
		if (open && !shown) void show();
		else if (!open && shown) hide();
	});

	$effect(() => {
		// Dither toggled while open: reprint.
		void mapping;
		if (shown) drawChart();
	});

	onDestroy(() => {
		// Torn down while open (navigation): give the page its scroll back.
		tl?.kill();
		if (shown) startScroll();
	});

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onclose();
		} else if (e.key === 'Tab') {
			// One control inside: keep focus on it.
			e.preventDefault();
			closeBtn?.focus();
		}
	}
</script>

{#if shown}
	<div
		class="overlay"
		bind:this={root}
		use:portal
		role="presentation"
		onclick={(e) => e.target === root && onclose()}
		{onkeydown}
	>
		<div
			class="sheet"
			bind:this={sheet}
			role="dialog"
			aria-modal="true"
			aria-labelledby="stx-pdf-title"
			data-no-ping
		>
			<header class="top">
				<p class="stamp micro">{t().stixiva.pdf.preview}</p>
				<button type="button" class="close micro" bind:this={closeBtn} onclick={onclose}>
					{t().stixiva.pdf.close} <span aria-hidden="true">✕</span>
				</button>
			</header>
			<div class="title">
				<h3 id="stx-pdf-title" lang="fr">Stixiva — grille de point de croix</h3>
				<p class="meta micro" lang="fr">
					{pattern.cols} × {pattern.rows} POINTS · AIDA 14 · {mapping.used.length} FILS · {size}
				</p>
			</div>
			<div class="chart"><canvas bind:this={canvas} aria-hidden="true"></canvas></div>
			<dl class="notes micro" lang="fr">
				<div><dt>TOILE</dt><dd>AIDA 14 · 5,5 POINTS/CM</dd></div>
				<div><dt>POINT</dt><dd>CROIX ENTIÈRE · 2 BRINS</dd></div>
				<div><dt>DÉPART</dt><dd>AU CENTRE (▲ ◀ ▶ ▼)</dd></div>
			</dl>
			<ul class="legend" role="list" lang="fr">
				{#each mapping.used as i (i)}
					{@const th = THREADS[i]}
					<li class="micro">
						<SymbolIcon kind={th.symbol} size={9} />
						<span>FIL {th.code}</span>
						<span class="name">{th.name}</span>
						<span class="n">×{formatNum(mapping.counts[i], 'fr')}</span>
					</li>
				{/each}
			</ul>
			<footer class="foot micro" lang="fr">
				<span>STIXIVA · BÊTA PUBLIQUE</span>
				<span>PAGE 1/1</span>
			</footer>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 45;
		display: grid;
		place-items: center;
		padding: 4vh 16px;
		background: rgb(27 27 27 / 0.42);
		visibility: hidden;
	}

	.sheet {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: min(88vh * 0.7071, 92vw);
		aspect-ratio: 210 / 297;
		padding: clamp(14px, 3.2%, 28px);
		background: #fffdf8;
		color: #1b1b1b;
		border: 1px solid #1b1b1b;
		box-shadow: 8px 8px 0 0 rgb(27 27 27 / 0.9);
		overflow: hidden;
		transform-origin: 50% 100%;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.stamp {
		padding: 4px 8px 3px;
		border: 1.5px solid #b7332c;
		color: #9e2a24;
		transform: rotate(-2deg);
	}

	.close {
		display: inline-flex;
		gap: 8px;
		align-items: center;
		padding: 6px 10px 5px;
		border: 1px solid #1b1b1b;
		color: #1b1b1b;
		background: #fffdf8;
	}

	.close:hover {
		background: #1b1b1b;
		color: #fffdf8;
	}

	.title h3 {
		--wdth: 88;
		font-size: clamp(1rem, 0.8rem + 1vw, 1.375rem);
		font-weight: 650;
		line-height: 1.1;
	}

	.meta {
		margin-top: 4px;
		color: #5f5a50;
	}

	.chart {
		flex: 0 1 auto;
		min-height: 0;
		display: grid;
		place-items: start center;
		overflow: hidden;
	}

	.notes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin: 0;
		padding: 10px 0;
		border-top: 1px dashed rgb(27 27 27 / 0.4);
	}

	.notes dt {
		color: #9e2a24;
		margin-bottom: 3px;
	}

	.notes dd {
		margin: 0;
		color: #1b1b1b;
	}

	.chart canvas {
		max-width: 100%;
	}

	.legend {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 3px 16px;
		padding: 10px 0 0;
		margin: 0;
		border-top: 1px solid #1b1b1b;
	}

	.legend li {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 7px;
	}

	.n {
		font-variant-numeric: tabular-nums;
	}

	.foot {
		display: flex;
		margin-top: auto;
		justify-content: space-between;
		color: #5f5a50;
		padding-top: 8px;
		border-top: 1px dashed rgb(27 27 27 / 0.4);
	}
</style>
