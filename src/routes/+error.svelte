<script lang="ts">
	import { page } from '$app/state';
	import { langHref, t } from '#lib/i18n/index.svelte';
	import { interact } from '#lib/core/actions';

	const notFound = $derived(page.status === 404);
	const copy = $derived(t().notFound);
</script>

<svelte:head>
	<title>{t().meta.notFound}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section id="not-found" class="missing" data-section="not-found">
	<div class="checker" aria-hidden="true"></div>

	<div class="card brackets">
		<p class="hud-text code">
			<span class="graphite">{notFound ? copy.label : 'ERR'}</span>
			<span class="status">{page.status}</span>
		</p>

		<h1 class="t-h1 title">{notFound ? copy.title : (page.error?.message ?? copy.title)}</h1>

		<p class="micro graphite path">{page.url.pathname}</p>

		<a class="respawn hud-text" href={langHref('/')} use:interact={{ verb: copy.respawn }}>
			<span class="key" aria-hidden="true">[E]</span>
			{copy.respawn}
			<span class="visually-hidden">: {copy.home}</span>
		</a>
	</div>
</section>

<style>
	.missing {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 100svh;
		padding: calc(var(--frame-inset) + var(--s-8)) var(--margin);
	}

	/* The missing-texture checker (16px squares), inset to the viewport frame. */
	.checker {
		position: absolute;
		inset: calc(var(--frame-inset) + var(--s-3));
		background: repeating-conic-gradient(var(--missing) 0 25%, var(--ink) 0 50%) 0 0 / 32px 32px;
		image-rendering: pixelated;
	}

	.card {
		--bracket-color: var(--paper);
		position: relative;
		display: grid;
		gap: var(--s-3);
		width: min(100%, 44rem);
		padding: clamp(var(--s-3), 4vw, var(--s-6));
		background: var(--paper);
	}

	.code {
		max-width: none;
		display: flex;
		justify-content: space-between;
		gap: var(--s-2);
	}

	.status {
		color: var(--signal-text);
	}

	.title {
		max-width: 16ch;
	}

	.path {
		word-break: break-all;
	}

	.respawn {
		justify-self: start;
		display: inline-flex;
		gap: 0.75ch;
		padding: var(--s-1) var(--s-2);
		background: var(--ink);
		color: var(--paper);
		transition: background-color var(--t-fast) steps(4);
	}

	.respawn:hover,
	.respawn:global([data-pressed]) {
		background: var(--signal-text);
	}

	.key {
		opacity: 0.7;
	}
</style>
