<script lang="ts">
	// STUB — owned by A8, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="lab" data-section="lab" data-theme="viewport" use:themeSection={'viewport'} class="section wrap stub">
	<p class="hud-text graphite">lab</p>
	<h2>{t().lab.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
