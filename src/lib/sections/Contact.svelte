<!--
	08 · PRESS START (theme ink): the bookend. A co-op lobby ringed by entities ('contact-ring'),
	the headline, the email as huge selectable type with COPY / PRESS START / RECRUIT THIS UNIT,
	then the footer: the horde comes home and rebuilds HYVERNO ('footer-name'), and the last 30vh
	scrub the crowd back into the spawner while the counter rolls to 00000 (Completionist).
	RESPAWN ↑ flies back to the top and replays the landing. No WebGL: every DOM part still works
	and the footer shows the name as type.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { collider, hudLine, interact, reveal, themeSection } from '#lib/core/actions';
	import { TIER, device } from '#lib/core/device.svelte';
	import { DUR, EASE, gsap, mm } from '#lib/core/motion';
	import { scroll, scrollTo } from '#lib/core/scroll.svelte';
	import { stats } from '#lib/core/stats.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { whenBooted } from '#lib/core/boot.svelte';
	import { formation } from '#lib/gl/actions';
	import type { Engine, FormationSource } from '#lib/gl/types';
	import { site } from '#lib/content/content';
	import { fmtNum, loc, t } from '#lib/i18n/index.svelte';
	import { ACH_TOTAL, ach, toast, unlock } from '#lib/stores/achievements.svelte';
	import { sfx } from '#lib/ui/sfx';
	import Keycap from '#lib/ui/Keycap.svelte';
	import Lobby from './Lobby.svelte';
	import { COPY } from './tail/copy';
	import { tailEngine, trackPageHeight, watchLayout, type TailCrowd } from './tail/crowd';
	import {
		FOOTER_NAME,
		FOOTER_NAME_TALL,
		NAME_ID,
		RING_ID,
		SPAWN_ID,
		ringLanes,
		ringSource
	} from './tail/formations';

	const DESPAWN_OWNER = 'despawn';
	const RESPAWN_OWNER = 'respawn';
	/** The last 30vh of the page scrub the crowd back into the spawner. */
	const DESPAWN_VH = 0.3;
	const RING_OFFSET = 26;
	const RING_GAP = 4;

	let lobbyEl = $state<HTMLElement>();
	let emailEl = $state<HTMLElement>();
	let nameEl = $state<HTMLElement>();
	let engine: Engine | null = null;
	let crowd: TailCrowd | null = null;
	let engineOk = $state(false);
	let ringInit = $state<FormationSource | null>(null);
	let ringKey = '';

	let joined = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	/** Simulated entities (real once the engine runs; 0 in the static build). */
	let simN = $state(TIER.high.sim ** 2);
	/** Despawn progress over the last 30vh, 0..1. */
	let despawn = $state(0);
	let completed = false;
	let traveling = false;
	let offTravel: (() => void) | null = null;
	let waveTimer: ReturnType<typeof setTimeout> | undefined;
	/** True while this section holds the crowd's alpha below 1 (it must give it back). */
	let alphaMine = false;
	let mounted = $state(false);
	let startedAt = 0;
	let sessionClock = $state('00:00');

	const mailto = `mailto:${site.email}`;
	const recruitHref = $derived(
		`mailto:${site.email}?subject=${encodeURIComponent(t().contact.recruitSubject)}`
	);
	const socials = $derived(
		(['github', 'linkedin', 'steam'] as const)
			.filter((k) => site.socials[k])
			.map((k) => ({ key: k, url: site.socials[k], label: t().contact.socials[k] }))
	);
	const alive = $derived(Math.round(simN * (1 - despawn)));
	const staticBuild = $derived(mounted && device.webgl === 'none');
	const stage = $derived(
		staticBuild
			? t().boot.log.noWebgl
			: despawn >= 0.995
				? loc(COPY.despawned)
				: despawn > 0.001
					? loc(COPY.despawning)
					: loc(COPY.alive)
	);
	const pad5 = (n: number) => String(Math.max(0, Math.round(n))).padStart(5, '0');
	const lobbyLine = $derived(`${loc(COPY.lobby)} ${joined ? 2 : 1}/4`);
	const headline = $derived(t().contact.headline);
	/** Phones get the tall cut of the name (see formations.ts). */
	const nameSource = $derived(mounted && device.mobile ? FOOTER_NAME_TALL : FOOTER_NAME);

	function join() {
		joined = true;
	}

	// ── COPY: clipboard with a graceful fallback, 24 crits, toast, Networking ───────────────────
	function selectEmail() {
		if (!emailEl) return;
		const range = document.createRange();
		range.selectNodeContents(emailEl);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	function legacyCopy(): boolean {
		selectEmail();
		let ok = false;
		try {
			// Deprecated, but the only synchronous path left on old / insecure contexts.
			ok = document.execCommand('copy');
		} catch {
			ok = false;
		}
		if (ok) window.getSelection()?.removeAllRanges();
		return ok;
	}

	async function copyEmail(e: MouseEvent) {
		const btn = e.currentTarget as HTMLElement;
		let ok = false;
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(site.email);
				ok = true;
			}
		} catch {
			ok = false;
		}
		if (!ok) ok = legacyCopy();
		if (!ok) {
			// Leave the address selected so a manual copy is one keystroke away.
			selectEmail();
			toast({ title: t().contact.copy.failed });
			return;
		}
		const r = btn.getBoundingClientRect();
		engine?.numbers.burst(r.left + r.width / 2, r.top + r.height / 2, {
			count: 24,
			radius: Math.max(36, r.width * 0.45),
			critRate: 1
		});
		sfx('crit');
		// The XP line is earned in the moment: queued like a trophy, so it shows before Networking.
		toast({ title: t().contact.copy.done, kind: 'ach' });
		unlock('networking');
		joined = true;
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1800);
	}

	// ── RESPAWN: fly to the top, then replay the landing ──────────────────────────────────────
	function respawn() {
		if (traveling) return;
		sfx('ping');
		const c = crowd;
		if (!c) {
			scrollTo(0, { duration: 2.2 });
			return;
		}
		traveling = true;
		// Everyone is back in the spawner: hold them there (hidden) for the trip up. Claim first,
		// then drop the despawn claim, so the anchors never grab the crowd in between.
		c.claim(RESPAWN_OWNER);
		c.release(DESPAWN_OWNER);
		alphaMine = true;
		c.blend(SPAWN_ID, SPAWN_ID, 1, { owner: RESPAWN_OWNER });
		c.setAlpha(0, { duration: device.reducedMotion ? 0 : 0.18 });
		scrollTo(0, { duration: 2.2 });
		const t0 = performance.now();
		offTravel = onFrame(() => {
			if (c.owner === RESPAWN_OWNER) c.blend(SPAWN_ID, SPAWN_ID, 1, { owner: RESPAWN_OWNER });
			// Arrived, or the visitor took the wheel: either way, land the crowd.
			const arrived = scroll.y < 2 || performance.now() - t0 > 3200;
			if (arrived) land(c);
		}, PRIORITY.ui);
	}

	function land(c: TailCrowd) {
		offTravel?.();
		offTravel = null;
		traveling = false;
		c.release(RESPAWN_OWNER);
		// The spawn disc lands into whatever the top of the page asks for, like the boot did.
		c.setAlpha(1, { duration: device.reducedMotion ? 0 : 0.3 });
		alphaMine = false;
		clearTimeout(waveTimer);
		if (!device.reducedMotion) waveTimer = setTimeout(() => c.sendWave({ duration: 0.6 }), 1100);
	}

	// ── contact-ring geometry (measured; rebuilt only when the lobby box changes) ──────────────
	function remeasureRing() {
		if (!lobbyEl || !crowd) return;
		const r = lobbyEl.getBoundingClientRect();
		if (r.width < 8) return;
		const src = ringSource({
			width: r.width,
			height: r.height,
			offset: RING_OFFSET,
			gap: RING_GAP,
			lanes: ringLanes(crowd.N, r.width, r.height, device.mobile)
		});
		const key = JSON.stringify(src);
		if (key === ringKey) return;
		ringKey = key;
		if (!ringInit) ringInit = src;
		else void crowd.define(RING_ID, src, { el: lobbyEl, space: 'page' });
	}

	// Tier changes re-plan the ring lanes and the footer count.
	$effect(() => {
		const ent = stats.entities;
		untrack(() => {
			if (crowd && ent > 0) simN = crowd.N;
			requestAnimationFrame(remeasureRing);
		});
	});

	onMount(() => {
		let disposed = false;
		let offZone: (() => void) | null = null;
		let offHeight = () => {};
		mounted = true;
		startedAt = performance.now();
		const offLayout = lobbyEl ? watchLayout([lobbyEl], remeasureRing, 200) : () => {};
		const clock = setInterval(() => {
			const s = Math.floor((performance.now() - startedAt) / 1000);
			sessionClock = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
		}, 1000);

		const setDespawn = (p: number) => {
			const c = crowd;
			const reduced = device.reducedMotion;
			const q = reduced ? (p >= 0.5 ? 1 : 0) : p;
			despawn = q;
			if (q >= 0.995 && !completed) {
				completed = true;
				unlock('completionist');
			}
			if (!c || traveling) return;
			if (q > 0) {
				const owner = c.owner;
				// Someone else holds the crowd (Ink Swarm, #1,445): wait for them to let go.
				if (owner !== DESPAWN_OWNER) {
					if (owner !== null) return;
					c.claim(DESPAWN_OWNER);
				}
				c.blend(NAME_ID, SPAWN_ID, q, { owner: DESPAWN_OWNER });
				// Back in the spawner = despawned: the last stretch fades them out (00000).
				const a = 1 - Math.min(1, Math.max(0, (q - 0.78) / 0.2));
				c.setAlpha(a * a * (3 - 2 * a));
				alphaMine = a < 1;
			} else {
				c.release(DESPAWN_OWNER);
				if (alphaMine) c.setAlpha(1);
				alphaMine = false;
			}
		};

		void (async () => {
			const h = await tailEngine();
			if (disposed) return;
			if (h) {
				engine = h.engine;
				crowd = h.crowd;
				simN = h.crowd.N;
				engineOk = true;
				offHeight = trackPageHeight(h.crowd);
				requestAnimationFrame(remeasureRing);
			} else {
				simN = 0;
			}
			// Never fight the preloader for the crowd.
			await whenBooted();
			if (disposed) return;
			// The last 30vh, from the live scroll limit (sections above may still change height,
			// and a ScrollTrigger's cached end would lag until the next refresh). Pure arithmetic.
			let last = -1;
			offZone = onFrame(() => {
				const span = window.innerHeight * DESPAWN_VH;
				const from = scroll.limit - span;
				const p = scroll.limit > span ? Math.min(1, Math.max(0, (scroll.y - from) / span)) : 0;
				if (Math.abs(p - last) < 1e-4) return;
				last = p;
				setDespawn(p);
			}, PRIORITY.ui);
		})();

		// Headline + email + actions reveal; the end screen's gizmo and counter rise with it.
		const offReveal = mm(({ reduced }) => {
			const items = document.querySelectorAll<HTMLElement>('#contact [data-rise]');
			if (reduced) {
				gsap.from(items, {
					autoAlpha: 0,
					duration: 0.2,
					ease: 'none',
					stagger: 0.04,
					scrollTrigger: { trigger: items[0] ?? '#contact', start: 'top 88%', once: true }
				});
				return;
			}
			items.forEach((el) =>
				gsap.from(el, {
					y: 24,
					autoAlpha: 0,
					duration: DUR.reveal,
					ease: EASE.steer,
					scrollTrigger: { trigger: el, start: 'top 90%', once: true }
				})
			);
		});

		return () => {
			disposed = true;
			offLayout();
			offReveal();
			clearInterval(clock);
			clearTimeout(copyTimer);
			clearTimeout(waveTimer);
			offZone?.();
			offTravel?.();
			offHeight();
			if (crowd) {
				crowd.release(DESPAWN_OWNER);
				crowd.release(RESPAWN_OWNER);
				if (alphaMine) crowd.setAlpha(1);
			}
		};
	});
