<!--
	04b · Stixiva (DESIGN.md §5, theme `aida`). The crowd is the embroidery: 3,456 entities hold a
	72×48 grid (48×32 on phones), the rest line the hem or stack onto the cells. Desktop pins the
	frame for +=150% and scrubs a scanline across the stage: left of it, cross-stitches in thread
	colours; right of it, dots in source colours. The Canvas2D chart and the legend counts scan in
	sync. Mobile / coarse / reduced: no pin, the scan plays once over 2.4s on enter.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudLine, reveal, themeSection } from '#lib/core/actions';
	import { registerCollider } from '#lib/core/colliders';
	import { ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { scroll } from '#lib/core/scroll.svelte';
	import { device } from '#lib/core/device.svelte';
	import { formation } from '#lib/gl/actions';
	import { whenEngine } from '#lib/gl/handle';
	import type { Crowd, CrowdParams } from '#lib/gl/types';
	import { fmtNum, i18n, loc, t } from '#lib/i18n/index.svelte';
	import { formatNum } from '#lib/i18n/format';
	import { sideProjects, stackOf } from '#lib/content/content';
	import { unlock } from '#lib/stores/achievements.svelte';
	import { sfx } from '#lib/ui/sfx';
	import { THREADS } from './palette.ts';
	import {
		STIX_GRID,
		STIX_ID,
		WIDE,
		cellAt,
		getPattern,
		gridDims,
		gridLayout,
		gridX,
		paintArrays,
		scanGX,
		stitchedCols,
		stixState,
		type Dims,
		type Layout
	} from './formations';
	import PatternPanel from './PatternPanel.svelte';
	import PdfSheet from './PdfSheet.svelte';
	import Toolbar from './Toolbar.svelte';
	import { portal } from './portal';

	/** Engine extras the public contract does not list (read defensively). */
	type CrowdX = Crowd & {
		params?: CrowdParams;
		blendState?: { from: string; to: string; mix: number };
		onBake?(fn: (id: string, ms: number) => void): () => void;
	};

	const OWNER = 'stixiva';
	/** Share of the pin spent scanning; the last 20% holds the finished pattern. */
	const SCAN_END = 0.8;
	const STITCHES = { en: 'STITCHES', fr: 'POINTS' };

	const project = sideProjects.find((p) => p.slug === 'stixiva')!;

	let section = $state<HTMLElement>();
	let frameEl = $state<HTMLDivElement>();
	let stageEl = $state<HTMLDivElement>();
	let headEl = $state<HTMLDivElement>();
	let panel = $state<ReturnType<typeof PatternPanel>>();
	let srcCanvas = $state<HTMLCanvasElement>();
	let thrCanvas = $state<HTMLCanvasElement>();

	let dims = $state<Dims>(WIDE);
	let stageSize = $state({ w: 0, h: 0 });
	let scan = $state(0);
	let dither = $state(false);
	let highlight = $state(-1);
	let pinned = $state(false);
	let pdfOpen = $state(false);
	let busy = $state(false);
	let tip = $state<{ x: number; y: number; text: string; cell: { col: number; row: number } } | null>(null);

	const pattern = $derived(getPattern(dims));
	const mapping = $derived(dither ? pattern.dithered : pattern.plain);
	const layout = $derived<Layout | null>(stageSize.w ? gridLayout(stageSize.w, stageSize.h, dims) : null);
	const total = $derived(dims.cols * dims.rows);
	const stitched = $derived(
		mapping.used.reduce((n, i) => n + mapping.cum[stitchedCols(dims, scan) * THREADS.length + i], 0)
	);
	const scanPct = $derived(Math.round(scan * 100));
	const sectionNo = $derived(t().stixiva.index.split(' / ')[0]);
	const hudText = $derived(`${fmtNum(stitched)} / ${fmtNum(total)} ${loc(STITCHES)}`);
	/** The app readout is French in every language. */
	const readout = $derived(
		`BALAYAGE ${scanPct} % · ${formatNum(stitched, 'fr')} / ${formatNum(total, 'fr')} POINTS`
	);
	/** Scanline x inside the stage (px), for the needle overlay and the static fallback. */
	const lineX = $derived(layout ? gridX(layout, scanGX(dims, scan)) : 0);

	// ── crowd state (not reactive: written by the frame controller) ───────────────────────────
	let crowd: CrowdX | null = null;
	let claimed = false;
	let pinActive = false;
	let near = false;
	let stageLeft = 0;
	let scanOn = false;
	let pushed = { stitched: false, dither: false, cols: 0 };
	let lastBold = -1;
	/** Where the scroll is relative to the pin (desktop). Only 'in' drives the scan. */
	let pinSide: 'before' | 'in' | 'after' = 'before';
	/**
	 * Seconds the scan has actually been watched: the pin active (desktop) or the section on screen
	 * with the scan under way (unpinned). A jump across the pin never accumulates any, so it never
	 * unlocks the achievement. Resets once the section is off screen.
	 */
	let viewTime = 0;
	let unlocked = false;
	const VIEWED_S = 0.5;
	/** Unpinned layouts: the scan waits for the grid to land, then plays once over 2.4s. */
	let armed: 'linear' | 'steps' | null = null;
	let armedAt = 0;
	let playing: gsap.core.Tween | null = null;

	function play(ease: 'linear' | 'steps') {
		armed = null;
		const s = { v: scan };
		playing = gsap.to(s, {
			v: 1,
			duration: 2.4 * (1 - scan),
			ease: ease === 'steps' ? 'steps(12)' : 'none',
			onUpdate: () => setScan(s.v),
			onComplete: () => void (playing = null)
		});
	}

	type Tunable = 'size' | 'mouseR' | 'scrollCarry' | 'glyphAlt';
	/** Values of the crowd params this section overrides, as they were before it took over. */
	const original: Partial<Record<Tunable, number | string>> = {};

	function override(c: CrowdX, key: Tunable, value: number | string) {
		const p = c.params;
		if (!p) return;
		if (!(key in original)) original[key] = p[key];
		if (p[key] !== value) c.set({ [key]: value } as Partial<CrowdParams>);
	}

	function restore(c: CrowdX, key: Tunable) {
		if (!(key in original)) return;
		c.set({ [key]: original[key] } as Partial<CrowdParams>);
		delete original[key];
	}

	function involvement(b: { from: string; to: string; mix: number }): number {
		const a = b.from === STIX_ID;
		const z = b.to === STIX_ID;
		if (a && z) return 1;
		if (z) return b.mix;
		if (a) return 1 - b.mix;
		return 0;
	}

	/** Paint + glyph for the current state (source dots vs finished stitches, dither). */
	function pushPaint() {
		if (!crowd || !stageEl) return;
		stixState.dither = dither;
		const { paint, paintAlt } = paintArrays(crowd.N, dims);
		crowd.setPaint(STIX_ID, paint, paintAlt);
		const glyph = stixState.stitched ? 'xstitch' : 'dot';
		void crowd.define(STIX_ID, STIX_GRID, { el: stageEl, space: 'page' }, { glyph });
		// The live glyph only while the grid leads the blend on screen; any other dominant formation
		// sets its own glyph when it takes over, so nothing is left behind.
		const b = crowd.blendState;
		if (near && b && (b.mix >= 0.5 ? b.to : b.from) === STIX_ID) crowd.set({ glyph });
		pushed = { stitched: stixState.stitched, dither, cols: dims.cols };
	}

	function claim() {
		if (!crowd || claimed) return;
		claimed = true;
		crowd.claim(OWNER);
		const b = crowd.blendState;
		crowd.blend(b ? (b.to === STIX_ID ? b.from : b.to) : STIX_ID, STIX_ID, 1, { owner: OWNER });
	}

	function release() {
		if (!crowd || !claimed) return;
		claimed = false;
		crowd.release(OWNER);
	}

	function frame(time: number, dt: number) {
		const c = crowd;
		const p = c?.params;

		if (!near) viewTime = 0;
		else if (pinned ? pinActive : scan > 0) viewTime += dt;
		if (!unlocked && scan >= 1 && near && viewTime >= VIEWED_S) {
			unlocked = true;
			unlock('cross-stitch');
		}
		// Safety net: never keep the crowd once the pin is not active (a missed toggle on a jump).
		if (claimed && !pinActive) release();
		// Static build: nothing to wait for, as long as the section is on screen.
		if (armed && !c && device.webgl === 'none' && near) play(armed);
		if (!c || !p) return;
		const b = c.blendState ?? { from: '', to: '', mix: 0 };
		// While the finished grid leads the blend: stitches only where they are held. Bodies leaving
		// for (or coming back from) the next formation travel as the house darts, never as a rain of
		// crosses over the next section's copy. (Runs off screen too: the next anchor starts the
		// departure once Stixiva has scrolled away.)
		if (stixState.stitched && (b.mix >= 0.5 ? b.to : b.from) === STIX_ID) {
			const moving = b.from === STIX_ID && b.to !== STIX_ID && b.mix > 0.02;
			const want = moving ? 'dart' : 'xstitch';
			if (p.glyph !== want) c.set({ glyph: want });
		}
		if (!near && !scanOn && Object.keys(original).length === 0) return;
		// While we own the crowd it holds the grid, whatever a neighbour's scrub tail wrote meanwhile.
		if (claimed && c.owner === OWNER && (b.to !== STIX_ID || b.mix < 1)) {
			c.blend(b.to === STIX_ID ? b.from : b.to, STIX_ID, 1, { owner: OWNER });
		}
		const w = near ? involvement(c.blendState ?? b) : 0;
		if (armed) {
			// Give the bodies a beat to settle after the formation has fully taken over.
			if (armedAt < 0 || w < 0.999) armedAt = time;
			else if (time - armedAt > 0.45) play(armed);
		}

		// Bigger glyphs while the grid holds, so a cross-stitch fills its cell; a gentle cursor.
		if (w > 0.001 && layout) {
			const k = Math.min(1, Math.max(0, (w - 0.35) / 0.65));
			const e = k * k * (3 - 2 * k);
			const size0 = (original.size as number | undefined) ?? p.size;
			const r0 = (original.mouseR as number | undefined) ?? p.mouseR;
			const stitch = Math.min(16, Math.max(6, layout.pitch * 1.06));
			const size = size0 + (stitch - size0) * e;
			const mouseR = r0 + (0.07 - r0) * e;
			if (Math.abs(size - p.size) > 0.01 || !('size' in original)) override(c, 'size', size);
			if (Math.abs(mouseR - p.mouseR) > 0.001 || !('mouseR' in original)) override(c, 'mouseR', mouseR);
		} else {
			restore(c, 'size');
			restore(c, 'mouseR');
		}

		// Pinned: the targets stand still, so the bodies must not ride the scroll either.
		if (pinActive && w > 0.5) override(c, 'scrollCarry', 0);
		else restore(c, 'scrollCarry');

		// Finished pattern: paint the threads and make the cross-stitch the formation's own glyph.
		const done = scan >= 1;
		if (done !== stixState.stitched || pushed.dither !== dither || pushed.cols !== dims.cols) {
			stixState.stitched = done;
			pushPaint();
		}

		// The scanline (viewport px): left of it, paintAlt + `xstitch`.
		if (w > 0.5 && scan > 0 && scan < 1 && layout && (!pinned || pinActive)) {
			scanOn = true;
			override(c, 'glyphAlt', 'xstitch');
			c.setScan({ angleDeg: 0, offsetPx: stageLeft + gridX(layout, scanGX(dims, scan)) });
		} else if (scanOn) {
			scanOn = false;
			c.setScan(null);
			restore(c, 'glyphAlt');
		}
	}

	function setScan(v: number) {
		const s = Math.min(1, Math.max(0, v));
		if (s === scan) return;
		scan = s;
		// A soft tick on every bold (10-cell) line the needle crosses.
		const bold = Math.floor(scanGX(dims, s) / 10);
		if (bold !== lastBold) {
			if (lastBold >= 0 && bold > lastBold && bold * 10 <= dims.cols) sfx('stitch');
			lastBold = bold;
		}
	}

	function measure() {
		if (!stageEl) return;
		const r = stageEl.getBoundingClientRect();
		stageLeft = r.left;
		stageSize = { w: r.width, h: r.height };
		const d = gridDims(r.width);
		if (d.cols !== dims.cols) dims = d;
	}

	// ── tooltip (cursor → cell from a cached rect) ─────────────────────────────────────────────
	let rect: DOMRect | null = null;
	let rectY = 0;
	let tipTimer = 0;

	function cellFromPoint(x: number, y: number) {
		if (!stageEl || !layout) return null;
		if (!rect || (rectY !== scroll.y && !pinActive)) {
			rect = stageEl.getBoundingClientRect();
			rectY = scroll.y;
		}
		return cellAt(layout, x - rect.left, y - rect.top);
	}

	function showTip(x: number, y: number) {
		const cell = cellFromPoint(x, y);
		if (!cell) return hideTip();
		const th = THREADS[mapping.thread[cell.row * dims.cols + cell.col]];
		tip = { x, y, cell, text: t().stixiva.cellTip(th.code, th.name, formatNum(mapping.counts[th.index], 'fr')) };
		highlight = th.index;
	}

	function hideTip() {
		tip = null;
		highlight = -1;
	}

	function onStageMove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		showTip(e.clientX, e.clientY);
	}

	function onStageUp(e: PointerEvent) {
		if (e.pointerType !== 'touch') return;
		rect = null;
		showTip(e.clientX, e.clientY);
		clearTimeout(tipTimer);
		tipTimer = window.setTimeout(hideTip, 2200);
	}

	// ── actions ────────────────────────────────────────────────────────────────────────────────
	function toggleDither() {
		dither = !dither;
		sfx('tick');
	}

	async function exportPdf() {
		if (pdfOpen || busy) return;
		busy = true;
		sfx('tick');
		await panel?.print();
		busy = false;
		pdfOpen = true;
	}

	// ── static fallback (no WebGL): the pattern as CSS cross-stitches over canvases ─────────────
	$effect(() => {
		const p = pattern;
		const m = mapping;
		if (!srcCanvas || !thrCanvas) return;
		for (const [cv, fill] of [
			[srcCanvas, (i: number) => [p.source[i * 4], p.source[i * 4 + 1], p.source[i * 4 + 2]]],
			[thrCanvas, (i: number) => THREADS[m.thread[i]].rgb]
		] as const) {
			cv.width = p.cols;
			cv.height = p.rows;
			const ctx = cv.getContext('2d');
			if (!ctx) continue;
			const img = ctx.createImageData(p.cols, p.rows);
			for (let i = 0; i < p.cols * p.rows; i++) {
				const [r, g, b] = fill(i);
				img.data.set([r, g, b, 255], i * 4);
			}
			ctx.putImageData(img, 0, 0);
		}
	});

	onMount(() => {
		let alive = true;
		const offs: (() => void)[] = [];

		measure();
		// Measure on the next frame: the stage's aspect follows its grid size, so a synchronous
		// re-measure inside the observer would resize it again within the same delivery.
		let raf = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				measure();
				rect = null;
			});
		});
		if (stageEl) ro.observe(stageEl);
		offs.push(() => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		});
		const onRefresh = () => {
			measure();
			rect = null;
		};
		ScrollTrigger.addEventListener('refresh', onRefresh);
		offs.push(() => ScrollTrigger.removeEventListener('refresh', onRefresh));

		// Pin + scrub on desktop; elsewhere the scan plays once on enter (2.4s).
		offs.push(
			mm(({ reduced, desktop, coarse }) => {
				if (desktop && !reduced && !coarse && frameEl) {
					frameEl.classList.add('pinned');
					pinned = true;
					const proxy = { p: Math.min(1, scan * SCAN_END) };
					const tween = gsap.to(proxy, {
						p: 1,
						ease: 'none',
						scrollTrigger: {
							trigger: frameEl,
							start: 'top top',
							end: '+=150%',
							pin: true,
							scrub: 1,
							anticipatePin: 1,
							refreshPriority: 20,
							onToggle: (self) => {
								pinActive = self.isActive;
								if (self.isActive) claim();
								else release();
							},
							// The scrub only writes while pinned; leaving snaps the scan to the side
							// left, so a scrub tail never drives the crowd off screen.
							onEnter: () => void (pinSide = 'in'),
							onEnterBack: () => void (pinSide = 'in'),
							onLeave: () => {
								pinSide = 'after';
								setScan(1);
							},
							onLeaveBack: () => {
								pinSide = 'before';
								setScan(0);
							},
							onRefresh: (self) => {
								pinSide = self.isActive ? 'in' : self.progress >= 1 ? 'after' : 'before';
								if (pinSide === 'after') setScan(1);
							}
						},
						onUpdate: () => {
							if (pinSide === 'in') setScan(proxy.p / SCAN_END);
						}
					});
					return () => {
						tween.scrollTrigger?.kill();
						tween.kill();
						pinActive = false;
						pinSide = 'before';
						release();
						frameEl?.classList.remove('pinned');
						pinned = false;
					};
				}

				// Colliders are only honest when nothing is pinned (rects are cached in page space).
				const offColliders = headEl ? [registerCollider(headEl, 8)] : [];
				// Entering arms the scan; the frame controller starts it once the grid has landed.
				const st = ScrollTrigger.create({
					trigger: stageEl,
					start: coarse || !desktop ? 'top 45%' : 'top 55%',
					onEnter: () => {
						if (scan >= 1 || playing) return;
						armed = reduced ? 'steps' : 'linear';
						armedAt = -1;
					}
				});
				return () => {
					st.kill();
					armed = null;
					playing?.kill();
					playing = null;
					for (const off of offColliders) off();
				};
			})
		);

		// The frame controller only works while the section is around the viewport.
		const zone = ScrollTrigger.create({
			trigger: section,
			start: 'top bottom',
			end: 'bottom top',
			onToggle: (self) => (near = self.isActive)
		});
		near = zone.isActive;
		offs.push(() => zone.kill());
		offs.push(onFrame(frame, PRIORITY.input));

		void whenEngine().then((engine) => {
			if (!alive || !engine) return;
			crowd = engine.crowd as CrowdX;
			const off = crowd.onBake?.((id) => id === STIX_ID && pushPaint());
			if (off) offs.push(off);
			if (pinActive) claim();
		});

		return () => {
			alive = false;
			for (const off of offs) off();
			clearTimeout(tipTimer);
			armed = null;
			playing?.kill();
			playing = null;
			release();
			if (crowd) {
				if (scanOn) crowd.setScan(null);
				for (const k of Object.keys(original) as Tunable[]) restore(crowd, k);
				// The finished grid's live glyph must not outlive the section (page change).
				if (crowd.params?.glyph === 'xstitch') crowd.set({ glyph: 'dart' });
			}
			scanOn = false;
		};
	});
