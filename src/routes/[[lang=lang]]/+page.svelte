<script lang="ts">
	import { t } from '#lib/i18n/index.svelte';
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
