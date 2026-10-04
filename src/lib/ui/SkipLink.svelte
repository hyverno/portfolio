<!-- Skip to content (§7), z 100. Hidden until focused; moves focus to <main id="content">. -->
<script lang="ts">
	import { t } from '#lib/i18n/index.svelte';

	function skip(e: MouseEvent) {
		const main = document.getElementById('content');
		if (!main) return;
		e.preventDefault();
		main.focus({ preventScroll: true });
		main.scrollIntoView({ block: 'start' });
	}
</script>

<a class="skip hud-text" href="#content" onclick={skip}>{t().nav.skip}</a>

<style>
	.skip {
		position: fixed;
		top: calc(var(--frame-inset) + 8px);
		left: 50%;
		z-index: var(--z-top);
		padding: 10px 14px;
		background: var(--ink);
		color: var(--paper);
		transform: translate(-50%, calc(-100% - 40px));
	}

	.skip:focus,
	.skip:focus-visible {
		transform: translate(-50%, 0);
	}
</style>
