<!--
	View-mode keycaps [1]–[4] (S4). Keys 1–4 are handled by the engine's input; these mirror its
	state and are a pointer path to the same modes. Hidden on mobile and in the static build.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { getEngine } from '#lib/gl/handle';
	import type { ViewMode } from '#lib/gl/types';
	import { t } from '#lib/i18n/index.svelte';
	import { ach, unlock } from '#lib/stores/achievements.svelte';
	import Keycap from './Keycap.svelte';
	import { sfx } from './sfx';

	const MODES: ViewMode[] = [1, 2, 3, 4];

	let mode = $state<ViewMode>(1);
	const gold = $derived(ach.unlocked.includes('dev-mode'));

	function pick(m: ViewMode) {
		const engine = getEngine();
		if (!engine) return;
		engine.setViewMode(m);
		mode = m;
		sfx('tick');
		if (m === 3) unlock('wireframe');
	}

	// The engine owns the mode (keys 1–4 go straight to it); mirror it with a cheap property read.
	onMount(() =>
		onFrame(() => {
			const m = getEngine()?.viewMode;
			if (m && m !== mode) mode = m;
		}, PRIORITY.ui)
	);
</script>

<div class="keys hud-text" role="group" aria-label={t().hud.viewAria}>
	<span class="label graphite" aria-hidden="true">{t().hud.labels.view}</span>
	{#each MODES as m (m)}
		{@const name = t().hud.viewModes[m]}
		<button
			class="key"
			class:active={mode === m}
			aria-pressed={mode === m}
			aria-label={t().hud.viewKey(String(m), name)}
			onclick={() => pick(m)}
		>
			<Keycap key={String(m)} active={mode === m} gold={m === 4 && gold} />
			<span class="name">{name}</span>
		</button>
	{/each}
</div>

<style>
	.keys {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.key {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--graphite);
		text-transform: inherit;
	}

	.key.active,
	.key:hover {
		color: var(--ink);
	}

	.key:active :global(.keycap) {
		transform: translateY(1.5px);
		box-shadow: 0 0 0 0 currentColor;
	}
</style>
