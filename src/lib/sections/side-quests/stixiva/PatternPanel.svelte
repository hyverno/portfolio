<!--
	The pattern panel (DESIGN.md §5 04b): the Canvas2D cross-stitch chart scanned in sync with the
	stage (symbols left of the scanline, the faded source image right of it), the thread legend with
	live stitch counts, and the DITHER toggle. The app UI is French in both languages.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import { formatNum } from '#lib/i18n/format';
	import { THREADS, luminance } from './palette.ts';
	import type { Mapping } from './quantize.ts';
	import { scanGX, stitchedCols, type Pattern } from './formations';
	import { chartGeometry, offscreen, renderChart, sizeCanvas, type ChartGeometry } from './chart';
	import SymbolIcon from './SymbolIcon.svelte';

	interface Props {
		pattern: Pattern;
		mapping: Mapping;
		/** Scan progress 0..1. */
		scan: number;
		/** Thread to emphasise (-1 = none). */
		highlight: number;
		dither: boolean;
		/** Fit the chart into the panel's height too (pinned desktop layout). */
		fit: boolean;
		ondither: () => void;
		onhighlight: (thread: number) => void;
	}

	let { pattern, mapping, scan, highlight, dither, fit, ondither, onhighlight }: Props = $props();

	const COLORS = {
		paper: '#F3EFE6',
		ink: '#1B1B1B',
		grid: 'rgb(27 27 27 / 0.13)',
		bold: 'rgb(27 27 27 / 0.62)'
	};

	let wrap = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let band = $state<HTMLDivElement>();
	let box = $state({ w: 0, h: 0 });
	let geo = $state<ChartGeometry | null>(null);
	let printing = $state(false);

	let layerChart: HTMLCanvasElement | OffscreenCanvas | null = null;
	let layerSource: HTMLCanvasElement | OffscreenCanvas | null = null;
	let dpr = 1;

	const done = $derived(stitchedCols(pattern, scan));
	const counts = $derived(mapping.used.map((i) => mapping.cum[done * THREADS.length + i]));

	function layers(g: ChartGeometry) {
		dpr = Math.min(2, window.devicePixelRatio || 1);
		layerChart ??= offscreen(1, 1);
		layerSource ??= offscreen(1, 1);
		const a = sizeCanvas(layerChart, g, dpr);
		const b = sizeCanvas(layerSource, g, dpr);
		if (a) renderChart(a, pattern, mapping, g, { mode: 'colour', highlight, colors: COLORS });
		if (b) renderChart(b, pattern, mapping, g, { mode: 'source', colors: COLORS });
	}

	function composite(g: ChartGeometry, s: number) {
		if (!canvas || !layerChart || !layerSource) return;
		const ctx = sizeCanvas(canvas, g, dpr) as CanvasRenderingContext2D | null;
		if (!ctx) return;
		ctx.clearRect(0, 0, g.w, g.h);
		ctx.drawImage(layerSource, 0, 0, g.w, g.h);
		const x = g.ox + scanGX(pattern, s) * g.cell;
		if (x > 0) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, Math.min(g.w, x), g.h);
			ctx.clip();
			ctx.drawImage(layerChart, 0, 0, g.w, g.h);
			ctx.restore();
		}
		if (s > 0 && s < 1) {
			ctx.fillStyle = '#B7332C';
			ctx.fillRect(Math.round(x) - 0.75, g.oy - 5, 1.5, pattern.rows * g.cell + 10);
		}
	}

	// Geometry follows the box; layers follow the data; the composite follows the scan.
	$effect(() => {
		const { w, h } = box;
		if (!w) return;
		geo = chartGeometry(pattern.cols, pattern.rows, w, fit && h > 40 ? h : Infinity);
	});

	$effect(() => {
		const g = geo;
		void mapping;
		void highlight;
		void pattern;
		if (g) layers(g);
	});

	$effect(() => {
		const g = geo;
		void mapping;
		void highlight;
		if (g) composite(g, scan);
	});

	onMount(() => {
		let raf = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				if (!wrap) return;
				const next = { w: wrap.clientWidth, h: wrap.clientHeight };
				// Without fit the height follows the canvas: only the width matters then.
				if (next.w !== box.w || (fit && next.h !== box.h)) box = next;
			});
		});
		if (wrap) ro.observe(wrap);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});

	/** Stepped "print" pass over the chart (steps(12), 600ms). Resolves when the head is done. */
	export function print(): Promise<void> {
		if (!band || !geo || device.reducedMotion) return Promise.resolve();
		printing = true;
		const travel = geo.h;
		return new Promise((resolve) => {
			gsap.fromTo(
				band!,
				{ y: -travel / 12 },
				{
					y: travel,
					duration: 0.6,
					ease: 'steps(12)',
					onComplete: () => {
						printing = false;
						resolve();
					}
				}
			);
		});
	}
