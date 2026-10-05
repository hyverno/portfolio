<script lang="ts">
	import { page } from '$app/state';
	import { SITE_ORIGIN, absoluteUrl } from '#lib/core/site';
	import { i18n, loc, t } from '#lib/i18n/index.svelte';
	import { projectBySlug } from '#lib/content/content';
	import ProjectPage from '#lib/sections/project/ProjectPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const project = $derived(projectBySlug(data.slug)!);
</script>

<svelte:head>
	<title>{t().meta.project(project.title)}</title>
	<meta name="description" content={loc(project.line)} />
	<link rel="canonical" href={absoluteUrl(page.url.pathname, i18n.lang)} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Hyverno" />
	<meta property="og:title" content={t().meta.project(project.title)} />
	<meta property="og:description" content={loc(project.line)} />
	<meta property="og:url" content={absoluteUrl(page.url.pathname, i18n.lang)} />
	<meta property="og:image" content="{SITE_ORIGIN}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={t().meta.ogAlt} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#ECE9E1" />
</svelte:head>

{#key project.slug}
	<ProjectPage {project} />
{/key}
