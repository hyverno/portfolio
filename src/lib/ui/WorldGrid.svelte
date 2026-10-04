<!--
	World grid (§2.3): 7px "+" marks in --hairline at every 64px intersection, panned by
	-(scroll.y % 64) so the page reads as a world the camera moves over. The marks are a mask over
	a --hairline fill, so they follow theme tweens with no repaint of an image.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { scroll } from '#lib/core/scroll.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';

	const CELL = 64;
	let layer: HTMLDivElement;

	onMount(() => {
		let last = Number.NaN;
		return onFrame(() => {
			const off = scroll.y % CELL;
			if (off === last) return;
			last = off;
			layer.style.transform = `translate3d(0, ${-off}px, 0)`;
		}, PRIORITY.ui);
	});
</script>

<div class="world" aria-hidden="true">
	<div class="marks" bind:this={layer}></div>
</div>

<style>
	.world {
		position: fixed;
		inset: 0;
		z-index: var(--z-world);
		overflow: hidden;
		pointer-events: none;
	}

	.marks {
		position: absolute;
		inset: 0 0 auto 0;
		height: calc(100% + 64px);
		background: var(--hairline);
		/* One 64px tile with a 7px plus at its centre, shifted half a cell onto the intersections. */
		--plus: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cpath d='M29 32h7v1h-7zM32 29h1v7h-1z'/%3E%3C/svg%3E");
		-webkit-mask: var(--plus) -32px -32px / 64px 64px repeat;
		mask: var(--plus) -32px -32px / 64px 64px repeat;
		will-change: transform;
	}
</style>
