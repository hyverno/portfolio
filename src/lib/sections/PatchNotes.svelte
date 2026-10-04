<script lang="ts">
	// STUB — owned by A8, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="patch-notes" data-section="patch-notes" data-theme="paper" use:themeSection={'paper'} class="section wrap stub">
	<p class="hud-text graphite">patch-notes</p>
	<h2>{t().patch.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
