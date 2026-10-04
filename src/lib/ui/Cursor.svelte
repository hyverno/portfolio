<!--
	Cursor (§3.5), z 50. The custom cursor only runs with (hover:hover) and (pointer:fine) and no
	reduced motion; it is fetched then (CursorLayer.svelte). Otherwise the native cursor stays.
	Always on: the RTS marquee drawn from A3's `hyv:marquee` events ({x, y, w, h, active}, viewport
	px) and the keyboard focus brackets (FocusRing).
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { device } from '#lib/core/device.svelte';
	import FocusRing from './FocusRing.svelte';

	interface Marquee {
		x: number;
		y: number;
		w: number;
		h: number;
		active: boolean;
	}

	let mounted = $state(false);
	const active = $derived(mounted && device.finePointer && !device.reducedMotion);
	let Layer = $state<Component>();
	let marquee = $state<Marquee | null>(null);

	$effect(() => {
		if (!active || Layer) return;
		import('./CursorLayer.svelte').then(
			(m) => void (Layer = m.default),
			() => {}
		);
	});

	onMount(() => {
		mounted = true;
		const onMarquee = (e: Event) => {
			const d = (e as CustomEvent<Marquee>).detail;
			if (!d || !d.active || Math.abs(d.w) < 1 || Math.abs(d.h) < 1) {
				marquee = null;
				return;
			}
			marquee = {
				x: Math.min(d.x, d.x + d.w),
				y: Math.min(d.y, d.y + d.h),
				w: Math.abs(d.w),
				h: Math.abs(d.h),
				active: true
			};
		};
		window.addEventListener('hyv:marquee', onMarquee);
		return () => window.removeEventListener('hyv:marquee', onMarquee);
	});
</script>

<FocusRing />

{#if marquee}
	<div
		class="marquee"
		aria-hidden="true"
		style:transform="translate({marquee.x}px, {marquee.y}px)"
		style:width="{marquee.w}px"
		style:height="{marquee.h}px"
	></div>
{/if}

{#if active && Layer}
	<Layer />
{/if}

<style>
	/* RTS marquee (§3.5): dashed signal outline, 6% signal fill. */
	.marquee {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--z-cursor);
		pointer-events: none;
		border: 1px dashed var(--signal);
		background: color-mix(in srgb, var(--signal) 6%, transparent);
	}
</style>
