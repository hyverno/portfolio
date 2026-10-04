<!--
	One Lab "editor viewport" (§5 05 · LAB): toolbar `PERSPECTIVE · LIT · REALTIME ●`, a 16:10
	viewport running a web recreation (Canvas2D or a scissored GLView on the shared renderer), and a
	status bar with real numbers and the cell's controls. The AABB frame draws on at the reveal, then
	the toolbar decodes. Only visible cells run; the active one (hovered / focused / picked in the
	spec list) every frame, the others every other frame; the rest dim to 40%.
	GL content sits above the DOM (z 20), so nothing in the DOM is ever placed over a GL viewport.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { ActionReturn } from 'svelte/action';
	import type { LabEntry } from '#lib/content/types';
	import { fmtNum, loc, t } from '#lib/i18n/index.svelte';
	import { TIER, device } from '#lib/core/device.svelte';
	import { DUR, EASE, STAGGER, decode, gsap } from '#lib/core/motion';
	import { getLocked, interact } from '#lib/core/actions';
	import { isEditable, onKey } from '#lib/core/keys';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { FLAGS } from '#lib/core/flags';
	import { getEngine, whenEngine } from '#lib/gl/handle';
	import type { Engine } from '#lib/gl/types';
	import Keycap from '#lib/ui/Keycap.svelte';
	import NodeGraph from './NodeGraph.svelte';
	import { activeCell, lab } from './state.svelte';
	import { STILL_VIEWBOX, still } from './cells/stills';
	import {
		loadCrowd,
		loadHose,
		loadKit,
		loadNavmesh,
		loadNested,
		loadReplication,
		loadWater
	} from './cells/loaders';
	import { HOSE_NOZZLE_Y, type LabCellImpl, type LabSceneImpl, type PointerInfo } from './cells/types';

	interface Props {
		entry: LabEntry;
		index: number;
	}

	let { entry, index }: Props = $props();

	// ── local copy: the dictionary covers the spec'd strings; these extras are { en, fr } pairs ────
	const L = {
		spawn: () => loc({ en: 'SPAWN', fr: 'SPAWNER' }),
		query: (hits: string, nodes: string) =>
			loc({
				en: `QUERY · ${hits} HITS · ${nodes} NODES`,
				fr: `REQUÊTE · ${hits} TOUCHÉS · ${nodes} NŒUDS`
			}),
		rebuilt: (ms: string) =>
			loc({ en: `REBUILT EVERY FRAME · ${ms} MS`, fr: `RECONSTRUIT À CHAQUE FRAME · ${ms} MS` }),
		emitters: (n: string) => loc({ en: `${n} EMITTERS`, fr: `${n} ÉMETTEURS` }),
		rockets: (up: string, bursts: string) =>
			loc({ en: `${up} ROCKETS UP · ${bursts} BURSTING`, fr: `${up} FUSÉES EN VOL · ${bursts} GERBES` }),
		tris: (n: string) => `${n} TRIS`,
		touchTarget: () => loc({ en: 'TOUCH TO SET THE TARGET', fr: 'TOUCHEZ POUR PLACER LA CIBLE' }),
		bfs: (ms: string) => `BFS ${ms} MS`,
		water: (n: string) => loc({ en: `${n} VERTS · 4 GERSTNER WAVES`, fr: `${n} SOMMETS · 4 VAGUES DE GERSTNER` }),
		net: (rtt: string, n: string) =>
			loc({ en: `TICK 20 HZ · RTT ${rtt} MS · ${n} IN FLIGHT`, fr: `TICK 20 HZ · RTT ${rtt} MS · ${n} EN VOL` }),
		ms: (n: string) => `${n} MS`
	};

	// A cell never changes identity (the list is keyed by id): read the props once.
	const id = untrack(() => entry.id);
	const gl = untrack(() => entry.render === 'webgl');
	const num = untrack(() => String(index + 1).padStart(2, '0'));

	// ── elements and state ──────────────────────────────────────────────────────────────────
	let root = $state<HTMLElement>();
	let viewport = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let glEl = $state<HTMLElement>();
	let graph = $state.raw<ReturnType<typeof NodeGraph>>();
	let body = $state<HTMLElement>();
	let status = $state<HTMLElement>();
	let bars: HTMLElement[] = $state([]);
	let corners: HTMLElement[] = $state([]);
	let tbEls: HTMLElement[] = $state([]);
	let rightEl = $state<HTMLElement>();

	// Raw: the implementation mutates its own objects (stats); a deep proxy would hide that.
	let impl = $state.raw<LabCellImpl | null>(null);
	let visible = $state(false);
	let hovered = $state(false);
	let focusWithin = $state(false);
	let hydrated = $state(false);
	let revealed = $state(false);
	/** WebGL cells without an engine (or with the lab flag off) show their still. */
	let showStill = $state(false);
	let coarse = $state(false);

	// Controls.
	let quadtree = $state(true);
	let steep = $state(0.62);
	let wavelength = $state(1.8);
	let latency = $state(120);
	let interp = $state(false);

	// The hose's spawner gizmo (circle + dot), DOM so it costs no draw call.
	let spawner = $state({ x: 0, y: 0, show: false, hot: false });
	let keyHold = false;

	function syncSpawner() {
		if (id !== 'numbers' || !viewport) return;
		const w = viewport.clientWidth;
		const h = viewport.clientHeight;
		const inside = ptr.inside && !ptr.touch;
		spawner = {
			x: inside || ptr.touch ? ptr.x : w / 2,
			y: inside || ptr.touch ? ptr.y : h * HOSE_NOZZLE_Y,
			show: inside || keyHold || (ptr.touch && ptr.down),
			hot: keyHold || (ptr.down && ptr.inside)
		};
	}

	// HUD (4 Hz).
	let hud = $state('');
	let side = $state('');

	const isActive = $derived(activeCell() === id);
	const dim = $derived(activeCell() !== null && !isActive);
	const allowed = $derived(
		FLAGS.lab && (!lab.single || lab.centre === id) && (!device.reducedMotion || isActive)
	);
	const running = $derived(!!impl && visible && allowed);

	// ── toolbar text (imperative so it can decode) ──────────────────────────────────────────
	let viewMode = $state(1);
	const toolbar = $derived([
		t().lab.toolbar[0],
		viewMode === 1 ? t().lab.toolbar[1] : t().hud.viewModes[viewMode as 1 | 2 | 3 | 4],
		running ? t().lab.toolbar[2] : t().lab.paused
	]);
	const right = $derived(
		hovered || focusWithin ? `${t().lab.recreation} · ${entry.engine.toUpperCase()}` : `${num} ${entry.title}`
	);

	function setText(el: HTMLElement | undefined, text: string, animate: boolean) {
		if (!el || el.dataset.text === text) return;
		el.dataset.text = text;
		if (animate && !device.reducedMotion) decode(el, text);
		else el.textContent = text;
	}

	$effect(() => {
		const items = toolbar;
		if (!hydrated) return;
		for (let i = 0; i < 3; i++) setText(tbEls[i], revealed ? items[i] : '', revealed);
	});
	$effect(() => {
		const r = right;
		if (!hydrated) return;
		setText(rightEl, revealed ? r : '', revealed);
	});

	// ── run state → implementation ──────────────────────────────────────────────────────────
	$effect(() => {
		if (!impl) return;
		if (running) impl.start();
		else impl.stop();
	});
	$effect(() => {
		impl?.setRate(isActive ? 1 : 2);
	});
	$effect(() => {
		const s = impl as LabSceneImpl | null;
		s?.setOpacity?.(revealed ? (dim ? 0.4 : 1) : 0);
	});
	$effect(() => {
		impl?.set?.({ quadtree });
	});
	$effect(() => {
		impl?.set?.({ steepness: steep, wavelength });
	});
	$effect(() => {
		impl?.set?.({ latency, interp });
	});

	// Hover / focus → shared active cell.
	$effect(() => {
		if (hovered) lab.hoverCell = id;
		else if (lab.hoverCell === id) lab.hoverCell = null;
	});
	$effect(() => {
		if (focusWithin) lab.focusCell = id;
		else if (lab.focusCell === id) lab.focusCell = null;
	});

	// ── HUD lines (real values, 4 Hz) ───────────────────────────────────────────────────────
	function readHud() {
		const s = impl?.stats;
		const fixed = (n: number, d = 1) => fmtNum(Math.round(n * 10 ** d) / 10 ** d, d);
		switch (id) {
			case 'crowd':
				hud = t().lab.crowd.hud(fmtNum(s?.agents ?? 2048), String(s?.depth ?? 0));
				side = s && s.hits + s.visited > 0 ? L.query(fmtNum(s.hits), fmtNum(s.visited)) : L.rebuilt(fixed(s?.buildMs ?? 0, 2));
				break;
			case 'numbers':
				hud = t().lab.numbers.hud(fmtNum(s?.live ?? 0), String(s?.calls ?? 1), fixed(s?.jsMs ?? 0));
				break;
			case 'nested':
				hud = `${t().lab.nested.hud(fmtNum(s?.points ?? 4096))} · ${L.emitters(fmtNum(s?.emitters ?? 64))}`;
				side = L.rockets(fmtNum(s?.up ?? 0), fmtNum(s?.bursting ?? 0));
				break;
			case 'navmesh':
				hud = `${t().lab.navmesh.hud(fmtNum(s?.agents ?? 300))} · ${L.tris(fmtNum(s?.tris ?? 131))}`;
				side = L.bfs(fixed(s?.bfsMs ?? 0, 2));
				break;
			case 'water':
				hud = L.water(fmtNum(s?.verts ?? 16384));
				break;
			case 'replication':
				hud = L.net(fmtNum(s?.rtt ?? latency * 2), fmtNum(s?.inflight ?? 0));
				break;
		}
	}

	// ── input ───────────────────────────────────────────────────────────────────────────────
	const ptr: PointerInfo = { x: 0, y: 0, inside: false, down: false, touch: false };

	function localPoint(e: PointerEvent) {
		const r = (glEl ?? viewport)!.getBoundingClientRect();
		ptr.x = e.clientX - r.left;
		ptr.y = e.clientY - r.top;
		ptr.touch = e.pointerType !== 'mouse';
	}

	function onPointerMove(e: PointerEvent) {
		localPoint(e);
		ptr.inside = true;
		impl?.pointer?.(ptr);
		syncSpawner();
	}
	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		localPoint(e);
		ptr.inside = true;
		ptr.down = true;
		if (ptr.touch) hovered = true;
		impl?.pointer?.(ptr);
		syncSpawner();
	}
	function onPointerUp(e: PointerEvent) {
		localPoint(e);
		ptr.down = false;
		impl?.pointer?.(ptr);
		if (ptr.touch) {
			ptr.inside = false;
			impl?.pointer?.(ptr);
			hovered = false;
		}
		syncSpawner();
	}
	function onPointerLeave(e: PointerEvent) {
		if (e.pointerType === 'mouse' || !ptr.down) {
			ptr.inside = false;
			ptr.down = false;
			impl?.pointer?.(ptr);
		}
		syncSpawner();
	}

	/** Navmesh arrows (focused only, so the page still scrolls with the keys otherwise). */
	function onViewportKey(e: KeyboardEvent) {
		if (id !== 'navmesh' || e.target !== viewport) return;
		if (impl?.key?.(e.key, true)) e.preventDefault();
	}

	/** The navmesh viewport takes the arrow keys: it gets a tab stop (the hose gets one from interact). */
	function tabStop(node: HTMLElement, on: boolean) {
		if (on) node.tabIndex = 0;
	}

	/**
	 * `use:interact` for the live hose only: lock-on brackets, the `[E] SPAWN` prompt, a tab stop
	 * and role=button. As a static still (no WebGL) it is just an image: no prompt, no tab stop.
	 */
	function lockOn(node: HTMLElement, verb: string | null | undefined): ActionReturn<string | null | undefined> {
		// `undefined`: not the hose, leave the element alone.
		if (verb === undefined) return {};
		let a: ActionReturn<{ verb: string }> | null = null;
		const apply = (v: string | null) => {
			a?.destroy?.();
			a = null;
			if (v) {
				node.removeAttribute('role');
				a = interact(node, { verb: v });
			} else node.setAttribute('role', 'img');
		};
		apply(verb);
		return {
			update(v) {
				if (v && a) a.update?.({ verb: v });
				else apply(v ?? null);
			},
			destroy() {
				a?.destroy?.();
			}
		};
	}

	// ── reveal: AABB draw-on, then the toolbar decodes ──────────────────────────────────────
	let revealTl: gsap.core.Timeline | null = null;

	function prepareReveal() {
		gsap.set(corners, { scale: 0 });
		gsap.set(bars, { scale: 0 });
		gsap.set([body, status], { autoAlpha: 0 });
	}

	function showAll() {
		revealTl?.kill();
		gsap.set([...corners, ...bars], { clearProps: 'transform' });
		gsap.set([body, status], { clearProps: 'opacity,visibility' });
		revealed = true;
	}

	function playReveal(delay: number) {
		revealTl?.kill();
		revealTl = gsap
			.timeline({ delay })
			.to(corners, { scale: 1, duration: DUR.fast, ease: EASE.spawn, stagger: 0.02 }, 0)
			.to(bars, { scale: 1, duration: DUR.base, ease: EASE.steer }, 0.04)
			.to(body!, { autoAlpha: 1, duration: DUR.fast, ease: 'steps(4)' }, 0.3)
			.add(() => void (revealed = true), DUR.base)
			.to(status!, { autoAlpha: 1, duration: DUR.fast, ease: EASE.steer }, DUR.base);
	}

	$effect(() => {
		const at = lab.revealAt;
		if (!hydrated || revealed) return;
		if (at === -1) showAll();
		else if (at > 0) playReveal(index * STAGGER.cells);
	});

	// ── lifecycle ───────────────────────────────────────────────────────────────────────────
	onMount(() => {
		let destroyed = false;
		let offView: (() => void) | null = null;
		const offs: (() => void)[] = [];
		coarse = !device.finePointer;

		if (lab.revealAt === 0 && !device.reducedMotion) prepareReveal();
		hydrated = true;

		// A busy main thread can deliver several entries for the same target at once: the last one is
		// the current state.
		const latest = (entries: IntersectionObserverEntry[]) => entries[entries.length - 1];
		const io = new IntersectionObserver((entries) => (visible = latest(entries).isIntersecting), { threshold: 0 });
		io.observe(viewport!);
		const near = new IntersectionObserver(
			(entries) => {
				if (!latest(entries).isIntersecting) return;
				near.disconnect();
				load().catch(() => {});
			},
			{ rootMargin: '80% 0px' }
		);
		near.observe(root!);

		const ro = new ResizeObserver(([e]) => {
			const box = e.contentRect;
			if (!gl) impl?.resize(box.width, box.height);
		});

		/**
		 * Lazy cell setup. Never throws and never logs an error: a chunk that cannot be fetched (offline,
		 * a dev server re-optimising its deps, a page unloading mid-import) just leaves the cell on its
		 * still / paused frame.
		 */
		async function load() {
			const engine: Engine | null = await whenEngine();
			if (destroyed) return;
			// The crowd passes *under* the whole cell (toolbar and status bar included). Registered
			// before the cell's own scene: views draw in registration order.
			if (engine) {
				const kit = await fetchChunk(loadKit);
				if (destroyed) return;
				if (kit) offView = kit.punch(engine, root!);
			}
			if (!gl) {
				const created = await guarded(createCanvasCell);
				if (destroyed || !created) return created?.dispose();
				impl = created;
				ro.observe(canvas!);
				const r = canvas!.getBoundingClientRect();
				created.resize(r.width, r.height);
				return;
			}
			if (!engine || !FLAGS.lab) {
				showStill = true;
				return;
			}
			const created = await guarded(() => createScene(engine));
			if (destroyed || !created) {
				created?.dispose();
				if (!created) showStill = true;
				return;
			}
			impl = created;
		}

		/** A lazily fetched chunk, with one quiet retry; `null` when it cannot be had. */
		async function fetchChunk<T>(get: () => Promise<T>): Promise<T | null> {
			try {
				return await get();
			} catch {
				await new Promise((r) => setTimeout(r, 700));
				if (destroyed) return null;
				return get().catch(() => null);
			}
		}

		/** Runs a cell factory; a failing factory is a bug worth a warning, never an uncaught error. */
		async function guarded<T>(make: () => Promise<T | null>): Promise<T | null> {
			try {
				return await make();
			} catch (err) {
				console.warn(`[lab] ${id}: falling back to the still`, err);
				return null;
			}
		}

		async function createCanvasCell(): Promise<LabCellImpl | null> {
			const reduced = () => device.reducedMotion;
			switch (id) {
				case 'crowd': {
					const m = await fetchChunk(loadCrowd);
					return m && !destroyed ? m.create(canvas!, { reducedMotion: reduced }) : null;
				}
				case 'navmesh': {
					const m = await fetchChunk(loadNavmesh);
					return m && !destroyed ? m.create(canvas!, { reducedMotion: reduced }) : null;
				}
				case 'replication': {
					const m = await fetchChunk(loadReplication);
					return m && !destroyed
						? m.create(canvas!, {
								labels: () => {
									const r = t().lab.replication;
									return { server: r.server, client: r.client, lobby: r.lobby, inventory: r.inventory };
								}
							})
						: null;
				}
			}
			return null;
		}

		async function createScene(engine: Engine): Promise<LabSceneImpl | null> {
			switch (id) {
				case 'numbers': {
					const m = await fetchChunk(loadHose);
					if (!m || destroyed) return null;
					const cap = Math.min(TIER[device.tier].hose, device.mobile ? 8192 : Infinity);
					return m.create(glEl!, engine, { capacity: cap, reducedMotion: () => device.reducedMotion });
				}
				case 'nested': {
					const m = await fetchChunk(loadNested);
					if (!m || destroyed) return null;
					return m.create(glEl!, engine, {
						onEvent: (kind) => {
							if (device.reducedMotion || !graph) return;
							if (kind === 'launch') graph.pulse(0);
							else {
								graph.pulse(1);
								setTimeout(() => graph?.pulse(2), 160);
							}
						}
					});
				}
				case 'water': {
					const m = await fetchChunk(loadWater);
					if (!m || destroyed) return null;
					return m.create(glEl!, engine, {});
				}
			}
			return null;
		}

		// Keys: [Q] on the crowd cell, [E] / Space / Enter held on the hose.
		if (id === 'crowd') {
			offs.push(
				onKey('q', (e) => {
					if (e.repeat || !(hovered || focusWithin)) return;
					quadtree = !quadtree;
				})
			);
		}
		if (id === 'numbers') {
			const hold = (e: KeyboardEvent, down: boolean) => {
				if (!impl || isEditable(e.target)) return;
				const k = e.key.toLowerCase();
				const focused = document.activeElement === viewport;
				const mine = hovered || focused || getLocked() === viewport;
				let used = false;
				if (k === 'e' && (mine || !down)) used = !!impl.key?.('hold', down);
				else if ((k === ' ' || k === 'enter') && (focused || !down)) {
					if (down) e.preventDefault();
					used = !!impl.key?.('hold', down);
				}
				if (used) {
					keyHold = down;
					syncSpawner();
				}
			};
			const kd = (e: KeyboardEvent) => !e.repeat && hold(e, true);
			const ku = (e: KeyboardEvent) => hold(e, false);
			window.addEventListener('keydown', kd);
			window.addEventListener('keyup', ku);
			offs.push(() => {
				window.removeEventListener('keydown', kd);
				window.removeEventListener('keyup', ku);
			});
		}

		// HUD at 4 Hz while the cell is on screen; the global view mode mirrored in the toolbar.
		let last = 0;
		let seenFor = 0;
		offs.push(
			onFrame((time, dt) => {
				const m = getEngine()?.viewMode ?? 1;
				if (m !== viewMode) viewMode = m;
				if (!visible) return;
				// Safety net: a cell on screen for 2s is revealed even if its trigger never fired.
				if (!revealed && (seenFor += dt) > 2 && lab.revealAt === 0) showAll();
				if (time - last < 0.25) return;
				last = time;
				readHud();
			}, PRIORITY.ui)
		);
		readHud();

		return () => {
			destroyed = true;
			io.disconnect();
			near.disconnect();
			ro.disconnect();
			revealTl?.kill();
			for (const off of offs) off();
			offView?.();
			impl?.dispose();
			impl = null;
			if (lab.hoverCell === id) lab.hoverCell = null;
			if (lab.focusCell === id) lab.focusCell = null;
		};
	});

	const viewportLabel = $derived(t().lab.cellAria(entry.title));
