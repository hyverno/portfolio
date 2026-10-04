// DEV-only harness: own renderer + fake crowd, driving the real effects modules frame by frame
// in the engine's order (crowd → view modes → damage numbers → ink swarm).
import * as THREE from 'three';
import { HOSE_GRAVITY, createDamageNumbers } from '#lib/gl/numbers/DamageNumbers';
import { createViewModesImpl, type ViewModes } from '#lib/gl/viewmodes';
import { createInkSwarm } from '#lib/gl/inkswarm';
import { hexToLinear } from '#lib/core/theme.svelte';
import { stats } from '#lib/core/stats.svelte';
import type { ViewMode } from '#lib/gl/types';
import { createFakeCrowd } from './fakeCrowd';

export interface Harness {
	burst(x?: number, y?: number, crit?: number): void;
	crumbs(x?: number, y?: number): void;
	hose(on?: boolean): boolean;
	rain(on?: boolean): boolean;
	mode(m: ViewMode): void;
	cover(): Promise<void>;
	reveal(): Promise<void>;
	readonly modes: ViewModes;
	readonly info: { live: number; total: number; mode: ViewMode; ink: boolean; z: string };
	dispose(): void;
}

export function createHarness(canvas: HTMLCanvasElement, o: { simSize?: number } = {}): Harness {
	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
	const dpr = Math.min(1.5, window.devicePixelRatio || 1);
	renderer.setPixelRatio(dpr);
	renderer.setSize(innerWidth, innerHeight, false);
	renderer.setClearColor(0x000000, 0);
	renderer.info.autoReset = false;

	const fake = createFakeCrowd(renderer, o.simSize ?? 128);
	const numbers = createDamageNumbers(renderer, { capacity: 16384 });
	const modes = createViewModesImpl(renderer, fake.gpu);
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

	let hoseOn = false;
	let rainOn = false;
	let rainClock = 0;
	const apricot = hexToLinear('#F2894B');

	function hoseFrame(dt: number) {
		// The Lab hose: ballistic numbers from the bottom-left nozzle, g = 900 px/s².
		const n = Math.ceil(dt * 900);
		for (let i = 0; i < n; i++) {
			const a = (-62 + (Math.random() - 0.5) * 18) * (Math.PI / 180);
			const speed = 700 + Math.random() * 260;
			numbers.spawn(80, innerHeight - 90, {
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				gravity: HOSE_GRAVITY,
				crit: Math.random() < 0.1
			});
		}
	}

	let raf = 0;
	let last = performance.now();
	const t0 = last;
	function frame(now: number) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		const t = (now - t0) / 1000;

		if (hoseOn) hoseFrame(dt);
		if (rainOn) {
			rainClock -= dt;
			if (rainClock <= 0) {
				rainClock = 0.28;
				api.burst(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.25 + Math.random() * 0.5));
			}
		}

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

	const api: Harness = {
		burst(x = innerWidth / 2, y = innerHeight / 2, crit = 0.1) {
			fake.crowd.ping(x, y);
			numbers.burst(x, y, { count: 12 + Math.floor(Math.random() * 29), radius: 70, critRate: crit });
		},
		crumbs(x = innerWidth / 2, y = innerHeight / 2) {
			numbers.burst(x, y, { count: 18, radius: 40, glyph: 'dot', color: apricot });
		},
		hose(on = !hoseOn) {
			return (hoseOn = on);
		},
		rain(on = !rainOn) {
			return (rainOn = on);
		},
		mode(m) {
			modes.set(m);
		},
		modes,
		cover: () => ink.cover(),
		reveal: () => ink.reveal(),
		get info() {
			return { live: numbers.live, total: numbers.total, mode: modes.mode, ink: ink.active, z: canvas.style.zIndex };
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
	};
	return api;
}
