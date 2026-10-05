<!--
	04c · Le Rongeur (DESIGN.md §5, theme `rongeur`): a brand takeover in free scroll. Cream rises
	over Stixiva on a bitten edge, Pépite peeks out of the largest bite. "IL RONGE LES PRIX." (French
	in every language), a giant example price that gets gnawed by the scroll and by the visitor,
	apricot "deals" (the crowd, formation `rongeur-stream`) streaming from the merchant labels into
	Pépite's cheeks. The exit bites the cream away into the dark Lab while Pépite waves.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { collider, hudLine, reveal, themeSection } from '#lib/core/actions';
	import { ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { hexToLinear } from '#lib/core/theme.svelte';
	import { formation } from '#lib/gl/actions';
	import { getEngine } from '#lib/gl/handle';
	import { i18n, langHref, loc, t } from '#lib/i18n/index.svelte';
	import { NBSP } from '#lib/i18n/format';
	import { sideProjects, stackOf } from '#lib/content/content';
	import { progress } from '#lib/stores/achievements.svelte';
	import { sfx } from '#lib/ui/sfx';
	import { SSR_SEED, visitSeed } from './bites';
	import { APRICOT, NOMINAL, STREAM_ID, streamPaths, streamSource, type StreamLayout } from './formations';
	import BiteEdge from './BiteEdge.svelte';
	import BittenBlob from './BittenBlob.svelte';
	import BittenPrice from './BittenPrice.svelte';
	import Pepite, { CHEEK_L, CHEEK_R, MOUTH, PEPITE_VIEW } from './Pepite.svelte';
	import { domCrumbs } from './crumbs';

	const EDGE_H = 150;
	const EDGE_INSET = 54;
	const MAX_BITES = 12;

	const project = sideProjects.find((p) => p.slug === 'le-rongeur')!;
	const apricotLinear = hexToLinear(APRICOT);

	let section = $state<HTMLElement>();
	let rowEl = $state<HTMLDivElement>();
	let leftEl = $state<HTMLDivElement>();
	let topEdgeEl = $state<HTMLDivElement>();
	let bottomEdgeEl = $state<HTMLDivElement>();
	let mainPepite = $state<ReturnType<typeof Pepite>>();
	let pepiteBox = $state<HTMLDivElement>();
	let merchantEls: HTMLElement[] = $state([]);

	let seed = $state(SSR_SEED);
	let layout = $state<StreamLayout>(NOMINAL);
	let still = $state(false);
	const streamSrc = $derived(streamSource(layout, still));
	const fallbackPaths = $derived(streamPaths(layout));

	let bites = $state(0);
	let pulse = $state(1);
	let look = $state<{ x: number; y: number } | null>(null);
	let peekY = $state(1);
	let exitChomp = $state(0);
	let topChomp = $state(0);
	let stampLine = $state('');

	const cheeks = $derived(Math.min(2.15, (1 + 0.6 * (bites / MAX_BITES)) * pulse));

	const merchants = $derived.by(() => {
		const raw = t().rongeur.merchants;
		const cut = raw.indexOf(':');
		const lead = (cut >= 0 ? raw.slice(0, cut) : raw).replace(/\s+$/, '');
		const names = (cut >= 0 ? raw.slice(cut + 1) : '')
			.split('·')
			.map((s) => s.trim())
			.filter(Boolean);
		return { lead: `${lead}${NBSP}:`, names };
	});

	const sectionNo = $derived(t().rongeur.index.split(' / ')[0]);

	function onPrice(s: { price: number; pct: number; stamped: boolean; bites: number }) {
		stampLine = s.stamped ? t().rongeur.stamp(String(s.pct)) : '';
	}

	function onBite(b: { x: number; y: number; r: number; n: number }) {
		bites = b.n;
		const coarse = device.coarse;
		const engine = getEngine();
		const count = coarse ? 4 : 8;
		if (engine) engine.numbers.burst(b.x, b.y, { count, radius: Math.max(18, b.r), glyph: 'dot', color: apricotLinear });
		else if (!device.reducedMotion) domCrumbs(b.x, b.y, count);
		progress('cheeks-full', b.n, MAX_BITES);
		sfx('bite');
		mainPepite?.nom();
		arrive(true);
	}

	let pulseTl: gsap.core.Timeline | null = null;
	/** A stream "arrives": the pouches puff (spawn) and settle. */
	function arrive(force = false) {
		if (device.reducedMotion && !force) return;
		pulseTl?.kill();
		const o = { v: pulse };
		pulseTl = gsap
			.timeline({ onUpdate: () => (pulse = o.v) })
			.to(o, { v: 1.35, duration: device.reducedMotion ? 0.001 : 0.26, ease: 'spawn' })
			.to(o, { v: 1, duration: device.reducedMotion ? 0.001 : 0.5, ease: 'steer' }, '+=0.06');
	}

	function measure() {
		if (!rowEl || !pepiteBox) return;
		const R = rowEl.getBoundingClientRect();
		if (R.width < 10) return;
		const svg = pepiteBox.querySelector('svg');
		const Pb = (svg ?? pepiteBox).getBoundingClientRect();
		const k = Pb.width / PEPITE_VIEW;
		const at = (vx: number, vy: number) => ({ x: Pb.left - R.left + vx * k, y: Pb.top - R.top + vy * k });
		let floor = 0;
		const starts = merchantEls
			.filter(Boolean)
			.map((el) => {
				const r = (el.querySelector('.port') ?? el).getBoundingClientRect();
				floor = Math.max(floor, el.getBoundingClientRect().bottom - R.top + 14);
				return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2 };
			});
		const L = leftEl?.getBoundingClientRect();
		const next: StreamLayout = {
			w: R.width,
			h: R.height,
			starts: starts.length ? starts : NOMINAL.starts,
			floor: floor || NOMINAL.floor,
			lane: L ? L.right - R.left + 12 : R.width * 0.6,
			cheekL: at(CHEEK_L.x, CHEEK_L.y),
			cheekR: at(CHEEK_R.x, CHEEK_R.y),
			mouth: at(MOUTH.x, MOUTH.y),
			headTop: Pb.top - R.top + 66 * k,
			cheek: CHEEK_L.r * k,
			// Pépite below the labels (phones, tablets) rather than beside the price.
			stacked: !!L && Pb.top > L.bottom - 10
		};
		// Only a real change re-bakes (the crowd compares paths by value anyway).
		if (JSON.stringify(next) !== JSON.stringify(layout)) layout = next;
	}

	onMount(() => {
		seed = visitSeed();
		still = device.reducedMotion;
		const offs: (() => void)[] = [];

		let raf = 0;
		const schedule = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		};
		const ro = new ResizeObserver(schedule);
		if (rowEl) ro.observe(rowEl);
		if (pepiteBox) ro.observe(pepiteBox);
		offs.push(() => ro.disconnect());
		void document.fonts?.ready.then(schedule);
		ScrollTrigger.addEventListener('refresh', schedule);
		offs.push(() => ScrollTrigger.removeEventListener('refresh', schedule));
		schedule();

		// Pupils follow the pointer while the section is around.
		let near = false;
		const onMove = (e: PointerEvent) => {
			if (!near || e.pointerType === 'touch') return;
			look = { x: e.clientX, y: e.clientY };
		};
		window.addEventListener('pointermove', onMove, { passive: true });
		offs.push(() => window.removeEventListener('pointermove', onMove));

		offs.push(
			mm(({ reduced }) => {
				still = reduced;
				const sts: ScrollTrigger[] = [];

				sts.push(
					ScrollTrigger.create({
						trigger: section,
						start: 'top bottom',
						end: 'bottom top',
						onToggle: (s) => (near = s.isActive)
					})
				);

				// Entrance: the top bites land once, then Pépite peeks out of the largest one; she ducks
				// back in once the section has the screen, and pops out again on the way back up.
				const chomp = { v: topChomp };
				const peek = { v: peekY };
				const showPeek = (on: boolean, delay = 0) =>
					gsap.to(peek, {
						v: on ? 0 : 1,
						delay,
						duration: reduced ? 0.001 : on ? 0.6 : 0.3,
						ease: on ? 'spawn' : 'despawn',
						overwrite: true,
						onUpdate: () => (peekY = peek.v)
					});
				sts.push(
					ScrollTrigger.create({
						trigger: topEdgeEl,
						start: 'top 88%',
						end: 'top 18%',
						onEnter: () => {
							if (chomp.v < 1)
								gsap.to(chomp, { v: 1, duration: reduced ? 0.001 : 0.75, ease: 'none', onUpdate: () => (topChomp = chomp.v) });
							showPeek(true, reduced ? 0 : 0.45);
						},
						onLeave: () => showPeek(false),
						onEnterBack: () => showPeek(true),
						onLeaveBack: () => showPeek(false)
					})
				);

				// Every 1.2s a stream arrives while the deals are on screen.
				let timer = 0;
				const streams = ScrollTrigger.create({
					trigger: rowEl,
					start: 'top bottom',
					end: 'bottom top',
					onToggle: (s) => {
						clearInterval(timer);
						if (s.isActive && !reduced) timer = window.setInterval(() => arrive(), 1200);
					}
				});
				sts.push(streams);

				// Pépite waves goodbye while she is still on screen…
				sts.push(
					ScrollTrigger.create({
						trigger: bottomEdgeEl,
						start: 'top 82%',
						onEnter: () => mainPepite?.waveHello()
					})
				);
				// …then, as the Lab takes the page (its top at mid-screen), the cream gets bitten
				// away from below, in step with the theme turning dark.
				const exit = { v: exitChomp };
				sts.push(
					ScrollTrigger.create({
						trigger: bottomEdgeEl,
						start: 'bottom 52%',
						onEnter: () =>
							gsap.to(exit, { v: 1, duration: reduced ? 0.001 : 0.8, ease: 'none', overwrite: true, onUpdate: () => (exitChomp = exit.v) }),
						onLeaveBack: () =>
							gsap.to(exit, { v: 0, duration: reduced ? 0.001 : 0.4, ease: 'none', overwrite: true, onUpdate: () => (exitChomp = exit.v) })
					})
				);

				return () => {
					for (const s of sts) s.kill();
					gsap.killTweensOf([chomp, peek]);
					clearInterval(timer);
				};
			})
		);

		return () => {
			cancelAnimationFrame(raf);
			for (const off of offs) off();
			pulseTl?.kill();
		};
	});
