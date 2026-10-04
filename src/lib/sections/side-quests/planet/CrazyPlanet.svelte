<script lang="ts">
	// STUB — owned by A6, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="planet" data-section="planet" data-theme="earth" use:themeSection={'earth'} class="section wrap stub">
	<p class="hud-text graphite">planet</p>
	<h2>{t().planet.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
