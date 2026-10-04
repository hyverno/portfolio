<script lang="ts">
	// STUB — owned by A5, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="hero" data-section="hero" data-theme="paper" use:themeSection={'paper'} class="section wrap stub">
	<p class="hud-text graphite">hero</p>
	<h1>{t().hero.hud}</h1>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
