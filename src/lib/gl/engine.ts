// The WebGL engine (§S2, §7). Dynamic-import only: `const { initEngine } = await import('#lib/gl/engine')`.
// Probes the GPU (any doubt → null → static build), builds the crowd, compiles, bakes the internal
// formations, wires the effects, input, theme, governor and the frame loop, and reports every real
// value to the boot log and the HUD stats.
import * as THREE from 'three';
import { createContext, probeCapabilities } from './capability';
import { createRenderer } from './renderer';
import { Crowd } from './crowd/Crowd';
import { Regions } from './crowd/regions';
import { createViews } from './views';
import { createSelection } from './select';
import { initInput } from './input';
import { getEngine, setEngine } from './handle';
import { createDamageNumbers } from './numbers/DamageNumbers';
import { createViewModes } from './viewmodes';
import { createInkSwarm } from './inkswarm';
import type { CrowdGPU, Effect } from './internal';
import type { DamageNumbers, Engine, GLView, ViewMode } from './types';
import { PRIORITY, onFrame } from '#lib/core/ticker';
import { scroll } from '#lib/core/scroll.svelte';
import {
	TIER,
	device,
	markNoWebGL,
	onReducedMotionChange,
	setTier as setCoreTier,
	type Tier
} from '#lib/core/device.svelte';
import { onGovernor, stats } from '#lib/core/stats.svelte';
import { boot, log, report, whenBooted } from '#lib/core/boot.svelte';
import { onThemeColors } from '#lib/core/theme.svelte';
import { FLAGS } from '#lib/core/flags';
import { gsap } from '#lib/core/motion';
import { fmtNum, t } from '#lib/i18n/index.svelte';
import { unlock } from '#lib/stores/achievements.svelte';

type NumbersFx = DamageNumbers & Effect;
type ViewModesFx = Effect & { readonly mode: ViewMode; set(m: ViewMode): void };
type InkFx = Effect & { cover(): Promise<void>; reveal(): Promise<void>; readonly active: boolean };

const BOOT_OWNER = 'boot';
const STATS_MS = 250;
const CONTEXT_RESTORE_MS = 2000;
const TIER_STEPS: Tier[] = ['high', 'med', 'low'];

/** Effects are built by another module: one failing must never take the crowd down with it. */
function guard<T>(name: string, build: () => T, fallback: () => T): T {
	try {
		return build();
	} catch (err) {
		console.warn(`[engine] ${name} unavailable, continuing without it`, err);
		return fallback();
	}
}

function noopNumbers(): NumbersFx {
	return {
		spawn() {},
		burst() {},
		live: 0,
		total: 0,
		capacity: 0,
		object: null,
		render() {},
		dispose() {}
	};
}

