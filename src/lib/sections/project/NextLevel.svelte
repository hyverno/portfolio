<script lang="ts">
	/*
		NEXT LEVEL → (§5 "/projects/[slug]"): the next project's formation forms as you approach
		the footer, its palette bleeds in, and the click goes through the Ink Swarm transition (the
		layout's onNavigate).
	*/
	import { themeSection } from '#lib/core/actions';
	import { formation } from '#lib/gl/actions';
	import { langHref, loc, t } from '#lib/i18n/index.svelte';
	import type { Game, SideProject } from '#lib/content/types';
	import { PROJECT_VISUALS } from './formations';
	import StaticFormation from './StaticFormation.svelte';

	let { next }: { next: Game | SideProject } = $props();

	const visual = $derived(PROJECT_VISUALS[next.slug]);
</script>

<section id="next-level" data-section="next-level" data-theme={visual.theme} use:themeSection={visual.theme} class="next">
	<a class="card wrap" href={langHref(`/projects/${next.slug}`)}>
		<span class="label hud-text">{t().project.next}</span>
		<span class="name t-display">{next.title}</span>
		<span class="line t-lede">{loc(next.line)}</span>
		<span
			class="stage"
			style="--aspect: {visual.aspect}"
			aria-hidden="true"
			use:formation={{ id: `next-${next.slug}`, source: visual.source, preset: visual.preset }}
		>
			<span class="static-only"><StaticFormation source={visual.source} aspect={visual.aspect} count={2200} /></span>
		</span>
	</a>
</section>

<style>
	.next {
		position: relative;
		padding-block: var(--section-pad) calc(var(--section-pad) * 0.75);
		border-top: 1px solid var(--hairline);
	}

	.card {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--gutter);
		row-gap: var(--s-2);
		align-items: center;
		color: inherit;
		text-decoration: none;
	}

	.label {
		grid-column: 1 / -1;
		color: var(--signal-text);
	}

	.name {
		grid-column: 1 / 8;
		--wdth: 70;
		transition: --wdth 480ms var(--ease-steer);
	}

	.line {
		grid-column: 1 / 7;
		color: var(--graphite);
	}

	.stage {
		grid-column: 8 / 13;
		grid-row: 2 / span 2;
		width: 100%;
		aspect-ratio: var(--aspect);
		max-height: 46vh;
		justify-self: center;
	}

	.card:hover .name,
	.card:focus-visible .name {
		--wdth: 100;
	}

	@media (max-width: 1023px) {
		.name,
		.line,
		.stage {
			grid-column: 1 / -1;
		}

		.stage {
			grid-row: auto;
			max-height: 40vh;
		}
	}
</style>