</script>

<section
	id="rongeur"
	data-section="rongeur"
	data-theme="rongeur"
	class="rongeur"
	bind:this={section}
	use:themeSection={'rongeur'}
	use:hudLine={{ section: sectionNo, label: t().hud.context(sectionNo, t().rongeur.hud), line: stampLine }}
>
	<div class="edge-top" bind:this={topEdgeEl}>
		<BiteEdge side="top" {seed} salt={1} height={EDGE_H} inset={EDGE_INSET} maxR={88} chomp={topChomp}>
			{#snippet behind(host)}
				{@const size = host.r * 2.9}
				<div
					class="peek"
					style:left="{host.x - size / 2}px"
					style:top="{EDGE_INSET - host.r * 0.98}px"
					style:width="{size}px"
					style:transform="translate3d(0, {peekY * host.r * 1.5}px, 0)"
				>
					<Pepite cheeks={1.05} lookAt={look} gaze={{ x: 0.2, y: -0.7 }} />
				</div>
			{/snippet}
		</BiteEdge>
	</div>

	<div class="cream">
		<div class="head wrap grid">
			<p class="index hud-text">{t().rongeur.index}</p>
			<h2 class="t-display headline" lang="fr" use:reveal={{ mode: 'lines', widthMarch: true }} use:collider={{ pad: 8 }}>
				{t().rongeur.headline}
			</h2>
			<p class="sub serif" use:collider={{ pad: 6 }}>{t().rongeur.sub}</p>
			<div class="copy" use:collider={{ pad: 8 }}>
				<p class="line">{t().rongeur.line}</p>
				<p class="body">{loc(project.body[0])}</p>
				<p class="stack micro">{stackOf(project, i18n.lang).join(' · ')}</p>
				<a class="spec-link hud-text link" href={langHref(`/projects/${project.slug}`)}>{t().project.specSheet} →</a>
			</div>
		</div>

		<div class="crumbs wrap" aria-hidden="true">
			<span class="rule"></span>
			<BittenBlob {seed} salt={21} w={46} h={30} />
			<BittenBlob {seed} salt={22} w={30} h={22} fill="var(--r-brown)" />
			<BittenBlob {seed} salt={23} w={22} h={16} />
			<span class="rule"></span>
		</div>

		<div
			class="deal wrap"
			bind:this={rowEl}
			use:formation={{ id: STREAM_ID, source: streamSrc, glyph: 'dot' }}
		>
			<div class="left" bind:this={leftEl} use:collider={{ pad: 6 }}>
				<BittenPrice {seed} onbite={onBite} onchange={onPrice} />
				<p class="merchants mono" lang="fr">
					<span class="lead">{merchants.lead}</span>
					{#each merchants.names as name, i (name)}
						{#if i > 0}<span class="dot" aria-hidden="true">·</span>{/if}
						<span class="m" bind:this={merchantEls[i]}>
							<span class="port" aria-hidden="true"></span>{name}
						</span>
					{/each}
				</p>
			</div>
			<div class="right">
				<div class="pepite" bind:this={pepiteBox} use:collider={{ pad: 2 }}>
					<Pepite bind:this={mainPepite} {cheeks} lookAt={look} label={t().rongeur.pepite} />
				</div>
			</div>
			<p class="visually-hidden">{t().rongeur.canvas}</p>
			<svg
				class="streams static-only"
				viewBox="0 0 {Math.round(layout.w)} {Math.round(layout.h)}"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				{#each fallbackPaths as d, i (i)}
					<path {d} style:animation-delay="{-i * 0.37}s" />
				{/each}
			</svg>
		</div>
	</div>

	<div class="edge-bottom" bind:this={bottomEdgeEl}>
		<BiteEdge side="bottom" {seed} salt={2} height={EDGE_H} inset={EDGE_INSET} maxR={92} chomp={exitChomp} outline={false} />
	</div>
</section>

<style>
	.rongeur {
		--r-cream: #fff3e2;
		--r-brown: #2b1b12;
		--r-apricot: #f2894b;
		--r-graphite: #6e5444;
		--r-hairline: #ebd9c1;
		--r-signal-text: #a4471a;
		position: relative;
		/* The edge band overlaps Stixiva's tail: the bites show the Aida weave underneath. */
		margin-top: -150px;
		color: var(--r-brown);
		z-index: 1;
	}

	.edge-top,
	.edge-bottom {
		position: relative;
	}

	.peek {
		position: absolute;
		will-change: transform;
	}

	.cream {
		position: relative;
		background: var(--r-cream);
		padding-block: clamp(40px, 6vh, 72px) clamp(56px, 9vh, 112px);
	}

	/* ── head ───────────────────────────────────────────────────────── */
	.head {
		row-gap: 14px;
	}

	.index {
		grid-column: 1 / -1;
		color: var(--r-graphite);
	}

	.headline {
		grid-column: 1 / -1;
		color: var(--r-brown);
	}

	.sub {
		grid-column: 1 / -1;
		color: var(--r-signal-text);
		font-size: var(--fs-h2);
		line-height: 1.05;
		max-width: none;
	}

	.copy {
		grid-column: 1 / -1;
		display: grid;
		gap: 8px;
		margin-top: 12px;
	}

	.line {
		font-size: var(--fs-lede);
		line-height: var(--lh-lede);
	}

	.body {
		color: var(--r-graphite);
	}

	.stack {
		color: var(--r-graphite);
	}

	/* ── crumbs divider ─────────────────────────────────────────────── */
	.crumbs {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-block: clamp(32px, 6vh, 64px) clamp(28px, 5vh, 56px);
	}

	.rule {
		flex: 1 1 auto;
		height: 2px;
		background: radial-gradient(circle, var(--r-brown) 0.9px, transparent 1.3px) 0 50% / 8px 2px repeat-x;
		opacity: 0.5;
	}

	/* ── the deal row ───────────────────────────────────────────────── */
	.deal {
		position: relative;
		display: grid;
		gap: 28px;
	}

	.merchants {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px 10px;
		margin-top: clamp(28px, 4vh, 48px);
		font-size: var(--fs-hud);
		letter-spacing: var(--tr-hud);
		text-transform: uppercase;
		color: var(--r-brown);
	}

	.lead {
		color: var(--r-graphite);
	}

	.dot {
		color: var(--r-graphite);
	}

	.m {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	/* A spawner gizmo (circle + dot): where each stream of deals leaves from. */
	.port {
		width: 9px;
		height: 9px;
		border: 1.5px solid var(--r-apricot);
		border-radius: 50%;
		background: radial-gradient(circle, var(--r-apricot) 0 1.6px, transparent 2px);
	}

	.right {
		display: grid;
		justify-items: center;
	}

	.pepite {
		width: min(100%, 440px);
	}

	.streams {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.streams path {
		fill: none;
		stroke: var(--r-apricot);
		stroke-width: 6;
		stroke-linecap: round;
		stroke-dasharray: 0 15;
		animation: flow 1.6s linear infinite;
	}

	@keyframes flow {
		to {
			stroke-dashoffset: -30;
		}
	}

	@media (min-width: 1024px) {
		.sub {
			grid-column: 1 / 8;
		}

		.copy {
			grid-column: 8 / -1;
			margin-top: 0;
			align-self: start;
		}

		.deal {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			column-gap: var(--gutter);
			align-items: end;
		}

		.left {
			grid-column: 1 / 8;
			padding-bottom: 8px;
		}

		.right {
			grid-column: 8 / -1;
		}
	}

	.spec-link {
		display: inline-block;
		margin-top: var(--s-1);
		color: var(--ink);
	}
</style>
