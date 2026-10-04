<script lang="ts">
	import { page } from '$app/state';
	import { SITE_ORIGIN, absoluteUrl } from '#lib/core/site';
	import { i18n, t } from '#lib/i18n/index.svelte';
	import Hero from '#lib/sections/Hero.svelte';
	import Manifesto from '#lib/sections/Manifesto.svelte';
	import Ludogram from '#lib/sections/ludogram/Ludogram.svelte';
	import SideQuestsIntro from '#lib/sections/side-quests/SideQuestsIntro.svelte';
	import CrazyPlanet from '#lib/sections/side-quests/planet/CrazyPlanet.svelte';
	import Stixiva from '#lib/sections/side-quests/stixiva/Stixiva.svelte';
	import Rongeur from '#lib/sections/side-quests/rongeur/Rongeur.svelte';
	import Lab from '#lib/sections/lab/Lab.svelte';
	import Contracts from '#lib/sections/Contracts.svelte';
	import PatchNotes from '#lib/sections/PatchNotes.svelte';
	import Contact from '#lib/sections/Contact.svelte';
</script>

<svelte:head>
	<title>{t().meta.title}</title>
	<meta name="description" content={t().meta.description} />
	<link rel="canonical" href={absoluteUrl(page.url.pathname, i18n.lang)} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Hyverno" />
	<meta property="og:title" content={t().meta.title} />
	<meta property="og:description" content={t().meta.description} />
	<meta property="og:url" content={absoluteUrl(page.url.pathname, i18n.lang)} />
	<meta property="og:image" content="{SITE_ORIGIN}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={t().meta.ogAlt} />
	<meta property="og:locale" content={i18n.lang === 'fr' ? 'fr_FR' : 'en_US'} />
	<meta property="og:locale:alternate" content={i18n.lang === 'fr' ? 'en_US' : 'fr_FR'} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#ECE9E1" />
</svelte:head>

<Hero />
<Manifesto />
<Ludogram />
<SideQuestsIntro />
<CrazyPlanet />
<Stixiva />
<Rongeur />
<Lab />
<Contracts />
<PatchNotes />
<Contact />
