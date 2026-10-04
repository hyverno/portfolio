<!--
	Bottom-right HUD (§5.10): `16,384 ENT · 60 FPS · 1.8 / 16.6 MS`, the 1px frame-budget bar,
	`TROPHIES 03/11` (+ `#1,445` once unlocked) and the governor note. Every value is measured;
	stats publish at 4Hz, so the numbers step like a stat overlay. Also rendered inside the ⚙ sheet.
-->
<script lang="ts">
	import { stats } from '#lib/core/stats.svelte';
	import { fmtNum, t } from '#lib/i18n/index.svelte';
	import { ACH_TOTAL, ach } from '#lib/stores/achievements.svelte';
	import { chrome, entityCount, governorStep } from './chrome.svelte';
	import Odometer from './Odometer.svelte';

	let { sheet = false }: { sheet?: boolean } = $props();

	const BUDGET_MS = 16.6;

	const line = $derived(
		t().hud.stats(fmtNum(entityCount()), fmtNum(stats.fps), fmtNum(stats.frameMs, 1))
	);
	const load = $derived(stats.frameMs / BUDGET_MS);
	const level = $derived(load < 0.7 ? 'ok' : load < 1 ? 'warn' : 'over');
	const governor = $derived.by(() => {
		const step = governorStep();
		return step ? t().hud.quality(step) : '';
	});
	// Hidden from the HUD (not the sheet) only while there is nothing to report.
	const numbers = $derived(
		stats.numbersDrawn > 0 ? t().hud.numbersDrawn(fmtNum(stats.numbersDrawn)) : ''
	);
	const piece = (slot?: string) =>
		sheet ? {} : { 'data-hud-piece': 'bottom', 'data-hud-slot': slot };
</script>

<div class="stats hud-text" class:sheet>
	{#if numbers}
		<p class="row graphite" {...piece()}>{numbers}</p>
	{/if}
	<p class="row" {...piece('stats')}>{line}</p>
	<div
		class="budget {level}"
		role="meter"
		aria-valuemin={0}
		aria-valuemax={BUDGET_MS}
		aria-valuenow={stats.frameMs}
		aria-label={t().hud.budgetAria(fmtNum(stats.frameMs, 1))}
		{...piece('budget')}
	>
		<span class="fill" style:transform="scaleX({Math.min(1, load)})"></span>
	</div>
	<p class="row trophies" {...piece('trophies')}>
		<span class="graphite">{t().hud.labels.trophies}</span>
		<span><Odometer value={ach.unlocked.length} digits={2} />/{ACH_TOTAL}</span>
		{#if chrome.devRoll > 0}
			<span class="dev">
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" /></svg
				>#<Odometer value={chrome.devRoll} />
			</span>
		{/if}
	</p>
	{#if governor}
		<p class="row governor" {...piece('governor')}>{governor}</p>
	{/if}
</div>

<style>
	.stats {
		display: grid;
		justify-items: end;
		gap: 5px;
		color: var(--ink);
		text-align: right;
	}

	.row {
		max-width: none;
		white-space: nowrap;
	}

	.budget {
		--ok: color-mix(in srgb, var(--debug-lime) 45%, var(--ink));
		position: relative;
		width: 100%;
		max-width: 22em;
		height: 1px;
		background: var(--hairline);
		overflow: hidden;
	}

	:global(:root[data-theme='viewport']) .budget,
	:global(:root[data-theme='ink']) .budget {
		--ok: var(--debug-lime);
	}

	.fill {
		position: absolute;
		inset: 0;
		background: var(--ok);
		transform-origin: 0 50%;
		transition:
			transform 250ms steps(4, end),
			background-color var(--t-micro) steps(2);
	}

	.warn .fill {
		background: var(--debug-amber);
	}

	.over .fill {
		background: var(--signal);
	}

	.trophies {
		display: inline-flex;
		align-items: baseline;
		gap: 0.6em;
	}

	.dev {
		display: inline-flex;
		align-items: baseline;
		gap: 0.25em;
	}

	.dev svg {
		width: 0.8em;
		height: 0.8em;
		align-self: center;
		fill: #d9a441;
	}

	.governor {
		color: var(--ink);
		padding: 1px 0 0 5px;
		border-left: 2px solid var(--debug-amber);
	}

	.sheet {
		justify-items: start;
		text-align: left;
	}

	.sheet .row {
		white-space: normal;
	}
</style>