</script>

<section
	id="stixiva"
	data-section="stixiva"
	data-theme="aida"
	class="stixiva"
	bind:this={section}
	use:themeSection={'aida'}
	use:hudLine={{ section: sectionNo, label: t().hud.context(sectionNo, t().stixiva.hud), line: hudText }}
>
	<div class="frame" bind:this={frameEl}>
		<div class="head wrap grid" bind:this={headEl}>
			<p class="index hud-text">{t().stixiva.index}</p>
			<div class="title">
				<h2 class="t-h1" use:reveal={{ mode: 'lines', widthMarch: true }}>{project.title}</h2>
				{#if loc(project.status)}
					<span class="chip micro">{loc(project.status)}</span>
				{/if}
			</div>
			<div class="intro">
				<p class="lede">{loc(project.line)}</p>
				<p class="stack micro">{stackOf(project, i18n.lang).join(' · ')}</p>
				<p class="pro micro">{t().stixiva.pro}</p>
				<p class="joke micro">{t().stixiva.joke}</p>
			</div>
		</div>

		<div class="app wrap">
			<div class="window">
				<Toolbar onexport={exportPdf} {busy} {readout} />
				<div class="work">
					<div
						class="stage"
						bind:this={stageEl}
						style:--ar={`${dims.cols + 9} / ${dims.rows + 9}`}
						data-no-ping
						aria-hidden="true"
						onpointermove={onStageMove}
						onpointerleave={hideTip}
						onpointerup={onStageUp}
						use:formation={{ id: STIX_ID, source: STIX_GRID, glyph: 'dot', start: 'top 95%', end: 'top 40%' }}
					>
						{#if layout}
							<div
								class="static static-only"
								style:left="{layout.ox}px"
								style:top="{layout.oy}px"
								style:width="{layout.cols * layout.pitch}px"
								style:height="{layout.rows * layout.pitch}px"
								style:--pitch="{layout.pitch}px"
							>
								<canvas class="src" bind:this={srcCanvas}></canvas>
								<canvas
									class="thr"
									bind:this={thrCanvas}
									style:clip-path="inset(0 {Math.max(0, layout.cols * layout.pitch - (lineX - layout.ox))}px 0 0)"
								></canvas>
								<span class="hem"></span>
							</div>
							{#if scan > 0 && scan < 1}
								<div class="needle" style:transform="translate3d({lineX}px, 0, 0)">
									<svg viewBox="0 0 14 30" width="14" height="30">
										<path d="M7 1 C9.2 1 9.5 4 9.5 6 L7.6 29 L6.4 29 L4.5 6 C4.5 4 4.8 1 7 1 Z" fill="var(--stx-ink)" />
										<ellipse cx="7" cy="6.2" rx="1.1" ry="2.6" fill="var(--stx-paper)" />
									</svg>
								</div>
							{/if}
							{#if tip}
								<span
									class="cellmark"
									style:transform="translate3d({layout.ox + tip.cell.col * layout.pitch}px, {layout.oy + tip.cell.row * layout.pitch}px, 0)"
									style:width="{layout.pitch}px"
									style:height="{layout.pitch}px"
								></span>
							{/if}
						{/if}
					</div>
					<p class="visually-hidden">{t().stixiva.canvas}</p>
					<p class="visually-hidden static-only">{t().fallback.stixiva}</p>

					<div class="side">
						<PatternPanel
							bind:this={panel}
							{pattern}
							{mapping}
							{scan}
							{highlight}
							{dither}
							fit={pinned}
							ondither={toggleDither}
							onhighlight={(i) => (highlight = i)}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="tail" aria-hidden="true"></div>
</section>

{#if tip}
	<div class="tip micro" use:portal style:transform="translate3d({tip.x + 14}px, {tip.y + 16}px, 0)" lang="fr">
		{tip.text}
	</div>
{/if}

<PdfSheet open={pdfOpen} {pattern} {mapping} onclose={() => (pdfOpen = false)} />

<style>
	.stixiva {
		--stx-paper: #f3efe6;
		--stx-ink: #1b1b1b;
		--stx-graphite: #5f5a50;
		--stx-hairline: #ddd6c6;
		--stx-signal: #b7332c;
		--stx-signal-text: #9e2a24;
		--stx-signal-light: #f07561;
		position: relative;
		color: var(--stx-ink);
		/* The Aida weave: one hole every 10px. */
		background:
			radial-gradient(circle, rgb(0 0 0 / 0.08) 1px, transparent 1.6px) 0 0 / 10px 10px,
			var(--stx-paper);
	}

	/* A running-stitch hem along the fabric's top edge. */
	.stixiva::before {
		content: '';
		position: absolute;
		left: var(--margin);
		right: var(--margin);
		top: 14px;
		height: 2px;
		background: repeating-linear-gradient(90deg, var(--stx-signal) 0 12px, transparent 12px 22px);
		opacity: 0.85;
	}

	.frame {
		display: flex;
		flex-direction: column;
		gap: clamp(16px, 2.6vh, 28px);
		padding-top: var(--section-pad);
	}

	.frame:global(.pinned) {
		height: 100vh;
		height: 100svh;
		padding-top: clamp(64px, 9vh, 96px);
		padding-bottom: clamp(76px, 11vh, 112px);
	}

	/* ── header ─────────────────────────────────────────────────────── */
	.head {
		row-gap: 8px;
		align-items: end;
	}

	.index {
		grid-column: 1 / -1;
		color: var(--stx-graphite);
	}

	.title {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.title h2 {
		line-height: 0.9;
	}

	.chip {
		padding: 5px 8px 4px;
		border: 1.5px solid var(--stx-signal);
		color: var(--stx-signal-text);
		white-space: nowrap;
		transform: translateY(-0.2em);
	}

	.intro {
		grid-column: 1 / -1;
		display: grid;
		gap: 6px;
	}

	.lede {
		font-size: var(--fs-lede);
		line-height: 1.3;
	}

	.stack {
		color: var(--stx-graphite);
	}

	.pro {
		color: var(--stx-signal-text);
	}

	/* ── the mock app ───────────────────────────────────────────────── */
	.app {
		display: flex;
		flex-direction: column;
	}

	.window {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1 1 auto;
	}

	.work {
		display: grid;
		gap: 20px;
		padding-top: 16px;
	}

	.stage {
		position: relative;
		width: 100%;
		aspect-ratio: var(--ar);
		cursor: crosshair;
		touch-action: pan-y;
	}

	.side {
		min-width: 0;
		min-height: 0;
	}

	.joke {
		color: var(--stx-graphite);
		text-transform: none;
		letter-spacing: 0.02em;
	}

	.needle {
		position: absolute;
		left: -7px;
		top: -34px;
		bottom: -6px;
		width: 14px;
		pointer-events: none;
		background: linear-gradient(var(--stx-signal) 0 0) 50% 32px / 1.5px calc(100% - 32px) no-repeat;
	}

	.needle svg {
		display: block;
	}

	.cellmark {
		--c: var(--stx-ink);
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		background:
			linear-gradient(var(--c) 0 0) 0 0 / 4px 1.5px no-repeat,
			linear-gradient(var(--c) 0 0) 0 0 / 1.5px 4px no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / 4px 1.5px no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / 1.5px 4px no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / 4px 1.5px no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / 1.5px 4px no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / 4px 1.5px no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / 1.5px 4px no-repeat;
		outline: 1px solid var(--stx-paper);
		outline-offset: -2.5px;
	}

	/* ── static build: the pattern as CSS cross-stitches (two diagonal gradients per cell) ── */
	.static {
		position: absolute;
		pointer-events: none;
	}

	.static canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		image-rendering: pixelated;
	}

	.static .src {
		mask: radial-gradient(circle, #000 0 22%, transparent 26%) 0 0 / var(--pitch) var(--pitch);
		-webkit-mask: radial-gradient(circle, #000 0 22%, transparent 26%) 0 0 / var(--pitch) var(--pitch);
	}

	.static .thr {
		mask:
			linear-gradient(45deg, transparent 38%, #000 38% 62%, transparent 62%) 0 0 / var(--pitch) var(--pitch),
			linear-gradient(-45deg, transparent 38%, #000 38% 62%, transparent 62%) 0 0 / var(--pitch) var(--pitch);
		-webkit-mask:
			linear-gradient(45deg, transparent 38%, #000 38% 62%, transparent 62%) 0 0 / var(--pitch) var(--pitch),
			linear-gradient(-45deg, transparent 38%, #000 38% 62%, transparent 62%) 0 0 / var(--pitch) var(--pitch);
	}

	.static .hem {
		position: absolute;
		inset: calc(var(--pitch) * -1.8);
		border: 2px dotted var(--stx-signal);
	}

	.tail {
		height: 150px;
	}

	.tip {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 45;
		padding: 6px 9px 5px;
		background: #fffdf8;
		color: #1b1b1b;
		border: 1px solid #1b1b1b;
		box-shadow: 3px 3px 0 0 #1b1b1b;
		white-space: nowrap;
		pointer-events: none;
	}

	/* ── desktop ────────────────────────────────────────────────────── */
	@media (min-width: 1024px) {
		.title {
			grid-column: 1 / 7;
		}

		.intro {
			grid-column: 8 / -1;
		}

		.work {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			column-gap: var(--gutter);
		}

		.stage {
			grid-column: 1 / 8;
		}

		.side {
			grid-column: 8 / -1;
		}

		.frame:global(.pinned) .app {
			flex: 1 1 auto;
			min-height: 0;
		}

		.frame:global(.pinned) .work {
			flex: 1 1 auto;
			min-height: 0;
		}

		.frame:global(.pinned) .stage {
			aspect-ratio: auto;
			height: 100%;
			min-height: 0;
		}

		.frame:global(.pinned) .intro {
			gap: 4px;
		}
	}

	@media (min-width: 640px) and (max-width: 1023px) {
		.title {
			grid-column: 1 / -1;
		}
	}
</style>
