<!--
	The d20 result: the number sits on the face that landed toward you (the die region is square and
	centred, so the front face's centre is the region's centre), the outcome under the die, and a
	polite status line for screen readers. Pops with `spawn`; HORROR jitters with `glitch` (600ms).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { EASE, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import type { Outcome } from './d20';

	interface Props {
		value: number | null;
		outcome: Outcome | null;
		/** Increments per landed roll (re-runs the entrance even for a repeated number). */
		seq: number;
	}

	let { value, outcome, seq }: Props = $props();

	let num = $state<HTMLElement>();
	let label = $state<HTMLElement>();

	const text = $derived.by(() => {
		const d = t().shipped.dice;
		switch (outcome) {
			case 'nat20':
				return `${d.nat20} · ${d.hope}`;
			case 'nat1':
				return `${d.nat1} · ${d.horror}`;
			case 'hope':
				return d.hope;
			case 'horror':
				return d.horror;
			default:
				return '';
		}
	});
	const live = $derived(
		value != null && outcome ? t().shipped.dice.result(String(value), text) : ''
	);
	const bad = $derived(outcome === 'horror' || outcome === 'nat1');

	$effect(() => {
		void seq;
		const v = value;
		const o = outcome;
		if (v == null || !num || !label) return;
		untrack(() => {
			if (device.reducedMotion) {
				gsap.set([num, label], { clearProps: 'transform,opacity' });
				return;
			}
			gsap.fromTo(
				num!,
				{ scale: 0.35, opacity: 0 },
				{ scale: 1, opacity: 1, duration: 0.62, ease: EASE.spawn, overwrite: true }
			);
			gsap.fromTo(
				label!,
				{ y: 10, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.42, ease: EASE.steer, delay: 0.12, overwrite: true }
			);
			if (o === 'horror' || o === 'nat1') {
				gsap.fromTo(
					[num!, label!],
					{ x: -9, skewX: 9 },
					{ x: 0, skewX: 0, duration: 0.6, ease: EASE.glitch, delay: 0.05 }
				);
			}
		});
	});
</script>

<span class="num" class:bad bind:this={num} aria-hidden="true">{value ?? ''}</span>
<p class="outcome hud-text" class:bad bind:this={label} aria-hidden="true">{text}</p>
<p class="visually-hidden" role="status">{live}</p>

<style>
	/* --fs-display in Martian, capped by the face it sits on. */
	.num {
		position: absolute;
		left: 50%;
		top: 50%;
		translate: -50% -46%;
		font-family: var(--font-mono);
		font-weight: 800;
		font-stretch: 87.5%;
		font-size: min(var(--fs-display), 15cqmin);
		line-height: 1;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		pointer-events: none;
		white-space: nowrap;
	}

	.num:empty {
		display: none;
	}

	.num.bad {
		color: var(--signal-text);
	}

	.outcome {
		position: absolute;
		left: 50%;
		top: calc(100% + 6px);
		translate: -50% 0;
		max-width: none;
		padding: 5px 10px 4px;
		white-space: nowrap;
		color: var(--ink);
		border: 1px solid var(--hairline);
		background: var(--paper);
	}

	.outcome:empty {
		display: none;
	}

	.outcome.bad {
		color: var(--signal-text);
		border-color: currentColor;
	}
</style>
