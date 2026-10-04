<!--
	Persistent HUD (§5.10), z 40, inside the viewport frame.
	TL build tag (7 taps → #1,445) · TC anchor nav (≥1024px) · TR EN/FR, SFX, ⚙
	BL view keycaps + section context · BR stats, frame budget, trophies, governor.
	Mobile: wordmark, EN/FR pill and ⚙ (the stats live in the ⚙ sheet).
	Entrance after boot: each piece slides 24px in from its edge (480ms `steer`, stagger .06);
	pieces the preloader already flew into place (`chrome.handed`) just appear.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { DUR, EASE, STAGGER, decode, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { hud, stats } from '#lib/core/stats.svelte';
	import { whenBooted } from '#lib/core/boot.svelte';
	import { currentSectionId, scroll, scrollTo } from '#lib/core/scroll.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { readStore, writeStore } from '#lib/core/storage';
	import { fmtNum, langHref, t } from '#lib/i18n/index.svelte';
	import { loadAchievements, toast } from '#lib/stores/achievements.svelte';
	import { chrome, governorStep } from './chrome.svelte';
	import { createTapCounter, listenKonami, restoreDeveloperMode } from './konami';
	import { loadSfx, primeSfx, setSfx, sfx, sfxState } from './sfx';
	import HudStats from './HudStats.svelte';
	import LangToggle from './LangToggle.svelte';
	import Settings from './Settings.svelte';
	import ViewKeys from './ViewKeys.svelte';

	/** Nav item → the section ids it covers (for aria-current). */
	const NAV_GROUPS: Record<string, string[]> = {
		shipped: ['shipped'],
		'side-quests': ['side-quests', 'planet', 'stixiva', 'rongeur'],
		lab: ['lab'],
		contact: ['contact']
	};

	let root: HTMLElement;
	let contextEl = $state<HTMLParagraphElement>();
	let activeSection = $state('');

	const home = $derived(langHref('/'));
	const onHome = $derived(page.url.pathname === home);
	const navHref = (id: string) => langHref(`/#${id}`);

	const context = $derived(
		hud.label
			? /^\d+$/.test(hud.section)
				? t().hud.context(hud.section, hud.label, hud.line || undefined)
				: hud.line
					? `${hud.label} — ${hud.line}`
					: hud.label
			: ''
	);
	const selected = $derived(stats.selected > 0 ? t().hud.selected(fmtNum(stats.selected)) : '');

	const tap = createTapCounter();

	function go(id: string, e: MouseEvent) {
		if (!onHome || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		scrollTo(`#${id}`);
	}

	function onTag(e: MouseEvent) {
		if (!onHome || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		scrollTo(0);
	}

	function onTagTap(e: PointerEvent) {
		if (tap(e)) e.preventDefault();
	}

	function toggleSfx() {
		const on = !sfxState.enabled;
		setSfx(on);
		if (on) void primeSfx().then(() => sfx('tick'));
	}

	function enter() {
		const pieces = [...root.querySelectorAll<HTMLElement>('[data-hud-piece]')].filter(
			(p) => p.offsetParent !== null
		);
		const handed = new Set(chrome.handed);
		const appear = pieces.filter((p) => handed.has(p.dataset.hudSlot ?? ''));
		const slide = pieces.filter((p) => !handed.has(p.dataset.hudSlot ?? ''));
		const reduced = device.reducedMotion;
		chrome.hudIn = true;
		if (appear.length) gsap.set(appear, { autoAlpha: 1 });
		if (!slide.length) return;
		gsap.fromTo(
			slide,
			{
				autoAlpha: 0,
				y: (_: number, el: HTMLElement) => (reduced ? 0 : el.dataset.hudPiece === 'top' ? -24 : 24)
			},
			{
				autoAlpha: 1,
				y: 0,
				duration: reduced ? 0.2 : DUR.base,
				ease: reduced ? 'none' : EASE.steer,
				stagger: reduced ? 0 : STAGGER.rows,
				clearProps: 'transform'
			}
		);
	}

	/** Status messages (§6) are shown once per session, after the preloader. */
	function statusOnce(key: string, title: string) {
		if (readStore(key, 'session')) return;
		writeStore(key, '1', 'session');
		toast({ kind: 'info', title });
	}

	// Context line: HUD decode on change (§3.3), instant under reduced motion or when long.
	$effect(() => {
		const text = context;
		if (!contextEl) return;
		if (!chrome.hudIn || device.reducedMotion) contextEl.textContent = text;
		else decode(contextEl, text);
	});

	// The governor's first step down is announced once per session (§6: "honesty is a feature");
	// later steps only update the HUD note.
	$effect(() => {
		const step = governorStep();
		if (step) untrack(() => statusOnce('hyv.st.governor', t().status.governor(step)));
	});

	onMount(() => {
		loadAchievements();
		loadSfx();
		restoreDeveloperMode();
		const offKonami = listenKonami();
		let alive = true;

		void whenBooted().then(() => {
			if (!alive) return;
			try {
				enter();
			} catch {
				chrome.hudIn = true;
			}
			if (device.webgl === 'none') statusOnce('hyv.st.nowebgl', t().status.noWebgl);
			if (device.reducedMotion) statusOnce('hyv.st.reduced', t().status.reducedMotion);
		});

		// Nav highlight: re-read the section at most 4×/s, only while the page moves.
		let lastY = Number.NaN;
		let lastCheck = 0;
		const offFrame = onFrame((time) => {
			if (scroll.y === lastY || time - lastCheck < 0.25) return;
			lastY = scroll.y;
			lastCheck = time;
			const id = currentSectionId();
			if (id !== activeSection) activeSection = id;
		}, PRIORITY.ui);

		return () => {
			alive = false;
			offKonami();
			offFrame();
		};
	});
</script>

<header class="hud hud-text" class:in={chrome.hudIn} bind:this={root}>
	<div class="corner tl">
		<a
			class="tag"
			href={home}
			aria-label={t().nav.home}
			data-hud-piece="top"
			data-hud-slot="tag"
			onclick={onTag}
			onpointerup={onTagTap}>{t().hud.buildTag}</a
		>
	</div>

	<nav class="corner tc" aria-label={t().nav.aria} data-hud-piece="top">
		<ul role="list">
			{#each t().nav.items as item (item.id)}
				<li>
					<a
						href={navHref(item.id)}
						aria-current={NAV_GROUPS[item.id]?.includes(activeSection) ? 'location' : undefined}
						onclick={(e) => go(item.id, e)}>{item.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="corner tr" data-hud-piece="top">
		<span class="lang-full"><LangToggle /></span>
		<span class="lang-pill"><LangToggle pill /></span>
		<button class="sfx" aria-pressed={sfxState.enabled} onclick={toggleSfx}
			><span class="visually-hidden">{t().hud.sfx.aria}: </span>{sfxState.enabled
				? t().hud.sfx.on
				: t().hud.sfx.off}</button
		>
		<span class="settings"><Settings {go} {navHref} /></span>
	</div>

	<div class="corner bl">
		<div class="gl-only" data-hud-piece="bottom" data-hud-slot="keys"><ViewKeys /></div>
		{#if selected}
			<p class="selected">{selected}</p>
		{/if}
		<p class="context" data-hud-piece="bottom" data-hud-slot="context" bind:this={contextEl}></p>
	</div>

	<div class="corner br">
		<HudStats />
	</div>
</header>

<style>
	.hud {
		position: fixed;
		inset: var(--frame-inset);
		z-index: var(--z-hud);
		pointer-events: none;
		color: var(--ink);
	}

	/*
		Map-label backing: a paper plate 3px around each HUD piece. Invisible on the paper itself, it
		keeps the mono legible when the crowd streams under a corner (the canvas is z 20, the HUD 40).
	*/
	.hud :global(:is([data-hud-piece], .selected):not([data-hud-slot='budget'])) {
		background: var(--paper);
		box-shadow: 0 0 0 3px var(--paper);
	}

	.hud .context:empty {
		background: none;
		box-shadow: none;
	}

	/* Hidden until the entrance (JS only: without JS the HUD is simply there). */
	:global(html.js) .hud:not(.in) :global([data-hud-piece]) {
		opacity: 0;
		visibility: hidden;
	}

	.corner {
		position: absolute;
		display: flex;
		gap: 18px;
		align-items: center;
	}

	.corner :global(a),
	.corner :global(button) {
		pointer-events: auto;
	}

	.tl {
		top: 14px;
		left: 18px;
	}

	.tc {
		top: 14px;
		left: 50%;
		transform: translateX(-50%);
	}

	.tc ul {
		display: flex;
		gap: 22px;
	}

	.tc a {
		padding: 0;
		background: none;
		color: var(--graphite);
		white-space: nowrap;
		transition: color var(--t-micro) steps(2);
	}

	.tc a:hover,
	.tc a[aria-current] {
		color: var(--ink);
	}

	.tc a[aria-current]::before {
		content: '◆ ';
		color: var(--signal);
		font-size: 0.8em;
	}

	.tr {
		top: 14px;
		right: 18px;
		position: absolute;
	}

	.settings {
		position: relative;
		display: inline-flex;
	}

	.lang-pill {
		display: none;
	}

	.sfx {
		color: var(--graphite);
		text-transform: inherit;
		white-space: nowrap;
	}

	.sfx[aria-pressed='true'],
	.sfx:hover {
		color: var(--ink);
	}

	.bl {
		bottom: 14px;
		left: 18px;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
	}

	.selected {
		color: var(--signal-text);
	}

	.context {
		min-height: 1.3em;
		color: var(--graphite);
		white-space: nowrap;
	}

	.br {
		bottom: 14px;
		right: 18px;
	}

	.tag {
		white-space: nowrap;
	}

	@media (max-width: 1023px) {
		.tc {
			display: none;
		}
	}

	@media (max-width: 767px) {
		.tl,
		.tr {
			top: 10px;
		}

		.tl {
			left: 12px;
			min-height: 34px;
		}

		.tr {
			right: 12px;
			gap: 14px;
		}

		.tag {
			display: inline-flex;
			align-items: center;
			min-height: 34px;
		}

		.lang-full,
		.sfx,
		.bl,
		.br {
			display: none;
		}

		.lang-pill {
			display: inline-flex;
		}
	}
</style>