</script>

<article
	class="cell"
	class:dim
	class:active={isActive}
	class:running
	class:glcell={gl}
	data-lab-cell={id}
	data-no-ping
	bind:this={root}
	onpointerenter={(e) => e.pointerType === 'mouse' && (hovered = true)}
	onpointerleave={(e) => e.pointerType === 'mouse' && (hovered = false)}
	onfocusin={(e) => (focusWithin = (e.target as HTMLElement).matches?.(':focus-visible') ?? false)}
	onfocusout={(e) => {
		if (!root?.contains(e.relatedTarget as Node | null)) focusWithin = false;
	}}
>
	<div class="toolbar micro" title={t().lab.recreationTip(entry.engine)}>
		{#each [0, 1, 2] as i (i)}
			{#if i > 0}<span class="sep" aria-hidden="true">·</span>{/if}
			<span class="tb" class:rt={i === 2}>
				{#if !hydrated}<span>{t().lab.toolbar[i]}</span>{/if}
				<span bind:this={tbEls[i]}></span>
				{#if i === 2}<i class="led" aria-hidden="true"></i>{/if}
			</span>
		{/each}
		<span class="right">
			{#if !hydrated}<span>{num} {entry.title}</span>{/if}
			<span bind:this={rightEl}></span>
		</span>
	</div>

	<div class="body" bind:this={body}>
		<div
			class="viewport"
			class:split={id === 'nested'}
			bind:this={viewport}
			role={id === 'navmesh' ? 'application' : id === 'numbers' ? undefined : 'img'}
			use:tabStop={id === 'navmesh'}
			aria-label={gl && showStill ? `${entry.title}. ${t().fallback.lab}` : viewportLabel}
			aria-describedby="lab-spec-{id}"
			aria-keyshortcuts={id === 'navmesh'
				? 'ArrowUp ArrowDown ArrowLeft ArrowRight'
				: id === 'numbers' && !showStill
					? 'E'
					: undefined}
			use:lockOn={id === 'numbers' ? (showStill ? null : L.spawn()) : undefined}
			onpointermove={onPointerMove}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onpointerleave={onPointerLeave}
			onkeydown={onViewportKey}
		>
			{#if gl}
				<div class="gl-area" bind:this={glEl}></div>
				{#if id === 'numbers'}
					<span
						class="spawner"
						class:show={spawner.show}
						class:hot={spawner.hot}
						style:transform="translate({spawner.x}px, {spawner.y}px)"
						aria-hidden="true"
					></span>
				{/if}
				{#if id === 'nested'}
					<div class="graph-area"><NodeGraph bind:this={graph} /></div>
				{/if}
				<!-- Reduced motion: the idle hose is a frozen fountain until you hold it. -->
				<div
					class="still static-only"
					class:force={showStill || (id === 'numbers' && device.reducedMotion && !spawner.hot)}
					aria-hidden="true"
				>
					<svg viewBox={STILL_VIEWBOX} preserveAspectRatio="xMidYMid slice">{@html still(id)}</svg>
				</div>
			{:else}
				<canvas bind:this={canvas} aria-hidden="true"></canvas>
			{/if}
		</div>
	</div>

	<div class="status" bind:this={status}>
		<p class="hud hud-text">
			{#if gl && showStill}{t().lab.still}{:else}{hud}{/if}
		</p>
		<div class="row micro">
			{#if gl && showStill}
				<!-- The still does not take input: no controls to offer. -->
			{:else if id === 'crowd'}
				<button class="toggle" aria-pressed={quadtree} onclick={() => (quadtree = !quadtree)}>
					<Keycap key="Q" size="micro" active={quadtree} />
					<span>{t().lab.crowd.toggle.replace(/^\[Q\]\s*/, '')}</span>
				</button>
				<span class="aside">{side}</span>
			{:else if id === 'numbers'}
				<span class="hint">
					{#if !coarse}<Keycap key="E" size="micro" />{/if}
					{t().lab.numbers.hint}
				</span>
			{:else if id === 'nested'}
				<span class="aside">{side}</span>
			{:else if id === 'navmesh'}
				<span class="hint">{coarse ? L.touchTarget() : t().lab.navmesh.hint}</span>
				<span class="aside">{side}</span>
			{:else if id === 'water'}
				<label class="slider">
					<span class="k">{t().lab.water.steepness}</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={steep} aria-valuetext={fmtNum(steep, 2)} />
					<output class="v" aria-hidden="true">{fmtNum(steep, 2)}</output>
				</label>
				<label class="slider">
					<span class="k">{t().lab.water.wavelength}</span>
					<input
						type="range"
						min="0.5"
						max="4"
						step="0.05"
						bind:value={wavelength}
						aria-valuetext={fmtNum(wavelength, 2)}
					/>
					<output class="v" aria-hidden="true">{fmtNum(wavelength, 2)}</output>
				</label>
			{:else if id === 'replication'}
				<label class="slider">
					<span class="k">{t().lab.replication.latency}</span>
					<input type="range" min="0" max="300" step="5" bind:value={latency} aria-valuetext={L.ms(String(latency))} />
					<output class="v" aria-hidden="true">{L.ms(String(latency))}</output>
				</label>
				<button class="toggle pill" aria-pressed={interp} onclick={() => (interp = !interp)}>
					{interp ? t().lab.replication.interp.on : t().lab.replication.interp.off}
				</button>
			{/if}
		</div>
	</div>

	<span class="frame" aria-hidden="true">
		<i class="bar h tl" bind:this={bars[0]}></i>
		<i class="bar h tr" bind:this={bars[1]}></i>
		<i class="bar h bl" bind:this={bars[2]}></i>
		<i class="bar h br" bind:this={bars[3]}></i>
		<i class="bar v tl" bind:this={bars[4]}></i>
		<i class="bar v tr" bind:this={bars[5]}></i>
		<i class="bar v bl" bind:this={bars[6]}></i>
		<i class="bar v br" bind:this={bars[7]}></i>
		<b class="corner tl" bind:this={corners[0]}></b>
		<b class="corner tr" bind:this={corners[1]}></b>
		<b class="corner bl" bind:this={corners[2]}></b>
		<b class="corner br" bind:this={corners[3]}></b>
	</span>
</article>

<style>
	.cell {
		--line: color-mix(in srgb, var(--ink) 13%, transparent);
		--cell-bg: color-mix(in srgb, var(--paper), var(--ink) 3%);
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		container-type: inline-size;
		background: var(--paper);
		transition: opacity var(--t-fast) var(--ease-steer);
	}

	.cell.dim {
		opacity: 0.4;
	}

	/* ── toolbar ─────────────────────────────────────────────────────────── */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 7px;
		height: 30px;
		padding: 0 10px;
		/* Editor chrome: Martian at its narrowest width. */
		font-stretch: 75%;
		letter-spacing: 0.05em;
		color: var(--graphite);
		border-bottom: 1px solid var(--line);
		white-space: nowrap;
		overflow: hidden;
	}

	.tb {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.sep {
		opacity: 0.6;
	}

	.led {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: 1px solid currentColor;
		transition:
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.running .rt {
		color: var(--ink);
	}

	.running .led {
		background: currentColor;
	}

	.active .rt {
		color: var(--signal-text);
	}

	.active .led {
		color: var(--signal);
	}

	/* The live cell's REALTIME light blinks like a recording light (static under reduced motion). */
	.active.running .led {
		animation: led 1.2s steps(2, jump-none) infinite;
	}

	@keyframes led {
		50% {
			opacity: 0.25;
		}
	}

	.right {
		margin-left: auto;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--graphite);
	}

	.active .right,
	.cell:hover .right {
		color: var(--ink);
	}

	/* ── viewport ────────────────────────────────────────────────────────── */
	.body {
		position: relative;
	}

	.viewport {
		position: relative;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background-color: var(--cell-bg);
		background-image: radial-gradient(
			circle at center,
			color-mix(in srgb, var(--ink) 16%, transparent) 0.75px,
			transparent 1.1px
		);
		background-size: 16px 16px;
		background-position: 8px 8px;
		touch-action: pan-y;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.viewport:focus-visible {
		outline-offset: -2px;
	}

	canvas,
	.gl-area {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.split .gl-area {
		right: 38%;
		width: auto;
	}

	.graph-area {
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		width: 38%;
		padding: 6px 8px;
		border-left: 1px dashed var(--line);
		pointer-events: none;
	}

	.still {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Spawner gizmo (§2.5: circle + dot) at the hose nozzle. */
	.spawner {
		position: absolute;
		top: -8px;
		left: -8px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1.5px solid var(--ink);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity var(--t-micro) linear,
			border-color var(--t-ack) linear,
			scale var(--t-fast) var(--ease-spawn);
	}

	.spawner::after {
		content: '';
		position: absolute;
		inset: 5px;
		border-radius: 50%;
		background: currentColor;
		color: var(--ink);
	}

	.spawner.show {
		opacity: 1;
	}

	.spawner.hot {
		border-color: var(--signal);
		scale: 1.25;
	}

	.spawner.hot::after {
		color: var(--signal);
	}

	.split .still {
		right: 38%;
	}

	/* Beats the global .static-only rule when WebGL runs but this cell cannot. */
	.viewport .still.force {
		display: block !important;
	}

	.still svg {
		width: 100%;
		height: 100%;
	}

	.still :global(.num) {
		font-family: var(--font-mono);
		font-weight: 800;
		text-anchor: middle;
		fill: var(--ink);
	}

	.still :global(.s) {
		fill: var(--signal);
	}

	.still :global(.i) {
		fill: var(--ink);
	}

	.still :global(.ring) {
		fill: none;
		stroke: var(--signal);
		stroke-width: 1.2;
	}

	.still :global(.grid) {
		fill: none;
		stroke: var(--graphite);
		stroke-opacity: 0.4;
		stroke-width: 0.8;
	}

	.still :global(.line) {
		fill: none;
		stroke: var(--ink);
		stroke-width: 0.7;
		stroke-linecap: round;
	}

	/* ── status bar ──────────────────────────────────────────────────────── */
	.status {
		display: grid;
		align-content: start;
		gap: 6px;
		flex: 1;
		min-height: 58px;
		padding: 9px 10px 10px;
		border-top: 1px solid var(--line);
	}

	.hud {
		color: var(--ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: none;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 14px;
		color: var(--graphite);
		min-height: 18px;
	}

	.aside {
		margin-left: auto;
		white-space: nowrap;
	}

	.hint {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 22px;
		padding: 0 2px;
		color: var(--graphite);
		text-transform: uppercase;
		letter-spacing: inherit;
	}

	.toggle[aria-pressed='true'] {
		color: var(--ink);
	}

	.toggle.pill {
		border: 1px solid currentColor;
		padding: 2px 7px;
		transition:
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.toggle.pill[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
		border-color: var(--ink);
	}

	.slider {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex: 1 1 150px;
		min-width: 0;
	}

	.slider .k {
		white-space: nowrap;
	}

	.slider .v {
		min-width: 4.2em;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	input[type='range'] {
		flex: 1;
		min-width: 40px;
		height: 18px;
		margin: 0;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-runnable-track {
		height: 1px;
		background: color-mix(in srgb, var(--ink) 40%, transparent);
	}

	input[type='range']::-moz-range-track {
		height: 1px;
		background: color-mix(in srgb, var(--ink) 40%, transparent);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 9px;
		height: 9px;
		margin-top: -4px;
		background: var(--ink);
		border: 0;
		border-radius: 0;
		transform: rotate(45deg);
	}

	input[type='range']::-moz-range-thumb {
		width: 9px;
		height: 9px;
		background: var(--ink);
		border: 0;
		border-radius: 0;
		transform: rotate(45deg);
	}

	input[type='range']:focus-visible {
		outline-offset: 2px;
	}

	/* ── AABB frame: bars draw on from the corners; the 10px corners are the brackets ── */
	.frame {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.bar {
		position: absolute;
		display: block;
		background: var(--line);
	}

	.bar.h {
		height: 1px;
		width: 50%;
	}

	.bar.v {
		width: 1px;
		height: 50%;
	}

	.bar.h.tl {
		top: 0;
		left: 0;
		transform-origin: 0 50%;
	}
	.bar.h.tr {
		top: 0;
		right: 0;
		transform-origin: 100% 50%;
	}
	.bar.h.bl {
		bottom: 0;
		left: 0;
		transform-origin: 0 50%;
	}
	.bar.h.br {
		bottom: 0;
		right: 0;
		transform-origin: 100% 50%;
	}
	.bar.v.tl {
		top: 0;
		left: 0;
		transform-origin: 50% 0;
	}
	.bar.v.tr {
		top: 0;
		right: 0;
		transform-origin: 50% 0;
	}
	.bar.v.bl {
		bottom: 0;
		left: 0;
		transform-origin: 50% 100%;
	}
	.bar.v.br {
		bottom: 0;
		right: 0;
		transform-origin: 50% 100%;
	}

	.corner {
		position: absolute;
		width: var(--bracket);
		height: var(--bracket);
		--c: var(--ink);
		transition: --c var(--t-fast) var(--ease-steer);
	}

	.active .corner {
		--c: var(--signal);
	}

	.corner.tl {
		top: -1px;
		left: -1px;
		transform-origin: 0 0;
		background:
			linear-gradient(var(--c) 0 0) 0 0 / 100% var(--bracket-w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 0 / var(--bracket-w) 100% no-repeat;
	}
	.corner.tr {
		top: -1px;
		right: -1px;
		transform-origin: 100% 0;
		background:
			linear-gradient(var(--c) 0 0) 100% 0 / 100% var(--bracket-w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--bracket-w) 100% no-repeat;
	}
	.corner.bl {
		bottom: -1px;
		left: -1px;
		transform-origin: 0 100%;
		background:
			linear-gradient(var(--c) 0 0) 0 100% / 100% var(--bracket-w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--bracket-w) 100% no-repeat;
	}
	.corner.br {
		bottom: -1px;
		right: -1px;
		transform-origin: 100% 100%;
		background:
			linear-gradient(var(--c) 0 0) 100% 100% / 100% var(--bracket-w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--bracket-w) 100% no-repeat;
	}

	@container (max-width: 380px) {
		.toolbar {
			gap: 5px;
			padding: 0 8px;
		}
		.slider {
			flex-basis: 100%;
		}
	}
</style>
