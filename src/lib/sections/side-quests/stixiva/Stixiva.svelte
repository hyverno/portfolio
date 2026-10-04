<script lang="ts">
	// STUB — owned by A7, replace me
	import { themeSection } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';
</script>

<section id="stixiva" data-section="stixiva" data-theme="aida" use:themeSection={'aida'} class="section wrap stub">
	<p class="hud-text graphite">stixiva</p>
	<h2>{t().stixiva.hud}</h2>
</section>

<style>
	.stub {
		min-height: 100svh;
		display: grid;
		align-content: start;
		gap: var(--s-2);
	}
</style>