</script>

<div class="panel">
	<div class="head micro">
		<span class="title">{t().stixiva.toolbar[2]} · {pattern.cols} × {pattern.rows}</span>
		<button
			type="button"
			class="toggle micro"
			aria-pressed={dither}
			onclick={ondither}
		>
			<span class="led" aria-hidden="true"></span>
			{dither ? t().stixiva.dither.on : t().stixiva.dither.off}
		</button>
	</div>

	<div class="chart" bind:this={wrap} class:fit>
		<canvas
			bind:this={canvas}
			aria-hidden="true"
			style:width={geo ? `${geo.w}px` : '100%'}
			style:height={geo ? `${geo.h}px` : 'auto'}
		></canvas>
		<div class="band" class:on={printing} bind:this={band} aria-hidden="true"></div>
	</div>
	<p class="visually-hidden">{t().stixiva.chartAria}</p>

	<div class="legend">
		<p class="micro legend-title">{t().stixiva.legend}</p>
		<ul role="list">
			{#each mapping.used as i, k (i)}
				{@const th = THREADS[i]}
				<li>
					<button
						type="button"
						class="chip micro"
						class:hot={highlight === i}
						class:dim={highlight >= 0 && highlight !== i}
						onpointerenter={() => onhighlight(i)}
						onpointerleave={() => onhighlight(-1)}
						onfocus={() => onhighlight(i)}
						onblur={() => onhighlight(-1)}
						aria-label={t().stixiva.cellTip(th.code, th.name, formatNum(mapping.counts[i], 'fr'))}
					>
						<span class="swatch" style:background={th.hex} style:color={luminance(th.rgb) > 0.32 ? '#1B1B1B' : '#FFFDF8'}>
							<SymbolIcon kind={th.symbol} size={8} />
						</span>
						<span class="code">{th.code}</span>
						<span class="name">{th.name}</span>
						<span class="count">×{formatNum(counts[k], 'fr')}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		min-height: 0;
		height: 100%;
		color: var(--stx-ink);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		color: var(--stx-graphite);
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 9px 4px;
		border: 1px solid var(--stx-ink);
		color: var(--stx-ink);
		background: transparent;
		transition:
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.toggle[aria-pressed='true'] {
		background: var(--stx-ink);
		color: var(--stx-paper);
	}

	.led {
		width: 6px;
		height: 6px;
		border: 1px solid currentColor;
	}

	.toggle[aria-pressed='true'] .led {
		background: var(--stx-signal-light);
		border-color: var(--stx-signal-light);
	}

	.chart {
		position: relative;
		min-height: 0;
		overflow: hidden;
	}

	.chart.fit {
		flex: 1 1 auto;
	}

	.chart canvas {
		display: block;
		max-width: 100%;
	}

	.band {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 8.33%;
		background:
			linear-gradient(var(--stx-signal) 0 0) 0 100% / 100% 1.5px no-repeat,
			repeating-linear-gradient(90deg, rgb(183 51 44 / 0.16) 0 2px, transparent 2px 4px);
		opacity: 0;
		pointer-events: none;
	}

	.band.on {
		opacity: 1;
	}

	.legend-title {
		color: var(--stx-graphite);
		margin-bottom: 6px;
	}

	.legend ul {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2px 14px;
		padding: 0;
		margin: 0;
	}

	.chip {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 7px;
		width: 100%;
		padding: 3px 0;
		text-align: left;
		color: var(--stx-ink);
		border-bottom: 1px solid var(--stx-hairline);
		transition: opacity var(--t-micro) linear;
	}

	.chip.dim {
		opacity: 0.38;
	}

	.chip.hot .name {
		color: var(--stx-signal-text);
	}

	.swatch {
		display: grid;
		place-items: center;
		width: 14px;
		height: 14px;
	}

	.code {
		color: var(--stx-graphite);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		font-variant-numeric: tabular-nums;
		min-width: 5ch;
		text-align: right;
	}
</style>
