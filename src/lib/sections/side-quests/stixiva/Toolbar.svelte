<!--
	Stixiva's mock app toolbar, French in both languages on purpose (DESIGN.md §5 04b):
	Atelier · Palette de fils · Grille · Exporter le PDF. Only the export is a control
	(`[E] PDF EXPORT`); the rest are labels, so nothing pretends to be clickable.
-->
<script lang="ts">
	import { interact } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';

	let {
		onexport,
		busy = false,
		readout = ''
	}: { onexport: () => void; busy?: boolean; readout?: string } = $props();

	const items = $derived(t().stixiva.toolbar);
</script>

<div class="bar" lang="fr">
	<span class="brand micro" aria-hidden="true">
		<span class="mark"></span>Stixiva
	</span>
	<ul class="menu" role="list">
		{#each items.slice(0, 3) as label, i (label)}
			<li class="item micro" class:active={i === 0}>
				{label}
			</li>
		{/each}
	</ul>
	<span class="readout micro" aria-hidden="true">{readout}</span>
	<button
		type="button"
		class="export micro"
		class:busy
		use:interact={{ verb: t().stixiva.pdf.verb }}
		onclick={onexport}
	>
		<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
			<path d="M6 1.5v6M3.2 5 6 7.8 8.8 5M2 10.5h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
		</svg>
		{items[3]}
	</button>
</div>

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: clamp(12px, 2vw, 28px);
		min-height: 36px;
		padding: 0 0 0 2px;
		border-bottom: 1px solid var(--stx-ink);
		color: var(--stx-ink);
		overflow-x: auto;
		scrollbar-width: none;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0.02em;
		white-space: nowrap;
	}

	/* The app mark: a single cross-stitch. */
	.mark {
		width: 10px;
		height: 10px;
		background:
			linear-gradient(45deg, transparent 42%, var(--stx-signal) 42% 58%, transparent 58%),
			linear-gradient(-45deg, transparent 42%, var(--stx-signal) 42% 58%, transparent 58%);
	}

	.menu {
		display: flex;
		gap: clamp(10px, 1.6vw, 22px);
		padding: 0;
		margin: 0;
	}

	.item {
		position: relative;
		padding: 11px 0 10px;
		text-transform: none;
		letter-spacing: 0.02em;
		color: var(--stx-graphite);
		white-space: nowrap;
	}

	.item.active {
		color: var(--stx-ink);
	}

	.item.active::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--stx-signal);
	}

	.readout {
		margin-left: auto;
		color: var(--stx-graphite);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.export {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 10px 5px;
		border: 1px solid var(--stx-ink);
		color: var(--stx-ink);
		text-transform: none;
		letter-spacing: 0.02em;
		white-space: nowrap;
		transition:
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.export:hover,
	.export.busy,
	.export:global([data-pressed]) {
		background: var(--stx-ink);
		color: var(--stx-paper);
	}

	@media (max-width: 1199px) {
		.readout {
			display: none;
		}

		.export {
			margin-left: auto;
		}
	}

	/* Phones: the mock menu keeps its active tab only. */
	@media (max-width: 639px) {
		.item:not(.active) {
			display: none;
		}
	}
</style>