</script>

<section
	id="contact"
	data-section="contact"
	data-theme="ink"
	class="section contact"
	use:themeSection={'ink'}
	use:hudLine={{ section: t().contact.index.slice(0, 2), label: t().contact.hud, line: lobbyLine }}
>
	<div class="wrap">
		<p class="index hud-text graphite">{t().contact.index}</p>
		<p class="visually-hidden">{t().contact.canvas}</p>

		<div class="lobby-zone">
			<Lobby bind:el={lobbyEl} {joined} {mailto} onjoin={join} />
			{#if engineOk && ringInit && lobbyEl}
				<div
					class="anchor"
					aria-hidden="true"
					use:formation={{ id: RING_ID, source: ringInit, region: lobbyEl }}
				></div>
			{/if}
		</div>

		<h2
			class="headline t-display"
			use:reveal={{ mode: 'lines', widthMarch: true }}
			use:collider={{ pad: 8 }}
		>
			{headline.pre}<em class="serif">{headline.em}</em>{headline.post}
		</h2>

		<div class="reach">
			<p class="email-label hud-text graphite" data-rise>{t().contact.email}</p>
			<p class="email" bind:this={emailEl} use:collider={{ pad: 14 }} data-rise>{site.email}</p>

			<div class="actions" data-rise>
				<button
					type="button"
					class="btn copy"
					class:done={copied}
					aria-label={t().contact.copy.aria}
					use:interact={{ verb: t().cursor.verbs.copy }}
					onclick={copyEmail}
				>
					<Keycap key="E" size="micro" active={copied} />
					<span class="btn-label">{copied ? t().contact.copy.done : t().cursor.verbs.copy}</span>
				</button>

				<a
					class="cta"
					href={mailto}
					use:interact={{ verb: t().cursor.verbs.start }}
					onclick={join}
				>
					<span class="cta-fill" aria-hidden="true"></span>
					<span class="cta-corners" aria-hidden="true"></span>
					<span class="cta-label">{t().contact.cta}</span>
					<span class="cta-enter mono" aria-hidden="true">{t().cursor.enter}</span>
				</a>

				<a class="recruit hud-text" href={recruitHref}
					>{t().contact.recruit} <span aria-hidden="true">→</span></a
				>
			</div>

			{#if socials.length}
				<nav class="socials" aria-label={t().contact.socials.aria} data-rise>
					<ul role="list">
						{#each socials as s (s.key)}
							<li><a class="link hud-text" href={s.url} rel="me noopener">{s.label}</a></li>
						{/each}
					</ul>
				</nav>
			{/if}
		</div>
	</div>

	<footer class="foot">
		<div class="wrap">
			<!-- The horde comes home: the crowd rebuilds the name here (type in the static build). -->
			<div
				class="wordmark"
				class:tall={nameSource === FOOTER_NAME_TALL}
				bind:this={nameEl}
				aria-hidden="true"
				use:formation={{
					id: NAME_ID,
					source: nameSource,
					preset: 'march',
					start: 'top 95%',
					end: 'top 45%'
				}}
			>
				<span class="wordmark-text static-only">HYVERNO</span>
			</div>
		</div>

		<div class="end wrap">
			<div class="spawn" data-rise>
				<svg class="gizmo" viewBox="-40 -40 80 80" aria-hidden="true">
					<circle class="orbit" r="30" />
					<circle class="pulse" r="16" />
					<circle class="ring" r="16" />
					<circle class="core" r="3" />
					<path class="ticks" d="M0-22v-5M0 22v5M-22 0h-5M22 0h5" />
				</svg>
				<div class="counter">
					<p class="stage hud-text">{stage}</p>
					{#if !staticBuild}
						<p class="count mono">
							<span class="visually-hidden">{fmtNum(alive)} / {fmtNum(simN)}</span>
							<span aria-hidden="true">{pad5(alive)} / {simN}</span>
						</p>
					{/if}
				</div>
			</div>

			<div class="below">
				<button
					type="button"
					class="respawn"
					aria-describedby="respawn-desc"
					use:interact={{ verb: t().cursor.verbs.respawn }}
					onclick={respawn}
					data-rise
				>
					<span class="respawn-label">{t().contact.respawn.replace(/\s*↑\s*$/, '')}</span>
					<span aria-hidden="true">↑</span>
				</button>
				<span id="respawn-desc" class="visually-hidden">{t().contact.respawnAria}</span>

				<div class="colophon">
					<p class="session micro graphite">
						{loc(COPY.session)}
						{sessionClock} · {loc(COPY.numbers)}
						{fmtNum(stats.numbersDrawn)} · {loc(COPY.trophies)}
						{String(ach.unlocked.length).padStart(2, '0')}/{ACH_TOTAL}
					</p>
					<p class="footer-line hud-text">{t().contact.footer(fmtNum(simN))}</p>
				</div>
			</div>
		</div>
	</footer>
</section>

<style>
	.contact {
		padding-bottom: 0;
	}

	.index {
		margin-bottom: clamp(48px, 7vw, 96px);
	}

	/* ── lobby + ring ─────────────────────────────────────────────────────────── */
	.lobby-zone {
		position: relative;
		/* Room for the ring of entities around the lobby. */
		padding: clamp(40px, 5vw, 72px) clamp(16px, 4vw, 72px);
		margin: 0 auto clamp(64px, 8vw, 120px);
		max-width: 1180px;
	}

	.anchor {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		pointer-events: none;
	}

	/* ── headline + email ─────────────────────────────────────────────────────── */
	.headline {
		max-width: 15ch;
		margin-bottom: clamp(48px, 6vw, 96px);
	}

	.email-label {
		margin-bottom: 10px;
	}

	.email {
		--wdth: 88;
		max-width: none;
		font-family: var(--font-sans);
		font-size: clamp(1.5rem, 5vw, 5rem);
		line-height: 1;
		font-weight: 700;
		font-stretch: 88%;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
		user-select: text;
		-webkit-user-select: text;
		cursor: text;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 18px 28px;
		margin-top: clamp(28px, 3.4vw, 48px);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 0 18px 0 12px;
		font-family: var(--font-mono);
		font-size: var(--fs-hud);
		letter-spacing: var(--tr-hud);
		text-transform: uppercase;
		border: 1px solid color-mix(in srgb, var(--ink) 40%, transparent);
		color: var(--ink);
		transition:
			border-color var(--t-micro) steps(2),
			background-color var(--t-micro) steps(2);
	}

	.btn:hover {
		border-color: var(--ink);
	}

	.btn.done {
		border-color: var(--debug-lime);
	}

	.btn:active,
	.btn:global([data-pressed]) {
		transform: translateY(1px);
	}

	/* Primary CTA (§3.6): brackets push out 6px, the ink fill sweeps in steps(4), [ ENTER ]. */
	.cta {
		position: relative;
		display: inline-grid;
		place-items: center;
		min-height: 56px;
		padding: 0 34px;
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: clamp(1rem, 0.9rem + 0.4vw, 1.25rem);
		font-weight: 750;
		font-stretch: 88%;
		letter-spacing: 0.04em;
		isolation: isolate;
	}

	.cta > * {
		grid-area: 1 / 1;
	}

	.cta-fill {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--ink);
		transform: scaleX(0);
		transform-origin: 0 50%;
		transition: transform var(--t-fast) steps(4, end);
	}

	.cta-corners {
		--c: var(--ink);
		--l: var(--bracket);
		--w: var(--bracket-w);
		position: absolute;
		inset: -4px;
		pointer-events: none;
		background:
			linear-gradient(var(--c) 0 0) 0 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--w) var(--l) no-repeat;
		transition: inset var(--t-fast) var(--ease-steer);
	}

	/* Swapped with opacity (not visibility) so the link keeps its accessible name on focus. */
	.cta-enter {
		font-size: var(--fs-hud);
		font-weight: 500;
		letter-spacing: var(--tr-hud);
		color: var(--paper);
		opacity: 0;
	}

	.cta:hover .cta-fill,
	.cta:focus-visible .cta-fill {
		transform: scaleX(1);
	}

	.cta:hover .cta-corners,
	.cta:focus-visible .cta-corners {
		inset: -10px;
	}

	.cta:hover .cta-label,
	.cta:focus-visible .cta-label {
		opacity: 0;
	}

	.cta:hover .cta-enter,
	.cta:focus-visible .cta-enter {
		opacity: 1;
	}

	.recruit {
		color: var(--ink);
		padding: 14px 2px;
		background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1.25px);
		background-size: 5px 2px;
		background-repeat: repeat-x;
		background-position: 0 calc(100% - 8px);
	}

	.recruit:hover {
		animation: ants 400ms linear infinite;
	}

	@keyframes ants {
		to {
			background-position: 5px calc(100% - 8px);
		}
	}

	.socials ul {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 22px;
		list-style: none;
		padding: 0;
		margin-top: var(--s-4);
	}

	/* ── footer: the wordmark ─────────────────────────────────────────────────── */
	.foot {
		margin-top: clamp(120px, 16vw, 240px);
	}

	.wordmark {
		position: relative;
		width: 100%;
		aspect-ratio: 6592 / 712;
		container-type: inline-size;
		display: grid;
		place-items: center;
	}

	.wordmark.tall {
		aspect-ratio: 3437 / 712;
	}

	.wordmark.tall .wordmark-text {
		font-size: 28.4cqw;
		font-stretch: 62%;
	}

	/* Static build: the name as halftone type, the same Archivo 900 wdth 125 the crowd forms. */
	.wordmark-text {
		font-family: var(--font-sans);
		font-size: 14.85cqw;
		line-height: 0.75;
		font-weight: 900;
		font-stretch: 125%;
		letter-spacing: 0;
		color: transparent;
		background: radial-gradient(circle, var(--ink) 0 1.35px, transparent 1.6px) 0 0 / 4px 4px;
		-webkit-background-clip: text;
		background-clip: text;
		white-space: nowrap;
	}

	/* ── the end screen: spawner, counter, RESPAWN, colophon ──────────────────── */
	/* 100svh, and the gizmo dead centre: at the very bottom of the page the spawn disc (a
	   viewport-space formation) collapses exactly onto it. Everything shares one column. */
	.end {
		position: relative;
		min-height: 100svh;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: 1fr auto 1fr;
		justify-items: center;
		align-items: center;
	}

	.end > * {
		grid-column: 1;
	}

	.spawn {
		grid-row: 2;
		position: relative;
		width: 80px;
		height: 80px;
	}

	.gizmo {
		width: 80px;
		height: 80px;
		overflow: visible;
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-linecap: square;
	}

	.orbit {
		stroke: var(--graphite);
		stroke-width: 1;
		stroke-dasharray: 2 5;
		transform-origin: 0 0;
		animation: orbit 6s linear infinite;
	}

	.pulse {
		stroke: var(--signal);
		stroke-width: 1;
		transform-origin: 0 0;
		animation: pulse 0.9s var(--ease-despawn) infinite;
	}

	.core {
		fill: var(--signal);
		stroke: none;
	}

	@keyframes orbit {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(2.6);
			opacity: 0;
		}
	}

	/* Under the gizmo, out of flow, so the gizmo itself is what sits at the centre. */
	.counter {
		position: absolute;
		top: calc(100% + 22px);
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		justify-items: center;
		gap: 8px;
	}

	.counter p {
		max-width: none;
		white-space: nowrap;
		text-wrap: nowrap;
	}

	.count {
		font-size: var(--fs-h2);
		line-height: 1;
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	/* RESPAWN under the counter, the colophon at the bottom: one flow, they never overlap. */
	.below {
		grid-row: 3;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	.respawn {
		margin-top: calc(22px + 6.5rem);
		min-height: 48px;
		padding: 0 22px;
		font-family: var(--font-mono);
		font-size: var(--fs-hud);
		letter-spacing: 0.12em;
		color: var(--ink);
		border: 1px solid color-mix(in srgb, var(--ink) 45%, transparent);
		transition: border-color var(--t-micro) steps(2);
	}

	.respawn:hover {
		border-color: var(--ink);
	}

	/* Centred above the HUD's bottom corners (they own the last ~100px of the viewport). */
	.colophon {
		margin-top: auto;
		display: grid;
		justify-items: center;
		gap: 8px;
		max-width: min(100%, 62rem);
		padding: 18px 0 clamp(96px, 13vh, 132px);
		text-align: center;
	}

	.footer-line {
		max-width: 56ch;
		color: var(--ink);
		text-transform: none;
		letter-spacing: 0.02em;
		text-wrap: balance;
	}

	.session {
		max-width: none;
	}

	@media (max-width: 767px) {
		/* The ring reaches ~46px out from the lobby: keep it clear of the index label. */
		.lobby-zone {
			padding: 56px 6px 44px;
		}

		.headline {
			max-width: none;
		}

		.actions {
			gap: 16px;
		}

		.cta {
			width: 100%;
		}

		.colophon {
			padding-bottom: 88px;
		}
	}
</style>