export async function initEngine(canvas: HTMLCanvasElement): Promise<Engine | null> {
	if (!FLAGS.crowd) return null;
	const gl = createContext(canvas);
	if (!gl) return null;

	let handle: ReturnType<typeof createRenderer>;
	try {
		handle = createRenderer(canvas, gl);
	} catch (err) {
		console.warn('[engine] renderer failed', err);
		return null;
	}
	const renderer = handle.renderer;
	const caps = probeCapabilities(renderer);
	if (!caps.ok) {
		console.info(`[engine] static build: ${caps.reason}`);
		handle.dispose();
		return null;
	}

	const L = t().boot.log;
	device.floatRT = caps.floatType === THREE.FloatType ? 'float' : 'half';
	log(L.webgl(String(caps.maxTex), String(+handle.size.dpr.toFixed(2))));
	log(
		L.floatRT(
			`${caps.floatType === THREE.FloatType ? 'FLOAT32' : 'HALF16'} · DENSITY ${caps.mipmaps ? 'HALF16 MIPS' : 'RGBA8'}`
		)
	);

	let tier: Tier = device.tier;
	const spec = TIER[tier];
	log(L.tier(tier.toUpperCase(), fmtNum(spec.sim * spec.sim)));
	if (device.reducedMotion) log(L.reduced);

	const regions = new Regions(() => handle.size);
	const crowd = new Crowd({
		renderer,
		simSize: spec.sim,
		floatType: caps.floatType,
		densitySize: spec.density,
		densityHalf: caps.mipmaps,
		regions,
		viewport: handle.size,
		reduced: device.reducedMotion
	});

	// Boot: real bake times in the log while the preloader shows it.
	const offBakeLog = crowd.onBake((id, ms) => {
		if (!boot.done) log(L.bake(id, ms.toFixed(1)));
	});

	// Engine-internal formations, all in viewport space.
	const viewportRegion = { el: document.body, space: 'fixed' as const };
	const internal = [
		crowd.defineInternal('spawn', { kind: 'spawn' }, viewportRegion),
		crowd.defineInternal('ambient', { kind: 'ambient' }, viewportRegion),
		crowd.defineInternal('fill', { kind: 'fill' }, viewportRegion)
	];
	let baked = 0;
	for (const p of internal) p.then(() => report('formations', (++baked / internal.length) * 0.6));
	await Promise.all([internal[0], internal[1]]);

	crowd.claim(BOOT_OWNER);
	crowd.blend('spawn', 'spawn', 0, { owner: BOOT_OWNER });
	crowd.start();

	// Compile every program for real (KHR_parallel_shader_compile when available), one by one so
	// the log shows honest per-program timings.
	const programs = crowd.programs();
	const compileScene = new THREE.Scene();
	const compileCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	// Same attribute set as GPUComputationRenderer's full-screen triangle (no normals), or three
	// would key a second program variant and compile it again on the first frame.
	const quad = new THREE.BufferGeometry();
	quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
	quad.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
	for (let i = 0; i < programs.length; i++) {
		const { name, material, kind, offscreen } = programs[i];
		const obj =
			kind === 'quad'
				? new THREE.Mesh(quad, material)
				: new THREE.Points(crowd.sim!.geometry, material);
		obj.frustumCulled = false;
		compileScene.add(obj);
		// Offscreen passes write linear values: compile with a render target bound, like the frame.
		renderer.setRenderTarget(offscreen ? crowd.sim!.target : null);
		const t0 = performance.now();
		try {
			await renderer.compileAsync(compileScene, compileCam);
		} catch {
			renderer.compile(compileScene, compileCam);
		}
		log(L.compile(name, (performance.now() - t0).toFixed(1)));
		compileScene.remove(obj);
		report('compile', (i + 1) / programs.length);
	}
	renderer.setRenderTarget(null);
	quad.dispose();
	log(L.joke);

	// ── effects (A3b) through the internal contract ──────────────────────────────────────────
	const gpu: CrowdGPU & { readonly densityScale: number } = {
		get N() {
			return crowd.N;
		},
		get simSize() {
			return crowd.U.uSimSize.value as number;
		},
		posTexture: () => crowd.sim!.pos.read.texture,
		velTexture: () => crowd.sim!.vel.read.texture,
		densityTexture: () => crowd.density.texture,
		get densitySize() {
			return crowd.densitySize;
		},
		// Half-float density is mipmapped when the probe allows it; the RGBA8 fallback always is.
		densityMipmaps: true,
		get densityScale() {
			return crowd.densityHalf ? 1 : 0.25;
		},
		colors: crowd.colors,
		viewport: handle.size,
		setIdsMode: (on) => crowd.setIdsMode(on),
		setPointsVisible: (on) => crowd.setPointsVisible(on)
	};

	const numbers = guard<NumbersFx>(
		'damage numbers',
		() => createDamageNumbers(renderer, { capacity: TIER[tier].numbers }),
		noopNumbers
	);
	let fallbackMode: ViewMode = 1;
	const viewModes = guard<ViewModesFx>(
		'view modes',
		() => createViewModes(renderer, gpu),
		() => ({
			get mode() {
				return fallbackMode;
			},
			set(m: ViewMode) {
				fallbackMode = m;
				crowd.setIdsMode(m === 4);
			},
			render() {},
			dispose() {}
		})
	);
	const ink = guard<InkFx>(
		'ink swarm',
		() => createInkSwarm(renderer, gpu, crowd),
		() => ({
			cover: () => Promise.resolve(),
			reveal: () => Promise.resolve(),
			active: false,
			render() {},
			dispose() {}
		})
	);
	const extraNumbers = new Set<NumbersFx>();
	/** Pools living in a GLView: drawn by their view, but aged here every frame (HUD on-screen count). */
	const viewNumbers = new Set<NumbersFx>();
	const effects: Effect[] = [viewModes, numbers, ink];
	const views = createViews(renderer, regions, handle.size);
	const selection = createSelection(crowd);

	// ── wiring ───────────────────────────────────────────────────────────────────────────────
	const offTheme = onThemeColors((c) => {
		crowd.colors.paper.fromArray(c.paper);
		crowd.colors.ink.fromArray(c.ink);
		crowd.colors.graphite.fromArray(c.graphite);
		crowd.colors.hairline.fromArray(c.hairline);
		crowd.colors.signal.fromArray(c.signal);
	});
	const offReduced = onReducedMotionChange((r) => crowd.setReduced(r));
	const offResize = handle.onResize((w, h, dpr) => {
		regions.measureAll();
		for (const fx of effects) fx.resize?.(w, h, dpr);
		for (const fx of extraNumbers) fx.resize?.(w, h, dpr);
	});
	for (const fx of effects) fx.resize?.(handle.size.w, handle.size.h, handle.size.dpr);

	let paused = false;
	let disposed = false;
	let lost = false;
	let frame = 0;
	let firstFrame = true;
	let simAcc = 0;
	let renderAcc = 0;
	let acc = 0;
	let lastPublish = 0;

	// The spawn wave follows the boot; the crowd belongs to the boot until the preloader leaves.
	if (boot.short) crowd.spawnRate = 1.8;
	whenBooted().then(() => {
		if (disposed) return;
		crowd.setSpawnTarget(1);
		crowd.release(BOOT_OWNER);
		offBakeLog();
		// Nobody took the crowd from the spawner (no anchor on this page): spread out as ambient.
		requestAnimationFrame(() => {
			const s = crowd.blendState;
			if (disposed || crowd.owner !== null || s.from !== 'spawn' || s.to !== 'spawn') return;
			const m = { v: 0 };
			let wrote = false;
			const spread = gsap.to(m, {
				v: 1,
				duration: 1.4,
				ease: 'arrive',
				onUpdate: () => {
					// Stop as soon as anyone else drives the crowd (an anchor, a section, a claim):
					// this fallback must never overwrite them.
					const b = crowd.blendState;
					const ours = wrote ? b.from === 'spawn' && b.to === 'ambient' : b.from === 'spawn' && b.to === 'spawn';
					if (crowd.owner !== null || !ours) {
						spread.kill();
						return;
					}
					crowd.blend('spawn', 'ambient', m.v);
					wrote = true;
				}
			});
		});
	});

	const offSim = onFrame((time, dt) => {
		if (paused || disposed || lost) return;
		const t0 = performance.now();
		renderer.info.reset();
		handle.sync();
		crowd.setSpawnTarget(boot.done ? 1 : boot.progress);
		if (crowd.alpha > 0 || ink.active) {
			crowd.update(time, dt, scroll.y, scroll.delta);
			crowd.step(dt);
		}
		simAcc += performance.now() - t0;
	}, PRIORITY.sim);

	const offRender = onFrame((time, dt) => {
		if (disposed) return;
		// The layout was re-mounted (HMR, error boundary): this engine's canvas is gone for good.
		if (!canvas.isConnected) {
			try {
				renderer.forceContextLoss(); // free the context now rather than at GC
			} catch {
				// already gone
			}
			engine.dispose();
			return;
		}
		if (paused || lost) return;
		const t0 = performance.now();
		frame++;
		renderer.setRenderTarget(null);
		renderer.clear(true, true, false);
		crowd.render();
		for (const fx of effects) {
			fx.update?.(time, dt);
			fx.render(renderer);
			if (fx === numbers) for (const extra of extraNumbers) extra.render(renderer);
		}
		views.render(time, dt, frame, scroll.y);
		for (const n of viewNumbers) n.update?.(time, dt);
		const now = performance.now();
		renderAcc += now - t0;
		acc++;

		if (firstFrame) {
			firstFrame = false;
			log(L.firstFrame((simAcc + renderAcc).toFixed(1)));
			report('firstFrame');
			waitForBakes();
		}
		if (now - lastPublish >= STATS_MS) {
			lastPublish = now;
			stats.simMs = Math.round((simAcc / acc) * 100) / 100;
			stats.renderMs = Math.round((renderAcc / acc) * 100) / 100;
			stats.entities = Math.round(crowd.N * crowd.drawn);
			stats.drawCalls = renderer.info.render.calls;
			simAcc = renderAcc = acc = 0;
		}
	}, PRIORITY.render);

	/** Formations defined by the page right after the engine resolves also count toward the boot. */
	function waitForBakes() {
		const started = performance.now();
		let idleFrames = 0;
		const off = onFrame(() => {
			idleFrames = crowd.pendingBakes === 0 ? idleFrames + 1 : 0;
			if (idleFrames >= 3 || performance.now() - started > 2500) {
				report('formations');
				off();
			}
		}, PRIORITY.ui);
	}

	// ── governor (§7): DPR → density → draw range → grain → tier. Never steps back up. ─────────
	let govStep = 0;
	const note = (label: string) => {
		device.governed = true;
		stats.governorNote = `DYNAMIC QUALITY: ${label}`;
	};
	const offGovernor = onGovernor(() => {
		while (govStep < 5) {
			govStep++;
			if (govStep === 1 && handle.size.dpr > 1) {
				handle.setDprCap(1);
				return note('DPR 1.0');
			}
			if (govStep === 2 && crowd.densitySize > 128) {
				crowd.createDensity(128);
				return note('DENSITY 128');
			}
			if (govStep === 3) {
				crowd.setDrawFraction(0.75);
				return note(`${fmtNum(Math.round(crowd.N * 0.75))} ENT DRAWN`);
			}
			if (govStep === 4) {
				// Grain belongs to the chrome: announce it, the Grain component decides.
				document.documentElement.classList.add('governor-no-grain');
				window.dispatchEvent(new CustomEvent('hyv:governor', { detail: { step: 'grain' } }));
				return note('GRAIN OFF');
			}
			if (govStep === 5) {
				const next = TIER_STEPS[TIER_STEPS.indexOf(device.tier) + 1];
				if (next) setCoreTier(next, 'governor');
				return;
			}
		}
	});

	// ── tier changes re-init the sim during a scroll idle ────────────────────────────────────
	let offTierWait: (() => void) | null = null;
	function applyTier(next: Tier) {
		offTierWait?.();
		let still = 0;
		offTierWait = onFrame((_, dt) => {
			still = Math.abs(scroll.velocity) < 5 ? still + dt : 0;
			if (still < 0.3) return;
			offTierWait?.();
			offTierWait = null;
			tier = next;
			const s = TIER[next];
			if (crowd.densitySize > s.density) crowd.createDensity(s.density);
			void crowd.resize(s.sim);
		}, PRIORITY.ui);
	}

	// ── context loss (§7 "No WebGL"): restore within 2s or fall back to the static build ───────
	let lostTimer = 0;
	const onLost = (e: Event) => {
		e.preventDefault();
		lost = true;
		lostTimer = window.setTimeout(() => {
			if (!lost || disposed) return;
			// Only the live engine may switch the site to the static build (a stale one from a
			// re-mounted layout just goes away).
			const live = getEngine() === engine && canvas.isConnected;
			engine.dispose();
			if (!live) return;
			log(t().status.contextLost);
			markNoWebGL();
			setEngine(null);
		}, CONTEXT_RESTORE_MS);
	};
	const onRestored = () => {
		clearTimeout(lostTimer);
		lost = false;
		crowd.reinit();
	};
	canvas.addEventListener('webglcontextlost', onLost);
	canvas.addEventListener('webglcontextrestored', onRestored);

	const offInput = initInput({
		crowd,
		numbers,
		selection,
		setViewMode: (m) => engine.setViewMode(m)
	});

	const engine: Engine & {
		crowd: Crowd;
		selection: typeof selection;
		fx: { numbers: NumbersFx; viewModes: ViewModesFx; ink: InkFx };
	} = {
		renderer,
		crowd,
		numbers,
		selection,
		fx: { numbers, viewModes, ink },
		addView: (v: GLView) => views.add(v),
		createNumbers(o) {
			const n = guard<NumbersFx>(
				'damage numbers',
				() => createDamageNumbers(renderer, o),
				noopNumbers
			);
			// Overlay instances are drawn by the engine; view instances live in their view's scene.
			const pool = o.view ? viewNumbers : extraNumbers;
			pool.add(n);
			if (!o.view) n.resize?.(handle.size.w, handle.size.h, handle.size.dpr);
			const dispose = n.dispose.bind(n);
			n.dispose = () => {
				pool.delete(n);
				dispose();
			};
			return n;
		},
		get viewMode() {
			return viewModes.mode;
		},
		setViewMode(m: ViewMode) {
			if (!FLAGS.viewModes || m === viewModes.mode) return;
			viewModes.set(m);
			if (m === 3) unlock('wireframe');
		},
		inkCover: () => ink.cover(),
		inkReveal: () => ink.reveal(),
		setTier(next) {
			if (next !== tier) applyTier(next);
		},
		pause(p) {
			paused = p;
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			offSim();
			offRender();
			offTheme();
			offReduced();
			offResize();
			offGovernor();
			offInput();
			offBakeLog();
			offTierWait?.();
			canvas.removeEventListener('webglcontextlost', onLost);
			canvas.removeEventListener('webglcontextrestored', onRestored);
			clearTimeout(lostTimer);
			for (const fx of [...effects, ...extraNumbers]) {
				try {
					fx.dispose();
				} catch {
					// an effect failing to clean up must not block the rest
				}
			}
			views.dispose();
			crowd.dispose();
			regions.dispose();
			handle.dispose();
		}
	};
	return engine;
}
