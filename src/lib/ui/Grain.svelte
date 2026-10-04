<!--
	Film grain (§2.4): a 160px noise tile generated once on a canvas (blob URL), on a fixed layer
	200% of the viewport moved with `transform` in steps(8). Blend and opacity follow the theme
	(`--grain-blend` / `--grain-opacity`); static under reduced motion, off on the LOW tier.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { device } from '#lib/core/device.svelte';

	const TILE = 160;
	let url = $state('');
	let mounted = $state(false);

	const enabled = $derived(mounted && url !== '' && device.tier !== 'low');

	onMount(() => {
		mounted = true;
		let objectUrl = '';
		let alive = true;
		try {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = TILE;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			const img = ctx.createImageData(TILE, TILE);
			const d = img.data;
			for (let i = 0; i < d.length; i += 4) {
				const v = (Math.random() * 255) | 0;
				d[i] = d[i + 1] = d[i + 2] = v;
				d[i + 3] = 255;
			}
			ctx.putImageData(img, 0, 0);
			canvas.toBlob((blob) => {
				if (!blob || !alive) return;
				objectUrl = URL.createObjectURL(blob);
				url = objectUrl;
			});
		} catch {
			/* no grain is a fine fallback */
		}
		return () => {
			alive = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	});
</script>

{#if enabled}
	<div
		class="grain"
		class:still={device.reducedMotion}
		style:--tile="url({url})"
		aria-hidden="true"
	></div>
{/if}

<style>
	.grain {
		position: fixed;
		inset: 0;
		z-index: var(--z-world);
		overflow: hidden;
		pointer-events: none;
		opacity: var(--grain-opacity);
		mix-blend-mode: var(--grain-blend);
	}

	.grain::before {
		content: '';
		position: absolute;
		inset: -50%;
		width: 200%;
		height: 200%;
		background-image: var(--tile);
		background-size: 160px 160px;
		/* 8 keyframes held for one step each = steps(8) over the cycle (timing functions apply per segment). */
		animation: grain 0.8s steps(1, end) infinite;
		will-change: transform;
	}

	.still::before {
		animation: none;
	}

	/* Governor step 4 (§7): the engine drops the grain before it drops a tier. */
	:global(html.governor-no-grain) .grain {
		display: none;
	}

	@keyframes grain {
		0% {
			transform: translate(0, 0);
		}
		12.5% {
			transform: translate(-7%, 4%);
		}
		25% {
			transform: translate(5%, -9%);
		}
		37.5% {
			transform: translate(-11%, -3%);
		}
		50% {
			transform: translate(9%, 8%);
		}
		62.5% {
			transform: translate(-3%, 12%);
		}
		75% {
			transform: translate(13%, -6%);
		}
		87.5% {
			transform: translate(-9%, -11%);
		}
		100% {
			transform: translate(0, 0);
		}
	}
</style>
