// DEV-only bench for the GL effects. Two backends behind one interface:
//   'fake'   own renderer + fake crowd, driving the real effect modules frame by frame in the
//            engine's order (crowd → view modes → damage numbers → ink swarm);
//   'engine' the layout's real engine, through its public Engine API (integration check).
import * as THREE from 'three';
import { HOSE_GRAVITY, createDamageNumbers } from '#lib/gl/numbers/DamageNumbers';
import { createViewModes } from '#lib/gl/viewmodes';
import { createInkSwarm } from '#lib/gl/inkswarm';
import { hexToLinear } from '#lib/core/theme.svelte';
import { stats } from '#lib/core/stats.svelte';
import type { DamageNumbers, Engine, ViewMode } from '#lib/gl/types';
import { createFakeCrowd } from './fakeCrowd';

export interface BenchInfo {
	live: number;
	total: number;
	mode: ViewMode;
	ink: boolean;
	z: string;
}

export interface Bench {
	readonly source: 'fake' | 'engine';
	burst(x?: number, y?: number, critRate?: number): void;
	crumbs(x?: number, y?: number): void;
	hose(on?: boolean): boolean;
	rain(on?: boolean): boolean;
	mode(m: ViewMode): void;
	cover(): Promise<void>;
	reveal(): Promise<void>;
	readonly info: BenchInfo;
	dispose(): void;
}

/** What a backend has to provide; the bench adds hose/rain/burst choreography on top. */
interface Backend {
	numbers: DamageNumbers;
	canvas: HTMLCanvasElement;
	ping(x: number, y: number): void;
	readonly mode: ViewMode;
	setMode(m: ViewMode): void;
	cover(): Promise<void>;
	reveal(): Promise<void>;
	readonly inkActive: boolean;
	dispose(): void;
}

const APRICOT = hexToLinear('#F2894B');

function createBench(source: Bench['source'], b: Backend): Bench {
	let hoseOn = false;
	let rainOn = false;
	let rainClock = 0;
	let raf = 0;
	let last = performance.now();

	function hoseFrame(dt: number) {
		// The Lab hose: ballistic numbers from a bottom-left nozzle, g = 900 px/s².
		const n = Math.ceil(dt * 900);
		for (let i = 0; i < n; i++) {
			const a = (-62 + (Math.random() - 0.5) * 18) * (Math.PI / 180);
			const speed = 700 + Math.random() * 260;
			b.numbers.spawn(80, innerHeight - 90, {
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				gravity: HOSE_GRAVITY,
				crit: Math.random() < 0.1
			});
		}
	}

	function frame(now: number) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		if (hoseOn) hoseFrame(dt);
		if (rainOn && (rainClock -= dt) <= 0) {
			rainClock = 0.28;
			bench.burst(
				innerWidth * (0.2 + Math.random() * 0.6),
				innerHeight * (0.25 + Math.random() * 0.5)
			);
		}
	}
	raf = requestAnimationFrame(frame);

	const bench: Bench = {
		source,
		burst(x = innerWidth / 2, y = innerHeight / 2, critRate = 0.1) {
			b.ping(x, y);
			b.numbers.burst(x, y, { count: 12 + Math.floor(Math.random() * 29), radius: 54, critRate });
		},
		crumbs(x = innerWidth / 2, y = innerHeight / 2) {
			b.numbers.burst(x, y, { count: 18, radius: 40, glyph: 'dot', color: APRICOT });
		},
		hose: (on = !hoseOn) => (hoseOn = on),
		rain: (on = !rainOn) => (rainOn = on),
		mode: (m) => b.setMode(m),
		cover: () => b.cover(),
		reveal: () => b.reveal(),
		get info() {
			return {
				live: b.numbers.live,
				total: b.numbers.total,
				mode: b.mode,
				ink: b.inkActive,
				z: b.canvas.style.zIndex
			};
		},
		dispose() {
			cancelAnimationFrame(raf);
			b.dispose();
		}
	};
	return bench;
}

/** Own WebGLRenderer + fake crowd. */
export function createFakeBench(canvas: HTMLCanvasElement, o: { simSize?: number } = {}): Bench {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		alpha: true,
		antialias: false,
		powerPreference: 'high-performance'
	});
	const dpr = Math.min(1.5, window.devicePixelRatio || 1);
	renderer.setPixelRatio(dpr);
	renderer.setSize(innerWidth, innerHeight, false);
	renderer.setClearColor(0x000000, 0);
	renderer.info.autoReset = false;

	const fake = createFakeCrowd(renderer, o.simSize ?? 128);
	const numbers = createDamageNumbers(renderer, { capacity: 16384 });
	const modes = createViewModes(renderer, fake.gpu);
	const ink = createInkSwarm(renderer, fake.gpu, fake.crowd);
	const effects = [modes, numbers, ink];
	stats.entities = fake.gpu.N;

	const mouse = { x: -999, y: -999, on: false };
	const onMove = (e: PointerEvent) => {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
		mouse.on = e.pointerType === 'mouse';
	};
	const onLeave = () => (mouse.on = false);
	window.addEventListener('pointermove', onMove, { passive: true });
	document.addEventListener('pointerleave', onLeave);

	function resize() {
		const w = innerWidth;
		const h = innerHeight;
		renderer.setSize(w, h, false);
		fake.resize(w, h, dpr);
		for (const e of effects) e.resize?.(w, h, dpr);
	}
	window.addEventListener('resize', resize);
	for (const e of effects) e.resize?.(innerWidth, innerHeight, dpr);

	let raf = 0;
	let last = performance.now();
	const t0 = last;
	function frame(now: number) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		const t = (now - t0) / 1000;

		renderer.info.reset();
		const s0 = performance.now();
		fake.step(dt, mouse);
		const s1 = performance.now();
		renderer.setRenderTarget(null);
		renderer.clear();
		fake.draw();
		for (const e of effects) {
			e.update?.(t, dt);
			e.render(renderer);
		}
		const s2 = performance.now();
		stats.simMs = Math.round((s1 - s0) * 100) / 100;
		stats.renderMs = Math.round((s2 - s1) * 100) / 100;
		stats.drawCalls = renderer.info.render.calls;
	}
	raf = requestAnimationFrame(frame);

	return createBench('fake', {
		numbers,
		canvas,
		ping: (x, y) => fake.crowd.ping(x, y),
		get mode() {
			return modes.mode;
		},
		setMode: (m) => modes.set(m),
		cover: () => ink.cover(),
		reveal: () => ink.reveal(),
		get inkActive() {
			return ink.active;
		},
		dispose() {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerleave', onLeave);
			window.removeEventListener('resize', resize);
			for (const e of effects) e.dispose();
			fake.dispose();
			renderer.dispose();
		}
	});
}

/** The layout's engine, through the public API only. */
export function createEngineBench(engine: Engine): Bench {
	const canvas = (engine.renderer as THREE.WebGLRenderer).domElement;
	let covering = false;
	return createBench('engine', {
		numbers: engine.numbers,
		canvas,
		ping: (x, y) => engine.crowd.ping(x, y),
		get mode() {
			return engine.viewMode;
		},
		setMode: (m) => engine.setViewMode(m),
		async cover() {
			covering = true;
			await engine.inkCover();
		},
		async reveal() {
			await engine.inkReveal();
			covering = false;
		},
		get inkActive() {
			return covering;
		},
		dispose() {
			if (engine.viewMode !== 1) engine.setViewMode(1);
			if (covering) void engine.inkReveal();
		}
	});
}
