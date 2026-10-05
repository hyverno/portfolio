<script lang="ts">
	/*
		The static build's stand-in for a formation (html.no-webgl): the same pure builder the crowd
		bakes, run once on the CPU with fewer slots and drawn as an SVG halftone. 3D formations are
		seen straight down their z axis. Only shown under `.static-only`.
	*/
	import { onMount } from 'svelte';
	import type { FormationSource } from '#lib/gl/types';

	interface Props {
		source: FormationSource;
		/** Width / height of the stage. */
		aspect: number;
		/** Slots to draw (the crowd uses up to 16,384; a few thousand read as the same shape). */
		count?: number;
	}

	let { source, aspect, count = 3200 }: Props = $props();

	interface Dot {
		x: number;
		y: number;
		r: number;
		fill: string | null;
	}

	let el = $state<SVGSVGElement>();
	let dots = $state<Dot[]>([]);
	const W = 1000;
	const H = $derived(Math.round(W / aspect));

	/** Deterministic, so the still is the same on every visit. */
	function mulberry32(seed: number) {
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	onMount(() => {
		if (source.kind !== 'points' || !el) return;
		const w = W;
		const h = H;
		const r = source.build({ N: count, w, h, rand: mulberry32(1445), el: el as unknown as HTMLElement });
		const out: Dot[] = [];
		for (let i = 0; i < count; i++) {
			const weight = r.targets[i * 4 + 3];
			if (weight <= 0) continue; // free roamers have no place in a still
			const z = r.targets[i * 4 + 2];
			const a = r.paint?.[i * 4 + 3] ?? 0;
			out.push({
				// Region-normalised (y up) → SVG px, so the dots stay round at any aspect.
				x: ((r.targets[i * 4] + 1) / 2) * w,
				y: ((1 - r.targets[i * 4 + 1]) / 2) * h,
				// Nearer slots slightly larger, like the crowd's ±15% depth cue.
				r: 3.4 * (1 + z * 0.15),
				fill: a > 0 ? `rgb(${r.paint![i * 4]} ${r.paint![i * 4 + 1]} ${r.paint![i * 4 + 2]})` : null
			});
		}
		dots = out;
	});
</script>

<svg
	bind:this={el}
	class="static-formation"
	viewBox="0 0 {W} {H}"
	style="--aspect: {aspect}"
	aria-hidden="true"
>
	{#each dots as d, i (i)}
		<circle cx={d.x} cy={d.y} r={d.r} style:fill={d.fill ?? 'var(--ink)'} />
	{/each}
</svg>

<style>
	.static-formation {
		display: block;
		width: 100%;
		aspect-ratio: var(--aspect);
		overflow: visible;
	}
</style>
