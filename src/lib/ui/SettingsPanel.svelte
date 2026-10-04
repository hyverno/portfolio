<!--
	The ⚙ panel content, loaded on first open (keeps the initial bundle small).
	Below 1024px it carries the section nav; below 768px it is the mobile sheet with the stats.
-->
<script lang="ts">
	import { device, setQuality, setReducedMotion, type Quality } from '#lib/core/device.svelte';
	import { stats } from '#lib/core/stats.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import { ach, setToastsMuted } from '#lib/stores/achievements.svelte';
	import Brackets from './Brackets.svelte';
	import HudStats from './HudStats.svelte';
	import { primeSfx, setSfx, sfx, sfxState } from './sfx';

	interface Props {
		id: string;
		close: (refocus?: boolean) => void;
		go: (id: string, e: MouseEvent) => void;
		navHref: (id: string) => string;
		el?: HTMLDivElement;
	}

	let { id, close, go, navHref, el = $bindable() }: Props = $props();

	const QUALITIES: Quality[] = ['AUTO', 'LOW', 'MED', 'HIGH'];
	const s = $derived(t().settings);

	const onOff = (s: { on: string; off: string }) => [
		{ value: 'on', text: s.on },
		{ value: 'off', text: s.off }
	];

	function setSound(on: boolean) {
		setSfx(on);
		if (on) void primeSfx().then(() => sfx('tick'));
	}
</script>

{#snippet seg(
	label: string,
	options: { value: string; text: string }[],
	current: string,
	set: (v: string) => void
)}
	<div class="row">
		<span class="label graphite" id="{id}-{label}">{label}</span>
		<div class="seg" role="group" aria-labelledby="{id}-{label}">
			{#each options as o (o.text)}
				<button
					class="opt"
					aria-pressed={o.value === current}
					onclick={() => {
						set(o.value);
						sfx('tick');
					}}>{o.text}</button
				>
			{/each}
		</div>
	</div>
{/snippet}

<div class="panel hud-text" {id} bind:this={el} role="dialog" aria-label={s.title}>
	<Brackets color="var(--ink)" pad={4} />
	<div class="title">
		<span>{s.title}</span>
		<button class="close" onclick={() => close()}>{s.close}</button>
	</div>

	<nav class="sections" aria-label={t().nav.aria}>
		<span class="label graphite">{s.sections}</span>
		<ul role="list">
			{#each t().nav.items as item (item.id)}
				<li>
					<a
						href={navHref(item.id)}
						onclick={(e) => {
							close(false);
							go(item.id, e);
						}}>{item.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>

	{@render seg(
		s.quality,
		QUALITIES.map((q) => ({ value: q, text: s.qualities[q] })),
		stats.quality,
		(v) => setQuality(v as Quality)
	)}
	{@render seg(
		s.motion,
		[
			{ value: 'full', text: s.motions.full },
			{ value: 'reduced', text: s.motions.reduced }
		],
		device.reducedMotion ? 'reduced' : 'full',
		(v) => setReducedMotion(v === 'reduced')
	)}
	{@render seg(s.toasts, onOff(s), ach.muted ? 'off' : 'on', (v) => setToastsMuted(v === 'off'))}
	{@render seg(s.sound, onOff(s), sfxState.enabled ? 'on' : 'off', (v) => setSound(v === 'on'))}

	<div class="sheet-stats">
		<span class="label graphite">{s.stats}</span>
		<HudStats sheet />
	</div>
</div>

<style>
	.panel {
		position: absolute;
		top: calc(100% + 14px);
		right: 0;
		width: 300px;
		display: grid;
		gap: 14px;
		padding: 14px;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--hairline);
		pointer-events: auto;
		/* UI snaps (§3.1): a stepped wipe, not a fade. */
		animation: wipe var(--t-fast) steps(4, end) both;
	}

	@keyframes wipe {
		from {
			clip-path: inset(0 0 100% 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	.title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--hairline);
	}

	.close {
		color: var(--graphite);
		text-transform: inherit;
	}

	.close:hover {
		color: var(--ink);
	}

	.row {
		display: grid;
		gap: 6px;
	}

	.label {
		font-size: var(--fs-micro);
		letter-spacing: var(--tr-micro);
	}

	.seg {
		display: flex;
		border: 1px solid var(--ink);
	}

	.opt {
		flex: 1;
		min-height: 30px;
		padding: 6px 4px 5px;
		color: var(--ink);
		text-transform: inherit;
		transition:
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.opt + .opt {
		border-left: 1px solid var(--ink);
	}

	.opt[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}

	.opt:not([aria-pressed='true']):hover {
		background: color-mix(in srgb, var(--ink) 8%, transparent);
	}

	.sections,
	.sheet-stats {
		display: none;
		gap: 6px;
	}

	.sections ul {
		display: grid;
		gap: 2px;
	}

	.sections a {
		display: block;
		padding: 6px 0;
		background: none;
		color: var(--ink);
	}

	.sections a::before {
		content: '→ ';
		color: var(--graphite);
	}

	@media (max-width: 1023px) {
		.sections {
			display: grid;
		}
	}

	@media (max-width: 767px) {
		.panel {
			position: fixed;
			top: calc(var(--frame-inset) + 56px);
			left: calc(var(--frame-inset) + 10px);
			right: calc(var(--frame-inset) + 10px);
			width: auto;
			max-height: calc(100svh - var(--frame-inset) * 2 - 72px);
			overflow-y: auto;
		}

		.sheet-stats {
			display: grid;
		}
	}
</style>
