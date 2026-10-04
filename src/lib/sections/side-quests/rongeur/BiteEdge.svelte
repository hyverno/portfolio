<!--
	A bitten edge of Le Rongeur's cream (DESIGN.md §5 04c): an SVG band whose straight edge carries
	5–7 seeded semicircular bites. `top`: cream below the line (the section rising over Stixiva);
	`bottom`: cream above it, bitten away to reveal the page below. `chomp` (0..1) grows the bites
	in one after another with the `spawn` overshoot. `behind` renders under the cream (Pépite
	peeking out of the largest bite).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { gsap, registerMotion } from '#lib/core/motion';
	import { edgeBites, edgeOutline, edgePath, largest, stream, type EdgeBite } from './bites';

	interface Props {
		side: 'top' | 'bottom';
		seed: number;
		salt: number;
		/** Band height, px. */
		height?: number;
		/** Distance of the straight edge from the band's cream-free side, px. */
		inset?: number;
		maxR?: number;
		/** 0 = no bites yet, 1 = all bites taken. */
		chomp?: number;
		outline?: boolean;
		behind?: Snippet<[EdgeBite]>;
	}

	let {
		side,
		seed,
		salt,
		height = 150,
		inset = 54,
		maxR = 84,
		chomp = 1,
		outline = true,
		behind
	}: Props = $props();

	let w = $state(1440);

	const bites = $derived(edgeBites(stream(seed, salt), Math.max(320, w), Math.min(maxR, height - inset - 6)));
	const host = $derived(largest(bites));
	const line = $derived(side === 'top' ? inset : height - inset);

	let spawnEase: ((t: number) => number) | null = null;
	function ease(t: number): number {
		if (typeof window === 'undefined') return t;
		if (!spawnEase) {
			registerMotion();
			spawnEase = gsap.parseEase('spawn') ?? ((x: number) => x);
		}
		return spawnEase(t);
	}

	/** Per-bite scale: bites land left → right in sequence. */
	function scale(i: number): number {
		if (chomp >= 1) return 1;
		if (chomp <= 0) return 0;
		const n = Math.max(1, bites.length);
		const t = (chomp * (n + 2) - i) / 3;
		return t <= 0 ? 0 : t >= 1 ? 1 : ease(t);
	}

	const d = $derived.by(() => {
		void chomp;
		return edgePath(w, height, line, bites, side, scale);
	});
	const stroke = $derived.by(() => {
		void chomp;
		return edgeOutline(w, line, bites, side, scale);
	});
</script>

<div class="edge {side}" bind:clientWidth={w} style:height="{height}px" aria-hidden="true">
	{#if behind && host}
		<div class="behind">{@render behind(host)}</div>
	{/if}
	<svg viewBox="0 0 {w} {height}" preserveAspectRatio="none">
		<path {d} fill="var(--r-cream)" />
		{#if outline}
			<path d={stroke} fill="none" stroke="var(--r-brown)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
		{/if}
	</svg>
</div>

<style>
	.edge {
		position: relative;
		width: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.behind {
		position: absolute;
		inset: 0;
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
</style>
