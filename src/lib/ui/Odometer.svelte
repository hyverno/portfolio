<!--
	Rolling digits (§3.2 `tick` family): each digit is a 0–9 strip that rolls to its value, rightmost
	first (stagger .06), with `spawn` by default. Separators (`,` / narrow nbsp) stay static.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { DUR, EASE, STAGGER, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { fmtNum } from '#lib/i18n/index.svelte';

	interface Props {
		value: number;
		/** Zero-pad to this many digits, no grouping (`03`). Without it the value is locale-grouped. */
		digits?: number;
		ease?: string;
	}

	let { value, digits, ease = EASE.spawn }: Props = $props();

	const text = $derived(
		digits ? String(Math.max(0, Math.round(value))).padStart(digits, '0') : fmtNum(value)
	);
	const chars = $derived([...text]);
	const isDigit = (c: string) => c >= '0' && c <= '9';

	/** Digit strips indexed from the right, so columns keep their identity when the value grows. */
	const strips: (HTMLSpanElement | undefined)[] = $state([]);
	let primed = false;

	$effect(() => {
		const current = chars;
		const instant = !primed || device.reducedMotion;
		void tick().then(() => {
			const moves: { el: HTMLSpanElement; y: number }[] = [];
			for (let r = 0; r < current.length; r++) {
				const c = current[current.length - 1 - r];
				const el = strips[r];
				if (!el?.isConnected || !isDigit(c)) continue;
				const y = -10 * Number(c);
				if (gsap.getProperty(el, 'yPercent') !== y) moves.push({ el, y });
			}
			primed = true;
			if (instant) {
				for (const m of moves) gsap.set(m.el, { yPercent: m.y });
				return;
			}
			moves.forEach((m, i) =>
				gsap.to(m.el, {
					yPercent: m.y,
					duration: DUR.base,
					ease,
					delay: i * STAGGER.rows,
					overwrite: true
				})
			);
		});
	});
</script>

<span class="odo">
	<span class="visually-hidden">{text}</span>
	<span class="digits" aria-hidden="true">
		{#each chars as c, i (chars.length - i)}
			{#if isDigit(c)}
				<span class="col">
					<span class="strip" bind:this={strips[chars.length - 1 - i]}>
						{#each { length: 10 }, d}<span>{d}</span>{/each}
					</span>
				</span>
			{:else}
				<span class="sep">{c}</span>
			{/if}
		{/each}
	</span>
</span>

<style>
	.odo {
		display: inline-block;
		font-variant-numeric: tabular-nums;
		vertical-align: bottom;
	}

	.digits {
		display: inline-flex;
		line-height: 1.3;
	}

	.col {
		display: inline-block;
		height: 1.3em;
		overflow: hidden;
	}

	.strip {
		display: block;
		will-change: transform;
	}

	.strip > span {
		display: block;
		height: 1.3em;
		text-align: center;
	}

	.sep {
		white-space: pre;
	}
</style>
