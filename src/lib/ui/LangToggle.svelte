<!--
	EN / FR. A real link to the other-language URL (works without JS); with JS it runs `switchLang`,
	which keeps the reader on the same section through the Ink Swarm.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { i18n, langHref, otherLang, switchLang, t } from '#lib/i18n/index.svelte';
	import { sfx } from './sfx';

	let { pill = false }: { pill?: boolean } = $props();

	const other = $derived(otherLang());
	const href = $derived(langHref(page.url.pathname, other));

	function onclick(e: MouseEvent) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
		e.preventDefault();
		sfx('tick');
		void switchLang();
	}
</script>

<a class="lang hud-text" class:pill {href} hreflang={other} data-sveltekit-noscroll {onclick}>
	<span class:on={i18n.lang === 'en'}>EN</span><span class="slash" aria-hidden="true">/</span><span
		class:on={i18n.lang === 'fr'}>FR</span
	><span class="visually-hidden" lang={other}>{t().hud.lang.switch}</span>
</a>

<style>
	.lang {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		color: var(--graphite);
		white-space: nowrap;
	}

	.on {
		color: var(--ink);
	}

	.slash {
		opacity: 0.6;
	}

	.lang:hover span:not(.on):not(.slash) {
		color: var(--ink);
	}

	.pill {
		gap: 0;
		padding: 2px;
		border: 1px solid var(--ink);
		border-radius: 999px;
	}

	.pill .slash {
		display: none;
	}

	.pill span {
		padding: 5px 9px 4px;
		border-radius: 999px;
	}

	.pill .on {
		background: var(--ink);
		color: var(--paper);
	}
</style>
