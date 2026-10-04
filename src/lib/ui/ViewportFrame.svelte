<!--
	Viewport frame (§2.3): a 1px --hairline border inset 12px (8px on mobile). Ruler ticks every
	64px on the top and left edges, aligned with the world grid; the left ruler pans with the world
	and carries the world-Y readout `Y 004 280`, updated at 4Hz.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { scroll } from '#lib/core/scroll.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { t } from '#lib/i18n/index.svelte';

	const CELL = 64;
	const READOUT_MS = 250;

	let ticks: HTMLDivElement;
	let y = $state(0);

	const readout = $derived.by(() => {
		const s = String(Math.max(0, Math.round(y))).padStart(6, '0');
		return t().hud.ruler(`${s.slice(0, -3)} ${s.slice(-3)}`);
	});

	onMount(() => {
		let lastOff = Number.NaN;
		let lastRead = 0;
		return onFrame((time) => {
			const off = scroll.y % CELL;
			if (off !== lastOff) {
				lastOff = off;
				ticks.style.transform = `translate3d(0, ${-off}px, 0)`;
			}
			if (time - lastRead >= READOUT_MS / 1000) {
				lastRead = time;
				if (Math.round(scroll.y) !== y) y = Math.round(scroll.y);
			}
		}, PRIORITY.ui);
	});
</script>

<div class="frame" aria-hidden="true">
	<div class="ruler top"></div>
	<div class="ruler left"><div class="ticks" bind:this={ticks}></div></div>
	<span class="readout micro">{readout}</span>
</div>

<style>
	.frame {
		--tick: var(--hairline);
		/* Offsets that put ruler ticks on the same 64px lattice as the world grid (viewport origin). */
		--o: calc(var(--frame-inset) * -1 - 1px);
		position: fixed;
		inset: var(--frame-inset);
		z-index: var(--z-hud);
		border: 1px solid var(--hairline);
		pointer-events: none;
	}

	.ruler {
		position: absolute;
		overflow: hidden;
	}

	.top {
		inset: 0 0 auto 0;
		height: 6px;
		background:
			linear-gradient(to right, var(--tick) 1px, transparent 1px) var(--o) 0 / 64px 6px repeat-x,
			linear-gradient(to right, var(--tick) 1px, transparent 1px) var(--o) 0 / 16px 3px repeat-x;
	}

	.left {
		inset: 0 auto 0 0;
		width: 6px;
	}

	.ticks {
		position: absolute;
		inset: 0 0 auto 0;
		height: calc(100% + 64px);
		background:
			linear-gradient(to bottom, var(--tick) 1px, transparent 1px) 0 var(--o) / 6px 64px repeat-y,
			linear-gradient(to bottom, var(--tick) 1px, transparent 1px) 0 var(--o) / 3px 16px repeat-y;
		will-change: transform;
	}

	.readout {
		position: absolute;
		top: 50%;
		left: 0;
		padding: 2px 6px;
		color: var(--graphite);
		background: var(--paper);
		white-space: pre;
		transform: translate(-50%, -50%) rotate(-90deg) translateY(50%);
		transform-origin: 50% 50%;
	}

	@media (max-width: 639px) {
		.readout {
			display: none;
		}
	}
</style>
