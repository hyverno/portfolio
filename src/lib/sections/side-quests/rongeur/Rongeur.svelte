<script lang="ts">
	// STUB — owned by A7, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="rongeur" data-section="rongeur" data-theme="rongeur" use:themeSection={'rongeur'} class="section wrap stub">
	<p class="hud-text graphite">rongeur</p>
	<h2>{t().rongeur.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
