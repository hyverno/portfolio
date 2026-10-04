<script lang="ts">
	// STUB — owned by A5, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="readme" data-section="readme" data-theme="paper" use:themeSection={'paper'} class="section wrap stub">
	<p class="hud-text graphite">readme</p>
	<h2>{t().readme.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
