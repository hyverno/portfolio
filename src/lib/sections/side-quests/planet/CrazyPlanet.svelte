<script lang="ts">
	// 04a · Crazy Planet Survivor (§5, §S5 "Floor → Planet"). Desktop: pinned 300vh, the crowd wraps
	// itself into the planet's disc (0–.25), hands over to the GPU planet (.25–.32), the World plays
	// (.32–.85, biome earth → ice at .45–.6) and the planet hands the crowd back through the same disc
	// (.85–1). Touch, narrow or reduced motion: no pin, no handoff, the planet spins on its own.
	import { onMount } from 'svelte';
	import { hudLine, interact, reveal, themeSection } from '#lib/core/actions';
	import { ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { onKey } from '#lib/core/keys';
	import { scrollTo } from '#lib/core/scroll.svelte';
	import { setTheme, type ThemeName } from '#lib/core/theme.svelte';
	import { device } from '#lib/core/device.svelte';
	import { hud } from '#lib/core/stats.svelte';
	import { whenBooted } from '#lib/core/boot.svelte';
	import { whenEngine } from '#lib/gl/handle';
	import { formation, type FormationParams } from '#lib/gl/actions';
	import type { Crowd, Engine } from '#lib/gl/types';
	import { fmtNum, loc, t } from '#lib/i18n/index.svelte';
	import { sideProjects } from '#lib/content/content';
	import { progress as achProgress } from '#lib/stores/achievements.svelte';
	import { sfx } from '#lib/ui/sfx';
	import Keycap from '#lib/ui/Keycap.svelte';
	import PlanetFallback from './PlanetFallback.svelte';
	import { PLANET_DISC } from './disc';
	import { guardLayout } from './layout-guard';
	import { wideCollider } from './wide-collider';
	import type { Biome, Planet } from './PlanetScene';

	const project = sideProjects[0];
	/** The space bar's printed name (French keyboards say « Espace »). */
	const SPACE_KEY = { en: 'SPACE', fr: 'ESPACE' };
	const OWNER = 'planet';
	const MAX_CRATERS = 8;
	/** Section progress where each copy panel takes over (what it is → the stack → the flex). */
	const PANEL_AT = [0, 0.36, 0.66];

	let section = $state<HTMLElement>();
	let stage = $state<HTMLElement>();
	let mode = $state<'pinned' | 'auto' | 'none'>('none');
	let panel = $state(0);
	let biome = $state<Biome>('earth');
	let craters = $state(0);
	let entities = $state(0);
	let castPx = $state(60);
	let over = $state(false);
	let live = $state(false);
	let active = $state(false);
	let anchor = $state<FormationParams | null>(null);
	let orbitL = $state({ x: 0, y: 0 });
	let orbitR = $state({ x: 0, y: 0 });
	let stageW = $state(0);
	let stageH = $state(0);
	let disc = $state({ x: 0, y: 0, r: 0 });
	// Labels ride the ring only while they fit in the stage and stay clear of the planet's disc
	// (they are DOM, under the canvas: the planet would cover them).
	const clear = (x0: number, y0: number, x1: number, y1: number) => {
		const cx = Math.max(x0, Math.min(disc.x, x1));
		const cy = Math.max(y0, Math.min(disc.y, y1));
		return Math.hypot(disc.x - cx, disc.y - cy) > disc.r + 4;
	};
	const showL = $derived(
		orbitL.x > 100 && orbitL.y > 16 && orbitL.y < stageH - 16 && clear(orbitL.x - 100, orbitL.y - 8, orbitL.x, orbitL.y + 8)
	);
	const showR = $derived(
		orbitR.x > 56 &&
			orbitR.x < stageW - 56 &&
			orbitR.y < stageH - 40 &&
			clear(orbitR.x - 48, orbitR.y + 14, orbitR.x + 48, orbitR.y + 34)
	);
	let touch = $state(false);

	const themeName = $derived<ThemeName>(biome === 'ice' ? 'ice' : 'earth');
	const hudText = $derived(
		t().planet.hudLine(
			fmtNum(entities),
			String(craters),
			String(MAX_CRATERS),
			t().planet.biomes[biome]
		)
	);

	// While pinned, the section's own middle band (hudLine) ends early: write the HUD directly.
	$effect(() => {
		if (!active || mode !== 'pinned') return;
		hud.section = '04';
		hud.label = t().planet.hud;
		hud.line = live ? hudText : '';
	});

	const smooth = (a: number, b: number, x: number) => {
		const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
		return k * k * (3 - 2 * k);
	};

	// ── shared runtime (non-reactive) ──────────────────────────────────────────────────────
	let planet: Planet | null = null;
	let engine: Engine | null = null;
	let crowd: Crowd | null = null;
	let progressP = 0;
	let override: Biome | null = null;
	let inBand = false;
	let userCasts = 0;

	function onStats(s: { entities: number; craters: number; biome: Biome }) {
		entities = s.entities;
		craters = s.craters;
		if (!override && mode === 'pinned') return;
		biome = s.biome;
	}

	function setBiome(b: Biome) {
		override = b;
		biome = b;
		planet?.setBiome(b, 0.24);
		setTheme(b === 'ice' ? 'ice' : 'earth');
		sfx('tick');
	}

	function castAt(e: MouseEvent) {
		if (!planet || !live) return;
		if (planet.cast(e.clientX, e.clientY)) {
			e.preventDefault();
			sfx('crit');
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || !planet || !live) return;
		over = planet.over(e.clientX, e.clientY);
	}

	function onUserCast(n: number) {
		userCasts = n;
		achProgress('planet-breaker', Math.min(n, MAX_CRATERS), MAX_CRATERS);
	}

	function stepTo(i: number) {
		const st = pinTrigger;
		if (!st) return;
		const at = i === 0 ? 0.06 : PANEL_AT[i] + 0.04;
		scrollTo(st.start + (st.end - st.start) * at, { duration: 1.2 });
	}

	let pinTrigger: ScrollTrigger | null = null;

	onMount(() => {
		const offGuard = guardLayout();
		touch = device.coarse || !device.finePointer;
		let disposed = false;
		let generation = 0;
		let claimed = false;
		let fromId = 'sq-intro';
		let hand: 'disc' | 'world' | 'outro' = 'disc';
		let crowdHidden = false;
		let sceneModule: typeof import('./PlanetScene') | null = null;

		const loadScene = async () => {
			engine = await whenEngine();
			if (!engine || disposed) return null;
			crowd = engine.crowd;
			if (import.meta.env.DEV) {
				(window as unknown as { __planetCrowd?: () => unknown }).__planetCrowd = () => {
					const c = crowd as Crowd & { blendState?: unknown; alpha?: number; current?: string };
					return { owner: c.owner, blend: c.blendState, alpha: c.alpha, N: c.N };
				};
			}
			await whenBooted();
			if (disposed) return null;
			try {
				sceneModule ??= await import('./PlanetScene');
			} catch (err) {
				// The crowd keeps the disc; the section still reads without the GPU planet.
				console.warn('[planet] scene unavailable', err);
				return null;
			}
			return sceneModule;
		};

		// ── crowd ownership (pinned path) ───────────────────────────────────────────────
		const claim = () => {
			if (claimed || !crowd) return;
			const s = (crowd as Crowd & { blendState?: { from: string; to: string; mix: number } }).blendState;
			const dom = s ? (s.mix >= 0.5 ? s.to : s.from) : 'sq-intro';
			fromId = dom === 'planet-disc' || dom === 'spawn' ? 'sq-intro' : dom;
			crowd.claim(OWNER);
			claimed = true;
		};
		const releaseCrowd = (dur = 0.2) => {
			if (crowdHidden) {
				crowd?.setAlpha(1, { duration: dur });
				crowdHidden = false;
			}
			if (claimed) crowd?.release(OWNER);
			claimed = false;
		};

		const toWorld = (reset: boolean) => {
			if (!planet) return;
			crowd?.setAlpha(0, { duration: 0.15 });
			crowdHidden = true;
			planet.show(true, { duration: 0.15, reset });
			live = true;
		};
		const toCrowd = (dur: number) => {
			if (crowdHidden) crowd?.setAlpha(1, { duration: dur });
			crowdHidden = false;
			planet?.show(false, { duration: dur });
			live = false;
		};

		// The crowd needs a moment to land in the disc: the handoff waits for it (≤ HOLD_S after the
		// disc is fully targeted), unless the reader is already well into the World.
		const HOLD_S = 0.6;
		let discFullAt = -1;
		let gateCall: gsap.core.Tween | null = null;

		/**
		 * The crowd belongs to the planet only while the pin is active. Leaving it (scrolling out,
		 * a nav link, a hash jump, even one that skips the whole pinned range in a single frame)
		 * hands the crowd back at once: claim released, alpha restored, planet hidden. The lagging
		 * scrub may still be catching up; it no longer touches the crowd.
		 */
		const syncActive = (isActive: boolean) => {
			if (active !== isActive) active = isActive;
			if (isActive) {
				claim();
				return;
			}
			gateCall?.kill();
			gateCall = null;
			if (live || hand === 'world') {
				planet?.show(false, { duration: 0.2 });
				live = false;
			}
			hand = (pinTrigger?.progress ?? progressP) >= 0.5 ? 'outro' : 'disc';
			releaseCrowd(0.2);
		};

		const apply = (p: number) => {
			progressP = p;
			const isActive = !!pinTrigger?.isActive;
			if (isActive !== active || (!isActive && (claimed || crowdHidden))) syncActive(isActive);
			// The engine may resolve after the pin became active: claim as soon as the crowd exists.
			else if (isActive && !claimed) claim();
			planet?.setProgress(p);
			panel = p < PANEL_AT[1] ? 0 : p < PANEL_AT[2] ? 1 : 2;
			if (!isActive) return;

			const disc = smooth(0, 0.2, p);
			if (claimed && crowd) crowd.blend(fromId, 'planet-disc', disc, { owner: OWNER });
			const now = performance.now() / 1000;
			if (disc >= 0.999) {
				if (discFullAt < 0) discFullAt = now;
			} else discFullAt = -1;

			// Handoff state machine (the crossfades are time-based; the pose is scrubbed).
			let next: typeof hand = p < 0.25 ? 'disc' : p < 0.95 ? 'world' : 'outro';
			if (next === 'world' && hand === 'disc' && p < 0.31) {
				const waited = discFullAt < 0 ? 0 : now - discFullAt;
				if (waited < HOLD_S) {
					next = 'disc';
					gateCall?.kill();
					gateCall = gsap.delayedCall(HOLD_S - waited + 0.02, () => apply(progressP));
				}
			}
			if (next !== hand && planet) {
				if (next === 'world') toWorld(hand === 'disc');
				else toCrowd(hand === 'world' && next === 'outro' ? 0.2 : 0.15);
				hand = next;
			}

			// Biome: scrubbed earth → ice across .45–.6 unless a chip overrides it until the next pass.
			const band = p >= 0.45 && p <= 0.6;
			if (band && !inBand) override = null;
			inBand = band;
			if (!override) {
				const m = smooth(0.45, 0.6, p);
				planet?.setBiomeMix(m);
				const b: Biome = m >= 0.5 ? 'ice' : 'earth';
				if (b !== biome) biome = b;
				setTheme(b === 'ice' ? 'ice' : 'earth');
			}
		};

		// Planet instances follow the mode; a mode change rebuilds it.
		const build = async (m: 'pinned' | 'auto', reduced: boolean) => {
			const gen = ++generation;
			const mod = await loadScene();
			if (!mod || disposed || gen !== generation || !stage || !engine) return;
			planet?.dispose();
			planet = mod.createPlanet(stage, {
				engine,
				tier: device.tier,
				mode: m,
				reduced,
				onStats,
				onOrbit: (l, r, d) => {
					orbitL = l;
					orbitR = r;
					disc = d;
				},
				onCraterPx: (px) => {
					if (px !== castPx) castPx = px;
				},
				onUserCast
			});
			entities = planet.entities;
			if (m === 'auto') {
				live = true;
				planet.setBiome(biome, 0);
			} else {
				hand = 'disc';
				apply(progressP);
			}
		};

		// The static build (no WebGL) never pins: 300vh for a still image would be a chore.
		let staticOnly = false;
		const setup = ({ reduced, desktop, coarse }: { reduced: boolean; desktop: boolean; coarse: boolean }) => {
			const pinned = desktop && !coarse && !reduced && !staticOnly;
			if (pinned) {
				mode = 'pinned';
				const proxy = { p: 0 };
				const tween = gsap.to(proxy, {
					p: 1,
					ease: 'none',
					scrollTrigger: {
						trigger: section!,
						pin: true,
						start: 'top top',
						end: '+=300%',
						scrub: 1,
						refreshPriority: 30,
						onToggle: (self) => syncActive(self.isActive),
						onRefresh: (self) => syncActive(self.isActive)
					},
					onUpdate: () => apply(proxy.p)
				});
				pinTrigger = tween.scrollTrigger ?? null;
				if (import.meta.env.DEV) {
					// Dev hook for scripted screenshots (pin range and the smoothed progress).
					(window as unknown as { __planetST?: () => unknown }).__planetST = () =>
						pinTrigger && { start: pinTrigger.start, end: pinTrigger.end, p: progressP };
				}
				anchor = {
					id: 'planet-disc',
					source: PLANET_DISC,
					region: stage,
					from: 'sq-intro',
					start: 'top top',
					end: '+=300%',
					// Marching pace: the crowd has a long way to pour from the quest map into the disc.
					preset: 'march'
				};
				void build('pinned', false);
				return () => {
					generation++;
					gateCall?.kill();
					gateCall = null;
					tween.scrollTrigger?.kill();
					tween.kill();
					pinTrigger = null;
					anchor = null;
					active = false;
					releaseCrowd();
					planet?.dispose();
					planet = null;
					live = false;
					hand = 'disc';
				};
			}
			mode = 'auto';
			anchor = null;
			void build('auto', reduced);
			// Keys and HUD while the section crosses the middle of the viewport.
			const band = ScrollTrigger.create({
				trigger: section!,
				start: 'top 60%',
				end: 'bottom 40%',
				onToggle: (self) => (active = self.isActive)
			});
			return () => {
				generation++;
				band.kill();
				active = false;
				planet?.dispose();
				planet = null;
				live = false;
			};
		};
		let revert = mm(setup);
		void whenEngine().then((e) => {
			if (e || disposed || mode !== 'pinned') return;
			staticOnly = true;
			revert();
			revert = mm(setup);
			ScrollTrigger.refresh();
		});

		// Keyboard: Space casts at the visible centre, ←/→ nudge the yaw (only while this is the section).
		const interactive = (e: KeyboardEvent) =>
			e.target instanceof Element && !!e.target.closest('a, button, input, select, textarea, [data-interact], [contenteditable]');
		const offKeys = [
			onKey(' ', (e) => {
				if (!active || !live || !planet || interactive(e)) return;
				e.preventDefault();
				planet.castCenter();
				sfx('crit');
			}),
			onKey('ArrowLeft', (e) => {
				if (!active || !live || !planet || interactive(e)) return;
				e.preventDefault();
				planet.nudge(-1);
			}),
			onKey('ArrowRight', (e) => {
				if (!active || !live || !planet || interactive(e)) return;
				e.preventDefault();
				planet.nudge(1);
			})
		];

		return () => {
			disposed = true;
			generation++;
			for (const off of offKeys) off();
			revert();
			planet?.dispose();
			planet = null;
			releaseCrowd();
			offGuard();
			if (import.meta.env.DEV) {
				const w = window as unknown as Record<string, unknown>;
				delete w.__planetST;
				delete w.__planetCrowd;
			}
		};
	});
</script>

<section
	bind:this={section}
	id="planet"
	data-section="planet"
	data-theme={themeName}
	use:themeSection={themeName}
	use:hudLine={{ section: '04', label: t().planet.hud, line: live ? hudText : '' }}
	class="planet"
	class:pinned={mode === 'pinned'}
>
	{#if anchor}
		<div class="anchor" aria-hidden="true" use:formation={anchor}></div>
	{/if}
	<div class="inner wrap">
		<div class="copy">
			<header class="head">
				<p class="hud-text graphite index">{t().planet.index}</p>
				<h3 class="t-h1 title" use:reveal={{ mode: 'lines', widthMarch: true }} use:wideCollider={{ pad: 6 }}>
					{project.title}
				</h3>
				<p class="t-lede line" use:wideCollider={{ pad: 6 }}>{loc(project.line)}</p>
				<p class="chips-row">
					<span class="status micro">{loc(project.status)}</span>
				</p>
			</header>

			<div class="panels" class:stacked={mode !== 'pinned'}>
				<ol class="steps hud-text" role="list" aria-hidden={mode !== 'pinned'}>
					{#each t().planet.panels as label, i (i)}
						<li>
							<button
								type="button"
								class="step"
								class:on={panel === i}
								tabindex={mode === 'pinned' ? 0 : -1}
								onclick={() => stepTo(i)}
							>
								<span class="n">{String(i + 1).padStart(2, '0')}</span>
								{label}
							</button>
						</li>
					{/each}
				</ol>
				<div class="panel-stack" use:wideCollider={{ pad: 8 }}>
					{#each project.body as body, i (i)}
						<div class="panel" class:on={mode !== 'pinned' || panel === i}>
							<p class="hud-text graphite ptitle">{t().planet.panels[i]}</p>
							{#if i === 1}
								<ul class="stack" role="list">
									{#each project.stack as s (s)}
										<li class="mono">{s}</li>
									{/each}
								</ul>
							{:else}
								<p class="body">{loc(body)}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="controls gl-only">
				<div class="biomes" role="group" aria-label={t().planet.biomeAria}>
					{#each ['earth', 'ice'] as const as b (b)}
						<button
							type="button"
							class="chip hud-text"
							class:on={biome === b}
							aria-pressed={biome === b}
							use:interact={{ verb: t().cursor.verbs.toggle }}
							onclick={() => setBiome(b)}
						>
							[{t().planet.biomes[b]}]
						</button>
					{/each}
				</div>
				<p class="hint hud-text graphite">
					{#if touch}
						{t().planet.castTouch}
					{:else}
						{t().planet.cast}
						<span class="keys" aria-hidden="true">
							<Keycap key={loc(SPACE_KEY)} size="micro" />
							<Keycap key="←" size="micro" /><Keycap key="→" size="micro" />
						</span>
						<span class="visually-hidden">{t().planet.keys}</span>
					{/if}
				</p>
			</div>
			<p class="micro graphite disclaimer">{t().planet.disclaimer}</p>
		</div>

		<div
			class="stage"
			bind:this={stage}
			bind:clientWidth={stageW}
			bind:clientHeight={stageH}
			aria-hidden="true"
			data-no-ping=""
			data-cursor={over && live ? 'cast' : undefined}
			data-cursor-r={castPx}
			onclick={castAt}
			onpointermove={onPointerMove}
			onpointerleave={() => (over = false)}
			role="presentation"
		>
			<div class="static-only fallback">
				<PlanetFallback />
			</div>
			<div class="orbit-label gl-only" class:on={live && showL} style:transform="translate({orbitL.x}px, {orbitL.y}px)">
				<span class="tick"></span>
				<span class="micro">{t().planet.orbit.craters} {craters}/{MAX_CRATERS}</span>
			</div>
			<div class="orbit-label low gl-only" class:on={live && showR} style:transform="translate({orbitR.x}px, {orbitR.y}px)">
				<span class="tick v"></span>
				<span class="micro">{t().planet.orbit.ent} {fmtNum(entities)}</span>
			</div>
		</div>
		<p class="visually-hidden">{t().planet.canvas}</p>
	</div>
</section>

<style>
	.planet {
		position: relative;
		min-height: 100svh;
	}

	.anchor {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		pointer-events: none;
	}

	.inner {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		column-gap: var(--gutter);
		padding-block: var(--section-pad);
	}

	.copy {
		position: relative;
		z-index: 1;
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: clamp(20px, 3.2vh, 36px);
	}

	.head {
		display: grid;
		gap: var(--s-2);
	}

	.title {
		max-width: 12ch;
	}

	.line {
		max-width: 30ch;
	}

	.chips-row {
		display: flex;
		gap: var(--s-1);
	}

	.status {
		display: inline-block;
		padding: 4px 8px 3px;
		border: 1px solid var(--ink);
		color: var(--ink);
	}

	/* ── panels ── */
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		margin: 0 0 var(--s-2);
		padding: 0;
	}

	.step {
		display: inline-flex;
		gap: 6px;
		padding: 4px 0;
		color: var(--graphite);
		text-transform: uppercase;
		letter-spacing: inherit;
		transition: color var(--t-micro) steps(2);
	}

	.step .n {
		color: var(--hairline);
		transition: color var(--t-micro) steps(2);
	}

	.step.on,
	.step.on .n {
		color: var(--ink);
	}

	.step.on .n {
		color: var(--signal-text);
	}

	.stacked .steps {
		display: none;
	}

	.panel-stack {
		display: grid;
	}

	.panel {
		grid-area: 1 / 1;
		display: grid;
		gap: 10px;
		align-content: start;
		opacity: 0;
		transform: translateY(14px);
		transition:
			opacity var(--t-base) var(--ease-steer),
			transform var(--t-base) var(--ease-steer);
		pointer-events: none;
	}

	.panel.on {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}

	.stacked .panel-stack {
		gap: var(--s-4);
	}

	.stacked .panel {
		grid-area: auto;
	}

	.body {
		max-width: 38ch;
	}

	.stack {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
	}

	.stack li {
		font-size: var(--fs-hud);
		letter-spacing: var(--tr-hud);
		text-transform: uppercase;
		padding: 5px 9px 4px;
		border: 1px solid var(--hairline);
		background: color-mix(in srgb, var(--paper) 86%, transparent);
	}

	/* ── controls ── */
	.controls {
		display: grid;
		gap: 12px;
	}

	.biomes {
		display: flex;
		gap: 8px;
	}

	.chip {
		padding: 6px 10px 5px;
		color: var(--graphite);
		border: 1px solid var(--hairline);
		transition:
			background-color var(--t-fast) var(--ease-snap),
			color var(--t-fast) var(--ease-snap),
			border-color var(--t-fast) var(--ease-snap);
	}

	.chip.on {
		color: var(--paper);
		background: var(--ink);
		border-color: var(--ink);
	}

	.chip:active {
		transform: translateY(1px);
	}

	.hint {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.keys {
		display: inline-flex;
		gap: 4px;
	}

	.disclaimer {
		max-width: 44ch;
	}

	/* ── stage ── */
	.stage {
		position: relative;
		grid-column: 1 / -1;
		margin-inline: calc(var(--margin) * -1);
		aspect-ratio: 1;
		max-height: 88svh;
		touch-action: pan-y;
		-webkit-tap-highlight-color: transparent;
	}

	.fallback {
		position: absolute;
		inset: 0;
	}

	.orbit-label {
		position: absolute;
		left: 0;
		top: 0;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--graphite);
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: opacity var(--t-fast) steps(3);
		margin: -0.6em 0 0 0;
	}

	.orbit-label.on {
		opacity: 1;
	}

	/* Left label ends at the ring's left-most point; the low one hangs under the near arc. */
	.orbit-label:not(.low) {
		translate: -100% 0;
		flex-direction: row-reverse;
	}

	.orbit-label.low {
		flex-direction: column;
		gap: 4px;
		translate: -50% 0;
		margin: 3px 0 0 0;
	}

	.orbit-label .tick {
		display: block;
		width: 14px;
		height: 1px;
		background: currentColor;
	}

	.orbit-label .tick.v {
		width: 1px;
		height: 12px;
	}

	/* ── narrow: the planet right after the title, the panels under it ── */
	@media (max-width: 1023px) {
		.inner {
			row-gap: clamp(24px, 4vh, 40px);
		}

		.copy {
			display: contents;
		}

		.head,
		.panels,
		.controls,
		.disclaimer {
			grid-column: 1 / -1;
		}

		.head {
			order: 1;
		}

		.stage {
			order: 2;
		}

		.panels {
			order: 3;
		}

		.controls {
			order: 4;
		}

		.disclaimer {
			order: 5;
		}
	}

	/* ── desktop ── */
	@media (min-width: 1024px) {
		.copy {
			grid-column: 1 / span 4;
		}

		.stage {
			grid-column: 5 / -1;
			grid-row: 1;
			margin: 0 calc(var(--margin) * -1) 0 0;
			aspect-ratio: auto;
			max-height: none;
			min-height: 70svh;
		}

		.pinned .inner {
			height: 100svh;
			max-width: none;
			padding-block: clamp(72px, 11vh, 120px) clamp(84px, 12vh, 128px);
		}

		.pinned .copy {
			justify-content: center;
		}

		.pinned .stage {
			/* Out of the grid: an absolute grid item would use its grid area as containing block. */
			grid-column: auto;
			grid-row: auto;
			position: absolute;
			inset: 0 0 0 auto;
			width: calc((100% - 2 * var(--margin) - 11 * var(--gutter)) / 12 * 8 + 7 * var(--gutter) + var(--margin));
			margin: 0;
		}
	}
</style>
