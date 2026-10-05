<script lang="ts">
	/*
		/projects/[slug] (§5): the project's formation runs as the hero, then the SPEC SHEET, the
		text, and NEXT LEVEL → the following project. Copy blocks are colliders, the crowd walks
		around them; 3D formations (the d20, the planet) spin slowly.
	*/
	import { onMount } from 'svelte';
	import { collider, hudLine, reveal, themeSection } from '#lib/core/actions';
	import { device } from '#lib/core/device.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { formation } from '#lib/gl/actions';
	import { whenEngine } from '#lib/gl/handle';
	import { i18n, langHref, loc, t } from '#lib/i18n/index.svelte';
	import { isGame, nextProject, projects } from '#lib/content/content';
	import { releaseLabel } from '#lib/content/status';
	import type { Game, ProjectSlug, SideProject } from '#lib/content/types';
	import { PROJECT_VISUALS } from './formations';
	import NextLevel from './NextLevel.svelte';
	import SpecSheet from './SpecSheet.svelte';
	import StaticFormation from './StaticFormation.svelte';

	let { project }: { project: Game | SideProject } = $props();

	const visual = $derived(PROJECT_VISUALS[project.slug]);
	const next = $derived(nextProject(project.slug));
	const index = $derived(projects.findIndex((p) => p.slug === project.slug) + 1);
	const pad2 = (n: number) => String(n).padStart(2, '0');

	/** Where "back" lands on the home page: the project's own section. */
	const HOME_ANCHOR: Record<ProjectSlug, string> = {
		'monsters-are-coming': 'shipped',
		'tabletop-game-shop-simulator': 'shipped',
		invokyr: 'shipped',
		'crazy-planet-survivor': 'planet',
		stixiva: 'stixiva',
		'le-rongeur': 'rongeur'
	};

	const kicker = $derived(isGame(project) ? `LUDOGRAM · ${loc(project.role)}` : t().sideQuests.hud);

	// Release status is computed in the browser (the prerender carries the dates, not "in 4 days").
	let status = $state('');
	$effect(() => {
		if (isGame(project)) status = releaseLabel(project, i18n.lang);
	});

	onMount(() => {
		let off: (() => void) | null = null;
		let alive = true;
		void whenEngine().then((engine) => {
			if (!alive || !engine) return;
			const crowd = engine.crowd as typeof engine.crowd & {
				setRotation?(id: string, x: number, y: number, z: number): void;
			};
			const spinning = [visual.spin ? `proj-${project.slug}` : null, PROJECT_VISUALS[next.slug].spin ? `next-${next.slug}` : null].filter(
				(id): id is string => !!id
			);
			if (!spinning.length || !crowd.setRotation) return;
			off = onFrame((time) => {
				const yaw = device.reducedMotion ? 0.6 : time * 0.22;
				for (const id of spinning) crowd.setRotation!(id, 0.34, yaw, 0);
			}, PRIORITY.input);
		});
		return () => {
			alive = false;
			off?.();
		};
	});
</script>

<section
	id="project"
	data-section="project"
	data-theme={visual.theme}
	use:themeSection={visual.theme}
	use:hudLine={{ section: t().project.specSheet, label: project.title.toUpperCase() }}
	class="project"
>
	<div class="wrap head">
		<nav class="crumbs hud-text" aria-label={t().project.specSheet}>
			<a class="link" href={langHref(`/#${HOME_ANCHOR[project.slug]}`)}>{t().project.back}</a>
			<span class="graphite">{t().project.specSheet} · {pad2(index)}/{pad2(projects.length)}</span>
		</nav>

		<div class="copy" use:collider={{ pad: 8 }}>
			<p class="kicker hud-text">{kicker}</p>
			<h1 class="t-display title" use:reveal={{ mode: 'lines', widthMarch: true }}>{project.title}</h1>
			<p class="t-lede line">{loc(project.line)}</p>
			{#if isGame(project) && project.sub}
				<p class="serif sub">{loc(project.sub)}</p>
			{/if}
		</div>

		<div
			class="stage"
			style="--aspect: {visual.aspect}"
			aria-hidden="true"
			use:formation={{ id: `proj-${project.slug}`, source: visual.source, preset: visual.preset }}
		>
			<div class="static-only"><StaticFormation source={visual.source} aspect={visual.aspect} /></div>
		</div>
		<p class="visually-hidden">{loc(project.line)}</p>
	</div>

	<div class="wrap body">
		<SpecSheet {project} {status} />
		<div class="text" use:collider={{ pad: 8 }}>
			{#if isGame(project)}
				<p class="t-lede">{loc(project.pitch)}</p>
			{:else}
				{#each project.body as paragraph, i (i)}
					<p class="t-lede">{loc(paragraph)}</p>
				{/each}
			{/if}
			{#if isGame(project) && project.steam}
				<a class="cta hud-text brackets" href={project.steam} target="_blank" rel="noopener noreferrer">
					{t().project.steam}
				</a>
			{:else if !isGame(project) && project.url}
				<a class="cta hud-text brackets" href={project.url} target="_blank" rel="noopener noreferrer">
					{project.url.replace(/^https?:\/\//, '')} ↗
				</a>
			{/if}
		</div>
	</div>
</section>

<NextLevel {next} />

<style>
	.project {
		position: relative;
		padding-top: clamp(88px, 12vh, 140px);
		padding-bottom: var(--section-pad);
	}

	.head {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--gutter);
		row-gap: var(--s-4);
		align-items: center;
		min-height: calc(100svh - clamp(88px, 12vh, 140px));
	}

	.crumbs {
		grid-column: 1 / -1;
		align-self: start;
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-1) var(--s-4);
		justify-content: space-between;
	}

	.copy {
		grid-column: 1 / 7;
		display: grid;
		gap: var(--s-3);
		align-content: center;
	}

	.kicker {
		color: var(--signal-text);
	}

	.title {
		--wdth: 72;
		overflow-wrap: anywhere;
	}

	.sub {
		font-size: var(--fs-lede);
		color: var(--graphite);
	}

	.stage {
		grid-column: 7 / 13;
		width: 100%;
		aspect-ratio: var(--aspect);
		max-height: 62vh;
		justify-self: center;
	}

	.body {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--gutter);
		row-gap: var(--s-6);
		padding-top: var(--s-8);
	}

	.body > :global(.sheet) {
		grid-column: 1 / 6;
	}

	.text {
		grid-column: 7 / 13;
		display: grid;
		gap: var(--s-3);
		align-content: start;
		max-width: 62ch;
	}

	.cta {
		justify-self: start;
		padding: 0.7rem 1rem;
		color: var(--ink);
		text-decoration: none;
	}

	@media (max-width: 1023px) {
		.head {
			min-height: 0;
		}

		.copy,
		.stage,
		.text,
		.body > :global(.sheet) {
			grid-column: 1 / -1;
		}

		.stage {
			grid-row: 2;
			max-height: 46vh;
		}
	}
</style>
